#!/usr/bin/env python3
"""Rebuild Otzar HaYirah reader JSON from local authoritative sources.

Hebrew: Torat Emet text files under Documents/HebrewBreslovBooks.
English: finished HTML files under Documents/Claude Desktop projects/Finished/Oatzar*.

This intentionally does not ratio-split or guess English. It pairs English entries from
finished HTML files with Hebrew entries in source order, one HTML entry per source siman.
"""
from __future__ import annotations

import copy
import html
import json
import os
import re
import shutil
from pathlib import Path

from bs4 import BeautifulSoup

BASE = Path('/root/ajew-org/public/reader/otzar-hayirah')

PARTS = [
    {
        'part': 1,
        'folder': Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 1'),
        'hebrew': Path('/mnt/c/Users/Pettek/Documents/HebrewBreslovBooks/3_ספרי הרב מטשערין/אוצר היראה/ליקוטי עצות חדש/אוצר היראה א-ד.txt'),
        'title': 'Otzar HaYirah — Part 1',
        'hebrewTitle': 'אוֹצַר הַיִּרְאָה א-ד',
    },
    {
        'part': 2,
        'folder': Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 2'),
        'hebrew': Path('/mnt/c/Users/Pettek/Documents/HebrewBreslovBooks/3_ספרי הרב מטשערין/אוצר היראה/ליקוטי עצות חדש/אוצר היראה ה-ל.txt'),
        'title': 'Otzar HaYirah — Part 2',
        'hebrewTitle': 'אוֹצַר הַיִּרְאָה ה-ל',
    },
    {
        'part': 3,
        'folder': Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzer volume Mem'),
        'hebrew': Path('/mnt/c/Users/Pettek/Documents/HebrewBreslovBooks/3_ספרי הרב מטשערין/אוצר היראה/ליקוטי עצות חדש/אוצר היראה מ, מועדים.txt'),
        'title': 'Otzar HaYirah — Part 3',
        'hebrewTitle': 'אוֹצַר הַיִּרְאָה מ, מועדים',
    },
    {
        'part': 4,
        'folder': Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 4'),
        'hebrew': Path('/mnt/c/Users/Pettek/Documents/HebrewBreslovBooks/3_ספרי הרב מטשערין/אוצר היראה/ליקוטי עצות חדש/אוצר היראה נ-ת.txt'),
        'title': 'Otzar HaYirah — Part 4',
        'hebrewTitle': 'אוֹצַר הַיִּרְאָה נ-ת',
    },
]

HE_ENTRY_RE = re.compile(r'^\s*([א-ת]{1,3})[.)]\s+(.*)')
TAG_RE = re.compile(r'<[^>]+>')
SPACE_RE = re.compile(r'\s+')


def clean_text(s: str) -> str:
    s = html.unescape(s or '')
    s = s.replace('\u200f', '').replace('\u200e', '').replace('\ufeff', '')
    s = SPACE_RE.sub(' ', s)
    return s.strip()


def extract_hebrew_entries(path: Path) -> list[dict]:
    entries = []
    for line in path.read_text(encoding='utf-8', errors='ignore').splitlines():
        m = HE_ENTRY_RE.match(line)
        if not m:
            continue
        letter = m.group(1).strip()
        body = clean_text(m.group(2))
        if body:
            entries.append({'letter': letter, 'he': body})
    return entries


def extract_hebrew_groups(path: Path) -> list[list[dict]]:
    """Split source entries into topic groups by the Hebrew-letter reset to א."""
    groups: list[list[dict]] = []
    cur: list[dict] = []
    for ent in extract_hebrew_entries(path):
        if ent['letter'] == 'א' and cur:
            groups.append(cur)
            cur = []
        cur.append(ent)
    if cur:
        groups.append(cur)
    return groups


def title_from_soup(soup: BeautifulSoup, fallback: str) -> tuple[str, str]:
    he = ''
    en = ''
    for sel in ['.section-title-heb', '.hebrew-title', '.title-hebrew', 'h1 .hebrew']:
        el = soup.select_one(sel)
        if el:
            he = clean_text(el.get_text(' '))
            break
    for sel in ['.section-title-eng', '.english-title', '.title-english', 'h1 .english']:
        el = soup.select_one(sel)
        if el:
            en = clean_text(el.get_text(' '))
            break
    if not he:
        h1 = soup.find('h1')
        if h1:
            txt = clean_text(h1.get_text(' '))
            # Prefer this only if it contains Hebrew; otherwise keep for English.
            if re.search(r'[\u0590-\u05ff]', txt):
                he = txt
            elif not en:
                en = txt
    if not en:
        title = soup.find('title')
        if title:
            en = clean_text(title.get_text(' '))
    if not en:
        en = re.sub(r'^\d+\s+', '', fallback).replace('_', ' ').replace('-', ' ')
    if not he:
        he = en
    return he, en


def text_from_entry(el) -> str:
    clone = copy.copy(el)
    # Drop non-source explanatory apparatus that appears inside some HTML entries.
    for bad in clone.select('.diagram-box, .translator-note, .toc, nav, script, style'):
        bad.decompose()
    # Drop pure number labels; keep source/cite paragraphs because they are part of the entry's provenance.
    for bad in clone.select('.entry-number, .section-num'):
        bad.decompose()
    return clean_text(clone.get_text(' '))


def entry_number(el, default: int) -> int:
    for sel in ['.entry-number', '.section-num', '.entry-label']:
        e = el.select_one(sel)
        if e:
            m = re.search(r'(\d+)', clean_text(e.get_text(' ')))
            if m:
                return int(m.group(1))
    ident = el.get('id') or ''
    m = re.search(r'(\d+)', ident)
    if m:
        return int(m.group(1))
    return default


def extract_english_entries(path: Path) -> tuple[str, str, list[dict]]:
    soup = BeautifulSoup(path.read_text(encoding='utf-8', errors='ignore'), 'html.parser')
    he_title, en_title = title_from_soup(soup, path.stem)
    selectors = ['div.entry', 'div.para', 'div.section-block', 'div.section', 'section.entry', 'article.entry']
    entries = []
    for sel in selectors:
        els = soup.select(sel)
        if not els:
            continue
        for i, el in enumerate(els, 1):
            txt = text_from_entry(el)
            # Skip empty shells and page chrome.
            if not txt or len(txt) < 3:
                continue
            entries.append({'siman': entry_number(el, i), 'en': txt})
        break
    return he_title, en_title, entries


def html_files(folder: Path) -> list[Path]:
    return sorted([p for p in folder.iterdir() if p.suffix.lower() == '.html'], key=lambda p: p.name.lower())


def rebuild_part(spec: dict) -> dict:
    pnum = spec['part']
    files = html_files(spec['folder'])
    he_groups = extract_hebrew_groups(spec['hebrew'])
    he_entries = [ent for group in he_groups for ent in group]
    he_used = 0
    he_pos = 0
    outdir = BASE / f'part-{pnum}'
    outdir.mkdir(parents=True, exist_ok=True)
    for old in outdir.glob('torah-*.json'):
        old.unlink()

    index_torahs = []
    written_segments = 0
    per_file = []
    for torah_num, html_path in enumerate(files, 1):
        heb_title, title, en_entries = extract_english_entries(html_path)
        segments = []
        if pnum == 4:
            current_group = he_groups[torah_num - 1] if torah_num - 1 < len(he_groups) else []
            for en_entry in en_entries:
                pos = len(segments)
                if pos >= len(current_group):
                    continue
                he_entry = current_group[pos]
                he_used += 1
                en = en_entry['en']
                idx = len(segments) + 1
                segments.append({
                    'index': idx,
                    'siman': en_entry.get('siman') or idx,
                    'letter': he_entry['letter'],
                    'he': he_entry['he'],
                    'en': en,
                })
        else:
            for en_entry in en_entries:
                if he_pos >= len(he_entries):
                    continue
                he_entry = he_entries[he_pos]
                he_pos += 1
                he_used += 1
                en = en_entry['en']
                idx = len(segments) + 1
                segments.append({
                    'index': idx,
                    'siman': en_entry.get('siman') or idx,
                    'letter': he_entry['letter'],
                    'he': he_entry['he'],
                    'en': en,
                })
        data = {
            'id': f'ohy-{pnum}-{torah_num}',
            'book': 'otzar-hayirah',
            'part': pnum,
            'torah': torah_num,
            'displayNumber': torah_num,
            'title': title,
            'hebrewTitle': heb_title,
            'sourceFile': str(html_path),
            'keyVerse': '',
            'keyVerseRef': '',
            'themes': [],
            'keywords': [],
            'hasEnglish': any(clean_text(s.get('en')) for s in segments),
            'totalParagraphs': len(segments),
            'segments': segments,
        }
        (outdir / f'torah-{torah_num}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        index_torahs.append({
            'number': torah_num,
            'displayNumber': torah_num,
            'title': title,
            'hebrewTitle': heb_title,
            'themes': [],
            'paragraphs': len(segments),
            'hasEnglish': data['hasEnglish'],
            'url': f'/reader/otzar-hayirah/{pnum}/{torah_num}',
        })
        written_segments += len(segments)
        per_file.append((html_path.name, len(segments)))

    index = {
        'book': 'otzar-hayirah',
        'part': pnum,
        'title': spec['title'],
        'hebrewTitle': spec['hebrewTitle'],
        'author': 'Rabbi Nosson of Breslov',
        'hebrewAuthor': 'רבי נתן מברסלב',
        'totalTorahs': len(index_torahs),
        'torahs': index_torahs,
    }
    (outdir / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding='utf-8')
    return {
        'part': pnum,
        'files': len(files),
        'segments': written_segments,
        'hebrew_source_entries': len(he_entries),
        'hebrew_used': he_used,
        'hebrew_unused': len(he_entries) - he_used,
        'per_file': per_file,
    }


def main() -> None:
    BASE.mkdir(parents=True, exist_ok=True)
    results = []
    for spec in PARTS:
        missing = [str(spec[k]) for k in ('folder', 'hebrew') if not spec[k].exists()]
        if missing:
            raise SystemExit('Missing source(s):\n' + '\n'.join(missing))
        results.append(rebuild_part(spec))

    topics = []
    topic_dir = BASE / 'topics'
    if topic_dir.exists():
        for fp in sorted(topic_dir.glob('*.json'), key=lambda p: p.name):
            try:
                d = json.loads(fp.read_text(encoding='utf-8'))
            except Exception:
                continue
            slug = fp.stem
            title = d.get('topic') or d.get('title') or d.get('hebrew_title') or d.get('hebrewTitle') or slug
            heb_title = d.get('hebrew_title') or d.get('hebrewTitle') or title
            topics.append({
                'slug': slug,
                'title': title,
                'hebrewTitle': heb_title,
                'volume': d.get('volume'),
                'siman_count': len(d.get('simanim') or []),
                'url': f'/reader/otzar-hayirah/topics/{slug}',
            })

    root = {
        'book': 'otzar-hayirah',
        'title': 'Otzar HaYirah',
        'hebrewTitle': 'אוֹצַר הַיִּרְאָה',
        'author': 'Rabbi Nosson of Breslov',
        'hebrewAuthor': 'רבי נתן מברסלב',
        'parts': [
            {
                'part': r['part'],
                'title': next(s['title'] for s in PARTS if s['part'] == r['part']),
                'hebrewTitle': next(s['hebrewTitle'] for s in PARTS if s['part'] == r['part']),
                'totalTorahs': r['files'],
                'sections': r['files'], 
                'segments': r['segments'],
                'url': f"/reader/otzar-hayirah/{r['part']}",
            }
            for r in results
        ],
        'topics': topics,
    }
    (BASE / 'index.json').write_text(json.dumps(root, ensure_ascii=False, indent=2), encoding='utf-8')

    print('Rebuilt Otzar HaYirah from local sources:')
    for r in results:
        print(f"  part {r['part']}: {r['files']} files, {r['segments']} paired segments; Hebrew used {r['hebrew_used']}/{r['hebrew_source_entries']} (unused {r['hebrew_unused']})")


if __name__ == '__main__':
    main()
