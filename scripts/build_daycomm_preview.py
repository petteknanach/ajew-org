# Build a self-contained preview page of the three day-comm drafts for HH review.
# NOT shipped in the repo - uploaded to the live release dir as an unlinked file.
import json, html

d = json.load(open('/root/ajew-org/public/reader/chok/day-comm.json'))
ORDER = ['וזאת הברכה|יום שלישי', 'וזאת הברכה|יום רביעי', 'בראשית|יום רביעי']
SECS = [('navi', 'נביא'), ('kesuvim', 'כתובים'), ('mishna', 'משנה'), ('talmud', 'גמרא'),
        ('kabbala', 'זוהר'), ('halacha', 'הלכה'), ('mussar', 'מוסר')]

def esc(s):
    return html.escape(s, quote=False)

parts = []
parts.append('''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>טיוטת הסברים — לבדיקה</title>
<style>
body{font-family:serif;max-width:44rem;margin:0 auto;padding:1.2rem 1rem 3rem;background:#fffdf7;color:#222}
.banner{background:#f3e3c0;border:1px solid #b8860b;border-radius:.5rem;padding:.6rem 1rem;margin-bottom:1.2rem}
h1{font-size:1.3em}h2{border-bottom:2px solid #b8860b;padding-bottom:.2rem;margin-top:2.2rem}
h3{color:#8a6d1d;margin:.1rem 0 .4rem}
.vr{border-inline-start:3px solid #b8860b;background:rgba(184,134,11,.06);padding:.6rem .9rem;border-radius:.5rem;margin:.45rem 0}
.vk{font-weight:700;font-size:.82em;opacity:.72}
.he{line-height:2}
details{margin:.4rem 0}.summary{cursor:pointer;color:#8a6d1d;font-weight:700}
.src{opacity:.6;font-size:.85em}
</style></head><body>
<div class="banner">טיוטה לבדיקה — הסברי היום בחק לישראל (עברית ותרגום). זה עדיין לא באתר עצמו; אחרי אישורך זה נכנס לדף היום.</div>
<h1>טיוטת הסברים — לבדיקה</h1>''')

for key in ORDER:
    e = d.get(key)
    if not e:
        continue
    wk, day = key.split('|')
    parts.append(f'<h2>{esc(wk)} · {esc(day)}</h2>')
    parts.append('<h3>מה משך אתמול</h3><div class="vr"><div class="vk">אתמול</div><p class="he">' + esc(e['carry']['he']) + '</p><p class="he">' + esc(e['carry']['en']) + '</p></div>')
    parts.append('<h3>היום</h3><div class="vr"><div class="vk">היום</div><p class="he">' + esc(e['intro']['he']) + '</p><p class="he">' + esc(e['intro']['en']) + '</p></div>')
    parts.append('<h3>פסוקי היום עם הסבר פשוט</h3>')
    for ref, v in e['verses'].items():
        parts.append('<details open><summary class="summary">פסוק ' + esc(ref) + '</summary><div class="vr"><div class="vk">פסוק</div><p class="he">' + esc(v['he']) + '</p><p class="he">' + esc(v['en']) + '</p>' + ('<div class="vk">רש״י</div><p class="he">' + esc(e['rashi'][ref]['he']) + '</p><p class="he">' + esc(e['rashi'][ref]['en']) + '</p>' if ref in e.get('rashi', {}) else '') + '</div></details>')
    for sk, label in SECS:
        if sk in e:
            parts.append(f'<h3>{label}</h3><div class="vr"><p class="he">' + esc(e[sk]['he']) + '</p><p class="he">' + esc(e[sk]['en']) + '</p></div>')
    parts.append('<p class="src">מקורות: פסוקים ורש״י מהמאגר שלנו; הסברים מסודרים על פי החומש/חז״ל כפי שהובאו.</p>')

parts.append('</body></html>')
open('/tmp/daycomm-preview.html', 'w').write('\n'.join(parts))
print('built /tmp/daycomm-preview.html', len('\n'.join(parts)), 'chars')
