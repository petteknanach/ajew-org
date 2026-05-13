import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)

def seg(idx, be, bi_en, bi_he, sc_he):
    return {"index": idx, "beginner": {"en": be, "he": ""}, "intermediate": {"en": bi_en, "he": bi_he}, "scholarly": {"en": "", "he": sc_he}}

def make_data(n, segs, title_en, title_he):
    return {"id": f"pnc-1-{n}", "book": pnc_name, "part": 1, "torah": n,
            "title": f"T{n} PNC - {title_en}", "hebrewTitle": title_he,
            "author": "Petten Nanach", "segments": segs}

torahs = {}

# T97: "God do not be silent" (Teh 83) — Eldad/Medad / A"L + M"Y = Dad / He = shefa / Name Elokim from Shalem
torahs[97] = make_data(97, [
seg(1,
"Opening verse: 'God, do not be silent; do not be deaf; do not be still, O God!' (Psalms 83:2). The teaching explains a hidden source of spiritual abundance: there is a supernal place called 'Eldad and Medad' from which all shefa (divine abundance/flow) descends into the world. The two letters Aleph-Lamed (A'L) contain the letter Dalet twice (as Dalet = 4, and aleph=1+lamed=30... but the teaching follows gematria of letter-names). And the two letters Mem-Yud (M'Y) also each resolve to a Dalet. The letter Heh represents the shefa itself — 'Heh lachem zera' (Genesis 47:23: 'Heh, here is seed for you'). The Name Elokim is completed through the aspect of 'Shalem' (wholeness). But when Israel sins, the abundance is withheld, and the Name Elokim is not complete — this is the meaning of the cry: 'God, do not be silent' — do not withhold the shefa from us.",
"T97: Teh 83:2. Supernal place 'Eldad and Medad' = source of shefa. A\"L and M\"Y each contain Dad (Dalet); Heh = shefa (Ber 47:23: 'Heh lachem zera'). Name Elokim completed through Shalem. Sin withholds shefa → 'God do not be silent.' (Ari, Likutey Torah Beha'alotcha).",
"תה' פ\"ג:ב. מְקוֹם עֶלְיוֹן 'אֶלְדָּד וּמֵידָד' = מְקוֹר הַשֶּׁפַע. אָלֶ\"ף-לָמֶ\"ד וּמֶ\"ם-יוּ\"ד = דָּלֶ\"ת; הֵ\"א = שֶׁפַע (בר' מ\"ז:כג). שֵׁם אֱלֹהִים מְשַׁלֵּם. חֵטְא עוֹצֵר שֶׁפַע → 'אַל דֳּמִי.'",
"תה' פ\"ג:ב; בר' מ\"ז:כג; אָרִ\"י לִקּ\"ת בְּהַעֲלֹתְךָ."
),
seg(2,
"The Name Elokim is built from two parts: the letter Heh (representing shefa) plus the Name A-L (which is rooted in Eldad and Medad). When the shefa flows fully, Elokim is complete in the world. But when sins interrupt the flow, the Name is as if 'silenced' — diminished. The prayer 'God do not be silent' is therefore a request that the divine flow not be stopped, that the Name be kept whole, that the blessing continue to reach all who need it. This is why Rebbe Nachman connects the verse to this mystical structure — the cry of prayer itself helps restore and complete the Name.",
"Name Elokim = Heh (shefa) + A\"L (Eldad/Medad root). Sins silence/diminish the Name. Prayer 'al domi' = request to restore shefa and complete the Name. Rebbe Nachman: prayer itself restores the divine Name-flow.",
"שֵׁם אֱלֹהִים = הֵ\"א (שֶׁפַע) + אָלֶ\"ף-לָמֶ\"ד. חֵטְא מְשַׁתֵּק הַשֵּׁם. תְּפִלָּה 'אַל דֳּמִי' = בַּקָּשָׁה לְהַחְזִיר הַשֶּׁפַע וּלְהַשְׁלִים הַשֵּׁם.",
"תה' פ\"ג:ב."
),
], "God Do Not Be Silent — Eldad/Medad/Shefa/Name Elokim (2 segs)", "אַל דֳּמִי לְךָ אֱלֹהִים — אֶלְדָּד וּמֵידָד וְהַשֶּׁפַע")

# T98: 1 seg — "He set his eyes on him and he became a heap of bones" (Ber 58a) — power of tzaddik's gaze
torahs[98] = make_data(98, [
seg(1,
"The Talmud (Berachot 58a, Shabbat 34a, Bava Batra 75a, Sanhedrin 100a) records the expression: 'He set his eyes on him and he became a heap of bones.' This phrase appears in multiple contexts about a great sage who gazed at someone with disapproval, and that person was immediately spiritually — or even physically — struck down, reduced to nothing. Rabbeinu here explains the deeper meaning: the tzaddik's eyes carry immense spiritual power. The eyes of the holy sage are vessels of divine light and judgment. When he 'sets his eyes' upon someone who is acting improperly, that gaze carries with it the full weight of divine truth. The person who receives such a gaze is confronted with ultimate reality — stripped of their illusions and self-justifications — and this confrontation can undo them completely, leaving only the bare, dry bones of their existence without the life-breath of self-deception.",
"Ber 58a; Shab 34a; BB 75a; San 100a: 'He set his eyes on him → heap of bones.' Tzaddik's eyes = vessels of divine light and judgment. Gaze confronts person with divine truth, strips illusion. 'Heap of bones' = existence stripped of self-deception.",
"בר' נ\"ח:; שַׁב' ל\"ד:; ב\"ב ע\"ה:; סַנ' ק:. 'נָתַן עֵינָיו בּוֹ → גַּל עֲצָמוֹת.' עֵינֵי הַצַּדִּיק = כְּלֵי אוֹר וְדִין אֱלֹהִי. מַבָּט = עִימּוּת עִם אֱמֶת עֶלְיוֹנָה. 'גַּל עֲצָמוֹת' = קִיּוּם מְשֻׁלָּל אַשְׁלָיָה.",
"בר' נ\"ח:; שַׁב' ל\"ד:; ב\"ב ע\"ה:; סַנ' ק:."
),
], "He Set His Eyes — Tzaddik's Gaze and Divine Truth (1 seg)", "נָתַן בּוֹ עֵינָיו — כֹּחַ עֵינֵי הַצַּדִּיק וְהָאֱמֶת הָאֱלֹהִית")

# T99: 2 segs — devekus in prayer / even without kavvanah, still pray (Ber 34b)
torahs[99] = make_data(99, [
seg(1,
"Opening verse: 'And I pleaded with God at that time, saying' (Deuteronomy 3:23 — Moses's prayer to enter the Land of Israel). A person must strive to pray with devekus — deep attachment and cleaving to God. But if at times a person finds himself unable to pray with proper devekus or concentration, he must not say: 'Since I cannot pray properly, I will not pray at all.' This would be a grave error. The obligation to pray exists regardless of one's spiritual state.",
"Devarim 3:23. Devekus in prayer is the ideal. But if can't concentrate, must NOT conclude 'therefore I will not pray.' Obligation to pray exists regardless of spiritual state.",
"דב' ג:כג. דְּבֵקוּת בִּתְפִלָּה = הָאִידֵאָל. אֲבָל אִם אֵינוֹ יָכוֹל לְהִתְרַכֵּז, אַל יֹאמַר 'לָכֵן לֹא אֶתְפַּלֵּל.' חוֹבַת הַתְּפִלָּה קַיֶּמֶת בְּכָל מַצָּב.",
"דב' ג:כג."
),
seg(2,
"The Talmud (Berachot 34b) teaches about Rabbi Chanina ben Dosa, who would pray for the sick — and he would know whether his prayer was accepted or not based on whether the words flowed smoothly in his mouth. This is the model: even the greatest tzaddik sometimes has prayers that flow and sometimes doesn't. What matters is the attempt. The prayer, even imperfect, even without full concentration, still ascends and still has effect. Rabbeinu emphasizes: never abandon prayer because you feel unworthy or distracted. Go before God in any state — even stuttering, even confused — and the very act of approaching Him is itself precious.",
"Ber 34b: R' Chanina ben Dosa knew if prayer accepted by whether it flowed smoothly. Even great tzaddik has variable prayer. Main thing = keep praying in any state. Even imperfect prayer ascends and has effect. Never abandon prayer out of unworthiness.",
"בר' ל\"ד:: ר' חֲנִינָא בֶּן דּוֹסָא יָדַע אִם תְּפִלָּתוֹ נִתְקַבְּלָה. הָעִיקָּר = לְהִתְפַּלֵּל בְּכָל מַצָּב. אַף תְּפִלָּה חֲסֵרָה עוֹלָה וּפוֹעֶלֶת. לְעוֹלָם לֹא לָזוּז מִן הַתְּפִלָּה.",
"בר' ל\"ד:; דב' ג:כג."
),
], "And I Pleaded — Never Abandon Prayer / Devekus (2 segs)", "וָאֶתְחַנַּן אֶל ה' — אַל תֶּעֱזֹב הַתְּפִלָּה")

# T100: 1 seg — Tzaddikim of different temperaments — some good to all, others not
torahs[100] = make_data(100, [
seg(1,
"The teaching opens with an observation about tzaddikim (righteous people): all of them are holy, and within every true tzaddik dwells the Shechinah (Divine Presence). Yet we observe a paradox — some tzaddikim have exceedingly good temperaments and are genuinely good to everyone around them, warm and approachable and helpful. Other tzaddikim, while genuinely holy and righteous, have difficult temperaments — they are harsh, demanding, or hard to approach. How can this be? If both are equally holy and have the Shechinah within them, why the difference in character? Rabbeinu explains: the difference lies in the particular path and spiritual work of each tzaddik. Those who work primarily through chesed (loving-kindness) and the quality of goodness develop a sweet, warm character that overflows into their dealings with others. Those whose spiritual work involves din (strict judgment) or intense struggle with their own inner forces may carry a more austere or difficult exterior — not because they lack holiness, but because their holiness takes a different form, shaped by the nature of their particular divine service.",
"Observation: all tzaddikim holy + Shechinah within. Yet some good-tempered to all, others harsh. Why? Difference lies in each tzaddik's spiritual path: chesed-path → sweet warm character. Din/struggle-path → austere exterior. Both holy; different forms of service.",
"כָּל הַצַּדִּיקִים קְדוֹשִׁים + שְׁכִינָה בְּתוֹכָם. אֲבָל יֵשׁ בַּעֲלֵי מִדּוֹת טוֹבוֹת וְיֵשׁ קָשֵׁי אֹפִי. הֶבְדֵּל = בְּדֶרֶךְ עֲבוֹדַת כָּל צַדִּיק: חֶסֶד → מִדּוֹת מְתוּקוֹת; דִּין/מַאֲבָק → פָּנִים חֲמוּרוֹת. שְׁנֵיהֶם קְדוֹשִׁים.",
""
),
], "Tzaddikim of Different Temperaments — Chesed vs Din Path (1 seg)", "צַדִּיקִים בַּעֲלֵי טֶבַע שׁוֹנֶה — דֶּרֶךְ הַחֶסֶד וְדֶרֶךְ הַדִּין")

# T101: 2 segs — Bikrov alai merayim / Yah+YHVH = Rock of worlds = created through Torah-rayshis / yud+hay / defeating enemies through Torah
torahs[101] = make_data(101, [
seg(1,
"Opening verse: 'When my adversaries draw near to me to consume my flesh, my oppressors and my enemies against me — they have stumbled and fallen' (Psalms 27:2). The verse 'With Yah, God is the Rock of worlds' (Isaiah 26:4) teaches that through the Torah — called 'reishit' (beginning) — God created the worlds (Bereishit Rabbah 1:1). The letter Yud of the divine Name represents the seichel (intellect) of the Torah; the letter Heh represents the five books of the Torah, corresponding to the five outlets of the mouth: lips, teeth, palate, tongue, throat. Through these two letters — Yah — the world was created (as the Talmud teaches: with Yah He formed the worlds). The adversaries who approach to consume a person's flesh are the forces of the Other Side that try to separate a person from Torah and divine wisdom.",
"Teh 27:2. Yesh 26:4: 'With Yah, HaShem is Rock of worlds.' Torah = reishit → created worlds (Ber Rabbah 1:1). Yud = seichel; Heh = five books/five mouth-outlets. Through Yah the worlds were made. Adversaries = forces that separate from Torah.",
"תה' כ\"ז:ב. יְשַׁ' כ\"ו:ד. תּוֹרָה = רֵאשִׁית → בָּרָא עוֹלָמוֹת (בר' רבה א:א). יוּ\"ד = שֵׂכֶל; הֵ\"א = חֲמִשָּׁה חוּמְשֵׁי תּוֹרָה/חָמֵשׁ מוֹצָאוֹת הַפֶּה. בְּיָ\"ה בָּרָא עוֹלָמוֹת. הַמְּרָעִים = כֹּחוֹת הַמַּפְרִידִים מִן הַתּוֹרָה.",
"תה' כ\"ז:ב; יְשַׁ' כ\"ו:ד; בר' רבה א:א."
),
seg(2,
"The resolution to the adversaries' attack: when the seichel (intellect/wisdom) of the Torah is connected to its letters — when the Yud is united with the Heh — the enemies stumble and fall by themselves. The person does not need to fight directly. Rather, when he cleaves to Torah with both its inner wisdom and its expressed letters, when he unifies the intellectual dimension with the practical verbal dimension of Torah study, this itself defeats the klipot and spiritual enemies. They 'stumble and fall' because they have no foothold when Torah is complete and unified within a person.",
"Resolution: when seichel (Yud) is connected to letters (Heh) = Torah unified within person. No direct fight needed. Enemies stumble and fall by themselves. Klipot have no foothold when Torah is whole and unified in the person.",
"תִּקּוּן: כְּשֶׁהַשֵּׂכֶל (יוּ\"ד) מְחוּבָּר לְאוֹתִיּוֹת (הֵ\"א) = תּוֹרָה שְׁלֵמָה בְּתוֹכוֹ. אֵין צֹרֶךְ בְּמַאֲבָק יָשִׁיר. הָאוֹיְבִים כּוֹשְׁלִים מֵאֵלֵיהֶם. לַקְּלִיפּוֹת אֵין אֲחִיזָה כְּשֶׁהַתּוֹרָה שְׁלֵמָה.",
"תה' כ\"ז:ב; יְשַׁ' כ\"ו:ד."
),
], "Bikrov Alai Merayim — Torah/Yah/Seichel Defeats Enemies (2 segs)", "בִּקְרֹב עָלַי מְרֵעִים — תּוֹרַת יָ\"הּ מְנַצַּחַת הָאוֹיְבִים")

# T102: 2 segs — "You shall be over my house" / klipot subdued by Kingship revealed through goodness
torahs[102] = make_data(102, [
seg(1,
"Opening verse: 'You shall be over my house, and by your mouth all my people shall be sustained' (Genesis 41:40 — Pharaoh to Joseph). The core teaching: everything the Holy One Blessed Be He created — He created only for His glory (Avot chapter 6), and specifically to reveal His Kingship (Malchut) in the world. And through this revelation of Kingship, the klipot (spiritual husks/impediments) are subdued beneath the Shechinah. The question then becomes: how is His Kingship revealed?",
"Ber 41:40. Everything created for God's glory (Avot 6) = to reveal His Malchut. Through this revelation, klipot are subdued beneath the Shechinah. Question: how is Malchut revealed?",
"בר' מ\"א:מ. הַכֹּל נִבְרָא לִכְבוֹד ה' (אבות ו) = לְגַלּוֹת מַלְכוּתוֹ. עַל יְדֵי זֶה קְלִיפּוֹת נִכְנָעוֹת תַּחַת הַשְּׁכִינָה. שְׁאֵלָה: כֵּיצַד מִתְגַּלֶּה הַמַּלְכוּת?",
"בר' מ\"א:מ; אבות ו."
),
seg(2,
"God's Kingship is revealed when He bestows great goodness upon Israel — when blessing flows visibly from heaven and all can see that Israel is cared for and elevated. This is the meaning of Joseph's role 'over the house' — he is the channel through which sustenance reaches all. The tzaddik who channels blessing into the world is the one who reveals divine Kingship. By his mouth all the people are sustained — his Torah, his prayer, his blessing feed the entire nation spiritually and physically. The klipot are subdued not through warfare but through the overflow of divine goodness that leaves no room for the husks to gain purchase.",
"Malchut revealed = when God bestows great goodness on Israel, visible blessing. Yosef 'over the house' = tzaddik as channel of sustenance. 'By your mouth all people sustained' = tzaddik's Torah/prayer/blessing feeds nation. Klipot subdued by overflow of goodness, not warfare.",
"מַלְכוּת מִתְגַּלֶּה = כְּשֶׁה' מֵיטִיב לְיִשְׂרָאֵל בְּרָכָה גְלוּיָה. יוֹסֵף 'עַל הַבַּיִת' = צַדִּיק כְּצִנּוֹר פַּרְנָסָה. 'עַל פִּיךָ יִשָּׁק כָּל עַמִּי' = תּוֹרָה/תְּפִלָּה/בְּרָכָה מְפַרְנֶסֶת. קְלִיפּוֹת נִכְנָעוֹת מֵשֶׁפַע הַטּוֹבָה.",
"בר' מ\"א:מ; אבות ו."
),
], "You Shall Be Over My House — Malchut Revealed Through Goodness (2 segs)", "אַתָּה תִּהְיֶה עַל בֵּיתִי — גִּלּוּי הַמַּלְכוּת בְּשֶׁפַע הַטּוֹבָה")

# T103: 1 seg — withholding halacha from student = robbing inheritance / Sanhedrin 91b
torahs[103] = make_data(103, [
seg(1,
"The Talmud (Sanhedrin 91b) teaches: 'Anyone who withholds a teaching of halacha (Jewish law) from the mouth of a student — it is as if he has robbed him of the inheritance of his fathers,' as it is written: 'Moses commanded us the Torah, an inheritance of the congregation of Jacob' (Deuteronomy 33:4). Torah is the inheritance of every single Jew — it belongs to all of Israel by birthright. When a teacher knows halacha and refuses to teach it, or withholds his knowledge out of pride or stinginess, he is in effect stealing from the student. The student has a right to that Torah, and the teacher who withholds it commits a form of theft — specifically the theft of a spiritual inheritance that is even more fundamental than material inheritance. Rabbeinu draws the practical teaching: every person of Torah knowledge has an obligation to share it generously, especially with students who seek to learn.",
"Sanhedrin 91b: withholding halacha from student = stealing inheritance of his fathers. Devarim 33:4: 'Torah commanded by Moshe = inheritance of Yaakov's congregation.' Torah is every Jew's birthright. Teacher who withholds Torah = steals spiritual inheritance — worse than material theft. Obligation: share Torah knowledge generously.",
"סַנ' צ\"א:: מְעַכֵּב הֲלָכָה מִתַּלְמִיד = כְּגוֹזֵל נַחֲלַת אֲבוֹתָיו. דב' ל\"ג:ד: 'תּוֹרָה צִוָּה לָנוּ מֹשֶׁה מוֹרָשָׁה קְהִלַּת יַעֲקֹב.' תּוֹרָה = יְרוּשַּׁת כָּל יִשְׂרָאֵל. מְעַכֵּב = גּוֹזֵל נַחֲלָה רוּחָנִית. חוֹבָה: לְשַׁתֵּף תּוֹרָה בְּנַחַת.",
"סַנ' צ\"א:; דב' ל\"ג:ד."
),
], "Withholding Halacha Robs Inheritance — Share Torah Generously (1 seg)", "הַמְּעַכֵּב הֲלָכָה מִתַּלְמִיד — גֵּזֶל נַחֲלַת הַתּוֹרָה")

# T104: 1 seg — Moshe rebuked sons of Gad "offspring of sinful men" and was punished (Sefer Chassidim 137)
torahs[104] = make_data(104, [
seg(1,
"The Midrash (cited in Sefer Chassidim, sign 137, and in Reishit Chochmah, Sha'ar Ha'anavah chapter 8) teaches: because Moses said to the sons of Gad, 'Offspring of sinful men' (Numbers 32:14), he was punished — his grandson Yonatan later went on to serve idols (Judges 18:30). Even though Moses's rebuke was justified — the sons of Gad were indeed acting in a way reminiscent of the sin of the spies — the very act of labeling them 'offspring of sinful men' carried consequences. Words have spiritual power and weight. Even the greatest tzaddik must be careful with how he phrases rebuke, especially when it involves attaching a negative characterization to people's ancestry or identity. The punishment was measure for measure: he rebuked them by referencing their fathers' sin; his own grandson fell into sin. Rabbeinu draws the lesson: rebuke must be given with great care, with love, without shaming, and without linking people to the failings of their ancestors.",
"Midrash (Sefer Chassidim 137; Reishis Chochmah Sha'ar Anavah 8): Moshe called sons of Gad 'offspring of sinful men' (Bamidbar 32:14) → punished: his grandson Yonatan served idols (Shof 18:30). Justified rebuke, but wrong phrasing = consequences. Words carry spiritual weight. Measure for measure: referenced their fathers' sin → his own grandson sinned. Lesson: rebuke without shaming ancestry.",
"ספר חסידים קל\"ז; ראשית חכמה שַׁעַר הָעֲנָוָה ח. בַּמ' ל\"ב:יד: 'תַּרְבּוּת אֲנָשִׁים חַטָּאִים.' נֶעֱנַשׁ: נֶכֶד יוֹנָתָן עָבַד עֲבוֹדָה זָרָה (שוֹפ' י\"ח:ל). מִדָּה כְּנֶגֶד מִדָּה. לָא לְבַיֵּשׁ בְּגַנּוּת אֲבוֹת.",
"בַּמ' ל\"ב:יד; שוֹפ' י\"ח:ל; ספר חסידים קל\"ז; ראשית חכמה שַׁעַר הָעֲנָוָה ח."
),
], "Moshe Rebuked Sons of Gad — Careful Words Even in Rebuke (1 seg)", "מֹשֶׁה גָּעַר בִּבְנֵי גָּד — זְהִירוּת בִּלְשׁוֹן הַתּוֹכֵחָה")

# T105: 7 segs — "Azi v'zimrat Yah" / world needs rachamim / teshuvah connects letters to root / Moshe asked Hashem to pray for Miriam / exile of Shechinah
torahs[105] = make_data(105, [
seg(1,
"Opening verse: 'My strength and song is God (Yah), and He has become my salvation' (Exodus 15:2, from the Song of the Sea). The teaching begins with a fundamental observation: the entire world stands in need of great divine compassion (rachamim) — both in spiritual matters and in physical matters. Every single person seeks this compassion, yet people do not know where to find it. In truth, rachamim is right before everyone's eyes — it is not hidden far away — but people fail to recognize it because their perception is clouded.",
"Shemot 15:2: 'Azi v'zimrat Yah = my salvation.' The world needs great rachamim in all areas. Everyone seeks it but doesn't know where it is. Rachamim is right before everyone's eyes — hidden only by clouded perception.",
"שְׁמ' ט\"ו:ב. כָּל הָעוֹלָם צָרִיךְ רַחֲמִים גְּדוֹלִים בְּכָל מָקוֹם. כֻּלָּם מְחַפְּשִׂים וְאֵינָם יוֹדְעִים הֵיכָן. הָרַחֲמִים נֶגֶד עֵינֵי כָּל אֶחָד — מְכוּסִּים רַק בְּקֶהוּת הַהַכָּרָה.",
"שְׁמ' ט\"ו:ב."
),
seg(2,
"Rachamim is actually rooted in Torah study — specifically in the quality of how one studies Torah. When a person learns Torah with the proper intention and approach — treating the Torah as the ultimate reality to which everything must be referred back — then the da'at (deep knowing/integration) becomes complete. When da'at is complete, rachamim is awakened. This is because da'at is the inner quality that connects and unifies; when it functions, a person perceives the unity underlying all of existence, and from that perception, compassion naturally flows.",
"Rachamim rooted in Torah study. Learning Torah properly → da'at becomes complete → rachamim awakened. Da'at = deep inner integration that perceives unity. From perceived unity, compassion flows naturally.",
"רַחֲמִים = שׁוֹרֶשׁ בְּלִמּוּד תּוֹרָה. לִמּוּד תּוֹרָה כָּרָאוּי → דַּעַת שָׁלֵם → רַחֲמִים מִתְעוֹרְרִים. דַּעַת = חִיבּוּר פְּנִימִי הַמַּכִּיר אַחְדוּת. מֵאַחְדוּת = רַחֲמִים.",
"שְׁמ' ט\"ו:ב."
),
seg(3,
"When a person learns Torah in this complete manner, he performs a teshuvah (return/rectification) — he connects the letters and letter-combinations that belong to his portion in the totality of the worlds back to their root and their proper place. He becomes a new creation. And then da'at is complete and rachamim is awakened. An analogy: when two compassionate people are present, one can only feel compassion for what the other feels compassion for — a fuller compassion emerges. Similarly, when a person's Torah is complete, his rachamim-capacity expands and deepens. There is no strength except through Torah (Zevachim 116a).",
"Learning Torah fully = teshuvah: connects letters of one's portion back to root → becomes new creation → da'at complete → rachamim. Analogy: two compassionate people expand each other's rachamim. There is no strength except Torah (Zev 116a).",
"לִמּוּד שָׁלֵם = תְּשׁוּבָה: מְחַבֵּר אוֹתִיּוֹת חֶלְקוֹ לְשֹׁרֶשׁ → נַעֲשֶׂה בְּרִיָּה חֲדָשָׁה → דַּעַת שָׁלֵם → רַחֲמִים. מָשָׁל: שְׁנֵי רַחֲמָנִים מַרְחִיבִים רַחֲמֵי זֶה אֶת זֶה. אֵין עֹז אֶלָּא תּוֹרָה (זב' קי\"ו:).",
"זב' קי\"ו:."
),
seg(4,
"'My strength and song is Yah.' The word 'zimrat' (song/melody) in the verse is understood here as 'zimrat Yah' — the song/prayer of God Himself. What does it mean for God to have a prayer? The Talmud preserves the tradition that God Himself, as it were, prays — 'May it be My will that My compassion overcomes My anger' (Berachot 7a). 'Zimrat Yah' thus points to the inner prayer-quality within the divine itself, the aspect of God seeking to bestow rachamim upon His creation.",
"'Zimrat Yah' = the prayer/song of God Himself. Ber 7a: God 'prays' — 'May My compassion overcome My anger.' Zimrat Yah = inner prayer-quality in the divine seeking to bestow rachamim.",
"'זִמְרַת יָ\"הּ' = תְּפִלָּה/שִׁיר שֶׁל הַקָּדוֹשׁ בָּרוּךְ הוּא עַצְמוֹ. בר' ז:: ה' 'מִתְפַּלֵּל' = 'יְהִי רָצוֹן מִלְּפָנַי שֶׁיִּכְבְּשׁוּ רַחֲמַי אֶת כַּעֲסִי.' זִמְרַת יָ\"הּ = אֵיכוּת תְּפִלָּה פְּנִימִית בָּאֱלֹהוּת.",
"בר' ז:."
),
seg(5,
"The deepest aspect of this teaching: Moses, when his sister Miriam was stricken with tzara'at (Numbers 12:13), prayed with the shortest prayer in the Torah: 'El na refa na la' — 'God, please heal her.' But Rabbeinu explains (heard from his holy mouth directly) that Moses was not only asking God to heal Miriam — he was asking God to pray for her Himself. 'El na' — O God, please — ask Yourself, pray to Yourself, that You should heal her. This is the meaning of zimrat Yah: Moses accessed the level where God's own compassion-prayer is aroused. The 'song of God' = God's self-generated will to bestow rachamim.",
"The deepest point: Moshe's prayer 'El na refa na la' (Bamidbar 12:13) = asking God to pray for Miriam Himself, not just to heal her. 'El na' = 'O God, please ask Yourself.' Moshe accessed zimrat Yah = God's own self-generated compassion-prayer. Heard directly from Rebbe Nachman.",
"הַנְּקוּדָּה הָעֲמוּקָּה: תְּפִלַּת מֹשֶׁה 'אֵל נָא רְפָא נָא לָהּ' (בַּמ' י\"ב:יג) = בַּקָּשָׁה מֵה' שֶׁיִּתְפַּלֵּל בְּעַד מִרְיָם בְּעַצְמוֹ. 'אֵל נָא' = 'בַּקֵּשׁ מֵעַצְמְךָ.' מֹשֶׁה הִגִּיעַ לִזְמִרַת יָ\"הּ = תְּפִלַּת הַקָּדוֹשׁ בָּרוּךְ הוּא מֵעַצְמוֹ.",
"בַּמ' י\"ב:יג."
),
seg(6,
"This explains the verse: 'My strength and song is Yah, and He has become my salvation.' The 'strength' (ozi) refers to the strength of Torah. The 'song of Yah' refers to God's own compassion-prayer. And 'He has become my salvation' — when these two are united (Torah-strength + God's own prayer-compassion), salvation results. Moses modeled this: his Torah-strength was complete (he had full da'at), and he accessed the zimrat Yah (God's self-generated compassion). The result: Miriam was healed. This is the path for anyone seeking rachamim: build Torah-strength and then access the divine song.",
"'Ozi' = strength of Torah. 'Zimrat Yah' = God's own compassion-prayer. United = 'va'yehi li lishua' (salvation). Moshe modeled: full Torah-da'at + accessed zimrat Yah → Miriam healed. Path to rachamim: Torah strength + divine compassion-song.",
"'עָזִּי' = כֹּחַ הַתּוֹרָה. 'זִמְרַת יָ\"הּ' = תְּפִלַּת רַחֲמִים עַצְמִית שֶׁל ה'. יַחַד = 'וַיְהִי לִי לִישׁוּעָה.' מֹשֶׁה: דַּעַת תּוֹרָה שָׁלֵם + זִמְרַת יָ\"הּ → מִרְיָם נִרְפֵּאת. דֶּרֶךְ הָרַחֲמִים: כֹּחַ תּוֹרָה + שִׁיר אֱלֹהִי.",
"שְׁמ' ט\"ו:ב; בַּמ' י\"ב:יג."
),
seg(7,
"The exile of the Shechinah (Divine Presence) is the root cause why da'at is unsettled in the world. When the Shechinah is in exile, the inner knowledge that unifies everything is fragmented. Because da'at is unsettled, rachamim cannot be properly awakened. Because rachamim is not awakened, the world continues in its brokenness. The path back: teshuvah through Torah. The Torah is described as 'poor in one place and rich in another' — meaning that each verse of Torah that seems obscure finds its explanation elsewhere. By learning with this understanding — that the Torah is always self-completing — one awakens the da'at, completes the Shechinah, and restores rachamim to the world.",
"Exile of Shechinah = da'at unsettled. Unsettled da'at → rachamim can't be awakened → world remains broken. Path back: teshuvah through Torah. Torah = 'poor in one place, rich in another' (self-completing). Learning this way → awakens da'at → completes Shechinah → restores rachamim.",
"גָּלוּת הַשְּׁכִינָה = דַּעַת מְבֻלְבָּל. דַּעַת מְבֻלְבָּל → רַחֲמִים לֹא מִתְעוֹרְרִים → עוֹלָם שָׁבוּר. דֶּרֶךְ הַחֲזָרָה: תְּשׁוּבָה בַּתּוֹרָה. תּוֹרָה = 'עֲנִיָּה בְּמָקוֹם אֶחָד וַעֲשִׁירָה בְּמָקוֹם אַחֵר.' לִמּוּד כָּזֶה → מְעוֹרֵר דַּעַת → מְשַׁלֵּם שְׁכִינָה → מְחַזִּיר רַחֲמִים.",
"שְׁמ' ט\"ו:ב."
),
], "Azi v'Zimrat Yah — Torah/Da'at/Rachamim/God's Own Prayer (7 segs)", "עָזִּי וְזִמְרַת יָ\"הּ — תּוֹרָה, דַּעַת, רַחֲמִים, וּתְפִלַּת ה' עַצְמוֹ")

# T106: 2 segs — vanity on earth: righteous gets punishment of wicked (Koheles) / Hosea 14:10
torahs[106] = make_data(106, [
seg(1,
"Opening verse from Ecclesiastes: 'There is a vanity that is done upon the earth: that there are righteous men to whom it happens according to the deeds of the wicked, and wicked men to whom it happens according to the deeds of the righteous' (Ecclesiastes 8:14). The verse describes a seemingly unjust reality — righteous people suffer as if they were wicked, and wicked people prosper as if they were righteous. This appears as absolute 'vanity' — meaningless suffering and meaningless reward. Yet the verse says this is 'done upon the earth' — it exists in this world as part of the divine economy. Rabbeinu begins here to explain that this paradox is not actually vanity but contains deep spiritual significance.",
"Koheles 8:14: righteous get punishment of wicked; wicked get reward of righteous. Appears as 'vanity.' 'Done upon the earth' = part of divine economy. Not actual injustice — deep spiritual significance to be explained.",
"קֹה' ח:יד: צַדִּיקִים מְקַבְּלִים עֹנֶשׁ רְשָׁעִים; רְשָׁעִים מְקַבְּלִים שְׂכַר צַדִּיקִים. נִרְאֶה כְּ'הֶבֶל.' 'עַל הָאָרֶץ' = חֵלֶק מִן הַכַּלְכָּלָה הָאֱלֹהִית. לֹא עָוֶל אֲמִתִּי — מַשְׁמָעוּת רוּחָנִית עֲמֻקָּה.",
"קֹה' ח:יד."
),
seg(2,
"The deeper understanding comes from the verse in Hosea (14:10): 'The righteous shall walk in them, but transgressors shall stumble in them' — the same Torah, the same divine paths, the same experiences: the righteous person walks in them and is elevated, while the transgressor stumbles on the same path. Furthermore: there is a type of wicked person who groans and sighs his entire life over his past deeds — constantly tormented by guilt and regret. And there is a type of righteous person who was always upright from the start, who wonders about his goodness, perhaps questioning whether he was truly tested. The seeming reversal — the tzaddik who 'receives the punishment of the wicked' — is actually the tzaddik undergoing deep spiritual refinement, having the impurities burned away as if they were the punishment due to the wicked. And the 'wicked who receives the reward of the righteous' may be the sinner whose tormented remorse is itself counted as a form of righteousness.",
"Hosea 14:10: same paths — righteous walk in them, transgressors stumble. Wicked person who groans over past = tormented by remorse = form of righteousness. Righteous person always-upright = tested by apparent 'punishment.' Seeming reversal = deep refinement, not injustice.",
"הוֹשֵׁ' י\"ד:י: אוֹתָן דְּרָכִים — צַדִּיקִים הוֹלְכִים, רְשָׁעִים נִכְשָׁלִים. רָשָׁע הַמּוֹאֵן כָּל יָמָיו = יִסּוּרֵי חֲרָטָה = צוּרַת צְדָקָה. צַדִּיק תָּמִיד-יָשָׁר = מְזֻקָּק בְּנִרְאֶה 'עֹנֶשׁ.' הֶיפֵּךְ לְכָאוֹרָה = זִיקּוּק עָמוֹק.",
"קֹה' ח:יד; הוֹשֵׁ' י\"ד:י."
),
], "Vanity on Earth — Righteous/Wicked Reversal / Walking in God's Ways (2 segs)", "הֶבֶל עַל הָאָרֶץ — הֶיפּוּךְ הַצַּדִּיקִים וְהָרְשָׁעִים וְדַרְכֵי ה'")

# T107: 2 segs — "Happy is he who considers the poor" / poverty of mind / great mercy for those without understanding
torahs[107] = make_data(107, [
seg(1,
"Opening verse: 'Happy is he who considers the poor (dal); on the day of evil, God will deliver him' (Psalms 41:2). The Talmud (Nedarim 41a) teaches: there is no poverty except poverty of the mind (da'at). The verse speaks of considering 'the poor' — but the deepest poverty is not material poverty but intellectual and spiritual poverty: the state of being without da'at, without the deep inner knowing that connects a person to God and to reality. The person who 'considers the poor' is one who takes seriously and responds to those who lack da'at — who lack understanding in the service of the Creator.",
"Teh 41:2. Nedarim 41a: no poverty except poverty of da'at/mind. 'Considering the poor (dal)' = paying attention to those lacking da'at. Deepest poverty = spiritual/intellectual, not material.",
"תה' מ\"א:ב. נד' מ\"א:: אֵין עֲנִיּוּת אֶלָּא עֲנִיּוּת הַדַּעַת. 'מַשְׂכִּיל אֶל דָּל' = הֲשִׂמַת לֵב לְחַסְרֵי דַּעַת. עֲנִיּוּת הָעִיקָּרִית = רוּחָנִית/שִׂכְלִית, לֹא חוֹמְרִית.",
"תה' מ\"א:ב; נד' מ\"א:."
),
seg(2,
"For those who lack understanding in divine service, there is a need for great compassion and mercy — no mercy is greater than this. Two aspects: in general, a person who has no comprehension of how to serve the Creator needs someone who possesses intellect to guide and help him understand. The teacher or spiritual guide who provides this is performing an act of supreme chesed. In particular, a person may have some understanding but still lack the inner experience of emotional attachment — even with intellectual grasp, one may still lack the heart-level integration. For such a person too, great rachamim is needed. The 'happy is he who considers the poor' therefore refers to the tzaddik or teacher who lends his da'at and understanding to others — on the day of his own trouble, God will deliver him as reward.",
"Those lacking understanding in divine service = deepest need for rachamim. Two aspects: (1) person with no comprehension = needs teacher/guide; (2) person with intellect but no heart-integration = still needs rachamim. 'Happy is he who considers' = tzaddik who lends da'at to others. Reward: God delivers him on day of trouble.",
"חַסְרֵי הֲבָנָה בַּעֲבוֹדַת הַבּוֹרֵא = צֹרֶךְ הַגָּדוֹל בְּרַחֲמִים. שְׁנֵי פָּנִים: (א) חֲסַר הֲבָנָה כְּלָל = צָרִיךְ מַדְרִיךְ; (ב) מֵבִין בְּשֵׂכֶל אַךְ לֹא בְּלֵב = עֲדַיִן צָרִיךְ רַחֲמִים. 'מַשְׂכִּיל אֶל דָּל' = צַדִּיק מַשְׁאִיל דַּעְתּוֹ לְאֲחֵרִים. שָׂכָר: ה' יַצִּילֶנּוּ בְּיוֹם רָעָה.",
"תה' מ\"א:ב; נד' מ\"א:."
),
], "Happy Is He Who Considers the Poor — Poverty of Da'at / Mercy for Seekers (2 segs)", "אַשְׁרֵי מַשְׂכִּיל אֶל דָּל — עֲנִיּוּת הַדַּעַת וְהָרַחֲמִים לַמְּבַקְּשִׁים")

# T108: 3 segs — "When you go out to war against your enemies" / yetzer hara / capturing good sparks
torahs[108] = make_data(108, [
seg(1,
"The Torah says: 'When you go out to war against your enemies, and God your God delivers them into your hand, and you take his captives' (Deuteronomy 21:10). The verse is understood here as referring not to literal warfare but to the inner spiritual battle: 'going out to war against your enemies' means engaging with the yetzer hara (evil inclination) — the inner adversary that constantly wars against a person's divine service.",
"Devarim 21:10: 'When you go out to war against your enemies.' Inner spiritual battle = war against the yetzer hara.",
"דב' כ\"א:י: 'כִּי תֵצֵא לַמִּלְחָמָה עַל אֹיְבֶיךָ.' מִלְחָמָה פְּנִימִית = מַאֲבָק עִם יֵצֶר הָרַע.",
"דב' כ\"א:י."
),
seg(2,
"'And God your God delivers them into your hand' — the battle against the yetzer hara is not won by one's own strength alone; it requires divine assistance. God must deliver the enemy into the person's hand. This requires bitachon (trust/faith) and prayer — turning to God for help in the inner battle. The person must not be arrogant in this battle and think he can defeat the yetzer hara through his own willpower; he must humble himself and ask for divine help.",
"'God delivers them into your hand' = divine assistance required for inner battle. Cannot defeat yetzer hara by willpower alone. Requires humility + prayer + bitachon. Must ask God for help.",
"'ה' אֱלֹהֶיךָ נוֹתְנוֹ בְּיָדֶךָ' = עֶזְרָה אֱלֹהִית נְדָרְשֵׁת לַמַּאֲבָק הַפְּנִימִי. אֵין לָנַצֵּחַ יֵצֶר הָרַע בְּכֹחַ עַצְמוֹ. צָרִיךְ עֲנָוָה + תְּפִלָּה + בִּטָּחוֹן.",
"דב' כ\"א:י."
),
seg(3,
"'And you take his captives' — when a person, with divine help, overcomes the yetzer hara, he does not simply destroy it but takes it captive. This is a key mystical point: within every evil impulse and temptation there are trapped holy sparks — nitzotzot — that fell into the kelipot at the time of sheviras hakeilim (the breaking of the vessels). When the person overcomes the yetzer hara, he frees and elevates these sparks. The 'captive woman' of the verse (the remainder of the passage in Deuteronomy 21 discusses a captive woman taken in war) symbolizes the holy sparks trapped within the forces of evil, which are liberated through the person's spiritual victory.",
"'You take his captives' = overcome yetzer hara → don't destroy it, take it captive. Within every evil impulse = trapped holy sparks (nitzotzot) from sheviras hakeilim. Overcoming yetzer hara = freeing + elevating sparks. 'Captive woman' in verse = holy sparks trapped in kelipot, liberated by spiritual victory.",
"'וְשָׁבִיתָ שִׁבְיוֹ' = מְנַצֵּחַ יֵצֶר הָרַע → לֹא מַשְׁמִידוֹ, אֶלָּא שׁוֹבֶה אוֹתוֹ. בְּכָל יֵצֶר הָרַע = נִיצוֹצוֹת קְדוֹשִׁים מִשְּׁבִירַת הַכֵּלִים. נִצָּחוֹן = שְׁחָרוּר וַעֲלִיַּת נִיצוֹצוֹת. 'אֵשֶׁת יְפַת תֹּאַר' = נִיצוֹצוֹת בַּקְּלִיפּוֹת.",
"דב' כ\"א:י; שְּׁבִירַת הַכֵּלִים."
),
], "Going Out to War — Yetzer Hara Battle / Nitzotzot in the Captive (3 segs)", "כִּי תֵצֵא לַמִּלְחָמָה — מַאֲבָק הַיֵּצֶר וְנִיצוֹצוֹת בַּשְּׁבִי")

# T109: 3 segs — "Sacrifices of God are a broken spirit" / olah atones for thoughts / humility = no one can move you
torahs[109] = make_data(109, [
seg(1,
"Opening verse: 'The sacrifices of God are a broken spirit; a broken and contrite heart, O God, You will not despise' (Psalms 51:19). It is known that the elevation offering (olah) atones for sins of thought — as the verse says 'What comes up in your spirit' (Ezekiel 20:32), and as explained in Midrash Vayikra Rabbah 7: the olah corresponds to inner thoughts. Specifically, the olah atones for thoughts that originate in a person's heart — the stray thoughts, the improper desires entertained even momentarily, the spiritual fantasies that arise and were not acted upon but were nonetheless savored inwardly.",
"Teh 51:19: 'sacrifices of God = broken spirit.' Olah atones for sins of thought (Yech 20:32; VR 7). Olah = for inner thoughts/desires not acted upon but inwardly entertained.",
"תה' נ\"א:יט: 'זִבְחֵי אֱלֹהִים רוּחַ נִשְׁבָּרָה.' עוֹלָה מְכַפֶּרֶת עַל הִרְהוּרֵי הַלֵּב (יְחֶז' כ:לב; וי' רבה ז). עוֹלָה = לְמַחְשָׁבוֹת פְּנִימִיּוֹת שֶׁלֹּא בָּאוּ לְמַעֲשֶׂה אַךְ נֶהֱנוּ בְּתוֹכָם.",
"תה' נ\"א:יט; יְחֶז' כ:לב; ויק' רבה ז."
),
seg(2,
"But what is the 'sacrifice' that atones for such thoughts when one cannot bring a literal olah? The verse answers: the 'sacrifice of God' is 'a broken spirit.' The person who genuinely feels broken and contrite over his inner failings — who does not justify his improper thoughts but mourns them — this spiritual brokenness is itself the equivalent of an olah offering. The Shechinah accepts this inner sacrifice. The broken spirit is not weakness — it is the highest form of atonement, because it represents a person confronting his inner reality without defensive justification.",
"'Sacrifice of God = broken spirit.' When can't bring literal olah, the equivalent = genuine inner brokenness/contrition over improper thoughts. Not weakness — highest atonement. Shechinah accepts inner sacrifice. Broken spirit = confronting inner reality without defense.",
"'זִבְחֵי אֱלֹהִים' = רוּחַ נִשְׁבָּרָה. כְּשֶׁאֵין עוֹלָה מַמָּשִׁית, שֶׁקּוּלָהּ = שְׁבִירָה פְּנִימִית אֲמִתִּית עַל הִרְהוּרִים רָעִים. לֹא חֻלְשָׁה — כַּפָּרָה הַגְּבוֹהָה. שְׁכִינָה מְקַבֶּלֶת קָרְבָּן פְּנִימִי.",
"תה' נ\"א:יט."
),
seg(3,
"The deeper dimension: true humility (anavah) and a broken spirit create a paradoxical strength. The teaching says: 'Someone who is genuinely humble is considered as nothing and is not bound by his position. Therefore, no one can force him out of it.' This is the meaning of 'Let each man remain under himself; let no man go out of his place' — through humility and lowliness, a person is unmovable because he has no ego-position to defend. He is already 'under himself' — already as low as can be — so no external force can push him lower or displace him. The broken spirit thus becomes a kind of spiritual invulnerability.",
"Deeper: genuine humility = considered as nothing = not bound by position → no one can move you. 'Let each man remain under himself; let no man go out of his place' (Shemot 16:29) = through humility, unmovable. Already as low as can be → nothing to displace. Broken spirit = spiritual invulnerability.",
"עֹמֶק: עֲנָוָה אֲמִתִּית = נֶחְשָׁב לְאַיִן = אֵינוֹ קָשׁוּר לְמְעַמְדוֹ → אֵין מַפִּיל אוֹתוֹ. 'שְׁבוּ אִישׁ תַּחְתָּיו; אַל יֵצֵא אִישׁ מִמְּקוֹמוֹ' (שְׁמ' ט\"ז:כט) = בַּעֲנָוָה, בִּלְתִּי נָמוֹט. כְּבָר בְּתַחְתִּית → אֵין מָקוֹם לְהַפִּילוֹ. רוּחַ נִשְׁבָּרָה = אֵין פְּגִיעָה רוּחָנִית.",
"תה' נ\"א:יט; שְׁמ' ט\"ז:כט."
),
], "Sacrifices of God — Broken Spirit / Humility as Invulnerability (3 segs)", "זִבְחֵי אֱלֹהִים רוּחַ נִשְׁבָּרָה — עֲנָוָה כְּבִלְתִּי נִגְּפָה")

# T110: 1 seg — Torah shall not depart from mouth / spiritual pure can fully grasp Torah
torahs[110] = make_data(110, [
seg(1,
"Opening verse: 'This Book of the Torah shall not depart from your mouth; rather, meditate in it day and night' (Joshua 1:8). The Torah is entirely spiritual — it is not merely a book of laws and stories but a wholly divine, spiritual reality. Therefore, a person whose actions and intellect are pure and refined — who has cultivated genuine spiritual purity — can fully grasp the Torah and retain it completely. The Torah finds a home in such a person because the vessel matches the content: the spiritually pure person becomes a fitting receptacle for the entirely spiritual Torah. But when a person's actions and mind are coarse or spiritually clouded, the Torah cannot fully rest within him — it flows through without taking hold. The obligation to meditate in Torah day and night is therefore not merely a legal obligation but a call to become the kind of person whose very nature is aligned with Torah's spiritual nature.",
"Yeh 1:8: 'Torah shall not depart from your mouth — meditate day and night.' Torah = entirely spiritual. Person with pure actions + refined intellect = fully grasps + retains Torah. Pure person = fitting vessel for spiritual Torah. Coarse person = Torah flows through without holding. Day/night meditation = call to become spiritually aligned.",
"יה' א:ח: 'לֹא יָמוּשׁ סֵפֶר הַתּוֹרָה הַזֶּה מִפִּיךָ — וְהָגִיתָ בּוֹ יוֹמָם וָלַיְלָה.' תּוֹרָה = שְׁלֵמוּת רוּחָנִית. אָדָם טָהוֹר בְּמַעֲשָׂיו וּבְשִׂכְלוֹ = תּוֹפֵשׂ וְשׁוֹמֵר תּוֹרָה שְׁלֵמָה. כְּלִי טָהוֹר = תּוֹרָה שׁוֹכֶנֶת. גַּס-לֵב = תּוֹרָה זוֹרֶמֶת בְּלִי לְהַחֲזִיק.",
"יה' א:ח."
),
], "Torah Shall Not Depart — Pure Vessel Fully Grasps Torah (1 seg)", "לֹא יָמוּשׁ סֵפֶר הַתּוֹרָה — כְּלִי טָהוֹר תּוֹפֵשׂ תּוֹרָה שְׁלֵמָה")

# T111: 1 seg — initial letters of "Rosh Bnei Yisroel" spell Rabbi / wicked silenced in darkness
torahs[111] = make_data(111, [
seg(1,
"The teaching finds an allusion in the verse: 'Heads (rosh) of the children of Israel' (Exodus 30:12 — 'ki tissa et rosh bnei Yisroel') — the initial letters Resh-Bet-Yud spell 'Rabbi' (Rebbi). This alludes to spiritual leadership and elevated status: the head of Israel, the true leader, is the one who carries the title and quality of 'Rabbi' — teacher, guide, one who illuminates others. In contrast, the verse 'The wicked shall be silenced in darkness' (1 Samuel 2:9 — from Chana's prayer) teaches the opposite: those who are wicked, who do not carry the light of Torah leadership, will be swallowed in spiritual darkness. The contrast is stark: the rosh/Rabbi = light and leadership; the wicked = silence and darkness. This teaches that genuine spiritual leadership is the light that saves Israel from darkness.",
"Shemot 30:12: 'rosh bnei Yisroel' — initials Resh-Bet-Yud = 'Rabbi.' Rabbi = spiritual leader, teacher, one who illuminates. Opposite: 'wicked silenced in darkness' (Shmuel 1 2:9 — Chana's prayer). Rosh/Rabbi = light + leadership; wicked = darkness + silence. Genuine Torah leadership = light that saves Israel.",
"שְׁמ' ל:יב: 'רֹאשׁ בְּנֵי יִשְׂרָאֵל' — רָאשֵׁי תֵבוֹת ר-ב-י = 'רַבִּי.' רַבִּי = מַנְהִיג רוּחָנִי, מוֹרֶה, מֵאִיר לַאֲחֵרִים. הֵפֶךְ: 'רְשָׁעִים בַּחֹשֶׁךְ יִדָּמּוּ' (שמ\"א ב:ט — תְּפִלַּת חַנָּה). רֹאשׁ/רַבִּי = אוֹר + הַנְהָגָה; רְשָׁעִים = חֹשֶׁךְ + דּוּמִיָּה. הַנְהָגַת תּוֹרָה אֲמִתִּית = אוֹר הַמַּצִּיל יִשְׂרָאֵל.",
"שְׁמ' ל:יב; שמ\"א ב:ט."
),
], "Initial Letters Spell Rabbi — Torah Leadership vs Darkness (1 seg)", "רָאשֵׁי תֵבוֹת 'רַבִּי' — הַנְהָגַת הַתּוֹרָה מוּל הַחֹשֶׁךְ")

# Write all + register + batch commit
git_files = ['src/data/lm-commentaries.json']
lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)

for n, data in torahs.items():
    out = os.path.join(pnc_dir, f'torah-{n}.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(out, encoding='utf-8') as f:
        chk = json.load(f)
    nseg = len(chk['segments'])
    avg = sum(len(s['beginner']['en']) for s in chk['segments']) / nseg
    print(f'T{n}: {nseg} segs, avg {avg:.0f} chars')
    sn = str(n)
    if sn not in cdata['1']:
        cdata['1'][sn] = {}
    label = data['title'].replace(f'T{n} PNC - ', '')
    cdata['1'][sn]['running_commentary'] = {
        "book": pnc_name, "slug": pnc_name, "status": "available",
        "url": f"/reader/{pnc_name}/torah-{n}.json",
        "layers": ["beginner", "intermediate", "scholarly"],
        "author": "Petten Nanach",
        "label": f"Petten Nanach Running Commentary - T{n} ({label})"
    }
    git_files.append(f'public/reader/{pnc_name}/torah-{n}.json')

with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print('lm-commentaries.json updated for T97-T111')

subprocess.run(['git', 'add'] + git_files, cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T97-T111 PNC -- Eldad-Medad/shefa/devekus/tzaddikim-temperaments/Torah-rachamim/yetzer-battle/broken-spirit (29 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:250])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
