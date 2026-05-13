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

# T142: cannot study at all but heart burns — what to do
torahs[142] = make_data(142, [
seg(1,
"What should a person do when it is genuinely impossible for him to study Torah at all — whether because he is an ignoramus who never learned, or he has no books available, or he finds himself in a wilderness or isolated place — yet his heart burns within him with longing and love for God and Torah? The answer: in such a state of longing, the very yearning itself is considered as if he had actually studied. The Talmud and Midrash teach that when one deeply desires to perform a mitzvah but is prevented by circumstances beyond his control, the desire is credited to him as if the act had been performed. So too with Torah: the burning longing in the heart, the yearning to learn and serve God when the physical possibility is absent, is itself a form of divine service. This person should focus on that longing — nurturing it, not crushing it with despair — knowing that God sees and values the burning heart as much as the act of study itself.",
"What to do when impossible to study Torah (ignoramus/no books/wilderness) but heart burns with longing? Principle: deep desire to do mitzvah when prevented = credited as if done. So too Torah longing: burning yearning when physically impossible = itself divine service. Focus on the longing, not despair. God values burning heart as much as actual study.",
"מַה לַּעֲשׂוֹת כְּשֶׁאִי-אֶפְשָׁר לִלְמֹד (עַם הָאָרֶץ/אֵין סֵפֶר/מִדְבָּר) אֲבָל הַלֵּב בּוֹעֵר? עִיקָּרוֹן: תְּשׁוּקָה עֲמֻקָּה לְקַיֵּם מִצְוָה כְּשֶׁנִּמְנַע = נִחְשֶׁבֶת כְּאִילּוּ עָשָׂה. כֵּן כְּמִיהַת תּוֹרָה: בְּעֵרַת תְּשׁוּקָה כְּשֶׁאִי-אֶפְשָׁר גּוּפָנִית = עֲבוֹדַת ה'. הִתְמַקֵּד בַּכְּמִיהָה, לֹא בְּיֵאוּשׁ. ה' מַעֲרִיךְ לֵב בּוֹעֵר כְּמוֹ לִמּוּד בְּמַמָּשׁ.",
""
),
], "Cannot Study But Heart Burns — Longing Itself Is Service (1 seg)", "אִי-אֶפְשָׁר לִלְמֹד אֲבָל הַלֵּב בּוֹעֵר — הַכְּמִיהָה עַצְמָהּ עֲבוֹדָה")

# T143: 3 segs — receiving counsel from sages sweetens judgments
torahs[143] = make_data(143, [
seg(1,
"The greatness of one who receives counsel from the sages of the generation is that it sweetens the divine judgments. When a person needs counsel and does not know how to act, he is in a state of constriction — his intellect is constricted and he cannot see the way forward. This constriction is itself a form of divine judgment (din), because judgment is the constriction of divine flow. When the sage gives counsel, he expands the person's intellect and opens the way forward — and this expansion is the sweetening of judgment. The person who seeks counsel is not showing weakness; he is actively engaging in the spiritual work of sweetening din.",
"Receiving counsel from sages = sweetens judgments. When need counsel + don't know how to act = state of intellectual constriction = form of din. Sage gives counsel = expands intellect = opens the way = sweetens the judgment. Seeking counsel = active spiritual work of sweetening din.",
"קַבָּלַת עֵצָה מֵחַכְמֵי הַדּוֹר = מַמְתֶּקֶת דִּינִים. כְּשֶׁצָּרִיךְ עֵצָה + אֵינוֹ יוֹדֵעַ = מַצָּב צִמְצוּם שֵׂכֶל = צוּרַת דִּין. חָכָם נוֹתֵן עֵצָה = מַרְחִיב שֵׂכֶל = פּוֹתֵחַ הַדֶּרֶךְ = מַמְתִּיק הַדִּין. בַּקָּשַׁת עֵצָה = עֲבוֹדַת הַמְתָּקַת דִּין פְּעִילָה.",
""
),
seg(2,
"The verse teaches: 'Salvation is in the abundance of counselors' (Proverbs 11:14). Furthermore, the tzaddik himself is called 'abundance' — as our Rabbis taught (Taanit 9a): 'Moses, since his merits are abundant, is like many.' Therefore, receiving the advice of the tzaddik — even from a single tzaddik — is like receiving the counsel of many. The tzaddik contains within himself the spiritual wealth of many, because his connection to the divine root is so complete that a single word of his guidance carries the weight and breadth of many counselors.",
"Mishlei 11:14: 'Salvation in abundance of counselors.' Tzaddik = called 'abundance' (Taanit 9a: Moshe's merits = like many). Receiving tzaddik's advice = like receiving counsel of many. Tzaddik's connection to divine root so complete = single word carries weight of many counselors.",
"מִשְׁלֵי י\"א:יד: 'בְּרֹב יוֹעֲצִים תֵּשׁוּעָה.' צַדִּיק נִקְרָא 'רֹב' (תַּעֲנִית ט:: מֹשֶׁה = כְּרַבִּים). קַבָּלַת עֵצַת הַצַּדִּיק = כְּקַבָּלַת עֵצַת רַבִּים. הִתְקַשְּׁרוּת הַצַּדִּיק לַשֹּׁרֶשׁ הָאֱלֹהִי שְׁלֵמָה מְאֹד = מִלָּה אַחַת שֶׁלּוֹ = כֹּבֶד עֵצוֹת רַבּוֹת.",
"מִשְׁלֵי י\"א:יד; תַּעֲנִית ט:."
),
seg(3,
"Even when the person receives only one piece of advice from the tzaddik, this act of receiving itself is a form of teshuvah. The constriction that existed before — the inability to see clearly, the din — begins to dissolve. The expansion of consciousness that comes from receiving genuine guidance is exactly what teshuvah is: a return to clarity, to expanded awareness, to the place where divine flow is not blocked. Therefore, seeking counsel from the sages of the generation is not merely practical wisdom but a profound spiritual act with the power to sweeten all the judgments that hang over a person.",
"Receiving even one piece of advice from tzaddik = form of teshuvah. Constriction/din before dissolves. Expanded consciousness from guidance = exactly what teshuvah is: return to clarity + divine flow unblocked. Seeking counsel from sages = not just practical wisdom but profound spiritual act sweetening all judgments.",
"אַף קַבָּלַת עֵצָה אַחַת מֵהַצַּדִּיק = צוּרַת תְּשׁוּבָה. הַצִּמְצוּם/דִּין שֶׁלִּפְנֵי זֶה מִתְמוֹגֵג. הַרְחָבַת הַתּוֹדָעָה = תְּשׁוּבָה: חֲזָרָה לְבְּהִירוּת + שֶׁפַע אֱלֹהִי לֹא חָסוּם. בַּקָּשַׁת עֵצָה = פְּעֻלָּה רוּחָנִית עֲמֻקָּה הַמַּמְתִּיקָה כָּל הַדִּינִים.",
"מִשְׁלֵי י\"א:יד; תַּעֲנִית ט:."
),
], "Receiving Counsel from Sages — Sweetens Judgments / Tzaddik Is Abundance (3 segs)", "קַבָּלַת עֵצָה מֵחַכְמֵי הַדּוֹר — מַמְתֶּקֶת דִּינִים / הַצַּדִּיק הוּא הָרֹב")

# T144: "no man dies with half his desire" (Midrash Koheles 1) / tzaddik: no distinction life/after death
torahs[144] = make_data(144, [
seg(1,
"In the words of Rabbeinu himself: 'No man dies with half his desire in his hand' (Midrash Rabbah, Kohelet 1). For with the true tzaddik, there is no distinction between life and after death — even after the tzaddik physically departs from this world, he continues his work and his influence. His desire — his spiritual drive and mission — does not die with him. He continues to accomplish and fulfill his purpose even beyond the physical world. The Talmud (Berakhot 18a) teaches that 'the righteous, even in their death, are called living.' The tzaddik never 'dies with half his desire' because his desire is not limited to what can be accomplished in a physical lifetime — it extends infinitely, sustained by the divine.",
"Rebbe Nachman's teaching: 'No man dies with half his desire in his hand' (Midrash Koheles 1). With tzaddik: no distinction between life and after death. Even after death, tzaddik continues work and influence. Ber 18a: 'righteous even in death are called living.' Tzaddik never dies with half his desire — his desire extends infinitely beyond physical lifetime.",
"מֵרַבֵּינוּ: 'אֵין אָדָם מֵת בַּחֲצִי יָמָיו' (מִדְרָשׁ קֹהֶלֶת א). לַצַּדִּיק אֵין הֶבְדֵּל בֵּין חַיִּים לְאַחַר מוֹת. אַף לְאַחַר הִסְתַּלְּקוּת — מְמַשִּׁיךְ עֲבוֹדָתוֹ. בר' י\"ח:: 'צַדִּיקִים אַף בְּמִיתָתָן נִקְרָאִים חַיִּים.' הַצַּדִּיק לֹא מֵת בַּחֲצִי חֶשְׁקוֹ — חֶשְׁקוֹ מֻשְׁלָךְ לְאֵין-סוֹף.",
"מִדְרָשׁ קֹהֶלֶת א; בר' י\"ח:."
),
], "No Man Dies With Half His Desire — Tzaddik Lives Beyond Death (1 seg)", "אֵין אָדָם מֵת בַּחֲצִי יָמָיו — הַצַּדִּיק חַי מֵעֵבֶר לְמוֹת")

# T145: same phrase — aspect of controversy / Targum Gen 49:23 "owners of division"
torahs[145] = make_data(145, [
seg(1,
"Again: 'No man dies with half his desire in his hand' (Midrash Rabbah, Kohelet 1). This second teaching on the same phrase focuses on a different aspect: controversy (machloket). The Targum on 'and they became owners of arrows against him' (Genesis 49:23, regarding Joseph's brothers) translates as: 'they became owners of division (machloket).' The person who holds onto his desire — who refuses to let the divine will have its full expression and insists on his own partial vision — becomes an 'owner of division.' Controversy and dispute arise when people cling to their partial perspective as if it were the whole. The teaching: releasing one's half-grasped desire, surrendering the partial view, is the opposite of machloket. True spiritual unity comes from letting go of the insistence on one's own incomplete picture.",
"Same phrase, different aspect: machloket (controversy). Targum Gen 49:23: Joseph's brothers = 'owners of division.' Person who clings to his partial desire = 'owner of division.' Controversy = clinging to partial perspective as if whole. Release of half-grasped desire = opposite of machloket. Spiritual unity = letting go of incomplete picture.",
"אוֹתוֹ בִּטּוּי, עִנְיָן נוֹסָף: מַחֲלֹקֶת. תַּרְגּוּם בר' מ\"ט:כג: 'בַּעֲלֵי פְלֻגְּתָא.' הַנִּאָחֵז בְּחֶשְׁקוֹ הַחֶלְקִי = 'בַּעַל מַחֲלֹקֶת.' מַחֲלֹקֶת = הֶחָזָקָה בִּפֶּרְסְפֶּקְטִיבָה חֶלְקִית כְּאִילּוּ הִיא הַכֹּל. שִׁחְרוּר מֵחֶשֶׁק חֶלְקִי = הֵפֶךְ מַחֲלֹקֶת. אַחְדוּת רוּחָנִית = עֲזִיבַת הַתּמוּנָה הֶחֶלְקִית.",
"בר' מ\"ט:כג; מִדְרָשׁ קֹהֶלֶת א."
),
], "No Man Dies With Half His Desire (II) — Controversy as Partial Vision (1 seg)", "אֵין אָדָם מֵת בַּחֲצִי יָמָיו (ב) — מַחֲלֹקֶת כְּרְאִיָּה חֶלְקִית")

# T146: "Testimony of Hashem is faithful, making wise the simple" (Teh 19:8) / Torah = "woman" / how makes simple wise
torahs[146] = make_data(146, [
seg(1,
"Opening verse: 'The testimony of God is faithful, making wise the simple' (Psalms 19:8). The teaching presents a profound question: the Torah is referred to as a 'woman' in certain mystical sources (and in the sense of the divine feminine aspect of wisdom). The question is: how can the Torah, called a 'woman,' make the simple wise? The answer lies in understanding what it means for wisdom to be 'faithful' (ne'emanah). Faithful wisdom is not abstract intellectual knowledge that detaches a person from reality, but a living, trustworthy, emotionally resonant wisdom — the kind that a devoted woman embodies in her relationship with her household. When Torah is received in this relational, faithful mode — as a living reality one is in relationship with, not merely a system of rules to master — it genuinely transforms and elevates even the simple person. The simple person does not need to be a scholar; he needs to be in faithful relationship with Torah.",
"Teh 19:8: 'Testimony of Hashem = faithful, making wise the simple.' Torah called 'woman.' Question: how does a 'woman' make simple wise? Answer: 'faithful' (ne'emanah) = living relational wisdom, not abstract intellect. Torah received as living relationship (faithful mode) genuinely transforms simple person. Simple person needs faithful relationship with Torah, not scholarship.",
"תה' י\"ט:ח: 'עֵדוּת ה' נֶאֱמָנָה מַחְכִּימַת פֶּתִי.' תּוֹרָה נִקְרֵאת 'אִשָּׁה.' שְׁאֵלָה: כֵּיצַד 'אִשָּׁה' מַחְכִּימָה אֶת הַפֶּתִי? תְּשׁוּבָה: 'נֶאֱמָנָה' = חָכְמָה חַיָּה וְרֶלָצְיוֹנָלִית, לֹא אִינְטֶלֶקְט מִנוּתָּק. תּוֹרָה שֶׁנִּתְקַבֶּלֶת כְּיַחַס חַי מְשַׁנָּה אַף אֶת הַפֶּתִי. פֶּתִי צָרִיךְ יַחַס נֶאֱמָן עִם תּוֹרָה, לֹא מִלְגָּאוּת.",
"תה' י\"ט:ח."
),
], "Testimony of Hashem Is Faithful — Torah as Woman / Faithful Wisdom (1 seg)", "עֵדוּת ה' נֶאֱמָנָה — תּוֹרָה כְּאִשָּׁה / חָכְמָה נֶאֱמָנָה")

# T147: impudence = no share in Torah (Chagigah 14a) / "matter commanded for thousand generations"
torahs[147] = make_data(147, [
seg(1,
"Just as one who possesses brazen impudence (azut panim) has no share in the Torah — as our Sages taught (Chagigah 14a): 'A matter He commanded for a thousand generations' (Psalms 105:8) — this refers to the Torah, which was designated for a thousand generations before the world was created. The Holy One, Blessed Be He, prepared the Torah for a thousand generations, meaning the Torah is a divine inheritance of unfathomable antiquity and depth. Brazen impudence — the audacity to approach Torah without proper reverence and humility — is the one thing that disqualifies a person from receiving this ancient inheritance. The azut panim person treats the divine treasure as if it belongs to him by right, without the awe that the depth of Torah demands. In contrast, the humble person who approaches Torah with trembling receives access to all thousand generations of its depth.",
"Chagigah 14a: azut panim = no share in Torah. Teh 105:8: 'matter commanded for thousand generations' = Torah. Torah designated for 1000 generations before world creation = unfathomable depth and antiquity. Azut panim = approaching Torah without reverence = disqualifies. Humble + trembling approach = access to all 1000 generations of depth.",
"חֲגִיגָה י\"ד:: עַזּוּת פָּנִים = אֵין חֵלֶק בַּתּוֹרָה. תה' ק\"ה:ח: 'דָּבָר צִוָּה לְאֶלֶף דּוֹר' = תּוֹרָה נִקְבְּעָה לְאֶלֶף דּוֹרוֹת. עֹמֶק וְעַתִּיקוּת אֵין-חֵקֶר. עַזּוּת פָּנִים = גִּשָּׁה לְתוֹרָה בְּלִי יִרְאָה = פְּסִילָה. עָנָו + רוֹעֵד = גִּישָׁה לְכָל אֶלֶף דּוֹרוֹת שֶׁל עֹמֶק.",
"חֲגִיגָה י\"ד:; תה' ק\"ה:ח."
),
], "Impudence Has No Share in Torah — Humility Opens 1000 Generations of Depth (1 seg)", "עַזּוּת פָּנִים אֵין חֵלֶק בַּתּוֹרָה — עֲנָוָה פּוֹתַחַת עֹמֶק אֶלֶף הַדּוֹרוֹת")

# T148: fear itself is yirat Hashem / that fear must also possess fear / infinite fear
torahs[148] = make_data(148, [
seg(1,
"The trait of fear — any fear, in and of itself — is actually fear of God. Every genuine fear, at its deepest root, is fear of the divine. If that is so, then this fear itself must also possess fear — a deeper, more refined fear must lie beneath the first. And that second-level fear is also fear of God. And if so, then it too must possess a deeper fear. This continues infinitely. The teaching: fear has no bottom — there are always deeper and more refined levels of yirat Hashem waiting to be uncovered. The person who thinks he has 'achieved' fear of God is mistaken; there are always deeper dimensions. At the same time, every genuine fear a person experiences — including fears that seem mundane or even irrational — at their root contains a spark of genuine yirat Hashem. The work is to recognize that root and consciously redirect the fear toward its source.",
"Fear itself = fear of Hashem. That fear must also possess fear → deeper fear. That deeper fear is also yirat Hashem. And so on infinitely. Teaching: (1) fear has no bottom — always deeper levels of yirat Hashem. (2) Every genuine fear contains a spark of yirat Hashem at its root. Work = recognize the root, redirect fear to its source.",
"כָּל יִרְאָה הִיא יִרְאַת ה'. אוֹתָהּ יִרְאָה עַצְמָהּ חַיֶּבֶת לִהְיוֹת לָהּ יִרְאָה → יִרְאָה עֲמֻקָּה יוֹתֵר. גַּם הִיא יִרְאַת ה'. וְכֵן לְאֵין-סוֹף. לִמּוּד: (א) לְיִרְאָה אֵין תַּחְתִּית — תָּמִיד יֵשׁ רָבְדִים עֲמֻקִּים יוֹתֵר שֶׁל יִרְאַת ה'. (ב) כָּל יִרְאָה אֲמִתִּית מְכִילָה נִיצוֹץ שֶׁל יִרְאַת ה'. עֲבוֹדָה = לְהַכִּיר הַשֹּׁרֶשׁ, לְכַוֵּן הַיִּרְאָה לְמְקוֹרָהּ.",
""
),
], "Fear Itself Is Fear of Hashem — Infinite Depth of Yirat Hashem (1 seg)", "הַיִּרְאָה עַצְמָהּ הִיא יִרְאַת ה' — עֹמֶק אֵין-סוֹף שֶׁל הַיִּרְאָה")

# T149: "At midnight I rise to thank You" (Teh 119:62) / midnight = sweetening of judgments
torahs[149] = make_data(149, [
seg(1,
"Opening verse: 'At midnight I rise to thank You for Your righteous judgments' (Psalms 119:62). Midnight is a spiritually propitious time — it is a time of redemption and the sweetening of divine judgments, as the Petach Eliyahu and kabbalistic sources teach. At midnight, the divine attribute of compassion becomes ascendant, and the harsh decrees and judgments that have accumulated through the day are sweetened and softened. This is why King David rose at midnight to study Torah and offer praise. The person who rises at midnight — even briefly, even just to say a word of thanks or a psalm — participates in this cosmic sweetening. The 'righteous judgments' that the verse thanks God for are not bitter judgments — they are judgments that have been sweetened by this midnight encounter with divine compassion.",
"Teh 119:62. Midnight = spiritually propitious = time of redemption + sweetening of judgments (Petach Eliyahu + kabbalah). At midnight, divine compassion ascendant; harsh decrees softened. King David rose at midnight for Torah + praise. Rising at midnight (even briefly) = participating in cosmic sweetening. 'Righteous judgments' = judgments sweetened by midnight encounter with compassion.",
"תה' קי\"ט:סב. חֲצוֹת = עֵת גְּאֻלָּה + הַמְתָּקַת דִּינִים (פֶּתַח אֵלִיָּהוּ + קַבָּלָה). בַּחֲצוֹת מִדַּת הָרַחֲמִים עוֹלָה; גְּזֵרוֹת קָשׁוֹת מִתְמַתְּקוֹת. דָּוִד קָם בַּחֲצוֹת לְתּוֹרָה וּשְׁבָח. קְמִיאָה בַּחֲצוֹת = חֲלִיפַת הַהַמְתָּקָה הַקּוֹסְמִית. 'מִשְׁפְּטֵי צִדְקֶךָ' = דִּינִים שֶׁהוּמְתְּקוּ בְּחֲצוֹת.",
"תה' קי\"ט:סב; פֶּתַח אֵלִיָּהוּ."
),
], "At Midnight I Rise — Midnight Sweetens Judgments / Propitious Time (1 seg)", "חֲצוֹת לַיְלָה אָקוּם — חֲצוֹת מַמְתֶּקֶת דִּינִים / עֵת סְגֻלָּה")

# T150: "likeness of his father's image he saw" (Sotah 36b) / very hidden matter / Yaakov's image
torahs[150] = make_data(150, [
seg(1,
"The Talmud (Sotah 36b) and the Midrash Tanchuma (Vayeishev) record that when Joseph was about to sin with Potiphar's wife, he 'saw the likeness of his father's image.' This is described as a very hidden and mysterious matter — how exactly did this image appear and what was its nature? Certainly it was not a simple hallucination; rather, it was a spiritual reality. Jacob — Joseph's father — was on an elevated spiritual level where his image could appear and serve as an anchor of holiness for his son even at great distance. The appearance of the tzaddik's image or presence in a moment of spiritual danger is a form of divine intervention: the bond between parent and child, between teacher and student, between tzaddik and follower, has a reality that transcends physical space. The image that Joseph saw was the spiritual anchor of his deepest connection — to his father, to his lineage, to holiness.",
"Sotah 36b; Midrash Tanchuma Vayeishev: Yosef about to sin → 'saw likeness of his father's image' = very hidden/mysterious. Not hallucination — spiritual reality. Yaakov at elevated level; his image could appear to serve as holiness-anchor even at distance. Tzaddik's image in moment of danger = divine intervention. Bond tzaddik-follower transcends physical space. Image = spiritual anchor of deepest connection.",
"סוֹטָה ל\"ו:; מִדְרָשׁ תַּנְחוּמָא וַיֵּשֶׁב: יוֹסֵף עוֹמֵד לַחֲטֹא → 'צוּרַת דְּיוֹקְנוֹ שֶׁל אָבִיו' = עִנְיָן נִסְתָּר מְאֹד. לֹא הַזָּיָה — מְצִיאוּת רוּחָנִית. יַעֲקֹב בְּמַדְרֵגָה גְּבוֹהָה; דְּיוֹקְנוֹ הִתְגַּלָּה לְאַנְקוֹר הַקְּדֻשָּׁה מֵרָחוֹק. דְּיוֹקַן הַצַּדִּיק בְּשָׁעַת סַכָּנָה = הִתְעָרְבוּת אֱלֹהִית. קֶשֶׁר צַדִּיק-מֻדְבָּק מִתְעַלֶּה עַל הַמֶּרְחָב.",
"סוֹטָה ל\"ו:; מִדְרָשׁ תַּנְחוּמָא וַיֵּשֶׁב."
),
], "Likeness of Father's Image — Tzaddik's Image Transcends Space / Holiness Anchor (1 seg)", "דְּמוּת דְּיוֹקְנוֹ שֶׁל אָבִיו — דְּיוֹקַן הַצַּדִּיק מֵעֵבֶר לַמֶּרְחָב")

# T151: segulah for enduring offspring / recite "beginnings of your months" before relations
torahs[151] = make_data(151, [
seg(1,
"A spiritual remedy (segulah) for having children that endure: both the husband and wife should recite the Torah portion beginning 'On the beginnings of your months' (Numbers 28:11-15, the Rosh Chodesh mussaf reading) before engaging in marital relations. Similarly, the text mentions another segulah practice. The spiritual dimension: Rosh Chodesh (the new month) represents renewal, the rebirth of Malchut from concealment to revelation. The korbanot (offerings) of Rosh Chodesh sanctify the new cycle. Reciting this portion before the marital union aligns the union with the cosmic renewal and sanctification of Malchut. This creates a spiritual environment of renewal and blessing that supports the creation of holy, enduring life.",
"Segulah for enduring children: husband and wife both recite 'on the beginnings of your months' (Bamidbar 28:11-15) before marital relations. Spiritual dimension: Rosh Chodesh = renewal/rebirth of Malchut. Korbanot of Rosh Chodesh sanctify new cycle. Reciting this portion aligns union with cosmic renewal = supports creation of holy, enduring life.",
"סְגוּלָּה לְזֶרַע קַיָּמָא: בַּעַל + אִשָּׁה יֹאמְרוּ 'וּבְרָאשֵׁי חָדְשֵׁיכֶם' (בַּמ' כ\"ח:יא-טו) לִפְנֵי הַחִיבּוּר. עֹמֶק רוּחָנִי: רֹאשׁ חֹדֶשׁ = חִידּוּשׁ מַלְכוּת. קָרְבְּנוֹת רֹאשׁ חֹדֶשׁ מְקַדְּשִׁים הַמַּחְזוֹר הֶחָדָשׁ. אֲמִירַת הַפָּרָשָׁה = הַתְאָמַת הַחִיבּוּר לַחִידּוּשׁ הַקּוֹסְמִי = תּוֹמֵךְ בִּיצִירַת חַיִּים קְדוֹשִׁים.",
"בַּמ' כ\"ח:יא-טו."
),
], "Segulah for Enduring Offspring — Rosh Chodesh Portion / Malchut Renewal (1 seg)", "סְגוּלָּה לְזֶרַע קַיָּמָא — פָּרָשַׁת רֹאשׁ חֹדֶשׁ וְחִידּוּשׁ הַמַּלְכוּת")

# T152: 2 segs — holy soul with attached branches / klipah encircles, opening opposite faith / self-sacrifice to tzaddik
torahs[152] = make_data(152, [
seg(1,
"When a holy soul enters this world along with its attached branches (the spiritual 'branches' that are the different facets and extensions of the soul's root), the klipah (spiritual husk/force of impurity) immediately encircles and surrounds it — trying to gain hold. Yet one opening remains: the opening that faces faith (emunah). Opposite emunah, the klipah has no power to close the opening. From this opening — from the person's capacity for faith — defects and falling away can be repaired. The klipah cannot spread over and seal this faith-opening because the God-fearing person stands guard there. As long as the person maintains his emunah, the klipah cannot completely enclose him.",
"When holy soul enters world with attached branches, klipah immediately encircles it. But one opening remains: the opening facing emunah (faith). Klipah cannot close this opening. Defects repaired through this faith-opening. Klipah cannot seal the emunah-opening because the God-fearing person stands there as guard. Emunah = the unbreachable opening.",
"כְּשֶׁנְּשָׁמָה קְדוֹשָׁה יוֹרֶדֶת עִם עֲנָפֶיהָ, קְלִיפָּה מַקִּיפָה אוֹתָהּ. אַךְ פֶּתַח אֶחָד נוֹתָר: הַפֶּתַח כְּנֶגֶד הָאֱמוּנָה. לַקְּלִיפָּה אֵין יְכֹלֶת לִסְגֹּר פֶּתַח הָאֱמוּנָה. מִן הַפֶּתַח = תִּקּוּן פְּגָמִים. הַקְּלִיפָּה לֹא יְכוֹלָה לִסְתֹּם כִּי הַיָּרֵא ה' שׁוֹמֵר שָׁם. אֱמוּנָה = הַפֶּתַח הָאִי-נֶחְסָם.",
""
),
seg(2,
"The klipah cannot draw near or spread over the emunah-opening because the God-fearing person stands there as a guard. Through mesiras nefesh — self-sacrifice, meaning the willingness to give up comfort, convenience, and ego in order to travel and draw close to the tzaddik — it becomes possible to attach oneself to him. But wisdom itself (the seichel/brain) cannot illuminate the full depth of this connection without this self-sacrifice. The journey to the tzaddik requires something beyond intellect — it requires the full commitment of the person's will and self, overcoming all obstacles. This is the aspect of 'through mesiras nefesh, one can attach to the tzaddik': the bond is proportional to the degree of self-giving.",
"Klipah cannot spread over emunah-opening because God-fearing person stands guard. Through mesiras nefesh (self-sacrifice = giving up comfort/ego to travel to tzaddik) = possible to attach. But wisdom/seichel alone cannot illuminate full depth without self-sacrifice. Journey to tzaddik requires beyond intellect = full commitment of will and self. Bond = proportional to degree of self-giving.",
"קְלִיפָּה לֹא יְכוֹלָה לְכַסּוֹת פֶּתַח הָאֱמוּנָה כִּי יָרֵא ה' שׁוֹמֵר. דֶּרֶךְ מְסִירַת נֶפֶשׁ (עֲזִיבַת נוֹחוּת/אֶגוֹ לִנְסֹעַ לַצַּדִּיק) = אֶפְשָׁר לְהִדָּבֵק. אֲבָל שֵׂכֶל לְבַדּוֹ אֵינוֹ מֵאִיר בְּלִי מְסִירַת נֶפֶשׁ. נְסִיעָה לַצַּדִּיק = מֵעֵבֶר לְשֵׂכֶל = הִתְמַסְּרוּת שְׁלֵמָה. קֶשֶׁר = פְּרוֹפּוֹרְצְיוֹנָלִי לְדַרְגַּת הַמָּסֹּרֶת.",
""
),
], "Holy Soul With Branches — Klipah Encircles / Emunah Opening / Mesiras Nefesh (2 segs)", "נְשָׁמָה קְדוֹשָׁה עִם עֲנָפֶיהָ — קְלִיפָּה מַקִּיפָה / פֶּתַח הָאֱמוּנָה / מְסִירַת נֶפֶשׁ")

# T153: receiving face of Torah scholar / moon = polished mirror reflecting sun
torahs[153] = make_data(153, [
seg(1,
"The matter of 'receiving the face of a Torah scholar' (hakhnasat panim — going to greet and honor a Torah scholar): the moon has no light of its own; it receives the sun's light because it is like a polished mirror. Through that polished surface, it reflects the sun's brilliance back into the world. Similarly, receiving the face of a Torah scholar — greeting him, honoring him, going to stand before him — is an act that polishes the spiritual 'mirror' of one's soul. Just as the moon needs to be in a certain aligned position to receive and reflect the sun, the person who positions himself before the Torah scholar and opens himself to receive his light becomes a reflective surface for the divine wisdom that flows through the scholar. The act of receiving and honoring the Torah scholar is thus not merely social courtesy but a spiritual alignment that enables divine light to flow through the person.",
"Receiving face of Torah scholar. Moon = no light of own; receives sun's light because = polished mirror. Polished surface → reflects sun's brilliance. Receiving/honoring Torah scholar = polishes spiritual mirror of soul. Positioning before scholar = aligning to receive and reflect divine wisdom. Not mere courtesy — spiritual alignment enabling divine light to flow through person.",
"קַבָּלַת פְּנֵי תַּלְמִיד חָכָם. הַלְּבָנָה = אֵין לָהּ אוֹר עַצְמִי; מְקַבֶּלֶת מֵהַשֶּׁמֶשׁ כִּי = מַרְאָה מְלוּטֶּשֶׁת. לְטִישָׁה → מַשְׁקֶפֶת אוֹר הַשֶּׁמֶשׁ. קַבָּלַת/כִּבּוּד תַּלְמִיד חָכָם = לְטִישַׁת מַרְאַת הַנֶּפֶשׁ. עָמְדָה לִפְנֵי תַּלְמִיד חָכָם = יִישּׁוּר לְקַבָּלָה וּלְהַשְׁרָאַת אוֹר אֱלֹהִי. לֹא נִימוּסִין — יִישּׁוּר רוּחָנִי.",
""
),
], "Receiving Face of Torah Scholar — Moon-Mirror / Polishing the Soul (1 seg)", "קַבָּלַת פְּנֵי תַּלְמִיד חָכָם — הַלְּבָנָה כְּמַרְאָה / לְטִישַׁת הַנֶּפֶשׁ")

# T154: fallen fears / all sufferings stem from fallen fears
torahs[154] = make_data(154, [
seg(1,
"Know that there exist 'fallen fears' — fears that have descended from their proper place in the spiritual realm and become distorted, corrupted, or misdirected. All the sufferings and judgments that a person experiences — every form of difficulty, pain, loss, and hardship — all of them stem from fallen fears. The fear descended into the particular matter that the person fears and from which he suffers. This is a profound teaching: the very thing a person fears is the thing that his fear has 'fallen into' — the fear descended from its proper elevated form (yirat Hashem) and attached itself to something particular and material. The remedy: recognize that your fear is a fallen form of fear of God. Elevate the fear back to its source — redirect it from the particular thing you fear toward the divine. When the fallen fear is raised, the suffering that flowed from it is sweetened.",
"There exist fallen fears. All sufferings and judgments = stem from fallen fears. Fear descended into the particular matter the person fears from which he suffers. The thing feared = what the fear has 'fallen into.' Fear = fallen form of yirat Hashem. Remedy: recognize fallen fear, elevate back to its source (yirat Hashem), redirect from particular to divine. Raised fear = suffering sweetened.",
"יֵשׁ יִרְאוֹת נְפוּלוֹת. כָּל הַיִּסּוּרִים וְהַדִּינִים שֶׁאָדָם מַרְגִּישׁ = מִיִּרְאוֹת נְפוּלוֹת. הַיִּרְאָה יָרְדָה לְעִנְיָן הַמְּיֻחָד שֶׁמִּמֶּנּוּ הוּא סוֹבֵל. הַמְּפֻחָד = מָה שֶׁהַיִּרְאָה 'נָפְלָה לְתוֹכוֹ.' יִרְאָה = צוּרָה נְפוּלָה שֶׁל יִרְאַת ה'. תִּקּוּן: הַכֵּר יִרְאָה נְפוּלָה, הַעֲלֵה לְשֹׁרֶשׁ (יִרְאַת ה'). יִרְאָה מוּרֶמֶת = יִסּוּרִים מִתְמַתְּקִים.",
""
),
], "Fallen Fears — All Sufferings Stem from Fallen Fears / Elevate to Source (1 seg)", "יִרְאוֹת נְפוּלוֹת — כָּל הַיִּסּוּרִים מִיִּרְאוֹת נְפוּלוֹת / הַרְמָה לַמָּקוֹר")

# T155: 3 segs — melancholy = very bad trait / reason person doesn't travel to tzaddik / erech apayim = faith / Land of Israel = faith/patience
torahs[155] = make_data(155, [
seg(1,
"Know that melancholy (atzvut) is a very bad spiritual trait. The reason why a person does not travel to the tzaddik is because of melancholy and heaviness — the spiritual weight of atzvut makes every journey feel impossible, every effort too great. Likewise, the reason why one does not pray properly is due to melancholy and spiritual depression. Atzvut is not holy sadness or grief — it is a spiritual paralysis that blocks the flow of divine energy through a person. It is the spiritual enemy of movement, prayer, connection, and growth. The teaching: identify atzvut as the obstacle and refuse to accept it as a valid spiritual state. Fight it with joy, music, gratitude — anything that restores movement and life.",
"Melancholy (atzvut) = very bad trait. Reason person doesn't travel to tzaddik = atzvut and heaviness. Reason person doesn't pray properly = atzvut. Atzvut = spiritual paralysis blocking divine energy. Not holy sadness — enemy of movement/prayer/connection/growth. Counter: identify atzvut as obstacle, fight with joy/music/gratitude.",
"יֵדַע כִּי עַצְבוּת = מִדָּה רָעָה מְאֹד. סִיבַּת אֵי-נְסִיעָה לַצַּדִּיק = עַצְבוּת וְכֹבֶד. סִיבַּת אֵי-תְּפִלָּה כְּהוֹגֵן = עַצְבוּת. עַצְבוּת = שִׁתּוּק רוּחָנִי הַחּוֹסֵם זְרִימָה אֱלֹהִית. לֹא עֶצֶב קָדוֹשׁ — אוֹיֵב הַתְּנוּעָה/תְּפִלָּה/חִיבּוּר/גִּדּוּל. נֶגֶד: זַהֶה עַצְבוּת כְּמַפְרִיעַ, הִלָּחֵם בְּשִׂמְחָה/נִגּוּן/הַכָּרַת טוֹבָה.",
""
),
seg(2,
"'Erech apayim' (patience/long-suffering, literally 'long of face/nose') is dependent on faith (emunah). For as long as there is idolatry in the world, there is wrath in the world — as the Sifri (Parashat Re'eh) teaches: 'As long as there is idolatry in the world, there is wrath in the world.' But through faith, which is the opposite of idolatry, wrath is nullified and one merits patience — the erech apayim which is the opposite of melancholy and anger. Wrath and impatience are manifestations of the same spiritual failure: the loss of emunah. When emunah is strong, the person can be patient because he trusts in the divine plan. When emunah is weak, the person is buffeted by every disappointment and becomes susceptible to anger and melancholy.",
"Erech apayim (patience) = dependent on emunah. As long as idolatry in world = wrath in world (Sifri Re'eh). Through emunah (opposite of idolatry) = wrath nullified = merits erech apayim. Wrath + impatience = loss of emunah. Strong emunah = patience (trusts divine plan). Weak emunah = anger + melancholy.",
"אֶרֶךְ אַפַּיִם = תָּלוּי בָּאֱמוּנָה. כָּל עוֹד עֲבוֹדָה זָרָה בָּעוֹלָם = כַּעַס בָּעוֹלָם (סִפְרִי רְאֵה). דֶּרֶךְ אֱמוּנָה (הֵפֶךְ עֲבוֹדָה זָרָה) = כַּעַס בָּטֵל = זוֹכֶה לְאֶרֶךְ אַפַּיִם. כַּעַס + אִי-סַבְלָנוּת = אֱמוּנָה חַלּוּשָׁה. אֱמוּנָה חֲזָקָה = סַבְלָנוּת (בִּטָּחוֹן בְּתֹכְנִית הָאֱלֹהִית).",
"סִפְרִי רְאֵה."
),
seg(3,
"The essential ability of a person to serve God depends on the Land of Israel — which is the aspect of faith, patience (erech apayim), and the power of growth and vegetation. The Land of Israel, spiritually, represents the quality of emunah (faith/rootedness) that allows things to grow and flourish. It is impossible to truly serve God except through this quality. This means: genuine divine service is only possible when grounded in emunah. Without faith as the foundation — without the 'Land of Israel' quality of patient, rooted trust — all service is ultimately unstable and unsustaining. The melancholic person has lost contact with this inner 'land' and must find his way back to it through cultivating emunah.",
"True divine service depends on Land of Israel = aspect of emunah + erech apayim + power of growth. Eretz Yisrael spiritually = quality of emunah that allows growth. Impossible to truly serve God without this. Genuine divine service = only possible grounded in emunah. Melancholic = lost contact with inner 'land.' Must return through cultivating emunah.",
"אֱמֶת עֲבוֹדַת ה' תְּלוּיָה בְּאֶרֶץ יִשְׂרָאֵל = בְּחִינַת אֱמוּנָה + אֶרֶךְ אַפַּיִם + כֹּחַ גִּדּוּל. אֶרֶץ יִשְׂרָאֵל רוּחָנִית = אֵיכוּת אֱמוּנָה הַמַּצְמִיחָה. אִי-אֶפְשָׁר לַעֲבֹד ה' אֲמִיתִּית בְּלִי זֶה. עַצְבוּת = אָבַד מַגָּע עִם 'אֶרֶץ' הַפְּנִימִית. חַזָּרָה דֶּרֶךְ טִיפּוּחַ אֱמוּנָה.",
"סִפְרִי רְאֵה."
),
], "Melancholy Is Very Bad — Erech Apayim / Emunah / Land of Israel (3 segs)", "עַצְבוּת מִדָּה רָעָה מְאֹד — אֶרֶךְ אַפַּיִם, אֱמוּנָה, אֶרֶץ יִשְׂרָאֵל")

# T156: 3 segs — what person speaks between himself and Creator = Ruach HaKodesh / Psalms / pure heart → new words
torahs[156] = make_data(156, [
seg(1,
"Opening verse: 'Create in me a pure heart, O God' (Psalms 51:12). That which a person speaks between himself and his Creator — the private, personal words of prayer and conversation with God — is truly an aspect of the Holy Spirit (Ruach HaKodesh). This is not reserved for prophets and great sages; every person, speaking sincerely from the heart to God in whatever language and words come naturally, is engaging in a form of Ruach HaKodesh. The more genuine and personal the speech — the less formal and rehearsed — the more it partakes of this holy quality.",
"Teh 51:12. What person speaks privately between himself and Creator = aspect of Ruach HaKodesh. Not reserved for prophets — every person speaking sincerely to God engages Ruach HaKodesh. More genuine + personal = more partakes of holy quality.",
"תה' נ\"א:יב. מַה שֶּׁאָדָם מְדַבֵּר בֵּינוֹ לְבֵין בּוֹרְאוֹ = בְּחִינַת רוּחַ הַקֹּדֶשׁ בֶּאֱמֶת. לֹא שָׁמוּר לַנְּבִיאִים — כָּל אָדָם מְדַבֵּר בְּכֵנוּת לֵאלֹהִים = מְחַבֵּר עִם רוּחַ הַקֹּדֶשׁ. כֵּן יוֹתֵר אֲמִתִּי וְאִישִׁי = כֵּן יוֹתֵר שִׁיתּוּף בְּקֹדֶשׁ.",
"תה' נ\"א:יב."
),
seg(2,
"King David, whose spiritual stature was immensely great, took this principle and from it established the Book of Psalms — his personal outpourings to God became the eternal holy scripture of all Israel. Every person, according to his spiritual level, possesses this aspect of Ruach HaKodesh, as it is written: 'To You my heart has said' (Psalms 27:8). Rashi explains that 'To You' means: 'on Your behalf' — the heart speaks on behalf of God, directed entirely toward Him. This is the secret of genuine prayer: it is not the person speaking at God but with God, on God's behalf, the heart speaking the divine will itself.",
"King David's Psalms = his personal outpourings to God → eternal holy scripture. Every person has this aspect of Ruach HaKodesh proportional to their level. Teh 27:8: 'To You my heart has said.' Rashi: 'on Your behalf' = heart speaks on God's behalf, directed entirely to Him. Genuine prayer = not speaking at God but with God, heart speaking divine will itself.",
"דָּוִד הַמֶּלֶךְ לָקַח עִיקָּרוֹן זֶה וְיִסֵּד מִמֶּנּוּ תְּהִלִּים. כָּל אָדָם לְפִי מַדְרֵגָתוֹ = בְּחִינַת רוּחַ הַקֹּדֶשׁ. תה' כ\"ז:ח: 'לְךָ אָמַר לִבִּי.' רש\"י: 'לְךָ' = מִטַּעַמְךָ — הַלֵּב מְדַבֵּר מִטַּעַם ה', מוּנָּח לְגַמְרֵי לְכִוּוּנוֹ. תְּפִלָּה אֲמִתִּית = לֹא מְדַבֵּר אֶל ה', אֶלָּא עִם ה', לֵב מְדַבֵּר רְצוֹן ה' עַצְמוֹ.",
"תה' נ\"א:יב; תה' כ\"ז:ח."
),
seg(3,
"As it is written: 'Everything that comes into fire — you shall pass through fire' (Numbers 31:23). Having purified the heart (creating the pure heart that was asked for in the opening verse), one merits to speak new words every time one draws near — words that are an aspect of Ruach HaKodesh. And so: 'Create in me a pure heart, O God' — and then the next phrase follows: 'And renew a steadfast spirit within me.' First, purity of heart; from that purity flows the renewal of spirit — new, fresh, holy speech every time, never stale or merely habitual. The person with a pure heart always has something new to say to God, because the divine is always new and always revealing Himself freshly.",
"Bamidbar 31:23: everything passed through fire = purified. Pure heart = merits to speak new words every time drawing near = Ruach HaKodesh words. Teh 51:12: 'Create pure heart' → 'renew steadfast spirit within me.' Purity → renewal of spirit → new holy speech each time. Pure heart = always something new to say to God, because God is always revealing Himself freshly.",
"בַּמ' ל\"א:כג: 'כֹּל אֲשֶׁר יָבֹא בָאֵשׁ תַּעֲבִירוּ בָאֵשׁ.' טֹהַר לֵב = זוֹכֶה לְדַבֵּר דְּבָרִים חֲדָשִׁים בְּכָל פַּעַם = בְּחִינַת רוּחַ הַקֹּדֶשׁ. תה' נ\"א:יב: 'בְּרָא לִי לֵב טָהוֹר' → 'וְרוּחַ נָכוֹן חַדֵּשׁ בְּקִרְבִּי.' טֹהַר → חִידּוּשׁ רוּחַ → דִּבּוּר קָדוֹשׁ חָדָשׁ בְּכָל פַּעַם. לֵב טָהוֹר = תָּמִיד יֵשׁ חִידּוּשׁ לֵאלֹהִים.",
"בַּמ' ל\"א:כג; תה' נ\"א:יב."
),
], "Personal Prayer Is Ruach HaKodesh — Pure Heart / New Words Each Time (3 segs)", "דִּבּוּר בֵּינוֹ לְבוֹרְאוֹ = רוּחַ הַקֹּדֶשׁ — לֵב טָהוֹר וְחִידּוּשׁ הַדִּבּוּר")

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
print('lm-commentaries.json updated for T142-T156')

subprocess.run(['git', 'add'] + git_files, cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T142-T156 PNC -- longing-heart/counsel-sweetens/tzaddik-lives-on/fallen-fears/melancholy/ruach-hakodesh-prayer (28 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:250])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
