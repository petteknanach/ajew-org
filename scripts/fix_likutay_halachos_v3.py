#!/usr/bin/env python3
"""
fix_likutay_halachos_v3.py — Final pass for the 5 remaining tiny-HE segments
These are all at halacha beginnings with multiple short header segments.
"""
import json
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader/likutay-halachos')

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    words = text.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w)/2)

def fix_file(jpath):
    data = json.load(open(jpath))
    segs = data.get('segments', [])
    if not segs:
        return False

    changed = False
    i = 0
    while i < len(segs):
        s = segs[i]
        he = s.get('he', '').strip()
        en = s.get('en', '').strip()
        hw = heb_word_count(he)
        ew = len(en.split()) if en else 0

        if he and en and 1 <= hw <= 5 and ew > 5:
            # Collect consecutive tiny HEs starting from here
            chain_he = []
            chain_en = []
            chain_indices = []
            j = i
            while j < len(segs):
                cs = segs[j]
                che = cs.get('he', '').strip()
                cen = cs.get('en', '').strip()
                chw = heb_word_count(che)
                cew = len(cen.split()) if cen else 0
                if che and chw <= 5:
                    chain_he.append(che)
                    chain_en.append(cen)
                    chain_indices.append(j)
                    j += 1
                else:
                    break

            if len(chain_he) >= 2:
                # Find first segment in chain with most HE words
                best_idx = 0
                best_hw = 0
                for ci, che_text in enumerate(chain_he):
                    chw = heb_word_count(che_text)
                    if chw > best_hw:
                        best_hw = chw
                        best_idx = ci

                # Merge all tiny HEs and ENs into the best segment
                combined_he = ' '.join(chain_he)
                combined_en = '\n\n'.join(c for c in chain_en if c)
                target = chain_indices[best_idx]
                segs[target]['he'] = combined_he
                segs[target]['en'] = combined_en

                # Clear the other segments
                for ci, idx in enumerate(chain_indices):
                    if idx != target:
                        segs[idx]['he'] = ''
                        segs[idx]['en'] = ''

                changed = True
                i = j  # Skip past the chain
                continue

        i += 1

    if changed:
        with open(jpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    return changed


def main():
    print("=" * 70)
    print("LIKUTAY HALACHOS — Final Pass (v3)")
    print("=" * 70)

    fixed_count = 0
    for jf in sorted(BASE.rglob('*.json')):
        if '/index.json' in str(jf):
            continue
        if fix_file(jf):
            fixed_count += 1
            print(f"  Fixed: {jf.name}")

    print(f"\nFiles modified: {fixed_count}")

    # Final audit
    print(f"\n{'=' * 70}")
    print("FINAL AUDIT")
    print(f"{'=' * 70}")

    totals = {'tiny': 0, 'ok': 0, 'empty_he': 0, 'empty_en': 0}
    for jf in sorted(BASE.rglob('*.json')):
        if '/index.json' in str(jf):
            continue
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

    total = sum(totals.values())
    print(f"  OK pairs:        {totals['ok']:>7} ({totals['ok']/total*100:.1f}%)")
    print(f"  Still tiny HE:   {totals['tiny']:>7}")
    print(f"  Empty HE:        {totals['empty_he']:>7}")
    print(f"  Empty EN:        {totals['empty_en']:>7}")
    print(f"  TOTAL:           {total:>7}")

    if totals['tiny'] > 0:
        print(f"\n  {totals['tiny']} remaining problematic segments need manual review")
    else:
        print(f"\n  ALL HE-EN PAIRINGS RESOLVED!")

if __name__ == '__main__':
    main()