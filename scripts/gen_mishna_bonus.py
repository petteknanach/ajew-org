#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate mishna-bonus.json: distribute the mishna perakim that the Chok's
daily cycle does NOT already learn, evenly across every day of the year, so a
person learning the Chok daily + the daily bonus finishes the ENTIRE Mishna
every year.

Ours end to end: reads OUR schedule.json + OUR mishna/*.json; the seder order
below is the traditional order of the Mishna itself (written here by us); the
day sequence is the Chok's own week order starting at Bereshis.

Output: public/reader/chok/mishna-bonus.json
  {meta: {...}, weeks: {<week>: {<day>: [{slug, perek, he}]}}}
Every day gets at most one bonus perek.
"""
import json, os, re

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader')
MISHNA = os.path.join(BASE, 'mishna')
SCHED = os.path.join(BASE, 'chok', 'schedule.json')
OUT = os.path.join(BASE, 'chok', 'mishna-bonus.json')

# The traditional order of the Mishna, written by us (slug = our file name stem).
SEDERIM = [
    # Zeraim
    ['mishna-berakhot', 'mishna-peah', 'mishna-demai', 'mishna-kilayim',
     'mishna-sheviit', 'mishna-terumot', 'mishna-maasrot', 'mishna-maaser-sheni',
     'mishna-challah', 'mishna-orlah', 'mishna-bikkurim'],
    # Moed
    ['mishna-shabbat', 'mishna-eruvin', 'mishna-pesachim', 'mishna-shekalim',
     'mishna-yoma', 'mishna-sukkah', 'mishna-beitzah', 'mishna-rosh-hashanah',
     'mishna-taanit', 'mishna-megillah', 'mishna-moed-katan', 'mishna-chagigah'],
    # Nashim
    ['mishna-yevamot', 'mishna-ketubot', 'mishna-nedarim', 'mishna-nazir',
     'mishna-sotah', 'mishna-gittin', 'mishna-kiddushin'],
    # Nezikin
    ['mishna-bava-kamma', 'mishna-bava-metzia', 'mishna-bava-batra',
     'mishna-sanhedrin', 'mishna-makkot', 'mishna-shevuot', 'mishna-eduyot',
     'mishna-avodah-zarah', 'mishna-avot', 'mishna-horayot'],
    # Kodashim
    ['mishna-zevachim', 'mishna-menachot', 'mishna-chullin', 'mishna-bekhorot',
     'mishna-arakhin', 'mishna-temurah', 'mishna-kritot', 'mishna-meilah',
     'mishna-tamid', 'mishna-middot', 'mishna-kinnim'],
    # Taharos
    ['mishna-kelim', 'mishna-oholot', 'mishna-negaim', 'mishna-parah',
     'mishna-teharot', 'mishna-mikvaot', 'mishna-niddah', 'mishna-makhshirin',
     'mishna-zavim', 'mishna-tevul-yom', 'mishna-yadayim', 'mishna-uktzin'],
]
HEBREW = {
    'mishna-berakhot': 'ברכות', 'mishna-peah': 'פאה', 'mishna-demai': 'דמאי',
    'mishna-kilayim': 'כלאים', 'mishna-sheviit': 'שביעית', 'mishna-terumot': 'תרומות',
    'mishna-maasrot': 'מעשרות', 'mishna-maaser-sheni': 'מעשר שני', 'mishna-challah': 'חלה',
    'mishna-orlah': 'ערלה', 'mishna-bikkurim': 'ביכורים',
    'mishna-shabbat': 'שבת', 'mishna-eruvin': 'עירובין', 'mishna-pesachim': 'פסחים',
    'mishna-shekalim': 'שקלים', 'mishna-yoma': 'יומא', 'mishna-sukkah': 'סוכה',
    'mishna-beitzah': 'ביצה', 'mishna-rosh-hashanah': 'ראש השנה', 'mishna-taanit': 'תענית',
    'mishna-megillah': 'מגילה', 'mishna-moed-katan': 'מועד קטן', 'mishna-chagigah': 'חגיגה',
    'mishna-yevamot': 'יבמות', 'mishna-ketubot': 'כתובות', 'mishna-nedarim': 'נדרים',
    'mishna-nazir': 'נזיר', 'mishna-sotah': 'סוטה', 'mishna-gittin': 'גיטין',
    'mishna-kiddushin': 'קידושין',
    'mishna-bava-kamma': 'בבא קמא', 'mishna-bava-metzia': 'בבא מציעא',
    'mishna-bava-batra': 'בבא בתרא', 'mishna-sanhedrin': 'סנהדרין', 'mishna-makkot': 'מכות', 'mishna-shevuot': 'שבועות',
    'mishna-eduyot': 'עדיות', 'mishna-avodah-zarah': 'עבודה זרה', 'mishna-avot': 'אבות',
    'mishna-horayot': 'הוריות',
    'mishna-zevachim': 'זבחים', 'mishna-menachot': 'מנחות', 'mishna-chullin': 'חולין',
    'mishna-bekhorot': 'בכורות', 'mishna-arakhin': 'ערכין', 'mishna-temurah': 'תמורה',
    'mishna-kritot': 'כריתות', 'mishna-meilah': 'מעילה', 'mishna-tamid': 'תמיד',
    'mishna-middot': 'מדות', 'mishna-kinnim': 'קינים',
    'mishna-kelim': 'כלים', 'mishna-oholot': 'אהלות', 'mishna-negaim': 'נגעים',
    'mishna-parah': 'פרה', 'mishna-teharot': 'טהרות', 'mishna-mikvaot': 'מקואות',
    'mishna-niddah': 'נדה', 'mishna-makhshirin': 'מכשירין', 'mishna-zavim': 'זבים',
    'mishna-tevul-yom': 'טבול יום', 'mishna-yadayim': 'ידים', 'mishna-uktzin': 'עוקצים',
}
DAY_ORDER = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי',
             'יום חמישי', 'ליל שישי', 'יום שישי']

# Label normalisation mirroring chok.js normLabel (our own rules).
EXPAND = {'בק': 'בבא קמא', 'במ': 'בבא מציעא', 'בב': 'בבא בתרא', 'רה': 'ראש השנה',
          'עז': 'עבודה זרה', 'מק': 'מכות', 'שבועות': 'שבועות', 'קידושין': 'קידושין'}

def norm(t):
    t = re.sub(r"[״'\"׳.]", '', (t or '')).strip()
    t = re.sub(r'^מסכת\s+', '', t)
    return EXPAND.get(t, t)

# slug -> Hebrew label lookup, reversed
HE2SLUG = {he: sl for sl, he in HEBREW.items()}

def main():
    files = {f[:-5] for f in os.listdir(MISHNA) if f.endswith('.json')}
    placed = [sl for seder in SEDERIM for sl in seder]
    assert set(placed) == files, ('slug mismatch', sorted(files ^ set(placed)))

    slug2perakim = {}
    for f in sorted(os.listdir(MISHNA)):
        d = json.load(open(os.path.join(MISHNA, f), encoding='utf-8'))
        slug2perakim[f[:-5]] = sorted(int(k) for k in d['ch'])

    sched = json.load(open(SCHED, encoding='utf-8'))
    weeks = list(sched['weeks'].keys())
    # our year starts at Bereshis
    if 'בראשית' in weeks and weeks[0] != 'בראשית':
        i = weeks.index('בראשית')
        weeks = weeks[i:] + weeks[:i]

    # covered pairs from the Chok's own daily cycle
    covered = set()
    for wk in weeks:
        for day, v in sched['weeks'][wk]['days'].items():
            mref = v.get('mishna') or {}
            sl = HE2SLUG.get(norm(mref.get('masechet')))
            if sl and mref.get('perek') and sl in slug2perakim and mref['perek'] in slug2perakim[sl]:
                covered.add((sl, mref['perek']))

    # remainder in seder order
    remainder = [(sl, p) for sl in placed for p in slug2perakim[sl] if (sl, p) not in covered]

    # day slots in Chok order
    slots = []
    for wk in weeks:
        for day in DAY_ORDER:
            if day in sched['weeks'][wk]['days']:
                slots.append((wk, day))

    N, M = len(slots), len(remainder)
    assert M <= N, (M, N)
    weeks_out = {}
    total = 0
    for idx, (wk, day) in enumerate(slots):
        before = idx * M // N
        after = (idx + 1) * M // N
        items = []
        for k in range(before, after):
            sl, p = remainder[k]
            items.append({'slug': sl, 'perek': p, 'he': HEBREW[sl]})
            total += 1
        if items:
            weeks_out.setdefault(wk, {})[day] = items

    out = {'meta': {
        'title': 'בונוס לסיום כל המשנה',
        'note': 'the Chok daily mishna covers most of Shas; these are the remaining perakim, spread across the year',
        'chok_perakim': len(covered), 'bonus_perakim': total,
        'total_perakim': len(covered) + total, 'days': len(slots),
    }, 'weeks': weeks_out}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    per_day = {wk: sum(len(v) for v in d.values()) for wk, d in weeks_out.items()}
    print('days:', len(slots), '| chok perakim:', len(covered), '| bonus:', total,
          '| sum:', len(covered) + total)
    print('weeks with bonus:', len(weeks_out), '| max per week:', max(per_day.values()))
    first = [(wk, d, i) for wk, dd in weeks_out.items() for d, ii in dd.items() for i in ii]
    print('first three:', first[:3])

if __name__ == '__main__':
    main()
