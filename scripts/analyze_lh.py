#!/usr/bin/env python3
"""Analyze LH docx vs JSON structure."""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

def is_meta(text):
    t = text.lower().strip()
    if len(t) < 5 or len(t.split()) <= 2: return True
    prefixes = ['hilchos','na nach','siman ','seif ','osio ','volume ',
                'introduction','likutay','a collection','the laws ','oc ',
                'yd ','eh ','cm ','nitan l\'tal','halacha ','like all',
                'end of','rabbi nachman','one who recites','the entire',
                'naanach','na na','nnmmm']
    return any(t.startswith(p) for p in prefixes) or 'segment' in t.lower()

# Analyze Volume 1
vol1 = Document(os.path.join(DOCX_DIR, 'Volume_01_OC1_English.docx'))
he_para = []
en_para = []
for p in vol1.paragraphs:
    t = p.text.strip()
    if len(t) < 5: continue
    if is_meta(t): continue
    if has_hebrew(t):
        he_para.append(t)
    else:
        en_para.append(t)

print(f"Volume_01: {len(he_para)} HE content, {len(en_para)} EN content")
print(f"\nFirst 3 HE paragraphs:")
for i in range(min(3, len(he_para))):
    print(f"  {i}: {he_para[i][:80]}")
print(f"\nFirst 3 EN paragraphs:")
for i in range(min(3, len(en_para))):
    print(f"  {i}: {en_para[i][:80]}")

# Check JSON part-1
json_dir = os.path.join(READER_DIR, 'part-1')
jf = sorted([f for f in os.listdir(json_dir) if f.endswith('.json') and f != 'index.json'])[0]
data = json.load(open(os.path.join(json_dir, jf)))
print(f"\n{os.path.basename(json_dir)}/{jf}: {len(data['segments'])} segments")

for i, seg in enumerate(data['segments'][:3]):
    he = seg.get('he','').strip()
    en = seg.get('en','').strip()
    print(f"\n  Seg {i+1} HE: {he[:80]}")
    print(f"  Seg {i+1} EN: {(en[:80] if en else '(empty)')}")

# Count all JSON content by part
print("\n=== JSON segments per part ===")
for part_num in range(1, 9):
    pd = f'part-{part_num}'
    pp = os.path.join(READER_DIR, pd)
    if not os.path.exists(pp): continue
    total = 0; he_c = 0; en_c = 0
    for f in sorted(os.listdir(pp)):
        if not f.endswith('.json') or f == 'index.json': continue
        d = json.load(open(os.path.join(pp, f)))
        for s in d['segments']:
            total += 1
            if s.get('he','').strip() and not is_meta(s.get('he','')):
                he_c += 1
            if s.get('en','').strip() and not is_meta(s.get('en','')):
                en_c += 1
    print(f"  {pd}: {total} total, {he_c} HE content, {en_c} EN content")