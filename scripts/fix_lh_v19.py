#!/usr/bin/env python3
"""
Fix LH pairing v19 - Better filtering of EN vs transliterated text.

The docx has both:
1. Actual English translations: "Like a hind crying for water, my soul cries for You, O G-d"
2. Transliterated Hebrew: "Ki-a-yul taaroag al afeekay muyeem kain nafshee"

Transliteration patterns:
- Short words without English grammar (articles, prepositions)
- Hyphens between syllables (ta-ra, kee-a)
- Unusual consonant clusters
- No real English sentence structure
"""
from docx import Document
import json, os, re

DOCX_DIR = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos'
READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_hebrew_char(c): return '\u05D0' <= c <= '\u05EA'
def has_hebrew(t): return any(is_hebrew_char(c) for c in t)

def is_real_english(text):
    """Check if text is genuine English (not transliterated Hebrew)."""
    t = text.strip()
    if len(t) < 20: return False

    alpha = [c for c in t if c.isalpha()]
    if not alpha: return False
    ascii_ratio = sum(1 for c in alpha if c.isascii()) / len(alpha)
    if ascii_ratio < 0.7: return False

    words = t.split()

    # Transliteration patterns to exclude
    # 1. Hyphenated syllables (ka-yul, ta-ra)
    hyphen_count = sum(1 for w in words if '-' in w and len(w) > 3)
    if hyphen_count > len(words) * 0.3:
        return False

    # 2. Common transliteration prefixes/suffixes
    translit_indicators = ['-ee', '-oo', '-ay', '-uh', '-nu', '-eem', '-ich']
    translit_count = sum(1 for w in words for ind in translit_indicators if ind in w.lower())
    if translit_count > len(words) * 0.4:
        return False

    # 3. No real English structure - missing articles, prepositions, conjunctions
    # Real English usually has: the, a, an, is, are, of, in, to, for, and, etc.
    english_markers = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'in', 'to',
                       'for', 'and', 'but', 'or', 'that', 'this', 'with', 'from',
                       'has', 'have', 'had', 'be', 'been', 'being', 'do', 'does',
                       'did', 'will', 'would', 'could', 'should', 'may', 'might',
                       'shall', 'can', 'must', 'not', 'no', 'nor', 'so', 'if',
                       'then', 'than', 'also', 'very', 'much', 'many', 'some',
                       'any', 'each', 'every', 'all', 'both', 'few', 'other',
                       'only', 'own', 'same', 'such', 'just', 'about', 'up',
                       'out', 'into', 'over', 'after', 'before', 'between'}

    words_lower = set(w.lower().strip(".,;:!?\"'()[]{}") for w in words if len(w) > 2)
    marker_count = len(words_lower & english_markers)

    # Real English paragraphs typically have at least 2-3 English markers
    if marker_count < 2 and len(words) > 15:
        return False

    # 4. Check for actual English words (not just transliterated syllables)
    # Common English words that shouldn't appear in transliteration
    real_english = {'lord', 'god', 'hashem', 'person', 'must', 'will', 'like',
                    'water', 'soul', 'crying', 'upon', 'blessed', 'remember',
                    'mercy', 'throne', 'world', 'people', 'house', 'prayer',
                    'service', 'good', 'evil', 'heart', 'time', 'word', 'king',
                    'place', 'name', 'day', 'eye', 'hand', 'life', 'death',
                    'spirit', 'fear', 'love', 'truth', 'peace', 'joy', 'light'}

    text_lower = t.lower()
    real_word_count = sum(1 for w in real_english if w in text_lower)

    # If we find several real English words, it's likely genuine English
    if real_word_count >= 3:
        return True

    # 5. Fallback: if it has typical English sentence structure, accept it
    # Look for patterns like "X is Y", "X of Y", "to X Y", etc.
    has_english_structure = bool(re.search(
        r'\b(the|a|an)\s+\w+\s+(is|are|was|were|of|in|to|for|and|but|or|with|from)\b',
        t.lower()))
    if has_english_structure:
        return True

    return False

def is_known_header(text):
    """Check if text is a known section header."""
    t = text.lower().strip()
    headers = [
        'hilchos ', 'na nach', 'siman ', 'seif ', 'osio ', 'volume ',
        'introduction', 'likutay', 'a collection', 'the laws ', 'oc ',
        'yd ', 'eh ', 'cm ', 'like all', 'naanach', 'segment',
        'one stop', 'arranged by', 'copyright', 'rough draft',
        'free for all', 'books of rabbi', 'table of contents',
        'each paragraph in', 'cross-reference', 'halocho',
    ]
    return any(t.startswith(h) for h in headers)

def extract_real_en_paragraphs():
    """Extract ONLY genuine English translation paragraphs from all docx."""
    all_en = []

    for df in sorted(os.listdir(DOCX_DIR)):
        if not df.endswith('.docx'):
            continue

        doc = Document(os.path.join(DOCX_DIR, df))
        file_en = []

        for p in doc.paragraphs:
            t = p.text.strip()
            if len(t) < 15:
                continue
            if has_hebrew(t):
                continue
            if is_known_header(t):
                continue
            if is_real_english(t):
                file_en.append(t)

        all_en.extend(file_en)
        if file_en:
            print(f"  {df}: {len(file_en)} genuine EN paragraphs (first: {file_en[0][:50]}...)")

    return all_en

def is_json_header(seg_he, seg_en):
    """Check if JSON segment is a header/title."""
    he = seg_he.strip()
    en = seg_en.strip() if seg_en else ''

    if he and len(he.split()) <= 2:
        return True

    known_headers = {
        'Likutay Halachos', 'A Collection of Laws — Shulchan Aruch',
        'Volume 1 · Orach Chaim', 'An introduction from the author himself',
        'The Laws of Rising in the Morning — Halacha 1',
        'The Laws of Washing the Hands in the Morning — Halacha 1',
    }
    return en in known_headers

def main():
    print("=== Extracting genuine EN translations from docx ===\n")
    docx_en = extract_real_en_paragraphs()
    print(f"\nTotal genuine EN paragraphs: {len(docx_en)}")

    # Check sample
    print("\nSample paragraphs:")
    for i in range(min(5, len(docx_en))):
        print(f"  {i+1}: {docx_en[i][:80]}...")

    # Process JSON
    print("\n=== Processing JSON files ===\n")

    for part_dir in sorted(os.listdir(READER_DIR)):
        if not part_dir.startswith('part-'):
            continue

        part_path = os.path.join(READER_DIR, part_dir)
        jsfiles = sorted([f for f in os.listdir(part_path)
                          if f.endswith('.json') and f != 'index.json'])

        # Build content segment list
        content_segs = []
        headers = []

        for jf in jsfiles:
            data = json.load(open(os.path.join(part_path, jf)))
            for i, seg in enumerate(data['segments']):
                he = seg.get('he', '').strip()
                en = seg.get('en', '').strip()

                if not he or len(he) < 15:
                    continue

                if is_json_header(he, en):
                    headers.append((jf, i, seg))
                else:
                    content_segs.append((jf, i, seg))

        print(f"{part_dir}: {len(headers)} headers, {len(content_segs)} content segs")

        # Assign EN to content segments
        fixed = 0
        for idx, (jf, seg_idx, seg) in enumerate(content_segs):
            if idx >= len(docx_en):
                break

            new_en = docx_en[idx]
            old_en = seg.get('en', '').strip()

            if new_en != old_en and len(new_en) > 15:
                seg['en'] = new_en
                fixed += 1

        print(f"  Fixed: {fixed} content segments")

        # Write back all files
        for jf in jsfiles:
            filepath = os.path.join(part_path, jf)
            json.dump(json.load(open(filepath)), open(filepath, 'w'),
                      indent=2, ensure_ascii=False)

main()