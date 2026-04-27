/**
 * Generate Astro reader routes for the new books.
 * Run this once to create the [torah].astro files.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function generateRoute(config) {
  const partsCode = config.parts.map(p =>
    `  for (let torah = 1; torah <= ${p.max}; torah++) {\n    paths.push({ params: { part: '${p.num}', torah: String(torah) } });\n  }`
  ).join('\n');

  return `---
import Layout from '../../../../layouts/Layout.astro';
import '../../../../styles/reader.css';
import fs from 'node:fs';
import path from 'node:path';

export function getStaticPaths() {
  const paths = [];
${partsCode}
  return paths;
}

const { part, torah } = Astro.params;
const partNum = parseInt(part);
const torahNum = parseInt(torah);

let torahData = null;
let error = null;

try {
  const filePath = path.join(process.cwd(), \`public/reader/${config.slug}/${config.filePattern}\`);
  const raw = fs.readFileSync(filePath, 'utf8');
  torahData = JSON.parse(raw);
} catch (e) {
  error = \`${config.itemName} \${torahNum} not found\`;
}

if (!torahData && !error) error = 'Content not available';

// Add navigation and segment indexes if missing
if (torahData) {
  if (!torahData.navigation) {
    torahData.navigation = {
      prevUrl: torahNum > 1 ? \`/reader/${config.slug}/\${partNum}/\${torahNum - 1}\` : null,
      nextUrl: \`/reader/${config.slug}/\${partNum}/\${torahNum + 1}\`,
    };
  }
  // Add segment indexes if missing
  torahData.segments.forEach((seg, i) => {
    if (!seg.index) seg.index = i + 1;
  });
}

const bookName = '${config.bookName}';
const bookHebrew = '${config.bookHebrew}';
const itemName = '${config.itemName}';

const pageTitle = torahData
  ? \`\${torahData.hebrewTitle || torahData.title} - ${config.bookName}\`
  : '${config.itemName} Not Found';
const pageDesc = torahData
  ? \`Read \${torahData.title} from ${config.bookName} by ${config.author}\`
  : '';

const structuredData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": \`\${torahData.title} - ${config.bookName}\`,
  "alternativeHeadline": torahData.hebrewTitle || '',
  "author": { "@type": "Person", "name": "${config.author}" },
  "publisher": { "@type": "Organization", "name": "ajew.org" },
  "inLanguage": ["he", "en"],
  "isPartOf": { "@type": "Book", "name": "${config.bookName}" },
  "url": \`https://ajew.org/reader/${config.slug}/\${partNum}/\${torahNum}\`
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
      data-torah-title={\`\${torahData.title} - ${config.bookName}\`}
    >
      <div class="reader-progress"></div>

      <div class="reader-breadcrumb">
        <a href="/reader">Reader</a>
        <span>&rsaquo;</span>
        <a href="/reader">${config.bookName}</a>
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
        <input type="text" placeholder={"Search in this ${config.itemName.toLowerCase()}..."} dir="auto" />
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
        {torahData.hebrewTitle && <div class="hebrew-title" lang="he" dir="rtl">{torahData.hebrewTitle}</div>}
        <h1>{torahData.title}</h1>
        <p style="color: var(--reader-text-secondary); font-size: 0.9em; font-family: 'Open Sans', sans-serif;">
          ${config.bookHebrew} - ${config.bookName}
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
            <div class="reader-segment segment-he" lang="he" dir="rtl" data-index={String(seg.index)}>
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

const books = [
  {
    slug: 'ebay-hanachal',
    bookName: 'Ebay HaNachal - Blossoms of the Stream',
    bookHebrew: 'אבי הנחל',
    itemName: 'Letter',
    author: 'Rabbi Yisroel Dov Odesser (Saba)',
    filePattern: 'part-${partNum}/letter-${torahNum}.json',
    parts: [{ num: 1, max: 130 }, { num: 2, max: 150 }]
  },
  {
    slug: 'sichos-haran',
    bookName: 'Sichos HaRan',
    bookHebrew: 'שיחות הר"ן',
    itemName: 'Sicha',
    author: 'Rabbi Nachman of Breslov',
    filePattern: 'sicha-${torahNum}.json',
    parts: [{ num: 1, max: 320 }]
  },
  {
    slug: 'shivchay-haran',
    bookName: 'Shivchay HaRan',
    bookHebrew: 'שבחי הר"ן',
    itemName: 'Section',
    author: 'Rabbi Nosson of Breslov',
    filePattern: 'section-${torahNum}.json',
    parts: [{ num: 1, max: 70 }]
  },
  {
    slug: 'chayey-moharan',
    bookName: 'Chayey Moharan',
    bookHebrew: 'חיי מוהר"ן',
    itemName: 'Chapter',
    author: 'Rabbi Nosson of Breslov',
    filePattern: 'chapter-${torahNum}.json',
    parts: [{ num: 1, max: 15 }]
  },
  {
    slug: 'likutay-halachos',
    bookName: 'Likutay Halachos',
    bookHebrew: 'ליקוטי הלכות',
    itemName: 'Halacha',
    author: 'Rabbi Nosson of Breslov',
    filePattern: 'part-${partNum}/halacha-${torahNum}.json',
    parts: [
      { num: 1, max: 60 }, { num: 2, max: 55 }, { num: 3, max: 85 },
      { num: 4, max: 110 }, { num: 5, max: 115 }, { num: 6, max: 35 },
      { num: 7, max: 95 }, { num: 8, max: 90 }
    ]
  },
  {
    slug: 'azamra',
    bookName: 'Azamra / Rabbi Nachman: Who He Was',
    bookHebrew: 'אזמרה',
    itemName: 'Section',
    author: 'English Compilation',
    filePattern: 'section-${torahNum}.json',
    parts: [{ num: 1, max: 35 }]
  },
  {
    slug: 'fires-of-israel',
    bookName: 'Fires of Israel',
    bookHebrew: 'אשי ישראל',
    itemName: 'Section',
    author: 'English Compilation',
    filePattern: 'section-${torahNum}.json',
    parts: [{ num: 1, max: 65 }]
  },
  {
    slug: 'hisbodidus-alone-time',
    bookName: 'Hisbodidus - Alone Time',
    bookHebrew: 'התבודדות',
    itemName: 'Section',
    author: 'English Compilation',
    filePattern: 'section-${torahNum}.json',
    parts: [{ num: 1, max: 50 }]
  },
  {
    slug: 'seven-pillars',
    bookName: 'The Seven Pillars',
    bookHebrew: 'שבעה עמודי האמונה',
    itemName: 'Section',
    author: 'Reb Yitzchok Breiter',
    filePattern: 'section-${torahNum}.json',
    parts: [{ num: 1, max: 5 }]
  },
  {
    slug: 'praises-of-rabbi-nachman',
    bookName: 'The Praises of Rabbi Nachman',
    bookHebrew: 'שבחי הר"ן',
    itemName: 'Section',
    author: 'English Translation',
    filePattern: 'section-${torahNum}.json',
    parts: [{ num: 1, max: 5 }]
  },
  {
    slug: 'sichos-chayay-saba',
    bookName: 'Sichos Metoch Chayay HaSaba',
    bookHebrew: 'שיחות מתוך חיי הסבא',
    itemName: 'Section',
    author: 'Saba Yisroel (Rabbi Yisroel Dov Odesser)',
    filePattern: 'section-${torahNum}.json',
    parts: [{ num: 1, max: 20 }]
  },
];

for (const book of books) {
  const dir = path.join(ROOT, 'src/pages/reader', book.slug, '[part]');
  fs.mkdirSync(dir, { recursive: true });
  const content = generateRoute(book);
  fs.writeFileSync(path.join(dir, '[torah].astro'), content, 'utf8');
  console.log(`Created route: src/pages/reader/${book.slug}/[part]/[torah].astro`);
}
console.log('\nAll routes generated!');
