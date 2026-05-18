import json, os

home = os.path.expanduser('~')
reader_dir = os.path.join(home, '.openclaw/workspace/ajew-org/public/reader')
pnc_name = "pettek-nanach-commentary"
pnc_book_slug = pnc_name
pnc_dir = os.path.join(reader_dir, pnc_name)

torahs = {
    7: {
        "title_en": "VaYehi MiKetz — Ki Merachamam Yenahagem (And It Came to Pass at the End — For with Compassion He Will Lead Them)",
        "title_he": "ויהי מקץ — כי מרחמם ינהגם",
        "segs": [
            {
                "beginner": "The verse opens: 'And it came to pass at the end of two years of days, and Pharaoh was dreaming' (Bereshit 41:1). The teaching will weave Yosef's elevation through dream-interpretation, the leader's compassion, the transmission of daas through son and disciple, the makifim of the chochom of the generation, the lung's balanced temperament, and the aspect of Chanukah — all anchored in the prophetic foundation: 'For with compassion He will lead them' (Yeshayahu 49:10).",
                "intermediate": "פתיחתא: 'ויהי מקץ שנתים ימים ופרעה חולם' (בראשית מ\"א:א'); 'כי מרחמם ינהגם' (ישעיה מ\"ט:י'). תורה זו: רחמנות המנהיג → דעת משה → בן ותלמיד → מקיפים → חכם הדור → אכילה → רצון → חנוכה → ריאה → ר\"א ור\"י בים → סוף משה.",
                "scholarly": "בראשית מ\"א:א'; ישעיה מ\"ט:י'; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "'For with compassion He will lead them' (Yeshayahu 49:10) — meaning that one who is compassionate can be a leader. Compassion is a prerequisite for leadership. Yet it is forbidden to have compassion on wicked, on murderers, and on robbers; one who does not know how to direct his compassion may have misplaced compassion in the wrong place. The leader needs not just rachmanus but rachmanus-with-discernment.",
                "intermediate": "'כי מרחמם ינהגם' (ישעיה מ\"ט:י') — שהרחמן יכול להיות מנהיג. אך אסור לרחם על הרשעים ועל הרוצחים והגנבים. *Caveat*: rachmanus without discernment becomes complicity; the leader must hold both compassion and the limits of compassion.",
                "scholarly": "ישעיה מ\"ט:י'; קהלת רבה ז'; שיר השירים רבה"
            },
            {
                "beginner": "And such a fully compassionate leader is only Moshe Rabbenu, because he was the leader of Israel and he will be the leader in the future, for 'what was is what shall be' (Kohelet 1:9). Moshe had true compassion on Israel: he gave his soul for them, threw down his very level for their sake. Every compassionate leader of Israel is a spark of Moshe; the perfect compassionate leader is Moshe himself, returning.",
                "intermediate": "ורחמן כזה רק משה רבינו, שהוא היה המנהיג ויהיה לעתיד, ב'מה שהיה הוא שיהיה' (קהלת א':ט'). משה רחם על ישראל באמת — מסר נפשו, השליך מדרגתו עבורם.",
                "scholarly": "קהלת א':ט'; שמות ל\"ב; דברים ל\"ד; ל\"מ ח\"א סי' ב'"
            },
            {
                "beginner": "The essence of compassion is when Israel — ch\"v — fall into sins; may the Merciful One save us. This is the greatest compassion of all: not to feel sorry for the suffering body, but to feel the soul's danger before HaShem. All the harsh sufferings of the world are nothing compared to the heavy burden of sins. The leader's deepest rachmanus is rachmanus-on-sin, not rachmanus-on-pain.",
                "intermediate": "עיקר הרחמנות — כשנופלים ישראל ח\"ו לחטא, ר\"ל. זו הרחמנות הגדולה. כל היסורים הקשים שבעולם — אינם נחשבים כלום נגד כובד הסטר חטא ח\"ו. *Inversion*: the world ranks suffering by visibility; the leader ranks it by spiritual cost.",
                "scholarly": "ישעיה נ\"ז:ב'; ברכות י\"ז ע\"א; ל\"מ ח\"א סי' רכ\"ח"
            },
            {
                "beginner": "Even when the time comes for the tzaddik to depart and his soul ascends and cleaves to its place above, this is not the perfection. The essence of perfection is not that the soul be merely cleaved above, but that even when above, it remain functional below — illuminating, leading, transmitting. The pure ascension is incomplete; the soul must continue to act in this world.",
                "intermediate": "אפילו בעת שהגיע זמן פטירה — והנשמה עולה ומתדבקת במקומה — אין זה התכלית. עיקר שלמות הנשמה — שגם כשעולה, תמשיך לפעול למטה.",
                "scholarly": "זהר תרומה; ל\"מ ח\"א סי' ר\"כ; חיי מוהר\"ן"
            },
            {
                "beginner": "Therefore one must leave behind a son or disciple so that his daas remains below to illuminate the people of this lowly world. When his daas remains below through a son or disciple, it is considered as if he himself actually remains in the world. Every person can fulfill this — even one who has no son can have a disciple, and one who has no disciple can yet leave Torah-words that act as both. The aim: continuity of daas across generations.",
                "intermediate": "צריך להניח אחריו בן או תלמיד, כדי שדעתו תשאר למטה להאיר את אנשי העולם השפל. וכשדעתו נשארת למטה ע\"י בן או תלמיד — נחשב כאלו הוא עצמו עומד בעולם. *Universalization*: anyone can leave a son, talmid, or written daas — the principle scales.",
                "scholarly": "ב\"ב קט\"ז ע\"א; שבת ק\"ה ע\"ב; ל\"מ ח\"א סי' י\"ז"
            },
            {
                "beginner": "Previously the disciple was not called 'human' at all, since he had no daas — he was only in the form of a human. Through teaching him Torah and inserting daas into him, he becomes a human being. Therefore the teacher is considered as if he actually made the disciple — the disciple is in the aspect of son. The Sages teach: 'Whoever teaches his fellow's son Torah, the verse credits him as if he had borne him' (Sanhedrin 99b).",
                "intermediate": "מתחלה לא נקרא התלמיד 'אדם' כלל, שאין לו דעת — רק תמונת אדם. ע\"י לימוד הדעת — נעשה אדם, ולכן נחשב כאלו עשהו ממש. ולכן התלמיד גם בחי' בן (סנהדרין צ\"ט ע\"ב).",
                "scholarly": "סנהדרין צ\"ט ע\"ב; ברכות ל\"ה ע\"ב; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "However, one who wants to speak with his fellow in fear of Heaven must himself have fear of Heaven, so that his words will be heard by his fellow — as the Sages said (Berachot 6b): 'Anyone who has fear of Heaven, his words are heeded.' One cannot transmit a level one does not personally embody; the disciple absorbs not just the teacher's words but the teacher's actual yir'as Shamayim, encoded in the words.",
                "intermediate": "מי שרוצה לדבר עם חברו ביראת שמים — צריך עצמו יראת שמים, כדי שדבריו יהיו נשמעים, ש'כל מי שיש בו יר\"ש דבריו נשמעים' (ברכות ו' ע\"ב).",
                "scholarly": "ברכות ו' ע\"ב; אבות ג':ט'; ל\"מ ח\"א סי' ה'"
            },
            {
                "beginner": "Yir'as Shamayim is needed for this, for 'one whose fear of sin precedes his wisdom — his wisdom endures' (Avos 3:9). The endurance of one's words with the disciple depends on the precedence of yir'ah over chochmah in the teacher. Knowledge alone produces transient impressions; knowledge built on yir'ah produces lasting daas in the talmid.",
                "intermediate": "יראת שמים נצרכת לזה — ש'כל שיראת חטאו קודמת לחכמתו — חכמתו מתקיימת' (אבות ג':ט'). *Equation*: yir'ah-cores-chochmah = transmittable; chochmah-without-yir'ah-core = vapor.",
                "scholarly": "אבות ג':ט'; שבת ל\"א ע\"א-ב'; ל\"מ ח\"א סי' ע\"ה"
            },
            {
                "beginner": "Thus one who wants to insert daas into his fellow needs yir'as Shamayim so his words will be heard and endure. The verse warns: 'They have no changes for them, and they did not fear G-d' (Tehillim 55:20) — when one's daas does not remain after him through son or disciple (the 'change of generations' that perpetuates daas), the failure traces to absent yir'ah, the same yir'ah needed to make daas transmittable in the first place.",
                "intermediate": "לכן מי שרוצה להכניס דעת בחברו — צריך יר\"ש כדי שדבריו ישמעו ויתקיימו. 'אשר אין חליפות למו ולא יראו אלקים' (תהלים נ\"ה:כ') — כשדעתו אינה נשארת אחריו דרך בן ותלמיד.",
                "scholarly": "תהלים נ\"ה:כ'; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "The chochom (sage) of the generation who merits these makifim — the abundance of the crown — needs to embody the aspect of 'all,' the aspect of 'For all in the heavens and in the earth' (Divrei HaYamim I 29:11), and its Targum: 'who unites in heaven and earth' (Zohar Bereshit). His attainment must span both worlds; he must be the unification-point, the place where Above and Below converge into one.",
                "intermediate": "החכם הזוכה למקיפים אלו — בחי' רוב הכתר — צריך בחי' 'כל', בחי' (דהי\"א כ\"ט:י\"א) 'כי כל בשמים ובארץ', ובתרגום: 'דאחיד בשמיא ובארעא' (זהר בראשית).",
                "scholarly": "דהי\"א כ\"ט:י\"א; זהר בראשית; ל\"מ ח\"א סי' ס\"ד"
            },
            {
                "beginner": "The chochom must also know which makifim to draw and which not to draw. There are things forbidden to reveal before the disciples — for if he reveals them, other makifim will press in (a deeper question raised when an answer is given), and a difficulty stronger than the original will emerge. Premature revelation enlarges the question rather than resolving it; some makifim are best left as makifim until the talmid is ready.",
                "intermediate": "החכם צריך לידע אילו מקיפים להמשיך ואילו לא. יש דברים שאסור לגלות לפני תלמידים — אם יגלם, יכנסו מקיפים אחרים, ויביאו קושיא חזקה ורחבה מתחלה. *Pedagogy*: an answered question may birth a worse question; mature teaching judges when to leave as is.",
                "scholarly": "חגיגה י\"א ע\"ב; ל\"מ ח\"א סי' ס\"ד; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "If he had stated the resolution, another makif would have entered and brought a difficulty stronger and broader than the first. 'Be silent' concerning the resolution — let the chochom be silent and not reveal, lest he come upon a fortified maze of stronger questions. The principle: silence is sometimes the highest answer; the question held in suspended mystery is more precious than the answer that opens worse questions.",
                "intermediate": "אם היה משיב — היה נכנס בו מקיף אחר ומביא קושיא יותר חזקה ורחבה. 'ובכן דום' על התירוץ — שיהיה דומם ולא יגלה, לבל יבוא עליו קושיא חמורה. *Wisdom*: timed silence > hasty resolution.",
                "scholarly": "אבות א':י\"ז; חולין ט\"ז ע\"ב; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "And this is 'establish many disciples' (Avos 1:1): when he merits such an attainment — to illuminate great and small alike — he certainly establishes many disciples, for all need him; he has the power to teach all of them. And 'make a fence to the Torah' is the dimension of yir'ah that gates this teaching: the chochom must guard the limits of his transmission with the same care he uses to expand it.",
                "intermediate": "וזה 'והעמידו תלמידים הרבה' (אבות א':א') — כשזוכה לזה (להאיר בגדולים וקטנים) — בודאי מעמיד תלמידים הרבה. ו'עשו סייג לתורה' = יראה השומרת על הגבולות.",
                "scholarly": "אבות א':א'; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "The son who is also a disciple is on a higher level than disciple alone, because the son is entirely drawn from the father — from his head to his foot — and there is no hair in him that is not drawn from the father's brain (mochin). Therefore the attainment of the son is greater than the attainment of the disciple. The son carries the father's daas in body as well as mind; the disciple carries it in mind only.",
                "intermediate": "הבן שהוא גם תלמיד — מדרגתו גבוהה מתלמיד גרידא, כי הבן נמשך כולו מן האב — מראשו ועד רגליו, ואין שערה אחת בו שאינה נמשכת ממוח האב. *Why*: son = mochin-down-to-foot; talmid = mochin-into-mochin only.",
                "scholarly": "סוטה ה' ע\"ב; נדה כ\"ה ע\"ב; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "One must include the worlds — upper in lower and lower in upper — so that the son is included in the aspect of disciple, and similarly the disciple is included in the aspect of son, in order that they should have proper fear. The son alone might lean on his innate connection; the disciple alone might lack the deep belonging. Each must take from the other: son becomes humble disciple, disciple becomes claimed son.",
                "intermediate": "כלילן עולמין: עליון בתחתון ותחתון בעליון — שהבן יכלול בחי' תלמיד והתלמיד יכלול בחי' בן, כדי שיהיה להם יראה. *Pedagogy*: cross-inclusion creates yir'ah by removing complacency from both sides.",
                "scholarly": "זהר נשא; ל\"מ ח\"א סי' י\"ז; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "Through the inclusion of son and disciple, one who is a man of valor (and not the opposite — what people call 'shlimazel') can receive at the time of eating the illumination of the will: the will illuminates for him at his meal, and he yearns and longs for HaShem precisely while eating. Eating becomes a moment of revealed ratzon for those whose son-and-disciple structure is intact within them.",
                "intermediate": "וע\"י כלילת בן ותלמיד — איש חיל (ולא ההיפך 'שלימזל') יכול לקבל בעת אכילה הארת הרצון — שהרצון מאיר לו בשעת אכילה, וכוסף ומשתוקק להשי\"ת. *Insight*: a properly constituted soul finds longing at the table; a misconstituted one finds only food.",
                "scholarly": "ל\"מ ח\"א סי' י\"ז; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "He needs dominion (memshalah) at the time of eating — the aspect of malchus — because through this sustenance is drawn down. Therefore when the husband girds his loins opposite his wife and obligates himself to sustain her, as written in the kesubah, 'And I shall work and honor and sustain' — he takes on the aspect of king-in-his-house in order that the channel of parnasah opens for both.",
                "intermediate": "צריך ממשלה — בחי' מלכות — בעת אכילה, שעי\"ז נמשכת פרנסה. ולכן הבעל חוגר מתניו כנגד אשתו ומחויב לזונה, ככתוב בכתובה 'ואיפלח ואוקיר ואיזון'.",
                "scholarly": "כתובות מ\"ז ע\"ב; ל\"מ ח\"א סי' ס\"ז; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "And this is the aspect of Chanukah. Each person, according to what he merits to accomplish with his request on Yom Kippur — the request 'selach na' (forgive please) — so he has Chanukah, for through 'selach na' Chanukah is made. The line from Yom Kippur's vidui to Chanukah's lights is direct: the depth of the forgiveness one received determines the brightness of the candles one will kindle two months later.",
                "intermediate": "וזה בחי' חנוכה: כל אדם — לפי מה שזוכה לפעול בבקשתו ביוה\"כ ב'סלח נא' — כך יש לו חנוכה. *Calendar architecture*: vidui (10 Tishrei) → kapparah → Sukkot → Chanukah lights (25 Kislev) — the entire interval is one fulfillment-arc.",
                "scholarly": "ויקרא ט\"ז; שבת כ\"א ע\"ב; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "And this is the aspect of the balanced temperament of the lung. When the lung is in balanced temperament, it includes all the aspects mentioned, for the lung illuminates the eyes, as the Sages said (Chullin 49a). The lung is the seat of equilibrium between the four humors; when it is balanced, vision (physical and spiritual) clears, and the eyes can see what the imbalanced person cannot.",
                "intermediate": "וזה בחי' מזג השוה של הריאה. כשהריאה במזג שוה — כלולה מכל הבחינות, כי הריאה מאירה לעינים, כדאמרו רז\"ל (חולין מ\"ט ע\"א). *Anatomy of soul*: balanced lung = clear eyes = correct seeing of the makifim of the chochom.",
                "scholarly": "חולין מ\"ט ע\"א; ברכות ס\"א ע\"ב; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "When one examines and speaks concerning some innovation that the chochom of the generation introduced, fear falls upon the one who speaks and examines — because when the chiddush is repeated, the sea of wisdom is aroused and revealed from which the chiddush was drawn. The presence of that vast yam haChochmah evokes proper yir'ah; the talmid trembles before the source even as he repeats the words.",
                "intermediate": "כשמעיינים ומדברים בחידוש של חכם הדור — נופלת יראה על המעיין, כי בחזרת החידוש מתעורר ים החכמה שממנו נמשך החידוש. *Phenomenology*: the talmid feels the size of the source while repeating the words.",
                "scholarly": "סנהדרין צ\"ז ע\"ב; ל\"מ ח\"א סי' י\"ג; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "The Sages relate (Bava Batra 74a): Rabbi Eliezer was sleeping and Rabbi Yehoshua was awake. Rabbi Yehoshua trembled and woke Rabbi Eliezer. He said: 'What is this, Yehoshua? Why did you tremble?' Rabbi Yehoshua said: 'I saw a great light in the sea.' Rabbi Eliezer said: 'Perhaps you saw the eyes of the Leviathan, as it is written: His eyes are like the eyelashes of dawn (Iyov 41:10).' This account becomes the kabbalistic key to the entire teaching.",
                "intermediate": "סיפור הגמרא (ב\"ב ע\"ד ע\"א): ר\"א ישן ור\"י עמד והיה רואה ומזדעזע. הקיץ ר\"א ושאלו: מה ראית? אמר: ראיתי נר גדול בים. אמר ר\"א: שמא ראית עיני הלויתן, דכתיב 'עיניו כעפעפי שחר' (איוב מ\"א:י').",
                "scholarly": "ב\"ב ע\"ד ע\"א; איוב מ\"א:י'; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "Rabbi Eliezer and Rabbi Yehoshua are the aspects of son and disciple. Rabbi Eliezer is the aspect of son whose attainment is the aspect of 'mah' — 'what did you see?' — the aspect of 'no human can see Me,' the aspect of 'no eye has seen, G-d, except You' (Yeshayahu 64:3). The son's level reaches what cannot be seen at all; he 'attains' precisely the unattainable. Rabbi Yehoshua is the disciple — he can describe a 'great light in the sea,' an attainment that has visual content.",
                "intermediate": "ר\"א ור\"י = בחי' בן ותלמיד. ר\"א = בן, מדרגתו 'מה' — 'מה ראית', בחי' 'לא יראני האדם', בחי' 'עין לא ראתה אלקים זולתך' (ישעיה ס\"ד:ג'). ר\"י = תלמיד, יש לו תוכן ראיה.",
                "scholarly": "ישעיה ס\"ד:ג'; שמות ל\"ג; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "The fact that they were traveling in a ship — Rabbi Eliezer and Rabbi Yehoshua, son and disciple, were walking in the sea of wisdom where the lights of the makifim are revealed. 'Ship' (oniyah) is a language of hidden and concealed (related to ni'on, 'I am' as concealed self) — meaning that the sea is the supernal chochmah, normally hidden, and the ship is the framework of a son-and-disciple pair that allows safe passage through it.",
                "intermediate": "ושהיו הולכים בספינה — ר\"א ור\"י (בן ותלמיד) הלכו בים החכמה ששם מתגלים אורות המקיפים. ספינה = לשון נסתר. *Symbol*: yam = supernal chochmah; sefinah = the son-disciple structure; together they enable safe traversal.",
                "scholarly": "תהלים ק\"ז:כ\"ג; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "Rabbi Yehoshua trembled and woke Rabbi Eliezer. Waking Rabbi Eliezer is the aspect of including the son in the disciple — for one must include the son in the disciple to show the son the disciple's attainment, so that the son should have fear. Rabbi Yehoshua's tremor itself induces yir'ah in Rabbi Eliezer; the disciple's awe wakes the son into proper humility before what cannot be seen.",
                "intermediate": "ר\"י נזדעזע והקיץ את ר\"א — בחי' כלילת הבן בתלמיד, שצריך לכלול בן בתלמיד כדי להראות לבן מדרגת התלמיד, ועי\"כ יהיה לבן יראה. *Mechanism*: the disciple's tremor educates the son.",
                "scholarly": "ב\"ב ע\"ד ע\"א; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "Concerning the burial of Moshe (Sotah 14a) — 'upper ones appear to them as below and lower ones appear to them as above' — this is the aspect of all that has been mentioned: the inclusiveness of upper and lower, the unification 'in heaven and on earth.' The burial-place of Moshe enacts geometrically what his entire life enacted spiritually: the abolition of the supposed separation of heaven and earth in the place of the great compassionate leader.",
                "intermediate": "ועל קבורת משה (סוטה י\"ד ע\"א): 'עליונים נראים להם כתחתונים ותחתונים כעליונים' — בחי' כל הנ\"ל = כלילת עליון ותחתון, יחוד שמים וארץ. *Synthesis*: Moshe's grave = geometry of his life.",
                "scholarly": "סוטה י\"ד ע\"א; דברים ל\"ד; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "There is still the combination of Chanukah hinted in the verse (Devarim 34:9): 'And Yehoshua bin Nun was full of the spirit of wisdom, because Moshe laid his hands upon him.' In the end-letters of this verse the combination 'Chanukah' is encoded — for in this verse all the aspects of the teaching converge: the transmission from Moshe (the great compassionate leader) to Yehoshua (the disciple-as-son), the laying-on of hands (semichah), the spirit of wisdom (the daas remaining below), and the kindling of dedication (Chanukah).",
                "intermediate": "צירוף 'חנוכה' מרומז בפסוק (דברים ל\"ד:ט'): 'ויהושע בן נון מלא רוח חכמה כי סמך משה את ידיו עליו' — בסופי תיבות יש צירוף חנוכה. *Encoded*: the entire torah folded into the end-letters of one verse on the transmission Moshe→Yehoshua.",
                "scholarly": "דברים ל\"ד:ט'; ל\"מ ח\"ב סי' ז'"
            },
            {
                "beginner": "Concerning the matter of fear: there are five gevuros that are five terrors, as the Sages said (Shabbat 77b), and there are 1405 gevuros brought in the holy Zohar (Bamidbar 137b) which are included one in another. The numerical layers of yir'ah open out from 5 to 1405; each level of fear contains and is contained by the others. The teaching's culminating gesture: yir'ah is not a single feeling but an entire architecture.",
                "intermediate": "ועוד בעניין היראה: ה' גבורות שהן ה' אימות (שבת ע\"ז ע\"ב), וכן אלף ארבע מאות וחמש גבורות (זהר במדבר קל\"ז ע\"ב), כלולין זה בזה. *Architecture of yir'ah*: 5 → 1405, nested.",
                "scholarly": "שבת ע\"ז ע\"ב; זהר במדבר קל\"ז ע\"ב; ל\"מ ח\"ב סי' ז'"
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
