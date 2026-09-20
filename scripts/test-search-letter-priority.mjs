import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Letter-mode (acronym/end-letters) postings carry no relevance signal. The
// page must order candidates by book priority (Likutay Moharan first) before
// the early-stop verification loop, otherwise the first visible page is raw
// postings order and higher-priority matches stay behind Load more.
const source = readFileSync(new URL('../src/pages/search-enhanced.astro', import.meta.url), 'utf8');
const begin = source.indexOf('      async function letterModeSearch');
const end = source.indexOf('      async function clientSearch', begin);
const body = begin > 0 && end > begin ? source.slice(begin, end) : '';

test('letterModeSearch exists in search-enhanced.astro', () => {
  assert.ok(begin > 0 && end > begin, 'letterModeSearch block not found');
});

test('page imports orderByBookPriority from search-mode-core', () => {
  assert.match(source, /orderByBookPriority,/, 'missing import of orderByBookPriority');
});

test('letterModeSearch orders candidates by book priority from meta', () => {
  assert.match(
    body,
    /orderByBookPriority\(ids,\s*id => bookPriorityScore\(meta\.items\[id\] \|\| \{\}\)\)/,
    'letterModeSearch must apply orderByBookPriority over meta items'
  );
});

test('priority ordering runs after the advanced-books filter', () => {
  const filterAt = body.indexOf('allowed.has(bookIdFromPath');
  const orderAt = body.indexOf('orderByBookPriority');
  assert.ok(filterAt > 0, 'book filter not found');
  assert.ok(orderAt > filterAt, 'ordering must run after the book filter');
});
