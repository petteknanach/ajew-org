#!/usr/bin/env python3
"""
Fill missing Hebrew from DOCX source files into reader JSONs.
Handles: Michtevay Shmuel, Fires of Israel, Aitzoas Yeshuroas, 
         Aitzoas HaMivooaroas, Adir BaMarom, Gevuros Shimshon,
         Seder HaYom (Breiter), and the remaining gaps.
"""
import json, os, re, glob
from docx import Document

def extract_docx_paragraphs(filepath):
    """Extract all paragraphs from a DOCX file, skipping empty ones."""
    doc = Document(filepath)
    paragraphs = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if text and len(text) > 3:
            paragraphs.append(text)
    return paragraphs

def extract_html_paragraphs(filepath):
    """Extract Hebrew text from HTML files."""
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    # Get body content
    bm = re.search(r'<body[^>]*>([\s\S]*)</body>', html, re.I)
    content = bm.group(1) if bm else html
    content = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', content, flags=re.I)
    content = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', content, flags=re.I)
    content = re.sub(r'<!--[\s\S]*?-->', '', content)
    
    # Extract from <p> tags and <div class="p">
    paras = []
    for m in re.finditer(r'<(?:p|div\s+class="p")[^>]*>([\s\S]*?)</(?:p|div)>', content, re.I):
        text = re.sub(r'<br\s*/?>', ' ', m.group(1), flags=re.I)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'&[a-z]+;', ' ', text)  # crude entity strip
        text = re.sub(r'\s+', ' ', text).strip()
        if len(text) > 10:
            paras.append(text)
    return paras

def is_hebrew(text):
    """Check if text is primarily Hebrew."""
    he_chars = sum(1 for c in text if '\u0590' <= c <= '\u05FF')
    alpha = sum(1 for c in text if c.isalpha())
    return alpha > 0 and he_chars / alpha > 0.4

def fill_hebrew(json_dir, he_paragraphs, book_name):
    """Fill Hebrew paragraphs into JSON segment files."""
    files = sorted(glob.glob(f"{json_dir}/**/*.json", recursive=True))
    files = [f for f in files if os.path.basename(f) != 'index.json']
    
    if not files:
        print(f"  {book_name}: No JSON files found in {json_dir}")
        return 0
    
    # For simple 1:1 mapping: assign paragraphs to files in order
    filled = 0
    p_idx = 0
    
    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        segments = data.get('segments', [])
        modified = False
        
        for seg in segments:
            # Only fill if Hebrew is missing/empty
            he = (seg.get('he', '') or '').strip()
            if not he and p_idx < len(he_paragraphs):
                para = he_paragraphs[p_idx]
                if is_hebrew(para):
                    seg['he'] = para
                    modified = True
                    filled += 1
                p_idx += 1
        
        if modified:
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    
    return filled

# ================================================================
# Download folder paths
# ================================================================
DL = "/mnt/c/Users/Pettek/Downloads"

sources = {
    'michtevay-shmuel': {
        'dir': '/root/ajew-org/public/reader/michtevay-shmuel',
        'files': [
            f"{DL}/Michtevay Shmuel volume 1 - hebrew from torat emet מכתבי שמואל א.docx",
            f"{DL}/Michtevay Shmuel volume 2 - hebrew from torat emet מכתבי שמואל ב.docx",
        ]
    },
    'fires-of-israel': {
        'dir': '/root/ajew-org/public/reader/fires-of-israel',
        'files': [f"{DL}/Fires of israel - hebrew from torat emet אישי ישראל עברית.docx"]
    },
    'aitzoas-yeshuroas': {
        'dir': '/root/ajew-org/public/reader/aitzoas-yeshuroas',
        'files': [f"{DL}/Aitzoas Yishuroas - hebrew from torat emet עצות ישרות.docx"]
    },
    'aitzoas-hamivooaroas': {
        'dir': '/root/ajew-org/public/reader/aitzoas-hamivooaroas',
        'files': [f"{DL}/Aitzoas Hamivoaaroas - hebrew from torat emet עצות.docx"]
    },
    'gevuros-shimshon': {
        'dir': '/root/ajew-org/public/reader/gevuros-shimshon',
        'files': [f"{DL}/Givooroas Shimshon - Hebrew from torat emet.docx"]
    },
    'breiter-seder-hayom': {
        'dir': '/root/ajew-org/public/reader/breiter-seder-hayom',
        'files': [f"{DL}/seder hayom - rabbi yitzchok breiter - סדר היום מרבי יצחק ברייטער זי.docx"]
    },
}

# Adir BaMarom (HTML source)
adir_html = "/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Adir Bamuroam"

total_filled = 0

for book_name, cfg in sources.items():
    print(f"\n=== {book_name} ===")
    all_paras = []
    for fp in cfg['files']:
        if os.path.exists(fp):
            paras = extract_docx_paragraphs(fp)
            print(f"  {os.path.basename(fp)}: {len(paras)} paragraphs")
            all_paras.extend(paras)
        else:
            print(f"  NOT FOUND: {fp}")
    
    he_paras = [p for p in all_paras if is_hebrew(p)]
    print(f"  Hebrew paragraphs: {len(he_paras)}")
    
    filled = fill_hebrew(cfg['dir'], he_paras, book_name)
    total_filled += filled
    print(f"  Filled: {filled} segments")

# Adir BaMarom separately (HTML source)
print(f"\n=== ramchal-adir-bamuroam (HTML) ===")
all_paras = []
html_files = sorted(glob.glob(f"{adir_html}/*.html"))
for fp in html_files:
    paras = extract_html_paragraphs(fp)
    all_paras.extend(paras)
he_paras = [p for p in all_paras if is_hebrew(p)]
print(f"  {len(html_files)} HTML files, {len(he_paras)} Hebrew paragraphs")

filled = fill_hebrew('/root/ajew-org/public/reader/ramchal-adir-bamuroam', he_paras, 'ramchal-adir-bamuroam')
total_filled += filled
print(f"  Filled: {filled} segments")

print(f"\n\nTOTAL FILLED: {total_filled} segments")
