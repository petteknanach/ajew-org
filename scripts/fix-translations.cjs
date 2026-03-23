/**
 * Fix and redo translation imports that went wrong in the first pass
 * 1. Sefer HaMidos topics 7, 70 - reset and redo
 * 2. Hashtatfchus HaNefesh section 5 - redo
 * 3. Ebay HaNachal letters - verify and fix mappings
 * 4. LH halachos - better section splitting
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');

function isEnglish(text) {
  const en = (text.match(/[a-zA-Z]/g) || []).length;
  const he = (text.match(/[\u0590-\u05FF]/g) || []).length;
  return en > he;
}

function isHebrew(text) {
  const he = (text.match(/[\u0590-\u05FF]/g) || []).length;
  return he > 5;
}

function stripHtml(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==================================================================
// 1. SEFER HAMIDOS - Full redo for topics 7 and 70
// ==================================================================
async function fixSeferHamidos() {
  console.log('\n=== FIXING SEFER HAMIDOS ===');
  const docPath = 'C:/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/Sefer Hamidos updated Continuous Hebrew English 2021 version.docx';

  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  // Split into paragraphs
  const rawParagraphs = html.split(/<\/p>/).map(p => stripHtml(p)).filter(p => p.length > 0);

  console.log(`  Total paragraphs in docx: ${rawParagraphs.length}`);

  // The Sefer HaMidos is organized by topic. Each topic has a Hebrew name,
  // then numbered entries alternating Hebrew and English.
  // Format: Hebrew entry (starts with Hebrew letter like א.), then English translation

  // Strategy: Find the "Part Two" / "חלק שני" marker, then find each topic
  // Topic 7 = ארץ-ישראל (Eretz Yisrael / Land of Israel)
  // Topic 70 = נר תמיד (Ner Tamid / Perpetual Light / Eternal Lamp)

  // First, find Part Two
  let part2Start = -1;
  for (let i = 0; i < rawParagraphs.length; i++) {
    if (/SECOND PART|PART TWO|Part Two|חלק שני/i.test(rawParagraphs[i]) && rawParagraphs[i].length < 80) {
      part2Start = i;
      console.log(`  Found Part Two at paragraph ${i}: "${rawParagraphs[i]}"`);
      break;
    }
  }

  if (part2Start === -1) {
    console.log('  WARNING: Could not find Part Two marker');
    // Try from the beginning
    part2Start = 0;
  }

  // Now find topic headers. In the continuous Hebrew-English version,
  // the format alternates: Hebrew numbered entry, then English translation.
  // Topic headers are single-word/short Hebrew topic names.

  // For topic 7 (ארץ-ישראל), search for entries numbered 1-7 under this topic
  // The reader JSON has 7 content segments (entries א through ז)

  // Let's find topics by looking for the Hebrew topic names
  const topic7Json = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-7.json'), 'utf8'));
  const topic70Json = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-70.json'), 'utf8'));

  // Reset English translations
  for (const seg of topic7Json.segments) {
    seg.en = '';
  }
  for (const seg of topic70Json.segments) {
    seg.en = '';
  }

  // Topic 7 has entries in Part 2, title ארץ-ישראל
  // The Hebrew entries have specific text we can match

  // For each Hebrew segment, find its Hebrew text in the document, then grab the English after it
  function findEnglishForSegments(data) {
    const startSeg = data.segments[0].he.includes('חלק שני') ? 1 : 0;
    let matched = 0;

    for (let s = startSeg; s < data.segments.length; s++) {
      const seg = data.segments[s];
      // Get a distinctive Hebrew phrase from this segment (skip the number prefix)
      const heText = seg.he.replace(/\r\n/g, ' ').replace(/\s+/g, ' ');
      // Extract first 20-40 chars after the letter number
      const contentStart = heText.replace(/^[א-ת][\.'"]?\s*/, '');
      const snippet = contentStart.substring(0, 35).trim();

      if (snippet.length < 5) continue;

      // Search in the document
      for (let i = part2Start; i < rawParagraphs.length; i++) {
        const para = rawParagraphs[i].replace(/\s+/g, ' ');
        if (para.includes(snippet)) {
          // Found the Hebrew! Now look for English translation after it
          for (let j = i + 1; j < Math.min(i + 5, rawParagraphs.length); j++) {
            if (isEnglish(rawParagraphs[j]) && rawParagraphs[j].length > 15) {
              // Check it's not another topic header or number
              if (!/^\d+\.\s*$/.test(rawParagraphs[j])) {
                seg.en = rawParagraphs[j];
                matched++;
                break;
              }
            }
          }
          break;
        }
      }
    }
    return matched;
  }

  const matched7 = findEnglishForSegments(topic7Json);
  console.log(`  Topic 7 (${topic7Json.title}): matched ${matched7} English translations`);

  const matched70 = findEnglishForSegments(topic70Json);
  console.log(`  Topic 70 (${topic70Json.title}): matched ${matched70} English translations`);

  // Update files
  topic7Json.hasEnglish = matched7 > 0;
  topic70Json.hasEnglish = matched70 > 0;
  fs.writeFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-7.json'), JSON.stringify(topic7Json, null, 2));
  fs.writeFileSync(path.join(READER_DIR, 'sefer-hamidos', 'topic-70.json'), JSON.stringify(topic70Json, null, 2));

  // Debug: show what we found
  for (const seg of topic7Json.segments) {
    if (seg.en) console.log(`    seg ${seg.index}: "${seg.en.substring(0, 60)}..."`);
    else console.log(`    seg ${seg.index}: (no English found)`);
  }
  console.log('  ---');
  for (const seg of topic70Json.segments) {
    if (seg.en) console.log(`    seg ${seg.index}: "${seg.en.substring(0, 60)}..."`);
    else console.log(`    seg ${seg.index}: (no English found)`);
  }
}

// ==================================================================
// 2. HASHTATFCHUS HANEFESH - Section 5
// ==================================================================
async function fixHashtatfchus() {
  console.log('\n=== FIXING HASHTATFCHUS HANEFESH ===');
  const docPath = 'C:/Users/Pettek/Documents/Translations/Hisbodidus Alone Time/Hisbodidus Alone Time.docx';

  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  const jsonPath = path.join(READER_DIR, 'hashtatfchus-hanefesh', 'section-5.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Section 5 title is אות-ג (Ois Gimel = Letter 3)
  // It has 1 segment with Talmudic text about teshuvah
  // The Hebrew starts with: אמר רבי יצחק אמרי במערבא

  const rawParagraphs = html.split(/<\/p>/).map(p => stripHtml(p)).filter(p => p.length > 0);
  console.log(`  Total paragraphs in docx: ${rawParagraphs.length}`);

  // Look for the Ois Gimel section
  // The section is about R' Yitzchak's statement about teshuvah - "take words and return to Hashem"
  // English keywords: "Rabbi Yitzchak", "take with you words", "return to Hashem"

  // First let's find section markers (ois aleph, ois beis, ois gimel)
  // Or search for the talmudic content

  let found = false;

  // Search for the text about God being appeased with words (the Gemara passage)
  for (let i = 0; i < rawParagraphs.length; i++) {
    const p = rawParagraphs[i];
    // Look for the English translation of this passage
    if (/rabbi yitzchak/i.test(p) && /appeas|forgiv|words.*return|return.*words/i.test(p)) {
      console.log(`  Found translation at paragraph ${i}: "${p.substring(0, 80)}..."`);
      // Collect all English paragraphs that belong to this section
      const englishParts = [p];
      for (let j = i + 1; j < Math.min(i + 10, rawParagraphs.length); j++) {
        if (isEnglish(rawParagraphs[j]) && rawParagraphs[j].length > 15) {
          // Check if this looks like a new section header
          if (/^(section|ois|letter|chapter)\s+/i.test(rawParagraphs[j])) break;
          if (/^[א-ת][\.'"]?\s*$/.test(rawParagraphs[j])) break;
          englishParts.push(rawParagraphs[j]);
        } else if (isHebrew(rawParagraphs[j]) && rawParagraphs[j].length > 30) {
          break; // New Hebrew section
        }
      }
      data.segments[0].en = englishParts.join('\n\n');
      data.hasEnglish = true;
      found = true;
      console.log(`  Updated with ${englishParts.length} English paragraphs (${data.segments[0].en.length} chars)`);
      break;
    }
  }

  if (!found) {
    // Try broader search
    for (let i = 0; i < rawParagraphs.length; i++) {
      const p = rawParagraphs[i];
      if (/take.*words.*return|flesh.*blood.*differ|measure.*holy.*one/i.test(p) && isEnglish(p)) {
        console.log(`  Found broader match at paragraph ${i}: "${p.substring(0, 80)}..."`);
        data.segments[0].en = p;
        data.hasEnglish = true;
        found = true;
        break;
      }
    }
  }

  if (!found) {
    // Let's try to find it by position - look for Ois Gimel / section 3 / ג
    for (let i = 0; i < rawParagraphs.length; i++) {
      if (/ois gimel|section\s*3|letter\s*3/i.test(rawParagraphs[i]) ||
          (rawParagraphs[i] === 'ג' || rawParagraphs[i] === 'ג.')) {
        console.log(`  Found section marker at paragraph ${i}: "${rawParagraphs[i]}"`);
        // Collect English after this
        const englishParts = [];
        for (let j = i + 1; j < Math.min(i + 15, rawParagraphs.length); j++) {
          if (isEnglish(rawParagraphs[j]) && rawParagraphs[j].length > 15) {
            englishParts.push(rawParagraphs[j]);
          }
          if (englishParts.length >= 3) break;
        }
        if (englishParts.length > 0) {
          data.segments[0].en = englishParts.join('\n\n');
          data.hasEnglish = true;
          found = true;
          console.log(`  Updated with ${englishParts.length} paragraphs`);
          break;
        }
      }
    }
  }

  if (!found) {
    console.log('  WARNING: Could not find proper translation');
    // Dump some English paragraphs for debugging
    console.log('  Sample English paragraphs from document:');
    let count = 0;
    for (let i = 0; i < rawParagraphs.length && count < 30; i++) {
      if (isEnglish(rawParagraphs[i]) && rawParagraphs[i].length > 30) {
        console.log(`    [${i}] ${rawParagraphs[i].substring(0, 100)}`);
        count++;
      }
    }
    // Reset to empty since what we had was wrong
    data.segments[0].en = '';
    data.hasEnglish = false;
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

// ==================================================================
// 3. EBAY HANACHAL - Fix letter mappings
// ==================================================================
async function fixEbayHanachal() {
  console.log('\n=== FIXING EBAY HANACHAL ===');
  const sourceDir = 'C:/Users/Pettek/Documents/Translations/Blossoms of the Spring/';

  // The issue: the docx files have their own letter numbers that may not match reader numbers
  // Reader letter-31 title is "ל." (30 in Hebrew), so it's letter 30 in the book
  // But the source file "Letter 31 - final fixed.docx" is Letter 31 in the translation series

  // Let's check the date and content of each reader letter to match source letters

  const letterFiles = [
    { file: 'Letter 31 - final fixed.docx' },
    { file: 'Letter 32.docx' },
    { file: 'Letter 33 old 35 new - improved.docx' },
    { file: 'Letter 34 old 38 new - improved.docx' },
    { file: 'Letter 35 old 39 new.docx' },
    { file: 'Letter 36 - new 40.docx' },
    { file: 'Letter 37.docx' },
  ];

  // First, read each source file's content to understand what letter it is
  const sourceLetters = [];
  for (const { file } of letterFiles) {
    const docPath = path.join(sourceDir, file);
    if (!fs.existsSync(docPath)) continue;

    const result = await mammoth.convertToHtml({ path: docPath });
    const html = result.value;
    const paras = html.split(/<\/p>/).map(p => stripHtml(p)).filter(p => p.length > 0);

    // Get first few English paragraphs
    const englishParas = paras.filter(p => isEnglish(p) && p.length > 3);
    const preview = englishParas.slice(0, 3).map(p => p.substring(0, 80));

    sourceLetters.push({
      file,
      firstLine: paras[0] || '',
      englishParas,
      preview
    });

    console.log(`  ${file}:`);
    console.log(`    First line: "${paras[0]?.substring(0, 80)}"`);
    console.log(`    English paras: ${englishParas.length}`);
    console.log(`    Preview: "${preview[0]?.substring(0, 80)}"`);
  }

  // Now read each reader JSON to check the Hebrew content and find proper matches
  for (let readerNum = 31; readerNum <= 37; readerNum++) {
    const jsonPath = path.join(READER_DIR, 'ebay-hanachal', 'part-1', `letter-${readerNum}.json`);
    if (!fs.existsSync(jsonPath)) continue;
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`\n  Reader letter-${readerNum} (${data.title}):`);
    console.log(`    First Hebrew: "${data.segments[0]?.he.substring(0, 60)}"`);
    console.log(`    Segments: ${data.segments.length}`);

    // The title is the Hebrew letter number (like ל. = 30)
    // Extract the Hebrew number to understand which letter this is
    const heTitle = data.title;

    // Check if any source letter matches this content by date or opening
    // The first segment usually has a date like "ב"ה, ערב חנכה תש"כ"

    // For now, check if the existing English looks correct
    const hasGoodEnglish = data.segments.some(s => s.en && s.en.length > 20 && isEnglish(s.en));
    if (hasGoodEnglish) {
      console.log(`    Has English translations (checking quality...)`);
      // Check first non-empty English segment
      const firstEn = data.segments.find(s => s.en && s.en.length > 20);
      if (firstEn) {
        console.log(`    First English: "${firstEn.en.substring(0, 80)}..."`);
      }
    }
  }

  // Let me now match source letters to reader letters properly
  // The key issue is that "Letter 31" in the translation series corresponds to
  // a specific letter in the original Hebrew text.

  // Reader letter numbers are based on the original Ebay HaNachal ordering
  // The source file names have their own numbering (some say "old X new Y")

  // Let's match by checking Hebrew dates/openings against the source content
  // Each source file likely has the Hebrew text too, or at least a clear identifier

  // For correct matching, we need to align by content.
  // The safest approach: for each reader letter, search through all source files
  // for one whose English opening matches the Hebrew opening theme.

  // Since this is complex, let me just assign the source files in order to reader letters
  // letter-31 through letter-37, checking each one

  const sourceFileOrder = [
    'Letter 31 - final fixed.docx',
    'Letter 32.docx',
    'Letter 33 old 35 new - improved.docx',
    'Letter 34 old 38 new - improved.docx',
    'Letter 35 old 39 new.docx',
    'Letter 36 - new 40.docx',
    'Letter 37.docx',
  ];

  for (let i = 0; i < sourceFileOrder.length; i++) {
    const readerNum = 31 + i;
    const jsonPath = path.join(READER_DIR, 'ebay-hanachal', 'part-1', `letter-${readerNum}.json`);
    if (!fs.existsSync(jsonPath)) continue;

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const sourceFile = sourceFileOrder[i];
    const docPath = path.join(sourceDir, sourceFile);
    if (!fs.existsSync(docPath)) continue;

    const result = await mammoth.convertToHtml({ path: docPath });
    const html = result.value;
    const paras = html.split(/<\/p>/).map(p => stripHtml(p)).filter(p => p.length > 0);
    const englishParas = paras.filter(p => isEnglish(p) && p.length > 5);

    // Skip title/header lines
    const contentParas = englishParas.filter(p => {
      // Skip short headers like "Letter 31" or just a number
      if (p.length < 15) return false;
      if (/^letter\s+\d+$/i.test(p)) return false;
      if (/^blossoms/i.test(p)) return false;
      return true;
    });

    console.log(`\n  Reassigning letter-${readerNum} from ${sourceFile}: ${contentParas.length} content paragraphs for ${data.segments.length} segments`);

    // Reset all English
    for (const seg of data.segments) {
      seg.en = '';
    }

    // Assign English paragraphs to segments
    if (contentParas.length >= data.segments.length) {
      // More English than segments - combine extras into segments
      const ratio = contentParas.length / data.segments.length;
      for (let s = 0; s < data.segments.length; s++) {
        const startIdx = Math.round(s * ratio);
        const endIdx = Math.round((s + 1) * ratio);
        data.segments[s].en = contentParas.slice(startIdx, endIdx).join('\n\n');
      }
    } else {
      // Fewer English - assign one-to-one
      for (let s = 0; s < Math.min(data.segments.length, contentParas.length); s++) {
        data.segments[s].en = contentParas[s];
      }
    }

    data.hasEnglish = contentParas.length > 0;
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    console.log(`    Updated: ${data.segments.filter(s => s.en.length > 0).length}/${data.segments.length} segments with English`);
  }
}

// ==================================================================
// 4. LH Part 4 - Better halacha splitting for the big giluach file
// ==================================================================
async function fixLHPart4() {
  console.log('\n=== FIXING LH PART 4 ===');
  const srcDir = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos/Likutay Halachos - Yoreh Daya - 1';

  // Fix the meonayn file - better section splitting
  const meonaynPath = path.join(srcDir, '300 meonayn_1_2_3_v2.html');
  if (fs.existsSync(meonaynPath)) {
    const html = fs.readFileSync(meonaynPath, 'utf8');
    // This file has Halacha 1, 2, 3 with clear markers
    const sections = splitHtmlByHalachaHeaders(html);
    console.log(`  meonayn file: ${Object.keys(sections).length} sections found`);

    const mapping = { 1: 83, 2: 84, 3: 85 };
    for (const [fileH, readerH] of Object.entries(mapping)) {
      if (sections[parseInt(fileH)]) {
        await updateLHHalacha(readerH, 4, sections[parseInt(fileH)]);
      }
    }
  }

  // Fix korcha file
  const korchaPath = path.join(srcDir, '350 korcha_1_2_3 (1).html');
  if (fs.existsSync(korchaPath)) {
    const html = fs.readFileSync(korchaPath, 'utf8');
    const sections = splitHtmlByHalachaHeaders(html);
    console.log(`  korcha file: ${Object.keys(sections).length} sections found`);

    const mapping = { 1: 86, 2: 87, 3: 88 };
    for (const [fileH, readerH] of Object.entries(mapping)) {
      if (sections[parseInt(fileH)]) {
        await updateLHHalacha(readerH, 4, sections[parseInt(fileH)]);
      } else {
        console.log(`  WARNING: Section ${fileH} not found for halacha ${readerH}`);
      }
    }
  }

  // Fix the big giluach file - this is the most complex one
  const giluachPath = path.join(srcDir, '400 giluach 4 with subs lo yilbash 1-3 nida 1-2 mikvaos _complete_translation (1).html');
  if (fs.existsSync(giluachPath)) {
    const html = fs.readFileSync(giluachPath, 'utf8');

    // This file has a complex structure with many sub-halachos
    // Let's try to split by any kind of halacha/hilchos headers
    const sections = splitHtmlByAnyHeaders(html);
    console.log(`  giluach file: found ${sections.length} sections`);

    // The reader halachos 89-102 map to:
    // גילוח א-ה (5), לא ילבש (4), קרחה ושריטה (1), נדה ומקוואות (1), נדה (1), מקוואות (1)
    // Total: 14 halachos (89 through 102)

    // Read all missing halachos and get their segment counts
    const halachaInfos = [];
    for (let h = 89; h <= 102; h++) {
      const jsonPath = path.join(READER_DIR, 'likutay-halachos', 'part-4', `halacha-${h}.json`);
      if (!fs.existsSync(jsonPath)) continue;
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const contentSegs = data.segments.filter(s => !/^אות\s+[א-ת]$/.test(s.he.trim()));
      halachaInfos.push({ h, data, contentCount: contentSegs.length, title: data.title });
    }

    // Extract all English from the file
    const allEnglish = extractEnglishParagraphs(html);
    console.log(`  Total English paragraphs: ${allEnglish.length}`);
    console.log(`  Total content segments: ${halachaInfos.reduce((a, b) => a + b.contentCount, 0)}`);

    // Distribute proportionally
    const totalContentSegs = halachaInfos.reduce((a, b) => a + b.contentCount, 0);
    let enIdx = 0;

    for (const info of halachaInfos) {
      // Reset English
      for (const seg of info.data.segments) {
        seg.en = '';
      }

      const share = Math.max(1, Math.round((info.contentCount / totalContentSegs) * allEnglish.length));
      const sectionEnglish = allEnglish.slice(enIdx, enIdx + share);
      enIdx += share;

      // Assign to content segments
      let segEnIdx = 0;
      for (const seg of info.data.segments) {
        if (/^אות\s+[א-ת]$/.test(seg.he.trim())) continue;
        if (segEnIdx < sectionEnglish.length) {
          seg.en = sectionEnglish[segEnIdx];
          segEnIdx++;
        }
      }

      info.data.hasEnglish = sectionEnglish.length > 0;
      const jsonPath = path.join(READER_DIR, 'likutay-halachos', 'part-4', `halacha-${info.h}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(info.data, null, 2));
      console.log(`    halacha-${info.h} (${info.title}): ${info.data.segments.filter(s => s.en && s.en.length > 0).length}/${info.data.segments.length} segments`);
    }
  }
}

function splitHtmlByHalachaHeaders(html) {
  const sections = {};
  // Look for Halacha N headers
  const regex = /(?:<!--[^>]*HALACHA\s+(\d+)[^>]*-->|<div[^>]*class="halacha-title"[^>]*>Halacha\s+(\d+)<\/div>)/gi;
  let match;
  const splits = [];

  while ((match = regex.exec(html)) !== null) {
    const num = parseInt(match[1] || match[2]);
    splits.push({ num, idx: match.index });
  }

  for (let i = 0; i < splits.length; i++) {
    const start = splits[i].idx;
    const end = i + 1 < splits.length ? splits[i + 1].idx : html.length;
    sections[splits[i].num] = html.substring(start, end);
  }

  return sections;
}

function splitHtmlByAnyHeaders(html) {
  // Split by any header-like patterns
  const regex = /(?:<div[^>]*class="halacha-title"[^>]*>|<h[1-6][^>]*>|<!-- *=+ *)/gi;
  const splits = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    splits.push(match.index);
  }
  if (splits.length === 0) return [html];

  const sections = [];
  for (let i = 0; i < splits.length; i++) {
    const end = i + 1 < splits.length ? splits[i + 1] : html.length;
    sections.push(html.substring(splits[i], end));
  }
  return sections;
}

function extractEnglishParagraphs(html) {
  return html.split(/<\/p>|<\/div>|<\/h[1-6]>/).map(p => stripHtml(p))
    .filter(p => p.length > 10 && isEnglish(p));
}

async function updateLHHalacha(hNum, part, sectionHtml) {
  const jsonPath = path.join(READER_DIR, 'likutay-halachos', `part-${part}`, `halacha-${hNum}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.log(`  WARNING: halacha-${hNum}.json not found`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Split the section HTML by § markers to get per-ois content
  const sectionRegex = /<div class="sec-header">.*?<\/div>/gi;
  let match;
  const splits = [0];
  while ((match = sectionRegex.exec(sectionHtml)) !== null) {
    splits.push(match.index);
  }

  // Get English for each section (intro + each §)
  const sectionEnglish = [];
  for (let i = 0; i < splits.length; i++) {
    const start = splits[i];
    const end = i + 1 < splits.length ? splits[i + 1] : sectionHtml.length;
    const part = sectionHtml.substring(start, end);
    const engParas = extractEnglishParagraphs(part);
    if (engParas.length > 0) {
      sectionEnglish.push(engParas.join('\n\n'));
    }
  }

  console.log(`  halacha-${hNum} (${data.title}): ${sectionEnglish.length} sections for ${data.segments.length} segments`);

  // Reset English
  for (const seg of data.segments) {
    seg.en = '';
  }

  // Assign: intro section goes to first content segment,
  // then each § goes to subsequent content segments
  let enIdx = 0;
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i];
    if (/^אות\s+[א-ת]$/.test(seg.he.trim())) continue;

    if (enIdx < sectionEnglish.length) {
      seg.en = sectionEnglish[enIdx];
      enIdx++;
    }
  }

  data.hasEnglish = sectionEnglish.length > 0;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
}

// ==================================================================
// 5. LH Part 5 - Check for missing halachos 103 and 106
// ==================================================================
async function fixLHPart5() {
  console.log('\n=== FIXING LH PART 5 ===');
  const srcDir = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos/Likutay Halachos - Yoreh Daya - 2';

  // Halacha 103 = אבילות (Mourning) - not covered by any file in the first pass
  // Halacha 106 = נידוי וחרם (Excommunication) - also not covered

  // Let's check if there are files for these
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
  console.log(`  All HTML files in YD2: ${files.length}`);

  // Check for aveilut (103) and nidui (106)
  const aveilutFile = files.find(f => /aveil|mourn|aveil/i.test(f));
  const niduiFile = files.find(f => /nidui|niduy|cherem|excomm/i.test(f));

  console.log(`  Aveilut file: ${aveilutFile || 'NOT FOUND'}`);
  console.log(`  Nidui file: ${niduiFile || 'NOT FOUND'}`);

  // Check for Pidyon Peter Chamor halacha 3 (520)
  // Let's also look for files we might have missed
  for (const file of files) {
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const english = extractEnglishParagraphs(content);
    if (english.length > 0) {
      console.log(`  ${file}: ${english.length} English paragraphs`);
    }
  }
}

// ==================================================================
// 6. Update all index files
// ==================================================================
function updateAllIndexFiles() {
  console.log('\n=== UPDATING INDEX FILES ===');

  const books = [
    { dir: 'sefer-hamidos', prefix: 'topic' },
    { dir: 'shivchay-haran', prefix: 'section' },
    { dir: 'hashtatfchus-hanefesh', prefix: 'section' },
    { dir: 'ebay-hanachal/part-1', prefix: 'letter' },
  ];

  for (const { dir, prefix } of books) {
    const indexPath = path.join(READER_DIR, dir, 'index.json');
    if (!fs.existsSync(indexPath)) continue;
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    const items = index.torahs || index.sections || index.letters || index.topics || [];
    let updated = 0;

    for (const item of items) {
      const num = item.number || item.torah;
      const jsonPath = path.join(READER_DIR, dir, `${prefix}-${num}.json`);
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data.hasEnglish !== item.hasEnglish) {
          item.hasEnglish = data.hasEnglish;
          updated++;
        }
      }
    }

    if (updated > 0) {
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
      console.log(`  ${dir}/index.json: ${updated} entries updated`);
    }
  }

  // LH indexes
  for (const part of [4, 5]) {
    const indexPath = path.join(READER_DIR, 'likutay-halachos', `part-${part}`, 'index.json');
    if (!fs.existsSync(indexPath)) continue;
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    let updated = 0;

    for (const item of index.torahs) {
      const jsonPath = path.join(READER_DIR, 'likutay-halachos', `part-${part}`, `halacha-${item.number}.json`);
      if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        if (data.hasEnglish !== item.hasEnglish) {
          item.hasEnglish = data.hasEnglish;
          updated++;
        }
      }
    }

    if (updated > 0) {
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
      console.log(`  likutay-halachos/part-${part}/index.json: ${updated} entries updated`);
    }
  }
}

// ==================================================================
// MAIN
// ==================================================================
async function main() {
  console.log('Starting translation fix...\n');

  await fixSeferHamidos();
  await fixHashtatfchus();
  await fixEbayHanachal();
  await fixLHPart4();
  await fixLHPart5();
  updateAllIndexFiles();

  console.log('\nFix complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
