#!/usr/bin/env node
/**
 * Extract all 14 teachings from the Behar docx file.
 * Each teaching has: verse ref, Hebrew text, source ref (LH).
 * We match each to its LH source to get corrected Hebrew + English.
 */
const fs = require('fs');
const path = require('path');

const LH_DIR = path.join(__dirname, '..', 'public', 'reader', 'likutay-halachos');

function getLhTorah(partNum, torahNum) {
  const f = path.join(LH_DIR, `part-${partNum}`, `torah-${torahNum}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  return null;
}

function findLetterContent(torahData, letter) {
  if (!torahData) return null;
  const segments = torahData.segments || [];
  let foundHe = '', foundEn = '';
  let capturing = false;
  
  for (const seg of segments) {
    const he = (seg.he || '').trim();
    const en = (seg.en || '').trim();
    
    if (he.startsWith(`אות ${letter}`) || he.includes(`אות ${letter} `)) {
      capturing = true;
      foundHe = he;
      foundEn = en;
      continue;
    }
    
    if (capturing && /^אות [א-ת]/.test(he) && !he.startsWith(`אות ${letter}`)) {
      break;
    }
    
    if (capturing && he) {
      foundHe += '\n' + he;
      foundEn += '\n' + en;
    }
  }
  
  return foundHe ? { he: foundHe, en: foundEn } : null;
}

// All 14 teachings with their verse refs and LH sources
const teachings = [
  { verse: 'כ"ה ה', 'verseText': 'שנת שבתון יהיה לארץ', source: 'פריקה וטעינה ד - אות ו', part: 8, torah: 15, letter: 'ז' },
  { verse: 'כ"ה ו', 'verseText': 'והיתה שבת הארץ', source: 'שכירות פועלים ב - אות ה', part: 8, torah: 48, letter: 'ה' },
  { verse: 'כ"ה יד', 'verseText': 'כי תמכרו ממכר לעמיתך', source: 'בית הכנסת ו - אות כד', part: 1, torah: 55, letter: 'כד' },
  { verse: 'כ"ה יד', 'verseText': 'אל תונו איש את אחיו', source: 'שלוחין ה - אות לט', part: 7, torah: 81, letter: 'לט' },
  { verse: 'כ"ה יד', 'verseText': 'כל העסקים והמלאכות', source: 'בית הכנסת ו - אות כד', part: 1, torah: 55, letter: 'כה' },
  { verse: 'כ"ה כג', 'verseText': 'והארץ לא תמכר לצמתת', source: 'גביעת חוב מלקוחות א', part: 8, torah: 33, letter: 'א' },
  { verse: 'כ"ה כה', 'verseText': 'הארין היא בחינת אמונה', source: 'חזקת קרקעות ב - אות נ', part: 7, torah: 51, letter: 'נ' },
  { verse: 'כ"ה לה', 'verseText': 'וכי ימוך אחיך', source: 'פסח ו - אות יב', part: 3, torah: 27, letter: 'יב' },
  { verse: 'כ"ה לז', 'verseText': 'את כספך לא תתן לו בנשך', source: 'רבית א - אות מג', part: 4, torah: 73, letter: 'מג' },
  { verse: 'כ"ה לז', 'verseText': 'את כספך לא תתן לו בנשך', source: 'אפותיקי ב - אות ב', part: 8, torah: 48, letter: 'ב' },
  { verse: 'כ"ה לז', 'verseText': 'עבודה זרה נקראת חובה', source: 'רבית א - אות מד', part: 4, torah: 73, letter: 'מד' },
  { verse: 'כ"ה מג', 'verseText': 'לא תרדה בו בפרך', source: 'בית הכנסת א - אות יח', part: 1, torah: 50, letter: 'יח' },
  { verse: 'כ"ה מו', 'verseText': 'והתנחלתם אתם לבניכם', source: 'בית הכנסת א - אות יח', part: 1, torah: 50, letter: 'יח' },
  { verse: 'כ"ה נה', 'verseText': 'כי לי בני ישראל עבדים', source: 'בית הכנסת א - אות יט', part: 1, torah: 50, letter: 'יט' },
];

// Extract from LH sources
const results = [];
for (const t of teachings) {
  const torahData = getLhTorah(t.part, t.torah);
  const content = findLetterContent(torahData, t.letter);
  
  if (content) {
    results.push({
      verse: t.verse,
      verseText: t.verseText,
      source: t.source,
      he: content.he,
      en: content.en
    });
    console.log(`✓ ${t.verse} - ${t.source}`);
  } else {
    console.log(`✗ ${t.verse} - ${t.source} (Part ${t.part} Torah ${t.torah} Letter ${t.letter})`);
    if (torahData) {
      console.log(`  Title: ${torahData.hebrewTitle || torahData.title}`);
      console.log(`  Segments: ${(torahData.segments || []).length}`);
    }
  }
}

console.log(`\nFound ${results.length}/${teachings.length}`);

fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'data', 'behar-teachings.json'),
  JSON.stringify(results, null, 2)
);
console.log('Saved to public/data/behar-teachings.json');
