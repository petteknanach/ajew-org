#!/usr/bin/env python3
"""Strict targeted verifier for audited Torah 26 Super Reader."""
import argparse, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/26'
SHA = '7d8d2adaad23ace7197ecac35b3e2055973305b832b45581c7d27fe84c76e052'
AV = {'beginner': {'he': False, 'en': True}, 'intermediate': {'he': True, 'en': True}, 'scholarly': {'he': True, 'en': False}}
DISTRIBUTION = {1: 5, 3: 6, 4: 7, 5: 1, 6: 11}


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig').replace('\x00', ''))


def plain(value):
    return re.sub(r'\s+', ' ', re.sub(r'</?span[^>]*>', '', value or '')).strip()


def req(condition, message):
    if not condition:
        raise RuntimeError(message)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pending-facsimiles', action='store_true')
    args = parser.parse_args()
    study = load(BASE / 'torah-study.json')
    segments = study['segments']
    refs = [f'Likutei Moharan 26:1:{i}' for i in range(1, 6)]
    sefaria = [z for z in segments if z.get('sourceRef')]
    req(len(segments) == 6 and [z['index'] for z in segments] == list(range(1, 7)), '6 display records')
    req(len(sefaria) == 5 and [z['sourceRef'] for z in sefaria] == refs, '5 exact refs')
    req(all(plain(z['he']) and plain(z['en']) and plain(z['he']) != plain(z['en']) for z in sefaria), 'bilingual witness invariant')
    req(study['productionAlignedPassages'] == 5 and study['productionDisplayRecords'] == 6 and study['sefariaSectionCounts'] == [5] and study['structuralRestorations'] == 1, 'counts')
    note = segments[1]
    req(note['type'] == 'structuralNote' and note['afterAlignedPassage'] == 1 and note['classicSegment'] == 3 and note['sourceRef'] is None and note['en'] is None and note['he'] == 'רש"י: רציצא דמית, אפרוח שמת בתוך קלפתו:' and note['sefariaEnglishLocation'] == 'Likutei Moharan 26:1:5', 'Hebrew-only Rashi structural note')
    source = study['source']
    req(source['versionTitle'] == 'Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012' and source['license'] == 'CC-BY-NC' and source['versionSource'] == 'https://www.nli.org.il/he/books/NNL01', 'English license')
    req(source['heVersionTitle'] == 'Likutei Moharan - rabenubook.com' and source['heLicense'] == 'Public Domain' and source['prev'] == 'Likutei Moharan 25:9' and source['lastNext'] == 'Likutei Moharan 27:1', 'Hebrew license/boundaries')
    by_ref = {z['sourceRef']: z for z in sefaria}
    en2, en3, en4, en5 = (plain(by_ref[ref]['en']) for ref in refs[1:])
    req('<“A tzaddik, like a date palm' in en2 and 'and as in,>' in en2, 'angle-delimited supplement preserved')
    req('[The Wise Men of Athens]' in en3 and '[Rabbi Yehoshua]' in en4, 'square identifications preserved')
    req('<he has to elevate them.' in en5 and 'A chick that dies - a chick that perishes inside its shell:' in en5, 'leaf 5 angle/Rashi English preserved')
    req([z['classicSegment'] for z in segments] == [1, 3, 4, 4, 4, 4], 'classic crosswalk')

    phrases = load(BASE / 'phrase-study.json')
    req(len(phrases['phrases']) == 30 and {int(k): v for k, v in phrases['distribution'].items()} == DISTRIBUTION, '30 phrase distribution')
    req(phrases['selectedPassages'] == [1, 3, 4, 5, 6], 'all five aligned leaves represented')
    counts = {index: 0 for index in DISTRIBUTION}
    for phrase in phrases['phrases']:
        counts[phrase['segment']] += 1
        segment = segments[phrase['segment'] - 1]
        req(segment.get('sourceRef') and phrase['source'] == phrase['sourceRef'] == segment['sourceRef'], 'phrase provenance')
        req(phrase['he'] in plain(segment['he']) and phrase['enMatch'] in plain(segment['en']), 'exact phrase text')
        req(all(f'data-inline-phrase="{phrase["id"]}"' in segment[key] for key in ('he', 'he_nikud', 'en')), 'phrase sync spans')
    req(counts == DISTRIBUTION, 'phrase counts')

    pettek = load(ROOT / 'public/reader/pettek-nanach-commentary/torah-26.json')
    req(len(pettek['segments']) == 6 and pettek['layerAvailability'] == AV, 'Pettek count/availability')
    req([z['alignedPassages'] for z in pettek['segments']] == [[1], [1], [2], [3], [4], [5, 6]], 'Pettek crosswalk')
    req(all({layer: {lang: bool(str((z['layers'].get(layer) or {}).get(lang) or '').strip()) for lang in ('he', 'en')} for layer in AV} == AV for z in pettek['segments']), 'Pettek language truth')
    biur = load(BASE / 'biur-halikutim.json')
    parparos = load(BASE / 'parparos-lechochma.json')
    req(not biur['segments'] and biur['availability'] == 'unavailable' and 'section-27.json belongs to Torah 27' in biur['reason'], 'Biur unavailable')
    req(not parparos['segments'] and parparos['availability'] == 'unavailable' and 'section-26.json belongs to Torah 25' in parparos['reason'], 'Parparos unavailable')
    prayer = load(ROOT / 'public/reader/likutay-tefilos/part-1/prayer-26.json')
    req(len(prayer['segments']) == 2 and [z['sourceId'] for z in prayer['segments']] == ['p26a', 'p26b'] and prayer['navigation']['prevUrl'] and prayer['navigation']['nextUrl'] and all(z['he'] and z['en'] and 'עברית ▾' not in z['en'] for z in prayer['segments']), 'authoritative prayer')
    nanach = load(BASE / 'likutay-nanach.json')
    req(len(nanach['segments']) == 1 and nanach['segments'][0]['sourceIndex'] == 77 and nanach['segments'][0]['he'].startswith('הינו איך שנכנסים בו מחשבות זרות') and not nanach['segments'][0].get('en') and nanach['excludedBoundaries'] == [76, 78], 'bounded Nanach')
    related = load(ROOT / 'src/data/lm-commentaries.json')['1']['26']['related_commentaries']
    nn = [z for z in related if z.get('book') == 'likutay-nanach']
    req(len(nn) == 1 and nn[0]['sourceIndices'] == [77] and nn[0]['url'].endswith('/26/likutay-nanach.json') and not any(z.get('book') in {'biur-halikutim', 'parparos-lechochma'} for z in related), 'registry')

    manifest = load(BASE / 'peer-halikutim/manifest.json')
    req(manifest['sourceSha256'] == SHA and manifest['hebrewBooksId'] == 66039 and manifest['sourcePageRange'] == [217, 224] and [z['sourcePage'] for z in manifest['pages']] == list(range(217, 225)), 'Pe’er range')
    assets = {path.name for path in (BASE / 'peer-halikutim').glob('page-*.webp')}
    expected = {f'page-{page}.webp' for page in range(217, 225)}
    pdf = (BASE / 'peer-halikutim/peer-halikutim-torah-26.pdf').is_file()
    req(not (BASE / 'peer-halikutim/page-225.webp').exists(), 'excluded page 225 absent')
    if args.pending_facsimiles:
        req(not assets and not pdf and manifest['facsimileStatus'].startswith('pending'), 'pending facsimiles')
    else:
        req(assets == expected and pdf and manifest['facsimileStatus'] == 'ready', 'facsimiles ready')

    astro = (ROOT / 'src/pages/reader/super/likutay-moharan/1/26.astro').read_text(encoding='utf-8')
    req(set(re.findall(r'data-open-source="([^"]+)"', astro)) == {'phrase', 'guide', 'pettek', 'biur', 'parparos', 'nanach', 'prayer', 'peer', 'notes'}, 'nine layers')
    req(astro.count('Unavailable for Torah 26') >= 2 and 'pages 217–224' in astro and 'https://www.peer-halikutim.com/' in astro and 'Hebrew-only Classic printed-Rashi structural note' in astro and "prayer-26.json" in astro, 'route truth/credit')
    classic = (ROOT / 'src/pages/reader/likutay-moharan/[part]/[torah].astro').read_text(encoding='utf-8')
    directory = (ROOT / 'src/pages/reader/likutay-moharan/[part]/index.astro').read_text(encoding='utf-8')
    req(classic.count('25, 26]') >= 2 and 'length: 26' in directory and '<= 26' in directory and "'כה','כו'" in directory, 'discovery')
    print('Validated Torah 26: 5 exact Sefaria leaves + 1 Hebrew-only Rashi structural note, 30 phrases, 9 layers, Pettek 6 asymmetric, Biur/Parparos unavailable, Nanach 1 HE-only, prayer 2, Pe’er 217–224; ' + ('facsimiles pending separately supervised conversion.' if args.pending_facsimiles else 'facsimiles ready.'))


if __name__ == '__main__':
    main()
