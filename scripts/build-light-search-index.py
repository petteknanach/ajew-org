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


def add_text(target, text, hebrew=False):
    text = (text or '').strip() if isinstance(text, str) else ''
    if not text:
        return
    target.append(strip_nikud(text) if hebrew else text)


def extract_segments(data):
    segments = data.get('segments', [])
    all_he = []
    all_en = []
    for seg in segments:
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

        all_he.extend(seg_he)
        all_en.extend(seg_en)

    return '\n\n'.join(all_he), '\n\n'.join(all_en)

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
    
    he_text, en_text = extract_segments(data)
    
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
    
    # Build URL
    if len(parts) == 2:
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
