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
const {parseFragment} = require('parse5');
const {transformSync} = require('esbuild');
const sourcePath = process.env.SEARCH_HIGHLIGHT_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
const script = readFileSync(sourcePath, 'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'actual page script required');
const normalizeBlock = script.slice(script.indexOf('      function normalizeForSearch'), script.indexOf('      const EN_STOP_WORDS'));
const fixtureNormalize = vm.runInNewContext(normalizeBlock + ';normalizeForSearch');
const withoutImports = script.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
const end = withoutImports.lastIndexOf('    });');
assert.ok(end > 0);
const observed = withoutImports.slice(0, end) + `
      window.probe = {state: () => ({activeSearchRequest, activeContinuation, lastSearchResults, jevPCount}), render: displayResults};
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
function harness({count = 1, doc, transport = (_id, _attempt, doc) => response(doc)} = {}) {
  const els = Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels','searchForm'].map(id => [id, new Element(['loading','resultsContainer','noResults'].includes(id))]));
  els['search-book-labels'].textContent = '{}';
  const events = new Map(), calls = [], errors = [], timers = new Map(), attempts = new Map();
  let timerId = 0, bodyCalls = 0;
  const ids = Array.from({length: count}, (_, id) => id);
  const meta = {generatedAt: 'fixture-version', items: ids.map(id => ({p: '/reader/fixture/' + id}))};
  const shard = Object.fromEntries(fixtureNormalize(doc.n || '').split(' ').filter(Boolean).map(word => [word, ids]));
  const fetch = async (url, opts = {}) => {
    const path = String(url).split('?')[0]; calls.push({url: String(url), path, opts});
    if (path === '/reader-search/meta.json') return response(meta);
    if (path.startsWith('/reader-search/shards/')) return response(shard);
    if (path.includes('/letters/')) { const buffer = new ArrayBuffer(count * 4); const view = new DataView(buffer); ids.forEach((id, i) => view.setUint32(i * 4, id, true)); return {ok: true, arrayBuffer: async () => buffer}; }
    if (path.startsWith('/reader-search/docs/')) {
      const id = Number(path.match(/(\d+)\.json/)[1]);
      const attempt = (attempts.get(id) || 0) + 1; attempts.set(id, attempt);
      return transport(id, attempt, {...doc, p: count === 1 ? doc.p : '/reader/fixture/' + id});
    }
    throw new Error('unexpected fixture URL (providers forbidden): ' + path);
  };
  const window = {location: {origin: 'https://fixture.invalid', search: '?nojev=1', href: 'https://fixture.invalid/search-enhanced?nojev=1'}, history: {replaceState: (_, __, url) => { window.location.href = String(url); }}};
  const document = {querySelectorAll: () => [], dispatchEvent: event => events.get(event.type)?.(event), addEventListener: (type, fn) => { const old = events.get(type); events.set(type, event => { old?.(event); fn(event); }); }, getElementById: id => els[id] || null, createElement: () => new Element()};
  const ctx = vm.createContext({...core, displayBookLabel, qualifiedSearchAnchor, document, window, fetch, URL, URLSearchParams, AbortController, TextEncoder, DataView, CustomEvent: class {constructor(type, opts) {this.type = type; this.detail = opts.detail;}}, queueMicrotask, localStorage: {getItem: () => null, setItem() {}}, navigator: {}, console: {warn() {}, error: (...args) => errors.push(args)}, setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, {fn, ms}); return id; }, clearTimeout: id => timers.delete(id)});
  vm.runInContext(code, ctx, {filename: String(sourcePath)});
  const component = readFileSync(new URL('../src/components/EnhancedSearch.astro', import.meta.url), 'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  vm.runInContext(transformSync(component, {loader: 'ts', target: 'es2022'}).code, ctx);
  events.get('DOMContentLoaded')();
  for (const [id, timer] of timers) if (timer.ms === 0) { timers.delete(id); timer.fn(); }
  return {
    els, calls, errors, timers, attempts, window,
    nonOK: status => ({ok: false, status, json: async () => { bodyCalls++; throw new Error('nonOK body must not be consumed'); }}),
    bodyCalls: () => bodyCalls,
    search: (query, mode = 'google', order = 'consecutive') => { events.get('advanced-search-options')({detail: {searchType: mode, acronymOrder: order}}); els.searchInput.value = query; assert.ok(els.searchForm.handlers.has('submit')); els.searchForm.fire('submit', {preventDefault() {}}); },
    render: (results, query) => window.probe.render(results, query, results.length),
    clear: () => els.clearResults.fire('click'),
    more: () => els.resultsList.children.at(-1),
    state: () => window.probe.state(),
    cards: () => (els.resultsList.innerHTML.match(/class="result-item"/g) || []).length,
    docCalls: id => calls.filter(c => c.path === '/reader-search/docs/' + id + '.json'),
    tick300: () => { const ready = [...timers].filter(([, t]) => t.ms === 300); for (const [id, t] of ready) { timers.delete(id); t.fn(); } return ready.length; },
  };
}

const REAL = {"t": "Obstacles", "h": "מְנִיעוֹת", "c": "aitzoas-hamivooaroas", "p": "/reader/aitzoas-hamivooaroas/1/10", "en": "One must know that all kinds of obstacles that arise for a person, because of which he cannot fulfill the commandments of the Torah and strengthen himself in the service of Hashem properly—one must know that Hashem sends them so that he will prevail with greater longing and desire to fulfill the commandments and good deeds against which the obstacles arise. For such is the nature of a person: the more the obstacles increase, the more the desires…", "he": "צריך לדעת כי כל מיני מניעות שמתעוררות אצל האדם,"};
const CONTROL = {"rawTitle": "Chayay Moharan — AI-reviewed / editorially qualified Simanim 14–58", "rawSnippet": "…l apparatus] His intention here is Rabbainu's intention. This proximate context is why row95 cannot silently force its initial possessive to refer to God.", "path": "/reader/chayey-moharan/reviewed/14-58"};
const NEGATIVE_QUERY = "of obstacles that arise for a person, because of which he cannot fulfill";
const prepared = doc => ({...doc, n: fixtureNormalize([doc.t, doc.h, doc.en, doc.he].join(' ')), m: []});
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const children = node => node.childNodes || [];
const all = node => [node, ...children(node).flatMap(all)];
const hasClass = (node, name) => (attr(node, 'class') || '').split(' ').includes(name);
const text = node => node.nodeName === '#text' ? node.value : children(node).map(text).join('');
function inspect(h, expectedCount, label) {
  const dom = parseFragment(h.els.resultsList.innerHTML);
  const cards = all(dom).filter(n => hasClass(n, 'result-item'));
  assert.equal(cards.length, expectedCount, 'must actually render cards');
  const raw = h.state().lastSearchResults.slice(0, expectedCount);
  assert.equal(raw.length, expectedCount);
  const receipts = cards.map((card, i) => {
    const nodes = all(card), result = raw[i];
    const anchor = nodes.find(n => n.tagName === 'h4').childNodes.find(n => n.tagName === 'a');
    const he = all(anchor).find(n => hasClass(n, 'result-he-title'));
    const snippet = nodes.find(n => hasClass(n, 'result-snippet'));
    const share = nodes.find(n => hasClass(n, 'share-btn'));
    const title = children(anchor).filter(n => n !== he).map(text).join('');
    const receipt = {title, rawTitle: result.title, he: he && text(he), rawHe: result.hebrewTitle,
      snippet: text(snippet), rawSnippet: result.snippet,
      marks: [anchor, he, snippet].map(n => n ? all(n).filter(x => x.tagName === 'mark').map(text) : [])};
    console.log(JSON.stringify({label, index: i, ...receipt}));
    assert.equal(title, result.title + (result.hebrewTitle ? ' ' : ''), 'main title exact text + explicit renderer separator');
    if (result.hebrewTitle) assert.equal(text(he), result.hebrewTitle);
    assert.equal(text(snippet), result.snippet, 'snippet codepoints conserved');
    assert.equal(attr(share, 'data-share-title'), result.title);
    assert.equal(attr(share, 'data-share-snippet'), result.snippet);
    assert.equal(attr(share, 'data-share-link'), attr(anchor, 'href'));
    for (const field of [anchor, snippet]) {
      for (const node of all(field)) {
        if (node === field || node === he || node.nodeName === '#text') continue;
        assert.equal(node.tagName, 'mark', 'only intended markup');
        assert.equal(node.attrs.length, 0);
        assert.equal(all(node).slice(1).some(n => n.tagName === 'mark'), false, 'flat marks');
        assert.ok(text(node).length);
      }
    }
    return receipt;
  });
  assert.equal(h.errors.length, 0);
  assert.equal(h.calls.some(c => c.path.includes('jev')), false);
  return receipts;
}
async function searched(doc, query, options = {}) {
  const h = harness({doc: prepared(doc), ...options}); h.search(query, options.mode, options.order); await settle(); return h;
}
test('REAL original 13-word negative: full component submit and page listener', async () => {
  const h = await searched(REAL, NEGATIVE_QUERY); const rows = inspect(h, 1, 'REAL-negative');
  assert.ok(rows[0].marks[0].includes(REAL.t));
});
test('REAL God control exact saved snippet', async () => {
  const h = await searched({t: CONTROL.rawTitle, h: REAL.h, en: CONTROL.rawSnippet, p: CONTROL.path, c: 'fixture'}, 'God');
  assert.ok(inspect(h, 1, 'REAL-control')[0].marks[2].includes('God'));
});
test('REAL pointed Hebrew title and actual Hebrew excerpt', async () => {
  const query = REAL.h.replace(/[\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7]/g, '');
  const h = await searched(REAL, query); const row = inspect(h, 1, 'REAL-hebrew')[0];
  assert.deepEqual(row.marks[1], [REAL.h]); assert.ok(row.marks[2].includes(query));
});
test('SYNTHETIC initial / async Load more / cached expansion conserve all fields', async () => {
  const h = await searched({t: 'banana', h: 'banana', en: 'banana ana', p: '/reader/fixture/0'}, 'banana ana ana', {count: 120});
  inspect(h, 50, 'initial'); assert.equal(h.state().activeContinuation.cursor, 96);
  await h.more().fire('click'); await settle(); inspect(h, 100, 'async');
  assert.equal(h.state().activeContinuation, null); const before = h.calls.length;
  await h.more().fire('click'); await settle(); inspect(h, 120, 'cached'); assert.equal(h.calls.length, before);
});
test('SYNTHETIC actual letter Found route case-sensitive', async () => {
  const h = await searched({t: 'Alpha alpha beta', h: 'Alpha alpha beta', en: 'Alpha alpha beta', p: '/reader/fixture/0'}, 'ab', {mode: 'acronym', order: 'any'});
  const row = inspect(h, 1, 'letter-Found')[0]; assert.match(h.state().lastSearchResults[0].extraInfo, /^Found:/);
  assert.ok(row.marks[2].includes('alpha')); assert.equal(row.marks[2].includes('Alpha'), false);
});
// Controlled renderer inputs for branches unreachable from the verifier (e.g.
// empty query/Found). Full component+page initialization still runs; this hook
// invokes the unchanged actual renderer, never a helper replacement.
const cases = [
 ['overlap/repeated/case', 'BANANA banana ana', 'banana ana ana', '', ['BANANA', 'banana', 'ana']],
 ['Found dots/case', 'Alpha alpha beta', 'AB', 'Found: alpha ... beta', ['alpha', 'beta']],
 ['Found consecutive', 'alpha beta', 'AB', 'Found: alpha beta', ['alpha', 'beta']],
 ['empty Found fallback', 'Alpha alpha', 'alpha', 'Found:', ['Alpha', 'alpha']],
 ['metachar standard inherited fallback', 'a.b [x] C++', 'a.b [x] C++', '', ['C++']],
 ['metachar Found inherited skip', 'a.b [x] C++', 'x', 'Found: a.b [x] C++', []],
 ['operator only + literal HTML/entities', '<b>&amp;</b> <script>bad</script> & 😀', 'AND OR NOT', '', []],
 ['no match + literal HTML/entities', '<b>&amp;</b> & 😀', 'absent', '', []],
 ['empty query + literal HTML/entities', '<b>&amp;</b> A\u0301 & 😀', '', '', []],
 ['non-NFC Hebrew point order boundary', 'ב\u05BC\u05B7 A\u0301 😀 &amp; <b>', 'ב', '', ['ב\u05BC\u05B7']],
 ['empty snippet', '', 'alpha', '', []],
];
for (const [label, value, query, extraInfo, marks] of cases) test('SYNTHETIC renderer ' + label, () => {
  const h = harness({doc: prepared(REAL)});
  const result = {title: value || 'alpha', hebrewTitle: value || 'alpha', snippet: value, link: '/reader/fixture/0', extraInfo};
  // Retain raw identity for conservation observation; no producer is modified.
  h.state().lastSearchResults.push(result); h.render([result], query);
  assert.deepEqual(inspect(h, 1, label)[0].marks[2], marks);
});
