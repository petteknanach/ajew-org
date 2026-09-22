#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch the JPS 1917 English Tanach (public domain) from English Wikisource
for the chok's Tanach layers. Whole-book pages, verse anchors 'C:V'.

Output: public/reader/tanachen/<our tanach slug>.json
  {ch: {c: [v1, v2, ...]}}
"""
import json, os, re, time, urllib.request, urllib.parse

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'reader')
OUT = os.path.join(BASE, 'tanachen')
UA = {'User-Agent': 'ajew.org-tanachen/1.0 (ajew.org)'}
PREFIX = 'Bible (Jewish Publication Society 1917)/'

BOOKS = {
    'tanach-bereishit': 'Genesis', 'tanach-shemos': 'Exodus',
    'tanach-vayikra': 'Leviticus', 'tanach-bamidbar': 'Numbers',
    'tanach-devarim': 'Deuteronomy', 'tanach-yehoshua': 'Joshua',
    'tanach-shoftim': 'Judges', 'tanach-shmuel-a': 'I Samuel',
    'tanach-shmuel-b': 'II Samuel', 'tanach-melachim-a': 'I Kings',
    'tanach-melachim-b': 'II Kings', 'tanach-yeshayahu': 'Isaiah',
    'tanach-yirmiyahu': 'Jeremiah', 'tanach-yechezkel': 'Ezekiel',
    'tanach-hoshea': 'Hosea', 'tanach-yoel': 'Joel', 'tanach-amos': 'Amos',
    'tanach-ovadya': 'Obadiah', 'tanach-yonah': 'Jonah', 'tanach-michah': 'Micah',
    'tanach-nachum': 'Nahum', 'tanach-havakkuk': 'Habakkuk',
    'tanach-tzefanya': 'Zephaniah', 'tanach-chaggai': 'Haggai',
    'tanach-zecharya': 'Zechariah', 'tanach-malachi': 'Malachi',
    'tanach-tehillim': 'Psalms', 'tanach-mishlei': 'Proverbs',
    'tanach-iyov': 'Job', 'tanach-shir-hashirim': 'Song of Songs',
    'tanach-rus': 'Ruth', 'tanach-eicha': 'Lamentations',
    'tanach-koheles': 'Ecclesiastes', 'tanach-esther': 'Esther',
    'tanach-daniel': 'Daniel', 'tanach-ezra': 'Ezra',
    'tanach-nechemia': 'Nehemiah', 'tanach-divrei-hayamim-a': 'I Chronicles',
    'tanach-divrei-hayamim-b': 'II Chronicles',
}

def ws_page(title):
    url = 'https://en.wikisource.org/w/api.php?' + urllib.parse.urlencode({
        'action': 'parse', 'page': title, 'prop': 'text', 'format': 'json'})
    last = None
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=90) as r:
                d = json.loads(r.read().decode())
            time.sleep(2.5)
            return d['parse']['text']['*']
        except Exception as e:
            last = e
            time.sleep(min(60, 6 * (attempt + 1)))
    raise RuntimeError('ws failed %s: %s' % (title, str(last)[:60]))

def clean(x):
    x = re.sub(r'<style[\s\S]*?</style>', '', x)
    x = re.sub(r'<sup[^>]*>[\s\S]*?</sup>', '', x)
    x = re.sub(r'<[^>]+>', ' ', x)
    x = x.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<') \
         .replace('&gt;', '>').replace('&quot;', '"').replace('&#160;', ' ')
    return re.sub(r'\s+', ' ', x).strip()

def main():
    os.makedirs(OUT, exist_ok=True)
    n = 0
    for slug, wsname in sorted(BOOKS.items()):
        dst = os.path.join(OUT, slug + '.json')
        if os.path.exists(dst):
            continue
        html = ws_page(PREFIX + wsname)
        # strip big style blocks once up front
        html = re.sub(r'<style[\s\S]*?</style>', '', html)
        parts = re.split(r'id="(\d+:\d+)"', html)
        ch = {}
        # parts: [pre, '1:1', text1, '1:2', text2, ...]
        for i in range(1, len(parts) - 1, 2):
            c, v = parts[i].split(':')
            text = clean(parts[i + 1])
            # drop the leading verse number token
            text = re.sub(r'^\d+\s*[.:)]?\s*', '', text)
            text = re.sub(r'^[^A-Za-z0-9(\"\u201c]+', '', text)
            if len(text) > 12:
                ch.setdefault(c, []).append(text)
        if not ch:
            print('EMPTY', slug)
            continue
        json.dump({'name': wsname, 'ch': ch}, open(dst, 'w', encoding='utf-8'),
                  ensure_ascii=False)
        n += 1
        print(slug, '<-', wsname, len(ch), 'chapters')
    print('done: %d books' % n)

if __name__ == '__main__':
    main()
