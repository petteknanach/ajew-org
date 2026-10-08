import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import * as core from '../src/lib/search-mode-core.mjs';
import {displayBookLabel} from '../src/lib/search-book-labels.mjs';
import {qualifiedSearchAnchor} from '../src/lib/qualified-search-arrival.mjs';

// Execute the entire actual page script and DOMContentLoaded scheduling.
// Only remove imports (supplied below) and append lexical observation hooks;
// no production function bodies or promise/event scheduling are replaced.
const require = createRequire(import.meta.url);
const {transformSync} = require('esbuild');
const sourcePath = process.env.SEARCH_LIFECYCLE_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');
const script = source.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'actual search page script required');
const withoutImports = script.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
const end = withoutImports.lastIndexOf('    });');
assert.ok(end > 0);
const observed = withoutImports.slice(0, end) + `
      window.probe = {
        performSearch, clientSearch,
        state: () => ({activeSearchRequest, activeContinuation, lastSearchResults, jevPCount}),
      };
` + withoutImports.slice(end);
const code = transformSync(observed, {loader: 'ts', target: 'es2022'}).code;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return {promise, resolve, reject};
};
const settle = async () => { for (let i = 0; i < 80; i++) await Promise.resolve(); };
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
function harness({count = 240, nojev = true, gates = [], initial = null, fail = null} = {}) {
  const els = Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels'].map(id => [id, new Element(['loading','resultsContainer','noResults'].includes(id))]));
  els['search-book-labels'].textContent = '{}';
  const events = new Map(), calls = [], timers = new Map(); let timerId = 0;
  const doc = {addEventListener: (type, fn) => events.set(type, fn), getElementById: id => els[id] || null, createElement: () => new Element()};
  const meta = {items: Array.from({length: count}, (_, id) => ({p: '/reader/fixture/' + id}))};
  const ids = Array.from({length: count}, (_, id) => id);
  const shard = {alpha: ids, alphas: ids, beta: ids, betas: ids};
  // Real binary layouts for the tiny fixture's phrase and letter postings.
  const hash = text => { let n = 0x811c9dc5; for (const b of new TextEncoder().encode(text)) n = Math.imul(n ^ b, 0x01000193) >>> 0; return n; };
  const binary = (key = null) => {
    const buffer = new ArrayBuffer(ids.length * (key == null ? 4 : 8)), view = new DataView(buffer);
    ids.forEach((id, i) => { const at = i * (key == null ? 4 : 8); if (key != null) view.setUint32(at, hash(key), true); view.setUint32(at + (key == null ? 0 : 4), id, true); });
    return buffer;
  };
  function resultDoc(id) { return {t: 'Document ' + id, p: '/reader/fixture/' + id, c: 'fixture', n: 'alpha beta', en: 'alpha beta', m: []}; }
  const fetch = async (url, opts = {}) => {
    const path = String(url).split('?')[0]; calls.push({path, opts});
    const gate = gates.find(g => !g.used && g.match(path, opts));
    if (gate) { gate.used = true; await gate.promise; if (gate.error) throw gate.error; }
    if (fail?.(path, opts)) throw new Error('fixture network failure');
    if (path === '/reader-search/meta.json') return {ok: true, json: async () => meta};
    if (path.startsWith('/reader-search/shards/')) return {ok: true, json: async () => shard};
    if (path.startsWith('/reader-search/phrases/')) return {ok: true, arrayBuffer: async () => binary('alpha beta')};
    if (path.startsWith('/reader-search/letters/')) return {ok: true, arrayBuffer: async () => binary(path.includes('/bigrams/') ? (path.includes('/first/') ? 'a\0b' : 'a\0a') : null)};
    if (path.startsWith('/reader-search/docs/')) return {ok: true, json: async () => resultDoc(Number(path.match(/(\d+)\.json/)[1]))};
    if (path === '/jev-config.json') return {ok: true, json: async () => ({jevRank: true})};
    if (path === '/jev/rank') return {ok: true, json: async () => {
      const bodyGate = gates.find(g => !g.used && g.match('rank-body', opts));
      if (bodyGate) { bodyGate.used = true; await bodyGate.promise; if (bodyGate.error) throw bodyGate.error; }
      return {ranked: [{id: 1, p: 1}, {id: 0, p: 0.1}]};
    }};
    throw new Error('unexpected fixture URL: ' + path);
  };
  const window = {location: {origin: 'https://fixture.invalid', search: nojev ? '?nojev=1&q=alpha' : '?q=alpha', href: 'https://fixture.invalid/search-enhanced?q=alpha'}, history: {replaceState: (_, __, url) => { window.location.href = String(url); }}, enhancedSearch: initial ? {getState: () => initial} : undefined};
  const ctx = vm.createContext({...core, displayBookLabel, qualifiedSearchAnchor, document: doc, window, fetch, URL, URLSearchParams, AbortController, TextEncoder, DataView, queueMicrotask, localStorage: {getItem: () => null, setItem() {}}, navigator: {}, console: {warn() {}, error() {}}, setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id)});
  vm.runInContext(code, ctx, {filename: String(sourcePath)});
  events.get('DOMContentLoaded')();
  return {
    els, calls, gates, window, probe: window.probe,
    search: (query, advancedOptions = {}) => events.get('enhanced-search')({detail: {query, filters: {}, advancedOptions}}),
    clear: () => els.clearResults.fire('click'),
    more: () => els.resultsList.children.at(-1),
    ready: detail => events.get('enhanced-search-ready')({detail}),
    state: () => window.probe.state(),
    visibleQuery: q => assert.match(els.resultsCount.textContent, new RegExp('"' + q + '"')),
  };
}
function gate(match) { return {...deferred(), match: typeof match === 'string' ? path => path === match : match}; }
function welcome(h) {
  assert.equal(h.els.welcomeMessage.classList.contains('hidden'), false, 'welcome must remain visible');
  assert.equal(h.els.resultsContainer.classList.contains('hidden'), true, 'stale results must not render');
  assert.equal(h.els.loading.classList.contains('hidden'), true);
  assert.equal(h.state().activeContinuation, null, 'cleared continuation');
  assert.equal(h.state().lastSearchResults.length, 0, 'cleared result cache');
  assert.equal(h.state().jevPCount, 0, 'cleared query ranking');
}
for (const boundary of ['meta', 'shard', 'docs']) {
  test(`Clear cancels pending ${boundary} and state publication`, async () => {
    const g = gate(path => boundary === 'meta' ? path.endsWith('meta.json') : path.includes('/' + (boundary === 'shard' ? 'shards' : 'docs') + '/'));
    const h = harness({gates: [g]}); h.search('alpha'); await settle(); assert.ok(g.used);
    h.clear(); g.resolve(); await settle(); welcome(h);
    assert.equal(new URL(h.window.location.href).searchParams.has('q'), false);
  });
}
test('empty search invalidates previous nonempty dispatch', async () => {
  const g = gate(path => path.includes('/docs/')); const h = harness({gates: [g]});
  h.search('alpha'); await settle(); h.search('  '); g.resolve(); await settle(); welcome(h);
});
test('Clear drops already rendered continuation/cache', async () => {
  const h = harness(); h.search('alpha'); await settle(); assert.ok(h.state().activeContinuation); h.clear(); welcome(h);
});
test('late old document batch cannot replace newer continuation or cached results', async () => {
  const g = gate(path => path.includes('/docs/')); const h = harness({gates: [g]});
  h.search('alpha'); await settle(); h.search('beta'); await settle();
  const current = h.state(); h.visibleQuery('beta'); g.resolve(); await settle();
  assert.equal(h.state().activeContinuation, current.activeContinuation);
  assert.equal(h.state().lastSearchResults, current.lastSearchResults);
  h.visibleQuery('beta');
});
test('cancelled scan stops before the next document batch', async () => {
  const g = gate(path => path.includes('/docs/')); const h = harness({gates: [g]});
  h.search('alpha'); await settle(); const before = h.calls.filter(c => c.path.includes('/docs/')).length;
  h.clear(); g.resolve(); await settle();
  assert.equal(h.calls.filter(c => c.path.includes('/docs/')).length, before);
});
for (const boundary of ['config', 'rank', 'body']) for (const cancel of ['Clear', 'new query']) {
  test(`${cancel} during Jev ${boundary} await prevents stale render/ranking`, async () => {
    const g = gate(boundary === 'config' ? '/jev-config.json' : boundary === 'rank' ? '/jev/rank' : 'rank-body');
    const h = harness({nojev: false, gates: [g]}); h.search('alpha'); await settle(); assert.ok(g.used);
    if (cancel === 'Clear') h.clear(); else { h.window.location.search = '?nojev=1'; h.search('beta'); await settle(); }
    g.resolve(); await settle();
    if (cancel === 'Clear') welcome(h); else { h.visibleQuery('beta'); assert.equal(h.state().jevPCount, 0, 'stale Jev must not populate current ranking'); }
    if (boundary === 'config') assert.equal(h.calls.filter(c => c.path === '/jev/rank').length, 0, 'no obsolete provider dispatch');
  });
}
for (const cancel of ['Clear', 'new query']) test(`${cancel} during Load more cannot render or publish obsolete state`, async () => {
  const h = harness(); h.search('alpha'); await settle();
  const oldState = h.state().activeContinuation, oldCursor = oldState.cursor, oldLength = oldState.results.length;
  const g = gate(path => path.includes('/docs/')); h.gates.push(g);
  const pending = h.more().fire('click'); await settle(); assert.ok(g.used);
  if (cancel === 'Clear') h.clear(); else { h.search('beta'); await settle(); }
  const current = h.state(); g.resolve(); await pending; await settle();
  assert.equal(oldState.cursor, oldCursor, 'cancelled batch must not consume candidates');
  assert.equal(oldState.results.length, oldLength, 'cancelled batch must not add results');
  assert.equal(h.state().activeContinuation, current.activeContinuation);
  assert.equal(h.state().lastSearchResults, current.lastSearchResults);
  if (cancel === 'Clear') welcome(h); else h.visibleQuery('beta');
});
test('detached old Load more handler cannot consume current query continuation', async () => {
  const h = harness(); h.search('alpha'); await settle(); const button = h.more();
  h.search('beta'); await settle(); const state = h.state().activeContinuation, cursor = state.cursor;
  await button.fire('click'); await settle(); h.visibleQuery('beta'); assert.equal(state.cursor, cursor);
});
test('query dispatch resets ranking; current Jev order persists through Load more', async () => {
  const h = harness({nojev: false}); h.search('alpha'); await settle();
  assert.ok(h.state().jevPCount > 0); assert.ok(h.els.resultsList.innerHTML.indexOf('Document 1<') < h.els.resultsList.innerHTML.indexOf('Document 0<'));
  const rankCalls = h.calls.filter(c => c.path === '/jev/rank').length;
  await h.more().fire('click'); await settle();
  assert.ok(h.els.resultsList.innerHTML.indexOf('Document 1<') < h.els.resultsList.innerHTML.indexOf('Document 0<'));
  assert.equal(h.calls.filter(c => c.path === '/jev/rank').length, rankCalls);
  h.window.location.search = '?nojev=1'; h.search('beta'); await settle(); assert.equal(h.state().jevPCount, 0);
});
test('advanced options and books are dispatch snapshots across awaits and continuation', async () => {
  const g = gate('/reader-search/meta.json'); const h = harness({gates: [g]});
  const advanced = {searchType: 'any', minWords: 1, books: ['fixture']};
  h.search('alpha missing', advanced); await settle(); assert.ok(g.used);
  advanced.minWords = 2; advanced.books.splice(0, 1, 'excluded'); g.resolve(); await settle();
  assert.equal(h.state().lastSearchResults.length, 96, 'original minimum/books must verify');
  await h.more().fire('click'); await settle(); assert.equal(h.state().lastSearchResults.length, 144);
});
test('optional Jev failures fall back to current lexical results', async () => {
  const h = harness({nojev: false, fail: path => path.startsWith('/jev')});
  h.search('alpha'); await settle(); h.visibleQuery('alpha'); assert.equal(h.state().jevPCount, 0);
  assert.equal(h.els.resultsContainer.classList.contains('hidden'), false);
});
test('late failed Jev request cannot replace newer query via fallback', async () => {
  const g = gate('/jev/rank'); g.error = new Error('late failure');
  const h = harness({nojev: false, gates: [g]}); h.search('alpha'); await settle();
  h.window.location.search = '?nojev=1'; h.search('beta'); await settle(); g.resolve(); await settle(); h.visibleQuery('beta');
});
test('current query exhausts candidates with exact total and no continuation', async () => {
  const h = harness({count: 240}); h.search('alpha'); await settle();
  while (h.state().activeContinuation) { await h.more().fire('click'); await settle(); }
  assert.equal(h.state().lastSearchResults.length, 240); assert.match(h.els.resultsCount.textContent, /^240 /);
});
test('URL readiness handshake still dispatches exactly once', async () => {
  const initial = {query: 'alpha', advancedOptions: {searchType: 'google'}};
  const h = harness({initial}); h.ready(initial); await settle(); const request = h.state().activeSearchRequest;
  h.ready(initial); await settle(); assert.equal(h.state().activeSearchRequest, request); h.visibleQuery('alpha');
});
for (const [mode, query, kind] of [['exact', 'alpha beta', 'phrases'], ['acronym', 'ab', 'letters'], ['endletters', 'aa', 'letters']]) {
  test(`${mode} delayed postings cannot start an obsolete scan`, async () => {
    const g = gate(path => path.includes('/' + kind + '/')); const h = harness({gates: [g]});
    h.search(query, {searchType: mode}); await settle(); assert.ok(g.used); h.clear(); g.resolve(); await settle();
    welcome(h); assert.equal(h.calls.filter(c => c.path.includes('/docs/')).length, 0);
  });
  test(`${mode} current-query continuation remains reachable`, async () => {
    const h = harness(); h.search(query, {searchType: mode}); await settle();
    assert.equal(h.state().lastSearchResults.length, 96); assert.ok(h.state().activeContinuation);
    await h.more().fire('click'); await settle(); assert.equal(h.state().lastSearchResults.length, 144);
  });
}
test('same-tick superseded dispatch never starts obsolete network work', async () => {
  const h = harness(); h.search('alpha'); h.clear(); await settle(); welcome(h);
  assert.equal(h.calls.length, 0);
});
test('current unavailable index still uses the existing failure fallback', async () => {
  const h = harness({fail: path => path.endsWith('meta.json')}); h.search('alpha'); await settle();
  assert.equal(h.els.noResults.classList.contains('hidden'), false);
  assert.equal(h.els.noResultsMessage.textContent, 'Search unavailable. Please try again.');
});
test('old index rejection cannot hide current newer query results', async () => {
  const g = gate(path => path.includes('/shards/')); g.error = new Error('old shard failure');
  const h = harness({gates: [g]}); h.search('alpha'); await settle(); h.search('beta'); await settle();
  g.resolve(); await settle(); h.visibleQuery('beta'); assert.equal(h.els.noResults.classList.contains('hidden'), true);
});
test('rapid duplicate Load more clicks do not duplicate a candidate batch', async () => {
  const h = harness(); h.search('alpha'); await settle(); const g = gate(path => path.includes('/docs/')); h.gates.push(g);
  const button = h.more(), pending = button.fire('click'); await settle(); await button.fire('click');
  g.resolve(); await pending; await settle(); assert.equal(h.state().activeContinuation.cursor, 144);
  assert.equal(new Set(h.state().lastSearchResults.map(r => r.link)).size, 144);
});
test('old Jev completion cannot alter a newer query that has its own Jev verdicts', async () => {
  const g = gate('/jev/rank'); const h = harness({nojev: false, gates: [g]});
  h.search('alpha'); await settle(); h.search('beta'); await settle();
  const current = h.state(), html = h.els.resultsList.innerHTML;
  assert.equal(current.jevPCount, 2); g.resolve(); await settle();
  assert.equal(h.state().jevPCount, current.jevPCount); assert.equal(h.els.resultsList.innerHTML, html);
  assert.equal(h.state().activeContinuation, current.activeContinuation); h.visibleQuery('beta');
});
test('later option edits do not change the existing continuation verifier', async () => {
  const advanced = {searchType: 'any', minWords: 1, books: ['fixture']}; const h = harness();
  h.search('alpha missing', advanced); await settle(); assert.equal(h.state().lastSearchResults.length, 96);
  advanced.minWords = 2; await h.more().fire('click'); await settle();
  assert.equal(h.state().lastSearchResults.length, 144);
});
