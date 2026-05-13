#!/usr/bin/env python3
"""
Complete Otzar Hayirah Hebrew rebuild - FINAL version.
Maps docx sections to JSON files by matching Hebrew title keywords.
Each docx section's simanim are distributed across all matching JSON files.
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

def get_keywords(title):
    """Extract Hebrew keywords from a title for matching."""
    # Remove common words
    stop_words = {'ובטול', 'וחכמות', 'חיצוניות', 'המשך', 'סיום', 'גמר', '—', '-'}
    words = re.findall(r'[\u0590-\u05FF]{3,}', title)
    return [w for w in words if w not in stop_words]

def title_matches(json_title, docx_title):
    """Check if a JSON title matches a docx section title."""
    jn = normalize(json_title)
    dn = normalize(docx_title)
    
    # Exact match
    if jn == dn:
        return True
    
    # JSON contains docx title
    if dn in jn:
        return True
    
    # Docx contains JSON title
    if jn in dn:
        return True
    
    # Keyword matching
    jn_words = set(get_keywords(json_title))
    dn_words = set(get_keywords(docx_title))
    
    # If they share at least 2 Hebrew words, it's a match
    if len(jn_words & dn_words) >= 2:
        return True
    
    # If JSON has only 1 word and it matches
    if len(jn_words) == 1 and jn_words & dn_words:
        return True
    
    return False

def main():
    print('=== Otzar Hayirah Complete Hebrew Rebuild ===\n')
    
    # Step 1: Parse docx files
    print('Step 1: Parsing docx files...')
    docx_sections = {}  # part_num -> [(title, [(simanim_num, hebrew)])]
    for filename, part_num in DOCX_FILES:
        filepath = os.path.join(DOCX_DIR, filename)
        if not os.path.exists(filepath): continue
        sections = parse_docx(filepath)
        docx_sections[part_num] = sections
        print(f'  Part {part_num}: {len(sections)} sections')
    
    # Step 2: Load all torah files and match to docx sections
    print('\nStep 2: Matching and rebuilding...')
    
    # Build mapping: for each docx section, find all matching JSON files
    docx_to_json = {}  # (part_num, docx_idx) -> [(torah_num, json_title, segments)]
    
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir): continue
        
        idx_path = os.path.join(part_dir, 'index.json')
        if not os.path.exists(idx_path): continue
        idx = json.load(open(idx_path))
        
        docx_list = docx_sections.get(part_num, [])
        
        for t in idx.get('torahs', []):
            tnum = t.get('number', 0)
            hebrew_title = t.get('hebrewTitle', '')
            
            # Find matching docx section
            matched = False
            for docx_idx, (docx_title, simanim_list) in enumerate(docx_list):
                if title_matches(hebrew_title, docx_title):
                    key = (part_num, docx_idx)
                    if key not in docx_to_json:
                        docx_to_json[key] = []
                    docx_to_json[key].append((tnum, hebrew_title))
                    matched = True
                    break
            
            if not matched:
                # Try matching by checking if any docx keyword appears in JSON title
                for docx_idx, (docx_title, simanim_list) in enumerate(docx_list):
                    docx_words = set(get_keywords(docx_title))
                    json_words = set(get_keywords(hebrew_title))
                    if docx_words and json_words and docx_words == json_words:
                        key = (part_num, docx_idx)
                        if key not in docx_to_json:
                            docx_to_json[key] = []
                        docx_to_json[key].append((tnum, hebrew_title))
                        matched = True
                        break
    
    # Step 3: Rebuild each JSON file
    total_set = 0
    files_matched = 0
    
    for (part_num, docx_idx), json_files in docx_to_json.items():
        docx_title, simanim_list = docx_sections[part_num][docx_idx]
        simanim_map = {num: text for num, text in simanim_list}
        
        for tnum, json_title in json_files:
            json_path = os.path.join(OUTPUT_DIR, f'part-{part_num}', f'torah-{tnum}.json')
            if not os.path.exists(json_path): continue
            
            data = json.load(open(json_path))
            segments = data.get('segments', [])
            
            # Clear Hebrew, set from docx
            for seg in segments:
                seg_idx = seg.get('index', 0)
                if seg_idx in simanim_map:
                    seg['he'] = simanim_map[seg_idx]
                    total_set += 1
                else:
                    seg['he'] = ''
            
            json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
            files_matched += 1
    
    print(f'Files matched: {files_matched}')
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
