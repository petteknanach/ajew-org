#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rashi super-commentaries (classic acharonim ON Rashi) for the chok.

Sources (Sefaria API, PD Hebrew only, one-time import):
  Mizrachi, Maskil LeDavid, Levush HaOrah, Chizkuni  -> '<name>, <Book> <c>'
  Rashbam                                            -> 'Rashbam on <Book> <c>'
  Gur Aryeh                                          -> 'Gur Aryeh on Genesis <c>'
  Be'er Mayim Chaim                                  -> 'Be'er Mayim Chaim, <Book> <c>'
  Baal HaTurim                                       -> verse-level only
  (Sifsei Chachamim, Sefer Zikaron, Divrei Dovid, Yad Aharon,
   Minchat Shai, TzLaCh are NOT on the API - noted honestly)

Output: public/reader/commentary/rashi-super/<chumash-slug>.json
  {"ch": {"33": {"33:16": {"Mizrachi": [...paras], "Chizkuni": [...]}}}}

Incremental: existing verses are kept; only missing chapters/verses are
fetched. Failures raise loudly; rerun passes until coverage is complete.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_commentaries import needs_from_schedule, TORAH, flatten  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   'public', 'reader', 'commentary', 'rashi-super')
UA = {'User-Agent': 'ajew.org-reader/1.0'}

# (display_name, form) — form: 'comma' -> '<name>, <Book> <c>'; 'on' -> '<name> on <Book> <c>'
SOURCES = [('Mizrachi', 'comma'), ('Maskil LeDavid', 'comma'), ('Levush HaOrah', 'comma'),
           ('Chizkuni', 'comma'), ('Rashbam', 'on'), ('Gur Aryeh', 'on'), ("Be'er Mayim Chaim", 'comma')]
BOOK_OK = {  # books each commentary actually covers (probed)
    'Mizrachi': set(TORAH.keys()),
    'Maskil LeDavid': set(TORAH.keys()),
    'Levush HaOrah': set(TORAH.keys()),
    'Chizkuni': set(TORAH.keys()),
    'Rashbam': set(TORAH.keys()),
    'Gur Aryeh': {'בראשית'},
    "Be'er Mayim Chaim": {'בראשית', 'ויקרא', 'דברים'},
}


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


def ref_for(name, form, he_book, cnum):
    sef = TORAH[he_book]  # (english_book_name, file_slug)
    if form == 'comma':
        return '%s, %s %s' % (name, sef[0], cnum)
    return '%s on %s %s' % (name, sef[0], cnum)


def clean_seg(x):
    t = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', flatten(x))).strip()
    return t


def fetch_chapter(name, form, he_book, cnum):
    ref = ref_for(name, form, he_book, cnum)
    d = v3_raw(ref)
    versions = d.get('versions') or []
    if not versions:
        return None
    txt = versions[0].get('text') or []
    if not isinstance(txt, list):
        return None
    out = {}
    for idx, item in enumerate(txt, start=1):
        segs = [clean_seg(s) for s in item] if isinstance(item, list) else [clean_seg(item)]
        segs = [x for x in segs if x]
        if segs:
            out[str(idx)] = segs
    return out or None


def main():
    os.makedirs(OUT, exist_ok=True)
    g, m, n, torah, sa = needs_from_schedule()
    n_fetched = 0
    for he_book in sorted(torah.keys()):
        chapters = sorted(torah[he_book])
        entry = TORAH[he_book]
        slug = entry[1]
        path = os.path.join(OUT, slug + '.json')
        data = {'ch': {}}
        if os.path.exists(path):
            try:
                data = json.load(open(path, encoding='utf-8'))
            except Exception:
                data = {'ch': {}}
        ch = data.setdefault('ch', {})
        absent = data.setdefault('absent', {})
        for cnum in chapters:
            ckey = str(cnum)
            verses = ch.setdefault(ckey, {})
            for src, form in SOURCES:
                if he_book not in BOOK_OK[src]:
                    continue
                abs_key = he_book + ':' + ckey
                if src in absent.get(abs_key, []):
                    continue
                have = any(src in (verses.get('%s:%s' % (cnum, v)) or {}) for v in verses)
                if have:
                    continue
                try:
                    got = fetch_chapter(src, form, he_book, cnum)
                except Exception as e:
                    msg = str(e)
                    if '404' in msg:
                        # genuinely absent for this chapter - remember, don't refetch
                        absent.setdefault(abs_key, []).append(src)
                        print('ABSENT %s %s %s' % (src, he_book, cnum))
                    else:
                        print('FAIL %s %s %s: %s' % (src, he_book, cnum, msg[:60]))
                    time.sleep(1.0)
                    continue
                if not got:
                    absent.setdefault(abs_key, []).append(src)
                    print('ABSENT-EMPTY %s %s %s' % (src, he_book, cnum))
                    continue
                for vk, segs in got.items():
                    k = '%s:%s' % (cnum, vk)
                    verses.setdefault(k, {})[src] = segs
                n_fetched += 1
                print('%s %s %s %s: %d verses' % (src, he_book, cnum, slug, len(got)))
                time.sleep(0.9)
            if verses:
                json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print('done: %d chapters fetched' % n_fetched)


if __name__ == '__main__':
    main()
