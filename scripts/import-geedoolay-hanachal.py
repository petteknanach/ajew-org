#!/usr/bin/env python3
import json, zipfile, shutil, re, html, xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DL = Path('/mnt/c/Users/Pettek/Downloads')
HE_DOCX = DL/'Geedoolay_HaNachal_public_hebrew.docx'
EN_DOCX = DL/'Geedoolay_HaNachal_public_english.docx'
BOOK = 'geedoolay-hanachal'
OUT = ROOT/'public/reader'/BOOK
IMG = ROOT/'public/images'/BOOK
NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS_RE = re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')

def clean(s):
    return MARKS_RE.sub('', s or '').strip()

def docx_paras(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read('word/document.xml'))
    out=[]
    for p in root.iter(NS+'p'):
        s = clean(''.join(t.text or '' for t in p.iter(NS+'t')))
        if s:
            out.append(s)
    return out

def extract_images(path, sub):
    dest = IMG/sub
    dest.mkdir(parents=True, exist_ok=True)
    rels=[]
    z=zipfile.ZipFile(path)
    for n in z.namelist():
        if n.startswith('word/media/'):
            name = Path(n).name
            out = dest/name
            out.write_bytes(z.read(n))
            rels.append(f'/images/{BOOK}/{sub}/{name}')
    return sorted(rels)

def make_segments(paras, lang, images):
    segs=[]
    # Put diagram images immediately after Charts/Diagrams heading so the reader does not lose them.
    inserted=False
    for i,p in enumerate(paras,1):
        seg={'index': len(segs)+1, 'he':'', 'en':'', 'he_nikud':'', 'displayNumber':len(segs)+1, 'simanNumber':len(segs)+1}
        if lang=='he': seg['he']=p
        else: seg['en']=p
        segs.append(seg)
        is_chart = ('תרשימים ודיאגרמות' in p) or ('Charts and Diagrams' in p)
        if is_chart and not inserted and images:
            inserted=True
            for j,url in enumerate(images,1):
                cap_he = f'תרשים {j} מתוך גידולי הנחל'
                cap_en = f'Diagram {j} from Geedoolay HaNachal'
                fig = f'<figure class="geedoolay-diagram"><img src="{html.escape(url)}" alt="{html.escape(cap_en)}" loading="lazy" /><figcaption>{html.escape(cap_en)}</figcaption></figure>'
                seg={'index': len(segs)+1, 'he':'', 'en':'', 'he_nikud':'', 'displayNumber':len(segs)+1, 'simanNumber':len(segs)+1}
                if lang=='he':
                    seg['he']=cap_he; seg['he_html']=fig.replace(cap_en, cap_he)
                else:
                    seg['en']=cap_en; seg['en_html']=fig
                segs.append(seg)
    return segs

def section(num,title,hebrewTitle,segs):
    return {
      'id': f'{BOOK}-1-{num}', 'book': BOOK, 'part':1, 'torah':num,
      'displayNumber': num, 'title': title, 'hebrewTitle': hebrewTitle,
      'segments': segs,
      'navigation': {
        'prevUrl': f'/reader/{BOOK}/1/{num-1}' if num>1 else None,
        'nextUrl': f'/reader/{BOOK}/1/{num+1}' if num<2 else None,
        'indexUrl': f'/reader/{BOOK}/1'
      },
      'hasEnglish': any(s.get('en') for s in segs)
    }

he_paras=docx_paras(HE_DOCX)
en_paras=docx_paras(EN_DOCX)
if len(he_paras)<2000 or len(en_paras)<2000:
    raise SystemExit('DOCX extraction too small')
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)
if IMG.exists(): shutil.rmtree(IMG)
he_imgs=extract_images(HE_DOCX,'hebrew')
en_imgs=extract_images(EN_DOCX,'english')
sections=[
  section(1,'Hebrew Edition — includes diagrams and timeline','מהדורה עברית — כולל תרשימים וציר זמן',make_segments(he_paras,'he',he_imgs)),
  section(2,'English Edition — includes diagrams and timeline','מהדורה אנגלית — כולל תרשימים וציר זמן',make_segments(en_paras,'en',en_imgs)),
]
for sec in sections:
    (OUT/f'section-{sec["torah"]}.json').write_text(json.dumps(sec,ensure_ascii=False,indent=2),encoding='utf-8')
idx={
  'id':BOOK,
  'title':'Geedoolay HaNachal — Biographies + TIMELINE',
  'hebrewTitle':'גידולי הנחל — ביוגרפיות + ציר זמן',
  'author':'Noach HaLevi Sternfeld',
  'hebrewAuthor':'נח הלוי שטרנפלד',
  'description':'Biographical register of early Breslov Chassidim and the chain of Breslov transmission. Includes charts, diagrams, yahrzeit tables, and a strong panoramic timeline of dated Breslov history.',
  'hasTimeline': True,
  'parts':[{'part':1,'title':'Complete editions','hebrewTitle':'מהדורות שלמות','totalTorahs':2}],
  'torahs':[
    {'number':1,'title':sections[0]['title'],'hebrewTitle':sections[0]['hebrewTitle'],'url':f'/reader/{BOOK}/1/1'},
    {'number':2,'title':sections[1]['title'],'hebrewTitle':sections[1]['hebrewTitle'],'url':f'/reader/{BOOK}/1/2'},
  ]
}
(OUT/'index.json').write_text(json.dumps(idx,ensure_ascii=False,indent=2),encoding='utf-8')

# Update catalog
cat_path=ROOT/'public/reader/catalog.json'
cat=json.loads(cat_path.read_text(encoding='utf-8'))
cat['books']=[b for b in cat['books'] if b.get('id')!=BOOK]
cat['books'].append({
  'id':BOOK,
  'title':'Geedoolay HaNachal — Biographies + TIMELINE',
  'hebrewTitle':'גידולי הנחל — ביוגרפיות + ציר זמן',
  'author':'Noach HaLevi Sternfeld',
  'hebrewAuthor':'נח הלוי שטרנפלד',
  'description':'Biographical register of early Breslov Chassidim. CLEAR TIMELINE INCLUDED, plus diagrams and yahrzeit tables.',
  'parts':[{'part':1,'title':'Complete editions — TIMELINE INCLUDED','hebrewTitle':'מהדורות שלמות — כולל ציר זמן','totalTorahs':2,'indexUrl':f'/reader/{BOOK}/index.json'}],
  'totalTorahs':2
})
cat_path.write_text(json.dumps(cat,ensure_ascii=False,indent=2),encoding='utf-8')

# Book descriptions
bd_path=ROOT/'src/data/book-descriptions.json'
bd=json.loads(bd_path.read_text(encoding='utf-8'))
bd[BOOK]='Geedoolay HaNachal — a biographical register of early Breslov Chassidim and the chain of transmission, compiled by Noach HaLevi Sternfeld. STRONG TIMELINE INCLUDED: the book contains a panoramic timeline, charts/diagrams, yahrzeit tables, and dated Breslov historical material.'
bd_path.write_text(json.dumps(bd,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')

print('he_paras',len(he_paras),'en_paras',len(en_paras),'he_images',len(he_imgs),'en_images',len(en_imgs))
print('wrote',OUT)
