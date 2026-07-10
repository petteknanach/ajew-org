#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path('/root/ajew-org')
DL=Path('/mnt/c/Users/Pettek/Downloads')
NS='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS=re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE=re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)
SKIP_HE={'ראה','ליקוטים מליקוטי הלכות ומספרי רבנו','טקסט עברי מתוקן ומשוחזר'}
SKIP_EN={'Re’eh','Reeh','Ri’ay','Riay','Selected Teachings from Likutay Halachos and Rabbeinu’s Works','Scholastic Formal-Equivalence Translation'}
EN_FILLS={
  109: 'Three times a year all your males shall appear before Hashem your God. The essence of holiness is to believe that everything is by His will and to yearn and long for Him constantly with a strong will. The holiness of the Beis HaMikdash is rooted in the Holy of Holies, the will of wills. Therefore on the three festivals, which reveal holy calling and holy will, one ascends to appear before Hashem. “The face of Hashem” is the light of will, called face. This light is received through tzedakah and willing offerings, and through them the joy and holiness of the festivals are drawn down.'
}

def clean(s):
    s=MARKS.sub('',s or '').strip()
    return re.sub(r'\s+', ' ', s).strip()

def docx_paras(path):
    root=ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out=[]
    for p in root.iter(NS+'p'):
        s=clean(''.join(t.text or '' for t in p.iter(NS+'t')))
        if s: out.append(s)
    return out

def strip_public_notes(text):
    text=re.sub(r'^(?:Translator[’\']s Addition|Translator’s Addition|Translator\'s Addition)\s*[—-]\s*', '', text).strip()
    text=re.sub(r'^תוספת מאת המתרגם\s*[—-]\s*', '', text).strip()
    text=re.sub(r'^(?:Summary|סיכום)\s*:\s*', '', text).strip()
    text=re.sub(r'^(?:Diagram|תרשים)\s*:\s*', '', text).strip()
    text=re.sub(r'\s*[א-ת״׳"\s]+גרסאות לקריאת מכונה\s*/\s*AI agents:\s*$', '', text).strip()
    text=text.replace('Parashas Re’eh','Parashas Ri’ay').replace('Parashas Reeh','Parashas Ri’ay').replace('Re’eh','Ri’ay').replace('Reeh','Ri’ay')
    return text

def parse(path, lang):
    ps=docx_paras(path)
    entries=[]; summary=''; diagram=''; heading=''; current=None
    skip=SKIP_HE if lang=='he' else SKIP_EN
    for i,s in enumerate(ps):
        if s in skip: continue
        if 'error_outline Translation error' in s: continue
        if s.startswith('Translator') or s.startswith('תוספת מאת המתרגם'):
            st=strip_public_notes(s)
            if '→' in st: diagram=st
            elif not summary: summary=st
            continue
        if s.startswith('Editorial note:') or s.startswith('הערת עריכה:'):
            continue
        m=NUM_RE.match(s)
        if m:
            current={'number':int(m.group(1)),'heading':heading,'text':strip_public_notes(m.group(2).strip()),'type':'teaching'}
            entries.append(current); heading=''; continue
        nxt=ps[i+1] if i+1<len(ps) else ''
        if NUM_RE.match(nxt):
            heading=strip_public_notes(s)
        elif current is not None:
            cleaned=strip_public_notes(s)
            if cleaned:
                current['text']=strip_public_notes((current['text']+'\n\n'+cleaned).strip())
        else:
            heading=strip_public_notes(s)
    return {'summary':summary,'diagram':diagram,'entries':entries}

he=parse(DL/'Reeh_AJew_corrected_Hebrew.docx','he')
en_raw=parse(DL/'Reeh_AJew_formal_equivalence_English.docx','en')
# English source has one carry-over [1] from Aikev; [2] aligns to Hebrew [1].
en_by_num={e['number']-1: {'heading': e['heading'], 'text': e['text']} for e in en_raw['entries'] if e['number'] >= 2}
hnums=[x['number'] for x in he['entries']]
missing=[n for n in hnums if n not in en_by_num and n not in EN_FILLS]
if missing:
    raise SystemExit(f'missing English entries without fills: {missing}')
entries=[]
for h in he['entries']:
    e=en_by_num.get(h['number']) or {'heading':'','text':EN_FILLS[h['number']]}
    entries.append({'number':h['number'],'parsha':'reeh','heHeading':h['heading'],'enHeading':e['heading'],'he':h['text'],'en':e['text'],'type':'teaching'})
data={
  'id':'riay-ajew-study',
  'title':'Ri’ay AJew Study Packet',
  'hebrewTitle':'ראה',
  'subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works',
  'hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו',
  'summary': {'he': he['summary'], 'en': en_raw['summary']},
  'map': {'he': he['diagram'], 'en': en_raw['diagram']},
  'sourceFiles': {
    'hebrew':'/mnt/c/Users/Pettek/Downloads/Reeh_AJew_corrected_Hebrew.docx',
    'english':'/mnt/c/Users/Pettek/Downloads/Reeh_AJew_formal_equivalence_English.docx',
    'pdf':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%A8%D7%90%D7%94.pdf'
  },
  'entries': entries
}
out=ROOT/'public/data/parsha-special/riay.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
segs=[]
if data['summary']['he'] or data['summary']['en'] or data['map']['he'] or data['map']['en']:
    segs.append({'index':'Overview','he':'\n\n'.join(x for x in [data['summary']['he'],data['map']['he']] if x),'en':'\n\n'.join(x for x in [data['summary']['en'],data['map']['en']] if x)})
for e in entries:
    segs.append({'index':e['number'],'he':'\n\n'.join(x for x in [e.get('heHeading',''),e.get('he','')] if x),'en':'\n\n'.join(x for x in [e.get('enHeading',''),e.get('en','')] if x)})
reader={'id':'parsha-packet-riay','title':'AJew Study Packet — Parashas Ri’ay','hebrewTitle':'ראה — ליקוטים','source':data['subtitle'],'pdf':data['sourceFiles']['pdf'],'segments':segs}
rp=ROOT/'public/reader/parsha-packets/riay.json'
rp.parent.mkdir(parents=True,exist_ok=True)
rp.write_text(json.dumps(reader,ensure_ascii=False,indent=2)+'\n')
for p in [out,rp]:
    s=p.read_text()
    bad=[x for x in ['Translator','מתרגם','Editorial note','הערת עריכה','AI agents','גרסאות','error_outline','Translation error','Parashas Re’eh','Parashas Reeh'] if x in s]
    if bad:
        raise SystemExit(f'bad public strings in {p}: {bad}')
print(out, len(entries), 'reader_segments', len(segs), 'summary', bool(data['summary']['en']), 'map', bool(data['map']['en']))
