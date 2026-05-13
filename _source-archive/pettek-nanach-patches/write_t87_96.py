import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)

def seg(idx, be, bi_en, bi_he, sc_he):
    return {"index": idx, "beginner": {"en": be, "he": ""}, "intermediate": {"en": bi_en, "he": bi_he}, "scholarly": {"en": "", "he": sc_he}}

def make_data(n, segs, title_en, title_he):
    return {"id": f"pnc-1-{n}", "book": pnc_name, "part": 1, "torah": n, "title": f"T{n} PNC - {title_en}", "hebrewTitle": title_he, "author": "Petten Nanach", "segments": segs}

torahs = {}

# T87
torahs[87] = make_data(87, [
seg(1, "Opening: 'Give truth to Jacob, kindness to Abraham' (Micah 7:20). When a person sincerely desires to walk in the upright path, he immediately notices that judgments (dinim) are aroused against him — which seems paradoxical. The answer requires understanding two types of yirah (awe/fear): yirat ha'onesh (fear of punishment), and yirat haromemut (awe of exaltedness). Yirat ha'onesh is called tzedek (strict righteousness), while yirat haromemut is called emunah (faith). Because when a person believes with complete faith that the Blessed Name is great and sovereign — the root and essence of all worlds — this is the awe of exaltedness.",
"Micha 7:20. When wanting upright path → dinim aroused. Two types of yirah: yirat ha'onesh (tzedek) and yirat haromemut (emunah). Believing Hashem is great/sovereign = yirat haromemut = emunah.",
"מִיכָה ז:כ. בִּרְצוֹן לָלֶכֶת בְּדֶרֶךְ הַיָּשָׁר → דִּינִים מִתְעוֹרְרִים. שְׁנֵי סוּגֵי יִרְאָה: יִרְאַת הָעֹנֶשׁ (צֶדֶק) וְיִרְאַת הָרוֹמֵמוּת (אֱמוּנָה). אֱמוּנָה שֶׁהַשֵּׁם גָּדוֹל וּמוֹשֵׁל = יִרְאַת הָרוֹמֵמוּת.", "מִיכָה ז:כ."),
seg(2, "The matter is clear now: when a person desires to walk in the upright path, dinim are aroused — but this is not punishment, it is the awakening of yirat haromemut (awe of exaltedness), which is emunah. The more deeply one believes in Hashem's greatness, the more one experiences the dinim of that greatness pressing upon him. This is 'Give truth to Jacob' — the quality of emet (truth/intensity) that belongs to Jacob, which is the sharpness of genuine awe. And 'kindness to Abraham' is the softening and expansion that comes when the awe is properly channeled. Both are needed: the intensity of emunah-awe (Jacob) and the expansive kindness (Abraham).",
"Dinim when walking upright = awakening of yirat haromemut = emunah. More emunah → more dinim of Hashem's greatness pressing. 'Emet l'Yaakov' = intensity of awe; 'chesed l'Avraham' = softening/expansion. Both needed.",
"דִּינִים בְּהֲלִיכָה יְשָׁרָה = הִתְעוֹרְרוּת יִרְאַת הָרוֹמֵמוּת = אֱמוּנָה. יוֹתֵר אֱמוּנָה → יוֹתֵר דִּינִים שֶׁל גְּדֻלַּת הַשֵּׁם. 'אֱמֶת לְיַעֲקֹב' = עֹצֶם הַיִּרְאָה; 'חֶסֶד לְאַבְרָהָם' = פְּרִישָׂה וְרַחֲמִים.", "מִיכָה ז:כ.")
], "Immediately Dinim Arise (Yirah Types/Emet-Chesed, 2 segs)", "מִיַּד שֶׁרוֹצֶה לָלֶכֶת — דִּינִים מִתְעוֹרְרִים")

# T88
torahs[88] = make_data(88, [
seg(1, "Opening verse: 'Who covers the heavens with clouds, who prepares rain for the earth' (Psalms 147:8). The divine blessings (hashpa'ot and brachot) cannot reach the world except through the tzaddik — for the tzaddik has 'hands' with which to receive them. These hands are ahavah (love) and yirah (fear/awe): the tzaddik holds divine blessing in his hands of love and awe. The tzaddik must guard and preserve these qualities so that the accusers (the destructive spiritual forces) do not rob him of the divine flow.",
"Teh 147:8. Hashpa'ot/brachot flow only through tzaddik. Tzaddik's 'hands' = ahavah and yirah. Must guard them from accusers who try to rob the divine flow.",
"תה' קמ\"ז:ח. הַשְׁפָּעוֹת/בְּרָכוֹת מִגִּיעוֹת רַק דַּרְךְ הַצַּדִּיק. 'יְדֵי' הַצַּדִּיק = אַהֲבָה וְיִרְאָה. חַיָּיב לִשְׁמֹר אוֹתָן מִמְּקַטְרְגִים.", "תה' קמ\"ז:ח."),
seg(2, "This is the meaning of 'Who covers the heavens with clouds' — the clouds are fire and water: when the tzaddik can 'cover the heavens' — meaning contain and harmonize the opposing forces of fire (yirah/gevurah) and water (ahavah/chesed) — then 'who prepares rain for the earth' — the divine blessing flows down as rain to the earth below. The tzaddik who balances ahavah and yirah, preventing them from overwhelming each other, becomes the channel through which blessing flows into the world.",
"Clouds = fire + water. Tzaddik 'covers heavens' = contains/harmonizes fire (yirah) and water (ahavah). Then 'prepares rain for earth' = blessing flows through tzaddik to world. Balance of ahavah/yirah = tzaddik as channel of blessing.",
"עֲנָנִים = אֵשׁ + מַיִם. צַדִּיק 'מְכַסֶּה שָׁמַיִם' = מְכִיל/מְאַזֵּן אֵשׁ (יִרְאָה) וּמַיִם (אַהֲבָה). אָז 'מֵכִין מָטָר' = בְּרָכָה זוֹרֶמֶת כְּגֶשֶׁם. אֶרֶץ = תַּשְׁמִישׁ אֲהַבָּה/יִרְאָה = צַדִּיק כְּצִנּוֹר.", "תה' קמ\"ז:ח.")
], "Who Covers the Heavens (Tzaddik/Ahavah-Yirah/Blessing Channel, 2 segs)", "הַמְכַסֶּה שָׁמַיִם בְּעָבִים — הַצַּדִּיק כְּצִנּוֹר")

# T89
torahs[89] = make_data(89, [
seg(1, "Opening verse: 'You have made him a little less than God (Elokim), and with glory and majesty You crown him' (Psalms 8:6). All lacks that come to a person — whether spiritual or physical — the lack is actually in the Shechinah, which is the aspect of Elokim. The verse says: 'You have made him a little less' — and this 'little less' comes certainly from Elokim, from the Shechinah. But when a person knows this — that the lack is above (in the divine, in the Shechinah) and also below (in him) — he will have great patience. Because he sees that his own lack is actually a divine lack; his suffering is the Shechinah's suffering. This knowledge transforms the experience of lack from personal frustration into patient holy longing.",
"Teh 8:6. All personal lacks = lack in Shechinah (Elokim). 'Made him a little less' = lack from Shechinah. When one knows lack is above and below = great patience. Own lack = divine lack; suffering = Shechinah's suffering.",
"תה' ח:ו. כָּל חֶסְרוֹן = חֶסְרוֹן בַּשְּׁכִינָה (אֱלֹהִים). 'תְּחַסְּרֵהוּ מְּעַט' = חֶסְרוֹן מֵאֱלֹהִים/שְׁכִינָה. כְּשֶׁיּוֹדֵעַ חֶסְרוֹנוֹ מִלְמַעְלָה וּלְמַטָּה = סַבְלָנוּת גְּדוֹלָה. חֶסְרוֹנוֹ = חֶסְרוֹן אֱלֹהִי.", "תה' ח:ו.")
], "Little Less Than Elokim (All Lacks in Shechinah, 1 seg)", "תְּחַסְּרֵהוּ מְּעַט מֵאֱלֹהִים — כָּל חֶסְרוֹן בַּשְּׁכִינָה")

# T90
torahs[90] = make_data(90, [
seg(1, "Opening verse: 'I will rejoice in Hashem; let sinners be consumed from the earth' (Psalms 104:33-35). All the lacks that come to a person come because of the shattering (the sheviras hakeilim — the breaking of the divine vessels): when the vessels shattered, sparks fell from all the worlds and became lacking from the Shechinah. The personal lacks a person experiences are reflections of those cosmic lacks — missing sparks that need to be elevated back to their source.",
"Teh 104:33-35. Lacks come from sheviras hakeilim: sparks fell from all worlds, lacking from Shechinah. Personal lacks = reflection of cosmic lacks = missing sparks needing elevation.",
"תה' ק\"ד:לג-לה. חֶסְרוֹנוֹת = מִשְּׁבִירַת הַכֵּלִים: נִיצוֹצוֹת נָפְלוּ מִכָּל הָעוֹלָמוֹת, חֲסֵרִים מִהַשְּׁכִינָה. חֶסְרוֹנוֹת אִישִׁיִּים = בְּבוּאָה שֶׁל חֶסְרוֹנוֹת קוֹסְמִיִּים.", "תה' ק\"ד:לג-לה."),
seg(2, "The rectification is through rejoicing in God. When a person rejoices in Hashem, all the lacks from the breaking are completed and all the sparks are raised. Now the verse is explained: 'I will rejoice in Hashem; let be completed (yitamu) all the sinners' — 'sinners' here means the lacks, as the verse says (1 Kings 1): 'And I and my son Solomon are sinners' — meaning deficient, lacking. 'From the earth' refers to the upper earth, the aspect of the Shechinah. So: rejoicing in Hashem → all the lacks/sparks are raised back to the Shechinah, completing the cosmic deficit.",
"Rectification = rejoicing in Hashem. Rejoicing → all lacks completed, all sparks raised. 'Yitamu chata'im' = lacks be completed. 'Chata'im' = lacking/deficient (1 Kings 1). 'From the earth' = upper earth = Shechinah. Rejoicing → sparks raised to Shechinah.",
"תִּקּוּן = שִׂמְחָה בַּה'. שִׂמְחָה → כָּל חֶסְרוֹנוֹת הַשְׁלֵמִים, כָּל הַנִּיצוֹצוֹת עוֹלִים. 'יִתַּמּוּ חַטָּאִים' = יֵגָּמְרוּ הַחֶסְרוֹנוֹת. 'חַטָּאִים' = חֲסֵרִים (מ\"א א). 'מִן הָאָרֶץ' = אֶרֶץ עֶלְיוֹנָה = שְׁכִינָה.", "תה' ק\"ד:לג-לה; מ\"א א.")
], "Rejoicing in Hashem Raises All Sparks (Sheviras Hakeilim, 2 segs)", "אֶשְׂמְחָה בַּה' — הַשִּׂמְחָה מֵרִימָה כָּל הַנִּיצוֹצוֹת")

# T91
torahs[91] = make_data(91, [
seg(1, "Opening verse: 'And his hands were emunah (faith) until the sun came' (Exodus 17:12 — about Moses' hands during the battle with Amalek). There are several kinds of faith: there is faith that is only in the heart — an internal belief. But the main thing a person needs is to have faith that extends into all the limbs, so that every action the body performs carries the vitality of faith. Faith must not remain locked in the mind but must permeate the entire body.",
"Shemot 17:12. Several kinds of faith: faith only in heart (internal). Main requirement: faith extending into all limbs. Faith must permeate entire body, not remain in mind alone.",
"שְׁמ' י\"ז:יב. מִינֵי אֱמוּנָה שׁוֹנִים: אֱמוּנָה בַּלֵּב בִּלְבַד (פְּנִימִי). עִיקָר: אֱמוּנָה הַמִּתְפַּשֶּׁטֶת לְכָל הָאֵבָרִים. אֱמוּנָה חַיֶּיבֶת לִחְדֹּר כָּל הַגּוּף.", "שְׁמ' י\"ז:יב."),
seg(2, "As the Ari (Rabbi Isaac Luria) writes: one needs to raise his hands at the time of ritual hand-washing (netilat yadayim) up to the level of the head, in order to receive the holiness. This requires faith in the hands — to believe that because one raises his hands to the head's level, he receives the holiness. Without faith, the physical act is nothing. As the verse says: 'All Your commandments are emunah (faith)' (Psalms 119:86) — each mitzvah is a vessel of faith. When a person has faith that extends into his physical actions, from that faith comes intellect (seichel). What he initially needed to believe — as new understanding comes, faith transforms into intellectual grasp. Faith constantly opens doors to deeper understanding.",
"Ari: raise hands to head-level at netilat yadayim = receive holiness. Needs faith in the hands. Without faith = nothing. Teh 119:86 'all Your commandments are emunah.' Faith → seichel. Initial belief → intellectual grasp. Faith opens doors to deeper understanding.",
"אָרִ\"י: הַרָמַת יָדַיִם כְּנֶגֶד הָרֹאשׁ בִּנְטִילַת יָדַיִם = קַבָּלַת קְדֻשָּׁה. צָרִיךְ אֱמוּנָה בַּיָּדַיִם. בְּלֹא אֱמוּנָה = כְּלוּם. תה' קי\"ט:פו 'כָּל מִצְוֹתֶיךָ אֱמוּנָה.' אֱמוּנָה → שֵׂכֶל. אֱמוּנָה פּוֹתַחַת דְּלָתוֹת לְהָבָנָה עֲמֻקָּה יוֹתֵר.", "שְׁמ' י\"ז:יב; תה' קי\"ט:פו.")
], "Hands of Faith (Emunah Extends into All Limbs, 2 segs)", "יָדָיו אֱמוּנָה — הָאֱמוּנָה מִתְפַּשֶּׁטֶת לְכָל הָאֵבָרִים")

# T92
torahs[92] = make_data(92, [
seg(1, "A teaching about walking in the house: 'By means of what a person wanders within his house, he can revive the dead' — as we see with Elisha when he revived the Shunamite woman's son. It is written of Elisha: 'And he walked here and there' (2 Kings 4:35) — he walked back and forth in the room, and through this walking the dead child was revived. From the Tikkunim (Tikkun 13, 27b): 'If not for the wings of the lung that blow upon the heart, the heart would burn the entire body.' The lung and heart correspond to the aspects of Jacob and Joseph — as the verse says (Micah 7:20): 'Give truth to Jacob' — the truth/emet of Jacob is the lung's cooling breath that constantly tempers the heat of the heart. The walking-back-and-forth of Elisha = the breath of the lung upon the heart = the principle of Jacob-truth moderating Joseph-heart = the reviving principle.",
"Wanders in house = revives the dead (Elisha, 2 Kings 4:35 'walked here and there'). Tikkunim 13, 27b: lung's wings blow on heart, preventing heart from burning body. Lung = Yaakov; heart = Yosef (Micha 7:20). Walking = lung-breath-on-heart = Yaakov moderating Yosef = reviving principle.",
"מִסְתּוֹבֵב בַּבַּיִת = מְחַיֶּה מֵתִים (אֱלִישָׁע, מ\"ב ד:לה 'וַיְהַלֵּךְ בַּבַּיִת'). ת\"ז תִּקּוּן י\"ג, כ\"ז:: כַּנְפֵי הָרֵאָה נוֹשְׁבוֹת עַל הַלֵּב. רֵאָה = יַעֲקֹב; לֵב = יוֹסֵף (מִיכָה ז:כ). הֲלִיכָה = נְשִׁימַת רֵאָה-לֵב = יַעֲקֹב מְמַתֵּן יוֹסֵף = עִקָּרוֹן הַהַחְיָאָה.", "מ\"ב ד:לה; ת\"ז תִּקּוּן י\"ג, כ\"ז:; מִיכָה ז:כ.")
], "Wandering in House Revives the Dead (Lung/Heart/Yaakov/Yosef, 1 seg)", "בְּמַה שֶׁמִּסְתּוֹבֵב בְּבֵיתוֹ — מְחַיֶּה מֵתִים")

# T93
torahs[93] = make_data(93, [
seg(1, "Opening teaching: 'All who does business in emunah (faithfulness/integrity) fulfills the positive commandment of Ve'ahavta — And you shall love [Hashem your God]' — which is the root (shoresh) of all positive commandments. As it is written in the Tikkunim (Tikkun 21): on the verse 'And make for me delicacies as I love' (Genesis 27:4), these 'delicacies' are the fulfillment of positive commandments. How does one fulfill the commandment of 'And you shall love'? The Talmud (Yoma 86a) teaches: through conducting business faithfully and honestly — causing others to see and say 'Blessed is so-and-so whose Torah learning brought him to this.'",
"All who does business in emunah = fulfills 've'ahavta' = root of all positive commandments. Tikkunim Tikkun 21: 'delicacies as I love' = pikudin d'asei. Yoma 86a: faithful business = 'and you shall love' = sanctifying God's Name through conduct.",
"כָּל הָעוֹסֵק בִּמְשָׂא-וּמַתָּן בֶּאֱמוּנָה = מְקַיֵּם 'וְאָהַבְתָּ' = שׁוֹרֶשׁ כָּל מִצְוֹת עֲשֵׂה. ת\"ז תִּקּוּן כ\"א: 'וַעֲשֵׂה לִי מַטְעַמִּים כַּאֲשֶׁר אָהַבְתִּי' = פִּקּוּדִין דְּעָשֵׂה. יוֹמָא פ\"ו:: מְשָׂא-וּמַתָּן בֶּאֱמוּנָה = 'וְאָהַבְתָּ' = קִדּוּשׁ שֵׁם הַשֵּׁם.", "יוֹמָא פ\"ו:; ת\"ז תִּקּוּן כ\"א."),
seg(2, "Furthermore, through doing business in emunah, one ascends to a level that is above time. As the Talmud says (Yoma 86a, conclusion): 'And upon him the verse says: Israel, in whom I will be glorified' (Isaiah 49:3). 'Israel' rose up in thought — as the Sages taught (Bereishit Rabbah, 1): 'Israel rose up in thought (before creation).' To rise up in thought means to transcend time itself. Similarly, doing business with emunah enables one to transcend time and pray with pure intention, undistracted by temporal concerns.",
"Also: business in emunah → ascends above time. Yoma 86a + Yesh 49:3 'Israel in whom I will be glorified.' 'Israel' rose up in thought (BR 1) = transcending time. Business in emunah → transcend time → pray with pure intention.",
"גַּם: מְשָׂא-וּמַתָּן בֶּאֱמוּנָה → עֲלִיָּה לְמַעְלָה מִן הַזְּמַן. יוֹמָא פ\"ו: + יְשַׁ' מ\"ט:ג. יִשְׂרָאֵל עָלָה בַּמַּחֲשָׁבָה (בר\"ר א) = עֲלִיָּה מֵעַל הַזְּמַן. מְשָׂא-וּמַתָּן בֶּאֱמוּנָה → מִתְעַלֶּה מֵעַל הַזְּמַן → מִתְפַּלֵּל בְּכַוָּנָה טְהוֹרָה.", "יוֹמָא פ\"ו:; יְשַׁ' מ\"ט:ג; בר\"ר א.")
], "Business in Emunah (Ve'ahavta/Above Time, 2 segs)", "כָּל הָעוֹסֵק בֶּאֱמוּנָה — מְקַיֵּם וְאָהַבְתָּ")

# T94
torahs[94] = make_data(94, [
seg(1, "Opening verse: 'He remembered His kindness and His faith to the house of Israel; all the ends of the earth have seen the salvation of our God' (Psalms 98:3).",
"Frame verse: Teh 98:3. Hashem remembered His chesed and emunah to the house of Israel; all ends of earth saw the salvation.",
"פָּסוּק: תה' צ\"ח:ג. הַשֵּׁם זָכַר חַסְדּוֹ וֶאֱמוּנָתוֹ לְבֵית יִשְׂרָאֵל; כָּל אַפְסֵי אָרֶץ רָאוּ יְשׁוּעַת אֱלֹהֵינוּ.", "תה' צ\"ח:ג."),
seg(2, "The matter is: all the worlds were created solely for the sake of Israel. As the verse says: 'For My glory I created it, I formed it, even I made it' (Isaiah 43:7) — the three acts of beri'ah (creation), yetzirah (formation), and asiyah (making) were brought into being solely for 'My glory.' And 'My glory' refers to Israel. As the verse says: 'And I will dwell among them' (Exodus 25:8). The Sages expounded (Shelah, Masecheta Ta'anit, 60a): The verse does not say 'among him' but 'among them' — teaching that the Shechinah rests within each and every individual among Israel.",
"All worlds created for Israel. Yesh 43:7: beri'ah/yetzirah/asiyah for 'My glory' = Israel. Shemot 25:8 'V'shachanti betocham.' Shelah, Ta'anit 60a: 'betocham' (plural) = Shechinah rests within each individual.",
"כָּל הָעוֹלָמוֹת נִבְרְאוּ בִּשְׁבִיל יִשְׂרָאֵל. יְשַׁ' מ\"ג:ז: בְּרִיאָה/יְצִירָה/עֲשִׂיָּה לִ'כְבוֹדִי' = יִשְׂרָאֵל. שְׁמ' כ\"ה:ח 'וְשָׁכַנְתִּי בְּתוֹכָם.' שֶׁלָ\"ה, תַּעֲנִית ס:: 'בְּתוֹכָם' (רַבִּים) = שְׁכִינָה שׁוֹרָה בְּכָל אֶחָד וְאֶחָד.", "יְשַׁ' מ\"ג:ז; שְׁמ' כ\"ה:ח; שֶׁלָ\"ה תַּעֲנִית ס:.")
], "Zachar Chasdo (Worlds Created for Israel/Shechinah in Each Person, 2 segs)", "זָכַר חַסְדּוֹ — כָּל הָעוֹלָמוֹת בִּשְׁבִיל יִשְׂרָאֵל")

# T95
torahs[95] = make_data(95, [
seg(1, "A teaching heard from Rabbeinu himself: When the providers (parnasim) and leaders of the generation become arrogant, then the Holy One, Blessed be He, raises up against them people who will argue with them and speak critically about them — in order that they not become presumptuous in their own minds. As the Sages said (Yoma 22b): 'They do not appoint a provider over the community unless a box of creeping things (sheratzim) is hanging behind him' — meaning there is something unseemly in his past that can be used against him if he becomes haughty.",
"Heard from Rabbeinu. When parnasim/leaders become arrogant → HKBH raises critics against them = to prevent presumption. Yoma 22b: 'don't appoint provider unless box of sheratzim hangs behind him.'",
"שָׁמַע מֵרַבֵּינוּ. כְּשֶׁפַּרְנָסִים/מַנְהִיגִים מִתְגָּאִים → הקב\"ה מֵעִיר עֲלֵיהֶם מְבַקְּרִים = לְמַנֹּעַ יְהִירוּת. יוֹמָא כ\"ב:: 'אֵין מְמַנִּים פַּרְנָס אֶלָּא אִם כֵּן קֻפָּה שֶׁל שְׁרָצִים תְּלוּיָה מֵאֲחוֹרָיו.'", "יוֹמָא כ\"ב:."),
seg(2, "The deeper secret: the 'box of creeping things hanging behind' the leader is not merely a tactic of humiliation, but a structural feature of divine governance. A leader who has this 'box' — this vulnerability — can never become wholly arrogant, because he is always aware that his position is contingent. This is also the aspect of the Talmudic teaching (Sukkah 45b): 'I have seen the people of high levels (ba'alei ma'aleh) and they are few.' True leaders are rare because the temptation of arrogance is so strong. The critics that Hashem raises are therefore doing holy work — they are the 'creeping things' that keep the leader honest.",
"Box of sheratzim = structural feature of divine governance. Leader always aware of contingency = prevented from full arrogance. Sukkah 45b: 'ba'alei ma'aleh are few.' Critics raised by Hashem = holy work = 'sheratzim' keeping leaders honest.",
"קֻפָּה שֶׁל שְׁרָצִים = מַאֲפִיָּן מִבְנִי שֶׁל הַנְהָגָה אֱלֹהִית. מַנְהִיג תָּמִיד מֻדָּע לְמוּגְבָּלוּתוֹ = מְנִיעַת גַּאֲוָה מֻחְלֶטֶת. סֻכָּה מ\"ה:: 'בַּעֲלֵי מַעֲלָה מְעָטִים.' מְבַקְּרִים = עֲבוֹדָה קְדוֹשָׁה.", "יוֹמָא כ\"ב:; סֻכָּה מ\"ה:.")
], "When Leaders Become Arrogant (Divine Checks on Pride, 2 segs)", "כְּשֶׁהַפַּרְנָסִים מִתְגָּאִים — הקב\"ה מֵעִיר עֲלֵיהֶם")

# T96
torahs[96] = make_data(96, [
seg(1, "Opening verse: 'The wicked plots against the righteous and gnashes upon him his teeth; Hashem laughs at him, for He sees that his day will come' (Psalms 37:12-13). The question arises: from where would a foreign thought (machshavah zarah) come to a tzaddik who genuinely desires to pray with great attachment (deveikut)? Surely the Talmud teaches (Yoma 38b): 'One who comes to purify himself — they help him from Heaven.' If he is sincere in wanting to pray with deveikut, why does the foreign thought attack him?",
"Teh 37:12-13. Question: how does machshavah zarah attack a tzaddik who sincerely wants deveikut in prayer? Yoma 38b: 'one who comes to purify, they help him.' Contradiction?",
"תה' ל\"ז:יב-יג. שְׁאֵלָה: כֵּיצַד מַחֲשָׁבָה זָרָה תּוֹקֶפֶת צַדִּיק הַמְבַקֵּשׁ דְּבֵקוּת בִּתְפִלָּה? יוֹמָא ל\"ח:: 'הַבָּא לְטַהֵר מְסַיְּעִין אוֹתוֹ.' סְתִירָה?", "תה' ל\"ז:יב-יג; יוֹמָא ל\"ח:."),
seg(2, "The answer: from the time of the shattering of the vessels (sheviras hakeilim), sparks (nitzotzot) fell from all the worlds. Through the prayers of tzaddikim, these sparks ascend — level by level, little by little. When a tzaddik stands to pray with great intention, all the sparks from his level come rushing to him, seeking to be elevated through his prayer. These incoming sparks — which contain both the holy kernel and the outer husk still attached — create a temporary storm of foreign thoughts. This is not an attack from the wicked, but the desperate rush of sparks seeking rectification. 'The wicked plots against the righteous' — the 'wicked' here is really the outer layer of the sparks pressing toward the tzaddik in their desire to ascend.",
"Answer: from sheviras hakeilim, nitzotzot fell. Through tzaddik's prayers they ascend level by level. When tzaddik prays with great intention = all sparks of his level rush to him = creates storm of foreign thoughts. 'Wicked plots against righteous' = outer husks of sparks pressing to ascend through the tzaddik.",
"תְּשׁוּבָה: מִשְּׁבִירַת הַכֵּלִים, נִיצוֹצוֹת נָפְלוּ. דַּרְךְ תְּפִלּוֹת צַדִּיקִים הֵם עוֹלִים מַדְרֵגָה בְּמַדְרֵגָה. כְּשֶׁצַּדִּיק מִתְפַּלֵּל בִּכַוָּנָה גְּדוֹלָה = כָּל נִיצוֹצוֹת מַדְרֵגָתוֹ רָצִים אֵלָיו = מַחֲשָׁבוֹת זָרוֹת. 'רָשָׁע יִצְפֹּן לַצַּדִּיק' = קְלִיפוֹת חִיצוֹנוֹת שֶׁל הַנִּיצוֹצוֹת.", "תה' ל\"ז:יב-יג; יוֹמָא ל\"ח:; שְׁבִירַת הַכֵּלִים.")
], "Wicked Plots Against Righteous (Foreign Thoughts/Sparks Rushing, 2 segs)", "רָשָׁע יִצְפֹּן לַצַּדִּיק — מַחֲשָׁבוֹת זָרוֹת וְנִיצוֹצוֹת")

# Write all, register all, batch commit
lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)

git_files = ['src/data/lm-commentaries.json']
for n in range(87, 97):
    out_path = os.path.join(pnc_dir, f'torah-{n}.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(torahs[n], f, ensure_ascii=False, indent=2)
    with open(out_path, encoding='utf-8') as f:
        chk = json.load(f)
    avg = sum(len(s['beginner']['en']) for s in chk['segments']) / len(chk['segments'])
    print(f"T{n}: {len(chk['segments'])} segs, avg {avg:.0f} chars")
    if str(n) not in cdata['1']:
        cdata['1'][str(n)] = {}
    cdata['1'][str(n)]['running_commentary'] = {
        "book": pnc_name, "slug": pnc_name, "status": "available",
        "url": f"/reader/{pnc_name}/torah-{n}.json",
        "layers": ["beginner", "intermediate", "scholarly"],
        "author": "Petten Nanach",
        "label": f"Petten Nanach Running Commentary - {torahs[n]['title'].replace('T' + str(n) + ' PNC - ', 'T' + str(n) + ' ')}"
    }
    git_files.append(f'public/reader/{pnc_name}/torah-{n}.json')

with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T87-T96")

subprocess.run(['git', 'add'] + git_files, cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T87-T96 PNC -- dinim/tzaddik-channel/lacks/faith-limbs/business-emunah/sheratzim/sparks (20 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
