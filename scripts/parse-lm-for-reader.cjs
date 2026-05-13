/**
 * Parse Likutay Moharan Hebrew texts into reader-ready JSON files.
 * Generates ALL torahs from the full text file (Part 1 & Part 2).
 *
 * The text file contains @ markers for each torah section.
 * Part 1 numbers go 1-70+, then Part 2 (Tinyana) restarts numbering.
 * We detect the restart to separate parts.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LM_DIR = path.join(ROOT, 'src/content/lm-complete/volume-1');
const REORGANIZED_DIR = path.join(ROOT, 'src/content/reorganized/rabbainu/likutay-moharan');
const OUTPUT_BASE = path.join(ROOT, 'public/reader/likutay-moharan');

// Hebrew number parsing
const HEB_NUM_MAP = {};
const units = ['\u05D0','\u05D1','\u05D2','\u05D3','\u05D4','\u05D5','\u05D6','\u05D7','\u05D8'];
const tens = ['\u05D9','\u05DB','\u05DC','\u05DE','\u05E0','\u05E1','\u05E2','\u05E4','\u05E6'];
const hundreds = ['\u05E7','\u05E8','\u05E9','\u05EA'];
for (let i = 0; i < 9; i++) HEB_NUM_MAP[units[i]] = i + 1;
for (let i = 0; i < 9; i++) HEB_NUM_MAP[tens[i]] = (i + 1) * 10;
for (let i = 0; i < 4; i++) HEB_NUM_MAP[hundreds[i]] = (i + 1) * 100;

function parseHebrewNumber(str) {
  str = str.trim().replace(/['"״׳\u05F3\u05F4]/g, '');
  if (!str) return null;
  if (str === '\u05D8\u05D5') return 15; // טו
  if (str === '\u05D8\u05D6') return 16; // טז

  let total = 0;
  const finals = { '\u05DA': 20, '\u05DD': 40, '\u05DF': 50, '\u05E3': 80, '\u05E5': 90 };
  for (const ch of str) {
    if (finals[ch]) { total += finals[ch]; continue; }
    if (HEB_NUM_MAP[ch] !== undefined) { total += HEB_NUM_MAP[ch]; continue; }
    if (ch === ' ') continue;
    return null;
  }
  return total > 0 ? total : null;
}

function splitIntoParagraphs(content) {
  return content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

function loadTorahMetadata(torahNum) {
  const metaPath = path.join(REORGANIZED_DIR, 'part-1', `torah-${torahNum}.json`);
  if (fs.existsSync(metaPath)) {
    try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); }
    catch (e) { /* skip */ }
  }
  return null;
}

function main() {
  console.log('Parsing ALL Likutay Moharan for reader...\n');

  const plainFile = path.join(LM_DIR, "01_\u05DC\u05D9\u05E7\u05D5\u05D8\u05D9 \u05DE\u05D5\u05D4\u05E8''\u05DF.txt");
  let text = fs.readFileSync(plainFile, 'utf8').replace(/^\uFEFF/, '');

  // Split by @ markers - keep all sections in order
  const parts = text.split(/^@\s*/m);
  const allSections = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    const lines = part.split('\n');
    let firstLine = lines[0].trim();

    // Handle combined entries like "מד מה"
    if (firstLine.includes(' ')) {
      firstLine = firstLine.split(' ')[0].trim();
    }

    const num = parseHebrewNumber(firstLine);
    if (num === null) continue;

    const content = lines.slice(1).join('\n').trim();
    if (!content) continue;

    allSections.push({ hebrewNum: num, rawContent: content });
  }

  console.log(`Total sections found: ${allSections.length}\n`);

  // Detect Part 1 / Part 2 boundary
  // Part 2 starts when numbers drop significantly (e.g., from 70+ back to 1-2)
  let part2StartIdx = -1;
  let maxNumSoFar = 0;
  for (let i = 0; i < allSections.length; i++) {
    const num = allSections[i].hebrewNum;
    if (num > maxNumSoFar) maxNumSoFar = num;
    // If we've seen numbers > 60 and suddenly drop back to small numbers
    if (maxNumSoFar > 60 && num <= 10 && i > 50) {
      part2StartIdx = i;
      console.log(`Part 2 detected starting at section index ${i} (number ${num}), after max ${maxNumSoFar}`);
      break;
    }
  }

  if (part2StartIdx === -1) {
    // No Part 2 boundary found - treat all as Part 1
    part2StartIdx = allSections.length;
    console.log('No Part 2 boundary detected - treating all as Part 1');
  }

  const part1Sections = allSections.slice(0, part2StartIdx);
  const part2Sections = allSections.slice(part2StartIdx);

  console.log(`Part 1: ${part1Sections.length} sections`);
  console.log(`Part 2: ${part2Sections.length} sections\n`);

  // Process Part 1
  const part1Dir = path.join(OUTPUT_BASE, 'part-1');
  fs.mkdirSync(part1Dir, { recursive: true });
  const part1Catalog = processTorahs(part1Sections, 1, part1Dir);

  // Process Part 2
  const part2Dir = path.join(OUTPUT_BASE, 'part-2');
  fs.mkdirSync(part2Dir, { recursive: true });
  const part2Catalog = processTorahs(part2Sections, 2, part2Dir);

  // Write Part 1 index
  writeCatalog(part1Dir, part1Catalog, 1, 'Part 1');

  // Write Part 2 index
  writeCatalog(part2Dir, part2Catalog, 2, 'Part 2 (Tinyana)');

  // Write top-level reader catalog
  const readerCatalog = {
    books: [{
      id: 'likutay-moharan',
      title: 'Likutay Moharan',
      hebrewTitle: '\u05DC\u05D9\u05E7\u05D5\u05D8\u05D9 \u05DE\u05D5\u05D4\u05E8"\u05DF',
      author: 'Rabbi Nachman of Breslov',
      hebrewAuthor: '\u05E8\u05D1\u05D9 \u05E0\u05D7\u05DE\u05DF \u05DE\u05D1\u05E8\u05E1\u05DC\u05D1',
      parts: [
        {
          part: 1, title: 'Part 1', hebrewTitle: '\u05D7\u05DC\u05E7 \u05D0',
          totalTorahs: part1Catalog.length,
          indexUrl: '/reader/likutay-moharan/part-1/index.json'
        },
        {
          part: 2, title: 'Part 2 (Tinyana)', hebrewTitle: '\u05D7\u05DC\u05E7 \u05D1 (\u05EA\u05E0\u05D9\u05E0\u05D0)',
          totalTorahs: part2Catalog.length,
          indexUrl: '/reader/likutay-moharan/part-2/index.json'
        }
      ]
    }]
  };

  fs.writeFileSync(
    path.join(OUTPUT_BASE, '..', '..', 'reader', 'catalog.json'),
    JSON.stringify(readerCatalog, null, 2), 'utf8'
  );

  console.log(`\nDone!`);
  console.log(`Part 1: ${part1Catalog.length} torahs`);
  console.log(`Part 2: ${part2Catalog.length} torahs`);
  console.log(`Total: ${part1Catalog.length + part2Catalog.length} torahs`);
}

function processTorahs(sections, partNum, outputDir) {
  const catalog = [];
  // Use sequential numbering based on order in the file
  // But also keep the original Hebrew number for display
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const seqNum = i + 1; // Sequential number (1-based)
    const displayNum = sec.hebrewNum; // Original Hebrew number

    const meta = partNum === 1 ? loadTorahMetadata(displayNum) : null;
    const paragraphs = splitIntoParagraphs(sec.rawContent);

    const segments = paragraphs.map((p, idx) => ({
      index: idx + 1,
      he: p,
      en: ''
    }));

    const totalInPart = sections.length;

    const readerData = {
      id: `lm-${partNum}-${seqNum}`,
      book: 'likutay-moharan',
      part: partNum,
      torah: seqNum,
      displayNumber: displayNum,
      title: meta?.torah?.title || `Torah ${displayNum}`,
      hebrewTitle: meta?.torah?.hebrewTitle || '',
      keyVerse: meta?.torah?.hebrewKeyVerse || '',
      keyVerseTranslation: meta?.torah?.translation || '',
      keyVerseRef: meta?.torah?.keyVerse || '',
      themes: meta?.torah?.themes || [],
      keywords: meta?.torah?.keywords || [],
      simanim: meta?.torah?.simanim?.map(s => ({
        number: s.number, title: s.title,
        hebrewTitle: s.hebrewTitle, summary: s.summary
      })) || [],
      segments,
      totalParagraphs: segments.length,
      hasEnglish: false,
      navigation: {
        prev: seqNum > 1 ? `lm-${partNum}-${seqNum - 1}` : null,
        next: seqNum < totalInPart ? `lm-${partNum}-${seqNum + 1}` : null,
        prevUrl: seqNum > 1 ? `/reader/likutay-moharan/${partNum}/${seqNum - 1}` : null,
        nextUrl: seqNum < totalInPart ? `/reader/likutay-moharan/${partNum}/${seqNum + 1}` : null
      }
    };

    const outPath = path.join(outputDir, `torah-${seqNum}.json`);
    fs.writeFileSync(outPath, JSON.stringify(readerData, null, 2), 'utf8');

    catalog.push({
      number: seqNum,
      displayNumber: displayNum,
      title: readerData.title,
      hebrewTitle: readerData.hebrewTitle,
      themes: readerData.themes,
      paragraphs: readerData.totalParagraphs,
      hasEnglish: false,
      url: `/reader/likutay-moharan/${partNum}/${seqNum}`
    });

    if (seqNum % 50 === 0 || seqNum === sections.length) {
      console.log(`  Part ${partNum}: processed ${seqNum}/${sections.length}`);
    }
  }
  return catalog;
}

function writeCatalog(dir, catalog, partNum, partTitle) {
  const catalogData = {
    book: 'likutay-moharan',
    part: partNum,
    title: `Likutay Moharan - ${partTitle}`,
    hebrewTitle: `\u05DC\u05D9\u05E7\u05D5\u05D8\u05D9 \u05DE\u05D5\u05D4\u05E8"\u05DF - \u05D7\u05DC\u05E7 ${partNum === 1 ? '\u05D0' : '\u05D1'}`,
    author: 'Rabbi Nachman of Breslov',
    hebrewAuthor: '\u05E8\u05D1\u05D9 \u05E0\u05D7\u05DE\u05DF \u05DE\u05D1\u05E8\u05E1\u05DC\u05D1',
    totalTorahs: catalog.length,
    torahs: catalog
  };
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(catalogData, null, 2), 'utf8');
}

main();
