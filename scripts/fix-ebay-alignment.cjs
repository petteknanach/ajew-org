/**
 * Fix English-Hebrew alignment in Ebay HaNachal reader files.
 *
 * Problem: English translations contain source references, footnotes, and
 * appendix markers as separate paragraphs that the Hebrew doesn't have.
 * This causes EN to drift out of alignment with HE.
 *
 * Strategy: Work on the flat EN text array. In each pass:
 * 1. Extract reference prefixes from EN segments (move to prev EN)
 * 2. Remove pure-reference EN segments (merge into prev EN)
 * 3. Split merged EN paragraphs to compensate (keep segment count stable)
 * Repeat until stable.
 */

const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..', 'public', 'reader', 'ebay-hanachal');

// ===== Detection functions =====

/**
 * Check if EN text is entirely a standalone reference/citation.
 */
function isPureReference(en) {
  const text = (en || '').trim();
  if (!text) return false;

  // Footnote with up-arrow
  if (text.includes('\u2191') && text.length < 300) return true;

  // vol. continuation
  if (/^vol\.\s/i.test(text)) return true;

  // Bare chapter:verse
  if (/^\d+:\d+/.test(text) && text.length < 200) return true;

  // Shulchan Aruch section (short, with numbers)
  if (/^(Orach|Yoreh|Choshen|Even)\s/i.test(text) && text.length < 300) {
    const norm = text.replace(/\n/g, ' ');
    if (/\d+:\d+/.test(norm.substring(0, 150)) || /vol\.|volume/i.test(norm.substring(0, 100))) {
      return true;
    }
  }

  // Standalone Likutay reference
  if (/^Likutay\s+(Halachos|Moharan|Tefilos)/i.test(text) && text.length < 200) return true;

  // Section reference
  if (/^(Laws?\s+of|Signs?\s+of|Division\s+of|Collection\s+of)/i.test(text) && text.length < 200) return true;

  // Appendix / Edition / Completion markers
  if (/^Appendix\s+Letter/i.test(text)) return true;
  if (/^Edition\s/i.test(text) && text.length < 100) return true;
  if (/^Here is completed/i.test(text)) return true;

  return false;
}

/**
 * Check if EN starts with a reference that should be moved to previous segment.
 * Returns { refPart, contentPart } or null.
 */
function extractRefPrefix(en) {
  const text = (en || '').trim();
  if (!text || text.length < 60) return null;

  // Pattern 1: "(Likutay Moharan, Torah 70).\n"
  const m1 = text.match(/^\((?:Likutay|See|ibid|cf|Sefer|Torah|Kitzur|Sichos|Shulchan|Choshen|Yoreh|Orach|Even)[^)]*\)[.!?]?\s*\n/i);
  if (m1 && text.length > m1[0].length + 50) {
    return {
      refPart: text.substring(0, m1[0].length).trim(),
      contentPart: text.substring(m1[0].length).trim()
    };
  }

  // Pattern 2: "Orach Chaim 2, Laws of X N:N). Content..."
  // (SA section continuation without opening paren, closing with ')')
  const norm = text.replace(/\n/g, ' ');
  const m2 = norm.match(/^(?:Orach\s*Chaim|Yoreh\s*Dayah|Choshen\s*Mishpat|Even\s*HaEzer)\s+(?:vol\.\s*)?\d[^)]*\)[.!?,]?\s*/i);
  if (m2 && norm.length > m2[0].length + 50) {
    // Find closing ')' in original text
    const closeParen = text.indexOf(')');
    if (closeParen > 0) {
      let end = closeParen + 1;
      while (end < text.length && /[.!?,\s]/.test(text[end])) end++;
      if (text.length > end + 50) {
        return {
          refPart: text.substring(0, end).trim(),
          contentPart: text.substring(end).trim()
        };
      }
    }
  }

  // Pattern 3: "vol. N, N:N, also see there...). Content..."
  const m3 = text.match(/^vol\.\s+\d[^)]*\)[.!?,]?\s*/i);
  if (m3 && text.length > m3[0].length + 50) {
    return {
      refPart: text.substring(0, m3[0].length).trim(),
      contentPart: text.substring(m3[0].length).trim()
    };
  }

  return null;
}

/**
 * Find a paragraph split point in EN text.
 * Looks for a line ending with sentence punctuation followed by a new sentence.
 * Returns the character index of the split, or -1.
 */
function findParagraphSplit(en) {
  const text = (en || '');
  if (text.length < 200) return -1;

  const lines = text.split('\n');
  let pos = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    pos += lines[i].length + 1; // +1 for \n

    const currentLine = lines[i].trim();
    const nextLine = lines[i + 1].trim();

    // Skip short transliteration lines
    if (currentLine.length < 30) continue;
    if (nextLine.length < 30) continue;

    // Current line must end with sentence punctuation
    if (!/[.)!?]\s*$/.test(currentLine)) continue;

    // Next line must start with capital letter
    if (!/^[A-Z]/.test(nextLine)) continue;

    // Both sides must be substantial
    if (pos > 80 && (text.length - pos) > 80) {
      return pos;
    }
  }
  return -1;
}

// ===== Main processing =====

function processFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.segments || data.segments.length === 0) return { changes: 0 };

  const segs = data.segments;
  let enValues = segs.map(s => s.en || '');
  const originalLen = enValues.length;
  const changes = [];

  // Track earliest affected index for split targeting
  let earliestAffected = enValues.length;

  // Iterative passes until stable
  let changed = true;
  while (changed) {
    changed = false;

    // Pass A: Extract reference prefixes
    for (let i = 1; i < enValues.length; i++) {
      const extracted = extractRefPrefix(enValues[i]);
      if (extracted) {
        enValues[i - 1] = enValues[i - 1].trim() + ' ' + extracted.refPart;
        enValues[i] = extracted.contentPart;
        changes.push({ type: 'ref-prefix', idx: i });
        changed = true;
      }
    }

    // Pass B: Remove pure reference segments
    const toRemove = [];
    for (let i = 1; i < enValues.length; i++) {
      if (isPureReference(enValues[i])) {
        enValues[i - 1] = enValues[i - 1].trim() + ' ' + enValues[i].trim();
        toRemove.push(i);
        changes.push({ type: 'remove-ref', idx: i });
        if (i < earliestAffected) earliestAffected = i;
        changed = true;
      }
    }

    // Remove from end to preserve indices
    for (let r = toRemove.length - 1; r >= 0; r--) {
      enValues.splice(toRemove[r], 1);
    }
  }

  // Pass C: Split merged paragraphs to compensate for removals
  // Only split at or after the earliest affected index to preserve
  // alignment of segments that were already correct
  const deficit = originalLen - enValues.length;
  if (deficit > 0) {
    let remaining = deficit;
    // Start searching from just before the earliest removal point
    const startIdx = Math.max(0, earliestAffected - 2);
    for (let i = startIdx; i < enValues.length && remaining > 0; i++) {
      const splitPos = findParagraphSplit(enValues[i]);
      if (splitPos > 0) {
        const part1 = enValues[i].substring(0, splitPos).trim();
        const part2 = enValues[i].substring(splitPos).trim();
        if (part1.length > 50 && part2.length > 50) {
          enValues.splice(i, 1, part1, part2);
          remaining--;
          changes.push({ type: 'split', idx: i });
          i++; // skip inserted entry
        }
      }
    }
  }

  if (changes.length === 0) return { changes: 0 };

  // Reassign EN values
  for (let i = 0; i < segs.length; i++) {
    segs[i].en = i < enValues.length ? enValues[i] : '';
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return { changes: changes.length, details: changes };
}

// ---- Print BEFORE state for letter-5 ----
console.log('=== BEFORE FIX: letter-5 part-1 ===');
const beforeData5 = JSON.parse(fs.readFileSync(path.join(BASE, 'part-1', 'letter-5.json'), 'utf8'));
for (const seg of beforeData5.segments) {
  console.log(`SEG ${seg.index}  HE: ${(seg.he || '').substring(0, 50)}`);
  console.log(`        EN: ${(seg.en || '').substring(0, 100)}`);
}

// ---- Process all files ----
console.log('\n=== PROCESSING ===');
const parts = ['part-1', 'part-2'];
let totalChanges = 0;
let filesChanged = 0;

for (const part of parts) {
  const dir = path.join(BASE, part);
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('letter-') && f.endsWith('.json'))
    .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

  for (const f of files) {
    const result = processFile(path.join(dir, f));
    if (result.changes > 0) {
      filesChanged++;
      totalChanges += result.changes;
      for (const d of result.details) {
        console.log(`  ${part}/${f}: ${d.type} at idx ${d.idx}`);
      }
    }
  }
}

console.log(`\nTotal: ${totalChanges} operations across ${filesChanged} files.`);

// ---- Print AFTER state for letter-5 ----
console.log('\n=== AFTER FIX: letter-5 part-1 ===');
const afterData5 = JSON.parse(fs.readFileSync(path.join(BASE, 'part-1', 'letter-5.json'), 'utf8'));
for (const seg of afterData5.segments) {
  console.log(`SEG ${seg.index}  HE: ${(seg.he || '').substring(0, 50)}`);
  console.log(`        EN: ${(seg.en || '').substring(0, 100)}`);
}

// ---- Print AFTER state for letter-8 ----
console.log('\n=== AFTER FIX: letter-8 part-1 (segs 3-8) ===');
const afterData8 = JSON.parse(fs.readFileSync(path.join(BASE, 'part-1', 'letter-8.json'), 'utf8'));
for (let i = 2; i < 8 && i < afterData8.segments.length; i++) {
  const seg = afterData8.segments[i];
  console.log(`SEG ${seg.index}  HE: ${(seg.he || '').substring(0, 50)}`);
  console.log(`        EN: ${(seg.en || '').substring(0, 100)}`);
}
