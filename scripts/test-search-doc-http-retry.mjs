import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as core from '../src/lib/search-mode-core.mjs';
import {displayBookLabel} from '../src/lib/search-book-labels.mjs';
import {qualifiedSearchAnchor} from '../src/lib/qualified-search-arrival.mjs';

// Execute actual full page init and event/continuation callers. Imports are
// supplied unchanged; append read-only observations, never replace helpers.
const require = createRequire(import.meta.url);
const {transformSync} = require('esbuild');
const sourcePath = process.env.SEARCH_DOC_HTTP_RETRY_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
const script = readFileSync(sourcePath, 'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'actual page script required');
const withoutImports = script.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
const end = withoutImports.lastIndexOf('    });');
assert.ok(end > 0);
const observed = withoutImports.slice(0, end) + `
      window.probe = {state: () => ({activeSearchRequest, activeContinuation, lastSearchResults, jevPCount})};
` + withoutImports.slice(end);
const code = transformSync(observed, {loader: 'ts', target: 'es2022'}).code;
const settle = async () => { for (let i = 0; i < 200; i++) await Promise.resolve(); };
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
const response = value => ({ok: true, status: 200, json: async () => value});
function harness({count = 1, transport = (_id, _attempt, doc) => response(doc)} = {}) {
  const els = Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels'].map(id => [id, new Element(['loading','resultsContainer','noResults'].includes(id))]));
  els['search-book-labels'].textContent = '{}';
  const events = new Map(), calls = [], errors = [], timers = new Map(), attempts = new Map();
  let timerId = 0, bodyCalls = 0;
  const ids = Array.from({length: count}, (_, id) => id);
  const meta = {generatedAt: 'fixture-version', items: ids.map(id => ({p: '/reader/fixture/' + id}))};
  const shard = {alpha: ids, beta: ids};
  const fetch = async (url, opts = {}) => {
    const path = String(url).split('?')[0]; calls.push({url: String(url), path, opts});
    if (path === '/reader-search/meta.json') return response(meta);
    if (path.startsWith('/reader-search/shards/')) return response(shard);
    if (path.startsWith('/reader-search/docs/')) {
      const id = Number(path.match(/(\d+)\.json/)[1]);
      const attempt = (attempts.get(id) || 0) + 1; attempts.set(id, attempt);
      return transport(id, attempt, {t: 'Document ' + id, p: '/reader/fixture/' + id, c: 'fixture', n: 'alpha beta', en: 'alpha beta', m: []});
    }
    throw new Error('unexpected fixture URL (providers forbidden): ' + path);
  };
  const window = {location: {origin: 'https://fixture.invalid', search: '?nojev=1', href: 'https://fixture.invalid/search-enhanced?nojev=1'}, history: {replaceState: (_, __, url) => { window.location.href = String(url); }}};
  const document = {addEventListener: (type, fn) => events.set(type, fn), getElementById: id => els[id] || null, createElement: () => new Element()};
  const ctx = vm.createContext({...core, displayBookLabel, qualifiedSearchAnchor, document, window, fetch, URL, URLSearchParams, AbortController, TextEncoder, DataView, queueMicrotask, localStorage: {getItem: () => null, setItem() {}}, navigator: {}, console: {warn() {}, error: (...args) => errors.push(args)}, setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn, ms}); return id; }, clearTimeout: id => timers.delete(id)});
  vm.runInContext(code, ctx, {filename: String(sourcePath)});
  events.get('DOMContentLoaded')();
  for (const [id, timer] of timers) if (timer.ms === 0) { timers.delete(id); timer.fn(); }
  return {
    els, calls, errors, timers, attempts, window,
    nonOK: status => ({ok: false, status, json: async () => { bodyCalls++; throw new Error('nonOK body must not be consumed'); }}),
    bodyCalls: () => bodyCalls,
    search: (query = 'alpha') => events.get('enhanced-search')({detail: {query, filters: {}, advancedOptions: {searchType: 'google'}}}),
    clear: () => els.clearResults.fire('click'),
    more: () => els.resultsList.children.at(-1),
    state: () => window.probe.state(),
    cards: () => (els.resultsList.innerHTML.match(/class="result-item"/g) || []).length,
    docCalls: id => calls.filter(c => c.path === '/reader-search/docs/' + id + '.json'),
    tick300: () => { const ready = [...timers].filter(([, t]) => t.ms === 300); for (const [id, t] of ready) { timers.delete(id); t.fn(); } return ready.length; },
  };
}
function positive(h, cards = 1, query = 'alpha') {
  assert.equal(h.els.loading.classList.contains('hidden'), true);
  assert.equal(h.els.noResults.classList.contains('hidden'), true);
  assert.equal(h.els.resultsContainer.classList.contains('hidden'), false);
  assert.match(h.els.resultsCount.textContent, new RegExp('"' + query + '"'));
  assert.equal(h.cards(), cards);
  assert.equal(h.state().jevPCount, 0);
  assert.equal(h.calls.some(c => c.path.startsWith('/jev')), false);
  assert.equal(h.timers.size, 0);
}
function receipt(label, h, extra = {}) {
  console.log(JSON.stringify({label, attempts: [...h.attempts], cards: h.cards(), links: h.state().lastSearchResults.map(r => r.link), message: h.els.noResultsMessage.textContent, timers: [...h.timers.values()].map(t => t.ms), errors: h.errors.length, ...extra}));
}
for (const status of [429, 500, 502, 503, 504, 599]) {
  test(`HTTP ${status} retries once after 300ms and restores first actual verified document`, async () => {
    let h; h = harness({transport: (_id, attempt, doc) => attempt === 1 ? h.nonOK(status) : response(doc)});
    h.search(); await settle();
    const before = {calls: h.docCalls(0).length, cards: h.cards(), timers: [...h.timers.values()].map(t => t.ms)};
    const fired = h.tick300(); await settle();
    // Log completed behavior before asserting: the WHOLE baseline suite keeps
    // negative receipts, not only a helper pattern or a single failing case.
    receipt('recover-' + status, h, {before, fired});
    assert.equal(before.calls, 1); assert.equal(before.cards, 0);
    assert.deepEqual(before.timers, [300]); assert.equal(fired, 1);
    assert.equal(h.docCalls(0).length, 2); assert.equal(h.bodyCalls(), 0);
    positive(h); assert.equal(h.errors.length, 0);
    assert.equal(h.state().lastSearchResults[0].link.split('?')[0], '/reader/fixture/0');
    assert.match(h.els.resultsList.innerHTML, /Document 0/);
    for (const call of h.docCalls(0)) {
      assert.equal(call.url, '/reader-search/docs/0.json?v=fixture-version');
      assert.equal(call.opts.headers.Accept, 'application/json');
    }
  });
}
for (const status of [400, 401, 403, 404]) {
  test(`permanent HTTP ${status} stays single-shot, non-consuming and per-document fail-open`, async () => {
    let h; h = harness({count: 2, transport: (id, _attempt, doc) => id === 0 ? h.nonOK(status) : response(doc)});
    h.search(); await settle(); receipt('permanent-' + status, h);
    positive(h); assert.equal(h.docCalls(0).length, 1); assert.equal(h.docCalls(1).length, 1);
    assert.equal(h.bodyCalls(), 0); assert.equal(h.errors.length, 0);
    assert.equal(h.state().lastSearchResults[0].link.split('?')[0], '/reader/fixture/1');
  });
}
test('exhausted 503 is two total attempts with one backoff, without aborting other documents', async () => {
  let h; h = harness({count: 2, transport: (id, _attempt, doc) => id === 0 ? h.nonOK(503) : response(doc)});
  h.search(); await settle(); const fired = h.tick300(); await settle(); receipt('exhausted-503', h, {fired});
  assert.equal(fired, 1); assert.equal(h.docCalls(0).length, 2); assert.equal(h.tick300(), 0);
  positive(h); assert.equal(h.docCalls(1).length, 1); assert.equal(h.bodyCalls(), 0); assert.equal(h.errors.length, 0);
  assert.equal(h.state().lastSearchResults[0].link.split('?')[0], '/reader/fixture/1');
});
test('mixed network then HTTP 503 shares the same two-attempt total budget', async () => {
  let h; h = harness({count: 2, transport: (id, attempt, doc) => {
    if (id !== 0) return response(doc);
    if (attempt === 1) throw new Error('controlled network rejection');
    return h.nonOK(503);
  }});
  h.search(); await settle(); const fired = h.tick300(); await settle(); receipt('mixed-network-http', h, {fired});
  assert.equal(fired, 1); assert.equal(h.docCalls(0).length, 2); assert.equal(h.tick300(), 0);
  positive(h); assert.equal(h.bodyCalls(), 0); assert.equal(h.errors.length, 0);
  assert.equal(h.state().lastSearchResults[0].link.split('?')[0], '/reader/fixture/1');
});
for (const cancel of ['Clear', 'new query']) {
  test(`${cancel} during first HTTP backoff prevents stale completion from redrawing`, async () => {
    let h; h = harness({count: 240, transport: (id, attempt, doc) => id === 0 && attempt === 1 ? h.nonOK(503) : response(doc)});
    h.search(); await settle(); const pending = [...h.timers.values()].map(t => t.ms);
    if (cancel === 'Clear') h.clear(); else { h.search('beta'); await settle(); }
    const current = h.state(), html = h.els.resultsList.innerHTML, count = h.els.resultsCount.textContent;
    const beforeCalls = h.calls.filter(c => c.path.includes('/docs/')).length;
    const fired = h.tick300(); await settle();
    receipt('cancel-' + cancel, h, {pending, fired});
    assert.deepEqual(pending, [300]); assert.equal(fired, 1);
    assert.equal(h.docCalls(0).length, cancel === 'Clear' ? 2 : 3);
    assert.equal(h.calls.filter(c => c.path.includes('/docs/')).length, beforeCalls + 1, 'no obsolete next batch');
    assert.equal(h.state().activeContinuation, current.activeContinuation);
    assert.equal(h.state().lastSearchResults, current.lastSearchResults);
    assert.equal(h.els.resultsList.innerHTML, html); assert.equal(h.els.resultsCount.textContent, count);
    assert.equal(h.errors.length, 0); assert.equal(h.timers.size, 0);
    if (cancel === 'Clear') {
      assert.equal(h.els.welcomeMessage.classList.contains('hidden'), false);
      assert.equal(h.els.resultsContainer.classList.contains('hidden'), true);
      assert.equal(h.els.loading.classList.contains('hidden'), true);
      assert.equal(h.state().activeContinuation, null); assert.equal(h.state().lastSearchResults.length, 0);
      assert.equal(new URL(h.window.location.href).searchParams.has('q'), false);
    } else positive(h, 50, 'beta');
  });
}
test('Load more HTTP retry preserves actual continuation identity, cursor, uniqueness and 50-to-100 cards', async () => {
  let h; h = harness({count: 240, transport: (id, attempt, doc) => id === 96 && attempt === 1 ? h.nonOK(503) : response(doc)});
  h.search(); await settle(); positive(h, 50);
  const continuation = h.state().activeContinuation;
  assert.equal(continuation.cursor, 96); assert.equal(continuation.results.length, 96);
  const pending = h.more().fire('click'); await settle();
  const before = {cards: h.cards(), cursor: continuation.cursor, results: continuation.results.length, timers: [...h.timers.values()].map(t => t.ms)};
  const fired = h.tick300(); await pending; await settle(); receipt('more-http-retry', h, {before, fired});
  assert.deepEqual(before, {cards: 50, cursor: 96, results: 96, timers: [300]}); assert.equal(fired, 1);
  positive(h, 100); assert.equal(h.docCalls(96).length, 2);
  assert.equal(h.state().activeContinuation, continuation); assert.equal(continuation.cursor, 144);
  assert.equal(continuation.results.length, 144); assert.equal(new Set(continuation.results.map(r => r.link)).size, 144);
  assert.ok(continuation.results.some(r => r.link.split('?')[0] === '/reader/fixture/96'));
  assert.equal(h.errors.length, 0); assert.equal(h.bodyCalls(), 0);
});
test('JSON rejection keeps existing outer unavailable policy without an extra document attempt', async () => {
  let jsonCalls = 0;
  const h = harness({transport: () => ({ok: true, status: 200, json: async () => { jsonCalls++; throw new SyntaxError('controlled malformed JSON'); }})});
  h.search(); await settle(); receipt('json-policy', h, {jsonCalls});
  assert.equal(h.docCalls(0).length, 1); assert.equal(jsonCalls, 1); assert.equal(h.timers.size, 0);
  assert.equal(h.els.noResults.classList.contains('hidden'), false);
  assert.equal(h.els.noResultsMessage.textContent, 'Search unavailable. Please try again.');
  assert.equal(h.els.loading.classList.contains('hidden'), true);
  assert.equal(h.state().activeContinuation, null); assert.equal(h.state().lastSearchResults.length, 0);
  assert.equal(h.errors.length, 1);
});
