import json, gzip
from pathlib import Path
from collections import Counter

reader = Path('public/reader')
all_dirs = set(d.name for d in reader.iterdir() if d.is_dir())

idx = json.load(gzip.open('public/data/light-search-index-he.json.gz', 'rt'))
idx_books = set(d['b'] for d in idx)
bc = Counter(d['b'] for d in idx)

# Books missing from index entirely
missing = all_dirs - idx_books

# Books with empty x (no Hebrew searchable text)  
empty_x = set()
for d in idx:
    if not d.get('x', '').strip():
        empty_x.add(d['b'])

# Books with zero docs
zero_docs = [b for b, c in bc.items() if c == 0]

extra = idx_books - all_dirs

print(f'Reader dirs: {len(all_dirs)}')
print(f'Index books: {len(idx_books)}')
print(f'\n=== Missing from index ({len(missing)}) ===')
for b in sorted(missing):
    print(f'  MISSING: {b}')
print(f'\n=== Empty x / no searchable text ({len(empty_x)}) ===')
for b in sorted(empty_x):
    print(f'  NO TEXT: {b}')
print(f'\n=== Extra in index (subdirs) ({len(extra)}) ===')
for b in sorted(extra):
    print(f'  EXTRA: {b}')
print(f'\nTOTAL books with issues: {len(missing | empty_x)}')
