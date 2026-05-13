#!/usr/bin/env python3
"""
LT English extraction - v14.
Only assign English when there's a real Hebrew match.
Segments without matching HTML paragraph are left empty (not force-assigned).
"""

import os
import re
import json
import html as htmlmod
import unicodedata

PART1_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-1'
PART2_DIR = '/root/ajew-org/public/reader/likutay-tefilos/part-2'

PART1_HTML_DIRS = [
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1',
    '/root/ajew-org/public/teachings/likutay-tefilos',
]
PART2_HTML_DIRS = [
    '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2',
]

NUM_WORDS = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000,
}

def words_to_num(text):
    words = text.lower().replace('-', ' ').split()
    words = [w for w in words if w != 'and']
    current = 0
    for word in words:
        if word in NUM_WORDS:
            val = NUM_WORDS[word]
            if val >= 100:
                current = max(current, 1) * val
            else:
                current += val
    return current if current > 0 else None

def strip_html(h):
    h = re.sub(r'<[^>]+>', '', h)
    h = htmlmod.unescape(h)
    return re.sub(r'\s+', ' ', h).strip()

def normalize_compare(s):
    s = unicodedata.normalize('NFKD', s)
    return re.sub(r'\s+', '', s).strip()

def extract_para_pairs(html_block):
    pairs = []
    i = 0
    while i < len(html_block):
        m = re.search(r'<div\s+class="para">', html_block[i:], re.I)
        if not m: break
        start = i + m.start()
        depth = 1; pos = start + 18
        while depth > 0 and pos < len(html_block):
            n_open = html_block.find('<div', pos)
            n_close = html_block.find('</div>', pos)
            if n_close < 0: break
            if n_open >= 0 and n_open < n_close:
                depth += 1; pos = n_open + 4
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
                    i = n_close + 6; break
                pos = n_close + 6
        else: i = pos
    return pairs

def get_prayer_nums_from_heading(block):
    m = re.search(r'<div\s+class="prayer-heading"[^>]*>([\s\S]*?)</div>', block, re.I)
    if not m: return []
    text = strip_html(m.group(1))
    ampersand_m = re.search(r'Prayers?\s+(.+?)\s*&\s*(.+)', text, re.I)
    if ampersand_m:
        n1 = words_to_num(ampersand_m.group(1).strip())
        n2 = words_to_num(ampersand_m.group(2).strip())
        if n1 and n2: return list(range(n1, n2 + 1))
    range_m = re.search(r'Prayers?\s+(\d+)\s*[-–]\s*(\d+)', text, re.I)
    if range_m: return list(range(int(range_m.group(1)), int(range_m.group(2)) + 1))
    num_m = re.search(r'Prayer\s+(\d+)', text, re.I)
    if num_m: return [int(num_m.group(1))]
    word_m = re.search(r'Prayer\s+(.+)', text, re.I)
    if word_m:
        eng = re.split(r'[·•]', word_m.group(1).strip())[0].strip()
        num = words_to_num(eng)
        if num: return [num]
    return []

def get_prayer_num_from_filename(f):
    base = f.replace('.html', '').replace(' (1)', '')
    for pat in [r'_I[_]?(\d+)_', r'_II[_]?(\d+)_', r'prayers?[_]?(\d+)']:
        m = re.search(pat, base, re.I)
        if m: return int(m.group(1))
    nums = re.findall(r'\d+', base)
    if len(nums) == 1: return int(nums[0])
    return None

def build_html_index(html_dirs):
    prayer_data = {}
    for d in html_dirs:
        if not os.path.exists(d): continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html': continue
            html = open(os.path.join(d, f)).read()
            headings = list(re.finditer(r'<div\s+class="prayer-heading"', html, re.I))
            if len(headings) == 0: continue
            elif len(headings) == 1:
                pairs = extract_para_pairs(html)
                if not pairs: continue
                nums = get_prayer_nums_from_heading(html)
                if not nums:
                    num = get_prayer_num_from_filename(f)
                    if num: nums = [num]
                for num in nums:
                    if num > 0: prayer_data[num] = pairs
            else:
                for h_idx, h_match in enumerate(headings):
                    start = h_match.start()
                    end = headings[h_idx + 1].start() if h_idx + 1 < len(headings) else len(html)
                    block = html[start:end]
                    pairs = extract_para_pairs(block)
                    if not pairs: continue
                    for num in get_prayer_nums_from_heading(block):
                        if num > 0: prayer_data[num] = pairs
    return prayer_data

def is_date_or_short(he):
    t = he.strip()
    if len(t) <= 3: return True
    if len(t) <= 30 and bool(re.match(r'^[\u0590-\u05FF\uFB00-\uFB4F\s\d\u05F3"\']+$', t)): return True
    return False

def process_part(part_dir, html_data, max_num):
    total_matched = 0
    total_content = 0
    
    for prayer_num in range(1, max_num + 1):
        json_path = os.path.join(part_dir, f'prayer-{prayer_num}.json')
        if not os.path.exists(json_path): continue
        
        data = json.load(open(json_path, 'r'))
        if prayer_num not in html_data: continue
        
        para_pairs = html_data[prayer_num]
        if not para_pairs: continue
        
        content_indices = []
        for i, seg in enumerate(data['segments']):
            if not is_date_or_short(seg['he']):
                content_indices.append(i)
                total_content += 1
        
        # Clear English
        for i in content_indices:
            data['segments'][i]['en'] = ''
        
        # Normalize HTML Hebrew
        html_he_list = [normalize_compare(p['he']) for p in para_pairs]
        
        # Match by Hebrew prefix ONLY - no force assignment
        used_html = set()
        
        for idx in content_indices:
            seg_he = normalize_compare(data['segments'][idx]['he'])
            if len(seg_he) <= 10: continue
            
            best_match = -1
            best_score = 0
            for h_idx, html_he in enumerate(html_he_list):
                if h_idx in used_html: continue
                if not html_he: continue
                prefix_len = min(50, len(seg_he), len(html_he))
                if seg_he[:prefix_len] == html_he[:prefix_len] and prefix_len > best_score:
                    best_score = prefix_len
                    best_match = h_idx
            
            if best_match >= 0:
                data['segments'][idx]['en'] = para_pairs[best_match]['en']
                used_html.add(best_match)
                total_matched += 1
        
        json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
    
    return total_matched, total_content

def main():
    print('Building HTML indexes...')
    part1_data = build_html_index(PART1_HTML_DIRS)
    part2_data = build_html_index(PART2_HTML_DIRS)
    print(f'  Part 1: {len(part1_data)} prayers, Part 2: {len(part2_data)} prayers')
    
    print('Processing part 1...')
    m1, c1 = process_part(PART1_DIR, part1_data, 152)
    print(f'  {m1}/{c1} ({m1/c1*100:.1f}%)' if c1 else '  No segments')
    
    print('Processing part 2...')
    m2, c2 = process_part(PART2_DIR, part2_data, 59)
    print(f'  {m2}/{c2} ({m2/c2*100:.1f}%)' if c2 else '  No segments')
    
    total_m, total_c = m1 + m2, c1 + c2
    print(f'\nTotal: {total_m}/{total_c} ({total_m/total_c*100:.1f}%)' if total_c else '')
    
    # Report unmatched
    unmatched = 0
    for part_dir in [PART1_DIR, PART2_DIR]:
        for f in sorted(os.listdir(part_dir)):
            if not f.startswith('prayer-') or not f.endswith('.json'): continue
            data = json.load(open(os.path.join(part_dir, f)))
            if 'segments' not in data: continue
            for seg in data['segments']:
                if is_date_or_short(seg['he']): continue
                if not seg.get('en', '').strip():
                    unmatched += 1
    print(f'Unmatched (no HTML source): {unmatched}')

if __name__ == '__main__':
    main()
