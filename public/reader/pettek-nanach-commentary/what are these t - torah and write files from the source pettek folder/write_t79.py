import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-79.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'Trust in Hashem and do good; dwell in the land and pasture faith' (Psalms 37:3). The core teaching: every person must ensure that no delay in the coming of Mashiach comes from their side — by performing complete teshuvah and rectifying their deeds. In every tzaddik, and especially in a truly great one, there is a revelation of Mashiach. Even if they do not yet possess the full revelation, they have at least a measure of the Mashiach-quality — corresponding to the attribute of Moses. As the holy Zohar teaches (Bereishit 25b): 'Mashiach is Moses.' The explanation: Moses gave his life for Israel, and he did so because he knew his own shiflus (lowliness/humility) in truth and recognized Israel's greatness. As the verse says: 'And the man Moses was very humble, more than any person on the face of the earth' (Numbers 12:3). Because of this profound humility, he was willing to risk everything for the people. A true tzaddik who genuinely knows his own shiflus and recognizes the importance of Israel can likewise willingly give his life for them.",
"Frame verse: Teh 37:3. Every person: no delay in Mashiach from their side = teshuvah. Every tzaddik = revelation of Mashiach-quality = attribute of Moshe. Zohar Bereishit 25b: Mashiach = Moshe. Moshe's shiflus + recognizing Israel's greatness (Bamidbar 12:3) → willing to give life for Israel.",
"פָּסוּק: תה' ל\"ז:ג. כָּל אֶחָד: לֹא לְגָרֵם עִיכּוּב לַמָּשִׁיחַ = תְּשׁוּבָה שְׁלֵמָה. כָּל צַדִּיק = גִּלּוּי מְשִׁיחִי = מִדַּת מֹשֶׁה. ז\"ח בְּרֵ' כ\"ה:: מָשִׁיחַ = מֹשֶׁה. שִׁפְלוּת מֹשֶׁה + הַכָּרַת גְּדֻלַּת יִשְׂרָאֵל (בְּמִד' י\"ב:ג) → מוּכָן לָמוּת בְּעַד יִשְׂרָאֵל.",
"ז\"ח בְּרֵ' כ\"ה:; בְּמִד' י\"ב:ג."
),
seg(2,
"This connects to the sweetening of the waters: 'And He showed him a tree, and the waters were sweetened' (Exodus 15:25) — the tree/staff of Moses is used to transform bitterness into sweetness, to bring mitzvot and transform the world. This relates to Moses-Mashiach: 'And the staff of God is in my hand' (Exodus 4:20). This staff is the aspect of Metatron — the celestial being that stands between the worlds — which has the power to give life or death. Metatron is associated with the realm of the Mishnah, symbolizing the six weekdays and their alternating states of sacred and mundane. People not yet fully rooted in divine service experience this instability: they fall and rise, oscillating between permitted and forbidden, pure and impure. Complete teshuvah brings the Shabbat quality — naycha (rest) — which is Moses-Mashiach's power to turn evil to good and push evil aside. Thus: 'Trust in Hashem' means quiet and secure rest from all turmoil; 'do good' means complete transformation from evil to good; 'dwell in the land' refers to the soul's naycha, as the verse says: 'My soul is like land (thirsty for You)' (Psalms 143:6).",
"Sweetening waters = Shemot 15:25. Staff of Moses/Metatron = gives life or death (Shemot 4:20). Metatron = Mishnah realm = six weekdays/alternating states. Not-yet-rooted = instability. Complete teshuvah → Shabbat/naycha. 'Betach baHashem' = rest; 'va'aseh tov' = transformation; 'sh'chon eretz' = soul's naycha (Teh 143:6).",
"הַמְתָּקַת מַיִם = שְׁמ' ט\"ו:כה. מַטֵּה מֹשֶׁה/מֵטַטְרוֹן = חַיִּים אוֹ מָוֶת (שְׁמ' ד:כ). מֵטַטְרוֹן = תְּחוּם מִשְׁנָה = שֵׁשֶׁת יְמֵי חֹל/תְּנוֹדוֹת. תְּשׁוּבָה שְׁלֵמָה → שַׁבָּת/נַיְיחָא. 'בְּטַח בַּה'' = מְנוּחָה; 'וַעֲשֵׂה טוֹב' = הַפְּיכַת רַע לְטוֹב; 'שְׁכׇן אֶרֶץ' = נַיְיחָא הַנֶּפֶשׁ (תה' קמ\"ג:ו).",
"שְׁמ' ט\"ו:כה; ד:כ; תה' קמ\"ג:ו; ז\"ח בְּרֵ' כ\"ה:."
),
]

data = {
    "id": "pnc-1-79",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 79,
    "title": "T79 Petten Nanach Commentary - Betach BaHashem V'aseh Tov (Teshuvah/Mashiach-Moshe/Naycha, 2 segs)",
    "hebrewTitle": "בְּטַח בַּה' וַעֲשֵׂה טוֹב — מֹשֶׁה מָשִׁיחַ וּתְשׁוּבָה שְׁלֵמָה",
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
if '79' not in cdata['1']:
    cdata['1']['79'] = {}
cdata['1']['79']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-79.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T79 (Teshuvah/Mashiach-Moshe/Naycha, 2 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T79")

t79_git = 'public/reader/' + pnc_name + '/torah-79.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t79_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T79 PNC -- Betach BaHashem/teshuvah/Moshe-Mashiach/naycha (2 segs)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
