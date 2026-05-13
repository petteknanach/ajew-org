#!/usr/bin/env python3
"""
LT English extraction - clean working version.
Extract Hebrew-English pairs from HTML, match to JSON by Hebrew prefix.
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

def is_date_marker(he):
    t = he.strip()
    return len(t) <= 30 and bool(re.match(r'^[\u0590-\u05FF\s\d\u05F3]+$', t))

def normalize(s):
    return re.sub(r'\s+', '', s).strip()

def extract_pairs_from_html(html):
    """Extract (en, he) pairs from HTML, handling nested divs."""
    pairs = []
    i = 0
    while i < len(html):
        # Find next para div
        m = re.search(r'<div\s+class="para">', html[i:], re.I)
        if not m:
            break
        start = i + m.start()
        
        # Find matching close by counting div depth
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
                            pairs.append((en, he))
                    i = n_close + 6
                    break
                pos = n_close + 6
        else:
            i = pos
    return pairs

def main():
    # Step 1: Collect all HTML paragraphs with their Hebrew
    all_html = []  # [(en, he_normalized)]
    for d in HTML_DIRS:
        if not os.path.exists(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html':
                continue
            html = open(os.path.join(d, f), 'r').read()
            for en, he in extract_pairs_from_html(html):
                he_norm = normalize(he)
                if len(he_norm) > 10:
                    all_html.append((en, he_norm))
    
    print(f'Extracted {len(all_html)} HTML paragraphs')
    
    # Step 2: Load all JSON segments
    all_segs = []  # [(part_dir, num, seg_idx, he_norm, data_ref)]
    for part_dir in [PART1_DIR, PART2_DIR]:
        for num in range(1, 152 if part_dir == PART1_DIR else 60):
            p = os.path.join(part_dir, f'prayer-{num}.json')
            if not os.path.exists(p):
                continue
            data = json.load(open(p, 'r'))
            for i, seg in enumerate(data['segments']):
                if not is_date_marker(seg['he']):
                    he_norm = normalize(seg['he'])
                    if len(he_norm) > 10:
                        all_segs.append((part_dir, num, i, he_norm, data))
    
    print(f'Loaded {len(all_segs)} JSON content segments')
    
    # Step 3: Clear all English
    for part_dir, num, i, he_norm, data in all_segs:
        data['segments'][i]['en'] = ''
    
    # Step 4: Match - for each JSON segment, find HTML paragraph with matching Hebrew prefix
    matched = 0
    for sd in all_segs:
        part_dir, num, seg_idx, json_he_norm, data = sd
        for en, html_he_norm in all_html:
            prefix_len = min(40, len(json_he_norm), len(html_he_norm))
            if json_he_norm[:prefix_len] == html_he_norm[:prefix_len]:
                data['segments'][seg_idx]['en'] = en
                matched += 1
                break
    
    print(f'Matched: {matched}')
    
    # Step 5: Write all JSON files
    written = set()
    for part_dir, num, i, he_norm, data in all_segs:
        key = (part_dir, num)
        if key not in written:
            p = os.path.join(part_dir, f'prayer-{num}.json')
            json.dump(data, open(p, 'w'), indent=2, ensure_ascii=False)
            written.add(key)
    
    # Step 6: Count
    filled = sum(1 for sd in all_segs if sd[4]['segments'][sd[2]].get('en', '').strip())
    print(f'Filled: {filled}/{len(all_segs)}')

if __name__ == '__main__':
    main()
