import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-80.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'Hashem gives strength to His people; Hashem blesses His people with peace' (Psalms 29:11). Peace is of immense magnitude — as the Mishnah teaches in its final chapter (Uktzin, final Mishnah): the Holy One, Blessed be He, found no vessel capable of holding blessing for Israel except peace. Peace is the ultimate vessel for all divine blessing.",
"Frame verse: Teh 29:11. Peace = vessel for divine blessing. Uktzin final Mishnah: 'Hashem found no vessel to hold blessing except peace.' Peace = supreme vessel.",
"פָּסוּק: תה' כ\"ט:יא. שָׁלוֹם = כְּלִי לְבְּרָכָה אֱלֹהִית. אוּקְצִין, סוֹף מִסְכֶּתֶת: 'לֹא מָצָא הקב\"ה כְּלִי מָחֲזִיק בְּרָכָה לְיִשְׂרָאֵל אֶלָּא הַשָּׁלוֹם.'",
"אוּקְצִין סוֹף; תה' כ\"ט:יא."
),
seg(2,
"What is peace, fundamentally? Peace is the uniting of two opposites (Zohar Vayikra 12b). As the verse says: 'Maker of peace in His high places' (Job 25:2) — in the heavenly realm, there is one angel of fire and another angel of water, which are opposite elements (water extinguishes fire). But the Holy One makes peace between them, binding them together despite their opposing natures. This is the essential attribute of Yosef, who joins opposites — chesed (loving-kindness) and gevurah (strength/severity). Evidence from the Torah: 'And Yosef brought their evil report' (Genesis 37:2) — the Talmud (Sotah 47a) identifies this as the attribute of gevurah; while 'I seek my brothers' (Genesis 37:16) is the attribute of chesed.",
"Peace = uniting opposites (Zohar Vayikra 12b). Iyov 25:2: fire-angel + water-angel = HKBH makes peace between them. Yosef = joins chesed + gevurah. Evidence: 'Yosef brought evil report' (Ber 37:2; Sotah 47a) = gevurah; 'I seek my brothers' = chesed.",
"שָׁלוֹם = אִיחוּד הֲפָכִים (ז\"ח וַיִּקְ' יב:). אִיּוֹב כ\"ה:ב: מַלְאַךְ אֵשׁ + מַלְאַךְ מַיִם = הקב\"ה עוֹשֶׂה שָׁלוֹם בֵּינֵיהֶם. יוֹסֵף = מְאַחֵד חֶסֶד + גְּבוּרָה. ראָיָה: 'וַיָּבֵא יוֹסֵף אֶת דִּבָּתָם' (בר' ל\"ז:ב; סוֹטָה מ\"ז:) = גְּבוּרָה; 'אֶת אַחַי אָנֹכִי מְבַקֵּשׁ' = חֶסֶד.",
"ז\"ח וַיִּקְ' יב:; אִיּוֹב כ\"ה:ב; סוֹטָה מ\"ז:."
),
seg(3,
"In Genesis 42, further evidence: 'And Yosef, he is the ruler (hamashbil)' — the attribute of strength (gevurah), for he governs and rules. 'And he is the provider to all the people of the land' — the attribute of chesed, for he sustains all with kindness. Also in Genesis 41: 'And they called before him Avrech' — Rashi explains this as 'father in wisdom and tender in years,' meaning greatness and humility respectively — which again are chesed and gevurah united. All of this is Yosef, whose attribute is the sanctification of God's Name. Sanctifying God's Name itself contains both chesed and gevurah: first the person is inflamed by flames of love for God (chesed), then he overcomes himself and gives up his soul for the sanctification (gevurah). That union of love and strength is true peace — Yosef's attribute.",
"Gen 42: 'Yosef hu hamashbil' = gevurah (ruler); 'mashbir l'chol am ha'aretz' = chesed. Gen 41 'Avrech' = Rashi: father in wisdom (greatness/chesed) + tender in years (humility/gevurah). Yosef = sanctifying God's Name = chesed (love-flames) + gevurah (mesiras nefesh). Union = peace.",
"בר' מב: 'יוֹסֵף הוּא הַמַּשְׁבִּיר' = גְּבוּרָה; 'מַשְׁבִּיר לְכָל עַם הָאָרֶץ' = חֶסֶד. בר' מ\"א 'אַבְרֵךְ' = רש\"י: אַב בְּחָכְמָה (גְּדֻלָּה/חֶסֶד) + רַךְ בְּשָׁנִים (עֲנָוָה/גְּבוּרָה). יוֹסֵף = קִדּוּשׁ הַשֵּׁם = חֶסֶד (לַהֲבוֹת אַהֲבָה) + גְּבוּרָה (מְסִירַת נֶפֶשׁ). אִיחוּד = שָׁלוֹם.",
"בר' מ\"א:מג; מ\"ב:ו; רש\"י."
),
seg(4,
"Such self-sacrifice (mesiras nefesh) for the sanctification of God's Name is desired from every Israelite — even from the lightest sinner. Throughout the generations, we have seen many humble and lowly people sacrifice themselves for the sanctification of His Name. Blessed are they. Immediately when a person truly, genuinely desires to give his soul for the sake of sanctification, the aspect of peace — Yosef's attribute — arises within him, enabling the binding of mind to speech in prayer. [The teacher heard from Rabbeinu's holy mouth, as a simple and certain truth, that it is necessary to pray with mesiras nefesh — with complete self-sacrifice.] Even Israel's transgressors retain the name 'Israel' and bring great pleasure to Hashem, as the verse says (Isaiah 49:3): 'Israel, in whom I will be glorified.'",
"Mesiras nefesh desired from every Jew, even sinners. Generations: humble people sacrificed for sanctification. When one desires mesiras nefesh = aspect of peace/Yosef arises = binds mind to speech. Heard from Rabbeinu: pray with mesiras nefesh. Even sinners = 'Israel' (Yesh 49:3).",
"מְסִירַת נֶפֶשׁ = נִדְרֶשֶׁת מִכָּל יְהוּדִי אֲפִילוּ קַל שֶׁבְּקַלִּים. דּוֹרוֹת: אֲנָשִׁים שְׁפָלִים מָסְרוּ נֶפֶשׁ. כְּשֶׁמְּכַוֵּן לִמְסֹר נֶפֶשׁ = בְּחִינַת שָׁלוֹם/יוֹסֵף = קְשִׁירַת מַחֲשָׁבָה לְדִבּוּר. שָׁמַע מִפִּי קָדְשׁוֹ: לְהִתְפַּלֵּל בִּמְסִירַת נֶפֶשׁ. אֲפִילוּ פּוֹשְׁעֵי יִשְׂרָאֵל = 'יִשְׂרָאֵל' (יְשַׁ' מ\"ט:ג).",
"יְשַׁ' מ\"ט:ג; אוּקְצִין סוֹף; ז\"ח וַיִּקְ' יב:."
),
]

data = {
    "id": "pnc-1-80",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 80,
    "title": "T80 Petten Nanach Commentary - Hashem Oz l'Ammo Yiten (Peace/Yosef/Mesiras Nefesh, 4 segs)",
    "hebrewTitle": "ה' עֹז לְעַמּוֹ יִתֵּן — שָׁלוֹם יוֹסֵף וּמְסִירַת נֶפֶשׁ",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 4
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 4
print(f"Written: {out_path}")
print(f"Segments: 4, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '80' not in cdata['1']:
    cdata['1']['80'] = {}
cdata['1']['80']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-80.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T80 (Peace/Yosef/Mesiras Nefesh, 4 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T80")

t80_git = 'public/reader/' + pnc_name + '/torah-80.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t80_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T80 PNC -- Hashem oz/peace-Yosef/mesiras nefesh (4 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
