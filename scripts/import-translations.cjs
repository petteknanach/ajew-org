/**
 * Import English translations from C:/Users/Pettek/Documents/Translations/
 * into the ajew-org reader JSON files.
 *
 * Handles: Likutay Halachos (HTML), Likutay Moharan (docx), Likutay Tefilos (HTML),
 * Sefer Hamidos (docx), Kitzur LM (from Translations)
 *
 * Strategy: For each book, extract ALL English paragraphs from translation files,
 * then fill gaps in reader JSON files using position-based sync with anchor points.
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const READER_DIR = path.join(__dirname, '../public/reader');
const TRANS_DIR = 'C:/Users/Pettek/Documents/Translations';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018').replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C').replace(/&hellip;/g, '\u2026')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, ' ').trim();
}

/**
 * Extract English paragraphs from HTML content.
 * Handles multiple structures: <p>, <div class="p">, <div class="para">, <div class="section">
 */
function extractEnglishFromHtml(htmlContent) {
  const paras = [];

  // Remove navigation, Hebrew toggle spans, source refs before extraction
  let html = htmlContent;
  html = html.replace(/<nav[^>]*>[\s\S]*?<\/nav>/g, '');
  html = html.replace(/<header[^>]*>[\s\S]*?<\/header>/g, '');
  html = html.replace(/<footer[^>]*>[\s\S]*?<\/footer>/g, '');

  // Method 1: <div class="para">
  let parts = html.split(/<div class="para">/);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      let block = parts[i];
      const endDiv = block.indexOf('</div>');
      if (endDiv > 0) block = block.substring(0, endDiv);
      block = cleanBlock(block);
      const text = stripHtml(block);
      if (text.length > 15) paras.push(text);
    }
    if (paras.length > 0) return paras;
  }

  // Method 2: <div class="section">
  parts = html.split(/<div class="section">/);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      let block = parts[i];
      const endDiv = block.indexOf('</div>');
      if (endDiv > 0) block = block.substring(0, endDiv);
      block = cleanBlock(block);
      const text = stripHtml(block);
      if (text.length > 15) paras.push(text);
    }
    if (paras.length > 0) return paras;
  }

  // Method 3: <div class="p"> (used in OC2)
  parts = html.split(/<div class="p">/);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      let block = parts[i];
      // Find matching closing </div> - handle nesting
      let depth = 1;
      let endIdx = 0;
      for (let j = 0; j < block.length; j++) {
        if (block.substring(j, j + 5) === '<div ') depth++;
        if (block.substring(j, j + 6) === '</div>') {
          depth--;
          if (depth === 0) { endIdx = j; break; }
        }
      }
      if (endIdx > 0) block = block.substring(0, endIdx);
      block = cleanBlock(block);
      const text = stripHtml(block);
      if (text.length > 15) paras.push(text);
    }
    if (paras.length > 0) return paras;
  }

  // Method 4: <p> tags (most common)
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    let content = match[1];
    content = cleanBlock(content);
    const text = stripHtml(content);
    if (isValidEnglishParagraph(text)) {
      paras.push(text);
    }
  }

  return paras;
}

function cleanBlock(block) {
  // Remove source references, Hebrew toggle spans, navigation
  block = block.replace(/<span class="source-ref">[\s\S]*?<\/span>/g, '');
  block = block.replace(/<span class="para-num">[\s\S]*?<\/span>/g, '');
  block = block.replace(/<span class="section-number">[\s\S]*?<\/span>/g, '');
  block = block.replace(/<span class="section-source">[\s\S]*?<\/span>/g, '');
  block = block.replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/g, '');
  block = block.replace(/<span class="src">[\s\S]*?<\/span>/g, '');
  return block;
}

function isValidEnglishParagraph(text) {
  if (text.length < 15) return false;
  if (text.startsWith('←') || text.startsWith('→')) return false;
  if (text.startsWith('Back to') || text.startsWith('Next:') || text.startsWith('Previous:')) return false;
  if (text.startsWith('Table of Contents')) return false;
  // Check it's actually English (has Latin chars)
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  if (latinChars < 5) return false;
  return true;
}

function normalize(text) {
  return (text || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 60);
}

function findJsonFiles(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files = files.concat(findJsonFiles(full));
    else if (item.endsWith('.json') && item !== 'index.json' && item !== 'catalog.json') {
      // Skip torah-N.json duplicates (only process halacha-N.json for LH)
      files.push(full);
    }
  }
  return files.sort((a, b) => {
    const partsA = a.split(path.sep);
    const partsB = b.split(path.sep);
    // Sort by part number first
    const partNumA = parseInt((partsA.find(p => p.startsWith('part-')) || 'part-0').replace('part-', ''));
    const partNumB = parseInt((partsB.find(p => p.startsWith('part-')) || 'part-0').replace('part-', ''));
    if (partNumA !== partNumB) return partNumA - partNumB;
    // Then by file number
    const numA = parseInt((partsA[partsA.length - 1].match(/(\d+)/) || ['0', '0'])[1]);
    const numB = parseInt((partsB[partsB.length - 1].match(/(\d+)/) || ['0', '0'])[1]);
    return numA - numB;
  });
}

/**
 * Core function: fill missing English in reader JSON files from extracted paragraphs.
 * Uses anchor-based sync: find existing English matches as position anchors.
 */
function fillEnglish(readerFiles, allEnglish, label) {
  if (allEnglish.length === 0) {
    console.log(`  ${label}: No English paragraphs extracted`);
    return 0;
  }

  // Build norm map for syncing
  const enNormMap = {};
  for (let i = 0; i < allEnglish.length; i++) {
    const norm = normalize(allEnglish[i]);
    if (norm.length > 15 && !enNormMap[norm]) enNormMap[norm] = i;
  }

  let totalSegs = 0, beforeEn = 0, newMatched = 0, badFixed = 0;
  let lastSyncIdx = 0;
  const modifiedFiles = new Set();

  for (const rf of readerFiles) {
    const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
    if (!data.segments) continue;
    let fileChanged = false;

    // Try to sync position using existing GOOD English
    let syncFound = false;
    for (let i = 0; i < data.segments.length; i++) {
      const seg = data.segments[i];
      if (seg.en && seg.en.trim() && !isBadEnglish(seg.en)) {
        const norm = normalize(seg.en);
        if (norm.length > 15 && enNormMap[norm] !== undefined) {
          lastSyncIdx = enNormMap[norm] - i;
          if (lastSyncIdx < 0) lastSyncIdx = enNormMap[norm];
          syncFound = true;
          break;
        }
      }
    }

    let localIdx = Math.max(0, lastSyncIdx);
    for (let i = 0; i < data.segments.length; i++) {
      const seg = data.segments[i];
      totalSegs++;

      // Check for bad English (HTML/CSS artifacts)
      if (seg.en && isBadEnglish(seg.en)) {
        if (localIdx < allEnglish.length) {
          seg.en = allEnglish[localIdx];
          badFixed++;
          newMatched++;
          fileChanged = true;
          localIdx++;
        }
        continue;
      }

      if (seg.en && seg.en.trim()) {
        beforeEn++;
        localIdx++;
        continue;
      }
      // Segment needs English
      if (localIdx < allEnglish.length) {
        seg.en = allEnglish[localIdx];
        newMatched++;
        fileChanged = true;
        localIdx++;
      }
    }
    lastSyncIdx = localIdx;

    if (fileChanged) {
      data.hasEnglish = true;
      fs.writeFileSync(rf, JSON.stringify(data, null, 2), 'utf8');
      modifiedFiles.add(rf);

      // Also update the torah-N.json duplicate if it exists (for LH)
      const basename = path.basename(rf);
      if (basename.startsWith('halacha-')) {
        const torahFile = path.join(path.dirname(rf), basename.replace('halacha-', 'torah-'));
        if (fs.existsSync(torahFile)) {
          fs.writeFileSync(torahFile, JSON.stringify(data, null, 2), 'utf8');
        }
      }
    }
  }

  const afterEn = beforeEn + newMatched;
  const pct = totalSegs > 0 ? Math.round(afterEn / totalSegs * 100) : 0;
  const beforePct = totalSegs > 0 ? Math.round(beforeEn / totalSegs * 100) : 0;
  console.log(`  ${label}: ${beforePct}% -> ${pct}% (+${newMatched} segs, ${badFixed} bad fixed, ${modifiedFiles.size} files) [${allEnglish.length} EN paras available]`);
  return newMatched;
}

function isBadEnglish(en) {
  if (!en) return false;
  return en.includes('@import') || en.includes('<!DOCTYPE') || en.includes('<style') ||
    en.includes('font-family:') || en.includes('margin:') || en.includes('padding:') ||
    en.includes('background-color:') || en.includes('text-align:');
}

// ============================================================
// BOOK-SPECIFIC PROCESSORS
// ============================================================

/**
 * Process Likutay Halachos
 * Maps 8 translation subfolders to 8 reader parts
 */
function processLH() {
  console.log('\n=== LIKUTAY HALACHOS ===');

  const lhMapping = [
    { folder: 'Likutay Halachos - Orach Chaim - 1', parts: [1] },
    { folder: 'Likutay Halachos - Orach Chaim - 2', parts: [2] },
    { folder: 'Likutay Halachos - Orach Chaim - 3', parts: [3] },
    { folder: 'Likutay Halachos - Yoreh Daya - 1', parts: [4] },
    { folder: 'Likutay Halachos - Yoreh Daya - 2', parts: [5] },
    { folder: 'Likutay Halachos - Evven Hu-ezehr', parts: [6] },
    { folder: 'Likutay Halachos - Choshen Mishpat - 1', parts: [7] },
    { folder: 'Likutay Halachos - Choshen Mishpat - 2', parts: [8] },
  ];

  let grandTotal = 0;
  for (const { folder, parts } of lhMapping) {
    const htmlDir = path.join(TRANS_DIR, 'Likutay Halachos', folder);
    if (!fs.existsSync(htmlDir)) {
      console.log(`  SKIP: ${folder} not found`);
      continue;
    }

    // Read all HTML files in sort order
    const htmlFiles = fs.readdirSync(htmlDir)
      .filter(f => f.endsWith('.html'))
      .sort();

    const allEnglish = [];
    for (const f of htmlFiles) {
      const html = fs.readFileSync(path.join(htmlDir, f), 'utf8');
      allEnglish.push(...extractEnglishFromHtml(html));
    }

    // Get reader files for these parts (only halacha-N.json, not torah-N.json duplicates)
    const readerFiles = [];
    for (const p of parts) {
      const partDir = path.join(READER_DIR, 'likutay-halachos', 'part-' + p);
      if (!fs.existsSync(partDir)) continue;
      const files = fs.readdirSync(partDir)
        .filter(f => f.startsWith('halacha-') && f.endsWith('.json'))
        .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
        .map(f => path.join(partDir, f));
      readerFiles.push(...files);
    }

    grandTotal += fillEnglish(readerFiles, allEnglish, folder);
  }
  return grandTotal;
}

/**
 * Process Likutay Moharan (docx files)
 */
async function processLM() {
  console.log('\n=== LIKUTAY MOHARAN ===');
  let grandTotal = 0;

  // Part 1: Torah 1-286
  const lmDir = path.join(TRANS_DIR, 'Likutay Moharan');
  const part1Dir = path.join(READER_DIR, 'likutay-moharan', 'part-1');
  const part2Dir = path.join(READER_DIR, 'likutay-moharan', 'part-2');

  // Process Part 1 torah files
  const readerPart1Files = fs.readdirSync(part1Dir)
    .filter(f => f.startsWith('torah-') && f.endsWith('.json'))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  let part1Filled = 0;
  for (const rf of readerPart1Files) {
    const torahNum = parseInt(rf.match(/\d+/)[0]);
    const docxFile = path.join(lmDir, `Torah ${torahNum}.docx`);
    if (!fs.existsSync(docxFile)) continue;

    const readerPath = path.join(part1Dir, rf);
    const data = JSON.parse(fs.readFileSync(readerPath, 'utf8'));

    // Check if already has full English
    const missingEn = data.segments.filter(s => !s.en || !s.en.trim() || isBadEnglish(s.en));
    if (missingEn.length === 0) continue;

    try {
      const result = await mammoth.convertToHtml({ path: docxFile });
      const paras = extractEnglishFromHtml(result.value);
      if (paras.length === 0) continue;

      const filled = fillEnglishSingleFile(data, paras);
      if (filled > 0) {
        data.hasEnglish = true;
        fs.writeFileSync(readerPath, JSON.stringify(data, null, 2), 'utf8');
        part1Filled += filled;
      }
    } catch (e) {
      // skip
    }
  }
  console.log(`  Part 1: +${part1Filled} segments filled`);
  grandTotal += part1Filled;

  // Part 2: lkm2 001-125
  const vol2Dir = path.join(lmDir, 'Volume 2');
  if (fs.existsSync(vol2Dir)) {
    const readerPart2Files = fs.readdirSync(part2Dir)
      .filter(f => f.startsWith('torah-') && f.endsWith('.json'))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

    let part2Filled = 0;
    for (const rf of readerPart2Files) {
      const torahNum = parseInt(rf.match(/\d+/)[0]);
      // Try lkm2 NNN.docx format
      const paddedNum = String(torahNum).padStart(3, '0');
      const docxFile = path.join(vol2Dir, `lkm2 ${paddedNum}.docx`);
      if (!fs.existsSync(docxFile)) continue;

      const readerPath = path.join(part2Dir, rf);
      const data = JSON.parse(fs.readFileSync(readerPath, 'utf8'));

      const missingEn = data.segments.filter(s => !s.en || !s.en.trim() || isBadEnglish(s.en));
      if (missingEn.length === 0) continue;

      try {
        const result = await mammoth.convertToHtml({ path: docxFile });
        const paras = extractEnglishFromHtml(result.value);
        if (paras.length === 0) continue;

        const filled = fillEnglishSingleFile(data, paras);
        if (filled > 0) {
          data.hasEnglish = true;
          fs.writeFileSync(readerPath, JSON.stringify(data, null, 2), 'utf8');
          part2Filled += filled;
        }
      } catch (e) {
        // skip
      }
    }
    console.log(`  Part 2: +${part2Filled} segments filled`);
    grandTotal += part2Filled;
  }

  return grandTotal;
}

/**
 * Fill English for a single reader file from extracted paragraphs.
 * Returns number of segments filled.
 */
function fillEnglishSingleFile(data, paras) {
  if (!data.segments || paras.length === 0) return 0;

  // Build norm map from existing English for sync
  const enNormMap = {};
  for (let i = 0; i < paras.length; i++) {
    const norm = normalize(paras[i]);
    if (norm.length > 15 && !enNormMap[norm]) enNormMap[norm] = i;
  }

  // Find sync point from existing good English
  let startIdx = 0;
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i];
    if (seg.en && seg.en.trim() && !isBadEnglish(seg.en)) {
      const norm = normalize(seg.en);
      if (norm.length > 15 && enNormMap[norm] !== undefined) {
        startIdx = enNormMap[norm] - i;
        if (startIdx < 0) startIdx = 0;
        break;
      }
    }
  }

  let filled = 0;
  let paraIdx = Math.max(0, startIdx);
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i];
    if (seg.en && seg.en.trim() && !isBadEnglish(seg.en)) {
      paraIdx++;
      continue;
    }
    if (paraIdx < paras.length) {
      seg.en = paras[paraIdx];
      filled++;
      paraIdx++;
    }
  }
  return filled;
}

/**
 * Process Likutay Tefilos (HTML files)
 */
function processLT() {
  console.log('\n=== LIKUTAY TEFILOS ===');

  const ltDir = path.join(TRANS_DIR, 'Likutay Tefilos');
  if (!fs.existsSync(ltDir)) {
    console.log('  SKIP: Folder not found');
    return 0;
  }

  const htmlFiles = fs.readdirSync(ltDir).filter(f => f.endsWith('.html')).sort();

  // Map HTML files to reader files by prayer number
  const readerBase = path.join(READER_DIR, 'likutay-tefilos');
  let grandTotal = 0;

  for (const hf of htmlFiles) {
    // Extract prayer number from filename: likutay_tefilos_NN_prayerNN.html
    const numMatch = hf.match(/prayer(\d+)/i);
    if (!numMatch) continue;
    const prayerNum = parseInt(numMatch[1]);

    // Determine which part (part-1: 1-56, part-2: 57-84, part-3: 85+)
    let partNum;
    if (prayerNum <= 56) partNum = 1;
    else if (prayerNum <= 84) partNum = 2;
    else partNum = 3;

    const readerFile = path.join(readerBase, 'part-' + partNum, 'prayer-' + prayerNum + '.json');
    if (!fs.existsSync(readerFile)) continue;

    const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
    const missingEn = data.segments.filter(s => !s.en || !s.en.trim() || isBadEnglish(s.en));
    if (missingEn.length === 0) continue;

    const html = fs.readFileSync(path.join(ltDir, hf), 'utf8');
    const paras = extractEnglishFromHtml(html);
    if (paras.length === 0) continue;

    const filled = fillEnglishSingleFile(data, paras);
    if (filled > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');
      grandTotal += filled;
    }
  }

  // Also handle special files (hakdama, purim tefilos)
  // likutay_tefilos_00_hakdama.html -> prayer-0.json or part intro
  // likutay_tefilos_II_37_purim.html -> part-2/prayer-37.json
  // etc.
  for (const hf of htmlFiles) {
    if (hf.includes('_II_')) {
      const numMatch = hf.match(/(\d+)/g);
      if (numMatch) {
        const prayerNum = parseInt(numMatch[numMatch.length - 1]);
        const readerFile = path.join(readerBase, 'part-2', 'prayer-' + prayerNum + '.json');
        if (fs.existsSync(readerFile)) {
          const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
          const missingEn = data.segments.filter(s => !s.en || !s.en.trim());
          if (missingEn.length > 0) {
            const html = fs.readFileSync(path.join(ltDir, hf), 'utf8');
            const paras = extractEnglishFromHtml(html);
            const filled = fillEnglishSingleFile(data, paras);
            if (filled > 0) {
              data.hasEnglish = true;
              fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');
              grandTotal += filled;
            }
          }
        }
      }
    }
  }

  console.log(`  Total: +${grandTotal} segments filled`);
  return grandTotal;
}

/**
 * Process Sefer Hamidos (docx file)
 */
async function processSM() {
  console.log('\n=== SEFER HAMIDOS ===');

  // Try the main published docx
  const smFile = path.join(TRANS_DIR, 'Sefer Hamidos Eng Heb published', 'Sefer Hamidos - Hebrew English - fixed up from after publication.docx');
  if (!fs.existsSync(smFile)) {
    console.log('  SKIP: Main docx not found');
    return 0;
  }

  try {
    const result = await mammoth.convertToHtml({ path: smFile });
    const allParas = extractEnglishFromHtml(result.value);
    console.log(`  Extracted ${allParas.length} paragraphs from docx`);

    // Filter to only English paragraphs (remove Hebrew)
    const engParas = allParas.filter(p => {
      const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
      const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
      return latinChars > hebrewChars;
    });
    console.log(`  ${engParas.length} English paragraphs after filtering`);

    // Get reader files
    const smDir = path.join(READER_DIR, 'sefer-hamidos');
    const readerFiles = fs.readdirSync(smDir)
      .filter(f => f.startsWith('topic-') && f.endsWith('.json'))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]))
      .map(f => path.join(smDir, f));

    return fillEnglish(readerFiles, engParas, 'Sefer Hamidos');
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    return 0;
  }
}

/**
 * Process Sipurey Maasiyos (from Legendary Tales docx/odt)
 */
async function processSipurey() {
  console.log('\n=== SIPUREY MAASIYOS ===');

  const storiesDir = path.join(TRANS_DIR, 'The Stories of Rabbi Nachman and Saba');
  if (!fs.existsSync(storiesDir)) {
    console.log('  SKIP: Folder not found');
    return 0;
  }

  // Try the main docx files
  const docxFiles = fs.readdirSync(storiesDir)
    .filter(f => f.endsWith('.docx') && !f.startsWith('~$') && f.includes('Legendary'))
    .sort();

  const allParas = [];
  for (const f of docxFiles) {
    try {
      const result = await mammoth.convertToHtml({ path: path.join(storiesDir, f) });
      const paras = extractEnglishFromHtml(result.value);
      allParas.push(...paras);
    } catch (e) { /* skip */ }
  }

  if (allParas.length === 0) {
    console.log('  No paragraphs extracted');
    return 0;
  }

  const readerDir = path.join(READER_DIR, 'sipurey-maasiyos');
  const readerFiles = findJsonFiles(readerDir)
    .filter(f => !path.basename(f).startsWith('torah-')); // Avoid duplicates

  return fillEnglish(readerFiles, allParas, 'Sipurey Maasiyos');
}

/**
 * Process additional books from Translations/ that have docx files
 */
async function processAdditionalBooks() {
  console.log('\n=== ADDITIONAL BOOKS ===');
  let grandTotal = 0;

  // Outpouring of the Soul -> hashtatfchus-hanefesh
  const outpouringDir = path.join(TRANS_DIR, 'Outpouring of the Soul');
  if (fs.existsSync(outpouringDir)) {
    const docxFiles = fs.readdirSync(outpouringDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of docxFiles) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(outpouringDir, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'hashtatfchus-hanefesh'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Hashtatfchus HaNefesh');
    }
  }

  // Revival of the Soul -> meshivas-nefesh
  const revivalDir = path.join(TRANS_DIR, 'Revival of the Soul');
  if (fs.existsSync(revivalDir)) {
    const docxFiles = fs.readdirSync(revivalDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of docxFiles) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(revivalDir, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'meshivas-nefesh'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Meshivas Nefesh');
    }
  }

  // Words of Rabbi Nachman -> sichos-haran
  const wordsDir = path.join(TRANS_DIR, 'Words of Rabbi Nachman');
  if (fs.existsSync(wordsDir)) {
    const docxFiles = fs.readdirSync(wordsDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of docxFiles) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(wordsDir, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'sichos-haran'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Sichos HaRan');
    }
  }

  // The Praises of Rabbi Nachman -> shivchay-haran / praises-of-rabbi-nachman
  const praisesDir = path.join(TRANS_DIR, 'The Praises of Rabbi Nachman');
  if (fs.existsSync(praisesDir)) {
    const docxFiles = fs.readdirSync(praisesDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of docxFiles) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(praisesDir, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      // Try both reader directories
      for (const bookId of ['shivchay-haran', 'praises-of-rabbi-nachman']) {
        const dir = path.join(READER_DIR, bookId);
        if (fs.existsSync(dir)) {
          const readerFiles = findJsonFiles(dir).filter(f => !path.basename(f).startsWith('torah-'));
          grandTotal += fillEnglish(readerFiles, allParas, bookId);
        }
      }
    }
  }

  // The Life of our Leader Rabbi Nachman -> chayey-moharan
  const lifeDir = path.join(TRANS_DIR, 'The Life of our Leader Rabbi Nachman');
  if (fs.existsSync(lifeDir)) {
    const docxFiles = fs.readdirSync(lifeDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of docxFiles) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(lifeDir, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'chayey-moharan'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Chayey Moharan');
    }
  }

  // A Collection of Advice -> likutay-eitzos
  const adviceFile = path.join(TRANS_DIR, 'A Collection of Advice.docx');
  if (fs.existsSync(adviceFile)) {
    try {
      const result = await mammoth.convertToHtml({ path: adviceFile });
      const paras = extractEnglishFromHtml(result.value).filter(p => {
        const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
        const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
        return latinChars > hebrewChars;
      });
      if (paras.length > 0) {
        const readerFiles = findJsonFiles(path.join(READER_DIR, 'likutay-eitzos'))
          .filter(f => !path.basename(f).startsWith('torah-'));
        grandTotal += fillEnglish(readerFiles, paras, 'Likutay Eitzos');
      }
    } catch (e) { /* skip */ }
  }

  // Guidance Elucidated -> aitzoas-hamivooaroas or shimshon-עצות-המבוארות
  const guidanceFile = path.join(TRANS_DIR, 'Guidance Elucidated - Aitzos Hamivoaroas - shishon barski.docx');
  if (fs.existsSync(guidanceFile)) {
    try {
      const result = await mammoth.convertToHtml({ path: guidanceFile });
      const paras = extractEnglishFromHtml(result.value).filter(p => {
        const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
        const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
        return latinChars > hebrewChars;
      });
      if (paras.length > 0) {
        for (const bookId of ['aitzoas-hamivooaroas', 'shimshon-עצות-המבוארות']) {
          const dir = path.join(READER_DIR, bookId);
          if (fs.existsSync(dir)) {
            const readerFiles = findJsonFiles(dir).filter(f => !path.basename(f).startsWith('torah-'));
            grandTotal += fillEnglish(readerFiles, paras, bookId);
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  // Hisbodidus Alone Time -> hisbodidus-alone-time
  const hisbDir = path.join(TRANS_DIR, 'Hisbodidus Alone Time');
  if (fs.existsSync(hisbDir)) {
    const docxFiles = fs.readdirSync(hisbDir).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of docxFiles) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(hisbDir, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'hisbodidus-alone-time'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Hisbodidus Alone Time');
    }
  }

  // The Seven Pillars -> seven-pillars
  const pillarsDir = path.join(TRANS_DIR, 'The Seven Pillars');
  if (fs.existsSync(pillarsDir)) {
    const files = fs.readdirSync(pillarsDir).filter(f => (f.endsWith('.docx') || f.endsWith('.html')) && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of files) {
      const fp = path.join(pillarsDir, f);
      if (f.endsWith('.html')) {
        allParas.push(...extractEnglishFromHtml(fs.readFileSync(fp, 'utf8')));
      } else {
        try {
          const result = await mammoth.convertToHtml({ path: fp });
          allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
            const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
            const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
            return latinChars > hebrewChars;
          }));
        } catch (e) { /* skip */ }
      }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'seven-pillars'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Seven Pillars');
    }
  }

  // Fires of Israel -> fires-of-israel
  const firesDir = path.join(TRANS_DIR, 'Fires of Israel');
  if (fs.existsSync(firesDir)) {
    const files = fs.readdirSync(firesDir).filter(f => (f.endsWith('.docx') || f.endsWith('.html')) && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of files) {
      const fp = path.join(firesDir, f);
      if (f.endsWith('.html')) {
        allParas.push(...extractEnglishFromHtml(fs.readFileSync(fp, 'utf8')));
      } else {
        try {
          const result = await mammoth.convertToHtml({ path: fp });
          allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
            const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
            const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
            return latinChars > hebrewChars;
          }));
        } catch (e) { /* skip */ }
      }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'fires-of-israel'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Fires of Israel');
    }
  }

  // Prayers folder -> likutay-tefilos (additional prayers)
  const prayersDir = path.join(TRANS_DIR, 'Prayers');
  if (fs.existsSync(prayersDir)) {
    const files = fs.readdirSync(prayersDir).filter(f => (f.endsWith('.docx') || f.endsWith('.html')) && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of files) {
      const fp = path.join(prayersDir, f);
      if (f.endsWith('.html')) {
        allParas.push(...extractEnglishFromHtml(fs.readFileSync(fp, 'utf8')));
      } else {
        try {
          const result = await mammoth.convertToHtml({ path: fp });
          allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
            const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
            const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
            return latinChars > hebrewChars;
          }));
        } catch (e) { /* skip */ }
      }
    }
    if (allParas.length > 0) {
      const ltBase = path.join(READER_DIR, 'likutay-tefilos');
      const readerFiles = findJsonFiles(ltBase)
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Prayers -> LT');
    }
  }

  // Blossoms of the Spring -> check reader for matching book
  const blossomsDir = path.join(TRANS_DIR, 'Blossoms of the Spring');
  if (fs.existsSync(blossomsDir)) {
    const files = fs.readdirSync(blossomsDir).filter(f => (f.endsWith('.docx') || f.endsWith('.html')) && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of files) {
      const fp = path.join(blossomsDir, f);
      if (f.endsWith('.html')) {
        allParas.push(...extractEnglishFromHtml(fs.readFileSync(fp, 'utf8')));
      } else {
        try {
          const result = await mammoth.convertToHtml({ path: fp });
          allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
            const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
            const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
            return latinChars > hebrewChars;
          }));
        } catch (e) { /* skip */ }
      }
    }
    if (allParas.length > 0) {
      // Ebay HaNachal = Blossoms of the Stream
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'ebay-hanachal'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Ebay HaNachal (Blossoms)');
    }
  }

  // Live Up the Good Points - Azamru -> azamra
  const azamraFile = path.join(TRANS_DIR, 'Live Up the Good Points - Azamru');
  if (fs.existsSync(azamraFile) && fs.statSync(azamraFile).isDirectory()) {
    const files = fs.readdirSync(azamraFile).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of files) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(azamraFile, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'azamra'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Azamra');
    }
  }

  // Hiskashrus latzadik -> kuntrass-hiskashrus
  const hiskFile = path.join(TRANS_DIR, 'Hiskashrus latzadik - Shmuel Horowitz');
  if (fs.existsSync(hiskFile) && fs.statSync(hiskFile).isDirectory()) {
    const files = fs.readdirSync(hiskFile).filter(f => f.endsWith('.docx') && !f.startsWith('~$')).sort();
    const allParas = [];
    for (const f of files) {
      try {
        const result = await mammoth.convertToHtml({ path: path.join(hiskFile, f) });
        allParas.push(...extractEnglishFromHtml(result.value).filter(p => {
          const hebrewChars = (p.match(/[\u0590-\u05FF]/g) || []).length;
          const latinChars = (p.match(/[a-zA-Z]/g) || []).length;
          return latinChars > hebrewChars;
        }));
      } catch (e) { /* skip */ }
    }
    if (allParas.length > 0) {
      const readerFiles = findJsonFiles(path.join(READER_DIR, 'kuntrass-hiskashrus'))
        .filter(f => !path.basename(f).startsWith('torah-'));
      grandTotal += fillEnglish(readerFiles, allParas, 'Kuntrass Hiskashrus');
    }
  }

  return grandTotal;
}

// ============================================================
// FINAL REPORT
// ============================================================

function generateReport() {
  console.log('\n=== FINAL ENGLISH COVERAGE REPORT ===');
  const books = fs.readdirSync(READER_DIR).filter(f => {
    const fp = path.join(READER_DIR, f);
    return fs.statSync(fp).isDirectory() && f !== 'catalog.json';
  }).sort();

  let grandTotal = 0, grandEn = 0;
  for (const book of books) {
    const bookDir = path.join(READER_DIR, book);
    let total = 0, withEn = 0;

    function scan(dir) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) scan(full);
        else if (item.endsWith('.json') && item !== 'index.json' && !item.startsWith('torah-')) {
          try {
            const data = JSON.parse(fs.readFileSync(full, 'utf8'));
            for (const s of (data.segments || [])) {
              total++;
              if (s.en && s.en.trim() && !isBadEnglish(s.en)) withEn++;
            }
          } catch (e) { /* skip */ }
        }
      }
    }
    scan(bookDir);

    if (total > 0) {
      const pct = Math.round(withEn / total * 100);
      const marker = pct === 100 ? ' [COMPLETE]' : pct >= 90 ? ' [NEAR]' : '';
      if (pct < 100 && total > 5) {
        console.log(`  ${book}: ${withEn}/${total} (${pct}%)${marker}`);
      }
      grandTotal += total;
      grandEn += withEn;
    }
  }
  console.log(`\n  OVERALL: ${grandEn}/${grandTotal} (${Math.round(grandEn / grandTotal * 100)}%)`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('=== English Translation Import ===');
  console.log('Source: ' + TRANS_DIR);
  console.log('Target: ' + READER_DIR);

  let grandTotal = 0;

  // Process each book
  grandTotal += processLH();
  grandTotal += await processLM();
  grandTotal += processLT();
  grandTotal += await processSM();
  grandTotal += await processSipurey();
  grandTotal += await processAdditionalBooks();

  console.log(`\n=== GRAND TOTAL: ${grandTotal} new English segments filled ===`);

  generateReport();
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
