/**
 * Parser for Toldos Adam (תולדות אדם)
 * Source: Markdown file from OCR with nikud and artifacts
 * Published by Maaleh Vigadish (הוצאת מלא וגדיש), free to share
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(require('os').homedir(), 'Downloads',
  'Toldos Adam - story of birth of Rabbainu and trip of Bal Shem Tov .md');
const OUT_DIR = path.join(__dirname, '..', 'public', 'reader', 'toldos-adam');

// Section definitions - use line numbers from the source file for reliable matching
// The OCR garbles the text too much for regex matching, so we match by line number
const SECTIONS = [
  { id: 1, line: 117, hebrewTitle: 'הקדמה לפתח הסיפור', title: 'Introduction' },
  { id: 2, line: 198, hebrewTitle: '"יש איזה איסטאנבול בעולם"', title: '"There is some Istanbul in the world"' },
  { id: 3, line: 578, hebrewTitle: 'צאצאי הבעש"ט', title: 'Descendants of the Baal Shem Tov' },
  { id: 4, line: 596, hebrewTitle: 'נסיעת הבעש"ט לארץ ישראל', title: "The Baal Shem Tov's Journey to Eretz Yisrael" },
  { id: 5, line: 646, hebrewTitle: 'הזוג חשוכי הבנים', title: 'The Childless Couple' },
  { id: 6, line: 754, hebrewTitle: 'נישואי רבי נחמן מהורדונקא', title: 'The Marriage of Rabbi Nachman of Horodenka' },
  { id: 7, line: 767, hebrewTitle: 'נס הפסח באיסטאנבול', title: 'The Pesach Miracle in Istanbul' },
  { id: 8, line: 882, hebrewTitle: 'מפגש אשת רבי נחמן מהורדונקא עם הבעש"ט', title: "Meeting with Rabbi Nachman of Horodenka's Wife" },
  { id: 9, line: 902, hebrewTitle: 'הבטחת הצדקת מרת אדיל לאביה', title: "Adel's Promise to Her Father" },
  { id: 10, line: 985, hebrewTitle: 'הנס באי הגזלנים', title: "The Miracle on the Pirates' Island" },
  { id: 11, line: 1036, hebrewTitle: 'שידוך הבעש"ט עם רבי נחמן מהורדונקא', title: 'The Shidduch of the Baal Shem Tov with Rabbi Nachman of Horodenka' },
  { id: 12, line: 1085, hebrewTitle: 'הולדת רבי שמחה בן נחמן מהורדונקא', title: 'The Birth of Rabbi Simcha ben Nachman of Horodenka' }
];

/**
 * Clean OCR artifacts from Hebrew text:
 * - Remove ** bold markers
 * - Remove extra spaces within words (but keep spaces between words)
 * - Remove stray isolated nikud/cantillation marks
 * - Remove page numbers on standalone lines
 * - Remove running headers "תולדות אדם |"
 */
function cleanText(text) {
  // Remove ** bold markers
  text = text.replace(/\*\*/g, '');

  // Remove running headers like "תוֹ לְ דוֹ ת אָ דָ ם |" and variations
  // These appear with OCR spacing artifacts
  text = text.replace(/ּ?\s*תוֹ\s*לְ\s*דוֹ\s*ת\s*אָ\s*דָ\s*ם\s*\|[^\n]*/g, '');
  text = text.replace(/\|\s*תוֹ\s*לְ\s*דוֹ\s*ת\s*אָ\s*דָ\s*ם\s*ּ?/g, '');

  // Remove page numbers (standalone digits, possibly with Hebrew page markers)
  text = text.replace(/^\s*\d{1,3}\s*$/gm, '');

  // Remove "1100x150" image dimension markers
  text = text.replace(/^\s*\d+x\d+\s*$/gm, '');

  // Now handle the OCR spacing issue:
  // The OCR inserts spaces between letters and their nikud marks.
  // Strategy: remove spaces that are between Hebrew characters/nikud marks.
  // A Hebrew letter followed by space(s) followed by nikud or another Hebrew letter
  // should have those spaces removed.

  // Hebrew Unicode ranges:
  // \u0590-\u05FF - Hebrew block (letters + nikud + cantillation)
  // \uFB1D-\uFB4F - Hebrew presentation forms

  // Remove spaces between Hebrew characters and nikud/letters
  // Do multiple passes since fixing one gap may reveal another
  for (let i = 0; i < 10; i++) {
    const before = text;
    // Space between a Hebrew char and a nikud mark
    text = text.replace(/([\u0590-\u05FF\uFB1D-\uFB4F]) +([\u0591-\u05BD\u05BF-\u05C7])/g, '$1$2');
    // Space between a nikud mark and a Hebrew letter
    text = text.replace(/([\u0591-\u05BD\u05BF-\u05C7]) +([\u05D0-\u05EA\uFB1D-\uFB4F])/g, '$1$2');
    // Space between two Hebrew letters where the second has nikud following
    // (this catches "ה ק" -> "הק" when ק is followed by nikud)
    text = text.replace(/([\u05D0-\u05EA\uFB1D-\uFB4F][\u0591-\u05C7]*) +([\u05D0-\u05EA\uFB1D-\uFB4F][\u0591-\u05C7]+)/g, '$1$2');
    // Two Hebrew letters separated by a single space where at least one has nikud
    text = text.replace(/([\u05D0-\u05EA\uFB1D-\uFB4F][\u0591-\u05C7]+) +([\u05D0-\u05EA\uFB1D-\uFB4F])/g, '$1$2');
    if (text === before) break;
  }

  // Remove isolated nikud marks (not attached to any letter) - stray marks on their own
  text = text.replace(/(^|[\s\n]) *([\u0591-\u05C7])+ *($|[\s\n])/gm, '$1$3');

  // Clean up multiple spaces
  text = text.replace(/ {2,}/g, ' ');

  // Clean up multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Build a set of section start line numbers (1-indexed) for quick lookup
 */
const sectionLineMap = new Map();
for (const sec of SECTIONS) {
  sectionLineMap.set(sec.line, sec);
}

/**
 * Check if a line is a running header (page header) - these should be skipped
 */
function isRunningHeader(line) {
  const stripped = line.replace(/\*\*/g, '').trim();
  // Running headers contain "תולדות אדם |" pattern
  if (/תוֹ\s*לְ\s*דוֹ\s*ת\s*אָ\s*דָ\s*ם\s*\|/.test(stripped)) return true;
  if (/\|\s*תוֹ\s*לְ\s*דוֹ\s*ת\s*אָ\s*דָ\s*ם/.test(stripped)) return true;
  return false;
}

/**
 * Check if a line is front matter (title page, dedication, TOC, publisher info etc.)
 */
function isFrontMatter(line) {
  const stripped = line.replace(/\*\*/g, '').trim();
  // Publisher info
  if (/הוצָאַת|מָלֵא\s*וְגָדִיש|עמותת|052-|058-|051-/.test(stripped)) return true;
  // "הודעה ובקשה" notice
  if (/הודעה\s*ובקשה/.test(stripped)) return true;
  // Table of contents header
  if (/תֹכֶן\s*הָעִנְיָנִים/.test(stripped)) return true;
  // Na Nach mantra on its own
  if (/^\s*[\*\s]*נַ\s*נַחְ\s*נַחְ\s*מָ\s*נַחְ\s*מָ\s*ן/.test(stripped)) return true;
  // "זֶה סֵפֶר" title page
  if (/^[\s\u0590-\u05FF]*זֶה\s*סֵ\s*פֶר[\s\u0590-\u05FF]*$/.test(stripped) && stripped.length < 40) return true;
  return false;
}

function main() {
  console.log('=== Parsing Toldos Adam ===');

  // Read source
  const raw = fs.readFileSync(SOURCE, 'utf8');
  const lines = raw.split('\n');
  console.log(`Source: ${lines.length} lines`);

  // Phase 1: Split into sections by line numbers
  const sections = [];
  let currentSection = null;
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1; // 1-indexed
    const line = lines[i];

    // Check if this line starts a new section
    const section = sectionLineMap.get(lineNum);
    if (section) {
      // Save previous section
      if (currentSection) {
        sections.push({ ...currentSection, rawLines: currentLines });
      }
      currentSection = section;
      currentLines = [];
      continue; // skip the header line itself
    }

    // Skip lines before first section
    if (!currentSection) continue;

    // Skip running headers (page headers with "תולדות אדם |")
    if (line.startsWith('**') && isRunningHeader(line)) {
      continue;
    }

    currentLines.push(line);
  }

  // Save last section
  if (currentSection) {
    sections.push({ ...currentSection, rawLines: currentLines });
  }

  console.log(`Found ${sections.length} sections`);
  for (const s of sections) {
    console.log(`  Section ${s.id}: ${s.hebrewTitle} (${s.rawLines.length} raw lines)`);
  }

  // Phase 2: Process each section into segments
  // Create output directory
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const indexTorahs = [];

  for (const section of sections) {
    // Join all lines, clean, then split into paragraphs
    const rawText = section.rawLines.join('\n');
    const cleaned = cleanText(rawText);

    // Split into paragraphs (non-empty lines or groups of lines)
    const paragraphs = cleaned.split(/\n\n+/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => {
        // Filter out empty/whitespace-only paragraphs
        if (!p || p.length < 3) return false;
        // Filter out standalone page numbers
        if (/^\d{1,3}$/.test(p)) return false;
        // Filter out lines that are just nikud or punctuation
        if (!/[\u05D0-\u05EA]/.test(p)) return false;
        return true;
      });

    if (paragraphs.length === 0) {
      console.log(`  WARNING: Section ${section.id} has no content after cleaning!`);
      continue;
    }

    const segments = paragraphs.map((text, idx) => ({
      index: idx + 1,
      he: text
    }));

    const totalSections = sections.length;
    const prevUrl = section.id > 1 ? `/reader/toldos-adam/1/${section.id - 1}` : null;
    const nextUrl = section.id < totalSections ? `/reader/toldos-adam/1/${section.id + 1}` : null;

    const torahData = {
      id: `ta-${section.id}`,
      book: 'toldos-adam',
      part: 1,
      torah: section.id,
      displayNumber: section.id,
      title: `${section.hebrewTitle} - ${section.title}`,
      hebrewTitle: section.hebrewTitle,
      englishTitle: section.title,
      segments: segments,
      navigation: {
        prevUrl: prevUrl,
        nextUrl: nextUrl
      },
      attribution: 'Published by Maaleh Vigadish (הוצאת מלא וגדיש) - Free to share'
    };

    const outFile = path.join(OUT_DIR, `section-${section.id}.json`);
    fs.writeFileSync(outFile, JSON.stringify(torahData, null, 2), 'utf8');
    console.log(`  Wrote section-${section.id}.json (${segments.length} segments)`);

    indexTorahs.push({
      number: section.id,
      displayNumber: section.id,
      title: `${section.hebrewTitle} - ${section.title}`,
      hebrewTitle: section.hebrewTitle,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: false,
      url: `/reader/toldos-adam/1/${section.id}`
    });
  }

  // Write index.json
  const indexData = {
    book: 'toldos-adam',
    part: 1,
    title: 'Toldos Adam - History of the Birth of Rabbeinu',
    hebrewTitle: 'תולדות אדם',
    author: 'Unknown (compiled)',
    hebrewAuthor: 'הוצאת מלא וגדיש',
    totalTorahs: indexTorahs.length,
    torahs: indexTorahs
  };

  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');
  console.log(`\nWrote index.json with ${indexTorahs.length} sections`);

  // Summary
  const totalSegments = indexTorahs.reduce((sum, t) => sum + t.paragraphs, 0);
  console.log(`\n=== Summary ===`);
  console.log(`Sections: ${indexTorahs.length}`);
  console.log(`Total segments: ${totalSegments}`);
  console.log(`Output: ${OUT_DIR}`);
}

main();
