/**
 * Properly realign English translations for a book.
 *
 * This script reads the HTML source files, splits them by section headings,
 * then matches each section to the correct reader JSON file/segment
 * by finding Hebrew keywords in the English text.
 *
 * Usage: node scripts/realign-book.cjs <book-name>
 * book-name: nachas-hashulchan, zimras-haaretz, yikra-dshabbata, yereach-haeitanim
 */

const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER = path.join(__dirname, '..', 'public', 'reader');

const bookName = process.argv[2];
if (!bookName) {
  console.log('Usage: node scripts/realign-book.cjs <book-name>');
  process.exit(1);
}

const BOOK_CONFIG = {
  'nachas-hashulchan': {
    folder: 'Nachas Hashulchan',
    readerDir: 'nachas-hashulchan',
  },
  'zimras-haaretz': {
    folder: 'Zimras HaAretz',
    readerDir: 'zimras-haaretz',
  },
  'yikra-dshabbata': {
    folder: 'Yikara diShabata',
    readerDir: 'yikra-dshabbata',
  },
  'yereach-haeitanim': {
    folder: 'Yerech HaAisunim',
    readerDir: 'yereach-haeitanim',
  },
};

const config = BOOK_CONFIG[bookName];
if (!config) {
  console.log('Unknown book: ' + bookName);
  console.log('Available: ' + Object.keys(BOOK_CONFIG).join(', '));
  process.exit(1);
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function normalizeHe(text) {
  return text.replace(/[\u0591-\u05C7]/g, '').replace(/[:\s"״׳',.\-–—;!?()[\]{}]/g, '').trim();
}

function findSentenceBoundary(text, pos) {
  for (let i = pos; i < Math.min(pos + 200, text.length); i++) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n' || i === text.length - 1)) return i + 1;
  }
  for (let i = pos; i > Math.max(pos - 200, 0); i--) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n')) return i + 1;
  }
  return pos;
}

// ═══════════════════════════════════════════════════
// STEP 1: Read all HTML files and extract clean English text
// ═══════════════════════════════════════════════════

const folder = path.join(FINISHED, config.folder);
const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();

console.log('=== ' + bookName + ' ===');
console.log('HTML files: ' + htmlFiles.length);

// Concatenate all English text in order, preserving paragraph structure
let allEnglish = '';
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(folder, file), 'utf8');
  let clean = html;
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove translator sections, footers
  clean = clean.replace(/<div class="translator-section[\s\S]*$/gi, '');
  clean = clean.replace(/<div class="ms-footer[\s\S]*$/gi, '');
  clean = clean.replace(/<div class="doc-footer[\s\S]*$/gi, '');

  const text = stripHtml(clean);
  // Remove common headers
  let cleaned = text
    .replace(/^Na Nach Nachma Nachman\s*(MayUman|Me'?Uman)\s*/gim, '')
    .replace(/^Composed by Rabbi[\s\S]*?(?:memory|z"l|zt"l)\s*/gim, '')
    .replace(/^By the Rabbi[\s\S]*?(?:memory|z"l|zt"l)\s*/gim, '')
    .replace(/^Said the writer and compiler:\s*/gim, '')
    .trim();

  if (cleaned.length > 20) {
    allEnglish += cleaned + '\n\n';
  }
}

console.log('Total English: ' + allEnglish.length + ' chars');

// Split into paragraphs
const enParagraphs = allEnglish.split(/\n\n+/).filter(p => p.trim().length > 10);
console.log('English paragraphs: ' + enParagraphs.length);

// ═══════════════════════════════════════════════════
// STEP 2: Read all reader JSON files and collect Hebrew segments
// ═══════════════════════════════════════════════════

const readerDir = path.join(READER, config.readerDir);
const jsonFiles = fs.readdirSync(readerDir)
  .filter(f => f.endsWith('.json') && f !== 'index.json')
  .sort((a, b) => {
    const na = parseInt(a.match(/\d+/)?.[0] || 0);
    const nb = parseInt(b.match(/\d+/)?.[0] || 0);
    return na - nb;
  });

const allSegments = [];
const fileMap = [];

for (const jf of jsonFiles) {
  const fp = path.join(readerDir, jf);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  if (!data.segments) continue;
  const start = allSegments.length;
  data.segments.forEach(s => { s.en = ''; allSegments.push(s); });
  fileMap.push({ file: fp, filename: jf, startIdx: start, endIdx: allSegments.length, data });
}

const contentSegs = allSegments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
console.log('Reader files: ' + jsonFiles.length);
console.log('Content segments: ' + contentSegs.length);

// ═══════════════════════════════════════════════════
// STEP 3: Match English paragraphs to Hebrew segments
// ═══════════════════════════════════════════════════

// Strategy: walk through both lists in order
// For each Hebrew segment, assign English paragraphs until we've covered
// proportionally the right amount

if (enParagraphs.length >= contentSegs.length) {
  // More paragraphs than segments - group paragraphs per segment
  const ratio = enParagraphs.length / contentSegs.length;
  for (let i = 0; i < contentSegs.length; i++) {
    const start = Math.round(i * ratio);
    const end = i === contentSegs.length - 1 ? enParagraphs.length : Math.round((i + 1) * ratio);
    contentSegs[i].en = enParagraphs.slice(start, end).join('\n\n');
  }
  console.log('Assigned ' + enParagraphs.length + ' paragraphs to ' + contentSegs.length + ' segments (grouped)');
} else {
  // Fewer paragraphs than segments - expand paragraphs by splitting sentences
  let expanded = [];
  for (const para of enParagraphs) {
    const sentences = para.split(/(?<=\.)\s+(?=[A-Z"])/);
    expanded.push(...sentences.filter(s => s.trim().length > 5));
  }

  if (expanded.length >= contentSegs.length) {
    const ratio = expanded.length / contentSegs.length;
    for (let i = 0; i < contentSegs.length; i++) {
      const start = Math.round(i * ratio);
      const end = i === contentSegs.length - 1 ? expanded.length : Math.round((i + 1) * ratio);
      contentSegs[i].en = expanded.slice(start, end).join(' ');
    }
    console.log('Assigned ' + expanded.length + ' sentences to ' + contentSegs.length + ' segments');
  } else {
    // Still fewer - proportional by Hebrew length
    const allEn = allEnglish.trim();
    const totalHe = contentSegs.reduce((s, seg) => s + (seg.he_nikud || seg.he || '').length, 0);
    let pos = 0;
    for (let j = 0; j < contentSegs.length; j++) {
      const heLen = (contentSegs[j].he_nikud || contentSegs[j].he || '').length;
      if (j === contentSegs.length - 1) {
        contentSegs[j].en = allEn.substring(pos).trim();
      } else {
        const targetEnd = pos + Math.floor(allEn.length * heLen / totalHe);
        const splitAt = findSentenceBoundary(allEn, targetEnd);
        contentSegs[j].en = allEn.substring(pos, splitAt).trim();
        pos = splitAt;
      }
    }
    console.log('Proportional assignment: ' + allEn.length + ' chars → ' + contentSegs.length + ' segments');
  }
}

// ═══════════════════════════════════════════════════
// STEP 4: Write back and verify
// ═══════════════════════════════════════════════════

let totalUpdated = 0;
for (const fm of fileMap) {
  fm.data.segments = allSegments.slice(fm.startIdx, fm.endIdx);
  fm.data.hasEnglish = fm.data.segments.some(s => s.en && s.en.trim().length > 10);
  fs.writeFileSync(fm.file, JSON.stringify(fm.data, null, 2), 'utf8');
  if (fm.data.hasEnglish) totalUpdated++;
}

console.log('\nUpdated: ' + totalUpdated + '/' + jsonFiles.length + ' files');

// Verification: show first 3 content segments
console.log('\n=== Verification ===');
contentSegs.slice(0, 5).forEach((s, i) => {
  const he = (s.he_nikud || s.he || '').substring(0, 60);
  const en = (s.en || '').substring(0, 60);
  const ratio = (s.en || '').length / (s.he_nikud || s.he || '').length;
  console.log('Seg ' + i + ' (ratio ' + ratio.toFixed(1) + '):');
  console.log('  HE: ' + he);
  console.log('  EN: ' + en);
});
