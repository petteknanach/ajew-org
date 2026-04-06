/**
 * Import English translations for Alim LiTrufa by matching letter numbers.
 * HTML files: ullim_letroofah_letter_NN.html → reader: letter-NN.json
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '../public/reader/alim-litrufa');
const FINISHED_DIRS = [
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ullim litrufa 1-88',
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ullim litrufa 89-151',
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ulim litrufa 152-226',
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ulim litrufa 227-376',
  'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ulim litrufa 377-',
];

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

function extractEnglishParagraphs(htmlFile) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const paras = [];

  // Try para-div structure
  const parts = html.split(/<div class="para">/);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const pMatch = parts[i].match(/<p>([\s\S]*?)<\/p>/);
      if (!pMatch) continue;
      let englishHtml = pMatch[1];
      englishHtml = englishHtml.replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/, '');
      const english = stripHtml(englishHtml).trim();
      if (english && english.length > 10) paras.push(english);
    }
    return paras;
  }

  // Fallback: all <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    if (text && text.length > 15 && !text.startsWith('←') && !text.startsWith('→')) {
      paras.push(text);
    }
  }
  return paras;
}

function getLetterNum(filename) {
  // ullim_letroofah_letter_01.html → 1
  // ulim_litrufa_152.html → 152
  const m = filename.match(/letter[_\s]*(\d+)/i) || filename.match(/litrufa[_\s]*(\d+)/i) || filename.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// Collect all HTML files with letter numbers
const htmlByLetter = {};
for (const dir of FINISHED_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.html')) continue;
    const num = getLetterNum(f);
    if (num !== null) {
      htmlByLetter[num] = path.join(dir, f);
    }
  }
}
console.log(`Found ${Object.keys(htmlByLetter).length} HTML translation files`);

// Match to reader JSON — Ullim is in part-2 (letters 1-376+)
// But also check part-1 for letter 1 etc
let totalMatched = 0;
let totalUpdated = 0;

for (const partDir of fs.readdirSync(READER_DIR)) {
  const pd = path.join(READER_DIR, partDir);
  if (!fs.statSync(pd).isDirectory()) continue;

  for (const jsonFile of fs.readdirSync(pd)) {
    if (!jsonFile.endsWith('.json') || jsonFile === 'index.json') continue;

    const letterMatch = jsonFile.match(/letter-(\d+)\.json/);
    if (!letterMatch) continue;
    const letterNum = parseInt(letterMatch[1], 10);

    // Check if this letter already has English
    const jsonPath = path.join(pd, jsonFile);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const segments = data.segments;
    const hasEn = segments.some(s => s.en);
    if (hasEn) continue;

    // Find matching HTML
    if (!htmlByLetter[letterNum]) continue;

    const enParas = extractEnglishParagraphs(htmlByLetter[letterNum]);
    if (enParas.length === 0) continue;

    // Assign English paragraphs to segments sequentially
    // Skip very short header segments
    const contentSegs = segments.filter(s => (s.he || s.he_nikud || '').length > 15);
    const assignTo = contentSegs.length > 0 ? contentSegs : segments;

    let assigned = 0;
    for (let i = 0; i < Math.min(enParas.length, assignTo.length); i++) {
      assignTo[i].en = enParas[i];
      assigned++;
    }

    // If more English than segments, concatenate remaining to last segment
    if (enParas.length > assignTo.length && assignTo.length > 0) {
      const remaining = enParas.slice(assignTo.length).join(' ');
      assignTo[assignTo.length - 1].en += ' ' + remaining;
    }

    if (assigned > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      totalMatched += assigned;
      totalUpdated++;
    }
  }
}

console.log(`Updated: ${totalUpdated} files, ${totalMatched} segments with English`);
