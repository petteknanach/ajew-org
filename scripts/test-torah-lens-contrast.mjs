import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Regression guard for the scoped input hint, not an audit of the whole page.
const source = readFileSync(new URL('../src/pages/torah-lens.astro', import.meta.url), 'utf8');
function declarations(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...source.matchAll(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'g'))];
  assert.equal(matches.length, 1, `one owning rule for ${selector}`);
  return Object.fromEntries(matches[0][1].split(';').map(s => s.trim()).filter(Boolean).map(s => s.split(':').map(v => v.trim())));
}
function rgb(hex) {
  assert.match(hex, /^#[\da-f]{6}$/i);
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}
function luminance(color) {
  return color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}
function ratio(a, b) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + .05) / (lo + .05);
}

test('Torah Lens placeholder has normal-text contrast against its actual wrapper', () => {
  const wrapper = declarations('.input-wrapper');
  const input = declarations('.input-wrapper input');
  const hint = declarations('.input-wrapper input::placeholder');
  assert.equal(input.background, 'transparent');
  const contrast = ratio(rgb(hint.color), rgb(wrapper.background));
  assert.ok(contrast >= 4.5, `placeholder contrast ${contrast.toFixed(3)}:1 is below 4.5:1`);
  assert.equal(hint.opacity, '1', 'explicit opacity avoids UA-dependent dimming');
});

test('Original faint placeholder fails the same contrast gate', () => {
  assert.ok(ratio(rgb('#6a6a8a'), rgb('#2a2a4e')) < 4.5);
});
