/**
 * IMPROVED import of missing English translations from Finished folder.
 * v2: Better HTML extraction, shorter prefix matching, punctuation-stripped matching,
 *     and sequential fallback for per-section files.
 *
 * RULES:
 *   - NEVER overwrite existing English (seg.en that is non-empty)
 *   - Set hasEnglish=true on any file that gets English added
 */
const fs = require('fs');
const path = require('path');

const FINISHED_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER_DIR = path.join(__dirname, '../public/reader');

// ─────────────────────── Utilities ───────────────────────

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013')
    .replace(/&nbsp;/g, ' ').replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018').replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C').replace(/&hellip;/g, '\u2026')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, ' ').trim();
}

/** Remove nikud/taamim, punctuation, and extra whitespace from Hebrew text */
function normalizeHebrew(text) {
  return text
    .replace(/[\u0591-\u05C7]/g, '')       // nikud + taamim
    .replace(/[:"״׳,.\-–—;!?()[\]{}'/\\<>@#$%^&*+~`|₪€£¥₹]/g, '') // punctuation
    .replace(/\s+/g, '').trim();            // remove ALL whitespace for matching
}

/** Extract English paragraphs from an HTML file. Returns array of strings. */
function extractEnglishFromHtml(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const paras = [];

  // Strategy 1: para-div structure (from older translations)
  const paraDivParts = html.split(/<div class="para">/);
  if (paraDivParts.length > 1) {
    for (let i = 1; i < paraDivParts.length; i++) {
      const pMatch = paraDivParts[i].match(/<p>([\s\S]*?)<\/p>/);
      if (!pMatch) continue;
      let englishHtml = pMatch[1];
      englishHtml = englishHtml.replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/, '');
      const english = stripHtml(englishHtml).trim();
      if (english && english.length > 10) paras.push(english);
    }
    if (paras.length > 0) return paras;
  }

  // Strategy 2: text-block divs (Nachas HaShulchan style)
  const textBlockRegex = /<div class="text-block">([\s\S]*?)<\/div>/g;
  let tbMatch;
  while ((tbMatch = textBlockRegex.exec(html)) !== null) {
    const text = stripHtml(tbMatch[1]).trim();
    if (text && text.length > 20) paras.push(text);
  }
  if (paras.length > 0) return paras;

  // Strategy 3: all <p> tags (general fallback — skip nav, headers, tiny)
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let pMatch;
  while ((pMatch = pRegex.exec(html)) !== null) {
    const text = stripHtml(pMatch[1]).trim();
    if (!text || text.length < 20) continue;
    if (text.startsWith('←') || text.startsWith('→')) continue;
    // Skip things that look like table of contents, nav links, translator summaries
    if (text.match(/^(Volume|Part|Chapter|Table of Contents|Next|Previous|Back to)/i)) continue;
    paras.push(text);
  }
  return paras;
}

/**
 * Extract paragraphs grouped by section/letter from HTML files.
 * Used for Ebay HaNachal (letters), Chayey Moharan (chapters), etc.
 * Returns Map<number, string[]> where key is section number.
 */
function extractBySection(htmlPath, headerPattern) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const sections = new Map();

  // Split by h2 headers that contain letter/section numbers
  const headerRegex = headerPattern || /<h2[^>]*>([\s\S]*?)<\/h2>/g;
  const parts = html.split(/<h2[^>]*>/);

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const h2End = part.indexOf('</h2>');
    if (h2End === -1) continue;

    const header = stripHtml(part.substring(0, h2End)).trim();
    // Extract number from header like "Letter 38", "Chapter 3", "Siman 5"
    const numMatch = header.match(/(?:Letter|Chapter|Siman|Section|Part|Torah|אות|פרק)\s*(\d+)/i)
                  || header.match(/(\d+)/);
    if (!numMatch) continue;
    const sectionNum = parseInt(numMatch[1], 10);

    const bodyHtml = part.substring(h2End + 5);
    const paras = [];
    const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let m;
    while ((m = pRegex.exec(bodyHtml)) !== null) {
      const text = stripHtml(m[1]).trim();
      if (text && text.length > 15 && !text.startsWith('←') && !text.startsWith('→')) {
        paras.push(text);
      }
    }
    if (paras.length > 0) {
      if (sections.has(sectionNum)) {
        sections.get(sectionNum).push(...paras);
      } else {
        sections.set(sectionNum, paras);
      }
    }
  }
  return sections;
}

// ─────────────────────── Matching Logic ───────────────────────

/**
 * Try to match English paragraphs to segments using Hebrew prefix comparison.
 * Tries multiple strategies: 40-char, 20-char, stripped.
 * Returns number of new matches.
 */
function matchByHebrew(segments, paragraphsWithHebrew) {
  let matched = 0;
  for (const seg of segments) {
    if (seg.en && seg.en.trim()) continue; // already has English

    const segHeb = normalizeHebrew(seg.he || seg.he_nikud || '');
    if (segHeb.length < 5) continue;

    let bestMatch = null;
    let bestScore = 0;

    for (const para of paragraphsWithHebrew) {
      if (!para.hebrew) continue;
      const paraHeb = normalizeHebrew(para.hebrew);
      if (paraHeb.length < 5) continue;

      // Strategy 1: 40-char prefix match
      const len40 = Math.min(40, paraHeb.length, segHeb.length);
      if (len40 >= 10 && paraHeb.substring(0, len40) === segHeb.substring(0, len40)) {
        if (len40 > bestScore) { bestScore = len40; bestMatch = para; }
        continue;
      }

      // Strategy 2: 20-char prefix match
      const len20 = Math.min(20, paraHeb.length, segHeb.length);
      if (len20 >= 8 && paraHeb.substring(0, len20) === segHeb.substring(0, len20)) {
        if (20 > bestScore) { bestScore = 20; bestMatch = para; }
        continue;
      }

      // Strategy 3: substring containment (one contains start of other)
      const shortLen = Math.min(15, paraHeb.length, segHeb.length);
      if (shortLen >= 8) {
        if (paraHeb.startsWith(segHeb.substring(0, shortLen)) || segHeb.startsWith(paraHeb.substring(0, shortLen))) {
          if (15 > bestScore) { bestScore = 15; bestMatch = para; }
        }
      }
    }

    if (bestMatch) {
      seg.en = bestMatch.english;
      matched++;
    }
  }
  return matched;
}

/**
 * Sequential assignment: assign English paragraphs to segments that lack English,
 * in order. Used as fallback when Hebrew matching fails or isn't possible.
 * Only assigns to segments missing English.
 */
function assignSequential(segments, englishParas) {
  let matched = 0;
  let paraIdx = 0;

  for (const seg of segments) {
    if (paraIdx >= englishParas.length) break;
    if (seg.en && seg.en.trim()) continue; // already has English

    const heLen = (seg.he || seg.he_nikud || '').length;
    if (heLen < 5) continue; // skip tiny header segments

    seg.en = englishParas[paraIdx];
    paraIdx++;
    matched++;
  }

  // If more English than segments, append remaining to last assigned
  if (paraIdx < englishParas.length && matched > 0) {
    // Find the last segment we assigned to
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].en && segments[i].en.trim()) {
        const remaining = englishParas.slice(paraIdx).join('\n\n');
        segments[i].en += '\n\n' + remaining;
        break;
      }
    }
  }

  return matched;
}

// ─────────────────────── Book-Specific Processors ───────────────────────

function processBook(bookId, htmlDirs, label, options = {}) {
  console.log(`\n=== ${label} (${bookId}) ===`);

  const bookDir = path.join(READER_DIR, bookId);
  if (!fs.existsSync(bookDir)) {
    console.log(`  SKIP: Book dir not found: ${bookDir}`);
    return { matched: 0, files: 0 };
  }

  // Collect all HTML files
  const allHtmlFiles = [];
  for (const dir of htmlDirs) {
    const fullDir = path.join(FINISHED_DIR, dir);
    if (!fs.existsSync(fullDir)) {
      console.log(`  SKIP dir: ${dir}`);
      continue;
    }
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.html')).sort();
    for (const f of files) {
      allHtmlFiles.push(path.join(fullDir, f));
    }
  }
  console.log(`  HTML files found: ${allHtmlFiles.length}`);

  // Extract all English paragraphs from all HTML files
  const allParas = [];
  for (const hf of allHtmlFiles) {
    const paras = extractEnglishFromHtml(hf);
    allParas.push(...paras);
  }
  console.log(`  Total English paragraphs: ${allParas.length}`);

  // Count segments before
  let totalSegs = 0, withEnBefore = 0, withEnAfter = 0;
  let totalMatched = 0;
  let filesUpdated = 0;

  // Collect all JSON files
  const jsonFiles = [];
  function collectJsonFiles(dir) {
    for (const item of fs.readdirSync(dir)) {
      const fp = path.join(dir, item);
      if (fs.statSync(fp).isDirectory()) { collectJsonFiles(fp); continue; }
      if (item.endsWith('.json') && item !== 'index.json') jsonFiles.push(fp);
    }
  }
  collectJsonFiles(bookDir);

  // Sort JSON files numerically
  jsonFiles.sort((a, b) => {
    const na = parseInt((path.basename(a).match(/(\d+)/) || [0, 0])[1]);
    const nb = parseInt((path.basename(b).match(/(\d+)/) || [0, 0])[1]);
    return na - nb;
  });

  // Process each JSON file
  for (const jsonPath of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.segments) continue;

    const segsBefore = data.segments.filter(s => s.en && s.en.trim()).length;
    totalSegs += data.segments.length;
    withEnBefore += segsBefore;

    // Count segments needing English
    const needsEn = data.segments.filter(s => !s.en || !s.en.trim());
    if (needsEn.length === 0) {
      withEnAfter += segsBefore;
      continue;
    }

    let fileMatched = 0;

    if (options.sequential) {
      // Sequential mode: try to find the right section of the English
      // based on file number / section number
      const fileNum = parseInt((path.basename(jsonPath).match(/(\d+)/) || [0, 0])[1]);

      if (options.sectionExtractor) {
        // Use section-aware extraction
        const sectionParas = options.sectionExtractor(allHtmlFiles, fileNum);
        if (sectionParas && sectionParas.length > 0) {
          fileMatched = assignSequential(data.segments, sectionParas);
        }
      }

      // If section-specific didn't work, and we have a flat paragraph list,
      // don't do blind sequential on the whole book (too risky for misalignment)
    } else {
      // Hebrew matching mode: try to match by Hebrew text
      // Build paragraph objects with dummy hebrew for matching
      // But since these translations may not have inline Hebrew,
      // we try sequential per-file as fallback
      fileMatched = 0;
    }

    // Fallback: try sequential assignment from the global paragraph pool
    // This is only safe if we know the paragraph ordering matches
    if (fileMatched === 0 && options.sequentialFallback && allParas.length > 0) {
      // For sequential fallback, we consume paragraphs in order across all files
      // This requires careful tracking - handled below
    }

    if (fileMatched > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      filesUpdated++;
      totalMatched += fileMatched;
    }

    withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
  }

  console.log(`  Before: ${withEnBefore}/${totalSegs} (${totalSegs ? Math.round(100*withEnBefore/totalSegs) : 0}%)`);
  console.log(`  After:  ${withEnAfter}/${totalSegs} (${totalSegs ? Math.round(100*withEnAfter/totalSegs) : 0}%)`);
  console.log(`  New matches: ${totalMatched} across ${filesUpdated} files`);
  return { matched: totalMatched, files: filesUpdated };
}

/**
 * Process Ebay HaNachal: letters with per-letter HTML extraction.
 * The HTML files contain multiple letters each, separated by <h2>Letter N</h2>.
 */
function processEbayHanachal() {
  console.log('\n=== Ebay HaNachal (ebay-hanachal) ===');

  const htmlDirs = ['Blossoms of the Stream'];
  const bookDir = path.join(READER_DIR, 'ebay-hanachal');

  // Extract sections from all HTML files
  const allSections = new Map(); // letterNum -> englishParas[]
  for (const dir of htmlDirs) {
    const fullDir = path.join(FINISHED_DIR, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.html')).sort();
    for (const f of files) {
      const sections = extractBySection(path.join(fullDir, f));
      for (const [num, paras] of sections) {
        if (allSections.has(num)) {
          // Keep the longer one (or merge)
          if (paras.length > allSections.get(num).length) {
            allSections.set(num, paras);
          }
        } else {
          allSections.set(num, paras);
        }
      }
    }
  }
  console.log(`  Extracted sections: ${allSections.size} letters`);

  let totalMatched = 0, filesUpdated = 0;
  let totalSegs = 0, withEnBefore = 0, withEnAfter = 0;

  // Process each part directory
  for (const partDir of fs.readdirSync(bookDir)) {
    const pd = path.join(bookDir, partDir);
    if (!fs.statSync(pd).isDirectory()) continue;

    for (const jsonFile of fs.readdirSync(pd)) {
      if (!jsonFile.endsWith('.json') || jsonFile === 'index.json') continue;

      const letterMatch = jsonFile.match(/letter-(\d+)\.json/);
      if (!letterMatch) continue;
      const letterNum = parseInt(letterMatch[1], 10);

      const jsonPath = path.join(pd, jsonFile);
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (!data.segments) continue;

      totalSegs += data.segments.length;
      withEnBefore += data.segments.filter(s => s.en && s.en.trim()).length;

      const needsEn = data.segments.filter(s => !s.en || !s.en.trim());
      if (needsEn.length === 0) {
        withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
        continue;
      }

      // Try to find this letter in our extracted sections
      let paras = allSections.get(letterNum);
      if (!paras || paras.length === 0) {
        // Try nearby numbers (off-by-one is common)
        paras = allSections.get(letterNum - 1) || allSections.get(letterNum + 1);
      }

      let matched = 0;
      if (paras && paras.length > 0) {
        matched = assignSequential(data.segments, paras);
      }

      if (matched > 0) {
        data.hasEnglish = true;
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
        filesUpdated++;
        totalMatched += matched;
      }

      withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
    }
  }

  console.log(`  Before: ${withEnBefore}/${totalSegs} (${totalSegs ? Math.round(100*withEnBefore/totalSegs) : 0}%)`);
  console.log(`  After:  ${withEnAfter}/${totalSegs} (${totalSegs ? Math.round(100*withEnAfter/totalSegs) : 0}%)`);
  console.log(`  New matches: ${totalMatched} across ${filesUpdated} files`);
  return totalMatched;
}

/**
 * Process Parparos LeChochma: sections with <h2 class="ch"> and <p> paragraphs.
 * HTML files are per-siman, reader JSON is per-section.
 */
function processParparos() {
  console.log('\n=== Parparos LeChochma (parparos-lechochma) ===');

  const htmlDir = path.join(FINISHED_DIR, 'Parparaos LaChuchmuh');
  const bookDir = path.join(READER_DIR, 'parparos-lechochma');

  if (!fs.existsSync(htmlDir)) {
    console.log('  SKIP: HTML dir not found');
    return 0;
  }

  // Extract all English paragraphs, keeping track of siman numbers
  const simanParas = new Map(); // simanNum -> englishParas[]
  const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html')).sort();

  // Also collect a flat list for sequential fallback
  const allParas = [];

  for (const f of htmlFiles) {
    const fp = path.join(htmlDir, f);
    const html = fs.readFileSync(fp, 'utf8');

    // Try to extract by siman (h2 headers)
    const sections = extractBySection(fp);
    for (const [num, paras] of sections) {
      if (!simanParas.has(num)) simanParas.set(num, []);
      simanParas.get(num).push(...paras);
    }

    // Also get flat paragraphs
    const paras = extractEnglishFromHtml(fp);
    allParas.push(...paras);
  }

  console.log(`  Siman sections found: ${simanParas.size}`);
  console.log(`  Total flat paragraphs: ${allParas.length}`);

  let totalMatched = 0, filesUpdated = 0;
  let totalSegs = 0, withEnBefore = 0, withEnAfter = 0;

  const jsonFiles = fs.readdirSync(bookDir)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort((a, b) => {
      const na = parseInt((a.match(/(\d+)/) || [0, 0])[1]);
      const nb = parseInt((b.match(/(\d+)/) || [0, 0])[1]);
      return na - nb;
    });

  for (const jsonFile of jsonFiles) {
    const jsonPath = path.join(bookDir, jsonFile);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.segments) continue;

    const sectionNum = parseInt((jsonFile.match(/(\d+)/) || [0, 0])[1]);
    totalSegs += data.segments.length;
    withEnBefore += data.segments.filter(s => s.en && s.en.trim()).length;

    const needsEn = data.segments.filter(s => !s.en || !s.en.trim());
    if (needsEn.length === 0) {
      withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
      continue;
    }

    // Try siman-based matching
    let matched = 0;
    const paras = simanParas.get(sectionNum);
    if (paras && paras.length > 0) {
      matched = assignSequential(data.segments, paras);
    }

    if (matched > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      filesUpdated++;
      totalMatched += matched;
    }

    withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
  }

  console.log(`  Before: ${withEnBefore}/${totalSegs} (${totalSegs ? Math.round(100*withEnBefore/totalSegs) : 0}%)`);
  console.log(`  After:  ${withEnAfter}/${totalSegs} (${totalSegs ? Math.round(100*withEnAfter/totalSegs) : 0}%)`);
  console.log(`  New matches: ${totalMatched} across ${filesUpdated} files`);
  return totalMatched;
}

/**
 * Process Nachas HaShulchan: uses text-block divs and section headers.
 * Multiple HTML files cover different parts. Sequential assignment per file.
 */
function processNachasHashulchan() {
  console.log('\n=== Nachas HaShulchan (nachas-hashulchan) ===');

  const htmlDir = path.join(FINISHED_DIR, 'Nachas Hashulchan');
  const bookDir = path.join(READER_DIR, 'nachas-hashulchan');

  if (!fs.existsSync(htmlDir)) { console.log('  SKIP: dir not found'); return 0; }

  // Nachas HaShulchan has 4 reader JSON files (section-1 to section-4)
  // and multiple HTML files. We need to figure out the mapping.
  // HTML files: 010-060 (OC parts 1-6), 100-130 (YD parts 1-4), 200 (EH)

  // Build mapping: section number -> HTML files
  const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html')).sort();

  // Extract all paragraphs from all HTML files in order
  const allParas = [];
  for (const f of htmlFiles) {
    const paras = extractEnglishFromHtml(path.join(htmlDir, f));
    allParas.push(...paras);
  }
  console.log(`  Total English paragraphs: ${allParas.length}`);

  // Load all reader JSON
  const jsonFiles = fs.readdirSync(bookDir)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort((a, b) => {
      const na = parseInt((a.match(/(\d+)/) || [0, 0])[1]);
      const nb = parseInt((b.match(/(\d+)/) || [0, 0])[1]);
      return na - nb;
    });

  let totalMatched = 0, filesUpdated = 0;
  let totalSegs = 0, withEnBefore = 0, withEnAfter = 0;
  let paraOffset = 0;

  for (const jsonFile of jsonFiles) {
    const jsonPath = path.join(bookDir, jsonFile);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.segments) continue;

    totalSegs += data.segments.length;
    withEnBefore += data.segments.filter(s => s.en && s.en.trim()).length;

    const needsEn = data.segments.filter(s => !s.en || !s.en.trim());
    if (needsEn.length === 0) {
      withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
      continue;
    }

    // Sequential assignment from current offset in the global paragraph pool
    let matched = 0;
    for (const seg of data.segments) {
      if (paraOffset >= allParas.length) break;
      if (seg.en && seg.en.trim()) continue;
      const heLen = (seg.he || seg.he_nikud || '').length;
      if (heLen < 5) continue;

      seg.en = allParas[paraOffset];
      paraOffset++;
      matched++;
    }

    if (matched > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      filesUpdated++;
      totalMatched += matched;
    }

    withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
  }

  console.log(`  Before: ${withEnBefore}/${totalSegs} (${totalSegs ? Math.round(100*withEnBefore/totalSegs) : 0}%)`);
  console.log(`  After:  ${withEnAfter}/${totalSegs} (${totalSegs ? Math.round(100*withEnAfter/totalSegs) : 0}%)`);
  console.log(`  New matches: ${totalMatched} across ${filesUpdated} files`);
  return totalMatched;
}

/**
 * Process Chayey Moharan: HTML files per chapter.
 */
function processChayeyMoharan() {
  console.log('\n=== Chayey Moharan (chayey-moharan) ===');

  const htmlDir = path.join(FINISHED_DIR, 'Chayay Moharan');
  const bookDir = path.join(READER_DIR, 'chayey-moharan');

  if (!fs.existsSync(htmlDir)) { console.log('  SKIP: dir not found'); return 0; }

  const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html')).sort();

  // Extract all paragraphs
  const allParas = [];
  for (const f of htmlFiles) {
    const paras = extractEnglishFromHtml(path.join(htmlDir, f));
    allParas.push(...paras);
  }
  console.log(`  Total English paragraphs: ${allParas.length}`);

  // Load all reader JSON
  const jsonFiles = [];
  function collect(dir) {
    for (const item of fs.readdirSync(dir)) {
      const fp = path.join(dir, item);
      if (fs.statSync(fp).isDirectory()) { collect(fp); continue; }
      if (item.endsWith('.json') && item !== 'index.json') jsonFiles.push(fp);
    }
  }
  collect(bookDir);
  jsonFiles.sort((a, b) => {
    const na = parseInt((path.basename(a).match(/(\d+)/) || [0, 0])[1]);
    const nb = parseInt((path.basename(b).match(/(\d+)/) || [0, 0])[1]);
    return na - nb;
  });

  let totalMatched = 0, filesUpdated = 0;
  let totalSegs = 0, withEnBefore = 0, withEnAfter = 0;
  let paraOffset = 0;

  for (const jsonPath of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.segments) continue;

    totalSegs += data.segments.length;
    withEnBefore += data.segments.filter(s => s.en && s.en.trim()).length;

    const needsEn = data.segments.filter(s => !s.en || !s.en.trim());
    if (needsEn.length === 0) {
      withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
      continue;
    }

    let matched = 0;
    for (const seg of data.segments) {
      if (paraOffset >= allParas.length) break;
      if (seg.en && seg.en.trim()) continue;
      const heLen = (seg.he || seg.he_nikud || '').length;
      if (heLen < 5) continue;

      seg.en = allParas[paraOffset];
      paraOffset++;
      matched++;
    }

    if (matched > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      filesUpdated++;
      totalMatched += matched;
    }

    withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
  }

  console.log(`  Before: ${withEnBefore}/${totalSegs} (${totalSegs ? Math.round(100*withEnBefore/totalSegs) : 0}%)`);
  console.log(`  After:  ${withEnAfter}/${totalSegs} (${totalSegs ? Math.round(100*withEnAfter/totalSegs) : 0}%)`);
  console.log(`  New matches: ${totalMatched} across ${filesUpdated} files`);
  return totalMatched;
}

/**
 * Process letter-based books with per-letter HTML files.
 * Used for: R' Nussun ben R' Yehuda, Michtevay Shmuel.
 * Each HTML file typically covers a range of letters.
 */
function processLetterBook(bookId, htmlDirNames, label) {
  console.log(`\n=== ${label} (${bookId}) ===`);

  const bookDir = path.join(READER_DIR, bookId);
  if (!fs.existsSync(bookDir)) { console.log('  SKIP: book dir not found'); return 0; }

  // Collect all HTML files
  const allHtmlFiles = [];
  for (const dir of htmlDirNames) {
    const fullDir = path.join(FINISHED_DIR, dir);
    if (!fs.existsSync(fullDir)) { console.log(`  SKIP dir: ${dir}`); continue; }
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.html')).sort();
    for (const f of files) allHtmlFiles.push(path.join(fullDir, f));
  }
  console.log(`  HTML files: ${allHtmlFiles.length}`);

  // Extract per-letter sections from HTML files
  const letterSections = new Map(); // letterNum -> englishParas[]

  // Try section-based extraction first
  for (const hf of allHtmlFiles) {
    const sections = extractBySection(hf);
    for (const [num, paras] of sections) {
      if (!letterSections.has(num)) letterSections.set(num, []);
      letterSections.get(num).push(...paras);
    }
  }

  // If section extraction didn't find much, try per-file with number from filename
  if (letterSections.size < 3) {
    for (const hf of allHtmlFiles) {
      const fname = path.basename(hf);
      // Try to extract range like "letters_11_13" or "1-16"
      const rangeMatch = fname.match(/(\d+)[_-](\d+)/);
      const singleMatch = fname.match(/(\d+)/);

      const paras = extractEnglishFromHtml(hf);
      if (paras.length === 0) continue;

      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        // Distribute paragraphs roughly evenly across the range
        if (end > start && end - start < 100) {
          const count = end - start + 1;
          const parasPerLetter = Math.ceil(paras.length / count);
          for (let n = start; n <= end; n++) {
            const offset = (n - start) * parasPerLetter;
            const letterParas = paras.slice(offset, offset + parasPerLetter);
            if (letterParas.length > 0) {
              if (!letterSections.has(n)) letterSections.set(n, []);
              letterSections.get(n).push(...letterParas);
            }
          }
        }
      } else if (singleMatch) {
        const num = parseInt(singleMatch[1], 10);
        if (!letterSections.has(num)) letterSections.set(num, []);
        letterSections.get(num).push(...paras);
      }
    }
  }

  console.log(`  Letter sections extracted: ${letterSections.size}`);

  // Also build a flat ordered paragraph list for sequential fallback
  const allParas = [];
  for (const hf of allHtmlFiles) {
    allParas.push(...extractEnglishFromHtml(hf));
  }
  console.log(`  Total flat paragraphs: ${allParas.length}`);

  // Process reader JSON files
  let totalMatched = 0, filesUpdated = 0;
  let totalSegs = 0, withEnBefore = 0, withEnAfter = 0;

  const jsonFiles = [];
  function collect(dir) {
    for (const item of fs.readdirSync(dir)) {
      const fp = path.join(dir, item);
      if (fs.statSync(fp).isDirectory()) { collect(fp); continue; }
      if (item.endsWith('.json') && item !== 'index.json') jsonFiles.push(fp);
    }
  }
  collect(bookDir);
  jsonFiles.sort((a, b) => {
    const na = parseInt((path.basename(a).match(/(\d+)/) || [0, 0])[1]);
    const nb = parseInt((path.basename(b).match(/(\d+)/) || [0, 0])[1]);
    return na - nb;
  });

  for (const jsonPath of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.segments) continue;

    const fileNum = parseInt((path.basename(jsonPath).match(/(\d+)/) || [0, 0])[1]);
    totalSegs += data.segments.length;
    withEnBefore += data.segments.filter(s => s.en && s.en.trim()).length;

    const needsEn = data.segments.filter(s => !s.en || !s.en.trim());
    if (needsEn.length === 0) {
      withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
      continue;
    }

    // Try letter-specific paragraphs
    let matched = 0;
    const paras = letterSections.get(fileNum);
    if (paras && paras.length > 0) {
      matched = assignSequential(data.segments, paras);
    }

    if (matched > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      filesUpdated++;
      totalMatched += matched;
    }

    withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
  }

  console.log(`  Before: ${withEnBefore}/${totalSegs} (${totalSegs ? Math.round(100*withEnBefore/totalSegs) : 0}%)`);
  console.log(`  After:  ${withEnAfter}/${totalSegs} (${totalSegs ? Math.round(100*withEnAfter/totalSegs) : 0}%)`);
  console.log(`  New matches: ${totalMatched} across ${filesUpdated} files`);
  return totalMatched;
}

/**
 * Process Otzar HaYirah: topic-based HTML files.
 * Reader structure: otzar-hayirah/part-1/torah-N.json
 * HTML files have topic names, not numbers.
 * We need sequential assignment across the whole book.
 */
function processOtzarHayirah() {
  console.log('\n=== Otzar HaYirah (otzar-hayirah) ===');

  const htmlDirNames = ['Oatzar volume 1', 'Oatzar 2', 'Oatzar 4', 'Oatzer volume Mem'];
  const bookDir = path.join(READER_DIR, 'otzar-hayirah');

  if (!fs.existsSync(bookDir)) { console.log('  SKIP: book dir not found'); return 0; }

  // Collect all HTML files
  const allHtmlFiles = [];
  for (const dir of htmlDirNames) {
    const fullDir = path.join(FINISHED_DIR, dir);
    if (!fs.existsSync(fullDir)) { console.log(`  SKIP dir: ${dir}`); continue; }
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.html')).sort();
    for (const f of files) allHtmlFiles.push(path.join(fullDir, f));
  }
  console.log(`  HTML files: ${allHtmlFiles.length}`);

  // Extract sections from HTML - try to get topic-based sections
  const topicSections = new Map();
  const allParas = [];

  for (const hf of allHtmlFiles) {
    const sections = extractBySection(hf);
    for (const [num, paras] of sections) {
      if (!topicSections.has(num)) topicSections.set(num, []);
      topicSections.get(num).push(...paras);
    }
    allParas.push(...extractEnglishFromHtml(hf));
  }

  console.log(`  Topic sections: ${topicSections.size}`);
  console.log(`  Total flat paragraphs: ${allParas.length}`);

  // Process reader JSON files
  let totalMatched = 0, filesUpdated = 0;
  let totalSegs = 0, withEnBefore = 0, withEnAfter = 0;

  const jsonFiles = [];
  function collect(dir) {
    for (const item of fs.readdirSync(dir)) {
      const fp = path.join(dir, item);
      if (fs.statSync(fp).isDirectory()) { collect(fp); continue; }
      if (item.endsWith('.json') && item !== 'index.json') jsonFiles.push(fp);
    }
  }
  collect(bookDir);
  jsonFiles.sort((a, b) => {
    const na = parseInt((path.basename(a).match(/(\d+)/) || [0, 0])[1]);
    const nb = parseInt((path.basename(b).match(/(\d+)/) || [0, 0])[1]);
    return na - nb;
  });

  // For Otzar, try topic-number matching first
  for (const jsonPath of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!data.segments) continue;

    const fileNum = parseInt((path.basename(jsonPath).match(/(\d+)/) || [0, 0])[1]);
    totalSegs += data.segments.length;
    withEnBefore += data.segments.filter(s => s.en && s.en.trim()).length;

    const needsEn = data.segments.filter(s => !s.en || !s.en.trim());
    if (needsEn.length === 0) {
      withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
      continue;
    }

    let matched = 0;
    const paras = topicSections.get(fileNum);
    if (paras && paras.length > 0) {
      matched = assignSequential(data.segments, paras);
    }

    if (matched > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      filesUpdated++;
      totalMatched += matched;
    }

    withEnAfter += data.segments.filter(s => s.en && s.en.trim()).length;
  }

  console.log(`  Before: ${withEnBefore}/${totalSegs} (${totalSegs ? Math.round(100*withEnBefore/totalSegs) : 0}%)`);
  console.log(`  After:  ${withEnAfter}/${totalSegs} (${totalSegs ? Math.round(100*withEnAfter/totalSegs) : 0}%)`);
  console.log(`  New matches: ${totalMatched} across ${filesUpdated} files`);
  return totalMatched;
}

// ─────────────────────── Main ───────────────────────

let grandTotal = 0;

grandTotal += processLetterBook(
  'nosson-by-מכתבי-ר--נתן-ב--ר-יה',
  ['Rabbi Nussun ben Rabbi Yehuda - 55', 'Rabbi Nussun ben Rabbi Yehuda 56-'],
  "R' Nussun ben R' Yehuda"
);

grandTotal += processLetterBook(
  'michtevay-shmuel',
  ['Michtevay Shmuel 1 - 1-16', 'Michtevay Shmuel 1 - 17-', 'Michtevay Shmuel 2'],
  'Michtevay Shmuel'
);

grandTotal += processOtzarHayirah();
grandTotal += processNachasHashulchan();
grandTotal += processEbayHanachal();
grandTotal += processParparos();
grandTotal += processChayeyMoharan();

console.log(`\n========================================`);
console.log(`GRAND TOTAL: ${grandTotal} new English segments imported`);
console.log(`========================================`);
