#!/usr/bin/env python3
"""
Build split light search indexes for client-side search.
Produces two files:
  - light-search-index-he.json.gz — Hebrew text in x field (~31MB)
  - light-search-index-en.json.gz — English text in x field (~31MB)

Both share the same metadata (t, h, b, l) so docs can be merged if needed.
Strategy: serve preferred-language index first (~31MB), lazy-load the other
half only when user searches in the other language.
"""
import json, os, re, gzip, sys
from pathlib import Path

READER_DIR = Path('public/reader')
OUT_DIR = Path('public/data')
OUT_DIR.mkdir(parents=True, exist_ok=True)

def strip_nikud(text):
    return re.sub(r'[\u0591-\u05C7]', '', text)

HE_KEYS = ('he', 'he_nikud', 'verse', 'commentary_he', 'text_he', 'hebrew', 'hebrew_text')
EN_KEYS = ('en', 'commentary_en', 'text_en', 'english', 'translation')
LAYER_KEYS = ('beginner', 'intermediate', 'scholarly')
HEBREW_NUMERALS = {
    'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,
    'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,
    'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400,
}


def add_text(target, text, hebrew=False):
    text = (text or '').strip() if isinstance(text, str) else ''
    if not text:
        return
    target.append(strip_nikud(text) if hebrew else text)


def extract_segments(data):
    segments = data.get('segments', [])
    all_he = []
    all_en = []
    segment_map = []
    he_cursor = en_cursor = section = 0
    for position, seg in enumerate(segments, 1):
        if not isinstance(seg, dict):
            continue
        seg_he = []
        seg_en = []

        # Standard reader formats plus Tanach/Likutay-NaNach commentary fields.
        for key in HE_KEYS:
            add_text(seg_he, seg.get(key), hebrew=True)
        for key in EN_KEYS:
            add_text(seg_en, seg.get(key), hebrew=False)

        # PNC 3-layer format: seg.layers.beginner.he / .en
        layers = seg.get('layers') or {}
        if isinstance(layers, dict):
            for level in LAYER_KEYS:
                l = layers.get(level) or {}
                if isinstance(l, dict):
                    for key in HE_KEYS:
                        add_text(seg_he, l.get(key), hebrew=True)
                    for key in EN_KEYS:
                        add_text(seg_en, l.get(key), hebrew=False)

        # PNC flat format: seg.beginner.he / .en, or direct string values.
        for level in LAYER_KEYS:
            l = seg.get(level)
            if isinstance(l, dict):
                for key in HE_KEYS:
                    add_text(seg_he, l.get(key), hebrew=True)
                for key in EN_KEYS:
                    add_text(seg_en, l.get(key), hebrew=False)
            elif isinstance(l, str):
                add_text(seg_en, l, hebrew=False)

        he_segment = ' '.join(seg_he)
        en_segment = ' '.join(seg_en)
        en_match = re.match(r'^\s*(\d{1,3})\s*[.\-:)]', en_segment)
        token = (he_segment.strip().split(' ', 1)[0] if he_segment.strip() else '')
        token = re.sub(r'[״׳"\']', '', token)
        he_number = sum(HEBREW_NUMERALS.get(ch, 0) for ch in token) if token and len(token) <= 4 and all(ch in HEBREW_NUMERALS for ch in token) else 0
        candidate = int(en_match.group(1)) if en_match else he_number
        if candidate and ((section == 0 and candidate == 1) or candidate in (section, section + 1)):
            section = candidate
        dom_index = seg.get('index', position)
        segment_map.append([dom_index, section or dom_index, he_cursor, he_cursor + len(he_segment), en_cursor, en_cursor + len(en_segment)])
        all_he.extend(seg_he)
        all_en.extend(seg_en)
        if he_segment: he_cursor += len(he_segment) + 1
        if en_segment: en_cursor += len(en_segment) + 1

    return '\n\n'.join(all_he), '\n\n'.join(all_en), segment_map

# Collect all JSON files
json_files = []
for book_dir in sorted(READER_DIR.iterdir()):
    if not book_dir.is_dir():
        continue
    
    # Root-level JSONs
    for f in sorted(book_dir.glob('*.json')):
        if f.name != 'index.json':
            json_files.append(f)
    
    # Nested part directories (up to 2 levels deep)
    for sub_dir in sorted(book_dir.iterdir()):
        if sub_dir.is_dir() and not sub_dir.name.startswith('.'):
            for f in sorted(sub_dir.glob('*.json')):
                if f.name != 'index.json':
                    json_files.append(f)
            # Deeper nesting
            for inner_dir in sorted(sub_dir.iterdir()):
                if inner_dir.is_dir() and not inner_dir.name.startswith('.'):
                    for f in sorted(inner_dir.glob('*.json')):
                        if f.name != 'index.json':
                            json_files.append(f)

he_index = []
en_index = []
total_he_bytes = 0
total_en_bytes = 0
skipped = 0

for fpath in json_files:
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, Exception):
        skipped += 1
        continue
    
    he_text, en_text, segment_map = extract_segments(data)
    
    # Skip completely empty docs
    if not he_text and not en_text:
        continue
    
    title = data.get('title', '') or ''
    hebrew_title = data.get('hebrewTitle', '') or data.get('title', '') or ''
    # The searchable book id must be the top-level reader directory, not an
    # internal folder such as ``part-1`` or ``volume-4``.  The search UI filters
    # by these same top-level book ids, so nested folders would make users see
    # folders instead of real books and would break one-book filtering.
    rel = fpath.relative_to(READER_DIR)
    parts = rel.parts
    book = parts[0] if parts else fpath.parent.name

    # Chayey Moharan has a canonical public structure that differs from its
    # storage layout.  Keep the seven early section files, use one result per
    # later siman, and exclude duplicate chapter/part bundles.
    if book == 'chayey-moharan':
        name = fpath.stem
        if len(parts) == 3 and parts[1] == 'simanim':
            match = re.fullmatch(r'siman-(\d+)', name)
            if not match:
                continue
            url = f'/reader/chayey-moharan/siman/{int(match.group(1))}'
        else:
            chapter = re.fullmatch(r'chapter-(\d+)', name)
            if chapter:
                chapter_num = int(chapter.group(1))
                if chapter_num > 7:
                    continue
                url = f'/reader/chayey-moharan/1/{chapter_num}'
            elif re.fullmatch(r'part-\d+', name):
                continue
            elif name in ('intro', 'hashmatos-toc', 'hashmata-162', 'maftechos'):
                url = f'/reader/chayey-moharan/1/{name}'
            else:
                continue
    # Build URL for the standard reader layouts.
    elif len(parts) == 2:
        url = f'/reader/{parts[0]}/{parts[1].replace(".json","")}'
    elif len(parts) == 3:
        url = f'/reader/{parts[0]}/{parts[1]}/{parts[2].replace(".json","")}'
    else:
        url = f'/reader/{"/".join(parts).replace(".json","")}'
    
    # Shared metadata (included in both indexes)
    meta = {
        't': title[:200] if title else '',
        'h': hebrew_title[:200] if hebrew_title else '',
        'b': book[:50],
        'l': url[:200],
    }
    
    # Hebrew index: x = Hebrew text, e = English snippet for display
    he_doc = dict(meta)
    he_doc['x'] = he_text
    he_doc['e'] = en_text[:500] if en_text else ''
    he_doc['m'] = segment_map
    he_index.append(he_doc)
    total_he_bytes += len(he_text)
    
    # English index: x = English text  
    en_doc = dict(meta)
    en_doc['x'] = en_text
    en_doc['e'] = en_text[:500] if en_text else ''
    en_index.append(en_doc)
    total_en_bytes += len(en_text)

# Write Hebrew index
he_gz = OUT_DIR / 'light-search-index-he.json.gz'
with gzip.open(he_gz, 'wt', encoding='utf-8') as f:
    json.dump(he_index, f, ensure_ascii=False)

# Write English index
en_gz = OUT_DIR / 'light-search-index-en.json.gz'  
with gzip.open(en_gz, 'wt', encoding='utf-8') as f:
    json.dump(en_index, f, ensure_ascii=False)

# Also write combined index (for backwards compat / fallback)
combined = []
for hd, ed in zip(he_index, en_index):
    doc = dict(hd)
    x = hd['x']
    if ed['x']:
        if x:
            x += '\n\n'
        x += ed['x']
    doc['x'] = x
    combined.append(doc)

combined_gz = OUT_DIR / 'light-search-index.json.gz'
with gzip.open(combined_gz, 'wt', encoding='utf-8') as f:
    json.dump(combined, f, ensure_ascii=False)

# Stats
print(f'Files processed: {len(json_files)}, skipped: {skipped}')
print(f'Hebrew index: {len(he_index)} docs, {total_he_bytes//1024//1024}MB text, {he_gz.stat().st_size//1024//1024}MB gzipped')
print(f'English index: {len(en_index)} docs, {total_en_bytes//1024//1024}MB text, {en_gz.stat().st_size//1024//1024}MB gzipped')
print(f'Combined: {combined_gz.stat().st_size//1024//1024}MB gzipped')
print(f'Books: {len(set(d["b"] for d in he_index))}')
