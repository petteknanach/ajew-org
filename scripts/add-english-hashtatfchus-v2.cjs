/**
 * Improved English translation adder for Hashtatfchus HaNefesh (Outpouring of the Soul)
 *
 * Fixes from v1:
 * - Captures intro and foreword text (before section "1.")
 * - Maps ODT numbered sections with correct offset (+2 for intro/foreword)
 * - Handles numbering restarts for second part of book
 * - Sets hasEnglish flag correctly
 * - Updates index.json
 */

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// Try multiple paths
const ODT_PATHS = [
  'C:/Users/nanach/Documents/Translations/Outpouring of the Soul/Outpouring of the Soul for Amazon complete.odt',
  'C:/Users/Pettek/Documents/Translations/Outpouring of the Soul/Outpouring of the Soul for Amazon complete.odt',
  'C:/Users/Pettek/Documents/for ajew/Outpouring of the Soul for Amazon complete.odt',
];
const READER_DIR = path.join(__dirname, '../public/reader/hashtatfchus-hanefesh');

function extractODTText(odtPath) {
  const zip = new AdmZip(odtPath);
  const content = zip.readAsText('content.xml');
  return content
    .replace(/<text:p[^>]*>/g, '\n')
    .replace(/<text:tab[^>]*\/>/g, ' ')
    .replace(/<text:s[^>]*\/>/g, ' ')
    .replace(/<text:line-break[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function main() {
  // Find ODT file
  let odtPath = null;
  for (const p of ODT_PATHS) {
    if (fs.existsSync(p)) { odtPath = p; break; }
  }
  if (!odtPath) {
    console.error('ODT file not found!');
    process.exit(1);
  }
  console.log('Using ODT:', odtPath);

  const text = extractODTText(odtPath);
  const lines = text.split('\n').filter(l => l.trim());

  // First, get the Hebrew section structure from the reader
  const readerFiles = fs.readdirSync(READER_DIR)
    .filter(f => f.match(/^section-\d+\.json$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)[1]);
      const nb = parseInt(b.match(/(\d+)/)[1]);
      return na - nb;
    });

  console.log(`Reader has ${readerFiles.length} sections`);

  // Read Hebrew section titles for reference
  const hebrewSections = [];
  for (const f of readerFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(READER_DIR, f), 'utf8'));
    hebrewSections.push({
      file: f,
      num: parseInt(f.match(/(\d+)/)[1]),
      title: data.hebrewTitle,
      segCount: data.segments.length
    });
  }

  // Parse ODT into regions:
  // 1. Find where the intro starts (before first numbered section)
  // 2. Find where the foreword is
  // 3. Find all numbered sections
  // 4. Stop before Psalms/Tehillim section at the end

  // Strategy: Split into numbered sections, track numbering restarts
  const allSections = []; // { type: 'intro'|'foreword'|'numbered', number, paragraphs }
  let introParas = [];
  let forewordParas = [];
  let currentParas = [];
  let currentNum = null;
  let inIntro = true;
  let inForeword = false;
  let foundFirstSection = false;
  let lastNum = 0;
  let secondPartStart = null; // Track when numbering restarts

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Skip obvious non-content
    if (trimmed === 'Na Nach Nachma Nachman MeUman!' || trimmed === 'Na Nach Nachma Nachman MeUman') continue;

    // Detect Psalms/Tehillim section at end - stop processing
    if (/^(Psalms?|Tehillim|PSALMS)\b/i.test(trimmed) && foundFirstSection && lastNum > 50) {
      break;
    }

    // Check for numbered section header "N. Title"
    const sectionMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (sectionMatch) {
      const num = parseInt(sectionMatch[1]);

      // Is this a real section header or a footnote/list number?
      // Real sections: number is near expected sequence
      const isFirstSection = !foundFirstSection && num === 1;
      const isSequential = num > lastNum && num <= lastNum + 5;
      const isRestart = foundFirstSection && num === 1 && lastNum > 50; // Numbering restarts for second part

      if (isFirstSection || isSequential || isRestart) {
        // Save previous section
        if (currentNum !== null && currentParas.length > 0) {
          allSections.push({ type: 'numbered', number: currentNum, part: secondPartStart ? 2 : 1, paragraphs: [...currentParas] });
        }

        if (isRestart) {
          secondPartStart = allSections.length;
          lastNum = 0;
        }

        currentNum = num;
        lastNum = num;
        currentParas = [];
        foundFirstSection = true;
        inIntro = false;
        inForeword = false;

        // Include title as first paragraph
        const titleText = sectionMatch[2].trim();
        if (titleText.length > 5) {
          currentParas.push(titleText);
        }
        continue;
      }
    }

    // Detect foreword markers
    if (inIntro && /^(foreword|opening|preface)/i.test(trimmed)) {
      inIntro = false;
      inForeword = true;
      continue;
    }

    // Accumulate text
    if (trimmed.length < 3) continue;

    if (inIntro && !foundFirstSection) {
      introParas.push(trimmed);
    } else if (inForeword && !foundFirstSection) {
      forewordParas.push(trimmed);
    } else if (foundFirstSection) {
      currentParas.push(trimmed);
    }
  }

  // Save last section
  if (currentNum !== null && currentParas.length > 0) {
    allSections.push({ type: 'numbered', number: currentNum, part: secondPartStart ? 2 : 1, paragraphs: [...currentParas] });
  }

  console.log(`\nParsed from ODT:`);
  console.log(`  Introduction: ${introParas.length} paragraphs`);
  console.log(`  Foreword: ${forewordParas.length} paragraphs`);
  console.log(`  Numbered sections: ${allSections.length}`);
  if (secondPartStart !== null) {
    const part1Count = allSections.filter(s => s.part === 1).length;
    const part2Count = allSections.filter(s => s.part === 2).length;
    console.log(`    Part 1: ${part1Count} sections, Part 2: ${part2Count} sections`);
  }

  // Now map to reader sections:
  // Reader section 1 = הקדמה (Introduction) → introParas
  // Reader section 2 = פתיחה (Opening/Foreword) → forewordParas
  // Reader sections 3-N = numbered אות sections → allSections in order

  let updated = 0;
  let totalEnSegments = 0;
  let totalSegments = 0;

  // Map introduction
  if (introParas.length > 0) {
    const result = applyEnglish(path.join(READER_DIR, 'section-1.json'), introParas);
    if (result) { updated++; totalEnSegments += result.enSegs; totalSegments += result.totalSegs; }
  }

  // Map foreword
  if (forewordParas.length > 0) {
    const result = applyEnglish(path.join(READER_DIR, 'section-2.json'), forewordParas);
    if (result) { updated++; totalEnSegments += result.enSegs; totalSegments += result.totalSegs; }
  }

  // Map numbered sections sequentially to reader sections 3+
  for (let i = 0; i < allSections.length; i++) {
    const readerSectionNum = i + 3; // offset by 2 (intro + foreword)
    const filePath = path.join(READER_DIR, `section-${readerSectionNum}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  WARNING: No reader file for section ${readerSectionNum} (ODT section ${allSections[i].number})`);
      continue;
    }
    const result = applyEnglish(filePath, allSections[i].paragraphs);
    if (result) { updated++; totalEnSegments += result.enSegs; totalSegments += result.totalSegs; }
  }

  // Update index.json
  const indexPath = path.join(READER_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const torah of index.torahs) {
      const secFile = path.join(READER_DIR, `section-${torah.number}.json`);
      if (fs.existsSync(secFile)) {
        const data = JSON.parse(fs.readFileSync(secFile, 'utf8'));
        torah.hasEnglish = data.hasEnglish;
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log('  Updated index.json');
  }

  console.log(`\n========================================`);
  console.log(`RESULTS:`);
  console.log(`  Sections updated: ${updated} / ${readerFiles.length}`);
  console.log(`  Segments with English: ${totalEnSegments} / ${totalSegments} (${Math.round(totalEnSegments/totalSegments*100)}%)`);
  console.log(`  Sections without English: ${readerFiles.length - updated}`);
  console.log(`========================================`);
}

function applyEnglish(filePath, englishParagraphs) {
  if (!fs.existsSync(filePath)) return null;
  if (englishParagraphs.length === 0) return null;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segCount = data.segments.length;
  const enCount = englishParagraphs.length;

  // Clear existing English first
  for (const seg of data.segments) {
    seg.en = '';
  }

  if (enCount <= segCount) {
    // Fewer English paragraphs than segments - assign 1:1
    for (let i = 0; i < enCount; i++) {
      data.segments[i].en = englishParagraphs[i];
    }
  } else {
    // More English paragraphs than segments - distribute proportionally
    const parasPerSeg = enCount / segCount;
    for (let i = 0; i < segCount; i++) {
      const start = Math.floor(i * parasPerSeg);
      const end = Math.floor((i + 1) * parasPerSeg);
      data.segments[i].en = englishParagraphs.slice(start, end).join('\n\n');
    }
  }

  const enSegs = data.segments.filter(s => s.en && s.en.trim()).length;
  data.hasEnglish = enSegs > 0;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

  return { enSegs, totalSegs: segCount };
}

main();
