import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-82.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {"index": idx, "beginner": {"en": be, "he": ""}, "intermediate": {"en": bi_en, "he": bi_he}, "scholarly": {"en": "", "he": sc_he}}

segments = [
seg(1,
"The Talmud (Shabbat 88b) teaches: 'Those who are insulted and do not insult back, those who hear their own reproach and do not reply' — these are a special category of people who bear personal suffering without retaliation or response. They absorb insults in silence, without fighting back.",
"Shabbat 88b: those who are insulted and do not insult, hear reproach and do not reply. Special spiritual category: silent bearers of suffering.",
"שַׁבָּת פ\"ח:: 'הַנֶּעֱלָבִים וְאֵינָם עוֹלְבִים, שׁוֹמְעִים חֶרְפָּתָם וְאֵינָם מְשִׁיבִים.' קְבוּצָה רוּחָנִית מְיוּחֶדֶת: שׁוֹמְרֵי שֶׁקֶט בִּסְבַל.",
"שַׁבָּת פ\"ח:."
),
seg(2,
"About such people, the verse says: 'And His lovers like the going forth of the sun in its might' (Judges 5:31). There are three klipot (spiritual husks/shells) that Ezekiel saw in his vision (Ezekiel 1:4): ruach se'arah (stormy wind), anan gadol (great cloud), and aysh mislakachat (consuming fire). Between these three klipot and holiness stands Klipat Nogah (the luminous husk) — sometimes it falls toward the side of the klipot, and sometimes it is elevated toward the side of holiness. This Klipat Nogah is the aspect of 'nishmat ha'ashukim' — the souls of those who are oppressed (see Saba Mishpatim 113a). This corresponds to the order of creation: the three years of orlah (the forbidden fruit of a tree's first three years) correspond to the three klipot. The fourth year corresponds to Nogah, which is an aspect of chashmal (divine fiery brilliance, Ezekiel 1:4). Sometimes it is included among the lights of the circumcision (ma'al). This is the secret of milah (circumcision): the act of milah breaks through the three klipot and reaches the Nogah-light.",
"'His lovers like the going forth of the sun' (Judges 5:31). Three klipot: ruach se'arah, anan gadol, aysh mislakachat (Yech 1:4). Klipat Nogah = between three klipot and holiness = nishmat ha'ashukim (Saba Mishpatim 113a). Three years orlah = three klipot; 4th year = Nogah = chashmal. Secret of milah: breaks through klipot to Nogah-light.",
"שׁוֹפְ' ה:לא. שָׁלשׁ קְלִיפּוֹת: רוּחַ סְעָרָה, עָנָן גָּדוֹל, אֵשׁ מִתְלַקַּחַת (יְחֶז' א:ד). קְלִיפַּת נֹגַהּ = בֵּין שָׁלשׁ קְלִיפּוֹת לִקְדֻשָּׁה = נִשְׁמַת הָעֲשׁוּקִים (סַבָּא מִשְׁפָּטִים קי\"ג:). שָׁלשׁ שְׁנֵי עָרְלָה = שָׁלשׁ קְלִיפּוֹת; שָׁנָה ד' = נֹגַהּ = חַשְׁמַל. סוֹד הַמִּילָה.",
"יְחֶז' א:ד; שׁוֹפְ' ה:לא; סַבָּא מִשְׁפָּטִים קי\"ג:; שַׁבָּת פ\"ח:."
),
]

data = {"id": "pnc-1-82", "book": pnc_name, "part": 1, "torah": 82, "title": "T82 PNC - Silent Bearers/Klipot/Klipat Nogah/Milah (2 segs)", "hebrewTitle": "הַנֶּעֱלָבִים וְאֵינָם עוֹלְבִים — קְלִיפַּת נֹגַהּ וְסוֹד הַמִּילָה", "author": "Petten Nanach", "segments": segments}

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 2
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 2
print(f"Written: {out_path}, avg: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '82' not in cdata['1']:
    cdata['1']['82'] = {}
cdata['1']['82']['running_commentary'] = {"book": pnc_name, "slug": pnc_name, "status": "available", "url": f"/reader/{pnc_name}/torah-82.json", "layers": ["beginner", "intermediate", "scholarly"], "author": "Petten Nanach", "label": "Petten Nanach Running Commentary - T82 (Silent Bearers/Klipot/Milah, 2 segs)"}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)

t_git = 'public/reader/' + pnc_name + '/torah-82.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T82 PNC -- Silent bearers/Klipat Nogah/milah (2 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:150])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:100], r3.stderr[:80])
