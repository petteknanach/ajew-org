#!/usr/bin/env python3
"""Fix LH EN-HE pairing - clean version."""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))
def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

SKIP = ['hilchos','na nach','siman ','seif ','osio ','volume ','introduction',
        'likutay','a collection','the laws ','oc ','yd ','eh ','cm ',
        'orach','yoreh','even','choshen']

def is_header(t):
    tl = t.lower().strip()
    if len(tl) < 8 or len(tl.split()) <= 2: return True
    return any(tl.startswith(s) for s in SKIP)

print("Building docx pair index...")

# Build a SINGLE sequential list of all docx content pairs across all volumes
all_docx_he = []
all_docx_en = []

for df in sorted(os.listdir(DOCX_DIR)):
    if not df.endswith('.docx'): continue
    dp = os.path.join(DOCX_DIR, df)
    doc = Document(dp)
    paras = [p.text.strip() for p in doc.paragraphs]

    he_buf = None
    en_buf = []

    for text in paras:
        if len(text) < 10 or is_header(text):
            if he_buf and en_buf:
                all_docx_he.append(he_buf)
                all_docx_en.append('\n'.join(en_buf))
            he_buf = None
            en_buf = []
            continue

        if has_hebrew(text):
            if he_buf and en_buf:
                all_docx_he.append(he_buf)
                all_docx_en.append('\n'.join(en_buf))
            he_buf = text
            en_buf = []
        else:
            if he_buf is not None:
                en_buf.append(text)

    # Flush
    if he_buf and en_buf:
        all_docx_he.append(he_buf)
        all_docx_en.append('\n'.join(en_buf))

print(f"  Docx pairs: {len(all_docx_he)} HE, {len(all_docx_en)} EN")

# Build word index: Hebrew word -> list of pair indices
word_index = {}
for idx, he in enumerate(all_docx_he):
    for w in he_words(he):
        if w not in word_index:
            word_index[w] = []
        word_index[w].append(idx)

print(f"  Index entries: {len(word_index)} unique Hebrew words")

# Process each part
for part_dir in [f'part-{i}' for i in range(1, 9)]:
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
            if not he or is_header(he) or not en:
                continue

            he_w = he_words(he)
            if len(he_w) < 3:
                continue

            # Find matching docx pairs via word index
            candidates = {}  # idx -> match_score
            for w in he_w:
                if w in word_index:
                    for idx in word_index[w]:
                        candidates[idx] = candidates.get(idx, 0) + 1

            if not candidates:
                continue

            # Sort by score
            best_idx = max(candidates, key=candidates.get)
            best_score = candidates[best_idx]

            # Require at least 3 matches
            if best_score >= 3:
                correct_en = all_docx_en[best_idx]
                if correct_en != en and len(correct_en) > 20:
                    # Verify: check word overlap
                    docx_w = he_words(all_docx_he[best_idx])
                    overlap = he_w & docx_w
                    if len(overlap) >= 2:
                        seg['en'] = correct_en
                        fixed += 1
                        changed = True

        if changed:
            json.dump(data, open(os.path.join(part_path, jf), 'w'),
                      indent=2, ensure_ascii=False)

    print(f"    Fixed: {fixed} segments")

print("\nDone!")