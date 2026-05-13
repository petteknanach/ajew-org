#!/usr/bin/env python3
"""
Complete Otzar Hayirah Hebrew rebuild.
Uses index.json to map each torah file to its docx section by Hebrew title.
Handles multi-file sections and subsections.
"""

import os, re, json, unicodedata
from docx import Document

DOCX_DIR = '/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/otzar-hayirah'
OUTPUT_DIR = '/root/ajew-org/public/reader/otzar-hayirah'

DOCX_FILES = [
    ('oatzar hayeeruh - volume 1 - copied from torat emet for simanim.docx', 1),
    ('oatzar hayeerah - volume 2 - copied from Torat Emet for simanim.docx', 2),
    ('oatzar hayeerah - volume 3 - copied from Torat emet for simanim.docx', 3),
    ('Oatzar hayeerah - volume 4 - copied from torat emet for simanim.docx', 4),
]

HEB_LETTERS = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
    'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16, 'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20,
    'כא': 21, 'כב': 22, 'כג': 23, 'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
    'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36, 'לז': 37, 'לח': 38, 'לט': 39, 'מ': 40,
    'מא': 41, 'מב': 42, 'מג': 43, 'מד': 44, 'מה': 45, 'מו': 46, 'מז': 47, 'מח': 48, 'מט': 49, 'נ': 50,
}

def heb_to_num(s):
    return HEB_LETTERS.get(s.strip(), None)

def normalize(s):
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_simanim(text):
    paragraphs = []
    valid_markers = sorted(HEB_LETTERS.keys(), key=len, reverse=True)
    marker_pattern = '|'.join(re.escape(m) for m in valid_markers)
    pattern = rf'(?:^|\s)({marker_pattern})\.\s'
    matches = list(re.finditer(pattern, text))
    for i, match in enumerate(matches):
        marker = match.group(1)
        simanim_num = heb_to_num(marker)
        start_pos = match.end()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        para_text = text[start_pos:end_pos].strip()
        if para_text and simanim_num:
            paragraphs.append((simanim_num, para_text))
    return paragraphs

def parse_docx(filepath):
    doc = Document(filepath)
    sections = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text or len(text) < 100: continue
        lines = text.split('\n', 1)
        title = lines[0].strip()
        content = text[len(title):].strip() if len(lines) > 1 else ''
        simanim = extract_simanim(content)
        if simanim:
            sections.append((title, simanim))
    return sections

def find_best_match(json_title, docx_map):
    """Find the best matching docx section for a JSON title."""
    jn = normalize(json_title)
    
    # Exact match
    if jn in docx_map:
        return docx_map[jn]
    
    # Check if JSON title contains a docx title
    for docx_norm, sim_map in docx_map.items():
        if docx_norm in jn:
            return sim_map
    
    # Check if docx title contains JSON title
    for docx_norm, sim_map in docx_map.items():
        if jn in docx_norm:
            return sim_map
    
    # Try matching by extracting Hebrew words
    jn_words = set(re.findall(r'[\u0590-\u05FF]{3,}', json_title))
    if jn_words:
        best_match = None
        best_score = 0
        for docx_norm, sim_map in docx_map.items():
            docx_words = set(re.findall(r'[\u0590-\u05FF]{3,}', docx_norm))
            score = len(jn_words & docx_words)
            if score > best_score:
                best_score = score
                best_match = sim_map
        if best_score >= 1:
            return best_match
    
    return None

def main():
    print('=== Otzar Hayirah Complete Hebrew Rebuild ===\n')
    
    # Step 1: Parse docx files
    print('Step 1: Parsing docx files...')
    docx_map = {}  # part_num -> {normalized_title: {simanim_num: hebrew}}
    for filename, part_num in DOCX_FILES:
        filepath = os.path.join(DOCX_DIR, filename)
        if not os.path.exists(filepath): continue
        sections = parse_docx(filepath)
        docx_map[part_num] = {}
        for title, simanim_list in sections:
            norm = normalize(title)
            docx_map[part_num][norm] = {num: text for num, text in simanim_list}
        print(f'  Part {part_num}: {len(sections)} sections')
    
    # Step 2: Load index files
    print('\nStep 2: Loading index files...')
    torah_list = []  # (part_num, torah_num, hebrew_title, segment_count)
    for part_num in range(1, 5):
        idx_path = os.path.join(OUTPUT_DIR, f'part-{part_num}', 'index.json')
        if not os.path.exists(idx_path): continue
        idx = json.load(open(idx_path))
        for t in idx.get('torahs', []):
            torah_list.append((
                part_num,
                t.get('number', 0),
                t.get('hebrewTitle', ''),
                t.get('paragraphs', 0),
            ))
        n_torahs = len(idx.get('torahs', []))
        print(f'  Part {part_num}: {n_torahs} torahs')
    
    # Step 3: Process each torah file
    print('\nStep 3: Processing JSON files...')
    total_set = 0
    total_cleared = 0
    files_matched = 0
    files_unmatched = 0
    
    for part_num, torah_num, hebrew_title, expected_paras in torah_list:
        json_path = os.path.join(OUTPUT_DIR, f'part-{part_num}', f'torah-{torah_num}.json')
        if not os.path.exists(json_path): continue
        
        data = json.load(open(json_path))
        segments = data.get('segments', [])
        
        # Find matching docx section
        part_docx = docx_map.get(part_num, {})
        simanim_map = find_best_match(hebrew_title, part_docx)
        
        # Clear all Hebrew
        for seg in segments:
            if seg.get('he', '').strip():
                seg['he'] = ''
                total_cleared += 1
        
        if simanim_map:
            # Set Hebrew from docx
            for seg in segments:
                seg_idx = seg.get('index', 0)
                if seg_idx in simanim_map:
                    seg['he'] = simanim_map[seg_idx]
                    total_set += 1
            files_matched += 1
        else:
            files_unmatched += 1
            if torah_num <= 10 or torah_num % 20 == 0:
                print(f'  NO MATCH: part {part_num} torah {torah_num} - {hebrew_title[:40]}')
        
        json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
    
    print(f'\nFiles matched: {files_matched}')
    print(f'Files unmatched: {files_unmatched}')
    print(f'Segments cleared: {total_cleared}')
    print(f'Segments set: {total_set}')
    
    # Count remaining empty
    empty = 0
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir): continue
        for f in os.listdir(part_dir):
            if not f.startswith('torah-') or not f.endswith('.json'): continue
            data = json.load(open(os.path.join(part_dir, f)))
            for seg in data.get('segments', []):
                if not seg.get('he', '').strip():
                    empty += 1
    print(f'Remaining empty Hebrew: {empty}')

if __name__ == '__main__':
    main()
