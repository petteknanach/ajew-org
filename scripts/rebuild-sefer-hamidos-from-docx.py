#!/usr/bin/env python3
"""Rebuild Sefer HaMidos reader JSON from the local authoritative Hebrew/English DOCX.

Source: /mnt/c/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/
        Sefer Hamidos updated Continuous Hebrew English 2021 version.docx

The DOCX is already bilingual and numbered in English. This script keeps every
teaching as an individual shareable reader segment, with a unique anchor index
and a clear display label (1, 2, II-1, etc.).
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DOCX = Path('/mnt/c/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/Sefer Hamidos updated Continuous Hebrew English 2021 version.docx')
OUT = ROOT / 'public/reader/sefer-hamidos'
CATALOG = ROOT / 'public/reader/catalog.json'

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
HE_RE = re.compile(r'[\u0590-\u05ff]')
NIKUD_RE = re.compile(r'[\u0591-\u05C7]')
EN_NUM_RE = re.compile(r'^(\d{1,3})\.\s*(.+)$')
ROMAN_RE = re.compile(r'^[IVXLC]+\.?$', re.I)

SPECIAL_HEADERS = {
    'SECOND PART', 'SECOND PART:', 'PART II', 'PART TWO', 'PART TWO:',
    'APPENDIX', 'INTRODUCTION', 'SECOND INTRODUCTION'
}


def para_texts(docx: Path) -> list[str]:
    with ZipFile(docx) as z:
        xml = z.read('word/document.xml')
    root = ET.fromstring(xml)
    out: list[str] = []
    for p in root.findall('.//w:p', NS):
        txt = ''.join(t.text or '' for t in p.findall('.//w:t', NS))
        txt = re.sub(r'\s+', ' ', txt).strip()
        if txt:
            out.append(txt)
    return out


def has_he(s: str) -> bool:
    return bool(HE_RE.search(s or ''))


def strip_nikud(s: str) -> str:
    return NIKUD_RE.sub('', s or '')


def clean_he_title(s: str) -> str:
    s = strip_nikud(s)
    s = re.sub(r'["׳״\'\-–—\s]+', '', s)
    return s


def is_en_header(s: str) -> bool:
    if has_he(s):
        return False
    st = s.strip()
    if not (2 <= len(st) <= 90):
        return False
    if EN_NUM_RE.match(st):
        return False
    if ROMAN_RE.match(st):
        return False
    # Real topic headers in this DOCX are all caps, sometimes with punctuation.
    letters = re.sub(r'[^A-Za-z]', '', st)
    if len(letters) < 2:
        return False
    return letters.upper() == letters


def extract_topics(paras: list[str]) -> list[dict]:
    topics: list[dict] = []
    current = None
    pending_he: str | None = None
    part = 1
    seen_first_topic = False

    def finish():
        nonlocal current
        if current and current['segments']:
            topics.append(current)
        current = None

    i = 0
    while i < len(paras):
        p = paras[i].strip()
        upper = p.upper().strip()

        # Part markers must be handled before generic all-caps topic detection.
        # In the DOCX they appear as Hebrew "חלק שני" followed by English
        # "SECOND PART"; they belong inside the current topic, not as a new topic.
        if upper in SPECIAL_HEADERS and 'SECOND' in upper:
            if current:
                part = 2
                pending_he = None
            i += 1
            continue

        # Hebrew title followed by English all-caps title starts a topic.
        if is_en_header(p) and i > 0 and has_he(paras[i - 1]):
            he_title = paras[i - 1].strip()
            if clean_he_title(he_title) == 'חלקשני':
                if current:
                    part = 2
                    pending_he = None
                i += 1
                continue
            finish()
            current = {
                'hebrewTitle': he_title,
                'englishTitle': p.title() if p.isupper() else p,
                'segments': [],
            }
            part = 1
            pending_he = None
            seen_first_topic = True
            i += 1
            continue

        if not current:
            i += 1
            continue

        if has_he(p):
            # Do not treat repeated title/header as a teaching.
            if clean_he_title(p) == clean_he_title(current['hebrewTitle']):
                i += 1
                continue
            if clean_he_title(p) == 'חלקשני':
                part = 2
                pending_he = None
                i += 1
                continue
            pending_he = p
            i += 1
            continue

        m = EN_NUM_RE.match(p)
        if m and pending_he:
            src_num = int(m.group(1))
            en = p.strip()
            label = str(src_num) if part == 1 else f'II-{src_num}'
            current['segments'].append({
                'index': len(current['segments']) + 1,       # unique anchor for share/MySefer
                'sourcePart': part,
                'sourceNumber': src_num,
                'displayLabel': label,                       # clear teaching number shown in UI
                'he': pending_he,
                'he_nikud': pending_he,
                'en': en,
            })
            pending_he = None
            i += 1
            continue

        i += 1

    finish()
    return topics


def catalog_entry(num: int, topic: dict) -> dict:
    return {
        'number': num,
        'displayNumber': num,
        'title': topic['englishTitle'],
        'hebrewTitle': topic['hebrewTitle'],
        'themes': [strip_nikud(topic['hebrewTitle'])],
        'paragraphs': len(topic['segments']),
        'hasEnglish': True,
        'url': f'/reader/sefer-hamidos/1/{num}',
    }


def main() -> None:
    if not DOCX.exists():
        raise SystemExit(f'Missing source DOCX: {DOCX}')
    paras = para_texts(DOCX)
    topics = extract_topics(paras)
    if len(topics) < 100:
        raise SystemExit(f'Parsed only {len(topics)} topics; refusing to overwrite')

    OUT.mkdir(parents=True, exist_ok=True)
    torahs = []
    total_segments = 0
    for n, topic in enumerate(topics, start=1):
        total_segments += len(topic['segments'])
        data = {
            'id': f'sh-{n}',
            'book': 'sefer-hamidos',
            'part': 1,
            'torah': n,
            'displayNumber': n,
            'title': topic['englishTitle'],
            'hebrewTitle': topic['hebrewTitle'],
            'keyVerse': '',
            'keyVerseTranslation': '',
            'keyVerseRef': '',
            'themes': [strip_nikud(topic['hebrewTitle'])],
            'keywords': [],
            'simanim': [],
            'segments': topic['segments'],
            'totalParagraphs': len(topic['segments']),
            'hasEnglish': True,
            'navigation': {
                'prev': f'sh-{n-1}' if n > 1 else None,
                'next': f'sh-{n+1}' if n < len(topics) else None,
                'prevUrl': f'/reader/sefer-hamidos/1/{n-1}' if n > 1 else None,
                'nextUrl': f'/reader/sefer-hamidos/1/{n+1}' if n < len(topics) else None,
            },
        }
        (OUT / f'topic-{n}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        torahs.append(catalog_entry(n, topic))

    index = {
        'book': 'sefer-hamidos',
        'part': 1,
        'title': 'Sefer Hamidos - The Book of Traits',
        'hebrewTitle': 'ספר המידות',
        'author': 'Rabbi Nachman of Breslov',
        'hebrewAuthor': 'רבי נחמן מברסלב',
        'totalTorahs': len(torahs),
        'totalTeachings': total_segments,
        'torahs': torahs,
    }
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding='utf-8')

    catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
    entry = {
        'id': 'sefer-hamidos',
        'title': 'Sefer Hamidos',
        'hebrewTitle': 'ספר המידות',
        'author': 'Rabbi Nachman of Breslov',
        'hebrewAuthor': 'רבי נחמן מברסלב',
        'parts': [{
            'part': 1,
            'title': 'Topics A-Z',
            'hebrewTitle': 'ערכים א-ת',
            'totalTorahs': len(torahs),
            'indexUrl': '/reader/sefer-hamidos/index.json',
        }],
    }
    books = catalog.setdefault('books', [])
    for i, b in enumerate(books):
        if b.get('id') == 'sefer-hamidos':
            books[i] = entry
            break
    else:
        books.append(entry)
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')

    print(f'Rebuilt Sefer Hamidos from local DOCX: {len(torahs)} topics, {total_segments} individual teachings')
    for n in [1, 91]:
        d = json.loads((OUT / f'topic-{n}.json').read_text(encoding='utf-8'))
        print(f'topic-{n}: {d["hebrewTitle"]} / {d["title"]}: {len(d["segments"])} teachings; first labels {[s["displayLabel"] for s in d["segments"][:8]]}')


if __name__ == '__main__':
    main()
