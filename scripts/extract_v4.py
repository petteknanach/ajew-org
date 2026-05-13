#!/usr/bin/env python3
"""
LT English extraction - final version.
Properly handles multi-prayer HTML files by splitting at prayer-heading boundaries.
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
    return re.sub(r'\s+', ' ', h).strip()

def extract_para_pairs(html_block):
    """Extract (en, he) pairs from a block of HTML."""
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

def extract_prayer_number_from_heading(html_block):
    """Extract the prayer number from a prayer-heading block."""
    m = re.search(r'<div\s+class="prayer-heading"[^>]*>([\s\S]*?)</div>', html_block, re.I)
    if not m:
        return None
    text = strip_html(m.group(1))
    # Look for patterns like "Prayer 32", "Prayer Thirty-Two", "תפילה לב'"
    num = re.search(r'Prayer\s+(\d+)', text, re.I)
    if num:
        return int(num.group(1))
    # Try Hebrew numerals
    hebrew_num = re.search(r'תְּפִלָּה\s+([\u0590-\u05F3]+)', text)
    if hebrew_num:
        # Map Hebrew numerals to numbers
        hn = hebrew_num.group(1).strip()
        # Simple mapping for common ones
        heb_map = {
            'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
            'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16, 'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20,
            'כא': 21, 'כב': 22, 'כג': 23, 'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
            'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36, 'לז': 37, 'לח': 38, 'לט': 39, 'מ': 40,
        }
        if hn in heb_map:
            return heb_map[hn]
    return None

def build_html_index():
    """Build prayer_num -> list of (en, he) pairs index."""
    prayer_data = {}
    
    for d in HTML_DIRS:
        if not os.path.exists(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html':
                continue
            filepath = os.path.join(d, f)
            html = open(filepath, 'r').read()
            
            # Find all prayer-heading positions
            headings = list(re.finditer(r'<div\s+class="prayer-heading"', html, re.I))
            
            if len(headings) == 0:
                # No headings - skip (probably index or non-prayer file)
                continue
            elif len(headings) == 1:
                # Single prayer file
                pairs = extract_para_pairs(html)
                num = extract_prayer_number_from_heading(html)
                if num and pairs:
                    prayer_data[num] = pairs
            else:
                # Multi-prayer file - split at heading boundaries
                for h_idx, h_match in enumerate(headings):
                    start = h_match.start()
                    if h_idx + 1 < len(headings):
                        end = headings[h_idx + 1].start()
                    else:
                        end = len(html)
                    block = html[start:end]
                    pairs = extract_para_pairs(block)
                    num = extract_prayer_number_from_heading(block)
                    if num and pairs:
                        prayer_data[num] = pairs
    
    return prayer_data

def normalize(s):
    return re.sub(r'\s+', '', s).strip()

def is_date_or_short(he):
    t = he.strip()
    if len(t) <= 3:
        return True
    if len(t) <= 30 and bool(re.match(r'^[\u0590-\u05FF\s\d\u05F3"\']+$', t)):
        return True
    return False

def main():
    print('Building HTML index...')
    prayer_data = build_html_index()
    print(f'Indexed {len(prayer_data)} prayers from HTML')
    
    # Debug: show which prayers are indexed
    missing = []
    for part_dir in [PART1_DIR, PART2_DIR]:
        max_num = 152 if part_dir == PART1_DIR else 59
        for n in range(1, max_num + 1):
            if n not in prayer_data:
                missing.append((part_dir[-1], n))
    
    if missing:
        print(f'Missing from index: {len(missing)} prayers')
        # Show ranges
        by_part = {}
        for part, n in missing:
            by_part.setdefault(part, []).append(n)
        for part, nums in sorted(by_part.items()):
            print(f'  Part {part}: {nums[:20]}...')
    
    total_matched = 0
    total_content = 0
    prayers_processed = 0
    
    for part_dir in [PART1_DIR, PART2_DIR]:
        max_num = 152 if part_dir == PART1_DIR else 59
        
        for prayer_num in range(1, max_num + 1):
            json_path = os.path.join(part_dir, f'prayer-{prayer_num}.json')
            if not os.path.exists(json_path):
                continue
            
            data = json.load(open(json_path, 'r'))
            
            if prayer_num not in prayer_data:
                continue
            
            para_pairs = prayer_data[prayer_num]
            if not para_pairs:
                continue
            
            # Get content segment indices
            content_indices = []
            for i, seg in enumerate(data['segments']):
                if not is_date_or_short(seg['he']):
                    content_indices.append(i)
                    total_content += 1
            
            # Clear English
            for i in content_indices:
                data['segments'][i]['en'] = ''
            
            # Match by Hebrew prefix
            html_he_list = [normalize(p['he']) for p in para_pairs]
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
                    if seg_he[:prefix_len] == html_he[:prefix_len]:
                        if prefix_len > best_score:
                            best_score = prefix_len
                            best_match = h_idx
                
                if best_match >= 0:
                    data['segments'][idx]['en'] = para_pairs[best_match]['en']
                    used_html.add(best_match)
                    total_matched += 1
            
            json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
            prayers_processed += 1
    
    print(f'\\nPrayers processed: {prayers_processed}')
    print(f'Total content segments: {total_content}')
    print(f'Total matched: {total_matched}')
    if total_content > 0:
        print(f'Coverage: {total_matched/total_content*100:.1f}%')

if __name__ == '__main__':
    main()
