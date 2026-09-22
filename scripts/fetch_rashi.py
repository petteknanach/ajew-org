#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fetch Rashi on the Chumash at build-time-once and store per-book JSON for the
Chok LiYisroel daily app.

ONE-TIME IMPORT (not a build dependency): Rashi's commentary is an ancient
public-domain text. It is ingested exactly once into project-owned committed
JSON (public/reader/rashi/<slug>.json) and thereafter served from the repo.
No runtime or build-time calls to any external site; no displayed credit.

Output shape: {name, ch: {c: {v: [comment, ...]}}} where each comment is the
Hebrew Rashi text with its dibbur hamatchil wrapped in <b>...</b> (minimal
HTML preserved; everything else stripped).
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request

BASE = 'https://www.sefaria.org/api'
OUT = '/root/ajew-org/public/reader/rashi'
BOOKS = [
    ('Rashi on Genesis', 'tanach-bereishit', 50),
    ('Rashi on Exodus', 'tanach-shemos', 40),
    ('Rashi on Leviticus', 'tanach-vayikra', 27),
    ('Rashi on Numbers', 'tanach-bamidbar', 36),
    ('Rashi on Deuteronomy', 'tanach-devarim', 34),
]
ALLOWED_TAGS = re.compile(r'</?(b|i|em|strong)>')
ANY_TAG = re.compile(r'<[^>]+>')


def api(path, retries=3):
    url = BASE + path
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'ajew.org-rashi-import/1.0'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def clean_comment(s):
    """Keep only the dibbur-hamatchil bold (and simple italics); drop other HTML."""
    if not isinstance(s, str):
        return ''
    s = re.sub(r'<(?!/?(b|i|em|strong)>)[^>]+>', '', s)
    s = s.replace('<em>', '<i>').replace('</em>', '</i>')
    s = s.replace('<strong>', '<b>').replace('</strong>', '</b>')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def clean_text_field(x):
    """Sefaria sometimes returns nested lists for a 'verse' of one comment."""
    if isinstance(x, list):
        return [clean_text_field(y) for y in x if y]
    return x


def fetch_book(name, expect_chapters, slug):
    """Per-chapter range fetch: '<name> c:1-c:N' (bare chapter refs collapse to
    c:1 on the API). Verse counts come from our own medooyuk data."""
    med = json.load(open(f'/root/ajew-org/public/reader/medooyuk/{slug}.json', encoding='utf-8'))
    ch = {}
    for c in range(1, expect_chapters + 1):
        verses = med['ch'].get(str(c)) or med['ch'].get(c) or {}
        nverses = max(int(k) for k in verses.keys()) if verses else 0
        if not nverses:
            continue
        rng = f'{name} {c}:1-{c}:{nverses}'
        try:
            data = api('/texts/' + urllib.parse.quote(rng, safe='') + '?context=0&commentary=0')
        except Exception as e:
            print(f'  ch {c}: error {e}')
            continue
        he = data.get('he')
        if not isinstance(he, list):
            continue
        got = 0
        for v, node in enumerate(he, 1):
            if isinstance(node, list):
                comments = [clean_comment(x) for x in node if clean_comment(x)]
            else:
                one = clean_comment(node)
                comments = [one] if one else []
            if comments:
                ch.setdefault(str(c), {})[str(v)] = comments
                got += 1
        time.sleep(0.3)
    if len(ch) < expect_chapters * 0.8:
        return None
    return {'name': name, 'ch': ch}


def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    results = []
    for name, slug, chapters in BOOKS:
        dst = os.path.join(OUT, slug + '.json')
        if os.path.exists(dst):
            print(f'skip (exists): {slug}')
            continue
        data = fetch_book(name, chapters, slug)
        if not data:
            print(f'FAIL whole-book: {name}')
            results.append((name, 0))
            continue
        got = len(data['ch'])
        total = sum(len(v) for v in data['ch'].values())
        with open(dst, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        print(f'{name}: {got}/{chapters} chapters, {total} comments -> {slug}')
        results.append((name, got))
        time.sleep(1)
    print('done:', sum(1 for _, n in results if n), 'fetched,', sum(1 for _, n in results if not n), 'missing')


if __name__ == '__main__':
    main()
