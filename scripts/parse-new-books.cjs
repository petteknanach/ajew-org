/**
 * Parse 5 new Breslov books for the ajew.org reader:
 * 1. Sipurey Maasiyos (Rabbi Nachman's Stories) - 9 stories
 * 2. Sichos HaRan (Rabbi Nachman's Conversations) - 309 sections
 * 3. Shivchay HaRan (Praises of Rabbi Nachman) - 65 sections
 * 4. Chayey Moharan (Life of Rabbi Nachman) - 12 chapters
 * 5. Likutay Halachos (Rabbi Nosson's Halachic Teachings) - 8 volumes
 *
 * Source files are in Windows-1255 encoding with @ section markers.
 * Uses iconv-lite for encoding conversion.
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const ROOT = path.resolve(__dirname, '..');
const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/HebrewBreslovBooks';
const OUTPUT_BASE = path.join(ROOT, 'public/reader');

// ── Utility functions ────────────────────────────────────────

function readWin1255(filePath) {
  const raw = fs.readFileSync(filePath);
  return iconv.decode(raw, 'win1255').replace(/^\uFEFF/, '');
}

function stripMarkup(text) {
  // Remove the metadata/config header line
  text = text.replace(/^&HiddenFromIndex=.*$/m, '');

  // Remove custom markup patterns from the text format:
  // {{{{ ... }}}} = styled div blocks
  text = text.replace(/\{\{\{\{/g, '');
  text = text.replace(/\}\}\}\}/g, '');
  // ((( ... ))) = larger font spans
  text = text.replace(/\(\(\(/g, '');
  text = text.replace(/\)\)\)/g, '');
  // (( ... )) = font spans
  text = text.replace(/\(\(/g, '(');
  text = text.replace(/\)\)/g, ')');
  // { ... } = small colored text (commentary references)
  // Keep the content but remove the braces styling
  text = text.replace(/\{([^}]*)\}/g, '($1)');
  // [[[ ... ]]] = bold
  text = text.replace(/\[\[\[/g, '');
  text = text.replace(/\]\]\]/g, '');
  // [[ ... ]] = large bold
  text = text.replace(/\[\[/g, '');
  text = text.replace(/\]\]/g, '');
  // <big>...</big> = large text
  text = text.replace(/<big>/gi, '');
  text = text.replace(/<\/big>/gi, '');
  // <small>...</small>
  text = text.replace(/<small>/gi, '');
  text = text.replace(/<\/small>/gi, '');
  // <BR>, <br>, <hr>, <HR>
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<hr\s*\/?>/gi, '\n');
  text = text.replace(/<HR\s*\/?>/gi, '\n');
  // <b>...</b>, <span ...>...</span>, <div ...>...</div>
  text = text.replace(/<b[^>]*>/gi, '');
  text = text.replace(/<\/b>/gi, '');
  text = text.replace(/<span[^>]*>/gi, '');
  text = text.replace(/<\/span>/gi, '');
  text = text.replace(/<div[^>]*>/gi, '');
  text = text.replace(/<\/div>/gi, '');
  // Any remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // _nbsp_ placeholders
  text = text.replace(/_nbsp_/g, ' ');
  // Clean up excessive whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function splitByAtMarkers(text) {
  // Remove the metadata header line (starts with & and contains config params)
  text = text.replace(/^&HiddenFromIndex=[^\n]*\n?/m, '');
  // Remove $ title lines
  text = text.replace(/^\$[^\n]*\n?/m, '');

  const parts = text.split(/^@\s*/m);
  const sections = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const lines = trimmed.split(/\r?\n/);
    const title = lines[0].trim();
    if (!title) continue;
    // Skip if title looks like leftover metadata or decorators
    if (title.startsWith('&') || title.startsWith('#')) continue;
    if (/^\*+$/.test(title)) continue; // skip ******* lines
    if (!/[\u0590-\u05FF]/.test(title)) continue; // must contain Hebrew

    const content = lines.slice(1).join('\n').trim();
    if (!content) continue;

    sections.push({ title, content });
  }

  return sections;
}

function splitIntoParagraphs(content) {
  // First try double-newline splitting
  let paras = content.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // If we get very few long paragraphs, split by single newlines
  if (paras.length < 5 && paras.some(p => p.length > 1000)) {
    paras = content.split(/\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  // Also split on ~ markers (used in Chayey Moharan, etc.)
  const expanded = [];
  for (const p of paras) {
    if (p.includes('~')) {
      const subParts = p.split(/^~\s*/m)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      expanded.push(...subParts);
    } else {
      expanded.push(p);
    }
  }

  // Filter out segments that are just single Hebrew letters or numbers (orphaned markers)
  return expanded.filter(p => p.length > 2);
}

function buildNavigation(bookId, partNum, seqNum, total, urlBase) {
  return {
    prev: seqNum > 1 ? `${bookId}-${partNum}-${seqNum - 1}` : null,
    next: seqNum < total ? `${bookId}-${partNum}-${seqNum + 1}` : null,
    prevUrl: seqNum > 1 ? `${urlBase}/${partNum}/${seqNum - 1}` : null,
    nextUrl: seqNum < total ? `${urlBase}/${partNum}/${seqNum + 1}` : null
  };
}

function writeBookJSON(outputDir, sections, bookConfig) {
  fs.mkdirSync(outputDir, { recursive: true });
  const catalog = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const seqNum = i + 1;
    const paragraphs = splitIntoParagraphs(stripMarkup(sec.content));

    const segments = paragraphs.map((p, idx) => ({
      index: idx + 1,
      he: p,
      en: ''
    }));

    const readerData = {
      id: `${bookConfig.prefix}-${seqNum}`,
      book: bookConfig.id,
      part: bookConfig.partNum || 1,
      torah: seqNum,
      displayNumber: seqNum,
      title: sec.title,
      hebrewTitle: sec.title,
      keyVerse: '',
      keyVerseTranslation: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments,
      totalParagraphs: segments.length,
      hasEnglish: false,
      navigation: buildNavigation(
        bookConfig.prefix, bookConfig.partNum || 1,
        seqNum, sections.length, bookConfig.urlBase
      )
    };

    const fileName = `${bookConfig.filePrefix}-${seqNum}.json`;
    fs.writeFileSync(path.join(outputDir, fileName), JSON.stringify(readerData, null, 2), 'utf8');

    catalog.push({
      number: seqNum,
      displayNumber: seqNum,
      title: sec.title,
      hebrewTitle: sec.title,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: false,
      url: `${bookConfig.urlBase}/${bookConfig.partNum || 1}/${seqNum}`
    });
  }

  return catalog;
}

function writeIndex(outputDir, catalog, bookConfig) {
  const indexData = {
    book: bookConfig.id,
    part: bookConfig.partNum || 1,
    title: bookConfig.title,
    hebrewTitle: bookConfig.hebrewTitle,
    author: bookConfig.author,
    hebrewAuthor: bookConfig.hebrewAuthor,
    totalTorahs: catalog.length,
    torahs: catalog
  };
  fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');
}

// ── Book parsers ─────────────────────────────────────────────

function parseSipureyMaasiyos() {
  console.log('\n=== Parsing Sipurey Maasiyos (Stories) ===');
  const inputFile = path.join(BOOKS_DIR, '1_ספרי רבי נחמן', '04_ספורי מעשיות.txt');
  const text = readWin1255(inputFile);
  const sections = splitByAtMarkers(text);

  console.log(`Found ${sections.length} stories`);
  sections.forEach((s, i) => console.log(`  ${i + 1}. ${s.title}`));

  const outputDir = path.join(OUTPUT_BASE, 'sipurey-maasiyos');
  const config = {
    id: 'sipurey-maasiyos',
    prefix: 'sm',
    filePrefix: 'story',
    title: 'Sipurey Maasiyos - The Stories',
    hebrewTitle: 'סיפורי מעשיות',
    author: 'Rabbi Nachman of Breslov',
    hebrewAuthor: 'רבי נחמן מברסלב',
    urlBase: '/reader/sipurey-maasiyos',
    partNum: 1
  };

  const catalog = writeBookJSON(outputDir, sections, config);
  writeIndex(outputDir, catalog, config);
  console.log(`Generated ${catalog.length} story files`);
  return { config, catalog };
}

function parseSichosHaRan() {
  console.log('\n=== Parsing Sichos HaRan ===');
  const inputFile = path.join(BOOKS_DIR, '1_ספרי רבי נחמן', "06_שיחות הר''ן.txt");
  const text = readWin1255(inputFile);
  const sections = splitByAtMarkers(text);

  console.log(`Found ${sections.length} conversations`);

  const outputDir = path.join(OUTPUT_BASE, 'sichos-haran');
  const config = {
    id: 'sichos-haran',
    prefix: 'sr',
    filePrefix: 'sicha',
    title: "Sichos HaRan - Rabbi Nachman's Conversations",
    hebrewTitle: 'שיחות הר"ן',
    author: 'Rabbi Nachman of Breslov',
    hebrewAuthor: 'רבי נחמן מברסלב',
    urlBase: '/reader/sichos-haran',
    partNum: 1
  };

  const catalog = writeBookJSON(outputDir, sections, config);
  writeIndex(outputDir, catalog, config);
  console.log(`Generated ${catalog.length} sicha files`);
  return { config, catalog };
}

function parseShivchayHaRan() {
  console.log('\n=== Parsing Shivchay HaRan ===');
  const inputFile = path.join(BOOKS_DIR, '1_ספרי רבי נחמן', "09_שבחי הר''ן.txt");
  const text = readWin1255(inputFile);
  const sections = splitByAtMarkers(text);

  console.log(`Found ${sections.length} sections`);

  const outputDir = path.join(OUTPUT_BASE, 'shivchay-haran');
  const config = {
    id: 'shivchay-haran',
    prefix: 'sv',
    filePrefix: 'section',
    title: 'Shivchay HaRan - Praises of Rabbi Nachman',
    hebrewTitle: 'שבחי הר"ן',
    author: 'Rabbi Nosson of Breslov',
    hebrewAuthor: 'רבי נתן מברסלב',
    urlBase: '/reader/shivchay-haran',
    partNum: 1
  };

  const catalog = writeBookJSON(outputDir, sections, config);
  writeIndex(outputDir, catalog, config);
  console.log(`Generated ${catalog.length} section files`);
  return { config, catalog };
}

function parseChayeyMoharan() {
  console.log('\n=== Parsing Chayey Moharan ===');
  const inputFile = path.join(BOOKS_DIR, '1_ספרי רבי נחמן', "07_חיי מוהר''ן.txt");
  const text = readWin1255(inputFile);
  const sections = splitByAtMarkers(text);

  console.log(`Found ${sections.length} chapters`);
  sections.forEach((s, i) => console.log(`  ${i + 1}. ${s.title}`));

  const outputDir = path.join(OUTPUT_BASE, 'chayey-moharan');
  const config = {
    id: 'chayey-moharan',
    prefix: 'cm',
    filePrefix: 'chapter',
    title: 'Chayey Moharan - Life of Rabbi Nachman',
    hebrewTitle: 'חיי מוהר"ן',
    author: 'Rabbi Nosson of Breslov',
    hebrewAuthor: 'רבי נתן מברסלב',
    urlBase: '/reader/chayey-moharan',
    partNum: 1
  };

  const catalog = writeBookJSON(outputDir, sections, config);
  writeIndex(outputDir, catalog, config);
  console.log(`Generated ${catalog.length} chapter files`);
  return { config, catalog };
}

function parseLikutayHalachos() {
  console.log('\n=== Parsing Likutay Halachos ===');
  const lhDir = path.join(BOOKS_DIR, '2_ספרי רבי נתן', '02_לקוטי הלכות');

  // 8 volumes in order
  const volumes = [
    { file: '1_אורח חיים_א.txt', name: 'Orach Chaim A', heb: 'אורח חיים א' },
    { file: '2_אורח חיים_ב.txt', name: 'Orach Chaim B', heb: 'אורח חיים ב' },
    { file: '3_אורח חיים_ג.txt', name: 'Orach Chaim C', heb: 'אורח חיים ג' },
    { file: '4_יורה דעה_א.txt', name: 'Yoreh Deah A', heb: 'יורה דעה א' },
    { file: '5_יורה דעה_ב.txt', name: 'Yoreh Deah B', heb: 'יורה דעה ב' },
    { file: '6_אבן_העזר.txt', name: 'Even HaEzer', heb: 'אבן העזר' },
    { file: '7_חושן משפט_א.txt', name: 'Choshen Mishpat A', heb: 'חושן משפט א' },
    { file: '8_חושן משפט_ב.txt', name: 'Choshen Mishpat B', heb: 'חושן משפט ב' },
  ];

  const allCatalogs = [];
  let totalSections = 0;

  for (let v = 0; v < volumes.length; v++) {
    const vol = volumes[v];
    const partNum = v + 1;
    const inputFile = path.join(lhDir, vol.file);
    const text = readWin1255(inputFile);
    const sections = splitByAtMarkers(text);

    console.log(`  Volume ${partNum} (${vol.name}): ${sections.length} halachos`);
    totalSections += sections.length;

    const outputDir = path.join(OUTPUT_BASE, 'likutay-halachos', `part-${partNum}`);
    const config = {
      id: 'likutay-halachos',
      prefix: `lh-${partNum}`,
      filePrefix: 'halacha',
      title: `Likutay Halachos - ${vol.name}`,
      hebrewTitle: `ליקוטי הלכות - ${vol.heb}`,
      author: 'Rabbi Nosson of Breslov',
      hebrewAuthor: 'רבי נתן מברסלב',
      urlBase: '/reader/likutay-halachos',
      partNum
    };

    const catalog = writeBookJSON(outputDir, sections, config);
    writeIndex(outputDir, catalog, config);
    allCatalogs.push({ partNum, name: vol.name, heb: vol.heb, catalog });
  }

  console.log(`Total: ${totalSections} halachos across ${volumes.length} volumes`);
  return { volumes: allCatalogs, totalSections };
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log('Parsing 5 new Breslov books for ajew.org reader...\n');

  const sm = parseSipureyMaasiyos();
  const sr = parseSichosHaRan();
  const sv = parseShivchayHaRan();
  const cm = parseChayeyMoharan();
  const lh = parseLikutayHalachos();

  // Update the main catalog
  const catalogPath = path.join(OUTPUT_BASE, 'catalog.json');
  let mainCatalog = { books: [] };
  if (fs.existsSync(catalogPath)) {
    mainCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }

  // Add/update each book
  const newBooks = [
    {
      id: 'sipurey-maasiyos',
      title: 'Sipurey Maasiyos',
      hebrewTitle: 'סיפורי מעשיות',
      author: 'Rabbi Nachman of Breslov',
      hebrewAuthor: 'רבי נחמן מברסלב',
      parts: [{
        part: 1, title: 'The Stories',
        hebrewTitle: 'המעשיות',
        totalTorahs: sm.catalog.length,
        indexUrl: '/reader/sipurey-maasiyos/index.json'
      }]
    },
    {
      id: 'sichos-haran',
      title: 'Sichos HaRan',
      hebrewTitle: 'שיחות הר"ן',
      author: 'Rabbi Nachman of Breslov',
      hebrewAuthor: 'רבי נחמן מברסלב',
      parts: [{
        part: 1, title: 'Conversations',
        hebrewTitle: 'שיחות',
        totalTorahs: sr.catalog.length,
        indexUrl: '/reader/sichos-haran/index.json'
      }]
    },
    {
      id: 'shivchay-haran',
      title: 'Shivchay HaRan',
      hebrewTitle: 'שבחי הר"ן',
      author: 'Rabbi Nosson of Breslov',
      hebrewAuthor: 'רבי נתן מברסלב',
      parts: [{
        part: 1, title: 'Praises',
        hebrewTitle: 'שבחים',
        totalTorahs: sv.catalog.length,
        indexUrl: '/reader/shivchay-haran/index.json'
      }]
    },
    {
      id: 'chayey-moharan',
      title: 'Chayey Moharan',
      hebrewTitle: 'חיי מוהר"ן',
      author: 'Rabbi Nosson of Breslov',
      hebrewAuthor: 'רבי נתן מברסלב',
      parts: [{
        part: 1, title: 'Life of Rabbi Nachman',
        hebrewTitle: 'חיי רבינו',
        totalTorahs: cm.catalog.length,
        indexUrl: '/reader/chayey-moharan/index.json'
      }]
    },
    {
      id: 'likutay-halachos',
      title: 'Likutay Halachos',
      hebrewTitle: 'ליקוטי הלכות',
      author: 'Rabbi Nosson of Breslov',
      hebrewAuthor: 'רבי נתן מברסלב',
      parts: lh.volumes.map(v => ({
        part: v.partNum,
        title: v.name,
        hebrewTitle: v.heb,
        totalTorahs: v.catalog.length,
        indexUrl: `/reader/likutay-halachos/part-${v.partNum}/index.json`
      }))
    }
  ];

  for (const book of newBooks) {
    const idx = mainCatalog.books.findIndex(b => b.id === book.id);
    if (idx >= 0) mainCatalog.books[idx] = book;
    else mainCatalog.books.push(book);
  }

  fs.writeFileSync(catalogPath, JSON.stringify(mainCatalog, null, 2), 'utf8');

  // Summary
  console.log('\n========================================');
  console.log('PARSING COMPLETE!');
  console.log('========================================');
  console.log(`Sipurey Maasiyos: ${sm.catalog.length} stories`);
  console.log(`Sichos HaRan: ${sr.catalog.length} conversations`);
  console.log(`Shivchay HaRan: ${sv.catalog.length} sections`);
  console.log(`Chayey Moharan: ${cm.catalog.length} chapters`);
  console.log(`Likutay Halachos: ${lh.totalSections} halachos (${lh.volumes.length} volumes)`);
  const total = sm.catalog.length + sr.catalog.length + sv.catalog.length + cm.catalog.length + lh.totalSections;
  console.log(`\nTOTAL NEW: ${total} reader pages`);
  console.log(`Combined with existing: ${408 + 108 + total} total reader pages!`);
}

main();
