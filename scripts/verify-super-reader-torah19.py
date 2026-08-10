#!/usr/bin/env python3
"""Validate frozen Torah 19 Full Super Reader package in strict low-resource mode."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/19'
COUNTS=[3,1,19,8,10,3,3,9,34]; SHA='796b49291678cc50b05f90ca0e7e2955eae62b0f2455d798ca55aa2ddb9673d3'
AVAILABILITY={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
PRIMARY=[1,2,4,6]+[8]*19+[10]+[11]*7+[13]*3+[14]*7+[16]*3+[18]*3+[20]*9+[22]*2+[23]*3+[24]*3+[25]*2+[26]*8+[28]*2+[29]*3+[30]*4+[31]+[32]*3+[33]+[34]*2
MERGED={3:[3,4],4:[5,6],5:[7,8],24:[9,10],32:[12,13],42:[15,16],45:[17,18],48:[19,20],57:[21,22],74:[26,27]}
def load(path): return json.loads(Path(path).read_text(encoding='utf-8-sig').replace('\x00',''))
def plain(value): return re.sub(r'<span[^>]*>|</span>','',value or '').strip()
def require(condition,message):
 if not condition: raise RuntimeError(message)
def main():
 classic=load(ROOT/'public/reader/likutay-moharan/part-1/torah-19.json')
 require(len(classic.get('segments',[]))==34,'Classic physical/in-scope count must be 34')
 study=load(BASE/'torah-study.json'); segs=study.get('segments',[])
 require(len(PRIMARY)==90 and len(segs)==90 and [x.get('index') for x in segs]==list(range(1,91)),'Study must contain contiguous passages 1-90')
 refs=[f'Likutei Moharan 19:{section}:{leaf}' for section,count in enumerate(COUNTS,1) for leaf in range(1,count+1)]
 require([x.get('sourceRef') for x in segs]==refs and refs[0]=='Likutei Moharan 19:1:1' and refs[-1]=='Likutei Moharan 19:9:34','Exact 90-ref sequence mismatch')
 require(all(plain(x.get('he')) and plain(x.get('he_nikud')) and plain(x.get('en')) and plain(x['he'])!=plain(x['en']) for x in segs),'Every aligned passage must be genuinely bilingual')
 require([x.get('classicSegment') for x in segs]==PRIMARY,'Exact 34-Classic primary crosswalk mismatch')
 for index,merged in MERGED.items(): require(segs[index-1].get('classicSegments')==merged,f'Merged Classic crosswalk mismatch at passage {index}')
 require(all(not x.get('classicSegments') for i,x in enumerate(segs,1) if i not in MERGED),'Unexpected Classic heading merge')
 anomaly=segs[66]
 require(anomaly['sourceRef']=='Likutei Moharan 19:9:11' and plain(anomaly['rawSource']['he'])=='וְזֶה:' and len(plain(anomaly['rawSource']['en']))>=200 and anomaly['classicSegment']==26,'19:9:11 anomaly was not preserved')
 require(segs[73]['sourceRef']=='Likutei Moharan 19:9:18' and segs[73].get('classicSegments')==[26,27],'19:9:18 Classic 26/27 merge mismatch')
 require(study.get('sefariaSectionCounts')==COUNTS and study.get('sefariaPassages')==90 and study.get('totalPassages')==90 and study.get('productionAlignedPassages')==90 and study.get('restoredBilingualSupplements')==0,'Study count/restoration metadata mismatch')
 source=study.get('source',{}); expected_meta={'ref':'Likutei Moharan 19:1','prev':'Likutei Moharan 18:8','lastNext':'Likutei Moharan 20:1','versionTitle':'Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012','license':'CC-BY-NC','versionSource':'https://www.nli.org.il/he/books/NNL01','heVersionTitle':'Likutei Moharan - rabenubook.com','heLicense':'Public Domain','heVersionSource':'http://rabenubook.com/%D7%9C%D7%99%D7%A7%D7%95%D7%98%D7%99-%D7%9E%D7%95%D7%94%D7%A8%D7%B4%D7%9F-%D7%90/'}
 require(all(source.get(k)==v for k,v in expected_meta.items()),'Sefaria provenance mismatch')
 require('editionClose' not in study and not any(x.get('insertedSupplement') for x in segs),'Synthetic restoration/edition close must be absent')
 phrases=load(BASE/'phrase-study.json'); plist=phrases.get('phrases',[]); selected=phrases.get('selectedPassages',[])
 require(len(plist)==30 and len({x['id'] for x in plist})==30 and len(set(selected))==30 and selected[0]==1 and selected[-1]==90,'30-phrase distribution mismatch')
 by_index={x['index']:x for x in segs}
 for phrase in plist:
  segment=by_index[int(phrase['segment'])]
  require(all(str(phrase.get(k,'')).strip() for k in ('he','en','enMatch','info','source','sourceRef')),f'Incomplete phrase {phrase.get("id")}')
  require(phrase['source']==segment['sourceRef'] and phrase['he'] in plain(segment['he']) and phrase['enMatch'] in plain(segment['en']),f'Phrase source mismatch: {phrase.get("id")}')
  require(all(f'data-inline-phrase="{phrase["id"]}"' in segment[k] for k in ('he','he_nikud','en')),f'Phrase markers missing: {phrase["id"]}')
 pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-19.json'); psegments=pettek.get('segments',[])
 require(len(psegments)==34 and [int(x['index']) for x in psegments]==list(range(1,35)) and [int(x['relatedSegment']) for x in psegments]==list(range(1,35)) and pettek.get('layerAvailability')==AVAILABILITY,'Pettek count/availability mismatch')
 for item in psegments:
  actual={layer:{lang:bool(str((item.get('layers',{}).get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AVAILABILITY}; require(actual==AVAILABILITY,f'Pettek asymmetric language mismatch at {item.get("index")}')
  expected=[i for i,primary in enumerate(PRIMARY,1) if primary==item['relatedSegment'] or item['relatedSegment'] in MERGED.get(i,[])]
  require(item.get('alignedPassages')==expected and item.get('alignedPassage')==expected[0],f'Pettek crosswalk mismatch at {item.get("index")}')
 require(psegments[25]['alignedPassages']==list(range(67,75)) and psegments[26]['alignedPassages']==[74],'Pettek 26/27 special alignment mismatch')
 biur=load(ROOT/'public/reader/biur-halikutim/section-24.json'); bsegs=biur.get('segments',[])
 require(biur.get('sourceSection')==24 and biur.get('displayNumber')==19 and biur.get('title')=='תפילה לחבקוק סימן י"ט' and len(bsegs)==19 and [x['index'] for x in bsegs]==list(range(1,20)),'Biur section 24 package mismatch')
 require(all(x.get('he') and not x.get('en') for x in bsegs) and biur.get('hasEnglish') is False,'Biur must be Hebrew-only')
 parparos=load(BASE/'parparos-lechochma.json'); psegs=parparos.get('segments',[])
 require(parparos.get('sourceSection')==20 and len(psegs)==11 and [x['index'] for x in psegs]==list(range(1,12)),'Parparos normalized count mismatch')
 require([x['sourceIndex'] for x in psegs]==list(range(2,23,2)) and parparos.get('hasEnglish') is False and all(x.get('he') and not x.get('en') for x in psegs),'Parparos source indices/language honesty mismatch')
 prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-19.json'); qsegs=prayer.get('segments',[]); ids=[f'p19{chr(97+i)}' for i in range(12)]
 require(len(qsegs)==12 and [x.get('index') for x in qsegs]==list(range(1,13)) and [x.get('sourceId') for x in qsegs]==ids,'Prayer p19a-p19l boundary mismatch')
 require(prayer.get('totalParagraphs')==12 and prayer.get('navigation',{}).get('prevUrl')=='/reader/likutay-tefilos/1/18' and prayer.get('navigation',{}).get('nextUrl')=='/reader/likutay-tefilos/1/20','Prayer count/navigation regression')
 excluded=prayer.get('excludedMetadata',{}); require(excluded.get('dateBars')==3 and excluded.get('specialBars')==1 and all(x.get('he') and x.get('en') for x in qsegs),'Prayer block/bar metadata mismatch')
 require(not any(any(token in str(x.get('he','')) for token in ('Cheshvan','חֶשְׁוָן','לְשַׁבָּת קֹדֶשׁ')) for x in qsegs),'Prayer structural bar leaked into Hebrew')
 nanach=load(BASE/'likutay-nanach.json'); nsegs=nanach.get('segments',[])
 require(len(nsegs)==9 and [(x.get('sourceFile'),x.get('sourceIndex')) for x in nsegs]==[('volume-4/chapter-18.json',i) for i in range(11,20)],'Nanach chapter 18 range mismatch')
 require(all(x.get('he') and not x.get('en') for x in nsegs),'Nanach must be Hebrew-only')
 associations=load(ROOT/'src/data/lm-commentaries.json')['1']['19']['related_commentaries']; n_assoc=[x for x in associations if x.get('book')=='likutay-nanach']
 require(len(n_assoc)==1 and n_assoc[0].get('url')=='/reader/likutay-nanach/volume-4/chapter-18.json' and n_assoc[0].get('sourceRange')=={'startIndex':11,'endIndex':19,'count':9},'Nanach discovery association mismatch')
 manifest=load(BASE/'peer-halikutim/manifest.json')
 require(manifest.get('hebrewBooksId')==66038 and manifest.get('sourceSha256')==SHA and manifest.get('sourcePageRange')==[151,231],'Pe’er constants mismatch')
 require(len(manifest.get('pages',[]))==81 and [x['sourcePage'] for x in manifest['pages']]==list(range(151,232)),'Pe’er exact page range mismatch')
 require(all('page-232.webp' not in x.get('image','') for x in manifest['pages']),'Pe’er page 232 leaked into manifest')
 expected_assets={f'page-{n}.webp' for n in range(151,232)}; actual_assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; pdf_ready=(BASE/'peer-halikutim/peer-halikutim-torah-19.pdf').is_file()
 require((not actual_assets and not pdf_ready) or (actual_assets==expected_assets and pdf_ready),'Pe’er asset readiness mismatch')
 require(actual_assets or manifest.get('facsimileStatus')=='pending-separately-supervised-conversion','Pending Pe’er status missing')
 astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/19.astro').read_text(encoding='utf-8'); layers=set(re.findall(r'data-open-source="([^"]+)"',astro))
 require(layers=={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'},f'Expected nine study layers, got {sorted(layers)}')
 for token in ('<span><b>9</b> study layers</span>','exactly 90 Hebrew leaves','19:9:11','Classic segments 26 and 27','shifted 70 legacy Classic alignments','beginner English-only','source section 24 · 19 Hebrew-only records','source section 20 · 11 Hebrew-only records','chapter 18 indices 11–19','12 bilingual blocks p19a–p19l','Pe’er pages 151–231','page 232 begins Torah 20','https://www.peer-halikutim.com/'):
  require(token in astro,f'Route source-integrity token missing: {token}')
 classic_page=(ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro').read_text(encoding='utf-8-sig').replace('\x00',''); part_directory=(ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro').read_text(encoding='utf-8-sig').replace('\x00',''); book_directory=(ROOT/'src/pages/reader/likutay-moharan/index.astro').read_text(encoding='utf-8-sig').replace('\x00','')
 require('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]' in classic_page,'Classic route Super Reader integration missing')
 require('Array.from({ length: 19 }' in part_directory and 'Number(item.number) <= 19' in part_directory and '/reader/super/likutay-moharan/1/${number}' in part_directory,'Part directory spotlight/badge integration missing')
 require("Astro.redirect('/reader/likutay-moharan/1/'" in book_directory,'Book directory redirect discovery path changed')
 status='facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
 print('Validated Torah 19: 90 Sefaria bilingual leaves across 9 sections, exact 34-Classic crosswalk with 19:9:11 preserved and no synthetic restoration, 30 exact bilingual phrases, 9 study layers, Pettek 34 asymmetric, Biur 19, Parparos 11 Hebrew-only, Nanach 9, prayer 12, Pe’er pages 151–231; '+status+'.')
if __name__=='__main__': main()
