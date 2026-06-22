#!/usr/bin/env python3
"""Import perfectly numbered Hilchos Tefillin HE/EN paragraphs from the latest Volume 2 DOCX files."""
import json
import re
import zipfile
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
EN_DOCX = Path('/mnt/c/Users/Pettek/Downloads/Likutay Halachos English volume 2 - orach chaim 1-2 - 6 Tamuz.docx')
HE_DOCX = Path('/mnt/c/Users/Pettek/Downloads/Likutay Halachos Hebrew volume 2 - Orach Chaim 1-2 - 6 Tamuz.docx')
OUT_DIR = REPO / 'public/reader/likutay-halachos/part-1'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

# Website halacha file numbers for Orach Chaim part 1, Hilchos Tefillin 1-7.
TARGETS = {
    1: OUT_DIR / 'halacha-18.json',
    2: OUT_DIR / 'halacha-19.json',
    3: OUT_DIR / 'halacha-20.json',
    4: OUT_DIR / 'halacha-21.json',
    5: OUT_DIR / 'halacha-22.json',
    6: OUT_DIR / 'halacha-23.json',
    7: OUT_DIR / 'halacha-24.json',
}
HE_TITLES = {
    1: 'תפילין א',
    2: 'תפילין ב',
    3: 'תפילין ג',
    4: 'תפילין ד',
    5: 'תפילין ה',
    6: 'תפילין ו',
    7: 'תפילין ז',
}

HEADING_RE = re.compile(r'^\s*(?:הלכות תפילין - הלכה|הלכה)\s+([א-ז])\s*$')
HE_LETTER_TO_NUM = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7}
NUM_RE = re.compile(r'^\[(\d+)\]\s*(.*)$', re.S)
NIKUD_RE = re.compile(r'[\u0591-\u05C7]')

def strip_nikud(text: str) -> str:
    text = unicodedata.normalize('NFC', text)
    return NIKUD_RE.sub('', text)

def docx_paragraphs(path: Path):
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out = []
    for p in root.iter(W + 'p'):
        txt = ''.join((t.text or '') for t in p.iter(W + 't')).strip()
        if txt:
            out.append(re.sub(r'\s+', ' ', txt))
    return out

def numbered_by_halacha(path: Path, lang: str):
    current = None
    out = {i: {} for i in range(1, 8)}
    for txt in docx_paragraphs(path):
        if lang == 'he':
            m_head = HEADING_RE.match(txt)
            if m_head:
                current = HE_LETTER_TO_NUM[m_head.group(1)]
                continue
        else:
            # Body headings look like "Hilchos TefillinHalacha 5" in the DOCX text extraction.
            m_head = re.match(r'^Hilchos Tefillin\s*Halacha\s*([1-7])\s*$', txt)
            if m_head:
                current = int(m_head.group(1))
                continue
        m = NUM_RE.match(txt)
        if not m or current is None or current not in out:
            continue
        num = int(m.group(1))
        body = m.group(2).strip()
        # Exclude any accidental post-body material; only keep paragraphs under the seven halacha headings.
        out[current][num] = body
    return out

def main():
    en = numbered_by_halacha(EN_DOCX, 'en')
    he = numbered_by_halacha(HE_DOCX, 'he')
    total = 0
    for h in range(1, 8):
        if set(en[h]) != set(he[h]):
            raise SystemExit(f'number mismatch halacha {h}: en-only={sorted(set(en[h])-set(he[h]))[:20]} he-only={sorted(set(he[h])-set(en[h]))[:20]}')
        path = TARGETS[h]
        data = json.loads(path.read_text(encoding='utf-8'))
        segments = []
        for n in sorted(he[h]):
            he_nikud = he[h][n]
            segments.append({
                'index': n,
                'he': strip_nikud(he_nikud),
                'en': en[h][n],
                'he_nikud': he_nikud,
            })
        data['title'] = HE_TITLES[h]
        data['hebrewTitle'] = HE_TITLES[h]
        data['segments'] = segments
        data['totalParagraphs'] = len(segments)
        data['hasEnglish'] = True
        data['hasNikud'] = True
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{path.relative_to(REPO)}: {len(segments)} segments {segments[0]["index"]}-{segments[-1]["index"]}')
        total += len(segments)
    print(f'Imported {total} matched HE/EN Tefillin paragraphs from DOCX files.')

if __name__ == '__main__':
    main()
