/**
 * Parse "for ajew" docx/odt files into reader JSON format.
 * These are English-only books to add to the reader.
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { execSync } = require('child_process');

const READER_DIR = path.join(__dirname, '../public/reader');
const SOURCE_DIR = 'C:/Users/Pettek/Documents/for ajew';

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
    .trim();
}

async function extractFromDocx(filePath) {
  const result = await mammoth.convertToHtml({ path: filePath });
  return result.value;
}

function extractFromOdt(filePath) {
  // Use pandoc for ODT
  const html = execSync(`pandoc "${filePath}" -t html`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return html;
}

function splitIntoChapters(html) {
  // Split by headings (h1, h2, h3) to create chapters
  const chapters = [];
  // Split on heading tags
  const parts = html.split(/(<h[1-3][^>]*>.*?<\/h[1-3]>)/gs);

  let currentTitle = '';
  let currentContent = '';

  for (const part of parts) {
    const headingMatch = part.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/s);
    if (headingMatch) {
      // Save previous chapter
      if (currentContent.trim()) {
        chapters.push({ title: currentTitle || 'Introduction', content: currentContent });
      }
      currentTitle = stripHtml(headingMatch[1]).trim();
      currentContent = '';
    } else {
      currentContent += part;
    }
  }
  // Save last chapter
  if (currentContent.trim()) {
    chapters.push({ title: currentTitle || 'Content', content: currentContent });
  }

  return chapters;
}

function htmlToSegments(html) {
  const segments = [];
  // Split by paragraphs
  const pRegex = /<p[^>]*>(.*?)<\/p>/gs;
  let match;
  while ((match = pRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]).replace(/\s+/g, ' ').trim();
    if (text && text.length > 5) {
      segments.push({ en: text, he: '' });
    }
  }

  // If no <p> tags, split by double newlines or <br>
  if (segments.length === 0) {
    const plainText = stripHtml(html);
    const paras = plainText.split(/\n\s*\n/).filter(p => p.trim().length > 5);
    for (const p of paras) {
      segments.push({ en: p.trim(), he: '' });
    }
  }

  return segments;
}

async function processBook(filename, bookId, bookTitle, heTitle) {
  const filePath = path.join(SOURCE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${filename} not found`);
    return;
  }

  console.log(`\n=== ${bookTitle} (${bookId}) ===`);

  let html;
  if (filename.endsWith('.odt')) {
    html = extractFromOdt(filePath);
  } else {
    html = await extractFromDocx(filePath);
  }

  const chapters = splitIntoChapters(html);
  console.log(`  Chapters found: ${chapters.length}`);

  const outDir = path.join(READER_DIR, bookId);
  fs.mkdirSync(outDir, { recursive: true });

  const indexEntries = [];
  let totalSegments = 0;

  // If only 1 "chapter" (no headings), split by paragraph count (~20 per section)
  if (chapters.length <= 1 && chapters[0]) {
    const allSegments = htmlToSegments(chapters[0].content);
    console.log(`  Single chapter with ${allSegments.length} paragraphs — splitting into sections`);

    const PARAS_PER_SECTION = 20;
    let sectionNum = 0;
    for (let i = 0; i < allSegments.length; i += PARAS_PER_SECTION) {
      sectionNum++;
      const sectionSegments = allSegments.slice(i, i + PARAS_PER_SECTION);
      const title = sectionNum === 1 ? bookTitle : `${bookTitle} - Part ${sectionNum}`;

      const data = {
        bookId,
        part: 1,
        torah: sectionNum,
        title,
        hebrewTitle: heTitle || '',
        hasEnglish: true,
        segments: sectionSegments,
      };

      fs.writeFileSync(path.join(outDir, `section-${sectionNum}.json`), JSON.stringify(data, null, 2), 'utf8');
      indexEntries.push({ torah: sectionNum, title, hebrewTitle: heTitle || '', hasEnglish: true });
      totalSegments += sectionSegments.length;
    }
  } else {
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const segments = htmlToSegments(chapter.content);
      if (segments.length === 0) continue;

      const sectionNum = i + 1;
      const data = {
        bookId,
        part: 1,
        torah: sectionNum,
        title: chapter.title,
        hebrewTitle: heTitle || '',
        hasEnglish: true,
        segments,
      };

      fs.writeFileSync(path.join(outDir, `section-${sectionNum}.json`), JSON.stringify(data, null, 2), 'utf8');
      indexEntries.push({ torah: sectionNum, title: chapter.title, hebrewTitle: heTitle || '', hasEnglish: true });
      totalSegments += segments.length;
      console.log(`  [${sectionNum}] ${chapter.title.substring(0, 60)} — ${segments.length} segments`);
    }
  }

  // Write index
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ torahs: indexEntries }, null, 2), 'utf8');
  console.log(`  Total: ${indexEntries.length} sections, ${totalSegments} segments`);
}

async function main() {
  const books = [
    {
      file: 'Azamra with Rabbi Nachman who he was and what he said SECOND EDITION.docx',
      id: 'azamra',
      title: 'Azamra / Rabbi Nachman: Who He Was',
      heTitle: 'אזמרה',
    },
    {
      file: 'Fires of Israel for word.docx',
      id: 'fires-of-israel',
      title: 'Fires of Israel',
      heTitle: 'אשי ישראל',
    },
    {
      file: 'Hisbodidus Alone Time - likutay aitzos - added verses meditation.docx',
      id: 'hisbodidus-alone-time',
      title: 'Hisbodidus - Alone Time',
      heTitle: 'התבודדות',
    },
    {
      file: 'THE SEVEN PILLARS by Reb Yitzohok Breiter.docx',
      id: 'seven-pillars',
      title: 'The Seven Pillars',
      heTitle: 'שבעה עמודי האמונה',
    },
    {
      file: 'The Praises of Rabbi Nachman - Shivchai Haran - Part 1 - for ajew.docx',
      id: 'praises-of-rabbi-nachman',
      title: 'The Praises of Rabbi Nachman',
      heTitle: 'שבחי הר"ן',
    },
  ];

  for (const book of books) {
    await processBook(book.file, book.id, book.title, book.heTitle);
  }

  console.log('\n=== Done! ===');
}

main().catch(console.error);
