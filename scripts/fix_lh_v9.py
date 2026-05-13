#!/usr/bin/env python3
"""
Fix LH pairing v9 - Use segment_id to match docx volume/page to JSON.

Each JSON segment has an implicit ordering within its halacha file.
We can use the file name and segment order to determine which docx
content it should match.
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)
def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()

SKIP_STARTS = ['hilchos ','na nach','siman ','seif ','osio ','volume ',
               'introduction','likutay','a collection','the laws ','oc ',
               'yd ','eh ','cm ','like all','naanach','segment',
               'jaw ','one stop','arranged by','nitan l\'tal','rabbi '
               'na na','nnmmm','torah ','end of']

def is_skip(text):
    t = text.lower().strip()
    return len(t.split()) <= 2 or any(t.startswith(s) for s in SKIP_STARTS)

def extract_he_en_from_docx(doc):
    """Extract ordered HE and EN content paragraphs."""
    paras = [p.text for p in doc.paragraphs]
    he_list, en_list = [], []

    for text in paras:
        t = text.strip()
        if is_skip(t): continue
        if has_hebrew(t):
            he_list.append(t)
        elif len(t) > 10:
            en_list.append(t)

    # Pair sequentially
    pairs = []
    for i in range(min(len(he_list), len(en_list))):
        pairs.append((he_list[i], en_list[i]))
    return pairs

def build_global_pair_list():
    """Build sequential list of (he, en) from all docx sorted by volume."""
    all_pairs = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'): continue
        doc = Document(os.path.join(DOCX_DIR, df))
        pairs = extract_he_en_from_docx(doc)
        all_pairs.extend(pairs)
        print(f"  {df}: {len(pairs)} pairs")
    return all_pairs

def get_json_segment_list(part_dir):
    """Get ordered list of (file, segment_index, he, en) from part."""
    part_path = os.path.join(READER_DIR, part_dir)
    jsfiles = sorted([f for f in os.listdir(part_path)
                      if f.endswith('.json') and f != 'index.json'])
    segs = []
    for jf in jsfiles:
        data = json.load(open(os.path.join(part_path, jf)))
        for i, seg in enumerate(data['segments']):
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            if he and not is_skip(he):
                segs.append((jf, i, he, en))
    return segs

def main():
    print("Building docx pair list...")
    docx_pairs = build_global_pair_list()
    print(f"\nTotal docx content pairs: {len(docx_pairs)}\n")

    for part_num in range(1, 9):
        part_dir = f'part-{part_num}'
        if not os.path.exists(os.path.join(READER_DIR, part_dir)):
            continue

        print(f"Processing {part_dir}...")
        json_segs = get_json_segment_list(part_dir)
        print(f"  JSON content segments: {len(json_segs)}")
        print(f"  Docx pairs available: {len(docx_pairs)}")

        # For now, just compare lengths - we need to figure out the mapping
        if len(json_segs) <= len(docx_pairs):
            # Can try positional match
            matches = 0
            for j in range(len(json_segs)):
                jhe = json_segs[j][2]  # JSON HE
                dhe = docx_pairs[j][0]  # Docx HE
                jen = json_segs[j][3]  # JSON EN
                den = docx_pairs[j][1]  # Docx EN

                # Check if HE texts overlap significantly
                jw = set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(jhe)))
                dw = set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(dhe)))
                if jw and dw:
                    overlap = len(jw & dw) / max(len(jw), len(dw))
                    if overlap > 0.3 and jen != den:
                        matches += 1

            print(f"  Potential matches: {matches}/{len(json_segs)}")
        else:
            print(f"  More JSON segments than docx pairs - need different approach")

main()