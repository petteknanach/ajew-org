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

# T112: 5 segs — "Make a tzohar for the ark" / sitra achara surrounds holiness / truth-word opens darkness / open the other side / middle path
torahs[112] = make_data(112, [
seg(1,
"Opening verse: 'Make a tzohar (light/window) for the ark, and finish it to a cubit from above' (Genesis 6:16). Rashi explains that 'tzohar' means either a precious stone that illuminates or a window. Rabbeinu builds on this: it is known that 'around the wicked they walk' (Psalms 12) — the sitra achara (the Other Side, the side of spiritual evil) surrounds holiness, just as God made 'one opposite the other' (Ecclesiastes 7:14). This is especially true for someone who has already been drawn after transgressions — the darkness of the sitra achara is most dense around such a person. Yet the teaching comes to say: even within the darkest situation, there is a tzohar — a window of light, an opening — that can be found and used.",
"Ber 6:16: 'Make a tzohar for the ark.' Rashi: tzohar = precious stone or window. Teh 12: sitra achara surrounds holiness = one opposite the other (Koh 7:14). Dense darkness surrounds those who have transgressed. Yet: even within darkest situation there is a tzohar — a window of light.",
"בר' ו:טז: 'צֹהַר תַּעֲשֶׂה לַתֵּבָה.' רש\"י: צֹהַר = אֶבֶן טוֹבָה אוֹ חַלּוֹן. תה' יב: סִטְרָא אָחֳרָא מַקִּיף קְדֻשָּׁה = 'זֶה לְעוּמַּת זֶה' (קֹה' ז:יד). חֹשֶׁךְ עָבֶה סוֹבֵב עוֹבְרֵי עֲבֵרָה. אַף בָּחֹשֶׁךְ הַכָּבֵד יֵשׁ צֹהַר — חַלּוֹן אוֹר.",
"בר' ו:טז; תה' יב; קֹה' ז:יד."
),
seg(2,
"The way to find the tzohar even within deep darkness: speak the truth. Even a person who cannot pray with enthusiasm or proper spiritual arousal — even if his prayer feels flat and lifeless — if he says even one word in truth, according to what he genuinely is in that moment, then through that word of truth he begins to see the openings that exist within the darkness itself. The darkness is not total; it has internal windows. And by speaking truth, the person merits to exit from darkness to light.",
"The tzohar is found through truth-speech. Even flat prayer = if said in truth, seeing opens. Example: saying 'Hashem save' in truth, even without arousal. Through the word of truth, one sees openings within darkness → merits to exit darkness to light.",
"הַצֹּהַר נִמְצָא דֶּרֶךְ דִּבּוּר אֱמֶת. אַף תְּפִלָּה שְׁטוּחָה = אִם בֶּאֱמֶת, עֵינַיִם נִפְקָחוֹת. דּוּגְמָא: 'ה' הוֹשִׁיעָה' בֶּאֱמֶת אַף בְּלִי הִתְלַהֲבוּת. דֶּרֶךְ דִּבּוּר אֱמֶת רוֹאֶה פְּתָחִים בְּתוֹךְ הַחֹשֶׁךְ → יוֹצֵא מֵחֹשֶׁךְ לְאוֹר.",
"בר' ו:טז."
),
seg(3,
"'And the door of the ark you shall place in its side' — this means: make an opening even in those who are 'from the side,' that is, those who are from the Other Side, not from the side of holiness. The teaching here extends to the work of reaching even the most distant souls — those deeply embedded in the sitra achara. Even for them, an opening can be made, a door placed in their side, to arouse their hearts to return. The work of the tzaddik extends to such souls: to find and make the opening that allows them to begin to exit the darkness.",
"'Door of the ark in its side' = make opening even for those from the Other Side, not from holiness. Tzaddik's work extends to distant souls deeply in sitra achara. An opening can always be made to arouse hearts and allow return.",
"'פֶּתַח הַתֵּבָה בְּצִדָּהּ תָּשִׂים' = לַעֲשׂוֹת פֶּתַח אַף לְאֵלֶּה מֵ'הַצַּד,' מִסִּטְרָא אָחֳרָא. עֲבוֹדַת הַצַּדִּיק מַגִּיעָה לַנְּשָׁמוֹת הַמְּרֻחָקוֹת. תָּמִיד אֶפְשָׁר לַעֲשׂוֹת פֶּתַח לְעוֹרֵר לְתְשׁוּבָה.",
"בר' ו:טז."
),
seg(4,
"'Lower, second, and third' (the three decks of the ark) correspond to the three worlds: action (asiyah), formation (yetzirah), and creation (beriyah). The tzohar — the light-window — must penetrate all three levels. The work of spiritual illumination is not only in the highest realms but must reach down through all three 'decks' to the lowest level. This is the comprehensive nature of the ark's light: it illuminates from the very top (the cubit opening above) all the way down through all three levels.",
"'Lower, second, third' = three worlds: asiyah, yetzirah, beriyah. Tzohar must penetrate all three levels. Spiritual illumination not only in high realms — must reach down through all three 'decks.' Ark's cubit-light = comprehensive illumination from top through all levels.",
"'תַּחְתִּיִּים, שְׁנִיִּים, שְׁלִישִׁים' = שְׁלֹשָׁה עוֹלָמוֹת: עֲשִׂיָּה, יְצִירָה, בְּרִיאָה. הַצֹּהַר חוֹדֵר כָּל שְׁלֹשָׁה. הָאָרָה רוּחָנִית עַד לְמַטָּה. אוֹר הָאַמָּה = הָאָרָה מְקִיפָּה.",
"בר' ו:טז."
),
seg(5,
"The middle path is always best — as Avot (chapter 2) teaches: 'Torah is good with derech eretz' (wisdom and worldly engagement together). This corresponds to being between north and south — between the extremes. The ark is oriented to the middle path: the tzohar (window/light) placed at the top navigates between the extremes of north (representing wisdom) and south (representing wealth), holding them in proper balance. Prayer — which is the aspect of one's 'bed' (resting place/inner sanctuary) — must similarly be positioned in the middle, balanced between wisdom and material concerns, neither entirely detached nor entirely material.",
"Avot 2: 'Torah good with derech eretz.' Middle path = between north and south = between wisdom and wealth. Ark = middle path. Prayer = aspect of inner bed = balanced between wisdom and material = middle path. Neither extreme is right.",
"אבות ב: 'תּוֹרָה יָפָה עִם דֶּרֶךְ אֶרֶץ.' דֶּרֶךְ אֶמְצָעִי = בֵּין צָפוֹן וְדָרוֹם = בֵּין חָכְמָה לְעֹשֶׁר. הַתֵּבָה = דֶּרֶךְ אֶמְצָעִי. תְּפִלָּה = מִטָּה הַפְּנִימִית = מְאוּזֶנֶת בֵּין חָכְמָה לְחוֹמֶר.",
"אבות ב; בר' ו:טז."
),
], "Make a Tzohar — Light in Darkness / Truth Opens / Middle Path (5 segs)", "צֹהַר תַּעֲשֶׂה לַתֵּבָה — אוֹר בְּחֹשֶׁךְ, אֱמֶת פּוֹתַחַת, דֶּרֶךְ הָאֶמְצַע")

# T113: 1 seg — exacting from man with/without knowledge / Baal Shem Tov: before decree they assemble the world
torahs[113] = make_data(113, [
seg(1,
"Pirkei Avot teaches: 'They exact (moshchin) from man with his knowledge and without his knowledge.' Rabbeinu heard in the name of the Baal Shem Tov: before every decree in the world — God forbid — they assemble the entire world in a kind of heavenly court, and if the world (or the person himself) agrees to the judgment — even implicitly or unconsciously — then the decree is sealed and enacted. This is the meaning of 'without his knowledge': the person may not consciously know he has consented, yet on some deep level, through his own actions and spiritual state, he has acquiesced to the judgment being decreed against him. This is a profound insight: every decree that befalls a person carries within it some element of the person's own soul-level consent. The teaching serves as a call to self-awareness: be conscious of what one is 'agreeing to' on the spiritual level, because one's own inner state helps shape the decrees that are applied.",
"Pirkei Avot: 'They exact from man with his knowledge and without his knowledge.' Baal Shem Tov: before every decree, entire world assembled in heavenly court. If world/person agrees (even unconsciously) → decree sealed. 'Without knowledge' = unconscious soul-level consent. Every decree carries element of person's own acquiescence. Call to self-awareness: be conscious of what one 'agrees to' spiritually.",
"אָבוֹת: 'מוֹשְׁכִין אֶת הָאָדָם בְּיִדִּיעָתוֹ וְשֶׁלֹּא בְּיִדִּיעָתוֹ.' בַּעַל שֵׁם טוֹב: לִפְנֵי כָּל גְּזֵרָה, כָּל הָעוֹלָם נֶאֱסָף לְבֵית-דִּין שֶׁל מַעְלָה. אִם הֵסְכִּים (אַף שֶׁלֹּא בְּמוּדָע) → גְּזֵרָה נֶחְתֶּמֶת. 'שֶׁלֹּא בְּיִדִּיעָתוֹ' = הֶסְכָּמַת נֶפֶשׁ לֹא-מוּדַעַת. כָּל גְּזֵרָה = חֵלֶק מֵהֶסְכָּמַת הָאָדָם עַצְמוֹ.",
"אָבוֹת; בַּעַל שֵׁם טוֹב."
),
], "Exacting With and Without Knowledge — Soul-Level Consent to Decrees (1 seg)", "מוֹשְׁכִין בְּיִדִּיעָה וְשֶׁלֹּא בְּיִדִּיעָה — הֶסְכָּמַת הַנֶּפֶשׁ לַגְּזֵרוֹת")

# T114: 1 seg — hidden tzaddikim receive shefa for world, ask nothing for themselves (Teh 147:8)
torahs[114] = make_data(114, [
seg(1,
"Opening verse: 'Who covers the heavens with clouds, who prepares rain for the earth' (Psalms 147:8). The hidden tzaddikim (righteous ones who are not publicly known) possess exceedingly great spiritual merit. They are able to receive enormous divine abundance (shefa) and channel great goodness into the world — yet they ask nothing for themselves. Their entire focus is on drawing down blessing for others. They are like channels that are completely selfless: the blessing flows through them to the world, but they personally claim none of it. This complete selflessness is what makes them such powerful conduits. The clouds that 'cover the heavens' and prepare rain are exactly this: the hidden tzaddik absorbs and condenses the heavenly abundance (as clouds condense moisture) and releases it as rain — practical, earthly blessing for all. Because they are hidden and ask nothing for themselves, the spiritual forces of the Other Side have no hold on them and cannot interrupt the flow.",
"Teh 147:8. Hidden tzaddikim = great merit. Can receive and channel vast shefa to world. Ask nothing for themselves = complete selflessness = most powerful conduits. Like clouds: absorb heavenly abundance → release as rain (earthly blessing). Hidden + selfless → sitra achara has no hold on them.",
"תה' קמ\"ז:ח. צַדִּיקִים נִסְתָּרִים = זְכוּת גְּדוֹלָה. מְקַבְּלִים שֶׁפַע עָצוּם וּמַעֲבִירִים לָעוֹלָם. אֵינָם שׁוֹאֲלִים לְעַצְמָם = הֶעְדֵּר אֶגוֹ = צִנּוֹרוֹת הָאַדִּירִים. כְּעֲנָנִים: סוֹפְגִים שֶׁפַע שָׁמַיִם → מְשַׁחְרְרִים כְּגֶשֶׁם. נִסְתָּרִים + לֹא שׁוֹאֲלִים → סִטְרָא אָחֳרָא אֵין אֲחִיזָה.",
"תה' קמ\"ז:ח."
),
], "Who Covers Heavens with Clouds — Hidden Tzaddikim Channel Shefa (1 seg)", "הַמְּכַסֶּה שָׁמַיִם בְּעָבִים — הַצַּדִּיקִים הַנִּסְתָּרִים מַעֲבִירִים הַשֶּׁפַע")

# T115: 2 segs — "People stood from afar, Moshe approached thick cloud" / attribute of judgment obstructs / cloud = obstacle for common person / Moshe knew cloud contains God
torahs[115] = make_data(115, [
seg(1,
"Opening verse: 'And the people stood from afar, and Moses approached the thick cloud where God was' (Exodus 20:18). When a person who has lived in materiality all his days is suddenly inflamed with desire to walk in the ways of God — to begin genuine divine service — he is immediately met by the attribute of divine judgment. The judgment says, in effect: 'You lived in materiality; now you want to approach holiness? You must be tested and refined.' This obstruction manifests as a 'thick cloud' — a darkening, a feeling of heaviness, impediment, spiritual thickness — that stands between the person and his desired closeness to God.",
"Shemot 20:18. Person who lived in materiality and wants to serve God = immediately met by attribute of judgment. Judgment = 'you must be tested.' This manifests as thick cloud = heaviness/impediment standing between person and holiness.",
"שְׁמ' כ:יח. אָדָם שֶׁחַי בְּגַשְׁמִיּוּת וְרוֹצֶה לַעֲבֹד ה' = מִיָּד מִידַּת הַדִּין מִתְנַגֶּדֶת. הַדִּין = 'אַתָּה צָרִיךְ לְהִבָּחֵן.' זֶה מִתְגַּלֶּה כְּעָנָן — כֹּבֶד/מַפְרִיעַ בֵּין הָאָדָם לַקְּדֻשָּׁה.",
"שְׁמ' כ:יח."
),
seg(2,
"The difference between ordinary people and Moses: ordinary people, upon encountering the thick cloud (the obstruction, the darkness), immediately retreat. The cloud signals to them 'danger, stop, go back' — and they remain standing 'from afar.' But Moses, who knew that God is specifically within the thick cloud — that the divine presence dwells precisely in the place that appears most dark and obstructed — walked forward into it. The teaching for every person: the apparent obstacle on the path to God is not a sign to turn back but a sign that one is approaching the real place. The cloud itself is where God is. The one who knows this does not retreat but presses forward, and finds God within the darkness.",
"Ordinary people see cloud → retreat → stand from afar. Moshe knew: God is specifically within the thick cloud = apparent obstacle is the real place. Teaching: spiritual obstacles on path to God = sign you're approaching the real place. Don't retreat — press forward. God is within the darkness.",
"אַנְשֵׁי הֶהָמוֹן רוֹאִים עָנָן → נִסּוֹגִים → 'עָמְדוּ מֵרָחֹק.' מֹשֶׁה יָדַע: ה' דַּוְקָא בְּתוֹךְ הָעֲרָפֶל. מִכְשׁוֹל רוּחָנִי = סִימַן שֶׁמִּתְקָרֵב לַמָּקוֹם הָאֲמִתִּי. אַל תִּסּוֹג — הַמְשֵׁךְ. ה' בְּתוֹךְ הַחֹשֶׁךְ.",
"שְׁמ' כ:יח."
),
], "People Stood Afar Moshe Approached Cloud — God Within Obstacles (2 segs)", "הָעָם עָמְדוּ מֵרָחֹק וּמֹשֶׁה נִגַּשׁ — ה' בְּתוֹךְ הָעֲרָפֶל")

# T116: 1 seg — tzedakah saves from sin / mercy chain / one without understanding forbidden to have mercy
torahs[116] = make_data(116, [
seg(1,
"Giving charity (tzedakah) saves a person from transgression. The mechanism: anyone who has mercy upon other beings — God has mercy upon him (Shabbat 151b). And once Heaven has mercy on a person, it necessarily withholds from him any obstacles or temptations toward transgression — because God's mercy means protecting him from falling. There is an important qualification from the Talmud (Berachot 33a): one who lacks understanding (da'at) — it is actually forbidden to have excessive mercy upon him. This is because mercy extended to someone who has no understanding can enable and empower his destructive path rather than helping him. True mercy must be directed properly — it saves and elevates only when given to those who have the capacity to receive and use it constructively.",
"Tzedakah saves from sin. Mechanism: mercy on others → God has mercy on you (Shab 151b) → God withholds obstacles/temptations. Qualification: Ber 33a: one who lacks da'at = forbidden to have excess mercy on him (mercy enables destruction). True mercy = directed properly to those who can receive it.",
"צְדָקָה מַצֶּלֶת מֵחֵטְא. מֶכָנִיזְם: רַחֲמִים עַל אֲחֵרִים → ה' רוֹחֵם עָלֶיךָ (שַׁב' קנ\"א:) → ה' מוֹנֵעַ מִכְשׁוֹלִים. הַסְתַּיְּגוּת: בר' ל\"ג:: חַסַּר דַּעַת = אָסוּר לְרַחֵם עָלָיו יֶתֶר מִדַּי (רַחֲמִים מְאַפְשְׁרִים הֲרָסָה). רַחֲמִים אֲמִתִּיִּים = מְכֻוָּנִים לְמִי שֶׁיָּכוֹל לְקַבֵּל.",
"שַׁב' קנ\"א:; בר' ל\"ג:."
),
], "Tzedakah Saves From Sin — Mercy Chain / True Mercy (1 seg)", "הַנּוֹתֵן צְדָקָה נִצּוֹל מִן הַחֵטְא — שַׁרְשֶׁרֶת הָרַחֲמִים")

# T117: 1 seg — hard to sleep Motzaei Shabbat / revelation of Elijah begins (Eruvin 43b)
torahs[117] = make_data(117, [
seg(1,
"Why is it difficult to sleep on Motzaei Shabbat (Saturday night)? The reason: the revelation of Elijah the Prophet begins at that time. As the Talmud (Eruvin 43b) teaches, Elijah does not come on Shabbat itself or on Erev Shabbat — but he may come on Motzaei Shabbat. From the very moment Shabbat ends, the possibility of Elijah's appearance becomes active in the world. The soul senses this awakening — the heightened spiritual energy and the proximity of redemptive light — and this sensitivity makes it difficult to settle into sleep. The restlessness of Motzaei Shabbat is therefore not mere habit or dietary excess from the third meal; it is a profound spiritual wakefulness, a trembling of the soul at the nearness of the messianic herald. One who understands this can use that wakefulness for Torah study and prayer rather than fighting it.",
"Motzaei Shabbat hard to sleep because: revelation of Elijah begins then (Eruvin 43b). Elijah cannot come Shabbat/Erev Shabbat, but may come Motzaei Shabbat. Soul senses heightened spiritual energy + proximity of redemptive light = restlessness. Not habit — profound spiritual wakefulness. Use it for Torah/prayer.",
"קוֹשִׁי שֵׁינָה בְּמוֹצָאֵי שַׁבָּת כִּי: גִּלּוּי אֵלִיָּהוּ מַתְחִיל אָז (עֵיר' מ\"ג:). אֵלִיָּהוּ אֵינוֹ בָּא בְּשַׁבָּת/עֶרֶב שַׁבָּת, אֲבָל יָבוֹא בְּמוֹצָאֵי שַׁבָּת. הַנֶּפֶשׁ חָשָׁה אֶת הָעֵרוּת הָרוּחָנִית = קִרְבַת אוֹר גְּאֻלָּה. לֹא הֶרְגֵּל — עֵרוּת רוּחָנִית עֲמֻקָּה. נַצֵּל לְתּוֹרָה/תְּפִלָּה.",
"עֵיר' מ\"ג:."
),
], "Hard to Sleep Motzaei Shabbat — Elijah's Revelation Begins (1 seg)", "קוֹשִׁי הַשֵּׁינָה בְּמוֹצָאֵי שַׁבָּת — גִּלּוּי אֵלִיָּהוּ")

# T118: 1 seg — when learning, good to explain in vernacular / tzaddik = aspect of Moses
torahs[118] = make_data(118, [
seg(1,
"When learning a Torah concept, it is good to also explain it in the vernacular language (in Rabbeinu's time, Yiddish — but the principle applies to whatever language one understands clearly). Explaining in the language one fully understands ensures the concept is genuinely absorbed and not merely parroted in a language one doesn't fully grasp. The deeper explanation: every true tzaddik of each generation is an aspect of Moses. And Moses's mission was to transmit Torah to Israel in a way they could receive and understand. When a teacher explains Torah in the student's own language — in the words the student truly grasps — he is acting in the spirit of Moses. The teaching becomes truly alive and beneficial to the world when it is communicated in a way that genuinely reaches the listener.",
"When learning, explain also in vernacular (language you truly understand). Ensures genuine absorption, not mere parroting. Deeper reason: every tzaddik = aspect of Moshe. Moshe's mission = transmit Torah so Israel could truly receive. Explaining in student's language = spirit of Moshe. Torah alive and beneficial when truly reaching the listener.",
"בְּלִמּוּד, טוֹב לְבָאֵר גַּם בִּלְשׁוֹן הָעָם (שֶׁמֵּבִין אוֹתוֹ בֶּאֱמֶת). מַבְטִיחַ קְלִיטָה אֲמִתִּית. טַעַם עָמֹק: כָּל צַדִּיק = בְּחִינַת מֹשֶׁה. שְׁלִיחוּת מֹשֶׁה = מְסִירַת תּוֹרָה בְּדֶרֶךְ שֶׁיִּשְׂרָאֵל יוּכְלוּ לְקַבֵּל. בֵּאוּר בִּלְשׁוֹן הַתַּלְמִיד = רוּחַ מֹשֶׁה. תּוֹרָה חַיָּה כְּשֶׁמַּגִּיעָה בֶּאֱמֶת.",
""
),
], "Explain in Vernacular — Tzaddik as Moses / Torah Reaching the Listener (1 seg)", "בֵּאוּר בִּלְשׁוֹן הָעָם — הַצַּדִּיק כְּמֹשֶׁה וְהַתּוֹרָה הַמַּגִּיעָה")

# T119: 1 seg — visiting sick on Shabbat / God sends opportunity to have mercy / mercy chain
torahs[119] = make_data(119, [
seg(1,
"When visiting the sick on Shabbat, one may say: 'It is able that He have mercy' (as ruled in Shabbat 12a). The deeper reason: when a person truly needs mercy — when he is in a state of genuine need — God sends him a situation where he can have mercy on another person. And then, by that person having mercy on others, Heaven has mercy on him (Shabbat 151b: 'All who have mercy on the creatures — Heaven has mercy on them'). This is a divinely arranged chain of mercy: God places the needy person in a position to be merciful, thereby activating the heavenly response of mercy toward him. The sick person who receives visitors and sees others showing him compassion is not only being helped — he is also being given the opportunity to reciprocate, to show gratitude, to extend kindness from his sickbed, thereby drawing down further mercy for his own healing.",
"Shab 12a: visiting sick on Shabbat, say 'It is able that He have mercy.' Deeper: God sends a person who needs mercy an opportunity to show mercy to another. Then: Shab 151b: 'All who have mercy on creatures → Heaven has mercy on them.' Divinely arranged mercy chain. Sick person = given opportunity to reciprocate/show kindness → draws down mercy for healing.",
"שַׁב' י\"ב:: 'שַׁבָּת הִיא מִלִּזְעֹק וּרְפוּאָה קְרוֹבָה לָבוֹא.' עֹמֶק: ה' שׁוֹלֵחַ לַמְּצוּרָךְ הִזְדַּמְּנוּת לְרַחֵם עַל אַחֵר. אָז: שַׁב' קנ\"א:: 'כָּל הַמְּרַחֵם עַל הַבְּרִיּוֹת → מְרַחֲמִין עָלָיו מִן הַשָּׁמַיִם.' שַׁרְשֶׁרֶת רַחֲמִים אֱלֹהִית. חוֹלֶה = מְקַבֵּל הִזְדַּמְּנוּת לְהַחֲזִיר חֶסֶד → מוֹשֵׁךְ רַחֲמִים לִרְפוּאָתוֹ.",
"שַׁב' י\"ב:; שַׁב' קנ\"א:."
),
], "Visiting Sick on Shabbat — Divine Mercy Chain / Need Activates Giving (1 seg)", "בִּקּוּר חוֹלִים בְּשַׁבָּת — שַׁרְשֶׁרֶת הָרַחֲמִים הָאֱלֹהִית")

# T120: 1 seg — must travel to tzaddik / musar books not enough / Shemot 17:14 + "put in ears of Yehoshua"
torahs[120] = make_data(120, [
seg(1,
"The question: why must one travel to the tzaddik? Aren't books of musar (ethical guidance) sufficient? The answer comes from the Torah itself: 'And God said to Moses: Write this as a memorial in the book, and place it in the ears of Joshua' (Exodus 17:14). Even though God commanded the writing of the Torah in a book — the written word — He also specifically commanded that it be 'placed in the ears of Joshua' — that it be transmitted orally, directly, face to face. The written word alone is not enough. There is something that passes from a living teacher to a living student that no book can convey. The tzaddik's presence, voice, the light in his eyes, the quality of his spiritual state — these transmit dimensions of Torah that no written page can carry. Books of musar can instruct the mind, but the tzaddik affects the heart and the very spiritual DNA of the soul. This is why the journey to the tzaddik is irreplaceable.",
"Why travel to tzaddik if books suffice? Shemot 17:14: 'Write in book AND place in ears of Yehoshua.' Writing alone not enough — must also be transmitted directly, orally, face to face. Tzaddik's presence/voice/spiritual state transmit dimensions no book can carry. Books instruct mind; tzaddik affects heart and soul-DNA. Journey to tzaddik = irreplaceable.",
"מַדּוּעַ לִנְסֹעַ לַצַּדִּיק אִם יֵשׁ סִפְרֵי מוּסָר? שְׁמ' י\"ז:יד: 'כְּתֹב זֹאת זִכָּרוֹן בַּסֵּפֶר וְשִׂים בְּאָזְנֵי יְהוֹשֻׁעַ.' כְּתִיבָה לֹא מַסְפֶּקֶת — גַּם מְסִירָה פְּנִים אֶל פָּנִים. נוֹכְחוּת הַצַּדִּיק מַעֲבִירָה מָה שֶׁאֵין סֵפֶר יָכוֹל. סִפְרֵי מוּסָר = דַּעַת הַשֵּׂכֶל; צַדִּיק = לֵב וְנֶפֶשׁ. נְסִיעָה לַצַּדִּיק = בִּלְתִּי נִתְחַלֵּף.",
"שְׁמ' י\"ז:יד."
),
], "Travel to Tzaddik — Books Alone Not Enough / Direct Transmission (1 seg)", "נְסִיעָה לַצַּדִּיק — סִפְרֵי מוּסָר אֵינָם מַסְפִּיקִים")

# T121: 2 segs — "Behold I come, in scroll it is written about me" (Teh 40:8-9) / self-recognition through Torah study
torahs[121] = make_data(121, [
seg(1,
"Opening verse: 'Then I said: Behold, I come; in the scroll of the book it is written about me. To do Your will, O my God, I desire it' (Psalms 40:8-9). When a person reads and studies in a book — as he delves into each passage — and he finds himself absorbing rebuke, recognizing his own faults and lowliness in what he reads, this is a clear indication that he genuinely yearns to do the will of God. The person who, upon encountering moral guidance in a text, immediately identifies 'this is about me — this fault, this flaw is mine' — rather than deflecting it onto others — is demonstrating a depth of honest self-awareness and a desire for self-correction.",
"Teh 40:8-9. When studying Torah/musar books and a person recognizes his own faults in what he reads = clear sign he yearns to do God's will. 'This is written about me' = honest self-awareness rather than deflecting onto others. Self-recognition in Torah = desire for self-correction.",
"תה' מ:ח-ט. כְּשֶׁלּוֹמֵד תּוֹרָה/מוּסָר וּמַכִּיר פְּגָמָיו בְּמָה שֶׁקּוֹרֵא = סִימָן בָּרוּר שֶׁמִּשְׁתּוֹקֵק לַעֲשׂוֹת רְצוֹן ה'. 'עָלַי כָּתוּב' = הַכָּרָה עַצְמִית כֵּנָה בְּמָקוֹם הֶסֵּטָה לַאֲחֵרִים. זִיהוּי עַצְמִי בַּתּוֹרָה = רָצוֹן לְתִקּוּן.",
"תה' מ:ח-ט."
),
seg(2,
"The verse says 'in the scroll of the book it is written about me' — the person recognizes that what is written in the book speaks directly to him and his situation. This is the highest form of Torah learning: not academic study of external information, but genuine encounter with one's own spiritual reality mirrored in the text. The result of this recognition is the final line of the verse: 'To do Your will, O my God, I desire it' — the recognition of self awakens the genuine desire to change, to repair, to do God's will. Torah learned in this personal, self-directed way naturally produces teshuvah.",
"'In scroll it is written about me' = highest Torah learning: genuine encounter with own spiritual reality in the text. Not academic — personal mirror. Result: 'To do Your will I desire it' = self-recognition awakens genuine desire to change → teshuvah. Torah learned personally = naturally produces teshuvah.",
"'בִּמְגִלַּת סֵפֶר כָּתוּב עָלַי' = לִמּוּד תּוֹרָה הַגָּבוֹהַּ: מִפְּגָשׁ אֲמִתִּי עִם מְצִיאוּת עַצְמִית בַּטֶּקְסְט. לֹא אַקָדֵמִי — מִרְאָה אִישִׁית. תוֹצָאָה: 'לַעֲשׂוֹת רְצוֹנְךָ אֱלֹהַי חָפָצְתִּי' = הַכָּרָה עַצְמִית מְעוֹרֶרֶת רָצוֹן לְשִׁנּוּי → תְּשׁוּבָה.",
"תה' מ:ח-ט."
),
], "Behold I Come In Scroll — Self-Recognition in Torah Awakens Teshuvah (2 segs)", "הִנֵּה בָאתִי בִּמְגִלַּת סֵפֶר — הַכָּרָה עַצְמִית בַּתּוֹרָה מְעוֹרֶרֶת תְּשׁוּבָה")

# T122: 1 seg — world sustained through song / song = Malchut/Shechinah / exile constricts song
torahs[122] = make_data(122, [
seg(1,
"Opening verse: 'He has placed a song in my mouth' (Psalms 40:4). The entire world is sustained through song. Song is not mere aesthetic pleasure — it is a spiritual force that holds reality together. Song originates in the aspect of Malchut (Kingship) — the sefirah of Malchut, which is identical with the Divine Presence (Shechinah). When the Shechinah is in exile, her song is constricted and muted — the sustaining force of song is diminished in the world, and as a result, the world lacks the inner vitality that song provides. But when the Shechinah is raised from the dust — when holy people through their service elevate the Shechinah from her exile — her song is restored and the world is sustained and invigorated. Every song sung in holiness — every melody of tefillah, every niggun of devekus — participates in this cosmic act of raising the Shechinah and sustaining the world.",
"Teh 40:4. World sustained through song. Song = spiritual sustaining force, not mere aesthetic. Song rooted in Malchut/Shechinah. Shechinah in exile → song constricted → world lacks inner vitality. Raising Shechinah = restoring song = sustaining world. Every holy song/niggun = cosmic act of elevating Shechinah.",
"תה' מ:ד. הָעוֹלָם מִתְקַיֵּם בַּשִּׁירָה. שִׁירָה = כֹּחַ קִיּוּם רוּחָנִי, לֹא הֲנָאָה בְּלֶבֶד. שִׁירָה = שֹׁרֶשׁ מַלְכוּת/שְׁכִינָה. שְׁכִינָה בְּגָלוּת → שִׁירָה מְצוּמְצֶמֶת → עוֹלָם חַסַּר חַיּוּת. הָרָמַת שְׁכִינָה = שְׁחָרוּר שִׁירָה = קִיּוּם עוֹלָם. כָּל שִׁיר/נִגּוּן קָדוֹשׁ = הֲרָמַת שְׁכִינָה.",
"תה' מ:ד."
),
], "Through Song the World Endures — Malchut/Shechinah and Holy Melody (1 seg)", "בַּשִּׁירָה הָעוֹלָם מִתְקַיֵּם — מַלְכוּת, שְׁכִינָה, וְהַנִּגּוּן הַקָּדוֹשׁ")

# T123: 1 seg — bind to tzaddik of generation / Sifri Shoftim: "even if he tells you right is left"
torahs[123] = make_data(123, [
seg(1,
"The foundation upon which everything depends is binding oneself to the tzaddik of the generation — and accepting his words in all matters, great and small, without deviation, neither to the right nor to the left. As the Sifri (Parashat Shoftim) teaches: 'Even if he tells you that right is left and left is right — listen to him.' This teaching is not about blind obedience to error; rather, it reflects the principle that the tzaddik has a perspective on spiritual reality that transcends the ordinary person's perspective. What appears 'wrong' or 'reversed' from a limited viewpoint may be exactly right from the tzaddik's elevated vantage point. The binding to the tzaddik is the essential infrastructure of spiritual growth: without it, a person wanders without direction, making decisions based only on his own limited perception. With it, he has access to a vision of reality that is far more complete than his own.",
"Foundation of everything = binding to tzaddik of the generation. Accept his words in all things without deviation. Sifri Shoftim: 'Even if he tells you right is left — listen.' Not blind obedience: tzaddik sees from elevated perspective that transcends ordinary view. Without binding to tzaddik = wanders by limited perception. With binding = access to more complete vision of reality.",
"יְסוֹד הַכֹּל = דְּבֵקוּת לַצַּדִּיק שֶׁבַּדּוֹר. קַבֵּל דְּבָרָיו בְּכָל עִנְיָן בְּלִי סְטִיָּה. סִפְרִי שׁוֹפְטִים: 'אַפִלּוּ אוֹמֵר לְךָ עַל יָמִין שֶׁהוּא שְׂמֹאל — שְׁמַע.' לֹא עִיוֵּר: לַצַּדִּיק פֶּרְסְפֶּקְטִיבָה נִשְׂגָּבָה. בְּלִי דְּבֵקוּת = הִתְנַהֲלוּת לְפִי תְּפִיסָה מוּגְבֶּלֶת בִּלְבַד. בְּדְּבֵקוּת = גִּישָׁה לְחֲזוֹן שָׁלֵם יוֹתֵר.",
"סִפְרִי שׁוֹפְטִים."
),
], "Bind to Tzaddik of Generation — Follow Without Deviation (1 seg)", "לְהִדָּבֵק בְּצַדִּיק הַדּוֹר — לְקַבֵּל דְּבָרָיו בְּלִי סְטִיָּה")

# T124: 1 seg — "Sing to Him who is conquered and is happy" (Pesachim 119a) / person argues before God / God desires to be conquered in prayer
torahs[124] = make_data(124, [
seg(1,
"The Talmud (Pesachim 119a) presents the phrase: 'Song psalm to the conductor: sing to Him who is conquered and is happy.' The paradoxical phrase 'conquered and happy' is explained: when a person speaks before God, articulating his arguments and requests — presenting his case, his needs, his claims — he is in a sense 'conquering' God in prayer. And the remarkable teaching is that God desires this — He is 'happy' to be conquered. The Holy One, Blessed Be He, loves when His children press Him with genuine prayer, with earnest argument, with the full force of their need. When a person prays with such intensity and sincerity that he, as it were, refuses to let go until God responds — this is not impertinence but the highest form of prayer. God rejoices in being 'defeated' by the prayers of His people, just as a father rejoices when his child is persistent enough to obtain what he needs.",
"Pesachim 119a: 'Sing to Him who is conquered and is happy.' Person prays with arguments/claims before God = 'conquers' God in prayer. God desires this — is happy to be conquered. God loves when children press Him with genuine earnest prayer. Refusing to let go = not impertinence but highest prayer. God rejoices to be 'defeated' by children's prayers.",
"פסח' קי\"ט:: 'שִׁירוּ לַמְנַצֵּחַ: שִׁירוּ לַנִּתְנַצֵּחַ וְשָׂמֵחַ.' אָדָם מִתְפַּלֵּל בְּטַעֲנוֹת/בַּקָּשׁוֹת לִפְנֵי ה' = 'מְנַצֵּחַ' אֶת ה' בִּתְפִלָּה. ה' רוֹצֶה זֹאת — שָׂמֵחַ לְהִנָּצֵחַ. ה' אוֹהֵב כְּשֶׁבָּנָיו דּוֹחֲקִים אוֹתוֹ בְּתְּפִלָּה אֲמִתִּית. לֹא לְשַׁחֵרֵר = לֹא חֻצְפָּה — תְּפִלָּה הַגְּבוֹהָה. ה' שָׂמֵחַ כְּשֶׁ'מְנֻצָּח' עַל יְדֵי תְּפִלַּת בָּנָיו.",
"פסח' קי\"ט:."
),
], "Sing to Him Who Is Conquered — God Desires to Be Won by Prayer (1 seg)", "שִׁירוּ לַנִּתְנַצֵּחַ וְשָׂמֵחַ — ה' חָפֵץ שֶׁיְּנַצְּחוּהוּ בַּתְּפִלָּה")

# T125: 1 seg — "Eat it today because today is Shabbat" (Shemot 16:25) / three meals on Shabbat (Shab 117b)
torahs[125] = make_data(125, [
seg(1,
"The verse: 'And Moses said: Eat it today, because today is Shabbat to God; today you will not find it in the field' (Exodus 16:25, about the manna). The Rabbis derived from here (Shabbat 117b) the obligation to eat three meals on Shabbat, because the word 'today' appears three times in this verse. Each 'today' corresponds to one of the three Shabbat meals: the Friday night meal, the Shabbat day meal, and the third meal (seudah shelishit) in the afternoon. The three meals are not mere custom but a Torah-rooted mitzvah, each anchored in one of Moses's three proclamations of 'today.' The teaching here emphasizes the sanctity of all three meals: each one is a divine appointment, a moment when the spiritual nourishment of Shabbat is specifically designated to be received. Eating each of the three meals is itself an act of divine service, a fulfillment of the spiritual 'manna' of Shabbat.",
"Shemot 16:25: 'today' appears three times → Shab 117b: obligation to eat three Shabbat meals. Each 'today' = one meal (Friday night, Shabbat day, seudah shelishit). Three meals = Torah mitzvah, not custom. Each meal = divine appointment to receive Shabbat's spiritual nourishment. Eating all three = divine service.",
"שְׁמ' ט\"ז:כה: 'הַיּוֹם' נִכְתָּב שָׁלשׁ פְּעָמִים → שַׁב' קי\"ז:: חוֹבָה לֶאֱכֹל שָׁלשׁ סְעוּדוֹת בְּשַׁבָּת. כָּל 'הַיּוֹם' = סְעוּדָה אַחַת (לֵיל שַׁבָּת, שַׁחֲרִית, סְעוּדָה שְׁלִישִׁית). שָׁלשׁ סְעוּדוֹת = מִצְוַת תּוֹרָה. כָּל סְעוּדָה = מוֹעֵד אֱלֹהִי לְקַבֵּל מָן רוּחָנִי שֶׁל שַׁבָּת. אֲכִילַת שָׁלשְׁתָּן = עֲבוֹדַת ה'.",
"שְׁמ' ט\"ז:כה; שַׁב' קי\"ז:."
),
], "Eat It Today — Three Shabbat Meals / Manna and Divine Appointment (1 seg)", "אִכְלֻהוּ הַיּוֹם — שָׁלשׁ סְעוּדוֹת שַׁבָּת וְהַמָּן הָרוּחָנִי")

# T126: 2 segs — Zohar: friends praised R' Shimon / woe when spring removed / longing at thought of parting
torahs[126] = make_data(126, [
seg(1,
"In the Zohar, in several places, the friends and students of Rabbi Shimon bar Yochai praised him with enormous awe and reverence. The Zohar records the saying: 'Woe to the generation when the spring (source of Torah) is removed' — meaning when the great tzaddik who is the source of Torah wisdom for his generation departs, the entire generation suffers an immense loss. The 'spring' is the living teacher whose Torah flows endlessly and fresh; when that spring is removed, the people are left with the stored waters of books alone, which cannot match the living flow.",
"Zohar: friends praised R' Shimon bar Yochai. Zohar teaching: 'Woe to the generation when the spring is removed.' Spring = living tzaddik/Torah source. When great tzaddik departs = entire generation loses living Torah flow. Books = stored water; living tzaddik = fresh spring.",
"זֹהַר: חֲבֵרִים שִׁבְּחוּ רַשְׁבִּ\"י. מַאֲמַר זֹהַר: 'וַי לְהַהִיא דָּרָא כַּד יִתְנְשֵׁי מַבּוּעָא.' מַבּוּעָא = צַדִּיק חַי/מְקוֹר תּוֹרָה. כְּשֶׁנִּסְתַּלֵּק הַצַּדִּיק הַגָּדוֹל = כָּל הַדּוֹר מַפְסִיד זְרִימַת תּוֹרָה חַיָּה. סְפָרִים = מַיִם אֲצוּרִים; צַדִּיק חַי = מַעְיָן חֹרֵשׁ.",
"זֹהַר."
),
seg(2,
"The friends, because of the immense pleasure and spiritual delight they received from Rabbi Shimon — from sitting in his presence, hearing his Torah, basking in his holy light — immediately upon thinking of his eventual departure, felt the pain of loss in advance. Just as when Shabbat departs, those who tasted its holiness immediately feel a longing for its return, so too the students of Rabbi Shimon: even while still in his presence, the very thought of his eventual removal caused them to begin to long. This teaches the depth of attachment that a student should cultivate toward his teacher: not merely intellectual respect but heart-level love, such that the thought of separation causes genuine pain.",
"Friends received immense pleasure/delight from R' Shimon's presence and Torah. Immediately upon thinking of his departure = felt pain of loss in advance. Like Motzaei Shabbat longing. Students should cultivate heart-level love for teacher, not merely intellectual respect. Thought of separation = genuine pain = sign of true attachment.",
"חֲבֵרִים קִבְּלוּ עֹנֶג עָצוּם מֵרַשְׁבִּ\"י. מִיָּד בַּמַּחְשָׁבָה עַל פְּרִידָתוֹ = חָשׁוּ כְּאֵב אָבֵד מֵרֹאשׁ. כְּמוֹ גַּעְגּוּעֵי מוֹצָאֵי שַׁבָּת. תַּלְמִידִים — לְטַפֵּחַ אַהֲבַת לֵב לַרַּב, לֹא רַק כָּבוֹד שִׂכְלִי. מַחְשָׁבַת פְּרֵידָה = כְּאֵב אֲמִתִּי = סִימַן דְּבֵקוּת אֲמִתִּית.",
"זֹהַר."
),
], "Friends Praised R' Shimon — Woe When Spring Removed / Heart-Level Love for Teacher (2 segs)", "שִׁבְחוּ הַחֲבֵרִים לְרַשְׁבִּ\"י — וַי כַּד יִתְנְשֵׁי מַבּוּעָא")

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
print('lm-commentaries.json updated for T112-T126')

subprocess.run(['git', 'add'] + git_files, cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T112-T126 PNC -- tzohar/truth-in-darkness/hidden-tzaddikim/travel-to-tzaddik/song-world-endures/bind-tzaddik (29 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:250])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
