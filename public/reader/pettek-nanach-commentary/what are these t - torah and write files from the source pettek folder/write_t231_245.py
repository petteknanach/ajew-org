import json, os, subprocess

home = os.path.expanduser('~')
repo = os.path.join(home, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
lm_comm = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')

with open(lm_comm, encoding='utf-8') as fh:
    cdata = json.load(fh)

torahs = {
231: {
 "title_en": "When Saying 'The Hosts of Heaven Bow to You' — Pray for Everything",
 "title_he": "בעת אמירת 'וצבא השמים לך משתחווים' — להתפלל על הכל",
 "segs": [
  {
   "beginner": {
    "en": "When you say the verse \"And the host of the heavens bow to You\" (Nehemiah 9), it is a particularly fitting moment to pray for absolutely anything you need. The reason is that all natural healings and physical effects flow through the heavenly bodies — the spheres, the constellations. When you acknowledge that even these heavenly powers bow before Hashem, you bypass them and connect directly to their Source. At that moment, every natural force is bowed in submission to the King — it is the perfect time to ask Him for whatever you need.",
    "he": ""
   },
   "intermediate": {
    "en": "T231: When reciting \"u'tzeva ha-shamayim lecha mishtachavim\" (Nehemiah 9), it is fitting to pray for any need — because all healings flow through heavenly forces, and at this moment those forces are explicitly bowed before Hashem, opening direct access to the Source. LM 231.",
    "he": "בעת אמירת \"וצבא השמים לך משתחווים\" (נחמיה ט) — ראוי להתפלל על כל דבר. כל הרפואות באות דרך כוחות השמים — באותה שעה כולם משועבדים לה׳."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״א — נחמיה ט:ו \"וצבא השמים לך משתחווים\"; שעת רצון לתפילה על כל צורך."
   }
  }
 ]
},
232: {
 "title_en": "When Saying 'Praise G-d from the Heavens' — One Commands All Creation",
 "title_he": "בעת אמירת 'הללו את ה׳ מן השמים' — האדם מצוֵה על הכל",
 "segs": [
  {
   "beginner": {
    "en": "When you say \"Praise G-d from the heavens, praise Him all His angels, praise Him all His hosts\" (Psalms 148), you are not just praying — you are calling out to all of creation and commanding everything to praise Hashem. In that moment, the human being takes on a remarkable role: standing as the conductor of cosmic praise. Every angel, every star, every creature is summoned by your words to join in praise. This elevates the simple recitation of a Psalm into an act of cosmic leadership. The human is the priest who orchestrates universal worship.",
    "he": ""
   },
   "intermediate": {
    "en": "T232: When reciting \"Hallelu et Hashem min ha-shamayim... hallelu hu kol malachav, hallelu hu kol tzeva'av\" (Psalms 148), the person calls upon and commands all creation to praise Hashem. The reciter takes the role of conductor of cosmic worship. LM 232.",
    "he": "בעת אמירת \"הללו את ה׳ מן השמים\" (תהלים קמח) — האדם קורא לכל הבריאה ומצוֶה אותה להלל. האדם הופך מנצח על שירת העולם."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ב — תהלים קמח \"הללו את ה׳ מן השמים\"; אומר התהלים הוא מצַוה על כל הבריאה להלל."
   }
  }
 ]
},
233: {
 "title_en": "Conquering Evil Thoughts — Sit Still and Don't Engage",
 "title_he": "כיבוש מחשבות רעות — שב ואל תעשה",
 "segs": [
  {
   "beginner": {
    "en": "When evil thoughts and fantasies overwhelm you, and you successfully strengthen yourself and conquer them, Hashem takes great pleasure in this. The struggle itself is precious to Him. Why? Because conquering thoughts is harder than conquering actions. Rebbe Nachman gives a brilliantly practical method: it is impossible to hold two thoughts at the same time. So the way to chase away evil thoughts is paradoxically through stillness — \"sit and do not do.\" Don't fight the thought directly; just stay seated, refuse to engage, and the thought will fade because the mind cannot sustain it without your participation.",
    "he": ""
   },
   "intermediate": {
    "en": "T233 seg1: When a person conquers evil thoughts (machshavos zaros), there is great divine pleasure (nachat ruach). The internal battle is more precious than external victories. LM 233.",
    "he": "כיבוש מחשבות רעות — נחת רוח גדולה לה׳. המאבק הפנימי יקר יותר מהחיצוני."
   },
   "intermediate2": "skip",
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ג א — כיבוש מחשבות רעות = נחת רוח לקב״ה."
   }
  },
  {
   "beginner": {
    "en": "The general rule: it is impossible — in any way in the world — to hold two thoughts simultaneously. This is a key insight. Therefore, you can easily chase away evil thoughts by simply remaining stationary, by not engaging, by refusing to act on them. \"Sit and do not do\" — this is one of Breslov's most powerful psychological tools. Don't wrestle with the thought; just hold still. The thought needs your participation to continue. Withdraw your participation, and it dissipates on its own.",
    "he": ""
   },
   "intermediate": {
    "en": "T233 seg2: A psychological key — it is impossible to hold two thoughts simultaneously. Therefore, the practical remedy for evil thoughts is shev v'al taaseh (sit and do not do) — disengage rather than fight. The thought needs your participation to persist. LM 233.",
    "he": "אי אפשר להחזיק שתי מחשבות בו זמנית. לכן, התרופה למחשבות רעות = \"שב ואל תעשה\" — לא להיאבק, רק לא להתחבר."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ג ב — אי אפשר שיהיו שתי מחשבות בו זמנית; \"שב ואל תעשה\" — אסטרטגיה ניצוח."
   }
  }
 ]
},
234: {
 "title_en": "Stories of Tzaddikim Purify Thought — But the Telling Itself Matters",
 "title_he": "סיפורי צדיקים מטהרים את המחשבה — וצריך לדעת איך לספר",
 "segs": [
  {
   "beginner": {
    "en": "Stories of the deeds of tzaddikim — what happened to them, what they did — are extraordinarily powerful for purifying our thoughts. When the mind is filled with stories of holy people, it is naturally cleansed of impure thoughts. But Rebbe Nachman adds: it is impossible to do this haphazardly. One needs to know how to tell the deed properly, because every deed contains contraction (tzimtzum) — there are aspects to convey, aspects to leave hidden, the right framing matters. A story badly told can have the opposite effect.",
    "he": ""
   },
   "intermediate": {
    "en": "T234 seg1: Sippurei tzaddikim (stories of tzaddikim) — particularly accounts of what occurred to them — purify thought. The mind absorbs the spiritual quality of what it dwells on. LM 234.",
    "he": "סיפורי מעשי צדיקים — מטהרים מחשבת האדם. המוח סופג את האיכות הרוחנית של מה שעוסק בו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ד א — סיפורי מעשיות מהצדיקים מטהרים המחשבה."
   }
  },
  {
   "beginner": {
    "en": "One must know how to tell the story. Every deed contains contraction — there is a right way and a wrong way to convey it. When telling the story of the tzaddik, one is participating in the deed itself. The teller becomes part of the deed. So the manner of telling matters as much as the content. A pure-hearted, properly-framed telling continues the effect of the original deed; a casual or unworthy telling distorts it.",
    "he": ""
   },
   "intermediate": {
    "en": "T234 seg2: One must know how to tell the deed properly — every action contains tzimtzum (contraction); the storyteller participates in the deed itself by telling it. The manner of telling matters as much as the content. LM 234.",
    "he": "צריך לדעת איך לספר — בכל מעשה יש צמצום; המספר נעשה שותף למעשה. אופן הסיפור חשוב כתוכן."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ד ב — \"צריך לידע איך לספר המעשה\"; המספר נעשה שותף לתיקון."
   }
  },
  {
   "beginner": {
    "en": "There is no \"always\" except the Land of Israel — \"Always the eyes of Hashem your G-d are upon it\" (Deuteronomy 11:12). This phrase \"always\" carries unique weight. There is also a divine Name used when Hashem makes a king — the Name \"Kamah\" (referenced in the Vayakhel section of Zohar). These hints suggest that storytelling about tzaddikim, when done properly, draws down kingship and the constant gaze of Hashem.",
    "he": ""
   },
   "intermediate": {
    "en": "T234 seg3: \"Tamid\" (always) is a quality unique to Eretz Yisrael — \"the eyes of Hashem your G-d are always upon it\" (Deut. 11:12). The Name Kamah (Vayakhel Zohar) is used to make a king. Tzaddik-storytelling channels this constant divine gaze and kingship. LM 234.",
    "he": "\"תמיד\" — איכות יחודית לארץ ישראל. שם \"קמ\"ה\" (זוהר ויקהל) משמש למלוכה. סיפורי צדיקים = ערוץ למלכות והשגחה תמידית."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ד ג — דברים יא:יב \"תמיד עיני ה׳\"; שם קמ\"ה (זוהר ויקהל) — למלכות."
   }
  }
 ]
},
235: {
 "title_en": "One Who Falls and Is Mocked — Damaged the Joy of Festival",
 "title_he": "מי שנופל וצוחקים עליו — פגם בשמחת יום טוב",
 "segs": [
  {
   "beginner": {
    "en": "When someone falls down — physically or socially — and the world laughs at them, leaving them ashamed, this is not random. Rebbe Nachman traces the cause: it comes from having damaged the joy of festival (simchat yom tov). The festivals are reservoirs of joy that protect us from disgrace and falling throughout the year. When we don't fully enter the festival's joy — when we are sad or disconnected during yom tov — we lose this protection. Festival joy is not optional spiritual luxury; it is real protection against humiliation in the year ahead. Honor the festival's joy fully.",
    "he": ""
   },
   "intermediate": {
    "en": "T235: One who falls and is mocked — exposed to public shame — has damaged simchat yom tov (festival joy). The festivals' joy creates protective covering against falls and humiliation. Failing to enter festival joy fully removes this protection. LM 235.",
    "he": "מי שנופל וצוחקים עליו — פגם בשמחת יום טוב. שמחת המועדים יוצרת מגן מנפילה וביזיון. אי-כניסה לשמחה = איבוד המגן."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ה — מי שנופל ומתביישים עליו = פגם בשמחת יום טוב; שמחת מועד = מגן."
   }
  }
 ]
},
236: {
 "title_en": "Rabbinic Leadership Conducted with Fitness and Innocence",
 "title_he": "ניהול רבנות בכשרות ובתום",
 "segs": [
  {
   "beginner": {
    "en": "When a person serves as a rabbi or spiritual leader with proper qualifications and pure-hearted innocence, this carries enormous spiritual weight. \"Fitness\" (kashrut) means having the genuine credentials, the real Torah knowledge, the right character. \"Innocence\" (tom) means leading without ulterior motives, without ambition, without ego. The combination of these two — competence and purity — is the ideal of rabbinic service. Rebbe Nachman is sketching the portrait of true leadership: not just charisma, not just learning, but the pairing of authentic capability with purity of heart.",
    "he": ""
   },
   "intermediate": {
    "en": "T236: True rabbinic leadership requires the pairing of kashrut (fitness/proper qualifications) with tom (innocence/purity of heart). Neither alone is sufficient — competence without purity corrupts; purity without competence misleads. LM 236.",
    "he": "ניהול רבנות בכשרות — הכישורים האמיתיים, ובתום — בלי פניות. שילוב כשרות ותום = הנהגה אמיתית."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ו — \"מי שמתנהג ברבנות בכשרות ובתום כראוי\"; ניהול רוחני = כשרות + תום."
   }
  }
 ]
},
237: {
 "title_en": "Levi Brought Melody and the Instrument of Song to the World",
 "title_he": "לוי הביא לעולם את הניגון ואת כלי השיר",
 "segs": [
  {
   "beginner": {
    "en": "The main melody and the instruments of song were brought to the world by Levi (the tribe). The Zohar (Exodus 19a) teaches that the principal melody emerged through Levi. This is why the Levites were the singers in the Temple — their soul-root is music. Music is not entertainment; it is a spiritual technology. Through melody, the world is purified and elevated. The Levites' service was to transform the spiritual atmosphere of the Temple, and through it, the entire world. We are still living in the wake of Levi's gift — every melody traces back to that original revelation.",
    "he": ""
   },
   "intermediate": {
    "en": "T237 seg1: Music's source — the main melody (neginah) and instrumental song (kli shir) were brought into the world by Levi (Zohar Exodus 19a). The Levites' Temple service of song reflects their soul-root. Music is spiritual technology, not entertainment. LM 237.",
    "he": "עיקר הניגון וכלי השיר — לוי הביא לעולם (זוהר שמות יט). עבודת הלוויים בשיר משקפת שורש נשמתם. ניגון = טכנולוגיה רוחנית."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ז א — זוהר שמות יט. \"עיקר הניגון וכלי השיר לוי הביאם לעולם\"."
   }
  },
  {
   "beginner": {
    "en": "Rebbe Nachman shared a personal note: he was accustomed to receiving the rachash — a portion or honor offered to a respected guest in the synagogue. This connects to the broader teaching about how the holy melody operates in the world. Even small details of how a Rebbe is honored in the community connect to the deeper architecture of Levi's gift of music and spiritual elevation.",
    "he": ""
   },
   "intermediate": {
    "en": "T237 seg2: Personal note — Rebbe Nachman was accustomed to receiving the rachash (a portion or honor in the synagogue). This connects to the broader principle: communal honor of the tzaddik is part of the music of holiness in the world. LM 237.",
    "he": "רבנו הזכיר ש\"היו רגילין לתת לו את הרחש\" — הקשר עם רעיון המוזיקה הרוחנית. כיבוד הצדיק — חלק מן הניגון הקדוש."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ז ב — \"היו רגילין לתת לו את הרחש\" (חלק או כיבוד); קשור לעניין הניגון."
   }
  }
 ]
},
238: {
 "title_en": "When Two Argue and a Third Arrives — His Coming Decides",
 "title_he": "כששניים חולקים ובא שלישי — בואו מכריע",
 "segs": [
  {
   "beginner": {
    "en": "When two people are arguing about some matter, and a third person arrives — even if the third knows nothing about the dispute and says nothing — the very fact of his arrival shifts the spiritual balance of the dispute. There is a hidden mechanism by which his presence affects the outcome. This teaches us how interconnected human reality is: we don't always realize what our presence brings. Sometimes we are the third party whose mere arrival decides things, even without our knowing. The presence of the right witness transforms a conflict.",
    "he": ""
   },
   "intermediate": {
    "en": "T238: When two are arguing and a third arrives — even one who knows nothing of the matter — his presence shifts the spiritual balance of the dispute. The architecture of conflict is sensitive to witnesses. LM 238.",
    "he": "כששניים חולקים ובא השלישי — אפילו אינו יודע — עצם בואו משנה את האיזון הרוחני של המחלוקת. נוכחות העד משנה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ח — \"כששניים מחולקים ביניהם וכשבא השלישי, אף שאינו יודע כלל\" — בואו פועל בכל זאת."
   }
  }
 ]
},
239: {
 "title_en": "Through Division Speech Becomes Impossible",
 "title_he": "על ידי המחלוקת לא ניתן לדבר",
 "segs": [
  {
   "beginner": {
    "en": "Division (machloket, conflict) destroys the possibility of speech. Why? Because the main source of speech is peace. \"I will speak now of peace\" (Psalms 122:8) — this verse hints at the structural truth that all speech ultimately flows from peace. When the world is divided, the channel of speech is disrupted. People can talk past each other, can shout, can argue — but real speech, the kind that connects, requires peace. Without peace, even when sounds emerge, communication does not occur.",
    "he": ""
   },
   "intermediate": {
    "en": "T239 seg1: Division (machloket) destroys the possibility of authentic speech (dibbur). The source of speech is peace — \"I will speak now of peace\" (Psalms 122:8). Without shalom, sounds emerge but communication does not. LM 239.",
    "he": "מחלוקת מבטלת את הדיבור. עיקר הדיבור — מן השלום: \"אדברה נא שלום\" (תהלים קכב:ח). בלי שלום אין תקשורת אמיתית."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ט א — תהלים קכב:ח \"אדברה נא שלום\"; מחלוקת = ביטול הדיבור."
   }
  },
  {
   "beginner": {
    "en": "All speeches come from peace. Therefore, the one who is in the aspect of peace can know all the speeches in the world — like Hashem who is called Peace and who knows all speech. Peace is not the absence of conflict; it is the active force that produces meaningful communication. The peacemaker is the one most attuned to the deep structure of language and connection.",
    "he": ""
   },
   "intermediate": {
    "en": "T239 seg2: All speech flows from peace. One who embodies shalom can know all speech in the world — paralleling Hashem who is called Shalom and knows all speech. Peace is the active producer of communication, not merely conflict's absence. LM 239.",
    "he": "כל הדיבורים מן השלום. מי שבבחינת שלום — יודע כל הדיבורים, כמו שה׳ שמו שלום ויודע כל הדיבורים. שלום = יוצר התקשורת."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ט ב — \"מי שבבחינת שלום יכול לידע כל הדיבורים\"; \"הקב״ה שנקרא שלום\"."
   }
  },
  {
   "beginner": {
    "en": "All speeches come from heat — from inner warmth and passion. One who has much heat speaks much; one who is cooled and has no heat cannot speak at all. \"My heart was hot within me, in my meditation a fire burned, then I spoke with my tongue\" (Psalms 39:4). Speech requires inner fire. This is why depression and emotional flatness produce silence — the engine of speech requires warmth to run. Cultivate inner fire if you want to speak meaningfully.",
    "he": ""
   },
   "intermediate": {
    "en": "T239 seg3: All speech comes from heat (chom) — inner warmth/passion. One with much heat speaks much; cooled/passionless cannot speak. \"Cham libi b'kirbi, b'higigi tiv'ar esh, dibarti b'leshoni\" (Psalms 39:4). Inner fire is the engine of meaningful speech. LM 239.",
    "he": "כל הדיבורים מן החום הפנימי. מרובה חום — מרובה דיבור; קר וחסר חום — אינו מדבר. \"חם ליבי בקרבי\" (תהלים לט:ד) — אש פנימית = מנוע הדיבור."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רל״ט ג — \"כל הדיבורים באים מחום\"; תהלים לט:ד \"חם לבי בקרבי בהגיגי תבער אש\"."
   }
  }
 ]
},
240: {
 "title_en": "All Influences and All Things Come Only from the True Tzaddik",
 "title_he": "כל ההשפעות וכל הדברים — רק מן הצדיק האמיתי",
 "segs": [
  {
   "beginner": {
    "en": "All spiritual influences (hashpaot) and all things in the world come only through the true tzaddik. This is one of Rebbe Nachman's most far-reaching teachings: the tzaddik amiti is the channel through which all divine bounty flows into the world. Material blessings, spiritual openings, healing, livelihood — all of it passes through this single point. To be connected to the true tzaddik is to be connected to the source of everything. To be disconnected is to be cut off from the flow. This is why finding and clinging to the true tzaddik is the primary spiritual work of life.",
    "he": ""
   },
   "intermediate": {
    "en": "T240: All hashpa'ot (spiritual influences/divine flow) and all things in the world come only through the tzaddik amiti (true tzaddik). The tzaddik is the singular channel of all divine bounty. Connection to the true tzaddik is the central spiritual task. LM 240.",
    "he": "כל ההשפעות וכל הדברים — באים רק מן הצדיק האמיתי. הצדיק = הצינור היחיד של שפע אלוקי. התחברות אליו = העבודה המרכזית."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״מ — \"כל ההשפעות וכל הדברים, באים רק מהצדיק האמיתי\"."
   }
  }
 ]
},
241: {
 "title_en": "When Judgments Threaten — Mercy Sweetens Them",
 "title_he": "כשגזרות מאיימות — רחמים ממתקים אותן",
 "segs": [
  {
   "beginner": {
    "en": "When divine judgments (dinim) are decreed, the attribute of judgment would, left to itself, destroy a person. Strict justice is too sharp for human survival; we are all too imperfect to withstand pure judgment. But the attribute of judgment has a sweetening — and this sweetening is the attribute of mercy (rachamim). Judgment and mercy are not opposites in the simple sense; they are partners. Mercy enters the very structure of judgment and softens its edges. Without this divine mechanism, no soul would survive. The hidden secret of existence is that mercy is built into the judgment system itself.",
    "he": ""
   },
   "intermediate": {
    "en": "T241: When dinim (divine judgments) threaten, midat ha-din (the attribute of judgment) would destroy a person — but it has a hamtakah (sweetening) through midat ha-rachamim (the attribute of mercy). Mercy is built into the structure of judgment itself. LM 241.",
    "he": "כשהדינים מאיימים — מידת הדין הייתה הורגת האדם. אבל למידת הדין יש המתקה — מידת הרחמים. רחמים בנויים בתוך מבנה הדין."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״א — \"כשיש דינים, מידת הדין הייתה מאבדת את האדם, אך יש המתקה — מידת הרחמים\"."
   }
  }
 ]
},
242: {
 "title_en": "Arich Anpin Has a Counterpart in the Klipah",
 "title_he": "יש בחינת אריך אנפין בקליפה",
 "segs": [
  {
   "beginner": {
    "en": "There is an aspect of Arich Anpin (the highest Kabbalistic divine countenance, signifying patience and long-suffering compassion) — but it has a dark counterpart in the klipah (the forces of impurity). The forces of impurity also have \"long faces\" — extended, pervasive influences that follow you everywhere. This is why the yetzer hara seems to track you no matter which way you turn — its presence is structurally similar to the structure of holiness above. The remedy is tzedakah (charity), which is a great segulah (spiritual protection) against this pursuing klipah-presence.",
    "he": ""
   },
   "intermediate": {
    "en": "T242 seg1: There is an aspect of Arich Anpin (highest divine patience/compassion) within the klipah (forces of impurity) — manifesting as the persistent, far-reaching nature of evil temptation. The klipah's reach mirrors holiness's reach in inverse form. LM 242.",
    "he": "יש בחינת \"אריך אנפין\" (רחמים עליונים) בקליפה — מתבטא בכוח הרחב של היצר הרע. הקליפה מקבילה במבנה לקדושה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ב א — \"יש בחינת אריך אנפין בקליפה\" — \"אריך אנפין דקליפה\"."
   }
  },
  {
   "beginner": {
    "en": "The klipah's long faces extend into every direction — to whichever side a person turns, the klipah will appear there to greet him. This is the persistent, all-pervading quality of temptation. The remedy: tzedakah is a powerful segulah. Charity, especially given with the right intention, breaks the klipah's grip. The act of giving creates a counter-force to the klipah's pursuit. Every coin given to charity is a small but real strike against the all-pervading darkness.",
    "he": ""
   },
   "intermediate": {
    "en": "T242 seg2: The klipah's \"long faces\" extend in all directions — to whichever side one turns, it appears. The remedy is tzedakah (charity), which is a powerful segulah against this all-pervading klipah-presence. Each gift weakens the klipah's grip. LM 242.",
    "he": "ה\"אנפין ארוכות\" של הקליפה — לכל צד שיפנה, היא שם. תרופה: צדקה — סגולה גדולה. כל מתנה לצדקה — מחלשת את הקליפה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ב ב — \"אריך אנפין דקליפה\" בכל צד; \"וצדקה היא סגולה גדולה\"."
   }
  }
 ]
},
243: {
 "title_en": "There Is a Tzaddik So Great That the World Cannot Bear His Holiness",
 "title_he": "יש צדיק שגדול כל כך שהעולם לא יכול לשאת את קדושתו",
 "segs": [
  {
   "beginner": {
    "en": "There exists a tzaddik so spiritually elevated that the world itself cannot bear his holiness. Therefore he must hide himself very much, and people do not see him for who he truly is. Some of the greatest tzaddikim in history were never recognized in their own time — their holiness was simply too intense for the surrounding world to perceive. This teaches humility about our judgments of others: we may be in the presence of an extraordinary soul and not realize it. It also teaches us about Rebbe Nachman himself, whose true greatness was hidden from most of his contemporaries.",
    "he": ""
   },
   "intermediate": {
    "en": "T243: There is a tzaddik so great that the world cannot bear his kedushah (holiness). Therefore he hides himself profoundly and is not perceived. Some of history's greatest tzaddikim were unrecognized in their generations — their light too intense for surrounding perception. LM 243.",
    "he": "יש צדיק כל כך גדול שהעולם לא יכול לשאת את קדושתו — לכן מסתיר עצמו, ואין רואים אותו. גדולי הדורות לעיתים נסתרים מבני זמנם."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ג — \"יש צדיק גדול מאד שהעולם לא יכול לסבול קדושתו, לכן מסתיר עצמו הרבה ואין רואין\"."
   }
  }
 ]
},
244: {
 "title_en": "One Who Is Mixed Among the Idolaters",
 "title_he": "המעורב באומות העולם",
 "segs": [
  {
   "beginner": {
    "en": "One who is socially or commercially mixed in with non-Jews — who has businesses with them, give-and-take dealings — must take spiritual care. Rebbe Nachman is not condemning the engagement; he acknowledges it is a real-life necessity. But the engagement creates a spiritual exposure that requires conscious counter-measures. The mixing is not neutral. One must intentionally re-anchor oneself in Torah and prayer when returning from such engagements, lest the surrounding influence subtly recolor one's inner world. Awareness is the first defense.",
    "he": ""
   },
   "intermediate": {
    "en": "T244: One who is mixed among ovdei kochavim (idolaters/non-Jews) — through business dealings — needs to be very careful. The engagement is necessary but not neutral; it creates spiritual exposure requiring conscious counter-measures (Torah, prayer, intentional re-anchoring). LM 244.",
    "he": "המעורב בעובדי כוכבים — בעסקים, משא ומתן — צריך זהירות גדולה. המעורבות אינה ניטרלית; דורשת תרופות מודעות (תורה, תפילה)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ד — \"מי שהוא מעורב בעובדי כוכבים, שיש לו עסקים ומשא ומתן עמהם, צריך\" — להישמר."
   }
  }
 ]
},
245: {
 "title_en": "The Chambers of Torah — Entering Through Innovation",
 "title_he": "היכלות התורה — נכנסים על ידי חידוש",
 "segs": [
  {
   "beginner": {
    "en": "There are chambers of Torah — mystical inner rooms where deeper levels of Torah are revealed. Whoever merits to enter these chambers does so when he begins to innovate in Torah — when fresh insights start flowing through him, he enters from chamber to chamber. Torah innovation (chiddushei Torah) is not just creative thought; it is the key that opens hidden doors in the spiritual structure of Torah. Each fresh insight is a passage into a deeper chamber. The Torah scholar who is genuinely creating is not just learning — he is exploring vast hidden territories.",
    "he": ""
   },
   "intermediate": {
    "en": "T245: There are heichalei Torah (chambers of Torah) — mystical inner spaces accessed through chiddushei Torah (innovative Torah insight). When fresh Torah insight flows, the learner enters from chamber to chamber. Innovation is a passage-key to hidden Torah territory. LM 245.",
    "he": "יש היכלות תורה — חדרים פנימיים נסתרים. הזוכה — נכנס בהם כשמתחיל לחדש בתורה. חידושי תורה = מפתח לנכנס מהיכל להיכל."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ה — \"יש היכלות תורה, ומי שזוכה להם — כשמתחיל לחדש, נכנס בהיכלות ונכנס מהיכל להיכל\"."
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
print("lm-commentaries.json updated for T231-T245")

os.chdir(repo)
add = subprocess.run(['git','add'] + git_files, capture_output=True, text=True)
commit = subprocess.run(['git','commit','-m',
    'feat: T231-T245 PNC -- hosts-of-heaven/praise-from-heavens/conquering-thoughts/tzaddikim-stories/festival-joy/rabbinic-leadership/Levi-melody/third-arrives/peace-speech/all-from-tzaddik/judgments-mercy/arich-anpin-klipah/hidden-tzaddik/mixed-with-nations/Torah-chambers (23 segs)'],
    capture_output=True, text=True)
print("commit:", commit.returncode, commit.stdout.strip())
push = subprocess.run(['git','push','origin','main'], capture_output=True, text=True)
print("push:", push.returncode, push.stdout.strip() or push.stderr.strip())
