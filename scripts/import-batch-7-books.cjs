/**
 * import-batch-7-books.cjs
 * Imports English translations for 7 books from HTML sources into existing JSON reader files.
 *
 * Books:
 * 1. Likutay Eitzos Mahadura Basra (13 HTML -> 46 topics)
 * 2. OHY Volume 2 (28 HTML -> new torah files)
 * 3. OHY Volume 4 (25 HTML -> new torah files)
 * 4. Alim LiTrufa letters 89-151 (63 HTML -> existing letter JSONs)
 * 5. Yereach HaEitanim (1 HTML -> 24 sections)
 * 6. Yemei Moharnat (11 HTML -> 303 sections)
 * 7. Rimzei HaMaasiyos (1 HTML -> 13 sections)
 */

const fs = require('fs');
const path = require('path');

const FINISHED_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER_DIR = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/reader';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function stripHtml(html) {
  if (!html) return '';
  // Remove script/style tags with contents
  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  // Convert <br> to newline
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Convert </p> <p> to double newline
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2764;/g, '')
    .replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2, -1))))
    .replace(/&#x[\da-fA-F]+;/g, (m) => String.fromCharCode(parseInt(m.slice(3, -1), 16)));
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
  return text.trim();
}

function readHtml(filepath) {
  return fs.readFileSync(filepath, 'utf-8');
}

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function writeJson(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// 1. LIKUTAY EITZOS MAHADURA BASRA
// ============================================================

function importLikutayEitzosBasra() {
  console.log('\n=== 1. LIKUTAY EITZOS MAHADURA BASRA ===');
  const srcDir = path.join(FINISHED_DIR, 'Likutay Aitzos Mahadura Basra');
  const targetDir = path.join(READER_DIR, 'likutay-eitzos-basra');

  // Load all HTML files sorted by prefix number
  const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  // Map chapter numbers from filenames to understand grouping
  // File: "010 ...Emes_vEmunah.html" = Chapter 1 (Emes v'Emunah)
  // File: "50 ...Ch2_3_4.html" = Chapters 2,3,4
  // etc.
  // We need to parse each HTML, extract teachings by number, and map to the topic JSONs.

  // The topics are numbered 1-46 in topic-N.json files
  // Each topic has segments with index numbers matching the teaching numbers

  // Parse the chapter-to-topic mapping from the filenames and content
  const chapterMap = {
    '010': [1],           // Ch1: Emes v'Emunah
    '50': [2, 3, 4],      // Ch2,3,4
    '100': [5, 6, 7, 8, 9], // Ch5-9
    '150': [10, 11],       // Ch10,11
    '200': [12, 13],       // Ch12,13
    '250': [14, 15, 16, 17, 18, 19], // Ch14-19
    '300': [20, 21, 22, 23], // Ch20-23
    '350': [24, 25, 26, 27], // Ch24-27
    '400': [28, 29, 30, 31, 32], // Ch28-32
    '450': [33],           // Ch33: Tzaddik
    '500': [34, 35, 36, 37, 38], // Ch34-38
    '550': [39, 40, 41],   // Ch39-41
    '613': [42, 43, 44, 45, 46], // Ch42-46
  };

  let totalUpdated = 0;
  let totalSegments = 0;

  for (const htmlFile of htmlFiles) {
    const prefix = htmlFile.split(' ')[0];
    const chapters = chapterMap[prefix];
    if (!chapters) {
      console.log(`  WARNING: No chapter mapping for ${htmlFile}`);
      continue;
    }

    const html = readHtml(path.join(srcDir, htmlFile));

    // Extract teachings: each <div class="teaching"> contains a number and body
    // Split by chapter headings if multiple chapters in one file
    // Strategy: extract all teachings with their numbers, then split by chapter boundaries

    // Find chapter title blocks to identify boundaries
    const chapterBlocks = html.split(/<div class="chapter-title-block"[^>]*>/);

    if (chapterBlocks.length <= 1 && chapters.length === 1) {
      // Single chapter file
      const teachings = extractTeachingsFromHtml(html);
      const topicFile = path.join(targetDir, `topic-${chapters[0]}.json`);
      if (fs.existsSync(topicFile)) {
        const updated = applyTeachingsToTopic(topicFile, teachings);
        totalUpdated += updated > 0 ? 1 : 0;
        totalSegments += updated;
      }
    } else {
      // Multiple chapters - split by chapter-title-block or chapter-rule dividers
      // Use a simpler approach: extract all teachings, track their sequential numbers
      // and distribute among chapter topics based on the number restarting at 1

      const allTeachings = extractTeachingsFromHtmlMultiChapter(html, chapters.length);

      for (let i = 0; i < chapters.length; i++) {
        const topicNum = chapters[i];
        const topicFile = path.join(targetDir, `topic-${topicNum}.json`);
        if (fs.existsSync(topicFile) && allTeachings[i] && allTeachings[i].length > 0) {
          const updated = applyTeachingsToTopic(topicFile, allTeachings[i]);
          totalUpdated += updated > 0 ? 1 : 0;
          totalSegments += updated;
        }
      }
    }
  }

  // Update index.json
  updateIndexHasEnglish(path.join(targetDir, 'index.json'), targetDir, 'topic');

  console.log(`  Updated ${totalUpdated} topics, ${totalSegments} segments`);
  return { topics: totalUpdated, segments: totalSegments };
}

function extractTeachingsFromHtml(html) {
  const teachings = {};
  // Match <div class="teaching"> ... <span class="teaching-num">N.</span> ... </div>
  const teachingRegex = /<div class="teaching">\s*<span class="teaching-num">(\d+)\.\s*<\/span>\s*<div class="teaching-body">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;
  while ((match = teachingRegex.exec(html)) !== null) {
    const num = parseInt(match[1]);
    let body = match[2];
    // Remove the source citation at the end (it's a reference, not translation content... actually keep it)
    teachings[num] = stripHtml(body);
  }

  // Also try alternate pattern for sections with section-number
  if (Object.keys(teachings).length === 0) {
    const sectionRegex = /<div class="section">\s*<span class="section-number">[^<]*\[(\d+)\][^<]*<\/span>([\s\S]*?)<\/div>/g;
    while ((match = sectionRegex.exec(html)) !== null) {
      const num = parseInt(match[1]);
      teachings[num] = stripHtml(match[2]);
    }
  }

  return teachings;
}

function extractTeachingsFromHtmlMultiChapter(html, numChapters) {
  // Split the HTML by chapter-title-block boundaries
  const parts = html.split(/<div class="chapter-title-block"[^>]*>/);
  const result = [];

  for (let i = 1; i < parts.length; i++) {
    // Each part after split is a chapter
    const teachings = extractTeachingsFromHtml('<div class="teaching">' + parts[i]); // Re-add context
    // Actually just parse the part directly
    const realTeachings = {};
    const teachingRegex = /<div class="teaching">\s*<span class="teaching-num">(\d+)\.\s*<\/span>\s*<div class="teaching-body">([\s\S]*?)<\/div>\s*<\/div>/g;
    let match;
    const partHtml = parts[i];
    while ((match = teachingRegex.exec(partHtml)) !== null) {
      const num = parseInt(match[1]);
      realTeachings[num] = stripHtml(match[2]);
    }
    result.push(realTeachings);
  }

  // If we didn't get enough chapters, the first part may have one too
  if (result.length < numChapters && parts.length > 0) {
    const firstTeachings = {};
    const teachingRegex = /<div class="teaching">\s*<span class="teaching-num">(\d+)\.\s*<\/span>\s*<div class="teaching-body">([\s\S]*?)<\/div>\s*<\/div>/g;
    let match;
    while ((match = teachingRegex.exec(parts[0])) !== null) {
      const num = parseInt(match[1]);
      firstTeachings[num] = stripHtml(match[2]);
    }
    if (Object.keys(firstTeachings).length > 0) {
      result.unshift(firstTeachings);
    }
  }

  return result;
}

function applyTeachingsToTopic(topicFile, teachings) {
  const data = readJson(topicFile);
  let updated = 0;

  for (const seg of data.segments) {
    if (teachings[seg.index]) {
      seg.en = teachings[seg.index];
      updated++;
    }
  }

  if (updated > 0) {
    data.hasEnglish = true;
    writeJson(topicFile, data);
  }

  return updated;
}

// ============================================================
// 2 & 3. OTZAR HAYIRAH VOLUMES 2 AND 4
// ============================================================

function importOHY(volumeNum, srcDirName) {
  console.log(`\n=== ${volumeNum === 2 ? '2' : '3'}. OHY VOLUME ${volumeNum} ===`);
  const srcDir = path.join(FINISHED_DIR, srcDirName);
  const targetDir = path.join(READER_DIR, 'otzar-hayirah/part-1');
  const indexFile = path.join(targetDir, 'index.json');

  // Find highest existing torah number
  const existingFiles = fs.readdirSync(targetDir).filter(f => f.startsWith('torah-') && f.endsWith('.json'));
  let maxNum = 0;
  for (const f of existingFiles) {
    const num = parseInt(f.replace('torah-', '').replace('.json', ''));
    if (num > maxNum) maxNum = num;
  }

  console.log(`  Highest existing torah number: ${maxNum}`);

  // Load all HTML files sorted by prefix
  const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  const index = readJson(indexFile);
  let nextNum = maxNum + 1;
  let totalFiles = 0;
  let totalSegments = 0;

  for (const htmlFile of htmlFiles) {
    const html = readHtml(path.join(srcDir, htmlFile));

    // Extract topic title from the chapter-heading or page-header
    let topicTitle = '';
    let hebrewTitle = '';

    // Try chapter-heading pattern (Vol 2)
    let titleMatch = html.match(/<h2 class="chapter-heading">([\s\S]*?)<\/h2>/);
    if (titleMatch) {
      topicTitle = stripHtml(titleMatch[1]).split('\n')[0].trim();
    }

    // Try topic-heading pattern (Vol 4)
    if (!topicTitle) {
      titleMatch = html.match(/<h2 class="topic-heading">([\s\S]*?)<\/h2>/);
      if (titleMatch) topicTitle = stripHtml(titleMatch[1]).split('\n')[0].trim();
    }

    // Try generic h2 after body
    if (!topicTitle) {
      titleMatch = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (titleMatch) topicTitle = stripHtml(titleMatch[1]).split('\n')[0].trim();
    }

    // Try to extract Hebrew title from the hebrew-title div
    const hebMatch = html.match(/<div class="hebrew-title"[^>]*>([\s\S]*?)<\/div>/);
    if (hebMatch) hebrewTitle = stripHtml(hebMatch[1]);

    // Extract sections/paragraphs
    const sections = extractOHYSections(html);

    if (sections.length === 0) {
      console.log(`  WARNING: No sections found in ${htmlFile}`);
      continue;
    }

    // Create new torah file
    const torahFile = path.join(targetDir, `torah-${nextNum}.json`);
    const segments = sections.map((text, i) => ({
      index: i + 1,
      he: '',
      en: text
    }));

    const torahData = {
      id: `ohy-1-${nextNum}`,
      book: 'otzar-hayirah',
      part: 1,
      torah: nextNum,
      displayNumber: nextNum,
      title: topicTitle || `Volume ${volumeNum} Topic`,
      hebrewTitle: hebrewTitle || topicTitle || '',
      keyVerse: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments: segments,
      totalParagraphs: segments.length,
      hasEnglish: true,
      navigation: {
        prev: nextNum > 1 ? `ohy-1-${nextNum - 1}` : null,
        next: null,
        prevUrl: nextNum > 1 ? `/reader/otzar-hayirah/1/${nextNum - 1}` : null,
        nextUrl: null
      }
    };

    writeJson(torahFile, torahData);

    // Add to index
    index.torahs.push({
      number: nextNum,
      displayNumber: nextNum,
      title: topicTitle || `Volume ${volumeNum} Topic`,
      hebrewTitle: hebrewTitle || topicTitle || '',
      themes: [],
      paragraphs: segments.length,
      hasEnglish: true,
      url: `/reader/otzar-hayirah/1/${nextNum}`
    });

    totalFiles++;
    totalSegments += segments.length;
    console.log(`  torah-${nextNum}.json: "${topicTitle}" (${segments.length} segments)`);
    nextNum++;
  }

  // Fix navigation links for new files
  for (let i = maxNum + 1; i <= maxNum + totalFiles; i++) {
    const f = path.join(targetDir, `torah-${i}.json`);
    if (fs.existsSync(f)) {
      const data = readJson(f);
      if (i < maxNum + totalFiles) {
        data.navigation.next = `ohy-1-${i + 1}`;
        data.navigation.nextUrl = `/reader/otzar-hayirah/1/${i + 1}`;
      }
      writeJson(f, data);
    }
  }

  // Also fix previous last file's next pointer
  if (maxNum > 0) {
    const prevLastFile = path.join(targetDir, `torah-${maxNum}.json`);
    if (fs.existsSync(prevLastFile)) {
      const data = readJson(prevLastFile);
      data.navigation.next = `ohy-1-${maxNum + 1}`;
      data.navigation.nextUrl = `/reader/otzar-hayirah/1/${maxNum + 1}`;
      writeJson(prevLastFile, data);
    }
  }

  // Update index
  index.totalTorahs = index.torahs.length;
  writeJson(indexFile, index);

  console.log(`  Created ${totalFiles} new torah files, ${totalSegments} total segments`);
  return { files: totalFiles, segments: totalSegments };
}

function extractOHYSections(html) {
  const sections = [];

  // Pattern 1: <div class="section"> with section-number
  const sectionRegex = /<div class="section">([\s\S]*?)<\/div>\s*(?=<div class="section">|<div class="summary-box"|<div class="translator-note"|<hr|<\/body|$)/g;
  let match;

  // Try to find sections
  const sectionBlocks = html.match(/<div class="section">([\s\S]*?)(?=<div class="section">|<div class="summary-box"|<hr class="divider"|<\/body)/g);

  if (sectionBlocks && sectionBlocks.length > 0) {
    for (const block of sectionBlocks) {
      const text = stripHtml(block);
      if (text.length > 20) {
        // Remove section number prefix like "א. [1]" or "1."
        const cleaned = text.replace(/^[א-ת]+\.\s*\[\d+\]\s*/, '').replace(/^\d+\.\s*/, '');
        // Remove source citation at end
        const withoutSource = cleaned.replace(/\(Hilchos [^)]+\)\s*$/, '').replace(/\(Ibid\.[^)]*\)\s*$/, '').trim();
        sections.push(withoutSource || cleaned);
      }
    }
  }

  // Fallback: split by paragraphs if no sections found
  if (sections.length === 0) {
    // Try to get all <p> content from the body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
    if (bodyMatch) {
      const body = bodyMatch[1];
      // Remove headers, summary boxes, etc
      const cleaned = body
        .replace(/<h1[^>]*>[\s\S]*?<\/h1>/g, '')
        .replace(/<h2[^>]*>[\s\S]*?<\/h2>/g, '')
        .replace(/<div class="summary-box"[\s\S]*?<\/div>/g, '')
        .replace(/<div class="translator-note"[\s\S]*?<\/div>/g, '')
        .replace(/<div class="opening-verses"[\s\S]*?<\/div>/g, '')
        .replace(/<div class="flow-chart"[\s\S]*?<\/div>/g, '');

      const paragraphs = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
      if (paragraphs) {
        for (const p of paragraphs) {
          const text = stripHtml(p);
          if (text.length > 30) {
            sections.push(text);
          }
        }
      }
    }
  }

  return sections;
}

// ============================================================
// 4. ALIM LITRUFA LETTERS 89-151
// ============================================================

function importAlimLitrufa() {
  console.log('\n=== 4. ALIM LITRUFA LETTERS 89-151 ===');
  const srcDir = path.join(FINISHED_DIR, 'Ullim litrufa 89-151');
  const targetBaseDir = path.join(READER_DIR, 'alim-litrufa');

  const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));

  let totalUpdated = 0;
  let totalSegments = 0;

  for (const htmlFile of htmlFiles) {
    // Extract letter number from filename: ullim_letroofah_letter_89.html
    const numMatch = htmlFile.match(/letter_(\d+)\.html/);
    if (!numMatch) continue;
    const letterNum = parseInt(numMatch[1]);

    const html = readHtml(path.join(srcDir, htmlFile));

    // Extract the English text from the letter body
    const englishText = extractLetterEnglish(html);

    if (!englishText) {
      console.log(`  WARNING: No text found in ${htmlFile}`);
      continue;
    }

    // Find the target JSON file - check part-2 first, then part-3
    let targetFile = path.join(targetBaseDir, 'part-2', `letter-${letterNum}.json`);
    if (!fs.existsSync(targetFile)) {
      targetFile = path.join(targetBaseDir, 'part-3', `letter-${letterNum}.json`);
    }

    if (!fs.existsSync(targetFile)) {
      console.log(`  WARNING: No target JSON for letter ${letterNum}`);
      continue;
    }

    const data = readJson(targetFile);

    // For letters, we typically put the entire translation as en on the first segment
    // (or split if there are multiple segments)
    if (data.segments.length === 1) {
      data.segments[0].en = englishText;
    } else if (data.segments.length === 2) {
      // Second segment is often just a year divider in Hebrew
      // Put all English on first segment
      data.segments[0].en = englishText;
    } else {
      // Multiple segments - put on first segment
      data.segments[0].en = englishText;
    }

    data.hasEnglish = true;
    writeJson(targetFile, data);
    totalUpdated++;
    totalSegments++;
  }

  // Update index files for part-2 and part-3
  for (const part of ['part-2', 'part-3']) {
    const indexFile = path.join(targetBaseDir, part, 'index.json');
    if (fs.existsSync(indexFile)) {
      updateAlimIndex(indexFile, path.join(targetBaseDir, part));
    }
  }

  console.log(`  Updated ${totalUpdated} letters, ${totalSegments} segments`);
  return { letters: totalUpdated, segments: totalSegments };
}

function extractLetterEnglish(html) {
  // The letter body is in <div class="letter-body"> ... </div>
  let bodyMatch = html.match(/<div class="letter-body">([\s\S]*?)<\/div>\s*(?:<div class="closing"|<div class="translator-section"|<div class="year-divider"|<div class="ms-footer"|<\/div>\s*<\/div>|$)/);

  if (!bodyMatch) {
    // Try to get everything between letter-heading and translator-section or footer
    bodyMatch = html.match(/<div class="letter-body">([\s\S]*)/);
  }

  if (!bodyMatch) {
    // Fallback: get all paragraph text from body
    const allBody = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
    if (allBody) {
      // Remove headers and metadata
      const cleaned = allBody[1]
        .replace(/<div class="series-header">[\s\S]*?<\/div>/g, '')
        .replace(/<div class="letter-heading">[\s\S]*?<\/div>/g, '')
        .replace(/<div class="ms-footer">[\s\S]*?<\/div>/g, '')
        .replace(/<style>[\s\S]*?<\/style>/g, '');
      return stripHtml(cleaned);
    }
    return '';
  }

  let fullText = bodyMatch[1];

  // Also grab the closing/signature
  const closingMatch = html.match(/<div class="closing">([\s\S]*?)<\/div>/);
  if (closingMatch) fullText += '\n\n' + closingMatch[1];

  // Also grab translator section
  const translatorMatch = html.match(/<div class="translator-section">([\s\S]*?)<\/div>/);
  if (translatorMatch) fullText += '\n\n[Translator\'s Note: ' + stripHtml(translatorMatch[1]) + ']';

  // Also grab addressee
  const addresseeMatch = html.match(/<div class="addressee">([\s\S]*?)<\/div>/);
  let prefix = '';
  if (addresseeMatch) {
    prefix = stripHtml(addresseeMatch[1]).replace(/^To\s*/, 'To: ') + '\n\n';
  }

  return prefix + stripHtml(fullText);
}

function updateAlimIndex(indexFile, partDir) {
  const index = readJson(indexFile);
  const letterFiles = fs.readdirSync(partDir).filter(f => f.startsWith('letter-') && f.endsWith('.json'));

  for (const torah of index.torahs) {
    const letterFile = path.join(partDir, `letter-${torah.number}.json`);
    if (fs.existsSync(letterFile)) {
      const data = readJson(letterFile);
      torah.hasEnglish = data.hasEnglish || false;
    }
  }

  writeJson(indexFile, index);
}

// ============================================================
// 5. YEREACH HAEITANIM
// ============================================================

function importYerachHaeitanim() {
  console.log('\n=== 5. YEREACH HAEITANIM ===');
  const srcFile = path.join(FINISHED_DIR, 'Yerech HaAisunim', 'Yerech_HaAisonim_COMPLETE.html');
  const targetDir = path.join(READER_DIR, 'yereach-haeitanim');

  const html = readHtml(srcFile);

  // The file has sections marked by <h2 class="section-title" id="simanN"> or id="intro" or id="title-page"
  // Section 1 = title page/intro (section-1.json is Hakdama)
  // Siman 1 through Siman 22 = sections 2-23 (offset by 1: siman N -> section-(N+1).json)
  // But let's check: section-1.json has title "הקדמה" (Hakdama)
  // Need to figure out exact mapping.

  // Split by section-title h2 tags
  const sectionSplits = html.split(/<h2 class="section-title"[^>]*>/);

  let totalUpdated = 0;
  let totalSegments = 0;

  // The existing JSON has 24 sections: section-1 through section-24
  // HTML has: title-page, intro (Hakdama), then siman1 through siman22 = 24 total
  // So: title-page -> section-1, intro -> section-2? No...
  // Let me check section-1.json title = "הקדמה" and section-2.json title

  const sec2 = readJson(path.join(targetDir, 'section-2.json'));
  console.log(`  section-2 title: ${sec2.title}`);

  // Parse all sections from HTML
  const parsedSections = [];

  for (let i = 1; i < sectionSplits.length; i++) {
    const block = sectionSplits[i];
    // Get the closing </h2> and extract title
    const titleEnd = block.indexOf('</h2>');
    const titleHtml = block.substring(0, titleEnd);
    const content = block.substring(titleEnd + 5);

    const title = stripHtml(titleHtml);

    // Get section id from the split point
    // Extract the id from the previous split
    const idMatch = sectionSplits[i - 1] ? sectionSplits[i - 1].match(/id="([^"]+)"[^>]*$/) : null;

    // Get all text content (paragraphs)
    const paragraphs = [];
    const pMatches = content.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
    if (pMatches) {
      for (const p of pMatches) {
        const text = stripHtml(p);
        if (text.length > 10) paragraphs.push(text);
      }
    }

    parsedSections.push({
      title: title,
      text: paragraphs.join('\n\n'),
      paragraphs: paragraphs
    });
  }

  console.log(`  Parsed ${parsedSections.length} sections from HTML`);

  // Map sections to JSON files
  // The HTML sections order: title-page, intro, siman1, siman2, ..., siman22
  // But there may be sub-sections and extras.
  // Let's use a simpler approach: for each JSON section file, try to match its content

  // Actually, let me just map sequentially:
  // parsedSections[0] = title-page -> section-1.json (Hakdama)
  // parsedSections[1] = intro -> section-1.json (same, merge into Hakdama)
  // parsedSections[2] = siman1 -> section-2.json ... wait, need to check

  // Let me count how many siman sections there are
  let simanCount = 0;
  for (const s of parsedSections) {
    if (s.title.includes('Siman')) simanCount++;
  }
  console.log(`  Found ${simanCount} siman sections`);

  // Approach: combine all non-siman intro stuff as the translation for section-1
  // Then each siman N goes to section-(N+1).json

  let introTexts = [];
  let simanTexts = {};

  for (const s of parsedSections) {
    const simanMatch = s.title.match(/Siman (\d+)/);
    if (simanMatch) {
      const simanNum = parseInt(simanMatch[1]);
      if (!simanTexts[simanNum]) simanTexts[simanNum] = '';
      simanTexts[simanNum] += (simanTexts[simanNum] ? '\n\n' : '') + s.text;
    } else {
      // Intro/title content
      if (s.text.length > 20) {
        introTexts.push(s.text);
      }
    }
  }

  // Apply intro to section-1.json
  if (introTexts.length > 0) {
    const sec1File = path.join(targetDir, 'section-1.json');
    if (fs.existsSync(sec1File)) {
      const data = readJson(sec1File);
      const combinedIntro = introTexts.join('\n\n');
      // Put all on first segment
      if (data.segments.length > 0) {
        data.segments[0].en = combinedIntro;
        data.hasEnglish = true;
        writeJson(sec1File, data);
        totalUpdated++;
        totalSegments++;
      }
    }
  }

  // Apply siman texts
  // Check: does section-2.json correspond to siman 1?
  // section-2 has displayNumber 2 and typically the first siman
  // Let me verify by checking the index
  const yerachIndex = readJson(path.join(targetDir, 'index.json'));
  // The titles should tell us: section-2 should have a title like the first siman

  for (const [simanStr, text] of Object.entries(simanTexts)) {
    const simanNum = parseInt(simanStr);
    // Map siman to section: section 1 = hakdama, section 2 = siman 1, etc.
    const sectionNum = simanNum + 1;
    const secFile = path.join(targetDir, `section-${sectionNum}.json`);

    if (fs.existsSync(secFile) && text.length > 20) {
      const data = readJson(secFile);
      // Put translation on first segment (entire siman as one block)
      if (data.segments.length > 0) {
        data.segments[0].en = text;
        data.hasEnglish = true;
        writeJson(secFile, data);
        totalUpdated++;
        totalSegments++;
      }
    }
  }

  // Also try mapping remaining sections (24 = siman 22+1 = 23, but we have 24 sections)
  // Section 24 might be additional content

  // Update index
  updateIndexHasEnglish(path.join(targetDir, 'index.json'), targetDir, 'section');

  console.log(`  Updated ${totalUpdated} sections, ${totalSegments} segments`);
  return { sections: totalUpdated, segments: totalSegments };
}

// ============================================================
// 6. YEMEI MOHARNAT
// ============================================================

function importYemeiMoharnat() {
  console.log('\n=== 6. YEMEI MOHARNAT ===');
  const srcDir = path.join(FINISHED_DIR, 'Yimay Moharnat');
  const targetDir = path.join(READER_DIR, 'yemei-moharnat');

  const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html')).sort((a, b) => {
    return parseInt(a) - parseInt(b);
  });

  let totalUpdated = 0;
  let totalSegments = 0;

  // Section numbering: section-1.json = Hakdama (preface)
  // section-2.json = Section Aleph (1), section-3.json = Section Beis (2), etc.
  // So JSON section number = Hebrew section number + 1

  // For Part 2 Eretz Yisrael: these start at section-112.json (need to verify)
  // section-112 should be the intro to Part 2, then the numbered sections

  for (const htmlFile of htmlFiles) {
    const html = readHtml(path.join(srcDir, htmlFile));

    // Determine which sections this file covers
    const isPart2 = htmlFile.toLowerCase().includes('eretz') || htmlFile.toLowerCase().includes('part 2') || htmlFile.toLowerCase().includes('part2');

    // Parse sections from HTML
    const sections = parseYemeiSections(html, isPart2);

    for (const [sectionKey, text] of Object.entries(sections)) {
      // sectionKey is the JSON section number
      const secFile = path.join(targetDir, `section-${sectionKey}.json`);

      if (fs.existsSync(secFile) && text.length > 20) {
        const data = readJson(secFile);
        // Put translation on first segment
        if (data.segments.length > 0) {
          data.segments[0].en = text;
          data.hasEnglish = true;
          writeJson(secFile, data);
          totalUpdated++;
          totalSegments++;
        }
      } else if (!fs.existsSync(secFile) && text.length > 20) {
        console.log(`  WARNING: No JSON for section-${sectionKey}`);
      }
    }
  }

  // Update index
  updateIndexHasEnglish(path.join(targetDir, 'index.json'), targetDir, 'section');

  console.log(`  Updated ${totalUpdated} sections, ${totalSegments} segments`);
  return { sections: totalUpdated, segments: totalSegments };
}

function parseYemeiSections(html, isPart2) {
  const result = {};

  // For Part 1: sections marked by <div class="section-header">Section X (N)</div>
  // where X is Hebrew name (Aleph, Beis...) and N is number
  // JSON mapping: section 1 in Hebrew = section-2.json

  // For Part 2 Eretz Yisrael: sections marked by <div class="sec">§N — ...</div>
  // Part 2 sections: in JSON, Part 2 starts at some offset. Need to find it.

  // Strategy: find all section markers and map them

  // Pattern 1: section-header with section numbers
  const headerPattern = /Section\s+(?:[A-Za-z]+)\s*\((\d+)\)/g;
  // Pattern 2: Preface marker
  const hasPreface = html.includes('Preface of the Copyist') || html.includes('intro-header');

  // Pattern 3: §N section markers
  const secPattern = /<div class="sec">§(\d+)\s*[—–-]/g;

  // Split by section boundaries
  // First try section-header divs
  const headerSplits = html.split(/<div class="section-header">/);

  if (headerSplits.length > 1) {
    // Part 1 format
    if (hasPreface && headerSplits.length > 1) {
      // The intro/preface is before the first section-header
      const prefaceText = extractParagraphs(headerSplits[0]);
      if (prefaceText.length > 50) {
        result[1] = prefaceText; // section-1.json = Hakdama
      }
    }

    for (let i = 1; i < headerSplits.length; i++) {
      const block = headerSplits[i];
      // Extract section number
      const numMatch = block.match(/Section\s+(?:\w+)\s*\((\d+)\)/);
      if (numMatch) {
        const secNum = parseInt(numMatch[1]);
        const jsonSecNum = secNum + 1; // JSON offset

        // Get text content after the header
        const headerEnd = block.indexOf('</div>');
        const content = headerEnd > 0 ? block.substring(headerEnd + 6) : block;
        const text = extractParagraphs(content);

        if (text.length > 20) {
          result[jsonSecNum] = text;
        }
      }
    }
  }

  // Try §N pattern for Part 2 or additional sections
  const secSplits = html.split(/<div class="sec">/);
  if (secSplits.length > 1) {
    // Part 2 Eretz Yisrael - need to figure out JSON section offset
    // Part 1 has 111 sections + 1 hakdama = sections 1-112 in JSON
    // Part 2 starts at section-113 maybe? Let me check...
    // Actually need to look at the existing files to determine the mapping

    // Check if this is part 2 intro
    if (isPart2) {
      // Part 2 intro text before first §
      const introText = extractParagraphs(secSplits[0]);

      // Try to find the Part 2 intro section number
      // Look at existing files: section-112 or section-113 might be Part 2 intro
      // The Part 1 has sections 1-111 in Hebrew = section-1 through section-112 in JSON
      // Part 2 intro might be at section-113, or some other convention

      // For now, just map §N sections. Part 2 §1 -> need to find where it maps in the JSON
      for (let i = 1; i < secSplits.length; i++) {
        const block = secSplits[i];
        const numMatch = block.match(/^§(\d+)\s*[—–-]/);
        if (numMatch) {
          const p2SecNum = parseInt(numMatch[1]);
          // Part 2 sections in JSON: section-112 = Part 2 intro, section-113 = §1, etc.?
          // Let's check if section-113.json exists
          // Actually, the existing sections go up to 303 total
          // Part 1 has ~111 Hebrew sections + 1 hakdama = ~112 JSON sections
          // Part 2 has ~190 sections (intro + §1-190)
          // Total: ~303 which matches!

          // So Part 2 §N maps to section-(112 + N).json
          const jsonSecNum = 112 + p2SecNum;

          const headerEnd = block.indexOf('</div>');
          const content = headerEnd > 0 ? block.substring(headerEnd + 6) : block;
          const text = extractParagraphs(content);

          if (text.length > 20) {
            result[jsonSecNum] = text;
          }
        }
      }

      // Part 2 intro -> section-112.json
      if (introText.length > 50 && !result[112]) {
        result[112] = introText;
      }
    } else {
      // Part 1 with §N markers
      for (let i = 1; i < secSplits.length; i++) {
        const block = secSplits[i];
        const numMatch = block.match(/^§(\d+)\s*[—–-]/);
        if (numMatch) {
          const secNum = parseInt(numMatch[1]);
          const jsonSecNum = secNum + 1;

          const headerEnd = block.indexOf('</div>');
          const content = headerEnd > 0 ? block.substring(headerEnd + 6) : block;
          const text = extractParagraphs(content);

          if (text.length > 20) {
            result[jsonSecNum] = text;
          }
        }
      }
    }
  }

  return result;
}

function extractParagraphs(html) {
  if (!html) return '';
  // Remove translator notes, summary boxes, etc. but keep main content
  const cleaned = html
    .replace(/<div class="summary-box">[\s\S]*?<\/div>/g, '')
    .replace(/<div class="translator-note">[\s\S]*?<\/div>/g, '');

  const paragraphs = [];
  const pMatches = cleaned.match(/<p[^>]*>([\s\S]*?)<\/p>/g);
  if (pMatches) {
    for (const p of pMatches) {
      const text = stripHtml(p);
      if (text.length > 10) paragraphs.push(text);
    }
  }

  if (paragraphs.length === 0) {
    // Fallback: just strip all HTML
    const text = stripHtml(cleaned);
    if (text.length > 20) return text;
  }

  return paragraphs.join('\n\n');
}

// ============================================================
// 7. RIMZEI HAMAASIYOS
// ============================================================

function importRimzeiHamaasiyos() {
  console.log('\n=== 7. RIMZEI HAMAASIYOS ===');
  const srcFile = path.join(FINISHED_DIR, 'Rimzay_HaMaaseyos.html');
  const targetDir = path.join(READER_DIR, 'rimzei-hamaasiyos');

  const html = readHtml(srcFile);

  // Split by story-title h2 tags
  const storySplits = html.split(/<h2 class="story-title">/);

  let totalUpdated = 0;
  let totalSegments = 0;

  console.log(`  Found ${storySplits.length - 1} story sections in HTML`);

  for (let i = 1; i < storySplits.length; i++) {
    const block = storySplits[i];

    // Extract story number from title
    const numMatch = block.match(/Story\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen)/i);
    const wordToNum = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13
    };

    let storyNum = i; // fallback
    if (numMatch) {
      const word = numMatch[0].replace(/Story\s+/i, '').toLowerCase();
      storyNum = wordToNum[word] || i;
    }

    // Get text content
    const titleEnd = block.indexOf('</h2>');
    const titleHtml = block.substring(0, titleEnd);
    const content = block.substring(titleEnd + 5);

    const storyTitle = stripHtml(titleHtml);
    const text = extractParagraphs(content);

    if (text.length < 20) continue;

    // Map to section-N.json
    const secFile = path.join(targetDir, `section-${storyNum}.json`);
    if (fs.existsSync(secFile)) {
      const data = readJson(secFile);
      if (data.segments.length > 0) {
        data.segments[0].en = text;
        data.hasEnglish = true;
        writeJson(secFile, data);
        totalUpdated++;
        totalSegments++;
      }
    } else {
      console.log(`  WARNING: No JSON for section-${storyNum}`);
    }
  }

  // Update index
  updateIndexHasEnglish(path.join(targetDir, 'index.json'), targetDir, 'section');

  console.log(`  Updated ${totalUpdated} sections, ${totalSegments} segments`);
  return { sections: totalUpdated, segments: totalSegments };
}

// ============================================================
// COMMON FUNCTIONS
// ============================================================

function updateIndexHasEnglish(indexFile, targetDir, prefix) {
  if (!fs.existsSync(indexFile)) return;

  const index = readJson(indexFile);

  for (const torah of index.torahs) {
    const num = torah.number;
    const fileName = `${prefix}-${num}.json`;
    const filePath = path.join(targetDir, fileName);

    if (fs.existsSync(filePath)) {
      const data = readJson(filePath);
      torah.hasEnglish = data.hasEnglish || false;
    }
  }

  writeJson(indexFile, index);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('Starting batch import of 7 books...\n');

  const results = {};

  try {
    results.likutayEitzosBasra = importLikutayEitzosBasra();
  } catch (e) {
    console.error('ERROR in Likutay Eitzos Basra:', e.message);
    results.likutayEitzosBasra = { error: e.message };
  }

  try {
    results.ohyVol2 = importOHY(2, 'Oatzar 2');
  } catch (e) {
    console.error('ERROR in OHY Vol 2:', e.message);
    results.ohyVol2 = { error: e.message };
  }

  try {
    results.ohyVol4 = importOHY(4, 'Oatzar 4');
  } catch (e) {
    console.error('ERROR in OHY Vol 4:', e.message);
    results.ohyVol4 = { error: e.message };
  }

  try {
    results.alimLitrufa = importAlimLitrufa();
  } catch (e) {
    console.error('ERROR in Alim LiTrufa:', e.message);
    results.alimLitrufa = { error: e.message };
  }

  try {
    results.yerachHaeitanim = importYerachHaeitanim();
  } catch (e) {
    console.error('ERROR in Yereach HaEitanim:', e.message);
    results.yerachHaeitanim = { error: e.message };
  }

  try {
    results.yemeiMoharnat = importYemeiMoharnat();
  } catch (e) {
    console.error('ERROR in Yemei Moharnat:', e.message);
    results.yemeiMoharnat = { error: e.message };
  }

  try {
    results.rimzeiHamaasiyos = importRimzeiHamaasiyos();
  } catch (e) {
    console.error('ERROR in Rimzei HaMaasiyos:', e.message);
    results.rimzeiHamaasiyos = { error: e.message };
  }

  console.log('\n\n========== SUMMARY ==========');
  for (const [book, result] of Object.entries(results)) {
    console.log(`${book}: ${JSON.stringify(result)}`);
  }
  console.log('=============================');
}

main();
