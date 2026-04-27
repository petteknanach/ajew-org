/**
 * Import English translations for Alim LiTrufa letters 1-88
 * Source: HTML files from C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ullim litrufa 1-88/
 * Target: public/reader/alim-litrufa/ JSON files
 *
 * Mapping:
 *   HTML letters 1-8  => Part 1, JSON letters 2-9 (letter-1 is year header)
 *   HTML letters 9-88 => Part 2, JSON letters 2-81 (letter-1 is year header)
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Ullim litrufa 1-88';
const TARGET_DIR = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/alim-litrufa';

// Map HTML letter number to { part, jsonLetter }
function getMapping(htmlNum) {
  if (htmlNum >= 1 && htmlNum <= 8) {
    return { part: 1, jsonLetter: htmlNum + 1 };
  } else if (htmlNum >= 9 && htmlNum <= 88) {
    return { part: 2, jsonLetter: htmlNum - 7 };
  }
  return null;
}

// Find the HTML file for a given letter number (handles "(1)" suffix variants)
function findHtmlFile(num) {
  const padded = num.toString().padStart(2, '0');
  const candidates = [
    `ullim_letroofah_letter_${padded}.html`,
    `ullim_letroofah_letter_${padded} (1).html`,
  ];
  for (const name of candidates) {
    const fullPath = path.join(SOURCE_DIR, name);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

// Strip HTML tags and decode entities, returning plain text
function stripHtml(html) {
  let text = html;
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  // Replace <br> with newline
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Remove all tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&rsquo;/g, '\u2019');
  text = text.replace(/&lsquo;/g, '\u2018');
  text = text.replace(/&rdquo;/g, '\u201D');
  text = text.replace(/&ldquo;/g, '\u201C');
  text = text.replace(/&hellip;/g, '...');
  text = text.replace(/&#\d+;/g, (m) => String.fromCharCode(parseInt(m.slice(2, -1))));
  // Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();
  return text;
}

// Extract English paragraphs from an HTML file
// Returns an array of text strings (one per logical paragraph/block)
function extractEnglishParagraphs(htmlContent) {
  const paragraphs = [];

  // Remove everything before <body>
  let body = htmlContent;
  const bodyStart = body.indexOf('<body');
  if (bodyStart >= 0) body = body.substring(bodyStart);

  // Remove translator-summary and translator-section (these are commentary, not translation)
  body = body.replace(/<div class="translator-summary">[\s\S]*$/i, '');
  body = body.replace(/<div class="translator-section">[\s\S]*$/i, '');

  // Remove the ms-footer
  body = body.replace(/<div class="ms-footer">[\s\S]*?<\/div>/gi, '');

  // Remove series-header (book title, not content)
  body = body.replace(/<div class="series-header">[\s\S]*?<\/div>\s*<\/div>/gi, '');

  // Remove letter-heading (LETTER ONE, etc. - metadata, not translation text)
  body = body.replace(/<div class="letter-heading">[\s\S]*?<\/div>\s*<\/div>/gi, '');

  // Remove section-banner (e.g., "Letters of Moharnat")
  body = body.replace(/<div class="section-banner">[\s\S]*?<\/div>\s*<\/div>/gi, '');

  // Remove ornament divs
  body = body.replace(/<div class="ornament">[\s\S]*?<\/div>/gi, '');

  // Now extract text blocks from the remaining content
  // We want to capture: editorial-note content, bezras-hashem, addressee, letter-body paragraphs
  // Strategy: find all <p>, <div class="editorial-note">, <div class="bezras-hashem">,
  // <div class="addressee">, <span class="ps-label">, <div class="standalone-greeting">,
  // and other content blocks

  // First, let's extract content from specific sections in order

  // 1. Editorial note
  const editorialMatch = body.match(/<div class="editorial-note">([\s\S]*?)<\/div>\s*(?:<\/div>)?/i);
  if (editorialMatch) {
    // Extract the editorial note text, removing the label span
    let editText = editorialMatch[1];
    editText = editText.replace(/<span class="label">[^<]*<\/span>/gi, '');
    // Also extract source-note if present
    const sourceNoteMatch = editText.match(/<div class="source-note">([\s\S]*?)<\/div>/i);
    let sourceNote = '';
    if (sourceNoteMatch) {
      sourceNote = stripHtml(sourceNoteMatch[1]);
      editText = editText.replace(/<div class="source-note">[\s\S]*?<\/div>/gi, '');
    }
    const mainEdit = stripHtml(editText);
    if (mainEdit) paragraphs.push(mainEdit);
    if (sourceNote) paragraphs.push(sourceNote);
  }

  // 2. Bezras Hashem
  const bezrasMatch = body.match(/<div class="bezras-hashem">([\s\S]*?)<\/div>/i);
  if (bezrasMatch) {
    const text = stripHtml(bezrasMatch[1]);
    if (text) paragraphs.push(text);
  }

  // 3. Addressee
  const addresseeMatch = body.match(/<div class="addressee">([\s\S]*?)<\/div>/i);
  if (addresseeMatch) {
    let addrText = addresseeMatch[1];
    addrText = addrText.replace(/<span class="label">[^<]*<\/span>/gi, '');
    const text = stripHtml(addrText);
    if (text) paragraphs.push(text);
  }

  // 4. Letter body - extract all paragraphs, closings, ps-labels, etc.
  const letterBodyMatch = body.match(/<div class="letter-body">([\s\S]*?)<\/div>\s*(?:<\/div>|\s*$)/i);
  if (letterBodyMatch) {
    extractBodyParagraphs(letterBodyMatch[1], paragraphs);
  } else {
    // Some letters may not have letter-body div, try to get content after addressee/editorial
    // This is a fallback
  }

  return paragraphs;
}

function extractBodyParagraphs(bodyHtml, paragraphs) {
  // Split into logical blocks by finding <p>, <div class="closing">, <span class="ps-label">,
  // <div class="standalone-greeting">, etc.

  // Strategy: use regex to find all top-level content elements
  // We'll process the HTML sequentially

  const blocks = [];

  // Match various block-level elements and inline labels
  const regex = /<(?:p|div|span)[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/(?:p|div|span)>|<p[^>]*>([\s\S]*?)<\/p>/gi;

  // Actually, let's use a simpler approach: split by <p> tags and other block elements
  // Remove nested divs first (closing, standalone-greeting become flattened)

  let html = bodyHtml;

  // Extract ps-label spans as paragraph markers
  // They appear as standalone spans before paragraphs
  html = html.replace(/<span class="ps-label">([\s\S]*?)<\/span>/gi, '<p class="ps-marker">$1</p>');

  // Extract standalone-greeting divs
  html = html.replace(/<div class="standalone-greeting">([\s\S]*?)<\/div>/gi, '<p class="standalone">$1</p>');

  // Extract shimshon-block, zikarayon-block and similar named blocks
  html = html.replace(/<div class="[a-z-]+-block">([\s\S]*?)<\/div>/gi, '$1');

  // Flatten closing divs
  html = html.replace(/<div class="closing">([\s\S]*?)<\/div>/gi, '$1');

  // Remove ornament divs
  html = html.replace(/<div class="ornament">[\s\S]*?<\/div>/gi, '');

  // Now extract all <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text && text.length > 0) {
      paragraphs.push(text);
    }
  }
}

// Main processing
function main() {
  let totalUpdated = 0;
  let totalSegments = 0;
  let totalFiles = 0;
  let skipped = [];
  let results = [];

  for (let htmlNum = 1; htmlNum <= 88; htmlNum++) {
    const htmlFile = findHtmlFile(htmlNum);
    if (!htmlFile) {
      skipped.push(`Letter ${htmlNum}: HTML file not found`);
      continue;
    }

    const mapping = getMapping(htmlNum);
    if (!mapping) {
      skipped.push(`Letter ${htmlNum}: No mapping`);
      continue;
    }

    const jsonPath = path.join(TARGET_DIR, `part-${mapping.part}`, `letter-${mapping.jsonLetter}.json`);
    if (!fs.existsSync(jsonPath)) {
      skipped.push(`Letter ${htmlNum}: JSON not found at ${jsonPath}`);
      continue;
    }

    // Read HTML and extract paragraphs
    const htmlContent = fs.readFileSync(htmlFile, 'utf-8');
    const englishParas = extractEnglishParagraphs(htmlContent);

    // Read JSON
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const segments = jsonData.segments;

    if (!segments || segments.length === 0) {
      skipped.push(`Letter ${htmlNum}: No segments in JSON`);
      continue;
    }

    // Match English paragraphs to Hebrew segments
    // Strategy: assign English paragraphs sequentially to segments that don't have English yet
    // If there are more English paragraphs than segments, combine the extras into the last matching segment
    // If there are fewer, just fill what we can

    let segmentsUpdated = 0;
    const enCount = englishParas.length;
    const segCount = segments.length;

    if (enCount === 0) {
      skipped.push(`Letter ${htmlNum}: No English paragraphs extracted`);
      continue;
    }

    if (enCount === segCount) {
      // Perfect 1:1 match
      for (let i = 0; i < segCount; i++) {
        if (true) {
          segments[i].en = englishParas[i];
          segmentsUpdated++;
        }
      }
    } else if (enCount > segCount) {
      // More English than Hebrew segments - combine extras
      // Assign first (segCount-1) English to first (segCount-1) segments
      // Combine remaining English into last segment
      for (let i = 0; i < segCount - 1; i++) {
        if (true) {
          segments[i].en = englishParas[i];
          segmentsUpdated++;
        }
      }
      // Combine remaining English paragraphs for the last segment
      const remaining = englishParas.slice(segCount - 1).join('\n\n');
      if (!segments[segCount - 1].en || segments[segCount - 1].en.trim() === '') {
        segments[segCount - 1].en = remaining;
        segmentsUpdated++;
      }
    } else {
      // Fewer English than Hebrew - assign what we have
      for (let i = 0; i < enCount; i++) {
        if (true) {
          segments[i].en = englishParas[i];
          segmentsUpdated++;
        }
      }
    }

    if (segmentsUpdated > 0) {
      // Set hasEnglish flag
      jsonData.hasEnglish = true;

      // Write back
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      totalFiles++;
      totalSegments += segmentsUpdated;
    }

    const matchQuality = enCount === segCount ? 'PERFECT' :
      Math.abs(enCount - segCount) <= 2 ? 'CLOSE' : 'MISMATCH';

    results.push({
      htmlNum,
      part: mapping.part,
      jsonLetter: mapping.jsonLetter,
      enParas: enCount,
      heSegments: segCount,
      updated: segmentsUpdated,
      matchQuality
    });

    totalUpdated++;
  }

  // Update index.json files for parts that had updates
  const partsToUpdate = new Set(results.filter(r => r.updated > 0).map(r => r.part));
  for (const part of partsToUpdate) {
    const indexPath = path.join(TARGET_DIR, `part-${part}`, 'index.json');
    if (fs.existsSync(indexPath)) {
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      for (const torah of indexData.torahs) {
        const letterJsonPath = path.join(TARGET_DIR, `part-${part}`, `letter-${torah.number}.json`);
        if (fs.existsSync(letterJsonPath)) {
          const letterData = JSON.parse(fs.readFileSync(letterJsonPath, 'utf-8'));
          if (letterData.hasEnglish) {
            torah.hasEnglish = true;
          }
        }
      }
      fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
      console.log(`Updated index.json for part-${part}`);
    }
  }

  // Report
  console.log('\n=== IMPORT RESULTS ===');
  console.log(`Total HTML files processed: ${totalUpdated}`);
  console.log(`Total JSON files updated: ${totalFiles}`);
  console.log(`Total segments with English added: ${totalSegments}`);

  console.log('\n--- Per-letter details ---');
  for (const r of results) {
    console.log(`Letter ${r.htmlNum.toString().padStart(2)} => part-${r.part}/letter-${r.jsonLetter.toString().padStart(2)}: ${r.enParas} EN / ${r.heSegments} HE segments, ${r.updated} updated [${r.matchQuality}]`);
  }

  if (skipped.length > 0) {
    console.log('\n--- Skipped ---');
    for (const s of skipped) console.log(s);
  }

  // Count mismatches
  const mismatches = results.filter(r => r.matchQuality === 'MISMATCH');
  if (mismatches.length > 0) {
    console.log(`\n--- MISMATCHES (${mismatches.length}) ---`);
    for (const m of mismatches) {
      console.log(`Letter ${m.htmlNum}: ${m.enParas} EN paragraphs vs ${m.heSegments} HE segments (diff: ${m.enParas - m.heSegments})`);
    }
  }
}

main();
