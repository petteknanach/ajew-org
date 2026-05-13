/**
 * fix-remaining-alignment.cjs
 *
 * Fixes English-Hebrew alignment for 3 books:
 * 1. Stories Reb Shmuel Horowitz - re-match English by story number
 * 2. Likutay Even - re-match English by section (halachah) number
 * 3. Kuntres Torah Ohr - re-match English by section number
 */

const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const HTML_DIR = 'C:/Users/Pettek/Downloads/final batch from TE';

// ============================================================
// UTILITY: Roman numeral to integer
// ============================================================
function romanToInt(roman) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  const s = roman.toUpperCase().trim();
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]] || 0;
    const next = map[s[i + 1]] || 0;
    if (cur < next) {
      result -= cur;
    } else {
      result += cur;
    }
  }
  return result;
}

// ============================================================
// 1. FIX STORIES REB SHMUEL HOROWITZ
// ============================================================
function fixStories() {
  console.log('\n=== FIXING STORIES REB SHMUEL HOROWITZ ===\n');

  const bookDir = path.join(READER_DIR, 'stories-סיפורים-מר--שמואל-הו');

  // Parse all 3 HTML files
  const htmlFiles = [
    path.join(HTML_DIR, 'sipurim_reb_shmuel_horowitz_part1.html'),
    path.join(HTML_DIR, 'sipurim_reb_shmuel_horowitz_part2.html'),
    path.join(HTML_DIR, 'sipurim_reb_shmuel_horowitz_part3.html'),
  ];

  // Build a map: storyNumber -> { paragraphs: [string], subject: string }
  const englishByNumber = {};

  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const $ = cheerio.load(html);

    const partLabel = $('header .part-label').text().trim() || '';
    console.log(`Parsing: ${path.basename(htmlFile)} (${partLabel})`);

    $('.story').each((i, el) => {
      const numText = $(el).find('.story-num').text().trim();
      const subject = $(el).find('.story-subject').text().trim();
      const paragraphs = [];

      $(el).find('.story-body p').each((j, p) => {
        const text = $(p).text().trim();
        if (text) paragraphs.push(text);
      });

      // Determine story number
      let storyNum;

      // Check for range like "158–160"
      const rangeMatch = numText.match(/^(\d+)\s*[–-]\s*(\d+)$/);
      if (rangeMatch) {
        // For ranges, store paragraphs split across the range
        const start = parseInt(rangeMatch[1]);
        const end = parseInt(rangeMatch[2]);
        // Distribute paragraphs across the range
        const count = end - start + 1;
        const parasPerStory = Math.ceil(paragraphs.length / count);
        for (let n = start; n <= end; n++) {
          const startIdx = (n - start) * parasPerStory;
          const endIdx = Math.min(startIdx + parasPerStory, paragraphs.length);
          const slice = paragraphs.slice(startIdx, endIdx);
          if (slice.length > 0) {
            englishByNumber[n] = { paragraphs: slice, subject };
          }
        }
        return;
      }

      // Try Arabic number first
      const arabicMatch = numText.match(/^(\d+)$/);
      if (arabicMatch) {
        storyNum = parseInt(arabicMatch[1]);
        // Part 2 uses numbers 1-82 but these are a DIFFERENT numbering
        // Part 2 stories map to JSON stories 37-118 (after Part 1's 36 stories)
        if (htmlFile.includes('part2')) {
          storyNum = 36 + storyNum; // offset by Part 1's 36 stories
        } else if (htmlFile.includes('part3')) {
          // Part 3 starts at 83 in its own numbering
          // These map to JSON stories 36 + 82 + (num - 83 + 1) = 118 + num - 83 + 1
          storyNum = 36 + 82 + (storyNum - 83 + 1);
          // Actually let me recalculate: part3 starts at story 83 in its numbering
          // Part 1 has 36 stories -> JSON 1-36
          // Part 2 has 82 stories -> JSON 37-118
          // Part 3 has stories numbered 83-165 -> JSON 119-202
          // So part3 story N maps to JSON: 36 + 82 + (N - 83 + 1) = 118 + N - 82 = N + 36
          storyNum = storyNum + 36;
        }
      } else {
        // Roman numeral (Part 1)
        storyNum = romanToInt(numText);
      }

      if (storyNum && paragraphs.length > 0) {
        englishByNumber[storyNum] = { paragraphs, subject };
      }
    });
  }

  console.log(`\nTotal English stories extracted: ${Object.keys(englishByNumber).length}`);
  console.log(`Story number range: ${Math.min(...Object.keys(englishByNumber).map(Number))} - ${Math.max(...Object.keys(englishByNumber).map(Number))}`);

  // Now update JSON files
  let updated = 0;
  let noMatch = 0;

  for (let i = 1; i <= 202; i++) {
    const jsonFile = path.join(bookDir, `story-${i}.json`);
    if (!fs.existsSync(jsonFile)) continue;

    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    const eng = englishByNumber[i];

    if (!eng) {
      noMatch++;
      continue;
    }

    // Update English in segments
    const segments = data.segments;
    for (let s = 0; s < segments.length; s++) {
      if (s < eng.paragraphs.length) {
        segments[s].en = eng.paragraphs[s];
      } else {
        // More Hebrew segments than English paragraphs - clear extra
        segments[s].en = '';
      }
    }

    // If there are more English paragraphs than segments, combine extras into last segment
    if (eng.paragraphs.length > segments.length && segments.length > 0) {
      const lastIdx = segments.length - 1;
      const extras = eng.paragraphs.slice(lastIdx);
      segments[lastIdx].en = extras.join('\n\n');
    }

    data.hasEnglish = segments.some(s => s.en && s.en.trim());

    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
    updated++;
  }

  console.log(`Updated: ${updated}, No English match: ${noMatch}`);

  // Print verification samples
  console.log('\n--- Verification Samples ---');
  for (const sample of [1, 36, 37, 50, 100, 118, 119, 150, 200]) {
    const jsonFile = path.join(bookDir, `story-${sample}.json`);
    if (!fs.existsSync(jsonFile)) continue;
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    const hePreview = (data.segments[0]?.he || '').substring(0, 60);
    const enPreview = (data.segments[0]?.en || '').substring(0, 80);
    console.log(`\nStory ${sample} (title: ${data.title}):`);
    console.log(`  HE: ${hePreview}...`);
    console.log(`  EN: ${enPreview}...`);
  }
}

// ============================================================
// 2. FIX LIKUTAY EVEN
// ============================================================
function fixLikutayEven() {
  console.log('\n\n=== FIXING LIKUTAY EVEN ===\n');

  const bookDir = path.join(READER_DIR, 'misc-ליקוטי-אבן');
  const htmlFile = path.join(HTML_DIR, 'likutay_even.html');
  const html = fs.readFileSync(htmlFile, 'utf-8');
  const $ = cheerio.load(html);

  // Extract sections from HTML - each .section-block is one halachah
  const sections = [];

  $('.section-block').each((i, el) => {
    const title = $(el).find('h2').text().trim();
    const sourceNote = $(el).find('.source-torah').text().trim();

    // Get all paragraphs that are direct children or after sub-markers
    // Each sub-marker + following p constitutes one sub-section
    const subSections = [];
    let currentSubText = [];

    // Walk through children - collect sub-markers and paragraphs
    $(el).children().each((j, child) => {
      const tag = child.tagName;
      const cls = $(child).attr('class') || '';

      if (cls.includes('sub-marker')) {
        // If we had accumulated text, save it
        if (currentSubText.length > 0) {
          subSections.push(currentSubText.join('\n\n'));
          currentSubText = [];
        }
        // Start new sub-section (the marker text itself is just a label)
      } else if (tag === 'p' && !cls.includes('sub-marker')) {
        const text = $(child).text().trim();
        if (text) currentSubText.push(text);
      } else if (tag === 'h2' || cls.includes('source-torah')) {
        // Skip headers and source notes
      }
    });

    // Save last accumulated text
    if (currentSubText.length > 0) {
      subSections.push(currentSubText.join('\n\n'));
    }

    sections.push({
      sectionNum: i + 1,
      title,
      sourceNote,
      subSections
    });
  });

  console.log(`Extracted ${sections.length} sections from HTML`);
  sections.forEach((s, i) => {
    console.log(`  Section ${i + 1}: "${s.title.substring(0, 50)}" - ${s.subSections.length} sub-sections`);
  });

  // Map sections to JSON files
  // The JSON has 11 files (section-1 through section-11)
  // Each JSON section has multiple segments corresponding to Hebrew sub-sections

  let updated = 0;

  for (let i = 1; i <= 11; i++) {
    const jsonFile = path.join(bookDir, `section-${i}.json`);
    if (!fs.existsSync(jsonFile)) continue;

    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    const segments = data.segments;

    // Match to HTML section by index
    if (i > sections.length) {
      console.log(`  Section ${i}: No HTML section to match`);
      continue;
    }

    const htmlSection = sections[i - 1];

    // The sub-sections in the HTML correspond to the segments in the JSON
    // Assign English sub-section text to matching segments
    for (let s = 0; s < segments.length; s++) {
      if (s < htmlSection.subSections.length) {
        segments[s].en = htmlSection.subSections[s];
      } else {
        segments[s].en = '';
      }
    }

    // If more sub-sections than segments, combine extras into last
    if (htmlSection.subSections.length > segments.length && segments.length > 0) {
      const lastIdx = segments.length - 1;
      const extras = htmlSection.subSections.slice(lastIdx);
      segments[lastIdx].en = extras.join('\n\n');
    }

    data.hasEnglish = segments.some(s => s.en && s.en.trim());

    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
    updated++;
  }

  console.log(`\nUpdated: ${updated} sections`);

  // Verification
  console.log('\n--- Verification Samples ---');
  for (const sample of [1, 5, 11]) {
    const jsonFile = path.join(bookDir, `section-${sample}.json`);
    if (!fs.existsSync(jsonFile)) continue;
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    console.log(`\nSection ${sample} (${data.title}): ${data.segments.length} segments`);
    if (data.segments[0]) {
      console.log(`  Seg 1 HE: ${(data.segments[0].he || '').substring(0, 60)}...`);
      console.log(`  Seg 1 EN: ${(data.segments[0].en || '').substring(0, 80)}...`);
    }
    if (data.segments.length > 1) {
      console.log(`  Seg 2 HE: ${(data.segments[1].he || '').substring(0, 60)}...`);
      console.log(`  Seg 2 EN: ${(data.segments[1].en || '').substring(0, 80)}...`);
    }
  }
}

// ============================================================
// 3. FIX KUNTRES TORAH OHR
// ============================================================
function fixKuntresTorahOhr() {
  console.log('\n\n=== FIXING KUNTRES TORAH OHR ===\n');

  const bookDir = path.join(READER_DIR, 'misc-קונטרס-תורה-אור');
  const htmlFile = path.join(HTML_DIR, 'kuntres_torah_ohr.html');
  const html = fs.readFileSync(htmlFile, 'utf-8');
  const $ = cheerio.load(html);

  // Extract sections by id (sec-1 through sec-42)
  const sectionsByNum = {};

  $('div.section').each((i, el) => {
    const id = $(el).attr('id') || '';
    const match = id.match(/sec-(\d+)/);
    if (!match) return;

    const num = parseInt(match[1]);
    const paragraphs = [];

    $(el).find('p').each((j, p) => {
      const cls = $(p).attr('class') || '';
      // Skip translator notes
      if (cls.includes('translator-note')) return;
      const text = $(p).text().trim();
      if (text) paragraphs.push(text);
    });

    sectionsByNum[num] = paragraphs;
  });

  console.log(`Extracted ${Object.keys(sectionsByNum).length} sections from HTML`);

  // JSON structure:
  // section-1.json (title: "קונטרס תורה אור") is the intro - maps to nothing or sec-1
  // section-2.json (title: "א") maps to HTML sec-1
  // section-3.json (title: "ב") maps to HTML sec-2
  // ...
  // section-N.json maps to HTML sec-(N-1)
  // BUT section-1 is special (intro) - it should get ALL of sec-1's paragraphs

  // Actually looking at the data:
  // section-1.json has Hebrew intro text and currently has sec-1 paragraph 1 as English
  // section-2.json has Hebrew of sec-1 content and currently has sec-1 paragraph 2 as English
  //
  // The correct mapping should be:
  // section-1.json (intro) -> no English translation (or combine all sec-1 paragraphs)
  // section-2.json (title "א") -> HTML sec-1 paragraphs (all of them)
  // section-3.json (title "ב") -> HTML sec-2 paragraphs
  // etc.

  // Wait, let me re-examine. The Hebrew in section-2 is the full text of the first teaching.
  // The HTML sec-1 also covers the first teaching. So:
  // JSON section 1 = intro header -> gets nothing or short intro text
  // JSON section 2 = teaching א -> HTML sec-1
  // JSON section 3 = teaching ב -> HTML sec-2
  // JSON section N = teaching N-1 -> HTML sec-(N-1)
  // JSON section 43 = teaching מב -> HTML sec-42

  let updated = 0;

  for (let i = 1; i <= 43; i++) {
    const jsonFile = path.join(bookDir, `section-${i}.json`);
    if (!fs.existsSync(jsonFile)) continue;

    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    const segments = data.segments;

    if (i === 1) {
      // Intro section - the English for section 1 should be the HTML sec-1 content
      // Actually, looking at the JSON section-1 Hebrew, it's just the title/author line.
      // The full content is in section-2. Let's give section-1 a brief intro from sec-1.
      // But actually section-1's Hebrew is just "מגודל מעלת לימוד התורה ע\"פ רבינו הקדוש\nלוקט על ידי הרה\"ח ר' שמואל צ'צ'יק ז\"ל"
      // This is just the subtitle. No matching English section in the HTML for this intro.
      // We can assign it the full sec-1 paragraphs since that's what the book opens with.
      const sec1 = sectionsByNum[1];
      if (sec1 && sec1.length > 0 && segments.length > 0) {
        // Combine all paragraphs for the intro
        segments[0].en = sec1.join('\n\n');
        data.hasEnglish = true;
        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
        updated++;
      }
      continue;
    }

    // For sections 2-43, map to HTML sec-(i-1)
    const htmlSecNum = i - 1;
    const htmlParas = sectionsByNum[htmlSecNum];

    if (!htmlParas || htmlParas.length === 0) {
      console.log(`  Section ${i} (title: ${data.title}): No HTML match for sec-${htmlSecNum}`);
      continue;
    }

    // Each JSON section typically has 1 segment with all the text
    if (segments.length === 1) {
      // Combine all HTML paragraphs into one English block
      segments[0].en = htmlParas.join('\n\n');
    } else {
      // Multiple segments - try to distribute
      for (let s = 0; s < segments.length; s++) {
        if (s < htmlParas.length) {
          segments[s].en = htmlParas[s];
        } else {
          segments[s].en = '';
        }
      }
      // If more paragraphs than segments, combine extras into last
      if (htmlParas.length > segments.length && segments.length > 0) {
        const lastIdx = segments.length - 1;
        const extras = htmlParas.slice(lastIdx);
        segments[lastIdx].en = extras.join('\n\n');
      }
    }

    data.hasEnglish = segments.some(s => s.en && s.en.trim());
    fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2));
    updated++;
  }

  console.log(`\nUpdated: ${updated} sections`);

  // Verification
  console.log('\n--- Verification Samples ---');
  for (const sample of [1, 2, 10, 20, 42, 43]) {
    const jsonFile = path.join(bookDir, `section-${sample}.json`);
    if (!fs.existsSync(jsonFile)) continue;
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
    const hePreview = (data.segments[0]?.he || '').substring(0, 60);
    const enPreview = (data.segments[0]?.en || '').substring(0, 80);
    console.log(`\nSection ${sample} (title: ${data.title}):`);
    console.log(`  HE: ${hePreview}...`);
    console.log(`  EN: ${enPreview}...`);
  }
}

// ============================================================
// MAIN
// ============================================================
try {
  fixStories();
  fixLikutayEven();
  fixKuntresTorahOhr();
  console.log('\n\nDone! All 3 books fixed.');
} catch (err) {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}
