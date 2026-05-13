import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-77.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Opening verse: 'And Hashem shall be King over all the earth' (Zechariah 14:9). The general principle underlying all of our service: everything we do — whether tefillah (prayer) or limmud (Torah study) — is for the purpose of revealing God's Malchus (Kingship). The 'hevel peh' (the breath/vapor of the mouth, the sound of speech) is the aspect of the letter Heh. The kol (voice/tone), through its extension and length, is the aspect of the letter Vav. When a person studies or prays with d'chilu (fear/reverence) and r'chimu (love/desire), the aspect of Yud-Heh is revealed within the speech (Tikkunei Zohar, Tikkun 10). When one studies halachah (Jewish law) in this manner, one creates an olam (world) with each halachah. When one completes an entire masechta (tractate of Talmud), one forms the Matronita — the Divine Feminine, the aspect of the Shechinah (Introduction to Tikkunei Zohar, 14). The individual halachot are the olamot (worlds) attached to the Matronita. The foundation: 'There is no king without a people' — every act of Torah and prayer creates the 'people' through whom Hashem's Malchus is revealed. Thus: 'And Hashem shall be King over all the earth' — this is the result of our combined Torah and tefillah.",
"T77: all tefillah/limmud = for revealing Malchus. Hevel peh = Heh; kol = Vav; d'chilu + r'chimu = Yud-Heh revealed (T\"Z Tikkun 10). Each halachah = olam. Completing masechta = Matronita (T\"Z intro 14). Halachot = olamot. 'Ein melech b'lo am.' Zech 14:9 = Malchus revealed through Torah/tefillah.",
"ת\"ז: כָּל תְּפִלָּה/לִמּוּד = לְגִלּוּי מַלְכוּת. הֶבֶל פֶּה = הֵ\"א; קוֹל = וָא\"ו; דְּחִילוּ + רְחִימוּ = יוּד-הֵ\"א נִגְלֶה (ת\"ז תִּקּוּן י'). כָּל הֲלָכָה = עוֹלָם. גְּמַר מַסֶּכֶת = מַטְרוֹנִיתָא (הַקְדָּמַת ת\"ז). הֲלָכוֹת = עוֹלָמוֹת. 'אֵין מֶלֶךְ בְּלֹא עָם.' זְכַ' י\"ד:ט = מַלְכוּת.",
"ת\"ז תִּקּוּן י'; הַקְדָּמַת ת\"ז; זְכַ' י\"ד:ט."
),
]

data = {
    "id": "pnc-1-77",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 77,
    "title": "T77 Petten Nanach Commentary - V'Haya Hashem l'Melech (Torah/Tefillah Reveals Malchus, 1 seg)",
    "hebrewTitle": "וְהָיָה ה' לְמֶלֶךְ — כָּל הַתּוֹרָה וְהַתְּפִלָּה לְגִלּוּי מַלְכוּת",
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
if '77' not in cdata['1']:
    cdata['1']['77'] = {}
cdata['1']['77']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-77.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T77 (Torah/Tefillah Reveals Malchus, 1 seg)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T77")

t77_git = 'public/reader/' + pnc_name + '/torah-77.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t77_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', "feat: T77 PNC -- V'Haya Hashem l'Melech/Torah-tefillah reveals Malchus (1 seg)"], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
