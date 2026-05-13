import json, os, subprocess

home = os.path.expanduser('~')
repo = os.path.join(home, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
lm_comm = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')

with open(lm_comm, encoding='utf-8') as fh:
    cdata = json.load(fh)

torahs = {
261: {
 "title_en": "When You Fall From Your Level — It's From Heaven, the Beginning of Drawing Near",
 "title_he": "כשאדם נופל ממדרגתו — מן השמים הוא, התחלת התקרבות",
 "segs": [
  {
   "beginner": {
    "en": "When you fall from your level — when you suddenly find yourself spiritually empty, distant, unable to feel anything — know that it comes from heaven. The fall is engineered. Distancing is the beginning of drawing near. The reason you fell is precisely so that you would arouse yourself to draw closer to Hashem with renewed force. The advice is therefore: begin again, fresh, as if you had never even started serving Hashem in your entire life. This is a great rule in avodat Hashem — every single day a person must begin completely anew. (Reb Noson adds: Rebbe Nachman returns to this principle in many places throughout his works — the necessity of strengthening yourself in avodah and never falling from anything in the world, only beginning fresh each time. Study this idea well, and it will be sweet to you forever.)",
    "he": ""
   },
   "intermediate": {
    "en": "T261: K'shenofel mi-madreigato — min ha-shamayim hi: richuk = hatchalat hitkarvut. The fall arouses fresh drawing near. \"L'hatchil m'chadash kol yom\" — kelal gadol b'avodat Hashem. LM 261.",
    "he": "נפילה ממדרגה — משמים, ריחוק תחילת קירוב. תחילת עבודה כל יום מחדש — כלל גדול."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״א — ריחוק תחילת קירוב; התחלה מחדש בכל יום."
   }
  }
 ]
},
262: {
 "title_en": "Through Renewing Torah Rivers Are Made — But First You Must Cry",
 "title_he": "ע\"י חידוש התורה — נהרות; אך צריך לבכות תחילה",
 "segs": [
  {
   "beginner": {
    "en": "Through renewing Torah — discovering fresh Torah insights — rivers are made. When you begin to innovate in Torah, a spring begins to gush: \"And a spring shall come forth from the House of Hashem\" (Joel 4:18) — the spring is the intellect, as in \"With wisdom is a house built\" (Proverbs 24:3). At first the spring is narrow and small; it widens and spreads until it becomes rivers, and everyone comes to drink from those rivers. But here is the danger. If you want to innovate Torah of substance, you must cry beforehand. Why? Because once the rivers are formed and everyone is drinking, the klipot and the sitra achra will also come to drink from them. So you must cry first — and through the crying you make rivers of tears, in the secret of \"From weeping, rivers are bound\" (Job 28:11). The klipot drink their fill from those tear-rivers, and once their portion is satisfied, the rivers of your subsequent Torah innovations can be channeled only to the places that need them — strangers can't drink from them. This is why the Tannaim called the composition of laws and innovations a \"masechta\" (tractate, lit. \"woven\"), in the secret of \"My drink I mingled with weeping\" (Psalms 102:10) — the drink (Torah innovation) must be mingled with tears (preparation). And this is why the verse says \"By the rivers of Babylon there we sat, also we wept\" (Psalms 137:1) — the Babylonian Talmud (the great river of innovation made near the yeshivot) was made together with weeping, because you must cry beforehand.",
    "he": ""
   },
   "intermediate": {
    "en": "T262: Chiddushei Torah → nehoros (\"u-ma'ayan mi-beit Hashem yetzei,\" Yoel 4:18; sechel as \"b'chochmah yibaneh bayit,\" Mishlei 24:3). But klipot also drink from these rivers — therefore precede with bechiyah, b'sod \"mi-bechi neharot chibesh\" (Iyov 28:11). \"V'shikui b'vechi masachti\" (Tehillim 102:9) → masechet. \"Al naharot Bavel sham yashavnu gam bachinu\" (Tehillim 137:1) — Talmud Bavli + bechiyah. LM 262.",
    "he": "חידוש תורה — נהרות. אך הקליפות שותות, צריך לבכות תחילה (איוב כח:יא; תהלים קב:י, קלז:א). שיקוי במסכת ובכי — תלמוד בבלי."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ב — יואל ד:יח; משלי כד:ג; איוב כח:יא; תהלים קב:י, קלז:א; חידוש תורה לפני שלא ישתו ממנו הקליפות."
   }
  }
 ]
},
263: {
 "title_en": "The Fever Comes From Excessive Eating — Animal Eating Damages Da'at",
 "title_he": "הקדחת — מאכילה יתירה; אכילת בהמה פוגמת בדעת",
 "segs": [
  {
   "beginner": {
    "en": "Rebbe Nachman teaches that the illness of fever (kadachat) — Hashem protect us — comes from excessive eating. The definition of \"man\" (adam) is one who eats only what he needs; when he eats more, he has slipped into the definition of \"animal\" — eating and chewing all day long. And likewise, when food is presented to a person containing sparks not yet refined — sparks still in their \"animal\" form not elevated to \"speaker\" (medabber) form — that too brings on this illness, unless the eater is a tremendous person who can leap a complete level and lift the food to the level of speech. When you eat \"animal food,\" you depart from the definition of man and descend to the definition of animal — \"You have caused men to ride over our heads\" (Psalms 66:12), the level of \"man\" is now above you. \"We have come into fire and water\" — fire and water are the heat and cold that battle within fever. The Avot d'Rabbi Natan (ch. 1) and Tanna d'Bei Eliyahu Rabbah (ch. 31) record: when Hashem said to Adam \"and you shall eat the grass of the field,\" his limbs trembled — \"shall I and a donkey eat from one trough?\" That trembling is the fever. When Hashem said \"by the sweat of your face you shall eat bread,\" his mind settled — because fever (the damage to da'at, which is the union of fire and water) is healed through sweat, and once sweat was decreed, the integrity of da'at was secured.",
    "he": ""
   },
   "intermediate": {
    "en": "T263: Kadachat ba'ah me-achilah yetera = achilat behemah, yetziah mi-geder adam. Sparks not me'vurarim li-mdabber → kadachat. \"Hirkavta enosh l'rosheinu... banu va-eish u-va-mayim\" (Tehillim 66:12) — fever = ish u-mayim. ARN 1; TdEi Rabbah 31: \"v'achalta et esev ha-sadeh\" → ridud — kadachat; \"b'ze'at apecha\" → settling = healing of da'at via ze'ah. LM 263.",
    "he": "קדחת — מאכילה יתרה (אכילת בהמה); ניצוצות שלא נתבררו לבחי' מדבר. \"באנו באש ובמים\" (תהלים סו:יב). אבות דר\"נ א; תדבא\"ר לא — \"בזעת אפיך\" — רפואת הקדחת ע\"י זיעה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ג — תהלים סו:יב; אבות דר\"נ פ\"א; תדבא\"ר פל\"א; דעת = חיבור אש ומים."
   }
  }
 ]
},
264: {
 "title_en": "Tzedakah Is the Repair of the Bris",
 "title_he": "צדקה — תיקון הברית",
 "segs": [
  {
   "beginner": {
    "en": "Tzedakah is the repair of the bris — the rectification of damage caused by misdirected channeling of energy. The damage of the bris is precisely this: a person was supposed to channel his hashpa'ah (spiritual influence/seed) in holiness to the proper place, but instead removed it from there and drew it, G-d forbid, to another place. The repair is therefore tzedakah, because through giving you again channel hashpa'ah to the place of holiness, and the original damage is reversed. This is hinted in the donation for the Mishkan: \"And the men came upon the women\" (Exodus 35:22) — that phrasing describes a kind of zivug (union) accomplished through donating to the Mishkan. But there is a critical caveat: when you give to a poor person who is not worthy, you damage further — you have once again channeled hashpa'ah to a place that doesn't need it. (See LM 31 and 54, where Rebbe Nachman also teaches that tzedakah is repair of the bris.)",
    "he": ""
   },
   "intermediate": {
    "en": "T264: Tzedakah = tikkun ha-bris — pegam = hashpa'ah l'makom shelo tzarich; tikkun = hashpa'ah l'kedushah via netinah. \"V'yavo'u ha-anashim al ha-nashim\" (Shemot 35:22) — zivug me-nidvat ha-mishkan. Caveat: giving to ani she-eino hagun = pegam mosif. Cf. LM 31, 54. LM 264.",
    "he": "צדקה תיקון הברית — חוזר ומשפיע למקום הקדושה. \"ויבואו האנשים על הנשים\" (שמות לה:כב). אך נתינה לעני שאינו הגון — פוגם יותר. ועיין סי׳ ל\"א, נ\"ד."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ד — שמות לה:כב; LM ל״א, נ״ד; צדקה כתיקון הברית."
   }
  }
 ]
},
265: {
 "title_en": "Why We Break a Clay Vessel at the Engagement",
 "title_he": "טעם שבירת כלי חרס בעת התנאים",
 "segs": [
  {
   "beginner": {
    "en": "Why is a clay vessel broken at the engagement (tena'im)? The reason: the souls of the matched couple are above one — joined at the root in the upper world (see Zohar Lech Lecha 85b, Diztzach, Zohar Tazria 43a). Below, however, their connection and unification is hidden — they don't even know about their bond until the match is announced. At the moment the engagement is finalized, that hidden unity is suddenly revealed. But it is revealed in the manner of \"and the chayyot ratzo va-shov\" (\"the living creatures running and returning,\" Ezekiel 1:14) — revealed and immediately concealed again, because right after engagement they separate; she remains forbidden to him until the chuppah. So at the moment of engagement, the light of their unity flashes and instantly hides. The verse continues: \"and the living creatures ran and returned k'mar'eh ha-bazak (like the appearance of lightning).\" The Talmud explains \"bazak\" as the light/spark that emerges from broken pottery — a spark that exists only for an instant. That is why we break a clay vessel: to enact the very phenomenon Yechezkel describes — the lightning-spark of revealed-and-concealed unity, exactly the dynamic of the moment of the match. (See further reasons in LM 60 and at the end of Likutey Tinyana.)",
    "he": ""
   },
   "intermediate": {
    "en": "T265: Sheviras kli cheres b'tena'im — neshamot ha-zug echad l'ma'alah (Zohar L\"L 85., Tazria 43.). L'matah ha-yichud b'he'lem ad ha-shidduch; az nig'leh u-miyad nis'tar — \"v'ha-chayot ratzo va-shov k'mar'eh ha-bazak\" (Yechezkel 1:14). Bazak = nitzotz mi-shevirat ha-cheres = momentary spark. Cf. LM 60; sof Tinyana. LM 265.",
    "he": "שבירת כלי חרס בתנאים — נשמות הזוג חד למעלה (זוהר ל\"ל פה.; תזריע מג.). \"ורצוא ושוב כמראה הבזק\" (יחזקאל א:יד) — הניצוץ מכלי חרס נשבר. עיין LM ס׳; סוף תניינא."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ה — יחזקאל א:יד; זוה\"ק ל\"ל פ\"ה ע\"ב, תזריע מ\"ג ע\"א; LM ס׳."
   }
  }
 ]
},
266: {
 "title_en": "Premature Animal Death Comes From Lack of Care in the Mitzvah of Sukkah",
 "title_he": "מיתת בהמות לפני זמנן — מפגם במצוות סוכה",
 "segs": [
  {
   "beginner": {
    "en": "Animals dying before their time comes from a person not being careful with the mitzvah of sukkah as he should be. Why? The sukkah is the aspect of \"mother that covers the children\" (Tikkunim 3) — the aspect of \"if you call to understanding\" (Proverbs 2:3). This is the very thing that distinguishes \"man\" from \"animal\": the Talmud (Berachot 10) on \"Bless Hashem, my soul, and forget not all His benefits\" — Hashem made breasts for women in the place of understanding (the chest), while animals nurse from breasts below. \"Man\" nurses from breasts in the place of understanding — that is sukkah. \"Animal\" nurses from breasts that are below.",
    "he": ""
   },
   "intermediate": {
    "en": "T266 §1: Mitat behemot lifnei zmanan — me-pegam mitzvat sukkah. Sukkah = ima de-chafia al banaha (Tikkunei Zohar 3) = \"im la-binah tikra\" (Mishlei 2:3). The differentia of adam mi-behemah: adam yonek mi-shedayim b'mekom binah (chest); behemah yoneket mi-shedayim shel matah (Berachot 10a on \"Barchi nafshi\"). LM 266 §a.",
    "he": "מיתת בהמות מפגם בסוכה. סוכה — אמא דחפיא על בנהא; \"אם לבינה תקרא\". אדם יונק משדי בינה, בהמה משדים שלמטה (ברכות י.)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ו §א׳ — תיקוני זוהר ג; משלי ב:ג; ברכות י."
   }
  },
  {
   "beginner": {
    "en": "When a person damages the mitzvah of sukkah, he falls from the aspect of \"breasts of man\" (which are in the place of understanding, the aspect of sukkah) and tumbles to the aspect of \"breasts of animal,\" sucking from there. He is now drawing his sustenance from the abundance allotted to animals. He sucks their life away — and through this they die, because their hashpa'ah has been redirected into him. The degree of damage to sukkah determines the degree of his fall and the amount of animal-abundance he siphons; correspondingly, the deaths of animals and beasts. This is hinted in \"and for his cattle he made sukkot\" (Genesis 33:17) — sukkah is for the cattle.",
    "he": ""
   },
   "intermediate": {
    "en": "T266 §2: Pegam ba-sukkah → nofel mi-shedei adam el shedei behemah → yonek shefa ha-behemah → mitatan b'lo zmanan. \"U-l'mikneihu asah sukkot\" (Bereishit 33:17). LM 266 §b.",
    "he": "פגם בסוכה — נפילה משדי אדם לשדי בהמה ויניקת שפעם → מיתה. \"ולמקנהו עשה סוכות\" (בראשית לג:יז)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ו §ב׳ — בראשית ל״ג:י״ז; פגם בסוכה — מיתת בהמות."
   }
  },
  {
   "beginner": {
    "en": "And similarly, those occupied in building harm themselves — as the Talmud says (Sotah 11): anyone who occupies himself with building becomes poor. Why? Because a house must be built with chochmah and sechel; only then will the building not harm the builder. As Proverbs 24:3-4 puts it: \"With wisdom a house is built, with understanding it is established, and with knowledge the chambers are filled\" (see Sanhedrin 92a — once the house is built with chochmah, there is a place for shefa to enter). When you build without sechel, the building harms you, and the punishment is poverty — poverty is itself the aspect of damaged chochmah, \"the wisdom of the poor is despised\" (Ecclesiastes 9:16).",
    "he": ""
   },
   "intermediate": {
    "en": "T266 §3: Bonim u-mit'asseik b'binyan → mit'aniyim (Sotah 11). \"B'chochmah yibaneh bayit, u-vitvunah yiskonan, u-v'da'at chadarim yimal'u\" (Mishlei 24:3-4; Sanhedrin 92a). Aniyut = pegam ha-chochmah, \"v'chochmat he-misken b'zuyah\" (Kohelet 9:16). LM 266 §c.",
    "he": "בונה בית בלי דעת — מתעני (סוטה יא.). \"בחכמה יבנה בית\" (משלי כד:ג); \"וחכמת המסכן בזויה\" (קהלת ט:טז)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ו §ג׳ — סוטה י״א; משלי כד:ג-ד; קהלת ט:טז; סנהדרין צ\"ב."
   }
  },
  {
   "beginner": {
    "en": "Therefore, through the sukkah — which is the aspect of binah, \"if you call to understanding\" — one is empowered to build a house in the aspect of \"with chochmah a house is built.\" This is hinted in \"And Yaakov journeyed to Sukkot, and built himself a house\" (Genesis 33:17) — sukkah first, then house. And this is the connection between Sukkot and Shavuot — they are essentially one, because the Torah comes out from binah (which is sukkah): \"and forsake not the Torah of your mother\" (Proverbs 1:8). Therefore Simchat Torah comes immediately after Sukkot — once you have entered the sukkah, you have entered the source-place from which Torah emerges. Then begins the cycle anew at Bereishit (\"in the beginning\") — \"beit reishit,\" the beit (house) of beginning, the very same Yaakov \"sukkotah and built him a house.\" In the verse \"and Yaakov journeyed Sukkotah and built\" — the initial letters spell Tziyon twice (with vav-yud counted), hinting at matan Torah, the cycle of Shavuot embedded in the cycle of Sukkot.",
    "he": ""
   },
   "intermediate": {
    "en": "T266 §4: Sukkah (binah) → \"b'chochmah yibaneh bayit.\" \"Va-yisa Ya'akov Sukkotah va-yiven lo bayit\" (Bereishit 33:17). Sukkot u-Shavuot chad — Torah yotzeit mi-binah, \"ve-al titosh torat imecha\" (Mishlei 1:8); Simchat Torah miyad acharei Sukkot. \"Bereishit\" = beit-reishit — the bayit. \"Va-yisa Ya'akov Sukkotah va-yiven\" rashei tevot Tziyon kaful (per Shulchan Aruch EHE 126:7). LM 266 §d.",
    "he": "סוכה (בינה) → בית. \"ויסע יעקב סוכותה ויבן לו בית\" (בראשית לג:יז). סוכות ושבועות חד — תורה מבינה (משלי א:ח). ר\"ת ויסע יעקב סוכותה ויבן = ציון כפול."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ו §ד׳ — בראשית לג:יז; משלי א:ח; שו\"ע אהע\"ז קכ\"ו ז׳; אחדות סוכות ושבועות."
   }
  }
 ]
},
267: {
 "title_en": "Shavuot Is a Remedy for the Lungs",
 "title_he": "שבועות — רפואה לריאה",
 "segs": [
  {
   "beginner": {
    "en": "Shavuot is a remedy for the lungs. The five lobes of the lungs correspond to the five books of the Torah (Tikkunim 25) — and on Shavuot, when we receive the Torah, we can receive renewed life. The Torah received through the lungs (the breath of speech, \"a-merica chamishah chumshei Torah\") heals the lungs themselves.",
    "he": ""
   },
   "intermediate": {
    "en": "T267: Shavuot refuah la-rei'ah — chamishah avarei rei'ah k'neged chamishah chumshei Torah (Tikkunim 25). Kabbalat ha-Torah → chayim mechudashim. LM 267.",
    "he": "שבועות רפואה לריאה — חמשת אבריה כנגד חמשה חומשי תורה (תיקונים כ\"ה); קבלת התורה — חיים מחודשים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ז — תיקוני זוהר כ\"ה; חמשה אברי הריאה כנגד חמשה חומשי תורה."
   }
  }
 ]
},
268: {
 "title_en": "Without Focus on the Purpose, Why Does a Person Need Life?",
 "title_he": "בלא תכלית — למה לו חיים? — סוד הרפואה",
 "segs": [
  {
   "beginner": {
    "en": "When a person doesn't focus on the tachlit — the ultimate purpose, serving Hashem — why does he even need life? The soul always longs to fulfill the will of its Creator. When the soul sees the person isn't doing His will, it begins to long intensely to return to its root, and starts drawing itself to depart from the body. From this the person becomes ill — the soul's power within him is weakened as it pulls away, because he is not fulfilling its desire (it wants only the will of Hashem). So why do medicines bring people back to health? Here is the secret: the soul sees that this person is willing to force himself against his desire and habit. He is used to eating bread and other normal foods, but now he overrides his desire and accepts bitter medicines and unpleasant drugs for his health. When the soul sees that he can force himself for some purpose, it returns to him — hoping that he will eventually force himself for the true purpose, to do the will of his Creator.",
    "he": ""
   },
   "intermediate": {
    "en": "T268: B'lo tachlit — lamah lo chayim? Ha-neshamah me'shtokeket l'mal'ot ratzon Borah — k'shero'ah she-eino — \"shofetet l'tzeit\" → choli. Refu'ah me'sheevet ha-neshamah ki ro'ah she-yodea li-fnos atzmo neged ratzono u-tziva la-tachlit (mar'or shel sammim) — tikvah she-yifnos atzmo gam la-tachlit ha-amiti. LM 268.",
    "he": "בלא תכלית — למה חיים? הנשמה מתאוה לשוב לשרשה. רפואה — שהנשמה רואה שיכול לכוף עצמו (מרורות סמים) ומקווה שיכוף עצמו גם לתכלית האמיתי."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ח — חיים על תכלית; סוד הרפואה — כפיית עצמו."
   }
  }
 ]
},
269: {
 "title_en": "From the Tzaddik's Dwelling, the Generation's Deeds Are Recognized",
 "title_he": "ממקום מושב הצדיק — ניכרים מעשי הדור",
 "segs": [
  {
   "beginner": {
    "en": "From the dwelling of the tzaddik, the deeds of the generation are recognized. The state of the generation can be read from where the tzaddik chooses to sit and how he is positioned. The tzaddik's location is itself a diagnostic: where he dwells reveals the spiritual landscape of the dor.",
    "he": ""
   },
   "intermediate": {
    "en": "T269 §1: Mi-meqom moshav ha-tzaddik nikkarim ma'asei ha-dor. The tzaddik's place reads the dor. LM 269 §a.",
    "he": "ממקום מושב הצדיק ניכרים מעשי הדור."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ט §א׳ — מושב הצדיק כראי לדור."
   }
  },
  {
   "beginner": {
    "en": "And the siman for this matter (in Rebbe Nachman's own language): \"And she sat under the palm tree\" (Judges 4:5) — Devorah the prophetess, who judged Israel under a palm. The Talmud (Megillah 14a) asks: why specifically a palm? Because a palm has only one heart — and so does Israel. The tzaddik sits under \"one-hearted\" Israel, and from his seat the unity (or fragmentation) of the heart of the dor is revealed. (End of his holy language.)",
    "he": ""
   },
   "intermediate": {
    "en": "T269 §2: Siman: \"v'hi yoshevet tachat tomer\" (Shoftim 4:5) — Megillah 14a: \"mah tomer eino mit'palet ela lev echad af Yisrael ein lahem ela lev echad.\" Tzaddik yoshev tachat \"lev echad\" Yisrael. LM 269 §b.",
    "he": "וסימן: \"והיא יושבת תחת תומר\" (שופטים ד:ה). תומר — לב אחד, כך ישראל (מגילה יד.)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רס״ט §ב׳ — שופטים ד:ה; מגילה י״ד; תומר=לב אחד=ישראל."
   }
  }
 ]
},
270: {
 "title_en": "Just as One Person Arouses Another — A Person Arouses Himself From His Own Words",
 "title_he": "כשם שיש התעוררות מחבר לחבר — כך מאדם לעצמו",
 "segs": [
  {
   "beginner": {
    "en": "Just as there is hitorerut (arousal) from one person to another — when you see your friend saying selichot and crying out with broken-hearted arousal, your friend's stirring kindles your own; you start looking at yourself, and begin saying your own words with arousal of the heart — so too within a single person there is hitorerut from himself to himself, from his own words. He is saying his supplications and crying out \"woe is me, woe is me,\" and within those very words an arousal kindles. He starts looking at himself: \"Wait — where am I? Who is this person crying so? Isn't it I myself who am the woe?\" And then he begins a second time, crying out \"woe is me, to me precisely!\" — this time meaning it. Even though at the start it seemed to him that he was already saying it sincerely, afterwards he can see the difference between before and after. \"And understand.\"",
    "he": ""
   },
   "intermediate": {
    "en": "T270: K'shem she-yesh hitorerut me-chaver l'chaver — kakh me-ha-adam l'atzmo: hitorerut mi-divrei atzmo. He starts \"oy li, oy li\" superficially — then awakens within: \"mi ha-bochkeh? halo li, li mamash!\" — and re-enters with intent. Yotza ha-hefresh bein techilah l'sof. \"V'havein.\" LM 270.",
    "he": "התעוררות מחבר לחבר — וכמוה מהאדם לעצמו. אומר \"אוי לי\" ומיד מתעורר: \"מי הצועק? הלא לי, לי ממש!\" — וחוזר ואומר באמת. והבן."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״ע — התעוררות עצמית מתוך תפילה."
   }
  }
 ]
},
271: {
 "title_en": "One Must Have Boldness of Holiness — Even Toward the Rabbi",
 "title_he": "צריך עזות דקדושה — אף עם הרב",
 "segs": [
  {
   "beginner": {
    "en": "A person must have azut d'kedushah — boldness of holiness — as taught in many places (Avot 5:20: \"Be bold as a leopard\"). This boldness is needed even toward the rabbi himself: you must strengthen yourself to speak openly with him about everything you need, and not be ashamed. Why does one chassid draw closer to the rabbi than another? Only because he has greater inner boldness — and because of that, he speaks with the rabbi more. But the boldness itself depends on something deeper: it comes from his service. When a person serves Hashem and labors much in avodah, that gives him the inner confidence to speak with the rabbi. And through speaking with him, he becomes further aroused — and through that arousal, he serves and accomplishes even more. So this depends on that and that depends on this. The world has many things mutually dependent like this — we don't know where the beginning lies, because each begins from its counterpart and one supports the other.",
    "he": ""
   },
   "intermediate": {
    "en": "T271: Tzarich azut di-kedushah — \"hevei az ka-namer\" (Avot 5:20) — even im ha-rav. Mi she-mit'kareiv yoter — yesh lo azut yoter — koach la-azut me-ha-avodah. Avodah → azut → dibbur im ha-rav → hitorerut → avodah more. The cycle has no clear hatchalah — \"zeh tzarich la-zeh.\" LM 271.",
    "he": "צריך עזות דקדושה (אבות ה:כ) — אף עם הרב. עזות מהעבודה; דיבור עם הרב מעורר עבודה נוספת. זה צריך לזה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״א — אבות ה:כ; עזות דקדושה תלויה בעבודה."
   }
  }
 ]
},
272: {
 "title_en": "'Today, If You Will Hear His Voice' — Live Only Today",
 "title_he": "\"היום אם בקולו תשמעו\" — רק היום",
 "segs": [
  {
   "beginner": {
    "en": "\"Today, if you will hear His voice\" (Psalms 95:7) — this is a great rule in avodat Hashem: a person should keep only the present day before his eyes — whether for parnassah, personal needs, or anything else. He should not plan from one day to the next, as the holy books teach. The same applies to divine service: focus only on today, only on this hour. When a person tries to take on avodat Hashem, it can feel like an unbearable burden — too heavy to carry. But if he thinks he has only this one day, the burden vanishes. And even more — don't postpone from day to day, saying \"tomorrow I'll start,\" \"tomorrow I'll pray with proper kavvanah and strength.\" A person has only this day, only this moment. Tomorrow is a completely different world. \"Today, if you will hear His voice\" — today specifically. Understand this well.",
    "he": ""
   },
   "intermediate": {
    "en": "T272: \"Ha-yom im b'kolo tishma'u\" (Tehillim 95:7) — kelal gadol: rak ha-yom ha-zeh, rak ha-sha'ah ha-zot. Avodah she-nidmeh ki-mas'a kaved — kalah k'she-rak \"ha-yom.\" Lo \"machar a'aseh\" — ein la-adam b'olamo ela ha-yom v'ha-rega' atah. \"Ha-yom\" davka. V'havein heitev. LM 272.",
    "he": "\"היום אם בקולו תשמעו\" (תהלים צה:ז) — רק היום, רק השעה. עבודה כבדה הופכת קלה. \"מחר עולם אחר.\""
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ב — תהלים צה:ז; עבודה ביום אחד."
   }
  }
 ]
},
273: {
 "title_en": "Some Great Souls Beget Souls Above the 600,000",
 "title_he": "יש עליונים מאוד — מולידים נשמות שמעל הששים ריבוא",
 "segs": [
  {
   "beginner": {
    "en": "Know that there are sons born in this world, but there are very great elevated ones (elyonim me'od) who beget souls higher than the souls that clothe themselves in regular sons born to the world. All souls in the world number sixty myriad (600,000); even when there appear to be more, the additional souls are only sub-divisions of those original sparks — in essence still 600,000. But the souls referred to here are above the 600,000 entirely; they are not fit at all to clothe in this world, and even when they do come into this world, they are not considered part of it at all. This is the secret of \"the sons of Moshe Rabbeinu\" — about whom it is written, \"and the sons of Rechavyah multiplied upward\" (I Chronicles 23:17), and the sages expounded (Berachot 7a): \"upward — above the sixty myriad,\" because they were above the regular souls.",
    "he": ""
   },
   "intermediate": {
    "en": "T273: Yesh elyonim me'od she-molidim neshamot l'ma'alah me-ha-shishim ribbo. \"U-vnei Rechavyah ravu l'ma'alah\" (Divrei Hayamim I 23:17), Berachot 7a: \"l'ma'alah min ha-shishim ribbo\" — bnei Moshe. Ein einam shayachim l'olam ha-zeh kol ikar. LM 273.",
    "he": "יש עליונים מאוד — מולידים נשמות שמעל ששים ריבוא. \"ובני רחביה רבו למעלה\" (דה\"א כג:יז; ברכות ז.) — בני משה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ג — דה\"א כג:יז; ברכות ז.; בני משה למעלה משש ריבוא."
   }
  }
 ]
},
274: {
 "title_en": "The Wicked Who Toil to Achieve Complete Denial",
 "title_he": "רשעים העמלים להגיע לכפירה גמורה",
 "segs": [
  {
   "beginner": {
    "en": "Know that there are wicked people who labor and toil all their days to uproot themselves completely from Hashem and from His Torah. Why? Because the holy point of Israel's kedushah that still remains within them — even when they are total resha'im — keeps confusing them, sending them thoughts of teshuvah and fear of the great judgment. Because of this they get no pleasure from their averos and ta'avot — that little point won't let them be. So they desire and toil to reach total denial in their da'at, G-d forbid, in such a way that they will have no remaining inclination toward the truth. But this requires very, very great toil over many many years — Hashem save us. The Yiddishkeit inside them keeps confusing them, and never lets them go.",
    "he": ""
   },
   "intermediate": {
    "en": "T274 §1: Yesh resha'im ameilim kol yamehem la-akor atzmam legamrei me-Hashem. Ha-nekudah ha-kedoshah she-ba-Yisrael me'arvevet otam, mevi'ah hirhurei teshuvah u-yir'ah me-yom ha-din. They strive l'kefirah gemurah b'ein safek — toil rav, shanim arukot, ha-Yahadut she-bi-fenim mef'rivah otam. LM 274 §a.",
    "he": "רשעים עמלים להגיע לכפירה גמורה — אך נקודת הקדושה שבהם מבלבלתם בתשובה ויראה. צריכים עמל רב ושנים ארוכות."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ד §א׳ — נקודת הקדושה שבישראל מונעת רשעם הגמור."
   }
  },
  {
   "beginner": {
    "en": "And know — there are some of them who, when they finally reach the very thing they desired (complete kefirah without any doubt of truth, G-d forbid), in that very moment they die from the world. And then they see the truth. Their last achievement is the punishment that delivers them to face it.",
    "he": ""
   },
   "intermediate": {
    "en": "T274 §2: Yesh me-hem she-mi-yad sheh-magia l'kefirah gemurah — meit, v'az ro'eh es ha-emet. The completion of denial is delivery to truth. LM 274 §b.",
    "he": "מהם — בהגיעם לכפירה גמורה, מתים, ואז רואים האמת."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ד §ב׳ — סיום הכפירה — ראיית האמת בעולם הבא."
   }
  }
 ]
},
275: {
 "title_en": "Every Mitzvah Makes a Candle — For Searching the King's Treasures",
 "title_he": "כל מצוה — עושה ממנה נר; לחיפוש באוצרות המלך",
 "segs": [
  {
   "beginner": {
    "en": "Every single mitzvah you perform creates one candle from it (Zohar Terumah 166). When a person passes away, if it is a great soul very precious to Hashem, the soul is granted permission to search the treasuries of the King — to take whatever it wants from Hashem's treasures. This is the ultimate of all the pleasures of olam ha-ba. And to search you need candles — as the Talmud says (Pesachim 10a): bedikah is done with candles, learning from \"the candle of Hashem is the soul of man, searching all the chambers of the belly\" (Proverbs 20:27). The candles are made from the mitzvot, in the secret of \"a mitzvah is a candle\" (Proverbs 6:23). With those candles, the soul searches the treasuries after departure. This is the secret of \"ba-meitim chofshi\" (\"free among the dead,\" Psalms 88:6) — once a person dies, he is freed from the mitzvot (Shabbat 151a). \"Chofshi\" (free) is the same root as \"chofeis\" (search): the freedom is the searching that is enabled by the very mitzvot one performed. But there is a tzaddik who kills himself in his lifetime — through hitbatlut, through self-nullification — and he searches in his Father's treasuries even while still alive, accessing divine wisdom in this world.",
    "he": ""
   },
   "intermediate": {
    "en": "T275: Kol mitzvah → ner echad (Zohar Terumah 166). After petirah, neshamah ha-yekarah u-gedolah is given to chofeis b'otzerot ha-melech — tachlit ta'anugei olam ha-ba. Bedikah b'nerot (Pesachim 10a; Mishlei 20:27). \"Ner mitzvah\" (Mishlei 6:23). \"Ba-meitim chofshi\" (Tehillim 88:6; Shabbat 151a) — chofshi = chofeis. Yesh tzaddik she-meimit atzmo b'chayav v'chofeis b'otzerot Aviv b'chayim. LM 275.",
    "he": "כל מצוה — נר אחד (זוהר תרומה קסו). לחפש באוצרות המלך לאחר פטירה — \"נר ה׳ נשמת אדם\" (משלי כ:כז); \"נר מצוה\" (משלי ו:כג). \"במתים חופשי\" (תהלים פח:ו; שבת קנא.) — חופשי לשון חיפוש. ויש צדיק שממית עצמו בחייו וחופש באוצרות אביו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ה — זוה\"ק תרומה קס\"ו; פסחים י.; משלי ו:כג, כ:כז; תהלים פח:ו; שבת קנא.; חיפוש באוצרות המלך ע\"י נרות המצוות."
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
print("lm-commentaries.json updated for T261-T275")

os.chdir(repo)
add = subprocess.run(['git','add'] + git_files, capture_output=True, text=True)
commit = subprocess.run(['git','commit','-m',
    'feat: T261-T275 PNC -- fall-from-level/torah-rivers/fever-eating/tzedakah-bris/clay-vessel-engagement/sukkah-animal-deaths/shavuot-lungs/tachlit-life/tzaddik-dwelling/self-arousal/azut-rav/today-only/elyonim-souls/wicked-kefirah/mitzvah-candle (20 segs)'],
    capture_output=True, text=True)
print(f'commit: {commit.returncode}', commit.stdout, commit.stderr)
push = subprocess.run(['git','push','origin','main'], capture_output=True, text=True)
print(f'push: {push.returncode}', push.stdout, push.stderr)
