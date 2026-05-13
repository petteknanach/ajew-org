import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-75.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'May He bless us, God, and they shall fear Him, all the ends of the earth' (Psalms 67:8). There is an attribute of victory, controversy, and war that arises from 'damim' — blood/vital forces — that have not yet been used to serve God. Before these vital forces are channeled into holy service, they remain in a state of raw conflict. The verse hints: 'And the blood of your wounds (damecha) I have not swallowed' — meaning these unrefined vital forces become the source of controversy and inner war.",
"Frame verse: Teh 67:8. Attribute of controversy/war = from damim (vital forces) not yet channeled into service of Hashem. Unrefined damim = source of inner conflict and controversy.",
"פָּסוּק: תה' ס\"ז:ח. מִדַּת הַמַּחֲלֹקֶת/מִלְחָמָה = מִדָּמִים שֶׁלֹּא שִׁמְּשׁוּ לַעֲבֹדַת ה'. דָּמִים לֹא מְזֻקָּקִים = מְקוֹר מַחֲלֹקֶת וּמִלְחָמָה פְּנִימִית.",
"תה' ס\"ז:ח."
),
seg(2,
"Tzedek (righteousness) is the speech (dibbur) of Torah and tefillah — as the verse says, 'Righteousness you shall speak' (Psalms 58:2). The divine sparks (nitzotzot) that have not yet been brought into holy speech remain stuck in the aspects of the body — like the verse about Jacob: 'He limped on his thigh' (Genesis 32:32) — meaning the nitzotzot lodged in the lower, unrectified aspects of the self, unable to ascend through speech.",
"Tzedek = dibbur (speech) of Torah and tefillah (Teh 58:2). Nitzotzot not brought into holy dibbur = stuck in lower aspects = 'limping on thigh' (Ber 32:32).",
"צֶדֶק = דִּבּוּר שֶׁל תּוֹרָה וּתְפִלָּה (תה' נ\"ח:ב). נִיצוֹצוֹת שֶׁלֹּא הוּכְנְסוּ לְדִבּוּר קָדוֹשׁ = תְּקוּעִים בְּבְּחִינוֹת תַּחְתּוֹנוֹת = 'צוֹלֵעַ עַל יְרֵכוֹ' (בר' ל\"ב:לב).",
"תה' נ\"ח:ב; בר' ל\"ב:לב."
),
seg(3,
"Before the rectification — before the nitzotzot are brought into holy speech — they lack tzeiruf (refinement/combination) and chibur (connection). They exist in a state of shevarim (brokenness) and controversy, scattered and disconnected from each other, unable to unite into wholeness. This is the essential problem: the unrectified sparks are at war with each other and with the person.",
"Before dibbur: nitzotzot lack tzeiruf and chibur. Exist in shevarim (brokenness) and controversy — scattered, disconnected. Unrectified sparks = at war with self and each other.",
"לִפְנֵי דִּבּוּר: נִיצוֹצוֹת חַסְרֵי צֵרוּף וְחִיבּוּר. קַיָּמִים בְּשְׁבָרִים וּמַחֲלֹקֶת — מְפֻזָּרִים, מְנֻתָּקִים. נִיצוֹצוֹת לֹא מְתֻקָּנִים = בְּמִלְחָמָה עִם הָעַצְמִי.",
""
),
seg(4,
"Through holy speech — through Torah learning and tefillah — the nitzotzot achieve tzeiruf (they are refined, combined, and sorted). This creates shalom — peace and wholeness. The scattered sparks are gathered, refined through the letters of speech, and unified. Holy speech is the agent of cosmic repair: it gathers what was broken and transforms controversy into harmony.",
"Through holy dibbur: nitzotzot achieve tzeiruf → shalom. Scattered sparks gathered, refined through letters of speech, unified. Holy speech = agent of cosmic repair — transforms controversy into harmony.",
"עַל יְדֵי דִּבּוּר קָדוֹשׁ: נִיצוֹצוֹת מְקַבְּלִים צֵרוּף → שָׁלוֹם. נִיצוֹצוֹת מְפֻזָּרִים נֶאֱסָפִים, מְזֻקָּקִים עַל יְדֵי אוֹתִיּוֹת הַדִּבּוּר, מְאֻחָדִים. דִּבּוּר קָדוֹשׁ = כְּלִי לְתִקּוּן עוֹלָמִי.",
""
),
seg(5,
"Therefore, a person must speak only words of Torah and tefillah — and not 'other things' (devarim acheirim), meaning idle or impure speech. The Talmud (Sukkah 53a; Ta'anit 25a) records that Levi 'hurled words upward' — meaning he spoke inappropriately toward Heaven — and as a result became lame. This reflects 'limping on his thigh': non-holy speech leaves a p'gam (spiritual damage/blemish) in the very faculty of speech and in the limbs associated with it. The lesson: speak Torah or tefillah until the body (guf) itself becomes batel — nullified to the point where it no longer resists the refinement of the nitzotzot.",
"Speak only divrei Torah and tefillah, not devarim acheirim. Sukkah 53a; Ta'anit 25a: Levi hurled words upward → became lame = non-holy dibbur = p'gam. Must speak Torah/tefillah until guf becomes batel (nullified).",
"יְדַבֵּר רַק דִּבְרֵי תּוֹרָה וּתְפִלָּה, לֹא דְּבָרִים אֲחֵרִים. סֻכָּה נ\"ג:; תַּעֲנִית כ\"ה:: לֵוִי הִטִּיחַ דְּבָרִים כְּלַפֵּי מַעְלָה → נִצֹּלַע = פְּגַם דִּבּוּר. חַיָּיב לְדַבֵּר עַד שֶׁהַגּוּף יְהֵא בָּטֵל.",
"סֻכָּה נ\"ג:; תַּעֲנִית כ\"ה:; בר' ל\"ב:לב."
),
seg(6,
"This is the aspect of the rib (tzela): 'And He built the rib' (Genesis 2:22) — meaning the guf (body) is nullified through holy speech. But this nullification requires yirah (fear/awe) — as the Sages taught (Bava Batra 10a): 'A hard body — fear breaks it.' The fear referred to is Pachad Yitzchak — the Fear of Isaac (Genesis 31:42) — meaning the genuine awe of Heaven that softens and humbles the hardened material self. Now the verse is illuminated: 'Yevarcheinu Elokim v'yiru oto' — 'May He bless us, God, and they shall fear Him' — the blessing (brachah) comes through the fear (yirah): only through yirah is the guf nullified, enabling the nitzotzot to be refined and shalom to emerge.",
"Tzela/rib = guf nullified through holy dibbur. Bava Batra 10a: 'hard body — fear breaks it.' Pachad Yitzchak = yirah (Ber 31:42). Verse: 'Yevarcheinu... v'yiru oto' = brachah comes through yirah = guf batel → nitzotzot refined.",
"צֵלָע = גּוּף בָּטֵל עַל יְדֵי דִּבּוּר קָדוֹשׁ. בבב\"ב י:: 'גּוּף קָשֶׁה — פַּחַד שׁוֹבְרוֹ.' פַּחַד יִצְחָק = יִרְאָה (בר' ל\"א:מב). פָּסוּק: 'יְבָרְכֵנוּ... וְיִירְאוּ אֹתוֹ' = בְּרָכָה דַּרְךְ יִרְאָה = גּוּף בָּטֵל → נִיצוֹצוֹת מְזֻקָּקִים.",
"בב\"ב י:; בר' ל\"א:מב; תה' ס\"ז:ח."
),
seg(7,
"Through the shattering of the vessels (sheviras hakeilim), the divine sparks (nitzotzot) fell into all material things — food, drink, garments, and all pleasures. The pleasure (ta'anug) that a person derives from physical things comes from the nitzotzot embedded within them — and those nitzotzot are actually letters (otiyot). Before they are drawn into holy speech, they are in the aspect of 'dam' (blood), the aspect of nefesh (soul), as the verse says: 'For the nefesh of all flesh — its blood is in its nefesh' (Leviticus 17:14). The nitzotzot wait within the pleasure of material things, hidden as blood/life-force, awaiting rectification through holy speech that will extract and elevate them.",
"Through sheviras hakeilim: nitzotzot fell into food/drink/garments/pleasures. Ta'anug (pleasure) = comes from nitzotzot = otiyot. Before dibbur: nitzotzot = dam (blood) = nefesh. Vayikra 17:14 'ki nefesh kol basar damo b'nafsho.' Nitzotzot wait in physical pleasure awaiting holy dibbur to extract them.",
"עַל יְדֵי שְׁבִירַת הַכֵּלִים: נִיצוֹצוֹת נָפְלוּ לְמַאֲכָל/מִשְׁתֶּה/מַלְבּוּשׁ/תַּעֲנוּגִים. תַּעֲנוּג = מִנִּיצוֹצוֹת = אוֹתִיּוֹת. לִפְנֵי דִּבּוּר: נִיצוֹצוֹת = דָּם = נֶפֶשׁ. וַיִּקְ' י\"ז:יד. נִיצוֹצוֹת מְמַתִּינִים בְּתַעֲנוּג לְדִבּוּר קָדוֹשׁ שֶׁיּוֹצִיא אוֹתָם.",
"וַיִּקְ' י\"ז:יד; שְׁבִירַת הַכֵּלִים."
),
seg(8,
"The verse 'In assemblies bless God' (Psalms 35:18) refers to the gathering and blessing that comes when nitzotzot are unified through holy speech. 'Wisdoms cry aloud outside' (Proverbs 1:20) — the wisdom embedded in all things calls out to be released through speech. [Note: the language of this teaching is rough and fragmentary; Rabbeinu prepared a second, more refined edition of it.] The teaching as a whole: Torah and tefillah, through holy speech, raise the nitzotzot, transforming controversy into shalom, with yirah nullifying the hard body — and blessing (brachah) flowing as a result of that nullification.",
"'In assemblies bless God' (Teh 35:18) = nitzotzot unified → blessing. 'Wisdoms cry aloud outside' (Misl 1:20) = wisdom in things calls to be released. [Note: language rough, second edition exists.] Summary: holy dibbur raises nitzotzot, controversy → shalom, yirah nullifies guf → brachah.",
"תה' ל\"ה:יח 'בְּמִקְהָלִים אֲבָרְכָה ה'' = נִיצוֹצוֹת מְאוּחָדִים → בְּרָכָה. מִשְׁלֵי א:כ 'חָכְמוֹת בַּחוּץ תָּרֹנָּה' = חָכְמָה שֶׁבְּדְּבָרִים קוֹרֵאת. [הֶעָרָה: לָשׁוֹן גַּסָּה; מַהֲדוּרָה שְׁנִיָּה קַיֶּמֶת.] סִכּוּם: דִּבּוּר קָדוֹשׁ → נִיצוֹצוֹת עוֹלִים, מַחֲלֹקֶת → שָׁלוֹם, יִרְאָה → גּוּף בָּטֵל → בְּרָכָה.",
"תה' ל\"ה:יח; מִשְׁלֵי א:כ."
),
]

data = {
    "id": "pnc-1-75",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 75,
    "title": "T75 Petten Nanach Commentary - Yevarcheinu Elokim (Nitzotzot/Holy Speech/Shalom, 8 segs)",
    "hebrewTitle": "יְבָרְכֵנוּ אֱלֹהִים — נִיצוֹצוֹת דִּבּוּר וְשָׁלוֹם",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 8
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 8
print(f"Written: {out_path}")
print(f"Segments: 8, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '75' not in cdata['1']:
    cdata['1']['75'] = {}
cdata['1']['75']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-75.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T75 (Nitzotzot/Holy Speech/Shalom, 8 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T75")

t75_git = 'public/reader/' + pnc_name + '/torah-75.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t75_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T75 PNC -- Yevarcheinu/nitzotzot/holy speech/shalom (8 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
