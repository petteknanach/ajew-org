#!/usr/bin/env python3
"""Apply the frozen Torah 26 commentary, prayer, Nanach, registry, and language repairs."""
import json, re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/26'
AV = {'beginner': {'he': False, 'en': True}, 'intermediate': {'he': True, 'en': True}, 'scholarly': {'he': True, 'en': False}}
CROSSWALK = {1: [1], 2: [1], 3: [2], 4: [3], 5: [4], 6: [5, 6]}


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig').replace('\x00', ''))


def dump(path, data):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    study = load(BASE / 'torah-study.json')
    if len(study['segments']) != 6:
        raise RuntimeError('study count')
    pettek_path = ROOT / 'public/reader/pettek-nanach-commentary/torah-26.json'
    pettek = load(pettek_path)
    if len(pettek['segments']) != 6:
        raise RuntimeError('Pettek count')
    for record in pettek['segments']:
        actual = {layer: {lang: bool(str((record['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he', 'en')} for layer in AV}
        if actual != AV:
            raise RuntimeError(f'Pettek availability {record["index"]}')
        related = int(record['relatedSegment'])
        if related not in CROSSWALK:
            raise RuntimeError(f'crosswalk {related}')
        record['alignedPassage'] = CROSSWALK[related][0]
        record['alignedPassages'] = CROSSWALK[related]
    pettek.update({'totalSegments': 6, 'inScopeRecords': 6, 'layerAvailability': AV, 'superReaderCoverageNote': 'All 6 records are in scope. Beginner is English-only, intermediate bilingual, and scholarly Hebrew-only; no missing translations are manufactured.'})
    dump(pettek_path, pettek)

    dump(BASE / 'biur-halikutim.json', {'id': 'bhl-26-unavailable', 'book': 'biur-halikutim', 'part': 1, 'torah': 26, 'segments': [], 'totalSegments': 0, 'hasEnglish': False, 'availability': 'unavailable', 'reason': 'No canonical local Torah 26 Biur HaLikutim package exists. section-26.json is the Torah 21/22 aggregate and section-27.json belongs to Torah 27.'})
    dump(BASE / 'parparos-lechochma.json', {'id': 'plc-26-unavailable', 'book': 'parparos-lechochma', 'part': 1, 'torah': 26, 'segments': [], 'totalSegments': 0, 'hasEnglish': False, 'availability': 'unavailable', 'reason': 'No canonical local Torah 26 Parparos LeChochma package exists. section-26.json belongs to Torah 25 and section-27.json belongs to Torah 27.'})

    html_path = ROOT / 'public/teachings/likutay-tefilos/likutay_tefilos_26_prayer26.html'
    soup = BeautifulSoup(html_path.read_text(encoding='utf-8'), 'html.parser')
    dates = [node.get_text(' ', strip=True).replace('\xa0', ' ') for node in soup.select('.date-bar')]
    if len(dates) != 1 or '27th of Cheshvan' not in dates[0]:
        raise RuntimeError(f'date bars {dates}')
    ids = ['p26a', 'p26b']
    prayers = []
    for i, div in enumerate(soup.select('div.para'), 1):
        hebrew = div.select_one('.heb-text')
        english_p = div.find('p', recursive=False)
        if not hebrew or not english_p or i > len(ids) or hebrew.get('id') != ids[i - 1]:
            raise RuntimeError(f'prayer {i}')
        clone = BeautifulSoup(str(english_p), 'html.parser')
        for node in clone.select('.heb-btn,.heb-text'):
            node.decompose()
        he = hebrew.get_text(' ', strip=True)
        en = re.sub(r'\s+([,.;:!?])', r'\1', clone.get_text(' ', strip=True))
        prayers.append({'index': i, 'sourceId': hebrew['id'], 'he': he, 'he_nikud': he, 'en': en})
    if len(prayers) != 2 or any(not z['he'] or not z['en'] or 'עברית ▾' in z['en'] for z in prayers):
        raise RuntimeError('prayer blocks')
    prayer_path = ROOT / 'public/reader/likutay-tefilos/part-1/prayer-26.json'
    old = load(prayer_path)
    navigation = old.get('navigation') or {'prevUrl': '/reader/likutay-tefilos/1/25', 'nextUrl': '/reader/likutay-tefilos/1/27'}
    dump(prayer_path, {'id': 'lt-1-26', 'book': 'likutay-tefilos', 'part': 1, 'torah': 26, 'displayNumber': 26, 'title': 'Prayer Twenty-Six', 'hebrewTitle': 'תפילה כו', 'segments': prayers, 'aligned_segments': prayers, 'totalParagraphs': 2, 'totalSegments': 2, 'hasEnglish': True, 'navigation': navigation, 'superReaderRepairSource': str(html_path.relative_to(ROOT)), 'excludedMetadata': {'dateBars': 1, 'dateBarText': dates, 'reason': 'Date bar is metadata, not prayer prose'}})

    nanach_path = ROOT / 'public/reader/likutay-nanach/volume-4/chapter-25.json'
    nanach_data = load(nanach_path)
    by_index = {int(z['index']): z for z in nanach_data['segments']}
    if by_index[76]['he'].strip() != 'תורה כו' or by_index[78]['he'].strip() != 'תורה כז':
        raise RuntimeError('Nanach boundaries')
    source = dict(by_index[77])
    if not source.get('he') or source.get('en'):
        raise RuntimeError('Nanach language truth')
    source.update({'index': 1, 'sourceFile': 'volume-4/chapter-25.json', 'sourceIndex': 77, 'sourceIdentity': 'volume-4/chapter-25.json#index=77'})
    dump(BASE / 'likutay-nanach.json', {'id': 'likutay-nanach-torah-26', 'book': 'likutay-nanach', 'part': 1, 'torah': 26, 'title': 'ליקוטי ננח — תורה כו', 'segments': [source], 'totalSegments': 1, 'hasEnglish': False, 'sourceSlice': {'file': 'volume-4/chapter-25.json', 'firstIndex': 77, 'lastIndex': 77}, 'excludedBoundaries': [76, 78]})

    registry_path = ROOT / 'src/data/lm-commentaries.json'
    registry = load(registry_path)
    related = registry['1']['26']['related_commentaries']
    related[:] = [z for z in related if z.get('book') not in {'biur-halikutim', 'parparos-lechochma'}]
    nanach = [z for z in related if z.get('book') == 'likutay-nanach']
    if len(nanach) != 1:
        raise RuntimeError('registry')
    nanach[0].update({'section': 'chapter-25-torah-26-slice', 'sectionNumber': 25, 'sectionTitle': 'תורה כו', 'url': '/reader/super/likutay-moharan/1/26/likutay-nanach.json', 'sourceIndices': [77], 'totalRecords': 1, 'superReaderBoundaryNote': 'Chapter 25 heading 76 excluded; substantive index 77 only; stop before Torah 27 heading 78. Stale chapter 30 is unrelated.'})
    dump(registry_path, registry)
    print('Repaired Torah 26: Pettek 6 asymmetric, Biur unavailable, Parparos unavailable, prayer 2 bilingual, Nanach 1 HE-only, registry corrected.')


if __name__ == '__main__':
    main()
