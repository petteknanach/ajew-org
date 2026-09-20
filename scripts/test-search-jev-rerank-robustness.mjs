import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The Jev re-rank on /search-enhanced must never delay first result render: the
// /jev/rank fetch originally had no timeout, so a hanging proxy blocked
// displayResults indefinitely. Verdicts must also survive Load more — the
// accumulated re-render used to discard the first-30 Jev order entirely.
const source = readFileSync(new URL('../src/pages/search-enhanced.astro', import.meta.url), 'utf8');

test('jev re-rank fetches are bounded by an AbortController timeout', () => {
  assert.match(source, /new AbortController\(\)/, 'missing AbortController');
  assert.match(source, /setTimeout\(\(\) => ctrl\.abort\(\), 1500\)/, 'missing 1500ms abort timer');
  assert.match(source, /jevFetch\('\/jev\/rank'/, '/jev/rank must go through the bounded jevFetch helper');
  assert.match(source, /jevFetch\('\/jev-config\.json'/, '/jev-config.json must go through the bounded jevFetch helper');
});

test('jev verdicts persist across Load more re-renders', () => {
  assert.match(source, /const jevPStore = new WeakMap/, 'missing verdict store');
  assert.match(source, /jevPStore\.set\(finalResults\[t\._i\], p\)/, 'verdicts must be stored on the original result objects');
  assert.match(source, /results = applyJevOrder\(results\);/, 'displayResults must apply the persisted Jev order');
});

test('the ?nojev=1 bypass is preserved', () => {
  assert.match(source, /has\('nojev'\)/, 'nojev bypass missing');
});

test('failure-safe fallback preserved (catch around re-rank)', () => {
  assert.match(source, /Jev re-rank skipped:/, 'failure-safe catch missing');
});
