#!/usr/bin/env python3
"""
Repair Likutay Tefilos: Fix date markers that have full prayer text assigned.
The issue is that date marker segments (short Hebrew like 'א לחודש', 'א תשרי')
were assigned full prayer English text during positional importing.
"""
import json, os, re

LT_DATA_DIR = '/root/ajew-org/public/reader/likutay-tefilos'

def normalize_he(text):
    if not text: return ''
    text = re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)
    text = text.replace('\u05BE', ' ').replace('\u05C3', '')
    return re.sub(r'\s+', ' ', text).strip().lower()

def is_date_marker(he_text):
    """Check if this is a date/occasion marker, not real content."""
    cleaned = normalize_he(he_text)
    if not cleaned or len(cleaned) < 3:
        return True
    # Single Hebrew letters (aleph, bet, gimel...)
    letters = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ','כא','כב','כג','כד','כה','כו','כז','כח','כט','ל','מ','מא','מב','מג','מד','מה','מו','מז','מח','מט','מי','מכ']
    if cleaned in letters:
        return True
    # Hebrew month names - dates like "ד תשרי"
    months = ['תשרי','חשון','כסלו','טבת','שבט','אדר','ניסן','אייר','סיון','תמוז','אב','אלול']
    if any(m in cleaned for m in months):
        return True
    # Common occasion headers
    occasions = ['ראש השנה', 'יום כפורים', 'סוכות', 'פסח', 'שבועות',
                 'ראש חודש', 'חול המועד', 'שבת', 'לילי הספירה', 'מוצאי שבת',
                 'ערב ראש השנה', 'ערב יום כפורים', 'הסליחות']
    if any(occ in cleaned for occ in occasions):
        return True
    return False

def is_clearly_mismatched(he_text, en_text):
    """Check if EN text is clearly wrong for this HE segment."""
    if not he_text or not en_text:
        return False

    he_clean = normalize_he(he_text)
    he_len = len(re.sub(r'\s', '', he_clean))

    if he_len == 0:
        return True

    en_len = len(re.sub(r'\s', '', en_text))

    # If HE is very short (<20 chars) but EN is very long (>500 chars), it's a mismatch
    if he_len < 20 and en_len > 500:
        return True

    # If EN/HE ratio is extreme (>10x for long HE, >20x for short HE)
    if he_len > 0:
        ratio = en_len / he_len
        if he_len < 50 and ratio > 20:
            return True
        if he_len > 50 and ratio > 10:
            return True

    return False

def repair():
    fixed = 0
    modified = 0
    already_good = 0

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

            if not he:
                continue

            # Check if this is a date marker with full text
            if is_date_marker(he):
                if en and len(en) > 20:
                    # Date marker shouldn't have full text - clear it
                    seg['en'] = ''
                    fixed += 1
                    file_changed = True
                    continue

            # Check if EN/HE ratio is terrible (full text assigned to short marker)
            if en and is_clearly_mismatched(he, en):
                seg['en'] = ''
                fixed += 1
                file_changed = True

            # Check: are some already correctly short?
            if he and en:
                he_len = len(re.sub(r'\s', '', normalize_he(he)))
                en_len = len(re.sub(r'\s', '', en))
                if 0.3 < (en_len / max(he_len, 1)) < 10:
                    already_good += 1

        if file_changed:
            json.dump(data, open(filepath, 'w'), indent=2, ensure_ascii=False)
            modified += 1

    print(f'Results:')
    print(f'  Fixed {fixed} segments (cleared date markers with full text)')
    print(f'  Modified {modified} files')
    print(f'  Already good ratio: {already_good}')

if __name__ == '__main__':
    repair()