/**
 * smart-align-english.cjs
 *
 * Re-aligns English translations from HTML source files to Hebrew segments
 * in reader JSON files. The previous parser assigned English paragraphs
 * sequentially, but offset issues exist because HTML files have extra
 * title/header/note paragraphs that don't correspond to Hebrew segments.
 *
 * This script:
 * 1. Reads fresh English from the HTML source files
 * 2. Categorizes each element as title/header/note/content
 * 3. Assigns ONLY content paragraphs to Hebrew segments sequentially
 * 4. Leftover content goes as supplementary "note" segments
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const READER_BASE = path.join(__dirname, '..', 'public', 'reader');
const HTML_BASE = 'C:/Users/Pettek/Downloads/final batch from TE';

// ---- Book configuration ----
// Maps reader directory -> HTML file(s) + file pattern (section-N or story-N)
const BOOKS = [
  {
    dir: 'misc-אגרת-הפורים',
    htmlFiles: ['igeres_hapurim.html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-טובות-זכרונות',
    htmlFiles: ['toivos_zikhronos.html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-ליקוטי-אבן',
    htmlFiles: ['likutay_even.html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-מכתב-רבי-געציל-לרב-קוק',
    htmlFiles: ['michtav_getzil.html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-ספר-ההשתטחות',
    htmlFiles: ['sefer_hahishtatchus (1).html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-ספר-שיר-ידידות',
    htmlFiles: ['shir_yedidos.html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-קונטרס-קיום-התורה',
    htmlFiles: ['kuntres_kiyum_hatorah (1).html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-קונטרס-תורה-אור',
    htmlFiles: ['kuntres_torah_ohr.html'],
    filePattern: 'section',
  },
  {
    dir: 'misc-שיחת-הנפש',
    htmlFiles: [
      'siychas_hanefesh_part1 (3).html',
      'siychas_hanefesh_part2 (3).html',
      'siychas_hanefesh_part3 (1).html',
    ],
    filePattern: 'section',
  },
  {
    dir: 'misc-תולדות-שמואל',
    htmlFiles: [
      'toldos_shmuel_part1.html',
      'toldos_shmuel_part2.html',
      'toldos_shmuel_part3.html',
    ],
    filePattern: 'section',
  },
  {
    dir: 'stories-סיפורי-ר--משה-גלידמא',
    htmlFiles: ['sipuray_reb_moshe_glidman.html'],
    filePattern: 'story',
  },
  {
    dir: 'stories-סיפורים-מר--שמואל-הו',
    htmlFiles: [
      'sipurim_reb_shmuel_horowitz_part1.html',
      'sipurim_reb_shmuel_horowitz_part2.html',
      'sipurim_reb_shmuel_horowitz_part3.html',
    ],
    filePattern: 'story',
  },
];

/**
 * Extract and categorize paragraphs from an HTML file.
 * Returns an array of { type: 'title'|'header'|'note'|'content'|'separator', text: string }
 */
function extractParagraphs(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(html);
  const paragraphs = [];

  // Helper to get clean text
  const cleanText = (el) => {
    return $(el).text().trim().replace(/\s+/g, ' ');
  };

  // Walk through body elements in order
  // We need to find content elements in their document order
  const body = $('body');

  // Recursive function to walk DOM in order
  function walkElements(parent) {
    $(parent).children().each((i, el) => {
      const $el = $(el);
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      const cls = ($el.attr('class') || '').toLowerCase();
      const text = cleanText(el);

      if (!text || text.length === 0) return;

      // Skip style/script tags
      if (tag === 'style' || tag === 'script' || tag === 'head') return;

      // Title elements
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        if (cls.includes('subtitle') || cls.includes('author') || cls.includes('nav-note')) {
          paragraphs.push({ type: 'title', text, tag, cls });
        } else {
          paragraphs.push({ type: 'title', text, tag, cls });
        }
        return;
      }

      // Header elements (section headers, story headers, etc.)
      if (tag === 'header') {
        paragraphs.push({ type: 'title', text, tag, cls });
        return;
      }

      // Check for specific class-based categorization
      if (cls.includes('intro-note') || cls.includes('intro-box') || cls.includes('compiler-note')) {
        paragraphs.push({ type: 'note', text, tag, cls });
        return;
      }

      if (cls.includes('section-header') || cls.includes('story-header')) {
        paragraphs.push({ type: 'header', text, tag, cls });
        return;
      }

      if (cls.includes('section-number') || cls.includes('section-title') ||
          cls.includes('story-num') || cls.includes('story-subject') ||
          cls.includes('arabic-num')) {
        paragraphs.push({ type: 'header', text, tag, cls });
        return;
      }

      if (cls.includes('separator') || cls.includes('gap-note')) {
        paragraphs.push({ type: 'separator', text, tag, cls });
        return;
      }

      if (cls.includes('colophon') || cls.includes('footer') || cls.includes('summary')) {
        paragraphs.push({ type: 'note', text, tag, cls });
        return;
      }

      if (cls.includes('speaker')) {
        paragraphs.push({ type: 'header', text, tag, cls });
        return;
      }

      if (cls.includes('heb-super') || cls.includes('part-label')) {
        paragraphs.push({ type: 'title', text, tag, cls });
        return;
      }

      if (cls.includes('translator-note') || cls.includes('author-note')) {
        paragraphs.push({ type: 'note', text, tag, cls });
        return;
      }

      if (cls.includes('source-torah')) {
        paragraphs.push({ type: 'header', text, tag, cls });
        return;
      }

      if (cls.includes('sub-marker')) {
        paragraphs.push({ type: 'header', text, tag, cls });
        return;
      }

      if (cls.includes('letter-header')) {
        paragraphs.push({ type: 'header', text, tag, cls });
        return;
      }

      if (tag === 'footer') {
        paragraphs.push({ type: 'note', text, tag, cls });
        return;
      }

      // Content paragraphs
      if (tag === 'p') {
        // Check parent classes for context
        const parentCls = ($el.parent().attr('class') || '').toLowerCase();

        if (cls.includes('author-note') || cls.includes('grief-entry') || cls.includes('joy-entry')) {
          // These are still content - they contain diary entries
          paragraphs.push({ type: 'content', text, tag, cls });
          return;
        }

        if (parentCls.includes('intro-note') || parentCls.includes('intro-box') ||
            parentCls.includes('compiler-note')) {
          paragraphs.push({ type: 'note', text, tag, cls });
          return;
        }

        if (parentCls.includes('section-header') || parentCls.includes('story-header')) {
          paragraphs.push({ type: 'header', text, tag, cls });
          return;
        }

        // Regular paragraph = content
        paragraphs.push({ type: 'content', text, tag, cls });
        return;
      }

      // div elements with specific classes containing paragraphs
      if (tag === 'div') {
        // For containers like .section, .story, .letter-block, .year-block, .poem-block, .entry
        // recurse into them
        if (cls.includes('section') || cls.includes('story') || cls.includes('letter-block') ||
            cls.includes('year-block') || cls.includes('poem-block') || cls.includes('container') ||
            cls.includes('entry') || cls.includes('section-block') || cls.includes('story-body')) {
          walkElements(el);
          return;
        }

        // For main element
        if (tag === 'main' || cls === '') {
          walkElements(el);
          return;
        }

        // Already handled specific classes above, for anything else recurse
        walkElements(el);
        return;
      }

      // main tag
      if (tag === 'main') {
        walkElements(el);
        return;
      }
    });
  }

  walkElements(body);
  return paragraphs;
}

/**
 * Load all JSON section/story files for a book, sorted by number.
 */
function loadBookSections(bookDir, filePattern) {
  const dirPath = path.join(READER_BASE, bookDir);
  if (!fs.existsSync(dirPath)) {
    console.log(`  WARNING: Directory not found: ${dirPath}`);
    return [];
  }

  const files = fs.readdirSync(dirPath)
    .filter(f => f.startsWith(filePattern + '-') && f.endsWith('.json'))
    .map(f => {
      const num = parseInt(f.replace(filePattern + '-', '').replace('.json', ''));
      return { file: f, num };
    })
    .sort((a, b) => a.num - b.num);

  return files.map(({ file, num }) => {
    const filePath = path.join(dirPath, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { file, num, filePath, data };
  });
}

/**
 * Process a single book: re-align English from HTML to JSON segments.
 */
function processBook(bookConfig) {
  const { dir, htmlFiles, filePattern } = bookConfig;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`PROCESSING: ${dir}`);
  console.log(`${'='.repeat(70)}`);

  // 1. Extract all English paragraphs from HTML files
  let allParagraphs = [];
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(HTML_BASE, htmlFile);
    if (!fs.existsSync(htmlPath)) {
      console.log(`  WARNING: HTML file not found: ${htmlPath}`);
      continue;
    }
    const paras = extractParagraphs(htmlPath);
    console.log(`  ${htmlFile}: ${paras.length} elements extracted`);

    // Show breakdown
    const counts = {};
    for (const p of paras) {
      counts[p.type] = (counts[p.type] || 0) + 1;
    }
    console.log(`    Types: ${JSON.stringify(counts)}`);
    allParagraphs = allParagraphs.concat(paras);
  }

  // 2. Get only content paragraphs (these map to Hebrew segments)
  const contentParas = allParagraphs.filter(p => p.type === 'content');
  const noteParas = allParagraphs.filter(p => p.type === 'note');
  console.log(`  Total content paragraphs: ${contentParas.length}`);
  console.log(`  Total note paragraphs: ${noteParas.length}`);

  // 3. Load all JSON section files
  const sections = loadBookSections(dir, filePattern);
  if (sections.length === 0) {
    console.log(`  SKIPPING: No section files found`);
    return;
  }

  // Count total Hebrew segments
  let totalHebrewSegments = 0;
  for (const sec of sections) {
    totalHebrewSegments += sec.data.segments.length;
  }
  console.log(`  Total Hebrew segments: ${totalHebrewSegments}`);
  console.log(`  Content paragraphs vs Hebrew segments: ${contentParas.length} vs ${totalHebrewSegments}`);

  // 4. Assign content paragraphs to segments sequentially
  let contentIdx = 0;
  let assignedCount = 0;
  let sectionsModified = 0;

  for (const sec of sections) {
    let modified = false;
    for (let i = 0; i < sec.data.segments.length; i++) {
      const seg = sec.data.segments[i];
      if (contentIdx < contentParas.length) {
        const oldEn = seg.en || '';
        const newEn = contentParas[contentIdx].text;

        if (oldEn !== newEn) {
          modified = true;
        }
        seg.en = newEn;
        contentIdx++;
        assignedCount++;
      } else {
        // No more English content available
        if (seg.en && seg.en.length > 0) {
          seg.en = '';
          modified = true;
        }
      }
    }

    if (modified) {
      sectionsModified++;
    }
  }

  // 5. Handle leftover content paragraphs -> append as note segments to last section
  const leftoverCount = contentParas.length - contentIdx;
  if (leftoverCount > 0 && sections.length > 0) {
    console.log(`  Leftover content paragraphs: ${leftoverCount} (appending as notes to last section)`);
    const lastSection = sections[sections.length - 1];
    const lastIdx = lastSection.data.segments.length > 0
      ? lastSection.data.segments[lastSection.data.segments.length - 1].index
      : 0;

    for (let i = contentIdx; i < contentParas.length; i++) {
      lastSection.data.segments.push({
        index: lastIdx + (i - contentIdx) + 1,
        he: '',
        en: contentParas[i].text,
        type: 'note',
      });
    }
    sectionsModified = Math.max(sectionsModified, 1); // ensure last section is saved
  }

  // 6. Update totalParagraphs in each section and write back
  let filesWritten = 0;
  for (const sec of sections) {
    sec.data.totalParagraphs = sec.data.segments.length;
    sec.data.hasEnglish = sec.data.segments.some(s => s.en && s.en.length > 0);
    fs.writeFileSync(sec.filePath, JSON.stringify(sec.data, null, 2), 'utf8');
    filesWritten++;
  }

  // 7. Update index.json
  const indexPath = path.join(READER_BASE, dir, 'index.json');
  if (fs.existsSync(indexPath)) {
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (indexData.torahs) {
      for (const torah of indexData.torahs) {
        const matchSec = sections.find(s => s.num === torah.number);
        if (matchSec) {
          torah.paragraphs = matchSec.data.segments.length;
          torah.hasEnglish = matchSec.data.hasEnglish;
        }
      }
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    }
  }

  console.log(`  Assigned: ${assignedCount} content paragraphs to ${totalHebrewSegments} Hebrew segments`);
  console.log(`  Files written: ${filesWritten}`);

  // 8. Print alignment samples for verification
  console.log(`\n  --- ALIGNMENT SAMPLES ---`);
  const samplesToShow = Math.min(3, sections.length);
  for (let si = 0; si < samplesToShow; si++) {
    const sec = sections[si];
    console.log(`\n  [${sec.file}] "${sec.data.title}"`);
    const segSamples = Math.min(3, sec.data.segments.length);
    for (let i = 0; i < segSamples; i++) {
      const seg = sec.data.segments[i];
      const hePreview = (seg.he || '').substring(0, 60);
      const enPreview = (seg.en || '').substring(0, 80);
      console.log(`    seg ${seg.index}: HE: "${hePreview}..."`);
      console.log(`             EN: "${enPreview}..."`);
    }
  }

  return {
    book: dir,
    totalHebrew: totalHebrewSegments,
    totalContent: contentParas.length,
    assigned: assignedCount,
    leftover: leftoverCount > 0 ? leftoverCount : 0,
    filesWritten,
  };
}

// ---- Main ----
console.log('Smart English Alignment Script');
console.log('==============================');
console.log(`Reader base: ${READER_BASE}`);
console.log(`HTML base: ${HTML_BASE}`);

const results = [];
for (const book of BOOKS) {
  try {
    const result = processBook(book);
    if (result) results.push(result);
  } catch (err) {
    console.error(`  ERROR processing ${book.dir}: ${err.message}`);
    console.error(err.stack);
  }
}

// Summary
console.log(`\n${'='.repeat(70)}`);
console.log('SUMMARY');
console.log(`${'='.repeat(70)}`);
console.log(`${'Book'.padEnd(45)} ${'Hebrew'.padStart(7)} ${'Content'.padStart(8)} ${'Assigned'.padStart(9)} ${'Left'.padStart(5)}`);
for (const r of results) {
  console.log(`${r.book.padEnd(45)} ${String(r.totalHebrew).padStart(7)} ${String(r.totalContent).padStart(8)} ${String(r.assigned).padStart(9)} ${String(r.leftover).padStart(5)}`);
}
console.log(`\nDone!`);
