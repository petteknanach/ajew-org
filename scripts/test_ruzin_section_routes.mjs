import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ruzinSections, ruzinSectionPaths, ruzinNavigation, ruzinDirectory } from '../src/lib/ruzin-section-routes.mjs';
function fixture(run) {
  const root = fs.mkdtempSync(path.join(process.env.TMPDIR || '/root/.hermes/cache/scratch', 'ruzin-routes-'));
  for (const number of [1, 3, 4, 5, 7]) fs.writeFileSync(path.join(root, `section-${number}.json`), JSON.stringify({ torah: number, title: `Source section ${number}`, segments: [{ he: 'מקור', en: number === 3 ? 'English' : null }] }));
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test('source IDs are1,3,4,5,7, not array positions or stale number/url metadata', () => fixture(root => {
  fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify({ torahs: [{ torah: 7, number: 1, url: '/wrong/1/' }] }));
  assert.deepEqual(ruzinSections(root), [1, 3, 4, 5, 7]);
  assert.deepEqual(ruzinSectionPaths(root), [1, 3, 4, 5, 7].map(n => ({ params: { part: '1', torah: String(n) } })));
  assert.deepEqual(ruzinDirectory(root).map(r => [r.number, r.url]), [1, 3, 4, 5, 7].map(n => [n, `/reader/ramchal-ruzin-gineezin/1/${n}/`]));
}));
test('neither navbar jumps across missing2 or6; real3-4-5 adjacency remains', () => fixture(root => {
  assert.deepEqual(ruzinNavigation(root, 1, 1), { prevUrl: null, nextUrl: null });
  assert.deepEqual(ruzinNavigation(root, 1, 3), { prevUrl: null, nextUrl: '/reader/ramchal-ruzin-gineezin/1/4/' });
  assert.deepEqual(ruzinNavigation(root, 1, 4), { prevUrl: '/reader/ramchal-ruzin-gineezin/1/3/', nextUrl: '/reader/ramchal-ruzin-gineezin/1/5/' });
  assert.deepEqual(ruzinNavigation(root, 1, 5), { prevUrl: '/reader/ramchal-ruzin-gineezin/1/4/', nextUrl: null });
  assert.deepEqual(ruzinNavigation(root, 1, 7), { prevUrl: null, nextUrl: null });
}));
test('zero, strings, unsafe numbers, absent source and wrong part yield no neighbors', () => fixture(root => {
  for (const n of [0, '3', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, 2, 6]) assert.deepEqual(ruzinNavigation(root, 1, n), { prevUrl: null, nextUrl: null });
  assert.deepEqual(ruzinNavigation(root, 2, 4), { prevUrl: null, nextUrl: null });
}));
test('symlink and nonregular sources are not routes; unrelated names are ignored', () => fixture(root => {
  fs.symlinkSync(path.join(root, 'section-3.json'), path.join(root, 'section-2.json'));
  fs.mkdirSync(path.join(root, 'section-6.json'));
  fs.writeFileSync(path.join(root, 'section-01.json'), '{}');
  assert.deepEqual(ruzinSections(root), [1, 3, 4, 5, 7]);
}));
test('source identity mismatch or empty body aborts directory admission', () => fixture(root => {
  fs.writeFileSync(path.join(root, 'section-7.json'), JSON.stringify({ torah: 1, title: 'Wrong identity', segments: [{}] }));
  assert.throws(() => ruzinDirectory(root), /identity\/body mismatch/);
  fs.writeFileSync(path.join(root, 'section-7.json'), JSON.stringify({ torah: 7, title: 'Empty', segments: [] }));
  assert.throws(() => ruzinDirectory(root), /identity\/body mismatch/);
}));
test('actual complete current sources provide five correct directories without mutation', () => {
  const root = path.resolve('public/reader/ramchal-ruzin-gineezin');
  const names = ['index.json', ...[1,3,4,5,7].map(n => `section-${n}.json`)];
  const before = names.map(n => fs.readFileSync(path.join(root, n)));
  assert.deepEqual(ruzinDirectory(root).map(r => r.number), [1,3,4,5,7]);
  for (let i=0;i<names.length;i++) assert.deepEqual(fs.readFileSync(path.join(root,names[i])),before[i]);
});
