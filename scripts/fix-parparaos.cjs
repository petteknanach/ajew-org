const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'parparos-lechochma');

// Hebrew number to integer
function hebrewToInt(h) {
  const map = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
    'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,
    'ק':100,'ר':200,'ש':300,'ת':400};
  let val = 0;
  const clean = h.replace(/["\u05F3\u05F4']/g, '').replace(/\s/g, '');
  for (const ch of clean) {
    if (map[ch]) val += map[ch];
  }
  return val;
}

// Build siman -> reader file mapping
const simanToFile = {};
const readerFiles = fs.readdirSync(READER_DIR).filter(f => f.startsWith('section-'));
readerFiles.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
  const title = d.title || '';
  const match = title.match(/\u05E1\u05D9\u05DE\u05DF\s+([^\s\-]+)/); // סימן
  if (match) {
    const num = hebrewToInt(match[1]);
    if (num > 0) simanToFile[num] = f;
  }
  if (title.includes('\u05D4\u05E7\u05D3\u05DE\u05D4')) simanToFile[0] = f; // הקדמה
});

console.log('Siman mapping: ' + Object.keys(simanToFile).length + ' simanim');

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function extractText(html) {
  let clean = html;
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<div class="translator-section[\s\S]*$/gi, '');
  clean = clean.replace(/<div class="tn"[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="ms-footer[\s\S]*$/gi, '');
  clean = clean.replace(/<div class="doc-footer[\s\S]*$/gi, '');
  clean = clean.replace(/<div class="sum[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="flow[\s\S]*?<\/div>/gi, '');

  const paras = [];
  const matches = clean.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  matches.forEach(m => {
    const text = stripHtml(m).trim();
    if (text.length > 10) paras.push(text);
  });

  // Also text-block divs
  const tbMatches = clean.match(/<div class="text-block"[^>]*>[\s\S]*?<\/div>/gi) || [];
  tbMatches.forEach(m => {
    const text = stripHtml(m).trim();
    if (text.length > 10) paras.push(text);
  });

  if (paras.length === 0) {
    const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) return stripHtml(bodyMatch[1]);
    return stripHtml(clean);
  }

  return paras.join('\n\n');
}

function findSentenceBoundary(text, pos) {
  for (let i = pos; i < Math.min(pos+200, text.length); i++) {
    if (text[i] === '.' && (text[i+1] === ' ' || i === text.length-1)) return i+1;
  }
  for (let i = pos; i > Math.max(pos-200, 0); i--) {
    if (text[i] === '.' && text[i+1] === ' ') return i+1;
  }
  return pos;
}

function distributeToSegments(enText, segments) {
  const contentSegs = segments.filter(s => (s.he_nikud||s.he||'').trim().length > 3);
  if (!contentSegs.length || !enText.trim()) return;
  const totalHe = contentSegs.reduce((s,seg) => s + (seg.he_nikud||seg.he||'').length, 0);
  if (!totalHe) return;
  let pos = 0;
  for (let j = 0; j < contentSegs.length; j++) {
    const heLen = (contentSegs[j].he_nikud||contentSegs[j].he||'').length;
    if (j === contentSegs.length-1) {
      contentSegs[j].en = enText.substring(pos).trim();
    } else {
      const targetEnd = pos + Math.floor(enText.length * heLen / totalHe);
      const splitAt = findSentenceBoundary(enText, targetEnd);
      contentSegs[j].en = enText.substring(pos, splitAt).trim();
      pos = splitAt;
    }
  }
}

// Parse HTML files
const htmlFiles = fs.readdirSync(FINISHED).filter(f => f.endsWith('.html')).sort();
let updated = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(FINISHED, file), 'utf8');
  const enText = extractText(html);
  if (enText.length < 50) continue;

  // Extract siman numbers from filename
  const simanNums = [];

  // Range pattern: 66_to_83, 96_to_215
  const rangeMatch = file.match(/Simanim?_(\d+)_to_(\d+)/i);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    for (let n = start; n <= end; n++) simanNums.push(n);
  }

  // Tinyana (Part 2) range
  const tinyanaMatch = file.match(/Tinyana_Simanim?_(\d+)_(\d+)/i);
  if (tinyanaMatch) {
    const start = parseInt(tinyanaMatch[1]);
    const end = parseInt(tinyanaMatch[2]);
    // Part 2 simanim use same numbers but are different sections
    // For now, skip part 2 as we need to understand the reader mapping
    console.log('  Tinyana ' + start + '-' + end + ': ' + enText.length + ' chars (skipping - need part 2 mapping)');
    continue;
  }

  // Multi-siman pattern: 221_285
  if (!rangeMatch && !tinyanaMatch) {
    const multiMatch = file.match(/Simanim?_([\d_]+)/i);
    if (multiMatch) {
      const nums = multiMatch[1].split('_').map(Number).filter(n => n > 0 && n < 500);
      simanNums.push(...nums);
    }
  }

  // COMPLETE = introduction
  if (file.includes('COMPLETE') && simanNums.length === 0) {
    simanNums.push(0, 1, 2);
  }

  if (simanNums.length === 0) {
    console.log('  ' + file + ': no siman numbers found');
    continue;
  }

  // Find matching reader files
  const matchingFiles = [...new Set(simanNums.map(n => simanToFile[n]).filter(Boolean))];
  if (matchingFiles.length === 0) {
    console.log('  ' + file + ': simanim ' + simanNums.join(',') + ' - no reader matches');
    continue;
  }

  // Collect segments and distribute
  const allSegs = [];
  const fileData = [];
  for (const rf of matchingFiles) {
    const fp = path.join(READER_DIR, rf);
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const start = allSegs.length;
    d.segments.forEach(s => { s.en = ''; allSegs.push(s); });
    fileData.push({ fp, data: d, start, end: allSegs.length });
  }

  distributeToSegments(enText, allSegs);

  let fileUpdated = 0;
  for (const fd of fileData) {
    fd.data.segments = allSegs.slice(fd.start, fd.end);
    fd.data.hasEnglish = fd.data.segments.some(s => s.en && s.en.trim().length > 10);
    fs.writeFileSync(fd.fp, JSON.stringify(fd.data, null, 2), 'utf8');
    if (fd.data.hasEnglish) fileUpdated++;
  }

  updated += fileUpdated;
  console.log('  ' + file + ': ' + matchingFiles.length + ' files, ' + Math.round(enText.length/1024) + 'KB');
}

console.log('\nUpdated: ' + updated + ' files');

// Check remaining
const missing = readerFiles.filter(f => {
  const d = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
  return !d.segments.some(s => s.en && s.en.trim().length > 20);
});
console.log('Still missing: ' + missing.length + '/' + readerFiles.length);
if (missing.length > 0) {
  missing.forEach(f => {
    const d = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
    console.log('  ' + f + ': ' + (d.title||''));
  });
}
