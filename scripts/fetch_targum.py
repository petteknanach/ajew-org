#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ONE-TIME IMPORT (not a build dependency): Targum texts (Onkelos / Jonathan /
Yerushalmi) for the Tikkun Korim shnayim-mikra mode. The Aramaic is an ancient
public-domain text; this script ingests it once into project-owned storage
(public/reader/medooyuk/targum/<slug>.json, {"name": ..., "ch": {"1": {"1": "..."}}}).
No runtime or deploy calls any external site; committed JSONs are the only source.
Books where no text is served get no file (the UI hides the option).
"""
import json, os, time, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'reader', 'medooyuk', 'targum')
MED = os.path.join(HERE, '..', 'public', 'reader', 'medooyuk')

SEFARIA_NAMES = {
 'Genesis': 'Genesis', 'Exodus': 'Exodus', 'Leviticus': 'Leviticus', 'Numbers': 'Numbers',
 'Deuteronomy': 'Deuteronomy', 'Joshua': 'Joshua', 'Judges': 'Judges', 'Samuel_1': 'I Samuel',
 'Samuel_2': 'II Samuel', 'Kings_1': 'I Kings', 'Kings_2': 'II Kings', 'Isaiah': 'Isaiah',
 'Jeremiah': 'Jeremiah', 'Ezekiel': 'Ezekiel', 'Hosea': 'Hosea', 'Joel': 'Joel',
 'Amos': 'Amos', 'Obadiah': 'Obadiah', 'Jonah': 'Jonah', 'Micah': 'Micah', 'Nahum': 'Nahum',
 'Habakkuk': 'Habakkuk', 'Zephaniah': 'Zephaniah', 'Haggai': 'Haggai', 'Zechariah': 'Zechariah',
 'Malachi': 'Malachi', 'Psalms': 'Psalms', 'Proverbs': 'Proverbs', 'Job': 'Job',
 'Song_of_Songs': 'Song of Songs', 'Ruth': 'Ruth', 'Lamentations': 'Lamentations',
 'Ecclesiastes': 'Ecclesiastes', 'Esther': 'Esther', 'Daniel': 'Daniel', 'Ezra': 'Ezra',
 'Nehemiah': 'Nehemiah', 'Chronicles_1': 'I Chronicles', 'Chronicles_2': 'II Chronicles',
}
SLUGS = {
 'Genesis':'tanach-bereishit','Exodus':'tanach-shemos','Leviticus':'tanach-vayikra',
 'Numbers':'tanach-bamidbar','Deuteronomy':'tanach-devarim','Joshua':'tanach-yehoshua',
 'Judges':'tanach-shoftim','Samuel_1':'tanach-shmuel-a','Samuel_2':'tanach-shmuel-b',
 'Kings_1':'tanach-melachim-a','Kings_2':'tanach-melachim-b','Isaiah':'tanach-yeshayahu',
 'Jeremiah':'tanach-yirmiyahu','Ezekiel':'tanach-yechezkel','Hosea':'tanach-hoshea',
 'Joel':'tanach-yoel','Amos':'tanach-amos','Obadiah':'tanach-ovadya','Jonah':'tanach-yonah',
 'Micah':'tanach-michah','Nahum':'tanach-nachum','Habakkuk':'tanach-havakkuk',
 'Zephaniah':'tanach-tzefanya','Haggai':'tanach-chaggai','Zechariah':'tanach-zecharya',
 'Malachi':'tanach-malachi','Psalms':'tanach-tehillim','Proverbs':'tanach-mishlei',
 'Job':'tanach-iyov','Song_of_Songs':'tanach-shir-hashirim','Ruth':'tanach-rus',
 'Lamentations':'tanach-eicha','Ecclesiastes':'tanach-koheles','Esther':'tanach-esther',
 'Daniel':'tanach-daniel','Ezra':'tanach-ezra','Nehemiah':'tanach-nechemia',
 'Chronicles_1':'tanach-divrei-hayamim-a','Chronicles_2':'tanach-divrei-hayamim-b',
}
EXTRA_CANDIDATES = {
 'Chronicles_1': ['Targum of I Chronicles'],
 'Chronicles_2': ['Targum of II Chronicles'],
 # Rishon (the standard tikkun targum) first; Sheni kept only as fallback
 'Esther': ['Aramaic Targum to Esther', 'Targum Sheni on Esther'],
}

# Books whose targum lives in the "Aramaic Targum to X" series (special targumim)
ARAMAIC_SERIES = {'Job', 'Proverbs', 'Ruth', 'Song_of_Songs', 'Ecclesiastes',
                  'Lamentations'}

def candidates(book):
    n = SEFARIA_NAMES[book]
    if book in EXTRA_CANDIDATES:
        return EXTRA_CANDIDATES[book]
    if book in ('Genesis','Exodus','Leviticus','Numbers','Deuteronomy'):
        return [f'Targum Onkelos {n}']
    cands = []
    if book in ARAMAIC_SERIES:
        cands.append(f'Aramaic Targum to {n}')
    cands += [f'Targum Jonathan on {n}', f'Targum {n}']
    return cands

def fetch_json(name, tries=3):
    url = ('https://www.sefaria.org/api/texts/' + urllib.parse.quote(name, safe='')
           + '?context=0&commentary=0')
    err = None
    for a in range(tries):
        req = urllib.request.Request(url, headers={'User-Agent': 'ajew.org-tikkun-builder/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            err = str(e)
            if '503' in err or '429' in err:
                time.sleep(2 + a * 3); continue
            return {'error': err}
    return {'error': err or 'unavailable'}

def flatten(x):
    if isinstance(x, str):
        return x.strip()
    return ' '.join(flatten(i) for i in x if flatten(i))

def book_chapters(book):
    p = os.path.join(MED, SLUGS[book] + '.json')
    if not os.path.exists(p):
        return 0
    with open(p, encoding='utf-8') as f:
        return len(json.load(f)['ch'])

def fetch_whole(name):
    d = fetch_json(name)
    if d.get('error'):
        return None
    # The Aramaic/original targum text lives in the `he` field; `text` is the
    # English translation, which is NOT what a tikkun targum needs.
    text = d.get('he') or d.get('text')
    if not text:
        return None
    ch = {}
    for ci, chapter in enumerate(text, 1):
        cv = {}
        if isinstance(chapter, list):
            for vi, verse in enumerate(chapter, 1):
                t = flatten(verse)
                if t: cv[vi] = t
        else:
            t = flatten(chapter)
            if t: cv[1] = t
        if cv: ch[ci] = cv
    return ch or None

def fetch_by_chapter(name, n_ch):
    ch = {}
    for c in range(1, n_ch + 1):
        d = fetch_json(f'{name} {c}')
        text = d.get('he') or d.get('text')
        if not text:
            time.sleep(0.4); continue
        cv = {}
        if isinstance(text, list):
            for vi, verse in enumerate(text, 1):
                t = flatten(verse)
                if t: cv[vi] = t
        else:
            t = flatten(text)
            if t: cv[1] = t
        if cv: ch[c] = cv
        time.sleep(0.35)
    return ch or None

def get_targum(book, n_ch):
    for name in candidates(book):
        whole = fetch_whole(name)
        if whole and len(whole) == n_ch:
            return name, whole
        byc = fetch_by_chapter(name, n_ch)
        if byc and len(byc) >= max(1, int(n_ch * 0.8)):
            return name, byc
        time.sleep(0.5)
    return None, None

def main():
    os.makedirs(OUT, exist_ok=True)
    ok, miss = [], []
    for book in sorted(SLUGS):
        slug = SLUGS[book]
        op = os.path.join(OUT, slug + '.json')
        n_ch = book_chapters(book)
        if os.path.exists(op):
            with open(op, encoding='utf-8') as f:
                have = len(json.load(f)['ch'])
            if n_ch and have >= max(1, n_ch // 3):
                ok.append(book); continue
            os.remove(op)   # incomplete file -> refetch
        name, ch = get_targum(book, n_ch)
        if name:
            with open(op, 'w', encoding='utf-8') as f:
                json.dump({'name': name, 'ch': ch}, f, ensure_ascii=False, separators=(',', ':'))
            print(f'{book:16} -> {name}  ({len(ch)}/{n_ch} chapters)')
            ok.append(book)
        else:
            print(f'{book:16} -> NO TARGUM ({n_ch} ch)')
            miss.append(book)
    print(f'done: {len(ok)} fetched, {len(miss)} missing: {miss}')

if __name__ == '__main__':
    main()
