#!/usr/bin/env python3
"""Verify the complete Aitzoas HaMivooaroas bilingual Reader corpus."""
import argparse, gzip, hashlib, json, re, unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BOOK=ROOT/'public/reader/aitzoas-hamivooaroas'
EXPECTED_HE_CORPUS_SHA256='bd86b28eeba8bdf61aaaec5fb6fd246e91257604a6c728d1a64b685548152860'
EXPECTED_EN_CORPUS_SHA256='469a11f692ef918bcd69202df9a8227382bf3d9d4de138c0e23d0effa4b63ec0'
EXPECTED_HE_SOURCE_NORMALIZED_SHA256='bcc706420c74b5f1df1818135c68d2d64776eeefe2ff0245c11ba2c7afc63754'
EXPECTED_HE_SOURCE_COMPACT_SHA256='7b92b32954e0f960beded0371d068e8a361e75707f45b7905bcdccb832e69815'

def hebrew_letters(text):
    return re.sub(r'[^א-ת]','',unicodedata.normalize('NFKD',text))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--hebrew-docx',type=Path)
    ap.add_argument('--require-search',action='store_true')
    args=ap.parse_args()
    index=json.loads((BOOK/'index.json').read_text(encoding='utf-8'))
    assert index['book']=='aitzoas-hamivooaroas' and index['totalTorahs']==26
    assert index['hebrewTitle']=='עצות המבוארות' and len(index['torahs'])==26
    corpus={key:hashlib.sha256() for key in ('he','en')}
    all_he=[]; total=0
    for n in range(1,27):
        d=json.loads((BOOK/f'section-{n}.json').read_text(encoding='utf-8')); segs=d['segments']
        assert d['book']=='aitzoas-hamivooaroas' and d['torah']==n
        assert [s['index'] for s in segs]==list(range(1,len(segs)+1))
        assert all(s.get('he','').strip() and s.get('en','').strip() for s in segs)
        assert index['torahs'][n-1]['paragraphs']==len(segs)
        assert d['navigation']['prevUrl']==(f'/reader/aitzoas-hamivooaroas/1/{n-1}' if n>1 else None)
        assert d['navigation']['nextUrl']==(f'/reader/aitzoas-hamivooaroas/1/{n+1}' if n<26 else None)
        for s in segs:
            all_he.append(s['he'])
            for key in ('he','en'):
                corpus[key].update(f'{n}\0{s["index"]}\0{s[key]}\n'.encode())
        total+=len(segs)
    assert total==556,total
    hashes={key:h.hexdigest() for key,h in corpus.items()}
    assert hashes['he']==EXPECTED_HE_CORPUS_SHA256,hashes
    assert hashes['en']==EXPECTED_EN_CORPUS_SHA256,hashes
    if args.hebrew_docx:
        from docx import Document
        source='\n'.join(p.text for p in Document(args.hebrew_docx).paragraphs)
        compact_source=' '.join(source.split())
        assert hashlib.sha256(compact_source.encode()).hexdigest()==EXPECTED_HE_SOURCE_COMPACT_SHA256
        pos=0; raw_gaps=[]
        for n,text in enumerate(all_he,1):
            segment=' '.join(text.split()); found=compact_source.find(segment,pos)
            assert found>=0,f'Exact Hebrew source segment missing or out of order: {n}'
            if found>pos: raw_gaps.append(compact_source[pos:found])
            pos=found+len(segment)
        if pos<len(compact_source): raw_gaps.append(compact_source[pos:])
        assert len(raw_gaps)==556 and sum(map(len,raw_gaps))==2271 and max(map(len,raw_gaps))==27
        normalized=hebrew_letters(source)
        assert hashlib.sha256(normalized.encode()).hexdigest()==EXPECTED_HE_SOURCE_NORMALIZED_SHA256
        pos=0; gaps=[]
        for n,text in enumerate(all_he,1):
            segment=hebrew_letters(text); found=normalized.find(segment,pos)
            assert found>=0,f'Hebrew source segment missing or out of order: {n}'
            if found>pos: gaps.append(normalized[pos:found])
            pos=found+len(segment)
        if pos<len(normalized): gaps.append(normalized[pos:])
        assert sum(map(len,gaps))==1117 and max(map(len,gaps))==22,(sum(map(len,gaps)),max(map(len,gaps)))
    catalog=json.loads((ROOT/'public/reader/catalog.json').read_text(encoding='utf-8'))['books']
    canonical=[b for b in catalog if b.get('id')=='aitzoas-hamivooaroas']; assert len(canonical)==1
    assert not any(b.get('id')=='shimshon-עצות-המבוארות' for b in catalog)
    assert canonical[0]['hasEnglish'] and canonical[0]['hasHebrew'] and canonical[0]['parts'][0]['totalTorahs']==26
    if args.require_search:
        for lang in ('he','en'):
            with gzip.open(ROOT/f'public/data/light-search-index-{lang}.json.gz','rt',encoding='utf-8') as f: docs=json.load(f)
            rows=[d for d in docs if d.get('b')=='aitzoas-hamivooaroas']; assert len(rows)==26,(lang,len(rows))
            assert all(d.get('l','').startswith('/reader/aitzoas-hamivooaroas/1/') and d.get('x','').strip() for d in rows)
        meta=json.loads((ROOT/'public/reader-search/meta.json').read_text(encoding='utf-8'))
        rows=[d for d in meta['items'] if d.get('c')=='aitzoas-hamivooaroas']; assert len(rows)==26,len(rows)
    print(json.dumps({'chapters':26,'aligned_segments':total,'empty_hebrew':0,'empty_english':0,'source_verified':bool(args.hebrew_docx),'search_verified':args.require_search,'hashes':hashes}))

if __name__=='__main__': main()
