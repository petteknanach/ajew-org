#!/usr/bin/env python3
import json, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path('/root/ajew-org')
DL = Path('/mnt/c/Users/Pettek/Downloads')
NS = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
MARKS_RE = re.compile('[\u200e\u200f\u2066\u2067\u2068\u2069\ufeff]')
NUM_RE = re.compile(r'^\s*\[(\d+)\]\s*(.*)', re.S)


def clean(s):
    return MARKS_RE.sub('', s or '').strip()


def docx_paras(path):
    root = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml'))
    out=[]
    for p in root.iter(NS+'p'):
        s=clean(''.join(t.text or '' for t in p.iter(NS+'t')))
        if s:
            out.append(s)
    return out


def numbered(path):
    out={}; cur=None
    for s in docx_paras(path):
        m=NUM_RE.match(s)
        if m:
            cur=int(m.group(1)); out[cur]=m.group(2).strip()
        elif cur is not None:
            # Preserve short diagram/continuation lines; they belong to the prior numbered public paragraph.
            out[cur]=(out[cur]+'\n'+s).strip()
    return out


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def make_segments(he_nums, en_nums, start, end):
    segs=[]
    for i in range(start, end+1):
        segs.append({
            'index': i,
            'he': he_nums[i],
            'en': en_nums[i],
            'he_nikud': he_nums[i],
            'displayNumber': i,
            'simanNumber': i,
        })
    return segs


def import_book(book):
    book_id=book['id']; base=ROOT/'public/reader'/book_id
    he=numbered(book['hebrew']); en=numbered(book['english'])
    expected=set(range(1, book['total']+1))
    if set(he)!=expected or set(en)!=expected:
        raise SystemExit(f'{book_id}: numbering mismatch HE missing {sorted(expected-set(he))[:10]} extra {sorted(set(he)-expected)[:10]} EN missing {sorted(expected-set(en))[:10]} extra {sorted(set(en)-expected)[:10]}')
    torahs=[]
    for sec in book['sections']:
        n=sec['number']; start=sec['start']; end=sec['end']
        segments=make_segments(he,en,start,end)
        data={
            'id': f'{book_id}-1-{n}',
            'book': book_id,
            'part': 1,
            'torah': n,
            'displayNumber': n,
            'title': sec['title'],
            'hebrewTitle': sec['hebrewTitle'],
            'keyVerse': '',
            'keyVerseTranslation': '',
            'keyVerseRef': '',
            'themes': sec.get('themes', []),
            'keywords': book.get('keywords', []),
            'simanim': [],
            'segments': segments,
            'navigation': {
                'prevUrl': f'/reader/{book_id}/1/{n-1}' if n>1 else None,
                'nextUrl': f'/reader/{book_id}/1/{n+1}' if n<len(book['sections']) else None,
                'indexUrl': f'/reader/{book_id}/1'
            },
            'hasEnglish': True,
            'sourceFiles': {'hebrew': str(book['hebrew']), 'english': str(book['english'])}
        }
        fname = sec.get('file', f'section-{n}.json')
        write_json(base/fname, data)
        torahs.append({
            'number': n,
            'displayNumber': n,
            'title': sec['title'],
            'hebrewTitle': sec['hebrewTitle'],
            'themes': sec.get('themes', []),
            'paragraphs': end-start+1,
            'hasEnglish': True,
            'url': f'/reader/{book_id}/1/{n}'
        })
    idx={
        'book': book_id,
        'part': 1,
        'title': book['title'],
        'hebrewTitle': book['hebrewTitle'],
        'author': book['author'],
        'hebrewAuthor': book['hebrewAuthor'],
        'totalTorahs': len(torahs),
        'torahs': torahs,
        'sourceFiles': {'hebrew': str(book['hebrew']), 'english': str(book['english'])},
        'paragraphNumbering': book['paragraphNumbering']
    }
    write_json(base/'index.json', idx)
    return {'id':book_id,'segments':sum(t['paragraphs'] for t in torahs),'sections':len(torahs)}

books=[
  {
    'id':'tefilos-haboker','title':'Tefilos HaBoker','hebrewTitle':'תפלות הבוקר','author':'Rabbi Efraim ben Rabbi Naftali','hebrewAuthor':'רבי אפרים בן רבי נפתלי',
    'hebrew':DL/'tefilos_haboker_hebrew_publish_cleaned.docx','english':DL/'tefilos_haboker_english_publish_cleaned.docx','total':347,
    'keywords':['prayer','morning','netilas yadayim','chatzos'],
    'paragraphNumbering':'Replacement publish-cleaned DOCX paragraphs [1]–[347] preserved as segment indexes for exact Hebrew/English matching.',
    'sections':[
      {'number':1,'start':1,'end':17,'title':'Opening Prayer — Chatzos and the Inner Mishkan','hebrewTitle':'תפילה א — חצות והמשכן הפנימי'},
      {'number':2,'start':18,'end':27,'title':'Prayer B — Zealous Rising','hebrewTitle':'תפילה ב — זריזות בקימה'},
      {'number':3,'start':28,'end':44,'title':'Prayer C — Chatzos, Daas, and Holy Eating','hebrewTitle':'תפילה ג — חצות, דעת ואכילה בקדושה'},
      {'number':4,'start':45,'end':93,'title':'Prayer D — Netilas Yadayim and Morning Repair','hebrewTitle':'תפילה ד — נטילת ידים ותיקון הבוקר'},
      {'number':5,'start':94,'end':133,'title':'Prayer E — Faith and the Power of Prayer','hebrewTitle':'תפילה ה — אמונה וכח התפילה'},
      {'number':6,'start':134,'end':152,'title':'Prayer F — Nullifying Sadness of Spirit','hebrewTitle':'תפילה ו — ביטול עצבות רוח'},
      {'number':7,'start':153,'end':222,'title':'Prayer G — Yissurim, Mikveh, and Holy Speech','hebrewTitle':'תפילה ז — יסורים, מקוה ודיבור קדוש'},
      {'number':8,'start':223,'end':255,'title':'Prayer H — Humility and Proper Order','hebrewTitle':'תפילה ח — ענוה וסדר נכון'},
      {'number':9,'start':256,'end':316,'title':'Segment VII — Holy Sleep and Renewal','hebrewTitle':'קטע ז — שינה בקדושה והתחדשות'},
      {'number':10,'start':317,'end':347,'title':'Segment VIII — White Garments, Tzitzis, and Atonement','hebrewTitle':'קטע ח — בגדים לבנים, ציצית וכפרה'},
    ]
  },
  {
    'id':'chayey-moharan-hosafos','title':'Chayey Moharan — Hosafos','hebrewTitle':'חיי מוהר״ן — קונטרס ההוספות','author':'Rabbi Nachman of Breslov','hebrewAuthor':'רבי נחמן מברסלב',
    'hebrew':DL/'Chayay_Moharan_Hosafos_ch1_complete_corrected_Hebrew_AJew_FINAL.docx','english':DL/'Chayay_Moharan_Hosafos_ch1_complete_English_translation_AJew_FINAL.docx','total':249,
    'keywords':['chayey moharan','hosafos','rabbi nachman','baal shem tov'],
    'paragraphNumbering':'Paired chapter-one DOCX paragraphs [1]–[249] preserved as segment indexes for exact Hebrew/English matching.',
    'sections':[{'number':1,'start':1,'end':249,'title':'Chapter One — Kuntres HaHosafos','hebrewTitle':'פרק א — קונטרס ההוספות'}]
  },
  {
    'id':'otzar-nachmani','title':'Otzar Nachmani','hebrewTitle':'אוצר נחמני','author':'Rabbi Nachman Yisroel Burstein','hebrewAuthor':'רבי נחמן ישראל בורשטיין',
    'hebrew':DL/'Otzar_Nachmani_complete_chapter_1_corrected_Hebrew_FINAL.docx','english':DL/'Otzar_Nachmani_complete_chapter_1_English_translation_FINAL.docx','total':255,
    'keywords':['otzar nachmani','breslov','moharnat','rebbe nachman'],
    'paragraphNumbering':'Paired chapter-one DOCX paragraphs [1]–[255] preserved as segment indexes for exact Hebrew/English matching.',
    'sections':[{'number':1,'start':1,'end':255,'title':'Chapter One','hebrewTitle':'פרק א'}]
  }
]

results=[]
for b in books:
    results.append(import_book(b))

# catalog update
catalog_path=ROOT/'public/reader/catalog.json'
catalog=json.loads(catalog_path.read_text(encoding='utf-8'))
by_id={b['id']:b for b in catalog['books']}
for b in books:
    entry={
        'id': b['id'], 'title': b['title'], 'hebrewTitle': b['hebrewTitle'],
        'author': b['author'], 'hebrewAuthor': b['hebrewAuthor'],
        'parts':[{'part':1,'title':'Part 1','hebrewTitle':'חלק א','totalTorahs':len(b['sections']),'indexUrl':f'/reader/{b["id"]}/index.json'}],
        'totalTorahs': len(b['sections'])
    }
    if b['id'] in by_id: by_id[b['id']].update(entry)
    else: catalog['books'].append(entry)
write_json(catalog_path, catalog)

# book descriptions
bd_path=ROOT/'src/data/book-descriptions.json'
bd=json.loads(bd_path.read_text(encoding='utf-8'))
bd['tefilos-haboker']='Tefilos HaBoker — morning prayers compiled by R’ Efraim ben R’ Naftali, based on Likutay Halachos, with cleaned publish-ready Hebrew and English paragraphs.'
bd['chayey-moharan-hosafos']='Addendum to Chayey Moharan — Kuntres HaHosafos, stories and traditions connected to Rebbe Nachman and the Baal Shem Tov, in Hebrew and English.'
bd['otzar-nachmani']='Otzar Nachmani by R’ Nachman Yisroel Burstein — Breslov stories, traditions, and teachings preserved in Hebrew and English.'
write_json(bd_path, bd)
print(json.dumps(results, ensure_ascii=False))
