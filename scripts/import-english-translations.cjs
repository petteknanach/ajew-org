/**
 * Import English translations from HTML files into reader JSONs
 *
 * Processes 7 books from C:\Users\Pettek\Documents\Claude Desktop projects\Finished\
 *
 * Usage:
 *   node scripts/import-english-translations.cjs              # all books
 *   node scripts/import-english-translations.cjs meshivas      # specific book
 *   node scripts/import-english-translations.cjs --dry-run     # preview only
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const targetBook = args.find(a => !a.startsWith('--'));

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
    .replace(/&#8230;/g, '…')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readHtmlFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// ============================================================
// 1. MESHIVAS NEFESH
// ============================================================

function importMeshivasNefesh() {
  console.log('\n=== Importing Meshivas Nefesh ===');
  const htmlPath = path.join(SRC_DIR, 'meshivas_nefesh.html');
  const html = readHtmlFile(htmlPath);

  // Split by section headers: <h3 class="section-header">Section N</h3>
  const sections = html.split(/<h3[^>]*class="section-header"[^>]*>/i);
  sections.shift(); // Remove content before first section

  let updated = 0;
  for (let i = 0; i < sections.length; i++) {
    const sectionHtml = sections[i];

    // Extract section number from "Section N" or "Section N:" etc.
    const numMatch = sectionHtml.match(/^[^<]*?(?:Section\s+)?(\d+)/i);
    const secNum = numMatch ? parseInt(numMatch[1]) : i + 1;

    // Get everything after the closing </h3>
    const afterHeader = sectionHtml.replace(/^[^<]*<\/h3>/i, '');

    // Extract all paragraph text, stripping HTML
    const text = stripHtml(afterHeader)
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5)
      .join('\n\n');

    if (!text) continue;

    // Write to reader JSON
    const jsonPath = path.join(READER_DIR, 'meshivas-nefesh', `section-${secNum}.json`);
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      // Combine all English text into the single segment
      if (data.segments.length > 0) {
        data.segments[0].en = text;
        data.hasEnglish = true;
        if (!DRY_RUN) fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        updated++;
      }
    }
  }

  console.log(`  Updated: ${updated} sections`);
  return updated;
}

// ============================================================
// 2. YIMAI HATLAOS
// ============================================================

function importYimaiHatlaos() {
  console.log('\n=== Importing Yimai HaTlaos ===');
  const htmlPath = path.join(SRC_DIR, 'yimai_hatlaos (1).html');
  const html = readHtmlFile(htmlPath);

  // This book has sections marked by headers or chapter breaks
  // Split by <h2 or section markers
  const readerDir = path.join(READER_DIR, 'yemei-hatlaos');
  const jsonFiles = fs.readdirSync(readerDir).filter(f => f.startsWith('section-'));
  console.log(`  Found ${jsonFiles.length} existing sections`);

  // Extract all paragraphs from the HTML body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) { console.log('  ERROR: No body found'); return 0; }

  const body = bodyMatch[1];

  // Split into major sections by headers or decorative breaks
  // Look for chapter markers, section breaks, etc.
  const paragraphs = [];
  const pMatches = body.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  for (const p of pMatches) {
    const text = stripHtml(p).trim();
    if (text.length > 10) paragraphs.push(text);
  }

  console.log(`  Extracted ${paragraphs.length} paragraphs from HTML`);

  // Distribute paragraphs across existing sections proportionally
  const totalSections = jsonFiles.length;
  const parasPerSection = Math.ceil(paragraphs.length / totalSections);
  let updated = 0;

  for (let i = 0; i < totalSections; i++) {
    const secNum = i + 1;
    const jsonPath = path.join(readerDir, `section-${secNum}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const start = i * parasPerSection;
    const end = Math.min(start + parasPerSection, paragraphs.length);
    const sectionParas = paragraphs.slice(start, end);

    if (sectionParas.length === 0) continue;

    // Distribute paragraphs across segments
    const segsCount = data.segments.length;
    if (segsCount === 0) continue;

    const parasPerSeg = Math.ceil(sectionParas.length / segsCount);
    for (let s = 0; s < segsCount; s++) {
      const pStart = s * parasPerSeg;
      const pEnd = Math.min(pStart + parasPerSeg, sectionParas.length);
      const segText = sectionParas.slice(pStart, pEnd).join('\n\n');
      if (segText) {
        data.segments[s].en = segText;
      }
    }

    data.hasEnglish = true;
    if (!DRY_RUN) fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    updated++;
  }

  console.log(`  Updated: ${updated} sections`);
  return updated;
}

// ============================================================
// 3. EBAY HANACHAL (Blossoms of the Stream)
// ============================================================

function importEbayHanachal() {
  console.log('\n=== Importing Ebay HaNachal (Blossoms of the Stream) ===');
  const blossomsDir = path.join(SRC_DIR, 'Blossoms of the Stream');
  const htmlFiles = fs.readdirSync(blossomsDir).filter(f => f.endsWith('.html')).sort();

  console.log(`  Found ${htmlFiles.length} HTML files`);

  // Parse all letters from all HTML files
  const allLetters = {};

  for (const file of htmlFiles) {
    const html = readHtmlFile(path.join(blossomsDir, file));

    // Determine if this is volume 1 or volume 3
    const isVol3 = file.includes('vol3');

    // Split by letter headers: <h2>Letter N</h2> or <h2>Letter N —
    const parts = html.split(/<h2[^>]*>/i);
    parts.shift();

    for (const part of parts) {
      const headerEnd = part.indexOf('</h2>');
      const headerText = part.substring(0, headerEnd > 0 ? headerEnd : 100);
      const numMatch = headerText.match(/Letter\s+(\d+)/i);
      if (!numMatch) continue;

      const letterNum = parseInt(numMatch[1]);
      const afterHeader = part.substring(headerEnd > 0 ? headerEnd + 5 : 0);

      // Extract text, excluding signatures and headers
      const text = stripHtml(afterHeader)
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 5 && !l.match(/^Na Nach/i) && !l.match(/^B\.H\./))
        .join('\n\n');

      if (text) {
        // Volume 3 letters go to part-2 of the reader (Ebay HaNachal part 2)
        allLetters[`${isVol3 ? 2 : 1}-${letterNum}`] = text;
      }
    }
  }

  console.log(`  Parsed ${Object.keys(allLetters).length} letters`);

  let updated = 0;
  for (const [key, text] of Object.entries(allLetters)) {
    const [part, letterNum] = key.split('-').map(Number);
    const jsonPath = path.join(READER_DIR, 'ebay-hanachal', `part-${part}`, `letter-${letterNum}.json`);

    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (data.segments.length > 0) {
        // Split text into paragraphs and distribute across segments
        const paras = text.split('\n\n').filter(p => p.trim().length > 5);
        const segsCount = data.segments.length;

        if (paras.length <= segsCount) {
          // 1:1 or fewer paras than segments
          for (let i = 0; i < paras.length; i++) {
            data.segments[i].en = paras[i];
          }
        } else {
          // More paras than segments - combine
          const ratio = paras.length / segsCount;
          for (let i = 0; i < segsCount; i++) {
            const start = Math.floor(i * ratio);
            const end = Math.floor((i + 1) * ratio);
            data.segments[i].en = paras.slice(start, end).join('\n\n');
          }
        }

        data.hasEnglish = true;
        if (!DRY_RUN) fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        updated++;
      }
    }
  }

  console.log(`  Updated: ${updated} letters`);
  return updated;
}

// ============================================================
// 4+5. LIKUTAY TEFILOS (Parts 1 and 2)
// ============================================================

function importLikutayTefilos() {
  console.log('\n=== Importing Likutay Tefilos ===');

  // Part 1 HTML files contain prayers 30-152 → reader part-2 (prayers 30+)
  // Part 2 HTML files contain prayers 1-59 → reader part-3
  const configs = [
    {
      srcDir: path.join(SRC_DIR, 'Lekutay Tefilos 1'),
      readerPart: 2,
      label: 'Tefilos Part 1 (prayers 30-152)'
    },
    {
      srcDir: path.join(SRC_DIR, 'Likutay Tefilos 2'),
      readerPart: 3,
      label: 'Tefilos Part 2 (prayers 1-59)'
    }
  ];

  let totalUpdated = 0;

  for (const config of configs) {
    console.log(`\n  Processing: ${config.label}`);
    const htmlFiles = fs.readdirSync(config.srcDir).filter(f => f.endsWith('.html')).sort();
    console.log(`  Found ${htmlFiles.length} HTML files`);

    // Parse all prayers from all HTML files
    const allPrayers = {};

    for (const file of htmlFiles) {
      const html = readHtmlFile(path.join(config.srcDir, file));

      // Extract prayer numbers from filename
      const fileNumMatch = file.match(/(?:prayer|prayers)[\s_]*(\d+)(?:[_-](\d+))?/i);

      // Try splitting by prayer dividers or headings
      // Look for "Prayer N" patterns
      const prayerSections = html.split(/(?:<div[^>]*class="prayer-divider"[^>]*>|<(?:h2|div)[^>]*class="prayer-heading"[^>]*>)/i);

      if (prayerSections.length > 1) {
        prayerSections.shift(); // Remove content before first prayer
        for (const section of prayerSections) {
          // Extract prayer number
          const numMatch = section.match(/Prayer\s+(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+)/i);
          let prayerNum = null;

          // Try numeric pattern
          const directNum = section.match(/(?:Prayer\s+)(\d+)/i);
          if (directNum) prayerNum = parseInt(directNum[1]);

          // If no number found, try to infer from context
          if (!prayerNum) {
            const anyNum = section.match(/(?:prayer|tefila|תפלה)\s*[\s·—-]*\s*(\d+)/i);
            if (anyNum) prayerNum = parseInt(anyNum[1]);
          }

          if (!prayerNum) continue;

          // Extract text content (skip Hebrew toggle blocks)
          const cleaned = section
            .replace(/<div[^>]*class="heb-text"[^>]*>[\s\S]*?<\/div>/gi, '') // Remove Hebrew blocks
            .replace(/<span[^>]*class="heb-btn"[^>]*>[\s\S]*?<\/span>/gi, ''); // Remove Hebrew buttons

          const text = stripHtml(cleaned)
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 10 && !l.match(/^Prayer\s/i) && !l.match(/^Chelek/i))
            .join('\n\n');

          if (text) allPrayers[prayerNum] = text;
        }
      } else {
        // Single prayer file - use filename number
        if (fileNumMatch) {
          const startNum = parseInt(fileNumMatch[1]);
          const endNum = fileNumMatch[2] ? parseInt(fileNumMatch[2]) : startNum;

          const text = stripHtml(html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<head[\s\S]*?<\/head>/gi, ''))
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 10)
            .join('\n\n');

          if (text && startNum === endNum) {
            allPrayers[startNum] = text;
          }
        }
      }
    }

    console.log(`  Parsed ${Object.keys(allPrayers).length} prayers`);

    // Write to reader JSONs
    let updated = 0;
    const readerPartDir = path.join(READER_DIR, 'likutay-tefilos', `part-${config.readerPart}`);

    for (const [prayerNum, text] of Object.entries(allPrayers)) {
      const jsonPath = path.join(readerPartDir, `prayer-${prayerNum}.json`);

      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data.segments.length > 0) {
          const paras = text.split('\n\n').filter(p => p.trim().length > 10);
          const segsCount = data.segments.length;

          if (paras.length <= segsCount) {
            for (let i = 0; i < paras.length; i++) {
              data.segments[i].en = paras[i];
            }
          } else {
            const ratio = paras.length / segsCount;
            for (let i = 0; i < segsCount; i++) {
              const start = Math.floor(i * ratio);
              const end = Math.floor((i + 1) * ratio);
              data.segments[i].en = paras.slice(start, end).join('\n\n');
            }
          }

          data.hasEnglish = true;
          if (!DRY_RUN) fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
          updated++;
        }
      }
    }

    console.log(`  Updated: ${updated} prayers`);
    totalUpdated += updated;
  }

  return totalUpdated;
}

// ============================================================
// 6. OTZAR HAYIRAH (New Book)
// ============================================================

function importOtzarHayirah() {
  console.log('\n=== Importing Otzar HaYirah (Volume Mem) ===');
  const ohyDir = path.join(SRC_DIR, 'Oatzer volume Mem');
  const htmlFiles = fs.readdirSync(ohyDir).filter(f => f.endsWith('.html')).sort();

  console.log(`  Found ${htmlFiles.length} HTML files`);

  // Create reader directory
  const bookDir = path.join(READER_DIR, 'otzar-hayirah');
  const partDir = path.join(bookDir, 'part-1');
  if (!DRY_RUN) {
    fs.mkdirSync(partDir, { recursive: true });
  }

  const allSections = [];
  let sectionNum = 0;

  for (const file of htmlFiles) {
    const html = readHtmlFile(path.join(ohyDir, file));
    sectionNum++;

    // Extract title from <h2 class="section-title">
    const titleMatch = html.match(/<h2[^>]*class="section-title"[^>]*>([\s\S]*?)<\/h2>/i);
    let title = 'Section ' + sectionNum;
    let hebrewTitle = '';
    if (titleMatch) {
      const titleHtml = titleMatch[1];
      // Extract Hebrew title
      const heMatch = titleHtml.match(/<span[^>]*style="direction:rtl[^"]*"[^>]*>(.*?)<\/span>/i);
      if (heMatch) hebrewTitle = stripHtml(heMatch[1]).trim();
      // Extract English title
      title = stripHtml(titleHtml.replace(/<span[^>]*style="direction:rtl[^"]*"[^>]*>.*?<\/span>/gi, '')).trim() || title;
    }

    // Also try the main book title for the first file
    const bookTitleMatch = html.match(/<h1[^>]*class="book-title"[^>]*>([\s\S]*?)<\/h1>/i);
    let bookTitle = 'Otzar HaYirah';
    let bookHebrewTitle = 'אוצר היראה';
    if (bookTitleMatch) {
      const bt = bookTitleMatch[1];
      const heBookMatch = bt.match(/<span[^>]*class="hebrew"[^>]*>(.*?)<\/span>/i);
      if (heBookMatch) bookHebrewTitle = stripHtml(heBookMatch[1]).trim();
      bookTitle = stripHtml(bt.replace(/<span[^>]*class="hebrew"[^>]*>.*?<\/span>/gi, '')).trim();
    }

    // Extract entries
    const entries = [];
    const entryMatches = html.match(/<div[^>]*class="entry"[^>]*>[\s\S]*?<\/div>/gi) || [];

    for (const entryHtml of entryMatches) {
      const numMatch = entryHtml.match(/<span[^>]*class="entry-num"[^>]*>(\d+)\./);
      const sourceMatch = entryHtml.match(/<span[^>]*class="source"[^>]*>(.*?)<\/span>/i);
      const text = stripHtml(entryHtml)
        .replace(/^\d+\.\s*/, '') // Remove leading entry number
        .trim();

      entries.push({
        number: numMatch ? parseInt(numMatch[1]) : entries.length + 1,
        en: text,
        source: sourceMatch ? stripHtml(sourceMatch[1]) : '',
      });
    }

    allSections.push({
      number: sectionNum,
      title,
      hebrewTitle: hebrewTitle || title,
      entries,
      file,
    });
  }

  // Generate reader JSON files
  let totalEntries = 0;

  const torahs = [];
  for (const section of allSections) {
    const segments = section.entries.map((entry, i) => ({
      index: i + 1,
      he: '', // No Hebrew for now - English only
      en: entry.en,
    }));

    totalEntries += segments.length;

    const sectionData = {
      id: `ohy-1-${section.number}`,
      book: 'otzar-hayirah',
      part: 1,
      torah: section.number,
      displayNumber: section.number,
      title: section.title,
      hebrewTitle: section.hebrewTitle,
      keyVerse: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments,
      totalParagraphs: segments.length,
      hasEnglish: true,
      navigation: {
        prev: section.number > 1 ? `/reader/otzar-hayirah/1/${section.number - 1}` : null,
        next: section.number < allSections.length ? `/reader/otzar-hayirah/1/${section.number + 1}` : null,
      },
    };

    if (!DRY_RUN) {
      fs.writeFileSync(
        path.join(partDir, `torah-${section.number}.json`),
        JSON.stringify(sectionData, null, 2)
      );
    }

    torahs.push({
      number: section.number,
      displayNumber: section.number,
      title: section.title,
      hebrewTitle: section.hebrewTitle,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: true,
      url: `/reader/otzar-hayirah/1/${section.number}`,
    });
  }

  // Write index
  const indexData = {
    book: 'otzar-hayirah',
    part: 1,
    title: 'Otzar HaYirah - Volume Mem',
    hebrewTitle: 'אוצר היראה — כרך מ',
    author: 'Rabbi Nosson of Breslov',
    hebrewAuthor: 'רבי נתן מברסלב',
    totalTorahs: torahs.length,
    torahs,
  };

  if (!DRY_RUN) {
    fs.writeFileSync(path.join(partDir, 'index.json'), JSON.stringify(indexData, null, 2));
  }

  console.log(`  Created: ${allSections.length} sections, ${totalEntries} total entries`);
  return allSections.length;
}

// ============================================================
// 7. KITZUR LIKUTAY MOHARAN
// ============================================================

function importKitzurLM() {
  console.log('\n=== Importing Kitzur Likutay Moharan ===');
  const klmDir = path.join(SRC_DIR, 'Kitzure lkm');
  const htmlFiles = fs.readdirSync(klmDir).filter(f => f.endsWith('.html')).sort();
  console.log(`  Found ${htmlFiles.length} HTML files`);

  const allTorahs = {};

  for (const file of htmlFiles) {
    const html = readHtmlFile(path.join(klmDir, file));
    const isPart2 = file.includes('part_two') || file.includes('tinyana');

    // Split by torah headings
    const parts = html.split(/<div[^>]*class="torah-heading"[^>]*>/i);
    parts.shift();

    for (const part of parts) {
      // Extract torah number from heading
      const numMatch = part.match(/Torah\s+(\d+)|Toirah\s+(\d+)|torah-label[^>]*>.*?(\d+)/i);
      let torahNum = null;
      if (numMatch) torahNum = parseInt(numMatch[1] || numMatch[2] || numMatch[3]);

      // Also try: <span class="torah-label">TOIRAH 2</span>
      if (!torahNum) {
        const labelMatch = part.match(/TOIRAH\s+(\d+)/i);
        if (labelMatch) torahNum = parseInt(labelMatch[1]);
      }

      if (!torahNum) continue;

      // Extract teaching items
      const teachings = [];
      const itemMatches = part.match(/<div[^>]*class="teaching-item"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) ||
                          part.match(/<li[^>]*class="teaching-item"[^>]*>[\s\S]*?<\/li>/gi) || [];

      for (const item of itemMatches) {
        const text = stripHtml(item).replace(/^\d+\.\s*/, '').trim();
        if (text.length > 10) teachings.push(text);
      }

      // If no teaching-items found, extract paragraphs after the heading
      if (teachings.length === 0) {
        const afterHeading = part.replace(/^[\s\S]*?<\/div>/i, ''); // skip heading div
        const paras = afterHeading.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
        for (const p of paras) {
          const text = stripHtml(p).trim();
          if (text.length > 10) teachings.push(text);
        }
      }

      if (teachings.length > 0) {
        const key = `${isPart2 ? 2 : 1}-${torahNum}`;
        allTorahs[key] = teachings.join('\n\n');
      }
    }
  }

  console.log(`  Parsed ${Object.keys(allTorahs).length} torahs`);

  let updated = 0;
  for (const [key, text] of Object.entries(allTorahs)) {
    const [partNum, torahNum] = key.split('-').map(Number);
    const jsonPath = path.join(READER_DIR, 'kitzur-likutay-moharan', `part-${partNum}`, `torah-${torahNum}.json`);

    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (data.segments.length > 0) {
        const paras = text.split('\n\n').filter(p => p.trim().length > 10);
        const segsCount = data.segments.length;

        if (paras.length <= segsCount) {
          for (let i = 0; i < paras.length; i++) {
            data.segments[i].en = paras[i];
          }
        } else {
          const ratio = paras.length / segsCount;
          for (let i = 0; i < segsCount; i++) {
            const start = Math.floor(i * ratio);
            const end = Math.floor((i + 1) * ratio);
            data.segments[i].en = paras.slice(start, end).join('\n\n');
          }
        }

        data.hasEnglish = true;
        if (!DRY_RUN) fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
        updated++;
      }
    }
  }

  console.log(`  Updated: ${updated} torahs`);
  return updated;
}

// ============================================================
// 8. SICHOS HARAN
// ============================================================

function importSichosHaran() {
  console.log('\n=== Importing Sichos HaRan ===');
  const mammoth = require('mammoth');
  const sichosDir = path.join(SRC_DIR, 'Sichos Haran');
  const docxFiles = fs.readdirSync(sichosDir).filter(f => f.endsWith('.docx')).sort();
  console.log(`  Found ${docxFiles.length} DOCX files`);

  // We need async for mammoth, so return a promise
  return (async () => {
    const allSichos = {};

    for (const file of docxFiles) {
      const result = await mammoth.extractRawText({path: path.join(sichosDir, file)});
      const text = result.value;

      // Split by numbered sichos: "1. Title" or just "1."
      const lines = text.split('\n');
      let currentNum = null;
      let currentText = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check if this line starts a new sicha: number followed by period or dot
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          // Save previous sicha
          if (currentNum !== null && currentText.length > 0) {
            allSichos[currentNum] = currentText.join('\n\n');
          }
          currentNum = parseInt(numMatch[1]);
          const title = numMatch[2].trim();
          currentText = title.length > 5 ? [title] : [];
        } else if (currentNum !== null) {
          if (trimmed.length > 5 &&
              !trimmed.match(/^sichos haran$/i) &&
              !trimmed.match(/^the words of/i) &&
              !trimmed.match(/^na nach/i) &&
              !trimmed.match(/^articles \d/i) &&
              !trimmed.match(/^translator.*note/i) &&
              !trimmed.match(/^שיחות/)) {
            currentText.push(trimmed);
          }
        }
      }
      // Save last sicha
      if (currentNum !== null && currentText.length > 0) {
        allSichos[currentNum] = currentText.join('\n\n');
      }
    }

    console.log(`  Parsed ${Object.keys(allSichos).length} sichos`);

    let updated = 0;
    const readerDir = path.join(READER_DIR, 'sichos-haran');

    for (const [num, text] of Object.entries(allSichos)) {
      const jsonPath = path.join(readerDir, `sicha-${num}.json`);

      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data.segments.length > 0) {
          const paras = text.split('\n\n').filter(p => p.trim().length > 10);
          const segsCount = data.segments.length;

          if (paras.length <= segsCount) {
            for (let i = 0; i < paras.length; i++) {
              data.segments[i].en = paras[i];
            }
          } else {
            const ratio = paras.length / segsCount;
            for (let i = 0; i < segsCount; i++) {
              const start = Math.floor(i * ratio);
              const end = Math.floor((i + 1) * ratio);
              data.segments[i].en = paras.slice(start, end).join('\n\n');
            }
          }

          data.hasEnglish = true;
          if (!DRY_RUN) fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
          updated++;
        }
      }
    }

    console.log(`  Updated: ${updated} sichos`);
    return updated;
  })();
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('=== English Translation Import ===');
  if (DRY_RUN) console.log('*** DRY RUN ***\n');

  const books = {
    meshivas: importMeshivasNefesh,
    yimai: importYimaiHatlaos,
    ebay: importEbayHanachal,
    tefilos: importLikutayTefilos,
    otzar: importOtzarHayirah,
    kitzur: importKitzurLM,
    sichos: importSichosHaran,
  };

  let total = 0;

  if (targetBook) {
    const key = Object.keys(books).find(k => k.includes(targetBook.toLowerCase()));
    if (key) {
      total = await books[key]();
    } else {
      console.log(`Book not found: ${targetBook}`);
      console.log('Available:', Object.keys(books).join(', '));
    }
  } else {
    for (const [name, fn] of Object.entries(books)) {
      total += await fn();
    }
  }

  console.log(`\n=== DONE === Total items updated: ${total}`);
}

main();
