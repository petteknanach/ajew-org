#!/usr/bin/env node
/**
 * Build reader JSON structures for:
 * 1. Yisroel Saba (93 chapters from 23 HTML files)
 * 2. Michtevay Shmuel Vol 1 (16 letters)
 * 3. Michtevay Shmuel Vol 2 (85 letters from 26 HTML files)
 * 4. Kuntrass Hiskashrus LaTzadik (1 HTML file, intro + 6 chapters)
 *
 * Run: node scripts/build-new-readers.js
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');

// ============================================================
// UTILITY: Strip HTML tags and get plain text
// ============================================================
function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsaquo;/g, '\u203A')
    .replace(/&lsaquo;/g, '\u2039')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getBody(html) {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

// Extract all <p> text from an HTML fragment
function extractParagraphTexts(htmlFragment) {
  const paras = [];
  const pMatches = htmlFragment.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  for (const pm of pMatches) {
    const text = stripHtml(pm).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (text && text.length > 3) paras.push(text);
  }
  // Also extract source-box cite content
  const citeMatches = htmlFragment.match(/<cite[^>]*>[\s\S]*?<\/cite>/gi) || [];
  // These are already included in <p> parent context, skip
  // Also extract story-box content
  const storyMatches = htmlFragment.match(/<div\s+class="story-box"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) || [];
  // Story box paragraphs are already in <p> tags, included above
  return paras;
}

// ============================================================
// Write JSON helper
// ============================================================
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ============================================================
// Parse Hebrew text into paragraph blocks
// ============================================================
function parseHebrewFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
}

// ============================================================
// BOOK 4: KUNTRASS HISKASHRUS LATZADIK (simplest - do first)
// ============================================================
function buildKuntrass() {
  console.log('\n=== Building Kuntrass Hiskashrus LaTzadik ===');

  const htmlFile = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Kuntrass_Hiskashrus_LaTzadik.html';
  const hebrewFile = path.join('C:/Users/Pettek/Documents/HebrewBreslovBooks',
    '6_ספרים של תלמידים ועוד', '9_ספרי רבי שמואל הורוויץ',
    'קונטרס התקשרות לצדיק האמת.txt');
  const outDir = path.join(READER_DIR, 'kuntrass-hiskashrus');

  const html = fs.readFileSync(htmlFile, 'utf8');
  const body = getBody(html);

  // Parse Hebrew
  let hebrewParas;
  try {
    hebrewParas = parseHebrewFile(hebrewFile);
  } catch(e) {
    console.log('  WARNING: Could not read Hebrew file, continuing without Hebrew');
    console.log('  Path tried: ' + hebrewFile);
    hebrewParas = [];
  }
  console.log(`  Hebrew paragraphs: ${hebrewParas.length}`);

  // Split HTML into sections by <section class="preamble-section"> and <section class="chapter">
  const allSections = [];

  // Extract preamble
  const preambleMatch = body.match(/<section\s+class="preamble-section"[^>]*>([\s\S]*?)<\/section>/i);
  if (preambleMatch) {
    const paras = extractParagraphTexts(preambleMatch[1]);
    allSections.push({
      title: 'Opening Discourse',
      heTitle: 'שיחה ומאמר לקיום התורה',
      paragraphs: paras
    });
  }

  // Extract chapters
  const chapterRegex = /<section\s+class="chapter"[^>]*>([\s\S]*?)<\/section>/gi;
  let chMatch;
  while ((chMatch = chapterRegex.exec(body)) !== null) {
    const chContent = chMatch[1];

    // Get title
    const titleDiv = chContent.match(/<div\s+class="chapter-title"[^>]*>([\s\S]*?)<\/div>/i);
    let enTitle = '';
    let heTitle = '';
    if (titleDiv) {
      const heSpan = titleDiv[1].match(/<span\s+class="chapter-title-he"[^>]*>([\s\S]*?)<\/span>/i);
      heTitle = heSpan ? stripHtml(heSpan[1]).trim() : '';
      enTitle = stripHtml(titleDiv[1].replace(/<span\s+class="chapter-title-he"[\s\S]*?<\/span>/i, '')).trim();
    }

    // Get paragraphs (skip summary boxes)
    const contentWithoutSummary = chContent.replace(/<div\s+class="summary-box"[\s\S]*?<\/div>\s*<\/div>/gi, '');
    const paras = extractParagraphTexts(contentWithoutSummary);

    allSections.push({
      title: enTitle || `Chapter`,
      heTitle: heTitle,
      paragraphs: paras
    });
  }

  console.log(`  Sections found: ${allSections.length}`);

  // Distribute Hebrew paragraphs across sections
  let heIdx = 0;
  const torahs = [];
  const totalSections = allSections.length;

  for (let i = 0; i < totalSections; i++) {
    const sec = allSections[i];
    const chNum = i + 1;
    const enParas = sec.paragraphs;

    const segments = [];
    for (let p = 0; p < enParas.length; p++) {
      const he = heIdx < hebrewParas.length ? hebrewParas[heIdx++] : '';
      segments.push({
        index: p + 1,
        he: he,
        en: enParas[p],
        he_nikud: he
      });
    }

    const chapterData = {
      id: `kh-${chNum}`,
      book: 'kuntrass-hiskashrus',
      part: 1,
      torah: chNum,
      displayNumber: chNum,
      title: sec.title,
      hebrewTitle: sec.heTitle || `פרק ${chNum}`,
      keyVerse: '', keyVerseTranslation: '', keyVerseRef: '',
      themes: [], keywords: [], simanim: [],
      segments: segments,
      totalParagraphs: segments.length,
      hasEnglish: true,
      navigation: {
        prev: chNum > 1 ? `kh-${chNum - 1}` : null,
        next: chNum < totalSections ? `kh-${chNum + 1}` : null,
        prevUrl: chNum > 1 ? `/reader/kuntrass-hiskashrus/1/${chNum - 1}` : null,
        nextUrl: chNum < totalSections ? `/reader/kuntrass-hiskashrus/1/${chNum + 1}` : null
      },
      hasNikud: true
    };

    writeJson(path.join(outDir, `section-${chNum}.json`), chapterData);
    console.log(`  section-${chNum}.json: "${sec.title}" (${segments.length} segments)`);

    torahs.push({
      number: chNum, displayNumber: chNum,
      title: sec.title, hebrewTitle: sec.heTitle || `פרק ${chNum}`,
      themes: [], paragraphs: segments.length, hasEnglish: true,
      url: `/reader/kuntrass-hiskashrus/1/${chNum}`
    });
  }

  writeJson(path.join(outDir, 'index.json'), {
    book: 'kuntrass-hiskashrus', part: 1,
    title: 'Kuntrass Hiskashrus LaTzadik - Bonding to the True Tzadik',
    hebrewTitle: 'קונטרס התקשרות לצדיק האמת',
    author: "R' Shmuel HaLevi Horowitz",
    hebrewAuthor: 'רבי שמואל הלוי הורוויץ',
    totalTorahs: totalSections,
    torahs: torahs
  });

  console.log(`  Kuntrass complete: ${totalSections} sections`);
  return totalSections;
}

// ============================================================
// BOOK 1: YISROEL SABA
// ============================================================
function buildYisroelSaba() {
  console.log('\n=== Building Yisroel Saba ===');

  const htmlDir = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Yisroel Saba';
  const hebrewFile = path.join('C:/Users/Pettek/Documents/HebrewBreslovBooks',
    '6_ספרים של תלמידים ועוד', '9_ספרי רבי ישראל דב אודסר', 'ישראל סבא.txt');
  const outDir = path.join(READER_DIR, 'yisroel-saba');

  // Parse Hebrew text
  const hebrewParas = parseHebrewFile(hebrewFile);
  console.log(`  Hebrew total paragraphs: ${hebrewParas.length}`);

  // Find TOC end - content starts after the short title lines
  // The TOC has lines < 100 chars, content starts with "רבי ישראל משורר"
  let contentStart = 0;
  for (let i = 0; i < hebrewParas.length; i++) {
    if (hebrewParas[i].includes('רבי ישראל משורר') ||
        hebrewParas[i].includes('סיפור נפלא ונורא')) {
      contentStart = i;
      break;
    }
  }
  if (contentStart === 0) {
    // Fallback: find first paragraph > 100 chars after index 200
    for (let i = 200; i < hebrewParas.length; i++) {
      if (hebrewParas[i].length > 100) { contentStart = i; break; }
    }
  }
  const tocTitles = hebrewParas.slice(0, contentStart).filter(p => p.length > 2 && p.length < 120);
  const hebrewContent = hebrewParas.slice(contentStart);
  console.log(`  TOC titles: ${tocTitles.length}, Content paragraphs: ${hebrewContent.length}`);

  // HTML files in order
  const htmlFiles = [
    'Yisroel_Saba_Ch1_Sippur_HaHiskarvus.html',
    'Yisroel_Saba_Ch2to5.html',
    'Yisroel_Saba_Ch6to8.html',
    'Yisroel_Saba_Ch9to13.html',
    'Yisroel_Saba_Ch14to17.html',
    'Yisroel_Saba_Ch18to25.html',
    'Yisroel_Saba_Ch26to33.html',
    'Yisroel_Saba_Ch34to41.html',
    'Yisroel_Saba_Ch42to53.html',
    'Yisroel_Saba_Ch54to60.html',
    'Yisroel_Saba_Ch61to72.html',
    'Yisroel_Saba_Ch73to74.html',
    'Yisroel_Saba_Ch75.html',
    'Yisroel_Saba_Ch76to78.html',
    'Yisroel_Saba_Ch79to80.html',
    'Yisroel_Saba_Ch81to86.html',
    'Yisroel_Saba_Ch87_Part1.html',
    'Yisroel_Saba_Ch87_Part2.html',
    'Yisroel_Saba_Ch87_Part3.html',
    'Yisroel_Saba_Ch87_Part4.html',
    'Yisroel_Saba_Ch87_Part5.html',
    'Yisroel_Saba_Ch87_Part6.html',
    'Yisroel_Saba_Ch87_Part7.html',
  ];

  // Extract chapters from HTML
  const allChapters = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
    const body = getBody(html);

    // Split by h3.chapter-title
    const parts = body.split(/<h3[^>]*class="chapter-title"[^>]*>/i);

    for (let pi = 1; pi < parts.length; pi++) {
      const section = parts[pi];
      const titleEnd = section.match(/<\/h3>/i);
      let title = titleEnd ? stripHtml(section.substring(0, titleEnd.index)).trim() : '';
      title = title.replace(/\[.*?\]/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

      const afterTitle = titleEnd ? section.substring(titleEnd.index + 5) : section;

      // Remove translator-summary boxes
      const cleaned = afterTitle.replace(/<div\s+class="translator-summary"[\s\S]*?<\/div>/gi, '');

      const paras = extractParagraphTexts(cleaned);
      allChapters.push({ title, paragraphs: paras, file });
    }

    // If no h3 chapters found in this file, treat whole body as one chapter
    if (parts.length <= 1) {
      const paras = extractParagraphTexts(body);
      // Skip header paragraphs
      const filtered = paras.filter(p =>
        !p.match(/^(Na Nach|Yisroel Saba|Conversations and Stories|Chapter \d)/)
      );
      if (filtered.length > 0) {
        const h2 = body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        const title = h2 ? stripHtml(h2[1]).trim() : path.basename(file, '.html');
        allChapters.push({ title, paragraphs: filtered, file });
      }
    }
  }

  console.log(`  Total chapters from HTML: ${allChapters.length}`);

  // Build chapter JSONs
  let heIdx = 0;
  const torahs = [];
  const totalChapters = allChapters.length;

  for (let i = 0; i < totalChapters; i++) {
    const ch = allChapters[i];
    const chNum = i + 1;
    const heTitle = i < tocTitles.length ? tocTitles[i] : '';

    const segments = [];
    for (let p = 0; p < ch.paragraphs.length; p++) {
      const he = heIdx < hebrewContent.length ? hebrewContent[heIdx++] : '';
      segments.push({
        index: p + 1,
        he: he,
        en: ch.paragraphs[p],
        he_nikud: he
      });
    }

    const data = {
      id: `ys-${chNum}`,
      book: 'yisroel-saba', part: 1, torah: chNum, displayNumber: chNum,
      title: ch.title, hebrewTitle: heTitle || ch.title,
      keyVerse: '', keyVerseTranslation: '', keyVerseRef: '',
      themes: [], keywords: [], simanim: [],
      segments, totalParagraphs: segments.length,
      hasEnglish: ch.paragraphs.length > 0,
      navigation: {
        prev: chNum > 1 ? `ys-${chNum - 1}` : null,
        next: chNum < totalChapters ? `ys-${chNum + 1}` : null,
        prevUrl: chNum > 1 ? `/reader/yisroel-saba/1/${chNum - 1}` : null,
        nextUrl: chNum < totalChapters ? `/reader/yisroel-saba/1/${chNum + 1}` : null
      },
      hasNikud: true
    };

    writeJson(path.join(outDir, `chapter-${chNum}.json`), data);

    torahs.push({
      number: chNum, displayNumber: chNum,
      title: ch.title, hebrewTitle: heTitle || ch.title,
      themes: [], paragraphs: segments.length,
      hasEnglish: ch.paragraphs.length > 0,
      url: `/reader/yisroel-saba/1/${chNum}`
    });
  }

  writeJson(path.join(outDir, 'index.json'), {
    book: 'yisroel-saba', part: 1,
    title: 'Yisroel Saba - Conversations and Stories of Rabbi Yisroel Ber Odesser',
    hebrewTitle: 'ישראל סבא',
    author: 'Rabbi Yisroel Ber Odesser',
    hebrewAuthor: 'רבי ישראל דב אודסר',
    totalTorahs: totalChapters,
    torahs
  });

  console.log(`  Yisroel Saba complete: ${totalChapters} chapters, used ${heIdx}/${hebrewContent.length} Hebrew paragraphs`);
  return totalChapters;
}

// ============================================================
// MICHTEVAY SHMUEL - shared builder for both volumes
// ============================================================
function buildMichtevayVol(volNum) {
  console.log(`\n=== Building Michtevay Shmuel Vol ${volNum} ===`);

  const htmlDir = volNum === 1
    ? 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Michtevay Shmuel 1 - 1-16'
    : 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Michtevay Shmuel 2';
  const hebrewFile = path.join('C:/Users/Pettek/Documents/HebrewBreslovBooks',
    '6_ספרים של תלמידים ועוד', '9_ספרי רבי שמואל הורוויץ',
    volNum === 1 ? 'מכתבי שמואל א.txt' : 'מכתבי שמואל ב.txt');
  const outDir = path.join(READER_DIR, 'michtevay-shmuel', `part-${volNum}`);

  // Parse Hebrew - split into letters by date-like first lines
  const hebrewText = fs.readFileSync(hebrewFile, 'utf8');
  const hebrewLines = hebrewText.split(/\r?\n/);

  const letterBounds = [];
  for (let i = 0; i < hebrewLines.length; i++) {
    const line = hebrewLines[i].trim();
    if (!line) continue;
    if (/^(ב"ה|יום|בס"ד|בעזה"י)/.test(line) && line.length < 300) {
      if (/(\u05EA\u05E9[\u05D9-\u05EA]|פ'|פרשת|פעה"ק|מירון|ירושלים|טבת|שבט|אדר|ניסן|אייר|סיון|תמוז|אב|אלול|תשרי|חשוון|כסלו)/.test(line) ||
          (i === 0)) {
        letterBounds.push(i);
      }
    }
  }

  const hebrewLetters = [];
  for (let b = 0; b < letterBounds.length; b++) {
    const start = letterBounds[b];
    const end = b + 1 < letterBounds.length ? letterBounds[b + 1] : hebrewLines.length;
    const paras = hebrewLines.slice(start, end).map(l => l.trim()).filter(l => l.length > 0);
    hebrewLetters.push(paras);
  }
  console.log(`  Hebrew letters found: ${hebrewLetters.length}`);

  // Get and sort HTML files
  const allHtmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html')).sort();

  // For vol 1: pick highest version of each letter
  let letterFiles;
  if (volNum === 1) {
    const best = {};
    for (const f of allHtmlFiles) {
      const m = f.match(/michtevay_shmuel_(.+?)_v(\d+)\.html/);
      if (m) {
        const key = m[1];
        const ver = parseInt(m[2]);
        if (!best[key] || best[key].ver < ver) best[key] = { file: f, ver };
      }
    }
    letterFiles = Object.values(best).map(v => v.file).sort();
  } else {
    letterFiles = allHtmlFiles;
  }
  console.log(`  HTML files to process: ${letterFiles.length}`);

  // Extract English from each HTML
  const allLetters = [];
  let globalLetterNum = 0;

  for (const file of letterFiles) {
    const html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
    const body = getBody(html);

    if (volNum === 2) {
      // Vol 2: check for multiple letters (h3.sh headers)
      const letterParts = body.split(/<h3[^>]*class="sh"[^>]*>/i);

      if (letterParts.length > 2) {
        // Multiple letters in file
        for (let pi = 1; pi < letterParts.length; pi++) {
          globalLetterNum++;
          const part = letterParts[pi];
          const titleEnd = part.match(/<\/h3>/i);
          let title = titleEnd ? stripHtml(part.substring(0, titleEnd.index)).trim() : `Letter ${globalLetterNum}`;

          const afterTitle = titleEnd ? part.substring(titleEnd.index + 5) : part;
          const cleaned = afterTitle
            .replace(/<div\s+class="sum"[\s\S]*?<\/div>\s*<\/div>/gi, '')
            .replace(/<div\s+class="summary-box"[\s\S]*?<\/div>\s*<\/div>/gi, '');

          // Get paragraphs from pb blocks and regular p tags
          const paras = extractLetterParagraphs(cleaned);
          allLetters.push({ number: globalLetterNum, title, paragraphs: paras });
        }
      } else {
        globalLetterNum++;
        const titleMatch = body.match(/<h3[^>]*class="sh"[^>]*>([\s\S]*?)<\/h3>/i);
        let title = titleMatch ? stripHtml(titleMatch[1]).trim() : `Letter ${globalLetterNum}`;

        const cleaned = body
          .replace(/<div\s+class="sum"[\s\S]*?<\/div>\s*<\/div>/gi, '')
          .replace(/<div\s+class="summary-box"[\s\S]*?<\/div>\s*<\/div>/gi, '');
        const paras = extractLetterParagraphs(cleaned);
        allLetters.push({ number: globalLetterNum, title, paragraphs: paras });
      }
    } else {
      // Vol 1: each file is one letter
      globalLetterNum++;
      const h2Match = body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      let title = h2Match ? stripHtml(h2Match[1]).trim() : `Letter ${globalLetterNum}`;

      const cleaned = body
        .replace(/<div\s+class="translator-summary"[\s\S]*?<\/div>/gi, '')
        .replace(/<div\s+class="summary-box"[\s\S]*?<\/div>\s*<\/div>/gi, '');
      const paras = extractLetterParagraphs(cleaned);
      allLetters.push({ number: globalLetterNum, title, paragraphs: paras });
    }
  }

  console.log(`  Total letters extracted: ${allLetters.length}`);

  // Build letter JSONs
  const torahs = [];
  const totalLetters = allLetters.length;

  for (let i = 0; i < totalLetters; i++) {
    const letter = allLetters[i];
    const lNum = i + 1;

    const heParas = i < hebrewLetters.length ? hebrewLetters[i] : [];
    const enParas = letter.paragraphs;

    const segments = [];
    const numSeg = Math.max(enParas.length, heParas.length, 1);

    for (let s = 0; s < numSeg; s++) {
      segments.push({
        index: s + 1,
        he: s < heParas.length ? heParas[s] : '',
        en: s < enParas.length ? enParas[s] : '',
        he_nikud: s < heParas.length ? heParas[s] : ''
      });
    }

    const hasNikud = heParas.some(p => /[\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/.test(p));

    const data = {
      id: `ms-${volNum}-${lNum}`,
      book: 'michtevay-shmuel', part: volNum, torah: lNum, displayNumber: lNum,
      title: letter.title || `Letter ${lNum}`,
      hebrewTitle: `מכתב ${lNum}`,
      keyVerse: '', keyVerseTranslation: '', keyVerseRef: '',
      themes: [], keywords: [], simanim: [],
      segments, totalParagraphs: segments.length,
      hasEnglish: enParas.length > 0,
      navigation: {
        prev: lNum > 1 ? `ms-${volNum}-${lNum - 1}` : null,
        next: lNum < totalLetters ? `ms-${volNum}-${lNum + 1}` : null,
        prevUrl: lNum > 1 ? `/reader/michtevay-shmuel/${volNum}/${lNum - 1}` : null,
        nextUrl: lNum < totalLetters ? `/reader/michtevay-shmuel/${volNum}/${lNum + 1}` : null
      },
      hasNikud
    };

    writeJson(path.join(outDir, `letter-${lNum}.json`), data);

    torahs.push({
      number: lNum, displayNumber: lNum,
      title: letter.title || `Letter ${lNum}`,
      hebrewTitle: `מכתב ${lNum}`,
      themes: [], paragraphs: segments.length,
      hasEnglish: enParas.length > 0,
      url: `/reader/michtevay-shmuel/${volNum}/${lNum}`
    });
  }

  writeJson(path.join(outDir, 'index.json'), {
    book: 'michtevay-shmuel', part: volNum,
    title: `Michtevay Shmuel - Volume ${volNum} - Letters of R' Shmuel Horowitz`,
    hebrewTitle: `מכתבי שמואל ${volNum === 1 ? 'א' : 'ב'}`,
    author: "R' Shmuel HaLevi Horowitz",
    hebrewAuthor: 'רבי שמואל הלוי הורוויץ',
    totalTorahs: totalLetters,
    torahs
  });

  console.log(`  Michtevay Shmuel Vol ${volNum} complete: ${totalLetters} letters`);
  return totalLetters;
}

// Helper: extract paragraphs from letter HTML (handles both vol 1 and vol 2 structures)
function extractLetterParagraphs(html) {
  const paras = [];

  // Try to get salutation block
  const salMatch = html.match(/<div\s+class="sal(?:utation-box)?"[^>]*>([\s\S]*?)<\/div>/i);
  if (salMatch) {
    const text = stripHtml(salMatch[1]).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 10) paras.push(text);
  }

  // Get numbered paragraph blocks (div.pb with div.pt inside)
  const pbRegex = /<div\s+class="pb"[^>]*>[\s\S]*?<div\s+class="pt"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let pbMatch;
  while ((pbMatch = pbRegex.exec(html)) !== null) {
    const text = stripHtml(pbMatch[1]).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 3) paras.push(text);
  }

  // Get section blocks (div.section with div.sec-body)
  if (paras.length <= 1) {
    const secRegex = /<div\s+class="section"[^>]*>[\s\S]*?<div\s+class="sec-body"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let secMatch;
    while ((secMatch = secRegex.exec(html)) !== null) {
      const text = stripHtml(secMatch[1]).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 3) paras.push(text);
    }
  }

  // Fallback: regular <p> tags
  if (paras.length <= 1) {
    const pMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const pm of pMatches) {
      const text = stripHtml(pm).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 20 && !text.match(/^(Michtevay Shmuel|Volume|Letter \d|Na Nach)/)) {
        paras.push(text);
      }
    }
  }

  // Get closing/sign-off
  const closMatch = html.match(/<div\s+class="clos(?:ing)?"[^>]*>([\s\S]*?)<\/div>/i);
  if (closMatch) {
    const text = stripHtml(closMatch[1]).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 3) paras.push(text);
  }

  // Get PS sections
  const psMatch = html.match(/<div\s+class="ps"[^>]*>([\s\S]*?)<\/div>/i);
  if (psMatch) {
    const text = stripHtml(psMatch[1]).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length > 10) paras.push(text);
  }

  return paras;
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log('=== Building Reader JSON for 4 New Books ===');
  console.log(`Output: ${READER_DIR}\n`);

  const khCount = buildKuntrass();
  const ysCount = buildYisroelSaba();
  const ms1Count = buildMichtevayVol(1);
  const ms2Count = buildMichtevayVol(2);

  console.log('\n========== SUMMARY ==========');
  console.log(`  Kuntrass Hiskashrus:    ${khCount} sections`);
  console.log(`  Yisroel Saba:           ${ysCount} chapters`);
  console.log(`  Michtevay Shmuel Vol 1: ${ms1Count} letters`);
  console.log(`  Michtevay Shmuel Vol 2: ${ms2Count} letters`);
  console.log('==============================');
  console.log('\nDone! Now update the Astro route getStaticPaths() counts if needed.');
}

main();
