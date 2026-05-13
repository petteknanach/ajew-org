#!/usr/bin/env python3
"""
audit_all_books.py — Scan all Breslov reader books for HE-EN mismatch issues
"""
import json, os, glob
from pathlib import Path

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    words = text.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w)/2)

BASE = Path('/root/ajew-org/public/reader')

# Skip: yichud-hayeeruh (done), likutay-halachos (done), otzar-hayirah (done),
# books with 0 files, tanach/zohar/mishna/rambam (scripture, different pipeline)
skip = {
    'yichud-hayeeruh', 'likutay-halachos', 'otzar-hayirah',
    # Empty dirs
    'anava', 'binyamin', 'eved-hashem', 'haggadah-shel-pesach', 'halacha-misc',
    'kitzur-likutay-moharan', 'likutay-halachos', 'likutay-moharan',
    'likutay-nanach', 'likutay-tefilos', 'mishna-*', 'talmud-bavli-*',
    'tanach-*', 'zohar-*', 'rambam-*',
    # Empty segment dirs
    'alim-litrufa', 'ebay-hanachal', 'saviv', 'siach-sarfei-kodesh',
    'kabbalat-shabbat-mevorchim',  # if exists
}

results = []

for book_dir in sorted(BASE.iterdir()):
    if not book_dir.is_dir():
        continue
    name = book_dir.name

    # Skip if in skip list
    skip_match = False
    for s in skip:
        if s.endswith('*'):
            if name.startswith(s[:-1]):
                skip_match = True
                break
        elif name == s:
            skip_match = True
            break
    if skip_match:
        continue

    # Get all json files
    jsons = [jf for jf in book_dir.glob('*.json') if jf.name != 'index.json']
    if not jsons:
        continue

    total = 0
    tiny_he = 0
    empty_he = 0
    empty_en = 0
    ok = 0

    for jf in jsons:
        data = json.load(open(jf))
        segs = data.get('segments', data.get('content', []))
        if not isinstance(segs, list):
            continue
        for s in segs:
            total += 1
            he = s.get('he', '').strip()
            en = s.get('en', '').strip()
            hw = heb_word_count(he)

            if not en:
                empty_en += 1
            elif not he:
                empty_he += 1
            elif hw <= 5 and len(en.split()) > 10:
                tiny_he += 1
            else:
                ok += 1

    if tiny_he > 0 or empty_he > 50:
        pct_bad = ((tiny_he + empty_he) / total * 100) if total > 0 else 0
        results.append((name, total, tiny_he, empty_he, empty_en, ok, pct_bad))

print("=" * 100)
print(f"{'Book':<35} {'Total':>7} {'TinyHE':>7} {'NoHE':>7} {'NoEN':>7} {'OK':>7} {'Bad%':>6}")
print("=" * 100)
for name, total, th, eh, en, ok, pct in sorted(results, key=lambda x: -x[6]):
    print(f"{name:<35} {total:>7} {th:>7} {eh:>7} {en:>7} {ok:>7} {pct:>5.1f}%")
print()
print(f"Books with issues: {len(results)}")
print(f"(TinyHE = tiny Hebrew paired with long English; NoHE = EN segment missing Hebrew)")