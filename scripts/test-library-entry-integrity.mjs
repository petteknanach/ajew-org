import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sourcePath = process.env.LIBRARY_ASTRO_PATH || fileURLToPath(new URL('../src/pages/library.astro', import.meta.url));
const source = fs.readFileSync(sourcePath, 'utf8');
const expected = {
  'likutay-moharan': '/reader/likutay-moharan/1/1',
  'sefer-hamidos': '/reader/sefer-hamidos/1/1',
  'sipurey-maasiyos': '/reader/sipurey-maasiyos/1/1',
  'likutay-halachos': '/reader/likutay-halachos/1/1',
  'likutay-tefilos': '/reader/likutay-tefilos/1/1',
  'likutay-eitzos': '/reader/likutay-eitzos/1/1',
  'chayey-moharan': '/reader/chayey-moharan/1/1',
  'shivchay-sichos': '/reader/shivchay-haran/1/1',
  'yemei-moharnat': '/reader/yemei-moharnat/1/1',
  'alim-litrufa': '/reader/alim-litrufa/1/1',
  'hashtatfchus-meshivas': '/reader/hashtatfchus-hanefesh/1/1',
  'parparos-commentary': '/reader/parparos-lechochma/1/1',
  'kokhvei-or': '/reader/kokhvei-or/1/1',
  'siach-sarfei-kodesh': '/reader/siach-sarfei-kodesh/1/1',
};

function readerLinks() {
  const block = source.match(/const readerLinks: Record<string, string> = \{([\s\S]*?)\n\};/);
  assert.ok(block, 'reader destination map exists');
  return Object.fromEntries([...block[1].matchAll(/'([^']+)': '([^']+)'/g)].map(m => [m[1], m[2]]));
}

test('all fourteen PDF-library Reader entries use the existing numeric routes', () => {
  assert.deepEqual(readerLinks(), expected);
});

test('Reader entries never confuse JSON part/volume directories with page routes', () => {
  for (const route of Object.values(readerLinks())) assert.doesNotMatch(route, /\/(?:part|vol)-\d+\//);
});

test('the shared Layout owns the sole main landmark', () => {
  assert.match(source, /<Layout\b/);
  assert.doesNotMatch(source, /<\/?main\b/i);
  assert.match(source, /<div class="main-content">/);
});

test('PDF destinations and online Reader badges keep separate source contracts', () => {
  assert.match(source, /href=\{file\.url\} class="file-card"/);
  assert.match(source, /href=\{readerLinks\[cat\.id\]\} class="reader-badge"/);
  assert.match(source, /id="library-search"/);
  assert.match(source, /id="clear-search"/);
});

test('the actual library Astro template compiles without error diagnostics', async () => {
  const { transform } = require('@astrojs/compiler');
  const compiled = await transform(source, { filename: sourcePath });
  assert.ok(compiled.code.length > 0);
  assert.deepEqual(compiled.diagnostics.filter(d => d.severity === 1), []);
});
