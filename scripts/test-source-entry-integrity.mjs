import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quoteSourceUrl, prayerReferences, unverifiedPrayerReferences, firstPrayerUrl } from '../src/lib/source-entry-integrity.mjs';

const home = fs.readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const prayers = fs.readFileSync(new URL('../src/pages/prayers.astro', import.meta.url), 'utf8');
const topics = JSON.parse(fs.readFileSync(new URL('../public/reader/likutay-tefilos/toc-topics.json', import.meta.url), 'utf8')).topics;

test('every rotating quote links to its stated part and teaching, including the Petek', () => {
  const citations = [...home.matchAll(/src: '([^']+)'/g)].map(m => m[1]);
  assert.equal(citations.length, 10);
  for (const src of citations) {
    const match = /^LM (I|II):(\d+)$/.exec(src);
    assert.equal(quoteSourceUrl(src), match ? `/reader/likutay-moharan/${match[1] === 'II' ? 2 : 1}/${match[2]}` : '/my-flame');
  }
  assert.match(home, /href=\{quoteSourceUrl\(todayQuote.src\)\}/);
  assert.equal(quoteSourceUrl('LM II:78'), '/reader/likutay-moharan/2/78');
  assert.equal(quoteSourceUrl('LM I:282'), '/reader/likutay-moharan/1/282');
  assert.throws(() => quoteSourceUrl('LM III:78'));
  assert.throws(() => quoteSourceUrl('LM II:078'));
});

test('missing references never pretend to point to prayer I:1', () => {
  assert.equal(firstPrayerUrl({}), null);
  assert.equal(firstPrayerUrl({part1_prayers: [], part2_prayers: []}), null);
  assert.deepEqual(prayerReferences({part1_prayers: [0, -1, '14', 2.5], part2_prayers: []}), []);
  assert.match(prayers, /References awaiting verification/);
});

test('all references are unique, numbered, and available as individual links', () => {
  const refs = prayerReferences({part1_prayers: [14,14,27], part2_prayers: [14]});
  assert.deepEqual(refs.map(r => r.label), ['I:14','I:27','II:14']);
  assert.deepEqual(refs.map(r => r.href), ['/reader/likutay-tefilos/1/14','/reader/likutay-tefilos/1/27','/reader/likutay-tefilos/2/14']);
  assert.equal(firstPrayerUrl({part2_prayers: [13]}), '/reader/likutay-tefilos/2/13');
  assert.match(prayers, /topic.references.map/);
  assert.doesNotMatch(prayers, /slice\(0, 8\)/);
});

test('Shabbos has a source-verified destination and labels do not invert their meaning', () => {
  const shabbos = topics.find(t => t.english === 'Shabbos');
  assert.equal(firstPrayerUrl(shabbos), '/reader/likutay-tefilos/2/13');
  assert.ok(shabbos.referenceNote?.includes('Selected'));
  for (const label of ['Attaining Godliness','Attaining the Ultimate Purpose','Holiness']) {
    assert.ok(topics.some(t => t.english === label), label);
  }
  assert.ok(!topics.some(t => /Hatred of Godliness|Hatred of the Ultimate Purpose|Holiness\/Prostitution/.test(t.english)));
});

test('out-of-range index references are disclosed without fabricated links', () => {
  const topic = {part1_prayers: [21,220,300], part2_prayers: [13,77,106]};
  assert.deepEqual(prayerReferences(topic).map(r => r.label), ['I:21','II:13']);
  assert.deepEqual(unverifiedPrayerReferences(topic), ['I:220','I:300','II:77','II:106']);
  assert.match(prayers, /Index references awaiting verification/);
});

test('homepage retains tzion presentation and My Fire' , () => {
  assert.match(home, /nanach-fire-huaish-sheli-letters\.png/);
  assert.match(home, /huaishFire/);
  assert.match(home, /tomb|tziyun|tzion|uman/i);
});
