#!/usr/bin/env python3
"""Import the licensed aligned Hebrew/English witness used by Torah 8 Super Reader."""
from __future__ import annotations
import html, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/reader/super/likutay-moharan/1/8/torah-study.json'
CLASSIC = ROOT / 'public/reader/likutay-moharan/part-1/torah-8.json'


def plain(value: str) -> str:
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', value or ''))).strip()


def strip_nikud(value: str) -> str:
    return re.sub(r'[\u0591-\u05C7]', '', value)


def classic_segment(section: int, comment: int) -> int:
    if section == 1: return 1 if comment == 1 else 2
    if section in {2, 3, 4, 5, 6}: return section + 1
    if section == 7: return 8 if comment <= 7 else 9
    if section == 8:
        if comment <= 5: return 10
        if comment <= 7: return 11
        return 13
    if section == 9: return 14
    if section == 10: return 15
    if section == 11: return 16
    raise ValueError((section, comment))


def passage(index: int, section: int, comment: int | str, classic: int, he_nikud: str, en: str, source_ref: str | None = None) -> dict:
    return {
        'index': index,
        'sourceSection': section,
        'sourceComment': comment,
        'sourceRef': source_ref or f'Likutei Moharan 8:{section}:{comment}',
        'classicSegment': classic,
        'he': strip_nikud(plain(he_nikud)),
        'he_nikud': plain(he_nikud),
        'en': plain(en),
    }


def main() -> None:
    classic = json.loads(CLASSIC.read_text(encoding='utf-8'))
    classic_by = {int(x['index']): x for x in classic['segments']}
    segments: list[dict] = []
    versions = None
    for section in range(1, 12):
        response = requests.get(f'https://www.sefaria.org/api/texts/Likutei_Moharan.8.{section}?lang=bi&context=0', timeout=45)
        response.raise_for_status()
        data = response.json()
        if versions is None: versions = data.get('versions', [])
        for comment, (he_raw, en_raw) in enumerate(zip(data.get('he') or [], data.get('text') or []), start=1):
            if section == 1 and comment == 2:
                he_raw = plain(he_raw)
                marker = ') א '
                if marker not in he_raw:
                    raise RuntimeError('Could not isolate Torah 8 opening tail')
                segments.append(passage(len(segments) + 1, section, '2a Haftarah note', 1, 'והוא הפטרת שבת חנוכה', '(It is the Haftarah for Shabbat Chanukah.)', 'Sefaria 8:1:2 opening note; editorial English restoration'))
                he_raw = 'א ' + he_raw.split(marker, 1)[1]
                segments.append(passage(len(segments) + 1, section, '2b discourse', 2, he_raw, en_raw, 'Likutei Moharan 8:1:2 main discourse'))
                continue
            segments.append(passage(len(segments) + 1, section, comment, classic_segment(section, comment), he_raw, en_raw))
            if section == 8 and comment == 7:
                rashbam_en = (
                    "Rashbam’s explanation: Tayya—an Ishmaelite merchant. ‘I went and saw them, and they appeared as if intoxicated’—"
                    "they were lying with radiant faces like men drunk with wine. ‘Supine’—their faces were upward. ‘The merchant passed beneath his knee’—"
                    "I saw the merchant pass beneath the dead man’s knee, riding a camel with his spear in his hand, without touching the knee. ‘He took one corner’—"
                    "a corner of the tallit, to show it to the Sages and learn from it the law of tzitzit, whether according to Beit Shammai or Beit Hillel, as explained below. "
                    "‘And we could not proceed’—the animals on which we were riding were unable to walk."
                )
                segments.append(passage(len(segments) + 1, section, 'Rashbam gloss', 12, classic_by[12]['he'], rashbam_en, 'Rashbam on Bava Batra 73b, editorial English restoration'))
    if len(segments) != 97 or not all(x['he'] and x['en'] for x in segments):
        raise RuntimeError(f'Expected 97 fully bilingual passages, found {len(segments)}')
    payload = {
        'id': 'super-lm-1-8-study', 'book': 'likutay-moharan', 'part': 1, 'torah': 8,
        'displayNumber': '8', 'title': classic['title'], 'hebrewTitle': classic['hebrewTitle'],
        'keyVerse': classic['keyVerse'], 'keyVerseTranslation': classic['keyVerseTranslation'], 'keyVerseRef': classic['keyVerseRef'],
        'themes': classic.get('themes', []), 'segments': segments, 'totalPassages': len(segments),
        'hasEnglish': True, 'hasNikud': True,
        'license': {'he': 'Public Domain (rabenubook.com edition via Sefaria)', 'en': 'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)', 'editorialRestorations': ['Haftarah-note English translation', 'Rashbam gloss English translation']},
        'source': {'sefariaRef': 'Likutei Moharan 8', 'classicFile': str(CLASSIC.relative_to(ROOT)), 'versions': versions},
        'generatedAt': datetime.now(timezone.utc).isoformat(),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(segments)} aligned Torah 8 passages.')

if __name__ == '__main__': main()
