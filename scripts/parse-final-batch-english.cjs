/**
 * parse-final-batch-english.cjs
 *
 * Reads English translation HTML files from "final batch from TE" folder
 * and populates the "en" fields in existing reader JSON files.
 *
 * Usage: node scripts/parse-final-batch-english.cjs
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ─── Configuration ───────────────────────────────────────────────────────────

const HTML_DIR = 'C:/Users/Pettek/Downloads/final batch from TE';
const READER_DIR = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/reader';

const MAPPING = [
  { html: 'igeres_hapurim.html', slug: 'misc-אגרת-הפורים' },
  { html: 'toivos_zikhronos.html', slug: 'misc-טובות-זכרונות' },
  { html: 'likutay_even.html', slug: 'misc-ליקוטי-אבן' },
  { html: 'michtav_getzil.html', slug: 'misc-מכתב-רבי-געציל-לרב-קוק' },
  { html: 'sefer_hahishtatchus (1).html', slug: 'misc-ספר-ההשתטחות' },
  { html: 'shir_yedidos.html', slug: 'misc-ספר-שיר-ידידות' },
  { html: 'kuntres_kiyum_hatorah (1).html', slug: 'misc-קונטרס-קיום-התורה' },
  { html: 'kuntres_torah_ohr.html', slug: 'misc-קונטרס-תורה-אור' },
  { html: ['siychas_hanefesh_part1 (3).html', 'siychas_hanefesh_part2 (3).html', 'siychas_hanefesh_part3 (1).html'], slug: 'misc-שיחת-הנפש' },
  { html: ['toldos_shmuel_part1.html', 'toldos_shmuel_part2.html', 'toldos_shmuel_part3.html'], slug: 'misc-תולדות-שמואל' },
  { html: 'sipuray_reb_moshe_glidman.html', slug: 'stories-סיפורי-ר--משה-גלידמא' },
  { html: ['sipurim_reb_shmuel_horowitz_part1.html', 'sipurim_reb_shmuel_horowitz_part2.html', 'sipurim_reb_shmuel_horowitz_part3.html'], slug: 'stories-סיפורים-מר--שמואל-הו' },
  { html: 'Yitzchok Breiter/shir_yedidos_breiter.html', slug: 'misc-שיר-ידידות-מר-יחיאל-מענדל' },
];

// ─── HTML Extraction ─────────────────────────────────────────────────────────

/**
 * Extract English paragraphs from an HTML file.
 * Returns an array of non-empty text strings.
 */
function extractParagraphs(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(html);

  const paragraphs = [];

  // Remove style and script tags
  $('style, script, head').remove();

  // Process the body content
  const container = $('.container, main').first();
  const root = container.length ? container : $('body');

  // Walk through all relevant elements in document order
  root.find('*').each((_, el) => {
    const $el = $(el);
    const tag = el.tagName ? el.tagName.toLowerCase() : '';

    // Skip container wrappers - we want their children
    if (['div', 'main', 'section', 'article', 'header', 'footer'].includes(tag)) {
      // But extract text from specific div classes that ARE content
      const cls = $el.attr('class') || '';

      // Speaker labels: prefix the next paragraph
      if (cls.includes('speaker')) {
        const speakerText = $el.text().trim();
        if (speakerText) {
          paragraphs.push(`[${speakerText}]`);
        }
        return;
      }

      // Section headers - extract title text
      if (cls.includes('section-header')) {
        const titleEl = $el.find('.section-title');
        const numEl = $el.find('.section-number');
        const sourceEl = $el.find('.source-tag');
        const parts = [];
        if (numEl.length) parts.push(numEl.text().trim());
        if (titleEl.length) parts.push(titleEl.text().trim());
        if (sourceEl.length) parts.push(`(${sourceEl.text().trim()})`);
        const headerText = parts.join(' — ');
        if (headerText) {
          paragraphs.push(headerText);
        }
        return;
      }

      // Story headers
      if (cls.includes('story-header')) {
        const numEl = $el.find('.story-num');
        const subjectEl = $el.find('.story-subject');
        const parts = [];
        if (numEl.length) parts.push(numEl.text().trim());
        if (subjectEl.length) parts.push(subjectEl.text().trim());
        const headerText = parts.join('. ');
        if (headerText) {
          paragraphs.push(headerText);
        }
        return;
      }

      // Intro notes, translator notes, zohar quotes, summary boxes, author notes, grief/joy entries
      if (cls.includes('intro-note') || cls.includes('translator-note') ||
          cls.includes('zohar-quote') || cls.includes('summary-box') ||
          cls.includes('author-note') || cls.includes('grief-entry') ||
          cls.includes('joy-entry') || cls.includes('colophon') ||
          cls.includes('intro-box') || cls.includes('compiler-note')) {
        const text = $el.text().trim();
        if (text) {
          paragraphs.push(text);
        }
        return;
      }

      // Sub markers
      if (cls.includes('sub-marker')) {
        const text = $el.text().trim();
        if (text) {
          paragraphs.push(text);
        }
        return;
      }

      // Gap notes
      if (cls.includes('gap-note')) {
        const text = $el.text().trim();
        if (text) {
          paragraphs.push(text);
        }
        return;
      }

      // Source torah blocks
      if (cls.includes('source-torah')) {
        const text = $el.text().trim();
        if (text) {
          paragraphs.push(text);
        }
        return;
      }

      // Separator dots - skip them
      if (cls.includes('separator')) {
        return;
      }

      // For story-body, year-block, section-block, letter-block, section, entry, etc.
      // Don't extract text directly - let children handle it
      return;
    }

    // Paragraph tags
    if (tag === 'p') {
      // Check if parent already handled this (e.g. inside intro-note, zohar-quote etc.)
      const parentCls = $el.parent().attr('class') || '';
      if (parentCls.includes('intro-note') || parentCls.includes('translator-note') ||
          parentCls.includes('zohar-quote') || parentCls.includes('summary-box') ||
          parentCls.includes('author-note') || parentCls.includes('intro-box') ||
          parentCls.includes('compiler-note')) {
        return; // Parent div already captured all text
      }

      const text = $el.text().trim();
      if (text) {
        paragraphs.push(text);
      }
      return;
    }

    // H1, H2, H3 headings (book titles, year headings, etc.)
    if (['h1', 'h2', 'h3'].includes(tag)) {
      // Check if inside a section-header (already handled)
      const parentCls = $el.parent().attr('class') || '';
      if (parentCls.includes('section-header') || parentCls.includes('summary-box')) {
        return;
      }

      const text = $el.text().trim();
      if (text) {
        // Skip pure Hebrew titles (we only want English)
        if (/^[\u0590-\u05FF\s\u0027\u05F3\u05F4·—\-]+$/.test(text)) {
          return;
        }
        paragraphs.push(text);
      }
      return;
    }

    // Horizontal rules (section dividers) - skip
    if (tag === 'hr') {
      return;
    }
  });

  return paragraphs;
}

// ─── Reader JSON helpers ─────────────────────────────────────────────────────

/**
 * Detect the file naming pattern for a reader book (section-N.json or story-N.json).
 */
function detectFilePattern(bookDir) {
  const files = fs.readdirSync(bookDir);
  if (files.some(f => f.startsWith('story-'))) {
    return 'story';
  }
  return 'section';
}

/**
 * Load all section/story JSON files for a book, sorted by number.
 */
function loadSectionFiles(bookDir) {
  const pattern = detectFilePattern(bookDir);
  const files = fs.readdirSync(bookDir)
    .filter(f => f.startsWith(`${pattern}-`) && f.endsWith('.json'))
    .map(f => {
      const num = parseInt(f.replace(`${pattern}-`, '').replace('.json', ''), 10);
      return { file: f, num };
    })
    .sort((a, b) => a.num - b.num);

  return files.map(({ file, num }) => {
    const filePath = path.join(bookDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return { filePath, num, data, pattern };
  });
}

/**
 * Collect all segments across all sections, in order.
 * Returns array of { sectionIdx, segmentIdx, segment } references.
 */
function collectAllSegments(sections) {
  const allSegments = [];
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    if (!section.data.segments) continue;
    for (let sgi = 0; sgi < section.data.segments.length; sgi++) {
      allSegments.push({
        sectionIdx: si,
        segmentIdx: sgi,
        segment: section.data.segments[sgi],
      });
    }
  }
  return allSegments;
}

// ─── Main Processing ─────────────────────────────────────────────────────────

function processBook(entry) {
  const { slug } = entry;
  const htmlFiles = Array.isArray(entry.html) ? entry.html : [entry.html];

  const bookDir = path.join(READER_DIR, slug);
  if (!fs.existsSync(bookDir)) {
    console.log(`  SKIP: Reader directory not found: ${bookDir}`);
    return { slug, status: 'missing_dir', sections: 0, paragraphs: 0, segments: 0 };
  }

  // Extract all English paragraphs from all HTML files
  const allParagraphs = [];
  for (const htmlFile of htmlFiles) {
    const htmlPath = path.join(HTML_DIR, htmlFile);
    if (!fs.existsSync(htmlPath)) {
      console.log(`  SKIP: HTML file not found: ${htmlPath}`);
      return { slug, status: 'missing_html', file: htmlFile, sections: 0, paragraphs: 0, segments: 0 };
    }
    const paras = extractParagraphs(htmlPath);
    console.log(`    Extracted ${paras.length} paragraphs from ${htmlFile}`);
    allParagraphs.push(...paras);
  }

  // Load all section files
  const sections = loadSectionFiles(bookDir);
  const allSegments = collectAllSegments(sections);

  console.log(`    Total English paragraphs: ${allParagraphs.length}`);
  console.log(`    Total Hebrew segments: ${allSegments.length}`);

  if (allParagraphs.length === 0) {
    console.log(`  WARN: No paragraphs extracted from HTML`);
    return { slug, status: 'no_paragraphs', sections: sections.length, paragraphs: 0, segments: allSegments.length };
  }

  if (allSegments.length === 0) {
    console.log(`  WARN: No segments found in reader JSON`);
    return { slug, status: 'no_segments', sections: sections.length, paragraphs: allParagraphs.length, segments: 0 };
  }

  // Distribute English paragraphs across segments
  // Strategy: sequential 1:1 mapping when counts match or are close
  // When there are more paragraphs than segments, merge extras into the last segment
  // When there are fewer paragraphs than segments, leave remaining segments empty

  const paraCount = allParagraphs.length;
  const segCount = allSegments.length;

  let assignedCount = 0;

  if (paraCount <= segCount) {
    // Assign 1:1, leaving extras empty
    for (let i = 0; i < paraCount; i++) {
      allSegments[i].segment.en = allParagraphs[i];
      assignedCount++;
    }
    if (paraCount < segCount) {
      console.log(`  NOTE: ${segCount - paraCount} segments left without English (fewer paragraphs than segments)`);
    }
  } else {
    // More paragraphs than segments
    // Assign 1:1 for all but the last segment, merge remaining into last
    for (let i = 0; i < segCount - 1; i++) {
      allSegments[i].segment.en = allParagraphs[i];
      assignedCount++;
    }
    // Merge remaining paragraphs into last segment
    const remaining = allParagraphs.slice(segCount - 1);
    allSegments[segCount - 1].segment.en = remaining.join('\n\n');
    assignedCount++;
    console.log(`  NOTE: ${paraCount - segCount + 1} paragraphs merged into last segment (more paragraphs than segments)`);
  }

  // Mark sections as having English and write them back
  const modifiedSections = new Set();
  for (const seg of allSegments) {
    if (seg.segment.en) {
      modifiedSections.add(seg.sectionIdx);
    }
  }

  for (const si of modifiedSections) {
    const section = sections[si];
    section.data.hasEnglish = true;
    fs.writeFileSync(section.filePath, JSON.stringify(section.data, null, 2), 'utf8');
  }

  // Update index.json
  const indexPath = path.join(bookDir, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    if (index.torahs) {
      for (const torah of index.torahs) {
        // Check if this torah's section was modified
        const sectionNum = torah.number;
        const matchingSection = sections.find(s => s.num === sectionNum);
        if (matchingSection && modifiedSections.has(sections.indexOf(matchingSection))) {
          torah.hasEnglish = true;
        }
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  console.log(`  DONE: Assigned English to ${assignedCount} segments across ${modifiedSections.size} sections`);

  return {
    slug,
    status: 'success',
    sections: modifiedSections.size,
    paragraphs: paraCount,
    segments: segCount,
    assigned: assignedCount,
  };
}

// ─── Run ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('=== Final Batch English Translation Parser ===\n');
  console.log(`HTML source: ${HTML_DIR}`);
  console.log(`Reader target: ${READER_DIR}\n`);

  const results = [];

  for (const entry of MAPPING) {
    const slug = entry.slug;
    const htmlFiles = Array.isArray(entry.html) ? entry.html.join(', ') : entry.html;
    console.log(`\nProcessing: ${slug}`);
    console.log(`  HTML: ${htmlFiles}`);

    try {
      const result = processBook(entry);
      results.push(result);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      results.push({ slug, status: 'error', error: err.message });
    }
  }

  // Summary
  console.log('\n\n=== SUMMARY ===\n');
  console.log('Book'.padEnd(45) + 'Status'.padEnd(12) + 'Paras'.padEnd(8) + 'Segs'.padEnd(8) + 'Assigned');
  console.log('-'.repeat(85));
  for (const r of results) {
    const shortSlug = r.slug.length > 42 ? r.slug.substring(0, 42) + '...' : r.slug;
    console.log(
      shortSlug.padEnd(45) +
      (r.status || '').padEnd(12) +
      String(r.paragraphs || 0).padEnd(8) +
      String(r.segments || 0).padEnd(8) +
      String(r.assigned || 0)
    );
  }

  const successful = results.filter(r => r.status === 'success');
  const totalAssigned = successful.reduce((sum, r) => sum + (r.assigned || 0), 0);
  console.log(`\nTotal: ${successful.length}/${results.length} books processed, ${totalAssigned} segments with English`);
}

main();
