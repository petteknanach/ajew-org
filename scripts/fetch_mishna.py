#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch the Mishna (Hebrew only) per-perek and store per-masechet JSON for the
Chok LiYisroel daily app.

ONE-TIME IMPORT (not a build dependency): the Mishna is an ancient
public-domain text. Only the Hebrew is ingested (Sefaria's English is the
CC-BY-NC William Davidson translation - NOT ingested). No runtime or
build-time calls to any external site; no displayed credit.

Output: public/reader/mishna/<slug>.json {name, perakim: N, ch: {perek: [mishna, ...]}}
"""
import json
import os
import time
import urllib.parse
import urllib.request

BASE = 'https://www.sefaria.org/api'
OUT = '/root/ajew-org/public/reader/mishna'

# (our hebrew label for the schedule map, Sefaria title, slug, max perakim cap)
MASECHTOT = [
    ('ברכות', 'Mishnah Berakhot', 'mishna-berakhot', 9),
    ('פאה', 'Mishnah Peah', 'mishna-peah', 8),
    ('דמאי', 'Mishnah Demai', 'mishna-demai', 7),
    ('כלאים', 'Mishnah Kilayim', 'mishna-kilayim', 9),
    ('שביעית', 'Mishnah Sheviit', 'mishna-sheviit', 10),
    ('תרומות', 'Mishnah Terumot', 'mishna-terumot', 11),
    ('מעשרות', 'Mishnah Maasrot', 'mishna-maasrot', 5),
    ('מעשר שני', 'Mishnah Maaser Sheni', 'mishna-maaser-sheni', 5),
    ('חלה', 'Mishnah Challah', 'mishna-challah', 4),
    ('ערלה', 'Mishnah Orlah', 'mishna-orlah', 3),
    ('ביכורים', 'Mishnah Bikkurim', 'mishna-bikkurim', 3),
    ('שבת', 'Mishnah Shabbat', 'mishna-shabbat', 24),
    ('עירובין', 'Mishnah Eruvin', 'mishna-eruvin', 10),
    ('פסחים', 'Mishnah Pesachim', 'mishna-pesachim', 10),
    ('שקלים', 'Mishnah Shekalim', 'mishna-shekalim', 8),
    ('יומא', 'Mishnah Yoma', 'mishna-yoma', 8),
    ('סוכה', 'Mishnah Sukkah', 'mishna-sukkah', 5),
    ('ביצה', 'Mishnah Beitzah', 'mishna-beitzah', 5),
    ('ראש השנה', 'Mishnah Rosh Hashanah', 'mishna-rosh-hashanah', 4),
    ('תענית', 'Mishnah Taanit', 'mishna-taanit', 4),
    ('מגילה', 'Mishnah Megillah', 'mishna-megillah', 4),
    ('מועד קטן', 'Mishnah Moed Katan', 'mishna-moed-katan', 3),
    ('חגיגה', 'Mishnah Chagigah', 'mishna-chagigah', 3),
    ('יבמות', 'Mishnah Yevamot', 'mishna-yevamot', 16),
    ('כתובות', 'Mishnah Ketubot', 'mishna-ketubot', 13),
    ('נדרים', 'Mishnah Nedarim', 'mishna-nedarim', 11),
    ('נזיר', 'Mishnah Nazir', 'mishna-nazir', 9),
    ('סוטה', 'Mishnah Sotah', 'mishna-sotah', 9),
    ('גיטין', 'Mishnah Gittin', 'mishna-gittin', 9),
    ('קידושין', 'Mishnah Kiddushin', 'mishna-kiddushin', 4),
    ('בבא קמא', 'Mishnah Bava Kamma', 'mishna-bava-kamma', 10),
    ('בבא מציעא', 'Mishnah Bava Metzia', 'mishna-bava-metzia', 10),
    ('בבא בתרא', 'Mishnah Bava Batra', 'mishna-bava-batra', 10),
    ('סנהדרין', 'Mishnah Sanhedrin', 'mishna-sanhedrin', 11),
    ('מכות', 'Mishnah Makkot', 'mishna-makkot', 3),
    ('שבועות', 'Mishnah Shevuot', 'mishna-shevuot', 8),
    ('עדיות', 'Mishnah Eduyot', 'mishna-eduyot', 8),
    ('אבות', 'Mishnah Avot', 'mishna-avot', 5),
    ('עבודה זרה', 'Mishnah Avodah Zarah', 'mishna-avodah-zarah', 5),
    ('הוריות', 'Mishnah Horayot', 'mishna-horayot', 3),
    ('זבחים', 'Mishnah Zevachim', 'mishna-zevachim', 14),
    ('מנחות', 'Mishnah Menachot', 'mishna-menachot', 13),
    ('חולין', 'Mishnah Chullin', 'mishna-chullin', 12),
    ('בכורות', 'Mishnah Bekhorot', 'mishna-bekhorot', 9),
    ('ערכין', 'Mishnah Arakhin', 'mishna-arakhin', 9),
    ('תמורה', 'Mishnah Temurah', 'mishna-temurah', 7),
    ('כריתות', 'Mishnah Keritut', 'mishna-kritot', 6),
    ('מעילה', 'Mishnah Meilah', 'mishna-meilah', 6),
    ('תמיד', 'Mishnah Tamid', 'mishna-tamid', 7),
    ('מידות', 'Mishnah Middot', 'mishna-middot', 5),
    ('קינים', 'Mishnah Kinnim', 'mishna-kinnim', 3),
    ('כלים', 'Mishnah Kelim', 'mishna-kelim', 30),
    ('אהלות', 'Mishnah Oholot', 'mishna-oholot', 18),
    ('נגעים', 'Mishnah Negaim', 'mishna-negaim', 14),
    ('פרה', 'Mishnah Parah', 'mishna-parah', 12),
    ('טהרות', 'Mishnah Taharot', 'mishna-teharot', 10),
    ('מקואות', 'Mishnah Mikvaot', 'mishna-mikvaot', 10),
    ('נדה', 'Mishnah Niddah', 'mishna-niddah', 10),
    ('מכשירין', 'Mishnah Makhshirin', 'mishna-makhshirin', 6),
    ('זבים', 'Mishnah Zavim', 'mishna-zavim', 5),
    ('טבול יום', 'Mishnah Tevul Yom', 'mishna-tevul-yom', 10),
    ('ידים', 'Mishnah Yadayim', 'mishna-yadayim', 4),
    ('עוקצין', 'Mishnah Ukts.', 'mishna-uktzin', 3),
]


def api(path, retries=3):
    url = BASE + path
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'ajew.org-mishna-import/1.0'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def clean(s):
    if not isinstance(s, str):
        return ''
    return s.strip()


def fetch_masechet(sef_title, cap):
    """Per-perek fetch; stop at first empty chapter. Returns ch map."""
    ch = {}
    for p in range(1, cap + 1):
        try:
            data = api('/texts/' + urllib.parse.quote(f'{sef_title} {p}', safe='') + '?context=0&commentary=0')
        except Exception as e:
            print(f'  perek {p}: error {e}')
            break
        he = data.get('he')
        if not isinstance(he, list) or not he:
            break
        mishnayos = [clean(x) for x in he if clean(x)]
        if not mishnayos:
            break
        ch[str(p)] = mishnayos
        time.sleep(0.3)
    return ch


def main():
    os.makedirs(OUT, exist_ok=True)
    ok = 0
    for label, sef_title, slug, cap in MASECHTOT:
        dst = os.path.join(OUT, slug + '.json')
        if os.path.exists(dst):
            ok += 1
            continue
        ch = fetch_masechet(sef_title, cap)
        if not ch:
            print(f'FAIL: {sef_title}')
            continue
        with open(dst, 'w', encoding='utf-8') as f:
            json.dump({'name': sef_title, 'label': label, 'ch': ch}, f, ensure_ascii=False, separators=(',', ':'))
        total = sum(len(v) for v in ch.values())
        print(f'{sef_title}: {len(ch)} perakim, {total} mishnayos -> {slug}')
        ok += 1
        time.sleep(0.5)
    print(f'done: {ok}/{len(MASECHTOT)}')


if __name__ == '__main__':
    main()
