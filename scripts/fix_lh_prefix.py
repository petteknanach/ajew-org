#!/usr/bin/env python3
"""
Ultra-fast LH fix using prefix hashing.

The LH JSON segments' HE text should start with distinctive phrases
matching the docx HE paragraphs. Use hash of first N chars to match.
"""
from docx import Document
import json
import os
import re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

SKIP = {'hilchos','volume','introduction','sefer','oc ','yd ','eh ','cm ','orach',
        'yoreh','even','choshen','likutay','na nach','naanach','petek','hh','by ','a collection',
        'the laws','siman','seif','osio','','...','segment','sof','torah '}

def is_header(text):
    t = text.lower()[:20].strip()
    return t in SKIP or any(t.startswith(s) for s in SKIP) or len(t) < 5

def extract_pairs(docx_path):
    """Extract HE-EN pairs, pairing by position after filtering headers."""
    doc = Document(docx_path)
    he_list, en_list = [], []

    for p in doc.paragraphs:
        t = p.text.strip()
        if len(t) < 15 or is_header(t):
            continue
        if has_hebrew(t):
            he_list.append(t)
        else:
            en_list.append(t)

    # Pair by position
    pairs = []
    for i in range(min(len(he_list), len(en_list))):
        pairs.append((he_list[i], en_list[i]))
    return pairs

def fix_lh():
    print("Building docx index...")

    all_pairs = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if df.endswith('.docx'):
            pairs = extract_pairs(os.path.join(DOCX_DIR, df))
            all_pairs.extend(pairs)

    print(f"  {len(all_pairs)} docx pairs")

    # Build hash: norm(first 50 chars of HE) -> EN text
    prefix_map = {}
    for he, en in all_pairs:
        prefix = norm(he)[:50]
        if prefix not in prefix_map:
            prefix_map[prefix] = (he, en)

    # Also build suffix map (sometimes the beginning doesn't match)
    suffix_map = {}
    for he, en in all_pairs:
        h = norm(he)
        suffix = h[-40:] if len(h) > 40 else h
        if suffix not in suffix_map:
            suffix_map[suffix] = (he, en)

    print(f"  {len(prefix_map)} unique prefixes, {len(suffix_map)} unique suffixes")

    # Process each LH part
    for part_dir in ['part-1','part-2','part-3','part-4','part-5','part-6','part-7','part-8']:
        part_path = os.path.join(READER_DIR, part_dir)
        if not os.path.exists(part_path):
            continue

        print(f"\n  {part_dir}...")
        fixed = 0
        jsfiles = sorted([f for f in os.listdir(part_path)
                          if f.endswith('.json') and f != 'index.json'])

        for jf in jsfiles:
            filepath = os.path.join(part_path, jf)
            data = json.load(open(filepath))
            changed = False

            for seg in data['segments']:
                he = seg.get('he','').strip()
                old_en = seg.get('en','').strip()

                if not he or not old_en:
                    continue

                h = norm(he)
                # Try prefix match
                correct_en = None

                # Try different prefix lengths
                for plen in [60, 50, 40, 30]:
                    prefix = h[:plen]
                    if prefix in prefix_map:
                        _, correct_en = prefix_map[prefix]
                        break

                # Try suffix match
                if not correct_en and len(h) > 40:
                    suffix = h[-40:]
                    if suffix in suffix_map:
                        _, correct_en = suffix_map[suffix]

                if correct_en and correct_en != old_en and len(correct_en) > 10:
                    seg['en'] = correct_en
                    fixed += 1
                    changed = True

            if changed:
                json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)

        print(f"    Fixed: {fixed} segments")

fix_lh()