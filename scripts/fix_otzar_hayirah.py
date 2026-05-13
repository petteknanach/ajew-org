#!/usr/bin/env python3
"""
Parse Otzar Hayirah source files and repopulate JSON segments with correct Hebrew.
"""

import os
import re
import json
import unicodedata

SOURCE_DIR = '/mnt/c/Users/nanach/Documents/ToratEmetUserData/MyBooks/נ נח נחמ נחמן מאומן/3_ספרי הרב מטשערין/אוצר היראה/ליקוטי עצות חדש'
OUTPUT_DIR = '/root/ajew-org/public/reader/otzar-hayirah'

SOURCE_FILES = [
    ('אוצר היראה א-ד.txt', 1),
    ('אוצר היראה ה-ל.txt', 2),
    ('אוצר היראה מ, מועדים.txt', 3),
    ('אוצר היראה נ-ת.txt', 4),
]

HEB_LETTERS = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
    'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16, 'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20,
    'כא': 21, 'כב': 22, 'כג': 23, 'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
    'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36, 'לז': 37, 'לח': 38, 'לט': 39, 'מ': 40,
    'מא': 41, 'מב': 42, 'מג': 43, 'מד': 44, 'מה': 45, 'מו': 46, 'מז': 47, 'מח': 48, 'מט': 49, 'נ': 50,
    'נא': 51, 'נב': 52, 'נג': 53, 'נד': 54, 'נה': 55, 'נו': 56, 'נז': 57, 'נח': 58, 'נט': 59, 'ס': 60,
}

def heb_to_num(s):
    s = s.strip()
    return HEB_LETTERS.get(s, None)

def clean_text(text):
    """Remove Torat Emet markup and clean text."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove Torat Emet codes
    text = re.sub(r'&\w+=\w*', '', text)
    text = re.sub(r'#[^#]*#', '', text)
    text = re.sub(r'\^{2,}', '', text)
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_source_file(filepath):
    """Parse a Torat Emet source file. Returns list of (section_title, [(simanim_num, hebrew_text), ...])"""
    with open(filepath, 'r', encoding='windows-1255', errors='replace') as f:
        content = f.read()
    
    # Skip header
    start = content.find('$')
    if start == -1:
        return []
    content = content[start:]
    
    # Split by @ to get sections
    parts = re.split(r'\n@', content)
    
    sections = []
    for part in parts[1:]:  # Skip title part
        part = part.strip()
        if not part:
            continue
        
        # First line is section header
        lines = part.split('\n', 1)
        section_title = lines[0].strip()
        
        if len(lines) < 2:
            continue
        
        text = lines[1]
        
        # Find simanim markers: lines starting with Hebrew letter(s) + dot
        # Pattern: newline + Hebrew_letters + dot + space/text
        simanim_pattern = r'(?:\n|^)([\u0590-\u05EA]{1,3})\.\s'
        matches = list(re.finditer(simanim_pattern, text))
        
        paragraphs = []
        
        # Handle intro text (before first simanim)
        if matches:
            intro_text = text[:matches[0].start()].strip()
            intro_text = clean_text(intro_text)
            
            # Process each simanim
            for i, match in enumerate(matches):
                marker = match.group(1)
                simanim_num = heb_to_num(marker)
                
                # Text from after this marker to the next one
                start_pos = match.end()
                if i + 1 < len(matches):
                    end_pos = matches[i + 1].start()
                else:
                    end_pos = len(text)
                
                para_text = text[start_pos:end_pos].strip()
                para_text = clean_text(para_text)
                
                if para_text and simanim_num:
                    paragraphs.append((simanim_num, para_text))
        
        if paragraphs:
            sections.append((section_title, paragraphs))
    
    return sections

def main():
    print('Parsing Otzar Hayirah source files...')
    
    # Parse all source files
    all_sections = {}  # part_num -> [(title, [(simanim_num, text), ...])]
    
    for filename, part_num in SOURCE_FILES:
        filepath = os.path.join(SOURCE_DIR, filename)
        if not os.path.exists(filepath):
            print(f'  MISSING: {filename}')
            continue
        
        sections = parse_source_file(filepath)
        all_sections[part_num] = sections
        total_paras = sum(len(p) for _, p in sections)
        print(f'  Part {part_num} ({filename}): {len(sections)} sections, {total_paras} paragraphs')
    
    # Now map sections to JSON files and update
    print('\nUpdating JSON files...')
    
    total_updated = 0
    total_segments = 0
    files_updated = 0
    
    for part_num in range(1, 5):
        if part_num not in all_sections:
            continue
        
        sections = all_sections[part_num]
        part_dir = os.path.join(OUTPUT_DIR, f'part-{part_num}')
        if not os.path.exists(part_dir):
            continue
        
        # Build a mapping from section title to paragraphs
        section_map = {}
        for title, paras in sections:
            # Normalize title for matching
            norm = unicodedata.normalize('NFKD', title.strip())
            section_map[norm] = paras
            # Also store by stripped version
            section_map[title.strip()] = paras
        
        # Get list of torah files
        torah_files = sorted([f for f in os.listdir(part_dir) 
                            if f.startswith('torah-') and f.endswith('.json')])
        
        for tf in torah_files:
            tf_path = os.path.join(part_dir, tf)
            data = json.load(open(tf_path))
            
            torah_title = data.get('hebrewTitle', '')
            segments = data.get('segments', [])
            
            # Find matching section
            matching_paras = None
            
            # Try exact match first
            norm_title = unicodedata.normalize('NFKD', torah_title.strip())
            if norm_title in section_map:
                matching_paras = section_map[norm_title]
            elif torah_title.strip() in section_map:
                matching_paras = section_map[torah_title.strip()]
            else:
                # Try partial match
                for title, paras in sections:
                    norm_section = unicodedata.normalize('NFKD', title.strip())
                    if norm_section in norm_title or norm_title in norm_section:
                        matching_paras = paras
                        break
            
            if not matching_paras:
                continue
            
            # Build a map from simanim_num to text
            paras_map = {}
            for simanim_num, text in matching_paras:
                paras_map[simanim_num] = text
            
            # Update each segment
            updated = 0
            for seg in segments:
                seg_idx = seg.get('index', 0)
                if seg_idx in paras_map:
                    seg['he'] = paras_map[seg_idx]
                    updated += 1
            
            total_updated += updated
            total_segments += len(segments)
            
            if updated > 0:
                json.dump(data, open(tf_path, 'w'), indent=2, ensure_ascii=False)
                files_updated += 1
                
                if files_updated <= 10 or updated < len(segments):
                    print(f'  {tf}: {updated}/{len(segments)} segments updated')
    
    print(f'\nTotal: {files_updated} files updated, {total_updated}/{total_segments} segments')
    
    # Report on coverage
    empty_count = 0
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
                    empty_count += 1
    print(f'Still empty: {empty_count} segments')

if __name__ == '__main__':
    main()
