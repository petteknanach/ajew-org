'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const {
  buildKitzurReferenceMap,
  kitzurReferenceFromHeading,
} = require('../src/lib/daily-study-references.cjs');

const root = path.resolve(__dirname, '..');
const indexes = [1, 2].map(part => JSON.parse(readFileSync(
  path.join(root, `public/reader/kitzur-likutay-moharan/part-${part}/index.json`), 'utf8',
)));

// Independent oracle: enumerate decimal references into Hebrew spellings rather
// than calling the implementation's parser or inferring an index-number offset.
const numerals = new Map();
for (let n = 1; n < 1000; n++) {
  const hundreds = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'][Math.floor(n / 100)];
  const remainder = n % 100;
  const tail = remainder === 15 ? 'טו' : remainder === 16 ? 'טז'
    : ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'][Math.floor(remainder / 10)]
      + ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'][remainder % 10];
  numerals.set(hundreds + tail, n);
}
// These source headings use inverted 270s spellings instead of רע/רעב/רעה.
numerals.set('ער', 270);
numerals.set('ערב', 272);
numerals.set('ערה', 275);

function expectedReference(heading, part) {
  const plain = heading.normalize('NFD').replace(/\p{Mark}/gu, '').trim();
  const prefix = plain.split(/\s*[-־–—]\s*/, 1)[0];
  const words = prefix.split(/\s+/);
  const number = words.length === 2 && words[0] === 'תורה' ? numerals.get(words[1]) : undefined;
  return `Part ${part}, ${number === undefined ? heading : `Torah ${number}`}`;
}

test('every actual two-part index URL retains its sequence and independently sourced reference', t => {
  const before = indexes.map(index => JSON.stringify(index));
  const references = buildKitzurReferenceMap(root);
  const entries = indexes.flatMap(index => index.torahs);
  assert.deepEqual(indexes.map(index => index.torahs.length), [289, 96]);
  indexes.forEach(index => assert.equal(index.totalTorahs, index.torahs.length));
  assert.equal(entries.length, 385);
  assert.equal(Object.keys(references).length, entries.length);
  assert.deepEqual(Object.keys(references), entries.map(entry => entry.url));
  let teachings = 0;
  for (const index of indexes) {
    for (const entry of index.torahs) {
      const expected = expectedReference(entry.hebrewTitle, index.part);
      assert.equal(references[entry.url], expected, `${entry.url}: ${entry.hebrewTitle}`);
      if (/^Part [12], Torah \d+$/.test(expected)) teachings++;
    }
  }
  assert.deepEqual(indexes.map(index => JSON.stringify(index)), before);
  assert.equal(teachings, 379);
  t.diagnostic(`Actual index coverage: ${entries.length}/${entries.length} URLs; ${teachings} numbered teachings; ${entries.length - teachings} exact source-title labels.`);
});

test('canonical route 59 identifies Torah 56, without renumbering its destination', () => {
  const entry = indexes[0].torahs.find(entry => entry.url.endsWith('/1/59'));
  assert.equal(entry.number, 59);
  assert.equal(entry.displayNumber, 59);
  assert.equal(entry.hebrewTitle, 'תּוֹרָה נו - וּבְיוֹם הַבִּכּוּרִים');
  assert.equal(buildKitzurReferenceMap(root)[entry.url], 'Part 1, Torah 56');
});

test('front matter retains exact source titles and part identity', () => {
  const references = buildKitzurReferenceMap(root);
  const frontMatter = [
    [1, 1, 'הַקְדָּמָה קִצּוּר לִקּוּטֵּי מוֹהֲרַ"ן'],
    [1, 2, 'הַקְדָּמַת הַסֵּפֶר "קִצּוּר לִקּוּטֵי מוֹהֲרַ"ן" הַיָּשָׁן'],
    [1, 3, "לְכוּ חֲזוּ מִפְעֲלוֹת ה'"],
    [2, 1, 'הַשְׁמָטָה'],
  ];
  for (const [part, route, title] of frontMatter) {
    assert.equal(references[`/reader/kitzur-likutay-moharan/${part}/${route}`], `Part ${part}, ${title}`);
  }
  assert.equal(references['/reader/kitzur-likutay-moharan/1/4'], 'Part 1, Torah 1');
  assert.equal(references['/reader/kitzur-likutay-moharan/2/2'], 'Part 2, Torah 1');
  // Part 2 is not a continuous teaching-number sequence near its end.
  assert.equal(references['/reader/kitzur-likutay-moharan/2/94'], 'Part 2, Torah 106');
  assert.equal(references['/reader/kitzur-likutay-moharan/2/96'], 'Part 2, Torah 125');
  assert.equal(references['/reader/kitzur-likutay-moharan/1/275'], 'Part 1, Torah 272');
  // Two genuine titles lack the required anchored תורה; preserve, don't invent.
  for (const route of [75, 77]) {
    const entry = indexes[0].torahs.find(entry => entry.number === route);
    assert.equal(references[entry.url], `Part 1, ${entry.hebrewTitle}`);
  }
});

test('only anchored Torah headings with valid Hebrew numerals become numbered references', () => {
  for (const [heading, number] of [
    ['תּוֹרָה נו - וּבְיוֹם הַבִּכּוּרִים', 56],
    ['תּוֹרָה י- כִּי בְשִׂמְחָה תֵצֵאוּ', 10],
    ['תורה נ״ו — כותרת', 56], ['תורה א׳', 1],
    ['תורה טו', 15], ['תורה טז', 16], ['תורה רפו', 286],
    ['תורה ער', 270], ['תורה ערב', 272], ['תורה ערה', 275],
  ]) assert.equal(kitzurReferenceFromHeading(heading, 2), `Part 2, Torah ${number}`);

  for (const heading of [
    'הקדמה תורה נו - כותרת', 'תורת נו', 'תורה', 'תורה 56',
    'תורה נוx - כותרת', 'תורה נו כותרת', 'תורה ן', 'תורה אב',
    'תורה יה', 'תורה שלום', 'תורה נ״״ו', 'תורה ״נו', 'תורה נו׳׳',
    'נו - כותרת', 'תורה תתת',
  ]) assert.equal(kitzurReferenceFromHeading(heading, 1), `Part 1, ${heading}`, heading);
});
