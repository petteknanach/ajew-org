#!/usr/bin/env python3
"""Import the frozen Torah 28 bilingual Sefaria witness."""
import html, json, re
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/reader/super/likutay-moharan/1/28/torah-study.json'
CLASSIC=ROOT/'public/reader/likutay-moharan/part-1/torah-28.json'
API='https://www.sefaria.org/api/texts/Likutei_Moharan.28.{section}?context=0&commentary=0'
COUNTS=[6,4,4,7,5,10]
MARKS=re.compile(r'[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]')
KNOWN_TAGS=re.compile(r'</?(?:i|b|em|strong|span|small|sup|br)(?:\s[^>]*)?>',re.I)
def plain(v): return re.sub(r'\s+',' ',html.unescape(KNOWN_TAGS.sub('',v or ''))).strip()
def classic_segment(s,l):
    if s==1: return 1 if l==1 else 3
    if s==2: return 4
    if s==3: return 5
    if s in (4,5): return 6
    return 7
def main():
    classic=json.loads(CLASSIC.read_text(encoding='utf-8-sig').replace('\x00',''))
    if len(classic['segments'])!=7: raise RuntimeError('Classic Torah 28 witness changed')
    segments=[]; sections=[]
    for section,expected in enumerate(COUNTS,1):
        data=requests.get(API.format(section=section),timeout=45).json(); he=data.get('he') or []; en=data.get('text') or []
        if data.get('ref')!=f'Likutei Moharan 28:{section}' or len(he)!=expected or len(en)!=expected: raise RuntimeError(f'Sefaria Torah 28 section {section} changed')
        prev='Likutei Moharan 27:10' if section==1 else f'Likutei Moharan 28:{section-1}'; nxt='Likutei Moharan 29:1' if section==6 else f'Likutei Moharan 28:{section+1}'
        if data.get('prev')!=prev or data.get('next')!=nxt: raise RuntimeError(f'Sefaria boundary changed at section {section}')
        sections.append(data)
        for leaf,(rh,re_) in enumerate(zip(he,en),1):
            hn,english=plain(rh),plain(re_)
            if not hn or not english: raise RuntimeError(f'empty 28:{section}:{leaf}')
            segments.append({'index':len(segments)+1,'sourceSection':section,'sourceComment':leaf,'sourceRef':f'Likutei Moharan 28:{section}:{leaf}','provenance':'Sefaria bilingual witness: rabenubook.com Hebrew and Moshe Mykoff / BRI English','he':MARKS.sub('',hn),'he_nikud':hn,'en':english,'rawSource':{'he':rh,'en':re_},'classicSegment':classic_segment(section,leaf)})
    probe=requests.get(API.format(section=7),timeout=45).json()
    if (probe.get('he') or []) or (probe.get('text') or []) or probe.get('prev')!='Likutei Moharan 28:6' or probe.get('next')!='Likutei Moharan 29:1': raise RuntimeError('section 7 upper-bound probe changed')
    if len(segments)!=36: raise RuntimeError('passage count')
    first,last=sections[0],sections[-1]
    payload={'id':'super-lm-1-28-study','book':'likutay-moharan','part':1,'torah':28,'displayNumber':'28','title':classic['title'],'hebrewTitle':classic['hebrewTitle'],'keyVerse':classic.get('keyVerse'),'keyVerseTranslation':segments[0]['en'],'keyVerseRef':classic.get('keyVerseRef'),'themes':classic.get('themes',[]),'segments':segments,'structuralNotes':[],'totalPassages':36,'productionAlignedPassages':36,'productionDisplayRecords':36,'sefariaSections':6,'sefariaSectionCounts':COUNTS,'sefariaPassages':36,'classicFileSegments':7,'classicInScopeSegments':7,'restoredBilingualSupplements':0,'structuralRestorations':0,'hasEnglish':True,'hasNikud':True,'license':{'he':'Public Domain (Likutei Moharan - rabenubook.com via Sefaria)','en':'CC-BY-NC (Moshe Mykoff / Breslov Research Institute via Sefaria)'},'source':{'sefariaRef':'Likutei Moharan 28:1-6','apiPattern':API,'classicFile':str(CLASSIC.relative_to(ROOT)),'ref':first.get('ref'),'prev':first.get('prev'),'lastRef':last.get('ref'),'lastNext':last.get('next'),'versionTitle':first.get('versionTitle'),'license':first.get('license'),'versionSource':first.get('versionSource'),'heVersionTitle':first.get('heVersionTitle'),'heLicense':first.get('heLicense'),'heVersionSource':first.get('heVersionSource'),'versions':first.get('versions',[]),'upperBoundProbe':'Likutei Moharan 28:7'},'alignmentNotes':['Exactly 36 licensed bilingual Sefaria leaves; no supplement or structural restoration.','Classic segments establish the frozen coarse crosswalk only; shifted coarse Classic English is unused.']}
    OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Prepared Torah 28: 36 exact bilingual Sefaria leaves across sections 1–6.')
if __name__=='__main__': main()
