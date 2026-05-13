/**
 * Fix Hebrew-English sync in Likutay Tefilos (and other books).
 *
 * Problem: English text assigned to wrong Hebrew segments.
 * Fix: Re-read the HTML source files which have paired Hebrew+English,
 * match each pair to the correct JSON segment by comparing Hebrew text,
 * and reassign the English accordingly.
 */
const fs = require('fs');
const path = require('path');

const HTML_DIR = 'C:/Users/Pettek/Documents/Translations/Likutay Tefilos';
const READER_DIR = path.join(__dirname, '../public/reader/likutay-tefilos');

function stripHtml(html) {
  return html
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

function normalizeHebrew(text) {
  return text
    .replace(/[\u0591-\u05C7]/g, '') // Remove nikud
    .replace(/[:"״׳,.\-–—;!?()[\]{}]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function extractParagraphs(htmlContent) {
  const paragraphs = [];
  const parts = htmlContent.split(/<div class="para">/);

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];

    // Extract English
    const pMatch = block.match(/<p>([\s\S]*?)<\/p>/);
    if (!pMatch) continue;
    let englishHtml = pMatch[1];
    // Remove Hebrew toggle button
    englishHtml = englishHtml.replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/, '');
    const english = stripHtml(englishHtml).trim();
    if (!english) continue;

    // Extract Hebrew
    const hebMatch = block.match(/<div class="heb-text"[^>]*>([\s\S]*?)<\/div>/);
    const hebrew = hebMatch ? stripHtml(hebMatch[1]).trim() : '';

    paragraphs.push({ english, hebrew });
  }
  return paragraphs;
}

function parseFilename(filename) {
  if (filename.includes('hakdama')) return { part: 1, prayer: 0 };

  // Prayer number from filename
  const prayerMatch = filename.match(/prayer\s*(\d+)/i) || filename.match(/_(\d+)_prayer/);
  if (prayerMatch) {
    const num = parseInt(prayerMatch[1], 10);
    // Determine part from filename
    if (filename.includes('_II_')) return { part: 2, prayer: num };
    return { part: 1, prayer: num };
  }

  // Try just extracting the number
  const numMatch = filename.match(/tefilos_(\d+)/);
  if (numMatch) return { part: 1, prayer: parseInt(numMatch[1], 10) };

  return null;
}

function main() {
  const htmlFiles = fs.readdirSync(HTML_DIR).filter(f => f.endsWith('.html'));
  console.log(`Found ${htmlFiles.length} HTML files\n`);

  let totalFixed = 0;
  let totalSegments = 0;

  for (const htmlFile of htmlFiles) {
    const mapping = parseFilename(htmlFile);
    if (!mapping) {
      console.log(`  SKIP: ${htmlFile} - can't parse filename`);
      continue;
    }

    const { part, prayer } = mapping;
    const jsonPath = path.join(READER_DIR, `part-${part}`, `prayer-${prayer}.json`);

    if (!fs.existsSync(jsonPath)) {
      console.log(`  SKIP: ${htmlFile} -> no JSON at part-${part}/prayer-${prayer}.json`);
      continue;
    }

    // Read HTML and extract paired paragraphs
    const htmlContent = fs.readFileSync(path.join(HTML_DIR, htmlFile), 'utf8');
    const paragraphs = extractParagraphs(htmlContent);

    if (paragraphs.length === 0) {
      console.log(`  SKIP: ${htmlFile} - no paragraphs`);
      continue;
    }

    // Read JSON
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const segments = data.segments;
    totalSegments += segments.length;

    // CLEAR all existing English first
    for (const seg of segments) {
      delete seg.en;
    }

    // Match each HTML paragraph to the correct segment by Hebrew comparison
    let matched = 0;

    for (const para of paragraphs) {
      if (!para.hebrew || !para.english) continue;

      const paraHeb = normalizeHebrew(para.hebrew);
      if (paraHeb.length < 5) continue;

      // Find the segment whose Hebrew starts the same way
      let bestIdx = -1;
      let bestLen = 0;

      for (let j = 0; j < segments.length; j++) {
        const segHeb = normalizeHebrew(segments[j].he || segments[j].he_nikud || '');
        if (!segHeb) continue;

        // Compare first N characters
        const compareLen = Math.min(30, paraHeb.length, segHeb.length);
        if (compareLen < 5) continue;

        if (paraHeb.substring(0, compareLen) === segHeb.substring(0, compareLen)) {
          if (compareLen > bestLen) {
            bestLen = compareLen;
            bestIdx = j;
          }
        }
      }

      if (bestIdx >= 0) {
        segments[bestIdx].en = para.english;
        matched++;
      }
    }

    // For paragraphs without Hebrew in the HTML, try sequential assignment
    // to content segments (not headers) that still lack English
    const unmatchedEnglish = paragraphs.filter(p => {
      if (!p.english) return false;
      if (p.hebrew && normalizeHebrew(p.hebrew).length >= 5) return false; // Already handled above
      return !segments.some(s => s.en === p.english);
    });

    if (unmatchedEnglish.length > 0) {
      // Find content segments without English (skip short header segments)
      const emptyContentSegs = segments
        .map((s, i) => ({ seg: s, idx: i }))
        .filter(({ seg }) => !seg.en && (seg.he || seg.he_nikud || '').length > 20);

      for (let i = 0; i < unmatchedEnglish.length && i < emptyContentSegs.length; i++) {
        emptyContentSegs[i].seg.en = unmatchedEnglish[i].english;
        matched++;
      }
    }

    if (matched > 0) {
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      totalFixed++;
      console.log(`  FIXED: ${htmlFile} -> part-${part}/prayer-${prayer}: ${matched}/${segments.length} segments synced`);
    } else {
      console.log(`  WARN: ${htmlFile} -> 0 matches`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files fixed: ${totalFixed}`);
  console.log(`Total segments: ${totalSegments}`);
}

main();
