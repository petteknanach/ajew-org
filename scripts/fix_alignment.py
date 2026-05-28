#!/usr/bin/env python3
"""
Fix alignment for all Breslov books on ajew.org.
1. Merge marker segments (short HE-only) into following content segment
2. Remove isolated marker segments that can't be merged
3. Ensure every remaining segment has both HE and EN
4. Report segments that are genuinely missing EN content
"""
import json
import os
import re
from collections import defaultdict

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
MARKER_THRESHOLD = 50  # HE chars below this = likely marker

base_dir = '/root/ajew-org/public/reader'

stats = defaultdict(int)
missing_en_report = []  # Track genuinely missing EN segments

for book_id in BRESlOV_BOOKS:
    if book_id in NO_ENGLISH_BOOKS:
        continue
    
    book_dir = os.path.join(base_dir, book_id)
    if not os.path.isdir(book_dir):
        continue
    
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
            
            # Step 1: Identify marker vs content segments
            # A marker segment has short HE (< threshold) and no EN
            markers = []
            content = []
            for i, seg in enumerate(segs):
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()
                he_len = len(he) if he else 0
                
                if he and not en and he_len <= MARKER_THRESHOLD:
                    markers.append((i, seg))
                else:
                    content.append((i, seg))
            
            # Step 2: Merge markers into following content segments
            # Build new segment list
            new_segs = []
            pending_markers = []
            
            for i, seg in enumerate(segs):
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()
                he_len = len(he) if he else 0
                is_marker = he and not en and he_len <= MARKER_THRESHOLD
                
                if is_marker:
                    pending_markers.append(he)
                else:
                    # This is a content segment - prepend any pending markers
                    if pending_markers:
                        # Merge marker text into HE
                        merged_he = ' '.join(pending_markers + [he]) if he else ' '.join(pending_markers)
                        seg = dict(seg)
                        seg['he'] = merged_he
                        pending_markers = []
                    
                    # Check if this is a content segment missing EN
                    if he and len(he) > MARKER_THRESHOLD and not en:
                        missing_en_report.append({
                            'book': book_id,
                            'file': filepath,
                            'seg_index': i,
                            'he_preview': he[:100]
                        })
                    
                    new_segs.append(seg)
            
            # Handle trailing markers (merge into last segment or drop)
            if pending_markers and new_segs:
                last_seg = dict(new_segs[-1])
                last_he = last_seg.get('he', '')
                merged = (last_he + ' ' + ' '.join(pending_markers)).strip() if last_he else ' '.join(pending_markers)
                last_seg['he'] = merged
                new_segs[-1] = last_seg
            elif pending_markers:
                # All segments were markers - keep them as-is
                for marker_text in pending_markers:
                    new_segs.append({'he': marker_text, 'en': ''})
            
            if len(new_segs) != len(segs):
                stats['files_modified'] += 1
                stats['segs_removed'] += len(segs) - len(new_segs)
            
            data['segments'] = new_segs
            
            # Write back
            with open(filepath, 'w', encoding='utf-8') as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)

print(f"=== FIX RESULTS ===")
print(f"Files modified: {stats['files_modified']}")
print(f"Segments removed (merged): {stats['segs_removed']}")
print(f"Genuinely missing EN segments: {len(missing_en_report)}")

# Group missing EN by book
from collections import Counter
missing_by_book = Counter(r['book'] for r in missing_en_report)
print(f"\nMissing EN by book:")
for book, count in missing_by_book.most_common(20):
    print(f"  {book}: {count} segments")

# Save missing EN report
with open('/tmp/missing_en_report.json', 'w') as f:
    json.dump(missing_en_report, f, ensure_ascii=False, indent=2)
print(f"\nMissing EN report saved to /tmp/missing_en_report.json")
