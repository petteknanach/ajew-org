/**
 * Hashtatfchus HaNefesh English v5 - Landmark-based parsing
 *
 * The ODT structure:
 *   - Front matter (title, dedications, TOC) → skip
 *   - "Introduction" header → intro text (maps to reader section 1)
 *   - "Foreword" header → foreword text (maps to reader section 2)
 *   - "Outpouring of the Soul" header → numbered sections start
 *   - Sections "1. Title" through "102. Title" → maps to reader sections 3+ by אות number
 *   - Part 2 numbering restarts → maps to reader sections 117-130
 *   - End matter (Psalms, Tikun HaKlali, etc.) → skip
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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ── Phase 1: Find landmarks ──

  let introStart = -1;
  let forewordStart = -1;
  let mainContentStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Find "Introduction" header (standalone or nearly so)
    if (introStart < 0 && /^Introduction$/i.test(l)) {
      introStart = i + 1;
      continue;
    }

    // Find "Foreword" header
    if (forewordStart < 0 && introStart > 0 && /^Foreword$/i.test(l)) {
      forewordStart = i + 1;
      continue;
    }

    // Find "Outpouring of the Soul" header (marks start of main content)
    if (mainContentStart < 0 && forewordStart > 0 && /^Outpouring of the Soul$/i.test(l)) {
      mainContentStart = i + 1;
      continue;
    }
  }

  console.log(`Landmarks: intro=${introStart}, foreword=${forewordStart}, main=${mainContentStart}`);

  if (introStart < 0 || mainContentStart < 0) {
    console.error('Could not find expected landmarks in ODT!');
    process.exit(1);
  }

  // ── Phase 2: Extract regions ──

  // Introduction: from introStart to forewordStart (or mainContentStart if no foreword)
  const introEnd = forewordStart > 0 ? forewordStart - 1 : mainContentStart - 1;
  const introParas = filterContent(lines.slice(introStart, introEnd));

  // Foreword: from forewordStart to mainContentStart
  const forewordParas = forewordStart > 0
    ? filterContent(lines.slice(forewordStart, mainContentStart - 1))
    : [];

  // Main content: from mainContentStart to end (we'll stop at Psalms/Tikun)
  const mainLines = lines.slice(mainContentStart);

  console.log(`Introduction: ${introParas.length} paragraphs`);
  console.log(`Foreword: ${forewordParas.length} paragraphs`);
  console.log(`Main content lines: ${mainLines.length}`);

  // ── Phase 3: Parse numbered sections from main content ──

  const odtSections = []; // { part, num, paragraphs }
  let currentParas = [];
  let currentNum = null;
  let lastNum = 0;
  let odtPart = 1;
  let stopped = false;

  for (const line of mainLines) {
    if (stopped) break;

    // Skip markers
    if (line === 'Na Nach Nachma Nachman MeUman!' || line === 'Na Nach Nachma Nachman MeUman') continue;
    if (line.length < 3) continue;

    // Detect end of main content - only stop on these if they're standalone headers,
    // not inline references. "Likutay Halachos" can appear as a reference within sections.
    // Only stop on multi-word boundary markers that clearly mark a new major section.
    if (/^(Rabbi Nachman of Breslov;\s+Who He Was|Tikun Hak|PSALMS|Short prayer$|Map with directions)/i.test(line)) {
      stopped = true;
      continue;
    }
    // Also stop if we see "Likutay Halachos" as a standalone section header
    // (longer than just a reference) AND we've already processed many sections
    if (/^Likutay Halachos\s+(regarding|laws|hilchos)/i.test(line) && odtSections.length > 50) {
      stopped = true;
      continue;
    }

    // Check for numbered section header
    const m = line.match(/^(\d+)\.\s+(.*)/);
    if (m) {
      const num = parseInt(m[1]);

      const isFirst = currentNum === null && num === 1;
      const isSequential = num > lastNum && num <= lastNum + 5;
      const isRestart = currentNum !== null && num <= 3 && lastNum > 50;

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

        const titleText = m[2].trim();
        if (titleText.length > 5) currentParas.push(titleText);
        continue;
      }
    }

    if (currentNum !== null) {
      currentParas.push(line);
    }
  }

  // Save last
  if (currentNum !== null && currentParas.length > 0) {
    odtSections.push({ part: odtPart, num: currentNum, paragraphs: [...currentParas] });
  }

  const part1Secs = odtSections.filter(s => s.part === 1);
  const part2Secs = odtSections.filter(s => s.part === 2);
  console.log(`\nPart 1: ${part1Secs.length} sections (${part1Secs.length > 0 ? part1Secs[0].num + '-' + part1Secs[part1Secs.length-1].num : ''})`);
  console.log(`Part 2: ${part2Secs.length} sections (${part2Secs.length > 0 ? part2Secs[0].num + '-' + part2Secs[part2Secs.length-1].num : ''})`);

  // ── Phase 4: Build Hebrew mapping ──

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

  // Build lookup: for each Hebrew section, find matching ODT content
  // Group ODT sections by part+num (in case of duplicates, concatenate)
  const odtLookup = {};
  for (const sec of odtSections) {
    const key = `${sec.part}-${sec.num}`;
    if (!odtLookup[key]) odtLookup[key] = [];
    odtLookup[key].push(...sec.paragraphs);
  }

  // For Hebrew sections with duplicate numbers (e.g., two אות-א sections in Part 1),
  // we need a different strategy. Map sequentially within each Hebrew part.
  // Build ordered lists per part
  const hPart1Ordered = hebrewSections.filter(s => s.hPart === 1);
  const hPart2Ordered = hebrewSections.filter(s => s.hPart === 2);

  // For Hebrew sections where multiple share the same אות number,
  // distribute the ODT content. First let's check for duplicates.
  const hPart1ByNum = {};
  for (const hs of hPart1Ordered) {
    if (!hPart1ByNum[hs.hNum]) hPart1ByNum[hs.hNum] = [];
    hPart1ByNum[hs.hNum].push(hs);
  }

  const uniqueNums = Object.keys(hPart1ByNum).map(Number).sort((a, b) => a - b);
  const duplicateNums = uniqueNums.filter(n => hPart1ByNum[n].length > 1);
  if (duplicateNums.length > 0) {
    console.log(`\nNote: ${duplicateNums.length} Hebrew Part 1 numbers have multiple sections`);
  }

  // ── Phase 5: Apply English ──

  let updated = 0;
  let totalEnSegs = 0;
  let totalSegs = 0;
  const unmatched = [];

  for (const hs of hebrewSections) {
    let englishParas = null;

    if (hs.type === 'intro') {
      englishParas = introParas;
    } else if (hs.type === 'foreword') {
      englishParas = forewordParas;
    } else if (hs.type === 'numbered') {
      const key = `${hs.hPart}-${hs.hNum}`;
      const allParas = odtLookup[key];

      if (allParas) {
        // If multiple Hebrew sections share this number, split the content
        const siblings = hs.hPart === 1 ? hPart1ByNum[hs.hNum] : [hs];
        if (siblings.length > 1) {
          const sibIdx = siblings.indexOf(hs);
          const totalSibSegs = siblings.reduce((s, sib) => s + sib.data.segments.length, 0);
          const mySegs = hs.data.segments.length;
          const myRatio = mySegs / totalSibSegs;
          const myStart = Math.floor(sibIdx / siblings.length * allParas.length);
          const myEnd = Math.floor((sibIdx + 1) / siblings.length * allParas.length);
          englishParas = allParas.slice(myStart, myEnd);
        } else {
          englishParas = allParas;
        }
      } else {
        unmatched.push(`Section ${hs.readerNum} (Part ${hs.hPart} #${hs.hNum} ${hs.data.hebrewTitle})`);
      }
    }

    if (englishParas && englishParas.length > 0) {
      applyEnglish(hs.data, englishParas);
      updated++;
    } else {
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
  if (unmatched.length > 0) {
    console.log(`\n  Unmatched (${unmatched.length}):`);
    unmatched.forEach(m => console.log(`    ${m}`));
  }
  console.log(`========================================`);
}

function filterContent(lines) {
  return lines.filter(l => {
    if (l.length < 3) return false;
    if (l === 'Na Nach Nachma Nachman MeUman!' || l === 'Na Nach Nachma Nachman MeUman') return false;
    if (/^_+$/.test(l)) return false;
    return true;
  });
}

function applyEnglish(data, englishParas) {
  const segCount = data.segments.length;
  const enCount = englishParas.length;

  for (const seg of data.segments) seg.en = '';

  if (enCount <= segCount) {
    for (let i = 0; i < enCount; i++) {
      data.segments[i].en = englishParas[i];
    }
  } else {
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
