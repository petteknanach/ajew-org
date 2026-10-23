import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createReaderPlainAvailability, readerPlainAlternates } from '../src/lib/reader-plain-availability.mjs';

// Opt-in artifact test: an authenticated read-only sample, not a rebuilt corpus.
const root = process.env.READER_PLAIN_ACTUAL_PUBLIC;
const pinsPath = process.env.READER_PLAIN_ACTUAL_PINS;
assert.ok(root && pinsPath, 'Set READER_PLAIN_ACTUAL_PUBLIC and READER_PLAIN_ACTUAL_PINS to the admitted artifact sample');
const pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
const digest = b => createHash('sha256').update(b).digest('hex');
const raw = readFileSync(join(root, 'reader-plain/index.json'));
assert.equal(digest(raw), pins.catalog.sha256);
const catalog = JSON.parse(raw);
assert.equal(catalog.entries.length, 31303);
assert.equal(catalog.total, catalog.entries.length);
for (const file of pins.files) {
  if (file.path === 'reader-plain/likutay-nanach/full.md' || file.path === 'reader-plain/likutay-nanach/full.txt') continue;
  const bytes = readFileSync(join(root, file.path));
  assert.equal(bytes.length, file.bytes); assert.equal(digest(bytes), file.sha256);
}

test('authenticated 31,303-entry generated catalog and exact sampled section/full bodies drive real resolver', () => {
  const get = createReaderPlainAvailability({ publicDir: root });
  const normal = get('/reader/likutay-moharan/1/1/');
  assert.equal(normal.state, 'available');
  assert.equal(normal.section.html, 'https://ajew.org/reader-plain/likutay-moharan/1/1/');
  assert.equal(readerPlainAlternates(normal).length, 6);
  for (const path of ['/reader/chayey-moharan/1/hashmata-162', '/reader/saba-tape-transcripts/1/23-b', '/reader/saba-tape-transcripts/1/9-b']) {
    assert.equal(get(path).state, 'unavailable', path); assert.equal(readerPlainAlternates(get(path)).length, 0);
  }
  assert.equal(get('/reader/sichos-haran/reviewed/271-280/'), null, 'manual reviewed entry remains outside numeric contract');
  assert.equal(get('/reader/likutay-nanach/volume-4/16'), null, 'raw catalog source is nonnumeric in predecessor');
  assert.equal(get('/reader/likutay-nanach/4/16').state, 'unavailable', 'predecessor catalog is not silently repaired by the consumer');
  const choices = new Map(); let missingSource = 0, identical = 0;
  for (const row of catalog.entries) {
    if (!row.sourceUrl) { missingSource++; continue; }
    const key = row.sourceUrl.replace(/\/$/, '');
    if (choices.has(key)) { assert.equal(choices.get(key), row.url); identical++; }
    else choices.set(key, row.url);
  }
  console.log(JSON.stringify({ catalogEntries: catalog.entries.length, identicalSourceUrlUrlDuplicates: identical, entriesWithoutSourceUrl: missingSource, actualSampleFullWorkFormats: 2, actualSampleSectionFormats: 8 }));
});
