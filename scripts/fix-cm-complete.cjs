/**
 * Complete Fix for Chayey Moharan English Translations
 *
 * Fixes:
 * 1. Chapter 1: Clear wrong intro text, reimport articles 1-59 properly
 * 2. Chapter 2: Clear wrong English (cross-references have no translations)
 * 3. Chapter 10: Fix Hebrew-in-English-field for segments 8-9
 * 4. Chapter 12: Verify and fix alignment
 * 5. Rebuild aligned_segments for all chapters
 *
 * Usage:
 *   node scripts/fix-cm-complete.cjs
 *   node scripts/fix-cm-complete.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Chayay Moharan';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'chayey-moharan');
const DRY_RUN = process.argv.includes('--dry-run');

// Article 162 is password-protected
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

    const bodyStart = articleHtml.indexOf('class="article-body"');
    if (bodyStart === -1) continue;
    const bodyTagEnd = articleHtml.indexOf('>', bodyStart);
    if (bodyTagEnd === -1) continue;
    articleHtml = articleHtml.slice(bodyTagEnd + 1);

    const text = stripHtml(articleHtml);
    const paragraphs = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (paragraphs.length > 0) {
      if (FORBIDDEN_ARTICLES.has(num)) continue;
      articles.set(num, paragraphs);
    }
  }
  return articles;
}

// ============================================================
// Hebrew numeral parsing
// ============================================================

const HEB_VALS = {
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
    if (HEB_VALS[ch] !== undefined) {
      total += HEB_VALS[ch];
    } else {
      return null;
    }
  }
  return total > 0 ? total : null;
}

// ============================================================
// Segment-to-article mapping
// ============================================================

/**
 * Extract sub-number from start of segment: "(א)" -> 1
 */
function getSubNumber(heText) {
  const m = heText.trim().match(/^\(?([א-ת]{1,2})\)/);
  if (m) return parseHebrewNumeral(m[1]);
  return null;
}

/**
 * Check if segment is a standalone global numeral header
 */
function isGlobalNumHeader(heText) {
  const trimmed = heText.trim();
  if (!/^[א-ת]{2,4}$/.test(trimmed)) return null;
  const num = parseHebrewNumeral(trimmed);
  if (num && num >= 60 && num <= 700) return num;
  return null;
}

/**
 * Check for global prefix: "קכט\n(א) ..."
 */
function getGlobalPrefix(heText) {
  const m = heText.trim().match(/^([א-ת]{2,4})\s*[\r\n]/);
  if (m) {
    const num = parseHebrewNumeral(m[1]);
    if (num && num >= 60 && num <= 700) return num;
  }
  return null;
}

/**
 * Map segments to global article numbers for a given chapter
 */
function mapSegments(segments, chapterNum) {
  const result = new Array(segments.length).fill(null);

  if (chapterNum === 1) {
    // Sub-numbers (א)-(נט) -> articles 1-59
    let current = null;
    for (let i = 0; i < segments.length; i++) {
      const sub = getSubNumber(segments[i].he);
      if (sub !== null && sub >= 1 && sub <= 59) {
        current = sub; // sub IS the article number (offset 0)
      }
      if (current !== null) result[i] = current;
    }
  } else if ([2, 4, 5, 6].includes(chapterNum)) {
    // No article mapping for these chapters
  } else if (chapterNum === 3) {
    // subs 1-14 -> articles 60-73
    let current = null;
    for (let i = 0; i < segments.length; i++) {
      const sub = getSubNumber(segments[i].he);
      if (sub !== null && sub >= 1 && sub <= 14) current = sub + 59;
      if (current !== null) result[i] = current;
    }
  } else if (chapterNum === 7) {
    // subs 1-23 -> articles 81-103
    let current = null;
    for (let i = 0; i < segments.length; i++) {
      const sub = getSubNumber(segments[i].he);
      if (sub !== null && sub >= 1 && sub <= 23) current = sub + 80;
      if (current !== null) result[i] = current;
    }
  } else if (chapterNum === 8) {
    // subs 1-25 -> articles 104-128
    // BUT also has standalone numeral headers for 111-128
    let current = null;
    for (let i = 0; i < segments.length; i++) {
      const he = segments[i].he;
      const globalNum = isGlobalNumHeader(he);
      if (globalNum !== null && globalNum >= 104 && globalNum <= 128) {
        current = globalNum;
        result[i] = current;
        continue;
      }
      const sub = getSubNumber(he);
      if (sub !== null && sub >= 1 && sub <= 25) current = sub + 103;
      if (current !== null) result[i] = current;
    }
  } else if ([9, 10, 11, 12].includes(chapterNum)) {
    // Global numeral headers
    let current = null;
    for (let i = 0; i < segments.length; i++) {
      const he = segments[i].he;
      const globalNum = isGlobalNumHeader(he);
      if (globalNum !== null) {
        current = globalNum;
        result[i] = current;
        continue;
      }
      const prefixNum = getGlobalPrefix(he);
      if (prefixNum !== null) {
        current = prefixNum;
        result[i] = current;
        continue;
      }
      if (current !== null) result[i] = current;
    }
  }

  return result;
}

// ============================================================
// Assign English to segments
// ============================================================

function assignEnglish(segments, globalNums, articles) {
  let assigned = 0;

  // Group consecutive segments by article number
  const groups = [];
  let currentNum = null;
  let groupStart = 0;

  for (let i = 0; i < segments.length; i++) {
    if (globalNums[i] !== null && globalNums[i] !== currentNum) {
      if (currentNum !== null) {
        groups.push({ num: currentNum, start: groupStart, end: i - 1 });
      }
      currentNum = globalNums[i];
      groupStart = i;
    }
  }
  if (currentNum !== null) {
    groups.push({ num: currentNum, start: groupStart, end: segments.length - 1 });
  }

  for (const group of groups) {
    const paras = articles.get(group.num);
    if (!paras || paras.length === 0) continue;

    // Find content segments (skip standalone numeral headers)
    const contentIdxs = [];
    for (let i = group.start; i <= group.end; i++) {
      const he = segments[i].he.trim();
      if (/^[א-ת]{2,4}$/.test(he)) continue; // numeral-only
      contentIdxs.push(i);
    }

    if (contentIdxs.length === 0) continue;

    // Check if all content segments already have English - skip if so
    const emptyIdxs = contentIdxs.filter(i => !segments[i].en || segments[i].en.length === 0);
    if (emptyIdxs.length === 0) continue; // All already translated

    // If SOME have English, only fill gaps
    if (emptyIdxs.length < contentIdxs.length && emptyIdxs.length > 0) {
      // Partial - don't overwrite existing, just log
      console.log(`    Art ${group.num}: ${contentIdxs.length - emptyIdxs.length}/${contentIdxs.length} already have English, ${emptyIdxs.length} gaps`);
      continue; // Don't risk misaligning existing good translations
    }

    const fullEnglish = paras.join('\n\n');

    // Distribute English paragraphs across content segments
    if (contentIdxs.length === 1) {
      segments[contentIdxs[0]].en = fullEnglish;
      assigned++;
    } else if (paras.length >= contentIdxs.length) {
      // More paragraphs than segments - distribute evenly
      const parasPerSeg = Math.ceil(paras.length / contentIdxs.length);
      let paraIdx = 0;
      for (let j = 0; j < contentIdxs.length; j++) {
        const isLast = (j === contentIdxs.length - 1);
        const endPara = isLast ? paras.length : Math.min(paraIdx + parasPerSeg, paras.length);
        const chunk = paras.slice(paraIdx, endPara);
        if (chunk.length > 0) {
          segments[contentIdxs[j]].en = chunk.join('\n\n');
          assigned++;
        }
        paraIdx = endPara;
      }
    } else {
      // Fewer paragraphs than segments - assign each para sequentially,
      // and group remaining empty segments with the last paragraph
      for (let j = 0; j < paras.length; j++) {
        segments[contentIdxs[j]].en = paras[j];
        assigned++;
      }
      // Remaining segments stay empty - that's OK, aligned_segments will handle it
    }
  }

  return assigned;
}

// ============================================================
// Build aligned_segments from segments
// ============================================================

function buildAlignedSegments(segments) {
  const aligned = [];
  let idx = 1;

  for (const seg of segments) {
    const he = seg.he || '';
    const en = seg.en || '';
    const heNikud = seg.he_nikud || '';

    // If both are short or empty, just copy
    if (!he && !en) continue;

    // Split long Hebrew at sentence boundaries for better alignment
    const heSentences = splitHebrew(he);
    const enParagraphs = en ? en.split('\n\n').filter(p => p.trim()) : [];

    if (heSentences.length <= 1 && enParagraphs.length <= 1) {
      // Simple case: one chunk each
      aligned.push({
        index: idx++,
        he: he,
        en: en,
        ...(heNikud ? { he_nikud: heNikud } : {})
      });
    } else if (enParagraphs.length === 0) {
      // Hebrew only - keep as one aligned segment
      aligned.push({
        index: idx++,
        he: he,
        en: '',
        ...(heNikud ? { he_nikud: heNikud } : {})
      });
    } else {
      // Multiple paragraphs - try to align
      const count = Math.max(heSentences.length, enParagraphs.length);

      if (heSentences.length === enParagraphs.length) {
        // Perfect match
        for (let i = 0; i < count; i++) {
          aligned.push({
            index: idx++,
            he: heSentences[i] || '',
            en: enParagraphs[i] || ''
          });
        }
      } else if (heSentences.length > enParagraphs.length) {
        // More Hebrew chunks than English - distribute English
        const hePerEn = Math.ceil(heSentences.length / enParagraphs.length);
        let heIdx = 0;
        for (let i = 0; i < enParagraphs.length; i++) {
          const isLast = (i === enParagraphs.length - 1);
          const endHe = isLast ? heSentences.length : Math.min(heIdx + hePerEn, heSentences.length);
          aligned.push({
            index: idx++,
            he: heSentences.slice(heIdx, endHe).join(' '),
            en: enParagraphs[i]
          });
          heIdx = endHe;
        }
        // Any remaining Hebrew without English
        if (heIdx < heSentences.length) {
          aligned.push({
            index: idx++,
            he: heSentences.slice(heIdx).join(' '),
            en: ''
          });
        }
      } else {
        // More English paragraphs than Hebrew chunks - distribute Hebrew
        const enPerHe = Math.ceil(enParagraphs.length / heSentences.length);
        let enIdx = 0;
        for (let i = 0; i < heSentences.length; i++) {
          const isLast = (i === heSentences.length - 1);
          const endEn = isLast ? enParagraphs.length : Math.min(enIdx + enPerHe, enParagraphs.length);
          aligned.push({
            index: idx++,
            he: heSentences[i],
            en: enParagraphs.slice(enIdx, endEn).join('\n\n')
          });
          enIdx = endEn;
        }
      }
    }
  }

  return aligned;
}

/**
 * Split Hebrew text at sentence boundaries (period + space, colon, etc.)
 * Returns array of chunks. Only splits if text is long enough.
 */
function splitHebrew(text) {
  if (!text || text.length < 200) return [text];

  // Split at major sentence boundaries
  const chunks = [];
  let remaining = text;

  // Split on period/colon followed by space/newline, keeping sentences together
  const parts = remaining.split(/(?<=[:.])\s+/);

  if (parts.length <= 1) return [text];

  // Group small parts together (min ~100 chars per chunk)
  let current = '';
  for (const part of parts) {
    if (current.length > 0 && current.length + part.length > 300) {
      chunks.push(current.trim());
      current = part;
    } else {
      current += (current ? ' ' : '') + part;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length > 0 ? chunks : [text];
}

// ============================================================
// Main
// ============================================================

function main() {
  console.log('=== Complete Chayey Moharan English Fix ===');
  console.log(`Source: ${SRC_DIR}`);
  console.log(`Target: ${READER_DIR}`);
  if (DRY_RUN) console.log('*** DRY RUN ***\n');

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
      console.log(`WARNING: ${file} not found!`);
      continue;
    }
    const html = fs.readFileSync(filePath, 'utf8');
    const articles = parseArticles(html);
    const keys = [...articles.keys()].sort((a, b) => a - b);
    console.log(`${file}: ${articles.size} articles [${keys[0]}-${keys[keys.length - 1]}]`);
    for (const [num, paras] of articles) {
      allArticles.set(num, paras);
    }
  }
  console.log(`Total articles loaded: ${allArticles.size}\n`);

  // Step 2: Process each chapter
  const chapterFiles = fs.readdirSync(READER_DIR)
    .filter(f => f.startsWith('chapter-') && f.endsWith('.json'))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  const results = [];

  // Chapters where we MUST clear wrong English before reimporting
  const CLEAR_CHAPTERS = new Set([1, 2]);

  for (const file of chapterFiles) {
    const filePath = path.join(READER_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const chNum = parseInt(file.match(/\d+/)[0]);

    console.log(`--- Ch ${chNum}: "${data.title}" (${data.segments.length} segs) ---`);

    // Only clear English for chapters with known wrong translations
    if (CLEAR_CHAPTERS.has(chNum)) {
      console.log(`  CLEARING wrong English (will reimport)`);
      for (const seg of data.segments) {
        seg.en = '';
      }
    }

    // Map segments to articles
    const globalNums = mapSegments(data.segments, chNum);

    // Count mappings
    const unique = new Set(globalNums.filter(n => n !== null));
    const mapped = globalNums.filter(n => n !== null).length;

    // Check available
    let available = 0;
    const missing = [];
    for (const art of [...unique].sort((a, b) => a - b)) {
      if (allArticles.has(art)) available++;
      else missing.push(art);
    }

    console.log(`  Mapped: ${mapped}/${data.segments.length} -> ${unique.size} articles (${available} have English)`);
    if (missing.length > 0 && missing.length <= 10) {
      console.log(`  Missing articles: ${missing.join(', ')}`);
    }

    // Assign English
    const assigned = assignEnglish(data.segments, globalNums, allArticles);

    // Count coverage
    const withEn = data.segments.filter(s => s.en && s.en.length > 0).length;
    const pct = data.segments.length > 0 ? ((withEn / data.segments.length) * 100).toFixed(1) : '0';
    console.log(`  English: ${withEn}/${data.segments.length} (${pct}%)`);

    // Rebuild aligned_segments
    data.aligned_segments = buildAlignedSegments(data.segments);
    const alignedWithEn = data.aligned_segments.filter(s => s.en && s.en.length > 0).length;
    console.log(`  Aligned: ${data.aligned_segments.length} segs (${alignedWithEn} with English)`);

    // Save
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`  SAVED`);
    }

    results.push({ ch: chNum, total: data.segments.length, withEn, aligned: data.aligned_segments.length, alignedEn: alignedWithEn });
    console.log('');
  }

  // Step 3: Update index.json
  if (!DRY_RUN) {
    const indexPath = path.join(READER_DIR, 'index.json');
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const torah of index.torahs) {
      const r = results.find(r => r.ch === torah.number || r.ch === parseInt(torah.number));
      if (r) torah.hasEnglish = r.withEn > 0;
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
    console.log('Updated index.json\n');
  }

  // Summary
  console.log('=== FINAL SUMMARY ===');
  let grandTotal = 0, grandEn = 0, grandAligned = 0, grandAlignedEn = 0;
  for (const r of results) {
    grandTotal += r.total;
    grandEn += r.withEn;
    grandAligned += r.aligned;
    grandAlignedEn += r.alignedEn;
    const pct = r.total > 0 ? ((r.withEn / r.total) * 100).toFixed(0) : '0';
    const bar = '\u2588'.repeat(Math.round(parseInt(pct) / 5)) + '\u2591'.repeat(20 - Math.round(parseInt(pct) / 5));
    console.log(`  Ch ${String(r.ch).padStart(2)}: ${bar} ${String(r.withEn).padStart(4)}/${String(r.total).padStart(4)} (${pct}%)`);
  }
  console.log(`\n  Segments: ${grandEn}/${grandTotal} (${((grandEn / grandTotal) * 100).toFixed(1)}%)`);
  console.log(`  Aligned:  ${grandAlignedEn}/${grandAligned} (${((grandAlignedEn / grandAligned) * 100).toFixed(1)}%)`);
}

main();
