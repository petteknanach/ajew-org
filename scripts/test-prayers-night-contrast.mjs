import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Optional source operand supports RED/GREEN diagnostics; ordinary invocation
// needs only this repository, Node, and the actual route source.
const source = readFileSync(process.env.PRAYERS_SOURCE || fileURLToPath(new URL('../src/pages/prayers.astro', import.meta.url)), 'utf8');
const style = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(style, 'actual scoped route stylesheet exists');
const rules = [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].trim().split(',').map(s => s.trim()), declarations: Object.fromEntries([...m[2].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map(d => [d[1], d[2].trim()])) }));
const cases = [
  ['Hebrew topic label', '.topic-index-he', '#7c5b16'],
  ['references and verification notices', '.topic-refs', '#687080'],
  ['reference link', '.topic-refs a', '#0f766e'],
  ['Open prayer link', 'a', '#0f766e'],
];
function palette(descendant, night) {
  let value;
  const suffixes = new Set([descendant, `.topic-index-card ${descendant}`, ...(descendant.endsWith(' a') ? ['a', '.topic-index-card a'] : [])]);
  for (const rule of rules) for (let selector of rule.selectors) {
    const dark = selector.includes('dark-mode') || selector.includes('data-theme="night"');
    if (dark && !night) continue;
    selector = selector.replace(/:global\(([^)]+)\)/g, '$1').replace(/^(?:body\.dark-mode|\[data-theme="night"\])\s+/, '');
    if (suffixes.has(selector) && rule.declarations.color) value = rule.declarations.color;
  }
  return value;
}
function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }

test('day topic-card colors remain unchanged', () => {
  for (const [, selector, original] of cases) assert.equal(palette(selector, false), original);
});
for (const [name, selector] of cases) test(`night ${name} meets 4.5:1`, () => {
  const foreground = palette(selector, true);
  const background = rules.filter(r => r.selectors.some(s => s.includes('dark-mode') && s.endsWith('.topic-index-card'))).at(-1)?.declarations.background;
  assert.equal(background, '#22223a', 'unchanged actual night card background');
  const ratio = contrast(foreground, background);
  assert.ok(ratio >= 4.5, `${name}: ${foreground} against ${background} = ${ratio.toFixed(6)}:1, requires 4.5:1`);
});
test('night overrides for measured descendants are card-bounded color only', () => {
  for (const rule of rules) if (rule.selectors.some(s => s.includes(':global(') && /(?:topic-index-he|topic-refs|card a)$/.test(s))) {
    assert.deepEqual(Object.keys(rule.declarations), ['color']);
    for (const selector of rule.selectors) assert.match(selector, /^:global\((?:body\.dark-mode|\[data-theme="night"\])\) \.topic-index-card (?:\.topic-index-he|\.topic-refs|a)$/);
  }
});
