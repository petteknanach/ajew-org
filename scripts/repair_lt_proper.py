#!/usr/bin/env python3
"""
Properly re-import English for Likutay Tefilos from HTML sources.
Strategy:
1. Parse HTML to get full prayer text
2. Split into logical sections (based on paragraph structure)
3. For each Hebrew segment, find the best matching English section
4. Assign EN based on content matching, not position
"""
import json, os, re, sys
from html.parser import HTMLParser

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'
LT_HTML_DIR = '/root/ajew-org/public/teachings/likutay-tefilos'

sys.path.insert(0, '/root/ajew-org/scripts')
# Reuse the Otzros import script's HTML parsing
from import_otzros_ramchal import HTMLTextExtractor

def clean_text(text):
    """Clean English text."""
    text = re.sub(r'&#x2019;', "'", text)
    text = re.sub(r'&#x2018;', "'", text)
    text = re.sub(r'&#x201C;', '"', text)
    text = re.sub(r'&#x201D;', '"', text)
    text = re.sub(r'&#8220;', '"', text)
    text = re.sub(r'&#8221;', '"', text)
    text = re.sub(r'\^T', '', text)
    text = re.sub(r'\u2020', '', text)  # dagger
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def get_html_english(path):
    """Get all English text blocks from an HTML file."""
    extractor = HTMLTextExtractor()
    extractor.extract(path)
    return extractor.texts()

def split_by_paragraphs(text):
    """Split text into paragraphs/sentences."""
    # Split by double newline (paragraph boundary)
    paragraphs = re.split(r'\n\s*\n', text)
    result = []
    for p in paragraphs:
        p = p.strip()
        if len(p) > 10:
            result.append(p)
    return result

def he_word_set(text):
    """Get set of significant Hebrew words."""
    clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    clean = clean.replace('\u05BE', ' ').replace('\u05C3', '')
    words = re.findall(r'[\u0590-\u05FF]{3,}', clean)
    return set(w.lower() for w in words if len(w) >= 3)

def en_word_set(text):
    """Get set of significant English words."""
    text = re.sub(r'[\[\]]', ' ', text)
    words = re.findall(r'[a-zA-Z]{3,}', text)
    return set(w.lower() for w in words if len(w) >= 3)

def content_match_score(he_words, en_words):
    """Calculate content match score between Hebrew and English word sets."""
    if not he_words or not en_words:
        return 0
    # Direct matches
    direct = len(he_words & en_words)
    # Partial matches (one word contained in another)
    partial = 0
    for h in he_words:
        for e in en_words:
            if len(h) >= 4 and len(e) >= 4:
                if h in e or e in h:
                    partial += 0.5
    total_he = len(he_words)
    return (direct + min(partial, total_he * 0.5)) / max(total_he, 1)

def find_best_en_match(he_text, en_options):
    """Find the best matching English text for a Hebrew segment."""
    he_words = he_word_set(he_text)
    if not he_words:
        return ''

    best_en = ''
    best_score = 0

    for en_text in en_options:
        en_words = en_word_set(en_text)
        score = content_match_score(he_words, en_words)

        # Bonus for length proportionality
        he_len = len(he_text.strip())
        en_len = len(en_text.strip())
        if he_len > 10 and en_len > 10:
            ratio = max(he_len, en_len) / max(min(he_len, en_len), 1)
            if ratio < 10:  # Reasonable ratio
                score += 0.1
            else:
                score -= 0.2

        if score > best_score:
            best_score = score
            best_en = en_text

    if best_score > 0.1:
        return best_en
    return ''

def repair_lt_properly():
    """Main repair function."""
    print('Repairing Likutay Tefilos with proper content matching...\n')

    # Load all HTML sources
    html_cache = {}
    for fn in sorted(os.listdir(LT_HTML_DIR)):
        if not fn.endswith('.html') or fn == 'index.html':
            continue
        path = os.path.join(LT_HTML_DIR, fn)
        try:
            texts = get_html_english(path)
            if texts:
                html_cache[fn] = texts
                print(f'  {fn}: {len(texts)} text blocks')
        except Exception as e:
            print(f'  {fn}: Error - {e}')

    if not html_cache:
        print('No HTML sources found!')
        return

    total_fixed = 0
    modified_files = 0

    for part in sorted(os.listdir(LT_DATA_DIR)):
        part_path = os.path.join(LT_DATA_DIR, part)
        if not os.path.isdir(part_path):
            continue

        for fn in sorted(os.listdir(part_path)):
            if not fn.endswith('.json') or fn == 'index.json':
                continue

            fpath = os.path.join(part_path, fn)
            try:
                data = json.load(open(fpath))
            except:
                continue

            segments = data.get('segments', [])
            if not segments:
                continue

            # Extract prayer number
            m = re.search(r'prayer.?(\d+)', fn)
            prayer_num = int(m.group(1)) if m else None

            # Collect all English text blocks from matching HTML files
            all_en_blocks = []
            for html_fn, texts in html_cache.items():
                html_m = re.search(r'prayer.?(\d+)', html_fn)
                html_prayer_num = int(html_m.group(1)) if html_m else None
                if html_prayer_num == prayer_num:
                    all_en_blocks.extend(texts)

            if not all_en_blocks:
                continue

            # Find segments that need fixing (have HE but no/incorrect EN)
            file_changed = False
            for seg in segments:
                he = (seg.get('he') or '').strip()
                en = (seg.get('en') or '').strip()

                if not he:
                    continue

                # Skip date markers
                he_clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', he)
                he_clean = he_clean.replace('\u05BE', ' ').replace('\u05C3', '')
                he_len = len(he_clean.replace(' ', '').replace('\u200d', ''))
                if he_len < 5:
                    continue

                # Check if EN needs fixing
                needs_fix = False
                if not en:
                    needs_fix = True
                elif len(en) > he_len * 20:
                    needs_fix = True
                    #print(f'  Mismatch in {fn}: hlen={he_len}, elen={len(en)}')

                if needs_fix:
                    # Find best match
                    best_en = find_best_en_match(he, all_en_blocks)
                    if best_en:
                        seg['en'] = best_en
                        total_fixed += 1
                        file_changed = True

            if file_changed:
                json.dump(data, open(fpath, 'w'), indent=2, ensure_ascii=False)
                modified_files += 1
                print(f'  Fixed {fn}')

    print(f'\nTotal: {total_fixed} segments fixed, {modified_files} files modified')

if __name__ == '__main__':
    repair_lt_properly()