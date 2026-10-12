import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transform } = require('@astrojs/compiler');
const postcss = require('postcss');
const sourcePath = process.env.LIBRARY_ASTRO_PATH || fileURLToPath(new URL('../src/pages/library.astro', import.meta.url));
const source = fs.readFileSync(sourcePath, 'utf8');
const styles = [...source.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)];
const css = postcss.parse(styles.map(m => m[2]).join('\n'));
const rail = css.nodes.find(n => n.type === 'atrule' && n.name === 'media' && n.params === '(min-width: 1024px)');
const declarations = rule => Object.fromEntries((rule?.nodes || []).filter(n => n.type === 'decl').map(n => [n.prop, n.value]));
const rule = selector => rail?.nodes.find(n => n.type === 'rule' && n.selector === selector);

test('library desktop catalog reserves the 88px right utility rail', () => {
  assert.ok(rail, 'desktop-only clearance media query exists');
  assert.deepEqual(declarations(rule('.library-page .main-content')), { 'padding-right': '88px' });
});

test('library prayer and back-to-top use the existing idle utility column', () => {
  assert.deepEqual(declarations(rule(':global(body:has(.library-page) .hitbodedut-fab)')), { right: '20px', bottom: '144px' });
  assert.deepEqual(declarations(rule(':global(body:has(.library-page) #backToTop)')), { right: '26px', bottom: '216px' });
});

test('desktop clearance has only the three route-local rules and no mobile override', () => {
  assert.ok(rail);
  assert.deepEqual(rail.nodes.filter(n => n.type !== 'comment').map(n => n.selector), [
    '.library-page .main-content',
    ':global(body:has(.library-page) .hitbodedut-fab)',
    ':global(body:has(.library-page) #backToTop)',
  ]);
  assert.equal(styles.length, 1);
  assert.doesNotMatch(styles[0][1], /is:global/);
  assert.doesNotMatch(rail.toString(), /!important|(?:^|[;{])\s*(?:display|position|width|height)\s*:|voice-input|page-agent|compactYahrzeit/);
});

test('library does not replace, move, or register handlers on shared utility nodes', () => {
  const nonStyle = source.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
  assert.doesNotMatch(nonStyle, /backToTop|hitbodedut-fab|voice-input-btn|page-agent-toggle|compactYahrzeit/);
  assert.match(nonStyle, /href=\{file\.url\} class="file-card"/);
  assert.match(nonStyle, /searchInput\.dispatchEvent\(new Event\('input'\)\)/);
  assert.match(nonStyle, /searchInput\.focus\(\)/);
});

test('actual Astro compiler emits valid global route predicates that can win the shared cascade', async () => {
  const compiled = await transform(source, { filename: sourcePath });
  assert.deepEqual(compiled.diagnostics.filter(d => d.severity === 1), []);
  const emitted = postcss.parse(compiled.css.join('\n'));
  const matching = [];
  emitted.walkRules(r => {
    assert.doesNotMatch(r.selector, /:global\(/, 'Astro global syntax is resolved');
    if (r.selector === 'body:has(.library-page) .hitbodedut-fab' || r.selector === 'body:has(.library-page) #backToTop') matching.push(r);
  });
  assert.equal(matching.length, 2);
  for (const r of matching) {
    assert.equal(r.parent.name, 'media');
    assert.equal(r.parent.params, '(min-width: 1024px)');
    assert.doesNotMatch(r.selector, /data-astro/, 'foreign utility nodes must not require the library scope attribute');
  }
  // Prayer predicate specificity (0,2,1) beats the owning scoped class
  // (0,2,0); back-to-top predicate (1,1,1) beats Layout's ID/class rules.
  assert.deepEqual(declarations(matching.find(r => r.selector.endsWith('.hitbodedut-fab'))), { right: '20px', bottom: '144px' });
});
