import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const { buildKitzurReferenceMap } = createRequire(import.meta.url)('../src/lib/daily-study-references.cjs');
const references = buildKitzurReferenceMap();
import * as calendar from '../public/daily-study-calendar.mjs';

const source = JSON.parse(await readFile(new URL('../public/chok-breslov.json', import.meta.url)));
const original = JSON.stringify(source);
const template = await readFile(new URL('../src/pages/daily-study.astro', import.meta.url), 'utf8');
const inline = template.match(/<script type="module" is:inline>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*?;\s*$/m, '');

test('real Hebrew dates, year starts, all six year lengths and DST-safe day counts', () => {
  // Independent Hebcal converter fixtures, not the previous approximate calendar.
  for (const [iso, year, month, day, ordinal, length] of [
    ['2025-09-23', 5786, 'Tishrei', 1, 1, 354],
    ['2026-09-12', 5787, 'Tishrei', 1, 1, 385],
    ['2026-11-04', 5787, 'Cheshvan', 24, 54, 385],
    ['2027-10-02', 5788, 'Tishrei', 1, 1, 355]
  ]) {
    const result = calendar.studyYear(iso);
    assert.deepEqual([result.year, result.hebrew.month, result.hebrew.day, result.day, result.days], [year, month, day, ordinal, length]);
    assert.equal(calendar.studyDate(result, result.day).iso, iso);
  }
  const lengths = new Set();
  for (let year = 2020; year <= 2040; year++) lengths.add(calendar.studyYear(`${year}-11-04`).days);
  assert.deepEqual([...lengths].sort(), [353, 354, 355, 383, 384, 385]);
  assert.equal(calendar.studyYear('2026-11-02').day - calendar.studyYear('2026-11-01').day, 1);
  assert.throws(() => calendar.studyDate(calendar.studyYear('2026-11-04'), 386), RangeError);
});

test('Israel sunset advances the date, but daytime does not', () => {
  assert.equal(calendar.todayStudy(new Date('2026-11-04T04:49:32Z')).hebrew.day, 24);
  assert.equal(calendar.todayStudy(new Date('2026-11-04T20:00:00Z')).hebrew.day, 25);
});

test('long Kislev and both Adars retain their real dates and source-map month identities', () => {
  const dates = [];
  const year = calendar.studyYear('2026-11-04');
  for (let day = 1; day <= year.days; day++) dates.push(calendar.studyDate(year, day));
  assert.equal(dates.filter(d => d.hebrew.month === 'Cheshvan').length, 30);
  assert.equal(dates.filter(d => d.hebrew.month === 'Adar I').length, 30);
  assert.equal(dates.filter(d => d.hebrew.month === 'Adar II').length, 29);
  for (const month of ['Adar I', 'Adar II']) {
    const first = dates.find(d => d.hebrew.month === month);
    assert.deepEqual(calendar.calendarMonthDay(first), { month: 6, day: 1 });
  }
});

test('all readings and their order/URLs survive every supported year length without changing source data', () => {
  const unique = book => [...new Set(book.portions.flatMap(p => p.sections.map(s => s.url)))];
  for (const days of [353, 354, 355, 383, 384, 385]) {
    const scheduled = calendar.reschedule(source, days);
    for (const [index, book] of [...scheduled.books, scheduled.bonus].entries()) {
      const before = [...source.books, source.bonus][index];
      assert.equal(book.portions.length, days);
      assert.deepEqual(unique(book), unique(before), before.id);
      for (const [day, portion] of book.portions.entries()) {
        assert.equal(portion.day, day + 1);
        assert.ok(portion.sections.length > 0, `${book.id} day ${day + 1}`);
      }
    }
    assert.deepEqual(scheduled.dateLetters, source.dateLetters);
  }
  assert.equal(JSON.stringify(source), original);
});

async function boot({ delayed = false, saved = null } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { id, innerHTML: '', textContent: '', style: {}, hidden: false, value: '', handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } });
    return elements.get(id);
  };
  element('daily-study-references').textContent = JSON.stringify(references);
  const storage = new Map(saved ? [['chok-breslov', JSON.stringify(saved)]] : []);
  const document = { readyState: 'complete', handlers: {}, getElementById: element, addEventListener(type, fn) { this.handlers[type] = fn; } };
  let now = '2026-11-04T04:49:32Z';
  const FrozenDate = class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } };
  const window = { handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
  let tick = null;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const context = { ...calendar, document, window, Date: FrozenDate, setInterval: fn => { tick = fn; return 1; }, clearInterval: () => { tick = null; }, console, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, fetch: async url => {
    if (delayed) await pending;
    if (url === '/chok-breslov.json') return { ok: true, json: async () => JSON.parse(original) };
    if (url === '/lt-calendar-map.json') return { ok: true, json: async () => ({ dateMap: { 2: { 24: [{ part: 1, num: 7 }] } }, undated: [{ part: 1, num: 1 }] }) };
    throw new Error(`Unexpected URL ${url}`);
  } };
  vm.runInNewContext(inline, context, { filename: 'daily-study-real-initializer.js' });
  const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
  await settle();
  return { element, document, storage, release, settle, window, setNow: value => { now = value; }, tick: () => tick?.() };
}

test('actual page initializer uses day54/385, date-qualified prayer, and preserves legacy progress', async () => {
  const old = { completed: { 55: { 'likutay-moharan': true } }, custom: 'preserve' };
  const app = await boot({ saved: old });
  assert.equal(app.element('dayNumber').textContent, 'Day 54 of 385');
  assert.match(app.element('hebrewDateDisplay').textContent, /^כ״ד /);
  assert.equal(app.element('dayPicker').max, 385);
  assert.match(app.element('portionsGrid').innerHTML, /href="\/reader\/likutay-tefilos\/1\/7"/);
  assert.equal(app.element('legacyProgress').hidden, false);
  const btn = { dataset: { book: 'likutay-moharan', day: '54' } };
  app.document.handlers.click({ target: { closest: () => btn } });
  const saved = JSON.parse(app.storage.get('chok-breslov'));
  assert.deepEqual(saved.completed, old.completed);
  assert.equal(saved.custom, 'preserve');
  assert.equal(saved.years[5787].completed[54]['likutay-moharan'], true);
  assert.equal(app.element('completedCount').textContent, 1);
  app.document.handlers.click({ target: { closest: () => btn } });
  assert.deepEqual(JSON.parse(app.storage.get('chok-breslov')).years[5787].completed, {});
});

test('late schedule completion retains navigation intent and year boundaries reschedule correctly', async () => {
  const app = await boot({ delayed: true });
  app.element('nextDay').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 55 of 385');
  app.release(); await app.settle();
  assert.equal(app.element('dayNumber').textContent, 'Day 55 of 385');
  assert.ok(app.element('portionsGrid').innerHTML.includes('book-card'));
  app.element('resetBtn').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 1 of 385');
  app.element('prevDay').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 354 of 354');
  app.element('nextDay').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 1 of 385');
  app.element('dayPicker').value = 999;
  app.element('dayPicker').handlers.change.call(app.element('dayPicker'));
  assert.equal(app.element('dayNumber').textContent, 'Day 385 of 385');
  app.element('nextDay').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 1 of 355');
  app.element('todayBtn').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 54 of 385');
});

test('actual card references identify the teaching at their canonical destination', async () => {
  const app = await boot();
  app.element('dayPicker').value = 59;
  app.element('dayPicker').handlers.change.call(app.element('dayPicker'));
  const card = app.element('portionsGrid').innerHTML.match(/<div class="book-card[^"]*" data-book="kitzur-likutay-moharan"[\s\S]*?<div class="book-progress">/)[0];
  assert.match(card, /Part 1, Torah 56/);
  assert.match(card, /href="\/reader\/kitzur-likutay-moharan\/1\/59"/);
  assert.doesNotMatch(card, />Torah 59</);
  app.element('resetBtn').handlers.click();
  assert.match(app.element('portionsGrid').innerHTML, /הַקְדָּמָה/);
});

test('a page left open advances at sunset without hijacking a browsed day', async () => {
  const app = await boot();
  app.setNow('2026-11-04T20:00:00Z'); app.tick();
  assert.equal(app.element('dayNumber').textContent, 'Day 55 of 385');
  app.element('prevDay').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 54 of 385');
  app.setNow('2026-11-05T20:00:00Z'); app.tick();
  assert.equal(app.element('dayNumber').textContent, 'Day 54 of 385');
  app.element('todayBtn').handlers.click();
  assert.equal(app.element('dayNumber').textContent, 'Day 56 of 385');
  app.window.handlers.pagehide();
  app.setNow('2026-11-06T20:00:00Z'); app.tick();
  assert.equal(app.element('dayNumber').textContent, 'Day 56 of 385');
  app.window.handlers.pageshow();
  assert.equal(app.element('dayNumber').textContent, 'Day 57 of 385');
});

