import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { snapshotFor, snapshotForIndices, persistSnapshot } from '../src/lib/lh-publication-reader.js';
import '../public/my-sefer-storage.js';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root));
const json = path => JSON.parse(read(path));
const admitted = json('scripts/fixtures/lh5-reader/accepted-files.json');
const pages = Array.from({length: 14}, (_, n) => json(`public/reader/likutay-halachos/part-1/halacha-${n + 43}.json`));
const owners = new Map();
const units = new Map();
for (const page of pages) {
  for (const row of page.segments.filter(row => row.sourceEdition)) {
    if (owners.has(row.sourceOwner)) assert.deepEqual(row, owners.get(row.sourceOwner));
    owners.set(row.sourceOwner, row);
  }
  for (const unit of page.sourcePublication.units) {
    if (units.has(unit.unit)) assert.deepEqual(unit, units.get(unit.unit));
    units.set(unit.unit, unit);
  }
}

class Store {
  constructor(primary = null, legacy = null) {
    this.map = new Map();
    if (primary !== null) this.map.set('mySefer', primary);
    if (legacy !== null) this.map.set('ajew-my-sefer', legacy);
    this.reads = 0;
    this.writes = 0;
  }
  getItem(key) {
    const value = this.map.get(key) ?? null;
    if (key === 'mySefer' && ++this.reads === this.raceRead) {
      queueMicrotask(() => this.map.set(this.changedKey || 'mySefer', this.newer));
    }
    return value;
  }
  setItem(key, value) { this.writes++; this.map.set(key, String(value)); }
}
const api = globalThis.AjewSeferStorage;
const longPage = pages.find(page => page.torah === 49);
const saved = snapshotFor(longPage, null, '/reader/likutay-halachos/1/49/');
const legacyEntry = {id: 'lh-regression-legacy', source: 'https://ajew.org/reader/likutay-halachos/1/42/#seg-3', title: 'Existing independent saved passage', content: 'Preserve this saved text and its source.', addedAt: '2026-11-05'};
const legacy = JSON.stringify({sections: [legacyEntry]});

test('all 44 accepted LH artifacts retain their complete admitted bytes', () => {
  assert.equal(Object.keys(admitted.files).length, 44);
  for (const [path, expected] of Object.entries(admitted.files)) {
    const bytes = read(path);
    assert.equal(bytes.length, expected.bytes, path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, path);
  }
});

test('current pair, hierarchy and qualifications have independent complete domains', () => {
  assert.equal(owners.size, 447);
  const rows = [...owners.values()];
  assert.deepEqual(rows.filter(r => r.sourceReference != null).map(r => r.sourceReference).sort((a,b) => a-b), Array.from({length:240}, (_,n) => n+100));
  assert.equal(rows.filter(r => r.sourceRole === 'item_marker').length, 169);
  assert.equal(rows.reduce((n,r) => n+r.translatorNotes.length, 0), 111);
  assert.equal(units.size, 14);
  for (const page of pages) {
    assert.equal(page.sourcePublication.schema, 'lh-authenticated-publication-v1');
    assert.deepEqual(page.aligned_segments, page.segments);
    assert.equal(new Set(page.segments.map(r => r.index)).size, page.segments.length);
    const legacyIndices = new Set(page.legacyAnnotationContext.map(r => r.index));
    assert.ok(page.segments.every(r => !legacyIndices.has(r.index)));
  }
  assert.equal(pages.reduce((n,p) => n+p.legacyAnnotationContext.length,0), 241);
  assert.equal(pages.reduce((n,p) => n+p.segments.filter(r => !r.sourceEdition).length,0), 206);
});

test('14 independent aids conserve all 414 editorial rows and 28 real diagrams', () => {
  const summaries = json('public/reader/likutay-halachos/summaries/index.json');
  assert.equal(summaries.items.length, 42);
  const added = summaries.items.filter(item => item.sourceEdition === 'lh-volume-5-en13-he2');
  assert.equal(added.length, 14);
  assert.equal(new Set(summaries.items.map(item => item.summaryUrl)).size, 42);
  let aidRows = 0, diagrams = 0;
  for (const item of added) {
    const unit = units.get(item.sourceUnit);
    assert.ok(unit);
    const flattened = item.sections.flatMap(section => [section.heading, ...section.paragraphs]);
    assert.deepEqual(flattened, unit.editorialAids.map(aid => aid.text));
    assert.deepEqual(item.diagrams, unit.diagrams);
    assert.equal(item.studyAidUrl, item.readerUrl+'#'+unit.aidAnchor);
    aidRows += flattened.length;
    diagrams += item.diagrams.length;
  }
  assert.equal(aidRows, 414);
  assert.equal(diagrams, 28);
  assert.equal(added.filter(item => item.torah === 45).length, 2);
  assert.deepEqual(added.find(item => item.sourceUnit === 'BK-6').readerAliases, [56]);
});

test('complete snapshots include both languages and every attached qualification', () => {
  for (const page of pages) {
    const all = snapshotFor(page, null, `/reader/likutay-halachos/1/${page.torah}/`);
    for (const row of page.segments) {
      for (const text of [row.sourceEdition ? row.he_nikud : row.he, row.en, ...(row.translatorNotes || []).map(note => note.text)]) {
        if (text) assert.ok(all.savedText.includes(text));
      }
    }
    assert.match(all.savedText, /Matched source edition/);
    assert.equal(all.sourceEnglishSHA256, page.sourcePublication.enSHA256);
  }
  assert.throws(() => snapshotFor(longPage, 'not-a-source-index', '/reader/likutay-halachos/1/49/'), /not found/);
});

test('selection snapshots use complete immutable owning rows and qualified real Save', async () => {
  const rows = longPage.segments.filter(row => row.sourceReference != null && row.translatorNotes.length).slice(0, 2);
  assert.equal(rows.length, 2);
  const pathname = '/reader/likutay-halachos/1/49/';
  const selection = snapshotForIndices(longPage, [rows[1].index, rows[0].index, rows[1].index], pathname);
  assert.deepEqual(selection.sourceSelectionIndices, rows.map(row => row.index));
  for (const row of rows) {
    assert.ok(selection.savedText.includes(row.en));
    assert.ok(selection.savedText.includes(row.he_nikud));
    for (const note of row.translatorNotes) assert.ok(selection.savedText.includes(note.text));
  }
  assert.equal(selection.readerUrl, pathname+'#seg-'+rows[0].index);
  const single = snapshotForIndices(longPage, [rows[0].index], pathname);
  const ordinary = snapshotFor(longPage, rows[0].index, pathname);
  assert.equal(single.savedText, ordinary.savedText);
  assert.equal(single._key, ordinary._key);
  const whole = snapshotForIndices(longPage, longPage.segments.map(row => row.index), pathname);
  assert.equal(whole.savedText, snapshotFor(longPage, null, pathname).savedText);
  assert.equal(whole._key, saved._key);
  assert.throws(() => snapshotForIndices(longPage, [], pathname), /not found/);
  assert.throws(() => snapshotForIndices(longPage, [rows[0].index, 'unknown-source'], pathname), /not found/);
  const storage = new Store();
  assert.equal(await persistSnapshot(storage, api, selection, 'https://ajew.org'), true);
  const actual = await api.loadAndMigrate(storage, 'https://ajew.org');
  assert.equal(actual.passages[0].savedText, selection.savedText);
  assert.deepEqual(actual.passages[0].sourceSelectionIndices, selection.sourceSelectionIndices);
  assert.equal(await persistSnapshot(storage, api, snapshotForIndices(longPage, rows.map(row => row.index), pathname), 'https://ajew.org'), false);
});

test('real migration owns two verified writes, retains old store and refuses duplicate Save', async () => {
  const storage = new Store(null, legacy);
  assert.equal(await persistSnapshot(storage, api, saved, 'https://ajew.org'), true);
  assert.equal(storage.writes, 2);
  assert.equal(storage.map.get('ajew-my-sefer'), legacy);
  const actual = await api.loadAndMigrate(storage, 'https://ajew.org');
  assert.equal(actual.passages.length, 2);
  assert.equal(actual.passages[0].savedText, legacyEntry.content);
  assert.equal(actual.passages[1].savedText, saved.savedText);
  assert.equal(await persistSnapshot(storage, api, saved, 'https://ajew.org'), false);
});

for (const kind of ['unpack-with-no-legacy', 'already-imported-legacy-hash']) {
  test(`real helper rejects a foreign primary wire during ${kind}`, async () => {
    const hash = createHash('sha256').update(JSON.stringify([legacyEntry.id, legacyEntry.source, legacyEntry.title, legacyEntry.content, legacyEntry.addedAt])).digest('hex');
    const primary = JSON.stringify({name:'Independent collection', passages:[], legacyImportedKeys:kind === 'already-imported-legacy-hash' ? [hash] : [], createdAt:1, updatedAt:1});
    const storage = new Store(primary, kind === 'already-imported-legacy-hash' ? legacy : null);
    storage.raceRead = 2;
    storage.newer = JSON.stringify({name:'Newer non-locking update', passages:[{id:'keep-foreign',savedText:'Keep the newer complete collection'}],createdAt:1,updatedAt:2});
    await assert.rejects(persistSnapshot(storage, api, saved, 'https://ajew.org'), /Collection changed/);
    assert.equal(storage.map.get('mySefer'), storage.newer);
    assert.equal(storage.writes, 0);
  });
}

test('real helper also rejects a changed legacy wire without rewriting either store', async () => {
  const primary = JSON.stringify({name:'Independent collection',passages:[],createdAt:1,updatedAt:1});
  const storage = new Store(primary);
  storage.raceRead = 2;
  storage.changedKey = 'ajew-my-sefer';
  storage.newer = legacy;
  await assert.rejects(persistSnapshot(storage, api, saved, 'https://ajew.org'), /Collection changed/);
  assert.equal(storage.map.get('mySefer'), primary);
  assert.equal(storage.map.get('ajew-my-sefer'), legacy);
  assert.equal(storage.writes, 0);
});
