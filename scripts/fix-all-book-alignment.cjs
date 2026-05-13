/**
 * Fix English-Hebrew alignment across ALL reader books.
 *
 * For each file with alignment issues:
 * 1. Collect all English text
 * 2. Identify segment groups (separated by ois markers or structural breaks)
 * 3. Distribute English proportionally by Hebrew length at sentence boundaries
 * 4. Write back the fixed file
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');

// Books to fix (exclude already-fixed LM and perfect Meshivas Nefesh)
const BOOKS_TO_FIX = [
  'sichos-haran',
  'kitzur-likutay-moharan',
  'likutay-eitzos',
  'likutay-eitzos-basra',
  'ebay-hanachal',
  'likutay-tefilos',
  'chayey-moharan',
  'rimzei-hamaasiyos',
  'sefer-hamidos',
  'shivchay-haran',
  'alim-litrufa',
  'sipurey-maasiyos',
];

function isOisMarker(he) {
  const t = (he || '').trim().replace(/[.\s\u0591-\u05C7]/g, '');
  if (t.length === 0) return true;
  if (t.length <= 3 && /^[\u05D0-\u05EA]+$/.test(t)) return true;
  if (t === 'רשב"ם' || t === 'רש"י' || t === 'תוד"ה') return true;
  return false;
}

function findSentenceBoundary(text, targetPos, maxSearch = 200) {
  // Search forward first for period/newline
  for (let i = targetPos; i < Math.min(targetPos + maxSearch, text.length); i++) {
    if ((text[i] === '.' && text[i+1] === ' ') || text[i] === '\n') {
      return i + 1;
    }
  }
  // Search backward
  for (let i = targetPos; i > Math.max(targetPos - maxSearch, 0); i--) {
    if ((text[i] === '.' && text[i+1] === ' ') || text[i] === '\n') {
      return i + 1;
    }
  }
  // Fallback: space near target
  for (let i = targetPos; i < Math.min(targetPos + 50, text.length); i++) {
    if (text[i] === ' ') return i + 1;
  }
  return targetPos;
}

function distributeEnglish(enText, segments) {
  // segments is an array of { index, heLen } for content segments only
  if (segments.length === 0 || !enText.trim()) return [];

  const totalHe = segments.reduce((s, seg) => s + seg.heLen, 0);
  if (totalHe === 0) {
    // Equal distribution
    const chunkSize = Math.floor(enText.length / segments.length);
    return segments.map((seg, i) => ({
      index: seg.index,
      en: i === segments.length - 1
        ? enText.substring(i * chunkSize).trim()
        : enText.substring(i * chunkSize, (i + 1) * chunkSize).trim()
    }));
  }

  const results = [];
  let pos = 0;

  for (let i = 0; i < segments.length; i++) {
    if (i === segments.length - 1) {
      results.push({ index: segments[i].index, en: enText.substring(pos).trim() });
    } else {
      const proportion = segments[i].heLen / totalHe;
      const targetEnd = pos + Math.floor(enText.length * proportion);
      const splitAt = findSentenceBoundary(enText, targetEnd);
      results.push({ index: segments[i].index, en: enText.substring(pos, splitAt).trim() });
      pos = splitAt;
    }
  }

  return results;
}

function fixFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const segs = data.segments;
  if (!segs || segs.length === 0) return false;

  // Check if this file needs fixing
  const crammed = segs.filter(s => {
    const en = (s.en || '').length;
    const he = (s.he || s.he_nikud || '').length;
    return en > 1500 && en > 3 * he;
  });
  const emptyContent = segs.filter(s => {
    const en = (s.en || '').trim();
    const he = (s.he_nikud || s.he || '').trim();
    return !en && he.length > 10;
  });

  if (crammed.length === 0 && emptyContent.length === 0) return false;

  // Collect all English
  let allEnglish = '';
  segs.forEach(s => {
    if (s.en && s.en.trim()) {
      if (allEnglish) allEnglish += ' ';
      allEnglish += s.en.trim();
    }
  });

  if (!allEnglish.trim()) return false;

  // Group segments: content segments grouped between ois markers
  const groups = [];
  let currentGroup = [];

  for (let i = 0; i < segs.length; i++) {
    const he = (segs[i].he_nikud || segs[i].he || '').trim();

    if (isOisMarker(he) && he.length <= 6) {
      if (currentGroup.length > 0) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
      // Ois marker gets no English
      continue;
    }

    if (he.length > 0) {
      currentGroup.push({
        index: i,
        heLen: he.length
      });
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Flatten to get all content segment indices
  const allContentSegs = groups.flat();
  const totalHeLen = allContentSegs.reduce((s, seg) => s + seg.heLen, 0);

  // Distribute English across all content segments proportionally
  const distributed = distributeEnglish(allEnglish, allContentSegs);

  // Apply
  let changed = 0;

  // First clear all English
  segs.forEach(s => {
    if (s.en) {
      s.en = '';
      changed++;
    }
  });

  // Then set the distributed English
  distributed.forEach(({ index, en }) => {
    segs[index].en = en;
  });

  // Write back
  data.segments = segs;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

// Process all books
let totalFixed = 0;
let totalFiles = 0;

BOOKS_TO_FIX.forEach(bookName => {
  const bookDir = path.join(READER_DIR, bookName);
  if (!fs.existsSync(bookDir)) return;

  // Find all parts
  let parts = fs.readdirSync(bookDir).filter(f => {
    const fp = path.join(bookDir, f);
    return fs.statSync(fp).isDirectory();
  });
  if (parts.length === 0) parts = ['.'];

  let bookFixed = 0;
  let bookTotal = 0;

  parts.forEach(part => {
    const partDir = part === '.' ? bookDir : path.join(bookDir, part);
    const files = fs.readdirSync(partDir).filter(f => f.endsWith('.json'));

    files.forEach(f => {
      bookTotal++;
      totalFiles++;
      try {
        const fixed = fixFile(path.join(partDir, f));
        if (fixed) {
          bookFixed++;
          totalFixed++;
        }
      } catch (e) {
        // Skip errors silently
      }
    });
  });

  if (bookFixed > 0) {
    console.log(`${bookName}: fixed ${bookFixed}/${bookTotal} files`);
  } else {
    console.log(`${bookName}: ${bookTotal} files, none needed fixing`);
  }
});

console.log(`\nTotal: fixed ${totalFixed}/${totalFiles} files`);

// Verify: check remaining issues
console.log('\n=== Remaining Issues ===');
BOOKS_TO_FIX.forEach(bookName => {
  const bookDir = path.join(READER_DIR, bookName);
  if (!fs.existsSync(bookDir)) return;

  let parts = fs.readdirSync(bookDir).filter(f => {
    return fs.statSync(path.join(bookDir, f)).isDirectory();
  });
  if (parts.length === 0) parts = ['.'];

  let crammedCount = 0, emptyCount = 0;

  parts.forEach(part => {
    const partDir = part === '.' ? bookDir : path.join(bookDir, part);
    fs.readdirSync(partDir).filter(f => f.endsWith('.json')).forEach(f => {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8'));
        (d.segments || []).forEach(s => {
          const en = (s.en || '').length;
          const he = (s.he || s.he_nikud || '').length;
          if (en > 1500 && en > 3 * he) crammedCount++;
          if (!s.en?.trim() && (s.he_nikud || s.he || '').trim().length > 10) emptyCount++;
        });
      } catch (e) {}
    });
  });

  if (crammedCount > 0 || emptyCount > 0) {
    console.log(`${bookName}: ${crammedCount} crammed, ${emptyCount} empty`);
  }
});
