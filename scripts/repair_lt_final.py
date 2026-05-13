#!/usr/bin/env python3
"""Repair LT English pairings using content-based matching from HTML sources."""
import json, os, re
from html.parser import HTMLParser

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'
LT_HTML_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'

class HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.texts = []
        self.current = []

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'sup'):
            self.skip = True

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'sup'):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            t = data.strip()
            if t:
                self.current.append(t)

    def get_text(self):
        return ' '.join(self.current)

def clean_text(text):
    text = re.sub(r'&#x201[9cCdD]', lambda m: {"\u2019":"'","\u2018":"'","\u201c":'"','\u201d':'"'}.get(m.group(0),''), text)
    text = re.sub(r'\^T', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_html_text(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    parser = HTMLTextExtractor()
    parser.feed(content)
    return clean_text(parser.get_text())

def he_word_set(text):
    clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    clean = clean.replace('\u05BE', ' ').replace('\u05C3', '')
    words = re.findall(r'[\u0590-\u05FF]{3,}', clean)
    return set(w.lower() for w in words)

def en_word_set(text):
    text = re.sub(r'[\[\]]', ' ', text)
    words = re.findall(r'[a-zA-Z]{3,}', text)
    return set(w.lower() for w in words)

def match_score(he_words, en_words):
    if not he_words or not en_words:
        return 0
    direct = len(he_words & en_words)
    partial = sum(1 for h in he_words for e in en_words
                  if len(h) >= 4 and len(e) >= 4 and (h in e or e in h))
    return (direct + min(partial * 0.5, len(he_words) * 0.5)) / max(len(he_words), 1)

def split_sentences(text, target_count):
    """Split text into ~target_count sentences."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 20]

    if len(sentences) == target_count:
        return sentences
    if len(sentences) > target_count:
        # Group
        result = []
        per_group = len(sentences) / target_count
        for i in range(target_count):
            start = int(i * per_group)
            end = int(min((i + 1) * per_group, len(sentences)))
            result.append(' '.join(sentences[start:end]))
        return result
    # Fewer sentences - return as is, pad with empty
    while len(sentences) < target_count:
        sentences.append('')
    return sentences

def is_date_marker(he_text):
    clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', he_text)
    clean = clean.replace('\u05BE', ' ').replace('\u05C3', '')
    words = clean.split()
    joined = ''.join(words)
    # Check Hebrew months
    months = ['תשרי','חשון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיון','תמוז','אב','אלול']
    for m in months:
        bare_m = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', m)
        if bare_m in joined:
            return True
    # Short text
    clean_no_space = clean.replace(' ', '')
    if len(clean_no_space) <= 5:
        return True
    return False

def repair():
    print('Loading HTML sources...')
    html_texts = {}
    for fn in os.listdir(LT_HTML_DIR):
        if fn.endswith('.html') and fn != 'index.html':
            m = re.search(r'prayer\.?(\d+)', fn)
            if m:
                pnum = int(m.group(1))
                path = os.path.join(LT_HTML_DIR, fn)
                text = extract_html_text(path)
                if text:
                    if pnum not in html_texts:
                        html_texts[pnum] = []
                    html_texts[pnum].append(text)
                    print(f'  Prayer {pnum}: {len(text)} chars from {fn}')

    print(f'\nFound HTML for {len(html_texts)} prayers')

    total_fixed = 0
    for fn in sorted(os.listdir(LT_DATA_DIR)):
        if not fn.endswith('.json') or fn == 'index.json':
            continue
        fpath = os.path.join(LT_DATA_DIR, fn)
        try:
            data = json.load(open(fpath))
        except:
            continue
        segments = data.get('segments', [])

        m = re.search(r'prayer\.?(\d+)', fn)
        if not m:
            continue
        prayer_num = int(m.group(1))

        en_blocks = html_texts.get(prayer_num, [])
        if not en_blocks:
            continue

        # Count real segments (not date markers)
        real_segs = [(i, s) for i, s in enumerate(segments)
                     if s.get('he','').strip() and not is_date_marker(s.get('he','').strip())]

        if not real_segs:
            continue

        # Split blocks into chunks matching segments
        full_text = ' '.join(en_blocks)
        en_chunks = split_sentences(full_text, len(real_segs))

        # Match each chunk to its segment using content
        file_changed = False
        for idx, (seg_idx, seg) in enumerate(real_segs):
            if idx >= len(en_chunks):
                break
            he = seg.get('he', '').strip()
            current_en = seg.get('en', '').strip()
            candidate = en_chunks[idx]

            if not candidate:
                continue

            # Check current EN quality
            he_ws = he_word_set(he)
            cur_ws = en_word_set(current_en) if current_en else set()
            can_ws = en_word_set(candidate)

            cur_score = match_score(he_ws, cur_ws) if cur_ws else 0
            can_score = match_score(he_ws, can_ws)

            if can_score > cur_score and can_score > 0.05:
                seg['en'] = candidate
                file_changed = True
                total_fixed += 1

        if file_changed:
            json.dump(data, open(fpath, 'w'), indent=2, ensure_ascii=False)
            print(f'  Fixed {fn}')

    print(f'\nTotal: {total_fixed} segments fixed')

if __name__ == '__main__':
    repair()