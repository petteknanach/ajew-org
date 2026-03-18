const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader', 'likutay-eitzos');
const DOCX_PATH = 'C:/Users/nanach/Documents/Translations/A Collection of Advice.docx';

function parseHebrewNumber(str) {
  str = str.replace(/[״"׳']/g, '').trim();
  if (!str) return 0;
  let total = 0;
  for (const ch of str) {
    const map = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
      'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,
      'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400};
    if (map[ch]) total += map[ch];
  }
  return total;
}

function extractEnglishFromLine(text) {
  const hebrewRange = /[\u0590-\u05FF]/;
  const latinRange = /[A-Za-z]/;
  let lastHebrewIdx = -1;
  for (let i = 0; i < text.length; i++) {
    if (hebrewRange.test(text[i])) lastHebrewIdx = i;
  }
  for (let i = lastHebrewIdx + 1; i < text.length; i++) {
    if (latinRange.test(text[i])) {
      return text.substring(i).trim();
    }
  }
  return '';
}

async function main() {
  console.log('Reading DOCX...');
  const result = await mammoth.extractRawText({ path: DOCX_PATH });
  const rawLines = result.value.split('\n');
  const nonEmpty = rawLines.map((l, i) => l.trim()).filter(l => l.length > 0);

  // Hardcoded topic header positions (verified from DOCX line analysis)
  // Format: [jsonTopicNumber, lineIndexInNonEmpty]
  const topicHeaders = [
    [2, 33],    // אמת ואמונה - Truth and Faith
    [3, 92],    // אנחה - Sighing
    [4, 97],    // אכילה - Eating
    [5, 124],   // הכנסת אורחים - Hospitality
    [6, 127],   // ארץ ישראל - Land of Israel
    [7, 148],   // ברית - Bris
    [8, 220],   // בנים - Children
    [9, 237],   // בטחון - Trust
    [10, 242],  // בושה - Shame
    [11, 247],  // בגדים - Clothing
    [12, 253],  // גאוה וענוה - Pride and Humility (header at 253)
    [13, 286],  // דעת - Knowledge
    [14, 341],  // דיבור - Speech (note: line 341 has the דיבור header)
    [15, 365],  // התבודדות - Solitude
    [16, 389],  // התחזקות - Strengthening
    [17, 434],  // השגות - Attainments
    [18, 450],  // וידוי דברים - Confession
    [19, 456],  // זכרון - Memory
    [20, 466],  // חקירות - Investigations
    [21, 513],  // חתון - Marriage
    [22, 536],  // חצות - Midnight
    [23, 556],  // טלטול - Traveling
    [24, 582],  // יראה ועבודה - Fear and Service
    [25, 701],  // כעס - Anger
    [26, 739],  // כבוד - Honor
    [27, 846],  // ליצנות - Mockery
    [28, 860],  // ממון ופרנסה - Money and Livelihood
    [29, 1021], // מחשבות - Thoughts
    [30, 1089], // מחלוקות - Disputes
    [31, 1199], // מניעות - Obstacles
    [32, 1234], // מקוה - Mikveh
    [33, 1247], // שבת - Shabbat
    [34, 1312], // ראש חדש - Rosh Chodesh
    [35, 1319], // שלש רגלים - Three Festivals
    [36, 1345], // פסח - Passover
    [37, 1361], // ספירה ושבועות - Counting/Shavuos
    [38, 1378], // בין המצרים - Between the Straits
    [39, 1388], // אלול - Elul
    [40, 1402], // ראש השנה - Rosh Hashanah
    [41, 1449], // יום כפור - Yom Kippur
    [42, 1463], // סוכות - Sukkot
    [43, 1504], // חנוכה - Chanukah
    [44, 1518], // פורים - Purim
    [45, 1526], // נגינה - Melody
    [46, 1561], // סבלנות - Patience
    [47, 1596], // עזות - Boldness
    [48, 1619], // עצה - Advice
    [49, 1636], // עינים - Eyes
    [50, 1671], // פדיון - Redemption
    [51, 1685], // צדיק - Tzaddik
    [52, 1918], // צדקה - Charity
    [53, 2005], // ציצית - Tzitzit
    [54, 2016], // קדושה - Holiness
    [55, 2033], // רצון - Will/Yearning
    [56, 2050], // רפואה - Healing
    [57, 2073], // שמחה - Joy
    [58, 2153], // שלום - Peace
    [59, 2176], // תלמוד תורה - Torah Study
    [60, 2343], // תפילה - Prayer
    [61, 2536], // תוכחה - Reproof
    [62, 2578], // תפלין - Tefillin
    [63, 2591], // תענית - Fasting
    [64, 2613], // תשובה - Repentance
    [65, 2678], // תמימות - Simplicity
  ];

  const hebrewNumRegex = /^([א-ת]{1,3})\s*[\.]\s*/;
  const arabicNumRegex = /^(\d{1,3})\s*[\.]\s*/;

  let totalUpdated = 0;

  for (let ti = 0; ti < topicHeaders.length; ti++) {
    const [jsonNum, headerLine] = topicHeaders[ti];
    const startLine = headerLine + 1;
    const endLine = ti + 1 < topicHeaders.length ? topicHeaders[ti + 1][1] : nonEmpty.length;

    // Get topic lines
    const topicLines = nonEmpty.slice(startLine, endLine);

    // Helper to match either Hebrew or Arabic numbered prefix
    function matchNumberedEntry(line) {
      let m = line.match(hebrewNumRegex);
      if (m) return { match: m, num: parseHebrewNumber(m[1]) };
      m = line.match(arabicNumRegex);
      if (m) return { match: m, num: parseInt(m[1]) };
      return null;
    }

    // Detect format:
    // 'combined': א.HebrewText(Ref)EnglishText - all on one line
    // 'alternating': א.HebrewText(Ref)\nEnglishText - Hebrew and English on alternating lines
    // 'separate': א.\nHebrewText\nEnglishText - number on its own line
    let format = 'combined';
    for (let li = 0; li < Math.min(10, topicLines.length); li++) {
      const l = topicLines[li];
      const result = matchNumberedEntry(l);
      if (result) {
        const afterNum = l.substring(result.match[0].length).trim();
        if (afterNum.length < 5) {
          format = 'separate';
        } else {
          // Check if English is on this line or the next line
          const en = extractEnglishFromLine(l);
          if (!en && li + 1 < topicLines.length) {
            const nextLine = topicLines[li + 1];
            if (/^[A-Za-z"'\(\["]/.test(nextLine) || arabicNumRegex.test(nextLine)) {
              format = 'alternating';
            }
          }
        }
        break;
      }
    }

    const entries = []; // {num, en}

    if (format === 'combined') {
      for (const line of topicLines) {
        const result = matchNumberedEntry(line);
        if (result) {
          const en = extractEnglishFromLine(line);
          if (en && result.num > 0) {
            entries.push({ num: result.num, en });
          }
        }
      }
    } else if (format === 'alternating') {
      // Hebrew numbered line, then English on next line(s)
      for (let i = 0; i < topicLines.length; i++) {
        const line = topicLines[i];
        const result = matchNumberedEntry(line);
        if (result) {
          // Collect English lines that follow
          let enParts = [];
          // First check if there's English on the same line
          const inlineEn = extractEnglishFromLine(line);
          if (inlineEn) {
            enParts.push(inlineEn);
          }
          // Then check subsequent lines for English
          let j = i + 1;
          while (j < topicLines.length) {
            const nextLine = topicLines[j];
            // Stop if we hit another Hebrew numbered entry
            if (hebrewNumRegex.test(nextLine)) break;
            // Check if it's English (may start with Arabic number or letter)
            if (/^[A-Za-z"'\(\["]/.test(nextLine)) {
              enParts.push(nextLine);
            } else if (arabicNumRegex.test(nextLine)) {
              // English line starting with Arabic number like "1.The rebukers..."
              const arabicMatch = nextLine.match(arabicNumRegex);
              if (arabicMatch) {
                const afterNum = nextLine.substring(arabicMatch[0].length).trim();
                if (/^[A-Za-z]/.test(afterNum)) {
                  enParts.push(afterNum);
                }
              }
            }
            j++;
          }
          if (enParts.length > 0 && result.num > 0) {
            entries.push({ num: result.num, en: enParts.join(' ') });
          }
        }
      }
    } else {
      // Separate format: number on its own line, then Hebrew line(s), then English line(s)
      let currentNum = 0;
      let currentEnglish = [];

      for (let i = 0; i < topicLines.length; i++) {
        const line = topicLines[i];

        // Check if this is a standalone number line (Hebrew letters or Arabic digits + optional period)
        const numOnlyMatch = line.match(/^([א-ת]{1,3})\s*[\.]?\s*$/) || line.match(/^(\d{1,3})\s*[\.]?\s*$/);
        if (numOnlyMatch) {
          // Save previous entry
          if (currentNum > 0 && currentEnglish.length > 0) {
            entries.push({ num: currentNum, en: currentEnglish.join(' ') });
          }
          currentNum = /^\d/.test(numOnlyMatch[1]) ? parseInt(numOnlyMatch[1]) : parseHebrewNumber(numOnlyMatch[1]);
          currentEnglish = [];
          continue;
        }

        // Check if this is a combined-format numbered entry (number + Hebrew + English on same line)
        const combinedResult = matchNumberedEntry(line);
        if (combinedResult) {
          // Save previous entry
          if (currentNum > 0 && currentEnglish.length > 0) {
            entries.push({ num: currentNum, en: currentEnglish.join(' ') });
          }
          const en = extractEnglishFromLine(line);
          if (en && combinedResult.num > 0) {
            entries.push({ num: combinedResult.num, en });
          }
          currentNum = 0;
          currentEnglish = [];
          continue;
        }

        if (currentNum > 0) {
          // Check if line is English
          const isEnglish = /^[A-Za-z"'\(\["]/.test(line);
          if (isEnglish) {
            currentEnglish.push(line);
          } else {
            // Check if it's a mixed Hebrew+English line
            const en = extractEnglishFromLine(line);
            if (en && en.length > 10) {
              currentEnglish.push(en);
            }
          }
        }
      }
      // Save last entry
      if (currentNum > 0 && currentEnglish.length > 0) {
        entries.push({ num: currentNum, en: currentEnglish.join(' ') });
      }
    }

    // Load and update JSON
    const jsonFile = path.join(READER_DIR, `topic-${jsonNum}.json`);
    if (!fs.existsSync(jsonFile)) {
      console.log(`  SKIP topic-${jsonNum}: file not found`);
      continue;
    }

    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    let matched = 0;

    for (const entry of entries) {
      const seg = json.segments.find(s => s.index === entry.num);
      if (seg) {
        seg.en = entry.en;
        matched++;
      }
    }

    if (matched > 0) {
      json.hasEnglish = true;
      fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2), 'utf8');
      totalUpdated += matched;
    }

    const pct = json.segments.length > 0 ? Math.round(matched / json.segments.length * 100) : 0;
    console.log(`  Topic ${jsonNum}: ${matched}/${json.segments.length} (${pct}%) [${format}] ${entries.length} entries`);
  }

  // Handle Introduction (topic 1)
  const introJsonFile = path.join(READER_DIR, 'topic-1.json');
  if (fs.existsSync(introJsonFile)) {
    const introJson = JSON.parse(fs.readFileSync(introJsonFile, 'utf8'));
    for (const line of nonEmpty) {
      if (line.includes('Who is the man who desires life')) {
        introJson.segments[0].en = line;
        introJson.hasEnglish = true;
        fs.writeFileSync(introJsonFile, JSON.stringify(introJson, null, 2), 'utf8');
        console.log('  Topic 1: 1/1 (100%) [intro]');
        totalUpdated++;
        break;
      }
    }
  }

  // Update index.json
  const indexJson = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'index.json'), 'utf8'));
  for (const torah of indexJson.torahs) {
    const topicFile = path.join(READER_DIR, `topic-${torah.number}.json`);
    if (fs.existsSync(topicFile)) {
      const topicJson = JSON.parse(fs.readFileSync(topicFile, 'utf8'));
      torah.hasEnglish = topicJson.hasEnglish || false;
    }
  }
  fs.writeFileSync(path.join(READER_DIR, 'index.json'), JSON.stringify(indexJson, null, 2), 'utf8');

  console.log(`\nTotal: ${totalUpdated} segments updated.`);
}

main().catch(err => console.error('Error:', err));
