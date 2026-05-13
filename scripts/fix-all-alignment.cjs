/**
 * Fix aligned_segments for ALL books in the reader
 *
 * Handles:
 * 1. Books with no aligned_segments at all (221 files)
 * 2. Books with English segments missing Hebrew pairing (103 files)
 * 3. Rebuilds aligned_segments from segments data
 *
 * Usage:
 *   node scripts/fix-all-alignment.cjs
 *   node scripts/fix-all-alignment.cjs --dry-run
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.resolve(__dirname, '..', 'public', 'reader');
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Build aligned_segments from segments array.
 * Each segment becomes one aligned entry with he + en paired.
 */
function buildAlignedSegments(segments) {
  const aligned = [];
  let idx = 1;

  for (const seg of segments) {
    const he = seg.he || '';
    const en = seg.en || '';
    const heNikud = seg.he_nikud || '';

    if (!he && !en) continue;

    const entry = { index: idx++, he, en };
    if (heNikud) entry.he_nikud = heNikud;
    aligned.push(entry);
  }

  return aligned;
}

/**
 * Check if a file needs fixing
 */
function needsFix(data) {
  if (!data.segments || data.segments.length === 0) return false;

  const hasEn = data.segments.some(s => s.en && s.en.length > 0);
  if (!hasEn) return false;

  const hasHe = data.segments.some(s => s.he && s.he.length > 0);
  // English-only content (no Hebrew at all) - aligned_segments with en-only is correct
  if (!hasHe) return false;

  // Has both Hebrew and English - check alignment
  // No aligned_segments
  if (!data.aligned_segments || data.aligned_segments.length === 0) return true;

  // Check if en-only entries in aligned_segments match en-only entries in source segments
  // If they do, alignment is correct (the source just has English-only content)
  const enOnlyInSource = data.segments.filter(
    s => s.en && s.en.length > 0 && (!s.he || s.he.length === 0)
  ).length;
  const enOnlyInAligned = data.aligned_segments.filter(
    s => s.en && s.en.length > 0 && (!s.he || s.he.length === 0)
  ).length;

  // If aligned has MORE en-only than source, alignment is broken
  // If they match, it's just reflecting the source data correctly
  return enOnlyInAligned > enOnlyInSource;
}

function main() {
  console.log('=== Fix All Book Alignment ===');
  if (DRY_RUN) console.log('*** DRY RUN ***\n');

  const bookDirs = fs.readdirSync(READER_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let totalFiles = 0;
  let fixedFiles = 0;
  let skippedFiles = 0;
  const fixedBooks = new Map();

  for (const bookDir of bookDirs) {
    const bookPath = path.join(READER_DIR, bookDir);

    // Handle nested part dirs (e.g., likutay-moharan/part-1/)
    const subDirs = [bookPath];
    const partDirs = fs.readdirSync(bookPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith('part-'));
    for (const pd of partDirs) {
      subDirs.push(path.join(bookPath, pd.name));
    }

    for (const dir of subDirs) {
      const jsonFiles = fs.readdirSync(dir)
        .filter(f => f.endsWith('.json') && f !== 'index.json');

      for (const jsonFile of jsonFiles) {
        totalFiles++;
        const filePath = path.join(dir, jsonFile);

        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          if (!needsFix(data)) {
            skippedFiles++;
            continue;
          }

          const newAligned = buildAlignedSegments(data.segments);
          data.aligned_segments = newAligned;

          if (!DRY_RUN) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          }

          fixedFiles++;
          const bookKey = dir === bookPath ? bookDir : bookDir + '/' + path.basename(dir);
          if (!fixedBooks.has(bookKey)) fixedBooks.set(bookKey, 0);
          fixedBooks.set(bookKey, fixedBooks.get(bookKey) + 1);

        } catch (e) {
          console.error(`  ERROR: ${bookDir}/${jsonFile}: ${e.message}`);
        }
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total files scanned: ${totalFiles}`);
  console.log(`Files fixed: ${fixedFiles}`);
  console.log(`Files skipped (OK or no English): ${skippedFiles}`);
  console.log(`Books affected: ${fixedBooks.size}`);

  if (fixedBooks.size > 0) {
    console.log('\nFixed books:');
    for (const [book, count] of [...fixedBooks.entries()].sort()) {
      console.log(`  ${book}: ${count} files`);
    }
  }
}

main();
