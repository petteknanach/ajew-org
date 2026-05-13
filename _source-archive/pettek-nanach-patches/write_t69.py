import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-69.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Title and core teaching: 'Whoever steals mamon (wealth) from his fellow, in this he steals banim (children) from him.' A person's primary mamon comes through his wife — specifically through the light of her nefesh (soul), from which mamon is drawn and formed. The Zohar (Tazria 52a) teaches this principle. The structure: the wife's soul-light is like a tree; the mamon that emerges from it is the branches; and the children (banim) are the fruits of those branches. Stealing mamon = cutting branches = harming the fruits. When a thief steals another man's mamon, he cuts the branches of the wife's nefesh, thereby stealing the children — the fruits that grow from those branches.",
"Title: stealing mamon = stealing banim. Wife's nefesh-light = tree; mamon = branches; banim = fruits. Zohar Tazria 52a. Theft cuts branches = harms fruits = damages banim.",
"כֹּתֶרֶת: גּוֹנֵב מָמוֹן = גּוֹנֵב בָּנִים. אוֹר נֶפֶשׁ הָאִשָּׁה = עֵץ; מָמוֹן = עֲנָפִים; בָּנִים = פֵּרוֹת. ז\"ח תַּזְרִיַע נ\"ב:. גְּנֵבָה כּוֹרֶתֶת עֲנָפִים = פּוֹגֶמֶת פֵּרוֹת = מַזִּיקָה לַבָּנִים.",
"ז\"ח תַּזְרִיַע נ\"ב:."
),
seg(2,
"Even if the couple already has children, the theft can cause those existing children to become sick or die, because the children are like unripe fruits that still need to draw nourishment from their mother — meaning from the branches of her nefesh-light. Cutting the branch harms even the fruits already on it. The extent of the damage depends on the specifics of the theft: how much was taken, what kind of tree (soul), how many branches, how many fruits are still attached and still drawing from the branch. Some trees have many branches; some fruits are nearly complete; the variation is great. But in all cases, the principle holds: mamon = branches of wife's nefesh, banim = fruits drawing from those branches.",
"Even existing banim can be harmed by theft — fruits still drawing from mother's branches. Degree of damage depends on amount stolen, soul-type, branch-structure. Mamon = branches; banim = fruits drawing nourishment.",
"אֲפִילוּ בָּנִים קַיָּמִים עֶלְוּלִים לְהִפָּגַע — פֵּרוֹת עֲדַיִן שׁוֹאֲבִים מֵהָעֲנָפִים. מֶשֶׁךְ הַנֶּזֶק תָּלוּי בְּכַמּוּת הַגְּנֵבָה וּמִבְנֵה הַנֶּפֶשׁ. מָמוֹן = עֲנָפִים; בָּנִים = פֵּרוֹת שׁוֹאֲבִים.",
"ז\"ח תַּזְרִיַע נ\"ב:."
),
seg(3,
"The Talmudic statement that 'the thief must pursue the victim even to Madai (Media)' — Rabbeinu reveals the hidden meaning: the word 'Madai' hints at 'madadei Hashem' (the teachings of God), because Madai (מדי) is related to the root of 'madad' or resembles the letters of Torah/instruction. The thief must pursue and return not only the stolen mamon but also the banim he caused to be stolen — even those who were harmed indirectly through the theft of mamon. Note: sometimes even though mamon is stolen, the wife's nefesh is not actually diminished and the children are not harmed — this depends on whether the spiritual light of the nefesh was actually affected. But the spiritual dimension: the nefesh feels great pain and sorrow when a thief approaches, like a murderer of souls coming to diminish her light.",
"Talmudic 'thief pursues to Madai' = hidden: Madai = teachings of Hashem (wordplay). Thief must return even stolen banim. Sometimes mamon is taken but nefesh not diminished = no harm to banim. But nefesh always feels pain from theft — like murder of souls.",
"'גַּנָּב רוֹדֵף עַד מָדַי' = נִסְתָּר: מָדַי = מַדַּדֵי ה' (תּוֹרָה). גַּנָּב חַיָּיב לְהַחֲזִיר גַּם בָּנִים שֶׁגָּנַב. לִפְעָמִים גָּנַב מָמוֹן אֲבָל לֹא פָּגַם הַנֶּפֶשׁ = לֹא הִזִּיק לַבָּנִים. אֲבָל הַנֶּפֶשׁ תָּמִיד מַרְגִּישָׁה בְּגְנֵבָה = כְּרֶצַח נְשָׁמוֹת.",
"ז\"ח תַּזְרִיַע נ\"ב:."
),
seg(4,
"The term kiddushin (betrothal/marriage) reveals the spiritual structure of the husband-wife relationship: through kiddushin, the wife consecrates herself — she departs from the realm of impurity and receives sanctity through him. In all his business dealings and financial transactions, the husband continuously completes her light and gathers her scattered soul-sparks, always building up her nefesh-light. The tree grows more branches; the branches produce more fruit. The husband's role is to be the nourisher of the tree: through his honest financial activity, he feeds the wife's soul-light, and through that light, children are born and sustained. The ksuba (marriage contract) formalizes this obligation — it is the formal covenant to maintain and nourish the tree.",
"Kiddushin = wife departs impurity, receives kedushah through husband. Husband's financial dealings = completing wife's light, gathering scattered sparks. Tree grows → branches → fruits. Ksuba = formal covenant to nourish the tree.",
"קִדּוּשִׁין = אִשָּׁה פּוֹרֶשֶׁת מִטֻּמְאָה, מְקַבֶּלֶת קְדֻשָּׁה עַל יְדֵי בַּעְלָהּ. עֵסֶק הַבַּעַל = הַשְׁלָמַת אוֹר אִשְׁתּוֹ, קִיבּוּץ נִיצוֹצוֹתֶיהָ. עֵץ → עֲנָפִים → פֵּרוֹת. כְּתוּבָּה = בְּרִית רִשְׁמִית לְזוּן הָעֵץ.",
"ז\"ח תַּזְרִיַע נ\"ב:."
),
seg(5,
"When the husband passes away, the children inherit the mamon that was designated to complete their light — drawing from the tree even after the father is gone. The wife receives her ksuba payment — the portion fitting for her remaining light. Sometimes the children no longer need to draw from the branches (they are spiritually mature), yet they still inherit, because when children come into the world, their bashert (soulmate, mamon, and banim) all emerge together with them — meaning the father was already gathering their spiritual light through his mamon all along. The inheritance is a continuation of the father's soul-gathering function.",
"At father's death: banim inherit mamon designated for their light. Wife receives ksuba = remainder for her nefesh. Sometimes banim are mature and don't need branches, but still inherit. At birth of banim, their mamon-light already accompanied them — father gathered it.",
"בְּפֶטִירַת הָאָב: בָּנִים יוֹרְשִׁים מָמוֹן שֶׁנִּכְוַּן לְהַשְׁלִים אוֹרָם. אִשָּׁה מְקַבֶּלֶת כְּתוּבָּה = שְׁאֵרִית לְנַפְשָׁהּ. לִפְעָמִים בָּנִים בָּשֵׁלִים וְאֵינָם צְרִיכִים עֲנָפִים, אֲבָל עֲדַיִן יוֹרְשִׁים. מָמוֹן-אוֹר הַבָּנִים הִצְטָרֵף עִמָּהֶם בִּלֵדָתָם.",
"ז\"ח תַּזְרִיַע נ\"ב:."
),
seg(6,
"By overpowering and stealing another person's mamon, the thief can actually steal the other man's wife — because the wife's nefesh-light is drawn after the mamon. When the stolen mamon goes to the thief, the wife's soul-light follows it. This applies not only to literal theft (stealing by hand) but also to chemda — coveting, desiring, and longing for another's mamon in the heart. Even through coveting alone, without any physical act, a person can steal, because thought has tremendous power (Likutey Moharan 193; Sichos HaRan 8, 62). This is why the Ten Commandments include the prohibition against coveting (lo tachmod) — it is a severe negative commandment, because chemda alone can steal souls.",
"Stealing mamon = stealing wife (her nefesh-light follows mamon). Also applies to chemda (coveting) — thought has great power (LM 193; Sichos HaRan 8, 62). 'Lo tachmod' = severe prohibition; chemda alone steals souls.",
"גְּנֵבַת מָמוֹן = גְּנֵבַת הָאִשָּׁה (נַפְשָׁהּ נִמְשֶׁכֶת אַחַר הַמָּמוֹן). חַל גַּם עַל חֶמְדָּה — מַחֲשָׁבָה כֹּחַ גָּדוֹל (לִיקּ' קצ\"ג; שִׂיחוֹת ח', ס\"ב). 'לֹא תַחְמֹד' = לָאו חָמוּר; חֶמְדָּה לְבַד גּוֹנֶבֶת נְשָׁמוֹת.",
"לִיקּ' קצ\"ג; שִׂיחוֹת ח', ס\"ב."
),
seg(7,
"Sometimes a person desires both — his own mamon and also his fellow's. This is the aspect of 'bringing a rival wife into his house' — he cannot be satisfied with his portion and craves more. The verse in Malachi (2:15-16) says: 'And with the wife of your youth do not betray, for He hates sending away.' The interpretation: if your portion seems insufficient and you feel you 'hate' your current mamon — the remedy is not to take another's, but rather to 'send' — meaning give tzedakah, as in 'Send your bread upon the waters' (Ecclesiastes 11:1). As the Talmud teaches (Gittin 7b): if a person sees his sustenance diminished, let him give from it to tzedakah. Through giving, he repairs the flow.",
"Desiring both own and other's mamon = rival wife. Malachi 2:15-16. Remedy: send = give tzedakah. Kohelet 11:1 'shelach lachmecha.' Gittin 7b: if sustenance diminished, give tzedakah.",
"חָמַד גַּם מָמוֹנוֹ גַּם שֶׁל חֲבֵרוֹ = אֵשֶׁת צָרָה. מַלְאָכִי ב:טו-טז. תִּקּוּן: שַׁלַּח = תֵּן צְדָקָה. קֹהֶלֶת י\"א:א. גִּיטִּין ז:: צֻמְצַּם פַּרְנָסָתוֹ, יִתֵּן מִמֶּנָּה.",
"מַלְאָכִי ב:טו-טז; קֹהֶלֶת י\"א:א; גִּיטִּין ז:."
),
seg(8,
"Through tzedakah, one repairs his mamon — the feminine/soul aspect — without betrayal. Through tzedakah, the mamon stolen through chemda (coveting) is repaired and the proper flow of shefa is restored. However, actual hand-theft (gezel b'yad) cannot be repaired by tzedakah alone — it requires returning the actual stolen object/money. But theft through chemda (thought-theft) is repaired through tzedakah, which sustains and rebuilds the mamon-flow. As the Talmud teaches (Kiddushin 71a), interpreting the verse 'He will sit as a refiner and purifier of silver' (Malachi 3:3): through the act of purification via tzedakah, the mixed family lines (mishpachot meuravot) are clarified and healed. Tzedakah is the universal repair agent for mamon-damage done through desire.",
"Tzedakah repairs chemda-theft but not hand-theft (requires return). Kiddushin 71a + Malachi 3:3: purification of silver = tzedakah clarifies mishpachot meuravot. Tzedakah = universal repair for mamon-damage via desire.",
"צְדָקָה מְתַקֶּנֶת גְּנֵבַת חֶמְדָּה אֲבָל לֹא גְּנֵבַת יָד (טְעוּנָה הַחֲזָרָה). קִדּ' ע\"א: + מַלְאָכִי ג:ג: טִהוּר כֶּסֶף = צְדָקָה מְבָרֶרֶת מִשְׁפָּחוֹת מְעוּרְבָּבוֹת. צְדָקָה = תִּקּוּן כָּלָל לְנֶזֶק מָמוֹן-חֶמְדָּה.",
"קִדּ' ע\"א:; מַלְאָכִי ג:ג; גִּיטִּין ז:."
),
seg(9,
"Through tzedakah, all forms of theft — including the spiritual theft of mixing family lines (mishpachot meuravot) — are repaired, and the nefesh of the banim is sustained and restored. As the Talmud teaches (Kiddushin 70a): 'One who marries a woman for mamon — his banim will be improper (einam hagunin).' Marrying for mamon alone, turning toward it as the primary goal, makes one a fool — as the verse says, 'The heart of the wise is to his right, and the heart of the fool to his left' (Ecclesiastes 10:2; Bereishis Rabbah 22). The wise man turns to the right, the aspect of Torah — 'From His right hand, a fiery law for them' (Deuteronomy 33:2). The fool turns left, to material desire alone.",
"Tzedakah sustains nefesh of banim and repairs all. Kiddushin 70a: marrying for mamon = improper banim. Kohelet 10:2 + BR 22: wise = right = Torah; fool = left. 'Mimino esh dat lamo' (Dev 33:2).",
"צְדָקָה מְקַיֶּמֶת נֶפֶשׁ בָּנִים. קִדּ' ע:: הַנּוֹשֵׂא אִשָּׁה בִּשְׁבִיל מָמוֹן בָּנָיו אֵינָם הֲגוּנִים. קֹהֶלֶת י:ב + בר\"ר כב: חָכָם = יָמִין = תּוֹרָה; טִפֵּשׁ = שְׂמֹאל. 'מִימִינוֹ אֵשׁ דָּת לָמוֹ' (דב' לג:ב).",
"קִדּ' ע:; קֹהֶלֶת י:ב; בר\"ר כב; דב' לג:ב."
),
seg(10,
"Final connection: 'Elijah binds him, and the Holy One Blessed be He pierces him' — this is the aspect of mind (mochin), specifically motrei mochin (the loosening/releasing of the mind), which is the aspect of the retzuot (straps of the phylacteries/tefillin), which themselves are the aspect of motrei mochin. [Editorial note within the teaching itself:] This teaching on the prohibition of theft and the previous Torah 68 on the damage of anger (ka'as) ruining wealth are connected and have deep resonance with each other — as the wise will understand. Both are bound together in the teaching of the 'Holy Chamber' in Torah 59, where both themes — anger destroying mamon and theft destroying banim — are unified in the higher concept of the 'holy chamber' that must be guarded.",
"Elijah binds, HKBH pierces = mochin = motrei mochin = retzuot of tefillin. Note: T68 (ka'as destroys mamon) + T69 (theft destroys banim) are connected; both unified in T59 (Holy Chamber).",
"אֵלִיָּהוּ קוֹשֵׁר, הקב\"ה נוֹקֵב = מֹחִין = מוֹתְרֵי מֹחִין = רְצוּעוֹת תְּפִלִּין. הֶעָרָה: ת\"ס (כַּעַס מְאַבֵּד מָמוֹן) + ת\"ס״ט (גְּנֵבָה מְאַבֶּדֶת בָּנִים) קְשׁוּרִים זֶה לָזֶה; שְׁנֵיהֶם מְאוּחָדִים בְּת\"נ\"ט (חֶדֶר הַקֹּדֶשׁ).",
"לִיקּ' נ\"ט (חֶדֶר קֹדֶשׁ)."
),
]

data = {
    "id": "pnc-1-69",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 69,
    "title": "T69 Petten Nanach Commentary - Stealing Mamon Steals Banim (Tree/Branches/Fruits, 10 segs)",
    "hebrewTitle": "הַגּוֹנֵב מָמוֹן — גּוֹנֵב בָּנִים",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 10
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 10
print(f"Written: {out_path}")
print(f"Segments: 10, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
cdata['1']['69']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-69.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T69 (Stealing Mamon/Banim/Tree-Branches-Fruits, 10 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T69")

t69_git = 'public/reader/' + pnc_name + '/torah-69.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t69_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T69 PNC -- Stealing mamon steals banim (tree/branches/fruits/tzedakah, 10 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
