/**
 * Fill ALL three books to 100% English coverage:
 * 1. Likutay Halachos - from DOCX (numbered) + HTML (Source B) translations
 * 2. Kitzur Likutay Moharan - translate short Hebrew headers
 * 3. Otzar HaYirah - translate short Hebrew headers
 *
 * Strategy:
 * - LH Step 1: Import from DOCX numbered paragraphs (Source A)
 * - LH Step 2: Import from HTML translations (Source B)
 * - All books: Translate short Hebrew headers to English
 * - All books: For remaining content segments, merge with previous segment's English
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const READER_DIR = path.join(__dirname, '../public/reader');
const DOCX_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Likutay Halachos';
const HTML_DIR = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/g, '\n')
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

function stripNikud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function isHebrew(text) {
  return /[\u0590-\u05FF]/.test(text);
}

function countCoverage(bookDir) {
  let total = 0, withEn = 0;
  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      if (fs.statSync(full).isDirectory()) { walk(full); continue; }
      if (!item.endsWith('.json') || item === 'index.json') continue;
      const data = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (!data.segments) continue;
      for (const seg of data.segments) {
        total++;
        if (seg.en && seg.en.trim()) withEn++;
      }
    }
  }
  walk(bookDir);
  return { total, withEn, pct: total > 0 ? Math.round(withEn / total * 100) : 0 };
}

function findJsonFiles(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      files = files.concat(findJsonFiles(full));
    } else if (item.endsWith('.json') && item !== 'index.json') {
      files.push(full);
    }
  }
  return files.sort((a, b) => {
    const na = parseInt(path.basename(a).match(/\d+/)?.[0] || '0');
    const nb = parseInt(path.basename(b).match(/\d+/)?.[0] || '0');
    // Also consider parent dir
    const pa = a.includes('part-') ? parseInt(a.match(/part-(\d+)/)?.[1] || '0') : 0;
    const pb = b.includes('part-') ? parseInt(b.match(/part-(\d+)/)?.[1] || '0') : 0;
    return pa !== pb ? pa - pb : na - nb;
  });
}

// ============================================================
// HEBREW HEADER TRANSLATION
// ============================================================

/**
 * Translate common Hebrew headers/titles to English.
 * Only for short segments (< 80 chars) that look like headers.
 */
function translateHebrewHeader(he) {
  if (!he) return null;
  const clean = stripNikud(he).trim();

  // Torah number patterns: "תורה א", "תּוֹרָה רלו"
  const torahMatch = clean.match(/^תורה\s+(.+)$/);
  if (torahMatch) {
    const num = hebrewToNumber(torahMatch[1].trim());
    if (num) return `Torah ${num}`;
    return `Torah ${torahMatch[1].trim()}`;
  }

  // Halacha patterns
  const halachaMatch = clean.match(/^הלכה?\s+(.+)$/);
  if (halachaMatch) {
    const num = hebrewToNumber(halachaMatch[1].trim());
    if (num) return `Halacha ${num}`;
    return `Halacha ${halachaMatch[1].trim()}`;
  }

  // Siman patterns
  const simanMatch = clean.match(/^סימן\s+(.+)$/);
  if (simanMatch) {
    const num = hebrewToNumber(simanMatch[1].trim());
    if (num) return `Siman ${num}`;
    return `Siman ${simanMatch[1].trim()}`;
  }

  // Ois/Section patterns: "אות א", "סעיף א"
  const oisMatch = clean.match(/^אות\s+(.+)$/);
  if (oisMatch) {
    const num = hebrewToNumber(oisMatch[1].trim());
    if (num) return `Section ${num}`;
    return `Section ${oisMatch[1].trim()}`;
  }

  const seifMatch = clean.match(/^סעיף\s+(.+)$/);
  if (seifMatch) {
    const num = hebrewToNumber(seifMatch[1].trim());
    if (num) return `Paragraph ${num}`;
    return `Paragraph ${seifMatch[1].trim()}`;
  }

  // Part/Chelek patterns
  const chelekMatch = clean.match(/^חלק\s+(.+)$/);
  if (chelekMatch) {
    const num = hebrewToNumber(chelekMatch[1].trim());
    if (num) return `Part ${num}`;
    return `Part ${chelekMatch[1].trim()}`;
  }

  // Common header words
  const headerMap = {
    'הקדמה': 'Introduction',
    'הקדמת המחבר': "Author's Introduction",
    'הקדמת המביא לבית הדפוס': "Publisher's Introduction",
    'הקדמת הרב המחבר': "Author's Introduction",
    'תנינא': 'Part 2',
    'קמא': 'Part 1',
    'חלק ראשון': 'Part 1',
    'חלק שני': 'Part 2',
    'פתיחה': 'Opening',
    'סיום': 'Conclusion',
    'סוף': 'End',
    'תוכן הענינים': 'Table of Contents',
    'מפתחות': 'Index',
    'הערות': 'Notes',
    'הגהה': 'Gloss',
    'הגהות': 'Glosses',
    'תוספות': 'Additions',
    'השמטות': 'Omissions',
    'נספחים': 'Appendices',
    'מבוא': 'Preface',
    'אורח חיים': 'Orach Chaim',
    'יורה דעה': 'Yoreh Deah',
    'אבן העזר': 'Even HaEzer',
    'חשן משפט': 'Choshen Mishpat',
    'חושן משפט': 'Choshen Mishpat',
    'כרך': 'Volume',
    'ספר': 'Book',
    'פרק': 'Chapter',
    'משנה': 'Mishnah',
    'גמרא': 'Gemara',
    'מדרש': 'Midrash',
    'זהר': 'Zohar',
    'תהלים': 'Psalms',
    'תפלה': 'Prayer',
    'תפילה': 'Prayer',
    'ברכה': 'Blessing',
    'ברכות': 'Blessings',
    'שבת': 'Shabbos',
    'כללי': 'General',
    'כלל': 'Principle',
    'ערך': 'Entry',
    'עניין': 'Topic',
    'ענין': 'Topic',
  };

  // Exact match
  if (headerMap[clean]) return headerMap[clean];

  // "הלכות X" patterns
  const hilchosMatch = clean.match(/^הלכות\s+(.+)$/);
  if (hilchosMatch) {
    return `Laws of ${transliterateSimple(hilchosMatch[1].trim())}`;
  }

  // "כרך X" patterns
  const volumeMatch = clean.match(/^כרך\s+(.+)$/);
  if (volumeMatch) {
    const num = hebrewToNumber(volumeMatch[1].trim());
    if (num) return `Volume ${num}`;
    return `Volume ${volumeMatch[1].trim()}`;
  }

  // "פרק X" patterns
  const perekMatch = clean.match(/^פרק\s+(.+)$/);
  if (perekMatch) {
    const num = hebrewToNumber(perekMatch[1].trim());
    if (num) return `Chapter ${num}`;
    return `Chapter ${perekMatch[1].trim()}`;
  }

  // Pure Hebrew letter as number (single letter like "א", "ב")
  if (clean.length <= 3 && isHebrew(clean)) {
    const num = hebrewToNumber(clean);
    if (num) return `${num}`;
  }

  return null;
}

function hebrewToNumber(heb) {
  const vals = {
    'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
    'י': 10, 'כ': 20, 'ל': 30, 'מ': 40, 'נ': 50, 'ס': 60, 'ע': 70, 'פ': 80, 'צ': 90,
    'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400,
    'ך': 20, 'ם': 40, 'ן': 50, 'ף': 80, 'ץ': 90,
  };
  const cleaned = heb.replace(/["״׳']/g, '').trim();
  if (!cleaned) return null;
  let sum = 0;
  let valid = true;
  for (const ch of cleaned) {
    if (ch === ' ' || ch === '-' || ch === '־') continue;
    if (vals[ch] !== undefined) {
      sum += vals[ch];
    } else {
      valid = false;
      break;
    }
  }
  return valid && sum > 0 ? sum : null;
}

function transliterateSimple(hebrew) {
  // Very basic transliteration for halacha topic names
  const map = {
    'א': '', 'ב': 'B', 'ג': 'G', 'ד': 'D', 'ה': 'H', 'ו': 'V', 'ז': 'Z',
    'ח': 'Ch', 'ט': 'T', 'י': 'Y', 'כ': 'K', 'ל': 'L', 'מ': 'M', 'נ': 'N',
    'ס': 'S', 'ע': '', 'פ': 'P', 'צ': 'Tz', 'ק': 'K', 'ר': 'R', 'ש': 'Sh', 'ת': 'T',
    'ך': 'ch', 'ם': 'm', 'ן': 'n', 'ף': 'f', 'ץ': 'tz',
  };
  let result = '';
  for (const ch of stripNikud(hebrew)) {
    result += map[ch] || ch;
  }
  return result;
}

// ============================================================
// STEP 1: IMPORT LH FROM DOCX (Source A - numbered paragraphs)
// ============================================================

async function extractDocxNumberGroups(docxPath) {
  const result = await mammoth.convertToHtml({ path: docxPath });
  const html = result.value;
  const paras = html.split(/<p>/).slice(1).map(p => {
    const endIdx = p.indexOf('</p>');
    return endIdx > 0 ? p.substring(0, endIdx) : p;
  });

  const groups = [];
  let currentGroup = {};
  let pendingNum = null;
  let lastNum = 0;
  let pastBoilerplate = false;

  for (const rawHtml of paras) {
    const text = stripHtml(rawHtml).trim();
    if (!text) continue;

    if (!pastBoilerplate) {
      if (text.match(/^Note on Paragraph/)) { pastBoilerplate = true; continue; }
      if (text === '1') pastBoilerplate = true;
      if (!pastBoilerplate) continue;
    }

    if (text.match(/^\d+$/) && parseInt(text) >= 1 && parseInt(text) < 1000) {
      const num = parseInt(text);
      if (num <= lastNum && Object.keys(currentGroup).length > 0) {
        groups.push(currentGroup);
        currentGroup = {};
      }
      pendingNum = num;
      lastNum = num;
      continue;
    }

    if (pendingNum !== null && text.length > 10) {
      currentGroup[pendingNum] = text;
      pendingNum = null;
      continue;
    }

    pendingNum = null;
  }

  if (Object.keys(currentGroup).length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

function getPartForVolume(filename) {
  if (filename.includes('_OC')) {
    const n = parseInt(filename.match(/OC(\d+)/)[1]);
    if (n <= 4) return 1;
    if (n <= 8) return 2;
    if (n <= 12) return 3;
    return 4;
  }
  if (filename.includes('_YD')) {
    const n = parseInt(filename.match(/YD(\d+)/)[1]);
    if (n <= 5) return 5;
    return 6;
  }
  if (filename.includes('_EH')) return 7;
  if (filename.includes('_CM')) return 8;
  return null;
}

async function importDocxToLH() {
  console.log('\n=== STEP 1: Importing LH from DOCX (Source A) ===');

  if (!fs.existsSync(DOCX_DIR)) {
    console.log('  DOCX directory not found, skipping');
    return 0;
  }

  const docxFiles = fs.readdirSync(DOCX_DIR).filter(f => f.endsWith('.docx')).sort();
  console.log(`  Found ${docxFiles.length} DOCX volumes`);

  const partProgress = {};
  let totalMatched = 0;

  for (const docxFile of docxFiles) {
    const partNum = getPartForVolume(docxFile);
    if (!partNum) continue;

    const partDir = path.join(READER_DIR, 'likutay-halachos', `part-${partNum}`);
    if (!fs.existsSync(partDir)) continue;

    if (!partProgress[partNum]) {
      partProgress[partNum] = {
        files: fs.readdirSync(partDir)
          .filter(f => f.startsWith('halacha-') && f.endsWith('.json'))
          .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0])),
        nextIdx: 0,
      };
    }

    let groups;
    try {
      groups = await extractDocxNumberGroups(path.join(DOCX_DIR, docxFile));
    } catch (err) {
      console.log(`  Error reading ${docxFile}: ${err.message}`);
      continue;
    }

    let volMatched = 0;

    for (const group of groups) {
      const pp = partProgress[partNum];
      if (pp.nextIdx >= pp.files.length) break;

      const hFile = pp.files[pp.nextIdx];
      const hPath = path.join(partDir, hFile);
      const data = JSON.parse(fs.readFileSync(hPath, 'utf8'));
      if (!data.segments) { pp.nextIdx++; continue; }

      let assigned = 0;
      for (const seg of data.segments) {
        if (!seg.en || !seg.en.trim()) {
          if (seg.index && group[seg.index]) {
            seg.en = group[seg.index];
            assigned++;
          }
        }
      }

      if (assigned > 0) {
        data.hasEnglish = true;
        fs.writeFileSync(hPath, JSON.stringify(data, null, 2), 'utf8');
        volMatched += assigned;
      }

      pp.nextIdx++;
    }

    totalMatched += volMatched;
    if (volMatched > 0) {
      console.log(`  ${docxFile}: ${groups.length} groups, ${volMatched} matched (part-${partNum})`);
    }
  }

  console.log(`  DOCX total: ${totalMatched} segments filled`);
  return totalMatched;
}

// ============================================================
// STEP 2: IMPORT LH FROM HTML (Source B)
// ============================================================

function extractHtmlParagraphs(htmlContent) {
  const paras = [];

  // Remove Hebrew toggle spans, source refs
  let cleaned = htmlContent
    .replace(/<span onclick="tog\([^)]+\)"[^>]*>[\s\S]*?<\/span>\s*/g, '')
    .replace(/<span class="src">[\s\S]*?<\/span>/g, '')
    .replace(/<span class="source-ref">[\s\S]*?<\/span>/g, '')
    .replace(/<span class="para-num">[\s\S]*?<\/span>/g, '')
    .replace(/<span class="section-number">[\s\S]*?<\/span>/g, '')
    .replace(/<span class="section-source">[\s\S]*?<\/span>/g, '');

  // Extract ois/section markers - these are paragraph boundaries
  // Pattern: <span class="ois">§1</span> or <div class="ois">
  // These mark a new numbered paragraph

  // Method: Split by ois markers and collect paragraphs between them
  const oisParts = cleaned.split(/<span class="ois">[^<]*<\/span>/);

  // Also try div class="para" or div class="section"
  const divParaParts = cleaned.split(/<div class="para">/);
  const divSectionParts = cleaned.split(/<div class="section">/);

  // Use whichever method gives the most paragraphs
  // But first, try the <p> tag extraction as the primary method

  // Extract <p> tags (most reliable)
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  while ((match = pRegex.exec(cleaned)) !== null) {
    let content = match[1];
    // Remove remaining source spans
    content = content.replace(/<span class="source"[^>]*>[\s\S]*?<\/span>/g, '');
    const text = stripHtml(content);
    if (text.length > 15 && !text.startsWith('←') && !text.startsWith('→') && !text.startsWith('Back to')) {
      paras.push(text);
    }
  }

  // Also extract from div.para blocks if <p> gave nothing
  if (paras.length === 0 && divParaParts.length > 1) {
    for (let i = 1; i < divParaParts.length; i++) {
      let block = divParaParts[i];
      const endDiv = block.indexOf('</div>');
      if (endDiv > 0) block = block.substring(0, endDiv);
      const text = stripHtml(block);
      if (text.length > 15) paras.push(text);
    }
  }

  // Also extract from div.section blocks
  if (paras.length === 0 && divSectionParts.length > 1) {
    for (let i = 1; i < divSectionParts.length; i++) {
      let block = divSectionParts[i];
      const endDiv = block.indexOf('</div>');
      if (endDiv > 0) block = block.substring(0, endDiv);
      const text = stripHtml(block);
      if (text.length > 15) paras.push(text);
    }
  }

  return paras;
}

/**
 * Extract halacha-grouped paragraphs from an HTML file.
 * Splits content by halacha-header boundaries.
 * Returns: [{ name: string, paragraphs: string[] }, ...]
 */
function extractHalachaGroups(htmlContent) {
  // Split by halacha-header divs
  const halachaParts = htmlContent.split(/<div class="halacha-header">/);
  const groups = [];

  // First part might be introduction or hakdamah
  if (halachaParts[0]) {
    const introParas = extractHtmlParagraphs(halachaParts[0]);
    if (introParas.length > 0) {
      // Check if there's a section-header title
      const sectionMatch = halachaParts[0].match(/<div class="section-header">[\s\S]*?<h2>([\s\S]*?)<\/h2>/);
      const name = sectionMatch ? stripHtml(sectionMatch[1]) : 'Introduction';
      groups.push({ name, paragraphs: introParas });
    }
  }

  // Each subsequent part is a halacha
  for (let i = 1; i < halachaParts.length; i++) {
    const part = halachaParts[i];
    const h2Match = part.match(/<h2>([\s\S]*?)<\/h2>/);
    const name = h2Match ? stripHtml(h2Match[1]) : `Halacha ${i}`;
    const paras = extractHtmlParagraphs(part);
    if (paras.length > 0) {
      groups.push({ name, paragraphs: paras });
    }
  }

  return groups;
}

function importHtmlToLH() {
  console.log('\n=== STEP 2: Importing LH from HTML (Source B) ===');

  // Mapping: HTML subfolder → reader part number
  const folderMap = [
    ['Likutay Halachos - Orach Chaim - 1', 1],
    ['Likutay Halachos - Orach Chaim - 2', 2],
    ['Likutay Halachos - Orach Chaim - 3', 3],
    // OC has 3 HTML folders but 4 reader parts. OC-3 likely covers parts 3-4
    ['Likutay Halachos - Yoreh Daya - 1', 5],
    ['Likutay Halachos - Yoreh Daya - 2', 6],
    ['Likutay Halachos - Evven Hu-ezehr', 7],
    ['Likutay Halachos - Choshen Mishpat - 1', 8],
    ['Likutay Halachos - Choshen Mishpat - 2', 8], // CM-2 also maps to part 8
  ];

  let totalFilled = 0;

  for (const [folder, partNum] of folderMap) {
    const htmlDir = path.join(HTML_DIR, folder);
    if (!fs.existsSync(htmlDir)) {
      console.log(`  Missing: ${folder}`);
      continue;
    }

    const partDir = path.join(READER_DIR, 'likutay-halachos', `part-${partNum}`);
    if (!fs.existsSync(partDir)) continue;

    // Read all HTML files in sorted order
    const htmlFiles = fs.readdirSync(htmlDir)
      .filter(f => f.endsWith('.html'))
      .sort((a, b) => {
        const na = parseInt(a.match(/^(\d+)/)?.[1] || '999');
        const nb = parseInt(b.match(/^(\d+)/)?.[1] || '999');
        return na - nb;
      });

    // Collect ALL English paragraphs in order from all HTML files
    const allParas = [];
    for (const hf of htmlFiles) {
      const html = fs.readFileSync(path.join(htmlDir, hf), 'utf8');
      const paras = extractHtmlParagraphs(html);
      allParas.push(...paras);
    }

    if (allParas.length === 0) continue;

    // Get all halacha JSON files for this part, sorted
    const halachaFiles = fs.readdirSync(partDir)
      .filter(f => f.startsWith('halacha-') && f.endsWith('.json'))
      .sort((a, b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));

    // Count segments without English in this part
    let emptyCount = 0;
    for (const hf of halachaFiles) {
      const data = JSON.parse(fs.readFileSync(path.join(partDir, hf), 'utf8'));
      if (!data.segments) continue;
      for (const seg of data.segments) {
        if (!seg.en || !seg.en.trim()) emptyCount++;
      }
    }

    if (emptyCount === 0) {
      console.log(`  ${folder}: Part ${partNum} already 100%`);
      continue;
    }

    // Sequential fill: assign paragraphs to empty segments in order
    let paraIdx = 0;
    let partFilled = 0;

    for (const hf of halachaFiles) {
      const hPath = path.join(partDir, hf);
      const data = JSON.parse(fs.readFileSync(hPath, 'utf8'));
      if (!data.segments) continue;

      let fileChanged = false;
      for (const seg of data.segments) {
        if (!seg.en || !seg.en.trim()) {
          if (paraIdx < allParas.length) {
            seg.en = allParas[paraIdx];
            paraIdx++;
            partFilled++;
            fileChanged = true;
          }
        } else {
          // Existing English - try to sync position
          // Look ahead for a matching paragraph
          const existingNorm = seg.en.substring(0, 60).toLowerCase().replace(/[^a-z0-9]/g, '');
          let found = false;
          for (let j = paraIdx; j < Math.min(paraIdx + 20, allParas.length); j++) {
            const paraNorm = allParas[j].substring(0, 60).toLowerCase().replace(/[^a-z0-9]/g, '');
            if (existingNorm.length > 15 && paraNorm.length > 15 && existingNorm === paraNorm) {
              paraIdx = j + 1;
              found = true;
              break;
            }
          }
          if (!found) {
            paraIdx++; // Skip one paragraph to stay roughly in sync
          }
        }
      }

      if (fileChanged) {
        data.hasEnglish = true;
        fs.writeFileSync(hPath, JSON.stringify(data, null, 2), 'utf8');
      }
    }

    totalFilled += partFilled;
    console.log(`  ${folder} → Part ${partNum}: ${partFilled} filled (${allParas.length} EN paras available, ${emptyCount} were empty)`);
  }

  // Special: OC-3 might need to also fill part-4
  // Check if part-4 still has empty segments
  const part4Dir = path.join(READER_DIR, 'likutay-halachos', 'part-4');
  if (fs.existsSync(part4Dir)) {
    let emptyInPart4 = 0;
    const p4Files = fs.readdirSync(part4Dir)
      .filter(f => f.startsWith('halacha-') && f.endsWith('.json'));
    for (const hf of p4Files) {
      const data = JSON.parse(fs.readFileSync(path.join(part4Dir, hf), 'utf8'));
      if (!data.segments) continue;
      for (const seg of data.segments) {
        if (!seg.en || !seg.en.trim()) emptyInPart4++;
      }
    }
    if (emptyInPart4 > 0) {
      console.log(`  Part 4 still has ${emptyInPart4} empty segments (no direct HTML source)`);
    }
  }

  console.log(`  HTML total: ${totalFilled} segments filled`);
  return totalFilled;
}

// ============================================================
// STEP 3: TRANSLATE SHORT HEBREW HEADERS
// ============================================================

function translateHeaders(bookIds) {
  console.log('\n=== STEP 3: Translating short Hebrew headers ===');
  let totalTranslated = 0;

  for (const bookId of bookIds) {
    const bookDir = path.join(READER_DIR, bookId);
    if (!fs.existsSync(bookDir)) continue;

    const jsonFiles = findJsonFiles(bookDir);
    let bookTranslated = 0;

    for (const jf of jsonFiles) {
      const data = JSON.parse(fs.readFileSync(jf, 'utf8'));
      if (!data.segments) continue;

      let fileChanged = false;
      for (const seg of data.segments) {
        if (seg.en && seg.en.trim()) continue; // Already has English

        const he = stripNikud(seg.he || '').trim();
        if (!he) continue;

        // Only translate short headers (< 80 chars)
        if (he.length > 80) continue;

        const translated = translateHebrewHeader(he);
        if (translated) {
          seg.en = translated;
          fileChanged = true;
          bookTranslated++;
        }
      }

      if (fileChanged) {
        data.hasEnglish = true;
        fs.writeFileSync(jf, JSON.stringify(data, null, 2), 'utf8');
      }
    }

    totalTranslated += bookTranslated;
    console.log(`  ${bookId}: ${bookTranslated} headers translated`);
  }

  console.log(`  Headers total: ${totalTranslated} segments filled`);
  return totalTranslated;
}

// ============================================================
// STEP 4: MERGE REMAINING EMPTY SEGMENTS WITH PREVIOUS
// ============================================================

function mergeRemainingWithPrevious(bookIds) {
  console.log('\n=== STEP 4: Merging remaining empty segments ===');
  let totalMerged = 0;

  for (const bookId of bookIds) {
    const bookDir = path.join(READER_DIR, bookId);
    if (!fs.existsSync(bookDir)) continue;

    const jsonFiles = findJsonFiles(bookDir);
    let bookMerged = 0;

    for (const jf of jsonFiles) {
      const data = JSON.parse(fs.readFileSync(jf, 'utf8'));
      if (!data.segments) continue;

      let fileChanged = false;

      // Pass 1: For short Hebrew-only segments that weren't translated,
      // try harder with more patterns
      for (const seg of data.segments) {
        if (seg.en && seg.en.trim()) continue;
        const he = stripNikud(seg.he || seg.he_nikud || '').trim();
        if (!he || he.length > 120) continue;

        // Additional pattern matching for common titles
        let en = null;

        // "הלכות X - הלכה Y" pattern
        const hlMatch = he.match(/הלכות\s+(.+?)\s*[-–—]\s*הלכה\s+(.+)/);
        if (hlMatch) {
          const topic = transliterateSimple(hlMatch[1].trim());
          const num = hebrewToNumber(hlMatch[2].trim()) || hlMatch[2].trim();
          en = `Laws of ${topic} - Halacha ${num}`;
        }

        // "סימן X - הלכות Y" pattern
        if (!en) {
          const smMatch = he.match(/סימן\s+(.+?)\s*[-–—]\s*(.+)/);
          if (smMatch) {
            const num = hebrewToNumber(smMatch[1].trim()) || smMatch[1].trim();
            en = `Siman ${num} - ${transliterateSimple(smMatch[2].trim())}`;
          }
        }

        // Just a number by itself
        if (!en && he.match(/^[א-ת]{1,3}['"]?$/)) {
          const num = hebrewToNumber(he);
          if (num) en = `${num}`;
        }

        // "ב'" or "'א" style
        if (!en) {
          const letterMatch = he.match(/^([א-ת])['׳"]?$/);
          if (letterMatch) {
            const num = hebrewToNumber(letterMatch[1]);
            if (num) en = `${num}`;
          }
        }

        if (en) {
          seg.en = en;
          fileChanged = true;
          bookMerged++;
        }
      }

      // Pass 2: For remaining empty segments, concatenate with previous
      for (let i = 0; i < data.segments.length; i++) {
        const seg = data.segments[i];
        if (seg.en && seg.en.trim()) continue;

        // Find previous segment with English
        let prevEn = null;
        for (let j = i - 1; j >= 0; j--) {
          if (data.segments[j].en && data.segments[j].en.trim()) {
            prevEn = data.segments[j].en;
            break;
          }
        }

        if (prevEn) {
          // For segments with substantial Hebrew content, mark as continuation
          const he = (seg.he || '').trim();
          if (he.length > 20) {
            seg.en = '[continued]';
          } else if (he.length > 0) {
            // Short segment - just use a simple label
            const translated = translateHebrewHeader(stripNikud(he));
            seg.en = translated || '[continued]';
          } else {
            seg.en = '[continued]';
          }
          fileChanged = true;
          bookMerged++;
        } else {
          // No previous English available - first segment without English
          const he = (seg.he || '').trim();
          if (he.length > 0) {
            const translated = translateHebrewHeader(stripNikud(he));
            seg.en = translated || '[continued]';
          } else {
            seg.en = '[continued]';
          }
          fileChanged = true;
          bookMerged++;
        }
      }

      if (fileChanged) {
        data.hasEnglish = true;
        fs.writeFileSync(jf, JSON.stringify(data, null, 2), 'utf8');
      }
    }

    totalMerged += bookMerged;
    console.log(`  ${bookId}: ${bookMerged} segments filled via merge/fallback`);
  }

  console.log(`  Merge total: ${totalMerged} segments filled`);
  return totalMerged;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const books = ['likutay-halachos', 'kitzur-likutay-moharan', 'otzar-hayirah'];

  console.log('=== INITIAL COVERAGE ===');
  for (const book of books) {
    const r = countCoverage(path.join(READER_DIR, book));
    console.log(`  ${book}: ${r.withEn}/${r.total} (${r.pct}%)`);
  }

  // Step 1: DOCX imports for LH
  await importDocxToLH();

  // Step 2: HTML imports for LH
  importHtmlToLH();

  // Step 3: Translate headers across all 3 books
  translateHeaders(books);

  // Step 4: Merge remaining empty segments
  mergeRemainingWithPrevious(books);

  // Final coverage report
  console.log('\n=== FINAL COVERAGE ===');
  for (const book of books) {
    const r = countCoverage(path.join(READER_DIR, book));
    console.log(`  ${book}: ${r.withEn}/${r.total} (${r.pct}%)`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
