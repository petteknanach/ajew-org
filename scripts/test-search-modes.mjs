#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  acronymMatch,
  booleanCandidateIds,
  booleanCandidateClauses,
  booleanMatch,
  candidatePage,
  matchWindowAround,
  minimumMatchCount,
  orderByBookPriority,
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

// Letter-mode candidates are verified highest-book-priority first so Likutay
// Moharan and core works surface in the first page; ties keep postings order.
const priorityById = new Map([
  [11, 220], [4, 220], [7, 150], [0, 150], [3, 0], [12, 0],
]);
const ordered = orderByBookPriority([3, 7, 11, 0, 4, 12], id => priorityById.get(id));
assert.deepEqual(ordered, [11, 4, 7, 0, 3, 12], 'highest priority first, postings order within a tier');
assert.deepEqual(orderByBookPriority([], () => 5), [], 'empty candidate list stays empty');
assert.deepEqual(
  orderByBookPriority([9, 2], () => 0),
  [9, 2],
  'all-equal priorities keep the original postings order'
);
assert.deepEqual(orderByBookPriority([1, 2], () => undefined), [1, 2], 'missing priority behaves as zero');

// Letter-mode snippets center on the matched words: the window covers the
// tightest leading cluster of first occurrences, folds nikud/punctuation like
// the rest of the search pipeline, and bounds any-order spread via the gap.
const rawText = 'The king said: תּוּכַל מֶלֶךְ, and later grain madness spread. תוכל appears again far away.';
const clusterRange = matchWindowAround(rawText, ['תוכל', 'מלך']);
assert.equal(clusterRange.start, rawText.indexOf('תּ'), 'nikud folded, window starts at the first matched word');
assert.ok(
  clusterRange.end > rawText.indexOf('מֶלֶךְ') && clusterRange.end <= rawText.indexOf(','),
  'window extends through the second matched word, stopping at the cluster'
);
// The far-away second occurrence must NOT widen the window past the cluster.
assert.ok(matchWindowAround(rawText, ['תוכל', 'מלך']).end < rawText.indexOf('far'), 'window stays near the first cluster');
assert.deepEqual(matchWindowAround(rawText, ['nonexistent']), null, 'no words found yields null');
assert.deepEqual(matchWindowAround('', ['word']), null, 'empty raw yields null');
assert.deepEqual(matchWindowAround(rawText, []), null, 'empty words yields null');
const spread = 'alpha one beta two gamma three delta four';
// 'alpha' and 'delta' are > 800 normalized chars apart? No — small text; use gap to prove the bound:
assert.deepEqual(matchWindowAround(spread, ['alpha', 'delta'], 5), { start: 0, end: 5 }, 'gap stops window at the first cluster');
const wide = matchWindowAround(spread, ['alpha', 'delta'], 800);
assert.equal(wide.end, spread.indexOf('four') - 1, 'wide gap covers both occurrences, ending at the last matched word');
assert.deepEqual(matchWindowAround('repeat repeat', ['repeat']), { start: 0, end: 6 }, 'duplicate words collapse to first occurrence');


console.log('Deterministic search mode regressions passed.');
