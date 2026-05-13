/**
 * Import missing English translations into ajew.org reader JSON files
 * Sources: Sefer HaMidos, Shivchay HaRan, Hashtatfchus HaNefesh, Ebay HaNachal, Likutay Halachos
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');

// Stats tracking
const stats = {
  'sefer-hamidos': 0,
  'shivchay-haran': 0,
  'hashtatfchus-hanefesh': 0,
  'ebay-hanachal': 0,
  'likutay-halachos-part4': 0,
  'likutay-halachos-part5': 0,
};

function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractParagraphs(html) {
  // Split HTML into paragraphs, strip tags, clean
  const paragraphs = [];
  // Split by <p> tags or <br> tags
  const parts = html.split(/<\/p>|<br\s*\/?>/).map(p => {
    return p
      .replace(/<p[^>]*>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(p => p.length > 0);
  return parts;
}

function updateJsonFile(filePath, segmentEnglish, skipFirst) {
  if (!fs.existsSync(filePath)) {
    console.log(`  WARNING: File not found: ${filePath}`);
    return false;
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updated = false;
  let startIdx = skipFirst ? 1 : 0; // skip "חלק שני" header segment if needed
  let enIdx = 0;

  for (let i = startIdx; i < data.segments.length && enIdx < segmentEnglish.length; i++) {
    const seg = data.segments[i];
    if (!seg.en || seg.en.trim() === '') {
      seg.en = segmentEnglish[enIdx];
      updated = true;
      enIdx++;
    }
  }

  if (updated) {
    data.hasEnglish = true;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  }
  return false;
}

// ============================================================
// 1. SEFER HAMIDOS - Topics 7 and 70
// ============================================================
async function importSeferHamidos() {
  console.log('\n=== SEFER HAMIDOS ===');
  const docPath = 'C:/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/Sefer Hamidos updated Continuous Hebrew English 2021 version.docx';

  if (!fs.existsSync(docPath)) {
    console.log('ERROR: Source file not found:', docPath);
    return;
  }

  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  // The Sefer HaMidos has topics with Hebrew titles
  // Topic 7 = ארץ-ישראל (Eretz Yisrael)
  // Topic 70 = נר תמיד (Ner Tamid)

  // Read the existing JSON to get the Hebrew titles
  const topic7 = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-7.json'), 'utf8'));
  const topic70 = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-70.json'), 'utf8'));

  console.log('Topic 7 title:', topic7.title, '- segments:', topic7.segments.length);
  console.log('Topic 70 title:', topic70.title, '- segments:', topic70.segments.length);

  // Parse the HTML to find English translations by topic
  // The document alternates Hebrew and English. We need to find sections for topics 7 and 70
  // These are Part 2 topics. Look for the topic headers in the HTML

  // Strategy: find the Hebrew topic name, then extract the English that follows each Hebrew entry
  // The doc format: Hebrew line, then English translation below it

  // Let's extract all text blocks
  const lines = html.split(/<\/p>|<br\s*\/?>/).map(l =>
    l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
  ).filter(l => l.length > 0);

  // Find "Eretz Yisrael" section (topic 7) - Part 2
  // The Hebrew title is ארץ-ישראל
  // In the English version, look for "Land of Israel" or "Eretz Yisrael"

  let topic7English = [];
  let topic70English = [];

  // Find topic boundaries - look for the topic headers
  // In the continuous version, each entry has a Hebrew letter number followed by English translation

  // Let's look for the Part 2 section and topic markers
  // The format typically has: Hebrew topic name, then numbered entries in Hebrew + English

  // Search for the specific topic sections
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for "Eretz Yisrael" or "Land of Israel" as a topic header
    if (/eretz[- ]?yisra[ea]l|land of israel/i.test(line) && !topic7English.length) {
      console.log(`  Found topic 7 header at line ${i}: "${line.substring(0, 80)}"`);
      // Collect English entries that follow
      // Skip the header, find numbered entries
      let collecting = true;
      for (let j = i + 1; j < lines.length && collecting; j++) {
        const entry = lines[j];
        // Check if this is a new topic header (all-caps or short Hebrew)
        if (isTopicHeader(entry, lines, j)) {
          collecting = false;
          break;
        }
        // Check if this is English text (not Hebrew)
        if (isEnglish(entry) && entry.length > 5) {
          topic7English.push(entry);
        }
      }
      console.log(`  Collected ${topic7English.length} English entries for topic 7`);
    }

    // Look for "Ner Tamid" or "Eternal Light" or "Constant Candle"
    if ((/ner tamid|eternal (light|candle|flame)/i.test(line) || /constant.*candle/i.test(line) || /perpetual.*light/i.test(line)) && !topic70English.length) {
      console.log(`  Found topic 70 header at line ${i}: "${line.substring(0, 80)}"`);
      let collecting = true;
      for (let j = i + 1; j < lines.length && collecting; j++) {
        const entry = lines[j];
        if (isTopicHeader(entry, lines, j)) {
          collecting = false;
          break;
        }
        if (isEnglish(entry) && entry.length > 5) {
          topic70English.push(entry);
        }
      }
      console.log(`  Collected ${topic70English.length} English entries for topic 70`);
    }
  }

  // If we didn't find them by name, try a different approach - search by content matching
  if (topic7English.length === 0 || topic70English.length === 0) {
    console.log('  Trying content-matching approach...');
    // For each Hebrew segment, find its English translation in the document
    if (topic7English.length === 0) {
      topic7English = findTranslationsByHebrew(lines, topic7);
    }
    if (topic70English.length === 0) {
      topic70English = findTranslationsByHebrew(lines, topic70);
    }
  }

  // Apply translations
  if (topic7English.length > 0) {
    // Skip first segment if it's "חלק שני" header
    const hasHeader = topic7.segments[0].he.includes('חלק שני');
    const enArr = topic7English;
    let enIdx = 0;
    let startSeg = hasHeader ? 1 : 0;

    for (let i = startSeg; i < topic7.segments.length && enIdx < enArr.length; i++) {
      if (!topic7.segments[i].en || topic7.segments[i].en.trim() === '') {
        topic7.segments[i].en = enArr[enIdx];
        enIdx++;
      }
    }
    topic7.hasEnglish = true;
    fs.writeFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-7.json'), JSON.stringify(topic7, null, 2));
    console.log(`  Updated topic-7.json with ${enIdx} translations`);
    stats['sefer-hamidos']++;
  } else {
    console.log('  WARNING: Could not find English for topic 7');
  }

  if (topic70English.length > 0) {
    const hasHeader = topic70.segments[0].he.includes('חלק שני');
    const enArr = topic70English;
    let enIdx = 0;
    let startSeg = hasHeader ? 1 : 0;

    for (let i = startSeg; i < topic70.segments.length && enIdx < enArr.length; i++) {
      if (!topic70.segments[i].en || topic70.segments[i].en.trim() === '') {
        topic70.segments[i].en = enArr[enIdx];
        enIdx++;
      }
    }
    topic70.hasEnglish = true;
    fs.writeFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-70.json'), JSON.stringify(topic70, null, 2));
    console.log(`  Updated topic-70.json with ${enIdx} translations`);
    stats['sefer-hamidos']++;
  } else {
    console.log('  WARNING: Could not find English for topic 70');
  }
}

function isTopicHeader(line, lines, idx) {
  // Hebrew-only short line could be a topic header
  if (/^[\u0590-\u05FF\s\-\.]+$/.test(line) && line.length < 50 && line.length > 1) {
    // Check if the next line is also short or starts a new section
    return true;
  }
  // All-caps English header
  if (/^[A-Z][A-Z\s\-,]+$/.test(line) && line.length < 50) return true;
  // "Part Two" or section markers
  if (/^part (one|two|1|2)/i.test(line)) return true;
  return false;
}

function isEnglish(text) {
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  return englishChars > hebrewChars;
}

function findTranslationsByHebrew(allLines, jsonData) {
  // For each Hebrew segment, find where it appears in the document
  // then grab the English line that follows it
  const translations = [];
  const startSeg = jsonData.segments[0].he.includes('חלק שני') ? 1 : 0;

  for (let s = startSeg; s < jsonData.segments.length; s++) {
    const seg = jsonData.segments[s];
    if (seg.en && seg.en.trim() !== '') continue; // already has English

    // Get a Hebrew snippet to search for
    const heClean = seg.he.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    // Take first 30 chars of Hebrew content (skip the letter number prefix)
    const heSnippet = heClean.replace(/^[א-ת]\.\s*/, '').substring(0, 30);

    if (heSnippet.length < 5) continue;

    // Find this snippet in the document
    for (let i = 0; i < allLines.length; i++) {
      if (allLines[i].includes(heSnippet)) {
        // Found the Hebrew, look for the English translation after it
        for (let j = i + 1; j < Math.min(i + 5, allLines.length); j++) {
          if (isEnglish(allLines[j]) && allLines[j].length > 10) {
            translations.push(allLines[j]);
            break;
          }
        }
        break;
      }
    }
  }
  return translations;
}

// ============================================================
// 2. SHIVCHAY HARAN - Section 64
// ============================================================
async function importShivchayHaran() {
  console.log('\n=== SHIVCHAY HARAN ===');
  const docPath = 'C:/Users/Pettek/Documents/Translations/Shivchay HuRan - The Praises of Rabbi Nachman.docx';

  if (!fs.existsSync(docPath)) {
    console.log('ERROR: Source file not found:', docPath);
    return;
  }

  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  const jsonPath = path.join(READER_DIR, 'shivchay-haran', 'section-64.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('Section 64 title:', data.title, '- segments:', data.segments.length);

  // Extract all text lines from the docx
  const lines = html.split(/<\/p>|<br\s*\/?>/).map(l =>
    l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
  ).filter(l => l.length > 0);

  // Section 64 is a story/parable. The Hebrew starts with פעם אחד שלח מלך אחד
  // Look for this story's English translation

  // First, find the Hebrew text in the document
  const heSnippet = 'פעם אחד שלח מלך';
  let storyStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(heSnippet)) {
      storyStart = i;
      console.log(`  Found Hebrew text at line ${i}: "${lines[i].substring(0, 60)}..."`);
      break;
    }
  }

  if (storyStart === -1) {
    // Try searching for "Once a king sent" or similar English
    for (let i = 0; i < lines.length; i++) {
      if (/once.*king.*sent.*three/i.test(lines[i]) || /king.*sent.*three.*men/i.test(lines[i])) {
        console.log(`  Found English translation at line ${i}: "${lines[i].substring(0, 80)}..."`);
        // Collect English paragraphs for this story
        const englishParts = [];
        for (let j = i; j < lines.length; j++) {
          if (isEnglish(lines[j]) && lines[j].length > 10) {
            englishParts.push(lines[j]);
          }
          // Stop when we hit a new section marker or very different content
          if (englishParts.length >= data.segments.length) break;
          if (j > i + 20) break; // safety limit
        }

        if (englishParts.length > 0) {
          applyTranslations(data, englishParts);
          fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
          console.log(`  Updated section-64.json with ${englishParts.length} translations`);
          stats['shivchay-haran']++;
        }
        return;
      }
    }

    // Try another approach - look for section number 36 (the display number)
    // or look near the end of the document since section 64 is near the end
    console.log('  Trying to find section 36 / section 64 marker...');
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*36\s*$/.test(lines[i]) || /section\s*36/i.test(lines[i]) || /^\s*64\s*$/.test(lines[i])) {
        console.log(`  Found section marker at line ${i}: "${lines[i]}"`);
        // Look ahead for English text
        const englishParts = [];
        for (let j = i + 1; j < Math.min(i + 30, lines.length); j++) {
          if (isEnglish(lines[j]) && lines[j].length > 10) {
            englishParts.push(lines[j]);
          }
          if (englishParts.length >= data.segments.length) break;
        }
        if (englishParts.length > 0) {
          applyTranslations(data, englishParts);
          fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
          console.log(`  Updated section-64.json with ${englishParts.length} translations`);
          stats['shivchay-haran']++;
          return;
        }
      }
    }

    console.log('  WARNING: Could not find English translation for section 64');
    // Dump some context for debugging
    console.log('  Last 20 lines of document:');
    lines.slice(-20).forEach((l, i) => console.log(`    [${lines.length - 20 + i}] ${l.substring(0, 100)}`));
  } else {
    // Found Hebrew, look for English translation nearby
    const englishParts = [];
    for (let j = storyStart + 1; j < Math.min(storyStart + 50, lines.length); j++) {
      if (isEnglish(lines[j]) && lines[j].length > 10) {
        englishParts.push(lines[j]);
      }
      if (englishParts.length >= data.segments.length) break;
    }

    if (englishParts.length > 0) {
      applyTranslations(data, englishParts);
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`  Updated section-64.json with ${englishParts.length} translations`);
      stats['shivchay-haran']++;
    } else {
      console.log('  WARNING: Found Hebrew but no English translation nearby');
    }
  }
}

function applyTranslations(data, englishParts) {
  let enIdx = 0;
  for (let i = 0; i < data.segments.length && enIdx < englishParts.length; i++) {
    if (!data.segments[i].en || data.segments[i].en.trim() === '') {
      data.segments[i].en = englishParts[enIdx];
      enIdx++;
    }
  }
  data.hasEnglish = true;
}

// ============================================================
// 3. HASHTATFCHUS HANEFESH - Section 5
// ============================================================
async function importHashtatfchus() {
  console.log('\n=== HASHTATFCHUS HANEFESH ===');
  const docPath = 'C:/Users/Pettek/Documents/Translations/Hisbodidus Alone Time/Hisbodidus Alone Time.docx';

  if (!fs.existsSync(docPath)) {
    console.log('ERROR: Source file not found:', docPath);
    return;
  }

  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  const jsonPath = path.join(READER_DIR, 'hashtatfchus-hanefesh', 'section-5.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log('Section 5 title:', data.title, '- segments:', data.segments.length);
  console.log('Current en value:', JSON.stringify(data.segments[0].en));

  // The section currently has en: "Crying in Prayer" which is just a title
  // The Hebrew is a Gemara passage about teshuvah
  // Look for the full English translation

  const lines = html.split(/<\/p>|<br\s*\/?>/).map(l =>
    l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
  ).filter(l => l.length > 0);

  // The Hebrew has: אמר רבי יצחק - R' Yitzchak said...
  // Look for "Rabbi Yitzchak" or "R' Yitzchak" or the crying/prayer section

  // First try to find the Hebrew text
  const heSnippet = 'אמר רבי יצחק';
  let sectionStart = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(heSnippet) || /crying.*prayer|prayer.*crying/i.test(lines[i]) || /rabbi yitzchak/i.test(lines[i])) {
      console.log(`  Found potential match at line ${i}: "${lines[i].substring(0, 80)}"`);
      sectionStart = i;
      break;
    }
  }

  // Look for "Section 3" or "Ois 3" (since title is אות-ג which is ois gimel = section 3)
  // Or find it by document structure
  if (sectionStart === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (/^(section|ois|letter)\s*[3g]/i.test(lines[i]) || /^ג['"]?\s*$/.test(lines[i]) || lines[i] === 'ג' || lines[i] === 'ג.') {
        console.log(`  Found section marker at line ${i}: "${lines[i]}"`);
        sectionStart = i;
        break;
      }
    }
  }

  // Try searching for the English content about crying in prayer
  if (sectionStart === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (/come and see.*not like.*the measure/i.test(lines[i]) || /holy.*blessed.*measure.*flesh/i.test(lines[i])) {
        console.log(`  Found English content at line ${i}: "${lines[i].substring(0, 80)}"`);
        sectionStart = i;
        break;
      }
    }
  }

  if (sectionStart !== -1) {
    // Collect English text around this section
    const englishParts = [];
    for (let j = Math.max(0, sectionStart - 2); j < Math.min(sectionStart + 20, lines.length); j++) {
      if (isEnglish(lines[j]) && lines[j].length > 15) {
        englishParts.push(lines[j]);
      }
    }

    if (englishParts.length > 0) {
      // The section only has 1 segment, so combine all English into one
      const fullEnglish = englishParts.join(' ');
      data.segments[0].en = fullEnglish;
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`  Updated section-5.json with English translation (${fullEnglish.length} chars)`);
      stats['hashtatfchus-hanefesh']++;
    } else {
      console.log('  WARNING: Found section but no English translation');
    }
  } else {
    console.log('  WARNING: Could not find section 5 in the document');
    // Debug: dump some lines
    console.log('  Sample lines from document:');
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      if (isEnglish(lines[i])) {
        console.log(`    [${i}] ${lines[i].substring(0, 100)}`);
      }
    }
  }
}

// ============================================================
// 4. EBAY HANACHAL - Letters 31-37
// ============================================================
async function importEbayHanachal() {
  console.log('\n=== EBAY HANACHAL ===');
  const sourceDir = 'C:/Users/Pettek/Documents/Translations/Blossoms of the Spring/';

  // The letters and their source files
  const letterFiles = [
    { readerNum: 31, file: 'Letter 31 - final fixed.docx' },
    { readerNum: 32, file: 'Letter 32.docx' },
    { readerNum: 33, file: 'Letter 33 old 35 new - improved.docx' },
    { readerNum: 34, file: 'Letter 34 old 38 new - improved.docx' },
    { readerNum: 35, file: 'Letter 35 old 39 new.docx' },
    { readerNum: 36, file: 'Letter 36 - new 40.docx' },
    { readerNum: 37, file: 'Letter 37.docx' },
  ];

  for (const { readerNum, file } of letterFiles) {
    const docPath = path.join(sourceDir, file);
    const jsonPath = path.join(READER_DIR, 'ebay-hanachal', 'part-1', `letter-${readerNum}.json`);

    if (!fs.existsSync(docPath)) {
      console.log(`  WARNING: Source file not found: ${file}`);
      continue;
    }

    if (!fs.existsSync(jsonPath)) {
      console.log(`  WARNING: JSON file not found: letter-${readerNum}.json`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Check if already has English
    const hasAnyEnglish = data.segments.some(s => s.en && s.en.trim().length > 10);
    if (hasAnyEnglish) {
      console.log(`  letter-${readerNum}.json already has English, skipping`);
      continue;
    }

    console.log(`  Processing letter-${readerNum} from ${file} (${data.segments.length} segments)`);

    const result = await mammoth.convertToHtml({ path: docPath });
    const html = result.value;

    // Extract English paragraphs from the letter
    const lines = html.split(/<\/p>|<br\s*\/?>/).map(l =>
      l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
    ).filter(l => l.length > 0);

    // Collect only English lines (these letters are translations)
    const englishLines = lines.filter(l => isEnglish(l) && l.length > 3);

    console.log(`    Found ${englishLines.length} English lines for ${data.segments.length} segments`);

    if (englishLines.length === 0) {
      console.log(`    WARNING: No English found in ${file}`);
      continue;
    }

    // If the translation has roughly the same number of paragraphs as segments,
    // map 1:1. Otherwise, try to intelligently distribute.
    if (englishLines.length >= data.segments.length) {
      // More English lines than segments - combine some
      // Simple approach: distribute evenly, combining extras
      const ratio = englishLines.length / data.segments.length;
      let enIdx = 0;
      for (let i = 0; i < data.segments.length; i++) {
        const endIdx = Math.min(Math.round((i + 1) * ratio), englishLines.length);
        const combined = englishLines.slice(enIdx, endIdx).join(' ');
        if (!data.segments[i].en || data.segments[i].en.trim() === '') {
          data.segments[i].en = combined;
        }
        enIdx = endIdx;
      }
    } else {
      // Fewer English lines than segments - assign one-to-one where possible
      let enIdx = 0;
      for (let i = 0; i < data.segments.length && enIdx < englishLines.length; i++) {
        if (!data.segments[i].en || data.segments[i].en.trim() === '') {
          data.segments[i].en = englishLines[enIdx];
          enIdx++;
        }
      }
    }

    data.hasEnglish = true;
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`    Updated letter-${readerNum}.json`);
    stats['ebay-hanachal']++;
  }
}

// ============================================================
// 5. LIKUTAY HALACHOS - Parts 4 and 5
// ============================================================
async function importLikutayHalachos() {
  console.log('\n=== LIKUTAY HALACHOS ===');

  // Part 4 = Yoreh Deah 1
  // Part 5 = Yoreh Deah 2
  const yd1Dir = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos/Likutay Halachos - Yoreh Daya - 1/';
  const yd2Dir = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos/Likutay Halachos - Yoreh Daya - 2/';

  // Part 4 missing: halachos 83-102 (20 halachos)
  // Map halacha titles to source files:
  // 83-85: מעונן ומנחש 1-3 -> 300 meonayn_1_2_3_v2.html
  // 86-88: קרחה וכתובת קעקע 1-3 -> 350 korcha_1_2_3 (1).html
  // 89-95: גילוח 1-5, לא ילבש, קרחה ושריטה, נדה ומקוואות -> 400 giluach 4 with subs...
  // 96-102: More giluach/nida/mikvaos/lo yilbash entries

  const part4Map = [
    { halachas: [83, 84, 85], file: '300 meonayn_1_2_3_v2.html', names: ['מעונן ומנחש א', 'מעונן ומנחש ב', 'מעונן ומנחש ג'] },
    { halachas: [86, 87, 88], file: '350 korcha_1_2_3 (1).html', names: ['קרחה וכתובת קעקע א', 'קרחה וכתובת קעקע ב', 'קרחה וכתובת קעקע ג'] },
    { halachas: [89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102],
      file: '400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html',
      names: ['גילוח א', 'גילוח ב', 'גילוח ג', 'גילוח ד', 'לא ילבש גבר', 'קרחה ושריטה', 'נדה ומקוואות', 'גילוח ה', 'נדה', 'לא ילבש גבר וכו\' א', 'לא ילבש ב', 'לא ילבש ג', 'לא ילבש ב', 'מקוואות א']
    },
  ];

  // Part 5 missing: halachos 96-106 (11 halachos)
  // 96-99: תרומות ומעשרות 1-4 -> 500-530 files
  // 100-105: ראשית הגז 1-5 + אבילות -> 600-650 files
  // 106: נידוי וחרם

  const part5Map = [
    { halachas: [96, 97], file: '500 Terumos_uMaasros_H1_H2.html', names: ['תרומות ומעשרות א', 'תרומות ומעשרות ב'] },
    { halachas: [98], file: '510 Terumos_uMaasros_H3_Part1.html', names: ['תרומות ומעשרות ג'] },
    { halachas: [98], file2: '520 Terumos_uMaasros_H3_Part2.html', append: true },
    { halachas: [99], file: '530 Terumos_uMaasros_H4.html', names: ['תרומות ומעשרות ד'] },
    { halachas: [100, 101], file: '600 Reishis_HaGez_H1_H2 (1).html', names: ['ראשית הגז א', 'ראשית הגז ב'] },
    { halachas: [102], file: '610 Reishis_HaGez_H3.html', names: ['ראשית הגז ג'] },
    // Also sections 11+ of H3:
    { halachas: [102], file2: '620 Reishis_HaGez_H3 section 11 _Bikur_Cholim (1).html', append: true },
    { halachas: [102], file2: '622 Reishis_HaGez_H3_Sections_12_18.html', append: true },
    { halachas: [104], file: '625 Raishis_HaGez_H4_Complete 1-11.html', names: ['ראשית הגז ד'] },
    { halachas: [105], file: '650 Reishis_HaGez_H5 - to the end.html', names: ['ראשית הגז ה'] },
  ];

  // Process Part 4
  console.log('\n  --- Part 4 (Yoreh Deah A) ---');
  await processLHPart(yd1Dir, part4Map, 4);

  // Process Part 5
  console.log('\n  --- Part 5 (Yoreh Deah B) ---');
  await processLHPart(yd2Dir, part5Map, 5);
}

async function processLHPart(sourceDir, mapping, partNum) {
  for (const entry of mapping) {
    if (entry.append) continue; // handled with the main entry

    const filePath = path.join(sourceDir, entry.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  WARNING: File not found: ${entry.file}`);
      continue;
    }

    // Read HTML file
    let html = fs.readFileSync(filePath, 'utf8');

    // Check for append files
    const appendEntries = mapping.filter(m => m.append && m.halachas.some(h => entry.halachas.includes(h)));
    for (const ae of appendEntries) {
      const appendPath = path.join(sourceDir, ae.file2);
      if (fs.existsSync(appendPath)) {
        html += '\n' + fs.readFileSync(appendPath, 'utf8');
      }
    }

    // Extract English paragraphs from the HTML
    const allEnglish = extractEnglishFromHtml(html);

    console.log(`  ${entry.file}: ${allEnglish.length} English paragraphs`);

    if (allEnglish.length === 0) {
      console.log(`    WARNING: No English content found`);
      continue;
    }

    if (entry.halachas.length === 1) {
      // Single halacha - assign all English to it
      const hNum = entry.halachas[0];
      const jsonPath = path.join(READER_DIR, 'likutay-halachos', `part-${partNum}`, `halacha-${hNum}.json`);

      if (!fs.existsSync(jsonPath)) {
        console.log(`    WARNING: JSON not found for halacha ${hNum}`);
        continue;
      }

      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      assignTranslationsToSegments(data, allEnglish);
      data.hasEnglish = true;
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      console.log(`    Updated halacha-${hNum}.json (${data.segments.filter(s => s.en && s.en.length > 0).length}/${data.segments.length} segments)`);
      stats[`likutay-halachos-part${partNum}`]++;
    } else {
      // Multiple halachos in one file - need to split the English
      // Try to find section boundaries in the HTML
      const sections = splitHtmlBySections(html, entry.halachas.length, entry.names || []);

      if (sections.length === entry.halachas.length) {
        for (let i = 0; i < entry.halachas.length; i++) {
          const hNum = entry.halachas[i];
          const jsonPath = path.join(READER_DIR, 'likutay-halachos', `part-${partNum}`, `halacha-${hNum}.json`);

          if (!fs.existsSync(jsonPath)) {
            console.log(`    WARNING: JSON not found for halacha ${hNum}`);
            continue;
          }

          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          const sectionEnglish = extractEnglishFromHtml(sections[i]);

          if (sectionEnglish.length > 0) {
            assignTranslationsToSegments(data, sectionEnglish);
            data.hasEnglish = true;
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
            console.log(`    Updated halacha-${hNum}.json (${data.segments.filter(s => s.en && s.en.length > 0).length}/${data.segments.length} segments)`);
            stats[`likutay-halachos-part${partNum}`]++;
          } else {
            console.log(`    WARNING: No English found for halacha ${hNum}`);
          }
        }
      } else {
        // Couldn't split by sections - try distributing by paragraph count
        console.log(`    Could not split into ${entry.halachas.length} sections (found ${sections.length}), distributing by segment count...`);

        // Calculate total segments needed
        let totalSegs = 0;
        const halachaData = [];
        for (const hNum of entry.halachas) {
          const jsonPath = path.join(READER_DIR, 'likutay-halachos', `part-${partNum}`, `halacha-${hNum}.json`);
          if (fs.existsSync(jsonPath)) {
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            halachaData.push({ hNum, data, segCount: data.segments.length });
            totalSegs += data.segments.length;
          }
        }

        // Distribute English proportionally
        let enIdx = 0;
        for (const { hNum, data, segCount } of halachaData) {
          const share = Math.round((segCount / totalSegs) * allEnglish.length);
          const sectionEnglish = allEnglish.slice(enIdx, enIdx + share);
          enIdx += share;

          if (sectionEnglish.length > 0) {
            assignTranslationsToSegments(data, sectionEnglish);
            data.hasEnglish = true;
            const jsonPath = path.join(READER_DIR, 'likutay-halachos', `part-${partNum}`, `halacha-${hNum}.json`);
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
            console.log(`    Updated halacha-${hNum}.json (${data.segments.filter(s => s.en && s.en.length > 0).length}/${data.segments.length} segments)`);
            stats[`likutay-halachos-part${partNum}`]++;
          }
        }
      }
    }
  }
}

function extractEnglishFromHtml(html) {
  const lines = html.split(/<\/p>|<br\s*\/?>|<\/div>|<\/h[1-6]>/).map(l => {
    return l
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(l => l.length > 3 && isEnglish(l));

  return lines;
}

function splitHtmlBySections(html, expectedCount, names) {
  // Try to split by halacha headers like "Halacha 1", "Hilchos X", section markers
  const sections = [];

  // Common section delimiters in the LH translations
  const patterns = [
    /hilchos?\s+/i,
    /halacha\s+\d/i,
    /laws?\s+of\s+/i,
    /<h[1-6][^>]*>/i,
  ];

  // Try splitting by <h> tags first
  const hParts = html.split(/(<h[1-6][^>]*>)/i);
  if (hParts.length >= expectedCount * 2) {
    // Reconstruct sections from h-tag splits
    let current = '';
    for (let i = 0; i < hParts.length; i++) {
      if (/<h[1-6][^>]*>/i.test(hParts[i]) && current.length > 100) {
        sections.push(current);
        current = '';
      }
      current += hParts[i];
    }
    if (current.length > 0) sections.push(current);

    if (sections.length === expectedCount) return sections;
  }

  // Try splitting by "Halacha" or numbered pattern
  const halachaPattern = /(?:halacha|hilchos|laws\s+of)\s+/gi;
  const parts = html.split(halachaPattern);
  if (parts.length >= expectedCount) {
    return parts.slice(parts.length - expectedCount);
  }

  // Return the whole thing as one section
  return [html];
}

function assignTranslationsToSegments(data, englishLines) {
  // Skip אות א type headers
  let enIdx = 0;
  for (let i = 0; i < data.segments.length && enIdx < englishLines.length; i++) {
    const seg = data.segments[i];
    // Skip if segment already has English
    if (seg.en && seg.en.trim().length > 10) continue;
    // Skip pure header segments (אות א, אות ב, etc.)
    if (/^אות\s+[א-ת]/.test(seg.he) && seg.he.length < 15) continue;

    data.segments[i].en = englishLines[enIdx];
    enIdx++;
  }
}

// ============================================================
// Update index files
// ============================================================
function updateIndexFiles() {
  console.log('\n=== UPDATING INDEX FILES ===');

  // Update Sefer HaMidos index
  updateBookIndex('sefer-hamidos', 'topic');

  // Update Shivchay HaRan index
  updateBookIndex('shivchay-haran', 'section');

  // Update Hashtatfchus HaNefesh index
  updateBookIndex('hashtatfchus-hanefesh', 'section');

  // Update Ebay HaNachal part 1 index
  updateBookIndex('ebay-hanachal/part-1', 'letter');

  // Update LH part 4 and 5 indexes
  updateLHIndex(4);
  updateLHIndex(5);
}

function updateBookIndex(bookDir, prefix) {
  const indexPath = path.join(READER_DIR, bookDir, 'index.json');
  if (!fs.existsSync(indexPath)) return;

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const items = index.torahs || index.sections || index.letters || index.topics || [];
  let updated = 0;

  for (const item of items) {
    const num = item.number || item.torah;
    const jsonFile = path.join(READER_DIR, bookDir, `${prefix}-${num}.json`);
    if (fs.existsSync(jsonFile)) {
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      if (data.hasEnglish && !item.hasEnglish) {
        item.hasEnglish = true;
        updated++;
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`  Updated ${bookDir}/index.json: ${updated} entries marked hasEnglish`);
  }
}

function updateLHIndex(part) {
  const indexPath = path.join(READER_DIR, 'likutay-halachos', `part-${part}`, 'index.json');
  if (!fs.existsSync(indexPath)) return;

  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  let updated = 0;

  for (const item of index.torahs) {
    const jsonFile = path.join(READER_DIR, 'likutay-halachos', `part-${part}`, `halacha-${item.number}.json`);
    if (fs.existsSync(jsonFile)) {
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      if (data.hasEnglish && !item.hasEnglish) {
        item.hasEnglish = true;
        updated++;
      }
    }
  }

  if (updated > 0) {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    console.log(`  Updated likutay-halachos/part-${part}/index.json: ${updated} entries marked hasEnglish`);
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('Starting translation import...');
  console.log('Reader directory:', READER_DIR);

  await importSeferHamidos();
  await importShivchayHaran();
  await importHashtatfchus();
  await importEbayHanachal();
  await importLikutayHalachos();

  updateIndexFiles();

  console.log('\n=== SUMMARY ===');
  console.log('Files updated:');
  for (const [book, count] of Object.entries(stats)) {
    console.log(`  ${book}: ${count} files`);
  }
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
