#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { hasRamchalSection, ramchalSectionPaths } from '../src/lib/ramchal-section-routes.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const template = fs.readFileSync(path.join(repo, 'src/pages/reader/ramchal-adir-bamuroam/[part]/[torah].astro'), 'utf8');
function fixture(callback) {
  const scratch = process.env.TMPDIR || path.join(os.homedir(), '.hermes/cache/scratch');
  fs.mkdirSync(scratch, { recursive: true });
  const root = fs.mkdtempSync(path.join(scratch, 'ramchal-route-'));
  try { return callback(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function source(root, section, body = '{"segments":[{"hebrew":"source","english":""}]}') {
  fs.writeFileSync(path.join(root, `section-${section}.json`), body);
}

test('fixed numbered domain admits existing regular section files only', () => fixture(root => {
  for (const n of [1, 2, 20, 22]) source(root, n);
  assert.deepEqual(ramchalSectionPaths(root), [1, 2, 20, 22].map(n => ({ params: { part: '1', torah: String(n) } })));
}));
test('missing21 is omitted while22 retains its actual identifier', () => fixture(root => {
  source(root, 20); source(root, 22);
  assert.equal(hasRamchalSection(root, 21), false);
  assert.deepEqual(ramchalSectionPaths(root).map(p => p.params.torah), ['20', '22']);
}));
test('exact adjacent-file predicate blocks both directions across21, never jumps', () => fixture(root => {
  for (const n of [19, 20, 22]) source(root, n);
  assert.equal(hasRamchalSection(root, 20 - 1), true);
  assert.equal(hasRamchalSection(root, 20 + 1), false);
  assert.equal(hasRamchalSection(root, 22 - 1), false);
}));
test('a directory named section21.json does not become a route', () => fixture(root => {
  fs.mkdirSync(path.join(root, 'section-21.json'));
  assert.equal(hasRamchalSection(root, 21), false);
}));
test('a symlink is not a new source route', () => fixture(root => {
  source(root, 22); fs.symlinkSync(path.join(root, 'section-22.json'), path.join(root, 'section-21.json'));
  assert.equal(hasRamchalSection(root, 21), false);
  assert.deepEqual(ramchalSectionPaths(root).map(p => p.params.torah), ['22']);
}));
test('invalid/out-of-domain identifiers fail closed', () => fixture(root => {
  for (const n of [0, -1, 23, 1.5, NaN, Infinity, '1', '../1', null]) assert.equal(hasRamchalSection(root, n), false);
}));
test('unrelated raw files are never routes and all source bytes are conserved', () => fixture(root => {
  source(root, 1); fs.writeFileSync(path.join(root, 'section-21.txt'), 'raw source');
  const before = new Map(fs.readdirSync(root).map(n => [n, fs.readFileSync(path.join(root, n))]));
  assert.deepEqual(ramchalSectionPaths(root).map(p => p.params.torah), ['1']);
  assert.deepEqual(fs.readdirSync(root).sort(), [...before.keys()].sort());
  for (const [name, bytes] of before) assert.deepEqual(fs.readFileSync(path.join(root, name)), bytes);
}));
test('unexpected I/O errors propagate rather than silently hiding sources', () => fixture(root => {
  const notDirectory = path.join(root, 'regular-file'); fs.writeFileSync(notDirectory, 'x');
  assert.throws(() => ramchalSectionPaths(notDirectory), { code: 'ENOTDIR' });
}));
test('the actual Astro getStaticPaths caller applies the helper to the actual book directory', () => fixture(root => {
  const content = path.join(root, 'public/reader/ramchal-adir-bamuroam'); fs.mkdirSync(content, { recursive: true });
  source(content, 20); source(content, 22);
  const match = template.match(/^export function getStaticPaths\(\) \{\n[\s\S]*?^\}/m);
  assert.ok(match);
  const actual = new vm.Script(match[0].replace(/^export /, '') + '\ngetStaticPaths()').runInNewContext({ path, process: { cwd: () => root }, ramchalSectionPaths });
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), [{ params: { part: '1', torah: '20' } }, { params: { part: '1', torah: '22' } }]);
}));
test('both navigation bars consume the availability flags and preserve numeric URLs', () => {
  assert.equal((template.match(/\{hasPreviousSection \? \(/g) || []).length, 2);
  assert.equal((template.match(/\{hasNextSection \? \(/g) || []).length, 2);
  assert.equal((template.match(/\/1\/\$\{torahNum - 1\}/g) || []).length, 2);
  assert.equal((template.match(/\/1\/\$\{torahNum \+ 1\}/g) || []).length, 2);
  assert.ok(template.includes('const hasPreviousSection = torahNum > 1 && hasRamchalSection(sectionDir, torahNum - 1);'));
  assert.ok(template.includes('const hasNextSection = torahNum < 22 && hasRamchalSection(sectionDir, torahNum + 1);'));
});
test('actual committed book retains every existing numbered source including22', () => {
  const content = path.join(repo, 'public/reader/ramchal-adir-bamuroam');
  assert.ok(fs.existsSync(content), 'Actual book source fixture required; do not credit an omitted source case');
  const actual = ramchalSectionPaths(content).map(p => p.params.torah);
  assert.deepEqual(actual, [...Array.from({ length: 20 }, (_, i) => String(i + 1)), '22']);
  assert.equal(actual.includes('21'), false);
});
