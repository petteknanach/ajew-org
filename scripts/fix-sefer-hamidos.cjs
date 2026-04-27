/**
 * Fix Sefer HaMidos topics 7 and 70 using the English-only version of the docx
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'sefer-hamidos');

async function main() {
  // Use the English-only version
  const docPath = 'C:/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/Continuous deleted Hebrew just English 2021 version.docx';

  if (!fs.existsSync(docPath)) {
    console.log('English-only version not found, trying 2021 version just ENGLISH...');
    const altPath = 'C:/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/2021 version just ENGLISH.docx';
    if (fs.existsSync(altPath)) {
      return processDoc(altPath);
    }
    console.log('No English-only file found');
    return;
  }

  return processDoc(docPath);
}

async function processDoc(docPath) {
  console.log('Using:', docPath);
  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  const paras = html.split(/<\/p>/).map(p =>
    p.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  ).filter(p => p.length > 0);

  console.log(`Total paragraphs: ${paras.length}`);

  // The English-only version should have topic headers and numbered entries
  // Find "Part Two" or "SECOND PART"
  let part2Start = -1;
  for (let i = 0; i < paras.length; i++) {
    if (/SECOND PART|PART TWO|Part Two/i.test(paras[i]) && paras[i].length < 50) {
      part2Start = i;
      console.log(`Found Part Two at para ${i}: "${paras[i]}"`);
      break;
    }
  }

  if (part2Start === -1) {
    console.log('Part Two not found, searching from start');
    part2Start = 0;
  }

  // Print paragraphs around "Eretz Yisrael" / "Land of Israel" topic
  console.log('\n=== Searching for Eretz Yisrael topic ===');
  for (let i = part2Start; i < paras.length; i++) {
    if (/eretz|land of israel|israel/i.test(paras[i]) && paras[i].length < 100) {
      console.log(`[${i}] "${paras[i].substring(0, 100)}"`);
      // Show next 10 paragraphs
      for (let j = i + 1; j < Math.min(i + 15, paras.length); j++) {
        console.log(`  [${j}] "${paras[j].substring(0, 120)}"`);
      }
      break;
    }
  }

  // Search for "Ner Tamid" or "Eternal" or "Perpetual"
  console.log('\n=== Searching for Ner Tamid topic ===');
  for (let i = part2Start; i < paras.length; i++) {
    if (/ner tamid|eternal|perpetual|constant.*candle|constant.*light/i.test(paras[i]) && paras[i].length < 100) {
      console.log(`[${i}] "${paras[i].substring(0, 100)}"`);
      for (let j = i + 1; j < Math.min(i + 10, paras.length); j++) {
        console.log(`  [${j}] "${paras[j].substring(0, 120)}"`);
      }
      break;
    }
  }

  // Also try finding by number patterns - "1. Through..." after topic headers
  // Let's dump some content around paragraph 200+ to understand the document structure
  console.log('\n=== Document structure sample (around topic area) ===');
  // Find any "Land of Israel" or "ERETZ" text
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (/land of israel|eretz.*yisrael/i.test(p)) {
      console.log(`FOUND at [${i}]: "${p.substring(0, 150)}"`);
    }
  }

  // Find Ner Tamid
  for (let i = 0; i < paras.length; i++) {
    if (/ner tamid|perpetual|constant.*light/i.test(paras[i])) {
      console.log(`NER TAMID at [${i}]: "${paras[i].substring(0, 150)}"`);
    }
  }

  // Find numbered entries like "1." at start
  console.log('\n=== Looking for numbered entries in Part 2 ===');
  let currentTopic = '';
  let topicEntries = {};

  for (let i = part2Start; i < paras.length; i++) {
    const p = paras[i].trim();

    // Check if this is a topic header (short, all-caps or title case, no numbers)
    if (p.length < 60 && p.length > 2 && !/^\d/.test(p) && /^[A-Z]/.test(p)) {
      // Could be a topic header
      if (!/^\d+\./.test(p)) {
        currentTopic = p;
        if (!topicEntries[currentTopic]) {
          topicEntries[currentTopic] = [];
        }
      }
    }

    // Check if this is a numbered entry
    if (/^\d+\.\s/.test(p) && currentTopic) {
      topicEntries[currentTopic].push({ idx: i, text: p });
    }
  }

  // Show topics that match
  console.log('\nAll topics found:');
  for (const [topic, entries] of Object.entries(topicEntries)) {
    if (entries.length > 0) {
      console.log(`  "${topic}" - ${entries.length} entries`);
    }
  }

  // Find the Eretz Yisrael and Ner Tamid topics
  let eiTopic = null;
  let ntTopic = null;
  for (const topic of Object.keys(topicEntries)) {
    if (/land of israel|eretz/i.test(topic)) eiTopic = topic;
    if (/ner tamid|perpetual|eternal|constant/i.test(topic)) ntTopic = topic;
  }

  console.log(`\nEretz Yisrael topic: "${eiTopic}"`);
  console.log(`Ner Tamid topic: "${ntTopic}"`);

  // Now apply the translations
  if (eiTopic && topicEntries[eiTopic].length > 0) {
    const entries = topicEntries[eiTopic];
    const topic7Path = path.join(READER_DIR, 'topic-7.json');
    const data = JSON.parse(fs.readFileSync(topic7Path, 'utf8'));

    // Reset all English
    for (const seg of data.segments) seg.en = '';

    // Skip "חלק שני" header (segment 1), assign entries to segments 2-8
    const startSeg = data.segments[0].he.includes('חלק שני') ? 1 : 0;
    let enIdx = 0;
    for (let i = startSeg; i < data.segments.length && enIdx < entries.length; i++) {
      data.segments[i].en = entries[enIdx].text;
      enIdx++;
    }

    data.hasEnglish = enIdx > 0;
    fs.writeFileSync(topic7Path, JSON.stringify(data, null, 2));
    console.log(`Updated topic-7.json with ${enIdx} entries`);

    // Show what was applied
    for (const seg of data.segments) {
      if (seg.en) console.log(`  seg ${seg.index}: "${seg.en.substring(0, 80)}..."`);
    }
  }

  if (ntTopic && topicEntries[ntTopic].length > 0) {
    const entries = topicEntries[ntTopic];
    const topic70Path = path.join(READER_DIR, 'topic-70.json');
    const data = JSON.parse(fs.readFileSync(topic70Path, 'utf8'));

    // Reset all English
    for (const seg of data.segments) seg.en = '';

    const startSeg = data.segments[0].he.includes('חלק שני') ? 1 : 0;
    let enIdx = 0;
    for (let i = startSeg; i < data.segments.length && enIdx < entries.length; i++) {
      data.segments[i].en = entries[enIdx].text;
      enIdx++;
    }

    data.hasEnglish = enIdx > 0;
    fs.writeFileSync(topic70Path, JSON.stringify(data, null, 2));
    console.log(`Updated topic-70.json with ${enIdx} entries`);
  }

  // If topics weren't found by name, try the Hebrew-English version with better parsing
  if (!eiTopic || !ntTopic) {
    console.log('\nFalling back to Hebrew-English version...');
    await processHebEngVersion();
  }
}

async function processHebEngVersion() {
  const docPath = 'C:/Users/Pettek/Documents/Translations/Sefer Hamidos - Character/Sefer Hamidos updated Continuous Hebrew English 2021 version.docx';
  const result = await mammoth.convertToHtml({ path: docPath });
  const html = result.value;

  const paras = html.split(/<\/p>/).map(p =>
    p.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  ).filter(p => p.length > 0);

  // In the Hebrew-English version, entries are in combined paragraphs
  // Format: "Hebrew text.N. English translation."
  // Where N is the entry number

  // Let's find entries that contain both Hebrew and English
  // For topic 7 (ארץ-ישראל), the entries contain ארץ-ישראל in Hebrew part

  console.log('\n=== Hebrew-English parsing ===');

  // Find the Part 2 ארץ-ישראל section
  let inEI = false;
  let eiEntries = [];
  let ntEntries = [];
  let inNT = false;

  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];

    // Check if this paragraph contains a numbered English translation
    // Pattern: ends with English text that starts with a number
    const numMatch = p.match(/(\d+)\.\s+([A-Z][^\.]*(?:\.[^\.]*)*)/);
    if (numMatch && numMatch[2].length > 20) {
      const entryNum = parseInt(numMatch[1]);
      const englishText = numMatch[1] + '. ' + numMatch[2];

      // Check if this is in the ארץ-ישראל section
      if (p.includes('ארץ-ישראל') || p.includes('ארץ־ישראל') || inEI) {
        if (p.includes('ארץ-ישראל') || p.includes('ארץ־ישראל')) inEI = true;
        eiEntries.push({ num: entryNum, en: englishText, para: i });
      }

      // Check for נר תמיד
      if (p.includes('נר תמיד') || p.includes('נֵר תָּמִיד') || inNT) {
        if (p.includes('נר תמיד') || p.includes('נֵר תָּמִיד')) {
          inNT = true;
          inEI = false; // new topic
        }
        ntEntries.push({ num: entryNum, en: englishText, para: i });
      }
    }

    // Detect topic boundaries - a short Hebrew-only line
    if (!/[a-zA-Z]/.test(p) && p.length < 40 && p.length > 1) {
      if (inEI && !p.includes('ארץ') && eiEntries.length > 0) {
        inEI = false; // Left the ארץ-ישראל section
      }
      if (inNT && !p.includes('נר') && ntEntries.length > 0) {
        inNT = false;
      }
    }
  }

  console.log(`Found ${eiEntries.length} Eretz Yisrael entries`);
  for (const e of eiEntries) {
    console.log(`  #${e.num}: "${e.en.substring(0, 80)}..."`);
  }

  console.log(`Found ${ntEntries.length} Ner Tamid entries`);
  for (const e of ntEntries) {
    console.log(`  #${e.num}: "${e.en.substring(0, 80)}..."`);
  }

  // Apply to JSON
  if (eiEntries.length > 0) {
    const topic7Path = path.join(READER_DIR, 'topic-7.json');
    const data = JSON.parse(fs.readFileSync(topic7Path, 'utf8'));

    // Only update segments that don't have English yet
    const startSeg = data.segments[0].he.includes('חלק שני') ? 1 : 0;
    let updated = 0;
    for (let i = startSeg; i < data.segments.length && updated < eiEntries.length; i++) {
      if (!data.segments[i].en || data.segments[i].en.length < 10) {
        data.segments[i].en = eiEntries[updated].en;
        updated++;
      }
    }

    data.hasEnglish = updated > 0;
    fs.writeFileSync(topic7Path, JSON.stringify(data, null, 2));
    console.log(`Updated topic-7.json with ${updated} entries from HebEng version`);
  }

  if (ntEntries.length > 0) {
    const topic70Path = path.join(READER_DIR, 'topic-70.json');
    const data = JSON.parse(fs.readFileSync(topic70Path, 'utf8'));

    const startSeg = data.segments[0].he.includes('חלק שני') ? 1 : 0;
    let updated = 0;
    for (let i = startSeg; i < data.segments.length && updated < ntEntries.length; i++) {
      if (!data.segments[i].en || data.segments[i].en.length < 10) {
        data.segments[i].en = ntEntries[updated].en;
        updated++;
      }
    }

    data.hasEnglish = updated > 0;
    fs.writeFileSync(topic70Path, JSON.stringify(data, null, 2));
    console.log(`Updated topic-70.json with ${updated} entries from HebEng version`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
