#!/usr/bin/env python3
"""Verify and publish the Finished-folder English Rimzay HaMaaseyos translation."""

from __future__ import annotations

import difflib
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Rimzay_HaMaaseyos.html')
BOOK_DIR = ROOT / 'public/reader/rimzei-hamaasiyos'

TITLES = {
    1: 'The Lost Princess',
    2: 'The King and the Emperor',
    3: 'The Lame Man',
    4: 'The King Who Decreed Apostasy — A Story of Miracles',
    5: 'The King’s Son Made of Precious Stones',
    6: 'The Humble King',
    7: 'The Fly and the Spider — The King Who Conquered Many Nations',
    8: 'The Rabbi and His Only Son',
    9: 'The Clever Man and the Simple Man',
    10: 'The Burgher and the Pauper',
    11: 'The King’s Son and the Maid’s Son Who Were Exchanged',
    12: 'The Prayer Leader',
    13: 'The Seven Beggars',
}


def words(text: str) -> list[str]:
    return re.sub(r'[^a-z0-9]+', ' ', text.lower()).split()


def source_story_texts() -> list[str]:
    soup = BeautifulSoup(SOURCE.read_text(encoding='utf-8'), 'html.parser')
    headings = soup.select('h2.story-title')
    if len(headings) != 13:
        raise SystemExit(f'Expected 13 source stories; found {len(headings)}')
    stories = []
    for heading in headings:
        paragraphs = []
        for element in heading.find_all_next():
            if element is not heading and element.name == 'h2' and 'story-title' in (element.get('class') or []):
                break
            if element.name != 'p':
                continue
            if element.find_parent(class_=['summary-box', 'translator-note']):
                continue
            paragraphs.append(element.get_text(' ', strip=True))
        stories.append('\n\n'.join(paragraphs))
    return stories


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    source_texts = source_story_texts()
    index_path = BOOK_DIR / 'index.json'
    index = json.loads(index_path.read_text(encoding='utf-8'))
    index['title'] = 'Rimzay HaMaaseyos — Allusions of the Stories'
    index['hasEnglish'] = True

    for number, source_text in enumerate(source_texts, 1):
        path = BOOK_DIR / f'section-{number}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        segments = data.get('segments') or []
        if not segments or any(not str(segment.get('en') or '').strip() for segment in segments):
            raise SystemExit(f'Section {number} has missing English segments')
        published = '\n\n'.join(str(segment.get('en') or '') for segment in segments)
        ratio = difflib.SequenceMatcher(None, words(source_text), words(published)).ratio()
        if ratio < 0.88:
            raise SystemExit(f'Section {number} does not match Finished source closely enough: {ratio:.3f}')
        data['title'] = TITLES[number]
        data['hasEnglish'] = True
        write_json(path, data)

        item = next(item for item in index['torahs'] if int(item['number']) == number)
        item['title'] = TITLES[number]
        item['hasEnglish'] = True

    write_json(index_path, index)

    catalog_path = ROOT / 'public/reader/catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    book = next(book for book in catalog['books'] if book['id'] == 'rimzei-hamaasiyos')
    book['title'] = 'Rimzay HaMaaseyos — Allusions of the Stories'
    book['hasEnglish'] = True
    book['parts'][0]['title'] = 'Allusions on the Thirteen Stories'
    write_json(catalog_path, catalog)
    print('Verified and published English for all 13 Rimzay HaMaaseyos sections.')


if __name__ == '__main__':
    main()
