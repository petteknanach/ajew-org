#!/usr/bin/env python3
"""Repair Parparos LeChochma Torahs 3-8 from authoritative Finished HTML."""
from __future__ import annotations

import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FINISHED = Path('/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh')


class SectionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tag = ''
        self.buffer: list[str] = []
        self.current: list[str] | None = None
        self.groups: list[list[str]] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {'h3', 'h4', 'p'}:
            self.tag = tag
            self.buffer = []
        elif tag == 'br' and self.tag == 'p':
            self.buffer.append('\n')

    def handle_data(self, data: str) -> None:
        if self.tag:
            self.buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != self.tag:
            return
        text = html.unescape(''.join(self.buffer))
        text = re.sub(r'[ \t\r\f\v]+', ' ', text)
        text = re.sub(r' *\n *', '\n', text).strip()
        if tag == 'h3' and text.startswith('Section '):
            self.current = []
            self.groups.append(self.current)
        elif tag == 'h4':
            self.current = None
        elif tag == 'p' and self.current is not None and text:
            self.current.append(text)
        self.tag = ''
        self.buffer = []


def paragraphs(path: Path) -> list[str]:
    parser = SectionParser()
    parser.feed(path.read_text(encoding='utf-8'))
    return ['\n\n'.join(group) for group in parser.groups]


def update(path: Path, assignments: dict[int, str]) -> None:
    data = json.loads(path.read_text(encoding='utf-8'))
    for segment in data['segments']:
        segment['en'] = ''
    by_index = {int(segment['index']): segment for segment in data['segments']}
    for index, value in assignments.items():
        by_index[index]['en'] = value
    if any(not segment['he'] or not segment['en'] for segment in data['segments']):
        raise RuntimeError(f'Incomplete bilingual coverage in {path}')
    data['hasEnglish'] = True
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main() -> None:
    torah3 = paragraphs(FINISHED / '020 Parpara_os_Siman_3.html')
    if len(torah3) != 5:
        raise RuntimeError(f'Expected 5 Torah 3 sections, found {len(torah3)}')
    # Ois Gimmel crosses the classic reader's editorial segments 6 and 7.
    gimmel = torah3[2].split('\n\n')
    if len(gimmel) != 10:
        raise RuntimeError(f'Expected 10 Torah 3 Ois Gimmel paragraphs, found {len(gimmel)}')
    update(
        ROOT / 'public/reader/parparos-lechochma/section-4.json',
        {2: torah3[0], 4: torah3[1], 6: gimmel[0], 7: '\n\n'.join(gimmel[1:]), 9: torah3[3], 11: torah3[4]},
    )

    torah4 = paragraphs(FINISHED / '030 Parpara_os_Siman_4.html')
    if len(torah4) != 32:
        raise RuntimeError(f'Expected 32 Torah 4 sections, found {len(torah4)}')
    update(
        ROOT / 'public/reader/parparos-lechochma/section-5.json',
        {2 * (position + 1): value for position, value in enumerate(torah4)},
    )
    torah5 = paragraphs(FINISHED / '040 Parpara_os_Siman_5 (1).html')
    if len(torah5) != 15:
        raise RuntimeError(f'Expected 15 Torah 5 sections, found {len(torah5)}')
    update(
        ROOT / 'public/reader/parparos-lechochma/section-6.json',
        {2 * (position + 1): value for position, value in enumerate(torah5)},
    )
    torah6 = paragraphs(FINISHED / '050 Parpara_os_Siman_6.html')
    if len(torah6) != 20:
        raise RuntimeError(f'Expected 20 Torah 6 sections, found {len(torah6)}')
    update(
        ROOT / 'public/reader/parparos-lechochma/section-7.json',
        {2 * (position + 1): value for position, value in enumerate(torah6)},
    )
    torah7 = paragraphs(FINISHED / '060 Parpara_os_Siman_7 (1).html')
    if len(torah7) != 11:
        raise RuntimeError(f'Expected 11 Torah 7 sections, found {len(torah7)}')
    update(
        ROOT / 'public/reader/parparos-lechochma/section-8.json',
        {2 * (position + 1): value for position, value in enumerate(torah7)},
    )
    torahs8and9 = paragraphs(FINISHED / '070 Parpara_os_Simanim_8_9.html')
    if len(torahs8and9) != 9:
        raise RuntimeError(f'Expected 9 Torah 8–9 sections, found {len(torahs8and9)}')
    torah8 = torahs8and9[:4]
    update(
        ROOT / 'public/reader/parparos-lechochma/section-9.json',
        {2 * (position + 1): value for position, value in enumerate(torah8)},
    )
    print('Repaired authoritative Parparos English: Torahs 3–8.')


if __name__ == '__main__':
    main()
