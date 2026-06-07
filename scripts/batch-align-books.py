#!/usr/bin/env python3
"""Batch-align English from Finished HTML to JSON for multiple books.
Matches paragraphs sequentially: HTML English → JSON segments missing EN."""

import os, re, json, glob

FINISHED = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/'
READER = '/root/ajew-org/public/reader/'

BOOKS = [
    # (finished_folder, reader_id, file_pattern)
    ('Zimras HaAretz', 'zimras-haaretz', 'section-*.json'),
    ('Nachas Hashulchan', 'nachas-hashulchan', 'section-*.json'),
    ('Koachvay Or', 'kokhvei-or', 'section-*.json'),
    ('Kuntrass Hatzairufim', 'nosson-by-קונטרס-הצירופים-עם-ה', 'letter-*.json'),
    ('Kuntrass Hatzairufim', 'nosson-by-קונטרס-הצרופים', 'letter-*.json'),
    ('Sichos Haran', 'sichos-haran', 'sicha-*.json'),
    ('Chayay Moharan', 'chayey-moharan', 'siman-*.json'),
    ('Rimzay_HaMaaseyos.html', 'rimzei-hamaasiyos', 'section-*.json'),
    ('meshivas_nefesh.html', 'meshivas-nefesh', '*.json'),
    ('yimai_hatlaos (1).html', 'yemei-hatlaos', '*.json'),
    ('Kuntrass_Hiskashrus_LaTzadik.html', 'kuntrass-hiskashrus', '*.json'),
]

def extract_paragraphs_from_html(filepath):
    """Extract all English text paragraphs from an HTML file."""
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()
    
    body_m = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
    body = body_m.group(1) if body_m else html
    
    # Get text from p, div, and section-body elements
    paras = []
    for tag in ['p', 'div']:
        for m in re.finditer(rf'<{tag}[^>]*>(.*?)</{tag}>', body, re.DOTALL):
            text = m.group(1)
            # Skip headers, navigation, etc.
            if re.match(r'^\s*<(?:h[1-6]|a|nav|button)', text):
                continue
            clean = re.sub(r'<br\s*/?>', '\n', text)
            clean = re.sub(r'<[^>]+>', '', clean)
            clean = re.sub(r'&mdash;', '—', clean)
            clean = re.sub(r'&nbsp;', ' ', clean)
            clean = re.sub(r'&[a-z]+;', ' ', clean)
            clean = re.sub(r'\s+', ' ', clean).strip()
            if len(clean) > 30:  # minimum sentence length
                paras.append(clean)
    
    return paras

def align_book(finished_name, reader_id, file_pattern, is_file=False):
    """Align one book's English from Finished HTML to reader JSON."""
    
    if is_file:
        html_path = os.path.join(FINISHED, finished_name)
        if not os.path.isfile(html_path):
            print(f'  SKIP: {html_path} not found')
            return 0, 0
        html_files = [html_path]
    else:
        folder = os.path.join(FINISHED, finished_name)
        if not os.path.isdir(folder):
            print(f'  SKIP: {folder} not found')
            return 0, 0
        html_files = sorted(glob.glob(os.path.join(folder, '*.html')))
    
    # Extract all English paragraphs from HTML files
    all_paras = []
    for hf in html_files:
        all_paras.extend(extract_paragraphs_from_html(hf))
    
    if not all_paras:
        print(f'  {reader_id}: no paragraphs extracted')
        return 0, 0
    
    # Find JSON files
    reader_dir = os.path.join(READER, reader_id)
    if not os.path.isdir(reader_dir):
        print(f'  {reader_id}: reader dir not found')
        return 0, 0
    
    json_files = sorted(glob.glob(os.path.join(reader_dir, '**', file_pattern), recursive=True))
    json_files = [j for j in json_files if os.path.basename(j) != 'index.json']
    
    if not json_files:
        # Try flat directory
        json_files = sorted(glob.glob(os.path.join(reader_dir, file_pattern)))
        json_files = [j for j in json_files if os.path.basename(j) != 'index.json']
    
    # Assign paragraphs sequentially to empty EN segments
    para_idx = 0
    updated = 0
    en_added = 0
    
    for jf in json_files:
        with open(jf, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        segs = data.get('segments', [])
        changed = False
        
        for seg in segs:
            he = (seg.get('he', '') or '').strip()
            en = (seg.get('en', '') or '').strip()
            if he and not en and para_idx < len(all_paras):
                seg['en'] = all_paras[para_idx]
                para_idx += 1
                en_added += 1
                changed = True
        
        if changed:
            data['hasEnglish'] = True
            with open(jf, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            updated += 1
    
    title = data.get('title', reader_id)[:40] if json_files else reader_id
    # Count remaining EN coverage
    total_he = 0
    total_en = 0
    for jf in json_files[:20]:
        with open(jf) as f:
            d = json.load(f)
        for s in d.get('segments', []):
            if (s.get('he','') or '').strip(): total_he += 1
            if (s.get('en','') or '').strip(): total_en += 1
    pct = round(100 * total_en / max(1, total_he))
    
    print(f'  {reader_id}: {updated} files, +{en_added} EN ({len(json_files)} total, now ~{pct}% EN)')
    return updated, en_added

# Main
print("=== Batch Aligning Books ===\n")
total_updated = 0
total_en = 0

for book in BOOKS:
    name, reader_id, pattern = book
    is_file = name.endswith('.html')
    u, e = align_book(name, reader_id, pattern, is_file)
    total_updated += u
    total_en += e

print(f'\n=== Done ===')
print(f'{total_updated} files updated, {total_en} English segments added')
