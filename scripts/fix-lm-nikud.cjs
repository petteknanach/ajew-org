/**
 * Fix corrupted nikud in LM segments.
 * Finds segments where he === he_nikud (meaning nikud was lost),
 * then restores proper nikud from the HebrewBreslovBooks source file.
 *
 * Run: node scripts/fix-lm-nikud.cjs
 */

const fs = require('fs');
const path = require('path');

// Load iconv-lite for encoding conversion (Windows-1255)
let iconv;
try {
  iconv = require('iconv-lite');
} catch(e) {
  console.error('ERROR: iconv-lite not found. Run: npm install iconv-lite');
  process.exit(1);
}

const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks/1_\u05E1\u05E4\u05E8\u05D9 \u05E8\u05D1\u05D9 \u05E0\u05D7\u05DE\u05DF';
const NIKUD_FILE = path.join(BOOKS_DIR, '02_ \u05DC\u05D9\u05E7\u05D5\u05D8\u05D9 \u05DE\u05D5\u05D4\u05E8\'\'\u05DF \u05DE\u05E0\u05D5\u05E7\u05D3.txt');
const LM_DIR = path.join(process.cwd(), 'public/reader/likutay-moharan');

// Files to check (those known to have corrupted segments)
const TARGET_FILES = [
  'part-1/torah-4.json',
  'part-1/torah-12.json',
  'part-1/torah-62.json',
  'part-1/torah-105.json',
  'part-1/torah-282.json',
  'part-2/torah-39.json',
  'part-2/torah-78.json'
];

function stripNikud(text) {
  return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
}

function normalizeForSearch(text) {
  // Strip nikud, quotes, punctuation, extra whitespace for fuzzy matching
  return stripNikud(text)
    .replace(/[\s\n\r\t]+/g, ' ')
    .replace(/[""״׳'"'`:,.\-–—;!?()[\]{}\/\\]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

// Load nikud source file (Windows-1255 encoded)
function loadNikudSource() {
  console.log('Loading nikud source from:', NIKUD_FILE);

  const raw = fs.readFileSync(NIKUD_FILE);
  let content = iconv.decode(raw, 'win1255');

  // Verify Hebrew content loaded properly
  if (!content.includes('\u05D0') && !content.includes('\u05D1')) {
    // Fallback to UTF-8
    content = raw.toString('utf8');
  }

  // Strip the metadata header (line 1)
  const lines = content.split('\n');
  if (lines[0].startsWith('&HiddenFromIndex')) {
    lines.shift();
  }

  content = lines.join('\n');
  console.log('Source file loaded, length:', content.length);

  // Split into sections by @ markers
  const sections = content.split(/^@\s*/m).filter(s => s.trim());
  console.log('Found', sections.length, 'sections (torahs) in nikud source');

  // Split each section into paragraphs by ~ markers
  const parsedSections = sections.map(section => {
    const sLines = section.split('\n');
    const title = sLines[0].trim();
    const body = sLines.slice(1).join('\n');
    const paragraphs = body.split(/^~\s*/m).filter(p => p.trim());
    return { title, paragraphs, raw: section };
  });

  return { content, sections: parsedSections };
}

// Find nikud text matching a given plain Hebrew segment
function findNikudMatch(plainText, nikudSource) {
  const searchNorm = normalizeForSearch(plainText);
  if (!searchNorm || searchNorm.length < 15) return null;

  // Use a 30-char substring from the middle for unique matching
  const start = Math.max(0, Math.floor(searchNorm.length / 4));
  const searchChunk = searchNorm.substring(start, start + 50);

  // Search across all sections and paragraphs
  for (const section of nikudSource.sections) {
    for (const para of section.paragraphs) {
      const paraNorm = normalizeForSearch(para);
      if (paraNorm.includes(searchChunk)) {
        // Found a match - return the paragraph with nikud, cleaned up
        let result = para.trim();
        // Remove any markup artifacts
        result = result.replace(/\{\{\{\{[^}]*\}\}\}\}/g, '');
        result = result.replace(/\[\[\[|\]\]\]/g, '');
        result = result.replace(/\(\(\(|\)\)\)/g, '');
        result = result.replace(/\(\(|\)\)/g, '');
        result = result.replace(/\{\{|\}\}/g, '');
        result = result.replace(/<[^>]+>/g, '');
        result = result.replace(/\s+/g, ' ').trim();
        return result;
      }
    }

    // Also search the raw section content as fallback
    const rawNorm = normalizeForSearch(section.raw);
    if (rawNorm.includes(searchChunk)) {
      // Try to extract just the matching paragraph from the raw text
      const rawLines = section.raw.split('\n');
      for (let i = 0; i < rawLines.length; i++) {
        const lineNorm = normalizeForSearch(rawLines[i]);
        if (lineNorm.length > 20 && searchChunk.substring(0, 30) !== '' && lineNorm.includes(searchChunk.substring(0, 30))) {
          // Collect this and subsequent lines until empty line or marker
          let result = rawLines[i];
          let j = i + 1;
          while (j < rawLines.length && rawLines[j].trim() && !rawLines[j].startsWith('@') && !rawLines[j].startsWith('~')) {
            result += ' ' + rawLines[j];
            j++;
          }
          result = result.replace(/\{\{\{\{[^}]*\}\}\}\}/g, '').replace(/\[\[\[|\]\]\]/g, '').replace(/\(\(\(|\)\)\)/g, '').replace(/\(\(|\)\)/g, '').replace(/\{\{|\}\}/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          return result;
        }
      }
    }
  }

  return null;
}

function main() {
  console.log('=== LM Nikud Restoration Script ===\n');

  // Step 1: Find corrupted segments
  console.log('Scanning for corrupted segments (he === he_nikud)...\n');

  const corrupted = [];

  for (const file of TARGET_FILES) {
    const filePath = path.join(LM_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const bad = data.segments.filter(s => s.he && s.he_nikud && s.he === s.he_nikud);
      if (bad.length > 0) {
        console.log(`${file}: ${bad.length} corrupted segment(s)`);
        bad.forEach(s => {
          console.log(`  seg ${s.index}: "${s.he.substring(0, 60)}..."`);
          corrupted.push({ file, filePath, segIndex: s.index, he: s.he, data });
        });
      } else {
        console.log(`${file}: OK`);
      }
    } catch(e) {
      console.log(`${file}: ERROR - ${e.message}`);
    }
  }

  if (corrupted.length === 0) {
    console.log('\nNo corrupted segments found. All clear!');
    return;
  }

  console.log(`\nTotal corrupted: ${corrupted.length} segment(s)\n`);

  // Step 2: Load nikud source
  let nikudSource;
  try {
    nikudSource = loadNikudSource();
  } catch(e) {
    console.error('Failed to load nikud source:', e.message);
    console.error('Make sure the HebrewBreslovBooks folder exists at:');
    console.error(BOOKS_DIR);
    return;
  }

  // Step 3: Restore nikud
  console.log('\n=== Restoring nikud ===\n');

  let fixed = 0;
  const fileDataMap = {};

  for (const item of corrupted) {
    console.log(`[${item.file}] seg ${item.segIndex}:`);
    console.log(`  Plain: "${item.he.substring(0, 50)}..."`);

    const nikudText = findNikudMatch(item.he, nikudSource);
    if (nikudText) {
      // Verify the nikud text actually contains nikud marks
      const hasNikud = /[\u05B0-\u05BD\u05BF-\u05C7]/.test(nikudText);
      if (hasNikud) {
        console.log(`  FIXED: "${nikudText.substring(0, 50)}..."`);
        const seg = item.data.segments.find(s => s.index === item.segIndex);
        if (seg) {
          seg.he_nikud = nikudText;
          fileDataMap[item.filePath] = item.data;
          fixed++;
        }
      } else {
        console.log(`  SKIPPED: Found match but no nikud marks in source text`);
      }
    } else {
      console.log(`  NOT FOUND: No matching text in nikud source`);
    }
  }

  // Step 4: Save
  if (fixed > 0) {
    console.log(`\n=== Saving ${fixed} fix(es) to ${Object.keys(fileDataMap).length} file(s) ===\n`);
    for (const [filePath, data] of Object.entries(fileDataMap)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  Updated: ${path.relative(process.cwd(), filePath)}`);
    }
  }

  console.log(`\nDone! Fixed ${fixed}/${corrupted.length} corrupted segments.`);
  if (fixed < corrupted.length) {
    console.log('Some segments could not be matched. They may need manual nikud restoration.');
  }
}

main();
