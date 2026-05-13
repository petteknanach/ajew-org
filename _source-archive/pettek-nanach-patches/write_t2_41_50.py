# -*- coding: utf-8 -*-
import os, json, sys

home = os.path.expanduser('~')
pnc_name = "pettek-nanach-commentary"
base = os.path.join(home, '.openclaw', 'workspace', 'ajew-org', 'public', 'reader')
pnc_dir = os.path.join(base, pnc_name)
src_dir = os.path.join(base, 'likutay-moharan', 'part-2')
commentaries_path = os.path.join(home, '.openclaw', 'workspace', 'ajew-org', 'src', 'data', 'lm-commentaries.json')

torahs = {
    41: {
        "title_en": "Hashem Performs Mofsim Through the Poskim",
        "title_he": "לפעמים השם יתברך עושה מופתים על ידי בעלי הפוסקים",
        "segs": [
            {
                "beginner": "Sometimes Hashem performs miracles through the great halachic decisors. Just as their rulings on what is forbidden and permitted are accepted, so too when they declare that something will happen, that very ruling becomes a miracle. The 'mishpetei piv' — the judgments of His mouth, voiced through His chosen poskim — themselves carry the weight of mofes. This is the secret behind the wonders attributed to the Geonim of earlier generations.",
                "intermediate": "**Sometimes Hashem performs mofsim through the poskim** — בבחינת \"מופתיו ומשפטי פיהו\" (דברי הימים א טז:יב). Through 'mishpetei piv' — that he poskens that it should be so — a mofes is made. Because he is mekabel as a baal-poseik, when he poskens on issur ve-heter his da'as is mekabel; so too when he poskens on any matter, his da'as is mekabel and **mofsim are made through him**. Cf. mofsim of the Geonim be-doros she-lefaneinu.",
                "scholarly": "[T2:41] לפ\"ת \"מופתיו ומשפטי פיהו\" (דה\"א טז:יב) — מופת על ידי משפטי פיו של הפוסק. עי' ספרי הגאונים ובעלי המופת."
            }
        ]
    },
    42: {
        "title_en": "Ki Ani Hashem Rofecha — Acronym Amen Ken Yehi Ratzon",
        "title_he": "כי אני יי רפאך",
        "segs": [
            {
                "beginner": "The verse 'For I, Hashem, am your healer' (Exodus 15:26) hints at the answer 'Amen, may it be His will' through its initial letters: Amen-Ken-Yehi-Ratzon. Healing flows precisely through this affirming response after blessing or prayer. To say 'Amen ken yehi ratzon' is to draw down the divine healing embedded in the verse itself.",
                "intermediate": "**\"כִּי אֲנִי יְהוָה רֹפְאֶךָ\"** (שמות טו:כו) — ראשי תיבות: **אָמֵן כֵּן יְהִי רָצוֹן**. Refuah is drawn through the affirmation 'Amen ken yehi ratzon' — its rashei-teivos are encoded in the very name of the Healer. (See elsewhere — likely Likutey Halakhos and Likutey Moharan I, Torah 60 on amen.)",
                "scholarly": "[T2:42] רת\"ש \"כי אני ה' רפאך\" — אכי\"ר. עי' לק\"ה ברכת הלל; לק\"מ ח\"א ס' ס' בעניין אמן."
            }
        ]
    },
    43: {
        "title_en": "Chalishus HaLev Causes Pachadim",
        "title_he": "על ידי חלישות הלב נופלים פחדים עליו",
        "segs": [
            {
                "beginner": "Through weakness of the heart, fears descend upon a person. The mighty have no fear at all, because the seat of strength is the heart itself. One whose heart is firm runs into the thick of battle and overcomes through the courage of his heart. The opposite is the soft-hearted: as Devarim 20:8 warns of 'the man who fears and is soft of heart' — the very softness of heart breeds the fear.",
                "intermediate": "**חלישוּת הלב → פחדים.** Ha-gibor has no pachad at all — ikar ha-gevurah ba-lev. One whose lev is chazak runs into kishrei ha-milchamah ve-misgaber by ometz libo. Conversely, **רכי לבב מתפחדים** — \"הירא ורך הלבב\" (דברים כ:ח); רש\"י: 'הירא' — by means of rach levav, through this he fears.",
                "scholarly": "[T2:43] חלישות הלב גורם פחדים. \"הירא ורך הלבב\" (דב' כ:ח), רש\"י שם. עיקר הגבורה בלב — עי' לק\"מ ח\"א רמ\"ט; לעיל ח\"ב ל\"ח."
            }
        ]
    },
    44: {
        "title_en": "Emunah Depends on the Mouth — Reject Chakirah, Serve in Temimus",
        "title_he": "האמונה תולה בפה של אדם",
        "segs": [
            {
                "beginner": "Emunah depends on the mouth: 'I will make Your faithfulness known with my mouth' (Psalms 89:2). Speaking words of faith is itself faith and brings one to deeper faith. So one must guard against repeating words of heresy — even mockingly, in another's name — because the very utterance damages emunah and is also forbidden as mocking the Creator. Books of philosophical investigation, even those by great Jews, must be avoided: our faith from our holy ancestors is sufficient. The greatest service is to be tam ve-yashar, simple and upright, with no clever wisdoms at all. Even the 'cleverness' people apply within avodas Hashem itself — over-meticulous self-examination of whether each mitzvah was performed perfectly — is mostly delusion. Flesh-and-blood cannot fulfill its duty perfectly; the Holy One does not come with complaints; the Torah was not given to ministering angels. The over-stringent live in melancholy and have no chiyus from any mitzvah; 'and you shall live by them' — not die by them.",
                "intermediate": "**Emunah teluyah be-pe** — \"אוֹדִיעַ אֱמוּנָתְךָ בְּפִי\" (תה' פט:ב). Speaking emunah be-pe **is itself emunah** and brings one to emunah. Therefore one must zaher me'od from divrei kefirah ve-epikorsus, even when not from one's own lev — even quoting epikorsim mockingly — for these dibburim mazikim le-emunah, ve-gam asur gamur (no leitzanus regarding Hashem yisborach). **רחק לגמרי** from sifrei chakirah u-philosophia, va-afilu mi-sifrei chakirah of gedolim me-acheinu Bnei Yisrael — gam meihem yes le-rachek — ki dayyeinu be-emunaseinu she-kibalnu mi-avoseinu ha-kedoshim. **Klal gadol**: להיות תם וישר — la-avod oso yisborach be-temimus, beli shum chochmos ve-chakiros klal klal lo. Gam mi-chochmos she-be-avodas Hashem atzmah tzarich le-rachek me'od — for the chochmos of olam-ha-zeh applied by mas-chilim are dimyonos u-shtutim u-bilbulim gedolim, mapilin et ha-adam mei-avodas Hashem (over-checking 'tzeisi yedei chovasi'). Basar va-dam ee-efshar she-yetzei yedei chovaso bi-shleimus, **\"אין הקב\"ה בא בטרוניא\"** (ע\"ז ג.), **\"ולא ניתנה תורה למלאכי השרת\"** (קידושין נד.). Al ha-medakdekim be-chumros yeseros: **\"וחי בהם\"** (ויקרא יח:ה) — **ולא שימות בהם** (יומא פה:); ein lahem shum chiyus, ve-tamid be-marah-shechorah — ve-hu atzmo eino machmir shum chumra klal.",
                "scholarly": "[T2:44a] אמונה תלויה בפה — \"אודיע אמונתך בפי\" (תה' פט:ב). אזהרה מספרי חקירה ופילוסופיא, אף של גדולי ישראל. תמימות; הרחקת חכמות. \"אין הקב\"ה בא בטרוניא\" (ע\"ז ג.); \"לא ניתנה תורה למלאכי השרת\" (קידושין נד.). \"וחי בהם — ולא שימות בהם\" (יומא פה:; ויקרא יח:ה). עיקרי הספר \"שבחי הר\"ן\" אות י-יב; שיש\"ק על תמימות."
            },
            {
                "beginner": "Even one who genuinely knows true wisdoms must, after all his learning, throw all the wisdoms aside and serve Hashem with complete simplicity. This is the greatest wisdom of all: to not be wise at all. There truly is no wise person before Him; 'no wisdom and no understanding stand before Hashem' (Proverbs 21:30; Sanhedrin 106; Zohar Tetzaveh 281). The essence: rachmana liba ba'ei — the Merciful One desires the heart.",
                "intermediate": "Even after all the chochmos — afilu mi she-yodea chochmos be-emes — tzarich le-hashlich kol ha-chochmos ve-laavod et Hashem be-temimus, bi-fshitus gamur, beli shum chochmos. **Zohi ha-chochmah ha-gedolah she-be-chol ha-chochmos: לבלי להיות חכם כלל.** Ki be-emes ein chacham ba-olam klal: **\"אֵין חָכְמָה וְאֵין תְּבוּנָה לְנֶגֶד ה'\"** (משלי כא:ל; סנהדרין קו.; זוה\"ק תצוה רפא:). Ve-ha-ikar ki **\"רחמנא ליבא בעי\"** (זוה\"ק שם).",
                "scholarly": "[T2:44b] להשליך כל החכמות. \"אין חכמה ואין תבונה לנגד ה'\" (משלי כא:ל; סנה' קו.; זוה\"ק תצוה רפא:). \"רחמנא ליבא בעי\" (זוה\"ק שם)."
            }
        ]
    },
    45: {
        "title_en": "Menios in Traveling to the Tzaddik — Circles Around the Inner Point",
        "title_he": "בענין מניעות לנסע לצדיק האמת",
        "segs": [
            {
                "beginner": "When people prepare again and again to travel to the true tzaddik but obstacles keep blocking them, know this: Shabbos is the inner point from which all six weekdays — the surrounding circles — draw their sustenance (Zohar Vayakhel 204). The husks of evil drag the wicked round and round those circles, as 'the wicked walk around' (Psalms 12:9), never letting them step inward to the inner point. As long as one is still somewhere in the circles — even pushei Yisrael — there is still hope to draw closer. Only one who has totally exited the circles, like apostates, can no longer approach. The tzaddik is the inner point, the Shabbos from which everything draws life.",
                "intermediate": "Anashim she-rotzim ve-mechinim atzman kamah pe'amim li-nso'a la-tzaddik ha-emes ve-acharei-chen yesh lahem **menios** — da: **שבת = נקודה הפנימית**, u-mimena yonkim kol shesh ha-yamim, **בחינת העיגולים סביב הנקודה** (זוה\"ק ויקהל רד.). Ha-klipos molichos et ha-resha'im saviv la-nekuda — \"סָבִיב רְשָׁעִים יִתְהַלָּכוּן\" (תה' יב:ט) — ve-einan manichos lahem le-hiskarev pnima el ha-nekuda ha-pnimis. Kol zman she-hem be-soch ha-igulim, **adayin yesh lahem tikvah** — afilu poshei Yisrael, kol zman she-lo yatza min ha-igulim le-gamrei. Aval mi she-yatza le-gamrei me-ha-igulim (ki-gon meshumadim) — ee-efshar lo le-hiskarev klal. **Ve-ha-tzaddik = bechinas Shabbos = nekudah pnimis** she-mimenu yonkim ha-kol.",
                "scholarly": "[T2:45] שבת = נקודה פנימית; ימי החול = עיגולים. \"סביב רשעים יתהלכון\" (תה' יב:ט). זוה\"ק ויקהל רד.. הצדיק = נקודה פנימית; פושעי ישראל בעיגולים, משומדים מחוץ לעיגולים."
            }
        ]
    },
    46: {
        "title_en": "Mesiras Nefesh Daily; Menios as Illusion-Walls; Kashya = Shma Hashem Koli Ekra",
        "title_he": "מסירת נפש יש לכל אחד ואחד מישראל בכל יום ובכל שעה",
        "segs": [
            {
                "beginner": "Every Jew gives over his soul every day, every hour. Tzedakah is a mesiras nefesh: money is the soul (Devarim 24:15 — 'to it he lifts his soul'), since one risks his life with toil and danger to earn it, and then hands it over for Hashem. Tefillah, too, is mesiras nefesh, in the sense of 'for Your sake we are killed all the day' (Psalms 44:23) — because of the great battle with intrusive thoughts and confusions one must struggle through to flee them. So with anything similar.",
                "intermediate": "**Mesiras nefesh kol yom ve-kol sha'ah** la-kol echad mi-Yisrael. Tzedakah — ha-mamon hu ha-nefesh, **\"כִּי אֵלָיו הוּא נֹשֵׂא אֶת נַפְשׁוֹ\"** (דב' כד:טו): moser nafsho bi-yegi'os u-sakanos kodem she-marvi'ach et ha-mamon, ve-achar-kach nasno bi-shvil Hashem yisborach. Ve-chen ba-tefillah — ka-de-isa be-Midrash Ne'elam (Chayei Sarah קכד:): **\"כִּי עָלֶיךָ הֹרַגְנוּ כָל הַיּוֹם\"** (תה' מד:כג) — yegi'ah u-milchamah gedolah im ha-machshavos ve-ha-bilbulim, le-nuss ve-livro'ach mehem. Nimtza moser nafsho — ve-chen ka-yotzei be-zeh.",
                "scholarly": "[T2:46a] מס\"נ יומיומית: צדקה — \"כי אליו הוא נושא את נפשו\" (דב' כד:טו). תפילה כמס\"נ — \"כי עליך הורגנו כל היום\" (תה' מד:כג); מד\"ה חיי שרה קכד:."
            },
            {
                "beginner": "Every person believes his obstacles are bigger than anyone else's — but Hashem only sends each person obstacles within his strength. In truth there is no real obstacle, because Hashem Himself is clothed inside the obstacle (Likutey Moharan I:115). The greatest obstacle is the obstacle of the mind — when the mind and heart are split off from Hashem or from the tzaddik. Even after one breaks the outer obstacles to travel to the true tzaddik, if his heart is twisted and full of difficulties about the tzaddik, this hidden objection blocks him more than anything else. The same in tefillah: one breaks through the outer menios to come and pray, but if his heart is crooked toward Hashem, this is the worst obstacle of all. 'My heart spins' (Psalms 38:11; Targum: saviv sechor sechor) — the heart is wrapped, twisted, and circled with crookedness, denials, and difficulties about Hashem. This is 'they embittered their lives with hard labor' (Exodus 1:14), and the Tikkunim (Tikkun 13, 28) say: 'with kashya' — the difficulties of the heart, the greatest obstacle of all. The remedy: cry out to one's Father in Heaven from the depths of the heart with a strong voice; Hashem hears and responds, and from this very crying-out the difficulties may collapse entirely. Even if not, His hearing is itself the salvation. The very letters of קֻשְׁיָא spell the acronym of 'שְׁמַע ה' קוֹלִי אֶקְרָא' (Psalms 27:7) — call to Hashem when the kushya overcomes you. The Baal Shem Tov's parable: a king hid a great treasure and surrounded it with illusory walls. People who came thought the walls were real and turned back, or broke one wall and stopped at the next. Only the king's son said: 'I know all the walls are illusions — there is really no wall here at all,' and walked safely through them all.",
                "intermediate": "Da, **she-ha-menios** she-yesh la-kol echad ba-avodas ha-Borei (li-nso'a la-tzaddik ha-emes etc.), af she-nidme she-ha-menios shelo gedolim mi-shel chavero — la-kol echad ein menios ela kefi kocho, kefi mah she-yachol lasse'es im yirtze. Be-emes **ein shum meni'ah** — ki gam ba-meni'ah atzmah ha-Shem yisborach mulbash sham, ka-mevu'ar (לק\"מ ח\"א סי' קטו). Ve-**ha-meni'ah ha-gedolah she-be-chol ha-menios = meni'as ha-mo'ach** — moach ve-lev she-chalukim me-Hashem o me-ha-tzaddik. Afilu k'she-shover ha-menios li-nso'a u-va le-sham, k'she-mocho chaluk ve-yesh lo **kashyos** ve-**akmumiyus ba-lev** al ha-tzaddik — zos ha-meni'ah mone'a yoter mi-kol. Ve-chen ba-tefillah — k'she-libo akum u-fshaltel min Hashem yisborach, zos ha-meni'ah gedolah mi-kulam. **\"לִבִּי סְחַרְחַר\"** (תה' לח:יא); תרגום: 'סָבִיב' — 'סְחוֹר סְחוֹר' — libo mesovav u-mukaf u-me-ukam be-akmumiyus ve-kashyos ve-kefirah al Hashem yisborach. **\"וַיְמָרְרוּ אֶת חַיֵּיהֶם בַּעֲבֹדָה קָשָׁה\"** (שמ' א:יד); ובתיקונים (ת\"יג כח.): 'ב**קשיא**' וכו' — kushyos she-ba-lev. **Ha-takanah:** litzok le-Aviv she-ba-shamayim be-kol chazak me-imkei ha-lev — ve-az Hashem shomea kolo u-foneh le-tza'akaso, ve-yachol li-hyot she-mi-zeh atzmo yipol ve-yisbatel le-gamrei kol ha-kashyos ve-ha-menios. **קֻשְׁיָא = רת\"ש \"שְׁמַע ה' קוֹלִי אֶקְרָא\"** (תה' כז:ז). U-mashal ha-Besh\"t (zatza\"l): ha-melech sam otzar be-makom echad u-sevev be-achizas einayim chomos saviv; benei adam she-ba'u dimu she-hen chomos mamash, kashe le-shavran — katzasam chazru, katzasam shavru chomah achas ve-lo yachlu li-shvor ha-shniya, ad **she-ba ben-ha-melech** ve-amar: **\"אני יודע, שכל החומות הם רק באחיזת עינים, ובאמת אין שום חומה כלל\"** — ve-halach la-betach ad she-avar al kulam.",
                "scholarly": "[T2:46b] עיקר המניעה — מניעת המוח/לב; קשיות ועקמומיות. \"לבי סחרחר\" (תה' לח:יא); ת\"י סחור סחור. תיקונים ת\"יג כח.: 'בקשיא'. \"וימררו את חייהם בעבודה קשה\" (שמ' א:יד). **קֻשְׁיָא = רת\"ש שמע ה' קולי אקרא** (תה' כז:ז). מ\"מ של הבעש\"ט: חומות באחיזת עינים — בן המלך רק עובר; לק\"מ ח\"א ס' קטו (השם מתלבש במניעה)."
            },
            {
                "beginner": "From this, the wise reader understands the lesson on his own about every obstacle, persuasion, and temptation: they are walls hiding the treasure of fear of Heaven, walls that are actually nothing. The main thing is a strong, courageous heart — and then there is no obstacle at all. Especially physical obstacles — money, wife, children, in-laws, parents — they all dissolve before one whose heart is firm and brave for Hashem. Even the might of the mighty in battle is only the strength and courage of the heart, the heart strong enough to run into the bonds of war.",
                "intermediate": "U-mi-zeh **yavin ha-maskil ha-nimshal me-elav** al kol ha-menios ve-hasatos u-fituyim — bechinas chomos al otzar shel yir'as shamayim, **she-be-emes einan klum**. Ve-ha-ikar — **lev chazak ve-amitz** — ve-az ein lo shum meni'ah. U-vifrat ha-menios be-gashmiyus (mamon, eshto u-vanav, choseno, av ve-eim, etc.) — kulan beteilim u-mevuteilim le-mi she-libo chazak ve-amitz le-Hashem yisborach. Ve-gam **gevuras ha-giborim** rak me-chozek ve-ometz ha-lev — lev chazak be-yoser laruts be-kishrei ha-milchamah (לק\"מ ח\"א רמ\"ט; ולעיל ח\"ב מ\"ג).",
                "scholarly": "[T2:46c] מניעות = חומות אחיזת עינים. עיקר: לב חזק ואמיץ. גבורת הגיבורים מחוזק הלב; לק\"מ ח\"א רמ\"ט; לעיל ח\"ב מ\"ג."
            }
        ]
    },
    47: {
        "title_en": "Sakanah to Say Torah; Klipah Dakah and Yisro",
        "title_he": "סכנה גדולה לומר תורה",
        "segs": [
            {
                "beginner": "Saying Torah is a great danger and demands extraordinary skill: the speaker must weigh his words on a scale so that each listener hears only what he needs and no more. Even though everyone hears the whole shiur, each one truly absorbs only his portion. This is the secret of 'And Yisro heard' (Exodus 18:1) — didn't the whole world hear? Yet only Yisro's hearing counts as real hearing (Zohar Yisro 68); the world's hearing isn't really hearing. One who cannot speak Torah at this level is forbidden to teach. For every person coming to hear Torah brings his evil with him — the husks born of his sins — and they jostle and pressure the gathering ('this dochaka at the bride's gathering is from them' — Berachos 6). These husks want to nurse from Torah, and their nourishment comes only from the 'extras' — what a listener absorbs above his understanding. This is the secret of 'razei Torah given to the chitzonim': what is above the listener's ken becomes their food. So the wise speaker must aim his words so no listener hears beyond his own portion. There is also a fine, subtle husk close to holiness that can nurse even from the body of the Torah itself, even without 'extras.' Its remedy: speak about Israel's salvation — that fine husk flees. This is why 'Yisro came and went before the giving of the Torah' (Zevachim 116): Yisro is that fine husk, which flees when it hears the salvations of Israel. The true tzaddik fears more when saying Torah than on Rosh Hashanah and Yom Kippur.",
                "intermediate": "**Sakanah gedolah lomar Torah** — tzarich yegi'ah u-omanus yeseirah lishkol be-feles devarav, **she-lo yishma kol echad mi-ha-shomim ki im mah she-tzarich lo, lo yoser**. Af she-ha-kol shomim et kol ha-Torah, kol echad shomea rak mah she-tzarich. **\"וַיִּשְׁמַע יִתְרוֹ\"** (שמ' יח:א): 've-halo kol ha-olam shamu, ela Yisro shama' (זוה\"ק יתרו סח.) — rak shemiyas Yisro nechshav le-shemi'ah. Ve-mi she-eino yachol lomar Torah be-bechinah zo, **asur lo lomar Torah**. Ki kol echad ba-im ha-ra shelo — **klipos** she-nivra'os al-yedei aveiros — ve-hen dochakos et ha-olam u-vilbul be-sha'as amiras ha-Torah: \"**הַאי דַּחֲקָא דְּכַלָּה מִנַּיְהוּ**\" (ברכות ו.). Ha-klipos rotzim li-nok min ha-Torah, ve-yenikasan rak min **ha-mosaros** — mah she-shomea yoter ve-le-ma'lah me-mocho — bechinas razei Torah she-nimser la-chitzonim. Tzarich ha-chacham le-omanus zos. **Yesh klipah dakah** ha-semucha la-kedushah she-yecholah li-nok afilu mi-guf ha-Torah atzmah, afilu lelo mosaros — ve-takanasah: **k'she-medabrim mi-yeshu'as Yisrael**, az ha-klipah ha-dakah borachas. Ve-zehu **\"Yisro ba ve-halach lo kodem matan Torah\"** (זבחים קטז:) — Yisro = klipah dakah she-borachas k'she-shoma'as yeshu'os Yisrael. Ve-ha-tzaddik ha-emes yesh lo **eimah gedolah b'sha'as amiras ha-Torah** — yoser me-eimas Rosh-ha-Shanah ve-Yom-ha-Kippurim.",
                "scholarly": "[T2:47] סכנה לומר תורה — שיקול בפלס. \"וישמע יתרו\" (שמ' יח:א); זוה\"ק יתרו סח.. \"דחקא דכלה מנייהו\" (ברכ' ו.). מותרות = רזי תורה לחיצונים. **קליפה דקה** סמוכה לקדושה — תיקון: יָשועות ישראל; יתרו (זבח' קטז:). אימת אמירת תורה > אימת רה\"ש ויוה\"כ."
            }
        ]
    },
    48: {
        "title_en": "Hisrachkus Is Entirely Hiskarvus; Persistence; 'Hundred Years' Tree; Azamre",
        "title_he": "כשאדם נכנס בעבודת השם",
        "segs": [
            {
                "beginner": "When a person enters the service of Hashem, the way is that they show him distance: it seems Heaven is pushing him away, refusing to let him enter avodas Hashem. But in truth, all this distance is entirely closeness. Tremendous strengthening is needed not to fall in one's mind when one sees that years pass with great toil and one is still far, still full of coarseness, physicality, and distracting thoughts, and whatever one tries to do for Hashem he is blocked from. It begins to feel as though Hashem doesn't notice him at all, since he keeps crying out and prostrating and is still very far. Yet against all this — strengthen yourself greatly, do not look at any of this. All the distance is really closeness. All the true tzaddikim passed through this exact place; they said explicitly that it seemed to them that Hashem did not look at them at all because they prayed and toiled long and were still very far. Had they not strengthened themselves to ignore this feeling, they would have remained in their first place and never reached what they reached. The principle, beloved brother: be very strong; cling with all your strength to remain in your service; do not worry, do not look at anything written above. Even if you are very far and feel you sin against Him every hour — know that for someone so coarse, every single tiny movement of detaching even slightly from physicality and turning to Hashem is enormous and precious. Even one small point of separation from physicality runs you thousands of parsa'os in the upper worlds (the story of the tzaddik who was overcome by atzvus in Sippurei Ma'asios). Therefore rejoice greatly and constantly strengthen yourself in simchah — atzvus is extremely damaging. The moment a person wants to enter avodas Hashem, atzvus is itself a great sin: 'atzvus is sitra achara' (Zohar Noach 71) — Hashem hates it. Be extremely stubborn in avodas Hashem — do not abandon your place, the little of your service you have begun, no matter what passes over you. Remember this well; you will need it greatly.",
                "intermediate": "**K'she-ha-adam nichnas ba-avodas Hashem, az ha-derech she-mar'in lo hisrachkus** — nidme she-merachakim oso me-le-ma'lah, ve-ein manichin oso klal lichanes la-avodas Hashem. **Be-emes kol ha-hisrachkus hu rak kulo hiskarvus.** Tzarich hischazkus gadol me'od me'od **lo lipol be-da'ato**, k'she-ro'eh she-yamim ve-shanim ovrim, ve-hu mityage'a be-yegi'os gedolos ba-avodas Hashem va-adayin rachok me'od ve-lo hischil klal lichanes le-sha'arei kedushah — ki ro'eh atzmo male **aviyus ve-gashmiyus ve-hirhurim u-vilbulim gedolim**, ve-mah she-rotzeh la'asos ein manichin. Nidme lo ke-ilu ein Hashem mistakel alav klal ve-ein rotzeh ba-avodaso — she-tzo'ek be-chol pa'am u-misnapel lefanav yisborach va-adayin rachok me'od. Ke-neged kol zeh tzarich hischazkus gadol — **ve-lo lehistakel al kol zeh klal**: ki kol ha-hisrachkus rak hiskarvus. **Kol ha-na\"l avar al kol ha-tzaddikim** — shamanu mi-pihem be-feirush. **Ve-ha-klal, ahuvi achi: chazak ve-ematz me'od, ve-echoz atzmecha be-chol ha-kochos li-she'er kayam ba-avodascha.** Ve-im atah rachok me'od ve-nidme lecha she-pogem be-chol sha'ah mamash — afilu nekudah ketanah me'od she-hu ne'esak mi-gashmiyuso elav yisborach **rats ba-zeh kamah alfei farsa'os ba-olamos elyonim** (mu-vah etzlenu be-sippur ha-tzaddik she-hisgaber alav ha-atzvus). **Ve-yismach me'od u-yechazek atzmo be-simchah tamid** — ki **atzvus mazik me'od me'od** ve-tekhef k'she-yesh lo atzvus hi **aveirah gedolah**: **\"עצבות היא סטרא אחרא\"** (זוה\"ק נח עא:) ve-Hashem yisborach soneh osah.",
                "scholarly": "[T2:48a] התרחקות = התקרבות. הדרך לכל הצדיקים — מפיהם ממש. כל תנועה קטנה רצה אלפי פרסאות בעולמות עליונים (סיפור הצדיק שנפל בעצבות; סיפ\"מ). \"עצבות היא סטרא אחרא\" (זוה\"ק נח עא:). חיוב שמחה תמיד."
            },
            {
                "beginner": "Great stubbornness is required to stand in one's place even if Heaven causes one to fall again and again. Sometimes a person is made to fall from avodas Hashem; even then, he must do what he can, never abandon himself to fall completely. All the falls, descents, and confusions are necessary to pass through before entering the gates of holiness — even the true tzaddikim passed through them. Some are already at the very opening of holiness and turn back because of these confusions; others, when they come close to the entrance, are attacked by the sitra achara and the baal davar with overwhelming, terrible force, blocking them from entering, and they retreat. This is the way of the baal davar: when he sees a person nearly at the gates, he spreads over him with maximum strength. A true tzaddik said that had anyone, anyone at all, told him at the start of his service, 'My brother, be strong, hold yourself' — he would have run and hastened greatly in avodas Hashem; for all the same things passed over him, and no one offered him any chizuk. So whoever wants to enter avodas Hashem must remember this well: strengthen yourself greatly, do what you can, and over many days and years you will surely enter the gates of holiness — Hashem is full of mercy and wants your service greatly. Know also that every detachment, every small turning from physicality to His service, gathers and binds together and comes to your aid in the time of need, when there is — God forbid — pressure and distress. And know: a person must cross over a very, very narrow bridge — and the principle and essence is not to be afraid at all.",
                "intermediate": "**Tzarich akshanus gadol me'od me'od li-hyot chazak ve-amitz lichoz et atzmo la'amod al omdo, af im mapilin oso be-chol pa'am.** Lif'amim mapilin echad mei-avodas Hashem — af-al-pi-chen alav la'asos sheloh, mah she-yuchal, ve-al yaniach atzmo lipol le-gamrei. **Kol ha-nefilos ve-ha-yeridos ve-ha-bilbulim tzrichim be-hechrach la'avor — ve-gam ha-tzaddikim ha-amitiyim avru ba-zeh.** Yesh echad she-kvar etzel ha-petach shel kedushah ve-chozer le-achorav me-chamas ha-bilbulim, **o she-az k'she-hu samuch eitzel ha-petach az misgaber alav ha-sitra achara ve-ha-baal davar me'od me'od** be-hisgabrus gadol ve-nora me'od (rachmana litzlan). Ka-asher hu derech ha-baal davar: k'she-ro'eh she-ha-adam samuch mamash le-sha'arei kedushah u-chim'at she-yikanes — az hu mispatesh alav be-hisgabrus gadol me'od me'od. **Ve-shamanu mi-tzaddik amiti** she-amar: **ilu hayah omer lo echad, ye-hi mi she-ye-hi, be-eis she-asak ba-avodas Hashem bi-tchilaso: \"אחי חזק ואחז עצמך\" — hayisi rats u-mizdarez me'od ba-avodaso yisborach** — ki gam alav avar kol ha-na\"l ve-lo shama shum hischazkus mi-shum adam. Lachen mi she-rotzeh le-hikanes ba-avodas Hashem **yizkor zos heitev**, **ve-chazek atzmecha me'od, ve-aseh mah she-tuchal**. **Ve-ha-tnu'os ve-ha-he'tekos** she-atah ne'esak be-chol pa'am eizeh me'at mi-gashmiyus la-avodaso — kulam **miskabtzim u-mischabrim u-miskashrim u-va'im le-ezraskha be-eis ha-tzorech**. **\"וְדַע, שֶׁהָאָדָם צָרִיךְ לַעֲבֹר עַל גֶּשֶׁר צַר מְאֹד מְאֹד, וְהַכְּלָל וְהָעִקָּר — שֶׁלֹּא יִתְפַּחֵד כְּלָל\"**.",
                "scholarly": "[T2:48b] עקשנות בעבודת השם, לעמוד על עמדו אף בנפילות. אמרת הצדיק: 'אחי חזק'. **\"גשר צר מאד — והעיקר שלא יתפחד כלל\"** (אמרה ידועה ביותר בחסידות ברסלב). תנועות מצטרפות — בעת צרה."
            },
            {
                "beginner": "Know that there is a tree which grows leaves, and each leaf must grow for a hundred years; it is found in the orchards of the nobles, and they call it in their language 'a hundred years.' Surely, when it grows for a hundred years, much certainly passes over it; and afterward, at the end of the hundred years, it shoots out with a great sound like a cannon ('aramatya'). Understand the lesson well.",
                "intermediate": "Yesh ilan she-gedeilim alav alim, **she-kol aleh tzarich li-hyos gadel me'ah shanah** — ve-hu nimtza be-pardesim shel ha-sarim, ve-korin oso bi-leshonam '**מאה שנים**' (mei'ah shanim). U-mistama k'she-gadel me'ah shanah be-vadai over alav mah she-over, ve-achar-kach be-sof ha-me'ah shanim **hu yoreh be-kol gadol ke-mo kanei sereifah** she-korin oso '**אורמאטיע**' (cannon). **Ve-haven ha-nimshal heitev.**",
                "scholarly": "[T2:48c] מ\"מ אילן 'מאה שנים' — אחר עיכוב ארוך מתפרץ ככלי שריפה (אורמאטיע). הבן הנמשל לעבודה ארוכה ולנפילות."
            },
            {
                "beginner": "It is fitting to walk with the teaching Azamre l'Elokai b'odi (Likutey Moharan I:282): seek and search to find some merit in yourself, some good point. With this little bit of good, rejoice and strengthen yourself, and do not abandon your place, even if you fell to whatever you fell. Strengthen yourself with the tiny bit of good still found in you until you merit, through this, to return to Hashem — and all the intentional sins are turned into merits (Yoma 86b). And what did the Baal Shem Tov do at sea, when the baal davar tempted him? From this, understand how far you must strengthen yourself, never despairing, no matter what. The main thing is simchah always: gladden yourself with whatever you can — even through 'milei dishtuta,' making yourself foolish and engaging in matters of foolishness, jest, jumps, and dances — to come to simchah, which is a very great matter.",
                "intermediate": "Ve-ra'ui leleich im mah she-ne'emar **be-ma'amar 'אזמרה לאלקי בעודי'** (לק\"מ ח\"א רפ\"ב): **levakesh u-lechapes limtzo be-atzmo eizeh zechus ve-eizeh nekudah tovah**. U-va-ze ha-me'at tov she-motze be-atzmo, **yismach ve-yechazek atzmo, ve-al yaniach mekomo**, af im nafal le-mah she-nafal — yechazek atzmo ba-me'at de-me'at tov she-motze be-atzmo adayin, ad asher yizkeh **lashuv al-yedei zeh la-Shem yisborach, ve-chol ha-zedonos yiheyu na'asos zechuyos** (יומא פו:). U-mah asah ha-Besh\"t (zatza\"l) **al ha-yam, k'she-hesiso ha-baal davar...** U-mi-zeh tavin ad heichan atah tzarich le-hischazek u-le-vilti le-yaesh atzmecha. **Ve-ha-ikar li-hyos be-simchah tamid** — ve-yismach atzmo be-chol mah she-yuchal, **va-afilu al-yedei מילי דשטותא**, la'asos atzmo ke-shoteh ve-la'asos inyenei shtus ve-tzchok o **kefitzos u-rikudim**, kedei lavo le-simchah, she-hu davar gadol me'od.",
                "scholarly": "[T2:48d] עצה: \"אזמרה\" (לק\"מ ח\"א רפ\"ב) — נקודה טובה. זדונות לזכויות (יומא פו:). מעשה הבעש\"ט בים. עיקר: שמחה תמיד; \"מילי דשטותא\"; קפיצות וריקודים."
            }
        ]
    },
    49: {
        "title_en": "Shev Ve-al Ta'aseh; Teshuvah Ha-Shleimah at the Same Place; Yetzer for Tefillah",
        "title_he": "לפי גדלות השם יתברך ועצם רוממותו",
        "segs": [
            {
                "beginner": "Given Hashem's greatness and the essence of His exaltedness, the slightest improper movement or glance would suffice for what 'should' come upon a person — chas ve-shalom, chas ve-shalom. But Hashem is full of mercy; the whole world is full of His rachmanus; He greatly desires the world. So strengthen yourself in His service with whatever you can — even if you are as you are — and rely on His unlimited mercies; He certainly will not abandon you, even after what passed. The past is past; the principle is from now on do not do it anymore, and at least be 'shev",
                "intermediate": "Lefi gadlus Hashem yisborach ve-otzem romemuso, **bi-tnu'ah kalah** ba-olam u-be-histaklus ba-olam she-eino kara'ui le-fi kevodo — hayah ra'ui lavo al ha-adam mah she-ra'ui (chas ve-shalom chas ve-shalom). **Aval Hashem yisborach male rachamim**, ve-chol ha-olam male rachmanus, ve-hu rotzeh me'od ba-olam. Lachen tzarich le-chazek atzmo me'od ba-avodaso be-chol mah she-yuchal — af im hu kemo she-hu — ve-yismoch al rachamav ha-merubin me'od beli shi'ur, ki be-vadai lo ya'azov oso af im avar mah she-avar. **Ha-avar ayin, ve-ha-ikar mi-kan u-le-haba lo ya'aseh od, ve-yiheyeh \"שֵׁב וְאַל תַּעֲשֶׂה\"** al kol panim — hen ba-machshavah ve-hen ba-ma'aseh.",
                "scholarly": "[T2:49a] לפי גדלות ה' — תנועה קלה. אך מלא רחמים. \"העבר אין\" — שב ואל תעשה. רחמיו בלי שיעור."
            },
            {
                "beginner": "ve-al ta'aseh' — sit and do not do — both in deed and in thought. For thought, in such people, is itself a deed, since in olam ha-asiyah there is also machshavah; one must be 'shev ve-al ta'aseh' in deed and in thought. And whatever happens to him automatically — do not be concerned, do not look at it at all. The main complete teshuvah is when a person actually passes through the same places where he was before his teshuvah, each according to what passed over him in his earlier days — and now, in the very same places and matters where he was at first, he turns his back on them and subdues his yetzer not to do anymore what he did. This is the essence of teshuvah ha-shleimah — only this is called teshuvah.",
                "intermediate": "**Ki gam ha-machshavah shel anashim ka-eilu hi gam-ken asiyah** — ki gam be-olam ha-asiyah yesh machshavah — ve-tzarich li-hyos shev ve-al ta'aseh **ba-ma'aseh u-va-machshavah**. U-mah she-na'aseh imo me-meila — al yachush ve-al yistakel al zeh klal. **Ve-da, she-ikar ha-teshuvah ha-shleimah** hi k'she-ha-adam **over be-eilu ha-mekomos mamash she-hayah mi-kodem ha-teshuvah** — kol echad le-fi mah she-avar alav ba-yamim ha-kodemim — ve-k'she-over be-eilu ha-mekomos ve-ha-inyanim she-hayah mi-techilah mamash, ve-achshav **poneh oref mehem** ve-**kofeh yitzro li-vilti la'asos od mah she-asah** — **zehu ikar ha-teshuvah ha-shleimah**, ve-rak zeh nikra teshuvah.",
                "scholarly": "[T2:49b] שב ואל תעשה במחשבה ובמעשה. עיקר תשובה שלמה — באותם המקומות ממש; לכפות יצרו שם דיקא."
            },
            {
                "beginner": "It is a great virtue when a person still has a yetzer ha-ra, for then he can serve Him precisely with the yetzer — by taking all its fervor and warmth and channeling it into avodas Hashem: praying and beseeching with the warmth and burning of the heart. If a person has no yetzer ha-ra, his service is not complete at all. The essence is to restrain and hold back the heat at the time of desire, and to release it during tefillah and avodah — there to lay his fervor and burning into the service. Even one who is not a kosher person sometimes finds himself praying with hislahavus, and this also comes from the warmth of his yetzer ha-ra — only he receives no reward for it. But for one who wants to conduct himself in kashrus, having a yetzer ha-ra still alive is a great advantage.",
                "intermediate": "**Ve-hu ma'alah gedolah k'she-yesh adayin yetzer ha-ra le-ha-adam**, ki az yachol la-avod oso yisborach **im ha-yetzer ha-ra dika** — likach kol ha-hislahavus ve-ha-chamimus u-le-hachniso be-soch avodas Hashem — le-hispalel u-le-hischanen be-chamimus ve-hislahavus ha-lev. Ve-im ein yetzer ha-ra le-ha-adam — **ein avodaso shleimah klal**. Ve-ha-ikar — la-atzor u-le-akev ha-chamimus be-eis ha-ta'avos, **u-le-hanicho be-eis ha-tefillah ve-ha-avodah** — sham yaniach chamimuso ve-hislahavuso le-soch ha-avodah. Va-afilu mi she-eino ish kasher, niznaf lo lif'amim **she-mispalel be-hislahavus** — ve-zeh ba gam-ken me-chamimus ha-yetzer ha-ra she-yesh lo, rak she-hu eino mekabel al zeh sachar. Aval mi she-rotzeh le-hisnaheg be-kashrus — hu ma'alah gedolah k'she-yesh lo adayin yetzer ha-ra.",
                "scholarly": "[T2:49c] מעלת היצר הרע — להפנות חמימותו לתפילה ועבודה. עי' לק\"מ ח\"א ה' (יבטל); לק\"מ ח\"א נ\"ב (לב כוון לב\"א)."
            }
        ]
    },
    50: {
        "title_en": "Machshavah Like Reins of a Horse; Yetzer Knocks Repeatedly",
        "title_he": "המחשבה ביד האדם להטותה כרצונו",
        "segs": [
            {
                "beginner": "Thought is in the hand of a person to direct it as he wills, to whatever place he wants. As explained elsewhere, two thoughts cannot be present together at all. Even when sometimes his machshavah goes flying and wandering to other and foreign matters, it is in his hand to bring it back and force it back, against its will, onto the straight path — to think what is fitting. It is exactly like a horse that veers off the road to another path: one grabs it by the reins and pulls it back, against its will, onto the straight road. So too with thought: one can grab it forcibly and return it to the proper way.",
                "intermediate": "**Ha-machshavah be-yad ha-adam le-hatosah ki-rtzono** la-makom she-hu rotzeh, ke-mevu'ar be-makom acher: **ee-efshar she-yiheyu shtei machshavos be-yachad klal**. Va-afilu im lif'amim holechet machshavto u-forachas u-meshotetes bi-devarim acherim ve-zarim — be-yad ha-adam **lachzor u-le-hatosah be-al-korchah** el ha-derech ha-yashar lachshov mah she-ra'ui. **Ve-hu mamash kemo sus** she-poneh min ha-derech ve-sar le-derech acher, **she-tofsin oso be-afsar** ve-cha-yotzei u-machzirin oso be-al-korcho el ha-derech ha-yashar — kemo chen ba-machshavah mamash, she-yecholin lit-fos be-al-korchah le-hashivah el ha-derech ha-ra'ui.",
                "scholarly": "[T2:50a] שתי מחשבות אינן יחד. משל הסוס באפסר. עי' לק\"מ ח\"א רל\"ג; לק\"מ ח\"א ק\"ח."
            },
            {
                "beginner": "The yetzer ha-ra knocks at a person each time and pushes him to whatever it pushes him to. Even if a person doesn't listen and turns his back, the yetzer keeps knocking — a second time, third, fourth, and more. But if a person stays firm in his daas, stubborn against the yetzer, paying him no attention at all, then the yetzer departs and goes off. So too with tefillah: foreign thoughts come to confuse him over and over, time after time. He must stay strong, not look at the thought at all, in any way — and then it departs. (See more on this elsewhere.)",
                "intermediate": "**Ha-yetzer ha-ra noked ba-adam be-chol pa'am** u-me-orro le-mah she-me-orro. Ve-af im ein ha-adam shomea lo u-foneh oref mimenu — af-al-pi-chen **hu noked bo od pa'am sheini u-shlishi u-revi'i ve-yoter**. Aval **im ha-adam chazak be-da'ato ve-akshan ke-neged ha-yetzer ha-ra**, ve-eino poneh elav klal — az ha-yetzer ha-ra **mistalek ve-holeich lo**. Ve-chen ba-tefillah be-inyan ha-machshavos ha-ba'os le-bilbel — hu mamash ka-na\"l: ha-machshavah ba'ah kamah pe'amim, **pa'am achar pa'am**, le-bilbel — ve-tzarich li-hyos chazak **livilti le-histakel aleha klal be-shum ofen** — ve-az tistalek. (Ayyen be-makom acher mi-zeh.)",
                "scholarly": "[T2:50b] היצר הרע נוקש שוב ושוב — חזק ועקשן עד שמסתלק. כן במחשבות זרות בתפילה. עי' מקום אחר."
            }
        ]
    }
}

count_segs = 0
for n, info in torahs.items():
    src_path = os.path.join(src_dir, f"torah-{n}.json")
    with open(src_path, 'r', encoding='utf-8') as f:
        src = json.load(f)
    src_count = len(src['segments'])
    my_count = len(info['segs'])
    assert src_count == my_count, f"T{n}: src has {src_count} segs, PNC has {my_count}"
    segs_out = []
    for s in info['segs']:
        segs_out.append({
            "beginner": {"en": s["beginner"], "he": ""},
            "intermediate": {"en": s["intermediate"], "he": ""},
            "scholarly": {"en": "", "he": s["scholarly"]}
        })
    data = {
        "id": f"pnc-2-{n}",
        "book": "pettek-nanach-commentary",
        "part": 2,
        "torah": n,
        "title": f"T{n} (Tinyana) PNC - {info['title_en']}",
        "hebrewTitle": info['title_he'],
        "author": "Pettek Nanach",
        "segments": segs_out
    }
    out_path = os.path.join(pnc_dir, f"tinyana-{n}.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(out_path, 'r', encoding='utf-8') as f:
        rt = json.load(f)
    assert rt['id'] == data['id']
    assert len(rt['segments']) == src_count
    count_segs += my_count
    print(f"T{n}: OK ({my_count} segs)".encode('ascii', 'replace').decode())

# Register in lm-commentaries.json
with open(commentaries_path, 'r', encoding='utf-8') as f:
    cdata = json.load(f)

if '2' not in cdata:
    cdata['2'] = {}

for n, info in torahs.items():
    sn = str(n)
    if sn not in cdata['2']:
        cdata['2'][sn] = {}
    cdata['2'][sn]['running_commentary'] = {
        "book": "pettek-nanach-commentary",
        "slug": "pettek-nanach-commentary",
        "status": "available",
        "url": f"/reader/pettek-nanach-commentary/tinyana-{n}.json",
        "layers": ["beginner", "intermediate", "scholarly"],
        "author": "Pettek Nanach",
        "label": f"Pettek Nanach Running Commentary - Tinyana T{n} ({info['title_en']})"
    }

with open(commentaries_path, 'w', encoding='utf-8') as f:
    json.dump(cdata, f, ensure_ascii=False, indent=2)

print(f"Total segs: {count_segs} across {len(torahs)} torahs".encode('ascii', 'replace').decode())
print("Registered in lm-commentaries.json".encode('ascii', 'replace').decode())
