/**
 * Fix Chayey Moharan English Import - Complete Coverage
 *
 * Parses ALL HTML source files and maps articles to JSON segments.
 * Forces overwrite of any existing English.
 *
 * Usage:
 *   node scripts/fix-chayey-moharan-import.cjs
 *   node scripts/fix-chayey-moharan-import.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Chayay Moharan';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'chayey-moharan');
const DRY_RUN = process.argv.includes('--dry-run');

// Article 162 from hashmatos is password-protected - MUST NOT be imported
const FORBIDDEN_ARTICLES = new Set([162]);

// ============================================================
// HTML Parsing
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
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(parseInt(d)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract articles from an HTML file.
 * Returns Map<number, string> where key is article number and value is full text.
 */
function parseArticles(html) {
  const articles = new Map();
  const articleRegex = /<div\s+class="article"\s+id="article-(\d+)">/g;
  const positions = [];
  let m;
  while ((m = articleRegex.exec(html)) !== null) {
    positions.push({ num: parseInt(m[1]), start: m.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const { num, start } = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1].start : html.length;
    let articleHtml = html.slice(start, end);

    // Remove everything before the article-body div
    const bodyStart = articleHtml.indexOf('class="article-body"');
    if (bodyStart === -1) continue;
    // Find the closing > of the article-body div tag
    const bodyTagEnd = articleHtml.indexOf('>', bodyStart);
    if (bodyTagEnd === -1) continue;
    articleHtml = articleHtml.slice(bodyTagEnd + 1);

    // Extract all text content from the article body
    const text = stripHtml(articleHtml);
    const paragraphs = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (paragraphs.length > 0) {
      if (FORBIDDEN_ARTICLES.has(num)) {
        console.log(`  WARNING: Skipping FORBIDDEN article ${num} (password-protected)`);
        continue;
      }
      articles.set(num, paragraphs.join('\n\n'));
    }
  }

  return articles;
}

/**
 * Parse intro HTML file
 */
function parseIntro(html) {
  let body = html.replace(/[\s\S]*<body>/, '');
  body = body.replace(/<\/body>[\s\S]*/, '');
  body = body.replace(/<div\s+class="title-banner"[\s\S]*?<\/div>\s*<\/div>/gi, '');
  body = body.replace(/<div\s+class="section-title-block"[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<div\s+class="sep"[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<p\s+class="centered"[\s\S]*?<\/p>/gi, '');

  const text = stripHtml(body);
  const paragraphs = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return paragraphs.join('\n\n');
}

// ============================================================
// Hebrew numeral parsing
// ============================================================

const HEB_CHAR_VALS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
  'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
};

function parseHebrewNumeral(str) {
  if (!str) return null;
  str = str.trim().replace(/['"״׳\u05F4\u05F3]/g, '');
  if (str.length === 0) return null;

  let total = 0;
  for (const ch of str) {
    if (HEB_CHAR_VALS[ch] !== undefined) {
      total += HEB_CHAR_VALS[ch];
    } else {
      return null; // contains non-numeral characters
    }
  }
  return total > 0 ? total : null;
}

// ============================================================
// Segment analysis
// ============================================================

/**
 * Check if a segment's Hebrew text is a standalone global article number header.
 * These appear as just a Hebrew numeral like "קכט", "תכו", "תלא" etc.
 */
function isGlobalNumHeader(heText) {
  const trimmed = heText.trim();
  // Must be 2-4 Hebrew letters only
  if (!/^[א-ת]{2,4}$/.test(trimmed)) return null;
  const num = parseHebrewNumeral(trimmed);
  // Article numbers in Chayey Moharan range from ~100 to ~615
  if (num && num >= 60 && num <= 700) return num;
  return null;
}

/**
 * Extract sub-number from segment start, e.g., "(א)" -> 1
 */
function getSubNumber(heText) {
  const m = heText.trim().match(/^\(?([א-ת]{1,2})\)/);
  if (m) return parseHebrewNumeral(m[1]);
  return null;
}

/**
 * Check if segment starts with a global article number followed by newline and sub-number.
 * e.g., "קכט\n(א) ..." -> { global: 129 }
 */
function getGlobalPrefix(heText) {
  const m = heText.trim().match(/^([א-ת]{2,4})\s*[\r\n]/);
  if (m) {
    const num = parseHebrewNumeral(m[1]);
    if (num && num >= 60 && num <= 700) return num;
  }
  return null;
}

// ============================================================
// Chapter-to-article mapping definitions
// ============================================================

/**
 * For each chapter, define how sub-numbers map to global article numbers.
 *
 * Based on analysis of all 12 chapters:
 * - Ch 1: subs 1-59 -> articles 1-59 (offset 0)
 * - Ch 2: no mapped articles (12 segs, brief section refs)
 * - Ch 3: subs 1-14 -> articles 60-73 (offset 59)
 *   BUT file 3 has arts 60-103, and ch3 only has 16 segs with subs up to 14 (=art 73)
 * - Ch 4: subs 8-14 -> no HTML articles for these (they're Sichos HaRan addenda)
 * - Ch 5: subs 15-18 -> no HTML articles
 * - Ch 6: subs 19-30 -> no HTML articles
 * - Ch 7: subs 1-23 -> articles 81-103 (offset 80)
 * - Ch 8: subs 1-25 -> articles 104-128 (offset 103)
 * - Ch 9: has global numeral headers (129-229) + subs that reset per section
 * - Ch 10: has global numeral headers (426-429) + subs
 * - Ch 11: has global numeral headers (430-443) + subs
 * - Ch 12: has global numeral headers (609-615) + subs
 *
 * Chapters 9-12 use a hybrid approach: global headers from standalone segments,
 * then sub-numbers within each article.
 */

const CHAPTER_OFFSETS = {
  1: { offset: 0, maxSub: 59 },         // subs 1-59 -> arts 1-59
  3: { offset: 59, maxSub: 14 },         // subs 1-14 -> arts 60-73
  7: { offset: 80, maxSub: 23 },         // subs 1-23 -> arts 81-103
  8: { offset: 103, maxSub: 25 },        // subs 1-25 -> arts 104-128
  // Chapters 9, 10, 11, 12 use global headers - handled differently
};

// Chapters with no article mapping
const NO_ARTICLE_CHAPTERS = new Set([2, 4, 5, 6]);

// Chapters that use global numeral headers
const GLOBAL_HEADER_CHAPTERS = new Set([9, 10, 11, 12]);

// ============================================================
// Core logic: map segments to article numbers
// ============================================================

function mapSegmentsToArticles(segments, chapterNum) {
  const result = new Array(segments.length).fill(null);

  if (NO_ARTICLE_CHAPTERS.has(chapterNum)) {
    return result; // No mapping for these chapters
  }

  let currentGlobal = null;

  if (GLOBAL_HEADER_CHAPTERS.has(chapterNum)) {
    // Chapters with embedded global numeral headers
    for (let i = 0; i < segments.length; i++) {
      const he = segments[i].he;

      // Check for standalone global numeral header
      const globalNum = isGlobalNumHeader(he);
      if (globalNum !== null) {
        currentGlobal = globalNum;
        result[i] = currentGlobal;
        continue;
      }

      // Check for global prefix (e.g., "קכט\n(א) ...")
      const prefixNum = getGlobalPrefix(he);
      if (prefixNum !== null) {
        currentGlobal = prefixNum;
        result[i] = currentGlobal;
        continue;
      }

      // Otherwise, this segment belongs to current article
      if (currentGlobal !== null) {
        result[i] = currentGlobal;
      }
    }
  } else if (CHAPTER_OFFSETS[chapterNum]) {
    // Chapters with sub-number -> global offset mapping
    const { offset, maxSub } = CHAPTER_OFFSETS[chapterNum];

    for (let i = 0; i < segments.length; i++) {
      const he = segments[i].he;
      const subNum = getSubNumber(he);

      if (subNum !== null && subNum >= 1 && subNum <= maxSub) {
        currentGlobal = subNum + offset;
      }

      if (currentGlobal !== null) {
        result[i] = currentGlobal;
      }
    }
  }

  return result;
}

// ============================================================
// Assign English text to segments
// ============================================================

function assignEnglish(segments, globalNums, articles) {
  let assigned = 0;

  // Group consecutive segments by global article number
  const groups = [];
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
    const englishText = articles.get(group.globalNum);
    if (!englishText || englishText.length === 0) continue;

    // Find content segments (skip standalone numeral headers)
    const contentSegs = [];
    for (let i = group.startIdx; i <= group.endIdx; i++) {
      const he = segments[i].he.trim();
      if (/^[א-ת]{2,4}$/.test(he)) continue; // skip numeral-only segments
      contentSegs.push(i);
    }

    if (contentSegs.length === 0) continue;

    // Split English into paragraphs
    const englishParas = englishText.split('\n\n').filter(p => p.trim().length > 0);

    if (contentSegs.length === 1) {
      // Single content segment - assign all English
      segments[contentSegs[0]].en = englishText;
      assigned++;
    } else if (englishParas.length <= contentSegs.length) {
      // Fewer English paragraphs than segments - assign one per segment
      for (let j = 0; j < contentSegs.length; j++) {
        if (j < englishParas.length) {
          segments[contentSegs[j]].en = englishParas[j];
          assigned++;
        }
      }
    } else {
      // More English paragraphs than segments - distribute evenly
      const parasPerSeg = Math.ceil(englishParas.length / contentSegs.length);
      let paraIdx = 0;
      for (let j = 0; j < contentSegs.length; j++) {
        const isLast = (j === contentSegs.length - 1);
        const endPara = isLast ? englishParas.length : Math.min(paraIdx + parasPerSeg, englishParas.length);
        const chunk = englishParas.slice(paraIdx, endPara);
        if (chunk.length > 0) {
          segments[contentSegs[j]].en = chunk.join('\n\n');
          assigned++;
        }
        paraIdx = endPara;
      }
    }
  }

  return assigned;
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('=== Fix Chayey Moharan English Import ===');
  console.log(`Source: ${SRC_DIR}`);
  console.log(`Target: ${READER_DIR}`);
  if (DRY_RUN) console.log('*** DRY RUN - no files will be modified ***');
  console.log('');

  // Step 1: Parse all HTML files
  const allArticles = new Map();

  const htmlFiles = [
    { file: 'chayay_moharan_articles.html', desc: 'Articles 1-59' },
    { file: 'chayay_moharan_3.html', desc: 'Articles 60-103' },
    { file: 'chayay_moharan_4.html', desc: 'Articles 104-229' },
    { file: 'chayay_moharan_5.html', desc: 'Articles 230-443' },
    { file: 'chayay_moharan_6.html', desc: 'Articles 444-615' },
  ];

  for (const { file, desc } of htmlFiles) {
    const filePath = path.join(SRC_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.log(`WARNING: ${file} not found, skipping`);
      continue;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const articles = parseArticles(html);
    const keys = [...articles.keys()].sort((a, b) => a - b);
    console.log(`Parsed ${file} (${desc}): ${articles.size} articles [${keys[0]}-${keys[keys.length - 1]}]`);
    for (const [num, text] of articles) {
      allArticles.set(num, text);
    }
  }

  // Parse intro
  const introPath = path.join(SRC_DIR, 'chayay_moharan_intro.html');
  let introText = '';
  if (fs.existsSync(introPath)) {
    const introHtml = fs.readFileSync(introPath, 'utf8');
    introText = parseIntro(introHtml);
    console.log(`Parsed intro: ${introText.length} chars`);
  }

  console.log(`\nTotal English articles loaded: ${allArticles.size}`);
  const sortedKeys = [...allArticles.keys()].sort((a, b) => a - b);
  console.log(`Article range: ${sortedKeys[0]} - ${sortedKeys[sortedKeys.length - 1]}`);

  // Check for forbidden articles
  for (const fa of FORBIDDEN_ARTICLES) {
    if (allArticles.has(fa)) {
      console.log(`WARNING: Article ${fa} found but is FORBIDDEN - removing`);
      allArticles.delete(fa);
    }
  }

  console.log('');

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

    // FORCE CLEAR all existing English to start fresh
    for (const seg of data.segments) {
      seg.en = '';
    }

    console.log(`--- Chapter ${chapterNum}: "${data.title}" (${data.segments.length} segments) ---`);
    totalSegments += data.segments.length;

    // Map segments to global article numbers
    const globalNums = mapSegmentsToArticles(data.segments, chapterNum);

    // Count mappings
    const uniqueArticles = new Set(globalNums.filter(n => n !== null));
    const mappedSegCount = globalNums.filter(n => n !== null).length;

    // Check which articles have English
    let availableCount = 0;
    const missingArts = [];
    for (const artNum of [...uniqueArticles].sort((a, b) => a - b)) {
      if (allArticles.has(artNum)) {
        availableCount++;
      } else {
        missingArts.push(artNum);
      }
    }

    console.log(`  Mapped: ${mappedSegCount}/${data.segments.length} segments -> ${uniqueArticles.size} articles`);
    console.log(`  English available: ${availableCount}/${uniqueArticles.size} articles`);
    if (missingArts.length > 0 && missingArts.length <= 20) {
      console.log(`  Missing articles: ${missingArts.join(', ')}`);
    }

    // Assign English
    const assigned = assignEnglish(data.segments, globalNums, allArticles);
    console.log(`  Assigned English to: ${assigned} segments`);
    totalAssigned += assigned;

    // Count segments that actually got English
    const withEn = data.segments.filter(s => s.en && s.en.length > 0).length;
    const pct = data.segments.length > 0 ? ((withEn / data.segments.length) * 100).toFixed(1) : '0';
    console.log(`  Coverage: ${withEn}/${data.segments.length} (${pct}%)`);

    // Save
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  SAVED: ${file}`);
    }

    results.push({
      chapter: chapterNum,
      title: data.title,
      segments: data.segments.length,
      withEnglish: withEn,
      mapped: mappedSegCount,
      uniqueArticles: uniqueArticles.size,
      available: availableCount,
    });
    console.log('');
  }

  // Step 3: Update index.json
  if (!DRY_RUN) {
    const indexPath = path.join(READER_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const torah of index.torahs) {
      const r = results.find(r => r.chapter === torah.number || r.chapter === parseInt(torah.number));
      if (r) {
        torah.hasEnglish = r.withEnglish > 0;
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log('Updated index.json hasEnglish flags\n');
  }

  // Summary
  const totalWithEn = results.reduce((sum, r) => sum + r.withEnglish, 0);
  console.log('=== FINAL SUMMARY ===');
  console.log(`Total segments: ${totalSegments}`);
  console.log(`Segments with English: ${totalWithEn}`);
  console.log(`Coverage: ${((totalWithEn / totalSegments) * 100).toFixed(1)}%\n`);

  console.log('Per chapter:');
  for (const r of results) {
    const pct = r.segments > 0 ? ((r.withEnglish / r.segments) * 100).toFixed(0) : '0';
    const bar = '█'.repeat(Math.round(parseInt(pct) / 5)) + '░'.repeat(20 - Math.round(parseInt(pct) / 5));
    console.log(`  Ch ${String(r.chapter).padStart(2)}: ${bar} ${String(r.withEnglish).padStart(4)}/${String(r.segments).padStart(4)} (${pct}%) - ${r.title}`);
  }

  // Chapters without mapping
  const unmappedChapters = results.filter(r => r.mapped === 0);
  if (unmappedChapters.length > 0) {
    console.log(`\nChapters without article mapping (${unmappedChapters.length}):`);
    for (const r of unmappedChapters) {
      console.log(`  Ch ${r.chapter}: "${r.title}" (${r.segments} segments) - no corresponding HTML articles`);
    }
  }
}

main();
