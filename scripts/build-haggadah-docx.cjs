const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, Header, Footer, PageNumber, HeadingLevel, Tab, TabStopType, TabStopPosition, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const READER = path.join(BASE, 'public', 'reader');

// ============================================================
// HELPERS
// ============================================================

function readJSON(relPath) {
  const full = path.join(READER, relPath);
  if (!fs.existsSync(full)) { console.warn('MISSING:', full); return null; }
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

/** Create a Hebrew paragraph (RTL, Times New Roman) */
function hePar(text, opts = {}) {
  const {
    size = 24,        // half-points (24 = 12pt)
    bold = false,
    italic = false,
    align = AlignmentType.RIGHT,
    spacingAfter = 120,
    spacingBefore = 0,
    indent = 0,
    font = 'Times New Roman',
  } = opts;
  return new Paragraph({
    alignment: align,
    bidirectional: true,
    spacing: { after: spacingAfter, before: spacingBefore },
    indent: indent ? { left: indent } : undefined,
    children: [
      new TextRun({ text, size, bold, italics: italic, font, rightToLeft: true }),
    ],
  });
}

/** Create an English paragraph */
function enPar(text, opts = {}) {
  const {
    size = 22,
    bold = false,
    italic = false,
    align = AlignmentType.JUSTIFIED,
    spacingAfter = 120,
    spacingBefore = 0,
    indent = 0,
    font = 'Times New Roman',
  } = opts;
  return new Paragraph({
    alignment: align,
    spacing: { after: spacingAfter, before: spacingBefore },
    indent: indent ? { left: indent } : undefined,
    children: [
      new TextRun({ text, size, bold, italics: italic, font }),
    ],
  });
}

/** Section heading — centered, bold, 18pt */
function sectionHeading(text, isHebrew = false) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 300 },
    children: [
      new TextRun({
        text,
        size: 36,
        bold: true,
        font: 'Times New Roman',
        rightToLeft: isHebrew,
      }),
    ],
  });
}

/** Sub-heading — centered, bold, 14pt */
function subHeading(text, isHebrew = false) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({
        text,
        size: 28,
        bold: true,
        font: 'Times New Roman',
        rightToLeft: isHebrew,
      }),
    ],
  });
}

/** Page break paragraph */
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Centered paragraph */
function centeredPar(text, opts = {}) {
  const { size = 24, bold = false, italic = false, rtl = false, spacingAfter = 200, spacingBefore = 0 } = opts;
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: spacingAfter, before: spacingBefore },
    children: [
      new TextRun({ text, size, bold, italics: italic, font: 'Times New Roman', rightToLeft: rtl }),
    ],
  });
}

/** Gematria bullet line — indented, 11pt */
function gematriaLine(heText, enExplanation) {
  const runs = [
    new TextRun({ text: '\u2022 ', size: 22, font: 'Times New Roman' }),
    new TextRun({ text: heText, size: 22, font: 'Times New Roman', rightToLeft: true, bold: true }),
  ];
  if (enExplanation) {
    runs.push(new TextRun({ text: ' \u2014 ' + enExplanation, size: 22, font: 'Times New Roman' }));
  }
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 720 },
    children: runs,
  });
}

/** Commentary paragraph — indented, 10pt */
function commentaryPar(text, isHebrew = true) {
  return new Paragraph({
    alignment: isHebrew ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
    bidirectional: isHebrew,
    spacing: { after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text,
        size: 20,
        font: 'Times New Roman',
        rightToLeft: isHebrew,
        italics: !isHebrew,
      }),
    ],
  });
}

// ============================================================
// READ ALL SOURCE DATA
// ============================================================

console.log('Reading source data...');

// Haggadah sections 1-14
const haggadahSections = [];
for (let i = 1; i <= 14; i++) {
  const data = readJSON(`haggadah-shel-pesach/part-1/section-${i}.json`);
  if (data) haggadahSections.push(data);
}
console.log(`  Haggadah sections: ${haggadahSections.length}`);

// Or Zoreach commentary
const orZoreachText = fs.readFileSync(path.join(READER, 'haggadah-shel-pesach', '_cleaned_or_zoreach.txt'), 'utf8');
console.log(`  Or Zoreach: ${orZoreachText.length} chars`);

// Chumash with Likutay Halachos on Pesach
const chumashLH = readJSON('haggadah-shel-pesach/part-1/chumash-lh-pesach.json');
console.log(`  Chumash LH: ${chumashLH ? chumashLH.segments.length : 0} segments`);

// SSK 2:38 — Matza Shmura teaching
const ssk38 = readJSON('siach-sarfei-kodesh/part-2/section-38.json');
console.log(`  SSK 2:38: loaded`);

// Shivchay HaRan section 32
const sh32 = readJSON('shivchay-haran/section-32.json');
console.log(`  Shivchay HaRan 32: loaded`);

// Saba's Pesach letters
const letterNums = [6, 7, 9, 22, 111];
const sabaLetters = [];
for (const n of letterNums) {
  const data = readJSON(`ebay-hanachal/part-1/letter-${n}.json`);
  if (data) sabaLetters.push({ num: n, ...data });
}
console.log(`  Saba letters: ${sabaLetters.length} loaded`);

// ============================================================
// SEDER NAMES
// ============================================================

const sederNames = [
  'קַדֵּשׁ', 'וּרְחַץ', 'כַּרְפַּס', 'יַחַץ', 'מַגִּיד', 'רָחְצָה',
  'מוֹצִיא מַצָּה', 'מָרוֹר', 'כּוֹרֵךְ', 'שֻׁלְחָן עוֹרֵךְ',
  'צָפוּן', 'בָּרֵךְ', 'הַלֵּל', 'נִרְצָה'
];

const sederEnglish = [
  'Kiddush', 'Wash Hands', 'Dip Vegetable', 'Break Matza', 'Tell the Story',
  'Wash for Meal', 'Bless Matza', 'Bitter Herb', 'Hillel Sandwich',
  'Set the Table', 'Hidden Matza', 'Grace After Meals', 'Songs of Praise', 'Acceptance'
];

// ============================================================
// BUILD DOCUMENT CHILDREN
// ============================================================

const children = [];

// ============================================================
// 1. TITLE PAGE
// ============================================================

// Spacer
children.push(new Paragraph({ spacing: { before: 3000 }, children: [] }));

// Main title
children.push(centeredPar('הגדה של פסח', { size: 72, bold: true, rtl: true, spacingAfter: 300 }));

// Subtitle line
children.push(centeredPar('Na Nach Edition / מהדורת נ נח', { size: 36, italic: true, spacingAfter: 300 }));

// Or Zoreach subtitle
children.push(centeredPar('עם פירוש אור זורח ולקוטי נ נח', { size: 28, rtl: true, spacingAfter: 200 }));
children.push(centeredPar('With Or Zoreach Commentary & Na Nach Teachings', { size: 24, italic: true, spacingAfter: 400 }));

// Gematria highlight
children.push(centeredPar('פֶּסַח = נַחְמָן = 148', { size: 36, bold: true, rtl: true, spacingAfter: 400 }));

// Na Nach
children.push(centeredPar('נ נח נחמ נחמן מאומן', { size: 40, bold: true, rtl: true, spacingAfter: 600 }));

// Decorative line
children.push(centeredPar('✦ ✦ ✦', { size: 28, spacingAfter: 400 }));

// Bottom info
children.push(centeredPar('ajew.org', { size: 24, spacingAfter: 100, spacingBefore: 800 }));

children.push(pageBreak());

// ============================================================
// 2. INTRODUCTION — 8 Nissan + Torah Novelties on Pesach
// ============================================================

children.push(sectionHeading('הקדמה', true));
children.push(sectionHeading('Introduction'));

// --- 8 Nissan Opening ---
children.push(hePar(
  'ח׳ ניסן תשפ"ו — היום, ביום שהנשיא גמליאל בן פדהצור מקריב את קרבנו, באנו לסדר הגדה של פסח אמיתית של ברסלב.',
  { size: 26, bold: true, spacingAfter: 200 }
));
children.push(enPar(
  'The 8th of Nissan 5786 — Today, on the day when the Nassi Gamliel ben Pedahtzur brings his offering, we have come to arrange a true Breslov Haggadah shel Pesach.',
  { size: 24, bold: true, spacingAfter: 200 }
));
children.push(enPar(
  'And we note the auspicious timing: The Nassi of this day carries within his very name the secret of the Haggadah and of Mitzrayim:',
  { size: 22, spacingAfter: 200 }
));
children.push(gematriaLine('פדהצור = 380 = מצרים = ש"פ (ר"ת הגדה של פסח)', 'Pedahtzur = 380 = Mitzrayim = Shin-Peh (initials of Haggadah Shel Pesach)'));
children.push(gematriaLine('פדה-צור — הצור פדה', '"The Rock redeemed" — HaShem redeems from Mitzrayim'));
children.push(gematriaLine('מנשה = אותיות משה + נ׳ (שער הנ׳ של בינה)', 'Menashe = letters of Moshe + Nun (the 50th gate of Binah)'));
children.push(gematriaLine('ר"ת גמליאל בן פדהצור = גב"פ = בגפו', 'Initials of Gamliel Ben Pedahtzur = Begafo — "alone he comes, alone he goes free"'));
children.push(gematriaLine('גמליאל — בחי׳ המלאך גומיאל (שרשי השמות) = מים = 90', 'Gamliel — aspect of angel Gumiel (Shoreshei HaShemos) = Mayim/Water = 90'));
children.push(gematriaLine('גם עלה = נחמן = פסח = 148 (בראשית מו:ד)', 'Gam Aloh = Nachman = Pesach = 148 — "I will also bring you UP" (Bereishis 46:4)'));
children.push(enPar(
  'And in Gemara Brachos: one who sees a gamal (camel) in a dream — death was decreed from Heaven and he was saved. R\' Chama bar Chanina says the source is: "And I will go down with you to Mitzrayim and I will also bring you UP (gam aloh)" — the rising up from Mitzrayim IS Nachman, IS Pesach, IS 148!',
  { size: 22, spacingAfter: 200 }
));
children.push(enPar(
  'And Moshe = 345 = HaMitzri — he is called "Ish Mitzri" (Shemos 2:19). He carried Mitzrayim within him to rectify it from inside. And from Sefer Bris Menucha: Paschar (פסכ"ר), one of the 7 Ro\'ei Pnei HaMelech, = 380 = Mitzrayim — appointed over harsh judgment from all the serafim. And in Shoreshei HaShemos of the Ramaz: Pasbar (פסב"ר), with the interchange of Kaf and Beis.',
  { size: 22, spacingAfter: 300 }
));

children.push(pageBreak());

children.push(sectionHeading('חידושי תורה על פסח', true));
children.push(sectionHeading('Torah Novelties on Pesach'));

// --- Why Moshe isn't mentioned ---
children.push(new Paragraph({ spacing: { before: 400, after: 100 }, children: [] }));
children.push(subHeading('למה משה רבינו לא מוזכר בהגדה?', true));
children.push(subHeading('Why is Moshe Rabbeinu not mentioned in the Haggadah?'));

children.push(hePar(
  'משה רבינו הוא המספר! כל ההגדה נאמרת מפיו, על ידי אליהו הנביא שהוא פה של משה (אדיר במרום). כשאתה המספר, אתה לא אומר את שמך.',
  { size: 24, spacingAfter: 200 }
));
children.push(enPar(
  'Because Moshe IS the narrator! The entire Haggadah is spoken from his mouth, through Eliyahu HaNavi who is the "mouth of Moshe" (Adir BaMarom). When you are the one telling the story, you do not say your own name.',
  { size: 22, spacingAfter: 300 }
));

// --- Devarim 16:1 ---
children.push(subHeading('דברים ט"ז:א — יצאו בלילה?', true));
children.push(subHeading('Devarim 16:1 — They "Went Out at Night"?'));

children.push(hePar(
  'בני ישראל לא יצאו מבתיהם באותו לילה (כמצוה: "ואתם לא תצאו איש מפתח ביתו עד בוקר"), ובכל זאת נאמר "הוציאך ה\' אלהיך ממצרים לילה" — כי כבר היו בפרדיגמה של גאולה.',
  { size: 24, spacingAfter: 200 }
));
children.push(enPar(
  'The Jews did not leave their houses that night (as commanded: "none of you shall go out of the door of his house until the morning"), yet the Torah says they "went out at night" (Devarim 16:1) — because they were already in the paradigm of Geulah (redemption). The spiritual exodus had already begun.',
  { size: 22, spacingAfter: 300 }
));

// --- Sacred Gematrias ---
children.push(pageBreak());
children.push(subHeading('גימטריאות קדושות', true));
children.push(subHeading('Sacred Gematrias'));

children.push(gematriaLine('פֶּסַח = נַחְמָן = 148', 'Pesach = Nachman = 148'));
children.push(gematriaLine(
  'חַג הַמַּצוֹת = אֲנִי נ נַח נַחְמָ נַחְמָן מֵאוּמָן רַבֵּנוּ נַחְמָן בֶּן פֵיגָא',
  'Chag HaMatzos = Ani Na Nach Nachma Nachman Me\'uman Rabbeinu Nachman ben Feiga'
));
children.push(gematriaLine(
  'הַגָּדָה שֶׁל פֶּסַח = נ נַח נַחְמָ נַחְמָן מֵאוּמָן',
  'with 4 kollelim of the Shir Pashut Kaful Meshulash Meruba'
));
children.push(gematriaLine(
  'שֶׁל פֶּסַח: ש"פ = מִצְרַיִם = 380',
  'The initials of "Shel Pesach" = Mitzrayim = 380'
));
children.push(gematriaLine(
  'מֹשֶׁה = הַמִּצְרִי = 345',
  'Moshe = HaMitzri = 345'
));
children.push(gematriaLine(
  'פסכ"ר = מִצְרַיִם = 380',
  'From Ramaz, Shoreshei HaShemos — appointed over harsh judgment'
));
children.push(gematriaLine(
  'שָׁלוֹם + 4 אוֹתִיוֹת = מִצְרַיִם = 380',
  'Shalom + 4 letters = Mitzrayim = 380'
));

children.push(new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }));

// Pesach = leaping teaching
children.push(enPar(
  'The word "Pesach" means leaping/skipping — this is connected to Likutay Moharan 64:2 about the Ivriim (Hebrews) who leap over all wisdoms of the world through pure faith. They are called "Ivriim" because they cross over (oiver) from one side to the other, transcending all natural wisdom through their connection to Hashem.',
  { size: 22, spacingAfter: 300 }
));

// --- Nassi of 8 Nissan ---
children.push(pageBreak());
children.push(subHeading('נשיא ח׳ ניסן — גמליאל בן פדהצור למנשה', true));
children.push(subHeading('Nassi of 8 Nissan — Gamliel ben Pedahtzur of Menashe'));

children.push(gematriaLine(
  'פְּדָהצוּר = 380 = מִצְרַיִם = ש"פ (ר"ת הגדה של פסח)',
  '"The Rock redeemed" = Mitzrayim = initials of Haggadah shel Pesach'
));

children.push(enPar(
  'But Moshe was PUNISHED at the Rock ("hit the rock instead of speaking to it") — so Pedahtzur ("the Rock redeemed") is the tikkun (rectification) of that very incident!',
  { size: 22, spacingAfter: 200 }
));

children.push(gematriaLine(
  'מְנַשֶּׁה = אותיות משה + נ׳',
  'Menashe = the letters of Moshe + the letter Nun (50)'
));

children.push(enPar(
  'Menashe is Moshe with the 50th gate of Binah. That is why his nassi offering is on day 8 — corresponding to Binah (the 8th level). Menashe was born in Mitzrayim, from the seed of Yosef HaTzaddik — in whose merit the sea split and fled.',
  { size: 22, spacingAfter: 200 }
));

children.push(gematriaLine(
  'ר"ת גמליאל בן פדהצור = גב"פ = בגפו',
  '"If he comes alone, he leaves alone" — the Eved Ivri who goes FREE!'
));

children.push(gematriaLine(
  'גמליאל = the angel גומיאל (Ramaz) = מַיִם = 90',
  'The water that split!'
));

children.push(enPar(
  'Gemara Brachos teaches: seeing a gamal (camel) in a dream means death was decreed but one was saved from it. The source verse: "And I will bring you up also (gam aloh)" (Bereishis 46:4).',
  { size: 22, spacingAfter: 200 }
));

children.push(gematriaLine(
  'גַּם עָלֹה = נַחְמָן = פֶּסַח = 148!',
  'Gam Aloh = Nachman = Pesach = 148!'
));

// --- Teachings from Kuntres HaHosafos L'Chayey Moharan ---
children.push(pageBreak());
children.push(subHeading('קונטרס ההוספות לספר חיי מוהר"ן', true));
children.push(subHeading('Kuntres HaHosafos — Additions to Chayey Moharan'));

// לב — Litvaks have strong hearts
children.push(hePar(
  'לב — רבינו ז"ל אמר שהוא אוהב שענינו יבא על לבות של ליטאים ("ליטוואקיס") כי יש להם לב חזק והם עקשנים גדולים וזה מעלה גדולה בעבודת השם ("זיין זאך זאל איבער גיין אוף ליטוושי הערצער").',
  { size: 24, spacingAfter: 150 }
));
children.push(enPar(
  '32 — Rabbeinu said that he loves when his matters come upon the hearts of Lithuanians ("Litvaks"), for they have strong hearts and they are greatly stubborn — and this is a great virtue in the service of Hashem.',
  { size: 22, spacingAfter: 300 }
));

// לג — Shmira in the pants / no extra stringencies
children.push(hePar(
  'לג — פעם אחד הי\' איזה שאלה אצל רבינו ז"ל בפסח שנפל חתיכת מצה לתוך התבשיל לענין שאין אוכלים (גבראקט) המצה לתוך המים (שרויה) ולא החמיר כל כך. אמר לענין מצה שמורה העיקר שמירה במכנסיים ("שמירה אין דיא הוזין") היינו העיקר הוא תיקון הברית בזה צריכין להחמיר מאד אבל בשאר דברים לא צריכים חומרות יתירות רק אם ע"פ ש"ע כשר לא צריכים להחמיר הרבה מאד וכמו שאומרים אנ"ש שהראשי תיבות ו\'ח\'י\' בהם הוא ו\'לא ח\'ומרות י\'תירות.',
  { size: 24, spacingAfter: 150 }
));
children.push(enPar(
  '33 — Once there was a question before Rabbeinu on Pesach about a piece of matza that fell into a cooked dish, regarding the matter of not eating matza soaked in water (gebrochts/shruyah), and he did not rule stringently. He said regarding matza shmura: "The main guarding is in the pants!" ("Shmira in di hozin") — meaning the main thing is the rectification of the bris (covenant), in this one must be very strict. But in other matters one does not need extra stringencies — if according to the Shulchan Aruch it is kosher, one does not need to be overly strict. As our people say: the acronym of V\'CH\'Y (and he lived) is V\'lo CH\'umros Y\'eseiros — "and no extra stringencies!"',
  { size: 22, spacingAfter: 300 }
));

// לד — Taking matza = taking HKB'H
children.push(hePar(
  'לד — פעם אחת היו מנחות אצל רבנו ז"ל שתי מצות: אחת של שמורה ואחת בלתי, והשמורה היתה יותר קרובה לרבנו ז"ל. והניח רבנו ז"ל השמורה ולקח הבלתי, ואמר: כאשר לוקחים מצה ביד, לוקחים את קדשא בריך הוא בעצמו ביד ("אז מען נעמט א מצה אין דער האנט, נעמט מען קודשא בריך הוא אין דער האנט"), כי המצות הן באחדות עם השם יתברך, כמובא בלקוטי מוהר"ן סימן ה\'.',
  { size: 24, spacingAfter: 150 }
));
children.push(enPar(
  '34 — Once there were placed before Rabbeinu two matzos: one shmura and one not shmura, and the shmura was closer to Rabbeinu. And Rabbeinu LEFT the shmura and TOOK the non-shmura, and said: "When one takes a matza in the hand, one takes the Holy One Blessed Be He Himself in the hand!" ("Az men nemt a matza in der hant, nemt men Kudsha Brich Hu in der hant") — for the matzos are in unity with Hashem Yisbarach, as brought in Likutay Moharan, Torah 5.',
  { size: 22, spacingAfter: 300 }
));

children.push(pageBreak());

// ============================================================
// 3. SEDER PLATE DIAGRAM (Arizal)
// ============================================================

children.push(sectionHeading('קערת הסדר — סדר האריז"ל', true));
children.push(sectionHeading('Seder Plate — Arizal Arrangement'));

children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));

// Build a nicer plate layout using centered lines
const platePairs = [
  { left: 'ביצה / Beitzah (Egg)', right: 'זרוע / Zeroa (Shankbone)', leftSef: 'גבורה / Gevurah', rightSef: 'חסד / Chesed' },
  { center: 'מרור / Maror (Bitter Herb)', centerSef: 'תפארת / Tiferet' },
  { left: 'כרפס / Karpas (Vegetable)', right: 'חרוסת / Charoset (Paste)', leftSef: 'הוד / Hod', rightSef: 'נצח / Netzach' },
  { center: 'חזרת / Chazeret (Lettuce)', centerSef: 'יסוד / Yesod' },
];

for (const row of platePairs) {
  if (row.center) {
    children.push(centeredPar(row.center, { size: 24, bold: true, spacingAfter: 40 }));
    children.push(centeredPar(row.centerSef, { size: 20, italic: true, spacingAfter: 200 }));
  } else {
    // Two items side by side — use a wide centered format
    children.push(centeredPar(`${row.left}          ${row.right}`, { size: 22, bold: true, spacingAfter: 40 }));
    children.push(centeredPar(`${row.leftSef}          ${row.rightSef}`, { size: 20, italic: true, spacingAfter: 200 }));
  }
}

children.push(centeredPar('═══════════════════════════════', { size: 20, spacingAfter: 100, spacingBefore: 200 }));
children.push(centeredPar('שלוש מצות / Three Matzos Beneath', { size: 24, bold: true, spacingAfter: 60 }));
children.push(centeredPar('חכמה — בינה — דעת / Chochma — Binah — Da\'as', { size: 20, italic: true, spacingAfter: 200 }));

children.push(pageBreak());

// ============================================================
// 4. THE HAGGADAH TEXT — All 14 sections, COMPLETE
// ============================================================

for (let i = 0; i < haggadahSections.length; i++) {
  const sec = haggadahSections[i];
  const heName = sederNames[i] || sec.hebrewTitle || '';
  const enName = sederEnglish[i] || sec.title || '';

  // Section header
  children.push(sectionHeading(heName, true));
  children.push(centeredPar(enName, { size: 28, italic: true, spacingAfter: 300 }));

  // Determine max segments: limit Nirtzah (section 14) to 100, rest unlimited
  const maxSegs = (i === 13) ? 100 : Infinity;
  const segs = sec.segments.slice(0, maxSegs);

  for (const seg of segs) {
    // Use nikud version if available
    const heText = (seg.he_nikud || seg.he || '').trim();

    // Skip very short segments or tab-only content that's just a page marker
    if (!heText || heText.length < 3) continue;

    // Clean tab markers (e.g. "text\t1")
    const cleanHe = heText.replace(/\t\d+$/, '').trim();
    if (!cleanHe || cleanHe.length < 3) continue;

    children.push(hePar(cleanHe, { size: 24, spacingAfter: 120 }));
  }

  // === SPECIAL: After Maror section (i=7), add the Bitter Herbs parable ===
  if (i === 7) {
    children.push(pageBreak());
    children.push(subHeading('מעשה ממרור — כוכבי אור', true));
    children.push(subHeading('The Parable of the Bitter Herbs — Kokhvei Or'));

    // Rashi + Litvaks connection
    children.push(enPar(
      'Rashi (Pesachim 39a, d"h Chasa) says that Chasa (lettuce/חסה) — the maror — is called in Old French "Lituga" (ליטוג"א). And Rabbeinu said (Kuntres HaHosafos 32) that he loves when his teachings reach Litvak hearts, for they have strong hearts and great stubbornness — a great virtue in avodas Hashem! The very maror of the seder hints at this.',
      { size: 22, bold: true, spacingAfter: 200 }
    ));

    // Hebrew parable from Kokhvei Or
    children.push(hePar(
      'מַעֲשֶׂה מִמָּרוֹר שֶׁסִּפֵּר רַבֵּנוּ זַ"ל. שֶׁפַּעַם אַחַת הָלְכוּ יְהוּדִי וְגֶרְמָנִי יַחַד נְדוֹד, וְלִמֵּד הַיְּהוּדִי אֶת הַגֶּרְמָנִי שֶׁיַּעֲשֶׂה אֶת עַצְמוֹ כְּמוֹ יְהוּדִי (כֵּיוָן שֶׁהַלָּשׁוֹן הוּא אֶחָד), וְהַיְּהוּדִים רַחֲמָנִים וִירַחֲמוּ עָלָיו. וְכֵיוָן שֶׁבָּא סָמוּךְ לְפֶסַח לִמְּדוֹ אֵיךְ שֶׁיִּתְנַהֵג בְּכָל הַסֵּדֶר, שֶׁעוֹשִׂין קִדּוּשׁ, וְרוֹחֲצִים יָדַיִם, רַק שָׁכַח לֹאמַר לוֹ שֶׁאוֹכְלִים מָרוֹר.',
      { size: 24, spacingAfter: 100 }
    ));
    children.push(hePar(
      'וְכֵיוָן שֶׁבָּא לְהַסֵּדֶר רָעֵב מִכָּל הַיּוֹם, וּמְצַפֶּה שֶׁיֹּאכַל הַדְּבָרִים טוֹבִים שֶׁאָמַר לוֹ הַיְּהוּדִי, אֲבָל נוֹתְנִים לוֹ חֲתִיכַת כַּרְפַּס בְּמֵי מֶלַח, וּשְׁאָר הַדְּבָרִים הַנּוֹהֲגִים בַּסֵּדֶר, וְאוֹמְרִים הַהַגָּדָה. וּכְבָר הוּא בְּעֵינַיִם צוֹפִיּוֹת לְהָאֲכִילָה, וְהוּא שָׂמֵחַ כְּבָר שֶׁאוֹכְלִים כְּבָר הַמַּצָּה. פִּתְאֹם נוֹתְנִים לוֹ מָרוֹר, וְנַעֲשָׂה לוֹ מַר בְּפִיו, וְהוּא חָשַׁב שֶׁזֶּהוּ הַסְּעֻדָּה שֶׁרַק זֶה יֹאכְלוּ. בָּרַח תֵּכֶף בִּמְרִירוּת וּרְעָבוֹן.',
      { size: 24, spacingAfter: 100 }
    ));
    children.push(hePar(
      'וְאַחַר־כָּךְ בָּא הַיְּהוּדִי בְּפָנִים שְׂמֵחוֹת, שָׂבֵעַ מֵאֲכִילָה וּשְׁתִיָּה, וּשְׁאָלוֹ אֵיךְ הָיָה לְךָ הַסֵּדֶר. אָמַר לוֹ הוֹי גֶּרְמָנִי שׁוֹטֶה, אִם הָיִיתָ מְחַכֶּה עוֹד מְעַט, הָיִיתָ אוֹכֵל כָּל טוּב כָּמוֹנִי.',
      { size: 24, spacingAfter: 100 }
    ));
    children.push(hePar(
      'כֵּן הוּא בְּעִנְיַן רַבֵּנוּ וַעֲבוֹדַת ה\', שֶׁאַחַר כָּל הַיְגִיעוֹת וְהַטְּרָחוֹת, נוֹתְנִים מְעַט מָרוֹר מְרִירוּת, כִּי זִכּוּךְ הַגּוּף בָּא בִּמְרִירוּת, אֲבָל הָאִישׁ חוֹשֵׁב שֶׁתָּמִיד יִהְיֶה רַק הַמְּרִירוּת. אֲבָל כֵּיוָן שֶׁמְּחַכֶּה מְעַט וְסוֹבֵל זֶה הַמְּרִירוּת מְעַט מִזִּכּוּךְ הַגּוּף, אָז מַרְגִּישׁ אַחַר־כָּךְ כָּל מִינֵי חִיּוּת וְתַעֲנוּג.',
      { size: 24, spacingAfter: 200 }
    ));

    // English translation
    children.push(enPar(
      'A story of bitter herbs that Rabbeinu told: Once a Jew and a German went wandering together. The Jew taught the German to pretend to be a Jew (since the language is the same), and the Jews are compassionate and will have mercy on him. When Pesach approached, the Jew taught him how to conduct himself at the seder — kiddush, washing hands — but forgot to tell him about the eating of maror.',
      { size: 22, spacingAfter: 100 }
    ));
    children.push(enPar(
      'When the German came to the seder, famished from the whole day, they gave him a piece of karpas in salt water and recited the Haggadah. He was already looking expectantly for the eating. He was happy when they ate the matzah. Suddenly they gave him maror — and his mouth became pungent! He thought THIS is the feast, this alone is what they eat. He immediately fled in bitterness and hunger. "Cursed Jews! After the whole ceremony, THIS is what they give to eat!"',
      { size: 22, spacingAfter: 100 }
    ));
    children.push(enPar(
      'Afterwards the Jew came with joyous countenance, satiated from eating and drinking, and asked him, "How was the seder for you?" He answered angrily. The Jew said to him: "Hoy, German fool! If you would have waited a bit more, you would have eaten sumptuously like me!"',
      { size: 22, bold: true, spacingAfter: 100 }
    ));
    children.push(enPar(
      'The same is true in the service of Hashem: after all the exertion and toil, a bit of maror — bitterness — is given, because the purification of the body comes with bitterness. But the person thinks it will always be just the bitterness, and flees. However, when he waits a bit and endures this small bitterness, then he feels afterwards all types of vitality and delight.',
      { size: 22, spacingAfter: 300 }
    ));
  }

  // Note if Nirtzah was truncated
  if (i === 13 && sec.segments.length > 100) {
    children.push(enPar(`[Nirtzah continues — ${sec.segments.length} total segments]`, { size: 20, italic: true, spacingAfter: 200 }));
  }

  // Page break between sections
  if (i < haggadahSections.length - 1) {
    children.push(pageBreak());
  }
}

children.push(pageBreak());

// ============================================================
// 5. OR ZOREACH COMMENTARY
// ============================================================

children.push(sectionHeading('אור זורח — פירוש על ההגדה', true));
children.push(sectionHeading('Or Zoreach — Commentary on the Haggadah'));

children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));

// Split Or Zoreach text into paragraphs
const orParagraphs = orZoreachText.split(/\n{2,}/).filter(p => p.trim().length > 5);
for (const para of orParagraphs) {
  const cleaned = para.trim();
  if (cleaned.startsWith('--') && cleaned.endsWith('--')) continue; // Skip page markers
  if (cleaned.length < 5) continue;

  // Check if line is a header/section marker
  if (cleaned.length < 80 && /^[א-ת]/.test(cleaned)) {
    children.push(subHeading(cleaned, true));
  } else {
    children.push(commentaryPar(cleaned, true));
  }
}

children.push(pageBreak());

// ============================================================
// 6. CHUMASH WITH LIKUTAY HALACHOS ON PESACH
// ============================================================

children.push(sectionHeading('חומש עם ליקוטי הלכות — פסח', true));
children.push(sectionHeading('Chumash with Likutay Halachos — Pesach'));

if (chumashLH && chumashLH.segments) {
  for (const seg of chumashLH.segments) {
    const heText = (seg.he_nikud || seg.he || '').trim();
    if (!heText || heText.length < 5) continue;
    if (heText.startsWith('--') && heText.endsWith('--')) continue; // page markers

    // Check if it's a section header (short, starts with Hebrew letter or number)
    if (heText.length < 60 && /^[א-ת\d]/.test(heText) && !heText.includes(',')) {
      children.push(subHeading(heText, true));
    } else {
      children.push(commentaryPar(heText, true));
    }
  }
}

children.push(pageBreak());

// ============================================================
// 7. SABA'S PESACH LETTERS (Ebay HaNachal 6, 7, 9, 22, 111)
// ============================================================

children.push(sectionHeading('אגרות הסבא על פסח', true));
children.push(sectionHeading("Saba's Pesach Letters — Ebay HaNachal"));

for (const letter of sabaLetters) {
  children.push(subHeading(`אגרת ${letter.hebrewTitle || letter.num}`, true));
  children.push(subHeading(`Letter ${letter.num}`));

  for (const seg of letter.segments) {
    // Hebrew text
    const heText = (seg.he_nikud || seg.he || '').trim();
    if (heText && heText.length > 3) {
      children.push(hePar(heText, { size: 24, spacingAfter: 120 }));
    }

    // English translation
    const enText = (seg.en || '').trim();
    if (enText && enText.length > 10) {
      // Split long English into paragraphs
      const enParas = enText.split('\n').filter(p => p.trim().length > 3);
      for (const ep of enParas) {
        children.push(enPar(ep.trim(), { size: 22, spacingAfter: 80 }));
      }
    }

    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  }

  children.push(pageBreak());
}

// ============================================================
// 8. RABBEINU'S EREV PESACH JOURNEY (Shivchay HaRan 32)
// ============================================================

children.push(sectionHeading('נסיעת רבינו בערב פסח', true));
children.push(sectionHeading("Rabbeinu's Erev Pesach Journey — Shivchay HaRan 32"));

if (sh32 && sh32.segments) {
  for (const seg of sh32.segments) {
    // Hebrew (prefer nikud)
    const heText = (seg.he_nikud || seg.he || '').trim();
    if (heText && heText.length > 5) {
      children.push(hePar(heText, { size: 24, spacingAfter: 200 }));
    }

    // English
    const enText = (seg.en || '').trim();
    if (enText && enText.length > 10) {
      const enParas = enText.split('\n').filter(p => p.trim().length > 3);
      for (const ep of enParas) {
        children.push(enPar(ep.trim(), { size: 22, spacingAfter: 100 }));
      }
    }
  }
}

children.push(pageBreak());

// ============================================================
// 9. BAAL SHEM TOV'S JOURNEY TO ERETZ YISRAEL
//    (Read on Shvi'i shel Pesach)
// ============================================================

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(sectionHeading("The Baal Shem Tov's Journey to Eretz Yisrael"));
children.push(centeredPar("סיפור נסיעת הבעל שם טוב הקדוש לארץ ישראל", { size: 28, bold: true, rtl: true, spacingAfter: 100 }));
children.push(centeredPar("Read on the Seventh Day of Pesach", { size: 22, italic: true, spacingAfter: 100 }));
children.push(centeredPar("As received by R' Yitzchok Meir Korman — the only one to receive it from", { size: 20, italic: true, spacingAfter: 40 }));
children.push(centeredPar("R' Avrohom ben R' Nachman of Tulchin", { size: 20, italic: true, spacingAfter: 100 }));
children.push(centeredPar("מתוך ספר תולדות אדם — הוצאת מלא וגדיש", { size: 20, italic: true, rtl: true, spacingAfter: 300 }));

// Load authentic BST story from Toldos Adam (Maaleh Vigadish)
const bstPath = path.join('C:', 'Users', 'Pettek', 'Downloads', "Toldos Adam - story of birth of Rabbainu and trip of Bal Shem Tov .md");
let bstText = '';
if (fs.existsSync(bstPath)) {
  bstText = fs.readFileSync(bstPath, 'utf8');
  console.log(`  BST story: ${bstText.length} chars loaded`);
} else {
  console.log('  WARNING: BST story file not found');
}

// Clean up OCR artifacts and split into paragraphs
const bstParas = bstText
  .replace(/\*\*/g, '')  // remove markdown bold
  .replace(/\*/g, '')    // remove markdown italic
  .replace(/\\-/g, '-')  // fix escaped dashes
  .replace(/\r\n/g, '\n')
  .split(/\n\n+/)
  .filter(p => p.trim().length > 20)
  .map(p => p.trim());

for (const para of bstParas) {
  children.push(hePar(para, { size: 22, spacingAfter: 160 }));
}

// ============================================================
// 10. SEFIRAS HAOMER — Full 49-Day Count
// ============================================================

children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(sectionHeading("Sefiras HaOmer — ספירת העומר"));
children.push(centeredPar("The Forty-Nine Days from Pesach to Shavuos", { size: 22, italic: true, spacingAfter: 300 }));

children.push(hePar("בָּרוּךְ אַתָּה ה' אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם, אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו, וְצִוָּנוּ עַל סְפִירַת הָעוֹמֶר.", { size: 26, bold: true, spacingAfter: 300 }));

const sefirot = ['חסד', 'גבורה', 'תפארת', 'נצח', 'הוד', 'יסוד', 'מלכות'];
const sefirotEn = ['Chesed', 'Gevurah', 'Tiferet', 'Netzach', 'Hod', 'Yesod', 'Malchut'];
const heNums = ['אֶחָד','שְׁנַיִם','שְׁלֹשָׁה','אַרְבָּעָה','חֲמִשָּׁה','שִׁשָּׁה','שִׁבְעָה','שְׁמוֹנָה','תִּשְׁעָה','עֲשָׂרָה',
  'אַחַד עָשָׂר','שְׁנֵים עָשָׂר','שְׁלֹשָׁה עָשָׂר','אַרְבָּעָה עָשָׂר','חֲמִשָּׁה עָשָׂר','שִׁשָּׁה עָשָׂר','שִׁבְעָה עָשָׂר','שְׁמוֹנָה עָשָׂר','תִּשְׁעָה עָשָׂר','עֶשְׂרִים',
  'עֶשְׂרִים וְאֶחָד','עֶשְׂרִים וּשְׁנַיִם','עֶשְׂרִים וּשְׁלֹשָׁה','עֶשְׂרִים וְאַרְבָּעָה','עֶשְׂרִים וַחֲמִשָּׁה','עֶשְׂרִים וְשִׁשָּׁה','עֶשְׂרִים וְשִׁבְעָה','עֶשְׂרִים וּשְׁמוֹנָה','עֶשְׂרִים וְתִשְׁעָה','שְׁלֹשִׁים',
  'שְׁלֹשִׁים וְאֶחָד','שְׁלֹשִׁים וּשְׁנַיִם','שְׁלֹשִׁים וּשְׁלֹשָׁה','שְׁלֹשִׁים וְאַרְבָּעָה','שְׁלֹשִׁים וַחֲמִשָּׁה','שְׁלֹשִׁים וְשִׁשָּׁה','שְׁלֹשִׁים וְשִׁבְעָה','שְׁלֹשִׁים וּשְׁמוֹנָה','שְׁלֹשִׁים וְתִשְׁעָה','אַרְבָּעִים',
  'אַרְבָּעִים וְאֶחָד','אַרְבָּעִים וּשְׁנַיִם','אַרְבָּעִים וּשְׁלֹשָׁה','אַרְבָּעִים וְאַרְבָּעָה','אַרְבָּעִים וַחֲמִשָּׁה','אַרְבָּעִים וְשִׁשָּׁה','אַרְבָּעִים וְשִׁבְעָה','אַרְבָּעִים וּשְׁמוֹנָה','אַרְבָּעִים וְתִשְׁעָה'];

for (let day = 1; day <= 49; day++) {
  const weekNum = Math.floor((day - 1) / 7);
  const dayInWeek = (day - 1) % 7;
  const sefira1 = sefirot[dayInWeek];
  const sefira2 = sefirot[weekNum];
  const sefira1En = sefirotEn[dayInWeek];
  const sefira2En = sefirotEn[weekNum];
  const weeks = Math.floor(day / 7);
  const remainDays = day % 7;

  let countText = "הַיּוֹם " + heNums[day - 1] + " יוֹם";
  if (weeks > 0 && remainDays === 0) {
    countText += ", שֶׁהֵם " + heNums[weeks - 1] + " שָׁבוּעוֹת";
  } else if (weeks > 0) {
    countText += ", שֶׁהֵם " + heNums[weeks - 1] + " שָׁבוּעוֹת וְ" + heNums[remainDays - 1] + " יָמִים";
  }
  countText += " לָעוֹמֶר.";

  const sefiraText = sefira1 + " שֶׁבְּ" + sefira2;

  children.push(hePar("יוֹם " + day + " — " + countText, { size: 22, bold: true, spacingAfter: 40 }));
  children.push(hePar(sefiraText + " — " + sefira1En + " of " + sefira2En, { size: 20, italic: true, spacingAfter: 120, indent: 360 }));
}

// ============================================================
// 11. CLOSING PAGE
// ============================================================

children.push(new Paragraph({ spacing: { before: 4000 }, children: [] }));

children.push(centeredPar('נ נח נחמ נחמן מאומן', { size: 56, bold: true, rtl: true, spacingAfter: 600 }));

children.push(centeredPar('חג כשר ושמח!', { size: 44, bold: true, rtl: true, spacingAfter: 400 }));

children.push(centeredPar('✦ ✦ ✦', { size: 28, spacingAfter: 600 }));

children.push(centeredPar('ajew.org', { size: 32, bold: true, spacingAfter: 200 }));

// ============================================================
// ASSEMBLE DOCUMENT — 7" x 10" (10080 x 14400 DXA), 1" margins
// ============================================================

console.log('\nBuilding document...');
console.log(`  Total paragraphs: ${children.length}`);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Times New Roman', size: 24 },
      },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 36, bold: true, font: 'Times New Roman' },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 10080, height: 14400 },  // 7" x 10"
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },  // 1" all around
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'הגדה של פסח — Na Nach',
                size: 18,
                font: 'Times New Roman',
                italics: true,
              }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '— ', size: 18, font: 'Times New Roman' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, font: 'Times New Roman' }),
              new TextRun({ text: ' —', size: 18, font: 'Times New Roman' }),
            ],
          }),
        ],
      }),
    },
    children,
  }],
});

// ============================================================
// WRITE FILE
// ============================================================

const outPath = 'C:/Users/Pettek/Downloads/Haggadah-Shel-Pesach-NaNach-v2.docx';

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`\nDONE! Saved to: ${outPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(0)} KB`);
  console.log(`Total paragraphs: ${children.length}`);
}).catch(err => {
  console.error('Error generating DOCX:', err);
  process.exit(1);
});
// This will be patched properly - just a marker
