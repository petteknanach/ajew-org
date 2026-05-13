import json, os

home = os.path.expanduser('~')
reader_dir = os.path.join(home, '.openclaw/workspace/ajew-org/public/reader')
pnc_name = "pettek-nanach-commentary"
pnc_book_slug = pnc_name
pnc_dir = os.path.join(reader_dir, pnc_name)

torahs = {
    8: {
        "title_en": "Tiku Vachodesh — Tochachah and Prayer",
        "title_he": "תקעו בחדש — תוכחה ותפלה",
        "segs": [
            {
                "beginner": "T8 reprises the verse 'Blow the shofar at the new month, at the concealed time for the day of our festival; for it is a chok for Israel, a mishpat for the G-d of Yaakov' (Tehillim 81:4-5), but now from the angle of tochachah (rebuke), tefillah, the staff of strength against the sitra achra, prophecy, healing, and the lung's role in renewing the world.",
                "intermediate": "פתיחתא: 'תקעו בחדש שופר בכסה ליום חגנו כי חק לישראל הוא משפט לאלקי יעקב' (תהלים פ\"א:ד'-ה'). זוית חדשה: תוכחה → תפלה → מטה עוז → גרים → כבוד → נבואה → רפואה → ריאה → חידוש העולם.",
                "scholarly": "תהלים פ\"א:ד'-ה'; ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "Although tochachah is a great mitzvah — 'You shall surely rebuke your fellow' (Vayikra 19:17), and every Jew is obligated — not everyone is qualified to deliver it. Rabbi Akiva said (Arachin 16b): 'I would be surprised if there is anyone in this generation who knows how to rebuke.' Wrong rebuke does damage; only certain voices are tools of repair, and reaching that voice requires its own avodah.",
                "intermediate": "אע\"פ שהתוכחה מצוה גדולה ('הוכח תוכיח את עמיתך', ויקרא י\"ט:י\"ז), לא כל אחד ראוי לתוכחה. אמר ר\"ע (ערכין ט\"ז ע\"ב): 'תמיהני אם יש בדור הזה מי שיודע להוכיח'. *Why*: wrong rebuke wounds; right rebuke heals.",
                "scholarly": "ויקרא י\"ט:י\"ז; ערכין ט\"ז ע\"ב; ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "Reaching the voice of true tochachah requires tefillah — prayer rooted in rachamim and tachanunim (Avos ch. 2). Rachamim depends on da'as, as the verse says, 'They shall not hurt nor destroy in all My holy mountain, for the earth shall be full of da'as of HaShem as the waters cover the sea' (Yeshayahu 11:9). Without da'as there is no rachamim; without rachamim there is no tefillah; without tefillah there is no voice of rebuke.",
                "intermediate": "להגיע לקול התוכחה צריך תפלה ברחמים ותחנונים (אבות פ\"ב). רחמים תלוים בדעת, בחי' (ישעיה י\"א:ט') 'לא ירעו ולא ישחיתו בכל הר קדשי כי מלאה הארץ דעה את ה' כמים לים מכסים'. *Chain*: da'as → rachamim → tefillah → voice-of-tochachah.",
                "scholarly": "ישעיה י\"א:ט'; אבות ב':י\"ג; ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "This is the aspect of thunder (re'amim). Through converts — enabled by the staff of strength — the sitra achra is forced to relinquish its stolen holiness, and HaShem's kavod is amplified: 'Give to HaShem, families of peoples, give to HaShem kavod and oz' (Tehillim 96:7). The thunder breaks the sitra achra's grip; the released kavod is the lightning following the thunder.",
                "intermediate": "וזה בחי' רעמים. ע\"י גרים — שע\"י מטה העוז — מסתלק הסט\"א מהקדושה הגזולה, ומתרבה הכבוד: 'הבו לה' משפחות עמים הבו לה' כבוד ועוז' (תהלים צ\"ו:ז'). *Image*: thunder breaks; lightning reveals; kavod fills.",
                "scholarly": "תהלים צ\"ו:ז'; שמות ד':כ'; ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "The revelation of kavod leads to the spread of nevuah, rooted in the seventy souls of Israel: 'With seventy souls your fathers went down [to Egypt]' (Devarim 10:22). The first letters of bishivim nefesh form Navi (prophet). These souls are tied to kavod: 'Into their council let my soul not come, and in their assembly let my kavod not be united' (Bereshit 49:6).",
                "intermediate": "התגלות הכבוד מביאה התפשטות הנבואה, השרויה בשבעים נפש ישראל: 'בשבעים נפש ירדו אבותיך מצרימה' (דברים י':כ\"ב) — ר\"ת נביא. נפשות אלו קשורות לכבוד, בחי' 'בסודם אל תבא נפשי בקהלם אל תחד כבודי' (בראשית מ\"ט:ו').",
                "scholarly": "דברים י':כ\"ב; בראשית מ\"ט:ו'; ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "All this is the aspect of refuah (healing), encompassing all prior aspects. Kavod's revelation is the rising sun: 'And the kavod of HaShem has risen upon you' (Yeshayahu 60:1) — and that rising brings healing: 'And the sun of righteousness shall rise with healing in its wings' (Malachi 3:20). When the day weakens (sun-set), the sick weaken (Bava Batra 16b); when kavod rises, healing rises with it.",
                "intermediate": "וזה בחי' רפואה הכוללת כל הנ\"ל. התגלות הכבוד = זריחת השמש: 'וכבוד ה' עליך זרח' (ישעיה ס':א'); 'וזרחה לכם יראי שמי שמש צדקה ומרפא בכנפיה' (מלאכי ג':כ'). 'כי איידי דחליש יומא חלשי בריאי' (ב\"ב ט\"ז ע\"ב).",
                "scholarly": "ישעיה ס':א'; מלאכי ג':כ'; ב\"ב ט\"ז ע\"ב"
            },
            {
                "beginner": "The spread of nevuah through kavod sustains: 'The spirit of a man sustains his infirmity' (Mishlei 18:14). Tefillah clears the clouds of the sitra achra, enabling converts and revealing kavod, forgiving iniquity through multiplied prayers — for iniquities are clouds: 'And their darkness shall be... swept away.' Each tefillah dispels one cloud; sustained tefillah clears the entire sky for kavod to shine.",
                "intermediate": "התפשטות הנבואה ע\"י הכבוד מקיימת: 'רוח איש יכלכל מחלהו' (משלי י\"ח:י\"ד). תפלה מסלקת ענני סט\"א, מכשירה הגרים ומגלה הכבוד, מוחלת עוונות (שעוונות = עננים).",
                "scholarly": "משלי י\"ח:י\"ד; ישעיה מ\"ד:כ\"ב; ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "Nevuah refines the koach hamedameh (the imaginative power): 'And by the hand of the prophets I use similitudes' (Hoshea 12:11). This strengthens true emunah and nullifies false beliefs. Faith applies precisely where intellect fails — relying on imagination — and prophecy, with its ten levels corresponding to the ten utterances of creation, calibrates the imagination so it can be a tool of emunah rather than of fantasy.",
                "intermediate": "הנבואה מצרפת את כח המדמה, בחי' (הושע י\"ב:י\"א) 'וביד הנביאים אדמה' — מחזקת אמונה אמיתית ומבטלת אמונות זרות. *Pivot*: imagination is dangerous when uncalibrated; prophecy calibrates it.",
                "scholarly": "הושע י\"ב:י\"א; ל\"מ ח\"א סי' נ\"ד; ל\"מ ח\"א סי' ח'"
            },
            {
                "beginner": "One must diligently seek a true manhig with a prophetic spirit: 'a different spirit' (Bamidbar 14:24, of Calev), distinguishing him from false leaders — 'a man in whom there is spirit' (Bamidbar 27:18, of Yehoshua). Even without full prophecy in our generation, this holy spirit strengthens emunah in those who draw near, unlike false leaders whose spirit spreads false belief.",
                "intermediate": "צריך לחפש מנהיג אמיתי שיש לו רוח נבואה — בחי' 'רוח אחרת' (במדבר י\"ד:כ\"ד), 'איש אשר רוח בו' (במדבר כ\"ז:י\"ח). אף שאין נבואה גמורה בדורות אלו — רוח הקדש מחזקת האמונה במתקרבים.",
                "scholarly": "במדבר י\"ד:כ\"ד; במדבר כ\"ז:י\"ח; ל\"מ ח\"א סי' ז'"
            },
            {
                "beginner": "Emunah enables future world-renewal: 'olam chesed yibaneh' (Tehillim 89:3) — through emunah in the night, 'and Your faithfulness in the nights' (Tehillim 92:3). The nights are dreams (Iyov 33:15), the realm of imagination; emunah-in-the-nights is precisely the calibrated imagination delivered through nevuah. This leads to: 'They are new every morning; great is Your faith' (Eichah 3:23) — daily renewal of creation via emunah.",
                "intermediate": "האמונה מאפשרת חידוש העולם לעתיד: 'עולם חסד יבנה' (תהלים פ\"ט:ג') ע\"י אמונה בלילות, 'ואמונתך בלילות' (תהלים צ\"ב:ג'); הלילות = חלומות (איוב ל\"ג); 'חדשים לבקרים רבה אמונתך' (איכה ג':כ\"ג).",
                "scholarly": "תהלים פ\"ט:ג'; תהלים צ\"ב:ג'; איוב ל\"ג:ט\"ו; איכה ג':כ\"ג"
            },
            {
                "beginner": "The future renewal will be through niflaos (wonders) — pure providence, not nature — like Eretz Yisrael's foundation: 'The power of His works He has declared to His people' (Tehillim 111:6, Rashi to Bereshit 1:1) showing He gave Israel the Land. As the verse says, 'Always the eyes of HaShem your G-d are upon it' (Devarim 11:12). The new song: 'Sing to HaShem a new song, His praise from the end of the earth' (Yeshayahu 42:10) — niflaos overruling teva.",
                "intermediate": "חידוש לעתיד יהיה ע\"י נפלאות — השגחה לבדה, לא טבע, כא\"י: 'כח מעשיו הגיד לעמו' (תהלים קי\"א:ו', רש\"י ר\"פ בראשית). 'תמיד עיני ה' אלקיך בה' (דברים י\"א:י\"ב). 'שירו לה' שיר חדש' (ישעיה מ\"ב:י').",
                "scholarly": "תהלים קי\"א:ו'; דברים י\"א:י\"ב; ישעיה מ\"ב:י'; רש\"י בראשית א':א'"
            },
            {
                "beginner": "Rosh HaShanah embodies judgment: 'For the law belongs to G-d' (Devarim 1:17). Its prayers extract vitality from the sitra achra — 'a chok for Israel' (Tehillim 81:5; Beitzah 16a teaches the chok is the year's sustenance) — using the staff of strength. This is Tishrei, as in: 'You crushed with Your strength the sea' (Tehillim 74:13) — the first letters spelling 'Tishrei' (the 'sea' = sitra achra; its 'crushing' = the avodah of Rosh HaShanah).",
                "intermediate": "ר\"ה = משפט, 'כי המשפט לאלקים הוא' (דברים א':י\"ז). תפלות ר\"ה שואבות החיות מן הסט\"א — 'חק לישראל' (תהלים פ\"א:ה'; ביצה ט\"ז ע\"א, חק לשנת המזונות) — ע\"י מטה העוז. תשרי = 'אתה פוררת בעזך ים' (תהלים ע\"ד:י\"ג; ר\"ת תשרי).",
                "scholarly": "דברים א':י\"ז; תהלים פ\"א:ה'; ביצה ט\"ז ע\"א; תהלים ע\"ד:י\"ג"
            },
            {
                "beginner": "This entire teaching connects to the lung (re'ah), which encompasses all the previous aspects when its functions are in harmony. The ba'al koach (man of strength) — who prays with intensity in the mode of din, as exemplified by 'And Pinchas stood up and prayed' (Tehillim 106:30) — acts as a faithful messenger, his strength rooted in the lung's balanced air and water.",
                "intermediate": "תורה זו קשורה לריאה הכוללת כל הבחינות הנ\"ל. בעל הכח המתפלל בעוצמה במדת הדין, בחי' (תהלים ק\"ו:ל') 'ויעמוד פינחס ויפלל' — שליח נאמן ששרשו בריאה מאוזנת.",
                "scholarly": "תהלים ק\"ו:ל'; חולין מ\"ט ע\"א; ל\"מ ח\"ב סי' ה'"
            },
            {
                "beginner": "The repair of the imaginative is in the aspect of the lung. For sleep and imagination depend on the lung — the main of sleep and dream is through cold and moist (the lung's nature), and therefore in the season of rains, sleep falls on a person. The lung is cold and moist, through which sleep and imagination come. Rectifying the imagination means rectifying the lung; therefore prophecy and healing both meet in the lung.",
                "intermediate": "תיקון המדמה = בחי' ריאה. שינה ודמיון תלויים בריאה (קרה ולחה). בעת הגשמים — עת השינה. *Convergence*: prophecy (refines imagination) and healing (refines lung) meet at one organ.",
                "scholarly": "ברכות ס\"א ע\"ב; ל\"מ ח\"ב סי' ה'; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "The renewal of the world (chiddush ha'olam) is connected to the lung, as the verse says: 'You send forth Your spirit, they are created; and You renew the face of the earth' (Tehillim 104:30) — referring to the breath of the lung's wings, symbolizing the flow of divine vitality. The lung's breathing below mirrors the breath of HaShem renewing creation; one breath in tefillah = one renewal of the world.",
                "intermediate": "חידוש העולם קשור לריאה, בחי' (תהלים ק\"ד:ל') 'תשלח רוחך יבראון ותחדש פני אדמה' — נשמת כנפי הריאה. *Cosmic-anatomical parallel*: each breath of tefillah = micro-renewal of creation.",
                "scholarly": "תהלים ק\"ד:ל'; חולין מ\"ט ע\"א; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "'And I will make them joyful in My house of tefillah' (Yeshayahu 56:7) — the mountain of three parsangs represents tefillah drawn from the three brains (chochmah-binah-da'as), which form barriers to invasive thought and give rise to three types of rachamim, corresponding to the three daily prayers. The sitra achra's invasion is blocked by the three brains; the three tefillos are the active fortification.",
                "intermediate": "'ושמחתים בבית תפלתי' (ישעיה נ\"ו:ז') — הר שלש פרסאות = תפלה הנמשכת מג' מוחין שעושים מחיצות, וג' מיני רחמים = ג' תפלות יומיומיות.",
                "scholarly": "ישעיה נ\"ו:ז'; ברכות כ\"ו ע\"ב; ל\"מ ח\"א סי' ל\"א"
            },
            {
                "beginner": "The first letters of three key words combine into a kabbalistic acronym for the staff of strength used in prayer to defeat the sitra achra. Each letter represents a power; together they form the unbreakable shaft. The hidden combinations within liturgical Hebrew are themselves the weapons; correct kavanah at the right phrase deploys them.",
                "intermediate": "ר\"ת מילים מרכזיות = צירוף קבלי המהוה את 'מטה עוז' של התפלה כנגד הסט\"א. *Praxis*: kavanah on these initials = the actual deployment.",
                "scholarly": "ל\"מ ח\"ב סי' ח'; שער הכוונות"
            },
            {
                "beginner": "The interconnection: tochachah requires voice; voice requires tefillah; tefillah requires rachamim and da'as; da'as requires emunah; emunah requires nevuah; nevuah requires kavod; kavod is revealed through converts; converts come through the staff of strength; the staff of strength is wielded through the lung's balanced breath; the lung's balanced breath renews the world. Each link feeds the next; the shofar of Tishrei calls all the links into alignment at once.",
                "intermediate": "השרשרת: תוכחה ← קול ← תפלה ← רחמים+דעת ← אמונה ← נבואה ← כבוד ← גרים ← מטה עוז ← ריאה ← חידוש העולם. השופר של תשרי קורא את כל החוליות לסדרן.",
                "scholarly": "ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "All this completes the unfolding of 'Blow the shofar at the new month, at the concealed time for the day of our festival' — the shofar calls every link of the chain into operation, and the day of judgment becomes the day of festival because the entire system is restored at once. Tinyana T1 began this trail; T8 closes the same verse-circuit through tochachah, prophecy, the lung, and chiddush ha'olam.",
                "intermediate": "כל זה השלמת 'תקעו בחדש שופר בכסה ליום חגנו' — השופר קורא לכל החוליות לפעולה. תניינא א' פתח, תניינא ח' סוגר את אותו פסוק עצמו דרך תוכחה-נבואה-ריאה-חידוש.",
                "scholarly": "תהלים פ\"א:ד'-ה'; ל\"מ ח\"ב סי' א'; ל\"מ ח\"ב סי' ח'"
            },
        ]
    },
    9: {
        "title_en": "El Asher Yiyeh Shamah HaRuach LaLeches Yelechu (To Wherever the Spirit Would Go, They Went)",
        "title_he": "אל אשר יהיה שמה הרוח ללכת ילכו",
        "segs": [
            {
                "beginner": "The verse from Yechezkel's chariot vision: 'To wherever the spirit would go, they went' (Yechezkel 1:12). The Tikunei Zohar (Tikkun 13, 27a) explains: all the arteries of the heart are guided by this spirit. The heart's circulation, both physical and spiritual, follows ruach; where the ruach moves, the chayos (life-arteries of Israel) move with it.",
                "intermediate": "'אל אשר יהיה שמה הרוח ללכת ילכו' (יחזקאל א':י\"ב). תיקוני זהר (תיקון י\"ג, דף כ\"ז ע\"א): כל ערקי דלבא נהיגין מהאי רוחא. *Architecture*: ruach = the conductor; the heart's arteries (Israel's vital channels) follow.",
                "scholarly": "יחזקאל א':י\"ב; תיקוני זהר תיקון י\"ג; ל\"מ ח\"ב סי' ט'"
            },
            {
                "beginner": "Through the spirit, the lamp is extinguished or kindled — as we see in sensory experience: sometimes the lamp is extinguished by blowing wind, and sometimes the extinguished lamp is kindled by the wind blown into it. The same wind kills or revives, depending on direction and force; the leader's ruach can extinguish weak yir'ah or kindle dormant fire — the same breath, two opposite outcomes.",
                "intermediate": "ע\"י הרוח — הנר נכבה או נדלק, כמשמעות החוש: לפעמים נכבה הנר ע\"י הרוח, ולפעמים נדלק הכבוי ע\"י נשיפה. *Same wind, two outcomes*: depends on the heart it meets and the direction of the breath.",
                "scholarly": "תיקוני זהר תיקון י\"ג; ל\"מ ח\"ב סי' ט'"
            },
            {
                "beginner": "Lamp-extinguishing happens when impurities (ashiness, eirev rav residue) burden the heart of Israel, hindering its divine connection. Therefore the leaders must clear these impurities from each Jew's heart, enabling the inner fire to return, connect, and bind together — uniting Israel into the heart that beats as one. The leader's true work: not to add fire, but to remove the ash so the existing fire can breathe.",
                "intermediate": "כיבוי הנר — כשטומאות (אפר, ערב רב) מכבידות את לב ישראל. לכן המנהיגים צריכים להסיר טומאות אלו מלב כל אחד, ואז האש החזרה ומתאחדת. *Re-orientation*: leadership = removing ash, not adding fire.",
                "scholarly": "שמות י\"ב:ל\"ח; ל\"מ ח\"ב סי' ט'"
            },
        ]
    },
    10: {
        "title_en": "HaOlam Rechokim MeHaShem Mipnei SheChaserim Yishuv HaDa'as (The World is Distant from HaShem Because They Lack Settlement of Mind)",
        "title_he": "העולם רחוקים מה' מפני שחסרים ישוב הדעת",
        "segs": [
            {
                "beginner": "That the world is distant from HaShem and does not draw near to Him is only because they lack yishuv hada'as — settled mind — and do not calm their da'as. The reason for human spiritual exile is not theological complexity but mental restlessness: a da'as that cannot sit still cannot grasp HaShem's nearness. The cure is not more thinking but settled-thinking.",
                "intermediate": "מה שהעולם רחוקים מה' ואינם מתקרבים — רק מפני שחסר להם ישוב הדעת ואינם מיישבים דעתם. *Diagnosis*: not theology, but agitation. Cure: not more chochmah, but yishuv.",
                "scholarly": "ל\"מ ח\"ב סי' י'"
            },
            {
                "beginner": "Joy is the world of freedom — 'For with joy you shall go out' (Yeshayahu 55:12) — through joy one becomes free and goes out from exile. When one binds joy to the brain (mo'ach) and to da'as, then da'as is liberated, free from the exile of agitation. Yishuv hada'as cannot be commanded directly; it arrives as a byproduct of joy bound to mind.",
                "intermediate": "השמחה = עולם החירות, 'כי בשמחה תצאו' (ישעיה נ\"ה:י\"ב) — ע\"י שמחה יוצאים מגלות. כשקושרים שמחה למוח ולדעת — הדעת משתחררת מהגלות. *Mechanism*: simchah → mo'ach → da'as → yishuv → kirvas HaShem.",
                "scholarly": "ישעיה נ\"ה:י\"ב; ל\"מ ח\"ב סי' י'"
            },
            {
                "beginner": "Moav's da'as was settled because they did not go into exile — 'Moav has been at ease from his youth, and has not gone into exile, therefore his taste has remained in him' (Yirmiyahu 48:11; Megillah 12b). And to come to joy is through finding in oneself some good point in any service one has performed. Even a single found-good-point ignites joy; joy unfreezes the mind; the unfrozen mind discovers HaShem already nearby.",
                "intermediate": "מואב — דעתו מיושבת כי לא גלו, 'שאנן מואב מנעוריו... ולא הלך בגולה על כן עמד טעמו בו' (ירמיה מ\"ח:י\"א; מגילה י\"ב ע\"ב). השמחה — ע\"י נקודה טובה הנמצאת בעצמו (אזמרה לאלקי בעודי). *One point starts the chain*.",
                "scholarly": "ירמיה מ\"ח:י\"א; מגילה י\"ב ע\"ב; ל\"מ ח\"א סי' רפ\"ב"
            },
        ]
    },
    11: {
        "title_en": "K'sheAdam Mispalel BaSadeh (When a Person Prays in the Field)",
        "title_he": "כשאדם מתפלל בשדה",
        "segs": [
            {
                "beginner": "Know — when a person prays in the field, then all the grasses come into the prayer and assist him, giving him strength. This is the aspect of why prayer is called sichah (conversation), the aspect of 'And Yitzchak went out to converse in the field' (Bereshit 24:63), where siach is also the word for the bushes of the field (siach hasadeh, Bereshit 2:5). The grasses' presence is not metaphor: they actively rise and bind into the human prayer.",
                "intermediate": "כשאדם מתפלל בשדה — כל העשבים נכנסים לתפלה ומסייעים ונותנים בו כח. וזה בחי' תפלה שנקראת 'שיחה' (בראשית כ\"ד:ס\"ג: 'ויצא יצחק לשוח בשדה'), 'שיח השדה' (בראשית ב':ה'). *Not metaphor*: each grass actually rises into the man's prayer.",
                "scholarly": "בראשית כ\"ד:ס\"ג; בראשית ב':ה'; ל\"מ ח\"ב סי' י\"א; שיחות הר\"ן ק\"מ"
            },
        ]
    },
    12: {
        "title_en": "K'sheAdam Holech Achar Sichlo VeChochmaso (When a Person Goes After His Intellect and Wisdom)",
        "title_he": "כשאדם הולך אחר שכלו וחכמתו",
        "segs": [
            {
                "beginner": "When a person goes after his intellect and wisdom, he can fall into errors and many stumbling blocks and come to grave spiritual harm — there are those who have spoiled greatly through this, including the great wicked ones who built sophisticated systems on their own intellect. Sichli alone, ungrounded in emunah, becomes a labyrinth of errors that grow more elaborate the further one walks in them.",
                "intermediate": "כשאדם הולך אחר שכלו וחכמתו — יכול ליפול בטעויות ומכשולים רבים ולבא לקלקול גדול ח\"ו. ויש שקלקלו הרבה — הרשעים הגדולים שבנו בנינים על שכלם. *Warning*: sichli without emunah-anchor = labyrinth.",
                "scholarly": "ל\"מ ח\"ב סי' י\"ב; משלי ג':ה'"
            },
            {
                "beginner": "The remedy and the very meaning of teshuvah: when one has fallen into error, one searches for HaShem's kavod precisely there — at the question 'ayeh' (where) — for from the very greatness of His concealment and hiding, He enlivens these places. Through one falling there and then asking 'where is the place of His kavod,' in this very asking one returns and attaches to that place, enlivening one's fall and ascending in the supernal worlds.",
                "intermediate": "ע\"י שאלת 'אַיֵּה' — מתוך גודל ההסתרה הוא ית' מחיה את המקומות הללו. וכשהאדם נופל שם ושואל 'איה מקום כבודו' — באותו השאלה דייקא חוזר ומתחבר שם, ומחיה נפילתו ועולה בעולמות העליונים. *Engine of teshuvah*: the question itself is the reconnection.",
                "scholarly": "ישעיה ל\"ג:י\"ח (איה ספר); זהר; ל\"מ ח\"א סי' י\"ב; ל\"מ ח\"א סי' רפ\"ב"
            },
            {
                "beginner": "This is the aspect of Bereshis — closed (sealed) utterance — and this is the aspect of teshuvah, for this is the main teshuvah: when a person seeks and searches after His kavod, sees in himself that he is distant from His kavod, and yearns to return. The seeking-while-distant is itself the teshuvah; one need not arrive before returning has begun.",
                "intermediate": "וזה בחי' 'בראשית' = מאמר סתום. וזה בחי' תשובה: עיקר התשובה — כשאדם מחפש ומבקש כבודו ית' ורואה שהוא רחוק וכוסף לחזור. *Insight*: searching-while-distant = the actual teshuvah.",
                "scholarly": "בראשית רבה א'; ל\"מ ח\"א סי' רפ\"ב; ל\"מ ח\"ב סי' י\"ב"
            },
        ]
    },
    13: {
        "title_en": "Kol HaMekatreg Alav Yoter Mekarvo Yoter LaShem (Every Disputer Brings Him Closer to HaShem)",
        "title_he": "כל החולק עליו יותר מקרבו יותר לה'",
        "segs": [
            {
                "beginner": "When they dispute against the person, it is found that they pursue him and he flees each time to HaShem. The more they dispute, the closer he draws — for HaShem, the comprehensive Place, receives every flight. Disputes that wound the body push the soul into HaShem's hands; the wounder unwittingly performs the work of bringing the wounded closer.",
                "intermediate": "כשחולקים על האדם — רודפים אותו והוא בורח להשי\"ת. ככל שחולקים יותר — מתקרב יותר, כי הוא ית' מקומו של עולם. *Inversion*: persecutor = inadvertent agent of kirvas HaShem.",
                "scholarly": "ל\"מ ח\"ב סי' י\"ג; שיחות הר\"ן ק\"ב"
            },
        ]
    },
    14: {
        "title_en": "Rabbim Lochamim Li MiMarom (Many Fight Against Me from the Heights)",
        "title_he": "רבים לוחמים לי ממרום",
        "segs": [
            {
                "beginner": "'Many fight against me from the heights' (Tehillim 56:3) — meaning he has adversaries above, in the spiritual realms. As the Sages said (Sanhedrin 103b): just as there are adversaries below, so there are adversaries above; just as there are accusers in this world, so there are accusers in the world above. The disputes one feels from people are the visible part of disputes raging in heaven; resolving them takes more than worldly diplomacy.",
                "intermediate": "'רבים לוחמים לי ממרום' (תהלים נ\"ו:ג') — שיש לו מקטרגים למעלה, בעולמות העליונים. כדאמרו רז\"ל (סנהדרין ק\"ג ע\"ב): כשם שיש מקטרגים למטה כך למעלה. *Insight*: visible disputes = surface of supernal accusations.",
                "scholarly": "תהלים נ\"ו:ג'; סנהדרין ק\"ג ע\"ב; ל\"מ ח\"ב סי' י\"ד"
            },
        ]
    },
    15: {
        "title_en": "HaMisga'im B'Sheker (Those Who Glorify Themselves in Falsehood)",
        "title_he": "המתגאים בשקר",
        "segs": [
            {
                "beginner": "There are those who glorify themselves in falsehood with great and wondrous things — as if no thing is withheld from them, all is in their hand — and there are even leaders of the generation who do this. They are the false mefursamim, the renowned-through-azus that Rebbe Nachman warns against repeatedly. They claim mastery over realms they have not entered.",
                "intermediate": "יש המתגאים בשקר בדברים גדולים ונוראים, כאילו אין מעצור בידם, ומהם מנהיגי הדור. הם המפורסמים שע\"י עזות, שהזהיר עליהם רבינו פעם אחר פעם.",
                "scholarly": "ל\"מ ח\"ב סי' ט\"ו; ל\"מ ח\"א סי' רכ\"ב; ל\"מ ח\"ב סי' א'"
            },
            {
                "beginner": "Therefore their charity is evil to the tzaddik, for the tzaddik receives the speech of his mouth from charity. When the charity is spoiled by these false leaders (their tzedakah is contaminated by their pride), it causes blemish to the speech of the tzaddik who would have received from there. Therefore it is good for the tzaddik to refuse charity from such sources, however generous they appear.",
                "intermediate": "ולכן צדקתם רעה לצדיק, כי הצדיק מקבל דבור פיו מן הצדקה. כשמקולקלת אצלם — פוגמת בדבור הצדיק המקבל ממנה. ולכן טוב שלא יקבל הצדיק מהם.",
                "scholarly": "ל\"מ ח\"ב סי' ט\"ו; ב\"ב י' ע\"ב"
            },
            {
                "beginner": "Rabbi Zeira asked Rabbi Yehudah a question that opens a hidden teaching about the true tzaddik versus the boastful pretender — disguised as a zoological curiosity but containing the entire critique of the false mefursamim. The Sages often hide their sharpest critiques in apparent trivia.",
                "intermediate": "ר' זירא שאל את ר' יהודה — שאלה הפותחת תורה נסתרת על ההפרש בין הצדיק האמיתי למפורסם השקרי, מוסות בלבוש זואולוגי. *Method*: gemara hides sharp critique in apparent trivia.",
                "scholarly": "שבת ע\"ז ע\"ב; ל\"מ ח\"ב סי' ט\"ו"
            },
            {
                "beginner": "What is the reason the camel has a short tail and the ox a long tail? (Shabbat 77b). The Talmud's question, on the surface a riddle of biology, becomes the Rebbe's vehicle for distinguishing the simple humble tzaddik (camel) from the public-display tzaddik (ox).",
                "intermediate": "'מ\"ט גמלא זוטר גנובתיה ותורא אריכא גנובתיה' (שבת ע\"ז ע\"ב). הריבותא הזואולוגית = משל לצדיק פשוט מול צדיק לראוה.",
                "scholarly": "שבת ע\"ז ע\"ב"
            },
            {
                "beginner": "The camel's short tail is the aspect of the simple tzaddik — 'I have not walked in great things, nor in wonders that are too high for me; surely I have stilled and quieted my soul, like a weaned child upon his mother' (Tehillim 131:1-2). He conducts himself in simplicity, does not speak great things, and all his service is in the aspect of silence — for there is no need to make himself known. The camel does not need a long tail to wave; it carries its silence.",
                "intermediate": "גמלא = בחי' צדיק פשוט, בחי' (תהלים קל\"א:ב') 'ולא הלכתי בגדולות ובנפלאות ממני... כגמול עלי אמו'. מתנהג בפשיטות, אינו מדבר גדולות, וכל עבודתו בבחי' שתיקה. *Image*: camel = quiet bearer of burden; no need for display.",
                "scholarly": "תהלים קל\"א:א'-ב'; ל\"מ ח\"ב סי' ט\"ו"
            },
            {
                "beginner": "The ox with the long tail represents the publicly-displayed tzaddik — broadcasting his wonders, requiring others to see them. The long tail is the aspect of azus and self-publicity; the short tail of the camel is the aspect of pnimius and hiddenness. The Talmud's biological question is therefore Rebbe Nachman's standard for distinguishing the two kinds of mefursamim — the criterion is not in their words but in the length of their tail.",
                "intermediate": "תור עם זנב ארוך = בחי' צדיק לראוה, מוסר נפלאותיו לפרסום. הזנב הארוך = עזות; הזנב הקצר = פנימיות והסתר. *Criterion*: not the words, but the length of the tail.",
                "scholarly": "שבת ע\"ז ע\"ב; ל\"מ ח\"ב סי' ט\"ו"
            },
        ]
    },
    16: {
        "title_en": "Madua K'sheAdam Mevakesh Parnasah (Why When a Person Seeks Livelihood)",
        "title_he": "מדוע כשאדם מבקש פרנסה",
        "segs": [
            {
                "beginner": "They asked: why, when a person seeks parnasah, is it not given to him prepared and set from heaven, but instead through causes — each according to his cause: this one needs to sow grain, plough, and reap; this one needs to travel; this one needs to trade. Why must HaShem clothe parnasah in labor? The answer: the labor is itself the human contribution to a divine kindness, and that contribution is precisely what makes the parnasah his own.",
                "intermediate": "מדוע הפרנסה אינה ניתנת מן השמים מוכנה, אלא ע\"י סיבות — כל אחד לפי סיבתו? *Resolution*: the labor is the human investiture; without labor, the parnasah would not become 'his own' — it is the work that converts gift to earnings.",
                "scholarly": "ל\"מ ח\"ב סי' ט\"ז; ב\"ר א'; ל\"מ ח\"א סי' נ\"ד"
            },
        ]
    },
    17: {
        "title_en": "Tzarich LeHizaher Le'Heyot B'Simchah B'Shabbos (One Must Be Joyful on Shabbos)",
        "title_he": "צריך להזהר להיות בשמחה בשבת",
        "segs": [
            {
                "beginner": "One must be very careful to be joyful and good-hearted on Shabbos, for the virtues and holiness of Shabbos are great and precious — as brought in Reishis Chochmah, Sha'ar HaKedushah, end of chapter 2. Shabbos joy is not a recommendation but a load-bearing avodah. The day's whole structure rests on the kavanah of being b'simchah; sad Shabbos is a damaged Shabbos.",
                "intermediate": "צריך להזהר מאוד להיות בשמחה ובטוב לב בשבת, כי מעלות וקדושת שבת גדולות מאוד (ראשית חכמה, שער הקדושה, סוף פ\"ב). *Weight*: Shabbos joy is structural, not decorative.",
                "scholarly": "ראשית חכמה, שער הקדושה, פ\"ב; ל\"מ ח\"ב סי' י\"ז"
            },
            {
                "beginner": "On Shabbos, da'as is complete; on weekdays, the fear can be mixed with foolishness — 'Is not your fear your foolishness?' (Iyov 4:6). The main foolishness is because of the servitude of weekday-work — through avodah of weekday, da'as is incomplete; therefore yir'ah on weekday is also imperfect. Shabbos liberates da'as from its weekday entanglements; the yir'ah of Shabbos is therefore yir'ah without foolishness.",
                "intermediate": "בשבת — הדעת שלמה; בחול — היראה יכולה להתערב בשטות, בחי' (איוב ד':ו') 'הלא יראתך כסלתך'. עיקר השטות מחמת השעבוד שבחול. *Equation*: weekday-yir'ah = yir'ah ± foolishness; Shabbos-yir'ah = yir'ah cleansed.",
                "scholarly": "איוב ד':ו'; תיקוני זהר תיקון ט'; ל\"מ ח\"ב סי' י\"ז"
            },
            {
                "beginner": "Through Shabbos one raises the fallen fears — that is, fears one sometimes has of officials and the like — for through da'as one knows that there is no power but HaShem's, and the fears of secondary causes (a king, a bureaucrat, a financial threat) collapse into the singular fear of Heaven. The Shabbos joy redistributes one's fears: lifting them from earthly authorities into their proper destination.",
                "intermediate": "ע\"י שבת מרים היראות הנפולות — היראות שיש לפעמים משר וכדומה — שע\"י הדעת יודע שאין שלטון אלא לו ית'. *Redistribution*: fear of authority → fear of Heaven; the energy is the same, only redirected.",
                "scholarly": "תיקוני זהר תיקון ט'; ל\"מ ח\"ב סי' י\"ז"
            },
            {
                "beginner": "All the more so it is forbidden for a person to look at his fellow with evil eye — to find in him precisely what is not good and to search for defects in his service. On the contrary, one is obligated to look only on the good — and through this looking on the good, the person is judged on the scale of merit and is brought to teshuvah. The Tanchuma teaches (Re'eh 1) that what one searches for in others is what one finds; the eye is a creator of what it seeks.",
                "intermediate": "כל שכן שאסור להסתכל על חברו לרעה — לבקש בו דווקא מה שאינו טוב ולחפש פגמים. אדרבה, חייב להסתכל רק על הטוב, וע\"י זה דנים אותו לכף זכות ומביאו לתשובה (תנחומא ראה א'). *Eye creates what it seeks*.",
                "scholarly": "תנחומא ראה א'; אבות א':ו'; ל\"מ ח\"א סי' רפ\"ב"
            },
        ]
    },
    18: {
        "title_en": "Sakanah Gedolah LeHispar'sem (Great Danger to Be Famous)",
        "title_he": "סכנה גדולה להתפרסם",
        "segs": [
            {
                "beginner": "There is great danger in being famous and in leading the world — not only when one is wholly unworthy and wears a tallit not his own (the false mefursam), but even servants of HaShem in truth, true greats of the generation, have terrible dangers in leading the world. The danger does not end at sincerity; it extends through every stage of public visibility. Even authentic leaders walk a knife's edge above an abyss.",
                "intermediate": "סכנה גדולה להתפרסם ולהנהיג את העולם — לא רק כשאינו ראוי כלל ולובש טלית שאינה שלו, אלא אפילו עבדי ה' אמיתיים, גדולי הדור, יש להם סכנות נוראות בהנהגת העולם. *Insight*: sincerity does not eliminate the spiritual hazards of fame.",
                "scholarly": "ל\"מ ח\"ב סי' י\"ח; ל\"מ ח\"א סי' י\"ח"
            },
        ]
    },
    19: {
        "title_en": "Ikar HaTachlis Hu LaAvod HaShem B'Temimut Gemurah (The Main Purpose is to Serve HaShem in Complete Innocence)",
        "title_he": "עיקר התכלית לעבוד ה' בתמימות גמורה",
        "segs": [
            {
                "beginner": "[This Torah was not heard from his holy mouth himself; see in the omissions.] The main purpose and completeness is only to serve HaShem in complete innocence (temimus gemurah), without any chochmah or sophistication. The verse at the end of Kohelet declares: 'For this is all of man — fear G-d and keep His commandments' (Kohelet 12:13). The end of all wisdom is unsophisticated yir'ah.",
                "intermediate": "[תורה זו לא נשמעה מפיו הקדוש; ראה בהשמטות.] עיקר התכלית והשלמות — רק לעבוד את ה' בתמימות גמורה, בלי שום חכמות. סוף קהלת: 'סוף דבר הכל נשמע את האלקים ירא ואת מצותיו שמור כי זה כל האדם' (קהלת י\"ב:י\"ג).",
                "scholarly": "קהלת י\"ב:י\"ג; ל\"מ ח\"ב סי' י\"ט; שיחות הר\"ן ר\"כ"
            },
            {
                "beginner": "And this is what Kohelet concluded: 'For this is all of man' — meaning, for this purpose every person can fulfill and attain. Since the main is yir'as Shamayim, every person can attain the tachlis. There is no privileged caste of philosophers; the simple Jew with simple yir'ah is equal in the deepest sense to the greatest sage. In truth, it is a prohibition to philosophize — entering into investigations of the basics is itself a corruption of temimus.",
                "intermediate": "וזה ש'הכל נשמע... כי זה כל האדם' — שכל אדם יכול לקיים ולהשיג התכלית, שהעיקר 'את האלקים ירא'. ובאמת אסור להתחקר במחקרים. *Egalitarian*: tachlis is equally accessible to all; chakirah closes the path rather than opening it.",
                "scholarly": "קהלת י\"ב:י\"ג; חובות הלבבות, שער היחוד; ל\"מ ח\"ב סי' י\"ט"
            },
            {
                "beginner": "And this is the main tachlis truly. The investigators and deniers interpret all the Torah according to their philosophies and heresies — that all the Torah, even the practical mitzvos, is to be interpreted according to form and intellect, not to mention the stories of the Torah which they read as allegory. Their entire enterprise is a denial of peshat. The temimus of the simple Jew preserves the Torah as it is; the chochmah of the chakran dissolves it.",
                "intermediate": "החוקרים והכופרים מפרשים כל התורה לפי חכמותיהם וכפירתם — אפילו מצות מעשיות הם הופכים לצורה ושכל, וכל שכן את הסיפורים. *Defense*: temimus preserves Torah; chakirah dissolves it.",
                "scholarly": "ל\"מ ח\"ב סי' י\"ט; שיחות הר\"ן ל\"ה"
            },
            {
                "beginner": "(As above — this Torah was not heard from his holy mouth itself; see in the omissions from this.) The repeated note about provenance is itself instructive: even Rebbe Nachman's words, when not transmitted directly from his mouth, must be read with caution. Chassidic teachings have a chain of transmission; breaks in the chain are honestly noted. This itself is an example of temimus — the honest stewardship of teachings without inflating them.",
                "intermediate": "(כנ\"ל — תורה זו לא נשמעה מפיו הקדוש; ראה בהשמטות.) *Meta-note*: even Rebbe Nachman's transmission chain is honestly marked; this is itself an act of temimus.",
                "scholarly": "ל\"מ ח\"ב סי' י\"ט, השמטות"
            },
        ]
    },
    20: {
        "title_en": "Al Yedei HaMachloket SheBaOlam (Through the Dispute that is in the World)",
        "title_he": "ע\"י המחלוקת שבעולם",
        "segs": [
            {
                "beginner": "(Belongs to Sefer HaMidos / Aleph Bet new — Part II.) Entry of 'Quarrel,' item 10. Through the dispute that is in the world, by means of this they become famous before their time. When one enters the service of HaShem, one needs to linger and delay until one becomes famous in the world properly — gradually, in measure with one's avodah. Premature fame, accelerated by machloket, breaks the natural ripening of leadership.",
                "intermediate": "(שייך לס\"ה ב' — מחלוקת אות י'.) ע\"י המחלוקת שבעולם — מתפרסמים קודם זמנם. כשנכנסים לעבודת ה' צריך להמתין ולשהות עד שיתפרסם בעולם כראוי. *Warning*: machloket-driven fame = premature ripening = brittle leadership.",
                "scholarly": "ספר המדות, אות מחלוקת י'; ל\"מ ח\"ב סי' כ'"
            },
            {
                "beginner": "Through the blemish of the will — meaning when one has not yet built the proper ratzon — fame arrives anyway through the disputes one has provoked, and this fame is not aligned with one's actual avodah. Therefore one becomes a public figure for reasons unconnected to the true ratzon, and the fame's content becomes the controversy itself rather than the holy work. The remedy is patience — delaying fame until the avodah ripens — rather than capitalizing on disputes.",
                "intermediate": "ע\"י פגם הרצון — כשעדיין אין הרצון בנוי כראוי — מתפרסם דרך המחלוקות שעורר, ופרסום זה אינו מותאם לעבודתו האמיתית. *Cure*: patience; let the avodah ripen before the name spreads.",
                "scholarly": "ספר המדות, אות מחלוקת י'; ל\"מ ח\"ב סי' כ'"
            },
        ]
    },
}

written = []
for n, info in torahs.items():
    if not info.get('segs'):
        continue
    segs_out = []
    for s in info['segs']:
        segs_out.append({
            "beginner": {"en": s["beginner"], "he": ""},
            "intermediate": {"en": s["intermediate"], "he": ""},
            "scholarly": {"en": "", "he": s["scholarly"]}
        })
    data = {
        "id": f"pnc-2-{n}",
        "book": pnc_name,
        "part": 2,
        "torah": n,
        "title": f"T{n} (Tinyana) PNC - {info['title_en']}",
        "hebrewTitle": info['title_he'],
        "author": "Pettek Nanach",
        "segments": segs_out
    }
    fname = os.path.join(pnc_dir, f"tinyana-{n}.json")
    with open(fname, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(fname, 'r', encoding='utf-8') as f:
        rt = json.load(f)
    assert rt['id'] == data['id']
    assert len(rt['segments']) == len(segs_out)
    written.append((n, len(segs_out)))
    print(f"OK Tinyana T{n}: wrote {len(segs_out)} segs".encode('ascii','replace').decode())

cpath = os.path.join(home, '.openclaw/workspace/ajew-org/src/data/lm-commentaries.json')
with open(cpath, 'r', encoding='utf-8') as f:
    cdata = json.load(f)
if '2' not in cdata:
    cdata['2'] = {}
for n, info in torahs.items():
    sn = str(n)
    if sn not in cdata['2']:
        cdata['2'][sn] = {}
    cdata['2'][sn]['running_commentary'] = {
        "book": pnc_name,
        "slug": pnc_book_slug,
        "status": "available",
        "url": f"/reader/{pnc_book_slug}/tinyana-{n}.json",
        "layers": ["beginner", "intermediate", "scholarly"],
        "author": "Pettek Nanach",
        "label": f"Pettek Nanach Running Commentary - Tinyana T{n} ({info['title_en']})"
    }
with open(cpath, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print(f"\nDone: {written}")
