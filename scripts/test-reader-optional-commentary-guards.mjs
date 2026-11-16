import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { transform } from '@astrojs/compiler';
import { normalizeReaderNavigation } from '../src/lib/reader-navigation.mjs';
import guard from './reader-optional-commentary-guard-conservation.cjs';
import query from './reader-cross-reference-cache-conservation.cjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = relative => fs.readFileSync(path.join(root, relative));
const genuineCommentaryPath = 'public/reader/likutay-nanach/oral-torah/mishna-avot.json';
const genuineCommentary = read(genuineCommentaryPath);
assert.ok(JSON.parse(genuineCommentary).segments?.length > 0, 'positive fixture is genuine nonempty commentary');

function codeFor(source) {
  const frontmatter = source.split('---')[1].replace(/^import .*;\r?\n/gm, '')
    .replace('export function getStaticPaths()', 'function getStaticPaths()');
  return transformSync(frontmatter + '\nglobalThis.result = { torahData, commentaryEntry, error, pageTitle, pageDesc, structuredData, breadcrumbData, readerNavigation, paths: getStaticPaths() };', { loader: 'ts', target: 'es2022' }).code;
}
function initialize(code, cwd, { forbidStat = false } = {}) {
  let statCalls = 0;
  const reader = { ...fs, statSync(...args) {
    statCalls++;
    assert.equal(forbidStat, false, 'absent Torah must short-circuit the optional stat');
    return fs.statSync(...args);
  } };
  const context = vm.createContext({ fs: reader, path, normalizeReaderNavigation,
    process: { cwd: () => cwd }, Astro: { params: { part: '1', torah: '1' } } });
  vm.runInContext(code, context);
  return { result: JSON.parse(JSON.stringify(context.result)), statCalls };
}
function withoutCommentary(result) {
  const { commentaryEntry, ...rest } = result;
  return rest;
}

for (const [relative, d] of Object.entries(guard.delta.paths)) {
  const slug = relative.split('/')[3];
  const bytes = read(relative), source = bytes.toString('utf8');
  const before = execFileSync('git', ['show', guard.delta.sourceCommit + ':' + relative], { cwd: root });
  const currentCode = codeFor(source), previousCode = codeFor(before.toString('utf8'));

  test(`${slug}: entire source restores before the unchanged query inverse; strict current admission`, () => {
    assert.deepEqual(guard.requireCurrent(relative, bytes), before);
    assert.deepEqual(guard.restore(relative, bytes), before);
    assert.deepEqual(query.requireCurrent(relative, bytes), query.restore(relative, before));
    assert.deepEqual(query.restore(relative, bytes), query.restore(relative, before));
    // Missing the real new guard is NOT current, despite a valid inherited query.
    assert.equal(guard.restore(relative, before), before);
    assert.throws(() => guard.requireCurrent(relative, before), assert.AssertionError);
    assert.throws(() => query.requireCurrent(relative, before), assert.AssertionError);
    const wrongOwner = Object.keys(guard.delta.paths).find(p => p !== relative);
    const corrupt = Buffer.from(bytes); corrupt[Math.floor(bytes.length / 2)] ^= 1;
    const mutations = [corrupt, Buffer.concat([bytes, Buffer.from(' ')]),
      Buffer.from(source.replace(d.after, d.after + ' false &&')),
      Buffer.from(source.replace(d.after, d.after + d.after)),
      Buffer.from(source.replace('class="reader-content mode-hebrew"', 'class="reader-content changed"'))];
    for (const bad of mutations) {
      assert.notDeepEqual(bad, bytes, 'negative control really changes source');
      assert.equal(guard.restore(relative, bad), bad);
      assert.equal(query.restore(relative, bad), bad);
      assert.throws(() => guard.requireCurrent(relative, bad), assert.AssertionError);
      assert.throws(() => query.requireCurrent(relative, bad), assert.AssertionError);
    }
    assert.equal(guard.restore(wrongOwner, bytes), bytes);
    assert.throws(() => guard.requireCurrent(wrongOwner, bytes), assert.AssertionError);
    assert.equal(query.restore('unselected/source', bytes), bytes);
    assert.throws(() => query.requireCurrent('unselected/source', bytes), assert.AssertionError);
    assert.deepEqual(guard.requireCurrent(relative, bytes), before); // Fresh positives after refusal.
    assert.deepEqual(query.requireCurrent(relative, bytes), query.restore(relative, before));
  });

  test(`${slug}: real frontmatter suppresses missing/directory only; genuine available bytes and Torah conserved`, () => {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-optional-guard-'));
    try {
      const torahRelative = `public/reader/${slug}/part-1/torah-1.json`;
      const torahFile = path.join(scratch, torahRelative);
      fs.mkdirSync(path.dirname(torahFile), { recursive: true });
      fs.writeFileSync(torahFile, read(torahRelative));
      const optionalFile = path.join(scratch, 'public/reader/likutay-nanach/oral-torah', `${slug}.json`);
      fs.mkdirSync(path.dirname(optionalFile), { recursive: true });
      const old = initialize(previousCode, scratch).result;
      assert.deepEqual(old.torahData, JSON.parse(read(torahRelative)));
      assert.equal(old.commentaryEntry.related_commentaries.length, 1);
      assert.equal(old.commentaryEntry.related_commentaries[0].url, '/' + path.relative(scratch, optionalFile).slice(7));

      // Physical absence, not an empty JSON or redirected publication.
      assert.equal(fs.existsSync(optionalFile), false);
      const absent = initialize(currentCode, scratch);
      assert.equal(absent.statCalls, 1);
      assert.equal(absent.result.commentaryEntry, null);
      assert.deepEqual(withoutCommentary(absent.result), withoutCommentary(old));

      fs.mkdirSync(optionalFile);
      const directory = initialize(currentCode, scratch);
      assert.equal(directory.result.commentaryEntry, null);
      assert.deepEqual(withoutCommentary(directory.result), withoutCommentary(old));
      fs.rmdirSync(optionalFile);

      // Scratch-only compatibility control: authentic available Avot bytes,
      // not approval or invention of commentary for these three absent works.
      fs.writeFileSync(optionalFile, genuineCommentary);
      const available = initialize(currentCode, scratch);
      assert.equal(available.statCalls, 1);
      assert.deepEqual(available.result, old);
      assert.deepEqual(fs.readFileSync(optionalFile), genuineCommentary);
      fs.unlinkSync(torahFile);
      const missingTorah = initialize(currentCode, scratch, { forbidStat: true });
      assert.equal(missingTorah.statCalls, 0);
      assert.equal(missingTorah.result.torahData, null);
      assert.equal(missingTorah.result.commentaryEntry, null);
      assert.deepEqual(missingTorah.result, initialize(previousCode, scratch).result);
      // Recreate the genuine Torah after negatives; available-domain positive remains exact.
      fs.writeFileSync(torahFile, read(torahRelative));
      assert.deepEqual(initialize(currentCode, scratch).result, old);
      assert.deepEqual(read(genuineCommentaryPath), genuineCommentary);
    } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
  });

  test(`${slug}: complete actual Astro template compiles`, async () => {
    const compiled = await transform(source, { filename: relative });
    assert.deepEqual(compiled.diagnostics.filter(diagnostic => diagnostic.severity === 1), []);
    assert.ok(compiled.code.includes('commentaryEntry'));
  });
}

test('outer bank/helper corruption is refused before query authority; fresh authentic recovery', () => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'reader-optional-pin-'));
  const helpers = ['reader-optional-commentary-guard-conservation.cjs', 'reader-optional-commentary-guard-delta.json',
    'reader-cross-reference-cache-conservation.cjs', 'reader-cross-reference-cache-delta.json'];
  const run = () => spawnSync(process.execPath, ['-e', "require('./reader-cross-reference-cache-conservation.cjs')"], { cwd: scratch, encoding: 'utf8' });
  try {
    for (const name of helpers) fs.writeFileSync(path.join(scratch, name), read('scripts/' + name));
    assert.equal(run().status, 0);
    fs.appendFileSync(path.join(scratch, helpers[1]), ' ');
    let rejected = run(); assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /OPTIONAL_GUARD_AUTHORITY_PIN/);
    fs.writeFileSync(path.join(scratch, helpers[1]), read('scripts/' + helpers[1]));
    assert.equal(run().status, 0);
    fs.appendFileSync(path.join(scratch, helpers[0]), '\n');
    rejected = run(); assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /OPTIONAL_GUARD_HELPER_PIN/);
    fs.writeFileSync(path.join(scratch, helpers[0]), read('scripts/' + helpers[0]));
    assert.equal(run().status, 0);
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
});
