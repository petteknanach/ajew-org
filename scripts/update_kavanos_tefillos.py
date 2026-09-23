# Update kavanos-torah page data: replace the wrong tefillos with the right one.
# Prayer (verified verbatim from OUR Likutay Nanach vol 5 docx, ערך תפלה,
# 'תפלה לפני לימוד תורה' - the recommended short version): mashpeya to the
# Shechina -> all worlds, with hiskashrus to NNNNM. HH's other short prayer
# (merkava for all the sections of the Torah lishmah) is NOT in the vol-5
# docx draft - pending HH's pointer to its exact location.
import json, re

text = open('/root/.hermes/cache/scratch/ln5.txt').read()
i = text.find('אם לא נחוש לתפוס מרובה')
j = text.find('תפלה קצרה', i)
seg = text[i:j]
start = seg.find('לשם יחוד')
prayer = seg[start:].strip()
prayer = prayer.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
prayer = re.sub(r'\n{2,}', '\n', prayer)
print('prayer chars:', len(prayer))
print(prayer[:120], '...', prayer[-120:])

F = '/root/ajew-org/public/reader/chok/kavanos-torah.json'
d = json.load(open(F))
d['tefillos'] = [
    {'id': 'shechina', 'title': 'תפלה קצרה לפני הלימוד — להשפיע לשכינה', 'he': prayer},
]
d['tefillaLong']['title'] = 'תפלה לתורה — לקוטי מוהר״ן (א׳) — למעוניין'
json.dump(d, open(F, 'w'), ensure_ascii=False, indent=1)
print('updated', F)
