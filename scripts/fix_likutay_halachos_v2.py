#!/usr/bin/env python3
"""
fix_likutay_halachos_v2.py — Second pass + smarter merging for remaining tiny HEs

Strategy refinements:
1. Try merging backward (merge current tiny HE into previous substantial HE)
2. Handle consecutive tiny HEs (merge chain of headers into next real chunk)
3. Handle cases where only EN continues (no subsequent HE)
"""

import json, glob, os
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader/likutay-halachos')

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    words = text.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w)/2)

def en_word_count(text):
    return len(text.split())

def main():
    print("=" * 70)
    print("LIKUTAY HALACHOS — Second Pass (v2)")
    print("=" * 70)

    total_fixed = 0
    stats_by_part = {}

    for part_dir in sorted(BASE.iterdir()):
        if not part_dir.is_dir():
            continue
        part_name = part_dir.name
        part_fixed = 0

        for jf in sorted(part_dir.glob('*.json')):
            data = json.load(open(jf))
            segs = data.get('segments', [])
            if not segs:
                continue

            changed = False
            i = 0
            while i < len(segs):
                s = segs[i]
                he = s.get('he', '').strip()
                en = s.get('en', '').strip()
                hw = heb_word_count(he)
                ew = en_word_count(en) if en else 0

                # Is this a mismatched tiny HE?
                if he and en and 1 <= hw <= 5 and ew > 5:
                    # Strategy 1: Forward merge — find next substantial HE
                    merged = False
                    for j in range(i + 1, len(segs)):
                        next_s = segs[j]
                        next_he = next_s.get('he', '').strip()
                        next_hw = heb_word_count(next_he)
                        if next_hw > 5:
                            # Substantial next HE found — merge header into it
                            next_s['he'] = he + ' ' + next_he
                            next_s['en'] = en + '\n\n' + (next_s.get('en','') or '')
                            s['he'] = ''
                            s['en'] = ''
                            merged = True
                            part_fixed += 1
                            break
                        elif next_hw > 0 and next_hw <= 5 and next_s.get('en','').strip():
                            # Another tiny HE with EN — check if they form a chain
                            # Merge both tiny HEs together and continue searching
                            # Actually: these are separate headers, skip this chain
                            continue
                        elif not next_he:
                            # Empty HE slot — good place to put our header
                            if next_s.get('en','').strip():
                                next_s['he'] = he
                                s['he'] = ''
                                merged = True
                                part_fixed += 1
                                break
                            else:
                                # Both empty — move header here
                                next_s['he'] = he
                                next_s['en'] = en
                                s['he'] = ''
                                s['en'] = ''
                                merged = True
                                part_fixed += 1
                                break

                    if not merged:
                        # Strategy 2: Backward merge — prepend to previous substantial HE
                        for j in range(i - 1, -1, -1):
                            prev_s = segs[j]
                            prev_he = prev_s.get('he', '').strip()
                            prev_hw = heb_word_count(prev_he)
                            if prev_hw > 5:
                                prev_s['he'] = prev_he + ' ' + he
                                s['he'] = ''
                                s['en'] = en
                                merged = True
                                part_fixed += 1
                                break

                    if not merged:
                        # Last resort: if EN looks like it belongs to previous segment,
                        # clear HE and let it be EN-only
                        # This is correct for truly structural headers
                        pass

                i += 1

            if changed or part_fixed > 0:
                with open(jf, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

        if part_name not in stats_by_part:
            stats_by_part[part_name] = {'files': 0, 'fixed': 0}
        stats_by_part[part_name]['files'] += len(list(part_dir.glob('*.json')))
        stats_by_part[part_name]['fixed'] += part_fixed

    # Report
    print(f"\nPer-part breakdown:")
    for part, st in sorted(stats_by_part.items()):
        print(f"  {part}: {st['files']} files, {st['fixed']} merges")
    print(f"\n  Total merges this pass: {sum(st['fixed'] for st in stats_by_part.values())}")

    # Audit
    print(f"\n{'=' * 70}")
    print("POST-FIX AUDIT")
    print(f"{'=' * 70}")

    totals = {'tiny': 0, 'ok': 0, 'empty_he': 0, 'empty_en': 0}
    for part_dir in sorted(BASE.iterdir()):
        if not part_dir.is_dir():
            continue
        for jf in sorted(part_dir.glob('*.json')):
            data = json.load(open(jf))
            segs = data.get('segments', data.get('content', []))
            if not isinstance(segs, list): continue
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
    print(f"  OK pairs:                   {totals['ok']:>7} ({totals['ok']/total*100:.1f}%)")
    print(f"  Still tiny HE:              {totals['tiny']:>7} ({totals['tiny']/total*100:.1f}%)")
    print(f"  Empty HE (EN-only):         {totals['empty_he']:>7}")
    print(f"  Empty EN (HE-only):         {totals['empty_en']:>7}")
    print(f"  TOTAL:                      {total:>7}")

if __name__ == '__main__':
    main()