import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { load } from 'cheerio';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const source = read('public/reader-script.js');
new vm.Script(source); // Parse the whole real runtime without inventing a boot.
const start = source.indexOf('  const _hebrewNums =');
const end = source.indexOf('  // --- Add permalink buttons', start);
assert.ok(start > 0 && end > start, 'exact existing linkifier/DOM-entry boundaries');
function boot() {
  const context = vm.createContext({});
  vm.runInContext(source.slice(start, end) + '\n;globalThis.api = {linkifyEnglish,linkifyHebrew,addCrossReferenceLinks,_lmUrl};', context);
  return { context, api: context.api };
}
const { api } = boot();
const hrefs = html => load(html, null, false)('a.cross-ref').map((_, e) => load(e).root().find('a').attr('href')).get();
const text = html => load(html, null, false).text();
function render(language, input) { return api['linkify' + language](input) || input; }
function check(language, input, expected) {
  const output = render(language, input);
  const parsed = load(output, null, false);
  assert.deepEqual(hrefs(output), expected, input);
  assert.equal(text(output), text(input), 'complete visible source text conserved');
  assert.equal(parsed('a a').length, 0, 'no nested anchors');
  assert.equal(output.includes('\u0000xref'), input.includes('\u0000xref'), 'no new reference marker leaks');
  assert.equal(render(language, output), output, 'safe repeated linkification');
  return output;
}
function hebrew(number) {
  let n = number, result = '';
  for (const [value, letter] of [[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק']]) {
    if (n >= value) { result += letter; n -= value; }
  }
  if (n === 15 || n === 16) return result + (n === 15 ? 'טו' : 'טז');
  return result + ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'][Math.floor(n / 10)] + ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'][n % 10];
}
const membership = JSON.parse(read('scripts/fixtures/reader-cross-reference-membership/source-membership.json')).memberships;

test('all affected positive file memberships retain their exact storage identities', () => {
  assert.equal(membership.length, 4);
  for (const row of membership) {
    const stem = row.book === 'likutay-moharan' ? 'torah' : row.book === 'likutay-tefilos' ? 'prayer' : 'story';
    const directory = 'public/reader/' + row.book + (stem === 'story' ? '' : '/part-' + row.part) + '/';
    const actual = fs.readdirSync(new URL(directory, root)).map(name => name.match(new RegExp('^' + stem + '-(\\d+)\\.json$'))).filter(Boolean).map(match => Number(match[1])).filter(n => n > 0).sort((a,b) => a-b);
    assert.deepEqual(actual, row.numbers, 'actual source-file membership, not broad generated route bounds');
    for (const path of row.source_files) assert.ok(fs.statSync(new URL(path, root)).isFile(), path);
    for (const number of row.numbers) {
      const lm = row.book === 'likutay-moharan', prayer = row.book === 'likutay-tefilos';
      const english = lm ? (row.part === 2 ? 'LM II: ' : 'LM ') + number : prayer ? 'Prayer ' + number : "Rabbi Nachman's Stories " + number;
      const heb = lm ? 'ליקוטי מוהר"ן ' + (row.part === 2 ? 'תנינא סימן ' : '') + hebrew(number) : prayer ? 'ליקוטי תפילות ' + hebrew(number) : 'סיפורי מעשיות ' + hebrew(number);
      const url = '/reader/' + row.book + '/' + row.part + '/' + number + '/';
      check('English', english, [url]);
      check('Hebrew', heb, [url]);
    }
  }
});

test('out-of-membership references remain exact unlinked text without volume inference', () => {
  for (const n of [287, 297, 358, 460, 656, 9999]) {
    for (const prefix of ['LM ', 'Torah ', 'Lesson ', 'Siman ', 'LM I: ', 'LM II: ', 'Tinyana ']) check('English', prefix + n, []);
    if (n <= 400) for (const prefix of ['סימן ', 'ליקוטי מוהר"ן ', 'ליקוטי מוהר"ן תנינא סימן ']) check('Hebrew', prefix + hebrew(n), []);
  }
  check('English', 'LM II: 126', []);
  check('English', 'Likutay Moharan Part Two, Torah 126', []);
  check('Hebrew', 'ליקוטי מוהר"ן תנינא סימן קכו', []);
  for (const n of [0, 152, 206, 9999]) check('English', 'Prayer ' + n, []);
  for (const n of [0, 16, 87, 9999]) check('English', "Rabbi Nachman's Stories " + n, []);
  check('Hebrew', 'ליקוטי תפילות רו', []);
  check('Hebrew', 'סיפורי מעשיות פז', []);
});

test('explicit second-volume references produce one link and cannot fall through to volume one', () => {
  for (const number of [5, 46, 125]) {
    check('English', 'Likutay Moharan Part Two, Torah ' + number, ['/reader/likutay-moharan/2/' + number + '/']);
    check('Hebrew', 'ליקוטי מוהר"ן תנינא סימן ' + hebrew(number), ['/reader/likutay-moharan/2/' + number + '/']);
  }
});

test('source words are not treated as partial Hebrew number sums', () => {
  for (const value of ['ליקוטי מוהר"ן תנינא', 'ליקוטי מוהר"ן דברים', 'ליקוטי תפילות תפילה', 'סיפורי מעשיות מעשה', 'סימן תורה', 'סימן שפל']) check('Hebrew', value, []);
});

test('original paragraph bytes and DOM text survive genuine complete saved source fields', () => {
  for (const file of ['public/reader/likutay-moharan/part-2/torah-46.json', 'public/reader/likutay-moharan/part-2/torah-92.json']) {
    const original = fs.readFileSync(new URL(file, root));
    const data = JSON.parse(original);
    for (const segment of data.segments) for (const [field, language] of [['en','English'], ['he','Hebrew'], ['he_nikud','Hebrew']]) {
      const input = segment[field];
      if (typeof input !== 'string' || !input || /<\/?a\b/.test(input)) continue;
      const output = render(language, input);
      assert.equal(text(output), text(input), file + ' ' + segment.index + ' ' + field);
      assert.equal(load(output, null, false)('a a').length, 0);
      const inverse = output.replace(/<a href="[^"]+" class="cross-ref" target="_blank" title="[^"]*">/g, '').replace(/<\/a>/g, '');
      assert.equal(inverse, input, 'only generated anchors may differ');
    }
    assert.deepEqual(fs.readFileSync(new URL(file, root)), original, 'real source is never written');
  }
});

test('actual DOM entry skips invalid references, conserves owners and remains idempotent', () => {
  const { context, api: entry } = boot();
  const paragraphs = {
    en: [{innerHTML: 'LM 358; Prayer 206', dataset: {}, id: 'preserved-a'}, {innerHTML: 'LM 157', dataset: {}, id: 'preserved-b'}],
    he: [{innerHTML: 'סימן שנח; סיפורי מעשיות פז', dataset: {}, id: 'preserved-c'}],
  };
  context.document = {querySelectorAll: selector => selector === '.segment-en p' ? paragraphs.en : paragraphs.he};
  entry.addCrossReferenceLinks();
  assert.equal(paragraphs.en[0].innerHTML, 'LM 358; Prayer 206');
  assert.equal(paragraphs.he[0].innerHTML, 'סימן שנח; סיפורי מעשיות פז');
  assert.deepEqual(hrefs(paragraphs.en[1].innerHTML), ['/reader/likutay-moharan/1/157/']);
  assert.deepEqual(paragraphs.en.map(p => p.id), ['preserved-a', 'preserved-b']);
  assert.equal(paragraphs.en[1].dataset.xrefDone, '1');
  const before = JSON.stringify(paragraphs);
  entry.addCrossReferenceLinks();
  assert.equal(JSON.stringify(paragraphs), before);
});

test('strict numerals stay local and unrelated reference outputs remain byte-exact', () => {
  const controls = JSON.parse(read('scripts/fixtures/reader-cross-reference-membership/unrelated-reference-outputs.json'));
  for (const row of controls) {
    const output = render(row.language, row.input);
    assert.equal(output, row.baselineOutput, 'unchanged original callback output: ' + row.input);
    assert.equal(text(output), text(row.input));
  }
});
