import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// loadDoc: a transient NETWORK error must be retried once (bounded), while a
// non-ok response (document genuinely missing) stays single-shot. Without the
// retry, one dropped request silently removes a real result from that search.
const source = readFileSync(new URL('../src/pages/search-enhanced.astro', import.meta.url), 'utf8');
const begin = source.indexOf('      async function loadDoc');
const end = source.indexOf('      function groupMatchesText', begin);
const body = begin > 0 && end > begin ? source.slice(begin, end) : '';

test('loadDoc block exists in search-enhanced.astro', () => {
  assert.ok(begin > 0 && end > begin, 'loadDoc block not found');
});

test('loadDoc retries network errors once (bounded loop)', () => {
  assert.match(body, /for \(let attempt = 0; attempt < 2; attempt\+\+\)/, 'missing bounded 2-attempt loop');
  assert.match(body, /if \(attempt === 0\)/, 'retry must happen only on the first failure');
  assert.match(body, /setTimeout\(res, 300\)/, 'missing small backoff before retry');
});

test('non-ok responses still return null immediately (no retry on 404)', () => {
  const okAt = body.indexOf('if (!r.ok) return null;');
  assert.ok(okAt > 0, 'missing immediate null on !r.ok');
});

test('final failure still returns null (search never aborts)', () => {
  assert.match(body, /return null;/, 'loadDoc must fail open per document');
});
