#!/usr/bin/env python3
"""
fix_likutay_halachos.py — Fix misaligned HE-EN pairings in Likutay Halachos

Problem: ~12,000 segments have tiny HE (1-5 words = section headers) paired
to long EN paragraphs. The tiny HEs are headers that should be prepended to
the following non-tiny HE content.

Strategy:
1. Identify "tiny HE" segments (1-5 Hebrew words, non-empty EN)
2. Merge each tiny HE into the next segment with substantial HE
3. Remove the merged header from its old position (or keep as prefix)
"""

import json, glob, os, re
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader/likutay-halachos')

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    """Count Hebrew-dominant words."""
    words = text.split()
    if not words:
        return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w)/2)

def main():
    print("=" * 70)
    print("LIKUTAY HALACHOS — HE-EN Realignment")
    print("=" * 70)

    total_fixed = 0
    total_files = 0
    stats_by_part = {}

    for part_dir in sorted(BASE.iterdir()):
        if not part_dir.is_dir():
            continue
        part_name = part_dir.name

        for jf in sorted(part_dir.glob('*.json')):
            total_files += 1
            data = json.load(open(jf))
            segs = data.get('segments', [])
            if not segs:
                continue

            # First pass: identify tiny HE segments
            tiny_indices = set()
            for i, s in enumerate(segs):
                he = s.get('he', '').strip()
                en = s.get('en', '').strip()
                if he and en:
                    hw = heb_word_count(he)
                    if 1 <= hw <= 5 and len(en.split()) > 10:
                        tiny_indices.add(i)

            if not tiny_indices:
                continue

            # Second pass: merge tiny HEs into next substantial HE
            # We process in reverse to avoid index shifting issues
            # But we need forward merging, so let's build a mapping
            merged = [False] * len(segs)
            fixed_count = 0

            for i in sorted(tiny_indices):
                if i >= len(segs) - 1:
                    continue  # Can't merge last segment's header

                tiny_he = segs[i].get('he', '').strip()

                # Find next segment with substantial HE
                for j in range(i + 1, len(segs)):
                    if merged[j]:
                        continue
                    next_he = segs[j].get('he', '').strip()
                    next_hw = heb_word_count(next_he)
                    if next_hw > 5:  # Substantial HE found
                        # Prepend tiny header to the body
                        segs[j]['he'] = tiny_he + ' ' + next_he
                        segs[i]['he'] = ''  # Clear the header from old position
                        merged[j] = True
                        fixed_count += 1
                        break
                    elif not next_he:
                        # Empty HE — move header here instead
                        segs[j]['he'] = tiny_he
                        segs[i]['he'] = ''
                        fixed_count += 1
                        break

            if fixed_count > 0:
                with open(jf, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                total_fixed += fixed_count

            if part_name not in stats_by_part:
                stats_by_part[part_name] = {'files': 0, 'fixed': 0}
            stats_by_part[part_name]['files'] += 1
            stats_by_part[part_name]['fixed'] += fixed_count

    # Report
    print(f"\nFiles processed: {total_files}")
    print(f"Total headers merged: {total_fixed}")
    print(f"\nPer-part breakdown:")
    for part, st in sorted(stats_by_part.items()):
        print(f"  {part}: {st['files']} files, {st['fixed']} merges")

    # Final audit
    print(f"\n{'=' * 70}")
    print("POST-FIX AUDIT")
    print(f"{'=' * 70}")

    import glob as gl
    totals = {'tiny': 0, 'ok': 0, 'empty_he': 0, 'empty_en': 0}
    for part_dir in sorted(BASE.iterdir()):
        if not part_dir.is_dir():
            continue
        for jf in sorted(part_dir.glob('*.json')):
            data = json.load(open(jf))
            for s in data.get('segments', []):
                he = s.get('he', '').strip()
                en = s.get('en', '').strip()
                if not en:
                    totals['empty_en'] += 1
                elif not he:
                    totals['empty_he'] += 1
                elif heb_word_count(he) <= 5 and len(en.split()) > 10:
                    totals['tiny'] += 1
                else:
                    totals['ok'] += 1

    total = totals['tiny'] + totals['ok'] + totals['empty_he'] + totals['empty_en']
    print(f"  OK pairs (HE substantial):   {totals['ok']:>7} ({totals['ok']/total*100:.1f}%)")
    print(f"  Still tiny HE:               {totals['tiny']:>7} ({totals['tiny']/total*100:.1f}%)")
    print(f"  Empty HE (EN only):          {totals['empty_he']:>7}")
    print(f"  Empty EN (HE only):          {totals['empty_en']:>7}")
    print(f"  TOTAL segments:              {total:>7}")

    if totals['tiny'] > 0:
        print(f"\n  Remaining {totals['tiny']} tiny-HE segments may need manual review or")
        print(f"  a second pass with different heb_word_count threshold.")
    else:
        print(f"\n  All HE-EN pairings look good!")


if __name__ == '__main__':
    main()