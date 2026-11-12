import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';

// Current-main preimages (098ce892): invert only the accessible-name insertion.
// Historical audio/navigation fixtures stay fixed; no Git dependency at runtime.
const baselines = {
  'azamra': '0b5879f6a5d7ca0c5ed0b84c764534d2e7935b685b681ff83be0ce818fae85d7',
  'ebay-hanachal': 'c58c27f30b27c74dd7e83eb2413942e3702c3a97340c218b258543ba1b171547',
  'fires-of-israel': '31aaccd591c023ab2eb0d49a1faaf57fbee27e38aa02f7eb1ef39661446bce3a',
  'hisbodidus-alone-time': '9403e8669afc995ceaf521510444b4a9e1fed143dc5714ce690a4932b016087e',
  'seven-pillars': '1d8fc1069c34beef3b5e0ad995dfd17adac3c72223eafaa48e9e75f46217438b',
  'shivchay-haran': '7a07a93451095b4eab2bdb75ec2b76df054778a839eb47199da2721950b5f8c0',
  'sichos-chayay-saba': 'dbf00051c887ca029098964f00e1dbef76d10168271cb4310e0381e86676e5ed',
  'sichos-haran': '61dab5937cf251d8da1252502b3c3719e57f2549059e850209a7a21e1727e371',
  'praises-of-rabbi-nachman': '6e1ad7b62bff3b89cbfbbca596c12b2f1ae6c9fd5cec2b89fdccdfa60ff6041d',
};
const before = '<input type="range" id="font-size-slider" class="font-size-slider" min="12" max="32" value="18" />';
const approved = before.replace(' id="font-size-slider"', ' id="font-size-slider" aria-label="Font size"');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function check(bytes, baseline) {
  const page = bytes.toString('utf8');
  assert.equal(page.split('id="font-size-slider"').length - 1, 1, 'one original slider ID');
  const tags = page.match(/<input\b[^>]*\bid="font-size-slider"[^>]*>/g) || [];
  assert.equal(tags.length, 1, 'one actual slider input');
  const slider = load(tags[0])('input');
  assert.deepEqual({ ...slider.attr() }, {
    type: 'range', id: 'font-size-slider', 'aria-label': 'Font size',
    class: 'font-size-slider', min: '12', max: '32', value: '18',
  }, 'named native range retains every existing attribute');
  assert.equal(page.split(approved).length - 1, 1, 'one exact approved insertion');
  // Buffer slices retain every other original byte, including line endings.
  const at = bytes.indexOf(approved);
  const inverse = Buffer.concat([bytes.subarray(0, at), Buffer.from(before), bytes.subarray(at + Buffer.byteLength(approved))]);
  assert.equal(sha256(inverse), baseline, 'all other template bytes are conserved');
}

assert.equal(Object.keys(baselines).length, 9);
for (const [book, baseline] of Object.entries(baselines)) {
  test(`${book}: named font-size range and exact whole-template conservation`, () => {
    const bytes = fs.readFileSync(new URL(`../src/pages/reader/${book}/[part]/[torah].astro`, import.meta.url));
    check(bytes, baseline);
    const page = bytes.toString('utf8');
    for (const [label, mutation] of [
      ['missing name', page.replace(approved, before)],
      ['empty name', page.replace('aria-label="Font size"', 'aria-label=""')],
      ['wrong name', page.replace('aria-label="Font size"', 'aria-label="A"')],
      ['duplicate slider', page.replace(approved, approved + approved)],
      ['changed range', page.replace(approved, approved.replace('max="32"', 'max="33"'))],
      ['unrelated source change', page + '\n<!-- unrelated -->\n'],
    ]) assert.throws(() => check(Buffer.from(mutation), baseline), assert.AssertionError, label);
    check(bytes, baseline); // Fresh positive after all in-memory negative controls.
  });
}
