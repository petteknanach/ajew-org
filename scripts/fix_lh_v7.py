#!/usr/bin/env python3
"""
Fix LH pairing v7 - Use string matching between JSON HE and docx content.

The key insight: Each JSON segment's HE text is a concatenation of one or more
docx HE paragraphs. We can find which docx EN(s) correspond by finding where
the JSON HE text's constituent paragraphs appear in the docx.
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)
def strip_nikkud(t): return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', t)
def norm(t): return re.sub(r'\s+', ' ', strip_nikkud(t.lower())).strip()
def he_words(t): return set(re.findall(r'[\u05D0-\u05EA]{4,}', norm(t)))

def extract_all_paras(docx_path):
    """Extract ALL paragraphs from docx with type classification."""
    doc = Document(docx_path)
    result = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            result.append(('empty', t))
        elif len(t) < 8:
            result.append(('short', t))
        elif has_hebrew(t):
            result.append(('he', t))
        else:
            result.append(('en', t))
    return result

def find_in_docx(json_he_text, all_docx_paras):
    """
    Find the docx EN text that corresponds to this JSON HE text.

    Strategy:
    1. Check if the JSON HE text contains any complete docx HE paragraph
    2. If found, use the docx EN that follows
    """
    json_norm = norm(json_he_text)

    # Get all Hebrew words from JSON
    json_words = he_words(json_he_text)
    if not json_words:
        return None

    # Find ALL docx HE paragraphs whose text appears in the JSON HE text
    matching_docx_indices = []
    for i, (typ, text) in enumerate(all_docx_paras):
        if typ != 'he':
            continue
        docx_norm = norm(text)
        # Check if docx HE is contained in JSON HE
        if docx_norm and len(docx_norm) > 20 and docx_norm in json_norm:
            matching_docx_indices.append(i)

    if not matching_docx_indices:
        # Try word overlap approach
        for i, (typ, text) in enumerate(all_docx_paras):
            if typ != 'he': continue
            docx_words = he_words(text)
            if len(docx_words) < 3: continue
            overlap = json_words & docx_words
            if len(overlap) >= min(len(json_words), len(docx_words)) * 0.5:
                matching_docx_indices.append(i)

    if not matching_docx_indices:
        return None

    # For each matching docx HE, get the following EN paragraphs
    all_en_texts = []
    for idx in matching_docx_indices:
        en_parts = []
        j = idx + 1
        while j < len(all_docx_paras):
            ttype, text = all_docx_paras[j]
            if ttype == 'he':
                break
            if ttype == 'en' and len(text) > 10:
                en_parts.append(text)
            j += 1
        if en_parts:
            all_en_texts.append('\n'.join(en_parts))

    # Return longest match (likely the most complete translation)
    if all_en_texts:
        return max(all_en_texts, key=len)
    return None

def fix_all():
    print("Loading all docx files...")
    all_docx = {}
    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'): continue
        paras = extract_all_paras(os.path.join(DOCX_DIR, df))
        all_docx[df] = paras
        types = {}
        for t, _ in paras:
            types[t] = types.get(t, 0) + 1
        print(f"  {df}: {len(paras)} paras ({types})")

    # Combine all docx paragraphs into one sequence
    combined_paras = []
    for df in sorted(all_docx.keys()):
        combined_paras.extend(all_docx[df])

    print(f"\nTotal combined paragraphs: {len(combined_paras)}")

    # Process each part
    for part_num in range(1, 9):
        part_dir = f'part-{part_num}'
        part_path = os.path.join(READER_DIR, part_dir)
        if not os.path.exists(part_path): continue

        print(f"\nProcessing {part_dir}...")
        jsfiles = sorted([f for f in os.listdir(part_path)
                          if f.endswith('.json') and f != 'index.json'])

        fixed = 0
        for jf in jsfiles:
            data = json.load(open(os.path.join(part_path, jf)))
            changed = False

            for seg in data['segments']:
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()

                if not he or len(he) < 30:
                    continue

                # Skip header segments
                he_norm = norm(he)
                if len(he_norm) < 20:
                    continue

                # Only fix if EN is empty or clearly wrong
                if en:
                    en_words = he_words(en)  # Transliterated Hebrew in EN
                    # If EN has transliterated Hebrew words, it might be ok
                    if en_words and len(en_words) >= 2:
                        continue

                correct_en = find_in_docx(he, combined_paras)
                if correct_en and correct_en != en and len(correct_en) > 20:
                    seg['en'] = correct_en
                    fixed += 1
                    changed = True

            if changed:
                json.dump(data, open(os.path.join(part_path, jf), 'w'),
                          indent=2, ensure_ascii=False)

        print(f"  Fixed: {fixed} segments")

fix_all()