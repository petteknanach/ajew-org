#!/usr/bin/env python3
"""Validate the frozen Torah 16 Full Super Reader package in targeted low-resource mode."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'public/reader/super/likutay-moharan/1/16'
RASHBAM_HE='רשב״ם: ונפיץ — ושפך. אוסיא — נחיריו. מברי דסורא — נהרות שבסורא.'
RASHBAM_EN='Rashbam: nafitz — and it spouted/poured; usya — its nostrils; mavrei de-Sura — the rivers of Sura.'
SHA='796b49291678cc50b05f90ca0e7e2955eae62b0f2455d798ca55aa2ddb9673d3'
def load(path:Path): return json.loads(path.read_text(encoding='utf-8-sig').replace('\x00',''))
def unspan(v): return re.sub(r'<span[^>]*>|</span>','',v or '')
def inline(text,anchor): return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(anchor)}"',text or ''))
def fail(message): raise RuntimeError(message)
def main():
    classic=load(ROOT/'public/reader/likutay-moharan/part-1/torah-16.json'); study=load(BASE/'torah-study.json'); segments=study['segments']
    if len(classic.get('segments',[]))!=3: fail('Classic Torah 16 must contain 3 coarse segments')
    if len(segments)!=11 or [int(x['index']) for x in segments]!=list(range(1,12)): fail('Study must contain 11 contiguous passages')
    refs=['Likutei Moharan 16:1:1',None]+[f'Likutei Moharan 16:1:{n}' for n in range(2,11)]
    if [x.get('sourceRef') for x in segments]!=refs: fail('Exact Sefaria/supplement reference sequence mismatch')
    if [int(x['classicSegment']) for x in segments]!=[1,2,3,3,3,3,3,3,3,3,3]: fail('Classic crosswalk sequence mismatch')
    if any(not unspan(x.get('he')).strip() or not unspan(x.get('en')).strip() or unspan(x['he']).strip()==unspan(x['en']).strip() for x in segments): fail('Every displayed Hebrew passage must have true English')
    supplement=segments[1]
    if unspan(supplement['he'])!=RASHBAM_HE or unspan(supplement['en'])!=RASHBAM_EN or not supplement.get('insertedSupplement') or supplement.get('sourceRef') is not None or 'Rashbam on Bava Batra 74a' not in supplement.get('provenance',''): fail('Restored bilingual Rashbam supplement/provenance mismatch')
    first=segments[0]
    if not unspan(first['he_nikud']).startswith('רַבִּי יוֹחָנָן מִשְׁתָּעֵי'): fail('Displayed 16:1:1 does not begin at the fish narrative')
    if 'בָּרוּךְ הַבּוֹחֵר' in unspan(first['he_nikud']) or 'בָּרוּךְ הַבּוֹחֵר' not in first.get('rawSource',{}).get('he',''): fail('Editorial transition display/raw handling mismatch')
    if 'eyesresembled' not in first['rawSource']['en'] or 'eyesresembled' in unspan(first['en']) or 'eyes resembled' not in unspan(first['en']): fail('eyesresembled raw/display correction mismatch')
    for item in (segments[3],segments[7]):
        if 'no st rils' not in item['rawSource']['en'] or 'no st rils' in unspan(item['en']) or 'nostrils' not in unspan(item['en']): fail(f'nostrils raw/display correction mismatch at passage {item["index"]}')
    source=study.get('source',{})
    if study.get('sefariaPassages')!=10 or study.get('totalPassages')!=11 or study.get('classicSegments')!=3 or study.get('restoredBilingualSupplements')!=1: fail('Study count metadata mismatch')
    expected_meta={'sefariaRef':'Likutei Moharan 16:1','sefariaSourceRange':'Likutei Moharan 16:1:1-10','ref':'Likutei Moharan 16:1','next':'Likutei Moharan 17:1','prev':'Likutei Moharan 15:8','versionTitle':'Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012','license':'CC-BY-NC','versionSource':'https://www.nli.org.il/he/books/NNL01','heVersionTitle':'Likutei Moharan - rabenubook.com','heLicense':'Public Domain','heVersionSource':'http://rabenubook.com/%D7%9C%D7%99%D7%A7%D7%95%D7%98%D7%99-%D7%9E%D7%95%D7%94%D7%A8%D7%B4%D7%9F-%D7%90/'}
    if any(source.get(k)!=v for k,v in expected_meta.items()) or len(source.get('versions',[]))<2: fail('Raw Sefaria metadata/version provenance mismatch')
    phrases=load(BASE/'phrase-study.json')['phrases']; by_index={int(x['index']):x for x in segments}
    if len(phrases)!=30 or len({x['id'] for x in phrases})!=30 or {int(x['segment']) for x in phrases}!=set(range(1,12)): fail('Expected 30 unique phrases covering all 11 passages')
    grouped={i:[] for i in range(1,12)}
    for phrase in phrases:
        segment=by_index[int(phrase['segment'])]; grouped[int(phrase['segment'])].append(phrase)
        if not all(str(phrase.get(k,'')).strip() for k in ('he','en','enMatch','info','source')): fail(f'Phrase {phrase.get("id")} not substantive')
        if phrase['he'] not in unspan(segment['he']) or phrase['enMatch'] not in unspan(segment['en']): fail(f'Phrase {phrase["id"]} not exactly bilingual-anchored')
        if not all(inline(segment[k],phrase['id']) for k in ('he','he_nikud','en')): fail(f'Phrase {phrase["id"]} inline markers missing')
    if [len(grouped[i]) for i in range(1,12)]!=[3,2,3,3,3,3,3,3,3,2,2]: fail('Phrase distribution mismatch')
    for index,items in grouped.items():
        for field,textfield in [('he','he'),('enMatch','en')]:
            text=unspan(by_index[index][textfield]); ranges=[]
            for item in items:
                start=text.find(item[field]); end=start+len(item[field])
                if start<0 or any(start<b and end>a for a,b in ranges): fail(f'Overlapping {field} phrases in passage {index}')
                ranges.append((start,end))
    pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-16.json'); expected_availability={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
    if len(pettek['segments'])!=3 or [int(x['relatedSegment']) for x in pettek['segments']]!=[1,2,3] or pettek.get('layerAvailability')!=expected_availability: fail('Pettek record/availability metadata mismatch')
    for item in pettek['segments']:
        actual={layer:{lang:bool(str((item.get('layers',{}).get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in expected_availability}
        if actual!=expected_availability: fail(f'Pettek asymmetric coverage mismatch at {item.get("index")}')
    parparos=load(BASE/'parparos-lechochma.json')
    if len(parparos.get('segments',[]))!=1 or parparos.get('totalParagraphs')!=1 or int(parparos['segments'][0]['index'])!=1 or int(parparos['segments'][0]['sourceIndex'])!=2 or not parparos['segments'][0].get('he') or not parparos['segments'][0].get('en'): fail('Parparos packaged record mismatch')
    prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-16.json')
    if prayer.get('id')!='lt-1-16' or len(prayer.get('segments',[]))!=3 or prayer.get('totalSegments')!=3 or prayer.get('excludedMetadata',{}).get('dateBars')!=1: fail('Prayer 16 count/date-bar metadata mismatch')
    if any(not x.get('he') or not x.get('en') or x['he'].strip()==x['en'].strip() for x in prayer['segments']): fail('Prayer 16 must contain three bilingual blocks')
    nanach=load(ROOT/'public/reader/likutay-nanach/volume-4/chapter-13.json'); by_source={int(x['index']):x for x in nanach['segments']}; substantive=[by_source[n] for n in range(69,83)]
    if len(substantive)!=14 or any(not x.get('he') or x.get('en') for x in substantive): fail('Likutay Nanach 69–82 must be 14 Hebrew-only substantive records')
    if 'טז' not in by_source[68].get('he','') or 'יז' not in by_source[83].get('he',''): fail('Likutay Nanach Torah 16/17 boundary headings mismatch')
    manifest=load(BASE/'peer-halikutim/manifest.json')
    if manifest.get('hebrewBooksId')!=66038 or manifest.get('sourceSha256')!=SHA or manifest.get('sourcePageRange')!=[21,32] or len(manifest.get('pages',[]))!=12: fail('Pe’er frozen source constants mismatch')
    if [x.get('sourcePage') for x in manifest['pages']]!=list(range(21,33)) or any(x.get('sourcePage')==33 for x in manifest['pages']): fail('Pe’er must include pages 21–32 and exclude page 33')
    if {int(n) for page in manifest['pages'] for n in page.get('relatedPassages',[])}!=set(range(1,12)): fail('Pe’er passage coverage mismatch')
    expected_assets={f'page-{n}.webp' for n in range(21,33)}; actual_assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; pdf_ready=(BASE/'peer-halikutim/peer-halikutim-torah-16.pdf').is_file()
    if actual_assets and actual_assets!=expected_assets: fail('Partial Pe’er image set is not allowed')
    if bool(actual_assets)!=pdf_ready: fail('Pe’er PDF/image readiness mismatch')
    if not actual_assets and manifest.get('facsimileStatus')!='pending-separately-supervised-conversion': fail('Pending Pe’er conversion status missing')
    astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/16.astro').read_text(encoding='utf-8'); sources=set(re.findall(r'data-open-source="([^"]+)"',astro))
    if sources!={'phrase','guide','pettek','parparos','nanach','prayer','peer','notes'}: fail(f'Expected eight study layers with no Biur, got {sorted(sources)}')
    if 'biur' in astro.lower(): fail('Biur must be omitted entirely from the Torah 16 route')
    for token in ('chapter-13.json','69, 82','14 substantive Hebrew-only records','heading 68','heading 83','Pe’er pages 21–32','page 33 begins Torah 17','Classic segment 2 / Rashbam on Bava Batra 74a','<span><b>8</b> study layers</span>','https://www.peer-halikutim.com/','English-only','Hebrew-only','no translation was fabricated'):
        if token not in astro: fail(f'Route source/coverage token missing: {token}')
    discovery=[ROOT/'src/pages/reader/likutay-moharan/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
    for path in discovery:
        text=path.read_text(encoding='utf-8-sig').replace('\x00','')
        if '/reader/super/likutay-moharan/1/16' not in text and '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]' not in text: fail(f'Discovery missing in {path}')
    asset_note='facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
    print('Validated Torah 16: 10 Sefaria leaves + restored Rashbam (11 bilingual passages), exact 3-segment crosswalk, 30 nonoverlapping bilingual phrases, 8 study layers, Pettek 3 asymmetric records, Biur 0/omitted, Parparos 1, Nanach 14, prayer 3, Pe’er pages 21–32; '+asset_note+'.')
if __name__=='__main__': main()
