#!/usr/bin/env python3
"""
fix_all_remaining_books.py — Universal HE-EN mismatch fixer for all Breslov books

Fixes tiny-HE mismatches by merging short Hebrew headers into the next
substantial Hebrew segment, same approach as Likutay Halachos and Otzar HaYirah.
"""
import json, os, glob
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader')

H_START, H_END = 0x05D0, 0x05EA
SKIP = {
    'yichud-hayeeruh', 'likutay-halachos', 'otzar-hayirah',
    'anava', 'binyamin', 'eved-hashem', 'haggadah-shel-pesach', 'halacha-misc',
    'kitzur-likutay-moharan', 'alim-litrufa', 'ebay-hanachal', 'saviv',
    'siach-sarfei-kodesh', 'kabbalat-shabbat-mevorchim',
}

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    words = text.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w)/2)

def fix_json_file(jf):
    """Fix a single JSON file. Returns number of merges made."""
    data = json.load(open(jf))
    segs = data.get('segments', [])
    if not segs:
        return 0

    fixed = 0
    merged = set()
    i = 0

    while i < len(segs):
        if i in merged:
            i += 1
            continue

        s = segs[i]
        he = s.get('he', '').strip()
        en = s.get('en', '').strip()
        hw = heb_word_count(he)
        ew = len(en.split()) if en else 0

        # Is this a tiny HE with substantial EN?
        if he and en and 1 <= hw <= 5 and ew > 5:
            # Try forward merge: find next segment with substantial HE
            for j in range(i + 1, len(segs)):
                if j in merged:
                    continue
                next_he = segs[j].get('he', '').strip()
                next_hw = heb_word_count(next_he)

                if next_hw > 5:
                    # Merge header into body
                    segs[j]['he'] = he + ' ' + next_he
                    segs[j]['en'] = en + '\n\n' + (segs[j].get('en', '') or '')
                    s['he'] = ''
                    s['en'] = ''
                    merged.add(j)
                    fixed += 1
                    break
                elif not next_he and segs[j].get('en', '').strip():
                    # Empty HE — move header here
                    segs[j]['he'] = he
                    if not segs[j].get('en', '').strip():
                        segs[j]['en'] = en
                    s['he'] = ''
                    s['en'] = ''
                    merged.add(j)
                    fixed += 1
                    break
                elif not next_he and not segs[j].get('en', '').strip():
                    # Both empty — move here
                    segs[j]['he'] = he
                    segs[j]['en'] = en
                    s['he'] = ''
                    s['en'] = ''
                    merged.add(j)
                    fixed += 1
                    break
        i += 1

    if fixed > 0:
        with open(jf, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    return fixed


def main():
    print("=" * 70)
    print("ALL REMAINING BOOKS — Universal HE-EN Fix")
    print("=" * 70)

    total_fixed = 0
    total_files = 0
    results = []

    for book_dir in sorted(BASE.iterdir()):
        if not book_dir.is_dir():
            continue
        name = book_dir.name
        if name in SKIP or name.startswith('tanach-') or name.startswith('zohar-') or \
           name.startswith('rambam-') or name.startswith('mishna-') or name.startswith('talmud-'):
            continue

        jsons = sorted([jf for jf in book_dir.glob('*.json') if jf.name != 'index.json'])
        if not jsons:
            continue

        book_fixed = 0
        book_files = 0

        for jf in jsons:
            try:
                fixed = fix_json_file(jf)
                book_fixed += fixed
                book_files += 1
            except Exception as e:
                print(f"  ERROR {jf}: {e}")

        if book_fixed > 0:
            results.append((name, book_files, book_fixed))
            total_fixed += book_fixed
            total_files += book_files

    print(f"\nFiles processed: {total_files}")
    print(f"Total merges: {total_fixed}")
    print(f"\nBooks with fixes:")
    for name, files, fixed in sorted(results, key=lambda x: -x[2]):
        print(f"  {name}: {files} files, {fixed} merges")

    # Final audit
    print(f"\n{'=' * 70}")
    print("POST-FIX AUDIT")
    print(f"{'=' * 70}")

    totals = {'ok': 0, 'tiny': 0, 'empty_he': 0, 'empty_en': 0}
    for book_dir in sorted(BASE.iterdir()):
        if not book_dir.is_dir():
            continue
        name = book_dir.name
        if name in SKIP:
            continue

        for jf in book_dir.glob('*.json'):
            if jf.name == 'index.json':
                continue
            try:
                data = json.load(open(jf))
                segs = data.get('segments', data.get('content', []))
            except:
                continue
            if not isinstance(segs, list):
                continue
            for s in segs:
                he = s.get('he', '').strip()
                en = s.get('en', '').strip()
                hw = heb_word_count(he)
                if not en:
                    totals['empty_en'] += 1
                elif not he:
                    totals['empty_he'] += 1
                elif hw <= 5 and len(en.split()) > 10:
                    totals['tiny'] += 1
                else:
                    totals['ok'] += 1

    total = sum(totals.values())
    print(f"  OK pairs:                 {totals['ok']:>7} ({totals['ok']/total*100:.1f}%)")
    print(f"  Still tiny HE mismatch:   {totals['tiny']:>7}")
    print(f"  Empty HE (EN-only):       {totals['empty_he']:>7} ({totals['empty_he']/total*100:.1f}%)")
    print(f"  Empty EN (HE-only):       {totals['empty_en']:>7}")
    print(f"  TOTAL:                    {total:>7}")

    if totals['tiny'] == 0:
        print("\n  ALL TINY-HE MISMATCHES RESOLVED!")
    else:
        print(f"\n  {totals['tiny']} remaining tiny-HE mismatches may need per-book source material")

if __name__ == '__main__':
    main()