/**
 * Parse Talmud Bavli source files into ajew.org reader JSON format.
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Books/030_BAVLI/
 * Uses _L1.txt files (cleanest Gemara text), Windows-1255 encoded.
 *
 * Also updates catalog.json and generates Astro route pages.
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const BAVLI_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books/030_BAVLI';
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const READER_DIR = path.join(PUBLIC, 'reader');
const CATALOG_PATH = path.join(READER_DIR, 'catalog.json');

// ─── Tractate Definitions ───
// Maps folder name -> { slug, hebrewName, englishName }
const TRACTATES = [
  { folder: '01_MAS_BRACHOT',       slug: 'brachot',       he: 'ברכות',        en: 'Brachot' },
  { folder: '02_MAS_SHABAT',        slug: 'shabbat',       he: 'שבת',          en: 'Shabbat' },
  { folder: '03_MAS_ERUVIN',        slug: 'eruvin',        he: 'עירובין',       en: 'Eruvin' },
  { folder: '04_MAS_PSACHIM',       slug: 'psachim',       he: 'פסחים',        en: 'Psachim' },
  { folder: '05_MAS_SHKALIM',       slug: 'shkalim',       he: 'שקלים',        en: 'Shkalim' },
  { folder: '06_MAS_ROSH',          slug: 'rosh-hashana',  he: 'ראש השנה',     en: 'Rosh Hashana' },
  { folder: '07_MAS_YOMA',          slug: 'yoma',          he: 'יומא',          en: 'Yoma' },
  { folder: '08_MAS_SUCA',          slug: 'sukkah',        he: 'סוכה',          en: 'Sukkah' },
  { folder: '09_MAS_BEITSA',        slug: 'beitza',        he: 'ביצה',          en: 'Beitza' },
  { folder: '10_MAS_TAANIT',        slug: 'taanit',        he: 'תענית',         en: 'Taanit' },
  { folder: '11_MAS_MEGILA',        slug: 'megillah',      he: 'מגילה',         en: 'Megillah' },
  { folder: '12_MAS_MOED_KATAN',    slug: 'moed-katan',    he: 'מועד קטן',     en: 'Moed Katan' },
  { folder: '13_MAS_HAGIGA',        slug: 'chagigah',      he: 'חגיגה',         en: 'Chagigah' },
  { folder: '14_MAS_YEVAMOT',       slug: 'yevamot',       he: 'יבמות',         en: 'Yevamot' },
  { folder: '15_MAS_KTUBOT',        slug: 'ketubot',       he: 'כתובות',        en: 'Ketubot' },
  { folder: '16_MAS_NEDARIM',       slug: 'nedarim',       he: 'נדרים',         en: 'Nedarim' },
  { folder: '17_MAS_NAZIR',         slug: 'nazir',         he: 'נזיר',          en: 'Nazir' },
  { folder: '18_MAS_SOTA',          slug: 'sotah',         he: 'סוטה',          en: 'Sotah' },
  { folder: '19_MAS_GITIN',         slug: 'gittin',        he: 'גיטין',         en: 'Gittin' },
  { folder: '20_MAS_KIDUSHIN',      slug: 'kiddushin',     he: 'קידושין',       en: 'Kiddushin' },
  { folder: '21_MAS_KAMA',          slug: 'bava-kamma',    he: 'בבא קמא',      en: 'Bava Kamma' },
  { folder: '22_MAS_METSIA',        slug: 'bava-metzia',   he: 'בבא מציעא',    en: 'Bava Metzia' },
  { folder: '23_MAS_BATRA',         slug: 'bava-batra',    he: 'בבא בתרא',     en: 'Bava Batra' },
  { folder: '24_MAS_SANHEDRIN',     slug: 'sanhedrin',     he: 'סנהדרין',       en: 'Sanhedrin' },
  { folder: '25_MAS_MAKOT',         slug: 'makkot',        he: 'מכות',          en: 'Makkot' },
  { folder: '26_MAS_SHVUOT',        slug: 'shevuot',       he: 'שבועות',        en: 'Shevuot' },
  { folder: '27_MAS_AVODA_ZARA',    slug: 'avodah-zarah',  he: 'עבודה זרה',    en: 'Avodah Zarah' },
  { folder: '28_MAS_HORAYOT',       slug: 'horayot',       he: 'הוריות',        en: 'Horayot' },
  { folder: '29_MAS_EDUYOT',        slug: 'eduyot',        he: 'עדיות',         en: 'Eduyot' },
  { folder: '30_MAS_ZEVACHIM',      slug: 'zevachim',      he: 'זבחים',         en: 'Zevachim' },
  { folder: '31_MAS_MENACHOT',      slug: 'menachot',      he: 'מנחות',         en: 'Menachot' },
  { folder: '32_MAS_CHULIN',        slug: 'chulin',        he: 'חולין',         en: 'Chulin' },
  { folder: '33_MAS_BECHOROT',      slug: 'bechorot',      he: 'בכורות',        en: 'Bechorot' },
  { folder: '34_MAS_ARACHIN',       slug: 'arachin',       he: 'ערכין',         en: 'Arachin' },
  { folder: '35_MAS_TEMURA',        slug: 'temurah',       he: 'תמורה',         en: 'Temurah' },
  { folder: '36_MAS_KRETOT',        slug: 'keritot',       he: 'כריתות',        en: 'Keritot' },
  { folder: '37_MAS_MEILA',         slug: 'meilah',        he: 'מעילה',         en: 'Meilah' },
  { folder: '38_MAS_TAMID',         slug: 'tamid',         he: 'תמיד',          en: 'Tamid' },
  { folder: '39_MAS_NIDA',          slug: 'niddah',        he: 'נידה',          en: 'Niddah' },
];

// ─── Hebrew Number Conversion ───
const HEB_VALS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
  'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
};

function hebrewToNumber(heb) {
  let val = 0;
  for (const ch of heb.replace(/['"״׳]/g, '')) {
    val += HEB_VALS[ch] || 0;
  }
  return val;
}

// ─── Text Cleaning ───
function cleanText(text) {
  // Remove HTML comments (<!--...-->)
  text = text.replace(/<!--[^>]*?-->/g, '');
  // Remove HTML tags (<BR>, <B>, </B>, <small>, etc.)
  text = text.replace(/<\/?[^>]+>/g, '');
  // Remove {~N~} footnote references
  text = text.replace(/\{~\d+~\}/g, '');
  // Remove [[ ]] double brackets but keep content
  text = text.replace(/\[\[([^\]]*)\]\]/g, '$1');
  // Keep {book ref} source references
  // Clean up multiple spaces
  text = text.replace(/  +/g, ' ');
  // Trim
  text = text.trim();
  return text;
}

// ─── Segment Splitting ───
// Splits daf text into reasonable segments
function segmentText(rawText) {
  const cleaned = cleanText(rawText);
  if (!cleaned) return [];

  const segments = [];

  // First, split on Mishna/Gemara markers
  // These appear as מתני' and גמ' in the text after HTML comment removal
  const markerPattern = /(מתני'|גמ'|משנה\s+[א-ת])/;
  const parts = cleaned.split(markerPattern);

  let currentChunks = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // If this is a marker, start a new segment with the marker
    if (markerPattern.test(part) && part.length < 20) {
      // If there's accumulated text, flush it
      if (currentChunks.length > 0) {
        segments.push(...splitLongText(currentChunks.join(' ')));
        currentChunks = [];
      }
      currentChunks.push(part);
    } else {
      currentChunks.push(part);
    }
  }

  // Flush remaining
  if (currentChunks.length > 0) {
    segments.push(...splitLongText(currentChunks.join(' ')));
  }

  return segments;
}

// Split long text into ~300-char segments at natural break points
function splitLongText(text) {
  if (!text || text.trim().length === 0) return [];
  text = text.trim();

  if (text.length <= 450) return [text];

  const results = [];
  let remaining = text;

  while (remaining.length > 450) {
    // Look for a good break point between 200-400 chars
    let breakIdx = -1;

    // Try to break at sentence endings (colon in Talmud text, period)
    for (let i = 350; i >= 150; i--) {
      if (remaining[i] === ':' || remaining[i] === '.' || remaining[i] === '׃') {
        breakIdx = i + 1;
        break;
      }
    }

    // Try space break
    if (breakIdx === -1) {
      for (let i = 400; i >= 150; i--) {
        if (remaining[i] === ' ') {
          breakIdx = i + 1;
          break;
        }
      }
    }

    // Fallback: hard break at 400
    if (breakIdx === -1) breakIdx = 400;

    results.push(remaining.substring(0, breakIdx).trim());
    remaining = remaining.substring(breakIdx).trim();
  }

  if (remaining.trim()) results.push(remaining.trim());
  return results;
}

// ─── Parse a single L1 file into daf objects ───
function parseL1File(filePath) {
  const buf = fs.readFileSync(filePath);
  const text = iconv.decode(buf, 'cp1255');
  const lines = text.split('\n');

  const dafList = []; // { dafNum, amud, rawText, perek }
  let currentDaf = null;
  let currentPerek = '';
  let isEduyotStyle = false; // Eduyot uses perek markers instead of daf markers

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip metadata/comments
    if (trimmed.startsWith('&') || trimmed.startsWith('//')) continue;

    // Book title
    if (trimmed.startsWith('$ ')) continue;

    // Perek marker
    if (trimmed.startsWith('^ ')) {
      currentPerek = trimmed.substring(2).trim();
      continue;
    }

    // Daf marker: ~ דף ב - א  OR  ~ פרק ראשון (for Eduyot)
    if (trimmed.startsWith('~ ')) {
      const dafMatch = trimmed.match(/^~ דף (.+?) - (א|ב)\s*$/);
      if (dafMatch) {
        const hebNum = dafMatch[1].trim();
        const amud = dafMatch[2] === 'א' ? 'a' : 'b';
        const dafNum = hebrewToNumber(hebNum);

        if (currentDaf) dafList.push(currentDaf);
        currentDaf = { dafNum, amud, hebNum, rawText: '', perek: currentPerek };
        continue;
      }

      // Eduyot-style: perek markers used as sections
      const perekMatch = trimmed.match(/^~ (.+)$/);
      if (perekMatch) {
        isEduyotStyle = true;
        if (currentDaf) dafList.push(currentDaf);
        const sectionNum = dafList.length + 1;
        currentDaf = {
          dafNum: sectionNum,
          amud: '',
          hebNum: String(sectionNum),
          rawText: '',
          perek: perekMatch[1].trim(),
          isSection: true
        };
        continue;
      }
    }

    // Content line
    if (currentDaf) {
      currentDaf.rawText += (currentDaf.rawText ? '\n' : '') + trimmed;
    }
  }

  // Push last daf
  if (currentDaf) dafList.push(currentDaf);

  return { dafList, isEduyotStyle };
}

// ─── Build JSON for a single daf ───
function buildDafJson(tractate, daf, seqNum, totalDafs) {
  const segments = segmentText(daf.rawText);
  if (segments.length === 0) return null;

  const readerSlug = `talmud-bavli-${tractate.slug}`;

  // Build display strings
  let displayNumber, id, title, hebrewTitle;

  if (daf.isSection) {
    // Eduyot-style: sections, not dafim
    displayNumber = String(daf.dafNum);
    id = `${readerSlug}-${daf.dafNum}`;
    title = `${tractate.en} - ${daf.perek}`;
    hebrewTitle = `${tractate.he} - ${daf.perek}`;
  } else {
    const amudHe = daf.amud === 'a' ? 'עמוד א' : 'עמוד ב';
    const amudEn = daf.amud === 'a' ? 'a' : 'b';
    displayNumber = `${daf.dafNum}${amudEn}`;
    id = `${readerSlug}-${daf.dafNum}${amudEn}`;
    title = `${tractate.en} ${daf.dafNum}${amudEn}`;
    hebrewTitle = `${tractate.he} דף ${daf.hebNum} ${amudHe}`;
  }

  const prevUrl = seqNum > 1
    ? `/reader/${readerSlug}/part-1/${seqNum - 1}`
    : null;
  const nextUrl = seqNum < totalDafs
    ? `/reader/${readerSlug}/part-1/${seqNum + 1}`
    : null;

  return {
    id,
    title,
    hebrewTitle,
    displayNumber,
    perek: daf.perek || '',
    segments: segments.map((text, i) => ({
      index: i + 1,
      he: text,
      he_nikud: text,
      en: ''
    })),
    navigation: {
      prevUrl,
      nextUrl
    }
  };
}

// ─── Find L1 file in a tractate folder ───
function findL1File(folderPath) {
  const files = fs.readdirSync(folderPath);
  const l1 = files.find(f => f.endsWith('_L1.txt'));
  return l1 ? path.join(folderPath, l1) : null;
}

// ─── Main ───
function main() {
  console.log('=== Talmud Bavli Parser ===\n');

  const catalogEntries = [];
  let totalDafsParsed = 0;
  let totalSegments = 0;
  const tractateStats = [];

  for (const tractate of TRACTATES) {
    const folderPath = path.join(BAVLI_DIR, tractate.folder);
    if (!fs.existsSync(folderPath)) {
      console.log(`SKIP: ${tractate.folder} - folder not found`);
      continue;
    }

    const l1Path = findL1File(folderPath);
    if (!l1Path) {
      console.log(`SKIP: ${tractate.folder} - no L1 file found`);
      continue;
    }

    console.log(`Parsing: ${tractate.en} (${tractate.he}) from ${path.basename(l1Path)}`);

    const { dafList, isEduyotStyle } = parseL1File(l1Path);
    if (dafList.length === 0) {
      console.log(`  WARNING: No dafim found!`);
      continue;
    }

    // Create output directory
    const readerSlug = `talmud-bavli-${tractate.slug}`;
    const outDir = path.join(READER_DIR, readerSlug, 'part-1');
    fs.mkdirSync(outDir, { recursive: true });

    // Build index data
    const indexEntries = [];
    let dafCount = 0;

    for (let i = 0; i < dafList.length; i++) {
      const seqNum = i + 1;
      const dafJson = buildDafJson(tractate, dafList[i], seqNum, dafList.length);
      if (!dafJson) continue;

      // Write individual daf JSON
      const outPath = path.join(outDir, `torah-${seqNum}.json`);
      fs.writeFileSync(outPath, JSON.stringify(dafJson, null, 2), 'utf8');

      dafCount++;
      totalSegments += dafJson.segments.length;

      indexEntries.push({
        number: seqNum,
        displayNumber: dafJson.displayNumber,
        title: dafJson.title,
        hebrewTitle: dafJson.hebrewTitle,
        perek: dafJson.perek || ''
      });
    }

    // Write index.json
    const indexJson = {
      bookId: readerSlug,
      title: `Talmud Bavli - ${tractate.en}`,
      hebrewTitle: `תלמוד בבלי - ${tractate.he}`,
      totalItems: dafCount,
      itemType: isEduyotStyle ? 'section' : 'daf',
      items: indexEntries
    };
    fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');

    totalDafsParsed += dafCount;
    tractateStats.push({ name: tractate.en, he: tractate.he, dafCount, slug: tractate.slug });

    // Catalog entry
    catalogEntries.push({
      id: readerSlug,
      title: `Talmud Bavli - ${tractate.en}`,
      hebrewTitle: `תלמוד בבלי - ${tractate.he}`,
      author: 'Talmud Bavli',
      hebrewAuthor: 'תלמוד בבלי',
      parts: [{
        part: 1,
        title: tractate.en,
        hebrewTitle: tractate.he,
        totalTorahs: dafCount,
        indexUrl: `/reader/${readerSlug}/part-1/index.json`
      }]
    });

    console.log(`  -> ${dafCount} ${isEduyotStyle ? 'sections' : 'dafim'} written to ${readerSlug}/part-1/`);
  }

  // ─── Update catalog.json ───
  console.log('\nUpdating catalog.json...');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

  // Remove any existing talmud entries
  catalog.books = catalog.books.filter(b => !b.id.startsWith('talmud-bavli-'));

  // Add new talmud entries
  catalog.books.push(...catalogEntries);

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`  Added ${catalogEntries.length} tractates to catalog.json`);

  // ─── Generate Astro routes ───
  console.log('\nGenerating Astro route pages...');
  generateRoutes(tractateStats);

  // ─── Summary ───
  console.log('\n=== SUMMARY ===');
  console.log(`Tractates parsed: ${tractateStats.length}`);
  console.log(`Total dafim/sections: ${totalDafsParsed}`);
  console.log(`Total segments: ${totalSegments}`);
  console.log('\nPer tractate:');
  tractateStats.forEach(t => {
    console.log(`  ${t.name.padEnd(20)} (${t.he.padEnd(12)}) : ${t.dafCount} pages`);
  });
}

// ─── Astro Route Generator ───
function generateRoutes(tractateStats) {
  for (const t of tractateStats) {
    const readerSlug = `talmud-bavli-${t.slug}`;
    const routeDir = path.join(ROOT, 'src/pages/reader', readerSlug, '[part]');
    fs.mkdirSync(routeDir, { recursive: true });

    const routeContent = generateRouteTemplate(t, readerSlug);
    fs.writeFileSync(path.join(routeDir, '[torah].astro'), routeContent, 'utf8');
    console.log(`  Route: src/pages/reader/${readerSlug}/[part]/[torah].astro`);
  }
}

function generateRouteTemplate(tractate, readerSlug) {
  return `---
import Layout from '../../../../layouts/Layout.astro';
import '../../../../styles/reader.css';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  const paths = [];
  for (let torah = 1; torah <= ${tractate.dafCount}; torah++) {
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
  error = \`Daf \${torahNum} not found\`;
}

if (!torahData && !error) error = 'Content not available';

const bookName = 'Talmud Bavli - ${tractate.name}';
const bookHebrew = 'תלמוד בבלי - ${tractate.he}';

const pageTitle = torahData
  ? \`\${torahData.hebrewTitle || torahData.title} - Talmud Bavli\`
  : 'Daf Not Found';
const pageDesc = torahData
  ? \`Read \${torahData.title} from Talmud Bavli\`
  : '';

const structuredData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": \`\${torahData.title} - Talmud Bavli\`,
  "alternativeHeadline": torahData.hebrewTitle || '',
  "author": { "@type": "Organization", "name": "Talmud Bavli" },
  "publisher": { "@type": "Organization", "name": "ajew.org" },
  "inLanguage": ["he"],
  "isPartOf": { "@type": "Book", "name": "Talmud Bavli - ${tractate.name}" },
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
      data-torah-title={\`\${torahData.title} - Talmud Bavli\`}
    >
      <div class="reader-progress"></div>

      <div class="reader-breadcrumb">
        <a href="/reader">Reader</a>
        <span>&rsaquo;</span>
        <a href="/reader">${tractate.name}</a>
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
        <input type="text" placeholder="Search in this daf..." dir="auto" />
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
        {torahData.perek && <div style="color: var(--reader-text-secondary); font-size: 0.85em; margin-bottom: 4px;">{torahData.perek}</div>}
        {torahData.hebrewTitle && <div class="hebrew-title">{torahData.hebrewTitle}</div>}
        <h1>{torahData.title}</h1>
        <p style="color: var(--reader-text-secondary); font-size: 0.9em; font-family: 'Open Sans', sans-serif;">
          תלמוד בבלי - ${tractate.he} / Talmud Bavli - ${tractate.name}
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

      <div class="reader-shortcuts-overlay">
        <div class="reader-shortcuts-panel">
          <h2>Keyboard Shortcuts</h2>
          <div class="shortcut-row"><span>Hebrew mode</span><span class="shortcut-key">H</span></div>
          <div class="shortcut-row"><span>English mode</span><span class="shortcut-key">E</span></div>
          <div class="shortcut-row"><span>Both columns</span><span class="shortcut-key">B</span></div>
          <div class="shortcut-row"><span>Toggle nikud</span><span class="shortcut-key">N</span></div>
          <div class="shortcut-row"><span>Fullscreen</span><span class="shortcut-key">F</span></div>
          <div class="shortcut-row"><span>Search in text</span><span class="shortcut-key">Ctrl+F</span></div>
          <div class="shortcut-row"><span>Save bookmark</span><span class="shortcut-key">S</span></div>
          <div class="shortcut-row"><span>Previous/Next</span><span class="shortcut-key">&larr; &rarr;</span></div>
          <div class="shortcut-row"><span>Show shortcuts</span><span class="shortcut-key">?</span></div>
          <br />
          <button class="reader-btn" onclick="this.closest('.reader-shortcuts-overlay').classList.remove('open')">Close</button>
        </div>
      </div>

      <script src="/reader-script.js" is:inline></script>
    </div>
  )}
</Layout>
`;
}

// Run
main();
