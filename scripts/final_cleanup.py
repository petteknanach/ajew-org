#!/usr/bin/env python3
"""Final cleanup of remaining asterisk HE fields across all books"""
import json, os
from pathlib import Path

BASE = Path('/root/ajew-org/public/reader')
fixed = 0
remaining = 0

for book_dir in sorted(BASE.iterdir()):
    if not book_dir.is_dir():
        continue
    for jf in sorted(book_dir.glob('*.json')):
        if jf.name == 'index.json':
            continue
        data = json.load(open(jf))
        segs = data.get('segments', [])
        removed = 0
        for s in segs:
            he = s.get('he', '').strip()
            if he and all(c in '*• ' for c in he):
                if s.get('en', '').strip():
                    # If EN is substantial, clear the asterisk HE so it becomes EN-only
                    s['he'] = ''
                else:
                    # If EN is also useless, clear both
                    s['he'] = ''
                    s['en'] = ''
                fixed += 1
                removed += 1
        if removed:
            # Remove fully empty segments
            segs = [s for s in segs if s.get('he','').strip() or s.get('en','').strip()]
            data['segments'] = segs
            with open(jf, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"  Fixed {removed} in {jf.name}")
        remaining += sum(1 for s in segs if s.get('he','').strip() and all(c in '*• ' for c in s['he'].strip()))

print(f"\nTotal fixed: {fixed}")
print(f"Remaining asterisk HE: {remaining}")