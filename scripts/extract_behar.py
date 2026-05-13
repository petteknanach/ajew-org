#!/usr/bin/env python3
"""Extract all 14 Behar teachings from LH sources with corrected Hebrew and English."""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def get_lh_letter(part, torah_num, letter):
    f = LH_DIR / f"part-{part}" / f"torah-{torah_num}.json"
    if not f.exists():
        return None, None
    data = json.loads(f.read_text())
    he_parts, en_parts = [], []
    capturing = False
    for seg in data.get('segments', []):
        he = (seg.get('he') or '').strip()
        en = (seg.get('en') or '').strip()
        if he.startswith(f'אות {letter}'):
            capturing = True
            he_parts.append(he)
            en_parts.append(en)
        elif capturing and re.match(r'^אות [א-ת]', he) and not he.startswith(f'אות {letter}'):
            break
        elif capturing and he:
            he_parts.append(he)
            en_parts.append(en)
    return '\n'.join(he_parts), '\n'.join(en_parts) if he_parts else (None, None)

# 14 teachings mapped to LH sources
teachings = [
    {"verse": 'כ"ה ה', "verseText": "שנת שבתון יהיה לארץ", "source": "פריקה וטעינה ד - אות ו", "part": 8, "torah": 15, "letter": "ז"},
    {"verse": 'כ"ה ו', "verseText": "והיתה שבת הארץ", "source": "שכירות פועלים ב - אות ה", "part": 8, "torah": 48, "letter": "ה"},
    {"verse": 'כ"ה ו', "verseText": "לנקותו ולהעלותו", "source": "שכירות פועלים ב - אות ו", "part": 8, "torah": 48, "letter": "ו"},
    {"verse": 'כ"ה יד', "verseText": "כי תמכרו ממכר לעמיתך", "source": "בית הכנסת ו - אות כד", "part": 1, "torah": 55, "letter": "כד"},
    {"verse": 'כ"ה יד', "verseText": "אל תונו איש את אחיו", "source": "שלוחין ה - אות לט", "part": 7, "torah": 81, "letter": "לט"},
    {"verse": 'כ"ה כג', "verseText": "והארץ לא תמכר לצמתת", "source": "גביעת חוב מלקוחות א", "part": 8, "torah": 33, "letter": "א"},
    {"verse": 'כ"ה כה', "verseText": "הארין היא בחינת אמונה", "source": "חזקת קרקעות ב - אות נ", "part": 7, "torah": 51, "letter": "נ"},
    {"verse": 'כ"ה לה', "verseText": "וכי ימוך אחיך", "source": "פסח ו - אות יב", "part": 3, "torah": 27, "letter": "יב"},
    {"verse": 'כ"ה לז', "verseText": "את כספך לא תתן לו בנשך", "source": "רבית א - אות מג", "part": 4, "torah": 73, "letter": "מג"},
    {"verse": 'כ"ה לז', "verseText": "עבודה זרה נקראת חובה", "source": "אפותיקי ב - אות ב", "part": 8, "torah": 48, "letter": "ב"},
    {"verse": 'כ"ה לז', "verseText": "חלוה הוא בחינת מיעוט חירוח", "source": "רבית א - אות מד", "part": 4, "torah": 73, "letter": "מד"},
    {"verse": 'כ"ה מג', "verseText": "לא תרדה בו בפרך", "source": "בית הכנסת א - אות יח", "part": 1, "torah": 50, "letter": "יח"},
    {"verse": 'כ"ה מו', "verseText": "והתנחלתם אתם לבניכם", "source": "בית הכנסת א - אות יח", "part": 1, "torah": 50, "letter": "יח"},
    {"verse": 'כ"ה נה', "verseText": "כי לי בני ישראל עבדים", "source": "בית הכנסת א - אות יט", "part": 1, "torah": 50, "letter": "יט"},
]

results = []
for i, t in enumerate(teachings):
    he, en = get_lh_letter(t['part'], t['torah'], t['letter'])
    results.append({**t, 'he': he, 'en': en})
    status = '✓' if he else '✗'
    print(f'{status} Teaching {i+1}: {t["verse"]} - {t["source"]}')

print(f'\nFound {sum(1 for r in results if r["he"])}/{len(teachings)}')

pathlib.Path('/root/ajew-org/public/data/behar-teachings.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2)
)
print('Saved to public/data/behar-teachings.json')
