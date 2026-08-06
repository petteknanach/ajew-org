#!/usr/bin/env python3
"""Validate frozen Torah 17 Full Super Reader package in low-resource mode."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/17'
COUNTS=[28,3,5,3,16,11,4,16,13]; SHA='796b49291678cc50b05f90ca0e7e2955eae62b0f2455d798ca55aa2ddb9673d3'
def load(path): return json.loads(path.read_text(encoding='utf-8-sig').replace('\x00',''))
def unspan(v): return re.sub(r'<span[^>]*>|</span>','',v or '')
def fail(m): raise RuntimeError(m)
def main():
 classic=load(ROOT/'public/reader/likutay-moharan/part-1/torah-17.json'); study=load(BASE/'torah-study.json'); segs=study['segments']
 if len(classic.get('segments',[]))!=36: fail('Classic count must be 36')
 if len(segs)!=100 or [int(x['index']) for x in segs]!=list(range(1,101)): fail('Study must have 100 contiguous passages')
 refs=[]
 for section,count in enumerate(COUNTS,1): refs += [f'Likutei Moharan 17:{section}:{i}' for i in range(1,count+1)]
 expected=refs[:sum(COUNTS[:7])+2]+[None]+refs[sum(COUNTS[:7])+2:]
 if [x.get('sourceRef') for x in segs]!=expected: fail('99-ref order/Rashbam insertion mismatch')
 if any(not unspan(x.get('he')).strip() or not unspan(x.get('en')).strip() or unspan(x['he']).strip()==unspan(x['en']).strip() for x in segs): fail('Every production passage must be genuinely bilingual')
 supplement=[x for x in segs if x.get('insertedSupplement')]
 if len(supplement)!=1 or supplement[0]['index']!=73 or supplement[0].get('classicSegment')!=28 or supplement[0].get('sourceRef') is not None or not unspan(supplement[0]['he']).startswith('רשב"ם: בריה קלה') or 'three hundred parasangs' not in unspan(supplement[0]['en']): fail('Restored Rashbam gloss mismatch')
 if any(int(x.get('classicSegment',0)) not in range(1,37) for x in segs): fail('Invalid Classic crosswalk')
 heading={(1,2):(3,[2,3]),(2,1):(7,[6,7]),(5,1):(12,[11,12]),(9,1):(34,[33,34])}
 for (section,comment),(primary,all_segments) in heading.items():
  item=next(x for x in segs if x.get('sourceSection')==section and x.get('sourceComment')==comment)
  if item.get('classicSegment')!=primary or item.get('classicSegments')!=all_segments: fail(f'Heading-bearing Classic crosswalk failed at {section}:{comment}')
 if any(x.get('classicSegment') in (2,6,11,33) for x in segs): fail('Heading-only Classic records must not be standalone passages')
 if study.get('sefariaSectionCounts')!=COUNTS or study.get('sefariaPassages')!=99 or study.get('totalPassages')!=100 or study.get('restoredBilingualSupplements')!=1: fail('Study count metadata mismatch')
 source=study.get('source',{}); expected_meta={'ref':'Likutei Moharan 17:1','prev':'Likutei Moharan 16:1','lastNext':'Likutei Moharan 18:1','versionTitle':'Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012','license':'CC-BY-NC','versionSource':'https://www.nli.org.il/he/books/NNL01','heVersionTitle':'Likutei Moharan - rabenubook.com','heLicense':'Public Domain','heVersionSource':'http://rabenubook.com/%D7%9C%D7%99%D7%A7%D7%95%D7%98%D7%99-%D7%9E%D7%95%D7%94%D7%A8%D7%B4%D7%9F-%D7%90/'}
 if any(source.get(k)!=v for k,v in expected_meta.items()): fail('Sefaria provenance mismatch')
 phrases=load(BASE/'phrase-study.json'); plist=phrases['phrases']; by_index={x['index']:x for x in segs}
 if len(plist)!=30 or len({x['id'] for x in plist})!=30 or phrases.get('selectedPassages',[0])[0]!=1 or phrases.get('selectedPassages',[0])[-1]!=100: fail('30-phrase distribution mismatch')
 for p in plist:
  seg=by_index[int(p['segment'])]
  if not all(str(p.get(k,'')).strip() for k in ('he','en','enMatch','info','source')) or p['he'] not in unspan(seg['he']) or p['enMatch'] not in unspan(seg['en']): fail(f'Phrase {p.get("id")} not exactly bilingual')
  if not all(f'data-inline-phrase="{p["id"]}"' in seg[k] for k in ('he','he_nikud','en')): fail(f'Phrase markers missing: {p["id"]}')
 pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-17.json'); availability={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
 if len(pettek.get('segments',[]))!=36 or [int(x['relatedSegment']) for x in pettek['segments']]!=list(range(1,37)) or pettek.get('layerAvailability')!=availability: fail('Pettek count/availability mismatch')
 for x in pettek['segments']:
  actual={layer:{lang:bool(str((x.get('layers',{}).get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in availability}
  if actual!=availability: fail(f'Pettek asymmetric record mismatch at {x.get("index")}')
 biur=load(ROOT/'public/reader/biur-halikutim/section-22.json')
 if biur.get('torah')!=17 or biur.get('displayNumber')!=17 or biur.get('sourceSection')!=22 or len(biur.get('segments',[]))!=17 or any(x.get('en') for x in biur['segments']): fail('Biur section22/Torah17 package mismatch')
 par=load(BASE/'parparos-lechochma.json')
 if par.get('sourceSection')!=18 or len(par.get('segments',[]))!=9 or [x['index'] for x in par['segments']]!=list(range(1,10)) or [x['sourceIndex'] for x in par['segments']]!=list(range(3,20,2)): fail('Parparos normalization mismatch')
 for x in par['segments']:
  if not x.get('he') or not x.get('en') or 'Siman 16' in x['en'] or not x.get('translationRepair') or not x.get('sourceEnglish'): fail(f'Parparos semantic repair missing at {x.get("index")}')
 prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-17.json'); ids=[f'p17{chr(97+i)}' for i in range(14)]
 if len(prayer.get('segments',[]))!=14 or [x.get('sourceId') for x in prayer['segments']]!=ids or prayer.get('excludedMetadata',{}).get('dateBars')!=5: fail('Prayer block/date boundary mismatch')
 if not prayer['segments'][0]['en'].startswith('Master of all worlds, Master of all souls') or not prayer['segments'][-1]['en'].startswith('Please, Hashem, Who hearkens to prayer, Who hearkens to the cry, Who hearkens to the sigh'): fail('Prayer first/final boundaries mismatch')
 nanach=load(BASE/'likutay-nanach.json'); nsegs=nanach.get('segments',[])
 if len(nsegs)!=58 or len({x.get('sourceIdentity') for x in nsegs})!=58 or any(not x.get('he') or x.get('en') for x in nsegs): fail('Nanach count/language/composite identity mismatch')
 expected_slices=[('volume-4/chapter-13.json',84,128),('volume-4/chapter-14.json',1,1),('volume-4/chapter-15.json',1,2),('volume-4/chapter-16.json',1,2),('volume-4/chapter-17.json',1,5),('volume-4/chapter-18.json',1,3)]
 actual=[]
 for f,a,b in expected_slices: actual += [(f,i) for i in range(a,b+1)]
 if [(x['sourceFile'],x['sourceIndex']) for x in nsegs]!=actual: fail('Nanach six-file slices mismatch')
 manifest=load(BASE/'peer-halikutim/manifest.json')
 if manifest.get('hebrewBooksId')!=66038 or manifest.get('sourceSha256')!=SHA or manifest.get('sourcePageRange')!=[33,112] or len(manifest.get('pages',[]))!=80: fail('Pe’er constants mismatch')
 if [x['sourcePage'] for x in manifest['pages']]!=list(range(33,113)) or any(x['sourcePage']==113 for x in manifest['pages']): fail('Pe’er exact page boundary mismatch')
 expected_assets={f'page-{n}.webp' for n in range(33,113)}; actual_assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; pdf_ready=(BASE/'peer-halikutim/peer-halikutim-torah-17.pdf').is_file()
 if actual_assets and actual_assets!=expected_assets or bool(actual_assets)!=pdf_ready: fail('Pe’er asset readiness mismatch')
 if not actual_assets and manifest.get('facsimileStatus')!='pending-separately-supervised-conversion': fail('Pending Pe’er status missing')
 astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/17.astro').read_text(encoding='utf-8'); layers=set(re.findall(r'data-open-source="([^"]+)"',astro))
 if layers!={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'}: fail(f'Expected nine study layers, got {sorted(layers)}')
 for token in ('<span><b>9</b> study layers</span>','Classic segment 28','17:8:2','110-record legacy alignment','beginner English-only','chapter 13 indices 84–128','heading 13#83','next heading 18#4','p17a–p17n','Pe’er pages 33–112','page 113 begins Torah 18','https://www.peer-halikutim.com/'):
  if token not in astro: fail(f'Route source-integrity token missing: {token}')
 discovery=[ROOT/'src/pages/reader/likutay-moharan/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro',ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro']
 for path in discovery:
  text=path.read_text(encoding='utf-8-sig').replace('\x00','')
  if '/reader/super/likutay-moharan/1/17' not in text and '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]' not in text: fail(f'Discovery missing in {path}')
 status='facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
 print('Validated Torah 17: 99 Sefaria leaves + restored Rashbam (100 bilingual passages), exact 36-segment crosswalk, 30 exact bilingual phrases, 9 study layers, Pettek 36 asymmetric, Biur 17, Parparos 9 repaired, Nanach 58, prayer 14, Pe’er pages 33–112; '+status+'.')
if __name__=='__main__': main()
