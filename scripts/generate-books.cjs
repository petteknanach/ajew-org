/**
 * Generate multiple Breslov books for Amazon KDP hardcover
 * Size: 6.69 x 9.61 inches (Crown Quarto)
 * Format: .docx
 *
 * Usage:
 *   node scripts/generate-books.cjs              # all books
 *   node scripts/generate-books.cjs sichos        # specific book
 */

const { Document, Packer, Paragraph, TextRun, Header, Footer,
        AlignmentType, HeadingLevel, PageBreak, PageNumber,
        BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const OUTPUT_DIR = path.join(__dirname, '..');

const PAGE_WIDTH = Math.round(6.69 * 1440);
const PAGE_HEIGHT = Math.round(9.61 * 1440);
const MARGIN_TOP = 1080;
const MARGIN_BOTTOM = 1080;
const MARGIN_LEFT = 1152;
const MARGIN_RIGHT = 1152;
const MARGIN_GUTTER = 288;

const args = process.argv.slice(2);
const targetBook = args[0];

function stripHtml(text) {
  return (text || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function createTitlePage(title, hebrewTitle, subtitle, author) {
  return [
    new Paragraph({ spacing: { before: 3500 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: hebrewTitle, font: 'Times New Roman', size: 52, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: title.toUpperCase(), font: 'Georgia', size: 44, bold: true })],
    }),
    ...(subtitle ? [new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: subtitle, font: 'Georgia', size: 22, italics: true, color: '555555' })],
    })] : []),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 600, after: 100 },
      children: [new TextRun({ text: `By ${author}`, font: 'Georgia', size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 1200 },
      children: [new TextRun({ text: 'נ נח נחמ נחמן מאומן', font: 'Times New Roman', size: 28, bold: true, color: '333333' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 200 },
      children: [new TextRun({ text: 'Na Nach Nachma Nachman MeUman', font: 'Georgia', size: 20, color: '555555' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 1500 },
      children: [new TextRun({ text: 'ajew.org', font: 'Georgia', size: 22, bold: true })],
    }),
  ];
}

function createCopyrightPage(title) {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ spacing: { before: 6000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: title, font: 'Georgia', size: 22, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: 'English Translation', font: 'Georgia', size: 20, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: 'Published by ajew.org — Freely available at ajew.org/reader', font: 'Georgia', size: 16, color: '777777' })],
    }),
  ];
}

function loadSegments(bookId, filePrefix) {
  const allSegments = [];
  const bookDir = path.join(READER_DIR, bookId);

  // Check for flat structure (no part-N subdirs)
  const flatFiles = fs.existsSync(bookDir) ?
    fs.readdirSync(bookDir).filter(f => f.startsWith(filePrefix) && f.endsWith('.json')) : [];

  if (flatFiles.length > 0 && !fs.existsSync(path.join(bookDir, 'part-1'))) {
    // Flat structure
    const sorted = flatFiles.sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || 0);
      const nb = parseInt(b.match(/\d+/)?.[0] || 0);
      return na - nb;
    });
    for (const f of sorted) {
      const d = JSON.parse(fs.readFileSync(path.join(bookDir, f), 'utf8'));
      allSegments.push(d);
    }
  } else {
    // Part structure
    for (let p = 1; p <= 10; p++) {
      const partDir = path.join(bookDir, `part-${p}`);
      if (!fs.existsSync(partDir)) continue;
      const files = fs.readdirSync(partDir)
        .filter(f => f.startsWith(filePrefix) && f.endsWith('.json'))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] || 0);
          const nb = parseInt(b.match(/\d+/)?.[0] || 0);
          return na - nb;
        });
      for (const f of files) {
        const d = JSON.parse(fs.readFileSync(path.join(partDir, f), 'utf8'));
        d._part = p;
        allSegments.push(d);
      }
    }
  }
  return allSegments;
}

async function generateBook(config) {
  console.log(`\nGenerating: ${config.title}...`);
  const items = loadSegments(config.bookId, config.filePrefix);

  const allChildren = [];
  allChildren.push(...createTitlePage(config.title, config.hebrewTitle, config.subtitle, config.author));
  allChildren.push(...createCopyrightPage(config.title));

  let totalWithEn = 0;
  let currentPart = null;

  for (const item of items) {
    // Part divider
    if (config.showParts && item._part && item._part !== currentPart) {
      currentPart = item._part;
      allChildren.push(new Paragraph({ children: [new PageBreak()] }));
      allChildren.push(new Paragraph({ spacing: { before: 3000 }, children: [] }));
      allChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { after: 400 },
        children: [new TextRun({ text: `Part ${currentPart}`, font: 'Georgia', size: 40, bold: true })],
      }));
    }

    // Check if this item has English
    const englishSegs = item.segments?.filter(s => s.en && stripHtml(s.en).length > 10) || [];
    if (englishSegs.length === 0) continue;

    // Item heading
    allChildren.push(new Paragraph({ children: [new PageBreak()] }));

    const itemTitle = item.title || item.hebrewTitle || `${config.itemLabel} ${item.torah || item.displayNumber}`;
    const itemHebrew = item.hebrewTitle || '';

    if (itemHebrew) {
      allChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: itemHebrew, font: 'Times New Roman', size: 32, bold: true })],
      }));
    }

    allChildren.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: itemTitle, font: 'Georgia', size: 26, bold: true })],
    }));

    allChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 300 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA', space: 8 } },
      children: [],
    }));

    // English content
    for (const seg of englishSegs) {
      const en = stripHtml(seg.en);
      totalWithEn++;

      allChildren.push(new Paragraph({
        spacing: { after: 160 },
        indent: { firstLine: 360 },
        children: [new TextRun({ text: en, font: 'Georgia', size: 21 })],
      }));
    }
  }

  if (totalWithEn === 0) {
    console.log(`  Skipped: no English content`);
    return null;
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Georgia', size: 21 } } },
      paragraphStyles: [
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 26, bold: true, font: 'Georgia' },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
          margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT, gutter: MARGIN_GUTTER },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: config.title, font: 'Georgia', size: 16, italics: true, color: '999999' })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], font: 'Georgia', size: 18 })],
          })],
        }),
      },
      children: allChildren,
    }],
  });

  const outputPath = path.join(OUTPUT_DIR, `${config.filename}.docx`);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  // Copy to Documents
  const docsDest = `C:/Users/Pettek/Documents/Claude Desktop projects/${config.filename}.docx`;
  fs.copyFileSync(outputPath, docsDest);

  console.log(`  ${totalWithEn} paragraphs, ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Saved: ${docsDest}`);
  return outputPath;
}

const BOOKS = [
  {
    key: 'sichos',
    title: 'Sichos HaRan',
    hebrewTitle: 'שִׂיחוֹת הָרַ"ן',
    subtitle: 'The Conversations of Rabbi Nachman',
    author: 'Rabbi Nachman of Breslov',
    bookId: 'sichos-haran',
    filePrefix: 'sicha-',
    itemLabel: 'Sicha',
    filename: 'Sichos-HaRan-English',
    showParts: false,
  },
  {
    key: 'meshivas',
    title: 'Meshivas Nefesh',
    hebrewTitle: 'מְשִׁיבַת נֶפֶשׁ',
    subtitle: 'Revival of the Soul — Compiled from Likutay Halachos',
    author: 'Rabbi Alter of Teplik',
    bookId: 'meshivas-nefesh',
    filePrefix: 'section-',
    itemLabel: 'Section',
    filename: 'Meshivas-Nefesh-English',
    showParts: false,
  },
  {
    key: 'kitzur',
    title: 'Kitzur Likutay Moharan',
    hebrewTitle: 'קִצּוּר לִקּוּטֵי מוֹהֲרַ"ן',
    subtitle: 'Abridged Likutay Moharan',
    author: 'Rabbi Nachman of Breslov',
    bookId: 'kitzur-likutay-moharan',
    filePrefix: 'torah-',
    itemLabel: 'Torah',
    filename: 'Kitzur-Likutay-Moharan-English',
    showParts: true,
  },
  {
    key: 'ebay',
    title: 'Ebay HaNachal',
    hebrewTitle: 'אֶבֶ"י הַנַּחַל',
    subtitle: 'Blossoms of the Stream — The Holy Letters of Saba Yisroel',
    author: 'Rabbi Yisroel Dov Odesser',
    bookId: 'ebay-hanachal',
    filePrefix: 'letter-',
    itemLabel: 'Letter',
    filename: 'Ebay-HaNachal-English',
    showParts: true,
  },
];

async function main() {
  const toGenerate = targetBook
    ? BOOKS.filter(b => b.key.includes(targetBook.toLowerCase()))
    : BOOKS;

  if (toGenerate.length === 0) {
    console.log('Available books:', BOOKS.map(b => b.key).join(', '));
    return;
  }

  for (const book of toGenerate) {
    await generateBook(book);
  }

  console.log('\nAll books generated!');
}

main().catch(e => { console.error(e); process.exit(1); });
