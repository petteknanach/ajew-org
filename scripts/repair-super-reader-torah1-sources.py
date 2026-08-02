#!/usr/bin/env python3
"""Repair the exact opening/alignment of Torah 1 commentary sources."""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARPAROS_JSON = ROOT / 'public/reader/parparos-lechochma/section-2.json'
PARPAROS_HTML = Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh/010 Parpara_os_LaChuchmuh_COMPLETE (2).html')


def plain(value: str) -> str:
    value = re.sub(r'<br\s*/?>', '\n', value, flags=re.I)
    value = re.sub(r'<[^>]+>', '', value)
    return re.sub(r'[ \t]+', ' ', html.unescape(value)).strip()


def parparos_sections() -> dict[int, str]:
    source = PARPAROS_HTML.read_text(encoding='utf-8')
    start = source.index('SIMAN ALEF')
    end = source.index('Siman Two', start)
    source = source[start:end]
    headings = list(re.finditer(r'<h3 class="sub">Section\s+(\d+)\s+—\s+Letter[^<]*</h3>', source))
    result: dict[int, str] = {}
    for index, heading in enumerate(headings):
        number = int(heading.group(1))
        stop = headings[index + 1].start() if index + 1 < len(headings) else len(source)
        body = source[heading.end():stop]
        paragraphs = [plain(match.group(1)) for match in re.finditer(r'<p[^>]*>([\s\S]*?)</p>', body)]
        paragraphs = [paragraph for paragraph in paragraphs if paragraph]
        if paragraphs:
            result[number] = '\n\n'.join(paragraphs)
    return result


def main() -> None:
    sections = parparos_sections()
    if not all(number in sections for number in range(1, 14)):
        raise SystemExit('Canonical Parparos HTML is missing one of Sections 1–13')

    data = json.loads(PARPAROS_JSON.read_text(encoding='utf-8'))
    if len(data.get('segments', [])) != 13:
        raise SystemExit('Unexpected Torah 1 Parparos segment count')

    for number, segment in enumerate(data['segments'], start=1):
        segment['en'] = sections[number]
    data['hasEnglish'] = True
    PARPAROS_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    first = data['segments'][0]['en']
    if not first.startswith('Regarding Siman 1') or 'Laws of Deposit' not in first:
        raise SystemExit('Parparos opening validation failed')
    print('Repaired Parparos Torah 1 English Sections 1–13 from canonical Finished HTML')


if __name__ == '__main__':
    main()
