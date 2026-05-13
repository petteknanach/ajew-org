/**
 * Generate Chumash with Likutey Halachos book for Amazon KDP hardcover
 * Size: 6.69 x 9.61 inches (Crown Quarto)
 * Format: .docx
 */

const { Document, Packer, Paragraph, TextRun, Header, Footer,
        AlignmentType, HeadingLevel, PageBreak, PageNumber,
        BorderStyle, TabStopType, TabStopPosition } = require('docx');
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'chumash-lh');
const OUTPUT = path.join(__dirname, '..', 'Chumash-with-Likutey-Halachos.docx');

// Page size: 6.69 x 9.61 inches in DXA (1 inch = 1440 DXA)
const PAGE_WIDTH = Math.round(6.69 * 1440);  // 9634
const PAGE_HEIGHT = Math.round(9.61 * 1440); // 13838
const MARGIN_TOP = 1080;    // 0.75 inch
const MARGIN_BOTTOM = 1080;
const MARGIN_LEFT = 1152;   // 0.8 inch
const MARGIN_RIGHT = 1152;
const MARGIN_GUTTER = 288;  // 0.2 inch gutter for binding

const CHUMASHIM = [
  { part: 1, name: 'Bereishis', hebrew: 'בְּרֵאשִׁית', english: 'Genesis' },
  { part: 2, name: 'Shemos', hebrew: 'שְׁמוֹת', english: 'Exodus' },
  { part: 3, name: 'Vayikra', hebrew: 'וַיִּקְרָא', english: 'Leviticus' },
  { part: 4, name: 'Bamidbar', hebrew: 'בְּמִדְבָּר', english: 'Numbers' },
  { part: 5, name: 'Devarim', hebrew: 'דְּבָרִים', english: 'Deuteronomy' },
  { part: 6, name: 'Holidays', hebrew: 'מוֹעֲדִים', english: 'Festivals' },
];

function loadPart(partNum) {
  const partDir = path.join(READER_DIR, `part-${partNum}`);
  const indexPath = path.join(partDir, 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  const parshas = [];
  for (const t of index.torahs) {
    const filePath = path.join(partDir, `torah-${t.number}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    parshas.push(data);
  }
  return { index, parshas };
}

function stripHtmlTags(text) {
  return (text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createTitlePage() {
  return [
    new Paragraph({ spacing: { before: 4000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'חוּמָשׁ עִם לִקּוּטֵי הֲלָכוֹת',
        font: 'Times New Roman',
        size: 56,
        bold: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({
        text: 'CHUMASH',
        font: 'Georgia',
        size: 52,
        bold: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({
        text: 'with',
        font: 'Georgia',
        size: 28,
        italics: true,
        color: '555555',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({
        text: 'LIKUTEY HALACHOS',
        font: 'Georgia',
        size: 44,
        bold: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'Selections from Likutey Halachos Arranged by Weekly Torah Portion',
        font: 'Georgia',
        size: 22,
        italics: true,
        color: '444444',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 100 },
      children: [new TextRun({
        text: 'By Rabbi Nosson of Breslov',
        font: 'Georgia',
        size: 26,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({
        text: 'Student of Rebbe Nachman of Breslov',
        font: 'Georgia',
        size: 20,
        italics: true,
        color: '666666',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200 },
      children: [new TextRun({
        text: 'נ נח נחמ נחמן מאומן',
        font: 'Times New Roman',
        size: 28,
        bold: true,
        color: '333333',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({
        text: 'Na Nach Nachma Nachman MeUman',
        font: 'Georgia',
        size: 20,
        color: '555555',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1500 },
      children: [new TextRun({
        text: 'ajew.org',
        font: 'Georgia',
        size: 22,
        bold: true,
      })],
    }),
  ];
}

function createCopyrightPage() {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ spacing: { before: 6000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'Chumash with Likutey Halachos',
        font: 'Georgia', size: 22, bold: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'English Translation',
        font: 'Georgia', size: 20, italics: true,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({
        text: 'Selections from the teachings of Rebbe Nachman of Breslov as compiled in Likutey Halachos by Rabbi Nosson of Breslov, arranged according to the weekly Torah portions.',
        font: 'Georgia', size: 18, color: '555555',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'Published by ajew.org',
        font: 'Georgia', size: 18,
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'This work is freely available at ajew.org/reader',
        font: 'Georgia', size: 16, color: '777777',
      })],
    }),
  ];
}

async function main() {
  console.log('Generating Chumash with Likutey Halachos book...');

  const allChildren = [];

  // Title page
  allChildren.push(...createTitlePage());
  allChildren.push(...createCopyrightPage());

  // Table of Contents placeholder
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 600, after: 400 },
    children: [new TextRun({ text: 'Table of Contents', font: 'Georgia', size: 36, bold: true })],
  }));
  allChildren.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: '(Update this table of contents in Word after opening the file)',
      font: 'Georgia', size: 18, italics: true, color: '999999',
    })],
  }));

  let totalSegments = 0;
  let totalParshas = 0;

  // Process each Chumash
  for (const chumash of CHUMASHIM) {
    const partData = loadPart(chumash.part);
    if (!partData) continue;

    // Chumash title page
    allChildren.push(new Paragraph({ children: [new PageBreak()] }));
    allChildren.push(new Paragraph({ spacing: { before: 3000 }, children: [] }));
    allChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: chumash.hebrew,
        font: 'Times New Roman', size: 60, bold: true,
      })],
    }));
    allChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({
        text: chumash.name.toUpperCase(),
        font: 'Georgia', size: 40, bold: true,
      })],
    }));
    allChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: chumash.english,
        font: 'Georgia', size: 24, italics: true, color: '666666',
      })],
    }));

    // Process each parsha
    for (const parsha of partData.parshas) {
      totalParshas++;
      const parshaTitle = parsha.title.replace(/\s*-\s*Chumash with Likutey Halachos\s*/, '').trim();
      const parshaHebrew = parsha.hebrewTitle
        .replace(/חומש עם ליקוטי הלכות\s*—?\s*/, '')
        .replace(/פרשת\s*/, '')
        .trim();

      // Parsha header (new page)
      allChildren.push(new Paragraph({ children: [new PageBreak()] }));

      // Parsha title with Hebrew
      allChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 100 },
        children: [new TextRun({
          text: parshaHebrew || parshaTitle,
          font: 'Times New Roman', size: 40, bold: true,
        })],
      }));
      allChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({
          text: `Parashat ${parshaTitle}`,
          font: 'Georgia', size: 28, bold: true,
        })],
      }));

      // Decorative separator
      allChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 8 } },
        children: [],
      }));

      // Process segments grouped by verse
      let currentVerse = '';
      for (const seg of parsha.segments) {
        const en = stripHtmlTags(seg.en);
        if (!en || en.length < 10) continue;

        totalSegments++;

        // Verse header if changed
        const verse = seg.verse || '';
        if (verse && verse !== currentVerse) {
          currentVerse = verse;
          const verseText = seg.verseText ? ` — ${stripHtmlTags(seg.verseText)}` : '';

          allChildren.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 300, after: 100 },
            children: [
              new TextRun({
                text: `${verse}`,
                font: 'Georgia', size: 22, bold: true, color: '2C1A6E',
              }),
              new TextRun({
                text: verseText,
                font: 'Georgia', size: 20, italics: true, color: '555555',
              }),
            ],
          }));
        }

        // English content
        allChildren.push(new Paragraph({
          spacing: { after: 160 },
          indent: { firstLine: 360 },
          children: [new TextRun({
            text: en,
            font: 'Georgia', size: 21,
          })],
        }));

        // Source reference
        if (seg.lhSource) {
          allChildren.push(new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 200 },
            children: [new TextRun({
              text: `(${seg.lhSource})`,
              font: 'Georgia', size: 16, italics: true, color: '888888',
            })],
          }));
        }
      }
    }
  }

  console.log(`Total parshas: ${totalParshas}, Total segments with English: ${totalSegments}`);

  // Build document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Georgia', size: 21 },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Georgia' },
          paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 32, bold: true, font: 'Georgia' },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 1 },
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Georgia', color: '2C1A6E' },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
          },
          margin: {
            top: MARGIN_TOP,
            bottom: MARGIN_BOTTOM,
            left: MARGIN_LEFT,
            right: MARGIN_RIGHT,
            gutter: MARGIN_GUTTER,
          },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({
              text: 'Chumash with Likutey Halachos',
              font: 'Georgia', size: 16, italics: true, color: '999999',
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ children: [PageNumber.CURRENT], font: 'Georgia', size: 18 }),
            ],
          })],
        }),
      },
      children: allChildren,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT, buffer);
  console.log(`\nBook generated: ${OUTPUT}`);
  console.log(`File size: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
