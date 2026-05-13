#!/usr/bin/env python3
"""
Repair Likutay Tefilos by splitting HTML English into sentences
and matching them 1-to-1 with Hebrew segments.
"""
import json, os, re
from html.parser import HTMLParser

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'
LT_HTML_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.texts = []
        self.current = []
        self.skip = False
        self.in_header = False
        self.headers = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip = True
        if tag in ('h1', 'h2', 'h3', 'h4'):
            self.in_header = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip = False
        if tag in ('h1', 'h2', 'h3', 'h4'):
            self.in_header = False

    def handle_data(self, data):
        if not self.skip:
            text = data.strip()
            if text:
                if self.in_header:
                    self.headers.append(text)
                self.current.append(text)

def extract_html_by_section(html_path):
    """Extract English text organized by section headers from HTML."""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    parser = TextExtractor()
    parser.feed(content)
    raw = ' '.join(parser.current)
    # Clean up HTML entities
    raw = raw.replace('&#x2019;', "'").replace('&#x2018;', "'")
    raw = raw.replace('&#x201C;', '"').replace('&#x201D;', '"')
    raw = raw.replace('&#8220;', '"').replace('&#8221;', '"')
    raw = raw.replace('^T', '').replace('▾', '')  # Remove special markers
    # Split into paragraphs by double newline
    blocks = [b.strip() for b in re.split(r'\n{2,}', raw) if b.strip()]
    return blocks

def split_into_sentences(text):
    """Split English text into individual sentences/phrases."""
    # Split by period, semicolon, and line breaks
    sentences = re.split(r'(?<=[.!?])\s+', text)
    # Clean up
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 3]
    return sentences

def normalize_he(text):
    if not text: return ''
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    text = text.replace('\u05BE', ' ').replace('\u05C3', '')
    return re.sub(r'\s+', ' ', text).strip().lower()

def extract_he_words(text):
    words = re.findall(r'[\u0590-\u05FF]{3,}', text)
    return set(w.lower() for w in words)

def extract_en_words(text):
    text = re.sub(r'[\[\]]', ' ', text)
    words = re.findall(r'[a-zA-Z]{3,}', text)
    return set(w.lower() for w in words)

def find_section_in_html(prayer_num, html_cache):
    """Find the HTML section corresponding to a prayer number."""
    for fn, blocks in html_cache.items():
        for block in blocks:
            # Check if the block contains the prayer number reference
            if re.search(rf'\b{prayer_num}\b', block):
                return blocks
    return []

def match_en_to_he_segments(he_segments, en_blocks):
    """Match English blocks to Hebrew segments.
    Returns dict mapping segment index to English text."""
    result = {}

    # Collect all English sentences from all blocks
    all_sentences = []
    for block in en_blocks:
        sentences = split_into_sentences(block)
        all_sentences.extend(sentences)

    if not all_sentences or not he_segments:
        return result

    # For each Hebrew segment, find the best matching English sentence
    for seg_idx, he_text in he_segments:
        he_words = extract_he_words(he_text)
        if not he_words:
            continue

        best_sentence = ''
        best_score = 0

        for sent in all_sentences:
            en_words = extract_en_words(sent)
            if not en_words:
                continue

            # Word overlap score
            overlap = len(he_words & en_words)
            score = overlap

            # Partial: check if any HE word appears as substring in EN words
            for hw in he_words:
                for ew in en_words:
                    if len(hw) >= 4 and len(ew) >= 4:
                        if hw in ew or ew in hw:
                            score += 0.5
            # Length ratio check: EN should not be > 10x shorter than HE
            if len(sent) > 0 and len(he_text) > 0:
                ratio = len(sent) / max(len(he_text), 1)
                if ratio < 0.1 or ratio > 10:
                    score *= 0.5

            if score > best_score:
                best_score = score
                best_sentence = sent

        if best_score > 0.5:
            result[seg_idx] = best_sentence

    return result

def main():
    # Load all HTML files
    html_cache = {}
    for fn in os.listdir(LT_HTML_DIR):
        if fn.endswith('.html') and fn != 'index.html':
            path = os.path.join(LT_HTML_DIR, fn)
            blocks = extract_html_by_section(path)
            if blocks:
                html_cache[fn] = blocks

    print(f'Loaded {len(html_cache)} HTML files')

    fixed_total = 0
    modified_files = 0

    # Process each JSON file
    data_files = [f for f in os.listdir(LT_DATA_DIR) if f.endswith('.json') and f != 'index.json']

    for f in data_files:
        filepath = os.path.join(LT_DATA_DIR, f)
        try:
            data = json.load(open(filepath))
        except:
            continue

        segments = data.get('segments', [])
        if not segments:
            continue

        # Get prayer number from filename
        prayer_match = re.search(r'prayer-(\d+)', f)
        if not prayer_match:
            continue
        prayer_num = int(prayer_match.group(1))

        # Find matching HTML section
        en_blocks = []
        for fn, blocks in html_cache.items():
            fn_num_match = re.search(r'prayer-(\d+)', fn)
            if fn_num_match and int(fn_num_match.group(1)) == prayer_num:
                en_blocks = blocks
                break

        if not en_blocks:
            continue

        # Collect Hebrew segments that need fixing
        he_segments = []
        for si, seg in enumerate(segments):
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            if he and not en:
                he_segments.append((si, he))

        if not he_segments:
            # Try to fix pairings even if EN exists
            he_segments = [(si, seg.get('he', '').strip()) for si, seg in enumerate(segments) if seg.get('he', '').strip()]

        # Match English to Hebrew
        matches = match_en_to_he_segments(he_segments, en_blocks)

        if matches:
            for si, en_text in matches.items():
                segments[si]['en'] = en_text
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
            fixed_total += len(matches)
            modified_files += 1
            print(f'Fixed {len(matches)} segments in {f}')

    print(f'\nTotal: {fixed_total} segments fixed across {modified_files} files')

if __name__ == '__main__':
    main()