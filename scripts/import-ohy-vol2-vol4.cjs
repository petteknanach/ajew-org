/**
 * Import Otzar HaYirah Volumes 2 and 4 from HTML source files into reader JSON format.
 *
 * Volume 2 source: C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 2/
 * Volume 4 source: C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 4/
 *
 * Creates:
 *   public/reader/otzar-hayirah/part-2/index.json + torah-N.json files
 *   public/reader/otzar-hayirah/part-4/index.json + torah-N.json files
 *
 * Usage:
 *   node scripts/import-ohy-vol2-vol4.cjs
 *   node scripts/import-ohy-vol2-vol4.cjs --dry-run
 *   node scripts/import-ohy-vol2-vol4.cjs --vol 2
 *   node scripts/import-ohy-vol2-vol4.cjs --vol 4
 */

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const VOL_FILTER = process.argv.includes('--vol')
  ? parseInt(process.argv[process.argv.indexOf('--vol') + 1])
  : null;

const VOL2_SRC = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 2';
const VOL4_SRC = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Oatzar 4';
const READER_BASE = path.join(__dirname, '..', 'public', 'reader', 'otzar-hayirah');

// ============================================================
// HTML Helpers
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
  // Collapse whitespace but preserve paragraph breaks
  return text
    .split('\n\n')
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 0)
    .join('\n\n');
}

// ============================================================
// Volume 2 Topic Definitions (order and grouping of source files)
// ============================================================

const VOL2_TOPICS = [
  {
    title: 'Hisbodidus and Yishuv HaDa\'as',
    hebrewTitle: 'הִתְבּוֹדְדוּת וְיִשּׁוּב הַדַּעַת',
    files: [
      '010 oatzar_hayeerah_hisbodidus.html',
      '020 oatzar_hayeerah_hisbodidus_part2.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Hischazkus (Strengthening Oneself)',
    hebrewTitle: 'הִתְחַזְּקוּת',
    files: [
      '050 oatzar_hischazkus_part1.html',
      '060 oatzar_hischazkus_part2.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Hashgasas v\'Histanatztzus Elokus',
    hebrewTitle: 'הַשְׂגָּתָת וְהִסְתַּנַּצְּצוּת אֱלֹקוּת',
    files: ['100 hashgatas_vehistanatztzus_Eloikus.html'],
  },
  {
    title: 'Hashgachah v\'Teva (Providence and Nature)',
    hebrewTitle: 'הַשְׁגָּחָה וְטֶבַע',
    files: ['150 hashgachah_veteva_providence_and_nature.html'],
  },
  {
    title: 'Hamtakas HaDinim v\'Hodaah (Sweetening Judgments & Thanksgiving)',
    hebrewTitle: 'הַמְתָּקַת הַדִּינִים וְהוֹדָאָה',
    files: ['170 hamtakas_hadinim_and_hodaah.html'],
  },
  {
    title: 'Viduy Devarim v\'Zikaron v\'Shikcha (Confession, Memory & Forgetting)',
    hebrewTitle: 'וִדּוּי דְּבָרִים וְזִכָּרוֹן וּשְׁכִיחָה',
    files: ['200 viduy_devarim_and_zikaron_vshikcha.html'],
  },
  {
    title: 'Zrizus v\'Zivugim (Alacrity & Unions)',
    hebrewTitle: 'זְרִיזוּת וְזִוּוּגִים',
    files: ['220 zrizus_and_zivugim.html'],
  },
  {
    title: 'Chaim v\'Hipucho (Life and Its Opposite)',
    hebrewTitle: 'חַיִּים וְהִפּוּכוֹ',
    files: [
      '250 chaim_vhipucho_part1.html',
      '260 chaim_vhipucho_part2.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Chidush, Chatzos, v\'Chalom (Renewal, Midnight & Dreams)',
    hebrewTitle: 'חִדּוּשׁ חֲצוֹת וַחֲלוֹם',
    files: ['280 chidush_chatzos_chalom.html'],
  },
  {
    title: 'Tiltul u\'Nesi\'os, Tal u\'Matar (Wandering & Journeys, Dew & Rain)',
    hebrewTitle: 'טִלְטוּל וּנְסִיעוֹת, טַל וּמָטָר',
    files: ['300 tiltul_nesi\'os_and_tal_matar.html'],
  },
  {
    title: 'Yirah va\'Avodas Hashem (Fear of G-d & Divine Service)',
    hebrewTitle: 'יִרְאָה וַעֲבוֹדַת ה\'',
    files: [
      '330 yirah_vavodas_hashem_part1 1-57.html',
      '340 yirah_vavodas_hashem_part2.html',
      '350 oatzar_hayeerah_yirah_115_125.html',
      '360 oatzar_hayeerah_yirah_126_135.html',
      '370 oatzar_hayeerah_yirah_136_145.html',
      '380 oatzar_hayeerah_yirah_146_155.html',
      '390 oatzar_hayeerah_yirah_156_165.html',
      '400 oatzar_hayeerah_yirah_166_172_final.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Yissurin v\'Yishuah (Suffering & Salvation)',
    hebrewTitle: 'יִסּוּרִין וִישׁוּעָה',
    files: [
      '450 oatzar_hayeerah_yissurin_01_10.html',
      '460 oatzar_hayeerah_yissurin_11_21.html',
      '470 oatzar_hayeerah_yissurin_22_31_final.html',
    ],
    continuousNumbering: true,
  },
  {
    title: 'Ka\'as (Anger)',
    hebrewTitle: 'כַּעַס',
    files: ['500 oatzar_hayeerah_kaas_01_10.html'],
  },
  {
    title: 'Kavod v\'Hisnassus u\'Manhigus (Honor, Elevation & Leadership)',
    hebrewTitle: 'כָּבוֹד וְהִתְנַשְּׂאוּת וּמַנְהִיגוּת',
    files: ['530 oatzar_hayeerah_kavod_01_24.html'],
  },
  {
    title: 'Leitzanus v\'Lashon HaRa (Mockery & Evil Speech)',
    hebrewTitle: 'לֵיצָנוּת וְלָשׁוֹן הָרָע',
    files: ['600 oatzar_hayeerah_leitzanus_01_07.html'],
  },
  {
    title: 'Limmud Tinokos Shel Beis Rabban (Teaching Children)',
    hebrewTitle: 'לִמּוּד תִּינוֹקוֹת שֶׁל בֵּית רַבָּן',
    files: ['620 oatzar_hayeerah_tinokos_01_06.html'],
  },
];

// ============================================================
// Volume 4 Topic Definitions
// ============================================================

const VOL4_TOPICS = [
  {
    title: 'Nigun (Melody)',
    hebrewTitle: 'נִגּוּן',
    files: ['010 otzar_hayirah_vol4_nigun.html'],
  },
  {
    title: 'Nedarim V\'Shevuos (Vows & Oaths)',
    hebrewTitle: 'נְדָרִים וּשְׁבוּעוֹת',
    files: ['050 otzar_hayirah_vol4_nedarim.html'],
  },
  {
    title: 'Sefarim V\'Chidushei Torah (Books & Torah Insights)',
    hebrewTitle: 'סְפָרִים וְחִדּוּשֵׁי תּוֹרָה',
    files: ['100 otzar_hayirah_vol4_sefarim.html'],
  },
  {
    title: 'Einayim (The Eyes)',
    hebrewTitle: 'עֵינַיִם',
    files: ['150 otzar_hayirah_vol4_einayim.html'],
  },
  {
    title: 'Etzah (Counsel & Guidance)',
    hebrewTitle: 'עֵצָה',
    files: ['200 otzar_hayirah_vol4_etzah.html'],
  },
  {
    title: 'Pidyon (Redemption)',
    hebrewTitle: 'פִּדְיוֹן',
    files: ['250 otzar_hayirah_vol4_pidyon.html'],
  },
  {
    title: 'Tzadik (The Righteous One)',
    hebrewTitle: 'צַדִּיק',
    files: ['300 otzar_hayirah_vol4_tzadik.html'],
  },
  {
    title: 'Tzedakah V\'Gemilus Chasadim (Charity & Lovingkindness)',
    hebrewTitle: 'צְדָקָה וּגְמִילוּת חֲסָדִים',
    files: ['350 otzar_hayirah_vol4_tzedakah.html'],
  },
  {
    title: 'Tzitzis',
    hebrewTitle: 'צִיצִית',
    files: ['400 otzar_hayirah_vol4_tzitzis.html'],
  },
  {
    title: 'Kedushah V\'Kiddush Hashem (Holiness & Sanctification)',
    hebrewTitle: 'קְדֻשָּׁה וְקִדּוּשׁ ה\'',
    files: ['420 otzar_hayirah_vol4_kedushah.html'],
  },
  {
    title: 'Kishui Holada (Difficulty in Childbirth)',
    hebrewTitle: 'קְשׁוּי הוֹלָדָה',
    files: ['450 otzar_hayirah_vol4_kishui.html'],
  },
  {
    title: 'Ratzon U\'Chesufin (Will & Holy Longing)',
    hebrewTitle: 'רָצוֹן וּכְסוּפִין',
    files: ['500 otzar_hayirah_vol4_ratzon.html'],
  },
  {
    title: 'Rachmanus (Compassion)',
    hebrewTitle: 'רַחְמָנוּת',
    files: ['520 otzar_hayirah_vol4_rachmanus.html'],
  },
  {
    title: 'Shalom V\'Achdus (Peace & Unity)',
    hebrewTitle: 'שָׁלוֹם וְאַחְדוּת, אַהֲבַת חֲבֵרִים, וְלָדוּן הַכֹּל לְכַף זְכוּת',
    files: ['550 otzar_hayirah_vol4_shalom.html'],
  },
  {
    title: 'Simcha (Joy)',
    hebrewTitle: 'שִׂמְחָה',
    files: ['580 otzar_hayirah_vol4_simcha.html'],
  },
  {
    title: 'Shikrus (Drunkenness)',
    hebrewTitle: 'שִׁכְרוּת',
    files: ['610 otzar_hayirah_vol4_shikrus.html'],
  },
  {
    title: 'Shainah (Sleep)',
    hebrewTitle: 'שֵׁנָה',
    files: ['630 otzar_hayirah_vol4_shainah.html'],
  },
  {
    title: 'Shechitah (Ritual Slaughter)',
    hebrewTitle: 'שְׁחִיטָה',
    files: ['670 otzar_hayirah_vol4_shechitah.html'],
  },
  {
    title: 'Talmud Torah V\'Krias HaTorah (Torah Study)',
    hebrewTitle: 'תַּלְמוּד תּוֹרָה וּקְרִיאַת הַתּוֹרָה',
    files: ['700 otzar_hayirah_vol4_talmud_torah.html'],
  },
  {
    title: 'Tefilah (Prayer)',
    hebrewTitle: 'תְּפִלָּה',
    files: ['720 otzar_hayirah_vol4_tefilah.html'],
  },
  {
    title: 'Tefilin',
    hebrewTitle: 'תְּפִלִּין',
    files: ['750 otzar_hayirah_vol4_tefilin.html'],
  },
  {
    title: 'Tochachah (Rebuke)',
    hebrewTitle: 'תּוֹכָחָה',
    files: ['800 otzar_hayirah_vol4_tochachah.html'],
  },
  {
    title: 'Tanis (Fasting)',
    hebrewTitle: 'תַּעֲנִית',
    files: ['850 otzar_hayirah_vol4_tanis.html'],
  },
  {
    title: 'Teshuvah (Return)',
    hebrewTitle: 'תְּשׁוּבָה',
    files: ['900 otzar_hayirah_vol4_teshuvah.html'],
  },
  {
    title: 'Temimus (Wholesomeness)',
    hebrewTitle: 'תְּמִימוּת',
    files: ['950 otzar_hayirah_vol4_temimus.html'],
  },
];

// ============================================================
// HTML Section Extractors
// ============================================================

/**
 * Split HTML into chunks by a marker pattern, returning text between each pair of markers.
 * This avoids regex issues with nested divs by splitting on known markers.
 */
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

/**
 * Extract a section number from a chunk of HTML.
 * Handles many patterns:
 *   section-number: א. [1]
 *   section-num: 1.  or  § 1.
 *   entry-label: 1.
 */
function extractSectionNum(block) {
  // Pattern: [N] in section-number
  let m = block.match(/class="section-number">[^[]*\[(\d+)\]/);
  if (m) return parseInt(m[1]);
  // Pattern: section-num with § prefix
  m = block.match(/class="section-num">[^§\d]*§?\s*(\d+)\./);
  if (m) return parseInt(m[1]);
  // Pattern: entry-label
  m = block.match(/class="entry-label">\s*(\d+)\./);
  if (m) return parseInt(m[1]);
  return null;
}

/**
 * Clean a section block: remove metadata spans, labels, source refs, cross-refs
 */
function cleanSectionBlock(block) {
  return block
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
    .replace(/<span\s+class="verse-source">[^<]*<\/span>/gi, '');
}

/**
 * Universal section extractor using split-by-marker approach.
 * Works for all HTML formats: section divs, section-block divs, and entry divs.
 */
function extractSections(html) {
  const segments = [];

  // Determine marker pattern based on what's in the HTML
  let markerPattern;
  if (html.includes('class="entry"') && html.includes('class="entry-label"')) {
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

function processVolume(volNum, srcDir, topics) {
  const partDir = path.join(READER_BASE, `part-${volNum}`);
  if (!DRY_RUN) {
    fs.mkdirSync(partDir, { recursive: true });
  }

  const torahEntries = [];
  let torahNum = 1;

  for (const topic of topics) {
    console.log(`\n--- Torah ${torahNum}: ${topic.title} ---`);
    let allSegments = [];

    for (const filename of topic.files) {
      const filePath = path.join(srcDir, filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`  MISSING: ${filename}`);
        continue;
      }
      const html = fs.readFileSync(filePath, 'utf8');
      const segments = extractSections(html, srcDir);
      console.log(`  ${filename}: ${segments.length} segments`);
      allSegments = allSegments.concat(segments);
    }

    // For multi-file topics with continuous numbering, segments already have correct numbers
    // For multi-file topics without continuous numbering, renumber
    if (!topic.continuousNumbering && topic.files.length > 1) {
      allSegments.forEach((seg, i) => { seg.index = i + 1; });
    }

    // Deduplicate by index (in case overlapping files)
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

    // Renumber sequentially if there are gaps
    const hasGaps = dedupedSegments.length > 0 &&
      dedupedSegments[dedupedSegments.length - 1].index !== dedupedSegments.length;
    if (!hasGaps) {
      // Numbers are already sequential, keep them
    }
    // Don't renumber - keep original section numbers for fidelity

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
        next: null, // set after all torahs processed
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

console.log('=== Otzar HaYirah Import: Volumes 2 & 4 ===');
if (DRY_RUN) console.log('[DRY RUN MODE]\n');

let totalTorahs = 0;
let totalSegments = 0;

if (!VOL_FILTER || VOL_FILTER === 2) {
  console.log('\n========== VOLUME 2 (ה–ל) ==========');
  const r2 = processVolume(2, VOL2_SRC, VOL2_TOPICS);
  totalTorahs += r2.torahCount;
  totalSegments += r2.totalSegments;
}

if (!VOL_FILTER || VOL_FILTER === 4) {
  console.log('\n========== VOLUME 4 (נ–ת) ==========');
  const r4 = processVolume(4, VOL4_SRC, VOL4_TOPICS);
  totalTorahs += r4.torahCount;
  totalSegments += r4.totalSegments;
}

console.log(`\n=== DONE: ${totalTorahs} torahs, ${totalSegments} total segments ===`);
