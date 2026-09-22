#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate OUR chok year's Shabbos map (shabbos-map.json).

Independence law: the chok runs its OWN yearly cycle, not the calendar
parshiyos. Anchor (user, 2026-09-22): the cycle's final week,
וזאת הברכה, falls on Shabbos 2026-09-19 - i.e. the chok year began
בראשית on Shabbos 2025-09-13 and the new year starts Shabbos 2026-09-26.

The 54 week keys and their order are ours (schedule.json).
Hebrew dates via pyluach (Tishrei=1 ordering, as the old map used).
"""
import json, os, datetime
from pyluach import dates

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader', 'chok')
SCHED = os.path.join(BASE, 'schedule.json')
OUT = os.path.join(BASE, 'shabbos-map.json')

ANCHOR_LAST_SHABBOS = datetime.date(2026, 9, 19)   # Shabbos of וזאת הברכה
CYCLES_FORWARD = 3                                  # new years from 2026-09-26

def heb_str(d):
    h = dates.GregorianDate(d.year, d.month, d.day).to_heb()
    return '%d-%d-%d' % (h.year, h.month, h.day)

def main():
    sched = json.load(open(SCHED, encoding='utf-8'))
    weeks = list(sched['weeks'].keys())
    n = len(weeks)
    assert weeks[-1] == 'וזאת הברכה', weeks[-1]
    entries = []
    # the cycle now ending: anchored so its last week = 2026-09-19
    for i, wk in enumerate(weeks):
        d = ANCHOR_LAST_SHABBOS - datetime.timedelta(days=7 * (n - 1 - i))
        entries.append({'date': d.isoformat(), 'heb': heb_str(d), 'weeks': [wk]})
    # fresh cycles forward, repeating our seder
    start = ANCHOR_LAST_SHABBOS + datetime.timedelta(days=7)  # 2026-09-26 = בראשית
    for c in range(CYCLES_FORWARD):
        base = start + datetime.timedelta(days=7 * n * c)
        for i, wk in enumerate(weeks):
            d = base + datetime.timedelta(days=7 * i)
            entries.append({'date': d.isoformat(), 'heb': heb_str(d), 'weeks': [wk]})
    entries.sort(key=lambda e: e['date'])
    json.dump(entries, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
    print('weeks:', n, '| entries:', len(entries))
    print('first:', entries[0])
    print('anchor:', [e for e in entries if e['date'] == '2026-09-19'])
    print('next year start:', [e for e in entries if e['date'] == '2026-09-26'])
    print('last:', entries[-1])

if __name__ == '__main__':
    main()
