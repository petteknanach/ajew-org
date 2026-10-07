#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate calendar-aligned Chok study-week anchors for Israel.

The current user correction supersedes the former fixed 54-week repetition:
2026-10-06 studies Biraishis, read on 2026-10-10, not Noach.
`date` remains the preceding Saturday anchor expected by chok.js; `heb`
belongs to that anchor. `readingDate`/`readingHeb` identify the actual reading.
Combined portions retain the project's exact separate schedule keys.
After Haazinu, the cycle-conclusion study is Vezos Habracha until Biraishis;
its actual Israel reading is Simchas Torah (22 Tishrei), not an invented
regular Saturday portion. Other festival Saturdays have no invented portion.

One-time generation only: pyluach 2.3.0 calendar calculations; no runtime or
build-time external requests. Source study ranges and texts are not changed.
"""
import argparse
import datetime
import json
from pathlib import Path

from pyluach import dates, parshios

BASE = Path(__file__).resolve().parent.parent / 'public' / 'reader' / 'chok'
ALIASES = {'קרח': 'קורח', 'חקת': 'חוקת', 'כי תבא': 'כי תבוא'}


def heb_str(day):
    heb = dates.GregorianDate.from_pydate(day).to_heb()
    return f'{heb.year}-{heb.month}-{heb.day}'


def generate(schedule, start_year=2024, end_year=2031):
    if start_year > end_year:
        raise ValueError('Invalid calendar year range')
    names = [ALIASES.get(name, name) for name in parshios.PARSHIOS_HEBREW]
    # Verify literal name associations, not just a matching list length.
    if names != list(schedule['weeks']):
        raise ValueError('Calendar names do not match the exact project schedule')
    day = datetime.date(start_year, 1, 1)
    day += datetime.timedelta(days=(5 - day.weekday()) % 7)
    last = datetime.date(end_year, 12, 31)
    entries = {}
    conclusions = []
    while day <= last:
        anchor = day - datetime.timedelta(days=7)
        heb = dates.GregorianDate.from_pydate(day).to_heb()
        indices = parshios.getparsha(heb, israel=True)
        entry = {'date': anchor.isoformat(), 'heb': heb_str(anchor),
                 'readingDate': day.isoformat(), 'readingHeb': heb_str(day),
                 'weeks': [names[index] for index in indices] if indices else None,
                 'israel': True, 'festival': indices is None}
        entries[entry['date']] = entry
        if indices == [52]:
            simchas = dates.HebrewDate(heb.year, 7, 22).to_pydate()
            if simchas <= day:
                raise ValueError('Cycle conclusion does not follow Haazinu')
            conclusions.append({'date': day.isoformat(), 'heb': heb_str(day),
                                'readingDate': simchas.isoformat(),
                                'readingHeb': heb_str(simchas),
                                'weeks': [names[53]], 'israel': True,
                                'festival': True, 'cycleConclusion': True})
        day += datetime.timedelta(days=7)
    for entry in conclusions:
        entries[entry['date']] = entry
    return [entries[key] for key in sorted(entries)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--schedule', type=Path, default=BASE / 'schedule.json')
    parser.add_argument('--output', type=Path, default=BASE / 'shabbos-map.json')
    parser.add_argument('--start-year', type=int, default=2024)
    parser.add_argument('--end-year', type=int, default=2031)
    args = parser.parse_args()
    schedule = json.loads(args.schedule.read_text(encoding='utf-8'))
    entries = generate(schedule, args.start_year, args.end_year)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(entries, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'entries': len(entries), 'first': entries[0], 'last': entries[-1],
                      'israel': True, 'source': 'pyluach 2.3.0; project schedule keys'},
                     ensure_ascii=True))


if __name__ == '__main__':
    main()
