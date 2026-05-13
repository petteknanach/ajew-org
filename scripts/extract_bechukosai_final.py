#!/usr/bin/env python3
"""Build final Bechukosai teachings JSON from LH sources."""
import json, pathlib

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def get_segments(part, torah_num, start_phrase):
    """Get all segments from a LH torah file starting from a phrase."""
    tf = LH_DIR / f"part-{part}" / f"torah-{torah_num}.json"
    data = json.loads(tf.read_text())
    segs = data.get('segments', [])
    
    # Find starting segment
    start_idx = None
    for i, seg in enumerate(segs):
        he = str(seg.get('he', ''))
        if start_phrase in he:
            start_idx = i
            break
    
    if start_idx is None:
        return None, None
    
    # Collect segments until next letter
    he_parts, en_parts = [], []
    for i in range(start_idx, len(segs)):
        he = str(segs[i].get('he', ''))
        en = str(segs[i].get('en', ''))
        
        # Stop at next letter marker (but not the first one)
        if i > start_idx and he.startswith('אות ') and len(he) < 30:
            break
        
        if he: he_parts.append(he)
        if en: en_parts.append(en)
    
    return '\n'.join(he_parts), '\n'.join(en_parts)

# Build all 11 teachings
teachings = [
    {
        'verse': 'ויקרא כ"ו נ\'',
        'source': 'לקוטי הלכות - הלכות תלמוד תורה ג\' - אות ב\' / אוצר היראה - תלמוד תורה',
        'part': 1, 'torah': 2, 'start': 'עמלים בתורה'
    },
    {
        'verse': 'ויקרא כ"ו נ\'',
        'source': 'לקוטי הלכות - הלכות חדש ג\' / הלכות תלמוד תורה ג\' - אות ה\' / אוצר היראה - טל ומטר, אות ז',
        'part': 1, 'torah': 8, 'start': 'מימי'
    },
    {
        'verse': 'ויקרא כ"ו ד\'',
        'source': 'לקוטי הלכות - הלכות חבירות וקבלנות ב\' - אות ג\' / אוצר היראה - טל ומטר',
        'part': 1, 'torah': 8, 'start': 'השדה'
    },
    {
        'verse': 'ויקרא כ"ו ד\'',
        'source': 'לקוטי הלכות - הלכות תולעים ב\' / אוצר היראה - טל ומטר',
        'part': 1, 'torah': 2, 'start': 'כל הצמחים'
    },
    {
        'verse': 'ויקרא כ"ו ג\'-ה\'',
        'source': 'לקוטי מוהר"ן ב\' - סימן ז\' / לקוטי הלכות - הלכות פדיון בכור ה\'',
        'part': 1, 'torah': 18, 'start': 'ותמהו'
    },
    {
        'verse': 'ויקרא כ"ו ה\'',
        'source': 'לקוטי הלכות - הלכות פקדון ה\' / הלכות חלב נ\' / הלכות ברכת המזון',
        'part': 1, 'torah': 18, 'start': 'כשהמאכל'
    },
    {
        'verse': 'ויקרא כ"ו מ\'',
        'source': 'לקוטי הלכות - הלכות הכשר כלים ד\' - אות י"ז',
        'part': 1, 'torah': 1, 'start': 'כל המניעות'
    },
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות בציאת הפת א\' - אות ל"ח',
        'part': 2, 'torah': 32, 'start': 'אריכת הגלות'
    },
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות הרשאה ג\' - אות ט"ו',
        'part': 1, 'torah': 1, 'start': 'וחושב'
    },
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות מתנה ה\' - אות מ\'',
        'part': 1, 'torah': 1, 'start': 'חסד חנם'
    },
    {
        'verse': 'ויקרא כ"ו מ"ד',
        'source': 'לקוטי הלכות - הלכות פדיון בכור ה\' - אות כ"ז',
        'part': 1, 'torah': 18, 'start': 'כי רק זה נשאר'
    },
]

results = []
for i, t in enumerate(teachings):
    he, en = get_segments(t['part'], t['torah'], t['start'])
    if he:
        results.append({
            'verse': t['verse'],
            'source': t['source'],
            'he': he,
            'en': en
        })
        print(f"✓ Teaching {i+1}: {t['verse']} ({t['start'][:20]})")
    else:
        print(f"✗ Teaching {i+1}: {t['verse']} - NOT FOUND")

print(f"\n{len(results)}/{len(teachings)} teachings extracted")

pathlib.Path('/root/ajew-org/public/data/bechukosai-teachings.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2)
)
print('Saved to public/data/bechukosai-teachings.json')
