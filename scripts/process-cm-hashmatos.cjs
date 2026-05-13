/**
 * Process Chayay Moharan Hashmatos
 *
 * Parses hashmatos from hashmatos_toc.html and appends them to the correct
 * chapter JSON files based on siman (article) number matching.
 *
 * Siman 162 is password-protected and stored separately.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// --- Hebrew numeral utilities ---
const hebrewNumerals = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
  'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
  // Finals
  'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90
};

function hebrewToNumber(heb) {
  let total = 0;
  // Remove geresh, gershayim, quotes, nikkud
  const clean = heb.replace(/[׳״"']/g, '').replace(/[\u0591-\u05C7]/g, '');
  for (const ch of clean) {
    if (hebrewNumerals[ch]) {
      total += hebrewNumerals[ch];
    }
  }
  return total;
}

function numberToHebrew(num) {
  if (num <= 0) return '';
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

  let result = '';
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)];
    num %= 100;
  }
  // Handle 15 and 16 specially (ט"ו and ט"ז instead of י"ה and י"ו)
  if (num === 15) return result + 'טו';
  if (num === 16) return result + 'טז';

  if (num >= 10) {
    result += tens[Math.floor(num / 10)];
    num %= 10;
  }
  result += ones[num];
  return result;
}

// --- Parse HTML ---
function parseHashmatos(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const entries = [];

  // Match each entry div
  const entryRegex = /<div class="entry[^"]*">([\s\S]*?)<\/div>\s*(?=<div class="entry|<h2|<hr|<\/body)/g;
  let match;

  while ((match = entryRegex.exec(html)) !== null) {
    const block = match[1];

    // Extract siman line
    const simanMatch = block.match(/<div class="siman">(.*?)<\/div>/);
    if (!simanMatch) continue;

    const simanText = simanMatch[1];

    // Extract number from siman - look for (number) pattern or Hebrew letters
    let simanNum = null;
    const numMatch = simanText.match(/\((\d+)\)/);
    if (numMatch) {
      simanNum = parseInt(numMatch[1]);
    }

    // Special case: הקדמה
    const isHakdama = simanText.includes('הַקְדָּמָה') || simanText.includes('הקדמה');

    // Extract label
    const labelMatch = block.match(/<div class="label">(.*?)<\/div>/);
    const label = labelMatch ? labelMatch[1].trim() : '';

    // Extract Hebrew content
    const hebMatch = block.match(/<div class="heb">(.*?)<\/div>/s);
    const hebContent = hebMatch ? hebMatch[1].trim() : '';

    // Extract context
    const contextMatch = block.match(/<div class="context">(.*?)<\/div>/s);
    const context = contextMatch ? contextMatch[1].trim() : '';

    if (simanNum || isHakdama) {
      entries.push({
        siman: simanNum || 0,
        isHakdama,
        label,
        hebContent: decodeHtmlEntities(hebContent),
        context: decodeHtmlEntities(context),
        raw: simanText
      });
    }
  }

  return entries;
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// --- Extract hashmata text ---
function extractHashmataText(entry) {
  let heText = '';
  let enText = '';

  const content = entry.hebContent;

  // Content in angle brackets is typically English/translation
  // Content outside angle brackets is Hebrew or editorial notes
  // Some entries are just descriptions (no angle brackets = editorial notes about what was already included)

  // Check if this is just a note that it's already included
  const skipPatterns = [
    /^Already translated/i,
    /^Full story:/,
    /^Dream of /,
    /^Full Shabbos/,
    /^Three hashmatos:/,
    /^Six synagogues/,
    /^Full story of /,
    /^End of article:/,
    /^FOUR HASHMATOS/,
    /^TWO HASHMATOS/,
    /^THREE HASHMATOS/,
    /^TWO PARAGRAPHS/,
  ];

  // Extract angle-bracket content as English
  const angleBracketRegex = /<([^>]+)>/g;
  const englishParts = [];
  const hebrewParts = [];
  let lastIndex = 0;
  let abMatch;

  while ((abMatch = angleBracketRegex.exec(content)) !== null) {
    // Text before angle bracket
    const before = content.substring(lastIndex, abMatch.index).trim();
    if (before) hebrewParts.push(before);

    // Text inside angle brackets
    const inside = abMatch[1].trim();

    // Determine if it's Hebrew or English
    if (/[\u0590-\u05FF]/.test(inside) && !/[a-zA-Z]{3,}/.test(inside)) {
      // Mostly Hebrew
      hebrewParts.push(inside);
    } else if (/[a-zA-Z]/.test(inside)) {
      // Has English
      englishParts.push(inside);
      // Also check for Hebrew mixed in
      const hebInside = inside.match(/[\u0590-\u05FF][\u0590-\u05FF\s\u0591-\u05C7]+/g);
      if (hebInside) {
        hebrewParts.push(...hebInside);
      }
    } else {
      hebrewParts.push(inside);
    }

    lastIndex = abMatch.index + abMatch[0].length;
  }

  // Remaining text after last angle bracket
  const remaining = content.substring(lastIndex).trim();
  if (remaining) {
    if (/[\u0590-\u05FF]/.test(remaining)) {
      hebrewParts.push(remaining);
    }
    // Check for English in remaining
    if (/[a-zA-Z]{3,}/.test(remaining) && !/[\u0590-\u05FF]/.test(remaining)) {
      englishParts.push(remaining);
    }
  }

  // Also check context for additional English
  if (entry.context) {
    const ctxAngle = entry.context.match(/<([^>]+)>/g);
    if (ctxAngle) {
      ctxAngle.forEach(a => {
        const inner = a.slice(1, -1).trim();
        if (/[a-zA-Z]/.test(inner)) {
          // Don't duplicate if already captured
          if (!englishParts.some(e => inner.includes(e) || e.includes(inner))) {
            englishParts.push(inner);
          }
        }
      });
    }
  }

  heText = hebrewParts.filter(h => h && h.length > 0).join('\n');
  enText = englishParts.filter(e => e && e.length > 0).join('\n');

  return { heText, enText };
}

// --- Find segment for a siman in a chapter ---
function findSegmentForSiman(chapter, simanNum) {
  const hebNum = numberToHebrew(simanNum);

  for (let i = 0; i < chapter.segments.length; i++) {
    const seg = chapter.segments[i];
    const he = seg.he || '';

    // Look for the siman marker like (קסב) at the start of text
    // The pattern is: optional global number on previous line, then (hebrewNum)
    const patterns = [
      new RegExp(`\\(${escapeRegex(hebNum)}\\)`),
    ];

    // Also try with geresh variants
    for (const pat of patterns) {
      if (pat.test(he)) {
        return i;
      }
    }
  }

  return -1;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Main processing ---
function main() {
  const htmlPath = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/Chayay Moharan/hashmatos_toc.html';
  const chapterDir = path.join(__dirname, '..', 'public', 'reader', 'chayey-moharan');

  console.log('Parsing hashmatos from HTML...');
  const hashmatos = parseHashmatos(htmlPath);
  console.log(`Found ${hashmatos.length} hashmatos in HTML`);

  // Load all chapters
  const chapters = {};
  for (let i = 1; i <= 12; i++) {
    const fp = path.join(chapterDir, `chapter-${i}.json`);
    chapters[i] = JSON.parse(fs.readFileSync(fp, 'utf8'));
  }

  let matched = 0;
  let unmatched = 0;
  let skipped = 0;
  let locked162 = false;
  const affectedChapters = new Set();
  const unmatchedList = [];
  const matchedList = [];

  for (const entry of hashmatos) {
    if (entry.isHakdama) {
      // Hakdama hashmata - skip for now, it's the introduction
      console.log(`  Skipping hakdama hashmata: "${entry.label}"`);
      skipped++;
      continue;
    }

    const simanNum = entry.siman;
    const { heText, enText } = extractHashmataText(entry);

    // Check if this is just an editorial note with no actual content to add
    if (!heText && !enText) {
      console.log(`  Siman ${simanNum}: No extractable content (editorial note: "${entry.hebContent.substring(0, 60)}...")`);
      skipped++;
      continue;
    }

    // Handle siman 162 specially
    if (simanNum === 162) {
      console.log(`  Siman 162: PASSWORD PROTECTED - storing separately`);

      const password = 'nachman';
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const locked = {
        siman: 162,
        passwordHash,
        hashmata_he: heText,
        hashmata_en: enText,
        label: entry.label,
        note: 'This hashmata is locked. Enter the correct password to reveal it.'
      };

      const lockedPath = path.join(chapterDir, 'hashmata-162.json');
      fs.writeFileSync(lockedPath, JSON.stringify(locked, null, 2), 'utf8');
      console.log(`  Written to ${lockedPath}`);

      // Find and mark the segment
      for (let ch = 1; ch <= 12; ch++) {
        const idx = findSegmentForSiman(chapters[ch], 162);
        if (idx >= 0) {
          chapters[ch].segments[idx].locked_hashmata = true;
          affectedChapters.add(ch);
          console.log(`  Marked segment ${idx + 1} in chapter ${ch} as locked_hashmata`);
          break;
        }
      }

      locked162 = true;
      matched++;
      continue;
    }

    // Find the matching segment across all chapters
    let found = false;
    for (let ch = 1; ch <= 12; ch++) {
      const idx = findSegmentForSiman(chapters[ch], simanNum);
      if (idx >= 0) {
        const seg = chapters[ch].segments[idx];

        // Check if hashmata content already exists
        if (seg.he && seg.he.includes('השמטה:')) {
          console.log(`  Siman ${simanNum}: Already has hashmata in chapter ${ch}, skipping`);
          skipped++;
          found = true;
          break;
        }

        // Append hashmata to Hebrew text
        if (heText) {
          seg.he = seg.he + '\n\nהשמטה: ' + heText;
          if (seg.he_nikud) {
            seg.he_nikud = seg.he_nikud + '\n\nהַשְׁמָטָה: ' + heText;
          }
        }

        // Append hashmata to English text
        if (enText && seg.en) {
          seg.en = seg.en + '\n\nOmission: ' + enText;
        } else if (enText && !seg.en) {
          seg.en = 'Omission: ' + enText;
        }

        affectedChapters.add(ch);
        matched++;
        found = true;
        matchedList.push({ siman: simanNum, chapter: ch, segIndex: idx + 1, label: entry.label });
        console.log(`  Siman ${simanNum} (${entry.label}): -> Chapter ${ch}, segment ${idx + 1}`);
        break;
      }
    }

    if (!found) {
      unmatched++;
      unmatchedList.push({ siman: simanNum, label: entry.label, content: entry.hebContent.substring(0, 80) });
      console.log(`  Siman ${simanNum} (${entry.label}): NOT FOUND in any chapter`);
    }
  }

  // Save modified chapters
  for (const ch of affectedChapters) {
    const fp = path.join(chapterDir, `chapter-${ch}.json`);
    fs.writeFileSync(fp, JSON.stringify(chapters[ch], null, 2), 'utf8');
    console.log(`Saved chapter ${ch}`);
  }

  // Report
  console.log('\n=== REPORT ===');
  console.log(`Total hashmatos in HTML: ${hashmatos.length}`);
  console.log(`Matched and appended: ${matched}`);
  console.log(`Skipped (no content / editorial / already present / hakdama): ${skipped}`);
  console.log(`Unmatched: ${unmatched}`);
  console.log(`Siman 162 locked: ${locked162}`);
  console.log(`Chapters affected: ${[...affectedChapters].sort((a, b) => a - b).join(', ')}`);

  if (unmatchedList.length > 0) {
    console.log('\nUnmatched hashmatos:');
    unmatchedList.forEach(u => {
      console.log(`  Siman ${u.siman} (${u.label}): "${u.content}..."`);
    });
  }

  if (matchedList.length > 0) {
    console.log('\nMatched hashmatos:');
    matchedList.forEach(m => {
      console.log(`  Siman ${m.siman} (${m.label}) -> Chapter ${m.chapter}, segment ${m.segIndex}`);
    });
  }
}

main();
