import os, json, subprocess

h = os.path.expanduser('~')
repo = os.path.join(h, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
pnc_dir = os.path.join(reader_dir, pnc_name)
out_path = os.path.join(pnc_dir, 'torah-64.json')

def seg(idx, be, bi_en, bi_he, sc_he):
    return {
        "index": idx,
        "beginner": {"en": be, "he": ""},
        "intermediate": {"en": bi_en, "he": bi_he},
        "scholarly": {"en": "", "he": sc_he}
    }

segments = [
seg(1,
"Title and opening verse: 'And Hashem said to Moses: Come to Pharaoh, for I have hardened his heart and the heart of his servants, that I may place these My signs in his midst, and that you may tell in the ears of your son and your son's son what I have done in Egypt' (Exodus 10:1-2). The subtitle adds: 'Enter the Realm of Impurity' — framing the entire teaching around Moses's mission to descend into Pharaoh's spiritual domain, which Rabbeinu will decode as the chalal panui (the primordial empty space).",
"Frame verse: Shemot 10:1-2 'Bo el Pharoh ki ani hikbad et libo.' Subtitle: 'kenas l'reshut ha'tumah.' Teaching arc: Moses = tzaddik descending into chalal panui = Pharaoh = to raise fallen souls.",
"פָּסוּק מַנְחֶה: שְׁמוֹת י:א-ב. כּוֹתֶרֶת: \"כְּנַס לִרְשׁוּת הַטֻּמְאָה.\" קֶשֶׁר: מֹשֶׁה = צַדִּיק יוֹרֵד לְחָלָל הַפָּנוּי = פַּרְעה = לְהַעֲלוֹת נְשָׁמוֹת שֶׁנָּפְלוּ.",
"שְׁמוֹת י:א-ב."
),
seg(2,
"The first foundational principle: God created the world out of His limitless mercy (rachamim — compassion), for He desired to reveal His mercy. If there were no creation, upon whom could He show it? So He created all existence, from the highest emanation (atzilut) down to the lowest physical point. But here a paradox arises: if God is infinite and fills all space, where was there room to create the world? The answer is the kabbalistic concept of tzimtzum (contraction): God contracted His infinite light to the sides, and through this contraction, an empty space (chalal panui — literally 'empty space' or 'vacant void') was formed. Within this chalal panui, He then created all existence — all the spiritual worlds, all creation — through speech. The chalal panui is thus both the precondition for creation and the medium in which it unfolds. It is the 'space' that makes finite existence possible within the infinite.",
"Creation from rachamim — Hashem desired to reveal His mercy (to whom?). Paradox: Ein Sof fills all — where to create? Resolution: tzimtzum — contracted light to sides → chalal panui formed. Within chalal panui: all creation = all worlds = created through speech. Chalal panui = precondition for finite existence within the infinite.",
"בְּרִיאַת הָעוֹלָם מֵרַחֲמָנוּת. פָּרָדוֹקְס: אֵין סוֹף מַמְלֵא הַכֹּל — אֵין מָקוֹם לִבְרִיאָה. פִּתְרוֹן: צִמְצוּם → חָלָל פָּנוּי. בְּתוֹך הֶחָלָל: כָּל הַבְּרִיאָה נוֹצְרֶת עַל יְדֵי דִּבּוּר.",
"עֵץ חַיִּים (שַׁעַר א); שְׁמוֹת י:א."
),
seg(3,
"There are two fundamentally different types of heresy (apikorsus). The first type comes from the external wisdoms — philosophy, science, secular knowledge. This apikorsus does have answers; that is why the Mishnah says (Avot 2): 'Know what to answer to a heretic.' This type of heresy originates from the breaking of the vessels (sheviras ha-keilim) — when the primordial vessels could not contain the abundance of divine light, they shattered, and from those scattered shards came the forces of impurity and the 'external wisdoms' that appear to contradict Torah. Since these wisdoms have their root in shattered holiness, they can be answered and reclaimed. The second type of apikorsus is far more profound and unanswerable: it comes from the chalal panui itself. In the chalal panui, there is silence (shtika) — no intellect, no language, no response. The questions and confusions born from this void cannot be resolved in this world. They are the questions of pure existence: how can there be an empty space from which God seemingly withdrew? How can anything exist in a place where Ein Sof 'isn't'? These are questions that transcend rational capacity.",
"Two types of apikorsus: (1) From external wisdoms (mosaros = sheviras hakeilim) — has answers (Avot 2 've-da ma she-tashiv l'apikoros'); (2) From chalal panui — no answer, aspect of shtika, unanswerable in this world. Root of type-2: the tzimtzum itself creates unanswerable questions about Ein Sof and emptiness.",
"שְׁנֵי מִינֵי אֶפִּיקוֹרְסוּת: (א) מֵחָכְמוֹת חִיצוֹנִיּוֹת (מוֹתָרוֹת = שְׁבִירַת הַכֵּלִים) — יֵשׁ תְּרוּץ (אָבוֹת ב); (ב) מֵחָלָל הַפָּנוּי — אֵין תְּרוּץ, בְּחִינַת שְׁתִיקָה.",
"אָבוֹת ב; שְׁבִירַת הַכֵּלִים (עֵץ חַיִּים); חָלָל הַפָּנוּי."
),
seg(4,
"Despite the fact that the apikorsus of the chalal panui is unanswerable, a great tzaddik who is in the aspect of Moses specifically must go into that void and examine those questions. He does not go there to answer them — that is impossible — but by going there he raises the many souls who have fallen and drowned in that unanswerable heresy. For those souls became entangled in the questions of the chalal panui and have no way out on their own. The confusions and doubts born from the chalal panui are the aspect of silence (shtika) — because in the chalal panui there is no intellect and no answer. The tzaddik who is in the aspect of Moses does not bring answers; he brings presence, melody, and spiritual power. He descends into the silence of the void and pulls the souls back up by virtue of who he is, not by virtue of what he says. This is the meaning of 'Come to Pharaoh' (Exodus 10:1) — God commands Moses to enter Pharaoh's domain (= the chalal panui) not to debate, but to rescue.",
"Great tzaddik (Moses-aspect) must enter chalal panui's apikorsus specifically — not to answer, but to raise neshamot that fell there. Confusions of chalal panui = shtika (no intellect, no teshuvah). Tzaddik raises via presence/nigun, not via answers. 'Bo el Pharoh' = enter chalal panui to rescue.",
"צַדִּיק גָּדוֹל (בְּחִינַת מֹשֶׁה) חַיָּב לְהִכָּנֵס לְחָלָל הַפָּנוּי — לֹא לְהָשִׁיב, אֶלָּא לְהַעֲלוֹת נְשָׁמוֹת שֶׁנָּפְלוּ שָׁם. בְּחִינַת שְׁתִיקָה = אֵין שֵׂכֶל, אֵין תְּרוּץ. \"בֹּא אֶל פַּרְעה\" = כְּנַס לְהַצִּיל.",
"שְׁמוֹת י:א; אָבוֹת א:יז."
),
seg(5,
"Now Rabbeinu reveals a deep connection: controversy (machloket) is the aspect of the creation of the world. Why? Because the main mechanism of creation was the chalal panui — the empty space formed by tzimtzum. Without that emptiness, everything would remain infinite and undifferentiated. Within the chalal panui, creation unfolded through days and attributes and speech — all of which involve distinction and difference. Controversy among the Torah sages mirrors this cosmic structure: the separation and disagreement among the sages is itself an aspect of the chalal panui, because their disagreements create a 'space' between them in which both positions can exist. The machloket in holiness (machloket l'shem shamayim) — the Talmudic debates between Tannaim and Amoraim — is not a defect but a feature of creation, just as the chalal panui is not absence but the precondition for presence. Through the sacred controversy of the sages, halachic distinctions emerge, paralleling how the days and attributes emerged from the void.",
"Machloket = bechinas bri'at ha'olam. Chalal panui = tzimtzum → created void where distinctions can exist. Within chalal panui: days/attributes/speech = machloket among scholars mirrors this structure. Machloket l'shem shamayim = sacred controversy = aspect of chalal panui = creates 'space' for both positions. From machloket → halachot emerge, as creation emerged from the void.",
"מַחֲלוֹקֶת = בְּחִינַת בְּרִיאַת הָעוֹלָם. חָלָל הַפָּנוּי = תְּנַאי הַבְּרִיאָה. מַחֲלוֹקֶת תַּנָּאִים וְאָמוֹרָאִים = מִרְאָה לַחָלָל הַפָּנוּי. מֵהַמַּחֲלוֹקֶת → הֲלָכוֹת, כְּשֵׁם שֶׁמֵּהֶחָלָל → הַבְּרִיאָה.",
"אָבוֹת א:יז; עֵץ חַיִּים (שַׁעַר א)."
),
seg(6,
"Rabbeinu now explains the famous Mishnah in Avot (1:17): 'All my days I grew up among the sages, and I found nothing better for the body than silence (shtika). And not study is the main thing but deed. And whoever multiplies words brings sin.' Each phrase now maps to the chalal panui. 'Among the sages' — the chalal panui was formed specifically among the sages through their sacred separations and controversies, as explained above. This is precisely 'among the sages' — the emptiness between them, the space of their machloket. 'Nothing better for the body than shtika (silence)' — because in the chalal panui there is no intellect and no answer; the only appropriate response to its questions is silence. 'Not study is the main thing but deed' — since study and speech cannot resolve the chalal panui's questions, what matters is the deed, the action of the tzaddik who enters the void and through his melody and presence raises the fallen souls. 'Whoever multiplies words brings sin' — in the domain of the chalal panui, multiplying words/arguments makes things worse, deepening the confusion.",
"Avot 1:17 decoded via chalal panui: 'Among the sages' = chalal panui formed by their machloket. 'Shtika = best for body' = because chalal panui has no intellect/response. 'Not study but deed' = tzaddik's action (going in/raising neshamot) > speech-based answers. 'Multiplies words → sin' = more argument in chalal panui deepens confusion.",
"אָבוֹת א:יז מְפֹרָשׁ עַל חָלָל הַפָּנוּי: \"בֵּין הַחֲכָמִים\" = חָלָל שֶׁנִּיצַּר בֵּינֵיהֶם עַל יְדֵי מַחֲלוֹקְתָם. \"שְׁתִיקָה\" = אֵין שֵׂכֶל בֶּחָלָל הַפָּנוּי. \"לֹא הַמִּדְרָשׁ הָעִיקָּר אֶלָּא הַמַּעֲשֶׂה\" = פְּעוּלַּת הַצַּדִּיק. \"הַמַּרְבֶּה דְּבָרִים מֵבִיא חֵטְא\" = הַרְבּוֹת דְּבָרִים בֶּחָלָל מַעֲמִיק הַבִּלְבּוּל.",
"אָבוֹת א:יז."
),
seg(7,
"How does the tzaddik actually raise the souls from the chalal panui? Through his melody (nigun). Every wisdom and knowledge in the world has a specific song and melody, and from that song, that wisdom is drawn. This is the meaning of Psalms 47:8: 'Sing to God, the wise one (zamru maskil)' — every intellect and wisdom has its own song and nigun. Even the apikorsus of the chalal panui has its own nigun — and through that nigun, the apikorsus sustains itself and draws the souls into it. The tzaddik who is in the aspect of Moses possesses the counter-melody — the holy nigun that overcomes the apikorsus-nigun, draws the souls out of the void, and raises them back to faith and wholeness. This is why music and melody play such a central role in Breslov practice: the nigun is not merely aesthetic — it is a rescue operation, extracting souls from the spiritual voids where rational argument cannot reach.",
"Tzaddik raises neshamot from chalal panui via nigun. Every wisdom = specific song from which it is drawn (Teh 47:8 'zamru maskil' = each intellect has its song). Apikorsus of chalal panui has its own nigun. Tzaddik (Moses-aspect) possesses counter-nigun = holy song that overcomes apikorsus-nigun and raises fallen souls.",
"הַצַּדִּיק מַעֲלֶה נְשָׁמוֹת מֵחָלָל הַפָּנוּי עַל יְדֵי נִגּוּן. כָּל חָכְמָה = נִגּוּן סְגוּלִי (תְּהִ' מז:ח \"זַמְּרוּ מַשְׂכִּיל\"). לָאֶפִּיקוֹרְסוּת שֶׁל חָלָל הַפָּנוּי יֵשׁ נִגּוּן — הַצַּדִּיק (בְּחִינַת מֹשֶׁה) מְנַגֵּן נֶגֶד-נִגּוּן שֶׁמְּגָרֵשׁ אֶת הָאֶפִּיקוֹרְסוּת וּמַעֲלֶה הַנְּשָׁמוֹת.",
"תְּהִ' מז:ח; שְׁמוֹת י:א."
),
seg(8,
"Now Rabbeinu decodes the opening verse directly: 'And Hashem said to Moses: Come to Pharaoh, for I have hardened his heart' (Exodus 10:1). Pharaoh (Paroh) is the aspect of the chalal panui, for two reasons: first, Paroh is related to the word for nullification (bitul), as in Exodus 5:4 where Pharaoh tells Moses and Aaron they are causing the people to neglect their work (tifre'u) — the root means to disturb/nullify — and the chalal panui is the nullified empty space. Second, Paroh is related to the word for revelation (hisgalut), from the root meaning to uncover — and the chalal panui is simultaneously the place of all revelation: it is precisely within the void that all creation, all attributes, all speech is revealed. Both meanings together: the chalal panui is the empty and nullified space in which everything is revealed. The 'hardening of the heart' (kaved lev) that God placed in Pharaoh also refers to the chalal panui, for within the void there is spiritual heaviness and no capacity for direct divine knowledge. Moses's mission — 'Come to Pharaoh' — is to enter this realm and retrieve the souls trapped there.",
"'Bo el Pharoh ki ani hikbad et libo' (Sh'mot 10:1) decoded: Paroh = chalal panui. Two etymologies: (1) leshon bitul (Sh'mot 5:4 'tifre'u') = nullified empty void; (2) leshon hisgalut = place of all revelation. Both = chalal panui = empty void where all creation is revealed. 'Kaved lev' in Pharaoh = spiritual heaviness of chalal panui. 'Bo el Pharoh' = Moses enters chalal panui to rescue neshamot.",
"\"בֹּא אֶל פַּרְעה כִּי אֲנִי הִכְבַּדְתִּי\" (שְׁמוֹת י:א). פַּרְעה = חָלָל הַפָּנוּי: (א) לְשׁוֹן בִּטּוּל (שְׁמוֹת ה:ד \"תִּפְרְעוּ\") = חָלָל הַמְבֻטָּל; (ב) לְשׁוֹן הִתְגַּלּוּת = מָקוֹם כָּל הַהִתְגַּלּוּת. \"כְּבַד לֵב\" בְּפַרְעה = כֹּבֶד רוּחַ שֶׁל חָלָל הַפָּנוּי. \"בֹּא אֶל פַּרְעה\" = מֹשֶׁה נִכְנָס לְהַצִּיל.",
"שְׁמוֹת י:א; ה:ד."
),
seg(9,
"In the future world, all those souls who struggled with the unanswerable questions of the chalal panui will finally attain understanding — they will understand how it is possible that within the chalal panui (which appears to be an empty space devoid of divinity) there is in truth divinity everywhere. The seeming absence and the actual infinite presence will be reconciled. This attainment of understanding that was impossible in this world is the primary form of receiving one's reward in the World to Come: not pleasure in a simple sense, but illumination — insight into the mysteries that were sealed. In this way, even the locusts plague (the final sign before the opening verse) connects: the chalal panui is like a locust whose skeleton (garm) remains after death — the outer form persists but the life force within seems absent. Yet even there, within the apparent emptiness and desolation, divine sparks are present. The souls raised by the tzaddik's melody from the void will receive their ultimate reward: comprehending the chalal panui's deepest secret.",
"In future: neshamot of chalal panui will finally comprehend the void — how divinity is present within the apparent emptiness. This = main reward of olam ha'ba = attaining understandings impossible in this world. Locusts (arbeh) = chalal panui = skeleton without vitality = yet sparks present. Souls raised by tzaddik's nigun → receive ultimate reward: understanding chalal panui's secret.",
"לֶעָתִיד לָבֹא: נְשָׁמוֹת חָלָל הַפָּנוּי יָבִינוּ כֵּיצַד קֻדְשָׁה נִמְצֵאת בְּתוֹך הַחָלָל — זֶה עִיקַּר שְׂכַר עוֹלָם הַבָּא = הַשָּׂגוֹת שֶׁנִּמְנְעוּ בָּעוֹלָם הַזֶּה. אַרְבֶּה = גֶּרֶם בְּלִי חִיּוּת = חָלָל הַפָּנוּי. הַנְּשָׁמוֹת שֶׁהוּעֲלוּ יְקַבְּלוּ שְׂכָרָן הַסּוֹפִי.",
"שְׁמוֹת י:א-ב; עֵץ חַיִּים (שַׁעַר א); אָבוֹת ב."
),
]

data = {
    "id": "pnc-1-64",
    "book": pnc_name,
    "part": 1,
    "torah": 64,
    "title": "T64 Petten Nanach Commentary - Bo el Pharoh (Come to Pharaoh / Enter the Chalal Panui, 9 segs)",
    "hebrewTitle": "בא אל פרעה — חלל הפנוי, אפיקורסות, ניגון, ומשה",
    "author": "Petten Nanach",
    "segments": segments
}

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(out_path, encoding='utf-8') as f:
    chk = json.load(f)
assert len(chk['segments']) == 9
avg = sum(len(s['beginner']['en']) for s in chk['segments']) / 9
print(f"Written: {out_path}")
print(f"Segments: 9, avg beginner chars: {avg:.0f}")

lm_path = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')
with open(lm_path, encoding='utf-8') as f:
    cdata = json.load(f)
cdata['1']['64']['running_commentary'] = {
    "book": pnc_name,
    "slug": pnc_name,
    "status": "available",
    "url": f"/reader/{pnc_name}/torah-64.json",
    "layers": ["beginner", "intermediate", "scholarly"],
    "author": "Petten Nanach",
    "label": "Petten Nanach Running Commentary - T64 (Bo el Pharoh - Chalal Panui, Apikorsus, Nigun, 9 segs)"
}
with open(lm_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print("lm-commentaries.json updated for T64")

t64_git = 'public/reader/' + pnc_name + '/torah-64.json'
subprocess.run(['git', 'add', 'src/data/lm-commentaries.json', t64_git], cwd=repo, check=True)
r2 = subprocess.run(['git', 'commit', '-m', 'feat: T64 PNC -- Bo el Pharoh (chalal panui/apikorsus/nigun/Moses, 9 segs)'], cwd=repo, capture_output=True, text=True)
print('commit:', r2.returncode, r2.stdout[:200])
r3 = subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, capture_output=True, text=True)
print('push:', r3.returncode, r3.stdout[:150], r3.stderr[:100])
