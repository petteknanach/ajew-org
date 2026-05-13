/**
 * Import English translations for Kitzur Likutay Moharan from HTML files
 * Source: C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Kitzure lkm/
 * Target: public/reader/kitzur-likutay-moharan/part-{1,2}/torah-{N}.json
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Kitzure lkm';
const TARGET_BASE = path.join(__dirname, '..', 'public', 'reader', 'kitzur-likutay-moharan');

// ─── HTML Parsing helpers ───────────────────────────────────────────────

/**
 * Strip HTML tags, decode entities, clean whitespace
 */
function stripHtml(html) {
  let text = html;
  // Remove HTML tags but preserve content
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&mdash;/g, '—');
  text = text.replace(/&ndash;/g, '–');
  text = text.replace(/&hellip;/g, '…');
  text = text.replace(/&rsquo;/g, "'");
  text = text.replace(/&lsquo;/g, "'");
  text = text.replace(/&rdquo;/g, '"');
  text = text.replace(/&ldquo;/g, '"');
  text = text.replace(/&#\d+;/g, ''); // remaining numeric entities
  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  text = text.trim();
  return text;
}

/**
 * Extract text content from a teaching-text div, preserving inline meaning
 */
function extractTeachingText(html) {
  let text = html;
  // Keep heb-term content in brackets
  text = text.replace(/<span class="heb-term">([^<]+)<\/span>/g, '$1');
  // Keep verse styling as italic markers
  text = text.replace(/<em class="verse">([^<]*)<\/em>/g, '"$1"');
  text = text.replace(/<em class=['"]verse['"]>([^<]*)<\/em>/g, '"$1"');
  // Handle nested em within verse
  text = text.replace(/<em class=['"]verse['"]>([\s\S]*?)<\/em>/g, (m, inner) => {
    return '"' + inner.replace(/<[^>]+>/g, '') + '"';
  });
  // Regular em
  text = text.replace(/<em>([^<]*)<\/em>/g, '"$1"');
  // Bold/strong - just keep text
  text = text.replace(/<strong>([^<]*)<\/strong>/g, '$1');
  // Key spans
  text = text.replace(/<span class="key">([^<]+)<\/span>/g, '$1');
  // Acrostic spans
  text = text.replace(/<span class="acrostic">([^<]+)<\/span>/g, '$1');
  // Root notes
  text = text.replace(/<span class="root-note">([\s\S]*?)<\/span>/g, (m, inner) => {
    return '\n' + stripHtml(inner);
  });

  return stripHtml(text);
}

/**
 * Parse torahs from an HTML file
 * Returns array of { torahNum, part, teachings: [string], bracketNotes: [{afterTeaching: N, text: string}] }
 */
function parseHtmlFile(filePath, defaultPart) {
  const html = fs.readFileSync(filePath, 'utf8');
  const torahs = [];

  // Find all torah headings and their content
  // Split by torah-heading divs
  const torahSections = html.split(/<div class="torah-heading">/);

  for (let i = 1; i < torahSections.length; i++) {
    const section = torahSections[i];

    // Extract torah label
    const labelMatch = section.match(/<div class="torah-label">([\s\S]*?)<\/div>/);
    if (!labelMatch) continue;

    const label = stripHtml(labelMatch[1]);

    // Determine part and torah number from label
    let part = defaultPart;
    let torahNum = null;

    if (/Part Two/i.test(label)) {
      part = 2;
    }

    // Extract number - handle various formats
    // "Toirah Aleph" = 1
    // "Toirah 2" = 2
    // "Toirah 14 — Continuation" = 14 (continuation)
    // "Part Two — Toirah 1" = 1
    const numMatch = label.match(/Toirah\s+(\d+)/i);
    const alephMatch = label.match(/Toirah\s+Aleph/i);
    const isContinuation = /Continuation/i.test(label);

    if (alephMatch) {
      torahNum = 1;
    } else if (numMatch) {
      torahNum = parseInt(numMatch[1]);
    }

    if (torahNum === null) {
      console.log(`  [SKIP] Could not parse torah number from label: "${label}"`);
      continue;
    }

    // Collect all teaching items and bracket notes in order
    const items = []; // {type: 'teaching'|'bracket'|'single-para', text: string, num: string}

    // Find teaching items
    const teachingRegex = /<li class="teaching-item">\s*<div class="teaching-num">([\s\S]*?)<\/div>\s*<div class="teaching-text">([\s\S]*?)<\/div>\s*<\/li>/g;
    const bracketRegex = /<div class="bracket-note">([\s\S]*?)<\/div>/g;
    const singleParaRegex = /<div class="single-para">([\s\S]*?)<\/div>/g;
    const translatorRegex = /<div class="translator-note">([\s\S]*?)<\/div>/g;

    // We need to find items in order of appearance
    // Parse all matches with their positions
    const allMatches = [];

    let m;
    while ((m = teachingRegex.exec(section)) !== null) {
      const num = stripHtml(m[1]);
      const text = extractTeachingText(m[2]);
      allMatches.push({ pos: m.index, type: 'teaching', num, text });
    }

    while ((m = bracketRegex.exec(section)) !== null) {
      const text = extractTeachingText(m[1]);
      // Check if this is inside a teaching-item (li > bracket-note) - skip those
      // Actually, bracket notes inside <li> are already captured differently
      // Check if preceded by teaching-item pattern
      allMatches.push({ pos: m.index, type: 'bracket', text });
    }

    while ((m = singleParaRegex.exec(section)) !== null) {
      const text = extractTeachingText(m[1]);
      allMatches.push({ pos: m.index, type: 'single-para', text });
    }

    // Sort by position
    allMatches.sort((a, b) => a.pos - b.pos);

    // Filter out bracket notes that are duplicates of bracket notes inside teaching items
    // A bracket note that appears between two teachings is a standalone bracket note
    // We keep all of them

    torahs.push({
      torahNum,
      part,
      isContinuation,
      label,
      items: allMatches
    });
  }

  // Also check for preface content (in file 010)
  if (filePath.includes('010')) {
    // Parse prefaces
    const prefaces = parsePrefaces(html);
    if (prefaces.length > 0) {
      torahs.unshift(...prefaces);
    }
  }

  return torahs;
}

/**
 * Parse preface sections from the first HTML file
 */
function parsePrefaces(html) {
  const results = [];

  // Publisher's preface
  const pubMatch = html.match(/<div class="preface-block publisher">([\s\S]*?)<\/div>\s*\n\s*\n/);
  if (pubMatch) {
    const paragraphs = pubMatch[1].match(/<p>([\s\S]*?)<\/p>/g);
    if (paragraphs) {
      const texts = paragraphs.map(p => extractTeachingText(p));
      results.push({
        torahNum: 'preface-publisher',
        part: 1,
        jsonTorah: 1, // maps to torah-1.json
        texts
      });
    }
  }

  // R' Nosson's preface
  const nossonMatch = html.match(/<div class="preface-block nosson">([\s\S]*?)<\/div>\s*<\/div>/);
  if (nossonMatch) {
    const paragraphs = nossonMatch[1].match(/<p>([\s\S]*?)<\/p>/g);
    if (paragraphs) {
      const texts = paragraphs.map(p => extractTeachingText(p));
      results.push({
        torahNum: 'preface-nosson',
        part: 1,
        jsonTorah: 2, // maps to torah-2.json
        texts
      });
    }
  }

  // Lchu Chazu section
  const lchuMatch = html.match(/<div class="preface-block lchu">([\s\S]*?)<\/div>\s*<\/div>/);
  if (lchuMatch) {
    const paragraphs = lchuMatch[1].match(/<p>([\s\S]*?)<\/p>/g);
    if (paragraphs) {
      const texts = paragraphs.map(p => extractTeachingText(p));
      results.push({
        torahNum: 'preface-lchu',
        part: 1,
        jsonTorah: 3, // maps to torah-3.json
        texts
      });
    }
  }

  return results;
}

// ─── Main Logic ─────────────────────────────────────────────────────────

function main() {
  console.log('=== Kitzur Likutay Moharan English Import ===\n');

  // Read all HTML files
  const htmlFiles = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`Found ${htmlFiles.length} HTML files\n`);

  // Parse all HTML files
  const allTorahs = [];
  const continuations = {}; // torahNum -> items for continuation torahs

  for (const file of htmlFiles) {
    const filePath = path.join(SOURCE_DIR, file);
    const defaultPart = (file.startsWith('6')) ? 2 : 1;

    console.log(`Parsing: ${file} (Part ${defaultPart})`);
    const torahs = parseHtmlFile(filePath, defaultPart);
    console.log(`  Found ${torahs.length} torahs`);

    for (const t of torahs) {
      if (t.isContinuation) {
        const key = `${t.part}-${t.torahNum}`;
        if (!continuations[key]) continuations[key] = [];
        continuations[key].push(...t.items);
        console.log(`  [CONTINUATION] Torah ${t.torahNum} Part ${t.part}: ${t.items.length} items`);
      } else {
        allTorahs.push(t);
      }
    }
  }

  // Merge continuations into their parent torahs
  for (const t of allTorahs) {
    if (typeof t.torahNum === 'number') {
      const key = `${t.part}-${t.torahNum}`;
      if (continuations[key]) {
        t.items = [...(t.items || []), ...continuations[key]];
        console.log(`\nMerged continuation for Part ${t.part} Torah ${t.torahNum}: +${continuations[key].length} items`);
        delete continuations[key];
      }
    }
  }

  // Report unmerged continuations
  for (const key of Object.keys(continuations)) {
    console.log(`\n[WARNING] Unmerged continuation: ${key} with ${continuations[key].length} items`);
  }

  console.log(`\nTotal torahs parsed: ${allTorahs.length}`);

  // ─── Apply translations to JSON files ───────────────────────────────

  let totalTorahsUpdated = 0;
  let totalSegmentsUpdated = 0;
  let totalSegmentsSkipped = 0;
  let errors = [];

  for (const torah of allTorahs) {
    // Handle preface entries separately
    if (typeof torah.torahNum === 'string' && torah.torahNum.startsWith('preface-')) {
      const jsonPath = path.join(TARGET_BASE, `part-${torah.part}`, `torah-${torah.jsonTorah}.json`);
      if (!fs.existsSync(jsonPath)) {
        console.log(`[SKIP] JSON not found: ${jsonPath}`);
        continue;
      }

      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const prefaceText = torah.texts.join('\n\n');

      // For prefaces, put all text into segment 1 as a single block
      // Actually, preface JSONs have multiple segments (one per section)
      // Let's distribute texts across segments
      let updated = 0;
      for (let si = 0; si < json.segments.length && si < torah.texts.length; si++) {
        json.segments[si].en = torah.texts[si];
        updated++;
      }

      if (updated > 0) {
        json.hasEnglish = true;
        fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
        totalTorahsUpdated++;
        totalSegmentsUpdated += updated;
        console.log(`[PREFACE] Updated ${torah.torahNum} -> torah-${torah.jsonTorah}.json: ${updated} segments`);
      }
      continue;
    }

    // Calculate JSON torah number
    let jsonTorahNum;
    if (torah.part === 1) {
      jsonTorahNum = torah.torahNum + 3; // offset for preface sections
    } else {
      jsonTorahNum = torah.torahNum; // Part 2 has 1:1 mapping
    }

    const jsonPath = path.join(TARGET_BASE, `part-${torah.part}`, `torah-${jsonTorahNum}.json`);

    if (!fs.existsSync(jsonPath)) {
      errors.push(`JSON not found for Part ${torah.part} Torah ${torah.torahNum} -> torah-${jsonTorahNum}.json`);
      continue;
    }

    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Collect teaching texts (skip bracket notes for now, we'll handle them separately)
    const teachings = torah.items.filter(it => it.type === 'teaching');
    const brackets = torah.items.filter(it => it.type === 'bracket');
    const singleParas = torah.items.filter(it => it.type === 'single-para');

    // For single-para torahs (like Part 2 Torah 3 "Pidyon Nefesh")
    if (teachings.length === 0 && singleParas.length > 0) {
      // Put all single-para text into appropriate segments
      const allText = singleParas.map(sp => sp.text).join('\n\n');
      if (json.segments.length >= 2) {
        json.segments[1].en = allText;
        totalSegmentsUpdated++;
      } else if (json.segments.length === 1) {
        json.segments[0].en = allText;
        totalSegmentsUpdated++;
      }
      json.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
      totalTorahsUpdated++;
      console.log(`[SINGLE] Part ${torah.part} Torah ${torah.torahNum} -> torah-${jsonTorahNum}.json: 1 segment (single-para)`);
      continue;
    }

    // Map teachings to segments
    // Segment 1 is typically the title segment
    // Segments 2+ correspond to numbered teachings
    // But some segments may include bracket notes in their Hebrew

    let segUpdated = 0;

    // Strategy: match by counting. Segment index 1 = title, segments 2..N = teachings 1..N-1
    // But some torahs may have bracket notes embedded in segments

    // First, check if segment count roughly matches teaching count
    const nonTitleSegments = json.segments.length - 1; // excluding title segment

    if (teachings.length === 0) {
      console.log(`[SKIP] Part ${torah.part} Torah ${torah.torahNum}: no teachings found in HTML`);
      continue;
    }

    // Build combined teaching texts with bracket notes interspersed
    // Group bracket notes by their position relative to teachings
    const teachingTexts = [];
    let teachingIdx = 0;
    let allIdx = 0;

    for (const item of torah.items) {
      if (item.type === 'teaching') {
        teachingTexts.push(item.text);
      } else if (item.type === 'bracket') {
        // Append bracket note to previous teaching if exists
        if (teachingTexts.length > 0) {
          teachingTexts[teachingTexts.length - 1] += '\n\n' + item.text;
        }
      } else if (item.type === 'single-para') {
        // Append as additional content
        if (teachingTexts.length > 0) {
          teachingTexts[teachingTexts.length - 1] += '\n\n' + item.text;
        } else {
          teachingTexts.push(item.text);
        }
      }
    }

    // Now map teachingTexts to segments
    // Segment 1 (index 0) is the title - we can skip it or put a summary
    // For torahs where segment[0].he is just the title, skip it
    // For torahs where segment[0].he has actual content, include it

    // Check if first segment is just a title
    const firstSegHe = json.segments[0].he;
    const isFirstSegTitle = /^תּוֹרָה\s/.test(firstSegHe) ||
                            firstSegHe.length < 100 ||
                            /^הַשְׁמָטָה/.test(firstSegHe);

    let segStartIdx = isFirstSegTitle ? 1 : 0;

    // Special case: if the torah has only 1 segment, put everything there
    if (json.segments.length === 1) {
      json.segments[0].en = teachingTexts.join('\n\n');
      segUpdated = 1;
    } else {
      // Map teachings to segments starting from segStartIdx
      for (let ti = 0; ti < teachingTexts.length; ti++) {
        const segIdx = segStartIdx + ti;
        if (segIdx >= json.segments.length) {
          // More teachings than segments - append remaining to last segment
          json.segments[json.segments.length - 1].en += '\n\n' + teachingTexts[ti];
          segUpdated++; // count as update even though appending
          continue;
        }
        json.segments[segIdx].en = teachingTexts[ti];
        segUpdated++;
      }
    }

    if (segUpdated > 0) {
      json.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');
      totalTorahsUpdated++;
      totalSegmentsUpdated += segUpdated;

      const mismatch = (teachingTexts.length !== nonTitleSegments) ?
        ` [MISMATCH: ${teachingTexts.length} teachings vs ${nonTitleSegments} segments]` : '';
      console.log(`[OK] Part ${torah.part} Torah ${torah.torahNum} -> torah-${jsonTorahNum}.json: ${segUpdated} segments${mismatch}`);
    }
  }

  // ─── Update index.json hasEnglish flags ─────────────────────────────

  for (const partNum of [1, 2]) {
    const indexPath = path.join(TARGET_BASE, `part-${partNum}`, 'index.json');
    if (!fs.existsSync(indexPath)) continue;

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    let indexUpdated = 0;

    for (const entry of index.torahs) {
      const torahPath = path.join(TARGET_BASE, `part-${partNum}`, `torah-${entry.number}.json`);
      if (!fs.existsSync(torahPath)) continue;

      const torahJson = JSON.parse(fs.readFileSync(torahPath, 'utf8'));
      const hasEn = torahJson.segments.some(s => s.en && s.en.trim().length > 0);
      if (hasEn && !entry.hasEnglish) {
        entry.hasEnglish = true;
        indexUpdated++;
      }
    }

    if (indexUpdated > 0) {
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
      console.log(`\nUpdated Part ${partNum} index.json: ${indexUpdated} entries marked hasEnglish`);
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────

  console.log('\n=== SUMMARY ===');
  console.log(`Torahs updated: ${totalTorahsUpdated}`);
  console.log(`Segments updated: ${totalSegmentsUpdated}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main();
