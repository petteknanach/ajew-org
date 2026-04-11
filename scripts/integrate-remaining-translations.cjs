/**
 * integrate-remaining-translations.cjs
 *
 * Integrates English translations from HTML files into existing reader JSON files
 * for three books:
 *   1. Alim LiTrufa (letters 152-477)
 *   2. Likutay Tefilos (prayers 30-152 part 1, prayers 1-59 part 2)
 *   3. Chayey Moharan (chapters 3-6 + articles + intro)
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const READER_BASE = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/reader';

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Strip HTML tags, decode entities, normalize whitespace
 */
function cleanText(html) {
  if (!html) return '';
  // Remove HTML tags
  let text = html.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&middot;/g, '\u00B7');
  text = text.replace(/&mdash;/g, '\u2014');
  text = text.replace(/&ndash;/g, '\u2013');
  text = text.replace(/&rsquo;/g, '\u2019');
  text = text.replace(/&lsquo;/g, '\u2018');
  text = text.replace(/&rdquo;/g, '\u201D');
  text = text.replace(/&ldquo;/g, '\u201C');
  text = text.replace(/&hellip;/g, '\u2026');
  text = text.replace(/&#\d+;/g, (m) => {
    const code = parseInt(m.slice(2, -1));
    return String.fromCharCode(code);
  });
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Check if text is primarily Hebrew (contains Hebrew unicode chars)
 */
function isHebrew(text) {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && (hebrewChars / totalChars) > 0.3;
}

/**
 * Distribute English paragraphs across Hebrew segments.
 * Strategy: proportional distribution based on Hebrew segment length.
 */
function distributeEnglish(segments, englishParagraphs) {
  if (!englishParagraphs || englishParagraphs.length === 0) return segments;
  if (!segments || segments.length === 0) return segments;

  // Filter out paragraphs that are mostly Hebrew or very short metadata
  const filtered = englishParagraphs.filter(p => {
    if (!p || p.length < 5) return false;
    if (isHebrew(p)) return false;
    return true;
  });

  if (filtered.length === 0) return segments;

  // If exact match, 1:1
  if (filtered.length === segments.length) {
    for (let i = 0; i < segments.length; i++) {
      segments[i].en = filtered[i];
    }
    return segments;
  }

  // If fewer English paragraphs than segments, distribute proportionally
  if (filtered.length < segments.length) {
    // Calculate Hebrew text lengths for proportional distribution
    const heLens = segments.map(s => (s.he || '').length);
    const totalHeLen = heLens.reduce((a, b) => a + b, 0);

    if (totalHeLen === 0) {
      // Fallback: just assign to first N segments
      for (let i = 0; i < filtered.length && i < segments.length; i++) {
        segments[i].en = filtered[i];
      }
      return segments;
    }

    // Map each English paragraph to segment ranges proportionally
    let enIdx = 0;
    let cumHe = 0;
    const targetPerEn = totalHeLen / filtered.length;

    for (let i = 0; i < segments.length && enIdx < filtered.length; i++) {
      if (!segments[i].en || segments[i].en.trim() === '') {
        segments[i].en = filtered[enIdx];
      } else {
        // Already has English, append
        segments[i].en = segments[i].en + ' ' + filtered[enIdx];
      }
      cumHe += heLens[i];
      // Move to next English paragraph when we've passed the proportional threshold
      if (cumHe >= targetPerEn * (enIdx + 1) && enIdx < filtered.length - 1) {
        enIdx++;
      }
    }
    return segments;
  }

  // If more English paragraphs than segments, merge extras into segments
  const ratio = filtered.length / segments.length;
  for (let i = 0; i < segments.length; i++) {
    const startIdx = Math.floor(i * ratio);
    const endIdx = Math.floor((i + 1) * ratio);
    const merged = filtered.slice(startIdx, endIdx).join(' ');
    segments[i].en = merged;
  }
  return segments;
}

// ═══════════════════════════════════════════════════════════
// ALIM LITRUFA
// ═══════════════════════════════════════════════════════════

function processAlimLitrufa() {
  console.log('\n=== ALIM LITRUFA ===');

  const folders = [
    'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ulim litrufa 152-226',
    'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ulim litrufa 227-376',
    'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ulim litrufa 377-',
  ];

  let processed = 0;
  let skipped = 0;
  let notFound = 0;

  for (const folder of folders) {
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.html'));

    for (const file of files) {
      // Extract letter number from filename like ullim_letroofah_letter_152.html
      const match = file.match(/letter_(\d+)/);
      if (!match) {
        console.log(`  SKIP: Cannot extract letter number from ${file}`);
        skipped++;
        continue;
      }
      const letterNum = parseInt(match[1]);

      // Find the JSON file - try all parts
      let jsonPath = null;
      for (let p = 1; p <= 6; p++) {
        const candidate = path.join(READER_BASE, 'alim-litrufa', `part-${p}`, `letter-${letterNum}.json`);
        if (fs.existsSync(candidate)) {
          jsonPath = candidate;
          break;
        }
      }

      if (!jsonPath) {
        console.log(`  NOT FOUND: No JSON for letter ${letterNum}`);
        notFound++;
        continue;
      }

      // Parse HTML
      const html = fs.readFileSync(path.join(folder, file), 'utf8');
      const $ = cheerio.load(html);

      // Extract English paragraphs from the letter body
      const paragraphs = [];

      // Get text from .letter-body paragraphs (Alim LiTrufa format)
      $('.letter-body p, .letter-body .selichos-block p, .closing p').each((_, el) => {
        const text = cleanText($(el).html());
        if (text && text.length > 10 && !isHebrew(text)) {
          paragraphs.push(text);
        }
      });

      // Also try .addressee if present
      const addressee = cleanText($('.addressee').html());
      if (addressee && !isHebrew(addressee) && addressee.length > 5) {
        paragraphs.unshift(addressee);
      }

      // Also get translator section overview if useful
      const overview = [];
      $('.translator-section p').each((_, el) => {
        const text = cleanText($(el).html());
        if (text && text.startsWith('Overview:')) {
          overview.push(text);
        }
      });

      if (paragraphs.length === 0) {
        console.log(`  EMPTY: No English found in ${file}`);
        skipped++;
        continue;
      }

      // Read JSON and distribute
      const json = readJson(jsonPath);
      if (!json || !json.segments) {
        console.log(`  ERROR: Invalid JSON for letter ${letterNum}`);
        skipped++;
        continue;
      }

      // Clear existing en fields (they may have wrong overview content)
      for (const seg of json.segments) {
        seg.en = '';
      }

      // If we have an overview, put it in the first segment
      if (overview.length > 0) {
        // We'll append the overview at the end of the last segment later
      }

      distributeEnglish(json.segments, paragraphs);

      // Append overview to last segment if we have one
      if (overview.length > 0 && json.segments.length > 0) {
        const lastSeg = json.segments[json.segments.length - 1];
        lastSeg.en = (lastSeg.en ? lastSeg.en + ' ' : '') + overview.join(' ');
      }

      json.hasEnglish = true;
      writeJson(jsonPath, json);
      processed++;
    }
  }

  console.log(`  Processed: ${processed}, Skipped: ${skipped}, Not found: ${notFound}`);
  return processed;
}

// ═══════════════════════════════════════════════════════════
// LIKUTAY TEFILOS
// ═══════════════════════════════════════════════════════════

function processLikutayTefilos() {
  console.log('\n=== LIKUTAY TEFILOS ===');

  const folders = [
    { path: 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Lekutay Tefilos 1', part: 1 },
    { path: 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Tefilos 2', part: 2 },
  ];

  let processed = 0;
  let skipped = 0;

  for (const { path: folder, part } of folders) {
    const files = fs.readdirSync(folder).filter(f => f.endsWith('.html'));

    for (const file of files) {
      console.log(`  Processing: ${file}`);

      const html = fs.readFileSync(path.join(folder, file), 'utf8');
      const $ = cheerio.load(html);

      // LT files can contain multiple prayers
      // Extract prayer numbers from filename
      // Formats: likutay_tefilos_30_prayer30.html, likutay_tefilos_32_33_34_prayers32_33_34.html
      //          likutay_tefilos_b2_prayers1_3.html, likutay_tefilos_108_152_complete.html
      //          likutay_tefilos_81_92.html

      // For single-prayer files (like prayer30.html), extract paragraphs from .para elements
      // For multi-prayer files, we need to split by prayer boundaries

      // Strategy: collect all .para div elements - each contains one English paragraph
      // The .prayer-heading and .date-bar elements separate sections within a prayer
      // For multi-prayer files, look for prayer number indicators

      // Check if file has multiple prayers by looking at the filename pattern
      const isMultiPrayer = file.includes('prayers') || file.includes('complete') ||
                            (file.match(/_(\d+)_(\d+)/) && !file.includes('prayer'));

      if (isMultiPrayer) {
        // Multi-prayer file: need to figure out which prayers are in it and split content
        processMultiPrayerFile($, file, part);
        processed++;
      } else {
        // Single prayer file
        const prayerMatch = file.match(/prayer(\d+)/);
        if (!prayerMatch) {
          console.log(`    SKIP: Cannot extract prayer number from ${file}`);
          skipped++;
          continue;
        }
        const prayerNum = parseInt(prayerMatch[1]);
        const paragraphs = extractLTParagraphs($);

        if (paragraphs.length === 0) {
          console.log(`    EMPTY: No English paragraphs found`);
          skipped++;
          continue;
        }

        updateLTJson(prayerNum, part, paragraphs);
        processed++;
      }
    }
  }

  console.log(`  Processed: ${processed}, Skipped: ${skipped}`);
  return processed;
}

function extractLTParagraphs($) {
  const paragraphs = [];
  $('.para').each((_, el) => {
    // Get the direct p child text, excluding the hidden Hebrew div
    const $el = $(el);
    const $p = $el.find('> p');
    if ($p.length) {
      // Get the HTML of p, but remove the heb-btn span and heb-text div
      const $clone = $p.clone();
      $clone.find('.heb-btn').remove();
      const text = cleanText($clone.html());
      if (text && text.length > 10 && !isHebrew(text)) {
        paragraphs.push(text);
      }
    }
  });
  return paragraphs;
}

function processMultiPrayerFile($, file, partNum) {
  // For multi-prayer files, we need to identify individual prayer sections
  // Look for prayer headings or split points

  // Collect all top-level content elements in order
  const elements = [];
  const wrapper = $('.wrapper').length ? '.wrapper' : 'body';

  $(wrapper).children().each((_, el) => {
    const $el = $(el);
    const cls = $el.attr('class') || '';
    const id = $el.attr('id') || '';

    if (cls.includes('prayer-heading') || cls.includes('prayer-section') ||
        id.match(/^prayer-?(\d+)/i)) {
      // New prayer boundary
      const numMatch = ($el.text() + ' ' + id).match(/(\d+)/);
      if (numMatch) {
        elements.push({ type: 'prayer-start', num: parseInt(numMatch[1]) });
      }
    } else if (cls === 'para') {
      const $p = $el.find('> p');
      if ($p.length) {
        const $clone = $p.clone();
        $clone.find('.heb-btn').remove();
        const text = cleanText($clone.html());
        if (text && text.length > 10 && !isHebrew(text)) {
          elements.push({ type: 'paragraph', text });
        }
      }
    }
  });

  // If we found prayer boundaries, group paragraphs by prayer
  if (elements.filter(e => e.type === 'prayer-start').length > 0) {
    let currentPrayer = null;
    const prayerGroups = {};

    for (const el of elements) {
      if (el.type === 'prayer-start') {
        currentPrayer = el.num;
        if (!prayerGroups[currentPrayer]) prayerGroups[currentPrayer] = [];
      } else if (el.type === 'paragraph' && currentPrayer !== null) {
        prayerGroups[currentPrayer].push(el.text);
      }
    }

    for (const [numStr, paragraphs] of Object.entries(prayerGroups)) {
      if (paragraphs.length > 0) {
        updateLTJson(parseInt(numStr), partNum, paragraphs);
      }
    }
  } else {
    // No clear prayer boundaries - try to extract prayer numbers from filename
    // and distribute all paragraphs across them
    const allParas = extractLTParagraphs($);
    if (allParas.length === 0) return;

    // Extract prayer range from filename
    // likutay_tefilos_108_152_complete.html -> 108 to 152
    // likutay_tefilos_81_92.html -> 81 to 92
    // likutay_tefilos_b2_prayers1_3.html -> 1 to 3
    let startNum, endNum;
    const rangeMatch = file.match(/(\d+)_(\d+)/);
    if (file.includes('b2_prayers')) {
      const m = file.match(/prayers(\d+)_(\d+)/);
      if (m) { startNum = parseInt(m[1]); endNum = parseInt(m[2]); }
    } else if (rangeMatch) {
      startNum = parseInt(rangeMatch[1]);
      endNum = parseInt(rangeMatch[2]);
    }

    if (startNum && endNum) {
      // Try to find article/section dividers in the HTML to split
      const prayerSections = extractPrayerSections($, startNum, endNum);
      if (Object.keys(prayerSections).length > 0) {
        for (const [numStr, paragraphs] of Object.entries(prayerSections)) {
          if (paragraphs.length > 0) {
            updateLTJson(parseInt(numStr), partNum, paragraphs);
          }
        }
      } else {
        // Just distribute evenly across the range
        const count = endNum - startNum + 1;
        const parasPerPrayer = Math.ceil(allParas.length / count);
        for (let i = startNum; i <= endNum; i++) {
          const start = (i - startNum) * parasPerPrayer;
          const end = Math.min(start + parasPerPrayer, allParas.length);
          const slice = allParas.slice(start, end);
          if (slice.length > 0) {
            updateLTJson(i, partNum, slice);
          }
        }
      }
    }
  }
}

function extractPrayerSections($, startNum, endNum) {
  const sections = {};
  let currentPrayer = startNum;
  let currentParas = [];

  // Look for prayer number indicators in the content
  // Common patterns: "Prayer N", "תפלה N", section headers with numbers
  const wrapper = $('.wrapper').length ? '.wrapper' : 'body';

  $(wrapper).children().each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const cls = $el.attr('class') || '';

    // Check for prayer number indicator
    const prayerNumMatch = text.match(/Prayer\s+(?:Number\s+)?(\d+)/i) ||
                           text.match(/^(\d+)\.\s/) ||
                           text.match(/תפלה\s+(\S+)/);

    if (prayerNumMatch || cls.includes('prayer-heading') || cls.includes('sep')) {
      // Try to extract a number
      let num = null;
      if (prayerNumMatch && prayerNumMatch[1]) {
        num = parseInt(prayerNumMatch[1]);
      }

      if (num && num >= startNum && num <= endNum) {
        // Save previous prayer's paragraphs
        if (currentParas.length > 0) {
          sections[currentPrayer] = currentParas;
        }
        currentPrayer = num;
        currentParas = [];
      }
    }

    // Collect paragraph content
    if (cls === 'para') {
      const $p = $el.find('> p');
      if ($p.length) {
        const $clone = $p.clone();
        $clone.find('.heb-btn').remove();
        const cleaned = cleanText($clone.html());
        if (cleaned && cleaned.length > 10 && !isHebrew(cleaned)) {
          currentParas.push(cleaned);
        }
      }
    }
  });

  // Don't forget the last prayer
  if (currentParas.length > 0) {
    sections[currentPrayer] = currentParas;
  }

  return sections;
}

function updateLTJson(prayerNum, partNum, paragraphs) {
  // Try prayer-N.json first, then torah-N.json
  const partDir = path.join(READER_BASE, 'likutay-tefilos', `part-${partNum}`);
  let jsonPath = path.join(partDir, `prayer-${prayerNum}.json`);
  if (!fs.existsSync(jsonPath)) {
    jsonPath = path.join(partDir, `torah-${prayerNum}.json`);
  }
  if (!fs.existsSync(jsonPath)) {
    // Try other parts
    for (let p = 1; p <= 3; p++) {
      const altDir = path.join(READER_BASE, 'likutay-tefilos', `part-${p}`);
      const altPath = path.join(altDir, `prayer-${prayerNum}.json`);
      if (fs.existsSync(altPath)) { jsonPath = altPath; break; }
      const altPath2 = path.join(altDir, `torah-${prayerNum}.json`);
      if (fs.existsSync(altPath2)) { jsonPath = altPath2; break; }
    }
  }

  if (!fs.existsSync(jsonPath)) {
    console.log(`    NOT FOUND: No JSON for prayer ${prayerNum} part ${partNum}`);
    return;
  }

  const json = readJson(jsonPath);
  if (!json || !json.segments) {
    console.log(`    ERROR: Invalid JSON for prayer ${prayerNum}`);
    return;
  }

  // Clear existing en fields
  for (const seg of json.segments) {
    seg.en = '';
  }

  distributeEnglish(json.segments, paragraphs);
  json.hasEnglish = true;
  writeJson(jsonPath, json);
  console.log(`    Updated prayer ${prayerNum} (${json.segments.length} segs, ${paragraphs.length} paras)`);
}

// ═══════════════════════════════════════════════════════════
// CHAYEY MOHARAN
// ═══════════════════════════════════════════════════════════

function processChayeyMoharan() {
  console.log('\n=== CHAYEY MOHARAN ===');

  const folder = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Chayay Moharan';
  const files = fs.readdirSync(folder).filter(f => f.endsWith('.html'));

  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    console.log(`  Processing: ${file}`);

    const html = fs.readFileSync(path.join(folder, file), 'utf8');
    const $ = cheerio.load(html);

    if (file === 'hashmatos_toc.html') {
      // Table of contents - skip for now
      console.log(`    SKIP: TOC file`);
      skipped++;
      continue;
    }

    // Determine which chapter this maps to
    const chapterMatch = file.match(/chayay_moharan_(\d+)/);
    if (chapterMatch) {
      const chapterNum = parseInt(chapterMatch[1]);
      processCMChapter($, chapterNum);
      processed++;
    } else if (file.includes('articles')) {
      // Articles file - maps to specific chapters based on article numbers
      processCMArticles($);
      processed++;
    } else if (file.includes('intro')) {
      processCMIntro($);
      processed++;
    } else {
      console.log(`    SKIP: Unknown file type ${file}`);
      skipped++;
    }
  }

  console.log(`  Processed: ${processed}, Skipped: ${skipped}`);
  return processed;
}

function processCMChapter($, chapterNum) {
  const jsonPath = path.join(READER_BASE, 'chayey-moharan', `chapter-${chapterNum}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.log(`    NOT FOUND: No JSON for chapter ${chapterNum}`);
    return;
  }

  const json = readJson(jsonPath);
  if (!json || !json.segments) {
    console.log(`    ERROR: Invalid JSON for chapter ${chapterNum}`);
    return;
  }

  // Extract articles with their numbers and English text
  const articles = {};
  $('.article').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('id') || '';
    const numMatch = id.match(/article-(\d+)/) ||
                     $el.find('.article-number').text().match(/(\d+)/);
    if (!numMatch) return;

    const articleNum = parseInt(numMatch[1]);
    const paragraphs = [];

    $el.find('.article-body p, .transcriber-note p, .addendum p').each((_, p) => {
      const text = cleanText($(p).html());
      if (text && text.length > 5 && !isHebrew(text)) {
        paragraphs.push(text);
      }
    });

    if (paragraphs.length > 0) {
      articles[articleNum] = paragraphs.join(' ');
    }
  });

  if (Object.keys(articles).length === 0) {
    console.log(`    WARNING: No articles extracted from chapter ${chapterNum}`);
    return;
  }

  // Match articles to segments by looking for article numbers in Hebrew text
  let matched = 0;
  for (const seg of json.segments) {
    const heText = seg.he || '';
    // Look for article number pattern like (60) or (א) at the start
    const numMatch = heText.match(/^\((\d+)\)/);
    if (numMatch) {
      const artNum = parseInt(numMatch[1]);
      if (articles[artNum]) {
        seg.en = articles[artNum];
        matched++;
      }
    }
  }

  // If matching by number in Hebrew text didn't work well, try sequential matching
  if (matched < Object.keys(articles).length / 2) {
    console.log(`    Low match rate (${matched}/${Object.keys(articles).length}), trying sequential...`);
    // Sort articles by number
    const sortedNums = Object.keys(articles).map(Number).sort((a, b) => a - b);

    // Find segments that contain article markers
    const articleSegments = [];
    for (let i = 0; i < json.segments.length; i++) {
      const he = json.segments[i].he || '';
      // Match Hebrew article markers like (א), (ב), or actual numbers (1), (2), (60)
      if (he.match(/^\([א-ת"]+\)/) || he.match(/^\(\d+\)/)) {
        articleSegments.push(i);
      }
    }

    if (articleSegments.length > 0 && sortedNums.length > 0) {
      // Try to align: find the segment index where the first article number appears
      for (let ai = 0; ai < sortedNums.length && ai < articleSegments.length; ai++) {
        const segIdx = articleSegments[ai];
        const artNum = sortedNums[ai];
        if (articles[artNum]) {
          json.segments[segIdx].en = articles[artNum];
          matched++;
        }
      }
    }
  }

  json.hasEnglish = true;
  writeJson(jsonPath, json);
  console.log(`    Updated chapter ${chapterNum}: ${matched} articles matched to ${json.segments.length} segments`);
}

function processCMArticles($) {
  // The articles file (chayay_moharan_articles.html) may contain articles
  // that map to a specific chapter. Let's see what article range it covers.
  const firstArticle = $($('.article-number').first()).text().match(/(\d+)/);
  const lastArticle = $($('.article-number').last()).text().match(/(\d+)/);

  if (firstArticle && lastArticle) {
    console.log(`    Articles range: ${firstArticle[1]} to ${lastArticle[1]}`);
  }

  // Process as chapter 3 (articles file covers sections that map to chapter 3)
  // Check the file header to confirm
  const title = $('.file-header h1').text() || '';
  const subtitle = $('.file-header .sub').text() || '';
  console.log(`    Title: ${title}`);
  console.log(`    Subtitle: ${subtitle}`);

  // Process articles and try to match to the right chapter
  // Based on our sample, chayay_moharan_3.html title is "Articles 60-103"
  // and the standalone articles file title says "The Life of Our Leader..."

  // Extract all articles
  const articles = {};
  $('.article').each((_, el) => {
    const $el = $(el);
    const id = $el.attr('id') || '';
    const numMatch = id.match(/article-(\d+)/) ||
                     $el.find('.article-number').text().match(/(\d+)/);
    if (!numMatch) return;

    const articleNum = parseInt(numMatch[1]);
    const paragraphs = [];

    $el.find('.article-body p, .transcriber-note p, .addendum p').each((_, p) => {
      const text = cleanText($(p).html());
      if (text && text.length > 5 && !isHebrew(text)) {
        paragraphs.push(text);
      }
    });

    if (paragraphs.length > 0) {
      articles[articleNum] = paragraphs.join(' ');
    }
  });

  console.log(`    Extracted ${Object.keys(articles).length} articles`);

  // Try to match to chapters by article number ranges
  // CM chapter structure from the reader:
  // Chapter 3 appears to have articles numbered by Hebrew letters/numbers
  // We need to check each chapter's segments for matching article numbers

  for (let ch = 1; ch <= 12; ch++) {
    const jsonPath = path.join(READER_BASE, 'chayey-moharan', `chapter-${ch}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const json = readJson(jsonPath);
    if (!json || !json.segments) continue;

    let matched = 0;
    for (const seg of json.segments) {
      const he = seg.he || '';
      const numMatch = he.match(/^\((\d+)\)/);
      if (numMatch) {
        const artNum = parseInt(numMatch[1]);
        if (articles[artNum]) {
          seg.en = articles[artNum];
          matched++;
          delete articles[artNum]; // Remove so we don't double-assign
        }
      }
    }

    if (matched > 0) {
      json.hasEnglish = true;
      writeJson(jsonPath, json);
      console.log(`    Chapter ${ch}: matched ${matched} articles`);
    }
  }

  const remaining = Object.keys(articles).length;
  if (remaining > 0) {
    console.log(`    ${remaining} articles unmatched`);
  }
}

function processCMIntro($) {
  // Intro maps to chapter-1 or a dedicated intro file
  const jsonPath = path.join(READER_BASE, 'chayey-moharan', 'chapter-1.json');
  if (!fs.existsSync(jsonPath)) {
    console.log(`    NOT FOUND: No JSON for intro (chapter-1)`);
    return;
  }

  const json = readJson(jsonPath);
  if (!json || !json.segments) {
    console.log(`    ERROR: Invalid JSON for intro`);
    return;
  }

  // Extract English paragraphs from the intro HTML
  const paragraphs = [];
  $('p, .intro-body p, .article-body p').each((_, el) => {
    const text = cleanText($(el).html());
    if (text && text.length > 20 && !isHebrew(text)) {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length === 0) {
    console.log(`    EMPTY: No English paragraphs in intro`);
    return;
  }

  // Clear existing en
  for (const seg of json.segments) {
    seg.en = '';
  }

  distributeEnglish(json.segments, paragraphs);
  json.hasEnglish = true;
  writeJson(jsonPath, json);
  console.log(`    Updated intro: ${paragraphs.length} paragraphs -> ${json.segments.length} segments`);
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

function main() {
  console.log('Integrating remaining English translations...\n');

  // Check cheerio is available
  try {
    require('cheerio');
  } catch (e) {
    console.error('ERROR: cheerio not installed. Run: npm install cheerio');
    process.exit(1);
  }

  const alCount = processAlimLitrufa();
  const ltCount = processLikutayTefilos();
  const cmCount = processChayeyMoharan();

  console.log(`\n=== SUMMARY ===`);
  console.log(`Alim LiTrufa: ${alCount} files processed`);
  console.log(`Likutay Tefilos: ${ltCount} files processed`);
  console.log(`Chayey Moharan: ${cmCount} files processed`);
  console.log('Done!');
}

main();
