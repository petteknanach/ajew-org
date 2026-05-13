#!/usr/bin/env python3
"""Extract Bechukosai teachings from LH sources using content matching."""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def search_lh(phrase, part=None):
    parts = [part] if part else range(1, 9)
    for p in parts:
        pdir = LH_DIR / f"part-{p}"
        if not pdir.exists(): continue
        for tf in pdir.glob("torah-*.json"):
            data = json.loads(tf.read_text())
            for i, seg in enumerate(data.get('segments', [])):
                he = str(seg.get('he', ''))
                if phrase in he:
                    he_parts, en_parts = [he], [str(seg.get('en', ''))]
                    for j in range(i+1, len(data['segments'])):
                        next_he = str(data['segments'][j].get('he', ''))
                        next_en = str(data['segments'][j].get('en', ''))
                        if next_he.startswith('אות ') and next_he != he:
                            break
                        if next_he: he_parts.append(next_he)
                        if next_en: en_parts.append(next_en)
                    return '\n'.join(he_parts), '\n'.join(en_parts)
    return None, None

# Teachings with their docx text and source references
# Each teaching: (verse, search_phrase, source_refs)
teaching_data = [
    ('כ"ה נ', 'עמלים בתורה', ['הלכות תלמוד תורה ג - אות ב']),
    ('כ"ה נ', 'מימי הנשמים', ['הלכות חדש ג', 'הלכות תלמוד-תורה ג - אות ה']),
    ('כ"ה ד', 'השדה הוא בחינת מלכות', ['הלכות חבירות וקבלנות ב - אות ג']),
    ('כ"ה ד', 'כל הצמחים וכל הפירות', ['הלכות תולעים ב']),
    ('כ"ה ג-ה', 'ותמהו הרבה', ['לקוטי מוהר"ן ב - סימן ז', 'הלכות פדיון בכור ה']),
    ('כ"ה ה', 'כשהמאכל אינו מבורר', ['הלכות פקדון ה - אות יג', 'הלכות חלב נ - אות א']),
    ('כ"ה מ', 'כל המניעות להתקרב', ['הלכות הכשר כלים ד - אות יז']),
    ('כ"ה מב', 'צריכין עתה נאלה שלמה', ['הלכות בציאת הפת א - אות לח']),
    ('כ"ה מב', 'וחושב אותם למפרע', ['הלכות הרשאה ג - אות טו']),
    ('כ"ה מב', 'מי שרוצה לסמוך רק על החסד חנם', ['הלכות מתנה ה - אות מ']),
    ('כ"ה מד', 'כי רק זה נשאר לנו', ['הלכות פדיון בכור הו - אות כז']),
]

results = []
for verse, search, sources in teaching_data:
    he, en = search_lh(search)
    if he:
        results.append({
            'verse': f'ויקרא {verse}',
            'source': ' / '.join(sources),
            'he': he,
            'en': en
        })
        print(f"✓ {verse} - {search[:30]}")
    else:
        print(f"✗ {verse} - {search[:30]}")

print(f"\nFound {len(results)}/{len(teaching_data)}")

pathlib.Path('/root/ajew-org/public/data/bechukosai-teachings.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2)
)
print('Saved!')
