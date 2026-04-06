/**
 * Master import script for all temp folder items:
 * 1. Sichos Metoch Chayay HaSaba (new book)
 * 2. Likutay Eitzos English (from docx via mammoth)
 * 3. Updated Kitzur LKM
 * 4. Updated Otzar volume Mem
 * 5. Updated Parparos LaChochma
 */
const fs = require('fs');
const path = require('path');

const PROJECT = path.resolve(__dirname, '..');
const READER = path.join(PROJECT, 'public', 'reader');
const TEMP = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder';

// ─── Shared HTML helpers ────────────────────────────────────────
function stripHtml(html) {
  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013');
  text = text.replace(/&hellip;/g, '\u2026');
  text = text.replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018');
  text = text.replace(/&rdquo;/g, '\u201D').replace(/&ldquo;/g, '\u201C');
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  return text.trim();
}

function extractTeachingText(html) {
  let text = html;
  text = text.replace(/<span class="heb-term">([^<]+)<\/span>/g, '$1');
  text = text.replace(/<em class=['"]verse['"]>([\s\S]*?)<\/em>/g, (m, inner) => '"' + inner.replace(/<[^>]+>/g, '') + '"');
  text = text.replace(/<em>([^<]*)<\/em>/g, '"$1"');
  text = text.replace(/<strong>([^<]*)<\/strong>/g, '$1');
  text = text.replace(/<span class="key">([^<]+)<\/span>/g, '$1');
  text = text.replace(/<span class="acrostic">([^<]+)<\/span>/g, '$1');
  text = text.replace(/<span class="root-note">([\s\S]*?)<\/span>/g, (m, inner) => '\n' + stripHtml(inner));
  return stripHtml(text);
}

function normalize(text) {
  return text.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 60);
}

// ═══════════════════════════════════════════════════════════════
// TASK 1: Sichos Metoch Chayay HaSaba (NEW BOOK)
// ═══════════════════════════════════════════════════════════════
function importSichos() {
  console.log('\n' + '='.repeat(60));
  console.log('TASK 1: Import Sichos Metoch Chayay HaSaba');
  console.log('='.repeat(60));

  const sourceDir = path.join(TEMP, 'Seechoas Meetoach Chayay Hasaba');
  const targetDir = path.join(READER, 'sichos-chayay-saba');
  fs.mkdirSync(targetDir, { recursive: true });

  const partFiles = fs.readdirSync(sourceDir)
    .filter(f => /^Sichos_Part\d+/i.test(f) && f.endsWith('.html'))
    .sort((a, b) => {
      const na = parseInt(a.match(/Part(\d+)/i)[1]);
      const nb = parseInt(b.match(/Part(\d+)/i)[1]);
      return na - nb;
    });

  console.log(`Found ${partFiles.length} part files`);

  const allSections = [];

  for (const file of partFiles) {
    const partNum = parseInt(file.match(/Part(\d+)/i)[1]);
    const html = fs.readFileSync(path.join(sourceDir, file), 'utf8');

    // Extract part header for title
    const partMatch = html.match(/<div class="part-header">([\s\S]*?)<\/div>/);
    const partTitle = partMatch ? stripHtml(partMatch[1]).replace(/\n/g, ' ') : `Part ${partNum}`;

    // Extract paragraph blocks with he/en pairs
    const segments = [];
    const blockRegex = /<div class="paragraph-block">([\s\S]*?)<\/div>\s*<\/div>/g;
    let match;

    // Better approach: split by paragraph-block
    const blocks = html.split(/<div class="paragraph-block">/);
    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];
      const heMatch = block.match(/<div class="hebrew-para">([\s\S]*?)<\/div>/);
      const enMatch = block.match(/<div class="english-para">([\s\S]*?)<\/div>/);

      const he = heMatch ? stripHtml(heMatch[1]) : '';
      const en = enMatch ? stripHtml(enMatch[1]) : '';

      if (he || en) {
        segments.push({ index: segments.length + 1, he, en });
      }
    }

    if (segments.length === 0) {
      console.log(`  [SKIP] ${file}: no segments`);
      continue;
    }

    const sectionNum = allSections.length + 1;

    // Hebrew part names
    const hePartNames = ['', 'חלק א', 'חלק ב', 'חלק ג', 'חלק ד', 'חלק ה', 'חלק ו', 'חלק ז', 'חלק ח', 'חלק ט', 'חלק י', 'חלק יא', 'חלק יב', 'חלק יג', 'חלק יד', 'חלק טו', 'חלק טז', 'חלק יז'];

    allSections.push({
      number: sectionNum,
      partNum,
      title: partTitle,
      hebrewTitle: hePartNames[partNum] || `חלק ${partNum}`,
      segments
    });

    console.log(`  Part ${partNum} -> Section ${sectionNum}: ${segments.length} segments`);
  }

  // Write section JSON files
  let totalSegs = 0, totalEn = 0, totalHe = 0;

  for (const section of allSections) {
    const data = {
      id: `scs-${section.number}`,
      book: 'sichos-chayay-saba',
      part: 1,
      torah: section.number,
      displayNumber: section.number,
      title: section.title,
      hebrewTitle: section.hebrewTitle,
      keyVerse: '', keyVerseTranslation: '', keyVerseRef: '',
      themes: [], keywords: [], simanim: [],
      segments: section.segments,
      totalParagraphs: section.segments.length,
      hasEnglish: section.segments.some(s => s.en && s.en.trim()),
      navigation: {
        prev: section.number > 1 ? `scs-${section.number - 1}` : null,
        next: section.number < allSections.length ? `scs-${section.number + 1}` : null,
        prevUrl: section.number > 1 ? `/reader/sichos-chayay-saba/1/${section.number - 1}` : null,
        nextUrl: section.number < allSections.length ? `/reader/sichos-chayay-saba/1/${section.number + 1}` : null,
      }
    };
    fs.writeFileSync(path.join(targetDir, `section-${section.number}.json`), JSON.stringify(data, null, 2), 'utf8');
    totalSegs += section.segments.length;
    totalEn += section.segments.filter(s => s.en && s.en.trim()).length;
    totalHe += section.segments.filter(s => s.he && s.he.trim()).length;
  }

  // Write index.json
  const index = {
    book: 'sichos-chayay-saba',
    part: 1,
    title: 'Sichos Metoch Chayay HaSaba',
    hebrewTitle: '\u05E9\u05D9\u05D7\u05D5\u05EA \u05DE\u05EA\u05D5\u05DA \u05D7\u05D9\u05D9 \u05D4\u05E1\u05D1\u05D0',
    author: 'Saba Yisroel (Rabbi Yisroel Dov Odesser)',
    hebrewAuthor: '\u05D4\u05E1\u05D1\u05D0 \u05D9\u05E9\u05E8\u05D0\u05DC \u05D3\u05D1-\u05D1\u05E8 \u05D0\u05D5\u05D3\u05E1\u05E8',
    totalTorahs: allSections.length,
    torahs: allSections.map(s => ({
      number: s.number,
      displayNumber: s.number,
      title: s.title,
      hebrewTitle: s.hebrewTitle,
      themes: [],
      paragraphs: s.segments.length,
      hasEnglish: s.segments.some(seg => seg.en && seg.en.trim()),
      url: `/reader/sichos-chayay-saba/1/${s.number}`
    }))
  };
  fs.writeFileSync(path.join(targetDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');

  console.log(`\nSichos Chayay Saba: ${allSections.length} sections, ${totalSegs} segments`);
  console.log(`  Hebrew: ${totalHe}/${totalSegs} (${Math.round(totalHe/totalSegs*100)}%)`);
  console.log(`  English: ${totalEn}/${totalSegs} (${Math.round(totalEn/totalSegs*100)}%)`);

  return { sections: allSections.length, segments: totalSegs };
}

// ═══════════════════════════════════════════════════════════════
// TASK 2: Likutay Eitzos English (from DOCX)
// ═══════════════════════════════════════════════════════════════
async function importLikutayEitzos() {
  console.log('\n' + '='.repeat(60));
  console.log('TASK 2: Import Likutay Eitzos English Translation');
  console.log('='.repeat(60));

  let mammoth;
  try {
    mammoth = require('mammoth');
  } catch (e) {
    console.log('Installing mammoth...');
    require('child_process').execSync('npm install mammoth', { cwd: PROJECT, stdio: 'inherit' });
    mammoth = require('mammoth');
  }

  const docxPath = path.join(TEMP, 'A Collection of Advice.docx');
  if (!fs.existsSync(docxPath)) {
    console.log(`ERROR: ${docxPath} not found`);
    return;
  }

  const result = await mammoth.convertToHtml({ path: docxPath });
  const html = result.value;

  // Extract paragraphs from the HTML
  const allParas = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text.length > 5) {
      allParas.push(text);
    }
  }

  console.log(`Extracted ${allParas.length} paragraphs from docx`);

  // Load existing reader files
  const readerDir = path.join(READER, 'likutay-eitzos');
  const topicFiles = fs.readdirSync(readerDir)
    .filter(f => f.startsWith('topic-') && f.endsWith('.json'))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  // Count before
  let totalSegs = 0, beforeEn = 0;
  for (const tf of topicFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(readerDir, tf), 'utf8'));
    for (const seg of data.segments) {
      totalSegs++;
      if (seg.en && seg.en.trim()) beforeEn++;
    }
  }
  console.log(`Before: ${beforeEn}/${totalSegs} (${Math.round(beforeEn/totalSegs*100)}%)`);

  // Build norm map from English paragraphs
  const enNormMap = {};
  for (let i = 0; i < allParas.length; i++) {
    const norm = normalize(allParas[i]);
    if (norm.length > 20 && !enNormMap[norm]) enNormMap[norm] = i;
  }

  // Sequential assignment with sync
  let lastSyncedEnIdx = 0;
  let matched = 0, modifiedFiles = 0;

  for (const tf of topicFiles) {
    const filePath = path.join(readerDir, tf);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileChanged = false;

    // Try to sync by finding existing English
    let syncIdx = -1;
    for (const seg of data.segments) {
      if (seg.en && seg.en.trim()) {
        const norm = normalize(seg.en);
        if (norm.length > 20 && enNormMap[norm] !== undefined) {
          syncIdx = enNormMap[norm];
          break;
        }
      }
    }

    if (syncIdx >= 0) {
      const firstEnSegIdx = data.segments.findIndex(s => s.en && s.en.trim());
      lastSyncedEnIdx = Math.max(0, syncIdx - firstEnSegIdx);
    }

    let localEnIdx = lastSyncedEnIdx;
    for (const seg of data.segments) {
      if (seg.en && seg.en.trim()) { localEnIdx++; continue; }
      if (localEnIdx < allParas.length) {
        seg.en = allParas[localEnIdx];
        matched++;
        fileChanged = true;
        localEnIdx++;
      }
    }
    lastSyncedEnIdx = localEnIdx;

    if (fileChanged) {
      data.hasEnglish = true;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      modifiedFiles++;
    }
  }

  // Update index
  const indexPath = path.join(readerDir, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const entry of index.torahs) {
      const tp = path.join(readerDir, `topic-${entry.number}.json`);
      if (fs.existsSync(tp)) {
        const d = JSON.parse(fs.readFileSync(tp, 'utf8'));
        entry.hasEnglish = d.segments.some(s => s.en && s.en.trim());
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  console.log(`Matched: ${matched} new segments across ${modifiedFiles} files`);
  console.log(`Final: ${beforeEn + matched}/${totalSegs} (${Math.round((beforeEn + matched)/totalSegs*100)}%)`);
}

// ═══════════════════════════════════════════════════════════════
// TASK 3: Updated Kitzur LKM
// ═══════════════════════════════════════════════════════════════
function importKitzur() {
  console.log('\n' + '='.repeat(60));
  console.log('TASK 3: Update Kitzur Likutay Moharan English');
  console.log('='.repeat(60));

  const sourceDir = path.join(TEMP, 'Kitzure lkm');
  const targetBase = path.join(READER, 'kitzur-likutay-moharan');

  const htmlFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.html')).sort();
  console.log(`Found ${htmlFiles.length} HTML files`);

  // Count before
  let totalSegs = 0, beforeEn = 0;
  for (const partNum of [1, 2]) {
    const pd = path.join(targetBase, `part-${partNum}`);
    if (!fs.existsSync(pd)) continue;
    const files = fs.readdirSync(pd).filter(f => f.startsWith('torah-'));
    for (const f of files) {
      const d = JSON.parse(fs.readFileSync(path.join(pd, f), 'utf8'));
      for (const s of d.segments) { totalSegs++; if (s.en && s.en.trim()) beforeEn++; }
    }
  }
  console.log(`Before: ${beforeEn}/${totalSegs} (${Math.round(beforeEn/totalSegs*100)}%)`);

  // Parse all HTML files - extract teaching-text content
  const allTorahs = [];
  const continuations = {};

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(sourceDir, file), 'utf8');
    const defaultPart = file.startsWith('6') ? 2 : 1;

    // Split by torah-heading
    const torahSections = html.split(/<div class="torah-heading">/);

    for (let i = 1; i < torahSections.length; i++) {
      const section = torahSections[i];
      const labelMatch = section.match(/<div class="torah-label">([\s\S]*?)<\/div>/);
      if (!labelMatch) continue;
      const label = stripHtml(labelMatch[1]);

      let part = defaultPart;
      if (/Part Two/i.test(label)) part = 2;

      let torahNum = null;
      const numMatch = label.match(/Toirah\s+(\d+)/i);
      const alephMatch = label.match(/Toirah\s+Aleph/i);
      if (alephMatch) torahNum = 1;
      else if (numMatch) torahNum = parseInt(numMatch[1]);
      if (torahNum === null) continue;

      const isContinuation = /Continuation/i.test(label);
      const items = [];

      // Extract teaching items
      const teachingRegex = /<li class="teaching-item">\s*<div class="teaching-num">([\s\S]*?)<\/div>\s*<div class="teaching-text">([\s\S]*?)<\/div>\s*<\/li>/g;
      const bracketRegex = /<div class="bracket-note">([\s\S]*?)<\/div>/g;
      const singleParaRegex = /<div class="single-para">([\s\S]*?)<\/div>/g;

      const allMatches = [];
      let m;
      while ((m = teachingRegex.exec(section)) !== null) {
        allMatches.push({ pos: m.index, type: 'teaching', text: extractTeachingText(m[2]) });
      }
      while ((m = bracketRegex.exec(section)) !== null) {
        allMatches.push({ pos: m.index, type: 'bracket', text: extractTeachingText(m[1]) });
      }
      while ((m = singleParaRegex.exec(section)) !== null) {
        allMatches.push({ pos: m.index, type: 'single-para', text: extractTeachingText(m[1]) });
      }
      allMatches.sort((a, b) => a.pos - b.pos);

      if (isContinuation) {
        const key = `${part}-${torahNum}`;
        if (!continuations[key]) continuations[key] = [];
        continuations[key].push(...allMatches);
      } else {
        allTorahs.push({ torahNum, part, isContinuation: false, label, items: allMatches });
      }
    }

    // Also check for preface content
    if (file.includes('010')) {
      const prefaceSections = ['publisher', 'nosson', 'lchu'];
      const prefaceJsonNums = [1, 2, 3];
      for (let pi = 0; pi < prefaceSections.length; pi++) {
        const regex = new RegExp(`<div class="preface-block ${prefaceSections[pi]}">[\\s\\S]*?<\\/div>\\s*(?:<\\/div>|\\n\\s*\\n)`, 'i');
        const pm = html.match(regex);
        if (pm) {
          const pParas = pm[0].match(/<p>([\s\S]*?)<\/p>/g);
          if (pParas) {
            allTorahs.push({
              torahNum: `preface-${prefaceSections[pi]}`,
              part: 1,
              jsonTorah: prefaceJsonNums[pi],
              texts: pParas.map(p => extractTeachingText(p))
            });
          }
        }
      }
    }
  }

  // Merge continuations
  for (const t of allTorahs) {
    if (typeof t.torahNum === 'number') {
      const key = `${t.part}-${t.torahNum}`;
      if (continuations[key]) {
        t.items = [...(t.items || []), ...continuations[key]];
        delete continuations[key];
      }
    }
  }

  console.log(`Parsed ${allTorahs.length} torahs`);

  // Apply to JSON files
  let updated = 0, segUpdated = 0;

  for (const torah of allTorahs) {
    // Handle preface
    if (typeof torah.torahNum === 'string' && torah.torahNum.startsWith('preface-')) {
      const jp = path.join(targetBase, `part-${torah.part}`, `torah-${torah.jsonTorah}.json`);
      if (!fs.existsSync(jp)) continue;
      const json = JSON.parse(fs.readFileSync(jp, 'utf8'));
      let upd = 0;
      for (let si = 0; si < json.segments.length && si < torah.texts.length; si++) {
        json.segments[si].en = torah.texts[si];
        upd++;
      }
      if (upd > 0) { json.hasEnglish = true; fs.writeFileSync(jp, JSON.stringify(json, null, 2), 'utf8'); updated++; segUpdated += upd; }
      continue;
    }

    let jsonTorahNum = torah.part === 1 ? torah.torahNum + 3 : torah.torahNum;
    const jp = path.join(targetBase, `part-${torah.part}`, `torah-${jsonTorahNum}.json`);
    if (!fs.existsSync(jp)) continue;

    const json = JSON.parse(fs.readFileSync(jp, 'utf8'));

    // Build combined teaching texts
    const teachingTexts = [];
    for (const item of torah.items) {
      if (item.type === 'teaching') teachingTexts.push(item.text);
      else if (item.type === 'bracket' && teachingTexts.length > 0) teachingTexts[teachingTexts.length - 1] += '\n\n' + item.text;
      else if (item.type === 'single-para') {
        if (teachingTexts.length > 0) teachingTexts[teachingTexts.length - 1] += '\n\n' + item.text;
        else teachingTexts.push(item.text);
      }
    }

    if (teachingTexts.length === 0) continue;

    // Clear existing English first, then re-apply
    for (const seg of json.segments) { seg.en = ''; }

    const firstSegHe = json.segments[0].he || '';
    const isTitle = /^[\u05D0-\u05EA]/.test(firstSegHe) && firstSegHe.length < 100;
    let segStart = isTitle ? 1 : 0;

    if (json.segments.length === 1) {
      json.segments[0].en = teachingTexts.join('\n\n');
      segUpdated++;
    } else {
      for (let ti = 0; ti < teachingTexts.length; ti++) {
        const si = segStart + ti;
        if (si >= json.segments.length) {
          json.segments[json.segments.length - 1].en += '\n\n' + teachingTexts[ti];
        } else {
          json.segments[si].en = teachingTexts[ti];
        }
        segUpdated++;
      }
    }

    json.hasEnglish = true;
    fs.writeFileSync(jp, JSON.stringify(json, null, 2), 'utf8');
    updated++;
  }

  // Update index hasEnglish flags
  for (const partNum of [1, 2]) {
    const indexPath = path.join(targetBase, `part-${partNum}`, 'index.json');
    if (!fs.existsSync(indexPath)) continue;
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const entry of index.torahs) {
      const tp = path.join(targetBase, `part-${partNum}`, `torah-${entry.number}.json`);
      if (fs.existsSync(tp)) {
        const d = JSON.parse(fs.readFileSync(tp, 'utf8'));
        entry.hasEnglish = d.segments.some(s => s.en && s.en.trim());
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  // Count after
  let afterEn = 0;
  totalSegs = 0;
  for (const partNum of [1, 2]) {
    const pd = path.join(targetBase, `part-${partNum}`);
    if (!fs.existsSync(pd)) continue;
    const files = fs.readdirSync(pd).filter(f => f.startsWith('torah-'));
    for (const f of files) {
      const d = JSON.parse(fs.readFileSync(path.join(pd, f), 'utf8'));
      for (const s of d.segments) { totalSegs++; if (s.en && s.en.trim()) afterEn++; }
    }
  }

  console.log(`Kitzur: Updated ${updated} torahs, ${segUpdated} segments`);
  console.log(`Final: ${afterEn}/${totalSegs} (${Math.round(afterEn/totalSegs*100)}%)`);
}

// ═══════════════════════════════════════════════════════════════
// TASK 4: Updated Otzar volume Mem
// ═══════════════════════════════════════════════════════════════
function importOtzar() {
  console.log('\n' + '='.repeat(60));
  console.log('TASK 4: Update Otzar HaYirah (volume Mem)');
  console.log('='.repeat(60));

  const sourceDir = path.join(TEMP, 'Oatzer volume Mem');
  const readerDir = path.join(READER, 'otzar-hayirah', 'part-1');

  // Also include previous volumes
  const allDirs = [
    'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 1',
    'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 2',
    'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 4',
    sourceDir,
  ];

  function extractParasFromHtml(htmlContent) {
    const paras = [];

    // Method 1: <div class="entry"> with entry-num
    const entryParts = htmlContent.split(/<div class="entry">/);
    if (entryParts.length > 1) {
      for (let i = 1; i < entryParts.length; i++) {
        let content = entryParts[i];
        const endIdx = content.indexOf('</div>');
        if (endIdx >= 0) content = content.substring(0, endIdx);
        // Remove entry-num and source spans
        content = content.replace(/<span class="entry-num">[\s\S]*?<\/span>/g, '');
        content = content.replace(/<span class="source">[\s\S]*?<\/span>/g, '');
        const text = stripHtml(content);
        if (text.length > 20) paras.push(text);
      }
      if (paras.length > 0) return paras;
    }

    // Method 2: <div class="para"> with <span class="para-text">
    const paraParts = htmlContent.split(/<div class="para">/);
    if (paraParts.length > 1) {
      for (let i = 1; i < paraParts.length; i++) {
        const block = paraParts[i];
        const endIdx = block.indexOf('</div>');
        if (endIdx < 0) continue;
        let content = block.substring(0, endIdx);
        content = content.replace(/<span class="source-ref">[\s\S]*?<\/span>/g, '');
        content = content.replace(/<span class="para-num">[\s\S]*?<\/span>/g, '');
        const text = stripHtml(content);
        if (text.length > 20) paras.push(text);
      }
      if (paras.length > 0) return paras;
    }

    // Method 3: <div class="section">
    const sectionParts = htmlContent.split(/<div class="section">/);
    if (sectionParts.length > 1) {
      for (let i = 1; i < sectionParts.length; i++) {
        let content = sectionParts[i].split('</div>')[0] || '';
        content = content.replace(/<span class="section-number">[\s\S]*?<\/span>/g, '');
        content = content.replace(/<span class="section-source">[\s\S]*?<\/span>/g, '');
        const text = stripHtml(content);
        if (text.length > 20) paras.push(text);
      }
      if (paras.length > 0) return paras;
    }

    // Method 4: fallback <p> tags
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let m;
    while ((m = pRegex.exec(htmlContent)) !== null) {
      const text = stripHtml(m[1]);
      if (text.length > 30 && !text.startsWith('\u2190') && !text.startsWith('\u2192')) paras.push(text);
    }
    return paras;
  }

  // Collect all English paragraphs
  const allEnglish = [];
  for (const dir of allDirs) {
    if (!fs.existsSync(dir)) { console.log(`SKIP: ${dir}`); continue; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
    console.log(`${path.basename(dir)}: ${files.length} HTML files`);
    for (const f of files) {
      const html = fs.readFileSync(path.join(dir, f), 'utf8');
      allEnglish.push(...extractParasFromHtml(html));
    }
  }
  console.log(`Total English paragraphs: ${allEnglish.length}`);

  // Load reader files
  const readerFiles = fs.readdirSync(readerDir)
    .filter(f => f.startsWith('torah-') && f.endsWith('.json'))
    .sort((a, b) => parseInt(a.match(/(\d+)/)[1]) - parseInt(b.match(/(\d+)/)[1]));

  let totalSegs = 0, alreadyHasEn = 0;
  for (const rf of readerFiles) {
    const data = JSON.parse(fs.readFileSync(path.join(readerDir, rf), 'utf8'));
    for (const s of data.segments) { totalSegs++; if (s.en && s.en.trim()) alreadyHasEn++; }
  }
  console.log(`Before: ${alreadyHasEn}/${totalSegs} (${Math.round(alreadyHasEn/totalSegs*100)}%)`);

  // Build norm map and do sequential assignment
  const enNormMap = {};
  for (let i = 0; i < allEnglish.length; i++) {
    const norm = normalize(allEnglish[i]);
    if (norm.length > 20 && !enNormMap[norm]) enNormMap[norm] = i;
  }

  let lastSyncedEnIdx = 0, matched = 0;
  const modifiedFiles = new Set();

  for (const rf of readerFiles) {
    const filePath = path.join(readerDir, rf);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fileChanged = false;

    let syncIdx = -1;
    for (const seg of data.segments) {
      if (seg.en && seg.en.trim()) {
        const norm = normalize(seg.en);
        if (norm.length > 20 && enNormMap[norm] !== undefined) { syncIdx = enNormMap[norm]; break; }
      }
    }
    if (syncIdx >= 0) {
      const firstEnSegIdx = data.segments.findIndex(s => s.en && s.en.trim());
      lastSyncedEnIdx = Math.max(0, syncIdx - firstEnSegIdx);
    }

    let localEnIdx = lastSyncedEnIdx;
    for (const seg of data.segments) {
      if (seg.en && seg.en.trim()) { localEnIdx++; continue; }
      if (localEnIdx < allEnglish.length) { seg.en = allEnglish[localEnIdx]; matched++; fileChanged = true; localEnIdx++; }
    }
    lastSyncedEnIdx = localEnIdx;

    if (fileChanged) { data.hasEnglish = true; fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8'); modifiedFiles.add(rf); }
  }

  console.log(`Matched: ${matched} new segments across ${modifiedFiles.size} files`);
  console.log(`Final: ${alreadyHasEn + matched}/${totalSegs} (${Math.round((alreadyHasEn + matched)/totalSegs*100)}%)`);
}

// ═══════════════════════════════════════════════════════════════
// TASK 5: Updated Parparos LaChochma
// ═══════════════════════════════════════════════════════════════
function importParparos() {
  console.log('\n' + '='.repeat(60));
  console.log('TASK 5: Update Parparos LeChochma English');
  console.log('='.repeat(60));

  const sourceDir = path.join(TEMP, 'Parparaos LaChuchmuh');
  const readerDir = path.join(READER, 'parparos-lechochma');

  // Also include previous finished dir
  const allDirs = [
    'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Parparaos LaChuchmuh',
    sourceDir,
  ];

  // Extract all English paragraphs from HTML files
  const allEnglish = [];
  for (const dir of allDirs) {
    if (!fs.existsSync(dir)) { console.log(`SKIP: ${dir}`); continue; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html')).sort();
    console.log(`${path.basename(dir)}: ${files.length} HTML files`);
    for (const f of files) {
      const html = fs.readFileSync(path.join(dir, f), 'utf8');
      const regex = /<(?:p|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/g;
      let m;
      while ((m = regex.exec(html)) !== null) {
        let content = m[1];
        content = content.replace(/<span class="src">[\s\S]*?<\/span>/g, '');
        const text = stripHtml(content);
        if (text.length > 30 && !text.startsWith('\u2190') && !text.startsWith('\u2192') && !text.startsWith('Back')) {
          allEnglish.push(text);
        }
      }
    }
  }

  // Deduplicate: if both dirs have same content, skip duplicates
  // Simple approach: just use temp dir files if they're a superset
  // Actually, we should use temp dir to replace since it's the latest
  const tempEnglish = [];
  const tempFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.html')).sort();
  for (const f of tempFiles) {
    const html = fs.readFileSync(path.join(sourceDir, f), 'utf8');
    const regex = /<(?:p|h[1-6])[^>]*>([\s\S]*?)<\/(?:p|h[1-6])>/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
      let content = m[1];
      content = content.replace(/<span class="src">[\s\S]*?<\/span>/g, '');
      const text = stripHtml(content);
      if (text.length > 30 && !text.startsWith('\u2190') && !text.startsWith('\u2192') && !text.startsWith('Back')) {
        tempEnglish.push(text);
      }
    }
  }
  console.log(`Total English paragraphs (temp): ${tempEnglish.length}`);
  console.log(`Total English paragraphs (all): ${allEnglish.length}`);

  // Use allEnglish (which includes both old and new)
  // Load reader files
  function findJsonFiles(dir) {
    let results = [];
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) results = results.concat(findJsonFiles(full));
      else if (item.endsWith('.json') && item !== 'index.json') results.push(full);
    }
    return results.sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/g).pop());
      const nb = parseInt(b.match(/(\d+)/g).pop());
      return na - nb;
    });
  }

  const readerFiles = findJsonFiles(readerDir);
  console.log(`Reader files: ${readerFiles.length}`);

  let totalSegs = 0, beforeEn = 0;
  for (const rf of readerFiles) {
    const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
    for (const seg of data.segments) { totalSegs++; if (seg.en && seg.en.trim()) beforeEn++; }
  }
  console.log(`Before: ${beforeEn}/${totalSegs} (${Math.round(beforeEn/totalSegs*100)}%)`);

  // Build norm map and sequential assign
  const enNormMap = {};
  for (let i = 0; i < allEnglish.length; i++) {
    const norm = normalize(allEnglish[i]);
    if (norm.length > 20 && !enNormMap[norm]) enNormMap[norm] = i;
  }

  let lastSyncedEnIdx = 0, matched = 0, modifiedFiles = 0;

  for (const rf of readerFiles) {
    const data = JSON.parse(fs.readFileSync(rf, 'utf8'));
    let fileChanged = false;

    let syncIdx = -1;
    for (const seg of data.segments) {
      if (seg.en && seg.en.trim()) {
        const norm = normalize(seg.en);
        if (norm.length > 20 && enNormMap[norm] !== undefined) { syncIdx = enNormMap[norm]; break; }
      }
    }
    if (syncIdx >= 0) {
      const firstEnSegIdx = data.segments.findIndex(s => s.en && s.en.trim());
      lastSyncedEnIdx = Math.max(0, syncIdx - firstEnSegIdx);
    }

    let localEnIdx = lastSyncedEnIdx;
    for (const seg of data.segments) {
      if (seg.en && seg.en.trim()) { localEnIdx++; continue; }
      if (localEnIdx < allEnglish.length) { seg.en = allEnglish[localEnIdx]; matched++; fileChanged = true; localEnIdx++; }
    }
    lastSyncedEnIdx = localEnIdx;

    if (fileChanged) { data.hasEnglish = true; fs.writeFileSync(rf, JSON.stringify(data, null, 2), 'utf8'); modifiedFiles++; }
  }

  // Update index
  const indexPath = path.join(readerDir, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (index.torahs) {
      for (const entry of index.torahs) {
        const tp = path.join(readerDir, `section-${entry.number}.json`);
        if (fs.existsSync(tp)) {
          const d = JSON.parse(fs.readFileSync(tp, 'utf8'));
          entry.hasEnglish = d.segments.some(s => s.en && s.en.trim());
        }
      }
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    }
  }

  console.log(`Matched: ${matched} new segments across ${modifiedFiles} files`);
  console.log(`Final: ${beforeEn + matched}/${totalSegs} (${Math.round((beforeEn + matched)/totalSegs*100)}%)`);
}

// ═══════════════════════════════════════════════════════════════
// Update catalog.json for new book
// ═══════════════════════════════════════════════════════════════
function updateCatalog(sichosInfo) {
  console.log('\n--- Updating catalog.json ---');
  const catalogPath = path.join(READER, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  // Check if already exists
  if (catalog.books.some(b => b.id === 'sichos-chayay-saba')) {
    console.log('sichos-chayay-saba already in catalog');
    return;
  }

  catalog.books.push({
    id: 'sichos-chayay-saba',
    title: 'Sichos Metoch Chayay HaSaba',
    hebrewTitle: '\u05E9\u05D9\u05D7\u05D5\u05EA \u05DE\u05EA\u05D5\u05DA \u05D7\u05D9\u05D9 \u05D4\u05E1\u05D1\u05D0',
    author: 'Saba Yisroel (Rabbi Yisroel Dov Odesser)',
    hebrewAuthor: '\u05D4\u05E1\u05D1\u05D0 \u05D9\u05E9\u05E8\u05D0\u05DC \u05D3\u05D1-\u05D1\u05E8 \u05D0\u05D5\u05D3\u05E1\u05E8',
    parts: [{
      part: 1,
      title: 'Conversations',
      hebrewTitle: '\u05E9\u05D9\u05D7\u05D5\u05EA',
      totalTorahs: sichosInfo.sections,
      indexUrl: '/reader/sichos-chayay-saba/index.json'
    }]
  });

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log('Added sichos-chayay-saba to catalog');
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log('Master Import Script - Temp Folder Items');
  console.log(new Date().toISOString());

  // Task 1
  const sichosInfo = importSichos();

  // Task 2
  await importLikutayEitzos();

  // Task 3
  importKitzur();

  // Task 4
  importOtzar();

  // Task 5
  importParparos();

  // Update catalog
  updateCatalog(sichosInfo);

  console.log('\n' + '='.repeat(60));
  console.log('ALL TASKS COMPLETE');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
