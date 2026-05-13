/**
 * Add nikud (vowel marks) to existing reader JSON files.
 *
 * Strategy: Read the entire nikud source file as one continuous text.
 * For each JSON segment's plain text, find its position in the nikud text
 * by stripping nikud and searching. Extract the corresponding nikud version.
 *
 * Usage: node scripts/add-nikud-to-json.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks';
const OUTPUT_BASE = path.join(ROOT, 'public/reader');
const DRY_RUN = process.argv.includes('--dry-run');

// ── Utility functions ──────────

function readWin1255(filePath) {
  const raw = fs.readFileSync(filePath);
  return iconv.decode(raw, 'win1255').replace(/^\uFEFF/, '');
}

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

function stripMarkup(text) {
  text = text.replace(/^&HiddenFromIndex=[^\n]*/m, '');
  text = text.replace(/\{\{\{\{/g, '').replace(/\}\}\}\}/g, '');
  text = text.replace(/\(\(\(/g, '').replace(/\)\)\)/g, '');
  text = text.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
  text = text.replace(/\{([^}]*)\}/g, '($1)');
  text = text.replace(/\[\[\[/g, '').replace(/\]\]\]/g, '');
  text = text.replace(/\[\[/g, '').replace(/\]\]/g, '');
  text = text.replace(/<big>/gi, '').replace(/<\/big>/gi, '');
  text = text.replace(/<small>/gi, '').replace(/<\/small>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<hr\s*\/?>/gi, '\n');
  text = text.replace(/<b[^>]*>/gi, '').replace(/<\/b>/gi, '');
  text = text.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/_nbsp_/g, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Normalize text for comparison: strip nikud, collapse whitespace,
 * remove punctuation differences, etc.
 */
function normalize(text) {
  let t = stripNikud(text);
  t = t.replace(/[\u200F\u200E\u00A0]/g, ' '); // RTL marks, nbsp
  t = t.replace(/[-\u2013\u2014\u05BE]/g, '');  // dashes, maqaf
  t = t.replace(/[,.:;!?'"()\[\]{}]/g, '');     // punctuation
  t = t.replace(/\s+/g, '');                      // all whitespace
  return t;
}

// ── Nikud file to reader mapping ──────────

const NIKUD_BOOKS = [
  {
    name: 'Likutay Moharan',
    nikudFile: BOOKS_DIR + "/1_ספרי רבי נחמן/02_ ליקוטי מוהר''ן מנוקד.txt",
    readerDirs: ['likutay-moharan/part-1', 'likutay-moharan/part-2'],
    filePrefix: 'torah',
  },
  {
    name: 'Sipurey Maasiyos',
    nikudFile: BOOKS_DIR + '/1_ספרי רבי נחמן/05_ספורי מעשיות מנוקד.txt',
    readerDirs: ['sipurey-maasiyos'],
    filePrefix: 'story',
  },
  {
    name: 'Sichos HaRan',
    nikudFile: BOOKS_DIR + "/1_ספרי רבי נחמן/06א_שיחות הר''ן מנוקד.txt",
    readerDirs: ['sichos-haran'],
    filePrefix: 'sicha',
  },
  {
    name: 'Chayey Moharan',
    nikudFile: BOOKS_DIR + '/1_ספרי רבי נחמן/08_חיי מוהרן מנוקד.txt',
    readerDirs: ['chayey-moharan'],
    filePrefix: 'chapter',
  },
  {
    name: 'Shivchay HaRan',
    nikudFile: BOOKS_DIR + "/1_ספרי רבי נחמן/09א_שבחי הר''ן מנוקד.txt",
    readerDirs: ['shivchay-haran'],
    filePrefix: 'section',
  },
  {
    name: 'Eitzos Yesharos',
    nikudFile: BOOKS_DIR + "/ספרית ברסלב/אנ''ש דפולין/עצות ישרות במנוקד.txt",
    readerDirs: ['misc-עצות-ישרות'],
    filePrefix: 'section',
  },
];

// Likutay Halachos - 8 volumes
const LH_NIKUD_DIR = BOOKS_DIR + '/2_ספרי רבי נתן/01_ליקוטי הלכות מנוקד';
const LH_NIKUD_FILES = [
  { file: '01_אורח חיים א.txt', part: 1 },
  { file: '02_אורח חיים ב.txt', part: 2 },
  { file: '03_אורח חיים ג.txt', part: 3 },
  { file: '04_יורה דעה א.txt', part: 4 },
  { file: '05_יורה דעה ב.txt', part: 5 },
  { file: '06_אבן העזר.txt', part: 6 },
  { file: '07_חושן משפט א.txt', part: 7 },
  { file: '08_חושן משפט ב.txt', part: 8 },
];

// ── Core matching logic ──────────

/**
 * Given the full nikud text (already stripped of markup) and a plain text segment,
 * find the nikud version of that segment within the nikud text.
 *
 * Returns the nikud version string, or null if not found.
 */
/**
 * Build a mapping array from normalized positions to original text positions.
 * normToOrig[normIdx] = origIdx
 * Pre-computed once per book for O(1) lookups.
 */
function buildNormToOrigMap(originalText) {
  const map = [];
  for (let i = 0; i < originalText.length; i++) {
    const ch = originalText[i];
    if (/[\u0591-\u05BD\u05BF-\u05C7]/.test(ch)) continue;
    if (/[\u200F\u200E\u00A0]/.test(ch)) continue;
    if (/[-\u2013\u2014\u05BE]/.test(ch)) continue;
    if (/[,.:;!?'"()\[\]{}]/.test(ch)) continue;
    if (/\s/.test(ch)) continue;
    map.push(i);
  }
  return map;
}

function findNikudForSegment(nikudFullText, nikudFullNormalized, normToOrigMap, plainSegment, searchStartIdx) {
  const plainNorm = normalize(plainSegment);
  if (plainNorm.length < 5) return { nikud: null, endIdx: searchStartIdx };

  // Use a search key: first 40 normalized chars of the plain segment
  const keyLen = Math.min(40, plainNorm.length);
  const searchKey = plainNorm.substring(0, keyLen);

  // Find in the normalized nikud text starting from searchStartIdx
  let foundIdx = nikudFullNormalized.indexOf(searchKey, searchStartIdx);

  // If not found from current position, try from beginning (in case of ordering issues)
  if (foundIdx === -1) {
    foundIdx = nikudFullNormalized.indexOf(searchKey, 0);
  }

  if (foundIdx === -1) {
    // Try shorter key
    const shortKey = plainNorm.substring(0, 20);
    foundIdx = nikudFullNormalized.indexOf(shortKey, searchStartIdx);
    if (foundIdx === -1) {
      foundIdx = nikudFullNormalized.indexOf(shortKey, 0);
    }
  }

  if (foundIdx === -1) return { nikud: null, endIdx: searchStartIdx };

  // Now find the end: search for the last part of the plain text
  const endKeyLen = Math.min(30, plainNorm.length);
  const endKey = plainNorm.substring(plainNorm.length - endKeyLen);
  let endIdx = nikudFullNormalized.indexOf(endKey, foundIdx);

  if (endIdx === -1) {
    // Fallback: just use estimated length based on ratio
    endIdx = foundIdx + plainNorm.length;
  } else {
    endIdx += endKeyLen;
  }

  // Map normalized positions back to the original nikud text using pre-built map
  const startOrig = foundIdx < normToOrigMap.length ? normToOrigMap[foundIdx] : nikudFullText.length;
  const endOrig = endIdx < normToOrigMap.length ? normToOrigMap[endIdx] : nikudFullText.length;

  const nikudSegment = nikudFullText.substring(startOrig, endOrig).trim();
  return { nikud: nikudSegment, endIdx };
}

// ── Enrichment ──────────

function enrichBook(config) {
  console.log(`\n=== ${config.name} ===`);

  if (!fs.existsSync(config.nikudFile)) {
    console.log(`  SKIP: nikud file not found`);
    return;
  }

  // Read nikud file and clean it
  const rawNikud = readWin1255(config.nikudFile);
  const cleanNikud = stripMarkup(rawNikud);
  const normNikud = normalize(cleanNikud);
  const normToOrigMap = buildNormToOrigMap(cleanNikud);

  console.log(`  Nikud text: ${cleanNikud.length} chars (${normNikud.length} normalized)`);

  let totalSegments = 0, matchedSegments = 0, failedSegments = 0;

  for (const readerDir of config.readerDirs) {
    const dirPath = path.join(OUTPUT_BASE, readerDir);
    if (!fs.existsSync(dirPath)) {
      console.log(`  SKIP dir: ${readerDir} (not found)`);
      continue;
    }

    const jsonFiles = fs.readdirSync(dirPath)
      .filter(f => f.startsWith(config.filePrefix + '-') && f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/(\d+)\.json$/)?.[1] || '0');
        const numB = parseInt(b.match(/(\d+)\.json$/)?.[1] || '0');
        return numA - numB;
      });

    console.log(`  Processing ${readerDir}: ${jsonFiles.length} files`);

    let searchStart = 0;

    for (const jsonFile of jsonFiles) {
      const jsonPath = path.join(dirPath, jsonFile);
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      let fileMatched = 0;
      for (const seg of jsonData.segments) {
        totalSegments++;
        const result = findNikudForSegment(cleanNikud, normNikud, normToOrigMap, seg.he, searchStart);
        if (result.nikud && result.nikud.length > 5) {
          seg.he_nikud = result.nikud;
          searchStart = result.endIdx;
          fileMatched++;
          matchedSegments++;
        } else {
          failedSegments++;
        }
      }

      if (fileMatched > 0) {
        jsonData.hasNikud = true;
        if (!DRY_RUN) {
          fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
        }
      }
    }
  }

  console.log(`  Result: ${matchedSegments}/${totalSegments} segments matched (${failedSegments} failed)`);
}

// ── Main ──────────

function main() {
  console.log(DRY_RUN ? '=== DRY RUN MODE ===' : '=== ENRICHING JSON WITH NIKUD ===');

  // Standard books
  for (const book of NIKUD_BOOKS) {
    enrichBook(book);
  }

  // Likutay Halachos - 8 volumes
  for (const vol of LH_NIKUD_FILES) {
    const nikudPath = path.join(LH_NIKUD_DIR, vol.file);
    enrichBook({
      name: `Likutay Halachos Part ${vol.part}`,
      nikudFile: nikudPath,
      readerDirs: [`likutay-halachos/part-${vol.part}`],
      filePrefix: 'halacha',
    });
  }

  console.log('\n========================================');
  console.log(DRY_RUN ? 'DRY RUN COMPLETE' : 'NIKUD ENRICHMENT COMPLETE');
  console.log('========================================');
}

main();
