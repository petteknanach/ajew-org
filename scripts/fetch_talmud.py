#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch the daily Gemara amudim referenced by the Chok schedule and store
per-masechet JSON for the day page.

Hebrew only - the Talmud text is ancient public-domain; the Sefaria
digitization is used as a one-time text channel. All mapping tables here are
ours (TE label variants expanded by our own rules).

ONE-TIME IMPORT. Output: public/reader/gemara/<masechet-slug>.json
  {name, ch: {daf: {a: [lines], b: [lines]}}}
"""
import json, os, re, time, urllib.request, urllib.parse

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader')
SCHED = os.path.join(BASE, 'chok', 'schedule.json')

def sef(path):
    url = 'https://www.sefaria.org/api/' + path
    req = urllib.request.Request(url, headers={'User-Agent': 'ajew.org-talmud-import/1.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def texts(title):
    q = urllib.parse.quote(title, safe='')
    for attempt in range(3):
        try:
            return sef('texts/%s?context=0&commentary=0' % q)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))

# TE Hebrew masechet label (normalized) -> Sefaria Talmud title (ours)
MASECHTOT = {
    'ברכות': 'Berakhot', 'שבת': 'Shabbat', 'עירובין': 'Eruvin', 'פסחים': 'Pesachim',
    'ביצה': 'Beitzah', 'ראש השנה': 'Rosh Hashanah', 'מועד קטן': 'Moed Katan',
    'חגיגה': 'Chagigah', 'יבמות': 'Yevamot', 'כתובות': 'Ketubot', 'נדרים': 'Nedarim',
    'נזיר': 'Nazir', 'סוטה': 'Sotah', 'גיטין': 'Gittin', 'קידושין': 'Kiddushin',
    'בבא קמא': 'Bava Kamma', 'בבא מציעא': 'Bava Metzia', 'בבא בתרא': 'Bava Batra',
    'סנהדרין': 'Sanhedrin', 'מכות': 'Makkot', 'שבועות': 'Shevuot',
    'עבודה זרה': 'Avodah Zarah', 'זבחים': 'Zevachim', 'מנחות': 'Menachot',
    'חולין': 'Chullin', 'בכורות': 'Bekhorot', 'ערכין': 'Arakhin',
    'קריתות': 'Keritut', 'נדה': 'Niddah',
}
EXPAND = {'בק': 'בבא קמא', 'במ': 'בבא מציעא', 'בב': 'בבא בתרא', 'רה': 'ראש השנה',
          'עז': 'עבודה זרה', 'מק': 'מכות', 'מציעא': 'בבא מציעא', 'קדושין': 'קידושין',
          'קריתות': 'קריתות'}
HEB = {he: he for he in MASECHTOT}

def norm(t):
    t = re.sub(r"[״'\"׳.]", '', (t or '')).strip()
    t = re.sub(r'^מסכת\s+', '', t)
    return EXPAND.get(t, t)

def slug_of(title):
    return 'gemara-' + re.sub(r"[^a-z0-9]+", '-', title.lower()).strip('-')

def main():
    sched = json.load(open(SCHED, encoding='utf-8'))
    refs = set()
    for w in sched['weeks'].values():
        for v in w['days'].values():
            g = v.get('gemara') or {}
            lbl = norm(g.get('masechet'))
            if lbl in MASECHTOT and g.get('daf') and g.get('amud') in (1, 2):
                refs.add((MASECHTOT[lbl], int(g['daf']), int(g['amud'])))
    print('distinct amudim:', len(refs))
    by_m = {}
    for title, daf, amud in sorted(refs):
        by_m.setdefault(title, {}).setdefault(daf, set()).add(amud)
    ok = fail = 0
    for title, dafmap in sorted(by_m.items()):
        slug = slug_of(title)
        dst = os.path.join(BASE, 'gemara', slug + '.json')
        data = {'name': title, 'ch': {}}
        if os.path.exists(dst):
            data = json.load(open(dst, encoding='utf-8'))
            data.setdefault('ch', {})
        for daf, amuds in sorted(dafmap.items()):
            key = str(daf)
            data['ch'].setdefault(key, {})
            for amud in sorted(amuds):
                letter = 'a' if amud == 1 else 'b'
                if data['ch'][key].get(letter):
                    continue
                try:
                    d = texts('%s %d%s' % (title, daf, letter))
                except Exception as e:
                    print('FAIL', title, daf, letter, str(e)[:60])
                    fail += 1
                    continue
                he = d.get('he')
                lines = []
                if isinstance(he, list):
                    lines = [x for x in he if isinstance(x, str)]
                if not lines:
                    print('EMPTY', title, daf, letter)
                    continue
                data['ch'][key][letter] = lines
                ok += 1
                time.sleep(0.4)
        if data['ch']:
            os.makedirs(os.path.join(BASE, 'gemara'), exist_ok=True)
            json.dump(data, open(dst, 'w', encoding='utf-8'), ensure_ascii=False)
            print('%s: %d dafim cached' % (title, len(data['ch'])))
    print('done: %d fetched, %d failed' % (ok, fail))

if __name__ == '__main__':
    main()
