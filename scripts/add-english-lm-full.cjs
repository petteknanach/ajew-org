/**
 * Add full English translations to Likutay Moharan from DOCX files.
 * Source: C:/Users/Pettek/Documents/Translations/Likutay Moharan/
 * Files named "Torah N.docx" for Part 1, "lkm2 NNN.docx" for Part 2
 */
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const TRANS_DIR = 'C:/Users/Pettek/Documents/Translations/Likutay Moharan';
const READER_BASE = path.join(__dirname, '../public/reader/likutay-moharan');

function extractDocx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const xml = zip.readAsText('word/document.xml');
    return xml
      .replace(/<w:br[^>]*\/>/gi, '\n')
      .replace(/<w:p[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) {
    return null;
  }
}

function filterEnglish(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // Filter to only English lines (no Hebrew-only lines)
  return lines.filter(l => {
    if (l.length < 3) return false;
    // Skip lines that are entirely Hebrew
    const hebrewChars = (l.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = l.replace(/\s/g, '').length;
    if (totalChars > 0 && hebrewChars / totalChars > 0.7) return false;
    // Skip footnote numbers and page markers
    if (/^\d+$/.test(l)) return false;
    return true;
  });
}

function applyEnglish(jsonPath, englishParas) {
  if (!fs.existsSync(jsonPath) || englishParas.length === 0) return false;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const segCount = data.segments.length;
  const enCount = englishParas.length;

  if (enCount <= segCount) {
    for (let i = 0; i < enCount; i++) {
      data.segments[i].en = englishParas[i];
    }
  } else {
    const ratio = enCount / segCount;
    for (let i = 0; i < segCount; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      data.segments[i].en = englishParas.slice(start, end).join('\n\n');
    }
  }

  data.hasEnglish = data.segments.some(s => s.en && s.en.trim());
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  return data.hasEnglish;
}

function main() {
  const files = fs.readdirSync(TRANS_DIR);

  // Part 1: "Torah N.docx" files
  const part1Files = files.filter(f => f.match(/^Torah \d+\.docx$/i));
  console.log(`Part 1 translation files: ${part1Files.length}`);

  let p1Updated = 0;
  for (const file of part1Files) {
    const num = parseInt(file.match(/Torah (\d+)/i)[1]);
    const text = extractDocx(path.join(TRANS_DIR, file));
    if (!text) continue;

    const englishParas = filterEnglish(text);
    if (englishParas.length < 2) continue;

    const jsonPath = path.join(READER_BASE, 'part-1', `torah-${num}.json`);
    if (applyEnglish(jsonPath, englishParas)) p1Updated++;
  }
  console.log(`Part 1: ${p1Updated} torahs updated with English`);

  // Part 2: "lkm2 NNN.docx" files
  const part2Files = files.filter(f => f.match(/^lkm2 \d+\.docx$/i));
  console.log(`\nPart 2 translation files: ${part2Files.length}`);

  let p2Updated = 0;
  for (const file of part2Files) {
    const num = parseInt(file.match(/lkm2 (\d+)/i)[1]);
    const text = extractDocx(path.join(TRANS_DIR, file));
    if (!text) continue;

    const englishParas = filterEnglish(text);
    if (englishParas.length < 2) continue;

    const jsonPath = path.join(READER_BASE, 'part-2', `torah-${num}.json`);
    if (applyEnglish(jsonPath, englishParas)) p2Updated++;
  }
  console.log(`Part 2: ${p2Updated} torahs updated with English`);

  // Update index.json for both parts
  for (const partNum of [1, 2]) {
    const indexPath = path.join(READER_BASE, `part-${partNum}`, 'index.json');
    if (!fs.existsSync(indexPath)) continue;
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const torah of index.torahs) {
      const prefix = partNum === 1 ? 'torah' : 'torah';
      const jsonPath = path.join(READER_BASE, `part-${partNum}`, `torah-${torah.number}.json`);
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        torah.hasEnglish = data.hasEnglish;
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  console.log(`\nTotal: ${p1Updated + p2Updated} torahs with English translations`);
}

main();
