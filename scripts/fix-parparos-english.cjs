/**
 * Fix Parparos LeChochma English coverage using sequential assignment.
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = 'public/reader/parparos-lechochma';
const FINISHED_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh';

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

// Extract all paragraphs from HTML
const allEnglish = [];
const files = fs.readdirSync(FINISHED_DIR).filter(f => f.endsWith('.html')).sort();
console.log(`HTML files: ${files.length}`);

for (const f of files) {
  const html = fs.readFileSync(path.join(FINISHED_DIR, f), 'utf8');

  // Extract from <p> tags and <h3 class="sub"> headings
  const regex = /<(?:p|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let content = match[1];
    // Remove source refs
    content = content.replace(/<span class="src">[\s\S]*?<\/span>/g, '');
    const text = stripHtml(content);
    if (text.length > 30 && !text.startsWith('←') && !text.startsWith('→') && !text.startsWith('Back')) {
      allEnglish.push(text);
    }
  }
}
console.log(`Total English paragraphs: ${allEnglish.length}`);

// Load reader files
function findJsonFiles(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) results = results.concat(findJsonFiles(full));
    else if (item.endsWith('.json') && item !== 'index.json') results.push(full);
  }
  return results.sort((a, b) => {
    const na = parseInt(a.match(/(\d+)/g).pop());
    const nb = parseInt(b.match(/(\d+)/g).pop());
    return na - nb;
  });
}

const readerFiles = findJsonFiles(READER_DIR);
console.log(`Reader files: ${readerFiles.length}`);

// Count before
let totalSegs = 0, beforeEn = 0;
for (const rf of readerFiles) {
  const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
  for (const seg of data.segments) {
    totalSegs++;
    if (seg.en && seg.en.trim()) beforeEn++;
  }
}
console.log(`Before: ${beforeEn}/${totalSegs} (${Math.round(beforeEn/totalSegs*100)}%)`);

// Sync and assign using same approach as Otzar
function normalize(text) {
  return text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 60);
}

const enNormMap = {};
for (let i = 0; i < allEnglish.length; i++) {
  const norm = normalize(allEnglish[i]);
  if (norm.length > 20 && !enNormMap[norm]) enNormMap[norm] = i;
}

let lastSyncedEnIdx = 0;
let matched = 0;
let modifiedFiles = 0;

for (const rf of readerFiles) {
  const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
  let fileChanged = false;

  // Try to sync
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
    const firstEnSegIdx = data.segments.findIndex(s => s.en && s.en.trim());
    lastSyncedEnIdx = Math.max(0, syncIdx - firstEnSegIdx);
  }

  let localEnIdx = lastSyncedEnIdx;
  for (const seg of data.segments) {
    if (seg.en && seg.en.trim()) { localEnIdx++; continue; }
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
    fs.writeFileSync(rf, JSON.stringify(data, null, 2), 'utf8');
    modifiedFiles++;
  }
}

console.log(`\nMatched: ${matched} new segments across ${modifiedFiles} files`);
console.log(`Final coverage: ${beforeEn + matched}/${totalSegs} (${Math.round((beforeEn + matched)/totalSegs*100)}%)`);
