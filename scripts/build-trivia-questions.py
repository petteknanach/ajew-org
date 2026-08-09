#!/usr/bin/env python3
"""Build a replay-safe, source-linked ajew.org trivia catalog from canonical reader data."""
from __future__ import annotations
import hashlib, json, random, re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/data/trivia/questions.json'
Q=[]
FEMALE=re.compile(r'\b(mrs\.?|woman|women|wife|mother|daughter|sister|girl|girls|bride|sashia|feiga|sarah)\b',re.I)

def load(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def clean(s):
    s=re.sub(r'<[^>]+>',' ',str(s or ''))
    s=re.sub(r'\[[0-9]+\]','',s)
    return re.sub(r'\s+',' ',s).strip()
def clip(s,n=235):
    s=clean(s)
    if len(s)<=n:return s
    cut=s[:n].rsplit(' ',1)[0]
    return cut+'…'
def stable(key): return int(hashlib.sha256(key.encode()).hexdigest()[:16],16)
def shuffled_options(correct, distractors, key):
    vals=[correct]+[x for x in distractors if x and x!=correct]
    vals=list(dict.fromkeys(vals))[:4]
    if len(vals)<4:return None
    r=random.Random(stable(key));r.shuffle(vals)
    return vals,vals.index(correct)
def add(key,category,level,prompt,correct,distractors,explanation,source_label,source_url):
    pack=shuffled_options(clean(correct),[clean(x) for x in distractors],key)
    if not pack:return
    opts,answer=pack
    qid=hashlib.sha1(key.encode()).hexdigest()[:16]
    Q.append({'id':qid,'category':category,'level':level,'prompt':clean(prompt),'options':opts,'answer':answer,
              'explanation':clean(explanation),'sourceLabel':source_label,'sourceUrl':source_url})

def distract(pool,correct,key,n=3):
    vals=[x for x in dict.fromkeys(pool) if x!=correct]
    r=random.Random(stable(key));r.shuffle(vals)
    return vals[:n]

# 1) Sefer HaMidos — exact teaching to topic identification. This is the largest category by design.
sh_dir=ROOT/'public/reader/sefer-hamidos'
sh_topics=[]
for p in sorted(sh_dir.glob('topic-*.json')):
    try:d=load(p)
    except:continue
    title=clean(d.get('title'))
    if not title:continue
    sh_topics.append((p,d,title))
sh_titles=[x[2] for x in sh_topics]
for p,d,title in sh_topics:
    segs=[s for s in d.get('segments',[]) if 30<=len(clean(s.get('en')))<=300]
    if not segs:continue
    # Cap each topic but cover the whole book.
    topic_match=re.search(r'(\d+)',p.stem)
    topic_num=d.get('topic') or d.get('torah') or (topic_match.group(1) if topic_match else '')
    for seg in segs[:4]:
        en=clean(seg.get('en')); idx=seg.get('displayLabel') or seg.get('sourceNumber') or seg.get('index')
        key=f"sh-topic:{d.get('id')}:{seg.get('index')}"
        level='beginner' if len(en)<120 else 'scholar'
        add(key,'teachings',level,f'Which Sefer Hamidos topic contains this teaching? “{clip(en)}”',title,
            distract(sh_titles,title,key),f'This is teaching {idx} in “{title}.”','Sefer Hamidos',f"/reader/sefer-hamidos/1/{topic_num}#seg-{seg.get('index')}")

# 2) Likutay Moharan — use canonical title, key verse and reviewed siman summaries.
lm=[]
for part in (1,2):
    for p in sorted((ROOT/f'public/reader/likutay-moharan/part-{part}').glob('torah-*.json')):
        try:d=load(p)
        except:continue
        title=clean(d.get('title')); num=d.get('displayNumber') or d.get('torah')
        if title and title not in {'Untitled',''}:lm.append((part,p,d,title,str(num)))
lm_labels=[f"Torah {num}: {title}" for _,_,_,title,num in lm]
for part,p,d,title,num in lm:
    correct=f"Torah {num}: {title}"
    source=f"/reader/likutay-moharan/{part}/{d.get('torah')}"
    summaries=[clean(s.get('summary')) for s in d.get('simanim',[]) if 35<=len(clean(s.get('summary')))<=240]
    clues=[]
    if clean(d.get('keyVerseTranslation')): clues.append(('key verse',clean(d['keyVerseTranslation'])))
    clues += [('teaching summary',s) for s in summaries[:2]]
    for i,(kind,text) in enumerate(clues):
        key=f'lm:{part}:{d.get("torah")}:{i}'
        add(key,'teachings','scholar',f'Which Likutay Moharan teaching is identified by this {kind}? “{clip(text)}”',correct,
            distract(lm_labels,correct,key),f'This clue belongs to Likutay Moharan, Part {part}, Torah {num}, “{title}.”','Likutay Moharan',source)

# 3) Sichos HaRan — concise exact excerpt to numbered sicha.
sichot=[]
for p in sorted((ROOT/'public/reader/sichos-haran').glob('sicha-*.json')):
    try:d=load(p)
    except:continue
    num=str(d.get('displayNumber') or d.get('torah'))
    en=' '.join(clean(s.get('en')) for s in d.get('segments',[]))
    if 45<=len(en)<=1400:sichot.append((p,d,num,en))
sicha_labels=[f'Sicha {x[2]}' for x in sichot]
for p,d,num,en in sichot:
    key=f'sicha:{num}'
    correct=f'Sicha {num}'
    add(key,'avodah','fire',f'From which numbered Sicha in Sichos HaRan is this exact passage? “{clip(en,210)}”',correct,
        distract(sicha_labels,correct,key),f'The passage is from Sichos HaRan {num}.','Sichos HaRan',f'/reader/sichos-haran/1/{d.get("torah") or num}')

# 4) Explicitly reviewed male allowlist from the live yahrzeit box union.
# Authority: CompactYahrzeit.astro importantDates + tzaddikim-database-complete.json.
# Conflicting live aliases/dates (Saba, Alter of Teplik, Avraham Chazan) are intentionally
# omitted from date trivia until reconciled. Rebbe Nosson and Nachman Tulchiner retain only
# their uncontested month/day; their conflicting civil/Hebrew year labels are suppressed.
people=[
 {'name':'Rabbi Nachman of Breslov','yahrzeit_day':18,'yahrzeit_month':'Tishrei','year_passed':'1810'},
 {'name':'Rabbi Nachman of Horodenka','yahrzeit_day':2,'yahrzeit_month':'Tamuz','year_passed':'1765'},
 {'name':"R' Ephraim son of Reb Naftali",'yahrzeit_day':14,'yahrzeit_month':'Tishrei','year_passed':'1882'},
 {'name':"R' David Tzvi Dashivsky",'yahrzeit_day':19,'yahrzeit_month':'Tishrei','year_passed':'1912'},
 {'name':"R' Sender son of Reb Tzvi of Tzfas",'yahrzeit_day':2,'yahrzeit_month':'Cheshvan','year_passed':'1891'},
 {'name':"R' Yisrael Karduner",'yahrzeit_day':9,'yahrzeit_month':'Cheshvan','year_passed':'1919'},
 {'name':"R' Nosson Trubitzer of Tzfas",'yahrzeit_day':9,'yahrzeit_month':'Kislev','year_passed':'1918'},
 {'name':"R' Shmuel Heshel Friedman",'yahrzeit_day':14,'yahrzeit_month':'Kislev','year_passed':'1917'},
 {'name':"R' Shmuel son of Reb Yaakov of Nemirov",'yahrzeit_day':20,'yahrzeit_month':'Kislev','year_passed':'1830'},
 {'name':'Rebbe Nosson','yahrzeit_day':10,'yahrzeit_month':'Tevet','year_passed':''},
 {'name':"R' Yitzchok Isaac Eisenstein",'yahrzeit_day':18,'yahrzeit_month':'Tevet','year_passed':'1923'},
 {'name':"R' Yitzchok Isaac Yosef Sofer",'yahrzeit_day':11,'yahrzeit_month':'Adar','year_passed':'1828'},
 {'name':"R' Tzvi Aryeh son of R' Aharon of Breslov",'yahrzeit_day':11,'yahrzeit_month':'Adar','year_passed':'1868'},
 {'name':"R' Nosson son of Reb Yosef of Yerushalayim",'yahrzeit_day':7,'yahrzeit_month':'Adar II','year_passed':'1897'},
 {'name':"R' Nachman of Tcherin",'yahrzeit_day':13,'yahrzeit_month':'Adar II','year_passed':'1894'},
 {'name':"R' Mendl of Ladizhin",'yahrzeit_day':20,'yahrzeit_month':'Nisan','year_passed':'1831'},
 {'name':"R' Getzel Libovne",'yahrzeit_day':21,'yahrzeit_month':'Nisan','year_passed':'1918'},
 {'name':"R' Nachman of Tulchin",'yahrzeit_day':26,'yahrzeit_month':'Nisan','year_passed':''},
 {'name':"R' Avraham Eliezer son of Reb Sender of Tzfas",'yahrzeit_day':23,'yahrzeit_month':'Iyyar','year_passed':'1906'},
 {'name':"R' Shmuel of Teplik",'yahrzeit_day':24,'yahrzeit_month':'Iyyar','year_passed':'1831'},
 {'name':"R' Nachman Hilman (the Silent)",'yahrzeit_day':2,'yahrzeit_month':'Iyyar','year_passed':''},
 {'name':"R' Shimshon Barsky",'yahrzeit_day':1,'yahrzeit_month':'Sivan','year_passed':'1935'},
 {'name':"R' Baruch Chavitman",'yahrzeit_day':17,'yahrzeit_month':'Sivan','year_passed':''},
 {'name':"R' Yosef son of Reb Nosson of Yerushalayim",'yahrzeit_day':1,'yahrzeit_month':'Tamuz','year_passed':'1895'},
 {'name':"R' Tuvia of Bobrinets",'yahrzeit_day':24,'yahrzeit_month':'Tamuz','year_passed':'1920'},
 {'name':"R' Aharon of Breslov",'yahrzeit_day':1,'yahrzeit_month':'Av','year_passed':'1845'},
 {'name':"R' Naftali of Nemirov",'yahrzeit_day':19,'yahrzeit_month':'Av','year_passed':'1860'},
 {'name':"R' Tzvi Trubitzer of Tzfas",'yahrzeit_day':26,'yahrzeit_month':'Av','year_passed':'1890'},
 {'name':"R' Shnia Yosef ben Shalom",'yahrzeit_day':12,'yahrzeit_month':'Elul','year_passed':''},
 {'name':"R' Yitzchak Gershon Broski",'yahrzeit_day':14,'yahrzeit_month':'Elul','year_passed':''},
 {'name':"R' Avraham Abutbul",'yahrzeit_day':21,'yahrzeit_month':'Tishrei','year_passed':''},
 {'name':"R' Binyamin Ze'ev Cheshin",'yahrzeit_day':13,'yahrzeit_month':'Cheshvan','year_passed':''},
 {'name':"R' Tzvi Aryeh Lupel",'yahrzeit_day':23,'yahrzeit_month':'Cheshvan','year_passed':''},
 {'name':"R' Ephraim Tzvi Krakovsky",'yahrzeit_day':16,'yahrzeit_month':'Tevet','year_passed':'1946'},
 {'name':"R' Aharon Glidman",'yahrzeit_day':14,'yahrzeit_month':'Adar','year_passed':''},
 {'name':"R' Yitzchak ben Moharnat",'yahrzeit_day':14,'yahrzeit_month':'Adar II','year_passed':'1870'},
 {'name':"R' Moshe Breslover",'yahrzeit_day':1,'yahrzeit_month':"Sh'vat",'year_passed':''},
 {'name':'Rabbi Shmuel Horowitz','yahrzeit_day':24,'yahrzeit_month':'Kislev','year_passed':'1973'},
]
dates=[f"{x['yahrzeit_day']} {x['yahrzeit_month']}" for x in people]
names=[clean(x['name']) for x in people]
for x in people:
    name=clean(x['name']); date=f"{x['yahrzeit_day']} {x['yahrzeit_month']}"; year=clean(x.get('year_passed'))
    key=f'yahrzeit-date:{name}'
    add(key,'personages','beginner',f'According to the approved Breslov yahrzeit list, when is the yahrzeit of {name}?',date,
        distract(dates,date,key),f'{name} is listed for {date}.','Approved Breslov yahrzeit list','/tzaddikim')
    key=f'yahrzeit-name:{name}'
    add(key,'personages','scholar',f'Which approved Breslov personage is remembered on {date}?',name,
        distract(names,name,key),f'The yahrzeit box lists {name} on {date}.','Approved Breslov yahrzeit list','/tzaddikim')
    years=re.findall(r'\b(?:17|18|19)\d{2}\b',year)
    if years:
        civil=years[-1]; year_pool=[]
        for y in range(max(1700,int(civil)-12),int(civil)+13):
            if str(y)!=civil:year_pool.append(str(y))
        key=f'yahrzeit-year:{name}'
        add(key,'personages','fire',f'What civil year of passing is listed for {name}?',civil,
            distract(year_pool,civil,key),f'The approved record lists {year}.','Approved Breslov yahrzeit list','/tzaddikim')

# 5) Breslov history — pair the canonical Geedoolay HaNachal timeline rows.
geed=load(ROOT/'public/reader/geedoolay-hanachal/section-2.json')
segs=geed.get('segments',[]);events=[]
_allowed_words=set()
for person in people:
    for word in re.findall(r"[A-Za-z]+",clean(person.get('name'))):
        if len(word)>=5 and word.lower() not in {'rebbe','rabbi','breslov','tzfas','yerushalayim'}:_allowed_words.add(word.lower())
for a,b in zip(segs,segs[1:]):
    year=clean(a.get('en')); event=clean(b.get('en'))
    m=re.fullmatch(r'\d{4}\s*/\s*((?:17|18|19)\d{2})',year)
    if not m or len(event)<12 or FEMALE.search(event):continue
    # A named-person milestone is admitted only when its man appears in the yahrzeit-box population.
    if re.search(r'\b(?:Rabbi|Rebbe|Reb|R\.)\b',event) and not any(w in event.lower() for w in _allowed_words):continue
    civil=m.group(1)
    if int(civil)>1980:continue
    events.append((year,civil,event,b.get('index')))
event_texts=[e[2] for e in events]; event_years=[e[1] for e in events]
for year,civil,event,idx in events:
    key=f'history-year:{civil}:{idx}'
    add(key,'history','scholar',f'In the Geedoolay HaNachal timeline, when did this occur? “{event}”',civil,
        distract(event_years,civil,key),f'The timeline pairs this milestone with {year}.','Geedoolay HaNachal timeline',f'/reader/geedoolay-hanachal/1/2#seg-{idx}')
    key=f'history-event:{civil}:{idx}'
    add(key,'history','fire',f'Which milestone does the Geedoolay HaNachal timeline place in {civil}?',event,
        distract(event_texts,event,key),f'The listed milestone for {year} is: {event}','Geedoolay HaNachal timeline',f'/reader/geedoolay-hanachal/1/2#seg-{idx}')

# 6) Na Nach / Saba — identify exact, male-centered passages by their canonical Saba section.
saba_dir=ROOT/'public/reader/sichos-chayay-saba'
saba_index=load(saba_dir/'index.json')
saba_sections=[]
for meta in saba_index.get('torahs',[]):
    num=int(meta['number']); p=saba_dir/f'section-{num}.json'
    if not p.exists():continue
    d=load(p); label=f"Part {num}: {clean(meta.get('title')).split(' Source Lines')[0]}"
    saba_sections.append((num,d,label))
saba_labels=[x[2] for x in saba_sections]
for num,d,label in saba_sections:
    candidates=[]
    for s in d.get('segments',[]):
        en=clean(s.get('en'))
        if 70<=len(en)<=420 and not FEMALE.search(en):candidates.append(s)
    # evenly spread up to eight per section
    if len(candidates)>8:
        step=max(1,len(candidates)//8);candidates=candidates[::step][:8]
    for s in candidates:
        en=clean(s.get('en')); key=f'saba:{num}:{s.get("index")}'
        add(key,'nanach','scholar',f'In which section of Sichos Metoch Chayay HaSaba does this passage appear? “{clip(en)}”',label,
            distract(saba_labels,label,key),f'This passage is in {label}.','Sichos Metoch Chayay HaSaba',f'/reader/sichos-chayay-saba/1/{num}#seg-{s.get("index")}')

# 7) Books and sources — distinguish core Breslov/Na Nach works from exact excerpts.
works=[
 ('Yisroel Saba','yisroel-saba','chapter-*.json','/reader/yisroel-saba/1/{n}'),
 ('Ebay HaNachal','ebay-hanachal','part-*/*.json','/reader/ebay-hanachal/{part}/{n}'),
 ('Likutay Nanach','likutay-nanach','*.json','/reader/likutay-nanach/{part}/{n}'),
 ('Sichos HaRan','sichos-haran','sicha-*.json','/reader/sichos-haran/1/{n}'),
]
work_names=[w[0] for w in works]
for work,folder,pattern,urlpat in works:
    files=[p for p in (ROOT/'public/reader'/folder).glob(pattern) if p.name!='index.json']
    r=random.Random(stable('work:'+work));r.shuffle(files)
    count=0
    for p in files:
        if count>=45:break
        try:d=load(p)
        except:continue
        candidates=[]
        for s in d.get('segments',[]):
            en=clean(s.get('en'))
            if 65<=len(en)<=260 and not FEMALE.search(en):candidates.append((s,en))
        if not candidates:continue
        s,en=candidates[stable(str(p))%len(candidates)]
        n=d.get('torah') or d.get('chapter') or d.get('letter') or re.search(r'(\d+)',p.stem).group(1)
        part=d.get('part') or (re.search(r'part-(\d+)',str(p)).group(1) if re.search(r'part-(\d+)',str(p)) else 1)
        key=f'work:{folder}:{part}:{n}:{s.get("index")}'
        category='nanach' if work in {'Yisroel Saba','Ebay HaNachal','Likutay Nanach'} else 'books'
        add(key,category,'beginner',f'From which Breslov or Na Nach work is this passage? “{clip(en,210)}”',work,
            distract(work_names,work,key),f'This passage appears in {work}.',work,urlpat.format(n=n,part=part)+f'#seg-{s.get("index")}')
        count+=1

# Remove accidental duplicate prompts and write deterministic output.
seen=set();dedup=[]
for q in Q:
    sig=q['prompt'].casefold()
    if sig in seen:continue
    seen.add(sig);dedup.append(q)
Q=sorted(dedup,key=lambda x:x['id'])
meta={
 'version':1,
 'generatedFrom':'Canonical ajew.org reader JSON and approved Breslov yahrzeit records',
 'personageRule':'Only male Breslov entries that are present in the same database used by the live yahrzeit box.',
 'categories':{
  'teachings':'Teachings — Sefer Hamidos & Likutay Moharan',
  'avodah':'Avodah — Sichos HaRan',
  'history':'Breslov History',
  'personages':'Breslov Personages — approved yahrzeit list only',
  'nanach':'Na Nach & Saba Yisroel',
  'books':'Books & Sources'
 },
 'levels':['beginner','scholar','fire'],
 'count':len(Q),'questions':Q
}
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'output':str(OUT),'questions':len(Q),'categories':{k:sum(1 for q in Q if q['category']==k) for k in meta['categories']},'levels':{k:sum(1 for q in Q if q['level']==k) for k in meta['levels']},'approved_male_personages':len(people)},indent=2))
