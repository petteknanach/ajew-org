#!/usr/bin/env python3
"""Build remote sharded reader search for website + Android app.

Outputs:
  public/reader-search/meta.json                 lightweight id/title/path catalog
  public/reader-search/shards/<prefix>.json      word -> [doc ids]
  public/reader-search/docs/<id>.json            full searchable text for result snippets/verification
"""
import gzip, json, re, shutil, unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public' / 'data'
OUT = ROOT / 'public' / 'reader-search'
SHARDS = OUT / 'shards'
DOCS = OUT / 'docs'
NIKUD_RE = re.compile(r'[\u0591-\u05C7]')
COMBINING_RE = re.compile(r'[\u0300-\u036f]')
PUNCT_RE = re.compile(r'[^\w\s\u0590-\u05ff]+', re.UNICODE)
SPACE_RE = re.compile(r'\s+')


def normalize(text: str) -> str:
    text = unicodedata.normalize('NFD', (text or '').lower())
    text = NIKUD_RE.sub('', text)
    text = COMBINING_RE.sub('', text)
    text = text.replace('״', '').replace('׳', '').replace('"', '').replace("'", '')
    text = PUNCT_RE.sub(' ', text)
    return SPACE_RE.sub(' ', text).strip()


def words(text: str):
    for w in normalize(text).split():
        if len(w) > 1 or re.search(r'[\u05d0-\u05ea]', w):
            yield w


def load_gz(name: str):
    with gzip.open(DATA / name, 'rt', encoding='utf-8') as f:
        return json.load(f)


def add(term_map, term, item_id):
    if term:
        term_map[term[:1] or '_'][term].append(item_id)


def clean_text(*parts):
    return SPACE_RE.sub(' ', ' '.join(p or '' for p in parts)).strip()


def canonical_reader_link(link: str) -> str:
    parts = (link or '').strip('/').split('/')
    if len(parts) < 3 or parts[0] != 'reader':
        return link
    book = parts[1]
    def clean_part(s):
        return re.sub(r'^part-', '', s)
    def clean_torah(s):
        return re.sub(r'^(torah|topic|section|sicha)-', '', s)
    if len(parts) == 4:
        return f'/reader/{book}/{clean_part(parts[2])}/{clean_torah(parts[3])}'
    if len(parts) == 3:
        return f'/reader/{book}/1/{clean_torah(parts[2])}'
    return link


def main():
    he = load_gz('light-search-index-he.json.gz')
    en = load_gz('light-search-index-en.json.gz')
    by_link = {}
    for doc in he:
        by_link[doc.get('l','')] = {'he': doc, 'en': None}
    for doc in en:
        link = doc.get('l','')
        by_link.setdefault(link, {'he': None, 'en': None})['en'] = doc

    if OUT.exists(): shutil.rmtree(OUT)
    SHARDS.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)

    items = []
    shard_terms = defaultdict(lambda: defaultdict(list))
    for raw_link in sorted(k for k in by_link if k):
        link = canonical_reader_link(raw_link)
        hd = by_link[raw_link].get('he') or {}
        ed = by_link[raw_link].get('en') or {}
        title = (hd.get('t') or ed.get('t') or '').strip()
        hebrew = (hd.get('h') or ed.get('h') or title).strip()
        book = (hd.get('b') or ed.get('b') or '').strip()
        he_text = clean_text(hd.get('x',''))
        en_text = clean_text(ed.get('x','') or hd.get('e','') or ed.get('e',''))
        text = clean_text(title, hebrew, book, he_text, en_text)
        item_id = len(items)
        items.append({'t': title, 'h': hebrew, 'c': book, 'p': link, 'a': normalize(f'{title} {hebrew} {book}')[:500]})
        with open(DOCS / f'{item_id}.json', 'w', encoding='utf-8') as f:
            json.dump({'id': item_id, 't': title, 'h': hebrew, 'c': book, 'p': link, 'he': he_text, 'en': en_text, 'n': normalize(text)}, f, ensure_ascii=False, separators=(',', ':'))
        for term in set(words(text)):
            add(shard_terms, term, item_id)
            add(shard_terms, 'e:' + ''.join(reversed(term)), item_id)

    term_count = 0
    for prefix, term_map in sorted(shard_terms.items()):
        with open(SHARDS / f'{prefix}.json', 'w', encoding='utf-8') as f:
            json.dump({k: v for k, v in sorted(term_map.items())}, f, ensure_ascii=False, separators=(',', ':'))
        term_count += len(term_map)

    meta = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'total': len(items), 'failures': 0, 'items': items}
    with open(OUT / 'meta.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))
    print(json.dumps({'items': len(items), 'terms': term_count, 'shards': len(shard_terms), 'docs': len(items), 'meta_bytes': (OUT/'meta.json').stat().st_size, 'out': str(OUT)}, ensure_ascii=False, indent=2))

if __name__ == '__main__': main()
