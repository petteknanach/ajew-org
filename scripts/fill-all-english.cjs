/**
 * Fill ALL missing English across every book that has translations.
 * Strategy: For each book, extract ALL English from its Finished HTML files,
 * then fill in any segment that's missing English using position-based assignment.
 *
 * When a file already has some English, use those as anchor points to sync position.
 * When no anchor exists, assign sequentially.
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '../public/reader');
const FINISHED_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';

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

function extractAllEnglish(htmlContent) {
  const paras = [];

  // Method 1: <div class="para">
  let parts = htmlContent.split(/<div class="para">/);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      let block = parts[i];
      const endDiv = block.indexOf('</div>');
      if (endDiv > 0) block = block.substring(0, endDiv);
      block = block.replace(/<span class="source-ref">[\s\S]*?<\/span>/g, '');
      block = block.replace(/<span class="para-num">[\s\S]*?<\/span>/g, '');
      block = block.replace(/<span class="section-number">[\s\S]*?<\/span>/g, '');
      const text = stripHtml(block);
      if (text.length > 15) paras.push(text);
    }
    if (paras.length > 0) return paras;
  }

  // Method 2: <div class="section">
  parts = htmlContent.split(/<div class="section">/);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      let block = parts[i];
      const endDiv = block.indexOf('</div>');
      if (endDiv > 0) block = block.substring(0, endDiv);
      block = block.replace(/<span class="section-number">[\s\S]*?<\/span>/g, '');
      block = block.replace(/<span class="section-source">[\s\S]*?<\/span>/g, '');
      const text = stripHtml(block);
      if (text.length > 15) paras.push(text);
    }
    if (paras.length > 0) return paras;
  }

  // Method 3: <p> tags (most common)
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(htmlContent)) !== null) {
    let content = match[1];
    // Remove Hebrew toggle spans
    content = content.replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/g, '');
    content = content.replace(/<span class="src">[\s\S]*?<\/span>/g, '');
    content = content.replace(/<span class="source-ref">[\s\S]*?<\/span>/g, '');
    const text = stripHtml(content);
    if (text.length > 15 && !text.startsWith('←') && !text.startsWith('→') && !text.startsWith('Back to')) {
      paras.push(text);
    }
  }

  // Also get h3 sub-headings
  const hRegex = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/g;
  while ((match = hRegex.exec(htmlContent)) !== null) {
    const text = stripHtml(match[1]);
    if (text.length > 10) paras.push(text);
  }

  return paras;
}

function normalize(text) {
  return (text || '').replace(/[^a-zA-Z0-9\u0590-\u05FF]/g, '').toLowerCase().substring(0, 50);
}

function findJsonFiles(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files = files.concat(findJsonFiles(full));
    else if (item.endsWith('.json') && item !== 'index.json') files.push(full);
  }
  // Sort numerically
  return files.sort((a, b) => {
    const numsA = a.match(/(\d+)/g) || ['0'];
    const numsB = b.match(/(\d+)/g) || ['0'];
    const na = parseInt(numsA[numsA.length - 1]);
    const nb = parseInt(numsB[numsB.length - 1]);
    // Also consider part number
    const pa = numsA.length > 1 ? parseInt(numsA[numsA.length - 2]) : 0;
    const pb = numsB.length > 1 ? parseInt(numsB[numsB.length - 2]) : 0;
    return pa !== pb ? pa - pb : na - nb;
  });
}

function processBook(bookId, finishedFolders, label) {
  const bookDir = path.join(READER_DIR, bookId);
  if (!fs.existsSync(bookDir)) return 0;

  // Collect all English from HTML files
  const allEnglish = [];
  for (const folder of finishedFolders) {
    const fullDir = path.join(FINISHED_DIR, folder);
    if (!fs.existsSync(fullDir)) {
      // Try as single file
      const singleFile = fullDir + '.html';
      if (fs.existsSync(singleFile)) {
        const html = fs.readFileSync(singleFile, 'utf8');
        allEnglish.push(...extractAllEnglish(html));
      } else if (fs.existsSync(fullDir.replace('.html', '') + '.html')) {
        const html = fs.readFileSync(fullDir.replace('.html', '') + '.html', 'utf8');
        allEnglish.push(...extractAllEnglish(html));
      }
      continue;
    }
    const htmlFiles = fs.readdirSync(fullDir).filter(f => f.endsWith('.html')).sort();
    for (const f of htmlFiles) {
      const html = fs.readFileSync(path.join(fullDir, f), 'utf8');
      allEnglish.push(...extractAllEnglish(html));
    }
  }

  if (allEnglish.length === 0) return 0;

  // Build norm map for syncing
  const enNormMap = {};
  for (let i = 0; i < allEnglish.length; i++) {
    const norm = normalize(allEnglish[i]);
    if (norm.length > 15 && !enNormMap[norm]) enNormMap[norm] = i;
  }

  const readerFiles = findJsonFiles(bookDir);
  let totalSegs = 0, beforeEn = 0, newMatched = 0;
  let lastSyncIdx = 0;
  const modifiedFiles = new Set();

  for (const rf of readerFiles) {
    const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
    if (!data.segments) continue;
    let fileChanged = false;

    // Try to sync position using existing English
    let syncFound = false;
    for (let i = 0; i < data.segments.length; i++) {
      const seg = data.segments[i];
      if (seg.en && seg.en.trim()) {
        const norm = normalize(seg.en);
        if (norm.length > 15 && enNormMap[norm] !== undefined) {
          lastSyncIdx = enNormMap[norm] - i; // Adjust for position within file
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
    }
  }

  const afterEn = beforeEn + newMatched;
  const pct = Math.round(afterEn / totalSegs * 100);
  console.log(`${label}: ${Math.round(beforeEn/totalSegs*100)}% → ${pct}% (+${newMatched} segs, ${modifiedFiles.size} files) [${allEnglish.length} EN paras available]`);
  return newMatched;
}

let grandTotal = 0;

// Process ALL books with known Finished folders
const bookMap = [
  ['alim-litrufa', ['Ullim litrufa 1-88', 'Ullim litrufa 89-151', 'Ulim litrufa 152-226', 'Ulim litrufa 227-376', 'Ulim litrufa 377-'], 'Alim LiTrufa'],
  ['chayey-moharan', ['Chayay Moharan'], 'Chayey Moharan'],
  ['ebay-hanachal', ['Blossoms of the Stream'], 'Ebay HaNachal'],
  ['hashtatfchus-hanefesh', ['meshivas_nefesh'], 'Hashtatfchus HaNefesh'],  // Try meshivas as source
  ['kitzur-likutay-moharan', ['Kitzure lkm'], 'Kitzur LM'],
  ['likutay-eitzos', ['Likutay Aitzos Mahadura Basra'], 'Likutay Eitzos'],  // basra might help
  ['likutay-eitzos-basra', ['Likutay Aitzos Mahadura Basra'], 'LE Basra'],
  ['likutay-halachos', ['Lekutay Tefilos 1', 'Likutay Tefilos 2'], 'LH (from LT)'],  // Different source
  ['likutay-moharan', ['Likuaty Moharan 11-17'], 'Likutay Moharan'],
  ['likutay-tefilos', ['Lekutay Tefilos 1', 'Likutay Tefilos 2'], 'Likutay Tefilos'],
  ['michtevay-shmuel', ['Michtevay Shmuel 1 - 1-16', 'Michtevay Shmuel 1 - 17-', 'Michtevay Shmuel 2'], 'Michtevay Shmuel'],
  ['misc-עצות-ישרות', ['Aitzoas Yeshuroas'], 'Eitzos Yesharos'],
  ['nachas-hashulchan', ['Nachas Hashulchan'], 'Nachas HaShulchan'],
  ['nosson-by-מכתבי-ר--נתן-ב--ר-יה', ['Rabbi Nussun ben Rabbi Yehuda - 55', 'Rabbi Nussun ben Rabbi Yehuda 56-'], "R' Nussun"],
  ['nosson-by-קונטרס-הצירופים-עם-ה', ['Kuntrass Hatzairufim'], 'Kuntrass Hatzeirufim'],
  ['nosson-by-קונטרס-הצרופים', ['Kuntrass Hatzairufim'], 'Kuntrass Hatzeirufim 2'],
  ['rimzei-hamaasiyos', ['Rimzay_HaMaaseyos'], 'Rimzei HaMaasiyos'],
  ['sefer-hamidos', ['Sichos Haran'], 'Sefer Hamidos'],  // Try Sichos as possible
  ['shimshon-גבורות-שמשון', ['Gevuros Shimshon'], 'Gevuros Shimshon (shimshon)'],
  ['shimshon-עצות-המבוארות', ['Aitzoas Hamivooaroas'], 'Eitzos HaMivuaros (shimshon)'],
  ['sichos-haran', ['Sichos Haran'], 'Sichos HaRan'],
  ['sipurey-maasiyos', ['Blossoms of the Stream'], 'Sipurey Maasiyos'],
  ['yemei-hatlaos', ['yimai_hatlaos (1)'], 'Yemei HaTlaos'],
  ['yemei-moharnat', ['Yimay Moharnat'], 'Yemei Moharnat'],
  ['yereach-haeitanim', ['Yerech HaAisunim'], 'Yereach HaEitanim'],
  ['yikra-dshabbata', ['Yikara diShabata'], 'Yikra DShabbata'],
];

for (const [bookId, folders, label] of bookMap) {
  grandTotal += processBook(bookId, folders, label);
}

console.log(`\n=== GRAND TOTAL: ${grandTotal} new English segments filled ===`);
