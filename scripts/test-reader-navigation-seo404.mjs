import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { test, after } from 'node:test';
import { normalizeReaderNavigation } from '../src/lib/reader-navigation.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'reader-navigation-'));
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const book = 'zohar-tikunim';
const contentDir = path.join(scratch, 'public/reader', book, 'part-1');
fs.mkdirSync(contentDir, { recursive: true });
for (const n of [0, 1, 2, 35, 36, 37, 38, 39, 332, 333, 334]) {
  fs.writeFileSync(path.join(contentDir, `torah-${n}.json`), JSON.stringify({ number: n, segments: [] }));
}
const options = { book, part: 1, torah: 37, minTorah: 1, maxTorah: 333, contentDir };
const empty = { prevUrl: null, nextUrl: null };
const url = suffix => `/reader/${book}/${suffix}`;
const normalize = (navigation, overrides = {}) => normalizeReaderNavigation(navigation, { ...options, ...overrides });

// Observed public source navigation at /reader/zohar-tikunim/1/37/.
const observed = Object.freeze({ prevUrl: url('part-1/36'), nextUrl: url('part-1/38') });
const expected = { prevUrl: url('1/36'), nextUrl: url('1/38') };

test('legacy same-book URLs become the exact existing numeric neighbors', () => {
  assert.deepEqual(normalize(observed), expected);
});
test('filesystem torah-N filenames and trailing slashes normalize without offsets', () => {
  for (const suffix of ['torah-36', 'torah-36.json', 'torah-36.json/', '36/']) {
    assert.equal(normalize({ prevUrl: url(`part-1/${suffix}`) }).prevUrl, url('1/36'));
  }
});
test('numeric URLs are preserved and normalization is idempotent', () => {
  const numeric = { prevUrl: url('1/36/'), nextUrl: url('1/38') };
  assert.deepEqual(normalize(numeric), numeric);
  assert.deepEqual(normalize(normalize(observed)), expected);
});
test('first and last route bounds disable neighbors even when files exist', () => {
  assert.deepEqual(normalize({ prevUrl: url('part-1/0'), nextUrl: url('part-1/2') }, { torah: 1 }), {
    prevUrl: null, nextUrl: url('1/2'),
  });
  assert.deepEqual(normalize({ prevUrl: url('part-1/332'), nextUrl: url('part-1/334') }, { torah: 333 }), {
    prevUrl: url('1/332'), nextUrl: null,
  });
});
test('missing navigation and explicit no-next never synthesize links', () => {
  for (const navigation of [undefined, null, {}, { prevUrl: null, nextUrl: '' }]) assert.deepEqual(normalize(navigation), empty);
  assert.deepEqual(normalize({ prevUrl: url('part-1/36'), nextUrl: null }), { prevUrl: url('1/36'), nextUrl: null });
});
test('a generated route requires the exact existing torah-N.json file', () => {
  assert.deepEqual(normalize(observed, { contentDir: path.join(scratch, 'absent') }), empty);
  const dir = path.join(scratch, 'sparse');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'torah-36.json'), '{}');
  fs.mkdirSync(path.join(dir, 'torah-38.json'));
  fs.writeFileSync(path.join(dir, 'torah-39.json'), '{}');
  assert.deepEqual(normalize(observed, { contentDir: dir }), { prevUrl: url('1/36'), nextUrl: null });
});
test('wrong source numbers and directions are refused rather than shifted', () => {
  for (const suffix of ['part-1/35', 'part-1/37', 'part-1/38', 'part-1/333', 'part-2/36']) {
    assert.equal(normalize({ prevUrl: url(suffix) }).prevUrl, null);
  }
});
test('external, unrelated, encoded, traversal and malformed targets are refused', () => {
  for (const raw of [
    'https://ajew.org' + url('part-1/36'), '//evil.example/reader/zohar-tikunim/part-1/36',
    'https://evil.example', 'javascript:alert(1)', '/reader/other/part-1/36', '/reader',
    url('part-1/../36'), url('part-1/%33%36'), url('part-01/36'), url('part-1/036'),
    url('part-1/36?x=1'), url('part-1/36#seg-1'), url('part-1/36/extra'),
    url('part-1/36') + '\n', ' ' + url('part-1/36'), {}, 36,
  ]) assert.equal(normalize({ prevUrl: raw }).prevUrl, null, JSON.stringify(raw));
});
test('invalid route context fails closed', () => {
  for (const overrides of [
    { book: '../zohar-tikunim' }, { book: '' }, { part: '1' }, { part: 0 },
    { torah: NaN }, { torah: 334 }, { minTorah: -1 }, { maxTorah: 0 }, { contentDir: '' },
  ]) assert.deepEqual(normalize(observed, overrides), empty);
});
test('navigation input and exact source filename bytes are conserved', () => {
  const before = fs.readFileSync(path.join(contentDir, 'torah-36.json'));
  normalize(observed);
  assert.deepEqual(observed, { prevUrl: url('part-1/36'), nextUrl: url('part-1/38') });
  assert.deepEqual(fs.readFileSync(path.join(contentDir, 'torah-36.json')), before);
  assert.equal(fs.existsSync(path.join(contentDir, '36.json')), false);
});

const zoharTemplate = 'src/pages/reader/zohar-tikunim/[part]/[torah].astro';
function readTemplate(relative) {
  // Optional historical-template control. Helper remains the successor helper:
  // this is a template-seam RED comparison, not an old full-site build.
  return process.env.READER_TEMPLATE_REF
    ? execFileSync('git', ['show', `${process.env.READER_TEMPLATE_REF}:${relative}`], { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 })
    : fs.readFileSync(path.join(root, relative), 'utf8');
}
function templateNavigation(source, navigation) {
  const seam = source.match(/const readerNavigation = normalizeReaderNavigation\([\s\S]*?\n\}\);/);
  if (!seam) return navigation;
  return new Function('normalizeReaderNavigation', 'torahData', 'partNum', 'torahNum', 'path', 'process',
    seam[0] + '\nreturn readerNavigation;')(
    normalizeReaderNavigation, { navigation }, 1, 37, path, { cwd: () => scratch },
  );
}
test('Zohar template seam resolves observed previous/next to public routes', () => {
  assert.deepEqual(templateNavigation(readTemplate(zoharTemplate), observed), expected);
});
test('both Zohar navigation bars use the normalized condition and href', () => {
  const source = readTemplate(zoharTemplate);
  for (const direction of ['prev', 'next']) {
    assert.equal([...source.matchAll(new RegExp(`href=\\{readerNavigation\\.${direction}Url\\}`, 'g'))].length, 2);
    assert.equal([...source.matchAll(new RegExp(`\\{readerNavigation\\.${direction}Url \\?`, 'g'))].length, 2);
  }
  assert.ok(!source.includes('href={torahData.navigation.'));
});

const loopPattern = /for \(let torah = (\d+); torah <= (\d+); torah\+\+\) \{\s*paths.push\(\{ params: \{ part: '(\d+)', torah: String\(torah\) \} \}\);\s*\}/g;
test('all homogeneous fixed-bound torah-file templates use exact generated bounds and filenames', () => {
  const selected = [];
  for (const book of fs.readdirSync(path.join(root, 'src/pages/reader'))) {
    const relative = `src/pages/reader/${book}/[part]/[torah].astro`;
    if (!fs.existsSync(path.join(root, relative))) continue;
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const loader = `public/reader/${book}/part-\${partNum}/torah-\${torahNum}.json`;
    if (!source.includes(loader)) continue;
    const front = source.split('const { part, torah }', 1)[0];
    if (!front.includes('export function getStaticPaths()')) continue;
    const loops = [...front.matchAll(loopPattern)];
    const remainder = front.split('export function getStaticPaths()')[1].replace(loopPattern, '');
    if (loops.length !== 1 || !/^\s*\{\s*const paths = \[\];\s*return paths;\s*\}\s*$/.test(remainder)) continue;
    selected.push(book);
    const [, min, max, part] = loops[0];
    assert.equal(part, '1', book);
    assert.ok(source.includes("import { normalizeReaderNavigation } from '../../../../lib/reader-navigation.mjs';"), book);
    assert.ok(source.includes(`book: '${book}', part: partNum, torah: torahNum, minTorah: ${min}, maxTorah: ${max},`), book);
    assert.ok(source.includes(`contentDir: path.join(process.cwd(), \`public/reader/${book}/part-\${partNum}\`),`), book);
    for (const direction of ['prev', 'next']) {
      assert.equal([...source.matchAll(new RegExp(`href=\\{readerNavigation\\.${direction}Url\\}`, 'g'))].length, 2, book);
      assert.equal([...source.matchAll(new RegExp(`\\{readerNavigation\\.${direction}Url \\?`, 'g'))].length, 2, book);
    }
    assert.ok(!source.includes('torahData.navigation.prevUrl') && !source.includes('torahData.navigation.nextUrl'), book);
  }
  assert.equal(selected.length, 167, 'reviewed homogeneous integration inventory');
});
