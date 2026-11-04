import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as core from '../src/lib/search-mode-core.mjs';
import {displayBookLabel} from '../src/lib/search-book-labels.mjs';
import {qualifiedSearchAnchor, qualifiedSearchLocation} from '../src/lib/qualified-search-arrival.mjs';

const require = createRequire(import.meta.url);
const {transformSync} = require('esbuild');
const source = readFileSync(process.env.SEARCH_WORD_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url), 'utf8');
const script = source.match(/<script>\s*([\s\S]*?)<\/script>/)[1].replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
const end = script.lastIndexOf('    });');
const code = transformSync(script.slice(0, end) + '\nwindow.probe = {clientSearch, fnv1a32, queryTermGroups, idsForMode};\n' + script.slice(end), {loader: 'ts', target: 'es2022'}).code;
const docs = [
  {n: 'alpha beta joy', c: 'one'},
  {n: 'beta alpha prayer', c: 'two'},
  {n: 'alpha gamma prayers', c: 'one'},
  {n: 'alphabet delta joyful', c: 'two'},
  {n: 'אין שום יאוש בעולם', c: 'one'},
  {n: 'אין בעולם שום יאוש', c: 'two'},
].map((d, id) => ({...d, id, t: 'Document ' + id, h: '', p: '/reader/' + d.c + '/1/' + (id + 1), he: d.n, en: '', m: []}));
const response = value => ({ok: true, status: 200, json: async () => value});
const fail = status => ({ok: false, status});
const copy = value => JSON.parse(JSON.stringify(value));
class Element {
  constructor() { this.style = {}; this.textContent = '{}'; this.classList = {add() {}, remove() {}, contains: () => false}; }
  addEventListener() {}
  querySelectorAll() { return []; }
}
function harness({advertise = true, wordTransport, phraseAvailable = false} = {}) {
  const events = new Map(), calls = [], warnings = [];
  const document = {addEventListener: (type, fn) => events.set(type, fn), getElementById: id => ['search-dates', 'compactYahrzeit', 'search-dates-slot'].includes(id) ? null : new Element(), createElement: () => new Element()};
  const meta = {generatedAt: 'fixture-version', items: docs, ...(advertise ? {wordShards: 'fnv1a32-high8-v1'} : {})};
  let api;
  const fetch = async (url, opts) => {
    const path = decodeURIComponent(String(url).split('?')[0]); calls.push({url: String(url), path, opts});
    if (path.endsWith('/meta.json')) return response(meta);
    if (path.includes('/docs/')) return response(docs[Number(path.match(/(\d+)\.json/)[1])]);
    if (path.includes('/phrases/')) {
      if (!phraseAvailable) return fail(503);
      const rows = [];
      for (const doc of docs) {
        const tokens = doc.n.split(' ');
        for (const hash of new Set(tokens.slice(0, -1).map((t, i) => api.fnv1a32(t + ' ' + tokens[i + 1])))) {
          if ((hash >>> 24).toString(16).padStart(2, '0') === path.match(/([^/]+)\.bin$/)[1]) rows.push([hash, doc.id]);
        }
      }
      rows.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const buffer = new ArrayBuffer(rows.length * 8), view = new DataView(buffer);
      rows.forEach(([hash, id], i) => {view.setUint32(i * 8, hash, true); view.setUint32(i * 8 + 4, id, true);});
      return {ok: true, status: 200, arrayBuffer: async () => buffer};
    }
    const key = path.match(/([^/]+)\.json$/)?.[1];
    const isWord = path.includes('/words/');
    if (!isWord && !path.includes('/shards/')) throw new Error('unexpected URL ' + url);
    const postings = {};
    for (const doc of docs) for (const term of new Set(doc.n.split(' '))) {
      const indexed = isWord ? [term] : [term, 'e:' + Array.from(term).reverse().join('')];
      for (const word of indexed) if (isWord ? (api.fnv1a32(word) >>> 24).toString(16).padStart(2, '0') === key : word[0] === key) (postings[word] ||= []).push(doc.id);
    }
    return isWord && wordTransport ? wordTransport(postings, path) : response(postings);
  };
  const window = {location: {origin: 'https://fixture.invalid', search: '?nojev', href: 'https://fixture.invalid/search-enhanced?nojev'}, history: {replaceState() {}}};
  vm.runInContext(code, vm.createContext({...core, displayBookLabel, qualifiedSearchAnchor, qualifiedSearchLocation, window, document, fetch, URL, URLSearchParams, AbortController, TextEncoder, DataView, queueMicrotask, localStorage: {getItem: () => null}, console: {warn: (...a) => warnings.push(a), error() {}}, setTimeout: () => 1, clearTimeout() {}}));
  events.get('DOMContentLoaded')(); api = window.probe;
  return {calls, warnings, api, search: (q, advanced = {}) => api.clientSearch(q, advanced)};
}

for (const [mode, query] of [
  ['google', 'alpha beta'], ['all', 'alpha beta'], ['any', 'alpha gamma'],
  ['exact', 'alpha beta'], ['boolean', 'alpha OR NOT beta'],
  ['proximity', 'alpha beta'], ['google', 'prayer'], ['google', 'אין שום יאוש'],
  ['google', '"אין שום יאוש"'], ['exact', 'missing alpha'], ['boolean', 'NOT missing'],
]) {
  test(`${mode} / ${query}: identical verified results and book filtering with compact postings`, async () => {
    for (const books of [[], ['one'], ['two']]) {
      const old = harness({advertise: false}), fresh = harness();
      const advanced = {searchType: mode, books, proximityDistance: 3};
      const expected = await old.search(query, advanced), actual = await fresh.search(query, advanced);
      assert.deepEqual(copy(actual), copy(expected));
      assert.ok(fresh.calls.some(c => c.path.includes('/words/')), 'compact path must execute');
      assert.equal(fresh.calls.filter(c => c.path.includes('/shards/')).length, 0);
      for (const c of fresh.calls.filter(c => c.path.includes('/words/'))) {
        assert.match(c.url, /\?v=fixture-version$/);
        assert.equal(c.opts.headers.Accept, 'application/json');
      }
    }
  });
}
for (const mode of ['startsWith', 'endsWith']) test(`${mode} still scans original prefix/suffix shards`, async () => {
  const h = harness(), old = harness({advertise: false});
  assert.deepEqual(copy(await h.search('alpha', {searchType: mode})), copy(await old.search('alpha', {searchType: mode})));
  assert.ok(h.calls.some(c => c.path.includes('/shards/')));
  assert.equal(h.calls.filter(c => c.path.includes('/words/')).length, 0);
});
test('available exact-phrase binary path stays ahead of word lookups', async () => {
  const h = harness({phraseAvailable: true});
  const result = await h.search('"אין שום יאוש"');
  assert.equal(result.results.length, 1);
  assert.match(result.results[0].link, /^\/reader\/one\/1\/5/);
  assert.ok(h.calls.some(c => c.path.includes('/phrases/')));
  assert.equal(h.calls.filter(c => c.path.includes('/words/') || c.path.includes('/shards/')).length, 0);
});
for (const failure of ['404', '503', 'network', 'JSON']) test(`${failure}: original-shard fallback and ordinary retry do not poison word cache`, async () => {
  let broken = true;
  const h = harness({wordTransport: postings => {
    if (!broken) return response(postings);
    if (failure === 'network') throw new Error('network');
    if (failure === 'JSON') return {ok: true, json: async () => {throw new SyntaxError('JSON');}};
    return fail(Number(failure));
  }});
  const first = await h.search('alpha'); broken = false;
  const firstWords = h.calls.filter(c => c.path.includes('/words/')).length;
  assert.ok(firstWords > 0);
  assert.ok(h.calls.some(c => c.path.includes('/shards/')));
  assert.deepEqual(copy(await h.search('alpha')), copy(first));
  const afterRetry = h.calls.filter(c => c.path.includes('/words/')).length;
  assert.ok(afterRetry > firstWords, 'failed compact request must be retried');
  assert.deepEqual(copy(await h.search('alpha')), copy(first));
  assert.equal(h.calls.filter(c => c.path.includes('/words/')).length, afterRetry, 'successful compact requests cached');
});
test('UTF-8 hash matches builder, collision buckets retain full term keys', () => {
  const h = harness();
  assert.equal((h.api.fnv1a32('אין') >>> 24).toString(16), '35');
  assert.equal((h.api.fnv1a32('שום') >>> 24).toString(16), 'cb');
  assert.equal((h.api.fnv1a32('יאוש') >>> 24).toString(16), '9c');
  const hashByte = h.api.fnv1a32('alpha') >>> 24;
  let collision;
  for (let i = 0; i < 10000; i++) if ((h.api.fnv1a32('other' + i) >>> 24) === hashByte) { collision = 'other' + i; break; }
  assert.ok(collision, 'a genuine same-bucket different word is required');
  assert.deepEqual(copy(h.api.idsForMode([{alpha: [0], [collision]: [1]}], 'alpha', 'exact')), [0]);
});
