#!/usr/bin/env python3
"""
examine_top_books.py — Examine the tiny-HE pattern in top offender books
"""
import json, os
from pathlib import Path

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    words = text.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w)/2)

def sample_book(base_dir, book_name, max_samples=10):
    d = base_dir / book_name
    if not d.is_dir():
        return
    jsons = [jf for jf in d.glob('*.json') if jf.name != 'index.json']
    print(f"\n{'='*70}")
    print(f"BOOK: {book_name} ({len(jsons)} JSON files)")
    print(f"{'='*70}")

    samples = 0
    for jf in jsons:
        data = json.load(open(jf))
        segs = data.get('segments', data.get('content', []))
        if not isinstance(segs, list):
            continue
        for i, s in enumerate(segs):
            he = s.get('he', '').strip()
            en = s.get('en', '').strip()
            hw = heb_word_count(he)
            if he and en and hw <= 5 and len(en.split()) > 10:
                print(f"\n  [{jf.name}:{i}] HE({hw}w)={he[:80]!r}")
                print(f"      EN={en[:150]!r}")
                # Show context
                if i > 0:
                    prev = segs[i-1]
                    phe = prev.get('he','').strip()[:60]
                    pen = prev.get('en','').strip()[:60]
                    print(f"    PREV: H={phe!r} | E={pen!r}")
                if i < len(segs)-1:
                    nxt = segs[i+1]
                    nhe = nxt.get('he','').strip()[:60]
                    nen = nxt.get('en','').strip()[:60]
                    print(f"    NEXT: H={nhe!r} | E={nen!r}")
                samples += 1
                if samples >= max_samples:
                    return

        # Also show empty-HE samples
        empty_he_shown = 0
        for i, s in enumerate(segs):
            he = s.get('he', '').strip()
            en = s.get('en', '').strip()
            if en and not he and empty_he_shown < 3:
                print(f"\n  [NO HE: {jf.name}:{i}] EN={en[:150]!r}")
                if i > 0:
                    prev = segs[i-1]
                    print(f"    PREV: H={prev.get('he','').strip()[:60]!r} | E={prev.get('en','').strip()[:60]!r}")
                empty_he_shown += 1

BASE = Path('/root/ajew-org/public/reader')
top_books = [
    'sefer-hamidos',
    'likutay-eitzos',
    'parparos-lechochma',
    'yisroel-saba',
    'chayey-moharan',
]

for book in top_books:
    sample_book(BASE, book)