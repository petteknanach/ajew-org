const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = 'C:/Users/Pettek/Documents/Translations/Words of Rabbi Nachman';
const READER_DIR = path.join(__dirname, '../public/reader/sichos-haran');

/**
 * Extract English text paragraphs from a DOCX file using adm-zip.
 * DOCX files are ZIP archives containing word/document.xml.
 */
function extractDocxText(filePath) {
  const zip = new AdmZip(filePath);
  const xml = zip.readAsText('word/document.xml');

  // Split by paragraph endings to get individual paragraphs
  const paragraphs = [];
  const paraMatches = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];

  for (const para of paraMatches) {
    // Extract text from <w:t> tags within each paragraph
    const textParts = [];
    const tMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    for (const t of tMatches) {
      const text = t.replace(/<[^>]+>/g, '');
      textParts.push(text);
    }
    const fullText = textParts.join('')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();

    if (fullText) {
      paragraphs.push(fullText);
    }
  }

  return paragraphs;
}

/**
 * Filter out header/metadata lines, keep only English content paragraphs.
 */
function filterContentParagraphs(paragraphs, sichaNum) {
  const filtered = [];
  let foundContent = false;

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    // Skip common headers/titles
    if (/^words?\s+of\s+rabbi\s+nachman/i.test(trimmed)) continue;
    if (/^sichos?\s+ha?ran/i.test(trimmed)) continue;
    if (/^rabbi\s+nachman/i.test(trimmed)) continue;
    if (/^rebbe\s+nachman/i.test(trimmed)) continue;
    if (/^conversations/i.test(trimmed) && trimmed.length < 30) continue;

    // Skip if it's just a number (section marker)
    if (/^\d+$/.test(trimmed)) {
      foundContent = true;
      continue;
    }
    // Skip "Sicha 5" or "#5" type headers
    if (/^(sicha|sichah|#)\s*\d+/i.test(trimmed)) {
      foundContent = true;
      continue;
    }
    // Skip very short lines that look like headers
    if (trimmed.length < 3) continue;

    // Skip footnote references that are just numbers in parentheses
    if (/^\(\d+\)$/.test(trimmed)) continue;

    // Check for Hebrew characters - skip lines that are primarily Hebrew
    const hebrewChars = (trimmed.match(/[\u0590-\u05FF]/g) || []).length;
    const totalChars = trimmed.length;
    if (hebrewChars > totalChars * 0.3) continue;

    filtered.push(trimmed);
  }

  return filtered;
}

/**
 * Parse the compilation DOCX "WORDS OF RABBI NACHMAN 1-.docx" which contains
 * multiple sichos separated by number headers.
 */
function parseCompilationDocx(filePath) {
  const paragraphs = extractDocxText(filePath);
  const sections = {};
  let currentSection = 0;
  let currentParagraphs = [];
  let foundStart = false;

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    // Check for section number markers
    // Could be just a number, or "5." or "#5" etc.
    const numMatch = trimmed.match(/^(\d+)\.?\s*$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= 1 && num <= 310) {
        // Save previous section
        if (currentSection > 0 && currentParagraphs.length > 0) {
          sections[currentSection] = currentParagraphs;
        }
        currentSection = num;
        currentParagraphs = [];
        foundStart = true;
        continue;
      }
    }

    // Also check for "Sicha X" or "Conversation X" markers
    const sichaMatch = trimmed.match(/^(?:sicha|sichah|conversation)\s+(\d+)/i);
    if (sichaMatch) {
      const num = parseInt(sichaMatch[1], 10);
      if (num >= 1 && num <= 310) {
        if (currentSection > 0 && currentParagraphs.length > 0) {
          sections[currentSection] = currentParagraphs;
        }
        currentSection = num;
        currentParagraphs = [];
        foundStart = true;
        continue;
      }
    }

    if (foundStart && trimmed) {
      // Skip Hebrew-heavy lines
      const hebrewChars = (trimmed.match(/[\u0590-\u05FF]/g) || []).length;
      if (hebrewChars > trimmed.length * 0.3) continue;
      // Skip common headers
      if (/^words?\s+of\s+rabbi\s+nachman/i.test(trimmed)) continue;
      if (trimmed.length < 3) continue;

      currentParagraphs.push(trimmed);
    }
  }

  // Save last section
  if (currentSection > 0 && currentParagraphs.length > 0) {
    sections[currentSection] = currentParagraphs;
  }

  return sections;
}

/**
 * Parse the multi-sicha file "272 - 274.docx"
 */
function parseMultiSichaDocx(filePath, startNum, endNum) {
  const paragraphs = extractDocxText(filePath);
  const filtered = filterContentParagraphs(paragraphs, startNum);
  const sections = {};

  // Try to find section breaks within the file
  let currentSection = startNum;
  let currentParagraphs = [];

  for (const p of filtered) {
    const trimmed = p.trim();
    // Check if this line is a section number
    const numMatch = trimmed.match(/^(\d+)\.?\s*$/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num >= startNum && num <= endNum) {
        if (currentSection > 0 && currentParagraphs.length > 0) {
          sections[currentSection] = currentParagraphs;
        }
        currentSection = num;
        currentParagraphs = [];
        continue;
      }
    }
    if (trimmed) {
      currentParagraphs.push(trimmed);
    }
  }

  if (currentSection > 0 && currentParagraphs.length > 0) {
    sections[currentSection] = currentParagraphs;
  }

  // If no internal sections found, distribute all text to the range
  if (Object.keys(sections).length === 0 && filtered.length > 0) {
    const count = endNum - startNum + 1;
    const perSection = Math.ceil(filtered.length / count);
    for (let i = startNum; i <= endNum; i++) {
      const start = (i - startNum) * perSection;
      const end = Math.min(start + perSection, filtered.length);
      if (start < filtered.length) {
        sections[i] = filtered.slice(start, end);
      }
    }
  }

  return sections;
}

function main() {
  // Collect all English sections from all DOCX files
  const allSections = {};

  // Get all DOCX files
  const files = fs.readdirSync(TRANSLATIONS_DIR)
    .filter(f => f.endsWith('.docx') && !f.startsWith('~'));

  console.log(`Found ${files.length} DOCX files in translations folder:`);
  files.forEach(f => console.log(`  ${f}`));
  console.log();

  // Process the compilation file first (has sichos 1-7+)
  const compilationFile = files.find(f => f.startsWith('WORDS OF RABBI NACHMAN 1-'));
  if (compilationFile) {
    console.log(`Processing compilation file: ${compilationFile}`);
    const sections = parseCompilationDocx(path.join(TRANSLATIONS_DIR, compilationFile));
    console.log(`  Found ${Object.keys(sections).length} sections: ${Object.keys(sections).join(', ')}`);
    for (const [num, paras] of Object.entries(sections)) {
      allSections[num] = paras;
    }
    console.log();
  }

  // Process individual numbered files
  for (const file of files) {
    if (file.startsWith('WORDS OF RABBI NACHMAN')) continue;
    if (file.startsWith('~')) continue;
    if (file.endsWith('.pdf')) continue;

    const filePath = path.join(TRANSLATIONS_DIR, file);

    // Check for multi-sicha file like "272 - 274.docx"
    const rangeMatch = file.match(/^(\d+)\s*-\s*(\d+)\.docx$/);
    if (rangeMatch) {
      const startNum = parseInt(rangeMatch[1], 10);
      const endNum = parseInt(rangeMatch[2], 10);
      console.log(`Processing multi-sicha file: ${file} (sichos ${startNum}-${endNum})`);
      const sections = parseMultiSichaDocx(filePath, startNum, endNum);
      for (const [num, paras] of Object.entries(sections)) {
        allSections[num] = paras;
        console.log(`  Sicha ${num}: ${paras.length} paragraphs`);
      }
      continue;
    }

    // Check for "232 copied from Outpouring of the Soul.docx" type files - skip these
    if (file.includes('copied from')) {
      console.log(`Skipping derivative file: ${file}`);
      continue;
    }

    // Single numbered file like "5.docx"
    const numMatch = file.match(/^(\d+)\.docx$/);
    if (!numMatch) {
      console.log(`Skipping unrecognized file: ${file}`);
      continue;
    }

    const sichaNum = parseInt(numMatch[1], 10);
    console.log(`Processing: ${file} -> sicha ${sichaNum}`);

    const paragraphs = extractDocxText(filePath);
    const filtered = filterContentParagraphs(paragraphs, sichaNum);

    if (filtered.length === 0) {
      console.log(`  WARNING: No English content found!`);
      // Show raw paragraphs for debugging
      console.log(`  Raw paragraphs (${paragraphs.length}): ${paragraphs.slice(0, 3).map(p => p.substring(0, 60)).join(' | ')}`);
      continue;
    }

    console.log(`  ${filtered.length} English paragraphs`);

    // Individual files override compilation (they're likely more complete)
    allSections[sichaNum] = filtered;
  }

  console.log(`\n=== Total: ${Object.keys(allSections).length} sichos with English ===\n`);

  // Now update reader JSON files
  let updated = 0;
  let totalSegments = 0;
  let segmentsWithEnglish = 0;

  const readerFiles = fs.readdirSync(READER_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.json');

  for (const file of readerFiles) {
    const match = file.match(/sicha-(\d+)\.json/);
    if (!match) continue;
    const sichaNum = parseInt(match[1], 10);

    const filePath = path.join(READER_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!allSections[sichaNum]) continue;

    const englishParagraphs = allSections[sichaNum];
    const segCount = data.segments.length;
    const enCount = englishParagraphs.length;

    if (enCount === segCount) {
      // Perfect 1:1 match
      for (let i = 0; i < segCount; i++) {
        data.segments[i].en = englishParagraphs[i];
      }
    } else if (enCount >= segCount) {
      // More English paragraphs than segments - combine extras
      const ratio = Math.ceil(enCount / segCount);
      for (let i = 0; i < segCount; i++) {
        const start = i * ratio;
        const end = Math.min(start + ratio, enCount);
        data.segments[i].en = englishParagraphs.slice(start, end).join(' ');
      }
    } else {
      // Fewer English paragraphs than segments - distribute proportionally
      // Join all English text, then split by Hebrew segment count
      const allEnglish = englishParagraphs.join(' ');
      const words = allEnglish.split(/\s+/);
      const wordsPerSeg = Math.ceil(words.length / segCount);

      for (let i = 0; i < segCount; i++) {
        const start = i * wordsPerSeg;
        const end = Math.min(start + wordsPerSeg, words.length);
        if (start < words.length) {
          data.segments[i].en = words.slice(start, end).join(' ');
        }
      }
    }

    // Set hasEnglish flag
    data.hasEnglish = true;

    // Count segments with English
    for (const seg of data.segments) {
      totalSegments++;
      if (seg.en && seg.en.trim()) segmentsWithEnglish++;
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    updated++;
  }

  console.log(`\n=== Results ===`);
  console.log(`  DOCX files processed: ${files.length}`);
  console.log(`  Sichos with English text: ${Object.keys(allSections).length}`);
  console.log(`  Reader files updated: ${updated}`);
  console.log(`  Total segments: ${totalSegments}`);
  console.log(`  Segments with English: ${segmentsWithEnglish}`);

  // Update index.json
  const indexPath = path.join(READER_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    let indexUpdated = 0;

    for (const torah of index.torahs) {
      const num = torah.number;
      if (allSections[num]) {
        torah.hasEnglish = true;
        indexUpdated++;
      }
    }

    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log(`  Index entries updated: ${indexUpdated}`);
  }

  // Show which sichos got English
  const sichaNumbers = Object.keys(allSections).map(Number).sort((a, b) => a - b);
  console.log(`\n  Sichos with English: ${sichaNumbers.join(', ')}`);

  // Show sichos without English
  const allReaderNums = readerFiles.map(f => {
    const m = f.match(/sicha-(\d+)\.json/);
    return m ? parseInt(m[1], 10) : 0;
  }).filter(n => n > 0);
  const withoutEnglish = allReaderNums.filter(n => !allSections[n]);
  console.log(`  Sichos without English: ${withoutEnglish.length} of ${allReaderNums.length}`);
}

main();
