const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Yikara diShabata';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'yikra-dshabbata');

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

// Step 1: Read all HTML files and extract text, split by siman headings
const htmlFiles = fs.readdirSync(FINISHED).filter(f => f.endsWith('.html')).sort();
console.log(htmlFiles.length + ' HTML files');

// Concatenate all HTML content
let allHtml = '';
for (const file of htmlFiles) {
  allHtml += fs.readFileSync(path.join(FINISHED, file), 'utf8') + '\n';
}

// Clean
allHtml = allHtml.replace(/<style[\s\S]*?<\/style>/gi, '');
allHtml = allHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
allHtml = allHtml.replace(/<div class="translator-section[\s\S]*?<\/div>\s*<\/div>/gi, '');
allHtml = allHtml.replace(/<div class="ms-footer[\s\S]*?<\/div>/gi, '');

// Find all siman headings in HTML
const simanPattern = /Siman\s+(\d+)/gi;
const h2Pattern = /<h[23][^>]*>[\s\S]*?<\/h[23]>/gi;
const headings = [];
let m;
while ((m = h2Pattern.exec(allHtml)) !== null) {
  const text = m[0].replace(/<[^>]+>/g, '').trim();
  const simanMatch = text.match(/Siman\s+(\d+)/i);
  if (simanMatch) {
    headings.push({ pos: m.index, endPos: m.index + m[0].length, siman: parseInt(simanMatch[1]), text: text.substring(0, 60) });
  }
}

console.log('Found ' + headings.length + ' siman headings in HTML');

// Extract per-siman English content
const simanContent = {};
for (let i = 0; i < headings.length; i++) {
  const start = headings[i].endPos;
  let end = allHtml.length;
  // Find next siman heading
  for (let j = i + 1; j < headings.length; j++) {
    if (headings[j].siman !== headings[i].siman) {
      end = headings[j].pos;
      break;
    }
  }

  const content = stripHtml(allHtml.substring(start, end));
  const siman = headings[i].siman;
  if (content.length > 20) {
    if (!simanContent[siman]) simanContent[siman] = '';
    simanContent[siman] += content + '\n\n';
  }
}

console.log('Extracted ' + Object.keys(simanContent).length + ' simanim');

// Also extract intro content (before first siman)
let introEnd = headings.length > 0 ? headings[0].pos : allHtml.length;
let introHtml = allHtml.substring(0, introEnd);
// Remove title blocks
introHtml = introHtml.replace(/<div class="title-block[\s\S]*?<\/div>/gi, '');
const introText = stripHtml(introHtml);
console.log('Intro text: ' + introText.length + ' chars');

// Step 2: Read reader files and find siman boundaries in Hebrew segments
for (const secFile of ['section-1.json', 'section-2.json', 'section-3.json', 'section-4.json']) {
  const fp = path.join(READER_DIR, secFile);
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  d.segments.forEach(s => s.en = '');

  if (secFile === 'section-1.json' || secFile === 'section-2.json') {
    // Title page and intro - assign intro text
    if (secFile === 'section-2.json' && introText.length > 100) {
      alignParas(introText, d.segments);
    }
    d.hasEnglish = d.segments.some(s => s.en && s.en.trim().length > 10);
    fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
    const cs = d.segments.filter(s => (s.he_nikud||s.he||'').trim().length > 3);
    const we = cs.filter(s => s.en?.trim()?.length > 10);
    console.log(secFile + ': ' + we.length + '/' + cs.length + ' segs');
    continue;
  }

  // section-3 and section-4: find siman boundaries in Hebrew
  const segments = d.segments;
  const simanGroups = []; // { siman: number, segIndices: [] }
  let currentSiman = null;
  let currentGroup = [];

  segments.forEach((s, i) => {
    const he = (s.he_nikud || s.he || '').trim().replace(/[\u0591-\u05C7]/g, '');
    // Check if this segment starts a new siman
    const simanMatch = he.match(/^\u05E1\u05D9\u05DE\u05DF\s+[\u05D0-\u05EA"']+/); // סימן
    if (simanMatch && he.length < 50) {
      // This is a siman header
      if (currentGroup.length > 0 && currentSiman !== null) {
        simanGroups.push({ siman: currentSiman, segIndices: [...currentGroup] });
      }
      // Parse siman number from Hebrew
      // Simple approach: map by position
      currentSiman = simanGroups.length + 1;
      currentGroup = [];
    } else if (he.length > 3) {
      currentGroup.push(i);
    }
  });
  if (currentGroup.length > 0 && currentSiman !== null) {
    simanGroups.push({ siman: currentSiman, segIndices: [...currentGroup] });
  }

  console.log(secFile + ': ' + simanGroups.length + ' simanim found in Hebrew');

  // Match English simanim to Hebrew simanim
  // The siman numbers in the HTML should correspond to the sequential simanim in the reader
  const simanKeys = Object.keys(simanContent).map(Number).sort((a, b) => a - b);

  // For section-3 (part 1), simanim in HTML start from 1
  // For section-4 (part 2), simanim in HTML also start from 1 (different numbering)
  // Let's match by order
  for (let i = 0; i < simanGroups.length; i++) {
    const group = simanGroups[i];
    // Try to find matching English by siman number
    // The HTML has siman numbers that correspond to the reader's sequential numbering
    let enText = null;

    // Try direct siman number match
    if (simanContent[i + 1]) {
      enText = simanContent[i + 1];
    }

    if (enText && enText.length > 20) {
      const segs = group.segIndices.map(idx => segments[idx]);
      alignParas(enText, segs);
    }
  }

  d.hasEnglish = segments.some(s => s.en && s.en.trim().length > 10);
  fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');

  const cs = segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
  const we = cs.filter(s => s.en && s.en.trim().length > 10);
  console.log(secFile + ': ' + we.length + '/' + cs.length + ' segs with English');
}

// Verification
console.log('\n=== Spot Check ===');
const sec3 = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'section-3.json'), 'utf8'));
const cs = sec3.segments.filter(s => (s.he_nikud||s.he||'').trim().length > 3);
cs.slice(0, 4).forEach((s, i) => {
  console.log('seg' + i + ':');
  console.log('  HE: ' + (s.he_nikud||s.he||'').substring(0, 50));
  console.log('  EN: ' + (s.en||'').substring(0, 50));
});
