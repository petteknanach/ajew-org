# Build data for the Torah-lishmah kavanos page.
# Sources (rights-clean only):
#  - PEC Shaar HaNehagas HaLimud (gate 18) items 1-3 - ancient PD Arizal
#    text, project-owned data, verified against old editions.
#  - Likutay Nanach MayUman vol 5 (our own publication) - the short
#    tefillos before Torah learning (תורה ב', ג') + the long one (א').
#  - Kamarna: attribution facts ONLY from the reference book (c) - text
#    pending a PD source.
import json, re

G = '/root/ajew-org/public/reader/kavanos/pec-gate-18.json'
g = json.load(open(G))
items = g['ch']['1']
arizal = [t for t in (items[0], items[1], items[2]) if t]

ln = open('/root/.hermes/cache/scratch/ln5_torah_section.txt').read()
iA = ln.find("תפלה לתורה א'")
iB = ln.find("תורה ב' – תפלה תמצית")
iC = ln.find("תורה ג' – תפלה תמצית")
iD = ln.find('תורה ד – תפלה תמצית')
assert -1 not in (iA, iB, iC, iD)

def clean(s):
    s = s.strip()
    s = s.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    s = re.sub(r'\n{2,}', '\n', s)
    return s

tef_A = clean(ln[iA + ln[iA:iA + 60].find('\n'):iB])
tef_B = clean(ln[iB + ln[iB:iB + 60].find('\n'):iC])
tef_C = clean(ln[iC + ln[iC:iC + 60].find('\n'):iD])

data = {
    'note': 'Data built by scripts/build_kavanos_torah_page.py. PEC gate 18 = ancient PD Arizal text (project-owned). Likutay Nanach MayUman vol 5 = our own publication. Kamarna: attribution facts only - full text pending a PD source.',
    'arizal': {
        'title': 'כוונת לימוד התורה לשמה — האריז״ל',
        'sub': 'פרי עץ חיים, שער הנהגת הלימוד',
        'items': arizal,
    },
    'tefillos': [
        {'id': 'b', 'title': 'תפלה לפני הלימוד — תמצית (ב׳)', 'he': tef_B},
        {'id': 'c', 'title': 'תפלה לפני הלימוד — תמצית (ג׳)', 'he': tef_C},
    ],
    'tefillaLong': {'title': 'תפלה לתורה — לקוטי מוהר״ן (א׳)', 'he': tef_A},
    'kamarna': {
        'title': 'כוונת תורה לשמה — רבי הקמרנא',
        'attribution': 'עניין כוונת תורה לשמה — דברי הרה״ק מקמארנא',
        'note': 'דברי הקמרנא מבוארים בסדור הכוונות של חק לישראל; נוסח המקור הישן (בן חורין) עדיין בחיפוש — כשיאותר, נכניס את הנוסח המלא.',
        'summary': 'הקמרנא מבאר כוונת תורה לשמה — לשם ה׳: השם הגדול שנכתב במילויים נמשך בתורה, והלומד מסדר את הלשון של הקב״ה עליונה. מסגרת הדברים היא היחוד של הלימוד עם השם עצמו.',
    },
}
out = '/root/ajew-org/public/reader/chok/kavanos-torah.json'
json.dump(data, open(out, 'w'), ensure_ascii=False, indent=1)
print('wrote', out)
print('arizal items:', len(arizal), '| tef B:', len(tef_B), 'chars | tef C:', len(tef_C), 'chars | tef A:', len(tef_A), 'chars')
print('tef C preview:', tef_C[:160])
