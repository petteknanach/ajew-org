#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch the daily halacha texts (Rambam perakim + Shulchan Aruch simanim)
referenced by the Chok schedule. Hebrew only - both are ancient public-domain
works; the specific Sefaria digitizations are used textually.

ONE-TIME IMPORT (not a build dependency). Output:
  public/reader/rambam/<hilchot-slug>.json   {name, ch: {perek: [halachos]}}
  public/reader/shulchan/<tur>.json          {name, sim: {siman: [seifim]}}
"""
import json, os, re, time, urllib.request, urllib.parse

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader')
SCHED = '/root/ajew-org/public/reader/chok/schedule.json'

def sef(path):
    url = 'https://www.sefaria.org/api/' + path
    req = urllib.request.Request(url, headers={'User-Agent': 'ajew.org-halacha-import/1.0'})
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

def slug(h):
    suffix = RAMBATITLES.get(h, h).replace("'", '').replace('\u2019', '')
    if suffix.lower().startswith('hilchot '):
        suffix = suffix[8:]
    return 'rambam-' + re.sub(r'[^a-z0-9]+', '-', suffix.lower()).strip('-')

# Hebrew hilchot name -> Sefaria "Mishneh Torah, <X>" suffix, resolved lazily
RAMBATITLES = {
    'תפילה': 'Hilchot Tefilah and Birkat Kohanim', 'שבת': 'Hilchot Shabbos',
    'ברכות': 'Hilchot Berachot', 'מעשה הקרבנות': 'Hilchot Maaseh Hakorbonos',
    'תשובה': 'Hilchot Teshuvah', 'קריאת שמע': "Hilchot Kri'at Shema",
    'תלמוד תורה': 'Hilchot Talmud Torah', 'איסורי ביאה': 'Hilchot Issurei Biah',
    'יסודי התורה': 'Hilchot Yesodey haTorah', 'עבודה זרה': 'Hilchot Avodah Kochavim',
    'פרה אדומה': 'Hilchot Parah Adummah', 'אישות': 'Hilchot Ishut',
    'דעות': "Hilchot De'ot", 'שמיטה ויובל': 'Hilchot Shemita',
}
TURS = {'OC': 'Orach Chayim', 'YD': 'Yoreh De\'ah', 'EH': 'Even HaEzer', 'CM': 'Choshen Mishpat'}

def main():
    sched = json.load(open(SCHED, encoding='utf-8'))
    # collect refs
    ram, sha = {}, {}
    for w in sched['weeks'].values():
        for day, v in w['days'].items():
            h = v.get('halacha') or {}
            if h.get('work') == 'rambam':
                if h.get('from_perek'):
                    ram.setdefault(h['hilchot'], set()).add(h['from_perek'])
            elif h.get('work') == 'SA' and h.get('from'):
                t = sha.setdefault(h['tur'], set())
                t.add(h['from'])
                if h.get('to'):
                    for n in range(h['from'] + 1, h['to'] + 1):
                        t.add(n)
    # resolve titles against the index (fuzzy fallback)
    idx = set(sef('index/titles')['books'])
    missing = [h for h, t in RAMBATITLES.items() if 'Mishneh Torah, ' + t not in idx]
    if missing:
        print('title check failed for:', missing)
        return
    n = 0
    os.makedirs(os.path.join(BASE, 'rambam'), exist_ok=True)
    for hil, perakim in sorted(ram.items()):
        suffix = RAMBATITLES.get(hil)
        if not suffix:
            print('no Sefaria title for', hil)
            continue
        dst = os.path.join(BASE, 'rambam', slug(hil) + '.json')
        if os.path.exists(dst):
            continue
        ch = {}
        for p in sorted(perakim):
            if not p or p < 1:
                continue
            try:
                d = texts('Mishneh Torah, %s %d' % (suffix, p))
            except Exception as e:
                print('FAIL', hil, p, e)
                continue
            he = d.get('he')
            if isinstance(he, list):
                ch[str(p)] = [x if isinstance(x, str) else '' for x in he]
            n += 1
            time.sleep(0.4)
        if ch:
            json.dump({'name': 'הלכות ' + hil, 'ch': ch}, open(dst, 'w', encoding='utf-8'),
                      ensure_ascii=False)
            tot = sum(len(v) for v in ch.values())
            print('%s: %d perakim, %d halachos' % (hil, len(ch), tot))
    os.makedirs(os.path.join(BASE, 'shulchan'), exist_ok=True)
    for tur, simanim in sorted(sha.items()):
        dst = os.path.join(BASE, 'shulchan', tur + '.json')
        sim = {}
        if os.path.exists(dst):
            sim = json.load(open(dst, encoding='utf-8')).get('sim', {})
        for s in sorted(simanim):
            if not s or s < 1:
                continue
            if str(s) in sim:
                continue
            try:
                d = texts('Shulchan Arukh, %s %d' % (TURS[tur], s))
            except Exception as e:
                print('FAIL', tur, s, e)
                continue
            he = d.get('he')
            if isinstance(he, list):
                flat = []
                for x in he:
                    if isinstance(x, str):
                        flat.append(x)
                    elif isinstance(x, list):
                        flat.extend(y for y in x if isinstance(y, str))
                sim[str(s)] = flat
            n += 1
            time.sleep(0.4)
        if sim:
            json.dump({'name': 'שולחן ערוך ' + TURS[tur], 'sim': sim}, open(dst, 'w', encoding='utf-8'),
                      ensure_ascii=False)
            print('%s: %d simanim so far' % (tur, len(sim)))
    print('done: %d fetched' % n)

if __name__ == '__main__':
    main()
