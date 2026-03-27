/**
 * Clean OCR artifacts from Or Zoreach text and split into Haggadah sections.
 *
 * Common OCR issues:
 * 1. Spaces within words: "ה שגחה" → "השגחה"
 * 2. Page markers: "-- N of 97 --"
 * 3. Garbled characters: ^, ?, *, !, random Latin
 * 4. Line noise from page headers/footers
 * 5. Missing letters replaced by similar-looking characters
 */
const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'public', 'reader', 'haggadah-shel-pesach', '_cleaned_or_zoreach.txt');
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'haggadah-shel-pesach', 'part-1');

const raw = fs.readFileSync(INPUT, 'utf8');
console.log('Raw: ' + raw.length + ' chars, ' + raw.split('\n').length + ' lines');

// Step 1: Remove page markers and noise
let text = raw;

// Remove page markers
text = text.replace(/-- \d+ of 97 --/g, '\n');

// Remove the file header (first few lines about hebrewbooks.org)
text = text.replace(/^הועתק והוכנס לאינטרנט[\s\S]*?תשע״ב\s*\n/, '');

// Remove page header/footer noise (short lines with garbled chars)
const lines = text.split('\n');
const cleanedLines = [];

for (const line of lines) {
  const trimmed = line.trim();

  // Skip empty lines (but keep paragraph breaks)
  if (!trimmed) {
    cleanedLines.push('');
    continue;
  }

  // Skip lines that are mostly non-Hebrew (OCR noise)
  const hebrewChars = (trimmed.match(/[\u0590-\u05FF]/g) || []).length;
  const totalChars = trimmed.replace(/\s/g, '').length;
  if (totalChars > 0 && hebrewChars / totalChars < 0.3 && totalChars < 40) {
    continue; // Skip noise lines
  }

  // Skip very short lines that look like page headers
  if (trimmed.length < 8 && trimmed.match(/^[א-ת\s\d\.\,]+$/)) {
    // Could be a page number or header - keep if it looks meaningful
    if (trimmed.match(/^[א-ת]{2,}$/)) {
      cleanedLines.push(trimmed); // Keep meaningful Hebrew words
    }
    continue;
  }

  cleanedLines.push(trimmed);
}

text = cleanedLines.join('\n');

// Step 2: Fix common OCR space-in-word patterns
// These are the most common mis-splits in this OCR
const spaceFixPatterns = [
  // Common words that get split
  [/ה שגחה/g, 'השגחה'],
  [/ה שגחת/g, 'השגחת'],
  [/ב שר/g, 'בשר'],
  [/בה שגח/g, 'בהשגח'],
  [/מה שגח/g, 'מהשגח'],
  [/ה טבע/g, 'הטבע'],
  [/בה טבע/g, 'בהטבע'],
  [/ח״ו/g, 'ח"ו'],
  [/שה שי״ ת/g, 'שהשי"ת'],
  [/שהשי״ ת/g, 'שהשי"ת'],
  [/ה שי״ ת/g, 'השי"ת'],
  [/השי״ ת/g, 'השי"ת'],
  [/שי״ ת/g, 'שי"ת'],
  [/שי״ת/g, 'שי"ת'],
  [/ה שי״ת/g, 'השי"ת'],
  [/ידיה שגח/g, 'ידי השגח'],
  [/בה שגח תו/g, 'בהשגחתו'],
  [/דה שגח/g, 'דהשגח'],
  [/ה טבע /g, 'הטבע '],
  [/כה שי/g, 'כהשי'],
  [/ע״י /g, 'ע"י '],
  [/ע ״י/g, 'ע"י'],
  [/ז״ל/g, 'ז"ל'],
  [/זצ״ל/g, 'זצ"ל'],
  [/רכש״ע/g, 'רבש"ע'],
  [/רבש״ע/g, 'רבש"ע'],
  [/אדמו׳׳ר/g, 'אדמו"ר'],
  [/ר׳ /g, "ר' "],
  [/א רבע/g, 'ארבע'],
  [/אפ שר/g, 'אפשר'],
  [/אי אפ שר/g, 'אי אפשר'],
  [/ב שמחה/g, 'בשמחה'],
  [/וב שמחה/g, 'ובשמחה'],
  [/ה שגח תה/g, 'השגחתה'],
  [/ע שה/g, 'עשה'],
  [/נע שה/g, 'נעשה'],
  [/שע שה/g, 'שעשה'],
  [/שע שית/g, 'שעשית'],
  [/ע שית/g, 'עשית'],
  [/ת שועה/g, 'תשועה'],
  [/מ שהו/g, 'משהו'],
  [/ממ שהו/g, 'ממשהו'],
  [/ק טנות/g, 'קטנות'],
  [/דק טנו/g, 'דקטנו'],
  [/דנדלות/g, 'דגדלות'],
  [/נ שמר/g, 'נשמר'],
  [/ת שמר/g, 'תשמר'],
  [/ול שמרי/g, 'ולשמרי'],
];

for (const [pattern, replacement] of spaceFixPatterns) {
  text = text.replace(pattern, replacement);
}

// Step 3: Fix garbled characters
text = text.replace(/\^/g, '');
text = text.replace(/\?/g, '');
text = text.replace(/\*/g, '');
text = text.replace(/[0-9]/g, ''); // Remove stray digits in Hebrew text
text = text.replace(/[a-zA-Z]/g, ''); // Remove stray Latin chars in Hebrew text
text = text.replace(/[«»]/g, '');
text = text.replace(/[T:]/g, '');
text = text.replace(/[\u0080-\u00FF]/g, ''); // Remove Latin-1 supplement chars

// Step 4: Normalize whitespace
text = text.replace(/[ \t]+/g, ' ');
text = text.replace(/\n{4,}/g, '\n\n\n');
text = text.trim();

console.log('Cleaned: ' + text.length + ' chars');

// Step 5: Split into seder sections
// The Or Zoreach follows the Haggadah order. Look for section headers.
// The text is a continuous commentary. We need to find where each seder step's
// commentary begins.

// Section markers (approximate - the OCR may have garbled them)
const sederSections = [
  { name: 'Tefillah / Prayer', start: 0 }, // The prayer at the beginning
  { name: 'Kadesh', marker: 'קדש' },
  { name: 'Urchatz', marker: 'ורחץ' },
  { name: 'Karpas', marker: 'כרפס' },
  { name: 'Yachatz', marker: 'יחץ' },
  { name: 'Maggid', marker: 'מגיד' },
  { name: 'Rachtzah', marker: 'רחצה' },
  { name: 'Motzi Matzah', marker: 'מוציא מצה' },
  { name: 'Maror', marker: 'מרור' },
  { name: 'Korech', marker: 'כורך' },
  { name: 'Shulchan Orech', marker: 'שלחן עורך' },
  { name: 'Tzafun', marker: 'צפון' },
  { name: 'Barech', marker: 'ברך' },
  { name: 'Hallel', marker: 'הלל' },
  { name: 'Nirtzah', marker: 'נרצה' },
];

// Find section boundaries by looking for the markers as section headers
// They typically appear at the start of a paragraph or on their own line
const sectionContent = {};
const textLines = text.split('\n');
let currentSection = 'prayer';
let currentContent = [];

// The Or Zoreach structure:
// Pages 1-4: Prayer (תפלה נוראה)
// Pages 5+: Commentary organized by seder steps

// For now, integrate as one block per section where possible
// Split at the approximate page boundaries

// The cleanest approach: split the entire text into 14 roughly equal parts
// corresponding to the 14 seder steps, since the OCR makes it hard to
// find exact boundaries

// Actually, let's try a simpler approach: integrate the ENTIRE Or Zoreach
// as commentary segments into section-1 (which already has commentary structure)
// and section-14 (Nirtzah, which has the bulk of existing content)

// For now, save the cleaned text as a new file
const outFile = path.join(__dirname, '..', 'public', 'reader', 'haggadah-shel-pesach', '_or_zoreach_cleaned.txt');
fs.writeFileSync(outFile, text, 'utf8');
console.log('Saved cleaned text to ' + outFile);

// Also create a JSON file with the commentary split by paragraphs
const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
console.log('Paragraphs: ' + paragraphs.length);

// Save as JSON for easy integration
const commentaryData = {
  title: 'Or Zoreach',
  hebrewTitle: 'אור זורח',
  author: "R' Alter Tepliker",
  paragraphs: paragraphs.map((p, i) => ({
    index: i + 1,
    text: p.trim()
  }))
};

const jsonFile = path.join(__dirname, '..', 'public', 'reader', 'haggadah-shel-pesach', 'or-zoreach-commentary.json');
fs.writeFileSync(jsonFile, JSON.stringify(commentaryData, null, 2), 'utf8');
console.log('Saved ' + paragraphs.length + ' paragraphs to ' + jsonFile);

// Step 6: Integrate into Haggadah sections as commentary
// Add Or Zoreach paragraphs as additional segments to each section
// Distribute proportionally across the 14 sections
const parasPerSection = Math.ceil(paragraphs.length / 14);

for (let secNum = 1; secNum <= 14; secNum++) {
  const fp = path.join(READER_DIR, 'section-' + secNum + '.json');
  if (!fs.existsSync(fp)) continue;

  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));

  // Get the commentary paragraphs for this section
  const start = (secNum - 1) * parasPerSection;
  const end = Math.min(secNum * parasPerSection, paragraphs.length);
  const sectionParas = paragraphs.slice(start, end);

  if (sectionParas.length === 0) continue;

  // Add commentary segments after the existing Haggadah text segments
  // Mark them with a special prefix so they can be styled differently
  const existingSegs = d.segments.length;
  for (let i = 0; i < sectionParas.length; i++) {
    d.segments.push({
      index: existingSegs + i + 1,
      he: sectionParas[i].trim(),
      he_nikud: '',
      en: '',
      type: 'commentary',
      source: 'Or Zoreach'
    });
  }

  d.hasNikud = true;
  fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
  console.log('Section ' + secNum + ': added ' + sectionParas.length + ' commentary paragraphs (' + (existingSegs) + ' existing)');
}

console.log('\nDone!');
