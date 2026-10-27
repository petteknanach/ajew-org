import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {matchWindowAround} from '../src/lib/search-mode-core.mjs';

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
  const filterAt = body.indexOf('allowed.has(bookIdFromSearchItem(meta.items[id]))');
  const orderAt = body.indexOf('orderByBookPriority');
  assert.ok(filterAt > 0, 'book filter not found');
  assert.ok(orderAt > filterAt, 'ordering must run after the book filter');
});

// Letter-mode snippets must center on the matched word cluster (so the
// "Found:" highlight marks are actually visible), not the document head.
test('letterModeSearch centers snippets on the matched words', () => {
  assert.match(body, /letterMatchContext\(doc, hit\)/, 'verify must use letterMatchContext');
  assert.match(body, /link: \(doc\.p \|\| '#'\) \+ context\.anchor/, 'letter results must carry the segment anchor');
  assert.doesNotMatch(body, /snippet: raw\.slice\(0, 420\)/, 'document-head snippets must not return');
});

test('matchContext shares the snippet builder and page imports matchWindowAround', () => {
  const mcBegin = source.indexOf('      function matchContext');
  const mcEnd = source.indexOf('      function snippetForRange', mcBegin);
  assert.ok(mcBegin > 0 && mcEnd > mcBegin, 'matchContext must precede snippetForRange');
  assert.match(source.slice(mcBegin, mcEnd), /return snippetForRange\(/, 'matchContext must reuse snippetForRange');
  assert.match(source, /matchWindowAround,/, 'page must import matchWindowAround');
  assert.match(source, /const range = normalizedRange\(raw, words\.join\(' '\), true\) \|\| matchWindowAround\(raw, words\)/, 'letterMatchContext must use the shared window helper');
});

// Run the genuine page definitions with a range-observing snippet provider.
// These are provided-interface locator controls, not native search or paint.
function actualLocatorFixture() {
  const definition = name => {
    const match = source.match(new RegExp('^ {6}function ' + name + '\\(.*?^ {6}\\}', 'ms'));
    assert.ok(match, 'Missing complete actual ' + name);
    return match[0];
  };
  const code = ['normalizeForSearch', 'normalizedRange', 'letterMatchContext'].map(definition).join('\n');
  return new Function('matchWindowAround', 'snippetForRange', code + '\nreturn {normalizedRange,letterMatchContext};')(
    matchWindowAround, (_doc, _raw, range) => range,
  );
}

test('letter context prefers the whole sequence instead of scattered earlier words', () => {
  const actual = actualLocatorFixture();
  const phrase = 'אבל באמת כל אשר';
  const raw = 'אשר דבר. אבל גם. באמת עוד. כל פעם. ' + phrase + ' סוף';
  const range = actual.letterMatchContext({he: raw, en: ''}, {matchedWords: phrase.split(' ')});
  const start = raw.indexOf(phrase);
  assert.deepEqual(range, {start, end: start + phrase.length});
});

test('whole-word locator rejects partial occurrences and preserves ordinary defaults', () => {
  const {normalizedRange} = actualLocatorFixture();
  const raw = 'xxalpha betamax; alpha beta';
  const phrase = 'alpha beta';
  const start = raw.lastIndexOf(phrase);
  assert.deepEqual(normalizedRange(raw, phrase, true), {start, end: start + phrase.length});
  assert.deepEqual(normalizedRange(raw, phrase), {start: 2, end: 2 + phrase.length});
  assert.equal(normalizedRange('xxalpha beta', phrase, true), null);
  assert.equal(normalizedRange('alpha betamax', phrase, true), null);
});
