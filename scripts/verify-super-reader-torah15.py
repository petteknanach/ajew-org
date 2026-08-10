#!/usr/bin/env python3
"""Validate the Torah 15 Full Super Reader package in targeted low-resource mode."""
from __future__ import annotations
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'public/reader/super/likutay-moharan/1/15'
def load(path: Path): return json.loads(path.read_text(encoding='utf-8-sig').replace('\x00', ''))
def unspan(value: str) -> str: return re.sub(r'<span[^>]*>|</span>', '', value or '')
def inline(text: str, anchor: str) -> bool: return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(anchor)}"', text or ''))
def fail(message: str): raise RuntimeError(message)
def main():
    classic=load(ROOT/'public/reader/likutay-moharan/part-1/torah-15.json'); study=load(BASE/'torah-study.json'); segments=study['segments']
    if len(classic.get('segments',[]))!=18 or len(classic.get('aligned_segments',[]))!=53: fail('Classic constants must be 18/53')
    if len(segments)!=45 or [x['index'] for x in segments]!=list(range(1,46)): fail('Study must contain 45 contiguous displayed passages')
    if study.get('sefariaSections')!=8 or study.get('sefariaPassages')!=43 or study.get('classicSourceOnlyPassages')!=2: fail('Sefaria/source-only metadata mismatch')
    if sum(bool(x.get('en')) for x in segments)!=43: fail('Exactly 43 passages must be bilingual')
    expected=[2,3,5,5,5,5,7,8,8,8,10,11,12,12,12,12,12,12,12,12,12,12,14,14,14,14,14,14,14,15,15,15,15,15,15,15,15,17,17,17,17,17,17,17,18]
    if [int(x['classicSegment']) for x in segments]!=expected: fail('Exact 18-segment Classic crosswalk mismatch')
    boundaries={1:[1,2],3:[4,5],7:[6,7],11:[9,10],12:[11],23:[13,14],38:[16,17],45:[18]}
    for index,values in boundaries.items():
        if segments[index-1].get('classicSegments')!=values: fail(f'Boundary/addendum crosswalk missing at passage {index}')
    addenda={12:([11],'Rashbam gloss preserved'),45:([18],'closing memorandum')}
    for index,(numbers,label) in addenda.items():
        item=segments[index-1]; expected_he=' '.join(str(classic['segments'][n-1].get('he') or '').strip() for n in numbers).strip()
        if not item.get('hebrewOnly') or item.get('en') or unspan(item.get('he'))!=expected_he: fail(f'Classic source-only passage {index} content mismatch')
        if label not in item.get('sourceRef','') or 'source-only Hebrew' not in item.get('displayLabel',''): fail(f'Classic source-only passage {index} labeling mismatch')
    if segments[10].get('sourceRef')!='Likutei Moharan 15:5:1' or segments[12].get('sourceRef')!='Likutei Moharan 15:5:2': fail('Rashbam addendum is not positioned after 15:5:1')
    if segments[43].get('sourceRef')!='Likutei Moharan 15:8:7': fail('Closing memorandum is not positioned after 15:8:7')
    for item in segments:
        if not item.get('he') or not item.get('he_nikud'): fail(f'Passage {item.get("index")} has empty Hebrew')
        if item.get('en') and item['en'].strip()==unspan(item['he']).strip(): fail(f'Passage {item["index"]} copies Hebrew as English')
    phrases=load(BASE/'phrase-study.json')['phrases']; by_index={x['index']:x for x in segments}
    if len(phrases)!=30 or len({x['id'] for x in phrases})!=30: fail('Expected 30 unique phrases')
    for phrase in phrases:
        segment=by_index[int(phrase['segment'])]
        if segment.get('hebrewOnly'): fail(f'Phrase {phrase["id"]} points to source-only Hebrew')
        if not all(str(phrase.get(k,'')).strip() for k in ('he','en','enMatch','info','sourceRef')): fail(f'Phrase {phrase.get("id")} not substantive')
        if phrase['he'] not in unspan(segment['he']) or phrase['enMatch'] not in unspan(segment['en']): fail(f'Phrase {phrase["id"]} not exactly anchored')
        if not all(inline(segment[k],phrase['id']) for k in ('he','he_nikud','en')): fail(f'Phrase {phrase["id"]} inline markers missing')
    pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-15.json')
    if len(pettek['segments'])!=18 or [int(x['relatedSegment']) for x in pettek['segments']]!=list(range(1,19)): fail('Pettek must have 18 synchronized records')
    for item in pettek['segments']:
        layers=item.get('layers',{})
        if not (layers.get('beginner',{}).get('en') and layers.get('intermediate',{}).get('he') and layers.get('intermediate',{}).get('en') and layers.get('scholarly',{}).get('he')): fail('Pettek layer coverage mismatch')
    biur=load(ROOT/'public/reader/biur-halikutim/section-21.json')
    if biur.get('torah')!=15 or biur.get('displayNumber')!=15 or len(biur['segments'])!=10 or any(not x.get('he') or x.get('en') for x in biur['segments']): fail('Biur metadata/count mismatch')
    parparos=load(ROOT/'public/reader/parparos-lechochma/section-16.json'); expected_indices=list(range(2,43,2))+[43]
    if parparos.get('torah')!=15 or parparos.get('displayNumber')!=15 or len(parparos['segments'])!=22 or [int(x['index']) for x in parparos['segments']]!=expected_indices: fail('Parparos metadata/count mismatch')
    if any(not x.get('he') or not x.get('en') or x['he'].strip()==x['en'].strip() for x in parparos['segments'][:-1]): fail('Parparos bilingual records mismatch')
    summary=parparos['segments'][-1]
    if summary.get('he') or not summary.get('en') or not summary.get('englishOnly') or 'English-only' not in summary.get('displayLabel',''): fail('Parparos source English-only summary labeling mismatch')
    prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-15.json')
    if prayer.get('id')!='lt-1-15' or prayer.get('part')!=1 or len(prayer['segments'])!=10 or prayer.get('totalSegments')!=10: fail('Prayer metadata/count mismatch')
    if any(not x.get('he') or not x.get('en') or x['he'].strip()==x['en'].strip() for x in prayer['segments']): fail('Prayer bilingual content mismatch')
    nanach=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-13.json'); source=[x for x in nanach['segments'] if 38<=int(x['index'])<=67]; substantive=[x for x in source if int(x['index'])!=38]
    if len(source)!=30 or len(substantive)!=29 or int(substantive[-1]['index'])!=67 or any(not x.get('he') for x in substantive): fail('Likutay Nanach must be 30 source / 29 substantive records, retaining record 67')
    if not next((x for x in nanach['segments'] if int(x['index'])==68),None): fail('Likutay Nanach Torah 16 boundary record 68 is missing')
    manifest=load(BASE/'peer-halikutim/manifest.json')
    if manifest.get('hebrewBooksId')!=54912 or manifest.get('sourcePageRange')!=[377,407] or len(manifest.get('pages',[]))!=31: fail('Pe’er manifest mismatch')
    if [x.get('sourcePage') for x in manifest['pages']]!=list(range(377,408)): fail('Pe’er page sequence mismatch')
    if {int(n) for page in manifest['pages'] for n in page.get('relatedPassages',[])}!=set(range(1,46)): fail('Pe’er passage coverage mismatch')
    expected_assets={f'page-{n}.webp' for n in range(377,408)}; actual_assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; pdf_ready=(BASE/'peer-halikutim/peer-halikutim-torah-15.pdf').is_file()
    if actual_assets and actual_assets!=expected_assets: fail('Partial Pe’er image set is not allowed')
    if bool(actual_assets)!=pdf_ready: fail('Pe’er PDF/image readiness mismatch')
    if not actual_assets and manifest.get('facsimileStatus')!='pending-separately-supervised-conversion': fail('Pending Pe’er conversion status missing')
    astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/15.astro').read_text(encoding='utf-8'); sources=set(re.findall(r'data-open-source="([^"]+)"',astro))
    if sources!={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'}: fail(f'Expected nine study layers, got {sorted(sources)}')
    for token in ('chapter-13.json','38, 67','new Set([38])','29 substantive records','Torah 16 begins at record 68'):
        if token not in astro: fail(f'Nanach selection token missing: {token}')
    for token in ('two clearly labeled source-only Hebrew addenda','Pe’er pages 377–407','https://www.peer-halikutim.com/'):
        if token not in astro: fail(f'Source/addendum UI token missing: {token}')
    discovery=[ROOT/'src/pages/reader/likutay-moharan/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
    for path in discovery:
        text=path.read_text(encoding='utf-8-sig').replace('\x00','')
        if '/reader/super/likutay-moharan/1/15' not in text and '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]' not in text and 'Number(item.number) <= 15' not in text: fail(f'Discovery missing in {path}')
    asset_note='facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
    print('Validated Torah 15: 43 Sefaria bilingual + 2 labeled Classic source-only Hebrew addenda (45 total), exact 18/53 crosswalk, 30 exact bilingual phrases, 9 study layers, 18 Pettek, 10 Biur, 22 Parparos, 30/29 Likutay Nanach, 10 prayer blocks, 31-page Pe’er manifest (377–407); '+asset_note+'.')
if __name__=='__main__': main()
