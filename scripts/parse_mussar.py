#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Parse the Chok's mussar labels (Torat Emet free text) into our structure.

Two shapes in the wild:
  1. 'מוסר <sefer> דף <g> ע''ד/ע''ב <opening-words...>'  - ref day (needs text
     ingest later; Sefaria seforim are section-numbered, edition mapping pending)
  2. 'מוסר <sefer> <full quote...>'                      - the text is inline!

Output: public/reader/chok/mussar.json
  {days: {'<week>|<day>': {sefer, daf, amud, text}}}
"""
import json, os, re

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader', 'chok')
SCHED = os.path.join(BASE, 'schedule.json')

SEFER_FIX = {
    "שערי תשובה": "שערי תשובה לרבינו יונה",
    "משערי תשובה לר''י": "שערי תשובה לרבינו יונה",
    "משערי תשובה לרבינו יונה": "שערי תשובה לרבינו יונה",
    "מספר חרדים": "ספר חסידים",
    "מספר צידה לדרך": "צידה לדרך",
    "מספר הרוקח": "ספר הרוקח",
    "מספר סדר היום": "סדר היום",
    "מספר הישר והוא לרבי זרחיה מיוני ולא לר''ת": "ספר הישר",
    "מספר תוצאות חיים": "תוצאות חיים",
    "מספר שערי קדושה": "שערי קדושה",
    "מרגניתא דר' מאיר": "מרגניתא דרבי מאיר",
    "מרגניתא דרבי מאיר": "מרגניתא דרבי מאיר",
    "מהזה''ק ח''ב": "זוהר חדש חלק ב",
}
GEM = {'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
       'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80,
       'צ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400}

def gem(s):
    s = re.sub(r"[״'\"׳]", '', (s or '')).strip()
    return sum(GEM.get(ch, 0) for ch in s)

def parse(label):
    lab = label.strip()
    if not lab.startswith('מוסר'):
        return None
    lab = lab[len('מוסר'):].strip()
    # find sefer: longest matching prefix
    sefer, rest = None, lab
    for cand in sorted(SEFER_FIX, key=len, reverse=True):
        if lab.startswith(cand):
            sefer, rest = SEFER_FIX[cand], lab[len(cand):].strip()
            break
    if sefer is None:
        m = re.match(r'([\u05d0-\u05ea"׳\- ]+?)\s+(דף\s+|.+$)', lab)
        if not m:
            return None
        sefer, rest = m.group(1).strip(), m.group(2)
    daf = amud = None
    m = re.search(r'דף\s+([\u05d0-\u05ea"׳]+)\s+ע[\'״]{1,2}([דבא])\b', rest)
    if m:
        daf, amud = gem(m.group(1)), {'א': 1, 'ב': 2, 'ד': 2}.get(m.group(2), 1)
        text = rest[m.end():].strip()
    else:
        m2 = re.search(r'דף\s+([\u05d0-\u05ea"׳]+)', rest)
        if m2:
            daf = gem(m2.group(1))
            text = rest[m2.end():].strip()
        else:
            text = rest
    return {'sefer': sefer, 'daf': daf, 'amud': amud, 'text': text or None}

def main():
    sched = json.load(open(SCHED, encoding='utf-8'))
    out, stats = {'days': {}}, {'ref': 0, 'inline': 0}
    for wk, w in sched['weeks'].items():
        for dn, dv in w['days'].items():
            mu = dv.get('mussar') or {}
            lab = mu.get('label') or ''
            if not lab:
                continue
            p = parse(lab)
            if not p:
                continue
            key = wk + '|' + dn
            out['days'][key] = p
            stats['inline' if p['text'] and not p['daf'] else 'ref'] += 1
    json.dump(out, open(os.path.join(BASE, 'mussar.json'), 'w', encoding='utf-8'),
              ensure_ascii=False)
    print(stats)
    n_text = sum(1 for v in out['days'].values() if v['text'])
    print('days with inline text:', n_text, '/', len(out['days']))
    sample = list(out['days'].items())[0]
    print('sample:', sample[0], json.dumps(sample[1], ensure_ascii=False)[:140])

if __name__ == '__main__':
    main()
