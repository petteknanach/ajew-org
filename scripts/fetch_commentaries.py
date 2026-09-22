#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch classic commentaries for the Chok's daily layers (Hebrew, public
domain), via Sefaria v3 - ONE-TIME IMPORT keyed to OUR schedule's needs.
Our structure: commentary files are stored per our own layer slugs; the
commentaries themselves are ancient PD texts.

Sources:
  gemara-rashi    'Rashi on <Masechet> <daf><amud>'   per amud segments
  mishna-bartenura 'Bartenura on Mishnah <M> <perek>' per mishna list
  navi-metzudas   'Metzudat David on <Book> <ch>'     per verse list
  torah-ramban    'Ramban on <Book> <ch>'             per verse list
  torah-ibnezra   'Ibn Ezra on <Book> <ch>'           per verse list
  sa-magen-avraham 'Magen Avraham on Shulchan Aruch, Orach Chaim <siman>'

Output: public/reader/commentary/<source>/<file>.json
"""
import json, os, re, time, urllib.request, urllib.parse

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader')
SCHED = os.path.join(BASE, 'chok', 'schedule.json')
BONUS = os.path.join(BASE, 'chok', 'mishna-bonus.json')
OUT = os.path.join(BASE, 'commentary')
UA = {'User-Agent': 'ajew.org-commentaries/1.0 (ajew.org)'}

def v3(title):
    q = urllib.parse.quote(title, safe='')
    url = 'https://www.sefaria.org/api/v3/texts/%s?version=hebrew' % q
    last = None
    for attempt in range(8):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as r:
                d = json.loads(r.read().decode())
            time.sleep(1.0 + (attempt % 3) * 0.4)
            return d['versions'][0]['text']
        except Exception as e:
            msg = str(e)
            last = e
            if '404' in msg:
                return None
            time.sleep(min(90, 5 * (attempt + 1)))
    raise RuntimeError('v3 failed %s: %s' % (title, str(last)[:60]))

TORAH = {'בראשית': ('Genesis', 'tanach-bereishit'),
         'שמות': ('Exodus', 'tanach-shemos'),
         'ויקרא': ('Leviticus', 'tanach-vayikra'),
         'במדבר': ('Numbers', 'tanach-bamidbar'),
         'דברים': ('Deuteronomy', 'tanach-devarim')}
NAVI = {'שמואל א': ('I Samuel', 'tanach-shmuel-a'),
        'שמואל ב': ('II Samuel', 'tanach-shmuel-b'),
        'מלכים א': ('I Kings', 'tanach-melachim-a'),
        'מלכים ב': ('II Kings', 'tanach-melachim-b'),
        'ישעיהו': ('Isaiah', 'tanach-yeshayahu'),
        'ישעיה': ('Isaiah', 'tanach-yeshayahu'),
        'ירמיהו': ('Jeremiah', 'tanach-yirmiyahu'),
        'ירמיה': ('Jeremiah', 'tanach-yirmiyahu'),
        'יחזקאל': ('Ezekiel', 'tanach-yechezkel'),
        'הושע': ('Hosea', 'tanach-hoshea'), 'יואל': ('Joel', 'tanach-yoel'),
        'עמוס': ('Amos', 'tanach-amos'), 'עובדיה': ('Obadiah', 'tanach-ovadya'),
        'יונה': ('Jonah', 'tanach-yonah'), 'מיכה': ('Micah', 'tanach-michah'),
        'נחום': ('Nahum', 'tanach-nachum'), 'חבקוק': ('Habakkuk', 'tanach-havakkuk'),
        'צפניה': ('Zephaniah', 'tanach-tzefanya'),
        'חגי': ('Haggai', 'tanach-chaggai'),
        'זכריה': ('Zechariah', 'tanach-zecharya'),
        'מלאכי': ('Malachi', 'tanach-malachi'),
        'תהילים': ('Psalms', 'tanach-tehillim'),
        'משלי': ('Proverbs', 'tanach-mishlei'), 'איוב': ('Job', 'tanach-iyov'),
        'שיר השירים': ('Song of Songs', 'tanach-shir-hashirim'),
        'רות': ('Ruth', 'tanach-rus'), 'איכה': ('Lamentations', 'tanach-eicha'),
        'קהלת': ('Ecclesiastes', 'tanach-koheles'),
        'אסתר': ('Esther', 'tanach-esther'), 'דניאל': ('Daniel', 'tanach-daniel'),
        'עזרא': ('Ezra', 'tanach-ezra'), 'נחמיה': ('Nehemiah', 'tanach-nechemia'),
        'יהושע': ('Joshua', 'tanach-yehoshua'),
        'שופטים': ('Judges', 'tanach-shoftim'),
        'דברי הימים א': ('I Chronicles', 'tanach-divrei-hayamim-a'),
        'דברי הימים ב': ('II Chronicles', 'tanach-divrei-hayamim-b')}
# our gemara maseches label -> (Sefaria name, our file slug)
GEMARA = {'ברכות': ('Berakhot', 'gemara-berakhot'), "ב''ק": ('Bava Kamma', 'gemara-bava-kamma'),
          "ב''מ": ('Bava Metzia', 'gemara-bava-metzia'),
          "ב''ב": ('Bava Batra', 'gemara-bava-batra'),
          'בבא קמא': ('Bava Kamma', 'gemara-bava-kamma'),
          'בבא מציעא': ('Bava Metzia', 'gemara-bava-metzia'),
          'בבא בתרא': ('Bava Batra', 'gemara-bava-batra'),
          'מציעא': ('Bava Metzia', 'gemara-bava-metzia'),
          'שבת': ('Shabbat', 'gemara-shabbat'), 'עירובין': ('Eruvin', 'gemara-eruvin'),
          'פסחים': ('Pesachim', 'gemara-pesachim'), 'שקלים': ('Shekalim', 'gemara-shekalim'),
          'יומא': ('Yoma', 'gemara-yoma'), 'סוכה': ('Sukkah', 'gemara-sukkah'),
          'ביצה': ('Beitzah', 'gemara-beitzah'),
          'ראש השנה': ('Rosh Hashanah', 'gemara-rosh-hashanah'),
          'ר"ה': ('Rosh Hashanah', 'gemara-rosh-hashanah'),
          'תענית': ('Taanit', 'gemara-taanit'), 'מגילה': ('Megillah', 'gemara-megillah'),
          'מועד קטן': ('Moed Katan', 'gemara-moed-katan'),
          "מו''ק": ('Moed Katan', 'gemara-moed-katan'),
          'חגיגה': ('Chagigah', 'gemara-chagigah'), 'יבמות': ('Yevamot', 'gemara-yevamot'),
          'כתובות': ('Ketubot', 'gemara-ketubot'), 'נדרים': ('Nedarim', 'gemara-nedarim'),
          'נזיר': ('Nazir', 'gemara-nazir'), 'סוטה': ('Sotah', 'gemara-sotah'),
          'גיטין': ('Gittin', 'gemara-gittin'), 'קידושין': ('Kiddushin', 'gemara-kiddushin'),
          'קדושין': ('Kiddushin', 'gemara-kiddushin'),
          'סנהדרין': ('Sanhedrin', 'gemara-sanhedrin'), 'מכות': ('Makkot', 'gemara-makkot'),
          'שבועות': ('Shevuot', 'gemara-shevuot'),
          "ע''ז": ('Avodah Zarah', 'gemara-avodah-zarah'),
          'עבודה זרה': ('Avodah Zarah', 'gemara-avodah-zarah'),
          'חולין': ('Chullin', 'gemara-chullin'), 'זבחים': ('Zevachim', 'gemara-zevachim'),
          'מנחות': ('Menachot', 'gemara-menachot'), 'קינים': ('Kinnim', 'gemara-kinnim'),
          'מדות': ('Middot', 'gemara-middot'), 'תמורה': ('Temurah', 'gemara-temurah'),
          'מעילה': ('Meilah', 'gemara-meilah'), 'כריתות': ('Keritot', 'gemara-keritot'),
          'בכורות': ('Bekhorot', 'gemara-bekhorot'), 'ערכין': ('Arakhin', 'gemara-arakhin'),
          'תמיד': ('Tamid', 'gemara-tamid'), 'עדיות': ('Eduyot', 'gemara-eduyot'),
          'הוריות': ('Horayot', 'gemara-horayot'), 'נדה': ('Niddah', 'gemara-niddah'),
          'פאה': ('Peah', 'gemara-peah'), 'דמאי': ('Demai', 'gemara-demai'),
          'כלאים': ('Kilayim', 'gemara-kilayim'), 'שביעית': ('Sheviit', 'gemara-sheviit'),
          'תרומות': ('Terumot', 'gemara-terumot'), 'מעשרות': ('Maasrot', 'gemara-maasrot'),
          'חלה': ('Challah', 'gemara-challah'), 'ערלה': ('Orlah', 'gemara-orlah'),
          'ביכורים': ('Bikkurim', 'gemara-bikkurim')}
MISHNA = {}
for _k, _v in GEMARA.items():
    MISHNA[_k] = (_v[0], _v[1].replace('gemara-', 'mishna-'))
MISHNA.update({'אבות': ('Avot', 'mishna-avot'), 'קינים': ('Kinnim', 'mishna-kinnim'),
               'עוקצים': ('Uktzin', 'mishna-uktzin'), 'עוקצין': ('Uktzin', 'mishna-uktzin'),
               'טבול יום': ('Tevul Yom', 'mishna-tevul-yom'),
               'טבול-יום': ('Tevul Yom', 'mishna-tevul-yom'),
               'ידים': ('Yadayim', 'mishna-yadayim'),
               'מסכת ידים': ('Yadayim', 'mishna-yadayim'),
               'מכשירין': ('Makhshirin', 'mishna-makhshirin'),
               'זבים': ('Zavim', 'mishna-zavim'), 'מקואות': ('Mikvaot', 'mishna-mikvaot'),
               'טהרות': ('Taharot', 'mishna-taharot'), 'נגעים': ('Negaim', 'mishna-negaim'),
               'פרה': ('Parah', 'mishna-parah'), 'מסכת פרה': ('Parah', 'mishna-parah'),
               'אהלות': ('Oholot', 'mishna-ohalot'), 'כלים': ('Kelim', 'mishna-kelim')})

def flatten(x):
    """v3 text items: str | list of strs (paragraph lines) | nested."""
    if x is None:
        return ''
    if isinstance(x, str):
        return x
    if isinstance(x, list):
        return ' '.join(flatten(i) for i in x if i)
    return str(x)

def slug_he(label):
    return re.sub(r'[״\'"׳]', '', (label or '')).strip().replace(' ', '-')

def save(source, fname, data):
    d = os.path.join(OUT, source)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, fname + '.json')
    old = {}
    if os.path.exists(p):
        old = json.load(open(p, encoding='utf-8'))
    for k, v in data.items():
        old.setdefault(k, v)
    json.dump(old, open(p, 'w', encoding='utf-8'), ensure_ascii=False)

def needs_from_schedule():
    sched = json.load(open(SCHED, encoding='utf-8'))
    g, m, n, t, sa = {}, {}, {}, {}, {}
    for w in sched['weeks'].values():
        for v in w['days'].values():
            gm = v.get('gemara') or {}
            if gm.get('masechet') and gm.get('daf') and gm.get('amud'):
                g.setdefault(gm['masechet'], set()).add((int(gm['daf']), int(gm['amud'])))
            mi = v.get('mishna') or {}
            if mi.get('masechet') and mi.get('perek'):
                m.setdefault(mi['masechet'], set()).add(int(mi['perek']))
            for src in ('navi', 'kesuvim'):
                nv = v.get(src) or {}
                if nv.get('book') and (nv.get('from') or {}).get('c'):
                    n.setdefault(nv['book'], set()).add(int(nv['from']['c']))
            to = v.get('torah') or {}
            if to.get('book'):
                c1 = int(to['from']['c'])
                c2 = int((to.get('to') or {}).get('c') or c1)
                for c in range(c1, c2 + 1):
                    t.setdefault(to['book'], set()).add(c)
            ha = v.get('halacha') or {}
            if ha.get('work') == 'SA':
                tur = str(ha.get('tur') or 'OC').lower()
                c1 = int(ha.get('from') or 0)
                c2 = int(ha.get('to') or c1)
                for sim in range(c1, c2 + 1):
                    sa.setdefault(tur, set()).add(sim)
    return g, m, n, t, sa

def main():
    g, m, n, t, sa = needs_from_schedule()
    # bonus mishna perakim too
    try:
        bonus = json.load(open(BONUS, encoding='utf-8'))
        for wdays in (bonus.get('weeks') or {}).values():
            for items in wdays.values():
                for item in items:
                    if item.get('he') and item.get('perek'):
                        m.setdefault(item['he'], set()).add(int(item['perek']))
    except Exception as e:
        print('bonus parse skipped:', str(e)[:60])
    n_fetched = 0
    # 1) Rashi on Gemara (per amud)
    for mas, amuds in sorted(g.items()):
        entry = GEMARA.get(mas)
        if not entry:
            print('gemara: no sefaria map for', mas)
            continue
        sef, slug = entry
        data = {}
        try:
            p = os.path.join(OUT, 'gemara-rashi', slug + '.json')
            if os.path.exists(p):
                data = json.load(open(p, encoding='utf-8'))
        except Exception:
            data = {}
        ch = data.setdefault('ch', {})
        for daf, amud in sorted(amuds):
            key = 'a' if amud == 1 else 'b'
            if ch.get(str(daf), {}).get(key):
                continue
            txt = v3('Rashi on %s %s%s' % (sef, daf, key))
            if txt:
                items = txt if isinstance(txt, list) else [txt]
                segs = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', flatten(it))).strip()
                        for it in items]
                segs = [x for x in segs if x]
                if segs:
                    ch.setdefault(str(daf), {})[key] = segs
                    n_fetched += 1
            time.sleep(0.7)
        if ch:
            save('gemara-rashi', slug, {'ch': ch})
            print('gemara-rashi', mas, len(ch), 'dafim')
    # 2) Bartenura (per perek)
    for mas, perakim in sorted(m.items()):
        entry = MISHNA.get(mas)
        if not entry:
            print('mishna: no sefaria map for', mas)
            continue
        sef, slug = entry
        data = {}
        try:
            p = os.path.join(OUT, 'mishna-bartenura', slug + '.json')
            if os.path.exists(p):
                data = json.load(open(p, encoding='utf-8'))
        except Exception:
            data = {}
        ch = data.setdefault('ch', {})
        for perek in sorted(perakim):
            pn = str(perek)
            if ch.get(pn):
                continue
            txt = v3('Bartenura on Mishnah %s %s' % (sef, perek))
            if txt:
                if isinstance(txt, list):
                    ch[pn] = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', flatten(x))).strip()
                              for x in txt]
                else:
                    ch[pn] = [flatten(txt)]
                n_fetched += 1
            time.sleep(0.7)
        if ch:
            save('mishna-bartenura', slug, {'ch': ch})
            print('bartenura', mas, len(ch), 'perakim')
    # 3) Metzudat David on Navi/Kesuvim (per chapter)
    for book, chapters in sorted(n.items()):
        entry = NAVI.get(book)
        if not entry:
            print('navi: no sefaria map for', book)
            continue
        sef, slug = entry
        data = {}
        try:
            p = os.path.join(OUT, 'navi-metzudas', slug + '.json')
            if os.path.exists(p):
                data = json.load(open(p, encoding='utf-8'))
        except Exception:
            data = {}
        ch = data.setdefault('ch', {})
        for cnum in sorted(chapters):
            cn = str(cnum)
            if ch.get(cn):
                continue
            txt = v3('Metzudat David on %s %s' % (sef, cnum))
            if txt:
                arr = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', flatten(x))).strip()
                       for x in txt]
                if any(arr):
                    ch[cn] = arr
                    n_fetched += 1
            time.sleep(0.7)
        if ch:
            save('navi-metzudas', slug, {'ch': ch})
            print('metzudas', book, len(ch), 'chapters')
    # 4) Ramban + Ibn Ezra on Torah (per chapter)
    # Ramban only - NO Ibn Ezra (Chayei Moharan 410, user's directive)
    for src, title in (('torah-ramban', 'Ramban'),):
        for book, chapters in sorted(t.items()):
            entry = TORAH.get(book)
            if not entry:
                continue
            sef, slug = entry
            data = {}
            try:
                p = os.path.join(OUT, src, slug + '.json')
                if os.path.exists(p):
                    data = json.load(open(p, encoding='utf-8'))
            except Exception:
                data = {}
            ch = data.setdefault('ch', {})
            for cnum in sorted(chapters):
                cn = str(cnum)
                if ch.get(cn):
                    continue
                txt = v3('%s on %s %s' % (title, sef, cnum))
                if txt:
                    arr = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', flatten(x))).strip()
                           for x in txt]
                    if any(arr):
                        ch[cn] = arr
                        n_fetched += 1
                time.sleep(0.7)
            if ch:
                save(src, slug, {'ch': ch})
                print(src, book, len(ch), 'chapters')
    # 5) Magen Avraham on SA (per siman; all four turim Sefaria serves)
    TUR_SEF = {'oc': 'Orach Chaim', 'yd': 'Yoreh Deah',
               'eh': 'Even HaEzer', 'cm': 'Choshen Mishpat'}
    for tur, simanim in sorted(sa.items()):
        sef_tur = TUR_SEF.get(tur)
        if not sef_tur:
            print('SA: unknown tur', tur)
            continue
        slug = 'sa-' + tur
        data = {}
        try:
            p = os.path.join(OUT, 'sa-magen-avraham', slug + '.json')
            if os.path.exists(p):
                data = json.load(open(p, encoding='utf-8'))
        except Exception:
            data = {}
        ch = data.setdefault('ch', {})
        for sim in sorted(simanim):
            sn = str(sim)
            if ch.get(sn):
                continue
            txt = v3('Magen Avraham on Shulchan Aruch, %s %s' % (sef_tur, sim))
            if txt:
                ch[sn] = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', x)).strip()
                          if isinstance(x, str) else '' for x in txt]
                n_fetched += 1
            time.sleep(0.7)
        if ch:
            save('sa-magen-avraham', slug, {'ch': ch})
            print('magen-avraham', tur, len(ch), 'simanim')
    print('done: %d units fetched' % n_fetched)

if __name__ == '__main__':
    main()
