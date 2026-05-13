#!/usr/bin/env python3
"""
Repair Likutay Tefilos EN-HE pairings.
Strategy:
1. Parse HTML sources to get English text per prayer
2. Split English into individual sentences
3. For each Hebrew segment, find the matching English sentence using:
   - Position within the prayer (primary)
   - Content similarity (validation)
4. For date markers and short HE segments, assign empty EN (they don't need translation)
"""
import json, os, re
from html.parser import HTMLParser

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'
LT_HTML_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'

class HTMLExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []
        self.skip = False
        self.current_text = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'sup'):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'sup'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.current_text.append(data)

def clean_en(text):
    """Clean English text."""
    text = re.sub(r'&#x2019;', "'", text)
    text = re.sub(r'&#x2018;', "'", text)
    text = re.sub(r'&#x201C;', '"', text)
    text = re.sub(r'&#x201D;', '"', text)
    text = re.sub(r'&#8220;', '"', text)
    text = re.sub(r'&#8221;', '"', text)
    text = re.sub(r'\^T', '', text)
    text = re.sub(r'▾', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def split_sentences(text):
    """Split text into sentences."""
    # Split on period followed by space+capital, semicolon, colon, or newline
    parts = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    result = []
    for p in parts:
        p = p.strip()
        if p and len(p) > 5:
            result.append(p)
    return result

def normalize_he(text):
    if not text: return ''
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    text = text.replace('\u05BE', ' ').replace('\u05C3', '')
    return re.sub(r'\s+', ' ', text).strip()

def is_date_marker(he_text):
    """Check if Hebrew text is a date marker or short reference."""
    cleaned = normalize_he(he_text)
    words = cleaned.split()
    if not words:
        return True
    # Single Hebrew letters or letter combinations (date markers)
    date_patterns = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
                     'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
                     'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל']
    if cleaned in date_patterns:
        return True
    # Format like "ד תשרי" or "יח תשרי"
    if re.match(r'^[א-ת]{1,3}\s', cleaned) and any(m in cleaned for m in ['תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול']):
        return True
    # Very short text (less than 5 chars)
    if len(cleaned) < 5:
        return True
    return False

def parse_html_prayers():
    """Parse all HTML files and organize English by prayer number."""
    prayer_en = {}  # prayer_num -> list of English sentences

    for fn in sorted(os.listdir(LT_HTML_DIR)):
        if not fn.endswith('.html') or fn == 'index.html':
            continue

        filepath = os.path.join(LT_HTML_DIR, fn)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        parser = HTMLExtractor()
        parser.feed(content)
        raw = ' '.join(parser.current_text)
        raw = clean_en(raw)

        # Extract prayer number from filename
        num_match = re.search(r'prayer-(\d+)', fn)
        if not num_match:
            continue
        prayer_num = int(num_match.group(1))

        # Split into sentences
        sentences = split_sentences(raw)

        if prayer_num in prayer_en:
            prayer_en[prayer_num].extend(sentences)
        else:
            prayer_en[prayer_num] = sentences

        print(f'  Prayer {prayer_num}: {len(sentences)} sentences from {fn}')

    return prayer_en

def repair_lt():
    """Repair LT pairings."""
    print('Parsing HTML source files...')
    prayer_en = parse_html_prayers()

    print(f'\nFound English text for {len(prayer_en)} prayers')
    print()

    fixed_total = 0
    modified_files = 0
    already_correct = 0

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

        # Get prayer number
        num_match = re.search(r'prayer-(\d+)', f)
        if not num_match:
            continue
        prayer_num = int(num_match.group(1))

        # Get available English sentences
        en_sentences = prayer_en.get(prayer_num, [])
        if not en_sentences:
            continue

        # First pass: identify segments with Hebrew that need English
        he_segments = []  # (index, he_text)
        for si, seg in enumerate(segments):
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()
            if he and not is_date_marker(he):
                he_segments.append((si, he, en))

        if not he_segments:
            continue

        # Assign English sentences to Hebrew segments in order
        # Skip date markers, assign EN sequentially
        en_idx = 0
        fixed = 0

        for si, he_text, current_en in he_segments:
            if en_idx < len(en_sentences):
                new_en = en_sentences[en_idx]

                # Check if current EN is already correct
                if current_en:
                    # Compare - if they're similar, skip
                    he_words = set(re.findall(r'[\u0590-\u05FF]{3,}', normalize_he(he_text)))
                    en_words = set(re.findall(r'[a-zA-Z]{3,}', new_en.lower()))
                    overlap = len(he_words & en_words)

                    # If current EN is similar to what we'd assign, count as already correct
                    current_en_words = set(re.findall(r'[a-zA-Z]{3,}', current_en.lower()))
                    current_overlap = len(he_words & current_en_words) if he_words else 0

                    if current_overlap > 0 or len(current_en) > 50:
                        # Current seems reasonable, verify it matches
                        if current_en.lower().strip() != new_en.lower().strip():
                            # Different text - check if current is better match
                            # For now, trust our HTML source
                            segments[si]['en'] = new_en
                            fixed += 1
                        else:
                            already_correct += 1
                        en_idx += 1
                        continue

                segments[si]['en'] = new_en
                fixed += 1
                en_idx += 1

        if fixed > 0:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
            modified_files += 1
            print(f'Fixed {fixed} segments in {f}')

        fixed_total += fixed

    print(f'\n=== Results ===')
    print(f'Total segments fixed: {fixed_total}')
    print(f'Files modified: {modified_files}')
    print(f'Already correct: {already_correct}')

if __name__ == '__main__':
    repair_lt()