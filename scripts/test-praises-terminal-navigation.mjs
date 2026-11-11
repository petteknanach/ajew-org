import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const page = fs.readFileSync(new URL('../src/pages/reader/praises-of-rabbi-nachman/[part]/[torah].astro', import.meta.url), 'utf8');
const frontmatter = page.split('---')[1]
  .replace(/^import .*;\r?\n/gm, '')
  .replace('export function getStaticPaths()', 'function getStaticPaths()');

// Execute the complete real page frontmatter with genuine on-disk source JSON.
// Only a separate explicit-navigation case doubles the parsed input to verify
// that existing source navigation is not replaced by fallback generation.
function initialize(section, explicitNavigation) {
  const sourcePath = path.join(root, `public/reader/praises-of-rabbi-nachman/section-${section}.json`);
  const original = fs.readFileSync(sourcePath);
  let reads = 0;
  const reader = explicitNavigation ? {
    ...fs,
    readFileSync(file, encoding) {
      assert.equal(file, sourcePath);
      reads++;
      return JSON.stringify({ ...JSON.parse(original), navigation: explicitNavigation });
    },
  } : fs;
  const context = vm.createContext({ fs: reader, path, process: { cwd: () => root }, Astro: { params: { part: '1', torah: String(section) } } });
  vm.runInContext(`${frontmatter}\n globalThis.result = { torahData, error, paths: getStaticPaths() };`, context);
  assert.equal(context.result.error, null);
  const expectedSegments = JSON.parse(original).segments.map((segment, i) => ({ ...segment, index: segment.index || i + 1 }));
  assert.deepEqual(JSON.parse(JSON.stringify(context.result.torahData.segments)), expectedSegments);
  assert.equal(fs.readFileSync(sourcePath).equals(original), true);
  if (explicitNavigation) assert.equal(reads, 1);
  return JSON.parse(JSON.stringify(context.result));
}

test('Praises last real section disables Next instead of linking to absent section 4', () => {
  assert.equal(fs.existsSync(path.join(root, 'public/reader/praises-of-rabbi-nachman/section-4.json')), false);
  const { torahData } = initialize(3);
  assert.equal(torahData.navigation.nextUrl, null);
  assert.equal(torahData.navigation.prevUrl, '/reader/praises-of-rabbi-nachman/1/2');
});

test('Praises genuine earlier sections retain consecutive reading and first Previous is disabled', () => {
  for (const section of [1, 2]) {
    const { torahData } = initialize(section);
    assert.equal(torahData.navigation.nextUrl, `/reader/praises-of-rabbi-nachman/1/${section + 1}`);
    assert.ok(fs.existsSync(path.join(root, `public/reader/praises-of-rabbi-nachman/section-${section + 1}.json`)));
    assert.equal(torahData.navigation.prevUrl, section === 1 ? null : '/reader/praises-of-rabbi-nachman/1/1');
  }
});

test('Praises source-supplied navigation remains authoritative', () => {
  const navigation = { prevUrl: '/reader/praises-of-rabbi-nachman/1/1', nextUrl: null };
  assert.deepEqual(initialize(2, navigation).torahData.navigation, navigation);
});

test('Praises both navigation bars share the availability result and route generation is unchanged', () => {
  assert.equal(page.split('{torahData.navigation.nextUrl ? (').length - 1, 2);
  assert.equal(page.split('<span class="disabled">Next &rarr;</span>').length - 1, 2);
  assert.deepEqual(initialize(3).paths, [1, 2, 3, 4, 5].map(torah => ({ params: { part: '1', torah: String(torah) } })));
});
