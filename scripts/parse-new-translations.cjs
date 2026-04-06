/**
 * Parse new translation HTML files into reader JSON format.
 * Handles: Adir Bamuroam, Aitzoas Hamivooaroas, Aitzoas Yeshuroas, Gevuros Shimshon
 *
 * These are English translations with inline Hebrew terms.
 * Output: reader JSON with segments containing {en, he (from inline Hebrew)}
 */
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '../public/reader');

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

function extractHebrewFromHtml(html) {
  // Extract text from .heb spans
  const hebrewParts = [];
  const regex = /class="heb[^"]*"[^>]*>(.*?)<\/span>/gs;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const heb = stripHtml(match[1]).trim();
    if (heb) hebrewParts.push(heb);
  }
  return hebrewParts.join(' ');
}

function parseHtmlFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');

  // Extract title
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? stripHtml(titleMatch[1]) : path.basename(filePath, '.html');

  // Extract Hebrew title from .chapter-title-heb or similar
  const hebTitleMatch = html.match(/class="chapter-title-heb[^"]*"[^>]*>(.*?)<\/(?:div|h[1-6])>/s);
  const hebrewTitle = hebTitleMatch ? stripHtml(hebTitleMatch[1]) : '';

  // Extract paragraphs
  const segments = [];

  // Split by <p> tags - each becomes a segment
  const pRegex = /<p[^>]*>(.*?)<\/p>/gs;
  let pMatch;
  while ((pMatch = pRegex.exec(html)) !== null) {
    const pHtml = pMatch[1];
    const english = stripHtml(pHtml).trim();
    if (!english || english.length < 10) continue;

    // Skip navigation/boilerplate
    if (english.startsWith('←') || english.startsWith('→') || english.startsWith('Back to')) continue;
    if (english.includes('Chapter') && english.length < 30 && !english.includes('.')) continue;

    // Extract inline Hebrew
    const hebrew = extractHebrewFromHtml(pHtml);

    segments.push({
      he: hebrew || '',
      en: english,
    });
  }

  // Also check for section headings
  const headingRegex = /class="section-heading[^"]*"[^>]*>(.*?)<\/(?:div|h[1-6]|p)>/gs;
  // (headings are already captured via <p> tags in most cases)

  return { title, hebrewTitle, segments };
}

function processFolder(srcDir, bookId, bookTitle, hebrewBookTitle) {
  const outDir = path.join(READER_DIR, bookId);
  fs.mkdirSync(outDir, { recursive: true });

  const htmlFiles = fs.readdirSync(srcDir)
    .filter(f => f.endsWith('.html'))
    .sort();

  console.log(`\n=== ${bookTitle} (${bookId}) ===`);
  console.log(`  Source: ${srcDir}`);
  console.log(`  Files: ${htmlFiles.length}`);

  const indexEntries = [];
  let totalSegments = 0;

  for (let i = 0; i < htmlFiles.length; i++) {
    const filePath = path.join(srcDir, htmlFiles[i]);
    const { title, hebrewTitle, segments } = parseHtmlFile(filePath);

    if (segments.length === 0) {
      console.log(`  SKIP: ${htmlFiles[i]} — no segments`);
      continue;
    }

    const sectionNum = i + 1;
    const data = {
      bookId,
      part: 1,
      torah: sectionNum,
      title,
      hebrewTitle: hebrewTitle || '',
      hasEnglish: true,
      segments,
    };

    const outFile = path.join(outDir, `section-${sectionNum}.json`);
    fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');

    indexEntries.push({
      torah: sectionNum,
      title,
      hebrewTitle: hebrewTitle || '',
      hasEnglish: true,
    });

    totalSegments += segments.length;
    console.log(`  [${sectionNum}] ${title.substring(0, 50)} — ${segments.length} segments`);
  }

  // Write index
  const indexData = { torahs: indexEntries };
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');

  console.log(`  Total: ${indexEntries.length} sections, ${totalSegments} segments`);
  return indexEntries.length;
}

// Process all 4 new folders
const BASE = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished';

const folders = [
  {
    src: path.join(BASE, 'Adir Bamuroam'),
    id: 'ramchal-adir-bamuroam',
    title: 'Adir BaMurom',
    heTitle: 'אדיר במרום',
  },
  {
    src: path.join(BASE, 'Aitzoas Hamivooaroas'),
    id: 'aitzoas-hamivooaroas',
    title: 'Aitzoas HaMivooaroas',
    heTitle: 'עצות המבוארות',
  },
  {
    src: path.join(BASE, 'Aitzoas Yeshuroas'),
    id: 'aitzoas-yeshuroas',
    title: 'Aitzoas Yesharoas',
    heTitle: 'עצות ישרות',
  },
  {
    src: path.join(BASE, 'Gevuros Shimshon'),
    id: 'gevuros-shimshon',
    title: 'Gevuros Shimshon',
    heTitle: 'גבורות שמשון',
  },
];

let totalBooks = 0;
for (const folder of folders) {
  if (fs.existsSync(folder.src)) {
    processFolder(folder.src, folder.id, folder.title, folder.heTitle);
    totalBooks++;
  } else {
    console.log(`SKIP: ${folder.src} not found`);
  }
}

console.log(`\n=== Done: ${totalBooks} books parsed ===`);
