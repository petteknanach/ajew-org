/**
 * realign-ebay-hanachal.cjs
 *
 * Systematically realigns ALL Ebay HaNachal English translations from their
 * original source files (DOCX via mammoth, HTML via cheerio) into the reader
 * JSON files.
 *
 * Part 1 (letters 1-121):
 *   - Letters 1-37 (+ 58, 70, 81, 94, 123): individual DOCX files
 *   - Letters 38-121: batch HTML files
 *   - DOCX files take priority over HTML when both exist
 *
 * Part 2 (letters 1-144):
 *   - vol3 batch HTML files
 *
 * Usage: node scripts/realign-ebay-hanachal.cjs
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const cheerio = require('cheerio');

// ── Paths ──────────────────────────────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, '..');
const READER_DIR = path.join(PROJECT_ROOT, 'public', 'reader', 'ebay-hanachal');
const DOCX_DIR = 'C:/Users/Pettek/Documents/Translations/Blossoms of the Spring';
const HTML_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Blossoms of the Stream';

// ── Stats ──────────────────────────────────────────────────────────────────────
let totalProcessed = 0;
let totalUpdated = 0;
let totalSkipped = 0;
const issues = [];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Strip HTML tags and decode entities, trim whitespace */
function stripHtml(html) {
  if (!html) return '';
  const $ = cheerio.load(`<div>${html}</div>`, { decodeEntities: true });
  return $('div').text().trim();
}

/** Split text into non-empty paragraphs */
function splitIntoParagraphs(text) {
  return text
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 0);
}

/** Read a reader JSON file */
function readLetterJson(part, letterNum) {
  const filePath = path.join(READER_DIR, `part-${part}`, `letter-${letterNum}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/** Write a reader JSON file */
function writeLetterJson(part, letterNum, data) {
  const dryRun = process.argv.includes('--dry-run');
  const filePath = path.join(READER_DIR, `part-${part}`, `letter-${letterNum}.json`);
  if (dryRun) {
    console.log(`    [DRY RUN] Would write ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ── DOCX extraction ────────────────────────────────────────────────────────────

/**
 * Build a map of letter number -> DOCX file path.
 * Handles filename variations:
 *   "Letter 33 old 35 new" -> maps to letter 35
 *   "Letter 34 old 38 new" -> maps to letter 38
 *   "Letter 35 old 39 new" -> maps to letter 39
 *   "Letter 36 - new 40"   -> maps to letter 40
 *   Others: "Letter N ..." -> maps to letter N
 */
function buildDocxMap() {
  const map = {};
  if (!fs.existsSync(DOCX_DIR)) {
    console.error('DOCX directory not found:', DOCX_DIR);
    return map;
  }

  const files = fs.readdirSync(DOCX_DIR).filter(f =>
    f.endsWith('.docx') && f.startsWith('Letter') && !f.startsWith('~')
  );

  for (const file of files) {
    const filePath = path.join(DOCX_DIR, file);
    let letterNum = null;

    // "Letter 33 old 35 new" -> 35
    const oldNewMatch = file.match(/Letter\s+(\d+)\s+old\s+(\d+)\s+new/i);
    if (oldNewMatch) {
      letterNum = parseInt(oldNewMatch[2], 10);
    }

    // "Letter 36 - new 40" -> 40
    const newMatch = file.match(/Letter\s+\d+\s*-?\s*new\s+(\d+)/i);
    if (!letterNum && newMatch) {
      letterNum = parseInt(newMatch[1], 10);
    }

    // "Letter N" (simple case)
    if (!letterNum) {
      const simpleMatch = file.match(/Letter\s+(\d+)/i);
      if (simpleMatch) {
        letterNum = parseInt(simpleMatch[1], 10);
      }
    }

    if (letterNum) {
      // Skip "Letter 1 - later" if we already have "Letter 1 copied from blog"
      if (file.includes('later') && map[letterNum]) continue;
      // Prefer non-"later" versions
      if (map[letterNum] && !map[letterNum].includes('later')) {
        // Already have a better version, skip
        // But prefer "improved" or "fixed" versions
        if (file.includes('improved') || file.includes('fixed')) {
          map[letterNum] = filePath;
        }
        continue;
      }
      map[letterNum] = filePath;
    }
  }

  return map;
}

/** Extract English paragraphs from a DOCX file using mammoth */
async function extractDocxParagraphs(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    return splitIntoParagraphs(text);
  } catch (err) {
    console.error(`  ERROR reading DOCX ${filePath}: ${err.message}`);
    return null;
  }
}

// ── HTML extraction ────────────────────────────────────────────────────────────

/**
 * Extract letters from a batch HTML file.
 * Returns a map of letter number -> array of English paragraphs.
 */
function extractHtmlLetters(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) {
    console.error('HTML file not found:', filePath);
    return map;
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);

  // Find all h2 elements that contain "Letter N"
  const h2s = $('h2').toArray();

  for (let i = 0; i < h2s.length; i++) {
    const h2 = h2s[i];
    const headerText = $(h2).text().trim();
    const match = headerText.match(/Letter\s+(\d+)/i);
    if (!match) continue;

    const letterNum = parseInt(match[1], 10);

    // Collect all content between this h2 and the next h2
    const paragraphs = [];
    let el = $(h2).next();

    while (el.length > 0) {
      const tagName = el.prop('tagName')?.toLowerCase();

      // Stop at next h2
      if (tagName === 'h2') break;

      // Skip non-content elements
      if (tagName === 'hr') {
        el = el.next();
        continue;
      }

      // Extract text from p elements
      if (tagName === 'p') {
        const text = el.text().trim();
        if (text.length > 0) {
          paragraphs.push(text);
        }
      }

      // Extract text from div elements (letter-header, sig, na-nach, etc.)
      if (tagName === 'div') {
        const cls = el.attr('class') || '';
        // Include letter-header content (dates, headlines)
        if (cls.includes('letter-header')) {
          const dateEl = el.find('.date');
          const headlineEl = el.find('.headline');
          const parts = [];
          if (dateEl.length) parts.push(dateEl.text().trim());
          if (headlineEl.length) parts.push(headlineEl.text().trim());
          if (parts.length > 0) {
            paragraphs.push(parts.join(' — '));
          }
        } else if (cls.includes('sig') || cls.includes('na-nach')) {
          const text = el.text().trim();
          if (text.length > 0) {
            paragraphs.push(text);
          }
        } else {
          // Generic div - extract text
          const text = el.text().trim();
          if (text.length > 0) {
            paragraphs.push(text);
          }
        }
      }

      el = el.next();
    }

    if (paragraphs.length > 0) {
      map[letterNum] = paragraphs;
    }
  }

  return map;
}

/**
 * Build complete HTML letter maps for Part 1 (38-121) and Part 2 (1-144).
 */
function buildHtmlMaps() {
  const part1Map = {};
  const part2Map = {};

  if (!fs.existsSync(HTML_DIR)) {
    console.error('HTML directory not found:', HTML_DIR);
    return { part1Map, part2Map };
  }

  const files = fs.readdirSync(HTML_DIR).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const filePath = path.join(HTML_DIR, file);
    const letters = extractHtmlLetters(filePath);

    const isVol3 = file.includes('vol3');

    for (const [numStr, paragraphs] of Object.entries(letters)) {
      const num = parseInt(numStr, 10);
      if (isVol3) {
        part2Map[num] = paragraphs;
      } else {
        // Non-vol3: letters up to 121 go to part 1, 122+ we skip for part 1
        // (they may be numbered differently in the reader)
        part1Map[num] = paragraphs;
      }
    }
  }

  return { part1Map, part2Map };
}

// ── Alignment ──────────────────────────────────────────────────────────────────

/**
 * Align English paragraphs to Hebrew segments in a letter JSON.
 *
 * Rules:
 * - If more English paragraphs than Hebrew segments: concatenate extras into last
 * - If fewer English paragraphs: leave remaining Hebrew segments with empty English
 * - 1:1 mapping where possible
 */
function alignLetter(letterData, englishParagraphs, part, letterNum) {
  const segments = letterData.segments;
  const heCount = segments.length;
  const enCount = englishParagraphs.length;

  // Track original English content
  const origEnCount = segments.filter(s => s.en && s.en.trim().length > 0).length;

  if (enCount === 0) {
    console.log(`  Letter ${part}-${letterNum}: No English paragraphs found, skipping`);
    totalSkipped++;
    return false;
  }

  // Assign English paragraphs
  for (let i = 0; i < segments.length; i++) {
    if (i < enCount) {
      if (i === segments.length - 1 && enCount > heCount) {
        // Last Hebrew segment: concatenate remaining English paragraphs
        const remaining = englishParagraphs.slice(i).join('\n\n');
        segments[i].en = remaining;
      } else {
        segments[i].en = englishParagraphs[i];
      }
    } else {
      // More Hebrew segments than English paragraphs
      segments[i].en = '';
    }
  }

  const label = enCount === heCount ? 'EXACT' :
    enCount > heCount ? `EN>${heCount}` :
    `EN<${heCount}`;

  console.log(`  Part ${part} Letter ${letterNum}: ${label} — ` +
    `Hebrew segments: ${heCount}, English paragraphs: ${enCount}, ` +
    `was: ${origEnCount} EN segments`);

  // Show first segment sample
  if (segments.length > 0) {
    const sample = (segments[0].en || '').substring(0, 80);
    console.log(`    Sample: "${sample}..."`);
  }

  totalUpdated++;
  return true;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Ebay HaNachal English Translation Realignment ===\n');

  // Build source maps
  console.log('Building DOCX map...');
  const docxMap = buildDocxMap();
  console.log(`  Found ${Object.keys(docxMap).length} DOCX files: letters ${Object.keys(docxMap).sort((a,b) => a-b).join(', ')}\n`);

  console.log('Building HTML maps...');
  const { part1Map, part2Map } = buildHtmlMaps();
  console.log(`  Part 1 HTML letters: ${Object.keys(part1Map).length} (${Math.min(...Object.keys(part1Map).map(Number))}-${Math.max(...Object.keys(part1Map).map(Number))})`);
  console.log(`  Part 2 HTML letters: ${Object.keys(part2Map).length} (${Math.min(...Object.keys(part2Map).map(Number))}-${Math.max(...Object.keys(part2Map).map(Number))})\n`);

  // ── Part 1 ──────────────────────────────────────────────────────────────────
  console.log('=== Processing Part 1 (letters 1-121) ===\n');

  for (let letterNum = 1; letterNum <= 121; letterNum++) {
    const letterData = readLetterJson(1, letterNum);
    if (!letterData) {
      console.log(`  Part 1 Letter ${letterNum}: JSON not found, skipping`);
      totalSkipped++;
      continue;
    }

    totalProcessed++;
    let paragraphs = null;
    let source = '';

    // Priority: DOCX > HTML (only use DOCX for letters in range 1-121)
    if (docxMap[letterNum] && letterNum <= 121) {
      paragraphs = await extractDocxParagraphs(docxMap[letterNum]);
      source = 'DOCX';
    }

    if (!paragraphs && part1Map[letterNum]) {
      paragraphs = part1Map[letterNum];
      source = 'HTML';
    }

    if (!paragraphs) {
      console.log(`  Part 1 Letter ${letterNum}: No source found, skipping`);
      issues.push(`Part 1 Letter ${letterNum}: No source found`);
      totalSkipped++;
      continue;
    }

    console.log(`  [${source}] Processing Part 1 Letter ${letterNum}...`);
    const updated = alignLetter(letterData, paragraphs, 1, letterNum);
    if (updated) {
      writeLetterJson(1, letterNum, letterData);
    }
  }

  // ── Part 2 ──────────────────────────────────────────────────────────────────
  console.log('\n=== Processing Part 2 (letters 1-144) ===\n');

  for (let letterNum = 1; letterNum <= 144; letterNum++) {
    const letterData = readLetterJson(2, letterNum);
    if (!letterData) {
      console.log(`  Part 2 Letter ${letterNum}: JSON not found, skipping`);
      totalSkipped++;
      continue;
    }

    totalProcessed++;
    let paragraphs = null;

    if (part2Map[letterNum]) {
      paragraphs = part2Map[letterNum];
    }

    if (!paragraphs) {
      console.log(`  Part 2 Letter ${letterNum}: No source found, skipping`);
      issues.push(`Part 2 Letter ${letterNum}: No source found`);
      totalSkipped++;
      continue;
    }

    console.log(`  [HTML] Processing Part 2 Letter ${letterNum}...`);
    const updated = alignLetter(letterData, paragraphs, 2, letterNum);
    if (updated) {
      writeLetterJson(2, letterNum, letterData);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n=== Summary ===');
  console.log(`  Total processed: ${totalProcessed}`);
  console.log(`  Total updated:   ${totalUpdated}`);
  console.log(`  Total skipped:   ${totalSkipped}`);

  if (issues.length > 0) {
    console.log(`\n=== Issues (${issues.length}) ===`);
    issues.forEach(i => console.log(`  - ${i}`));
  }

  console.log('\nDone!');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
