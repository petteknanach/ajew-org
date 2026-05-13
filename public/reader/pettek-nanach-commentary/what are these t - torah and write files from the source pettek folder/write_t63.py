import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-63.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Title: 'Sod Kavonas HaMila' — The Secret of the Kabbalistic Intention of Circumcision.",
"Title marker: 'Sod kavonas ha'mila.'",
"כֹּתֶרֶת: סוֹד כַּוָּנַת הַמִּילָה.",
"כֹּתֶרֶת בִּלְבַד."
),
seg(2,
"Opening verse: 'Seraphim stood above Him; each one had six wings: with two he covered his face, with two he covered his feet, and with two he flew' (Isaiah 6:2). This verse is the key to understanding the hidden kavana of the mila.",
"Frame verse: Yesh 6:2 — six wings of seraphim = hint to kavana of mila.",
"פָּסוּק מַנְחֶה: יְשַׁ' ו:ב — שֵׁשׁ כְּנָפַיִם לַשְּׂרָפִים = רֶמֶז לְכַוָּנַת הַמִּילָה.",
"יְשַׁ' ו:ב."
),
seg(3,
"This teaching unlocks the hidden meaning behind the act of circumcision by connecting it to the seraphim vision of Isaiah. The key insight: the word 'bris' (circumcision/covenant) is called in Aramaic (the language of Targum) 'amah' (cubit), as the Gemara uses this term (Shabbat 108b). Now, a standard cubit (amah) measures six handbreadths (tefachim), as per Eruvin 3b. The seraphim in Isaiah's vision each had six wings — corresponding to the six handbreadths of the amah. This is the foundation: the six wings of the seraphim encode the kavana (kabbalistic intention) of the bris, because both are structured around the number six. The three pairs of wings (two covering the face, two covering the feet, two for flying) map to three paired principles operating within the six tefachim of the covenant.",
"Sod kavanas ha'mila: bris = 'amah' in Targum language (Shab 108b). Amah = 6 tefachim (Eruvin 3b). Six wings of seraphim (Yesh 6:2) = six tefachim. Three pairs of wings = three paired principles of the bris/amah.",
"סוֹד כַּוָּנַת הַמִּילָה: בְּרִית = \"אַמָּה\" בִּלְשׁוֹן תַּרְגּוּם (שַׁבָּת ק\"ח:). אַמָּה = ו' טְפָחִים (עֵרוּבִין ג:). שֵׁשׁ כְּנָפַיִם שֶׁל שְׂרָפִים (יְשַׁ' ו:ב) = שִׁשָּׁה טְפָחִים. שְׁלשָׁה זוּגוֹת כְּנָפַיִם = שָׁלשׁ עֲקְרוֹנוֹת מְזוּוָּגִים.",
"שַׁבָּת ק\"ח:; עֵרוּבִין ג:; יְשַׁ' ו:ב."
),
seg(4,
"The seraphim verse (Isaiah 6:2) itself is repeated for emphasis at the start of this section. Rabbeinu will now analyze each pair of wings. Six wings are the aspect of the six handbreadths. 'With two he covered his face (panim)' — here Rabbeinu makes a subtle linguistic connection: the word for face ('panim') shares a root with the word for slapping ('tafach,' as in Bava Kamma 32b where someone slaps another on his face/cheek). This connects 'panim' to 'tefach' (handbreadth), making the two-winged covering of the face equal to two tefachim — expressing the principle of 'revealing a handbreadth and covering a handbreadth' (goleh tefach u'mechaseh tefach), the Talmudic phrase describing the proper measure of the bris.",
"Yesh 6:2 restated. 'Panim' (face) = root of 'tafach' (slap, Bava Kamma 32b) = 'tefach' (handbreadth). 'With two he covered his panim' = 2 tefachim = 'goleh tefach u'mechaseh tefach.'",
"יְשַׁ' ו:ב. \"פָּנִים\" = שׁוֹרֶשׁ \"טָפַח\" (בבא קמא ל\"ב:) = \"טֶפַח\". \"וּבִשְׁתַּיִם יְכַסֶּה פָנָיו\" = ב' טְפָחִים = \"גּוֹלֶה טֶפַח וּמְכַסֶּה טֶפַח.\"",
"יְשַׁ' ו:ב; בּ\"ק ל\"ב:; מִשְׁנַת שַׁבָּת (גּוֹלֶה טֶפַח)."
),
seg(5,
"Rabbeinu now analyzes all three pairs of wings in relation to the six handbreadths. The six wings together are the aspect of the six tefachim of the amah. The three pairs represent three distinct applications of the same principle of 'revealing one handbreadth and covering one handbreadth' (goleh tefach u'mechaseh tefach): (1) 'With two he covered his face (panim)' — two handbreadths, the aspect of revealing/concealing what faces you, the domain of direct encounter; (2) 'With two he covered his feet' — two handbreadths, the aspect of revealing/concealing what is below, the domain of grounding and the lower world; (3) 'With two he flew' — two handbreadths, the aspect of revealing/concealing in the upward direction, the domain of elevation and ascent. Each pair expresses the dialectic of simultaneous disclosure and concealment that is the inner structure of the bris/covenant.",
"Six wings = 6 tefachim of amah. Three pairs = three domains of 'goleh tefach u'mechaseh tefach': (1) 'covered panim' = 2 tefachim = domain of direct encounter; (2) 'covered feet' = 2 tefachim = domain below/grounding; (3) 'flew' = 2 tefachim = domain above/elevation. Each = revealing/concealing dialectic.",
"שֵׁשׁ כְּנָפַיִם = ו' טְפָחִים. שָׁלשׁ זוּגוֹת = שָׁלשׁ תְּחוּמִים שֶׁל \"גּוֹלֶה טֶפַח וּמְכַסֶּה טֶפַח\": (א) כִּסָּה פָּנִים = מוֹל הַנֶּגֶד; (ב) כִּסָּה רַגְלִים = מַה שֶּׁמַּטָּה; (ג) עָף = מַה שֶּׁמַּעְלָה. כָּל זוּג = דִּיאָלֶקְטִיקַת גִּלּוּי/כִּסּוּי.",
"יְשַׁ' ו:ב; עֵרוּבִין ג:; מִשְׁנַת שַׁבָּת."
),
seg(6,
"The tzaddik — who embodies the bris, as per the verse 'the righteous one is the foundation of the world' (Proverbs 10:25) — incorporates all three aspects of the six tefachim. The three pairs of wings apply to the tzaddik's relationship with three directions: (1) With his own self (panim — the two tefachim of his inner face/self): the tzaddik reveals a handbreadth and covers a handbreadth relative to himself — meaning he discloses some of his inner world while maintaining a hidden depth. (2) With those below him, his students and generation (feet): he reveals just enough to guide them while concealing what they are not yet ready to receive. (3) With what is above him (flying): he ascends to elevated spiritual realms while concealing these heights from those below. This is the tzaddik's art: he is neither fully revealed nor fully hidden, because full revelation would overwhelm, and full concealment would leave no connection.",
"Tzaddik = bris = 'tzaddik yesod olam' (Misl 10:25). Three applications: (1) 'covered panim' = goleh tefach u'mechaseh tefach l'atzmo (inner disclosure vs. concealment); (2) 'covered feet' = b'yachaso l'talmidim (what to reveal to students); (3) 'flew' = ascent to elyon realms. Each = goleh tefach u'mechaseh tefach.",
"הַצַּדִּיק = בְּרִית = \"צַדִּיק יְסוֹד עוֹלָם\" (מִשְׁלֵי י:כה). שָׁלשׁ יְחָסִים: (א) כִּסָּה פָּנִים = גּוֹלֶה טֶפַח וּמְכַסֶּה טֶפַח לְעַצְמוֹ; (ב) כִּסָּה רַגְלִים = בְּיַחֲסוֹ לְתַלְמִידָיו; (ג) עָף = עֲלִיָּה לִרְמָזִים עֶלְיוֹנִים.",
"מִשְׁלֵי י:כה; עֵרוּבִין ג:; יְשַׁ' ו:ב."
),
seg(7,
"Similarly, the same principle of revealing and concealing applies to the human being's relationship with God. When approaching Hashem, one must balance closeness and distance — drawing near while knowing one is still far. The Talmud (see Chagigah) teaches something profound: the one who enters the palace of the king and thinks he has already arrived has not truly arrived; but the one who runs to the king and in every step realizes he is still far — that person is truly drawing close. More precisely: the more one comes close to Hashem, the more one must know how far one is. The sign that a person knows nothing of God is precisely that they think they know, that they feel close. Because if a person truly knew even a little of Hashem's greatness, they would feel profoundly how far they are and how little they have attained. This is the dialectic encoded in the bris — the covenant always involves both revelation (goleh) and concealment (mechaseh), both approach and a simultaneous awareness of distance. This is the true kavana of the mila: the covenant creates a permanent dialectic of intimacy and infinite distance.",
"Similarly re: Hashem: closeness must be accompanied by knowing one is far. The more you come close to Hashem, the more you know you are far. Sign of knowing nothing = thinking you've arrived. Sign of true closeness = knowing how far you are. This = goleh tefach u'mechaseh tefach in relation to HKBH. This is the kavana of mila: permanent dialectic of intimacy and infinite distance.",
"כֵּן בַּיַּחַס לְהַשֵּׁם יִתְבָּרַךְ: הִתְקָרְבוּת חַיֶּיבֶת לְהִלָּווֹת בְּהַכָּרַת הָרִיחוּק. כָּל שֶׁמִּתְקָרֵב יוֹתֵר — יוֹדֵעַ יוֹתֵר שֶׁהוּא רָחוֹק. סִמַּן שֶׁאֵינוֹ יוֹדֵעַ כְּלוּם = חוֹשֵׁב שֶׁכְּבָר הִגִּיעַ. סִמַּן קִרְבָה אֲמִתִּית = יוֹדֵעַ כַּמָּה רָחוֹק הוּא. זֶה = כַּוָּנַת הַמִּילָה: דִּיאָלֶקְטִיקַת קִרְבָה וְרִיחוּק אֵין-סוֹפִיִּים.",
"יְשַׁ' ו:ב; מִשְׁלֵי י:כה; חֲגִיגָה."
),
]

data = {
    "id": "pnc-1-63",
    "book": "petter-nanach-commentary",
    "part": 1,
    "torah": 63,
    "title": "T63 Petten Nanach Commentary - Sod Kavonas HaMila (Secret of the Kavana of Circumcision, 7 segs)",
    "hebrewTitle": "סוד כוונת המילה — שש כנפיים לשרפים",
    "author": "Petten Nanach",
    "segments": segments
}

# fix book name to match actual dir
data["book"] = "petek-nanach-commentary".replace("petek", pnc_name.replace("-nanach-commentary",""))
# actually just hardcode from dynamic lookup
data["book"] = pnc_name

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# validate
with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 7
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 7
print(f"Written: {out_path}")
print(f"Segments: 7, avg beginner chars: {avg:.0f}")

# register
lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
cdata['1']['63']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-63.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T63 (Sod Kavonas HaMila, 7 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T63")

# git
t63_git = 'public/reader/' + pnc_name + '/torah-63.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t63_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T63 PNC -- Sod Kavonas HaMila (6 wings/6 tefachim/bris kavana, 7 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
