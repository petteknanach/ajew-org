import json, os, subprocess

home = os.path.expanduser('~')
repo = os.path.join(home, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
lm_comm = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')

with open(lm_comm, encoding='utf-8') as fh:
    cdata = json.load(fh)

torahs = {
186: {
 "title_en": "Faith in the Tzaddik Reveals Wonders",
 "title_he": "אמונה בצדיק מגלה נפלאות",
 "segs": [
  {
   "beginner": {
    "en": "The wonders people tell about tzaddikim in nearby lands arise because the local people are sincere and believe in the tzaddik's words. Faith is not passive — it is the very mechanism that opens reality to miracles. A true tzaddik is genuinely supernatural, able to transcend nature itself. But the key that unlocks this power is the disciple's pure, unquestioning belief. When that faith is wholehearted, the tzaddik's blessing lands with full force.",
    "he": ""
   },
   "intermediate": {
    "en": "T186: Wonders of tzaddikim in nearby regions reflect the faith (emunah) of their communities. The true tzaddik (tzaddik amiti) indeed transcends nature (teva) — but the channel is opened by genuine belief. LM 186: where people are upright and believe in the tzaddik, miracles are revealed.",
    "he": "צדיק אמיתי עצמו מעל הטבע. אך הנסים נגלים על פי כוח האמונה של התלמידים. המאמין בלב שלם פותח את הצינור."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קפ״ו — אמונה בצדיק גורמת גילוי נפלאות; צדיק אמיתי למעלה מן הטבע."
   }
  }
 ]
},
187: {
 "title_en": "Hashem Pays Measure for Measure — a Great Kindness",
 "title_he": "הקב\"ה מודד מידה כנגד מידה — חסד גדול",
 "segs": [
  {
   "beginner": {
    "en": "\"And to You Hashem is the kindness, for You pay a man according to his deed\" (Psalms 62). Rebbe Nachman sees a great kindness hidden in this: the fact that Hashem repays us measure for measure is itself merciful. It means our deeds actually matter — they shape our destiny. If outcomes were random, nothing we did would count. But because Hashem tracks everything precisely and responds in kind, we can trust that effort, prayer, and good deeds genuinely change our lives.",
    "he": ""
   },
   "intermediate": {
    "en": "T187: \"And to You Hashem is the kindness, for You pay a man according to his deed\" (Psalms 62:13). The measure-for-measure (midah k'neged midah) principle itself is a supreme kindness — it guarantees that our actions have real weight and consequence. LM 187.",
    "he": "מידה כנגד מידה היא עצמה חסד עצום — שמעשינו קובעים גורלנו. אלמלא כן, תפילה ומצוות לא ישפיעו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קפ״ז — \"ולך ה׳ חסד כי אתה תשלם לאיש כמעשהו\" (תהלים סב:יג); עיקר החסד הוא שמידה כנגד מידה."
   }
  }
 ]
},
188: {
 "title_en": "Travel to the Tzaddik to Recover Your Spiritual Loss",
 "title_he": "נסיעה לצדיק לחפש את האבֵדה",
 "segs": [
  {
   "beginner": {
    "en": "Before we are born, we are shown everything we need to accomplish in this life — our mission, our purpose, our spiritual goals. Then we forget it all the moment we enter the world. This forgotten knowledge is our \"loss\" (avedah). The tzaddik is the one person who can help us recover what we've forgotten — by traveling to him, sitting in his presence, listening to his Torah, something in us stirs and remembers. The journey to the tzaddik is not optional; it is the search for the self.",
    "he": ""
   },
   "intermediate": {
    "en": "T188: Before birth, the soul is taught all it must accomplish. On entering the world, this is forgotten — one's task becomes an avedah (lost object). The tzaddik holds the map; traveling to him (nesiah el ha-tzaddik) is the only way to recover the soul's original mission. LM 188.",
    "he": "קודם לידה מלמדים את הנשמה כל שצריכה לפעול. בבואה לעולם — שוכחת. הצדיק מסייע להשיב את האבדה — הייעוד הנשמתי."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קפ״ח — נסיעה לצדיק לחפש אבידת הנשמה שנשכחה; \"קודם שיצא לאויר העולם מלמדים ומראים לו כל מה שצריך לפעול\"."
   }
  }
 ]
},
189: {
 "title_en": "Beware of Sadness and Laziness — the Serpent's Bite",
 "title_he": "הישמר מעצבות ועצלות — עקיצת הנחש",
 "segs": [
  {
   "beginner": {
    "en": "The primary weapon the evil serpent uses against us is sadness and laziness. These two traits are the spiritual \"bite\" that paralyzes us and keeps us from serving Hashem. \"Dust shall be the serpent's food\" — the serpent feeds on the dusty, sunken energy of those who are sad and lazy. The antidote is to push past these states relentlessly — with joy, with movement, with action. Sadness makes holiness impossible; laziness makes avodah impossible. Guard against both as you would guard against a venomous snake.",
    "he": ""
   },
   "intermediate": {
    "en": "T189: The serpent's primary bite (nekivat hanachash) is sadness (atzvut) and laziness (atzlut). \"Dust shall be the serpent's food\" (Isaiah 65:25) — it feeds on the dulled, sunken spirit. Vigilance (hishtamrut) against these states is a prerequisite for any avodah. LM 189.",
    "he": "עיקר נשיכת הנחש היא עצבות ועצלות. \"ועפר לחם הנחש\" — הנחש ניזון מנפש השקועה בעפר. שמור עצמך משניהם."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קפ״ט — עצבות ועצלות הם עיקר עקיצת הנחש; ישעיה סה:כה \"ועפר לחם הנחש\"."
   }
  }
 ]
},
190: {
 "title_en": "Moses Returns the Words of the People to Hashem",
 "title_he": "משה מחזיר דברי העם אל ה׳",
 "segs": [
  {
   "beginner": {
    "en": "\"And Moses returned the words of the people to Hashem\" (Exodus 19:8). The tzaddik is the great mediator. When the people respond — \"all that Hashem has spoken we will do\" — Moses takes their words back up to heaven. This is the tzaddik's essential role: he collects the prayers, the yearnings, the commitments of the people and carries them upward. But he does more — when Hashem speaks from the thick cloud, His voice reaches the people through the tzaddik. The channel flows in both directions.",
    "he": ""
   },
   "intermediate": {
    "en": "T190: \"And Moses returned the words of the people to Hashem\" (Exodus 19:8). The tzaddik mediates both ways — carrying the people's response heavenward and channeling the divine voice downward (through the cloud). This bi-directional tzaddik-channel is the architecture of revelation. LM 190.",
    "he": "משה מחזיר דברי העם לה׳ — הצדיק הוא ערוץ דו-כיווני: מעלה תפילות העם ומוריד קול אלוקי."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ׳ — שמות יט:ח-ט; צדיק כמתווך דו-כיווני בין ישראל לאביהם שבשמים."
   }
  }
 ]
},
191: {
 "title_en": "Two Souls Sit Side by Side in Gan Eden — Yet Experience Differently",
 "title_he": "שני אנשים יושבים זה ליד זה בגן עדן ורואים שונה",
 "segs": [
  {
   "beginner": {
    "en": "Two people can sit in the exact same spot in Gan Eden, but one experiences boundless pleasure while the other experiences very little — or even nothing. This is because Gan Eden is not a physical location but a state of spiritual perception. What you can taste depends entirely on what you cultivated in this world. The person who worked hard on themselves, who developed sensitivity to holiness, will experience immeasurable delight in that same space where another barely feels a thing. What we build now determines what we inherit forever.",
    "he": ""
   },
   "intermediate": {
    "en": "T191: Two souls can occupy the same locus in Gan Eden yet experience entirely different levels of pleasure — because Gan Eden is a state of spiritual perception, not a physical place. Preparation in this world (avodah) calibrates the receiver. LM 191.",
    "he": "שני אנשים יושבים באותו מקום בגן עדן — אחד חווה עונג אין סוף, השני כמעט כלום. גן עדן הוא מדרגת תפיסה רוחנית, לא מקום פיזי."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״א — שני אנשים יושבים זה ליד זה בגן עדן; מי שזכה חווה עונגים מרובים, ומי שלא זכה אינו חש כלום."
   }
  }
 ]
},
192: {
 "title_en": "The True Tzaddik's Ordinary Speech Surpasses Another's Torah",
 "title_he": "דיבורי עולם של הצדיק האמיתי עולים על דברי תורה של אחר",
 "segs": [
  {
   "beginner": {
    "en": "When the true tzaddik speaks about everyday matters — business, weather, mundane conversation — his words contain more holiness than the Torah teachings of an ordinary tzaddik. This is because the true tzaddik's speech is pure, unmixed with any hidden self-interest or spiritual impurity. Even an ordinary tzaddik's Torah words may contain subtle mixtures (ta'arovot) — fragments of ego or klipah woven in. But the true tzaddik's very speech, even on worldly matters, flows entirely from a pure source. Every word he utters is Torah.",
    "he": ""
   },
   "intermediate": {
    "en": "T192: The speech of the tzaddik amiti (true tzaddik) even on mundane matters is more precious than Torah from an ordinary tzaddik, because it is free of ta'arovot (mixtures of impurity or ego). The tzaddik's mouth is a pure vessel — all speech becomes Torah. LM 192.",
    "he": "דיבורי עולם של הצדיק האמיתי יקרים מדברי תורה של צדיק רגיל, כי חסרים בהם תערובות. פיו של הצדיק האמיתי — כולו תורה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ב — \"דיבור של אמת היוצא מפי הצדיק האמיתי... יקר יותר מדברי תורה שיאמר צדיק אחר\" (כי בזה יש תערובות)."
   }
  }
 ]
},
193: {
 "title_en": "Thought Has Tremendous Creative Power",
 "title_he": "למחשבה יש כוח יצירתי עצום",
 "segs": [
  {
   "beginner": {
    "en": "The human mind has immense power — more than we realize. If you focus your thought intensely and persistently on any goal, you can bring it into existence. Even accumulating wealth is possible through the power of concentrated thought. The mind is not passive; it shapes reality. This is why we must be extremely careful with our thoughts. Focused thought directed toward holiness draws down blessing and revelation. Thought pointed toward desire or worry creates and magnifies those very realities. Guard and direct your mind with great intentionality.",
    "he": ""
   },
   "intermediate": {
    "en": "T193: Machshavah (thought) has enormous creative power — even material outcomes like wealth can be drawn down through focused intention. This cuts both ways: directed toward kedushah, thought elevates; directed toward ta'avah, it amplifies. LM 193.",
    "he": "למחשבה כוח יצירתי רב. אף עשירות ניתן להשיג על ידי כוח המחשבה הממוקדת. לכן יש לשמור המחשבה ולכוונה לקדושה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ג — \"למחשבה כוח גדול מאד... ואם יחזק ויגדל מחשבתו לאיזה דבר בעולם יוכל להביאו אל הפועל\"."
   }
  }
 ]
},
194: {
 "title_en": "One Who Desires Honor Is a Fool",
 "title_he": "המחזר אחרי הכבוד הוא שוטה",
 "segs": [
  {
   "beginner": {
    "en": "Rebbe Nachman gives a sharp parable: a great prince sends his servant to a distant town. The townspeople, not knowing the servant is just a messenger, bow and honor him. The servant becomes proud and delighted, not realizing they are really honoring the prince behind him. Anyone who chases after honor is exactly like that foolish servant — they are receiving honor that belongs entirely to Hashem and mistaking it for their own. The wise person sees through this and is embarrassed to accept honor, knowing it belongs to the Source.",
    "he": ""
   },
   "intermediate": {
    "en": "T194: Seeking honor (kavod) is foolishness — illustrated by the parable of the officer in a distant town who claims honor that really belongs to the prince who sent him. All kavod ultimately belongs to Hashem; to claim it is confusion of levels. LM 194.",
    "he": "המחזר אחר הכבוד הוא שוטה — משל: שר שנשלח לעיר רחוקה וטועים לחלוק לו כבוד שהוא של הנסיך. כל כבוד שייך לבורא."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ד — \"כל הרוצה בכבוד הוא שוטה\"; משל השר בעיר הרחוקה — כבוד שייך לנסיך (לה׳) לא לשליח."
   }
  }
 ]
},
195: {
 "title_en": "In Distress You Broadened for Me",
 "title_he": "בצר הרחבת לי",
 "segs": [
  {
   "beginner": {
    "en": "\"In distress You broadened for me\" (Psalms 4:2). Even inside our hardship, Hashem provides expansion. This is one of the deepest truths of Breslov: tzarah (distress) is not simply punishment — it contains within itself an opening, a broadening, a harchavah. When someone is in trouble, they are forced to turn to Hashem with more intensity than they ever would in comfort. That turning is itself the expansion. If we could see clearly in times of difficulty, we would recognize that our hardest moments are also our most spiritually opened ones.",
    "he": ""
   },
   "intermediate": {
    "en": "T195: \"Ba-tzar hirchavta li\" (Psalms 4:2) — even within tzarah (distress) Hashem provides harchavah (expansion/relief). Distress intensifies prayer and creates a channel for closeness (devekus) unavailable in comfort. LM 195.",
    "he": "\"בצר הרחבת לי\" (תהלים ד:ב) — אפילו בתוך הצרה עצמה ה׳ מרחיב. הצרה מכריחה פנייה לה׳ בעוצמה — וזו עצמה ההרחבה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ה — תהלים ד:ב \"בצר הרחבת לי\"; בתוך הצרה עצמה יש הרחבה מה׳."
   }
  }
 ]
},
196: {
 "title_en": "Do Not Make Your Prayer Fixed — Pray with Mercy and Supplication",
 "title_he": "אל תעש תפילתך קבע אלא רחמים ותחנונים",
 "segs": [
  {
   "beginner": {
    "en": "\"Do not make your prayer fixed, but mercy and supplications\" (Avot 2:13). It is forbidden to demand from Hashem — to insist that He must grant what you want. Prayer must be approached as a beggar approaches a king: with complete vulnerability, with mercy-seeking, not with demands. The moment prayer becomes a fixed formula or a contract with expectations, it loses its essential quality. True prayer is always fresh, always from a place of genuine need and trust, never from entitlement. You ask, but the King decides — and that relationship is itself the prayer.",
    "he": ""
   },
   "intermediate": {
    "en": "T196: \"Al taaseh tefillatecha keva\" (Avot 2:13) — prayer must not be demand-based (kivyachol obligating Hashem) but merciful supplication (rachamim v'tachanunin). The petitioner is a pauper before the King; demanding is a categorical error. LM 196.",
    "he": "אסור לאדם לתבוע מה׳ בתפילה. תפילה צריכה להיות כעני המבקש רחמים, לא כמי שדורש חוב. \"אל תעש תפילתך קבע\" (אבות ב:יג)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ו — אבות ב:יג \"אל תעש תפילתך קבע אלא רחמים ותחנונים\"; אסור לדרוש מה׳ בתפילה."
   }
  }
 ]
},
197: {
 "title_en": "Evil Speech Wounds Humility and Separates It from Wisdom",
 "title_he": "לשון הרע פוגע בענווה ומפריד אותה מהחכמה",
 "segs": [
  {
   "beginner": {
    "en": "Evil speech (lashon hara) does a very specific kind of damage: it destroys the possibility of true humility. When people speak badly about tzaddikim, it becomes impossible for those tzaddikim to maintain genuine anivut (humility), because humility requires being able to move through the world without the weight of the public gaze. Lashon hara disrupts the bond between humility and wisdom — these two must travel together, but evil speech severs their connection. A world saturated with lashon hara is a world where wisdom cannot easily dwell.",
    "he": ""
   },
   "intermediate": {
    "en": "T197: Lashon hara (evil speech) specifically damages anavah (humility) by separating it from chochmah (wisdom). These two attributes must travel together — anivut enables chochmah to rest. When the world speaks evil of tzaddikim, their ability to carry humility-wisdom is compromised. LM 197.",
    "he": "לשון הרע פוגע בענווה — מפריד אותה מן החכמה. ענווה וחכמה חייבים ללכת יחד; לשון הרע מנתק את הקשר."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ז — לשון הרע מזיק לענווה ומפריד אותה מן החכמה; \"לשון רע של עולם\" פוגע בצדיקים."
   }
  }
 ]
},
198: {
 "title_en": "When You Cry Out to Hashem — Travel",
 "title_he": "כשצועקים לה׳ — נסעו",
 "segs": [
  {
   "beginner": {
    "en": "When Bnei Yisrael were trapped at the sea, crying out to Hashem, He told Moses: \"Why do you cry out to Me? Speak to the children of Israel and let them travel\" (Exodus 14:15). Rebbe Nachman draws out a principle: sometimes when we cry out to Hashem, the answer is movement — travel, action, going forward. The sea split only after they stepped in. Prayer is essential, but there is a moment when Hashem's answer is: now you have to move. Faith in action is the completion of prayer. Step forward and the waters will part.",
    "he": ""
   },
   "intermediate": {
    "en": "T198: \"Why do you cry out to Me? Speak to the children of Israel and let them travel\" (Exodus 14:15). Sometimes the divine response to prayer is not a static miracle but a command to move (nesiah). The sea splits only after the step into the water — action completes the prayer. LM 198.",
    "he": "\"מה תצעק אלי... וייסעו\" (שמות יד:טו) — לעיתים תשובת ה׳ לתפילה היא: עתה נסעו! האמונה שלמה מתבטאת בתנועה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ח — שמות יד:טו \"מה תצעק אלי... דבר אל בני ישראל ויסעו\"; לפעמים תשובת ה׳ לתפילה היא פקודת נסיעה."
   }
  }
 ]
},
199: {
 "title_en": "The Sweetening That Protects from Widowhood",
 "title_he": "המתיקה המגינה מאלמנות",
 "segs": [
  {
   "beginner": {
    "en": "There is a sweetening — a spiritual protection — that guards a man from losing his wife, Heaven forbid. This protection comes through the sweetness of Torah. When Torah study is alive with genuine joy and depth, it creates a shield that softens harsh decrees. Rebbe Nachman is teaching that Torah is not just intellectual engagement — it has direct protective power over the home, over life, over the people we love. Deep engagement with Torah, with the tzaddik's Torah especially, guards the precious bonds in one's life.",
    "he": ""
   },
   "intermediate": {
    "en": "T199: There is a hamtakah (sweetening) in Torah that protects from the punishment of becoming a widower — one's wife not dying prematurely. The sweetness of Torah (metikut sheb'Torah) sweetens strict judgment and guards the marital bond. LM 199.",
    "he": "יש המתקה בתורה המגינה מעונש אלמנות — שלא תמות אשתו. מתיקות שבתורה ממתיקה את הדין ושומרת הבית."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ קצ״ט — \"יש המתקה להינצל מעונש אלמן... וזה המתיקה בתורה\" (מתיקות שבתורה ממתקת דינים)."
   }
  }
 ]
},
200: {
 "title_en": "Why the Tzaddikim of Our Time Are Wealthy",
 "title_he": "מדוע צדיקי דורנו עשירים",
 "segs": [
  {
   "beginner": {
    "en": "The earlier tzaddikim were mostly poor; the tzaddikim of recent generations are often wealthy. Why? Rebbe Nachman hints at the Mishnah in Avot (4:9): \"All who fulfill the Torah from poverty will in the end fulfill it from wealth.\" We are in an era where the accumulated spiritual merit of generations of poor Torah-devotion is now manifesting as material blessing. The generation has \"earned\" its wealth through the poverty-Torah of its ancestors. This is not a corruption of the tzaddikim but the fulfillment of a divine promise.",
    "he": ""
   },
   "intermediate": {
    "en": "T200: Earlier tzaddikim were poor; contemporary tzaddikim are wealthy — because the generation has now arrived at the fulfillment of \"all who fulfill Torah from poverty will fulfill it from wealth\" (Avot 4:9). The accumulated merit of ancestral poverty-Torah now manifests as wealth. LM 200.",
    "he": "צדיקי הדורות הקודמים היו עניים; צדיקי דורנו עשירים — כי \"כל המקיים את התורה מעוני סופו לקיימה מעושר\" (אבות ד:ט)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר׳ — אבות ד:ט \"כל המקיים את התורה מעוני\"; צדיקי דורנו עשירים כמימוש הבטחה זו."
   }
  }
 ]
},
}

def make_data(n, info):
    segs_out = []
    for s in info['segs']:
        segs_out.append({
            "beginner": s["beginner"],
            "intermediate": s["intermediate"],
            "scholarly": s["scholarly"]
        })
    return {
        "id": f"pnc-1-{n}",
        "book": pnc_name,
        "part": 1,
        "torah": n,
        "title": f"T{n} PNC - {info['title_en']}",
        "hebrewTitle": info['title_he'],
        "author": "Petten Nanach",
        "segments": segs_out
    }

git_files = ['src/data/lm-commentaries.json']

for n, info in torahs.items():
    data = make_data(n, info)
    out_path = os.path.join(reader_dir, pnc_name, f'torah-{n}.json')
    with open(out_path, 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    # validate
    with open(out_path, encoding='utf-8') as fh:
        check = json.load(fh)
    assert check['torah'] == n
    nseg = len(data['segments'])
    avg = sum(len(s['beginner']['en']) for s in data['segments']) // max(nseg,1)
    print(f"T{n}: {nseg} segs, avg {avg} chars")
    # register
    sn = str(n)
    if sn not in cdata['1']:
        cdata['1'][sn] = {}
    label = info['title_en']
    cdata['1'][sn]['running_commentary'] = {
        "book": pnc_name, "slug": pnc_name, "status": "available",
        "url": f"/reader/{pnc_name}/torah-{n}.json",
        "layers": ["beginner", "intermediate", "scholarly"],
        "author": "Petten Nanach",
        "label": f"Petten Nanach Running Commentary - T{n} ({label})"
    }
    git_files.append(f'public/reader/{pnc_name}/torah-{n}.json')

with open(lm_comm, 'w', encoding='utf-8') as fh:
    json.dump(cdata, fh, ensure_ascii=False, indent=2)
with open(lm_comm, encoding='utf-8') as fh:
    json.load(fh)
print("lm-commentaries.json updated for T186-T200")

os.chdir(repo)
add = subprocess.run(['git','add'] + git_files, capture_output=True, text=True)
commit = subprocess.run(['git','commit','-m',
    'feat: T186-T200 PNC -- faith-reveals-wonders/measure-for-measure/travel-tzaddik/sadness-serpent/moses-mediator/gan-eden-perception/true-tzaddik-speech/thought-power/honor-fool/distress-broadens/prayer-not-fixed/lashon-hara-humility/travel-answer/Torah-sweetens-widowhood/tzaddikim-wealthy (15 segs)'],
    capture_output=True, text=True)
print("commit:", commit.returncode, commit.stdout.strip())
push = subprocess.run(['git','push','origin','main'], capture_output=True, text=True)
print("push:", push.returncode, push.stdout.strip() or push.stderr.strip())
