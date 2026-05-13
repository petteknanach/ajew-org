import json, os, subprocess

home = os.path.expanduser('~')
repo = os.path.join(home, '.openclaw', 'workspace', 'ajew-org')
reader_dir = os.path.join(repo, 'public', 'reader')
pnc_name = [d for d in os.listdir(reader_dir) if 'nanach' in d.lower()][1]
lm_comm = os.path.join(repo, 'src', 'data', 'lm-commentaries.json')

with open(lm_comm, encoding='utf-8') as fh:
    cdata = json.load(fh)

torahs = {
276: {
 "title_en": "Shabbat Eating Is Not for Satiation — It Blesses the Six Weekdays",
 "title_he": "אכילת שבת — אינה לשובע, אלא לברכת ששת הימים",
 "segs": [
  {
   "beginner": {
    "en": "Shabbat eating isn't really about satiating hunger at all. The Zohar (Yitro 88a) teaches that all the blessing and success of the weekdays flows from the holiness of Shabbat — the eating of Shabbat itself is what allows the six days to be blessed. The real satiation is on Shabbat. The Talmud (Berachot 43b) on \"Who fed you manna in the desert in order to afflict you\" (Devarim 8:16) teaches that a blind person has no satiation — and Kiddush on Friday night restores the spiritual light of the eyes, which is what real satisfaction depends on. Shabbat is when the eyes are restored. Shabbat eating, therefore, is the act of drawing down sight, drawing down satiation, drawing down blessing for the entire week — not for the body's full belly, but for the soul's full sight.",
    "he": ""
   },
   "intermediate": {
    "en": "T276: Achilat Shabbat einah l'sova — kol birchat ha-shavua ba'ah mi-kedushat Shabbat (Zohar Yitro 88.). Ikar ha-sova b'Shabbat — \"suma ein lo sova\" (Berachot 43:; Devarim 8:16); Kiddush leil Shabbat machzir or einayim. LM 276.",
    "he": "אכילת שבת אינה לשובע — אלא ברכת ששת הימים מקדושתה (זוהר יתרו פח.). \"סומא אין לו שובע\" (ברכות מג:; דברים ח:טז) — קידוש משיב מאור עינים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ו — זוה\"ק יתרו פ\"ח; ברכות מ\"ג ע\"ב; דברים ח:טז; אכילת שבת ממשיכה ברכה ושובע ראייה."
   }
  }
 ]
},
277: {
 "title_en": "When Machloket Comes Against You — Be Like Dust to All; Distinguish Wicked Disputants From Tzaddikim",
 "title_he": "מחלוקת על האדם — \"ונפשי כעפר לכל\"; בין מחלוקת רשעים למחלוקת צדיקים",
 "segs": [
  {
   "beginner": {
    "en": "When machloket arises against you, do not respond in kind — don't oppose the haters with \"as he does to me, so I will do to him.\" That just feeds them what they came hunting for: the chance to find the faults in you they wanted to find. The opposite is the right path: judge them favorably, do good things for them — \"and let my soul be like dust to all\" (Berachot 17a). Like the dust trodden underfoot, which gives back food, drink, silver, gold, precious stones — even though everyone walks on it. Even when they are disputing you and wishing you harm, treat them with the humility and bounty of dust.",
    "he": ""
   },
   "intermediate": {
    "en": "T277 §1: Machloket alav — al na'aneh ke-ka-asher osim li (\"ka-asher asah ken ye'aseh lo\"). Tikkun: lemod l'chaf zechut, le'elaiv tovot. \"V'nafshi k'afar la-kol\" (Berachot 17.) — afar ha-nirmas v'nosen kol tov. LM 277 §a.",
    "he": "מחלוקת על האדם — אל תשיב כנגדם. ידון לכף זכות, יעשה להם טובות. \"ונפשי כעפר לכל\" (ברכות יז.)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ז §א׳ — ברכות י\"ז; \"ונפשי כעפר\"; אל תשיב כעולה."
   }
  },
  {
   "beginner": {
    "en": "But there is a critical distinction. The advice above applies primarily when the disputants are wicked. When the dispute comes from tzaddikim, their intention is entirely for good — to elevate you through hidden measures and to sweeten the judgments standing against you. Just as in tzedakah several Tannaim used to give gifts in secret so the recipient wouldn't know (Ketubot 67b), so too the dispute of tzaddikim is a secret gift: they appear to oppose you, but they are sweetening din at its root.",
    "he": ""
   },
   "intermediate": {
    "en": "T277 §2: Machloket me-tzaddikim — kavanatam l'tova; she'leihem b'matanot ne'elamot, l'hamtik ha-dinim — k'tannaim ha-notnim tzedakah b'sod (Ketubot 67:). LM 277 §b.",
    "he": "מחלוקת מצדיקים — לטובה, להמתיק הדינים בסתר. כתנאים שנותנים מתנות בסתר (כתובות סז:)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ז §ב׳ — כתובות ס\"ז ע\"ב; מחלוקת צדיקים להמתיק דינים."
   }
  },
  {
   "beginner": {
    "en": "David's verse, \"When the wicked rise up against me as evildoers\" (Psalms 92:12), captures the principle: the righteous engage in dispute for one's good, sweetening harsh judgments. The continuation \"the tzaddik will flourish like a tamar\" (Psalms 92:13) hints that through this divine controversy, the tamar of the sitra achra is overcome. Holy machloket is constructive — it overcomes impurity at its source.",
    "he": ""
   },
   "intermediate": {
    "en": "T277 §3: \"B'froach resha'im k'mo eisev... ha-tzaddik ka-tamar yifrach\" (Tehillim 92:8,13). Holy machloket me'vatel et tamar shel sitra achra. LM 277 §c.",
    "he": "\"בפרוח רשעים... צדיק כתמר יפרח\" (תהלים צב). מחלוקת קדושה מבטלת תמר דסטרא אחרא."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ז §ג׳ — תהלים צ\"ב:ח׳,י\"ג."
   }
  },
  {
   "beginner": {
    "en": "The deep principle: the sitra achra arises specifically from holy controversy, and only the brilliance of the holy disputant can sweeten judgments at their source. This is the spiritual potency of righteous conflict — it heals and expands rather than wounding. It does not damage; it repairs.",
    "he": ""
   },
   "intermediate": {
    "en": "T277 §4: Sitra achra olah me-machloket kedoshah; rak ha-bahir/tzaddik me'amtek dinim mi-shorsham. Holy machloket marpah u-marchiv. LM 277 §d.",
    "he": "סטרא אחרא עולה ממחלוקת קדושה. רק הצדיק יכול להמתיק דינים בשרשם — מחלוקת קדושה מרפאת ומרחיבה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ז §ד׳ — מחלוקת צדיקים מתקנת ומרחיבה."
   }
  },
  {
   "beginner": {
    "en": "And just as earthly remedies derive their healing power from the land — especially during the month of Iyyar, when the earth gives its full yield — so too spiritual healing flows through resolved dispute and divine peace. Iyyar is the season when the earth's healing energies are at their peak; in the soul, peace after righteous machloket is the same arrival.",
    "he": ""
   },
   "intermediate": {
    "en": "T277 §5: Refu'ot artziyot ko'achan me-ha-aretz, b'frat b'Iyyar (chodesh ha-refu'ah); v'kakh refu'ah ruchanit me-yetzubat machloket u-shalom Elokah. LM 277 §e.",
    "he": "אף הרפואה הטבעית כוחה מהארץ, ביחוד באייר. כך הרפואה הרוחנית מהמתקת המחלוקת ולשלום."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ז §ה׳ — אייר חודש רפואה; שלום מתוך מחלוקת קדושה."
   }
  }
 ]
},
278: {
 "title_en": "Through a Kosher Chalif (Slaughtering Knife) One Sees the Vessels of the Beit HaMikdash",
 "title_he": "ע\"י חלף טוב — רואים כלי בית המקדש",
 "segs": [
  {
   "beginner": {
    "en": "Through a kosher chalif (the slaughtering knife of a shochet), a person can come to behold all the vessels of the Beit HaMikdash — their forms, their faces, their spiritual emanations. When Yitzchak said to Esav \"Take now your weapons (kelecha)\" (Genesis 27:3), the word \"vessels\" (kelim) hints at the vessels of the Sanctified House, which become visible through the chalif's purity. The shochet's blade, when truly kosher, is itself a window onto the Mikdash.",
    "he": ""
   },
   "intermediate": {
    "en": "T278 §1: Al chalif tov — ro'in kol klei beit ha-mikdash, b'tzurosam u-vfaneihem. \"Sa na keilecha\" (Bereishit 27:3) — kelei = klei mikdash, mit'galim be-taharat ha-chalif. LM 278 §a.",
    "he": "ע\"י חלף טוב — רואים כלי המקדש. \"שא נא כליך\" (בראשית כז:ג) — כלי המקדש מתגלים בטהרת החלף."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ח §א׳ — בראשית כז:ג; טהרת חלף כראי לכלי המקדש."
   }
  },
  {
   "beginner": {
    "en": "The midrashic hint connects Yitzchak's \"your vessels\" to the Temple vessels — \"and the vessels were brought to his god's house\" (Bereishit 65). And ultimately, \"in My zeal, zeal\" (Numbers 25:11) teaches that no tzaddik should be jealous of another. Only the Divine alone is truly jealous. When tzaddikim avoid kin'ah (jealousy) of one another, the chalif of their service stays kosher and the kelim of the Beit HaMikdash stay visible.",
    "he": ""
   },
   "intermediate": {
    "en": "T278 §2: Midrash — keilecha = klei mikdash. \"B'kan'oti et kin'ati\" (Bamidbar 25:11) — ein li-tzaddik l'kanei b'tzaddik acher; rak ha-Borei kanai. LM 278 §b.",
    "he": "כלי = כלי מקדש. \"בקנאו את קנאתי\" (במדבר כה:יא) — אין לצדיק לקנא בצדיק. רק הקב\"ה קנא."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ח §ב׳ — במדבר כ\"ה:יא; אין צדיק מקנא בצדיק."
   }
  }
 ]
},
279: {
 "title_en": "Saying Torah From Below to Above — The Shofar Shape",
 "title_he": "האומר תורה מלמטה למעלה — בחינת שופר",
 "segs": [
  {
   "beginner": {
    "en": "Some people say Torah from below to above: down here it is very wide — they expand the matter and unpack it greatly — and as it rises higher it shortens, until at the very top almost nothing remains, only a tiny holy spark. Others say Torah from above to below: up high it is very, very broad, and as it descends it shortens, until below only a little remains, while above it is vast. So too in arousal from below: it should begin narrow, in the secret of \"From the straits I called\" (Psalms 118:5; cf. 66) — the shofar shape, where the wide end is above and the narrow end is below at the mouth. \"Pi diber b'tzar li\" — the narrow short side is at my mouth, the shofar's narrow opening. And we see this with David: every prayer began from constriction and distress (when it was narrow for him because of Avshalom or Naval, etc.), and from there, in the same prayer, he came into ru'ach ha-kodesh. Narrowness below opens out into broadness above.",
    "he": ""
   },
   "intermediate": {
    "en": "T279: Yesh ha-omrim Torah mi-l'matah l'ma'alah (rechavah l'matah, mit'katzeret l'ma'alah ad nitzotz katan), ve-yesh ha-omrim mi-l'ma'alah l'matah (rechavah l'ma'alah, mit'katzeret l'matah). Hitorerut mi-l'matah — k'shofar (peh tzar l'matah, racham l'ma'alah): \"pi diber b'tzar li\" (Tehillim 66:14). David — kol tefilah hitchilah b'tzar (Avshalom, Naval) v'higi'ah l'ru'ach ha-kodesh. LM 279.",
    "he": "תורה מלמטה למעלה — רחבה למטה ומתקצרת למעלה; ולהיפך. התעוררות מלמטה — בחי' שופר, פה צר למטה ורחב למעלה (תהלים סו). דוד — מצרה לרוח הקודש."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רע״ט — תהלים סו; שופר ובחי' התעוררות מתוך הצרה."
   }
  }
 ]
},
280: {
 "title_en": "Litigation Is the Torah's Punishment for Uprooting Business From Torah",
 "title_he": "דיני תורה — עונש על עקירת המשא ומתן מן התורה",
 "segs": [
  {
   "beginner": {
    "en": "When a person is dragged into beit din to be judged in dinei Torah, that itself is the punishment and the Torah's vengeance upon him. Why? Because all masa u-matan (commerce) is itself Torah. The law of trading a cow for a donkey is Torah; all the more so, when you actually do that transaction, it is certainly Torah (as taught in the name of the Baal Shem Tov). Therefore in business one must bind one's thought only to the Torah and the laws clothed within the deal. Whoever uproots the business from the Torah and falls into the business itself — not binding his thought to the Torah inside — his punishment is that afterwards he must be judged in dinei Torah. Then he has to bring all the words, thoughts, and dealings he had during the transaction, from beginning to end, and bring them back into Torah by reciting them before the dayanim, who rule on each detail. The whole business is finally turned into Torah — by force, retroactively. That is the vengeance of the Torah on one who tried to remove it.",
    "he": ""
   },
   "intermediate": {
    "en": "T280 §1: Dinei Torah — onesh u-nekamat ha-Torah. Kol masa u-matan = Torah (BeShT — \"din parah b'chamor torah\"). Ha-okeir ha-mu\"m me-ha-Torah — onsho li-shaft b'din Torah, u-le-hashiv kol divrei ha-iska l'tokh ha-Torah. LM 280 §a.",
    "he": "דיני תורה — עונש על עקירת המשא ומתן מן התורה (בעש\"ט). חוזר ומחזיר כל דברי המקח לתוך התורה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״פ §א׳ — בשם הבעש\"ט; משא ומתן הוא תורה."
   }
  },
  {
   "beginner": {
    "en": "The punishment is that he must bring all the words of the transaction and make them into Torah. Even a single word or thought that goes missing will ruin the verdict — every detail must be recovered and presented before the judges. The depth of the litigation matches the depth of the original uprooting: someone who only superficially uprooted gets a smaller punishment (he must be judged but is shown to be in the right); someone who uprooted more deeply suffers greater consequences and loses in court.",
    "he": ""
   },
   "intermediate": {
    "en": "T280 §2: Onesh = ha-tzo'ah le-vatel kol divrei ha-iska v'la'asot otam Torah. Eachad teiva chasera u-vatel ha-din. L'fi ha-pegam — k'shi'ur ha-onesh: yesh ha-zoche ba-din (rak nidon) v'yesh she-eino zocheh. LM 280 §b.",
    "he": "העונש — להעלות כל דברי המקח לתורה; כל תיבה החסרה — מבטלת הדין. לפי הפגם — שיעור העונש."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״פ §ב׳ — מידת העונש לפי הפגם בעקירה."
   }
  },
  {
   "beginner": {
    "en": "Even before the litigation stage, the principle: in commerce only the externality of one's thought should be on the dealing; the inner thought must remain bound to Torah. And one must do business with emunah, speaking words of truth — \"Did you deal in faith?\" (Shabbat 31a). Why is faith essential? Because business is itself the elevation of fallen sparks (nitzotzot of fallen kedushah). The clarification of those sparks from the klipot is achieved primarily through emunah. Faith dwells always with the fallen kedushah — \"This is Yerushalayim, in the midst of the nations I have set her\" (Yechezkel 5:5); Yerushalayim — the faithful city, faith — is among them always. The fallen sparks cling around faith, and faith raises them. That is what business actually is when done right: lifting fallen sparks through emunah.",
    "he": ""
   },
   "intermediate": {
    "en": "T280 §3: Bizman ha-iska — chitzoniyut ha-mach'shavah ba-iska, pnimiyut keshura la-Torah. Emunah ba-iska, divrei emet — \"nasata v'natata b'emunah?\" (Shabbat 31.). Iska = ha'ala'at nitzotzot ha-nef'olim mi-klipot, v'beirur b'emunah. \"Zot Yerushalayim b'tokh ha-goyim samtikha\" (Yechezkel 5:5) — emunah omedet im ha-kedushah ha-nofelet. LM 280 §c.",
    "he": "במשא ומתן — חיצוניות המחשבה במקח, פנימיות בתורה. \"נשאת ונתת באמונה?\" (שבת לא.). מסחר באמונה — מעלה ניצוצות שנפלו (יחזקאל ה:ה)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ ר״פ §ג׳ — שבת ל\"א; יחזקאל ה:ה; אמונה במשא ומתן ובירור ניצוצות."
   }
  }
 ]
},
281: {
 "title_en": "Even a Simple Person Can See New and Wondrous Combinations in the Letters",
 "title_he": "אף אדם פשוט — יכול לראות חידושים בצירופי האותיות",
 "segs": [
  {
   "beginner": {
    "en": "Even a simple person — if he sets himself before a sefer and gazes intently at the letters of the Torah — can see new and wondrous things. By staring at the letters with full attention, the letters begin to shine and combine in the secret of \"the letters fly and combine\" (Yoma 73b). He will then see fresh combinations he has never seen before, and he can see in the sefer matters the author himself never intended at all. A great person sees this effortlessly — but even a completely simple person, by setting himself and gazing at the letters, can attain it. One caveat: don't make it a test. If you treat it as an experiment to verify, specifically then you may see nothing at all. But the door is open. Even for a simple person.",
    "he": ""
   },
   "intermediate": {
    "en": "T281: Af adam pashut — m'kabei atzmo al ha-sefer u-mistakel b'otiyot ha-Torah — yikhol lir'ot chiddushim niflaim. \"Ot u-tziruf otiyot\" (Yoma 73:). Ro'eh ba-sefer ma she-ein ha-mechaber meharher kelal. Hashgachah: lo l'kavea k'nisayon — efshar v'lo yireh kelum. LM 281.",
    "he": "אפילו פשוט — בהסתכלות על אותיות התורה רואה חידושים (יומא עג:); רואה בספר מה שלא נתכוון המחבר. אך אל תקבע לנסיון."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״א — יומא ע\"ג ע\"ב; אותיות פורחות ומצטרפות."
   }
  }
 ]
},
282: {
 "title_en": "Judge Every Person — and Yourself — to the Scale of Merit; Find the Good Points and Make Melodies",
 "title_he": "דן את כל האדם לכף זכות — מציאת הנקודות הטובות ועשיית ניגונים",
 "segs": [
  {
   "beginner": {
    "en": "You must judge every person to the scale of merit — even one who is completely wicked. You have to search until you find some little good in him, some little point where he is not wicked. Through finding that little good and judging him favorably, you actually move him from the scale of guilt to the scale of merit, and you can return him to teshuvah. \"And yet a little, and the wicked is no more; you contemplate his place and he is not\" (Psalms 37:10) — Rebbe Nachman reads this as: \"yet a little [good] and there is no [more] wicked one\" — by finding the residual good in him, the \"wicked\" identity dissolves. \"Contemplate his place\" — gaze at his place, his level, where he stands; and \"he is not\" — he is no longer the wicked one he was. The good point lifts him out.",
    "he": ""
   },
   "intermediate": {
    "en": "T282 §1: Tzarich ladun et ha-adam l'kaf zechut, va-afilu rasha gamur — l'chapeis nekudah tovah b'mashehu. \"V'od me'at v'ein rasha v'hitbonanta al mekomo v'einenu\" (Tehillim 37:10) — od me'at tov, v'ein rasha; mit'bonen al mekomo (mehutka l'kaf zechut). LM 282 §a.",
    "he": "צריך לדון כל אדם לכף זכות — לחפש הנקודה הטובה. \"ועוד מעט ואין רשע, והתבוננת על מקומו ואיננו\" (תהלים לז:י)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ב §א׳ — תהלים ל\"ז:י׳; דין לכף זכות מציל מן השאול."
   }
  },
  {
   "beginner": {
    "en": "And critically — the same applies to yourself. A person must find a little good in himself too. It is well known that a person must always be in joy and distance sadness very far. Even when you begin to look at yourself and see no good, only sins, and the yetzer wants to topple you with sadness and black bile — it is forbidden to fall. You must search and find some little good in yourself. How is it possible you didn't do even one mitzvah or good thing in your days? Even if when you look at that good thing it too looks full of wounds (foreign thoughts during the mitzvah, defects, distractions), even so — how can it be that not one single point in that mitzvah was good? Find it. The smallest possible point of holiness is enough to revive yourself with.",
    "he": ""
   },
   "intermediate": {
    "en": "T282 §2: V'lo rak b'acherim — gam b'atzmo. K'lal: simchah tamid, harchakat atzvut. Af k'shero'eh atzmo male peshaim — assur lipol — yesh l'chapeis nekudah tovah b'atzmo (\"halo asita mitzvah achat?\"). Af she-ha-mitzvah ha-hi mele'ah pegamim — yesh nekudah tovah b'mashehu. LM 282 §b.",
    "he": "אף בעצמו — \"הלא עשית מצוה אחת בימיך?\" אפילו במצוה הפגומה — נקודה טובה כל שהיא."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ב §ב׳ — חיפוש נקודה טובה בעצמו, כלל בעבודה."
   }
  },
  {
   "beginner": {
    "en": "Through this searching and finding little good in yourself, you go out from the scale of guilt to the scale of merit and can return in teshuvah — \"yet a little [good] and there is no wicked\" applied to yourself. By gathering more and more good points (each pulled out of bad), you make melodies — niggunim. The good points are notes; assembled, they sing.",
    "he": ""
   },
   "intermediate": {
    "en": "T282 §3: Ha-chipush u-metziat nekudah tovah → ge'ulah me-kaf chovah le-kaf zechut. M'kabetz nekudot v'oseh me-hen niggunim. LM 282 §c.",
    "he": "מציאת נקודות טובות עושה ניגונים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ב §ג׳ — קיבוץ נקודות טובות לניגון."
   }
  },
  {
   "beginner": {
    "en": "Through these melodies a person can pray and sing and thank Hashem from his physical state and his deeds, even when he sees how far he is from holiness. He revives himself with his own words — though he has many bad deeds, he searches and finds his good points and gladdens himself. Certainly one should enlarge his joy in every good point of Israel's holiness he finds in himself. Then, energized, he can pray and sing and thank Hashem. \"Azamerah l'Elohai b'odi\" (Psalms 146:2) — Rebbe Nachman reads \"b'odi\" not as \"in my time\" but as \"in my still-little\" — \"yet a little [good] and the wicked is no more.\" Through that point of \"still some good\" you can sing and thank Hashem.",
    "he": ""
   },
   "intermediate": {
    "en": "T282 §4: Niggunim → tefilah, shir, hoda'ah me-toch ha-gashmiyut. \"Azamerah l'Elohai b'odi\" (Tehillim 146:2) — \"b'odi\" = \"v'od me'at\" she-yesh bi mashehu tov. LM 282 §d.",
    "he": "\"אזמרה לאלקי בעודי\" (תהלים קמו:ב) — בעודי בחי' \"ועוד מעט\". משם תפלה ושירה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ב §ד׳ — תהלים קמ\"ו:ב׳; \"בעודי\" = \"ועוד מעט\"."
   }
  },
  {
   "beginner": {
    "en": "Reb Noson adds the strongest warning: this Torah is the foundation for everyone who wants to come close to Hashem and not lose his world entirely, G-d forbid. Many people who are far from Hashem are far primarily because of black bile and sadness — they fall into despair, see the spoilage of their deeds, and give up entirely. They stop praying with kavvanah and stop doing what they could still do. A person needs to be very wise about this, because all the falls of mind, even when they seem to follow real bad deeds, are themselves the work of the master of evil — who weakens the mind in order to topple the person completely. The remedy is to walk in this Torah — always searching for one little good, gathering points, reviving and gladdening yourself, hoping for salvation, praying and singing — \"Azamerah l'Elohai b'odi\" — until you merit true return.",
    "he": ""
   },
   "intermediate": {
    "en": "T282 §5: [R' Noson]: Yesod gadol — ha-richukim me-Hashem ikaram me-marah shechorah u-me-ye'ush. Kol nefilat ha-da'at — pe'ulat ba'al davar she-mi'achlish da'ato. Hitchazkut: l'chapeis nekudah tovah, l'kabetz, l'samei'ach, l'tzapot l'yeshu'ah, lehit'palel u-lehazmir. LM 282 §e.",
    "he": "[רבי נתן]: יסוד גדול — הריחוקים מה׳ עיקרם ממרה שחורה ויאוש. כל נפילת הדעת — מבעל דבר. התחזקות מתוך נקודות טובות."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ב §ה׳ — דברי רבי נתן; מרה שחורה כעיקר הריחוק."
   }
  },
  {
   "beginner": {
    "en": "And whoever can make these melodies — gathering the good points found among all Israel, even in the sinners — can pray before the amud as a shaliach tzibbur, because the prayer leader must be sent by all the public: he must gather all the good points of every davener and include them in himself, then stand and pray with all that combined good. This is the secret of the chazzan in the Mishnah (Shabbat 11a): \"the chazzan sees where the children are reading\" — meaning, the one who can make these melodies sees from which tzaddik each child receives his speech, from whose mouth they draw breath to enter Torah. Knowing all the tzaddikim, knowing which souls belong to which roots, who can make these melodies — to know all of this is to know the entire spiritual genealogy of Israel.",
    "he": ""
   },
   "intermediate": {
    "en": "T282 §6: Mi she-yodea la'asot ha-niggunim — yakhol l'hit'palel lifnei ha-amud k'shaliach tzibbur (mekabetz nekudot tovot shel ha-mit'palelim). \"Ha-chazzan ro'eh heichan ha-tinokot kor'in\" (Shabbat 11.) — yodea me-eizeh tzaddik kol tinok mekabel pe v'reishut Torah. Yedi'at ha-tzaddikim, ha-shorashim, ha-niggunim — yedi'ah achat. LM 282 §f.",
    "he": "מי שיודע לעשות הניגונים — שליח ציבור לפני העמוד; מקבץ נקודות הטוב של כל המתפללים. \"חזן רואה היכן התינוקות קורין\" (שבת יא.) — יודע מאיזה צדיק כל תינוק מקבל פיו."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ב §ו׳ — שבת י\"א; שליח ציבור = מאסף הנקודות הטובות."
   }
  }
 ]
},
283: {
 "title_en": "Two Tzaddikim From One Root — Why They Dispute (Saul and David)",
 "title_he": "שני צדיקים משורש אחד — מחלוקת (שאול ודוד)",
 "segs": [
  {
   "beginner": {
    "en": "Reb Noson notes that he heard precious matters of wondrous Torah here, much of it now lost — but he records what he can recall. Know that there are two tzaddikim who are from the same root, and even so there is a machloket between them — because at the root, one of them changes his attribute. They share the source, but each draws a different middah from it.",
    "he": ""
   },
   "intermediate": {
    "en": "T283 §1: Yesh shenei tzaddikim mi-shoresh echad — u-bein-am machloket, ki echad meshane middato ba-shoresh. LM 283 §a.",
    "he": "שני צדיקים משורש אחד — בכל זאת מחלוקת, כי אחד משנה מדתו בשורש."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ג §א׳ — שורש אחד, מחלוקת מתוך שינוי מדה."
   }
  },
  {
   "beginner": {
    "en": "This is the machloket of Shaul and David. \"Only good and chesed will pursue me\" (Psalms 23:6) — \"good\" that is wholly chesed. Good is rooted inward; chesed extends outward. Two tzaddikim from one root: one is the aspect of \"good\" hidden inward — he doesn't reveal his Torah to others — and the other is the aspect of \"chesed\" reaching outward, who reveals his Torah and teaches the public. \"And Torah of chesed is on her tongue\" (Sukkah 49b — Torah taught publicly, lishmah). The Talmud (Eruvin 53b): David revealed the masechta inscribed in him (\"those who fear You will see me and rejoice\"); Shaul did not reveal his inscribed masechta (\"makes all wickedness turn back\"). Shaul = inward \"good,\" hidden; David = outward \"chesed,\" revealed. From this very split arose their dispute. Like thunder (Rama 56): hot vapors rise like fire, clouds accumulate them until the cloud splits — thunder. Torah is fire (Yirmiyahu 23:29); when contained in one's heart without being revealed, it bursts as machloket. So too with students debating — these are the conversations of one-on-one Torah study. This kind of machloket comes from un-revealed Torah, from \"good\" not extended outward. The machloket of the wicked, by contrast, has no Torah at all in it (\"They have dug pits for me — arrogant conversations not according to Your Torah,\" Psalms 119:85). David's plea \"Only good and chesed will pursue me\" is precisely: when machloket pursues me, may it always be the holy machloket born of good and chesed — never the wicked kind.",
    "he": ""
   },
   "intermediate": {
    "en": "T283 §2: \"Akh tov va-chesed yirdefuni\" (Tehillim 23:6) — tov pnimi (Shaul, lo gilah masechta), chesed chitzoni (David, gilah masechta — Eruvin 53.; \"v'torat chesed al leshonah,\" Sukkah 49:). Machloket = ra'am (Rama 56) — Torah-eish kavush ba-lev poretz k'machloket. Lo k'machloket resha'im (\"karu li shichot shichot zedim asher lo k'toratecha,\" Tehillim 119:85). LM 283 §b.",
    "he": "שאול=טוב פנימי (לא גילה מסכת), דוד=חסד חיצוני (\"ותורת חסד על לשונה,\" סוכה מט:; עירובין נג.). \"אך טוב וחסד ירדפוני\" (תהלים כג:ו) — מחלוקת קדושה. הרעם — תורה כבושה בלב פורצת. מחלוקת רשעים — אין בה תורה (תהלים קיט:פה)."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ג §ב׳ — תהלים כג:ו, קי\"ט:פ\"ה; ירמיה כג:כט; סוכה מ\"ט; עירובין נ\"ג; רמ\"א נ\"ו."
   }
  }
 ]
},
284: {
 "title_en": "'No Time to Learn' — Steal Time From Business, Like a Robber",
 "title_he": "\"אין לי פנאי\" — לחטוף זמן ולגזול מן המסחר",
 "segs": [
  {
   "beginner": {
    "en": "Rebbe Nachman rebuked someone who told him he had no leisure to learn Torah because he was busy with business. The Rebbe answered: even so, you should snatch some time every day to occupy yourself with Torah. He explained: this is exactly what the Talmud (Shabbat 31a) means by the question \"Did you set kove'a (fixed) times for Torah?\" The word kove'a (קבע) is etymologically related to robbery — \"and robs the soul of those who rob them\" (Proverbs 22:23). Meaning: have you robbed time from your daily business — time you are busy earning — and dedicated it for Torah? Real fixity in Torah is achieved by stealing time from your other obligations. You don't make time; you take it.",
    "he": ""
   },
   "intermediate": {
    "en": "T284: Ha-omer ein li pnay — yachtof zman b'kol yom la-Torah. \"Kavata itim la-Torah?\" (Shabbat 31.) — kove'a leshon \"v'kava et kov'eihem\" (Mishlei 22:23 — gezeilah). To rob time from masa u-matan for Torah. LM 284.",
    "he": "האומר אין לי פנאי — יחטוף זמן בכל יום. \"קבעת עיתים לתורה?\" (שבת לא.) — קבע לשון \"וקבע את קובעיהם\" (משלי כב:כג); לגזול זמן מן המסחר לתורה."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ד — שבת ל\"א; משלי כ\"ב:כ\"ג; קבע=גזל; חטיפת זמן לתורה."
   }
  }
 ]
},
285: {
 "title_en": "'She Tasted That Her Merchandise Is Good' — One Taste of the Tzaddik's Torah Shines Forever",
 "title_he": "\"טעמה כי טוב סחרה\" — טעימה אחת מתורת הצדיק מאירה לעד",
 "segs": [
  {
   "beginner": {
    "en": "\"She tasted that her merchandise is good — her lamp does not go out at night\" (Proverbs 31:18). The deep reading: as soon as a person tastes the Torah of the true tzaddik, even if afterwards he is prevented from approaching it and is distanced from it (the aspect of \"night\" and \"darkness\"), nevertheless — \"her lamp does not go out at night.\" The light of that Torah he tasted will go on shining for him forever. \"She tasted that her merchandise is good\" — once you have tasted the goodness of the tzaddik's Torah (his \"merchandise,\" whose taste is \"good\"), the light of that Torah shines eternally, even through spiritual darkness and distance. The lamp does not go out, ever and ever.",
    "he": ""
   },
   "intermediate": {
    "en": "T285: \"Ta'amah ki tov sachra, lo yikhbeh ba-laila nerah\" (Mishlei 31:18) — miyad k'sheta'am torat ha-tzaddik ha-amiti, af im acherei ken nimna mi-mena ('laila' u-'choshech'), or ha-Torah she-ta'am yair lo l'olam. LM 285.",
    "he": "\"טעמה כי טוב סחרה לא יכבה בלילה נרה\" (משלי לא:יח) — מי שטעם תורת הצדיק האמיתי, אף בריחוק וחושך — אורה לעולם דולק."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ה — משלי ל\"א:י\"ח; אור הצדיק לא ייכבה."
   }
  }
 ]
},
286: {
 "title_en": "Gan Eden Has Two Aspects — Gan and Eden; The Sunken Gates and the Study of Poskim",
 "title_he": "גן עדן — גן ועדן; השערים השוקעים ולימוד הפוסקים",
 "segs": [
  {
   "beginner": {
    "en": "Reb Noson says: I heard from his name, long ago, something he said on Parashat Shoftim, of which much has been forgotten — and this is what we still remember. There is Gan Eden — and it has two aspects: Gan and Eden. (\"The Garden\" and \"Eden.\" Two distinct levels of one place.)",
    "he": ""
   },
   "intermediate": {
    "en": "T286 §1: [R' Noson]: shamati mi-shemo me-az al parashat Shoftim, v'shoteach lo memno hashibu — yesh Gan Eden b'shtei bechinot: Gan v'Eden. LM 286 §a.",
    "he": "[רבי נתן]: שמעתי משמו על פרשת שופטים — יש גן עדן בשתי בחינות: גן ועדן."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ו §א׳ — גן עדן בשתי בחינות."
   }
  },
  {
   "beginner": {
    "en": "These two correspond to chochmah ila'ah (upper wisdom) and chochmah tata'ah (lower wisdom). The main delight of Gan Eden is the attainment of divine chochmah — both upper and lower. But it is impossible to merit this except through gates — and these gates are the gates of Gan Eden, through which one enters to attain upper and lower wisdom. The catch: these gates are hidden and concealed in the earth — \"her gates have sunk into the ground\" (Lamentations 2:9). To raise them, one needs a master of the house on earth, a ruler on earth who can extract, raise, and set up the gates that have sunk in the ground.",
    "he": ""
   },
   "intermediate": {
    "en": "T286 §2: Gan = chochmah ila'ah; Eden = chochmah tata'ah. Ikar oneg Gan Eden — hasagat chochmah Eloka. Tzarich she'arim — nikbe'u ba-aretz: \"tav'u va-aretz she'areha\" (Eichah 2:9). Tzarich ba'al ha-bayit ba-aretz/melech ba-aretz l'ha'alotam. LM 286 §b.",
    "he": "גן=חכמה עילאה, עדן=חכמה תתאה. השערים שקועים בארץ — \"טבעו בארץ שעריה\" (איכה ב:ט). צריך מלך בארץ להעלותם."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ו §ב׳ — איכה ב:ט; שערי גן עדן שקועים בארץ."
   }
  },
  {
   "beginner": {
    "en": "Know that by studying the poskim — the halachic decisors — a person merits to become king and ruler on earth, and then he can set up and raise the sunken gates. This is the meaning of \"a king through justice establishes the land\" (Proverbs 29:4) — \"through justice\" specifically refers to mishpat, the laws and rulings of Torah, which is the study of poskim, who clarify the judgments and laws. Through learning poskim a person becomes king and ruler, and through that royalty he can establish the land and raise the sunken gates of Gan Eden.",
    "he": ""
   },
   "intermediate": {
    "en": "T286 §3: Limud ha-poskim → zoche l'melech v'shalit ba-aretz → me'akem ha-she'arim. \"Melech b'mishpat ya'amid aretz\" (Mishlei 29:4) — mishpat = poskim. LM 286 §c.",
    "he": "לימוד הפוסקים → מלך בארץ → \"מלך במשפט יעמיד ארץ\" (משלי כט:ד) → העלאת השערים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ו §ג׳ — משלי כ\"ט:ד׳; פוסקים → מלכות → העלאת שערים."
   }
  },
  {
   "beginner": {
    "en": "Therefore the verse says \"Judges and officers shall you appoint for yourself in all your gates\" (Devarim 16:18) — these judges and officers are the leaders and rulers on earth, and it is precisely through judges, through the judgments of Torah (poskim), that the gates buried in the earth are revealed. Judges and officers correspond to the leaders who raise the sunken gates through their rulings, fulfilling \"a king through justice establishes the land.\" The simple verse about courts in every town turns out to be the secret of how the gates of Gan Eden return to their place: by the study and practice of halachah.",
    "he": ""
   },
   "intermediate": {
    "en": "T286 §4: \"Shoftim v'shotrim titen lecha b'kol she'arecha\" (Devarim 16:18) — manhigim ba-aretz; al yedei ha-shoftim u-mishpetei ha-Torah (poskim) mit'galim ha-she'arim ha-tevu'im ba-aretz. \"Melech b'mishpat ya'amid aretz.\" LM 286 §d.",
    "he": "\"שופטים ושוטרים תתן לך בכל שעריך\" (דברים טז:יח) — ע\"י השופטים ולימוד הפוסקים מתגלים שערי גן עדן השקועים."
   },
   "scholarly": {
    "en": "",
    "he": "LM א׳ רפ״ו §ד׳ — דברים ט\"ז:י\"ח; משלי כ\"ט:ד׳; שופטים = העלאת שערי גן עדן."
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
print("lm-commentaries.json updated for T276-T286 -- LM PART 1 COMPLETE!")

os.chdir(repo)
add = subprocess.run(['git','add'] + git_files, capture_output=True, text=True)
commit = subprocess.run(['git','commit','-m',
    'feat: T276-T286 PNC -- shabbat-eating/machloket-dust/chalif-kelim/torah-shofar/business-litigation/letter-combinations/azamerah-good-points/two-tzaddikim/steal-time-torah/tasted-merchandise/gan-eden-gates --- LM PART 1 COMPLETE'],
    capture_output=True, text=True)
print(f'commit: {commit.returncode}', commit.stdout, commit.stderr)
push = subprocess.run(['git','push','origin','main'], capture_output=True, text=True)
print(f'push: {push.returncode}', push.stdout, push.stderr)
