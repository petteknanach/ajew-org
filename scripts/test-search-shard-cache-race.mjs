import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as core from '../src/lib/search-mode-core.mjs';
import {displayBookLabel} from '../src/lib/search-book-labels.mjs';
import {qualifiedSearchAnchor} from '../src/lib/qualified-search-arrival.mjs';

// Full actual page init, events, continuation and lexical caches. Remove only
// imports (supplied unchanged below); append observations, never replace helpers.
const require = createRequire(import.meta.url);
const {transformSync} = require('esbuild');
const sourcePath = process.env.SEARCH_SHARD_CACHE_RACE_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');
const script = source.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'actual search page script required');
const withoutImports = script.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
const end = withoutImports.lastIndexOf('    });');
assert.ok(end > 0);
const observed = withoutImports.slice(0, end) + `
      window.probe = {
        state: () => ({activeSearchRequest, activeContinuation, lastSearchResults, jevPCount}),
        shards: readerShardCache,
      };
` + withoutImports.slice(end);
const code = transformSync(observed, {loader: 'ts', target: 'es2022'}).code;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return {promise, resolve, reject};
};
// Bounded microtask flush; every test asserts a reached terminal state or gate.
const settle = async () => { for (let i = 0; i < 160; i++) await Promise.resolve(); };
class Element {
  constructor(hidden = false) {
    this.handlers = new Map(); this.children = []; this.style = {}; this.value = '';
    this.textContent = ''; this._html = ''; this.disabled = false;
    const classes = new Set(hidden ? ['hidden'] : []);
    this.classList = {add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c)};
  }
  addEventListener(type, fn) { this.handlers.set(type, fn); }
  fire(type, event = {}) { return this.handlers.get(type)?.call(this, event); }
  set innerHTML(value) { this._html = value; this.children = []; }
  get innerHTML() { return this._html; }
  appendChild(child) { this.children.push(child); return child; }
  querySelectorAll() { return []; }
  scrollIntoView() {}
}
function harness({transport = null} = {}) {
  const els = Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels'].map(id => [id, new Element(['loading','resultsContainer','noResults'].includes(id))]));
  els['search-book-labels'].textContent = '{}';
  const events = new Map(), calls = [], errors = [], timers = new Map(); let timerId = 0;
  const doc = {addEventListener: (type, fn) => events.set(type, fn), getElementById: id => els[id] || null, createElement: () => new Element()};
  const ids = Array.from({length: 240}, (_, id) => id);
  const meta = {generatedAt: 'fixture-version', items: ids.map(id => ({p: '/reader/fixture/' + id}))};
  const shard = {alpha: ids, alphas: ids, beta: ids, betas: ids, 'e:ahpla': ids};
  const fetch = async (url, opts = {}) => {
    const path = String(url).split('?')[0]; calls.push({url: String(url), path, opts});
    if (path === '/reader-search/meta.json') return {ok: true, status: 200, json: async () => meta};
    if (path.startsWith('/reader-search/shards/')) return transport ? transport(path, opts, shard) : response(shard);
    if (path.startsWith('/reader-search/docs/')) {
      const id = Number(path.match(/(\d+)\.json/)[1]);
      return response({t: 'Document ' + id, p: '/reader/fixture/' + id, c: 'fixture', n: 'alpha beta', en: 'alpha beta', m: []});
    }
    // Never access a provider, even if the production nojev branch regresses.
    throw new Error('unexpected fixture URL: ' + path);
  };
  const window = {location: {origin: 'https://fixture.invalid', search: '?nojev=1', href: 'https://fixture.invalid/search-enhanced?nojev=1'}, history: {replaceState: (_, __, url) => { window.location.href = String(url); }}};
  const ctx = vm.createContext({...core, displayBookLabel, qualifiedSearchAnchor, document: doc, window, fetch, URL, URLSearchParams, AbortController, TextEncoder, DataView, queueMicrotask, localStorage: {getItem: () => null, setItem() {}}, navigator: {}, console: {warn() {}, error: (...args) => errors.push(args)}, setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn, ms}); return id; }, clearTimeout: id => timers.delete(id)});
  vm.runInContext(code, ctx, {filename: String(sourcePath)});
  events.get('DOMContentLoaded')();
  // Run the actual zero-delay metadata warmup registered by full page init.
  for (const [id, timer] of timers) if (timer.ms === 0) { timers.delete(id); timer.fn(); }
  return {
    els, calls, errors, timers, shard, window, cache: window.probe.shards,
    search: (query = 'alpha', advancedOptions = {}) => events.get('enhanced-search')({detail: {query, filters: {}, advancedOptions}}),
    clear: () => els.clearResults.fire('click'),
    more: () => els.resultsList.children.at(-1),
    state: () => window.probe.state(),
    cards: () => (els.resultsList.innerHTML.match(/class="result-item"/g) || []).length,
    shardCalls: () => calls.filter(c => c.path.includes('/shards/')),
  };
}
const response = value => ({ok: true, status: 200, json: async () => value});
const nonOK = status => ({ok: false, status, json: () => { throw new Error('nonOK body must not be consumed'); }});
function unavailable(h) {
  assert.equal(h.els.loading.classList.contains('hidden'), true);
  assert.equal(h.els.noResults.classList.contains('hidden'), false);
  assert.equal(h.els.noResultsMessage.textContent, 'Search unavailable. Please try again.');
  assert.equal(h.state().activeContinuation, null);
  assert.equal(h.state().lastSearchResults.length, 0);
}
function positive(h, query = 'alpha', cards = 50) {
  assert.equal(h.els.loading.classList.contains('hidden'), true);
  assert.equal(h.els.noResults.classList.contains('hidden'), true);
  assert.equal(h.els.resultsContainer.classList.contains('hidden'), false);
  assert.match(h.els.resultsCount.textContent, new RegExp('"' + query + '"'));
  assert.equal(h.cards(), cards);
  assert.equal(h.state().jevPCount, 0);
  assert.equal(h.calls.filter(c => c.path.startsWith('/jev')).length, 0);
  assert.equal(h.timers.size, 0);
}

function empty(h) {
  assert.equal(h.els.loading.classList.contains('hidden'), true);
  assert.equal(h.els.noResults.classList.contains('hidden'), false);
  assert.notEqual(h.els.noResultsMessage.textContent, 'Search unavailable. Please try again.');
  assert.equal(h.state().lastSearchResults.length, 0);
}
function unchanged(h, before, html) {
  assert.equal(h.state().activeContinuation, before.activeContinuation);
  assert.equal(h.state().lastSearchResults, before.lastSearchResults);
  assert.equal(h.els.resultsList.innerHTML, html);
  assert.equal(h.errors.length, 0);
}
for (const mode of ['google', 'exact', 'boolean', 'endsWith']) {
  test(`${mode}: older404 cannot erase newer successful cache or next same-prefix query`, async () => {
    const old = deferred(); let count = 0;
    const h = harness({transport: (_path, _opts, shard) => ++count === 1 ? old.promise : response(shard)});
    const opts = {searchType: mode, minWords: 1, books: ['fixture']};
    h.search('alpha', opts); await settle(); assert.equal(count, 1);
    h.search('alpha', opts); await settle(); positive(h, 'alpha'); assert.equal(count, 2);
    const key = mode === 'endsWith' ? 'e' : 'a'; assert.equal(h.cache.get(key), h.shard);
    const before = h.state(), html = h.els.resultsList.innerHTML;
    old.resolve(nonOK(404)); await settle(); unchanged(h, before, html); positive(h, 'alpha');
    const retained = h.cache.get(key) === h.shard;
    h.search('alpha', opts); await settle();
    console.log(JSON.stringify({mode, retained, nextVisibleCards: h.els.resultsContainer.classList.contains('hidden') ? 0 : h.cards(), shardCalls: count}));
    positive(h); assert.equal(retained, true); assert.equal(count, 2);
    await h.more().fire('click'); await settle(); positive(h, 'alpha', 100);
  });
}
test('Clear while404pending then fresh success remains after late404 and cache reuse', async () => {
  const old = deferred(); let count = 0;
  const h = harness({transport: (_path, _opts, shard) => ++count === 1 ? old.promise : response(shard)});
  h.search(); await settle(); assert.equal(count, 1); h.clear();
  assert.equal(h.els.welcomeMessage.classList.contains('hidden'), false);
  assert.equal(h.els.resultsContainer.classList.contains('hidden'), true);
  h.search('alphas'); await settle(); positive(h, 'alphas');
  const before = h.state(), html = h.els.resultsList.innerHTML;
  old.resolve(nonOK(404)); await settle(); unchanged(h, before, html);
  h.search(); await settle(); positive(h); assert.equal(h.cache.get('a'), h.shard); assert.equal(count, 2);
});
for (const reversed of [false, true]) {
  test(`${reversed ? 'newer404 older200' : 'older404 newer200'}:404first then200later restores cache without stale UI`, async () => {
    const old = deferred(), newer = deferred(); let count = 0;
    const h = harness({transport: () => ++count === 1 ? old.promise : newer.promise});
    h.search(); await settle(); h.search('alphas'); await settle(); assert.equal(count, 2);
    (reversed ? newer : old).resolve(nonOK(404)); await settle();
    assert.equal(Object.keys(h.cache.get('a')).length, 0); if (reversed) empty(h);
    const before = h.state(), html = h.els.resultsList.innerHTML;
    (reversed ? old : newer).resolve(response(h.shard)); await settle();
    if (reversed) {unchanged(h, before, html); empty(h);} else positive(h, 'alphas');
    assert.equal(h.cache.get('a'), h.shard); h.search(); await settle(); positive(h); assert.equal(count, 2);
  });
}
test('404 during successful200 JSON body gap is replaced when body resolves', async () => {
  const old = deferred(), body = deferred(); let count = 0, started = false;
  const h = harness({transport: () => ++count === 1 ? old.promise : {ok: true, status: 200, json: () => {started = true; return body.promise;}}});
  h.search(); await settle(); h.search('alphas'); await settle(); assert.equal(started, true);
  old.resolve(nonOK(404)); await settle(); assert.equal(Object.keys(h.cache.get('a')).length, 0);
  body.resolve(h.shard); await settle(); positive(h, 'alphas'); assert.equal(h.cache.get('a'), h.shard);
  h.search(); await settle(); positive(h); assert.equal(count, 2);
});
test('successful200 empty object retains identity against concurrent late404', async () => {
  const old = deferred(), value = {}; let count = 0;
  const h = harness({transport: () => ++count === 1 ? old.promise : response(value)});
  h.search(); await settle(); h.search('alphas'); await settle(); empty(h); assert.equal(h.cache.get('a'), value);
  old.resolve(nonOK(404)); await settle(); empty(h); assert.equal(h.cache.get('a'), value);
  h.search(); await settle(); empty(h); assert.equal(count, 2);
});
test('standalone absent-prefix404 remains cached legitimate no-results without repeat fetch', async () => {
  const builder = readFileSync(new URL('./build-reader-search-shards.py', import.meta.url), 'utf8');
  assert.match(builder, /for prefix, term_map in sorted\(shard_terms.items\(\)\):\s+with open\(SHARDS \/ f'\{prefix\}\.json'/);
  const h = harness({transport: () => nonOK(404)});
  h.search('zzunrepresented'); await settle(); empty(h); assert.equal(h.cache.has('z'), true);
  h.search('zzunrepresented'); await settle(); empty(h); assert.equal(h.shardCalls().length, 1);
  assert.equal(h.errors.length, 0); assert.equal(Object.keys(h.cache.get('z')).length, 0);
});
test('standalone200 empty body remains cached legitimate no-results by identity', async () => {
  const value = {}, h = harness({transport: () => response(value)});
  h.search(); await settle(); empty(h); h.search(); await settle(); empty(h);
  assert.equal(h.cache.get('a'), value); assert.equal(h.shardCalls().length, 1); assert.equal(h.errors.length, 0);
});
for (const failure of ['503', 'network', 'JSON']) {
  test(`late old ${failure} cannot remove newer successful cache`, async () => {
    const old = deferred(); let count = 0, started = false;
    const h = harness({transport: (_path, _opts, shard) => {
      if (++count > 1) return response(shard);
      if (failure === 'JSON') return {ok: true, status: 200, json: () => {started = true; return old.promise;}};
      return old.promise;
    }});
    h.search(); await settle(); if (failure === 'JSON') assert.equal(started, true);
    h.search('alphas'); await settle(); positive(h, 'alphas');
    const before = h.state(), html = h.els.resultsList.innerHTML;
    if (failure === '503') old.resolve(nonOK(503)); else old.reject(new Error('controlled old failure'));
    await settle(); unchanged(h, before, html); assert.equal(h.cache.get('a'), h.shard);
    h.search(); await settle(); positive(h); assert.equal(count, 2);
  });
}
test('late404 does not affect independent other-prefix cached postings', async () => {
  const old = deferred();
  const h = harness({transport: (path, _opts, shard) => path.includes('/a.json') ? old.promise : response(shard)});
  h.search(); await settle(); h.search('beta'); await settle(); positive(h, 'beta');
  const before = h.state(), html = h.els.resultsList.innerHTML;
  old.resolve(nonOK(404)); await settle(); unchanged(h, before, html); assert.equal(h.cache.get('b'), h.shard);
  h.search('beta'); await settle(); positive(h, 'beta'); assert.equal(h.shardCalls().length, 2);
});
test('normal successful cache and50to100 continuation preserve headers version uniqueness', async () => {
  const h = harness(); h.search(); await settle(); positive(h); assert.equal(h.cache.get('a'), h.shard);
  assert.equal(h.shardCalls()[0].url, '/reader-search/shards/a.json?v=fixture-version');
  assert.equal(h.shardCalls()[0].opts.headers.Accept, 'application/json');
  h.search(); await settle(); positive(h); assert.equal(h.shardCalls().length, 1);
  await h.more().fire('click'); await settle(); positive(h, 'alpha', 100);
  assert.equal(new Set(h.state().lastSearchResults.map(r => r.link)).size, h.state().lastSearchResults.length);
});
