#!/usr/bin/env python3
"""
Fix LH pairing v20 - Much more aggressive EN/transliteration distinction.

Transliterated Hebrew has very distinctive patterns:
- Syllables separated by hyphens: ta-ra, ki-a-yul, sa-aroag
- Hebrew suffixes: -ee (my), -oo (his), -em (their), -ich (your), -nu (our), -uh (and)
- No real English articles/prepositions
- Looks like consonant strings, not English words
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

# Transliteration indicators
HYPHEN_SYL = re.compile(r'[a-z]{1,3}-[a-z]{1,4}')  # Short syllables with hyphens
HEBREW_SUFFIXES = re.compile(r'\b\w*(ee|oo|em|ich|nu|uh|aw|ei|ai|ey)\b', re.I)
TRANSLIT_WORDS = {'ailechu', 'eloaheem', 'nafshee', 'hashem', 'ki', 'al',
                  'afeekay', 'muyeem', 'saa', 'taaroag', 'ellu', 'eloah',
                  'chunnainee', 'riffu', 'eeshkirru', 'eshpichu', 'ulliy',
                  'eeshtoachu', 'eeshkirru', 'beekursa', 'haalo', 'eeshkir',
                  'eeshpich', 'vi', 'eesh', 'beek', 'chazak', 'haza', 'ee',
                  'kiya', 'ul', 'te', 'shem', 'ber', 'cha', 'la',
                  # Common Hebrew words transliterated
                  'baruch', 'atah', 'elokeinu', 'shem', 'mitzvah', 'shabbos',
                  'shalom', 'amein', 'hallel', 'hodo', 'ki', 'asher',
                  'baruch', 'ata', 'hashem', 'elokenu', 'melech', 'olam',
                  'tzivanu', 'al', 'mitzvat', 'vayomer', 'hinei', 'mah',
                  'tov', 'chet', 'pesha', 'avon', 'selah', 'hallelu',
                  'ya', 'od', 'yisrael', 'yisbarach', 'yitbarach',
                  'shacharit', 'minchah', 'arvit', 'tefillah',
                  'zichron', 'livracha', 'kmo', 'she', 'hu', 'hem',
                  'lazeh', 'la', 'lo', 'et', 'ein', 'ken', 'gam',
                  'ki', 'asher', 'im', 'ki', 'al', 'el', 'be', 'le',
                  'min', 'shem', 'kol', 'm', 'v', 'b', 'l', 'k', 's',
                  'sh', 'ch', 't', 'm', 'n', 'h', 'y', 'd', 'z', 'r',
                  'l', 'p', 'b', 'g', 'k', 'd', 's', 'v', 'f', 'c', 'w'}

def is_transliteration(text):
    """Check if text is transliterated Hebrew rather than English."""
    t = text.strip().lower()
    words = t.split()

    if len(words) < 3:
        return False

    # Count hyphenated syllables (strong transliteration indicator)
    hyph_count = sum(1 for w in words if HYPHEN_SYL.search(w))
    if hyph_count > len(words) * 0.25:
        return True

    # Count Hebrew suffix words
    suf_count = sum(1 for w in words if HEBREW_SUFFIXES.search(w))
    if suf_count > len(words) * 0.4:
        return True

    # Check for transliteration patterns: consonant-heavy, no vowels
    translit_score = sum(1 for w in words if w in TRANSLIT_WORDS)
    if translit_score > len(words) * 0.2:
        return True

    # Hashem/haloah etc without English structure
    if 'hashem' in t and 'the' not in t and 'is' not in t:
        if hyph_count > 0 or suf_count > len(words) * 0.2:
            return True

    # No English markers at all
    english_markers = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'in',
                       'to', 'for', 'and', 'but', 'or', 'that', 'this', 'with',
                       'from', 'has', 'have', 'had', 'be', 'been', 'not', 'no',
                       'will', 'would', 'could', 'should', 'may', 'can', 'must',
                       'if', 'then', 'than', 'also', 'very', 'much', 'many',
                       'each', 'every', 'all', 'some', 'only', 'own', 'same',
                       'such', 'just', 'about', 'lord', 'god', 'person',
                       'like', 'water', 'soul', 'crying', 'upon', 'blessed'}
    marker_count = len(set(w for w in words if w in english_markers))
    if marker_count < 2 and len(words) > 10:
        # Almost no English markers in a long text = likely transliteration
        return True

    return False

def is_real_english(text):
    """Return True if this is genuine English translation."""
    t = text.strip()
    if len(t) < 20:
        return False

    # Must be mostly ASCII
    alpha = [c for c in t if c.isalpha()]
    if not alpha:
        return False
    ascii_ratio = sum(1 for c in alpha if c.isascii()) / len(alpha)
    if ascii_ratio < 0.7:
        return False

    # No Hebrew
    if has_hebrew(t):
        return False

    # Must NOT be transliteration
    if is_transliteration(t):
        return False

    return True

def is_known_header(text):
    """Known section headers to skip."""
    t = text.lower().strip()
    return any(t.startswith(h) for h in [
        'hilchos ', 'na nach', 'siman ', 'seif ', 'osio ', 'volume ',
        'the laws ', 'oc ', 'yd ', 'eh ', 'cm ', 'like all',
        'naanach', 'segment', 'one stop', 'arranged by',
        'copyright', 'rough draft', 'free for all',
        'books of rabbi', 'table of contents',
        'each paragraph in', 'cross-reference', 'halocho',
    ])

def extract_real_en_paragraphs():
    """Extract ONLY genuine English paragraphs from all docx."""
    all_en = []
    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'):
            continue
        doc = Document(os.path.join(DOCX_DIR, df))
        file_en = []
        for p in doc.paragraphs:
            t = p.text.strip()
            if is_real_english(t) and not is_known_header(t):
                file_en.append(t)
        if file_en:
            # Show last few chars of first and last for verification
            print(f"  {df}: {len(file_en)} EN paras "
                  f"[{'...' + file_en[0][-30:]}, {'...' + file_en[-1][-30:]}]")
        all_en.extend(file_en)
    return all_en

def is_json_header(seg_he, seg_en):
    """Check if JSON segment is a header/title."""
    he = seg_he.strip()
    if he and len(he.split()) <= 2:
        return True
    return False

def main():
    print("=== Extracting genuine EN ===")
    docx_en = extract_real_en_paragraphs()
    print(f"\nTotal: {len(docx_en)} genuine EN paragraphs")

    print("\n=== Processing JSON ===")
    for part_dir in sorted(os.listdir(READER_DIR)):
        if not part_dir.startswith('part-'):
            continue
        part_path = os.path.join(READER_DIR, part_dir)
        jsfiles = sorted([f for f in os.listdir(part_path)
                          if f.endswith('.json') and f != 'index.json'])

        content_segs = []
        for jf in jsfiles:
            data = json.load(open(os.path.join(part_path, jf)))
            for i, seg in enumerate(data['segments']):
                he = seg.get('he', '').strip()
                if he and not is_json_header(he, seg.get('en', '')):
                    content_segs.append((jf, i, seg))

        # Assign EN
        fixed = 0
        for idx, (jf, seg_idx, seg) in enumerate(content_segs):
            if idx >= len(docx_en):
                break
            new_en = docx_en[idx]
            old_en = seg.get('en', '').strip()
            if new_en != old_en and len(new_en) > 15:
                seg['en'] = new_en
                fixed += 1

        print(f"  {part_dir}: {len(content_segs)} content segs, fixed {fixed}")

        # Write back
        for jf in jsfiles:
            filepath = os.path.join(part_path, jf)
            json.dump(json.load(open(filepath)), open(filepath, 'w'),
                      indent=2, ensure_ascii=False)

main()