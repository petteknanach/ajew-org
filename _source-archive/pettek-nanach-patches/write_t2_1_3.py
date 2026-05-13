import json, os, sys

home = os.path.expanduser('~')
reader_dir = os.path.join(home, '.openclaw/workspace/ajew-org/public/reader')
pnc_name = "pettek-nanach-commentary"
pnc_book_slug = pnc_name
pnc_dir = os.path.join(reader_dir, pnc_name)

# Tinyana commentaries: Part 2
torahs = {
    1: {
        "title_en": "Tiku Vachodesh Shofar (Blow the Shofar at the Renewal of the Month)",
        "title_he": "תקעו בחדש שופר",
        "segs": [
            {
                "beginner": "Rebbe Nachman opens his second volume with the verse 'Blow the shofar at the new month, when the moon is concealed, on the day of our festival' (Tehillim 81:4). This single verse will hold the keys to the entire teaching: the renewal of the moon (Rosh Chodesh and the regalim), the shofar (the heart), and the day of festival (judgment sweetened into joy). Israel was created with one ultimate purpose — to attain dominion over the very angels who minister before HaShem.",
                "intermediate": "פתיחתא: 'תקעו בחדש שופר בכסה ליום חגנו' (Tehillim 81:4) — חדש = renewal of the moon, שופר = the heart, יום חגנו = day of judgment turned festival. The drasha will weave: memshalah over angels → hiskashrus to tzaddikim → mefursamim shel sheker → three lusts → three regalim → prophecy → tefillah → refuah → Mashiach → Rosh HaShanah. *Sources*: Tehillim 81:4; Tikunei Zohar 137; Yerushalmi Shabbat ch. 2.",
                "scholarly": "תהלים פא:ד; תקוני זהר דף קל\"ז; ירושלמי שבת פ\"ב"
            },
            {
                "beginner": "Israel was created so that he should rule over the angels — this is the tachlis, the very purpose of his existence. The Sages teach that tzaddikim are greater than the ministering angels, for the angels must ask 'What has G-d wrought?' while the tzaddik decrees and HaShem fulfills. To live for any lesser purpose is to forfeit the crown for which man was made.",
                "intermediate": "האדם מישראל נברא להיות לו ממשלה על המלאכים (Tikunei Zohar 137). זה התכלית והסוף של ישראל, כדאמרו רז\"ל (ירושלמי שבת פ\"ב): 'הצדיקים גדולים ממלאכי השרת'. *Insight*: memshalah is not arrogance but tachlis — the angels themselves were created to serve this dominion.",
                "scholarly": "תקוני זהר דף קל\"ז; ירושלמי שבת פ\"ב; חולין צ\"א ע\"ב; בראשית רבה ע\"ח"
            },
            {
                "beginner": "How does one attain this dominion? Only by binding oneself to the souls of Israel. As the verse says, 'He grasps the face of the throne' (Iyov 26:9) — one must grasp himself to the roots of the souls of Israel, which are hewn from beneath the Throne of Glory. Alone, no one can rule the angels; bound to Klal Yisrael's collective root, one is lifted above them.",
                "intermediate": "העצה לזה: להתקשר בנשמות ישראל. ע\"י ההתקשרות ניצול מהמלאכים, בחי' (איוב כ\"ו:ט) 'מאחז פני כסא' — שיאחז עצמו בשרשי הנשמה, החצובים מתחת כסא הכבוד. *Application*: hiskashrus to Klal Yisrael through the tzaddik is the practical gateway to spiritual dominion.",
                "scholarly": "איוב כ\"ו:ט; זהר תרומה דף קמ\"ב; שער הגלגולים הקדמה כ\"ט"
            },
            {
                "beginner": "To bind oneself to the root of Israel's souls, one must know who the true mefursamim — the renowned tzaddikim — of the generation actually are. There are mefursamim of truth and mefursamim of azus (sheer audacity who have made themselves famous through brashness). Recognizing them is itself a high spiritual accomplishment, and Rebbe Nachman now reveals the criterion.",
                "intermediate": "להתקשר בשרשי הנשמה צריך לידע מקור כל הנשמות, ועיקר — לידע מי הם המפורסמים האמיתיים של הדור ולהתקשר בהם דייקא. *Note*: The 'mefursamim shel sheker' (renowned of falsehood) are a major theme throughout Likutey Moharan; here they enter for the first time in Tinyana.",
                "scholarly": "ל\"מ ח\"א סי' ל\"א; ל\"מ ח\"א סי' ס\"א; ל\"מ ח\"א סי' רכ\"ב"
            },
            {
                "beginner": "The discernment between true and false mefursamim is achieved through the building of Yerushalayim, which is the aspect of the heart. For Yerushalayim is 'complete fear' (yir'ah sheleimah), and the heart contains three traits that, when corrupted, ruin the fear of Heaven: love of wealth (mamon), excessive eating (achilah), and forbidden intimacy (niuf). When the heart is purified of these three, the false mefursamim can no longer hide behind their azus.",
                "intermediate": "להכיר המפורסמים שהם ע\"י עזות — ע\"י בנין ירושלים שהיא בחי' הלב (תקוני זהר כ\"א דף מ\"ט). ירושלים = יראה שלמה. שלש מדות בלב פוגמות ביראה: חמדת ממון, חמדת אכילה, ניאוף. *Architecture*: heart = Yerushalayim; three lusts = three breaches in its walls.",
                "scholarly": "תקוני זהר כ\"א דף מ\"ט; מדרש רבה וירא נ\"ו; מדרש רבה במדבר ב'; ל\"מ ח\"א סי' ר\"ז"
            },
            {
                "beginner": "Each of the three traits has its root in the heart. Wealth — 'the blessing of HaShem, it enriches, and no sorrow is added' (Mishlei 10:22) — connects to the heart through grief: 'And He was grieved in His heart' (Bereshit 6:6). Eating connects to the heart because food strengthens or weakens it. Intimacy connects through the heart's heat, for milk of an impudent woman creates inner fire: 'My heart was hot within me' (Tehillim 39:4).",
                "intermediate": "שלש מדות אלו בלב הן: עשירות בחי' (משלי י\"כ): 'ברכת ה' היא תעשיר ולא יוסף עצב', בחי' 'ויתעצב אל לבו' (בראשית ו'); אכילה דרך הלב; ניאוף בחי' 'חם לבי בקרבי' (תהלים ל\"ט:ד) — וחלב = ר\"ת חלב, רומז לחימום הניאוף.",
                "scholarly": "משלי י':כ\"ב; בראשית ו':ו'; תהלים ל\"ט:ד; ברכות ג' ע\"ב"
            },
            {
                "beginner": "Conversely, the milk of an impudent woman creates much heat — recalling the verse 'My heart was hot within me' — and the Hebrew word ChaLaV (חלב) is itself an acronym hinting at the three lusts. The Sages teach that during each watch of the night, HaShem 'sits and roars' over the destruction of the Beit HaMikdash; this 'roar' is the same heat that ruins the heart's Yerushalayim.",
                "intermediate": "חלב של אשה עזה — חום רב, בחי' 'חם לבי בקרבי' (תהלים ל\"ט:ד), ר\"ת חלב כנ\"ל. וזה (ברכות ג' ע\"ב) 'בכל משמרה הקב\"ה יושב ושואג' — אותו שאון של חורבן הוא חום הלב הנפגם.",
                "scholarly": "תהלים ל\"ט:ד; ברכות ג' ע\"ב"
            },
            {
                "beginner": "The remedy for all three traits is daas — clear, settled knowledge. As the verse says, 'You shall know today and bring it down to your heart' (Devarim 4:39). One must draw daas from the brain into the heart; through this descent, all three traits are rectified at once. Without daas, the lusts dominate the heart; with daas brought down into it, the heart becomes Yerushalayim again.",
                "intermediate": "התיקון לשלשתן ע\"י דעת — להמשיך הדעת אל הלב, בחי' (דברים ד':ל\"ט) 'וידעת היום והשבות אל לבבך'. *Method*: לימוד עיון, התבוננות, וידוי דברים — כל אלה ממשיכים דעת מן המוח אל הלב.",
                "scholarly": "דברים ד':ל\"ט; ל\"מ ח\"א סי' רנ\"ד; ליקו\"ה הכשר כלים ד':כ\"ה"
            },
            {
                "beginner": "Each trait is rectified at one of the three regalim. At Shavuot, the lust for forbidden intimacy is rectified, for at Matan Torah blood became turbid and turned to milk (the impure heat of niuf transforms into the pure nurturing of Torah). At Sukkot, the lust for eating is rectified, for Sukkot is called 'the festival of gathering' — eating becomes elevated to mitzvah-eating in the sukkah. At Pesach, the lust for wealth is rectified, for Pesach is the rectification of Egypt where Israel left with great wealth that did not corrupt them.",
                "intermediate": "שלש רגלים מתקנים שלש מדות: שבועות מתקן ניאוף — דם נעכר ונעשה חלב (כוונות ספירת העומר ושבועות; באר היטב או\"ח תצ\"ד:ח'); סוכות מתקן אכילה — חג האסיף; פסח מתקן ממון — יציאת מצרים ברכוש גדול. *Architecture*: heart's three breaches ↔ three regalim's three rectifications.",
                "scholarly": "שמות י\"ב:ל\"ה; ויקרא כ\"ג; באר היטב או\"ח תצ\"ד:ח'; כוונות ספירת העומר"
            },
            {
                "beginner": "Once Yerushalayim — the perfected fear of Heaven in the heart — is rebuilt, an angel is created who bestows prophecy upon those who are vessels for it. Prophecy comes from the aspect of the cherubim, as the verse says, 'And he heard the voice speaking to him from above the cover that was upon the Ark of the Testimony, from between the two cherubim' (Bamidbar 7:89). The cherubim are inside the Holy of Holies, the heart of the Mikdash.",
                "intermediate": "ע\"י בנין ירושלים — תיקון יראה שלמה בלב — נברא מלאך המשפיע נבואה לכלי הנבואה. שהנבואה מבחי' הכרובים, בחי' (במדבר ז':פ\"ט) 'וישמע את הקול מדבר אליו מעל הכפרת... מבין שני הכרובים'. *Geometry*: heart of body = Holy of Holies = cherubim = source of prophecy.",
                "scholarly": "במדבר ז':פ\"ט; שמות כ\"ה; חגיגה י\"ג ע\"ב; זהר תרומה דף קע\"ו"
            },
            {
                "beginner": "Once prophecy is drawn into the world — even if no actual prophet rises — even small ones can prophesy, as the verse promises: 'Your sons and daughters shall prophesy' (Yoel 3:1). The presence of the channel of prophecy in the world elevates the spiritual sensitivity of all souls.",
                "intermediate": "ואז נמשך נבואה, ואפילו הקטנים יכולים להתנבאות, בחי' (יואל ג':א') 'ונבאו בניכם ובנותיכם'. *Note*: this is not formal prophecy but ruach hakodesh-level intuition that becomes available when the channel exists.",
                "scholarly": "יואל ג':א'; ספרי במדבר; ל\"מ ח\"ב סי' ח'"
            },
            {
                "beginner": "But there is one great danger to guard against: hismanus, the chase after appointed positions of authority. One who has fear of Heaven discovers his words are heeded (Berachot 6b); naturally he begins to crave appointment over others. He must guard himself exceedingly, for one who runs to be appointed is one who buries his own fear.",
                "intermediate": "אבל צריך לשמר עצמו מאוד מהיתמנות, כי הזוכה ליראה יש לו תאוה להתמנות. הירא שמים — דבריו נשמעים (ברכות ו' ע\"ב), ומפני זה כוסף להתמנות, אבל צריך לברוח מזה. *Practical*: yir'as Shamayim creates influence; influence tempts toward authority; authority destroys yir'ah.",
                "scholarly": "ברכות ו' ע\"ב; פסחים פ\"ז ע\"ב; ל\"מ ח\"א סי' י'"
            },
            {
                "beginner": "Through the bestowal of prophecy in the world, prayer itself is redeemed and saved. People belittle prayer, rushing through it to discharge an obligation, treating it like an affliction to endure. But prayer is exalted beyond measure — it is the very speech of HaShem entering the world. When the channel of prophecy is open, prayer rises from being a chore to being the supreme work.",
                "intermediate": "ע\"י השפעת נבואה — אף שאין מתנבאים בפועל, רק שיש בחי' השפעת נבואה בעולם — נפדית התפלה. שהתפלה גבוהה מאוד, ובני אדם מזלזלים בה, רוצים לפטור עצמם בה כעול. *Application*: when one feels prayer as a burden, that itself is the impairment that needs the redemption of prayer.",
                "scholarly": "ל\"מ ח\"א סי' ב'; שיחות הר\"ן ע\"ה; שבת י' ע\"א"
            },
            {
                "beginner": "When prayer is redeemed, all the doctors fall — there is no more need for medicines. Why? Because every herbal medicine receives its power from a specific star and constellation, as the Sages teach, 'There is not a single blade of grass below that does not have a constellation above striking it and saying: Grow' (Bereshit Rabbah 10). Plants heal from the angels and stars; prayer heals from the source above all of them.",
                "intermediate": "וכשנפדית התפלה — כל הרופאים נופלים, שאין צריך רפואות, כי כל רפואות ע\"י עשבים, וכל עשב מקבל כח ממזל ומכוכב פרטי (בראשית רבה י'). *Architecture*: herbs ← stars ← angels; prayer ← word of HaShem (above the angels).",
                "scholarly": "בראשית רבה י'; ב\"ק פ' ע\"ב; שבת קנ\"ו ע\"א; זהר חדש בראשית"
            },
            {
                "beginner": "Then the verse is fulfilled: 'And He shall bless your bread and your water, and I will remove sickness from your midst' (Shemot 23:25). Healing comes through bread and water themselves, not through specialized herbs, because they are blessed from the root of all — the word of HaShem, which is the aspect of prayer. Bread and water gain the power to heal that herbs once held, because they are nourished directly from the supernal root.",
                "intermediate": "ואז 'וברך את לחמך ואת מימיך והסירותי מחלה' (שמות כ\"ג:כ\"ה) — הרפואה דרך לחם ומים, ע\"י שמתברכים משרש הכל = דבר ה' = תפלה. *Insight*: when prayer is whole, ordinary food becomes medicine.",
                "scholarly": "שמות כ\"ג:כ\"ה; ברכות מ' ע\"א; ל\"מ ח\"א סי' רנ\"ד"
            },
            {
                "beginner": "At the supernal root — the word of HaShem — there is no distinction between bread, water, and herbs. All are one expression of the divine speech. When one grasps this root through the aspect of prayer, one can draw healing powers into ordinary bread and water and have them heal as the most potent herbs once did. Above the source, all distinctions dissolve.",
                "intermediate": "אבל למעלה בשרש הכל = דבר ה' — הכל אחד, אין חילוק בין לחם ומים לעשבים. הנאחז בשרש = תפלה — יכול להמשיך כחות הרפואה אל לחם ומים. *Architecture*: at the root, plurality of remedies collapses into the singular efficacy of HaShem's word.",
                "scholarly": "ל\"מ ח\"א סי' ב'; זהר תרומה דף קל\"ה"
            },
            {
                "beginner": "However, three impairments destroy the service of prayer just as the three lusts destroyed the heart. They are: (a) scorning any human being — 'Do not despise any person' (Pirkei Avos 4); (b) avodah zarah, including any imperfection of emunah, for incomplete faith is itself an aspect of idolatry; (c) impairment of the bris (sexual misconduct). These three impair prayer just as the three lusts impair the heart.",
                "intermediate": "שלש עבודות פוגמות בעבודת התפלה: (א) 'אל תהי בז לכל אדם' (אבות ד'); (ב) ע\"ז ואפילו פגם אמונה הוא בחי' ע\"ז; (ג) פגם הברית. *Symmetry*: שלש מדות בלב ↔ שלש עבודות פוגמות בתפלה.",
                "scholarly": "אבות ד'; שבת ק\"ה ע\"ב; ל\"מ ח\"א סי' י\"א; ליקו\"ה תפלה"
            },
            {
                "beginner": "Sicknesses themselves divide into two categories. There is sickness of growth — like a seed sown in the ground that rots, sprouts, branches, and bears fruit; and there is sickness in the aspect of completion. The first kind is a process; the second is a final state. The verses 'And heed His commandments and keep all His statutes' point to the rectification: the mitzvos themselves are the medicines, divided according to which kind of sickness they heal.",
                "intermediate": "יש חילוק בין החולאים: יש חולי בבחי' צמיחה — כזריעה ברקבון ובצמיחה; ויש חולי בבחי' שלמות. שני סוגים אלו — שני סוגי תיקון מצות.",
                "scholarly": "שבת ל\"ב ע\"א; ל\"מ ח\"א סי' רס\"ח"
            },
            {
                "beginner": "'And heed His commandments' is the rectification of the bris, the aspect of 'And Avraham circumcised Yitzchak his son at eight days, as G-d commanded him' (Bereshit 21:4) — circumcision was 'as commanded.' 'And keep all His statutes' is the rectification of emunah, the opposite of avodah zarah and impaired faith. These two together are the rectifications for the three impairments of prayer (the third — not despising people — is implicit in both).",
                "intermediate": "'ושמרת את מצותיו' = תיקון הברית, בחי' 'וימל אברהם את יצחק בנו בן שמונת ימים כאשר צוה אותו אלקים' (בראשית כ\"א:ד'). 'ושמרת את כל חקותיו' = תיקון אמונה, היפך ע\"ז ופגם אמונה.",
                "scholarly": "בראשית כ\"א:ד'; דברים ו'; ל\"מ ח\"א סי' ז'"
            },
            {
                "beginner": "Then one can be healed even from a complete (fully developed) sickness, through the aspect of the word of HaShem. The verse 'And He shall bless your bread… and I shall remove sickness from your midst' (Shemot 23:25) covers complete sickness as well, for through the word of HaShem one can be healed permanently with anything in the world. The cure becomes universal because its source is universal.",
                "intermediate": "ואז גם מחולי שלם — נרפא ע\"י דבר ה'. 'וברך את לחמך... והסירותי מחלה מקרבך' (שמות כ\"ג:כ\"ה) = גם חולי שלם. *Promise*: דבר ה' = רפואה לעולם, בכל דבר.",
                "scholarly": "שמות כ\"ג:כ\"ה; ל\"מ ח\"א סי' ב'"
            },
            {
                "beginner": "All this is the aspect of the shining of Mashiach. For everything is distinguished from everything else by three things: appearance (mar'eh), taste (ta'am), and scent (rei'ach). The Hebrew word for rain — geshem — forms an acronym hinting at all three: G-Sh-M = Gevulei mar'eh, Shemen ta'am, Mei rei'ach. The thing that causes all plants to grow (rain) is itself the source of these three distinctions, and Mashiach will reveal them at their root in the word of HaShem.",
                "intermediate": "וזה בחי' הארת המשיח: כל דבר מובדל מחבירו ע\"י מראה, טעם, ריח. גשם = ר\"ת גוון מראה, שמן טעם, מי ריח. *Architecture*: rain (above) → herbs (middle) → distinction in three dimensions (below). Mashiach reveals the unity of the source.",
                "scholarly": "ל\"מ ח\"א סי' י\"ז; שבת ל\"א ע\"א; ב\"ב ע\"ה ע\"א"
            },
            {
                "beginner": "This is the aspect of bearing favor — 'And Esther found favor in the eyes of all who saw her' (Esther 2:15), for each one thought she was of his nation (Megillah 13a). The master of prayer reaches the supernal root from which all powers and ministering princes draw their strength; thus every nation finds its own essence in him, and he carries favor in the eyes of all.",
                "intermediate": "וזה בחי' נשיאת חן: 'ותהי אסתר נשאת חן בעיני כל ראיה' (אסתר ב':ט\"ו) — שכל אחד חשבה משלו (מגילה י\"ג ע\"א). שהבעל תפלה הוא בבחי' דבר ה' = שרש העליון, ולכן כל האומות מקבלים ממנו לפי שרשם.",
                "scholarly": "אסתר ב':ט\"ו; מגילה י\"ג ע\"א; ל\"מ ח\"ב סי' א'"
            },
            {
                "beginner": "Then the master of prayer can recognize the false mefursamim — the renowned through azus — for their audacity falls before him. When one merits prayer at the level of the word of HaShem, the supernal root from which all the heavenly princes draw their power, the false mefursamim — who borrowed their authority from those very princes — now bow before the source itself. Their azus collapses.",
                "intermediate": "אז יכול להכיר המפורסמים שע\"י עזות — שעזותם נופלת לפניו. כשזוכה לתפלה = דבר ה' = שרש עליון — כל השרים והצבאות העליונים בטלים אליו, וגם המפורסמים השואבים מהם.",
                "scholarly": "ל\"מ ח\"א סי' ל\"א; ל\"מ ח\"א סי' רכ\"ב"
            },
            {
                "beginner": "Then one can 'make Rosh HaShanah.' For when a person sits to speak about his fellow, this is itself the aspect of Rosh HaShanah — the day of judgment, when one sits and judges his fellow. One must be exceedingly careful here and examine himself thoroughly: is he worthy to judge another? For the Sages warned, 'Do not judge your fellow until you reach his place' (Avos 2:4) — and only HaShem fully reaches every place.",
                "intermediate": "אז יכול לעשות ראש השנה: כי כשיושב אדם לדבר בחברו = בחי' ראש השנה = יום הדין שיושב ודן את חברו. צריך להזהר מאוד ולבחון עצמו אם ראוי לדון חברו, כי 'אל תדין את חברך עד שתגיע למקומו' (אבות ב':ד').",
                "scholarly": "אבות ב':ד'; ר\"ה ט\"ז ע\"ב; ל\"מ ח\"א סי' רפ\"ב"
            },
            {
                "beginner": "Therefore HaShem can hold Rosh HaShanah — the day of judgment — because He fulfills 'Do not judge your fellow until you reach his place,' for HaShem is 'the Place of the world' (and the world is not His place). This is the aspect of 'Holiness befits Your house, HaShem, for length of days' (Tehillim 93:5) — His holiness in judgment endures forever because He alone reaches every creature's place.",
                "intermediate": "ולכן הוא ית' יכול לעשות ראש השנה — יום הדין — כי הוא מקיים 'אל תדין את חברך עד שתגיע למקומו', שהוא ית' מקומו של עולם (כדאמרו רז\"ל). וזה (תהלים צ\"ג:ה') 'לביתך נאוה קדש ה' לאורך ימים'.",
                "scholarly": "תהלים צ\"ג:ה'; בראשית רבה ס\"ח; ר\"ה ט\"ז ע\"ב"
            },
            {
                "beginner": "'In the month' (BaChodesh) is the aspect of the renewal of the mind in the three regalim — for all the moadim and festivals come through the renewal of the moon (Tehillim 104:19): 'He made the moon for the appointed times.' 'Shofar' is the aspect of the heart, which is nourished from the seventy faces of Torah. 'On the day of our festival' is the aspect of Rosh HaShanah, the day of judgment which becomes the day of festival when the discernment of the false mefursamim is achieved.",
                "intermediate": "'בחדש' = חידוש המוחין בשלש רגלים (תהלים ק\"ד:י\"ט: 'עשה ירח למועדים'). 'שופר' = הלב הנזון מע' פנים של תורה. 'ליום חגנו' = ראש השנה, יום הדין שנהפך לחג. *Synthesis*: the opening verse encodes the entire teaching.",
                "scholarly": "תהלים ק\"ד:י\"ט; תהלים פ\"א:ד'; ר\"ה ח' ע\"א"
            },
            {
                "beginner": "There is a question regarding prophecy: the angel that bestows prophecy — 'the angel who redeems' — is below the place of prophecy itself, for this angel is the aspect of the Shechinah. So how can a lower angel bestow what is higher than itself? The resolution lies in the Shechinah's role as the conduit: she gathers from above and transmits below. The angel's lowness does not limit the prophecy's height; it limits only the form in which it can be received.",
                "intermediate": "קושיא: המלאך המשפיע נבואה — בחי' 'המלאך הגואל' — הוא תחת מקום הנבואה, כי מלאך זה בחי' שכינה. וכי איך מלאך תחתון משפיע נבואה עליונה? תירוץ: השכינה היא הצינור — מקבלת מלמעלה ומשפיעה למטה.",
                "scholarly": "בראשית מ\"ח:ט\"ז; זהר תרומה דף קע\"ו; ל\"מ ח\"א סי' כ\"ב"
            },
        ]
    },
    2: {
        "title_en": "Yemei Chanukah Yemei Hodaa (The Days of Chanukah Are Days of Thanksgiving)",
        "title_he": "ימי חנוכה ימי הודאה",
        "segs": [
            {
                "beginner": "The days of Chanukah are days of hodaa — thanksgiving and confession of HaShem's kindness — as we say in Al HaNissim: 'They established these eight days of Chanukah to give thanks and to praise.' Thanksgiving is no small matter; it is the very shaashua, the delight, of the World to Come. For in the World to Come, sacrifices and prayers are batel, but the thanksgiving offering and prayers of thanks remain forever (Vayikra Rabbah 9).",
                "intermediate": "ימי חנוכה ימי הודאה (על הנסים). הודאה = שעשוע עוה\"ב, כי לעתיד כל הקרבנות בטלים חוץ מקרבן תודה, וכל התפלות בטלות חוץ מתפלת הודאה (ויקרא רבה ט'). *Insight*: hodaa outlasts every other avodah because it is the avodah of olam haba itself.",
                "scholarly": "על הנסים; ויקרא רבה ט'; פסחים קי\"ח ע\"א; שיחות הר\"ן ז'"
            },
            {
                "beginner": "The aspect of hodaa, which is the shaashua of olam haba, is itself the aspect of halachos — Jewish laws, specifically halachah lema'aseh. The halachos one merits to learn — and especially to innovate in (chiddushei halachah) — are the very shaashua of the World to Come, as the Sages say (Niddah 73a): 'Whoever studies halachos every day is assured of olam haba.'",
                "intermediate": "בחי' הודאה = שעשוע עוה\"ב = בחי' הלכות. ההלכות שזוכה ללמוד, וביותר מי שזוכה לחדש בהן — בחי' שעשוע עוה\"ב, בחי' (נדה ע\"ג): 'כל השונה הלכות בכל יום מובטח לו שהוא בן עוה\"ב'. *Application*: chiddushei Torah are the substance of one's olam haba.",
                "scholarly": "נדה ע\"ג ע\"א; מגילה כ\"ח ע\"ב; ל\"מ ח\"א סי' ק\"א"
            },
            {
                "beginner": "When a person falls into distress, ch\"v, the essence of the distress lodges in the heart, for 'the heart knows the bitterness of its soul' (Mishlei 14:10) — the heart is the deepest knower (Berachot 61a). Therefore the rectification must reach the heart, and that rectification is hodaa — for thanksgiving moves the blood downward from where it had crowded the heart, releasing the constriction.",
                "intermediate": "כשנופל לצרה, ח\"ו — עיקר הצרה בלב, ש'לב יודע מרת נפשו' (משלי י\"ד:י'), 'לבא הוא דידע' (ברכות ס\"א ע\"א). תיקונה ע\"י הודאה. *Mechanism*: distress = blood flooding the heart; hodaa = blood descending to limbs; relief = blood properly distributed.",
                "scholarly": "משלי י\"ד:י'; ברכות ס\"א ע\"א; זהר ויקרא דף כ\"ה"
            },
            {
                "beginner": "From this comes easy childbirth: when a woman crouches to give birth, her thighs become cold (Sotah 11b). The blood rises upward away from the lower extremities, the place becomes constricted, and the child is pushed outward. This same dynamic plays in the heart's rectification: when blood is properly directed (through hodaa), constriction in the wrong place is released and birth — physical or spiritual — proceeds.",
                "intermediate": "ומזה לידה קלה: שהאשה כשכורעת ללדת, יריכותיה צוננות (סוטה י\"א ע\"ב), הדם עולה ונדחק והולד יוצא. *Parallel*: birth (body) ↔ rectification of distress (heart) — same mechanism of redistribution.",
                "scholarly": "סוטה י\"א ע\"ב; נדה ל\"א ע\"א"
            },
            {
                "beginner": "The Sages teach (Sotah 10b) that Asa became ill in his feet because he imposed forced labor on Talmidei Chachamim — pulling them away from their study of halachos. Halachos are the aspect of the feet (the lowest, most concrete application), and by impairing the halachos of the world he was struck in the very limbs they correspond to. The rebuke is built into the punishment.",
                "intermediate": "וזה (סוטה י' ע\"ב): 'אסא חלה ברגליו לפי שעשה אנגרייא בתלמידי חכמים' — שמנעם מהלכות; הלכות = בחי' רגלים. *Insight*: the body's parts mirror the soul's avodos; striking one strikes the other.",
                "scholarly": "סוטה י' ע\"ב; מלכים-א ט\"ו; ל\"מ ח\"א סי' י\"ב"
            },
            {
                "beginner": "When one merits the aspect of hodaa — halachah — the light of truth is revealed and shines in speech itself. Initially, when blood floods the heart, truth is impaired: 'Men of blood hate the upright' (Mishlei 29:12) — the bloody (distressed) heart hates truth. But once hodaa releases the constriction, truth can shine. The square of speech (the four-cornered fullness of refined human speech) is built on this revealed truth.",
                "intermediate": "כשזוכה להודאה — הלכה — אור האמת מתגלה בדבור. תחלה, כשהדם שופע בלב = פגם האמת, בחי' (משלי כ\"ט:י\"ב) 'אנשי דמים ישנאו תם'. אח\"כ, כשנפדה — האמת זורחת. *Architecture*: heart distressed → speech corrupted; heart healed → speech truthful.",
                "scholarly": "משלי כ\"ט:י\"ב; שבת נ\"ה ע\"א; ל\"מ ח\"א סי' ל\"ח"
            },
            {
                "beginner": "Moshe said, 'I am not a man of words' (Shemot 4:10) — meaning he had not yet attained the speech of righteousness, the aspect of 'Good is the man who is gracious and lends, who sustains his words' (Tehillim 112:5), referring to acts of chesed and tzedakah expressed in speech. There is also the speech of teshuvah: 'Take words with you and return to HaShem' (Hoshea 14:3). The full square of speech includes prayer, Torah, matchmaking, and tzedakah-speech — all rectified through truth.",
                "intermediate": "'לא איש דברים אנכי' (שמות ד':י') = דבור הצדקה, בחי' (תהלים קי\"ב:ה') 'טוב איש חונן ומלוה יכלכל דבריו במשפט' = מעשי חסד וצדקה בדבור. ויש דבור התשובה (הושע י\"ד:ג'): 'קחו עמכם דברים ושובו אל ה''. *Square of speech*: tefillah, Torah, shidduch, tzedakah.",
                "scholarly": "שמות ד':י'; תהלים קי\"ב:ה'; הושע י\"ד:ג'; ל\"מ ח\"ב סי' מ\"ד"
            },
            {
                "beginner": "Through the three names — El, Elohim, and HaShem — which correspond to prayer, Torah, and shidduch (matchmaking, including the matching of soul to its source), speech reaches perfection through truth. This is the square of speech, perfected through the truth of the heart freed from distress. Each name names a different mode of HaShem's relating; each mode births a different kind of true speech.",
                "intermediate": "ע\"י שלשת השמות הנ\"ל — אל, אלהים, הוי\"ה — בחי' תפלה, תורה, שידוך — מתתקן הדבור באמת = רבוע הדבור. *Symmetry*: three Names ↔ three speech-modes ↔ four corners of speech (the fourth being the integration in tzedakah).",
                "scholarly": "ל\"מ ח\"א סי' י\"ט; ל\"מ ח\"ב סי' מ\"ד; שער הכוונות"
            },
            {
                "beginner": "The perfection of speech is the aspect of lashon hakodesh — Hebrew, the holy tongue. All other languages are deficient and called 'a stammering tongue' (Yeshayahu 32:4). Perfection exists only in lashon hakodesh, and lashon hakodesh is connected to Shabbat — for Shabbat is the rest in which true unity becomes audible. The six weekdays scatter HaShem's name through varied actions; Shabbat re-collects them into the simple unity expressible only in the holy tongue.",
                "intermediate": "שלמות הדבור = לשון הקדש. כל לשונות הגוים פגומים, נקראים 'לשון עלגים' (ישעיה ל\"ב:ד'). השלמות רק בלשה\"ק, והלשה\"ק קשורה לשבת — שהשבת = יחוד פשוט הנשמע בלשה\"ק. *Architecture*: weekdays = compound names; Shabbat = simple Name (Y-H-V-H).",
                "scholarly": "ישעיה ל\"ב:ד'; שבת קי\"ט ע\"א; ל\"מ ח\"א סי' י\"ט"
            },
            {
                "beginner": "Through drawing the holiness of Shabbat into the six weekdays, the simple unity of HaShem is revealed. During the weekdays, varied actions occur — each day created a different creature, corresponding to the diversity of human intellect that requires multiplicity to grasp. But the simple unity behind all the variety is the same; Shabbat reveals that the diversity itself is one.",
                "intermediate": "ע\"י המשכת קדושת שבת לששת ימי החול — מתגלה היחוד הפשוט. בששת ימי החול = פעולות משונות, כל יום נברא דבר אחר, כנגד שכל האדם המבין בריבוי. *Insight*: tzimtzum into multiplicity is for the sake of human apprehension; Shabbat re-reveals the simple Source.",
                "scholarly": "בראשית א'; שבת י' ע\"ב; ל\"מ ח\"א סי' ל\"א"
            },
            {
                "beginner": "This is the aspect of the famous incident of Rabbi Eliezer the Great with the oven of Achnai (Bava Metzia 59b), in which the halachah follows him in every place. He wished to demonstrate that he had attained the perfection of the square of speech — through halachos — but the demonstration itself was rejected, for the Torah is no longer in heaven. The incident teaches that even one who attains supernal halachah must submit it to the collective halachic process.",
                "intermediate": "וזה בחי' מעשה ר' אליעזר הגדול עם תנור של עכנאי (ב\"מ נ\"ט ע\"ב), שהלכה כמותו בכל מקום. רצה להראות שזכה לרבוע הדבור — שע\"י הלכות. *Note*: a profound paradox — he had the truth, yet the halachah went against him because 'lo bashamayim hi.'",
                "scholarly": "ב\"מ נ\"ט ע\"ב; דברים ל'; ערובין מ\"ו ע\"ב"
            },
            {
                "beginner": "He demonstrated his attainment with four signs, paralleling the four corners of speech. 'The carob tree shall prove it' — the carob represents the speech of righteousness, planted only for future generations: 'A man planted a carob tree for those who come after him' (Ta'anit 23a). 'The water-channel shall prove it' — flowing water represents the speech of teshuvah. 'The walls of the beit midrash shall prove it' — the walls represent the speech of Torah. 'From heaven let it be proven' — direct speech of prayer answered.",
                "intermediate": "הוכיח בארבעה דברים = ארבע פאות הדבור: 'חרוב יוכיח' = דבור הצדקה (החרוב נטוע לדורות, תענית כ\"ג ע\"א); 'אמת המים יוכיח' = דבור התשובה; 'כותלי בית המדרש' = דבור התורה; 'מן השמים יוכיחו' = דבור התפלה.",
                "scholarly": "ב\"מ נ\"ט ע\"ב; תענית כ\"ג ע\"א; ל\"מ ח\"א סי' י\"ט"
            },
            {
                "beginner": "But the tzaddikim benefit the world with their merit, not themselves (Chullin 86a) — the tzaddikim themselves possess nothing, yet they draw all good to the world. As the Sages said about Rabbi Chanina ben Dosa, 'The whole world is sustained for the sake of Chanina My son, and Chanina My son makes do with a kav of carobs from one Erev Shabbat to the next.' This is the carob — sustenance for others, austerity for self — the very speech of tzedakah Rabbi Eliezer claimed.",
                "intermediate": "אבל הצדיקים מהנים העולם בזכותם ולא לעצמם (חולין פ\"ו ע\"א); הצדיקים בעצמם אין להם כלום אך ממשיכים כל טוב לעולם, כדאמרו רז\"ל על ר' חנינא בן דוסא: 'כל העולם ניזון בשביל חנינא בני וחנינא בני די לו בקב חרובים מע\"ש לע\"ש'.",
                "scholarly": "חולין פ\"ו ע\"א; ברכות י\"ז ע\"ב; תענית כ\"ד ע\"ב"
            },
            {
                "beginner": "This is the aspect of 'Serve HaShem with joy' (Tehillim 100:2) — to draw joy into the aspect of a servant, into Metatron, the aspect of the six weekdays. 'Know that HaShem, He is Elohim' — the simple unity revealed: all the apparent changes through the weekdays are one. Joy is the medium; the simple unity is the message.",
                "intermediate": "בחי' (תהלים ק':ב'): 'עבדו את ה' בשמחה' — להמשיך השמחה לבחי' עבד = מטטרון = ששת ימי המעשה. 'דעו כי ה' הוא האלהים' = יחוד פשוט, שכל השנויים אחד הם.",
                "scholarly": "תהלים ק':ב'; ל\"מ ח\"א סי' י\"ט; זהר אחרי דף ע\"ה"
            },
            {
                "beginner": "This is the aspect of the oil of Chanukah — the light of truth, the aspect of 'Send Your light and Your truth' (Tehillim 43:3). It must be placed near the entrance (Shabbat 21b) — the entrance, in the aspect of 'the openings of your mouth' (Michah 7:5), refers to speech, where truth shines. Oil burns long because the light of truth, once kindled, sustains itself; placed at the threshold of speech, it transforms every word that crosses it.",
                "intermediate": "וזה בחי' השמן = אור האמת, בחי' (תהלים מ\"ג:ג') 'שלח אורך ואמתך'. צריך להניחו בפתח (שבת כ\"א ע\"ב), בחי' (מיכה ז':ה') 'מפתחי פיך' = הדבור. *Symbol*: oil = truth; entrance = mouth; Chanukah = transformation of speech.",
                "scholarly": "תהלים מ\"ג:ג'; מיכה ז':ה'; שבת כ\"א ע\"ב"
            },
            {
                "beginner": "Then the joy of Shabbat is drawn into the six weekdays through lashon hakodesh — the perfection of speech. This is Chanukah, formed of the letters CHaNu KaH — 'rested here' (the resting of Shabbat extending into the weekdays), connected to the priestly blessing 'Thus you shall bless' which is itself in lashon hakodesh. The eight days of Chanukah carry Shabbat's holiness through an entire octave of weekday-time.",
                "intermediate": "אז נמשך שמחת שבת לששת ימי החול ע\"י לשה\"ק = שלמות הדבור. בחי' חנוכה = חנו כ\"ה = מנוחה (שבת) הקשורה ללשה\"ק = 'כה תברכו' בלשה\"ק. *Architecture*: 8 days = Shabbat's rest spanning the full week and beyond.",
                "scholarly": "במדבר ו'; שבת כ\"ב ע\"א; ל\"מ ח\"א סי' י\"ט"
            },
            {
                "beginner": "[The Rebbe noted: 'We have not merited to complete the explanation of the verse according to the above teaching.'] When the heart is in distress, the lung also suffers, for the lung sustains the body — it draws moisture and circulates breath. The body has many forms of moisture, and the lung's role is to balance them. When the heart's blood floods, the lung dries; when the heart's blood is properly distributed, the lung resumes its work.",
                "intermediate": "(לא זכינו להשלים פירוש הכתוב לפי התורה הזאת.) כשהלב בצער — הריאה גם בצער, כי הריאה מקיימת הגוף, מושכת לחות. *Anatomy*: heart and lung as paired organs of the inner body, paralleling truth and breath of the soul.",
                "scholarly": "זהר משפטים דף קכ\"ב; ויקרא רבה ד'; ל\"מ ח\"א סי' רכ\"ה"
            },
            {
                "beginner": "Oil is a remedy for the lung, as the world says — oil moistens. This is the aspect of the oil mentioned earlier, which is the rectification of distress: oil (truth) heals the lung (breath of speech) just as it lights up the entrance of the mouth. When the tzaddik is in pain, many souls in this world and the World to Come mourn with him — and when his pain is relieved through the oil of truth, all those souls are gladdened together.",
                "intermediate": "שמן רפואה לריאה, כדאמרי אנשי, שהשמן מלחלח. וזה בחי' השמן הנ\"ל = תיקון הצער. כשהצדיק בצער — נשמות רבות מתאבלות; כשנגאל — כולן שמחות.",
                "scholarly": "שבת קכ\"ח ע\"ב; ברכות ד' ע\"ב; ל\"מ ח\"ב סי' ב'"
            },
            {
                "beginner": "'A psalm for hodaa' (Tehillim 100:1) forms an acronym hinting at deeper layers, and the entire psalm contains 168 letters. 168 = chesed in the Atbash cipher (where the letters are exchanged from start-to-end with end-to-start). For through chesed — kindness — the aspect of hodaa is drawn down. This is why we say a 'psalm for hodaa' contains 168 letters: the psalm of thanksgiving is itself an extended act of chesed encoded into language.",
                "intermediate": "'מזמור לתודה' = ר\"ת ע' צעקות היולדת לפני הלידה (זהר פנחס דף רמ\"ט ע\"ב). מזמור זה קס\"ח אותיות = חסד באתב\"ש, שע\"י חסד — מתעוררת ההודאה. *Numerical*: 168 letters = ChSD (חסד) by atbash gematria, encoding kindness as the substrate of thanksgiving.",
                "scholarly": "תהלים ק':א'; זהר פנחס דף רמ\"ט ע\"ב; ל\"מ ח\"א סי' י\"ט"
            },
        ]
    },
    3: {
        "title_en": "K'shechalah Rabbi Eliezer HaGadol (When Rabbi Eliezer the Great Fell Ill)",
        "title_he": "כשחלה ר' אליעזר הגדול",
        "segs": [
            {
                "beginner": "When Rabbi Eliezer the Great fell ill, he said to Rabbi Akiva, 'Fierce wrath is in the world' (Sanhedrin 101a) — because there was no one then who could sweeten the judgment, for it required a redemption to sweeten the judgment, and none was available. The connection between sickness and wrath is direct: when the judgments above are unsweetened, sickness erupts below; sweetening requires a tzaddik who can serve as redeemer.",
                "intermediate": "כשחלה ר' אליעזר הגדול אמר לר' עקיבא: 'חרון אף בעולם' (סנהדרין ק\"א ע\"א) — שלא היה אז מי שיוכל להמתיק הדין, כי המתקה צריכה גאולה, ולא היתה. *Cosmology*: din unsweetened → sickness in tzaddik; sweetening → healing.",
                "scholarly": "סנהדרין ק\"א ע\"א; ל\"מ ח\"א סי' רט\"ו; ליקו\"ה רפואה"
            },
            {
                "beginner": "(Note on vocalization:) yerapa with a tzairai (two dots beneath, sounding 'ay') versus with cholam (a dot above, sounding 'o') marks two stages. The cholam is the aspect of sweetening, as the Ari teaches: cholam is numerically three Havayos (3 × 26 = 78) which sweeten three Elokims (3 × 86 = 258 — hint of the same root of sweetening). The vowel itself encodes the metaphysical movement from judgment to mercy.",
                "intermediate": "(הערה בניקוד:) ירפא בצירי (שני נקודות תחת האות, צליל 'אי') לעומת בחולם (נקודה למעלה, צליל 'ו') — בחולם בחי' המתקה, כדאיתא בכתבי האריז\"ל ש'חולם' = ג' הויו\"ת המתקות ג' אלקי\"ם. *Kabbalah*: vowels carry sweetening-codes; cholam sits 'above' the letter, mirroring rachamim above din.",
                "scholarly": "כתבי האר\"י, שער הכוונות, סוד הניקוד; ל\"מ ח\"א סי' י\"ז"
            },
            {
                "beginner": "Cholam Yerafa is the aspect of healings after the sweetening — the aspect of 'Is there no balm in Gilead? Is there no healer there?' (Yirmiyahu 8:22) — i.e., specifically after the sweetening through ve'rapo with cholam, then they can be healed. Without the prior sweetening, there is no healer to be found; once the sweetening is achieved (through a tzaddik who can serve as redeemer), the healing manifests of itself.",
                "intermediate": "חולם 'ירפא' בצירי = רפואה שאחר ההמתקה, בחי' (ירמיה ח':כ\"ב) 'הצרי אין בגלעד אם רופא אין שם'. ע\"י המתקה ב'ורפא' בחולם — דייקא יכולים להתרפא. *Sequence*: din → himtikuh (sweetening via tzaddik-redeemer) → refuah; without step 2, step 3 is unreachable.",
                "scholarly": "ירמיה ח':כ\"ב; שמות ט\"ו:כ\"ו; ל\"מ ח\"א סי' רט\"ו"
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
    # round-trip validate
    with open(fname, 'r', encoding='utf-8') as f:
        rt = json.load(f)
    assert rt['id'] == data['id']
    assert len(rt['segments']) == len(segs_out)
    written.append((n, len(segs_out)))
    print(f"OK Tinyana T{n}: wrote {len(segs_out)} segs -> {fname}".encode('ascii','replace').decode())

# Register in lm-commentaries.json under part '2'
cpath = os.path.join(home, '.openclaw/workspace/ajew-org/src/data/lm-commentaries.json')
with open(cpath, 'r', encoding='utf-8') as f:
    cdata = json.load(f)
if '2' not in cdata:
    cdata['2'] = {}

for n, info in torahs.items():
    sn = str(n)
    if sn not in cdata['2']:
        cdata['2'][sn] = {}
    label = f"Pettek Nanach Running Commentary - Tinyana T{n} ({info['title_en']})"
    cdata['2'][sn]['running_commentary'] = {
        "book": pnc_name,
        "slug": pnc_book_slug,
        "status": "available",
        "url": f"/reader/{pnc_book_slug}/tinyana-{n}.json",
        "layers": ["beginner", "intermediate", "scholarly"],
        "author": "Pettek Nanach",
        "label": label
    }

with open(cpath, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)

print(f"\nDone. Tinyana torahs written: {written}")
print(f"Registered in {cpath}")
