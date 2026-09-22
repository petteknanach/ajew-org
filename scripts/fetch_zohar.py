#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch the daily Zohar amudim referenced by the Chok schedule from Hebrew
Wikisource, using the volume daf-page family ('זהר חלק N <daf> <amud>') whose
traditional pagination matches Torat Emet's refs directly. (Sefaria was
rejected: their Zohar section spans don't match traditional numbering.)

Hebrew/Aramaic only - ancient public-domain text. One-time import.

Output: public/reader/zohar/<vol-slug>.json
  {name, ch: {daf: {a: [lines], b: [lines]}}}
"""
import json, os, re, time, urllib.request, urllib.parse

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader')
SCHED = os.path.join(BASE, 'chok', 'schedule.json')
UA = {'User-Agent': 'ajew.org-zohar-import/1.0 (ajew.org)'}

def api(params):
    url = 'https://he.wikisource.org/w/api.php?' + urllib.parse.urlencode(params)
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            if '429' in str(e):
                time.sleep(10 * (attempt + 1))
            else:
                raise
    raise RuntimeError('rate limited')

def rendered(title):
    return api({'action': 'parse', 'page': title, 'prop': 'text',
                'format': 'json', 'maxlag': 5})['parse']['text']['*']

def _g(num):
    """number -> Hebrew gematria string (ours); 15/16 kept as tav-ayin/vav."""
    HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק']
    TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
    ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
    out = ''
    while num >= 500:
        out += 'ת'
        num -= 400
    h = num // 100
    if h:
        out += HUNDREDS[h]
        num %= 100
    if num == 15:
        return out + 'טו'
    if num == 16:
        return out + 'טז'
    if num >= 10:
        out += TENS[num // 10]
        num %= 10
    return out + ONES[num]

def slug(v):
    return 'zohar-' + re.sub(r'[״\'"׳]', '', v).strip().replace(' ', '-')

# TE parsha label -> Zohar volume number (traditional 3-volume scheme, ours)
V1 = {'בראשית', 'נח', 'לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישב', 'מקץ',
      'ויגש', 'ויחי', 'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה',
      'תצוה', 'תשא', 'ויקהל', 'פקודי', 'הקדמה'}
V3 = {'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי', 'אחרי מות', 'קדושים',
      'אמור', 'אמר', 'בהר', 'בחקותי', 'בחקתי', 'במדבר', 'נשא', 'בהעלתך', 'שלח',
      'קרח', 'חקת', 'חוקת', 'פנחס', 'בלק', 'מטות', 'מסעי', 'דברים', 'ואתחנן',
      'עקב', 'ראה', 'שופטים', 'כי תצא', 'כי תבוא', 'נצבים', 'וילך', 'האזינו',
      'וזאת הברכה', 'וזאת'}

def chalek(v):
    if v in V1:
        return 'א'
    if v in V3:
        return 'ג'
    return 'ב'

def parse_daf_page(html):
    html = re.sub(r'<style[\s\S]*?</style>', '', html)
    html = re.sub(r'<sup[\s\S]*?</sup>', '', html)
    paras = re.findall(r'<p[^>]*>([\s\S]*?)</p>', html)
    texts = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', p)).strip() for p in paras]
    return [t for t in texts if len(t) > 25 and not t.startswith('<<')]

def main():
    sched = json.load(open(SCHED, encoding='utf-8'))
    refs = {}
    for w in sched['weeks'].values():
        for v in w['days'].values():
            z = v.get('zohar') or {}
            if (z.get('vol') or z.get('work')) and z.get('daf') and z.get('amud') in (1, 2):
                refs.setdefault(z.get('vol') or z.get('work'), set()).add((int(z['daf']), int(z['amud'])))
    os.makedirs(os.path.join(BASE, 'zohar'), exist_ok=True)
    n = fail = 0
    for vol, wanted in sorted(refs.items()):
        if vol.startswith('חדש'):
            print('skip (different work, stays a card):', vol)
            continue
        ch_num = chalek(vol)
        dst = os.path.join(BASE, 'zohar', slug(vol) + '.json')
        data = {'name': vol, 'ch': {}}
        if os.path.exists(dst):
            data = json.load(open(dst, encoding='utf-8'))
            data.setdefault('ch', {})
        for daf, amud in sorted(wanted):
            key = 'a' if amud == 1 else 'b'
            if data['ch'].get(str(daf), {}).get(key):
                continue
            title = 'זהר חלק %s %s %s' % (ch_num, _g(daf), 'א' if amud == 1 else 'ב')
            try:
                lines = parse_daf_page(rendered(title))
            except Exception as e:
                print('FAIL', title, str(e)[:50])
                fail += 1
                time.sleep(3)
                continue
            if lines:
                data['ch'].setdefault(str(daf), {})[key] = lines
                n += 1
            else:
                print('EMPTY', title)
                fail += 1
            time.sleep(2.5)
        if data['ch']:
            json.dump(data, open(dst, 'w', encoding='utf-8'), ensure_ascii=False)
            print('%s (%s): %d dafim cached' % (vol, ch_num, len(data['ch'])))
    print('done: %d fetched, %d fail/empty' % (n, fail))

if __name__ == '__main__':
    main()
