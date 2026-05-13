import json, os

home = os.path.expanduser('~')
reader_dir = os.path.join(home, '.openclaw/workspace/ajew-org/public/reader')
pnc_name = "pettek-nanach-commentary"
pnc_book_slug = pnc_name
pnc_dir = os.path.join(reader_dir, pnc_name)

torahs = {
    5: {
        "title_en": "Tiku Vachodesh — Ha'Ikar Hu HaEmunah (Blow the Shofar in the Month — The Essence is Faith)",
        "title_he": "תקעו בחדש — העיקר הוא האמונה",
        "segs": [
            {
                "beginner": "The verse 'Blow the shofar at the new month, at the concealed time for the day of our festival, for it is a statute for Israel, a judgment for the G-d of Yaakov' (Tehillim 81:4-5). The opening verse of Tinyana T1 returns here, but now the focus shifts: this entire long teaching will treat what makes Rosh HaShanah possible — emunah and the gathering of faith through the tzaddik's yeshivah.",
                "intermediate": "פתיחתא: 'תקעו בחדש שופר בכסה ליום חגנו כי חק לישראל הוא משפט לאלקי יעקב' (תהלים פ\"א:ד'-ה'). תורה זו תתפרס סביב: אמונה → מי העצה → גרים → תפילין כשבעה רועים → שבעה אקלימים → חלומות → צום ושמחה → ניסן → תקיעה תרועה שברים → ר\"ה → ה' חושי המוח → ישיבת הצדיק → שינה → ריאה → ריתמא → המתקה.",
                "scholarly": "תהלים פ\"א:ד'-ה'; ל\"מ ח\"ב סי' ה'"
            },
            {
                "beginner": "The principal is faith — emunah — and everyone must examine themselves and strengthen themselves in it. There are those who suffer wondrous plagues (makkos pli'os) — strange, extraordinary afflictions — only because their emunah is weak. Faith is not a private spiritual luxury but the foundational health of the whole person; its lack manifests as illnesses that medicine cannot name.",
                "intermediate": "העיקר הוא האמונה. כל אחד צריך לפשפש בעצמו ולהתחזק באמונה, כי יש סובלים חולאים — מכות פליאות — והעיקר מחמת חולשת האמונה. *Diagnostic*: 'wondrous plague' = an illness whose root is failure of emunah, not failure of biology.",
                "scholarly": "דברים כ\"ח:נ\"ט; ל\"מ ח\"א סי' י\"ב; ל\"מ ח\"א סי' ע'"
            },
            {
                "beginner": "The remedy is to strive and find the waters from which emunah grows — and these waters are the aspect of etzah (advice, spiritual counsel). The proper counsel from a true tzaddik is the water that nourishes faith. Without etzah, faith withers; with it, faith blossoms. One must seek the tzaddik whose advice is itself living water.",
                "intermediate": "הרפואה: לחפש המים שמהם תצמח האמונה. ומים אלו = בחי' עצה, שממנה האמונה גדלה. *Mechanism*: עצת הצדיק = מים חיים → אמונה גדלה → רפואה.",
                "scholarly": "ישעיה י\"ב:ג'; ל\"מ ח\"א סי' ז'; ל\"מ ח\"א סי' ס\"א"
            },
            {
                "beginner": "Likewise, the merit of the avos: 'Before their fathers He did wonders' (Tehillim 78:12). And: 'And I trained Ephraim' (Hoshea 11:3) — the aspect of giving advice. As the verse says, 'The people at your feet' (Shemot 11:8) — those who follow your advice. The avos and the tzaddikim train Israel by giving them the very etzah that becomes their water of emunah.",
                "intermediate": "וכן זכות אבות, בחי' (תהלים ע\"ח:י\"ב) 'נגד אבותם עשה פלא'. וזה (הושע י\"א:ג') 'ואנכי תרגלתי לאפרים' = בחי' עצה, כדכתיב (שמות י\"א:ח') 'העם אשר ברגליך' — ההולכים אחר עצתך.",
                "scholarly": "תהלים ע\"ח:י\"ב; הושע י\"א:ג'; שמות י\"א:ח'"
            },
            {
                "beginner": "'They did not know that I healed them' (Hoshea 11:3) — for in truth, through this very giving of etzah, healing is achieved. This is the aspect of the creation of the world: first darkness, then light. Darkness = absence of advice; light = revelation of advice. Healing the wondrous plagues follows the same primordial sequence: from chaos to counsel, from darkness to light.",
                "intermediate": "'ולא ידעו כי רפאתים' (הושע י\"א:ג'). באמת ע\"י זה הרפואה. בחי' בריאת העולם: תחלה חושך ואח\"כ אור. חושך = העדר עצה; אור = התגלות עצה. *Pattern*: cosmogenesis = healing-process, both progress דרך חושך → אור.",
                "scholarly": "הושע י\"א:ג'; בראשית א'; איוב כ\"ח:י\"א"
            },
            {
                "beginner": "Through the revelation of advice, which is the revelation of light from darkness — the night pushed away, the day revealed — emunah grows. The growth of emunah is itself the dawning of light. Where one stood in confusion (darkness), the tzaddik's etzah breaks through, and emunah grows in the same instant the light arrives.",
                "intermediate": "ע\"י התגלות העצה = התגלות אור מתוך חשך — דחיית הלילה והופעת היום — אמונה גדלה. *Phenomenology*: confusion-resolved = light-arrived = emunah-grown — three names for one event.",
                "scholarly": "איוב כ\"ח:י\"א; ל\"מ ח\"א סי' י\"א"
            },
            {
                "beginner": "He replied (when asked the order of healing): like the creation of the world, first darkness and then light. The primary growth of emunah is through etzah, which is the aspect of revealing depths from darkness — for emunah is precisely the seeing-through of obscurity, the recognition of HaShem behind the cover.",
                "intermediate": "ענהו: כבריאת עולם, תחלה חשך ואח\"כ אור. עיקר צמיחת האמונה ע\"י עצה = בחי' מגלה עמוקות מני חשך, כי אמונה = ראיית הנעלם.",
                "scholarly": "איוב י\"ב:כ\"ב; ל\"מ ח\"א סי' ז'"
            },
            {
                "beginner": "Through this comes 'And abundant silver for you' — the increase of livelihood. Through livelihood the tzaddik refines his soul, for the eating of the tzaddik is only for the sake of the soul: 'The tzaddik eats to satisfy his soul' (Mishlei 13:25). The wicked eat to fill the body; the tzaddik eats to clarify the soul. Parnasah, in the tzaddik's hands, becomes a tool of soul-clarification.",
                "intermediate": "וזה בחי' רב כסף לך = רבוי פרנסה. ע\"י פרנסה הצדיק מצרף נפשו, כי אכילת הצדיק לצורך הנפש בלבד, בחי' (משלי י\"ג:כ\"ה) 'צדיק אוכל לשובע נפשו'. *Inversion*: the wicked use eating to fill body; the tzaddik uses eating to refine soul.",
                "scholarly": "משלי י\"ג:כ\"ה; ברכות ה' ע\"א; ל\"מ ח\"א סי' י\"ז"
            },
            {
                "beginner": "Sometimes converts are made in potential, sometimes in actuality — either gentiles literally convert, or, only in potential: by raising the fallen holy faith and weakening their false beliefs, the holy emunah is revealed to them where they are. Even when they do not formally convert, the emunah at their core is awakened, and the world's emunah-balance shifts.",
                "intermediate": "לפעמים גרים בפועל, לפעמים בכח: או שמתגיירים ממש, או רק בכח — שע\"י הרמת האמונה הנפולה ולחיצת אמונותיהם הזרות, מתגלית בהם האמונה הקדושה במקומם. *Cosmic shift*: every Jewish strengthening of emunah weakens nokhri belief everywhere, even without conversions.",
                "scholarly": "יבמות מ\"ז ע\"א; קדושין ע' ע\"ב; ל\"מ ח\"א סי' י\"ז"
            },
            {
                "beginner": "When the false beliefs were not initially so strong, then when they are broken and turned to holiness, only converts in potential are made. The principle: by raising the fallen faith — by uplifting the sparks of holy emunah scattered in nokhri belief-systems — converts are produced (in potential or actuality) according to the depth of the prior fall.",
                "intermediate": "כשאמונות הזרות לא היו חזקות מתחלה, ובהשברן ובהפכן לקדושה — נעשו רק גרים בכח. הכלל: בהרמת האמונה הנפולה, גרים נעשים — בכח או בפועל לפי עמק נפילתם.",
                "scholarly": "סנהדרין צ\"ו ע\"ב; ל\"מ ח\"א סי' י\"ז"
            },
            {
                "beginner": "Because these converts are made from gathering the fallen emunah, they harm Israel — as the Sages teach, 'Converts are as difficult for Israel as a sappachat' (Kiddushin 70a). A sappachat is a sore, the aspect of plagues — the wondrous plagues mentioned above. The converts carry residual heaviness from the unfit beliefs they came through; this heaviness afflicts Israel until fully refined.",
                "intermediate": "מפני שגרים אלו נעשים מקיבוץ אמונה נפולה — מזיקים לישראל, בחי' 'קשים גרים לישראל כספחת' (קדושין ע' ע\"א). ספחת = נגעים = מכות פליאות הנ\"ל. *Cause*: residual unfit-belief travels with them.",
                "scholarly": "קדושין ע' ע\"א-ע\"ב; ויקרא י\"ג; ל\"מ ח\"א סי' י\"ב"
            },
            {
                "beginner": "Through these converts, the leaders of the generation receive the sword of pride — 'And He who is the sword of your pride' (Devarim 33:29) misappropriated. The verse should refer to HaShem's pride defending Israel; the corrupt leaders take that very pride and turn it into self-aggrandizement, ruling over a poor people without cause and even punishing them.",
                "intermediate": "מקבלים את חרב הגאוה, בחי' 'ואשר חרב גאותך' (דברים ל\"ג:כ\"ט) — דרך הגרים הנ\"ל המכניסים גאוה לישראל. שולטים בעם עני שלא במשפט, יש להם כח להכאיב.",
                "scholarly": "דברים ל\"ג:כ\"ט; ישעיה י\"ד; ל\"מ ח\"א סי' י\"ז"
            },
            {
                "beginner": "In truth, this should not be called 'punishing' but 'harming' — they are the world's harmers to Israel, like a sore. They are the aspect of after-growths (sefichim) that grow on their own, without being planted properly: through the converts, the leaders of the generation grow haughtily without legitimate root, like aftergrowths on a fallow field — vigorous, but unrooted.",
                "intermediate": "באמת אינו נקרא ענישה אלא הזק — הם מזיקי עולם לישראל, כספחת, בחי' ספיחים הצומחים מאליהם — שע\"י הגרים, מנהיגי הדור מתגאים, צומחים מעצמם והולכים ברמות. *Image*: spurious leadership = aftergrowth — vigorous on the surface, no proper root.",
                "scholarly": "ויקרא כ\"ה:ה'; ל\"מ ח\"א סי' י\"ב"
            },
            {
                "beginner": "The verse 'The sayings of HaShem are pure sayings, refined sevenfold' (Tehillim 12:7) — these are pure sayings made through the purification of intellect, the aspect of tefillin, which are the aspect of the seven shepherds (Avraham, Yitzchak, Yaakov, Moshe, Aharon, Yosef, David). Through them seven 'restorers of mind' are made, capable of repairing the disturbances of intellect.",
                "intermediate": "'אמרות ה' אמרות טהורות מזוקק שבעתים' (תהלים י\"ב:ז') = אמרות טהורות שנעשו ע\"י זיכוך השכל = תפילין = שבעה רועים — שעל ידם נעשים שבעה משיבי השכל.",
                "scholarly": "תהלים י\"ב:ז'; סוכה נ\"ב ע\"ב (שבעה רועים); תקוני זהר; ל\"מ ח\"א סי' ל\"ו"
            },
            {
                "beginner": "This is the aspect of 'HaShem gives a saying, the bearers of tidings are a great host' (Tehillim 68:12). The 'saying HaShem gives' = the pure sayings, the impression of intellect, the aspect of an angel. The bearers of tidings = those whose mouths carry the angelic message because their intellect has been purified through the seven shepherds (the tefillin).",
                "intermediate": "וזה בחי' (תהלים ס\"ח:י\"ב) 'ה' יתן אומר המבשרות צבא רב'. 'ה' יתן אומר' = אמרות טהורות = רושם השכל = מלאך. 'המבשרות צבא רב' = הנושאים את האמירה.",
                "scholarly": "תהלים ס\"ח:י\"ב; שבת קי\"ט ע\"א; ל\"מ ח\"א סי' י\"ג"
            },
            {
                "beginner": "When there is no strength in the angel, the dream is corrupted by foods — the aspect of a 'dream through a shed' (an impure intermediary), ch\"v. There are seven climates (cosmic regions) and over each climate is appointed a different angel; in each climate different fruits grow according to the appointed angel. When the angel above the eater is weak, the food itself becomes a corrupting messenger to the dream-faculty.",
                "intermediate": "כשאין כח במלאך — החלום נפגם ע\"י המאכלות, בחי' חלום ע\"י שד ח\"ו. שבעה אקלימים, על כל אקלים מלאך, ובכל אקלים פירות שונים לפי המלאך. *Architecture*: angel above food → strength in food → strength in dream; reverse it = pollution.",
                "scholarly": "ברכות נ\"ה ע\"ב; שבת קל\"ט ע\"א; ל\"מ ח\"א סי' פ\"ב"
            },
            {
                "beginner": "Therefore in each climate different fruits grow, according to the appointed angel, and the seven climates correspond to the seven shepherds, which are the seven tefillin (the kabbalistic dimension of the tefillin, paralleling the Avos and the chesed-gevurah-tiferes-netzach-hod-yesod-malchus). Geography itself is the visible expression of an angelic-shepherd hierarchy; food connects the eater to that hierarchy.",
                "intermediate": "בכל אקלים פירות שונים לפי המלאך, וז' אקלימים = ז' רועים = ז' תפילין. *Geography of soul*: physical climate ↔ supernal angel ↔ root-shepherd ↔ tefillin-letter. Food bridges all four.",
                "scholarly": "ברכות נ\"ה ע\"א; ל\"מ ח\"א סי' י\"ג; שער הכוונות, סוד התפילין"
            },
            {
                "beginner": "This is the aspect of the angel — 'And the angel of His face saved them' (Yeshayahu 63:9) — strengthened through a joyful heart. Therefore the place of the angels is called Shamayim — from sham-mayim (there waters), and the Sages link it to laughter and joy (sin-mem-ches), for the primary strengthening of angels is through joy. Sad service produces weak angels; joyful service strengthens them.",
                "intermediate": "וזה בחי' מלאך, בחי' (ישעיה ס\"ג:ט') 'ומלאך פניו הושיעם', המתחזק ע\"י לב שמח. ולכן מקום המלאכים = שמים, מלשון 'שמחה' (חגיגה י\"ב ע\"א), כי עיקר חיזוק המלאכים בשמחה. *Causation*: simchah-below = strong-malach-above.",
                "scholarly": "ישעיה ס\"ג:ט'; חגיגה י\"ב ע\"א; ל\"מ ח\"א סי' כ\"ד"
            },
            {
                "beginner": "Through fasting, joy is made; through joy, strength is given to the angel; through the strengthened angel, the bad dream is rectified — for the bad dream came precisely from the angel's weakness. Therefore one who fears bad dreams should fast (Ta'anit Chalom), for the fast itself produces the joy that strengthens the angel that purifies the dream. The chain runs: fast → joy → angel → dream.",
                "intermediate": "ע\"י תענית — נעשית שמחה; ע\"י שמחה — כח למלאך; ע\"י כח המלאך — תיקון החלום הרע. כי החלום הרע מחולשת המלאך. הנה תענית חלום (שבת י\"א ע\"א).",
                "scholarly": "שבת י\"א ע\"א; תענית י\"ב ע\"ב; ל\"מ ח\"א סי' רע\"ז"
            },
            {
                "beginner": "But the primary renewal of will is in Nisan, and then is the primary strengthening of angels. Then in Nisan, it would have been fitting that the impurity be completely nullified, since the angel's power was rectified and strengthened. However, the regalim cycle through the year, and Tishrei carries its own task: the rectification of the heart through the shofar, which the rest of the teaching now develops.",
                "intermediate": "עיקר חידוש הרצון בניסן, ואז עיקר חיזוק המלאכים. ואז ראוי היה שתתבטל הטומאה לגמרי, אך כל מועד ועניינו: ניסן = רצון; תשרי = שופר ולב.",
                "scholarly": "שמות י\"ב; ר\"ה י\"א ע\"א; ל\"מ ח\"ב סי' ה'"
            },
            {
                "beginner": "This is the aspect of tekiah, teruah, shevarim. Tekiah — the long sustained blast — is awe, the aspect of 'Will a shofar be blown in a city and the people not tremble?' (Amos 3:6). Teruah — the rapid wail — is the holy intellect (linked to the Aramaic targum 'and tomorrow' — yebavah, the trumpeting that signals royal proclamation, the call to mind). Shevarim — the broken sobs — is the rectification of justice through the broken heart.",
                "intermediate": "ג' קולות השופר: תקיעה = יראה (עמוס ג':ו'); תרועה = השכל הקדוש; שברים = תיקון המשפט ע\"י לב נשבר. *Anatomy of shofar*: tekiah ↔ awe of body (trembling); teruah ↔ awe of mind (alarm); shevarim ↔ awe of heart (breakage).",
                "scholarly": "עמוס ג':ו'; ר\"ה ל\"ג ע\"ב; ל\"מ ח\"ב סי' ה'"
            },
            {
                "beginner": "Shevarim is the aspect of true and just dreams — 'the count of the dream and its solving' (Shoftim 7:13) — meaning true and just dreams. Also, shevarim is the rectification of justice through the broken heart — 'a broken heart' (Tehillim 51:19) (Tikkunei Zohar). When the heart is broken in proper teshuvah, the corrupted dream-stream is righted at its source: the heart that produced bad dreams becomes the heart that produces true ones.",
                "intermediate": "שברים = חלומות אמתיים, בחי' 'סייפר הסיפור החלום ואת שברו' (שופטים ז':י\"ג); ושברים = תיקון המשפט ע\"י 'לב נשבר' (תהלים נ\"א:י\"ט) (תקוני זהר). *Repair-loop*: broken heart in teshuvah → corrected dream-flow → corrected mishpat below.",
                "scholarly": "שופטים ז':י\"ג; תהלים נ\"א:י\"ט; תקוני זהר"
            },
            {
                "beginner": "The heart is the place of mishpat, as the verse says, 'And Aharon shall bear the mishpat of the children of Israel upon his heart' (Shemot 28:30) — the choshen mishpat is on the kohen gadol's heart. When mishpat is corrupted, fallen loves heat the heart. One must extinguish the heart's wrong heat through shevarim — through breaking it open in tearful teshuvah.",
                "intermediate": "הלב = מקום המשפט, בחי' (שמות כ\"ח:ל') 'ונשא אהרן את משפט בני ישראל על לבו' = חשן המשפט. כשהמשפט מקולקל — מחממים את הלב באהבות הנפולות; ולכן צריך לכבותו ע\"י שברים. *Mechanism*: broken sob = quenching heat of fallen loves.",
                "scholarly": "שמות כ\"ח:ל'; ירמיה ב'; ל\"מ ח\"ב סי' ה'"
            },
            {
                "beginner": "And this is Rosh HaShanah — specifically Rosh (Head) — because the aspect of the mind is made and rectified, as mentioned. This is the aspect of the five senses of the mind (chamishah chushei hamoach), all present at Rosh HaShanah, for there are five senses in the mind: sight, hearing, smell, taste, touch — but in their inner, mochin form, where each sense corresponds to a specific cognitive act. Rosh HaShanah engages all five at once.",
                "intermediate": "וזה ראש השנה — דייקא ראש, כי בחי' המוחין נעשית ונתקנת. וזה בחי' חמשה חושי המוח, וכולן בבחי' ר\"ה: חמשה חושי המוח (פנימיים) = חמשה אופני הכרה. *Internalization*: external senses (חושים) correspond to internal mochin (חושי המוח).",
                "scholarly": "תקוני זהר; שער הכוונות, ר\"ה; ל\"מ ח\"א סי' כ\"ה"
            },
            {
                "beginner": "Through the gathering of the talmidim to the tzaddik, the portions of emunah are gathered. The very word 'yeshivah' is named after the gathering (yeshiva from yashav — to sit-and-gather): the tzaddik's study with his talmidim is called a yeshiva because it is the place where the dispersed sparks of holy emunah are reassembled into wholeness through the shared act of learning.",
                "intermediate": "ע\"י קיבוץ התלמידים אצל הצדיק — מתקבצים חלקי האמונה (שורש קב\"צ). לכן ישיבת הצדיק עם תלמידיו נקראת 'ישיבה', ע\"ש קיבוץ חלקי האמונה. *Etymology*: yeshivah = gathering = the architectural function of tzaddik+talmidim around emunah.",
                "scholarly": "אבות א':א'; ברכות ס\"ג ע\"ב; ל\"מ ח\"א סי' ע\"ז"
            },
            {
                "beginner": "This is the seal of holiness rectified through them: 'Seal the Torah among My students' (Yeshayahu 8:16). And this is the aspect of what the Sages said: 'When the Rabbis arose from the yeshiva of Rav Huna, they shook out their cloaks and the dust rose to the heavens' (Ketubot 106) — the dust of their gathering reached the heavens because the gathering itself reassembled emunah at every level above and below.",
                "intermediate": "חותם הקדושה, בחי' (ישעיה ח':ט\"ז) 'חתום תורה בלמודי'. בחי' (כתובות ק\"ו): 'כי הוו קיימי רבנן מבי רב הונא, מנפצי גלימייהו וסליק אבקא לרקיע'. *Image*: dust shaken from cloaks = sparks gathered, ascending.",
                "scholarly": "ישעיה ח':ט\"ז; כתובות ק\"ו ע\"א; ל\"מ ח\"א סי' י\"ג"
            },
            {
                "beginner": "Sometimes the mind is withdrawn from the tzaddik and also from the talmidim, for the mind is not always constant. During the withdrawal, this is the aspect of the withdrawal of Moshe (the daas), the aspect of sleep. Through the rectification of the mind through the gathering of disciples, the withdrawal is overcome and Moshe's daas returns. The yeshiva is the awakening from the slumber of withdrawn mochin.",
                "intermediate": "לפעמים המוחין מסתלקים — מן הצדיק ומן התלמידים, שאין המוחין תמידיים. ובהסתלקות — בחי' הסתלקות משה = בחי' שינה. ע\"י תיקון המוחין דרך הקיבוץ — חזרת המוחין. *Cycle*: contraction-expansion of daas = sleep-wake of generation.",
                "scholarly": "דברים ל\"ד; שבת ל' ע\"ב; ל\"מ ח\"א סי' ע\"ה"
            },
            {
                "beginner": "Even one who truly has a great mind, when he comes to perform any avodah, must cast aside all chochmah and engage in the service of HaShem in pure simplicity. He must even act and do things that appear as madness for the sake of serving HaShem — as the verse hints (and the Rebbe will speak of this elsewhere as 'kabel et kol haTorah b'tmimut'). Sophistication, in the moment of avodah, is the enemy of avodah.",
                "intermediate": "אפילו מי שיש לו מוחין גדולים — בעת העבודה צריך לזרוק כל החכמה ולעבוד בפשיטות. ולעשות דברים הנראים כשטות לכבוד שמים. *Paradox*: highest chochmah produces lowest temimut at the moment of avodah.",
                "scholarly": "שמואל ב' ו'; ל\"מ ח\"ב סי' י\"ב; שיחות הר\"ן ר\"כ"
            },
            {
                "beginner": "When the lung is in its perfection, this is the rectification of sleep, for sleep happens through the lung — the lung being cold and moist, and through cold and moist the essence of sleep is achieved. Therefore in the season of rains it is a time of sleep (the world rests, animals hibernate, humans grow drowsy). The lung's health is the body's permission to rest properly; rest, in turn, restores mind.",
                "intermediate": "כשהריאה בשלמותה — תיקון השינה. השינה ע\"י הריאה, שהיא קרה ולחה, וע\"י קרירות ולחות עיקר השינה. בעת הגשמים — עת השינה.",
                "scholarly": "ברכות ס\"א ע\"ב; שבת קכ\"ח ע\"ב; ל\"מ ח\"א סי' רכ\"ה"
            },
            {
                "beginner": "And this is the meaning of: Rav Ashi said, 'Huna bar Natan told me: Once we were traveling in the desert, and we had a thigh of meat with us. We opened it, removed its sinews, placed it on grass until we brought firewood. It dried up, and we roasted it.' (Bava Batra 74). The Rebbe will now decode this as a parable of how the heart's heat (fallen loves) can be safely contained and turned to holy use through hidden tzaddikim of the desert.",
                "intermediate": "סיפור רב אשי: הונא בר נתן ספר — נסעו במדבר, היה להם ירך בשר, פתחוהו, הוציאו גידיו, הניחו על עשבים, התייבש ונצלה (ב\"ב ע\"ד ע\"א). *Setup for allegory*: desert = exile; meat = body's stuff; sinews = constraints; grass = tzaddikim of desert; coals smoldering = unquenched flame of holy desire below the surface.",
                "scholarly": "ב\"ב ע\"ד ע\"א"
            },
            {
                "beginner": "When we returned after twelve months, we saw those coals still smoldering. When I came before Ameimar, he said: 'That grass was samtri, and those coals were of ritma' (Bava Batra 74). Ameimar revealed that the grass and the coals were not ordinary — they were specific holy plants whose nature is to retain fire across a year. The Rebbe interprets: ritma is precisely the place where heart-heat can be safely held without consuming itself.",
                "intermediate": "אחר י\"ב חדשים מצאו אותם הגחלים בוערות. אמר אמימר: ההוא עשבא — שמתרי, וההוא גחלים — דריתמא (ב\"ב ע\"ד ע\"א). *Decoded*: samtri grass = the tzaddikim's daas-plane; ritma coals = the heart of love-purified-through-shevarim, retaining its fire over an entire year.",
                "scholarly": "ב\"ב ע\"ד ע\"א; ל\"מ ח\"ב סי' ה'"
            },
            {
                "beginner": "Ritma (רתמא) is the acronym of: 'Resafav rispeh ahavah, mibanot Yerushalayim' — its interior is paved with love from the daughters of Yerushalayim (a phrase from Shir HaShirim 3:10 read kabbalistically). From the fall of this love came the heart's heating — for the heart was made to burn with love of HaShem, but when that love falls, it becomes love of the wrong things. The rectification: 'Harness the chariot' (esor hamerkavah) — the binding of the merkavah, the binding of the heart's loves back to their root.",
                "intermediate": "ריתמא = ר\"ת 'רצפתו רצוף אהבה מבנות ירושלים' (שה\"ש ג':י'). מנפילת האהבה הזו = החימום הנ\"ל. ואין תיקון אלא בבחי' 'אסר הרכב' = קשירת המרכבה. *Synthesis*: ritma = where the binding (esor) re-anchors fallen love.",
                "scholarly": "שיר השירים ג':י'; מ\"א ט\"ז; ל\"מ ח\"ב סי' ה'"
            },
            {
                "beginner": "'For it is a chok for Israel' (Tehillim 81:5) — a chok is for the year of sustenance (Beitzah 16a) — the rectification of foods, mentioned earlier (the seven climates, the eating that purifies the soul). 'A judgment for the G-d of Yaakov' — this is the rectification of mishpat through the broken heart of shevarim. The opening verse closes the entire teaching: chok of food rectified → mishpat of heart rectified → tekiah-teruah-shevarim → Rosh HaShanah.",
                "intermediate": "'כי חק לישראל הוא' (תהלים פ\"א:ה') = חק לשנת המזונות (ביצה ט\"ז ע\"א) = תיקון המאכלות. 'משפט לאלקי יעקב' = תיקון המשפט ע\"י לב נשבר.",
                "scholarly": "תהלים פ\"א:ה'; ביצה ט\"ז ע\"א"
            },
        ]
    },
}

written = []
for n, info in torahs.items():
    if not info.get('segs'):
        continue
    segs_out = []
    for s in info['segs']:
        segs_out.append({
            "beginner": {"en": s["beginner"], "he": ""},
            "intermediate": {"en": s["intermediate"], "he": ""},
            "scholarly": {"en": "", "he": s["scholarly"]}
        })
    data = {
        "id": f"pnc-2-{n}",
        "book": pnc_name,
        "part": 2,
        "torah": n,
        "title": f"T{n} (Tinyana) PNC - {info['title_en']}",
        "hebrewTitle": info['title_he'],
        "author": "Pettek Nanach",
        "segments": segs_out
    }
    fname = os.path.join(pnc_dir, f"tinyana-{n}.json")
    with open(fname, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(fname, 'r', encoding='utf-8') as f:
        rt = json.load(f)
    assert rt['id'] == data['id']
    assert len(rt['segments']) == len(segs_out)
    written.append((n, len(segs_out)))
    print(f"OK Tinyana T{n}: wrote {len(segs_out)} segs".encode('ascii','replace').decode())

cpath = os.path.join(home, '.openclaw/workspace/ajew-org/src/data/lm-commentaries.json')
with open(cpath, 'r', encoding='utf-8') as f:
    cdata = json.load(f)
if '2' not in cdata:
    cdata['2'] = {}
for n, info in torahs.items():
    sn = str(n)
    if sn not in cdata['2']:
        cdata['2'][sn] = {}
    cdata['2'][sn]['running_commentary'] = {
        "book": pnc_name,
        "slug": pnc_book_slug,
        "status": "available",
        "url": f"/reader/{pnc_book_slug}/tinyana-{n}.json",
        "layers": ["beginner", "intermediate", "scholarly"],
        "author": "Pettek Nanach",
        "label": f"Pettek Nanach Running Commentary - Tinyana T{n} ({info['title_en']})"
    }
with open(cpath, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)
print(f"\nDone: {written}")
