/**
 * Smart content-aware integration of English translations.
 * Uses HTML headings to split content into sections,
 * then matches each section's English to Hebrew segments by content.
 */

const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER = path.join(__dirname, '..', 'public', 'reader');

// ═══════════════════════════════════════════════════
// HTML UTILITIES
// ═══════════════════════════════════════════════════

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
}

function cleanHtml(html) {
  let c = html;
  c = c.replace(/<style[\s\S]*?<\/style>/gi, '');
  c = c.replace(/<script[\s\S]*?<\/script>/gi, '');
  c = c.replace(/<div class="translator-section[\s\S]*$/gi, '');
  c = c.replace(/<div class="tn"[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="translator-note[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="doc-footer[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="ms-footer[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="color-key[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="sum[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="flow[\s\S]*?<\/div>/gi, '');
  c = c.replace(/<div class="chain[\s\S]*?<\/div>/gi, '');
  return c;
}

/**
 * Split HTML into sections by headings (h2, h3, section-heading divs)
 * Returns array of { heading: string, content: string }
 */
function splitByHeadings(html) {
  const clean = cleanHtml(html);

  // Find all heading positions
  const headingPattern = /<(?:h[23][^>]*|div class="section-heading"[^>]*)>[\s\S]*?<\/(?:h[23]|div)>/gi;
  const headings = [];
  let match;
  while ((match = headingPattern.exec(clean)) !== null) {
    headings.push({
      pos: match.index,
      endPos: match.index + match[0].length,
      text: stripHtml(match[0]).trim()
    });
  }

  if (headings.length === 0) {
    // No headings - return entire content as one section
    return [{ heading: '', content: extractTextFromHtml(clean) }];
  }

  const sections = [];
  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].endPos;
    const end = i + 1 < headings.length ? headings[i + 1].pos : clean.length;
    const content = extractTextFromHtml(clean.substring(start, end));
    if (content.length > 20) {
      sections.push({ heading: headings[i].text, content });
    }
  }

  // Also get content before first heading
  if (headings[0].pos > 100) {
    const preContent = extractTextFromHtml(clean.substring(0, headings[0].pos));
    if (preContent.length > 50) {
      sections.unshift({ heading: 'INTRO', content: preContent });
    }
  }

  return sections;
}

function extractTextFromHtml(html) {
  const paras = [];

  // Extract from <p> tags
  const pMatches = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  pMatches.forEach(m => {
    const text = stripHtml(m).trim();
    if (text.length > 5) paras.push(text);
  });

  // Extract from text-block divs
  const tbMatches = html.match(/<div class="text-block"[^>]*>[\s\S]*?<\/div>/gi) || [];
  tbMatches.forEach(m => {
    const text = stripHtml(m).trim();
    if (text.length > 5) paras.push(text);
  });

  // If nothing found, strip all HTML
  if (paras.length === 0) {
    const text = stripHtml(html);
    if (text.length > 10) return text;
  }

  return paras.join('\n\n');
}

// ═══════════════════════════════════════════════════
// HEBREW UTILITIES
// ═══════════════════════════════════════════════════

function hebrewToInt(h) {
  const map = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
  let val = 0;
  const clean = h.replace(/["\u05F3\u05F4']/g, '').replace(/\s/g, '');
  for (const ch of clean) { if (map[ch]) val += map[ch]; }
  return val;
}

function normalizeHebrew(text) {
  return text.replace(/[\u0591-\u05C7]/g, '').replace(/[:"״׳,.\-–—;!?()[\]{}]/g, '').replace(/\s+/g, ' ').trim();
}

function parseWordNumber(str) {
  const ones = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
  const teens = {ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
  const tens = {twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};

  const words = str.toLowerCase().replace(/[—\-]+/g, ' ').split(/\s+/).filter(w => w !== 'and');
  let result = 0;
  let current = 0;

  for (const w of words) {
    if (ones[w]) current += ones[w];
    else if (teens[w]) current += teens[w];
    else if (tens[w]) current += tens[w];
    else if (w === 'hundred') {
      if (current === 0) current = 1;
      current *= 100;
      result += current;
      current = 0;
    }
  }
  result += current;
  return result > 0 ? result : null;
}

// ═══════════════════════════════════════════════════
// SEGMENT ALIGNMENT
// ═══════════════════════════════════════════════════

/**
 * Content-aware alignment: match English paragraphs to Hebrew segments.
 *
 * Strategy:
 * 1. Split English into paragraphs
 * 2. For each Hebrew segment, find the best-matching English paragraph
 *    by looking for Hebrew words that appear transliterated in English
 * 3. Assign English paragraphs to segments in order
 */
/**
 * Content-aware paragraph-by-paragraph alignment.
 *
 * Strategy:
 * 1. Split English into paragraphs
 * 2. Walk through Hebrew segments and English paragraphs together
 * 3. Assign English paragraphs to segments sequentially
 * 4. When more paragraphs than segments: combine adjacent paragraphs
 * 5. When fewer paragraphs than segments: split long paragraphs at sentence boundaries
 */
function alignContentAware(enText, segments) {
  const contentSegs = segments.filter(s => {
    const he = (s.he_nikud || s.he || '').trim();
    return he.length > 3;
  });

  if (!contentSegs.length || !enText.trim()) return;

  // Split English into paragraphs
  const enParas = enText.split(/\n\n+/).filter(p => p.trim().length > 5);

  if (enParas.length === 0) return;

  // If only 1 segment, assign all English to it
  if (contentSegs.length === 1) {
    contentSegs[0].en = enText.trim();
    return;
  }

  // PARAGRAPH-BY-PARAGRAPH assignment
  if (enParas.length === contentSegs.length) {
    // Perfect 1:1 match
    for (let i = 0; i < contentSegs.length; i++) {
      contentSegs[i].en = enParas[i].trim();
    }
  } else if (enParas.length > contentSegs.length) {
    // More English paragraphs than Hebrew segments
    // Group consecutive paragraphs to match segment count
    const ratio = enParas.length / contentSegs.length;
    for (let i = 0; i < contentSegs.length; i++) {
      const start = Math.round(i * ratio);
      const end = i === contentSegs.length - 1 ? enParas.length : Math.round((i + 1) * ratio);
      contentSegs[i].en = enParas.slice(start, end).join('\n\n');
    }
  } else {
    // Fewer English paragraphs than Hebrew segments
    // First try: split paragraphs to get closer to segment count
    // Expand paragraphs by splitting at sentence boundaries
    let expanded = [];
    for (const para of enParas) {
      // Split at sentence boundaries (period + space + capital letter)
      const sentences = para.split(/(?<=\.)\s+(?=[A-Z])/);
      expanded.push(...sentences.filter(s => s.trim().length > 5));
    }

    if (expanded.length >= contentSegs.length) {
      // Now we have enough - group them
      const ratio = expanded.length / contentSegs.length;
      for (let i = 0; i < contentSegs.length; i++) {
        const start = Math.round(i * ratio);
        const end = i === contentSegs.length - 1 ? expanded.length : Math.round((i + 1) * ratio);
        contentSegs[i].en = expanded.slice(start, end).join(' ');
      }
    } else {
      // Still fewer - distribute by Hebrew length proportion
      const allEn = enText.trim();
      const totalHe = contentSegs.reduce((s, seg) => s + (seg.he_nikud || seg.he || '').length, 0);
      let pos = 0;

      for (let j = 0; j < contentSegs.length; j++) {
        const heLen = (contentSegs[j].he_nikud || contentSegs[j].he || '').length;
        if (j === contentSegs.length - 1) {
          contentSegs[j].en = allEn.substring(pos).trim();
        } else {
          const proportion = heLen / totalHe;
          const targetEnd = pos + Math.floor(allEn.length * proportion);
          const splitAt = findSentenceBoundary(allEn, targetEnd);
          contentSegs[j].en = allEn.substring(pos, splitAt).trim();
          pos = splitAt;
        }
      }
    }
  }
}

function findSentenceBoundary(text, pos) {
  for (let i = pos; i < Math.min(pos + 200, text.length); i++) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n' || i === text.length - 1)) return i + 1;
  }
  for (let i = pos; i > Math.max(pos - 200, 0); i--) {
    if (text[i] === '.' && (text[i + 1] === ' ' || text[i + 1] === '\n')) return i + 1;
  }
  return pos;
}

// ═══════════════════════════════════════════════════
// BOOK-SPECIFIC INTEGRATORS
// ═══════════════════════════════════════════════════

function processLMTorahs() {
  console.log('\n=== Likutay Moharan 11-17 ===');
  const folder = path.join(FINISHED, 'Likuaty Moharan 11-17');
  if (!fs.existsSync(folder)) return;

  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html'));
  let count = 0;

  for (const file of htmlFiles) {
    const numMatch = file.match(/torah_(\d+)/i);
    if (!numMatch) continue;
    const torahNum = parseInt(numMatch[1]);

    const html = fs.readFileSync(path.join(folder, file), 'utf8');
    const sections = splitByHeadings(html);

    const readerFile = path.join(READER, 'likutay-moharan', 'part-1', 'torah-' + torahNum + '.json');
    if (!fs.existsSync(readerFile)) continue;

    const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
    data.segments.forEach(s => s.en = '');

    // LM torahs have ois markers (א, ב, ג) as section dividers
    // HTML sections have headings like "Section 1 — Letter א" or just "א"
    // Group segments by ois sections
    const oisGroups = [];
    let currentGroup = [];

    data.segments.forEach((s, i) => {
      const he = (s.he_nikud || s.he || '').trim().replace(/[\u0591-\u05C7]/g, '');
      // Is this an ois marker?
      if (he.length <= 3 && /^[\u05D0-\u05EA]+$/.test(he)) {
        if (currentGroup.length > 0) {
          oisGroups.push({ segments: [...currentGroup] });
          currentGroup = [];
        }
      } else if (he.length > 0) {
        currentGroup.push(i);
      }
    });
    if (currentGroup.length > 0) oisGroups.push({ segments: [...currentGroup] });

    // Match sections to ois groups
    // First section (or content before headings) goes to first group
    // Numbered sections map to ois groups by order
    const contentSections = sections.filter(s => s.content.length > 50);

    if (contentSections.length >= oisGroups.length) {
      // More sections than groups - combine extra sections
      const ratio = contentSections.length / oisGroups.length;
      for (let i = 0; i < oisGroups.length; i++) {
        const start = Math.floor(i * ratio);
        const end = i === oisGroups.length - 1 ? contentSections.length : Math.floor((i + 1) * ratio);
        const combined = contentSections.slice(start, end).map(s => s.content).join('\n\n');
        const segs = oisGroups[i].segments.map(idx => data.segments[idx]);
        alignContentAware(combined, segs);
      }
    } else {
      // Fewer sections - assign sections to first groups, rest gets proportional from remainder
      for (let i = 0; i < contentSections.length; i++) {
        if (i < oisGroups.length) {
          const segs = oisGroups[i].segments.map(idx => data.segments[idx]);
          alignContentAware(contentSections[i].content, segs);
        }
      }
    }

    data.hasEnglish = true;
    fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');
    count++;

    const totalEn = data.segments.reduce((s, seg) => s + (seg.en || '').length, 0);
    const totalHe = data.segments.reduce((s, seg) => s + (seg.he_nikud || seg.he || '').length, 0);
    const segsWithEn = data.segments.filter(s => s.en && s.en.trim().length > 10).length;
    console.log('  Torah ' + torahNum + ': ' + segsWithEn + '/' + data.segments.length + ' segs, en/he=' + (totalEn / totalHe).toFixed(2));
  }

  console.log('  Done: ' + count + ' torahs');
}

function processAlimLitrufa() {
  console.log('\n=== Alim LiTrufa ===');

  const folders = [
    [path.join(FINISHED, 'Ullim litrufa 89-151'), '89-151'],
    [path.join(FINISHED, 'Ulim litrufa 152-226'), '152-226'],
  ];

  let count = 0;

  for (const [folder, label] of folders) {
    if (!fs.existsSync(folder)) continue;
    const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html'));

    for (const file of htmlFiles) {
      const numMatch = file.match(/letter_(\d+)/i);
      if (!numMatch) continue;
      const letterNum = parseInt(numMatch[1]);

      const html = fs.readFileSync(path.join(folder, file), 'utf8');

      // Extract letter body content
      let clean = cleanHtml(html);
      // Get letter-body
      const bodyMatch = clean.match(/<div class="letter-body">([\s\S]*?)(?:<div class="closing|<div class="translator|<div class="ms-footer|$)/i);
      const bodyHtml = bodyMatch ? bodyMatch[1] : clean;
      const enText = extractTextFromHtml(bodyHtml);

      if (enText.length < 30) continue;

      // Find matching reader file
      for (const part of ['part-1', 'part-2', 'part-3', 'part-4', 'part-5', 'part-6']) {
        const readerFile = path.join(READER, 'alim-litrufa', part, 'letter-' + letterNum + '.json');
        if (fs.existsSync(readerFile)) {
          const d = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
          const hasEn = d.segments && d.segments.some(s => s.en && s.en.trim().length > 20);
          if (!hasEn) {
            d.segments.forEach(s => s.en = '');
            alignContentAware(enText, d.segments);
            d.hasEnglish = true;
            fs.writeFileSync(readerFile, JSON.stringify(d, null, 2), 'utf8');
            count++;
          }
          break;
        }
      }
    }
  }

  console.log('  Done: ' + count + ' letters');
}

function processGenericSectionBook(folderName, readerDir, label) {
  console.log('\n=== ' + label + ' ===');

  const folder = path.join(FINISHED, folderName);
  if (!fs.existsSync(folder)) { console.log('  Not found'); return; }

  const readerPath = path.join(READER, readerDir);
  if (!fs.existsSync(readerPath)) { console.log('  Reader dir not found'); return; }

  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();

  // Read all HTML files, split by headings, accumulate sections
  const allSections = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(folder, file), 'utf8');
    const sections = splitByHeadings(html);
    allSections.push(...sections);
  }

  console.log('  ' + htmlFiles.length + ' HTML files → ' + allSections.length + ' sections');

  // Get all reader files
  const jsonFiles = [];
  function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) walkDir(fp);
      else if (f.endsWith('.json') && f !== 'index.json') jsonFiles.push(fp);
    });
  }
  walkDir(readerPath);
  jsonFiles.sort((a, b) => {
    const na = parseInt(path.basename(a).match(/\d+/)?.[0] || 0);
    const nb = parseInt(path.basename(b).match(/\d+/)?.[0] || 0);
    return na - nb;
  });

  // Combine all English sections into one text
  const allEnglish = allSections.map(s => s.content).join('\n\n');

  // Split English into paragraph blocks
  const enParas = allEnglish.split(/\n\n+/).filter(p => p.trim().length > 10);

  // Collect all segments across all files
  const allSegments = [];
  const fileMap = [];
  for (const jf of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(jf, 'utf8'));
    if (!data.segments) continue;
    const start = allSegments.length;
    data.segments.forEach(s => { s.en = ''; allSegments.push(s); });
    fileMap.push({ file: jf, startIdx: start, endIdx: allSegments.length, data });
  }

  const contentSegs = allSegments.filter(s => (s.he_nikud || s.he || '').trim().length > 3);
  console.log('  ' + enParas.length + ' English paragraphs → ' + contentSegs.length + ' content segments');

  // Align: distribute paragraphs across segments
  alignContentAware(allEnglish, allSegments);

  // Write back
  let updated = 0;
  for (const fm of fileMap) {
    fm.data.segments = allSegments.slice(fm.startIdx, fm.endIdx);
    fm.data.hasEnglish = fm.data.segments.some(s => s.en && s.en.trim().length > 10);
    fs.writeFileSync(fm.file, JSON.stringify(fm.data, null, 2), 'utf8');
    if (fm.data.hasEnglish) updated++;
  }

  console.log('  Updated: ' + updated + '/' + jsonFiles.length + ' files');
}

function processParparaos() {
  console.log('\n=== Parparaos LaChuchmuh ===');

  const folder = path.join(FINISHED, 'Parparaos LaChuchmuh');
  if (!fs.existsSync(folder)) return;

  const readerPath = path.join(READER, 'parparos-lechochma');

  // Build siman -> reader file mapping
  const simanToFile = {};
  const readerFiles = fs.readdirSync(readerPath).filter(f => f.startsWith('section-'));
  readerFiles.forEach(f => {
    const d = JSON.parse(fs.readFileSync(path.join(readerPath, f), 'utf8'));
    const title = d.title || '';
    const match = title.match(/\u05E1\u05D9\u05DE\u05DF\s+([^\s\-]+)/);
    if (match) {
      const num = hebrewToInt(match[1]);
      if (num > 0) simanToFile[num] = f;
    }
    if (title.includes('\u05D4\u05E7\u05D3\u05DE\u05D4')) simanToFile[0] = f;
  });

  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();
  let updated = 0;

  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(folder, file), 'utf8');
    const sections = splitByHeadings(html);

    // Parse siman numbers from headings
    // Headings like "Siman Sixty-Six" or "Siman 7" etc.
    const simanSections = {};

    for (const section of sections) {
      const heading = section.heading;
      // Try to extract siman number from heading
      let simanNum = null;

      // Pattern: "Siman X" or "Siman Sixty-Six"
      const directMatch = heading.match(/Siman\s+(\d+)/i);
      if (directMatch) {
        simanNum = parseInt(directMatch[1]);
      }

      // Hebrew siman in heading: סימן סו
      const heMatch = heading.match(/\u05E1\u05D9\u05DE\u05DF\s+([\u05D0-\u05EA"׳]+)/);
      if (heMatch) {
        simanNum = hebrewToInt(heMatch[1]);
      }

      // Word numbers - comprehensive parser
      const wordMatch = heading.match(/Siman\s+([\w\s-]+?)(?:\s*[—]|סימן|\s*$)/i);
      if (wordMatch && !simanNum) {
        simanNum = parseWordNumber(wordMatch[1]);
      }

      if (simanNum && section.content.length > 20) {
        if (!simanSections[simanNum]) simanSections[simanNum] = '';
        simanSections[simanNum] += section.content + '\n\n';
      }
    }

    // Also handle files where the filename has the siman numbers
    // but headings use "Section 1", "Section 2" etc. (sub-sections within a siman)
    if (Object.keys(simanSections).length === 0) {
      // Extract simanim from filename
      const allNums = [];
      const rangeMatch = file.match(/(\d+)_to_(\d+)/i);
      if (rangeMatch) {
        for (let n = parseInt(rangeMatch[1]); n <= parseInt(rangeMatch[2]); n++) allNums.push(n);
      } else {
        const multiMatch = file.match(/Siman(?:im)?_([^.]+?)(?:\s*\(|\.html)/i);
        if (multiMatch) {
          const nums = multiMatch[1].split(/[_\s]+/).map(Number).filter(n => n > 0);
          allNums.push(...nums);
        } else {
          const singleMatch = file.match(/Siman_(\d+)/i);
          if (singleMatch) allNums.push(parseInt(singleMatch[1]));
        }
      }

      if (allNums.length > 0) {
        // Distribute entire file content across these simanim
        const allContent = sections.map(s => s.content).join('\n\n');
        if (allNums.length === 1) {
          simanSections[allNums[0]] = allContent;
        } else {
          // Split content evenly among simanim
          const chunkSize = Math.ceil(allContent.length / allNums.length);
          allNums.forEach((num, i) => {
            const start = i * chunkSize;
            const end = i === allNums.length - 1 ? allContent.length : findSentenceBoundary(allContent, (i + 1) * chunkSize);
            simanSections[num] = allContent.substring(start, end).trim();
          });
        }
      }
    }

    // Now assign to reader files
    for (const [simanStr, enText] of Object.entries(simanSections)) {
      const siman = parseInt(simanStr);
      const readerFile = simanToFile[siman];
      if (!readerFile) continue;

      const fp = path.join(readerPath, readerFile);
      const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
      d.segments.forEach(s => s.en = '');
      alignContentAware(enText, d.segments);
      d.hasEnglish = true;
      fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
      updated++;
    }
  }

  console.log('  Updated: ' + updated + ' files');

  // Check remaining
  const missing = readerFiles.filter(f => {
    const d = JSON.parse(fs.readFileSync(path.join(readerPath, f), 'utf8'));
    return !d.segments.some(s => s.en && s.en.trim().length > 20);
  });
  console.log('  Missing: ' + missing.length + '/' + readerFiles.length);
  if (missing.length > 0 && missing.length <= 15) {
    missing.forEach(f => {
      const d = JSON.parse(fs.readFileSync(path.join(readerPath, f), 'utf8'));
      console.log('    ' + f + ': ' + (d.title || ''));
    });
  }
}

function processRNossonLetters() {
  console.log('\n=== R\' Nosson ben R\' Yehuda ===');
  processGenericSectionBook('Rabbi Nussun ben Rabbi Yehuda - 55', 'nosson-by-\u05DE\u05DB\u05EA\u05D1\u05D9-\u05E8--\u05E0\u05EA\u05DF-\u05D1--\u05E8-\u05D9\u05D4', 'R\' Nosson Letters');
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════╗');
console.log('║  Smart Content-Aware Integration          ║');
console.log('╚══════════════════════════════════════════╝');

processLMTorahs();
processAlimLitrufa();
processParparaos();
processGenericSectionBook('Nachas Hashulchan', 'nachas-hashulchan', 'Nachas Hashulchan');
processGenericSectionBook('Yikara diShabata', 'yikra-dshabbata', 'Yikara diShabata');
processGenericSectionBook('Zimras HaAretz', 'zimras-haaretz', 'Zimras HaAretz');
processGenericSectionBook('Kuntrass Hatzairufim', 'nosson-by-\u05E7\u05D5\u05E0\u05D8\u05E8\u05E1-\u05D4\u05E6\u05E8\u05D5\u05E4\u05D9\u05DD', 'Kuntrass Hatzairufim');
processRNossonLetters();

// Also process supplementary folders
processGenericSectionBook('Oatzar 2', 'otzar-hayirah', 'Oatzar Vol 2');
processGenericSectionBook('Oatzar 4', 'otzar-hayirah', 'Oatzar Vol 4');
processGenericSectionBook('Yerech HaAisunim', 'yereach-haeitanim', 'Yerech HaAisunim');
processGenericSectionBook('Yimay Moharnat', 'yemei-moharnat', 'Yimay Moharnat');

console.log('\n=== DONE ===');
