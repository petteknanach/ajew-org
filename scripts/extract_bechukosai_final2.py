#!/usr/bin/env python3
"""
Extract all 11 Bechukosai teachings from LH sources.
Each teaching is matched by its source reference to the correct LH file/letter.
"""
import json, pathlib

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def extract_by_letter(part, torah_num, letter):
    """Extract a full letter (אות) from a LH torah file."""
    tf = LH_DIR / f"part-{part}" / f"torah-{torah_num}.json"
    data = json.loads(tf.read_text())
    segs = data.get('segments', [])
    
    letter_header = f'אות {letter}'
    start_idx = None
    for i, seg in enumerate(segs):
        he = str(seg.get('he', '')).strip()
        # Match exact letter header like "אות ב" or "אות ב'"
        if he == letter_header or he == letter_header + "'" or he.startswith(letter_header):
            start_idx = i
            break
    
    if start_idx is None:
        return None, None
    
    he_parts, en_parts = [], []
    for i in range(start_idx, len(segs)):
        he = str(segs[i].get('he', '')).strip()
        en = str(segs[i].get('en', '')).strip()
        
        # Stop at next letter
        if i > start_idx and (he.startswith('אות ') and len(he) <= 10):
            break
        
        if he: he_parts.append(he)
        if en: en_parts.append(en)
    
    return '\n'.join(he_parts), '\n'.join(en_parts)

def extract_by_phrase(part, torah_num, phrase):
    """Extract segments starting from a phrase."""
    tf = LH_DIR / f"part-{part}" / f"torah-{torah_num}.json"
    data = json.loads(tf.read_text())
    segs = data.get('segments', [])
    
    start_idx = None
    for i, seg in enumerate(segs):
        he = str(seg.get('he', ''))
        if phrase in he:
            start_idx = i
            break
    
    if start_idx is None:
        return None, None
    
    he_parts, en_parts = [], []
    for i in range(start_idx, len(segs)):
        he = str(segs[i].get('he', '')).strip()
        en = str(segs[i].get('en', '')).strip()
        
        if i > start_idx and (he.startswith('אות ') and len(he) <= 10):
            break
        
        if he: he_parts.append(he)
        if en: en_parts.append(en)
    
    return '\n'.join(he_parts), '\n'.join(en_parts)

# Teaching definitions with exact LH locations
teachings = [
    {
        'verse': 'ויקרא כ"ו נ\'',
        'source': 'לקוטי הלכות - הלכות תלמוד תורה ג\' - אות ב\' / אוצר היראה - תלמוד תורה',
        'method': 'letter', 'part': 5, 'torah': 26, 'letter': 'ב'
    },
    {
        'verse': 'ויקרא כ"ו נ\'',
        'source': 'לקוטי הלכות - הלכות חדש ג\' / הלכות תלמוד תורה ג\' - אות ה\' / אוצר היראה - טל ומטר',
        'method': 'letter', 'part': 5, 'torah': 26, 'letter': 'ה'
    },
    {
        'verse': 'ויקרא כ"ו ד\'',
        'source': 'לקוטי הלכות - הלכות חבירות וקבלנות ב\' - אות ג\' / אוצר היראה - טל ומטר',
        'method': 'letter', 'part': 8, 'torah': 46, 'letter': 'ג'
    },
    {
        'verse': 'ויקרא כ"ו ד\'',
        'source': 'לקוטי הלכות - הלכות תולעים ב\' / אוצר היראה - טל ומטר',
        'method': 'phrase', 'part': 4, 'torah': 36, 'phrase': 'כל הצמחים'
    },
    {
        'verse': 'ויקרא כ"ו ג\'-ה\'',
        'source': 'לקוטי מוהר"ן ב\' - סימן ז\' / לקוטי הלכות - הלכות פדיון בכור ה\'',
        'method': 'phrase', 'part': 5, 'torah': 83, 'phrase': 'ותמהו'
    },
    {
        'verse': 'ויקרא כ"ו ה\'',
        'source': 'לקוטי הלכות - הלכות פקדון ה\' / הלכות חלב נ\' / הלכות ברכת המזון',
        'method': 'phrase', 'part': 8, 'torah': 31, 'phrase': 'כשהמאכל'
    },
    {
        'verse': 'ויקרא כ"ו מ\'',
        'source': 'לקוטי הלכות - הלכות הכשר כלים ד\' - אות י"ז',
        'method': 'phrase', 'part': 4, 'torah': 60, 'phrase': 'כל המניעות'
    },
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות בציאת הפת א\' - אות ל"ח',
        'method': 'phrase', 'part': 2, 'torah': 32, 'phrase': 'אריכת הגלות'
    },
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות הרשאה ג\' - אות ט"ו',
        'method': 'phrase', 'part': 7, 'torah': 38, 'phrase': 'וחושב'
    },
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות מתנה ה\' - אות מ\'',
        'method': 'phrase', 'part': 1, 'torah': 54, 'phrase': 'חסד חנם'
    },
    {
        'verse': 'ויקרא כ"ו מ"ד',
        'source': 'לקוטי הלכות - הלכות פדיון בכור ה\' - אות כ"ז',
        'method': 'phrase', 'part': 5, 'torah': 84, 'phrase': 'כי רק זה נשאר'
    },
]

results = []
for i, t in enumerate(teachings):
    if t['method'] == 'letter':
        he, en = extract_by_letter(t['part'], t['torah'], t['letter'])
    else:
        he, en = extract_by_phrase(t['part'], t['torah'], t['phrase'])
    
    if he:
        results.append({
            'verse': t['verse'],
            'source': t['source'],
            'he': he,
            'en': en
        })
        print(f"✓ T{i+1}: {t['verse']}")
    else:
        print(f"✗ T{i+1}: {t['verse']}")

print(f"\n{len(results)}/{len(teachings)} extracted")

pathlib.Path('/root/ajew-org/public/data/bechukosai-teachings.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2)
)
print('Saved to public/data/bechukosai-teachings.json')
