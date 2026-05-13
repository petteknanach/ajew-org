/**
 * fix-section-titles.cjs
 *
 * Scans ALL book directories in public/reader/ and adds English titles
 * to section entries where the `title` field contains Hebrew text.
 * Sets `hebrewTitle` to the original Hebrew, and `title` to an English version.
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');

// --- Hebrew letter to number conversion ---
const HEBREW_LETTERS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
  'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100,
  'ר': 200, 'ש': 300, 'ת': 400
};

function hebrewToNumber(heb) {
  // Strip nikud/cantillation
  const clean = heb.replace(/[\u0591-\u05C7]/g, '').trim();
  // Handle special cases like תק = 500, תר = 600 etc
  let sum = 0;
  for (const ch of clean) {
    if (HEBREW_LETTERS[ch] !== undefined) {
      sum += HEBREW_LETTERS[ch];
    } else {
      return null; // Not a pure Hebrew number
    }
  }
  return sum > 0 ? sum : null;
}

function containsHebrew(str) {
  return /[\u0590-\u05FF]/.test(str);
}

function stripNikud(str) {
  return str.replace(/[\u0591-\u05C7]/g, '');
}

// --- Known Hebrew word/phrase translations ---
const WORD_TRANSLATIONS = {
  'הקדמה': 'Introduction',
  'הַקְדָּמָה': 'Introduction',
  'פתיחה': 'Opening',
  'מפתחות': 'Index',
  'מפתחות השמטות': 'Index of Omissions',
  'השמטות': 'Omissions',
  'הסכמה': 'Approbation',
  'הסכמות': 'Approbations',
  'תוכן': 'Contents',
  'תוכן העניינים': 'Table of Contents',
  'נספח': 'Appendix',
  'הקדמת המדפיס': 'Printer\'s Introduction',
  'הקדמת המחבר': 'Author\'s Introduction',
  'ספורים חדשים': 'New Stories',

  // Book names that appear as section titles
  'שיחות הר"ן': 'Sichos HaRan',
  "שיחות הר\"ן": 'Sichos HaRan',
  'ליקוטי הלכות': 'Likutay Halachos',
  "'ליקוטי הלכות'": 'Likutay Halachos',
  'עלים לתרופה': 'Alim LiTrufa',
  "'עלים לתרופה'": 'Alim LiTrufa',
  'ליקוטי מוהר"ן': 'Likutay Moharan',
  "ליקוטי מוהר\"ן": 'Likutay Moharan',
  'ליקוטי תפילות': 'Likutay Tefilos',
  'ליקוטי עצות': 'Likutay Eitzos',
  'סיפורי מעשיות': 'Sipurey Maasiyos',
  'ספר המידות': 'Sefer Hamidos',
  'חיי מוהר"ן': 'Chayay Moharan',
  "חיי מוהר\"ן": 'Chayay Moharan',
  'שבחי הר"ן': 'Shivchay HaRan',
  "שבחי הר\"ן": 'Shivchay HaRan',

  // Common topic words (for Sefer Hamidos, Likutay Eitzos etc.)
  'אמת': 'Truth',
  'אמונה': 'Faith',
  'אהבה': 'Love',
  'אכילה': 'Eating',
  'אלמן': 'Widower',
  'אבדה': 'Lost Object',
  'בנים': 'Children',
  'בית': 'House',
  'בושה': 'Shame',
  'בגדים': 'Clothing',
  'בטחון': 'Trust',
  'ברית': 'Covenant',
  'ברכה': 'Blessing',
  'ברכת המזון': 'Birkat HaMazon',
  'גאוה': 'Pride',
  'גאולה': 'Redemption',
  'גזלה': 'Theft',
  'גירושין': 'Divorce',
  'גניבה': 'Stealing',
  'דעת': 'Knowledge',
  'דין': 'Judgment',
  'הכנסת אורחים': 'Hospitality',
  'הלצה': 'Mockery',
  'השגחה': 'Providence',
  'וידוי': 'Confession',
  'זיווג': 'Marriage Match',
  'חלום': 'Dream',
  'חן': 'Grace',
  'חנוך': 'Education',
  'חסד': 'Kindness',
  'טובה': 'Goodness',
  'יראה': 'Fear of God',
  'ישועה': 'Salvation',
  'כבוד': 'Honor',
  'כעס': 'Anger',
  'לימוד': 'Study',
  'לשון הרע': 'Evil Speech',
  'מחלוקת': 'Controversy',
  'מזל': 'Luck',
  'ממון': 'Money',
  'מלחמה': 'War',
  'נדר': 'Vow',
  'נח': 'Rest',
  'סבלנות': 'Patience',
  'ענוה': 'Humility',
  'פרנסה': 'Livelihood',
  'צדיק': 'Tzaddik',
  'צדקה': 'Charity',
  'קדושה': 'Holiness',
  'רחמים': 'Mercy',
  'רפואה': 'Healing',
  'שלום': 'Peace',
  'שמחה': 'Joy',
  'שבת': 'Shabbat',
  'תורה': 'Torah',
  'תפלה': 'Prayer',
  'תשובה': 'Repentance',
  'עבודת-ה\'': 'Service of God',
  'תיקון': 'Rectification',
  'התבודדות': 'Hisbodidus',
  'התחזקות': 'Encouragement',
  'אנחה': 'Sigh',
  'ארץ ישראל': 'Land of Israel',
  'ארץ-ישראל': 'Land of Israel',

  // Sefer Hamidos topics (without nikud, since we strip it)
  'הכנסת אורחים': 'Hospitality',
  'אמת ואמונה': 'Truth and Faith',
  'דעת ותבונה': 'Knowledge and Understanding',
};

// Transliteration map for Hebrew consonants (no nikud)
const TRANSLITERATION = {
  'א': "'", 'ב': 'v', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z',
  'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'ch', 'ך': 'ch', 'ל': 'l', 'מ': 'm',
  'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': "'", 'פ': 'f', 'ף': 'f',
  'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
};

// --- Pattern matchers ---

// "אות-א" through "אות-תר" etc
function matchOsPattern(title) {
  const clean = stripNikud(title).trim();
  const m = clean.match(/^אות[\s-]+([א-ת]+)$/);
  if (m) {
    const num = hebrewToNumber(m[1]);
    if (num) return `Section ${num}`;
  }
  return null;
}

// "תורה א" or "תורה יב" etc
function matchTorahPattern(title) {
  const clean = stripNikud(title).trim();
  const m = clean.match(/^תורה[\s]+([א-ת]+)$/);
  if (m) {
    const num = hebrewToNumber(m[1]);
    if (num) return `Torah ${num}`;
  }
  return null;
}

// "מעשה א - description"
function matchMaasePattern(title) {
  const clean = stripNikud(title).trim();
  const m = clean.match(/^מעשה[\s]+([א-ת]+)/);
  if (m) {
    const num = hebrewToNumber(m[1]);
    if (num) return `Story ${num}`;
  }
  return null;
}

// Pure Hebrew letter (single or compound) used as numbering: א, ב, ... רצט
function matchPureHebrewNumber(title) {
  const clean = stripNikud(title).trim();
  // Must be ONLY Hebrew letters (1-4 chars) and nothing else
  if (/^[א-ת]{1,4}$/.test(clean)) {
    const num = hebrewToNumber(clean);
    if (num && num <= 1000) return num;
  }
  return null;
}

// "א-א", "א-ב" pattern (SSK style: section-subsection)
function matchSskPattern(title) {
  const clean = stripNikud(title).trim();
  const m = clean.match(/^([א-ת]{1,4})-([א-ת]{1,4})$/);
  if (m) {
    const sec = hebrewToNumber(m[1]);
    const sub = hebrewToNumber(m[2]);
    if (sec && sub) return `${sec}-${sub}`;
  }
  return null;
}

// "הלכות X" pattern
function matchHalachosPattern(title) {
  const clean = stripNikud(title).trim();
  if (clean.startsWith('הלכות ')) {
    return clean; // Will be handled by transliteration below
  }
  return null;
}

// Sections with trailing Hebrew letter number: "השכמת הבוקר ה", "נטילת ידים שחרית ג"
function matchTopicWithNumber(title) {
  const clean = stripNikud(title).trim();
  const m = clean.match(/^(.+?)\s+([א-ת]{1,3})$/);
  if (m) {
    const num = hebrewToNumber(m[2]);
    if (num && num <= 400) {
      return { topic: m[1].trim(), num };
    }
  }
  return null;
}

// For Mishna: "Brachot - פרק א - משנה א" - extract and translate Hebrew parts
function fixMishnaTitle(title) {
  // Already partially English like "Brachot - פרק א - משנה א"
  const m = title.match(/^(\w+)\s*-\s*פרק\s+([א-ת]+)\s*-\s*משנה\s+([א-ת]+)$/);
  if (m) {
    const perekNum = hebrewToNumber(m[2]);
    const mishnaNum = hebrewToNumber(m[3]);
    if (perekNum && mishnaNum) {
      return `${m[1]} - Chapter ${perekNum} - Mishna ${mishnaNum}`;
    }
  }
  return null;
}

// For Rambam: "Sefer HaMada (Knowledge) - הלכות יסודי התורה - פרק ראשון"
function fixRambamTitle(title) {
  if (!containsHebrew(title)) return null;
  // Pattern: English part - Hebrew הלכות ... - פרק ...
  const m = title.match(/^(.+?)\s*-\s*הלכות\s+(.+?)\s*-\s*פרק\s+(.+)$/);
  if (m) {
    const engPrefix = m[1].trim();
    const perekWord = stripNikud(m[3]).trim();
    const ordinalMap = {
      'ראשון': 1, 'שני': 2, 'שלישי': 3, 'רביעי': 4, 'חמישי': 5,
      'ששי': 6, 'שביעי': 7, 'שמיני': 8, 'תשיעי': 9, 'עשירי': 10,
      'אחד עשר': 11, 'שנים עשר': 12, 'שלשה עשר': 13, 'ארבעה עשר': 14,
      'חמשה עשר': 15, 'ששה עשר': 16, 'שבעה עשר': 17, 'שמונה עשר': 18,
      'תשעה עשר': 19, 'עשרים': 20, 'עשרים ואחד': 21, 'עשרים ושנים': 22,
      'עשרים ושלשה': 23, 'עשרים וארבעה': 24, 'עשרים וחמשה': 25,
      'עשרים וששה': 26, 'עשרים ושבעה': 27, 'עשרים ושמונה': 28,
      'עשרים ותשעה': 29, 'שלשים': 30,
    };
    const perekNum = ordinalMap[perekWord];
    // Also try Hebrew number letters
    const perekNum2 = perekNum || hebrewToNumber(perekWord);
    if (perekNum2) {
      return `${engPrefix} - Chapter ${perekNum2}`;
    }
  }
  return null;
}

// For Zohar: "Zohar Bereishit - דף טו ע''א" → already has English prefix, fix Hebrew suffix
function fixZoharTitle(title) {
  if (!containsHebrew(title)) return null;
  const m = title.match(/^(.+?)\s*-\s*דף\s+([א-ת]+)\s+ע''([אב])$/);
  if (m) {
    const engPrefix = m[1].trim();
    const dafNum = hebrewToNumber(m[2]);
    const side = m[3] === 'א' ? 'a' : 'b';
    if (dafNum) {
      return `${engPrefix} - Daf ${dafNum}${side}`;
    }
  }
  return null;
}

// --- Main title translation logic ---

function translateTitle(title, bookId, entryNumber) {
  if (!containsHebrew(title)) return null; // Already English

  const cleanTitle = stripNikud(title).trim();

  // 1. Check exact match in translations (with and without nikud)
  if (WORD_TRANSLATIONS[cleanTitle]) return WORD_TRANSLATIONS[cleanTitle];
  if (WORD_TRANSLATIONS[title.trim()]) return WORD_TRANSLATIONS[title.trim()];

  // 2. Check for Mishna pattern
  const mishnaFix = fixMishnaTitle(title);
  if (mishnaFix) return mishnaFix;

  // 3. Check for Rambam pattern
  const rambamFix = fixRambamTitle(title);
  if (rambamFix) return rambamFix;

  // 4. Check for Zohar pattern
  const zoharFix = fixZoharTitle(title);
  if (zoharFix) return zoharFix;

  // 5. Check "אות-X" pattern (Sichos, Hashtatfchus etc.)
  const osMatch = matchOsPattern(title);
  if (osMatch) return osMatch;

  // 6. Check "תורה X" pattern
  const torahMatch = matchTorahPattern(title);
  if (torahMatch) return torahMatch;

  // 7. Check "מעשה X" pattern (Sipurey Maasiyos)
  const maaseMatch = matchMaasePattern(title);
  if (maaseMatch) return maaseMatch;

  // 8. Check SSK "א-ב" pattern
  const sskMatch = matchSskPattern(title);
  if (sskMatch) return sskMatch;

  // 9. Check pure Hebrew number (single letter or compound)
  const pureNum = matchPureHebrewNumber(title);
  if (pureNum) {
    // Determine label based on book type
    if (bookId.includes('tefilos') || bookId.includes('tefilo')) return `Prayer ${pureNum}`;
    if (bookId.includes('alim-litrufa')) return `Letter ${pureNum}`;
    if (bookId.includes('ebay') || bookId.includes('nachal')) return `Letter ${pureNum}`;
    if (bookId.includes('moharnat') || bookId.includes('yemei')) return `Entry ${pureNum}`;
    if (bookId.includes('michtev') || bookId.includes('nosson-by') || bookId.includes('מכתבי')) return `Letter ${pureNum}`;
    if (bookId.includes('saba-tape')) return `Recording ${pureNum}`;
    if (bookId.includes('likutay-nanach')) return `Entry ${pureNum}`;
    return `Section ${pureNum}`;
  }

  // 10. Topic + Hebrew number suffix pattern: "השכמת הבוקר ה" → "Hashkamas HaBoker 5"
  const topicNum = matchTopicWithNumber(title);
  if (topicNum) {
    // Try translating the topic part
    const topicTranslated = WORD_TRANSLATIONS[topicNum.topic];
    if (topicTranslated) {
      return `${topicTranslated} ${topicNum.num}`;
    }
    // For LH topics, use "Halacha N" with the section number
    if (bookId.includes('likutay-halachos')) {
      return `Halacha ${entryNumber}`;
    }
    // Otherwise use section number
    return `Section ${entryNumber}`;
  }

  // 11. Starts with הקדמ (Introduction variants)
  if (cleanTitle.startsWith('הקדמ')) return 'Introduction';

  // 12. Starts with הסכמ (Approbation variants)
  if (cleanTitle.startsWith('הסכמ')) return 'Approbation';

  // 13. For Likutay Halachos entries starting with "הלכות"
  if (cleanTitle.startsWith('הלכות ')) {
    return `Halacha ${entryNumber}`;
  }

  // 14. Starts with "מכתבים" (letters section headers in Alim LiTrufa)
  if (cleanTitle.startsWith('מכתבים') || cleanTitle.startsWith('מכתבי')) {
    return `Letters - Section ${entryNumber}`;
  }

  // 15. "ערך X" pattern (Eitzos Yesharos entries)
  const erechMatch = cleanTitle.match(/^ערך\s+(.+)$/);
  if (erechMatch) {
    const topic = WORD_TRANSLATIONS[erechMatch[1].trim()];
    if (topic) return `Entry: ${topic}`;
    return `Entry ${entryNumber}`;
  }

  // 16. For books where entries are topic-based (Sefer Hamidos, Likutay Eitzos, etc.)
  // Check if the title (without nikud) is a known topic word
  const strippedLookup = WORD_TRANSLATIONS[cleanTitle];
  if (strippedLookup) return strippedLookup;

  // 17. For Chayey Moharan specific sections
  if (bookId === 'chayey-moharan') {
    const cmSections = {
      1: 'Conversations and Stories Relating to Each Torah and Tale',
      2: 'Sichos HaRan',
      3: 'Conversations Related to the Stories',
      4: 'Conversations Related to Sichos HaRan',
      5: 'Conversations Related to Sefer HaMidos',
      6: 'Related to the Conversations About Each Torah',
      7: 'New Stories',
      8: 'His Birthplace, Residence, Travels and Wanderings',
      9: 'His Drawing Close to God from Youth',
      10: 'His Journey to the Land of Israel',
      11: 'His Greatness',
      12: 'His Illness and Passing',
    };
    if (cmSections[entryNumber]) return cmSections[entryNumber];
  }

  // 18. Fallback: use "Section N" or "Chapter N" based on book type
  if (bookId.includes('likutay-halachos')) return `Halacha ${entryNumber}`;
  if (bookId.includes('chumash-lh')) return `Section ${entryNumber}`;
  if (bookId.includes('parparos')) return `Section ${entryNumber}`;
  if (bookId.includes('biur')) return `Section ${entryNumber}`;
  if (bookId.includes('chochma')) return `Section ${entryNumber}`;
  if (bookId.includes('kokhvei')) return `Section ${entryNumber}`;
  if (bookId.includes('siach-sarfei')) return `Section ${entryNumber}`;
  if (bookId.includes('rimzei')) return `Section ${entryNumber}`;

  return `Section ${entryNumber}`;
}

// --- Recursively find all index.json files ---
function findIndexFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findIndexFiles(fullPath));
    } else if (entry.name === 'index.json') {
      results.push(fullPath);
    }
  }
  return results;
}

// --- Main ---
function main() {
  const indexFiles = findIndexFiles(READER_DIR);
  console.log(`Found ${indexFiles.length} index.json files\n`);

  let totalFixed = 0;
  let totalSkipped = 0;
  let totalAlreadyEnglish = 0;
  let filesModified = 0;
  const fixedDetails = [];

  for (const filePath of indexFiles) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.log(`  SKIP (invalid JSON): ${filePath}`);
      continue;
    }

    const bookId = data.book || data.bookId || '';
    const entries = data.torahs || data.items || [];
    const introEntries = data.introSections || [];
    let fileChanged = false;

    // Process both main entries and intro sections
    const allEntries = [...introEntries, ...entries];

    for (const entry of allEntries) {
      const title = entry.title;
      if (!title) continue;

      if (!containsHebrew(title)) {
        totalAlreadyEnglish++;
        continue;
      }

      const entryNum = entry.number || entry.displayNumber || 0;
      const englishTitle = translateTitle(title, bookId, typeof entryNum === 'number' ? entryNum : parseInt(entryNum) || 0);

      if (englishTitle) {
        // Preserve existing hebrewTitle if it has nikud, otherwise use current title
        if (!entry.hebrewTitle || !containsHebrew(entry.hebrewTitle)) {
          entry.hebrewTitle = title;
        }
        // Only update if the hebrewTitle doesn't already have better content
        // (e.g., nikud version). If title == hebrewTitle (both Hebrew, no nikud), keep hebrewTitle as-is.

        entry.title = englishTitle;
        totalFixed++;
        fileChanged = true;

        // Track some details
        if (fixedDetails.length < 30) {
          fixedDetails.push({ bookId, from: title, to: englishTitle });
        }
      } else {
        totalSkipped++;
      }
    }

    if (fileChanged) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
      filesModified++;
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Files scanned:        ${indexFiles.length}`);
  console.log(`Files modified:       ${filesModified}`);
  console.log(`Titles fixed:         ${totalFixed}`);
  console.log(`Already English:      ${totalAlreadyEnglish}`);
  console.log(`Skipped (no match):   ${totalSkipped}`);

  console.log(`\n=== SAMPLE FIXES ===`);
  for (const d of fixedDetails) {
    console.log(`  [${d.bookId}] "${d.from}" => "${d.to}"`);
  }
}

main();
