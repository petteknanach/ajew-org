/**
 * Parse ALL remaining Breslov books for the ajew.org reader.
 * This is the expanded version that covers every text in HebrewBreslovBooks.
 *
 * Books parsed here (batch 2):
 * - Kitzur Likutay Moharan (shortened LM)
 * - Likutay Tefilos (prayers)
 * - Likutay Eitzos (advice by topic)
 * - Alim LiTrufa (Rabbi Nosson's letters)
 * - Yemei Moharnat (Days of Rabbi Nosson)
 * - Shemos HaTzadikim (Names of the Righteous)
 * - Yemei HaTlaos (Days of Suffering)
 * - Hashtatfchus HaNefesh (Outpouring of the Soul) - R' Alter Tepliker
 * - Meshivas Nefesh (Restoring the Soul) - R' Alter Tepliker
 * - Parparos LeChochma (Gems of Wisdom) - Tcheryn
 * - Rimzei HaMaasiyos (Hints on the Stories) - Tcheryn
 * - Zimras HaAretz - Tcheryn
 * - Yikra DShabbata - Tcheryn
 * - Yereach HaEisanim - Tcheryn
 * - Nachas HaShulchan - Tcheryn
 * - Likutay Eitzos Mahaduras Basra (Otzar HaYirah) - Tcheryn
 * - Biur HaLikutim - R' Avraham
 * - Chochma UTvuna - R' Avraham
 * - Kokhvei Or - R' Avraham
 * - Siach Sarfei Kodesh (6 volumes) - Levi Yitzchak Bender
 * - Students & misc books (Eitzos Yesharos, Sichas HaNefesh, etc)
 * - English Sipurey Maasiyos
 * - Stories collections
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks';
const OUTPUT_BASE = path.join(ROOT, 'public/reader');

// ── Utility functions (same as parse-new-books.cjs) ──────────

function readWin1255(filePath) {
  const raw = fs.readFileSync(filePath);
  return iconv.decode(raw, 'win1255').replace(/^\uFEFF/, '');
}

function stripMarkup(text) {
  text = text.replace(/^&HiddenFromIndex=[^\n]*/m, '');
  text = text.replace(/\{\{\{\{/g, '').replace(/\}\}\}\}/g, '');
  text = text.replace(/\(\(\(/g, '').replace(/\)\)\)/g, '');
  text = text.replace(/\(\(/g, '(').replace(/\)\)/g, ')');
  text = text.replace(/\{([^}]*)\}/g, '($1)');
  text = text.replace(/\[\[\[/g, '').replace(/\]\]\]/g, '');
  text = text.replace(/\[\[/g, '').replace(/\]\]/g, '');
  text = text.replace(/<big>/gi, '').replace(/<\/big>/gi, '');
  text = text.replace(/<small>/gi, '').replace(/<\/small>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<hr\s*\/?>/gi, '\n');
  text = text.replace(/<b[^>]*>/gi, '').replace(/<\/b>/gi, '');
  text = text.replace(/<span[^>]*>/gi, '').replace(/<\/span>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/_nbsp_/g, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function splitByAtMarkers(text) {
  text = text.replace(/^&HiddenFromIndex=[^\n]*\n?/m, '');
  text = text.replace(/^\$[^\n]*\n?/gm, '');

  const parts = text.split(/^@\s*/m);
  const sections = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const lines = trimmed.split(/\r?\n/);
    const title = lines[0].trim();
    if (!title) continue;
    if (title.startsWith('&') || title.startsWith('#')) continue;
    if (/^\*+$/.test(title)) continue;

    const content = lines.slice(1).join('\n').trim();
    if (!content) continue;

    sections.push({ title, content });
  }
  return sections;
}

function splitByTildeMarkers(text) {
  text = text.replace(/^&HiddenFromIndex=[^\n]*\n?/m, '');
  text = text.replace(/^\$[^\n]*\n?/gm, '');

  const parts = text.split(/^~\s*/m);
  const sections = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const lines = trimmed.split(/\r?\n/);
    const firstLine = lines[0].trim();
    if (!firstLine) continue;
    if (firstLine.startsWith('&') || /^\*+$/.test(firstLine)) continue;

    sections.push({ title: firstLine, content: trimmed });
  }
  return sections;
}

function splitIntoParagraphs(content) {
  let paras = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
  if (paras.length < 5 && paras.some(p => p.length > 1000)) {
    paras = content.split(/\n/).map(p => p.trim()).filter(p => p.length > 0);
  }
  const expanded = [];
  for (const p of paras) {
    if (p.includes('~')) {
      const subParts = p.split(/^~\s*/m).map(s => s.trim()).filter(s => s.length > 0);
      expanded.push(...subParts);
    } else {
      expanded.push(p);
    }
  }
  return expanded.filter(p => p.length > 2);
}

function buildNavigation(prefix, partNum, seqNum, total, urlBase) {
  return {
    prev: seqNum > 1 ? `${prefix}-${partNum}-${seqNum - 1}` : null,
    next: seqNum < total ? `${prefix}-${partNum}-${seqNum + 1}` : null,
    prevUrl: seqNum > 1 ? `${urlBase}/${partNum}/${seqNum - 1}` : null,
    nextUrl: seqNum < total ? `${urlBase}/${partNum}/${seqNum + 1}` : null
  };
}

function writeBookJSON(outputDir, sections, config) {
  fs.mkdirSync(outputDir, { recursive: true });
  const catalog = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const seqNum = i + 1;
    const paragraphs = splitIntoParagraphs(stripMarkup(sec.content));
    if (paragraphs.length === 0) continue;

    const segments = paragraphs.map((p, idx) => ({
      index: idx + 1, he: p, en: ''
    }));

    const readerData = {
      id: `${config.prefix}-${seqNum}`,
      book: config.id,
      part: config.partNum || 1,
      torah: seqNum,
      displayNumber: seqNum,
      title: sec.title,
      hebrewTitle: sec.title,
      keyVerse: '', keyVerseTranslation: '', keyVerseRef: '',
      themes: [], keywords: [], simanim: [],
      segments,
      totalParagraphs: segments.length,
      hasEnglish: false,
      navigation: buildNavigation(config.prefix, config.partNum || 1, seqNum, sections.length, config.urlBase)
    };

    const fileName = `${config.filePrefix}-${seqNum}.json`;
    fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(readerData, null, 2), 'utf8');

    catalog.push({
      number: seqNum, displayNumber: seqNum,
      title: sec.title, hebrewTitle: sec.title,
      themes: [], paragraphs: segments.length,
      hasEnglish: false,
      url: `${config.urlBase}/${config.partNum || 1}/${seqNum}`
    });
  }
  return catalog;
}

function writeIndex(outputDir, catalog, config) {
  const indexData = {
    book: config.id, part: config.partNum || 1,
    title: config.title, hebrewTitle: config.hebrewTitle,
    author: config.author, hebrewAuthor: config.hebrewAuthor,
    totalTorahs: catalog.length, torahs: catalog
  };
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');
}

// Helper to find file by partial name
function findFile(dir, partial) {
  const files = fs.readdirSync(dir);
  return files.find(f => f.includes(partial));
}

// ── Parse a standard @ book ─────────────────────────────────

function parseStandardBook(inputFile, config) {
  const text = readWin1255(inputFile);
  const sections = splitByAtMarkers(text);
  // Filter out sections without Hebrew
  const filtered = sections.filter(s => /[\u0590-\u05FF]/.test(s.title));
  console.log(`  ${config.title}: ${filtered.length} sections`);

  const outputDir = path.join(OUTPUT_BASE, config.id);
  if (config.partNum && config.partNum > 1) {
    const partDir = path.join(outputDir, `part-${config.partNum}`);
    const catalog = writeBookJSON(partDir, filtered, config);
    writeIndex(partDir, catalog, config);
    return catalog;
  } else {
    const catalog = writeBookJSON(outputDir, filtered, config);
    writeIndex(outputDir, catalog, config);
    return catalog;
  }
}

// ── Parse books with ~ tilde structure (inside @ sections) ──

function parseTildeInAtBook(inputFile, config) {
  const text = readWin1255(inputFile);
  // First split by @ to get major sections, then each section has ~ subsections
  const atSections = splitByAtMarkers(text).filter(s => /[\u0590-\u05FF]/.test(s.title));

  // For books like Likutay Eitzos where @ = topic and ~ = entries within topic
  // We treat each @ section as a separate reader page
  console.log(`  ${config.title}: ${atSections.length} sections`);

  const outputDir = path.join(OUTPUT_BASE, config.id);
  const catalog = writeBookJSON(outputDir, atSections, config);
  writeIndex(outputDir, catalog, config);
  return catalog;
}

// ── Parse multi-part books (like Kitzur LM, Likutay Tefilos) ──

function parseMultiPartByAt(inputFile, config, partMarkers) {
  const text = readWin1255(inputFile);
  const cleanText = text.replace(/^&HiddenFromIndex=[^\n]*\n?/m, '').replace(/^\$[^\n]*\n?/gm, '');

  // Split by @ markers first
  const allSections = splitByAtMarkers(text).filter(s => /[\u0590-\u05FF]/.test(s.title));

  // Find part boundaries
  const parts = [];
  let currentPart = { sections: [], name: 'Part 1' };

  for (const sec of allSections) {
    const isPartMarker = partMarkers.some(m => sec.title.includes(m));
    if (isPartMarker && currentPart.sections.length > 0) {
      parts.push(currentPart);
      currentPart = { sections: [], name: sec.title };
    }
    currentPart.sections.push(sec);
  }
  if (currentPart.sections.length > 0) parts.push(currentPart);

  // If only one part, just use tilde splitting within the whole text
  if (parts.length <= 1) {
    // Fall back to ~ splitting for the whole text
    const tildes = splitByTildeMarkers(cleanText).filter(s => /[\u0590-\u05FF]/.test(s.title));
    if (tildes.length > allSections.length) {
      console.log(`  ${config.title}: ${tildes.length} entries (tilde-split)`);
      const outputDir = path.join(OUTPUT_BASE, config.id);
      const catalog = writeBookJSON(outputDir, tildes, config);
      writeIndex(outputDir, catalog, config);
      return [{ catalog }];
    }
  }

  const results = [];
  const outputDir = path.join(OUTPUT_BASE, config.id);
  fs.mkdirSync(outputDir, { recursive: true });

  for (let p = 0; p < parts.length; p++) {
    const partNum = p + 1;
    const partConfig = { ...config, partNum, prefix: `${config.prefix}-${partNum}` };
    const partDir = path.join(outputDir, `part-${partNum}`);
    const catalog = writeBookJSON(partDir, parts[p].sections, partConfig);
    writeIndex(partDir, catalog, partConfig);
    results.push({ partNum, name: parts[p].name, catalog });
    console.log(`  ${config.title} Part ${partNum} (${parts[p].name}): ${catalog.length} entries`);
  }

  return results;
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log('Parsing ALL remaining Breslov books...\n');

  const f1dir = BOOKS_DIR + '/1_ספרי רבי נחמן';
  const f2dir = BOOKS_DIR + '/2_ספרי רבי נתן';
  const allNewBooks = [];

  // ═══════════════════════════════════════════════
  // FOLDER 1: Rabbi Nachman
  // ═══════════════════════════════════════════════

  // Kitzur Likutay Moharan - uses ~ markers for entries, @ for part boundaries
  console.log('=== Kitzur Likutay Moharan ===');
  const kitzurFile = f1dir + '/' + findFile(f1dir, 'קיצור');
  const kitzurText = readWin1255(kitzurFile);
  const kitzurClean = kitzurText.replace(/^&HiddenFromIndex=[^\n]*\n?/m, '').replace(/^\$[^\n]*\n?/gm, '');

  // Split by @ to get Part 1 and Part 2
  const kitzurAtSections = splitByAtMarkers(kitzurText).filter(s => /[\u0590-\u05FF]/.test(s.title));
  // Part 1 and Part 2 are the @ sections; within them, ~ marks individual torahs
  const kitzurParts = [];
  for (const sec of kitzurAtSections) {
    const tildes = sec.content.split(/^~\s*/m).map(s => s.trim()).filter(s => s.length > 10);
    kitzurParts.push({ name: sec.title, entries: tildes });
  }

  const kitzurOutputDir = path.join(OUTPUT_BASE, 'kitzur-likutay-moharan');
  fs.mkdirSync(kitzurOutputDir, { recursive: true });
  const kitzurCatalogs = [];

  for (let p = 0; p < kitzurParts.length; p++) {
    const partNum = p + 1;
    const partDir = path.join(kitzurOutputDir, `part-${partNum}`);
    fs.mkdirSync(partDir, { recursive: true });

    const sections = kitzurParts[p].entries.map((entry, i) => {
      const lines = entry.split(/\r?\n/);
      return { title: lines[0].trim().substring(0, 80) || `Torah ${i + 1}`, content: entry };
    });

    const config = {
      id: 'kitzur-likutay-moharan', prefix: `klm-${partNum}`, filePrefix: 'torah',
      title: `Kitzur Likutay Moharan - Part ${partNum}`,
      hebrewTitle: `קיצור ליקוטי מוהר"ן - חלק ${partNum === 1 ? 'א' : 'ב'}`,
      author: 'Rabbi Nachman of Breslov', hebrewAuthor: 'רבי נחמן מברסלב',
      urlBase: '/reader/kitzur-likutay-moharan', partNum
    };

    const catalog = writeBookJSON(partDir, sections, config);
    writeIndex(partDir, catalog, config);
    kitzurCatalogs.push({ partNum, catalog, name: kitzurParts[p].name });
    console.log(`  Part ${partNum}: ${catalog.length} torahs`);
  }

  allNewBooks.push({
    id: 'kitzur-likutay-moharan', title: 'Kitzur Likutay Moharan',
    hebrewTitle: 'קיצור ליקוטי מוהר"ן',
    author: 'Rabbi Nachman of Breslov', hebrewAuthor: 'רבי נחמן מברסלב',
    parts: kitzurCatalogs.map(k => ({
      part: k.partNum, title: k.name, hebrewTitle: k.name,
      totalTorahs: k.catalog.length,
      indexUrl: `/reader/kitzur-likutay-moharan/part-${k.partNum}/index.json`
    }))
  });

  // ═══════════════════════════════════════════════
  // FOLDER 2: Rabbi Nosson
  // ═══════════════════════════════════════════════

  // Likutay Tefilos - @ for parts, ~ for individual prayers
  console.log('\n=== Likutay Tefilos ===');
  const ltFile = f2dir + '/' + findFile(f2dir, 'תפילות');
  const ltText = readWin1255(ltFile);
  const ltAtSections = splitByAtMarkers(ltText).filter(s => /[\u0590-\u05FF]/.test(s.title));
  const ltOutputDir = path.join(OUTPUT_BASE, 'likutay-tefilos');
  fs.mkdirSync(ltOutputDir, { recursive: true });
  const ltCatalogs = [];

  for (let p = 0; p < ltAtSections.length; p++) {
    const partNum = p + 1;
    const sec = ltAtSections[p];
    // Split by ~ for individual prayers
    const tildes = sec.content.split(/^~\s*/m).map(s => s.trim()).filter(s => s.length > 10);
    const sections = tildes.map((entry, i) => {
      const lines = entry.split(/\r?\n/);
      return { title: lines[0].trim().substring(0, 100) || `Prayer ${i + 1}`, content: entry };
    });

    const partDir = path.join(ltOutputDir, `part-${partNum}`);
    const config = {
      id: 'likutay-tefilos', prefix: `lt-${partNum}`, filePrefix: 'prayer',
      title: `Likutay Tefilos - ${sec.title}`,
      hebrewTitle: `ליקוטי תפילות - ${sec.title}`,
      author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
      urlBase: '/reader/likutay-tefilos', partNum
    };

    const catalog = writeBookJSON(partDir, sections, config);
    writeIndex(partDir, catalog, config);
    ltCatalogs.push({ partNum, catalog, name: sec.title });
    console.log(`  Part ${partNum} (${sec.title}): ${catalog.length} prayers`);
  }

  allNewBooks.push({
    id: 'likutay-tefilos', title: 'Likutay Tefilos',
    hebrewTitle: 'ליקוטי תפילות',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    parts: ltCatalogs.map(k => ({
      part: k.partNum, title: k.name, hebrewTitle: k.name,
      totalTorahs: k.catalog.length,
      indexUrl: `/reader/likutay-tefilos/part-${k.partNum}/index.json`
    }))
  });

  // Likutay Eitzos - @ for topics with ~ entries within
  console.log('\n=== Likutay Eitzos ===');
  const leFile = f2dir + '/' + findFile(f2dir, 'עצות');
  const leCatalog = parseTildeInAtBook(leFile, {
    id: 'likutay-eitzos', prefix: 'le', filePrefix: 'topic',
    title: 'Likutay Eitzos', hebrewTitle: 'ליקוטי עצות',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    urlBase: '/reader/likutay-eitzos', partNum: 1
  });
  allNewBooks.push({
    id: 'likutay-eitzos', title: 'Likutay Eitzos',
    hebrewTitle: 'ליקוטי עצות',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    parts: [{ part: 1, title: 'Topics A-Z', hebrewTitle: 'ערכים א-ת',
      totalTorahs: leCatalog.length, indexUrl: '/reader/likutay-eitzos/index.json' }]
  });

  // Alim LiTrufa - @ for major sections, ~ for individual letters
  console.log('\n=== Alim LiTrufa ===');
  const alFile = f2dir + '/' + findFile(f2dir, 'עלים');
  const alText = readWin1255(alFile);
  const alAtSections = splitByAtMarkers(alText).filter(s => /[\u0590-\u05FF]/.test(s.title));
  const alOutputDir = path.join(OUTPUT_BASE, 'alim-litrufa');
  fs.mkdirSync(alOutputDir, { recursive: true });
  const alCatalogs = [];

  for (let p = 0; p < alAtSections.length; p++) {
    const partNum = p + 1;
    const sec = alAtSections[p];
    const tildes = sec.content.split(/^~\s*/m).map(s => s.trim()).filter(s => s.length > 10);
    const sections = tildes.map((entry, i) => {
      const lines = entry.split(/\r?\n/);
      return { title: lines[0].trim().substring(0, 100) || `Letter ${i + 1}`, content: entry };
    });

    const partDir = path.join(alOutputDir, `part-${partNum}`);
    const config = {
      id: 'alim-litrufa', prefix: `al-${partNum}`, filePrefix: 'letter',
      title: `Alim LiTrufa - ${sec.title}`,
      hebrewTitle: `עלים לתרופה - ${sec.title}`,
      author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
      urlBase: '/reader/alim-litrufa', partNum
    };
    const catalog = writeBookJSON(partDir, sections, config);
    writeIndex(partDir, catalog, config);
    alCatalogs.push({ partNum, catalog, name: sec.title });
    console.log(`  Part ${partNum} (${sec.title}): ${catalog.length} letters`);
  }

  allNewBooks.push({
    id: 'alim-litrufa', title: 'Alim LiTrufa',
    hebrewTitle: 'עלים לתרופה',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    parts: alCatalogs.map(k => ({
      part: k.partNum, title: k.name, hebrewTitle: k.name,
      totalTorahs: k.catalog.length,
      indexUrl: `/reader/alim-litrufa/part-${k.partNum}/index.json`
    }))
  });

  // Yemei Moharnat
  console.log('\n=== Yemei Moharnat ===');
  const ymFile = f2dir + '/' + findFile(f2dir, 'ימי מוהרנ');
  const ymCatalog = parseStandardBook(ymFile, {
    id: 'yemei-moharnat', prefix: 'ym', filePrefix: 'section',
    title: 'Yemei Moharnat', hebrewTitle: 'ימי מוהרנ"ת',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    urlBase: '/reader/yemei-moharnat', partNum: 1
  });
  allNewBooks.push({
    id: 'yemei-moharnat', title: 'Yemei Moharnat',
    hebrewTitle: 'ימי מוהרנ"ת',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    parts: [{ part: 1, title: 'Days of Rabbi Nosson', hebrewTitle: 'ימי מוהרנ"ת',
      totalTorahs: ymCatalog.length, indexUrl: '/reader/yemei-moharnat/index.json' }]
  });

  // Shemos HaTzadikim
  console.log('\n=== Shemos HaTzadikim ===');
  const stFile = f2dir + '/' + findFile(f2dir, 'שמות');
  const stCatalog = parseStandardBook(stFile, {
    id: 'shemos-hatzadikim', prefix: 'stz', filePrefix: 'section',
    title: 'Shemos HaTzadikim', hebrewTitle: 'שמות הצדיקים',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    urlBase: '/reader/shemos-hatzadikim', partNum: 1
  });
  allNewBooks.push({
    id: 'shemos-hatzadikim', title: 'Shemos HaTzadikim',
    hebrewTitle: 'שמות הצדיקים',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    parts: [{ part: 1, title: 'Names of the Righteous', hebrewTitle: 'שמות הצדיקים',
      totalTorahs: stCatalog.length, indexUrl: '/reader/shemos-hatzadikim/index.json' }]
  });

  // Yemei HaTlaos
  console.log('\n=== Yemei HaTlaos ===');
  const ytFile = f2dir + '/' + findFile(f2dir, 'התלאות');
  const ytCatalog = parseStandardBook(ytFile, {
    id: 'yemei-hatlaos', prefix: 'yt', filePrefix: 'section',
    title: 'Yemei HaTlaos', hebrewTitle: 'ימי התלאות',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    urlBase: '/reader/yemei-hatlaos', partNum: 1
  });
  allNewBooks.push({
    id: 'yemei-hatlaos', title: 'Yemei HaTlaos',
    hebrewTitle: 'ימי התלאות',
    author: 'Rabbi Nosson of Breslov', hebrewAuthor: 'רבי נתן מברסלב',
    parts: [{ part: 1, title: 'Days of Suffering', hebrewTitle: 'ימי התלאות',
      totalTorahs: ytCatalog.length, indexUrl: '/reader/yemei-hatlaos/index.json' }]
  });

  // ═══════════════════════════════════════════════
  // R' ALTER TEPLIKER
  // ═══════════════════════════════════════════════
  const alterDir = BOOKS_DIR + '/4_ספרי רבי אלתר טפליקער';

  console.log('\n=== Hashtatfchus HaNefesh ===');
  const hhCatalog = parseStandardBook(alterDir + '/השתפכות הנפש.txt', {
    id: 'hashtatfchus-hanefesh', prefix: 'hh', filePrefix: 'section',
    title: 'Hashtatfchus HaNefesh', hebrewTitle: 'השתפכות הנפש',
    author: "Rabbi Alter of Teplik", hebrewAuthor: 'רבי אלתר טפליקער',
    urlBase: '/reader/hashtatfchus-hanefesh', partNum: 1
  });
  allNewBooks.push({
    id: 'hashtatfchus-hanefesh', title: 'Hashtatfchus HaNefesh',
    hebrewTitle: 'השתפכות הנפש',
    author: "Rabbi Alter of Teplik", hebrewAuthor: 'רבי אלתר טפליקער',
    parts: [{ part: 1, title: 'Outpouring of the Soul', hebrewTitle: 'השתפכות הנפש',
      totalTorahs: hhCatalog.length, indexUrl: '/reader/hashtatfchus-hanefesh/index.json' }]
  });

  console.log('\n=== Meshivas Nefesh ===');
  const mnCatalog = parseStandardBook(alterDir + '/משיבת נפש.txt', {
    id: 'meshivas-nefesh', prefix: 'mn', filePrefix: 'section',
    title: 'Meshivas Nefesh', hebrewTitle: 'משיבת נפש',
    author: "Rabbi Alter of Teplik", hebrewAuthor: 'רבי אלתר טפליקער',
    urlBase: '/reader/meshivas-nefesh', partNum: 1
  });
  allNewBooks.push({
    id: 'meshivas-nefesh', title: 'Meshivas Nefesh',
    hebrewTitle: 'משיבת נפש',
    author: "Rabbi Alter of Teplik", hebrewAuthor: 'רבי אלתר טפליקער',
    parts: [{ part: 1, title: 'Restoring the Soul', hebrewTitle: 'משיבת נפש',
      totalTorahs: mnCatalog.length, indexUrl: '/reader/meshivas-nefesh/index.json' }]
  });

  // ═══════════════════════════════════════════════
  // TCHERYN (Rabbi from Tcheryn)
  // ═══════════════════════════════════════════════
  const tcherynDir = BOOKS_DIR + '/3_ספרי הרב מטשערין';

  const tcherynBooks = [
    { file: 'פרפראות לחכמה.txt', id: 'parparos-lechochma', prefix: 'plc', title: 'Parparos LeChochma', heb: 'פרפראות לחכמה' },
    { file: 'רמזי המעשיות על ספורי מעשיות.txt', id: 'rimzei-hamaasiyos', prefix: 'rm', title: 'Rimzei HaMaasiyos', heb: 'רמזי המעשיות' },
    { file: 'זמרת הארץ.txt', id: 'zimras-haaretz', prefix: 'za', title: 'Zimras HaAretz', heb: 'זמרת הארץ' },
    { file: 'יקרא דשבתא.txt', id: 'yikra-dshabbata', prefix: 'yds', title: 'Yikra DShabbata', heb: 'יקרא דשבתא' },
    { file: 'ירח האיתנים.txt', id: 'yereach-haeitanim', prefix: 'ye', title: 'Yereach HaEitanim', heb: 'ירח האיתנים' },
    { file: 'נחת השולחן.txt', id: 'nachas-hashulchan', prefix: 'ns', title: 'Nachas HaShulchan', heb: 'נחת השולחן' },
  ];

  for (const book of tcherynBooks) {
    console.log(`\n=== ${book.title} ===`);
    const catalog = parseStandardBook(tcherynDir + '/' + book.file, {
      id: book.id, prefix: book.prefix, filePrefix: 'section',
      title: book.title, hebrewTitle: book.heb,
      author: 'Rabbi Nachman of Tcheryn', hebrewAuthor: 'הרב מטשערין',
      urlBase: `/reader/${book.id}`, partNum: 1
    });
    allNewBooks.push({
      id: book.id, title: book.title, hebrewTitle: book.heb,
      author: 'Rabbi Nachman of Tcheryn', hebrewAuthor: 'הרב מטשערין',
      parts: [{ part: 1, title: book.title, hebrewTitle: book.heb,
        totalTorahs: catalog.length, indexUrl: `/reader/${book.id}/index.json` }]
    });
  }

  // Otzar HaYirah - Likutay Eitzos Mahaduras Basra
  console.log('\n=== Likutay Eitzos Mahaduras Basra ===');
  const otzarDir = tcherynDir + '/אוצר היראה';
  const otzarFile = findFile(otzarDir, 'מהדורא בתרא');
  if (otzarFile) {
    const lembCatalog = parseStandardBook(otzarDir + '/' + otzarFile, {
      id: 'likutay-eitzos-basra', prefix: 'leb', filePrefix: 'topic',
      title: 'Likutay Eitzos (Mahaduras Basra)', hebrewTitle: 'ליקוטי עצות מהדורא בתרא',
      author: 'Rabbi Nachman of Tcheryn', hebrewAuthor: 'הרב מטשערין',
      urlBase: '/reader/likutay-eitzos-basra', partNum: 1
    });
    allNewBooks.push({
      id: 'likutay-eitzos-basra', title: 'Likutay Eitzos (Mahaduras Basra)',
      hebrewTitle: 'ליקוטי עצות מהדורא בתרא',
      author: 'Rabbi Nachman of Tcheryn', hebrewAuthor: 'הרב מטשערין',
      parts: [{ part: 1, title: 'Topics', hebrewTitle: 'ערכים',
        totalTorahs: lembCatalog.length, indexUrl: '/reader/likutay-eitzos-basra/index.json' }]
    });
  }

  // ═══════════════════════════════════════════════
  // R' AVRAHAM bar Nachman
  // ═══════════════════════════════════════════════
  const avrDir = BOOKS_DIR + '/' + fs.readdirSync(BOOKS_DIR).find(d => d.includes('אברהם'));

  const avrBooks = [
    { file: 'ביאור הליקוטים.txt', id: 'biur-halikutim', prefix: 'bhl', title: 'Biur HaLikutim', heb: 'ביאור הליקוטים' },
    { file: 'חכמה ותבונה.txt', id: 'chochma-utvuna', prefix: 'cut', title: 'Chochma UTvuna', heb: 'חכמה ותבונה' },
    { file: 'כוכבי אור השלם.txt', id: 'kokhvei-or', prefix: 'ko', title: 'Kokhvei Or', heb: 'כוכבי אור' },
  ];

  for (const book of avrBooks) {
    console.log(`\n=== ${book.title} ===`);
    const catalog = parseStandardBook(avrDir + '/' + book.file, {
      id: book.id, prefix: book.prefix, filePrefix: 'section',
      title: book.title, hebrewTitle: book.heb,
      author: "Rabbi Avraham bar Nachman", hebrewAuthor: "רבי אברהם בר' נחמן",
      urlBase: `/reader/${book.id}`, partNum: 1
    });
    allNewBooks.push({
      id: book.id, title: book.title, hebrewTitle: book.heb,
      author: "Rabbi Avraham bar Nachman", hebrewAuthor: "רבי אברהם בר' נחמן",
      parts: [{ part: 1, title: book.title, hebrewTitle: book.heb,
        totalTorahs: catalog.length, indexUrl: `/reader/${book.id}/index.json` }]
    });
  }

  // ═══════════════════════════════════════════════
  // SIACH SARFEI KODESH (6 volumes)
  // ═══════════════════════════════════════════════
  console.log('\n=== Siach Sarfei Kodesh ===');
  const sskDir = BOOKS_DIR + '/לוי יצחק בנדר';
  const sskFiles = fs.readdirSync(sskDir).sort();
  const sskCatalogs = [];

  for (let v = 0; v < sskFiles.length; v++) {
    const partNum = v + 1;
    const file = sskFiles[v];
    const text = readWin1255(sskDir + '/' + file);
    const sections = splitByAtMarkers(text).filter(s => /[\u0590-\u05FF]/.test(s.title));

    const partDir = path.join(OUTPUT_BASE, 'siach-sarfei-kodesh', `part-${partNum}`);
    const config = {
      id: 'siach-sarfei-kodesh', prefix: `ssk-${partNum}`, filePrefix: 'section',
      title: `Siach Sarfei Kodesh ${partNum}`,
      hebrewTitle: `שיח שרפי קודש ${['א','ב','ג','ד','ה','ו'][v]}`,
      author: 'Levi Yitzchak Bender', hebrewAuthor: 'לוי יצחק בנדר',
      urlBase: '/reader/siach-sarfei-kodesh', partNum
    };
    const catalog = writeBookJSON(partDir, sections, config);
    writeIndex(partDir, catalog, config);
    sskCatalogs.push({ partNum, catalog });
    console.log(`  Volume ${partNum}: ${catalog.length} sections`);
  }

  allNewBooks.push({
    id: 'siach-sarfei-kodesh', title: 'Siach Sarfei Kodesh',
    hebrewTitle: 'שיח שרפי קודש',
    author: 'Levi Yitzchak Bender', hebrewAuthor: 'לוי יצחק בנדר',
    parts: sskCatalogs.map(k => ({
      part: k.partNum,
      title: `Volume ${k.partNum}`,
      hebrewTitle: `חלק ${['א','ב','ג','ד','ה','ו'][k.partNum - 1]}`,
      totalTorahs: k.catalog.length,
      indexUrl: `/reader/siach-sarfei-kodesh/part-${k.partNum}/index.json`
    }))
  });

  // ═══════════════════════════════════════════════
  // STUDENTS & MISC
  // ═══════════════════════════════════════════════
  console.log('\n=== Students & Misc Books ===');
  const studentsDir = BOOKS_DIR + '/6_ספרים של תלמידים ועוד';
  const studentsFiles = fs.readdirSync(studentsDir).filter(f => f.endsWith('.txt'));

  for (const file of studentsFiles) {
    const cleanName = file.replace(/^\d+_/, '').replace('.txt', '');
    const slug = cleanName.replace(/[^a-zA-Z\u0590-\u05FF]/g, '-').replace(/-+/g, '-').toLowerCase();
    const id = 'misc-' + slug.substring(0, 30);

    try {
      const catalog = parseStandardBook(studentsDir + '/' + file, {
        id, prefix: id.substring(0, 10), filePrefix: 'section',
        title: cleanName, hebrewTitle: cleanName,
        author: 'Breslov Students', hebrewAuthor: 'תלמידים',
        urlBase: `/reader/${id}`, partNum: 1
      });
      if (catalog.length > 0) {
        allNewBooks.push({
          id, title: cleanName, hebrewTitle: cleanName,
          author: 'Breslov Students', hebrewAuthor: 'תלמידים',
          parts: [{ part: 1, title: cleanName, hebrewTitle: cleanName,
            totalTorahs: catalog.length, indexUrl: `/reader/${id}/index.json` }]
        });
      }
    } catch(e) { console.log(`  Skipped ${file}: ${e.message}`); }
  }

  // R' Shimshon Barsky
  console.log('\n=== R\' Shimshon Barsky ===');
  const shimshonDir = BOOKS_DIR + '/6_ספרי רבי שמשון בארסקי';
  for (const file of fs.readdirSync(shimshonDir).filter(f => f.endsWith('.txt'))) {
    const cleanName = file.replace('.txt', '');
    const id = 'shimshon-' + cleanName.replace(/[^a-zA-Z\u0590-\u05FF]/g, '-').substring(0, 20);
    try {
      const catalog = parseStandardBook(shimshonDir + '/' + file, {
        id, prefix: id.substring(0, 8), filePrefix: 'section',
        title: cleanName, hebrewTitle: cleanName,
        author: 'Rabbi Shimshon Barsky', hebrewAuthor: 'רבי שמשון בארסקי',
        urlBase: `/reader/${id}`, partNum: 1
      });
      if (catalog.length > 0) {
        allNewBooks.push({
          id, title: cleanName, hebrewTitle: cleanName,
          author: 'Rabbi Shimshon Barsky', hebrewAuthor: 'רבי שמשון בארסקי',
          parts: [{ part: 1, title: cleanName, hebrewTitle: cleanName,
            totalTorahs: catalog.length, indexUrl: `/reader/${id}/index.json` }]
        });
      }
    } catch(e) { console.log(`  Skipped ${file}: ${e.message}`); }
  }

  // R' Nosson bar Yehuda
  console.log('\n=== R\' Nosson bar Yehuda ===');
  const nbyDir = BOOKS_DIR + '/3_ספרי רבי נתן בר יהודה';
  for (const file of fs.readdirSync(nbyDir).filter(f => f.endsWith('.txt'))) {
    const cleanName = file.replace(/^\d+_/, '').replace('.txt', '');
    const id = 'nosson-by-' + cleanName.replace(/[^a-zA-Z\u0590-\u05FF]/g, '-').substring(0, 20);
    try {
      const catalog = parseStandardBook(nbyDir + '/' + file, {
        id, prefix: id.substring(0, 8), filePrefix: 'section',
        title: cleanName, hebrewTitle: cleanName,
        author: "Rabbi Nosson bar Yehuda", hebrewAuthor: "רבי נתן בר יהודה",
        urlBase: `/reader/${id}`, partNum: 1
      });
      if (catalog.length > 0) {
        allNewBooks.push({
          id, title: cleanName, hebrewTitle: cleanName,
          author: "Rabbi Nosson bar Yehuda", hebrewAuthor: "רבי נתן בר יהודה",
          parts: [{ part: 1, title: cleanName, hebrewTitle: cleanName,
            totalTorahs: catalog.length, indexUrl: `/reader/${id}/index.json` }]
        });
      }
    } catch(e) { console.log(`  Skipped ${file}: ${e.message}`); }
  }

  // Stories collections
  console.log('\n=== Story Collections ===');
  const storiesDir = BOOKS_DIR + '/91_סיפורים';
  for (const file of fs.readdirSync(storiesDir).filter(f => f.endsWith('.txt'))) {
    const cleanName = file.replace('.txt', '');
    const id = 'stories-' + cleanName.replace(/[^a-zA-Z\u0590-\u05FF]/g, '-').substring(0, 20);
    try {
      const catalog = parseStandardBook(storiesDir + '/' + file, {
        id, prefix: id.substring(0, 8), filePrefix: 'story',
        title: cleanName, hebrewTitle: cleanName,
        author: 'Various', hebrewAuthor: 'שונים',
        urlBase: `/reader/${id}`, partNum: 1
      });
      if (catalog.length > 0) {
        allNewBooks.push({
          id, title: cleanName, hebrewTitle: cleanName,
          author: 'Various', hebrewAuthor: 'שונים',
          parts: [{ part: 1, title: cleanName, hebrewTitle: cleanName,
            totalTorahs: catalog.length, indexUrl: `/reader/${id}/index.json` }]
        });
      }
    } catch(e) { console.log(`  Skipped ${file}: ${e.message}`); }
  }

  // English Sipurey Maasiyos
  console.log('\n=== English Sipurey Maasiyos ===');
  const engFile = BOOKS_DIR + '/92_ספרים מתורגמים/סיפורי מעשיות באנגלית.txt';
  const engCatalog = parseStandardBook(engFile, {
    id: 'sipurey-maasiyos-english', prefix: 'sme', filePrefix: 'story',
    title: 'Sipurey Maasiyos (English)', hebrewTitle: 'סיפורי מעשיות (אנגלית)',
    author: 'Rabbi Nachman of Breslov', hebrewAuthor: 'רבי נחמן מברסלב',
    urlBase: '/reader/sipurey-maasiyos-english', partNum: 1
  });
  allNewBooks.push({
    id: 'sipurey-maasiyos-english', title: 'Sipurey Maasiyos (English)',
    hebrewTitle: 'סיפורי מעשיות (אנגלית)',
    author: 'Rabbi Nachman of Breslov', hebrewAuthor: 'רבי נחמן מברסלב',
    parts: [{ part: 1, title: 'The Stories (English)', hebrewTitle: 'המעשיות (אנגלית)',
      totalTorahs: engCatalog.length, indexUrl: '/reader/sipurey-maasiyos-english/index.json' }]
  });

  // ═══════════════════════════════════════════════
  // UPDATE MAIN CATALOG
  // ═══════════════════════════════════════════════
  const catalogPath = path.join(OUTPUT_BASE, 'catalog.json');
  let mainCatalog = { books: [] };
  if (fs.existsSync(catalogPath)) {
    mainCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }

  for (const book of allNewBooks) {
    const idx = mainCatalog.books.findIndex(b => b.id === book.id);
    if (idx >= 0) mainCatalog.books[idx] = book;
    else mainCatalog.books.push(book);
  }

  fs.writeFileSync(catalogPath, JSON.stringify(mainCatalog, null, 2), 'utf8');

  // ═══════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════
  console.log('\n========================================');
  console.log('BATCH 2 PARSING COMPLETE!');
  console.log('========================================');
  let totalNew = 0;
  for (const book of allNewBooks) {
    const count = book.parts.reduce((sum, p) => sum + p.totalTorahs, 0);
    totalNew += count;
    console.log(`${book.title}: ${count} pages`);
  }
  console.log(`\nBATCH 2 TOTAL: ${totalNew} new reader pages`);
  console.log(`Catalog now has ${mainCatalog.books.length} books total`);
}

main();
