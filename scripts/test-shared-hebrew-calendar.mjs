import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { calendarDateISO, hebrewDaysUntil } from '../src/lib/shared-hebrew-calendar.mjs';
import { civilDate, fromGregorian, moveDay, toGregorian } from '../public/today-breslov-calendar.mjs';

const source = await readFile(new URL('../src/components/CompactYahrzeit.astro', import.meta.url), 'utf8');

test('actual variable months, common Adar and same-month annual wrap replace the three reproduced errors', () => {
  for (const [year, fromMonth, fromDay, toMonth, toDay, expected] of [
    [5787, 'Cheshvan', 24, 'Kislev', 4, 10],
    [5786, 'Adar', 20, 'Nisan', 1, 10],
    [5786, 'Tishrei', 20, 'Tishrei', 18, 352],
    [5787, 'Adar I', 30, 'Adar II', 1, 1],
  ]) assert.equal(hebrewDaysUntil(year, fromMonth, fromDay, toMonth, toDay), expected);
});

test('calendar intervals match independently enumerated civil days in all six Hebrew year lengths', () => {
  const lengths = new Set();
  for (let year = 5780; year <= 5800; year++) {
    const first = toGregorian(year, 'Tishrei', 1), next = toGregorian(year + 1, 'Tishrei', 1);
    const length = (+civilDate(next) - +civilDate(first)) / 86400000;
    if (lengths.has(length)) continue;
    lengths.add(length);
    for (const month of ['Cheshvan', 'Kislev', 'Adar', 'Adar II', 'Elul']) {
      const start = toGregorian(year, month, 20);
      if (!start) continue;
      let count = 0, cursor = start;
      while (count++ < 420) {
        cursor = moveDay(cursor, 1);
        const date = fromGregorian(cursor);
        if (date.day === 1) {
          assert.equal(hebrewDaysUntil(year, month, 20, date.month, 1), count, `${year}/${month}`);
          break;
        }
      }
    }
  }
  assert.deepEqual([...lengths].sort(), [353, 354, 355, 383, 384, 385]);
});

test('explicit Adar II skips common years; unspecified Adar retains the existing first-Adar policy', () => {
  const from = toGregorian(5786, 'Adar', 20), target = toGregorian(5787, 'Adar II', 12);
  assert.equal(hebrewDaysUntil(5786, 'Adar', 20, 'Adar II', 12), (+civilDate(target) - +civilDate(from)) / 86400000);
  assert.equal(hebrewDaysUntil(5787, 'Shvat', 30, 'Adar', 1), 1);
  assert.equal(hebrewDaysUntil(5787, 'Adar I', 14, 'Adar', 14), (+civilDate(toGregorian(5788, 'Adar', 14)) - +civilDate(toGregorian(5787, 'Adar I', 14))) / 86400000);
});

test('Israel sunset, UTC midnight, Rosh Hashana and tomorrow use one consistent civil-date boundary', () => {
  for (const [instant, expected] of [
    ['2026-11-04T04:49:32Z', '2026-11-04'],
    ['2026-11-04T20:00:00Z', '2026-11-05'],
    ['2026-11-04T23:00:00Z', '2026-11-05'],
    ['2026-09-11T20:00:00Z', '2026-09-12'],
  ]) {
    const now = new Date(instant);
    assert.equal(calendarDateISO(now), expected);
    assert.equal(calendarDateISO(now, 1), moveDay(expected, 1));
  }
  assert.throws(() => calendarDateISO(new Date(), 0.5), TypeError);
});

test('genuine next/upcoming callers use the supplied year and preserve all original event rows', () => {
  const events = source.slice(source.indexOf('  const importantDates = ['), source.indexOf('  let tzaddikimDatabase'));
  const normalize = source.slice(source.indexOf('  function normalizeMonth('), source.indexOf('  // Find yahrzeits'));
  const functions = source.slice(source.indexOf('  // Count real civil days'), source.indexOf('  // Render only'));
  const context = { hebrewDaysUntil };
  vm.runInNewContext(events + normalize + functions + ';this.api={calcDaysUntil,findNextImportantDate,findUpcomingImportantDates}', context);
  assert.equal(context.api.calcDaysUntil('Cheshvan', 24, 'Kislev', 4, 5787), 10);
  assert.equal(context.api.calcDaysUntil("Sh'vat", 30, 'Adar', 1, 5787), 1);
  assert.equal(context.api.findNextImportantDate('Adar', 20, 5786).daysUntil, 10);
  assert.equal(context.api.findUpcomingImportantDates('Adar', 20, 7, 5786).length, 0);
  assert.ok(context.api.findUpcomingImportantDates('Adar', 20, 10, 5786).some(row => row.month === 'Nisan' && row.day === 1 && row.daysUntil === 10));
  assert.match(source, /findUpcomingImportantDates\(todayHeb.month, todayHeb.day, 7, todayHeb.year\)/);
  assert.match(source, /findNextImportantDate\(todayHeb.month, todayHeb.day, todayHeb.year\)/);
});

test('genuine date fetcher caches the sunset-adjusted day and independent tomorrow without altering prior entries', async () => {
  const functionSource = source.slice(source.indexOf('  async function getHebrewDate('), source.indexOf('  // Load tzaddikim database'));
  const old = JSON.stringify({ month: 'Cheshvan', day: 24, year: 5787, hebrew: 'prior fixture' });
  const cache = new Map([['ajew-hebcal-g2h-2026-11-04', old]]), requests = [];
  const context = { Date, calendarDateISO, sessionStorage: { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) }, fetch: async url => {
    requests.push(url);
    const h = fromGregorian(new URL(url).searchParams.get('date'));
    return { json: async () => ({ hm: h.month, hd: h.day, hy: h.year, hebrew: 'controlled date-format fixture' }) };
  } };
  vm.runInNewContext(functionSource + ';this.getDate=getHebrewDate', context);
  const now = new Date('2026-11-04T20:00:00Z');
  assert.equal((await context.getDate(now)).day, 25);
  assert.equal((await context.getDate(now, 1)).day, 26);
  await context.getDate(now); await context.getDate(now, 1);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(url => new URL(url).searchParams.get('date')), ['2026-11-05', '2026-11-06']);
  assert.equal(cache.get('ajew-hebcal-g2h-2026-11-04'), old);
});

test('invalid dates retain the fail-closed sentinel instead of fabricated countdowns', () => {
  for (const args of [[null, 'Nisan', 1, 'Nisan', 2], [5787, 'missing', 1, 'Nisan', 2], [5787, 'Cheshvan', 31, 'Nisan', 2], [5787, 'Nisan', 1, 'missing', 2]]) assert.equal(hebrewDaysUntil(...args), 999);
});
