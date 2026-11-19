#!/usr/bin/env python3
"""Refine only the newly generated Kabala plain exports without changing shared producers."""
from html import escape
import json
from pathlib import Path

from reader_search_routes import KABALA_BOOK_RE

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://ajew.org'


def write(path, value):
    path.write_text(value, encoding='utf-8')


def page(title, canonical, links, content):
    title = escape(title)
    nav = ' · '.join(f'<a href="{escape(url)}">{escape(label)}</a>' for url, label in links)
    alternates = ''.join(f'<link rel="alternate" type="{mime}" href="{escape(url)}">'
                         for (url, _), mime in zip(links[2:], ('text/plain','text/markdown','application/json')))
    return (f'<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{title} | ספריית הקבלה</title><link rel="canonical" href="{ORIGIN}{escape(canonical)}">'
            f'{alternates}<style>body{{max-width:50rem;margin:2rem auto;padding:0 1rem;'
            f'font:1.2rem/1.75 system-ui}}p{{white-space:pre-wrap;overflow-wrap:anywhere}}</style>'
            f'<body><header><nav>{nav}</nav><h1>{title}</h1></header><main>{content}</main></body></html>\n')


def emit(root=ROOT):
    rows = json.loads((root/'src/data/kabala-catalog.json').read_bytes())['entries']
    public = root/'public'
    catalog = json.loads((public/'reader-plain/index.json').read_bytes())
    joined = {}
    for row in catalog['entries']:
        book = row.get('bookId', '')
        if KABALA_BOOK_RE.fullmatch(book):
            key = (book, str(row['part']), str(row['torah']))
            if key in joined:
                raise ValueError(f'Duplicate Kabala plain output: {key}')
            joined[key] = row
    expected = {(e['id'], '1', str(s['number'])) for e in rows for s in e['sections'] if not e.get('aliasOf')}
    if not expected or set(joined) != expected:
        raise ValueError('Kabala catalog and generated plain routes disagree')
    for entry in rows:
        book = entry['id']
        if entry.get('aliasOf') or not entry['sections']:
            continue
        if not KABALA_BOOK_RE.fullmatch(book) or entry['download'] != f'/kabala-files/{book}.txt':
            raise ValueError(f'Invalid Kabala work: {book}')
        base = f'/reader-plain/{book}/'
        source_index = f'/kabala/{book}/'
        full = (public/entry['download'].lstrip('/')).read_bytes()
        (public/base.lstrip('/')/'full.txt').write_bytes(full)
        fullmd = [f'# {entry["title"]}', f'[תוכן הספר]({source_index})']
        toc = []
        for section in entry['sections']:
            n = section['number']
            route = f'/reader/{book}/1/{n}/'
            loc = base + f'1/{n}/'
            published = joined[(book, '1', str(n))]
            if published['url'] != loc or published['sourceUrl'].rstrip('/') != route.rstrip('/'):
                raise ValueError(f'Kabala generated target mismatch: {route}')
            text = json.loads((public/f'reader/{book}/volume-1/torah-{n}.json').read_bytes())
            out = public/loc.lstrip('/')
            title = entry['title'] if section['title'] == entry['title'] else f'{entry["title"]} — {section["title"]}'
            source = text['segments']
            txt = '\n\n'.join(s['he'] for s in source)
            markup = '\n'.join(f'<p id="segment-{s["index"]}">{escape(s["he"])}</p>' for s in source)
            md = f'<div lang="he" dir="rtl">\n\n{escape(txt)}\n\n</div>'
            write(out/'index.txt', txt + '\n')
            write(out/'index.md', f'# {title}\n\n[קריאה בקורא]({route})\n\n{md}\n')
            write(out/'index.json', json.dumps(dict(bookId=book, part='1', torah=str(n), title=title,
                  hebrewTitle=section['title'], language='he', sourceUrl=route, plainUrl=loc,
                  segments=[dict(index=s['index'], he=s['he'], en='') for s in source]), ensure_ascii=False) + '\n')
            links = [('/kabala/','ספריית הקבלה'),(route,'קריאה בקורא'),(loc+'index.txt','TXT'),
                     (loc+'index.md','Markdown'),(loc+'index.json','JSON')]
            write(out/'index.html', page(title,route,links,markup))
            fullmd.extend((f'## {section["title"]}', f'[קריאה בקורא]({route})', md))
            toc.append(f'<li><a href="{loc}">{escape(section["title"])}</a></li>')
        out = public/base.lstrip('/')
        write(out/'full.md','\n\n'.join(fullmd)+'\n')
        links = [('/kabala/','ספריית הקבלה'),(source_index,'תוכן הספר'),(base+'full.txt','TXT'),(base+'full.md','Markdown')]
        write(out/'index.html',page(entry['title'],source_index,links,'<ol>'+''.join(toc)+'</ol>'))
    print(f'Kabala: exact Hebrew text and AI formats for {len(joined)} sections')


if __name__ == '__main__':
    emit()
