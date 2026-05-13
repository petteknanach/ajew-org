/**
 * Parse Zohar source files into ajew.org reader JSON format.
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Books/106_KABALA/
 * Uses L1 files, CP1255 encoded.
 *
 * Structure: 8 volumes, each with parsha/section (@) and daf (~) markers.
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const KABALA_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books/106_KABALA';
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const READER_DIR = path.join(PUBLIC, 'reader');
const CATALOG_PATH = path.join(READER_DIR, 'catalog.json');

const VOLUMES = [
  { file: '000020_ZOHAR0-hakdama_L1.txt', slug: 'hakdama',  he: 'הקדמה',           en: 'Hakdama (Introduction)' },
  { file: '000021_ZOHAR1_L1.txt',         slug: 'bereishit', he: 'בראשית',          en: 'Bereishit' },
  { file: '000021_ZOHAR2_L1.txt',         slug: 'shemos',    he: 'שמות',            en: 'Shemos' },
  { file: '000021_ZOHAR3_L1.txt',         slug: 'vayikra',   he: 'ויקרא',           en: 'Vayikra' },
  { file: '000021_ZOHAR4_L1.txt',         slug: 'bamidbar',  he: 'במדבר',           en: 'Bamidbar' },
  { file: '000021_ZOHAR5_L1.txt',         slug: 'devarim',   he: 'דברים',           en: 'Devarim' },
  { file: '000022_ZOHAR6-tikunim_L1.txt', slug: 'tikunim',   he: 'תיקוני הזוהר',   en: 'Tikunei Zohar' },
  { file: '000022_ZOHAR7-hadash_L1.txt',  slug: 'hadash',    he: 'זוהר חדש',        en: 'Zohar Chadash' },
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
  const sections = []; // { parsha, dafTitle, rawText }
  let currentParsha = '';
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('&') || trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('$ ')) continue;
    if (trimmed === '<BR><HR><BR>' || trimmed === '<br><hr><br>') continue;

    // Parsha marker: @ פרשת בראשית
    if (trimmed.startsWith('@ ')) {
      if (currentSection) sections.push(currentSection);
      currentParsha = trimmed.substring(2).trim();
      currentSection = null;
      continue;
    }

    // Daf marker: ~ דף טו ע''א
    if (trimmed.startsWith('~ ')) {
      if (currentSection) sections.push(currentSection);
      const label = trimmed.substring(2).trim();
      currentSection = {
        parsha: currentParsha,
        label: label,
        rawText: ''
      };
      continue;
    }

    // Content
    if (currentSection) {
      const cleaned = cleanText(trimmed);
      if (cleaned) {
        currentSection.rawText += (currentSection.rawText ? ' ' : '') + cleaned;
      }
    } else if (currentParsha) {
      // Content between parsha header and first daf - start a section
      const cleaned = cleanText(trimmed);
      if (cleaned && cleaned.length > 20) {
        currentSection = {
          parsha: currentParsha,
          label: currentParsha,
          rawText: cleaned
        };
      }
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

function buildSectionJson(vol, section, seqNum, totalSections) {
  const cleaned = section.rawText;
  if (!cleaned || cleaned.length < 10) return null;

  const readerSlug = `zohar-${vol.slug}`;
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
    title: `Zohar ${vol.en} - ${section.label}`,
    hebrewTitle: section.label,
    displayNumber: String(seqNum),
    parsha: section.parsha || '',
    segments: segments.map((text, i) => ({
      index: i + 1,
      he: text,
      he_nikud: text,
      en: ''
    })),
    navigation: { prevUrl, nextUrl }
  };
}

function generateRouteTemplate(vol, readerSlug, sectionCount) {
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
  const filePath = path.join(process.cwd(), \`public/reader/${readerSlug}/part-\${partNum}/torah-\${torahNum}.json\`);
  const raw = fs.readFileSync(filePath, 'utf8');
  torahData = JSON.parse(raw);
} catch (e) {
  error = \`Page \${torahNum} not found\`;
}

if (!torahData && !error) error = 'Content not available';

const bookName = 'Zohar - ${vol.en}';
const bookHebrew = 'זוהר - ${vol.he}';

const pageTitle = torahData
  ? \`\${torahData.hebrewTitle || torahData.title} - Zohar\`
  : 'Page Not Found';
const pageDesc = torahData
  ? \`Read \${torahData.title} from the holy Zohar\`
  : '';

const structuredData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": \`\${torahData.title} - Zohar\`,
  "alternativeHeadline": torahData.hebrewTitle || '',
  "author": { "@type": "Person", "name": "Rabbi Shimon bar Yochai" },
  "publisher": { "@type": "Organization", "name": "ajew.org" },
  "inLanguage": ["he"],
  "isPartOf": { "@type": "Book", "name": "Zohar HaKadosh - ${vol.en}" },
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
      data-torah-title={\`\${torahData.title} - Zohar\`}
    >
      <div class="reader-progress"></div>

      <div class="reader-breadcrumb">
        <a href="/reader">Reader</a>
        <span>&rsaquo;</span>
        <a href="/reader">${vol.en}</a>
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
        <input type="text" placeholder="Search in this page..." dir="auto" />
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
        {torahData.parsha && <div style="color: var(--reader-text-secondary); font-size: 0.85em; margin-bottom: 4px;">{torahData.parsha}</div>}
        {torahData.hebrewTitle && <div class="hebrew-title">{torahData.hebrewTitle}</div>}
        <h1>{torahData.title}</h1>
        <p style="color: var(--reader-text-secondary); font-size: 0.9em; font-family: 'Open Sans', sans-serif;">
          זוהר הקדוש - ${vol.he} / Zohar - ${vol.en}
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
  console.log('=== Zohar Parser ===\n');

  const catalogEntries = [];
  let totalSectionsParsed = 0;
  let totalSegments = 0;
  const volStats = [];

  for (const vol of VOLUMES) {
    const filePath = path.join(KABALA_DIR, vol.file);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${vol.en} - file not found`);
      continue;
    }

    console.log(`Parsing: Zohar ${vol.en} (${vol.he})`);

    const sections = parseL1File(filePath);
    if (sections.length === 0) {
      console.log(`  WARNING: No sections found!`);
      continue;
    }

    const readerSlug = `zohar-${vol.slug}`;
    const outDir = path.join(READER_DIR, readerSlug, 'part-1');
    fs.mkdirSync(outDir, { recursive: true });

    const indexEntries = [];
    let count = 0;

    for (let i = 0; i < sections.length; i++) {
      const seqNum = i + 1;
      const json = buildSectionJson(vol, sections[i], seqNum, sections.length);
      if (!json) continue;

      fs.writeFileSync(path.join(outDir, `torah-${seqNum}.json`), JSON.stringify(json, null, 2), 'utf8');
      count++;
      totalSegments += json.segments.length;

      indexEntries.push({
        number: seqNum,
        displayNumber: json.displayNumber,
        title: json.title,
        hebrewTitle: json.hebrewTitle,
        parsha: json.parsha || ''
      });
    }

    const indexJson = {
      bookId: readerSlug,
      title: `Zohar - ${vol.en}`,
      hebrewTitle: `זוהר - ${vol.he}`,
      totalItems: count,
      itemType: 'daf',
      items: indexEntries
    };
    fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');

    totalSectionsParsed += count;
    volStats.push({ name: vol.en, he: vol.he, count, slug: vol.slug });

    catalogEntries.push({
      id: readerSlug,
      title: `Zohar - ${vol.en}`,
      hebrewTitle: `זוהר - ${vol.he}`,
      author: 'Zohar HaKadosh',
      hebrewAuthor: 'זוהר הקדוש',
      parts: [{
        part: 1,
        title: vol.en,
        hebrewTitle: vol.he,
        totalTorahs: count,
        indexUrl: `/reader/${readerSlug}/part-1/index.json`
      }]
    });

    console.log(`  -> ${count} pages written`);

    // Generate route
    const routeDir = path.join(ROOT, 'src/pages/reader', readerSlug, '[part]');
    fs.mkdirSync(routeDir, { recursive: true });
    const routeContent = generateRouteTemplate(vol, readerSlug, count);
    fs.writeFileSync(path.join(routeDir, '[torah].astro'), routeContent, 'utf8');
  }

  // Update catalog.json
  console.log('\nUpdating catalog.json...');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  catalog.books = catalog.books.filter(b => !b.id.startsWith('zohar-'));
  catalog.books.push(...catalogEntries);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`  Added ${catalogEntries.length} volumes to catalog.json`);

  console.log('\n=== SUMMARY ===');
  console.log(`Volumes parsed: ${volStats.length}`);
  console.log(`Total pages: ${totalSectionsParsed}`);
  console.log(`Total segments: ${totalSegments}`);
  console.log('\nPer volume:');
  for (const v of volStats) {
    console.log(`  ${v.name.padEnd(25)} (${v.he.padEnd(15)}) : ${v.count} pages`);
  }
}

main();
