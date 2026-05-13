#!/usr/bin/env node
/**
 * Import Ramchal texts from Sefaria API into ajew.org reader format.
 *
 * Usage: node scripts/import-ramchal.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const READER_DIR = path.join(PROJECT_ROOT, 'public', 'reader');

const DELAY_MS = 600; // polite rate limiting

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.json();
}

/**
 * Strip HTML tags from a string (Sefaria often wraps text in <b>, <i>, <br> etc.)
 */
function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Keep HTML but clean it up slightly
 */
function cleanHtml(str) {
  if (!str) return '';
  // Replace <br> and <br/> with newlines for better rendering, keep other tags
  return str.replace(/<br\s*\/?>/gi, '\n').trim();
}

// ============================================================
// BOOK DEFINITIONS
// ============================================================

const BOOKS = [
  {
    id: 'ramchal-mesillas-yesharim',
    slug: 'ramchal-mesillas-yesharim',
    title: 'Mesillas Yesharim',
    hebrewTitle: 'מסילת ישרים',
    author: 'Ramchal (Rabbi Moshe Chaim Luzzatto)',
    hebrewAuthor: 'רמח"ל',
    sefariaName: 'Mesillat_Yesharim',
    type: 'complex', // has Introduction + chapters
    fetchPlan: async () => {
      const sections = [];
      // Introduction
      sections.push({
        ref: 'Mesillat_Yesharim,_Introduction',
        label: 'Introduction',
        heLabel: 'הקדמה',
        group: null,
      });
      // Chapters 1-26
      for (let ch = 1; ch <= 26; ch++) {
        sections.push({
          ref: `Mesillat_Yesharim.${ch}`,
          label: `Chapter ${ch}`,
          heLabel: `פרק ${ch}`,
          group: null,
        });
      }
      return sections;
    },
  },
  {
    id: 'ramchal-derech-hashem',
    slug: 'ramchal-derech-hashem',
    title: 'Derech Hashem',
    hebrewTitle: 'דרך ה\'',
    author: 'Ramchal (Rabbi Moshe Chaim Luzzatto)',
    hebrewAuthor: 'רמח"ל',
    sefariaName: 'Derekh_Hashem',
    type: 'complex-nested',
    fetchPlan: async () => {
      const sections = [];

      // Introduction
      sections.push({
        ref: 'Derekh_Hashem,_Introduction',
        label: 'Introduction',
        heLabel: 'הקדמה',
        group: null,
      });

      // Hardcoded structure from Sefaria schema
      const parts = [
        {
          en: 'Part One', he: 'חלק ראשון',
          subs: [
            { en: 'On the Creator', he: 'בבורא יתברך' },
            { en: 'On the Purpose of Creation', he: 'בתכלית הבריאה' },
            { en: 'On Mankind', he: 'במין האנושי' },
            { en: 'On Human Responsibility', he: 'במצב האדם בעולם הזה' },
            { en: 'On the Spiritual Realm', he: 'בחלקי הבריאה ומצביהם' },
          ],
        },
        {
          en: 'Part Two', he: 'חלק שני',
          subs: [
            { en: 'On Divine Providence in General', he: 'בענין השגחתו יתברך בכלל' },
            { en: 'On Mankind in This World', he: 'במקרי המין האנושי בעולם הזה' },
            { en: 'On Personal Providence', he: 'בהשגחה האישיית' },
            { en: 'On Israel and the Nations', he: 'בענין ישראל ואומות העולם' },
            { en: 'On How Providence Works', he: 'באופן ההשגחה' },
            { en: 'On the System of Providence', he: 'בסדר ההשגחה' },
            { en: 'On the Influence of the Stars', he: 'בענין השפעת הככבים' },
            { en: 'On Specific Modes of Providence', he: 'בהבחנות פרטיות בהשגחה' },
          ],
        },
        {
          en: 'Part Three', he: 'חלק שלישי',
          subs: [
            { en: 'On the Soul and Its Activities', he: 'בענין הנפש ופעולותיה' },
            { en: 'On Divine Names and Witchcraft', he: 'בענין הפעולה בשמות ובכישוף' },
            { en: 'On Divine Inspiration and Prophecy', he: 'בענין הרוח הקודש והנבואה' },
            { en: 'On the Prophetic Experience', he: 'במקרי הנבואה' },
            { en: "On Moshe's Unique Status", he: 'בהבדל שבין נבואת כל הנביאים למשה' },
          ],
        },
        {
          en: 'Part Four', he: 'חלק רביעי',
          subs: [
            { en: 'On Divine Service', he: 'בחלקי העבודה' },
            { en: 'On Torah Study', he: 'בתלמוד תורה' },
            { en: 'On Love and Fear of God', he: 'באהבה ויראה' },
            { en: "On the Sh'ma and Its Blessings", he: 'בק"ש וברכותיה' },
            { en: 'On Prayer', he: 'בתפלה' },
            { en: 'On the Daily Order of Prayer', he: 'בסדרי התפלות' },
            { en: 'On Divine Service and the Calendar', he: 'בעבודה הזמניית' },
            { en: 'On Seasonal Commandments', he: 'במצות הזמנים' },
            { en: 'On Blessings', he: 'בברכות' },
          ],
        },
      ];

      for (const part of parts) {
        for (const sub of part.subs) {
          const ref = `Derekh_Hashem,_${part.en.replace(/ /g, '_')},_${sub.en.replace(/ /g, '_')}`;
          sections.push({
            ref,
            label: `${part.en} - ${sub.en}`,
            heLabel: `${part.he} - ${sub.he}`,
            group: part.he,
          });
        }
      }

      return sections;
    },
  },
  {
    id: 'ramchal-daas-tevunos',
    slug: 'ramchal-daas-tevunos',
    title: "Da'as Tevunos",
    hebrewTitle: 'דעת תבונות',
    author: 'Ramchal (Rabbi Moshe Chaim Luzzatto)',
    hebrewAuthor: 'רמח"ל',
    sefariaName: "Da'at_Tevunot",
    type: 'simple-chapters', // depth 2: Chapter, Paragraph
    totalChapters: 195,
    fetchPlan: async () => {
      // 195 chapters
      const sections = [];
      for (let ch = 1; ch <= 195; ch++) {
        sections.push({
          ref: `Da'at_Tevunot.${ch}`,
          label: `Section ${ch}`,
          heLabel: `סימן ${ch}`,
          group: null,
        });
      }
      return sections;
    },
  },
  {
    id: 'ramchal-klach-pitchei-chochma',
    slug: 'ramchal-klach-pitchei-chochma',
    title: 'Klach Pitchei Chochma',
    hebrewTitle: 'קל"ח פתחי חכמה',
    author: 'Ramchal (Rabbi Moshe Chaim Luzzatto)',
    hebrewAuthor: 'רמח"ל',
    sefariaName: 'Kalach_Pitchei_Chokhmah',
    type: 'simple-chapters',
    totalChapters: 138,
    fetchPlan: async () => {
      const sections = [];
      for (let ch = 1; ch <= 138; ch++) {
        sections.push({
          ref: `Kalach_Pitchei_Chokhmah.${ch}`,
          label: `Opening ${ch}`,
          heLabel: `פתח ${ch}`,
          group: null,
        });
      }
      return sections;
    },
  },
  {
    id: 'ramchal-maamar-haikkarim',
    slug: 'ramchal-maamar-haikkarim',
    title: "Ma'amar HaIkkurim",
    hebrewTitle: 'מאמר העיקרים',
    author: 'Ramchal (Rabbi Moshe Chaim Luzzatto)',
    hebrewAuthor: 'רמח"ל',
    sefariaName: 'Essay_on_Fundamentals',
    type: 'simple-chapters',
    totalChapters: 10,
    fetchPlan: async () => {
      const sections = [];
      for (let ch = 1; ch <= 10; ch++) {
        sections.push({
          ref: `Essay_on_Fundamentals.${ch}`,
          label: `Chapter ${ch}`,
          heLabel: `פרק ${ch}`,
          group: null,
        });
      }
      return sections;
    },
  },
  {
    id: 'ramchal-derech-etz-chaim',
    slug: 'ramchal-derech-etz-chaim',
    title: 'Derech Etz Chaim',
    hebrewTitle: 'דרך עץ חיים',
    author: 'Ramchal (Rabbi Moshe Chaim Luzzatto)',
    hebrewAuthor: 'רמח"ל',
    sefariaName: 'Derech_Etz_Chayim_(Ramchal)',
    type: 'flat', // depth 1, paragraphs only
    fetchPlan: async () => {
      // Single flat text, 78 paragraphs, fetch as one unit
      return [{
        ref: 'Derech_Etz_Chayim_(Ramchal)',
        label: 'Derech Etz Chaim',
        heLabel: 'דרך עץ חיים',
        group: null,
        isFlat: true,
      }];
    },
  },
  {
    id: 'ramchal-asara-perakim',
    slug: 'ramchal-asara-perakim',
    title: 'Asarah Perakim',
    hebrewTitle: 'עשרה פרקים',
    author: 'Ramchal (Rabbi Moshe Chaim Luzzatto)',
    hebrewAuthor: 'רמח"ל',
    sefariaName: 'Asarah_Perakim_LeRamchal',
    type: 'simple-chapters',
    totalChapters: 10,
    fetchPlan: async () => {
      const sections = [];
      for (let ch = 1; ch <= 10; ch++) {
        sections.push({
          ref: `Asarah_Perakim_LeRamchal.${ch}`,
          label: `Chapter ${ch}`,
          heLabel: `פרק ${ch}`,
          group: null,
        });
      }
      return sections;
    },
  },
];

// ============================================================
// FETCH & CONVERT
// ============================================================

async function fetchSection(ref) {
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=bi&pad=0`;
  console.log(`  Fetching: ${ref}`);
  const data = await fetchJSON(url);
  await sleep(DELAY_MS);
  return data;
}

function buildSegments(data, isFlat = false) {
  const heArr = Array.isArray(data.he) ? data.he : [data.he].filter(Boolean);
  const enArr = Array.isArray(data.text) ? data.text : [data.text].filter(Boolean);

  const segments = [];
  const maxLen = Math.max(heArr.length, enArr.length);

  for (let i = 0; i < maxLen; i++) {
    const he = cleanHtml(heArr[i] || '');
    const en = cleanHtml(enArr[i] || '');
    if (he || en) {
      segments.push({
        index: i + 1,
        he: he,
        en: en,
      });
    }
  }
  return segments;
}

async function importBook(book) {
  console.log(`\n========================================`);
  console.log(`Importing: ${book.title} (${book.hebrewTitle})`);
  console.log(`========================================`);

  const bookDir = path.join(READER_DIR, book.slug, 'part-1');
  fs.mkdirSync(bookDir, { recursive: true });

  const sections = await book.fetchPlan();
  console.log(`  Found ${sections.length} sections to fetch`);

  const indexItems = [];
  let totalSegments = 0;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const num = i + 1;

    try {
      const data = await fetchSection(section.ref);
      const segments = buildSegments(data, section.isFlat);

      if (segments.length === 0) {
        console.log(`    WARNING: No segments for ${section.ref}`);
        failCount++;
        continue;
      }

      totalSegments += segments.length;
      successCount++;

      // Navigation URLs
      const prevUrl = num > 1 ? `/reader/${book.slug}/1/${num - 1}` : null;
      const nextUrl = num < sections.length ? `/reader/${book.slug}/1/${num + 1}` : null;

      const torahData = {
        id: `${book.id}-${num}`,
        title: `${book.title} - ${section.label}`,
        hebrewTitle: section.heLabel,
        displayNumber: String(num),
        ...(section.group ? { group: section.group } : {}),
        segments: segments,
        navigation: {
          prevUrl: prevUrl,
          nextUrl: nextUrl,
        },
      };

      const filePath = path.join(bookDir, `torah-${num}.json`);
      fs.writeFileSync(filePath, JSON.stringify(torahData, null, 2), 'utf8');

      indexItems.push({
        number: num,
        displayNumber: String(num),
        title: `${book.title} - ${section.label}`,
        hebrewTitle: section.heLabel,
        ...(section.group ? { group: section.group } : {}),
      });

      if (num % 10 === 0 || num === sections.length) {
        console.log(`  Progress: ${num}/${sections.length} sections fetched`);
      }
    } catch (err) {
      console.log(`    ERROR fetching ${section.ref}: ${err.message}`);
      failCount++;
    }
  }

  // Write index.json
  const indexData = {
    bookId: book.id,
    title: book.title,
    hebrewTitle: book.hebrewTitle,
    totalItems: indexItems.length,
    itemType: 'section',
    items: indexItems,
  };

  fs.writeFileSync(path.join(bookDir, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');

  console.log(`\n  RESULT for ${book.title}:`);
  console.log(`    Sections imported: ${successCount}`);
  console.log(`    Sections failed: ${failCount}`);
  console.log(`    Total segments: ${totalSegments}`);

  return {
    id: book.id,
    title: book.title,
    hebrewTitle: book.hebrewTitle,
    author: book.author,
    hebrewAuthor: book.hebrewAuthor,
    category: 'ramchal',
    parts: [{
      part: 1,
      title: book.title,
      hebrewTitle: book.hebrewTitle,
      totalTorahs: indexItems.length,
      indexUrl: `/reader/${book.slug}/index.json`,
    }],
    hasEnglish: true,
    totalSegments: totalSegments,
    successCount,
    failCount,
  };
}

// ============================================================
// ASTRO ROUTE GENERATOR
// ============================================================

function generateAstroRoute(bookId, totalItems, bookTitle, bookHeTitle, authorName) {
  // Use single quotes and string concat to avoid template literal conflicts
  const BT = '`'; // backtick char
  return [
    '---',
    "import Layout from '../../../../layouts/Layout.astro';",
    "import '../../../../styles/reader.css';",
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    '',
    'export function getStaticPaths() {',
    '  const paths = [];',
    '  for (let torah = 1; torah <= ' + totalItems + '; torah++) {',
    "    paths.push({ params: { part: '1', torah: String(torah) } });",
    '  }',
    '  return paths;',
    '}',
    '',
    'const { part, torah } = Astro.params;',
    'const partNum = parseInt(part);',
    'const torahNum = parseInt(torah);',
    '',
    'let torahData = null;',
    'let error = null;',
    '',
    'try {',
    '  const filePath = path.join(process.cwd(), ' + BT + 'public/reader/' + bookId + '/part-${partNum}/torah-${torahNum}.json' + BT + ');',
    "  const raw = fs.readFileSync(filePath, 'utf8');",
    '  torahData = JSON.parse(raw);',
    '} catch (e) {',
    '  error = ' + BT + 'Section ${torahNum} not found' + BT + ';',
    '}',
    '',
    "if (!torahData && !error) error = 'Content not available';",
    '',
    'const pageTitle = torahData',
    '  ? ' + BT + '${torahData.hebrewTitle || torahData.title} - ' + bookTitle + BT,
    "  : 'Section Not Found';",
    'const pageDesc = torahData',
    '  ? (() => {',
    "    const snippet = (torahData.segments?.find(s => s.en)?.en || '').replace(/<[^>]+>/g, '').slice(0, 120);",
    '    return ' + BT + 'Read ${torahData.title} from ' + bookTitle + ' online free. ${snippet ? snippet + "..." : "Hebrew text with English translation on ajew.org."}' + BT + ';',
    '  })()',
    "  : '';",
    '',
    'const structuredData = torahData ? JSON.stringify({',
    '  "@context": "https://schema.org",',
    '  "@type": "Article",',
    '  "headline": ' + BT + '${torahData.title}' + BT + ',',
    "  \"alternativeHeadline\": torahData.hebrewTitle || '',",
    '  "author": { "@type": "Person", "name": "' + authorName + '" },',
    '  "publisher": { "@type": "Organization", "name": "ajew.org" },',
    '  "inLanguage": ["he", "en"],',
    '  "isPartOf": { "@type": "Book", "name": "' + bookTitle + '" },',
    '  "url": ' + BT + 'https://ajew.org/reader/' + bookId + '/${partNum}/${torahNum}' + BT,
    "}) : '';",
    'const breadcrumbData = torahData ? JSON.stringify({',
    '  "@context": "https://schema.org",',
    '  "@type": "BreadcrumbList",',
    '  "itemListElement": [',
    '    { "@type": "ListItem", "position": 1, "name": "Library", "item": "https://ajew.org/reader" },',
    '    { "@type": "ListItem", "position": 2, "name": "' + bookTitle + '", "item": ' + BT + 'https://ajew.org/reader#' + bookId + BT + ' },',
    '    { "@type": "ListItem", "position": 3, "name": torahData.hebrewTitle || torahData.title }',
    '  ]',
    "}) : '';",
    '---',
    '',
    '<Layout title={pageTitle} description={pageDesc}>',
    '  {torahData && structuredData && (',
    '    <script type="application/ld+json" set:html={structuredData} slot="head" />',
    '  )}',
    '  {torahData && breadcrumbData && (',
    '    <script type="application/ld+json" set:html={breadcrumbData} slot="head" />',
    '  )}',
    '  {error ? (',
    '    <div style="text-align: center; padding: 80px 20px;">',
    '      <h1>{error}</h1>',
    '      <p><a href="/reader">Back to Reader</a></p>',
    '    </div>',
    '  ) : (',
    '    <div',
    '      class="reader-container"',
    '      data-torah-id={torahData.id}',
    '      data-torah-title={' + BT + '${torahData.title}' + BT + '}',
    '    >',
    '      <div class="reader-progress"></div>',
    '',
    '      <div class="reader-breadcrumb">',
    '        <a href="/reader">Reader</a>',
    '        <span>&rsaquo;</span>',
    '        <a href="/reader">' + bookTitle + '</a>',
    '        <span>&rsaquo;</span>',
    '        {torahData.hebrewTitle || torahData.title}',
    '      </div>',
    '',
    '      <div class="reader-toolbar">',
    '        <div class="reader-toolbar-group">',
    '          <button class="reader-btn" data-mode="hebrew">Hebrew</button>',
    '          <button class="reader-btn" data-mode="english">English</button>',
    '          <button class="reader-btn" data-mode="both">Both</button>',
    '        </div>',
    '        <div class="reader-toolbar-group">',
    '          <span style="font-size:0.7em; font-family: \'Open Sans\', sans-serif; color: var(--reader-text-secondary);">A</span>',
    '          <input type="range" id="font-size-slider" class="font-size-slider" min="12" max="32" value="18" />',
    '          <span style="font-size:0.9em; font-family: \'Open Sans\', sans-serif; color: var(--reader-text-secondary);">A</span>',
    '        </div>',
    '        <div class="reader-toolbar-group">',
    '          <button class="reader-btn reader-btn-icon" data-theme-btn="day">Day</button>',
    '          <button class="reader-btn reader-btn-icon" data-theme-btn="sepia">Sepia</button>',
    '          <button class="reader-btn reader-btn-icon" data-theme-btn="night">Night</button>',
    '        </div>',
    '        <div class="reader-toolbar-group">',
    '          <button class="reader-btn reader-btn-icon" id="btn-listen">Listen</button>',
    '          <button class="reader-btn reader-btn-icon" id="btn-search">Search</button>',
    '          <button class="reader-btn reader-btn-icon" id="btn-bookmark">Bookmark</button>',
    '          <button class="reader-btn reader-btn-icon" id="btn-fullscreen">Fullscreen</button>',
    '        </div>',
    '      </div>',
    '',
    '      <div class="reader-search-bar">',
    '        <input type="text" placeholder="Search in this section..." dir="auto" />',
    '        <span class="search-info"></span>',
    '        <button class="reader-btn search-close">Close</button>',
    '      </div>',
    '',
    '      <button class="reader-toc-toggle" title="Table of Contents">&#9776;</button>',
    '      <div class="reader-toc">',
    '        <button class="reader-toc-close">&times;</button>',
    '        <h3>Sections</h3>',
    '        <ul class="reader-toc-list">',
    '          {torahData.segments.map((seg, i) => (',
    '            <li><a href={' + BT + '#seg-${seg.index}' + BT + '} data-index={String(seg.index)}>{seg.index}</a></li>',
    '          ))}',
    '        </ul>',
    '      </div>',
    '',
    '      <div class="reader-header">',
    '        {torahData.group && <div style="color: var(--reader-text-secondary); font-size: 0.85em; margin-bottom: 4px;">{torahData.group}</div>}',
    '        {torahData.hebrewTitle && <div class="hebrew-title">{torahData.hebrewTitle}</div>}',
    '        <h1>{torahData.title}</h1>',
    '        <p style="color: var(--reader-text-secondary); font-size: 0.9em; font-family: \'Open Sans\', sans-serif;">',
    '          ' + bookHeTitle + ' / ' + bookTitle,
    '        </p>',
    '      </div>',
    '',
    '      <div class="reader-nav">',
    '        {torahData.navigation.prevUrl ? (',
    '          <a href={torahData.navigation.prevUrl} data-dir="prev">&larr; Previous</a>',
    '        ) : <span class="disabled">&larr; Previous</span>}',
    '        <a href="/reader">All Books</a>',
    '        {torahData.navigation.nextUrl ? (',
    '          <a href={torahData.navigation.nextUrl} data-dir="next">Next &rarr;</a>',
    '        ) : <span class="disabled">Next &rarr;</span>}',
    '      </div>',
    '',
    '      <div class="reader-content mode-both">',
    '        {torahData.segments.map((seg) => (',
    '          <div class="reader-segment-pair" id={' + BT + 'seg-${seg.index}' + BT + '}>',
    '            <div class="reader-segment segment-he" data-index={String(seg.index)}>',
    '              <span class="segment-number">{seg.index}</span>',
    '              <p>{seg.he}</p>',
    '            </div>',
    '            <div class={' + BT + 'reader-segment segment-en ${!seg.en ? "empty-translation" : ""}' + BT + '} data-index={String(seg.index)}>',
    '              <span class="segment-number">{seg.index}</span>',
    '              <p>{seg.en || "Translation not yet available"}</p>',
    '            </div>',
    '          </div>',
    '        ))}',
    '      </div>',
    '',
    '      <div class="reader-nav">',
    '        {torahData.navigation.prevUrl ? (',
    '          <a href={torahData.navigation.prevUrl} data-dir="prev">&larr; Previous</a>',
    '        ) : <span class="disabled">&larr; Previous</span>}',
    '        <a href="/reader">All Books</a>',
    '        {torahData.navigation.nextUrl ? (',
    '          <a href={torahData.navigation.nextUrl} data-dir="next">Next &rarr;</a>',
    '        ) : <span class="disabled">Next &rarr;</span>}',
    '      </div>',
    '',
    '      <script src="/reader-script.js" is:inline></script>',
    '    </div>',
    '  )}',
    '</Layout>',
  ].join('\n');
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('Starting Ramchal text import from Sefaria...\n');

  const results = [];

  for (const book of BOOKS) {
    try {
      const result = await importBook(book);
      results.push(result);
    } catch (err) {
      console.error(`\nFATAL ERROR importing ${book.title}: ${err.message}`);
      console.error(err.stack);
    }
  }

  // Summary
  console.log('\n\n========================================');
  console.log('IMPORT SUMMARY');
  console.log('========================================');
  for (const r of results) {
    console.log(`  ${r.title}: ${r.successCount} sections, ${r.totalSegments} segments${r.failCount > 0 ? `, ${r.failCount} failed` : ''}`);
  }

  // ==========================================
  // UPDATE CATALOG.JSON
  // ==========================================
  console.log('\nUpdating catalog.json...');
  const catalogPath = path.join(READER_DIR, 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  // Remove any existing ramchal entries
  catalog.books = catalog.books.filter(b => !b.id.startsWith('ramchal-'));

  // Add new entries
  for (const r of results) {
    catalog.books.push({
      id: r.id,
      title: r.title,
      hebrewTitle: r.hebrewTitle,
      author: r.author,
      hebrewAuthor: r.hebrewAuthor,
      category: 'ramchal',
      parts: r.parts,
      hasEnglish: r.hasEnglish,
      totalSegments: r.totalSegments,
    });
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log('  catalog.json updated with Ramchal books');

  // ==========================================
  // GENERATE ASTRO ROUTE FILES
  // ==========================================
  console.log('\nGenerating Astro route files...');
  const PAGES_DIR = path.join(PROJECT_ROOT, 'src', 'pages', 'reader');

  for (const r of results) {
    const routeDir = path.join(PAGES_DIR, r.id, '[part]');
    fs.mkdirSync(routeDir, { recursive: true });

    const totalItems = r.parts[0].totalTorahs;
    const bookTitle = r.title;
    const bookHeTitle = r.hebrewTitle;
    const authorName = r.author;

    const astroContent = generateAstroRoute(r.id, totalItems, bookTitle, bookHeTitle, authorName);

    fs.writeFileSync(path.join(routeDir, '[torah].astro'), astroContent, 'utf8');
    console.log('  Created route: src/pages/reader/' + r.id + '/[part]/[torah].astro');
  }

  // Write results summary
  const resultsPath = path.join(PROJECT_ROOT, 'scripts', 'ramchal-import-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results.map(r => ({
    id: r.id,
    title: r.title,
    hebrewTitle: r.hebrewTitle,
    author: r.author,
    hebrewAuthor: r.hebrewAuthor,
    category: r.category,
    parts: r.parts,
    hasEnglish: r.hasEnglish,
    totalSegments: r.totalSegments,
  })), null, 2), 'utf8');

  console.log('\nResults saved to ' + resultsPath);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
