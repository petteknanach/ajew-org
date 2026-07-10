#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path('/root/ajew-org')
DL=Path('/mnt/c/Users/Pettek/Downloads')
NS='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS=re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE=re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)

def clean(s): return MARKS.sub('',s or '').strip()
def paras(path):
    root=ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out=[]
    for p in root.iter(NS+'p'):
        s=clean(''.join(t.text or '' for t in p.iter(NS+'t')))
        if s: out.append(s)
    return out

def entries(path, lang):
    out=[]; parsha=None; last_heading=''; last_ref=''; intro=[]
    for s in paras(path):
        if s in ('פרשת מטות','Parashas Mattos'):
            parsha='matot'; continue
        if s in ('פרשת מסעי','Parashas Masei'):
            parsha='masei'; continue
        m=NUM_RE.match(s)
        if m:
            n=int(m.group(1)); text=m.group(2).strip()
            typ='teaching'
            if ('סיכום' in text or 'Summary:' in text): typ='summary'
            if ('תרשים' in text or 'Diagram:' in text): typ='diagram'
            # Keep the public page clean: present these as study aids, not translator/editor notes.
            text = re.sub(r'^(?:Translator[’\']s Addition|Translator’s Addition|Translator\'s Addition)\s*[—-]\s*', '', text).strip()
            text = re.sub(r'^תוספת מאת המתרגם\s*[—-]\s*', '', text).strip()
            text = re.sub(r'\s*[א-ת״׳"\s]+גרסאות לקריאת מכונה\s*/\s*AI agents:\s*$', '', text).strip()
            out.append({'number':n,'parsha':parsha,'heading':last_heading,'text':text,'type':typ})
            continue
        # skip cover/introduction lines; keep actual source headings after parsha begins
        if parsha:
            last_heading=s
        else:
            intro.append(s)
    return out, intro
he, he_intro=entries(DL/'Mattos_Masei_AJew_corrected_Hebrew.docx','he')
en, en_intro=entries(DL/'Mattos_Masei_AJew_formal_equivalence_English.docx','en')
if [x['number'] for x in he] != list(range(1,29)) or [x['number'] for x in en] != list(range(1,29)):
    raise SystemExit('Numbering mismatch')
out=[]
for h,e in zip(he,en):
    if h['number']!=e['number'] or h['parsha']!=e['parsha']:
        raise SystemExit(f'Pair mismatch {h} {e}')
    out.append({
        'number': h['number'],
        'parsha': h['parsha'],
        'heHeading': h['heading'],
        'enHeading': e['heading'],
        'he': h['text'],
        'en': e['text'],
        'type': h['type'] if h['type']!='teaching' else e['type'],
    })
data={
  'id':'mattos-masei-ajew-study',
  'title':'Mattos–Masei AJew Study Packet',
  'hebrewTitle':'מטות — מסעי',
  'subtitle':'Selected teachings from Likutay Halachos and Rabbeinu’s works',
  'hebrewSubtitle':'ליקוטים מליקוטי הלכות ומספרי רבנו',
  'sourceFiles':{
    'hebrew':'/mnt/c/Users/Pettek/Downloads/Mattos_Masei_AJew_corrected_Hebrew.docx',
    'english':'/mnt/c/Users/Pettek/Downloads/Mattos_Masei_AJew_formal_equivalence_English.docx',
    'pdfMatot':'/pdfs/parsha/%D7%91%D7%9E%D7%93%D7%91%D7%A8/%D7%9E%D7%98%D7%95%D7%AA.pdf',
    'pdfMasei':'/pdfs/parsha/%D7%91%D7%9E%D7%93%D7%91%D7%A8/%D7%9E%D7%98%D7%95%D7%AA%20%D7%9E%D7%A1%D7%A2%D7%99.pdf'
  },
  'entries': out
}
path=ROOT/'public/data/parsha-special/mattos-masei.json'
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(path, len(out), sum(1 for x in out if x['parsha']=='matot'), sum(1 for x in out if x['parsha']=='masei'))
