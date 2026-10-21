#!/usr/bin/env python3
"""Build Today in Breslov from explicit source-owned dates, not mention mining.

stdlib only; one source JSON at a time. Run with --source-root /root/ajew-org
when this checkout does not contain the complete Reader corpus. No manuscripts
are written. English summaries are newly authored metadata, never borrowed from
unreviewed letter translations. Dates without a year keep year=null.

Admission: letter opening datelines; Geedoolay's structured yahrzeit register;
explicitly reviewed dated narrative/teaching passages; Breslov-category DB rows.
Discovery candidates are not events. See --report/--audit for exact exclusions.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
MONTHS = ('Nisan','Iyyar','Sivan','Tamuz','Av','Elul','Tishrei','Cheshvan',
          'Kislev','Tevet','Shvat','Adar','Adar I','Adar II')
MONTH_HE = dict(zip(MONTHS, ('ניסן','אייר','סיון','תמוז','אב','אלול','תשרי',
                            'חשון','כסלו','טבת','שבט','אדר','אדר א׳','אדר ב׳')))
ALIASES = {'ניסן':'Nisan','ניסן':'Nisan','ניסן':'Nisan','אייר':'Iyyar','איר':'Iyyar',
           'סיון':'Sivan','סיוון':'Sivan','תמוז':'Tamuz','אב':'Av',
           'מנחם אב':'Av','מנחם':'Av','אלול':'Elul','תשרי':'Tishrei',
           'תשרי':'Tishrei','תשריי':'Tishrei','חשון':'Cheshvan','חשוון':'Cheshvan',
           'מרחשון':'Cheshvan','מרחשוון':'Cheshvan','מר חשון':'Cheshvan',
           'מר חשוון':'Cheshvan','כסלו':'Kislev','טבת':'Tevet','שבט':'Shvat',
           'אדר':'Adar','אדר א':'Adar I','אדר ראשון':'Adar I',
           'אדר ב':'Adar II','אדר שני':'Adar II'}
DB_ALIASES = {'Nissan':'Nisan','Iyar':'Iyyar','Sivon':'Sivan','Tammuz':'Tamuz',
              'Tishray':'Tishrei','Cheshvon':'Cheshvan','Shevat':'Shvat'}
VALUES = dict(zip('אבגדהוזחטיכלמנסעפצקרשת',
                  (1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400)))
DAY_TOKENS = {**{c:i for i,c in enumerate('אבגדהוזחט',1)},
              'י':10,'יא':11,'יב':12,'יג':13,'יד':14,'טו':15,'טז':16,
              'יז':17,'טוב':17,'חי':18,'יח':18,'יט':19,'כ':20,'כא':21,
              'כב':22,'כג':23,'כד':24,'כה':25,'כו':26,'כז':27,'כח':28,
              'כט':29,'ל':30}
MONTH_PATTERN = '|'.join(sorted(map(re.escape, ALIASES), key=len, reverse=True))
# Prefix and suffix boundaries prevent ניסן (a person's name), באדרבא etc.
DATE_RE = re.compile(r'(?<![א-ת0-9])(?P<day>[א-ת][א-ת\"\']{0,4}|[0-9]{1,2})'
                     r'\s+(?:(?:ל|ב)?ח[וו]?דש\s+)?(?:ב)?(?P<month>' + MONTH_PATTERN + r')'
                     r'(?:[\"\'])?(?![א-ת])')
YEAR_RE = re.compile(r'(?<![א-ת])(?:ה[\"\']?\s*)?(ת[א-ת\"\']{1,7})(?![א-ת])')
UNCERTAIN = re.compile(r'בערך|בקירוב|מסופק|ספק|לא יאוחר|באחת|מקור אחר|לפי לוח|או |[–—]|[א-ת\"][\-][א-ת]')
HEADER_RE = re.compile(r'^(?:\([^)]{1,8}\)\s*)?(?:בעזרת|ברוך\s*השם|ב[\"\']ה|יום\s|אור\s|היום\s|אשמרת|אשמורת|מוצאי\s|מוצש|ערב\s|עשרה\s)')
SMALL_HEADING_RE = re.compile(r'^(?:מכתב\s*)?[א-ת\"\']{1,7}$')
ROUTES = {
 'alim-litrufa': 'src/pages/reader/alim-litrufa/[part]/[torah].astro',
 'michtevay-shmuel': 'src/pages/reader/michtevay-shmuel/[part]/[torah].astro',
 'chayey-moharan': 'src/pages/reader/chayey-moharan/[part]/[torah].astro',
 'geedoolay-hanachal': 'src/pages/reader/geedoolay-hanachal/[part]/[torah].astro',
 'yemei-moharnat': 'src/pages/reader/yemei-moharnat/[part]/[torah].astro',
 'chayey-moharan-hosafos': 'src/pages/reader/chayey-moharan-hosafos/[part]/[torah].astro',
 'yimay-shmuel': 'src/pages/reader/yimay-shmuel/[part]/[torah].astro',
 'yemei-hatlaos': 'src/pages/reader/yemei-hatlaos/[part]/[torah].astro',
}
LABELS = {
 'alim-litrufa': ('Alim Litrufa','עלים לתרופה'),
 'michtevay-shmuel': ('Michtevay Shmuel','מכתבי שמואל'),
 'chayey-moharan': ('Chayay Moharan','חיי מוהר״ן'),
 'geedoolay-hanachal': ('Geedoolay HaNachal','גידולי הנחל'),
 'yemei-moharnat': ('Yemay Moharnat','ימי מוהרנ״ת'),
 'chayey-moharan-hosafos': ('Chayay Moharan — Hosafos','חיי מוהר״ן — הוספות'),
 'yimay-shmuel': ('Yimay Shmuel','ימי שמואל'),
 'yemei-hatlaos': ('Yemay HaTlaos','ימי התלאות'),
}


def normalize(s):
    s = unicodedata.normalize('NFD', s)
    return re.sub(r'\s+', ' ', ''.join(c for c in s if not unicodedata.combining(c)
                  and c not in '\u200e\u200f\u2066\u2067\u2068\u2069\ufeff')
                  .replace('״','"').replace('׳',"'").replace('־',' ')).strip()


def hebrew_number(s):
    s = re.sub(r'[\"\'\s]', '', normalize(s))
    if s.isdigit():
        return int(s)
    if not s or any(c not in VALUES for c in s):
        raise ValueError('not a Hebrew numeral')
    return sum(VALUES[c] for c in s)


def leap(year):
    return (7 * year + 1) % 19 < 7


def new_year(year):
    """Arithmetic Hebrew calendar postponements, only for date validation.

    No Gregorian conversion or civil dates are emitted by this builder.
    """
    months = (235 * year - 234) // 19
    parts = 12084 + 13753 * months
    day = months * 29 + parts // 25920
    if (3 * (day + 1)) % 7 < 3:
        day += 1
    return day


def year_start(year):
    prev, now, nxt = new_year(year - 1), new_year(year), new_year(year + 1)
    return now + (2 if nxt-now == 356 else 1 if now-prev == 382 else 0)


def invalid_date(month, day, year):
    if month not in MONTHS or not isinstance(day,int) or isinstance(day,bool) or not 1 <= day <= 30:
        return 'invalid month/day'
    if year is not None and (not isinstance(year,int) or isinstance(year,bool) or not 5000 <= year <= 6000):
        return 'year outside admitted historical Hebrew range'
    if month in ('Iyyar','Tamuz','Elul','Tevet','Adar II') and day == 30:
        return 'day 30 in a 29-day month'
    if year:
        if month in ('Adar I','Adar II') and not leap(year):
            return 'named leap Adar in a common year'
        if month == 'Adar' and leap(year):
            return 'unspecified Adar in a leap year'
        if month == 'Adar' and day == 30:
            return 'day 30 of ordinary Adar'
        length = year_start(year+1)-year_start(year)
        if month == 'Cheshvan' and day == 30 and length % 10 != 5:
            return 'day 30 Cheshvan absent in source year'
        if month == 'Kislev' and day == 30 and length % 10 == 3:
            return 'day 30 Kislev absent in source year'
    return None


def parse_year(text):
    years = set()
    for m in YEAR_RE.finditer(normalize(text)):
        token = m.group(1)
        # A year must have numerical punctuation (or be precisely ת"ר).
        if '"' not in token and "'" not in token:
            continue
        n = hebrew_number(token)
        if 500 <= n < 1000:
            years.add(5000+n)
    return next(iter(years)) if len(years) == 1 else None


def explicit_dates(text):
    """Return source-written day/month pairs; never solve weekdays/parshas.

    A weekday immediately preceding a month is not a day of that month.
    Rosh Chodesh without a numerical day is intentionally not inferred.
    """
    h = normalize(text)
    found = []
    for m in DATE_RE.finditer(h):
        token = m.group('day').replace('"','').replace("'",'')
        day = int(token) if token.isdigit() else DAY_TOKENS.get(token)
        if day is None:
            continue
        prefix = h[:m.start()]
        if day <= 7 and re.search(r'(?<![א-ת])(?:יום|ביום)\s*$', prefix):
            continue
        month = ALIASES[m.group('month')]
        found.append((month,day,m.start(),m.end()))
    # Two unambiguous literal written-out dates used in opening headers.
    for words, month, day in [('עשרה בטבת','Tevet',10),('שבעה עשר בתמוז','Tamuz',17),
                              ('חמשה עשר בשבט','Shvat',15),('חמישה עשר בשבט','Shvat',15)]:
        for m in re.finditer(r'(?<![א-ת])'+words+r'(?![א-ת])',h):
            found.append((month,day,m.start(),m.end()))
    return sorted(set(found),key=lambda x:x[2])


def parse_dateline(text):
    h = normalize(text)
    if UNCERTAIN.search(h):
        return None, 'uncertain/ranged/conflicting dateline'
    dates = explicit_dates(h)
    pairs = {(m,d) for m,d,_,_ in dates}
    if len(pairs) != 1:
        return None, 'multiple explicit dates' if pairs else 'no explicit unambiguous day/month'
    month,day = next(iter(pairs))
    year = parse_year(h)
    # Multiple written years must not be collapsed to an unknown-year event.
    year_tokens = [m for m in YEAR_RE.finditer(h)
                   if ('"' in m.group(1) or "'" in m.group(1))
                   and 500 <= hebrew_number(m.group(1)) < 1000]
    if len({hebrew_number(m.group(1)) for m in year_tokens}) > 1:
        return None, 'multiple years'
    bad = invalid_date(month,day,year)
    if bad:
        return None,bad
    bracketed = any(('[' in h[:start] and h[:start].rfind('[')>h[:start].rfind(']')) or
                    (re.search(r'\][^\[]*$',h[:start]) and '[' in h[end:])
                    for _,_,start,end in dates)
    return {'month':month,'day':day,'year':year,'bracketed':bracketed},None


def bilingual(en,he):
    return {'en':en,'he':he}


def digest(b):
    return hashlib.sha256(b).hexdigest()


def identity_matches(binding, source_name, row, date):
    """Reviewed explicit names and date, never identity inferred from date alone."""
    return bool(binding and normalize(source_name)==normalize(binding['sourceName'])
                and row.get('hebrew_name')==binding['databaseName']
                and row.get('name')==binding['englishName']
                and list(date)==binding['date'])


class Builder:
    def __init__(self, source_root, route_root=ROOT):
        self.root = Path(source_root)
        self.reviewed = json.loads((Path(route_root)/'src/data/today-breslov-reviewed.json').read_text())
        self.route_root = Path(route_root)
        self.events = {}
        self.exclusions = []
        self.files = {}
        self.route_contracts = {}
        self.scanned = Counter()
        self.db_covered = set()
        self.letter_fingerprints = {}
        self.letter_duplicates = 0
        self.geed = None
        self.db = None
        self.db_rel = 'public/data/tzaddikim-database-complete.json'

    def read(self, rel):
        raw = (self.root/rel).read_bytes()
        self.files[rel] = {'sha256':digest(raw),'bytes':len(raw)}
        return json.loads(raw)

    def hold(self, source, owner, reason, evidence=None):
        row = {'source':source,'owner':owner,'reason':reason}
        if evidence:
            row['evidence'] = normalize(evidence)[:110]
        self.exclusions.append(row)

    def contract(self, book):
        if book not in self.route_contracts:
            rel = ROUTES[book]
            raw = (self.route_root/rel).read_bytes()
            text = raw.decode()
            # An absent Alim anchor is significant; do not fabricate #seg-N.
            anchored = 'id={`seg-${seg.index}`}' in text
            expected = 'letter-${torahNum}.json' if book in ('alim-litrufa','michtevay-shmuel') else (
                '${fileName}' if book == 'chayey-moharan' else 'section-${torahNum}.json')
            if expected not in text or 'torahData.segments' not in text:
                raise ValueError(f'Unrecognized source/route contract: {rel}')
            self.route_contracts[book] = {'file':rel,'sha256':digest(raw),
                                         'fragment':'seg-${segment.index}' if anchored else None,
                                         'indexBasis':'Original segments[].index, never array position or aligned_segments'}
        return self.route_contracts[book]

    def source(self, rel, segment, rule, part=1, number=1, quote=None):
        book = rel.split('/')[2]
        contract = self.contract(book)
        index = segment['index']
        if not isinstance(index,int):
            raise ValueError(f'Noninteger Original index: {rel}')
        url = f'/reader/{book}/{part}/{number}/'
        if contract['fragment']:
            url += f'#seg-{index}'
        en,he = LABELS[book]
        return {'url':url,'label':bilingual(f'{en} · {part}/{number} · paragraph {index}',
                                          f'{he} · {part}/{number} · פסקה {index}'),
                'quoteHe':segment['he'] if quote is None else quote,
                'provenance':{'file':rel,'sha256':self.files[rel]['sha256'],
                              'segmentIndex':index,'field':'he','rule':rule,
                              'routeFile':contract['file'],'routeSha256':contract['sha256'],
                              'fragmentVerified':bool(contract['fragment']),
                              'rawUrl':'/'+rel.removeprefix('public/')}}

    def add(self, event):
        bad = invalid_date(event['month'],event['day'],event['year'])
        if bad:
            raise ValueError(f"Bad admitted date {event['id']}: {bad}")
        if event['id'] in self.events:
            old = self.events[event['id']]
            if (old['month'],old['day'],old['year'],old['kind']) != (
                    event['month'],event['day'],event['year'],event['kind']):
                raise ValueError('Conflicting dedupe key '+event['id'])
            for source in event['sources']:
                if source not in old['sources']:
                    old['sources'].append(source)
            return old
        self.events[event['id']] = event
        return event

    def letter_headers(self, book):
        paths = sorted((self.root/'public/reader'/book).glob('part-*/letter-*.json'),
                       key=lambda p:(int(p.parent.name.split('-')[1]),int(p.stem.split('-')[1])))
        if not paths:
            raise ValueError('Missing complete letter scope: '+book)
        for path in paths:
            rel = path.relative_to(self.root).as_posix()
            data = self.read(rel)
            self.scanned[book] += 1
            part,number = int(path.parent.name.split('-')[1]),int(path.stem.split('-')[1])
            segments = data.get('segments',[])
            # Alim sometimes has an attribution or numeral before its dateline.
            # Only an opening *standalone dateline* can qualify, never body dates.
            limit = 4 if book == 'alim-litrufa' else 1
            headers = []
            opening = True
            for position,seg in enumerate(segments):
                # Physical, numbered letter boundaries survive some importers
                # inside merged JSON files. Never search later narrative lines.
                lines = [line.strip() for line in seg.get('he','').splitlines() if line.strip()]
                numbered = bool(lines and SMALL_HEADING_RE.fullmatch(normalize(lines[0])))
                while lines and SMALL_HEADING_RE.fullmatch(normalize(lines[0])):
                    lines.pop(0)
                line = lines[0] if lines else ''
                h = normalize(line)
                eligible = (opening and position < limit) or (book == 'michtevay-shmuel' and numbered)
                first_token = h.lstrip('[]').split()[0] if h else ''
                numerical_start = bool(explicit_dates(h) and
                    re.sub(r'[^א-ת0-9]', '', first_token) in set(DAY_TOKENS) | set(map(str,range(1,31))))
                if eligible and len(h) <= 320 and (HEADER_RE.match(h) or numerical_start or h.startswith('נתעכב עד')):
                    value,reason = parse_dateline(line)
                    if value:
                        headers.append((seg,line,value,position))
                    else:
                        self.hold(rel,seg['index'],'opening dateline: '+str(reason),line)
                    opening = False
                elif h and not (numbered or h.startswith(('העתקה','זה האגרת','נמצא אצל','העתק מכתבים','מכתב מוהרנ','('))):
                    opening = False
            if not headers:
                self.hold(rel,'opening','no standalone exact opening dateline',segments[0].get('he','') if segments else '')
                continue
            for seg,line,date,position in headers:
                self.add_letter(book,rel,part,number,segments,seg,line,date,position)

    def add_letter(self,book,rel,part,number,segments,seg,line,date,position):
            en,he = LABELS[book]
            senders={1:('Rabbi Nachman','רבי נחמן'),2:('Reb Noson','רבי נתן'),
                     4:('Rabbi Yitzchak, son of Reb Noson','רבי יצחק בן רבי נתן'),
                     5:('Rabbi Nachman of Tulchin','רבי נחמן מטולטשין'),6:('Rabbi Naftali','רבי נפתלי')}
            sender_en,sender_he = ('Rabbi Shmuel Horowitz','רבי שמואל הורוויץ') if book=='michtevay-shmuel' else senders.get(part,('the Breslov correspondents','אנשי ברסלב'))
            location_en=location_he=''
            for token,city_en,city_he in [('ירושלים','Jerusalem','ירושלים'),('מירון','Meron','מירון'),
                    ('אומאן','Uman','אומאן'),('אומין','Uman','אומאן'),('צפת','Safed','צפת'),
                    ('ברסלב','Breslov','ברסלב'),('לובלין','Lublin','לובלין'),('זאסלב','Zaslav','זאסלב')]:
                if token in normalize(line):
                    location_en=' in '+city_en;location_he=' ב'+city_he
                    break
            event = {'id':f'{book}-letter-{part}-{number}-p{seg["index"]}',
                     **{k:date[k] for k in ('month','day','year')},'kind':'letter',
                     'title':bilingual(f'{en} — letter {part}/{number}',f'{he} — מכתב {part}/{number}'),
                     'description':bilingual(
                         f'{sender_en} wrote this letter{location_en}, dated {date["day"]} {date["month"]}' +
                         (f' {date["year"]}.' if date['year'] else '; the header does not specify a year.'),
                         f'{sender_he} כתב מכתב זה{location_he}; בכותרתו נרשם {date["day"]} ב{MONTH_HE[date["month"]]}' +
                         (f' בשנת {date["year"]}.' if date['year'] else '; השנה אינה מפורשת בכותרת.')),
                     'sources':[self.source(rel,seg,'standalone-opening-letter-dateline',part,number,quote=line)],
                     'provenance':{'summary':'New bilingual editorial metadata based only on the Hebrew dateline; existing English ignored.'}}
            notes=[]
            if date['bracketed']:
                notes.append(bilingual('The day/month is supplied in square brackets in the registered Hebrew dateline; not independently reconstructed here.',
                                       'היום והחודש ניתנו בסוגריים מרובעים בכותרת העברית הרשומה; לא שוחזרו כאן באופן עצמאי.'))
            if date['month']=='Adar' and date['year'] is None:
                notes.append(bilingual('The source says Adar without specifying ordinary/first/second Adar; no leap-year assignment is inferred.',
                                       'המקור מציין אדר ללא פירוט; לא הושלמה קביעה לאדר א׳ או לאדר ב׳.'))
            if not self.contract(book)['fragment']:
                notes.append(bilingual('The existing Reader route has no paragraph IDs; this link opens the letter. Exact paragraph identity is retained in source provenance.',
                                       'בנתיב הקורא הקיים אין מזהי פסקאות; הקישור פותח את המכתב. מזהה הפסקה המדויק נשמר בנתוני המקור.'))
            if notes:
                event['dateNote']=bilingual(' '.join(n['en'] for n in notes),' '.join(n['he'] for n in notes))
            # Collapse only an identical dateline plus a substantial identical
            # Hebrew body opening, never just a shared day or recipient. This
            # handles duplicate/merged imports without treating them as events.
            tail = seg['he'][seg['he'].find(line)+len(line):] + ' ' + ' '.join(
                s.get('he','') for s in segments[position+1:])
            body_prefix = re.sub(r'[^א-ת0-9]', '', normalize(tail))[:800]
            fingerprint = (book,date['month'],date['day'],date['year'],body_prefix)
            event['provenance']['dedupeBodyPrefixSha256'] = digest(body_prefix.encode())
            if len(body_prefix)>=300 and fingerprint in self.letter_fingerprints:
                event['id'] = self.letter_fingerprints[fingerprint]
                self.letter_duplicates += 1
            elif len(body_prefix)>=300:
                self.letter_fingerprints[fingerprint] = event['id']
            self.add(event)

    def load_db(self):
        if self.db is None:
            self.db=self.read(self.db_rel)['all_tzaddikim']
        return self.db

    def db_date(self,row):
        month=DB_ALIASES.get(row.get('yahrzeit_month'),row.get('yahrzeit_month'))
        try:
            day=int(row.get('yahrzeit_day',''))
        except (ValueError,TypeError):
            return None
        if month=='Adar' and row.get('is_adar_ii'):
            month='Adar II'
        text=str(row.get('year_passed','')).strip()
        matches=re.findall(r'(?<!\d)(5\d{3})(?!\d)',text)
        year=int(matches[0]) if len(matches)==1 else None
        if invalid_date(month,day,year):
            return None
        return month,day,year

    def geedoolay_register(self):
        rel='public/reader/geedoolay-hanachal/section-1.json'
        self.geed=self.read(rel)
        by={s['index']:s for s in self.geed['segments']}
        self.scanned['geedoolay-hanachal']=len(by)
        if by[1389]['he']!='ימי יארצייט ידועים לפי סדר השנה' or by[1531]['he']!='מרשם פטירה וקבורה — לנשואי הערכים':
            raise ValueError('Geedoolay structured table boundaries drifted')
        # Genuine conflicts appear in the same book's separate death register.
        conflicts={1464:'Adar I / Adar II conflict: Original death-register paragraph 1710',
                   1472:'12 / 13 Adar II conflict: Original death-register paragraph 1590',
                   1488:'Existing DB also registers this person in 5625, while both Geedoolay tables say 5644; reconcile before admission'}
        for n in range(1395,1531,4):
            month_text,date_text,name=by[n]['he'],by[n+1]['he'],by[n+2]['he']
            if n+1 in conflicts:
                self.hold(rel,n+1,conflicts[n+1],date_text);continue
            month_norm=normalize(month_text).replace(' (דפשוטה)','')
            month=ALIASES.get(month_norm)
            # Holidays with an exact source-owned numeric equivalent can qualify.
            special=n+1==1484 # explicitly the seventh day of Pesach = 21 Nisan
            dt=normalize(date_text)
            if special:
                value={'month':'Nisan','day':21,'year':parse_year(dt)};reason=None
            elif month and re.match(r'^[א-ת\"\']{1,5}\s+ת',dt):
                token=dt.split()[0].replace('"','').replace("'",'')
                day=DAY_TOKENS.get(token)
                value={'month':month,'day':day,'year':parse_year(dt)}
                reason=invalid_date(month,day,value['year'])
            else:
                value=None;reason='no exact numerical date in structured row'
            if UNCERTAIN.search(dt):
                value=None;reason='uncertain/ranged year or conflicting date (not completed to an event)'
            if not value or reason:
                self.hold(rel,n+1,reason or 'unresolved structured date',date_text);continue
            key=(value['month'],value['day'],value['year'])
            matches=[(i,r) for i,r in enumerate(self.load_db()) if r.get('category')=='breslov' and self.db_date(r)==key]
            if len(matches)!=1:
                self.hold(rel,n+1,'bilingual identity join is not unique',date_text+' '+name);continue
            i,row=matches[0]
            if not identity_matches(self.reviewed['identityBindings'].get(str(n+2)),name,row,key):
                raise ValueError(f'Reviewed yahrzeit identity mismatch at source paragraph {n+2}')
            self.db_covered.add(i)
            event={'id':f'breslov-yahrzeit-geedoolay-{n+2}',**value,'kind':'yahrzeit',
                   'title':bilingual('Yahrzeit — '+row['name'],'יום פטירה — '+name),
                   'description':bilingual(f'The registered yahrzeit of {row["name"]}.',f'יום הפטירה הרשום של {name}.'),
                   'sources':[self.source(rel,by[n+1],'structured-yahrzeit-date'),
                              self.source(rel,by[n+2],'structured-yahrzeit-person'),
                              self.source(rel,by[n],'structured-yahrzeit-month')],
                   'provenance':{'summary':'New editorial summary; English person label only is joined to the existing structured database by unique month/day/Hebrew-year.',
                                 'databaseFile':self.db_rel,'databaseRow':i,'databaseSha256':self.files[self.db_rel]['sha256']}}
            if special:
                event['dateNote']=bilingual('The source writes “seventh day of Pesach”; this fixed festival date is 21 Nisan. No civil date is inferred.',
                                            'המקור מציין שביעי של פסח, שהוא כ״א בניסן. לא הושלם תאריך אזרחי.')
            self.add(event)
        # The separate register contains one additional exact yahrzeit missing
        # from the summary. Its original name is explicitly translated here.
        self.curated_one(rel,1938,'yahrzeit','Tzvi Pesach Weisslav of Tulchin',
                         'ר׳ צבי פסח ווייסלאב מטולטשין',
                         'The death register records the passing of Tzvi Pesach Weisslav of Tulchin.',
                         'מרשם הפטירה מציין את פטירת ר׳ צבי פסח ווייסלאב מטולטשין.',
                         'Nisan',13,5670,extra_indices=[1937])

    def curated_one(self,rel,index,kind,title_en,title_he,desc_en,desc_he,month,day,year,
                    number=1,part=1,extra_indices=None,date_note=None,event_id=None,quote_contains=None):
        data=self.read(rel)
        by={s['index']:s for s in data['segments']}
        seg=by[index]
        if quote_contains and quote_contains not in normalize(seg['he']):
            raise ValueError(f'Reviewed evidence drift {rel}#{index}')
        sources=[self.source(rel,seg,'reviewed-explicit-dated-passage',part,number)]
        for i in extra_indices or []:
            sources.append(self.source(rel,by[i],'reviewed-context-or-identity',part,number))
        event={'id':event_id or f'{data["book"]}-{kind}-{number}-{index}',
               'month':month,'day':day,'year':year,'kind':kind,
               'title':bilingual(title_en,title_he),'description':bilingual(desc_en,desc_he),
               'sources':sources,'provenance':{'summary':'New brief bilingual editorial summary, individually reviewed against the quoted Hebrew; not a supplied manuscript translation.'}}
        if date_note:
            event['dateNote']=bilingual(*date_note)
        return self.add(event)

    def curated_passages(self):
        rel='public/reader/chayey-moharan/chapter-1.json'
        self.curated_one(rel,223,'teaching','Likutay Moharan 49 was taught','אמירת ליקוטי מוהר״ן מט',
            'Rabbi Nachman taught “LaShemesh” (Likutay Moharan 49) on Shabbos, after the wedding of his daughter Sarah.',
            'רבי נחמן אמר בשבת את מאמר ״לשמש״, ליקוטי מוהר״ן מט, לאחר נישואי בתו שרה.',
            'Nisan',3,5563,quote_contains='בשבת ג\' ניסן תקס"ג')
        self.curated_one(rel,275,'teaching','The Seven Beggars story began','תחילת סיפור שבעת הקבצנים',
            'The telling of the thirteenth story, the Seven Beggars, began on Friday night.',
            'תחילת סיפור מעשה יג, שבעת הקבצנים, היתה בליל שבת קודש.',
            'Adar II',25,5570,quote_contains='כ"ה אדר שני תק"ע')
        rel='public/reader/chayey-moharan/chapter-9.json'
        self.curated_one(rel,79,'teaching','Rabbi Nachman spoke about his journeys','רבי נחמן שוחח על מסעותיו',
            'At the Friday-night table, Rabbi Nachman spoke about his moves from place to place and his choice of lodging in Uman.',
            'בליל שבת שוחח רבי נחמן על נדודיו ממקום למקום ועל בחירת אכסנייתו באומאן.',
            'Tamuz',12,5570,number=9,quote_contains='י"ב תמוז תק"ע')
        self.curated_one(rel,156,'teaching','A conversation about the Baal Shem Tov and the Ari','שיחה על הבעל שם טוב והאר״י',
            'Rabbi Nachman spoke with Reb Noson about the new revelations of the Baal Shem Tov and the writings of the Ari.',
            'רבי נחמן שוחח עם רבי נתן על החידושים שגילה הבעל שם טוב ועל כתבי האר״י.',
            'Nisan',25,5570,number=9,quote_contains='כ"ה ניסן תק"ע')
        # Same yahrzeit as the structured register: add a source, not a second event.
        event=next(e for e in self.events.values() if e['kind']=='yahrzeit' and
                   (e['month'],e['day'],e['year'])==('Tishrei',18,5571))
        data=self.read(rel); seg=next(s for s in data['segments'] if s['index']==66)
        if 'ח"י תשרי' not in seg['he'] or 'תקע"א' not in seg['he']:
            raise ValueError('Passing evidence drift')
        event['sources'].append(self.source(rel,seg,'reviewed-corroborating-passing-date',1,9))
        # Exact birth day is supplied numerically in the structured timeline.
        rel='public/reader/geedoolay-hanachal/section-1.json'
        self.curated_one(rel,30,'history','Birth of Rabbi Nachman','לידת רבי נחמן',
            'The central timeline records Rabbi Nachman’s birth in Medzhybizh on Rosh Chodesh Nisan, in 5532.',
            'ציר הזמן המרכזי מציין את לידת רבי נחמן במעזיבוז בראש חודש ניסן בשנת תקל״ב.',
            'Nisan',1,5532,extra_indices=[29],quote_contains='ר"ח ניסן',
            date_note=('Rosh Chodesh Nisan is the single day 1 Nisan. The year comes from the immediately preceding structured year cell.',
                       'ראש חודש ניסן הוא א׳ בניסן. השנה נלקחה מתא השנה המובנה הסמוך שלפני האירוע.'))
        # Hebrew birth statement explicitly identifies the day; no inferred year.
        self.curated_one(rel,2018,'history','Birth of Reb Noson','לידת רבי נתן',
            'The chronology records Reb Noson’s birth in Nemirov on 15 Shvat 5540.',
            'הכרונולוגיה מציינת את לידת רבי נתן בנעמירוב בט״ו בשבט תק״מ.',
            'Shvat',15,5540,quote_contains='בט"ו בשבט דשנת תק"מ')
        self.curated_one(rel,482,'history','Rabbi Nachman left Breslov for Uman','יציאת רבי נחמן מברסלב לאומאן',
            'After the great fire in Breslov, Rabbi Nachman stayed at the home of Reb Zelig and departed from there for Uman.',
            'לאחר השריפה הגדולה בברסלב ישב רבי נחמן בבית ר׳ זליג ומשם נסע לאומאן.',
            'Iyyar',2,5570,quote_contains='בב\' אייר תק"ע')
        rel='public/reader/chayey-moharan-hosafos/section-1.json'
        self.curated_one(rel,20,'history','Rabbi Nachman related an unusual dream','רבי נחמן סיפר על חלום משונה',
            'The supplement records Rabbi Nachman speaking in Breslov on the night of 14 Shvat about an unusual dream.',
            'בהוספות נרשם כי באור לי״ד בשבט תק״ע בברסלב סיפר רבי נחמן על חלום משונה.',
            'Shvat',14,5570,quote_contains='י"ד שבט תק"ע')
        # Individually read exact dated diary occurrences. No year is borrowed
        # from a nearby chapter: if not explicit in this owner, keep null.
        self.curated_one('public/reader/yemei-moharnat/section-103.json',1,'history',
            'The room containing Reb Noson’s press was reopened','פתיחת הבית שבו עמד דפוס רבי נתן',
            'Reb Noson records that the room containing his printing press was reopened after more than a year and a half; the press itself remained sealed.',
            'רבי נתן מציין כי הבית שבו עמד הדפוס נפתח לאחר יותר משנה ומחצה; הדפוס עצמו עדיין היה חתום.',
            'Tishrei',24,5586,number=103,quote_contains='כ"ד תשרי')
        self.curated_one('public/reader/yemei-moharnat/section-133.json',1,'history',
            'Reb Noson set out from home toward Uman','יציאת רבי נתן מביתו בדרך לאומאן',
            'Reb Noson records setting out from home toward Uman despite difficult roads and a snowstorm.',
            'רבי נתן מציין שיצא מביתו בדרך לאומאן למרות קלקול הדרך ורוח סערה עם שלג.',
            'Tevet',24,5582,number=133,quote_contains='כ"ד טבת תקפ"ב')
        self.curated_one('public/reader/yemei-moharnat/section-192.json',1,'history',
            'Boarding the ship to Istanbul','עלייה לספינה לסטנבול',
            'Reb Noson records boarding the ship to Istanbul on Friday afternoon, 28 Nisan 5582.',
            'רבי נתן מציין שעלה לספינה לסטנבול ביום שישי אחר הצהריים, כ״ח בניסן תקפ״ב.',
            'Nisan',28,5582,number=192,quote_contains='כ"ח ניסן')
        self.curated_one('public/reader/yemei-moharnat/section-247.json',1,'history',
            'Reb Noson arrived in Safed','בוא רבי נתן לצפת',
            'Reb Noson records arriving in Safed on Thursday, 24 Sivan, shortly before midday.',
            'רבי נתן מציין שבא לצפת ביום חמישי כ״ד בסיון, סמוך לחצות היום מלפניו.',
            'Sivan',24,None,number=247,quote_contains='כ"ד סיון',
            date_note=('This paragraph does not explicitly state the year; none is supplied from the surrounding travel chronology.',
                       'בפסקה זו השנה אינה מפורשת; לא הושלמה שנה מתוך רצף המסע שמסביב.'))
        self.curated_one('public/reader/yemei-moharnat/section-226.json',3,'history',
            'Arrival in Alexandria','בוא לאלכסנדריה',
            'Reb Noson records arriving safely in Alexandria on Thursday, 3 Sivan.',
            'רבי נתן מציין שבא בשלום לאלכסנדריה של מצרים ביום חמישי ג׳ בסיון.',
            'Sivan',3,None,number=226,quote_contains="ג' סיון")
        self.curated_one('public/reader/yimay-shmuel/section-21.json',1,'history',
            'Rabbi Shmuel Horowitz’s birthday','יום הולדת רבי שמואל הורוויץ',
            'Rabbi Shmuel identifies 16 Shvat as his birthday while describing his wish to spend that day in Meron.',
            'רבי שמואל מציין שט״ז בשבט הוא יום הולדתו ומתאר את רצונו להיות ביום זה במירון.',
            'Shvat',16,None,number=21,quote_contains='בט"ז בשבט')

    def database_events(self):
        """Use registered structured dates, not the DB's sometimes-wrong notes.

        Civil-only death years stay null. Cutoff is checked using the stated
        civil year; AM years <5740 are unambiguously before 1980. AM 5740-5741
        need a civil date or approval, not an approximate subtraction.
        """
        for i,row in enumerate(self.load_db()):
            if row.get('category')!='breslov':
                continue
            self.scanned['breslov-database-rows']+=1
            if i in self.db_covered:
                continue
            name=row.get('hebrew_name','')
            if i in (126,180,203,207):
                self.hold(self.db_rel,i,'conflicting identity/date/year with Geedoolay register; held, not silently resolved',name);continue
            date=self.db_date(row)
            if date is None:
                self.hold(self.db_rel,i,'missing or invalid exact structured date',name);continue
            month,day,year=date
            text=str(row.get('year_passed','')).strip()
            civil=int(text) if re.fullmatch(r'1[0-9]{3}|20[0-9]{2}',text) else None
            approval=(row.get('approved') is True or bool(re.match(r'^(?:User|Owner)-approved\b', row.get('source',''))))
            if not approval and not ((civil is not None and civil<=1980) or (year is not None and year<5740)):
                self.hold(self.db_rel,i,'post-1980 or unknown cutoff eligibility; no explicit approval found',name);continue
            # Same person/date already covered by the source-bound table under
            # a legacy alias (e.g. Reb Noson has a duplicate civil-year row).
            if i==124 and any(e['kind']=='yahrzeit' and (e['month'],e['day'])==('Tevet',10) for e in self.events.values()):
                self.db_covered.add(i);continue
            # Existing uncertain table owners must not be reintroduced via DB.
            if i==106:
                self.hold(self.db_rel,i,'Avraham Chazan identity/notes and source authority unresolved; not joined to Avraham son of Nachman by fuzzy name',name);continue
            raw=json.dumps(row,ensure_ascii=False,sort_keys=True,separators=(',',':'))
            event={'id':f'breslov-yahrzeit-db-{i}', 'month':month,'day':day,'year':year,'kind':'yahrzeit',
                   'title':bilingual('Yahrzeit — '+row['name'],'יום פטירה — '+name),
                   'description':bilingual(f'The existing Breslov yahrzeit database registers {row["name"]} on this Hebrew day and month.',
                                           f'במאגר ימי הפטירה הקיים רשום {name} ביום ובחודש עבריים אלו.'),
                   'sources':[{'url':'/data/tzaddikim-database-complete.json',
                               'label':bilingual('Existing Breslov yahrzeit database','מאגר ימי הפטירה הקיים — ברסלב'),
                               'quoteHe':name,
                               'provenance':{'file':self.db_rel,'sha256':self.files[self.db_rel]['sha256'],
                                             'jsonPointer':f'/all_tzaddikim/{i}','rowSha256':digest(raw.encode()),
                                             'rule':'structured-breslov-yahrzeit-row','fragmentVerified':False}}],
                   'provenance':{'summary':'Registry attestation only; notes and historical identity assertions not adopted.',
                                 'registeredYearText':text,'cutoffApproval':approval}}
            if year is None:
                event['dateNote']=bilingual('Only a civil death year is registered; no Hebrew year is inferred from it.',
                                            'במאגר נרשמה שנת פטירה אזרחית בלבד; לא הוסקה ממנה שנה עברית.')
            self.add(event)

    def widget_registry(self):
        """Read the existing literal registry without executing JavaScript.

        Only these individually reviewed literal rows add events. The other
        Breslov-only rows are audited as aliases, conflicts or cutoff holds.
        """
        rel='src/components/CompactYahrzeit.astro'
        raw=(self.route_root/rel).read_bytes()
        self.files[rel]={'sha256':digest(raw),'bytes':len(raw)}
        lines=raw.decode().splitlines()
        selections=[
            ('Chag HaPetek','Tamuz',23,None,'history',
             'Chag HaPetek','חג הפתק',
             'The existing calendar marks the day on which Saba Yisroel Dov Odesser received the Petek. The registry does not specify a year.',
             'בלוח הקיים צוין יום קבלת הפתק בידי סבא ישראל דב אודסר. ברשומה זו לא צוינה שנה.'),
            ('Ephraim Tzvi Krakovsky','Tevet',16,None,'yahrzeit',
             'Yahrzeit — Rabbi Ephraim Tzvi Krakovsky','יום פטירה — ר׳ אפרים צבי קרקובסקי',
             'The existing Breslov calendar registers Rabbi Ephraim Tzvi Krakovsky on this day; it gives the civil death year 1946, not a Hebrew year.',
             'בלוח ברסלב הקיים נרשם ר׳ אפרים צבי קרקובסקי ביום זה; שנת הפטירה האזרחית שניתנה היא 1946, ללא שנה עברית.'),
            ('Shimshon Barsky','Sivan',1,None,'yahrzeit',
             'Yahrzeit — Rabbi Shimshon Barsky','יום פטירה — ר׳ שמשון ברסקי',
             'The existing Breslov calendar registers Rabbi Shimshon Barsky on this day; it gives the civil death year 1935, not a Hebrew year.',
             'בלוח ברסלב הקיים נרשם ר׳ שמשון ברסקי ביום זה; שנת הפטירה האזרחית שניתנה היא 1935, ללא שנה עברית.'),
        ]
        for token,month,day,year,kind,te,th,de,dh in selections:
            matches=[(i+1,line.strip()) for i,line in enumerate(lines)
                     if token in line and "{ month:" in line]
            if len(matches)!=1:
                raise ValueError('Widget literal identity drift: '+token)
            line_number,line=matches[0]
            if f"month: '{month}'" not in line or f'day: {day},' not in line:
                raise ValueError('Widget literal date drift: '+token)
            self.add({'id':'breslov-widget-'+re.sub(r'[^a-z0-9]+','-',token.lower()),
                'month':month,'day':day,'year':year,'kind':kind,
                'title':bilingual(te,th),'description':bilingual(de,dh),
                'sources':[{'url':'/','label':bilingual('Existing yahrzeit calendar','לוח ימי הפטירה הקיים'),
                    'quoteHe':line,'provenance':{'file':rel,'sha256':digest(raw),'line':line_number,
                    'rule':'reviewed-existing-literal-calendar-row','fragmentVerified':False}}],
                'provenance':{'summary':'Registered calendar attestation, not independent historical verification; no civil-to-Hebrew year inference.'}})
        start=next(i for i,line in enumerate(lines) if 'BRESLOV ANSHEI - from Luach Zikaron' in line)
        stop=next(i for i in range(start+1,len(lines)) if '// ===' in lines[i])
        selected={token for token,*_ in selections}
        for i in range(start+1,stop):
            line=lines[i].strip()
            if '{ month:' not in line or any(token in line for token in selected):
                continue
            if any(token in line for token in ('Ephraim ben','Yitzchak ben Moharnat','Alter of Teplik')):
                reason='widget identity/year/day conflict with structured registers; held'
            elif any(token in line for token in ('Nosson Tscherner','Tzvi Aryeh Lupel','Avraham Abutbul','Aharon Glidman','Moshe Breslover','Baruch Chavitman','Shnia Yosef','Gershon Broski','Ben Tzion Apter')):
                reason='widget yahrzeit lacks cutoff-eligible death year/explicit approval; held'
            else:
                reason='widget alias of an admitted registered yahrzeit; no additional event'
            self.hold(rel,i+1,reason,line)
        self.hold(rel,79,'Saba widget 18 Cheshvan / 1995 conflicts with DB 20 Tishrei / 1994; post-1980 and not admitted without explicit approval')

    def bind_reviewed_source(self, source):
        p=source['provenance']; rel=p['file']
        data=self.read(rel)
        matches=[s for s in data['segments'] if s['index']==p['segmentIndex']]
        if len(matches)!=1 or source['quoteHe'] not in matches[0]['he']:
            raise ValueError('Reviewed source quotation changed: '+rel)
        parts=source['url'].split('/')
        return self.source(rel,matches[0],p['rule'],int(parts[3]),int(parts[4]),source['quoteHe'])

    def reviewed_updates(self):
        """Adopt source-reviewed finite additions and corrections, preserving witnesses."""
        for row in self.reviewed['manualLetters']:
            data=self.read(row['file'])
            seg=next(s for s in data['segments'] if s['index']==row['segmentIndex'])
            if row['quoteHe'] not in seg['he']:
                raise ValueError('Reviewed letter header changed: '+row['id'])
            event={k:row[k] for k in ('id','month','day','year','kind','title','description')}
            event['sources']=[self.source(row['file'],seg,'reviewed-letter-dateline',row['part'],row['number'],row['quoteHe'])]
            event['provenance']={'summary':'Brief bilingual metadata from this exact independently reviewed letter dateline; no inferred year.',
                                 'reviewedDateRule':row['reviewedRule']}
            if row.get('dateNote'):event['dateNote']=row['dateNote']
            if not self.contract(row['file'].split('/')[2])['fragment']:
                event.setdefault('dateNote',bilingual('',''))
                for lang,extra in [('en','The existing Reader has no paragraph IDs; the link opens the letter.'),('he','בקורא הקיים אין מזהי פסקאות; הקישור פותח את המכתב.')]:
                    event['dateNote'][lang]=(event['dateNote'][lang]+' '+extra).strip()
            self.add(event)
            self.exclusions=[x for x in self.exclusions if not (x['source']==row['file'] and x['owner'] in (row['segmentIndex'],'opening'))]
        for keep in self.reviewed['merges']:
            for witness in keep['witnesses']:
                data=self.read(witness['file']); by={s['index']:s for s in data['segments']}
                texts=[by[i]['he'] for i in witness['bodyIndices']]
                if witness['quoteHe'] not in texts[0]:raise ValueError('Merged dateline changed')
                body=texts[0].split(witness['quoteHe'],1)[1]+' '.join(texts[1:])
                body=re.sub(r'[^א-ת0-9]','',normalize(body))
                if digest(body.encode())!=keep['normalizedBodySha256']:
                    raise ValueError('Complete boundary-delimited duplicate body changed')
            target=self.events[keep['keepId']]
            for event_id in keep['removeIds']:
                other=self.events.pop(event_id)
                if any(target[k]!=other[k] for k in ('month','day','year','kind')):raise ValueError('Duplicate date mismatch')
                for source in other['sources']:
                    if source not in target['sources']:target['sources'].append(source)
                self.letter_duplicates+=1
        for event_id,updates in self.reviewed['overrides'].items():
            event=self.events[event_id]
            for key,value in updates.items():
                if key=='appendDateNote':
                    event.setdefault('dateNote',bilingual('',''))
                    for lang in ('en','he'):event['dateNote'][lang]=(event['dateNote'][lang]+' '+value[lang]).strip()
                elif key in ('title','description','dateNote','month','day','year'):event[key]=value
                else:raise ValueError('Unsupported reviewed metadata operation')
        for template in self.reviewed['narrativeEvents']:
            event=json.loads(json.dumps(template))
            event['sources']=[self.bind_reviewed_source(s) for s in event['sources']]
            self.add(event)
        for group in self.reviewed['corroborations']:
            event=self.events[group['eventId']]
            for source in group['sources']:
                bound=self.bind_reviewed_source(source)
                if bound not in event['sources']:event['sources'].append(bound)
            for note in group.get('qualifications',[]):
                event.setdefault('dateNote',bilingual('',''))
                for lang in ('en','he'):event['dateNote'][lang]=(event['dateNote'][lang]+' '+note[lang]).strip()
        for event in self.events.values():
            bad=invalid_date(event['month'],event['day'],event['year'])
            if bad:raise ValueError('Reviewed event date invalid: '+event['id']+': '+bad)
            for source in event['sources']:
                if source['provenance']['rule'] in ('structured-breslov-yahrzeit-row','reviewed-existing-literal-calendar-row'):
                    source['url']='/today-in-breslov/sources/#'+event['id']
        for held in self.reviewed['heldNarratives']:
            self.hold(held['source'],held['owner'],held['reason'])

    def discover_pending(self):
        """Bounded mechanical candidate inventory, explicitly not semantic coverage.

        All Original segments in named historical scopes are visited one file
        at a time; date mentions not individually reviewed remain held.
        """
        owned={(s['provenance']['file'],s['provenance'].get('segmentIndex'))
               for e in self.events.values() for s in e['sources']}
        owned.update((row['source'],row['owner']) for row in self.reviewed.get('reviewedNarrativeOwners',[]))
        for book,pattern in [('chayey-moharan','chapter-*.json'),
                             ('chayey-moharan-hosafos','section-*.json'),
                             ('yemei-moharnat','section-*.json'),
                             ('yemei-hatlaos','section-*.json'),
                             ('yimay-shmuel','section-*.json')]:
            for path in sorted((self.root/'public/reader'/book).glob(pattern)):
                rel=path.relative_to(self.root).as_posix()
                data=self.read(rel)
                self.scanned[book+'-files']+=1
                for seg in data.get('segments',[]):
                    self.scanned[book+'-segments']+=1
                    if (rel,seg.get('index')) not in owned and explicit_dates(seg.get('he','')):
                        self.hold(rel,seg.get('index'),'mention candidate only: event/date ownership requires contextual review',seg['he'])
        self.hold('corpus-wide','coverage','No exhaustive corpus semantic coverage claimed: only the listed source scopes are scanned. Month mentions, relative dates, parsha/weekdays, multi-day festivals and unspecific Rosh Chodesh are not dates reconstructed by this builder.')

    def build(self):
        self.letter_headers('alim-litrufa')
        self.letter_headers('michtevay-shmuel')
        self.geedoolay_register()
        self.curated_passages()
        self.database_events()
        self.widget_registry()
        self.reviewed_updates()
        self.discover_pending()
        events=sorted(self.events.values(),key=lambda e:(MONTHS.index(e['month']),e['day'],e['year'] or 0,e['kind'],e['id']))
        counts=dict(sorted(Counter(e['kind'] for e in events).items()))
        coverage={
            'policy':'Explicit registered dates only. Conservative extraction is not exhaustive semantic coverage of Breslov history or the Reader corpus.',
            'includedScopes':[
              'Alim Litrufa: part-*/letter-*.json, standalone opening datelines among first four Original paragraphs only',
              'Michtevay Shmuel: part-*/letter-*.json, opening datelines and explicit numbered-letter boundaries within Original segments; duplicate imports joined by date plus 800-letter body prefix',
              'Geedoolay HaNachal: section-1 Original paragraphs 1395–1530, four-cell yahrzeit rows; additional individually reviewed dated passages',
              'Chayay Moharan: individually reviewed Original chapter-1 paragraphs 223,275; chapter-9 paragraphs 79,156,66',
              'Chayay Moharan Hosafos: section-1 Original paragraph 20',
              'Yemay Moharnat: individually reviewed section-103,133,192,247 paragraph 1 and section-226 paragraph 3',
              'Yimay Shmuel: section-21 Original paragraph 1',
              'Nine separately reviewed explicit letter datelines, including embedded units and unambiguous Rosh Chodesh headers',
              'All 53 discovered narrative date candidates contextually reviewed: 36 new events, corroborating sources and explicit non-event/conflict dispositions',
              'tzaddikim-database-complete.json: Breslov category only; cutoff and conflict holds applied',
              'CompactYahrzeit.astro: reviewed Chag HaPetek, Ephraim Tzvi Krakovsky and Shimshon Barsky literal entries; Breslov-only block aliases and holds audited'],
            'reviewedNarrativeCandidateCount':len(self.reviewed.get('reviewedNarrativeOwners',[])),
            'notIncluded':'Approximate or contradictory dates without a qualified admitted event; relative dates; year-only chronologies; post-1980 yahrzeits without explicit approval; missing day/month; no inferred years.',
            'letterDescriptionScope':'Brief bilingual dateline summaries only, not summaries or certified translations of complete letters.',
            'sourceFragments':'Only Original seg.index anchors authenticated in the actual Astro route. Alim Litrufa has none; letter URLs intentionally omit fragments.',
            'gregorianDates':'Not generated. Client is responsible for conversion of explicit Hebrew years.',
        }
        payload={'schemaVersion':1,'events':events,'countsByKind':counts,'coverage':coverage}
        report={'schemaVersion':1,'eventCount':len(events),'countsByKind':counts,
                'unknownYearCount':sum(e['year'] is None for e in events),
                'scanned':dict(sorted(self.scanned.items())), 'coverage':coverage,
                'excludedCount':len(self.exclusions),'duplicateLetterOccurrencesMerged':self.letter_duplicates,
                'excludedByReason':dict(sorted(Counter(x['reason'] for x in self.exclusions).items())),
                'exclusions':self.exclusions,
                'sourceManifest':{rel:self.files[rel] for rel in sorted({s['provenance']['file'] for e in events for s in e['sources']})},
                'discoveryManifest':{'fileCount':len(self.files),
                    'sha256':digest(json.dumps(self.files,sort_keys=True,separators=(',',':')).encode()),
                    'note':'Digest of the full bounded scan input manifest; only admitted source files are expanded above.'},
                'routeContracts':self.route_contracts,
                'deduplication':'Letter import occurrences joined only on same book/day/month/year plus a normalized 800-letter Hebrew body opening (at least 300 letters); dates alone never merge letters. Distinct source occurrences retained as sources. Legacy Reb Noson duplicate suppressed; corroborating yahrzeit passages attached to one event.',
                'cutoff':'Yahrzeits only through 1980 absent explicit recorded approval. Unknown eligibility held. Civil-only death years are never converted to Hebrew years.',
                'knownSourceIssues':[
                    'Existing Michtevay Shmuel English is not trusted or consumed.',
                    'Geedoolay civil year cells are not used as event dates; some are end-of-Hebrew-year labels rather than the civil year of the occurrence.',
                    '12/13 Adar II and Adar I/II conflicts are held across source tables.',
                    'Nachman of Tulchin DB 5625 conflicts with Geedoolay 5644; both held for reconciliation.',
                    'Alim Litrufa route supplies no Original paragraph IDs; exact paragraph retained as provenance, no fabricated fragment.'
                ]}
        return payload,report


def serialized(value):
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()


def main(argv=None):
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--source-root',type=Path,default=ROOT)
    ap.add_argument('--output',type=Path,default=ROOT/'public/data/today-breslov-events.json')
    ap.add_argument('--report',type=Path)
    ap.add_argument('--audit',type=Path)
    ap.add_argument('--check',action='store_true',help='Compare without writing any files')
    args=ap.parse_args(argv)
    data,report=Builder(args.source_root).build()
    raw=serialized(data)
    if args.check:
        if args.output.read_bytes()!=raw:
            raise SystemExit('FAIL: generated registry differs; review source drift and rebuild')
    else:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        args.output.write_bytes(raw)
        if args.report:
            # Compact JSON keeps the complete scoped exclusion manifest bounded.
            report['exclusionColumns']=['source','owner','reasonIndex','evidencePreview']
            reasons=sorted({x['reason'] for x in report['exclusions']})
            report['exclusionReasons']=reasons
            reason_ids={reason:i for i,reason in enumerate(reasons)}
            report['exclusions']=[[x['source'],x['owner'],reason_ids[x['reason']],x.get('evidence','')]
                                  for x in report['exclusions']]
            r=(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n').encode()
            if len(r)>250_000:
                raise ValueError(f'Report exceeds 250KB: {len(r)} bytes')
            args.report.parent.mkdir(parents=True,exist_ok=True)
            args.report.write_bytes(r)
        if args.audit:
            audit={k:report[k] for k in ('eventCount','countsByKind','coverage','routeContracts','cutoff','knownSourceIssues','excludedByReason')}
            audit['registrySha256']=digest(raw)
            audit['status']='Source/data checks only; no build, browser, deployment or full-corpus semantic verification.'
            args.audit.parent.mkdir(parents=True,exist_ok=True)
            args.audit.write_bytes(serialized(audit))
    print(json.dumps({'status':'PASS','events':len(data['events']),'countsByKind':data['countsByKind'],
                      'unknownYearCount':report['unknownYearCount'],'excluded':report['excludedCount'],
                      'sha256':digest(raw)},ensure_ascii=False))

if __name__=='__main__':
    main()
