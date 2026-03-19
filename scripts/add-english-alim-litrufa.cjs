const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = 'C:/Users/nanach/Documents/Translations/Blossoms of the Spring';
const READER_DIR = path.join(__dirname, '../public/reader/alim-litrufa/part-2');

async function processLetter(filePath, letterNum) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const lines = result.value.split('\n').filter(l => l.trim());

    // Skip header lines (title, metadata)
    let textLines = [];
    let startFound = false;
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty or very short lines, and common headers
      if (!trimmed) continue;
      if (trimmed.length < 5 && !/\d/.test(trimmed)) continue;
      if (/^letter\s*\d+/i.test(trimmed)) { startFound = true; continue; }
      if (/^blossoms/i.test(trimmed)) continue;
      if (/^ebay hanachal/i.test(trimmed)) continue;
      textLines.push(trimmed);
    }

    if (textLines.length === 0) return null;

    // Combine into one English text block
    const englishText = textLines.join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return englishText;
  } catch (e) {
    console.error(`Error processing ${filePath}: ${e.message}`);
    return null;
  }
}

async function main() {
  // Find all letter files and extract their numbers
  const files = fs.readdirSync(TRANSLATIONS_DIR)
    .filter(f => f.endsWith('.docx') && f.startsWith('Letter') && !f.startsWith('~'));

  console.log(`Found ${files.length} letter translation files`);

  let updated = 0;

  for (const file of files) {
    // Extract letter number from filename
    const match = file.match(/Letter\s*(\d+)/i);
    if (!match) continue;
    const letterNum = parseInt(match[1], 10);

    const filePath = path.join(TRANSLATIONS_DIR, file);
    const englishText = await processLetter(filePath, letterNum);

    if (!englishText) {
      console.log(`  Skipped letter ${letterNum} (no text extracted)`);
      continue;
    }

    // Find matching reader JSON
    const readerFile = path.join(READER_DIR, `letter-${letterNum}.json`);
    if (!fs.existsSync(readerFile)) {
      console.log(`  Letter ${letterNum}: no reader file found`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
    const segCount = data.segments.length;

    if (segCount === 1) {
      // Single segment - put all English there
      data.segments[0].en = englishText;
    } else {
      // Multiple segments - split English roughly equally
      const words = englishText.split(' ');
      const wordsPerSeg = Math.ceil(words.length / segCount);
      for (let i = 0; i < segCount; i++) {
        const start = i * wordsPerSeg;
        const end = Math.min(start + wordsPerSeg, words.length);
        if (start < words.length) {
          data.segments[i].en = words.slice(start, end).join(' ');
        }
      }
    }

    fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');
    updated++;
    console.log(`  Letter ${letterNum}: added English (${englishText.length} chars) to ${segCount} segments`);
  }

  console.log(`\nDone! Updated ${updated} letters with English translations.`);
}

main().catch(console.error);
