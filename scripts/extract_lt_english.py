#!/usr/bin/env python3
"""
LT English extraction - BRUTE FORCE matching.
For each HTML paragraph, try ALL JSON segments. If Hebrew matches, assign English.
Simple, correct, and fast enough.
"""

import os
import re
import json

LT1_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1'
LT2_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2'
LT_TEACHINGS_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'
PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1'
PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2'

def decode_html(text):
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
    text = re.sub(r'&#x([0-9A-Fa-f]+);', lambda m: chr(int(m.group(1), 16)), text)
    return re.sub(r'\s+', ' ', text).strip()

def strip_html(html):
    return decode_html(re.sub(r'<[^>]+>', '', html))

def is_date_marker(he):
    if not he:
        return False
    t = he.strip()
    if len(t) > 60:
        return False
    return bool(re.match(r'^[\u0590-\u05FF\s\d\u05F3]{1,30}$', t))

def normalize(s):
    return re.sub(r'\s+', '', s).strip()

def extract_paired_paragraphs(html):
    pairs = []
    search_idx = 0
    while True:
        para_start = html.find('<div class="para">', search_idx)
        if para_start < 0: break
        depth = 1; pos = para_start + 18
        while depth > 0 and pos < len(html):
            next_open = html.find('<div', pos); next_close = html.find('</div>', pos)
            if next_close < 0: break
            if next_open >= 0 and next_open < next_close: depth += 1; pos = next_open + 4
            else:
                depth -= 1
                if depth == 0:
                    block = html[para_start + 18:next_close]
                    en_match = re.search(r'<p>([\s\S]*?)</p>', block)
                    he_match = re.search(r'<div\s+class="heb-text"[^>]*>([\s\S]*?)</div>', block)
                    if en_match:
                        en = strip_html(en_match.group(1))
                        en = re.sub(r'^[\u0590-\u05FF\s▾]+', '', en).strip()
                        he = strip_html(he_match.group(1)) if he_match else ''
                        if len(en) > 10: pairs.append({'en': en, 'he': he})
                    search_idx = next_close + 6; break
                pos = next_close + 6
        if depth > 0: search_idx = pos
    return pairs

def main():
    print('=== LT English Extraction (Brute Force) ===\n')
    
    # Step 1: Load all JSON segments into memory
    all_segments = []  # [(part, num, seg_idx, he_normalized, en_ref)]
    
    for part_dir, part_name in [(PART1_DIR, 'part1'), (PART2_DIR, 'part2')]:
        for num in range(1, 152 if part_dir == PART1_DIR else 60):
            p = os.path.join(part_dir, f'prayer-{num}.json')
            if not os.path.exists(p): continue
            with open(p, 'r') as f:
                data = json.load(f)
            for i, seg in enumerate(data['segments']):
                if not is_date_marker(seg['he']):
                    all_segments.append({
                        'part_dir': part_dir,
                        'num': num,
                        'seg_idx': i,
                        'he_norm': normalize(seg['he']),
                        'data': data,
                    })
    
    print(f'Loaded {len(all_segments)} content segments from JSON files')
    
    # Step 2: Clear all English
    for seg_info in all_segments:
        seg_info['data']['segments'][seg_info['seg_idx']]['en'] = ''
    
    # Step 3: Extract HTML paragraphs from all files
    html_pairs = []  # [(en, he_norm)]
    dirs = [LT1_DIR, LT2_DIR, LT_TEACHINGS_DIR]
    files_processed = 0
    
    for dir_path in dirs:
        if not os.path.exists(dir_path): continue
        for filename in sorted(os.listdir(dir_path)):
            if not filename.endswith('.html') or filename == 'index.html': continue
            with open(os.path.join(dir_path, filename), 'r') as f:
                html = f.read()
            pairs = extract_paired_paragraphs(html)
            for pair in pairs:
                html_pairs.append({
                    'en': pair['en'],
                    'he_norm': normalize(pair['he']),
                })
            files_processed += 1
    
    print(f'Extracted {len(html_pairs)} paragraphs from {files_processed} HTML files')
    
    # Step 4: Match each HTML paragraph to ALL JSON segments
    matched = 0
    for hp in html_pairs:
        if len(hp['he_norm']) < 5: continue
        
        for seg_info in all_segments:
            if len(seg_info['he_norm']) < 5: continue
            
            # Check if JSON Hebrew starts with same prefix as HTML Hebrew
            # OR if HTML Hebrew starts with same prefix as JSON Hebrew
            prefix_len = min(40, len(hp['he_norm']), len(seg_info['he_norm']))
            if prefix_len < 10: continue
            
            json_prefix = seg_info['he_norm'][:prefix_len]
            html_prefix = hp['he_norm'][:prefix_len]
            
            # Match if they share the same prefix
            if json_prefix == html_prefix:
                seg_info['data']['segments'][seg_info['seg_idx']]['en'] = hp['en']
                matched += 1
    
    print(f'Matched: {matched}')
    
    # Step 5: Write all JSON files
    written = set()
    for seg_info in all_segments:
        key = (seg_info['part_dir'], seg_info['num'])
        if key not in written:
            p = os.path.join(seg_info['part_dir'], f'prayer-{seg_info["num"]}.json')
            with open(p, 'w') as f:
                json.dump(seg_info['data'], f, indent=2, ensure_ascii=False)
            written.add(key)
    
    print(f'Written {len(written)} JSON files')
    
    # Step 6: Count results
    total_filled = 0
    total_empty = 0
    for seg_info in all_segments:
        if seg_info['data']['segments'][seg_info['seg_idx']].get('en', '').strip():
            total_filled += 1
        else:
            total_empty += 1
    
    print(f'\\nFilled: {total_filled}')
    print(f'Empty (content): {total_empty}')

if __name__ == '__main__':
    main()
