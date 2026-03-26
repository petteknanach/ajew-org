/**
 * Build Haggadah shel Pesach - Na Nach Breslov Edition
 *
 * Parses three sources:
 * 1. Standard Haggadah (Hebrew with nikud) from Word doc
 * 2. Or Zoreach commentary (R' Alter Tepliker) from PDF
 * 3. Chumash with Likutay Halachos - Pesach from PDF
 *
 * Outputs JSON files to public/reader/haggadah-shel-pesach/
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'public', 'reader', 'haggadah-shel-pesach');

// ============================================================
// SEDER SECTIONS - the canonical order
// ============================================================
const SEDER_SECTIONS = [
  { id: 'kadesh',         heTitle: 'קַדֵּשׁ',               enTitle: 'Kadesh',           desc: 'Recite Kiddush over wine' },
  { id: 'urchatz',        heTitle: 'וּרְחַץ',               enTitle: 'Urchatz',          desc: 'Wash hands without a blessing' },
  { id: 'karpas',         heTitle: 'כַּרְפַּס',              enTitle: 'Karpas',           desc: 'Dip vegetable in salt water' },
  { id: 'yachatz',        heTitle: 'יַחַץ',                enTitle: 'Yachatz',          desc: 'Break the middle matzah' },
  { id: 'maggid',         heTitle: 'מַגִּיד',               enTitle: 'Maggid',           desc: 'Tell the story of the Exodus' },
  { id: 'rachtzah',       heTitle: 'רָחְצָה',               enTitle: 'Rachtzah',         desc: 'Wash hands with a blessing' },
  { id: 'motzi-matzah',   heTitle: 'מוֹצִיא מַצָּה',          enTitle: 'Motzi Matzah',     desc: 'Bless and eat matzah' },
  { id: 'maror',          heTitle: 'מָרוֹר',                enTitle: 'Maror',            desc: 'Eat the bitter herbs' },
  { id: 'korech',         heTitle: 'כּוֹרֵךְ',               enTitle: 'Korech',           desc: 'Eat matzah and maror together' },
  { id: 'shulchan-orech', heTitle: 'שֻׁלְחָן עוֹרֵךְ',        enTitle: 'Shulchan Orech',   desc: 'The festive meal' },
  { id: 'tzafun',         heTitle: 'צָפוּן',                enTitle: 'Tzafun',           desc: 'Eat the hidden afikoman' },
  { id: 'barech',         heTitle: 'בָּרֵךְ',                enTitle: 'Barech',           desc: 'Grace after meals' },
  { id: 'hallel',         heTitle: 'הַלֵּל',                enTitle: 'Hallel',           desc: 'Songs of praise' },
  { id: 'nirtzah',        heTitle: 'נִרְצָה',               enTitle: 'Nirtzah',          desc: 'Conclusion and songs' },
];

// ============================================================
// Hebrew text cleanup utilities
// ============================================================

/**
 * Fix mid-word spaces in OCR Hebrew text.
 * Hebrew OCR often inserts spaces between letters within a word.
 * Strategy: If a space sits between two Hebrew letters (no punctuation/nikud break),
 * and the resulting "word" on the right is just 1-2 chars, merge them.
 */
function fixMidWordSpaces(text) {
  if (!text) return '';

  // Hebrew letter range (including final forms)
  const heLetterRe = /[\u05D0-\u05EA]/;
  // Nikud range
  const nikudRe = /[\u0591-\u05C7]/;

  // Pass 1: Remove spaces that split a word (letter+nikud SPACE letter pattern)
  // This handles OCR artifacts like "הַ גָּ דָ ה" -> "הַגָּדָה"
  let result = text.replace(/([\u05D0-\u05EA][\u0591-\u05C7]*)\s+([\u05D0-\u05EA])/g, (match, before, after) => {
    return before + after;
  });

  // Pass 2: But we over-merged — we need to keep real word boundaries.
  // Real word boundaries in Hebrew have a space after a word-final letter.
  // We'll use a heuristic: if after merging we get words > 15 chars,
  // the original spaces were probably real. So let's be more conservative.

  // Better approach: only merge when the right fragment is 1-3 chars
  // (typical OCR split), keeping longer fragments separate.
  result = text;

  // Iterative merge of short fragments
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 20) {
    changed = false;
    iterations++;
    // Merge a short right-side fragment (1-3 Hebrew letters) into the word on its left
    const merged = result.replace(
      /([\u05D0-\u05EA][\u0591-\u05C7]*)\s+([\u05D0-\u05EA][\u0591-\u05C7]{0,3})(?=\s|$|[^\\u05D0-\u05EA])/g,
      (match, left, right) => {
        // Only merge if right side is a short fragment (likely OCR artifact)
        const rightLetters = right.replace(/[\u0591-\u05C7]/g, '');
        if (rightLetters.length <= 2) {
          changed = true;
          return left + right;
        }
        return match;
      }
    );
    result = merged;
  }

  return result;
}

/**
 * Clean up PDF-extracted text
 */
function cleanPdfText(text) {
  if (!text) return '';

  // Remove page numbers (standalone numbers on their own line)
  text = text.replace(/^\s*\d{1,3}\s*$/gm, '');

  // Remove excessive whitespace but keep paragraph breaks
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  // Fix mid-word spaces in Hebrew
  text = fixMidWordSpaces(text);

  // Trim lines
  text = text.split('\n').map(l => l.trim()).join('\n');

  return text.trim();
}

// ============================================================
// Keywords for mapping Or Zoreach sections to seder steps
// ============================================================
const SECTION_KEYWORDS = {
  'kadesh': ['קדש', 'קידוש', 'יין', 'כוס ראשון', 'בורא פרי הגפן', 'קדש ורחץ'],
  'urchatz': ['ורחץ', 'רחיצ', 'נטילת ידים'],
  'karpas': ['כרפס', 'ירק', 'מי מלח'],
  'yachatz': ['יחץ', 'בוצע', 'אפיקומן', 'חצי'],
  'maggid': ['מגיד', 'הא לחמא', 'עבדים היינו', 'מה נשתנה', 'ארבעה בנים', 'ארמי אובד', 'רבן גמליאל', 'פסח מצה ומרור', 'בכל דור ודור', 'הללויה', 'לפיכך', 'דיינו', 'עשר מכות', 'צא ולמד'],
  'rachtzah': ['רחצה', 'נטילת ידיים', 'רחץ'],
  'motzi-matzah': ['מוציא מצה', 'המוציא', 'אכילת מצה', 'על אכילת מצה'],
  'maror': ['מרור', 'חזרת', 'על אכילת מרור'],
  'korech': ['כורך', 'הלל', 'סנדוויץ', 'זכר למקדש'],
  'shulchan-orech': ['שלחן עורך', 'סעודה', 'ביצה'],
  'tzafun': ['צפון', 'אפיקומן', 'צפון'],
  'barech': ['ברך', 'ברכת המזון', 'כוס שלישי', 'שפוך חמתך', 'שפוך'],
  'hallel': ['הלל', 'לא לנו', 'אהבתי', 'הודו', 'מן המצר', 'אנא', 'כוס רביעי', 'נשמת', 'יהללוך', 'ישתבח'],
  'nirtzah': ['נרצה', 'חסל', 'לשנה הבאה', 'אחד מי יודע', 'חד גדיא', 'אדיר הוא', 'ספירת העומר'],
};

// ============================================================
// STEP 1: Parse Standard Haggadah from Word doc
// ============================================================
async function parseHaggadahDocx() {
  console.log('Step 1: Parsing Haggadah Word document...');
  const docxPath = 'C:/Users/Pettek/Downloads/הגדה-של-פסח.docx';

  if (!fs.existsSync(docxPath)) {
    console.error('  ERROR: Haggadah docx not found at', docxPath);
    return null;
  }

  // Extract with mammoth (preserves some structure)
  const htmlResult = await mammoth.convertToHtml({path: docxPath});
  const rawResult = await mammoth.extractRawText({path: docxPath});

  const htmlText = htmlResult.value;
  const rawText = rawResult.value;

  console.log('  Raw text length:', rawText.length, 'chars');
  console.log('  HTML length:', htmlText.length, 'chars');

  // Save raw for debugging
  fs.writeFileSync(path.join(OUTPUT_DIR, '_raw_haggadah.txt'), rawText, 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, '_raw_haggadah.html'), htmlText, 'utf8');

  // Split into sections by detecting seder step headers
  // The Haggadah text typically has section headers like "קדש", "ורחץ", etc.
  const sections = splitHaggadahIntoSections(rawText);

  console.log('  Found', Object.keys(sections).length, 'sections');
  for (const [id, text] of Object.entries(sections)) {
    console.log('   ', id, ':', text.substring(0, 60).replace(/\n/g, ' '), '...');
  }

  return sections;
}

function splitHaggadahIntoSections(text) {
  const sections = {};
  const lines = text.split('\n');

  // Section header patterns (the seder steps as they appear in the Haggadah)
  const headerPatterns = [
    { id: 'kadesh',         patterns: [/^קַדֵּשׁ\b/, /^קדש\b/, /^סדר קדש/] },
    { id: 'urchatz',        patterns: [/^וּרְחַץ\b/, /^ורחץ\b/] },
    { id: 'karpas',         patterns: [/^כַּרְפַּס\b/, /^כרפס\b/] },
    { id: 'yachatz',        patterns: [/^יַחַץ\b/, /^יחץ\b/] },
    { id: 'maggid',         patterns: [/^מַגִּיד\b/, /^מגיד\b/, /^הָא לַחְמָא/, /^הא לחמא/] },
    { id: 'rachtzah',       patterns: [/^רָחְצָה\b/, /^רחצה\b/] },
    { id: 'motzi-matzah',   patterns: [/^מוֹצִיא\b/, /^מוציא\b/, /^מוצי?א\s+מצ[הּ]/] },
    { id: 'maror',          patterns: [/^מָרוֹר\b/, /^מרור\b/] },
    { id: 'korech',         patterns: [/^כּוֹרֵךְ\b/, /^כורך\b/] },
    { id: 'shulchan-orech', patterns: [/^שֻׁלְחָן\s+עוֹרֵךְ/, /^שלחן\s+עורך/] },
    { id: 'tzafun',         patterns: [/^צָפוּן\b/, /^צפון\b/] },
    { id: 'barech',         patterns: [/^בָּרֵךְ\b/, /^ברך\b/] },
    { id: 'hallel',         patterns: [/^הַלֵּל\b/, /^הלל\b/] },
    { id: 'nirtzah',        patterns: [/^נִרְצָה\b/, /^נרצה\b/] },
  ];

  let currentSection = null;
  let currentText = [];
  let foundAny = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection) currentText.push('');
      continue;
    }

    // Strip nikud for matching
    const stripped = trimmed.replace(/[\u0591-\u05C7]/g, '').trim();

    // Check if this line is a section header
    let matchedSection = null;
    for (const hp of headerPatterns) {
      for (const pat of hp.patterns) {
        if (pat.test(trimmed) || pat.test(stripped)) {
          matchedSection = hp.id;
          break;
        }
      }
      if (matchedSection) break;
    }

    if (matchedSection) {
      // Save previous section
      if (currentSection && currentText.length > 0) {
        sections[currentSection] = currentText.join('\n').trim();
      }
      currentSection = matchedSection;
      currentText = [trimmed]; // Include the header line
      foundAny = true;
    } else if (currentSection) {
      currentText.push(trimmed);
    } else if (!foundAny) {
      // Text before first section - could be intro/title.
      // Check for "סדר ההגדה" or kiddush text to assign to kadesh
      if (stripped.includes('קדש') || stripped.includes('סדר') || stripped.includes('הגדה')) {
        currentSection = 'kadesh';
        currentText = [trimmed];
        foundAny = true;
      }
    }
  }

  // Save last section
  if (currentSection && currentText.length > 0) {
    sections[currentSection] = currentText.join('\n').trim();
  }

  // If we couldn't find clear section headers, try a different approach:
  // Split by blank lines and assign based on content keywords
  if (Object.keys(sections).length < 5) {
    console.log('  Few sections detected by headers, trying content-based splitting...');
    return splitByContent(text);
  }

  return sections;
}

function splitByContent(text) {
  const sections = {};
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

  // Known text snippets that identify each section
  const sectionIdentifiers = {
    'kadesh': ['בורא פרי הגפן', 'מקדש ישראל', 'זמן חרותנו', 'קידוש'],
    'urchatz': ['ורחץ', 'נוטל ידיו'],
    'karpas': ['כרפס', 'בורא פרי האדמה', 'ירקות'],
    'yachatz': ['יחץ', 'בוצע את המצה', 'אפיקומן'],
    'maggid': ['הא לחמא', 'עבדים היינו', 'מה נשתנה', 'ארבעה בנים', 'מתחילה עובדי', 'ברוך המקום', 'צא ולמד', 'עשר מכות', 'דיינו', 'רבן גמליאל', 'פסח מצה ומרור', 'בכל דור ודור', 'לפיכך', 'הללויה', 'גאל ישראל'],
    'rachtzah': ['רחצה', 'על נטילת ידים'],
    'motzi-matzah': ['המוציא לחם', 'על אכילת מצה', 'מוציא מצה'],
    'maror': ['על אכילת מרור', 'מרור'],
    'korech': ['כורך', 'זכר למקדש כהלל'],
    'shulchan-orech': ['שלחן עורך'],
    'tzafun': ['צפון', 'אוכלין את האפיקומן'],
    'barech': ['ברכת המזון', 'נברך', 'הזן את העולם', 'שפוך חמתך', 'כוס שלישי'],
    'hallel': ['לא לנו', 'בצאת ישראל', 'אהבתי', 'הללו את', 'מן המיצר', 'אודך', 'הודו לה', 'נשמת כל חי', 'ישתבח', 'יהללוך'],
    'nirtzah': ['חסל סידור פסח', 'לשנה הבאה', 'אחד מי יודע', 'חד גדיא', 'אדיר הוא', 'אדיר במלוכה'],
  };

  let currentSection = 'kadesh';
  let currentParagraphs = [];

  for (const para of paragraphs) {
    const stripped = para.replace(/[\u0591-\u05C7]/g, '');

    // Check if this paragraph starts a new section
    let newSection = null;
    for (const [sectionId, identifiers] of Object.entries(sectionIdentifiers)) {
      if (sectionId === currentSection) continue;

      // Check if paragraph starts with or heavily contains section identifiers
      for (const ident of identifiers) {
        if (stripped.includes(ident)) {
          // Make sure this section comes AFTER current in the seder order
          const currentIdx = SEDER_SECTIONS.findIndex(s => s.id === currentSection);
          const newIdx = SEDER_SECTIONS.findIndex(s => s.id === sectionId);
          if (newIdx > currentIdx) {
            newSection = sectionId;
            break;
          }
        }
      }
      if (newSection) break;
    }

    if (newSection && currentParagraphs.length > 0) {
      sections[currentSection] = currentParagraphs.join('\n\n').trim();
      currentSection = newSection;
      currentParagraphs = [para.trim()];
    } else {
      currentParagraphs.push(para.trim());
    }
  }

  // Save last section
  if (currentParagraphs.length > 0) {
    sections[currentSection] = currentParagraphs.join('\n\n').trim();
  }

  return sections;
}

// ============================================================
// STEP 2: Extract Or Zoreach Commentary from PDF
// ============================================================
async function parseOrZoreach() {
  console.log('\nStep 2: Parsing Or Zoreach PDF...');
  const pdfPath = 'C:/Users/Pettek/Downloads/Hagada shel Pesach Or Zorayach Breslov Hebrewbooks_org_51985.pdf';

  if (!fs.existsSync(pdfPath)) {
    console.error('  ERROR: Or Zoreach PDF not found at', pdfPath);
    return null;
  }

  let pdfParse;
  try {
    pdfParse = require('pdf-parse').PDFParse;
  } catch(e) {
    console.error('  ERROR: pdf-parse not available:', e.message);
    return null;
  }

  const pdfBuf = fs.readFileSync(pdfPath);
  const pdf = await new pdfParse(new Uint8Array(pdfBuf)).getText();

  console.log('  Pages:', pdf.numpages);
  console.log('  Text length:', pdf.text.length, 'chars');

  // Save raw for debugging
  fs.writeFileSync(path.join(OUTPUT_DIR, '_raw_or_zoreach.txt'), pdf.text, 'utf8');

  // Clean up the text
  let cleaned = cleanPdfText(pdf.text);

  // Save cleaned for debugging
  fs.writeFileSync(path.join(OUTPUT_DIR, '_cleaned_or_zoreach.txt'), cleaned, 'utf8');

  // Split into sections mapped to seder steps
  const sections = splitOrZoreachIntoSections(cleaned);

  console.log('  Mapped', Object.keys(sections).length, 'sections');
  for (const [id, text] of Object.entries(sections)) {
    console.log('   ', id, ':', text.substring(0, 60).replace(/\n/g, ' '), '...');
  }

  return sections;
}

function splitOrZoreachIntoSections(text) {
  const sections = {};
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

  if (paragraphs.length === 0) return sections;

  // The Or Zoreach follows the Haggadah order.
  // We'll scan for section keywords and group paragraphs.
  let currentSection = 'kadesh';
  let currentParagraphs = [];
  let intro = [];
  let passedIntro = false;

  for (const para of paragraphs) {
    const stripped = para.replace(/[\u0591-\u05C7]/g, '').trim();

    // Skip very short paragraphs that are likely page numbers or artifacts
    if (stripped.length < 5) continue;

    // Detect if this paragraph indicates a new seder section
    let detectedSection = null;

    // Check keywords for each section
    for (const [sectionId, keywords] of Object.entries(SECTION_KEYWORDS)) {
      const currentIdx = SEDER_SECTIONS.findIndex(s => s.id === currentSection);
      const testIdx = SEDER_SECTIONS.findIndex(s => s.id === sectionId);

      // Only advance forward in the seder
      if (testIdx <= currentIdx && passedIntro) continue;

      for (const kw of keywords) {
        // Check if paragraph starts with or prominently features the keyword
        if (stripped.startsWith(kw) ||
            (stripped.length < 100 && stripped.includes(kw))) {
          detectedSection = sectionId;
          break;
        }
      }
      if (detectedSection) break;
    }

    if (detectedSection && detectedSection !== currentSection) {
      // Save current section
      if (currentParagraphs.length > 0) {
        sections[currentSection] = currentParagraphs.join('\n\n').trim();
      }
      currentSection = detectedSection;
      currentParagraphs = [para.trim()];
      passedIntro = true;
    } else {
      currentParagraphs.push(para.trim());
      if (!passedIntro && para.length > 100) passedIntro = true;
    }
  }

  // Save last section
  if (currentParagraphs.length > 0) {
    sections[currentSection] = currentParagraphs.join('\n\n').trim();
  }

  return sections;
}

// ============================================================
// STEP 3: Extract Chumash LH Pesach from PDF
// ============================================================
async function parseChumashLH() {
  console.log('\nStep 3: Parsing Chumash LH Pesach PDF...');
  const pdfPath = path.join(ROOT, 'public', 'pdfs', 'parsha', 'חגים', 'פסח.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error('  ERROR: Chumash LH Pesach PDF not found at', pdfPath);
    return null;
  }

  let pdfParse;
  try {
    pdfParse = require('pdf-parse').PDFParse;
  } catch(e) {
    console.error('  ERROR: pdf-parse not available:', e.message);
    return null;
  }

  const pdfBuf = fs.readFileSync(pdfPath);
  const pdf = await new pdfParse(new Uint8Array(pdfBuf)).getText();

  console.log('  Pages:', pdf.numpages);
  console.log('  Text length:', pdf.text.length, 'chars');

  // Save raw for debugging
  fs.writeFileSync(path.join(OUTPUT_DIR, '_raw_chumash_lh_pesach.txt'), pdf.text, 'utf8');

  // Clean up
  let cleaned = cleanPdfText(pdf.text);
  fs.writeFileSync(path.join(OUTPUT_DIR, '_cleaned_chumash_lh_pesach.txt'), cleaned, 'utf8');

  // This PDF is smaller (11 pages), return as a single block
  // It's general Pesach commentary, not section-specific
  console.log('  Cleaned text length:', cleaned.length, 'chars');

  return cleaned;
}

// ============================================================
// STEP 4: Assemble and write JSON
// ============================================================
function assembleHaggadah(haggadahSections, orZoreachSections, chumashLHText) {
  console.log('\nStep 4: Assembling Haggadah data...');

  // Create output directory
  fs.mkdirSync(path.join(OUTPUT_DIR, 'part-1'), { recursive: true });

  const allSections = [];

  SEDER_SECTIONS.forEach((section, idx) => {
    const sectionNum = idx + 1;
    const haggadahText = haggadahSections ? (haggadahSections[section.id] || '') : '';
    const orZoreachText = orZoreachSections ? (orZoreachSections[section.id] || '') : '';

    // Split haggadah text into segments (by paragraph)
    const paragraphs = haggadahText.split(/\n\s*\n/).filter(p => p.trim());
    const segments = paragraphs.map((p, i) => ({
      index: i + 1,
      he: p.trim(),
    }));

    // If no segments from parsing, create a placeholder
    if (segments.length === 0) {
      segments.push({
        index: 1,
        he: section.heTitle,
      });
    }

    // Split Or Zoreach into paragraphs for commentary
    const ozParagraphs = orZoreachText ?
      orZoreachText.split(/\n\s*\n/).filter(p => p.trim()) : [];

    const sectionData = {
      id: `haggadah-1-${sectionNum}`,
      book: 'haggadah-shel-pesach',
      part: 1,
      torah: sectionNum,
      displayNumber: sectionNum,
      sectionId: section.id,
      title: section.enTitle,
      hebrewTitle: section.heTitle,
      description: section.desc,
      keyVerse: '',
      keyVerseRef: '',
      themes: ['Pesach', 'Seder', 'Freedom'],
      keywords: [],
      simanim: [],
      segments: segments,
      commentary_or_zoreach: ozParagraphs.map((p, i) => ({
        index: i + 1,
        he: p.trim(),
      })),
      commentary_lh: [], // Will be filled below
      relatedSources: getRelatedSources(section.id),
    };

    // Write section file
    const filePath = path.join(OUTPUT_DIR, 'part-1', `section-${sectionNum}.json`);
    fs.writeFileSync(filePath, JSON.stringify(sectionData, null, 2), 'utf8');
    console.log('  Wrote', filePath,
      `(${segments.length} segments, ${ozParagraphs.length} commentary paragraphs)`);

    allSections.push({
      number: sectionNum,
      id: section.id,
      title: section.enTitle,
      hebrewTitle: section.heTitle,
      description: section.desc,
      segmentCount: segments.length,
      commentaryCount: ozParagraphs.length,
    });
  });

  // Write Chumash LH as a separate file (general Pesach commentary)
  if (chumashLHText) {
    const lhParagraphs = chumashLHText.split(/\n\s*\n/).filter(p => p.trim());
    const lhData = {
      id: 'haggadah-lh-pesach',
      book: 'haggadah-shel-pesach',
      title: 'Chumash with Likutay Halachos - Pesach',
      hebrewTitle: 'חומש עם ליקוטי הלכות - פסח',
      segments: lhParagraphs.map((p, i) => ({
        index: i + 1,
        he: p.trim(),
      })),
    };
    const lhPath = path.join(OUTPUT_DIR, 'part-1', 'chumash-lh-pesach.json');
    fs.writeFileSync(lhPath, JSON.stringify(lhData, null, 2), 'utf8');
    console.log('  Wrote Chumash LH:', lhParagraphs.length, 'paragraphs');
  }

  // Write index.json
  const indexData = {
    id: 'haggadah-shel-pesach',
    book: 'haggadah-shel-pesach',
    title: 'Haggadah shel Pesach - Na Nach',
    hebrewTitle: 'הגדה של פסח — נ נח',
    author: 'Traditional / Or Zoreach (R\' Alter Tepliker)',
    description: 'The Pesach Haggadah with Breslov commentary from Or Zoreach by R\' Alter Tepliker, plus insights from Chumash with Likutay Halachos.',
    totalSections: SEDER_SECTIONS.length,
    sections: allSections,
    sources: [
      { name: 'Or Zoreach', hebrewName: 'אור זורח', author: 'R\' Alter of Teplik', description: 'Breslov Haggadah commentary' },
      { name: 'Chumash with Likutay Halachos', hebrewName: 'חומש עם ליקוטי הלכות', author: 'R\' Nosson of Breslov', description: 'LH insights on Pesach' },
    ],
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');
  console.log('  Wrote index.json');

  return indexData;
}

/**
 * Get related source links for each seder section
 */
function getRelatedSources(sectionId) {
  const sources = [];

  // OHY Pesach (torahs 22-25)
  sources.push(
    { book: 'otzar-hayirah', part: 1, torah: 22, title: 'OHY - Pesach, Sefira & Shavuos' },
    { book: 'otzar-hayirah', part: 1, torah: 23, title: 'OHY - Pesach Continued' },
    { book: 'otzar-hayirah', part: 1, torah: 24, title: 'OHY - Pesach III' },
    { book: 'otzar-hayirah', part: 1, torah: 25, title: 'OHY - Pesach Completion' },
  );

  // Section-specific links
  const sectionLinks = {
    'kadesh': [
      { book: 'likutay-moharan', part: 1, torah: 10, title: 'LM I:10 - Arrogance and Humility' },
    ],
    'maggid': [
      { book: 'likutay-moharan', part: 1, torah: 21, title: 'LM I:21 - Torah and Redemption' },
      { book: 'likutay-moharan', part: 2, torah: 4, title: 'LM II:4 - The Narrow Bridge' },
      { book: 'sichos-haran', part: 1, torah: 1, title: 'Sichos HaRan' },
    ],
    'motzi-matzah': [
      { book: 'likutay-moharan', part: 1, torah: 1, title: 'LM I:1 - Humility and Prayer' },
    ],
    'hallel': [
      { book: 'likutay-tefilos', part: 1, torah: 1, title: 'Likutay Tefilos 1' },
      { book: 'likutay-tefilos', part: 1, torah: 4, title: 'Likutay Tefilos 4' },
    ],
    'nirtzah': [
      { book: 'meshivas-nefesh', part: 1, torah: 1, title: 'Meshivas Nefesh - Never Give Up' },
    ],
  };

  if (sectionLinks[sectionId]) {
    sources.push(...sectionLinks[sectionId]);
  }

  return sources;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('=== Building Haggadah shel Pesach - Na Nach Edition ===\n');

  // Create output directory
  fs.mkdirSync(path.join(OUTPUT_DIR, 'part-1'), { recursive: true });

  // Parse all three sources
  const haggadahSections = await parseHaggadahDocx();
  const orZoreachSections = await parseOrZoreach();
  const chumashLHText = await parseChumashLH();

  // Assemble
  const index = assembleHaggadah(haggadahSections, orZoreachSections, chumashLHText);

  console.log('\n=== BUILD COMPLETE ===');
  console.log('Output:', OUTPUT_DIR);
  console.log('Sections:', index.totalSections);
  console.log('\nRaw debug files saved as _raw_*.txt and _cleaned_*.txt');
  console.log('Review these to check parsing quality.\n');
}

main().catch(err => {
  console.error('BUILD FAILED:', err);
  process.exit(1);
});
