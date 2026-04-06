/**
 * Import "Sichos Metoch Chayay HaSaba" - Conversations from the Life of Saba Yisroel
 * Source: HTML part files with parallel Hebrew/English paragraph blocks
 * Target: public/reader/sichos-chayay-saba/section-N.json
 */
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Finished/temp folder/Seechoas Meetoach Chayay Hasaba';
const TARGET_DIR = path.join(__dirname, '..', 'public', 'reader', 'sichos-chayay-saba');

// ─── HTML helpers ──────────────────────────────────────────────────
function stripHtml(html) {
  let text = html;
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '\u2014').replace(/&ndash;/g, '\u2013');
  text = text.replace(/&hellip;/g, '\u2026');
  text = text.replace(/&rsquo;/g, '\u2019').replace(/&lsquo;/g, '\u2018');
  text = text.replace(/&rdquo;/g, '\u201D').replace(/&ldquo;/g, '\u201C');
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  return text.trim();
}

// ─── Parse a part HTML file ──────────────────────────────────────
function parsePartFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const segments = [];

  // Find paragraph-block divs containing hebrew-para + english-para pairs
  const blockRegex = /<div class="paragraph-block">([\s\S]*?)(?=<div class="(?:paragraph-block|section-heading|subsection-heading|part-header|summary-box|divider|editorial-note)"|<hr|$)/g;
  let match;

  while ((match = blockRegex.exec(html)) !== null) {
    const block = match[1];

    // Extract Hebrew paragraph
    const heMatch = block.match(/<div class="hebrew-para">([\s\S]*?)<\/div>/);
    // Extract English paragraph
    const enMatch = block.match(/<div class="english-para">([\s\S]*?)<\/div>/);

    const he = heMatch ? stripHtml(heMatch[1]) : '';
    const en = enMatch ? stripHtml(enMatch[1]) : '';

    if (he || en) {
      segments.push({ he, en });
    }
  }

  // Also extract section/subsection headings as segment markers
  // But we'll use them for title extraction instead
  const headings = [];
  const sectionRegex = /<div class="section-heading">([\s\S]*?)<\/div>/g;
  while ((match = sectionRegex.exec(html)) !== null) {
    headings.push(stripHtml(match[1]));
  }

  const subHeadings = [];
  const subRegex = /<div class="subsection-heading">([\s\S]*?)<\/div>/g;
  while ((match = subRegex.exec(html)) !== null) {
    subHeadings.push(stripHtml(match[1]));
  }

  const heSubHeadings = [];
  const heSubRegex = /<div class="hebrew-sub-heading">([\s\S]*?)<\/div>/g;
  while ((match = heSubRegex.exec(html)) !== null) {
    heSubHeadings.push(stripHtml(match[1]));
  }

  // Extract part header
  const partMatch = html.match(/<div class="part-header">([\s\S]*?)<\/div>/);
  const partTitle = partMatch ? stripHtml(partMatch[1]) : '';

  return { segments, headings, subHeadings, heSubHeadings, partTitle };
}

// ─── Main ────────────────────────────────────────────────────────
function main() {
  console.log('=== Import Sichos Metoch Chayay HaSaba ===\n');

  // Create target directory
  fs.mkdirSync(TARGET_DIR, { recursive: true });

  // Get part files sorted
  const partFiles = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.match(/^Sichos_Part\d+/i) && f.endsWith('.html'))
    .sort((a, b) => {
      const na = parseInt(a.match(/Part(\d+)/i)[1]);
      const nb = parseInt(b.match(/Part(\d+)/i)[1]);
      return na - nb;
    });

  console.log(`Found ${partFiles.length} part files`);

  // Parse each part file
  const allSections = [];
  let sectionNum = 0;

  for (const file of partFiles) {
    const partNum = parseInt(file.match(/Part(\d+)/i)[1]);
    const filePath = path.join(SOURCE_DIR, file);
    console.log(`\nParsing: ${file}`);

    const { segments, headings, subHeadings, heSubHeadings, partTitle } = parsePartFile(filePath);
    console.log(`  Segments: ${segments.length}, Headings: ${headings.length}, SubHeadings: ${subHeadings.length}`);

    if (segments.length === 0) {
      console.log(`  [SKIP] No segments found`);
      continue;
    }

    sectionNum++;
    const sectionTitle = partTitle || `Part ${partNum}`;
    const hebrewTitle = `חלק ${partNum}`;

    allSections.push({
      number: sectionNum,
      partNum,
      title: sectionTitle,
      hebrewTitle,
      segments: segments.map((s, i) => ({
        index: i + 1,
        he: s.he,
        en: s.en
      }))
    });

    console.log(`  -> Section ${sectionNum}: "${sectionTitle}" (${segments.length} segments)`);
  }

  console.log(`\nTotal sections: ${allSections.length}`);

  // Write section JSON files
  let totalSegments = 0;
  let totalWithEn = 0;
  let totalWithHe = 0;

  for (const section of allSections) {
    const jsonPath = path.join(TARGET_DIR, `section-${section.number}.json`);
    const data = {
      id: `scs-${section.number}`,
      book: 'sichos-chayay-saba',
      part: 1,
      torah: section.number,
      displayNumber: section.number,
      title: section.title,
      hebrewTitle: section.hebrewTitle,
      keyVerse: '',
      keyVerseTranslation: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments: section.segments,
      totalParagraphs: section.segments.length,
      hasEnglish: section.segments.some(s => s.en && s.en.trim()),
      navigation: {
        prev: section.number > 1 ? `scs-${section.number - 1}` : null,
        next: section.number < allSections.length ? `scs-${section.number + 1}` : null,
        prevUrl: section.number > 1 ? `/reader/sichos-chayay-saba/1/${section.number - 1}` : null,
        nextUrl: section.number < allSections.length ? `/reader/sichos-chayay-saba/1/${section.number + 1}` : null,
      }
    };

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

    totalSegments += section.segments.length;
    totalWithEn += section.segments.filter(s => s.en && s.en.trim()).length;
    totalWithHe += section.segments.filter(s => s.he && s.he.trim()).length;
  }

  // Write index.json
  const index = {
    book: 'sichos-chayay-saba',
    part: 1,
    title: 'Sichos Metoch Chayay HaSaba',
    hebrewTitle: 'שיחות מתוך חיי הסבא',
    author: 'Saba Yisroel (Rabbi Yisroel Dov Odesser)',
    hebrewAuthor: 'הסבא ישראל דב-בר אודסר',
    totalTorahs: allSections.length,
    torahs: allSections.map(s => ({
      number: s.number,
      displayNumber: s.number,
      title: s.title,
      hebrewTitle: s.hebrewTitle,
      themes: [],
      paragraphs: s.segments.length,
      hasEnglish: s.segments.some(seg => seg.en && seg.en.trim()),
      url: `/reader/sichos-chayay-saba/1/${s.number}`
    }))
  };

  fs.writeFileSync(path.join(TARGET_DIR, 'index.json'), JSON.stringify(index, null, 2), 'utf8');

  console.log('\n=== SUMMARY ===');
  console.log(`Sections: ${allSections.length}`);
  console.log(`Total segments: ${totalSegments}`);
  console.log(`With Hebrew: ${totalWithHe} (${Math.round(totalWithHe / totalSegments * 100)}%)`);
  console.log(`With English: ${totalWithEn} (${Math.round(totalWithEn / totalSegments * 100)}%)`);
  console.log(`Files written to: ${TARGET_DIR}`);
}

main();
