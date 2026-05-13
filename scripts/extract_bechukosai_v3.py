#!/usr/bin/env python3
"""Extract Bechukosai teachings from exact LH sources."""
import json, pathlib

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def get_letter_segments(part, torah_num, letter):
    """Get segments for a specific letter within a LH torah."""
    tf = LH_DIR / f"part-{part}" / f"torah-{torah_num}.json"
    if not tf.exists():
        return None, None
    data = json.loads(tf.read_text())
    segs = data.get('segments', [])
    
    # Find the letter
    letter_pattern = f'אות {letter}'
    start_idx = None
    for i, seg in enumerate(segs):
        he = str(seg.get('he', ''))
        if he.strip() == letter_pattern or he.strip().startswith(letter_pattern):
            start_idx = i
            break
    
    if start_idx is None:
        return None, None
    
    # Collect until next letter
    he_parts, en_parts = [], []
    for i in range(start_idx, len(segs)):
        he = str(segs[i].get('he', ''))
        en = str(segs[i].get('en', ''))
        
        # Stop at next letter marker
        if i > start_idx and he.strip().startswith('אות ') and len(he.strip()) < 15:
            break
        
        if he.strip(): he_parts.append(he)
        if en.strip(): en_parts.append(en)
    
    return '\n'.join(he_parts), '\n'.join(en_parts)

def get_segments_by_phrase(part, torah_num, phrase):
    """Get segments starting from a phrase match."""
    tf = LH_DIR / f"part-{part}" / f"torah-{torah_num}.json"
    if not tf.exists():
        return None, None
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
        he = str(segs[i].get('he', ''))
        en = str(segs[i].get('en', ''))
        
        if i > start_idx and he.strip().startswith('אות ') and len(he.strip()) < 15:
            break
        
        if he.strip(): he_parts.append(he)
        if en.strip(): en_parts.append(en)
    
    return '\n'.join(he_parts), '\n'.join(en_parts)

# All 11 teachings with their exact LH locations
teachings_config = [
    # T1: הלכות תלמוד תורה ג' - אות ב' → Part 5 Torah 26, letter ב
    {
        'verse': 'ויקרא כ"ו נ\'',
        'source': 'לקוטי הלכות - הלכות תלמוד תורה ג\' - אות ב\' / אוצר היראה - תלמוד תורה',
        'part': 5, 'torah': 26, 'letter': 'ב'
    },
    # T2: הלכות חדש ג' → Part 5 Torah 59 + הלכות תלמוד תורה ג' - אות ה' → Part 5 Torah 26, letter ה
    {
        'verse': 'ויקרא כ"ו נ\'',
        'source': 'לקוטי הלכות - הלכות חדש ג\' / הלכות תלמוד תורה ג\' - אות ה\' / אוצר היראה - טל ומטר',
        'part': 5, 'torah': 26, 'letter': 'ה'
    },
    # T3: הלכות חבירות וקבלנות ב' - אות ג' → Part 8 Torah 46, letter ג
    {
        'verse': 'ויקרא כ"ו ד\'',
        'source': 'לקוטי הלכות - הלכות חבירות וקבלנות ב\' - אות ג\' / אוצר היראה - טל ומטר',
        'part': 8, 'torah': 46, 'letter': 'ג'
    },
    # T4: הלכות תולעים ב' → search for phrase
    {
        'verse': 'ויקרא כ"ו ד\'',
        'source': 'לקוטי הלכות - הלכות תולעים ב\' / אוצר היראה - טל ומטר',
        'part': 4, 'torah': 36, 'phrase': 'כל הצמחים'
    },
    # T5: לקוטי מוהר"ן ב' + הלכות פדיון בכור ה' → search for ותמהו
    {
        'verse': 'ויקרא כ"ו ג\'-ה\'',
        'source': 'לקוטי מוהר"ן ב\' - סימן ז\' / לקוטי הלכות - הלכות פדיון בכור ה\'',
        'part': 5, 'torah': 83, 'phrase': 'ותמהו'
    },
    # T6: הלכות פקדון ה' - אות י"ג → search
    {
        'verse': 'ויקרא כ"ו ה\'',
        'source': 'לקוטי הלכות - הלכות פקדון ה\' / הלכות חלב נ\' / הלכות ברכת המזון',
        'part': 8, 'torah': 31, 'phrase': 'כשהמאכל'
    },
    # T7: הלכות הכשר כלים ד' - אות י"ז → search
    {
        'verse': 'ויקרא כ"ו מ\'',
        'source': 'לקוטי הלכות - הלכות הכשר כלים ד\' - אות י"ז',
        'part': 4, 'torah': 60, 'phrase': 'כל המניעות'
    },
    # T8: הלכות בציאת הפת א' - אות ל"ח → Part 2 Torah 32
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות בציאת הפת א\' - אות ל"ח',
        'part': 2, 'torah': 32, 'phrase': 'אריכת הגלות'
    },
    # T9: הלכות הרשאה ג' - אות ט"ו → Part 7 Torah 38
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות הרשאה ג\' - אות ט"ו',
        'part': 7, 'torah': 38, 'phrase': 'וחושב'
    },
    # T10: הלכות מתנה ה' - אות מ' → search for חסד חנם
    {
        'verse': 'ויקרא כ"ו מ"ב',
        'source': 'לקוטי הלכות - הלכות מתנה ה\' - אות מ\'',
        'part': 1, 'torah': 54, 'phrase': 'חסד חנם'
    },
    # T11: הלכות פדיון בכור ה' - אות כ"ז → search
    {
        'verse': 'ויקרא כ"ו מ"ד',
        'source': 'לקוטי הלכות - הלכות פדיון בכור ה\' - אות כ"ז',
        'part': 5, 'torah': 84, 'phrase': 'כי רק זה נשאר'
    },
]

results = []
for i, cfg in enumerate(teachings_config):
    if 'letter' in cfg:
        he, en = get_letter_segments(cfg['part'], cfg['torah'], cfg['letter'])
    elif 'phrase' in cfg:
        he, en = get_segments_by_phrase(cfg['part'], cfg['torah'], cfg['phrase'])
    else:
        he, en = None, None
    
    if he:
        results.append({
            'verse': cfg['verse'],
            'source': cfg['source'],
            'he': he,
            'en': en
        })
        print(f"✓ T{i+1}: {cfg['verse']}")
    else:
        print(f"✗ T{i+1}: {cfg['verse']} - NOT FOUND (Part {cfg['part']} Torah {cfg['torah']})")

print(f"\n{len(results)}/{len(teachings_config)} extracted")

pathlib.Path('/root/ajew-org/public/data/bechukosai-teachings.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2)
)
print('Saved!')
