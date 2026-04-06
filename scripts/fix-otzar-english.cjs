/**
 * Fix Otzar HaYirah English coverage.
 * The HTML files have <div class="para"> with <span class="para-text"> containing English.
 * Reader JSON has torah-N.json files split by segment count.
 * Strategy: Extract ALL English paragraphs from ALL HTML files sequentially,
 * then assign them to reader segments sequentially (since both are in order).
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = 'public/reader/otzar-hayirah/part-1';
const FINISHED_DIRS = [
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 1',
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 2',
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 4',
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzer volume Mem',
];

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

function extractParasFromHtml(htmlContent) {
  const paras = [];

  // Method 1: <div class="para"> with <span class="para-text">
  const paraParts = htmlContent.split(/<div class="para">/);
  if (paraParts.length > 1) {
    for (let i = 1; i < paraParts.length; i++) {
      const block = paraParts[i];
      const endIdx = block.indexOf('</div>');
      if (endIdx < 0) continue;
      let content = block.substring(0, endIdx);
      // Remove source-ref and para-num
      content = content.replace(/<span class="source-ref">[\s\S]*?<\/span>/g, '');
      content = content.replace(/<span class="para-num">[\s\S]*?<\/span>/g, '');
      const text = stripHtml(content);
      if (text.length > 20) paras.push(text);
    }
    if (paras.length > 0) return paras;
  }

  // Method 2: <div class="section"> (Oatzar volumes 2+)
  const sectionParts = htmlContent.split(/<div class="section">/);
  if (sectionParts.length > 1) {
    for (let i = 1; i < sectionParts.length; i++) {
      // Find the closing </div> for this section (may have nested divs)
      let depth = 1;
      let pos = 0;
      const block = sectionParts[i];
      while (depth > 0 && pos < block.length) {
        const openIdx = block.indexOf('<div', pos);
        const closeIdx = block.indexOf('</div>', pos);
        if (closeIdx < 0) break;
        if (openIdx >= 0 && openIdx < closeIdx) { depth++; pos = openIdx + 4; }
        else { depth--; if (depth === 0) { pos = closeIdx; break; } pos = closeIdx + 6; }
      }
      let content = block.substring(0, pos);
      // Remove section-number, section-source, heb-term spans
      content = content.replace(/<span class="section-number">[\s\S]*?<\/span>/g, '');
      content = content.replace(/<span class="section-source">[\s\S]*?<\/span>/g, '');
      const text = stripHtml(content);
      if (text.length > 20) paras.push(text);
    }
    if (paras.length > 0) return paras;
  }

  // Method 3: Fallback - all <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(htmlContent)) !== null) {
    const text = stripHtml(match[1]);
    if (text.length > 30 && !text.startsWith('←') && !text.startsWith('→')) {
      paras.push(text);
    }
  }
  return paras;
}

// Collect all English paragraphs from all HTML files in order
const allEnglish = [];
for (const dir of FINISHED_DIRS) {
  if (!fs.existsSync(dir)) { console.log(`SKIP: ${dir}`); continue; }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
  console.log(`${dir}: ${files.length} HTML files`);
  for (const f of files) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const paras = extractParasFromHtml(html);
    allEnglish.push(...paras);
  }
}
console.log(`Total English paragraphs extracted: ${allEnglish.length}`);

// Load all reader JSON files in order
const readerFiles = fs.readdirSync(READER_DIR)
  .filter(f => f.startsWith('torah-') && f.endsWith('.json'))
  .sort((a, b) => {
    const na = parseInt(a.match(/(\d+)/)[1]);
    const nb = parseInt(b.match(/(\d+)/)[1]);
    return na - nb;
  });

console.log(`Reader files: ${readerFiles.length}`);

// Collect all segments that need English
let totalSegs = 0;
let alreadyHasEn = 0;
let needsEn = 0;
const allSegRefs = []; // {file, segIndex, seg}

for (const rf of readerFiles) {
  const data = JSON.parse(fs.readFileSync(path.join(READER_DIR, rf), 'utf8'));
  for (let i = 0; i < data.segments.length; i++) {
    totalSegs++;
    if (data.segments[i].en && data.segments[i].en.trim()) {
      alreadyHasEn++;
    } else {
      needsEn++;
    }
    allSegRefs.push({ file: rf, segIndex: i, seg: data.segments[i], data });
  }
}

console.log(`Total segments: ${totalSegs}, already has English: ${alreadyHasEn}, needs: ${needsEn}`);

// Now try to match English paragraphs to segments missing English
// Strategy: Go through segments in order. For each one that has English, try to find
// its match in the English array to sync our position. For ones without English,
// use the next available English paragraph.

let enIdx = 0;
let matched = 0;
const modifiedFiles = new Set();

// First pass: try to sync by finding existing English matches
// Build a map of existing English -> position in allEnglish
function normalize(text) {
  return text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 60);
}

const enNormMap = {};
for (let i = 0; i < allEnglish.length; i++) {
  const norm = normalize(allEnglish[i]);
  if (norm.length > 20 && !enNormMap[norm]) {
    enNormMap[norm] = i;
  }
}

// Find the starting position for each file by matching existing English
let lastSyncedEnIdx = 0;

for (const rf of readerFiles) {
  const filePath = path.join(READER_DIR, rf);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let fileChanged = false;

  // Try to find sync point: look for first segment with English and find it in allEnglish
  let syncIdx = -1;
  for (const seg of data.segments) {
    if (seg.en && seg.en.trim()) {
      const norm = normalize(seg.en);
      if (norm.length > 20 && enNormMap[norm] !== undefined) {
        syncIdx = enNormMap[norm];
        break;
      }
    }
  }

  if (syncIdx >= 0) {
    // Found sync point — rewind to account for segments before the matched one
    const firstEnSegIdx = data.segments.findIndex(s => s.en && s.en.trim());
    lastSyncedEnIdx = Math.max(0, syncIdx - firstEnSegIdx);
  }

  // Assign English to segments that don't have it
  let localEnIdx = lastSyncedEnIdx;
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i];
    if (seg.en && seg.en.trim()) {
      localEnIdx++;
      continue;
    }

    if (localEnIdx < allEnglish.length) {
      seg.en = allEnglish[localEnIdx];
      matched++;
      fileChanged = true;
      localEnIdx++;
    }
  }

  lastSyncedEnIdx = localEnIdx;

  if (fileChanged) {
    data.hasEnglish = true;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    modifiedFiles.add(rf);
  }
}

console.log(`\nMatched: ${matched} new segments across ${modifiedFiles.size} files`);
console.log(`Final coverage: ${alreadyHasEn + matched}/${totalSegs} (${Math.round((alreadyHasEn + matched) / totalSegs * 100)}%)`);
