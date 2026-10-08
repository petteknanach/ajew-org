import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const root = 'public/reader/precious-stones/english';
const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`, 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('exact authorized English PDF and all 166 lossless facsimile previews', () => {
  assert.equal(manifest.pageCount, 166);
  assert.equal(manifest.searchableReaderText, false);
  assert.equal(manifest.sourceBytes, 53282230);
  assert.equal(manifest.sourceSha256, 'e2b1b34d41b60d1763c10354dde2882c47250b8b996d96a3c9ea2f8225fbc7bb');
  assert.equal(sha(`${root}/${manifest.sourceFilename}`), manifest.sourceSha256);
  assert.equal(manifest.pages.length, 166);
  manifest.pages.forEach((page, i) => {
    assert.equal(page.page, i + 1);
    assert.equal(page.pixelEquality, true);
    assert.equal(page.url, `/reader/precious-stones/english/pages/page-${String(i + 1).padStart(3, '0')}.webp`);
    assert.equal(fs.statSync(`public${page.url}`).size, page.bytes);
    assert.equal(sha(`public${page.url}`), page.sha256);
  });
});
function reader(search = '') {
  const elements = {};
  for (const id of ['image','page','prev','next','status','original','viewport','jump','zoom-in','zoom-out','fit']) {
    elements[`stones-${id}`] = { style: {}, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } };
  }
  let lastUrl;
  const sandbox = { document: { getElementById: (id) => elements[id] }, location: { search, href: `https://ajew.org/reader/precious-stones/english/${search}` }, URL, URLSearchParams, history: { replaceState: (_, __, url) => { lastUrl = String(url); } } };
  vm.runInNewContext(fs.readFileSync('public/precious-stones-english-reader.js', 'utf8'), sandbox);
  return { get: (id) => elements[`stones-${id}`], click: (id) => elements[`stones-${id}`].handlers.click(), lastUrl: () => lastUrl };
}
test('full init, boundaries, jump, page URL, zoom and error fallback', () => {
  const r = reader();
  assert.equal(r.get('page').value, '1'); assert.equal(r.get('prev').disabled, true);
  r.click('next'); assert.equal(r.get('page').value, '2'); assert.match(r.lastUrl(), /page=2/);
  r.click('prev'); assert.equal(r.get('page').value, '1');
  r.get('page').value = '166'; r.get('jump').handlers.submit({ preventDefault() {} });
  assert.match(r.get('image').src, /page-166.webp$/); assert.equal(r.get('next').disabled, true);
  assert.match(r.get('original').href, /#page=166$/);
  r.click('next'); assert.equal(r.get('page').value, '166');
  for (const bad of ['999','0','-1','1.5','NaN']) {
    r.get('page').value = bad; r.get('jump').handlers.submit({ preventDefault() {} });
    assert.match(r.get('image').src, /page-166.webp$/);
  }
  r.click('zoom-in'); assert.equal(r.get('image').style.width, '125%');
  r.click('zoom-out'); assert.equal(r.get('image').style.width, '100%');
  r.click('zoom-in'); r.click('fit'); assert.equal(r.get('image').style.width, '100%');
  r.get('image').handlers.error(); assert.match(r.get('status').textContent, /original PDF/);
  assert.equal(reader('?page=55').get('page').value, '55');
  for (const invalid of ['-1', '0', '167', '1.5', 'NaN']) assert.equal(reader(`?page=${invalid}`).get('page').value, '1');
});
test('facsimile discovery and reciprocal language links', () => {
  const directory = fs.readFileSync('src/pages/reader/index.astro', 'utf8');
  assert.match(directory, /id: 'precious-stones-english'/);
  assert.match(directory, /directoryHref: '\/reader\/precious-stones\/english\/'/);
  assert.match(directory, /Original PDF Books/);
  assert.match(directory, /parts: \[\], pageCount: 166/);
  const en = fs.readFileSync('src/pages/reader/precious-stones/english/index.astro', 'utf8');
  const he = fs.readFileSync('src/pages/reader/precious-stones/index.astro', 'utf8');
  assert.match(en, /not a searchable text edition in the Reader/);
  assert.match(en, /Read the Hebrew edition/);
  assert.match(he, /Read the English edition/);
  assert.match(en, /precious-stones-english-reader.js\?v=20261008-1/);
});
