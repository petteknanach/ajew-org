#!/usr/bin/env python3
"""Validate frozen Torah 20 Full Super Reader package in strict low-resource mode."""
from __future__ import annotations
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'public/reader/super/likutay-moharan/1/20'
COUNTS=[8,4,2,8,10,2,1,1,3,39]; SHA='796b49291678cc50b05f90ca0e7e2955eae62b0f2455d798ca55aa2ddb9673d3'
AVAILABILITY={'beginner':{'he':False,'en':True},'intermediate':{'he':True,'en':True},'scholarly':{'he':True,'en':False}}
PRIMARY=[2,3]+[5]*6+[7]*4+[9]*2+[11]*4+[12]*2+[13]*2+[15]*2+[16]*8+[18]*2+[20,22]+[24]*3+[26]+[27]*18+[28]*19+[29]
MERGED={1:[1,2],3:[4,5],9:[6,7],13:[8,9],15:[10,11],23:[14,15],33:[17,18],35:[19,20],36:[21,22],37:[23,24],40:[25,26]}
def load(path): return json.loads(Path(path).read_text(encoding='utf-8-sig').replace('\x00',''))
def plain(value): return re.sub(r'<span[^>]*>|</span>','',value or '').strip()
def require(condition,message):
 if not condition: raise RuntimeError(message)
def main():
 classic=load(ROOT/'public/reader/likutay-moharan/part-1/torah-20.json')
 require(len(classic.get('segments',[]))==29,'Classic physical/in-scope count must be 29')
 study=load(BASE/'torah-study.json'); segs=study.get('segments',[])
 require(len(PRIMARY)==78 and len(segs)==78 and [x.get('index') for x in segs]==list(range(1,79)),'Study must contain contiguous passages 1-78')
 refs=[f'Likutei Moharan 20:{section}:{leaf}' for section,count in enumerate(COUNTS,1) for leaf in range(1,count+1)]
 require([x.get('sourceRef') for x in segs]==refs and refs[0]=='Likutei Moharan 20:1:1' and refs[-1]=='Likutei Moharan 20:10:39','Exact 78-ref sequence mismatch')
 require(all(plain(x.get('he')) and plain(x.get('he_nikud')) and plain(x.get('en')) and plain(x['he'])!=plain(x['en']) for x in segs),'Every aligned passage must be genuinely bilingual')
 require([x.get('classicSegment') for x in segs]==PRIMARY,'Exact 29-Classic primary crosswalk mismatch')
 for index,merged in MERGED.items(): require(segs[index-1].get('classicSegments')==merged,f'Merged Classic crosswalk mismatch at passage {index}')
 require(all(not x.get('classicSegments') for i,x in enumerate(segs,1) if i not in MERGED),'Unexpected Classic heading merge')
 require(segs[39]['sourceRef']=='Likutei Moharan 20:10:1' and plain(segs[39]['rawSource']['he']).startswith('יא') and segs[39].get('classicSegments')==[25,26],'20:10:1 heading disagreement not preserved')
 require(segs[40]['sourceRef']=='Likutei Moharan 20:10:2' and plain(segs[40]['rawSource']['he'])=='וְזֶהוּ:' and len(plain(segs[40]['rawSource']['en']))>=800 and 'mi st reated' in plain(segs[40]['rawSource']['en']),'20:10:2 anomaly not preserved')
 require(study.get('sefariaSectionCounts')==COUNTS and study.get('sefariaPassages')==78 and study.get('totalPassages')==78 and study.get('productionAlignedPassages')==78 and study.get('restoredBilingualSupplements')==0,'Study count/restoration metadata mismatch')
 source=study.get('source',{}); expected_meta={'ref':'Likutei Moharan 20:1','prev':'Likutei Moharan 19:9','lastNext':'Likutei Moharan 21:1','versionTitle':'Likutey Moharan Volumes 1-11, trans. by Moshe Mykoff. Breslov Research Inst., 1986-2012','license':'CC-BY-NC','versionSource':'https://www.nli.org.il/he/books/NNL01','heVersionTitle':'Likutei Moharan - rabenubook.com','heLicense':'Public Domain','heVersionSource':'http://rabenubook.com/%D7%9C%D7%99%D7%A7%D7%95%D7%98%D7%99-%D7%9E%D7%95%D7%94%D7%A8%D7%B4%D7%9F-%D7%90/'}
 require(all(source.get(k)==v for k,v in expected_meta.items()),'Sefaria provenance mismatch')
 require('editionClose' not in study and not any(x.get('insertedSupplement') for x in segs),'Synthetic restoration/edition close must be absent')
 phrases=load(BASE/'phrase-study.json'); plist=phrases.get('phrases',[]); selected=phrases.get('selectedPassages',[])
 require(len(plist)==30 and len({x['id'] for x in plist})==30 and len(set(selected))==30 and selected[0]==1 and selected[-1]==78,'30-phrase distribution mismatch')
 by_index={x['index']:x for x in segs}
 for phrase in plist:
  segment=by_index[int(phrase['segment'])]
  require(all(str(phrase.get(k,'')).strip() for k in ('he','en','enMatch','info','source','sourceRef')),f'Incomplete phrase {phrase.get("id")}')
  require(phrase['source']==segment['sourceRef'] and phrase['he'] in plain(segment['he']) and phrase['enMatch'] in plain(segment['en']),f'Phrase source mismatch: {phrase.get("id")}')
  require(all(f'data-inline-phrase="{phrase["id"]}"' in segment[k] for k in ('he','he_nikud','en')),f'Phrase markers missing: {phrase["id"]}')
 pettek=load(ROOT/'public/reader/pettek-nanach-commentary/torah-20.json'); psegments=pettek.get('segments',[])
 require(len(psegments)==29 and [int(x['index']) for x in psegments]==list(range(1,30)) and [int(x['relatedSegment']) for x in psegments]==list(range(1,30)) and pettek.get('layerAvailability')==AVAILABILITY,'Pettek count/availability mismatch')
 for item in psegments:
  actual={layer:{lang:bool(str((item.get('layers',{}).get(layer) or {}).get(lang) or '').strip()) for lang in ('he','en')} for layer in AVAILABILITY}; require(actual==AVAILABILITY,f'Pettek asymmetric language mismatch at {item.get("index")}')
  expected=[i for i,primary in enumerate(PRIMARY,1) if primary==item['relatedSegment'] or item['relatedSegment'] in MERGED.get(i,[])]
  require(item.get('alignedPassages')==expected and item.get('alignedPassage')==expected[0],f'Pettek crosswalk mismatch at {item.get("index")}')
 biur=load(ROOT/'public/reader/biur-halikutim/section-25.json'); bsegs=biur.get('segments',[])
 require(biur.get('sourceSection')==25 and biur.get('displayNumber')==20 and biur.get('title')=="ט' תיקונין-סימן כ'" and len(bsegs)==27 and [x['index'] for x in bsegs]==list(range(1,28)),'Biur section 25 package mismatch')
 require(all(x.get('he') and not x.get('en') for x in bsegs) and biur.get('hasEnglish') is False,'Biur must be Hebrew-only')
 parparos=load(BASE/'parparos-lechochma.json'); psegs=parparos.get('segments',[])
 require(parparos.get('sourceSection')==21 and len(psegs)==17 and [x['index'] for x in psegs]==list(range(1,18)),'Parparos normalized count mismatch')
 require([x['sourceIndex'] for x in psegs]==list(range(2,35,2)) and parparos.get('hasEnglish') is False and all(x.get('he') and not x.get('en') for x in psegs),'Parparos source indices/language honesty mismatch')
 prayer=load(ROOT/'public/reader/likutay-tefilos/part-1/prayer-20.json'); qsegs=prayer.get('segments',[]); ids=[f'p20{chr(97+i)}' for i in range(7)]
 require(len(qsegs)==7 and [x.get('index') for x in qsegs]==list(range(1,8)) and [x.get('sourceId') for x in qsegs]==ids,'Prayer p20a-p20g boundary mismatch')
 require(prayer.get('totalParagraphs')==7 and prayer.get('navigation',{}).get('prevUrl')=='/reader/likutay-tefilos/1/19' and prayer.get('navigation',{}).get('nextUrl')=='/reader/likutay-tefilos/1/21','Prayer count/navigation regression')
 excluded=prayer.get('excludedMetadata',{}); require(excluded.get('dateBars')==1 and excluded.get('specialBars')==1 and all(x.get('he') and x.get('en') for x in qsegs),'Prayer block/bar metadata mismatch')
 require(not any(any(token in str(x.get('he','')) for token in ('Cheshvan','חֶשְׁוָן','פֶּסַח')) for x in qsegs),'Prayer structural bar leaked into Hebrew')
 nanach=load(BASE/'likutay-nanach.json'); nsegs=nanach.get('segments',[])
 require(len(nsegs)==6 and [(x.get('sourceFile'),x.get('sourceIndex')) for x in nsegs]==[('volume-4/chapter-18.json',i) for i in range(21,27)],'Nanach chapter 18 range mismatch')
 require(all(x.get('he') and not x.get('en') for x in nsegs),'Nanach must be Hebrew-only')
 associations=load(ROOT/'src/data/lm-commentaries.json')['1']['20']['related_commentaries']; n_assoc=[x for x in associations if x.get('book')=='likutay-nanach']; p_assoc=[x for x in associations if x.get('book')=='parparos-lechochma']
 require(len(n_assoc)==1 and n_assoc[0].get('url')=='/reader/likutay-nanach/volume-4/chapter-18.json' and n_assoc[0].get('sourceRange')=={'startIndex':21,'endIndex':26,'count':6},'Nanach discovery association mismatch')
 require(len(p_assoc)==1 and int(p_assoc[0].get('sectionNumber'))==21,'False Parparos section 11 association remains')
 manifest=load(BASE/'peer-halikutim/manifest.json')
 require(manifest.get('hebrewBooksId')==66038 and manifest.get('sourceSha256')==SHA and manifest.get('sourcePageRange')==[232,300],'Pe’er constants mismatch')
 require(len(manifest.get('pages',[]))==69 and [x['sourcePage'] for x in manifest['pages']]==list(range(232,301)),'Pe’er exact page range mismatch')
 require(manifest.get('pdf')=='/reader/super/likutay-moharan/1/20/peer-halikutim/peer-halikutim-torah-20.pdf' and all(x.get('image')==f'/reader/super/likutay-moharan/1/20/peer-halikutim/page-{x["sourcePage"]}.webp' for x in manifest['pages']),'Pe’er Torah 20 public paths mismatch')
 require('Torah 20 is PDF pages 232–300 inclusive (69 pages); page 301 begins Torah 21' in manifest.get('textNotice',''),'Pe’er boundary notice mismatch')
 require(all('page-301.webp' not in x.get('image','') for x in manifest['pages']),'Pe’er page 301 leaked into manifest')
 expected_assets={f'page-{n}.webp' for n in range(232,301)}; actual_assets={p.name for p in (BASE/'peer-halikutim').glob('page-*.webp')}; pdf_ready=(BASE/'peer-halikutim/peer-halikutim-torah-20.pdf').is_file()
 require((not actual_assets and not pdf_ready) or (actual_assets==expected_assets and pdf_ready),'Pe’er asset readiness mismatch')
 require(actual_assets or manifest.get('facsimileStatus')=='pending-separately-supervised-conversion','Pending Pe’er status missing')
 astro=(ROOT/'src/pages/reader/super/likutay-moharan/1/20.astro').read_text(encoding='utf-8'); layers=set(re.findall(r'data-open-source="([^"]+)"',astro))
 require(layers=={'phrase','guide','pettek','biur','parparos','nanach','prayer','peer','notes'},f'Expected nine study layers, got {sorted(layers)}')
 for token in ('<span><b>9</b> study layers</span>','exactly 78 Hebrew leaves','20:10:1','20:10:2','shifted 67 legacy Classic alignments','beginner English-only','source section 25 · 27 Hebrew-only records','source section 21 · 17 Hebrew-only records','chapter 18 indices 21–26','7 bilingual blocks p20a–p20g','Pe’er pages 232–300','page 301 begins Torah 21','https://www.peer-halikutim.com/'):
  require(token in astro,f'Route source-integrity token missing: {token}')
 classic_page=(ROOT/'src/pages/reader/likutay-moharan/[part]/[torah].astro').read_text(encoding='utf-8-sig').replace('\x00',''); part_directory=(ROOT/'src/pages/reader/likutay-moharan/[part]/index.astro').read_text(encoding='utf-8-sig').replace('\x00',''); book_directory=(ROOT/'src/pages/reader/likutay-moharan/index.astro').read_text(encoding='utf-8-sig').replace('\x00','')
 require('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]' in classic_page,'Classic route Super Reader integration missing')
 require('Array.from({ length: 20 }' in part_directory and 'Number(item.number) <= 20' in part_directory and '/reader/super/likutay-moharan/1/${number}' in part_directory,'Part directory spotlight/badge integration missing')
 require("Astro.redirect('/reader/likutay-moharan/1/'" in book_directory,'Book directory redirect discovery path changed')
 status='facsimiles ready' if actual_assets else 'facsimiles pending separately supervised conversion'
 print('Validated Torah 20: 78 Sefaria bilingual leaves across 10 sections, exact 29-Classic crosswalk with 20:10:1/2 preserved and no synthetic restoration, 30 exact bilingual phrases, 9 study layers, Pettek 29 asymmetric, Biur 27, Parparos 17 Hebrew-only, Nanach 6, prayer 7, Pe’er pages 232–300; '+status+'.')
if __name__=='__main__': main()
