/**
 * integrate-lm-english.cjs
 *
 * Extracts English translations from Astro teaching pages and injects them
 * into the Likutay Moharan reader JSON files.
 *
 * Source: src/pages/teachings/likutay-moharan-volume-{1,2}-torah-{N}.astro
 * Target: public/reader/likutay-moharan/part-{1,2}/torah-{N}.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEACHINGS_DIR = path.join(ROOT, 'src', 'pages', 'teachings');
const READER_DIR = path.join(ROOT, 'public', 'reader', 'likutay-moharan');

let totalUpdated = 0;
let totalSkipped = 0;
let totalErrors = 0;

function stripHtml(html) {
  // Replace <br> and <br/> with spaces
  let text = html.replace(/<br\s*\/?>/gi, ' ');
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#8211;/g, '\u2013');
  text = text.replace(/&#8212;/g, '\u2014');
  text = text.replace(/&#8216;/g, '\u2018');
  text = text.replace(/&#8217;/g, '\u2019');
  text = text.replace(/&#8220;/g, '\u201C');
  text = text.replace(/&#8221;/g, '\u201D');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function extractParagraphs(content) {
  // Find the content-text div
  const match = content.match(/<div class="content-text">([\s\S]*?)<\/div>/);
  if (!match) return null;

  const innerHtml = match[1];

  // Extract all <p>...</p> blocks
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs = [];
  let m;
  while ((m = pRegex.exec(innerHtml)) !== null) {
    const text = stripHtml(m[1]);
    if (text.length > 0) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

function isTitle(text) {
  // Title paragraphs are typically short and contain "Likutay Moharan" with a number
  if (text.length > 200) return false;
  if (/^Likutay Moharan\s/i.test(text)) return true;
  if (/^Likutey Moharan\s/i.test(text)) return true;
  // Also check for just the number reference like "1:1" or "Torah 5"
  if (/^(?:Torah\s+\d+|LM\s+\d)/i.test(text)) return true;
  return false;
}

function isSubtitle(text) {
  // Some files have a second paragraph that's just a subtitle/name like "BeChatzotzrot VeKol Shofar"
  // These are short, contain no Hebrew, and appear right after title
  if (text.length > 150) return false;
  if (/^\[.*\]$/.test(text)) return true; // [In the language of...]
  // Very short lines that are just transliterated Hebrew names
  if (text.length < 80 && !/[.;,]/.test(text) && !/\b(the|and|of|is|for|that|this|but|which)\b/i.test(text)) return true;
  return false;
}

function processVolume(volumeNum) {
  const partDir = path.join(READER_DIR, `part-${volumeNum}`);
  const maxTorah = volumeNum === 1 ? 286 : 125;

  let volUpdated = 0;
  let volSkipped = 0;
  let volErrors = 0;

  for (let torahNum = 1; torahNum <= maxTorah; torahNum++) {
    // Try both naming conventions for Astro files
    let astroFile = path.join(TEACHINGS_DIR, `likutay-moharan-volume-${volumeNum}-torah-${torahNum}.astro`);
    if (!fs.existsSync(astroFile)) {
      // Some volume-2 files lack the dash (torah1, torah2)
      astroFile = path.join(TEACHINGS_DIR, `likutay-moharan-volume-${volumeNum}-torah${torahNum}.astro`);
    }

    const jsonFile = path.join(partDir, `torah-${torahNum}.json`);

    if (!fs.existsSync(astroFile)) {
      console.log(`  SKIP: No Astro file for vol ${volumeNum} torah ${torahNum}`);
      volSkipped++;
      continue;
    }

    if (!fs.existsSync(jsonFile)) {
      console.log(`  SKIP: No JSON file for vol ${volumeNum} torah ${torahNum}`);
      volSkipped++;
      continue;
    }

    try {
      // Read the Astro file
      const astroContent = fs.readFileSync(astroFile, 'utf-8');
      const allParagraphs = extractParagraphs(astroContent);

      if (!allParagraphs || allParagraphs.length === 0) {
        console.log(`  SKIP: No paragraphs extracted from vol ${volumeNum} torah ${torahNum}`);
        volSkipped++;
        continue;
      }

      // Filter out title and subtitle paragraphs
      let englishParas = [...allParagraphs];

      // Remove leading title paragraphs
      while (englishParas.length > 1 && (isTitle(englishParas[0]) || isSubtitle(englishParas[0]))) {
        englishParas.shift();
      }

      // For files with a third leading paragraph that's bracketed context
      while (englishParas.length > 1 && /^\[.*\]\s*$/.test(englishParas[0]) && englishParas[0].length < 200) {
        englishParas.shift();
      }

      if (englishParas.length === 0) {
        console.log(`  SKIP: No English content after filtering titles for vol ${volumeNum} torah ${torahNum}`);
        volSkipped++;
        continue;
      }

      // Read the JSON file
      const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
      const segments = jsonData.segments;

      if (!segments || segments.length === 0) {
        console.log(`  SKIP: No segments in JSON for vol ${volumeNum} torah ${torahNum}`);
        volSkipped++;
        continue;
      }

      // Align English paragraphs to Hebrew segments
      const numEn = englishParas.length;
      const numHe = segments.length;

      if (numEn <= numHe) {
        // Put one English paragraph per segment (first N segments get English)
        for (let i = 0; i < numEn; i++) {
          segments[i].en = englishParas[i];
        }
      } else {
        // More English paragraphs than Hebrew segments
        // Distribute: first (numHe - 1) segments get one paragraph each
        // Last segment gets all remaining paragraphs merged
        for (let i = 0; i < numHe - 1; i++) {
          segments[i].en = englishParas[i];
        }
        // Merge remaining paragraphs into last segment
        const remaining = englishParas.slice(numHe - 1);
        segments[numHe - 1].en = remaining.join('\n\n');
      }

      // Set hasEnglish flag
      jsonData.hasEnglish = true;

      // Write back JSON
      fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2), 'utf-8');

      const coverage = numEn <= numHe
        ? `${numEn}/${numHe} segments`
        : `${numEn} paras -> ${numHe} segments (merged)`;
      console.log(`  OK: vol ${volumeNum} torah ${torahNum} - ${coverage}`);
      volUpdated++;

    } catch (err) {
      console.error(`  ERROR: vol ${volumeNum} torah ${torahNum}: ${err.message}`);
      volErrors++;
    }
  }

  console.log(`\nVolume ${volumeNum} summary: ${volUpdated} updated, ${volSkipped} skipped, ${volErrors} errors\n`);
  totalUpdated += volUpdated;
  totalSkipped += volSkipped;
  totalErrors += volErrors;
}

console.log('=== Integrating English translations into Likutay Moharan reader JSON ===\n');

console.log('--- Volume 1 (Part 1) ---');
processVolume(1);

console.log('--- Volume 2 (Part 2) ---');
processVolume(2);

console.log('=== TOTAL ===');
console.log(`Updated: ${totalUpdated}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`);
