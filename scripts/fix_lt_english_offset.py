#!/usr/bin/env python3
"""
Fix LT English translations by matching JSON prayer N to HTML prayer N+1.
The JSON prayer numbering is offset by +1 from the HTML source.
"""

import os
import re
import json
import html as htmlmod
import unicodedata

PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1'
PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2'

HTML_DIRS = [
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2',
    '/root/ajew-org/public/teachings/likutay-tefilos',
]

def normalize(s):
    s = unicodedata.normalize('NFKD', s)
    return re.sub(r'\s+', '', s).strip()

def words_to_num(text):
    words = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
        'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
        'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
        'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
        'hundred': 100,
    }
    text = text.lower().replace('-', ' ').replace(' and ', ' ')
    parts = text.split()
    total = 0
    current = 0
    for word in parts:
        if word in words:
            val = words[word]
            if val == 100:
                current = max(current, 1) * 100
            else:
                current += val
    total += current
    return total if total > 0 else None

def strip_html(h):
    h = re.sub(r'<[^>]+>', '', h)
    h = htmlmod.unescape(h)
    return re.sub(r'\s+', ' ', h).strip()

def extract_para_pairs(html_block):
    """Extract (en, he) pairs from HTML block."""
    pairs = []
    i = 0
    while i < len(html_block):
        m = re.search(r'<div\s+class="para">', html_block[i:], re.I)
        if not m:
            break
        start = i + m.start()
        depth = 1
        pos = start + 18
        while depth > 0 and pos < len(html_block):
            n_open = html_block.find('<div', pos)
            n_close = html_block.find('</div>', pos)
            if n_close < 0:
                break
            if n_open >= 0 and n_open < n_close:
                depth += 1
                pos = n_open + 4
            else:
                depth -= 1
                if depth == 0:
                    block = html_block[start + 18:n_close]
                    en_m = re.search(r'<p>([\s\S]*?)</p>', block)
                    he_m = re.search(r'<div\s+[^>]*class="heb-text"[^>]*>([\s\S]*?)</div>', block)
                    if en_m:
                        en = strip_html(en_m.group(1))
                        en = re.sub(r'^[\u0590-\u05FF\s▾]+', '', en).strip()
                        he = strip_html(he_m.group(1)) if he_m else ''
                        if len(en) > 10:
                            pairs.append({'en': en, 'he': he})
                    i = n_close + 6
                    break
                pos = n_close + 6
        else:
            i = pos
    return pairs

def build_html_index():
    """Build prayer_num -> list of (en, he) pairs from HTML files."""
    prayer_data = {}
    
    for d in HTML_DIRS:
        if not os.path.exists(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html':
                continue
            filepath = os.path.join(d, f)
            html = open(filepath, 'r').read()
            
            # Find all prayer headings
            headings = list(re.finditer(r'<div\s+class="prayer-heading"', html, re.I))
            
            for h_idx, h_match in enumerate(headings):
                # Extract prayer number from heading
                end = html.find('</div>', h_match.start())
                m = re.search(r'<div\s+class="prayer-heading"[^>]*>([\s\S]*?)</div>', 
                            html[h_match.start():end+6], re.I)
                if not m:
                    continue
                text = strip_html(m.group(1))
                
                # Extract number from 'Prayer N' or 'Prayer One Hundred' etc.
                num_match = re.search(r'Prayer\s+(.+)', text, re.I)
                if not num_match:
                    continue
                pnum = words_to_num(num_match.group(1))
                if not pnum:
                    continue
                
                # Get block
                start = h_match.start()
                if h_idx + 1 < len(headings):
                    end = headings[h_idx + 1].start()
                else:
                    end = len(html)
                block = html[start:end]
                
                pairs = extract_para_pairs(block)
                if pairs:
                    prayer_data[pnum] = pairs
    
    return prayer_data

def is_date_or_short(he):
    t = he.strip()
    if len(t) <= 3:
        return True
    if len(t) <= 30 and bool(re.match(r'^[\u0590-\u05FF\s\d\u05F3]+$', t)):
        return True
    return False

def main():
    print('Building HTML index (with word number parsing)...')
    html_data = build_html_index()
    print(f'Indexed {len(html_data)} prayers from HTML')
    print(f'HTML prayer numbers: {sorted(html_data.keys())[:20]}...')
    
    # Process part 1 - match JSON prayer N to HTML prayer N+1
    print('\nProcessing Part 1 (JSON N -> HTML N+1)...')
    total_matched = 0
    total_content = 0
    
    for prayer_num in range(1, 153):
        json_path = os.path.join(PART1_DIR, f'prayer-{prayer_num}.json')
        if not os.path.exists(json_path):
            continue
        
        data = json.load(open(json_path, 'r'))
        
        # Try direct match first (HTML prayer N)
        html_paras = html_data.get(prayer_num, [])
        
        # Try shifted match (HTML prayer N+1)
        if not html_paras:
            html_paras = html_data.get(prayer_num + 1, [])
        
        if not html_paras:
            continue
        
        content_indices = []
        for i, seg in enumerate(data['segments']):
            if not is_date_or_short(seg['he']):
                content_indices.append(i)
                total_content += 1
        
        # Clear English
        for i in content_indices:
            data['segments'][i]['en'] = ''
        
        # Match by Hebrew prefix
        html_he_list = [normalize(p['he']) for p in html_paras]
        used_html = set()
        
        for idx in content_indices:
            seg_he = normalize(data['segments'][idx]['he'])
            if len(seg_he) <= 10:
                continue
            
            best_match = -1
            best_score = 0
            for h_idx, html_he in enumerate(html_he_list):
                if h_idx in used_html:
                    continue
                if not html_he:
                    continue
                prefix_len = min(50, len(seg_he), len(html_he))
                if seg_he[:prefix_len] == html_he[:prefix_len] and prefix_len > best_score:
                    best_score = prefix_len
                    best_match = h_idx
            
            if best_match >= 0:
                data['segments'][idx]['en'] = html_paras[best_match]['en']
                used_html.add(best_match)
                total_matched += 1
        
        json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
    
    print(f'Part 1: {total_matched}/{total_content} segments matched')
    
    # Count remaining empty
    empty = 0
    for prayer_num in range(1, 153):
        json_path = os.path.join(PART1_DIR, f'prayer-{prayer_num}.json')
        if not os.path.exists(json_path):
            continue
        data = json.load(open(json_path, 'r'))
        for seg in data['segments']:
            if is_date_or_short(seg['he']):
                continue
            if not seg.get('en', '').strip():
                empty += 1
    print(f'Part 1 remaining empty: {empty}')
    
    # Process part 2 similarly
    print('\nProcessing Part 2...')
    part2_matched = 0
    part2_content = 0
    
    for prayer_num in range(1, 60):
        json_path = os.path.join(PART2_DIR, f'prayer-{prayer_num}.json')
        if not os.path.exists(json_path):
            continue
        
        data = json.load(open(json_path, 'r'))
        html_paras = html_data.get(prayer_num, [])
        if not html_paras:
            html_paras = html_data.get(prayer_num + 1, [])
        
        if not html_paras:
            continue
        
        content_indices = []
        for i, seg in enumerate(data['segments']):
            if not is_date_or_short(seg['he']):
                content_indices.append(i)
                part2_content += 1
        
        for i in content_indices:
            data['segments'][i]['en'] = ''
        
        html_he_list = [normalize(p['he']) for p in html_paras]
        used_html = set()
        
        for idx in content_indices:
            seg_he = normalize(data['segments'][idx]['he'])
            if len(seg_he) <= 10:
                continue
            
            best_match = -1
            best_score = 0
            for h_idx, html_he in enumerate(html_he_list):
                if h_idx in used_html:
                    continue
                if not html_he:
                    continue
                prefix_len = min(50, len(seg_he), len(html_he))
                if seg_he[:prefix_len] == html_he[:prefix_len] and prefix_len > best_score:
                    best_score = prefix_len
                    best_match = h_idx
            
            if best_match >= 0:
                data['segments'][idx]['en'] = html_paras[best_match]['en']
                used_html.add(best_match)
                part2_matched += 1
        
        json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
    
    print(f'Part 2: {part2_matched}/{part2_content} segments matched')
    
    # Count remaining empty in part 2
    empty2 = 0
    for prayer_num in range(1, 60):
        json_path = os.path.join(PART2_DIR, f'prayer-{prayer_num}.json')
        if not os.path.exists(json_path):
            continue
        data = json.load(open(json_path, 'r'))
        for seg in data['segments']:
            if is_date_or_short(seg['he']):
                continue
            if not seg.get('en', '').strip():
                empty2 += 1
    print(f'Part 2 remaining empty: {empty2}')
    
    total_all = total_matched + part2_matched
    content_all = total_content + part2_content
    print(f'\nTotal: {total_all}/{content_all} ({total_all/content_all*100:.1f}%)' if content_all else '')

if __name__ == '__main__':
    main()
