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

# T157: spark of divine wisdom ignites living flame / not ordinary fire
torahs[157] = make_data(157, [
seg(1,
"The light of wisdom — the understanding and discernment bestowed by God — kindles a spark within the heart that grows into a living flame. This flame is not like the ordinary fire of the physical world. Ordinary fire consumes and destroys; it cannot sustain itself without fuel, and when the fuel is gone, it dies. But the flame kindled by divine wisdom is a spiritual fire that feeds on itself — the more it burns, the more fuel it generates. Every insight of Torah wisdom that enters the heart produces more longing for wisdom, which produces more insight, which produces more flame. This self-sustaining quality is the hallmark of genuine divine wisdom: it does not diminish the person who holds it but expands and enlivens him. The spark must be guarded and nurtured — even a small spark of divine wisdom, if properly tended, can grow into a transformative blaze.",
"Light of wisdom = kindles spark in heart → grows into living flame. Not ordinary fire (which consumes and dies). Divine wisdom-flame = feeds on itself: insight → more longing → more insight → more flame. Self-sustaining quality = hallmark of genuine divine wisdom. Does not diminish but expands. Small spark properly tended = transformative blaze.",
"אוֹר הַחָכְמָה = מַצִּית נִיצוֹץ בַּלֵּב → גָּדֵל לְשַׁלְהֶבֶת חַיָּה. לֹא כְּאֵשׁ רְגִילָה (שֶׁכּוֹלָה וּמֵתָה). אֵשׁ חָכְמַת אֱלֹהִים = מִתְזַנֶּת מֵעַצְמָהּ: תּוֹבָנָה → עוֹד כְּמִיהָה → עוֹד תּוֹבָנָה → עוֹד שַׁלְהֶבֶת. אֵיכוּת קִיּוּם עַצְמִי = סִימַן חָכְמָה אֱלֹהִית אֲמִתִּית. מַרְחִיבָה לֹא מְמַעֶטֶת. נִיצוֹץ קָטָן = מַדְלֵק גָּדוֹל.",
""
),
], "Spark of Divine Wisdom Ignites Living Flame in Heart (1 seg)", "נִיצוֹץ חָכְמָה אֱלֹהִית מַדְלִיק שַׁלְהֶבֶת חַיָּה בַּלֵּב")

# T158: humility = foundation of all spiritual service
torahs[158] = make_data(158, [
seg(1,
"Humility is the foundation of all spiritual service and the key to opening the gates of divine favor. When a person humbles himself before the Creator — genuinely recognizing his own limitations and nullifying his ego — he becomes fit to receive the influx of divine blessing and wisdom. Pride and arrogance are the opposite: they create a 'thick layer' of self that blocks the divine flow, like a solid ceiling that prevents the light from above from entering. Humility is the removal of that ceiling. The humble person does not claim the light as his own — he is transparent and empty enough for divine light to pass through him freely. This is why all the great tzaddikim shared the quality of humility: it was not incidental to their greatness but the very precondition for it. Humility and greatness are not opposites — true humility is the only path to genuine spiritual greatness.",
"Humility = foundation of all spiritual service + key to divine favor. Genuine self-recognition + ego-nullification = fit to receive divine blessing. Pride = thick layer of self blocking divine flow = solid ceiling blocking light. Humility = removing the ceiling. Humble person = transparent and empty → divine light passes through freely. Humility = not incidental to greatness but precondition for it.",
"עֲנָוָה = יְסוֹד כָּל הָעֲבוֹדָה הָרוּחָנִית + מַפְתֵּחַ לְחֶסֶד אֱלֹהִי. הַכָּרָה עַצְמִית אֲמִתִּית + בִּיטּוּל = כָּשֵׁר לְקַבֵּל שֶׁפַע. גַּאֲוָה = שְׁכַבַּת 'עַצְמִי' עָבָה הַחּוֹסֶמֶת שֶׁפַע = תִּקְרָה מַחְשִׁיכָה. עֲנָוָה = הֲסָרַת הַתִּקְרָה. עָנָו = שָׁקוּף וְרֵיקָן → אוֹר אֱלֹהִי עוֹבֵר חָפְשִׁי. עֲנָוָה = לֹא אַקְרָאִית לַגְּדֻלָּה — תְּנַאי מוּקְדָּם לָהּ.",
""
),
], "Humility Is Foundation of All Spiritual Service — Precondition for Greatness (1 seg)", "עֲנָוָה יְסוֹד כָּל הָעֲבוֹדָה — תְּנַאי מוּקְדָּם לַגְּדֻלָּה")

# T159: Shechinah = mediator / distinction in Torah teachings / not every person hears same
torahs[159] = make_data(159, [
seg(1,
"Know that there is a mediator between people and God — and she is the Shechinah (Divine Presence). The Shechinah stands between finite human beings and the infinite divine, translating and transmitting the divine will in ways that humans can receive. In Torah study, there is a known distinction: not every individual is able to hear and receive the same Torah teaching from the same teacher. The teaching that reaches one person as a profound illumination may not reach another person at all. This is because the Shechinah mediates between the teacher and each student according to that student's spiritual vessel and readiness. The Torah is one, but the Shechinah distributes it to each person in the measure and form that matches their soul.",
"Shechinah = mediator between people and God. Shechinah translates/transmits divine will in ways humans can receive. In Torah study: not every person can hear same teaching from same teacher. Teaching that illuminates one may not reach another. Because Shechinah mediates teacher→student according to student's spiritual vessel. Torah is one, but Shechinah distributes it to each person in measure matching their soul.",
"יֵדַע שֶׁיֵּשׁ מְמַצֵּעַ וְהִיא הַשְּׁכִינָה. שְׁכִינָה = מְמַצֵּעַ בֵּין אָדָם לֵאלֹהִים. בְּלִמּוּד תּוֹרָה: לֹא כָּל אָחָד מְסֻגָּל לִשְׁמֹעַ אוֹתָהּ תּוֹרָה מֵאוֹתוֹ מוֹרֶה. תּוֹרָה שֶׁמֵּאִירָה לְזֶה אֵינָהּ מַגִּיעָה לַאֲחֵר. כִּי שְׁכִינָה מְמַצֵּעָת מוֹרֶה→תַּלְמִיד לְפִי כְּלִי הַנֶּפֶשׁ. תּוֹרָה אַחַת — שְׁכִינָה מְחַלֶּקֶת לְכָל אֶחָד לְפִי מִדָּתוֹ.",
""
),
], "Shechinah Is Mediator — Each Person Receives Torah Through Their Soul's Vessel (1 seg)", "הַשְּׁכִינָה הִיא הַמְּמַצֵּעַ — כָּל אֶחָד מְקַבֵּל תּוֹרָה דֶּרֶךְ כְּלִי נַפְשׁוֹ")

# T160: pulse knocks in person / sometimes reminding of service / sometimes of transgression
torahs[160] = make_data(160, [
seg(1,
"The pulse knocks and knocks in a person. Sometimes it knocks and reminds one of the service of God — as in the verse 'The voice of my beloved knocks' (Song of Songs 5:2). Sometimes it reminds one of transgression, God forbid. The pulse stems from breathing, which comes from the divine breath of life that God breathed into Adam (Genesis 2:7). The pulse is thus the ongoing echo of that original divine breath — it carries within it both the call to divine service and, when distorted, the temptation toward sin. The teaching: pay attention to the pulse, to the inner knocking. When it calls to divine service, follow it immediately. When it seems to call toward transgression, recognize that underneath that distorted call is still the same divine breath — a fallen form of the call to holiness — and redirect it toward God.",
"Pulse knocks in person. Sometimes reminding of service (Song of Songs 5:2). Sometimes of transgression. Pulse stems from breathing = from divine breath God breathed into Adam (Ber 2:7). Pulse = ongoing echo of original divine breath. Contains both call to service and (when distorted) temptation to sin. Teaching: pay attention to inner knocking. When calls to service — follow immediately. When seems toward transgression — recognize it as fallen call to holiness, redirect.",
"הַדּוֹפֶק דּוֹפֵק וְדוֹפֵק בָּאָדָם. לִפְעָמִים מְזַכִּיר עֲבוֹדָת ה' ('קוֹל דּוֹדִי דּוֹפֵק' שה\"ש ה:ב). לִפְעָמִים מְזַכִּיר עֲבֵרָה. הַדּוֹפֶק = מִנְּשִׁימָה = מִנִּשְׁמַת חַיִּים שֶׁנָּפַח ה' בְּאָדָם (בר' ב:ז). דּוֹפֶק = הֵד מְתָמִיד לַנְּשִׁימָה הָאֱלֹהִית הָרִאשׁוֹנָה. לִמּוּד: שִׂים לֵב לַדְּפִיקָה הַפְּנִימִית. כְּשֶׁקּוֹרֵא לַעֲבוֹדָה — עֲקֹב מִיָּד. כְּשֶׁקּוֹרֵא לַחֵטְא — הַכֵּר כְּקְרִיאָה נְפוּלָה לְקֹדֶשׁ, כַּוֵּן מֵחָדָשׁ.",
"שה\"ש ה:ב; בר' ב:ז."
),
], "Pulse Knocks in Person — Divine Breath / Call to Service or Transgression (1 seg)", "הַדּוֹפֶק דּוֹפֵק — הַנְּשִׁימָה הָאֱלֹהִית / קְרִיאָה לַעֲבוֹדָה")

# T161: controversy elevates person / man = tree of field (Devarim 20) / tree on ground rises with flood waters
torahs[161] = make_data(161, [
seg(1,
"The controversy (machloket) actually elevates and raises the person — despite appearing to be damaging. The teaching comes from the verse 'Man is the tree of the field' (Deuteronomy 20:19). A tree lying on the ground cannot rise by itself; it can only be raised when flooding waters come and lift it. Similarly, controversy is compared to water — 'They surrounded me like water all day' (Lamentations 3:54). The controversy that surrounds a person is like floodwaters rising around a fallen tree: if the person can remain grounded and not be overwhelmed, the waters of controversy actually lift him up. The person who is attacked, disputed, and opposed — if he maintains his inner stability and does not retaliate or collapse — finds himself elevated above where he was before the controversy began. The controversy becomes his vehicle of ascent.",
"Controversy elevates the person. Devarim 20:19: 'man is tree of field.' Tree on ground can't rise alone — only when floodwaters lift it. Controversy = water (Eicha 3:54: 'surrounded me like water'). Controversy = floodwaters around fallen tree. If person remains grounded and not overwhelmed = lifted up by the controversy. Person attacked but stable = elevated above previous position. Controversy = vehicle of ascent.",
"מַחֲלֹקֶת מֵרִימָה אֶת הָאָדָם. דב' כ:יט: 'כִּי הָאָדָם עֵץ הַשָּׂדֶה.' עֵץ בָּאָרֶץ אֵינוֹ יָכוֹל לָקוּם לְבַדּוֹ — רַק כְּשֶׁמַּיִם שׁוֹטְפִים מְרִימִים אוֹתוֹ. מַחֲלֹקֶת = מַיִם (אֵיכָה ג:נד: 'צָפוּ מַיִם עַל רֹאשִׁי'). מַחֲלֹקֶת = שִׁטָּפוֹן מַיִם סָבִיב עֵץ. אִם הָאָדָם מָשׁוּל וְלֹא נִשְׁטָף — נִשָּׂא. הַמּוּתְקָף וְהַיָּצִיב = מוּרָם מֵעַל מַקּוֹמוֹ. מַחֲלֹקֶת = רֶכֶב עֲלִיָּתוֹ.",
"דב' כ:יט; אֵיכָה ג:נד."
),
], "Controversy Elevates the Person — Man as Tree / Floodwaters of Machloket (1 seg)", "הַמַּחֲלֹקֶת מֵרִימָה אֶת הָאָדָם — הָאָדָם כְּעֵץ / שִׁטָּפוֹן הַמַּחֲלֹקֶת")

# T162: story of Maggid / rich man opposed Maggid's followers / drawn near / became follower
torahs[162] = make_data(162, [
seg(1,
"In the days of the Maggid (Rabbi Dov Ber of Mezeritch, the successor of the Baal Shem Tov), there was a wealthy man of distinguished lineage who opposed the Maggid's followers and the Chassidic movement. The followers reported this to the Maggid, who urged them: draw him near. He instructed them to work greatly to bring this man close, to pray for God's help in the effort, and to persist. Through their great effort and prayer, they succeeded — they brought the man to the Maggid, and he became a devoted follower. The lesson: when faced with opposition, the response of the true tzaddik and his followers is not confrontation or rejection but drawing-near (kiruv). The power of love and genuine outreach can transform even the most resistant opponent. The effort and prayer invested in bringing the person close are themselves a form of divine service.",
"Story from Maggid's time (R' Dov Ber of Mezeritch). Rich man of lineage opposed Maggid's followers. Maggid's response: draw him near (not confront/reject). Urged great effort + prayer for God's help. Result: they succeeded → man brought to Maggid → became devoted follower. Lesson: response to opposition = kiruv (drawing near). Love + genuine outreach transforms resistant opponent. Effort + prayer in kiruv = divine service.",
"בִּימֵי הַמַּגִּיד (ר' דּוֹב בֶּר מֵמֶּעֶזְרִיטְשׁ). עָשִׁיר בַּעַל יִחוּס הִתְנַגֵּד לַחֲסִידִים. תְּגוּבַת הַמַּגִּיד: קָרְבוּ אוֹתוֹ (לֹא עִמּוּת). עוֹרֵר מְאֹד + תְּפִלָּה לְעֶזְרָה. תוֹצָאָה: הִצְלִיחוּ → הֵבִיאוּ לַמַּגִּיד → נַעֲשָׂה חָסִיד. לִמּוּד: תְּגוּבָה לְהִתְנַגְּדוּת = קֵרוּב. אַהֲבָה + הֲגָשָׁה אֲמִתִּית = מְשַׁנָּה אֶת הַמּוּתְנַגֵּד. אֶמֶץ + תְּפִלָּה בְּקֵרוּב = עֲבוֹדַת ה'.",
""
),
], "Story of the Maggid — Rich Man Drawn Near / Kiruv Over Confrontation (1 seg)", "סִפּוּר הַמַּגִּיד — עָשִׁיר מִתְקָרֵב / קֵרוּב עַל פְּנֵי עִמּוּת")

# T163: speech ready to exit / only exits through neck / three klipot seize speech
torahs[163] = make_data(163, [
seg(1,
"Sometimes speech is placed and ready to exit — the words are formed within a person, the thought is complete, the divine inspiration is present — but the words emerge not through the mouth in the normal way, only through the neck (one can actually hear speech exiting through the neck rather than the mouth in such cases). There are three klipot (spiritual husks/forces of impurity) that always seek to seize speech — especially holy speech from a great person. These three klipot try to capture the divine speech before it fully emerges through the proper channel. The teaching: when one feels inspired to say something holy and true — a teaching of Torah, a prayer, a word of encouragement or rebuke — there is a spiritual battle over that speech. The forces of impurity want to intercept or distort it. The person must push through with the speech despite the obstruction, because the speech that emerges despite the klipot is purified by the very resistance it overcame.",
"Sometimes speech is placed/ready but exits only through neck, not mouth (audible). Three klipot always seek to seize speech, especially holy speech from great person. Spiritual battle over holy speech. Forces of impurity = intercept or distort. Teaching: push through with speech despite obstruction. Speech that emerges despite klipot = purified by the resistance it overcame.",
"לִפְעָמִים דִּבּוּר מוּנָּח וּמוּכָן לָצֵאת — אַךְ יוֹצֵא רַק דֶּרֶךְ הַצַּוָּאר, לֹא הַפֶּה (נִשְׁמָע). שָׁלשׁ קְלִיפּוֹת תָּמִיד מְחַפְּשׂוֹת לִתְפֹּס דִּבּוּר, בִּמְיוּחָד דִּבּוּר קָדוֹשׁ שֶׁל גָּדוֹל. מַאֲבָק רוּחָנִי עַל דִּבּוּר קָדוֹשׁ. כֹּחוֹת הַטֻּמְאָה = יוֹצְאִים לִיְרֹט. לִמּוּד: דְּחֹק בַּדִּבּוּר אַף עִם חֲסִימָה. דִּבּוּר שֶׁיָּצָא אַף עִם קְלִיפּוֹת = מְטוּהָר מֵהַהִתְנַגְּדוּת.",
""
),
], "Speech Ready But Seized by Klipot — Push Through Despite Obstruction (1 seg)", "דִּבּוּר מוּכָן אַךְ נִתְפָּס בַּקְּלִיפּוֹת — דְּחֹק בַּדִּבּוּר לְמַרְות הַחֲסִימָה")

# T164: stories of true tzaddik / sick doctor yielding to great doctor / approach tzaddik for right remedy
torahs[164] = make_data(164, [
seg(1,
"Regarding stories of the true tzaddik: consider the analogy of a sick doctor being treated by a great doctor. The sick doctor knows many remedies — tooth extraction, shaving, various procedures he learned in his training — and he wants to apply these to himself. But the great doctor sees that the patient needs entirely different, more precious and specific remedies. The sick doctor's knowledge, while real, is wrong for his particular situation. Similarly, a person who approaches the tzaddik of the generation brings his own understanding of what he needs and what remedies he thinks are appropriate for his spiritual situation. But the tzaddik, who sees more deeply, knows what the person truly needs — which may be completely different from what the person thinks he needs. The teaching: stories about the tzaddik's activities and guidance carry within them the specific remedies for specific spiritual illnesses, even when the person hearing the story doesn't understand how.",
"Analogy: sick doctor being treated by great doctor. Sick doctor wants his own learned remedies; great doctor knows what's actually needed. Person approaching tzaddik: brings own understanding of what he needs. Tzaddik sees more deeply = knows truly needed (may be completely different). Stories of tzaddik = specific remedies for specific spiritual illnesses, even when listener doesn't understand how.",
"מָשָׁל: רוֹפֵא חוֹלֶה שֶׁמְּטַפֵּל בּוֹ רוֹפֵא גָּדוֹל. הָרוֹפֵא הַחוֹלֶה רוֹצֶה תְּרוּפוֹת שֶׁלָּמַד; הָרוֹפֵא הַגָּדוֹל יוֹדֵעַ מַה שֶּׁצָּרִיךְ. אָדָם הַמִּתְקָרֵב לַצַּדִּיק: מֵבִיא הֲבָנָתוֹ עַצְמוֹ. הַצַּדִּיק רוֹאֶה יוֹתֵר = יוֹדֵעַ מַה שֶּׁבֶּאֱמֶת צָרִיךְ (עֲשׂוּי לְהִשְׁתַּנּוֹת לְגַמְרֵי). סִיפּוּרֵי הַצַּדִּיק = תְּרוּפוֹת מְיוּחָדוֹת לַחֳלָאִים רוּחָנִיִּים מְיוּחָדִים.",
""
),
], "Stories of the Tzaddik — Sick Doctor Analogy / Right Remedy vs Known Remedy (1 seg)", "סִיפּוּרֵי הַצַּדִּיק — מָשַׁל רוֹפֵא חוֹלֶה / הַתְּרוּפָה הַנְּכוֹנָה")

# T165: "Love your neighbor — I am God" (Vayikra 19) / receive all evils lovingly / "love the evil"
torahs[165] = make_data(165, [
seg(1,
"The verse: 'Love your neighbor as yourself — I am God' (Leviticus 19:18). Rabbeinu teaches: receive lovingly all the evils and sufferings that befall you, knowing that according to your deeds, despite all the sufferings and evils, God is still dealing with you mercifully — for more was due to you by strict justice, God forbid. Thus, 'love your neighbor' — love the evil (the ra'ot, the bad things) that befall you, as yourself. This is an astonishing reading: 'your neighbor' (re'ekha) is connected to 'ra' (evil) — the evils that are your 'neighbors,' that come close to you. And 'I am God' — the God who is with you even in the suffering is the very ground of this love. The ability to love one's sufferings is not stoicism but faith: trusting that God who 'is' the 'I AM' is present even in the hardship, and that His presence there is itself a form of mercy.",
"Vayikra 19:18: 'Love your neighbor as yourself — I am God.' Teaching: receive all evils/sufferings lovingly. Knowing: by your deeds, more was due — God is still being merciful. 'Love your neighbor (re'ekha)' = love the evil (ra'ot) that befall you, as yourself. 'I am God' = God present even in suffering = ground of this love. Ability to love sufferings = not stoicism but emunah: God present in hardship = Himself a form of mercy.",
"וי' י\"ט:יח: 'וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ אֲנִי ה'.' קַבֵּל בְּאַהֲבָה כָּל הָרָעוֹת וְהַיִּסּוּרִים. דֵּעָה: לְפִי מַעֲשֶׂיךָ, אַף בְּכָל הַיִּסּוּרִים, ה' עוֹד מִתְנַהֵג עִמְּךָ בְּרַחֲמִים — כִּי יָדוּעַ שֶׁהָיָה מַגִּיעַ יוֹתֵר. 'לְרֵעֲךָ' = אֱהֹב הָרַע הַבָּא עָלֶיךָ כְּמוֹ לְעַצְמְךָ. 'אֲנִי ה'' = ה' נוֹכֵחַ אַף בַּסֵּבֶל = בַּסִּיס הָאַהֲבָה הַזּוֹ. אַהֲבַת הַיִּסּוּרִים = לֹא סְטוֹאִיּוּת — אֱמוּנָה.",
"וי' י\"ט:יח."
),
], "Love Your Neighbor — I Am God / Receive All Evils Lovingly / Emunah in Suffering (1 seg)", "וְאָהַבְתָּ לְרֵעֲךָ — אֲנִי ה' / קַבֵּל כָּל הָרָעוֹת בְּאַהֲבָה")

# T166: when world is with tzaddik, he has dominion / Elisha "man of God" vs "Elisha"
torahs[166] = make_data(166, [
seg(1,
"When the world is with the tzaddik — when the people around him are aligned with his spiritual level and receive from him — then he has true dominion and influence. The Talmud and Zohar (Beshalach 44a) note that Elisha is at times called 'the man of God' and at times simply 'Elisha.' When he is called 'man of God,' it reflects a state where his followers and the world around him were in alignment — his greatness was fully manifest. When called merely 'Elisha,' he was in a diminished state, where the world around him was not receiving from him in the same way. The Zohar notes: 'When the sons of the prophets were with him, his spiritual level was elevated.' The tzaddik's revealed greatness is not entirely his own; it depends in part on the quality of those who receive from him. This is not a limitation but a mystical truth: the teacher cannot be fully revealed without students ready to receive.",
"When world/people are with tzaddik = tzaddik has dominion. Zohar Beshalach 44a: Elisha called 'man of God' when followers aligned = greatness manifest. Called merely 'Elisha' when world not receiving = diminished state. 'When sons of prophets were with him = elevated.' Tzaddik's revealed greatness depends on quality of receivers. Not a limitation — mystical truth: teacher cannot be fully revealed without ready students.",
"כְּשֶׁהָעוֹלָם עִם הַצַּדִּיק = לְצַדִּיק שְׁלִיטָה. זֹהַר בְּשַׁלַּח מ\"ד:: אֱלִישָׁע נִקְרָא 'אִישׁ הָאֱלֹהִים' כְּשֶׁחֲסִידָיו מְיֹשָּׁרִים = גְּדֻלָּתוֹ מְגֻלָּה. נִקְרָא רַק 'אֱלִישָׁע' כְּשֶׁהָעוֹלָם אֵינוֹ מְקַבֵּל = מַצָּב מְצוּמְצָם. 'בְּהָיוֹת בְּנֵי הַנְּבִיאִים עִמּוֹ = נִשָּׂא.' גְּדֻלַּת הַצַּדִּיק הַגְּלוּיָה תְּלוּיָה בְּאֵיכוּת הַמְּקַבְּלִים. לֹא חִסְּרוֹן — אֱמֶת מִסְטִית.",
"זֹהַר בְּשַׁלַּח מ\"ד:."
),
], "When World Is With Tzaddik He Has Dominion — Elisha Man of God / Receivers (1 seg)", "כְּשֶׁהָעוֹלָם עִם הַצַּדִּיק יֵשׁ לוֹ שְׁלִיטָה — אֱלִישָׁע אִישׁ הָאֱלֹהִים")

# T167: Shabbatot spent with true Torah scholar = like a fast day
torahs[167] = make_data(167, [
seg(1,
"Know and believe: the Shabbatot (Sabbaths) spent in the presence of a true Torah scholar — resting together with him, being in his spiritual proximity — carry the same spiritual significance as a fast day. This is a striking teaching: Shabbat, which is a day of eating, drinking, pleasure, and delight, is spiritually elevated to the level of a fast day when spent in the right company. How? A fast day is a day of spiritual purification, of emptying oneself of the physical in order to receive the spiritual. The presence of the true Torah scholar accomplishes the same purification without the physical deprivation: his Torah, his conversation, his very presence causes the same spiritual cleansing and elevation that a fast day achieves through abstinence. Shabbat with the right teacher is therefore not merely rest — it is a complete spiritual purification.",
"Know and believe: Shabbatot spent with true Torah scholar = same significance as fast day. Striking: Shabbat = eating/pleasure/delight, yet elevated to level of fast day. How? Fast day = spiritual purification through physical emptying. True Torah scholar accomplishes same purification without deprivation — through his Torah/conversation/presence. Shabbat with right teacher = not merely rest = complete spiritual purification.",
"יֵדַע וְיַאֲמִין: שַׁבָּתוֹת שֶׁנִּחִין אֵצֶל תַּלְמִיד חָכָם אֲמִתִּי = כְּמוֹ יוֹם תַּעֲנִית. מַפְתִּיעַ: שַׁבָּת = אֲכִילָה/עֹנֶג, אַךְ מוּרָמָה לְדַרְגַּת תַּעֲנִית. כֵּיצַד? תַּעֲנִית = טִהָרָה רוּחָנִית דֶּרֶךְ רֵיקוּן גּוּפָנִי. תַּלְמִיד חָכָם אֲמִתִּי מַשִּׂיג אֵיתוֹ טִהָרָה בְּלִי קִפּוּחַ — דֶּרֶךְ תּוֹרָתוֹ/שִׂיחָתוֹ/נוֹכְחוּתוֹ. שַׁבָּת עִם מוֹרֶה נָכוֹן = לֹא רַק מְנוּחָה = טִהָרָה רוּחָנִית שְׁלֵמָה.",
""
),
], "Shabbat With Torah Scholar = Like a Fast Day — Presence as Purification (1 seg)", "שַׁבָּת עִם תַּלְמִיד חָכָם כְּיוֹם תַּעֲנִית — נוֹכְחוּת כְּטִהָרָה")

# T168: gadlut = sign trouble coming / Mishlei 16:18 / when lowly = sign greatness coming
torahs[168] = make_data(168, [
seg(1,
"When greatness (gadlut) — pride, elevated feelings, a sense of one's own importance — comes to a person, it is a sign that trouble (tzarah) will come to him, God forbid. As it is written: 'Before destruction comes pride' (Proverbs 16:18). The inflated sense of self is a spiritual warning sign — it signals that a fall is approaching. Conversely, when a person is lowly and feels small and humble, that is actually a sign that greatness is coming to him. The spiritual reality is the inverse of the psychological expectation: feeling great = trouble approaching; feeling small = greatness approaching. The teaching: when one notices feelings of pride and self-importance arising, treat them as an alarm — not an achievement. And when one feels lowly and humbled, treat that as an auspicious sign — not a defeat.",
"When gadlut (pride/elevated sense) comes to person = sign trouble (tzarah) will come. Mishlei 16:18: 'Before destruction comes pride.' Inflated self = spiritual warning sign = fall approaching. Conversely: when lowly and humble = sign that greatness is coming. Spiritual reality = inverse of psychological expectation. Feeling great = trouble; feeling small = greatness. Teach: pride feelings = alarm, not achievement. Lowliness = auspicious sign, not defeat.",
"כְּשֶׁגַּדְלוּת בָּאָה לָאָדָם = סִימָן שֶׁצָּרָה תָּבוֹא. מִשְׁלֵי ט\"ז:יח: 'לִפְנֵי שֶׁבֶר גָּאוֹן.' תְּחוּשַׁת גְּדֻלָּה = אַזְהָרָה רוּחָנִית = נְפִילָה מִתְקָרֶבֶת. לְהֵפֶךְ: כְּשֶׁשָּׁפָל = סִימָן שֶׁגְּדֻלָּה בָּאָה. הַמְּצִיאוּת הָרוּחָנִית = הֵפֶךְ הַצִּפִּיָּה הַפְּסִיכוֹלוֹגִית. גָּדוֹל מַרְגִּישׁ = צָרָה; קָטָן מַרְגִּישׁ = גְּדֻלָּה. גַּאֲוָה = אַזְעָקָה. שִׁפְלוּת = אוֹת מְאַשֵּׁרֶת.",
"מִשְׁלֵי ט\"ז:יח."
),
], "Gadlut Signals Trouble Coming — Pride Before Destruction / Inverse Spiritual Reality (1 seg)", "גַּדְלוּת סִימַן צָרָה תָּבוֹא — גַּאֲוָה לִפְנֵי שֶׁבֶר / מְצִיאוּת הֲפוּכָה")

# T169: "eikev (because) you will listen" (Devarim 7:12) / troubles → dancing impossible / judgments = agents/runners
torahs[169] = make_data(169, [
seg(1,
"Opening verse: 'And it shall be, because (eikev) you will listen' (Deuteronomy 7:12). When there are troubles — whether communal or individual — dancing becomes impossible. For when divine judgments (dinim) prevail and dominate, they are handed over to the agents of judgment, who are called 'runners' (ratzim) in the Zohar (Bereishit 43a). These agents of judgment run and execute the decrees. The 'heels' (akev, from the same root as eikev) of a person — the lowest, most material part — are the place from which these runners take hold. But through dancing, through the elevation of the feet and heels in joy, the person lifts his 'heels' above the domain of the runners of judgment. This is why dancing is a spiritual weapon against troubles: it elevates the very point where the agents of judgment try to seize hold, transforming the heel (akev) into the vehicle of listening (eikev) and blessing.",
"Devarim 7:12. When troubles prevail: dancing impossible. When dinim prevail = handed to agents of judgment = 'runners' (ratzim, Zohar Ber 43a). Runners take hold through the 'heels' (akev). Dancing = elevates feet/heels above domain of runners. Why dancing fights troubles: lifts the heel (akev) above agents of judgment → transforms heel into eikev (listening/blessing).",
"דב' ז:יב. כְּשֶׁיֵּשׁ צָרוֹת: רִקּוּד אִי-אֶפְשָׁר. כְּשֶׁדִּינִים שׁוֹלְטִים = נִמְסָרִים לְשָׁלִיחֵי דִּין = 'רָצִים' (זֹהַר בר' מ\"ג:). הָרָצִים אוֹחֲזִים דֶּרֶךְ הָעֲקֵבִים. רִקּוּד = מֵרִים רַגְלַיִם/עֲקֵבִים מֵעַל תְּחוּם הָרָצִים. לָמָּה רִקּוּד נֶגֶד צָרוֹת: מֵרִים הָעָקֵב (עֵקֶב) מֵעַל שָׁלִיחֵי הַדִּין → הוֹפֵךְ עֵקֶב לְ'עֵקֶב' (שְׁמִיעָה/בְּרָכָה).",
"דב' ז:יב; זֹהַר בר' מ\"ג:."
),
], "Eikev You Will Listen — Dancing Fights Troubles / Heels Above Agents of Judgment (1 seg)", "עֵקֶב תִּשְׁמְעוּן — רִקּוּד נֶגֶד צָרוֹת / עֲקֵבִים מֵעַל שָׁלִיחֵי הַדִּין")

# T170: "Hashem how many are my foes" (Teh 3:2) / each person's foes match their soul/service level
torahs[170] = make_data(170, [
seg(1,
"Opening verse: 'Hashem, how many are my foes; many rise up against me' (Psalms 3:2). Each person, according to their soul and the level of their divine service, has their own specific form of suffering. One person suffers from his children, his father, or a close neighbor. Another — on a higher spiritual level — suffers from more distant opponents. One grows beyond local conflict and finds his foes even further afield. The teaching: the nature and scope of one's foes and sufferings are a direct reflection of one's spiritual level. A person who only suffers from small, close conflicts is operating at a lower spiritual level. As one rises spiritually, the opposition also rises — becoming more formidable, more encompassing, more 'many.' This is why the verse says 'how many' — the multitude of foes is itself a testament to the person's spiritual stature. The more one grows, the greater the opposition becomes, because there is more at stake and more to protect.",
"Teh 3:2: 'How many are my foes.' Each person: suffering matches soul-level and divine service. Lower level: suffers from close conflicts (children, father, near neighbor). Higher level: foes from further afield, more formidable. Nature/scope of foes = direct reflection of spiritual level. 'How many' = multitude of foes = testament to spiritual stature. More one grows = greater opposition. Because more is at stake.",
"תה' ג:ב: 'ה' מָה רַבּוּ צָרָי.' כָּל אָדָם: הַסֵּבֶל מְשַׁקֵּף דַּרְגַּת נַפְשׁוֹ וְעֲבוֹדָתוֹ. דַּרְגָּה נְמוּכָה: סוֹבֵל מֵקוֹנְפְלִיקְטִים קְרוֹבִים (בָּנִים, אָב, שָׁכֵן). דַּרְגָּה גְּבוֹהָה: אוֹיְבִים מֵרָחוֹק, יוֹתֵר עֲצוּמִים. אֹפִי הַצָּרוֹת = שִׁקּוּף יָשִׁיר שֶׁל דַּרְגָּה רוּחָנִית. 'מָה רַבּוּ' = רִיבּוּי אוֹיְבִים = עֵדוּת לְקוֹמַת הָאָדָם. יוֹתֵר גָּדֵל = יוֹתֵר הִתְנַגְּדוּת.",
"תה' ג:ב."
),
], "Hashem How Many Are My Foes — Foes Match Soul Level / Multitude of Foes = Spiritual Stature (1 seg)", "ה' מָה רַבּוּ צָרָי — הָאוֹיְבִים מְשַׁקְּפִים דַּרְגַּת הַנֶּפֶשׁ")

# T171: "many who sleep in dust shall awaken" (Daniel 12:2) / new intellect = waking from dust
torahs[171] = make_data(171, [
seg(1,
"Opening verse: 'And many of those who sleep in the dust of the earth shall awaken: these to everlasting life, and these to shame and everlasting abhorrence' (Daniel 12:2). Through the awakening of a new intellect in divine service — when a person discovers something previously unknown to him, a fresh insight into how to serve God — 'many of those who sleep in the dust shall awaken.' The people who were spiritually dormant, who were 'sleeping in the dust' — embedded in materiality and spiritual inertia — are awakened by the new light of this fresh understanding. This is the mechanism of spiritual revival: the awakening of one person's new intellect creates a ripple that wakes up many others. This is also why the verse speaks of 'many' — one new revelation of how to serve God, discovered by one person and shared, can awaken multitudes from their spiritual slumber. The 'everlasting life' that follows is the permanent spiritual elevation that this awakening brings.",
"Daniel 12:2: 'Many who sleep in dust shall awaken.' Through awakening of new intellect in divine service — fresh insight into serving God — many sleeping in dust are awakened. Dormant/materially-embedded people = 'sleeping in dust.' New understanding = ripple that wakes multitudes. Mechanism of spiritual revival: one person's fresh revelation → many awaken. 'Everlasting life' = permanent elevation following the awakening.",
"דָּנִיֵּאל י\"ב:ב: 'וְרַבִּים מִיְּשֵׁנֵי אַדְמַת עָפָר יָקִיצוּ.' דֶּרֶךְ הִתְעוֹרְרוּת שֵׂכֶל חָדָשׁ בַּעֲבוֹדַת ה' — תּוֹבָנָה טְרִיָּה — 'יִישֵׁנֵי עֲפָר יָקִיצוּ.' הַנִּמְנָעִים רוּחָנִית/הַשְּׁקוּעִים בְּחוֹמֶר = 'יְשֵׁנִים בֶּעָפָר.' הֲבָנָה חֲדָשָׁה = גַּל מְעִיר רַבִּים. מֶכָנִיזְם הַתְּחִיָּה הָרוּחָנִית: גִּלּוּי חָדָשׁ שֶׁל אֶחָד → מֵעִיר רַבִּים. 'חַיֵּי עוֹלָם' = הַגְבָּהָה קְבוּעָה בְּעֶקְבוֹת הַהִתְעוֹרְרוּת.",
"דָּנִיֵּאל י\"ב:ב."
),
], "Many Sleeping in Dust Shall Awaken — New Intellect Awakens Multitudes (1 seg)", "רַבִּים מִיְּשֵׁנֵי אַדְמַת עָפָר יָקִיצוּ — שֵׂכֶל חָדָשׁ מֵעִיר רַבִּים")

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
print('lm-commentaries.json updated for T157-T171')

subprocess.run(['git', 'add'] + git_files, cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T157-T171 PNC -- divine-spark/humility/shechinah-mediator/pulse/controversy-elevates/klipot-speech/love-evils/gadlut-alarm/dancing-fights-troubles (15 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:250])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
