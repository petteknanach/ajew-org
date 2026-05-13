#!/usr/bin/env python3
"""Import English from Ramchal text files into JSON segments."""
import json
import os
import re

def parse_text_file(filepath):
    """Parse a structured English text file with === Section === headers."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by section headers
    parts = re.split(r'=== (.+?) ===\n', content)
    
    sections = []
    # parts[0] is preamble, then alternating title, content
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        text = parts[i+1].strip() if i+1 < len(parts) else ''
        
        # Remove Hebrew lines (lines that are mostly Hebrew)
        lines = text.split('\n')
        english_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # Check if line is mostly Hebrew
            heb_chars = sum(1 for c in line if '\u0590' <= c <= '\u05FF')
            total_chars = len(line)
            if total_chars > 0 and heb_chars / total_chars < 0.3:
                english_lines.append(line)
        
        english_text = '\n'.join(english_lines).strip()
        if english_text and len(english_text) > 20:
            sections.append((title, english_text))
    
    return sections

def main():
    downloads_dir = '/mnt/c/Users/Pettek/Downloads/Ramchal/English Texts'
    
    # Map text files to reader books
    books = {
        'daas tevunos.txt': 'ramchal-daas-tevunos',
        'derech etz chaim.txt': 'ramchal-derech-etz-chaim',
    }
    
    reader_dir = '/root/ajew-org/public/reader'
    total_imported = 0
    
    for text_file, book_id in books.items():
        text_path = os.path.join(downloads_dir, text_file)
        book_path = os.path.join(reader_dir, book_id)
        
        if not os.path.exists(text_path):
            print(f'NOT FOUND: {text_file}')
            continue
        if not os.path.exists(book_path):
            print(f'NOT FOUND: {book_id}')
            continue
        
        print(f'\n=== {text_file} -> {book_id} ===')
        
        # Parse text file
        sections = parse_text_file(text_path)
        print(f'  Found {len(sections)} sections')
        
        # Process each JSON file
        for part_dir in sorted(os.listdir(book_path)):
            part_path = os.path.join(book_path, part_dir)
            if not os.path.isdir(part_path): continue
            
            for f in sorted(os.listdir(part_path)):
                if not f.endswith('.json') or f == 'index.json': continue
                
                json_path = os.path.join(part_path, f)
                data = json.load(open(json_path))
                segments = data.get('segments', [])
                
                imported = 0
                for seg in segments:
                    if seg.get('en', '').strip():
                        continue  # Already has English
                    
                    he = seg.get('he', '').strip()
                    if not he:
                        continue
                    
                    # Find best matching section
                    best_match = None
                    best_score = 0
                    
                    for title, english in sections:
                        # Check if section title matches segment content
                        title_words = set(title.lower().split())
                        he_words = set(he.lower().split())
                        overlap = len(title_words & he_words)
                        
                        # Also check if Hebrew text appears in English section
                        if he[:30].lower() in english.lower():
                            overlap += 10
                        
                        if overlap > best_score:
                            best_score = overlap
                            best_match = english
                    
                    if best_match and best_score > 0:
                        seg['en'] = best_match
                        imported += 1
                
                if imported > 0:
                    json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
                    print(f'  {part_dir}/{f}: imported {imported}')
                    total_imported += imported
    
    print(f'\nTotal imported: {total_imported}')
    
    # Check final coverage
    for book_id in books.values():
        d = os.path.join(reader_dir, book_id)
        if not os.path.exists(d): continue
        total = 0; has_en = 0
        for part in os.listdir(d):
            pd = os.path.join(d, part)
            if not os.path.isdir(pd): continue
            for f in os.listdir(pd):
                if not f.endswith('.json') or f == 'index.json': continue
                data = json.load(open(os.path.join(pd, f)))
                for seg in data.get('segments', []):
                    total += 1
                    if seg.get('en','').strip(): has_en += 1
        print(f'{book_id}: {has_en}/{total} = {has_en/total*100:.1f}%')

if __name__ == '__main__':
    main()
