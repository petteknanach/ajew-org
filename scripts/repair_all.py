#!/usr/bin/env python3
"""
Repair English-Hebrew pairings using content-based matching from source files.
Strategy:
1. Parse source files (docx, HTML, txt) to extract EN text with section markers
2. For each JSON segment with HE text, find the matching EN text using keyword overlap
3. Replace incorrect EN with correct one
"""
import json
import os
import re
from docx import Document
import unicodedata

reader_dir = '/root/ajew-org/public/reader'

# ─── Normalization helpers ───
def norm_he(text):
    """Normalize Hebrew: remove nikud, standardize spaces."""
    if not text: return ''
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    text = text.replace('\u05BE', ' ').replace('\u05C3', '')
    return re.sub(r'\s+', ' ', text).strip().lower()

def norm_en(text):
    """Normalize English: lowercase, remove HTML entities, brackets."""
    if not text: return ''
    text = re.sub(r'&#x201[89cCdD]', lambda m: {'\u2018': '\'', '\u2019': '\'', '\u201c': '"', '\u201d': '"'}.get(m.group(0), ''), text)
    text = re.sub(r'\[\d+\]', ' ', text)
    text = re.sub(r'[\[\]]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()

def sig_words(text, min_len=3):
    """Extract significant words from text."""
    words = re.findall(r'\b\w{%d,}\b' % min_len, text, re.UNICODE)
    return set(w.lower() for w in words)

def content_sim(he_words, en_words):
    """Content similarity between Hebrew and English word sets.
    Uses partial matching (English translations often contain transliterated Hebrew)."""
    if not he_words or not en_words: return 0
    all_words = he_words | en_words
    intersection = he_words & en_words
    # Also check if any HE word appears as substring in any EN word or vice versa
    partial = sum(1 for h in he_words for e in en_words
                  if (h in e or e in h) and h != e and len(h) > 4 and len(e) > 4)
    jaccard = len(intersection) / len(all_words) if all_words else 0
    return jaccard + partial * 0.01


# ─── Source parsers ───
def parse_docx_en(filepath):
    """Parse docx file for English paragraphs. Returns list of (section_key, text)."""
    if not os.path.exists(filepath):
        return []
    doc = Document(filepath)
    result = []
    current_heading = ''
    current_texts = []
    
    for p in doc.paragraphs:
        text = p.text.strip()
        if not text:
            continue
        style = p.style.name.lower() if p.style else 'normal'
        
        # Identify heading (halacha/siman heading)
        is_heading = (p.style and p.style.name in ('Heading 1', 'Heading 2', 'Heading 3', 'Heading 4')
                      or bool(re.match(r'(?:The Laws|Hilchos|Siman|Halacha)\s', text, re.I))
                      or bool(re.match(r'S\.\s*\d+', text))
                      or bool(re.match(r'\u05e9\u05d5\u05e8\u05d9\u05dd \u05d0\u05d7\u05e8\u05d5\u05df', text)))
        
        if is_heading:
            if current_texts:
                result.append((current_heading, ' '.join(current_texts)))
                current_texts = []
            current_heading = text
        else:
            current_texts.append(text)
    
    if current_texts:
        result.append((current_heading, ' '.join(current_texts)))
    
    return result

def parse_html_en(filepath):
    """Parse HTML file for English text blocks."""
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    # Remove tags, keep text blocks
    text = re.sub(r'<[^>]+>', '\n', content)
    blocks = [b.strip() for b in text.split('\n\n') if b.strip() and len(b.strip()) > 20]
    return blocks


# ─── Repair functions ───
def repair_book(book_id, source_parsers):
    """Repair all JSON files in a book using source text matching."""
    book_path = os.path.join(reader_dir, book_id)
    if not os.path.isdir(book_path):
        return {'book': book_id, 'fixed': 0, 'unchanged': 0}
    
    total_fixed = 0
    total_unchanged = 0
    
    for part_dir in sorted(os.listdir(book_path)):
        part_path = os.path.join(book_path, part_dir)
        if not os.path.isdir(part_path):
            continue
        
        # Collect all JSON segments and their current state
        all_segments = []  # [(filepath, seg_index, he_text, current_en)]
        
        for f in sorted(os.listdir(part_path)):
            if not f.endswith('.json') or f == 'index.json':
                continue
            filepath = os.path.join(part_path, f)
            try:
                data = json.load(open(filepath))
            except:
                continue
            for si, seg in enumerate(data.get('segments', [])):
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()
                if he:  # Only process segments with Hebrew
                    all_segments.append((filepath, si, data, seg, he, en))
        
        # Get English source text
        en_blocks = []
        for parser in source_parsers:
            en_blocks.extend(parser(part_path))
        
        if not en_blocks:
            continue
        
        # For each segment, determine if current EN matches HE
        # If not, find the correct EN from source
        for filepath, seg_idx, data, seg, he, current_en in all_segments:
            # Build Hebrew word set
            he_words = sig_words(norm_he(he))
            if not he_words:
                continue
            
            # Check if current EN is a good match
            if current_en:
                current_bad = True
                en_words = sig_words(norm_en(current_en))
                sim = content_sim(he_words, en_words)
                if sim > 0.08:  # Even low similarity might be correct
                    current_bad = False
                
                # Heuristic: check if any significant Hebrew word appears in English
                for hw in he_words:
                    for ew in en_words:
                        if len(hw) >= 5 and (hw in ew or ew in hw):
                            current_bad = False
                            break
            else:
                current_bad = True
            
            if not current_bad:
                total_unchanged += 1
                continue
            
            # Find best matching EN block
            best_en = ''
            best_score = 0
            for block in en_blocks:
                en_words = sig_words(norm_en(block))
                score = content_sim(he_words, en_words)
                if score > best_score:
                    best_score = score
                    best_en = block
            
            if best_score > 0.05 and best_en:
                seg['en'] = best_en
                total_fixed += 1
            else:
                total_unchanged += 1
        
        # Write back modified JSON files
        modified_files = set()
        for filepath, seg_idx, data, seg, he, current_en in all_segments:
            if filepath not in modified_files:
                json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
                modified_files.add(filepath)
    
    return {'book': book_id, 'fixed': total_fixed, 'unchanged': total_unchanged}


def main():
    # Define repair tasks for each book with their source parsers
    tasks = []
    
    # Likutay Halachos - 38 docx files
    for vol in range(1, 39):
        vstr = f'{vol:02d}'
        path = f'/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos/Volume_{vstr}_OC1_English.docx'
        if os.path.exists(path):
            tasks.append(('likutay-halachos', [lambda p=path: parse_docx_en(p)]))
            break  # Just test with first volume for now
    
    # Otzar HaYirah - HTML files
    otzar_html_dir = '/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/taamey-hamitzvos'
    if os.path.exists(otzar_html_dir):
        for f in os.listdir(otzar_html_dir):
            # ... parse HTML sources
            pass
    
    # Likutay Tefilos - HTML files
    lt_dir = '/root/ajew-org/public/teachings/likutay-tefilos'
    if os.path.exists(lt_dir):
        def lt_parser(part_path):
            results = []
            html_dir = '/root/ajew-org/public/teachings/likutay-tefilos'
            for fn in os.listdir(html_dir):
                if fn.endswith('.html'):
                    blocks = parse_html_en(os.path.join(html_dir, fn))
                    results.extend(blocks)
            return results
        tasks.append(('likutay-tefilos', [lt_parser]))
    
    print('Starting repair process...')
    for book_id, source_parsers in tasks:
        print(f'\nRepairing {book_id}...')
        result = repair_book(book_id, source_parsers)
        print(f'  Fixed: {result["fixed"]}, Unchanged: {result["unchanged"]}')

if __name__ == '__main__':
    main()