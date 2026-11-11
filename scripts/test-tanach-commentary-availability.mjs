import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { normalizeReaderNavigation } from '../src/lib/reader-navigation.mjs';
import { qualifiedChapter as readQualifiedChapter, qualifiedIndexes } from '../src/lib/qualified-parsha.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const qualifiedSourceIndexes = qualifiedIndexes(root);
const qualifiedChapter = chapter => readQualifiedChapter(chapter, qualifiedSourceIndexes, root);
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/tanach-commentary-availability/books.json', import.meta.url)));
const hkIndex = JSON.parse(fs.readFileSync(path.join(root, 'src/data/hk-citations-index.json')));
const compiled = new Map();
function codeFor(source) {
  const frontmatter = source.split('---')[1].replace(/^import .*;\r?\n/gm, '')
    .replace('export function getStaticPaths()', 'function getStaticPaths()');
  return transformSync(frontmatter + '\nglobalThis.result = { torahData, commentaryEntry, error };', { loader: 'ts', target: 'es2022' }).code;
}
for (const book of fixture.books) {
  const source = fs.readFileSync(path.join(root, book.path), 'utf8');
  let baseline = source;
  for (const change of [...book.changes].reverse()) {
    if (baseline.includes(change.after)) {
      assert.equal(baseline.split(change.after).length, 2);
      baseline = baseline.replace(change.after, change.before);
    } else assert.equal(baseline.split(change.before).length, 2);
  }
  compiled.set(book.owner, { current: codeFor(source), baseline: codeFor(baseline) });
}
function initialize(book, chapter, { baseline = false, forceMissing = false } = {}) {
  const reader = forceMissing ? { ...fs, existsSync(file) {
    if (String(file).includes('/public/reader/likutay-nanach/tanach/')) return false;
    return fs.existsSync(file);
  } } : fs;
  const context = vm.createContext({ fs: reader, path, hkIndex, normalizeReaderNavigation, qualifiedChapter,
    process: { cwd: () => root }, Astro: { params: { part: '1', torah: String(chapter) } } });
  vm.runInContext(compiled.get(book.owner)[baseline ? 'baseline' : 'current'], context);
  assert.equal(context.result.error, null);
  return JSON.parse(JSON.stringify(context.result));
}
const observed = [];
for (const book of fixture.books) {
  test(`${book.owner}: exact available chapter commentary and all other entries are conserved`, () => {
    const actualMissing = [];
    for (let chapter = 1; chapter <= book.maxChapter; chapter++) {
      const original = initialize(book, chapter, { baseline: true });
      const current = initialize(book, chapter);
      const raw = fs.readFileSync(path.join(root, `public/reader/${book.owner}/part-1/torah-${chapter}.json`));
      assert.deepEqual(current.torahData, JSON.parse(raw));
      assert.deepEqual(current.torahData, original.torahData);
      const oldEntries = original.commentaryEntry.related_commentaries;
      const entries = current.commentaryEntry.related_commentaries;
      assert.deepEqual(entries.filter(entry => entry.book !== 'likutay-nanach'), oldEntries.filter(entry => entry.book !== 'likutay-nanach'));
      const oldLN = oldEntries.filter(entry => entry.book === 'likutay-nanach');
      assert.equal(oldLN.length, 1);
      const url = `/reader/likutay-nanach/tanach/${book.resourceBook}-${chapter}.json`;
      const filename = path.join(root, 'public', url.slice(1));
      const exists = fs.existsSync(filename);
      const ln = entries.filter(entry => entry.book === 'likutay-nanach');
      assert.equal(ln.length, exists ? 1 : 0, `${book.owner}:${chapter}: only a real chapter is offered`);
      if (exists) {
        assert.deepEqual(ln[0], { ...oldLN[0], url });
        const resource = JSON.parse(fs.readFileSync(filename));
        assert.equal(resource.book, book.resourceBook);
        assert.equal(Number(resource.chapter), chapter);
        assert.equal(resource.title, `Likutay Nanach on ${book.titleBook} — Chapter ${chapter}`);
      } else actualMissing.push(chapter);
      observed.push({ owner: book.owner, chapter, ln: ln.length, hk: entries.filter(entry => entry.book === 'hilchasa-kinachamani').length });
    }
    assert.deepEqual(actualMissing, book.missingChapters);
  });
}

test('complete 24-book domain retains 320 HK entries and offers only 452 existing LN chapters', () => {
  assert.equal(fixture.books.length, 24);
  assert.equal(observed.length, 472);
  assert.equal(new Set(observed.map(row => `${row.owner}:${row.chapter}`)).size, 472);
  assert.equal(observed.reduce((sum, row) => sum + row.ln, 0), 452);
  assert.equal(observed.filter(row => row.ln === 0).length, 20);
  assert.equal(observed.reduce((sum, row) => sum + row.hk, 0), 320);
});

test('Amos 4 keeps genuine HK when LN is absent; no aggregate substitute is used', () => {
  const book = fixture.books.find(book => book.owner === 'tanach-amos');
  const current = initialize(book, 4).commentaryEntry.related_commentaries;
  const old = initialize(book, 4, { baseline: true }).commentaryEntry.related_commentaries;
  assert.deepEqual(current, old.filter(entry => entry.book !== 'likutay-nanach'));
  assert.equal(current.length, 1);
  assert.equal(current[0].book, 'hilchasa-kinachamani');
});

test('metadata-evidenced Yona resource preserves the owning Yonah section identity', () => {
  const book = fixture.books.find(book => book.owner === 'tanach-yonah');
  const ln = initialize(book, 1).commentaryEntry.related_commentaries.find(entry => entry.book === 'likutay-nanach');
  assert.equal(ln.section, 'tanach-yonah');
  assert.equal(ln.url, '/reader/likutay-nanach/tanach/tanach-yona-1.json');
});

test('a missing resource suppresses only LN, never the actual HK entry', () => {
  const book = fixture.books.find(book => book.owner === 'tanach-amos');
  const current = initialize(book, 2, { forceMissing: true }).commentaryEntry.related_commentaries;
  const original = initialize(book, 2, { baseline: true }).commentaryEntry.related_commentaries;
  assert.deepEqual(current, original.filter(entry => entry.book !== 'likutay-nanach'));
  assert.equal(current.length, 1);
});
