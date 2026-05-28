#!/usr/bin/env python3
"""
Audit all Breslov books for HE/EN alignment.
Distinguishes between content segments and marker segments.
A segment with < 30 chars of HE and no EN is likely a marker/header, not missing content.
"""
import json
import os

BRESlOV_BOOKS = [
    'likutay-moharan', 'sefer-hamidos', 'sipurey-maasiyos', 'sichos-haran',
    'shivchay-haran', 'chayay-moharan', 'likutay-halachos', 'kitzur-likutay-moharan',
    'likutay-tefilos', 'likutay-aitzos', 'alim-litrufa', 'yemay-moharnat',
    'shemos-hattzedikim', 'yemay-hatlaos', 'outpouring-of-the-soul',
    'restore-my-soul', 'parparos-lechochma', 'rimzeh-hamaasiyos', 'song-of-the-land',
    'yikra-dshabbata', 'yereach-haeitan', 'nachas-hashulchan', 'likutay-aitzos-mahaduras-basra',
    'biur-halikutim', 'chochma-utvuna', 'kokhvei-or',
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
]

NO_ENGLISH_BOOKS = ['likutay-nanach', 'siach-sarfei-kodesh']
MARKER_THRESHOLD = 30  # segments with HE chars below this are likely markers

base_dir = '/root/ajew-org/public/reader'

total_files = 0
files_with_real_issues = []
marker_only_segs_total = 0
missing_en_segs_total = 0

for book_id in BRESlOV_BOOKS:
    book_dir = os.path.join(base_dir, book_id)
    if not os.path.isdir(book_dir):
        continue
    
    book_issues = []
    
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
            
            total_files += 1
            segs = data.get('segments', [])
            if not segs:
                continue
            
            # Count content vs marker segments
            he_content_segs = 0
            en_content_segs = 0
            marker_segs = 0
            missing_en_content_segs = 0
            
            for seg in segs:
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()
                
                if he and len(he) > MARKER_THRESHOLD:
                    he_content_segs += 1
                    if en:
                        en_content_segs += 1
                    else:
                        missing_en_content_segs += 1
                elif he and len(he) <= MARKER_THRESHOLD:
                    marker_segs += 1
            
            marker_only_segs_total += marker_segs
            missing_en_segs_total += missing_en_content_segs
            
            # Flag files where content segments are missing EN
            if missing_en_content_segs > 0 and book_id not in NO_ENGLISH_BOOKS:
                book_issues.append({
                    'file': f'{part_dir}/{f}',
                    'content_segs': he_content_segs,
                    'en_segs': en_content_segs,
                    'missing_en': missing_en_content_segs,
                    'markers': marker_segs
                })
    
    if book_issues:
        files_with_real_issues.append((book_id, book_issues))

print(f"=== AUDIT RESULTS ===")
print(f"Total files scanned: {total_files}")
print(f"Marker-only segments (headers): {marker_only_segs_total}")
print(f"Content segments missing EN: {missing_en_segs_total}")
print(f"Books with missing EN content: {len(files_with_real_issues)}")

for book_id, issues in files_with_real_issues:
    print(f"\n  {book_id}: {len(issues)} files with missing EN")
    for issue in issues[:5]:
        print(f"    {issue['file']}: {issue['missing_en']}/{issue['content_segs']} content segs missing EN ({issue['markers']} markers)")
    if len(issues) > 5:
        print(f"    ... and {len(issues)-5} more files")

print(f"\n=== EXPECTED NO-ENGLISH BOOKS ===")
for book_id in NO_ENGLISH_BOOKS:
    book_dir = os.path.join(base_dir, book_id)
    if os.path.isdir(book_dir):
        he_total = 0
        en_total = 0
        for root, dirs, files in os.walk(book_dir):
            for f in files:
                if f.endswith('.json') and f != 'index.json':
                    filepath = os.path.join(root, f)
                    try:
                        with open(filepath, encoding='utf-8') as fh:
                            data = json.load(fh)
                        for seg in data.get('segments', []):
                            if seg.get('he', '').strip():
                                he_total += 1
                            if seg.get('en', '').strip():
                                en_total += 1
                    except:
                        pass
        print(f"  {book_id}: {he_total} HE, {en_total} EN segments")
