/**
 * Parse Ebay HaNachal Volume 3 English translation HTML files
 * into reader JSON format (letter-1.json through letter-444.json + appendix letters)
 *
 * Source: Blossoms of the Stream Vol 3 HTML files
 * Output: public/reader/ebay-hanachal/part-3/
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SOURCE_DIR = path.join(__dirname, '..', '..', '..', '..', 'Documents', 'Claude Desktop projects', 'Finished', 'Blossoms of the Stream');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'reader', 'ebay-hanachal', 'part-3');

// All 19 HTML files in order
const HTML_FILES = [
  'blossoms_of_the_stream_vol3_1_30_corrected.html',
  'blossoms_of_the_stream_vol3_31_50_corrected.html',
  'blossoms_of_the_stream_vol3_51_66_corrected.html',
  'blossoms_of_the_stream_vol3_67_86_corrected.html',
  'blossoms_of_the_stream_vol3_87_119.html',
  'blossoms_of_the_stream_vol3_119_144_corrected.html',
  'blossoms_of_the_stream_vol3_145_170_corrected.html',
  'blossoms_of_the_stream_vol3_171_199_corrected (1).html',
  'blossoms_vol3_200_221_corrected.html',
  'blossoms_vol3_222_248_corrected.html',
  'blossoms_vol3_249_280_corrected.html',
  'blossoms_vol3_281_300.html',
  'blossoms_vol3_301_318.html',
  'blossoms_vol3_319_343_corrected.html',
  'blossoms_vol3_344_369_corrected.html',
  'blossoms_vol3_370_391_corrected.html',
  'blossoms_vol3_392_410_corrected.html',
  'blossoms_vol3_411_430.html',
  'blossoms_vol3_431_444_appendix.html',
];

/**
 * Extract text content from an element, preserving meaningful whitespace
 * but stripping HTML tags while keeping the text
 */
function extractText($, el) {
  // Get the text content, preserving inline structure
  const html = $(el).html();
  if (!html) return '';

  // Load the inner HTML to process it
  const inner = cheerio.load(`<div>${html}</div>`, { decodeEntities: false });

  // Replace <br> with newlines
  inner('br').replaceWith('\n');

  // Get text and clean up
  let text = inner('div').first().text();
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Parse a single HTML file and extract letters with their content
 */
function parseHtmlFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);

  const letters = [];
  let currentLetter = null;

  // Walk through body children
  $('body').children().each((i, el) => {
    const tag = $(el).prop('tagName');

    if (tag === 'H2') {
      // Start of a new letter
      const headerText = $(el).text().trim();

      // Parse the letter identifier
      let letterNum = null;
      let isAppendix = false;
      let appendixNum = null;

      const appendixMatch = headerText.match(/^Appendix\s+Letter\s+(\d+)/i);
      const letterMatch = headerText.match(/^Letter\s+(\d+)/i);

      if (appendixMatch) {
        isAppendix = true;
        appendixNum = parseInt(appendixMatch[1]);
      } else if (letterMatch) {
        letterNum = parseInt(letterMatch[1]);
      }

      if (letterNum !== null || isAppendix) {
        // Save previous letter
        if (currentLetter) {
          letters.push(currentLetter);
        }

        currentLetter = {
          letterNum,
          isAppendix,
          appendixNum,
          headerText,
          segments: [],
        };
      }
    } else if (tag === 'H3' && currentLetter === null) {
      // Appendix section header (like "-- Additions --") - skip
    } else if (currentLetter) {
      // Content belonging to current letter
      if (tag === 'HR') {
        // Section break - ignore
        return;
      }

      const text = extractText($, el);
      if (!text) return;

      // Determine segment type based on class
      const classes = $(el).attr('class') || '';

      if (classes.includes('letter-header')) {
        // Letter header (date, headline) - include as a segment
        // Extract date and headline separately
        const date = $(el).find('.date').text().trim();
        const headline = $(el).find('.headline').text().trim();

        if (date && headline) {
          currentLetter.segments.push(date + '\n' + headline);
        } else if (date) {
          currentLetter.segments.push(date);
        } else if (headline) {
          currentLetter.segments.push(headline);
        } else if (text) {
          currentLetter.segments.push(text);
        }
      } else if (classes.includes('na-nach')) {
        currentLetter.segments.push(text);
      } else if (classes.includes('sig')) {
        currentLetter.segments.push(text);
      } else if (classes.includes('prayer')) {
        currentLetter.segments.push(text);
      } else if (tag === 'DIV' && classes.includes('prayer')) {
        currentLetter.segments.push(text);
      } else {
        // Regular paragraph or bracket-note
        if (text.length > 0) {
          currentLetter.segments.push(text);
        }
      }
    }
  });

  // Don't forget the last letter
  if (currentLetter) {
    letters.push(currentLetter);
  }

  return letters;
}

/**
 * Convert Hebrew number to letter for display
 */
function hebrewNumber(n) {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת'];

  if (n <= 0) return String(n);

  // Handle special cases
  if (n === 15) return 'ט"ו';
  if (n === 16) return 'ט"ז';

  let result = '';
  if (n >= 400) {
    const numTav = Math.floor(n / 400);
    for (let i = 0; i < numTav; i++) result += 'ת';
    n %= 400;
  }
  if (n >= 100) {
    result += hundreds[Math.floor(n / 100)];
    n %= 100;
  }
  if (n >= 10) {
    // Special: 15 = טו, 16 = טז
    if (n === 15) {
      result += 'ט"ו';
      return result;
    }
    if (n === 16) {
      result += 'ט"ז';
      return result;
    }
    result += tens[Math.floor(n / 10)];
    n %= 10;
  }
  if (n > 0) {
    result += ones[n];
  }

  // Add geresh or gershayim
  if (result.length === 1) {
    result += "'";
  } else if (result.length > 1) {
    result = result.slice(0, -1) + '"' + result.slice(-1);
  }

  return result;
}

function main() {
  console.log('Parsing Ebay HaNachal Volume 3...');
  console.log('Source:', SOURCE_DIR);
  console.log('Output:', OUTPUT_DIR);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Parse all HTML files
  const allLetters = [];
  const seenLetterNums = new Set();

  for (const file of HTML_FILES) {
    const filePath = path.join(SOURCE_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.error(`WARNING: File not found: ${file}`);
      continue;
    }
    console.log(`Parsing: ${file}`);
    const letters = parseHtmlFile(filePath);
    console.log(`  Found ${letters.length} letters`);

    for (const letter of letters) {
      // Handle duplicate letters across overlapping files
      if (!letter.isAppendix && letter.letterNum !== null) {
        if (seenLetterNums.has(letter.letterNum)) {
          console.log(`  Skipping duplicate Letter ${letter.letterNum}`);
          continue;
        }
        seenLetterNums.add(letter.letterNum);
      }
      allLetters.push(letter);
    }
  }

  // Separate regular letters and appendix letters
  const regularLetters = allLetters.filter(l => !l.isAppendix);
  const appendixLetters = allLetters.filter(l => l.isAppendix);

  console.log(`\nTotal regular letters: ${regularLetters.length}`);
  console.log(`Total appendix letters: ${appendixLetters.length}`);

  // Verify we have letters 1-444
  const maxNum = Math.max(...regularLetters.map(l => l.letterNum));
  console.log(`Letter range: 1-${maxNum}`);

  // Generate letter JSONs
  // Regular letters: letter-1.json through letter-444.json
  // Appendix letters: letter-445.json through letter-{444+appendixCount}.json

  const torahsIndex = [];
  let fileCount = 0;

  for (const letter of regularLetters) {
    const num = letter.letterNum;
    const segments = letter.segments.map((text, idx) => ({
      index: idx + 1,
      he: '',
      en: text,
    }));

    // Ensure at least one segment
    if (segments.length === 0) {
      segments.push({ index: 1, he: '', en: '[This letter is not preserved in the source text.]' });
    }

    const letterData = {
      id: `eh-3-${num}`,
      book: 'ebay-hanachal',
      part: 3,
      torah: num,
      displayNumber: num,
      title: `Letter ${num}`,
      hebrewTitle: `מכתב ${hebrewNumber(num)}`,
      keyVerse: '',
      keyVerseTranslation: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments,
      hasEnglish: true,
      navigation: {
        prevUrl: num > 1 ? `/reader/ebay-hanachal/3/${num - 1}` : null,
        nextUrl: `/reader/ebay-hanachal/3/${num + 1}`,
      },
    };

    const outFile = path.join(OUTPUT_DIR, `letter-${num}.json`);
    fs.writeFileSync(outFile, JSON.stringify(letterData, null, 2), 'utf8');
    fileCount++;

    torahsIndex.push({
      number: num,
      displayNumber: num,
      title: `Letter ${num}`,
      hebrewTitle: `מכתב ${hebrewNumber(num)}`,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: true,
      url: `/reader/ebay-hanachal/3/${num}`,
    });
  }

  // Process appendix letters
  for (const letter of appendixLetters) {
    const appendixIdx = letter.appendixNum;
    const fileNum = 444 + appendixIdx; // letter-445.json, letter-446.json, etc.

    const segments = letter.segments.map((text, idx) => ({
      index: idx + 1,
      he: '',
      en: text,
    }));

    if (segments.length === 0) {
      segments.push({ index: 1, he: '', en: '[This letter is not preserved in the source text.]' });
    }

    const letterData = {
      id: `eh-3-appendix-${appendixIdx}`,
      book: 'ebay-hanachal',
      part: 3,
      torah: fileNum,
      displayNumber: fileNum,
      title: `Appendix Letter ${appendixIdx}`,
      hebrewTitle: `נספח ${hebrewNumber(appendixIdx)}`,
      keyVerse: '',
      keyVerseTranslation: '',
      keyVerseRef: '',
      themes: [],
      keywords: [],
      simanim: [],
      segments,
      hasEnglish: true,
      navigation: {
        prevUrl: fileNum > 1 ? `/reader/ebay-hanachal/3/${fileNum - 1}` : null,
        nextUrl: appendixIdx < appendixLetters.length ? `/reader/ebay-hanachal/3/${fileNum + 1}` : null,
      },
    };

    const outFile = path.join(OUTPUT_DIR, `letter-${fileNum}.json`);
    fs.writeFileSync(outFile, JSON.stringify(letterData, null, 2), 'utf8');
    fileCount++;

    torahsIndex.push({
      number: fileNum,
      displayNumber: fileNum,
      title: `Appendix Letter ${appendixIdx}`,
      hebrewTitle: `נספח ${hebrewNumber(appendixIdx)}`,
      themes: [],
      paragraphs: segments.length,
      hasEnglish: true,
      url: `/reader/ebay-hanachal/3/${fileNum}`,
    });
  }

  // Fix navigation for last regular letter -> first appendix
  if (appendixLetters.length > 0) {
    const lastRegularNum = 444;
    const lastRegularFile = path.join(OUTPUT_DIR, `letter-${lastRegularNum}.json`);
    if (fs.existsSync(lastRegularFile)) {
      const data = JSON.parse(fs.readFileSync(lastRegularFile, 'utf8'));
      data.navigation.nextUrl = `/reader/ebay-hanachal/3/445`;
      fs.writeFileSync(lastRegularFile, JSON.stringify(data, null, 2), 'utf8');
    }
  }

  // Fix navigation for last appendix letter
  const totalLetters = 444 + appendixLetters.length;
  const lastFile = path.join(OUTPUT_DIR, `letter-${totalLetters}.json`);
  if (fs.existsSync(lastFile)) {
    const data = JSON.parse(fs.readFileSync(lastFile, 'utf8'));
    data.navigation.nextUrl = null;
    fs.writeFileSync(lastFile, JSON.stringify(data, null, 2), 'utf8');
  }

  // Generate index.json
  const indexData = {
    book: 'ebay-hanachal',
    part: 3,
    title: 'Ebay HaNachal - Part 3',
    hebrewTitle: 'אבי הנחל - חלק ג',
    author: 'Rabbi Yisroel Dov Odesser (Saba)',
    hebrewAuthor: 'רבי ישראל דב אודסר (הסבא)',
    totalTorahs: totalLetters,
    torahs: torahsIndex,
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexData, null, 2), 'utf8');

  console.log(`\nDone! Generated ${fileCount} letter files + index.json`);
  console.log(`Total entries: ${totalLetters} (444 regular + ${appendixLetters.length} appendix)`);

  // Report some stats
  const segCounts = torahsIndex.map(t => t.paragraphs);
  const totalSegments = segCounts.reduce((a, b) => a + b, 0);
  console.log(`Total segments: ${totalSegments}`);
  console.log(`Average segments per letter: ${(totalSegments / torahsIndex.length).toFixed(1)}`);
}

main();
