#!/usr/bin/env python3
"""
fix_yichud_hayirah_v3 — Complete fix for all Yichud HaYirah parts
Handles: Part 1 (torah 1-5), Part 2A + 2B, Part 3
Two source formats:
  - Part 1: CORRECTED TEXT comment marker separates OCR log from text
  - Parts 2A/B, 3: Hebrew starts right after OCR log header (no comment marker)
"""

import json, os, re, sys
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

def extract_he_from_html(path):
    with open(path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    body = soup.body
    pw = body.find('div', class_='page-wrap') or body

    paragraphs = []

    # Strategy A: look for CORRECTED TEXT comment
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
        if el.name not in ('p', 'h3', 'h4', 'h2'):
            continue
        text = el.get_text(' ', strip=True)
        if not text or len(text) < 3:
            continue
        if 'OCR' in text and '→' in text:
            continue
        if heb_ratio(text) > 0.4:
            text = re.sub(r'\s*\[[^\]]*\]', '', text).strip()
            if len(text) >= 3:
                paragraphs.append(text)

    if found_comment and paragraphs:
        # Deduplicate
        deduped = []
        prev = ''
        for p in paragraphs:
            if p != prev:
                deduped.append(p)
                prev = p
        return deduped

    # Strategy B: skip OCR log section, take everything Hebrew after
    paragraphs = []
    past_ocr = False
    for el in pw.find_all(['p', 'h2', 'h3', 'h4'], recursive=True):
        text = el.get_text(' ', strip=True)
        if not text or len(text) < 3:
            continue

        # OCR log header — after this, content starts
        if 'לוח תיקוני OCR' in text:
            past_ocr = True
            continue

        if not past_ocr:
            continue

        # Skip remaining OCR log entries
        if 'OCR' in text and ('→' in text):
            continue

        # Skip footnotes section
        if 'ערות שוליים' in text or 'FOOTNOTES' in text.upper():
            break

        hratio = heb_ratio(text)
        if hratio > 0.4:
            text = re.sub(r'\s*\[[^\]]*\]', '', text).strip()
            if len(text) >= 3:
                paragraphs.append(text)

    # Dedup
    deduped = []
    prev = ''
    for p in paragraphs:
        if p != prev:
            deduped.append(p)
            prev = p
    return deduped


def assign_he(segments, he_paras, label=""):
    needs = []
    for i, s in enumerate(segments):
        he = s.get('he','').strip()
        en = s.get('en','').strip()
        if not he and en:
            needs.append((i, en))
    print(f"    {label}: {len(segments)} segs, {len(needs)} need HE, {len(he_paras)} HE para(s)")
    hidx = 0
    for seg_idx, _ in needs:
        if hidx >= len(he_paras):
            print(f"      Ran out of HE at seg {seg_idx}")
            break
        segments[seg_idx]['he'] = he_paras[hidx].strip()
        hidx += 1
    return hidx


def main():
    print("=" * 70)
    print("YICHUD HAYEERUH FIX v3")
    print("=" * 70)

    # Show source files
    for f in sorted(SOURCE_DIR.glob('*HebrewCorrected*')):
        print(f"  HE source: {f.name} ({f.stat().st_size:,} bytes)")

    # Part 1
    print("\n--- PART 1 ---")
    he1 = extract_he_from_html(SOURCE_DIR / '101_Yichud_HaYeeruh_Part1_TheYichud_HebrewCorrected.html')
    print(f"  HE paragraphs: {len(he1)}")
    for i in range(min(3, len(he1))):
        print(f"    [{i}] {he1[i][:60]}...")

    p1dir = READER_DIR / 'part-1'
    for name in ['torah-1','torah-2','torah-3','torah-4','torah-5']:
        jp = p1dir / f'{name}.json'
        if not jp.exists(): continue
        data = json.load(open(jp))
        segs = data['segments']
        assign_he(segs, he1, name)
        with open(jp, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    # Part 2A
    print("\n--- PART 2A ---")
    he2a = extract_he_from_html(SOURCE_DIR / '201_Yichud_HaYeeruh_Part2A_ZoharAndSeal_HebrewCorrected.html')
    print(f"  HE paragraphs: {len(he2a)}")
    for i in range(min(3, len(he2a))):
        print(f"    [{i}] {he2a[i][:60]}...")

    p2dir = READER_DIR / 'part-2'
    if p2dir.is_dir():
        for jp in sorted(p2dir.glob('*.json')):
            if jp.name == 'index.json': continue
            data = json.load(open(jp))
            segs = data.get('segments', [])
            if segs:
                assign_he(segs, he2a, jp.name)
                with open(jp, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

    # Part 2B — use same part-2 directory
    print("\n--- PART 2B ---")
    he2b = extract_he_from_html(SOURCE_DIR / '211_Yichud_HaYeeruh_Part2B_ChainDescentAndCommentary_HebrewCorrected.html')
    print(f"  HE paragraphs: {len(he2b)}")
    # Only process files that still need HE
    if p2dir.is_dir():
        for jp in sorted(p2dir.glob('*.json')):
            if jp.name == 'index.json': continue
            data = json.load(open(jp))
            segs = data.get('segments', [])
            needs = sum(1 for s in segs if not s.get('he','').strip() and s.get('en','').strip())
            if needs > 0:
                assign_he(segs, he2b, jp.name + "(2b)")
                with open(jp, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)

    # Part 3
    print("\n--- PART 3 ---")
    he3 = extract_he_from_html(SOURCE_DIR / '301_Yichud_HaYeeruh_Part3_PeirushHaYichud_HebrewCorrected.html')
    print(f"  HE paragraphs: {len(he3)}")
    for i in range(min(3, len(he3))):
        print(f"    [{i}] {he3[i][:60]}...")

    p3dir = READER_DIR / 'part-3'
    if p3dir.is_dir():
        for jp in sorted(p3dir.glob('*.json')):
            if jp.name == 'index.json': continue
            data = json.load(open(jp))
            segs = data.get('segments', [])
            assign_he(segs, he3, jp.name)
            with open(jp, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    # Audit
    print(f"\n{'=' * 70}")
    print("FINAL AUDIT")
    print(f"{'=' * 70}")
    import glob as gl
    totals = {'segs':0,'paired':0,'no_he':0,'no_en':0}
    for jf_path in sorted(gl.glob(str(READER_DIR / 'part-*' / '*.json'))):
        if '/index.json' in jf_path: continue
        data = json.load(open(jf_path))
        segs = data.get('segments', data.get('content', []))
        if not isinstance(segs, list): continue
        no_he = sum(1 for s in segs if not s.get('he','').strip() and s.get('en','').strip())
        no_en = sum(1 for s in segs if s.get('he','').strip() and not s.get('en','').strip())
        both = sum(1 for s in segs if s.get('he','').strip() and s.get('en','').strip())
        totals['segs']+=len(segs); totals['paired']+=both; totals['no_he']+=no_he; totals['no_en']+=no_en
        pct = both/len(segs)*100 if segs else 0
        st = "✓" if no_he==0 else "!"
        print(f"  {st} {Path(jf_path).name}: {len(segs)} segs, paired={both} ({pct:.0f}%), missing_he={no_he}")
    print(f"\n  TOTAL: {totals['segs']} segs, {totals['paired']} paired, {totals['no_he']} no_he, {totals['no_en']} no_en")

if __name__ == '__main__':
    main()