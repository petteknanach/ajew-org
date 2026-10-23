import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createPrayerTopicHrefResolver, reviewedPrayerPassages } from '../src/lib/prayer-topic-passages.mjs';
import { prayerReferences, unverifiedPrayerReferences, firstPrayerUrl } from '../src/lib/source-entry-integrity.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const loadPrayer = (part, prayer) => JSON.parse(fs.readFileSync(
  path.join(root, `public/reader/likutay-tefilos/part-${part}/prayer-${prayer}.json`), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const expected = [
  '1/7#seg-1', '1/10#seg-6', '1/14#seg-11', '1/14#seg-9',
  '1/4#seg-8', '1/6#seg-2', '1/1#seg-6', '1/7#seg-4',
  '1/14#seg-13', '1/7#seg-4', '1/5#seg-7', '2/13#seg-2',
];

for (const [i, entry] of reviewedPrayerPassages.entries()) {
  test(`real original Hebrew mapping ${i + 1}: ${entry.part}/${entry.prayer}/${entry.index}`, () => {
    const resolve = createPrayerTopicHrefResolver(loadPrayer);
    assert.equal(resolve(entry.topic, entry.href), `/reader/likutay-tefilos/${expected[i]}`);
    const doc = loadPrayer(entry.part, entry.prayer);
    const original = doc.segments.filter((s) => s.index === entry.index);
    assert.equal(original.length, 1);
    assert.equal(sha(original[0].he), entry.heSha256);
  });
}

test('exact registry is deeply frozen and contains only the reviewed twelve entries', () => {
  assert.equal(reviewedPrayerPassages.length, expected.length);
  assert.ok(Object.isFrozen(reviewedPrayerPassages));
  for (const entry of reviewedPrayerPassages) assert.ok(Object.isFrozen(entry));
  assert.throws(() => { reviewedPrayerPassages[0].index = 999; }, TypeError);
});

test('unreviewed topic, null, undefined and different references remain unchanged without reading', () => {
  let reads = 0;
  const resolve = createPrayerTopicHrefResolver(() => { reads++; throw Error('not to be read'); });
  const e = reviewedPrayerPassages[0];
  assert.equal(resolve('unreviewed-topic', e.href), e.href);
  assert.equal(resolve(e.topic, null), null);
  assert.equal(resolve(e.topic, undefined), undefined);
  for (const href of [e.href + '/', e.href + '?q=test', e.href + '#seg-99', 'https://ajew.org' + e.href, '/reader/likutay-tefilos/1/9']) {
    assert.equal(resolve(e.topic, href), href);
  }
  assert.equal(reads, 0);
});

const rejectedSources = [
  ['wrong book', (d) => { d.book = 'another-book'; }],
  ['wrong part', (d) => { d.part = 2; }],
  ['wrong prayer metadata', (d) => { d.torah = 99; }],
  ['non-array segments', (d) => { d.segments = {}; }],
  ['missing original index', (d, e) => { d.segments = d.segments.filter((s) => s.index !== e.index); }],
  ['duplicate original index', (d, e) => { d.segments.push(clone(d.segments.find((s) => s.index === e.index))); }],
  ['non-integer original index', (d, e) => { d.segments.find((s) => s.index === e.index).index = String(e.index); }],
  ['changed whole Hebrew', (d, e) => { d.segments.find((s) => s.index === e.index).he += ' '; }],
  ['non-string Hebrew', (d, e) => { d.segments.find((s) => s.index === e.index).he = null; }],
];
for (const [name, change] of rejectedSources) {
  test(`unchanged plain-route fallback for ${name}`, () => {
    const e = reviewedPrayerPassages[0];
    const d = clone(loadPrayer(e.part, e.prayer));
    change(d, e);
    assert.equal(createPrayerTopicHrefResolver(() => d)(e.topic, e.href), e.href);
  });
}

test('loader exception and absent source fall back without guessed fragments', () => {
  const e = reviewedPrayerPassages[0];
  assert.equal(createPrayerTopicHrefResolver(() => { throw Error('unavailable'); })(e.topic, e.href), e.href);
  assert.equal(createPrayerTopicHrefResolver(() => null)(e.topic, e.href), e.href);
});

test('source cache reads only eight paths and stores private immutable snapshots', () => {
  const seen = [];
  const docs = new Map();
  const resolve = createPrayerTopicHrefResolver((part, prayer) => {
    seen.push(`${part}/${prayer}`);
    const d = loadPrayer(part, prayer); docs.set(`${part}/${prayer}`, d); return d;
  });
  for (const e of reviewedPrayerPassages) assert.equal(resolve(e.topic, e.href), `${e.href}#seg-${e.index}`);
  assert.equal(seen.length, 8);
  assert.equal(new Set(seen).size, 8);
  const e = reviewedPrayerPassages[0];
  docs.get(`${e.part}/${e.prayer}`).segments.find((s) => s.index === e.index).he = 'mutated external alias';
  assert.equal(resolve(e.topic, e.href), `${e.href}#seg-${e.index}`);
});

test('English, alternate pointing and stale id/count metadata do not confer mapping approval', () => {
  const e = reviewedPrayerPassages.at(-1);
  const d = loadPrayer(e.part, e.prayer);
  const before = JSON.stringify(d);
  const altered = clone(d);
  altered.id = 'stale-id'; altered.totalParagraphs = 999;
  for (const s of altered.segments) { s.en = 'unapproved test mutation'; s.he_nikud = 'unapproved test mutation'; }
  assert.equal(createPrayerTopicHrefResolver(() => altered)(e.topic, e.href), `${e.href}#seg-${e.index}`);
  assert.equal(JSON.stringify(d), before);
});

const pagePath = process.env.PRAYERS_PAGE_SOURCE || path.join(root, 'src/pages/prayers.astro');
const page = fs.readFileSync(pagePath, 'utf8');
const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(page)?.[1];
assert.ok(frontmatter, 'actual page frontmatter present');
const script = frontmatter.replace(/^import[^\n]*\n/gm, '');
const initialized = vm.runInNewContext(`(() => { ${script}\nreturn { allTopics, featured, commonTopicOrder, englishFallback, topicPrayerHref: typeof topicPrayerHref === 'function' ? topicPrayerHref : null }; })()`, {
  fs, path, process: { cwd: () => root }, prayerReferences, unverifiedPrayerReferences, firstPrayerUrl, createPrayerTopicHrefResolver,
}, { timeout: 5000 });
const toc = JSON.parse(fs.readFileSync(path.join(root, 'public/reader/likutay-tefilos/toc-topics.json'), 'utf8'));

test('full real page initialization preserves all topics, references, labels and verification notes', () => {
  assert.equal(initialized.allTopics.length, toc.topics.length);
  assert.equal(toc.topics.length, 197);
  assert.equal(initialized.featured.length, 12);
  for (const source of toc.topics) {
    const actual = initialized.allTopics.find((t) => t.topic === source.topic);
    assert.ok(actual);
    for (const [key, value] of Object.entries(source)) {
      if (key !== 'english') assert.deepEqual(JSON.parse(JSON.stringify(actual[key])), value);
    }
    assert.equal(actual.english, source.english || initialized.englishFallback[source.topic] || source.topic);
    assert.equal(JSON.stringify(actual.references), JSON.stringify(prayerReferences(source)));
    assert.equal(JSON.stringify(actual.unverifiedReferences), JSON.stringify(unverifiedPrayerReferences(source)));
    assert.equal(actual.total, prayerReferences(source).length);
  }
});

test('initialized featured hrefs reach all twelve approved original paragraphs', () => {
  assert.equal(typeof initialized.topicPrayerHref, 'function');
  for (const [i, topic] of initialized.featured.entries()) {
    assert.equal(initialized.topicPrayerHref(topic.topic, firstPrayerUrl(topic)), `/reader/likutay-tefilos/${expected[i]}`);
  }
});

test('numeric references and Open prayer use the same resolver; all other references stay unchanged', () => {
  assert.equal(typeof initialized.topicPrayerHref, 'function');
  let changedReferences = 0;
  for (const topic of initialized.allTopics) {
    for (const ref of topic.references) {
      const selected = reviewedPrayerPassages.find((e) => e.topic === topic.topic && e.href === ref.href);
      const expectedHref = selected ? `${ref.href}#seg-${selected.index}` : ref.href;
      assert.equal(initialized.topicPrayerHref(topic.topic, ref.href), expectedHref);
      if (selected) changedReferences++;
    }
    const first = firstPrayerUrl(topic);
    const selected = reviewedPrayerPassages.find((e) => e.topic === topic.topic && e.href === first);
    assert.equal(initialized.topicPrayerHref(topic.topic, first), selected ? `${first}#seg-${selected.index}` : first);
  }
  assert.equal(changedReferences, 12);
});

test('actual template wires the shared resolver at both card actions and numeric href expression', () => {
  assert.equal((page.match(/href=\{topicPrayerHref\(topic\.topic, firstPrayerUrl\(topic\)\)\}/g) || []).length, 2);
  assert.equal((page.match(/href=\{topicPrayerHref\(topic\.topic, ref\.href\)\}/g) || []).length, 1);
  assert.equal((page.match(/href=\{firstPrayerUrl\(topic\)\}/g) || []).length, 0);
});
