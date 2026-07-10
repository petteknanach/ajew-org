#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path('/root/ajew-org')
DL=Path('/mnt/c/Users/Pettek/Downloads')
NS='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS=re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE=re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)
SKIP_HE={'ואתחנן','ליקוטים מליקוטי הלכות ומספרי רבנו','טקסט עברי מתוקן ומשוחזר'}
SKIP_EN={'Va’eschanan','Vaeschanan','Va’eschanan','Selected Teachings from Likutay Halachos and Rabbeinu’s Works','Scholastic Formal-Equivalence Translation'}

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
    return text

def parse(path, lang):
    ps=docx_paras(path)
    entries=[]; summary=''; diagram=''; heading=''; current=None
    skip=SKIP_HE if lang=='he' else SKIP_EN
    for i,s in enumerate(ps):
        if s in skip: continue
        if s.startswith('Translator') or s.startswith('תוספת מאת המתרגם'):
            st=strip_public_notes(s)
            if ('→' in st): diagram=st
            elif not summary: summary=st
            continue
        if s.startswith('Editorial note:') or s.startswith('הערת עריכה:'): continue
        m=NUM_RE.match(s)
        if m:
            current={'number':int(m.group(1)),'heading':heading,'text':strip_public_notes(m.group(2).strip()),'type':'teaching'}
            entries.append(current); heading=''; continue
        # non-numbered paragraph: if next paragraph is numbered, this is a heading; otherwise continuation
        nxt=ps[i+1] if i+1<len(ps) else ''
        if NUM_RE.match(nxt):
            heading=strip_public_notes(s)
        elif current is not None:
            current['text']=strip_public_notes((current['text']+'\n\n'+s).strip())
        else:
            heading=strip_public_notes(s)
    return {'summary':summary,'diagram':diagram,'entries':entries}

he=parse(DL/'Vaeschanan_AJew_corrected_Hebrew.docx','he')
en=parse(DL/'Vaeschanan_AJew_formal_equivalence_English.docx','en')
hnums=[x['number'] for x in he['entries']]
enums=[x['number'] for x in en['entries']]
if hnums != enums:
    raise SystemExit(f'number mismatch HE {hnums[:5]}..{hnums[-5:]} EN {enums[:5]}..{enums[-5:]}')
entries=[]
for h,e in zip(he['entries'], en['entries']):
    entries.append({'number':h['number'],'parsha':'vaetchanan','heHeading':h['heading'],'enHeading':e['heading'],'he':h['text'],'en':e['text'],'type':'teaching'})
data={
  'id':'vaetchanan-ajew-study',
  'title':'Vaeschanan AJew Study Packet',
  'hebrewTitle':'ואתחנן',
  'subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works',
  'hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו',
  'summary': {'he': he['summary'], 'en': en['summary']},
  'map': {'he': he['diagram'], 'en': en['diagram']},
  'sourceFiles': {
    'hebrew':'/mnt/c/Users/Pettek/Downloads/Vaeschanan_AJew_corrected_Hebrew.docx',
    'english':'/mnt/c/Users/Pettek/Downloads/Vaeschanan_AJew_formal_equivalence_English.docx',
    'pdf':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%95%D7%90%D7%AA%D7%97%D7%A0%D7%9F.pdf'
  },
  'entries': entries
}
out=ROOT/'public/data/parsha-special/vaetchanan.json'
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
# Reader commentary packet
segs=[]
if data['summary']['he'] or data['summary']['en'] or data['map']['he'] or data['map']['en']:
    segs.append({'index':'Overview','he':'\n\n'.join(x for x in [data['summary']['he'],data['map']['he']] if x),'en':'\n\n'.join(x for x in [data['summary']['en'],data['map']['en']] if x)})
for e in entries:
    segs.append({'index':e['number'],'he':'\n\n'.join(x for x in [e.get('heHeading',''),e.get('he','')] if x),'en':'\n\n'.join(x for x in [e.get('enHeading',''),e.get('en','')] if x)})
reader={'id':'parsha-packet-vaetchanan','title':'AJew Study Packet — Parashas Vaeschanan','hebrewTitle':'ואתחנן — ליקוטים','source':data['subtitle'],'pdf':data['sourceFiles']['pdf'],'segments':segs}
rp=ROOT/'public/reader/parsha-packets/vaetchanan.json'
rp.parent.mkdir(parents=True,exist_ok=True)
rp.write_text(json.dumps(reader,ensure_ascii=False,indent=2)+'\n')
print(out, len(entries), 'reader_segments', len(segs), 'summary', bool(data['summary']['en']), 'map', bool(data['map']['en']))
