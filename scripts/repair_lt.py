#!/usr/bin/env python3
"""
Repair Likutay Tefilos EN-HE pairings using HTML source files.
The HTML files have the correct English text organized by prayer.
We need to match each English paragraph to the correct Hebrew segment.
"""
import json
import os
import re
from html.parser import HTMLParser

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'
LT_HTML_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.texts = []
        self.current = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.current.append(data)

def extract_html_texts(html_path):
    """Extract text blocks from HTML file with section markers."""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    parser = TextExtractor()
    parser.feed(content)
    raw = ' '.join(parser.current)

    # Split into blocks by headers and paragraphs
    blocks = []
    # Replace common HTML entities
    raw = raw.replace('&#x2019;', "'").replace('&#x2018;', "'")
    raw = raw.replace('&#x201C;', '"').replace('&#x201D;', '"')

    # Split by line breaks and headers
    lines = raw.split('\n')
    current_block = []

    for line in lines:
        line = line.strip()
        if not line:
            if current_block:
                blocks.append(' '.join(current_block))
                current_block = []
        else:
            current_block.append(line)

    if current_block:
        blocks.append(' '.join(current_block))

    return [b for b in blocks if len(b) > 15]

def normalize_he(text):
    if not text: return ''
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    text = text.replace('\u05BE', ' ').replace('\u05C3', '')
    return re.sub(r'\s+', ' ', text).strip().lower()

def extract_he_words(text):
    words = re.findall(r'[\u0590-\u05FF]{3,}', text)
    return set(w.lower() for w in words)

def extract_en_words(text):
    text = re.sub(r'\[.*?\]', ' ', text)
    words = re.findall(r'[a-zA-Z]{3,}', text)
    return set(w.lower() for w in words)

def similarity(he_words, en_words):
    if not he_words or not en_words:
        return 0
    # Transliterated words: Hebrew words may appear in English
    direct_hits = len(he_words & en_words)
    # Partial matches
    partial = 0
    for h in he_words:
        for e in en_words:
            if len(h) >= 4 and (h in e or e in h):
                partial += 0.3
    return direct_hits + min(partial, len(he_words) * 0.5)

def repair_lt():
    """Repair Likutay Tefilos pairings."""
    results = []

    # Get all HTML files and their content
    html_cache = {}
    for fn in os.listdir(LT_HTML_DIR):
        if fn.endswith('.html'):
            path = os.path.join(LT_HTML_DIR, fn)
            blocks = extract_html_texts(path)
            html_cache[fn] = blocks

    print('HTML files loaded:')
    for fn, blocks in html_cache.items():
        print(f'  {fn}: {len(blocks)} text blocks')

    # Now process each JSON file
    for f in sorted(os.listdir(LT_DATA_DIR)):
        if not f.endswith('.json') or f == 'index.json':
            continue

        filepath = os.path.join(LT_DATA_DIR, f)
        try:
            data = json.load(open(filepath))
        except:
            continue

        segments = data.get('segments', [])
        if not segments:
            continue

        # Get the Hebrew title of this file
        he_title = data.get('hebrewTitle', '').strip()

        # Find the matching HTML file(s)
        all_blocks = []
        for fn, blocks in html_cache.items():
            all_blocks.extend([(fn, b) for b in blocks])

        if not all_blocks:
            continue

        fixed = 0
        total_segs = 0

        for seg in segments:
            he = seg.get('he', '').strip()
            current_en = seg.get('en', '').strip()
            if not he:
                continue

            total_segs += 1

            he_words = extract_he_words(he)
            if not he_words:
                continue

            # Check if current EN is reasonable
            if current_en:
                en_words = extract_en_words(current_en)
                sim = similarity(he_words, en_words)
                if sim >= 2:  # Reasonable match
                    continue

            # Find best matching block from HTML
            best_block = ''
            best_file = ''
            best_score = 0
            for fn, block in all_blocks:
                en_words = extract_en_words(block)
                score = similarity(he_words, en_words)

                # Bonus: check if English block contains words from HE title
                if he_title:
                    title_words = extract_he_words(he_title)
                    for tw in title_words:
                        for ew in en_words:
                            if tw in ew or ew in tw:
                                score += 0.5

                # Penalty: very long English blocks for short Hebrew lines
                if len(block) > len(he) * 20:
                    score *= 0.5

                if score > best_score:
                    best_score = score
                    best_block = block
                    best_file = fn

            if best_score > 0.5 and best_block:
                # Clean up the English block (take reasonable length)
                if len(best_block) > len(he) * 15:
                    # Block might be too long - try to find the matching part
                    pass
                seg['en'] = best_block
                fixed += 1

        if total_segs > 0 and fixed > 0:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
            results.append((f, total_segs, fixed))
            print(f'Fixed {fixed}/{total_segs} in {f}')

    print(f'\nTotal files modified: {len(results)}')

if __name__ == '__main__':
    repair_lt()