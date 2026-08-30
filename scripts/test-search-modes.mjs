#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  acronymMatch,
  booleanCandidateIds,
  booleanCandidateClauses,
  booleanMatch,
  candidatePage,
  minimumMatchCount,
  proximityMatch,
} from '../src/lib/search-mode-core.mjs';

const tokens = 'alpha bright cedar delta echo foxtrot'.split(' ');

// Proximity is a real token-distance constraint, not merely all-words matching.
assert.equal(proximityMatch(tokens, [['alpha'], ['cedar']], 2), true);
assert.equal(proximityMatch(tokens, [['alpha'], ['delta']], 2), false);
assert.equal(proximityMatch(tokens, [['delta'], ['alpha']], 3), true, 'proximity is order-independent');

// Boolean operators retain conventional NOT > AND > OR clause semantics.
assert.equal(booleanMatch('faith joy prayer', 'faith AND joy NOT sorrow'), true);
assert.equal(booleanMatch('faith sorrow', 'faith AND joy OR sorrow'), true);
assert.equal(booleanMatch('faith sorrow', 'faith NOT sorrow'), false);
assert.deepEqual(booleanCandidateClauses('faith AND joy OR prayer NOT sorrow'), [
  { include: ['faith', 'joy'], exclude: [] },
  { include: ['prayer'], exclude: ['sorrow'] },
]);
assert.deepEqual(booleanCandidateClauses('faith && joy || !sorrow'), [
  { include: ['faith', 'joy'], exclude: [] },
  { include: [], exclude: ['sorrow'] },
]);

const documents = ['faith joy', 'faith sorrow', 'joy', 'peace'];
const postings = new Map();
documents.forEach((text, id) => text.split(' ').forEach(term => postings.set(term, [...(postings.get(term) || []), id])));
for (const query of ['NOT sorrow', 'faith OR NOT sorrow', 'faith && joy', 'faith || joy', '!faith']) {
  const candidates = booleanCandidateIds(postings, query, documents.map((_, id) => id)).sort((a, b) => a - b);
  const expected = documents.map((text, id) => booleanMatch(text, query) ? id : -1).filter(id => id >= 0);
  assert.deepEqual(candidates, expected, `candidate generation must equal booleanMatch for ${query}`);
}

const allIds = Array.from({ length: 1000 }, (_, id) => id);
const firstPage = candidatePage(allIds, 0, 192);
const secondPage = candidatePage(allIds, firstPage.cursor, 192);
assert.equal(firstPage.ids.length, 192, 'initial fetch budget is bounded');
assert.equal(firstPage.hasMore, true);
assert.equal(secondPage.ids[0], 192, 'cursor continuation must not skip candidates');
assert.deepEqual(candidatePage(allIds, 960, 192), { ids: allIds.slice(960), cursor: 1000, hasMore: false });

// Acronym/end-letter searches support consecutive and any-order modes, including
// Hebrew final-letter equivalence for end letters.
assert.deepEqual(acronymMatch(['apple', 'bright', 'cedar'], 'abc', 'consecutive'), { match: true, matchedWords: ['apple', 'bright', 'cedar'] });
assert.equal(acronymMatch(['cedar', 'apple', 'bright'], 'abc', 'consecutive').match, false);
assert.equal(acronymMatch(['cedar', 'apple', 'bright'], 'abc', 'any').match, true);
assert.equal(acronymMatch(['שלום', 'מלך'], 'מכ', 'consecutive', true).match, true, 'final kaf/mem must equal regular forms');
assert.equal(acronymMatch(['שלום', 'מלך'], 'כמ', 'any', true).match, true);

// minWords is clamped to the actual query group count and defaults to one.
assert.equal(minimumMatchCount(0, 4), 1);
assert.equal(minimumMatchCount(3, 4), 3);
assert.equal(minimumMatchCount(9, 4), 4);

console.log('Deterministic search mode regressions passed.');
