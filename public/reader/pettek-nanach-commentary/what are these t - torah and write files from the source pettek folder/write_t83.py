import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-83.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {"index": idx, "beginner": {"en": be, "he": ""}, "intermediate": {"en": bi_en, "he": bi_he}, "scholarly": {"en": "", "he": sc_he}}

segments = [
seg(1,
"Opening verse: 'A gift in secret subdues anger' (Proverbs 21:14). In the Hebrew alphabet, there are six letters that are all pronounced with a Peh (mouth/lip) sound: the letters Aleph, Kaf, Final Kaf, Peh, Final Peh, and Kuf — all of them require the lips to form a Peh-sound when articulated. Therefore, in the Aleph-Bet there are six Peh's. The letter Peh has a gematria (numerical value) of 80. Six times 80 equals 480, which is the gematria of the word 'Lilit.' When something spiritually impure happens to a person — God forbid — it is through the kelipah (spiritual husk) of Lilit. This kelipah draws its sustenance specifically from the Aleph-Bet, drawing from these six Peh-letters. From this is formed 'Pe Ka'as' — the mouth of anger. As the Talmud teaches (Sotah 17a): 'A man and a woman' — when they merit, the Divine Presence (Shechinah) dwells between them (as the letters of 'ish' and 'ishah' together spell yud-heh, the divine name); when they do not merit, fire consumes them. The secret of the 'gift in secret': giving a gift in hidden, humble ways subdues this anger of the six Peh's — it counters the kelipah by channeling the mouth-energy into giving rather than destroying.",
"Frame verse: Misl 21:14. Six Peh-letters in aleph-bet: Aleph, Kaf, Final Kaf, Peh, Final Peh, Kuf. Peh = 80; 6 x 80 = 480 = gematria of Lilit. Kelipah of Lilit draws from six Peh's. Forms 'Pe Ka'as' (mouth of anger). Sotah 17a: ish + ishah = yud-heh when merit. Gift in secret subdues anger = counters six Peh's/kelipah.",
"מִשְׁלֵי כ\"א:יד. שִׁשָּׁה פֵּאִין בְּאָלֶ\"ף בֵּי\"ת: אָלֶ\"ף, כָּ\"ף, כָּ\"ף סוֹפִית, פֵּ\"א, פֵּ\"א סוֹפִית, קּוּ\"ף. פֵּ\"א = 80; 6 x 80 = 480 = גִּימַטְרִיָּא לִילִי\"ת. קְלִיפָּה שֶׁל לִילִית שׁוֹאֶבֶת מֵהַשִּׁשָּׁה פֵּאִין. יוֹצֵר 'פֶּה כַּעַס.' סוֹטָה י\"ז:: אִישׁ + אִשָּׁה = יוּ\"ד-הֵ\"א. מַתָּן בַּסֵּתֶר = מְשַׁכֵּךְ כַּעַס = מְנַצֵּחַ קְלִיפָּה.",
"מִשְׁלֵי כ\"א:יד; סוֹטָה י\"ז:."
),
]

data = {"id": "pnc-1-83", "book": pnc_name, "part": 1, "torah": 83, "title": "T83 PNC - Mattan Baseser Yichpeh Af (Six Peh's/Lilit/Pe Ka'as, 1 seg)", "hebrewTitle": "מַתָּן בַּסֵּתֶר יִכְפֶּה אַף — שִׁשָּׁה פֵּאִין וּקְלִיפַּת לִילִית", "author": "Petten Nanach", "segments": segments}

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 1
print(f"Written: {out_path}, chars: {len(chk['segments'][0]['beginner']['en'])}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '83' not in cdata['1']:
    cdata['1']['83'] = {}
cdata['1']['83']['running_commentary'] = {"book": pnc_name, "slug": pnc_name, "status": "available", "url": f"/reader/{pnc_name}/torah-83.json", "layers": ["beginner", "intermediate", "scholarly"], "author": "Petten Nanach", "label": "Petten Nanach Running Commentary - T83 (Six Peh's/Lilit/Pe Ka'as, 1 seg)"}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)

t_git = 'public/reader/' + pnc_name + '/torah-83.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T83 PNC -- Mattan Baseser/six Peh's/Lilit/Pe Ka'as (1 seg)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:150])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:100], r3.stderr[:80])
