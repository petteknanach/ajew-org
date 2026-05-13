const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Rabbi Nussun ben Rabbi Yehuda - 55';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'nosson-by-\u05DE\u05DB\u05EA\u05D1\u05D9-\u05E8--\u05E0\u05EA\u05DF-\u05D1--\u05E8-\u05D9\u05D4');

function stripHtml(h) {
  return h.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function findSB(t, p) {
  for (let i = p; i < Math.min(p+200, t.length); i++) if (t[i]==='.'&&(t[i+1]===' '||t[i+1]==='\n'||i===t.length-1)) return i+1;
  for (let i = p; i > Math.max(p-200, 0); i--) if (t[i]==='.'&&(t[i+1]===' '||t[i+1]==='\n')) return i+1;
  return p;
}

function alignParas(enText, segments) {
  const cs = segments.filter(s => (s.he_nikud||s.he||'').trim().length > 3);
  if (!cs.length || !enText.trim()) return;
  const paras = enText.split(/\n\n+/).filter(p => p.trim().length > 10);
  if (!paras.length) return;
  if (cs.length === 1) { cs[0].en = enText.trim(); return; }
  if (paras.length >= cs.length) {
    const r = paras.length / cs.length;
    for (let i = 0; i < cs.length; i++) {
      const s = Math.round(i*r), e = i===cs.length-1?paras.length:Math.round((i+1)*r);
      cs[i].en = paras.slice(s, e).join('\n\n');
    }
  } else {
    const all = enText.trim();
    const totalHe = cs.reduce((s,seg)=>s+(seg.he_nikud||seg.he||'').length, 0);
    let p = 0;
    for (let j = 0; j < cs.length; j++) {
      const hl = (cs[j].he_nikud||cs[j].he||'').length;
      if (j===cs.length-1) cs[j].en = all.substring(p).trim();
      else { const te=p+Math.floor(all.length*hl/totalHe); const sp=findSB(all,te); cs[j].en=all.substring(p,sp).trim(); p=sp; }
    }
  }
}

// Read all HTML files and split by letter headings
const htmlFiles = fs.readdirSync(FINISHED).filter(f => f.endsWith('.html')).sort();
const letterContent = {}; // letter number -> English text

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(FINISHED, file), 'utf8');
  let clean = html;
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<div class="translator-section[\s\S]*?<\/div>\s*<\/div>/gi, '');
  clean = clean.replace(/<div class="ms-footer[\s\S]*?<\/div>/gi, '');

  // Find letter headings: "Letter N" or "Letter א"
  const headings = [];
  const hPat = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let m;
  while ((m = hPat.exec(clean)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    // Skip translator summary headings
    if (text.match(/Translator|Summary/i)) continue;

    // Extract letter number
    const numMatch = text.match(/Letter\s+(\d+)/i) || text.match(/Letter\s+([א-ת])/);
    const wordMatch = text.match(/Letter\s+([\w-]+)/i);
    let letterNum = null;

    if (numMatch) {
      const val = numMatch[1];
      if (/^\d+$/.test(val)) letterNum = parseInt(val);
      else {
        // Hebrew letter to number
        const map = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10};
        letterNum = map[val] || null;
      }
    }

    if (!letterNum && wordMatch) {
      // Word-based number
      const wordNums = {
        'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,
        'eleven':11,'twelve':12,'thirteen':13,'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,
        'eighteen':18,'nineteen':19,'twenty':20,'aleph':1,'beis':2,'gimmel':3,'dalet':4,
      };
      const w = wordMatch[1].toLowerCase().replace(/[\-–]/g, ' ').trim();
      if (wordNums[w]) letterNum = wordNums[w];
    }

    if (letterNum) {
      headings.push({ pos: m.index, endPos: m.index + m[0].length, letterNum });
    }
  }

  // If no letter headings found, try to get letter number from filename
  if (headings.length === 0) {
    const fnMatch = file.match(/letters?_(\d+)_(\d+)/i) || file.match(/letter_(\w+)/i);
    if (fnMatch) {
      // Single letter file - assign all content to that letter
      const start = parseInt(fnMatch[1]);
      const end = fnMatch[2] ? parseInt(fnMatch[2]) : start;
      const text = stripHtml(clean);
      if (text.length > 50) {
        if (start === end) {
          letterContent[start] = (letterContent[start] || '') + text + '\n\n';
        } else {
          // Split among letters proportionally
          const chunkSize = Math.ceil(text.length / (end - start + 1));
          for (let n = start; n <= end; n++) {
            const s = (n - start) * chunkSize;
            const e = n === end ? text.length : findSB(text, (n - start + 1) * chunkSize);
            letterContent[n] = (letterContent[n] || '') + text.substring(s, e).trim() + '\n\n';
          }
        }
      }
      continue;
    }
  }

  // Extract content between letter headings
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].endPos;
    let end = clean.length;
    for (let j = i + 1; j < headings.length; j++) {
      end = headings[j].pos;
      break;
    }

    const text = stripHtml(clean.substring(start, end));
    // Remove translator summaries
    const cleaned = text.replace(/Translator's Summary[\s\S]*$/i, '').trim();
    if (cleaned.length > 20) {
      const num = headings[i].letterNum;
      letterContent[num] = (letterContent[num] || '') + cleaned + '\n\n';
    }
  }
}

console.log('Extracted ' + Object.keys(letterContent).length + ' letters');

// Assign to reader files
// Reader has section-1 = letter א (1), section-2 = letter ב (2), etc.
const readerFiles = fs.readdirSync(READER_DIR)
  .filter(f => f.startsWith('section-'))
  .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

let updated = 0;
for (const rf of readerFiles) {
  const secNum = parseInt(rf.match(/\d+/)[0]);
  const fp = path.join(READER_DIR, rf);
  const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
  d.segments.forEach(s => s.en = '');

  const enText = letterContent[secNum];
  if (enText && enText.trim().length > 20) {
    alignParas(enText.trim(), d.segments);
    d.hasEnglish = true;
    updated++;
  } else {
    d.hasEnglish = false;
  }

  fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
}

console.log('Updated: ' + updated + '/' + readerFiles.length + ' files');

// Spot check
const sec1 = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'section-1.json'), 'utf8'));
const cs = sec1.segments.filter(s => (s.he_nikud||s.he||'').trim().length > 3);
console.log('\nSpot check section-1 (Letter Aleph):');
cs.slice(0, 2).forEach(s => {
  console.log('  HE: ' + (s.he_nikud||s.he||'').substring(0, 50));
  console.log('  EN: ' + (s.en||'').substring(0, 50));
});
