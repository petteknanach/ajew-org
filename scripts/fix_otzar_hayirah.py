#!/usr/bin/env python3
"""
fix_otzar_hayirah.py — Fix HE-EN pairings in Otzar HaYirah

Two problems:
1. ~101 segments have tiny HE (<=5 words) paired with long EN
2. ~946 segments have EN but no HE at all

Strategy for (1): Merge tiny HE headers into the next substantial HE segment,
similar to what we did for Likutay Halachos.

Strategy for (2): The EN-only segments appear to come from content that was
originally formatted as continuous English paragraphs. Without a separate
Hebrew source, these will remain EN-only (they were likely intended as
English-only translation segments).
"""

import json, glob, os
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader/otzar-hayirah')

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    words = text.split()
    if not words:
        return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w)/2)

def en_word_count(text):
    return len(text.split())

def fix_mismatches(data):
    """Fix tiny-HE mismatches by merging headers into body."""
    segs = data.get('segments', [])
    if not segs:
        return 0

    merged = [False] * len(segs)
    fixed = 0
    i = 0

    while i < len(segs):
        s = segs[i]
        he = s.get('he', '').strip()
        en = s.get('en', '').strip()
        hw = heb_word_count(he)
        ew = en_word_count(en) if en else 0

        if he and en and 1 <= hw <= 5 and ew > 5:
            # Try forward merge
            for j in range(i + 1, len(segs)):
                if merged[j]:
                    continue
                next_he = segs[j].get('he', '').strip()
                next_hw = heb_word_count(next_he)

                if next_hw > 5:
                    # Merge tiny header into this body
                    segs[j]['he'] = he + ' ' + next_he
                    segs[j]['en'] = en + '\n\n' + (segs[j].get('en', '') or '')
                    s['he'] = ''
                    s['en'] = ''
                    merged[j] = True
                    fixed += 1
                    break
                elif not next_he and segs[j].get('en','').strip():
                    # Empty HE slot - move header here
                    segs[j]['he'] = he
                    s['he'] = ''
                    # Keep en in both or merge
                    if not segs[j].get('en','').strip():
                        segs[j]['en'] = en
                        s['en'] = ''
                    fixed += 1
                    break
                elif next_hw > 0 and next_hw <= 5:
                    # Another tiny header - chain them
                    continue
                elif not segs[j].get('en','').strip() and not segs[j].get('he','').strip():
                    # Empty segment - skip
                    continue

            # If forward merge failed, try backward
            if not any(segs[i].get('he','').strip() == '' and segs[i].get('en','').strip() == '' for _ in [0]):
                for j in range(i - 1, -1, -1):
                    prev_he = segs[j].get('he', '').strip()
                    prev_hw = heb_word_count(prev_he)
                    if prev_hw > 5:
                        segs[j]['he'] = prev_he + ' ' + he
                        s['he'] = ''
                        fixed += 1
                        break

        i += 1

    return fixed


def main():
    print("=" * 70)
    print("OTZAR HAYIRAH — HE-EN Mismatch Fix")
    print("=" * 70)

    total_fixed = 0
    total_files = 0
    stats_by_part = {}

    for part_dir in sorted(BASE.iterdir()):
        if not part_dir.is_dir():
            continue
        part_name = part_dir.name
        if part_name == 'index.json':
            continue

        part_fixed = 0
        part_files = 0

        for jf in sorted(part_dir.glob('*.json')):
            total_files += 1
            part_files += 1
            data = json.load(open(jf))
            fixed = fix_mismatches(data)

            if fixed > 0:
                with open(jf, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                part_fixed += fixed

        stats_by_part[part_name] = {'files': part_files, 'fixed': part_fixed}
        total_fixed += part_fixed

    # Report
    print(f"\nFiles processed: {total_files}")
    print(f"Total mismatches fixed: {total_fixed}")
    print(f"\nPer-part breakdown:")
    for part, st in sorted(stats_by_part.items()):
        print(f"  {part}: {st['files']} files, {st['fixed']} merges")

    # Audit after fix
    print(f"\n{'=' * 70}")
    print("POST-FIX AUDIT")
    print(f"{'=' * 70}")

    totals = {'tiny': 0, 'ok': 0, 'empty_he': 0, 'empty_en': 0}
    for part_dir in sorted(BASE.iterdir()):
        if not part_dir.is_dir():
            continue
        for jf in sorted(part_dir.glob('*.json')):
            if jf.name == 'index.json':
                continue
            data = json.load(open(jf))
            segs = data.get('segments', data.get('content', []))
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

    total = totals['tiny'] + totals['ok'] + totals['empty_he'] + totals['empty_en']
    print(f"  OK pairs:                 {totals['ok']:>7} ({totals['ok']/total*100:.1f}%)")
    print(f"  Still tiny HE mismatch:   {totals['tiny']:>7}")
    print(f"  Empty HE (EN-only):       {totals['empty_he']:>7} ({totals['empty_he']/total*100:.1f}%)")
    print(f"  Empty EN (HE-only):       {totals['empty_en']:>7}")
    print(f"  TOTAL:                    {total:>7}")

if __name__ == '__main__':
    main()