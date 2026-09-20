import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The tzion picture and hu-aish sheley fire must stay fully present for every
// user, but users who opt out of motion (prefers-reduced-motion: reduce) must
// get the fire at rest instead of an infinite animation (WCAG 2.3.3).
const fire = readFileSync(new URL('../src/styles/hero-fire.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');

test('hero-fire.css disables fire animations under prefers-reduced-motion', () => {
  assert.match(fire, /@media \(prefers-reduced-motion: reduce\)/, 'missing reduced-motion media query');
  const block = fire.slice(fire.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(block, /\.fire-text[\s\S]*animation: none !important;/, '.fire-text must hold at rest (with !important to beat scoped rules)');
  assert.match(block, /\.fire-embers::before/, 'embers must be covered');
});

test('index.astro hero fire elements hold at rest under reduced motion', () => {
  const block = index.slice(index.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(block.length > 0, 'missing reduced-motion block in index.astro');
  assert.match(block, /\.hero-nanach[\s\S]*\.huaish-sheli-img[\s\S]*\{[\s\S]*animation: none !important;/,
    'hero fire elements must be covered');
});

test('the fire elements themselves are NOT hidden or removed', () => {
  // preservation: only animation/transition may be disabled — never display/content
  const m = index.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'media block not found');
  assert.doesNotMatch(m[0], /display:\s*none|visibility:\s*hidden|content:\s*none/, 'fire must stay present');
});
