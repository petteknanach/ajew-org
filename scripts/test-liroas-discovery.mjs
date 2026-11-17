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
