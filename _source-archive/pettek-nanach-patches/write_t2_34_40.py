# -*- coding: utf-8 -*-
"""PNC Tinyana T34-T40 — write per-segment 3-layer commentary and register.

T34 source has 24 segs but only seg 1 carries content; segs 2-24 are empty.
We mirror the source: write substantive PNC for seg 1, empty placeholders for 2-24.
"""
import os, json

HOME = os.path.expanduser('~')
AJ = os.path.join(HOME, '.openclaw', 'workspace', 'ajew-org')
PNC_NAME = "pettek-nanach-commentary"  # LITERAL
READER = os.path.join(AJ, 'public', 'reader')
PNC_DIR = os.path.join(READER, PNC_NAME)
LMC = os.path.join(AJ, 'src', 'data', 'lm-commentaries.json')
SRC_BASE = os.path.join(READER, 'likutay-moharan', 'part-2')

torahs = {
    34: {
        "title_en": "Yisro's Joy from the Root — Reflections of Light",
        "title_he": "ויחד יתרו על כל הטובה",
        # 1 substantive seg + 23 empty (mirror source)
        "segs": [
            {
                "beginner": "Among ordinary people there is no single joy that gathers all the goods together. At a wedding one is happy from the food, another from the music, the in-laws from the match itself; some feel jealousy and pain, not joy at all. Even those who are happy from each thing taste them only one after another, never all at once. The greatness of joy is reserved for the one who can rejoice from all the goods together as one whole — and that is impossible without looking upward, past the visible benefits, to the Root from which all goods are drawn. There, in the Root, everything is one — all joys are gathered as a single entity. From that vantage one's joy is from all the goods at once, and the joy becomes immense and shines with great light, because joys nested inside joys reflect off each other (hisnotzetzus) and the light multiplies. The more joys included, the more reflections; the more reflections, the more light. This is what 'vayichad Yisro al kol ha-tovah' means — Yisro looked upward, past the good itself, to the Root, where all the goods are one, and so he was joyful from all of them simultaneously.",
                "intermediate": "Yichud as joy: vayichad = vayismach reified through achdus, not parallel to chedva. The mechanism is hisnotzetzus — sparks reflecting between joys, exponential in n. Cf. Tinyana T33 (Yisro's flesh chidudin chidudin) — same pasuk, dual reading: T33 reads chidudin as the body's truth-telling shortfall; T34 reads vayichad as the soul's success. Together: Yisro's body lagged while his soul reached the shoresh. The PNC reading: this is the structure of all kavanah — collect the day's particular goods, look past each, and rest in the One.",
                "scholarly": "שמות יח:ט; תהלים קל\"ג; ליקו\"מ קמא רפב; זוהר ויקרא ה.; ליקו\"ה ברכת המזון ה."
            },
        ] + [{"beginner": "", "intermediate": "", "scholarly": ""} for _ in range(23)]
    },
    35: {
        "title_en": "Torah Scholars Are Worthy to Know the Future",
        "title_he": "לומדי תורה ראוי להם לידע עתידות",
        "segs": [
            {
                "beginner": "Those who study Torah deserve to know the future. The verse: 'kodem yadati' (Tehillim 119:67) — 'I knew beforehand' what will be. From where? 'Mei'edosecha' — from Your testimonies, that is, from the Torah itself.",
                "intermediate": "Torah is mei'edah on the not-yet — limmud is itself a form of nevuah for the lomdei Torah. Cf. Tinyana T8:2 (nevuah accessible through tefillah); Tinyana T28 (recognizing-by-Torah). The PNC reading: 'knowing the future' here is not soothsaying but the structural certainty that everything in olam ha-zeh is already inscribed in the testimonies. Practical: when learning is honest, the lomeid develops eidus-vision, recognizing patterns before they unfold.",
                "scholarly": "תהלים קיט:סז; ליקו\"מ קמא קמ; ליקו\"ה ברכות התורה ב."
            }
        ]
    },
    36: {
        "title_en": "When a Sefer Is Made — Coverings and Concealments",
        "title_he": "תכף שנעשה ספר",
        "segs": [
            {
                "beginner": "As soon as a sefer is made from very lofty and wondrous Torahs, the moment those Torahs become a sefer, there are coverings and concealments upon them — the pure and wondrous light is partly veiled, and the pages and binding cover them, and so on.",
                "intermediate": "Sefer = chipuy. The act of binding (kerichah) materializes ohr nefla and partly conceals it; ipso facto, every published Breslov sefer is read against this caveat — including LM itself. Cf. Tinyana T32 (genizah-by-design); Tinyana T28 (lo nittan likhtov); Tinyana T30 (sefer's tears protect). The PNC reading: the kerichah is itself part of the kli — without it the ohr could not survive olam ha-zeh; the price is partial concealment that requires a tzaddik or chaver to peel back.",
                "scholarly": "ליקו\"מ קמא ס; ליקו\"מ תנינא לב; ליקו\"ה ברכות הראיה ב."
            }
        ]
    },
    37: {
        "title_en": "The True Tachlis — Serving for His Sake Alone",
        "title_he": "ממתים ידך ה' — אני בצדק אחזה פניך",
        "segs": [
            {
                "beginner": "'Mi-mesim yadcha Hashem, mi-mesim mi-cheled… ani be-tzedek echezeh panecha' (Tehillim 17:14-15). The principle: the only true purpose is to serve and walk in Hashem's ways for His sake — to merit knowing and recognizing Him. That is His will: that we recognize Him. No other intention belongs in avodah. Some serve all their days chasing this-world desires to fill their belly with this-world; others serve to merit the World to Come — and that too is a form of belly-filling, wanting the next world to satisfy them. 'Chelkam ba-chayim u-tzefuncha temalei vitnam' covers both groups: 'their portion in life' (this-world hedonists) and 'tzefuncha' (those who choose the hidden good, World to Come) — both fill their belly. The world-to-come group is wiser, choosing the eternal over the perishing, and serving for the next world is certainly far better; but it is still 'fill the belly.' 'Yisbe'u banim' (they are satisfied with sons) — most people work to leave an inheritance to their children. But one who is not a holy person, who chases desires and leaves money to his children, is like someone covering filth with filth: the wealth of holiness is very lofty, but the wealth of this-world desire is mosros (excess) — what's left after he has filled himself. And children not born in holiness are also literal mosros — they come from coarse drops, the 'putrid drop' (Avos 3), which is why they are called olalim (a word Rashi on Tehillim 8 explains as filth). To leave such children, covered with such wealth, is filth on filth. 'Ve-hinichu yisram le-olaleihem' — they cover the olalim (themselves excess) with mosros (the leftover wealth). But David said: I will not pick from those two groups; only 'ani be-tzedek echezeh panecha' — with all my righteousness I will merit to behold Hashem's face. And the children David desires to leave, his intention is purely for Hashem's sake, to complete the divine image.",
                "intermediate": "Three groups: (1) bnei olam ha-zeh (mesim mi-cheled, no World to Come), (2) ovdei olam ha-ba (mesim be-yadcha, righteous-via-suffering), (3) David — neither, only le-shem yotzro. The chiddush: ovdei olam ha-ba are also mileu beten, just satisfied at a higher table. Banim/olalim/yisram = excess-on-excess for the unworthy; for the holy person banim are tzelem demus tavnis. Cf. Tinyana T12 (chasing-intellect-causes-falls, the same trap of chasing-good-for-self); Yevamos 63b (procreation completes ha-demus). The PNC reading: the test of avodah is whether removing the World-to-Come reward would change the avodah — David's wouldn't.",
                "scholarly": "תהלים יז:יד-טו, ח:ג; משלי ל; קהלת; אבות ג:א; יבמות סג:; ליקו\"מ קמא יג, רפו; ליקו\"ה צדקה ב."
            },
            {
                "beginner": "Holy children are very lofty. Chazal (Yevamos 63): anyone who does not engage in procreation is as if he diminishes the divine likeness. When a son is born into the world, the tzelem Elokim is born and comes; His image, likeness, and form are completed.",
                "intermediate": "Banim de-kedushah complete tzelem demus tavnis — the contrast with banim de-mosros from the prior section. The act of holy procreation is not personal continuation but completion-of-image. Cf. Tinyana T7 (compassionate leader Moshe, ben/talmid).",
                "scholarly": "יבמות סג:; ליקו\"מ קמא ב; ליקו\"ה פריה ורביה א."
            },
            {
                "beginner": "'Esba'ah' — 'I shall be satisfied': the satisfaction of children, the form of 'they are satisfied with sons,' is only 'be-hakitz temunasecha' (Tehillim 17:15) — when I awake, Your likeness. The main satisfaction-from-sons is only what is awakened in this — the divine likeness, the form of tzelem demus tavnis. 'Mi-mesim yadcha Hashem, mi-mesim mi-cheled': there are those who die natural deaths, born with a root moisture and other natural elements that allow a fixed lifespan, sustained until the moisture and vitality are exhausted (mesim mi-cheled). And there are those whom Hashem decrees death upon prematurely as a punishment ('mesim yadcha Hashem'). These are worthy of the World to Come because they died before their time. But those who die mi-cheled are bnei olam ha-zeh, who have no World to Come — they live and are sustained without punishment until they die of the world. David says: from these two groups — bnei olam ha-zeh and bnei olam ha-ba — I do not choose. 'Be-tzedek echezeh panecha' — with all my righteousness I will merit to behold Hashem's face. 'Esba'ah be-hakitz temunasecha' as above. Even so, serving for the World to Come is very good, and leaving merit to one's children is good (a person should not receive all his reward in this world). But the complete tzaddikim, the true lovers of Hashem, like David, choose none of this — neither this world, nor the World to Come, nor leaving their merit to their children — only fulfilling Hashem's will.",
                "intermediate": "The pasuk's two halves are read as two death-types: yadcha = pre-time death (chassurim), cheled = natural death (bnei olam ha-zeh). David exits both — the move beyond shalmus shel olam ha-ba. Practical: a person who would still serve Hashem if there were no olam ha-ba at all approaches David's stratum. Cf. Mesilas Yesharim ch. 19; Tinyana T25 (sichah from Torah — also avodah-le-shemah). PNC reading: the chiddush is that olam ha-ba avodah is theologically still self-interested; only le-shem yotzro is pure. The distinction is severe, and Reb Nachman intentionally lets it stand without softening.",
                "scholarly": "תהלים יז:יד-טו; ליקו\"מ קמא ב, יג; ליקו\"ה צדקה ב; מסילת ישרים יט."
            }
        ]
    },
    38: {
        "title_en": "The Great One Travels to the Small One — Light Diminishing for Reception",
        "title_he": "לפעמים הגדול הולך ונוסע להקטן",
        "segs": [
            {
                "beginner": "Sometimes the great one goes and travels to the small one, and sometimes the opposite — the tzaddik travels to the province to illuminate students, or the students come to him. Know that when the great one travels to the small one, the gadlus is greater. Of course the small one usually needs to come to the great one to receive from him. But sometimes the great one's light is so vast that the small one cannot receive it where the great one is — the light is too overwhelming. So the great one is forced to lower himself, humble himself, and go to the small one, so that the light is diminished and materialized somewhat and the small one can receive. So when the great one needs to go to the small one, that itself testifies to the immensity of the great one's level. Moshe was so great in his level that even before fellow gedolim — Yehoshua, Aharon — he had to diminish himself and show humility, because his immense light required them to receive it through his constriction: 've-ha'ish Moshe anav me'od' (Bamidbar 12:3). Megillah 31: 'wherever you find his greatness, there you find his humility' — wherever there is greater greatness, there humility and smallness are needed for reception. When the small one comes to the great one to receive, the main thing is to convert mochin de-katnus into mochin de-gadlus — to widen the small one's daas so that he grows and reaches mochin de-gadlus, the form of hamtakah (sweetening). Sometimes this happens through anpin nehirin (shining countenance, smiling face); sometimes the small one cannot receive that way and is in the form of 'a piece of wood that does not catch fire — they hammer it' (Berachos): the great one must illuminate him through suffering, chastising and shaming him into bittul so he can receive. Even though the great one diminishes himself temporarily, the loss is not real — the great one's bittul is for the moment; afterward he returns to his level, and meanwhile the small one is fully rectified and expanded.",
                "intermediate": "Tzaddik nose'a el ha-katan = ohr too great in mekomo, requires hispashtus + hisgashmus. Megillah 31's gadlus/anavah pairing is read structurally: the larger the ohr, the deeper the constriction needed for reception. Three modes of illumination: anpin nehirin (gentle), yissurim (hammering, for ozen-she'lo dalik), or full traveling (geographic constriction). Cf. Tinyana T7 (compassionate leader Moshe), Tinyana T22 (true humility requires daas), Tinyana T39 (manhig ha-dor illuminates raglayim). PNC reading: a tzaddik refusing to diminish himself for the talmid is not preserving his ohr; he is failing to make tikkun. The ozen-she'lo dalik metaphor cashes out as: when gentle teaching cannot kindle, public yissurim (rebuke that humbles) are still acts of love.",
                "scholarly": "במדבר יב:ג; מגילה לא.; ברכות סג; ליקו\"מ קמא יד, סד; ליקו\"ה השכמת הבקר ד."
            },
            {
                "beginner": "There are differences in the great one's smallness and humility before the small one — it depends on the case. Sometimes a small motion suffices; sometimes he has to actually go and travel to him. It's like a candle that has gone out: if there is still some light in it, you can rekindle it just by holding it close to a burning candle (holding it below near the burning one, as is known from sense), because there is still some light in it. But when there is no light in it at all, you cannot rekindle it from a distance — you must bring it actually to the flame, or vice versa.",
                "intermediate": "The candle mashal calibrates the diminution: kol katan tzarich shi'ur kirvah lefi mada ha-or. Lifshei sheh-yesh bo or = remote rekindling; ein bo or = mamash kirvah. Cf. Sichos HaRan 51 (the Rebbe's actual journeys); Tinyana T31 (neginah reveals ol Torah — same diagnostic principle). PNC reading: the diagnostic question for a teacher is not 'how good am I,' but 'how much remaining light is in this student?' Determines the kirvah needed.",
                "scholarly": "ליקו\"מ תנינא לח; ליקו\"ה תפילה ה."
            }
        ]
    },
    39: {
        "title_en": "Lechu Chazu — Even the Raglayim Behold the Tachlis",
        "title_he": "לכו חזו מפעלות ה' אשר שם שמות בארץ",
        "segs": [
            {
                "beginner": "'Lechu chazu mif'alos Hashem asher sam shamos ba-aretz' (Tehillim 46:9). Truly the matter is wondrous: Hashem created the entire creation with so many wondrous and awesome things — 'mah rabu ma'asecha Hashem' — even in this world alone, having created inanimate, vegetative, and so on; and who can estimate Hashem's greatness in the creatures of this world, much less other worlds. Everything was created only for Israel; and the main purpose of Israel's creation is for the form of Shabbos, which is the tachlis. Shabbos is the tachlis ma'asei shamayim va-aretz — the form of olam ha-neshamos (Zohar Hakdamah 1; Terumah 136), a world that is wholly Shabbos, where they will attain Hashem properly without any separating curtain or preventer; complete unity will be made, and each one will point with his finger 'zeh Hashem kivinu lo' (Ta'anis 31), and that is the tachlis for whose sake the entire creation was made. Therefore in every single thing created in the world there is a form of the tachlis: there is a starting point — the chain of descent down through worlds until it materialized as this image — and there is the end-form, the tachlis for whose sake it was created. Israel can deepen contemplation in the structure of limbs, the building, the stature and image of every single thing, contemplating the Creator's greatness through it and serving Him through it, and so onward higher and higher up to the tachlis, where that thing connects to the tachlis. Every single thing has a hold in the tachlis for whose sake it was created: through that thing one can attain Him and serve Him, all the way to where that thing concludes and connects to the tachlis. Each person needs to deepen contemplation in this — to know and recognize the Creator's greatness in every single thing, in its structure and image, in the particularity of its limbs and building, and to serve Him through this, until coming to the form of the tachlis of that thing — the form of Shabbos, olam ha-neshamos. Those with great intellect can do this. But for small ones like us today, all on a very low level in the form of raglayim, how can we possibly arrive at this knowledge? We must yearn and long that Hashem give us a manhig ha-dor, ro'eh ne'eman, who has the power to illuminate even in us — in raglayim — this knowledge and attainment, that we merit to come to the tachlis. Like Moshe, who from his immense level could illuminate even in the lowest of the low, even in a maidservant, as Chazal said (Mechilta Beshalach; Zohar Beshalach 55): a maidservant saw at the sea what Yechezkel the prophet did not see — Yechezkel, such a great prophet, did not see what a maidservant saw in Moshe's days, all because of the immense level of the manhig. He could illuminate even in raglayim — even raglayim, distant from the brain, can attain and know the tachlis through the works of Hashem in this lowly world. Through the manhig's gadlus, brain-light is drawn even into raglayim; then it can happen that these raglayim are greater than another's brain. 'Lechu chazu' — 'lechu' specifically (raglayim, the instruments of walking) — they too will behold the works of Hashem who has placed shamos in this earth, that is, the actions of Hashem in this lowly world: through them one can know and attain the tachlis. 'Asher sam shamos ba-aretz' — shamos as acronym of TaCHlis Ma'aseh SHamayim Va'arets, the form of 'nefesh chayah hu shemo' (Bereshis 2; Berachos 7b: do not read shamos but shemos) — the world of souls, which is the tachlis, is clothed and grasped in this lowly earth: through this lowly world specifically one is compelled to attain the tachlis. It is a wondrous chiddush: attaining the tachlis — such a lofty matter, attaining Him — depends specifically on the creatures of the lowly world; all souls are compelled to pass through this world to attain the tachlis. Mashiach ben David does not come until all the souls in the body are completed (Yevamos 62), because they are all compelled to come into this lowly world to attain the tachlis through it. So all souls are in the form of nitzrach la-briyos — they need the creatures to attain the tachlis through them.",
                "intermediate": "Shabbos = tachlis ma'aseh = olam ha-neshamos = nefesh chayah shemo. The chiddush: tachlis is achieved davka through the lowest creatures, not despite them. Raglayim of the dor (us) cannot rise without a manhig who draws mochin into raglayim. The maidservant-and-Yechezkel proof: dor's level is set by manhig, not by individual capacity. Cf. Tinyana T7 (compassionate leader); T38 (great-travels-to-small); LM Kama 7 (manhig ha-emes); Likutey Halachos Hashkamas HaBoker 4. PNC reading: the urgency of finding the right rebbi is not pious sentiment — it is structurally required for the dor's attainment of any tachlis at all.",
                "scholarly": "תהלים מו:ט; בראשית ב:יט; ברכות ז:; יבמות סב.; הקדמת הזהר א.; זוהר תרומה קלו., בשלח נה., ויקרא כב.; מכילתא בשלח; ליקו\"מ קמא ז; ליקו\"ה השכמת הבקר ד."
            },
            {
                "beginner": "It is fitting for us to say all this with weeping, with tears in threes — to cry and yearn, to plead and beseech before Him: when will we merit it — that we should have this knowledge, that we can know and recognize the Creator from every single detail of this world up to the tachlis? At our present low level, with no beauty in our faces (see Midrash Tehillim 143), we need Hashem to have mercy on us, to give us a manhig, ro'eh ne'eman, who can illuminate this knowledge in us, so that we serve Him properly and come to the tachlis.",
                "intermediate": "Bechiyah be-dim'aos shalish — see Tinyana T30 (sefer's tears stand against decrees). The petition for a manhig is the petition that produces the manhig — Likutey Halachos reads this as the davening of the dor itself. Cf. Sichos HaRan 51, 233.",
                "scholarly": "מדרש תהלים קמ\"ג; ליקו\"מ תנינא ל; ליקו\"ה תפילה ה."
            },
            {
                "beginner": "There is certainly a distinction among the creatures: between what was created first and what was created on the sixth day, which is closer to Shabbos. The sefarim bring (Shemos 31:17) that even the six days were themselves created and stand in the secret of a circle around the inner point, which is Shabbos (Zohar Vayakhel 204) — but distinctions remain.",
                "intermediate": "Iggul el ha-nekudah ha-pnimit — the geometric form of beriah's relation to Shabbos. Sasha-yamim themselves are nivra'im, not the framework. Cf. Eitz Chayim Drush ha-Iggulim ve-ha-Yosher.",
                "scholarly": "שמות לא:יז; זוהר ויקהל רד.; ליקו\"מ קמא לב; עץ חיים."
            },
            {
                "beginner": "What Chazal said — 'It is better for a person not to have been created than to have been created' (Eruvin 13b) — and Koheles 4:3, 'Better than both is the one who has not yet been' — is astonishing: if so, why was he created? Certainly these statements are said only with respect to this world: given the troubles and sufferings each person endures, it would be better not to have been created. But for the World to Come, certainly it is better that he was created, because precisely through being-here he comes to the tachlis. And even in this world: 'one hour of teshuvah and good deeds in this world is more beautiful than all the life of the World to Come' (Avos 4:17).",
                "intermediate": "The famous shisus of vinmenu was-not-created is contextualized to olam ha-zeh evaluation only. From the tachlis vantage the very hardship is the gateway. The Avos statement (yafa sha'ah achas) collapses both — even within this world the briyah is justified by tikkunic moments. Cf. Tinyana T24 (joy heals).",
                "scholarly": "ערובין יג:; קהלת ד:ג; אבות ד:יז; ליקו\"מ קמא ד."
            },
            {
                "beginner": "Nissan is the Rosh HaShanah for kings (Rosh Hashanah 2). Then they appoint all kings Above, and certainly they give gifts to each one whom they crown. May Hashem give us also a king and manhig, ro'eh ne'eman, who can illuminate in us, etc., as above. 'Va-anachnu hem ha-am asher be-raglecha' — those who go after Your counsel, who conduct themselves after the manhig (Shemos 11; Rashi). If only we had a manhig like Moshe, etc., as above. (All of this pertains to lesson 39.)",
                "intermediate": "Nissan as the moadim of mlachim: the Above-coronation timing matches the dor's hischadshus need. Va-anachnu… be-raglecha = us in our raglayim-aspect, illuminated by the manhig. The closing kol zeh shayach le-siman lamed-tes is Reb Nosson's note that this is appendant material — the section is structurally a coda.",
                "scholarly": "שמות יא:ח; ראש השנה ב.; ליקו\"מ קמא ז; ליקו\"ה ראש השנה ה."
            }
        ]
    },
    40: {
        "title_en": "One Who Tasted Eretz Yisrael Recognizes Who Was with the Tzaddik on Rosh HaShanah",
        "title_he": "מי שיודע מארץ ישראל",
        "segs": [
            {
                "beginner": "One who knows from Eretz Yisrael — who has truly tasted the taste of Eretz Yisrael — can recognize in another whether he was with a tzaddik on Rosh HaShanah, whether that tzaddik is great or small, whether he is a true tzaddik, even whether the man himself is a tzaddik. Because the taste of Eretz Yisrael can be depicted before anyone who knows the taste of seichel. Only an ish bur (an ignoramus) cannot grasp this; but anyone who knows from seichel — lomdim who feel some taste of seichel in pshat-and-kashya, or scholars in other wisdoms who feel the taste of seichel — can understand the taste of Eretz Yisrael. 'Avira de-Eretz Yisrael machkim' — the air of the Land of Israel makes wise (Bava Basra 158; Zohar Pinchas 245; Tikkun 22). The taste of chochmah and seichel is precious, but the main virtue of Eretz Yisrael's holiness is from Hashem's hashgachah: He gazes on Eretz Yisrael always — 'tamid einei Hashem Elokecha bah me-reishis ha-shanah ve-ad acharis shanah' (Devarim 11:12); through this, Eretz Yisrael is sanctified and its air makes wise. Eyes are named for chochmah — 'va-tipakachna einei shneihem' (Bereshis 3) which Rashi explains: said regarding chochmah. So Hashem's gazing on Eretz Yisrael with His eyes makes its air make wise. Where does this gazing come from above? From Israel's neshamos, in which Hashem glories — 'Yisrael asher becha espa'ar' (Yeshayah 49:3). From this glorying, the form of tefillin (called pe'er, Sukkah 25) is made; tefillin are mochin, entering inward and bursting forth in the eyes. From that, Hashem's hashgachah is made (kivyachol), and from that, Eretz Yisrael's holiness is made — avira de-Eretz Yisrael machkim through the einei hashgachah. That is why it is called Eretz Yisrael — the land receives its kedushah from 'Yisrael asher becha espa'ar.' But not all times are equal. Sometimes one of Israel becomes distant from Hashem, and then the Shechinah cries out 'kallani me-roshi, kallani mi-zro'i' (Sanhedrin 46) — 'me-roshi, mi-zro'i' specifically, the form of tefillin (head and arm). When one of Israel draws close, and another joins, and more and more join who want to serve Him, then His glorying is increased and added — He glories in His people who draw close. Through that glorying, tefillin-mochin are made, and from that the kedushas Eretz Yisrael — avira de-Eretz Yisrael machkim — through einei hashgachah. But who can see this glorying? The one who sees the true tzaddik, who brings people close to His service, and who is himself the principal kirvas Yisrael to their Father in Heaven — he himself is the very glorying Hashem glories with. The one who gazes upon him at the time of gathering, when people gather to hear the word of Hashem (and especially on Rosh HaShanah, the great gathering) — then the glorying is greatest, because many gather who desire to draw close, and the tzaddik's pe'er ve-yofi is increased. The one who truly gazes on this true tzaddik also receives that glorying; tefillin-mochin are made for him too; his eyes too become like einei Hashem; and wherever he gazes, the form of avira de-Eretz Yisrael machkim is made. 'Melech be-yofyo techezenah einecha' (Yeshayah 33:17) — when you merit to see the king in his beauty (the tzaddik in his pe'er, at the gathering, when his beauty is manifest) — through this, 'einecha tirenah eretz merchakim,' the form of Eretz Yisrael, the form of avira de-Eretz Yisrael machkim. Chochmah is called merchakim — 'amarti echkamah ve-hi rechokah mimeni' (Koheles 7:23). One who has yearning for Eretz Yisrael, especially one who has tasted the true taste, when he meets a person who was with a true tzaddik on Rosh HaShanah, is obligated to feel then the taste of Eretz Yisrael — because through that person this air becomes the form of Eretz Yisrael, and his yearning for Eretz Yisrael ought to be aroused, each according to his level. The main thing is that it be in truth and simplicity.",
                "intermediate": "The chain: neshamos → hispa'arus → tefillin (pe'er) → mochin → ha-einayim → hashgachah → kedushas E\"Y → avira machkim. The tzaddik is the visible hispa'arus; gazing on him at kibbutz Rosh HaShanah produces tefillin-mochin in the gazer; his eyes then carry E\"Y's avira anywhere he looks. Diagnostic: the one who tasted E\"Y can recognize a fellow Rosh-HaShanah-pilgrim by the residual machkim in his air. Cf. Chayey Moharan 54 (Rebbe Nachman's own E\"Y journey); LH Birkat HaMazon 4:11; Tinyana T7 (compassionate leader); T39 (manhig draws raglayim). PNC reading: this teaching is the structural justification for the Uman pilgrimage — Rosh HaShanah by the tzaddik makes you a portable carrier of avira de-E\"Y. Practical: the test of having been there is whether others sense E\"Y when they encounter you afterward.",
                "scholarly": "דברים יא:יב; בראשית ג:ז; ישעיה לג:יז, מט:ג; קהלת ז:כג; בבא בתרא קנח.; סנהדרין מו.; סוכה כה.; זוהר פינחס רמה., בשלח א-ב.; תיקוני זוהר תיקון כב; חיי מוהר\"ן נד; ליקו\"מ קמא ז, נח; ליקו\"ה ברכת המזון ד:יא."
            },
            {
                "beginner": "There is also the form of abundant wealth — 've-chesef to'afos lach' (Iyov 22:25) — the language of doubling. With this abundance, his will is fulfilled, since it is doubled (and Rebbe Nachman did not finish the thought; see Likutey Halachos OC Birkat HaMazon 4:16 for a suggested completion).",
                "intermediate": "Shefa kefulah — to'afos as ke-fulah; the doubling closes the gap created by 'no man dies with half his desire in his hand' (Koheles Rabbah 1). Reb Nosson notes the lesson is unfinished. PNC reading: leave the lesson as a fragment; the doubling-of-shefa is itself a hint that completion comes from above, not from human concluding.",
                "scholarly": "איוב כב:כה; קהלת רבה א; חיי מוהר\"ן תקפה; ליקו\"ה ברכת המזון ד:טז."
            }
        ]
    }
}

def main():
    with open(LMC, encoding='utf-8') as f:
        cdata = json.load(f)
    if '2' not in cdata:
        cdata['2'] = {}
    written = []
    for n, info in torahs.items():
        # Verify segment count matches source
        src_path = os.path.join(SRC_BASE, f'torah-{n}.json')
        with open(src_path, encoding='utf-8') as f:
            src = json.load(f)
        src_count = len(src.get('segments', []))
        my_count = len(info['segs'])
        assert src_count == my_count, f"T{n}: src has {src_count} segs, PNC has {my_count}"

        segs_out = []
        for s in info['segs']:
            segs_out.append({
                "beginner": {"en": s["beginner"], "he": ""},
                "intermediate": {"en": s["intermediate"], "he": ""},
                "scholarly": {"en": "", "he": s["scholarly"]}
            })
        data = {
            "id": f"pnc-2-{n}",
            "book": "pettek-nanach-commentary",
            "part": 2,
            "torah": n,
            "title": f"T{n} (Tinyana) PNC - {info['title_en']}",
            "hebrewTitle": info['title_he'],
            "author": "Pettek Nanach",
            "segments": segs_out
        }
        out_path = os.path.join(PNC_DIR, f'tinyana-{n}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        with open(out_path, encoding='utf-8') as f:
            rt = json.load(f)
        assert rt['id'] == data['id']
        assert len(rt['segments']) == len(segs_out)
        sn = str(n)
        if sn not in cdata['2']:
            cdata['2'][sn] = {}
        cdata['2'][sn]['running_commentary'] = {
            "book": "pettek-nanach-commentary",
            "slug": "pettek-nanach-commentary",
            "status": "available",
            "url": f"/reader/pettek-nanach-commentary/tinyana-{n}.json",
            "layers": ["beginner", "intermediate", "scholarly"],
            "author": "Pettek Nanach",
            "label": f"Pettek Nanach Running Commentary - Tinyana T{n} ({info['title_en']})"
        }
        written.append((n, len(segs_out)))
        print(f"OK Tinyana T{n}: wrote {len(segs_out)} segs")

    with open(LMC, 'w', encoding='utf-8') as f:
        json.dump(cdata, f, ensure_ascii=False, indent=2)
    print("Done:", written)

if __name__ == '__main__':
    main()
