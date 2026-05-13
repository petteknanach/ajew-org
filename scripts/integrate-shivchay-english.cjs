const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'shivchay-haran');
const DOCX_PATH = 'C:/Users/nanach/Documents/Translations/Shivchay HuRan - The Praises of Rabbi Nachman.docx';

async function main() {
  console.log('Reading DOCX...');
  const result = await mammoth.extractRawText({ path: DOCX_PATH });
  const rawLines = result.value.split('\n');
  const nonEmpty = rawLines.filter(l => l.trim().length > 0).map(l => l.trim());

  console.log('Total non-empty lines:', nonEmpty.length);

  // Find the section boundary between Part 1 and Part 2
  // Part 1: sections 1-27 (youth)
  // Part 2: sections 1-36 (Israel voyage) - numbering restarts

  const numRegex = /^(\d{1,3})\.\s*/;

  // Parse all entries: find numbered lines and group paragraphs
  const allEntries = [];
  let currentNum = 0;
  let currentParas = [];
  let sectionCount = 0;
  let part = 1;
  let lastNum = 0;

  for (let i = 0; i < nonEmpty.length; i++) {
    const line = nonEmpty[i];
    const match = line.match(numRegex);

    if (match) {
      const num = parseInt(match[1]);

      // Detect part boundary: numbering restarts from 1
      if (num === 1 && lastNum > 1 && currentNum > 0) {
        // Save previous entry
        if (currentParas.length > 0) {
          allEntries.push({ part, num: currentNum, paragraphs: [...currentParas] });
        }
        part = 2; // Switch to part 2
      } else if (currentNum > 0 && currentParas.length > 0) {
        // Save previous entry
        allEntries.push({ part, num: currentNum, paragraphs: [...currentParas] });
      }

      currentNum = num;
      lastNum = num;
      currentParas = [];

      // The text after the number is the first paragraph
      const text = line.substring(match[0].length).trim();
      if (text) {
        currentParas.push(text);
      }
    } else if (currentNum > 0) {
      // This is a continuation paragraph
      // Skip non-English lines (section headers, etc.)
      if (/^[A-Za-z"'\(\[‎]/.test(line) || line.startsWith('‎')) {
        // Clean any invisible characters
        const cleaned = line.replace(/[\u200F\u200E\uFEFF]/g, '').trim();
        if (cleaned) currentParas.push(cleaned);
      }
    }
  }
  // Save last entry
  if (currentNum > 0 && currentParas.length > 0) {
    allEntries.push({ part, num: currentNum, paragraphs: [...currentParas] });
  }

  console.log(`Found ${allEntries.length} entries (Part 1: ${allEntries.filter(e => e.part === 1).length}, Part 2: ${allEntries.filter(e => e.part === 2).length})`);

  // Map entries to JSON section numbers
  // Part 1: DOCX #1 = JSON section-1, DOCX #2 = section-2, ..., DOCX #27 = section-27
  // Part 2: DOCX #1 = JSON section-28, DOCX #2 = section-29, ..., DOCX #36 = section-63

  let totalUpdated = 0;

  for (const entry of allEntries) {
    let jsonSectionNum;
    if (entry.part === 1) {
      jsonSectionNum = entry.num;
    } else {
      jsonSectionNum = 27 + entry.num;
    }

    const jsonFile = path.join(READER_DIR, `section-${jsonSectionNum}.json`);
    if (!fs.existsSync(jsonFile)) {
      console.log(`  SKIP section-${jsonSectionNum}: file not found`);
      continue;
    }

    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    const segments = json.segments;
    let matched = 0;

    if (segments.length === 1 && entry.paragraphs.length >= 1) {
      // Single segment: combine all English paragraphs
      segments[0].en = entry.paragraphs.join('\n\n');
      matched = 1;
    } else if (segments.length === entry.paragraphs.length) {
      // Perfect match: assign 1:1
      for (let i = 0; i < segments.length; i++) {
        segments[i].en = entry.paragraphs[i];
        matched++;
      }
    } else if (entry.paragraphs.length >= segments.length) {
      // More English paragraphs than segments: assign first N, combine extras into last
      for (let i = 0; i < segments.length; i++) {
        if (i < segments.length - 1) {
          segments[i].en = entry.paragraphs[i];
        } else {
          // Combine remaining paragraphs into last segment
          segments[i].en = entry.paragraphs.slice(i).join('\n\n');
        }
        matched++;
      }
    } else {
      // Fewer English paragraphs than segments: assign what we have
      for (let i = 0; i < entry.paragraphs.length; i++) {
        segments[i].en = entry.paragraphs[i];
        matched++;
      }
    }

    if (matched > 0) {
      json.hasEnglish = true;
      fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2), 'utf8');
      totalUpdated += matched;
    }

    console.log(`  Section ${jsonSectionNum} (P${entry.part}#${entry.num}): ${matched}/${segments.length} segments (${entry.paragraphs.length} EN paras)`);
  }

  // Also handle the introduction text (before section 1)
  // Check if there's an intro in the JSON
  const introFile = path.join(READER_DIR, 'section-0.json');
  // Not all books have section-0, skip if not found

  // Update index.json
  const indexFile = path.join(READER_DIR, 'index.json');
  const indexJson = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  for (const torah of indexJson.torahs) {
    const secFile = path.join(READER_DIR, `section-${torah.number}.json`);
    if (fs.existsSync(secFile)) {
      const secJson = JSON.parse(fs.readFileSync(secFile, 'utf8'));
      torah.hasEnglish = secJson.hasEnglish || false;
    }
  }
  fs.writeFileSync(indexFile, JSON.stringify(indexJson, null, 2), 'utf8');

  console.log(`\nTotal: ${totalUpdated} segments updated across ${allEntries.length} sections.`);
}

main().catch(err => console.error('Error:', err));
