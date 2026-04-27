/**
 * build-aligned-all-books.cjs
 *
 * Creates aligned_segments for ALL books with both Hebrew and English.
 * Usage: node build-aligned-all-books.cjs [book-slug]
 * If no slug given, processes all books.
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const targetSlug = process.argv[2] || null;

// Reference patterns to extract as type:"note"
const REF_PATTERNS = [
  /^\((?:Likutay|Sefer|See|see|cf\.|ibid|Torah|Tehillim|Mishlei|Shemos|Bereishis|Vayikra|Bamidbar|Devarim)[\s,]/i,
  /^\([A-Z][a-z]+ \d+[,:]\d+/,
  /^\((?:vol\.|Volume|Chapter|Section|Part|Hil\.|Laws of)/i,
];

function isReference(text) {
  if (!text || text.length > 300) return false;
  return REF_PATTERNS.some(p => p.test(text.trim()));
}

function splitHebrewAtSentences(he) {
  if (!he || he.length < 100) return [he];
  // Split at periods followed by space, or at major clause breaks
  const parts = he.split(/(?<=[\.\:])\s+(?=[א-ת])/).filter(p => p.trim());
  if (parts.length <= 1) {
    // Try splitting at commas for very long paragraphs
    if (he.length > 300) {
      const commaParts = he.split(/(?<=,)\s+(?=[א-ת])/).filter(p => p.trim());
      // Group into chunks of ~2-3 comma parts
      const chunks = [];
      let current = '';
      for (const part of commaParts) {
        current += (current ? ', ' : '') + part;
        if (current.length > 120) {
          chunks.push(current);
          current = '';
        }
      }
      if (current) chunks.push(current);
      return chunks.length > 1 ? chunks : [he];
    }
    return [he];
  }
  return parts;
}

function splitEnglishAtSentences(en) {
  if (!en || en.length < 100) return [en];
  const parts = en.split(/(?<=[\.\!\?])\s+(?=[A-Z\(])/).filter(p => p.trim());
  return parts.length > 0 ? parts : [en];
}

function buildAlignedSegments(segments) {
  const aligned = [];
  let idx = 1;

  for (const seg of segments) {
    const he = (seg.he || '').trim();
    const en = (seg.en || '').trim();

    if (!he && !en) continue;

    // Split Hebrew into smaller chunks
    const heChunks = he ? splitHebrewAtSentences(he) : [''];

    // Split English and separate references
    const enParts = en ? splitEnglishAtSentences(en) : [''];
    const enContent = [];
    const enRefs = [];

    for (const part of enParts) {
      if (isReference(part)) {
        enRefs.push(part);
      } else {
        enContent.push(part);
      }
    }

    // Match Hebrew chunks to English content proportionally
    const heCount = heChunks.length;
    const enCount = enContent.length;

    if (heCount === 0 && enCount === 0) continue;

    if (heCount <= enCount) {
      // More English than Hebrew - distribute English across Hebrew chunks
      const ratio = enCount / Math.max(heCount, 1);
      for (let i = 0; i < heCount; i++) {
        const enStart = Math.floor(i * ratio);
        const enEnd = Math.floor((i + 1) * ratio);
        const enSlice = enContent.slice(enStart, enEnd).join(' ');
        aligned.push({ index: idx++, he: heChunks[i], en: enSlice });
      }
    } else {
      // More Hebrew than English - distribute Hebrew across English
      const ratio = heCount / Math.max(enCount, 1);
      for (let i = 0; i < enCount; i++) {
        const heStart = Math.floor(i * ratio);
        const heEnd = Math.floor((i + 1) * ratio);
        const heSlice = heChunks.slice(heStart, heEnd).join(' ');
        aligned.push({ index: idx++, he: heSlice, en: enContent[i] });
      }
      // Any remaining Hebrew without English
      const lastEnIdx = Math.floor(enCount * ratio / heCount * heCount);
      if (lastEnIdx < heCount) {
        const remaining = heChunks.slice(Math.floor((enCount) * ratio)).join(' ');
        if (remaining.trim()) {
          aligned.push({ index: idx++, he: remaining, en: '' });
        }
      }
    }

    // Add reference notes
    for (const ref of enRefs) {
      aligned.push({ index: idx++, he: '', en: ref, type: 'note' });
    }
  }

  return aligned;
}

function processBook(bookDir) {
  let processed = 0;

  // Find all JSON files (various naming patterns)
  const patterns = ['letter-', 'torah-', 'section-', 'sicha-', 'topic-', 'chapter-', 'story-', 'prayer-'];

  function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const f of files) {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        processDir(fullPath);
        continue;
      }

      if (!f.endsWith('.json') || f === 'index.json' || f === 'catalog.json') continue;
      if (!patterns.some(p => f.startsWith(p))) continue;

      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (!data.segments || data.segments.length === 0) continue;

        // Skip if already has aligned_segments
        if (data.aligned_segments && data.aligned_segments.length > 0) continue;

        // Only process if has both Hebrew and English
        const hasHe = data.segments.some(s => (s.he || '').trim());
        const hasEn = data.segments.some(s => (s.en || '').trim());
        if (!hasHe || !hasEn) continue;

        data.aligned_segments = buildAlignedSegments(data.segments);
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
        processed++;
      } catch (e) {
        // Skip problematic files
      }
    }
  }

  processDir(bookDir);
  return processed;
}

// Main
const books = targetSlug ? [targetSlug] : fs.readdirSync(READER_DIR).filter(f => {
  const fullPath = path.join(READER_DIR, f);
  return fs.statSync(fullPath).isDirectory() && f !== '.git';
});

let totalProcessed = 0;

for (const book of books) {
  const bookPath = path.join(READER_DIR, book);
  const count = processBook(bookPath);
  if (count > 0) {
    console.log(`  ${book}: ${count} files aligned`);
    totalProcessed += count;
  }
}

console.log(`\nDone! Total files processed: ${totalProcessed}`);
