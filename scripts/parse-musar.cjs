/**
 * Parse Musar/Halacha/misc source files into ajew.org reader JSON format.
 * Generic parser for Books/ folder L1 files using $/@/~/! markers.
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const BOOKS_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books';
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const READER_DIR = path.join(PUBLIC, 'reader');
const CATALOG_PATH = path.join(READER_DIR, 'catalog.json');

const TEXTS = [
  { file: '100_MUSAR/024_ShmiratHalashon_L1.txt', slug: 'shmirat-halashon', he: 'שמירת הלשון', en: 'Shmirat HaLashon', author: 'Chafetz Chaim', authorHe: 'חפץ חיים', category: 'musar' },
  { file: '100_MUSAR/025_NEFESH_HAHAIM_L1.txt',   slug: 'nefesh-hachaim',   he: 'נפש החיים',    en: 'Nefesh HaChaim',    author: 'R\' Chaim of Volozhin', authorHe: "ר' חיים מוולאז'ין", category: 'musar' },
  { file: '100_MUSAR/070_EvedHashem_L1.txt',       slug: 'eved-hashem',      he: 'עבד השם',       en: 'Eved Hashem',       author: '', authorHe: '', category: 'musar' },
  { file: '100_MUSAR/200_ANAVA_L1.txt',            slug: 'anava',            he: 'ענווה',          en: 'Anava (Humility)',  author: '', authorHe: '', category: 'musar' },
  { file: '100_MUSAR/110_BINYAMIN_L1.txt',         slug: 'binyamin',         he: 'בנימין',         en: 'Binyamin',          author: '', authorHe: '', category: 'musar' },
  { file: '040_HALACHA1/106_0_0_hh_L1.txt',        slug: 'halacha-misc',     he: 'הלכה',           en: 'Halacha Misc',      author: '', authorHe: '', category: 'halacha' },
  { file: '112_HANHAGOT/075_ANSHEI KODESH_L1.txt',  slug: 'anshei-kodesh',   he: 'אנשי קודש',     en: 'Anshei Kodesh',     author: '', authorHe: '', category: 'hanhagot' },
  { file: '112_HANHAGOT/SAVIV_L1.txt',              slug: 'saviv',           he: 'סביב',           en: 'Saviv',             author: '', authorHe: '', category: 'hanhagot' },
];

function cleanText(text) {
  text = text.replace(/<!--[^>]*?-->/g, '');
  text = text.replace(/<\/?[^>]+>/g, '');
  text = text.replace(/\{\{([^}]*)\}\}/g, '');
  text = text.replace(/\{([^}]*)\}/g, '$1');
  text = text.replace(/\[\[([^\]]*)\]\]/g, '$1');
  text = text.replace(/<<([^>]*)>>/g, '$1');
  text = text.replace(/<QM>/g, '?');
  text = text.replace(/  +/g, ' ');
  return text.trim();
}

function parseL1File(filePath) {
  const buf = fs.readFileSync(filePath);
  let text;
  try {
    text = iconv.decode(buf, 'cp1255');
    if (!/[\u0590-\u05FF]/.test(text)) text = iconv.decode(buf, 'iso88598');
  } catch (e) {
    text = iconv.decode(buf, 'iso88598');
  }

  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;
  let currentGroup = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('&') || trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('$ ')) continue;
    if (trimmed === '<BR><HR><BR>' || trimmed === '<br><hr><br>') continue;

    if (trimmed.startsWith('@ ')) {
      if (currentSection) sections.push(currentSection);
      currentGroup = trimmed.substring(2).trim();
      currentSection = null;
      continue;
    }

    if (trimmed.startsWith('~ ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        group: currentGroup,
        label: trimmed.substring(2).trim(),
        rawText: ''
      };
      continue;
    }

    if (trimmed.startsWith('! ')) {
      // Treat ! as content separator within a section
      if (currentSection) {
        currentSection.rawText += ' ';
      }
      continue;
    }

    const cleaned = cleanText(trimmed);
    if (!cleaned) continue;

    if (currentSection) {
      currentSection.rawText += (currentSection.rawText ? ' ' : '') + cleaned;
    } else if (currentGroup) {
      currentSection = {
        group: currentGroup,
        label: currentGroup,
        rawText: cleaned
      };
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

function buildSectionJson(book, section, seqNum, totalSections) {
  const cleaned = section.rawText;
  if (!cleaned || cleaned.length < 10) return null;

  const readerSlug = book.slug;
  const segments = [];

  if (cleaned.length <= 600) {
    segments.push(cleaned);
  } else {
    let remaining = cleaned;
    while (remaining.length > 600) {
      let breakIdx = -1;
      for (let i = 500; i >= 200; i--) {
        if (remaining[i] === ':' || remaining[i] === '.' || remaining[i] === '׃') {
          breakIdx = i + 1; break;
        }
      }
      if (breakIdx === -1) {
        for (let i = 550; i >= 200; i--) {
          if (remaining[i] === ' ') { breakIdx = i + 1; break; }
        }
      }
      if (breakIdx === -1) breakIdx = 500;
      segments.push(remaining.substring(0, breakIdx).trim());
      remaining = remaining.substring(breakIdx).trim();
    }
    if (remaining.trim()) segments.push(remaining.trim());
  }

  const prevUrl = seqNum > 1 ? `/reader/${readerSlug}/part-1/${seqNum - 1}` : null;
  const nextUrl = seqNum < totalSections ? `/reader/${readerSlug}/part-1/${seqNum + 1}` : null;

  return {
    id: `${readerSlug}-${seqNum}`,
    title: `${book.en} - ${section.label}`,
    hebrewTitle: section.label,
    displayNumber: String(seqNum),
    group: section.group || '',
    segments: segments.map((text, i) => ({
      index: i + 1,
      he: text,
      he_nikud: text,
      en: ''
    })),
    navigation: { prevUrl, nextUrl }
  };
}

function generateRouteTemplate(book, sectionCount) {
  return `---
import Layout from '../../../../layouts/Layout.astro';
import '../../../../styles/reader.css';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  const paths = [];
  for (let torah = 1; torah <= ${sectionCount}; torah++) {
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
  const filePath = path.join(process.cwd(), \`public/reader/${book.slug}/part-\${partNum}/torah-\${torahNum}.json\`);
  const raw = fs.readFileSync(filePath, 'utf8');
  torahData = JSON.parse(raw);
} catch (e) {
  error = \`Section \${torahNum} not found\`;
}

if (!torahData && !error) error = 'Content not available';

const pageTitle = torahData
  ? \`\${torahData.hebrewTitle || torahData.title} - ${book.en}\`
  : 'Section Not Found';
const pageDesc = torahData
  ? \`Read \${torahData.title}\`
  : '';

const structuredData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": \`\${torahData.title}\`,
  "alternativeHeadline": torahData.hebrewTitle || '',
  "author": { "@type": "Person", "name": "${book.author || book.en}" },
  "publisher": { "@type": "Organization", "name": "ajew.org" },
  "inLanguage": ["he"],
  "isPartOf": { "@type": "Book", "name": "${book.en}" },
  "url": \`https://ajew.org/reader/${book.slug}/\${partNum}/\${torahNum}\`
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
      data-torah-title={\`\${torahData.title}\`}
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
        <input type="text" placeholder="Search in this section..." dir="auto" />
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
        {torahData.group && <div style="color: var(--reader-text-secondary); font-size: 0.85em; margin-bottom: 4px;">{torahData.group}</div>}
        {torahData.hebrewTitle && <div class="hebrew-title">{torahData.hebrewTitle}</div>}
        <h1>{torahData.title}</h1>
        <p style="color: var(--reader-text-secondary); font-size: 0.9em; font-family: 'Open Sans', sans-serif;">
          ${book.he} / ${book.en}
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

      <script src="/reader-script.js" is:inline></script>
    </div>
  )}
</Layout>
`;
}

function main() {
  console.log('=== Musar/Misc Text Parser ===\n');

  const catalogEntries = [];
  let totalParsed = 0;
  let totalSegments = 0;
  const stats = [];

  for (const book of TEXTS) {
    const filePath = path.join(BOOKS_DIR, book.file);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${book.en} - file not found: ${book.file}`);
      continue;
    }

    console.log(`Parsing: ${book.en} (${book.he})`);

    const sections = parseL1File(filePath);
    if (sections.length === 0) {
      console.log(`  WARNING: No sections found!`);
      continue;
    }

    const outDir = path.join(READER_DIR, book.slug, 'part-1');
    fs.mkdirSync(outDir, { recursive: true });

    const indexEntries = [];
    let count = 0;

    for (let i = 0; i < sections.length; i++) {
      const seqNum = i + 1;
      const json = buildSectionJson(book, sections[i], seqNum, sections.length);
      if (!json) continue;

      fs.writeFileSync(path.join(outDir, `torah-${seqNum}.json`), JSON.stringify(json, null, 2), 'utf8');
      count++;
      totalSegments += json.segments.length;

      indexEntries.push({
        number: seqNum,
        displayNumber: json.displayNumber,
        title: json.title,
        hebrewTitle: json.hebrewTitle,
        group: json.group || ''
      });
    }

    const indexJson = {
      bookId: book.slug,
      title: book.en,
      hebrewTitle: book.he,
      totalItems: count,
      itemType: 'section',
      items: indexEntries
    };
    fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');

    totalParsed += count;
    stats.push({ name: book.en, he: book.he, count, slug: book.slug });

    catalogEntries.push({
      id: book.slug,
      title: book.en,
      hebrewTitle: book.he,
      author: book.author || book.en,
      hebrewAuthor: book.authorHe || book.he,
      parts: [{
        part: 1,
        title: book.en,
        hebrewTitle: book.he,
        totalTorahs: count,
        indexUrl: `/reader/${book.slug}/part-1/index.json`
      }]
    });

    console.log(`  -> ${count} sections written`);

    // Generate route
    const routeDir = path.join(ROOT, 'src/pages/reader', book.slug, '[part]');
    fs.mkdirSync(routeDir, { recursive: true });
    const routeContent = generateRouteTemplate(book, count);
    fs.writeFileSync(path.join(routeDir, '[torah].astro'), routeContent, 'utf8');
  }

  // Update catalog.json
  console.log('\nUpdating catalog.json...');
  const existingSlugs = TEXTS.map(t => t.slug);
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  catalog.books = catalog.books.filter(b => !existingSlugs.includes(b.id));
  catalog.books.push(...catalogEntries);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`  Added ${catalogEntries.length} books to catalog.json`);

  console.log('\n=== SUMMARY ===');
  console.log(`Books parsed: ${stats.length}`);
  console.log(`Total sections: ${totalParsed}`);
  console.log(`Total segments: ${totalSegments}`);
  console.log('\nPer book:');
  for (const s of stats) {
    console.log(`  ${s.name.padEnd(25)} (${s.he.padEnd(15)}) : ${s.count} sections`);
  }
}

main();
