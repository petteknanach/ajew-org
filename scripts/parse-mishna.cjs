/**
 * Parse Mishna source files into ajew.org reader JSON format.
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Books/020_MISHNA/
 * Uses _L1.txt files (cleanest text), ISO-8859-8 / CP1255 encoded.
 *
 * Structure: 6 Sedarim, 63 Masekhtot, each with Perakim and Mishnayot.
 * Also updates catalog.json and generates Astro route pages.
 */
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const MISHNA_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Books/020_MISHNA';
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const READER_DIR = path.join(PUBLIC, 'reader');
const CATALOG_PATH = path.join(READER_DIR, 'catalog.json');

// ─── Seder + Tractate Definitions ───
const SEDARIM = [
  {
    folder: '100_SEDER_ZRAIM', seder: 'Zeraim', sederHe: 'זרעים',
    tractates: [
      { folder: '01_MAS_BRACHOT',     slug: 'brachot',     he: 'ברכות',         en: 'Brachot' },
      { folder: '02_MAS_PEA',         slug: 'peah',        he: 'פאה',           en: 'Peah' },
      { folder: '03_MAS_DEMAI',       slug: 'demai',       he: 'דמאי',          en: 'Demai' },
      { folder: '04_MAS_KILAIIM',     slug: 'kilayim',     he: 'כלאים',         en: 'Kilayim' },
      { folder: '05_MAS_SHEVIIT',     slug: 'sheviit',     he: 'שביעית',        en: 'Sheviit' },
      { folder: '06_MAS_TRUMOT',      slug: 'terumot',     he: 'תרומות',        en: 'Terumot' },
      { folder: '07_MAS_MAASROT',     slug: 'maasrot',     he: 'מעשרות',        en: 'Maasrot' },
      { folder: '08_MAS_MAASER_SHENI',slug: 'maaser-sheni',he: 'מעשר שני',     en: 'Maaser Sheni' },
      { folder: '09_MAS_CHALA',       slug: 'challah',     he: 'חלה',           en: 'Challah' },
      { folder: '10_MAS_ORLA',        slug: 'orlah',       he: 'ערלה',          en: 'Orlah' },
      { folder: '11_MAS_BIKURIM',     slug: 'bikkurim',    he: 'ביכורים',       en: 'Bikkurim' },
    ]
  },
  {
    folder: '101_SEDER_MOED', seder: 'Moed', sederHe: 'מועד',
    tractates: [
      { folder: '12_MAS_SHABAT',      slug: 'shabbat',     he: 'שבת',           en: 'Shabbat' },
      { folder: '13_MAS_ERUVIN',      slug: 'eruvin',      he: 'עירובין',        en: 'Eruvin' },
      { folder: '14_MAS_PSACHIM',     slug: 'pesachim',    he: 'פסחים',         en: 'Pesachim' },
      { folder: '15_MAS_SHKALIM',     slug: 'shekalim',    he: 'שקלים',         en: 'Shekalim' },
      { folder: '16_MAS_YOMA',        slug: 'yoma',        he: 'יומא',           en: 'Yoma' },
      { folder: '17_MAS_SUCA',        slug: 'sukkah',      he: 'סוכה',           en: 'Sukkah' },
      { folder: '18_MAS_BEITSA',      slug: 'beitzah',     he: 'ביצה',           en: 'Beitzah' },
      { folder: '19_MAS_ROSH',        slug: 'rosh-hashana', he: 'ראש השנה',     en: 'Rosh Hashana' },
      { folder: '20_MAS_TAANIT',      slug: 'taanit',      he: 'תענית',          en: 'Taanit' },
      { folder: '21_MAS_MEGILA',      slug: 'megillah',    he: 'מגילה',          en: 'Megillah' },
      { folder: '22_MAS_MOED_KATAN',  slug: 'moed-katan',  he: 'מועד קטן',      en: 'Moed Katan' },
      { folder: '23_MAS_HAGIGA',      slug: 'chagigah',    he: 'חגיגה',          en: 'Chagigah' },
    ]
  },
  {
    folder: '102_SEDER_NASHIM', seder: 'Nashim', sederHe: 'נשים',
    tractates: [
      { folder: '24_MAS_YEVAMOT',     slug: 'yevamot',     he: 'יבמות',          en: 'Yevamot' },
      { folder: '25_MAS_KTUBOT',      slug: 'ketubot',     he: 'כתובות',         en: 'Ketubot' },
      { folder: '26_MAS_NEDARIM',     slug: 'nedarim',     he: 'נדרים',          en: 'Nedarim' },
      { folder: '27_MAS_NAZIR',       slug: 'nazir',       he: 'נזיר',           en: 'Nazir' },
      { folder: '28_MAS_SOTA',        slug: 'sotah',       he: 'סוטה',           en: 'Sotah' },
      { folder: '29_MAS_GITIN',       slug: 'gittin',      he: 'גיטין',          en: 'Gittin' },
      { folder: '30_MAS_KIDUSHIN',    slug: 'kiddushin',   he: 'קידושין',        en: 'Kiddushin' },
    ]
  },
  {
    folder: '103_SEDER_NEZIKIN', seder: 'Nezikin', sederHe: 'נזיקין',
    tractates: [
      { folder: '31_MAS_KAMA',        slug: 'bava-kamma',  he: 'בבא קמא',       en: 'Bava Kamma' },
      { folder: '32_MAS_METSIA',      slug: 'bava-metzia', he: 'בבא מציעא',     en: 'Bava Metzia' },
      { folder: '33_MAS_BATRA',       slug: 'bava-batra',  he: 'בבא בתרא',      en: 'Bava Batra' },
      { folder: '34_MAS_SANHEDRIN',   slug: 'sanhedrin',   he: 'סנהדרין',        en: 'Sanhedrin' },
      { folder: '35_MAS_MAKOT',       slug: 'makkot',      he: 'מכות',           en: 'Makkot' },
      { folder: '36_MAS_SHVUOT',      slug: 'shevuot',     he: 'שבועות',         en: 'Shevuot' },
      { folder: '37_MAS_EDUYOT',      slug: 'eduyot',      he: 'עדיות',          en: 'Eduyot' },
      { folder: '38_MAS_AVODA_ZARA',  slug: 'avodah-zarah',he: 'עבודה זרה',     en: 'Avodah Zarah' },
      { folder: '39_MAS_AVOT',        slug: 'avot',        he: 'אבות',           en: 'Avot' },
      { folder: '40_MAS_HORAYOT',     slug: 'horayot',     he: 'הוריות',         en: 'Horayot' },
    ]
  },
  {
    folder: '104_SEDER_KADASHIM', seder: 'Kodashim', sederHe: 'קדשים',
    tractates: [
      { folder: '41_MAS_ZEVACHIM',    slug: 'zevachim',    he: 'זבחים',          en: 'Zevachim' },
      { folder: '42_MAS_MENACHOT',    slug: 'menachot',    he: 'מנחות',          en: 'Menachot' },
      { folder: '43_MAS_CHULIN',      slug: 'chulin',      he: 'חולין',          en: 'Chulin' },
      { folder: '44_MAS_BECHOROT',    slug: 'bechorot',    he: 'בכורות',         en: 'Bechorot' },
      { folder: '45_MAS_ARACHIN',     slug: 'arachin',     he: 'ערכין',          en: 'Arachin' },
      { folder: '46_MAS_TEMURA',      slug: 'temurah',     he: 'תמורה',          en: 'Temurah' },
      { folder: '47_MAS_KRETOT',      slug: 'keritot',     he: 'כריתות',         en: 'Keritot' },
      { folder: '48_MAS_MEILA',       slug: 'meilah',      he: 'מעילה',          en: 'Meilah' },
      { folder: '49_MAS_TAMID',       slug: 'tamid',       he: 'תמיד',           en: 'Tamid' },
      { folder: '50_MAS_MIDOT',       slug: 'middot',      he: 'מידות',          en: 'Middot' },
      { folder: '51_MAS_KINIM',       slug: 'kinnim',      he: 'קינים',          en: 'Kinnim' },
    ]
  },
  {
    folder: '105_SEDER_TAHAROT', seder: 'Taharot', sederHe: 'טהרות',
    tractates: [
      { folder: '52_MAS_KELIM',       slug: 'kelim',       he: 'כלים',           en: 'Kelim' },
      { folder: '53_MAS_OHALOT',      slug: 'ohalot',      he: 'אהלות',          en: 'Ohalot' },
      { folder: '54_MAS_NEGAIM',      slug: 'negaim',      he: 'נגעים',          en: 'נגעים' },
      { folder: '55_MAS_PARA',        slug: 'parah',       he: 'פרה',            en: 'Parah' },
      { folder: '56_MAS_TAHAROT',     slug: 'taharot',     he: 'טהרות',          en: 'Taharot' },
      { folder: '57_MAS_MIKVAOT',     slug: 'mikvaot',     he: 'מקוואות',        en: 'Mikvaot' },
      { folder: '58_MAS_NIDA',        slug: 'niddah',      he: 'נידה',           en: 'Niddah' },
      { folder: '59_MAS_MACHSHIRIN',  slug: 'machshirin',  he: 'מכשירין',        en: 'Machshirin' },
      { folder: '60_MAS_ZAVIM',       slug: 'zavim',       he: 'זבים',           en: 'Zavim' },
      { folder: '61_MAS_TVUL_YOM',    slug: 'tevul-yom',   he: 'טבול יום',      en: 'Tevul Yom' },
      { folder: '62_MAS_YADAIM',      slug: 'yadayim',     he: 'ידיים',          en: 'Yadayim' },
      { folder: '63_MAS_UKTZIN',      slug: 'uktzin',      he: 'עוקצין',         en: 'Uktzin' },
    ]
  },
];

// ─── Text Cleaning ───
function cleanText(text) {
  text = text.replace(/<!--[^>]*?-->/g, '');
  text = text.replace(/<\/?[^>]+>/g, '');
  text = text.replace(/\{~\d+~\}/g, '');
  text = text.replace(/\{[^}]*\}/g, ''); // Remove source references
  text = text.replace(/\[\[([^\]]*)\]\]/g, '$1');
  text = text.replace(/  +/g, ' ');
  return text.trim();
}

// ─── Parse L1 File ───
function parseL1File(filePath) {
  const buf = fs.readFileSync(filePath);
  // Try cp1255 first, fall back to iso88598
  let text;
  try {
    text = iconv.decode(buf, 'cp1255');
    // Verify we got Hebrew characters
    if (!/[\u0590-\u05FF]/.test(text)) {
      text = iconv.decode(buf, 'iso88598');
    }
  } catch (e) {
    text = iconv.decode(buf, 'iso88598');
  }

  const lines = text.split('\n');
  const sections = []; // { perek, mishna, rawText }
  let currentPerek = '';
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('&') || trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('$ ')) continue;

    // Perek marker: ^ פרק א
    if (trimmed.startsWith('^ ')) {
      currentPerek = trimmed.substring(2).trim();
      continue;
    }

    // Mishna marker: ~ פרק א - משנה א
    if (trimmed.startsWith('~ ')) {
      if (currentSection) sections.push(currentSection);
      const label = trimmed.substring(2).trim();
      currentSection = {
        perek: currentPerek,
        label: label,
        rawText: ''
      };
      continue;
    }

    // Content
    if (currentSection) {
      currentSection.rawText += (currentSection.rawText ? ' ' : '') + trimmed;
    }
  }

  if (currentSection) sections.push(currentSection);
  return sections;
}

// ─── Build JSON for a section ───
function buildSectionJson(tractate, section, seqNum, totalSections, seder) {
  const cleaned = cleanText(section.rawText);
  if (!cleaned) return null;

  const readerSlug = `mishna-${tractate.slug}`;

  // Split into segments at sentence boundaries (~300 chars)
  const segments = [];
  if (cleaned.length <= 500) {
    segments.push(cleaned);
  } else {
    let remaining = cleaned;
    while (remaining.length > 500) {
      let breakIdx = -1;
      for (let i = 400; i >= 150; i--) {
        if (remaining[i] === ':' || remaining[i] === '.' || remaining[i] === '׃') {
          breakIdx = i + 1;
          break;
        }
      }
      if (breakIdx === -1) {
        for (let i = 450; i >= 150; i--) {
          if (remaining[i] === ' ') { breakIdx = i + 1; break; }
        }
      }
      if (breakIdx === -1) breakIdx = 400;
      segments.push(remaining.substring(0, breakIdx).trim());
      remaining = remaining.substring(breakIdx).trim();
    }
    if (remaining.trim()) segments.push(remaining.trim());
  }

  const prevUrl = seqNum > 1 ? `/reader/${readerSlug}/part-1/${seqNum - 1}` : null;
  const nextUrl = seqNum < totalSections ? `/reader/${readerSlug}/part-1/${seqNum + 1}` : null;

  return {
    id: `${readerSlug}-${seqNum}`,
    title: `${tractate.en} - ${section.label}`,
    hebrewTitle: `${tractate.he} - ${section.label}`,
    displayNumber: String(seqNum),
    perek: section.perek || '',
    segments: segments.map((text, i) => ({
      index: i + 1,
      he: text,
      he_nikud: text,
      en: ''
    })),
    navigation: { prevUrl, nextUrl }
  };
}

// ─── Find L1 file ───
function findL1File(folderPath) {
  if (!fs.existsSync(folderPath)) return null;
  const files = fs.readdirSync(folderPath);
  const l1 = files.find(f => f.endsWith('_L1.txt'));
  return l1 ? path.join(folderPath, l1) : null;
}

// ─── Route Template ───
function generateRouteTemplate(tractate, readerSlug, sectionCount, seder) {
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
  error = \`Mishna \${torahNum} not found\`;
}

if (!torahData && !error) error = 'Content not available';

const bookName = 'Mishna - ${tractate.en}';
const bookHebrew = 'משנה - ${tractate.he}';

const pageTitle = torahData
  ? \`\${torahData.hebrewTitle || torahData.title} - Mishna\`
  : 'Mishna Not Found';
const pageDesc = torahData
  ? \`Read \${torahData.title} from Mishna ${tractate.en}\`
  : '';

const structuredData = torahData ? JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": \`\${torahData.title} - Mishna\`,
  "alternativeHeadline": torahData.hebrewTitle || '',
  "author": { "@type": "Organization", "name": "Mishna" },
  "publisher": { "@type": "Organization", "name": "ajew.org" },
  "inLanguage": ["he"],
  "isPartOf": { "@type": "Book", "name": "Mishna - ${tractate.en}" },
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
      data-torah-title={\`\${torahData.title} - Mishna\`}
    >
      <div class="reader-progress"></div>

      <div class="reader-breadcrumb">
        <a href="/reader">Reader</a>
        <span>&rsaquo;</span>
        <a href="/reader">${tractate.en}</a>
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
        <input type="text" placeholder="Search in this mishna..." dir="auto" />
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
          משנה - ${tractate.he} / Mishna - ${tractate.en}
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

// ─── Main ───
function main() {
  console.log('=== Mishna Parser ===\n');

  const catalogEntries = [];
  let totalSectionsParsed = 0;
  let totalSegments = 0;
  const tractateStats = [];

  for (const seder of SEDARIM) {
    console.log(`\n--- Seder ${seder.seder} (${seder.sederHe}) ---`);

    for (const tractate of seder.tractates) {
      const folderPath = path.join(MISHNA_DIR, seder.folder, tractate.folder);
      const l1Path = findL1File(folderPath);

      if (!l1Path) {
        console.log(`  SKIP: ${tractate.en} - no L1 file`);
        continue;
      }

      console.log(`  Parsing: ${tractate.en} (${tractate.he})`);

      const sections = parseL1File(l1Path);
      if (sections.length === 0) {
        console.log(`    WARNING: No sections found!`);
        continue;
      }

      const readerSlug = `mishna-${tractate.slug}`;
      const outDir = path.join(READER_DIR, readerSlug, 'part-1');
      fs.mkdirSync(outDir, { recursive: true });

      const indexEntries = [];
      let count = 0;

      for (let i = 0; i < sections.length; i++) {
        const seqNum = i + 1;
        const json = buildSectionJson(tractate, sections[i], seqNum, sections.length, seder);
        if (!json) continue;

        fs.writeFileSync(path.join(outDir, `torah-${seqNum}.json`), JSON.stringify(json, null, 2), 'utf8');
        count++;
        totalSegments += json.segments.length;

        indexEntries.push({
          number: seqNum,
          displayNumber: json.displayNumber,
          title: json.title,
          hebrewTitle: json.hebrewTitle,
          perek: json.perek || ''
        });
      }

      // Write index
      const indexJson = {
        bookId: readerSlug,
        title: `Mishna - ${tractate.en}`,
        hebrewTitle: `משנה - ${tractate.he}`,
        totalItems: count,
        itemType: 'mishna',
        items: indexEntries
      };
      fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');

      totalSectionsParsed += count;
      tractateStats.push({ name: tractate.en, he: tractate.he, count, slug: tractate.slug, seder: seder.seder });

      catalogEntries.push({
        id: readerSlug,
        title: `Mishna - ${tractate.en}`,
        hebrewTitle: `משנה - ${tractate.he}`,
        author: `Mishna - ${seder.seder}`,
        hebrewAuthor: `משנה - ${seder.sederHe}`,
        parts: [{
          part: 1,
          title: tractate.en,
          hebrewTitle: tractate.he,
          totalTorahs: count,
          indexUrl: `/reader/${readerSlug}/part-1/index.json`
        }]
      });

      console.log(`    -> ${count} mishnayot written`);

      // Generate route
      const routeDir = path.join(ROOT, 'src/pages/reader', readerSlug, '[part]');
      fs.mkdirSync(routeDir, { recursive: true });
      const routeContent = generateRouteTemplate(tractate, readerSlug, count, seder);
      fs.writeFileSync(path.join(routeDir, '[torah].astro'), routeContent, 'utf8');
    }
  }

  // Update catalog.json
  console.log('\nUpdating catalog.json...');
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  catalog.books = catalog.books.filter(b => !b.id.startsWith('mishna-'));
  catalog.books.push(...catalogEntries);
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`  Added ${catalogEntries.length} tractates to catalog.json`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Tractates parsed: ${tractateStats.length}`);
  console.log(`Total mishnayot: ${totalSectionsParsed}`);
  console.log(`Total segments: ${totalSegments}`);
  console.log('\nPer seder:');
  const sedarimNames = [...new Set(tractateStats.map(t => t.seder))];
  for (const s of sedarimNames) {
    const ts = tractateStats.filter(t => t.seder === s);
    const total = ts.reduce((a, b) => a + b.count, 0);
    console.log(`  ${s}: ${ts.length} tractates, ${total} mishnayot`);
    ts.forEach(t => console.log(`    ${t.name.padEnd(18)} (${t.he.padEnd(10)}) : ${t.count} pages`));
  }
}

main();
