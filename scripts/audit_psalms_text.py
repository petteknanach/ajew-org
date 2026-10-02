#!/usr/bin/env python3
"""Read-only exhaustive Psalms source audit. Diagnostic normalization is NEVER a repair.
Run --app /path/to/app --output /evidence. Inputs remain byte-exact.
"""
import argparse, csv, difflib, hashlib, html, json, re, unicodedata, xml.etree.ElementTree as ET
from pathlib import Path

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def flatten(n):
    return (n.text or '') + ''.join((flatten(c) if c.tag == 's' else '') + (c.tail or '') for c in n)
def uxlc(path):
    return {(int(c.get('n')),int(v.get('n'))): {'t':[flatten(n) for n in v if n.tag in ('w','q')], 'k':[int(n.tag=='q') for n in v if n.tag in ('w','q')], 'xml':ET.tostring(v,encoding='unicode')} for c in ET.parse(path).getroot().iter('c') for v in c.findall('v')}
def diagnostic(text):
    # Accent/meteg, editorial punctuation, and mark-order differences ONLY in report comparison.
    text=html.unescape(re.sub('<[^>]+>','',text))
    text=re.sub(r'\([^)]*\)|\{[^}]*\}','',text)
    text=re.sub('[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3\u05C4\u05C5\u200e\u200f\u034f:]','',text)
    return unicodedata.normalize('NFC',text.replace('־',' ')).split()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--app',type=Path,required=True);ap.add_argument('--output',type=Path,required=True);args=ap.parse_args()
    site=Path(__file__).resolve().parents[1]; out=args.output;out.mkdir(parents=True,exist_ok=True)
    sources=site/'audit/psalms-text'; ux=uxlc(sources/'UXLC-Psalms.xml'); mdpath=site/'public/reader/medooyuk/tanach-tehillim.json';md=json.loads(mdpath.read_text())['ch']
    mam={}
    for row in csv.reader((sources/'MAM-Psalms.csv').open()):
        m=re.fullmatch(r'Psalms (\d+):(\d+)',row[0])
        if m:mam[tuple(map(int,m.groups()))]=row[1]
    assert len(ux)==len(mam)==2527 and {c for c,v in ux}==set(range(1,151))
    ns='{http://www.bibletechnologies.net/2003/OSIS/namespace}'
    oshb={}
    for verse in ET.parse(sources/'OSHB-Ps.xml').getroot().iter(ns+'verse'):
        key=tuple(map(int,verse.attrib['osisID'].split('.')[1:]))
        tokens=[]
        for n in verse:
            if n.tag==ns+'w' and n.get('type')!='x-ketiv':tokens.append((n.text or '').replace('/',''))
            elif n.tag==ns+'note' and n.get('type')=='variant':
                tokens.extend((w.text or '').replace('/','') for rdg in n.findall(ns+'rdg') if rdg.get('type')=='x-qere' for w in rdg.findall(ns+'w'))
            elif n.tag==ns+'seg':tokens.append(n.text or '')
        oshb[key]=' '.join(tokens)
    assert set(oshb)==set(mam)==set(ux)
    corrections=[{'citation':n.findtext('citation'),'description':n.findtext('description'),'date':n.findtext('date'),'author':n.findtext('author')} for n in ET.parse(sources/'UXLC-Psalms.xml').getroot().iter('correction')]
    (out/'uxlc-editorial-corrections.json').write_text(json.dumps(corrections,ensure_ascii=False,indent=2)+'\n')
    independent=[]
    rows=[]; differences=[]; files=[mdpath, sources/'UXLC-Psalms.xml', sources/'MAM-Psalms.csv', sources/'OSHB-Ps.xml']; bundle_differences=[];originals={}
    for c in range(1,151):
        op=site/f'public/reader/tanach-tehillim/part-1/torah-{c}.json';bp=args.app/f'assets/data/succos/psalms/{c}.json';files += [op,bp]
        original=json.loads(op.read_text()); bundled=json.loads(bp.read_text()); segs=original['segments'];bs=bundled['segments']; expected=[v for cc,v in ux if cc==c]
        assert [s['index'] for s in segs]==expected==[s['index'] for s in bs]
        originals[c]=segs
        for s,b in zip(segs,bs):
            v=s['index'];ref=f'{c}:{v}';source=ux[c,v];mv=md[str(c)][str(v)];mt=source['t'];
            row={'ref':ref,'original_sha256':hashlib.sha256(s['he_nikud'].encode()).hexdigest(),'medooyuk_source_exact':mv['t']==mt and mv['k']==source['k'],'bundle_tokens_source_exact':b.get('medooyuk',{}).get('t')==mt,'bundle_annotations_site_exact':b.get('medooyuk')==mv,'bundle_plain_space_join_exact':b['he']==' '.join(mt),'source_maqaf':sum(t.count('־') for t in mt),'source_meteg':sum(t.count('ֽ') for t in mt),'original_maqaf':s['he_nikud'].count('־'),'original_meteg':s['he_nikud'].count('ֽ'),'qere':any(source['k']),'internal_maqaf':[t for t in mt if '־' in t.rstrip('־')]}
            a=diagnostic(s['he_nikud']);z=diagnostic(' '.join(mt));ma=diagnostic(mam[c,v]);row['original_uxlc_diagnostic_equal']=a==z;row['original_mam_diagnostic_equal']=a==ma
            independent.append({'ref':ref,'original':s['he_nikud'],'UXLC':' '.join(mt),'MAM_HTML':mam[c,v],'OSHB_reading':oshb[c,v], 'original_OSHB_diagnostic_equal':a==diagnostic(oshb[c,v]),'UXLC_OSHB_diagnostic_equal':z==diagnostic(oshb[c,v]), 'UXLC_notes':[n for n in corrections if (n['citation'] or '').startswith(ref+'.')], 'status':'comparison_only_not_authority_to_normalize'})
            for tag,i,j,k,l in difflib.SequenceMatcher(None,a,z,autojunk=False).get_opcodes():
                if tag!='equal':differences.append({'ref':ref,'original':a[i:j],'UXLC':z[k:l],'MAM_verse':mam[c,v],'original_full':s['he_nikud'],'UXLC_full':' '.join(mt),'kind':'unadjudicated_source_difference','qere':row['qere']})
            if not all(row[k] for k in ['medooyuk_source_exact','bundle_tokens_source_exact','bundle_annotations_site_exact','bundle_plain_space_join_exact']):bundle_differences.append({'ref':ref,'status':row,'site':mv,'bundle':b,'source':source})
            rows.append(row)
    rawpath=args.app/'assets/tikkun-klali-raw.json';files.append(rawpath);raw=json.loads(rawpath.read_text());rawreport=[]
    for c,verses in raw.items():
        wanted=originals[int(c)];rawreport.append({'chapter':int(c),'verses':len(verses),'original_exact':verses==[s['he_nikud'] for s in wanted]})
    summary={'chapters':150,'verses':len(rows),'medooyuk_source_exact':sum(r['medooyuk_source_exact'] for r in rows),'bundled_tokens_source_exact':sum(r['bundle_tokens_source_exact'] for r in rows),'bundle_allfield_differences':len(bundle_differences),'original_uxlc_diagnostic_equal':sum(r['original_uxlc_diagnostic_equal'] for r in rows),'original_mam_diagnostic_equal':sum(r['original_mam_diagnostic_equal'] for r in rows),'unadjudicated_word_difference_blocks':len(differences),'source_maqaf':sum(r['source_maqaf'] for r in rows),'source_meteg':sum(r['source_meteg'] for r in rows),'original_maqaf':sum(r['original_maqaf'] for r in rows),'original_meteg':sum(r['original_meteg'] for r in rows),'source_internal_maqaf':[r for r in rows if r['internal_maqaf']],'tikun_haklali':rawreport}
    for name,value in [('independent-comparison',independent),('verses',rows),('source-differences',differences),('bundle-differences',bundle_differences),('summary',summary),('input-hashes',[{'path':str(p),'sha256':sha(p)} for p in files if p.is_file()])]:
        (out/f'{name}.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
