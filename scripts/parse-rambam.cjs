/**
 * Parse Rambam (Mishneh Torah) source files into ajew.org reader JSON format.
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Books/035_RAMBAM/
 * Uses L1 files, CP1255 encoded.
 *
 * Structure: 14 Books (Sefarim), each with Hilchot sections, Perakim, and Halachot.
 * Markers: $ = book title, @ = hilchot section, ~ = perek, ! = individual halacha
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const RAMBAM_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books/035_RAMBAM';
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const READER_DIR = path.join(PUBLIC, 'reader');
const CATALOG_PATH = path.join(READER_DIR, 'catalog.json');

// ─── Book Definitions ───
// Each book of Mishneh Torah with its L1 filename, slug, Hebrew and English names
const BOOKS = [
  { file: '0030_RAMBAM_MADA_L1.txt',        slug: 'mada',       he: 'ספר המדע',      en: 'Sefer HaMada (Knowledge)' },
  { file: '0040_RAMBAM AHAVA_L1.txt',        slug: 'ahava',      he: 'ספר אהבה',      en: 'Sefer Ahava (Love)' },
  { file: '0050_RAMBAM-ZMANIM_L1.txt',       slug: 'zmanim',     he: 'ספר זמנים',     en: 'Sefer Zmanim (Times)' },
  { file: '0060_RAMBAM-NASHIM_L1.txt',       slug: 'nashim',     he: 'ספר נשים',      en: 'Sefer Nashim (Women)' },
  { file: '0070_RAMBAM KDUSHA_L1.txt',       slug: 'kedusha',    he: 'ספר קדושה',     en: 'Sefer Kedusha (Holiness)' },
  { file: '0080_RAMBAM-HAFLAA_L1.txt',       slug: 'haflaa',     he: 'ספר הפלאה',     en: "Sefer Hafla'a (Vows)" },
  { file: '0090_RAMBAM_ZRAIIM_L1.txt',       slug: 'zeraim',     he: 'ספר זרעים',     en: 'Sefer Zeraim (Seeds)' },
  { file: '0100_RAMBAM AVODA_L1.txt',        slug: 'avoda',      he: 'ספר עבודה',     en: 'Sefer Avoda (Service)' },
  { file: '0110_RAMBAM KORBANOT_L1.txt',     slug: 'korbanot',   he: 'ספר קרבנות',    en: 'Sefer Korbanot (Offerings)' },
  { file: '0120_RAMBAM TAHARA_L1.txt',       slug: 'tahara',     he: 'ספר טהרה',      en: 'Sefer Tahara (Purity)' },
  { file: '0130_RAMBAM NEZIKIN_L1.txt',      slug: 'nezikin',    he: 'ספר נזיקין',    en: 'Sefer Nezikin (Damages)' },
  { file: '0140_RAMBAM_KINYAN_L1.txt',       slug: 'kinyan',     he: 'ספר קנין',      en: 'Sefer Kinyan (Acquisition)' },
  { file: '0150_RAMBAM_MISPATIM_L1.txt',     slug: 'mishpatim',  he: 'ספר משפטים',    en: 'Sefer Mishpatim (Laws)' },
  { file: '0160_RAMBAM_SHOFTIM_L1.txt',      slug: 'shoftim',    he: 'ספר שופטים',    en: 'Sefer Shoftim (Judges)' },
];

// ─── Text Cleaning ───
function cleanText(text) {
  text = text.replace(/<!--[^>]*?-->/g, '');
  text = text.replace(/<\/?[^>]+>/g, '');           // Remove HTML tags
  text = text.replace(/\{\{([^}]*)\}\}/g, '');       // Remove source references {{...}}
  text = text.replace(/\{([^}]*)\}/g, '$1');         // Keep inline quotes, remove braces
  text = text.replace(/\{~\d+~\}/g, '');
  text = text.replace(/\[\[([^\]]*)\]\]/g, '$1');
  text = text.replace(/  +/g, ' ');
  return text.trim();
}

// ─── Parse L1 File ───
function parseL1File(filePath) {
  const buf = fs.readFileSync(filePath);
  let text;
  try {
    text = iconv.decode(buf, 'cp1255');
    if (!/[\u0590-\u05FF]/.test(text)) {
      text = iconv.decode(buf, 'iso88598');
    }
  } catch (e) {
    text = iconv.decode(buf, 'iso88598');
  }

  const lines = text.split('\n');
  const perakim = []; // { hilchot, perekTitle, halachot: [{ num, text }] }
  let currentHilchot = '';
  let currentPerek = null;
  let currentHalacha = null;
  let introText = '';  // Text before first perek (hilchot intro/mitzva count)

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('&') || trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('$ ')) continue; // Book title line

    // Section separators
    if (trimmed === '<BR><HR><BR>' || trimmed === '<br><hr><br>') continue;

    // Hilchot section: @ הלכות יסודי התורה
    if (trimmed.startsWith('@ ')) {
      // Save any pending halacha
      if (currentHalacha && currentPerek) {
        currentPerek.halachot.push(currentHalacha);
        currentHalacha = null;
      }
      if (currentPerek) perakim.push(currentPerek);
      currentPerek = null;

      currentHilchot = trimmed.substring(2).trim();
      introText = '';
      continue;
    }

    // Perek: ~ הלכות יסודי התורה - פרק ראשון
    if (trimmed.startsWith('~ ')) {
      if (currentHalacha && currentPerek) {
        currentPerek.halachot.push(currentHalacha);
        currentHalacha = null;
      }
      if (currentPerek) perakim.push(currentPerek);

      const label = trimmed.substring(2).trim();
      currentPerek = {
        hilchot: currentHilchot,
        perekTitle: label,
        introText: '',
        halachot: []
      };
      continue;
    }

    // Individual halacha: ! א
    if (trimmed.startsWith('! ')) {
      if (currentHalacha && currentPerek) {
        currentPerek.halachot.push(currentHalacha);
      }
      currentHalacha = {
        num: trimmed.substring(2).trim(),
        text: ''
      };
      continue;
    }

    // Content lines
    const cleaned = cleanText(trimmed);
    if (!cleaned) continue;

    if (currentHalacha) {
      currentHalacha.text += (currentHalacha.text ? ' ' : '') + cleaned;
    } else if (currentPerek) {
      // Intro text between perek header and first halacha (mitzva count etc.)
      currentPerek.introText += (currentPerek.introText ? ' ' : '') + cleaned;
    } else if (currentHilchot) {
      // Hilchot intro (mitzva count before first perek)
      introText += (introText ? ' ' : '') + cleaned;
    }
    // else: text before any section (book intro) - skip for now
  }

  // Save last items
  if (currentHalacha && currentPerek) {
    currentPerek.halachot.push(currentHalacha);
  }
  if (currentPerek) perakim.push(currentPerek);

  return perakim;
}

// ─── Build JSON for a perek ───
function buildPerekJson(book, perek, seqNum, totalPerakim) {
  const readerSlug = `rambam-${book.slug}`;

  // Build segments: intro (if any) + each halacha
  const segments = [];
  let segIdx = 1;

  if (perek.introText && perek.introText.length > 10) {
    segments.push({
      index: segIdx++,
      he: perek.introText,
      he_nikud: perek.introText,
      en: ''
    });
  }

  for (const hal of perek.halachot) {
    if (!hal.text) continue;
    const text = hal.text;

    // Split long halachot into multiple segments (~500 chars)
    if (text.length <= 600) {
      segments.push({
        index: segIdx++,
        he: text,
        he_nikud: text,
        en: ''
      });
    } else {
      let remaining = text;
      while (remaining.length > 600) {
        let breakIdx = -1;
        for (let i = 500; i >= 200; i--) {
          if (remaining[i] === ':' || remaining[i] === '.' || remaining[i] === '׃') {
            breakIdx = i + 1;
            break;
          }
        }
        if (breakIdx === -1) {
          for (let i = 550; i >= 200; i--) {
            if (remaining[i] === ' ') { breakIdx = i + 1; break; }
          }
        }
        if (breakIdx === -1) breakIdx = 500;
        segments.push({
          index: segIdx++,
          he: remaining.substring(0, breakIdx).trim(),
          he_nikud: remaining.substring(0, breakIdx).trim(),
          en: ''
        });
        remaining = remaining.substring(breakIdx).trim();
      }
      if (remaining.trim()) {
        segments.push({
          index: segIdx++,
          he: remaining.trim(),
          he_nikud: remaining.trim(),
          en: ''
        });
      }
    }
  }

  if (segments.length === 0) return null;

  const prevUrl = seqNum > 1 ? `/reader/${readerSlug}/part-1/${seqNum - 1}` : null;
  const nextUrl = seqNum < totalPerakim ? `/reader/${readerSlug}/part-1/${seqNum + 1}` : null;

  return {
    id: `${readerSlug}-${seqNum}`,
    title: `${book.en} - ${perek.perekTitle}`,
    hebrewTitle: perek.perekTitle,
    displayNumber: String(seqNum),
    hilchot: perek.hilchot || '',
    segments,
    navigation: { prevUrl, nextUrl }
  };
}

// ─── Route Template ───
function generateRouteTemplate(book, readerSlug, perekCount) {
  return `---
import Layout from '../../../../layouts/Layout.astro';
import '../../../../styles/reader.css';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  const paths = [];
  for (let torah = 1; torah <= ${perekCount}; torah++) {
    paths.push({ params: { part: '1', torah: String(torah) } });
  }
  return paths;
}

const { part, torah } = Astro.params;
const partNum = parseInt(part);
const torahNum = parseInt(torah);

let torahData = null;
let error = null;

try {
  const filePath = path.join(process.cwd(), \`public/reader/${readerSlug}/part-\${partNum}/torah-\${torahNum}.json\`);
  const raw = fs.readFileSync(filePath, 'utf8');
  torahData = JSON.parse(raw);
} catch (e) {
  error = \`Chapter \${torahNum} not found\`;
}

if (!torahData && !error) error = 'Content not available';

const bookName = "Rambam - ${book.en}";
const bookHebrew = 'רמב\\"ם - ${book.he}';

const pageTitle = torahData
  ? \`\${torahData.hebrewTitle || torahData.title} - Rambam\`
  : 'Chapter Not Found';
const pageDesc = torahData
  ? \`Read \${torahData.title} from Rambam's Mishneh Torah\`
  : '';

const structuredData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": \`\${torahData.title} - Rambam\`,
  "alternativeHeadline": torahData.hebrewTitle || '',
  "author": { "@type": "Person", "name": "Rambam (Maimonides)" },
  "publisher": { "@type": "Organization", "name": "ajew.org" },
  "inLanguage": ["he"],
  "isPartOf": { "@type": "Book", "name": "Mishneh Torah - ${book.en}" },
  "url": \`https://ajew.org/reader/${readerSlug}/\${partNum}/\${torahNum}\`
}) : '';
---

<Layout title={pageTitle} description={pageDesc}>
  {torahData && structuredData && (
    <script type="application/ld+json" set:html={structuredData} slot="head" />
  )}
  {error ? (
    <div style="text-align: center; padding: 80px 20px;">
      <h1>{error}</h1>
      <p><a href="/reader">Back to Reader</a></p>
    </div>
  ) : (
    <div
      class="reader-container"
      data-torah-id={torahData.id}
      data-torah-title={\`\${torahData.title} - Rambam\`}
    >
      <div class="reader-progress"></div>

      <div class="reader-breadcrumb">
        <a href="/reader">Reader</a>
        <span>&rsaquo;</span>
        <a href="/reader">${book.en}</a>
        <span>&rsaquo;</span>
        {torahData.hebrewTitle || torahData.title}
      </div>

      <div class="reader-toolbar">
        <div class="reader-toolbar-group">
          <button class="reader-btn" data-mode="hebrew">Hebrew</button>
          <button class="reader-btn" data-mode="english">English</button>
          <button class="reader-btn" data-mode="both">Both</button>
        </div>
        <div class="reader-toolbar-group">
          <button class="reader-btn" id="btn-nikud">Nikud</button>
        </div>
        <div class="reader-toolbar-group">
          <span style="font-size:0.7em; font-family: 'Open Sans', sans-serif; color: var(--reader-text-secondary);">A</span>
          <input type="range" id="font-size-slider" class="font-size-slider" min="12" max="32" value="18" />
          <span style="font-size:0.9em; font-family: 'Open Sans', sans-serif; color: var(--reader-text-secondary);">A</span>
        </div>
        <div class="reader-toolbar-group">
          <button class="reader-btn reader-btn-icon" data-theme-btn="day">Day</button>
          <button class="reader-btn reader-btn-icon" data-theme-btn="sepia">Sepia</button>
          <button class="reader-btn reader-btn-icon" data-theme-btn="night">Night</button>
        </div>
        <div class="reader-toolbar-group">
          <button class="reader-btn reader-btn-icon" id="btn-listen" onclick="toggleSpeaking()">Listen</button>
          <button class="reader-btn reader-btn-icon" id="btn-search">Search</button>
          <button class="reader-btn reader-btn-icon" id="btn-bookmark">Bookmark</button>
          <button class="reader-btn reader-btn-icon" id="btn-fullscreen">Fullscreen</button>
        </div>
      </div>

      <div class="reader-search-bar">
        <input type="text" placeholder="Search in this chapter..." dir="auto" />
        <span class="search-info"></span>
        <button class="reader-btn search-close">Close</button>
      </div>

      <button class="reader-toc-toggle" title="Table of Contents">&#9776;</button>
      <div class="reader-toc">
        <button class="reader-toc-close">&times;</button>
        <h3>Sections</h3>
        <ul class="reader-toc-list">
          {torahData.segments.map((seg, i) => (
            <li><a href={\`#seg-\${seg.index}\`} data-index={String(seg.index)}>{seg.index}</a></li>
          ))}
        </ul>
      </div>

      <div class="reader-header">
        {torahData.hilchot && <div style="color: var(--reader-text-secondary); font-size: 0.85em; margin-bottom: 4px;">{torahData.hilchot}</div>}
        {torahData.hebrewTitle && <div class="hebrew-title">{torahData.hebrewTitle}</div>}
        <h1>{torahData.title}</h1>
        <p style="color: var(--reader-text-secondary); font-size: 0.9em; font-family: 'Open Sans', sans-serif;">
          רמב"ם - ${book.he} / Rambam - ${book.en}
        </p>
      </div>

      <div class="reader-nav">
        {torahData.navigation.prevUrl ? (
          <a href={torahData.navigation.prevUrl} data-dir="prev">&larr; Previous</a>
        ) : <span class="disabled">&larr; Previous</span>}
        <a href="/reader">All Books</a>
        {torahData.navigation.nextUrl ? (
          <a href={torahData.navigation.nextUrl} data-dir="next">Next &rarr;</a>
        ) : <span class="disabled">Next &rarr;</span>}
      </div>

      <div class="reader-content mode-hebrew">
        {torahData.segments.map((seg) => (
          <div class="reader-segment-pair" id={\`seg-\${seg.index}\`}>
            <div class="reader-segment segment-he" data-index={String(seg.index)}>
              <span class="segment-number">{seg.index}</span>
              <p data-nikud={seg.he}>{seg.he}</p>
            </div>
            <div class={\`reader-segment segment-en \${!seg.en ? 'empty-translation' : ''}\`} data-index={String(seg.index)}>
              <span class="segment-number">{seg.index}</span>
              <p>{seg.en || 'Translation not yet available'}</p>
            </div>
          </div>
        ))}
      </div>

      <div class="reader-nav">
        {torahData.navigation.prevUrl ? (
          <a href={torahData.navigation.prevUrl} data-dir="prev">&larr; Previous</a>
        ) : <span class="disabled">&larr; Previous</span>}
        <a href="/reader">All Books</a>
        {torahData.navigation.nextUrl ? (
          <a href={torahData.navigation.nextUrl} data-dir="next">Next &rarr;</a>
        ) : <span class="disabled">Next &rarr;</span>}
      </div>

      <script src="/reader-script.js?v=20260820-notes-fix" is:inline></script>
    </div>
  )}
</Layout>
`;
}

// ─── Main ───
function main() {
  console.log('=== Rambam (Mishneh Torah) Parser ===\n');

  const catalogEntries = [];
  let totalPerakimParsed = 0;
  let totalSegments = 0;
  const bookStats = [];

  for (const book of BOOKS) {
    const filePath = path.join(RAMBAM_DIR, book.file);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${book.en} - file not found: ${book.file}`);
      continue;
    }

    console.log(`Parsing: ${book.en} (${book.he})`);

    const perakim = parseL1File(filePath);
    if (perakim.length === 0) {
      console.log(`  WARNING: No perakim found!`);
      continue;
    }

    const readerSlug = `rambam-${book.slug}`;
    const outDir = path.join(READER_DIR, readerSlug, 'part-1');
    fs.mkdirSync(outDir, { recursive: true });

    const indexEntries = [];
    let count = 0;

    for (let i = 0; i < perakim.length; i++) {
      const seqNum = i + 1;
      const json = buildPerekJson(book, perakim[i], seqNum, perakim.length);
      if (!json) continue;

      fs.writeFileSync(path.join(outDir, `torah-${seqNum}.json`), JSON.stringify(json, null, 2), 'utf8');
      count++;
      totalSegments += json.segments.length;

      indexEntries.push({
        number: seqNum,
        displayNumber: json.displayNumber,
        title: json.title,
        hebrewTitle: json.hebrewTitle,
        hilchot: json.hilchot || ''
      });
    }

    // Write index
    const indexJson = {
      bookId: readerSlug,
      title: `Rambam - ${book.en}`,
      hebrewTitle: `רמב"ם - ${book.he}`,
      totalItems: count,
      itemType: 'perek',
      items: indexEntries
    };
    fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');

    totalPerakimParsed += count;
    bookStats.push({ name: book.en, he: book.he, count, slug: book.slug });

    catalogEntries.push({
      id: readerSlug,
      title: `Rambam - ${book.en}`,
      hebrewTitle: `רמב"ם - ${book.he}`,
      author: 'Rambam (Maimonides)',
      hebrewAuthor: 'רמב"ם',
      parts: [{
        part: 1,
        title: book.en,
        hebrewTitle: book.he,
        totalTorahs: count,
        indexUrl: `/reader/${readerSlug}/part-1/index.json`
      }]
    });

    console.log(`  -> ${count} perakim, ${perakim.reduce((a, p) => a + p.halachot.length, 0)} halachot`);

    // Generate route
    const routeDir = path.join(ROOT, 'src/pages/reader', readerSlug, '[part]');
    fs.mkdirSync(routeDir, { recursive: true });
    const routeContent = generateRouteTemplate(book, readerSlug, count);
    fs.writeFileSync(path.join(routeDir, '[torah].astro'), routeContent, 'utf8');
  }

  // Update catalog.json
  console.log('\nUpdating catalog.json...');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  catalog.books = catalog.books.filter(b => !b.id.startsWith('rambam-'));
  catalog.books.push(...catalogEntries);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`  Added ${catalogEntries.length} books to catalog.json`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Books parsed: ${bookStats.length}`);
  console.log(`Total perakim (chapters): ${totalPerakimParsed}`);
  console.log(`Total segments: ${totalSegments}`);
  console.log('\nPer book:');
  for (const b of bookStats) {
    console.log(`  ${b.name.padEnd(35)} (${b.he.padEnd(12)}) : ${b.count} chapters`);
  }
}

main();
