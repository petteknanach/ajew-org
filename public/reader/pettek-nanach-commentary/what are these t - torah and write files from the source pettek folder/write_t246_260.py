import json, os, subprocess

home = os.path.expanduser('~')
repo = os.path.join(home, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
lm_comm = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')

with open(lm_comm, encoding='utf-8') as fh:
    cdata = json.load(fh)

torahs = {
246: {
 "title_en": "Sometimes a Person Needs to Have Greatness for Himself",
 "title_he": "לפעמים האדם צריך להיות לו גדולה לעצמו",
 "segs": [
  {
   "beginner": {
    "en": "Sometimes a person actually needs to assume an air of greatness for himself, as Scripture says of King Yehoshafat: \"And his heart was lifted up in the ways of Hashem\" (II Chronicles 17:6). This sounds backwards — isn't humility the foundation? But Rebbe Nachman explains: when a person needs to ascend to a new spiritual attainment, he must first forget what he already knew. The Talmud (Bava Metzia 85a) says Rabbi Zeira fasted in order to forget the Talmud of Babylonia, because he was about to receive the deeper Torah of Eretz Yisrael. Greatness functions like that fast — it makes a person forget his old wisdom (\"anyone who is haughty, his wisdom departs from him,\" Pesachim 66b), clearing space for a higher level. But this is razor-edge work: real arrogance is a severe sin and would simply destroy his wisdom and turn him into a fool. The skill is to use \"greatness\" only as a tool to forget the old wisdom — while remaining genuinely humble inside.",
    "he": ""
   },
   "intermediate": {
    "en": "T246: A person sometimes needs gadlut (elevated bearing) for himself, as in \"va-yigbah libo b'darchei Hashem\" (II Chr 17:6). It functions like Rabbi Zeira's fast (BM 85a) — to forget prior wisdom and reach a higher attainment, since \"kol ha-mityaher chochmato mistalleket mimenu\" (Pes 66b). But it requires extra umanut: greatness only as a tool, true humility inside.",
    "he": "צריך לפעמים גדלות לעצמו (דה\"ב יז:ו) — כתענית ר' זירא (ב\"מ פה.) לשכוח חכמתו הקודמת ולעלות. אך צריך אומנות יתרה — גדלות רק לשכחת חכמה, ובאמת ענוה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ו — דה\"ב יז:ו; ב\"מ פה.; פסחים סו:; שימוש בגדלות ככלי לשכחת חכמה קודמת ועלייה למדרגה."
   }
  }
 ]
},
247: {
 "title_en": "'Teiku' Is the Aspect of Lacking Repair",
 "title_he": "'תיקו' — בחינת חסרון תיקון",
 "segs": [
  {
   "beginner": {
    "en": "Whenever the Talmud cannot resolve a question, it concludes with the word \"teiku\" — \"let it stand.\" The Zohar (Ra'aya Mehemna, Tzav 27b) reveals a hidden secret: the word \"teiku\" is really the word \"tikkun\" (repair) with the straight nun missing. When the straight nun departs from \"tikkun,\" what remains is \"teiku\" — the unresolved question. And once that straight nun falls and becomes bent (the final nun ן), the very same letters of \"tikkun\" rearrange into \"kinot\" — lamentations. So unresolved questions in Torah, the bent posture of mourning, and the longing for repair are all the same letters in different configurations. The redeemer will straighten the nun, and then \"kinot\" will be turned back into \"tikkun,\" and every \"teiku\" will be answered.",
    "he": ""
   },
   "intermediate": {
    "en": "T247: Per Zohar Ra'aya Mehemna Tzav 27b, \"teiku\" = \"tikkun\" minus the straight nun. When the nun bends down (final nun), the same letters become \"kinot.\" Mashiach will straighten the nun: kinot → tikkun, and every teiku will be repaired. LM 247.",
    "he": "תיקו = תיקון חסר נון זקופה (זוהר רעיא מהימנא צו כז:). הנון הזקופה נופלת ונכפפת ונעשה קינות. בגאולה תתהפך הנון לקינות — לתיקון."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ז — זוה\"ק רע\"מ צו כ\"ז ע\"ב; תיקו = תיקון חסר נ׳; קינות→תיקון בגאולה."
   }
  }
 ]
},
248: {
 "title_en": "Stories of the Deeds of Tzaddikim Are an Exceedingly Great Thing",
 "title_he": "סיפורי מעשיות מצדיקים — דבר גדול מאוד",
 "segs": [
  {
   "beginner": {
    "en": "Telling stories of the deeds of tzaddikim is an extraordinarily great thing — Rebbe Nachman says \"davar gadol me'od.\" Here is why: when a tzaddik served Hashem during his lifetime, his service made an impression on the world. That impression doesn't disappear when the story is told — on the contrary, it is reactivated. As you tell over what the tzaddik did, the original impression of his avodah comes alive in the room and arouses the listeners' hearts to Hashem with intense longing. This is why Breslover Chassidim spend so much time telling stories of Rebbe Nachman, the Baal Shem Tov, Reb Noson — it isn't nostalgia or hagiography. The story-telling literally reawakens the spiritual force the tzaddik released into the world the first time he served Hashem.",
    "he": ""
   },
   "intermediate": {
    "en": "T248: Sippurei ma'asiyot mi-tzaddikim is davar gadol me'od. The roshem of the tzaddik's avodah is reactivated through the telling — heart kindles to Hashem with great hitorerut. LM 248.",
    "he": "סיפורי מעשיות מצדיקים — דבר גדול מאוד. הרושם שעשה הצדיק בעבודתו מתעורר בעת הסיפור ומלהיב הלב לה׳."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ח — סיפורי מעשיות הצדיקים מעוררים רושם עבודתם בלב השומעים."
   }
  }
 ]
},
249: {
 "title_en": "The Main Strength Is in the Heart",
 "title_he": "עיקר הגבורה — בלב",
 "segs": [
  {
   "beginner": {
    "en": "Real strength isn't in the muscles — it's in the heart. A person whose heart is strong, who fears no man and no thing, can perform extraordinary feats and conquer wars, because he runs straight into battle without flinching. This is the inner meaning of the Mishnah (Avot 4:1): \"Who is strong? He who conquers his inclination\" — that is also strength of the heart. Samson is the archetype: \"And the spirit of Hashem began to stir him in the camp of Dan, between Tzor'ah and Eshtaol\" (Judges 13:25). The Spirit didn't add muscle — it clothed his heart with might. Once strength entered his heart, the awesome physical feats followed. Bottom line: outer strength is downstream of inner courage.",
    "he": ""
   },
   "intermediate": {
    "en": "T249: Ikar gevurah ba-lev — outer feats follow inner courage. Eizehu gibbor? Ha-kovesh et yitzro (Avot 4:1). Samson: ru'ach Hashem clothed his heart with gevurah (Shoftim 13:25). LM 249.",
    "he": "עיקר הגבורה בלב. \"איזהו גיבור — הכובש את יצרו\" (אבות ד:א). שמשון לבש גבורה בלבו ע\"י רוח ה׳ (שופטים יג:כה)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רמ״ט — אבות ד:א; שופטים יג:כה; גבורת הלב מקור כל גבורות."
   }
  }
 ]
},
250: {
 "title_en": "All Suffering and Affliction Come Only From Lack of Da'at",
 "title_he": "כל הצרות והייסורים — מחסרון הדעת",
 "segs": [
  {
   "beginner": {
    "en": "Rebbe Nachman states it bluntly: every form of suffering and every kind of affliction comes only from a lack of da'at — true awareness that everything is under Hashem's hashgachah (providence). Whoever has real da'at and knows Hashem gave and Hashem took (Job 1:21) experiences no afflictions and feels no suffering. Even when there are unavoidable physical pains — like the tearing of soul from body in dying, the pain of illness as the soul begins to depart — these pains are felt only because soul and body are bound together with such tight, strong bonds. But even those pains become very light and easy to bear when a person has clear da'at that everything is under Hashem's providence.",
    "he": ""
   },
   "intermediate": {
    "en": "T250 §1: Kol ha-tzarot v'ha-yissurim — only mi-chesron da'at. With da'at of Hashem natan v'Hashem lakach (Iyov 1:21), no afflictions felt. Even unavoidable physical pains (e.g., yetziat ha-neshamah) become light when da'at of hashgachah is clear. LM 250.",
    "he": "כל הצרות והייסורים מחסרון הדעת. \"ה׳ נתן וה׳ לקח\" (איוב א). אף ייסורי הגוף הכרחיים — קלים בדעת ההשגחה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״נ §א׳ — איוב א:כא; ייסורים כלם מחסרון דעת ההשגחה."
   }
  },
  {
   "beginner": {
    "en": "And all the more so other forms of suffering — when one has true da'at, one doesn't feel them at all. The very essence of suffering in afflictions is that the da'at is taken away from the person so he will feel them. This is the main suffering of Israel in exile: it all stems from the fact that we have fallen from da'at and attribute everything to nature, to chance, and to mazal (fortune). And this comes specifically from dwelling among the idolatrous nations and learning from them — seeing the nations succeeding while Israel is despised, we adopt their worldview and credit nature instead of Hashem. In truth, Israel stands above nature; only when we sin do we fall under it like the gentiles, and only then do exile and suffering have a grip on us. When Hashem wants to redeem us, He draws upon us hashgachah from the very end of the world — because at the end of days nature itself will be nullified (\"For the heavens like smoke will vanish,\" Isaiah 51:6). The constellations will be confused, mazal will fall away, and only providence will remain.",
    "he": ""
   },
   "intermediate": {
    "en": "T250 §2: Ikar ha-yissurim is the removal of da'at to make him feel them. Israel's galut: nafalu mi-da'at, talu ha-kol b'teva u-mazal mi-pe'ulat ha-akum. B'emet Yisrael l'malah min ha-teva. Geulah: hashgachah nimshechet mi-sof ha-olam, where teva will be nullified (Yeshayahu 51:6). LM 250 §b.",
    "he": "ייסורי גלות — נפילה מדעת ההשגחה ותליית הכל בטבע ומזל. הגאולה: השגחה מסוף העולם, שאז יבטל הטבע (ישעיה נא:ו)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״נ §ב׳ — ישעיה נא:ו; ביטול הטבע לעת"
   }
  },
  {
   "beginner": {
    "en": "Through this hashgachah Israel rises above the nations and an end is brought to those who oppress them — this is \"ketz ba ha-ketz\" (the end has come to the end, Ezekiel 7:2). Tefillah itself is the aspect of hashgachah above nature: nature dictates one outcome, but prayer changes nature. This is what the Torah calls our greatness: \"For who is a great nation that has G-d so close to it as Hashem our G-d whenever we call upon Him\" (Devarim 4:7) — Hashem hears prayer and changes nature through providence. The Talmud (Berachot 59a) describes the earthquake (gohah): when Hashem remembers His children dwelling in suffering among the nations, He drops two tears into the great sea, and His voice is heard from one end of the world to the other. The two tears are hashgachah being drawn down — because tears literally take the power of sight (\"the clouds return after the rain\" — sight that follows weeping, Shabbat 151a). Tears carry providence. Hezekiah \"wept a great weeping\" when sick (Isaiah 38:3), and David \"became great\" through his weeping over his suffering (II Sam) — because their tears reached the level of hashgachah, and through hashgachah they were saved.",
    "he": ""
   },
   "intermediate": {
    "en": "T250 §3: Yisrael oleh u-vatel akum b'hashgachah — \"ketz ba ha-ketz\" (Yechezkel 7:2). Tefillah = hashgachah l'malah min ha-teva, \"mi goy gadol\" (Devarim 4:7). Gohah (Berachot 59a): two tears = hashgachah drawn from sof ha-olam. Tears carry re'iyah (Shabbat 151a — \"v'shavu he-avim achar ha-geshem\"). Chizkiyahu \"bachah b'chi gadol\" (Yesh 38:3); David \"halokh v'gadol.\" LM 250 §c.",
    "he": "תפילה — השגחה למעלה מהטבע. \"מי גוי גדול\" (דברים ד:ז). שתי דמעות = המשכת השגחה (ברכות נט.; שבת קנא.). חזקיהו \"בכי גדול\", דוד \"הלוך וגדול\"."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״נ §ג׳ — יחזקאל ז:ב; דברים ד:ז; ברכות נט.; שבת קנא.; ישעיה לח:ג; ש\"ב ה:י."
   }
  },
  {
   "beginner": {
    "en": "Why specifically tears? Because when a person has torments and suffering, what he most needs is hashgachah — direct providence — to reach salvation. Tears are the conduit through which providence and \"sight\" are drawn into him. Without tears, you remain locked inside teva. Tears break the seal.",
    "he": ""
   },
   "intermediate": {
    "en": "T250 §4: Tears at time of suffering open the channel of hashgachah and re'iyah — without them one stays under teva. LM 250 §d.",
    "he": "דמעות בעת הצרה — פתיחת צינור ההשגחה והראייה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״נ §ד׳ — דמעות מושכות השגחה."
   }
  },
  {
   "beginner": {
    "en": "And so the tears draw down hashgachah and \"sight\" — because providence is drawn through them, as in \"the clouds return after the rain\" (Ecclesiastes 12:2; Shabbat 151a) — sight that follows weeping. Crying diminishes physical eyesight precisely because the eyes' \"sight\" is being transferred into the tears, where it becomes a vessel for divine providence. This explains why Hezekiah wept \"a great weeping\" (Isaiah 38:3) when he was sick: his weeping drew down the aspect of \"great\" — the providence of prayer that overrides nature. And when David wept over his suffering, the verse says \"David grew greater\" — his weeping reached the level of hashgachah called \"great,\" and through that providence he was saved from every form of suffering.",
    "he": ""
   },
   "intermediate": {
    "en": "T250 §5: Tears carry re'iyah (Kohelet 12:2; Shabbat 151a) — the eye's sight transfers into the tear, becoming a vessel for hashgachah. Chizkiyahu's \"bechi gadol\" and David's \"halokh v'gadol\" are tears that reach gadlut/hashgachah → yeshu'ah. LM 250 §e.",
    "he": "דמעות נוטלות מן הראייה (קהלת יב:ב; שבת קנא.) — והראייה נמשכת בהן כצינור השגחה. \"בכי גדול\" של חזקיהו ו\"הלוך וגדול\" של דוד — דמעות בבחינת השגחה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״נ §ה׳ — קהלת יב:ב; שבת קנא.; ישעיה לח:ג; ש\"ב ה:י."
   }
  }
 ]
},
251: {
 "title_en": "Through Wars and Division Heretical Thoughts Fall — The Repair Is Truth and Charity",
 "title_he": "ע\"י מלחמות ומחלוקת — מחשבות זרות; התיקון: אמת וצדקה",
 "segs": [
  {
   "beginner": {
    "en": "When wars and division (machloket) erupt, thoughts of the wicked — heretical thoughts, denial of Hashem — fall onto fit, decent people. The repair is to hand the war over to Hashem: \"Hashem will fight for you\" (Exodus 14:14). But there is a catch. The wicked also give charity (we see even gentile kings giving tzedakah — \"He gives generously to the poor,\" Proverbs 28:8 per Rashi). The strength of those heretical thoughts is sustained by their charity. And that's where the man of truth comes in. The man of truth is one who keeps mitzvot in their full detail when no one is watching, exactly the way he keeps them in public. For him there is no difference between the mitzvah he does before Hashem alone and the mitzvah he does before people — that is what \"truth\" means. Because charity is drawn after truth, the man of truth pulls all those charities to himself, away from the wicked. This is \"And tzedakah stands far away because truth has stumbled in the street\" (Isaiah 59:14): when there is no truth, charity stands far off.",
    "he": ""
   },
   "intermediate": {
    "en": "T251 §1: Milchamot/machloket → mach'shavot zarot zarot nofelot al ksheirim. Tikkun: masirat ha-milchamah l'Hashem. But resha'im's tzedakah sustains kochach. Ish ha-emet (mitzvot b'shleimut bein b'pharhesyah bein b'tzin'a, \"lifnei Hashem\" mamash) moshech ha-tzedakot eilav. \"V'tzedakah me-rachok ta'amod ki kashlah ba-rechov emet\" (Yesh 59:14). LM 251 §a.",
    "he": "מלחמות ומחלוקת — מפילים מחשבות מינות. תיקון: \"ה׳ ילחם לכם\" (שמות יד:יד). אך צדקת רשעים מקיימת מחשבותם. איש האמת — שעושה לפני ה׳ כלפני הבריות — מושך אליו כל הצדקות (ישעיה נט:יד)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״א §א׳ — שמות יד:יד; משלי כח:ח; ישעיה נט:יד."
   }
  },
  {
   "beginner": {
    "en": "Here's the operating principle. The Torah says, \"And tzedakah will be ours when we keep all this mitzvah before Hashem our G-d as He commanded us\" (Devarim 6:25). \"Before Hashem our G-d\" — precisely. Meaning: when we keep the mitzvot before Hashem alone with the same exactness we keep them in public — that is truth — then \"tzedakah will be ours\": all the charity in the world is drawn to us, because charity follows truth. Once that charity is pulled away from the wicked, their heretical thoughts have no fuel left to project, and our minds are clear. Truth is the magnet for tzedakah.",
    "he": ""
   },
   "intermediate": {
    "en": "T251 §2: \"U-tzedakah tihyeh lanu ki nishmor la'asot et kol ha-mitzvah ha-zot lifnei Hashem Eloheinu ka'asher tzivanu\" (Devarim 6:25) — when emet is shalem, tzedakah nimshechet eleinu. LM 251 §b.",
    "he": "\"וצדקה תהיה לנו כי נשמור לעשות את כל המצוה הזאת לפני ה׳ אלקינו\" (דברים ו:כה) — ע\"י אמת בקיום המצוות, נמשכת הצדקה אלינו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״א §ב׳ — דברים ו:כה; אמת מושכת צדקה."
   }
  },
  {
   "beginner": {
    "en": "Why does charity follow truth? Because truth, like the One, is one. Sefer Yetzirah teaches: \"Before one, what do you count?\" — if there is a second, it is no longer one. Similarly, truth is only one. About any object you can say only one true statement; but lies are infinite — you can call a silver vessel \"gold\" or \"copper\" or anything else. Truth is singular, lies are plural. So Hashem is truth, His Torah is truth, Israel is truth, and all three are one because all three are truth. (See Zohar Emor 9a: tzedakah is the aspect of truth.)",
    "he": ""
   },
   "intermediate": {
    "en": "T251 §3: Emet = echad (Sefer Yetzirah \"lifnei echad mah atah sofer\"). Sheker = rabim (many false labels possible per object). Hence Hashem-Torah-Yisrael all one (zohar Emor 9a). LM 251 §c.",
    "he": "אמת אחד — \"לפני אחד מה אתה סופר\" (ספר יצירה). שקר רבים. הקב\"ה תורה וישראל חד (זוהר אמור ט.)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״א §ג׳ — ספר יצירה; זוה\"ק אמור ט. — אמת=אחד=צדקה."
   }
  },
  {
   "beginner": {
    "en": "Tzedakah is the aspect of the sun. The sun is one single power, but its effects multiply according to whatever it touches: it melts wax, hardens clay, warms one thing, cools another. The variation is entirely in the receivers — the sun itself is one. So too tzedakah: \"And the sun of tzedakah will rise for those who fear My name\" (Malachi 3:20). The Talmud (Berachot 6b) says: \"Like the blackening of olives, so when a person needs others, his face changes through several colors.\" One whose face changes from greatness (embarrassment that he must take), one from smallness (humiliation), one from joy (gratitude). The variations are all in the receivers; the tzedakah itself remains one undivided power, like the sun.",
    "he": ""
   },
   "intermediate": {
    "en": "T251 §4: Tzedakah = shemesh = ko'ach echad. \"V'zarcha lachem yir'ei shmi shemesh tzedakah\" (Malachi 3:20). Berachot 6b: panav mishtanim through gadlut/katnut/simchah — but the variations are in the mekablim, not in the tzedakah/shemesh itself. LM 251 §d.",
    "he": "צדקה כשמש — כח אחד; השינויים במקבלים. \"וזרחה לכם יראי שמי שמש צדקה\" (מלאכי ג:כ). \"כמשחור זיתים\" (ברכות ו:)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״א §ד׳ — מלאכי ג:כ; ברכות ו:; צדקה=שמש=כח אחד."
   }
  },
  {
   "beginner": {
    "en": "Yaakov is the aspect of truth — \"Give truth to Yaakov\" (Micah 7:20). And about him it is written: \"And the sun rose for him\" (Bereishit 32:32) — the sun rose specifically for him, just like \"u-tzedakah tihyeh lanu.\" Through his truth Yaakov drew all the charities to shine on him. Truth is the magnet, the sun follows.",
    "he": ""
   },
   "intermediate": {
    "en": "T251 §5: Ya'akov = emet (Mich 7:20) → \"va-yizrach lo ha-shemesh\" (Ber 32:32) — drew the sun/tzedakah to himself, just like \"u-tzedakah tihyeh lanu.\" LM 251 §e.",
    "he": "יעקב — אמת (מיכה ז:כ); \"ויזרח לו השמש\" (בראשית לב:לב) — שמש=צדקה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״א §ה׳ — מיכה ז:כ; בראשית לב:לב."
   }
  },
  {
   "beginner": {
    "en": "Yevamot 96b records a dispute that erupted in the beit midrash so violently that a Sefer Torah was ripped, and the sage said: \"I wonder if this house will not become a house of idolatry.\" That is the proof: machloket breeds idolatry and heresy. \"They devise evils in their heart, all day they gird wars\" (Psalms 140:3) — wars devise evils, evils are heretical thoughts. The repair: hand the war to Hashem (\"Hashem will fight for you, and you shall be silent,\" Exodus 14:14). Silence elevates thought — heretical thoughts are nullified, as in \"Be silent, so it arose in thought\" (Menachot 29b). But beware: if the wicked also stay silent, their silence rises \"on our back\" (\"On my back plowmen plowed... they lengthened their furrows,\" Psalms 129:3) — \"furrows\" are their charity (\"v'tzedakati ta'aneh bi,\" Genesis 30:33), which still gives their silence power. Only the man of truth, by drawing all charity to himself, defuses both their charity and their heresy. Truth is the master key.",
    "he": ""
   },
   "intermediate": {
    "en": "T251 §6: Yevamot 96b — machloket→avodah zarah/heresy. \"Choshvei ra'ot... yom yom yaguru milchamot\" (Tehillim 140:3). Tikkun: \"Hashem yilachem lachem v'atem tacharishun\" (Shem 14:14). \"Be silent — kakh alah ba-machshavah\" (Menachot 29b) — shtikah elevates thought, nullifies kefirah. But \"al gabi chareshu choreshim, he'erichu ma'anitam\" (Tehillim 129:3) — their tzedakah (\"v'tzidkati ta'aneh bi,\" Ber 30:33) lets their silence ride on ours. Ish ha-emet draws their tzedakah away, neutralizing both. LM 251 §f.",
    "he": "יבמות צו: — מחלוקת מולידה ע\"ז ומינות. \"ה׳ ילחם לכם ואתם תחרישון\" (שמות יד:יד); \"שתוק כך עלה במחשבה\" (מנחות כט:). אך \"על גבי חרשו חורשים\" (תהלים קכט:ג) — צדקת הרשעים נותנת לשתיקתם כח. איש האמת מושך את הצדקה — ומבטל מחשבותיהם."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״א §ו׳ — יבמות צו:; תהלים קמ:ג, קכט:ג; שמות יד:יד; מנחות כט:; בראשית ל:לג."
   }
  }
 ]
},
252: {
 "title_en": "When Tzaddikim Are United, Charity Does Not Diminish",
 "title_he": "באחדות הצדיקים — אין צדקה מחסרת",
 "segs": [
  {
   "beginner": {
    "en": "By the laws of nature, when you give tzedakah you have less than you started with — what you gave is gone from you. But when there is unity (achdut) between the true tzaddikim, that natural law is overridden: a person can give tzedakah and lose absolutely nothing. The same principle extends to mesirut nefesh — when there is real unity between tzaddikim, a person can pour out his life in self-sacrifice for Hashem and even so not be harmed and remain alive. Achdut among tzaddikim breaks the rules of \"give and lose.\"",
    "he": ""
   },
   "intermediate": {
    "en": "T252: B'achdut bein tzaddikim, tzedakah eino mechaser — natural depletion is overridden. Same applies to mesirut nefesh b'emet without harm. LM 252.",
    "he": "באחדות בין הצדיקים — נתינת צדקה אינה מחסרת, ואף מסירת נפש באמת לא תזיק."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ב — אחדות הצדיקים מבטלת חסרון בצדקה ובמסירת נפש."
   }
  }
 ]
},
253: {
 "title_en": "Reduced Sleep Reduces the Desire for Licentiousness",
 "title_he": "מיעוט שינה ממעט תאוות הניאוף",
 "segs": [
  {
   "beginner": {
    "en": "Reb Nachman teaches that reduced sleep diminishes the desire for forbidden sexual relations. There is an inner fire in a person from the moment of his creation; from this fire all the burnings of every desire are kindled. All food and drink given to the body are also consumed by this fire. When sleep is reduced, the fire is weakened and loses its power to burn. But — and this is critical — reduced sleep harms the brain. Excess sleep also weakens the fire, and that too harms the brain. Only when a person sleeps in proper measure (the natural amount) is the desire at its full strength. Reb Noson adds (in brackets): the conclusion is that there is no clever stratagem to weaken this desire safely. Every shortcut damages the brain. The only working path is to be a true gibbor and conquer one's yetzer, and Hashem will help him remove this desire.",
    "he": ""
   },
   "intermediate": {
    "en": "T253: Mi'ut sheinah → me'mait ta'avat ha-niuf — eish ha-toldah ne'echelet bo. Aval mi'ut ke-ribbui sheinah — both damage ha-mo'ach. Ein eitzah b'tachbulah — only \"ha-kovesh et yitzro\" + siyata di-shmaya. LM 253 (with Reb Noson's bracketed gloss).",
    "he": "מיעוט שינה ממעט אש התאווה — אך מזיק למוח, וכן ריבוי שינה. אין עצה אלא להתגבר ולכבוש את היצר, וה׳ יעזור."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ג — אש התולדה; מיעוט וריבוי שינה מזיקים למוח; \"איזהו גיבור — הכובש את יצרו\" (אבות ד:א)."
   }
  }
 ]
},
254: {
 "title_en": "The Eyes Are Exalted Things — They See Visions Constantly",
 "title_he": "העינים — דברים עליונים; רואות תמיד",
 "segs": [
  {
   "beginner": {
    "en": "The eyes are exalted, sublime things — they are constantly seeing great and awesome sights. If a person merited to have purified eyes, he would know enormous things just from what his eyes already see, because they are seeing all the time — but he does not know what he sees. Why? Compare: when something passes in front of your eyes very quickly, you don't know what passed. Even though the eyes saw it completely, the speed left no time to bring the seeing across into the knowledge — and only when the seeing reaches the da'at do you actually \"know\" what you saw. Without the pause, the image is captured but never registers. So too with the spiritual visions — the eyes are constantly receiving visions and revelations, but they pass too rapidly for the da'at to grasp them. The eyes are seeing prophecy all day; the work is to slow the stream long enough for the heart to know what it has just seen. \"And understand.\"",
    "he": ""
   },
   "intermediate": {
    "en": "T254: Einayim — devarim elyonim me'od; ro'ot tamid mar'ot v'chezyonot. The seeing exists, but speed prevents the re'iyah from reaching the da'at — therefore one doesn't \"know\" what one saw. With purified eyes, one would already know everything from sight alone. \"V'havein.\" LM 254.",
    "he": "העינים עליונות, רואות תמיד גדולות וחזיונות. במהירות אין שהות להעביר הראייה לדעת — לכן אינו יודע מה ראה. עם עינים מתוקנות יודע מן הראייה לבד. והבן."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ד — מעלת העינים; ראייה תמידית של חזיונות עליונים."
   }
  }
 ]
},
255: {
 "title_en": "Faith in the Tzaddik Without Knowledge — Vulnerable to Falling",
 "title_he": "אמונה בצדיק בלא דעת — אפשר ליפול",
 "segs": [
  {
   "beginner": {
    "en": "When a person believes in the tzaddik with bare faith alone — without any da'at, without intellectual understanding — it is possible for him to fall from that faith, because faith alone can be lost. But once he also has da'at — when he understands the tzaddik with his mind in addition to his heart — it becomes impossible for him to fall. Faith plus knowledge is unbreakable. Faith without knowledge is fragile.",
    "he": ""
   },
   "intermediate": {
    "en": "T255: Ma'amin ba-tzaddik bli da'at — efshar liplol. With da'at added (havanah b'sechel), liplol nimna. LM 255.",
    "he": "אמונה בצדיק בלא דעת — אפשר ליפול. עם דעת והבנה — אי אפשר ליפול."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ה — אמונה צריכה דעת לקיומה."
   }
  }
 ]
},
256: {
 "title_en": "The Name Atah (אתה) Is a Segulah Over the Sea",
 "title_he": "השם 'אתה' — סגולה על הים",
 "segs": [
  {
   "beginner": {
    "en": "The Name Atah (אתה — \"You\") is a segulah over the sea, to subdue the waves (see Chayey Moharan 136 and Parparaot LeChochmah). The secret hint: \"In the rising of its waves, You (אתה) calm them\" (Psalms 89:10) — the verse itself uses the word atah at exactly the moment the waves are stilled. (See Zohar Noach 69 and Mikdash Melech ad loc. for the kabbalistic depth of this divine name as protection at sea.)",
    "he": ""
   },
   "intermediate": {
    "en": "T256: Shem \"atah\" segulah la-yam l'hashkit galim. \"B'so ga'ayav atah teshabchem\" (Tehillim 89:10). Cf. Zohar Noach 69; Mikdash Melech; Chayey Moharan 136. LM 256.",
    "he": "השם 'אתה' סגולה לים. \"בשוא גליו אתה תשבחם\" (תהלים פט:י). זוה\"ק נח סט; מקדש מלך שם; חיי מוהר\"ן קלו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ו — תהלים פט:י; זוה\"ק נח ס\"ט; מקדש מלך; חיי מוהר\"ן קל\"ו; פרפראות לחכמה."
   }
  }
 ]
},
257: {
 "title_en": "Don't Eat More Than You Need — Excess Food Harms",
 "title_he": "אל תאכל יותר מצרכך — המאכל המיותר מזיק",
 "segs": [
  {
   "beginner": {
    "en": "The verse \"When you come into your fellow's vineyard, you may eat your fill of grapes... but you shall not put any in your vessel\" (Devarim 23:25) is read here as advice about eating in general: \"as your soul is satisfied — not more.\" Why? Every food has a root from which it draws life, just as a spice gives the person who takes it as medicine the very life-energy that animates the spice. Foods receive life from the fact that the person eats them and receives life from them — so foods get life from being needed. But when a person eats more than he needs, the surplus food has no recipient through whom to receive its life. It is like food left abandoned inside a vessel — it gets nothing back. So that surplus food now hunts for life — and the only life it can find is the eater's own. It begins to drain him. And other foods join with it and harm him too. \"And to your vessel do not put\" — don't eat more than you need, because anything beyond your need is like food deposited in an abandoned vessel: it turns parasitic.",
    "he": ""
   },
   "intermediate": {
    "en": "T257: \"Ki tavo b'kerem re'echa... v'el kelyecha lo titen\" (Dev 23:25): kol ma'achal sho'ev chayim mi-haadam ha-ochlo b'tzorech. Ochel yoter mi-tzorko — ein la-ma'achal me-mi le-kabbel chayim, u-vakeish chayim me-haadam atzmo. \"V'el kelyecha lo titen\" — efs ha-mu'tar k'mannach b'kli rek. LM 257.",
    "he": "המאכל המיותר אין לו ממי לקבל חיות, ולוקח חיות האדם. \"ואל כליך לא תתן\" — שלא תאכל יותר מצרכך, שזה כנותן בכלי ריק (דברים כג:כה)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ז — דברים כג:כה; שורש המאכל מקבל חיות מהאדם רק בצרכו."
   }
  }
 ]
},
258: {
 "title_en": "When Machloket Targets a Person, It Can Topple Him",
 "title_he": "מחלוקת על האדם — עלולה להפילו",
 "segs": [
  {
   "beginner": {
    "en": "When there is machloket — dispute, opposition — directed at a person, those opposing him can incline him away from the path of Hashem and cause him to fall from his level, G-d forbid. This is what David Ha-Melech boasted of: \"Many are my pursuers and my adversaries, yet I have not turned from Your testimonies\" (Psalms 119:157). Even though much machloket was directed against him, he did not turn aside from the path of Hashem. The boast is genuine — most people would buckle. Standing firm against opposition is itself a spiritual achievement.",
    "he": ""
   },
   "intermediate": {
    "en": "T258: Machloket al ha-adam can incline him from derech Hashem. David: \"Rabim rod'fai v'tzarai, me'edotecha lo natiti\" (Tehillim 119:157) — held firm despite massive opposition. LM 258.",
    "he": "מחלוקת על האדם — עלולה להפילו. \"רבים רודפי וצרי, מעדותיך לא נטיתי\" (תהלים קיט:קנז) — דוד עמד אף שרבתה המחלוקת."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ח — תהלים קיט:קנז; חוזק נגד מחלוקת = מעלה."
   }
  }
 ]
},
259: {
 "title_en": "In Hisbodidut, the Shechinah Speaks Back",
 "title_he": "בהתבודדות — השכינה משיבה כנגדו",
 "segs": [
  {
   "beginner": {
    "en": "When a person is in hisbodidut — alone with Hashem — and pours out his conversation and his suffering before Him, confessing and regretting how much spiritual damage he has caused, then the Shechinah opposite him also pours out Her conversation, Her own suffering, and comforts him. Why? Because every single damage he caused to his soul, he also caused — as it were — to Her. The two sufferings are the same suffering. This is the secret of \"You have proclaimed Hashem... and Hashem has proclaimed you...\" (Devarim 26:17–18) — the mutual proclamation describes a mutual exchange: when you speak before Him, He speaks before you. Hisbodidut is not a monologue. The Shechinah replies.",
    "he": ""
   },
   "intermediate": {
    "en": "T259: B'hisbodidut, while one mefaresh sicha v'tza'ar v'mitvadeh, ha-Shechinah k'negdo also mefareshet sichah v'tza'ar v'menachamto — ki kol pegam ba-nefesh pagam baH k'vyachol. \"Et Hashem he'emarta... v'Hashem he'emircha\" (Devarim 26:17). LM 259.",
    "he": "בהתבודדות — השכינה כנגדו מפרשת שיחתה וצרתה ומנחמת. כל פגם בנפש פוגם בה כביכול. \"את ה׳ האמרת וה׳ האמירך\" (דברים כו:יז)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רנ״ט — דברים כו:יז; הדדיות התבודדות והשכינה."
   }
  }
 ]
},
260: {
 "title_en": "The Name Is the Soul — The Mystery of Mesirut Nefesh",
 "title_he": "השם — הנשמה; סוד מסירת נפש",
 "segs": [
  {
   "beginner": {
    "en": "The Name (sheim — both reputation and the divine Name) is the soul, as taught in the Torah Heichal HaKodesh §59 on \"a living soul is his name\" (Genesis 2:7). And in this principle there is the secret of self-sacrifice. The Ten Martyrs of the Kingdom (asarah harugei malchut) gave up their souls al kiddush Hashem for the unification of the Holy One and His Shechinah — because the main yichud is achieved through mesirut nefesh. They saw in their generations that there was no other way to repair and to make unifications above except through their souls. So they gave their souls. When souls ascend through mesirut nefesh they return to the Shechinah, since from there they came out — Israel are literally a portion of G-d, portions of the Shechinah, in the secret of \"borne from the womb\" (Isaiah 46:3). When they return, the Shechinah boasts: \"Look — what a son I am bringing to you\" (Zohar Vayikra 13a). An upper longing is aroused, and the yichud is made.",
    "he": ""
   },
   "intermediate": {
    "en": "T260 §1: Ha-sheim hu ha-neshamah (Heichal Ha-Kodesh siman 59 al \"v'nefesh chayah hu shemo,\" Bereishit 2:7). Asarah harugei malchut — yichud Kudsha Brich Hu u-Shechintei is via mesirut nefesh. Returning souls reach the Shechinah (\"chelek Eloka mi-ma'al,\" \"ha-amusim mini batten,\" Yesh 46:3); Shechinah me'shtaba'achat (Zohar Vayikra 13a); milt'chashek d'leila + yichud. LM 260 §a.",
    "he": "השם הוא הנשמה (היכל הקודש סימן נט; בראשית ב:ז). יחוד קוב\"ה ושכינתיה ע\"י מסירת נפש (עשרה הרוגי מלכות). הנשמות חוזרות לשכינה (\"חלק אלוק ממעל\"; \"העמוסים מני בטן\", ישעיה מו:ג); זוה\"ק ויקרא יג."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״ס §א׳ — בראשית ב:ז; ישעיה מו:ג; זוה\"ק ויקרא יג; יחוד ע\"י מסירת נפש."
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
print("lm-commentaries.json updated for T246-T260")

os.chdir(repo)
add = subprocess.run(['git','add'] + git_files, capture_output=True, text=True)
commit = subprocess.run(['git','commit','-m',
    'feat: T246-T260 PNC -- greatness-tool/teiku-tikkun/stories-tzaddikim/heart-strength/da\'at-suffering/wars-truth-charity/unity-tzedakah/sleep-fire/eyes-visions/faith-knowledge/atah-sea/excess-food/machloket-fall/hisbodidut-shechinah/name-soul (20 segs)'],
    capture_output=True, text=True)
print(f'commit: {commit.returncode}', commit.stdout, commit.stderr)
push = subprocess.run(['git','push','origin','main'], capture_output=True, text=True)
print(f'push: {push.returncode}', push.stdout, push.stderr)
