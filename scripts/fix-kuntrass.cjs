const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Kuntrass Hatzairufim';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'nosson-by-\u05E7\u05D5\u05E0\u05D8\u05E8\u05E1-\u05D4\u05E6\u05E8\u05D5\u05E4\u05D9\u05DD');

function stripHtml(h) {
  return h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function findSB(text, pos) {
  for (let i = pos; i < Math.min(pos + 200, text.length); i++) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n' || i === text.length - 1)) return i + 1;
  }
  for (let i = pos; i > Math.max(pos - 200, 0); i--) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n')) return i + 1;
  }
  return pos;
}

function alignParas(enText, segments) {
  const cs = segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
  if (!cs.length || !enText.trim()) return;
  const paras = enText.split(/\n\n+/).filter(p => p.trim().length > 10);
  if (!paras.length) return;
  if (cs.length === 1) { cs[0].en = enText.trim(); return; }
  if (paras.length >= cs.length) {
    const r = paras.length / cs.length;
    for (let i = 0; i < cs.length; i++) {
      const s = Math.round(i * r);
      const e = i === cs.length - 1 ? paras.length : Math.round((i + 1) * r);
      cs[i].en = paras.slice(s, e).join('\n\n');
    }
  } else {
    const all = enText.trim();
    const totalHe = cs.reduce((s, seg) => s + (seg.he_nikud || seg.he || '').length, 0);
    let p = 0;
    for (let j = 0; j < cs.length; j++) {
      const hl = (cs[j].he_nikud || cs[j].he || '').length;
      if (j === cs.length - 1) cs[j].en = all.substring(p).trim();
      else {
        const te = p + Math.floor(all.length * hl / totalHe);
        const sp = findSB(all, te);
        cs[j].en = all.substring(p, sp).trim();
        p = sp;
      }
    }
  }
}

// HTML files map to section numbers (section-1 = intro, section-2 = alef, etc.)
const fileToSections = {
  '10 kuntress_alef_complete.html': [2],
  '20 kuntress_bais_complete.html': [3],
  '30 kuntress_sections_3_to_5_complete.html': [4, 5, 6],
  '40 kuntress_sections_6_to_9_complete.html': [7, 8, 9, 10],
  '50 kuntress_sections_10_to_13_complete.html': [11, 12, 13, 14],
  '60 kuntress_sections_14_to_17_complete.html': [15, 16, 17, 18],
  '70 kuntress_sections_18_to_22_complete.html': [19, 20, 21, 22, 23],
};

const htmlFiles = fs.readdirSync(FINISHED).filter(f => f.endsWith('.html')).sort();

for (const file of htmlFiles) {
  const sectionNums = fileToSections[file];
  if (!sectionNums) continue;

  const html = fs.readFileSync(path.join(FINISHED, file), 'utf8');

  // Clean
  let clean = html;
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<div class="color-key[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="doc-footer[\s\S]*?<\/div>/gi, '');

  // Find § markers
  const sectionPattern = /<div class="section-heading"[^>]*>[\s\S]*?<\/div>/gi;
  const markers = [];
  let m;
  while ((m = sectionPattern.exec(clean)) !== null) {
    markers.push({ pos: m.index, endPos: m.index + m[0].length });
  }

  if (sectionNums.length === 1) {
    // Single section - extract all body text
    const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : clean;
    let text = stripHtml(bodyHtml);
    text = text.replace(/^Entry Types:[\s\S]*?Combined types\s*/i, '');
    text = text.replace(/^[A-Z]+ \u2014 Numerical Value: \d+.*?\n/i, '');

    const secFile = path.join(READER_DIR, 'section-' + sectionNums[0] + '.json');
    if (fs.existsSync(secFile)) {
      const d = JSON.parse(fs.readFileSync(secFile, 'utf8'));
      d.segments.forEach(s => s.en = '');
      alignParas(text, d.segments);
      d.hasEnglish = true;
      fs.writeFileSync(secFile, JSON.stringify(d, null, 2), 'utf8');
      console.log('section-' + sectionNums[0] + ': ' + text.length + ' chars');
    }
  } else if (markers.length >= sectionNums.length) {
    for (let i = 0; i < sectionNums.length; i++) {
      const start = markers[i].endPos;
      const end = i + 1 < markers.length ? markers[i + 1].pos : clean.length;
      const text = stripHtml(clean.substring(start, end)).trim();

      const secFile = path.join(READER_DIR, 'section-' + sectionNums[i] + '.json');
      if (fs.existsSync(secFile) && text.length > 20) {
        const d = JSON.parse(fs.readFileSync(secFile, 'utf8'));
        d.segments.forEach(s => s.en = '');
        alignParas(text, d.segments);
        d.hasEnglish = true;
        fs.writeFileSync(secFile, JSON.stringify(d, null, 2), 'utf8');
        console.log('section-' + sectionNums[i] + ': ' + text.length + ' chars');
      }
    }
  } else {
    // Split proportionally
    const text = stripHtml(clean).trim();
    const chunkSize = Math.ceil(text.length / sectionNums.length);
    for (let i = 0; i < sectionNums.length; i++) {
      const start = i === 0 ? 0 : findSB(text, i * chunkSize);
      const end = i === sectionNums.length - 1 ? text.length : findSB(text, (i + 1) * chunkSize);
      const chunk = text.substring(start, end).trim();

      const secFile = path.join(READER_DIR, 'section-' + sectionNums[i] + '.json');
      if (fs.existsSync(secFile) && chunk.length > 20) {
        const d = JSON.parse(fs.readFileSync(secFile, 'utf8'));
        d.segments.forEach(s => s.en = '');
        alignParas(chunk, d.segments);
        d.hasEnglish = true;
        fs.writeFileSync(secFile, JSON.stringify(d, null, 2), 'utf8');
        console.log('section-' + sectionNums[i] + ': ' + chunk.length + ' chars');
      }
    }
  }
}

// Clear section-1 (intro) - no translation available in the HTML
const introFile = path.join(READER_DIR, 'section-1.json');
if (fs.existsSync(introFile)) {
  const intro = JSON.parse(fs.readFileSync(introFile, 'utf8'));
  intro.segments.forEach(s => s.en = '');
  intro.hasEnglish = false;
  fs.writeFileSync(introFile, JSON.stringify(intro, null, 2), 'utf8');
  console.log('section-1 (intro): cleared');
}

// Verify
console.log('\n=== Verification ===');
const readerFiles = fs.readdirSync(READER_DIR)
  .filter(f => f.startsWith('section-'))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

readerFiles.forEach(f => {
  const d = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
  const cs = d.segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
  const we = cs.filter(s => s.en && s.en.trim().length > 10);
  console.log(f + ': ' + we.length + '/' + cs.length + ' segs, title: ' + (d.title || '').substring(0, 20));
});
