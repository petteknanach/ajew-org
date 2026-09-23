# Parse the HALECHTA KNECHMANI OCR (parsha -> verse -> Breslov refs).
# RIGHTS: the book carries the author's reprint ban (title-page modaa) -
# we extract FACTS ONLY (which verse points to which Breslov source),
# never the entry prose. Verse text shown in the reader comes from our
# own tanach data; refs are citation facts.
import re, json

t = open('/root/.hermes/cache/scratch/hk_ocr.txt').read()
lines = [l for l in t.split(chr(10)) if l.strip()]

BODY_START = 17159   # 'בראשית' body header
BODY_END = 18116     # start of the navi band

HEB_NUM = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'יא':11,'יב':12,'יג':13,'יד':14,'טו':15,'טז':16,'יז':17,'יח':18,'יט':19,'כ':20,'כא':21,'כב':22,'כג':23,'כד':24,'כה':25,'כו':26,'כז':27,'כח':28,'כט':29,'ל':30,'לא':31,'לב':32,'לג':33,'לד':34,'לה':35,'לו':36,'לז':37,'לח':38,'לט':39,'מ':40,'מא':41,'מב':42,'מג':43,'מד':44,'מה':45,'מו':46,'מז':47,'מח':48,'מט':49,'נ':50,'נא':51,'נב':52,'נג':53,'נד':54,'נה':55,'נו':56,'נז':57,'נח':58,'נט':59,'ס':60,'סא':61,'סב':62,'סג':63,'סד':64,'סה':65,'סו':66,'סז':67,'סח':68,'סט':69,'ע':70,'עא':71,'עב':72,'עג':73,'עד':74,'עה':75,'עו':76,'עז':77,'עח':78,'עט':79,'פ':80,'פא':81,'פב':82,'פג':83,'פד':84,'פה':85,'פו':86,'פז':87,'פח':88,'פט':89,'צ':90,'צא':91,'צב':92,'צג':93,'צד':94,'צה':95,'צו':96,'צז':97,'צח':98,'צט':99,'ק':100,'קא':101,'קב':102,'קג':103,'קד':104,'קה':105,'קו':106,'קז':107,'קח':108,'קט':109,'קי':110,'קיא':111,'קיב':112,'קיג':113,'קיד':114,'קטו':115,'קטז':116,'קיז':117,'קיח':118,'קיט':119,'קכ':120}

PARSHAS = ['בראשית','נח','לך לך','וירא','חיי שרה','תולדות','ויצא','וישלח','וישב','מקץ','ויגש','ויחי','שמות','וארא','בא','בשלח','יתרו','משפטים','תרומה','תצוה','כי תשא','ויקהל','פקודי','ויקרא','צו','שמיני','תזריע','מצרע','אחרי מות','קדושים','אמור','בהר','בחקתי','במדבר','נשא','בהעלתך','שלח','קרח','חקת','בלק','פינחס','מטות','מסעי','דברים','ואתחנן','עקב','ראה','שופטים','כי תצא','כי תבוא','נצבים','וילך','האזינו','וזאת הברכה']

SRC = [
    (r'^ל["״]?ק$', 'LM'), (r'^ל["״]?ת$', 'LM2'),
    (r'^קל["״]?ק$', 'KLM'), (r'^קל["״]?ת$', 'KLM2'),
    (r'^ס["״]?ה$', 'HaMidos'),
    (r'^הל["״]?ה$', 'LikHalachos'),
    (r'^ל["״]?ת["״]?פ$', 'LikTefilos'), (r'^ל["״]?ה$', 'LikTefilos'),
    (r'^ח["״]?מ$', 'ChayeyMoharan'), (r'^ש["״]?ה$', 'Sichos'),
]

def norm(s):
    s = s.replace('&quot;', '"').replace('&apos;', "'").replace('»', '״')
    s = re.sub(r'([א-ת])["״]\s+([א-ת])', r'\1"\2', s)   # ל" ק -> ל"ק
    return re.sub(r'\s+', ' ', s).strip()

def classify(raw):
    s = norm(raw)
    parts = s.split(' ')
    head = parts[0].strip('()')
    for pat, name in SRC:
        if re.match(pat, head):
            return name, (' '.join(parts[1:]) or '').strip()
    return None, None

import difflib

out = {}
cur_parsha = None
cur_verse = None
stats = {'verse_entries': 0, 'refhits': 0}
for i in range(BODY_START, BODY_END):
    ls = norm(lines[i])
    if not ls:
        continue
    if len(ls) <= 14 and (ls in PARSHAS or (difflib.SequenceMatcher(None, ls, 'וזאת הברכה').ratio() > 0.75 and ls.startswith('וזאת'))):
        cur_parsha = 'וזאת הברכה' if ls.startswith('וזאת') else ls
        cur_verse = None
        out.setdefault(cur_parsha, {})
        continue
    m = re.match(r'^([א-ת]{1,3})\s+(.{10,})', ls)
    vnum = HEB_NUM.get(m.group(1)) if m else None
    if m and vnum:
        body = m.group(2)
        cur_verse = vnum
    elif cur_verse:
        body = ls          # continuation line -> refs belong to current verse
    else:
        continue
    refs = re.findall(r'\(([^()]{2,60})\)', body)
    parsed = []
    for raw in refs:
        name, detail = classify(raw)
        if name:
            parsed.append({'src': name, 'ref': detail.strip(), 'raw': raw.strip()})
            stats['refhits'] += 1
    if parsed and cur_parsha and cur_verse:
        key = str(cur_verse)
        out.setdefault(cur_parsha, {}).setdefault(key, [])
        for p in parsed:
            if p not in out[cur_parsha][key]:
                out[cur_parsha][key].append(p)
        if m and vnum:
            stats['verse_entries'] += 1

tot = sum(len(v) for p in out.values() for v in p.values())
print('parshiyos:', len(out), '| verses with refs:', sum(len(p) for p in out.values()), '| ref groups:', tot)
print('stats:', stats)
print('sample מקץ v1:', json.dumps(out.get('מקץ', {}).get('1', [])[:5], ensure_ascii=False))
print('sample בראשית v3:', json.dumps(out.get('בראשית', {}).get('3', [])[:4], ensure_ascii=False))
print('sample וישב v1:', json.dumps(out.get('וישב', {}).get('1', [])[:4], ensure_ascii=False))
json.dump(out, open('/root/.hermes/cache/scratch/hk_verses_raw.json', 'w'), ensure_ascii=False, indent=1)
