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
const sourcePath = process.env.SEARCH_SHARD_RECOVERY_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
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
for (const failure of ['HTTP 503', 'HTTP 429', 'HTTP 500', 'HTTP 403', 'network rejection', 'JSON rejection']) {
  test(`${failure}: full-init same-query retry refetches failed shard`, async () => {
    let first = true, jsonCalls = 0;
    const h = harness({transport: (_path, _opts, shard) => {
      if (!first) return response(shard);
      first = false;
      if (failure.startsWith('HTTP')) return nonOK(Number(failure.slice(5)));
      if (failure === 'network rejection') throw new Error('network fixture');
      return {ok: true, status: 200, json: async () => { jsonCalls++; throw new SyntaxError('malformed body fixture'); }};
    }});
    h.search(); await settle();
    const firstState = {message: h.els.noResultsMessage.textContent, cached: h.cache.has('a'), cacheKeys: Object.keys(h.cache.get('a') || {}), shardCalls: h.shardCalls().length, cards: h.cards()};
    // Finish the retry before asserting, so the original baseline receipt proves
    // BOTH the poisoned empty cache and its ordinary retry failing to refetch.
    h.search(); await settle();
    console.log(JSON.stringify({failure, firstState, retry: {shardCalls: h.shardCalls().length, cards: h.cards(), cacheSize: h.cache.size}}));
    assert.equal(h.shardCalls().length, 2, 'ordinary retry must refetch; no failure may poison shard cache');
    assert.equal(firstState.cached, false);
    assert.equal(firstState.message, 'Search unavailable. Please try again.');
    assert.equal(firstState.shardCalls, 1, 'no automatic retry loop');
    assert.equal(jsonCalls, failure === 'JSON rejection' ? 1 : 0);
    positive(h); assert.equal(h.errors.length, 1);
    assert.equal(h.cache.get('a'), h.shard, 'successful postings cached unchanged');
    h.search(); await settle(); positive(h); assert.equal(h.shardCalls().length, 2);
    await h.more().fire('click'); await settle(); positive(h, 'alpha', 100);
  });
}

test('404 absent-prefix builder contract retains empty cached no-results', async () => {
  // The real builder creates only prefixes encountered in shard_terms, not every
  // possible Unicode prefix. Missing files legitimately mean no postings.
  const builder = readFileSync(new URL('./build-reader-search-shards.py', import.meta.url), 'utf8');
  assert.match(builder, /shard_terms = defaultdict\(lambda: defaultdict\(list\)\)/);
  assert.match(builder, /for prefix, term_map in sorted\(shard_terms.items\(\)\):\s+with open\(SHARDS \/ f'\{prefix\}\.json'/);
  const h = harness({transport: () => nonOK(404)});
  h.search('zzunrepresented'); await settle();
  assert.equal(h.els.noResults.classList.contains('hidden'), false);
  assert.notEqual(h.els.noResultsMessage.textContent, 'Search unavailable. Please try again.');
  assert.equal(h.cache.has('z'), true); assert.equal(Object.keys(h.cache.get('z')).length, 0);
  h.search('zzunrepresented'); await settle();
  assert.equal(h.shardCalls().length, 1); assert.equal(h.errors.length, 0); assert.equal(h.cards(), 0);
});
test('200 empty JSON is cached as legitimate no-results', async () => {
  const empty = {}; const h = harness({transport: () => response(empty)});
  h.search(); await settle(); h.search(); await settle();
  assert.equal(h.cache.get('a'), empty); assert.equal(h.shardCalls().length, 1);
  assert.equal(h.els.noResults.classList.contains('hidden'), false);
  assert.notEqual(h.els.noResultsMessage.textContent, 'Search unavailable. Please try again.');
  assert.equal(h.errors.length, 0); assert.equal(h.cards(), 0);
});
test('200 valid postings preserve object/cache, versioned URL, headers and Load more', async () => {
  const h = harness(); h.search(); await settle(); positive(h);
  assert.equal(h.cache.get('a'), h.shard);
  assert.equal(h.shardCalls()[0].url, '/reader-search/shards/a.json?v=fixture-version');
  assert.equal(h.shardCalls()[0].opts.headers.Accept, 'application/json');
  h.search(); await settle(); positive(h); assert.equal(h.shardCalls().length, 1);
  await h.more().fire('click'); await settle(); positive(h, 'alpha', 100);
  assert.equal(new Set(h.state().lastSearchResults.map(r => r.link)).size, h.state().lastSearchResults.length);
});
for (const failure of ['HTTP', 'JSON']) for (const cancel of ['Clear', 'new query']) {
  test(`late old ${failure} failure after ${cancel} cannot overwrite state/cache`, async () => {
    const pending = deferred(); let used = false, bodyStarted = false;
    const h = harness({transport: (_path, _opts, shard) => {
      if (used) return response(shard);
      used = true;
      if (failure === 'HTTP') return pending.promise;
      return {ok: true, status: 200, json: () => { bodyStarted = true; return pending.promise; }};
    }});
    h.search(); await settle(); assert.ok(used);
    if (failure === 'JSON') assert.ok(bodyStarted);
    if (cancel === 'Clear') h.clear();
    else {
      // Same prefix on purpose: late rejection must not evict a newer success.
      h.search('alphas'); await settle(); positive(h, 'alphas');
    }
    const current = h.state(), html = h.els.resultsList.innerHTML;
    if (failure === 'HTTP') pending.resolve(nonOK(503)); else pending.reject(new SyntaxError('old body fixture'));
    await settle();
    assert.equal(h.state().activeContinuation, current.activeContinuation);
    assert.equal(h.state().lastSearchResults, current.lastSearchResults);
    assert.equal(h.els.resultsList.innerHTML, html); assert.equal(h.errors.length, 0);
    if (cancel === 'Clear') {
      assert.equal(h.els.welcomeMessage.classList.contains('hidden'), false);
      assert.equal(h.els.loading.classList.contains('hidden'), true);
      assert.equal(h.els.resultsContainer.classList.contains('hidden'), true);
      assert.equal(h.cache.has('a'), false);
      h.search(); await settle(); positive(h); assert.equal(h.shardCalls().length, 2);
    } else { positive(h, 'alphas'); assert.equal(h.cache.get('a'), h.shard); }
  });
}
for (const mode of ['google', 'all', 'any', 'exact', 'startsWith', 'endsWith', 'boolean']) {
  test(`${mode}: fresh retry after 503 keeps 50-to-100 Load more and mode verifier`, async () => {
    let first = true;
    const h = harness({transport: (_path, _opts, shard) => {
      if (first) { first = false; return nonOK(503); } return response(shard);
    }});
    const opts = {searchType: mode, minWords: 1, books: ['fixture']};
    h.search('alpha', opts); await settle(); unavailable(h);
    assert.equal(h.shardCalls().length, 1); assert.equal(h.cache.size, 0);
    h.search('alpha', opts); await settle(); positive(h);
    assert.equal(h.shardCalls().length, 2); assert.equal(h.cache.get(mode === 'endsWith' ? 'e' : 'a'), h.shard);
    await h.more().fire('click'); await settle(); positive(h, 'alpha', 100);
    assert.equal(h.shardCalls().length, 2); assert.equal(h.errors.length, 1);
  });
}
