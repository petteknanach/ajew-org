/**
 * Build Chain of Light (שרשרת האור) - Connection Mapping
 *
 * Scans all Breslov sefarim to find references to Likutay Moharan torahs,
 * building a complete "chain" showing how each teaching flows through the library.
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const OUTPUT_FILE = path.join(READER_DIR, '..', 'chain-of-light.json');

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) { return null; }
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir);
  } catch (e) { return []; }
}

// Hebrew number mapping for parsing references
const hebrewNums = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
  'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23,
  'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
  'לא': 31, 'לב': 32, 'לג': 33, 'לד': 34, 'לה': 35, 'לו': 36, 'לז': 37,
  'לח': 38, 'לט': 39, 'מ': 40, 'מא': 41, 'מב': 42, 'מג': 43, 'מד': 44,
  'מה': 45, 'מו': 46, 'מז': 47, 'מח': 48, 'מט': 49, 'נ': 50,
  'נא': 51, 'נב': 52, 'נג': 53, 'נד': 54, 'נה': 55, 'נו': 56, 'נז': 57,
  'נח': 58, 'נט': 59, 'ס': 60, 'סא': 61, 'סב': 62, 'סג': 63, 'סד': 64,
  'סה': 65, 'סו': 66, 'סז': 67, 'סח': 68, 'סט': 69, 'ע': 70,
  'עא': 71, 'עב': 72, 'עג': 73, 'עד': 74, 'עה': 75, 'עו': 76, 'עז': 77,
  'עח': 78, 'עט': 79, 'פ': 80, 'פא': 81, 'פב': 82, 'פג': 83, 'פד': 84,
  'פה': 85, 'פו': 86, 'פז': 87, 'פח': 88, 'פט': 89, 'צ': 90,
  'צא': 91, 'צב': 92, 'צג': 93, 'צד': 94, 'צה': 95, 'צו': 96, 'צז': 97,
  'צח': 98, 'צט': 99, 'ק': 100, 'קא': 101, 'קב': 102, 'קג': 103,
  'קד': 104, 'קה': 105, 'קו': 106, 'קז': 107, 'קח': 108, 'קט': 109,
  'קי': 110, 'קיא': 111, 'קיב': 112, 'קיג': 113, 'קיד': 114, 'קטו': 115,
  'קטז': 116, 'קיז': 117, 'קיח': 118, 'קיט': 119, 'קכ': 120,
  'קכא': 121, 'קכב': 122, 'קכג': 123, 'קכד': 124, 'קכה': 125,
  'קכו': 126, 'קכז': 127, 'קכח': 128, 'קכט': 129, 'קל': 130,
  'קלא': 131, 'קלב': 132, 'קלג': 133, 'קלד': 134, 'קלה': 135,
  'קלו': 136, 'קלז': 137, 'קלח': 138, 'קלט': 139, 'קמ': 140,
  'קמא': 141, 'קמב': 142, 'קמג': 143, 'קמד': 144, 'קמה': 145,
  'קמו': 146, 'קמז': 147, 'קמח': 148, 'קמט': 149, 'קנ': 150,
  'קנא': 151, 'קנב': 152, 'קנג': 153, 'קנד': 154, 'קנה': 155,
  'קנו': 156, 'קנז': 157, 'קנח': 158, 'קנט': 159, 'קס': 160,
  'קסא': 161, 'קסב': 162, 'קסג': 163, 'קסד': 164, 'קסה': 165,
  'קסו': 166, 'קסז': 167, 'קסח': 168, 'קסט': 169, 'קע': 170,
  'קעא': 171, 'קעב': 172, 'קעג': 173, 'קעד': 174, 'קעה': 175,
  'קעו': 176, 'קעז': 177, 'קעח': 178, 'קעט': 179, 'קפ': 180,
  'קפא': 181, 'קפב': 182, 'קפג': 183, 'קפד': 184, 'קפה': 185,
  'קפו': 186, 'קפז': 187, 'קפח': 188, 'קפט': 189, 'קצ': 190,
  'קצא': 191, 'קצב': 192, 'קצג': 193, 'קצד': 194, 'קצה': 195,
  'קצו': 196, 'קצז': 197, 'קצח': 198, 'קצט': 199, 'ר': 200,
  'רא': 201, 'רב': 202, 'רג': 203, 'רד': 204, 'רה': 205, 'רו': 206,
  'רז': 207, 'רח': 208, 'רט': 209, 'רי': 210, 'ריא': 211, 'ריב': 212,
  'ריג': 213, 'ריד': 214, 'רטו': 215, 'רטז': 216, 'ריז': 217, 'ריח': 218,
  'ריט': 219, 'רכ': 220, 'רכא': 221, 'רכב': 222, 'רכג': 223, 'רכד': 224,
  'רכה': 225, 'רכו': 226, 'רכז': 227, 'רכח': 228, 'רכט': 229, 'רל': 230,
  'רלא': 231, 'רלב': 232, 'רלג': 233, 'רלד': 234, 'רלה': 235, 'רלו': 236,
  'רלז': 237, 'רלח': 238, 'רלט': 239, 'רמ': 240, 'רמא': 241, 'רמב': 242,
  'רמג': 243, 'רמד': 244, 'רמה': 245, 'רמו': 246, 'רמז': 247, 'רמח': 248,
  'רמט': 249, 'רנ': 250, 'רנא': 251, 'רנב': 252, 'רנג': 253, 'רנד': 254,
  'רנה': 255, 'רנו': 256, 'רנז': 257, 'רנח': 258, 'רנט': 259, 'רס': 260,
  'רסא': 261, 'רסב': 262, 'רסג': 263, 'רסד': 264, 'רסה': 265, 'רסו': 266,
  'רסז': 267, 'רסח': 268, 'רסט': 269, 'רע': 270, 'רעא': 271, 'רעב': 272,
  'רעג': 273, 'רעד': 274, 'רעה': 275, 'רעו': 276, 'רעז': 277, 'רעח': 278,
  'רעט': 279, 'רפ': 280, 'רפא': 281, 'רפב': 282, 'רפג': 283, 'רפד': 284,
  'רפה': 285, 'רפו': 286
};

// Reverse lookup
const numToHebrew = {};
for (const [he, num] of Object.entries(hebrewNums)) {
  numToHebrew[num] = he;
}

// Extract a text snippet (first ~120 chars) from segments
function getSnippet(segments, maxLen = 120) {
  if (!segments || !segments.length) return '';
  // Skip segments that are just titles/headers (very short)
  for (const seg of segments) {
    const text = seg.he || seg.en || '';
    if (text.length > 20) {
      return text.substring(0, maxLen) + (text.length > maxLen ? '...' : '');
    }
  }
  const first = segments[0];
  const text = first.he || first.en || '';
  return text.substring(0, maxLen) + (text.length > maxLen ? '...' : '');
}

// Parse Hebrew siman number from title like "סימן א", "סימן כב"
function parseSimanFromTitle(title) {
  // Match "סימן X" or "סי' X" or "סי" X"
  const match = title.match(/סימן\s+([א-ת]{1,3})/);
  if (match) {
    const heNum = match[1].replace(/['"׳]/g, '');
    return hebrewNums[heNum] || null;
  }
  const match2 = title.match(/סי['\u05F3"]\s*([א-ת]{1,3})/);
  if (match2) {
    const heNum = match2[1].replace(/['"׳]/g, '');
    return hebrewNums[heNum] || null;
  }
  return null;
}

// ============================================================
// 1. KITZUR LIKUTAY MOHARAN - Direct 1:1 correspondence
// ============================================================
function processKitzur(result) {
  console.log('Processing Kitzur Likutay Moharan...');
  let count = 0;

  for (const partNum of [1, 2]) {
    const partKey = `part-${partNum}`;
    const dir = path.join(READER_DIR, 'kitzur-likutay-moharan', partKey);
    const files = listFiles(dir).filter(f => f.startsWith('torah-') && f.endsWith('.json'));

    for (const file of files) {
      const data = loadJSON(path.join(dir, file));
      if (!data) continue;

      const torahNum = data.torah || data.displayNumber;
      if (!torahNum || torahNum < 1) continue;

      // Skip introductions
      const title = data.title || data.hebrewTitle || '';
      if (title.includes('הקדמ')) continue;

      // Kitzur torah N directly corresponds to LM torah N
      let lmTorahNum = torahNum;

      const maxLm = partNum === 1 ? 286 : 125;
      if (lmTorahNum < 1 || lmTorahNum > maxLm) continue;

      const key = `part-${partNum}`;
      if (!result[key][lmTorahNum]) result[key][lmTorahNum] = { connections: [] };

      result[key][lmTorahNum].connections.push({
        book: 'kitzur-likutay-moharan',
        bookTitle: 'Kitzur Likutay Moharan',
        bookHebrew: 'קיצור ליקוטי מוהר"ן',
        part: partNum,
        torah: torahNum,
        type: 'summary',
        typeLabel: 'Summary',
        typeHebrew: 'קיצור',
        snippet: getSnippet(data.segments),
        url: `/reader/kitzur-likutay-moharan/${partNum}/${torahNum}`
      });
      count++;
    }
  }
  console.log(`  Found ${count} Kitzur connections`);
}

// ============================================================
// 2. LIKUTAY TEFILOS - Prayer N maps to LM Torah N
// ============================================================
function processTefilos(result) {
  console.log('Processing Likutay Tefilos...');
  let count = 0;

  // Part 2 = prayers for LM Part 1 (prayer 1 = based on torah 1)
  // Part 3 = prayers for LM Part 2
  const partMapping = { 2: 1, 3: 2 };

  for (const [tefilosPart, lmPart] of Object.entries(partMapping)) {
    const dir = path.join(READER_DIR, 'likutay-tefilos', `part-${tefilosPart}`);
    const files = listFiles(dir).filter(f => f.startsWith('prayer-') && f.endsWith('.json'));

    for (const file of files) {
      const data = loadJSON(path.join(dir, file));
      if (!data) continue;

      const prayerNum = data.torah || data.displayNumber;
      if (!prayerNum || prayerNum < 1) continue;

      // Prayer number corresponds to LM torah number
      const lmTorahNum = prayerNum;
      const maxLm = lmPart === 1 ? 286 : 125;
      if (lmTorahNum > maxLm) continue;

      const key = `part-${lmPart}`;
      if (!result[key][lmTorahNum]) result[key][lmTorahNum] = { connections: [] };

      result[key][lmTorahNum].connections.push({
        book: 'likutay-tefilos',
        bookTitle: 'Likutay Tefilos',
        bookHebrew: 'ליקוטי תפילות',
        part: parseInt(tefilosPart),
        torah: prayerNum,
        type: 'prayer',
        typeLabel: 'Prayer',
        typeHebrew: 'תפילה',
        snippet: getSnippet(data.segments),
        url: `/reader/likutay-tefilos/${tefilosPart}/${prayerNum}`
      });
      count++;
    }
  }
  console.log(`  Found ${count} Tefilos connections`);
}

// ============================================================
// 3. PARPAROS LECHOCHMA - Organized by siman (LM torah number)
// ============================================================
function processParparos(result) {
  console.log('Processing Parparos LeChochma...');
  let count = 0;

  const dir = path.join(READER_DIR, 'parparos-lechochma');
  const files = listFiles(dir).filter(f => f.startsWith('section-') && f.endsWith('.json'));

  for (const file of files) {
    const data = loadJSON(path.join(dir, file));
    if (!data) continue;

    const title = data.title || data.hebrewTitle || '';

    // Parse siman number from title
    let lmTorahNum = parseSimanFromTitle(title);

    // Also check inside text for siman references
    if (!lmTorahNum && data.segments && data.segments.length > 0) {
      for (const seg of data.segments.slice(0, 3)) {
        const text = seg.he || '';
        const match = text.match(/בסימן\s+([א-ת]{1,3})['\u05F3]?\s/);
        if (match) {
          lmTorahNum = hebrewNums[match[1]] || null;
          if (lmTorahNum) break;
        }
      }
    }

    if (!lmTorahNum) continue;

    // Determine which LM part (Parparos covers both parts)
    // We need to check if it's part 1 or part 2
    // Parparos typically goes through part 1 first, then part 2
    // Part 1 torahs go up to 286, check text for "תנינא" references
    let lmPart = 1;
    const textSample = (data.segments || []).slice(0, 5).map(s => s.he || '').join(' ');
    if (textSample.includes('תנינא') || textSample.includes('ליקוטי תנינא') || title.includes('תנינא')) {
      lmPart = 2;
    }

    // If siman number > 286 and part is 1, likely part 2
    if (lmPart === 1 && lmTorahNum > 286) {
      lmPart = 2;
    }

    const key = `part-${lmPart}`;
    if (!result[key][lmTorahNum]) result[key][lmTorahNum] = { connections: [] };

    result[key][lmTorahNum].connections.push({
      book: 'parparos-lechochma',
      bookTitle: 'Parparos LeChochma',
      bookHebrew: 'פרפראות לחכמה',
      part: 1,
      torah: data.torah || data.displayNumber,
      type: 'commentary',
      typeLabel: 'Commentary',
      typeHebrew: 'פירוש',
      snippet: getSnippet(data.segments),
      url: `/reader/parparos-lechochma/1/${data.torah || data.displayNumber}`
    });
    count++;
  }
  console.log(`  Found ${count} Parparos connections`);
}

// ============================================================
// 4. BIUR HALIKUTIM - Commentary organized by LM sections
// ============================================================
function processBiur(result) {
  console.log('Processing Biur HaLikutim...');
  let count = 0;

  const dir = path.join(READER_DIR, 'biur-halikutim');
  const files = listFiles(dir).filter(f => f.startsWith('section-') && f.endsWith('.json'));

  for (const file of files) {
    const data = loadJSON(path.join(dir, file));
    if (!data) continue;

    const title = data.title || data.hebrewTitle || '';

    // Parse siman from title
    let lmTorahNum = parseSimanFromTitle(title);

    // Also search text for "סימן" references
    if (!lmTorahNum && data.segments) {
      for (const seg of data.segments.slice(0, 5)) {
        const text = seg.he || '';
        // Look for patterns like "בסימן א'" or "סי' כב"
        const match = text.match(/[בל]?סימן\s+([א-ת]{1,3})['\u05F3]?\b/) ||
                      text.match(/סי['\u05F3"]\s*([א-ת]{1,3})\b/);
        if (match) {
          lmTorahNum = hebrewNums[match[1]] || null;
          if (lmTorahNum) break;
        }
      }
    }

    if (!lmTorahNum) continue;

    let lmPart = 1;
    const textSample = (data.segments || []).slice(0, 5).map(s => s.he || '').join(' ');
    if (textSample.includes('תנינא') || title.includes('תנינא')) {
      lmPart = 2;
    }
    if (lmPart === 1 && lmTorahNum > 286) lmPart = 2;

    const key = `part-${lmPart}`;
    if (!result[key][lmTorahNum]) result[key][lmTorahNum] = { connections: [] };

    result[key][lmTorahNum].connections.push({
      book: 'biur-halikutim',
      bookTitle: 'Biur HaLikutim',
      bookHebrew: 'ביאור הליקוטים',
      part: 1,
      torah: data.torah || data.displayNumber,
      type: 'commentary',
      typeLabel: 'Commentary',
      typeHebrew: 'ביאור',
      snippet: getSnippet(data.segments),
      url: `/reader/biur-halikutim/1/${data.torah || data.displayNumber}`
    });
    count++;
  }
  console.log(`  Found ${count} Biur connections`);
}

// ============================================================
// 5. LIKUTAY HALACHOS - Scan text for LM references
// ============================================================
function processLikutayHalachos(result) {
  console.log('Processing Likutay Halachos...');
  let count = 0;

  for (let partNum = 1; partNum <= 8; partNum++) {
    const dir = path.join(READER_DIR, 'likutay-halachos', `part-${partNum}`);
    const files = listFiles(dir).filter(f => f.startsWith('halacha-') && f.endsWith('.json'));

    for (const file of files) {
      const data = loadJSON(path.join(dir, file));
      if (!data || !data.segments) continue;

      const allText = data.segments.map(s => s.he || '').join(' ');
      const allEnglish = data.segments.map(s => s.en || '').join(' ');

      // Track which LM torahs this halacha references (avoid duplicates)
      const foundRefs = new Set();

      // Hebrew patterns for LM references
      // "ליקוטי מוהר"ן סימן X" or "במוהר"ן סי' X"
      const hePatterns = [
        /(?:ליקוטי\s*)?מוהר["\u05F4]ן\s*(?:קמא\s*)?סימן\s+([א-ת]{1,3})/g,
        /(?:ליקוטי\s*)?מוהר["\u05F4]ן\s*(?:קמא\s*)?סי['\u05F3"]\s*([א-ת]{1,3})/g,
        /לקוטי\s*מוהר["\u05F4]ן\s*(?:קמא\s*)?סימן\s+([א-ת]{1,3})/g,
        /לקוטי\s*מוהר["\u05F4]ן\s*(?:קמא\s*)?סי['\u05F3"]\s*([א-ת]{1,3})/g,
        /(?:במוהר["\u05F4]ן|בליקוטי)\s*(?:קמא\s*)?סימן\s+([א-ת]{1,3})/g,
        /(?:במוהר["\u05F4]ן|בליקוטי)\s*(?:קמא\s*)?סי['\u05F3"]\s*([א-ת]{1,3})/g,
        // Also match pattern: "תורה X" when in context of LM
        /תורה\s+([א-ת]{1,3})['\u05F3]?\s/g,
      ];

      for (const pattern of hePatterns) {
        let match;
        while ((match = pattern.exec(allText)) !== null) {
          const heNum = match[1].replace(/['"׳\u05F3]/g, '');
          const num = hebrewNums[heNum];
          if (num && num >= 1 && num <= 286) {
            foundRefs.add(`1:${num}`);
          }
        }
      }

      // Check for תנינא references (Part 2)
      const tniPatterns = [
        /(?:ליקוטי\s*)?מוהר["\u05F4]ן\s*תנינא\s*סימן\s+([א-ת]{1,3})/g,
        /(?:ליקוטי\s*)?מוהר["\u05F4]ן\s*תנינא\s*סי['\u05F3"]\s*([א-ת]{1,3})/g,
        /לקוטי\s*תנינא\s*סימן\s+([א-ת]{1,3})/g,
        /לקוטי\s*תנינא\s*סי['\u05F3"]\s*([א-ת]{1,3})/g,
      ];

      for (const pattern of tniPatterns) {
        let match;
        while ((match = pattern.exec(allText)) !== null) {
          const heNum = match[1].replace(/['"׳\u05F3]/g, '');
          const num = hebrewNums[heNum];
          if (num && num >= 1 && num <= 125) {
            foundRefs.add(`2:${num}`);
          }
        }
      }

      // English pattern scanning
      const enPatterns = [
        /Likut(?:ey|ay)\s+Moharan\s+(?:I\s+)?(?:Torah\s+)?(\d+)/gi,
        /(?:Torah|Lesson)\s+(\d+)\s/gi,
        /LM\s+(?:I\s+)?(\d+)/g,
      ];

      for (const pattern of enPatterns) {
        let match;
        while ((match = pattern.exec(allEnglish)) !== null) {
          const num = parseInt(match[1]);
          if (num >= 1 && num <= 286) {
            foundRefs.add(`1:${num}`);
          }
        }
      }

      // Add connections
      for (const ref of foundRefs) {
        const [partStr, numStr] = ref.split(':');
        const lmPart = parseInt(partStr);
        const lmTorahNum = parseInt(numStr);

        const key = `part-${lmPart}`;
        if (!result[key][lmTorahNum]) result[key][lmTorahNum] = { connections: [] };

        result[key][lmTorahNum].connections.push({
          book: 'likutay-halachos',
          bookTitle: 'Likutay Halachos',
          bookHebrew: 'ליקוטי הלכות',
          part: partNum,
          torah: data.torah || data.displayNumber,
          type: 'expansion',
          typeLabel: 'Expansion',
          typeHebrew: 'הרחבה',
          title: data.title || data.hebrewTitle || '',
          snippet: getSnippet(data.segments),
          url: `/reader/likutay-halachos/${partNum}/${data.torah || data.displayNumber}`
        });
        count++;
      }
    }
  }
  console.log(`  Found ${count} LH connections`);
}

// ============================================================
// 6. SICHOS HARAN - Scan text for LM references
// ============================================================
function processSichos(result) {
  console.log('Processing Sichos HaRan...');
  let count = 0;

  const dir = path.join(READER_DIR, 'sichos-haran');
  const indexData = loadJSON(path.join(dir, 'index.json'));
  if (!indexData) return;

  // Sichos files could be in a subdirectory or directly
  const files = listFiles(dir).filter(f => f.endsWith('.json') && f !== 'index.json');

  for (const file of files) {
    const data = loadJSON(path.join(dir, file));
    if (!data || !data.segments) continue;

    const allText = data.segments.map(s => (s.he || '') + ' ' + (s.en || '')).join(' ');

    // Look for LM references
    const refs = scanForLMReferences(allText);

    for (const ref of refs) {
      const key = `part-${ref.part}`;
      if (!result[key][ref.torah]) result[key][ref.torah] = { connections: [] };

      result[key][ref.torah].connections.push({
        book: 'sichos-haran',
        bookTitle: 'Sichos HaRan',
        bookHebrew: 'שיחות הר"ן',
        part: 1,
        torah: data.torah || data.displayNumber,
        type: 'related',
        typeLabel: 'Related Teaching',
        typeHebrew: 'שיחה',
        snippet: getSnippet(data.segments),
        url: `/reader/sichos-haran/1/${data.torah || data.displayNumber}`
      });
      count++;
    }
  }
  console.log(`  Found ${count} Sichos connections`);
}

// ============================================================
// 7. Other books - scan for LM references in text
// ============================================================
function processOtherBooks(result) {
  console.log('Processing other Breslov books...');
  let count = 0;

  const otherBooks = [
    { id: 'hashtatfchus-hanefesh', title: 'Hashtatfchus HaNefesh', hebrew: 'השתפכות הנפש', type: 'related', typeLabel: 'Related', typeHebrew: 'קשור' },
    { id: 'meshivas-nefesh', title: 'Meshivas Nefesh', hebrew: 'משיבת נפש', type: 'related', typeLabel: 'Related', typeHebrew: 'קשור' },
    { id: 'likutay-eitzos', title: 'Likutay Eitzos', hebrew: 'ליקוטי עצות', type: 'advice', typeLabel: 'Practical Advice', typeHebrew: 'עצות' },
    { id: 'chayey-moharan', title: 'Chayey Moharan', hebrew: 'חיי מוהר"ן', type: 'related', typeLabel: 'Related', typeHebrew: 'קשור' },
    { id: 'shivchay-haran', title: 'Shivchay HaRan', hebrew: 'שבחי הר"ן', type: 'related', typeLabel: 'Related', typeHebrew: 'קשור' },
    { id: 'rimzei-hamaasiyos', title: 'Rimzei HaMaasiyos', hebrew: 'רמזי המעשיות', type: 'commentary', typeLabel: 'Commentary', typeHebrew: 'פירוש' },
    { id: 'chochma-utvuna', title: "Chochma U'Tvuna", hebrew: 'חכמה ותבונה', type: 'commentary', typeLabel: 'Commentary', typeHebrew: 'ביאור' },
    { id: 'kokhvei-or', title: 'Kokhvei Or', hebrew: 'כוכבי אור', type: 'related', typeLabel: 'Related', typeHebrew: 'קשור' },
    { id: 'otzar-hayirah', title: 'Otzar HaYirah', hebrew: 'אוצר היראה', type: 'advice', typeLabel: 'Practical Advice', typeHebrew: 'עצות' },
  ];

  for (const bookInfo of otherBooks) {
    const bookDir = path.join(READER_DIR, bookInfo.id);
    if (!fs.existsSync(bookDir)) continue;

    // Handle books with parts
    const subdirs = listFiles(bookDir);
    const hasParts = subdirs.some(d => d.startsWith('part-'));

    const dirsToScan = hasParts
      ? subdirs.filter(d => d.startsWith('part-')).map(d => ({ dir: path.join(bookDir, d), partNum: parseInt(d.replace('part-', '')) }))
      : [{ dir: bookDir, partNum: 1 }];

    for (const { dir, partNum } of dirsToScan) {
      const files = listFiles(dir).filter(f => f.endsWith('.json') && f !== 'index.json');

      for (const file of files) {
        const data = loadJSON(path.join(dir, file));
        if (!data || !data.segments) continue;

        const allText = data.segments.map(s => (s.he || '') + ' ' + (s.en || '')).join(' ');
        const refs = scanForLMReferences(allText);

        for (const ref of refs) {
          const key = `part-${ref.part}`;
          if (!result[key][ref.torah]) result[key][ref.torah] = { connections: [] };

          result[key][ref.torah].connections.push({
            book: bookInfo.id,
            bookTitle: bookInfo.title,
            bookHebrew: bookInfo.hebrew,
            part: partNum,
            torah: data.torah || data.displayNumber,
            type: bookInfo.type,
            typeLabel: bookInfo.typeLabel,
            typeHebrew: bookInfo.typeHebrew,
            snippet: getSnippet(data.segments),
            url: `/reader/${bookInfo.id}/${partNum}/${data.torah || data.displayNumber}`
          });
          count++;
        }
      }
    }
  }
  console.log(`  Found ${count} connections from other books`);
}

// General LM reference scanner
function scanForLMReferences(text) {
  const refs = new Set();

  // Hebrew patterns
  const hePatterns = [
    /(?:ליקוטי\s*)?מוהר["\u05F4]ן\s*(?:קמא\s*)?(?:סימן|סי['\u05F3"])\s*([א-ת]{1,3})/g,
    /לקוטי\s*מוהר["\u05F4]ן\s*(?:קמא\s*)?(?:סימן|סי['\u05F3"])\s*([א-ת]{1,3})/g,
    /(?:במוהר["\u05F4]ן|בליקוטי)\s*(?:קמא\s*)?(?:סימן|סי['\u05F3"])\s*([א-ת]{1,3})/g,
  ];

  for (const pattern of hePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const heNum = match[1].replace(/['"׳\u05F3]/g, '');
      const num = hebrewNums[heNum];
      if (num && num >= 1 && num <= 286) {
        refs.add(`1:${num}`);
      }
    }
  }

  // Part 2 references
  const tniPatterns = [
    /(?:ליקוטי\s*)?מוהר["\u05F4]ן\s*תנינא\s*(?:סימן|סי['\u05F3"])\s*([א-ת]{1,3})/g,
    /לקוטי\s*תנינא\s*(?:סימן|סי['\u05F3"])\s*([א-ת]{1,3})/g,
  ];

  for (const pattern of tniPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const heNum = match[1].replace(/['"׳\u05F3]/g, '');
      const num = hebrewNums[heNum];
      if (num && num >= 1 && num <= 125) {
        refs.add(`2:${num}`);
      }
    }
  }

  // English patterns
  const enPatterns = [
    /Likut(?:ey|ay)\s+Moharan\s+(?:(?:Part\s+)?(?:1|I)\s+)?(?:Torah\s+)?#?(\d+)/gi,
    /Likut(?:ey|ay)\s+Moharan\s+(?:(?:Part\s+)?(?:2|II)\s+)?(?:Torah\s+)?#?(\d+)/gi,
    /\bLM\s+(?:I\s+)?#?(\d+)\b/g,
  ];

  for (const pattern of enPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 286) {
        refs.add(`1:${num}`);
      }
    }
  }

  return [...refs].map(r => {
    const [p, t] = r.split(':');
    return { part: parseInt(p), torah: parseInt(t) };
  });
}

// ============================================================
// 8. LOAD LM METADATA for source information
// ============================================================
function loadLMMetadata() {
  console.log('Loading LM metadata...');
  const metadata = { 'part-1': {}, 'part-2': {} };

  for (const partNum of [1, 2]) {
    const dir = path.join(READER_DIR, 'likutay-moharan', `part-${partNum}`);
    const files = listFiles(dir).filter(f => f.startsWith('torah-') && f.endsWith('.json'));

    for (const file of files) {
      const data = loadJSON(path.join(dir, file));
      if (!data) continue;

      const torahNum = data.torah || data.displayNumber;
      if (!torahNum) continue;

      metadata[`part-${partNum}`][torahNum] = {
        title: data.title || '',
        hebrewTitle: data.hebrewTitle || '',
        keyVerse: data.keyVerse || '',
        keyVerseRef: data.keyVerseRef || '',
        themes: data.themes || [],
        snippet: getSnippet(data.segments, 150),
        url: `/reader/likutay-moharan/${partNum}/${torahNum}`
      };
    }
  }

  return metadata;
}

// ============================================================
// MAIN
// ============================================================
function main() {
  console.log('Building Chain of Light (שרשרת האור)...\n');

  const result = {
    'part-1': {},
    'part-2': {}
  };

  // Process each book type
  processKitzur(result);
  processTefilos(result);
  processParparos(result);
  processBiur(result);
  processLikutayHalachos(result);
  processSichos(result);
  processOtherBooks(result);

  // Load LM metadata
  const lmMetadata = loadLMMetadata();

  // Build final output
  const output = {
    generatedAt: new Date().toISOString(),
    lmMetadata,
    connections: result
  };

  // Calculate stats
  let totalConnections = 0;
  let torahsWithConnections = 0;

  for (const partKey of ['part-1', 'part-2']) {
    for (const torahNum of Object.keys(result[partKey])) {
      const conns = result[partKey][torahNum].connections;
      if (conns.length > 0) {
        torahsWithConnections++;
        totalConnections += conns.length;
      }
    }
  }

  console.log(`\nResults:`);
  console.log(`  Total connections: ${totalConnections}`);
  console.log(`  Torahs with connections: ${torahsWithConnections}`);
  console.log(`  Average connections per torah: ${(totalConnections / Math.max(torahsWithConnections, 1)).toFixed(1)}`);

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nSaved to: ${OUTPUT_FILE}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
}

main();
