/**
 * Fix Nachas Hashulchan and Zimras HaAretz alignment.
 * Both books have similar structure: simanim in HTML mapped to reader sections.
 */
const fs = require('fs');
const path = require('path');

const FINISHED_BASE = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER_BASE = path.join(__dirname, '..', 'public', 'reader');

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

function processBook(finishedFolder, readerDir, bookName) {
  console.log('\n=== ' + bookName + ' ===');

  const folder = path.join(FINISHED_BASE, finishedFolder);
  const readerPath = path.join(READER_BASE, readerDir);

  // Read all HTML files
  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();
  console.log(htmlFiles.length + ' HTML files');

  // Concatenate all HTML
  let allHtml = '';
  for (const file of htmlFiles) {
    allHtml += fs.readFileSync(path.join(folder, file), 'utf8') + '\n';
  }

  // Clean
  allHtml = allHtml.replace(/<style[\s\S]*?<\/style>/gi, '');
  allHtml = allHtml.replace(/<script[\s\S]*?<\/script>/gi, '');
  allHtml = allHtml.replace(/<div class="translator-section[\s\S]*?<\/div>\s*<\/div>/gi, '');
  allHtml = allHtml.replace(/<div class="ms-footer[\s\S]*?<\/div>/gi, '');

  // Find all headings
  const headings = [];
  const h2Pat = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let m;
  while ((m = h2Pat.exec(allHtml)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    headings.push({ pos: m.index, endPos: m.index + m[0].length, text: text.substring(0, 80) });
  }

  console.log(headings.length + ' headings found');

  // Find siman headings and extract content
  const simanContent = {};
  let introContent = '';

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const simanMatch = h.text.match(/Siman\s+(\d+)/i);

    if (simanMatch) {
      const simanNum = parseInt(simanMatch[1]);
      let endPos = allHtml.length;
      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].text.match(/Siman\s+\d+/i)) {
          endPos = headings[j].pos;
          break;
        }
      }

      let content = allHtml.substring(h.endPos, endPos);
      content = content.replace(/<h3[^>]*>[\s\S]*?<\/h3>/gi, '');
      const text = stripHtml(content);
      if (text.length > 20) {
        if (!simanContent[simanNum]) simanContent[simanNum] = '';
        simanContent[simanNum] += text + '\n\n';
      }
    } else if (h.text.match(/Introduction|Hakdama|Opening|Pesicha/i)) {
      let endPos = allHtml.length;
      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].text.match(/Siman\s+\d+/i)) {
          endPos = headings[j].pos;
          break;
        }
      }
      const text = stripHtml(allHtml.substring(h.endPos, endPos));
      introContent += text + '\n\n';
    }
  }

  console.log('Extracted ' + Object.keys(simanContent).length + ' simanim, intro: ' + introContent.length + ' chars');

  // Read reader files and map simanim
  const jsonFiles = fs.readdirSync(readerPath)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  for (const jf of jsonFiles) {
    const fp = path.join(readerPath, jf);
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    d.segments.forEach(s => s.en = '');

    const title = d.title || '';
    const isIntro = title.match(/\u05D4\u05E7\u05D3\u05DE\u05D4|\u05E4\u05EA\u05D9\u05D7\u05D4/); // הקדמה or פתיחה

    if (isIntro && introContent.length > 50) {
      alignParas(introContent, d.segments);
    } else {
      // Find siman boundaries in Hebrew segments
      const simanGroups = [];
      let currentGroup = [];
      let currentSimanIdx = 0;

      d.segments.forEach((s, i) => {
        const he = (s.he_nikud || s.he || '').trim().replace(/[\u0591-\u05C7]/g, '');
        const isSimanHeader = he.match(/^\u05E1\u05D9\u05DE\u05DF/) && he.length < 60;
        if (isSimanHeader) {
          if (currentGroup.length > 0) {
            simanGroups.push({ segIndices: [...currentGroup] });
          }
          currentGroup = [];
          currentSimanIdx++;
        } else if (he.length > 3) {
          currentGroup.push(i);
        }
      });
      if (currentGroup.length > 0) simanGroups.push({ segIndices: [...currentGroup] });

      // If no siman groups found, treat entire file as one section
      if (simanGroups.length === 0) {
        const allEn = Object.values(simanContent).join('\n\n');
        alignParas(allEn.substring(0, 50000), d.segments);
      } else {
        // Map siman groups to English content by order
        const simanKeys = Object.keys(simanContent).map(Number).sort((a, b) => a - b);
        for (let i = 0; i < simanGroups.length; i++) {
          const enText = simanKeys[i] ? simanContent[simanKeys[i]] : null;
          if (enText && enText.length > 20) {
            const segs = simanGroups[i].segIndices.map(idx => d.segments[idx]);
            alignParas(enText, segs);
          }
        }
      }
    }

    d.hasEnglish = d.segments.some(s => s.en && s.en.trim().length > 10);
    fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');

    const cs = d.segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
    const we = cs.filter(s => s.en && s.en.trim().length > 10);
    console.log(jf + ': ' + we.length + '/' + cs.length + ' segs');
  }

  // Spot check
  const firstFile = path.join(readerPath, jsonFiles[jsonFiles.length > 1 ? 1 : 0]);
  const d = JSON.parse(fs.readFileSync(firstFile, 'utf8'));
  const cs = d.segments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
  console.log('\nSpot check ' + jsonFiles[jsonFiles.length > 1 ? 1 : 0] + ':');
  cs.slice(0, 2).forEach(s => {
    console.log('  HE: ' + (s.he_nikud || s.he || '').substring(0, 50));
    console.log('  EN: ' + (s.en || '').substring(0, 50));
  });
}

// Process both books
processBook('Nachas Hashulchan', 'nachas-hashulchan', 'Nachas Hashulchan');
processBook('Zimras HaAretz', 'zimras-haaretz', 'Zimras HaAretz');
