#!/usr/bin/env python3
"""Extract all 14 Behar teachings with corrected Hebrew and English from LH sources."""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def find_content_by_phrase(phrase, part=None):
    """Search all LH files for a phrase, optionally filtered by part."""
    results = []
    parts = [part] if part else range(1, 9)
    for p in parts:
        idx_file = LH_DIR / f"part-{p}" / "index.json"
        if not idx_file.exists():
            continue
        idx = json.loads(idx_file.read_text())
        for t in idx.get('torahs', []):
            f = LH_DIR / f"part-{p}" / f"torah-{t['number']}.json"
            if not f.exists():
                continue
            data = json.loads(f.read_text())
            for i, seg in enumerate(data.get('segments', [])):
                he = str(seg.get('he', ''))
                en = str(seg.get('en', ''))
                if phrase in he:
                    results.append({
                        'part': p, 'torah': t['number'], 'seg_idx': i,
                        'title': data.get('hebrewTitle', '') or data.get('title', ''),
                        'he': he, 'en': en
                    })
    return results

# Define all 14 teachings with their verse refs and search phrases
teachings_data = [
    {
        "verse": "ויקרא כ\"ה ה'",
        "verseText": "שנת שבתון יהיה לארץ",
        "source": "לקוטי הלכות - הלכות פריקה וטעינה ד - אות ו",
        "search": "עיקר דין הפקר",
        "part": 8
    },
    {
        "verse": "ויקרא כ\"ה ו'",
        "verseText": "והיתה שבת הארץ",
        "source": "לקוטי הלכות - הלכות שכירות פועלים ב - אות ה",
        "search": "וזה בחינת שמיטה ויובל",
        "part": 8
    },
    {
        "verse": "ויקרא כ\"ה ו'",
        "verseText": "לנקותו ולהעלותו",
        "source": "לקוטי הלכות - הלכות שכירות פועלים ב - אות ו",
        "search": "לנקותו ולהעלותו",
        "part": 8
    },
    {
        "verse": "ויקרא כ\"ה יד",
        "verseText": "כי תמכרו ממכר לעמיתך",
        "source": "לקוטי הלכות - הלכות בית הכנסת ו - אות כד",
        "search": "כל העסקים והמלאכות",
        "part": 1
    },
    {
        "verse": "ויקרא כ\"ה יד",
        "verseText": "אל תונו איש את אחיו",
        "source": "לקוטי הלכות - הלכות שלוחין ה - אות לט",
        "search": "כלל ויסוד כל התורה",
        "part": 3  # Found in part 3 Torah 20
    },
    {
        "verse": "ויקרא כ\"ה כג",
        "verseText": "והארץ לא תמכר לצמתת",
        "source": "לקוטי הלכות - הלכות גביעת חוב מלקוחות א",
        "search": "עקר שורש העשירות",
        "part": 8
    },
    {
        "verse": "ויקרא כ\"ה כה",
        "verseText": "הארין היא בחינת אמונה",
        "source": "לקוטי הלכות - הלכות חזקת קרקעות ב - אות נ",
        "search": "הארין היא",
        "part": 7
    },
    {
        "verse": "ויקרא כ\"ה לה",
        "verseText": "וכי ימוך אחיך",
        "source": "לקוטי הלכות - הלכות פסח ו - אות יב",
        "search": "עיקר ההלוואה",
        "part": 3
    },
    {
        "verse": "ויקרא כ\"ה לז",
        "verseText": "את כספך לא תתן לו בנשך",
        "source": "לקוטי הלכות - הלכות רבית א - אות מג",
        "search": "השפע של ממון",
        "part": 4
    },
    {
        "verse": "ויקרא כ\"ה לז",
        "verseText": "עבודה זרה נקראת חובה",
        "source": "לקוטי הלכות - הלכות אפותיקי ב - אות ב",
        "search": "עבודה זרה",
        "part": 8
    },
    {
        "verse": "ויקרא כ\"ה לז",
        "verseText": "חלוה הוא בחינת מיעוט חירוח",
        "source": "לקוטי הלכות - הלכות רבית א - אות מד",
        "search": "חלוה הוא",
        "part": 4
    },
    {
        "verse": "ויקרא כ\"ה מג",
        "verseText": "לא תרדה בו בפרך",
        "source": "לקוטי הלכות - הלכות בית הכנסת א - אות יח",
        "search": "לא תרדה בו בפרך",
        "part": 8  # Found in part 8 Torah 48
    },
    {
        "verse": "ויקרא כ\"ה מו",
        "verseText": "והתנחלתם אתם לבניכם",
        "source": "לקוטי הלכות - הלכות בית הכנסת א - אות יח",
        "search": "והתנחלתם",
        "part": 1
    },
    {
        "verse": "ויקרא כ\"ה נה",
        "verseText": "כי לי בני ישראל עבדים",
        "source": "לקוטי הלכות - הלכות בית הכנסת א - אות יט",
        "search": "כי לי בני ישראל עבדים",
        "part": 1
    },
]

results = []
for i, t in enumerate(teachings_data):
    matches = find_content_by_phrase(t['search'], t.get('part'))
    if matches:
        # Take the first match
        m = matches[0]
        # Get the full segment content (may span multiple segments)
        f = LH_DIR / f"part-{m['part']}" / f"torah-{m['torah']}.json"
        data = json.loads(f.read_text())
        segs = data.get('segments', [])
        
        # Collect all segments from the match point until next letter or end
        he_parts = []
        en_parts = []
        capturing = False
        for seg in segs:
            he = (seg.get('he') or '').strip()
            en = (seg.get('en') or '').strip()
            if t['search'] in he:
                capturing = True
            if capturing:
                if he:
                    he_parts.append(he)
                if en:
                    en_parts.append(en)
                # Stop at next letter marker after we've collected some content
                if he_parts and re.match(r'^אות [א-ת]', he) and t['search'] not in he:
                    break
        
        results.append({
            'verse': t['verse'],
            'verseText': t['verseText'],
            'source': t['source'],
            'he': '\n'.join(he_parts),
            'en': '\n'.join(en_parts)
        })
        print(f'✓ Teaching {i+1}: {t["verse"]} - {t["source"][:50]}')
    else:
        print(f'✗ Teaching {i+1}: {t["verse"]} - {t["search"]}')
        results.append({
            'verse': t['verse'],
            'verseText': t['verseText'],
            'source': t['source'],
            'he': None,
            'en': None
        })

found = sum(1 for r in results if r['he'])
print(f'\nFound {found}/{len(teachings_data)}')

# Save
pathlib.Path('/root/ajew-org/public/data/behar-teachings.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2)
)
print('Saved to public/data/behar-teachings.json')
