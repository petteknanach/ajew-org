import json, os, subprocess

home = os.path.expanduser('~')
repo = os.path.join(home, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
lm_comm = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')

with open(lm_comm, encoding='utf-8') as fh:
    cdata = json.load(fh)

torahs = {
216: {
 "title_en": "Prayer Nullifies Nature",
 "title_he": "תפילה מבטלת את הטבע",
 "segs": [
  {
   "beginner": {
    "en": "The philosophers call nature \"the mother of all living\" — they believe nature is the ultimate force governing all outcomes. But Rebbe Nachman teaches that prayer nullifies nature. When we pray with genuine faith and urgency, we step outside the framework of natural causation entirely. Hashem is above nature; prayer connects us directly to that level above nature. This is why prayer is so powerful and so transformative — it doesn't work within the system; it transcends the system. Every sincere prayer is a declaration that Hashem, not nature, is the true source of all.",
    "he": ""
   },
   "intermediate": {
    "en": "T216: The philosophers call nature (teva) \"mother of all living\" — but tefillah (prayer) nullifies teva. Prayer connects us to the divine dimension that transcends natural causation. LM 216.",
    "he": "הפילוסופים קוראים לטבע \"אם כל חי\" — אך תפילה מבטלת את הטבע. תפילה מחברת לה׳ שלמעלה מהטבע."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריו׳ — \"הפילוסופים קוראים לטבע אם כל חי... ואנחנו בתפילותינו מבטלים הטבע\"."
   }
  }
 ]
},
217: {
 "title_en": "Remember the Torah of Moses — Repairing Forgetfulness in Tammuz",
 "title_he": "זכרו תורת משה — תיקון שכחה בתמוז",
 "segs": [
  {
   "beginner": {
    "en": "\"Remember the Torah of Moses\" (end of Malachi) — the initials of this phrase spell Tammuz (lacking vav). This is not coincidental. The month of Tammuz is a time of forgetfulness — the Tablets were broken in Tammuz, the golden calf represented forgetting, and forgetting the Torah is the root of all spiritual decline. The remedy is drawing the remembrance back — actively recalling the Torah of Moses during this vulnerable time. Forgetfulness is not passive; it must be actively fought with conscious remembrance.",
    "he": ""
   },
   "intermediate": {
    "en": "T217: \"Zichru Torat Moshe\" (end of Malachi) — initials spell Tammuz (tav-mem-zayin, lacking vav). Tammuz is the time of forgetting (shichechah) when the Tablets were broken; this verse is a remedy — actively drawing in remembrance (zechira) to repair the forgetfulness. LM 217.",
    "he": "\"זכרו תורת משה\" (מלאכי ג) — ראשי תיבות: תמ\"ז (חסר וא\"ו). תמוז = עת השכחה (שבירת הלוחות). התיקון: זכירה פעילה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריז׳ — \"זכרו תורת משה\" (מלאכי ג:כב) ר״ת ת-מ-ז; תמוז = עת שכחה; תיקון = משיכת הזכירה."
   }
  }
 ]
},
218: {
 "title_en": "When a Decree Is Decreed — One's Mazal Perceives It",
 "title_he": "כשנגזרת גזרה — מזלו רואה",
 "segs": [
  {
   "beginner": {
    "en": "Sometimes a decree is issued against a person in the heavenly court, but the person themselves does not consciously feel it — yet their mazal (spiritual fortune, inner soul-dimension) perceives it. The Talmud teaches: \"Even though a person does not see, his mazal sees\" (Megillah 3). This explains why we sometimes feel vague dread or unease without knowing why — our deeper spiritual dimension is registering something that our conscious mind has not yet grasped. This inner perception is a gift — it is an invitation to pray and to seek divine protection.",
    "he": ""
   },
   "intermediate": {
    "en": "T218: When a gezeirah (decree) is issued against a person, their mazal (spiritual dimension) perceives it even if the conscious self does not — \"even though a person does not see, his mazal sees\" (Megillah 3). Inner dread without cause is often this mazal-perception at work. LM 218.",
    "he": "כשנגזרת גזרה — מזלו של האדם רואה אפילו אם האדם עצמו אינו רואה (מגילה ג). חרדה פנימית ללא סיבה = תפיסת המזל."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריח׳ — \"לפעמים שנגזרת גזרה... מזלו רואה\" (מגילה ג); חרדת מזל = רגישות הנשמה לגזרה."
   }
  }
 ]
},
219: {
 "title_en": "Hashem Contracted His Pride to Reveal His Kingship",
 "title_he": "ה׳ צמצם גאוותו כדי לגלות מלכותו",
 "segs": [
  {
   "beginner": {
    "en": "\"He performed His word\" (Lamentations 2) — Hashem tore His purple, His royal garment, at the Temple's destruction. Why? Because the Temple could not contain His full glory. Rebbe Nachman reveals the mystical principle: Hashem contracts (tzimtzum) His pride and glory in order to reveal His kingship. Kingship (malchut) requires a visible ruler, not an infinite light that overwhelms everything. So Hashem diminishes His revealed glory precisely in order that we can experience His reign. The destruction of the Temple was not abandonment — it was a divine contraction creating space for malchut.",
    "he": ""
   },
   "intermediate": {
    "en": "T219 seg1: \"He performed His word\" (Lamentations 2) — Hashem tore His purple at destruction. The Temple could not contain His full glory. Kabbalistic principle: tzimtzum of divine pride enables revelation of malchut. LM 219.",
    "he": "\"קיים אמרתו\" (איכה ב) — ה׳ קרע ארגמנו; בית המקדש לא יכול לשאת כבודו המלא. ה׳ מצמצם גאוותו לגלות מלכותו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריט׳ א — איכה ב:יז \"קיים אמרתו\" (מדרש); ה׳ מצמצם גאוותו לגלות מלכותו; \"ה׳ מלך גאות לבש\"."
   }
  },
  {
   "beginner": {
    "en": "The principle extends further: Hashem clothes Himself in contracted form so that His kingship can be recognized and experienced. \"G-d reigns, pride He has donned\" (Psalms 93) — this means Hashem donned pride in a diminished, accessible form so that His kingship is perceivable. All fear is an aspect of malchut (kingship) — when we feel awe, we are encountering a trace of divine kingship filtering through creation.",
    "he": ""
   },
   "intermediate": {
    "en": "T219 seg2: Fear (yirah) is an aspect of malchut — Hashem contracts His pride to make His kingship perceivable. \"Hashem malaich, ge'ut lavesh\" (Psalms 93) — pride donned in accessible form enables encounter with malchut. LM 219.",
    "he": "יראה = בחינת מלכות. ה׳ מצמצם גאוותו כדי שמלכותו תהיה מורגשת. \"ה׳ מלך גאות לבש\" (תהלים צג) — גאות בצורה נגישה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריט׳ ב — תהלים צג:א \"ה׳ מלך גאות לבש\"; יראה = מלכות; צמצום הגאוה = גילוי מלכות."
   }
  },
  {
   "beginner": {
    "en": "A further dimension: Rebbe Nachman spoke these words on clarity — explaining to a preacher at his table what it means to teach Torah for financial gain. The spiritual principle of divine contraction applies here too: when Torah is taught purely, the teacher contracts self for the sake of the audience. But when Torah is taught for money alone, the contraction becomes corrupt — the self expands in precisely the wrong direction.",
    "he": ""
   },
   "intermediate": {
    "en": "T219 seg3-4: Rebbe Nachman applied the contraction-principle to the problem of teaching Torah for financial gain — pure teaching involves tzimtzum of self; teaching for money corrupts this contraction. Additional oral teachings on this theme. LM 219.",
    "he": "רבנו יישם עקרון הצמצום לבעיית הלימוד לשם כסף — לימוד טהור = צמצום העצמי; לשם כסף = עיוות הצמצום."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריט׳ ג-ד — שמיעות שאמר: לימוד תורה לשם כסף כנגד עקרון הצמצום; \"קיים אמרתו\" = דרשן שדורש לשם ממון."
   }
  }
 ]
},
220: {
 "title_en": "Several Precious Things in the World — Each Has Its Elevation",
 "title_he": "כמה דברים יקרים בעולם — לכל אחד מעלתו",
 "segs": [
  {
   "beginner": {
    "en": "There are several precious things in the world: the wise man is precious, so is the mighty, the wealthy, and the ruler — each one who has some form of elevation. Rebbe Nachman acknowledges these hierarchies exist and are real. But the deeper teaching is that each of these levels of greatness is precious only insofar as it reflects something divine. The wise man's wisdom comes from above; the mighty man's strength is borrowed from divine power; the wealthy man's riches flow from divine blessing. Recognize the divine source behind every form of human greatness.",
    "he": ""
   },
   "intermediate": {
    "en": "T220: There are several precious things (yekarin) — wisdom, might, wealth, rulership — each reflecting a distinct form of elevation. Their preciousness derives from the divine source they channel. LM 220.",
    "he": "ישנם דברים יקרים בעולם: חכם, גיבור, עשיר, שליט — כל אחד בעל מעלה. יקרם נובע מן המקור האלוקי שהם מבטאים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכ׳ — \"יש כמה דברים יקרים בעולם: חכם, גיבור, עשיר, שליט\" — כל אחד כלי לאלוקות."
   }
  }
 ]
},
221: {
 "title_en": "Giving Tithe Saves from Enemies — Hashem Covers and Protects",
 "title_he": "מעשר מציל משונאים — ה׳ מכסה ומגין",
 "segs": [
  {
   "beginner": {
    "en": "By giving a tithe (maaser), a person is saved from enemies and haters. Why? Because when one gives maaser, Hashem covers them with His hand — He becomes a shield. The verse says \"G-d seeks the pursued\" — even when a tzaddik is the one being pursued, Hashem stands with the pursued. When you give maaser, you declare that your wealth belongs ultimately to Hashem, and in response, Hashem declares that you belong to Him — and He protects what is His. Giving maaser is not just a financial practice; it is a declaration of ownership and of divine protection.",
    "he": ""
   },
   "intermediate": {
    "en": "T221: Giving maaser (tithe) earns divine protection from soneh'im (enemies/haters) — Hashem \"covers him with His hand.\" Based on \"Hashem seeks the pursued\" — by giving maaser, one enters the category of the protected-by-Hashem. LM 221.",
    "he": "על ידי מעשר ניצל האדם משונאיו — ה׳ מכסה אותו בידו. \"האלוקים יבקש את נרדף\" — הנותן מעשר נכנס לסוג המוגן."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכא׳ — מעשר מציל משונאים; \"ה׳ יכסה עליו בידו\"; קהלת ג:טו \"האלוקים יבקש את נרדף\"."
   }
  }
 ]
},
222: {
 "title_en": "Always Serve Hashem in Joy — Strengthen Yourself with Past Good Days",
 "title_he": "תמיד עבוד ה׳ בשמחה — התחזק בימים הטובים שעברו",
 "segs": [
  {
   "beginner": {
    "en": "One must always be in joy and serve Hashem with joy. But what happens when we fall from our level — when we have a bad day, when we've stumbled, when joy seems far away? Rebbe Nachman gives practical wisdom: strengthen yourself by remembering your previous good days. You had moments of closeness, of good deeds, of genuine prayer. Those moments are real and they are still yours. Draw on their vitality now. The past is not lost — its goodness can fuel the present. Joy is not about pretending everything is fine; it is about drawing on genuine resources of light.",
    "he": ""
   },
   "intermediate": {
    "en": "T222: Always serve Hashem in simchah (joy). When falling from one's level, the practical remedy is to draw strength from previous days of good avodah — those moments are real resources for reviving present joy. LM 222.",
    "he": "תמיד לעבוד ה׳ בשמחה. אם נפל ממדרגתו — יתחזק מימים טובים שעברו. הימים הטובים שחלפו — משאבי שמחה אמיתיים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכב׳ — \"צריך תמיד להיות בשמחה... ואם לפעמים נפל ממדרגתו יתחזק מהימים הקודמים\"."
   }
  }
 ]
},
223: {
 "title_en": "The Tzaddik's Requests Are Not Always Fulfilled — A Deep Kindness",
 "title_he": "בקשת הצדיק לא תמיד מתמלאת — חסד עמוק",
 "segs": [
  {
   "beginner": {
    "en": "When the tzaddik needs to make a request from Hashem, it can happen that the request is not fulfilled. Sometimes Hashem hears and answers; sometimes He does not. Why would Hashem deny the tzaddik? Rebbe Nachman suggests this is itself a hidden kindness — if the tzaddik's every request were automatically granted, the tzaddik's prayers would feel mechanical and obligatory. The uncertainty keeps the tzaddik in a posture of genuine supplication, real vulnerability, authentic prayer. The element of \"sometimes fulfilled and sometimes not\" preserves the authenticity of the tzaddik's spiritual relationship with Hashem.",
    "he": ""
   },
   "intermediate": {
    "en": "T223: The tzaddik's requests to Hashem are not always fulfilled — \"sometimes heard and sometimes not.\" This is a divine design to preserve the genuineness of the tzaddik's tefilah (prayer) — uncertainty maintains authentic supplication. LM 223.",
    "he": "בקשת הצדיק לא תמיד מתמלאת — \"לפעמים שומע ולפעמים לאו\". זהו תכנון אלוקי לשמירת אמיתות תפילת הצדיק."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכג׳ — \"כשצריך הצדיק לבקש מה׳... לפעמים שומע ולפעמים לאו\"; הספק שומר על אמיתות תפילת הצדיק."
   }
  }
 ]
},
224: {
 "title_en": "Even the Distant Receive Vitality from the Tzaddik",
 "title_he": "אפילו הרחוקים מקבלים חיות מהצדיק",
 "segs": [
  {
   "beginner": {
    "en": "Even those who are physically far from the tzaddik — who have never met him, who live in distant lands — still receive spiritual vitality and illumination from him. Rebbe Nachman uses the parable of a great tree: its branches, bark, and leaves spread wide, and everything draws nourishment from the same root. Even those who only touch the outermost leaves of the tree receive something from its root. So too with the tzaddik — the further disciples benefit from the same divine root, though in diminishing degrees the further they are from the center.",
    "he": ""
   },
   "intermediate": {
    "en": "T224: Even the gerukhim (distant ones) receive chiyut (spiritual vitality) from the tzaddik — like a tree whose branches, bark, and leaves all draw from the same root. Physical or spiritual distance does not sever the connection entirely. LM 224.",
    "he": "אפילו הרחוקים מקבלים חיות מהצדיק — כמו עץ שכל ענפיו וקליפתו וירקו שואבים מאותו שורש. המרחק אינו מנתק לגמרי."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכד׳ — \"אפילו הרחוקים מהצדיק מקבלים חיות... כעץ שיש לו ענפים וקליפה ועלים וכולם שואבים ממנו\"."
   }
  }
 ]
},
225: {
 "title_en": "Complete Friendship Produces Complete Trust",
 "title_he": "ידידות שלמה מולידה בטחון שלם",
 "segs": [
  {
   "beginner": {
    "en": "When friendship between two people reaches its fullness, it generates complete trust (bitachon). And the main source of complete trust is intellect — the deeper one's understanding of who Hashem is and how He works, the more naturally trust fills the soul. We cannot manufacture bitachon through willpower alone; it arises naturally from genuine knowledge and genuine connection. Build the friendship — with Hashem, with Torah, with the tzaddik — and the trust will follow. True bitachon is not naive optimism; it is the natural fruit of a mature, knowing relationship.",
    "he": ""
   },
   "intermediate": {
    "en": "T225: Complete yedidut (friendship/connection) generates complete bitachon (trust). The mechanism is sekhel (intellect) — da'at/knowledge of Hashem is the root of authentic trust. Bitachon is not willpower but the natural fruit of genuine knowing. LM 225.",
    "he": "ידידות שלמה מולידה בטחון שלם. עיקר הבטחון השלם — מן השכל. דעת ה׳ היא שורש הבטחון האמיתי."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכה׳ — \"כשהידידות בשלמות, על ידי זה הבטחון בשלמות... עיקר הבטחון בשלמות הוא מן השכל\"."
   }
  }
 ]
},
226: {
 "title_en": "The Wicked Sing Melodies of Sadness — Their Soul Is from the Mixed Multitude",
 "title_he": "הרשעים שרים ניגוני בכי — נשמתם מן הערב רב",
 "segs": [
  {
   "beginner": {
    "en": "The wicked tend to sing melodies of wailing, sadness, and grief — not melodies of joy. This is because their souls are rooted in the \"mixed multitude\" (erev rav) who left Egypt together with Israel, bringing a subtle spiritual corruption. The mother of the erev rav is Lilith, the force of bitter sadness and spiritual darkness. Those whose souls draw from this source are naturally pulled toward music that expresses longing and loss rather than joy and light. The quality of someone's inner music reveals the quality of their soul's root.",
    "he": ""
   },
   "intermediate": {
    "en": "T226: The wicked prefer melodies of wailing and sadness (neginot yilelah v'atzvut) because their neshama is rooted in the erev rav (mixed multitude), whose spiritual mother is Lilith — the force of bitter sadness. Soul-root determines musical inclination. LM 226.",
    "he": "הרשעים שרים ניגוני יללה ועצבות — כי נשמתם מן הערב רב, ואם הערב רב היא לילית, כוח העצבות המרה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכו׳ — \"הרשעים בעיקר שרים ניגוני יללה ועצבות... כי הם בחינת נשמת ערב רב ואמם לילית\"."
   }
  }
 ]
},
227: {
 "title_en": "Why We Say 'G-d Help' When Passing Reapers",
 "title_he": "מדוע אומרים 'ה׳ יעזור' בעוברים על הקוצרים",
 "segs": [
  {
   "beginner": {
    "en": "Rebbe Nachman transmitted in the name of a tzaddik who expounded in the synagogue: when passing by reapers working in the field, the custom is to say \"G-d help\" or a blessing to them. This custom is rooted in deep meaning: the reapers are laboring in the physical world, and their labor has a spiritual counterpart. By blessing them, we connect physical labor to its divine source and draw down heavenly help for their work. Simple customs often carry profound spiritual architecture — every traditional practice, properly understood, is a window into higher worlds.",
    "he": ""
   },
   "intermediate": {
    "en": "T227: The custom of saying \"Hashem ya'azor\" (G-d help) when passing reapers carries deep spiritual significance — transmitted by Rebbe Nachman in the name of a tzaddik. Folk customs often encode profound spiritual connections between physical labor and its divine source. LM 227.",
    "he": "אמירת \"ה׳ יעזור\" לקוצרים — מנהג בעל משמעות רוחנית עמוקה. שמע רבנו בשם צדיק. מנהגי עם פשוטים = ידיעה רוחנית עמוקה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכז׳ — \"שמעתי בשמו שאמר בשם צדיק אחד... מה שאומרים בעוברים על הקוצרים ה׳ יעזור\"."
   }
  }
 ]
},
228: {
 "title_en": "When Hashem Gazes on a Soul That Can Bring Others to Repentance",
 "title_he": "כשה׳ מסתכל בנשמה שיכולה להחזיר בתשובה",
 "segs": [
  {
   "beginner": {
    "en": "When Hashem gazes upon a soul that has the rare power to bring other people to repentance and to attract converts to truth, He Himself, as it were, requests and implores that soul to go out and do its work. The soul that can change other souls is precious beyond measure. Hashem is, so to speak, in need of such a soul's service. This is why certain great individuals feel an almost irresistible calling — it is literally Hashem calling them, imploring them to go out and do the work of teshuvah for the generation.",
    "he": ""
   },
   "intermediate": {
    "en": "T228: When Hashem gazes on a neshama (soul) capable of bringing others to teshuvah (repentance) or attracting geirim (converts), He Himself kivy'achol (as it were) beseeches that soul to act. The soul that can transform others is uniquely precious to Hashem. LM 228.",
    "he": "כשה׳ מסתכל בנשמה שיכולה להחזיר בתשובה ולגייר — ה׳ עצמו כביכול מבקש ומתחנן לנשמה זו שתצא לפעול."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכח׳ — \"כשה׳ מסתכל בנשמה שיכולה להחזיר בתשובה ולעשות גרים... הוא עצמו כביכול מבקש\"."
   }
  }
 ]
},
229: {
 "title_en": "Certain Trees Are a Segulah for Having Children",
 "title_he": "עצים מסוימים הם סגולה לפרי בטן",
 "segs": [
  {
   "beginner": {
    "en": "There are certain trees that, when used to make a bed, are a segulah (spiritual remedy) for having children and raising them well. And there are trees that have the opposite effect. This teaching reflects the Kabbalistic understanding that all of creation is interconnected — that certain natural objects carry spiritual properties that can facilitate divine blessing or, when misused or misapplied, can hinder it. Rebbe Nachman's world is one where nothing is spiritually neutral. Every tree, every object, every action carries weight in the spiritual accounting of the world.",
    "he": ""
   },
   "intermediate": {
    "en": "T229: Certain trees, when used for bed-making, are a segulah (propitious remedy) for childbirth and child-rearing; others have the opposite effect. The Kabbalistic view: all physical objects carry spiritual properties. Nothing in creation is spiritually neutral. LM 229.",
    "he": "עצים מסוימים כשעושים מהם מיטה — סגולה לפרי בטן ולגידול ילדים. כל דבר בבריאה נושא משקל רוחני."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רכט׳ — \"יש עצים שכשעושים מהם מיטה הם סגולה לפרי בטן... ויש להיפך\"; כל הבריאה נושאת סגולות."
   }
  }
 ]
},
230: {
 "title_en": "One with Eyes to See Can Recognize a Disciple's Rebbe in His Face",
 "title_he": "מי שיש לו עיניים לראות מכיר בפני התלמיד מיהו רבו",
 "segs": [
  {
   "beginner": {
    "en": "A person who truly has eyes to see — deep spiritual perception — can look at a disciple's face and recognize who their Rebbe is. The Torah of the Rebbe leaves its mark on the disciple's face, its light shines through. \"The wisdom of a man illuminates his face\" (Ecclesiastes 8:1). Even if the disciple has only seen their Rebbe once, that single encounter leaves an indelible spiritual imprint. This teaches us that genuine Torah transmission is transformative — it changes the receiver's very face. Closeness to the true tzaddik is not just inspirational; it is physically transfiguring.",
    "he": ""
   },
   "intermediate": {
    "en": "T230: One with spiritual vision can discern from a talmid's (disciple's) face who his Rebbe is — even if the disciple saw the Rebbe only once. \"The wisdom of a man illuminates his face\" (Ecclesiastes 8:1). True Torah transmission leaves a visible mark. LM 230.",
    "he": "מי שיש לו עיניים לראות — מכיר בפני התלמיד מיהו רבו. \"חכמת אדם תאיר פניו\" (קהלת ח:א). לימוד אמיתי משנה את הפנים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״ל — \"מי שיש לו עיניים לראות... מכיר בפני התלמיד מי הוא רבו\"; קהלת ח:א \"חכמת אדם תאיר פניו\"."
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
    with open(out_path, encoding='utf-8') as fh:
        check = json.load(fh)
    assert check['torah'] == n
    nseg = len(data['segments'])
    avg = sum(len(s['beginner']['en']) for s in data['segments']) // max(nseg,1)
    print(f"T{n}: {nseg} segs, avg {avg} chars")
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
print("lm-commentaries.json updated for T216-T230")

os.chdir(repo)
add = subprocess.run(['git','add'] + git_files, capture_output=True, text=True)
commit = subprocess.run(['git','commit','-m',
    'feat: T216-T230 PNC -- prayer-nullifies-nature/Tammuz-forgetfulness/mazal-perceives-decree/Hashem-contracts-pride/precious-things/tithe-saves/joy-past-days/tzaddik-requests/distant-receive/friendship-trust/wicked-sad-melodies/reapers-blessing/soul-returns-others/trees-segulah/face-reveals-rebbe (18 segs)'],
    capture_output=True, text=True)
print("commit:", commit.returncode, commit.stdout.strip())
push = subprocess.run(['git','push','origin','main'], capture_output=True, text=True)
print("push:", push.returncode, push.stdout.strip() or push.stderr.strip())
