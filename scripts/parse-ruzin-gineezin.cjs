/**
 * Parser for Ruzin Gineezin (Hidden Treasures) by the Ramchal
 * Reads the HTML translation file and optionally the Hebrew DOCX
 * Outputs reader-compatible JSON files
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = 'C:/Users/Pettek/Downloads/final batch from TE/Ramchal/Ruzin Gineezin/000 Ruzin Gineezin - Complete Translation All Sections.html';
const DOCX_PATH = 'C:/Users/Pettek/Downloads/final batch from TE/Ramchal/Ruzin Gineezin/010 Ruzin Gineezin - Complete Source Hebrew Corrected (1).docx';
const OUT_DIR = process.env.OUT_DIR || path.join(__dirname, '..', 'public', 'reader', 'ramchal-ruzin-gineezin');
const BOOK_ID = 'ramchal-ruzin-gineezin';

// Section metadata
const SECTIONS = [
  { num: 1, heTitle: 'לא יסור שבט מיהודה', enTitle: 'Lo Yasur Sheves — On the Two Messiahs and Moshe' },
  { num: 2, heTitle: 'ויבא עמלק / והיה בהניח', enTitle: 'Va-Yavo Amalek — On the Blotting Out of Amalek' },
  { num: 3, heTitle: 'ויאהב יעקב', enTitle: 'Va-Yehev Yaakov — On the Love of Yaakov and Rachel' },
  { num: 4, heTitle: 'ושמת אותם', enTitle: "V'Samtuh Osom — On the Showbread and the Shekhinah" },
  { num: 5, heTitle: 'ושמת המצנפת', enTitle: "V'Samtuh HaMitznefes — On the Priestly Crown and Renewal" },
  { num: 6, heTitle: 'ויזכור אלקים', enTitle: 'Va-Yizkor Elokim — On the Rectification of Moshiach ben Yosef' },
  { num: 7, heTitle: 'עטרין ותכשיטין', enTitle: 'Atarin v\'Tachshitin — Crowns and Ornaments' },
];

/**
 * Decode HTML entities
 */
function decodeEntities(str) {
  return str
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&apos;/g, "'")
    .replace(/&bull;/g, '\u2022')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rarr;/g, '\u2192')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/**
 * Strip HTML tags but keep text content, preserving paragraph breaks
 */
function stripHtml(html) {
  // Replace <br> and block elements with newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n');
  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode entities
  text = decodeEntities(text);
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/**
 * Extract Hebrew text from inline heb spans
 */
function extractHebrewFromHtml(html) {
  const hebrewParts = [];
  const hebRegex = /class="heb[^"]*"[^>]*>([^<]+)/g;
  let m;
  while ((m = hebRegex.exec(html)) !== null) {
    const text = decodeEntities(m[1]).trim();
    if (text) hebrewParts.push(text);
  }
  return hebrewParts.join(' ');
}

/**
 * Split HTML into sections by SECTION comments
 */
function splitIntoSections(html) {
  const sections = [];
  // Find section boundaries
  const sectionPattern = /<!--\s*[═\s]*SECTION\s+(\d+)[^-]*-->/g;
  const matches = [];
  let m;
  while ((m = sectionPattern.exec(html)) !== null) {
    matches.push({ index: m.index, num: parseInt(m[1]) });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length;
    sections.push({
      num: matches[i].num,
      content: html.substring(start, end)
    });
  }
  return sections;
}

/**
 * Parse a section's HTML into discourse segments
 */
function parseSectionContent(sectionHtml, sectionNum) {
  const segments = [];

  // Extract the anchor box / section intro as the first segment
  const anchorBoxMatch = sectionHtml.match(/<div class="(?:ab|anchor-box)">([\s\S]*?)<\/div>/);
  if (anchorBoxMatch) {
    const en = stripHtml(anchorBoxMatch[1]);
    const he = extractHebrewFromHtml(anchorBoxMatch[1]);
    if (en) {
      segments.push({ he: he || '', en: en });
    }
  }

  // For section 6, also grab the section intro and secondary verse
  if (sectionNum === 6) {
    const introMatches = sectionHtml.match(/<div class="(?:secondary-verse|preceding-verse-note|section-intro)">([\s\S]*?)<\/div>/g);
    if (introMatches) {
      for (const block of introMatches) {
        const en = stripHtml(block);
        if (en) segments.push({ he: '', en: en });
      }
    }
  }

  // Split by discourse headers (h3 elements with class disc, crown, or orn)
  const discoursePattern = /<h3 class="(?:disc|crown|orn)"[^>]*>([\s\S]*?)<\/h3>/g;
  const discourseMatches = [];
  let dm;
  while ((dm = discoursePattern.exec(sectionHtml)) !== null) {
    discourseMatches.push({
      index: dm.index,
      endIndex: dm.index + dm[0].length,
      title: stripHtml(dm[1]).replace(/\n/g, ' ').trim(),
      fullMatch: dm[0]
    });
  }

  for (let i = 0; i < discourseMatches.length; i++) {
    const disc = discourseMatches[i];
    const contentStart = disc.endIndex;
    const contentEnd = i + 1 < discourseMatches.length
      ? discourseMatches[i + 1].index
      : sectionHtml.length;

    const contentHtml = sectionHtml.substring(contentStart, contentEnd);

    // Split content into paragraphs
    const paragraphs = contentHtml.split(/<(?:p|div class="fn"|div class="rmdv")[\s>]/);

    let discourseText = '';
    for (const para of paragraphs) {
      // Skip separator divs, star divs, colophons
      if (para.match(/class="(?:ksep|star|col|sb|section-colophon)"/)) continue;
      // Skip empty
      const text = stripHtml(para);
      if (!text || text.length < 3) continue;
      // Skip pure decorative content
      if (/^[✦✶★●\s]+$/.test(text)) continue;
      if (discourseText) discourseText += '\n\n';
      discourseText += text;
    }

    if (discourseText) {
      segments.push({
        he: '',
        en: `**${disc.title}**\n\n${discourseText}`
      });
    }
  }

  // If no discourses found, grab all paragraphs
  if (discourseMatches.length === 0) {
    const paraPattern = /<p[^>]*>([\s\S]*?)<\/p>/g;
    let pm;
    let allText = '';
    while ((pm = paraPattern.exec(sectionHtml)) !== null) {
      const text = stripHtml(pm[1]);
      if (text && text.length > 3) {
        if (allText) allText += '\n\n';
        allText += text;
      }
    }
    if (allText) {
      segments.push({ he: '', en: allText });
    }
  }

  return segments;
}

/**
 * Try to extract Hebrew from DOCX using mammoth
 */
async function extractHebrewFromDocx() {
  try {
    const mammoth = require('mammoth');
    if (!fs.existsSync(DOCX_PATH)) {
      console.log('Hebrew DOCX not found, skipping Hebrew extraction');
      return null;
    }
    console.log('Extracting Hebrew from DOCX...');
    const result = await mammoth.extractRawText({ path: DOCX_PATH });
    const text = result.value;
    console.log(`Extracted ${text.length} characters of Hebrew text`);

    // Split into sections by looking for section markers
    // The Hebrew text should have section headers matching our sections
    return text;
  } catch (e) {
    console.log('Could not extract Hebrew from DOCX:', e.message);
    return null;
  }
}

/**
 * Try to match Hebrew text to sections
 */
function matchHebrewToSections(hebrewText, sections) {
  if (!hebrewText) return;

  // Split Hebrew text into paragraphs
  const paragraphs = hebrewText.split(/\n+/).filter(p => p.trim().length > 5);
  console.log(`Found ${paragraphs.length} Hebrew paragraphs`);

  // Try to find section boundaries in Hebrew text
  const sectionHeaders = [
    'לא יסור שבט',
    'ויבא עמלק',
    'ויאהב יעקב',
    'ושמת אותם',
    'ושמת המצנפת',
    'ויזכור אלקים',
    'עטרין ותכשיטין'
  ];

  const sectionBoundaries = [];
  for (let i = 0; i < paragraphs.length; i++) {
    for (let s = 0; s < sectionHeaders.length; s++) {
      if (paragraphs[i].includes(sectionHeaders[s])) {
        sectionBoundaries.push({ sectionIdx: s, paraIdx: i });
        break;
      }
    }
  }

  console.log(`Found ${sectionBoundaries.length} Hebrew section boundaries`);

  // For each section, collect the Hebrew paragraphs
  for (let i = 0; i < sectionBoundaries.length; i++) {
    const start = sectionBoundaries[i].paraIdx + 1; // skip header
    const end = i + 1 < sectionBoundaries.length
      ? sectionBoundaries[i + 1].paraIdx
      : paragraphs.length;

    const sectionIdx = sectionBoundaries[i].sectionIdx;
    const heParagraphs = paragraphs.slice(start, end);

    if (sections[sectionIdx] && heParagraphs.length > 0) {
      // Distribute Hebrew paragraphs across segments
      const segCount = sections[sectionIdx].segments.length;
      if (segCount > 0) {
        const ratio = Math.max(1, Math.floor(heParagraphs.length / segCount));
        for (let j = 0; j < segCount; j++) {
          const heStart = j * ratio;
          const heEnd = j === segCount - 1 ? heParagraphs.length : (j + 1) * ratio;
          const heText = heParagraphs.slice(heStart, heEnd).join('\n');
          if (heText) {
            sections[sectionIdx].segments[j].he = heText;
          }
        }
      }
    }
  }
}

async function main() {
  console.log('Parsing Ruzin Gineezin...');

  // Read HTML
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  console.log(`Read HTML file: ${html.length} characters`);

  // Split into sections
  const rawSections = splitIntoSections(html);
  console.log(`Found ${rawSections.length} sections`);

  // Parse each section
  const parsedSections = [];
  for (const raw of rawSections) {
    const meta = SECTIONS.find(s => s.num === raw.num);
    if (!meta) {
      console.warn(`Unknown section number: ${raw.num}`);
      continue;
    }
    const segments = parseSectionContent(raw.content, raw.num);
    console.log(`Section ${raw.num} (${meta.enTitle}): ${segments.length} segments`);
    parsedSections.push({
      num: meta.num,
      heTitle: meta.heTitle,
      enTitle: meta.enTitle,
      segments
    });
  }

  // Try to extract Hebrew from DOCX
  const hebrewText = await extractHebrewFromDocx();
  if (hebrewText) {
    matchHebrewToSections(hebrewText, parsedSections);
  }

  // Create output directory
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  // Write index.json
  const index = {
    torahs: parsedSections.map(s => ({
      torah: s.num,
      title: `Ruzin Gineezin \u2014 Section ${s.num}: ${s.enTitle}`,
      hebrewTitle: s.heTitle,
      hasEnglish: true
    }))
  };
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
  console.log(`Wrote index.json with ${index.torahs.length} entries`);

  // Write section-N.json files
  for (const section of parsedSections) {
    const sectionData = {
      bookId: BOOK_ID,
      part: 1,
      torah: section.num,
      title: `Ruzin Gineezin \u2014 Section ${section.num}: ${section.enTitle}`,
      hebrewTitle: section.heTitle,
      hasEnglish: true,
      segments: section.segments
    };
    const outPath = path.join(OUT_DIR, `section-${section.num}.json`);
    fs.writeFileSync(outPath, JSON.stringify(sectionData, null, 2));
    console.log(`Wrote section-${section.num}.json: ${section.segments.length} segments`);
  }

  // Summary
  const totalSegments = parsedSections.reduce((sum, s) => sum + s.segments.length, 0);
  const hebrewCount = parsedSections.reduce((sum, s) =>
    sum + s.segments.filter(seg => seg.he && seg.he.length > 0).length, 0);
  console.log(`\nDone! ${parsedSections.length} sections, ${totalSegments} total segments`);
  console.log(`Hebrew segments: ${hebrewCount}/${totalSegments}`);
}

main().catch(console.error);
