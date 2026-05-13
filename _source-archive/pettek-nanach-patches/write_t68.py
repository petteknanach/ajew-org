import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-68.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Title and opening theme: 'All Souls Thirst and Desire for Wealth.' The verse is: 'And the lovers of the rich are many' (Proverbs 14:20). Every soul thirsts for mamon (wealth), and people are naturally drawn to love those who have it. This is not mere materialism — it is a spiritual reality. The nefesh (soul) originates in a supernal place, the very source from which mamon is drawn and formed. The root of all mamon is in holiness and divine abundance (shefa) from above; only afterward does it descend and materialize as physical wealth below. The soul recognizes its supernal root, and that is why it is drawn to mamon — it is drawn toward its own source.",
"Title: 'All nefashos thirst for mamon' (Misl 14:20). Reason: nefesh originates from the supernal place from which mamon is drawn. Root of mamon = kedushah and shefa above; descends to become material mamon. Soul drawn to mamon = drawn to its own supernal root.",
"כֹּתֶרֶת: כָּל נֶפֶשׁ כּוֹסֶפֶת לְמָמוֹן (מִשְׁלֵי י\"ד:כ). סִבָּה: נֶפֶשׁ מוּצָאָה מֵהַמָּקוֹם הָעֶלְיוֹן שֶׁמִּמֶּנּוּ מָמוֹן נִשְׁאָב. שׁוֹרֶשׁ מָמוֹן = קְדֻשָּׁה וְשֶׁפַע מִלְמַעְלָה; יוֹרֵד וְנַעֲשֶׂה מָמוֹן חוֹמְרִי. נֶפֶשׁ נִמְשֶׁכֶת לְמָמוֹן = נִמְשֶׁכֶת לְשׁוֹרְשָׁהּ הָעֶלְיוֹן.",
"מִשְׁלֵי י\"ד:כ."
),
seg(2,
"One must not desire the mamon itself — the material wealth — because the desire for mamon has been shown many times to be profoundly damaging to the soul. Rather, one should desire and love the supernal place from which mamon is drawn — the source of shefa and kedushah above. This is why a rabbi honors those who are wealthy: as the Talmud states (Eruvin 86a), it is because their mamon comes from a high place. The honor paid to the rich is really honor paid to the divine abundance they carry. Furthermore, it is fitting for all of Israel to have mamon — the flow of divine shefa should reach the holy people. But there is one attribute, one character trait, that destroys and chases away mamon from its possessor. It is an evil and contemptible trait, very difficult to escape, especially when it seizes a person in youth — that attribute is anger (ka'as).",
"One should desire the supernal root of mamon, not mamon itself. Rabbi honors rich = Eruvin 86a (mamon from high place). It is fitting for all Israel to have mamon. But one trait destroys mamon = ka'as (anger). Overpowers in youth.",
"יֵשׁ לִכְסֹף לְשֹׁרֶשׁ הָעֶלְיוֹן שֶׁל מָמוֹן, לֹא לְמָמוֹן עַצְמוֹ. רַב מְכַבֵּד עָשִׁיר = עֵרוּבִין פ\"ו: (מָמוֹן מִמָּקוֹם גָּבוֹהַּ). רָאוּי לְכָל יִשְׂרָאֵל שֶׁיִּהְיֶה לָהֶם מָמוֹן. אֲבָל מִדָּה אַחַת מְאַבֶּדֶת מָמוֹן = כַּעַס.",
"עֵרוּבִין פ\"ו:."
),
seg(3,
"Through anger (ka'as), a person loses his nefesh — as the verse states, 'He tears his soul in his anger' (Job 18:4; Zohar Tetzaveh 182a). The connection: since the nefesh and mamon share the same supernal root, when a person tears his nefesh through anger, he simultaneously destroys his connection to mamon. Know this: even if the divine shefa has already descended and formed itself into mamon — meaning the person already has material wealth in his hands, which is the aspect of a choma (protective wall) — sometimes the adversary incites him to such extreme ka'as that even this already-formed mamon is destroyed and lost. One might think that once the shefa has solidified into mamon (a choma), it could no longer be 'melted back' into ka'as. But no: the adversary can kindle ka'as so intensely that even the protective wall of formed mamon is breached and lost. The lesson: guard against anger above all things, for it is the single greatest destroyer of both the soul and material blessing.",
"Ka'as (anger) = loses nefesh: Iyov 18:4 + Zohar Tetzaveh 182a. Since nefesh and mamon share root, losing nefesh = losing mamon. Even formed mamon (choma = protective wall) can be destroyed by extreme ka'as. The adversary incites ka'as specifically to breach the choma. Guard against anger above all.",
"כַּעַס = מְאַבֵּד נֶפֶשׁ: אִיּוֹב י\"ח:ד + ז\"ח תְּצַוֶּה קפ\"ב. נֶפֶשׁ וּמָמוֹן = שׁוֹרֶשׁ אֶחָד; אֲבֵדַת נֶפֶשׁ = אֲבֵדַת מָמוֹן. אֲפִילוּ מָמוֹן כְּבָר נִצְרַר (חוֹמָה) — כַּעַס קָיצוֹנִי מְשַׁבֵּר אוֹתוֹ. הַיֵּצֶר מַצִּית כַּעַס לִפְרֹץ הַחוֹמָה.",
"אִיּוֹב י\"ח:ד; ז\"ח תְּצַוֶּה קפ\"ב; עֵרוּבִין פ\"ו:."
),
]

data = {
    "id": "pnc-1-68",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 68,
    "title": "T68 Petten Nanach Commentary - All Souls Thirst for Wealth (Mamon/Ka'as/Nefesh, 3 segs)",
    "hebrewTitle": "כָּל נֶפֶשׁ כּוֹסֶפֶת לְמָמוֹן — כַּעַס מְאַבֵּד",
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
cdata['1']['68']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-68.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T68 (Mamon/Ka'as/Nefesh, 3 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T68")

t68_git = 'public/reader/' + pnc_name + '/torah-68.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t68_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T68 PNC -- All souls thirst for mamon/ka'as destroys (3 segs)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
