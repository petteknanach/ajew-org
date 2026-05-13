import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-71.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"A very short but deep teaching: 'It is very difficult to be famous (m'fursam).' Know that fame harms those who are famous — greatly. Because famous people must bear suffering on behalf of the many, as the verse says about the suffering servant of Isaiah 53: 'And by his wounds we were healed' (Isaiah 53:5). The famous person, by virtue of being famous, enters the aspect of 'Therefore I will divide him a portion with the many' (Isaiah 53:12) — meaning his life becomes intertwined with and responsible for the multitude. He suffers what the many should have suffered. However, there are certain people who specifically need to be famous and are made famous by Heaven. And there are tzaddikim who willingly accept suffering upon themselves for the sake of all Israel — through this they redirect and exchange the divine shefa (flow of blessing), turning harsh decrees into healing. This is connected to the teaching of Torah 63 on the seraphim covering their face: the same dynamic of concealment-and-revelation governs both the tzaddik's fame and his suffering.",
"T71: 'Kashe meod lihyot m'fursam.' Fame harms: famous must suffer for the many. Yesh 53:5 'u'vachavuraso nirpa lanu'; 53:12 'lachein achaleik barabim.' Some tzaddikim specifically need/accept fame + suffering → exchange shefa for Israel. Connected to T63 (seraphim/face-covering).",
"ת\"ע\"א: 'קָשֶׁה מְאֹד לִהְיוֹת מְפֻרְסָם.' פִּרְסוּם מַזִּיק: מְפֻרְסָמִים סוֹבְלִים עֲבוּר הָרַבִּים. יְשַׁ' נ\"ג:ה 'וּבַחֲבוּרָתוֹ נִרְפָּא לָנוּ'; נ\"ג:יב 'לָכֵן אֲחַלֶּק לוֹ בָרַבִּים.' יֵשׁ צַדִּיקִים הַמְקַבְּלִים יִסּוּרִים מֵרָצוֹן → מַחֲלִיפִים שֶׁפַע לְיִשְׂרָאֵל. קָשׁוּר לְת\"ס\"ג (שְׂרָפִים/כִּסּוּי פָּנִים).",
"יְשַׁ' נ\"ג:ה, יב; ת\"ס\"ג."
),
]

data = {
    "id": "pnc-1-71",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 71,
    "title": "T71 Petten Nanach Commentary - Kashe Meod Lihyot M'fursam (Difficulty of Fame, 1 seg)",
    "hebrewTitle": "קָשֶׁה מְאֹד לִהְיוֹת מְפֻרְסָם",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 1
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 1
print(f"Written: {out_path}")
print(f"Segments: 1, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
cdata['1']['71']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-71.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T71 (Difficulty of Fame/Suffering for Many, 1 seg)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T71")

t71_git = 'public/reader/' + pnc_name + '/torah-71.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t71_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T71 PNC -- Kashe meod lihyot m'fursam (fame/suffering for many, 1 seg)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
