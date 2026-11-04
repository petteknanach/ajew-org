import { civilDate, fromGregorian, toGregorian, moveDay, todayDate, hebrewNumber, HEBREW_MONTHS } from './today-breslov-calendar.mjs?v=20261021-1';

const DAY = 86400000;
const years = new Map();
const monthNumbers = { Tishrei: 1, Cheshvan: 2, Kislev: 3, Tevet: 4, Shvat: 5, Adar: 6, 'Adar I': 6, 'Adar II': 6, Nisan: 7, Iyyar: 8, Sivan: 9, Tamuz: 10, Av: 11, Elul: 12 };

export function studyYear(iso) {
  const hebrew = fromGregorian(iso);
  let year = years.get(hebrew.year);
  if (!year) {
    const start = toGregorian(hebrew.year, 'Tishrei', 1);
    const next = toGregorian(hebrew.year + 1, 'Tishrei', 1);
    if (!start || !next) throw new Error('Hebrew year unavailable');
    const days = (+civilDate(next) - +civilDate(start)) / DAY;
    if (![353, 354, 355, 383, 384, 385].includes(days)) throw new Error('Invalid Hebrew year length');
    year = { year: hebrew.year, start, days };
    years.set(hebrew.year, year);
  }
  return { ...year, iso, day: (+civilDate(iso) - +civilDate(year.start)) / DAY + 1, hebrew };
}

export function todayStudy(now = new Date()) {
  // Use the site's existing sunset-aware Israel calendar, not elapsed local milliseconds.
  return studyYear(todayDate(now).iso);
}

export function studyDate(year, day) {
  if (!Number.isInteger(day) || day < 1 || day > year.days) throw new RangeError('Invalid study day');
  return studyYear(moveDay(year.start, day - 1));
}

export function displayStudyDate(date) {
  return `${hebrewNumber(date.hebrew.day)} ${HEBREW_MONTHS[date.hebrew.month]} ${hebrewNumber(date.year)}`;
}

export function calendarMonthDay(date) {
  // The existing source maps have one unspecified Adar, retained in both leap months.
  return { month: monthNumbers[date.hebrew.month], day: date.hebrew.day };
}

export function rescheduleBook(book, days) {
  if (!Number.isInteger(days) || days < 1) throw new RangeError('Invalid schedule length');
  const seen = new Set();
  const sections = [];
  // Preserve the exact ordered readings and canonical URLs; remove only repeated daily allocations.
  for (const portion of book.portions) {
    for (const section of portion.sections) {
      if (!seen.has(section.url)) {
        seen.add(section.url);
        sections.push(section);
      }
    }
  }
  const portions = Array.from({ length: days }, (_, day) => ({
    day: day + 1,
    sections: sections.length <= days
      ? (sections.length ? [sections[Math.floor(day * sections.length / days)]] : [])
      : sections.slice(Math.floor(day * sections.length / days), Math.floor((day + 1) * sections.length / days))
  }));
  return { ...book, dailySections: Math.ceil(sections.length / days), portions };
}

export function reschedule(source, days) {
  return {
    ...source,
    totalDays: days,
    books: source.books.map(book => rescheduleBook(book, days)),
    bonus: source.bonus ? rescheduleBook(source.bonus, days) : null
  };
}

export { moveDay };
