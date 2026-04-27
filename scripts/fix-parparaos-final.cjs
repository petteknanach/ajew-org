/**
 * Final fix for Parparaos LaChuchmuh - extract per-siman English content
 * from HTML files and assign to the correct reader JSON files.
 */
const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'parparos-lechochma');

function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function hebrewToInt(h) {
  const map = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
    'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,
    'ק':100,'ר':200,'ש':300,'ת':400};
  let val = 0;
  const clean = h.replace(/["\u05F3\u05F4']/g, '').replace(/\s/g, '');
  for (const ch of clean) { if (map[ch]) val += map[ch]; }
  return val;
}

function parseWordNumber(str) {
  const ones = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
  const teens = {ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
  const tens = {twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  const words = str.toLowerCase().replace(/[\u2014\u2013\-]+/g, ' ').split(/\s+/).filter(w => w !== 'and');
  let result = 0, current = 0;
  for (const w of words) {
    if (ones[w]) current += ones[w]; else if (teens[w]) current += teens[w];
    else if (tens[w]) current += tens[w];
    else if (w === 'hundred') { if (!current) current = 1; current *= 100; result += current; current = 0; }
  }
  return (result + current) || null;
}

function extractSimanNum(headingText) {
  // Try Hebrew siman number first
  const heMatch = headingText.match(/\u05E1\u05D9\u05DE\u05DF\s+([\u05D0-\u05EA"\u05F3\u05F4]+)/);
  if (heMatch) {
    const num = hebrewToInt(heMatch[1]);
    if (num > 0) return num;
  }
  // Try English word number
  const wordMatch = headingText.match(/Siman(?:im)?\s+([\w\s\-]+?)(?:\s*[\u2014\u2013]|\u05E1\u05D9\u05DE\u05DF|\s*$)/i);
  if (wordMatch) return parseWordNumber(wordMatch[1]);
  return null;
}

function findSentenceBoundary(text, pos) {
  for (let i = pos; i < Math.min(pos+200, text.length); i++) {
    if (text[i] === '.' && (text[i+1] === ' ' || text[i+1] === '\n' || i === text.length-1)) return i+1;
  }
  for (let i = pos; i > Math.max(pos-200, 0); i--) {
    if (text[i] === '.' && (text[i+1] === ' ' || text[i+1] === '\n')) return i+1;
  }
  return pos;
}

function alignToSegments(enText, segments) {
  const contentSegs = segments.filter(s => (s.he_nikud||s.he||'').trim().length > 3);
  if (!contentSegs.length || !enText.trim()) return;

  const enParas = enText.split(/\n\n+/).filter(p => p.trim().length > 5);
  if (enParas.length === 0) return;

  if (contentSegs.length === 1) {
    contentSegs[0].en = enText.trim();
    return;
  }

  if (enParas.length >= contentSegs.length) {
    const ratio = enParas.length / contentSegs.length;
    for (let i = 0; i < contentSegs.length; i++) {
      const start = Math.round(i * ratio);
      const end = i === contentSegs.length - 1 ? enParas.length : Math.round((i+1) * ratio);
      contentSegs[i].en = enParas.slice(start, end).join('\n\n');
    }
  } else {
    // Split at sentence boundaries
    const allEn = enText.trim();
    const totalHe = contentSegs.reduce((s, seg) => s + (seg.he_nikud||seg.he||'').length, 0);
    let pos = 0;
    for (let j = 0; j < contentSegs.length; j++) {
      const heLen = (contentSegs[j].he_nikud||contentSegs[j].he||'').length;
      if (j === contentSegs.length-1) {
        contentSegs[j].en = allEn.substring(pos).trim();
      } else {
        const targetEnd = pos + Math.floor(allEn.length * heLen / totalHe);
        const splitAt = findSentenceBoundary(allEn, targetEnd);
        contentSegs[j].en = allEn.substring(pos, splitAt).trim();
        pos = splitAt;
      }
    }
  }
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

// Build siman -> reader file mapping
const simanToFile = {};
const readerFiles = fs.readdirSync(READER_DIR).filter(f => f.startsWith('section-'));
readerFiles.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
  const title = d.title || '';
  const match = title.match(/\u05E1\u05D9\u05DE\u05DF\s+([^\s\-]+)/);
  if (match) {
    const num = hebrewToInt(match[1]);
    if (num > 0) simanToFile[num] = f;
  }
  if (title.includes('\u05D4\u05E7\u05D3\u05DE\u05D4')) simanToFile[0] = f;
});

console.log('Siman mapping: ' + Object.keys(simanToFile).length + ' simanim\n');

// Process all HTML files
const htmlFiles = fs.readdirSync(FINISHED).filter(f => f.endsWith('.html')).sort();
const simanContent = {}; // siman number -> English content

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(FINISHED, file), 'utf8');

  // Clean HTML
  let clean = html;
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<div class="translator-section[\s\S]*$/gi, '');
  clean = clean.replace(/<div class="tn"[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="sum[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="flow[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="chain[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="ms-footer[\s\S]*?<\/div>/gi, '');

  // Find all h2/h3 headings
  const headingPattern = /<h[23][^>]*>[\s\S]*?<\/h[23]>/gi;
  const headings = [];
  let m;
  while ((m = headingPattern.exec(clean)) !== null) {
    headings.push({ pos: m.index, endPos: m.index + m[0].length, text: stripHtml(m[0]).trim() });
  }

  // Extract per-siman content
  let currentSiman = null;

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const isSiman = h.text.match(/^Siman/i);

    if (isSiman) {
      currentSiman = extractSimanNum(h.text);
    }

    if (currentSiman !== null) {
      const start = h.endPos;
      const end = i + 1 < headings.length ? headings[i + 1].pos : clean.length;
      const content = stripHtml(clean.substring(start, end));

      if (content.length > 10) {
        if (!simanContent[currentSiman]) simanContent[currentSiman] = '';
        simanContent[currentSiman] += content + '\n\n';
      }
    }
  }

  // For files with no headings, try filename-based assignment
  if (headings.length === 0) {
    const content = stripHtml(clean);
    // Check if COMPLETE (intro)
    if (file.includes('COMPLETE')) {
      if (!simanContent[0]) simanContent[0] = '';
      simanContent[0] += content + '\n\n';
      // Also assign to simanim 1 and 2
      if (!simanContent[1]) simanContent[1] = '';
      if (!simanContent[2]) simanContent[2] = '';
      // Split: intro gets first third, simanim 1 and 2 get rest
    }
  }
}

console.log('Extracted English for ' + Object.keys(simanContent).length + ' simanim');

// Assign to reader files
let updated = 0;
for (const [simanStr, enText] of Object.entries(simanContent)) {
  const siman = parseInt(simanStr);
  const readerFile = simanToFile[siman];
  if (!readerFile) continue;

  const fp = path.join(READER_DIR, readerFile);
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  d.segments.forEach(s => s.en = '');
  alignToSegments(enText.trim(), d.segments);
  d.hasEnglish = d.segments.some(s => s.en && s.en.trim().length > 10);
  fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
  if (d.hasEnglish) updated++;
}

console.log('Updated: ' + updated + ' files\n');

// Check remaining
const missing = readerFiles.filter(f => {
  const d = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
  return !d.segments.some(s => s.en && s.en.trim().length > 10);
});
console.log('Missing: ' + missing.length + '/' + readerFiles.length);
missing.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
  const title = d.title || '';
  const match = title.match(/\u05E1\u05D9\u05DE\u05DF\s+([^\s\-]+)/);
  const siman = match ? hebrewToInt(match[1]) : '?';
  console.log('  ' + f + ' (siman ' + siman + '): ' + title.substring(0, 50));
});
