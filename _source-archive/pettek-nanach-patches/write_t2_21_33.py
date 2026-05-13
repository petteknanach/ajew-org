# -*- coding: utf-8 -*-
"""PNC Tinyana T21-T33 — write per-segment 3-layer commentary and register."""
import os, json

HOME = os.path.expanduser('~')
AJ = os.path.join(HOME, '.openclaw', 'workspace', 'ajew-org')
PNC_NAME = "pettek-nanach-commentary"  # LITERAL — never glob+sort (likutay-nanach collides)
READER = os.path.join(AJ, 'public', 'reader')
PNC_DIR = os.path.join(READER, PNC_NAME)
LMC = os.path.join(AJ, 'src', 'data', 'lm-commentaries.json')

# (segments are written as one entry per source segment)
torahs = {
    21: {
        "title_en": "Innovating Torah — Guarding by Poskim Before and After",
        "title_he": "כשמחדשין חדושי תורה",
        "segs": [
            {
                "beginner": "When Rebbe Nachman renews a true insight in Torah, hostile spiritual forces (the 'known watchers') lie in wait to ambush it. The protection is to flank the new idea with the legal ranks (poskim) — to study the practical halachic deciders both before drawing the chiddush down and after it has emerged. Then the chiddush descends safely 'between two columns of valor,' guarded front and rear by Torah-law itself, so no foreign element can approach.",
                "intermediate": "Anshei chayil are the maaseh-ish guards that flank a fresh chiddush; lacking them, gevuros she-bi-klipah feed on it. Limud poskim before and after — pesak as armor — converts the chiddush from raw daas into halachah-clothed daas, the only form in which it can pass the gauntlet. Likutey Halachos Bachor 4 expands this: every renewed light must enter halachah to be 'born.' Cf. Tinyana T8:7 (Chanukah hidden in end-letters of pasuk) — pesak is similarly the 'sealing letter.'",
                "scholarly": "תהלים סא:ד; זוהר אחרי עג; ליקוטי הלכות פו\"ר ב; מאמר זה הרחבה של ליקוטי מוהר\"ן קמא רכ\"ה (\"החדושין\")."
            }
        ]
    },
    22: {
        "title_en": "True Humility Requires Daas — Flattery Disguised as Anavah",
        "title_he": "בענין ההכנעה",
        "segs": [
            {
                "beginner": "Most people misread humility. We labor in service and prayer to climb out of mochin de-katnus (small consciousness) into mochin de-gadlus (expansive consciousness). If 'humility' meant simply collapsing oneself, it would drag you straight back into katnus. So real anavah requires daas — judgment about when to bend and when to stand. Only Moshe achieved 'most humble of all men.' Humility without daas is what Chazal call chanufah (flattery): Yirmiyahu's 'Amen' to the false prophet Chananyah was that kind of bowing, and the Gemara says all flatterers fall into their son's hand.",
                "intermediate": "Hachna'ah ke-ra'uy demands daas because hishtaplus without daas is functionally chanufah toward whomever is in front of you. Moshe rabbeinu, anav mi-kol ha-adam (Bamidbar 12:3), held humility together with Sotah 41b's warning. Cf. Tinyana T14 (adversaries above mirror those below) — false-humility is the lower face of false-mefursamim. The PNC reading: chanufah masquerading as anavah is the most patient of nivla — it preserves the falseness it bows to. Practical: if your 'humility' is silencing rebuke that should be spoken, suspect chanufah.",
                "scholarly": "במדבר יב:ג; סוטה מא:; ירושלמי שביעית פ\"ט; ליקו\"מ קמא קלח (חניפות); ליקו\"ה הכשר כלים ד."
            }
        ]
    },
    23: {
        "title_en": "Joy that Pursues Atzvus and Drags it Inside",
        "title_he": "בענין השמחה",
        "segs": [
            {
                "beginner": "Picture dancers in a circle. Sometimes they grab a sad person standing outside and force him into the ring until he is dancing too. So in serving Hashem: there is a small joy that simply pushes sadness aside, and there is a higher joy that hunts the sadness down and drags it into the dance. The verse 'Sasson ve-simchah yasigu, ve-nasu yagon va-anachah' (Yeshayah 35:10) is read backwards: the joy chases sorrow, catches it, and forces it into the holiness it was fleeing. Pure sorrow runs from joy because, being from the other side, it does not want to become a vehicle for kedushah — so we must coerce it in.",
                "intermediate": "Yagon va-anachah is read here not as fugitive but as prey: simchah ha-yasigu — joy must overtake them. The mashal of pulling the depressed bystander into the rikud cashes out the dynamic of converting marah shechorah itself, not merely displacing it. Cf. Tinyana T24 ('mitzvah gedolah lihiyos be-simchah tamid'), Tinyana T10 (yishuv ha-daas via simchah). Practical: when atzvus surfaces during prayer, do not banish it — sing it. The transmutation is the avodah.",
                "scholarly": "ישעיה לה:י; זוהר חיי שרה קלב.; ליקו\"מ קמא רפב (\"מצוא בעצמך נקודה טובה\"); ליקו\"ה השכמת הבקר ד."
            }
        ]
    },
    24: {
        "title_en": "Joy Heals — The Ten Melodies and the Pulses",
        "title_he": "מצוה גדולה להיות בשמחה תמיד",
        "segs": [
            {
                "beginner": "Always be in joy — it is a great mitzvah. All sicknesses come from a defect in simchah. There are ten kinds of melody (the ten neginos referenced in Tehillim 92:4 'alei asor'), and these ten melodies enter the body through the ten pulses (depakim) and animate them. Damage one of the ten neginos and you damage one of the ten depakim — illness follows. Even the doctors agree all sickness traces back to marah shechorah and atzvus. In the time to come Hashem will be the rosh chulah — both 'head of the dance' and 'head of the sick' (since the Shechinah hovers over the sick person's head, Tehillim 41:4). Joy and dancing literally undo sickness.",
                "intermediate": "The asor and the i\"d depakim correspond: cholaim arrive when the i\"d minei neginah are pagum. Tikkun 69 (daf 105) is the locus. The pun chulah/choleh/machol unifies dance, sickness, and rectification — Hashem at the center of the dance is Hashem at the head of the bed. Cf. Tinyana T10 (yishuv ha-daas), T23 (joy chases yagon). Note: the marah shechorah we are warned of is hashpa'ah min ha-tzad (Saturn/black bile) — kedushah's reading is that Shabbos as Saturn-day must be claimed for joy.",
                "scholarly": "תהלים צב:ד-ה, מא:ד; ירושלמי סוכה פ\"ה; מד\"ר שמיני יא; נדרים מ.; תיקוני זוהר תיקון סט קה.; ליקו\"מ קמא נד."
            },
            {
                "beginner": "The principle: force yourself with all your strength to be joyful all day, every day. Human nature drifts toward depression because life is full of blows; everyone carries sufferings. So gladden yourself with whatever works, even with mili de-shtusa (foolish words) — clowning, silly stories. A broken heart is also very good but only at a fixed hour: assign one hour a day to break your heart and pour out your sichah before Hashem. The rest of the day must be simchah. Why? Because from a broken heart it is easy to slide into actual marah shechorah; from joy you are more likely to land in light foolishness than in despair. The fixed-hour boundary is what keeps the broken heart productive instead of corrosive.",
                "intermediate": "Lev nishbar shel sha'ah achas vs. simchah kol ha-yom — Rebbe Nachman's discipline of bracketing brokenness. Mili de-shtusa is licensed (against Pirkei Avos's general caution) because the alternative drift to marah shechorah is worse than the drift to holelus. Cf. Sichos HaRan 20, 41; Tinyana T48 (laughter and chochmah). The 'hour' is structurally the same as Hisbodidus's set time (next torah, T25) — both demand a temenos and refuse to bleed across the day.",
                "scholarly": "שיחות הר\"ן כ, מא; ליקו\"מ קמא רפב; ליקו\"ה השכמת הבקר ד; ספר המדות, שמחה."
            }
        ]
    },
    25: {
        "title_en": "Hisbodidus — The Supreme Avodah, Speaking in One's Mother Tongue",
        "title_he": "ההתבודדות הוא מעלה עליונה",
        "segs": [
            {
                "beginner": "Hisbodidus — being alone with Hashem in speech — is the highest practice. Set yourself at minimum one hour daily, alone in a room or out in a field, and pour out your conversation between yourself and your Maker: arguments, pleas, words of grace and conciliation, asking Him to draw you close to His service in truth. Speak in the language you actually speak — Yiddish here, in our country. Lashon hakodesh is hard to spill all your sichah in, and the heart is not drawn after words you don't live in. Yiddish (or whatever you speak) makes the heart break easily and the words come freely. Talk about everything — regret over the past, requests for the future, anything in your heart. Persist daily at a fixed hour; the rest of the day, simchah. This advice contains everything: whatever you lack in avodas Hashem, ask. Even if your words clog and you stand mute before Him — the readiness, the longing to speak with no words coming, is itself very good. Make a tefillah out of that very muteness: cry out about being too distant even to speak, and ask Him for mercy to open your mouth. Many great tzaddikim reached their level only through this. Fortunate is the one who grasps it.",
                "intermediate": "Lashon she-medabrim bo (mother tongue) over lashon ha-kodesh — radical for its time, the practical move that enabled mass adoption of hisbodidus. Sichah > tefillah keva: open-form, agonistic, forensic ('te'anos ve-amtala'os'). The mute hisbodidus is itself a mode — silence as preparation, then making tefillah from the silence. The daily kavua hour pairs with T24's bracketed lev nishbar; cf. Sichos HaRan 25, 95, 101; Likutey Halachos Hashkamas HaBoker 1.",
                "scholarly": "ספר המדות, התבודדות; שיחות הר\"ן כה, צה, קא, רכט; ליקו\"ה השכמת הבקר א; ליקו\"מ קמא נב, ר\"ל."
            },
            {
                "beginner": "Take a Torah teaching you have just learned or heard from a true tzaddik and turn it into a prayer: ask Hashem when you, too, will merit everything described in that teaching, and how far you currently are from it. Beg Him to bring you to it. The honest seeker, led by Hashem in the path of truth, will figure out from one matter how to do this for everything. Words of grace, proper arguments, pleading to be drawn close to true service — that is the form. Especially making tefillah from Torah produces enormous delights above.",
                "intermediate": "Mi-Torah tefillah — the methodological core of Likutey Tefilos. Reb Nosson canonized this practice into a parallel volume of prayers tracking the LM teachings. The 'great delights above' are the upper-yichud effect: a man translates revelation back into supplication, completing the circuit. Cf. Tinyana T1:7 (tefillah-redemption); Likutey Tefilos passim.",
                "scholarly": "ליקוטי תפילות (ר' נתן) הקדמה; שיחות הר\"ן רל\"ב; ליקו\"ה תפילה ד."
            }
        ]
    },
    26: {
        "title_en": "Distance from Drunkenness — Daas Clothed in Chasadim",
        "title_he": "צריך להרחיק משכרות",
        "segs": [
            {
                "beginner": "(This first 'segment' in the source is just a header citing Sefer HaMidos, alphabet-of-the-new edition, entry shichrus item 4. The substance follows in the next segment.)",
                "intermediate": "Header reference: Sefer HaMidos (Aleph-Bais HaChadash) — shichrus #4. Treat as paratext; commentary attaches to the body.",
                "scholarly": "ספר המדות, אות שכרות, ד'."
            },
            {
                "beginner": "Stay far from drunkenness; measure yourself carefully so as not to slip past your capacity. A small amount of drinking, when there is a real need, is good — it expands the daas. Daas is clothed in chasadim (kindnesses); when you drink in a measure that fits you, your mind is lifted, daas opens up, and the chasadim are amplified. The Gemara (Eruvin 65) reads 'kol ha-mispateh be-yeino — yesh bo mi-da'as kono': someone who is mispateh (literally 'persuadable, melted') by his wine has something of his Creator's daas. Mispateh exactly: chasadim through wine make him forgivable when ordinary chasadim would not have sufficed; he could have stayed angry and instead he relented. But cross the line into shichrus and the dynamic flips — gevuros are amplified, anger and rage emerge, and sometimes the gevuros of the sitra achra are strengthened, leading to actual evils (rachmana litzlan).",
                "intermediate": "The pivot: yayin be-shi'ur = chasadim mitgadlim; yayin be-yoter = gevuros mitgadlim, including gevuros de-sitra achra. Mispateh is read against pittu'i — the same root that elsewhere means seduction here means melting toward forgiveness. Cf. ליקו\"מ קמא רע\"ז (יין ושמחה); Tinyana T7:3 (Chanukah-encoded-in-end-letters — the wine of pesak vs. wine of klipah). The PNC reading: a baal yayin who knows his shi'ur is the one who can paskon for his community; one who does not is dangerous on both ends.",
                "scholarly": "ערובין סה.; משלי כג; ליקו\"מ קמא רעז; ליקו\"ה הלוואה ב."
            },
            {
                "beginner": "Through drunkenness one forgets all the mitzvos and warnings that Moshe rabbeinu commanded. Why? Because Moshe is clothed in every Jew, in every limb, and reminds each limb to perform the mitzvah pertaining to it — the 248 mitzvos correspond to the 248 limbs. Mechokek (lawgiver, Devarim 33:4) gematriyas to 248. Drunkenness erases this clothing: 'pen yishteh ve-yishkach mechokek' (Mishlei 31:5) — through drink and drunkenness one forgets the 248 mitzvos of Moshe. The clothing of Moshe in the limbs is itself the clothing of daas in chasadim; Moshe is daas, and the limbs (248) are the form of Avraham, ish ha-chesed, who also gematriyas 248.",
                "intermediate": "RM\"CH = Avraham = chasadim; Moshe = daas; daas malbush be-chasadim. Shichrus tears the malbush. Cf. Zohar Pinchas 251a; Tinyana T7 (compassionate leader Moshe); Likutey Halachos Birkas HaShachar 5. The reading collapses three levels: limb-level mitzvah-memory, midos-level chesed, sechel-level daas — all undone by yotzer-yotzer drinking.",
                "scholarly": "דברים לג:ד; משלי לא:ה; זוהר פינחס רנא.; ליקו\"מ קמא א, נד; ליקו\"ה ברכות השחר ה."
            }
        ]
    },
    27: {
        "title_en": "The Just Leader — Weighing Burdens, Releasing Vows, Fending Off Four Sins",
        "title_he": "מי שהוא פרנס חדש או מנהיג",
        "segs": [
            {
                "beginner": "A new parnas or manhig (governor of a community) who leads with integrity and uprightness, who watches and weighs each person to assign him only the burden that fits him — heavier on this one, lighter on that one, each as deserved — by that very practice nullifies the four cardinal evils: idolatry, sexual immorality, bloodshed, and lashon hara. The hidden link: a vow must be paid promptly; one who delays his neder generates these four sins. The Midrash (Vayikra Rabbah 37) shows it in Yaakov: because he delayed his neder he came to all four — avodah zarah ('remove the foreign gods'), arayos (Dinah), shefichus damim (Shechem), lashon hara (Lavan's sons). Conversely Moshe, by 'seeing their burdens' (Shemos 2:11) — really paying attention to which work fit which person, refusing to put a man's job on a woman or vice versa, and refining the assignment among men too — earned the power of hataras nedarim ('between a man and his wife,' Bamidbar 30:17). Just measurement of burdens unlocks vow-release, and vow-release saves from the four.",
                "intermediate": "The chain: ha'arachah tzedeq → hataras nedarim → hatzalah me-arba mi-dos. Yaakov's me'achar nidro is paradigmatic; Moshe's vayar be-sivlosam is the antidote. Cf. ויק\"ר לז; Tinyana T4:3 (three regalim revealing ratzon — the same root: aligning load to bearer). Practical: a parnas who assigns committee work, dues, or service obligations carelessly is structurally producing the four sins in his community. The PNC reading expands: this applies to every household head as a parnas-ze'ir.",
                "scholarly": "שמות ב:יא; במדבר ל:יז; בראשית לא, לד-לה; ויקרא רבה לז; ליקו\"מ קמא נז; ליקו\"ה הפקדון ה."
            }
        ]
    },
    28: {
        "title_en": "Three Tiers of Torah — Recognizing a Jew Among the Nations",
        "title_he": "דע, שיש חלוקים בין התורות",
        "segs": [
            {
                "beginner": "There are tiers of Torah. Some Torah was not given even to be expounded aloud. Some was given to expound but not to write. Some was given to write. The Gemara (Gittin 60b) says: matters that are oral, you are not permitted to say in writing. One who knows how to tell which Torah belongs to which tier — what was given to be written and what was not — can recognize a Jew among the nations, even one Jew standing among many gentiles. The pasuk hints it: 'ekhtav lo rubei torati, kemo zar nechshavu' (Hoshea 8:12) — when 'most of My Torah' is written down (more than was meant to be), 'they were considered as a stranger': the Jew becomes unrecognizable, and conversely a foreigner can be mistaken for a Jew. The essential difference between Israel and the nations is the part not given to be written — Torah she-be'al peh. The Yerushalmi (Pe'ah 2) explains that Torah she-be'al peh was given precisely because galus was foreseen and the nations would copy down Torah she-bichsav; oral Torah they cannot copy. Every Jew carries within him a portion of Torah she-be'al peh. To recognize that portion is to recognize Israel.",
                "intermediate": "Three tiers: (1) lo nittan afilu lidrosh, (2) nittan lidrosh ve-lo nittan likhtov, (3) nittan likhtov. Mavchin bein ha-Torot = mavchin bein Yisrael la-amim because the differentia is Torah she-be'al peh. Hoshea's rubei is read pejoratively here: over-writing collapses the boundary. Cf. Tinyana T32 (sefarim hidden and burned for the world's good) — both teachings respect a non-public layer. גיטין ס:; ירושלמי פאה ב; מד\"ר תשא מז.",
                "scholarly": "הושע ח:יב; גטין ס:; ירושלמי פאה פ\"ב; מד\"ר תשא פרשה מז; ליקו\"מ תנינא לב; ליקו\"ה תפילין ה."
            }
        ]
    },
    29: {
        "title_en": "A Mixture of Forbidden and Permitted — A Sign of Damaged Yichud",
        "title_he": "כשארע שאלה בבית האדם",
        "segs": [
            {
                "beginner": "When a halachic she'eilah arises in your house — a mixture of forbidden and permitted, with not enough heter to nullify the issur — that is Heaven showing you that you have damaged some yichud above. All yichudim and zivugim are the dynamic of nullifying issur. We say 've-asar lanu es ha-arusos ve-hitir lanu es ha-nesu'os' — the betrothed is forbidden, marriage turns issur into heter. Even the lower zivug in this world is described: 'Elokim moshiv yechidim baytah' (Tehillim 68:7), which Chazal (Sotah 2) read for zivugim, and then 'motzi asirim ba-kosharos' — the forbidden becomes kosher and permitted, the form of nullifying issur. So when the issur is not nullified and the question rules forbidden, it is a sign that some yichud above has been damaged, because yichud is the very form of nullifying issur.",
                "intermediate": "The teshuvah: bittul issur is a kabbalistic act, not just a halachic computation. When the rov fails to be matir, the failure points upward to a pegimah in zivug. תהלים סח:ז + סוטה ב = lower zivug as paradigm of bittul. Cf. Tinyana T20 (pgam ha-ratzon) — both teachings read halachic blockage as symptomatic of upper-realm rupture. Practical: a recurring she'eilas chametz/treif in one household, especially around marital tension, deserves a teshuvah-cheshbon, not only a posek.",
                "scholarly": "תהלים סח:ז; סוטה ב.; ליקו\"מ קמא טו; ליקו\"ה תערבות ב."
            }
        ]
    },
    30: {
        "title_en": "A New Sefer's Tears Stand Against the Decrees of the Nations",
        "title_he": "כשבא ספר חדש לעולם",
        "segs": [
            {
                "beginner": "When a new sefer comes into the world, and you know (from elsewhere in our teachings, Torah 262) that chiddushim are produced through tears, then those tears of the chiddushim from which the new sefer was made stand against the decrees of the nations and nullify them. The reasoning: the nations' strength comes from the tears of Esav (Zohar Shemos 12). When the tears of holiness arrive, they stand against and overturn Esav's tears. The word בכיה (bechiyah) is the acronym of בני ישראל כחול הים (Bnei Yisrael ke-chol ha-yam, Hoshea 2:1). Just as the sand of the sea protects against the sea's waves so they don't flood the world (Zohar Pekudei 225), so Bnei Yisrael — through bechiyah and tears — protect against the decrees of the nations. 've-hayah mispar Bnei Yisrael ke-chol ha-yam' — 'mispar' means from the sefer; from there Israel become 'like the sand of the sea,' i.e., the bechiyah and tears of the new sefer's chiddushim that protect them.",
                "intermediate": "The system: chiddush <- demaos; sefer <- chiddushim; sefer kedushah <- demaos kedushah; the latter cancel the demaos de-Esav. בכיה ר\"ת בני ישראל כחול הים. Mispar = sefer (gematria/wordplay). Cf. ליקו\"מ קמא רסב; Tinyana T32 (some sefarim must be hidden — the inverse problem). The PNC reading: every authentic new Breslov sefer published in galus is, ipso facto, a counter-decree. Hence the urgency of publishing.",
                "scholarly": "הושע ב:א; זוהר שמות יב., פקודי רכה.; מדרש תהלים ב; ליקו\"מ קמא רסב; ליקו\"ה הודאה ה."
            }
        ]
    },
    31: {
        "title_en": "Melody Reveals Whether One Has Accepted the Yoke of Torah",
        "title_he": "על ידי הנגינה אדם נכר",
        "segs": [
            {
                "beginner": "Through neginah (melody) a person is recognized — whether he has accepted on himself the yoke of Torah. The siman: 'ba-kasef yisa'u' (Bamidbar 7:9), which Chazal (Arachin 11) explain: 'yisa'u is only a language of shirah,' as in 'se'u zimrah u-tnu tof.' This pasuk is said about the carrying of bnei Kehas, who carried the Aron on the shoulder — the very form of ol Torah. So the way a man sings is the diagnostic of whether he is genuinely shouldering the Aron.",
                "intermediate": "Neginah as test of kabbalas ol Torah: the niggun reveals whether the singer is bearing the Aron. Bamidbar 7:9 + Arachin 11 + zimrah = shirah = nesi'as ha-Aron. Cf. Tinyana T24 (10 minei neginah heal); Tinyana T63 (niggun of tzaddik). Practical: listen for the joy and the gravity together; a niggun without ol is empty; a niggun without simchah is broken.",
                "scholarly": "במדבר ז:ט; ערכין יא.; תהלים פא:ג; ליקו\"מ קמא נד, רכו; ליקו\"ה נטילת ידים שחרית ד."
            }
        ]
    },
    32: {
        "title_en": "Hidden Tzaddikim, Burned Books, and the Spirit of Mashiach",
        "title_he": "יש צדיקים גנוזים",
        "segs": [
            {
                "beginner": "There are hidden tzaddikim who know panim (faces, the inner aspect) in the Torah, but they must conceal their teaching. Like the Baal Shem Tov story with the preacher: even with him there are times he knows a Torah that has panim, and must conceal it — sometimes he doesn't even write it; sometimes he writes it and then burns it. If it had been allowed, it would have become a sefer and entered the world. There are Names in these Torahs (Shmi that is written in holiness), but the world spoils them, and they must be hidden and burned. This concealment is itself a benefit to the world. Many books were already made and then erased — surely the great early Tannaim and Amoraim wrote many, but they were lost. This is good, because if heretical books had not been counterbalanced by the loss of holy ones, we could not draw close to Hashem at all. Yeravam ben Nevat made golden calves and led all Israel — could it be by mere foolishness? No: there were enormous heretical wisdoms involved. If even one page of those books survived now, it would be impossible to come close to Hashem. So it is a benefit that the holy sefarim get concealed and burned (because their concealment somehow drags down the heretical ones with them, as the next sections explain).",
                "intermediate": "Tzaddikim genuzim know panim ba-Torah; their burned/buried Torah is structurally protective. The pairing: when the holy is hidden, the heretical is hidden along with it (the dynamic of the next segments). The Yeravam reference is the proof that pure shtut cannot mislead masses — heresy carries chochmos. ר' נחמן does not say which sefarim of the Tannaim were lost; the point is structural. Cf. ספר תניא חצי קדיש; Tinyana T28 (lo nittan likhtov).",
                "scholarly": "מלכים א יב:כח; ליקו\"מ תנינא כח; ליקו\"ה ברכות הראיה ב; ספר המדות, חכמה."
            },
            {
                "beginner": "The sefer is the form of Shem Hashem — 'migdal oz Shem Hashem, bo yarutz tzaddik ve-nisgav' (Mishlei 18:10; Bereshis Rabbah 37) — Shem Hashem is a sefer because sefer (in gematria) equals Shem (the sefer is the form of 'Shmi that is written in holiness,' which spreads in the world and makes a name). Now know: every person must guard the aspect of Mashiach he has — each according to his holiness and purity carries his own aspect of Mashiach. The principal thing on which this depends is guarding from ni'uf (sexual immorality). Mashiach is the form of chotem (nose), as in 'ru'ach apenu meshi'ach Hashem' (Eichah 4:20), and ni'uf depends on the chotem ('lo tin'af'); the Midrash (Naso 10) reads 'lo tehaneh af' — do not derive pleasure through the nose. One must guard even from the scent of ni'uf, because it damages the aspect of Mashiach within. The aspect of Mashiach rests on anpei oraita — the holy sefarim that reveal panim ba-Torah; there the spirit of Mashiach hovers ('ru'ach Elokim merachefet al pnei ha-mayim' — ru'ach Elokim is the spirit of Mashiach, Zohar Vayechi 240; mayim is Torah, Ta'anis 4, Bava Kamma 17).",
                "intermediate": "Sefer = Shem (gematria); shem b'kedushah is anpei oraita; mashiach hovers on anpei oraita. Mashiach=chotem; ni'uf=pgam ha-chotem; lo tehaneh af. Cf. Zohar ויחי רמ.; Tinyana T7:7 (Chanukah end-letters and chotem); Tinyana T26 (daas malbush in chasadim) — both lift up the chotem-channel. Practical: shemiras einayim and shemiras ha-chotem (avoiding even the scent of ni'uf) is the actual avodah of Mashiach in the individual.",
                "scholarly": "משלי יח:י; איכה ד:כ; שמות כ:יד; בראשית רבה לז; מד\"ר נשא י; זוהר ויחי רמ.; תענית ד.; בבא קמא יז.; ליקו\"מ קמא נח."
            },
            {
                "beginner": "The aspect of 'breath of our nostrils, Mashiach Hashem' becomes a ru'ach kin'ah (a spirit of jealousy) that goes out and is jealous wherever it finds ni'uf — it grows holiness and purity by jealousy. Sometimes 'kineh ve-hi nitma'ah, o avar alav ru'ach kin'ah… ve-hi lo nitma'ah' (Bamidbar 5:14): even when she is not actually defiled, the spirit of Mashiach within him is jealous over the mere appearance of contradiction, because to him even that is a blemish against the integrity of his holiness. Through such jealousy, sometimes a get is made — and that is why the get is called 'sefer kerisus' (Devarim 24:1): because it is made through the sefer, the very locus where the spirit of Mashiach (= ru'ach kin'ah) rests. Or he gives her the bitter waters to drink and she is checked; if she is not defiled, the opposite: 've-nikkesah ve-nizra'ah zara' — she is cleared and bears seed. There is a lower yichud in this world that reaches such a level of kashrus, holiness, and purity that the upper yichud literally depends on it. The couple is so kasher — she with no shemetz pesul, he so kasher — that their zivug carries the upper yichud (Shechinah dwells between them, Sotah 17: yud in him, hei in her).",
                "intermediate": "Mashiach=ru'ach kin'ah (positive jealousy that grows kedushah). Sotah is the legal expression of the dynamic; the get is its severance. yichuda tata'ah be-kashrus shel keva mamash → carries yichuda ila'ah. The PNC reading: the structural problem of the next segment — that this very ru'ach kin'ah can rupture the holy zivug — is the reason the gedolim must conceal their books.",
                "scholarly": "במדבר ה:יד; דברים כד:א; סוטה יז.; זוהר ויחי רמה.; ליקו\"מ קמא ב, נח."
            },
            {
                "beginner": "But here, with such a holy couple, what is the ru'ach kin'ah doing? Answer: here it comes for the sake of love. The Zohar (Vayechi 245) says any love that has no kin'ah bound to it is not true love — 'ki azzah ka-mavet ahavah, kashah ki-she'ol kin'ah'; jealousy testifies to love. Out of the greatness of his love he is jealous over her: 'al tisateri,' so that the love not be spoiled. That is what the spirit of jealousy is doing here — protecting love. But because this lower yichud still happens in this world, the peace between them can still be ruined by that very ru'ach kin'ah: jealousy, even for love's sake, can throw down machloches by making him jealous over her, and so on.",
                "intermediate": "Kin'ah le-shem ahavah — Zohar Vayechi רמה. The structural risk: kin'ah's protective function can become disruptive in olam ha-zeh's coarse medium. This is the bridge to the climax — why books must be burned. Cf. Tinyana T20 (machloket → premature fame, pgam ha-ratzon).",
                "scholarly": "שיר השירים ח:ו; זוהר ויחי רמה.; ליקו\"מ קמא ל, נח."
            },
            {
                "beginner": "Therefore the great tzaddikim must conceal their Torah — burn it, lose it — so that the ru'ach kin'ah will be removed and not damage the peace of the holy couple. Their lower yichud is so precious; ruining the peace between them is a great loss. So those Torahs and sefarim must be lost, in order to remove the spirit of jealousy — because the spirit of jealousy is the spirit of Mashiach, which rests on anpei oraita (the sefarim themselves). When the sefarim burn and are lost, the spirit of jealousy that rested on them is automatically removed. This is the secret of 'Shmi that was written in holiness shall be erased' (Sotah 17): the sefer is the form of Shem Hashem; the Torah said it shall be erased and lost in order to bring peace between a man and his wife — the holy couple. If 'Shmi written in holiness' (the holy sefarim) is erased for peace's sake, all the more so the heretical books that cause hatred and contention among Israel — they must be erased and uprooted, their memory erased from the world. So through the loss of the holy sefarim comes the benefit that the heretical sefarim are uprooted, and then we can come close to Him. Amen.",
                "intermediate": "Climax: chuvas ha-genizah. Burning the holy sefer = removing ru'ach kin'ah from anpei oraita = preserving the holy couple's lower yichud = an a-fortiori for uprooting heretical books. שמי שנכתב בקדושה ימחה (Sotah 17/Bamidbar 5) is the proof-text. The ma'aseh of the BeSh\"T u-darshan and the missing books of Tannaim/Amoraim is now ratzon-ratzon — they were genuzim by design. PNC reading: this teaching is itself near-the-edge of what should have been written; Reb Nosson's preserving of it requires its own halachic-mystical justification (cf. petichah to Likutey Halachos).",
                "scholarly": "במדבר ה:כג; שבת קטז.; סוטה יז.; ליקו\"מ קמא ב, ר\"ל; ליקו\"ה ברכות הראיה ב."
            }
        ]
    },
    33: {
        "title_en": "Yisro's Joy Over All the Good — The Convert's Body and the End of the End",
        "title_he": "ויחד יתרו על כל הטובה",
        "segs": [
            {
                "beginner": "'Vayichad Yisro al kol ha-tovah' (Shemos 18:9) — Chazal (Sanhedrin 94) say his flesh became chidudin chidudin (goosebumps, raised pricks). All joys are bound to their hour — the simchah of a wedding or a bris is only at its hour; if you look at the end, there is no joy in the world (sof adam le-mus, Berachos 17). But if you look at the end of the end — the ultimate purpose — there is great joy, because the absolute end is very good. From the side of the neshamah this is straightforward: 've-hineh tov me'od' — Chazal (Bereshis Rabbah 9) say that 'me'od' is the angel of death — death itself is the good that brings to the ultimate good. A tzaddik whose body too is pure and holy can rejoice with his body even when he looks at the end: 'ba-Elokim batachti, mah ya'aseh basar li' (Tehillim 56:5) — the flesh, his body, can do him no harm; 'af be-sari yishkon la-vetach' (Tehillim 16:9) — even for the body it will be good. But one whose body is not so holy, especially a convert (whose neshamah may be very high but whose body was formed from a tippah temei'ah, and that cannot simply be exchanged), cannot rejoice with his body when looking at the tachlis. So 'Vayichad Yisro al kol ha-tovah' — beyond the good, beyond the visible benefit, looking past it, he was sameach. From the side of the neshamah even looking at the end is great joy. But 'his flesh became chidudin chidudin' — his flesh specifically, his body. Because as a ger his joy could not extend to his body when he looked at the end.",
                "intermediate": "The reading flips Sanhedrin 94's chidudin from a sympathy-reaction to bnei Yisrael's miracles into a diagnostic of the convert's body-soul split. al kol ha-tovah = me-ever la-tovah = looking past the immediate benefit at the tachlis. Tzaddik gamur: simchah for both nefesh and basar; ger: simchah for nefesh only; basar nesh'ar chidudin chidudin. Cf. Tinyana T7 (compassionate leader Moshe accepts converts), T24 (joy heals — but only if the body can receive it). The PNC reading: the chidudin are the body's truth-telling — joy that does not pretend.",
                "scholarly": "שמות יח:ט; תהלים טז:ט, נו:ה; ברכות יז.; סנהדרין צד.; בראשית רבה ט; ליקו\"מ קמא רפב; ליקו\"ה גרים ג."
            }
        ]
    }
}

def main():
    with open(LMC, encoding='utf-8') as f:
        cdata = json.load(f)
    if '2' not in cdata:
        cdata['2'] = {}
    written = []
    for n, info in torahs.items():
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
        out_path = os.path.join(PNC_DIR, f'tinyana-{n}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # round-trip validate
        with open(out_path, encoding='utf-8') as f:
            rt = json.load(f)
        assert rt['id'] == data['id']
        assert len(rt['segments']) == len(segs_out)
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
        written.append((n, len(segs_out)))
        print(f"OK Tinyana T{n}: wrote {len(segs_out)} segs")

    with open(LMC, 'w', encoding='utf-8') as f:
        json.dump(cdata, f, ensure_ascii=False, indent=2)
    print("Done:", written)

if __name__ == '__main__':
    main()
