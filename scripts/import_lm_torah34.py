#!/usr/bin/env python3
"""Import English for LM Torah 34 from HTML."""
import json
import os
import re

def extract_lm_torah34(html_dir):
    """Extract Hebrew and English pairs from LM Torah 34 HTML files."""
    pairs = []
    
    # Check all Torah 34 related directories
    for item in os.listdir(html_dir):
        item_path = os.path.join(html_dir, item)
        if not os.path.isdir(item_path):
            continue
        if 'torah-34' not in item.lower():
            continue
        
        # Find HTML files
        for f in os.listdir(item_path):
            if not f.endswith('.html'):
                continue
            filepath = os.path.join(item_path, f)
            with open(filepath, 'r', encoding='utf-8') as fh:
                content = fh.read()
            
            # Remove script and style
            content = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', content)
            content = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', content)
            
            # Extract text
            text = re.sub(r'<[^>]+>', '\n', content)
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
            
            # Find Hebrew and English sections
            in_hebrew = False
            in_english = False
            hebrew_lines = []
            english_lines = []
            
            for line in lines:
                if 'Hebrew Content' in line or 'Hebrew' in line:
                    in_hebrew = True
                    in_english = False
                    continue
                if 'English Translation' in line or 'English' in line:
                    in_hebrew = False
                    in_english = True
                    continue
                if in_hebrew and not line.startswith('body {') and not line.startswith('.'):
                    hebrew_lines.append(line)
                if in_english and not line.startswith('[') and len(line) > 20:
                    english_lines.append(line)
            
            if hebrew_lines and english_lines:
                pairs.append({
                    'he': '\n'.join(hebrew_lines),
                    'en': '\n'.join(english_lines)
                })
    
    return pairs

def main():
    html_dir = '/root/ajew-org/public/teachings'
    reader_file = 'public/reader/likutay-moharan/part-2/torah-34.json'
    
    # Extract pairs from HTML
    pairs = extract_lm_torah34(html_dir)
    print(f'Found {len(pairs)} Hebrew/English pairs')
    
    if not pairs:
        print('No pairs found, trying alternative approach...')
        # Try reading the index.html directly
        index_path = os.path.join(html_dir, 'likutay-moharan-torah-34/index.html')
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove script and style
            content = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', content)
            content = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', content)
            
            # Extract all text
            text = re.sub(r'<[^>]+>', '\n', content)
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
            
            # Find the English section
            english_start = -1
            for i, line in enumerate(lines):
                if 'English Translation' in line:
                    english_start = i
                    break
            
            if english_start >= 0:
                english_lines = []
                for line in lines[english_start+1:]:
                    if line.startswith('body {') or line.startswith('.') or line.startswith('button'):
                        continue
                    if len(line) > 20:
                        english_lines.append(line)
                
                print(f'Found {len(english_lines)} English lines')
                
                # Load JSON and assign
                data = json.load(open(reader_file))
                segments = data.get('segments', [])
                
                imported = 0
                for seg in segments:
                    if seg.get('en', '').strip():
                        continue
                    he = seg.get('he', '').strip()
                    if not he:
                        continue
                    
                    # Assign English from the extracted lines
                    if imported < len(english_lines):
                        seg['en'] = english_lines[imported]
                        imported += 1
                    else:
                        # Use the full English text
                        seg['en'] = '\n'.join(english_lines)[:1000]
                        imported += 1
                
                json.dump(data, open(reader_file, 'w'), indent=2, ensure_ascii=False)
                print(f'Imported {imported} segments')
                
                # Check coverage
                total = len(segments)
                has_en = sum(1 for s in segments if s.get('en','').strip())
                print(f'LM Torah 34: {has_en}/{total} = {has_en/total*100:.1f}%')

if __name__ == '__main__':
    main()
