import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const expected = read('./fixtures/chayey-opening-alignment.json');
const data = read('../public/reader/chayey-moharan/chapter-1.json');
const sha = s => createHash('sha256').update(s).digest('hex');
function sorted(o) {
  if (Array.isArray(o)) return o.map(sorted);
  if (o && typeof o === 'object') return Object.fromEntries(Object.keys(o).sort().map(k => [k, sorted(o[k])]));
  return o;
}
test('Chayey opening review scope is explicit and the unreviewed remainder unchanged', () => {
  assert.equal(data.segments.length, expected.chapter_segment_count);
  assert.deepEqual(data.translationReview, expected.scope);
  assert.equal(sha(JSON.stringify(sorted(data.segments.slice(54)))), expected.unchanged_tail_sha256);
  assert.deepEqual(expected.rows.map(r => r.index), Array.from({length:54}, (_,i) => i+1));
});
for (const row of expected.rows) {
  test(`Chayey reviewed Siman ${row.siman}, paragraph ${row.index}: exact Hebrew, English and provenance`, () => {
    const actual = data.segments[row.index-1];
    assert.equal(actual.index, row.index);
    assert.equal(sha(actual.he), row.he_sha256);
    assert.equal(sha(actual.he_nikud), row.he_nikud_sha256);
    assert.equal(sha(actual.en), row.en_sha256);
    assert.equal(sha(actual.translationSourceEnglish), row.source_english_sha256);
    assert.equal(actual.translationProvenance, row.provenance);
    assert.ok(actual.en.trim());
  });
}
test('known semantic failure witnesses remain repaired rather than mechanically shifted', () => {
  assert.match(data.segments[17].en, /golden menorah/);
  assert.match(data.segments[18].en, /danc/i);
  assert.match(data.segments[21].en, /Torah 16/);
  assert.ok(data.segments[27].en.endsWith('And he himself'));
  assert.ok(data.segments[28].en.startsWith('o.b.m.'));
  assert.match(data.segments[30].en, /^\[Supplemental translation:/);
  assert.match(data.segments[16].en, /\[Editorial supplement:.*descended into the depths like a stone/);
  assert.match(data.segments[54].en, /^\(14\.\)/);
});
