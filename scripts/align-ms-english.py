#!/usr/bin/env python3
"""Align Michtevay Shmuel English from Finished HTML to JSON segments.
Matches HTML sections (§N) to JSON segments by index."""

import os, re, json

FINISHED = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/'
MS_DIRS = ['Michtevay Shmuel 1 - 1-16', 'Michtevay Shmuel 1 - 17-', 'Michtevay Shmuel 2']
JSON_DIR = '/root/ajew-org/public/reader/michtevay-shmuel/'

def extract_sections(html):
    """Extract {section_number: english_text} from HTML."""
    sections = {}
    body_m = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
    body = body_m.group(1) if body_m else html
    
    # Find all section divs
    sec_divs = re.findall(
        r'<div class="section">\s*<div class="sec-num">.*?(\d+).*?</div>\s*<div class="sec-body">(.*?)</div>\s*</div>',
        body, re.DOTALL
    )
    
    for num_str, body_text in sec_divs:
        num = int(num_str)
        clean = re.sub(r'<br\s*/?>', '\n', body_text)
        clean = re.sub(r'<[^>]+>', '', clean)
        clean = re.sub(r'&mdash;', '—', clean)
        clean = re.sub(r'&nbsp;', ' ', clean)
        clean = re.sub(r'&amp;', '&', clean)
        clean = re.sub(r'&lt;', '<', clean)
        clean = re.sub(r'&gt;', '>', clean)
        clean = re.sub(r'\s+', ' ', clean).strip()
        if clean:
            sections[num] = clean
    
    return sections

def extract_letter_number(filename):
    """Extract letter number from filename like 'letter-N.json'."""
    m = re.match(r'letter-(\d+)\.json', filename)
    return int(m.group(1)) if m else None

# Load all HTML English data
print("=== Loading Michtevay Shmuel HTML ===")
all_letters = {}
for ms_dir in MS_DIRS:
    path = os.path.join(FINISHED, ms_dir)
    if not os.path.isdir(path): continue
    for f in sorted(os.listdir(path)):
        if not f.endswith('.html'): continue
        with open(os.path.join(path, f), 'r', encoding='utf-8', errors='replace') as fh:
            html = fh.read()
        
        # Try to extract letter number from HTML title/content
        letter_m = re.search(r'Letter\s+(\d+)', html)
        if not letter_m:
            # Try Hebrew letter mapping
            heb_m = re.search(r'(?:Letter|מכתב)\s+(\w+)', html)
            if heb_m:
                heb = {'aleph':1,'beis':2,'gimmel':3,'dalet':4,'heh':5,'vav':6,'zayin':7}
                num = heb.get(heb_m.group(1).lower())
            else:
                continue
        else:
            num = int(letter_m.group(1))
        
        sections = extract_sections(html)
        if sections:
            all_letters[num] = sections
            print(f'  Letter {num}: {len(sections)} sections')

print(f'\nTotal letters with English: {len(all_letters)}')

# Process JSON files
print("\n=== Aligning JSON ===")
updated = 0
en_added = 0

for part_name in sorted(os.listdir(JSON_DIR)):
    if not part_name.startswith('part-') or not os.path.isdir(os.path.join(JSON_DIR, part_name)):
        continue
    
    part_dir = os.path.join(JSON_DIR, part_name)
    for json_f in sorted(os.listdir(part_dir)):
        if not json_f.startswith('letter-') or not json_f.endswith('.json'):
            continue
        
        letter_num = int(re.match(r'letter-(\d+)', json_f).group(1))
        if letter_num not in all_letters:
            continue
        
        fp = os.path.join(part_dir, json_f)
        with open(fp, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        sections = all_letters[letter_num]
        segs = data.get('segments', [])
        segs_updated = 0
        
        for seg in segs:
            idx = seg.get('index', 0)
            if idx in sections:
                new_en = sections[idx]
                old_en = seg.get('en', '') or ''
                if new_en != old_en:
                    seg['en'] = new_en
                    segs_updated += 1
                    en_added += 1
        
        if segs_updated > 0:
            data['hasEnglish'] = True
            with open(fp, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            updated += 1
            print(f'  FIXED letter-{letter_num}: {segs_updated} sections')

print(f'\nDone: {updated} letters updated, {en_added} English segments added')
