import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const load = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url), 'utf8'));
const expected = load('./fixtures/tefilos-1-alignment.json');
const data = load('../public/reader/likutay-tefilos/part-1/prayer-1.json');
const sha = s => createHash('sha256').update(s).digest('hex');
const norm = s => s.replace(/\s+/gu, ' ').trim();
const canonical = o => JSON.stringify(sort(o));
function sort(o) {
  if (Array.isArray(o)) return o.map(sort);
  if (o && typeof o === 'object') return Object.fromEntries(Object.keys(o).sort().map(k => [k, sort(o[k])]));
  return o;
}

test('only the reviewed prayer activates the existing paired-view contract', () => {
  const template = fs.readFileSync(new URL('../src/pages/reader/likutay-tefilos/[part]/[torah].astro', import.meta.url), 'utf8');
  assert.ok(template.includes("id={partNum === 1 && torahNum === 1 ? 'aligned-segments-data' : undefined}"));
  assert.equal((template.match(/id=\{partNum === 1 && torahNum === 1/g) || []).length, 1);
});

test('Tefilos I:1 preserves every Hebrew, nikud, index and non-English field', () => {
  const frozen = Object.fromEntries(Object.entries(data).map(([k, v]) => [k,
    ['segments','aligned_segments'].includes(k) ? v.map(r => Object.fromEntries(Object.entries(r).filter(([f]) => f !== 'en'))) : v]));
  assert.equal(sha(canonical(frozen)), expected.all_non_en_fields_sha256);
  assert.equal(data.segments.length, 8);
  assert.equal(data.aligned_segments.length, 17);
});
for (const row of expected.rows) {
  test(`Tefilos I:1 ${row.array} ${row.index} retains reviewed semantic boundaries`, () => {
    const actual = data[row.array].find(r => r.index === row.index);
    assert.ok(actual);
    assert.equal(sha(actual.he), row.he_sha256);
    assert.equal(sha(actual.en), row.en_sha256);
    assert.ok(actual.en.startsWith(row.en_start));
    assert.ok(actual.en.endsWith(row.en_end));
  });
}
test('each representation contains the exact prayer once, without imported menu contamination', () => {
  for (const array of ['segments','aligned_segments']) {
    assert.equal(sha(norm(data[array].slice(2).map(r => r.en).join(' '))), expected.unique_prayer_en_normalized_sha256);
    assert.deepEqual(data[array].slice(0,2).map(r => r.en), ['1 of the month','1 Tishrei']);
    assert.ok(data[array].every(r => !r.en.includes('&#x05E2;')));
  }
});
test('all manually reviewed original/aligned groups correspond in both languages', () => {
  for (const [original, aligned] of Object.entries(expected.original_to_aligned)) {
    for (const lang of ['he','en']) {
      assert.equal(norm(data.segments[Number(original)-1][lang]), norm(aligned.map(i => data.aligned_segments[i-1][lang]).join(' ')));
    }
  }
});
