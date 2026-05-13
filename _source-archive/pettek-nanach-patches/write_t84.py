import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-84.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {"index": idx, "beginner": {"en": be, "he": ""}, "intermediate": {"en": bi_en, "he": bi_he}, "scholarly": {"en": "", "he": sc_he}}

segments = [
seg(1,
"Opening from the Talmud (Megillah 28a): 'In what did you prolong your days?' He answered: 'I was yielding in my money' — meaning he was flexible and generous with his finances, not insisting on his full due. To understand why this prolonged his life, Rabbeinu brings the Zohar (Parashat Naso, 123a): Each of the six days of creation has a specific spiritual configuration (partzuf) that governs it, and every day contains hidden good — but each day also has its boundary from outside, preventing ordinary people from entering into that hidden good. The boundary is like darkness that covers the light. When a guilty person tries to penetrate the secrets of Torah, 'how many snakes and scorpions confuse his mind so that he cannot enter a place that is not his.' But when a genuinely good person approaches, all the spiritual guardians say to him: 'The accuser becomes a defender' — and they elevate him to that hidden good, announcing: 'Our Master, behold, a good and righteous man who fears Heaven seeks to enter before You.' The one who is yielding in his money — who does not insist on strict din (judgment) in financial matters — is elevated because his trait of yielding reflects the same principle: turning strict judgment into mercy, allowing access to the hidden good of each day.",
"Megillah 28a: yielding in money = prolonged days. Zohar Naso 123a: six days each has partzuf; each day has hidden good + outer boundary. Guilty person = snakes/scorpions block him. Good person = guardians 'accuser becomes defender' → elevated to hidden good. Yielding in money = turning din to rachamim = access to hidden good.",
"מְגִלָּה כ\"ח:: וְתֵרַן בְּמָמוֹן = הֶאֱרִיךְ יָמִים. ז\"ח נָשׂוֹא קכ\"ג:: כָּל יוֹם = פַּרְצוּף + טוֹב נִסְתָּר + גְּבוּל חִיצוֹן. חַיָּב = נְחָשִׁים/עַקְרַבִּים חוֹסְמִים. צַדִּיק = שׁוֹמְרִים 'קַטֵּיגוֹר נַעֲשֶׂה סַנֵּגוֹר' → עֲלִיָּה לְטוֹב הַנִּסְתָּר. וְתֵרַן בְּמָמוֹן = הַפְיַכַּת דִּין לְרַחֲמִים.",
"מְגִלָּה כ\"ח:; ז\"ח נָשׂוֹא קכ\"ג:."
),
]

data = {"id": "pnc-1-84", "book": pnc_name, "part": 1, "torah": 84, "title": "T84 PNC - Yielding in Money Prolongs Days (Din to Rachamim/Hidden Good, 1 seg)", "hebrewTitle": "וְתֵרָן בְּמָמוֹנוֹ — הַפְּיַכַּת דִּין לְרַחֲמִים", "author": "Petten Nanach", "segments": segments}

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 1
print(f"Written: {out_path}, chars: {len(chk['segments'][0]['beginner']['en'])}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
if '84' not in cdata['1']:
    cdata['1']['84'] = {}
cdata['1']['84']['running_commentary'] = {"book": pnc_name, "slug": pnc_name, "status": "available", "url": f"/reader/{pnc_name}/torah-84.json", "layers": ["beginner", "intermediate", "scholarly"], "author": "Petten Nanach", "label": "Petten Nanach Running Commentary - T84 (Yielding in Money/Din to Rachamim, 1 seg)"}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)

t_git = 'public/reader/' + pnc_name + '/torah-84.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T84 PNC -- Yielding in money/din to rachamim/hidden good (1 seg)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:150])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:100], r3.stderr[:80])
