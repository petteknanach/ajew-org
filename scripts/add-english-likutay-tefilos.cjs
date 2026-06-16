const fs = require('fs');
const path = require('path');

const HTML_DIR = '/mnt/c/Users/Pettek/Documents/Translations/Likutay Tefilos';
const READER_DIR = path.join(__dirname, '../public/reader/likutay-tefilos');

/**
 * Strip HTML tags and decode HTML entities, returning plain text.
 */
function stripHtml(html) {
  let text = html
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&middot;/g, '\u00B7')
    .replace(/&sect;/g, '\u00A7')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&hellip;/g, '\u2026')
    // Decode numeric HTML entities (&#xHEX; and &#DEC;)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

/**
 * Extract paragraphs from HTML file.
 * Each paragraph has English text and optionally Hebrew text.
 * Returns array of { english, hebrew } objects.
 */
function extractParagraphs(htmlContent) {
  const paragraphs = [];

  // Find all <div class="para"> blocks
  const paraRegex = /<div class="para">([\s\S]*?)<\/div>\s*<\/div>/g;
  // Alternative: match the pattern more carefully
  // Each para block contains: <p>...English...</p> and <div class="heb-text" id="pN">...Hebrew...</div>

  // Split by <div class="para"> markers
  const parts = htmlContent.split(/<div class="para">/);

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];

    // Extract English from <p> tag
    const pMatch = block.match(/<p>([\s\S]*?)<\/p>/);
    if (!pMatch) continue;

    let englishHtml = pMatch[1];
    // Remove the Hebrew toggle button span at the start
    englishHtml = englishHtml.replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/, '');

    const english = stripHtml(englishHtml).trim();
    if (!english) continue;

    // Extract Hebrew from <div class="heb-text">
    const hebMatch = block.match(/<div class="heb-text"[^>]*>([\s\S]*?)<\/div>/);
    const hebrew = hebMatch ? stripHtml(hebMatch[1]).trim() : '';

    paragraphs.push({ english, hebrew });
  }

  return paragraphs;
}

/**
 * Normalize Hebrew text for comparison: remove nikud, whitespace differences
 */
function normalizeHebrew(text) {
  return text
    // Remove nikud (Hebrew diacritics U+0591-U+05C7)
    .replace(/[\u0591-\u05C7]/g, '')
    // Remove punctuation
    .replace(/[:"״׳,.\-–—;!?()[\]{}]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compare two Hebrew strings by checking if the first N characters match.
 */
function hebrewMatch(a, b, minChars = 20) {
  const na = normalizeHebrew(a);
  const nb = normalizeHebrew(b);
  if (!na || !nb) return false;

  const len = Math.min(minChars, na.length, nb.length);
  if (len < 5) return false;

  return na.substring(0, len) === nb.substring(0, len);
}

/**
 * Parse an HTML filename to determine which part and prayer number it maps to.
 * Returns { part, prayer } or null if cannot be determined.
 */
function parseFilename(filename) {
  // hakdama -> part 1, prayer 1
  if (filename.includes('hakdama')) {
    return { part: 1, prayer: 1 };
  }

  // Part II files: likutay_tefilos_II_37_purim.html -> part 3 (reader), prayer 37
  const part2Match = filename.match(/likutay_tefilos_II_(\d+)/);
  if (part2Match) {
    return { part: 3, prayer: parseInt(part2Match[1], 10) };
  }

  // Part I explicit: likutay_tefilos_I_10_purim.html -> part 2 (reader), prayer 10
  const part1ExplicitMatch = filename.match(/likutay_tefilos_I_(\d+)/);
  if (part1ExplicitMatch) {
    return { part: 2, prayer: parseInt(part1ExplicitMatch[1], 10) };
  }

  // Regular numbered: likutay_tefilos_NN_prayerN.html -> part 2, prayer N
  const regularMatch = filename.match(/prayer\s*(\d+)/i);
  if (regularMatch) {
    return { part: 2, prayer: parseInt(regularMatch[1], 10) };
  }

  return null;
}

function main() {
  // Read all HTML files
  const htmlFiles = fs.readdirSync(HTML_DIR).filter(f => f.endsWith('.html'));
  console.log(`Found ${htmlFiles.length} HTML translation files`);

  let totalUpdated = 0;
  let totalSegmentsWithEnglish = 0;
  let totalSegments = 0;
  const results = [];

  for (const htmlFile of htmlFiles) {
    const mapping = parseFilename(htmlFile);
    if (!mapping) {
      console.log(`  SKIP: Cannot determine prayer number for ${htmlFile}`);
      continue;
    }

    const { part, prayer } = mapping;
    const jsonPath = path.join(READER_DIR, `part-${part}`, `prayer-${prayer}.json`);

    if (!fs.existsSync(jsonPath)) {
      console.log(`  SKIP: No reader JSON found at part-${part}/prayer-${prayer}.json for ${htmlFile}`);
      continue;
    }

    // Read and parse HTML
    const htmlContent = fs.readFileSync(path.join(HTML_DIR, htmlFile), 'utf8');
    const paragraphs = extractParagraphs(htmlContent);

    if (paragraphs.length === 0) {
      console.log(`  SKIP: No English paragraphs extracted from ${htmlFile}`);
      continue;
    }

    // Read reader JSON
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const segments = data.segments;
    totalSegments += segments.length;

    // Strategy 1: Try to match by Hebrew text comparison
    let matchedCount = 0;
    const usedSegments = new Set();

    for (const para of paragraphs) {
      if (!para.hebrew) {
        // No Hebrew in HTML paragraph, skip matching
        continue;
      }

      // Find matching segment by Hebrew
      let bestMatch = -1;
      let bestScore = 0;

      for (let j = 0; j < segments.length; j++) {
        if (usedSegments.has(j)) continue;

        if (hebrewMatch(para.hebrew, segments[j].he, 30)) {
          bestMatch = j;
          break; // Take first match since order should be preserved
        }
      }

      if (bestMatch >= 0) {
        segments[bestMatch].en = para.english;
        usedSegments.add(bestMatch);
        matchedCount++;
        totalSegmentsWithEnglish++;
      }
    }

    // Strategy 2: For paragraphs without Hebrew match, try distributing by order
    // (Some HTML paragraphs might not have a heb-text div)
    const unmatchedParas = paragraphs.filter((p, i) => {
      // Check if this paragraph's English was already assigned
      return !segments.some(s => s.en === p.english);
    });

    if (unmatchedParas.length > 0 && matchedCount === 0) {
      // Fallback: distribute English paragraphs across segments in order
      // Skip segments that look like date headers (very short Hebrew text)
      const contentSegments = segments.filter(s => s.he.length > 30);
      const startIdx = segments.indexOf(contentSegments[0]);

      if (startIdx >= 0) {
        for (let i = 0; i < unmatchedParas.length && i < contentSegments.length; i++) {
          const segIdx = segments.indexOf(contentSegments[i]);
          if (segIdx >= 0 && !segments[segIdx].en) {
            segments[segIdx].en = unmatchedParas[i].english;
            matchedCount++;
            totalSegmentsWithEnglish++;
          }
        }
      }
    }

    if (matchedCount > 0) {
      // Set hasEnglish flag
      data.hasEnglish = true;

      // Write updated JSON
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      totalUpdated++;

      results.push({
        file: htmlFile,
        part,
        prayer,
        htmlParagraphs: paragraphs.length,
        jsonSegments: segments.length,
        matched: matchedCount,
        percentage: Math.round((matchedCount / segments.length) * 100)
      });

      console.log(`  OK: ${htmlFile} -> part-${part}/prayer-${prayer}.json: ${matchedCount}/${segments.length} segments (${Math.round((matchedCount / segments.length) * 100)}%)`);
    } else {
      console.log(`  WARN: ${htmlFile} -> No English matched to any segment`);
    }
  }

  // Update index.json files for each part that was modified
  const partsModified = new Set(results.map(r => r.part));

  for (const partNum of partsModified) {
    const indexPath = path.join(READER_DIR, `part-${partNum}`, 'index.json');
    if (!fs.existsSync(indexPath)) continue;

    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const modifiedPrayers = results.filter(r => r.part === partNum).map(r => r.prayer);

    let indexUpdated = false;
    for (const torah of indexData.torahs) {
      if (modifiedPrayers.includes(torah.number)) {
        torah.hasEnglish = true;
        indexUpdated = true;
      }
    }

    if (indexUpdated) {
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf8');
      console.log(`  Updated index.json for part-${partNum}`);
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`HTML files processed: ${htmlFiles.length}`);
  console.log(`Prayers updated with English: ${totalUpdated}`);
  console.log(`Total segments with English: ${totalSegmentsWithEnglish}`);
  console.log(`Index files updated: ${partsModified.size}`);

  if (results.length > 0) {
    console.log('\nDetailed results:');
    for (const r of results) {
      console.log(`  Part ${r.part}, Prayer ${r.prayer}: ${r.matched}/${r.jsonSegments} segments (${r.percentage}%) [from ${r.file}]`);
    }
  }
}

main();
