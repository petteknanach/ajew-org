import json, os, subprocess

home = os.path.expanduser('~')
repo = os.path.join(home, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
lm_comm = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')

with open(lm_comm, encoding='utf-8') as fh:
    cdata = json.load(fh)

torahs = {
201: {
 "title_en": "On Pesach They Cry Out in Prayer — Prayer for Healing",
 "title_he": "בפסח צועקים בתפילה — תפילה לרפואה",
 "segs": [
  {
   "beginner": {
    "en": "Pesach is a day of concentrated prayer, rooted in the original cries of Israel in Egypt. The Targum connects the verse \"They gave voice in the house of Hashem as on the day of festival\" to the cries of prayer. There is a special segulah on Pesach for praying for healing and for those who are falling (noflim). The initials of the prayer formula for the ill form the word \"Nefel\" (falling). Pesach is not only the festival of physical redemption — it is a time when the gates of prayer for restoration are uniquely open.",
    "he": ""
   },
   "intermediate": {
    "en": "T201 seg1: On Pesach (Passover), tefilah (prayer) is especially potent — the Targum on Lamentations 2:18 links the \"day of festival\" to the communal cry of prayer. Seg2: The prayer for the ill contains the initials of \"Nefel\" (falling/recovery). A specific segulah for healing on Pesach. LM 201.",
    "he": "בפסח תפילה בעלת כוח מיוחד — מתרגם על מגילת איכה ב:יח. תפילה לחולה נכללת ב\"נפל\" — ראשי תיבות הנוסח."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רא׳ — תרגום איכה ב:יח; פסח — יום צעקה בתפילה; סגולה לחולה \"נופל\" (תהלים קיב:ט ראשי תיבות)."
   }
  },
  {
   "beginner": {
    "en": "The second part of this teaching gives a specific prayer formula for someone who is ill and falling spiritually or physically. \"He has dispersed, he has given to the poor\" (Psalms 112:9) — the initials of this verse spell \"Nefel\" (falling). When someone is in the state of falling, there is a prayer embedded in this very verse that can lift them. The Torah is full of hidden healing remedies for those who can decode them.",
    "he": ""
   },
   "intermediate": {
    "en": "T201 seg2: Psalms 112:9 — \"He has dispersed, he has given to the poor\" — initials spell Nefel (falling). A remez (hint) embedded in Psalms for lifting those who are falling. LM 201.",
    "he": "תהלים קיב:ט — \"פזר נתן לאביונים\" — ראשי תיבות: נפ\"ל. רמז לתפילה עבור מי שנפל."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רא׳ ב — תהלים קיב:ט \"פזר נתן לאביונים\" ראשי תיבות נפ״ל; תפילה לחולה נופל."
   }
  }
 ]
},
202: {
 "title_en": "Those with Smaller Intellect Crave More Honor",
 "title_he": "מי שדעתו קטנה צריך יותר כבוד",
 "segs": [
  {
   "beginner": {
    "en": "The less developed someone's intellect is, the more they crave honor and recognition. Rebbe Nachman observes that women are typically more particular about their honor than men — and explains this as an expression of a smaller intellectual focus rather than a character flaw. The craving for kavod is in inverse proportion to one's level of da'at (knowledge/connection to Hashem). The more someone is filled with genuine wisdom and closeness to the Divine, the less they need external validation. Seeking kavod is a symptom of an unfilled interior.",
    "he": ""
   },
   "intermediate": {
    "en": "T202: Da'at (divine knowing) and kavod (honor-seeking) are inversely proportional. Smaller intellect (da'at katan) intensifies the desire for honor. This applies socially as well — those whose inner world is less developed need outer affirmation more. LM 202.",
    "he": "מי שדעתו קטנה יותר — רצונו בכבוד גדול יותר. דעת וכבוד בהפוך: ככל שהדעת גדולה, הצורך בכבוד חיצוני קטן."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רב׳ — \"כל מי שדעתו קטנה יותר צריכים לתת לו כבוד יותר\" — דעת וכבוד ביחס הפוך."
   }
  }
 ]
},
203: {
 "title_en": "Women's Stories Reveal the State of the Shechinah",
 "title_he": "מסיפורי הנשים נדע את מצב השכינה",
 "segs": [
  {
   "beginner": {
    "en": "The conversations and stories that women share among themselves are a reflection of the current spiritual state of the Shechinah (the Divine Presence). The Shechinah is described in Kabbalah as the feminine aspect of the divine, and its condition at any time is mirrored in the world below — especially in the realm of women's discourse. Rebbe Nachman points to Mordechai: he \"knew all that was done\" — meaning he paid attention to the words and stories of women and through them discerned the state of the divine world. Spiritual sensitivity can be found in unexpected places.",
    "he": ""
   },
   "intermediate": {
    "en": "T203: Women's stories (sippurim of women) mirror the current state of the Shechinah (Divine Presence, the feminine sefirah). Mordechai's ability to \"know all that was done\" was partly this attunement. LM 203.",
    "he": "סיפורי הנשים ושיחותיהן משקפים את מצב השכינה בעולם. מרדכי \"ידע את כל אשר נעשה\" — הקשיב לנשים ודעת מעמד השכינה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רג׳ — \"מסיפורי הנשים יכולין לידע ממצב השכינה\"; מרדכי ידע את כל אשר נעשה (אסתר ד:א)."
   }
  }
 ]
},
204: {
 "title_en": "Money Given to a Torah Scholar Is Itself an Aspect of Torah",
 "title_he": "מעות הניתנות לתלמיד חכם הן בחינת תורה",
 "segs": [
  {
   "beginner": {
    "en": "Charity is always a mitzvah, but giving to a Torah scholar carries a special quality: the money itself becomes Torah. When you support someone who is learning and teaching Torah, your money is transformed — it is no longer merely coins but an extension of Torah itself. This is because the Torah scholar uses that support to enable learning, and through that, the money is spiritually elevated to the category of Torah. Supporting a Torah scholar is not just an act of generosity — it is an act of Torah study by proxy.",
    "he": ""
   },
   "intermediate": {
    "en": "T204: Tzedakah (charity) given to a talmid chacham (Torah scholar) is categorically elevated — the money itself becomes an aspect of Torah (bechinas Torah). It enables Torah study and is thereby spiritually transformed. LM 204.",
    "he": "מעות הנתונות לתלמיד חכם הן בחינת תורה ממש — כי מאפשרות לימוד תורה, ומתרוממות לדרגת תורה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רד׳ — \"המעות שנותנים לתלמיד חכם הם בחינת תורה\"; ממון שתומך בתורה מתעלה לדרגת תורה."
   }
  }
 ]
},
205: {
 "title_en": "Rectification for Nocturnal Emission Through Ten Chapters of Psalms",
 "title_he": "תיקון לקרי על ידי עשרה פרקי תהלים",
 "segs": [
  {
   "beginner": {
    "en": "Rebbe Nachman teaches that reciting ten chapters of Psalms on the day a nocturnal emission occurred is a powerful rectification (tikkun). The power of Psalms is uniquely suited to repair this kind of spiritual blemish. Ten chapters correspond to the ten types of psalms, and through them, the fallen vitality is recalled and elevated. This became the famous \"Tikkun HaKlali\" — the General Rectification — one of Rebbe Nachman's most far-reaching teachings, offered as a universal repair for this particular damage to the soul.",
    "he": ""
   },
   "intermediate": {
    "en": "T205 seg1: The Tikkun HaKlali — reciting ten specific chapters of Psalms on the day of a keri (nocturnal emission) — repairs the spiritual blemish. Psalms have a unique power to elevate and recall fallen sparks of vitality. LM 205.",
    "he": "תיקון הכללי — אמירת עשרה פרקי תהלים ביום שאירע קרי — מתקן את הפגם הרוחני. תהלים מעלים ניצוצות שנפלו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רה׳ א — תיקון הכללי: עשרה פרקי תהלים ביום קרי; כוח תהלים להעלות הניצוצות שנפלו."
   }
  },
  {
   "beginner": {
    "en": "The second part deepens the connection between Psalms and the repair of this blemish: \"To David Maskil, happy is he whose transgression is forgiven\" (Psalms 32). The initials of this verse's key words spell out the Hebrew word for \"adultery\" — the blemish that Psalms specifically rectify. Rebbe Nachman added to this teaching after its initial revelation, expanding its scope and deepening the understanding of why this specific repair works.",
    "he": ""
   },
   "intermediate": {
    "en": "T205 seg2: \"L'David Maskil ashrei n'sui pesha\" (Psalms 32) — initials spell Na'af (adultery/licentiousness), which is subdued through Psalms (\"le-David maskil\" = aspect of Psalms). Rebbe Nachman subsequently expanded this teaching. LM 205.",
    "he": "תהלים לב: \"לדוד משכיל אשרי נשוי\" — ראשי תיבות: נא\"ף; הנגד נשבר על ידי \"לדוד משכיל\" — בחינת תהלים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רה׳ ב — תהלים לב:א \"לדוד משכיל אשרי נשוי פשע\" ראשי תיבות נא\"ף; תיקון על ידי תהלים."
   }
  }
 ]
},
206: {
 "title_en": "I Have Strayed Like a Lost Sheep — Torah Calls the Lost Home",
 "title_he": "תעיתי כשה אובד — התורה קוראת לשבים",
 "segs": [
  {
   "beginner": {
    "en": "\"I have strayed like a lost sheep; seek Your servant\" (Psalms 119). There is a great difference between someone who sins from inner compulsion and someone who sins because external forces pushed them off the path. The Torah understands this distinction. When a person has not yet deviated too far, return is natural and easy — the Torah itself calls out to them like a shepherd calling a lost sheep. The further one has strayed, the harder the return, but the call never stops. No matter how lost, the call of Torah reaches every wandering soul.",
    "he": ""
   },
   "intermediate": {
    "en": "T206 seg1: \"Taaiti k'seh oved\" (Psalms 119) — there is a crucial distinction between sinning from internal arousal vs. external pressure. The degree of deviation affects the ease of return (teshuvah). LM 206.",
    "he": "\"תעיתי כשה אובד\" (תהלים קיט) — יש הבדל גדול בין החוטא מתוך עצמו לחוטא מלחץ חיצוני. מידת הסטיה קובעת קושי התשובה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רו׳ א — תהלים קיט:קעו \"תעיתי כשה אובד שחר את עבדך\"; הבדל בין חטא מעצמו לחטא מלחץ חיצוני."
   }
  },
  {
   "beginner": {
    "en": "\"How long will you love simplicity, simple ones?\" (Proverbs 1). The Torah itself is Hashem calling out to the simple and the lost — calling them to return. When one has not strayed too far, the return path is short and straightforward. The distance between where you are and where you should be is exactly the distance you need to travel — no more. Hashem's kindness is that the Torah remains a living call, always beckoning, always within reach.",
    "he": ""
   },
   "intermediate": {
    "en": "T206 seg2: Proverbs 1 — \"How long will you love simplicity\" — Torah itself (as Hashem) calls the lost back. The closer one is to the straight path, the shorter the return journey. The call of Torah never ceases. LM 206.",
    "he": "\"עד מתי פתיים תאהבו פתי\" (משלי א) — התורה היא ה׳ הקורא לשבים. ככל שלא סטה הרבה, קצר דרך השיבה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רו׳ ב — משלי א:כב \"עד מתי פתיים תאהבו פתי\"; תורה קוראת לשבים; קרוב לדרך — קצר הדרך לשוב."
   }
  }
 ]
},
207: {
 "title_en": "All Speeches Are Aspects of Gevurot — Sweetened Through Torah",
 "title_he": "כל הדיבורים הם בחינת גבורות — ומתמתקים על ידי תורה",
 "segs": [
  {
   "beginner": {
    "en": "\"And Your gevurah (strength/judgment) they shall speak\" (Psalms 145). Every act of human speech contains an element of gevurot — the divine attribute of judgment and strength. Speech requires energy, force, and boundary — all aspects of gevurah. The Kabbalistic teaching is that the five gevurot in da'at (knowledge) are the source of all speech. This means every word we speak is rooted in a form of divine power. When we speak words of Torah and positive truth, we sweeten the harsh aspect of the gevurot. Our speech has the power to transform judgment into mercy.",
    "he": ""
   },
   "intermediate": {
    "en": "T207 seg1: All human speech is rooted in gevurot (divine judgments/strengths) — \"And Your gevurah they shall speak\" (Psalms 145). The five gevurot in da'at are the source of speech. Speech that has harsh/unrefined aspects reflects unsweet gevurot. LM 207.",
    "he": "כל דיבורי האדם הם בחינת גבורות — \"וגבורתך ידברו\" (תהלים קמה). חמש גבורות שבדעת הן מקור הדיבור."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רז׳ א — תהלים קמה:ו \"וגבורותיך ידברו\"; חמש גבורות שבדעת — מקור הדיבורים (כתבי האר״י)."
   }
  },
  {
   "beginner": {
    "en": "The sweetening of speech — the way to refine its harsh aspects — comes through Torah study and speaking good, holy words. When we study Torah and engage in wholesome speech, we sweeten the underlying gevurot that power our words. The result is that our very speech becomes elevated, our words become vessels of blessing rather than of judgment. Know also that all speeches ultimately come from heat — passion and warmth — and without inner warmth, speech cannot emerge at all.",
    "he": ""
   },
   "intermediate": {
    "en": "T207 seg2: Sweetening of speech-gevurot comes through Torah study and good speech (diburim tovim). All speech comes from inner heat (chom) — without warmth, speech cannot emerge. Good speech converts gevurot into rachamim (mercy). LM 207.",
    "he": "המתקת גבורות הדיבור — על ידי תורה ודיבורים טובים. כל דיבור בא מחום פנימי; ללא חום לא יוכל לדבר."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רז׳ ב — המתקת גבורות הדיבור על ידי תורה ודיבורים טובים; \"כי כל הדיבורים באים מחום\"."
   }
  }
 ]
},
208: {
 "title_en": "The Wicked Watches the Tzaddik — a Hidden Catalyst for Self-Examination",
 "title_he": "הרשע צופה לצדיק — כלי לחשבון נפש",
 "segs": [
  {
   "beginner": {
    "en": "\"The wicked watches the tzaddik and seeks to kill him\" (Psalms 37). Why does Hashem allow the wicked to persecute the tzaddik? Rebbe Nachman reveals: the persecution is itself a divine tool. When the wicked harasses the tzaddik, it causes the tzaddik to stop, reflect, and examine his own deeds. The wicked is like a watchman appointed by heaven to keep the tzaddik sharp and honest. The suffering is not random punishment — it is a catalyst for inner scrutiny that leads to greater perfection.",
    "he": ""
   },
   "intermediate": {
    "en": "T208 seg1: \"Tzofeh rasha la-tzaddik\" (Psalms 37) — Hashem allows the wicked to pursue the tzaddik as a divine tool to compel the tzaddik's self-examination (cheshbon ha-nefesh). The wicked is like a heavenly-appointed watchman. LM 208.",
    "he": "\"צופה רשע לצדיק\" (תהלים לז) — ה׳ מניח לרשע לרדוף הצדיק כדי שהצדיק יבדוק מעשיו. הרשע כשומר שמינו שמים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רח׳ א — תהלים לז:לב \"צופה רשע לצדיק\"; סיבה מה׳ — הרשע מביא הצדיק לחשבון נפש ובדיקת מעשים."
   }
  },
  {
   "beginner": {
    "en": "The wicked is thus, paradoxically, one of the tzaddik's greatest helpers — not because the wicked intends good, but because Hashem uses the wicked's hostility as the pressure that refines the tzaddik's gold. The tzaddik emerges from persecution purer. This teaches us more broadly: our adversaries are often appointed tools of our refinement. The very people we wish would leave us alone are sometimes the ones pushing us to become better.",
    "he": ""
   },
   "intermediate": {
    "en": "T208 seg2: Paradoxically, the wicked serves as the tzaddik's refiner — pressure from the wicked is the mechanism by which the tzaddik is purified and elevated. Adversity as purification is a divine design. LM 208.",
    "he": "הרשע הוא בפרדוקס מסייע הצדיק — לחצו הוא הכלי שמזקק את הצדיק. הצרות הן כלי זיקוק שמינו שמים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רח׳ ב — הרשע ממינוי שמים כ\"שומר\" המאלץ הצדיק לחשבון נפש; ומכאן צרות כזיקוק."
   }
  }
 ]
},
209: {
 "title_en": "Prayers Correspond to the Tamid Offerings",
 "title_he": "תפילות כנגד התמידים",
 "segs": [
  {
   "beginner": {
    "en": "The Sages instituted daily prayers (Shacharit and Mincha) corresponding to the two daily Tamid offerings in the Temple. This correspondence is not just historical — it is structural. Prayer is the Temple service of the heart. Just as the Tamid was offered at fixed times regardless of mood or circumstances, so too prayer must be steady, regular, unwavering. The Tamid was \"always\" (tamid) — continuous, faithful, daily. Our prayers carry on the Temple's eternal flame in the absence of the physical altar.",
    "he": ""
   },
   "intermediate": {
    "en": "T209: Tefillot (prayers) correspond structurally to the Tamidim (twice-daily Temple offerings) — Shacharit/Mincha mirror the morning and afternoon Tamid. Prayer is avodah she-ba-lev (service of the heart) that continues the Temple's eternal flame. LM 209.",
    "he": "תפילות כנגד התמידים — שחרית ומנחה כנגד תמיד של שחר ושל בין הערביים. תפילה = עבודה שבלב, המשך עבודת המקדש."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רט׳ — \"תפילות כנגד תמידין תיקנו\" (ברכות כו); תפילה = המשך עבודת התמיד בהעדר המקדש."
   }
  }
 ]
},
210: {
 "title_en": "Business Conducted in Faith Fulfills 'And You Shall Love Hashem'",
 "title_he": "עסק באמונה מקיים ואהבת את ה׳",
 "segs": [
  {
   "beginner": {
    "en": "\"And you shall love Hashem your G-d\" (Deuteronomy 6). The Sages explain this means: through your conduct, make the Name of Hashem beloved. When a person does business faithfully and honestly, people see this and are drawn to Torah and to Hashem. A Jew whose business dealings are impeccably honest sanctifies the Divine Name and causes others to love Hashem. Conversely, dishonest business dealings — even in small matters — cause a chillul Hashem (desecration of the Name). Business is thus not separate from avodah — it is one of its primary arenas.",
    "he": ""
   },
   "intermediate": {
    "en": "T210: Business conducted in emunah (faith/honesty) fulfills \"Ve'ahavta\" (Deuteronomy 6) — as the Sages teach (Yoma 86): through honest dealing, others are drawn to love Hashem. Emunah in commerce is a form of kiddush Hashem. LM 210.",
    "he": "עסק באמונה מקיים \"ואהבת\" — כשמשא ומתן ביושר, אחרים מתפעלים ואוהבים את ה׳ (יומא פו). עסק = זירת קידוש השם."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רי׳ — דברים ו:ה \"ואהבת את ה׳\"; יומא פו — עסק באמונה = קידוש השם וגילוי אהבת ה׳."
   }
  }
 ]
},
211: {
 "title_en": "Why People Travel to Tzaddikim on Rosh Hashanah",
 "title_he": "מדוע נוסעים לצדיקים בראש השנה",
 "segs": [
  {
   "beginner": {
    "en": "The primary sweetening of the Rosh Hashanah judgments (dinim) is through the holiness and purity of the tzaddik. On Rosh Hashanah, when the fate of every soul is being inscribed, the tzaddik's holiness creates a spiritual shield and channel. By being physically present with the tzaddik on these days — or even by connecting to him through prayer and thought — one taps into this sweetening power. The custom of traveling to the tzaddik for Rosh Hashanah is not mere sentiment; it is the practical application of a deep spiritual principle.",
    "he": ""
   },
   "intermediate": {
    "en": "T211: The practice of traveling to tzaddikim on Rosh Hashanah is rooted in the principle that the tzaddik's kedushah (holiness) and taharah (purity) are the primary sweetener of Rosh Hashanah dinim (judgments). Physical proximity to the tzaddik channels this sweetening. LM 211.",
    "he": "נסיעה לצדיקים בראש השנה — עיקר המתקת הדינים היא דרך קדושת הצדיק וטהרתו. נוכחות פיזית מפתחת ערוץ המתקה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריא׳ — \"מה שנוסעים לצדיקים בראש השנה — כי עיקר המתקת הדינים על ידי קדושה וטהרה\"."
   }
  }
 ]
},
212: {
 "title_en": "Clapping Hands — Beholding the Image of G-d",
 "title_he": "מחיאת כף — חזיון דמות אלוקים",
 "segs": [
  {
   "beginner": {
    "en": "Clapping hand to hand is connected to beholding the \"image of G-d\" — the inner images and visualizations through which we sense the divine. Clapping unifies two separate hands, just as prayer unifies the opposites of the spiritual world. Rebbe Nachman reveals that the hands are rooted in the higher structure of the divine world: \"And hands of man from under their wings\" (Ezekiel 10) — the wings are speech, and the hands are the action that emerges from that speech.",
    "he": ""
   },
   "intermediate": {
    "en": "T212 seg1: Clapping (mchiyat kaf) is connected to perceiving the tzelem Elokim (image of G-d). \"And hands of man from under their wings\" (Ezekiel 10) — wings = speech; hands = the action dimension. Prayer is encompassed within Torah in this structure. LM 212.",
    "he": "מחיאת כף — חזיון בצלם אלוקים. \"ודמות ידים תחת כנפיהם\" (יחזקאל י) — כנפיים = דיבורים; ידיים = פעולה. תפילה כלולה בתורה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריב׳ א — יחזקאל י:ח \"ודמות ידי אדם תחת כנפיהם\"; מחיאת כף = חזיון בצלם אלוקים; כנפיים = דיבורים."
   }
  },
  {
   "beginner": {
    "en": "Prayer is included within Torah — the two are not separate. The Written Torah and the Oral Torah correspond to two hands: the hand that writes and the hand that seals. Every act of prayer and Torah study is a participation in this divine handwork. The tzaddik's mouth is the channel through which this unity flows to the people — speech from the tzaddik's side draws down and completes the connection.",
    "he": ""
   },
   "intermediate": {
    "en": "T212 seg2-3: Torah shebichtav (Written Torah) and Torah shebe'al peh (Oral Torah) = two hands — writing and sealing. Prayer is included in Torah through this structure. The tzaddik's speech connects the mouth to the side of tzaddik. LM 212.",
    "he": "תורה שבכתב ותורה שבעל פה = שתי ידיים — יד כותבת ויד חותמת. תפילה כלולה בתורה; דיבור הצדיק מחבר הפה לצד צדיק."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריב׳ ב-ג — תורה שבכתב ותורה שבעל פה = ב׳ ידיים; תפילה כלולה בתורה; \"פה קרוי מצד צדיק\" (תיקון יח)."
   }
  },
  {
   "beginner": {
    "en": "Speech from the side of the tzaddik — holy, truthful speech — is the means by which spiritual connection (devekus) to the tzaddikim reaches the broader community. When we are connected to the tzaddik, we receive the vitality that flows through his channel. The hand-clapping, the speech, the Torah — all form one unified act of connecting above and below.",
    "he": ""
   },
   "intermediate": {
    "en": "T212 seg4 (note: source seg4 was empty): The unity of clapping-speech-Torah-tzaddik forms one coherent act of divine connection. This section (T209-T212) was transmitted \"in the language of our Rebbe\" — direct oral teachings. LM 212.",
    "he": "האחדות של מחיאה-דיבור-תורה-צדיק היא פעולה אחת של התחברות. (סימנים רט-ריב בלשון רבנו ז\"ל.)"
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריב׳ ד — [מסימן רט עד כאן בלשון רבנו ז\"ל]; אחדות מחיאה-דיבור-תורה-צדיק כפעולה אחת."
   }
  }
 ]
},
213: {
 "title_en": "The Hidden Name That Protects from the Accuser",
 "title_he": "השם הנסתר המגין מן המקטרג",
 "segs": [
  {
   "beginner": {
    "en": "There is a divine Name that Hashem uses to hide and cover a person from the spiritual accuser — shielding them from harsh judgment even in times of danger. The Name is formed from the initials of a verse in Psalms 32: \"You are a hiding place for me from the heads of words.\" This Name contains the power of concealment and protection. When Hashem wants to save someone, He cloaks them in this name, rendering them invisible to the forces of prosecution. It is a Name of pure divine mercy and protection.",
    "he": ""
   },
   "intermediate": {
    "en": "T213 seg1: There is a divine Name that Hashem uses to hide a person from the accuser (kateigor). This Name is Sal, derived from the initials of Psalms 32:7: \"Seter li ata mi-tzar\" (\"You are a hiding place for me from the heads of words\"). LM 213.",
    "he": "יש שם אלוקי שה׳ משתמש בו להסתיר האדם מן המקטרג. השם: ס\"ל — ראשי תיבות מתהלים לב:ז \"סתר לי אתה מצר\"."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריג׳ א — שם ס\"ל: ראשי תיבות \"סתר לי מראש דברים\" (תהלים לב:ז); מגין על האדם מן המקטרג."
   }
  },
  {
   "beginner": {
    "en": "The Mem of the protective phrase — \"from distress You preserve me\" — is the aspect of the hidden Mem above. When this Name is invoked, the person is surrounded by divine concealment, as if placed in a spiritual shelter. The deepest teaching here is that protection from accusation is not about being perfect but about being covered by divine mercy. Hashem's hiding-place is always available for those who seek it.",
    "he": ""
   },
   "intermediate": {
    "en": "T213 seg2: The Mem of \"mi-tzar tiztzereni\" (Psalms 32:7) — \"from distress You preserve me\" — is the aspect of the hidden Mem (mem stumah) above, completing the protective Name. Divine concealment as protection is available to those who invoke it. LM 213.",
    "he": "המ״ם של \"מצר תצרני\" (תהלים לב:ז) = מ״ם סתומה עליונה המשלימה את השם. הסתרה אלוקית = מגן מן הדין."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריג׳ ב — מ״ם של \"מצר תצרני\" = מ״ם סתומה עליונה; שם ס״ל מגן על ידי הסתרה."
   }
  }
 ]
},
214: {
 "title_en": "Earlier Generations Knew Their Death Day and Learned Torah Constantly",
 "title_he": "דורות הקדמונים ידעו יום מיתתם ועסקו בתורה כל היום",
 "segs": [
  {
   "beginner": {
    "en": "In the earlier generations, people knew the day of their death. This knowledge was a tremendous gift — it freed them to spend every day in total Torah immersion, because they understood exactly how much time they had. When you know the end is coming, time becomes precious beyond measure. The result was that the accuser had no dominion over them — pure Torah occupation left no opening for spiritual prosecution. Today we do not know our death day, but Rebbe Nachman implies we should live as if we did — with full urgency in Torah.",
    "he": ""
   },
   "intermediate": {
    "en": "T214: In earlier generations, people knew the day of their death (yom mitah) and therefore spent all their time in Torah study, giving no opening to the kateigor (accuser). Today, not knowing our death day, we lack this urgency — yet we are called to live with it. LM 214.",
    "he": "דורות הקדמונים ידעו יום מיתתם ועסקו בתורה כל היום — בלי מקום לקטרוג. אנו צריכים לחיות עם דחיפות זו גם בלי לדעת יום המות."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ריד׳ — \"בדורות הראשונים כשידעו יום מיתתם היו עוסקים בתורה כל היום — ולא היה שליטה למקטרג\"."
   }
  }
 ]
},
215: {
 "title_en": "Twenty-Four Kinds of Redemptions — Corresponding to Twenty-Four Courts",
 "title_he": "עשרים וארבעה מיני פדיונות כנגד עשרים וארבעה בתי דינין",
 "segs": [
  {
   "beginner": {
    "en": "There are twenty-four kinds of spiritual redemptions (pidyonot), corresponding to twenty-four heavenly courts of judgment. Each court presides over a different domain of spiritual challenge, and for each one there is a corresponding form of redemption — a way out, a sweetening of the decree. This teaching reflects Rebbe Nachman's comprehensive view of teshuvah and repair: no matter what a person has done, no matter which spiritual court has jurisdiction over them, there exists a corresponding path of return. The redemption precisely matches the court. No one is beyond reach.",
    "he": ""
   },
   "intermediate": {
    "en": "T215: Twenty-four types of pidyon (redemption) correspond to twenty-four heavenly batei din (courts of judgment) — each court has a matching redemption. Source: Adir BaMarom (Naso 136) and Adra Zuta (293). No spiritual domain is beyond redemption. LM 215.",
    "he": "עשרים וארבעה מיני פדיונות כנגד עשרים וארבעה בתי דינין. מקור: אדיר במרום (נשא קלו) ואדרא זוטא (רצג). אין תחום ללא גאולה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רטו׳ — כ״ד מיני פדיונות כנגד כ״ד בתי דינין; אדיר במרום נשא קלו; אדרא זוטא רצג."
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
print("lm-commentaries.json updated for T201-T215")

os.chdir(repo)
add = subprocess.run(['git','add'] + git_files, capture_output=True, text=True)
commit = subprocess.run(['git','commit','-m',
    'feat: T201-T215 PNC -- pesach-prayer/small-intellect-honor/shechinah-women/scholar-money-Torah/tikkun-haklali/lost-sheep/gevurot-speech/wicked-watchman/tamid-prayer/business-faith/rosh-hashana-tzaddik/clapping-tzelem/hidden-name/death-day-Torah/24-redemptions (22 segs)'],
    capture_output=True, text=True)
print("commit:", commit.returncode, commit.stdout.strip())
push = subprocess.run(['git','push','origin','main'], capture_output=True, text=True)
print("push:", push.returncode, push.stdout.strip() or push.stderr.strip())
