/**
 * Parse Chumash with Likutey Halachos PDFs into reader JSON format.
 * Each parsha becomes one "torah" in the reader.
 * Organized by chumash (5 parts): Bereishit, Shemos, Vayikra, Bamidbar, Devarim
 * + Holidays as part 6.
 */
const { PDFParse } = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PDF_DIR = path.join(ROOT, 'public', 'pdfs', 'parsha');
const OUT_DIR = path.join(ROOT, 'public', 'reader', 'chumash-lh');

// Parsha definitions organized by chumash
const CHUMASHIM = [
  {
    partNum: 1,
    name: 'Bereishis',
    hebrew: 'בראשית',
    folder: 'בראשית',
    parshas: [
      { slug: 'bereishit', file: 'בראשית.pdf', name: 'Bereishis', hebrew: 'בְּרֵאשִׁית' },
      { slug: 'noach', file: 'נח.pdf', name: 'Noach', hebrew: 'נֹחַ' },
      { slug: 'lech-lecha', file: 'לךלך.pdf', name: 'Lech Lecha', hebrew: 'לֶךְ לְךָ' },
      { slug: 'vayeira', file: 'וירא.pdf', name: 'Vayeira', hebrew: 'וַיֵּרָא' },
      { slug: 'chayei-sarah', file: 'חיי שרה.pdf', name: 'Chayei Sarah', hebrew: 'חַיֵּי שָׂרָה' },
      { slug: 'toldot', file: 'תולדות.pdf', name: 'Toldos', hebrew: 'תּוֹלְדוֹת' },
      { slug: 'vayeitzei', file: 'ויצא.pdf', name: 'Vayeitzei', hebrew: 'וַיֵּצֵא' },
      { slug: 'vayishlach', file: 'וישלח.pdf', name: 'Vayishlach', hebrew: 'וַיִּשְׁלַח' },
      { slug: 'vayeishev', file: 'וישב.pdf', name: 'Vayeishev', hebrew: 'וַיֵּשֶׁב' },
      { slug: 'mikeitz', file: 'מקץ.pdf', name: "Mikeitz", hebrew: 'מִקֵּץ' },
      { slug: 'vayigash', file: 'ויגש.pdf', name: 'Vayigash', hebrew: 'וַיִּגַּשׁ' },
      { slug: 'vayechi', file: 'ויחי.pdf', name: 'Vayechi', hebrew: 'וַיְחִי' },
    ]
  },
  {
    partNum: 2,
    name: 'Shemos',
    hebrew: 'שמות',
    folder: 'שמות',
    parshas: [
      { slug: 'shemot', file: 'שמות.pdf', name: 'Shemos', hebrew: 'שְׁמוֹת' },
      { slug: 'vaeira', file: 'וארא.pdf', name: "Va'eira", hebrew: 'וָאֵרָא' },
      { slug: 'bo', file: 'בא.pdf', name: 'Bo', hebrew: 'בֹּא' },
      { slug: 'beshalach', file: 'בשלח.pdf', name: 'Beshalach', hebrew: 'בְּשַׁלַּח' },
      { slug: 'yitro', file: 'יתרו.pdf', name: 'Yisro', hebrew: 'יִתְרוֹ' },
      { slug: 'mishpatim', file: 'משפטים.pdf', name: 'Mishpatim', hebrew: 'מִשְׁפָּטִים' },
      { slug: 'terumah', file: 'תרומה.pdf', name: 'Terumah', hebrew: 'תְּרוּמָה' },
      { slug: 'tetzaveh', file: 'תצוה.pdf', name: 'Tetzaveh', hebrew: 'תְּצַוֶּה' },
      { slug: 'ki-tisa', file: 'כי תשא.pdf', name: 'Ki Sisa', hebrew: 'כִּי תִשָּׂא' },
      { slug: 'vayakhel', file: 'ויקהל.pdf', name: 'Vayakhel', hebrew: 'וַיַּקְהֵל' },
      { slug: 'pekudei', file: 'פקודי.pdf', name: 'Pekudei', hebrew: 'פְקוּדֵי' },
    ]
  },
  {
    partNum: 3,
    name: 'Vayikra',
    hebrew: 'ויקרא',
    folder: 'ויקרא',
    parshas: [
      { slug: 'vayikra', file: 'ויקרא.pdf', name: 'Vayikra', hebrew: 'וַיִּקְרָא' },
      { slug: 'tzav', file: 'צו.pdf', name: 'Tzav', hebrew: 'צַו' },
      { slug: 'shemini', file: 'שמיני.pdf', name: 'Shemini', hebrew: 'שְּׁמִינִי' },
      { slug: 'tazria', file: 'תזריע.pdf', name: 'Tazria', hebrew: 'תַזְרִיעַ' },
      { slug: 'metzora', file: 'מצורע.pdf', name: 'Metzora', hebrew: 'מְצֹרָע' },
      { slug: 'acharei-mot', file: 'אחרי.pdf', name: 'Acharei Mos', hebrew: 'אַחֲרֵי מוֹת' },
      { slug: 'kedoshim', file: 'קדושים.pdf', name: 'Kedoshim', hebrew: 'קְדוֹשִׁים' },
      { slug: 'emor', file: 'אמור.pdf', name: 'Emor', hebrew: 'אֱמוֹר' },
      { slug: 'behar', file: 'בהר.pdf', name: 'Behar', hebrew: 'בְּהַר' },
      { slug: 'bechukotai', file: 'בחוקותי.pdf', name: 'Bechukosai', hebrew: 'בְּחֻקֹּתַי' },
    ]
  },
  {
    partNum: 4,
    name: 'Bamidbar',
    hebrew: 'במדבר',
    folder: 'במדבר',
    parshas: [
      { slug: 'bamidbar', file: 'במדבר.pdf', name: 'Bamidbar', hebrew: 'בְּמִדְבַּר' },
      { slug: 'naso', file: 'נשא.pdf', name: 'Naso', hebrew: 'נָשׂא' },
      { slug: 'behaalotcha', file: 'בהעלותך.pdf', name: "Beha'aloscha", hebrew: 'בְּהַעֲלוֹתְךָ' },
      { slug: 'shelach', file: 'שלח לך.pdf', name: 'Shelach', hebrew: 'שְׁלַח לְךָ' },
      { slug: 'korach', file: 'קרח.pdf', name: 'Korach', hebrew: 'קֹרַח' },
      { slug: 'chukat', file: 'חוקת.pdf', name: 'Chukas', hebrew: 'חֻקַּת' },
      { slug: 'balak', file: 'בלק.pdf', name: 'Balak', hebrew: 'בָּלָק' },
      { slug: 'pinchas', file: 'פינחס.pdf', name: 'Pinchas', hebrew: 'פִּינְחָס' },
      { slug: 'matot', file: 'מטות.pdf', name: 'Matos', hebrew: 'מַּטּוֹת' },
      { slug: 'masei', file: 'מטות מסעי.pdf', name: 'Masei', hebrew: 'מַסְעֵי' },
    ]
  },
  {
    partNum: 5,
    name: 'Devarim',
    hebrew: 'דברים',
    folder: 'דברים',
    parshas: [
      { slug: 'devarim', file: 'דברים.pdf', name: 'Devarim', hebrew: 'דְּבָרִים' },
      { slug: 'vaetchanan', file: 'ואתחנן.pdf', name: "Va'eschanan", hebrew: 'וָאֶתְחַנַּן' },
      { slug: 'eikev', file: 'עקב.pdf', name: 'Eikev', hebrew: 'עֵקֶב' },
      { slug: 'reeh', file: 'ראה.pdf', name: "Re'eh", hebrew: 'רְאֵה' },
      { slug: 'shoftim', file: 'שופטים.pdf', name: 'Shoftim', hebrew: 'שׁוֹפְטִים' },
      { slug: 'ki-teitzei', file: 'כי תצא.pdf', name: 'Ki Seitzei', hebrew: 'כִּי תֵצֵא' },
      { slug: 'ki-tavo', file: 'כי תבוא.pdf', name: 'Ki Savo', hebrew: 'כִּי תָבוֹא' },
      { slug: 'nitzavim', file: 'נצבים-וילך.pdf', name: 'Nitzavim-Vayeilech', hebrew: 'נִצָּבִים-וַיֵּלֶךְ' },
      { slug: 'haazinu', file: 'האזינו.pdf', name: "Ha'azinu", hebrew: 'הַאֲזִינוּ' },
    ]
  },
  {
    partNum: 6,
    name: 'Holidays',
    hebrew: 'חגים',
    folder: 'חגים',
    parshas: [
      { slug: 'pesach', file: 'פסח.pdf', name: 'Pesach', hebrew: 'פֶּסַח' },
      { slug: 'shavuos', file: 'שבועות.pdf', name: 'Shavuos', hebrew: 'שָׁבוּעוֹת' },
      { slug: 'sukkos', file: 'סוכות.pdf', name: 'Sukkos', hebrew: 'סוּכּוֹת' },
      { slug: 'yom-hakippurim', file: 'יוהכ.pdf', name: 'Yom HaKippurim', hebrew: 'יוֹם הַכִּפּוּרִים' },
    ]
  }
];

/**
 * Clean extracted PDF text
 */
function cleanText(raw) {
  let text = raw;
  text = text.replace(/\t/g, '');
  // Fix repeated dagesh marks
  text = text.replace(/ּ{3,}/g, 'ּ');
  // Clean up multiple spaces
  text = text.replace(/ {2,}/g, ' ');
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Check if a line is a verse reference.
 * Returns { ref, verseText } or null.
 * Handles both formats:
 *   - Bare: א,א
 *   - Parens: )א',א'(  or  (א',יד–ה',ב')
 */
function parseVerseRef(line) {
  // Bare format: א,א (standalone line)
  const bare = line.match(/^([א-ת]{1,3}),([א-ת]{1,3})$/);
  if (bare) return { ref: line };

  // Parens with apostrophes: )א',א'( or (א',א')
  const parens = line.match(/^[)(]+([א-ת]{1,3})['׳],([א-ת]{1,3})['׳][)(]+$/);
  if (parens) return { ref: `${parens[1]},${parens[2]}` };

  // Range format: )א',יד–ה',ב'(
  const range = line.match(/^[)(]+([א-ת]{1,3})['׳],([א-ת]{1,3})['׳][–-]([א-ת]{1,3})['׳],([א-ת]{1,3})['׳][)(]+$/);
  if (range) return { ref: `${range[1]},${range[2]}–${range[3]},${range[4]}` };

  return null;
}

/**
 * Check if a line is a title/header (verse text shown before the ref)
 */
function isVerseTextLine(line) {
  // Verse text lines are typically short Hebrew text without commentary words
  // They often start with וְ or other conjunctions and contain nikud
  return false; // We'll identify these differently
}

/**
 * Check if a page is a source index page (table of contents at end)
 */
function isSourcePage(text) {
  const lhCount = (text.match(/לקוטי הלכות/g) || []).length;
  const lines = text.split('\n').filter(l => l.trim()).length;
  // If more than 30% of lines mention LH, it's a source page
  return lhCount > 3 && (lhCount / lines) > 0.25;
}

/**
 * Split full extracted text into verse sections with their commentary.
 * A new section starts when we find a verse reference.
 */
function splitIntoSections(pages) {
  const sections = [];
  let currentSection = null;
  let isFirstContent = true;

  for (const page of pages) {
    const text = cleanText(page.text);
    if (!text || text.length < 10) continue;

    // Skip cover page
    if (text.replace(/[^א-ת]/g, '').length < 10) continue;

    // Skip source index pages
    if (isSourcePage(text)) continue;

    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip header lines
      if (line === 'רבנו נחמן מברסלב') continue;
      if (line.match(/פירושים על פרשת/)) continue;

      // Check for verse reference
      const verseRef = parseVerseRef(line);
      if (verseRef) {
        // Save previous section
        if (currentSection && currentSection.text.trim()) {
          sections.push(currentSection);
        }

        // Look for verse text: usually the line(s) before or after the reference
        let verseText = '';

        // Check lines BEFORE the ref (common in parens-style PDFs)
        // The verse text is usually 1-3 lines before the reference
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prevLine = lines[j].trim();
          if (!prevLine) continue;
          // If prev line looks like verse text (short, has nikud, no LH ref)
          if (prevLine.length > 3 && prevLine.length < 100 &&
              !prevLine.match(/לקוטי הלכות/) &&
              !prevLine.match(/^[)(]/) &&
              !parseVerseRef(prevLine)) {
            // Check it's not just commentary ending
            if (prevLine.match(/\.\.\.|[.:]$/) || prevLine.length < 60) {
              verseText = prevLine.replace(/^\.+/, '').trim();
              // Remove this line from previous section if it was added
              if (currentSection) {
                const prevText = currentSection.text.trim();
                if (prevText.endsWith(prevLine)) {
                  currentSection.text = prevText.slice(0, -prevLine.length).trim();
                }
              }
              break;
            }
          }
          break; // Only check the immediately preceding line
        }

        // Check line AFTER the ref if we didn't find text before
        if (!verseText) {
          for (let j = i + 1; j < lines.length && j <= i + 3; j++) {
            const nextLine = lines[j].trim();
            if (!nextLine) continue;
            if (!parseVerseRef(nextLine) && nextLine.length > 3) {
              // Short lines after ref are likely verse text
              if (nextLine.length < 80 && !nextLine.match(/^[וְּכִּשֶׁעַל]/)) {
                verseText = nextLine;
              }
              break;
            }
          }
        }

        currentSection = {
          verseRef: verseRef.ref,
          verseText: verseText,
          text: '',
          pageStart: page.num
        };
        isFirstContent = false;
        continue;
      }

      // Accumulate text into current section
      if (currentSection) {
        currentSection.text += line + '\n';
      } else if (isFirstContent) {
        // First content before any verse ref - start initial section
        currentSection = {
          verseRef: '',
          verseText: '',
          text: line + '\n',
          pageStart: page.num
        };
      }
    }
  }

  // Don't forget last section
  if (currentSection && currentSection.text.trim()) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Split a section's text into readable segments (paragraphs).
 * Uses LH source references as natural break points.
 */
function splitIntoSegments(text) {
  const segments = [];

  // Split by LH source references which mark ends of passages
  // Pattern: )לקוטי הלכות...( or (לקוטי הלכות...)
  const lhPattern = /([)(]*לקוטי הלכות[^)(]*[)(]+)/g;

  // First, split by double newlines (paragraph breaks)
  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    const cleaned = para.replace(/\n/g, ' ').trim();
    if (!cleaned || cleaned.length < 5) continue;

    // Further split long paragraphs by LH source references
    const parts = cleaned.split(lhPattern);
    let current = '';

    for (const part of parts) {
      if (part.match(/^[)(]*לקוטי הלכות/)) {
        // This is a source reference - append to current and push
        current += part;
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
      } else {
        current += part;
      }
    }

    if (current.trim()) {
      segments.push(current.trim());
    }
  }

  // If no paragraph splits were found, split by approximate paragraph length
  // (every ~500 chars at a sentence boundary)
  if (segments.length <= 1 && text.length > 800) {
    const fullText = text.replace(/\n/g, ' ').trim();
    const result = [];
    let pos = 0;

    while (pos < fullText.length) {
      // Find a good break point around 500 chars
      let end = Math.min(pos + 600, fullText.length);
      if (end < fullText.length) {
        // Look for sentence boundaries (period followed by space, or LH ref end)
        let bestBreak = -1;
        for (let j = pos + 300; j < end; j++) {
          if (fullText[j] === '.' && fullText[j + 1] === ' ') {
            bestBreak = j + 1;
          }
          // Break at LH source reference end
          if (fullText[j] === '(' && fullText.substring(Math.max(0, j - 5), j).match(/['׳)\d]/)) {
            bestBreak = j + 1;
          }
        }
        if (bestBreak > pos) end = bestBreak;
      }

      const chunk = fullText.substring(pos, end).trim();
      if (chunk) result.push(chunk);
      pos = end;
    }

    return result.length > 1 ? result : segments;
  }

  return segments;
}

/**
 * Parse a single PDF file and return reader JSON data
 */
async function parsePDF(filePath, parshaInfo, parshaNum, chumash) {
  const buf = fs.readFileSync(filePath);
  const parser = new PDFParse(new Uint8Array(buf));
  const result = await parser.getText();

  const sections = splitIntoSections(result.pages);

  // Build segments from all sections
  const segments = [];
  const simanim = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const text = sec.text.trim();
    if (!text) continue;

    // Track simanim (verse section markers)
    if (sec.verseRef) {
      simanim.push({
        number: simanim.length + 1,
        hebrewTitle: sec.verseRef + (sec.verseText ? ' — ' + sec.verseText : ''),
        segmentStart: segments.length + 1,
      });
    }

    // Split section text into readable segments
    const paras = splitIntoSegments(text);

    for (const para of paras) {
      if (!para || para.length < 5) continue;

      const segment = {
        index: segments.length + 1,
        he: para,
      };

      // Mark first segment of a verse section
      if (sec.verseRef && segment.index === (simanim.length > 0 ? simanim[simanim.length - 1].segmentStart : 1)) {
        segment.verse = sec.verseRef;
        if (sec.verseText) {
          segment.verseText = sec.verseText;
        }
      }

      segments.push(segment);
    }
  }

  return {
    id: `clh-${chumash.partNum}-${parshaNum}`,
    book: 'chumash-lh',
    part: chumash.partNum,
    torah: parshaNum,
    displayNumber: parshaNum,
    title: `${parshaInfo.name} - Chumash with Likutey Halachos`,
    hebrewTitle: `חומש עם ליקוטי הלכות — פרשת ${parshaInfo.hebrew}`,
    keyVerse: sections[0]?.verseText || '',
    keyVerseRef: sections[0]?.verseRef || '',
    themes: ['Likutey Halachos', 'Chumash', parshaInfo.name],
    keywords: [],
    simanim,
    segments,
    navigation: { prev: null, next: null, prevUrl: null, nextUrl: null },
    totalPages: result.total,
    pdfSource: `/pdfs/parsha/${encodeURIComponent(chumash.folder)}/${encodeURIComponent(parshaInfo.file)}`,
  };
}

async function main() {
  console.log('Parsing Chumash with Likutey Halachos PDFs...\n');

  let totalParshas = 0;
  let totalSegments = 0;
  let totalPages = 0;

  for (const chumash of CHUMASHIM) {
    const partDir = path.join(OUT_DIR, `part-${chumash.partNum}`);
    fs.mkdirSync(partDir, { recursive: true });

    const index = {
      title: `${chumash.name} - Chumash with Likutey Halachos`,
      hebrewTitle: `חומש עם ליקוטי הלכות — ${chumash.hebrew}`,
      torahs: []
    };

    console.log(`\n=== ${chumash.name} (${chumash.hebrew}) ===`);

    const parsedData = []; // collect for navigation linking

    for (let i = 0; i < chumash.parshas.length; i++) {
      const parsha = chumash.parshas[i];
      const pdfPath = path.join(PDF_DIR, chumash.folder, parsha.file);
      const parshaNum = i + 1;

      if (!fs.existsSync(pdfPath)) {
        console.log(`  SKIP: ${parsha.name} - PDF not found: ${pdfPath}`);
        parsedData.push(null);
        continue;
      }

      try {
        const data = await parsePDF(pdfPath, parsha, parshaNum, chumash);
        parsedData.push(data);

        index.torahs.push({
          number: parshaNum,
          title: parsha.name,
          hebrewTitle: parsha.hebrew,
          slug: parsha.slug,
          segments: data.segments.length,
          sections: data.simanim.length,
        });

        totalParshas++;
        totalSegments += data.segments.length;
        totalPages += data.totalPages;

        console.log(`  ${parshaNum}. ${parsha.name} (${parsha.hebrew}): ${data.segments.length} segments, ${data.simanim.length} verse sections, ${data.totalPages} pages`);
      } catch (err) {
        console.error(`  ERROR: ${parsha.name}: ${err.message}`);
        parsedData.push(null);
      }
    }

    // Add navigation links between parshas within this chumash
    for (let i = 0; i < parsedData.length; i++) {
      if (!parsedData[i]) continue;
      const data = parsedData[i];
      const part = chumash.partNum;
      const num = i + 1;

      // Previous
      if (i > 0 && parsedData[i - 1]) {
        data.navigation.prev = parsedData[i - 1].id;
        data.navigation.prevUrl = `/reader/chumash-lh/${part}/${i}`;
      }
      // Next
      if (i < parsedData.length - 1 && parsedData[i + 1]) {
        data.navigation.next = parsedData[i + 1].id;
        data.navigation.nextUrl = `/reader/chumash-lh/${part}/${i + 2}`;
      }

      const outFile = path.join(partDir, `torah-${num}.json`);
      fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');
    }

    fs.writeFileSync(path.join(partDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  }

  // Update master catalog
  const catalogPath = path.join(ROOT, 'public', 'reader', 'catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const catalogEntry = {
    id: 'chumash-lh',
    title: 'Chumash with Likutey Halachos',
    hebrewTitle: 'חומש עם ליקוטי הלכות',
    author: 'Rabbi Nosson of Breslov',
    hebrewAuthor: 'רבי נתן מברסלב',
    description: 'Selected Likutey Halachos teachings arranged by weekly Torah portion',
    totalParts: CHUMASHIM.length,
    parts: CHUMASHIM.map(c => ({
      part: c.partNum,
      title: c.name,
      hebrewTitle: c.hebrew,
      totalTorahs: c.parshas.length,
      indexUrl: `/reader/chumash-lh/part-${c.partNum}/index.json`,
    }))
  };

  catalog.books = catalog.books.filter(b => b.id !== 'chumash-lh');
  catalog.books.push(catalogEntry);
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');

  console.log(`\n===========================`);
  console.log(`Total: ${totalParshas} parshas, ${totalSegments} segments, ${totalPages} PDF pages`);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
