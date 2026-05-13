import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-78.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'And He gives strength to His king and exalts the horn of His anointed' (1 Samuel 2:10). This verse is about Mashiach, Ruach HaKodesh (the Holy Spirit), the unification of the Holy One and His Shechinah, and the resurrection of the dead. The beginning of all creation was specifically so that His attribute of Malchus (Kingship/Sovereignty) could be revealed. But because of the overwhelming greatness of His divine illumination, it was impossible for any created being to receive it — so He was 'forced,' as it were, to contract His light within worlds (olamot), as the verse says: 'Your Kingdom is the Kingdom of all worlds (kol olamim)' (Psalms 145:13) — meaning the attribute of Malchus clothed itself within worlds so it could be received. Without anyone to accept His Malchus, it cannot exist — for there is no king without a people. Therefore, the souls of Israel emerged into existence specifically to be the ones who accept upon themselves His Malchus, and through this, Malchus is revealed.",
"Frame verse: 1 Sam 2:10. Framework: creation's purpose = reveal Malchus. Divine light too great → contracted within olamot (Teh 145:13). 'Ein melech b'lo am.' Israel's souls emerged = to accept Malchus. This is the purpose of all creation.",
"פָּסוּק: שמ\"א ב:י. בְּרִיאָה = לְגַלּוֹת מַלְכוּת. אוֹר אֱלֹהִי גָּדוֹל מִדַּי → נִתְכַּוֵּץ בְּאוֹלָמוֹת (תה' קמ\"ה:יג). 'אֵין מֶלֶךְ בְּלֹא עָם.' נְשָׁמוֹת יִשְׂרָאֵל = לְקַבֵּל מַלְכוּתוֹ. זֶה תַּכְלִית הַבְּרִיאָה.",
"תה' קמ\"ה:יג; שמ\"א ב:י."
),
seg(2,
"The lung is the aspect of mayim (water — Zohar Pinchas 218b), and mayim is Torah. When an Israelite burns in his heart with love for God, the fire of that love could burn the entire body — it is that intense. But when he clothes himself in the letters of Torah or tefillah, the Torah-garment protects and saves him. Similarly — and tragically — the opposite holds: when a person burns with desire for the pleasures of this world, that fire too could burn the entire body. But when afterward he studies Torah or does a mitzvah, the Torah-clothing protects him and allows him to live, because it draws the spirit of life — Ruach HaKodesh — from the attribute of Malchus, which is his root (Berachot 18a). If, however, a person cuts himself off from the rope of holiness — from where will he draw vitality? He will draw instead a spirit of foolishness, because he has attached himself to the 'old and foolish king' (Ecclesiastes 4:13). This is what the Talmud says (Sotah 3a): 'A person does not commit a transgression unless a spirit of foolishness (ruach shtut) enters him.'",
"Lung = mayim = Torah (Zohar Pinchas 218b). Fire of Hashem-love → Torah-clothing protects. Sin-fire → Torah/mitzvah clothing protects. Drawing Ruach HaKodesh from Malchus (Berachot 18a). Cut from holiness → draws ruach shtut (Sotah 3a) → 'melech zaken u'kesil' (Kohelet 4:13).",
"רֵאָה = מַיִם = תּוֹרָה (ז\"ח פִּינְחָס ריח:). אֵשׁ אַהֲבַת ה' → לְבוּשׁ תּוֹרָה מֵגֵן. אֵשׁ תַּאֲוָה → לְבוּשׁ תּוֹרָה/מִצְוָה מֵגֵן. שְׁאִיבַת רוּחַ הַקֹּדֶשׁ מִמַּלְכוּת (בְּרָכוֹת יח:). נִתְקַע מִקְּדֻשָּׁה → רוּחַ שְׁטוּת (סוֹטָה ג:) → 'מֶלֶךְ זָקֵן וּכְסִיל' (קֹהֶלֶת ד:יג).",
"ז\"ח פִּינְחָס ריח:; בְּרָכוֹת יח:; סוֹטָה ג:; קֹהֶלֶת ד:יג."
),
seg(3,
"All of this — the protection of Torah-clothing, the drawing of Ruach HaKodesh, the resistance to the spirit of foolishness — is done with Ruach HaKodesh itself (Isaiah 11:3). Then the partzuf (face/configuration) of Malchus will be rectified in perfection, and all aspects of Malchus will be gathered back to its root: 'And the Kingdom will be to God' (Obadiah 1:21); 'And Hashem will be King over all the earth' (Zechariah 14:9). When that time comes, we will be able to recognize our Creator above all the worlds — without any garment, without image, without form — as it is written: 'For God is a great King over all the earth' (Psalms 47:3). When Malchus is great and its light is exalted because of the rectification of our deeds, we will know God above all worlds — not as now, when He is clothed in the garments of worlds. And this is the verse: 'And He gives strength to His king' — when He gives strength and illumination to Malchus — 'and exalts the horn of His anointed' — each person will rectify their aspect of Mashiach and ascend level by level.",
"All with Ruach HaKodesh (Yesh 11:3). Partzuf of Malchus rectified → Malchus to its root. Ovadiah 1:21 + Zech 14:9. We will know Creator without clothing. Teh 47:3. 'V'yiten oz l'malko' = strength to Malchus → 'v'yarum keren m'shichotam' = each one rectifies Mashiach, ascends level by level.",
"יְשַׁ' י\"א:ג; עוֹב' א:כא; זְכַ' י\"ד:ט; תה' מ\"ז:ג. 'וְיִתֶּן עֹז לְמַלְכּוֹ' = חִזּוּק מַלְכוּת → 'וְיָרֵם קֶרֶן מְשִׁיחוֹ' = כָּל אֶחָד מְתַקֵּן בְּחִינַת מְשִׁיחוֹ, עוֹלֶה מַדְרֵגָה בְּמַדְרֵגָה.",
"יְשַׁ' י\"א:ג; עוֹב' א:כא; זְכַ' י\"ד:ט; תה' מ\"ז:ג; שמ\"א ב:י."
),
]

data = {
    "id": "pnc-1-78",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 78,
    "title": "T78 Petten Nanach Commentary - V'Yiten Oz l'Malko (Malchus/Torah Clothing/Mashiach, 3 segs)",
    "hebrewTitle": "וְיִתֶּן עֹז לְמַלְכּוֹ — מַלְכוּת וְלְבוּשׁ הַתּוֹרָה",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 3
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 3
print(f"Written: {out_path}")
print(f"Segments: 3, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '78' not in cdata['1']:
    cdata['1']['78'] = {}
cdata['1']['78']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-78.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T78 (Malchus/Torah Clothing/Mashiach, 3 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T78")

t78_git = 'public/reader/' + pnc_name + '/torah-78.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t78_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T78 PNC -- V'Yiten Oz l'Malko/Malchus/Torah clothing/Mashiach (3 segs)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
