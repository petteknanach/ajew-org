# Parse HALECHTA KNECHMANI OCR into citation-fact indexes for the ajew reader. v2
# RIGHTS: facts only (which verse/phrase -> which Breslov source); no entry prose.
# v2: canonical Hebrew-numeral validation + OCR-confusion repair + Tanach phrase resolver.
import re, json, os, difflib, glob

SRC = '/root/ajew-hk/hk_ocr.txt'
OUT = '/root/ajew-hk/out'
AJEW = '/root/ajew-org'
os.makedirs(OUT, exist_ok=True)

raw = open(SRC).read()
L = [l for l in raw.split('\n') if l.strip()]
N = len(L)

def norm(s):
    s = (s.replace('&quot;', '"').replace('&apos;', "'").replace('»', '״').replace('«', '״')
          .replace('\u05f4', '״'))
    s = re.sub(r'([א-ת])["״]\s+([א-ת])', r'\1״\2', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

UNITS = [(400,'ת'),(300,'ש'),(200,'ר'),(100,'ק'),(90,'צ'),(80,'פ'),(70,'ע'),(60,'ס'),(50,'נ'),
         (40,'מ'),(30,'ל'),(20,'כ'),(10,'י'),(9,'ט'),(8,'ח'),(7,'ז'),(6,'ו'),(5,'ה'),(4,'ד'),(3,'ג'),(2,'ב'),(1,'א')]
def canon(n):
    if n <= 0: return ''
    if n == 15: return 'טו'
    if n == 16: return 'טז'
    for v, c in UNITS:
        if n >= v:
            r = n - v
            if r == 15: return c + 'טו'
            if r == 16: return c + 'טז'
            return c + canon(r)
    return ''

_V = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100,'ר':200,'ש':300,'ת':400}
def hebnum(tok):
    t = re.sub(r'[״"\'.,:*׳’]', '', tok)
    if not t or len(t) > 5: return None
    if any(c not in _V for c in t): return None
    if t in ('טו','יה'): return 15
    if t in ('טז','יו'): return 16
    return sum(_V[c] for c in t)

def valid_num(tok, vmax):
    """Token counts as a number only if it is the canonical spelling (or a known variant)."""
    t = re.sub(r'[״"\'.,:*]', '', tok).strip()
    v = hebnum(t)
    if v is None or not (1 <= v <= vmax): return None
    if t in ('טו','טז','יה','יו'): return v
    if t == canon(v): return v
    return None

CONF = {'ר':'דז','ד':'ר','ז':'רי','ב':'כנ','כ':'בנ','נ':'בכוי','ו':'ינ','י':'ונ','ן':'וי',
        'מ':'סט','ס':'מט','ט':'סמ','ע':'צ','צ':'ע','ח':'תה','ת':'חה','ק':'הח','ה':'הת'}
def variants(tok, limit=60):
    t0 = re.sub(r'[״"\'.,:*]', '', tok).strip()
    res = {t0}; order = [t0]
    frontier = [t0]
    while frontier and len(order) < limit:
        t = frontier.pop(0)
        for idx, ch in enumerate(t):
            for a in CONF.get(ch, ''):
                if a == ch: continue
                nt = t[:idx] + a + t[idx+1:]
                if nt not in res:
                    res.add(nt); order.append(nt); frontier.append(nt)
    return order  # nearest (fewest subs) first

def extract_refs(body):
    refs = []
    for m in re.finditer(r'\(([^()]{2,140})\)', body):
        t = m.group(1).strip()
        if t:
            k, c = classify(t)
            refs.append({'k': k, 'c': c, 't': norm(t)})
    if body.count('(') > body.count(')'):
        t = body[body.rfind('(')+1:].strip()
        if 2 <= len(t) <= 140:
            k, c = classify(t)
            refs.append({'k': k, 'c': c, 't': norm(t)})
    seen = set(); out = []
    for r in refs:
        key = (r['k'], r['c'], r['t'])
        if key not in seen:
            seen.add(key); out.append(r)
    return out

LIB_PATS = [
    (r'^ל"?ק$', 'LM'), (r'^ל"?ק[^א-ת]', 'LM'),
    (r'^ל"?ת$', 'LM2'), (r'^ל"?ת[^א-ת]', 'LM2'), (r'^ל"?תב', 'LM2'),
    (r'^קל"?ק', 'KLM'), (r'^קל"?ת', 'KLM2'),
    (r'^ס"?ה$', 'HaMidos'), (r'^ס"?ה[^א-ת]', 'HaMidos'),
    (r'^ש"?מ', 'ShivchayMoharan'),
    (r'^ש"?ה', 'SichosHaRan'),
    (r'^הל"?ה', 'LikHalachos'), (r'^ל"?ה$', 'LikHalachos'), (r'^ל"?ה[^א-ת]', 'LikHalachos'),
    (r'^ל"?ת"?פ', 'LikTefilos'),
    (r'^פל"?ח', 'Pirpuros'),
    (r'^בה"?נ', 'BabiHaNachal'),
    (r'^בה"?ל', 'BiurHaLikutim'),
    (r'^עו"?ש', 'OnegShabbos'),
    (r'^ל"?ע', 'LikutayEitzos'),
    (r'^מ"?ח', 'MeiHaNachal'),
    (r'^ח"?מ', 'ChayeyMoharan'),
]
def classify(rawref):
    s = norm(rawref).strip(' .;:')
    head = s.split(' ')[0].strip('()') if s else ''
    for pat, code in LIB_PATS:
        if re.match(pat, head): return ('lib', code)
    return ('ext', None)

def phrase_of(text):
    t = re.sub(r'\s+', ' ', text).strip()
    t = re.sub(r'^[א-ת]{1,3}[.,׳\'"]?\s+', '', t, count=1) if not re.match(r'^\s*[\(\[«]', t) else t
    for sep in ['—', '–', '،', ',']:
        idx = t.find(sep)
        if idx > 8: return t[:idx].strip()
    return t[:70].strip()

# ---------- section tables ----------
PARSHAS = [
 ('בראשית','tanach-bereishit',1,50),('נח','tanach-bereishit',6,50),('לך לך','tanach-bereishit',12,50),
 ('וירא','tanach-bereishit',18,50),('חיי שרה','tanach-bereishit',23,50),('תולדות','tanach-bereishit',25,50),
 ('ויצא','tanach-bereishit',28,50),('וישלח','tanach-bereishit',32,50),('וישב','tanach-bereishit',37,50),
 ('מקץ','tanach-bereishit',41,50),('ויגש','tanach-bereishit',44,50),('ויחי','tanach-bereishit',47,50),
 ('שמות','tanach-shemos',1,40),('וארא','tanach-shemos',6,40),('בא','tanach-shemos',10,40),
 ('בשלח','tanach-shemos',13,40),('יתרו','tanach-shemos',18,40),('משפטים','tanach-shemos',21,40),
 ('תרומה','tanach-shemos',25,40),('תצוה','tanach-shemos',27,40),('כי תשא','tanach-shemos',30,40),
 ('ויקהל','tanach-shemos',35,40),('פקודי','tanach-shemos',38,40),
 ('ויקרא','tanach-vayikra',1,27),('צו','tanach-vayikra',6,27),('שמיני','tanach-vayikra',9,27),
 ('תזריע','tanach-vayikra',12,27),('מצורע','tanach-vayikra',13,27),('אחרי מות','tanach-vayikra',16,27),
 ('קדושים','tanach-vayikra',19,27),('אמור','tanach-vayikra',21,27),('בהר','tanach-vayikra',25,27),
 ('בחקותי','tanach-vayikra',26,27),
 ('במדבר','tanach-bamidbar',1,36),('נשא','tanach-bamidbar',4,36),('בהעלתך','tanach-bamidbar',8,36),
 ('שלח','tanach-bamidbar',13,36),('קרח','tanach-bamidbar',16,36),('חקת','tanach-bamidbar',19,36),
 ('בלק','tanach-bamidbar',22,36),('פינחס','tanach-bamidbar',25,36),('מטות','tanach-bamidbar',30,36),
 ('מסעי','tanach-bamidbar',33,36),
 ('דברים','tanach-devarim',1,34),('ואתחנן','tanach-devarim',3,34),('עקב','tanach-devarim',7,34),
 ('ראה','tanach-devarim',11,34),('שופטים','tanach-devarim',16,34),('כי תצא','tanach-devarim',21,34),
 ('כי תבוא','tanach-devarim',26,34),('נצבים','tanach-devarim',29,34),('וילך','tanach-devarim',31,34),
 ('האזינו','tanach-devarim',32,34),('וזאת הברכה','tanach-devarim',33,34),
]
PARSHAS_VARS = {'מצרע':'מצורע','בחקתי':'בחקותי','וזאת הבופה':'וזאת הברכה','בחקותי':'בחקותי'}
def match_parsha(s):
    s2 = s.strip()
    for canon_, slug, st, mx in PARSHAS:
        if s2 == canon_: return (canon_, slug, st, mx)
    s3 = PARSHAS_VARS.get(s2)
    if s3:
        for canon_, slug, st, mx in PARSHAS:
            if canon_ == s3: return (canon_, slug, st, mx)
    if len(s2) <= 14 and re.fullmatch(r'[\u05d0-\u05ea ]+', s2 or ''):
        for canon_, slug, st, mx in PARSHAS:
            if difflib.SequenceMatcher(None, s2, canon_).ratio() > 0.84:
                return (canon_, slug, st, mx)
    return None

NAVI = [
 ('יהושע','tanach-yehoshua',24,['יהושע']),
 ('שופטים','tanach-shoftim',21,['שופטים']),
 ('שמואל א','tanach-shmuel-a',31,['שמואל א','שמואל']),
 ('שמואל ב','tanach-shmuel-b',24,['שמואל ב']),
 ('מלכים א','tanach-melachim-a',22,['מלכים א','מלבים א','מלבים']),
 ('מלכים ב','tanach-melachim-b',25,['מלכים ב']),
 ('ישעיהו','tanach-yeshayahu',66,['ישעיהו','ישעיה','ישעי׳','ישעי']),
 ('ירמיהו','tanach-yirmiyahu',52,['ירמיהו','ירמיה','ירמי׳','רמי׳']),
 ('יחזקאל','tanach-yechezkel',48,['יחזקאל']),
 ('הושע','tanach-hoshea',14,['הושע']),
 ('יואל','tanach-yoel',4,['יואל']),
 ('עמוס','tanach-amos',9,['עמוס']),
 ('נחום','tanach-nachum',3,['נחום']),
 ('מיכה','tanach-michah',7,['מיכה']),
 ('חבקוק','tanach-havakkuk',3,['חבקוק']),
 ('צפניה','tanach-tzefanya',3,['צפניה']),
 ('חגי','tanach-chaggai',2,['חגי']),
 ('זכריה','tanach-zecharya',14,['זכריה','זכרי׳']),
 ('מלאכי','tanach-malachi',3,['מלאכי']),
 ('תהלים','tanach-tehillim',150,['תהלים','תהילים']),
 ('משלי','tanach-mishlei',31,['משלי']),
 ('איוב','tanach-iyov',42,['איוב']),
 ('שיר השירים','tanach-shir-hashirim',8,['שיר השירים']),
 ('רות','tanach-rus',4,['רות']),
 ('איכה','tanach-eicha',5,['איכה']),
 ('קהלת','tanach-koheles',12,['קהלת']),
 ('אסתר','tanach-esther',10,['אסתר','מגילת אסתר']),
 ('דניאל','tanach-daniel',12,['דניאל']),
 ('נחמיה','tanach-nechemia',13,['נחמיה']),
 ('דברי הימים א','tanach-divrei-hayamim-a',29,['דברי הימים א','דברי מימים א','דברי מימים']),
 ('דברי הימים ב','tanach-divrei-hayamim-b',36,['דברי הימים ב','דברי מימים ב']),
]
def match_navi(s, allow_partial=True):
    s2 = s.strip().strip('.,;:*')
    for canon_, slug, mx, vars_ in NAVI:
        if s2 in vars_: return (canon_, slug, mx)
    if allow_partial and len(s2) <= 14 and re.fullmatch(r'[\u05d0-\u05ea ]+', s2 or ''):
        for canon_, slug, mx, vars_ in NAVI:
            for v in vars_:
                if difflib.SequenceMatcher(None, s2, v).ratio() > 0.9:
                    return (canon_, slug, mx)
    return None

MASS = [
 ('ברכות','talmud-bavli-brachot',['ברכות','ברבות']),('שבת','talmud-bavli-shabbat',['שבת']),
 ('עירובין','talmud-bavli-eruvin',['עירובין']),('פסחים','talmud-bavli-psachim',['פסחים']),
 ('שקלים','talmud-bavli-shkalim',['שקלים']),('ראש השנה','talmud-bavli-rosh-hashana',['ראש השנה','ר״ה']),
 ('יומא','talmud-bavli-yoma',['יומא']),('סוכה','talmud-bavli-sukkah',['סוכה']),
 ('ביצה','talmud-bavli-beitza',['ביצה']),('תענית','talmud-bavli-taanit',['תענית']),
 ('מגילה','talmud-bavli-megillah',['מגילה']),('מועד קטן','talmud-bavli-moed-katan',['מועד קטן','מו״ק']),
 ('חגיגה','talmud-bavli-chagigah',['חגיגה']),('יבמות','talmud-bavli-yevamot',['יבמות']),
 ('כתובות','talmud-bavli-ketubot',['כתובות']),('נדרים','talmud-bavli-nedarim',['נדרים']),
 ('נזיר','talmud-bavli-nazir',['נזיר']),('סוטה','talmud-bavli-sotah',['סוטה']),
 ('גיטין','talmud-bavli-gittin',['גיטין']),('קידושין','talmud-bavli-kiddushin',['קידושין']),
 ('בבא קמא','talmud-bavli-bava-kamma',['בבא קמא','ב״ק']),('בבא מציעא','talmud-bavli-bava-metzia',['בבא מציעא','ב״מ']),
 ('בבא בתרא','talmud-bavli-bava-batra',['בבא בתרא','ב״ב']),('סנהדרין','talmud-bavli-sanhedrin',['סנהדרין']),
 ('מכות','talmud-bavli-makkot',['מכות']),('שבועות','talmud-bavli-shevuot',['שבועות']),
 ('עבודה זרה','talmud-bavli-avodah-zarah',['עבודה זרה','ע״ז']),('הוריות','talmud-bavli-horayot',['הוריות']),
 ('עדיות','talmud-bavli-eduyot',['עדיות']),('זבחים','talmud-bavli-zevachim',['זבחים']),
 ('מנחות','talmud-bavli-menachot',['מנחות']),('חולין','talmud-bavli-chulin',['חולין']),
 ('בכורות','talmud-bavli-bechorot',['בכורות']),('ערכין','talmud-bavli-arachin',['ערכין']),
 ('תמורה','talmud-bavli-temurah',['תמורה']),('כריתות','talmud-bavli-keritot',['כריתות']),
 ('מעילה','talmud-bavli-meilah',['מעילה']),('תמיד','talmud-bavli-tamid',['תמיד']),
 ('נדה','talmud-bavli-niddah',['נדה']),
 ('תרומות',None,['תרומות']),('פאה',None,['פאה']),('ערלה',None,['ערלה']),
 ('כלאים',None,['כלאים']),('שביעית',None,['שביעית']),('דמאי',None,['דמאי']),
 ('מעשרות',None,['מעשרות']),('חלה',None,['חלה']),('בכורים',None,['בכורים']),
 ('כלים',None,['כלים']),('קינים',None,['קינים','קיניו']),('ידים',None,['ידים']),
 ('עוקצין',None,['עוקצין','עולןצין']),('אהלות',None,['אהלות']),('נגעים',None,['נגעים']),
 ('פרה',None,['פרה']),('טהרות',None,['טהרות']),('מקואות',None,['מקואות']),
 ('מכשירין',None,['מכשירין']),('זבים',None,['זבים']),('טבול יום',None,['טבול יום']),
 ('אבות',None,['אבות']),('מעשר שני',None,['מעשר שני']),
]
def match_mass(s):
    s2 = s.strip().strip('.,;:*')
    for canon_, slug, vars_ in MASS:
        if s2 in vars_: return (canon_, slug)
    return None

# Last daf of each tractate (max valid page number) to validate daf tokens
TMAX = {
 'ברכות':64,'שבת':157,'עירובין':105,'פסחים':121,'שקלים':22,'ראש השנה':35,'יומא':88,'סוכה':56,
 'ביצה':40,'תענית':31,'מגילה':32,'מועד קטן':29,'חגיגה':27,'יבמות':122,'כתובות':112,'נדרים':91,
 'נזיר':66,'סוטה':49,'גיטין':90,'קידושין':82,'בבא קמא':119,'בבא מציעא':119,'בבא בתרא':176,
 'סנהדרין':113,'מכות':24,'שבועות':49,'עבודה זרה':76,'הוריות':14,'עדיות':10,'זבחים':120,
 'מנחות':110,'חולין':142,'בכורות':61,'ערכין':34,'תמורה':34,'כריתות':28,'מעילה':22,'תמיד':33,'נדה':73,
 'תרומות':12,'פאה':12,'ערלה':12,'כלאים':12,'שביעית':12,'דמאי':12,'מעשרות':12,'חלה':12,'בכורים':12,
 'כלים':30,'קינים':12,'ידים':22,'עוקצין':12,'אהלות':30,'נגעים':14,'פרה':12,'טהרות':12,'מקואות':12,
 'מכשירין':12,'זבים':12,'טבול יום':12,'אבות':6,'מעשר שני':12,
}

VERSE_RE = re.compile(r'^([\u05d0-\u05ea]{1,3})(?:["׳\']|\s)(.*)$')

# Common 2-letter Hebrew words that are also cardinal-valid spellings -> extra caution
HAZARD = {'מה','לו','לב','יד','גם','עד','מט','קל','עז','יה','הם'}
STOP2 = HAZARD

def resolve_chapter(cur, tok):
    exact = valid_num(tok, cur['max'])
    if exact is not None and -3 <= exact - cur['ch'] <= 12:
        return exact, 'exact'
    for t in variants(tok)[1:]:
        v = valid_num(t, cur['max'])
        if v is not None and 0 <= v - cur['ch'] <= 8:
            return v, 'repair:' + t
    return None, None

def resolve_verse(tok, vmax, last_v):
    exact = valid_num(tok, vmax)
    if exact is not None:
        return exact, 'exact'
    for t in variants(tok)[1:]:
        v = valid_num(t, vmax)
        if v is None: continue
        if last_v is None:
            if v <= 30: return v, 'repair:' + t
        elif 1 <= v - last_v <= 40:
            if len(tok) == 2 and tok in STOP2 and v - last_v > 3:
                continue
            return v, 'repair:' + t
    return None, None

entries_tanach = []   # {slug, ch, v, ph, refs, src, match}
problems = []

def parse_tanach_section(a, b, matcher, with_parsha=False):
    cur = None; last_v = None
    for i in range(a, b):
        s = norm(L[i])
        h = matcher(s)
        if h:
            if len(h) == 4:
                canon_, slug, st, mx = h
                cur = {'name': canon_, 'slug': slug, 'ch': st, 'max': mx}
            else:
                canon_, slug, mx = h
                cur = {'name': canon_, 'slug': slug, 'ch': 1, 'max': mx}
            last_v = None; continue
        if cur is None: continue
        if len(s) <= 5 and not any(c.isdigit() for c in s) and hebnum(s.strip(' .,;:׳\'"')) is not None:
            v, how = resolve_chapter(cur, s.strip(' .,;:׳\'"'))
            if v is not None:
                if v != cur['ch']: cur['ch'] = v
                last_v = None
                if how and how.startswith('repair'):
                    problems.append((i, 'chapter-repair', f'{s.strip(" .,;:")}->{v}'))
            else:
                problems.append((i, 'lone-noise', s))
            continue
        m = VERSE_RE.match(s)
        vnum = None; body = None
        if m and len(m.group(2)) >= 4:
            tok = m.group(1)
            v, how = resolve_verse(tok, 176, last_v)
            if v is not None:
                vnum = v; body = m.group(2)
                if how.startswith('repair'):
                    problems.append((i, 'verse-repair', f'{tok}->{v}'))
                elif tok in HAZARD:
                    problems.append((i, 'verse-hazard', f'{tok}->{v} | {m.group(2)[:40]}'))
        if vnum is not None:
            last_v = vnum
            refs = extract_refs(body)
            ents = {'slug': cur['slug'], 'ch': cur['ch'], 'v': vnum,
                    'ph': phrase_of(body), 'refs': refs, 'i': i}
            if with_parsha:
                ents['parsha'] = cur['name']
            entries_tanach.append(ents)
        else:
            if entries_tanach and entries_tanach[-1].get('i') is not None and cur and cur['slug'] == entries_tanach[-1]['slug']:
                e = entries_tanach[-1]
                refs = extract_refs(s)
                for r in refs:
                    if r not in e['refs']: e['refs'].append(r)
                if not e['ph']:
                    e['ph'] = phrase_of(s)
            else:
                problems.append((i, 'cont-no-cur', s[:70]))

parse_tanach_section(17159, 18108, match_parsha, with_parsha=True)
parse_tanach_section(18108, 19964, lambda s: match_navi(s))

# ---------- resolver against our Tanach text ----------
NIK = re.compile(r'[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u05b0-\u05b9]')
def t2(s):
    s = s or ''
    s = NIK.sub('', s)
    s = re.sub(r"[\u05f3\u05f4'\"]", '', s)
    s = re.sub(r'[^\u05d0-\u05ea\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

print('loading site tanach text...')
BOOKTEXT = {}
for path in glob.glob(AJEW + '/public/reader/tanach-*/part-1/torah-*.json'):
    slug = path.split('/reader/')[1].split('/')[0]
    try:
        d = json.load(open(path))
    except Exception:
        continue
    ch = int(d.get('displayNumber') or d.get('number') or 0)
    bt = BOOKTEXT.setdefault(slug, {})
    for seg in d.get('segments', []):
        v = seg.get('index')
        txt = t2(seg.get('he') or seg.get('he_nikud'))
        if v and txt:
            bt.setdefault(str(ch), {})[str(v)] = txt

def words(s):
    return [w for w in re.split(r'\s+', s) if len(w) >= 2]

match_stats = {'ok': 0, 'weak-ok': 0, 'moved': 0, 'multi': 0, 'none': 0}
moved_samples = []
for e in entries_tanach:
    bt = BOOKTEXT.get(e['slug'])
    if not bt or not e['ph']:
        e['match'] = 'no-text'; match_stats['none'] += 1; continue
    ws = words(t2(e['ph']))
    if len(ws) < 2:
        e['match'] = 'none'; match_stats['none'] += 1; continue
    q3 = ' ' + ' '.join(ws[:3]) + ' '
    q2 = ' ' + ' '.join(ws[:2]) + ' '
    bigrs = [' ' + ws[j] + ' ' + ws[j + 1] + ' ' for j in range(min(len(ws), 6) - 1)]
    hits3 = []; hits2 = []; hitsbi = []
    for c, vs in bt.items():
        for v, txt in vs.items():
            tt = ' ' + txt + ' '
            if q3 in tt: hits3.append((c, v))
            elif q2 in tt: hits2.append((c, v))
            else:
                cnt = sum(1 for b in bigrs if b in tt)
                if cnt >= 2: hitsbi.append((c, v))
    def reloc(hits, tier):
        e['ch0'], e['v0'] = e['ch'], e['v']
        e['ch'], e['v'] = int(hits[0][0]), int(hits[0][1])
        e['match'] = 'moved'; e['tier'] = tier
        match_stats['moved'] += 1
        if len(moved_samples) < 15:
            moved_samples.append((e['slug'], (e['ch0'], e['v0']), (e['ch'], e['v']), e['ph'][:40]))
    if hits3:
        pref = [(c, v) for c, v in hits3 if c == str(e['ch']) and v == str(e['v'])]
        if pref:
            e['match'] = 'ok'; match_stats['ok'] += 1; continue
        if len(hits3) == 1: reloc(hits3, 'q3-1'); continue
        chs = set(c for c, v in hits3)
        in_ch = [(c, v) for c, v in hits3 if c == str(e['ch'])]
        if len(chs) == 1: reloc(hits3, 'q3-ch'); continue
        if in_ch:
            e['match'] = 'ok'; e['tier'] = 'q3-multi-ch'; match_stats['weak-ok'] += 1; continue
        e['match'] = 'multi'; match_stats['multi'] += 1; continue
    if hits2:
        pref = [(c, v) for c, v in hits2 if c == str(e['ch']) and v == str(e['v'])]
        if pref:
            e['match'] = 'ok'; e['tier'] = 'q2'; match_stats['weak-ok'] += 1; continue
        if len(hits2) == 1: reloc(hits2, 'q2-1'); continue
        e['match'] = 'multi'; e['tier'] = 'q2'; match_stats['multi'] += 1; continue
    if hitsbi:
        if len(hitsbi) == 1: reloc(hitsbi, 'bi-1'); continue
        pref = [(c, v) for c, v in hitsbi if c == str(e['ch']) and v == str(e['v'])]
        if pref:
            e['match'] = 'ok'; e['tier'] = 'bi'; match_stats['weak-ok'] += 1; continue
        e['match'] = 'multi'; e['tier'] = 'bi'; match_stats['multi'] += 1; continue
    e['match'] = 'none'; match_stats['none'] += 1

print('resolver:', match_stats)
print('--- moved samples (book, old->new, phrase):')
for s_ in moved_samples: print('   ', s_)

# cleanup: entries whose numeric placement is impossible (verse > chapter max) and
# resolver could not place them -> drop (they are continuation-misparse artifacts)
drop_n = 0
_mv = {}
for slug, bt in BOOKTEXT.items():
    _mv[slug] = {c: max(int(x) for x in vs) for c, vs in bt.items()}
kept = []
for e in entries_tanach:
    mv = _mv.get(e['slug'])
    if mv is None: kept.append(e); continue
    mx = mv.get(str(e['ch']))
    if mx is None:
        if e['match'] in ('ok', 'moved', 'weak-ok'): kept.append(e)
        else: drop_n += 1
        continue
    if int(e['v']) > mx and e['match'] not in ('ok', 'weak-ok'):
        drop_n += 1; continue
    kept.append(e)
entries_tanach = kept
print('cleanup: dropped', drop_n, 'entries; kept', len(entries_tanach))

# ---------- shas ----------
shas_daf = {}; shas_perek = {}
cur = None; last = None
for i in range(19964, 20903):
    s = norm(L[i])
    h = match_mass(s)
    if h:
        canon_, slug = h
        cur = {'name': canon_}; last = None; continue
    if cur is None:
        problems.append((i, 'shas-pre', s[:70])); continue
    m = re.match(r'^(פ[\"״]?[א-ת])\s+(.*)$', s)
    if m:
        pk = hebnum(m.group(1).replace('פ',''))
        dest = shas_perek.setdefault(cur['name'], {})
        dest.setdefault(str(pk), []).append({'ph': phrase_of(m.group(2)), 'refs': extract_refs(m.group(2)), 'txt': m.group(2)[:220]})
        last = ('perek', pk); continue
    m = re.match(r'^([\u05d0-\u05ea]{1,4})(?:["׳\']|\s)(.*)$', s)
    v = None; tok = None
    if m and len(m.group(2)) >= 4:
        tok = m.group(1)
        tmax = TMAX.get(cur['name'], 200)
        lastv = last[1] if (last and last[0] == 'daf') else None
        v = valid_num(tok, tmax)
        if v is not None and lastv is not None and not (lastv - 2 <= v <= lastv + 95):
            v = None
        if v is not None and lastv is not None and v - lastv > 40:
            problems.append((i, 'daf-jump', f'{tok}->{v} (prev {lastv})'))
        if v is not None and tok in HAZARD:
            problems.append((i, 'daf-hazard', f'{tok}->{v} | {m.group(2)[:50]}'))
        if v is None and tok is not None:
            lo = 3 if len(tok) >= 3 else 2
            if len(tok) >= 2:
                for t in variants(tok)[1:]:
                    c = valid_num(t, tmax)
                    if c is None: continue
                    win = 40 if len(tok) >= 3 else 6
                    if lastv is None or (lastv - 2 <= c <= lastv + win):
                        problems.append((i, 'daf-repair', f'{tok}->{c}'))
                        v = c; break
    if v is not None:
        dest = shas_daf.setdefault(cur['name'], {})
        dest.setdefault(str(v), []).append({'ph': phrase_of(m.group(2)), 'refs': extract_refs(m.group(2)), 'txt': m.group(2)[:220], 'i': i})
        last = ('daf', v)
    else:
        if last:
            kind, num = last
            dest = (shas_daf if kind == 'daf' else shas_perek).get(cur['name'], {}).get(str(num), [])
            if dest:
                e = dest[-1]
                for r in extract_refs(s):
                    if r not in e['refs']: e['refs'].append(r)
            else:
                problems.append((i, 'shas-orphan', s[:70]))
        else:
            problems.append((i, 'shas-orphan', s[:70]))

# ---------- stats / output ----------
from collections import Counter, defaultdict
print('=== TANACH entries:', len(entries_tanach))
withrefs = [e for e in entries_tanach if e['refs']]
print('with refs:', len(withrefs))
print('match stats of withrefs:', Counter(e['match'] for e in withrefs))
bybook = defaultdict(lambda: [0, 0])
for e in withrefs:
    bybook[e['slug']][0] += 1; bybook[e['slug']][1] += len(e['refs'])
for slug in sorted(bybook):
    chs = sorted(set(e['ch'] for e in withrefs if e['slug'] == slug))
    print(' ', slug, 'entries', bybook[slug][0], 'refs', bybook[slug][1], 'chapters:', chs)

print('=== SHAS')
daf_entries = sum(len(v) for tr in shas_daf.values() for v in tr.values())
perek_entries = sum(len(v) for tr in shas_perek.values() for v in tr.values())
print('tractates:', len(shas_daf), 'daf-entries:', daf_entries, '| perek-entries:', perek_entries)
for t in sorted(shas_daf):
    print(' ', t, 'dafim:', sorted(int(d) for d in shas_daf[t]))

print('=== problems top:')
cnt = Counter(p[1] for p in problems)
print(cnt)
print('--- verse-repair samples:')
for i, k, s in [p for p in problems if p[1] == 'verse-repair'][:30]:
    print('   ', i, s)
print('--- chapter-repair samples:')
for i, k, s in [p for p in problems if p[1] == 'chapter-repair'][:30]:
    print('   ', i, s)
print('--- non-repair problems:')
for i, k, s in [p for p in problems if p[1] not in ('verse-repair', 'chapter-repair', 'daf-repair')][:40]:
    print('   ', i, k, '|', s)

json.dump({'entries_tanach': entries_tanach, 'shas_daf': shas_daf, 'shas_perek': shas_perek},
          open(OUT + '/hk_index_v2.json', 'w'), ensure_ascii=False)
print('written', OUT + '/hk_index_v2.json')

print('=== SPOT CHECK ===')
def show_spot(slug, ch, vmax=40):
    print(f'--- {slug} ch{ch}')
    for e in entries_tanach:
        if e['slug'] == slug and e['ch'] == ch and e['v'] <= vmax and e['refs']:
            refs = '; '.join(r['t'] for r in e['refs'][:3])
            print(f"   {e['ch']}:{e['v']} [{e['match']}] {e['ph'][:45]} | {refs[:90]}")
show_spot('tanach-bereishit', 1)
show_spot('tanach-bereishit', 3)
show_spot('tanach-shmuel-a', 1)
show_spot('tanach-tehillim', 119, vmax=200)
print('--- brachot daf 3')
for e in shas_daf.get('ברכות', {}).get('3', []):
    refs = '; '.join(r['t'] for r in e['refs'][:3])
    print(f"   3 {e['ph'][:50]} | {refs[:90]}")
