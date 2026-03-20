const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'library-catalog.json'), 'utf8'));

// Categories with Hebrew names, icons, and descriptions
const categoryDefs = {
  'likutay-moharan': {
    name: 'ליקוטי מוהר"ן',
    nameEn: 'Likutay Moharan',
    author: 'רבינו נחמן מברסלב',
    authorEn: "Rebbe Nachman of Breslov",
    icon: '📖',
    desc: 'The core teachings of Rebbe Nachman',
    order: 1
  },
  'sefer-hamidos': {
    name: 'ספר המדות',
    nameEn: 'Sefer HaMidos',
    author: 'רבינו נחמן מברסלב',
    authorEn: "Rebbe Nachman",
    icon: '📜',
    desc: 'The Book of Attributes',
    order: 2
  },
  'sipurey-maasiyos': {
    name: 'סיפורי מעשיות',
    nameEn: 'Sipurey Maasiyos',
    author: 'רבינו נחמן מברסלב',
    authorEn: "Rebbe Nachman",
    icon: '📕',
    desc: 'The tales of Rebbe Nachman',
    order: 3
  },
  'likutay-halachos': {
    name: 'ליקוטי הלכות',
    nameEn: 'Likutay Halachos',
    author: "ר' נתן מברסלב",
    authorEn: "R' Nosson of Breslov",
    icon: '⚖️',
    desc: 'Laws illuminated with Breslov teachings',
    order: 4
  },
  'likutay-tefilos': {
    name: 'ליקוטי תפילות',
    nameEn: 'Likutay Tefilos',
    author: "ר' נתן מברסלב",
    authorEn: "R' Nosson of Breslov",
    icon: '🙏',
    desc: 'Prayers based on the teachings',
    order: 5
  },
  'likutay-eitzos': {
    name: 'ליקוטי עצות',
    nameEn: 'Likutay Eitzos',
    author: "ר' נתן מברסלב",
    authorEn: "R' Nosson of Breslov",
    icon: '💡',
    desc: 'Practical advice from the teachings',
    order: 6
  },
  'chayey-moharan': {
    name: 'חיי מוהר"ן',
    nameEn: 'Chayey Moharan',
    author: "ר' נתן מברסלב",
    authorEn: "R' Nosson of Breslov",
    icon: '👤',
    desc: 'The life of Rebbe Nachman',
    order: 7
  },
  'shivchay-sichos': {
    name: 'שבחי ושיחות הר"ן',
    nameEn: "Shivchay & Sichos HaRan",
    author: "ר' נתן מברסלב",
    authorEn: "R' Nosson of Breslov",
    icon: '🗣️',
    desc: 'Praises and conversations of Rebbe Nachman',
    order: 8
  },
  'yemei-moharnat': {
    name: 'ימי מוהרנ"ת',
    nameEn: 'Yemei Moharnat',
    author: "ר' נתן מברסלב",
    authorEn: "R' Nosson of Breslov",
    icon: '📅',
    desc: 'Days and travels of R\' Nosson',
    order: 9
  },
  'alim-litrufa': {
    name: 'עלים לתרופה',
    nameEn: 'Alim LiTrufa',
    author: "ר' נתן מברסלב",
    authorEn: "R' Nosson of Breslov",
    icon: '💌',
    desc: 'Letters of R\' Nosson',
    order: 10
  },
  'otzar-hayirah': {
    name: 'אוצר היראה',
    nameEn: 'Otzar HaYirah',
    author: "ר' נתן / מלוקט",
    authorEn: "Compiled",
    icon: '📚',
    desc: 'Treasury of awe - organized by topic',
    order: 11
  },
  'siach-sarfei-kodesh': {
    name: 'שיח שרפי קודש',
    nameEn: 'Siach Sarfei Kodesh',
    author: "ר' לוי יצחק בנדר",
    authorEn: "R' Levi Yitzchak Bender",
    icon: '🔥',
    desc: 'Holy conversations from the Breslov elders',
    order: 12
  },
  'parparos-commentary': {
    name: 'פרפראות לחכמה ופירושים',
    nameEn: 'Commentaries',
    author: 'טשערין / ר\' אברהם',
    authorEn: "Tcheryn / R' Avraham",
    icon: '🔍',
    desc: 'Commentaries on Likutay Moharan',
    order: 13
  },
  'kokhvei-or': {
    name: 'כוכבי אור',
    nameEn: 'Kokhvei Or',
    author: "ר' אברהם ב\"ר נחמן",
    authorEn: "R' Avraham b'R Nachman",
    icon: '⭐',
    desc: 'Stars of light',
    order: 14
  },
  'ebay-hanachal': {
    name: 'אבי הנחל / הפתק',
    nameEn: 'Ebay HaNachal / The Petek',
    author: "ר' ישראל דב אודסר (סבא)",
    authorEn: "Saba - R' Yisroel Ber Odesser",
    icon: '✉️',
    desc: 'Letters of Saba and the Holy Petek',
    order: 15
  },
  'tikkun-tefila': {
    name: 'תיקונים ותפילות',
    nameEn: 'Tikkunim & Prayers',
    author: 'שונות',
    authorEn: 'Various',
    icon: '🕯️',
    desc: 'Tikkun HaKlali, Chatzos, Sidurim & more',
    order: 16
  },
  'letters-manuscripts': {
    name: 'מכתבים וכתבי יד',
    nameEn: 'Letters & Manuscripts',
    author: 'שונות',
    authorEn: 'Various',
    icon: '✍️',
    desc: 'Original letters and handwritten manuscripts',
    order: 17
  },
  'biography-history': {
    name: 'תולדות והיסטוריה',
    nameEn: 'Biography & History',
    author: 'שונות',
    authorEn: 'Various',
    icon: '🏛️',
    desc: 'Biographies, history, and genealogy',
    order: 18
  },
  'hashtatfchus-meshivas': {
    name: 'השתפכות הנפש / משיבת נפש',
    nameEn: 'Outpouring & Restoring the Soul',
    author: "ר' אלתר טפליקער",
    authorEn: "R' Alter Tepliker",
    icon: '💧',
    desc: 'Guides to hitbodedut and encouragement',
    order: 19
  },
  'pamphlets': {
    name: 'קונטרסים וחוברות',
    nameEn: 'Pamphlets & Booklets',
    author: 'שונות',
    authorEn: 'Various',
    icon: '📋',
    desc: 'Small publications, pamphlets, and special editions',
    order: 20
  },
  'miscellaneous': {
    name: 'ספרים שונים',
    nameEn: 'Other Books',
    author: 'שונות',
    authorEn: 'Various',
    icon: '📚',
    desc: 'Additional Breslov and related works',
    order: 21
  }
};

// Classification rules - order matters, first match wins
const rules = [
  // Likutay Moharan
  { p: /ליקוטי מוהר|ליקוטי_מוהר|לקוטי מוהר|ליקוטי מוהרן|ליקו''מ|לִקּוּטֵי אֶבֶן|קיצור.*ליקו.*מ|קיצור_ליקו|קצור לקוטי מוהר|נעימות נצח|ליקוטי אבן/, cat: 'likutay-moharan' },
  // Sefer HaMidos
  { p: /ספר.*המדות|ספר_המדות|הנהגות ישרות|ספר המידות|ספר_המידות/, cat: 'sefer-hamidos' },
  // Sipurey Maasiyos
  { p: /סיפורי מעשיות|סיפורי_מעשיות|סיפורים נפלאים|אור המעשיות|Maasiot/, cat: 'sipurey-maasiyos' },
  // Otzar HaYirah - before LH/LE
  { p: /אוצר.*היראה|אוצר_היראה|אוצר נחמני/, cat: 'otzar-hayirah' },
  // Likutay Halachos
  { p: /ליקוטי הלכות|לקוטי.*הלכות|קיצור ליקוטי הלכות|השלמות קיצור|מפתחות לליקוטי הלכות|קיצור_ליקוטי_הלכות/, cat: 'likutay-halachos' },
  // Likutay Eitzos
  { p: /ליקוטי עצות|ליקוטי_עצות|לקוטי.*עצות|עצות המבוארות|העצות המבוארות/, cat: 'likutay-eitzos' },
  // Likutay Tefilos
  { p: /ליקוטי.*תפילות|ליקוטי_תפילות|לקוטי תפילות|LikuteyTefilot|hebrew-likutay-tefilos/, cat: 'likutay-tefilos' },
  // Alim LiTrufa
  { p: /עלים לתרופה|עלים_לתרופה/, cat: 'alim-litrufa' },
  // Chayey Moharan - before Shivchay
  { p: /חיי מוהר|חיי_מוהר|השמטות.*חיי|השמטות_חיי|חיי מוהרן|קונטרס ההוספות.*חיי|הוספות לחיי/, cat: 'chayey-moharan' },
  // Shivchay + Sichos HaRan together
  { p: /שבחי.*הר|שבחי_הר|שיחות.*הר[''"]ן|שיחות_הר|שיחות הרן|מפתחות שיחות/, cat: 'shivchay-sichos' },
  // Yemei Moharnat
  { p: /ימי מוהרנ|ימי_מוהרנ|ימי התלאות|באש ובמים/, cat: 'yemei-moharnat' },
  // Siach Sarfei Kodesh
  { p: /שיח.*שרפי|שיח_שרפי/, cat: 'siach-sarfei-kodesh' },
  // Ebay HaNachal / Petek / Saba
  { p: /אב.*הנחל|אבי_הנחל|אבי הנחל|פתק|petek|חלוקי הנחל|משלי הנחל|MishleyHanachal|שיחות מתוך חיי סבא|ספור ההתקרבות|סיפור_ההתקרבות|סיפור ההתקרבות|הקלטות.*אודעסר|אמונת אומן|פתקא טבא|ר'.*אודסר|אודעסר/, cat: 'ebay-hanachal' },
  // Parparos & Commentaries
  { p: /פרפראות|ביאור.*הליקוטים|ביאור_הליקוטים|מכניע זדים|והלכתא.*כנחמני/, cat: 'parparos-commentary' },
  // Kokhvei Or
  { p: /כוכבי אור|כוכבי_אור/, cat: 'kokhvei-or' },
  // Hashtatfchus / Meshivas Nefesh
  { p: /השתפכות|משיבת נפש|משיבת_נפש|התעוררות להתבודדות|Hitkashrut/, cat: 'hashtatfchus-meshivas' },
  // Tikkun & Prayers
  { p: /תיקון.*הכללי|תיקון_הכללי|Tikun.*aklali|TikunHaklali|תיקון חצות|תיקוני הרב|סדר תיקון|סידור|TfilaMikve|סדר ברכת|סדר יום כפור|ספר שערי ציון|שערי_ציון|תפילה.*יום|תפילה.*לזכות|תפילה.*לפסח|תפילת רשב|תפלה.*ר'.*יצחק|תפילות ותחנונים|תפילות_ותחנונים|ליל הסדר|קיצור הח.*י כללים|חי כללים|Pesach|RH_|Zachor|סדר היום/, cat: 'tikkun-tefila' },
  // Letters & Manuscripts
  { p: /מכתב|גלויות|כתב.*יד|כתבי ר|מכתבי/, cat: 'letters-manuscripts' },
  // Biographies
  { p: /יעלת חן|קנאת.*ה'|קנאת_ה|ארצנו|רבי.*נחמן.*חייו|ר'.*ישראל.*קרדונר|ר'.*אייזיק|רבי ישראל קורדונר|kardoner|Rabenu|ימי שמואל|שארית יצחק|נסיעת.*הר.*ן|פגישת.*מוהר|אוסף ר שמואל|קונטרס_צאצאי|צאצאי.*ונכדי|אבניה.*ברזל|ח_י_תשרי|להודיע|להיות אצלי|ראשית השנה|הראש השנה שלו/, cat: 'biography-history' },
  // Pamphlets (קונטרסים)
  { p: /קונטרס|חוברת|TzefurimTikun/, cat: 'pamphlets' },
];

// Classify each file
const categorized = {};
for (const cat of Object.keys(categoryDefs)) {
  categorized[cat] = [];
}

let unmatched = 0;
for (const file of catalog) {
  let matched = false;
  const name = file.name;
  for (const rule of rules) {
    if (rule.p.test(name)) {
      categorized[rule.cat].push(file);
      matched = true;
      break;
    }
  }
  if (!matched) {
    categorized['miscellaneous'].push(file);
    unmatched++;
  }
}

// Sort each category by size (largest first for prominence)
for (const cat of Object.keys(categorized)) {
  categorized[cat].sort((a, b) => b.sizeMB - a.sizeMB);
}

// Build output
const output = {
  generated: new Date().toISOString(),
  totalFiles: catalog.length,
  totalSizeMB: Math.round(catalog.reduce((s, f) => s + f.sizeMB, 0)),
  categories: Object.entries(categoryDefs)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([id, def]) => ({
      id,
      ...def,
      fileCount: categorized[id].length,
      totalSizeMB: Math.round(categorized[id].reduce((s, f) => s + f.sizeMB, 0)),
      files: categorized[id]
    }))
    .filter(c => c.fileCount > 0) // remove empty categories
};

fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'library-catalog-categorized.json'),
  JSON.stringify(output, null, 2),
  'utf8'
);

// Print summary
console.log(`\nCategorized ${catalog.length} files into ${output.categories.length} categories\n`);
for (const cat of output.categories) {
  console.log(`${cat.icon} ${cat.name} (${cat.nameEn}): ${cat.fileCount} files, ${cat.totalSizeMB} MB`);
}
console.log(`\nUnmatched (miscellaneous): ${unmatched}`);

// List miscellaneous for review
if (unmatched > 0) {
  console.log('\nMiscellaneous files:');
  for (const f of categorized['miscellaneous']) {
    console.log(`  - ${f.name} (${f.sizeMB} MB)`);
  }
}
