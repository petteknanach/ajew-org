import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const books = [
  ['azamra', 'section', 30],
  ['fires-of-israel', 'section', 59],
  ['hisbodidus-alone-time', 'section', 42],
  ['seven-pillars', 'section', 3],
  ['sichos-haran', 'sicha', 308],
];
const pages = new Map(books.map(([book]) => {
  const page = fs.readFileSync(path.join(root, `src/pages/reader/${book}/[part]/[torah].astro`), 'utf8');
  const frontmatter = page.split('---')[1].replace(/^import .*;\r?\n/gm, '')
    .replace('export function getStaticPaths()', 'function getStaticPaths()');
  return [book, { page, frontmatter }];
}));

// Complete actual page frontmatter and genuine source files, not extracted
// navigation helpers. No source file, process cwd or user state is mutated.
function initialize(book, stem, number, overrideNavigation) {
  const sourcePath = path.join(root, `public/reader/${book}/${stem}-${number}.json`);
  const raw = fs.readFileSync(sourcePath);
  const original = JSON.parse(raw);
  const reader = overrideNavigation ? {
    ...fs,
    readFileSync(file) {
      assert.equal(file, sourcePath);
      return JSON.stringify({ ...original, navigation: overrideNavigation });
    },
  } : fs;
  const context = vm.createContext({ fs: reader, path, process: { cwd: () => root }, Astro: { params: { part: '1', torah: String(number) } } });
  vm.runInContext(`${pages.get(book).frontmatter}\nglobalThis.result = { torahData, error };`, context);
  assert.equal(context.result.error, null);
  const data = JSON.parse(JSON.stringify(context.result.torahData));
  const expected = { ...original, navigation: data.navigation,
    segments: original.segments.map((segment, i) => ({ ...segment, index: segment.index || i + 1 })) };
  assert.deepEqual(data, expected, `${book}:${number}: all non-navigation fields conserved`);
  assert.equal(fs.readFileSync(sourcePath).equals(raw), true);
  return data;
}

for (const [book, stem, last] of books) {
  test(`${book}: terminal Next is disabled in both navigation bars`, () => {
    assert.equal(fs.existsSync(path.join(root, `public/reader/${book}/${stem}-${last + 1}.json`)), false);
    const data = initialize(book, stem, last);
    assert.equal(data.navigation.nextUrl, null);
    assert.equal(data.navigation.prevUrl, `/reader/${book}/1/${last - 1}`);
    assert.equal(pages.get(book).page.split('{torahData.navigation.nextUrl ? (').length - 1, 2);
    assert.equal(pages.get(book).page.split('<span class="disabled">Next &rarr;</span>').length - 1, 2);
  });

  test(`${book}: penultimate Next still reaches the actual final source`, () => {
    const data = initialize(book, stem, last - 1);
    assert.equal(data.navigation.nextUrl, `/reader/${book}/1/${last}`);
  });

  test(`${book}: every genuine section retains complete data and valid navigation`, () => {
    const dir = path.join(root, 'public/reader', book);
    const numbers = fs.readdirSync(dir).map(file => file.match(new RegExp(`^${stem}-(\\d+)\\.json$`)))
      .filter(Boolean).map(match => Number(match[1])).sort((a, b) => a - b);
    assert.deepEqual(numbers, Array.from({ length: last }, (_, i) => i + 1));
    for (const number of numbers) {
      const data = initialize(book, stem, number);
      const original = JSON.parse(fs.readFileSync(path.join(dir, `${stem}-${number}.json`)));
      const expected = original.navigation || {
        prevUrl: number > 1 ? `/reader/${book}/1/${number - 1}` : null,
        nextUrl: `/reader/${book}/1/${number + 1}`,
      };
      assert.deepEqual(data.navigation, { ...expected, nextUrl: number === last ? null : expected.nextUrl });
      for (const key of ['prevUrl', 'nextUrl']) {
        const url = data.navigation[key];
        if (!url) continue;
        const match = url.match(new RegExp(`^/reader/${book}/1/(\\d+)/?$`));
        assert.ok(match, `${book}:${number}: ${key} is an existing numeric route`);
        assert.ok(fs.existsSync(path.join(dir, `${stem}-${Number(match[1])}.json`)), url);
      }
    }
  });

  test(`${book}: explicit source null Next is never replaced by fallback`, () => {
    const navigation = { prevUrl: null, nextUrl: null, sourceMarker: 'explicit-navigation-fixture' };
    assert.deepEqual(initialize(book, stem, 1, navigation).navigation, navigation);
  });
}
