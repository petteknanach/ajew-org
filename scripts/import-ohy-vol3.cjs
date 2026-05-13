/**
 * Import Otzar HaYirah Volume 3 (Mem) from HTML source files into reader JSON format.
 *
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzer volume Mem/
 * Target: public/reader/otzar-hayirah/part-3/
 *
 * Usage:
 *   node scripts/import-ohy-vol3.cjs
 *   node scripts/import-ohy-vol3.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzer volume Mem';
const READER_BASE = path.join(__dirname, '..', 'public', 'reader', 'otzar-hayirah');

// ============================================================
// HTML Helpers (same as vol2/vol4 importer)
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
    .replace(/&#8209;/g, '\u2011')
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

function cleanText(html) {
  const text = stripHtml(html);
  return text
    .split('\n\n')
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 0)
    .join('\n\n');
}

// ============================================================
// Volume 3 Topic Definitions (grouped by topic)
// ============================================================

const VOL3_TOPICS = [
  {
    title: 'Mamon, Parnasa & Honest Trade',
    hebrewTitle: 'מָמוֹן וּפַרְנָסָה וּמַשָּׂא־וּמַתָּן בֶּאֱמוּנָה',
    files: [
      'OHY_010_mamon_part1_entries1_40.html',
      'OHY_020_mamon_part2_entries41_80.html',
      'OHY_030_mamon_part3_entries81_120.html',
      'OHY_040_mamon_part4_entries121_160.html',
      'OHY_050_mamon_part5_entries161_200.html',
      'OHY_060_mamon_part6_entries201_260.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Machshavos (Thoughts)',
    hebrewTitle: 'מַחֲשָׁבוֹת',
    files: ['OHY_100_machshavos_entries1_22.html'],
  },
  {
    title: 'Menios (Obstacles)',
    hebrewTitle: 'מְנִיעוֹת',
    files: ['OHY_150_menios_entries1_23.html'],
  },
  {
    title: 'Machlokes (Dispute)',
    hebrewTitle: 'מַחֲלֹקֶת',
    files: [
      'OHY_200_machlokes_part1_entries1_36.html',
      'OHY_210_machlokes_part2_entries37_72.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Mikva (Ritual Bath)',
    hebrewTitle: 'מִקְוָה',
    files: ['OHY_250_mikva_entries1_40.html'],
  },
  {
    title: 'Mila (Circumcision)',
    hebrewTitle: 'מִילָה',
    files: ['OHY_300_mila_entries1_49.html'],
  },
  {
    title: 'Mitzvos (Commandments)',
    hebrewTitle: 'מִצְווֹת',
    files: ['OHY_350_mitzvos_entries1_29.html'],
  },
  {
    title: 'Mashiach (The Messiah)',
    hebrewTitle: 'מָשִׁיחַ',
    files: ['OHY_400_mashiach_entries1_23.html'],
  },
  {
    title: 'Shabbos',
    hebrewTitle: 'שַׁבָּת',
    files: [
      'OHY_500_shabbos_part1_entries1_45.html',
      'OHY_510_shabbos_part2_entries46_90.html',
      'OHY_520_shabbos_part3_entries91_135.html',
      'OHY_530_shabbos_part4_entries136_170.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Rosh Chodesh (New Month)',
    hebrewTitle: 'רֹאשׁ חֹדֶשׁ',
    files: ['OHY_600_rosh_chodesh_entries1_39.html'],
  },
  {
    title: 'Shalosh Regalim (Three Festivals)',
    hebrewTitle: 'שָׁלשׁ רְגָלִים',
    files: ['OHY_650_shalosh_regalim_entries1_14.html'],
  },
  {
    title: 'Pesach, Sefira & Shavuos',
    hebrewTitle: 'פֶּסַח סְפִירָה וְשָׁבוּעוֹת',
    files: [
      'OHY_700_pesach_part1_entries1_50.html',
      'OHY_710_pesach_part3_entries46_80.html',
      'OHY_720_pesach_part4_entries81_115.html',
      'OHY_730_pesach_part5_entries116_155.html',
      'OHY_740_pesach_part6_entries156_195.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Bein HaMetzarim (The Three Weeks)',
    hebrewTitle: 'בֵּין הַמְּצָרִים',
    files: ['OHY_800_bein_hametzarim_entries1_21.html'],
  },
  {
    title: 'Elul, Rosh HaShanah, Yom Kippur & Aseres Yemei Teshuvah',
    hebrewTitle: 'אֱלוּל רֹאשׁ הַשָּׁנָה יוֹם כִּפּוּר וַעֲשֶׂרֶת יְמֵי תְּשׁוּבָה',
    files: [
      'OHY_850_elul_part1_entries1_52.html',
      'OHY_860_elul_part2_entries53_105.html',
      'OHY_870_elul_part3_entries106_158.html',
      'OHY_880_elul_part4_entries159_210.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Chanuka',
    hebrewTitle: 'חֲנֻכָּה',
    files: [
      'OHY_900_chanuka_part1_entries1_35.html',
      'OHY_910_chanuka_part2_entries36_71.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Purim',
    hebrewTitle: 'פּוּרִים',
    files: [
      'OHY_950_purim_part1_entries1_37.html',
      'OHY_960_purim_part2_entries38_69.html',
      'OHY_970_purim_part3_entries70_93.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Arba Parshiyos (Four Special Torah Portions)',
    hebrewTitle: 'אַרְבַּע פָּרָשִׁיּוֹת',
    files: ['OHY_990_arba_parshiyos_entries1_17.html'],
  },
];

// ============================================================
// Section Extractors
// ============================================================

function splitByMarker(html, markerRegex) {
  const chunks = [];
  const markers = [];
  let match;
  const re = new RegExp(markerRegex, 'gi');
  while ((match = re.exec(html)) !== null) {
    markers.push({ index: match.index, match: match[0] });
  }
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : html.length;
    chunks.push(html.slice(start, end));
  }
  return chunks;
}

function extractSectionNum(block) {
  // Pattern: entry-num with number
  let m = block.match(/class="entry-num">\s*(\d+)\./);
  if (m) return parseInt(m[1]);
  // Pattern: [N] in section-number
  m = block.match(/class="section-number">[^[]*\[(\d+)\]/);
  if (m) return parseInt(m[1]);
  // Pattern: section-num with optional § prefix
  m = block.match(/class="section-num">[^§\d]*§?\s*(\d+)\./);
  if (m) return parseInt(m[1]);
  // Pattern: entry-label
  m = block.match(/class="entry-label">\s*(\d+)\./);
  if (m) return parseInt(m[1]);
  return null;
}

function cleanSectionBlock(block) {
  return block
    .replace(/<span\s+class="entry-num">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="section-number">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="section-num">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="entry-label">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="entry-body">\s*/gi, '')
    .replace(/<span\s+class="section-source">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="source">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="source-ref">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="citation">[^<]*<\/span>/gi, '')
    .replace(/<div\s+class="section-body">/gi, '')
    .replace(/<div\s+class="cross-ref">[\s\S]*?<\/div>/gi, '')
    .replace(/<div\s+class="source">[\s\S]*?<\/div>/gi, '')
    .replace(/<p\s+class="cite">[\s\S]*?<\/p>/gi, '')
    .replace(/<span\s+class="verse-source">[^<]*<\/span>/gi, '')
    .replace(/<span\s+class="verse-cite">[^<]*<\/span>/gi, '');
}

function extractSections(html) {
  const segments = [];

  // All vol3 files use div.entry with span.entry-num
  let markerPattern;
  if (html.includes('class="entry"')) {
    markerPattern = '<div\\s+class="entry">';
  } else if (html.includes('class="section-block"')) {
    markerPattern = '<div\\s+class="section-block"[^>]*>';
  } else if (html.includes('class="section"')) {
    markerPattern = '<div\\s+class="section">';
  } else {
    console.warn('  WARNING: No known section pattern found');
    return [];
  }

  const chunks = splitByMarker(html, markerPattern);

  for (const chunk of chunks) {
    const num = extractSectionNum(chunk);
    if (!num) continue;

    const cleaned = cleanText(cleanSectionBlock(chunk));
    if (cleaned.length > 0) {
      segments.push({ index: num, he: '', en: cleaned });
    }
  }

  return segments;
}

// ============================================================
// Build Torah JSON files
// ============================================================

function processVolume() {
  const volNum = 3;
  const partDir = path.join(READER_BASE, `part-${volNum}`);
  if (!DRY_RUN) {
    fs.mkdirSync(partDir, { recursive: true });
  }

  const torahEntries = [];
  let torahNum = 1;

  for (const topic of VOL3_TOPICS) {
    console.log(`\n--- Torah ${torahNum}: ${topic.title} ---`);
    let allSegments = [];

    for (const filename of topic.files) {
      const filePath = path.join(SRC_DIR, filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`  MISSING: ${filename}`);
        continue;
      }
      const html = fs.readFileSync(filePath, 'utf8');
      const segments = extractSections(html);
      console.log(`  ${filename}: ${segments.length} segments`);
      allSegments = allSegments.concat(segments);
    }

    // For multi-file topics without continuous numbering, renumber
    if (!topic.continuousNumbering && topic.files.length > 1) {
      allSegments.forEach((seg, i) => { seg.index = i + 1; });
    }

    // Deduplicate by index (in case overlapping entry ranges between files)
    const seen = new Set();
    const dedupedSegments = [];
    for (const seg of allSegments) {
      if (!seen.has(seg.index)) {
        seen.add(seg.index);
        dedupedSegments.push(seg);
      }
    }

    // Sort by index
    dedupedSegments.sort((a, b) => a.index - b.index);

    console.log(`  Total segments: ${dedupedSegments.length}`);

    if (dedupedSegments.length === 0) {
      console.warn(`  SKIPPING: no segments extracted for ${topic.title}`);
      continue;
    }

    const torahData = {
      id: `ohy-${volNum}-${torahNum}`,
      book: 'otzar-hayirah',
      part: volNum,
      torah: torahNum,
      displayNumber: torahNum,
      title: topic.title,
      hebrewTitle: topic.hebrewTitle,
      keyVerse: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments: dedupedSegments,
      totalParagraphs: dedupedSegments.length,
      hasEnglish: true,
      navigation: {
        prev: torahNum > 1 ? `/reader/otzar-hayirah/${volNum}/${torahNum - 1}` : null,
        next: null,
      },
    };

    torahEntries.push({ torahNum, data: torahData, topic });
    torahNum++;
  }

  // Fix navigation next pointers
  for (let i = 0; i < torahEntries.length; i++) {
    if (i < torahEntries.length - 1) {
      torahEntries[i].data.navigation.next = `/reader/otzar-hayirah/${volNum}/${torahEntries[i + 1].torahNum}`;
    }
  }

  // Write torah JSON files
  for (const entry of torahEntries) {
    const filePath = path.join(partDir, `torah-${entry.torahNum}.json`);
    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would write: ${filePath} (${entry.data.segments.length} segments)`);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(entry.data, null, 2), 'utf8');
      console.log(`  Wrote: torah-${entry.torahNum}.json (${entry.data.segments.length} segments)`);
    }
  }

  // Build index.json
  const indexData = {
    book: 'otzar-hayirah',
    part: volNum,
    title: 'Otzar HaYirah',
    hebrewTitle: '\u05D0\u05D5\u05B9\u05E6\u05B7\u05E8 \u05D4\u05B7\u05D9\u05BC\u05B4\u05E8\u05B0\u05D0\u05B8\u05D4',
    author: 'Rabbi Nosson of Breslov',
    hebrewAuthor: '\u05E8\u05D1\u05D9 \u05E0\u05EA\u05DF \u05DE\u05D1\u05E8\u05E1\u05DC\u05D1',
    totalTorahs: torahEntries.length,
    torahs: torahEntries.map(e => ({
      number: e.torahNum,
      displayNumber: e.torahNum,
      title: e.topic.title,
      hebrewTitle: e.topic.hebrewTitle,
      themes: [],
      paragraphs: e.data.segments.length,
      hasEnglish: true,
      url: `/reader/otzar-hayirah/${volNum}/${e.torahNum}`,
    })),
  };

  const indexPath = path.join(partDir, 'index.json');
  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Would write: ${indexPath} (${torahEntries.length} torahs)`);
  } else {
    fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    console.log(`\nWrote: index.json (${torahEntries.length} torahs)`);
  }

  return { torahCount: torahEntries.length, totalSegments: torahEntries.reduce((sum, e) => sum + e.data.segments.length, 0) };
}

// ============================================================
// Main
// ============================================================

console.log('=== Otzar HaYirah Import: Volume 3 (מ) ===');
if (DRY_RUN) console.log('[DRY RUN MODE]\n');

const result = processVolume();

console.log(`\n=== DONE: ${result.torahCount} torahs, ${result.totalSegments} total segments ===`);
