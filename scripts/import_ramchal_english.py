#!/usr/bin/env python3
"""Parse English text files from Downloads and import into JSON."""
import json
import os
import re

# Map text files to reader book directories
BOOK_MAP = {
    'derech hashem.txt': ('ramchal-derech-hashem', 'part-1', 'torah-'),
    'mesillas yesharim.txt': ('ramchal-mesillas-yesharim', 'part-1', 'torah-'),
    'klach pitchei chochma.txt': ('ramchal-klach-pitchei-chochma', 'part-1', 'torah-'),
    'daas tevunos.txt': ('ramchal-daas-tevunos', 'part-1', 'torah-'),
    'maamar haikkarim.txt': ('ramchal-maamar-haikkarim', 'part-1', 'torah-'),
    'derech etz chaim.txt': ('ramchal-derech-etz-chaim', 'part-1', 'torah-'),
    'asara perakim.txt': ('ramchal-asara-perakim', 'part-1', 'torah-'),
}

def parse_english_file(filepath):
    """Parse a structured English text file.
    
    Format:
    === Section Title ===
    Hebrew text...
    English text...
    
    Returns list of (section_title, english_text) tuples.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by section headers
    sections = re.split(r'=== (.+?) ===\n', content)
    
    results = []
    # sections[0] is preamble, then alternating title, content
    for i in range(1, len(sections), 2):
        title = sections[i].strip()
        text = sections[i+1].strip() if i+1 < len(sections) else ''
        
        # Extract English text (after the Hebrew portion)
        # The text typically has Hebrew first, then English
        # Split on double newline to separate paragraphs
        paragraphs = text.split('\n\n')
        
        # Find where English starts (first paragraph with mostly ASCII)
        english_parts = []
        found_english = False
        for para in paragraphs:
            if not para.strip():
                continue
            # Check if paragraph is mostly English
            ascii_chars = sum(1 for c in para if ord(c) < 128)
            total_chars = len(para.strip())
            if total_chars > 0 and ascii_chars / total_chars > 0.7:
                found_True
                english_parts.append(para.strip())
            elif found_english:
                english_parts.append(para.strip())
        
        english_text = '\n\n'.join(english_parts)
        if english_text:
            results.append((title, english_text))
    
    return results

def find_matching_segment(segments, section_title):
    """Find the best matching segment for a section title."""
    # Try to match by section number or title
    # Section titles like "Part One - On the Creator" or "Introduction"
    
    # Extract section number if present
    num_match = re.search(r'(\d+)', section_title)
    if num_match:
        seg_num = int(num_match.group(1))
        if seg_num <= len(segments):
            return seg_num - 1
    
    # Try to find by Hebrew content similarity
    for i, seg in enumerate(segments):
        he = seg.get('he', '').strip()
        if not he:
            continue
        # Check if the section title appears in the Hebrew
        title_words = section_title.lower().split()
        he_lower = he.lower()
        matches = sum(1 for w in title_words if len(w) > 3 and w in he_lower)
        if matches >= 2:
            return i
    
    return None

def main():
    downloads_dir = '/mnt/c/Users/Pettek/Downloads/Ramchal/English Texts'
    reader_dir = '/root/ajew-org/public/reader'
    
    total_imported = 0
    
    for text_file, (book_dir, part_prefix, torah_prefix) in BOOK_MAP.items():
        filepath = os.path.join(downloads_dir, text_file)
        if not os.path.exists(filepath):
            print(f'NOT FOUND: {text_file}')
            continue
        
        print(f'\n=== {text_file} ===')
        
        # Parse the English file
        sections = parse_english_file(filepath)
        print(f'  Found {len(sections)} sections')
        
        # Find all JSON files for this book
        book_path = os.path.join(reader_dir, book_dir)
        if not os.path.exists(book_path):
            print(f'  Book directory not found: {book_dir}')
            continue
        
        for part_dir in os.listdir(book_path):
            part_path = os.path.join(book_path, part_dir)
            if not os.path.isdir(part_path):
                continue
            
            for f in os.listdir(part_path):
                if not f.endswith('.json') or f == 'index.json':
                    continue
                
                json_path = os.path.join(part_path, f)
                data = json.load(open(json_path))
                segments = data.get('segments', [])
                
                imported = 0
                for seg_idx, seg in enumerate(segments):
                    if seg.get('en', '').strip():
                        continue  # Already has English
                    
                    he = seg.get('he', '').strip()
                    if not he or len(he) < 10:
                        continue
                    
                    # Find matching section
                    best_match = None
                    best_score = 0
                    
                    for title, english in sections:
                        # Simple matching: check if Hebrew text appears in section
                        title_lower = title.lower()
                        he_lower = he.lower()
                        
                        # Check for direct match
                        if he_lower[:50] in english.lower():
                            score = 100
                        else:
                            # Word overlap
                            he_words = set(he_lower.split())
                            en_words = set(english.lower().split())
                            overlap = len(he_words & en_words)
                            score = overlap
                        
                        if score > best_score:
                            best_score = score
                            best_match = english
                    
                    if best_match and best_score > 5:
                        seg['en'] = best_match
                        imported += 1
                
                if imported > 0:
                    json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
                    print(f'  {part_dir}/{f}: imported {imported} segments')
                    total_imported += imported
    
    print(f'\nTotal imported: {total_imported}')

if __name__ == '__main__':
    main()
