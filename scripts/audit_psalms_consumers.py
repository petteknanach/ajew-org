#!/usr/bin/env python3
"""Inventory every direct Psalms reading surface; differences are reports, not repairs."""
import argparse,difflib,hashlib,html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def text(s):return html.unescape(re.sub('<[^>]+>','',s))
def key(s):
    # Comparison-only: this page uses substitute divine names and ASCII hyphens.
    s=re.sub('[^א-ת]','',s)
    return s.replace('אלהים','אלקים').replace('יהוה','יי')
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--app',type=Path,required=True);ap.add_argument('--canonical',type=Path,required=True);a=ap.parse_args()
    out=ROOT/'audit/psalms-text';report={'scope':'Direct Psalms bodies and dynamic reading endpoints. Incidental quotations in other books are inventory-only, not a verified Psalter edition.'}
    chapters={c:json.loads((ROOT/f'public/reader/tanach-tehillim/part-1/torah-{c}.json').read_text())['segments'] for c in range(1,151)}
    local=[]
    for c,segs in chapters.items():
        rel=f'public/texts/tanach/psalms/{c}.json';p=ROOT/rel
        if not p.is_file():p=a.canonical/rel
        d=json.loads(p.read_text());assert [v['num'] for v in d['verses']]==[s['index'] for s in segs]
        for v,s in zip(d['verses'],segs):local.append({'ref':f'{c}:{v["num"]}','reader_exact':v['he']==s['he_nikud']})
    report['localVerseLookup']={'chapters':150,'verses':len(local),'exact':sum(r['reader_exact'] for r in local),'differences':[r for r in local if not r['reader_exact']]}
    chat=a.app/'assets/data/tikun-chatzos.json';body=json.loads(chat.read_text());ch=[]
    for sec in body['sections']:
        if sec.get('type')!='psalm':continue
        c=int(sec['id'].split('_')[1]);expected=[s['he_nikud'] for s in chapters[c]]
        if sec['id']=='psalm_24_opening':
            assert '24:7-10' in sec['titleEn']
            expected=expected[6:10]
        ch.append({'id':sec['id'],'chapter':c,'verses':len(sec['text']),'reader_exact':sec['text']==expected,'differences':[{'row':i+1,'actual':x,'expected':y} for i,(x,y) in enumerate(zip(sec['text'],expected)) if x!=y]})
    report['chatzos']={'sha256':sha(chat),'sections':ch}
    page=ROOT/'src/pages/tikkun-klali.astro';raw=page.read_text();static=[]
    for cm,section in re.findall(r'<h2>Psalm (\d+).*?</h2>(.*?)</section>',raw,re.S):
        c=int(cm);actual=[text(s).strip() for s in re.findall(r'<p class="verse-hebrew"[^>]*>(.*?)</p>',section,re.S)];source=chapters[c]
        # One-to-one order alignment, equal only after expressly diagnostic key.
        sm=difflib.SequenceMatcher(None,[key(s['he_nikud']) for s in source],[key(s) for s in actual],autojunk=False);blocks=[]
        for op,i,j,k,l in sm.get_opcodes():
            if op!='equal':blocks.append({'operation':op,'source_refs':[s['index'] for s in source[i:j]],'source':[s['he_nikud'] for s in source[i:j]],'page_row_indexes':list(range(k+1,l+1)),'page':actual[k:l]})
        static.append({'chapter':c,'expected':len(source),'actual':len(actual),'source_verses':source,'page_verses':actual,'differences':blocks,'aligned_nikud_comparisons':[{'ref':f'{c}:{source[i+n]["index"]}','page_row':k+n+1,'source':source[i+n]['he_nikud'],'page':actual[k+n],'exact_text':source[i+n]['he_nikud']==actual[k+n]} for op,i,j,k,l in sm.get_opcodes() if op=='equal' for n in range(j-i)]})
    report['standaloneTikunHaklali']={'path':str(page),'sha256':sha(page),'chapters':static,'status':'Unrepaired inherited differences and omissions. Requires a separately approved whole-page source/alignment repair; no English altered.'}
    report['routes']=[
      {'surface':'app general Reader original/search/share/offline download','source':'/reader/tanach-tehillim/part-1/torah-N.json','repair':'13 holam relocations require site delivery and cache refresh'},
      {'surface':'app general Reader annotated; Shnayim; Tikun; Chok','source':'/reader/medooyuk/tanach-tehillim.json','result':'2527 exact UXLC verses; parsed/marked text checked in four modes'},
      {'surface':'app Succos all Psalms, Hallel, Ascents','source':'assets/data/succos/psalms/1..150.json','result':'2527 exact UXLC verses including all existing marks/English'},
      {'surface':'app Tikun Haklali','source':'assets/tikkun-klali-raw.json','result':'10 chapters all original-reader exact; no listed holam repairs in these chapters'},
      {'surface':'app Tikun Chatzos','source':'assets/data/tikun-chatzos.json','result':'see per-section audit'},
      {'surface':'site general Reader original/Medooyuk','source':'reader JSON + medooyuk JSON','result':'Medooyuk button silently changes editions, not only annotations. Parent coordination required.'},
      {'surface':'site Tikun/Shnayim/Chok','source':'reader/medooyuk/tanach-tehillim.json via public/tikkun.js and public/chok.js','result':'shared renderer exact text in four modes; full page interactions not exercised'},
      {'surface':'site API verse-lookup','source':'public/texts/tanach/psalms/*.json','result':'see exhaustive localVerseLookup audit; disabled src route, live API status not assumed'},
      {'surface':'site /tikkun-klali','source':'inline Hebrew/English/transliteration','result':'see standaloneTikunHaklali; not reader JSON'},
      {'surface':'site /teachings/tikkun-haklali','source':'standalone historical teaching page','result':'not a direct Hebrew Psalter renderer'},
    ]
    (out/'consumer-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'localVerseLookup':report['localVerseLookup'],'chatzos':[{k:v for k,v in s.items() if k!='differences'} for s in ch],'static':[{k:v for k,v in s.items() if k in ('chapter','expected','actual')} for s in static]},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
