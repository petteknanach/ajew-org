import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Ordinary invocation: node --test scripts/test-help-night-contrast.mjs
const source = readFileSync(process.env.HELP_SOURCE || new URL('../src/pages/help-me.astro', import.meta.url), 'utf8');
const style = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(style, 'actual Help route style block exists');
const rules = [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), declarations: m[2].trim() }));
const base = rules.find((r) => r.selector === '.section-title');
const color = (rule) => rule?.declarations.match(/(?:^|;)\s*color:\s*(#[\da-f]{6})\s*;/i)?.[1];
const luminance = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (fg, bg) => {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

test('the route has exactly four section headings inside the Help page', () => {
  const markup = source.slice(source.indexOf('<div class="help-page">'), source.lastIndexOf('</Layout>'));
  const headings = [...markup.matchAll(/<h2 class="section-title">([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.deepEqual(headings, ['In the Heat of the Moment', 'Feeling Down or Hopeless', 'Need Daily Structure', 'Just Begin']);
  assert.equal((markup.match(/class="section-title"/g) || []).length, 4);
});

test('the original day heading style remains intact', () => {
  assert.equal(base?.declarations, "font-family: 'Frank Ruhl Libre', serif; color: #1a365d; font-size: 1.3em; border-bottom: 2px solid #e0d6c2; padding-bottom: 8px; margin-top: 30px; margin-bottom: 16px;");
});

test('both night theme ancestors give only Help headings sufficient contrast', () => {
  const selectors = [':global([data-theme="night"]) .help-page .section-title', ':global(body.dark-mode) .help-page .section-title'];
  const overrides = rules.filter((r) => r.selector.includes('.help-page .section-title'));
  // The unchanged actual Layout night background is #1a1a2e. At 1.3em/700
  // these are large headings; WCAG AA requires at least 3:1.
  for (const selector of selectors) {
    const rule = overrides.find((r) => r.selector.split(',').map((s) => s.trim()).includes(selector));
    const effective = color(rule) || color(base);
    assert.ok(contrast(effective, '#1a1a2e') >= 3, `${selector}: ${effective} has ${contrast(effective, '#1a1a2e')}:1 against #1a1a2e; requires 3:1`);
  }
  assert.equal(overrides.length, 1, 'one additive route-local rule');
  assert.deepEqual(overrides[0].selector.split(',').map((s) => s.trim()), selectors);
  assert.match(overrides[0].declarations, /^color:\s*#[\da-f]{6};$/i, 'only the color property changes');
});
