#!/usr/bin/env python3
"""
Fix LT English translations - only fill missing, don't overwrite existing.
Uses HTML source with offset matching (JSON prayer N -> HTML prayer N+1).
"""

import os, re, json, html as htmlmod, unicodedata

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
    words = {'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,
             'eleven':11,'twelve':12,'thirteen':13,'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,
             'eighteen':18,'nineteen':19,'twenty':20,'thirty':30,'forty':40,'fifty':50,'sixty':60,
             'seventy':70,'eighty':80,'ninety':90,'hundred':100}
    text = text.lower().replace('-', ' ').replace(' and ', ' ')
    total = current = 0
    for w in text.split():
        if w in words:
            v = words[w]
            current = max(current, 1) * v if v == 100 else current + v
    return total if total > 0 else None

def strip_html(h):
    h = re.sub(r'<[^>]+>', '', h)
    return re.sub(r'\s+', ' ', htmlmod.unescape(h)).strip()

def get_prayer_num_from_filename(f):
    m = re.search(r'prayer[_]?(\d+)', f, re.I)
    if m: return int(m.group(1))
    m = re.search(r'_(\d+)_', f)
    if m: return int(m.group(1))
    return None

def extract_para_pairs(html_block):
    pairs = []
    i = 0
    while i < len(html_block):
        m = re.search(r'<div\s+class="para">', html_block[i:], re.I)
        if not m: break
        start = i + m.start(); depth = 1; pos = start + 18
        while depth > 0 and pos < len(html_block):
            no = html_block.find('<div', pos); nc = html_block.find('</div>', pos)
            if nc < 0: break
            if no >= 0 and no < nc: depth += 1; pos = no + 4
            else:
                depth -= 1
                if depth == 0:
                    block = html_block[start+18:nc]
                    en_m = re.search(r'<p>([\s\S]*?)</p>', block)
                    he_m = re.search(r'<div\s+[^>]*class="heb-text"[^>]*>([\s\S]*?)</div>', block)
                    if en_m:
                        en = strip_html(en_m.group(1))
                        en = re.sub(r'^[\u0590-\u05FF\s▾]+', '', en).strip()
                        he = strip_html(he_m.group(1)) if he_m else ''
                        if len(en) > 10: pairs.append({'en': en, 'he': he})
                    i = nc + 6; break
                pos = nc + 6
        else: i = pos
    return pairs

def build_html_index():
    prayer_data = {}
    for d in HTML_DIRS:
        if not os.path.exists(d): continue
        for f in sorted(os.listdir(d)):
            if not f.endswith('.html') or f == 'index.html': continue
            html = open(os.path.join(d, f)).read()
            headings = list(re.finditer(r'<div\s+class="prayer-heading"', html, re.I))
            for h_idx, h_match in enumerate(headings):
                end = html.find('</div>', h_match.start())
                m = re.search(r'<div\s+class="prayer-heading"[^>]*>([\s\S]*?)</div>',
                            html[h_match.start():end+6], re.I)
                if not m: continue
                text = strip_html(m.group(1))
                pnum = None
                nm = re.search(r'Prayer\s+(.+)', text, re.I)
                if nm: pnum = words_to_num(nm.group(1))
                if not pnum: pnum = get_prayer_num_from_filename(f)
                if not pnum: continue
                start = h_match.start()
                end = headings[h_idx+1].start() if h_idx+1 < len(headings) else len(html)
                pairs = extract_para_pairs(html[start:end])
                if pairs: prayer_data[pnum] = pairs
    return prayer_data

def is_date_or_short(he):
    t = he.strip()
    return len(t) <= 3 or (len(t) <= 30 and bool(re.match(r'^[\u0590-\u05FF\s\d\u05F3]+$', t)))

def process_part(part_dir, html_data, max_num):
    matched = 0
    for prayer_num in range(1, max_num + 1):
        json_path = os.path.join(part_dir, f'prayer-{prayer_num}.json')
        if not os.path.exists(json_path): continue
        data = json.load(open(json_path, 'r'))
        
        # Find segments that need English
        empty_indices = [i for i, seg in enumerate(data['segments'])
                        if not is_date_or_short(seg['he']) and not seg.get('en', '').strip()]
        if not empty_indices: continue
        
        # Try HTML prayer N first, then N+1
        html_paras = html_data.get(prayer_num, []) or html_data.get(prayer_num + 1, [])
        if not html_paras: continue
        
        html_he_list = [normalize(p['he']) for p in html_paras]
        used_html = set()
        
        for idx in empty_indices:
            seg_he = normalize(data['segments'][idx]['he'])
            if len(seg_he) <= 10: continue
            best = -1; best_score = 0
            for h_idx, html_he in enumerate(html_he_list):
                if h_idx in used_html or not html_he: continue
                pl = min(50, len(seg_he), len(html_he))
                if seg_he[:pl] == html_he[:pl] and pl > best_score:
                    best_score = pl; best = h_idx
            if best >= 0:
                data['segments'][idx]['en'] = html_paras[best]['en']
                used_html.add(best)
                matched += 1
        
        json.dump(data, open(json_path, 'w'), indent=2, ensure_ascii=False)
    return matched

def main():
    print('Building HTML index...')
    html_data = build_html_index()
    print(f'Indexed {len(html_data)} prayers')
    
    print('Processing Part 1...')
    m1 = process_part(PART1_DIR, html_data, 152)
    print(f'Matched: {m1}')
    
    print('Processing Part 2...')
    m2 = process_part(PART2_DIR, html_data, 59)
    print(f'Matched: {m2}')
    
    # Count remaining empty
    empty = 0
    for d in [PART1_DIR, PART2_DIR]:
        for f in os.listdir(d):
            if not f.startswith('prayer-') or not f.endswith('.json'): continue
            data = json.load(open(os.path.join(d, f)))
            for seg in data['segments']:
                if not is_date_or_short(seg['he']) and not seg.get('en', '').strip():
                    empty += 1
    print(f'Remaining empty: {empty}')

if __name__ == '__main__':
    main()
