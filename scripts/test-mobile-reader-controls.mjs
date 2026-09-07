import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const books = ['likutay-tefilos','sichos-haran','chayey-moharan','shivchay-haran','likutay-eitzos','ebay-hanachal'];
for (const book of books) test(`${book}: one unified audio player, no duplicate IDs`, () => {
  const page = read(`src/pages/reader/${book}/[part]/[torah].astro`);
  assert.equal((page.match(/id="audio-controls"/g) || []).length, 1);
  assert.equal((page.match(/src="\/unified-audio.js"/g) || []).length, 1);
  assert.equal((page.match(/id="audio-btn-he"/g) || []).length, 1);
  assert.equal((page.match(/id="audio-btn-en"/g) || []).length, 1);
});
test('progressive disclosure keeps original control nodes and keyboard access', () => {
  const js = read('public/reader-mobile.js');
  assert.match(js, /aria-expanded/);
  assert.match(js, /aria-controls/);
  assert.match(js, /Escape/);
  assert.match(js, /matchMedia/);
  assert.doesNotMatch(js, /innerHTML|cloneNode|remove\(/);
});
test('mobile styles wrap controls and restore previously hidden tools', () => {
  const css = read('public/reader-mobile.css');
  assert.match(css, /flex-wrap: wrap/);
  assert.match(css, /#btn-notes/);
  assert.match(css, /#btn-print/);
  assert.match(css, /#btn-share/);
  assert.match(css, /min-height: 44px/);
});
test('raw text links remain crawlable and available in native disclosure', () => {
  const layout = read('src/layouts/Layout.astro');
  assert.match(layout, /<details class="ai-reader-access/);
  assert.match(layout, /Text downloads &amp; AI access/);
  assert.match(layout, /reader-mobile\.js/);
  assert.match(layout, /reader-mobile\.css/);
  assert.match(layout, /complete work TXT/);
});
