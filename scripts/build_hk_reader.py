#!/usr/bin/env python3
"""Build reader artifacts from the HALECHTA KNECHMANI citation index.

Inputs : scripts/data/hk_index.json  (produced by scripts/parse_hk_index.py from the OCR)
Outputs:
  - public/reader/hilchasa-kinachamani/part-1/index.json + torah-N.json  (the offered book)
  - public/hk-citations/<slug>-<n>.json   (per verse-chapter / per daf commentary data)
  - src/data/hk-citations-index.json      (build-time registry for the astro templates)
  - public/reader/chok/hk-verses.json     (chok per-verse sources line, v2 with chapters)
"""
import json, os, re, sys, glob, datetime
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(REPO, 'scripts')
IDX = os.environ.get('HK_INDEX', os.path.join(SCRIPTS, 'data', 'hk_index.json'))
OUT_BOOK = os.path.join(REPO, 'public', 'reader', 'hilchasa-kinachamani', 'part-1')
OUT_CITE = os.path.join(REPO, 'public', 'hk-citations')
OUT_REG = os.path.join(REPO, 'src', 'data', 'hk-citations-index.json')
OUT_CHOK = os.path.join(REPO, 'public', 'reader', 'chok', 'hk-verses.json')

# ---------------- load citation index ----------------
D = json.load(open(IDX))
entries = D['entries_tanach']
shas = D['shas_daf']
shas_perek = D.get('shas_perek', {})

EN_MAP = {
 'LM': 'Likutay Moharan I', 'LM2': 'Likutay Moharan II', 'KLM': 'Kitzur Likutay Moharan',
 'KLM2': 'Kitzur Likutay Moharan II', 'HaMidos': 'Sefer HaMidos', 'LikHalachos': 'Likutay Halachos',
 'LikTefilos': 'Likutay Tefilos', 'ChayeyMoharan': 'Chayey Moharan', 'ShivchayMoharan': 'Shivchay Moharan',
 'SichosHaRan': 'Sichos HaRan', 'Pirpuros': 'Pirpuros LeChochma', 'BabiHaNachal': 'Babi HaNachal',
 'BiurHaLikutim': 'Biur HaLikutim', 'OnegShabbos': 'Oneg Shabbos', 'LikutayEitzos': 'Likutay Eitzos',
 'MeiHaNachal': 'May HaNachal',
}
HE_NUM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,'ר':200,'ש':300,'ת':400}
def deheb(t):
    t = re.sub(r'[״"\'׳]', '', t)
    if not t or any(c not in HE_NUM for c in t): return None
    v = sum(HE_NUM[c] for c in t)
    return v if v > 0 else None

UNITS_HE = [(400,'ת'),(300,'ש'),(200,'ר'),(100,'ק'),(90,'צ'),(80,'פ'),(70,'ע'),(60,'ס'),(50,'נ'),(40,'מ'),(30,'ל'),(20,'כ'),(10,'י'),(9,'ט'),(8,'ח'),(7,'ז'),(6,'ו'),(5,'ה'),(4,'ד'),(3,'ג'),(2,'ב'),(1,'א')]
def heb_num(n):
    if n == 15: return 'טו'
    if n == 16: return 'טז'
    for v, c in UNITS_HE:
        if n >= v:
            r = n - v
            if r == 15: return c + 'טו'
            if r == 16: return c + 'טז'
            return c + (heb_num(r) if r else '')
    return ''

def tail_to_en(tail):
    """Convert a ref tail like 'יג־ד'/'קא'/'אמונה' to '13:4'/'101'/'Emunah'."""
    parts = [p for p in re.split(r'[־\s]+', tail.strip(' .;:>')) if p]
    vals = [deheb(p) for p in parts]
    if len(parts) == 2 and all(v is not None for v in vals):
        return f'{vals[0]}:{vals[1]}'
    out = []
    for p, v in zip(parts, vals):
        if v is not None: out.append(str(v))
        elif p == 'אות': out.append('ot')
        else: out.append(p)
    return ' '.join(out)

TOPIC_EN = {'אמונה':'Emunah','בושה':'Bosha','הרהורים':'Hirhurim','זכירה':'Zechira','לימוד':'Limud','בטחון':'Bitachon','צדיק':'Tzaddik','מריבה':'Merivah','הרחקת רשעים':'Harchakat Reshaim'}
def clean_t(t):
    """Strip OCR junk: HTML-entity residue ('>') and trailing punctuation."""
    t = t.strip()
    while t and t[-1] in '>.':
        t = t[:-1].rstrip()
    return t

def ref_he(r):
    return clean_t(r['t'])
def ref_en(r):
    if r['k'] == 'lib' and r['c'] in EN_MAP:
        tail = (r['t'].split(' ', 1)[1] if ' ' in r['t'] else '').rstrip(' .;:>')
        if tail:
            if tail in TOPIC_EN:
                return EN_MAP[r['c']] + ' ' + TOPIC_EN[tail]
            return EN_MAP[r['c']] + ' ' + tail_to_en(tail)
        return EN_MAP[r['c']]
    t = r['t'].rstrip(' .;:>')
    for pref in ('עיין ', 'ראה ', 'עי׳ ', 'ר׳ '):
        if t.startswith(pref):
            t = t[len(pref):]
            break
    return 'See ' + t

def seg_he(e):
    refs = ' · '.join(ref_he(r) for r in e['refs'])
    ph = e['ph'].strip()
    return f'{ph} — {refs}' if ph else refs
def seg_en(e):
    return ' · '.join(ref_en(r) for r in e['refs'])

# ---------------- the offered book ----------------
RAW_SRC = os.environ.get("HK_OCR", "/root/ajew-hk/hk_ocr.txt")
raw = open(RAW_SRC).read()
def _dec(s):
    return (s.replace('&quot;', '״').replace('&apos;', "'")
             .replace('&gt;', '>').replace('&lt;', '<').replace('&amp;', '&'))
L = [_dec(l) for l in raw.split('\n') if l.strip()]
N = len(L)

SECTIONS = [
 (0, 158, 'הקדמות', 'Introductions'),
 (158, 1482, 'מפתח הענינים', 'Subject Index'),
 (1482, 9990, 'מפתח כללי', 'General Index'),
 (9990, 10044, 'מפתח שבחי הר״ן', 'Index — Shivchay HaRan'),
 (10044, 10990, 'מפתח שיחות הר״ן', 'Index — Sichos HaRan'),
 (10990, 17159, 'מפתח כללי — המשך', 'General Index (cont.)'),
 (17159, 18108, 'מפתח פסוקי התורה', 'Torah Verses Index'),
 (18108, 19964, 'מפתח נביאים וכתובים', 'Prophets & Writings Index'),
 (19964, 20903, 'מפתח הש״ס', 'Talmud Index'),
 (20903, 21123, 'מפתח הזוהר', 'Zohar Index'),
 (21123, 21136, 'ספרא דצניעותא', 'Sifra D\'Tzniuta'),
 (21136, 21378, 'מפתח מדרשים', 'Midrash Index'),
 (21378, 21407, 'סיפורי אנ״ש', 'Stories'),
 (21407, N, 'נספחים', 'Supplements'),
]
SEG_LINES = 10
SEGS_PAGE = 20

os.makedirs(OUT_BOOK, exist_ok=True)
# clean previous torah pages
for f in glob.glob(os.path.join(OUT_BOOK, 'torah-*.json')):
    os.remove(f)

line_page = [None] * N   # source line -> torah page number
items = []
num = 0
for (a, b, he, en) in SECTIONS:
    ln = a
    while ln < b:
        num += 1
        segs = []
        idx = 0
        ln2 = ln
        while ln2 < b and len(segs) < SEGS_PAGE:
            block = L[ln2:min(ln2 + SEG_LINES, b)]
            for j in range(ln2, min(ln2 + SEG_LINES, b)):
                line_page[j] = num
            idx += 1
            segs.append({'index': idx, 'he': '\n\n'.join(block), 'he_nikud': '', 'en': ''})
            ln2 += SEG_LINES
        he_title = f'הלכתא כנחמני · {he} · ({num})'
        en_title = f"Hilchasa Kinachamani · {en} ({num})"
        prev_url = f'/reader/hilchasa-kinachamani/1/{num-1}' if num > 1 else None
        page = {
            'id': f'hilchasa-kinachamani-1-{num}', 'bookId': 'hilchasa-kinachamani', 'part': 1, 'number': num,
            'title': en_title, 'hebrewTitle': he_title, 'hebrewTitleSection': he,
            'segments': segs,
            'navigation': {'prevUrl': prev_url, 'nextUrl': None},
        }
        json.dump(page, open(os.path.join(OUT_BOOK, f'torah-{num}.json'), 'w'), ensure_ascii=False)
        items.append({'number': num, 'displayNumber': num, 'title': en_title, 'hebrewTitle': he_title,
                      'url': f'/reader/hilchasa-kinachamani/1/{num}'})
        ln = ln2
# fill next urls
for i, it in enumerate(items):
    if i + 1 < len(items):
        p = os.path.join(OUT_BOOK, f'torah-{it["number"]}.json')
        d = json.load(open(p))
        d['navigation']['nextUrl'] = items[i + 1]['url']
        json.dump(d, open(p, 'w'), ensure_ascii=False)

index = {'bookId': 'hilchasa-kinachamani', 'title': "Hilchasa Kinachamani", 'hebrewTitle': 'הלכתא כנחמני',
         'author': 'Rabbi Yaakov Dov Halevi ben R. Avraham Yitzchak', 'totalItems': num, 'itemType': 'sections',
         'items': items}
json.dump(index, open(os.path.join(OUT_BOOK, 'index.json'), 'w'), ensure_ascii=False)
print('book:', num, 'pages ->', OUT_BOOK)

def page_of_line(i):
    if i is None or i < 0 or i >= N: return 1
    p = line_page[i] or 1
    return p
def book_page_for(min_i):
    return f'/reader/hilchasa-kinachamani/1/{page_of_line(min_i)}'

# ---------------- tanach citation files ----------------
os.makedirs(OUT_CITE, exist_ok=True)
for f in glob.glob(os.path.join(OUT_CITE, '*.json')):
    os.remove(f)

bybook = defaultdict(lambda: defaultdict(list))
first_line = {}
for e in entries:
    if not e['refs']: continue
    bybook[e['slug']][e['ch']].append(e)
    first_line[e['slug']] = min(first_line.get(e['slug'], 10**9), e.get('i') or 10**9)

TANACH_TITLES = {}  # slug -> hebrew title for file heads
import glob as _g
for partidx in _g.glob(os.path.join(REPO, 'public/reader/tanach-*/part-1/index.json')):
    slug = partidx.split('/reader/')[1].split('/')[0]
    try:
        d = json.load(open(partidx))
        TANACH_TITLES[slug] = d.get('hebrewTitle') or d.get('title') or slug
    except Exception:
        TANACH_TITLES[slug] = slug

reg_tanach = {}
ncite_files = 0
for slug, chs in sorted(bybook.items()):
    chapters = []
    for ch in sorted(chs.keys()):
        segs = []
        es = sorted(chs[ch], key=lambda e: (e['v'], e.get('i') or 0))
        for e in es:
            segs.append({'index': e['v'], 'he': seg_he(e), 'en': seg_en(e)})
        title_he = (TANACH_TITLES.get(slug, slug) or slug) + f' פרק {ch}'
        out = {'source': 'הלכתא כנחמני', 'book': slug, 'chapter': ch,
               'title': f'{slug} {ch} — sources in Breslov', 'hebrewTitle': title_he,
               'segments': segs}
        json.dump(out, open(os.path.join(OUT_CITE, f'{slug}-{ch}.json'), 'w'), ensure_ascii=False)
        ncite_files += 1
        chapters.append(ch)
    reg_tanach[slug] = {'chapters': chapters, 'bookPage': book_page_for(first_line.get(slug))}
print('tanach citation files:', ncite_files)

# ---------------- talmud citation files ----------------
MASS_SLUG = {'ברכות':'talmud-bavli-brachot','שבת':'talmud-bavli-shabbat','עירובין':'talmud-bavli-eruvin',
 'פסחים':'talmud-bavli-psachim','שקלים':'talmud-bavli-shkalim','ראש השנה':'talmud-bavli-rosh-hashana',
 'יומא':'talmud-bavli-yoma','סוכה':'talmud-bavli-sukkah','ביצה':'talmud-bavli-beitza','תענית':'talmud-bavli-taanit',
 'מגילה':'talmud-bavli-megillah','מועד קטן':'talmud-bavli-moed-katan','חגיגה':'talmud-bavli-chagigah',
 'יבמות':'talmud-bavli-yevamot','כתובות':'talmud-bavli-ketubot','נדרים':'talmud-bavli-nedarim','נזיר':'talmud-bavli-nazir',
 'סוטה':'talmud-bavli-sotah','גיטין':'talmud-bavli-gittin','קידושין':'talmud-bavli-kiddushin',
 'בבא קמא':'talmud-bavli-bava-kamma','בבא מציעא':'talmud-bavli-bava-metzia','בבא בתרא':'talmud-bavli-bava-batra',
 'סנהדרין':'talmud-bavli-sanhedrin','מכות':'talmud-bavli-makkot','שבועות':'talmud-bavli-shevuot',
 'עבודה זרה':'talmud-bavli-avodah-zarah','הוריות':'talmud-bavli-horayot','עדיות':'talmud-bavli-eduyot',
 'זבחים':'talmud-bavli-zevachim','מנחות':'talmud-bavli-menachot','חולין':'talmud-bavli-chulin',
 'בכורות':'talmud-bavli-bechorot','ערכין':'talmud-bavli-arachin','תמורה':'talmud-bavli-temurah',
 'כריתות':'talmud-bavli-keritot','מעילה':'talmud-bavli-meilah','תמיד':'talmud-bavli-tamid','נדה':'talmud-bavli-niddah',
 'תרומות':'mishna-terumot','פאה':'mishna-peah','ערלה':'mishna-orlah','כלאים':'mishna-kilayim','שביעית':'mishna-sheviit',
 'דמאי':'mishna-demai','מעשרות':'mishna-maasrot','חלה':'mishna-challah','בכורים':'mishna-bikkurim',
 'כלים':'mishna-kelim','קינים':'mishna-kinnim','ידים':'mishna-yadayim','עוקצין':'mishna-oktzin',
 'אהלות':'mishna-ohalot','נגעים':'mishna-negaim','פרה':'mishna-parah','טהרות':'mishna-taharot',
 'מקואות':'mishna-mikvaot','מכשירין':'mishna-machshirin','זבים':'mishna-zavim','טבול יום':'mishna-tvul-yom',
 'אבות':'mishna-avot','מעשר שני':'mishna-maaser-sheni'}

TALMUD_TITLES = {}
for partidx in _g.glob(os.path.join(REPO, 'public/reader/talmud-bavli-*/part-1/index.json')):
    slug_ = partidx.split('/reader/')[1].split('/')[0]
    try:
        d_ = json.load(open(partidx))
        TALMUD_TITLES[slug_] = d_.get('hebrewTitle') or d_.get('title') or slug_
    except Exception:
        TALMUD_TITLES[slug_] = slug_

def daf_map(slug):
    """torah number -> daf & amud, from part index items."""
    m = {}
    for partidx in sorted(_g.glob(os.path.join(REPO, f'public/reader/{slug}/part-*/index.json'))):
        partn = int(re.search(r'part-(\d+)', partidx).group(1))
        try:
            d = json.load(open(partidx))
        except Exception:
            continue
        for it in (d.get('items') or []):
            dn = str(it.get('displayNumber') or '')
            m2 = re.fullmatch(r'(\d+)\s*([ab])', dn)
            if m2:
                m[(int(m2.group(1)), m2.group(2))] = (partn, it.get('number'))
    return m

reg_talmud = {}
n_talmud_files = 0
for tract, dafdict in sorted(shas.items()):
    slug = MASS_SLUG.get(tract)
    if not slug or not os.path.isdir(os.path.join(REPO, 'public', 'reader', slug)):
        print('  skip (no reader):', tract)
        continue
    dm = daf_map(slug)
    if not dm:
        print('  skip (no daf map):', slug)
        continue
    pages_reg = {}
    first_i = min((e.get('i') or 10**9) for v in dafdict.values() for e in v)
    for daf_s in sorted(dafdict.keys(), key=lambda x: int(x)):
        daf = int(daf_s)
        entries_d = dafdict[daf_s]
        es = sorted(entries_d, key=lambda e: e.get('i') or 0)
        segs = [{'index': daf, 'he': f"{e['ph']} — {' · '.join(ref_he(r) for r in e['refs'])}",
                 'en': ' · '.join(ref_en(r) for r in e['refs'])} for e in es if e['refs'] or e['ph']]
        if not segs:
            continue
        made = False
        for amud in ('a', 'b'):
            loc = dm.get((daf, amud))
            if not loc:
                continue
            partn, torah = loc
            if partn != 1:
                # registry supports part key too; keep simple: route includes part
                pass
            fname = f'{slug}-{torah}.json'
            amud_he = 'א' if amud == 'a' else 'ב'
            out = {'source': 'הלכתא כנחמני', 'book': slug, 'daf': daf, 'amud': amud,
                   'title': f'{TALMUD_TITLES.get(slug, slug)} daf {daf}{amud} — sources in Breslov',
                   'hebrewTitle': f'{TALMUD_TITLES.get(slug, slug)} דף {heb_num(daf)} ע״{amud_he}', 'segments': segs}
            json.dump(out, open(os.path.join(OUT_CITE, fname), 'w'), ensure_ascii=False)
            n_talmud_files += 1
            pages_reg[str(torah)] = {'daf': daf, 'amud': amud, 'part': partn}
            made = True
        if not made:
            print('  no page for daf', tract, daf)
    reg_talmud[slug] = {'pages': pages_reg, 'bookPage': book_page_for(first_i)}
print('talmud citation files:', n_talmud_files)

# ---------------- registry ----------------
reg = {'generated': datetime.date.today().isoformat(), 'source': 'הלכתא כנחמני',
       'tanach': reg_tanach, 'talmud': reg_talmud}
json.dump(reg, open(OUT_REG, 'w'), ensure_ascii=False, indent=1)
print('registry ->', OUT_REG)

# ---------------- chok hk-verses v2 ----------------
parshiyos = defaultdict(lambda: defaultdict(dict))
books_chok = defaultdict(lambda: defaultdict(dict))
for e in entries:
    if not e['refs']: continue
    refs = [{'src': (r['c'] or 'EXT'), 'ref': clean_t(r['t'].split(' ', 1)[1] if r['k'] == 'lib' and ' ' in r['t'] else r['t'])} for r in e['refs']]
    v = str(e['v'])
    if 'parsha' in e:
        d = parshiyos[e['parsha']].setdefault(str(e['ch']), {})
        d.setdefault(v, []).extend(refs)
    d2 = books_chok[e['slug']].setdefault(str(e['ch']), {})
    d2.setdefault(v, []).extend(refs)
def plainmap(dd):
    return {k: {kk: {kkk: vv for kkk, vv in v.items()} for kk, v in dd.items()} for k, dd in dd.items()}
out = {'source': 'הלכתא כנחמני', 'version': 2,
       'parshiyos': plainmap(parshiyos), 'books': plainmap(books_chok)}
json.dump(out, open(OUT_CHOK, 'w'), ensure_ascii=False, indent=1)
n = sum(len(ch) for p in parshiyos.values() for ch in p.values())
print('chok hk-verses v2 written:', len(parshiyos), 'parshiyos,', n, 'verse buckets')
print('DONE')
