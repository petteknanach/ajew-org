/**
 * Integrate English translations from Finished/ HTML files into reader JSON.
 * Handles 8 different book sources.
 */

const fs = require('fs');
const path = require('path');

const FINISHED = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';
const READER = path.join(__dirname, '..', 'public', 'reader');

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function extractParagraphs(html) {
  const paragraphs = [];

  // Extract from <p> tags
  const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  for (const p of pMatches) {
    const text = stripHtml(p).trim();
    if (text.length > 10) paragraphs.push(text);
  }

  // Also extract from <div class="text-block"> (used by Nachas Hashulchan etc.)
  const tbMatches = html.match(/<div class="text-block"[^>]*>([\s\S]*?)<\/div>/gi) || [];
  for (const tb of tbMatches) {
    const text = stripHtml(tb).trim();
    if (text.length > 10) paragraphs.push(text);
  }

  return paragraphs;
}

function extractAllBodyText(html) {
  // Fallback: extract ALL text from body, stripping tags
  let clean = html;
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove translator notes
  clean = clean.replace(/<div class="translator-section[\s\S]*?(?=<\/div>\s*<\/div>|$)/gi, '');
  clean = clean.replace(/<div class="tn"[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="translator-note[\s\S]*?<\/div>/gi, '');
  // Remove color keys, footers, headers
  clean = clean.replace(/<div class="color-key[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="doc-footer[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="ms-footer[\s\S]*?<\/div>/gi, '');

  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) clean = bodyMatch[1];

  return stripHtml(clean);
}

function extractBodyText(html) {
  // Remove script/style blocks
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove translator notes and theme sections
  clean = clean.replace(/<div class="translator-section[\s\S]*?(?=<\/div>\s*<\/div>|$)/gi, '');
  clean = clean.replace(/<div class="tn"[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="translator-note[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="doc-footer[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="ms-footer[\s\S]*?<\/div>/gi, '');
  clean = clean.replace(/<div class="color-key[\s\S]*?<\/div>/gi, '');

  // Extract paragraphs from body content
  const paras = extractParagraphs(clean);

  // If very little extracted, use fallback full body extraction
  const totalLen = paras.reduce((s, p) => s + p.length, 0);
  if (totalLen < 500) {
    const fullText = extractAllBodyText(html);
    if (fullText.length > totalLen) {
      return [fullText];
    }
  }

  return paras;
}

function extractLetterBody(html) {
  // For letter-type HTML files (Alim LiTrufa, R' Nosson), extract just the letter body
  let clean = html;

  // Remove translator sections
  clean = clean.replace(/<div class="translator-section[\s\S]*$/gi, '');
  clean = clean.replace(/<div class="ms-footer[\s\S]*$/gi, '');

  // Get letter-body content
  const bodyMatch = clean.match(/<div class="letter-body">([\s\S]*?)(?:<div class="closing|<div class="translator|<div class="ms-footer|$)/i);
  if (bodyMatch) {
    clean = bodyMatch[1];
  }

  return extractParagraphs(clean);
}

function findSentenceBoundary(text, pos) {
  for (let i = pos; i < Math.min(pos + 200, text.length); i++) {
    if (text[i] === '.' && (text[i + 1] === ' ' || i === text.length - 1)) return i + 1;
  }
  for (let i = pos; i > Math.max(pos - 200, 0); i--) {
    if (text[i] === '.' && text[i + 1] === ' ') return i + 1;
  }
  return pos;
}

function distributeToSegments(enText, segments) {
  const contentSegs = segments.filter(s => {
    const he = (s.he_nikud || s.he || '').trim();
    return he.length > 3;
  });

  if (contentSegs.length === 0 || !enText.trim()) return;

  const totalHe = contentSegs.reduce((s, seg) => s + (seg.he_nikud || seg.he || '').length, 0);
  if (totalHe === 0) return;

  let pos = 0;
  for (let j = 0; j < contentSegs.length; j++) {
    const heLen = (contentSegs[j].he_nikud || contentSegs[j].he || '').length;
    if (j === contentSegs.length - 1) {
      contentSegs[j].en = enText.substring(pos).trim();
    } else {
      const proportion = heLen / totalHe;
      const targetEnd = pos + Math.floor(enText.length * proportion);
      const splitAt = findSentenceBoundary(enText, targetEnd);
      contentSegs[j].en = enText.substring(pos, splitAt).trim();
      pos = splitAt;
    }
  }
}

function updateJsonFile(filePath, englishText) {
  if (!fs.existsSync(filePath)) return false;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!data.segments || data.segments.length === 0) return false;

  distributeToSegments(englishText, data.segments);
  data.hasEnglish = true;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

// ═══════════════════════════════════════════════════════════
// 1. ULIM LITRUFA 89-151 & 152-226
// ═══════════════════════════════════════════════════════════

function integrateAlimLitrufa() {
  console.log('\n=== Ulim LiTrufa ===');

  const folders = [
    path.join(FINISHED, 'Ullim litrufa 89-151'),
    path.join(FINISHED, 'Ulim litrufa 152-226'),
  ];

  let count = 0;

  for (const folder of folders) {
    if (!fs.existsSync(folder)) { console.log('  Folder not found: ' + folder); continue; }

    const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html'));
    console.log('  ' + path.basename(folder) + ': ' + htmlFiles.length + ' HTML files');

    for (const file of htmlFiles) {
      // Extract letter number from filename like ullim_letroofah_letter_152.html
      const numMatch = file.match(/letter_(\d+)/i);
      if (!numMatch) continue;
      const letterNum = parseInt(numMatch[1]);

      const html = fs.readFileSync(path.join(folder, file), 'utf8');
      const paragraphs = extractLetterBody(html);
      if (paragraphs.length === 0) continue;

      const enText = paragraphs.join('\n\n');

      // Find the matching reader file - check all parts
      let found = false;
      for (const part of ['part-1', 'part-2', 'part-3', 'part-4', 'part-5', 'part-6']) {
        const readerFile = path.join(READER, 'alim-litrufa', part, 'letter-' + letterNum + '.json');
        if (fs.existsSync(readerFile)) {
          // Check if already has English
          const d = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
          const hasEn = d.segments?.some(s => s.en?.trim()?.length > 20);
          if (!hasEn) {
            if (updateJsonFile(readerFile, enText)) {
              count++;
              found = true;
            }
          } else {
            found = true; // Already has English, skip
          }
          break;
        }
      }

      if (!found) {
        // Try matching by the Hebrew letter number title
        // Some letters might have different numbering
      }
    }
  }

  console.log('  Integrated: ' + count + ' new letters');
}

// ═══════════════════════════════════════════════════════════
// 2. LIKUTAY MOHARAN 11-17 (Replace bad translations)
// ═══════════════════════════════════════════════════════════

function integrateLM1117() {
  console.log('\n=== Likutay Moharan 11-17 ===');

  const folder = path.join(FINISHED, 'Likuaty Moharan 11-17');
  if (!fs.existsSync(folder)) { console.log('  Folder not found'); return; }

  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();
  console.log('  ' + htmlFiles.length + ' HTML files');

  let count = 0;
  for (const file of htmlFiles) {
    // Extract torah number from filename like likutay_moharan_torah_11_expanded.html
    const numMatch = file.match(/torah_(\d+)/i);
    if (!numMatch) continue;
    const torahNum = parseInt(numMatch[1]);

    const html = fs.readFileSync(path.join(folder, file), 'utf8');

    // These are rich HTML with section headings. Extract all body text.
    const paragraphs = extractBodyText(html);
    if (paragraphs.length === 0) continue;

    const enText = paragraphs.join('\n\n');

    const readerFile = path.join(READER, 'likutay-moharan', 'part-1', 'torah-' + torahNum + '.json');
    if (fs.existsSync(readerFile)) {
      const data = JSON.parse(fs.readFileSync(readerFile, 'utf8'));
      // Clear existing English
      data.segments.forEach(s => s.en = '');
      // Redistribute new translation
      distributeToSegments(enText, data.segments);
      data.hasEnglish = true;
      fs.writeFileSync(readerFile, JSON.stringify(data, null, 2), 'utf8');
      count++;
      console.log('  Torah ' + torahNum + ': ' + enText.length + ' chars → ' + data.segments.length + ' segments');
    }
  }

  console.log('  Replaced: ' + count + ' torahs');
}

// ═══════════════════════════════════════════════════════════
// 3. GENERIC BOOK INTEGRATOR
// For books where HTML files cover sections of the book
// ═══════════════════════════════════════════════════════════

function integrateGenericBook(folderName, readerDir, label) {
  console.log('\n=== ' + label + ' ===');

  const folder = path.join(FINISHED, folderName);
  if (!fs.existsSync(folder)) { console.log('  Folder not found: ' + folderName); return; }

  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();
  console.log('  ' + htmlFiles.length + ' HTML files');

  // Read all HTML files and concatenate their body text
  let allEnglish = '';
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(folder, file), 'utf8');
    const paragraphs = extractBodyText(html);
    if (paragraphs.length > 0) {
      allEnglish += paragraphs.join('\n\n') + '\n\n';
    }
  }

  console.log('  Total English: ' + allEnglish.length + ' chars');

  // Find all reader JSON files
  const readerPath = path.join(READER, readerDir);
  if (!fs.existsSync(readerPath)) { console.log('  Reader dir not found: ' + readerDir); return; }

  // Get all JSON files (may be in subdirectories)
  const jsonFiles = [];
  function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isDirectory()) walkDir(fp);
      else if (f.endsWith('.json') && f !== 'index.json') jsonFiles.push(fp);
    });
  }
  walkDir(readerPath);
  jsonFiles.sort();

  // Collect all segments from all files
  const allSegments = [];
  const fileMap = []; // Track which segments belong to which file

  for (const jf of jsonFiles) {
    const data = JSON.parse(fs.readFileSync(jf, 'utf8'));
    if (!data.segments) continue;

    const startIdx = allSegments.length;
    data.segments.forEach(s => allSegments.push(s));
    fileMap.push({ file: jf, startIdx, endIdx: allSegments.length, data });
  }

  console.log('  Total segments: ' + allSegments.length + ' across ' + jsonFiles.length + ' files');

  // Distribute English across all segments
  distributeToSegments(allEnglish.trim(), allSegments);

  // Write back to files
  let count = 0;
  for (const fm of fileMap) {
    const segments = allSegments.slice(fm.startIdx, fm.endIdx);
    const hasEn = segments.some(s => s.en?.trim()?.length > 10);
    fm.data.segments = segments;
    if (hasEn) fm.data.hasEnglish = true;
    fs.writeFileSync(fm.file, JSON.stringify(fm.data, null, 2), 'utf8');
    if (hasEn) count++;
  }

  console.log('  Updated: ' + count + '/' + jsonFiles.length + ' files with English');
}

// ═══════════════════════════════════════════════════════════
// 4. R' NOSSON BEN R' YEHUDA (Letters)
// ═══════════════════════════════════════════════════════════

function integrateRNossonLetters() {
  console.log('\n=== R\' Nosson ben R\' Yehuda ===');

  const folder = path.join(FINISHED, 'Rabbi Nussun ben Rabbi Yehuda - 55');
  if (!fs.existsSync(folder)) { console.log('  Folder not found'); return; }

  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();
  console.log('  ' + htmlFiles.length + ' HTML files');

  // These contain multiple letters per file. Need to split by letter headings.
  let allEnglish = '';
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(folder, file), 'utf8');
    const paragraphs = extractBodyText(html);
    allEnglish += paragraphs.join('\n\n') + '\n\n';
  }

  console.log('  Total English: ' + allEnglish.length + ' chars');

  // Use generic approach - distribute across all reader files
  const readerDir = 'nosson-by-מכתבי-ר--נתן-ב--ר-יה';
  const readerPath = path.join(READER, readerDir);
  if (!fs.existsSync(readerPath)) { console.log('  Reader dir not found'); return; }

  const jsonFiles = fs.readdirSync(readerPath)
    .filter(f => f.endsWith('.json') && f !== 'index.json')
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || 0);
      const nb = parseInt(b.match(/\d+/)?.[0] || 0);
      return na - nb;
    });

  // Distribute proportionally across all files
  const allSegments = [];
  const fileMap = [];

  for (const jf of jsonFiles) {
    const fp = path.join(readerPath, jf);
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!data.segments) continue;
    const startIdx = allSegments.length;
    data.segments.forEach(s => allSegments.push(s));
    fileMap.push({ file: fp, startIdx, endIdx: allSegments.length, data });
  }

  distributeToSegments(allEnglish.trim(), allSegments);

  let count = 0;
  for (const fm of fileMap) {
    const segments = allSegments.slice(fm.startIdx, fm.endIdx);
    const hasEn = segments.some(s => s.en?.trim()?.length > 10);
    fm.data.segments = segments;
    if (hasEn) fm.data.hasEnglish = true;
    fs.writeFileSync(fm.file, JSON.stringify(fm.data, null, 2), 'utf8');
    if (hasEn) count++;
  }

  console.log('  Updated: ' + count + '/' + jsonFiles.length + ' files with English');
}

// ═══════════════════════════════════════════════════════════
// 5. PARPARAOS LACHUCHMUH (Commentary on LM)
// ═══════════════════════════════════════════════════════════

function integrateParparaos() {
  console.log('\n=== Parparaos LaChuchmuh ===');

  const folder = path.join(FINISHED, 'Parparaos LaChuchmuh');
  if (!fs.existsSync(folder)) { console.log('  Folder not found'); return; }

  const htmlFiles = fs.readdirSync(folder).filter(f => f.endsWith('.html')).sort();
  console.log('  ' + htmlFiles.length + ' HTML files');

  // Parparaos is commentary on LM, organized by siman
  // Reader files are torah-{n}.json
  // HTML files are numbered 010, 020, etc. - need to extract siman numbers from content

  let allEnglish = '';
  for (const file of htmlFiles) {
    const html = fs.readFileSync(path.join(folder, file), 'utf8');
    const paragraphs = extractBodyText(html);
    allEnglish += paragraphs.join('\n\n') + '\n\n';
  }

  console.log('  Total English: ' + allEnglish.length + ' chars');

  // Use generic approach
  integrateGenericBook('Parparaos LaChuchmuh', 'parparos-lechochma', 'Parparaos LaChuchmuh (generic)');
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════

console.log('╔══════════════════════════════════════════════╗');
console.log('║  Integrating Finished Translations           ║');
console.log('╚══════════════════════════════════════════════╝');

// 1. Ulim LiTrufa (simple 1:1 letter mapping)
integrateAlimLitrufa();

// 2. LM 11-17 (replace bad translations)
integrateLM1117();

// 3. Generic books (concatenate all HTML, distribute across all segments)
integrateGenericBook('Nachas Hashulchan', 'nachas-hashulchan', 'Nachas Hashulchan');
integrateGenericBook('Yikara diShabata', 'yikra-dshabbata', 'Yikara diShabata');
integrateGenericBook('Zimras HaAretz', 'zimras-haaretz', 'Zimras HaAretz');
integrateGenericBook('Kuntrass Hatzairufim', 'nosson-by-קונטרס-הצרופים', 'Kuntrass Hatzairufim');
integrateGenericBook('Parparaos LaChuchmuh', 'parparos-lechochma', 'Parparaos LaChuchmuh');

// 4. R' Nosson letters
integrateRNossonLetters();

// Also integrate remaining Oatzar volumes if available
integrateGenericBook('Oatzar 2', 'otzar-hayirah', 'Oatzar HaYirah Vol 2');
integrateGenericBook('Oatzar 4', 'otzar-hayirah', 'Oatzar HaYirah Vol 4');
integrateGenericBook('Likutay Aitzos Mahadura Basra', 'likutay-eitzos-basra', 'Likutay Aitzos MB');
integrateGenericBook('Yerech HaAisunim', 'yereach-haeitanim', 'Yerech HaAisunim');
integrateGenericBook('Yimay Moharnat', 'yemei-moharnat', 'Yimay Moharnat');

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║  Done!                                        ║');
console.log('╚══════════════════════════════════════════════╝');
