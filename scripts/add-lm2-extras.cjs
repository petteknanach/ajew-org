/**
 * Add LM Part 2 extras to the reader:
 * - Introduction (English from docx)
 * - Omission/Hashmata (English from docx)
 * - Torah 34 Hebrew (full text with nikud from docx)
 * - Torah 43 English (from lkm2 943.docx)
 * - Handwriting/Manuscripts 1-6 (English from docx)
 */
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const VOL2_DIR = 'C:/Users/Pettek/Documents/Claude Desktop projects/Likutay Moharan/Volume 2';
const LM_DIR = path.resolve(__dirname, '..', 'public', 'reader', 'likutay-moharan', 'part-2');

/**
 * Extract plain text from a docx file
 */
async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.trim();
}

/**
 * Split text into paragraphs (segments)
 */
function splitIntoSegments(text) {
  return text.split(/\n\n+/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 5);
}

/**
 * Detect if text is Hebrew
 */
function isHebrew(text) {
  const heChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const enChars = (text.match(/[a-zA-Z]/g) || []).length;
  return heChars > enChars;
}

/**
 * Read existing JSON, or return null
 */
function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch { return null; }
}

async function main() {
  console.log('Processing LM Part 2 extras...\n');

  // ── 1. Introduction ──
  console.log('=== Introduction ===');
  const introEnText = await extractDocx(path.join(VOL2_DIR, 'Introduction to Likutay Moharan II.docx'));
  const introEnSegments = splitIntoSegments(introEnText);
  // Remove title line if it matches
  if (introEnSegments[0]?.match(/Introduction to Likutay Moharan/i)) {
    introEnSegments.shift();
  }

  const introJson = {
    id: 'lm-2-intro',
    book: 'likutay-moharan',
    part: 2,
    torah: 0,
    displayNumber: 0,
    title: 'Introduction to Likutay Moharan Part 2',
    hebrewTitle: 'הקדמה לליקוטי מוהר"ן חלק ב',
    keyVerse: '',
    keyVerseRef: '',
    themes: ['Introduction'],
    keywords: [],
    simanim: [],
    segments: introEnSegments.map((text, i) => ({
      index: i + 1,
      he: '', // No Hebrew source available yet
      en: text,
    })),
    navigation: {
      prev: null,
      next: 'lm-2-omission',
      prevUrl: null,
      nextUrl: '/reader/likutay-moharan/2/omission',
    }
  };
  fs.writeFileSync(path.join(LM_DIR, 'intro.json'), JSON.stringify(introJson, null, 2), 'utf8');
  console.log(`  ${introEnSegments.length} segments (English)`);

  // ── 2. Omission/Hashmata ──
  console.log('\n=== Omission (Hashmata) ===');
  const omissionEnText = await extractDocx(path.join(VOL2_DIR, 'Omission at the beginning.docx'));
  const omissionEnSegments = splitIntoSegments(omissionEnText);
  if (omissionEnSegments[0]?.match(/Likutay Moharan.*Omission/i)) {
    omissionEnSegments.shift();
  }

  const omissionJson = {
    id: 'lm-2-omission',
    book: 'likutay-moharan',
    part: 2,
    torah: 0,
    displayNumber: 0,
    title: 'Omission at the Beginning (Hashmata)',
    hebrewTitle: 'השמטה בתחילה',
    keyVerse: 'אחד היה אברהם',
    keyVerseRef: 'Yechezkel 33:24',
    themes: ['Hashmata', 'Abraham'],
    keywords: [],
    simanim: [],
    segments: omissionEnSegments.map((text, i) => ({
      index: i + 1,
      he: '', // No Hebrew source available yet
      en: text,
    })),
    navigation: {
      prev: 'lm-2-intro',
      next: 'lm-2-1',
      prevUrl: '/reader/likutay-moharan/2/intro',
      nextUrl: '/reader/likutay-moharan/2/1',
    }
  };
  fs.writeFileSync(path.join(LM_DIR, 'omission.json'), JSON.stringify(omissionJson, null, 2), 'utf8');
  console.log(`  ${omissionEnSegments.length} segments (English)`);

  // ── 3. Torah 34 - add full Hebrew with nikud ──
  console.log('\n=== Torah 34 Hebrew ===');
  const torah34HeText = await extractDocx(path.join(VOL2_DIR, 'Volume 2 Torah 34 HEBREW  because it is missing on Torat Emet.docx'));
  const torah34HeSegments = splitIntoSegments(torah34HeText);

  // Read existing Torah 34 to merge English
  const existing34 = readJSON(path.join(LM_DIR, 'torah-34.json'));
  const existingEn34 = existing34?.segments?.[0]?.en || '';

  // Read English translation from lkm2 034.docx
  const torah34EnText = await extractDocx(path.join(VOL2_DIR, 'lkm2 034.docx'));
  const torah34EnSegments = splitIntoSegments(torah34EnText);
  // Remove title line
  if (torah34EnSegments[0]?.match(/Likutay Moharan|Torah 34/i)) {
    torah34EnSegments.shift();
  }

  // Build merged segments
  const torah34Segments = [];
  const maxSegs34 = Math.max(torah34HeSegments.length, torah34EnSegments.length);
  for (let i = 0; i < maxSegs34; i++) {
    torah34Segments.push({
      index: i + 1,
      he: torah34HeSegments[i] || '',
      en: torah34EnSegments[i] || '',
    });
  }

  if (existing34) {
    existing34.segments = torah34Segments;
    fs.writeFileSync(path.join(LM_DIR, 'torah-34.json'), JSON.stringify(existing34, null, 2), 'utf8');
    console.log(`  ${torah34Segments.length} segments (Hebrew with nikud + English). Was: ${existing34 ? 1 : 0} segments.`);
  }

  // ── 4. Torah 43 English (from lkm2 943.docx) ──
  console.log('\n=== Torah 43 English ===');
  const torah43EnText = await extractDocx(path.join(VOL2_DIR, 'lkm2 943.docx'));
  const torah43EnSegments = splitIntoSegments(torah43EnText);
  if (torah43EnSegments[0]?.match(/Likutay Moharan|Torah 43/i)) {
    torah43EnSegments.shift();
  }

  const existing43 = readJSON(path.join(LM_DIR, 'torah-43.json'));
  if (existing43) {
    // Merge English into existing Hebrew segments
    for (let i = 0; i < existing43.segments.length; i++) {
      if (torah43EnSegments[i]) {
        existing43.segments[i].en = torah43EnSegments[i];
      }
    }
    // If English has more segments, add them
    for (let i = existing43.segments.length; i < torah43EnSegments.length; i++) {
      existing43.segments.push({
        index: i + 1,
        he: '',
        en: torah43EnSegments[i],
      });
    }
    fs.writeFileSync(path.join(LM_DIR, 'torah-43.json'), JSON.stringify(existing43, null, 2), 'utf8');
    console.log(`  Added English to Torah 43: ${torah43EnSegments.length} English segments`);
  } else {
    console.log('  WARNING: torah-43.json not found!');
  }

  // ── 5. Handwriting/Manuscripts 1-6 ──
  console.log('\n=== Handwriting / Manuscripts ===');
  for (let i = 1; i <= 6; i++) {
    const filePath = path.join(VOL2_DIR, `Handwriting ${i}.docx`);
    if (!fs.existsSync(filePath)) {
      console.log(`  Handwriting ${i}: file not found, skipping`);
      continue;
    }

    const text = await extractDocx(filePath);
    const segments = splitIntoSegments(text);
    // Remove title lines
    while (segments.length > 0 && segments[0].match(/Appendage|Handwritten|Manuscript|Likutay Moharan/i)) {
      segments.shift();
    }

    const msJson = {
      id: `lm-2-manuscript-${i}`,
      book: 'likutay-moharan',
      part: 2,
      torah: 0,
      displayNumber: 0,
      title: `Handwritten Manuscript ${i}`,
      hebrewTitle: `כתב יד ${i}`,
      keyVerse: '',
      keyVerseRef: '',
      themes: ['Manuscript', 'Ksav Yad'],
      keywords: [],
      simanim: [],
      segments: segments.map((text, idx) => ({
        index: idx + 1,
        he: '', // No Hebrew source yet
        en: text,
      })),
      navigation: {
        prev: i > 1 ? `lm-2-manuscript-${i - 1}` : 'lm-2-125',
        next: i < 6 ? `lm-2-manuscript-${i + 1}` : null,
        prevUrl: i > 1 ? `/reader/likutay-moharan/2/manuscript-${i - 1}` : '/reader/likutay-moharan/2/125',
        nextUrl: i < 6 ? `/reader/likutay-moharan/2/manuscript-${i + 1}` : null,
      }
    };

    fs.writeFileSync(path.join(LM_DIR, `manuscript-${i}.json`), JSON.stringify(msJson, null, 2), 'utf8');
    console.log(`  Manuscript ${i}: ${segments.length} segments (English)`);
  }

  // ── 6. Update Part 2 route to include new pages ──
  console.log('\n=== Summary ===');
  console.log('New files added to', LM_DIR + ':');
  console.log('  - intro.json (Introduction)');
  console.log('  - omission.json (Hashmata)');
  console.log('  - torah-34.json (updated with full Hebrew)');
  console.log('  - torah-43.json (updated with English)');
  console.log('  - manuscript-1.json through manuscript-6.json');
  console.log('\nDONT FORGET: Update the [torah].astro route to handle these new slug values!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
