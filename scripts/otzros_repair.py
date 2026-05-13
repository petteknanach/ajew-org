#!/usr/bin/env python3
"""
Smart re-pairing for Otzros Ramchal.

Problem: JSON has N Hebrew segments per Torah, but source HTML has M English paragraphs.
Proportional assignment was wrong - it assigned paragraph #3 to segment #3 even if
segment #3's content is discussed in paragraph #7.

Solution: For each Hebrew segment, find which English paragraph(s) actually discuss
the same content by matching Hebrew keywords in the English text.
"""
import json
import os
import re
import unicodedata

def strip_nikkud(text):
    """Remove vowel points from Hebrew."""
    return re.sub(r'[\u0591-\u05BD\u05BF-\u05C7]', '', text)

def normalize(text):
    """Normalize text for comparison."""
    t = strip_nikkud(text.lower().strip())
    t = re.sub(r'\s+', ' ', t)
    return t

def extract_keywords(text, min_len=4, max_len=20):
    """Extract significant Hebrew words for matching."""
    text = normalize(text)
    words = text.split()
    return [w for w in words if min_len <= len(w) <= max_len and not all(c in 'אבגדהוזחטיכלמנסעפצקרשת' for c in w)]

def hebrew_in_english(he_words, en_text):
    """Check how many significant Hebrew root words appear in the English text.
    This works because Breslov English translations often include transliterated
    Hebrew key terms."""
    en_lower = en_text.lower()
    matches = 0
    for hw in he_words:
        # Check the Hebrew root (typically 3-4 consonants)
        if len(hw) >= 3:
            # Direct match in English (for transliterated terms)
            if hw in en_lower:
                matches += 1
    return matches

def find_best_match(he_segment, en_paragraphs):
    """Find the best English paragraph match for a Hebrew segment."""
    he_keywords = extract_keywords(he_segment)
    if not he_keywords:
        return 0  # No significant keywords to match

    best_score = -1
    best_idx = 0

    for i, en_para in enumerate(en_paragraphs):
        score = hebrew_in_english(he_keywords, en_para)
        if score > best_score:
            best_score = score
            best_idx = i

    # Only match if at least one keyword matches
    if best_score >= 1:
        return best_idx
    return 0  # Default to first paragraph if no match found

def parse_otzros_html(html_path):
    """Parse Otzros Ramchal HTML and return section commentary paragraphs."""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract just the English block paragraphs between passage divs
    # Remove HTML tags and get clean text
    text = re.sub(r'<[^>]+>', '\n', content)
    text = re.sub(r'\n{3,}', '\n\n', text)

    lines = text.split('\n')
    paragraphs = []
    current = []
    for line in lines:
        line = line.strip()
        if not line:
            if current:
                paragraphs.append(' '.join(current))
                current = []
        else:
            current.append(line)
    if current:
        paragraphs.append(' '.join(current))

    # Filter: keep only non-header, non-TOC paragraphs with substantial length
    result = []
    for p in paragraphs:
        if len(p) > 30 and not p.startswith('Contents') and 'Torah' not in p[:20]:
            result.append(p)
    return result

def main():
    reader_dir = '/root/ajew-org/public/reader'
    html_dir = '/mnt/c/Users/Pettek/Downloads/Oatrzoas Ramchal'

    # Get the Hebrew source file to understand the relationship
    hebrew_source = '/root/ajew-org/public/reader/ramchal-otzros-ramchal/part-1/torah-1.json'
    data = json.load(open(hebrew_source))

    for seg in data['segments'][:5]:
        print(f"Seg {seg.get('num','?')}:")
        he = seg.get('he','').strip()
        en = seg.get('en','').strip()
        print(f"  HE ({len(he)} chars): {he[:100]}")
        print(f"  EN ({len(en)} chars): {en[:100]}")
        print()

    # Parse the matching HTML file
    html_file = html_dir + '/010_Bereishis_English.html'
    paragraphs = parse_otzros_html(html_file)
    print(f"Found {len(paragraphs)} significant paragraphs in HTML")
    print("\nFirst 5 paragraphs:")
    for i, p in enumerate(paragraphs[:5]):
        print(f"  P{i} ({len(p)} chars): {p[:150]}")

if __name__ == '__main__':
    main()