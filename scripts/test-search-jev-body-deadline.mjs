import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import http from 'node:http';
import * as core from '../src/lib/search-mode-core.mjs';
import {displayBookLabel} from '../src/lib/search-book-labels.mjs';
import {qualifiedSearchAnchor} from '../src/lib/qualified-search-arrival.mjs';

// Execute the entire actual page script and DOMContentLoaded scheduling.
// Only remove imports (supplied below) and append lexical observation hooks;
// no production function bodies or promise/event scheduling are replaced.
const require = createRequire(import.meta.url);
const {transformSync} = require('esbuild');
const sourcePath = process.env.SEARCH_JEV_DEADLINE_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
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
function harness({count = 240, nojev = true, gates = [], initial = null, fail = null, transport = null, realClock = false} = {}) {
  const els = Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels'].map(id => [id, new Element(['loading','resultsContainer','noResults'].includes(id))]));
  els['search-book-labels'].textContent = '{}';
  const events = new Map(), calls = [], timers = new Map(); let timerId = 0, now = 0;
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
    if (transport && path.startsWith('/jev')) return transport(path, opts);
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
  const ctx = vm.createContext({...core, displayBookLabel, qualifiedSearchAnchor, document: doc, window, fetch, URL, URLSearchParams, AbortController, TextEncoder, DataView, queueMicrotask, localStorage: {getItem: () => null, setItem() {}}, navigator: {}, console: {warn() {}, error() {}}, setTimeout: realClock ? setTimeout : (fn, ms) => { const id = ++timerId; timers.set(id, {fn, due: now + ms}); return id; }, clearTimeout: realClock ? clearTimeout : id => timers.delete(id)});
  vm.runInContext(code, ctx, {filename: String(sourcePath)});
  events.get('DOMContentLoaded')();
  return {
    els, calls, gates, window, probe: window.probe,
    timers,
    tick: async ms => {
      const until = now + ms;
      for (;;) {
        const next = [...timers].filter(([, t]) => t.due <= until).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) break;
        now = next[1].due; timers.delete(next[0]); next[1].fn(); await settle();
      }
      now = until; await settle();
    },
    search: (query, advancedOptions = {}) => events.get('enhanced-search')({detail: {query, filters: {}, advancedOptions}}),
    clear: () => els.clearResults.fire('click'),
    more: () => els.resultsList.children.at(-1),
    ready: detail => events.get('enhanced-search-ready')({detail}),
    state: () => window.probe.state(),
    visibleQuery: q => assert.match(els.resultsCount.textContent, new RegExp('"' + q + '"')),
  };
}

const config = {jevRank: true};
const verdict = {ranked: [{id: 1, p: 1}, {id: 0, p: 0.1}]};
const response = value => ({ok: true, json: async () => value});
const optional = path => response(path === '/jev-config.json' ? config : verdict);
function lexical(h, query = 'alpha') {
  h.visibleQuery(query);
  assert.equal(h.els.resultsContainer.classList.contains('hidden'), false);
  assert.equal(h.state().jevPCount, 0);
  assert.ok(h.els.resultsList.innerHTML.indexOf('Document 0<') < h.els.resultsList.innerHTML.indexOf('Document 1<'));
}
function cleared(h) {
  assert.equal(h.els.welcomeMessage.classList.contains('hidden'), false);
  assert.equal(h.els.resultsContainer.classList.contains('hidden'), true);
  assert.equal(h.state().activeContinuation, null);
  assert.equal(h.state().lastSearchResults.length, 0);
  assert.equal(h.state().jevPCount, 0);
}
for (const boundary of ['config', 'rank']) {
  const path = boundary === 'config' ? '/jev-config.json' : '/jev/rank';
  test(`${boundary}: actual full init headers-resolved/body-pending falls back at 1500ms and aborts`, async () => {
    const body = deferred(); let signal, jsonCalls = 0;
    const h = harness({nojev: false, transport: (p, opts) => {
      if (p !== path) return optional(p);
      signal = opts.signal;
      return {ok: true, json: () => { jsonCalls++; return body.promise; }}; // deliberately ignores abort
    }});
    h.search('alpha'); await h.tick(0); await settle();
    assert.equal(jsonCalls, 1, 'actual JSON await reached after headers resolved');
    assert.equal(signal.aborted, false);
    assert.equal(h.els.resultsCount.textContent, '');
    await h.tick(1499); assert.equal(h.els.resultsCount.textContent, '');
    await h.tick(1);
    console.log(JSON.stringify({boundary, atMs: 1500, aborted: signal.aborted, rendered: h.els.resultsCount.textContent, timers: h.timers.size}));
    assert.equal(signal.aborted, true, 'whole-response deadline must abort transport even after headers');
    lexical(h); assert.equal(h.timers.size, 0, 'deadline cleaned up');
    if (boundary === 'config') assert.equal(h.calls.filter(c => c.path === '/jev/rank').length, 0);
    const html = h.els.resultsList.innerHTML, state = h.state();
    body.resolve(boundary === 'config' ? config : verdict); await settle();
    assert.equal(h.els.resultsList.innerHTML, html, 'late body must not reshuffle lexical fallback');
    assert.equal(h.state().activeContinuation, state.activeContinuation);
    assert.equal(h.state().jevPCount, 0);
    await h.more().fire('click'); await settle();
    assert.equal(h.state().lastSearchResults.length, 144, 'fallback preserves Load more');
    lexical(h);
  });
  test(`${boundary}: stalled transport that ignores abort is also deadline-raced`, async () => {
    const headers = deferred(); let signal;
    const h = harness({nojev: false, transport: (p, opts) => {
      if (p !== path) return optional(p);
      signal = opts.signal; return headers.promise;
    }});
    h.search('alpha'); await h.tick(0); await settle(); await h.tick(1500);
    assert.equal(signal.aborted, true); lexical(h);
    headers.resolve(optional(path)); await settle(); lexical(h);
  });
  for (const cancel of ['Clear', 'new query']) test(`${cancel} during stalled ${boundary} body retains current state after deadline/late body`, async () => {
    const body = deferred(); let signal, used = false;
    const h = harness({nojev: false, transport: (p, opts) => {
      if (p !== path || used) return optional(p);
      used = true; signal = opts.signal; return {ok: true, json: () => body.promise};
    }});
    h.search('alpha'); await h.tick(0); await settle(); assert.ok(signal);
    if (cancel === 'Clear') h.clear(); else { h.search('beta'); await settle(); h.visibleQuery('beta'); assert.equal(h.state().jevPCount, 2); }
    const state = h.state(), html = h.els.resultsList.innerHTML;
    await h.tick(1500); assert.equal(signal.aborted, true);
    body.resolve(boundary === 'config' ? config : verdict); await settle();
    assert.equal(h.state().activeContinuation, state.activeContinuation);
    assert.equal(h.state().lastSearchResults, state.lastSearchResults);
    assert.equal(h.state().jevPCount, state.jevPCount);
    assert.equal(h.els.resultsList.innerHTML, html);
    if (cancel === 'Clear') cleared(h); else h.visibleQuery('beta');
    if (boundary === 'config') assert.equal(h.calls.filter(c => c.path === '/jev/rank').length, cancel === 'Clear' ? 0 : 1, 'no obsolete rank dispatch');
  });
  for (const failure of ['fetch rejection', 'malformed JSON', 'nonOK']) test(`${boundary}: ${failure} preserves optional lexical fallback`, async () => {
    let jsonCalls = 0, signal;
    const h = harness({nojev: false, transport: (p, opts) => {
      if (p !== path) return optional(p);
      signal = opts.signal;
      if (failure === 'fetch rejection') return Promise.reject(new Error('network fixture'));
      return {ok: failure !== 'nonOK', json: async () => { jsonCalls++; throw new SyntaxError('malformed JSON fixture'); }};
    }});
    h.search('alpha'); await h.tick(0); await settle(); lexical(h);
    assert.equal(h.timers.size, 0); await h.tick(1500); assert.equal(signal.aborted, false, 'completed failure must clear deadline');
    assert.equal(jsonCalls, failure === 'malformed JSON' ? 1 : 0, 'nonOK JSON must not be consumed');
    if (boundary === 'config') assert.equal(h.calls.filter(c => c.path === '/jev/rank').length, 0);
  });
}
test('fast successful JSON keeps Jev verdict order and Load more without leaking timers', async () => {
  const signals = [];
  const h = harness({nojev: false, transport: (p, opts) => { signals.push(opts.signal); return optional(p); }});
  h.search('alpha'); await h.tick(0); await settle(); h.visibleQuery('alpha'); assert.equal(h.state().jevPCount, 2);
  const ordered = () => assert.ok(h.els.resultsList.innerHTML.indexOf('Document 1<') < h.els.resultsList.innerHTML.indexOf('Document 0<'));
  ordered(); assert.equal(h.timers.size, 0); await h.tick(3000); assert.ok(signals.every(s => !s.aborted));
  await h.more().fire('click'); await settle(); ordered(); assert.equal(h.state().lastSearchResults.length, 144);
  assert.equal(h.calls.filter(c => c.path === '/jev/rank').length, 1);
});
test('nojev bypass dispatches neither config nor rank and creates no deadline', async () => {
  const h = harness({transport: () => { throw new Error('nojev must bypass'); }});
  h.search('alpha'); await h.tick(0); await settle(); lexical(h); assert.equal(h.timers.size, 0);
  assert.equal(h.calls.filter(c => c.path.startsWith('/jev')).length, 0);
});
for (const boundary of ['config', 'rank']) test(`${boundary}: headers and JSON share one deadline, not separate 1500ms budgets`, async () => {
  const path = boundary === 'config' ? '/jev-config.json' : '/jev/rank';
  const headers = deferred(), body = deferred(); let signal;
  const h = harness({nojev: false, transport: (p, opts) => {
    if (p !== path) return optional(p);
    signal = opts.signal; return headers.promise;
  }});
  h.search('alpha'); await h.tick(0); await settle(); await h.tick(800);
  headers.resolve({ok: true, json: () => body.promise}); await settle();
  await h.tick(699); assert.equal(h.els.resultsCount.textContent, ''); assert.equal(signal.aborted, false);
  await h.tick(1); assert.equal(signal.aborted, true); lexical(h);
  body.resolve(boundary === 'config' ? config : verdict); await settle(); lexical(h);
});
test('fast body at 1499ms succeeds before whole-response deadline', async () => {
  const body = deferred(); let signal;
  const h = harness({nojev: false, transport: (p, opts) => {
    if (p !== '/jev/rank') return optional(p);
    signal = opts.signal; return {ok: true, json: () => body.promise};
  }});
  h.search('alpha'); await h.tick(0); await settle(); await h.tick(1499); body.resolve(verdict); await settle();
  assert.equal(h.state().jevPCount, 2); assert.equal(h.timers.size, 0);
  await h.tick(1); assert.equal(signal.aborted, false);
});
test('both config and rank retain independent 1500ms whole-response budgets', async () => {
  const configBody = deferred(), rankBody = deferred(); const signals = [];
  const h = harness({nojev: false, transport: (p, opts) => {
    signals.push(opts.signal); return {ok: true, json: () => (p === '/jev-config.json' ? configBody : rankBody).promise};
  }});
  h.search('alpha'); await h.tick(0); await settle(); await h.tick(1400); configBody.resolve(config); await settle();
  await h.tick(1499); assert.equal(h.els.resultsCount.textContent, ''); assert.ok(signals.every(s => !s.aborted));
  await h.tick(1); assert.equal(signals[0].aborted, false); assert.equal(signals[1].aborted, true); lexical(h);
  rankBody.resolve(verdict); await settle(); lexical(h);
});
test('real loopback streaming HTTP headers arrive but delayed JSON is aborted by actual full-init deadline', {timeout: 6000}, async () => {
  const observed = {headers: false, bodyStarted: false, bodyError: null, signal: null};
  const closed = deferred(); let delay;
  const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'application/json'}); res.flushHeaders();
    res.write('{"ranked":');
    delay = setTimeout(() => res.end('[{"id":1,"p":1}]}'), 3500);
    res.on('close', () => { clearTimeout(delay); closed.resolve(); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const localURL = `http://127.0.0.1:${server.address().port}/rank`;
  try {
    const h = harness({nojev: false, realClock: true, transport: async (p, opts) => {
      if (p !== '/jev/rank') return optional(p);
      observed.signal = opts.signal;
      const res = await fetch(localURL, opts); observed.headers = true;
      return {ok: res.ok, json: async () => {
        observed.bodyStarted = true;
        try { return await res.json(); } catch (error) { observed.bodyError = error.name; throw error; }
      }};
    }});
    const start = performance.now(); h.search('alpha');
    const until = async condition => {
      while (!condition()) { assert.ok(performance.now() - start < 5000, 'bounded local probe'); await new Promise(resolve => setTimeout(resolve, 10)); }
    };
    await until(() => observed.bodyStarted); assert.equal(observed.headers, true); assert.equal(observed.signal.aborted, false);
    assert.equal(h.els.resultsCount.textContent, '', 'headers alone do not render');
    await until(() => !!h.els.resultsCount.textContent);
    console.log(JSON.stringify({probe: 'real-loopback-header-delayed-body', elapsedMs: Math.round(performance.now() - start), headers: observed.headers, bodyStarted: observed.bodyStarted, bodyError: observed.bodyError, aborted: observed.signal.aborted, rendered: h.els.resultsCount.textContent}));
    lexical(h); assert.equal(observed.signal.aborted, true); await until(() => observed.bodyError !== null);
    assert.equal(observed.bodyError, 'AbortError'); await closed.promise;
    console.log(JSON.stringify({probe: 'real-loopback-header-delayed-body', elapsedMs: Math.round(performance.now() - start), ...observed, signal: {aborted: observed.signal.aborted}}));
  } finally {
    clearTimeout(delay); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
});
