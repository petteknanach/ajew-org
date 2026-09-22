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
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as r:
                d = json.loads(r.read().decode())
            return d['versions'][0]['text']
        except Exception as e:
            msg = str(e)
            if '429' in msg:
                time.sleep(8 * (attempt + 1))
            elif '404' in msg:
                return None
            else:
                time.sleep(2)
    return None

TORAH = {'בראשית': 'tanach-bereishit', 'שמות': 'tanach-shemos',
         'ויקרא': 'tanach-vayikra', 'במדבר': 'tanach-bamidbar',
         'דברים': 'tanach-devarim'}
NAVI = {'שמואל א': 'tanach-shmuel-a', 'שמואל ב': 'tanach-shmuel-b',
        'מלכים א': 'tanach-melachim-a', 'מלכים ב': 'tanach-melachim-b',
        'ישעיהו': 'tanach-yeshayahu', 'ישעיה': 'tanach-yeshayahu',
        'ירמיהו': 'tanach-yirmiyahu', 'ירמיה': 'tanach-yirmiyahu',
        'יחזקאל': 'tanach-yechezkel', 'הושע': 'tanach-hoshea',
        'יואל': 'tanach-yoel', 'עמוס': 'tanach-amos', 'עובדיה': 'tanach-ovadya',
        'יונה': 'tanach-yonah', 'מיכה': 'tanach-michah', 'נחום': 'tanach-nachum',
        'חבקוק': 'tanach-havakkuk', 'צפניה': 'tanach-tzefanya',
        'חגי': 'tanach-chaggai', 'זכריה': 'tanach-zecharya',
        'מלאכי': 'tanach-malachi', 'תהילים': 'tanach-tehillim',
        'משלי': 'tanach-mishlei', 'איוב': 'tanach-iyov',
        'שיר השירים': 'tanach-shir-hashirim', 'רות': 'tanach-rus',
        'איכה': 'tanach-eicha', 'קהלת': 'tanach-koheles',
        'אסתר': 'tanach-esther', 'דניאל': 'tanach-daniel',
        'עזרא': 'tanach-ezra', 'נחמיה': 'tanach-nechemia',
        'יהושע': 'tanach-yehoshua', 'שופטים': 'tanach-shoftim',
        'דברי הימים א': 'tanach-divrei-hayamim-a',
        'דברי הימים ב': 'tanach-divrei-hayamim-b'}
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
MISHNA = dict(GEMARA)
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
                    ch[pn] = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()
                              if isinstance(s, str) else '' for s in txt]
                else:
                    ch[pn] = [txt]
                n_fetched += 1
            time.sleep(0.7)
        if ch:
            save('mishna-bartenura', slug, {'ch': ch})
            print('bartenura', mas, len(ch), 'perakim')
    # 3) Metzudat David on Navi/Kesuvim (per chapter)
    for book, chapters in sorted(n.items()):
        sef = NAVI.get(book)
        if not sef:
            print('navi: no sefaria map for', book)
            continue
        slug = sef
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
                ch[cn] = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()
                          if isinstance(s, str) else '' for s in txt]
                n_fetched += 1
            time.sleep(0.7)
        if ch:
            save('navi-metzudas', slug, {'ch': ch})
            print('metzudas', book, len(ch), 'chapters')
    # 4) Ramban + Ibn Ezra on Torah (per chapter)
    for src, title in (('torah-ramban', 'Ramban'), ('torah-ibnezra', 'Ibn Ezra')):
        for book, chapters in sorted(t.items()):
            sef = TORAH.get(book)
            if not sef:
                continue
            slug = 'chumash-' + slug_he(book)
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
                    ch[cn] = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()
                              if isinstance(s, str) else '' for s in txt]
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
