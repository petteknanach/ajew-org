#!/usr/bin/env python3
"""Repair LT EN-HE pairings."""
import json, os, re
from html.parser import HTMLParser

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'
LT_HTML_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'

class HTMLExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
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
    text = re.sub(r'&#x2019;', "'", text)
    text = re.sub(r'&#x2018;', "'", text)
    text = re.sub(r'&#x201C;', '"', text)
    text = re.sub(r'&#x201D;', '"', text)
    text = re.sub(r'&#8220;', '"', text)
    text = re.sub(r'&#8221;', '"', text)
    text = re.sub(r'\^T', '', text)
    text = re.sub(r'\u2020', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def split_sentences(text):
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
    cleaned = normalize_he(he_text)
    words = cleaned.split()
    if not words:
        return True
    date_letters = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ','כא','כב','כג','כד','כה','כו','כז','כח','כט','ל']
    if cleaned in date_letters:
        return True
    if re.match(r'^[א-ת]{1,3}\s', cleaned) and any(m in cleaned for m in ['תשרי','חשון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיון','תמוז','אב','אלול']):
        return True
    if len(cleaned) < 5:
        return True
    return False

def parse_html_prayers():
    prayer_en = {}
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
        # Extract prayer number - try multiple patterns
        m = re.search(r'prayer.?(\d+)', fn)
        if not m:
            continue
        prayer_num = int(m.group(1))
        sentences = split_sentences(raw)
        prayer_en[prayer_num] = sentences
        print(f'  Prayer {prayer_num}: {len(sentences)} sentences from {fn}')
    return prayer_en

def repair_lt():
    print('Parsing HTML sources...')
    prayer_en = parse_html_prayers()
    print(f'\nFound English for {len(prayer_en)} prayers')

    fixed_total = 0
    modified = 0

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
        m = re.search(r'prayer.?(\d+)', f)
        if not m:
            continue
        prayer_num = int(m.group(1))
        en_sentences = prayer_en.get(prayer_num, [])
        if not en_sentences:
            continue

        # First pass: identify real Hebrew content vs date markers/headers
        real_segments = []  # (index, he, current_en)
        empty_segs = []
        for si, seg in enumerate(segments):
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()
            if is_date_marker(he):
                continue  # Skip date markers
            if not he and en:
                continue  # Title pages with EN only
            if he and not en:
                real_segments.append((si, he, en))
            elif he and en:
                real_segments.append((si, he, en))

        # Assign EN sentences to real segments in order
        if len(real_segments) <= len(en_sentences) and len(en_sentences) > 0:
            changed = False
            for idx, (si, he_text, current_en) in enumerate(real_segments):
                if idx < len(en_sentences):
                    new_en = en_sentences[idx]
                    if current_en != new_en:
                        segments[si]['en'] = new_en
                        changed = True
            if changed:
                json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
                fixed_total += sum(1 for idx, (si, h, e) in enumerate(real_segments) if idx < len(en_sentences) and e != en_sentences[idx])
                modified += 1
                print(f'Fixed {f}: {sum(1 for idx, (si, h, e) in enumerate(real_segments) if idx < len(en_sentences) and e != en_sentences[idx])} segments')

    print(f'\nTotal: {fixed_total} segments fixed, {modified} files')

if __name__ == '__main__':
    repair_lt()