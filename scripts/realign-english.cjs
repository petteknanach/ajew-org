/**
 * realign-english.cjs
 *
 * Fixes misaligned English translations across the entire reader library.
 *
 * Problem: CSS/HTML garbage was imported as English text, and short Hebrew
 * header segments (e.g., "הלכה ב", "אות א") incorrectly received long
 * English paragraphs, shifting all subsequent translations.
 *
 * Fix:
 *   Step 1 - Remove garbage English (CSS/HTML artifacts)
 *   Step 2 - Realign: collect all real English, give none to headers,
 *            redistribute to content segments in order.
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '../public/reader');

// ── Garbage detection ──────────────────────────────────────────────────────

function isGarbageEnglish(en) {
  if (!en || en.length === 0) return false;
  const trimmed = en.trim();

  // CSS class selectors at start (e.g., ".verse", ".source", ".container")
  if (/^\.(verse|source|key|heb|transliteration|aramaic|container|book-title|section-header|halacha-header|closing|bracket|insert|sa-excerpt)/.test(trimmed)) return true;

  // CSS property patterns
  if (/@import\s+url/i.test(trimmed)) return true;
  if (/font-family\s*:/i.test(trimmed)) return true;
  if (/border-radius\s*:/i.test(trimmed)) return true;
  if (/data-astro-cid/i.test(trimmed)) return true;
  if (/css-syntax-error/i.test(trimmed)) return true;

  // CSS rule blocks: "selector { ... }"
  if (/^[a-z][a-z0-9_.-]*\s*\{/i.test(trimmed)) return true;

  // Lines that are mostly CSS declarations
  if (/margin\s*:\s*\d/.test(trimmed) && /padding\s*:\s*\d/.test(trimmed)) return true;

  // CSS custom properties (variables): --text-color: ..., --accent-gold: ...
  if (/^--[a-z]+-[a-z]+\s*:/.test(trimmed)) return true;
  if (/--[a-z]+-[a-z]+\s*:/.test(trimmed) && trimmed.split('--').length > 2) return true;

  // Toggle button artifacts from Hebrew/English toggle: "עברי&#x05ET; ▾ ..." or "עברית ▾ ..."
  if (/עברי/.test(trimmed) && /&#x05/.test(trimmed)) return true;
  if (/^עברית?\s*▾/.test(trimmed)) return true;

  // Strings that are just CSS selectors with no real content
  if (/^\.[a-z]/.test(trimmed) && trimmed.length < 200 && (trimmed.includes('\n') ? trimmed.split('\n').every(l => /^\s*\.?[a-z]/.test(l.trim()) || l.trim() === '') : false)) return true;

  return false;
}

// ── Header detection ───────────────────────────────────────────────────────

const HEADER_PATTERNS = /^(הלכה|הלכות|אות|סימן|פרק|חלק|ליקוטי|ברוך|שלחן|סדר|מסכת|ספר|פרשת|פרשה|תורה|תפלה|עניין|ענין|הקדמה|הסכמה|מאמר|דף|משנה|פסוק|שיעור|דרוש|לקוטי)\s/;

function isHeaderSegment(seg) {
  const he = (seg.he || '').trim();
  // Strip nikud and cantillation marks for length check
  const heStripped = he.replace(/[\u0591-\u05C7\s]/g, '');
  if (heStripped.length === 0) return true; // empty Hebrew = structural
  if (heStripped.length < 15) return true;  // very short = header
  if (heStripped.length < 25 && HEADER_PATTERNS.test(he)) return true; // short + header pattern
  return false;
}

// ── File discovery ─────────────────────────────────────────────────────────

function findJsonFiles(dir) {
  let files = [];
  try {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(findJsonFiles(full));
      } else if (item.endsWith('.json') && item !== 'index.json' && item !== 'catalog.json') {
        files.push(full);
      }
    }
  } catch (e) {
    // skip unreadable dirs
  }
  return files;
}

// ── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('Scanning', READER_DIR, '...\n');
  const files = findJsonFiles(READER_DIR);
  console.log(`Found ${files.length} JSON files\n`);

  let stats = {
    totalFiles: files.length,
    filesProcessed: 0,
    filesModified: 0,
    totalSegments: 0,
    garbageCleaned: 0,
    headersCleared: 0,
    contentWithEnglish: 0,
    contentMissingEnglish: 0,
    filesWithNoEnglish: 0,
  };

  for (const filePath of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      continue; // skip unparseable files
    }

    if (!data.segments || !Array.isArray(data.segments) || data.segments.length === 0) {
      continue;
    }

    stats.filesProcessed++;
    stats.totalSegments += data.segments.length;

    // Check if file has ANY English at all (skip files with no English)
    const hasAnyEnglish = data.segments.some(s => s.en && s.en.trim().length > 0);
    if (!hasAnyEnglish) {
      stats.filesWithNoEnglish++;
      continue;
    }

    let modified = false;

    // ── Step 1: Identify garbage ──
    // ── Step 2: Classify segments and collect English ──

    // Collect all non-garbage English in order
    const allEnglish = [];
    let garbageInFile = 0;
    let headersInFile = 0;

    for (const seg of data.segments) {
      const en = (seg.en || '').trim();
      if (!en) continue;
      if (isGarbageEnglish(en)) {
        garbageInFile++;
        // don't collect garbage
      } else {
        allEnglish.push(en);
      }
    }

    stats.garbageCleaned += garbageInFile;

    // Classify each segment as header or content
    const segClassification = data.segments.map(seg => ({
      seg,
      isHeader: isHeaderSegment(seg),
    }));

    // Count headers that currently have English (these are the misaligned ones)
    const headersWithEnglish = segClassification.filter(
      c => c.isHeader && c.seg.en && c.seg.en.trim().length > 0 && !isGarbageEnglish(c.seg.en)
    ).length;

    // If there's no misalignment issue (no garbage, no headers with English), skip
    if (garbageInFile === 0 && headersWithEnglish === 0) {
      continue;
    }

    // Content segment indices (non-header)
    const contentIndices = [];
    for (let i = 0; i < segClassification.length; i++) {
      if (!segClassification[i].isHeader) {
        contentIndices.push(i);
      } else {
        headersInFile++;
      }
    }

    // Edge case: if ALL segments are headers (e.g., files with only translator
    // notes and no Hebrew content), just clean garbage but don't redistribute.
    // These files have English-only content that belongs exactly where it is.
    if (contentIndices.length === 0) {
      // Only clean garbage entries, leave everything else in place
      if (garbageInFile > 0) {
        for (const seg of data.segments) {
          if (seg.en && isGarbageEnglish(seg.en)) {
            seg.en = '';
            modified = true;
          }
        }
      }
      stats.headersCleared += 0; // don't count these as "cleared"
      if (modified) {
        const fileHasEnglish = data.segments.some(s => s.en && s.en.trim().length > 0);
        data.hasEnglish = fileHasEnglish;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        stats.filesModified++;
      }
      continue;
    }

    stats.headersCleared += headersInFile;

    // ── Step 3: Redistribute English ──

    // Clear ALL English first
    for (const seg of data.segments) {
      if (seg.en && seg.en.trim().length > 0) {
        seg.en = '';
        modified = true;
      }
    }

    // Assign English to content segments in order
    for (let i = 0; i < contentIndices.length; i++) {
      const segIdx = contentIndices[i];
      if (i < allEnglish.length) {
        data.segments[segIdx].en = allEnglish[i];
        stats.contentWithEnglish++;
      } else {
        stats.contentMissingEnglish++;
      }
    }

    // If more English than content segments, concatenate extras onto last content segment
    if (allEnglish.length > contentIndices.length && contentIndices.length > 0) {
      const lastContentIdx = contentIndices[contentIndices.length - 1];
      const extras = allEnglish.slice(contentIndices.length);
      data.segments[lastContentIdx].en += '\n\n' + extras.join('\n\n');
    }

    // Update hasEnglish flag
    const fileHasEnglish = data.segments.some(s => s.en && s.en.trim().length > 0);
    data.hasEnglish = fileHasEnglish;

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      stats.filesModified++;
    }
  }

  // ── Report ──
  console.log('=== REALIGNMENT COMPLETE ===\n');
  console.log(`Total files scanned:          ${stats.totalFiles}`);
  console.log(`Files with segments:          ${stats.filesProcessed}`);
  console.log(`Files with no English:        ${stats.filesWithNoEnglish}`);
  console.log(`Files modified:               ${stats.filesModified}`);
  console.log(`Total segments:               ${stats.totalSegments}`);
  console.log(`Garbage English cleaned:      ${stats.garbageCleaned}`);
  console.log(`Header segments cleared:      ${stats.headersCleared}`);
  console.log(`Content segments w/ English:  ${stats.contentWithEnglish}`);
  console.log(`Content segments no English:  ${stats.contentMissingEnglish}`);
}

main();
