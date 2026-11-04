import { civilDate, moveDay, todayDate, toGregorian } from '../../public/today-breslov-calendar.mjs';

// Use the same Israel/sunset boundary as Today and Daily Study. Offset the
// resulting civil date, not a browser-local Date across a DST transition.
export function calendarDateISO(date = new Date(), offset = 0) {
  if (!Number.isInteger(offset)) throw new TypeError('Invalid day offset');
  return moveDay(todayDate(date).iso, offset);
}

function occurrence(year, month, day) {
  // Preserve the existing first-Adar interpretation of unspecified Adar;
  // explicitly named Adar II remains absent in a common year.
  return toGregorian(year, month, day) ||
    (month === 'Adar' ? toGregorian(year, 'Adar I', day) : null);
}

export function hebrewDaysUntil(year, fromMonth, fromDay, toMonth, toDay) {
  if (!Number.isInteger(year)) return 999;
  const from = occurrence(year, fromMonth, fromDay);
  if (!from) return 999;
  // Explicit leap-month dates can next occur three Hebrew years later.
  for (let targetYear = year; targetYear <= year + 3; targetYear++) {
    const to = occurrence(targetYear, toMonth, toDay);
    if (to && to > from) return (+civilDate(to) - +civilDate(from)) / 86400000;
  }
  return 999;
}
