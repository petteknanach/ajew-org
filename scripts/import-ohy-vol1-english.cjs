/**
 * Import English translations for Otzar HaYirah Volume 1 (Aleph-Dalet)
 *
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 1/
 * Target: public/reader/otzar-hayirah/part-1/
 *
 * Creates new torah-N.json files (starting from 37) for Volume 1 topics.
 * Each topic becomes one JSON file. Multi-file topics (Emunah, Acheela) are merged.
 *
 * Usage:
 *   node scripts/import-ohy-vol1-english.cjs
 *   node scripts/import-ohy-vol1-english.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar volume 1';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'otzar-hayirah', 'part-1');

const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
// HTML Parsing Helpers
// ============================================================

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&middot;/g, '\u00B7')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract paragraphs from "oatzar" style HTML (para-num spans)
 * Used by: Emes, Emunah batches, Eretz Yisrael, Din Torah
 */
function extractParaNumEntries(html) {
  const entries = [];
  // Split by para-num markers
  const parts = html.split(/<span\s+class="para-num">/i);
  parts.shift(); // discard before first entry

  for (const part of parts) {
    // Get the number
    const numMatch = part.match(/^(\d+)\.\s*<\/span>/);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1]);

    // Get the text content - everything from after the para-num to the end of the para div
    // Find the para-text content or just take everything
    let textHtml = part;
    // Remove the number part
    textHtml = textHtml.replace(/^\d+\.\s*<\/span>/, '');
    // Try to get just the para-text span content
    const paraTextMatch = textHtml.match(/<span\s+class="para-text">([\s\S]*?)(?:<\/span>\s*<\/div>|$)/i);
    if (paraTextMatch) {
      textHtml = paraTextMatch[1];
    } else {
      // Take everything up to the next closing div
      const divEnd = textHtml.indexOf('</div>');
      if (divEnd !== -1) textHtml = textHtml.substring(0, divEnd);
    }

    const text = stripHtml(textHtml).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) {
      entries.push({ index: num, text });
    }
  }
  return entries;
}

/**
 * Extract entries from "treasury/entry" style HTML (entry-number divs)
 * Used by: Acheela, Hachnosas Orchim, Ohr vChoshech, Bris, Banim, etc.
 */
function extractEntryNumEntries(html) {
  const entries = [];
  // Split by entry markers
  const parts = html.split(/<div\s+class="entry"[^>]*>/i);
  parts.shift(); // discard before first entry

  for (const part of parts) {
    // Get the entry number
    const numMatch = part.match(/<div\s+class="entry-number">(\d+)<\/div>/i);
    if (!numMatch) continue;
    const num = parseInt(numMatch[1]);

    // Get all text content after the entry-number, excluding translator summary
    let textHtml = part.replace(/<div\s+class="entry-number">\d+<\/div>/i, '');
    // Cut at next entry or end
    const nextEntry = textHtml.indexOf('<div class="entry"');
    if (nextEntry !== -1) textHtml = textHtml.substring(0, nextEntry);
    // Remove translator summary if present
    const summaryIdx = textHtml.indexOf('Translator\'s Summary');
    if (summaryIdx !== -1) textHtml = textHtml.substring(0, summaryIdx);
    // Remove closing divs at the end
    textHtml = textHtml.replace(/<\/div>\s*$/, '');

    const text = stripHtml(textHtml).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) {
      entries.push({ index: num, text });
    }
  }
  return entries;
}

/**
 * Extract entries from "subtitle" style HTML (h2 subtitle header + entry divs)
 * Used by: Bris, Komat Adam, Banim, Bitochen, Bushah, Bitul, Bechiyah, etc.
 */
function extractSubtitleEntries(html) {
  // First try entry-number divs
  let entries = extractEntryNumEntries(html);
  if (entries.length > 0) return entries;

  // Then try para-num style
  entries = extractParaNumEntries(html);
  return entries;
}

/**
 * Split the hachnosas_orchim file into two topics
 */
function splitHachnosasFile(html) {
  const topics = {};

  // Split at the section break / second h2
  const parts = html.split(/<hr\s+class="section-break">/i);
  if (parts.length >= 2) {
    topics.hachnosas_orchim = parts[0];
    topics.ohr_vachoshech = parts.slice(1).join('');
  } else {
    // Try splitting by h2 chapter headers
    const h2Parts = html.split(/<h2\s+class="chapter">/i);
    if (h2Parts.length >= 3) {
      topics.hachnosas_orchim = h2Parts[0] + '<h2 class="chapter">' + h2Parts[1];
      topics.ohr_vachoshech = '<h2 class="chapter">' + h2Parts.slice(2).join('');
    } else {
      topics.hachnosas_orchim = html;
    }
  }

  return topics;
}

// ============================================================
// Topic Definitions - Volume 1 (Aleph through Dalet)
// ============================================================

const TOPICS = [
  {
    id: 'emes',
    title: 'Emes (Truth)',
    hebrewTitle: '\u05D0\u05B1\u05DE\u05B6\u05EA',
    files: ['010 oatzar_hayeerah_emes.html'],
    parser: 'para-num'
  },
  {
    id: 'emunah',
    title: 'Emunah (Faith)',
    hebrewTitle: '\u05D0\u05B1\u05DE\u05D5\u05BC\u05E0\u05B8\u05D4 \u05D5\u05B6\u05D0\u05B1\u05DE\u05D5\u05BC\u05E0\u05B7\u05EA \u05D7\u05B2\u05DB\u05B8\u05DE\u05B4\u05D9\u05DD',
    files: [
      '050 oatzar_emunah_batch1.html',
      '060 oatzar_emunah_batch2 (1).html',
      '070 oatzar_emunah_batch3.html',
      '080 oatzar_emunah_batch4.html',
      '090 oatzar_emunah_batch5.html',
      '100 oatzar_emunah_batch6.html',
      '110 oatzar_emunah_batch7.html',
      '120 oatzar_emunah_batch8_final.html'
    ],
    parser: 'para-num'
  },
  {
    id: 'eretz-yisrael',
    title: 'Eretz Yisrael (The Land of Israel)',
    hebrewTitle: '\u05D0\u05B6\u05E8\u05B6\u05E5 \u05D9\u05B4\u05E9\u05C2\u05B0\u05E8\u05B8\u05D0\u05B5\u05DC',
    files: ['150 oatzar_eretz_yisrael.html'],
    parser: 'para-num'
  },
  {
    id: 'acheela',
    title: 'Acheela (Eating)',
    hebrewTitle: '\u05D0\u05B2\u05DB\u05B4\u05D9\u05DC\u05B8\u05D4',
    files: [
      '200 oatzar_hayeerah_acheela_01-06 (2).html',
      '210 oatzar_hayeerah_acheela_07-21 (1).html',
      '220 treasury_of_awe_acheela_22-33.html',
      '230 treasury_of_awe_acheela_34-44.html',
      '240 treasury_of_awe_acheela_45-55.html',
      '250 treasury_of_awe_acheela_56-65.html',
      '260 treasury_of_awe_acheela_66-75.html',
      '270 treasury_of_awe_acheela_76-85.html',
      '280 treasury_of_awe_acheela_86-95.html',
      '290 treasury_of_awe_acheela_96-105.html',
      '300 treasury_of_awe_acheela_106-115.html',
      '310 treasury_of_awe_acheela_116-125.html',
      '320 treasury_of_awe_acheela_126-135.html',
      '330 treasury_of_awe_acheela_136-145.html',
      '340 treasury_of_awe_acheela_146-155.html',
      '350 treasury_of_awe_acheela_156-165.html',
      '360 treasury_of_awe_acheela_166-175.html',
      '370 treasury_of_awe_acheela_176-207_FINAL.html'
    ],
    parser: 'entry-num'
  },
  {
    id: 'hachnosas-orchim',
    title: 'Hachnosas Orchim (Hospitality)',
    hebrewTitle: '\u05D4\u05B7\u05DB\u05B0\u05E0\u05B8\u05E1\u05B7\u05EA \u05D0\u05D5\u05B9\u05E8\u05B0\u05D7\u05B4\u05D9\u05DD',
    files: ['400 treasury_of_awe_hachnosas_orchim_and_ohr_vachoshech.html'],
    parser: 'entry-num',
    splitKey: 'hachnosas_orchim'
  },
  {
    id: 'ohr-vachoshech',
    title: 'Ohr va-Choshech (Light and Darkness)',
    hebrewTitle: '\u05D0\u05D5\u05B9\u05E8 \u05D5\u05B8\u05D7\u05B9\u05E9\u05B6\u05C1\u05DA\u05B0',
    files: ['400 treasury_of_awe_hachnosas_orchim_and_ohr_vachoshech.html'],
    parser: 'entry-num',
    splitKey: 'ohr_vachoshech'
  },
  {
    id: 'komat-adam',
    title: 'Komat Adam (Human Stature)',
    hebrewTitle: '\u05E7\u05D5\u05B9\u05DE\u05B7\u05EA \u05D0\u05B8\u05D3\u05B8\u05DD',
    files: ['450 treasury_of_awe_komat_adam.html'],
    parser: 'entry-num'
  },
  {
    id: 'bris',
    title: 'Bris (The Covenant)',
    hebrewTitle: '\u05D1\u05B0\u05E8\u05B4\u05D9\u05EA \u2014 \u05E4\u05B0\u05D2\u05B8\u05DE\u05D5\u05B9 \u05D5\u05B0\u05EA\u05B4\u05E7\u05BC\u05D5\u05BC\u05E0\u05D5\u05B9',
    files: ['500 treasury_of_awe_bris.html'],
    parser: 'entry-num'
  },
  {
    id: 'banim',
    title: 'Banim (Children)',
    hebrewTitle: '\u05D1\u05B8\u05BC\u05E0\u05B4\u05D9\u05DD',
    files: ['520 treasury_of_awe_banim.html'],
    parser: 'entry-num'
  },
  {
    id: 'bitochen',
    title: 'Bitochen (Trust in Hashem)',
    hebrewTitle: '\u05D1\u05B4\u05BC\u05D8\u05B8\u05BC\u05D7\u05D5\u05B9\u05DF',
    files: ['550 treasury_of_awe_bitochen.html'],
    parser: 'entry-num'
  },
  {
    id: 'bushah',
    title: 'Bushah va-Azus (Shame and Boldness)',
    hebrewTitle: '\u05D1\u05BC\u05D5\u05BC\u05E9\u05B8\u05C1\u05D4 \u05D5\u05B7\u05E2\u05B7\u05D6\u05BC\u05D5\u05BC\u05EA',
    files: ['570 treasury_of_awe_bushah_vazus.html'],
    parser: 'entry-num'
  },
  {
    id: 'bitul',
    title: 'Bitul u-Deveikus (Nullification and Cleaving)',
    hebrewTitle: '\u05D1\u05B4\u05BC\u05D8\u05BC\u05D5\u05BC\u05DC \u05D5\u05BC\u05D3\u05B0\u05D1\u05B5\u05E7\u05D5\u05BC\u05EA',
    files: ['590 treasury_of_awe_bitul_udeveikus.html'],
    parser: 'entry-num'
  },
  {
    id: 'bechiyah',
    title: 'Bechiyah (Weeping)',
    hebrewTitle: '\u05D1\u05B0\u05BC\u05DB\u05B4\u05D9\u05BC\u05B8\u05D4',
    files: ['611 treasury_of_awe_bechiyah.html'],
    parser: 'entry-num'
  },
  {
    id: 'begadim',
    title: 'Begadim (Clothing)',
    hebrewTitle: '\u05D1\u05B0\u05BC\u05D2\u05B8\u05D3\u05B4\u05D9\u05DD',
    files: ['620 treasury_of_awe_begadim.html'],
    parser: 'entry-num'
  },
  {
    id: 'bayis',
    title: 'Bayis u-Chutz (House and Outside)',
    hebrewTitle: '\u05D1\u05B7\u05BC\u05D9\u05B4\u05EA \u05D5\u05B0\u05D7\u05D5\u05BC\u05E5',
    files: ['650 treasury_of_awe_bayis_uchutz.html'],
    parser: 'entry-num'
  },
  {
    id: 'batei-kenesiyos',
    title: 'Batei Kenesiyos (Synagogues)',
    hebrewTitle: '\u05D1\u05B8\u05BC\u05EA\u05B5\u05BC\u05D9 \u05DB\u05B0\u05E0\u05B5\u05E1\u05B4\u05D9\u05BC\u05D5\u05B9\u05EA',
    files: ['700 treasury_of_awe_batei_kenesiyos.html'],
    parser: 'entry-num'
  },
  {
    id: 'gaavah',
    title: 'Gaavah va-Anavah (Pride and Humility)',
    hebrewTitle: '\u05D2\u05B7\u05BC\u05D0\u05B2\u05D5\u05B8\u05D4 \u05D5\u05B7\u05E2\u05B2\u05E0\u05B8\u05D5\u05B8\u05D4',
    files: ['720 treasury_of_awe_gaavah_vanavah.html'],
    parser: 'entry-num'
  },
  {
    id: 'geirim',
    title: 'Geirim (Converts)',
    hebrewTitle: '\u05D2\u05B5\u05BC\u05E8\u05B4\u05D9\u05DD',
    files: ['750 treasury_of_awe_geirim.html'],
    parser: 'entry-num'
  },
  {
    id: 'galus',
    title: 'Galus u-Geulah (Exile and Redemption)',
    hebrewTitle: '\u05D2\u05B8\u05BC\u05DC\u05D5\u05BC\u05EA \u05D5\u05BC\u05D2\u05B0\u05D0\u05D5\u05BC\u05DC\u05B8\u05D4',
    files: ['800 treasury_of_awe_galus_ugeulah.html'],
    parser: 'entry-num'
  },
  {
    id: 'daas',
    title: 'Daas va-Chachmah (Knowledge and Wisdom)',
    hebrewTitle: '\u05D3\u05B7\u05BC\u05E2\u05B7\u05EA \u05D5\u05B0\u05D7\u05B8\u05DB\u05B0\u05DE\u05B8\u05D4',
    files: ['850 treasury_of_awe_daas_vchachmah.html'],
    parser: 'entry-num'
  },
  {
    id: 'dibur',
    title: 'Dibur Tov (Good Speech)',
    hebrewTitle: '\u05D3\u05B4\u05BC\u05D1\u05BC\u05D5\u05BC\u05E8 \u05D8\u05D5\u05B9\u05D1',
    files: ['900 treasury_of_awe_dibur_tov.html'],
    parser: 'entry-num'
  },
  {
    id: 'din-torah',
    title: 'Din Torah (Torah Law and Litigation)',
    hebrewTitle: '\u05D3\u05B4\u05BC\u05D9\u05DF \u05EA\u05BC\u05D5\u05B9\u05E8\u05B8\u05D4',
    files: ['960 oatzar_section22_din_torah.html'],
    parser: 'para-num'
  }
];

// ============================================================
// Main Processing
// ============================================================

function readFile(filename) {
  const fullPath = path.join(SRC_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  WARNING: File not found: ${filename}`);
    return null;
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function processMultiFileEntries(topic) {
  let allEntries = [];

  if (topic.splitKey) {
    // This topic comes from a split file
    const html = readFile(topic.files[0]);
    if (!html) return allEntries;

    const parts = splitHachnosasFile(html);
    const relevantHtml = parts[topic.splitKey];
    if (!relevantHtml) {
      console.warn(`  WARNING: Could not find split section for ${topic.splitKey}`);
      return allEntries;
    }

    allEntries = extractEntryNumEntries(relevantHtml);
    return allEntries;
  }

  for (const filename of topic.files) {
    const html = readFile(filename);
    if (!html) continue;

    let entries;
    if (topic.parser === 'para-num') {
      entries = extractParaNumEntries(html);
    } else {
      entries = extractEntryNumEntries(html);
      if (entries.length === 0) {
        // Fallback to para-num style
        entries = extractParaNumEntries(html);
      }
    }

    if (entries.length > 0) {
      allEntries.push(...entries);
    }
  }

  // For multi-file topics, ensure sequential numbering
  // The entries should already have correct numbers from the source files
  // But let's check for duplicates and sort
  const seen = new Set();
  const deduped = [];
  for (const e of allEntries) {
    if (!seen.has(e.index)) {
      seen.add(e.index);
      deduped.push(e);
    }
  }
  deduped.sort((a, b) => a.index - b.index);

  return deduped;
}

function createTorahJson(torahNum, topic, entries) {
  return {
    id: `ohy-1-${torahNum}`,
    book: 'otzar-hayirah',
    part: 1,
    torah: torahNum,
    displayNumber: torahNum,
    title: topic.title,
    hebrewTitle: topic.hebrewTitle,
    keyVerse: '',
    keyVerseRef: '',
    themes: [],
    keywords: [],
    simanim: [],
    hasEnglish: true,
    segments: entries.map(e => ({
      index: e.index,
      he: '',
      en: e.text
    }))
  };
}

function updateIndexJson(newTorahs) {
  const indexPath = path.join(READER_DIR, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  // Update total count
  const existingCount = index.torahs.length;
  const newTotal = existingCount + newTorahs.length;
  index.totalTorahs = newTotal;

  // Update title to reflect both volumes
  index.title = 'Otzar HaYirah';
  index.hebrewTitle = '\u05D0\u05D5\u05B9\u05E6\u05B7\u05E8 \u05D4\u05B7\u05D9\u05B4\u05BC\u05E8\u05B0\u05D0\u05B8\u05D4';

  // Add new torahs to the index
  for (const t of newTorahs) {
    index.torahs.push({
      number: t.torah,
      displayNumber: t.torah,
      title: t.title,
      hebrewTitle: t.hebrewTitle,
      themes: [],
      paragraphs: t.segments.length,
      hasEnglish: true,
      url: `/reader/otzar-hayirah/1/${t.torah}`
    });
  }

  return index;
}

// ============================================================
// Run
// ============================================================

console.log('=== Otzar HaYirah Volume 1 English Import ===');
console.log(`Source: ${SRC_DIR}`);
console.log(`Target: ${READER_DIR}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log('');

let startNum = 37; // Start after existing 36 sections
const newTorahs = [];
const results = [];

for (const topic of TOPICS) {
  console.log(`\nProcessing: ${topic.title}`);
  console.log(`  Files: ${topic.files.join(', ')}`);

  const entries = processMultiFileEntries(topic);
  console.log(`  Entries extracted: ${entries.length}`);

  if (entries.length === 0) {
    results.push({ topic: topic.title, status: 'FAILED - no entries extracted', count: 0 });
    continue;
  }

  const torahNum = startNum;
  startNum++;

  const torahJson = createTorahJson(torahNum, topic, entries);
  newTorahs.push(torahJson);

  const outPath = path.join(READER_DIR, `torah-${torahNum}.json`);
  console.log(`  -> torah-${torahNum}.json (${entries.length} segments)`);

  if (!DRY_RUN) {
    fs.writeFileSync(outPath, JSON.stringify(torahJson, null, 2), 'utf8');
  }

  results.push({
    topic: topic.title,
    status: 'OK',
    torahNum,
    count: entries.length,
    firstEntry: entries[0].index,
    lastEntry: entries[entries.length - 1].index
  });
}

// Update index.json
if (!DRY_RUN && newTorahs.length > 0) {
  const updatedIndex = updateIndexJson(newTorahs);
  const indexPath = path.join(READER_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(updatedIndex, null, 2), 'utf8');
  console.log(`\nUpdated index.json: ${updatedIndex.totalTorahs} total sections`);
}

// ============================================================
// Report
// ============================================================

console.log('\n\n========== IMPORT REPORT ==========');
console.log(`Total topics processed: ${TOPICS.length}`);
console.log(`Topics with entries: ${results.filter(r => r.status === 'OK').length}`);
console.log(`Topics failed: ${results.filter(r => r.status !== 'OK').length}`);
console.log('');

let totalSegments = 0;
for (const r of results) {
  if (r.status === 'OK') {
    console.log(`  torah-${r.torahNum}.json: ${r.topic} - ${r.count} segments (entries ${r.firstEntry}-${r.lastEntry})`);
    totalSegments += r.count;
  } else {
    console.log(`  FAILED: ${r.topic} - ${r.status}`);
  }
}

console.log(`\nTotal new segments: ${totalSegments}`);
console.log(`New torah files: ${startNum - 37}`);
if (DRY_RUN) console.log('\n(DRY RUN - no files written)');
