#!/usr/bin/env python3
"""
Build light search index for client-side search.
Walks all public/reader/ JSON files, extracts segments, builds documents.
NO truncation on x field — user directive: "we need everything."
Output: public/data/light-search-index.json and .gz
"""
import json, os, re, gzip, sys
from pathlib import Path

READER_DIR = Path('public/reader')
OUT_DIR = Path('public/data')
OUT_DIR.mkdir(parents=True, exist_ok=True)

def strip_nikud(text):
    """Strip Hebrew vowel points for searchability."""
    return re.sub(r'[\u0591-\u05C7]', '', text)

def extract_segments(data):
    """Extract all text from segments."""
    segments = data.get('segments', [])
    he_parts = []
    en_parts = []
    for seg in segments:
        he = (seg.get('he', '') or '').strip()
        en = (seg.get('en', '') or '').strip()
        if he:
            he_parts.append(strip_nikud(he))
        if en:
            en_parts.append(en)
    return '\n\n'.join(he_parts), '\n\n'.join(en_parts)

def build_book_slug(dirname):
    """Map directory name to book slug."""
    # Standard mapping
    return dirname

index = []
total_segments = 0
total_bytes = 0

# Walk all part directories
for book_dir in sorted(READER_DIR.iterdir()):
    if not book_dir.is_dir():
        continue
    
    book = book_dir.name
    
    # Collect all JSON files
    json_files = []
    
    # Check for root-level JSONs (even without index.json)
    for f in sorted(book_dir.glob('*.json')):
        if f.name != 'index.json':
            json_files.append(f)
    
    # Check for nested part directories
    for part_dir in sorted(book_dir.iterdir()):
        if part_dir.is_dir() and not part_dir.name.startswith('.'):
            for f in sorted(part_dir.glob('*.json')):
                if f.name != 'index.json':
                    json_files.append(f)
    
    # Check for deeper nesting (e.g., book/volume/chapter.json)
    for sub_dir in sorted(book_dir.iterdir()):
        if sub_dir.is_dir() and not sub_dir.name.startswith('.'):
            for inner_dir in sorted(sub_dir.iterdir()):
                if inner_dir.is_dir() and not inner_dir.name.startswith('.'):
                    for f in sorted(inner_dir.glob('*.json')):
                        if f.name != 'index.json':
                            json_files.append(f)
    
    for fpath in json_files:
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (json.JSONDecodeError, Exception) as e:
            continue
        
        he_text, en_text = extract_segments(data)
        
        # Skip empty docs
        if not he_text and not en_text:
            continue
        
        title = data.get('title', '') or ''
        hebrew_title = data.get('hebrewTitle', '') or data.get('title', '') or ''
        
        # Build URL
        rel = fpath.relative_to(READER_DIR)
        parts = rel.parts
        if len(parts) == 2:
            # reader/book/torah-N.json
            url = f'/reader/{book}/{parts[1].replace(".json","")}'
        elif len(parts) == 3:
            # reader/book/part-N/torah-N.json
            url = f'/reader/{book}/{parts[1]}/{parts[2].replace(".json","")}'
        else:
            url = f'/reader/{"/".join(parts).replace(".json","")}'
        
        # x = FULL searchable text (Hebrew + English, NO truncation)
        x = he_text
        if en_text:
            if x:
                x += '\n\n'
            x += en_text
        
        doc = {
            't': title[:200] if title else '',
            'h': hebrew_title[:200] if hebrew_title else '',
            'b': book[:50],
            'l': url[:200],
            'x': x,
            'e': en_text[:500] if en_text else '',  # English snippet for display
        }
        
        index.append(doc)
        total_bytes += len(x)
        total_segments += len(data.get('segments', []))

# Write uncompressed
json_path = OUT_DIR / 'light-search-index.json'
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False)
uncomp_size = json_path.stat().st_size

# Write gzipped
gz_path = OUT_DIR / 'light-search-index.json.gz'
with gzip.open(gz_path, 'wt', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False)
gz_size = gz_path.stat().st_size

# Stats
max_x = max(len(d['x']) for d in index) if index else 0
avg_x = sum(len(d['x']) for d in index) // len(index) if index else 0
x_empty = sum(1 for d in index if not d['x'])
e_has = sum(1 for d in index if d['e'])
books = len(set(d['b'] for d in index))

print(f'Index built: {len(index)} docs from {books} books')
print(f'Total segments: {total_segments:,}')
print(f'Total searchable text: {total_bytes:,} chars ({total_bytes//1024//1024}MB)')
print(f'x field: avg={avg_x} max={max_x} empty={x_empty}')
print(f'e field: {e_has}/{len(index)} have English')
print(f'Uncompressed: {uncomp_size//1024//1024}MB')
print(f'Gzipped: {gz_size//1024//1024}MB ({gz_size//1024}KB)')
