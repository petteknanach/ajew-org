#!/usr/bin/env python3
"""
LT English extraction - positional matching approach.
For each prayer, extract HTML paragraphs in order, then match to JSON segments in order.
"""

import os
import re
import json

PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1'
PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2'

HTML_DIRS = [
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1',
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2',
    '/root/ajew-org/public/teachings/likutay-tefilos',
]

def strip_html(h):
    h = re.sub(r'<[^>]+>', '', h)
    h = h.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    h = h.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
    h = re.sub(r'\s+', ' ', h).strip()
    return h

def extract_para_pairs(html):
    """Extract (en, he) pairs from para divs, handling nested divs."""
    pairs = []
    i = 0
    while i < len(html):
        m = re.search(r'<div\s+class="para">', html[i:], re.I)
        if not m:
            break
        start = i + m.start()
        depth = 1
        pos = start + 18
        while depth > 0 and pos < len(html):
            n_open = html.find('<div', pos)
            n_close = html.find('</div>', pos)
            if n_close < 0:
                break
            if n_open >= 0 and n_open < n_close:
                depth += 1
                pos = n_open + 4
            else:
                depth -= 1
                if depth == 0:
                    block = html[start + 18:n_close]
                    en_m = re.search(r'<p>([\s\S]*?)</p>', block)
                    he_m = re.search(r'<div\s+class="heb-text"[^>]*>([\s\S]*?)</div>', block)
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

def extract_date_texts(html):
    """Extract Hebrew date texts from date-bar divs."""
    dates = []
    for m in re.finditer(r'<div\s+class="date-bar"[^>]*>([\s\S]*?)</div>', html):
        text = strip_html(m.group(1))
        # Extract just the Hebrew date part
        hebrew_parts = re.findall(r'[\u0590-\u05F3\u05C0-\u05FF\s]+', text)
        for part in hebrew_parts:
            part = part.strip()
            if len(part) > 3:
                dates.append(part)
                break
    return dates

def find_html_file(prayer_num, part):
    """Find the HTML file for a given prayer."""
    for d in HTML_DIRS:
        if not os.path.exists(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html':
                continue
            # Match patterns like: likutay_tefilos_30_prayer30.html
            # or prayer_30.html, etc.
            base = f.replace('.html', '')
            # Extract number from filename
            nums = re.findall(r'\d+', base)
            if str(prayer_num) in nums:
                # Check if it's the right part
                # Part 1: prayers 1-152, Part 2: prayers 1-59
                # The HTML files might have part indicators
                if part == 1:
                    # Check if file is in part 1 directory or has part 1 indicator
                    if 'part1' in base or 'part_1' in base or d == HTML_DIRS[0]:
                        return os.path.join(d, f)
                    # If in the main teachings dir, check by prayer number range
                    if d == HTML_DIRS[2] and prayer_num <= 152:
                        return os.path.join(d, f)
                elif part == 2:
                    if 'part2' in base or 'part_2' in base or d == HTML_DIRS[1]:
                        return os.path.join(d, f)
                    if d == HTML_DIRS[2] and prayer_num > 152:
                        return os.path.join(d, f)
    return None

def find_html_file_v2(prayer_num, part):
    """Better approach: scan all HTML files and find by prayer number."""
    for d in HTML_DIRS:
        if not os.path.exists(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html':
                continue
            filepath = os.path.join(d, f)
            html = open(filepath, 'r').read()
            # Check if this file contains the prayer-heading with this number
            if re.search(rf'prayer\s*{prayer_num}[\s\-]', f, re.I) or \
               re.search(rf'_{prayer_num}_', f) or \
               re.search(rf'prayer{prayer_num}', f, re.I):
                # Verify part
                if part == 1 and ('part2' in f.lower() or 'part_2' in f.lower()):
                    continue
                if part == 2 and ('part1' in f.lower() or 'part_1' in f.lower()):
                    continue
                return filepath
    return None

def normalize(s):
    return re.sub(r'\s+', '', s).strip()

def is_date_or_short(he):
    """Check if Hebrew text is a date marker or very short."""
    t = he.strip()
    if len(t) <= 3:
        return True
    # Pure Hebrew short text (likely a date or label)
    if len(t) <= 30 and bool(re.match(r'^[\u0590-\u05FF\s\d\u05F3"\']+$', t)):
        return True
    return False

def main():
    total_matched = 0
    total_segments = 0
    prayers_processed = 0
    
    for part_dir, part_num in [(PART1_DIR, 1), (PART2_DIR, 2)]:
        max_prayer = 152 if part_num == 1 else 59
        
        for prayer_num in range(1, max_prayer + 1):
            json_path = os.path.join(part_dir, f'prayer-{prayer_num}.json')
            if not os.path.exists(json_path):
                continue
            
            data = json.load(open(json_path, 'r'))
            
            # Find HTML file
            html_path = find_html_file_v2(prayer_num, part_num)
            if not html_path:
                continue
            
            html = open(html_path, 'r').read()
            para_pairs = extract_para_pairs(html)
            date_texts = extract_date_texts(html)
            
            if not para_pairs:
                continue
            
            # Get JSON segments that need English (non-date, non-short)
            content_indices = []
            for i, seg in enumerate(data['segments']):
                if not is_date_or_short(seg['he']):
                    content_indices.append(i)
                    total_segments += 1
            
            # Clear all English first
            for i in content_indices:
                data['segments'][i]['en'] = ''
            
            # Match by position: pair each content segment with corresponding HTML paragraph
            # Strategy: use Hebrew prefix matching but within the prayer's own HTML
            html_he_list = [normalize(p['he']) for p in para_pairs]
            
            matched_this_prayer = 0
            for idx in content_indices:
                seg_he = normalize(data['segments'][idx]['he'])
                if len(seg_he) <= 10:
                    continue
                
                # Find best matching HTML paragraph by Hebrew prefix
                best_match = -1
                best_score = 0
                for h_idx, html_he in enumerate(html_he_list):
                    if not html_he:
                        continue
                    # Check prefix match
                    prefix_len = min(50, len(seg_he), len(html_he))
                    if seg_he[:prefix_len] == html_he[:prefix_len]:
                        if prefix_len > best_score:
                            best_score = prefix_len
                            best_match = h_idx
                    # Also check if HTML Hebrew starts with JSON Hebrew (HTML is longer)
                    elif len(html_he) > len(seg_he):
                        if html_he[:len(seg_he)] == seg_he:
                            if len(seg_he) > best_score:
                                best_score = len(seg_he)
                                best_match = h_idx
                
                if best_match >= 0:
                    data['segments'][idx]['en'] = para_pairs[best_match]['en']
                    matched_this_prayer += 1
                    total_matched += 1
            
            # Write back
            json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
            prayers_processed += 1
    
    print(f'Prayers processed: {prayers_processed}')
    print(f'Total content segments: {total_segments}')
    print(f'Total matched: {total_matched}')
    print(f'Coverage: {total_matched/total_segments*100:.1f}%' if total_segments > 0 else 'N/A')

if __name__ == '__main__':
    main()
