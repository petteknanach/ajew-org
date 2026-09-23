# Part 2: rewrite וזאת הברכה|יום שלישי against the CORRECT schedule refs
# (Dev 33:11-15 - the old entry explained 32:11-14, wrong verses) and upgrade
# וזאת הברכה|יום רביעי (33:16-21) to full scope with verses as dict rows.
# HH review required before commit (skill law).
import json

F = '/root/ajew-org/public/reader/chok/day-comm.json'
d = json.load(open(F))

def he_en(he, en):
    return {'he': he, 'en': en}

# ============ וזאת הברכה | יום שלישי - Dev 33:11-15 (REWRITE) ============
d['וזאת הברכה|יום שלישי'] = {
    'carry': he_en(
        'אתמול התחיל משה רבינו לברך את השבטים (לג, ו–י): ראובן, יהודה, לוי — שנושא את האורים ותומים, מלמד משפטיך ליעקב ותורתך לישראל, ומקטר קטורת. היום המשך הברכות: חיזוק ללוי, בנימין, ופתיחת ברכת יוסף.',
        'Yesterday Moshe began blessing the tribes (33:6-10): Reuven, Yehudah, Levi — who carries the Urim VeTumim, teaches Your mishpatim to Yaakov and Your Torah to Yisroel, and offers ketores. Today the blessings continue: strength for Levi, Binyamin, and the opening of Yosef\'s blessing.'),
    'intro': he_en(
        'היום חמישה פסוקים: ברכה ללוי שיצליח בעבודתו וידרוס את שונאיו (יא); בנימין ידיד ה׳ ישכון לבטח עליו (יב); וברכת יוסף — ארץ מבורכת מטל שמים ומתהום, מפרי שמש וירח, מהררי קדם (יג–טו).',
        'Five verses: a blessing that Levi succeed in his service and strike his enemies (11); Binyamin, Hashem\'s beloved, dwelling safely beside Him (12); and Yosef\'s blessing — a land blessed with the dew of heaven and the deep below, the fruit of sun and moon, the tops of the eastern mountains (13-15).'),
    'verses': {
        '33:11': he_en(
            'ברך ה׳ את חילו ופועל ידיו תרצה — מחץ מתני קמיו ומשנאיו מן יקומון.',
            'Hashem bless Levi\'s strength and accept his work — strike his attackers\' loins, his haters so they rise no more.'),
        '33:12': he_en(
            'לבנימין אמר: ידיד ה׳ ישכון לבטח עליו — חופף עליו כל היום ובין כתיפיו שכן.',
            'To Binyamin he said: Hashem\'s beloved dwells safely beside Him — He covers him all day and dwells between his shoulders.'),
        '33:13': he_en(
            'וליוסף אמר: מבורכת ה׳ ארצו — ממגד שמים מטל ומתהום רובצת תחת.',
            'To Yosef he said: his land is blessed by Hashem — with the precious dew of heaven, and the deep lying below.'),
        '33:14': he_en('וממגד תבואות שמש וממגד גרש ירחים.',
                       'And the precious produce of the sun, and the precious yield of the moons.'),
        '33:15': he_en('ומראש הררי קדם וממגד גבעות עולם.',
                       'And from the tops of the eastern mountains, and the precious hills of the world.'),
    },
    'rashi': {
        '33:11': he_en(
            'רש״י: מחץ מתנים קמיו — מכת מתניים, על המעוררין על הכהונה; ד״א: ראה שעתידים חשמונאי ובניו להלחם.',
            'Rashi: "strike their loins" — against those who rise against the priesthood; alternatively, he foresaw the battles of the Chashmonaim and his sons.'),
        '33:12': he_en(
            'רש״י: ברכת לוי בעבודת הקרבנות ושל בנימין בבניין בית המקדש — סמוכן זה לזה; חופף עליו — מכסה ומגן; ובין כתיפיו שכן — בית המקדש נבנה בגובה ארצו.',
            'Rashi: Levi\'s blessing (offerings) and Binyamin\'s (building the Mikdash) are placed side by side; "covers him" — shields him; "between his shoulders" — the Mikdash was built on the high part of his land.'),
        '33:13': he_en(
            'רש״י: ממגד — לשון עדנים ומתק; התהום עולה ומלחלח אותה מלמטה; ומשה מברך מעין ברכת יעקב.',
            'Rashi: "megeged" means sweetness and delicacy; the deep rises and moistens the land from below; and Moshe\'s blessing echoes Yaakov\'s.'),
        '33:14': he_en(
            'רש״י: ארצו פתוחה לחמה וממתקת הפירות; יש פירות שהלבנה מבשלתן — קישואין ודלועין.',
            'Rashi: his land faces the sun and it sweetens the fruit; some crops ripen by the moon — gourds and pumpkins.'),
        '33:15': he_en(
            'רש״י: מבורכת בבישול הפירות — שהרריה מקדימין לבכר בישול פירותיהם; גבעות עולם — אינן פוסקות מעוצר הגשמים.',
            'Rashi: blessed in the ripening of fruit — its mountains ripen their fruit first; "eternal hills" — never cut off from the wells of rain.'),
    },
    'navi': he_en(
        'מלכים א ח: חנוכת בית המקדש. שלמה מקהל את זקני ישראל וראשי המטות בירח האיתנים בחג; הכהנים נושאים את הארון אל דביר הבית, אל קודש הקודשים תחת כנפי הכרובים. הבית המקדש נבנה בחלקו של בנימין — „בין כתיפיו שכן" — וכאן נגלה המלוא של ברכת משה.',
        'Melachim I ch 8: the dedication of the Beis HaMikdash. Shlomo gathers the elders of Yisroel and the heads of the tribes in the month of Esanim, at the festival; the Kohanim carry the Aron into the Devir, the Holy of Holies, under the wings of the keruvim. The Mikdash stands in Binyamin\'s portion — "He dwells between his shoulders" — and here Moshe\'s blessing reaches its fullness.'),
    'kesuvim': he_en(
        'תהילים עז, מזמור לאסף: קולי אל אצעקה — ביום צרתי ידי נגרה לילה ולא תפוג; אזכור ימים מקדם, שנות עולמים, ושואל: החסדו לנצח גמר? המזמור נפתח בכעס ושאלות, והולך אל התשובה: אזכה פעלי יצהול — אפכה אל סליק, ואמחיש את משפטים... כוונת המזמור: כשאין תשובה מיד, הדרך היא לזכור נפלאותיו של ה׳ ולהתחזק.',
        'Tehillim 77, a mizmor of Asaf: "My voice is to Hashem and I cry" — in my distress my hand stayed out by night and did not slacken; I remember the days of old and ask: has His kindness ceased forever? The mizmor opens with anguish and questions, then moves toward its answer: I will recall the deeds of Yah — I will remember Your wonders of old. Its point: when no answer comes at once, the way is to remember Hashem\'s wonders and take strength.'),
    'mishna': he_en(
        'משנה יבמות פרק א: חמש עשרה נשים פוטרות צרותיהן וצרות צרותיהן מן החליצה ומן הייבום עד סוף העולם — ביתו, בת ביתו, בת בנו, בת אשתו, חמותו ועוד. אלו העריות שאם מת אחי הבעל לא חל עליהן יבום כלל.',
        'Mishna Yevamos perek 1: fifteen women free their rivals (and their rivals\' rivals) from chalitzah and yibum forever — his daughter, his granddaughter, his son\'s daughter, his wife\'s daughter, his mother-in-law and more. These are the arayos on which a brother-in-law never falls for yibum at all.'),
    'talmud': he_en(
        'גמרא יבמות טז א: בימי רבי דוסא בן הרכינס הותרה צרת הבת לאחין. הדבר היה קשה לחכמים — כי חכם גדול היה ועיניו קמו מלבוא לבית המדרש. הגמרא בודקת בדקדק אם נעשה מעשה בהיתר זה, ומה הדין להלכה.',
        'Gemara Yevamos 16a: in the days of Rabbi Dosa ben Harkinas the rival of a daughter was permitted to the brothers. This troubled the Sages — for he was a great scholar and his eyes grew weak from coming to the beis medrash. The Gemara carefully examines whether this ruling was actually practiced, and what the halacha is.'),
    'kabbala': he_en(
        'הזוהר להיום: מההקדמה של ספר הזוהר, דף יא עמוד א. בהקדמה פותח רשב״י את סוד החכמה הנסתרת ומדוע היא נגלית לישראל. טקסט הזוהר עדיין כרטיס-הפניה — ערוץ הזוהר נכין בשלב הבא.',
        'Today\'s Zohar: from the Zohar\'s own introduction, daf 11 amud 1. There Rashbi opens the hidden wisdom and why it is revealed to Yisroel. The Zohar text is still a reference card — the Zohar channel comes next.'),
    'halacha': he_en(
        'שולחן ערוך או״ח סימן רז׳ — רשות בשבת: דיבורך של שבת אינו כדיבורך של חול — אסור לומר למחר אעשה פלוני; הולכים לבתי כנסיות ובתי מדרשות ומדברים שם דברי תורה ודברים הצריכים לכל נפש.',
        'Shulchan Aruch OC 307 — permitted speech on Shabbos: your Shabbos speech is not your weekday speech — one may not say "tomorrow I will do such-and-such"; one goes to shuls and study halls and speaks there words of Torah and things all people need.'),
    'mussar': he_en(
        'רבינו יונה (שערי תשובה דף לב ע״ד): תשובתו של בעל הלשון קשה — כי חטא הלשון נעשה בקלות ומתפשט בין אנשים, ולכן תיקונו צריך להיות שלם.',
        'Rabbeinu Yona (Shaarei Teshuvah): the teshuvah of one who sinned with speech is hard — for the sin of the tongue comes easily and spreads between people, so its repair must be complete.'),
}

# ============ וזאת הברכה | יום רביעי - Dev 33:16-21 (UPGRADE to full scope) ============
d['וזאת הברכה|יום רביעי'] = {
    'carry': he_en(
        'אתמול בירך משה את לוי, בנימין ויוסף — ארץ מבורכת מטל שמים ומתהום, מפרי שמש וירח, מהררי קדם. היום המשך ברכת יוסף ואחר כך זבולון, יששכר וגד.',
        'Yesterday Moshe blessed Levi, Binyamin and Yosef — a land blessed with the dew of heaven and the deep below, the fruit of sun and moon, the tops of the eastern mountains. Today Yosef\'s blessing continues, then Zevulun, Yissachar and Gad.'),
    'intro': he_en(
        'היום ששה פסוקים: חתימת ברכת יוסף — רצון שוכני סנה, בכור שורו, קרני ראם (טז–יז); ואחר כך השותפות זבולון ויששכר, וברכת גד — והכל חותם: צדקת ה׳ עשה (יח–כא).',
        'Six verses: closing Yosef\'s blessing — the favor of the One Who dwelt in the bush, his firstling ox, the horns of the re\'eim (16-17); then the Zevulun-Yissachar partnership, and Gad\'s blessing — sealed with "the righteousness of Hashem he did" (18-21).'),
    'verses': {
        '33:16': he_en(
            'וממגד ארץ ומלואה — ורצון שוכני סנה; תבואתה לראש יוסף, ולקדקד נזיר אחיו.',
            'The precious things of the land and its fullness — and the favor of the One Who dwelt in the bush; may it come upon the head of Yosef, on the crown of the nazir among his brothers.'),
        '33:17': he_en(
            'בכור שורו הדר לו, וקרני ראם קרניו — בהם עמים ינגח יחד, אפסי ארץ; והם רבבות אפרים והם אלפי מנשה.',
            'His firstling ox — majesty is his; his horns are the horns of the re\'eim — with them he gores the peoples together, the ends of the earth; these are the myriads of Efrayim, these the thousands of Menasheh.'),
        '33:18': he_en('ולזבולן אמר: שמח זבולן בצאתך, ויששכר באהליך.',
                       'To Zevulun he said: rejoice, Zevulun, in your going out — and Yissachar in your tents.'),
        '33:19': he_en(
            'עמים הר יקראו — שם יזבחו זבחי צדק, כי שפע ימים יינקו ושפני טמוני חול.',
            'The nations will be called to the mountain — there they will offer righteous offerings, for they suck the abundance of the seas and the hidden treasures of the sand.'),
        '33:20': he_en('ולגד אמר: ברוך מרחיב גד — כלביא שכן וטרף זרוע אף קדקד.',
                       'To Gad he said: blessed is He Who widens Gad — like a lion he dwells and tears the arm, the crown of the head.'),
        '33:21': he_en(
            'וירא ראשית לו — כי שם חלקת מחוקק ספון; ויתא ראשי עם — צדקת ה׳ עשה, ומשפטיו עם ישראל.',
            'He saw his first portion — for there the lawgiver\'s portion was hidden; and he came at the head of the people — the righteousness of Hashem he did, and His mishpatim with Yisroel.'),
    },
    'rashi': {
        '33:16': he_en(
            'רש״י: ורצון שכני סנה — תהא ארצו מבורכת מרצונו ונחת רוחו של הקב״ה שנגלה עליו תחילה בסנה; נזיר אחיו — שהופרש מאחיו במכירתו.',
            'Rashi: "the favor of the One Who dwelt in the bush" — may his land be blessed from the will and satisfaction of Hashem revealed to him first at the bush; "nazir of his brothers" — he was separated from his brothers by his sale.'),
        '33:17': he_en(
            'רש״י: בכור שורו — יהושע, שכוחו קשה כשור ויופי קרניו כראם; הנוגחים — רבבות שהרג יהושע ואלפים שהרג גדעון במדין.',
            'Rashi: "his firstling ox" — Yehoshua, whose strength was like an ox and his horns\' beauty like a re\'eim; the goring — the myriads Yehoshua slew and the thousands Gidon slew in Midyan.'),
        '33:18': he_en(
            'רש״י: זבולן ויששכר עשו שותפות — זבולן יוצא לפרקמטיא בספינות ומשתכר ונותן ליששכר, והם יושבים ועוסקים בתורה.',
            'Rashi: Zevulun and Yissachar made a partnership — Zevulun went out in ships to trade, earned, and supported Yissachar, who sat and engaged in Torah.'),
        '33:19': he_en(
            'רש״י: להר המוריה יאספו ושם יזבחו ברגלים זבחי צדק; שפע ימים — הים נותן להם ממון בשפע.',
            'Rashi: they will gather to Har HaMoriah and offer righteous korbanos on the regalim; "abundance of seas" — the sea gives them wealth in abundance.'),
        '33:20': he_en(
            'רש״י: מלמד שתחומו של גד מרחיב והולך כלפי מזרח; כלביא שכן — לפי שהיה סמוך לאויבים.',
            'Rashi: Gad\'s territory widens eastward; "like a lion he dwells" — because he bordered the enemies.'),
        '33:21': he_en(
            'רש״י: וירא ראשית לו — ראה ליטול לו חלק בארץ סיחון ועוג, שהיא ראשית כיבוש הארץ; חלקת מחוקק ספון — חלקת קבורת משה, טמונה מכל בריה; ויתא ראשי עם — גד, שהיו הולכים לפני החלוץ בכיבוש; צדקת ה׳ עשה — שהאמינו דבריו ושמרו הבטחתם לעבור את הירדן.',
            'Rashi: "he saw his first portion" — he chose land in the territory of Sichon and Og, the first conquest of the Land; "the lawgiver\'s portion, hidden" — the burial place of Moshe, hidden from all creatures; "he came at the head of the people" — Gad, who marched ahead of the vanguard in the conquest; "the righteousness of Hashem he did" — they believed His words and kept their pledge to cross the Yarden.'),
    },
    'navi': he_en(
        'ספר יהושע נפתח אחרי מות משה: ה׳ מצווה את יהושע — קום עבור את הירדן הזה, אתה וכל העם הזה, אל הארץ אשר אנכי נותן להם. „חזק ואמץ" — שוב ושוב; „לא ימוש ספר התורה הזה מפיך והגית בו יומם ולילה" — וההבטחה: כשם הייתי עם משה, אהיה עמך; לא ירפך ולא תעזוב.',
        'Sefer Yehoshua opens after Moshe\'s passing: Hashem charges Yehoshua — cross this Yarden, you and all this people, to the land I give them. "Be strong and courageous" — again and again; "this sefer haTorah shall not depart from your mouth, and you shall meditate on it day and night" — and the promise: as I was with Moshe, I will be with you; I will not fail you nor forsake you.'),
    'kesuvim': he_en(
        'תהילים צז: „ה׳ מלך — תגל הארץ": ענן וערפל סביביו, צדק ומשפט מכון כסאו; הרים נמסים כדונג, שמים מגידים צדקו; ציון שומעת ותשמח. והכלל: אור זרוע לצדיק ולישרי לב שמחה — ובוז לפועלי און.',
        'Tehillim 97: "Hashem reigns — let the earth rejoice": cloud and fog surround Him, righteousness and justice are the foundation of His throne; mountains melt like wax, the heavens declare His righteousness; Tzion hears and rejoices. And the rule: light is sown for the tzaddik and joy for the upright of heart — and contempt for evildoers.'),
    'mishna': he_en(
        'משנה עדיות פרק ב: רבי חנינא סגן הכהנים העיד ארבעה דברים — מימיהם של כהנים: לא נמנעו מלשרוף בשר שנטמא בולד הטומאה עם בשר שנטמא באב הטומאה, אף על פי שמוסיפין טומאה על טומאתו; והוסיף רבי עקיבא עדויות נוספות מימיהם של כהנים — בענייני הקרבנות והטומאות.',
        'Mishna Eduyot perek 2: Rabbi Chanina the deputy Kohen testified four practices received from the Kohanim — for example, they did not refrain from burning flesh made tamei by a "child" of tumah together with flesh of a "father" of tumah, even though one adds tumah to its tumah; Rabbi Akiva added further testimonies from the Kohanim\'s practices — about korbanos and tumah.'),
    'talmud': he_en(
        'גמרא ע״ז עה ב: ביין של גוי — אם הושיט ידו לגת ונגע באשכולות: רבי ורבי חייא — חד אמר: אשכול וכל סביבותיו טמאים וכל הגת טהורה; וחד אמר: כל הגת כולה טמאה. והמסקנות בפרטי היקף הטומאה: דצבתא — לנגבן (עץ המוצב לתמיכה) — דכיתנא (קנה לטאטא) — שרי להו.',
        'Gemara AZ 75b: in wine of a non-Jew — if he reached into the press and touched a cluster: Rebbi and Rebbi Chiya differ — one says the cluster and its surroundings are tamei while the whole press stays tahor; the other says the whole press is tamei. And the rulings on the edges: a support-beam (placed to hold up the press) and a reed (used for sweeping) are permitted.'),
    'kabbala': he_en(
        'הזוהר להיום: חלק ג׳ על פרשת אמור, דף קד עמוד א — הח״ק שלנו קורא את הזוהר בקצב שלו (היום קטע מפרשת אמור). כרטיס-הפניה עד שנכין את ערוץ הזוהר.',
        'Today\'s Zohar: vol 3 on Parashas Emor, daf 104 amud 1 — our chok reads the Zohar at its own pace (today a passage from Emor). A reference card until the Zohar channel is ready.'),
    'halacha': he_en(
        'רמב״ם הלכות ברכות פרק ז: מנהגות רבות נהגו חכמי ישראל בסעודה, וכולן דרך ארץ — הגדול שבהן נוטל ידיו תחילה; גדול מסב בראש; האורח מברך ברכת המזון כדי שיברך לבעל הבית.',
        'Rambam Hilchos Berachos ch 7: the Sages of Yisroel kept many customs at the meal, all of them derech eretz — the greatest washes first; the host sits at the head; the guest says birkas hamazon, to bless the host.'),
    'mussar': he_en(
        'רבינו יונה (שערי תשובה דף לג ע״א): אם שב בעל הלשון בתשובה — צריך להקפיד על דרכו החדשה: לא לחזור לדיבורים שהורגל בהם, ולהרבות בתורה ובחסד.',
        'Rabbeinu Yona (Shaarei Teshuvah): if one who sinned with speech returns in teshuvah — he must hold firm to his new way: not returning to the talk he was used to, and increasing Torah and chessed.'),
}

json.dump(d, open(F, 'w'), ensure_ascii=False, indent=1)
print('entries:', list(d))
for k, v in d.items():
    print(k, '| sections:', [s for s in ['carry','intro','verses','rashi','navi','kesuvim','mishna','talmud','kabbala','halacha','mussar'] if s in v],
          '| verses:', len(v.get('verses', {})), '| rashi:', len(v.get('rashi', {})))
