#!/usr/bin/env python3
"""
Complete rebuild of Otzar Hayirah JSON files.
For each torah file:
1. Find matching docx section by Hebrew title (from index.json)
2. Extract Hebrew paragraphs from docx by simanim index
3. Extract English paragraphs from HTML source by position
4. Write clean JSON with paired he/en segments
"""

import os, re, json, html as htmlmod, unicodedata
from docx import Document

DOCX_DIR = '/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/otzar-hayirah'
OUTPUT_DIR = '/root/ajew-org/public/reader/otzar-hayirah'
INDEX_DIR = OUTPUT_DIR

DOCX_FILES = [
    ('oatzar hayeeruh - volume 1 - copied from torat emet for simanim.docx', 1),
    ('oatzar hayeerah - volume 2 - copied from Torat Emet for simanim.docx', 2),
    ('oatzar hayeerah - volume 3 - copied from Torat emet for simanim.docx', 3),
    ('Oatzar hayeerah - volume 4 - copied from torat emet for simanim.docx', 4),
]

HTML_DIRS = [
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 1',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 2',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 3',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 4',
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
    """Normalize Hebrew for comparison."""
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', s)  # Remove nikud
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def strip_html(h):
    h = re.sub(r'<[^>]+>', '', h)
    return re.sub(r'\s+', ' ', htmlmod.unescape(h)).strip()

def extract_simanim_from_text(text):
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

def parse_docx_sections(filepath):
    """Parse docx file. Returns list of (title, [(simanim_num, hebrew_text)])."""
    doc = Document(filepath)
    sections = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text or len(text) < 100:
            continue
        lines = text.split('\n', 1)
        title = lines[0].strip()
        content = text[len(title):].strip() if len(lines) > 1 else ''
        simanim = extract_simanim_from_text(content)
        if simanim:
            sections.append((title, simanim))
    return sections

def extract_english_from_html(html_text):
    """Extract English paragraphs from HTML."""
    pairs = []
    i = 0
    while i < len(html_text):
        m = re.search(r'<div\s+class="para">', html_text[i:], re.I)
        if not m:
            break
        start = i + m.start()
        depth = 1
        pos = start + 18
        while depth > 0 and pos < len(html_text):
            no = html_text.find('<div', pos)
            nc = html_text.find('</div>', pos)
            if nc < 0:
                break
            if no >= 0 and no < nc:
                depth += 1
                pos = no + 4
            else:
                depth -= 1
                if depth == 0:
                    block = html_text[start + 18:nc]
                    en_m = re.search(r'<p>([\s\S]*?)</p>', block)
                    if en_m:
                        en = strip_html(en_m.group(1))
                        en = re.sub(r'^[\u0590-\u05FF\s▾]+', '', en).strip()
                        if len(en) > 10:
                            pairs.append(en)
                    i = nc + 6
                    break
                pos = nc + 6
        else:
            i = pos
    return pairs

def find_html_file_for_section(html_dirs, section_title, part_num):
    """Find the HTML file that matches a section title."""
    # Try to find by filename pattern
    norm_title = normalize(section_title).lower()
    
    for d in html_dirs:
        if not os.path.exists(d):
            continue
        for f in os.listdir(d):
            if not f.endswith('.html'):
                continue
            # Check if filename contains keywords from the title
            fname_lower = f.lower()
            # Extract Hebrew words from title and check if they appear in filename
            heb_words = re.findall(r'[\u0590-\u05FF]+', section_title)
            for word in heb_words:
                if len(word) > 2 and word.lower() in fname_lower:
                    return os.path.join(d, f)
    
    return None

def main():
    print('=== Otzar Hayirah Complete Rebuild ===\n')
    
    # Step 1: Parse docx files for Hebrew
    print('Step 1: Parsing docx files for Hebrew...')
    docx_sections = {}  # part_num -> [(title, [(simanim_num, hebrew)])]
    docx_title_map = {}  # part_num -> {normalized_title: {simanim_num: hebrew}}
    
    for filename, part_num in DOCX_FILES:
        filepath = os.path.join(DOCX_DIR, filename)
        if not os.path.exists(filepath):
            print(f'  MISSING: {filename}')
            continue
        sections = parse_docx_sections(filepath)
        docx_sections[part_num] = sections
        docx_title_map[part_num] = {}
        for title, simanim_list in sections:
            norm = normalize(title)
            docx_title_map[part_num][norm] = {num: text for num, text in simanim_list}
        print(f'  Part {part_num}: {len(sections)} sections')
    
    # Step 2: Load index files to get torah metadata
    print('\nStep 2: Loading index files...')
    torah_index = {}  # (part_num, torah_num) -> {title, hebrewTitle, paragraphs}
    for part_num in range(1, 5):
        idx_path = os.path.join(INDEX_DIR, f'part-{part_num}', 'index.json')
        if not os.path.exists(idx_path):
            continue
        idx = json.load(open(idx_path))
        for t in idx.get('torahs', []):
            tnum = t.get('number', 0)
            torah_index[(part_num, tnum)] = {
                'title': t.get('title', ''),
                'hebrewTitle': t.get('hebrewTitle', ''),
                'paragraphs': t.get('paragraphs', 0),
                'url': t.get('url', ''),
            }
        print(f'  Part {part_num}: {len(idx.get("torahs", []))} torahs')
    
    # Step 3: Rebuild each torah JSON file
    print('\nStep 3: Rebuilding JSON files...')
    total_hebrew = 0
    total_english = 0
    files_rebuilt = 0
    
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir):
            continue
        
        docx_map = docx_title_map.get(part_num, {})
        
        for tnum in range(1, 200):
            json_path = os.path.join(part_dir, f'torah-{tnum}.json')
            if not os.path.exists(json_path):
                continue
            
            idx_key = (part_num, tnum)
            meta = torah_index.get(idx_key, {})
            hebrew_title = meta.get('hebrewTitle', '')
            norm_title = normalize(hebrew_title)
            
            # Find matching docx section
            simanim_map = docx_map.get(norm_title)
            if not simanim_map:
                # Try partial match
                for docx_norm, sim_map in docx_map.items():
                    if docx_norm in norm_title or norm_title in docx_norm:
                        simanim_map = sim_map
                        break
            
            # Load existing data
            data = json.load(open(json_path))
            segments = data.get('segments', [])
            
            # Rebuild segments
            new_segments = []
            for seg in segments:
                seg_idx = seg.get('index', 0)
                new_seg = {
                    'index': seg_idx,
                    'he': simanim_map.get(seg_idx, '') if simanim_map else '',
                    'en': seg.get('en', ''),  # Keep existing English for now
                }
                new_segments.append(new_seg)
                if new_seg['he']:
                    total_hebrew += 1
                if new_seg['en']:
                    total_english += 1
            
            data['segments'] = new_segments
            json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
            files_rebuilt += 1
    
    print(f'\nFiles rebuilt: {files_rebuilt}')
    print(f'Segments with Hebrew: {total_hebrew}')
    print(f'Segments with English: {total_english}')
    
    # Count empty
    empty_he = 0
    empty_en = 0
    for part_num in range(1, 5):
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir):
            continue
        for f in os.listdir(part_dir):
            if not f.startswith('torah-') or not f.endswith('.json'):
                continue
            data = json.load(open(os.path.join(part_dir, f)))
            for seg in data.get('segments', []):
                if not seg.get('he', '').strip():
                    empty_he += 1
                if not seg.get('en', '').strip():
                    empty_en += 1
    
    print(f'Empty Hebrew: {empty_he}')
    print(f'Empty English: {empty_en}')

if __name__ == '__main__':
    main()
