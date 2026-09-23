# Author day-comm entries: HH review required before commit (skill law).
# Sources: OUR medooyuk/rashi/shulchan/mishna/gemara JSONs + schedule refs.
# day-comm full-scope shape: carry, intro, verses{c:v:{he,en}}, rashi{c:v:{he,en}},
# navi, kesuvim, mishna, talmud, kabbala, halacha, mussar - all {he,en}, HE first.
import json

F = '/root/ajew-org/public/reader/chok/day-comm.json'
d = json.load(open(F))

def he_en(he, en):
    return {'he': he, 'en': en}

def verses(*refs):
    return list(refs)

# ============ בראשית | יום רביעי (today) - Gen 1:16-21 ============
d['בראשית|יום רביעי'] = {
    'carry': he_en(
        'אתמול למדנו יום ג׳ של בראשית: הארץ הוציאה דשא, עשב ועץ פרי (א, יא–טו), והמאורות נתלו ברקיע להאיר את הארץ ולהפריד בין יום ללילה. היום מסיימים את מלאכת המאורות ופותחים את יום ה׳ — החיים הראשונים.',
        'Yesterday was day three of Bereishis: the earth brought forth grass, herbs and fruit trees (1:11-15), and the luminaries were set in the sky to light the earth and separate day from night. Today we finish the luminaries and open the fifth day — the first living creatures.'),
    'intro': he_en(
        'היום ששה פסוקים: עשיית שני המאורות הגדולים והכוכבים (טז–יח), חתימת יום ד׳ (יט), ופתיחת יום ה׳ — המים משריצים חיות, העוף פורח, ונבראים התנינים הגדולים (כ–כא).',
        'Six verses: making the two great luminaries and the stars (16-18), closing the fourth day (19), and opening the fifth — the waters swarm with living beings, birds fly, and the great taninim are created (20-21).'),
    'verses': {
        '1:16': he_en(
            'ויעש אלקים את שני המאורות הגדולים — את המאור הגדול לממשלת היום, ואת המאור הקטן לממשלת הלילה — ואת הכוכבים.',
            'Hashem made the two great lights — the greater to rule the day, the lesser to rule the night — and the stars.'),
        '1:17': he_en('אלקים נתן אותם ברקיע השמים להאיר על הארץ.',
                      'Hashem placed them in the firmament of the heavens to shine upon the earth.'),
        '1:18': he_en(
            'ולמשול ביום ובלילה, ולהבדיל בין האור ובין החושך — ואלקים ראה שזה טוב.',
            'To rule over the day and the night and to separate light from darkness — and Hashem saw it was good.'),
        '1:19': he_en('ויהי ערב ויהי בוקר — יום רביעי.', 'There was evening and there was morning — a fourth day.'),
        '1:20': he_en(
            'ויאמר אלקים: ישרצו המים שרץ נפש חיה, ועוף יעופף על הארץ על פני רקיע השמים.',
            'Hashem said: let the waters swarm with living creatures, and birds fly above the earth across the firmament of the heavens.'),
        '1:21': he_en(
            'ויברא אלקים את התנינים הגדולים, את כל נפש החיה הרומשת ששרצו המים למינה, ואת כל עוף כנף למינהו — וירא אלקים כי טוב.',
            'Hashem created the great taninim, every living creeping being with which the waters swarmed, and every winged bird — and saw it was good.'),
    },
    'rashi': {
        '1:16': he_en(
            'רש״י: שניהם נבראו שווים, אבל הלבנה הקטינה עצמה בקטרוגה — „אי אפשר לשני מלכים שישתמשו בכתר אחד". ועל ידי שמיעט את הלבנה הרבה צבאיה — הכוכבים — להפיס דעתה.',
            'Rashi: both were created equal, but the moon diminished herself by complaining — "two kings cannot use one crown." Because she was made smaller, her retinue — the stars — was multiplied to comfort her.'),
        '1:20': he_en(
            'רש״י: „שרץ" — כל חי שאינו גבוה מן הארץ: בעוף כזבובים, בשקצים כנמלים ותולעים, בבריות כחולד ועכבר, וכל הדגים; „נפש חיה" — שתהא בה חיות.',
            'Rashi: "sheretz" — any living thing low to the ground: among birds like flies, among vermin like ants and worms, among creatures like mice, and all fish; "nefesh chaya" — containing life.'),
        '1:21': he_en(
            'רש״י: התנינים — דגים גדולים שבים; ובאגדה — לויתן ובן זוגו, שנבראו זכר ונקבה והרג את הנקבה ומלח אותה לצדיקים לעתיד לבוא, שאם יפרו וירבו לא יתקיים העולם בפניהם.',
            'Rashi: taninim — the great fish of the sea; in Aggadah, Leviyasan and his mate: created male and female, He killed the female and salted her for the tzaddikim for the Future — had they multiplied, the world could not stand before them.'),
    },
    'navi': he_en(
        'ישעיהו מגלה את עבד ה׳: „הן עבדי אתמך בו, בחירי רצתה נפשי" — מביא משפט לגויים אך בשקט: לא יצעק ולא ישא, קנה רצוץ לא ישבור ופשתה כהה לא יכבנה. ה׳ אוחז בידו ושמו לאור גויים — לפקוח עיניים עיוורות ולהוציא אסירים מבית כלא; „כבודי לאחר לא אתן". ובסוף הפרק: ישראל חירש ועיוור בחטאו — „הלוא ה׳ חטאנו לו" — ועם זאת „ה׳ חפץ למען צדקו, יגדיל תורה ויאדיר".',
        'Yeshayahu reveals Hashem\'s servant: "Behold My servant, I hold him up; My chosen one delights My soul" — he brings justice to the nations but quietly: not crying out, not breaking a bent reed or quenching a dimming wick. Hashem holds his hand and makes him a light of nations — opening blind eyes and bringing prisoners out of the dungeon; "My glory I will not give to another." The chapter closes: Yisroel grew deaf and blind through sin — "did we not sin against Him?" — yet "Hashem delights for His righteousness\' sake, to make the Torah great and glorious."'),
    'kesuvim': he_en(
        'ספר משלי נפתח: שלמה בן דוד מלך ישראל מוסר כללי חכמה — לדעת חכמה ומוסר, להבין אמרי בינה, והכלל: „יראת ה׳ ראשית דעת". מזהיר בנו: שמע מוסר אביך, אל תלך אחרי חטאים המפתים ברווח — כציפור הממהרת אל הרשת, „אין להם הצלה". וחכמה צועקת ברחוב: עד מתי פתיים תאהבו פתיות? שובו — והפרק חותם: השומע לי ישכון לבטח.',
        'The book of Mishlei opens: Shlomo son of David, king of Yisroel, lays down the rules of wisdom — to know wisdom and mussar, to understand words of insight; the core: "fear of Hashem is the beginning of knowledge." He warns his son: heed your father\'s teaching, do not chase gain through sin — like a bird rushing into the net, "there is no escape for them." Wisdom cries in the street: how long will the simple love simplicity? Turn back — and the chapter closes: whoever listens to Me will dwell securely.'),
    'mishna': he_en(
        'משנה בבא קמא פרק א: ארבעה אבות נזיקין — השור, הבור, המבעה (שן ורגל) וההבער (אש). המשנה משווה ביניהם: שור ומבעה דרכם ללכת ולהזיק; בור אינו דרכו ללכת; אש אין בו רוח חיים — והצד השווה: דרכן להזיק והבעלים חייבים בשמירתן. ובמשנה ב: „כל שחבתי בשמירתו הכשרתי נזקו" — והתשלום במיטב הארץ.',
        'Mishna Bava Kamma perek 1: four fathers of damages — the ox, the pit, mav\'eh (tooth and foot) and hev\'Er (fire). It compares them: ox and mav\'eh go about and damage; a pit does not walk; fire has no living spirit — and the common thread: they are prone to damage and the owner must guard them. In mishna 2: "whatever I am obligated to guard, I have prepared its damage" — and payment is from the best of the land.'),
    'talmud': he_en(
        'סוגיא שלנו (ב״ק טז ב) מרחיבה תם ומועד גם לחיות אחרות: רבי אלעזר — אף הנחש מועד לעולם. שמואל: ארי ברשות הרבים שדרס ואכל — פטור, כי דריסה היא דרכו (כשן ברשות הרבים); אבל טרף ואכל — חייב, כי טריפה אינה דרכו. ומתרצים: ארי טורף בשביל גוריו — והכתובים מוכיחים.',
        'Our sugya (BK 16b) extends tam and mu\'ad to other animals: Rebbi Elazar — even the snake is mu\'ad forever. Shmuel: a lion in the public domain that trampled and ate is exempt — trampling is its way (like a tooth in the public domain); but if it seized prey and ate, it is liable — for that is not its way. It is resolved: a lion tears for its cubs — as the verses show.'),
    'kabbala': he_en(
        'הזוהר להיום: חלק בראשית, דף מז עמוד א — מתוך הלימוד הראשון של הזוהר על מעשה בראשית. טקסט הזוהר עדיין כרטיס-הפניה (ערוץ הזוהר נכין בשלב הבא), ואז נסביר את הקטע עצמו.',
        'Today\'s Zohar: vol Bereishis, daf 47 amud 1 — from the Zohar\'s first discourse on Ma\'aseh Bereishis. The Zohar text is still a reference card (the Zohar channel comes next), and then we will explain the passage itself.'),
    'halacha': he_en(
        'שולחן ערוך או״ח סימן של״ט — שבות בשבת, איסורים מדברי חכמים: אין רוכבין על גבי בהמה, אין שטין על פני המים, ואין עושין דבר שאינו צריך לכל נפש (אפילו קל), ואין אומרין לגוי לעשות מלאכה בשבילנו בשבת.',
        'Shulchan Aruch OC 339 — shevus on Shabbos, rabbinic limits: one may not ride an animal, may not swim, may not do an act not needed by all (even if light), and may not ask a non-Jew to do work for us on Shabbos.'),
    'mussar': he_en(
        'מרגניתא דרבי מאיר: יש פורענות מיד ויש פורענות לאחר זמן — הקב״ה ארוך אפים, אבל אין דבר נשכח: כל מדה נפרעת בסוף. הלקח לנו: לא להירגע כשהעונש מתמהמה — זה זמן רחמים לתשובה.',
        'Margenisa d\'Rebbi Meir: some punishment comes immediately and some after a time — Hashem is patient, but nothing is forgotten; every measure is eventually settled. The lesson: don\'t relax when consequence is delayed — that delay is the time of mercy for teshuvah.'),
}

json.dump(d, open(F, 'w'), ensure_ascii=False, indent=1)
print('wrote', F, '| entries:', list(d))
