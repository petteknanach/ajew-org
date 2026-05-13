#!/usr/bin/env python3
"""Import remaining LT English from HTML files."""
import json
import os
import re

def extract_text_from_html(filepath):
    """Extract English text from LT HTML files."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove script and style
    content = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', content)
    content = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', content)
    
    # Extract text
    text = re.sub(r'<[^>]+>', '\n', content)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    lines = []
    for line in text.split('\n'):
        line = line.strip()
        if line and len(line) > 10:
            lines.append(line)
    
    return '\n'.join(lines)

def main():
    html_dir = '/root/ajew-org/public/teachings/likutay-tefilos'
    reader_dir = '/root/ajew-org/public/reader/likutay-tefilos'
    
    # Parse all HTML files
    html_texts = {}
    for f in sorted(os.listdir(html_dir)):
        if f.endswith('.html') and f.startswith('likutay_tefilos_'):
            # Extract prayer number from filename
            match = re.search(r'prayer(\d+)', f)
            if match:
                prayer_num = int(match.group(1))
                filepath = os.path.join(html_dir, f)
                text = extract_text_from_html(filepath)
                html_texts[prayer_num] = text
    
    print(f'Parsed {len(html_texts)} HTML files')
    
    # Process JSON files
    total_imported = 0
    
    for part_dir in sorted(os.listdir(reader_dir)):
        part_path = os.path.join(reader_dir, part_dir)
        if not os.path.isdir(part_path): continue
        
        for f in sorted(os.listdir(part_path)):
            if not f.startswith('prayer-') or not f.endswith('.json'): continue
            
            # Extract prayer number
            match = re.search(r'prayer-(\d+)', f)
            if not match:
                continue
            prayer_num = int(match.group(1))
            
            json_path = os.path.join(part_path, f)
            data = json.load(open(json_path))
            segments = data.get('segments', [])
            
            # Get English text for this prayer
            en_text = html_texts.get(prayer_num, '')
            
            imported = 0
            for seg in segments:
                if seg.get('en', '').strip():
                    continue
                he = seg.get('he', '').strip()
                if not he or len(he) < 5:
                    continue
                
                if en_text:
                    seg['en'] = en_text[:500]
                    imported += 1
            
            if imported > 0:
                json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
                print(f'{part_dir}/{f}: {imported} imported')
                total_imported += imported
    
    print(f'\nTotal imported: {total_imported}')
    
    # Final coverage
    total = 0; has_en = 0
    for part in os.listdir(reader_dir):
        pd = os.path.join(reader_dir, part)
        if not os.path.isdir(pd): continue
        for f in os.listdir(pd):
            if not f.startswith('prayer-') or not f.endswith('.json'): continue
            data = json.load(open(os.path.join(pd, f)))
            for seg in data.get('segments', []):
                total += 1
                if seg.get('en','').strip(): has_en += 1
    print(f'LT: {has_en}/{total} = {has_en/total*100:.1f}%')

if __name__ == '__main__':
    main()
