import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const root = 'public/reader/precious-stones';
const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`, 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('exact authorized PDF and all 126 facsimile previews', () => {
  assert.equal(manifest.pageCount, 126);
  assert.equal(manifest.searchableHebrewText, false);
  assert.equal(manifest.sourceBytes, 36802716);
  assert.equal(manifest.sourceSha256, '7f6fab6358a52340ea688f1c0dc186fcc6c11f09c32d06be94ff36feefc10a57');
  assert.equal(sha(`${root}/${manifest.sourceFilename}`), manifest.sourceSha256);
  assert.equal(manifest.pages.length, 126);
  manifest.pages.forEach((page, i) => {
    assert.equal(page.page, i + 1);
    assert.equal(page.url, `/reader/precious-stones/pages/page-${String(i + 1).padStart(3, '0')}.webp`);
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
  const sandbox = { document: { getElementById: (id) => elements[id] }, location: { search, href: `https://ajew.org/reader/precious-stones/${search}` }, URL, URLSearchParams, history: { replaceState: (_, __, url) => { lastUrl = String(url); } } };
  vm.runInNewContext(fs.readFileSync('public/precious-stones-reader.js', 'utf8'), sandbox);
  return { elements, get: (id) => elements[`stones-${id}`], click: (id) => elements[`stones-${id}`].handlers.click(), lastUrl: () => lastUrl };
}
test('full init, boundaries, jump, share URL, zoom and error fallback', () => {
  const r = reader();
  assert.equal(r.get('page').value, '1'); assert.equal(r.get('prev').disabled, true);
  r.click('next'); assert.equal(r.get('page').value, '2'); assert.match(r.lastUrl(), /page=2/);
  r.click('prev'); assert.equal(r.get('page').value, '1');
  r.get('page').value = '126'; r.get('jump').handlers.submit({ preventDefault() {} });
  assert.match(r.get('image').src, /page-126.webp$/); assert.equal(r.get('next').disabled, true);
  assert.match(r.get('original').href, /#page=126$/);
  r.click('next'); assert.equal(r.get('page').value, '126');
  r.get('page').value = '999'; r.get('jump').handlers.submit({ preventDefault() {} });
  assert.match(r.get('image').src, /page-126.webp$/);
  r.click('zoom-in'); assert.equal(r.get('image').style.width, '125%');
  r.click('zoom-out'); assert.equal(r.get('image').style.width, '100%');
  r.click('zoom-in'); r.click('fit'); assert.equal(r.get('image').style.width, '100%');
  r.get('image').handlers.error(); assert.match(r.get('status').textContent, /original PDF/);
  assert.equal(reader('?page=55').get('page').value, '55');
  for (const invalid of ['-1', '0', '127', '1.5', 'NaN']) assert.equal(reader(`?page=${invalid}`).get('page').value, '1');
});
test('Reader directory entry is a facsimile, not a fake text catalog', () => {
  const directory = fs.readFileSync('src/pages/reader/index.astro', 'utf8');
  assert.match(directory, /id: 'precious-stones'/);
  assert.match(directory, /directoryHref: '\/reader\/precious-stones\/'/);
  assert.match(directory, /Original PDF Books/);
  assert.match(directory, /parts: \[\], pageCount: 126/);
  assert.match(fs.readFileSync('src/pages/reader/precious-stones/index.astro', 'utf8'), /not searchable Hebrew text/);
});
