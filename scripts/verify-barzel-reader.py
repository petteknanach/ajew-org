#!/usr/bin/env python3
"""Verify complete Barzel source-span conservation, routes and optional outputs."""
import argparse
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from reader_search_routes import discover_routed_sources


def sha(data):
    return hashlib.sha256(data).hexdigest()


class HebrewParagraphs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_hebrew = False
        self.capture = False
        self.values = []
        self.current = ''

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'div' and 'segment-he' in (attrs.get('class') or '').split():
            self.in_hebrew = True
        if tag == 'p' and self.in_hebrew:
            self.capture = True
            self.current = ''

    def handle_data(self, data):
        if self.capture:
            self.current += data

    def handle_endtag(self, tag):
        if tag == 'p' and self.capture:
            self.values.append(self.current)
            self.capture = False
        if tag == 'div':
            self.in_hebrew = False


def independent_docx(source):
    w = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    with zipfile.ZipFile(source) as archive:
        body = ET.fromstring(archive.read('word/document.xml')).find(w + 'body')
    assert body is not None
    result = []
    replacements = {w+'br': '\n', w+'cr': '\n', w+'tab': '\t', w+'noBreakHyphen': '\u2011', w+'softHyphen': '\u00ad'}
    for p in body.findall(w + 'p'):
        result.append(''.join((node.text or '') if node.tag == w+'t' else replacements.get(node.tag, '') for node in p.iter()))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', type=Path)
    parser.add_argument('--dist', type=Path)
    parser.add_argument('--search', action='store_true')
    args = parser.parse_args()
    fixture = json.loads((ROOT/'scripts/data/barzel-docx-structure-20261026.json').read_text())
    ledger = json.loads((ROOT/'public/reader/reviewed/barzel-docx-provenance-20261026.json').read_text())
    catalog = json.loads((ROOT/'public/reader/catalog.json').read_text())['books']
    counts = []
    for spec, witness in zip(fixture['books'], ledger['sources'], strict=True):
        book = spec['id']
        assert witness['book'] == book
        assert witness['sha256'] == spec['sha256']
        directory = ROOT/'public/reader'/book
        idx = json.loads((directory/'index.json').read_text())
        leaves = sorted((directory/'part-1').glob('torah-*.json'), key=lambda p: int(p.stem.split('-')[1]))
        assert len(leaves) == len(spec['sections']) == idx['totalTorahs']
        assert [x['number'] for x in idx['torahs']] == list(range(1,len(leaves)+1))
        entries = [b for b in catalog if b['id'] == book]
        assert len(entries) == 1 and entries[0]['parts'][0]['totalTorahs'] == len(leaves)
        routed = discover_routed_sources(leaves, ROOT/'public/reader')
        assert {r.route for r in routed} == {f'/reader/{book}/1/{i}' for i in range(1,len(leaves)+1)}
        fragments = []
        segment_total = item_total = searchable = 0
        for n, (path, section) in enumerate(zip(leaves, spec['sections'], strict=True), 1):
            leaf = json.loads(path.read_text())
            assert leaf['sourceSha256'] == spec['sha256']
            assert leaf['torah'] == n and leaf['part'] == 1 and leaf['book'] == book
            assert leaf['title'] == section['heading']
            assert leaf['hebrewTitle'] == ''.join(s['he'] for s in leaf['preHeadingSegments']) + section['heading']
            assert leaf['hasEnglish'] is False
            assert [s['index'] for s in leaf['segments']] == list(range(1,len(leaf['segments'])+1))
            assert all(s['en'] == '' for s in leaf['segments'])
            expected_prev = f'/reader/{book}/1/{n-1}/' if n > 1 else None
            expected_next = f'/reader/{book}/1/{n+1}/' if n < len(leaves) else None
            assert leaf['navigation'] == {'prevUrl': expected_prev, 'nextUrl': expected_next}
            fragments.extend(leaf['preHeadingSegments'])
            fragments.append(leaf['sourceHeading'])
            fragments.extend(leaf['segments'])
            numbered = [s for s in leaf['segments'] if s['role'] == 'numbered-item']
            assert len(numbered) == len(section.get('itemStartLines',[]))
            item_total += len(numbered)
            segment_total += len(leaf['segments'])
            searchable += any(s['he'].strip() for s in leaf['segments'])
            if args.dist:
                html_path = args.dist/f'reader/{book}/1/{n}/index.html'
                html = html_path.read_text()
                parsed = HebrewParagraphs()
                parsed.feed(html)
                assert parsed.values == [s['he'] for s in leaf['segments']], (book,n,'rendered Hebrew differs')
                assert 'Hebrew source edition. No English translation was supplied.' in html
                assert f'https://ajew.org/reader/{book}/1/{n}' in html
        assert segment_total == idx['totalSegments']
        assert item_total == witness['numberedSourceItems']
        positions = [(f['sourceSpan']['paragraph'], f['sourceSpan']['start']) for f in fragments]
        assert positions == sorted(positions)
        reconstructed = {}
        for p in witness['readingParagraphs']:
            pieces = [f for f in fragments if f['sourceSpan']['paragraph'] == p]
            text = ''
            for piece in pieces:
                span = piece['sourceSpan']
                assert span['start'] == len(text)
                assert len(piece['he']) == span['end'] - span['start']
                text += piece['he']
            reconstructed[p] = text
        for p in witness['nonReadingParagraphs']:
            assert p['paragraph'] not in reconstructed
            reconstructed[p['paragraph']] = p['text']
        assert sorted(reconstructed) == list(range(spec['paragraphCount']))
        assert [sha(reconstructed[p].encode()) for p in range(spec['paragraphCount'])] == witness['paragraphTextSha256']
        if args.sources:
            source = args.sources/spec['filename']
            assert sha(source.read_bytes()) == spec['sha256']
            assert [reconstructed[p] for p in range(spec['paragraphCount'])] == independent_docx(source)
        if args.dist:
            html = (args.dist/f'reader/{book}/1/index.html').read_text()
            for entry in idx['torahs']:
                assert f'href="{entry["url"]}"' in html
            assert f'{len(leaves)} entries' in html
        counts.append({'book':book,'sections':len(leaves),'segments':segment_total,
                       'numberedSourceItems':item_total,'searchDocuments':searchable})
    assert sum(c['sections'] for c in counts) == 69
    assert counts[1]['numberedSourceItems'] == 766
    if args.search:
        metadata = json.loads((ROOT/'public/reader-search/meta.json').read_text())
        by_book = Counter(d['c'] for d in metadata['items'])
        for count in counts:
            assert by_book[count['book']] == count['searchDocuments'], (count,by_book)
            for item_id, item in enumerate(metadata['items']):
                if item['c'] != count['book']:
                    continue
                doc = json.loads((ROOT/f'public/reader-search/docs/{item_id}.json').read_text())
                assert doc['en'] == ''
                assert 'barzel' in doc['n'] and 'מיכאל ברזל' in doc['n']
                assert doc['p'].startswith('/reader/'+count['book']+'/1/')
                assert doc['m'] and all(row[0] >= 1 for row in doc['m'])
    print(json.dumps({'status':'PASS','books':counts,'originalFilesChecked':bool(args.sources),
                      'compiledHtmlChecked':bool(args.dist),'searchArtifactsChecked':args.search},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
