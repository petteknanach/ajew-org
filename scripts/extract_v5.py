#!/usr/bin/env python3
"""
LT English extraction - final correct version.
Builds HTML index by filename for single-prayer files, by heading for multi-prayer files.
Matches JSON segments to HTML paragraphs by Hebrew prefix within each prayer.
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
    h = h.replace('&#x05EA;', 'ת').replace('&#x05BC;', 'ּ').replace('&#x05E4;', 'פ')
    h = h.replace('&#x05B4;', 'ִ').replace('&#x05DC;', 'ל').replace('&#x05B8;', 'ָ')
    h = h.replace('&#x05D4;', 'ה')
    return re.sub(r'\s+', ' ', h).strip()

def extract_para_pairs(html_block):
    """Extract (en, he) pairs from HTML block, handling nested divs."""
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

def get_prayer_number_from_filename(f):
    """Extract prayer number from filename. Returns None if not found."""
    # Remove .html
    base = f.replace('.html', '')
    
    # Special patterns: "likutay_tefilos_I_10_purim" -> 10
    m = re.search(r'_I[_]?(\d+)_', base)
    if m:
        return int(m.group(1))
    m = re.search(r'_II[_]?(\d+)_', base)
    if m:
        return int(m.group(1))
    
    # Pattern: "prayer{N}" or "prayer_{N}" or "prayers{N}"
    m = re.search(r'prayers?[_]?(\d+)', base, re.I)
    if m:
        return int(m.group(1))
    
    # Pattern: "_{N}_" or "_{N}." - the first number in the filename
    # But be careful about range files like "32_33_34"
    nums = re.findall(r'\d+', base)
    if len(nums) == 1:
        return int(nums[0])
    
    return None

def is_range_file(f):
    """Check if filename represents a range of prayers."""
    base = f.replace('.html', '')
    # Multiple distinct numbers that look like a range
    nums = re.findall(r'\d+', base)
    if len(nums) >= 2:
        # Check if they look like a range (e.g., 32_33_34 or 104_107)
        int_nums = sorted(set(int(n) for n in nums))
        if len(int_nums) >= 2 and int_nums[-1] - int_nums[0] > 2:
            return True
        if len(int_nums) >= 3:
            return True
    return False

def build_html_index():
    """Build prayer_num -> list of (en, he) pairs."""
    prayer_data = {}
    
    for d in HTML_DIRS:
        if not os.path.exists(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html':
                continue
            filepath = os.path.join(d, f)
            html = open(filepath, 'r').read()
            
            if is_range_file(f):
                # Multi-prayer file - split at prayer-heading boundaries
                headings = list(re.finditer(r'<div\s+class="prayer-heading"', html, re.I))
                if len(headings) <= 1:
                    # Fallback: treat as single prayer
                    num = get_prayer_number_from_filename(f)
                    if num:
                        pairs = extract_para_pairs(html)
                        if pairs:
                            prayer_data[num] = pairs
                else:
                    for h_idx, h_match in enumerate(headings):
                        start = h_match.start()
                        if h_idx + 1 < len(headings):
                            end = headings[h_idx + 1].start()
                        else:
                            end = len(html)
                        block = html[start:end]
                        pairs = extract_para_pairs(block)
                        
                        # Extract number from heading text
                        heading_m = re.search(r'<div\s+class="prayer-heading"[^>]*>([\s\S]*?)</div>', block, re.I)
                        num = None
                        if heading_m:
                            heading_text = strip_html(heading_m.group(1))
                            # Try "Prayer 32" or "Prayer Thirty-Two"
                            num_m = re.search(r'Prayer\s+(\d+)', heading_text, re.I)
                            if num_m:
                                num = int(num_m.group(1))
                        
                        if num and pairs:
                            prayer_data[num] = pairs
            else:
                # Single prayer file - use filename
                num = get_prayer_number_from_filename(f)
                if num:
                    pairs = extract_para_pairs(html)
                    if pairs:
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
    
    # Debug: show missing
    all_needed = set(range(1, 153)) | set(range(1, 60))
    missing = all_needed - set(prayer_data.keys())
    if missing:
        print(f'Missing: {sorted(missing)[:20]}...')
    
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
            
            # Get content segment indices (non-date, non-short)
            content_indices = []
            for i, seg in enumerate(data['segments']):
                if not is_date_or_short(seg['he']):
                    content_indices.append(i)
                    total_content += 1
            
            # Clear English
            for i in content_indices:
                data['segments'][i]['en'] = ''
            
            # Match by Hebrew prefix within this prayer's HTML
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
    
    print(f'Prayers processed: {prayers_processed}')
    print(f'Total content segments: {total_content}')
    print(f'Total matched: {total_matched}')
    if total_content > 0:
        print(f'Coverage: {total_matched/total_content*100:.1f}%')

if __name__ == '__main__':
    main()
