/**
 * Build Chok Breslov (חוק ברסלב) — Daily Study Schedule
 *
 * Divides the Breslov library into 354 daily portions (Jewish year length).
 * Reads all book JSONs from public/reader/ and creates public/chok-breslov.json.
 */

const fs = require('fs');
const path = require('path');

const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'chok-breslov.json');
const DAYS_IN_YEAR = 354;

// Hebrew month names for date scanning in Ebay HaNachal
const HEBREW_MONTHS = [
  { name: 'תשרי', month: 1 },
  { name: 'חשון', month: 2 }, { name: 'חשוון', month: 2 }, { name: 'מרחשון', month: 2 },
  { name: 'כסלו', month: 3 }, { name: 'כסליו', month: 3 },
  { name: 'טבת', month: 4 },
  { name: 'שבט', month: 5 }, { name: 'שבט', month: 5 },
  { name: 'אדר', month: 6 },
  { name: 'ניסן', month: 7 },
  { name: 'אייר', month: 8 },
  { name: 'סיון', month: 9 }, { name: 'סיוון', month: 9 },
  { name: 'תמוז', month: 10 },
  { name: 'אב', month: 11 }, { name: 'מנחם אב', month: 11 },
  { name: 'אלול', month: 12 },
];

// Days in each Hebrew month (regular year)
const MONTH_DAYS = {
  1: 30, 2: 29, 3: 30, 4: 29, 5: 30, 6: 29,
  7: 30, 8: 29, 9: 30, 10: 29, 11: 30, 12: 29
};

// Hebrew gematria day parsing
const HEBREW_NUMS = {
  'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
  'י': 10, 'יא': 11, 'יב': 12, 'יג': 13, 'יד': 14, 'טו': 15, 'טז': 16,
  'יז': 17, 'יח': 18, 'יט': 19, 'כ': 20, 'כא': 21, 'כב': 22, 'כג': 23,
  'כד': 24, 'כה': 25, 'כו': 26, 'כז': 27, 'כח': 28, 'כט': 29, 'ל': 30,
  "כ'": 20, "ל'": 30,
};

// Also handle numeric digits
function parseHebrewDay(str) {
  str = str.replace(/['״׳]/g, '').trim();
  // Try direct gematria lookup
  if (HEBREW_NUMS[str] !== undefined) return HEBREW_NUMS[str];
  // Try parsing as regular number
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 30) return num;
  return null;
}

/**
 * Book definitions for the Chok Breslov schedule
 * Only Breslov-specific books (not Tanach, Talmud, etc.)
 */
const BOOK_DEFS = [
  {
    id: 'likutay-moharan',
    title: 'Likutay Moharan',
    hebrewTitle: 'ליקוטי מוהר"ן',
    parts: [
      { part: 1, dir: 'likutay-moharan/part-1', prefix: 'torah-' },
      { part: 2, dir: 'likutay-moharan/part-2', prefix: 'torah-' },
    ],
    urlTemplate: (part, num) => `/reader/likutay-moharan/${part}/${num}`,
    sectionLabel: 'Torah',
  },
  {
    id: 'likutay-halachos',
    title: 'Likutay Halachos',
    hebrewTitle: 'ליקוטי הלכות',
    parts: [
      { part: 1, dir: 'likutay-halachos/part-1', prefix: 'halacha-' },
      { part: 2, dir: 'likutay-halachos/part-2', prefix: 'halacha-' },
      { part: 3, dir: 'likutay-halachos/part-3', prefix: 'halacha-' },
      { part: 4, dir: 'likutay-halachos/part-4', prefix: 'halacha-' },
      { part: 5, dir: 'likutay-halachos/part-5', prefix: 'halacha-' },
      { part: 6, dir: 'likutay-halachos/part-6', prefix: 'halacha-' },
      { part: 7, dir: 'likutay-halachos/part-7', prefix: 'halacha-' },
      { part: 8, dir: 'likutay-halachos/part-8', prefix: 'halacha-' },
    ],
    urlTemplate: (part, num) => `/reader/likutay-halachos/${part}/${num}`,
    sectionLabel: 'Halacha',
  },
  {
    id: 'kitzur-likutay-moharan',
    title: 'Kitzur Likutay Moharan',
    hebrewTitle: 'קיצור ליקוטי מוהר"ן',
    parts: [
      { part: 1, dir: 'kitzur-likutay-moharan/part-1', prefix: 'torah-' },
      { part: 2, dir: 'kitzur-likutay-moharan/part-2', prefix: 'torah-' },
    ],
    urlTemplate: (part, num) => `/reader/kitzur-likutay-moharan/${part}/${num}`,
    sectionLabel: 'Torah',
  },
  {
    id: 'sefer-hamidos',
    title: 'Sefer HaMidos',
    hebrewTitle: 'ספר המידות',
    parts: [
      { part: 1, dir: 'sefer-hamidos', prefix: 'topic-' },
    ],
    urlTemplate: (part, num) => `/reader/sefer-hamidos/1/${num}`,
    sectionLabel: 'Topic',
  },
  {
    id: 'sipurey-maasiyos',
    title: 'Sipurey Maasiyos',
    hebrewTitle: 'סיפורי מעשיות',
    parts: [
      { part: 1, dir: 'sipurey-maasiyos', prefix: 'story-' },
    ],
    urlTemplate: (part, num) => `/reader/sipurey-maasiyos/1/${num}`,
    sectionLabel: 'Story',
  },
  {
    id: 'sichos-haran',
    title: 'Sichos HaRan',
    hebrewTitle: 'שיחות הר"ן',
    parts: [
      { part: 1, dir: 'sichos-haran', prefix: 'sicha-' },
    ],
    urlTemplate: (part, num) => `/reader/sichos-haran/1/${num}`,
    sectionLabel: 'Sicha',
  },
  {
    id: 'shivchay-haran',
    title: 'Shivchay HaRan',
    hebrewTitle: 'שבחי הר"ן',
    parts: [
      { part: 1, dir: 'shivchay-haran', prefix: 'section-' },
    ],
    urlTemplate: (part, num) => `/reader/shivchay-haran/1/${num}`,
    sectionLabel: 'Section',
  },
  {
    id: 'chayey-moharan',
    title: 'Chayey Moharan',
    hebrewTitle: 'חיי מוהר"ן',
    parts: [
      { part: 1, dir: 'chayey-moharan', prefix: 'chapter-' },
    ],
    urlTemplate: (part, num) => `/reader/chayey-moharan/1/${num}`,
    sectionLabel: 'Chapter',
  },
  {
    id: 'likutay-eitzos',
    title: 'Likutay Eitzos',
    hebrewTitle: 'ליקוטי עצות',
    parts: [
      { part: 1, dir: 'likutay-eitzos', prefix: 'topic-' },
    ],
    urlTemplate: (part, num) => `/reader/likutay-eitzos/1/${num}`,
    sectionLabel: 'Topic',
  },
  {
    id: 'hashtatfchus-hanefesh',
    title: 'Hashtatfchus HaNefesh',
    hebrewTitle: 'השתפכות הנפש',
    parts: [
      { part: 1, dir: 'hashtatfchus-hanefesh', prefix: 'section-' },
    ],
    urlTemplate: (part, num) => `/reader/hashtatfchus-hanefesh/1/${num}`,
    sectionLabel: 'Section',
  },
  {
    id: 'meshivas-nefesh',
    title: 'Meshivas Nefesh',
    hebrewTitle: 'משיבת נפש',
    parts: [
      { part: 1, dir: 'meshivas-nefesh', prefix: 'section-' },
    ],
    urlTemplate: (part, num) => `/reader/meshivas-nefesh/1/${num}`,
    sectionLabel: 'Section',
  },
  {
    id: 'likutay-tefilos',
    title: 'Likutay Tefilos',
    hebrewTitle: 'ליקוטי תפילות',
    parts: [
      { part: 1, dir: 'likutay-tefilos/part-1', prefix: 'prayer-', startAt: 1 },
      { part: 2, dir: 'likutay-tefilos/part-2', prefix: 'prayer-' },
    ],
    urlTemplate: (part, num) => `/reader/likutay-tefilos/${part}/${num}`,
    sectionLabel: 'Prayer',
  },
  {
    id: 'shemos-hatzadikim',
    title: 'Shemos HaTzadikim',
    hebrewTitle: 'שמות הצדיקים',
    parts: [
      { part: 1, dir: 'shemos-hatzadikim', prefix: 'section-' },
    ],
    urlTemplate: (part, num) => `/reader/shemos-hatzadikim/1/${num}`,
    sectionLabel: 'Section',
  },
  {
    id: 'ebay-hanachal',
    title: 'Ebay HaNachal',
    hebrewTitle: 'אבי הנחל',
    parts: [
      { part: 1, dir: 'ebay-hanachal/part-1', prefix: 'letter-' },
      { part: 2, dir: 'ebay-hanachal/part-2', prefix: 'letter-' },
    ],
    urlTemplate: (part, num) => `/reader/ebay-hanachal/${part}/${num}`,
    sectionLabel: 'Letter',
  },
];

// Bonus book
const BONUS_BOOK = {
  id: 'alim-litrufa',
  title: 'Alim LiTrufa',
  hebrewTitle: 'עלים לתרופה',
  parts: [
    { part: 1, dir: 'alim-litrufa/part-1', prefix: 'letter-' },
    { part: 2, dir: 'alim-litrufa/part-2', prefix: 'letter-' },
    { part: 3, dir: 'alim-litrufa/part-3', prefix: 'letter-' },
    { part: 4, dir: 'alim-litrufa/part-4', prefix: 'letter-' },
    { part: 5, dir: 'alim-litrufa/part-5', prefix: 'letter-' },
    { part: 6, dir: 'alim-litrufa/part-6', prefix: 'letter-' },
  ],
  urlTemplate: (part, num) => `/reader/alim-litrufa/${part}/${num}`,
  sectionLabel: 'Letter',
};

/**
 * Count sections in a directory matching prefix pattern
 */
function countSections(dir, prefix) {
  const fullDir = path.join(READER_DIR, dir);
  if (!fs.existsSync(fullDir)) return [];
  const files = fs.readdirSync(fullDir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .map(f => parseInt(f.replace(prefix, '').replace('.json', ''), 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
  return files;
}

/**
 * Get all sections for a book across all parts
 * Returns array of { part, num }
 */
function getAllSections(bookDef) {
  const sections = [];
  for (const partDef of bookDef.parts) {
    const nums = countSections(partDef.dir, partDef.prefix);
    const startAt = partDef.startAt || 0;
    for (const num of nums) {
      if (num >= startAt) {
        sections.push({ part: partDef.part, num });
      }
    }
  }
  return sections;
}

/**
 * Distribute sections across 354 days evenly
 */
function distributeSections(sections, days) {
  if (sections.length === 0) return [];

  const portions = [];
  const totalSections = sections.length;

  if (totalSections <= days) {
    // Fewer sections than days — some days share a section, some get one
    // Spread them: each section gets ceil(days/total) days
    let dayIdx = 0;
    for (let i = 0; i < days; i++) {
      const sectionIdx = Math.floor((i * totalSections) / days);
      if (!portions[i]) portions[i] = [];
      portions[i].push(sections[sectionIdx]);
    }
  } else {
    // More sections than days — each day gets multiple sections
    for (let day = 0; day < days; day++) {
      const startIdx = Math.floor((day * totalSections) / days);
      const endIdx = Math.floor(((day + 1) * totalSections) / days);
      portions[day] = sections.slice(startIdx, endIdx);
    }
  }

  return portions;
}

/**
 * Try to extract a Hebrew date from the first segment of an EH letter
 */
function extractHebrewDate(letterFile) {
  try {
    const data = JSON.parse(fs.readFileSync(letterFile, 'utf8'));
    if (!data.segments || data.segments.length === 0) return null;

    const firstHe = data.segments[0].he || '';

    // Look for day + month pattern in first segment
    for (const monthDef of HEBREW_MONTHS) {
      const monthIdx = firstHe.indexOf(monthDef.name);
      if (monthIdx === -1) continue;

      // Try to find day number before the month name
      // Look at text before the month name (last ~15 chars)
      const beforeMonth = firstHe.substring(Math.max(0, monthIdx - 15), monthIdx).trim();

      // Try different patterns:
      // "כ"ז אדר" or "ט' שבט" or "ג שבט" etc.
      const parts = beforeMonth.split(/[,،\s]+/).filter(Boolean);

      for (let i = parts.length - 1; i >= 0; i--) {
        let candidate = parts[i].replace(/['"״׳,]/g, '').trim();
        // Handle compound like כ"ז → כז
        candidate = candidate.replace(/["״]/g, '');
        const day = parseHebrewDay(candidate);
        if (day !== null && day >= 1 && day <= 30) {
          return { month: monthDef.month, day, monthName: monthDef.name };
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Convert Hebrew month+day to day-of-year (1 Tishrei = day 1)
 */
function hebrewDateToDayOfYear(month, day) {
  let dayOfYear = 0;
  for (let m = 1; m < month; m++) {
    dayOfYear += MONTH_DAYS[m] || 30;
  }
  dayOfYear += day;
  return dayOfYear;
}

/**
 * Convert day-of-year back to Hebrew date string
 */
function dayOfYearToHebrewDate(dayOfYear) {
  const monthNames = ['', 'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'];
  const hebrewDayLetters = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];

  let remaining = dayOfYear;
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = MONTH_DAYS[m] || 30;
    if (remaining <= daysInMonth) {
      return {
        display: `${hebrewDayLetters[remaining]} ${monthNames[m]}`,
        month: m,
        day: remaining,
        monthName: monthNames[m],
      };
    }
    remaining -= daysInMonth;
  }
  return { display: `${dayOfYear}`, month: 12, day: 29 };
}

// ======= MAIN =======

function main() {
  console.log('Building Chok Breslov daily study schedule...\n');

  const result = {
    totalDays: DAYS_IN_YEAR,
    generatedAt: new Date().toISOString(),
    books: [],
    bonus: null,
    dateLetters: [],
  };

  // Process Ebay HaNachal date-based letters
  console.log('Scanning Ebay HaNachal letters for dates...');
  const ehDateMap = new Map(); // dayOfYear -> [{part, num, date info}]
  const ehNonDated = []; // letters without dates go into regular cycle

  const ehDef = BOOK_DEFS.find(b => b.id === 'ebay-hanachal');
  const allEhSections = getAllSections(ehDef);

  for (const section of allEhSections) {
    const partDir = ehDef.parts.find(p => p.part === section.part);
    const filePath = path.join(READER_DIR, partDir.dir, `letter-${section.num}.json`);
    const dateInfo = extractHebrewDate(filePath);

    if (dateInfo) {
      const doy = hebrewDateToDayOfYear(dateInfo.month, dateInfo.day);
      if (!ehDateMap.has(doy)) ehDateMap.set(doy, []);
      ehDateMap.get(doy).push({
        part: section.part,
        num: section.num,
        url: ehDef.urlTemplate(section.part, section.num),
        month: dateInfo.month,
        day: dateInfo.day,
        monthName: dateInfo.monthName,
      });
    } else {
      ehNonDated.push(section);
    }
  }

  console.log(`  Found ${ehDateMap.size} unique dates from ${allEhSections.length - ehNonDated.length} letters`);
  console.log(`  ${ehNonDated.length} letters without dates go into daily cycle\n`);

  // Build dateLetters array
  const dateLettersArr = [];
  for (const [doy, letters] of [...ehDateMap.entries()].sort((a, b) => a[0] - b[0])) {
    const dateInfo = dayOfYearToHebrewDate(doy);
    dateLettersArr.push({
      dayOfYear: doy,
      hebrewDate: dateInfo.display,
      month: dateInfo.month,
      day: dateInfo.day,
      letters: letters.map(l => ({
        book: 'ebay-hanachal',
        part: l.part,
        num: l.num,
        url: l.url,
      })),
    });
  }
  result.dateLetters = dateLettersArr;

  // Process each book
  for (const bookDef of BOOK_DEFS) {
    let sections;

    if (bookDef.id === 'ebay-hanachal') {
      // Use only non-dated letters for the daily cycle
      sections = ehNonDated;
    } else {
      sections = getAllSections(bookDef);
    }

    console.log(`${bookDef.title}: ${sections.length} sections`);

    const portions = distributeSections(sections, DAYS_IN_YEAR);

    const bookEntry = {
      id: bookDef.id,
      title: bookDef.title,
      hebrewTitle: bookDef.hebrewTitle,
      sectionLabel: bookDef.sectionLabel,
      totalSections: bookDef.id === 'ebay-hanachal' ? allEhSections.length : sections.length,
      dailySections: sections.length <= DAYS_IN_YEAR ? 1 : Math.ceil(sections.length / DAYS_IN_YEAR),
      portions: [],
    };

    for (let day = 0; day < DAYS_IN_YEAR; day++) {
      const daySections = portions[day] || [];
      bookEntry.portions.push({
        day: day + 1,
        sections: daySections.map(s => ({
          part: s.part,
          num: s.num,
          url: bookDef.urlTemplate(s.part, s.num),
        })),
      });
    }

    result.books.push(bookEntry);
  }

  // Process bonus book (Alim LiTrufa)
  {
    const sections = getAllSections(BONUS_BOOK);
    console.log(`${BONUS_BOOK.title} (Bonus): ${sections.length} sections`);

    const portions = distributeSections(sections, DAYS_IN_YEAR);

    result.bonus = {
      id: BONUS_BOOK.id,
      title: BONUS_BOOK.title,
      hebrewTitle: BONUS_BOOK.hebrewTitle,
      sectionLabel: BONUS_BOOK.sectionLabel,
      totalSections: sections.length,
      dailySections: sections.length <= DAYS_IN_YEAR ? 1 : Math.ceil(sections.length / DAYS_IN_YEAR),
      portions: [],
    };

    for (let day = 0; day < DAYS_IN_YEAR; day++) {
      const daySections = portions[day] || [];
      result.bonus.portions.push({
        day: day + 1,
        sections: daySections.map(s => ({
          part: s.part,
          num: s.num,
          url: BONUS_BOOK.urlTemplate(s.part, s.num),
        })),
      });
    }
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');

  console.log(`\nChok Breslov schedule written to ${OUTPUT_FILE}`);
  console.log(`Total books: ${result.books.length} + 1 bonus`);
  console.log(`Date-based letters: ${result.dateLetters.length} dates`);

  // Summary
  console.log('\n=== Summary ===');
  for (const book of result.books) {
    const day1 = book.portions[0];
    const label = day1.sections.length > 0
      ? `Day 1: ${day1.sections.map(s => `${book.sectionLabel} ${s.num}`).join(', ')}`
      : 'Day 1: (none)';
    console.log(`  ${book.title}: ${book.totalSections} total, ~${book.dailySections}/day — ${label}`);
  }
  if (result.bonus) {
    console.log(`  ${result.bonus.title} (Bonus): ${result.bonus.totalSections} total, ~${result.bonus.dailySections}/day`);
  }
}

main();
