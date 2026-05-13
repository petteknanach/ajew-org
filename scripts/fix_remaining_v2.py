#!/usr/bin/env python3
"""
fix_remaining_v2.py — Second pass with improved Hebrew word counting

Handles: newlines in HE text, Hebrew letter markers (א, ב, γ...),
and multi-line Hebrew that's actually substantial.
"""
import json, os
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader')

H_START, H_END = 0x05D0, 0x05EA
SKIP = {
    'yichud-hayeeruh', 'likutay-halachos', 'otzar-hayirah',
    'anava', 'binyamin', 'eved-hashem', 'haggadah-shel-pesach', 'halacha-misc',
    'kitzur-likutay-moharan', 'alim-litrufa', 'ebay-hanachal', 'saviv',
    'siach-sarfei-kodesh', 'index.json',
}

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    """Count Hebrew words, stripping newlines/formatting first"""
    # Normalize whitespace (newlines, multiple spaces -> single space)
    clean = ' '.join(text.split())
    words = clean.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w) * 0.4)

def en_word_count(text):
    return len(text.split())

def is_tiny_he(he, en):
    """True if HE is tiny relative to EN"""
    if not he or not en:
        return False
    hw = heb_word_count(he)
    ew = en_word_count(en)
    # EN must be substantial
    if ew <= 5:
        return False
    # HE is tiny
    if hw <= 5:
        return True
    return False

def fix_json_file(jf):
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

        if is_tiny_he(he, en):
            # Try forward merge
            for j in range(i + 1, len(segs)):
                if j in merged:
                    continue
                next_he = segs[j].get('he', '').strip()
                next_en = segs[j].get('en', '').strip()
                nhw = heb_word_count(next_he)

                if nhw > 5:
                    # Substantial next HE — merge header into body
                    segs[j]['he'] = he + ' ' + next_he
                    segs[j]['en'] = en + '\n\n' + next_en
                    s['he'] = ''
                    s['en'] = ''
                    merged.add(j)
                    fixed += 1
                    break
                elif not next_he and next_en:
                    # Empty HE — good spot for header
                    segs[j]['he'] = he
                    segs[j]['en'] = en + '\n\n' + next_en
                    s['he'] = ''
                    s['en'] = ''
                    merged.add(j)
                    fixed += 1
                    break
                elif not next_he and not next_en:
                    # Empty slot — move here
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
    print("REMAINING BOOKS — Second Pass (improved word counting)")
    print("=" * 70)

    total_fixed = 0
    total_files = 0
    results = []

    for book_dir in sorted(BASE.iterdir()):
        if not book_dir.is_dir():
            continue
        name = book_dir.name
        skip = False
        for s in SKIP:
            if name == s or name.startswith(s):
                skip = True
                break
        if skip or name.startswith('tanach-') or name.startswith('zohar-') or \
           name.startswith('rambam-') or name.startswith('mishna-') or name.startswith('talmud-'):
            continue

        jsons = sorted([jf for jf in book_dir.glob('*.json') if jf.name != 'index.json'])
        if not jsons:
            continue

        book_fixed = 0
        for jf in jsons:
            try:
                fixed = fix_json_file(jf)
                book_fixed += fixed
                total_files += 1
            except Exception as e:
                print(f"  ERROR {jf}: {e}")

        if book_fixed > 0:
            results.append((name, len(jsons), book_fixed))
            total_fixed += book_fixed

    print(f"\nFiles: {total_files}, Merges: {total_fixed}")
    print(f"\nFixes by book:")
    for name, files, fixed in sorted(results, key=lambda x: -x[2]):
        print(f"  {name}: {fixed} merges in {files} files")

    # Audit
    print(f"\n{'=' * 70}")
    print("AUDIT")
    print(f"{'=' * 70}")
    totals = {'ok': 0, 'tiny': 0, 'empty_he': 0, 'empty_en': 0}
    for book_dir in sorted(BASE.iterdir()):
        if not book_dir.is_dir() or book_dir.name in SKIP:
            continue
        for jf in book_dir.glob('*.json'):
            if jf.name == 'index.json':
                continue
            try:
                data = json.load(open(jf))
                segs = data.get('segments', data.get('content', []))
                for s in segs:
                    he = s.get('he','').strip()
                    en = s.get('en','').strip()
                    if not en:
                        totals['empty_en'] += 1
                    elif not he:
                        totals['empty_he'] += 1
                    elif is_tiny_he(he, en):
                        totals['tiny'] += 1
                    else:
                        totals['ok'] += 1
            except:
                continue

    total = sum(totals.values())
    print(f"  OK pairs:                 {totals['ok']:>7} ({totals['ok']/total*100:.1f}%)")
    print(f"  Tiny HE mismatch:         {totals['tiny']:>7}")
    print(f"  Empty HE (EN-only):       {totals['empty_he']:>7} ({totals['empty_he']/total*100:.1f}%)")
    print(f"  Empty EN (HE-only):       {totals['empty_en']:>7}")
    print(f"  TOTAL:                    {total:>7}")

    if totals['tiny'] == 0:
        print("\n  ALL TINY-HE MISMATCHES RESOLVED!")
    else:
        print(f"\n  {totals['tiny']} remaining — may need per-book source data")

if __name__ == '__main__':
    main()