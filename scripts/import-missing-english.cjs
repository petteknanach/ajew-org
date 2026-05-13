/**
 * Import missing English translations from Finished folder into reader JSON.
 * Matches HTML translations to reader sections by comparing Hebrew text.
 */
const fs = require('fs');
const path = require('path');

const FINISHED_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER_DIR = path.join(__dirname, '../public/reader');

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

function normalizeHebrew(text) {
  return text
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[:"״׳,.\-–—;!?()[\]{}]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function extractParagraphs(htmlContent) {
  const paragraphs = [];

  // Try para-div structure first
  const parts = htmlContent.split(/<div class="para">/);
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i++) {
      const block = parts[i];
      const pMatch = block.match(/<p>([\s\S]*?)<\/p>/);
      if (!pMatch) continue;
      let englishHtml = pMatch[1];
      englishHtml = englishHtml.replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/, '');
      const english = stripHtml(englishHtml).trim();
      if (!english) continue;
      const hebMatch = block.match(/<div class="heb-text"[^>]*>([\s\S]*?)<\/div>/);
      const hebrew = hebMatch ? stripHtml(hebMatch[1]).trim() : '';
      paragraphs.push({ english, hebrew });
    }
    return paragraphs;
  }

  // Try standalone <p> tags with inline Hebrew
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(htmlContent)) !== null) {
    const pHtml = pMatch[1];
    const english = stripHtml(pHtml).trim();
    if (!english || english.length < 15) continue;
    if (english.startsWith('←') || english.startsWith('→')) continue;

    // Extract inline Hebrew from .heb spans
    const hebParts = [];
    const hebRegex = /class="heb[^"]*"[^>]*>(.*?)<\/span>/gs;
    let hebMatch;
    while ((hebMatch = hebRegex.exec(pHtml)) !== null) {
      const h = stripHtml(hebMatch[1]).trim();
      if (h) hebParts.push(h);
    }

    paragraphs.push({ english, hebrew: hebParts.join(' ') });
  }

  return paragraphs;
}

function matchAndApply(bookId, htmlDirs, label) {
  console.log(`\n=== ${label} (${bookId}) ===`);

  // Collect all HTML files from all directories
  const allHtmlFiles = [];
  for (const dir of htmlDirs) {
    const fullDir = path.join(FINISHED_DIR, dir);
    if (!fs.existsSync(fullDir)) {
      console.log(`  SKIP: ${fullDir} not found`);
      continue;
    }
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.html'));
    for (const f of files) {
      allHtmlFiles.push(path.join(fullDir, f));
    }
  }
  console.log(`  HTML files: ${allHtmlFiles.length}`);

  // Extract all paragraphs
  const allParagraphs = [];
  for (const htmlFile of allHtmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const paras = extractParagraphs(html);
    allParagraphs.push(...paras);
  }
  console.log(`  English paragraphs: ${allParagraphs.length}`);

  // Load all reader JSON files that DON'T have English
  const bookDir = path.join(READER_DIR, bookId);
  if (!fs.existsSync(bookDir)) {
    console.log(`  Book dir not found: ${bookDir}`);
    return 0;
  }

  let totalMatched = 0;
  let totalFiles = 0;

  function processDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        processDir(fullPath);
        continue;
      }
      if (!item.endsWith('.json') || item === 'index.json') continue;

      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const segments = data.segments;
      if (!segments) continue;

      let fileChanged = false;
      totalFiles++;

      for (const seg of segments) {
        if (seg.en) continue; // Already has English

        const segHeb = normalizeHebrew(seg.he || seg.he_nikud || '');
        if (segHeb.length < 10) continue;

        // Find matching paragraph by Hebrew
        let bestMatch = null;
        let bestLen = 0;

        for (const para of allParagraphs) {
          if (!para.hebrew) continue;
          const paraHeb = normalizeHebrew(para.hebrew);
          if (paraHeb.length < 10) continue;

          const compareLen = Math.min(40, paraHeb.length, segHeb.length);
          if (compareLen < 10) continue;

          if (paraHeb.substring(0, compareLen) === segHeb.substring(0, compareLen)) {
            if (compareLen > bestLen) {
              bestLen = compareLen;
              bestMatch = para;
            }
          }
        }

        if (bestMatch) {
          seg.en = bestMatch.english;
          fileChanged = true;
          totalMatched++;
        }
      }

      if (fileChanged) {
        data.hasEnglish = true;
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
      }
    }
  }

  processDir(bookDir);
  console.log(`  Matched: ${totalMatched} segments across ${totalFiles} files`);
  return totalMatched;
}

// Process all books with missing English
let totalFixed = 0;

totalFixed += matchAndApply('alim-litrufa',
  ['Ullim litrufa 1-88', 'Ullim litrufa 89-151', 'Ulim litrufa 152-226', 'Ulim litrufa 227-376', 'Ulim litrufa 377-'],
  'Alim LiTrufa');

totalFixed += matchAndApply('nosson-by-מכתבי-ר--נתן-ב--ר-יה',
  ['Rabbi Nussun ben Rabbi Yehuda - 55', 'Rabbi Nussun ben Rabbi Yehuda 56-'],
  "R' Nussun ben R' Yehuda");

totalFixed += matchAndApply('michtevay-shmuel',
  ['Michtevay Shmuel 1 - 1-16', 'Michtevay Shmuel 1 - 17-', 'Michtevay Shmuel 2'],
  'Michtevay Shmuel');

totalFixed += matchAndApply('otzar-hayirah',
  ['Oatzar volume 1', 'Oatzar 2', 'Oatzar 4', 'Oatzer volume Mem'],
  'Otzar HaYirah');

totalFixed += matchAndApply('chayey-moharan',
  ['Chayay Moharan'],
  'Chayey Moharan');

console.log(`\n=== TOTAL: ${totalFixed} English segments imported ===`);
