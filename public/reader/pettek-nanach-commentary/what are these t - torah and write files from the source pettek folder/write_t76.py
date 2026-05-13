import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-76.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'And God tested Abraham' (Genesis 22:1). From the Tikkunei Zohar (Tikkun 70, 118a): from the right side — the white brain/intellect, pure as silver — it is written: 'Seed of Abraham My beloved' (Isaiah 41:8). This sets the framework: Abraham represents the right side, the chesed-quality, the white pure moach (intellect). The testing of Abraham is a movement through and elevation of the intellect.",
"Frame verse: Ber 22:1. Tikkunei Zohar Tikkun 70, 118a: right side = white moach = pure as silver. 'Zera Avraham ohavi' (Yesh 41:8). Abraham = right/chesed = white moach. 'Testing' = movement through/elevation of moach.",
"פָּסוּק: בר' כ\"ב:א. ת\"ז תִּקּוּן ע', קיח:: יָמִין = מֹחַ לָבָן = טָהוֹר כְּכֶסֶף. יְשַׁ' מ\"א:ח 'זֶרַע אַבְרָהָם אֹהֲבִי.' אַבְרָהָם = יָמִין/חֶסֶד = מֹחַ לָבָן. 'נִסָּיוֹן' = תְּנוּעָה דַּרְךְ הַמֹּחַ.",
"ת\"ז תִּקּוּן ע', קיח:; יְשַׁ' מ\"א:ח."
),
seg(2,
"In contemplation (histaklut/gazing), there is ohr hayashar (direct light) and ohr chozer (returning light). The extension of vision outward is ohr hayashar — the direct ray of sight that reaches toward the object. When it arrives at the desired object and the impression returns back to the eyes, that is ohr chozer — the returning light. The essence of sight arises from the visual faculty extending outward and striking the seen object, causing the visual impression to return to the eyes, where the object is depicted. This physical mechanism of vision is a parable for spiritual contemplation and the structure of divine light.",
"Histaklut = gazing/contemplation. Ohr hayashar = direct light (vision extending to object). Ohr chozer = returning light (impression returns to eyes). Physical vision = spiritual parable for how divine light operates.",
"הִסְתַּכְּלוּת = מַבָּט/הִתְבּוֹנְנוּת. אוֹר יָשָׁר = קֶרֶן הָרְאִיָּה הַמַּגִּיעָה לָעֹצֶם. אוֹר חוֹזֵר = הֶחְזָרַת הָרֹשֶׁם לָעֵינַיִם. פִּיזִיקַת הָרְאִיָּה = מָשָׁל לְמִבְנֵה אוֹר אֱלֹהִי.",
""
),
seg(3,
"Before seeing, an object lacks definition (gevul) — it is undefined, formless, without boundary. Upon seeing — when the gaze reaches it — the object acquires gevul (definition/boundary). As the Talmud teaches (Yoma 74b), connecting to the verse 'He afflicted you and starved you and fed you the manna' — one who sees and eats is defined and distinct from one who does not; a blind person lacks satiation because they have no gevul (no defined sensory boundary through sight). The Talmud concludes with Kohelet (6): 'Good is the sight of eyes over the walking of the soul' — sight creates a path for the soul and establishes gevul.",
"Before seeing: object lacks gevul (definition). Upon seeing: object acquires gevul. Yoma 74b: seeing → eating = definition; blind = no gevul. Kohelet 6: 'good is sight of eyes over walking of soul' = sight creates gevul/path for soul.",
"לִפְנֵי רְאִיָּה: עֹצֶם חַסַּר גְּבוּל. עִם רְאִיָּה: עֹצֶם מְקַבֵּל גְּבוּל. יוֹמָא ע\"ד:; קֹהֶלֶת ו: 'טוֹב מַרְאֵה עֵינַיִם מֵהַלָּךְ נָפֶשׁ' = רְאִיָּה יוֹצֶרֶת גְּבוּל/דֶּרֶךְ.",
"יוֹמָא ע\"ד:; קֹהֶלֶת ו."
),
seg(4,
"This is the merit of bitachon (trust/faith). Bitachon is an aspect of histaklut — it means gazing solely at Hashem and trusting in Him, as the verse says: 'The eyes of all look to You' (Psalms 145:15). Through bitachon, a vessel (kli) is formed in the person, giving gevul (definition) and zman (time-measure) to the divine hashpa'ah (influence/blessing) that flows to him. Without bitachon, the divine shefa flows constantly but is timeless and undefined — a needed blessing may arrive years too early or too late. But with histaklut in bitachon, the shefa arrives at exactly the right time.",
"Bitachon = histaklut = gazing solely at Hashem. Teh 145:15 'einei chol eilecha yesaberu.' Through bitachon: kli formed, giving gevul and zman to divine hashpa'ah. Without bitachon = shefa arrives at wrong time. With bitachon = arrives exactly right.",
"בִּטָּחוֹן = הִסְתַּכְּלוּת = מַבָּט רַק לְהַשֵּׁם. תה' קמ\"ה:טו 'עֵינֵי כֹל אֵלֶיךָ יְשַׂבֵּרוּ.' בִּטָּחוֹן יוֹצֵר כְּלִי, נוֹתֵן גְּבוּל וּזְמַן לְהַשְׁפָּעָה. בְּלֹא בִּטָּחוֹן = שֶׁפַע מַגִּיעַ בְּעִיתּוֹ הַלֹּא נָכוֹן. עִם בִּטָּחוֹן = מַגִּיעַ בְּדִיּוּק.",
"תה' קמ\"ה:טו."
),
seg(5,
"This is also the merit of hitkaruvut (drawing close) to tzaddikim (Psalms 42:3: 'My soul thirsts for God, for the living God'). Like someone so desperately thirsty they would drink even unclean water — there are those who serve the Creator with constant tzima'on (thirst/longing), studying and praying always, yet always longing for more. However, this constant burning thirst sometimes lacks zman (timing) and seichel (intellect/measured understanding). As the Talmud teaches (Menachot 99b; Temurah), sometimes Torah's nullification (bittul) is itself its fulfillment — meaning the right time to 'not study' is also part of Torah.",
"Hitkaruvut to tzaddikim. Teh 42:3 'tzama nafshi l'Elokim.' Tzima'on service = good but lacks zman and seichel. Menachot 99b: Torah's bittul = its fulfillment. The right timing = part of Torah.",
"הִתְקָרְבוּת לַצַּדִּיקִים. תה' מ\"ב:ג 'צָמְאָה נַפְשִׁי לֵאלֹהִים.' עֲבוֹדַת צִמָּאוֹן = טוֹב אֲבָל חַסְרֵי זְמַן וְשֵׂכֶל. מְנָחוֹת צ\"ט:; תְּמוּרָה: בִּיטּוּל תּוֹרָה = קִיּוּמָהּ.",
"תה' מ\"ב:ג; מְנָחוֹת צ\"ט:."
),
seg(6,
"Each day requires chiddush hamochin — the renewal of the intellect (Lamentations 3:23: 'New every morning; great is Your faithfulness'). This renewal is also expressed in the daily prayer: 'Who renews in His goodness every day the act of Creation.' Renewed moach (intellect) brings fresh seichel — understanding that is clear and immediate, like seeing with the eyes. This is like the verse (Genesis 3:5): 'And the eyes of both were opened' — which Rashi explains as the opening of wisdom. Re'iyah (sight/spiritual vision) has two aspects: one with clear, definite understanding (ohr chozer returning as pure knowledge), and another more vague and uncertain.",
"Each day: chiddush hamochin. Eichah 3:23 'chadashim labekarim.' Prayer: 'mechadesh b'tuvo.' Renewed moach = fresh seichel = like seeing clearly. Ber 3:5 'vatipakachnah einei shneihem' = wisdom (Rashi). Re'iyah has two aspects: clear vs. uncertain.",
"כָּל יוֹם: חִדּוּשׁ מֹחִין. אֵיכָה ג:כג 'חֲדָשִׁים לַבְּקָרִים.' תְּפִלָּה: 'מְחַדֵּשׁ בְּטוּבוֹ.' מֹחַ מְחֻדָּשׁ = שֵׂכֶל טָרִי = כְּרְאִיָּה בְּרוּרָה. בר' ג:ה (רש\"י: חָכְמָה). רְאִיָּה = שְׁתֵּי בְּחִינוֹת: בְּרוּרָה וּמְעוּרְפֶּלֶת.",
"אֵיכָה ג:כג; בר' ג:ה."
),
seg(7,
"'And God tested (nissa) Abraham' — 'nissa' means testing, but also elevating and lifting. The testing of Abraham is the elevation of mochin d'katnut (small/constricted consciousness) through the quality of Abraham, which is ahavah (love). Through teshuvah mei'ahavah (repentance motivated by love rather than fear), one attains mochin d'gadlut — expanded, great consciousness — embodying chasadim (loving-kindness) and rachamim (compassion). The Zohar's phrase 'from the right side, white moach' means that through Avraham's quality of pure ahavah, the white moach of wisdom is accessed, and the state of mochin d'gadlut is achieved. The testing is the journey from small to great consciousness, from constriction to expansion, through love.",
"'HaElokim nissa' = testing AND elevating. Elevation of mochin d'katnut through Avraham = ahavah. Teshuvah mei'ahavah → mochin d'gadlut = chasadim v'rachamim. Zohar: 'white moach from right side' = Avraham's ahavah → access to gadlut.",
"'הָאֱלֹהִים נִסָּה' = נִסָּיוֹן וְגַם הַרָמָה. הַרָמַת מֹחִין דְּקַטְנוּת עַל יְדֵי מִדַּת אַבְרָהָם = אַהֲבָה. תְּשׁוּבָה מֵאַהֲבָה → מֹחִין דְּגַדְלוּת = חֲסָדִים וְרַחֲמִים. ת\"ז קיח:: 'מֹחַ לָבָן מִיָּמִין' = אַהֲבַת אַבְרָהָם → גַּדְלוּת.",
"ת\"ז תִּקּוּן ע', קיח:; בר' כ\"ב:א."
),
]

data = {
    "id": "pnc-1-76",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 76,
    "title": "T76 Petten Nanach Commentary - V'HaElokim Nissa (Histaklut/Bitachon/Mochin/Ahavah, 7 segs)",
    "hebrewTitle": "וְהָאֱלֹהִים נִסָּה — הִסְתַּכְּלוּת וּמֹחִין דְּגַדְלוּת",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 7
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 7
print(f"Written: {out_path}")
print(f"Segments: 7, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '76' not in cdata['1']:
    cdata['1']['76'] = {}
cdata['1']['76']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-76.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T76 (Histaklut/Bitachon/Mochin/Ahavah, 7 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T76")

t76_git = 'public/reader/' + pnc_name + '/torah-76.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t76_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T76 PNC -- V'HaElokim Nissa/histaklut/bitachon/mochin d'gadlut (7 segs)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
