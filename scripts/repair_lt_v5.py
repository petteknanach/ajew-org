#!/usr/bin/env python3
"""
Repair LT pairings: split HTML English into sentences, match to Hebrew segments.
Key: don't assign whole-paragraph EN to individual HE segments. Instead,
split the EN into logical chunks that correspond to the Hebrew structure.
"""
import json, os, re
from html.parser import HTMLParser

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'
LT_HTML_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'

class HTMLExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.texts = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'sup'):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'sup'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.texts.append(data)

def extract_html_prayer(filename):
    """Read HTML and return clean English text paragraphs."""
    filepath = os.path.join(LT_HTML_DIR, filename)
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    parser = HTMLExtractor()
    parser.feed(content)
    raw = ' '.join(parser.texts)
    raw = re.sub(r'&#x2019;', "'", raw)
    raw = re.sub(r'&#x2018;', "'", raw)
    raw = re.sub(r'&#x201C;', '"', raw)
    raw = re.sub(r'&#x201D;', '"', raw)
    raw = re.sub(r'&#8220;', '"', raw)
    raw = re.sub(r'&#8221;', '"', raw)
    raw = re.sub(r'\^T', '', raw)
    raw = re.sub(r'\u2020', '', raw)
    raw = re.sub(r'\s+', ' ', raw).strip()
    return raw

def normalize_he(text):
    if not text: return ''
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    text = text.replace('\u05BE', ' ').replace('\u05C3', '')
    return re.sub(r'\s+', ' ', text).strip().lower()

def he_word_set(text):
    return set(re.findall(r'[\u0590-\u05FF]{4,}', normalize_he(text)))

def en_phrase_words(text):
    return set(re.findall(r'[a-zA-Z]{4,}', text.lower()))

def split_html_to_sentences(html_text, num_segments):
    """Split HTML text into roughly num_segments equal parts by sentence."""
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', html_text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]

    if not sentences:
        return [html_text] * num_segments

    # If we have exactly the right number, return them
    if len(sentences) == num_segments:
        return sentences

    # If more sentences than segments, group them
    result = []
    if len(sentences) > num_segments:
        # Group sentences evenly
        per_group = len(sentences) / num_segments
        for i in range(num_segments):
            start = int(i * per_group)
            end = int((i + 1) * per_group)
            group = ' '.join(sentences[start:end])
            result.append(group)
    else:
        # Fewer sentences than segments - distribute
        result = list(sentences)
        while len(result) < num_segments:
            result.append('')

    return result

def is_date_marker(he_text):
    """Identify date markers and short structural segments."""
    cleaned = normalize_he(he_text)
    if not cleaned or len(cleaned) < 3:
        return True
    # Single Hebrew letters
    if cleaned in ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ','כא','כב','כג','כד','כה','כו','כז','כח','כט','ל']:
        return True
    # Hebrew month names indicate date
    months = ['תשרי','חשון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיון','תמוז','אב','אלול']
    if any(m in cleaned for m in months):
        return True
    return False

def repair_lt():
    """Repair Likutay Tefilos EN pairings."""
    print('Repairing Likutay Tefilos...\n')

    fixed = 0
    modified = 0

    for fn in sorted(os.listdir(LT_DATA_DIR)):
        if not fn.endswith('.json') or fn == 'index.json':
            continue

        filepath = os.path.join(LT_DATA_DIR, fn)
        try:
            data = json.load(open(filepath))
        except:
            continue

        segments = data.get('segments', [])

        # Find corresponding HTML file
        num_match = re.search(r'prayer.?(\d+)', fn)
        if not num_match:
            continue
        prayer_num = int(num_match.group(1))

        # Find HTML file
        html_file = None
        for html_fn in os.listdir(LT_HTML_DIR):
            if html_fn.endswith('.html'):
                m = re.search(r'prayer.?(\d+)', html_fn)
                if m and int(m.group(1)) == prayer_num:
                    html_file = html_fn
                    break

        if not html_file:
            continue

        # Get HTML English text
        en_text = extract_html_prayer(html_file)
        if not en_text:
            continue

        # Count non-date-marker segments
        real_segs = []
        for si, seg in enumerate(segments):
            he = seg.get('he', '').strip()
            if he and not is_date_marker(he):
                real_segs.append((si, he))

        # Split English text into chunks
        en_chunks = split_html_to_sentences(en_text, len(real_segs))

        # Now match by content similarity
        # Check current pairings too
        file_changed = False
        for idx, (si, he_text) in enumerate(real_segs):
            if idx >= len(en_chunks):
                break

            current_en = segments[si].get('en', '').strip()
            candidate_en = en_chunks[idx]

            if not candidate_en:
                continue

            # Check if current is clearly wrong
            he_words = he_word_set(he_text)
            current_en_words = en_phrase_words(current_en)
            candidate_en_words = en_phrase_words(candidate_en)

            # Calculate match scores
            with_he = len(he_words & current_en_words) if current_en_words else 0
            with_candidate = len(he_words & candidate_en_words) if candidate_en_words else 0

            # Check for clearly mismatched pairings
            # Current pairing is bad if: EN is way too long for HE, or no overlap
            current_bad = False
            if he_text and current_en:
                he_len = len(he_text.replace(' ', ''))
                en_len = len(current_en.replace(' ', ''))
                if en_len > he_len * 5 and len(he_text) < 50:
                    current_bad = True
                elif with_he == 0 and len(he_words) > 0 and len(current_en_words) > 0:
                    # Try partial match
                    has_partial = False
                    for hw in he_words:
                        for ew in current_en_words:
                            if hw[:4] == ew[:4] or ew in hw or hw in ew:
                                has_partial = True
                                break
                        if has_partial:
                            break
                    if not has_partial:
                        current_bad = True

            if current_bad and with_candidate > with_he:
                segments[si]['en'] = candidate_en
                file_changed = True
                fixed += 1

        if file_changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
            modified += 1
            print(f'  Fixed {fn}: {fixed} total')

    print(f'\nDone. Fixed {fixed} segments in {modified} files')

if __name__ == '__main__':
    repair_lt()