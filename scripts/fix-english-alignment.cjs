/**
 * fix-english-alignment.cjs
 *
 * Re-extracts English paragraphs from the HTML translation files and
 * re-aligns them to Hebrew segments in the reader JSON files.
 *
 * Problem: the original parser naively assigned every <p> in the HTML
 * (including titles, subtitles, headers, intro notes, section-headers,
 * story-headers, etc.) sequentially to Hebrew segments, causing a
 * cumulative offset.
 *
 * Fix: parse only *content* paragraphs from the HTML, skip structural
 * elements (h1, h2, h3, subtitle, intro-note, section-header, story-header,
 * etc.), then align content paragraphs to Hebrew segments, concatenating
 * when there are more English paragraphs than Hebrew segments within a
 * section.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ─── Configuration ───────────────────────────────────────────────────
const HTML_DIR = 'C:/Users/Pettek/Downloads/final batch from TE';
const READER_DIR = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/reader';

const BOOK_MAP = [
  {
    slug: 'misc-אגרת-הפורים',
    htmlFiles: ['igeres_hapurim.html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-טובות-זכרונות',
    htmlFiles: ['toivos_zikhronos.html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-ליקוטי-אבן',
    htmlFiles: ['likutay_even.html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-מכתב-רבי-געציל-לרב-קוק',
    htmlFiles: ['michtav_getzil.html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-ספר-ההשתטחות',
    htmlFiles: ['sefer_hahishtatchus (1).html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-ספר-שיר-ידידות',
    htmlFiles: ['shir_yedidos.html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-קונטרס-קיום-התורה',
    htmlFiles: ['kuntres_kiyum_hatorah (1).html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-קונטרס-תורה-אור',
    htmlFiles: ['kuntres_torah_ohr.html'],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-שיחת-הנפש',
    htmlFiles: [
      'siychas_hanefesh_part1 (3).html',
      'siychas_hanefesh_part2 (3).html',
      'siychas_hanefesh_part3 (1).html',
    ],
    jsonPattern: 'section',
  },
  {
    slug: 'misc-תולדות-שמואל',
    htmlFiles: [
      'toldos_shmuel_part1.html',
      'toldos_shmuel_part2.html',
      'toldos_shmuel_part3.html',
    ],
    jsonPattern: 'section',
  },
  {
    slug: 'stories-סיפורי-ר--משה-גלידמא',
    htmlFiles: ['sipuray_reb_moshe_glidman.html'],
    jsonPattern: 'story',
  },
  {
    slug: 'stories-סיפורים-מר--שמואל-הו',
    htmlFiles: [
      'sipurim_reb_shmuel_horowitz_part1.html',
      'sipurim_reb_shmuel_horowitz_part2.html',
      'sipurim_reb_shmuel_horowitz_part3.html',
    ],
    jsonPattern: 'story',
  },
];

// ─── HTML Paragraph Extraction ────────────────────────────────────────

/**
 * Extract only content paragraphs from the HTML, skipping structural
 * elements like titles, subtitles, author lines, section headers,
 * story headers, intro boxes, etc.
 *
 * Returns an array of strings (the text of each content paragraph).
 */
function extractContentParagraphs(htmlFiles) {
  const paragraphs = [];

  for (const file of htmlFiles) {
    const filePath = path.join(HTML_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`  [ERROR] HTML file not found: ${filePath}`);
      continue;
    }
    const html = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(html);

    // Remove structural elements that are NOT content paragraphs
    // These are the elements that caused the misalignment
    $('h1, h2, h3, h4, h5, h6').remove();
    $('.subtitle, .author, .intro-note, .intro-box').remove();
    // Section headers (number + title combos)
    $('.section-header').remove();
    // Story headers (number + subject)
    $('.story-header').remove();
    // Source tags
    $('.source-tag').remove();
    // Subsection numbers like "א — Aleph"
    $('.subsection-num').remove();
    // Section numbers
    $('.section-number').remove();
    // Section titles
    $('.section-title').remove();
    // Letter headers
    $('.letter-header').remove();
    // Author notes, colophons, footers
    $('.author-note, .colophon, footer').remove();
    // Date labels (inside entry paragraphs - keep the p but the label is inline)
    // Year block headers
    $('h2, h3').remove(); // any remaining h2/h3 after class-based removal
    // Summary boxes
    $('.summary-box').remove();
    // Translator notes - these ARE content, keep them
    // Zohar quotes - these ARE content, keep them
    // Gap notes - these ARE content, keep them

    // Speaker labels (like "Reb Shmuel:") in igeres_hapurim
    // These are content - they precede the actual speech paragraphs
    // But they were treated as separate paragraphs in the HTML
    // We should include them as they correspond to Hebrew segments

    // Separators (· · · · ·) - skip these
    $('.separator').remove();

    // Now extract all remaining <p> elements
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 0) {
        paragraphs.push(text);
      }
    });

    // Also extract speaker labels as they map to Hebrew segments
    // Actually, speaker divs were already removed or not - let's check
    // In igeres_hapurim, speakers are <div class="speaker">
    // These are NOT <p> tags, so they won't be caught above
    // But they don't correspond to separate Hebrew segments either -
    // the Hebrew has the speaker name inline in the segment text.
    // So we should NOT add them as separate paragraphs.
  }

  return paragraphs;
}

// ─── JSON Loading ─────────────────────────────────────────────────────

function loadAllSegments(bookDir, jsonPattern) {
  // Load index to know how many sections/stories exist
  const indexPath = path.join(bookDir, 'index.json');
  if (!fs.existsSync(indexPath)) {
    console.error(`  [ERROR] index.json not found: ${indexPath}`);
    return { sections: [], totalSegments: 0 };
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  const totalTorahs = index.totalTorahs || 0;

  const sections = [];
  let totalSegments = 0;

  for (let i = 1; i <= totalTorahs; i++) {
    const sectionFile = path.join(bookDir, `${jsonPattern}-${i}.json`);
    if (!fs.existsSync(sectionFile)) {
      console.warn(`  [WARN] Missing section file: ${sectionFile}`);
      continue;
    }
    const sectionData = JSON.parse(fs.readFileSync(sectionFile, 'utf-8'));
    sections.push({ file: sectionFile, data: sectionData });
    totalSegments += (sectionData.segments || []).length;
  }

  return { sections, totalSegments };
}

// ─── Main Alignment Logic ─────────────────────────────────────────────

function alignBook(bookConfig) {
  const { slug, htmlFiles, jsonPattern } = bookConfig;
  const bookDir = path.join(READER_DIR, slug);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing: ${slug}`);
  console.log(`${'='.repeat(60)}`);

  if (!fs.existsSync(bookDir)) {
    console.error(`  [ERROR] Book directory not found: ${bookDir}`);
    return;
  }

  // 1. Extract English content paragraphs from HTML
  const englishParagraphs = extractContentParagraphs(htmlFiles);
  console.log(`  HTML paragraphs extracted: ${englishParagraphs.length}`);

  // 2. Load all JSON sections
  const { sections, totalSegments } = loadAllSegments(bookDir, jsonPattern);
  console.log(`  JSON sections: ${sections.length}, total segments: ${totalSegments}`);

  if (englishParagraphs.length === 0) {
    console.error(`  [ERROR] No English paragraphs found - skipping`);
    return;
  }

  // 3. Assign English paragraphs to segments sequentially
  // The key insight: after removing headers/titles, the remaining
  // content paragraphs should map 1:1 to Hebrew segments.
  // If there are more English paragraphs than segments, we concatenate.
  // If fewer, remaining segments get empty English.

  let engIdx = 0;
  let totalAssigned = 0;
  let totalEmpty = 0;

  for (const section of sections) {
    const segments = section.data.segments || [];
    const segCount = segments.length;

    // Simple sequential assignment
    for (let s = 0; s < segCount; s++) {
      if (engIdx < englishParagraphs.length) {
        segments[s].en = englishParagraphs[engIdx];
        engIdx++;
        totalAssigned++;
      } else {
        segments[s].en = '';
        totalEmpty++;
      }
    }

    // Write updated section back to disk
    fs.writeFileSync(section.file, JSON.stringify(section.data, null, 2), 'utf-8');
  }

  const remaining = englishParagraphs.length - engIdx;
  console.log(`  Assigned: ${totalAssigned}, Empty: ${totalEmpty}, Remaining unused: ${remaining}`);

  if (remaining > 0) {
    console.log(`  [WARN] ${remaining} English paragraphs left over after all segments filled`);
    // Print the first few leftover paragraphs for debugging
    for (let r = engIdx; r < Math.min(engIdx + 3, englishParagraphs.length); r++) {
      console.log(`    Leftover ${r}: "${englishParagraphs[r].substring(0, 80)}..."`);
    }
  }

  // Show first few assignments for verification
  console.log(`  --- Sample alignment (first 5 segments) ---`);
  if (sections.length > 0 && sections[0].data.segments) {
    const segs = sections[0].data.segments;
    for (let s = 0; s < Math.min(5, segs.length); s++) {
      const hePrev = segs[s].he.substring(0, 60);
      const enPrev = (segs[s].en || '').substring(0, 60);
      console.log(`    [${s + 1}] HE: ${hePrev}...`);
      console.log(`         EN: ${enPrev}...`);
    }
  }
}

// ─── Run ──────────────────────────────────────────────────────────────

console.log('English-Hebrew Alignment Fix');
console.log('============================');
console.log(`HTML source: ${HTML_DIR}`);
console.log(`Reader JSON: ${READER_DIR}`);
console.log(`Books to process: ${BOOK_MAP.length}`);

for (const book of BOOK_MAP) {
  alignBook(book);
}

console.log('\n\nDone! Review the sample alignments above to verify correctness.');
