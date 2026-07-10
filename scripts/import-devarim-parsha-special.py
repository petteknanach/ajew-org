#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path('/root/ajew-org')
DL=Path('/mnt/c/Users/Pettek/Downloads')
NS='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS=re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE=re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)

def clean(s):
    s=MARKS.sub('',s or '').strip()
    s=re.sub(r'\s+', ' ', s).strip()
    return s

def docx_paras(path):
    root=ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out=[]
    for p in root.iter(NS+'p'):
        s=clean(''.join(t.text or '' for t in p.iter(NS+'t')))
        if s:
            out.append(s)
    return out

def strip_public_notes(text):
    text=re.sub(r'^(?:Translator[’\']s Addition|Translator’s Addition|Translator\'s Addition)\s*[—-]\s*', '', text).strip()
    text=re.sub(r'^תוספת מאת המתרגם\s*[—-]\s*', '', text).strip()
    text=re.sub(r'\s*[א-ת״׳"\s]+גרסאות לקריאת מכונה\s*/\s*AI agents:\s*$', '', text).strip()
    return text

def parse(path, lang):
    ps=docx_paras(path)
    summary=''; cmap=''; entries=[]; current=None; heading=''
    for i,s in enumerate(ps):
        if lang=='he' and s in {'דברים','ליקוטים מליקוטי הלכות ומספרי רבנו','טקסט עברי מתוקן ומשוחזר','מוכן לפרסום ב־AJew.org','תקציר המתרגם','מפת המהלך'}:
            continue
        if lang=='en' and s in {'Devarim','Selected Teachings from Likutay Halachos and Rabbeinu’s Works','Scholastic Formal-Equivalence Translation','Prepared for AJew.org','Translator’s Summary','Conceptual Map'}:
            continue
        if lang=='he' and s.startswith('הערת עריכה:'):
            continue
        if lang=='en' and s.startswith('Editorial note:'):
            continue
        if not summary and ((lang=='he' and s.startswith('פרשת דברים מציבה')) or (lang=='en' and s.startswith('Parashas Devarim places'))):
            summary=s; continue
        if not cmap and ('→' in s) and (('תוכחה' in s) or ('Kindly rebuke' in s)):
            cmap=s; continue
        m=NUM_RE.match(s)
        if m:
            current={'number':int(m.group(1)),'heading':heading,'text':strip_public_notes(m.group(2).strip()),'type':'teaching'}
            entries.append(current)
            continue
        if current is not None:
            # If the next non-empty paragraph starts a numbered segment, this line is the heading for it.
            nxt = ps[i+1] if i+1 < len(ps) else ''
            if NUM_RE.match(nxt):
                heading=s
            else:
                current['text']=strip_public_notes((current['text']+'\n\n'+s).strip())
        else:
            heading=s
    return {'summary':strip_public_notes(summary),'map':strip_public_notes(cmap),'entries':entries}

he=parse(DL/'Devarim_AJew_corrected_Hebrew.docx','he')
en=parse(DL/'Devarim_AJew_formal_equivalence_English.docx','en')
if [x['number'] for x in he['entries']] != list(range(1,14)) or [x['number'] for x in en['entries']] != list(range(1,14)):
    raise SystemExit(f"number mismatch HE={[x['number'] for x in he['entries']]} EN={[x['number'] for x in en['entries']]}")
entries=[]
for h,e in zip(he['entries'], en['entries']):
    entries.append({'number':h['number'],'parsha':'devarim','heHeading':h['heading'],'enHeading':e['heading'],'he':h['text'],'en':e['text'],'type':'teaching'})
data={
  'id':'devarim-ajew-study',
  'title':'Devarim AJew Study Packet',
  'hebrewTitle':'דברים',
  'subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works',
  'hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו',
  'summary': {'he': he['summary'], 'en': en['summary']},
  'map': {'he': he['map'], 'en': en['map']},
  'sourceFiles': {
    'hebrew':'/mnt/c/Users/Pettek/Downloads/Devarim_AJew_corrected_Hebrew.docx',
    'english':'/mnt/c/Users/Pettek/Downloads/Devarim_AJew_formal_equivalence_English.docx',
    'pdf':'/pdfs/parsha/%D7%93%D7%91%D7%A8%D7%99%D7%9D/%D7%93%D7%91%D7%A8%D7%99%D7%9D.pdf'
  },
  'entries': entries
}
path=ROOT/'public/data/parsha-special/devarim.json'
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(path, len(entries), bool(data['summary']['en']), bool(data['map']['en']))
