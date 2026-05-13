#!/usr/bin/env python3
"""
Fix LH pairing v8 - Hash-based matching.

For each docx HE paragraph, compute a hash of its beginning.
For each JSON segment, look up the hash to find the correct EN.
"""
from docx import Document
import json, os, re
from collections import defaultdict

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# Known meta/header patterns
META_PATTERNS = [
    'hilchos ', 'na nach', 'siman ', 'seif ', 'osio ', 'volume ',
    'introduction', 'likutay', 'a collection', 'the laws ', 'oc ',
    'yd ', 'eh ', 'cm ', 'like all', 'end of rabbi', 'naanach',
    'segment', 'torah ', 'one stop', 'arranged by', 'jaw ',
]

def is_meta(text):
    t = text.lower()
    return any(t.startswith(p) for p in META_PATTERNS) or (len(t) < 40 and len(t.split()) <= 3)

print("Building docx hash index...")

# Build hash: prefix_of_HE -> EN
he_to_en = {}  # norm(he)[:N] -> en_text
all_he_full = []  # Full normalized HE texts
all_en_full = []  # Full EN texts

for df in sorted(os.listdir(DOCX_DIR)):
    if not df.endswith('.docx'): continue
    doc = Document(os.path.join(DOCX_DIR, df))

    he_buf = None
    en_buf = []

    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 8: continue
        if is_meta(t):
            if he_buf and en_buf:
                h_norm = norm(he_buf)
                if h_norm not in he_to_en and en_buf:
                    he_to_en[h_norm] = '\n'.join(en_buf)
                    all_he_full.append(h_norm)
                    all_en_full.append('\n'.join(en_buf))
            he_buf = None
            en_buf = []
            continue

        if has_hebrew(t):
            if he_buf and en_buf:
                h_norm = norm(he_buf)
                if h_norm not in he_to_en:
                    he_to_en[h_norm] = '\n'.join(en_buf)
                    all_he_full.append(h_norm)
                    all_en_full.append('\n'.join(en_buf))
            he_buf = t
            en_buf = []
        else:
            if he_buf is not None:
                en_buf.append(t)

    # Flush last
    if he_buf and en_buf:
        h_norm = norm(he_buf)
        if h_norm not in he_to_en:
            he_to_en[h_norm] = '\n'.join(en_buf)
            all_he_full.append(h_norm)
            all_en_full.append('\n'.join(en_buf))

print(f"  Built index with {len(he_to_en)} entries")

# Now fix each LH part
for part_num in range(1, 9):
    part_dir = f'part-{part_num}'
    part_path = os.path.join(READER_DIR, part_dir)
    if not os.path.exists(part_path): continue

    print(f"\n  {part_dir}...")
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])

    fixed = 0
    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        changed = False

        for seg in data['segments']:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            if not he or not en: continue
            if len(he) < 20: continue

            h_norm = norm(he)

            # Direct lookup
            if h_norm in he_to_en:
                correct_en = he_to_en[h_norm]
                if correct_en != en:
                    seg['en'] = correct_en
                    fixed += 1
                    changed = True
                continue

            # Try prefix matching (JSON may have more text than docx)
            found = False
            for prefix_len in [80, 60, 40, 30, 20]:
                prefix = h_norm[:prefix_len]
                for h_key, e_val in he_to_en.items():
                    if h_key.startswith(prefix) and len(h_key) > prefix_len * 0.5:
                        if e_val != en:
                            seg['en'] = e_val
                            fixed += 1
                            changed = True
                        found = True
                        break
                if found:
                    break

        if changed:
            json.dump(data, open(os.path.join(part_path, jf), 'w'),
                      indent=2, ensure_ascii=False)

    print(f"    Fixed: {fixed}")

print("\nDone!")