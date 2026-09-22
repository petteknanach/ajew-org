#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kavanos library (Arizal, Pri Etz Chaim) - one-time import from Sefaria.

Pri Etz Chaim: 30 gates, each with numbered chapters. Refs:
  'Pri Etz Chaim, <Gate Name> <chapter>'

Output: public/reader/kavanos/pec-gate-<NN>.json
  {"gate": <n>, "name": "<Gate Name>", "heName": "...", "ch": {"1": [paras]}}

Incremental + loud failures; rerun passes until complete.
"""
import json
import os
import re
import time
import urllib.parse
import urllib.request

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   'public', 'reader', 'kavanos')
UA = {'User-Agent': 'ajew.org-reader/1.0'}

GATES = [
    (1, 'Gate of Prayer', 'שער התפלה'),
    (2, 'Gate of Blessings', 'שער הברכות'),
    (3, 'Gate of Fringes', 'שער הציצית'),
    (4, 'Gate of Teffilin', 'שער התפילין'),
    (5, 'Gate of the World of Action', 'שער עולם העשיה'),
    (6, 'Gate of the Holies', 'שער הקדישים'),
    (7, 'Gate of Songs', 'שער הזמירות'),
    (8, 'Gate of the Recitation of the Shema', 'שער הקריאת שמע'),
    (9, 'Gate of the Silent Prayer', 'שער העמידה'),
    (10, 'Gate of the Repetition of the Silent Prayer', 'שער חזרת העמידה'),
    (11, 'Gate of Amen Intention', 'שער כוונת אמן'),
    (12, 'Gate of Confession', 'שער הסליחות'),
    (13, 'Gate of Putting Down the Head', 'שער נפילת אפים'),
    (14, 'Gate of Reading the Torah', 'שער קריאת ספר תורה'),
    (15, 'Gate of the Afternoon and Evening Prayers', 'שער מנחה ומעריב'),
    (16, 'Gate of the Recitation of the Shema Before Retiring', 'שער קריאת שמע שעל המיטה'),
    (17, 'Gate of the Midnight Prayer', 'שער תיקון חצות'),
    (18, 'Gate of Conduct While Learning', 'שער הנהגת הלימוד'),
    (19, 'Gate of the Sabbath', 'שער השבת'),
    (20, 'Gate of The New Month, Chanukah, and Purim', 'שער ר״ח חנוכה ופורים'),
    (21, 'Gate of Festival', 'שער מקרא קודש'),
    (22, 'Gate of Passover', 'שער חג המצות'),
    (23, 'Gate of the Omer Count', 'שער ספירת העומר'),
    (24, 'Gate of Shavuot', 'שער חג השבועות'),
    (25, 'Gate of Rosh Hashana', 'שער ראש השנה'),
    (26, 'Gate of the Prayers of Rosh Hashana', 'שער תפילות ראש השנה'),
    (27, 'Gate of the Shofer', 'שער השופר'),
    (28, 'Gate of Yom Kippur', 'שער יום הכפורים'),
    (29, 'Gate of Sukkot', 'שער חג הסוכות'),
    (30, 'Gate of Lulav', 'שער הלולב'),
]

MAX_CHAPTER = 60  # no gate is longer


def v3_raw(title):
    q = urllib.parse.quote(title, safe='')
    url = 'https://www.sefaria.org/api/v3/texts/%s?version=hebrew' % q
    req = urllib.request.Request(url, headers=UA)
    last = None
    for attempt in range(8):
        try:
            with urllib.request.urlopen(req, timeout=45) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # noqa: BLE001
            last = e
            s = str(e)
            if '400' in s or '404' in s:
                raise
            time.sleep(min(60, 6 * (attempt + 1)))
    raise RuntimeError('rate limited: %s (%s)' % (title, last))


def clean_seg(x):
    t = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', x if isinstance(x, str) else ' '.join(
        clean_seg(i) for i in x) if isinstance(x, list) else '')).strip()
    return t


def flat(x):
    if isinstance(x, list):
        parts = [flat(i) for i in x]
        return ' '.join(p for p in parts if p)
    return str(x)


def fetch_chapter(gate_name, ch):
    d = v3_raw('Pri Etz Chaim, %s %s' % (gate_name, ch))
    versions = d.get('versions') or []
    if not versions:
        return None
    txt = versions[0].get('text') or []
    segs = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', flat(item))).strip() for item in txt]
    segs = [s for s in segs if s]
    return segs or None


def main():
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for gnum, gname, hename in GATES:
        slug = 'pec-gate-%02d' % gnum
        path = os.path.join(OUT, slug + '.json')
        data = {'gate': gnum, 'name': gname, 'heName': hename, 'ch': {}}
        if os.path.exists(path):
            try:
                data = json.load(open(path, encoding='utf-8'))
            except Exception:
                pass
        ch = data.setdefault('ch', {})
        missing = [c for c in range(1, MAX_CHAPTER + 1) if str(c) not in ch and str(c) not in data.get('absent', [])]
        for cnum in missing:
            try:
                got = fetch_chapter(gname, cnum)
            except Exception as e:
                msg = str(e)
                if '404' in msg:
                    data.setdefault('absent', []).append(str(cnum))
                else:
                    print('FAIL gate %s ch %s: %s' % (gnum, cnum, msg[:60]))
                    time.sleep(1.2)
                continue
            if got:
                ch[str(cnum)] = got
                n += 1
                print('gate %d ch %d: %d paras' % (gnum, cnum, len(got)))
                time.sleep(0.85)
            else:
                data.setdefault('absent', []).append(str(cnum))
            if ch:
                json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    idx = {'gates': [{'n': g, 'name': nm, 'heName': hn,
                      'chapters': len(json.load(open(os.path.join(OUT, 'pec-gate-%02d.json' % g), encoding='utf-8')).get('ch', {}))
                      if os.path.exists(os.path.join(OUT, 'pec-gate-%02d.json' % g)) else 0}
                     for g, nm, hn in GATES]}
    json.dump(idx, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('done: %d chapters fetched' % n)


if __name__ == '__main__':
    main()
