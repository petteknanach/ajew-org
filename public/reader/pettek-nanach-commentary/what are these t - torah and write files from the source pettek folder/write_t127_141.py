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

# T127: garments = chashmal / guarding / must be whole and untorn
torahs[127] = make_data(127, [
seg(1,
"The garments a person wears correspond to the mystical concept of chashmal (Ezekiel 1:27) — the luminous divine fire described in Ezekiel's vision. Chashmal represents guarding and spiritual protection. Therefore, garments must always remain whole and untorn. Any tearing of a garment damages this spiritual protection — it creates an opening in the protective envelope that chashmal provides. This is the deeper reason for the prohibition of tearing one's garments in anger: it is not merely a matter of controlling one's temper, but an actual spiritual act that damages one's protective covering. The garment is not merely physical clothing but a spiritual vessel that both expresses and maintains the integrity of the person's spiritual state.",
"Garments = secret of chashmal (Yech 1:27) = guarding/protection. Must be whole and untorn. Tearing = damages chashmal-protection. Prohibition of tearing in anger = spiritual act, not just temper control. Garment = spiritual vessel maintaining integrity of person's state.",
"בְּגָדִים = סוֹד חַשְׁמַל (יְחֶז' א:כז) = שְׁמִירָה וְהַגָּנָה. חַיָּבִים לִהְיוֹת שְׁלֵמִים וּבְלִי קְרִיעָה. קְרִיעָה = פְּגִיעָה בְּשִׁרְיוֹן הַחַשְׁמַל. אִיסּוּר קְרִיעָה מֵחֲמַת כַּעַס = פְּעֻלָּה רוּחָנִית. בֶּגֶד = כְּלִי רוּחָנִי שׁוֹמֵר שְׁלֵמוּת.",
"יְחֶז' א:כז."
),
], "Garments Are Chashmal — Spiritual Protection / Keep Whole (1 seg)", "הַבְּגָדִים סוֹד הַחַשְׁמַל — הַגָּנָה רוּחָנִית וּשְׁלֵמוּת")

# T128: "they blinded its eyes and left it" (Yoma 69b) / yetzer hara for immorality / blinded but remains
torahs[128] = make_data(128, [
seg(1,
"The Talmud (Yoma 69b) records that in the time of Ezra, the Men of the Great Assembly prayed and were able to subdue the evil inclination for sexual immorality — they 'blinded its eyes and left it.' Yet even with its eyes blinded, the yetzer hara for immorality was not destroyed — it still remains in the world. The teaching here: even when a great spiritual victory is won over the yetzer hara, it is not eliminated but only limited or blinded. The underlying drive remains, changed in its form. This is not a failure but a necessary feature of the world: the yetzer hara must remain for human beings to have free choice and the opportunity to earn genuine spiritual merit. What changes through spiritual work is not the elimination of the drive but the loss of its ability to fully 'see' — its power to entice and seduce is reduced, even if its existence continues. The person must know: the victory over the yetzer hara is real, but ongoing vigilance is still required.",
"Yoma 69b: Men of Great Assembly subdued yetzer hara for immorality — 'blinded its eyes and left it.' Not destroyed — still remains. Blinding = reducing seductive power, not elimination. Yetzer hara must remain for free choice and spiritual merit. Victory = real, but ongoing vigilance required.",
"יוֹמָא ס\"ט:: אַנְשֵׁי כְּנֶסֶת הַגְּדוֹלָה כִּבְּשׁוּ יֵצֶר הָרַע לְעֶרְוָה = 'סַמּוּ עֵינֵיהּ וּשְׁבַקוּהָ.' לֹא הִשְׁמִידוּהָ — עֲדַיִן קַיֶּמֶת. עִוּוּרוֹן = הַחְלָשַׁת כֹּחַ הַפִּיתּוּי, לֹא בִּיעוּר. יֵצֶר הָרַע חַיָּב לְהִשָּׁאֵר לְבֵחִירָה חָפְשִׁית וְשָׂכָר. נִצָּחוֹן אֲמִתִּי, אֲבָל עֵרָנוּת מְתמֶדֶת נְדָרֶשֶׁת.",
"יוֹמָא ס\"ט:."
),
], "They Blinded Its Eyes — Yetzer Hara Subdued But Not Destroyed (1 seg)", "סַמּוּ עֵינֵיהּ — יֵצֶר הָרַע מְעֻוָּר אַךְ לֹא בָּטֵל")

# T129: "land devours its inhabitants" / faith in tzaddik alone assists even if receives nothing
torahs[129] = make_data(129, [
seg(1,
"The verse: 'A land that devours its inhabitants' (Numbers 13:32 — the spies' negative report about the Land of Israel). When one draws close to the tzaddik (righteous teacher), even if one receives nothing tangible from him — no specific lesson, no direct guidance, no visible spiritual experience — the very act of being there and having faith in the tzaddik still greatly assists the person in serving God. The faith alone — the emunah in the tzaddik — is itself a spiritual force that elevates and strengthens the person. This is the 'land that devours': just as the land of Israel absorbs its inhabitants into itself (which the spies saw negatively but is actually a spiritual elevation — the land draws people into its own holiness), so too the tzaddik's presence absorbs and elevates those around him, even if they are not consciously aware of what they are receiving.",
"Bamidbar 13:32: 'land that devours its inhabitants.' Drawing close to tzaddik: even if receives nothing tangible, faith in tzaddik alone assists in serving God. Emunah itself = spiritual force that elevates. 'Land devours' = land draws inhabitants into holiness — elevation, not destruction. Tzaddik's presence absorbs and elevates those near him.",
"בַּמ' י\"ג:לב: 'אֶרֶץ אֹכֶלֶת יוֹשְׁבֶיהָ.' הִתְקָרְבוּת לַצַּדִּיק: אַף שֶׁלֹּא מְקַבֵּל כְּלוּם מוּחָשִׁי — אֱמוּנָה בַּצַּדִּיק לְבַדָּהּ עוֹזֶרֶת לַעֲבוֹדַת ה'. אֱמוּנָה = כֹּחַ רוּחָנִי מְרוֹמֵם. 'אָרֶץ אֹכֶלֶת' = קֶדֶשׁ הָאָרֶץ סוֹפֵג יוֹשְׁבֶיהָ = עֲלִיָּה. נוֹכְחוּת צַדִּיק סוֹפֶגֶת וּמְרוֹמֶמֶת.",
"בַּמ' י\"ג:לב."
),
], "Land Devours Inhabitants — Faith in Tzaddik Alone Elevates (1 seg)", "אֶרֶץ אֹכֶלֶת יוֹשְׁבֶיהָ — אֱמוּנָה בַּצַּדִּיק לְבַדָּהּ מְרוֹמֶמֶת")

# T130: "if greater than his fellow his inclination is greater" (Sukkah 52a) / humility saves from licentiousness / Sotah 4b
torahs[130] = make_data(130, [
seg(1,
"The Talmud (Sukkah 52a) teaches: 'If someone is greater than his fellow, his evil inclination is greater than him.' The greater a person becomes spiritually, the larger and more powerful the yetzer hara that confronts him. This is not a punishment but the natural consequence of having more spiritual substance — there is more for the yetzer hara to fight against and more territory it wants to reclaim. Yet through humility, a person is saved from licentiousness and merits the preservation of the covenant (shmirat habrit) — as our Sages teach (Sotah 4b). One who is truly humble is not seen as a significant target by the forces of impurity. Humility is thus a shield: the arrogant person presents a large ego-target that the yetzer hara can assail, while the humble person — who considers himself as nothing — has reduced the surface area of his ego and thereby reduced his vulnerability.",
"Sukkah 52a: 'Greater than his fellow → his inclination is greater.' Spiritual greatness = larger yetzer hara. Through humility: saved from licentiousness + merits shmirat habrit (Sotah 4b). Humility = shield: arrogant = large ego-target; humble = reduced ego-surface = less vulnerability.",
"סוּכ' נ\"ב:: 'גָּדוֹל מֵחֲבֵרוֹ יִצְרוֹ גָּדוֹל מִמֶּנּוּ.' גְּדֻלָּה רוּחָנִית = יֵצֶר הָרַע גָּדוֹל יוֹתֵר. דֶּרֶךְ עֲנָוָה: נִיצּוֹל מֵעֶרְוָה + זוֹכֶה לִשְׁמִירַת הַבְּרִית (סוֹטָה ד:). עֲנָוָה = מָגֵן: גַּאֲוָן = מַטָּרָה גְּדוֹלָה; עָנָו = שֶׁטַח אֶגוֹ מְצוּמְצָם = פָּחוֹת חָשׁוּף.",
"סוּכ' נ\"ב:; סוֹטָה ד:."
),
], "Greater Person Greater Inclination — Humility Shields From Licentiousness (1 seg)", "גָּדוֹל מֵחֲבֵרוֹ יִצְרוֹ גָּדוֹל — עֲנָוָה מַגִּינָה מִן הָעֶרְוָה")

# T131: must fear honor / honor = King of honor / judgment / dangerous to life
torahs[131] = make_data(131, [
seg(1,
"A person must fear and dread honor — public recognition, prestige, and position — because honor is a grave spiritual danger that jeopardizes one's very life. The verse 'Who is the King of honor?' (Psalms 24:10) reveals that 'honor' (kavod) has the quality of royalty and judgment. Honor represents regal authority — and all those who hold authority render judgment, and all others scrutinize and judge them in turn. The person who seeks or accepts honor becomes exposed to divine scrutiny of all his deeds, as if standing before a royal court where nothing is hidden. This intense scrutiny can be spiritually fatal. Furthermore, the pursuit of honor is a form of arrogance — the person who chases honor is placing himself in the role of king, claiming the space that belongs only to God. Therefore, the spiritually aware person actively flees from honor rather than pursuing it.",
"Must fear and dread honor = grave spiritual danger. Teh 24:10: 'King of honor' — honor = regal authority + judgment. Accepting honor = exposed to divine scrutiny of all deeds = spiritually dangerous. Pursuit of honor = arrogance = claiming space belonging only to God. Spiritually aware person actively flees honor.",
"צָרִיךְ לִירֹא מִפְּנֵי הַכָּבוֹד = סַכָּנָה רוּחָנִית חֲמוּרָה. תה' כ\"ד:י: 'מֶלֶךְ הַכָּבוֹד' — כָּבוֹד = סַמְכוּת מְלוּכָה + דִּין. קַבָּלַת כָּבוֹד = חֲשִׂיפָה לְבִקּוֹרֶת אֱלֹהִית עַל כָּל הַמַּעֲשִׂים = סַכָּנָה. רְדִיפַת כָּבוֹד = גַּאֲוָה. עֶבֶד ה' בּוֹרֵחַ מִן הַכָּבוֹד.",
"תה' כ\"ד:י."
),
], "Fear Honor — King of Honor Judges / Danger of Prestige (1 seg)", "לִירֹא מִן הַכָּבוֹד — מֶלֶךְ הַכָּבוֹד שׁוֹפֵט / סַכָּנַת הַיֹּקֶר")

# T132: tzaddik famous in one land not another / spring travels underground
torahs[132] = make_data(132, [
seg(1,
"There is a tzaddik who is renowned and greatly respected in one country or region, yet in the neighboring country he is not recognized or valued at all. Then in a third land, he again becomes renowned. This is compared to a spring of water that emerges visibly in one place, then travels underground for a distance until it reemerges at another location. The spring is the same spring throughout — its water never changes — but it is only visible and accessible in the places where it surfaces. Similarly, the tzaddik's spiritual light and influence are constant, but they are perceived and received only in the places and times where the spiritual 'surface' is receptive. The teaching: the value of a tzaddik is not determined by how many people recognize him. His inner reality is constant regardless of external recognition. Those who cannot see him are like people standing over the underground stretch of the spring — the water flows beneath them, but they do not perceive it.",
"Tzaddik renowned in one land, unrecognized in the next, renowned again in third. Like a spring: visible in one place, travels underground, reemerges elsewhere. Spring = same throughout; only visible where it surfaces. Tzaddik's light = constant; perceived where spiritually receptive. Value not determined by recognition. Unrecognizers = standing over underground stretch — water flows but they don't perceive it.",
"צַדִּיק מְפֻרְסָם בְּאֶרֶץ אַחַת, לֹא מוּכָּר בַּשְּׁנִיָּה, מְפֻרְסָם שׁוּב בַּשְּׁלִישִׁית. כְּמַעְיָן: גָּלוּי בְּמָקוֹם אֶחָד, נוֹסֵעַ תַּחַת הָאָרֶץ, שׁוּב עוֹלֶה. הַמַּעְיָן = אוֹתוֹ מַעְיָן; נִרְאֶה רַק הֵיכָן שֶׁמֵּגִיחַ. אוֹר הַצַּדִּיק = קָבוּעַ; נִקְלָט הֵיכָן שֶׁמּוּכָן רוּחָנִי. עֶרֶךְ לֹא תָּלוּי בְּהַכָּרָה חִיצוֹנִית.",
""
),
], "Tzaddik Famous in One Land — Spring Travels Underground (1 seg)", "צַדִּיק מְפֻרְסָם בְּאֶרֶץ אַחַת — מַעְיָן הַנּוֹסֵעַ תַּחַת הָאָרֶץ")

# T133: "path of righteous like light of dawn" (Teh 85:14) / sun same at dawn and midday / limit due to receiver not sun
torahs[133] = make_data(133, [
seg(1,
"Opening verse: 'And the path of the righteous is like the light of dawn, going on and growing until midday is firmly established' (Proverbs 4:18). The sun radiates the same light at dawn as at midday — the sun itself does not change or grow. Yet at dawn, the light reaching us is limited and dim; at midday, it is full and brilliant. The difference is not in the sun but in the receiver: at dawn, the earth's atmosphere refracts and scatters the light, blocking most of it. As the sun rises, the direct-path angle improves and more light reaches the receiver. So too with the spiritual light available to a tzaddik or any person on the path of divine service: the divine light is always constant and full. What grows is not the light itself but the person's capacity to receive it. As one grows in spiritual refinement — clearing the 'atmosphere' of ego, sin, and spiritual coarseness — more of the always-available divine light can reach and illuminate one.",
"Mishlei 4:18: 'Path of righteous = light of dawn growing to midday.' Sun = same light at dawn and midday. Difference = receiver, not sun. Dawn = atmosphere blocks; as sun rises = more direct path = more reaches receiver. So with divine light: always constant and full. What grows = person's receiving capacity. Spiritual refinement = clearing atmosphere → more divine light received.",
"מִשְׁלֵי ד:יח: 'אֹרַח צַדִּיקִים כְּאוֹר נֹגַהּ הוֹלֵךְ וָאוֹר עַד נְכוֹן הַיּוֹם.' הַשֶּׁמֶשׁ = אוֹר זָהֶה בַּבֹּקֶר וּבַצָּהֳרַיִם. הֶבְדֵּל = הַמְּקַבֵּל, לֹא הַשֶּׁמֶשׁ. שַׁחֲרִית = אֲטְמוֹסְפֵרָה חוֹסֶמֶת; עִם עֲלִיַּת הַשֶּׁמֶשׁ = יוֹתֵר אוֹר מַגִּיעַ. כֵּן אוֹר אֱלֹהִי: תָּמִיד מָלֵא. הַגָּדֵל = כֹּשֶׁר הַקְּבָלָה שֶׁל הָאָדָם.",
"מִשְׁלֵי ד:יח."
),
], "Path of Righteous Like Dawn's Light — Divine Light Constant / Receiver Grows (1 seg)", "אֹרַח צַדִּיקִים כְּאוֹר נֹגַהּ — הָאוֹר הָאֱלֹהִי קָבוּעַ / הַמְּקַבֵּל גָּדֵל")

# T134: teaching Torah even to one is great / must not teach beyond listener's capacity
torahs[134] = make_data(134, [
seg(1,
"Teaching Torah — even to a single individual — is a great and holy work. All the more so when teaching many. However, a teacher must exercise extreme care not to convey concepts that are beyond the listener's current capacity to receive and understand. Teaching Torah beyond the listener's capacity is compared to a form of licentiousness — it is a misplacing of something holy into a space that cannot yet hold it, and the result is not illumination but damage. The Torah given to a student who is not yet ready for it does not build him up — it can overwhelm and confuse, leading to spiritual harm rather than growth. The teaching must always be calibrated to the student: give what the student can receive and absorb, and when the student grows, give more. This is the path of the true teacher.",
"Teaching Torah even to one person = great work; more so to many. But: extreme care not to teach beyond listener's capacity. Teaching beyond capacity = compared to licentiousness = misplacing holy thing into space that can't hold it. Result: overwhelm + damage, not growth. Torah must be calibrated to student's capacity. True teacher: give what student can receive, increase as student grows.",
"לְלַמֵּד תּוֹרָה אַף לְיָחִיד = מְלַאכָה גְּדוֹלָה; כָּל שֶׁכֵּן לְרַבִּים. אֲבָל: זְהִירוּת קִיצוֹנִית לָ תְלַמֵּד מֵעַל כֹּחַ הַמְּקַבֵּל. לִמּוּד מֵעַל הַכֹּשֶׁר = כַּעֲרָיוֹת = מִשְׁגֶּה קָדוֹשׁ בְּמָקוֹם שֶׁאֵינוֹ יָכוֹל לְהַחֲזִיק. תוֹצָאָה: נֵזֶק, לֹא גִּדּוּל. תּוֹרָה חַיֶּבֶת לְהִמָּדֵד לְפִי כֹּשֶׁר הַתַּלְמִיד.",
""
),
], "Teaching Torah Even to One — Must Not Exceed Listener's Capacity (1 seg)", "גְּדוּלָּה הִיא לוֹמַד תּוֹרָה אֲפִלּוּ לְאֶחָד — אַל תְּלַמֵּד מֵעַל הַכֹּשֶׁר")

# T135: 5 segs — "For I take an appointed time" / segula of honoring Yom Tov / Moshe 49 gates = humility / elevating Malchut from four kingdoms / closed mem = liberation
torahs[135] = make_data(135, [
seg(1,
"Opening verse: 'For I take an appointed time; I judge equities' (Psalms 75:3). There is a spiritual practice (segula) of being saved from the dangers of greatness/arrogance by honoring the good days — the holy festivals (Yamim Tovim) — and by receiving each holy day with joy and an expansive heart, according to one's ability. Moses, our teacher, merited the forty-nine gates of understanding and thereby became 'exceedingly humble, more than any man upon the face of the earth' (Numbers 12:3). The connection: the forty-nine gates correspond to the forty-nine days of the Omer between Pesach and Shavuot — the structured counting through which one ascends to receive the Torah. Moses's humility was directly connected to his receiving of all forty-nine gates of understanding.",
"Teh 75:3. Segula: honor Yamim Tovim with joy = saved from arrogance. Moshe merited 49 gates of understanding → became 'exceedingly humble' (Bamidbar 12:3). 49 gates = 49 days of Omer. Moshe's humility = direct product of receiving all 49 gates.",
"תה' ע\"ה:ג. סְגוּלָּה: כַּבֵּד יָמִים טוֹבִים בְּשִׂמְחָה = נִיצּוֹל מִגַּאֲוָה. מֹשֶׁה זָכָה לְמ\"ט שַׁעֲרֵי בִינָה → 'עָנָו מְאֹד מִכָּל הָאָדָם' (בַּמ' י\"ב:ג). מ\"ט שְׁעָרִים = מ\"ט יְמֵי הָעֹמֶר. עֲנָוַת מֹשֶׁה = תּוֹצָאָה יְשִׁירָה שֶׁל קַבָּלַת כָּל מ\"ט הַשְּׁעָרִים.",
"תה' ע\"ה:ג; בַּמ' י\"ב:ג."
),
seg(2,
"Even when one studies Torah with a degree of pride, the divine command is: 'You shall speak righteousness — judge the upright' (Psalms 58:2). By observing the festivals with proper joy and reverence, one merits humility — which is the essence of 'judging equities.' The Talmud (Hullin 89a) derives: even Torah study colored by pride is redeemed by the observance of holy days that strip away the arrogance and restore the proper inner stance. The good days (festivals) are divinely given appointments for spiritual recalibration — they interrupt the accumulation of ego and pride that naturally builds during the normal flow of the year.",
"Even Torah studied with pride: 'You shall speak righteousness — judge upright' (Teh 58:2). Hullin 89a: observing festivals → merits humility = judging equities. Festivals = divinely given appointments for recalibration. Interrupt ego/pride accumulated during the year.",
"אַף תּוֹרָה בְּגַאֲוָה: 'צֶדֶק תְּדַבֵּרוּן — מֵישָׁרִים תִּשְׁפְּטוּ' (תה' נ\"ח:ב). חוּל' פ\"ט:: חֲגִיגַת יָמִים טוֹבִים → עֲנָוָה = שְׁפִיטַת מֵישָׁרִים. יָמִים טוֹבִים = מוֹעֲדִים אֱלֹהִיִּים לִכְוּוּן מֵחָדָשׁ. מַפְסִיקִים הִצְטַבְּרוּת אֶגוֹ/גַּאֲוָה שֶׁל כָּל הַשָּׁנָה.",
"תה' נ\"ח:ב; חוּל' פ\"ט:."
),
seg(3,
"Through the bond with the tzaddik, one may receive the holiness of the holy day. The core mission of each good day (Yom Tov) is to elevate the Kingship of Holiness — the sefirah of Malchut, represented by the letter Dalet — from its captivity within the four kingdoms of the Other Side (the four klipot). Malchut has no intrinsic substance of its own: 'there is no king without a people' — it needs subjects to give it expression. It 'fell' into the four kingdoms of impurity, which are the four false kingdoms that claim dominion. On each holy day, the mission is to raise Malchut from beneath these 'clumps' of impurity and restore it to its proper place in holiness.",
"Bond with tzaddik → receive holiness of Yom Tov. Core mission of Yom Tov: elevate Malchut (Dalet/Kingship of Holiness) from four kingdoms of Other Side. Malchut = no intrinsic substance = 'no king without people' → fell into four impure kingdoms. Yom Tov = raise Malchut from these clumps → restore to holiness.",
"דְּבֵקוּת לַצַּדִּיק → קַבָּלַת קְדֻשַּׁת יוֹם טוֹב. שְׁלִיחוּת יוֹם טוֹב: הֲרָמַת מַלְכוּת הַקְּדֻשָּׁה (דָּלֶ\"ת) מֵאַרְבַּע מַלְכוּיּוֹת הַסִּטְרָא אָחֳרָא. מַלְכוּת = אֵין לָהּ עַצְמוּת = 'אֵין מֶלֶךְ בְּלִי עָם' → נָפְלָה לְאַרְבַּע מַלְכוּיּוֹת הַטֻּמְאָה. יוֹם טוֹב = הָרָמַת מַלְכוּת מֵהַגּוּשִׁים → חֲזָרָה לִקְדֻשָּׁה.",
"תה' ע\"ה:ג."
),
seg(4,
"The tzaddikim centralize the holiness of the festival, through whom personal greatness (ego/pride) is nullified — like youths who hide and efface themselves before their elders. The mystical letter Mem-sofit (the closed final Mem) represents spiritual concealment. When this closed Mem is opened — 'sliced' — it yields two Dalet-shaped openings. The Dalet represents Malchut (the poor/lacking sefirah that receives). Two Dalets = two openings of spiritual birth and liberation. This is the mystical mechanism: the concealed light (closed Mem) opens into revealed receiving-vessels (Dalet), allowing the spiritual energy of the holy day to flow through and be received.",
"Tzaddikim centralize festival holiness; through them, personal ego nullified — youths before elders. Closed Mem-sofit = spiritual concealment. Opening it = two Dalet-shaped openings. Dalet = Malchut/receiving vessel. Two Dalets = two openings of spiritual birth/liberation. Concealed light (closed Mem) → revealed receiving-vessels (Dalet) = flow of Yom Tov energy.",
"צַדִּיקִים מְרַכְּזִים קְדֻשַּׁת הַמּוֹעֵד; דֶּרֶכָּם גְּדֻלָּה אִישִׁית בְּטֵלָה — כִּנְעָרִים הַמַּסְתִּירִים עַצְמָם לִפְנֵי זְקֵנִים. מֶ\"ם סְתוּמָה = הֶעְלֵם רוּחָנִי. פִּתְחוּנָהּ = שְׁתֵּי פְּתִיחוֹת בְּצוּרַת דָּלֶ\"ת. דָּלֶ\"ת = מַלְכוּת/כְּלִי קַבָּלָה. שְׁתֵּי דָּלֶ\"תִין = שְׁתֵּי פְּתִיחוֹת לֵידָה/שִׁחְרוּר. אוֹר מֻסְתָּר → כְּלִים גְּלוּיִים = זְרִימַת אֶנֶרְגְּיַת הַמּוֹעֵד.",
"תה' ע\"ה:ג."
),
seg(5,
"The destruction of Amalek represents the severing of the fourfold impurity — Amalek being the archetype of arrogance and the force that attacks the weak and weary (the letter Dalet = dalut, poverty/weakness). Destroying Amalek is the same as restoring the four spiritual realms to holiness, releasing the Malchut from its captivity in the four impure kingdoms. This is completed through the festivals — the appointed times — where the divine judgment is 'equity,' meaning each person's greatness is equalized and subdued into proper humility before God, and Malchut is returned to its place in holiness.",
"Amalek = archetype of arrogance + attacks weak (Dalet = dalut = poverty). Destroying Amalek = severing fourfold impurity = restoring four realms to holiness = releasing Malchut from captivity. Completed through festivals (appointed times): divine judgment = equity = each person's greatness equalized into humility → Malchut returned to holiness.",
"עֲמָלֵק = אַרְכֵּטִיפּ הַגַּאֲוָה + תוֹקֵף הַחַלָּשִׁים (דָּלֶ\"ת = דַּלּוּת). מְחִיַּת עֲמָלֵק = בִּיתוּר טֻמְאָה מְרֻבָּעֶת = שְׁחָרוּר מַלְכוּת. מְשַׁלֵּם דֶּרֶךְ הַמּוֹעֲדִים: דִּין = מֵישָׁרִים = גְּדֻלָּה אִישִׁית מִתְשַׁוֶּה לַעֲנָוָה → מַלְכוּת חוֹזֶרֶת לִקְדֻשָּׁה.",
"תה' ע\"ה:ג; בַּמ' י\"ב:ג."
),
], "For I Take an Appointed Time — Yom Tov/Humility/Malchut/Amalek (5 segs)", "כִּי אֶקַּח מוֹעֵד — יוֹם טוֹב, עֲנָוָה, מַלְכוּת, וּמְחִיַּת עֲמָלֵק")

# T136: "Do not judge your fellow until you reach his place" (Avot 2:4) / judge favorably
torahs[136] = make_data(136, [
seg(1,
"Pirkei Avot (2:4) teaches: 'Do not judge your fellow until you reach his place.' Additionally, the earlier chapter of Avot instructs us to judge every person to the scale of merit — that is, to find the favorable interpretation of their actions. When there is a question or dispute about someone's conduct, one must first try to understand it in the most favorable light possible. The reason: no one can fully understand another person's situation — their pressures, their inner state, their history, their temptations — unless they have stood in that exact place themselves. To judge without that understanding is to judge incompletely. The practical teaching: before judging anyone, ask yourself whether you have truly been in their position. If not, withhold judgment. And even if you have been in a similar position, remember that the details of their situation are known only to God.",
"Avot 2:4: 'Do not judge your fellow until you reach his place.' Also Avot 1: judge everyone to scale of merit (favorably). Cannot fully understand another's situation without standing in their place. Judging without that understanding = incomplete judgment. Practice: before judging, ask if you've truly been in their position. If not, withhold. Even if similar — details known only to God.",
"אָבוֹת ב:ד: 'אַל תָּדִין אֶת חֲבֵרְךָ עַד שֶׁתַּגִּיעַ לִמְקוֹמוֹ.' אָבוֹת א: שְׁפֹּט כָּל אָדָם לְכַף זְכוּת. לֹא יָכוֹל לְהָבִין מַצָּב הַשֵּׁנִי בְּלֹא עֲמִידָה בְּמָקוֹמוֹ. שְׁפִיטָה בְּלִי הֲבָנָה = חֲסֵרָה. מַעֲשִׂי: לִפְנֵי שִׁפּוּט — בְּדֹק אִם הָיִיתָ בְּמָקוֹמוֹ. אִם לֹא — הִמָּנַע. אַף אִם כֵּן — פְּרָטִים יְדוּעִים לֵאלֹהִים בִּלְבַד.",
"אָבוֹת ב:ד; אָבוֹת א."
),
], "Do Not Judge Until You Reach His Place — Judge Every Person Favorably (1 seg)", "אַל תָּדִין אֶת חֲבֵרְךָ — שְׁפֹּט כָּל אָדָם לְכַף זְכוּת")

# T137: "My portion O God I said to guard Your words" (Teh 119:57) / spiritual inheritance tells one to guard
torahs[137] = make_data(137, [
seg(1,
"Opening verse: 'My portion, O God, I have said, is to guard Your words' (Psalms 119:57). The verse is understood to mean: the spiritual portion — the spiritual inheritance — that I receive from Above constantly tells me and instructs me to guard Your words. A person's divine portion speaks to him from within, directing him toward his mission. The 'portion' here is not merely a share of material inheritance but the unique spiritual soul-portion that each person receives — the specific aspect of divine light that belongs to them and seeks expression through their life and actions. This inner portion is always communicating, always calling a person toward his true path. The verse 'My portion, O God' — my portion itself says: guard God's words. The soul's own divine portion is the inner teacher and motivator.",
"Teh 119:57. 'My portion O God I said to guard Your words' = the spiritual portion/inheritance I receive from Above constantly tells me to guard Your words. Each person has a unique divine soul-portion that speaks to them from within. This portion = inner teacher directing toward true path. 'My portion says: guard God's words' = soul's divine portion as inner motivator.",
"תה' קי\"ט:נז. 'חֶלְקִי ה' אָמַרְתִּי לִשְׁמֹר דְּבָרֶיךָ' = חֶלֶק הָרוּחָנִי שֶׁמְּקַבֵּל מִלְּמַעְלָה תָּמִיד אוֹמֵר לִי לִשְׁמֹר דְּבָרֶיךָ. לְכָל אֶחָד חֵלֶק נְשָׁמָה אֱלֹהִי יָחִיד. חֵלֶק זֶה = מוֹרֶה פְּנִימִי הַמְּכַוֵּן לַדֶּרֶךְ הָאֲמִתִּית. 'חֶלְקִי אוֹמֵר: שְׁמֹר דְּבָרַי' = חֵלֶק הָאֱלֹהִי כְּמֵנִיעַ פְּנִימִי.",
"תה' קי\"ט:נז."
),
], "My Portion Says Guard Your Words — Soul's Divine Portion as Inner Teacher (1 seg)", "חֶלְקִי ה' — חֵלֶק הַנְּשָׁמָה הָאֱלֹהִי כְּמוֹרֶה פְּנִימִי")

# T138: "To You my heart said: seek my face" (Teh 27:8) / Rashi: heart houses principal divinity / rock of my heart
torahs[138] = make_data(138, [
seg(1,
"Opening verse: 'To You my heart said: Seek My face' (Psalms 27:8). Rashi explains that this refers to the heart directing a person toward God's mission — because the heart houses the principal divinity within a person. The verse 'Rock of my heart' (Psalms 73:26) confirms this: the heart is the stable, foundational seat of divine presence within the person. The heart itself says to the person: 'Go seek God's face.' The inner voice that draws a person toward God, toward holiness, toward prayer — this is the voice of the divine that dwells in the heart. It is not an external command but an internal call from one's own deepest center. The teaching: when a person feels drawn toward God — that pull is the voice of his own heart, which houses the divine spark. To follow that pull is to follow one's truest inner nature.",
"Teh 27:8: 'To You my heart said: Seek My face.' Rashi: heart directs toward God's mission = heart houses principal divinity. Teh 73:26: 'Rock of my heart' = heart = stable seat of divine presence. Heart itself says: 'Go seek God.' Pull toward God = voice of divine dwelling in heart. Not external command — internal call from deepest center. Following the pull = following truest inner nature.",
"תה' כ\"ז:ח: 'לְךָ אָמַר לִבִּי בַּקְּשׁוּ פָנַי.' רש\"י: הַלֵּב מְכַוֵּן לִשְׁלִיחוּת ה' = הַלֵּב מְשַׁכֵּן אֶת הָאֱלֹהוּת הָעִיקָּרִית. תה' ע\"ג:כו: 'צוּר לְבָבִי' = הַלֵּב = מוֹשַׁב יָצִיב שֶׁל שְׁכִינָה. הַלֵּב אוֹמֵר: 'לֵךְ בַּקֵּשׁ אֶת ה'.' מְשִׁיכָה לֵאלֹהִים = קוֹל הָאֱלֹהוּת בַּלֵּב. לֹא פְּקוּדָּה חִיצוֹנִית — קְרִיאָה פְּנִימִית. לְהַלֵּךְ אַחַר הַמְּשִׁיכָה = לְהַלֵּךְ אַחַר הַטֶּבַע הַפְּנִימִי הָאֲמִתִּי.",
"תה' כ\"ז:ח; תה' ע\"ג:כו."
),
], "To You My Heart Said Seek My Face — Heart Houses the Divine / Inner Call (1 seg)", "לְךָ אָמַר לִבִּי בַּקְּשׁוּ פָנַי — הַלֵּב מְשַׁכֵּן אֱלֹהוּת / קְרִיאָה פְּנִימִית")

# T139: "Righteousness shall go before Him" (Teh 85:14) / preciousness of Shabbat / tzedakah on weekdays saves
torahs[139] = make_data(139, [
seg(1,
"Opening verse: 'Righteousness shall go before Him, and He shall set a path for His steps' (Psalms 85:14). This refers to the preciousness of Shabbat. During the weekdays, the chitzonim (external spiritual forces, the Other Side) have dominance and obstruct divine service. However, the person who performs acts of tzedakah (righteousness/charity) during the weekdays — giving generously, acting justly — earns a spiritual pathway that 'goes before him.' The tzedakah done during the week creates a path of light that allows one to walk securely even in the domain of the chitzonim. This path then leads the person safely to Shabbat, where the chitzonim lose their dominance. The verse says: 'Righteousness shall go before Him' — the righteousness performed during the week walks ahead of the person, clearing the path, so that 'He shall set a path for His steps': God Himself creates a way for the person to walk.",
"Teh 85:14. During weekdays: chitzonim have dominance. Tzedakah/righteousness done during week = creates spiritual path 'going before' the person. Path of tzedakah leads safely to Shabbat (where chitzonim lose dominance). 'Righteousness goes before Him' = tzedakah done in week walks ahead, clears path. 'God sets path for His steps' = God creates the way.",
"תה' פ\"ה:יד. בְּיָמֵי הַחֹל: חִיצוֹנִים שׁוֹלְטִים. צְדָקָה שֶׁבְּיָמֵי הַחֹל = יוֹצֶרֶת נָתִיב רוּחָנִי 'הוֹלֵךְ לְפָנָיו.' נָתִיב הַצְּדָקָה מוֹבִיל לַשַּׁבָּת בִּבְטָחָה (שָׁם חִיצוֹנִים מְאַבְּדִים שְׁלִיטָה). 'צֶדֶק לְפָנָיו יְהַלֵּךְ' = צְדָקָה הוֹלֶכֶת לִפְנֵי הָאָדָם. 'וְיָשֵׂם לְדֶרֶךְ פְּעָמָיו' = ה' יוֹצֵר הַדֶּרֶךְ.",
"תה' פ\"ה:יד."
),
], "Righteousness Goes Before Him — Tzedakah on Weekdays Creates Path to Shabbat (1 seg)", "צֶדֶק לְפָנָיו יְהַלֵּךְ — צְדָקָה בְּחֹל פּוֹתַחַת דֶּרֶךְ לַשַּׁבָּת")

# T140: "In the hand of every man He seals" (Iyov 37:7) / tzaddik beyond comprehension / known through followers
torahs[140] = make_data(140, [
seg(1,
"Opening verse: 'In the hand of every man He seals, so that all men may know His work' (Job 37:7). It is impossible to fully comprehend the nature of the tzaddik himself — he is beyond ordinary human intellect and understanding. His level is simply too elevated for the average person to grasp directly. However, through his close followers — those who are spiritually connected to the tzaddik, who have absorbed his teachings and adopted his path — one can gain an indirect understanding of the tzaddik's qualities and greatness. The followers are like a seal: they carry the impression of the tzaddik imprinted upon them. Just as a seal reveals the shape of what pressed it without being the original, the tzaddik's disciples reveal aspects of the tzaddik's greatness that might not otherwise be perceivable. This is the meaning of 'in the hand of every man He seals' — through the hands (deeds) of ordinary people who have been formed by the tzaddik, God's work (the tzaddik) becomes known.",
"Iyov 37:7: 'In the hand of every man He seals, so all may know His work.' Tzaddik = beyond direct comprehension. But: through his close followers (who absorbed his teachings + path), one gains indirect understanding. Followers = like a seal: carry impression of tzaddik. Disciples reveal aspects of tzaddik's greatness. 'In hand of every man He seals' = through deeds of tzaddik-formed people, tzaddik becomes known.",
"אִיּוֹב ל\"ז:ז: 'בְּיַד כָּל אָדָם יַחְתֹּם לָדַעַת כָּל אַנְשֵׁי מַעֲשֵׂהוּ.' הַצַּדִּיק = מֵעֵבֶר לְהַשָּׂגָה יְשִׁירָה. אֲבָל: דֶּרֶךְ תַּלְמִידָיו הַקְּרוֹבִים (שֶׁסָּפְגוּ תּוֹרָתוֹ) מֵבִינִים אֶת הַצַּדִּיק בְּעֶקֶף. תַּלְמִידִים = חוֹתָם: נוֹשְׂאִים אֶת חוֹתֶמֶת הַצַּדִּיק. 'בְּיַד כָּל אָדָם יַחְתֹּם' = דֶּרֶךְ מַעֲשֵׂי אֲנָשִׁים שֶׁנּוּצְרוּ עַל יְדֵי הַצַּדִּיק — הַצַּדִּיק נוֹדַע.",
"אִיּוֹב ל\"ז:ז."
),
], "In Hand of Every Man He Seals — Tzaddik Known Through His Followers (1 seg)", "בְּיַד כָּל אָדָם יַחְתֹּם — הַצַּדִּיק נוֹדַע דֶּרֶךְ תַּלְמִידָיו")

# T141: feeling pain of sins = circumcising foreskin of heart / uncircumcised heart cannot feel truly
torahs[141] = make_data(141, [
seg(1,
"If a person merits that he truly feels the pain of his sins — not a superficial regret or intellectual acknowledgment, but a genuine, heart-level anguish over having distanced himself from God — this is when he circumcises the foreskin of his heart. The 'foreskin of the heart' (orla halevav) is the spiritual covering that prevents genuine feeling — it is the layer of insensitivity, self-justification, and spiritual numbness that grows over the heart. As long as the heart remains uncircumcised and sealed by this foreskin, it is impossible for a person to feel truthfully — he cannot genuinely feel the weight of his sins or the closeness of God. Only when the foreskin is removed — when genuine pain pierces through — can real feeling begin. This genuine pain of sin is itself the act of spiritual circumcision; it is not a prerequisite but the thing itself.",
"If person truly feels pain of sins = heart-level anguish over distance from God = this IS circumcising the foreskin of the heart (orla halevav). Orla halevav = insensitivity/self-justification/spiritual numbness. While sealed by foreskin: cannot feel truthfully. Genuine pain of sin = itself the act of spiritual circumcision. Not prerequisite — the thing itself.",
"אִם אָדָם זוֹכֶה לְהַרְגִּישׁ כְּאֵב אֲמִתִּי עַל חֲטָאָיו = עָגְמַת לֵב עַל רִיחוּק מֵה' = זוֹ הִיא מִילַת עָרְלַת הַלֵּב. עָרְלַת הַלֵּב = קְלִיפַּת חֻסַּר-רֶגֶשׁ/הַצְדָּקָה עַצְמִית. כְּשֶׁהַלֵּב עָרֵל: אִי-אֶפְשָׁר לְהַרְגִּישׁ בֶּאֱמֶת. כְּאֵב אֲמִתִּי = הוּא עַצְמוֹ מִילָה רוּחָנִית. לֹא תְּנַאי מוּקְדָּם — הַדָּבָר עַצְמוֹ.",
""
),
], "Feeling Pain of Sins — Circumcising Foreskin of Heart / True Feeling (1 seg)", "הַרְגָּשַׁת כְּאֵב הַחֲטָאִים — מִילַת עָרְלַת הַלֵּב")

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
print('lm-commentaries.json updated for T127-T141')

subprocess.run(['git', 'add'] + git_files, cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T127-T141 PNC -- chashmal-garments/yetzer-blinded/spring-tzaddik/fear-honor/yom-tov-humility/heart-seeks-face/orla-halevav (22 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:250])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
