# Build the daily miluy-kavana data for the chok (HH: "this is also part of
# the kavanos that needs to be presented"). Source: OUR Pri Etz Chaim, Shaar
# HaNehagas HaLimud item 29 (PD, R' Chaim Vital) - the seder kriyas hashavua:
# each day reads verses equal to its milui letter of shem Ben, plus the
# Friday-night 26 (vahayih) minhag of R' Chizkiya (RASHASH circle) from our
# YMM reference book (structure facts only).
import json

g = json.load(open('/root/ajew-org/public/reader/kavanos/pec-gate-18.json'))
quote = g['ch']['1'][28].strip()
assert quote.startswith('אמנם, מה שתקרא'), 'item 29 changed?'

days = [
    {'day': 'ראשון',   'count': 6,  'letter': 'ו׳', 'miluy': 'יו״ד',      'nikud': 'צירי',  'path': 'ממלכת דז״א למלכות דנוק׳'},
    {'day': 'שני',     'count': 4,  'letter': 'ד׳', 'miluy': 'יו״ד',      'nikud': 'שפה',   'path': 'מגבוה דז״א לגבוה דנוק׳'},
    {'day': 'שלישי',   'count': 5,  'letter': 'ה׳', 'miluy': 'ה״ה ראשונה', 'nikud': 'פתח',   'path': 'מת״ת דז״א לת״ת דנוק׳'},
    {'day': 'רביעי',   'count': 6,  'letter': 'ו׳', 'miluy': 'ו״ו',       'nikud': 'חולם',  'path': 'מנצח דז״א לנצח דנוק׳'},
    {'day': 'חמישי',   'count': 5,  'letter': 'ה׳', 'miluy': 'ה״ה אחרונה', 'nikud': 'חיריק', 'path': 'מהוד דז״א להוד דנוק׳'},
    {'day': 'שישי',    'count': 26, 'letter': 'והי״ה', 'miluy': 'מילוי שם ב״ן', 'nikud': 'שורק', 'path': 'כנגד והיה ביום הששי — ליל שישי קורא כ״ו פסוקים (מנהג הרב ר׳ חזקיה זיע״א): מקרא דוקא, בלי תרגום, אחר חצות'},
]
out = {
    'source': 'פרי עץ חיים, שער הנהגת הלימוד, ענין כ״ט — סדר קריאת השבוע',
    'quote': quote,
    'shabbos': 'בשבת שם והי״ה כפול — והי״ה והי״ה (כ״ו כ״ו); הפרשה נקראת ע״י שמיעה מפי הש״ץ, וההפטרה צריך לקרותה',
    'days': days,
}
json.dump(out, open('/root/ajew-org/public/reader/chok/miluy-kavana.json', 'w'), ensure_ascii=False, indent=1)
print('miluy-kavana.json written:', sum(d['count'] for d in days), 'total verses Sun-Fri')
