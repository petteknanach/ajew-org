#!/usr/bin/env python3
"""
fix_yichud_hayirah_final.py — Fix section-N.json files for Yichud HaYirah

The reader loads section-N.json from the book root.
Mapping:
  section-1 = Introduction (EN-only, no Hebrew source — this is correct)
  section-2 = Part 1 (HE from corrected HTML)
  section-3 = Part 2A (HE from corrected HTML)
  section-4 = Part 2B (HE from corrected HTML)
  section-5 = Part 3 (HE from corrected HTML)
"""

import json, re
from bs4 import BeautifulSoup, Comment
from pathlib import Path

SOURCE_DIR = Path('/mnt/c/Users/Pettek/Downloads/YIchud HaYeeruh - Ramchal')
READER_DIR = Path('/root/ajew-org/public/reader/ramchal-yichud-hayeeruh')

H_START, H_END = 0x05D0, 0x05EA

def is_heb_char(c):
    return H_START <= ord(c) <= H_END

def heb_ratio(text):
    alpha = [ch for ch in text if ch.isalpha()]
    if not alpha: return 0.0
    return sum(1 for ch in alpha if is_heb_char(ch)) / len(alpha)

def extract_he_paragraphs(he_html_path):
    with open(he_html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    body = soup.body
    pw = body.find('div', class_='page-wrap') or body

    paras = []
    found_comment = False
    for el in pw.recursiveChildGenerator():
        if isinstance(el, Comment) and 'CORRECTED TEXT' in str(el).upper():
            found_comment = True
            continue
        if isinstance(el, Comment):
            continue
        if not found_comment:
            continue
        if isinstance(el, str) or not hasattr(el, 'name') or not el.name:
            continue
        if el.name not in ('p', 'h3', 'h4', 'h2', 'blockquote'):
            continue
        text = el.get_text(' ', strip=True)
        if not text or len(text) < 3:
            continue
        if 'OCR' in text and '→' in text:
            continue
        if heb_ratio(text) > 0.4:
            text = re.sub(r'\s*\[[^\]]*\]', '', text).strip()
            if len(text) >= 3:
                paras.append(text)
    if paras:
        deduped = []
        prev = ''
        for p in paras:
            if p != prev: deduped.append(p)
            prev = p
        return deduped

    paras = []
    past_ocr = False
    for el in pw.find_all(['p', 'h2', 'h3', 'h4', 'blockquote'], recursive=True):
        text = el.get_text(' ', strip=True)
        if not text or len(text) < 3:
            continue
        if 'לוח תיקוני OCR' in text:
            past_ocr = True
            continue
        if not past_ocr:
            continue
        if 'OCR' in text and '→' in text:
            continue
        if 'ערות שוליים' in text:
            break
        if heb_ratio(text) > 0.4:
            text = re.sub(r'\s*\[[^\]]*\]', '', text).strip()
            if len(text) >= 3:
                paras.append(text)
    deduped = []
    prev = ''
    for p in paras:
        if p != prev: deduped.append(p)
        prev = p
    return deduped


def main():
    print("=" * 70)
    print("YICHUD HAYEERUH — Final Fix (section-N.json)")
    print("=" * 70)

    he_sources = {
        'section-1': None,
        'section-2': SOURCE_DIR / '101_Yichud_HaYeeruh_Part1_TheYichud_HebrewCorrected.html',
        'section-3': SOURCE_DIR / '201_Yichud_HaYeeruh_Part2A_ZoharAndSeal_HebrewCorrected.html',
        'section-4': SOURCE_DIR / '211_Yichud_HaYeeruh_Part2B_ChainDescentAndCommentary_HebrewCorrected.html',
        'section-5': SOURCE_DIR / '301_Yichud_HaYeeruh_Part3_PeirushHaYichud_HebrewCorrected.html',
    }

    he_cache = {}
    for sec, src in he_sources.items():
        if src is None:
            he_cache[sec] = []
            print(f"\n{sec}: No HE source (English introduction)")
        else:
            he_cache[sec] = extract_he_paragraphs(src)
            print(f"\n{sec}: {len(he_cache[sec])} HE paragraphs from {src.name}")

    # Process each section
    for sec_num in range(1, 6):
        sec_name = f'section-{sec_num}'
        he_paras = he_cache[sec_name]
        jpath = READER_DIR / f'{sec_name}.json'
        if not jpath.exists():
            continue

        data = json.load(open(jpath))
        segs = data['segments']

        # Count needs
        needs = []
        for i, s in enumerate(segs):
            he = s.get('he', '').strip()
            en = s.get('en', '').strip()
            if not he and en:
                needs.append(i)

        print(f"\n  {jpath.name}: {len(segs)} segs, {len(needs)} missing HE, {len(he_paras)} HE avail")

        if sec_name == 'section-1':
            print("    (Introduction — no Hebrew source exists, these are expected)")
            continue

        # Assign HE positionally to all segments needing it
        hidx = 0
        for seg_idx in needs:
            if hidx >= len(he_paras):
                print(f"    WARNING: Out of HE at seg {seg_idx}")
                break
            segs[seg_idx]['he'] = he_paras[hidx].strip()
            hidx += 1

        # Also fix EN where it's missing but HE exists
        for s in segs:
            if s.get('he', '').strip() and not s.get('en', '').strip():
                # Skip — these are Hebrew-only headers/markers
                pass

        with open(jpath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    # Audit
    print(f"\n{'=' * 70}")
    print("AUDIT")
    print(f"{'=' * 70}")

    import glob as gl
    totals = {'segs': 0, 'paired': 0, 'no_he': 0, 'no_en': 0}
    for sec_num in range(1, 6):
        jpath = READER_DIR / f'section-{sec_num}.json'
        data = json.load(open(jpath))
        segs = data['segments']
        no_he = sum(1 for s in segs if not s.get('he','').strip() and s.get('en','').strip())
        no_en = sum(1 for s in segs if s.get('he','').strip() and not s.get('en','').strip())
        both = sum(1 for s in segs if s.get('he','').strip() and s.get('en','').strip())
        totals['segs'] += len(segs)
        totals['paired'] += both
        totals['no_he'] += no_he
        totals['no_en'] += no_en
        pct = both / len(segs) * 100 if segs else 0
        st = "✓" if no_he == 0 else "!"
        sec_name = f'section-{sec_num}'
        title = data.get('title', sec_name)
        print(f"  {st} {jpath.name} ({title}): {len(segs)} segs, paired={both} ({pct:.0f}%), no_he={no_he}, no_en={no_en}")

    print(f"\n  TOTALS: {totals['segs']} segs, {totals['paired']} paired, {totals['no_he']} no_he, {totals['no_en']} no_en")
    denom = totals['paired'] + totals['no_he']
    if denom > 0:
        print(f"  HE coverage: {totals['paired']}/{denom} = {totals['paired']/denom*100:.1f}%")


if __name__ == '__main__':
    main()