#!/usr/bin/env python3
"""
Audit all Breslov books on ajew.org for HE/EN alignment.
Checks that every segment has both Hebrew and English content.
Identifies misaligned segments where one language is missing or disproportionately sized.
"""
import json
import os
import csv

# Breslov book IDs (from catalog)
BRESlOV_BOOKS = [
    'likutay-moharan', 'sefer-hamidos', 'sipurey-maasiyos', 'sichos-haran',
    'shivchay-haran', 'chayay-moharan', 'likutay-halachos', 'kitzur-likutay-moharan',
    'likutay-tefilos', 'likutay-aitzos', 'alim-litrufa', 'yemay-moharnat',
    'shemos-hattzedikim', 'yemay-hatlaos', 'outpouring-of-the-soul',
    'restore-my-soul', 'parparos-lechochma', 'rimzeh-hamaasiyos', 'song-of-the-land',
    'yikra-dshabbata', 'yereach-haeitan', 'nachas-hashulchan', 'likutay-aitzos-mahaduras-basra',
    'biur-halikutim', 'chochma-utvuna', 'kokhvei-or', 'siach-sarfei-kodesh',
    'eitzos-yesharos', 'sichas-hanefesh', 'sefer-hahishtatchut', 'tovos-zichronos',
    'kuntres-torah-or', 'sefer-shir-yedidus', 'shir-yedidus-by-r-yechiel-mendel',
    'letter-of-r-getzil-to-rav-kook', 'kuntres-kiyum-hatorah', 'toldos-shmuel',
    'igeres-hapurim', 'likutay-even', 'gevuros-shimshon', 'eitzos-hamevauros',
    'letters-of-r-nosson-bar-yehuda', 'kuntres-hatzerufim', 'kuntres-hatzerufim-with-completions',
    'stories-of-r-moshe-glidman', 'stories-from-r-shmuel-horowitz',
    'ebay-hanachal', 'otzar-hayirah', 'toldos-adam', 'yisroel-saba',
    'michtevay-shmuel', 'kuntrass-hiskashrus-latzadik', 'mesillas-yesharim',
    'derech-hashem', 'daas-tevnos', 'klach-pitchei-chochma', 'maamar-haikkurim',
    'derech-etz-chaim', 'asarah-perakim', 'adir-bamurom', 'tikunim-chadashim',
    'yichud-hayeeruh', 'otzros-ramchal', 'shaaray-ramchal', 'aitzoas-hamivooaroas',
    'aitzoas-yesharoas', 'gevuros-shimshon', 'azamra-rabbi-nachman-who-he-was',
    'fires-of-israel', 'hisbodidus-alone-time', 'the-seven-pillars',
    'the-praises-of-rabbi-nachman', 'sichos-metoch-chayay-hasaba',
    'saba-tape-transcripts', 'seder-hayom', 'ruzin-gineezin',
    'pettek-nanach-running-commentary-on-likutey-moharan',
    # Books that should NOT have English
    # 'likutay-nanach' - excluded per user
    # 'siach-sarfei-kodesh' - excluded per user (already in list, will flag as no-EN-needed)
]

# These books should NOT have English translations
NO_ENGLISH_BOOKS = ['likutay-nanach', 'siach-sarfei-kodesh']

base_dir = '/root/ajew-org/public/reader'

results = []

for book_id in BRESlOV_BOOKS:
    book_dir = os.path.join(base_dir, book_id)
    if not os.path.isdir(book_dir):
        continue
    
    # Get all torah files
    for part_dir in sorted(os.listdir(book_dir)):
        part_path = os.path.join(book_dir, part_dir)
        if not os.path.isdir(part_path):
            continue
        
        for f in sorted(os.listdir(part_path)):
            if f == 'index.json' or not f.endswith('.json'):
                continue
            
            filepath = os.path.join(part_path, f)
            try:
                with open(filepath, encoding='utf-8') as fh:
                    data = json.load(fh)
            except:
                continue
            
            segs = data.get('segments', [])
            if not segs:
                continue
            
            he_count = sum(1 for s in segs if s.get('he', '').strip())
            en_count = sum(1 for s in segs if s.get('en', '').strip())
            total = len(segs)
            
            # Check for severe misalignment
            issues = []
            
            # Check if EN is completely missing
            if en_count == 0 and he_count > 0:
                if book_id in NO_ENGLISH_BOOKS:
                    pass  # Expected
                else:
                    issues.append("NO_ENGLISH")
            
            # Check for significant mismatch
            if he_count > 0 and en_count > 0:
                ratio = en_count / he_count
                if ratio < 0.5:
                    issues.append(f"EN_MISSING_HEAVILY (EN={en_count}/{he_count})")
                elif ratio < 0.8:
                    issues.append(f"EN_UNDERREPRESENTED (EN={en_count}/{he_count})")
                elif ratio > 2.0:
                    issues.append(f"EN_OVERREPRESENTED (EN={en_count}/{he_count})")
            
            # Check for HE-only segments in the middle
            if he_count > 0 and en_count > 0:
                for i, seg in enumerate(segs):
                    he = seg.get('he', '').strip()
                    en = seg.get('en', '').strip()
                    if he and not en:
                        issues.append(f"SEG_{i}_NO_EN")
                        break  # Just report first occurrence
            
            if issues:
                results.append({
                    'book': book_id,
                    'file': f'{part_dir}/{f}',
                    'total_segs': total,
                    'he_segs': he_count,
                    'en_segs': en_count,
                    'issues': '; '.join(issues)
                })

# Write results
print(f"\n=== AUDIT RESULTS ===")
print(f"Books checked: {len(BRESlOV_BOOKS)}")
print(f"Files with issues: {len(results)}")

# Group by book
from collections import defaultdict
by_book = defaultdict(list)
for r in results:
    by_book[r['book']].append(r)

print(f"\nBooks with issues: {len(by_book)}")
for book, issues in sorted(by_book.items()):
    total_issue_files = len(issues)
    print(f"\n  {book}: {total_issue_files} files with issues")
    for issue in issues[:3]:  # Show first 3
        print(f"    {issue['file']}: {issue['issues']}")
    if len(issues) > 3:
        print(f"    ... and {len(issues)-3} more files")

# Also check Likutay Nanach and Siach S.K. are properly flagged
print(f"\n=== NO-ENGLISH BOOKS CHECK ===")
for book_id in NO_ENGLISH_BOOKS:
    book_dir = os.path.join(base_dir, book_id)
    if os.path.isdir(book_dir):
        he_count = 0
        en_count = 0
        for root, dirs, files in os.walk(book_dir):
            for f in files:
                if f.endswith('.json') and f != 'index.json':
                    filepath = os.path.join(root, f)
                    try:
                        with open(filepath, encoding='utf-8') as fh:
                            data = json.load(fh)
                        for seg in data.get('segments', []):
                            if seg.get('he', '').strip():
                                he_count += 1
                            if seg.get('en', '').strip():
                                en_count += 1
                    except:
                        pass
        print(f"  {book_id}: {he_count} HE segments, {en_count} EN segments")
