#!/usr/bin/env python3
"""
Otzar Hayirah - Complete Hebrew rebuild.
Matches ALL 169 JSON files to docx sections by Hebrew title.
"""

import os, re, json, unicodedata
from docx import Document

DOCX_DIR = '/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/otzar-hayirah'
OUTPUT_DIR = '/root/ajew-org/public/reader/otzar-hayirah'

DOCX_FILES = [
    ('oatzar hayeeruh - volume 1 - copied from torat emet for simanim.docx', 1),
    ('oatzar hayeerah - volume 2 - copied from Torat Emet for simanim.docx', 2),
    ('oatzar hayeerah - volume 3 - copied from Torat emet for simanim.docx', 3),
    ('Oatzar hayeerah - volume 4 - copied from torat emet for simanim.docx', 4),
]

HEB_LETTERS = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10,
    'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16, 'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20,
    'כא': 21, 'כב': 22, 'כג': 23, 'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
    'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36, 'לז': 37, 'לח': 38, 'לט': 39, 'מ': 40,
}

def heb_to_num(s):
    return HEB_LETTERS.get(s.strip(), None)

def norm(s):
    s = unicodedata.normalize('NFKD', s)
    s = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def extract_simanim(text):
    paragraphs = []
    markers = sorted(HEB_LETTERS.keys(), key=len, reverse=True)
    pattern = '|'.join(re.escape(m) for m in markers)
    matches = list(re.finditer(rf'(?:^|\s)({pattern})\.\s', text))
    for i, m in enumerate(matches):
        num = heb_to_num(m.group(1))
        start = m.end()
        end = matches[i+1].start() if i+1 < len(matches) else len(text)
        txt = text[start:end].strip()
        if txt and num:
            paragraphs.append((num, txt))
    return paragraphs

def parse_docx(path):
    doc = Document(path)
    sections = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 100: continue
        lines = t.split('\n', 1)
        title = lines[0].strip()
        content = t[len(title):].strip() if len(lines) > 1 else ''
        sim = extract_simanim(content)
        if sim:
            sections.append((title, sim))
    return sections

def match_section(j_title, docx_sections):
    """Match JSON title to best docx section."""
    jn = norm(j_title)
    
    # Exact match
    for title, sim in docx_sections:
        if norm(title) == jn:
            return sim
    
    # Docx title contained in JSON title
    for title, sim in docx_sections:
        if norm(title) in jn:
            return sim
    
    # JSON title contained in docx title
    for title, sim in docx_sections:
        if jn in norm(title):
            return sim
    
    # Keyword overlap
    j_words = set(re.findall(r'[\u0590-\u05FF]{3,}', j_title))
    if not j_words:
        return None
    
    best_sim = None
    best_score = 0
    for title, sim in docx_sections:
        d_words = set(re.findall(r'[\u0590-\u05FF]{3,}', title))
        score = len(j_words & d_words)
        if score > best_score:
            best_score = score
            best_sim = sim
    
    return best_sim if best_score >= 1 else None

def main():
    print('=== Otzar Hayirah Hebrew Rebuild ===\n')
    
    # Parse docx
    print('Parsing docx...')
    docx = {}
    for fname, part in DOCX_FILES:
        path = os.path.join(DOCX_DIR, fname)
        if os.path.exists(path):
            docx[part] = parse_docx(path)
            print(f'  Part {part}: {len(docx[part])} sections')
    
    # Process all JSON files
    print('\nProcessing JSON files...')
    total = 0
    matched = 0
    
    for part in range(1, 5):
        pdir = os.path.join(OUTPUT_DIR, f'part-{part}')
        if not os.path.exists(pdir): continue
        sections = docx.get(part, [])
        
        for f in sorted(os.listdir(pdir)):
            if not f.startswith('torah-') or not f.endswith('.json'): continue
            fpath = os.path.join(pdir, f)
            data = json.load(open(fpath))
            segs = data.get('segments', [])
            htitle = data.get('hebrewTitle', '')
            
            sim_list = match_section(htitle, sections)
            if sim_list:
                sim_map = {n: t for n, t in sim_list}
                for seg in segs:
                    idx = seg.get('index', 0)
                    if idx in sim_map:
                        seg['he'] = sim_map[idx]
                        total += 1
                    else:
                        seg['he'] = ''
                matched += 1
            else:
                for seg in segs:
                    seg['he'] = ''
            
            json.dump(data, open(fpath, 'w'), indent=2, ensure_ascii=False)
    
    print(f'Matched: {matched} files, {total} segments')
    
    # Count empty
    empty = sum(1 for p in range(1,5) for f in os.listdir(os.path.join(OUTPUT_DIR,f'part-{p}'))
                if f.startswith('torah-') and f.endswith('.json')
                for seg in json.load(open(os.path.join(OUTPUT_DIR,f'part-{p}',f))).get('segments',[])
                if not seg.get('he','').strip())
    print(f'Empty Hebrew: {empty}')

if __name__ == '__main__':
    main()
