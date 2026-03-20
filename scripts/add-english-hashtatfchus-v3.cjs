/**
 * Hashtatfchus HaNefesh English v3 - Sequential full-text mapping
 *
 * Since the ODT is a COMPLETE translation of the entire Hebrew book,
 * we extract ALL English text and distribute it sequentially across
 * ALL Hebrew segments in order. This handles the complex multi-chapter
 * Hebrew structure without needing section-number matching.
 */

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const ODT_PATHS = [
  'C:/Users/nanach/Documents/Translations/Outpouring of the Soul/Outpouring of the Soul for Amazon complete.odt',
  'C:/Users/Pettek/Documents/Translations/Outpouring of the Soul/Outpouring of the Soul for Amazon complete.odt',
  'C:/Users/Pettek/Documents/for ajew/Outpouring of the Soul for Amazon complete.odt',
];
const READER_DIR = path.join(__dirname, '../public/reader/hashtatfchus-hanefesh');

function extractODTText(odtPath) {
  const zip = new AdmZip(odtPath);
  const content = zip.readAsText('content.xml');
  return content
    .replace(/<text:p[^>]*>/g, '\n')
    .replace(/<text:tab[^>]*\/>/g, ' ')
    .replace(/<text:s[^>]*\/>/g, ' ')
    .replace(/<text:line-break[^>]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function main() {
  // Find ODT file
  let odtPath = null;
  for (const p of ODT_PATHS) {
    if (fs.existsSync(p)) { odtPath = p; break; }
  }
  if (!odtPath) {
    console.error('ODT file not found!');
    process.exit(1);
  }
  console.log('Using ODT:', odtPath);

  // Extract all text
  const text = extractODTText(odtPath);
  const allLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Filter out non-content lines
  const contentLines = allLines.filter(l => {
    // Skip very short lines
    if (l.length < 4) return false;
    // Skip "Na Nach" markers (but keep if part of a sentence)
    if (l === 'Na Nach Nachma Nachman MeUman!' || l === 'Na Nach Nachma Nachman MeUman') return false;
    return true;
  });

  // Find where the actual book content starts (skip front matter like title, copyright, etc.)
  // Look for "Introduction" or "Preface" or the first real content
  let startIdx = 0;
  for (let i = 0; i < Math.min(contentLines.length, 50); i++) {
    if (/^(introduction|preface|הקדמה)/i.test(contentLines[i])) {
      startIdx = i + 1; // Start after the "Introduction" header
      break;
    }
  }

  // Find where the book content ends (before Psalms/Tehillim transliteration section)
  let endIdx = contentLines.length;
  for (let i = contentLines.length - 1; i > contentLines.length / 2; i--) {
    if (/^(psalm|tehil|chapter\s+\d)/i.test(contentLines[i])) {
      endIdx = i;
    }
  }

  const bookContent = contentLines.slice(startIdx, endIdx);
  console.log(`Total content lines: ${bookContent.length} (from ${startIdx} to ${endIdx} of ${contentLines.length})`);

  // Group content into paragraphs (merge consecutive short lines)
  const paragraphs = [];
  let currentPara = '';
  for (const line of bookContent) {
    // Check if this looks like a section header (numbered or special)
    const isSectionHeader = /^\d+\.\s+/.test(line);

    if (isSectionHeader && currentPara) {
      paragraphs.push(currentPara.trim());
      currentPara = line;
    } else if (line.length > 200 || isSectionHeader) {
      // Long lines are paragraphs on their own
      if (currentPara) paragraphs.push(currentPara.trim());
      paragraphs.push(line);
      currentPara = '';
    } else {
      // Accumulate into current paragraph
      if (currentPara) currentPara += ' ' + line;
      else currentPara = line;
    }
  }
  if (currentPara) paragraphs.push(currentPara.trim());

  // Filter out empty/trivial paragraphs
  const filteredParas = paragraphs.filter(p => p.length > 3);
  console.log(`Filtered paragraphs: ${filteredParas.length}`);

  // Load all reader sections in order
  const readerFiles = [];
  for (let i = 1; i <= 130; i++) {
    const f = path.join(READER_DIR, `section-${i}.json`);
    if (fs.existsSync(f)) readerFiles.push({ num: i, path: f });
  }
  console.log(`Reader sections: ${readerFiles.length}`);

  // Count total Hebrew segments
  let totalHebrewSegs = 0;
  const sectionData = [];
  for (const rf of readerFiles) {
    const data = JSON.parse(fs.readFileSync(rf.path, 'utf8'));
    totalHebrewSegs += data.segments.length;
    sectionData.push({ ...rf, data });
  }
  console.log(`Total Hebrew segments: ${totalHebrewSegs}`);

  // Distribute English paragraphs across Hebrew segments proportionally
  // Each Hebrew segment gets a proportional share of English paragraphs
  const enCount = filteredParas.length;
  const ratio = enCount / totalHebrewSegs;
  console.log(`English paragraphs per Hebrew segment: ${ratio.toFixed(2)}`);

  let enIdx = 0;
  let updated = 0;
  let totalEnSegs = 0;

  for (const sd of sectionData) {
    const data = sd.data;
    let sectionHasEn = false;

    for (let s = 0; s < data.segments.length; s++) {
      // How many English paragraphs for this segment?
      const startEn = Math.floor(enIdx);
      enIdx += ratio;
      const endEn = Math.floor(enIdx);

      if (startEn < endEn && startEn < enCount) {
        const sliceEnd = Math.min(endEn, enCount);
        data.segments[s].en = filteredParas.slice(startEn, sliceEnd).join('\n\n');
        sectionHasEn = true;
        totalEnSegs++;
      } else if (startEn < enCount) {
        // At least give it one paragraph
        data.segments[s].en = filteredParas[startEn] || '';
        if (data.segments[s].en) {
          sectionHasEn = true;
          totalEnSegs++;
          enIdx = startEn + 1;
        }
      } else {
        data.segments[s].en = '';
      }
    }

    data.hasEnglish = sectionHasEn;
    fs.writeFileSync(sd.path, JSON.stringify(data, null, 2), 'utf8');
    if (sectionHasEn) updated++;
  }

  // Update index.json
  const indexPath = path.join(READER_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    for (const torah of index.torahs) {
      const secFile = path.join(READER_DIR, `section-${torah.number}.json`);
      if (fs.existsSync(secFile)) {
        const data = JSON.parse(fs.readFileSync(secFile, 'utf8'));
        torah.hasEnglish = data.hasEnglish;
      }
    }
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  console.log(`\n========================================`);
  console.log(`RESULTS:`);
  console.log(`  Sections with English: ${updated} / ${readerFiles.length}`);
  console.log(`  Segments with English: ${totalEnSegs} / ${totalHebrewSegs} (${Math.round(totalEnSegs/totalHebrewSegs*100)}%)`);
  console.log(`  English paragraphs used: ${Math.min(Math.floor(enIdx), enCount)} / ${enCount}`);
  console.log(`========================================`);
}

main();
