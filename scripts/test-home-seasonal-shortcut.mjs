import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { shortcutForMonth, seasonalShortcut, startSeasonalShortcut } from '../src/lib/home-seasonal-shortcut.mjs';

// Optional generic source override supports an original-source counterexample.
const sourceURL = process.env.HOME_SEASONAL_SOURCE ? pathToFileURL(process.env.HOME_SEASONAL_SOURCE) : new URL('../src/pages/index.astro', import.meta.url);
const source = readFileSync(sourceURL, 'utf8');
const resources = { href: '/resources', icon: '✨', label: 'All Resources', he: 'כל האוצרות' };
const selected = {
  Nisan: { href: '/pesach', icon: '🍷', label: 'Pesach', he: 'חג הפסח' },
  Iyar: { href: '/omer', icon: '🌾', label: 'Sfiras HaOmer', he: 'ספירת העומר' },
  Sivan: { href: '/shavuos', icon: '🌾', label: 'Shavuos / שבועות', he: 'זמן מתן תורתנו' },
};
// Real Intl baseline values, at local noon well away from month boundaries.
const calendarFixtures = [
  ['2023-09-20', 'Tishri'], ['2023-10-20', 'Heshvan'], ['2023-11-20', 'Kislev'],
  ['2023-12-20', 'Tevet'], ['2024-01-20', 'Shevat'], ['2024-02-20', 'Adar I'],
  ['2024-03-20', 'Adar II'], ['2024-04-25', 'Nisan'], ['2024-05-25', 'Iyar'],
  ['2024-06-20', 'Sivan'], ['2024-07-25', 'Tamuz'], ['2024-08-20', 'Av'],
  ['2024-09-15', 'Elul'], ['2023-03-01', 'Adar'],
];
for (const [iso, month] of calendarFixtures) {
  test(`real local Intl: ${month}`, () => {
    const date = new Date(`${iso}T12:00:00`);
    const formatter = new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long' });
    assert.equal(formatter.resolvedOptions().calendar, 'hebrew');
    assert.equal(formatter.resolvedOptions().timeZone, new Intl.DateTimeFormat().resolvedOptions().timeZone);
    assert.equal(formatter.formatToParts(date).find(p => p.type === 'month').value, month);
    assert.deepEqual(seasonalShortcut(date), selected[month] ?? resources);
    assert.deepEqual(shortcutForMonth(month), selected[month] ?? resources);
  });
}

test('unknown and hostile month names never produce URLs or labels', () => {
  for (const month of ['', null, undefined, 'nisan', 'Nisan ', 'April', 'Adar III', 'Cheshvan', 'constructor', '__proto__', 'javascript:alert(1)', '<img src=x onerror=alert(1)>']) {
    assert.deepEqual(shortcutForMonth(month), resources);
  }
});
test('invalid dates and unavailable formatter fail closed', () => {
  for (const date of [new Date(NaN), null, {}, '2024-04-25', 0]) assert.deepEqual(seasonalShortcut(date), resources);
  for (const intl of [null, {}, { DateTimeFormat: undefined }, { DateTimeFormat() { throw new Error('unavailable'); } }]) {
    assert.deepEqual(seasonalShortcut(new Date('2024-04-25T12:00:00'), intl), resources);
  }
});
// Only failure-path doubles; month positives above use the real calendar API.
function brokenFormatter({ calendar = 'hebrew', parts = [{ type: 'month', value: 'Nisan' }], error } = {}) {
  return { DateTimeFormat: class {
    resolvedOptions() { if (error === 'options') throw new Error(error); return { calendar }; }
    formatToParts() { if (error === 'parts') throw new Error(error); return parts; }
  } };
}
test('silent calendar substitution, errors, unknown/missing/ambiguous parts fall back', () => {
  const date = new Date('2024-04-25T12:00:00');
  for (const failure of [{ calendar: 'gregory' }, { calendar: null }, { error: 'options' }, { error: 'parts' }, { parts: [] }, { parts: [{ type: 'month', value: 'Nisan ' }] }, { parts: [{ type: 'month', value: 'Nisan' }, { type: 'month', value: 'Iyar' }] }]) {
    assert.deepEqual(seasonalShortcut(date, brokenFormatter(failure)), resources);
  }
});

function eventTarget(extra = {}) {
  const listeners = new Map();
  return Object.assign(extra, {
    addEventListener(name, callback, options) { if (!listeners.has(name)) listeners.set(name, new Map()); listeners.get(name).set(callback, options); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    dispatch(name) { for (const [callback, options] of [...(listeners.get(name) ?? [])]) { callback(); if (options?.once) listeners.get(name).delete(callback); } },
    listenerCount() { return [...listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0); },
  });
}
function node(textContent = '') {
  return { textContent, get innerHTML() { throw new Error('innerHTML is forbidden'); }, set innerHTML(_) { throw new Error('innerHTML is forbidden'); } };
}
function stub({ readyState = 'complete', anchor = true } = {}) {
  const icon = node('✨'), label = node('All Resources'), he = node('כל האוצרות');
  const tile = { tagName: 'A', children: [icon, { children: [label, he] }], href: '/resources', className: 'tool', setAttribute(name, value) { assert.equal(name, 'href'); this.href = value; } };
  const otherTiles = Array.from({ length: 7 }, (_, i) => ({ href: `/other-${i}`, text: `original-${i}` }));
  const yearround = { href: '/shavuos', text: 'Shavuos / שבועות' };
  const timers = new Map(); let next = 0;
  const view = eventTarget({ setTimeout(callback, delay) { assert.ok(delay > 0 && delay <= 60_000); timers.set(++next, callback); assert.ok(timers.size <= 1); return next; }, clearTimeout(id) { timers.delete(id); } });
  const document = eventTarget({ defaultView: view, readyState, visibilityState: 'visible', getElementById(id) { assert.equal(id, 'home-seasonal-shortcut'); return anchor ? tile : null; } });
  return { document, view, tile, icon, label, he, timers, otherTiles, yearround, tick() { const [id, callback] = [...timers][0]; timers.delete(id); callback(); } };
}
function assertTile(s, expected) {
  assert.deepEqual({ href: s.tile.href, icon: s.icon.textContent, label: s.label.textContent, he: s.he.textContent }, expected);
  assert.equal(s.tile.className, 'tool');
}
test('initial ready and only scoped existing descendants update through all real months', () => {
  const s = stub(); const before = JSON.stringify([s.otherTiles, s.yearround]);
  let date = new Date('2024-04-25T12:00:00');
  const cleanup = startSeasonalShortcut(s.document, { now: () => date });
  assertTile(s, selected.Nisan);
  for (const [iso, month] of calendarFixtures) { date = new Date(`${iso}T12:00:00`); s.view.dispatch('pageshow'); assertTile(s, selected[month] ?? resources); }
  assert.equal(JSON.stringify([s.otherTiles, s.yearround]), before);
  cleanup(); assert.equal(s.timers.size, 0); assert.equal(s.document.listenerCount() + s.view.listenerCount(), 0);
});
test('deferred ready, return visibility, bfcache pageshow and local rollover use one cleanable timer', () => {
  const s = stub({ readyState: 'loading' }); let date = new Date('2024-04-25T12:00:00');
  const cleanup = startSeasonalShortcut(s.document, { now: () => date });
  assertTile(s, resources); assert.equal(s.timers.size, 0);
  s.document.dispatch('DOMContentLoaded'); assertTile(s, selected.Nisan);
  date = new Date('2024-05-25T12:00:00'); s.document.visibilityState = 'hidden'; s.document.dispatch('visibilitychange'); assertTile(s, selected.Nisan);
  s.document.visibilityState = 'visible'; s.document.dispatch('visibilitychange'); assertTile(s, selected.Iyar);
  s.view.dispatch('pagehide'); assert.equal(s.timers.size, 0);
  date = new Date('2024-06-20T12:00:00'); s.view.dispatch('pageshow'); assertTile(s, selected.Sivan);
  date = new Date('2024-07-25T00:00:01'); s.tick(); assertTile(s, resources); assert.equal(s.timers.size, 1);
  cleanup(); cleanup(); s.view.dispatch('pageshow'); s.document.dispatch('visibilitychange'); assert.equal(s.timers.size, 0);
});
test('absent document/anchor, invalid clock and API error are harmless and cleanable', () => {
  startSeasonalShortcut(null)();
  const absent = stub({ anchor: false }); startSeasonalShortcut(absent.document)(); assert.equal(absent.timers.size, 0);
  for (const now of [() => new Date(NaN), () => { throw new Error('clock'); }]) {
    const s = stub(); const cleanup = startSeasonalShortcut(s.document, { now }); assertTile(s, resources); cleanup();
  }
  const s = stub(); const cleanup = startSeasonalShortcut(s.document, { now: () => new Date('2024-04-25T12:00:00'), intl: null }); assertTile(s, resources); cleanup();
});

const tools = source.match(/<section class="tools">([\s\S]*?)<\/section>/)?.[1] ?? '';
const grid = tools.match(/<div class="tools-grid">([\s\S]*?)\n    <\/div>/)?.[1] ?? '';
const anchors = [...grid.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m => m[0]);
test('source integration: eight primary tiles, seven original fields and safe no-JS fallback', () => {
  assert.equal(anchors.length, 8);
  const original = [
    ['/daily-study', '📅', 'Daily Study', 'לימוד יומי', 'tool'],
    ['/torah-gps', '🧭', 'Torah GPS', 'תורה GPS', 'tool'],
    ['/torah-lens', '🔭', 'Torah Lens', 'עדשת תורה', 'tool'],
    ['/healing-words', '🩹', 'Healing Words', 'דברי מרפא', 'tool tool-green'],
    ['/gematria', '🔢', 'Gematria', 'גימטריה', 'tool'],
    ['/parsha', '📜', 'Parsha', 'פרשת שבוע', 'tool'],
    ['/reader/tikkun', '📖', 'Tikun Korim · Shnayim Mikra', 'תיקון קריאה · שניים מקרא ואחד תרגום', 'tool'],
  ];
  original.forEach(([href, icon, label, he, cls], i) => assert.equal(anchors[i], `<a href="${href}" class="${cls}">\n        <span class="tool-icon">${icon}</span>\n        <div><span class="tool-label">${label}</span><span class="tool-he" lang="he" dir="rtl">${he}</span></div>\n      </a>`));
  assert.match(anchors[7], /^<a href="\/resources" class="tool" id="home-seasonal-shortcut">/);
  assert.match(anchors[7], /<span class="tool-icon">✨<\/span>/);
  assert.match(anchors[7], /<span class="tool-label">All Resources<\/span><span class="tool-he" lang="he" dir="rtl">כל האוצרות<\/span>/);
  assert.equal((source.match(/id="home-seasonal-shortcut"/g) ?? []).length, 1);
});
test('source integration: permanent direct Shavuos link is outside the eight-card grid', () => {
  const tail = tools.slice(tools.indexOf(grid) + grid.length);
  assert.match(tail, /<p class="section-sub"><a class="home-yearround-shavuos" href="\/shavuos">Shavuos \/ שבועות<\/a><\/p>/);
  assert.doesNotMatch(grid, /home-yearround-shavuos/);
});
test('source integration: one bundled module bootstrap, not a legacy inline duplicate', () => {
  const scripts = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter(m => m[2].includes('home-seasonal-shortcut.mjs'));
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0][1].trim(), '');
  assert.match(scripts[0][2], /import \{ startSeasonalShortcut \} from '\.\.\/lib\/home-seasonal-shortcut\.mjs';/);
  assert.match(scripts[0][2], /startSeasonalShortcut\(\);/);
});
test('source integration: additive night readability selectors only target the new slot/link', () => {
  assert.match(source, /\.home-yearround-shavuos \{ color: #1a365d;/);
  assert.match(source, /\[data-theme="night"\] #home-seasonal-shortcut \.tool-he, body\.dark-mode #home-seasonal-shortcut \.tool-he \{ color: #b8a890; \}/);
  assert.match(source, /\[data-theme="night"\] \.home-yearround-shavuos, body\.dark-mode \.home-yearround-shavuos \{ color: #d0d0e0; \}/);
});
