#!/usr/bin/env python3
"""
Repair Likutay Tefilos: Fix date markers that have full prayer text assigned.
"""
import json, os, re

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'

# Hebrew month names (with nikud)
HEBREW_MONTHS = [
    'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
    'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'
]

# Hebrew month names (without nikud - partial matches)
HEBREW_MONTH_BARE = [
    'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
    'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'
]

def he_len_clean(text):
    """Get length of Hebrew text without spaces, nikud, etc."""
    # Remove nikud
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    # Remove maqaf
    text = text.replace('\u05BE', ' ')
    # Remove sof pasuk
    text = text.replace('\u05C3', '')
    # Remove all spaces
    return len(text.replace(' ', '').replace('\u200d', ''))

def is_hebrew_letter(s):
    """Check if string is a single Hebrew letter."""
    s = s.strip()
    if len(s) < 1 or len(s) > 4:
        return False
    # Remove nikud and check if it's a single Hebrew letter
    clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', s)
    return bool(re.fullmatch(r'[א-ת]{1,3}', clean.replace(' ', '')))

def looks_like_date(he_text):
    """Check if Hebrew text looks like a date marker."""
    if not he_text:
        return True

    # Remove nikud but preserve spaces
    cleaned = he_text
    cleaned = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', cleaned)
    cleaned = cleaned.replace('\u05BE', ' ')  # maqaf to space
    cleaned = cleaned.replace('\u200d', '')    # ZWNJ
    words = cleaned.split()

    if not words:
        return True

    # Check for Hebrew month names in the text
    joined = ''.join(words)
    for month in HEBREW_MONTHS:
        # Remove nikud from month for matching
        bare_month = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', month)
        if bare_month in ''.join(words):
            return True

    # First of month pattern: single letter + month
    if len(words) == 2:
        first, second = words
        # First word is a short Hebrew letter/number
        first_clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', first)
        if len(first_clean) <= 3:
            second_clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', second)
            for month in HEBREW_MONTH_BARE:
                if month in second_clean:
                    return True

    # Single letter or number
    if len(words) == 1:
        clean = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', words[0])
        if len(clean) <= 3:
            return True

    # Very short text
    text_len = he_len_clean(he_text)
    if text_len <= 5:
        return True

    return False

def is_clearly_mismatched(he_text, en_text):
    """Check if EN text is clearly wrong for this HE segment."""
    if not he_text or not en_text:
        return False

    he_len = he_len_clean(he_text)
    en_len = len(en_text.replace(' ', '').replace('\n', ''))

    if he_len == 0:
        return True

    # If HE is very short but EN is very long, it's a mismatch
    if he_len < 30 and en_len > 200:
        return True

    # Extreme ratio
    if he_len > 0 and en_len / he_len > 20:
        return True

    return False

def repair():
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
        if not segments:
            continue

        file_changed = False

        for seg in segments:
            he = seg.get('he', '').strip()
            en = seg.get('en', '').strip()

            if not he or not en:
                continue

            # Check if this is a date marker with full text
            if looks_like_date(he) and is_clearly_mismatched(he, en):
                print(f'  Clearing in {fn}: HE={repr(he[:60])} EN_len={len(en)}')
                seg['en'] = ''
                fixed += 1
                file_changed = True
                continue

        if file_changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
            modified += 1

    print(f'\nFixed {fixed} segments in {modified} files')

if __name__ == '__main__':
    repair()