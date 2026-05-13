/**
 * Fix Hebrew content in Ruzin Gineezin reader JSON files.
 *
 * Extracts Hebrew from the corrected DOCX source and matches paragraphs
 * to the existing English segments across all section files.
 *
 * Usage: node scripts/fix-ruzin-gineezin-hebrew.cjs
 */

const mammoth = require('mammoth');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const DOCX_PATH = path.join(
  'C:', 'Users', 'Pettek', 'Downloads', 'final batch from TE', 'Ramchal',
  'Ruzin Gineezin',
  '010 Ruzin Gineezin - Complete Source Hebrew Corrected (1).docx'
);

const HTML_PATH = path.join(
  'C:', 'Users', 'Pettek', 'Downloads', 'final batch from TE', 'Ramchal',
  'Ruzin Gineezin',
  '000 Ruzin Gineezin - Complete Translation All Sections.html'
);

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'ramchal-ruzin-gineezin');

// Section numbers in the reader (matching file names)
const SECTION_NUMBERS = [1, 3, 4, 5, 7];

// Hebrew section title patterns to identify section boundaries in DOCX
const SECTION_MARKERS = {
  1: /לא יסור שבט/,
  3: /ויאהב יעקב/,
  4: /ושמת אותם|ושמת אתם/,
  5: /ושמת המצנפת/,
  7: /עטרין ותכשיטין/,
};

// Discourse markers in Hebrew (הא', הב', הג', etc.)
const DISCOURSE_LABELS = [
  'הא\'', 'הב\'', 'הג\'', 'הד\'', 'הה\'', 'הו\'', 'הז\'', 'הח\'', 'הט\'',
  'הי\'', 'הי"א', 'הי"ב'
];

/**
 * Check if text is primarily Hebrew (contains Hebrew characters).
 */
function isHebrew(text) {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && hebrewChars / totalChars > 0.3;
}

/**
 * Clean Hebrew text - remove extra whitespace, normalize.
 */
function cleanHebrew(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract Hebrew paragraphs from DOCX HTML, grouped by section.
 */
function extractHebrewSections(html) {
  const $ = cheerio.load(html);
  const paragraphs = [];

  $('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      paragraphs.push(text);
    }
  });

  console.log(`Total paragraphs from DOCX: ${paragraphs.length}`);

  // Group paragraphs by section
  // Look for section title markers to split
  const sections = {};
  let currentSection = null;
  let currentParagraphs = [];

  for (const para of paragraphs) {
    // Check if this paragraph is a section header
    let foundSection = null;
    for (const [secNum, pattern] of Object.entries(SECTION_MARKERS)) {
      if (pattern.test(para) && para.length < 200) {
        foundSection = parseInt(secNum);
        break;
      }
    }

    if (foundSection !== null) {
      // Save previous section
      if (currentSection !== null && currentParagraphs.length > 0) {
        sections[currentSection] = currentParagraphs;
      }
      currentSection = foundSection;
      currentParagraphs = [];
      console.log(`Found section ${foundSection} marker: "${para.substring(0, 80)}..."`);
    } else if (currentSection !== null) {
      // Only include Hebrew paragraphs (skip any English/notes)
      if (isHebrew(para) && para.length > 5) {
        currentParagraphs.push(cleanHebrew(para));
      }
    }
  }

  // Save last section
  if (currentSection !== null && currentParagraphs.length > 0) {
    sections[currentSection] = currentParagraphs;
  }

  return sections;
}

/**
 * Try to identify discourse boundaries in Hebrew paragraphs.
 * Look for patterns like "זה הפירוש הא'" or "הפירוש הב'" or just discourse numbering.
 */
function findDiscourseBoundaries(paragraphs) {
  const boundaries = [0]; // First discourse starts at paragraph 0

  for (let i = 1; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    // Check for discourse marker patterns
    if (/זה הפירוש|הפירוש ה[אבגדהוזחטי]|פירוש ה[אבגדהוזחטי]/.test(para) && para.length < 100) {
      boundaries.push(i);
    }
  }

  return boundaries;
}

/**
 * Match Hebrew paragraphs to English segments.
 *
 * Strategy:
 * 1. First, try matching by existing Hebrew content (for segments that already have it)
 * 2. Then use discourse headers in English to identify boundaries
 * 3. Fill in remaining segments sequentially
 */
function matchHebrewToSegments(hebrewParagraphs, segments) {
  const result = new Array(segments.length).fill('');

  // First pass: find segments that already have Hebrew and use them as anchors
  const anchors = []; // { segIdx, heParaIdx }
  for (let si = 0; si < segments.length; si++) {
    const existingHe = (segments[si].he || '').trim();
    if (!existingHe) continue;

    // Try to find this exact text (or close match) in the Hebrew paragraphs
    const first50chars = existingHe.substring(0, 50).replace(/['"]/g, '');
    for (let hi = 0; hi < hebrewParagraphs.length; hi++) {
      const hePara = hebrewParagraphs[hi].replace(/['"]/g, '');
      if (hePara.startsWith(first50chars.substring(0, 30)) ||
          hePara.includes(first50chars.substring(0, 40))) {
        anchors.push({ segIdx: si, heParaIdx: hi });
        result[si] = hebrewParagraphs[hi];
        break;
      }
    }
  }

  console.log(`  Found ${anchors.length} anchor matches from existing Hebrew`);

  // Second pass: identify discourse boundaries in English segments
  const discourseStarts = []; // segment indices where new discourses begin
  for (let si = 0; si < segments.length; si++) {
    const en = segments[si].en || '';
    if (/\*\*The (First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth) (Discourse|Passage)/.test(en) ||
        /\*\*(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth) Passage/.test(en) ||
        /זה הפירוש ה/.test(en)) {
      discourseStarts.push(si);
    }
  }

  // Also check for "Primary:" or verse citation pattern at segment 0
  // (first segment is usually the anchor verse, not a discourse)

  console.log(`  Found ${discourseStarts.length} discourse/passage starts in English`);

  // Third pass: sequential assignment
  // If we have anchors, use them to partition. Otherwise, try sequential.
  if (anchors.length > 0) {
    // Use anchors to determine mapping
    // Between each pair of anchors, distribute Hebrew paragraphs to segments
    const sortedAnchors = [...anchors].sort((a, b) => a.segIdx - b.segIdx);

    // Handle paragraphs before first anchor
    if (sortedAnchors[0].segIdx > 0) {
      let heStart = 0;
      const heEnd = sortedAnchors[0].heParaIdx;
      const segEnd = sortedAnchors[0].segIdx;
      for (let si = 0; si < segEnd && heStart < heEnd; si++) {
        if (!result[si]) {
          result[si] = hebrewParagraphs[heStart];
          heStart++;
        }
      }
    }

    // Handle paragraphs between anchors
    for (let a = 0; a < sortedAnchors.length - 1; a++) {
      const segStart = sortedAnchors[a].segIdx + 1;
      const segEnd = sortedAnchors[a + 1].segIdx;
      let heStart = sortedAnchors[a].heParaIdx + 1;
      const heEnd = sortedAnchors[a + 1].heParaIdx;

      for (let si = segStart; si < segEnd && heStart < heEnd; si++) {
        if (!result[si]) {
          result[si] = hebrewParagraphs[heStart];
          heStart++;
        }
      }
    }

    // Handle paragraphs after last anchor
    const lastAnchor = sortedAnchors[sortedAnchors.length - 1];
    let heStart = lastAnchor.heParaIdx + 1;
    for (let si = lastAnchor.segIdx + 1; si < segments.length && heStart < hebrewParagraphs.length; si++) {
      if (!result[si]) {
        result[si] = hebrewParagraphs[heStart];
        heStart++;
      }
    }
  } else {
    // No anchors found - try simple sequential mapping
    // Hebrew paragraphs map 1:1 to segments
    console.log(`  No anchors found - using sequential mapping`);
    for (let i = 0; i < Math.min(hebrewParagraphs.length, segments.length); i++) {
      result[i] = hebrewParagraphs[i];
    }
  }

  return result;
}

/**
 * Alternative simpler approach: since the DOCX has the complete Hebrew source,
 * and each section JSON has segments that correspond to discourses/passages,
 * we can try a more direct approach:
 *
 * For each section, combine ALL Hebrew paragraphs from the DOCX,
 * then split them based on the number of segments needed.
 */
function distributeHebrewEvenly(hebrewParagraphs, numSegments) {
  if (hebrewParagraphs.length <= numSegments) {
    // Fewer paragraphs than segments - assign 1:1 then leave rest empty
    const result = new Array(numSegments).fill('');
    for (let i = 0; i < hebrewParagraphs.length; i++) {
      result[i] = hebrewParagraphs[i];
    }
    return result;
  }

  // More paragraphs than segments - merge groups of paragraphs into segments
  const result = new Array(numSegments).fill('');
  const parasPerSegment = Math.ceil(hebrewParagraphs.length / numSegments);

  for (let si = 0; si < numSegments; si++) {
    const start = si * parasPerSegment;
    const end = Math.min(start + parasPerSegment, hebrewParagraphs.length);
    const chunk = hebrewParagraphs.slice(start, end);
    result[si] = chunk.join(' ');
  }

  return result;
}

/**
 * Smart matching: use existing Hebrew as ground truth anchors, then
 * use the DOCX paragraphs to fill gaps. Where existing Hebrew exists
 * and matches DOCX, keep DOCX version (may be corrected). Where no
 * existing Hebrew, assign from DOCX based on position.
 */
function smartMatch(hebrewParagraphs, segments) {
  const numSegs = segments.length;
  const numParas = hebrewParagraphs.length;

  console.log(`  Segments: ${numSegs}, Hebrew paragraphs: ${numParas}`);

  // Build a similarity index: for each segment with existing Hebrew,
  // find which DOCX paragraph best matches
  const anchors = []; // {segIdx, paraIdx}

  for (let si = 0; si < numSegs; si++) {
    const existingHe = (segments[si].he || '').trim();
    if (!existingHe || existingHe.length < 10) continue;

    // Extract first significant words (skip short connectors)
    const existingStart = existingHe.substring(0, 60);

    let bestMatch = -1;
    let bestScore = 0;

    for (let pi = 0; pi < numParas; pi++) {
      const para = hebrewParagraphs[pi];
      // Check overlap of first N characters
      const commonLen = commonPrefixLength(
        existingStart.replace(/[\s"'״׳]/g, ''),
        para.substring(0, 100).replace(/[\s"'״׳]/g, '')
      );
      if (commonLen > bestScore && commonLen >= 15) {
        bestScore = commonLen;
        bestMatch = pi;
      }
    }

    if (bestMatch >= 0) {
      anchors.push({ segIdx: si, paraIdx: bestMatch });
    }
  }

  console.log(`  Anchors found: ${anchors.length}`);
  for (const a of anchors) {
    console.log(`    seg[${a.segIdx}] -> para[${a.paraIdx}] : "${hebrewParagraphs[a.paraIdx].substring(0, 50)}..."`);
  }

  // Now distribute paragraphs to segments using anchors
  const result = new Array(numSegs).fill('');

  if (anchors.length === 0) {
    // No anchors - sequential assignment, merging if needed
    if (numParas <= numSegs) {
      for (let i = 0; i < numParas; i++) {
        result[i] = hebrewParagraphs[i];
      }
    } else {
      return distributeHebrewEvenly(hebrewParagraphs, numSegs);
    }
    return result;
  }

  // Sort anchors by segment index
  anchors.sort((a, b) => a.segIdx - b.segIdx);

  // Assign anchored segments
  for (const a of anchors) {
    result[a.segIdx] = hebrewParagraphs[a.paraIdx];
  }

  // Fill gaps between anchors
  // For each gap region (segStart..segEnd exclusive), assign paragraphs (paraStart..paraEnd exclusive)
  const regions = [];

  // Before first anchor
  if (anchors[0].segIdx > 0 && anchors[0].paraIdx > 0) {
    regions.push({
      segStart: 0, segEnd: anchors[0].segIdx,
      paraStart: 0, paraEnd: anchors[0].paraIdx
    });
  }

  // Between anchors
  for (let i = 0; i < anchors.length - 1; i++) {
    const segStart = anchors[i].segIdx + 1;
    const segEnd = anchors[i + 1].segIdx;
    const paraStart = anchors[i].paraIdx + 1;
    const paraEnd = anchors[i + 1].paraIdx;

    if (segStart < segEnd && paraStart < paraEnd) {
      regions.push({ segStart, segEnd, paraStart, paraEnd });
    }
  }

  // After last anchor
  const lastAnchor = anchors[anchors.length - 1];
  if (lastAnchor.segIdx < numSegs - 1 && lastAnchor.paraIdx < numParas - 1) {
    regions.push({
      segStart: lastAnchor.segIdx + 1, segEnd: numSegs,
      paraStart: lastAnchor.paraIdx + 1, paraEnd: numParas
    });
  }

  // Fill each region
  for (const r of regions) {
    const segCount = r.segEnd - r.segStart;
    const paraCount = r.paraEnd - r.paraStart;
    const parasSlice = hebrewParagraphs.slice(r.paraStart, r.paraEnd);

    if (paraCount <= segCount) {
      // Fewer or equal paragraphs - assign 1:1
      for (let i = 0; i < paraCount; i++) {
        result[r.segStart + i] = parasSlice[i];
      }
    } else {
      // More paragraphs - merge groups
      const merged = distributeHebrewEvenly(parasSlice, segCount);
      for (let i = 0; i < segCount; i++) {
        result[r.segStart + i] = merged[i];
      }
    }
  }

  return result;
}

function commonPrefixLength(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

async function main() {
  console.log('=== Ruzin Gineezin Hebrew Fix Script ===\n');

  // Step 1: Read existing JSON files
  console.log('Step 1: Reading existing JSON files...');
  const sectionData = {};
  let totalSegments = 0;
  let totalWithHebrew = 0;

  for (const secNum of SECTION_NUMBERS) {
    const filePath = path.join(READER_DIR, `section-${secNum}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    sectionData[secNum] = data;
    const withHe = data.segments.filter(s => s.he && s.he.trim()).length;
    totalSegments += data.segments.length;
    totalWithHebrew += withHe;
    console.log(`  Section ${secNum}: ${data.segments.length} segments, ${withHe} with Hebrew`);
  }
  console.log(`  Total: ${totalSegments} segments, ${totalWithHebrew} with Hebrew\n`);

  // Step 2: Extract Hebrew from DOCX
  console.log('Step 2: Extracting Hebrew from DOCX...');
  const docxResult = await mammoth.convertToHtml({ path: DOCX_PATH });
  console.log(`  DOCX HTML length: ${docxResult.value.length}`);

  // Also get raw text for analysis
  const textResult = await mammoth.extractRawText({ path: DOCX_PATH });
  console.log(`  DOCX raw text length: ${textResult.value.length}`);

  // Parse HTML to get paragraphs
  const $ = cheerio.load(docxResult.value);
  const allParagraphs = [];
  $('p').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      allParagraphs.push(text);
    }
  });
  console.log(`  Total paragraphs extracted: ${allParagraphs.length}`);

  // Debug: show first 30 paragraphs
  console.log('\n  First 30 paragraphs from DOCX:');
  for (let i = 0; i < Math.min(30, allParagraphs.length); i++) {
    const p = allParagraphs[i];
    const isHe = isHebrew(p);
    console.log(`    [${i}] ${isHe ? 'HE' : 'EN'} (${p.length} chars): "${p.substring(0, 80)}${p.length > 80 ? '...' : ''}"`);
  }

  // Step 3: Group paragraphs by section using markers
  console.log('\nStep 3: Grouping paragraphs by section...');

  // Find section boundaries in the paragraph list
  const sectionBoundaries = []; // { secNum, startIdx }
  for (let i = 0; i < allParagraphs.length; i++) {
    const para = allParagraphs[i];
    for (const [secNum, pattern] of Object.entries(SECTION_MARKERS)) {
      if (pattern.test(para) && para.length < 300) {
        sectionBoundaries.push({ secNum: parseInt(secNum), startIdx: i });
        console.log(`  Found section ${secNum} at para[${i}]: "${para.substring(0, 80)}..."`);
      }
    }
  }

  // If no section boundaries found, treat everything as one section
  // and try to match using existing Hebrew content
  if (sectionBoundaries.length === 0) {
    console.log('  WARNING: No section boundaries found in DOCX!');
    console.log('  Trying alternative approach: matching all Hebrew paragraphs...');

    // Collect all Hebrew-only paragraphs
    const hebrewParas = allParagraphs.filter(p => isHebrew(p) && p.length > 10);
    console.log(`  Found ${hebrewParas.length} Hebrew paragraphs total`);

    // Show all paragraphs for debugging
    console.log('\n  ALL paragraphs from DOCX:');
    for (let i = 0; i < allParagraphs.length; i++) {
      const p = allParagraphs[i];
      console.log(`    [${i}] (${p.length} chars): "${p.substring(0, 100)}${p.length > 100 ? '...' : ''}"`);
    }

    // Try matching all Hebrew paragraphs against all segments across all sections
    let heIdx = 0;
    for (const secNum of SECTION_NUMBERS) {
      const data = sectionData[secNum];
      console.log(`\n  Processing section ${secNum} (${data.segments.length} segments)...`);

      for (let si = 0; si < data.segments.length && heIdx < hebrewParas.length; si++) {
        const existingHe = (data.segments[si].he || '').trim();
        if (existingHe) {
          // Try to find this in the Hebrew paragraphs to advance the pointer
          for (let search = heIdx; search < Math.min(heIdx + 5, hebrewParas.length); search++) {
            const cpLen = commonPrefixLength(
              existingHe.replace(/[\s"'״׳]/g, '').substring(0, 40),
              hebrewParas[search].replace(/[\s"'״׳]/g, '').substring(0, 40)
            );
            if (cpLen >= 15) {
              data.segments[si].he = hebrewParas[search];
              heIdx = search + 1;
              break;
            }
          }
        } else {
          // No existing Hebrew - assign next available
          data.segments[si].he = hebrewParas[heIdx];
          heIdx++;
        }
      }
    }
  } else {
    // Sort boundaries by position in document
    sectionBoundaries.sort((a, b) => a.startIdx - b.startIdx);

    // Extract Hebrew paragraphs for each section
    for (let b = 0; b < sectionBoundaries.length; b++) {
      const secNum = sectionBoundaries[b].secNum;
      const startIdx = sectionBoundaries[b].startIdx + 1; // Skip the header itself
      const endIdx = b + 1 < sectionBoundaries.length
        ? sectionBoundaries[b + 1].startIdx
        : allParagraphs.length;

      // Get Hebrew paragraphs in this section range
      const sectionParas = [];
      for (let i = startIdx; i < endIdx; i++) {
        const p = allParagraphs[i];
        if (isHebrew(p) && p.length > 10) {
          sectionParas.push(cleanHebrew(p));
        }
      }

      console.log(`  Section ${secNum}: ${sectionParas.length} Hebrew paragraphs (paras ${startIdx}-${endIdx - 1})`);

      if (!sectionData[secNum]) {
        console.log(`  WARNING: No JSON file for section ${secNum}, skipping`);
        continue;
      }

      const data = sectionData[secNum];
      const segments = data.segments;

      // Smart matching
      console.log(`  Matching ${sectionParas.length} Hebrew paragraphs to ${segments.length} segments...`);
      const matched = smartMatch(sectionParas, segments);

      // Apply matched Hebrew
      let filled = 0;
      for (let si = 0; si < segments.length; si++) {
        if (matched[si] && matched[si].trim()) {
          segments[si].he = matched[si];
          filled++;
        }
      }
      console.log(`  Filled ${filled}/${segments.length} segments with Hebrew`);
    }
  }

  // Step 4: Write updated JSON files
  console.log('\nStep 4: Writing updated JSON files...');
  let grandTotalFilled = 0;
  let grandTotal = 0;

  for (const secNum of SECTION_NUMBERS) {
    const data = sectionData[secNum];
    const filePath = path.join(READER_DIR, `section-${secNum}.json`);

    // Count final stats
    const withHe = data.segments.filter(s => s.he && s.he.trim()).length;
    grandTotalFilled += withHe;
    grandTotal += data.segments.length;

    console.log(`  Section ${secNum}: ${withHe}/${data.segments.length} segments now have Hebrew`);

    // Write with nice formatting
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  console.log(`\nDone! ${grandTotalFilled}/${grandTotal} total segments now have Hebrew`);
  console.log(`(Was ${totalWithHebrew}/${totalSegments} before)`);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
