/**
 * Properly align Kuntrass Hatzeirufim and Kitzur LM English.
 * Clear existing, re-import with correct per-section matching.
 */
const fs = require('fs');
const path = require('path');

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

function extractEnglishParas(html) {
  const paras = [];
  // Try <div class="para"> first
  let parts = html.split(/<div class="para">/);
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
  // Try <div class="section">
  parts = html.split(/<div class="section">/);
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
  // Fallback: <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    let content = match[1];
    content = content.replace(/<span class="src">[\s\S]*?<\/span>/g, '');
    content = content.replace(/<span class="source-ref">[\s\S]*?<\/span>/g, '');
    const text = stripHtml(content);
    if (text.length > 20 && !text.startsWith('←') && !text.startsWith('→') && !text.startsWith('Back')) {
      paras.push(text);
    }
  }
  return paras;
}

function isHeader(he) {
  if (!he) return false;
  const t = he.trim();
  if (t.length < 15) return true;
  if (t.match(/^(הלכה|הלכות|אות|סימן|פרק|חלק|ליקוטי|שלחן)\s/)) return true;
  return false;
}

function alignToFile(readerFile, englishParas) {
  const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
  if (!data.segments) return 0;

  // Clear existing English
  for (const seg of data.segments) seg.en = '';

  // Classify segments
  const contentIndices = [];
  for (let i = 0; i < data.segments.length; i++) {
    const he = (data.segments[i].he || data.segments[i].he_nikud || '').trim();
    if (!isHeader(he)) contentIndices.push(i);
  }

  // Assign English to content segments
  let assigned = 0;
  const target = contentIndices.length > 0 ? contentIndices : data.segments.map((_, i) => i);
  for (let i = 0; i < Math.min(englishParas.length, target.length); i++) {
    data.segments[target[i]].en = englishParas[i];
    assigned++;
  }
  // Concatenate overflow
  if (englishParas.length > target.length && target.length > 0) {
    const lastIdx = target[target.length - 1];
    const extra = englishParas.slice(target.length).join(' ');
    data.segments[lastIdx].en += ' ' + extra;
  }

  if (assigned > 0) {
    data.hasEnglish = true;
    fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');
  }
  return assigned;
}

// === KUNTRASS HATZEIRUFIM ===
console.log('=== Kuntrass Hatzeirufim ===');
const kuntrDir = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Kuntrass Hatzairufim';
const kuntrReaderDir = path.join(__dirname, '../public/reader/nosson-by-קונטרס-הצירופים-עם-ה');

// Map HTML files to section ranges
const kuntrHtmlFiles = fs.readdirSync(kuntrDir).filter(f => f.endsWith('.html')).sort();
const kuntrSectionMap = {
  '10': [1],           // alef
  '20': [2],           // bais
  '30': [3, 4, 5],
  '40': [6, 7, 8, 9],
  '50': [10, 11, 12, 13],
  '60': [14, 15, 16, 17],
  '70': [18, 19, 20, 21, 22],
};

let kuntrTotal = 0;
for (const htmlFile of kuntrHtmlFiles) {
  const prefix = htmlFile.match(/^(\d+)/)?.[1];
  if (!prefix || !kuntrSectionMap[prefix]) continue;

  const html = fs.readFileSync(path.join(kuntrDir, htmlFile), 'utf8');
  const allParas = extractEnglishParas(html);
  const sections = kuntrSectionMap[prefix];

  if (sections.length === 1) {
    // Single section
    const rf = path.join(kuntrReaderDir, `section-${sections[0]}.json`);
    if (fs.existsSync(rf)) {
      kuntrTotal += alignToFile(rf, allParas);
    }
  } else {
    // Multiple sections - split paragraphs evenly or by section breaks
    // For simplicity, split evenly
    const parasPerSection = Math.ceil(allParas.length / sections.length);
    for (let i = 0; i < sections.length; i++) {
      const rf = path.join(kuntrReaderDir, `section-${sections[i]}.json`);
      if (!fs.existsSync(rf)) continue;
      const sectionParas = allParas.slice(i * parasPerSection, (i + 1) * parasPerSection);
      kuntrTotal += alignToFile(rf, sectionParas);
    }
  }
}
console.log(`  Aligned: ${kuntrTotal} segments`);

// === KITZUR LIKUTAY MOHARAN ===
console.log('\n=== Kitzur Likutay Moharan ===');
const kitzurSrc = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Kitzure lkm';
const kitzurReaderDir = path.join(__dirname, '../public/reader/kitzur-likutay-moharan');

const kitzurHtmlFiles = fs.readdirSync(kitzurSrc).filter(f => f.endsWith('.html')).sort();
console.log(`  HTML files: ${kitzurHtmlFiles.length}`);

// Extract ALL English from all files sequentially
// Kitzur uses class="teaching-text" divs, not <p> tags
const allKitzurEn = [];
for (const f of kitzurHtmlFiles) {
  const html = fs.readFileSync(path.join(kitzurSrc, f), 'utf8');

  // Try teaching-text first (Kitzur-specific)
  const teachParts = html.split(/class="teaching-text"/);
  if (teachParts.length > 1) {
    for (let i = 1; i < teachParts.length; i++) {
      const start = teachParts[i].indexOf('>') + 1;
      // Find closing </div>
      let depth = 1;
      let pos = start;
      while (depth > 0 && pos < teachParts[i].length) {
        const openIdx = teachParts[i].indexOf('<div', pos);
        const closeIdx = teachParts[i].indexOf('</div>', pos);
        if (closeIdx < 0) break;
        if (openIdx >= 0 && openIdx < closeIdx) { depth++; pos = openIdx + 4; }
        else { depth--; if (depth === 0) { pos = closeIdx; break; } pos = closeIdx + 6; }
      }
      let content = teachParts[i].substring(start, pos);
      content = content.replace(/<span class="source-note">[\s\S]*?<\/span>/g, '');
      const text = stripHtml(content);
      if (text.length > 15) allKitzurEn.push(text);
    }
  } else {
    // Fallback to regular extraction
    allKitzurEn.push(...extractEnglishParas(html));
  }
}
console.log(`  Total English paragraphs: ${allKitzurEn.length}`);

// Get all reader files in order
function findJsonFiles(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files = files.concat(findJsonFiles(full));
    else if (item.endsWith('.json') && item !== 'index.json') files.push(full);
  }
  return files.sort((a, b) => {
    const na = parseInt((a.match(/(\d+)\.json/) || ['0', '0'])[1]);
    const nb = parseInt((b.match(/(\d+)\.json/) || ['0', '0'])[1]);
    const pa = a.includes('part-2') ? 2 : 1;
    const pb = b.includes('part-2') ? 2 : 1;
    return pa !== pb ? pa - pb : na - nb;
  });
}

const kitzurFiles = findJsonFiles(kitzurReaderDir);
console.log(`  Reader files: ${kitzurFiles.length}`);

// Clear all existing English first
let totalSegs = 0, beforeEn = 0;
for (const rf of kitzurFiles) {
  const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
  if (!data.segments) continue;
  for (const seg of data.segments) {
    totalSegs++;
    if ((seg.en || '').trim()) beforeEn++;
    seg.en = '';
  }
  fs.writeFileSync(rf, JSON.stringify(data, null, 2), 'utf8');
}
console.log(`  Cleared ${beforeEn} existing English from ${totalSegs} segments`);

// Re-assign sequentially per file, skipping headers
let enIdx = 0;
let kitzurMatched = 0;
for (const rf of kitzurFiles) {
  const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
  if (!data.segments) continue;
  let fileChanged = false;

  for (const seg of data.segments) {
    const he = (seg.he || seg.he_nikud || '').trim();
    if (isHeader(he)) continue;
    if (enIdx < allKitzurEn.length) {
      seg.en = allKitzurEn[enIdx];
      enIdx++;
      kitzurMatched++;
      fileChanged = true;
    }
  }

  if (fileChanged) {
    data.hasEnglish = true;
    fs.writeFileSync(rf, JSON.stringify(data, null, 2), 'utf8');
  }
}
console.log(`  Aligned: ${kitzurMatched} segments (${enIdx}/${allKitzurEn.length} EN paragraphs used)`);
console.log(`  Coverage: ${kitzurMatched}/${totalSegs} (${Math.round(kitzurMatched/totalSegs*100)}%)`);
