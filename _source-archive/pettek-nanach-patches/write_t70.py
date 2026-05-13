import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-70.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Title: 'Vayehi BaYom HaShemini' — 'And it was on the eighth day, Moses called to Aaron and to his sons and to the elders of Israel' (Leviticus 9:1). Rabbeinu begins with a universal physical observation: all things exist on the earth. We see with our senses that everything grows from the earth; everything lives, walks, and rests upon the earth. The earth is the ground-level of existence — the base to which all material things belong.",
"Title: Vayikra 9:1 — 'on the eighth day, Moses called.' Framework: all things are on the earth — earth = base of existence, the natural resting place of all created things.",
"כֹּתֶרֶת: וַיְהִי בַּיּוֹם הַשְּׁמִינִי (וַיִּקְ' ט:א). כָּל הַדְּבָרִים עַל הָאָרֶץ — הָאָרֶץ = בָּסִיס הַקִּיּוּם, מָנוֹחַ טִבְעִי שֶׁל כָּל הַנִּבְרָאִים.",
"כֹּתֶרֶת בִּלְבַד; וַיִּקְ' ט:א."
),
seg(2,
"Nothing can be lifted off the earth except through a compelling force (koach ha'mekayem) that overcomes the earth's drawing force (koach hamosheich — what we would call gravity). The greater the compelling force, the higher and further the thing is lifted from the earth. But the moment the compelling force ceases — when the throw ends, when the carrier sets it down — the thing immediately returns to the earth, pulled back by the koach hamosheich. This is a fundamental law of physical existence: the earth draws everything back to itself, and only an active external force can overcome this pull. The instant that force ends, the return begins.",
"All separation from earth requires compelling force. Koach hamosheich (gravity) draws everything back. When compelling force ceases, thing returns to earth. Fundamental physical law: earth draws all back; only active force overcomes it.",
"הִתְרַחֲקוּת מֵהָאָרֶץ דּוֹרֶשֶׁת כֹּחַ מְכָרֵחַ. כֹּחַ הַמּוֹשֵׁךְ (כֹּבֶד) שׁוֹאֵב הַכֹּל חֲזָרָה. כְּשֶׁכֹּחַ הַמְּכָרֵחַ פּוֹסֵק — דָּבָר שָׁב לָאָרֶץ. חֹק יְסוֹדִי: אָרֶץ מוֹשֶׁכֶת הַכֹּל; רַק כֹּחַ פָּעִיל מִבְחוּץ מְנַצֵּחַ זֹאת.",
"עֵרוּבִין ג:; פִיזִיקַה יְסוֹדִית."
),
seg(3,
"This physical principle becomes a parable for the spiritual journey to the tzaddik. When a person travels to the tzaddik, the closer he draws to the tzaddik's location, the more cheshek (intense desire and longing) he feels — because he is drawing closer to the tzaddik's own spiritual 'koach hamosheich,' the drawing force of holiness that the tzaddik radiates. The tzaddik's very presence is a spiritual gravity — a force that draws souls upward toward the Divine. This drawing force is the aspect of the Mishkan (the Tabernacle), which had a koach hamosheich to draw the Divine Presence (the Shechinah) to the place where it stood. As the verse says, 'Draw me after You, and we will run' (Song of Songs 1:4) — 'after You, we will run' specifically, meaning the running only begins after the initial drawing.",
"Journey to tzaddik: closer you get = more cheshek. Tzaddik has koach hamosheich (spiritual gravity) = aspect of Mishkan. Mishkan's koach = drawing Shechinah. Shir 1:4 'moshcheni acharecha narutzah' = draw then run.",
"מַסָּע לַצַּדִּיק: כָּל שֶׁמִּתְקָרֵב = יוֹתֵר חֵשֶׁק. לַצַּדִּיק כֹּחַ מוֹשֵׁךְ רוּחָנִי = בְּחִינַת מִשְׁכָּן. כֹּחַ הַמִּשְׁכָּן = מְשִׁיכַת הַשְּׁכִינָה. שִׁיר א:ד 'מָשְׁכֵנִי אַחֲרֶיךָ נָרוּצָה' = מְשִׁיכָה קוֹדֶמֶת לָרִיצָה.",
"שִׁיר א:ד."
),
seg(4,
"This is why Moses called Aaron, his sons, and the elders of Israel specifically on the eighth day — by erecting the Mishkan. When the tzaddik needs to call the heads of the people and gather them, he does it not by a direct summons but by erecting the Mishkan — by creating and revealing the place of kavod (glory and Divine honor). The kavod is the drawing force: all the people come to the tzaddik to receive kavod from him. Moses erected the Mishkan on the eighth day, and by this act he called everyone — from the greatest to the smallest — because the spiritual gravity of the Mishkan drew them all. The practical teaching: the tzaddik does not coerce; he attracts. He builds the space of Divine presence, and souls come running on their own.",
"Moses called on eighth day BY erecting the Mishkan. Tzaddik calls people not by summons but by erecting the Mishkan = place of kavod. All come to tzaddik to receive kavod. Tzaddik attracts, does not coerce. Spiritual gravity of Mishkan draws all.",
"מֹשֶׁה קָרָא בַּיּוֹם הַשְּׁמִינִי עַל יְדֵי הֲקָמַת הַמִּשְׁכָּן. צַדִּיק קוֹרֵא לֹא בְּכֹחַ אֶלָּא בַּהֲקָמַת מְקוֹם הַכָּבוֹד. כֹּל בָּאִים לְקַבֵּל כָּבוֹד. צַדִּיק מוֹשֵׁךְ, אֵינוֹ כּוֹפֶה. כֹּחַ הַמִּשְׁכָּן מוֹשֵׁךְ אֶת כּוּלָּם.",
"וַיִּקְ' ט:א; שִׁיר א:ד."
),
]

data = {
    "id": "pnc-1-70",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 70,
    "title": "T70 Petten Nanach Commentary - Vayehi BaYom HaShemini (Gravity/Mishkan/Tzaddik Drawing Force, 4 segs)",
    "hebrewTitle": "וַיְהִי בַּיּוֹם הַשְּׁמִינִי — כֹּחַ הַמּוֹשֵׁךְ שֶׁל הַצַּדִּיק",
    "author": "Petten Nanach",
    "segments": segments
}

data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 4
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 4
print(f"Written: {out_path}")
print(f"Segments: 4, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
cdata['1']['70']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-70.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T70 (Gravity/Mishkan/Tzaddik Drawing Force, 4 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T70")

t70_git = 'public/reader/' + pnc_name + '/torah-70.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t70_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T70 PNC -- Vayehi BaYom HaShemini/gravity-Mishkan-tzaddik drawing force (4 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
