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

# T172: all deficiencies come from person himself / light flows / evil deeds = shadow blocking light
torahs[172] = make_data(172, [
seg(1,
"All the deficiencies a person has — whether in children, livelihood, or health — come from the person himself. The light of God continuously flows upon every person without interruption; it is not God who withholds blessing. However, through his own evil deeds, a person creates a 'shadow' over himself that blocks the divine light from reaching him. The deficiency is never in the source (God's light always flows fully), but in the receiver: the person's sins and failings create a barrier, a shadow, that intercepts the light before it can reach him. The practical teaching: when something is lacking in one's life, do not look to external causes or blame others. Look inward. The shadow that is blocking the divine flow is your own — and therefore the remedy is also in your own hands: remove the shadow through teshuvah, and the light that was always flowing will reach you.",
"All deficiencies (children, livelihood, health) come from the person himself. God's light flows continuously without interruption. Through evil deeds, person creates 'shadow' blocking divine light. Deficiency never in source (light always flows); always in receiver (shadow = person's sins). Teaching: look inward when something is lacking. Shadow = your own → remedy also in your hands. Remove shadow through teshuvah → light reaches you.",
"כָּל הַחֶסְרוֹנוֹת (בָּנִים, פַּרְנָסָה, בְּרִיאוּת) בָּאִים מֵהָאָדָם עַצְמוֹ. אוֹר ה' זוֹרֵם תָּמִיד בְּלִי הֶפְסֵק. דֶּרֶךְ מַעֲשִׂים רָעִים, הָאָדָם יוֹצֵר 'צֵל' הַחּוֹסֵם הָאוֹר. חֶסְרוֹן לֹא נִמְצָא בְּמָקוֹר (אוֹר תָּמִיד זוֹרֵם); תָּמִיד בַּמְּקַבֵּל (צֵל = חֲטָאָיו). לִמּוּד: כְּשֶׁמַּשֶּׁהוּ חָסֵר — הַסְתֵּכֵּל פְּנִימָה. הַצֵּל שֶׁלְּךָ → הַתִּקּוּן שֶׁלְּךָ. הָסֵר צֵל בִּתְשׁוּבָה → הָאוֹר מַגִּיעַ.",
""
),
], "All Deficiencies Come From Person Himself — Shadow Blocks Divine Light (1 seg)", "כָּל הַחֶסְרוֹנוֹת מֵהָאָדָם עַצְמוֹ — צֵל הַחּוֹסֵם אֶת הָאוֹר הָאֱלֹהִי")

# T173: through writing, tzaddik recognizes soul / root of faith / world of faith
torahs[173] = make_data(173, [
seg(1,
"Through writing, the true tzaddik can recognize the soul of the writer and the soul's inner dimension — and also the writer's faith and the root of his faith. This is because faith itself possesses vitality and a root: there exists a 'world of faith' (olam ha'emunah) from which a person's faith flows and in which it is rooted. When a person writes, especially when writing honestly and from the heart, the spiritual fingerprint of his soul's connection to this world of faith is expressed in the writing. The true tzaddik, who has access to these deeper dimensions, can read that fingerprint. This is one reason why correspondence with the tzaddik is spiritually significant: the letter is not merely text but a spiritual self-revelation. The tzaddik's ability to read the soul through writing is an extension of his capacity to 'know souls' (yediat nefashot) — the prophetic-level perception of the inner spiritual reality of others.",
"Through writing, true tzaddik recognizes the soul and inner dimension of the writer + his faith and root of faith. Faith = has vitality + root = 'world of faith.' When writing from heart = spiritual fingerprint of soul's faith-connection expressed. Tzaddik can read this fingerprint. Correspondence with tzaddik = spiritual self-revelation. Tzaddik's reading writing = extension of yediat nefashot (knowing souls).",
"דֶּרֶךְ כְּתִיבָה, צַדִּיק אֲמִתִּי מַכִּיר נֶפֶשׁ הַכּוֹתֵב + פְּנִימִיּוּתָהּ + אֱמוּנָתוֹ וְשֹׁרֶשׁ אֱמוּנָתוֹ. אֱמוּנָה = יֵשׁ לָהּ חַיּוּת + שֹׁרֶשׁ = 'עוֹלָם הָאֱמוּנָה.' כְּשֶׁכּוֹתֵב מֵהַלֵּב = טֶבַע-אֶצְבַּע רוּחָנִי שֶׁל חֶבְרַת נֶפֶשׁ-אֱמוּנָה נִבְטָא. הַצַּדִּיק קוֹרֵא הַחוֹתָם הַזֶּה. מַכְתָּב לַצַּדִּיק = גִּלּוּי עַצְמִי רוּחָנִי. קְרִיאַת הַצַּדִּיק = הַרְחָבַת יְדִיעַת נְפָשׁוֹת.",
""
),
], "Through Writing Tzaddik Recognizes Soul — Root of Faith / World of Emunah (1 seg)", "דֶּרֶךְ כְּתִיבָה הַצַּדִּיק מַכִּיר הַנֶּפֶשׁ — שֹׁרֶשׁ הָאֱמוּנָה")

# T174: when judgments overpower person / do not mention name in prayer / Zohar Noach 69a
torahs[174] = make_data(174, [
seg(1,
"When the forces of judgment (dinim) overpower a person — God forbid — one should not mention that person's name explicitly in prayer. This is in order not to give additional strength to the judgments. As stated in the Zohar (Noach 69a): mentioning the name of a person who is under heavy judgment in prayer can have the paradoxical effect of strengthening the very judgments against him, because the spiritual forces of judgment immediately activate and sharpen around the name when it is spoken. Instead, one should pray in a more indirect way — describing the person without naming them, or praying in general terms for 'all who need healing' or 'all who need rescue,' so that the person is included in the prayer without the name serving as a specific target for the judging forces. This is a precise and careful spiritual practice, reflecting the awareness that prayer operates in a real spiritual environment with real forces that respond to names.",
"When dinim overpower a person: do not mention his name in prayer explicitly. Not to strengthen the judgments against him. Zohar Noach 69a: mentioning name under heavy judgment → judging forces activate around the name. Instead: pray indirectly (describe without naming, or pray for 'all who need'). Person included without name as specific target. Prayer operates in real spiritual environment where names are spiritually significant.",
"כְּשֶׁדִּינִים מִתְגַּבְּרִים עַל אָדָם: אַל תַּזְכִּיר שְׁמוֹ בְּתְּפִלָּה מְפֹרָשׁ. כְּדֵי לֹא לַחְזֵּק הַדִּינִים. זֹהַר נֹחַ ס\"ט:: הַזְכָּרַת שֵׁם תַּחַת דִּין כָּבֵד → כֹּחוֹת הַדִּין מִתְגַּבְּרִים סְבִיב הַשֵּׁם. חֵלֶף: הִתְפַּלֵּל בְּעֶקֶף (תֵּאָרֵהוּ בְּלִי שֵׁם, אוֹ הִתְפַּלֵּל לְ'כָּל הַצְּרִיכִים'). כָּלוּל בְּלִי שֵׁם כִּמְטָרָה מְיֻחֶדֶת. תְּפִלָּה = פּוֹעֶלֶת בִּסְבִיבָה רוּחָנִית אֲמִתִּית הֵיכָן שֵׁמוֹת מַשְׁמֻעוּתִיִּים.",
"זֹהַר נֹחַ ס\"ט:."
),
], "Judgments Overpower — Don't Mention Name in Prayer / Indirect Prayer (1 seg)", "כְּשֶׁדִּינִים מִתְגַּבְּרִים — אַל תַּזְכִּיר שֵׁם בַּתְּפִלָּה / תְּפִלָּה עֲקִיפָה")

# T175: highest level of crying = when stems from joy / remorse from joy
torahs[175] = make_data(175, [
seg(1,
"The highest level of crying is when it arises from joy — from an overflow of gladness that becomes so full it spills over into tears. Even remorse and regret are best when they emerge from joy: when, from great joy in God and love of God, a person regrets and longs over having rebelled and strayed in earlier days. This joy-born regret is not depression or self-punishment — it is the opposite. The person is so full of joy and closeness to God that the contrast between this holy state and his past distance causes a natural, healing weeping. This type of crying is transformative: it deepens the joy and purifies the soul simultaneously. The person who cries from joy is not diminished by the tears; he is elevated. Contrast this with crying from sadness or despair, which drains the spirit. The teaching: cultivate the joy first, and let the healthy contrition arise naturally from the fullness of that joy.",
"Highest level of crying = when arises from joy. Remorse best when emerges from joy: from great joy in God, person regrets past rebellion. Joy-born regret ≠ depression. Joy so full that contrast with past distance = natural healing tears. Joy-crying = deepens joy + purifies simultaneously. Not diminished by tears — elevated. Contrast: crying from sadness = drains. Teaching: cultivate joy first; let healthy contrition arise naturally from joy's fullness.",
"הַדַּרְגָּה הַגְּבוֹהָה שֶׁל בְּכִיָּה = כְּשֶׁבָּאָה מִשִּׂמְחָה. חֲרָטָה הַטּוֹבָה = כְּשֶׁבָּאָה מִשִּׂמְחָה: מִשִּׂמְחָה גְּדוֹלָה בַּה', מִתְחָרֵט עַל מֶרֶד בְּעָבָר. חֲרָטָה מִשִּׂמְחָה ≠ עַצְבוּת. שִׂמְחָה מְלֵאָה כָּל כָּךְ שֶׁהַנִּגּוּד עִם עָבָר = דְּמָעוֹת מְרַפְּאוֹת טִבְעִיּוֹת. בְּכִיַּת שִׂמְחָה = מַעֲמִיקָה הַשִּׂמְחָה + מְטַהֶרֶת. לֹא מְמַעֵט — מְרוֹמֵם. לֵמּוּד: טַפֵּחַ שִׂמְחָה תְּחִלָּה; הַחֲרָטָה הַבְּרִיאָה תָּבוֹא מֵאֵלֶיהָ.",
""
),
], "Highest Crying Stems From Joy — Joy-Born Regret Heals and Elevates (1 seg)", "הַבְּכִיָּה הַגְּבוֹהָה מִשִּׂמְחָה — חֲרָטָה מִשִּׂמְחָה מְרַפְּאָה וּמְרוֹמֶמֶת")

# T176: must hurry to expel ruach shtut / through attaching to tzaddik through soul-level love
torahs[176] = make_data(176, [
seg(1,
"A person must act swiftly to expel the spirit of folly (ruach shtut) that fills his heart and clings to him. The ruach shtut is not merely foolishness in the intellectual sense — it is a spiritual force of confusion and misorientation that makes the person unable to see things clearly, unable to distinguish between what truly matters and what is trivial. It fills the heart with noise and makes clear perception impossible. The way to expel it: attach oneself to the true tzaddik through soul-level love (ahavat nefesh). This love is not merely admiration or respect — it is a deep, essential attachment, a bonding of one's soul to the tzaddik's soul, such that the tzaddik's clarity begins to flow into the attached person and displace the ruach shtut. The urgency ('must hurry greatly') reflects the fact that the ruach shtut actively works against clarity — the longer it remains, the more entrenched it becomes. Do not delay in seeking this attachment.",
"Must hurry to expel ruach shtut (spirit of folly). Ruach shtut = spiritual force of confusion/misorientation, not just intellectual foolishness. Fills heart with noise, makes clear perception impossible. How to expel: attach to true tzaddik through ahavat nefesh (soul-level love). Not admiration — deep soul-bonding. Tzaddik's clarity flows into attached person, displaces ruach shtut. Urgency: ruach shtut entrenches if left. Don't delay.",
"צָרִיךְ לְמַהֵר מְאֹד לְגָרֵשׁ רוּחַ שְׁטוּת מִקִּרְבּוֹ. רוּחַ שְׁטוּת = כֹּחַ בִּלְבּוּל/הַכְנָסַת הֵסָח רוּחָנִי, לֹא רַק אִוֶּלֶת שִׂכְלִית. מְמַלֵּא הַלֵּב בְּרַעַשׁ, הַשְׁחָתַת תְּפִיסָה בְּרוּרָה. כֵּיצַד לְגָרֵשׁ: לְהִדָּבֵק לַצַּדִּיק הָאֲמִתִּי דֶּרֶךְ אַהֲבַת נֶפֶשׁ. לֹא הַעֲרָצָה — קִשּׁוּר נֶפֶשׁ עָמֹק. בְּהִירוּת הַצַּדִּיק זוֹרֶמֶת לַמִּתְקָרֵב, מְסַלֶּקֶת רוּחַ שְׁטוּת. דְּחִיפוּת: רוּחַ שְׁטוּת מִתְחַזֵּק אִם נִשְׁאָר. אַל תְּאַחֵר.",
""
),
], "Hurry to Expel Ruach Shtut — Through Soul-Level Love for Tzaddik (1 seg)", "מַהֵר לְגָרֵשׁ רוּחַ שְׁטוּת — דֶּרֶךְ אַהֲבַת נֶפֶשׁ לַצַּדִּיק")

# T177: "I have forgiven according to your word" (Bamidbar 14:20) / initials = "my cup" / davar = Dishanta
torahs[177] = make_data(177, [
seg(1,
"Opening verse: 'And God said: I have forgiven according to your word' (Numbers 14:20 — God's response to Moses's prayer for Israel after the sin of the spies). The initial letters of 'salachti kidvarecha' (I have forgiven according to your word) spell the word 'kosi' (my cup). Furthermore, the word 'davar' (your word) is itself an acronym for 'Dishanta B'shemen Roshi' — 'You have anointed my head with oil' (Psalms 23:5). The cup (kosi) is the cup of blessing — the cup held at Kiddush and havdalah, which is filled to overflowing with divine blessing. The connection: Moses's word of prayer was so complete and full that God's forgiveness came overflowing like a full cup. And the anointing with oil (the davar that Moses spoke) = the full spiritual preparation that makes one a vessel for divine favor. The teaching: prayer that is spoken with the full quality of 'davar' — substantive, weighty, complete — draws down forgiveness that overflows like a full cup.",
"Bamidbar 14:20: 'salachti kidvarecha' (I have forgiven according to your word). Initials = 'kosi' (my cup). 'Davar' (word) = acronym for 'Dishanta B'shemen Roshi' (Teh 23:5: 'You anointed my head with oil'). Kosi = cup of blessing overflowing with divine favor. Davar/anointing = full spiritual preparation. Teaching: weighty, complete prayer (davar) draws forgiveness that overflows like full cup.",
"בַּמ' י\"ד:כ: 'סָלַחְתִּי כִּדְבָרֶךָ.' ר\"ת 'סָלַחְתִּי כִּדְבָרֶךָ' = 'כּוֹסִי.' 'דָּבָר' = נוֹטָרִיקוֹן 'דִּשַּׁנְתָּ בַשֶּׁמֶן רֹאשִׁי' (תה' כ\"ג:ה). כּוֹסִי = כּוֹס הַבְּרָכָה הַשּׁוֹפֵעַ. דָּבָר/מְשִׁיחָה = הֲכָנָה רוּחָנִית שְׁלֵמָה. לִמּוּד: תְּפִלָּה כְּ'דָבָר' — מַשְׁמֻעוּתִי, כָּבֵד, שָׁלֵם — מוֹשֵׁךְ מְחִילָה שׁוֹפֶעַת כְּכוֹס מָלֵא.",
"בַּמ' י\"ד:כ; תה' כ\"ג:ה."
),
], "I Have Forgiven According to Your Word — Initials Spell My Cup / Overflowing Forgiveness (1 seg)", "סָלַחְתִּי כִּדְבָרֶךָ — רָאשֵׁי תֵבוֹת כּוֹסִי / מְחִילָה שׁוֹפַעַת")

# T178: must have vidui devarim (verbal confession) / articulate sin in detail each time
torahs[178] = make_data(178, [
seg(1,
"Know that one needs precisely vidui devarim — confession in words. It is not sufficient to feel remorse internally or to acknowledge sin mentally; one must articulate the sin in words, confessing it verbally each time, for every individual deed. There are many obstacles to this: some people feel ashamed to speak the words, others feel that internal acknowledgment is sufficient, and others cannot bear to hear themselves say the specific sin aloud. But the teaching is clear: the verbalization itself is the act of teshuvah. Just as the mouth is the channel through which speech enters the world and has real effects, so too the spoken confession has a specific spiritual effect that inner acknowledgment alone cannot produce. Every unspoken confession is an incomplete teshuvah. The word spoken in confession activates the spiritual mechanism of forgiveness in a way that thought alone cannot.",
"Must have vidui devarim = verbal confession. Not sufficient to feel remorse internally. Must articulate each sin in words, each time, for every individual deed. Obstacles: shame, feeling internal acknowledgment sufficient, cannot bear hearing sin aloud. But verbalization itself = act of teshuvah. Mouth is channel of real effects. Spoken confession = activates forgiveness that thought alone cannot. Unspoken confession = incomplete teshuvah.",
"צָרִיךְ דַּוְקָא וִדּוּי דְּבָרִים — וִדּוּי בְּמִלִּים. לֹא מַסְפִּיק הַרְגָּשַׁת חֲרָטָה פְּנִימִית. חַיָּב לְבָטֵא כָּל חֵטְא בְּמִלִּים, בְּכָל פַּעַם, לְכָל מַעֲשֶׂה בְּנִפְרָד. מְכְשׁוֹלִים: בּוּשָׁה, הֶרְגָּשָׁה שֶׁמַסְפִּיק פְּנִימִי, אֵי-יְכוֹלֶת לִשְׁמֹעַ עַצְמוֹ. אֲבָל הַבִּיטּוּי עַצְמוֹ = מַעֲשֵׂה הַתְּשׁוּבָה. הַפֶּה = צִנּוֹר הַשּׁוֹפֵעַ לָעוֹלָם. וִדּוּי מְדֻבָּר = מֵפְעִיל מְנִּגְנוֹן מְחִילָה. וִדּוּי שֶׁלֹּא נֶאֱמַר = תְּשׁוּבָה לֹא שְׁלֵמָה.",
""
),
], "Need Precisely Verbal Confession — Verbalization Is the Act of Teshuvah (1 seg)", "צָרִיךְ דַּוְקָא וִדּוּי דְּבָרִים — הַבִּיטּוּי הוּא מַעֲשֵׂה הַתְּשׁוּבָה")

# T179: 2 segs — against all kinds of controversy / shefa descends / mitzvot vitalize the day
torahs[179] = make_data(179, [
seg(1,
"Know that against all kinds of controversy — whether in the physical/material realm or in the spiritual realm — where one finds it impossible to pray or to carry out what is necessary in divine service, all of these difficulties fall under this principle. When controversy and obstruction surround a person and cut off his access to prayer and service, the antidote is to recognize that the very controversy is a spiritual test and opportunity. The person must not abandon his divine service because of the controversy; rather, he must intensify his effort to connect despite the obstacle, knowing that God is accessible even within the controversy.",
"Against all controversy (material or spiritual) where impossible to pray or serve God — all fall under this principle. Controversy = spiritual test and opportunity. Must not abandon service because of controversy. Intensify effort to connect despite obstacle. God accessible even within controversy.",
"נֶגֶד כָּל מִינֵי מַחֲלֹקֶת — בְּגַשְׁמִיּוּת אוֹ רוּחָנִיּוּת — שֶׁאִי-אֶפְשָׁר לְהִתְפַּלֵּל אוֹ לַעֲשׂוֹת הַנָּצְרָךְ בַּעֲבוֹדַת ה', כֻּלָּם בָּאִים תַּחַת עִקָּרוֹן זֶה. מַחֲלֹקֶת = מִבְחָן וְהִזְדַּמְּנוּת רוּחָנִית. אַל תֶּעֱזֹב עֲבוֹדָה בְּגִין מַחֲלֹקֶת. הַגְבֵּר מְאַמָּצִים לְהִתְקַשֵּׁר אַף עִם הַמַּפְרִיעַ. ה' נָגִישׁ אַף בְּתוֹךְ הַמַּחֲלֹקֶת.",
""
),
seg(2,
"The divine abundance (shefa) flows from above each day. When one performs mitzvot and good deeds on a given day, that day is vitalized and draws down abundant shefa. But if, God forbid, one does not perform mitzvot that day, the shefa descends in severe constriction — only enough to sustain the most basic physical life, without spiritual enrichment. And if one commits sins, the shefa is reduced even further — or flows in distorted form. The teaching: each day is a unique spiritual opportunity to activate and receive the shefa of that day. Mitzvot performed on this day specifically draw down this day's shefa. No other day can retroactively redeem the shefa of today. Therefore, each day matters fully and completely on its own.",
"Shefa flows from above each day. Mitzvot and good deeds on a given day = vitalize that day + draw abundant shefa. Not doing mitzvot = shefa descends in severe constriction (only basic life). Sinning = shefa reduced further or distorted. Teaching: each day = unique spiritual opportunity to activate today's shefa. Mitzvot today draw today's shefa. No other day redeems today's. Each day matters fully.",
"שֶׁפַע זוֹרֵם מִלְּמַעְלָה בְּכָל יוֹם. מִצְווֹת וּמַעֲשִׂים טוֹבִים בְּיוֹם מְסֻיָּם = מְחַיִּים אֶת הַיּוֹם + מוֹשְׁכִים שֶׁפַע רַב. אֵי-עֲשִׂיַּת מִצְווֹת = שֶׁפַע בְּצִמְצוּם חָמוּר (רַק חַיֵּי בְּסִיסִי). חֵטְא = שֶׁפַע מְצוּמְצָם/מְעֻוָּת. לִמּוּד: כָּל יוֹם = הִזְדַּמְּנוּת יְחִידָה לְהַפְעִיל שֶׁפַע הַיּוֹם. מִצְווֹת הַיּוֹם מוֹשְׁכוֹת שֶׁפַע הַיּוֹם. שׁוּם יוֹם אַחֵר לֹא פּוֹדֶה הַיּוֹם. כָּל יוֹם מְלֵא וְשָׁלֵם בִּפְנֵי עַצְמוֹ.",
""
),
], "Against All Controversy — Shefa Flows / Each Day's Mitzvot Draw Today's Blessing (2 segs)", "נֶגֶד כָּל מַחֲלֹקֶת — הַשֶּׁפַע זוֹרֵם / מִצְווֹת הַיּוֹם מוֹשְׁכוֹת שֶׁפַע הַיּוֹם")

# T180: segulah of redemption / money = aspect of judgments (Pesachim 119a) / pidyon (redemption)
torahs[180] = make_data(180, [
seg(1,
"Money represents an aspect of judgments (dinim) — as the Talmud (Pesachim 119a) notes: 'All that stand on their feet' refers to a person's money, which enables him to stand on his feet. Money therefore embodies the judgments that are bound to material existence. The spiritual remedy (segulah) of pidyon (redemption) — specifically the pidyon offering given to the tzaddik — works by using money (the material of judgments) as the vehicle for sweetening and releasing those very judgments. When a person gives money to the tzaddik as a pidyon, the money carries his spiritual DNA and life-energy. The tzaddik then works with this 'material of judgment' to sweeten it and redirect it from strict judgment to mercy. This is why the pidyon has been a practice since ancient times — it is not charity but a spiritual transaction that uses the currency of the material world to repair the spiritual world.",
"Money = aspect of judgments. Pesachim 119a: 'all that stand on their feet' = person's money = enables standing. Money embodies judgments of material existence. Segulah of pidyon (redemption to tzaddik): uses money (material of judgment) as vehicle to sweeten and release judgments. Person gives pidyon = money carries his spiritual DNA. Tzaddik sweetens 'material of judgment' → redirects to mercy. Pidyon = spiritual transaction, not charity.",
"כֶּסֶף = בְּחִינַת דִּינִים. פסח' קי\"ט:: 'כָּל הָעוֹמְדִים עַל רַגְלֵיהֶם' = כֶּסֶף הָאָדָם הַמַּעֲמִידוֹ. כֶּסֶף = דִּינֵי הַקִּיּוּם הַחוֹמְרִי. סְגוּלַּת הַפִּדְיוֹן: מְשַׁמֶּשֶׁת כֶּסֶף (חוֹמֶר הַדִּין) כְּרֶכֶב לְהַמְתָּקַת הַדִּינִים. אָדָם נוֹתֵן פִּדְיוֹן = כֶּסֶף נוֹשֵׂא טֶבַע-אֶצְבַּע רוּחָנִי שֶׁלּוֹ. הַצַּדִּיק מַמְתִּיק 'חוֹמֶר הַדִּין' → מַפְנֶה לְרַחֲמִים. פִּדְיוֹן = עִסְקָה רוּחָנִית, לֹא צְדָקָה.",
"פסח' קי\"ט:."
),
], "Segulah of Redemption — Money Is Judgments / Pidyon Sweetens Dinim (1 seg)", "סְגוּלַּת הַפִּדְיוֹן — כֶּסֶף בְּחִינַת דִּינִים / פִּדְיוֹן מַמְתִּיק")

# T181: 2 segs — when people bind against one person / honor portions aggregate / Tanchuma Nitzavim: curses uphold
torahs[181] = make_data(181, [
seg(1,
"When individuals form a bond against one person — even if he is more prominent and spiritually greater than they are — they can nevertheless cause his downfall. This happens because their individual portions of honor (kavod) aggregate and combine, nullifying his own portion of kavod. Even though each individual has only a small portion of honor compared to the great person they oppose, the combined force of many small portions can overpower a single large portion. This is a sobering teaching: even the greatest tzaddik or leader is not immune from the combined opposition of many people. Their combined intent, combined kavod-portions, create a force that can affect even someone far above their individual spiritual levels.",
"When group forms bond against one person, even if he is greater/more prominent = can cause his downfall. Because: their individual honor (kavod) portions aggregate + combine = nullify his kavod portion. Combined force of many small portions > single large portion. Even greatest tzaddik not immune from combined opposition of many. Combined intent/kavod-portions = force affecting even those far above them.",
"כְּשֶׁאֲנָשִׁים מִתְקַשְּׁרִים נֶגֶד אָדָם אֶחָד, אַף גָּדוֹל מֵהֶם = יְכוֹלִים לְהַפִּילוֹ. כִּי: חֶלְקֵי כְּבוֹד פְּרָטִיִּים מִצְטָרְפִים + מְבַטְּלִים חֶלֶק כְּבוֹדוֹ. חֹזֶק מְשֻׁלָּב שֶׁל הַרְבֵּה חֲלָקִים קְטַנִּים > חֵלֶק אַחֵד גָּדוֹל. אַף הַצַּדִּיק הַגָּדוֹל לֹא חָסִין מֵהִתְנַגְּדוּת מְשֻׁלֶּבֶת שֶׁל רַבִּים. כַּוָּנָה מְשֻׁלֶּבֶת/חֶלְקֵי כָּבוֹד = כֹּחַ מַשְׁפִּיעַ אַף עַל גְּבוֹהֵי מַדְרֵגָה.",
""
),
seg(2,
"Yet there is a deeper comfort from the Midrash (Tanchuma, Parashat Nitzavim): the verse 'You are standing' appears adjacent to the section of curses — to indicate that the very curses are what uphold you. The apparent negatives, the afflictions and oppositions, ultimately provide stability and elevation. The person who is the target of a group's opposition — if he remains firm, if he does not collapse — is ultimately upheld and sustained by the very curses directed at him. This is the paradox of persecution: the forces meant to destroy end up strengthening. The great tzaddik who faces the combined opposition of many, and who does not break, emerges from the experience not only intact but elevated — because the curses themselves become a foundation for his continued standing.",
"Midrash Tanchuma Nitzavim: 'You are standing' adjacent to curses section = curses themselves uphold you. Apparent negatives/afflictions = provide stability and elevation. Person targeted by group opposition: if remains firm = upheld by the very curses directed at him. Paradox of persecution: forces meant to destroy end up strengthening. Tzaddik who faces combined opposition + doesn't break = elevated, because curses become foundation.",
"מִדְרָשׁ תַּנְחוּמָא נִצָּבִים: 'אַתֶּם נִצָּבִים' סָמוּךְ לַקְּלָלוֹת = הַקְּלָלוֹת עַצְמָן מְקִיּמוֹת אֶתְכֶם. הַשְׁלִילִיּוֹת = מְסַפְּקוֹת יַצִּיבוּת וַעֲלִיָּה. הַמְטֻרָּף עַל יְדֵי קְבוּצָה: אִם עוֹמֵד = נִשְׁמָר דַּוְקָא עַל יְדֵי הַקְּלָלוֹת. פָּרָדוֹקְס הָרְדִיפָה: כֹּחוֹת לְהַשְׁמָדָה מְחַזְּקִים. צַדִּיק שֶׁלֹּא מִתְמוֹטֵט = יוֹצֵא מֻגְבָּהּ — קְלָלוֹת נַעֲשׂוֹת יְסוֹד.",
"מִדְרָשׁ תַּנְחוּמָא נִצָּבִים."
),
], "Bond Against One Person — Aggregated Honor / Curses Uphold You (2 segs)", "קֶשֶׁר נֶגֶד אָדָם אֶחָד — כָּבוֹד מְצֻרָּף / קְלָלוֹת מְקִיּמוֹת")

# T182: during Omer counting, world's conversations revolve around sefirah of that day
torahs[182] = make_data(182, [
seg(1,
"Know that during the days of the Omer counting, all conversations in the world revolve solely around the sefirah (divine attribute) of that particular day. Every conversation that happens anywhere in the world on a given day of the Omer is, at some level, a reflection and expression of the specific sefirah of that day. The first week = chesed; the second = gevurah; etc. One who is perceptive can listen carefully to the conversations around him during the Omer period and recognize this — by attuning his awareness to the spiritual quality of each day's sefirah, he can hear in ordinary conversations the reflection of that sefirah's qualities playing out. This teaches that the Omer period is not merely a counting exercise but a comprehensive spiritual journey through all the sefirotic qualities, in which the entire world participates — even unconsciously — with every conversation.",
"During Omer counting: all world's conversations revolve around the sefirah of that particular day. Every conversation = at some level reflects/expresses that day's sefirah. Perceptive person: by attuning to sefirah-quality, hears ordinary conversations reflecting that sefirah. Omer = not mere counting exercise = comprehensive spiritual journey through sefirotic qualities. Entire world participates even unconsciously.",
"בִּימֵי סְפִירַת הָעֹמֶר: כָּל שִׂיחוֹת הָעוֹלָם סוֹבְבוֹת אֶת הַסְּפִירָה שֶׁל אוֹתוֹ יוֹם בִּלְבַד. כָּל שִׂיחָה = בְּרֶמֶז שֶׁל אֵיכוּת אֲבָל הַסְּפִירָה. בַּעַל תְּפִיסָה: בְּהַתְכַּוְּנוּת לַסְּפִירָה, שׁוֹמֵעַ שִׂיחוֹת רְגִילוֹת מְשַׁקְּפוֹת אוֹתָהּ. הָעֹמֶר = לֹא סְפִירָה בְּלֶבֶד = מַסָּע רוּחָנִי מְקִיף דֶּרֶךְ כָּל הַסְּפִירוֹת. כָּל הָעוֹלָם מְשַׁתֵּף אַף בְּלֹא מוּדַע.",
""
),
], "World's Conversations During Omer Reflect Each Day's Sefirah (1 seg)", "שִׂיחוֹת הָעוֹלָם בְּסְפִירַת הָעֹמֶר מְשַׁקְּפוֹת סְפִירַת אוֹתוֹ יוֹם")

# T183: tzaddikim sit in a circle / their positions in world follow circle-order
torahs[183] = make_data(183, [
seg(1,
"Know that the tzaddikim of the generation sit in a circle — that is, the arrangement of their positions in the world, each in his respective place, follows the order of a circle. Even if other people intervene between them geographically or socially, the underlying spiritual arrangement of the tzaddikim of each generation forms a perfect circle. The significance of the circle: a circle has no beginning and no end, no highest point and no lowest. Every point on the circle is equidistant from the center. This means that the tzaddikim, while appearing different in their levels and roles, are spiritually equal in their relationship to the divine center. The circle also means that each tzaddik's influence and connection extends in a complete arc — each one covers a specific arc of the circle, and together they cover the whole. No single tzaddik covers all; together they form a complete, unbroken ring of holiness surrounding the generation.",
"Tzaddikim of generation sit in a circle. Their positions in world = order of a circle. Even if others intervene between them. Circle significance: no beginning/end, no top/bottom. Every point equidistant from center. Tzaddikim = spiritually equal in relationship to divine center despite appearing different. Each covers specific arc; together = complete unbroken ring. No single tzaddik covers all; together they cover the whole.",
"יֵדַע כִּי צַדִּיקֵי הַדּוֹר יוֹשְׁבִים בְּעִגּוּל. סֵדֶר מַעֲמָדָם בָּעוֹלָם = עִגּוּל. אַף אִם אֲחֵרִים מַפְרִידִים בֵּינֵיהֶם. מַשְׁמָעוּת הָעִגּוּל: אֵין תְּחִלָּה/סוֹף, אֵין עֶלְיוֹן/תַּחְתּוֹן. כָּל נְקוּדָּה שָׁוָה מֵהַמֶּרְכָּז. צַדִּיקִים = שְׁוֵי יַחַס לַמֶּרְכָּז הָאֱלֹהִי. כָּל אֶחָד מְכַסֶּה קֶשֶׁת מְיֻחֶדֶת; יַחַד = טַבַּעַת שְׁלֵמָה. שׁוּם צַדִּיק לֹא מְכַסֶּה הַכֹּל; יַחַד = כִּסּוּי שָׁלֵם.",
""
),
], "Tzaddikim Sit in a Circle — Complete Ring of Holiness / Each Covers One Arc (1 seg)", "צַדִּיקֵי הַדּוֹר יוֹשְׁבִים בְּעִגּוּל — טַבַּעַת שְׁלֵמָה / כָּל אֶחָד מְכַסֶּה קֶשֶׁת")

# T184: speaking with friend in fear of heaven = or yashar and or chozer / sometimes returning light precedes
torahs[184] = make_data(184, [
seg(1,
"When one speaks with his friend in fear of Heaven — having a conversation that is genuinely oriented toward God, toward truth, toward spiritual growth — this generates an or yashar (direct light) and an or chozer (returning light). These are kabbalistic terms for two modes of divine energy flow: the direct light descends from above to below; the returning light ascends from below upward. The conversation in fear of Heaven sets both of these flows in motion. Sometimes the returning light precedes the direct light: the impact and effect of the holy conversation is felt even before the full content of the light descends. The implication: conversations held in genuine fear of Heaven are not merely pleasant exchanges or even learning opportunities — they are spiritually transformative events that generate real flows of divine energy, both descending (or yashar) and ascending (or chozer), and that connect the participants to the divine flow in both directions.",
"Speaking with friend in fear of Heaven = generates or yashar (direct light, descending) and or chozer (returning light, ascending). Sometimes returning light precedes direct light: effect felt before full content descends. Holy conversation = spiritually transformative event generating real divine energy flows in both directions. Not merely learning opportunity — connects participants to divine flow both ways.",
"מְדַבֵּר עִם חֲבֵרוֹ בְּיִרְאַת ה' = מוֹלִיד אוֹר יָשָׁר וְאוֹר חוֹזֵר. לִפְעָמִים הָאוֹר הַחוֹזֵר קוֹדֵם לָאוֹר הַיָּשָׁר: הַהַשְׁפָּעָה נִרְגֶּשֶׁת לִפְנֵי יְרִידַת הַתּוֹכֶן הַמָּלֵא. שִׂיחָה קְדוֹשָׁה = אֵרוּעַ מְשַׁנֶּה רוּחָנִית הַמּוֹלִיד זְרִימוֹת אֱלֹהִיּוֹת אֲמִתִּיּוֹת בִּשְׁתֵּי כִּוּוּנִים. לֹא רַק לִמּוּד — מְקַשֵּׁר מְשַׁתְּפִים לִזְרִימָה אֱלֹהִית בִּשְׁתֵּי כִּוּוּנִים.",
""
),
], "Speaking in Fear of Heaven — Generates Or Yashar and Or Chozer (1 seg)", "דִּבּוּר בְּיִרְאַת ה' — מוֹלִיד אוֹר יָשָׁר וְאוֹר חוֹזֵר")

# T185: main aspect of perfection = fear / Zohar Vayikra 4a / Devarim 10:12
torahs[185] = make_data(185, [
seg(1,
"As stated in the Zohar (Vayikra 4a): 'When Israel perfects their service, it is as if the holy Name is perfected.' The core of perfection is fear (yirah). As it is written: 'What does God your God ask from you but to fear God your God' (Deuteronomy 10:12). All of divine service — all the commandments, all the learning, all the prayer — ultimately reduces to and is grounded in one thing: yirah, the fear and awe of God. Without yirah, all other spiritual achievements are hollow foundations. With yirah, even simple acts become complete divine service. The Zohar's statement that Israel's perfected service perfects the divine Name means: when each individual achieves genuine yirah, this collective achievement 'completes' the Name — draws the divine Presence fully into the world. Yirah is not one mitzvah among many; it is the entire framework within which all mitzvot find their true meaning.",
"Zohar Vayikra 4a: 'When Israel perfects service = as if holy Name perfected.' Core of perfection = yirah. Devarim 10:12: 'What does God ask but to fear Him.' All divine service reduces to and is grounded in yirah. Without yirah = hollow foundations. With yirah = even simple acts = complete service. Israel's perfected service = collective yirah = 'completes' the Name = draws Shechinah fully. Yirah = not one mitzvah — entire framework of all mitzvot.",
"זֹהַר וַיִּקְרָא ד::: 'כְּשֶׁיִּשְׂרָאֵל מְשַׁלְּמִים עֲבוֹדָתָם = כְּאִילּוּ שֵׁם הַקֹּדֶשׁ מִשְׁתַּלֵּם.' עֹמֶק הַשְּׁלֵמוּת = יִרְאָה. דב' י:יב: 'מַה ה' שׁוֹאֵל מֵעִמְּךָ כִּי אִם לְיִרְאָה.' כָּל עֲבוֹדַת ה' = מוּשְׁתֶּתֶת עַל יִרְאָה. בְּלִי יִרְאָה = יְסוֹדוֹת חֲלוּלִים. עִם יִרְאָה = אַף פְּשׁוּטִים = עֲבוֹדָה שְׁלֵמָה. יִרְאַת יִשְׂרָאֵל הַמְּשֻׁלֶּבֶת = 'מַשְׁלֶמֶת' הַשֵּׁם. יִרְאָה = לֹא מִצְוָה אַחַת — כָּל הַמִּסְגֶּרֶת.",
"זֹהַר וַיִּקְרָא ד:; דב' י:יב."
),
], "Main Aspect of Perfection Is Fear — Yirah Completes the Name (1 seg)", "עִיקָּר הַשְּׁלֵמוּת הִיא הַיִּרְאָה — יִרְאָה מַשְׁלֶמֶת אֶת הַשֵּׁם")

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
print('lm-commentaries.json updated for T172-T185')

subprocess.run(['git', 'add'] + git_files, cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T172-T185 PNC -- shadow-blocks-light/tzaddik-reads-souls/judgments-overpower/crying-from-joy/ruach-shtut/vidui/shefa-each-day/pidyon/tzaddikim-circle/yirah-completes (16 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:250])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
