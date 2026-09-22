#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build kavanos-for-chok-learning data from the chok's own hakdamos
(Torat Emet edition, CC-2.5; text: R' Chaim Vital's seder via Mahar"ch,
with the Chida's and Rokeach's notes).

Output: public/reader/chok/kavanos-chok.json
  {
    "tefillos": { "torah": "...", "navi": "...", "kesuvim": "...",
                  "mishna": "...", "halacha": "...", "kabbala": "...",
                  "talmud": "...", "shishi": "...", "yom_shabbat": "..." },
    "mishna_seder": { "זרעים": "...", ... },
    "halacha_seder": { ... },
    "talmud_seder": { ... },
    "notes": [ ... hakdamos highlights ... ]
  }
"""
import json
import os
import re

SRC = '/root/.hermes/cache/web/www.toratemetfreeware.com-2327da3052.md'
OUT = '/root/ajew-org/public/reader/chok/kavanos-chok.json'

MISHNA_SEDER = {
    'ברכות': 'זרעים', 'פאה': 'זרעים', 'דמאי': 'זרעים', 'כלאים': 'זרעים',
    'שביעית': 'זרעים', 'תרומות': 'זרעים', 'מעשרות': 'זרעים', 'מעשר שני': 'זרעים',
    'חלה': 'זרעים', 'ערלה': 'זרעים', 'ביכורים': 'זרעים',
    'שבת': 'מועד', 'עירובין': 'מועד', 'פסחים': 'מועד', 'שקלים': 'מועד',
    'יומא': 'מועד', 'סוכה': 'מועד', 'ביצה': 'מועד', 'ראש השנה': 'מועד',
    'תענית': 'מועד', 'מגילה': 'מועד', 'מועד קטן': 'מועד', 'חגיגה': 'מועד',
    'יבמות': 'נשים', 'כתובות': 'נשים', 'נדרים': 'נשים', 'נזיר': 'נשים',
    'סוטה': 'נשים', 'גיטין': 'נשים', 'קידושין': 'נשים',
    'בבא קמא': 'נזיקין', 'בבא מציעא': 'נזיקין', 'בבא בתרא': 'נזיקין',
    'סנהדרין': 'נזיקין', 'מכות': 'נזיקין', 'שבועות': 'נזיקין',
    'עדיות': 'נזיקין', 'עבודה זרה': 'נזיקין', 'אבות': 'נזיקין', 'הוריות': 'נזיקין',
    'זבחים': 'קדשים', 'מנחות': 'קדשים', 'חולין': 'קדשים', 'בכורות': 'קדשים',
    'ערכין': 'קדשים', 'תמורה': 'קדשים', 'כריתות': 'קדשים', 'מעילה': 'קדשים',
    'תמיד': 'קדשים', 'מידות': 'קדשים', 'קינים': 'קדשים',
    'כלים': 'טהרות', 'אהלות': 'טהרות', 'נגעים': 'טהרות', 'פרה': 'טהרות',
    'טהרות': 'טהרות', 'מקואות': 'טהרות', 'נדה': 'טהרות', 'מכשירין': 'טהרות',
    'זבים': 'טהרות', 'טבול יום': 'טהרות', 'ידים': 'טהרות', 'עוקצים': 'טהרות',
}

RAMBAM_SEDER = {
    'זרעים': ['ברכות', 'כלאים', 'תרומות', 'מעשרות', 'מעשר שני', 'שמיטה ויובל', 'מתנות עניים', 'תרומת הדשן', 'ביכורים ושאר מתנות כהונה שבגבולין', 'שביעית ויובל'],
    'מועד': ['שבת', 'עירובין', 'שקיטה ביום טוב', 'שבתות וראשי חדשים', 'תפלה וברכת כהנים', 'תפילה וברכת כהנים', 'קריאת שמע', 'ברכות', 'מילה', 'שופר וסוכה', 'לולב', 'שופר וסוכה ולולב', 'הלל', 'שקלים', 'קידוש החדש', 'תעניות', 'מגילה וחנוכה', 'מגילה', 'חנוכה', 'שביתת יום טוב', 'יום טוב', 'שביתת עשור', 'שביתה במקדש', 'קרבן פסח', 'חגיגה'],
    'נשים': ['אישות', 'גירושין', 'ייבום וחליצה', 'סוטה', 'נערה בתולה', 'סוטה'],
    'קדשים': ['קרבנות', 'קרבן פסח', 'חגיגה', 'בכורות', 'שגגות', 'מחוסרי כפרה', 'תמורה', 'קדושת המקדש', 'מעשה הקרבנות', 'עבודת יום הכפורים', 'ערכי וחרמי', 'בית הבחירה', 'כלי המקדש והעובדים בו', 'איסורי המזבח'],
    'נזיקין': ['נזיקין', 'גזלה ואבדה', 'גניבה', 'חובל ומזיק', 'רוצח ושמירת נפש', 'מכירה', 'זכיה ומתנה', 'שכנים', 'שותפין', 'שלוחין ושותפין', 'שערים', 'שכירות', 'שאלה ופיקדון', 'שאלה', 'מלווה ומלוה', 'טוען ונטען', 'נחלות', 'שמיטין ויובלות', 'שכירות', 'שאלה ופקדון', 'הלכות שכנים'],
    'טהרות': ['כלים', 'מטמאי משכב ומושב', 'מטמאי משכב ומושב', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים', 'מטמאי מתים'],
}

SHELACH = ['הקדמות', 'מעשה רוקח']


def read_text():
    t = open(SRC, encoding='utf-8').read()
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', t)
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    return t


def grab(clean, start_marker, end_marker):
    i = clean.rfind(start_marker)
    if i < 0:
        return ''
    j = clean.find(end_marker, i + len(start_marker))
    if j < 0:
        return ''
    seg = re.sub(r'\s+', ' ', re.sub(r'\*\*', '', clean[i:j])).strip()
    return seg


def main():
    text = read_text()
    ends = {
        'torah': 'תפלה לאומרה קודם קריאת נביאים',
        'navi': 'תפלה לאומרה קודם קריאת כתובים',
        'kesuvim': 'תפלה לאומרה קודם לימוד משנה',
        'mishna': 'תפלה לאומרה קודם לימוד הלכה',
        'halacha': 'עוד יחוד א',
        'kabbala': 'נוסחי דווקני',
    }
    heads = {
        'torah': 'תפלה לאומרה קודם קריאת התורה',
        'navi': 'תפלה לאומרה קודם קריאת נביאים',
        'kesuvim': 'תפלה לאומרה קודם קריאת כתובים',
        'mishna': 'תפלה לאומרה קודם לימוד משנה',
        'halacha': 'תפלה לאומרה קודם לימוד הלכה',
        'kabbala': 'תפלה לאומרה קודם לימוד קבלה',
    }
    tefillos = {}
    for k in heads:
        seg = grab(text, heads[k], ends[k])
        tefillos[k] = seg
    # talmud kavana from the intro paragraph
    m = re.search(r'וכשיקרא תלמוד\*\*([^*]+)', text)
    tefillos['talmud'] = re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''
    # the Thursday-night 26-verse tefilla (appears twice; take first)
    m2 = re.search(r'הריני מכוון בקריאת כ״\'?\'? ?פסוקים אלו[^\n]+(?:\n(?!\*\*)[^\n]+)*', text)
    if not m2:
        m2 = re.search(r'הריני מכוון בקריאת כ.{0,4} ?פסוקים אלו.*?כן יהיה רצון', text, re.S)
    tefillos['shishi'] = re.sub(r'\s+', ' ', m2.group(0)).strip() if m2 else ''
    # seder-specific segments
    mishna_seder, halacha_seder, talmud_seder = {}, {}, {}
    for seder, he in (('זרעים', 'בסדר זרעים'), ('מועד', 'בסדר מועד'), ('נשים', 'בסדר נשים'),
                      ('נזיקין', 'בסדר נזיקין'), ('קדשים', 'בסדר קדשים'), ('טהרות', 'בסדר טהרות')):
        m = re.search(r'(?:וכשהוא לומד|\(כשהוא לומד) \*\*בסדר %s\*\* יאמר כך\)([^\n]+)' % seder, text)
        if m:
            mishna_seder[seder] = re.sub(r'\s+', ' ', m.group(1)).strip()
        m = re.search(r'\(וכשהוא לומד \*\*הלכה בסדר %s\*\* יאמר כך\)([^\n]+)' % seder, text)
        if m:
            halacha_seder[seder] = re.sub(r'\s+', ' ', m.group(1)).strip()
    # talmud per-seder names from the intro paragraph
    t = tefillos['talmud']
    for seder, shem in (('זרעים', 'אלף למד'), ('מועד', 'אכדטם'), ('נשים', 'השתפא'),
                        ('נזיקין', 'בם'), ('קדשים', 'במוכן'), ('טהרות', 'ש שד שדי')):
        m = re.search(r'סדר %s[^.]*\. וה[\'״] הוא \(([^)]+)\)' % seder, t)
        talmud_seder[seder] = shem
    out = {
        'source': 'חק לישראל הקדמות (מהדורת תורה אמט, CC-2.5) — סדר רבי חיים ויטל זצ״ל מהרח״ו, עם הערות החיד״א ומעשה רוקח',
        'tefillos': tefillos,
        'mishna_seder': mishna_seder,
        'halacha_seder': halacha_seder,
        'talmud_seder': talmud_seder,
        'masechta_seder': MISHNA_SEDER,
    }
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('tefillos keys:', list(tefillos.keys()))
    for k in ('torah', 'mishna', 'halacha', 'kabbala'):
        print(k, 'len:', len(tefillos.get(k, '')))
    print('mishna_seder:', {k: len(v) for k, v in mishna_seder.items()})
    print('halacha_seder:', {k: len(v) for k, v in halacha_seder.items()})
    print('shishi len:', len(tefillos.get('shishi', '')))


if __name__ == '__main__':
    main()
