// Run directly: node --test scripts/test-liroas-discovery.mjs
// No corpus generation or search-engine changes are needed for this UI repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';

const id = 'liroas-biebay-hanachal';
const catalog = JSON.parse(fs.readFileSync('public/reader/catalog.json', 'utf8'));
const book = catalog.books.find(b => b.id === id);
const reader = fs.readFileSync('src/pages/reader/index.astro', 'utf8');
const options = fs.readFileSync('src/components/AdvancedSearchOptions.astro', 'utf8');
const categoryBlock = reader.match(/const categories = (\[[\s\S]*?\n\]);/)[1];
const groups = vm.runInNewContext(categoryBlock, { neviimBookIds: [], ketuvimBookIds: [] });

// Execute the genuine picker producer against its genuine existing light index.
const frontmatter = options.split('---')[1].replace(/^import .*;\s*$/gm, '');
const picker = { fs, path, zlib, process };
vm.runInNewContext(stripTypeScriptTypes(frontmatter + '\nglobalThis.result = { categories, hebrewNames, allBooks };'), picker);

test('Reader includes the same catalog book in Saba AND Michoel Barzel', () => {
  const memberships = groups.filter(g => g.ids.includes(id));
  assert.equal(memberships.length, 2);
  assert(memberships.some(g => g.title.startsWith('3. Saba')));
  assert(memberships.some(g => g.title === 'Michoel Barzel / מיכאל ברזל'));
  assert.equal(book.author, 'Michoel Barzel');
  assert.equal(book.hebrewAuthor, 'מיכאל ברזל');
  assert.equal(book.title, 'Liroas BiEbay HaNachal');
  assert.equal(book.hasEnglish, false);
  assert.equal(book.parts[0].totalTorahs, 59);
  assert.equal(book.parts[0].totalSegments, 809);
});

test('genuine indexed book has exactly one Saba picker entry with catalog Hebrew title', () => {
  const { categories, hebrewNames, allBooks } = picker.result;
  const indexed = allBooks.find(b => b.id === id);
  assert(indexed && indexed.count > 0, 'existing search content must be present');
  const placements = categories.flatMap(c => c.books.filter(b => b.id === id).map(b => ({ c, b })));
  assert.equal(placements.length, 1);
  assert.equal(placements[0].c.label, 'Saba / סבא');
  assert.equal(placements[0].b.count, indexed.count);
  assert.equal(hebrewNames[id], book.hebrewTitle);
  assert.match(options, /name="searchBook" value=\{book\.id\} checked onchange="updateSelectedCount\(\)"/);
});

test('existing Saba picker books and non-Saba categories stay available', () => {
  const { categories, allBooks } = picker.result;
  const saba = categories.find(c => c.label === 'Saba / סבא');
  for (const previous of ['yisroel-saba', 'fires-of-israel', 'sichos-chayay-saba', 'saba-tape-transcripts', 'saba-says', 'netzach-yisrael', 'ebay-hanachal', 'likutay-nanach', 'misc-אגרת-הפורים']) {
    assert(saba.ids.includes(previous));
    if (allBooks.some(b => b.id === previous)) assert(saba.books.some(b => b.id === previous));
  }
  assert(categories.find(c => c.label === 'Rebbe Nachman / רבי נחמן').books.some(b => b.id === 'likutay-moharan'));
  assert(categories.find(c => c.prefix === 'tanach-').books.length > 0);
});

test('Breslov Only includes this Saba book without changing any previous selection', () => {
  const match = options.match(/window\.selectBreslovOnly = function\(\) \{[\s\S]*?\n  \};/);
  assert(match, 'actual shortcut callback');
  const previousLine = "var isBreslov = breslovPrefixes.some(function(p) { return cb.value.startsWith(p); });";
  const currentLine = "var isBreslov = cb.value === 'liroas-biebay-hanachal' || breslovPrefixes.some(function(p) { return cb.value.startsWith(p); });";
  assert.equal(match[0].split(currentLine).length, 2);
  const ids = [...new Set(picker.result.categories.flatMap(c => c.books.map(b => b.id)))];
  assert(ids.includes(id));
  function execute(code) {
    const boxes = ids.map(value => ({value, checked: false})); let updates = 0;
    const env = {window: {}, document: {querySelectorAll(selector) {
      assert.equal(selector, 'input[name="searchBook"]'); return boxes;
    }}, updateSelectedCount() { updates++; }};
    vm.runInNewContext(code, env); env.window.selectBreslovOnly();
    assert.equal(updates, 1);
    return new Map(boxes.map(b => [b.value, b.checked]));
  }
  const previous = execute(match[0].replace(currentLine, previousLine)), current = execute(match[0]);
  assert.equal(previous.get(id), false); assert.equal(current.get(id), true);
  for (const value of ids) if (value !== id) assert.equal(current.get(value), previous.get(value), value);
});
