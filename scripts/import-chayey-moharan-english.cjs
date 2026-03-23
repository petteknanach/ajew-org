/**
 * Import English translations for Chayey Moharan from HTML files
 *
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Chayay Moharan/
 * Target: public/reader/chayey-moharan/
 *
 * Usage:
 *   node scripts/import-chayey-moharan-english.cjs
 *   node scripts/import-chayey-moharan-english.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Chayay Moharan';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'chayey-moharan');

const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================
// HTML Parsing Helpers
// ============================================================

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#x[\dA-Fa-f]+;/g, (m) => {
      const code = parseInt(m.slice(3, -1), 16);
      return String.fromCodePoint(code);
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ============================================================
// Parse HTML articles
// ============================================================

/**
 * Extract articles from an HTML file.
 * Returns Map<number, string[]> where key is global article number
 * and value is array of paragraph texts.
 */
function parseArticles(html) {
  const articles = new Map();

  // Split by article divs
  const articleRegex = /<div\s+class="article"\s+id="article-(\d+)">/g;
  const positions = [];
  let m;
  while ((m = articleRegex.exec(html)) !== null) {
    positions.push({ num: parseInt(m[1]), start: m.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const { num, start } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].start : html.length;
    const articleHtml = html.slice(start, end);

    // Extract the article-body content
    const bodyMatch = articleHtml.match(/<div\s+class="article-body">([\s\S]*?)(?:<\/div>\s*<\/div>|$)/);
    if (!bodyMatch) continue;

    let bodyHtml = bodyMatch[1];

    // Remove hashmata fulfilled blocks (green-bordered divs)
    bodyHtml = bodyHtml.replace(/<div[^>]*border-left:\s*3px\s+solid\s+#4a7c3f[\s\S]*?<\/div>/gi, '');
    // Remove hashmata inline spans (gold colored)
    // Keep them - they are part of the translation

    const text = stripHtml(bodyHtml);
    const paragraphs = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (paragraphs.length > 0) {
      articles.set(num, paragraphs);
    }
  }

  return articles;
}

/**
 * Parse the intro HTML file - returns array of paragraphs
 */
function parseIntro(html) {
  // Remove style/head
  let body = html.replace(/[\s\S]*<body>/, '');
  body = body.replace(/<\/body>[\s\S]*/, '');

  // Remove hashmata blocks
  body = body.replace(/<div[^>]*border-left:\s*3px\s+solid\s+#4a7c3f[\s\S]*?<\/div>/gi, '');

  // Remove title banner and title page label
  body = body.replace(/<div\s+class="title-banner"[\s\S]*?<\/div>\s*<\/div>/gi, '');

  // Remove section title blocks at the end
  body = body.replace(/<div\s+class="section-title-block"[\s\S]*?<\/div>/gi, '');

  // Remove separators
  body = body.replace(/<div\s+class="sep"[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<p\s+class="centered"[\s\S]*?<\/p>/gi, '');

  // Remove the trailing title banner at the end
  body = body.replace(/<div\s+class="title-banner"[\s\S]*?<\/div>/gi, '');

  const text = stripHtml(body);
  const paragraphs = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return paragraphs;
}

// ============================================================
// Hebrew numeral parsing
// ============================================================

const HEB_NUMERALS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
  'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23,
  'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29,
  'ל': 30, 'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36,
  'לז': 37, 'לח': 38, 'לט': 39,
  'מ': 40, 'מא': 41, 'מב': 42, 'מג': 43, 'מד': 44, 'מה': 45, 'מו': 46,
  'מז': 47, 'מח': 48, 'מט': 49,
  'נ': 50, 'נא': 51, 'נב': 52, 'נג': 53, 'נד': 54, 'נה': 55, 'נו': 56,
  'נז': 57, 'נח': 58, 'נט': 59,
};

/**
 * Parse a Hebrew numeral string to integer.
 * Handles simple cases like א=1, יב=12, קכט=129, תכו=426
 */
function parseHebrewNumeral(str) {
  str = str.trim().replace(/['"״׳]/g, '');

  // Check simple lookup first
  if (HEB_NUMERALS[str] !== undefined) return HEB_NUMERALS[str];

  // Parse composite Hebrew numerals
  const vals = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
  };

  let total = 0;
  for (const ch of str) {
    if (vals[ch] !== undefined) {
      total += vals[ch];
    }
  }
  return total > 0 ? total : null;
}

// ============================================================
// Map JSON segments to global article numbers
// ============================================================

/**
 * For a given chapter's segments, determine which global article number
 * each segment belongs to. Returns an array of global article numbers
 * (one per segment).
 *
 * Strategy:
 * - Some segments are standalone Hebrew numerals (global article numbers like קכט, תכו)
 * - Some segments start with (letter) indicating a new sub-section
 * - Other segments are continuations of the previous article
 */
function mapSegmentsToArticles(segments, chapterNum) {
  const result = [];
  let currentGlobal = null;

  // For chapter 9, segments have global numbers embedded as "קכט\n(א)"
  // For chapter 10, segments are standalone numerals like "תכו"
  // For chapters 1-8, 11-12, the mapping is based on section structure

  // Build section sub-number to global article number mapping
  const SECTION_MAP = buildSectionMap();

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const he = seg.he.trim();

    // Check if this segment is a standalone Hebrew numeral (global article number header)
    const standaloneMatch = he.match(/^([א-ת]{1,4})$/);
    if (standaloneMatch) {
      const num = parseHebrewNumeral(standaloneMatch[1]);
      if (num && num >= 1 && num <= 700) {
        currentGlobal = num;
        result.push(currentGlobal);
        continue;
      }
    }

    // Check if segment starts with a global article number followed by newline
    // e.g., "קכט\n(א) ..."
    const globalPrefixMatch = he.match(/^([א-ת]{2,4})\s*[\r\n]+\(([א-ת]{1,2})\)/);
    if (globalPrefixMatch) {
      const globalNum = parseHebrewNumeral(globalPrefixMatch[1]);
      if (globalNum && globalNum >= 1 && globalNum <= 700) {
        currentGlobal = globalNum;
        result.push(currentGlobal);
        continue;
      }
    }

    // Check if segment starts with (letter) - section sub-number
    const subMatch = he.match(/^\(?([א-ת]{1,2})\)/);
    if (subMatch) {
      const subNum = parseHebrewNumeral(subMatch[1]);
      if (subNum) {
        // Look up global number using section map
        const globalNum = lookupGlobal(chapterNum, subNum, SECTION_MAP);
        if (globalNum) {
          currentGlobal = globalNum;
        }
      }
    }

    result.push(currentGlobal);
  }

  return result;
}

/**
 * Build the section map: chapterNum -> { subNum -> globalArticleNum }
 */
function buildSectionMap() {
  const map = {};

  // Chapter 1: Section I "Words pertaining to the Teachings" - articles 1-59
  // Sub-numbers 1-59 map to global 1-59
  map[1] = {};
  for (let i = 1; i <= 59; i++) map[1][i] = i;

  // Chapter 2: "Sichos HaRan" - no numbered articles in HTML
  // These are short references, no article-level translation
  map[2] = {};

  // Chapter 3: Section II "Conversations Pertaining to Legendary Tales" - articles 60-73
  // Sub-numbers 1-14 map to global 60-73
  map[3] = {};
  for (let i = 1; i <= 14; i++) map[3][i] = 59 + i;

  // Chapter 4: Section III continuation - articles 74-80
  // Sub-numbers 15-21 map to global 74-80
  map[4] = {};
  for (let i = 15; i <= 21; i++) map[4][i] = 59 + i;

  // Chapter 5: "Conversations pertaining to Sefer HaMidos" - articles from same numbering
  // Sub-numbers continue... but which section?
  // chapter-5 starts with (טו) = 15 - but this is in a DIFFERENT section
  // Looking at file_3.html: Section III has articles 74-80 (sub 15-21)
  // chapter-5 title is "שיחות השיכים לספר המדות" - could be its own small section
  // Actually, looking at the content more carefully, chapter-5 segments start with (טו), (טז), (יז), (יח)
  // These might not correspond to HTML articles at all...
  // Let me leave them unmapped for now if they don't have clear article matches
  map[5] = {};

  // Chapter 6: starts with (יט) - continuation
  map[6] = {};

  // Chapter 7: Section IV "New Stories" - articles 81-103
  // Sub-numbers 1-23 map to global 81-103
  map[7] = {};
  for (let i = 1; i <= 23; i++) map[7][i] = 80 + i;

  // Chapter 8: Section V "Birthplace/Residence" - articles 104-128
  // Sub-numbers 1-25 map to global 104-128
  map[8] = {};
  for (let i = 1; i <= 25; i++) map[8][i] = 103 + i;

  // Chapter 9: "Journey to Israel" + later journeys - articles 129-229
  // The segments have global numbers embedded, so sub-mapping not needed
  // But sub-numbers reset for each sub-section in the HTML
  // Actually, in chapter 9, the Hebrew text has global numbers like קכט before (א)
  // So the mapSegmentsToArticles function will handle this via globalPrefixMatch
  map[9] = {};

  // Chapter 10: "Witticisms" - articles 426-429
  // Segments have standalone Hebrew numeral headers
  map[10] = {};

  // Chapter 11: "Not to be stubborn" - articles 430-443
  // Sub-numbers 1-14 map to global 430-443
  map[11] = {};
  for (let i = 1; i <= 14; i++) map[11][i] = 429 + i;

  // Chapter 12: "Closeness of R' Yudil" - articles 609-615 (sub 1-7)
  map[12] = {};
  for (let i = 1; i <= 7; i++) map[12][i] = 608 + i;

  return map;
}

function lookupGlobal(chapterNum, subNum, sectionMap) {
  if (sectionMap[chapterNum] && sectionMap[chapterNum][subNum]) {
    return sectionMap[chapterNum][subNum];
  }
  return null;
}

// ============================================================
// Assign English text to segments
// ============================================================

/**
 * Given a chapter's segments, their mapped global article numbers,
 * and the master articles map, assign English text.
 *
 * Strategy: for each article in the chapter, find all segments belonging to it,
 * then distribute the English paragraphs across those segments.
 */
function assignEnglish(segments, globalNums, articles) {
  let assigned = 0;

  // Group segments by global article number
  const groups = []; // [{globalNum, startIdx, endIdx}]
  let currentNum = null;
  let groupStart = 0;

  for (let i = 0; i < segments.length; i++) {
    if (globalNums[i] !== null && globalNums[i] !== currentNum) {
      if (currentNum !== null) {
        groups.push({ globalNum: currentNum, startIdx: groupStart, endIdx: i - 1 });
      }
      currentNum = globalNums[i];
      groupStart = i;
    }
  }
  if (currentNum !== null) {
    groups.push({ globalNum: currentNum, startIdx: groupStart, endIdx: segments.length - 1 });
  }

  for (const group of groups) {
    const englishParas = articles.get(group.globalNum);
    if (!englishParas || englishParas.length === 0) continue;

    const segCount = group.endIdx - group.startIdx + 1;

    // Skip standalone numeral segments (they have no real content)
    const contentSegs = [];
    for (let i = group.startIdx; i <= group.endIdx; i++) {
      const he = segments[i].he.trim();
      // Check if it's a standalone numeral (no real content)
      if (/^[א-ת]{1,4}$/.test(he)) {
        continue; // skip, don't assign English to numeral-only segments
      }
      contentSegs.push(i);
    }

    if (contentSegs.length === 0) continue;

    // Join all English paragraphs into one text
    const fullEnglish = englishParas.join('\n\n');

    if (contentSegs.length === 1) {
      // Single content segment - assign all English
      segments[contentSegs[0]].en = fullEnglish;
      assigned++;
    } else {
      // Multiple content segments - try to distribute paragraphs
      // Strategy: first segment gets paragraphs until we run out or reach next segment's worth
      // Simple approach: divide roughly equally, or assign sequentially

      if (englishParas.length <= contentSegs.length) {
        // Fewer paragraphs than segments - assign one per segment, rest empty
        for (let j = 0; j < contentSegs.length; j++) {
          if (j < englishParas.length) {
            segments[contentSegs[j]].en = englishParas[j];
            assigned++;
          }
        }
      } else {
        // More paragraphs than segments - distribute
        const parasPerSeg = Math.ceil(englishParas.length / contentSegs.length);
        let paraIdx = 0;
        for (let j = 0; j < contentSegs.length; j++) {
          const endPara = Math.min(paraIdx + parasPerSeg, englishParas.length);
          // For the last segment, take all remaining
          const actualEnd = (j === contentSegs.length - 1) ? englishParas.length : endPara;
          const chunk = englishParas.slice(paraIdx, actualEnd);
          if (chunk.length > 0) {
            segments[contentSegs[j]].en = chunk.join('\n\n');
            assigned++;
          }
          paraIdx = actualEnd;
        }
      }
    }
  }

  return assigned;
}

// ============================================================
// Handle the introduction (not article-based)
// ============================================================

function handleIntro(introParas, jsonPath) {
  // The intro doesn't map to any chapter JSON directly
  // It's general introductory text. We might want to add it to chapter-1.json
  // or create a separate entry. For now, we'll skip unless there's a clear target.
  // Actually, looking at the index.json - there's no "intro" chapter.
  // The intro text could go into a note field or be skipped.
  // Let's skip for now and report it.
  console.log(`  Intro: ${introParas.length} paragraphs (not mapped to any chapter JSON)`);
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('=== Importing Chayey Moharan English Translations ===');
  console.log(`Source: ${SRC_DIR}`);
  console.log(`Target: ${READER_DIR}`);
  if (DRY_RUN) console.log('*** DRY RUN - no files will be modified ***\n');

  // Step 1: Parse all HTML files
  const allArticles = new Map();

  const htmlFiles = [
    'chayay_moharan_articles.html',
    'chayay_moharan_3.html',
    'chayay_moharan_4.html',
    'chayay_moharan_5.html',
    'chayay_moharan_6.html',
  ];

  for (const file of htmlFiles) {
    const filePath = path.join(SRC_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`WARNING: ${file} not found, skipping`);
      continue;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const articles = parseArticles(html);
    console.log(`Parsed ${file}: ${articles.size} articles`);
    for (const [num, paras] of articles) {
      allArticles.set(num, paras);
    }
  }

  // Parse intro
  const introPath = path.join(SRC_DIR, 'chayay_moharan_intro.html');
  let introParas = [];
  if (fs.existsSync(introPath)) {
    const introHtml = fs.readFileSync(introPath, 'utf8');
    introParas = parseIntro(introHtml);
    console.log(`Parsed intro: ${introParas.length} paragraphs`);
  }

  console.log(`\nTotal English articles: ${allArticles.size}`);
  const sortedKeys = [...allArticles.keys()].sort((a, b) => a - b);
  console.log(`Article range: ${sortedKeys[0]} - ${sortedKeys[sortedKeys.length - 1]}`);

  // Step 2: Process each chapter JSON
  const chapterFiles = fs.readdirSync(READER_DIR)
    .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0]);
      const nb = parseInt(b.match(/\d+/)[0]);
      return na - nb;
    });

  let totalAssigned = 0;
  let totalSegments = 0;
  const results = [];

  for (const file of chapterFiles) {
    const filePath = path.join(READER_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const chapterNum = parseInt(file.match(/\d+/)[0]);

    console.log(`\n--- Chapter ${chapterNum}: ${data.title} (${data.segments.length} segments) ---`);
    totalSegments += data.segments.length;

    // Map segments to global article numbers
    const globalNums = mapSegmentsToArticles(data.segments, chapterNum);

    // Count how many unique articles we found
    const uniqueArticles = new Set(globalNums.filter(n => n !== null));
    const mappedCount = globalNums.filter(n => n !== null).length;
    console.log(`  Mapped: ${mappedCount}/${data.segments.length} segments to ${uniqueArticles.size} articles`);

    // Check which articles have English translations
    let availableCount = 0;
    for (const artNum of uniqueArticles) {
      if (allArticles.has(artNum)) availableCount++;
    }
    console.log(`  English available: ${availableCount}/${uniqueArticles.size} articles`);

    // Assign English
    const assigned = assignEnglish(data.segments, globalNums, allArticles);
    console.log(`  Assigned English to ${assigned} segments`);
    totalAssigned += assigned;

    // Update hasEnglish flag
    const hasAnyEnglish = data.segments.some(s => s.en && s.en.length > 0);

    if (assigned > 0 && !DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  SAVED: ${file}`);
    }

    results.push({
      chapter: chapterNum,
      title: data.title,
      segments: data.segments.length,
      mapped: mappedCount,
      uniqueArticles: uniqueArticles.size,
      available: availableCount,
      assigned,
      hasEnglish: hasAnyEnglish,
    });
  }

  // Step 3: Update index.json
  if (!DRY_RUN) {
    const indexPath = path.join(READER_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const torah of index.torahs) {
      const r = results.find(r => r.chapter === torah.number || r.chapter === parseInt(torah.number));
      if (r && r.hasEnglish) {
        torah.hasEnglish = true;
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log('\nUpdated index.json hasEnglish flags');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total segments: ${totalSegments}`);
  console.log(`Segments with English: ${totalAssigned}`);
  console.log(`Coverage: ${((totalAssigned / totalSegments) * 100).toFixed(1)}%`);

  console.log('\nPer chapter:');
  for (const r of results) {
    const pct = r.segments > 0 ? ((r.assigned / r.segments) * 100).toFixed(0) : '0';
    console.log(`  Ch ${r.chapter} (${r.title}): ${r.assigned}/${r.segments} segments (${pct}%)`);
  }

  // Report on intro
  if (introParas.length > 0) {
    handleIntro(introParas, READER_DIR);
  }

  // Report unmapped articles
  const allMapped = new Set();
  for (const r of results) {
    // We'd need to collect the mapped article numbers - let's just report the count
  }
}

main();
