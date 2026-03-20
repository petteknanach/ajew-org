/**
 * Hashtatfchus HaNefesh English v4 - Number-matched mapping
 *
 * Maps ODT numbered sections to Hebrew sections by matching the אות number,
 * handling duplicate Hebrew numbers and Part 2 separately.
 *
 * Hebrew structure:
 *   - Section 1: הקדמה (Introduction, 70 segments)
 *   - Section 2: פתיחה (Opening, 12 segments)
 *   - Sections 3-116: אות numbered 1-102 (Part 1, 114 sections, some duplicate numbers)
 *   - Sections 117-130: אות numbered 1-14 (Part 2)
 *
 * ODT structure:
 *   - Intro text before section "1."
 *   - Part 1: sections 1-102
 *   - Part 2: sections 1-84+ (numbering restarts)
 *   - Psalms transliteration at end (skip)
 */

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const ODT_PATHS = [
  'C:/Users/nanach/Documents/Translations/Outpouring of the Soul/Outpouring of the Soul for Amazon complete.odt',
  'C:/Users/Pettek/Documents/Translations/Outpouring of the Soul/Outpouring of the Soul for Amazon complete.odt',
  'C:/Users/Pettek/Documents/for ajew/Outpouring of the Soul for Amazon complete.odt',
];
const READER_DIR = path.join(__dirname, '../public/reader/hashtatfchus-hanefesh');

function hebrewToNum(h) {
  const vals = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
    'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,'ק':100};
  let sum = 0;
  for (const c of h) { if (vals[c]) sum += vals[c]; }
  return sum;
}

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
  let odtPath = null;
  for (const p of ODT_PATHS) {
    if (fs.existsSync(p)) { odtPath = p; break; }
  }
  if (!odtPath) { console.error('ODT file not found!'); process.exit(1); }
  console.log('Using ODT:', odtPath);

  const text = extractODTText(odtPath);
  const lines = text.split('\n').filter(l => l.trim());

  // ── Parse ODT into structured sections ──

  const introParas = [];
  const odtSections = []; // { part, num, paragraphs }
  let currentParas = [];
  let currentNum = null;
  let lastNum = 0;
  let odtPart = 1;
  let foundFirst = false;
  let hitPsalms = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (trimmed === 'Na Nach Nachma Nachman MeUman!' || trimmed === 'Na Nach Nachma Nachman MeUman') continue;

    // Detect Psalms section at end
    if (/^(Psalm|Tehilim|PSALM)/i.test(trimmed) && foundFirst && lastNum > 10) {
      hitPsalms = true;
    }
    // Also detect transliteration markers
    if (hitPsalms) {
      // Check if we're in the Psalms transliteration (lots of transliterated text)
      if (/^(\d+\.\s+)?[A-Z][a-z]+oo[a-z]/i.test(trimmed)) continue;
      // If we hit something that looks like numbered content again, maybe it's just footnotes
      continue; // Skip everything after Psalms detected
    }

    // Check for section header
    const sectionMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (sectionMatch) {
      const num = parseInt(sectionMatch[1]);

      const isFirst = !foundFirst && num === 1;
      const isSequential = num > lastNum && num <= lastNum + 5;
      const isRestart = foundFirst && num <= 3 && lastNum > 50;

      if (isFirst || isSequential || isRestart) {
        // Save previous
        if (currentNum !== null && currentParas.length > 0) {
          odtSections.push({ part: odtPart, num: currentNum, paragraphs: [...currentParas] });
        }

        if (isRestart) {
          odtPart++;
          lastNum = 0;
        }

        currentNum = num;
        lastNum = num;
        currentParas = [];
        foundFirst = true;

        const titleText = sectionMatch[2].trim();
        if (titleText.length > 5) currentParas.push(titleText);
        continue;
      }
    }

    if (!foundFirst) {
      introParas.push(trimmed);
    } else {
      currentParas.push(trimmed);
    }
  }

  // Save last section
  if (currentNum !== null && currentParas.length > 0) {
    odtSections.push({ part: odtPart, num: currentNum, paragraphs: [...currentParas] });
  }

  // Group ODT sections by part and number
  const odtByPartNum = {}; // "part-num" -> concatenated paragraphs
  for (const sec of odtSections) {
    const key = `${sec.part}-${sec.num}`;
    if (!odtByPartNum[key]) {
      odtByPartNum[key] = [];
    }
    odtByPartNum[key].push(...sec.paragraphs);
  }

  const part1Secs = odtSections.filter(s => s.part === 1);
  const part2Secs = odtSections.filter(s => s.part === 2);
  console.log(`\nODT parsed:`);
  console.log(`  Introduction: ${introParas.length} paragraphs`);
  console.log(`  Part 1: ${part1Secs.length} sections (${Math.min(...part1Secs.map(s=>s.num))}-${Math.max(...part1Secs.map(s=>s.num))})`);
  console.log(`  Part 2: ${part2Secs.length} sections (${Math.min(...part2Secs.map(s=>s.num))}-${Math.max(...part2Secs.map(s=>s.num))})`);

  // ── Build Hebrew reader mapping ──

  const hebrewSections = [];
  let hPart = 1;
  let prevHNum = 0;

  for (let i = 1; i <= 130; i++) {
    const f = path.join(READER_DIR, `section-${i}.json`);
    if (!fs.existsSync(f)) continue;
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const title = data.hebrewTitle;

    if (title === 'הקדמה') {
      hebrewSections.push({ readerNum: i, type: 'intro', hPart: 0, hNum: 0, data });
      continue;
    }
    if (title === 'פתיחה') {
      hebrewSections.push({ readerNum: i, type: 'foreword', hPart: 0, hNum: 0, data });
      continue;
    }

    const m = title.match(/אות-(.*)/);
    if (m) {
      const num = hebrewToNum(m[1]);
      if (num < prevHNum - 10 && prevHNum > 20) hPart++;
      prevHNum = num;
      hebrewSections.push({ readerNum: i, type: 'numbered', hPart, hNum: num, data });
    }
  }

  console.log(`\nHebrew structure:`);
  const hPart1 = hebrewSections.filter(s => s.hPart === 1);
  const hPart2 = hebrewSections.filter(s => s.hPart === 2);
  console.log(`  Special: ${hebrewSections.filter(s => s.type !== 'numbered').length}`);
  console.log(`  Part 1: ${hPart1.length} sections (nums ${Math.min(...hPart1.map(s=>s.hNum))}-${Math.max(...hPart1.map(s=>s.hNum))})`);
  console.log(`  Part 2: ${hPart2.length} sections (nums ${Math.min(...hPart2.map(s=>s.hNum))}-${Math.max(...hPart2.map(s=>s.hNum))})`);

  // ── Apply English to Hebrew sections ──

  let updated = 0;
  let totalEnSegs = 0;
  let totalSegs = 0;
  let mismatches = [];

  for (const hs of hebrewSections) {
    let englishParas = null;

    if (hs.type === 'intro') {
      englishParas = introParas;
    } else if (hs.type === 'foreword') {
      // Foreword might be a subsection of the intro or its own thing
      // If we didn't capture it separately, skip
      englishParas = null;
    } else if (hs.type === 'numbered') {
      // Map by part + number
      const key = `${hs.hPart}-${hs.hNum}`;
      englishParas = odtByPartNum[key] || null;

      if (!englishParas) {
        mismatches.push(`Section ${hs.readerNum} (Part ${hs.hPart} #${hs.hNum}): no ODT match`);
      }
    }

    if (englishParas && englishParas.length > 0) {
      applyEnglish(hs.data, englishParas);
      updated++;
    } else {
      // Clear any existing bad English
      for (const seg of hs.data.segments) seg.en = '';
      hs.data.hasEnglish = false;
    }

    totalEnSegs += hs.data.segments.filter(s => s.en && s.en.trim()).length;
    totalSegs += hs.data.segments.length;

    fs.writeFileSync(path.join(READER_DIR, `section-${hs.readerNum}.json`), JSON.stringify(hs.data, null, 2), 'utf8');
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
  }

  console.log(`\n========================================`);
  console.log(`RESULTS:`);
  console.log(`  Sections with English: ${updated} / ${hebrewSections.length}`);
  console.log(`  Segments with English: ${totalEnSegs} / ${totalSegs} (${Math.round(totalEnSegs/totalSegs*100)}%)`);
  if (mismatches.length > 0) {
    console.log(`\n  Unmatched sections (${mismatches.length}):`);
    mismatches.forEach(m => console.log(`    ${m}`));
  }
  console.log(`========================================`);
}

function applyEnglish(data, englishParas) {
  const segCount = data.segments.length;
  const enCount = englishParas.length;

  // Clear existing
  for (const seg of data.segments) seg.en = '';

  if (enCount <= segCount) {
    for (let i = 0; i < enCount; i++) {
      data.segments[i].en = englishParas[i];
    }
  } else {
    // More English than Hebrew - distribute proportionally
    const parasPerSeg = enCount / segCount;
    for (let i = 0; i < segCount; i++) {
      const start = Math.floor(i * parasPerSeg);
      const end = Math.floor((i + 1) * parasPerSeg);
      data.segments[i].en = englishParas.slice(start, end).join('\n\n');
    }
  }

  data.hasEnglish = data.segments.some(s => s.en && s.en.trim());
}

main();
