import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)

def seg(idx, be, bi_en, bi_he, sc_he):
    return {"index": idx, "beginner": {"en": be, "he": ""}, "intermediate": {"en": bi_en, "he": bi_he}, "scholarly": {"en": "", "he": sc_he}}

# T85
segs_85 = [
seg(1,
"Opening saying: 'One steps in it a small step.' Heard from Rabbeinu himself. Kabbalistic meaning: initially, the sefirah of Malchut (Kingship) is beside Ze'ir Anpin (the six central sefirot of divine emotional qualities) in the aspect of 'oshit p'si'ah levar' — 'extending a step outward,' meaning Malchut is positioned at the side of Ze'ir Anpin, not yet face-to-face with it (as brought in the Zohar, Balak 203b, and in the writings of the Ari, of blessed memory).",
"Heard from Rabbeinu. 'One steps a small step': Malchut beside Ze'ir Anpin = 'oshit p'si'ah levar' (extending a step outward). Zohar Balak 203b; Ari. Malchut not yet face-to-face.",
"שָׁמַע מֵרַבֵּינוּ. 'צָעַד פְּסִיעָה קְטַנָּה': מַלְכוּת בְּצַד זְ\"א = 'אוֹשִׁיט פְּסִיעָה לְבַר.' ז\"ח בָּלָק ר\"ג:; אָרִ\"י. מַלְכוּת לֹא פָּנִים אֶל פָּנִים עֲדַיִן.",
"ז\"ח בָּלָק ר\"ג:."
),
seg(2,
"'One dines in it' — meaning when we seek to rectify Malchut and elevate it to the aspect of 'ezer k'negdo' — 'a helper opposite him' (Genesis 2:18), so that it is face-to-face with Ze'ir Anpin in direct reciprocal connection. 'To bless three times' means it is necessary to illuminate the sefirot of Netzach, Hod, and Yesod of Ze'ir Anpin — for from them, the primary structure of Malchut is built. These three sefirot become illuminated through the mochin (intellectual lights) that Ze'ir Anpin receives: four mochin — Chochmah, Binah, Chesed, Gevurah — clothed within the Netzach, Hod, Yesod of Binah. This illumination is 'like the light of the seven days.' The letter Shin with three heads represents the three intellectual powers (Chochmah, Binah, Da'at); Shin with four heads represents the four mochin.",
"'One dines in it' = rectify Malchut → elevate to 'ezer k'negdo' (Ber 2:18) = face-to-face. 'Bless three times' = illuminate Netzach/Hod/Yesod of Ze'ir Anpin → builds Malchut. Four mochin (Chochmah/Binah/Chesed/Gevurah) clothed in NHY of Binah. Shin-3-heads = CHaBaD; Shin-4-heads = four mochin.",
"'אֲכַל בַּהּ' = תִּקּוּן מַלְכוּת → עֲלִיָּה לְ'עֵזֶר כְּנֶגְדּוֹ' (בר' ב:יח) = פָּנִים אֶל פָּנִים. 'לְבָרֵךְ שָׁלשׁ פְּעָמִים' = הֶאָרַת נה\"י דְּזְ\"א → בִּנְיַן מַלְכוּת. ד' מֹחִין (חב\"ד חג) לְבוּשִׁים בְּנה\"י דְּבִינָה. שִׁי\"ן ג-רָאשִׁין = חב\"ד; שִׁי\"ן ד-רָאשִׁין = ד' מֹחִין.",
"ז\"ח בָּלָק ר\"ג:; בר' ב:יח; אָרִ\"י."
),
]

out85 = os.path.join(pnc_dir, 'torah-85.json')
data85 = {"id": "pnc-1-85", "book": pnc_name, "part": 1, "torah": 85, "title": "T85 PNC - One Steps a Small Step (Malchut/Ze'ir Anpin/Mochin, 2 segs)", "hebrewTitle": "צָעַד פְּסִיעָה קְטַנָּה — מַלְכוּת וּזְ\"א פָּנִים אֶל פָּנִים", "author": "Petten Nanach", "segments": segs_85}
with open(out85, 'w', encoding='utf-8') as f:
    json.dump(data85, f, ensure_ascii=False, indent=2)
with open(out85, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 2
print(f"T85 written, avg: {sum(len(s['beginner']['en']) for s in chk['segments'])/2:.0f}")

# T86
segs_86 = [
seg(1,
"The same opening saying: 'One steps in it a small step, one dines in it to bless three times.' This teaching now applies the same principle to Shabbat.",
"Same phrase applied to Shabbat. 'One steps a small step, one dines to bless three times.'",
"אוֹתוֹ בִּטּוּי מוּחָל עַל שַׁבָּת.",
""
),
seg(2,
"During the weekdays, there is the dominion of the chitzonim (external forces/spiritual impediments). However, on Erev Shabbat (Friday afternoon) during bein hashmashot (twilight), the chitzonim have no dominion at all — as the Zohar teaches. The verse alludes to this: 'When the day is sanctified, all the workers of iniquity shall be scattered' (Psalms 92:10). The primary mode through which the chitzonim exercise their dominion during weekdays is through the aspect of the feet — as the Talmudic saying goes: 'These knees of the rabbis — from where are they worn out?' from the constant walking and exertion. But on Shabbat Kodesh, the power of walking is restored to a person, as the verse says: 'If you restrain your foot because of the Shabbat' (Isaiah 58:13). On Shabbat, a person is able to walk in the ways of the Blessed One. However — it is like a child who is just learning to walk: the child still needs support (sa'ad) to hold him up, cannot yet run, can only take small steps. This is the meaning of 'one steps a small step' — on Shabbat, one begins to walk in God's ways, but like a new walker, small and supported.",
"Weekdays: dominion of chitzonim. Erev Shabbat bein hashmashot: no dominion (Teh 92:10). Chitzonim's dominion = through feet. Shabbat: power of walking restored (Yesh 58:13). But like child learning to walk = needs sa'ad (support), only small steps. 'One steps a small step' = Shabbat-walking in God's ways, still supported.",
"יְמֵי הַחֹל: שִׁלְטוֹן חִיצוֹנִים. עֶרֶב שַׁבָּת בֵּין הַשְּׁמָשׁוֹת: אֵין שִׁלְטוֹן (תה' צ\"ב:י). חִיצוֹנִים = דַּרְךְ הָרַגְלַיִם. שַׁבָּת: כֹּחַ הֲלִיכָה מוּחְזָר (יְשַׁ' נ\"ח:יג). כְּיֶלֶד הַלּוֹמֵד לָלֶכֶת = צָרִיךְ סַעַד, רַק פְּסִיעוֹת קְטַנּוֹת.",
"תה' צ\"ב:י; יְשַׁ' נ\"ח:יג; ז\"ח."
),
]

out86 = os.path.join(pnc_dir, 'torah-86.json')
data86 = {"id": "pnc-1-86", "book": pnc_name, "part": 1, "torah": 86, "title": "T86 PNC - Shabbat Walking/Chitzonim/Small Steps (2 segs)", "hebrewTitle": "צָעַד פְּסִיעָה קְטַנָּה — הֲלִיכַת שַׁבָּת וְהַחִיצוֹנִים", "author": "Petten Nanach", "segments": segs_86}
with open(out86, 'w', encoding='utf-8') as f:
    json.dump(data86, f, ensure_ascii=False, indent=2)
with open(out86, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 2
print(f"T86 written, avg: {sum(len(s['beginner']['en']) for s in chk['segments'])/2:.0f}")

# Register both
lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
for n, label in [(85, "T85 (Malchut/Ze'ir Anpin/Mochin, 2 segs)"), (86, "T86 (Shabbat Walking/Chitzonim, 2 segs)")]:
    if str(n) not in cdata['1']:
        cdata['1'][str(n)] = {}
    cdata['1'][str(n)]['running_commentary'] = {"book": pnc_name, "slug": pnc_name, "status": "available", "url": f"/reader/{pnc_name}/torah-{n}.json", "layers": ["beginner", "intermediate", "scholarly"], "author": "Petten Nanach", "label": f"Petten Nanach Running Commentary - {label}"}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T85, T86")

for n in [85, 86]:
    t_git = f'public/reader/{pnc_name}/torah-{n}.json'
    subprocess.run(['git', 'add', t_git], cwd=repo, check=True)
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json'], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T85-T86 PNC -- Malchut/Mochin/Shabbat-walking (4 segs total)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
