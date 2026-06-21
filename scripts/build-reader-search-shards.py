#!/usr/bin/env python3
"""Build remote sharded reader search for the Android app.

Input: public/data/light-search-index-he.json.gz and -en.json.gz
Output:
  public/reader-search/meta.json
  public/reader-search/shards/<2-char-prefix>.json
"""
import gzip
import json
import re
import shutil
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public' / 'data'
OUT = ROOT / 'public' / 'reader-search'
SHARDS = OUT / 'shards'

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

def main():
    he = load_gz('light-search-index-he.json.gz')
    en = load_gz('light-search-index-en.json.gz')
    by_link = {}
    for doc in he:
        by_link[doc.get('l','')] = {'he': doc, 'en': None}
    for doc in en:
        link = doc.get('l','')
        by_link.setdefault(link, {'he': None, 'en': None})['en'] = doc

    if OUT.exists():
        shutil.rmtree(OUT)
    SHARDS.mkdir(parents=True, exist_ok=True)

    items = []
    shard_terms = defaultdict(lambda: defaultdict(list))
    for link in sorted(k for k in by_link if k):
        hd = by_link[link].get('he') or {}
        ed = by_link[link].get('en') or {}
        title = (hd.get('t') or ed.get('t') or '').strip()
        hebrew = (hd.get('h') or ed.get('h') or title).strip()
        book = (hd.get('b') or ed.get('b') or '').strip()
        text = ' '.join([title, hebrew, book, hd.get('x',''), hd.get('e',''), ed.get('x',''), ed.get('e','')])
        item_id = len(items)
        items.append({
            't': title,
            'h': hebrew,
            'c': book,
            'p': link,
            'a': normalize(f'{title} {hebrew} {book}')[:500],
        })
        doc_words = list(words(text))
        terms = set(doc_words)
        for term in terms:
            prefix = term[:1] or '_'
            shard_terms[prefix][term].append(item_id)

    shard_count = 0
    term_count = 0
    for prefix, term_map in sorted(shard_terms.items()):
        safe = prefix or '_'
        with open(SHARDS / f'{safe}.json', 'w', encoding='utf-8') as f:
            json.dump({k: v for k, v in sorted(term_map.items())}, f, ensure_ascii=False, separators=(',', ':'))
        shard_count += 1
        term_count += len(term_map)

    meta = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'total': len(items),
        'failures': 0,
        'items': items,
    }
    with open(OUT / 'meta.json', 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))

    print(json.dumps({
        'items': len(items),
        'terms': term_count,
        'shards': shard_count,
        'meta_bytes': (OUT / 'meta.json').stat().st_size,
        'out': str(OUT),
    }, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
