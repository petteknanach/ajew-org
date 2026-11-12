import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from '@astrojs/compiler';

const source = await readFile(new URL('../src/components/CompactYahrzeit.astro', import.meta.url), 'utf8');
const result = await transform(source, {
  filename: 'src/components/CompactYahrzeit.astro',
  scopedStyleStrategy: 'attribute',
});
const css = result.css.map(part => typeof part === 'string' ? part : part.code).join('\n');
const cleanCSS = css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...cleanCSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
  selectors: selectors.trim().split(',').map(selector => selector.trim()),
  declarations: Object.fromEntries(body.split(';').filter(part => part.includes(':')).map(part => {
    const colon = part.indexOf(':');
    return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()];
  })),
}));
const dynamicClasses = ['tzaddik-link', 'tzaddik-name', 'tzaddik-hebrew', 'upcoming-event', 'next-big-date', 'event-description', 'countdown-badge', 'event-type', 'birth-badge', 'special-badge', 'yahrzeit-badge'];

function ownedDescendant(selector, name, hover = false) {
  return new RegExp('^\\.compact-yahrzeit\\[data-astro-cid-[a-zA-Z0-9-]+\\]\\s+\\.' + name + (hover ? ':hover' : '') + '$').test(selector.trim());
}
function declarations(name, hover = false) {
  return Object.assign({}, ...rules.filter(rule => rule.selectors.some(selector => ownedDescendant(selector, name, hover))).map(rule => rule.declarations));
}
function luminance(hex) {
  assert.match(hex, /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
  const full = hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex;
  const values = [1, 3, 5].map(index => parseInt(full.slice(index, index + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function assertContrast(foreground, background, label) {
  const [dark, light] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  assert((light + 0.05) / (dark + 0.05) >= 4.5, label + ': ' + foreground + ' on ' + background);
}

test('runtime-created rows match emitted CSS without a descendant Astro attribute', () => {
  for (const name of dynamicClasses) {
    assert.match(css, new RegExp('\\.compact-yahrzeit\\[data-astro-cid-[^\\]]+\\]\\s+\\.' + name + '(?:[:\\s{])'), name);
    assert.doesNotMatch(css, new RegExp('\\.' + name + '(?::hover)?\\[data-astro-cid-'), name + ' requires an attribute the renderer never creates');
  }
  assert.equal(declarations('tzaddik-link').display, 'flex');
  assert.equal(declarations('tzaddik-link')['flex-direction'], 'column');
  assert.equal(declarations('tzaddik-link')['overflow-wrap'], 'anywhere');
});

test('readable type and every emitted dynamic selector stay inside the calendar', () => {
  for (const [name, size] of [['tzaddik-name', '0.875rem'], ['tzaddik-hebrew', '0.875rem'], ['event-description', '0.8125rem'], ['countdown-badge', '0.75rem']]) {
    assert.equal(declarations(name)['font-size'], size, name);
  }
  for (const name of dynamicClasses) {
    const token = new RegExp('\\.' + name + '(?=$|[\\s:{,.])');
    const selectors = rules.flatMap(rule => rule.selectors).filter(selector => token.test(selector));
    assert(selectors.length > 0, name);
    for (const selector of selectors) assert(ownedDescendant(selector, name) || ownedDescendant(selector, name, true), selector + ' is not an owner-bounded descendant');
  }
});

test('containment guard rejects sibling escape, missing scope and extra targets', () => {
  const owner = '.compact-yahrzeit[data-astro-cid-test]';
  assert(ownedDescendant(owner + ' .tzaddik-name', 'tzaddik-name'));
  for (const selector of [owner + ' + .tzaddik-name', owner + ' ~ .tzaddik-name', '.compact-yahrzeit .tzaddik-name', owner + ' .tzaddik-name + div', owner + ' .tzaddik-name, .tzaddik-name']) {
    assert(!ownedDescendant(selector, 'tzaddik-name'), selector);
  }
});

test('approved Kislev cohort is unique in all feeds and actual calendar selectors', async () => {
  const vm = await import('node:vm');
  const manifest = JSON.parse(await readFile(new URL('./approved-kislev-records.json', import.meta.url), 'utf8'));
  const entries = manifest.entries;
  const catalogSource = await readFile(new URL('../src/pages/tzaddikim/index.astro', import.meta.url), 'utf8');
  const categoryDeclaration = catalogSource.match(/const categoryOrder = (\[[^;]+\]);/);
  assert(categoryDeclaration, 'actual public category order located');
  const visibleCategories = vm.runInNewContext(categoryDeclaration[1]);
  for (const entry of entries) assert(visibleCategories.includes(entry.record.category), 'approved identity remains visible in public catalogue: ' + entry.id);
  assert.equal(new Set(entries.map(e => e.id)).size, entries.length);
  assert.equal(entries.length + manifest.held_ids.length, 37);
  for (const id of [43, 44, 119, 142]) assert(!entries.some(e => e.id === id), 'excluded or duplicate source ID ' + id);
  const important = source.slice(source.indexOf('  const importantDates ='), source.indexOf('  let tzaddikimDatabase'));
  const begin = source.indexOf('  function normalizeMonth(');
  const end = source.indexOf('  // Count real civil days');
  assert(begin >= 0 && end > begin, 'real calendar selector source located');
  const helpers = source.slice(begin, end);
  for (const filename of ['tzaddikim-database-complete.json', 'tzaddikim-database.json', 'tzaddikim-database-filtered.json']) {
    const data = JSON.parse(await readFile(new URL('../public/data/' + filename, import.meta.url), 'utf8'));
    const rows = data.all_tzaddikim;
    assert.equal(data.metadata.total_count, rows.length, filename + ': declared count');
    for (const hold of manifest.held_existing) {
      for (const row of rows.filter(row => hold.aliases.includes(row.name))) {
        assert(!row.yahrzeit_month && !row.yahrzeit_day, 'unresolved date is not still displayed: ' + hold.id);
      }
    }
    const context = { rows };
    vm.runInNewContext('const tzaddikimDatabase = rows;\n' + important + helpers + '\nthis.api = {findYahrzeits,findImportantDates,dedupeImportantAgainstDatabase,importantDates};', context);
    for (const entry of entries) {
      const r = entry.record, key = r.kislev_review_id;
      assert.equal(rows.filter(row => row.kislev_review_id === key).length, 1, filename + ': ' + key);
      const today = context.api.findYahrzeits(r.yahrzeit_month, r.yahrzeit_day);
      assert.equal(today.filter(row => row.kislev_review_id === key).length, 1, filename + ': dated selector ' + key);
      assert(!context.api.findYahrzeits(r.yahrzeit_month, r.yahrzeit_day === 30 ? 1 : r.yahrzeit_day + 1).some(row => row.kislev_review_id === key), 'wrong-day control ' + key);
      assert.equal(context.api.importantDates.filter(row => row.kislev_review_id === key).length, 1, 'upcoming identity ' + key);
      const additional = context.api.dedupeImportantAgainstDatabase(context.api.findImportantDates(r.yahrzeit_month, r.yahrzeit_day), today);
      assert(!additional.some(row => row.kislev_review_id === key), 'Today/Tomorrow duplicate suppressed: ' + key);
      const actual = rows.find(row => row.kislev_review_id === key);
      assert.equal(actual.hebrew_name, r.hebrew_name);
      assert.equal(actual.name, r.name);
      assert.deepEqual(actual.source_urls, r.source_urls);
      for (const alternate of r.yahrzeit_alternate_dates || []) {
        const selected = context.api.findYahrzeits(alternate.month, alternate.day);
        assert.equal(selected.filter(row => row.kislev_review_id === key).length, 1, 'alternate date selects the same single identity: ' + key);
        const important = context.api.findImportantDates(alternate.month, alternate.day).filter(row => row.kislev_review_id?.startsWith(key + '-alternate-'));
        assert.equal(important.length, 1, 'alternate upcoming event is present: ' + key);
        assert(!context.api.dedupeImportantAgainstDatabase(important, selected).length, 'alternate Today/Tomorrow event is deduplicated');
      }
      if (entry.observed_hillula) {
        const observances = context.api.findImportantDates(entry.observed_hillula.month, entry.observed_hillula.day).filter(row => row.kislev_review_id === key + '-observance');
        assert.equal(observances.length, 1);
        assert.notEqual(observances[0].type, 'yahrzeit', 'a birthday/hillula must not be labelled a death date');
      }
    }
  }
});

test('winning label colors meet normal-text AA on normal and hover row backgrounds', () => {
  for (const variant of ['', 'upcoming-event', 'next-big-date']) {
    const normal = { ...declarations('tzaddik-link'), ...(variant ? declarations(variant) : {}) };
    const hover = { ...normal, ...declarations('tzaddik-link', true), ...(variant ? declarations(variant, true) : {}) };
    for (const [state, row] of [['normal', normal], ['hover', hover]]) {
      for (const name of ['tzaddik-name', 'tzaddik-hebrew', 'event-description']) {
        assertContrast(declarations(name).color, row.background, [variant || 'standard', state, name].join('/'));
      }
    }
  }
  for (const name of ['countdown-badge', 'birth-badge', 'special-badge', 'yahrzeit-badge']) {
    const label = declarations(name);
    assertContrast(label.color, label.background, name);
  }
});
