#!/usr/bin/env python3
"""Validate the Torah 13 Full Super Reader package in targeted low-resource mode."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/13'
def load(path): return json.loads(path.read_text(encoding='utf-8-sig').replace('\x00',''))
def unspan(v): return re.sub(r'<span[^>]*>|</span>','',v or '')
def inline(text,anchor): return bool(re.search(rf'<span[^>]+data-inline-phrase="{re.escape(anchor)}"',text or ''))
def fail(message): raise RuntimeError(message)
def expected_crosswalk():
 return [1]+[2]*3+[2]+[3]*4+[4]*3+[5]*5+[6]*9+[7]+[9]*14+[10]*7+[10]+[11]+[12]*3+[13]+[14]*11+[15]*7+[16]*6+[17]+[18]*2
def main():
 classic=load(ROOT/'public/reader/likutay-moharan/part-1/torah-13.json'); study=load(BASE/'torah-study.json'); segments=study['segments']
 if len(classic.get('segments',[]))!=18 or len(classic.get('aligned_segments',[]))!=78: fail('Classic constants must be 18/78')
 if len(segments)!=81 or [x['index'] for x in segments]!=list(range(1,82)): fail('Study must contain 81 contiguous displayed passages')
 if study.get('sefariaSections')!=7 or study.get('sefariaPassages')!=80 or study.get('classicGlossPassage')!=54: fail('Sefaria/gloss metadata mismatch')
 if sum(bool(x.get('en')) for x in segments)!=80: fail('Exactly 80 passages must be bilingual')
 if [int(x['classicSegment']) for x in segments]!=expected_crosswalk(): fail('Exact 18-segment Classic crosswalk mismatch')
 for index,value in {5:[2,3],27:[7,8],49:[10,11]}.items():
  if segments[index-1].get('classicSegments')!=value: fail(f'Boundary crosswalk missing at passage {index}')
 if segments[52].get('sourceRef')!='Likutei Moharan 13:6:4' or segments[54].get('sourceRef')!='Likutei Moharan 13:6:5': fail('Rashbam gloss is not positioned after 13:6:4')
 gloss=segments[53]
 if not gloss.get('hebrewOnly') or gloss.get('en') or unspan(gloss.get('he'))!=unspan(classic['segments'][12]['he']): fail('Classic Hebrew-only Rashbam gloss mismatch')
 if gloss.get('classicSegment')!=13 or 'Rashbam gloss preserved' not in gloss.get('sourceRef','') or 'Hebrew only' not in gloss.get('displayLabel',''): fail('Classic gloss labeling mismatch')
 notes={(1,1),(1,8),(2,1),(5,19),(6,8),(6,21),(7,9)}; found={(int(x['sourceSection']),int(x['sourceComment'])) for x in segments if x.get('classicNote')}
 if found!=notes or any(x.get('classicNote') not in unspan(x.get('he_nikud','')) for x in segments if x.get('classicNote')): fail('Seven merged Classic note hosts/content mismatch')
 for item in segments:
  if not item.get('he') or not item.get('he_nikud'): fail(f'Passage {item.get("index")} has empty Hebrew')
  if item.get('en') and item['en'].strip()==unspan(item['he']).strip(): fail(f'Passage {item["index"]} copies Hebrew as English')
 phrases=load(BASE/'phrase-study.json')['phrases']; by_index={x['index']:x for x in segments}
 if len(phrases)!=30 or len({x['id'] for x in phrases})!=30: fail('Expected 30 unique phrases')
 for phrase in phrases:
  segment=by_index[int(phrase['segment'])]
  if segment.get('hebrewOnly'): fail(f'Phrase {phrase["id"]} points to Hebrew-only gloss')
  if not all(str(phrase.get(k,'')).strip() for k in ('he','en','enMatch','info','sourceRef')): fail(f'Phrase {phrase.get("id")} not substantive')
  if phrase['he'] not in unspan(segment['he']) or phrase['enMatch'] not in unspan(segment['en']): fail(f'Phrase {phrase["id"]} not exactly anchored')
  if not all(inline(segment[k],phrase['id']) for k in ('he','he_nikud','en')): fail(f'Phrase {phrase["id"]} inline markers missing')
 pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-13.json')
 if len(pettek['segments'])!=18 or [int(x['relatedSegment']) for x in pettek['segments']]!=list(range(1,19)): fail('Pettek must have 18 synchronized records')
 for item in pettek['segments']:
  layers=item.get('layers',{})
  if not (layers.get('beginner',{}).get('en') and layers.get('intermediate',{}).get('he') and layers.get('intermediate',{}).get('en') and layers.get('scholarly',{}).get('he')): fail('Pettek layer coverage mismatch')
 biur=load(ROOT/'public/reader/biur-halikutim/section-19.json')
 if biur.get('torah')!=13 or biur.get('displayNumber')!=13 or len(biur['segments'])!=13 or any(not x.get('he') for x in biur['segments']): fail('Biur metadata/count mismatch')
 parparos=load(ROOT/'public/reader/parparos-lechochma/section-14.json')
 if parparos.get('torah')!=13 or parparos.get('displayNumber')!=13 or len(parparos['segments'])!=13: fail('Parparos metadata/count mismatch')
 if [int(x['index']) for x in parparos['segments']]!=list(range(3,28,2)) or any(not x.get('he') or not x.get('en') or x['he'].strip()==x['en'].strip() for x in parparos['segments']): fail('Parparos bilingual groups mismatch')
 prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-13.json')
 if prayer.get('id')!='lt-1-13' or prayer.get('part')!=1 or len(prayer['segments'])!=9 or prayer.get('totalSegments')!=9: fail('Prayer metadata/count mismatch')
 if any(not x.get('he') or not x.get('en') or x['he'].strip()==x['en'].strip() for x in prayer['segments']): fail('Prayer bilingual content mismatch')
 source=[]
 for name,lo,hi in [('chapter-11.json',28,37),('chapter-12.json',1,3),('chapter-13.json',1,2)]:
  data=load(ROOT/'public/reader/likutay-nanach/volume-4'/name); source += [x for x in data['segments'] if lo<=int(x['index'])<=hi]
 substantive=[]
 for i,x in enumerate(source):
  chapter=11 if i<10 else 12 if i<13 else 13
  if not (chapter==11 and int(x['index']) in {28,33,34}): substantive.append(x)
 if len(source)!=15 or len(substantive)!=12 or any(not x.get('he') for x in substantive): fail('Likutay Nanach must be 15 source / 12 substantive records')
 manifest=load(BASE/'peer-halikutim/manifest.json')
 if manifest.get('hebrewBooksId')!=54912 or manifest.get('sourcePageRange')!=[282,328] or len(manifest.get('pages',[]))!=47: fail('Pe’er manifest mismatch')
 if [x.get('sourcePage') for x in manifest['pages']]!=list(range(282,329)): fail('Pe’er page sequence mismatch')
 if {int(n) for page in manifest['pages'] for n in page.get('relatedPassages',[])}!=set(range(1,82)): fail('Pe’er passage coverage mismatch')
 expected_assets={f'page-{n}.webp' for n in range(282,329)}; actual_assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; pdf_ready=(BASE/'peer-halikutim/peer-halikutim-torah-13.pdf').is_file()
 if actual_assets and actual_assets!=expected_assets: fail('Partial Pe’er image set is not allowed')
 if bool(actual_assets)!=pdf_ready: fail('Pe’er PDF/image readiness mismatch')
 if not actual_assets and manifest.get('facsimileStatus')!='pending-separately-supervised-conversion': fail('Pending Pe’er conversion status missing')
 astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/13.astro').read_text(encoding='utf-8'); sources=set(re.findall(r'data-open-source="([^"]+)"',astro))
 if sources!={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'}: fail(f'Expected nine study layers, got {sorted(sources)}')
 for token in ('chapter-11.json','chapter-12.json','chapter-13.json','28, 37','1, 3','1, 2','new Set([28, 33, 34])','12 substantive records'):
  if token not in astro: fail(f'Nanach selection token missing: {token}')
 if 'Hebrew-only Classic Rashbam gloss' not in astro: fail('Hebrew-only gloss UI notice missing')
 discovery=[ROOT/'src/pages/reader/likutay-moharan/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
 for path in discovery:
  text=path.read_text(encoding='utf-8-sig').replace('\x00','')
  if '/reader/super/likutay-moharan/1/13' not in text and '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]' not in text and 'Number(item.number) <= 13' not in text: fail(f'Discovery missing in {path}')
 asset_note='facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
 print('Validated Torah 13: 80 Sefaria bilingual + 1 labeled Hebrew-only Classic Rashbam gloss (81 total), exact 18/78 crosswalk with 7 merged Classic notes, 30 exact bilingual phrases, 9 study layers, 18 Pettek, 13 Biur, 13 Parparos, 15/12 Likutay Nanach, 9 prayer blocks, 47-page Pe’er manifest (282–328); '+asset_note+'.')
if __name__=='__main__': main()
