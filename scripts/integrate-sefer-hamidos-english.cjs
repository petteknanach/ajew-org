const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'sefer-hamidos');
const DOCX_PATH = 'C:/Users/nanach/Documents/Translations/Sefer Hamidos - Character/Sefer Hamidos updated Continuous Hebrew English 2021 version.docx';

function stripNikud(str) {
  return str.replace(/[\u0591-\u05C7]/g, '').replace(/[-\s"]/g, '');
}

function removeMatresLectionis(str) {
  // Remove mater lectionis (ו and י that serve as vowel placeholders)
  // This normalizes "סגולה" and "סגלה" to the same consonant skeleton
  return str.replace(/[וי]/g, '');
}

function fuzzyMatchTitle(docxTitle, jsonTitle) {
  const a = stripNikud(docxTitle);
  const b = stripNikud(jsonTitle);
  if (a === b) return true;
  // Try matching without mater lectionis (vav/yod differences from nikud)
  const aNorm = removeMatresLectionis(a);
  const bNorm = removeMatresLectionis(b);
  if (aNorm === bNorm && aNorm.length >= 3) return true;
  // Check if one starts with the other (for slight variations from nikud stripping)
  if (a.length >= 3 && b.length >= 3) {
    if (a.substring(0, 2) === b.substring(0, 2) && Math.abs(a.length - b.length) <= 1) {
      let matches = 0;
      let j = 0;
      for (let i = 0; i < a.length && j < b.length; i++) {
        if (a[i] === b[j]) { matches++; j++; }
        else j++;
      }
      if (matches >= Math.min(a.length, b.length) - 1) return true;
    }
  }
  return false;
}

async function main() {
  console.log('Reading DOCX...');
  const result = await mammoth.extractRawText({ path: DOCX_PATH });
  const lines = result.value.split('\n').filter(l => l.trim()).map(l => l.trim());

  console.log('Total non-empty lines:', lines.length);

  // Load JSON index to get topic list
  const indexJson = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'index.json'), 'utf8'));

  // Build topic title -> topic number mapping (strip nikud for comparison)
  const topicsByTitle = {};
  for (const t of indexJson.torahs) {
    const key = stripNikud(t.title);
    if (!topicsByTitle[key]) topicsByTitle[key] = [];
    topicsByTitle[key].push(t.number);
  }

  // Parse the DOCX: find topic sections
  // Each topic has: Hebrew title line, ALL CAPS English line, then numbered entries
  // Some topics have "חלק שני / SECOND PART" in the middle

  const docxTopics = []; // {heTitle, enTitle, lineIdx, entries: [{num, en}], secondPart: [{num, en}]}

  let currentTopic = null;
  let inSecondPart = false;
  const numRegex = /^(\d{1,3})\.\s*/;
  // Match English topic headers - ALL CAPS, possibly with parenthetical notes in mixed case
  function isEnglishHeader(line) {
    if (line.length < 3 || line.length > 80) return false;
    // Must start with uppercase
    if (!/^[A-Z]/.test(line)) return false;
    // Remove parenthetical content for checking
    const withoutParens = line.replace(/\([^)]*\)/g, '').trim();
    // Remaining should be mostly uppercase
    if (/^[A-Z][A-Z\s\-\/&':]+$/.test(withoutParens)) return true;
    return false;
  }
  const allCapsRegex = null; // replaced by isEnglishHeader function

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is an ALL CAPS English title
    if (isEnglishHeader(line)) {
      if (line === 'SECOND PART' || line === 'SECOND PART :' || line.startsWith('SECOND PART')) {
        inSecondPart = true;
        continue;
      }

      // Previous line should be Hebrew title
      const heTitle = i > 0 ? lines[i - 1] : '';

      // Save previous topic
      if (currentTopic) {
        docxTopics.push(currentTopic);
      }

      currentTopic = {
        heTitle: heTitle,
        heTitleStripped: stripNikud(heTitle),
        enTitle: line,
        lineIdx: i,
        entries: [],      // Part 1 entries
        secondPart: [],    // Part 2 entries
      };
      inSecondPart = false;
      continue;
    }

    // Check if numbered entry
    const numMatch = line.match(numRegex);
    if (numMatch && currentTopic) {
      const num = parseInt(numMatch[1]);
      const text = line.substring(numMatch[0].length).trim();

      // Only add if it's English text (not Hebrew)
      if (/^[A-Za-z"'\(\[\["]/.test(text) || text.startsWith('[')) {
        if (inSecondPart) {
          currentTopic.secondPart.push({ num, en: text });
        } else {
          currentTopic.entries.push({ num, en: text });
        }
      }
    }
  }
  // Save last topic
  if (currentTopic) {
    docxTopics.push(currentTopic);
  }

  console.log(`Found ${docxTopics.length} topics in DOCX`);

  // Now match DOCX topics to JSON topics and update
  let totalUpdated = 0;
  let topicsMatched = 0;

  for (const docxTopic of docxTopics) {
    // Try to find matching JSON topic
    const key = docxTopic.heTitleStripped;
    let jsonNums = topicsByTitle[key];

    if (!jsonNums) {
      // Try fuzzy match against all JSON topics
      for (const t of indexJson.torahs) {
        if (fuzzyMatchTitle(docxTopic.heTitle, t.title)) {
          jsonNums = [t.number];
          break;
        }
      }
    }

    if (!jsonNums || jsonNums.length === 0) {
      console.log(`  NO MATCH: "${docxTopic.heTitle}" (${docxTopic.enTitle}) - ${docxTopic.entries.length} entries`);
      continue;
    }

    // Use first matching JSON topic number
    const jsonNum = jsonNums[0];
    topicsMatched++;

    const jsonFile = path.join(READER_DIR, `topic-${jsonNum}.json`);
    if (!fs.existsSync(jsonFile)) {
      console.log(`  SKIP: topic-${jsonNum} file not found`);
      continue;
    }

    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    let matched = 0;

    // Find the "חלק שני" segment boundary if any
    let secondPartSegIdx = -1;
    for (let i = 0; i < json.segments.length; i++) {
      const heText = json.segments[i].he.replace(/[\u0591-\u05C7]/g, '').trim();
      if (heText === 'חלק שני' || heText.startsWith('חלק שני')) {
        secondPartSegIdx = i;
        break;
      }
    }

    // Map Part 1 entries
    for (const entry of docxTopic.entries) {
      const seg = json.segments.find(s => s.index === entry.num);
      if (seg) {
        seg.en = entry.en;
        matched++;
      }
    }

    // Map Part 2 entries
    if (docxTopic.secondPart.length > 0 && secondPartSegIdx >= 0) {
      // Part 2 entries start after the חלק שני segment
      // In JSON, Part 2 segments are at indices secondPartSegIdx+1, +2, etc.
      // Their segment.index values restart from 1 (or continue)
      // But the DOCX Part 2 entries are numbered 1, 2, 3...

      for (const entry of docxTopic.secondPart) {
        // The JSON segment index for Part 2 entry N should be at position secondPartSegIdx + entry.num
        const segPosition = secondPartSegIdx + entry.num;
        if (segPosition < json.segments.length) {
          json.segments[segPosition].en = entry.en;
          matched++;
        }
      }
    }

    // Handle case where second part is a separate topic (like topic 53 for lashon hara)
    if (docxTopic.secondPart.length > 0 && secondPartSegIdx < 0) {
      // Look for a "חלק שני" topic that follows this one
      for (const t of indexJson.torahs) {
        if (t.number > jsonNum && stripNikud(t.title) === 'חלקשני') {
          const secFile = path.join(READER_DIR, `topic-${t.number}.json`);
          if (fs.existsSync(secFile)) {
            const secJson = JSON.parse(fs.readFileSync(secFile, 'utf8'));
            let secMatched = 0;
            for (const entry of docxTopic.secondPart) {
              const seg = secJson.segments.find(s => s.index === entry.num);
              if (seg) {
                seg.en = entry.en;
                secMatched++;
              }
            }
            if (secMatched > 0) {
              secJson.hasEnglish = true;
              fs.writeFileSync(secFile, JSON.stringify(secJson, null, 2), 'utf8');
              matched += secMatched;
              console.log(`    -> Also updated topic ${t.number} (חלק שני): ${secMatched} segments`);
            }
          }
          break;
        }
      }
    }

    if (matched > 0) {
      json.hasEnglish = true;
      fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2), 'utf8');
      totalUpdated += matched;
    }

    console.log(`  Topic ${jsonNum} (${docxTopic.enTitle}): ${matched}/${json.segments.length} segments`);
  }

  // Update index.json hasEnglish flags
  for (const torah of indexJson.torahs) {
    const topicFile = path.join(READER_DIR, `topic-${torah.number}.json`);
    if (fs.existsSync(topicFile)) {
      const topicJson = JSON.parse(fs.readFileSync(topicFile, 'utf8'));
      torah.hasEnglish = topicJson.hasEnglish || false;
    }
  }
  fs.writeFileSync(path.join(READER_DIR, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');

  console.log(`\nMatched ${topicsMatched}/${docxTopics.length} topics. Total: ${totalUpdated} segments updated.`);
}

main().catch(err => console.error('Error:', err));
