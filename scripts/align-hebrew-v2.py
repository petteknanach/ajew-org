#!/usr/bin/env python3
"""
Properly align DOCX/HTML Hebrew paragraphs to reader JSON segments.
Handles MS (2 volumes → part-1/part-2), Fires, Aitzoas, Sipurey.
"""
import json, os, re, glob
from docx import Document

def is_hebrew(text):
    he_chars = sum(1 for c in text if '\u0590' <= c <= '\u05FF')
    alpha = sum(1 for c in text if c.isalpha())
    return alpha > 0 and he_chars / alpha > 0.4 if alpha else False

def extract_docx_paragraphs(filepath):
    doc = Document(filepath)
    return [p.text.strip() for p in doc.paragraphs if p.text.strip() and len(p.text.strip()) > 3]

def fill_json_dir(json_dir, he_paragraphs):
    """Fill Hebrew paragraphs into JSON files in directory (flat or nested)."""
    files = sorted(glob.glob(f"{json_dir}/**/*.json", recursive=True))
    files = [f for f in files if os.path.basename(f) != 'index.json']
    
    if not files:
        return 0
    
    filled = 0
    p_idx = 0
    
    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        segments = data.get('segments', [])
        modified = False
        
        for seg in segments:
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
DL = "/mnt/c/Users/Pettek/Downloads"
READER = "/root/ajew-org/public/reader"

# ---- MICHTEVAY SHMUEL: map vol 1→part-1, vol 2→part-2 ----
print("=== MICHTEVAY SHMUEL ===")
ms_mapping = [
    (f"{READER}/michtevay-shmuel/part-1", 
     f"{DL}/Michtevay Shmuel volume 1 - hebrew from torat emet מכתבי שמואל א.docx",
     "Vol 1 → part-1"),
    (f"{READER}/michtevay-shmuel/part-2",
     f"{DL}/Michtevay Shmuel volume 2 - hebrew from torat emet מכתבי שמואל ב.docx",
     "Vol 2 → part-2"),
]

for json_dir, docx_path, label in ms_mapping:
    if not os.path.exists(docx_path):
        print(f"  {label}: DOCX NOT FOUND")
        continue
    paras = extract_docx_paragraphs(docx_path)
    he_paras = [p for p in paras if is_hebrew(p)]
    print(f"  {label}: {len(paras)} paras, {len(he_paras)} Hebrew")
    filled = fill_json_dir(json_dir, he_paras)
    print(f"    Filled: {filled} segments")

# ---- FIRES OF ISRAEL ----
print("\n=== FIRES OF ISRAEL ===")
fires_docx = f"{DL}/Fires of israel - hebrew from torat emet אישי ישראל עברית.docx"
if os.path.exists(fires_docx):
    paras = extract_docx_paragraphs(fires_docx)
    he_paras = [p for p in paras if is_hebrew(p)]
    print(f"  {len(paras)} paras, {len(he_paras)} Hebrew")
    # Check: fires has section-N.json files in root - fill ALL files
    filled = fill_json_dir(f"{READER}/fires-of-israel", he_paras)
    print(f"  Filled: {filled} segments")

# ---- AITZOAS YESHUROAS ----
print("\n=== AITZOAS YESHUROAS ===")
ay_docx = f"{DL}/Aitzoas Yishuroas - hebrew from torat emet עצות ישרות.docx"
if os.path.exists(ay_docx):
    paras = extract_docx_paragraphs(ay_docx)
    he_paras = [p for p in paras if is_hebrew(p)]
    print(f"  {len(paras)} paras, {len(he_paras)} Hebrew")
    filled = fill_json_dir(f"{READER}/aitzoas-yeshuroas", he_paras)
    print(f"  Filled: {filled} segments")

# ---- SIPUREY MAASIYOS ----
print("\n=== SIPUREY MAASIYOS ===")
# Check which files don't have Hebrew and fill from existing context
sm_dir = f"{READER}/sipurey-maasiyos"
sm_files = sorted(glob.glob(f"{sm_dir}/*.json"))
sm_files = [f for f in sm_files if os.path.basename(f) != 'index.json']
missing_sm = []
for fp in sm_files:
    with open(fp) as f:
        data = json.load(f)
    segs = data.get('segments', [])
    has_he = any((s.get('he','') or '').strip() for s in segs)
    if not has_he:
        missing_sm.append(os.path.basename(fp))
print(f"  Files without Hebrew: {missing_sm}")

# ---- LIKUTAY MOHARAN ----
print("\n=== LIKUTAY MOHARAN ===")
lm_dir = f"{READER}/likutay-moharan"
lm_missing = []
for fp in sorted(glob.glob(f"{lm_dir}/**/*.json", recursive=True)):
    if os.path.basename(fp) == 'index.json':
        continue
    with open(fp) as f:
        data = json.load(f)
    segs = data.get('segments', [])
    has_he = any((s.get('he','') or '').strip() for s in segs)
    if not has_he:
        lm_missing.append(os.path.basename(fp))
print(f"  Files without Hebrew: {lm_missing}")

print("\nDone.")
