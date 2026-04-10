/**
 * parse-koachvay-or-english.cjs
 *
 * Reads the 18 HTML translation files from a source directory and populates
 * the "en" field of the existing Kokhvei Or reader JSON files.
 *
 * Usage:
 *   node scripts/parse-koachvay-or-english.cjs [sourceDir]
 *
 * Default sourceDir: C:/Users/Pettek/Downloads/Koachvay Or/
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SRC_DIR = process.argv[2] || 'C:/Users/Pettek/Downloads/Koachvay Or/';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'kokhvei-or');

// Mapping: each entry says which HTML file(s) feed into which reader section,
// and how to extract English text from the HTML.
//
// extractMode:
//   "all"        – combine all content children into one big text per segment
//                  (for simple files where block count ~= segment count)
//   "entries"    – each div.entry maps to one segment sequentially
//   "sections"   – use .section-header / .section-num markers to group content
//   "custom"     – use a custom extraction function
//
const FILE_SECTION_MAP = [
  {
    section: 1,
    files: ['010 koachvay_or_hakdama.html'],
    extractMode: 'custom',
    customExtract: extractHakdama,
  },
  {
    section: 2,
    files: [
      '050 koachvay_or_part1_anshay_moharan.html',
      '060 koachvay_or_part1_sections anshay - 17_32_ preface to roshay_prakim.html',
    ],
    extractMode: 'custom',
    customExtract: extractAnshayMoharan,
  },
  {
    section: 3,
    files: [
      '060 koachvay_or_part1_sections anshay - 17_32_ preface to roshay_prakim.html',
      '070 koachvay_or_roshay_prakim_alef_through_yod_dalet.html',
      '080 koachvay_or_roshay_prakim_tet_vav_through_mem_zayin_close_part1.html',
    ],
    extractMode: 'custom',
    customExtract: extractRoshayPrakim,
  },
  // Section 4 (Diburim miMoharan'as) has no corresponding English translation file
  // {
  //   section: 4,
  //   files: [],
  //   extractMode: 'skip',
  // },
  {
    section: 5,
    files: ['100 koachvay_or_part2_emes_veemuno.html'],
    extractMode: 'sections',
  },
  {
    section: 6,
    files: ['200 koachvay_or_part3_chochmo_uvino.html'],
    extractMode: 'sections',
  },
  {
    section: 7,
    files: ['400 koachvay_or_part4_soson_vesimcho_COMPLETE.html'],
    extractMode: 'custom',
    customExtract: extractSosonVeSimcho,
  },
  {
    section: 8,
    files: ['400 koachvay_or_part4_soson_vesimcho_COMPLETE.html'],
    extractMode: 'custom',
    customExtract: extractPrayers,
  },
  {
    section: 9,
    files: ['400 koachvay_or_part4_soson_vesimcho_COMPLETE.html'],
    extractMode: 'custom',
    customExtract: extractChiddushim,
  },
  {
    section: 10,
    files: ['500 koachvay_or_sefer_sipurim_niflaim (1).html'],
    extractMode: 'custom',
    customExtract: extractSipurimTitle,
  },
  {
    section: 11,
    files: ['500 koachvay_or_sefer_sipurim_niflaim (1).html'],
    extractMode: 'custom',
    customExtract: extractSipurimNiflaim,
  },
  {
    section: 12,
    files: ['550 koachvay_or_tzavaas_harat_mitsherin.html'],
    extractMode: 'custom',
    customExtract: extractTzavaas,
  },
  {
    section: 13,
    files: ['600 koachvay_or_sefer_sichos_vesipurim.html'],
    extractMode: 'custom',
    customExtract: extractSeferSichos,
  },
  {
    section: 14,
    files: ['650 koachvay_or_rashei_perakim_and_biur.html'],
    extractMode: 'custom',
    customExtract: extractRasheiPerakimBiur14,
  },
  {
    section: 15,
    files: ['650 koachvay_or_rashei_perakim_and_biur.html'],
    extractMode: 'custom',
    customExtract: extractBiurHalikutim,
  },
  {
    section: 16,
    files: ['700 koachvay_or_keres_shlishi.html'],
    extractMode: 'contentSections',
  },
  {
    section: 17,
    files: ['710 koachvay_or_krach_shishi.html'],
    extractMode: 'contentSections',
  },
  {
    section: 18,
    files: ['750 koachvay_or_hosafos.html'],
    extractMode: 'contentSections',
  },
  {
    section: 19,
    files: ['800 koachvay_or_avnei_habarzel.html'],
    extractMode: 'contentSections',
  },
  {
    section: 20,
    files: ['900 koachvay_or_sichos_merabbeinu (1).html'],
    extractMode: 'entries',
  },
  {
    section: 21,
    files: ['950 koachvay_or_sichos_mimoharanas (2).html'],
    extractMode: 'custom',
    customExtract: extractSichosFromMoharnas,
  },
];

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Load an HTML file and return a cheerio instance */
function loadHtml(filename) {
  const filepath = path.join(SRC_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.error(`  WARNING: File not found: ${filepath}`);
    return null;
  }
  const html = fs.readFileSync(filepath, 'utf8');
  return cheerio.load(html);
}

/** Load a reader section JSON */
function loadSection(num) {
  const filepath = path.join(READER_DIR, `section-${num}.json`);
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

/** Save a reader section JSON */
function saveSection(num, data) {
  const filepath = path.join(READER_DIR, `section-${num}.json`);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Extract clean text from a cheerio element, stripping HTML tags
 * but preserving line breaks for block elements.
 */
function cleanText($, el) {
  // Get text, handling inline elements
  let text = $(el).text().trim();
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Extract text from an element, preserving paragraph breaks within it.
 * Returns the full text of the element with paragraphs joined by newlines.
 */
function extractElementText($, el) {
  const parts = [];
  const $el = $(el);

  // If the element itself is a simple text container
  if ($el.children().length === 0) {
    return $el.text().trim();
  }

  // Walk child nodes
  $el.contents().each((i, node) => {
    if (node.type === 'text') {
      const t = $(node).text().trim();
      if (t) parts.push(t);
    } else if (node.type === 'tag') {
      const tag = node.tagName;
      const cls = $(node).attr('class') || '';

      // Skip translator summaries, dividers
      if (cls.includes('translator-summary') || cls.includes('divider') ||
          cls.includes('t-summary') || cls.includes('nanach-footer') ||
          cls.includes('page-footer')) {
        return;
      }

      const childText = $(node).text().trim();
      if (childText) {
        if (tag === 'br') {
          parts.push('\n');
        } else if (tag === 'p' || tag === 'div') {
          parts.push(childText);
        } else {
          parts.push(childText);
        }
      }
    }
  });

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract all meaningful text blocks from .content children.
 * Returns an array of text strings, one per block.
 */
function extractContentBlocks($) {
  const blocks = [];
  const content = $('.content');
  if (!content.length) return blocks;

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    // Skip decorative / meta elements
    if (cls.includes('divider') || cls.includes('translator-summary') ||
        cls.includes('t-summary') || cls.includes('compiler-note') ||
        cls.includes('roshay-header')) {
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 5) {
      blocks.push(text);
    }
  });

  return blocks;
}

/**
 * Extract entries from .content > div.entry or body > div.entry.
 * Each entry becomes one English block (combining its children).
 */
function extractEntries($, selector) {
  const entries = [];
  $(selector || '.content > div.entry, body > div.entry').each((i, el) => {
    const parts = [];
    $(el).children().each((j, ch) => {
      const text = $(ch).text().trim();
      if (text) parts.push(text);
    });
    const combined = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    if (combined) entries.push(combined);
  });
  return entries;
}

/**
 * Extract sections grouped by .section-header markers.
 * Returns INDIVIDUAL paragraphs (not grouped by section header),
 * so they can be mapped to fine-grained Hebrew segments.
 */
function extractBySecHeaders($) {
  const blocks = [];
  const content = $('.content');
  if (!content.length) return blocks;

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (cls.includes('divider') || cls.includes('translator-summary') ||
        cls.includes('t-summary')) {
      return;
    }

    // Section headers become their own block
    if (cls.includes('section-header')) {
      const headerText = $(el).text().trim();
      if (headerText) blocks.push(headerText);
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 5) {
      blocks.push(text);
    }
  });

  return blocks;
}

/**
 * Generic extraction using div.section elements or numbered entries.
 * Extracts individual paragraphs from within each section for
 * finer-grained segment mapping.
 */
function extractContentSections($) {
  const blocks = [];
  const content = $('.content');
  const root = content.length ? content : $('body');

  // Try div.section first - extract individual child paragraphs
  const divSections = root.find('> div.section');
  if (divSections.length > 0) {
    // Include any intro content before first section
    root.children().each((i, el) => {
      const cls = $(el).attr('class') || '';
      const tag = el.tagName;
      if (cls === 'section') return false; // stop at first section
      if (cls.includes('divider') || cls.includes('translator-summary') ||
          tag === 'style') return;
      const text = extractElementText($, el);
      if (text && text.length > 5) blocks.push(text);
    });

    divSections.each((i, section) => {
      // Extract each child element of the section as a separate block
      $(section).children().each((j, ch) => {
        const text = $(ch).text().trim();
        if (text && text.length > 3) blocks.push(text);
      });
    });
    return blocks;
  }

  // Try by section-num markers - extract individual paragraphs
  root.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (cls.includes('divider') || cls.includes('translator-summary') ||
        cls.includes('t-summary') || tag === 'style' || tag === 'script') {
      return;
    }

    // Check for elements with section-num inside - extract sub-elements
    const secNum = $(el).find('.section-num');
    if (secNum.length > 0) {
      $(el).children().each((j, ch) => {
        const text = $(ch).text().trim();
        if (text && text.length > 3) blocks.push(text);
      });
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 3) {
      blocks.push(text);
    }
  });

  // If no blocks found, fall back to basic content blocks
  if (blocks.length === 0) {
    return extractContentBlocks($);
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Custom extraction functions for complex files
// ---------------------------------------------------------------------------

function extractHakdama(files) {
  const $ = loadHtml(files[0]);
  if (!$) return [];
  const content = $('.content');
  const blocks = [];

  // Segment 1: Everything up to the book-structure (the big opening text)
  const seg1Parts = [];
  let reachedBookStructure = false;

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    if (cls.includes('book-structure') || cls.includes('translator-summary')) {
      reachedBookStructure = true;
      return;
    }
    if (cls.includes('divider')) return;

    if (!reachedBookStructure) {
      const text = extractElementText($, el);
      if (text && text.length > 5) seg1Parts.push(text);
    }
  });

  blocks.push(seg1Parts.join('\n\n'));

  // Segment 2: The intro line before the book-structure
  // ("And this is why I named this compilation...")
  // Already included in seg1Parts above. Segment 2 in Hebrew is short:
  // "And I named this compilation Kokhvei Or, for I divided the book into four parts"
  // Find the last paragraph before book-structure
  blocks.push('And this is why I named this compilation by their name — Koachvay Or ["Stars of Light"]. For I have divided this book into four sections:');

  // Segments 3-6: The four parts from the book-structure
  content.find('.book-structure .part-entry').each((i, el) => {
    const text = extractElementText($, el);
    if (text) blocks.push(text);
  });

  return blocks;
}

function extractAnshayMoharan(files) {
  // File 050 has sections א-טז (1-16) of Anshay Moharan
  // File 060 has sections יז-לב (17-32) + preface to roshay prakim
  // section-2 has 38 segments: ~4 intro segs + 32 numbered + 2 closing
  // Segments: 1=פתיחה, 2=title, 3=intro, 4=preface, 5-20=sections 1-16, 21-36=sections 17-32, 37-38=closing

  const blocks = [];

  // File 050: extract sections with intro
  const $050 = loadHtml(files[0]);
  if (!$050) return blocks;

  const content050 = $050('.content');
  let introBlocks = [];
  let sectionBlocks050 = [];
  let foundFirstSection = false;

  content050.children().each((i, el) => {
    const cls = $050(el).attr('class') || '';
    if (cls.includes('divider') || cls.includes('translator-summary') ||
        cls.includes('t-summary')) return;

    if (cls.includes('section-header')) {
      foundFirstSection = true;
    }

    const text = extractElementText($050, el);
    if (!text || text.length < 5) return;

    if (!foundFirstSection) {
      introBlocks.push(text);
    } else {
      if (cls.includes('section-header')) {
        sectionBlocks050.push(text);
      } else {
        // Add to the last section
        if (sectionBlocks050.length > 0) {
          sectionBlocks050[sectionBlocks050.length - 1] += '\n\n' + text;
        }
      }
    }
  });

  // File 060: extract anshay sections 17-32 (stop before roshay prakim header)
  const $060 = loadHtml(files[1]);
  if (!$060) return blocks;

  let sectionBlocks060 = [];
  let inAnshay = true;
  const content060 = $060('.content');

  content060.children().each((i, el) => {
    const cls = $060(el).attr('class') || '';
    if (cls.includes('roshay-header') || cls.includes('t-summary') ||
        cls.includes('translator-summary')) {
      inAnshay = false;
      return;
    }
    if (cls.includes('divider') || cls.includes('compiler-note')) return;
    if (!inAnshay) return;

    const text = extractElementText($060, el);
    if (!text || text.length < 5) return;

    if (cls.includes('section-header')) {
      sectionBlocks060.push(text);
    } else {
      if (sectionBlocks060.length > 0) {
        sectionBlocks060[sectionBlocks060.length - 1] += '\n\n' + text;
      } else {
        // Pre-section content in 060 (shouldn't happen but handle gracefully)
        sectionBlocks060.push(text);
      }
    }
  });

  // Now build the 38 segments:
  // Combine intro blocks into first few segments
  for (const ib of introBlocks) {
    blocks.push(ib);
  }

  // Then the numbered sections from both files
  for (const sb of sectionBlocks050) {
    blocks.push(sb);
  }
  for (const sb of sectionBlocks060) {
    blocks.push(sb);
  }

  return blocks;
}

function extractRoshayPrakim(files) {
  // section-3 = 48 segments: 1 preface + 47 numbered sections (א-מז)
  // Preface is at the end of file 060 (after roshay-header)
  // Sections א-יד in file 070
  // Sections טו-מז in file 080 (first part before diburim)

  const blocks = [];

  // File 060: extract roshay prakim preface (after roshay-header)
  const $060 = loadHtml(files[0]);
  if ($060) {
    let foundRoshayHeader = false;
    const preface = [];
    $060('.content').children().each((i, el) => {
      const cls = $060(el).attr('class') || '';
      if (cls.includes('roshay-header')) {
        foundRoshayHeader = true;
        return;
      }
      if (cls.includes('t-summary') || cls.includes('translator-summary') ||
          cls.includes('divider')) return;
      if (!foundRoshayHeader) return;
      const text = extractElementText($060, el);
      if (text && text.length > 5) preface.push(text);
    });
    if (preface.length > 0) {
      blocks.push(preface.join('\n\n'));
    }
  }

  // File 070: sections א-יד
  const $070 = loadHtml(files[1]);
  if ($070) {
    const sectionGroups = extractBySecHeaders($070);
    // Skip any intro text before first section
    for (const g of sectionGroups) {
      if (g) blocks.push(g);
    }
  }

  // File 080: sections טו-מז (stop before diburim section)
  const $080 = loadHtml(files[2]);
  if ($080) {
    const content = $080('.content');
    let groups = [];
    let currentGroup = [];
    let inRoshay = true;

    content.children().each((i, el) => {
      const cls = $080(el).attr('class') || '';
      const tag = el.tagName;

      // Check for a divider or section break indicating diburim start
      if (cls.includes('divider') || cls.includes('translator-summary') ||
          cls.includes('t-summary')) return;

      // Check if we've reached the Diburim section
      // (usually marked by a major heading or a distinctive section)
      if (tag === 'h2' || tag === 'h3') {
        const heading = $080(el).text().trim();
        if (heading.includes('דִּיבּוּרִים') || heading.includes('Diburim') ||
            heading.includes('Conversations') || heading.includes('Words of')) {
          inRoshay = false;
          return;
        }
      }

      if (!inRoshay) return;

      if (cls.includes('section-header')) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup.join('\n\n'));
        }
        currentGroup = [];
        const text = extractElementText($080, el);
        if (text) currentGroup.push(text);
        return;
      }

      const text = extractElementText($080, el);
      if (text && text.length > 5) {
        currentGroup.push(text);
      }
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup.join('\n\n'));
    }

    for (const g of groups) {
      if (g) blocks.push(g);
    }
  }

  return blocks;
}

function extractSosonVeSimcho(files) {
  // section-7 = 9 segments (Part IV: Soson veSimcho - intro + teachings)
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];
  const content = $('.content');

  // Extract intro paragraphs (before prayers section)
  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    // Stop at prayers
    if (tag === 'h2') {
      const text = $(el).text().trim();
      if (text.includes('Prayers') || text.includes('תְּפִלָּה')) return;
    }
    if (cls.includes('prayer-block')) return;
    if (cls.includes('divider') || cls.includes('translator-summary')) return;

    const text = extractElementText($, el);
    if (text && text.length > 5) {
      blocks.push(text);
    }
  });

  return blocks;
}

function extractPrayers(files) {
  // section-8 = 86 segments (Prayers)
  // Need to extract individual paragraphs from within each prayer-block
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];
  const content = $('.content');
  let inPrayers = false;

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (tag === 'h2') {
      const text = $(el).text().trim();
      if (text.includes('Prayers') || text.includes('תְּפִלָּה')) {
        inPrayers = true;
        return;
      }
      if (text.includes('Chiddushim') || text.includes('חידושים')) {
        inPrayers = false;
        return;
      }
    }

    if (!inPrayers) return;
    if (cls.includes('divider') || cls.includes('translator-summary')) return;

    // Extract individual child paragraphs from prayer-blocks, footnote-blocks, etc.
    if (cls.includes('prayer-block') || cls.includes('footnote-block') ||
        cls.includes('author-note')) {
      $(el).children().each((j, ch) => {
        const text = $(ch).text().trim();
        if (text && text.length > 3) blocks.push(text);
      });
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 5) blocks.push(text);
  });

  return blocks;
}

function extractChiddushim(files) {
  // section-9 = 18 segments (Chiddushim)
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];
  const content = $('.content');
  let inChiddushim = false;

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (tag === 'h2') {
      const text = $(el).text().trim();
      if (text.includes('Chiddushim') || text.includes('חידושים')) {
        inChiddushim = true;
        return;
      }
    }

    if (!inChiddushim) return;
    if (cls.includes('divider') || cls.includes('translator-summary')) return;

    const text = extractElementText($, el);
    if (text && text.length > 5) {
      blocks.push(text);
    }
  });

  return blocks;
}

function extractSipurimTitle(files) {
  // section-10 = 1 segment (title/intro of Sefer Sipurim Niflaim)
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const content = $('.content');
  const blocks = [];

  // Get intro text before first h2
  const introBlocks = [];
  content.children().each((i, el) => {
    const tag = el.tagName;
    if (tag === 'h2') return false; // stop
    const text = extractElementText($, el);
    if (text && text.length > 5) introBlocks.push(text);
  });

  if (introBlocks.length > 0) {
    blocks.push(introBlocks.join('\n\n'));
  } else {
    // Use the masthead intro
    const intro = $('.masthead .subtitle, .intro-block').text().trim();
    if (intro) blocks.push(intro);
  }

  return blocks;
}

function extractSipurimNiflaim(files) {
  // section-11 = 29 segments (Wondrous Stories from Rabbeinu)
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];
  const content = $('.content');
  let started = false;

  // Extract individual paragraphs/blocks after the first h2
  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (tag === 'h2' && !started) {
      started = true;
      // Include h2 text as a block
      const h2Text = $(el).text().trim();
      if (h2Text && h2Text.length > 5) blocks.push(h2Text);
      return;
    }
    if (!started) return;

    if (cls.includes('translator-summary') || cls.includes('t-summary')) return;

    // For h2 markers (story section headers), treat as their own block
    if (tag === 'h2') {
      const text = $(el).text().trim();
      if (text && text.length > 3) blocks.push(text);
      return;
    }

    // For dividers, skip
    if (cls.includes('divider')) return;

    // For entries, extract sub-paragraphs
    if (cls.includes('entry')) {
      $(el).children().each((j, ch) => {
        const childText = $(ch).text().trim();
        if (childText && childText.length > 3) blocks.push(childText);
      });
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 3) {
      blocks.push(text);
    }
  });

  return blocks;
}

function extractTzavaas(files) {
  // section-12 = 67 segments (Tzavaas HaRav miTsherin)
  // HTML has intro + 17 clauses + genealogy
  // Need to extract individual paragraphs from within each clause
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];
  const content = $('.content');

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (cls.includes('divider') || cls.includes('translator-summary') ||
        cls.includes('t-summary')) return;

    // For clause divs and intro-block, extract individual paragraphs
    if (cls.includes('clause') || cls.includes('intro-block') || cls.includes('genealogy')) {
      $(el).children().each((j, ch) => {
        const childTag = ch.tagName;
        const childCls = $(ch).attr('class') || '';
        const text = $(ch).text().trim();
        if (text && text.length > 3) blocks.push(text);
      });
      return;
    }

    if (tag === 'h2') {
      const text = $(el).text().trim();
      if (text && text.length > 3) blocks.push(text);
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 3) blocks.push(text);
  });

  return blocks;
}

function extractSeferSichos(files) {
  // section-13 = 14 segments (Sefer Sichos veSipurim)
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const content = $('.content');
  const blocks = [];

  // Extract all children individually (intro + sections)
  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (cls.includes('divider') || cls.includes('translator-summary') ||
        cls.includes('t-summary')) return;

    // For section/entry divs, extract sub-paragraphs
    if (cls.includes('section') || cls.includes('entry') || cls.includes('intro-block')) {
      $(el).children().each((j, ch) => {
        const text = $(ch).text().trim();
        if (text && text.length > 3) blocks.push(text);
      });
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 5) blocks.push(text);
  });

  return blocks;
}

function extractRasheiPerakimBiur14(files) {
  // section-14 = 16 segments (Rashei Perakim on LM I:8)
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];
  const content = $('.content');

  // Extract individual paragraphs from the Rashei Perakim section (before Biur)
  let inRasheiPerakim = true;

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    // Stop at divider or Biur section
    if (cls.includes('divider')) {
      inRasheiPerakim = false;
      return;
    }
    if (tag === 'h2') {
      const text = $(el).text().trim();
      if (text.includes('בֵּאוּר') || text.includes('Biur') || text.includes('Commentary')) {
        inRasheiPerakim = false;
        return;
      }
    }

    if (!inRasheiPerakim) return;
    if (cls.includes('translator-summary')) return;

    // For section divs, extract children individually
    if (cls.includes('section') || cls.includes('intro-block')) {
      $(el).children().each((j, ch) => {
        const text = $(ch).text().trim();
        if (text && text.length > 3) blocks.push(text);
      });
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 3) blocks.push(text);
  });

  return blocks;
}

function extractBiurHalikutim(files) {
  // section-15 = 120 segments (Biur HaLikutim)
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];
  const content = $('.content');
  let inBiur = false;

  content.children().each((i, el) => {
    const cls = $(el).attr('class') || '';
    const tag = el.tagName;

    if (!inBiur) {
      if (tag === 'h2') {
        const text = $(el).text().trim();
        if (text.includes('בֵּאוּר') || text.includes('Biur') || text.includes('Commentary')) {
          inBiur = true;
          return;
        }
      }
      return;
    }

    if (cls.includes('divider') || cls.includes('translator-summary')) return;

    // For section divs and intro-blocks, extract children individually
    if (cls.includes('section') || cls.includes('intro-block')) {
      $(el).children().each((j, ch) => {
        const text = $(ch).text().trim();
        if (text && text.length > 3) blocks.push(text);
      });
      return;
    }

    const text = extractElementText($, el);
    if (text && text.length > 3) blocks.push(text);
  });

  return blocks;
}

function extractSichosFromMoharnas(files) {
  // section-21 = 76 segments
  // File 950 has 93 entries total: first 65 from Moharnas, 28 from R Nachman Tulshiner
  // Actually section-21 has 76 segs - need to take all entries
  const $ = loadHtml(files[0]);
  if (!$) return [];

  const blocks = [];

  // Entries are body > div.entry (no .content wrapper)
  $('body > div.entry').each((i, el) => {
    const text = extractElementText($, el);
    if (text && text.length > 3) {
      blocks.push(text);
    }
  });

  return blocks;
}

// ---------------------------------------------------------------------------
// Main processing
// ---------------------------------------------------------------------------

function assignEnglishToSection(sectionNum, englishBlocks) {
  const data = loadSection(sectionNum);
  const segCount = data.segments.length;
  const blockCount = englishBlocks.length;

  console.log(`  Section ${sectionNum}: ${segCount} segments, ${blockCount} English blocks`);

  let assigned = 0;

  if (blockCount === 0) {
    console.log(`  WARNING: No English blocks extracted for section ${sectionNum}`);
    return 0;
  }

  if (blockCount === segCount) {
    // Perfect 1:1 match
    for (let i = 0; i < segCount; i++) {
      data.segments[i].en = englishBlocks[i];
      assigned++;
    }
  } else if (blockCount > segCount) {
    // More blocks than segments - distribute proportionally
    console.log(`  INFO: More blocks (${blockCount}) than segments (${segCount}), distributing...`);
    const ratio = blockCount / segCount;
    for (let seg = 0; seg < segCount; seg++) {
      const startBlock = Math.floor(seg * ratio);
      const endBlock = Math.floor((seg + 1) * ratio);
      const combined = englishBlocks.slice(startBlock, endBlock).join('\n\n');
      data.segments[seg].en = combined;
      assigned++;
    }
  } else {
    // Fewer blocks than segments - try to expand blocks into sub-paragraphs
    console.log(`  INFO: Fewer blocks (${blockCount}) than segments (${segCount}), expanding...`);

    // Split each block into sub-paragraphs by double-newline or sentence boundaries
    const expandedBlocks = [];
    for (const block of englishBlocks) {
      // Split by double newlines first
      const subBlocks = block.split(/\n\n+/).filter(s => s.trim().length > 0);
      if (subBlocks.length > 1) {
        for (const sb of subBlocks) {
          expandedBlocks.push(sb.trim());
        }
      } else {
        expandedBlocks.push(block);
      }
    }

    const expandedCount = expandedBlocks.length;
    console.log(`  INFO: Expanded to ${expandedCount} sub-blocks`);

    if (expandedCount === segCount) {
      // Perfect match after expansion
      for (let i = 0; i < segCount; i++) {
        data.segments[i].en = expandedBlocks[i];
        assigned++;
      }
    } else if (expandedCount > segCount) {
      // Still more - distribute proportionally
      const ratio = expandedCount / segCount;
      for (let seg = 0; seg < segCount; seg++) {
        const startBlock = Math.floor(seg * ratio);
        const endBlock = Math.floor((seg + 1) * ratio);
        const combined = expandedBlocks.slice(startBlock, endBlock).join('\n\n');
        data.segments[seg].en = combined;
        assigned++;
      }
    } else {
      // Still fewer - assign 1:1, leave rest empty
      for (let i = 0; i < expandedCount; i++) {
        data.segments[i].en = expandedBlocks[i];
        assigned++;
      }
    }
  }

  // Update hasEnglish
  data.hasEnglish = assigned > 0;

  // Save
  saveSection(sectionNum, data);
  console.log(`  Assigned English to ${assigned}/${segCount} segments`);

  return assigned;
}

function updateIndex(sectionsUpdated) {
  const indexPath = path.join(READER_DIR, 'index.json');
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  for (const torah of index.torahs) {
    if (sectionsUpdated.has(torah.number)) {
      torah.hasEnglish = true;
    }
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  console.log(`\nUpdated index.json: ${sectionsUpdated.size} sections marked hasEnglish=true`);
}

function main() {
  console.log('=== Kokhvei Or English Translation Parser ===');
  console.log(`Source: ${SRC_DIR}`);
  console.log(`Target: ${READER_DIR}`);
  console.log('');

  // Verify source directory exists
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`ERROR: Source directory not found: ${SRC_DIR}`);
    process.exit(1);
  }

  // Verify reader directory exists
  if (!fs.existsSync(READER_DIR)) {
    console.error(`ERROR: Reader directory not found: ${READER_DIR}`);
    process.exit(1);
  }

  const sectionsUpdated = new Set();
  let totalAssigned = 0;

  for (const mapping of FILE_SECTION_MAP) {
    const { section, files, extractMode, customExtract } = mapping;
    console.log(`\nProcessing section ${section} (mode: ${extractMode})...`);
    console.log(`  Files: ${files.join(', ')}`);

    let englishBlocks = [];

    try {
      if (extractMode === 'custom' && customExtract) {
        englishBlocks = customExtract(files);
      } else if (extractMode === 'entries') {
        const $ = loadHtml(files[0]);
        if ($) {
          englishBlocks = extractEntries($);
        }
      } else if (extractMode === 'sections') {
        const $ = loadHtml(files[0]);
        if ($) {
          englishBlocks = extractBySecHeaders($);
        }
      } else if (extractMode === 'contentParagraphs') {
        const $ = loadHtml(files[0]);
        if ($) {
          englishBlocks = extractContentBlocks($);
        }
      } else if (extractMode === 'contentSections') {
        const $ = loadHtml(files[0]);
        if ($) {
          englishBlocks = extractContentSections($);
        }
      } else {
        console.log(`  WARNING: Unknown extractMode: ${extractMode}`);
        continue;
      }

      if (englishBlocks.length > 0) {
        const assigned = assignEnglishToSection(section, englishBlocks);
        if (assigned > 0) {
          sectionsUpdated.add(section);
          totalAssigned += assigned;
        }
      } else {
        console.log(`  WARNING: No English text extracted`);
      }
    } catch (err) {
      console.error(`  ERROR processing section ${section}:`, err.message);
    }
  }

  // Update index.json
  if (sectionsUpdated.size > 0) {
    updateIndex(sectionsUpdated);
  }

  console.log(`\n=== Complete ===`);
  console.log(`Sections updated: ${sectionsUpdated.size}/21`);
  console.log(`Total segments with English: ${totalAssigned}`);
}

main();
