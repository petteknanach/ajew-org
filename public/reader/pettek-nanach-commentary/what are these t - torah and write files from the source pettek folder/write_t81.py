import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-81.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {"index": idx, "beginner": {"en": be, "he": ""}, "intermediate": {"en": bi_en, "he": bi_he}, "scholarly": {"en": "", "he": sc_he}}

segments = [
seg(1,
"Opening verse: 'Go up this way in the south and go up the mountain' (Numbers 13:17). Rashi explains the phrase with reference to 'waste of the Land of Israel' — which is the key to the teaching. The speeches of a tzaddik — when he speaks in Torah or in prayer — are called 'the Land of Israel.' The reason: 'land' is the aspect of nefesh (soul), as the verse says: 'My soul is like the land' (Psalms 143:6). And the soul corresponds to the aspect of speech, as the verse says: 'My soul went out when he spoke' (Song of Songs 5:6). When the tzaddik speaks words of Torah or prayer, this is called 'the Land of Israel' — the holiest of speech. However, the ordinary weekday conversations the tzaddik has with the multitude of people are called 'the waste of the Land of Israel' — not truly wasted, but the lower-level speech. Why does the tzaddik speak in such ordinary weekday conversation? It is in order to bind the masses to da'at (divine knowledge), which corresponds to the aspect of the 'mountain' in the verse. For the Talmud teaches there is 'no mountain to Lebanon' — meaning that without these ordinary conversations with the masses, there is no access to the higher mountain of da'at.",
"Frame verse: Bamidbar 13:17. Tzaddik's Torah/tefillah speech = 'Land of Israel.' Land = nefesh (Teh 143:6); nefesh = speech (Shir 5:6). Weekday conversations with masses = 'waste of Land of Israel.' Purpose: to bind masses to da'at = aspect of 'mountain.' Gemara: 'no mountain to Lebanon' without this.",
"פָּסוּק: בְּמִד' י\"ג:יז. דִּבְרֵי תּוֹרָה/תְּפִלָּה שֶׁל צַדִּיק = 'אֶרֶץ יִשְׂרָאֵל.' אֶרֶץ = נֶפֶשׁ (תה' קמ\"ג:ו); נֶפֶשׁ = דִּבּוּר (שִׁיר ה:ו). שִׂיחָה שֶׁל חֹל עִם הָמוֹן = 'חָרְבַּן אֶרֶץ יִשְׂרָאֵל.' מַטָּרָה: לִקְשֹׁר הֲמוֹן לְדַעַת = בְּחִינַת הָהָר.",
"תה' קמ\"ג:ו; שִׁיר ה:ו; בְּמִד' י\"ג:יז."
),
]

data = {"id": "pnc-1-81", "book": pnc_name, "part": 1, "torah": 81, "title": "T81 PNC - Aleh Zeh BaNegev (Tzaddik's Speech/Land of Israel/Da'at, 1 seg)", "hebrewTitle": "עֲלֵה זֶה בַּנֶּגֶב — דִּבְרֵי הַצַּדִּיק כְּאֶרֶץ יִשְׂרָאֵל", "author": "Petten Nanach", "segments": segments}

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 1
print(f"Written: {out_path}, avg beginner: {len(chk['segments'][0]['beginner']['en'])}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '81' not in cdata['1']:
    cdata['1']['81'] = {}
cdata['1']['81']['running_commentary'] = {"book": pnc_name, "slug": pnc_name, "status": "available", "url": f"/reader/{pnc_name}/torah-81.json", "layers": ["beginner", "intermediate", "scholarly"], "author": "Petten Nanach", "label": "Petten Nanach Running Commentary - T81 (Tzaddik's Speech/Land of Israel, 1 seg)"}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)

t_git = 'public/reader/' + pnc_name + '/torah-81.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T81 PNC -- Aleh Zeh BaNegev/tzaddik's speech/Land of Israel (1 seg)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:150])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:100], r3.stderr[:80])
