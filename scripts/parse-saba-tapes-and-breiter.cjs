/**
 * Parser for:
 * 1. Saba Tape Transcripts (28 HTML files -> reader JSON)
 * 2. Breiter Seder HaYom (1 HTML file -> reader JSON)
 *
 * Usage: node scripts/parse-saba-tapes-and-breiter.cjs
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ============================================================
// SABA TAPE TRANSCRIPTS
// ============================================================

const SABA_TAPES_SRC = 'C:/Users/Pettek/Downloads/final batch from TE/Saba Transcripts by Tapes';
const SABA_TAPES_DEST = path.join(__dirname, '..', 'public', 'reader', 'saba-tape-transcripts');

// Ordered list of tape files (sides A and B)
const TAPE_FILES = [
  'saba_tape_01G_A.html',
  'saba_tape_01G_B.html',
  'saba_tape_02G_A.html',
  'saba_tape_02G_B.html',
  'saba_tape_03G_A.html',
  'saba_tape_03G_B.html',
  'saba_tape_04G_A.html',
  'saba_tape_04G_B.html',
  'saba_tape_06G_A.html',
  'saba_tape_06G_B.html',
  'saba_tape_07G_A.html',
  'saba_tape_07G_B.html',
  'saba_tape_08G_B.html',
  'saba_tape_09G_A.html',
  'saba_tape_10G_A.html',
  'saba_tape_10G_B.html',
  'saba_tape_11G_A.html',
  'saba_tape_11G_B.html',
  'saba_tape_12G_A.html',
  'saba_tape_12G_B.html',
  'saba_tape_13G_A.html',
  'saba_tape_13G_B.html',
  'saba_tape_14G_A.html',
  'saba_tape_14G_B.html',
  'saba_tape_15G_A.html',
  'saba_tape_15G_B.html',
  'saba_tape_16G_A.html',
  'saba_tape_16G_B.html',
];

function parseTapeFilename(filename) {
  // e.g. saba_tape_01G_A.html -> { tapeNum: '1', side: 'A' }
  const match = filename.match(/saba_tape_(\d+)G_([AB])\.html/);
  if (!match) return null;
  return {
    tapeNum: String(parseInt(match[1], 10)),
    side: match[2],
  };
}

function extractTapeTitle(info) {
  const sideLabel = info.side === 'A' ? 'Side Aleph' : 'Side Bais';
  return `Tape ${info.tapeNum}G, ${sideLabel}`;
}

function extractTapeHebrewTitle(info) {
  const sideHeb = info.side === 'A' ? 'צד א' : 'צד ב';
  return `קסטה ${info.tapeNum}G — ${sideHeb}`;
}

function parseTapeHtml(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const segments = [];
  let segIndex = 1;

  // The transcript content is inside div.transcript
  const $transcript = $('div.transcript');
  if ($transcript.length === 0) {
    // Try alternative: just get all <p> tags in body
    $('p').each(function () {
      const text = $(this).text().trim();
      if (text && text.length > 5) {
        segments.push({
          index: segIndex++,
          he: '',
          en: text,
        });
      }
    });
    return segments;
  }

  // Get all direct children of .transcript that are <p> elements
  $transcript.children('p').each(function () {
    const text = $(this).text().trim();
    if (text && text.length > 2) {
      segments.push({
        index: segIndex++,
        he: '',
        en: text,
      });
    }
  });

  return segments;
}

function buildSabaTapes() {
  console.log('=== Parsing Saba Tape Transcripts ===');
  fs.mkdirSync(SABA_TAPES_DEST, { recursive: true });

  const torahs = [];

  for (let i = 0; i < TAPE_FILES.length; i++) {
    const filename = TAPE_FILES[i];
    const info = parseTapeFilename(filename);
    if (!info) {
      console.warn(`  Skipping unrecognized file: ${filename}`);
      continue;
    }

    const filePath = path.join(SABA_TAPES_SRC, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`  File not found: ${filePath}`);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf-8');
    const segments = parseTapeHtml(html);
    const sectionNum = i + 1;
    const title = extractTapeTitle(info);
    const hebrewTitle = extractTapeHebrewTitle(info);

    console.log(`  Section ${sectionNum}: ${title} — ${segments.length} segments`);

    // Write chapter JSON
    const chapterData = {
      id: `stt-${sectionNum}`,
      book: 'saba-tape-transcripts',
      part: 1,
      torah: sectionNum,
      displayNumber: sectionNum,
      title: title,
      hebrewTitle: hebrewTitle,
      keyVerse: '',
      keyVerseTranslation: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments: segments,
    };

    const chapterFile = path.join(SABA_TAPES_DEST, `chapter-${sectionNum}.json`);
    fs.writeFileSync(chapterFile, JSON.stringify(chapterData, null, 2), 'utf-8');

    torahs.push({
      number: sectionNum,
      displayNumber: sectionNum,
      title: title,
      hebrewTitle: hebrewTitle,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: true,
      url: `/reader/saba-tape-transcripts/1/${sectionNum}`,
    });
  }

  // Write index.json
  const indexData = {
    book: 'saba-tape-transcripts',
    part: 1,
    title: 'Saba Tape Transcripts',
    hebrewTitle: 'תמלולי קלטות סבא',
    author: 'Rabbi Yisroel Ber Odesser',
    hebrewAuthor: 'רבי ישראל דב אודסר',
    totalTorahs: torahs.length,
    torahs: torahs,
  };

  const indexFile = path.join(SABA_TAPES_DEST, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf-8');

  console.log(`  Total: ${torahs.length} sections written to ${SABA_TAPES_DEST}`);
  console.log(`  Index written: ${indexFile}`);
}

// ============================================================
// BREITER SEDER HAYOM
// ============================================================

const BREITER_SRC = 'C:/Users/Pettek/Downloads/final batch from TE/Yitzchok Breiter/seder_hayom.html';
const BREITER_DEST = path.join(__dirname, '..', 'public', 'reader', 'breiter-seder-hayom');

function parseBreiterHtml(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const sections = [];

  // Each section is a div.section with .section-header and .section-body
  $('div.section').each(function () {
    const $section = $(this);
    const sectionNum = $section.find('.section-num').text().trim();
    const sectionTitle = $section.find('.section-title').text().trim();
    const sectionTitleHeb = $section.find('.section-title-heb').text().trim();

    // Get the body text, including source notes
    const bodyParts = [];
    const $body = $section.find('.section-body');

    // Get all text nodes and child elements
    const bodyText = $body.text().trim();

    // Also get source note separately if present
    const sourceNote = $section.find('.source-note').text().trim();

    // Clean body text: the main body minus source note
    let mainText = bodyText;
    if (sourceNote && mainText.endsWith(sourceNote)) {
      mainText = mainText.slice(0, -sourceNote.length).trim();
    }

    sections.push({
      num: sectionNum,
      title: sectionTitle,
      hebrewTitle: sectionTitleHeb,
      mainText: mainText,
      sourceNote: sourceNote,
    });
  });

  return sections;
}

function buildBreiterSederHayom() {
  console.log('\n=== Parsing Breiter Seder HaYom ===');
  fs.mkdirSync(BREITER_DEST, { recursive: true });

  const html = fs.readFileSync(BREITER_SRC, 'utf-8');
  const sections = parseBreiterHtml(html);

  // Build one chapter per section (27 sections)
  const torahs = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionNum = i + 1;

    const segments = [];
    let segIndex = 1;

    // Main text as one segment
    if (section.mainText) {
      segments.push({
        index: segIndex++,
        he: '',
        en: section.mainText,
      });
    }

    // Source note as separate segment if present
    if (section.sourceNote) {
      segments.push({
        index: segIndex++,
        he: '',
        en: section.sourceNote,
      });
    }

    const title = section.title || `Section ${section.num}`;
    const hebrewTitle = section.hebrewTitle || '';

    console.log(`  Section ${sectionNum} (${section.num}): ${title} — ${segments.length} segments`);

    const chapterData = {
      id: `bsh-${sectionNum}`,
      book: 'breiter-seder-hayom',
      part: 1,
      torah: sectionNum,
      displayNumber: sectionNum,
      title: title,
      hebrewTitle: hebrewTitle,
      keyVerse: '',
      keyVerseTranslation: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments: segments,
    };

    const chapterFile = path.join(BREITER_DEST, `chapter-${sectionNum}.json`);
    fs.writeFileSync(chapterFile, JSON.stringify(chapterData, null, 2), 'utf-8');

    torahs.push({
      number: sectionNum,
      displayNumber: sectionNum,
      title: `${section.num}. ${title}`,
      hebrewTitle: hebrewTitle,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: true,
      url: `/reader/breiter-seder-hayom/1/${sectionNum}`,
    });
  }

  // Write index.json
  const indexData = {
    book: 'breiter-seder-hayom',
    part: 1,
    title: 'Seder HaYom',
    hebrewTitle: 'סדר היום',
    author: "R' Yitzchak Breiter",
    hebrewAuthor: "רבי יצחק ברייטער",
    totalTorahs: torahs.length,
    torahs: torahs,
  };

  const indexFile = path.join(BREITER_DEST, 'index.json');
  fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf-8');

  console.log(`  Total: ${torahs.length} sections written to ${BREITER_DEST}`);
  console.log(`  Index written: ${indexFile}`);
}

// ============================================================
// MAIN
// ============================================================

buildSabaTapes();
buildBreiterSederHayom();
console.log('\nDone!');
