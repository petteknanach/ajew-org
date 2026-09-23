# Add the merkava / shnayim-mikra short prayer to the kavanos page data.
# Text: HH's dictated nusach (2026-09-23), completed with the standard
# hiskashrus + vihi-noam formula verbatim from OUR Likutay Nanach MayUman
# vol 5 pre-learning tefilla (rights-clean, project's own publication).
import json

F = '/root/ajew-org/public/reader/chok/kavanos-torah.json'
d = json.load(open(F))

merkava = (
    'לשם יחוד קודשא בריך הוא ושכינתיה, ליחוד שם י״ה בו״ה ביחודא שלים בשם כל ישראל. '
    'הנני רוצה ללמוד תורה למשה, ולהיות מרכבה לכל חלקי התורה שאלמד. '
    'והנני רוצה לעסוק בשנים מקרא ואחד תרגום, להשלים הפרשיות עם הציבור כמו שצוונו חז״ל. '
    'בהתקשרות לכל הצדיקים אמיתיים שבדורנו ולכל הצדיקים אמיתיים שוכני עפר, '
    'ובפרט לרבינו הקדוש צדיק יסוד עולם נחל נובע מקור חכמה רבינו נ נח נחמ נחמן מאומן, '
    'ופי כפיהם וכל דעתי מחשבתי וכוונתי על דעתם ועל כוונתם. '
    'ויהי נועם אדנ״י אלקינו עלינו ומעשה ידינו כוננה עלינו ומעשה ידינו כוננהו.'
)

# keep shechina first, add merkava second
tef = [t for t in d['tefillos'] if t['id'] != 'merkava']
tef.append({
    'id': 'merkava',
    'title': 'תפלה קצרה לפני הלימוד — להיות מרכבה לכל חלקי התורה, ולקיים שנים מקרא ואחד תרגום',
    'he': merkava,
})
d['tefillos'] = tef
json.dump(d, open(F, 'w'), ensure_ascii=False, indent=1)
print('tefillos now:', [t['id'] for t in d['tefillos']])
print(merkava[:120], '...')
