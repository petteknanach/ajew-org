import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-73.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'For you will pass through waters, with you I am' (Isaiah 43:2). Torah is both hidden (nistar) and revealed; God is also both nistar and revealed. What is revealed to us is the garment and the externality; what is hidden from us is the p'nimiyus (the inner essence). Every person must strive urgently to attain the p'nimiyus — the hidden aspect. But how can one reach what is hidden? Through tefillah lishmah — prayer for its own sake, where one binds thought to speech in a mighty and strong bond. God desires the prayers of the righteous (Chullin 60b). Why? Because God desires chesed (Micah 7:18) and always wishes to flow influence and blessing — but the divine shefa can only descend through a vessel called 'Ani' (I). As the verse says: 'And I will bless them' (Numbers 6:26). This vessel — the 'Ani' — is created by every Jew who prays with his thought genuinely bound to his words of prayer. Thus tefillah lishmah creates the vessel that allows the hidden to become revealed.",
"Frame verse: Yesh 43:2. Torah + Hashem = nistar + galuy. Revealed = garment; hidden = p'nimiyus. How to reach nistar: tefillah lishmah = bind thought to speech. Chullin 60b: Hashem desires tzaddikim's prayers. Micha 7:18: desires chesed. Vessel for shefa = 'Ani' (Bamidbar 6:26). Tefillah lishmah creates the Ani-vessel.",
"פָּסוּק: יְשַׁ' מ\"ג:ב. תּוֹרָה + הַשֵּׁם = נִסְתָּר + נִגְלֶה. נִגְלֶה = לְבוּשׁ; נִסְתָּר = פְּנִימִיּוּת. אֵיךְ לְהַגִּיעַ לַנִּסְתָּר: תְּפִלָּה לִשְׁמָהּ = קְשִׁירַת מַחֲשָׁבָה לַדִּיבּוּר. חֻלִּין ס': + מִיכָה ז:יח. כְּלִי לַשֶּׁפַע = 'אֲנִי' (בְּמִד' ו:כו). תְּפִלָּה לִשְׁמָהּ יוֹצֶרֶת כְּלִי הָ'אֲנִי'.",
"חֻלִּין ס':; מִיכָה ז:יח; בְּמִד' ו:כו; בְּמִד' כ\"ח:ב."
),
seg(2,
"One who receives pleasure from another is called 'nukva' (feminine/receptive) in relation to the one giving pleasure. Therefore, when Hashem, as it were, receives pleasure from Israel's prayers — He becomes 'nukva' in relation to Israel. This is the meaning of the verse 'A fire-offering, a pleasing aroma to Hashem' (Numbers 28:2) — through the pleasing aroma of Israel's prayers, Hashem receives pleasure and enters the aspect of 'nekevah' (the feminine). This is the mystery of the verse: 'A woman encircles a man' (Jeremiah 31:22) — the inner p'nimiyus becomes external. Now the verse is explained: 'Ki va'mayim ta'avor' — 'ta'avor' (you will pass/cross) is the language of revelation, as Onkelos translates the verse 'And Hashem passed over Egypt' (Exodus 12:23) as 'Hashem was revealed.' And 'mayim' (waters) = Torah (Bava Kama 17a). Therefore: when you desire that the hidden within Torah be revealed to you — 'itti ani' — 'with you I am' — meaning: you will make the vessel called Ani, and then the hidden will be revealed.",
"Receiving pleasure = nukva. When Hashem receives pleasure from Israel's prayers = Hashem nukva to Israel. Bamidbar 28:2 'reiach nicho'ach.' Yirm 31:22 'nekevah tsorev gaver.' Ta'avor = language of revelation (Onkelos on Shemot 12:23). Mayim = Torah (BK 17a). Hidden Torah revealed = make the Ani-vessel = 'itti ani.'",
"מְקַבֵּל נַחַת = נוּקְבָא. כְּשֶׁהַשֵּׁם מְקַבֵּל נַחַת מִתְּפִלּוֹת יִשְׂרָאֵל = נַעֲשֶׂה נוּקְבָא לְיִשְׂרָאֵל. בְּמִד' כ\"ח:ב 'רֵיחַ נִיחֹחַ.' יִרְמ' ל\"א:כב 'נְקֵבָה תְּסוֹבֵב גָּבֶר.' תַּעֲבֹר = לְשׁוֹן גִּלּוּי (אֻנְקְלוֹס שְׁמ' י\"ב:כג). מַיִם = תּוֹרָה (ב\"ק י\"ז:). נִסְתַּר תּוֹרָה נִגְלֶה = עֲשֵׂה כְּלִי הָ'אֲנִי' = 'אִתִּי אָנִי.'",
"בְּמִד' כ\"ח:ב; יִרְמ' ל\"א:כב; שְׁמ' י\"ב:כג; ב\"ק י\"ז:; יְשַׁ' מ\"ג:ב."
),
]

data = {
    "id": "pnc-1-73",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 73,
    "title": "T73 Petten Nanach Commentary - Ki VaMayim Ta'avor (Tefillah Lishmah/Ani Vessel, 2 segs)",
    "hebrewTitle": "כִּי בַמַּיִם תַּעֲבֹר אִתִּי אָנִי — כְּלִי הָאֲנִי",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 2
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 2
print(f"Written: {out_path}")
print(f"Segments: 2, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '73' not in cdata['1']:
    cdata['1']['73'] = {}
cdata['1']['73']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-73.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T73 (Tefillah Lishmah/Ani Vessel/Nistar, 2 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T73")

t73_git = 'public/reader/' + pnc_name + '/torah-73.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t73_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T73 PNC -- Ki VaMayim Ta'avor/tefillah lishmah/Ani vessel (2 segs)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
