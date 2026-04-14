import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = join(import.meta.dirname, '..', 'public', 'reader', 'likutay-tefilos', 'part-1');
const chokPath = join(import.meta.dirname, '..', 'public', 'chok-breslov.json');

// Hebrew month names -> month index (1=Tishrei, 12=Elul)
// Stripped (no nikud) versions for matching
// Sorted by length descending so longer matches take priority (e.g. "מנחם אב" before "אב")
const monthMap = [
  { stripped: 'מנחם אב', month: 11 },
  { stripped: 'מרחשון', month: 2 },
  { stripped: 'תשרי', month: 1 },
  { stripped: 'חשון', month: 2 },
  { stripped: 'כסלו', month: 3 },
  { stripped: 'טבת', month: 4 },
  { stripped: 'שבט', month: 5 },
  { stripped: 'אדר', month: 6 },
  { stripped: 'ניסן', month: 7 },
  { stripped: 'אייר', month: 8 },
  { stripped: 'סיון', month: 9 },
  { stripped: 'תמוז', month: 10 },
  { stripped: 'אלול', month: 12 },
  { stripped: 'אב', month: 11 },
];

// Month names for display
const monthNames = {
  1: 'Tishrei', 2: 'Cheshvan', 3: 'Kislev', 4: 'Teves',
  5: 'Shevat', 6: 'Adar', 7: 'Nisan', 8: 'Iyar',
  9: 'Sivan', 10: 'Tammuz', 11: 'Av', 12: 'Elul',
};

// Days per month in a regular (non-leap) Hebrew year (354 days)
const daysInMonth = {
  1: 30,  // Tishrei
  2: 29,  // Cheshvan
  3: 30,  // Kislev
  4: 29,  // Teves
  5: 30,  // Shevat
  6: 29,  // Adar
  7: 30,  // Nisan
  8: 29,  // Iyar
  9: 30,  // Sivan
  10: 29, // Tammuz
  11: 30, // Av
  12: 29, // Elul
};

// Hebrew number parsing (gematria)
const hebrewNums = new Map([
  ['א', 1], ['ב', 2], ['ג', 3], ['ד', 4], ['ה', 5], ['ו', 6], ['ז', 7], ['ח', 8], ['ט', 9],
  ['י', 10], ['יא', 11], ['יב', 12], ['יג', 13], ['יד', 14], ['טו', 15], ['טז', 16],
  ['יז', 17], ['יח', 18], ['יט', 19], ['כ', 20], ['כא', 21], ['כב', 22], ['כג', 23],
  ['כד', 24], ['כה', 25], ['כו', 26], ['כז', 27], ['כח', 28], ['כט', 29], ['ל', 30],
]);

function stripNikud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function parseHebrewDay(str) {
  const s = stripNikud(str).replace(/[׳'"״]/g, '').trim();
  return hebrewNums.get(s) ?? null;
}

/**
 * Parse a date segment like "א תִּשְׁרֵי" or "כד טֵבֵת".
 * Returns { day, month } or null.
 *
 * IGNORES "X לחדש" patterns - those are day-of-month markers
 * for a separate reading system, not the annual Chok calendar.
 */
function parseDateSegment(text) {
  const stripped = stripNikud(text).trim();

  // Skip long segments (prayer text, not date markers)
  if (stripped.length > 40) return null;

  // Skip "X לחדש" patterns entirely
  if (stripped.includes('לחדש')) return null;

  // Skip lines that are special headers (like "לפורים", "לז' אדר הילולא...")
  // but DO parse if it's just "day month"

  // Try to find a month name in the text
  for (const entry of monthMap) {
    const idx = stripped.indexOf(entry.stripped);
    if (idx < 0) continue;

    // Day part is everything before the month name
    if (idx === 0) continue; // no day before month

    const dayPart = stripped.substring(0, idx).trim();

    // Make sure the day part is ONLY a Hebrew number (not additional text)
    // This filters out things like "לז' אדר הילולא דמשה רבנו ע"ה"
    const cleanDay = dayPart.replace(/^ל/, ''); // strip leading ל (for "לז' אדר")

    // If the day part (after stripping leading ל) has spaces, it's not a simple date
    if (cleanDay.includes(' ')) continue;

    const day = parseHebrewDay(dayPart);
    if (day) {
      // Validate day is within the month's range
      if (day <= (daysInMonth[entry.month] || 30)) {
        return { day, month: entry.month };
      }
    }
  }

  return null;
}

// Convert month+day to day-of-year (1-based, Tishrei 1 = day 1)
function toDayOfYear(month, day) {
  let total = 0;
  for (let m = 1; m < month; m++) {
    total += daysInMonth[m];
  }
  return total + day;
}

// ---- MAIN ----

// 1. Extract dates from all prayer files
const prayerDates = new Map(); // prayerNum -> [{day, month, dayOfYear}]

const files = readdirSync(dir).filter(f => /^prayer-\d+\.json$/.test(f));
for (const file of files) {
  const num = parseInt(file.match(/prayer-(\d+)/)[1]);
  if (num === 0) continue; // skip hakdamah

  const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const dates = [];

  // Check segments for date markers (only in early segments)
  for (let i = 0; i < Math.min(data.segments.length, 12); i++) {
    const he = data.segments[i].he;
    if (!he || he.length > 100) continue;

    const date = parseDateSegment(he);
    if (date) {
      date.dayOfYear = toDayOfYear(date.month, date.day);
      dates.push(date);
    }
  }

  if (dates.length > 0) {
    prayerDates.set(num, dates);
  }
}

// 2. Build dayOfYear -> prayerNum mapping
const dayToPrayer = new Map();

const sortedPrayers = [...prayerDates.entries()].sort((a, b) => a[0] - b[0]);

// Debug output
console.log("=== Extracted dates (specific month+day only) ===");
for (const [prayer, dates] of sortedPrayers) {
  const strs = dates.map(d => `${d.day} ${monthNames[d.month]} (day ${d.dayOfYear})`);
  console.log(`Prayer ${prayer}: ${strs.join(', ')}`);
}
console.log(`\nPrayers with dates: ${prayerDates.size}`);

// Assign date-based entries (first prayer to claim a day wins)
for (const [prayer, dates] of sortedPrayers) {
  for (const d of dates) {
    if (!dayToPrayer.has(d.dayOfYear)) {
      dayToPrayer.set(d.dayOfYear, prayer);
    }
  }
}

console.log(`Days assigned by date: ${dayToPrayer.size}`);

// 3. Fill remaining days (354 total) with prayers that have no dates, sequentially
const totalDays = 354;
const assignedDays = new Set(dayToPrayer.keys());
const unassignedDays = [];
for (let d = 1; d <= totalDays; d++) {
  if (!assignedDays.has(d)) {
    unassignedDays.push(d);
  }
}

// Prayers without dates
const prayersWithDates = new Set(prayerDates.keys());
const allPrayerNums = files
  .map(f => parseInt(f.match(/prayer-(\d+)/)[1]))
  .filter(n => n > 0)
  .sort((a, b) => a - b);
const prayersWithoutDates = allPrayerNums.filter(n => !prayersWithDates.has(n));

console.log(`\nPrayers without dates: ${prayersWithoutDates.length} -> ${prayersWithoutDates.join(', ')}`);
console.log(`Unassigned days: ${unassignedDays.length}`);

// Distribute dateless prayers across remaining unassigned days
// Each dateless prayer gets floor(remaining/count) days, with extras distributed round-robin
if (prayersWithoutDates.length > 0 && unassignedDays.length > 0) {
  let pIdx = 0;
  for (const day of unassignedDays) {
    dayToPrayer.set(day, prayersWithoutDates[pIdx % prayersWithoutDates.length]);
    pIdx++;
  }
}

// 4. Read existing chok-breslov.json and update the likutay-tefilos portions
const chok = JSON.parse(readFileSync(chokPath, 'utf8'));

const tefilosBook = chok.books.find(b => b.id === 'likutay-tefilos');
if (!tefilosBook) {
  console.error("Could not find likutay-tefilos book in chok-breslov.json");
  process.exit(1);
}

// Build new portions array
const newPortions = [];
for (let day = 1; day <= totalDays; day++) {
  const prayer = dayToPrayer.get(day);
  if (prayer !== undefined) {
    newPortions.push({
      day,
      sections: [
        {
          part: 1,
          num: prayer,
          url: `/reader/likutay-tefilos/1/${prayer}`,
        },
      ],
    });
  }
}

console.log(`\nNew portions count: ${newPortions.length}`);

// Verify day coverage
const coveredDays = new Set(newPortions.map(p => p.day));
const missingDays = [];
for (let d = 1; d <= totalDays; d++) {
  if (!coveredDays.has(d)) missingDays.push(d);
}
if (missingDays.length > 0) {
  console.log(`WARNING: Missing days: ${missingDays.join(', ')}`);
} else {
  console.log("All 354 days covered.");
}

// Replace the portions
tefilosBook.portions = newPortions;

// Write updated chok
writeFileSync(chokPath, JSON.stringify(chok, null, 2) + '\n', 'utf8');
console.log("\nUpdated chok-breslov.json successfully!");
