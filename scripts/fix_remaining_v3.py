#!/usr/bin/env python3
"""
fix_remaining_v3.py — Targeted fix for remaining tricky patterns
Handles: cross-ref markers (שכתוב שם, תנאים ואמוראים),
        page/section headers that should prefix next body,
        and orphaned HE that should attach to following EN.
"""
import json, re
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader')
SKIP = {
    'yichud-hayeeruh', 'likutay-halachos', 'otzar-hayirah',
    'anava', 'binyamin', 'eved-hashem', 'haggadah-shel-pesach', 'halacha-misc',
    'kitzur-likutay-moharan', 'alim-litrufa', 'ebay-hanachal', 'saviv',
    'siach-sarfei-kodesh',
}

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_word_count(text):
    clean = ' '.join(text.split())
    words = clean.split()
    if not words: return 0
    return sum(1 for w in words if sum(1 for ch in w if is_heb_char(ch)) > len(w) * 0.4)

def is_tiny_he(he, en):
    if not he or not en: return False
    hw = heb_word_count(he)
    ew = len(en.split())
    return 1 <= hw <= 5 and ew > 5

# Patterns that are cross-refs or markers, not body text
CROSS_REF = re.compile(
    r'^('
    r'שֶׁכָּתוּב שָׁם|'    # "as is written there"
    r'כְּתִיב |'             # "it is written"
    r'שָׁם כְּתִיב|'          # "there it is written"
    r'עַיֵּן שָׁם|'            # "see there"
    r'עַיֵּן פֶּרֶק |'        # "see chapter"
    r'\(.*\) — |'            # parenthetical dashes
    r'תַּנָּאִים וַאֲמוֹרָאִים|'  # Tana'im v'Amora'im
    r'\u201c.*\u201d'        # quoted text
    r')', re.MULTILINE)

def fix_json_file_v3(jf):
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
            # Check if HE is a cross-ref marker
            is_cross_ref = bool(CROSS_REF.match(he))

            # Find best target for merge
            best_j = None
            best_score = -1

            for j in range(i + 1, min(i + 10, len(segs))):
                if j in merged:
                    continue
                nj = segs[j]
                nhe = nj.get('he', '').strip()
                nen = nj.get('en', '').strip()
                nhw = heb_word_count(nhe)

                if nhw > 5:
                    score = nhw
                    if is_cross_ref:
                        score += 50  # Strongly prefer merging cross-refs
                    if best_j is None or score > best_score:
                        best_j = j
                        best_score = score
                    break  # Take first substantial HE
                elif not nhe and nen:
                    if best_j is None:
                        best_j = j
                        best_score = 10

            if best_j is not None:
                target = segs[best_j]
                t_he = target.get('he', '').strip()
                t_en = target.get('en', '').strip()

                # Merge HE
                if t_he:
                    target['he'] = he + ' ' + t_he
                else:
                    target['he'] = he

                # Merge EN
                if t_en:
                    target['en'] = en + '\n\n' + t_en
                else:
                    target['en'] = en

                # Clear source
                s['he'] = ''
                s['en'] = ''
                merged.add(best_j)
                fixed += 1

        i += 1

    if fixed > 0:
        with open(jf, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    return fixed


def main():
    print("=" * 70)
    print("REMAINING BOOKS — Third Pass (targeted cross-ref merging)")
    print("=" * 70)

    total_fixed = 0
    results = []

    for book_dir in sorted(BASE.iterdir()):
        if not book_dir.is_dir() or book_dir.name in SKIP:
            continue
        if book_dir.name.startswith(('tanach-','zohar-','rambam-','mishna-','talmud-')):
            continue

        jsons = sorted([jf for jf in book_dir.glob('*.json') if jf.name != 'index.json'])
        book_fixed = 0
        for jf in jsons:
            try:
                book_fixed += fix_json_file_v3(jf)
            except Exception as e:
                pass

        if book_fixed > 0:
            results.append((book_dir.name, book_fixed))
            total_fixed += book_fixed

    print(f"Total merges: {total_fixed}")
    for name, fixed in sorted(results, key=lambda x: -x[1]):
        print(f"  {name}: {fixed}")

    # Audit
    print(f"\n{'='*70}\nAUDIT\n{'='*70}")
    counts = {'ok':0,'tiny':0,'empty_he':0,'empty_en':0}
    for book_dir in sorted(BASE.iterdir()):
        if not book_dir.is_dir() or book_dir.name in SKIP:
            continue
        for jf in book_dir.glob('*.json'):
            if jf.name == 'index.json': continue
            try:
                data = json.load(open(jf))
                for s in data.get('segments', data.get('content', [])):
                    he = s.get('he','').strip()
                    en = s.get('en','').strip()
                    if not en: counts['empty_en'] += 1
                    elif not he: counts['empty_he'] += 1
                    elif is_tiny_he(he, en): counts['tiny'] += 1
                    else: counts['ok'] += 1
            except: pass

    total = sum(counts.values())
    print(f"  OK:       {counts['ok']:>7} ({counts['ok']/total*100:.1f}%)")
    print(f"  Tiny HE:  {counts['tiny']:>7}")
    print(f"  No HE:    {counts['empty_he']:>7} ({counts['empty_he']/total*100:.1f}%)")
    print(f"  No EN:    {counts['empty_en']:>7}")
    print(f"  TOTAL:    {total:>7}")

if __name__ == '__main__':
    main()