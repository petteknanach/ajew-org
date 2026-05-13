import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-74.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'Be exalted above the heavens, God; above all the earth Your glory' (Psalms 57:6). Every person must effect healing for his soul — specifically by raising the soul to its root (Zohar Pekudei 223b). There are two kinds of divine judgment: the judgment of defilement (dina d'tumah), which is the aspect of the serpent that injected impurity into Eve (Shabbat 146a; Proverbs 3:18); and holy judgment (dina kadisha), as the verse says 'Whom Hashem loves, He reproves' (Proverbs 3:12). The beginning of true approach to God is through distancing — as the Talmud says (Ta'anit 8a): 'Whoever accepts the judgment upon himself below, Heaven justifies the judgment upon him above.' This is the aspect of small intellect — and it is the starting point of healing the soul.",
"Frame verse: Teh 57:6. Soul-healing = raising to its root (Zohar Pekudei 223b). Two judgments: dina d'tumah (serpent/Eve — Shab 146a; Misl 3:18) vs. dina kadisha (Misl 3:12). Beginning of approach = distancing. Ta'anit 8a: justifying judgment below → justified above. = Small intellect.",
"פָּסוּק: תה' נ\"ז:ו. תִּקּוּן נֶפֶשׁ = הַרָמַת הַנֶּפֶשׁ לְשׁוֹרְשָׁהּ (ז\"ח פְּקוּדֵי רכ\"ג:). שְׁנֵי דִינִים: דִּינָא דְּטֻמְאָה (נָחָשׁ/חַוָּה — שַׁב' קמ\"ו:; מִשְׁלֵי ג:יח) מוּל דִּינָא קַדִּישָׁא (מִשְׁלֵי ג:יב). תַּחֲלַת הִתְקָרְבוּת = הִתְרַחֲקוּת. תַּעֲנִית ח:. = מֹחִין קְטַנִּים.",
"ז\"ח פְּקוּדֵי רכ\"ג:; שַׁב' קמ\"ו:; מִשְׁלֵי ג:יב, יח; תַּעֲנִית ח:."
),
seg(2,
"The divine glory (kavod) is revealed specifically through chochmah (wisdom). The verse says: 'And if I am a father, where is My glory?' (Malachi 1:6) — implying that the father-principle brings glory. And 'father' is the kabbalistic aspect of chochmah — as in the word 'Avrech' (Genesis 41:43), which Rashi explains as 'father in wisdom' (av b'chochmah). This establishes the chain: chochmah → father → kavod. To bring down divine glory into the world, one must access and express chochmah.",
"Kavod revealed through chochmah. Malachi 1:6 'if I am a father, where is My glory.' Father = chochmah. 'Avrech' (Ber 41:43) = av b'chochmah (Rashi). Chain: chochmah → father → kavod.",
"כָּבוֹד נִגְלֶה עַל יְדֵי חָכְמָה. מַלְאָכִי א:ו 'אִם אָב אָנִי אַיֵּה כְבוֹדִי.' אָב = חָכְמָה. 'אַבְרֵךְ' (בר' מ\"א:מג) = אַב בְּחָכְמָה (רש\"י). שַׁרְשֶׁרֶת: חָכְמָה → אָב → כָּבוֹד.",
"מַלְאָכִי א:ו; בר' מ\"א:מג; רש\"י."
),
seg(3,
"Now the verse is explained: 'Rum al hashamayim Elokim' — 'Be exalted above the heavens, God.' 'Elokim' here is the aspect of the soul (nefesh) in the mode of dina kadisha (holy judgment). 'Shamayim' (heavens) is the aspect of Yaakov, which is the aspect of chochmah (as taught elsewhere). When a person raises his soul — the dina kadisha aspect — to the level of Yaakov/chochmah, then immediately: 'Above all the earth Your glory' — the divine glory is revealed. This is the complete chain of healing: elevate the dina kadisha (soul/Elokim) to chochmah (Yaakov/shamayim), and the kavod becomes manifest. [Note: Rabbeinu's student indicates this section was not heard directly from Rabbeinu's mouth and the language is fragmentary; but the essential teaching is preserved.]",
"Verse decoded: 'Elokim' = dina kadisha = soul. 'Shamayim' = Yaakov = chochmah. Raise dina kadisha to chochmah → 'al kol ha'aretz kevodecha' = kavod revealed. Complete healing chain: dina kadisha → chochmah → kavod.",
"פָּסוּק מְפֹרָשׁ: 'אֱלֹהִים' = דִּינָא קַדִּישָׁא = נֶפֶשׁ. 'שָׁמַיִם' = יַעֲקֹב = חָכְמָה. הַרָמַת דִּינָא קַדִּישָׁא לְחָכְמָה → כָּבוֹד נִגְלֶה. שַׁרְשֶׁרֶת: דִּינָא קַדִּישָׁא → חָכְמָה → כָּבוֹד. [הֶעָרָה: לְשׁוֹן הַחֲבֵרִים — חָסֵר.]",
"תה' נ\"ז:ו; ז\"ח פְּקוּדֵי רכ\"ג:."
),
seg(4,
"Hiding of the face (hester panim) — meaning the nullification of prayer — is a harsh judgment. As the verse says: 'You hid Your face, I was dismayed' (Psalms 30:8). When prayer is nullified, the connection between the soul and its root is severed. Now: Yitzchak is specifically the aspect of dina kadisha that is drawn from the side of chesed — as the verse says 'Avraham begot Yitzchak' (Genesis 25:19). Rashi explains: the scoffers of the generation said that Avimelech (the Philistine king) fathered Yitzchak from Sarah — meaning they tried to claim that Yitzchak's judgment-aspect (his dina kadisha) was drawn from the side of defilement (Avimelech = impurity). Therefore God made Yitzchak's face look exactly like Avraham's, so that all would acknowledge 'Avraham begot Yitzchak' — the dina kadisha of Yitzchak is drawn from the side of chesed/Avraham, not from impurity.",
"Hester panim = nullification of prayer = harsh judgment. Teh 30:8. Yitzchak = dina kadisha drawn from chesed (Avraham's side). 'Avraham begot Yitzchak' (Ber 25:19). Rashi: scoffers claimed Avimelech = impurity side. Hashem made Yitzchak's face like Avraham's = dina kadisha from chesed confirmed.",
"הֶסְתֵּר פָּנִים = בִּיטּוּל תְּפִלָּה = דִּין קָשֶׁה. תה' ל:ח. יִצְחָק = דִּינָא קַדִּישָׁא הַנִּשְׁאָב מִצַּד הַחֶסֶד. בר' כ\"ה:יט 'אַבְרָהָם הוֹלִיד אֶת יִצְחָק.' רש\"י: לֵיצָנֵי הַדּוֹר אָמְרוּ אֲבִימֶלֶךְ הוֹרָהּ — צַד טֻמְאָה. ה' צָר פְּנֵי יִצְחָק כְּאַבְרָהָם = דִּינָא קַדִּישָׁא מֵחֶסֶד.",
"תה' ל:ח; בר' כ\"ה:יט; רש\"י."
),
seg(5,
"The sweetening of Yitzchak's judgment — meaning the rectification of dina kadisha — happens specifically through chochmah, which is the knowing of Torah. This sweetening is the aspect of Yaakov, who was born from Yitzchak. From Yitzchak (dina kadisha = the soul), two aspects are born: Yaakov and Esav. Yaakov is the aspect of chochmah, the aspect of speech with knowledge — and this is the sweetening of judgment, the transformation of din into tov (goodness). Esav is the aspect of dross and waste that descend from judgment without rectification — the aspect of 'a soul when it sins' (Leviticus 4:2). This is the meaning of the verse: 'These are the generations of Yitzchak son of Avraham' — and Rashi says these generations are Yaakov and Esav: the two possible outcomes of the soul's experience of dina kadisha, either sweetened through chochmah or left as waste.",
"Sweetening Yitzchak's judgment = through chochmah = Torah knowledge = Yaakov (born from Yitzchak). Two outcomes from dina kadisha: Yaakov (chochmah = sweetening) and Esav (dross = 'nefesh ki techeta'). 'Eileh toldot Yitzchak' (Ber 25:19) — Rashi: Yaakov and Esav.",
"הַמְתָּקַת דִּין יִצְחָק = עַל יְדֵי חָכְמָה = תּוֹרָה = יַעֲקֹב (נוֹלַד מִיִּצְחָק). שְׁנֵי יְצִיאוֹת מִדִּינָא קַדִּישָׁא: יַעֲקֹב (חָכְמָה = הַמְתָּקָה) וְעֵשָׂו (סֵיגִים = 'נֶפֶשׁ כִּי תֶחֱטָא'). בר' כ\"ה:יט — רש\"י: יַעֲקֹב וְעֵשָׂו.",
"בר' כ\"ה:יט; רש\"י; ויק' ד:ב."
),
]

data = {
    "id": "pnc-1-74",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 74,
    "title": "T74 Petten Nanach Commentary - Rum Al HaShamayim Elokim (Dina Kadisha/Chochmah/Kavod, 5 segs)",
    "hebrewTitle": "רוּם עַל הַשָּׁמַיִם אֱלֹהִים — דִּינָא קַדִּישָׁא וְחָכְמָה",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 5
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 5
print(f"Written: {out_path}")
print(f"Segments: 5, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '74' not in cdata['1']:
    cdata['1']['74'] = {}
cdata['1']['74']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-74.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T74 (Dina Kadisha/Chochmah/Yaakov-Esav, 5 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T74")

t74_git = 'public/reader/' + pnc_name + '/torah-74.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t74_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T74 PNC -- Rum al hashamayim/dina kadisha/chochmah/Yaakov-Esav (5 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
