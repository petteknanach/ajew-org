// Portable actual-helper/actual-shared-callback unit suite. Geometry and event
// scheduling are deterministic fixtures, NOT native pixels/full Reader init.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
// Optional exact historical helper for paired RED; ordinary invocation stays repo-relative.
const helper = fs.readFileSync(process.env.SH_ARRIVAL_HELPER_PATH || new URL('../public/reader-sefer-hamidos-arrival.js', import.meta.url), 'utf8');
const shared = fs.readFileSync(new URL('../public/reader-script.js', import.meta.url), 'utf8');
const signature = '  function scrollToReaderArrival(target, prepareOnly = false) {';
const begin = shared.indexOf(signature), end = shared.indexOf('\n  }', begin) + 4;
assert.ok(begin >= 0 && end > begin);
const arrivalBody = shared.slice(begin, end);
const sha = value => createHash('sha256').update(value).digest('hex');
const observations = [];

function fixture(options = {}) {
  let now = 0, sequence = 0;
  const tasks = new Map(), scrolls = [], nodes = [], listeners = [];
  const handlers = new Map();
  function eventTarget(target) {
    target.addEventListener = (type, fn, opts = false) => {
      const capture = typeof opts === 'boolean' ? opts : !!opts.capture;
      const row = { target, type, fn, capture, once: !!opts.once };
      listeners.push(row);
      if (!handlers.has(target)) handlers.set(target, new Map());
      const h = handlers.get(target); if (!h.has(type)) h.set(type, []); h.get(type).push(row);
    };
    target.removeEventListener = (type, fn, opts = false) => {
      const capture = typeof opts === 'boolean' ? opts : !!opts.capture;
      for (const row of [...listeners]) if (row.target === target && row.type === type && row.fn === fn && row.capture === capture) {
        listeners.splice(listeners.indexOf(row), 1);
        const rows = handlers.get(target)?.get(type); if (rows) rows.splice(rows.indexOf(row), 1);
      }
    };
    return target;
  }
  function dispatch(target, type, extra = {}) {
    for (const row of [...(handlers.get(target)?.get(type) || [])]) {
      if (!listeners.includes(row)) continue;
      if (row.once) target.removeEventListener(type, row.fn, row.capture);
      row.fn({ type, target, isTrusted: false, ...extra });
    }
  }
  const clock = {
    setTimeout(fn, delay = 0) { const id = ++sequence; tasks.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { tasks.delete(id); }
  };
  const window = eventTarget({ location: { pathname: options.path || '/reader/sefer-hamidos/1/1/', hash: options.hash ?? '#seg-10', search: options.search || '' },
    scrollY: options.scrollY ?? 28325.599609375, scrollX: 0, innerWidth: options.width || 390, innerHeight: 844 });
  const rect = (top, height = 24.8, left = 52, width = 314.4) => ({ top, bottom: top + height, left, right: left + width, width, height });
  function matches(n, selector) {
    const id = selector.match(/^\[id="([^"]+)"\]$/);
    if (id) return n.id === id[1];
    return selector.startsWith('.') ? n.classList.contains(selector.slice(1)) : n.tagName === selector.toUpperCase();
  }
  const all = n => [n, ...n.children.flatMap(all)];
  function element(tag, classes = '', parent = null) {
    const set = new Set(classes.split(' ').filter(Boolean));
    const node = eventTarget({ tagName: tag.toUpperCase(), id: '', parentElement: parent, children: [], childNodes: [], hidden: false,
      dataset: {}, style: {}, css: { display: 'block', visibility: 'visible', opacity: '1', position: 'static', top: 'auto' },
      get isConnected() { return !this.detached && (!this.parentElement || this.parentElement.isConnected); },
      classList: { contains: s => set.has(s), add: (...s) => s.forEach(x => set.add(x)), remove: (...s) => s.forEach(x => set.delete(x)), toggle: (s, on) => { if (on) set.add(s); else set.delete(s); } },
      querySelectorAll(selector) { return all(this).slice(1).filter(n => matches(n, selector)); },
      querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
      closest(selector) { for (let n = this; n; n = n.parentElement) if (matches(n, selector)) return n; return null; },
      getBoundingClientRect() { return rect(this.docTop - window.scrollY, this.height); }
    });
    nodes.push(node); if (parent) { parent.children.push(node); parent.childNodes.push(node); } return node;
  }
  const document = eventTarget({ readyState: options.readyState || 'complete',
    querySelectorAll: selector => nodes.filter(n => n.isConnected && matches(n, selector)),
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    getElementById(id) { return nodes.find(n => n.id === id && n.isConnected) || null; },
    createTreeWalker(p) { const textNodes = []; function walk(n) { if (n.nodeType === 3) textNodes.push(n); else n.childNodes.forEach(walk); } walk(p); let i = 0; return { nextNode: () => textNodes[i++] || null }; },
    createRange() { let node, endNode; return { setStart(n) { node = n; }, setEnd(n) { endNode = n; }, getClientRects() {
      if (options.rangeError) throw Error('geometry fixture');
      if (options.noRects) return [];
      const p = node.parentElement; const top = p.docTop - window.scrollY;
      const left = (p.left ?? 52) - window.scrollX;
      return [rect(top, p.lineHeight || 24.8, left, p.lineWidth || 314.4), ...(options.bidiFragments && endNode === p ? [rect(top, 24.8, 300 - window.scrollX, 100)] : []), ...(p.laterRects ? [rect(top + 1000, 24.8, left, 314.4)] : [])];
    } }; }
  });
  let resolveFonts;
  document.fonts = { ready: options.pendingFonts ? new Promise(resolve => { resolveFonts = resolve; }) : Promise.resolve() };
  window.getComputedStyle = el => ({ ...el.css, ...el.style });
  window.scrollTo = (value, pos) => {
    const v = typeof value === 'number' ? { left: value, top: pos } : value;
    window.scrollY = v.top; window.scrollX = v.left ?? window.scrollX; scrolls.push({ at: now, ...v });
  };
  const container = element('div', 'reader-container'); container.dataset.torahId = options.identity || 'sh-1';
  const content = element('div', 'reader-content mode-' + (options.mode || 'both'), container);
  const original = element('div', 'reader-content-original', content); original.css.display = options.originalHidden ? 'none' : 'contents';
  const aligned = element('div', 'reader-content-aligned', content); aligned.css.display = 'none';
  const toolbar = element('div', 'reader-toolbar', container); toolbar.css = { ...toolbar.css, position: 'sticky', top: '56px' };
  toolbar.getBoundingClientRect = () => rect(56, options.toolbarHeight || 56.8, 0, window.innerWidth);
  const mobileHeader = element('header', 'mobile-header'); mobileHeader.css.position = 'fixed'; mobileHeader.getBoundingClientRect = () => rect(0, 56, 0, window.innerWidth);
  const tabbar = element('nav', 'mobile-tabbar'); tabbar.css.position = 'fixed'; tabbar.getBoundingClientRect = () => rect(780, 64, 0, window.innerWidth);
  function pair(id, docTop, parent = original) {
    const n = element('div', 'reader-segment-pair', parent); n.id = id; n.docTop = docTop; n.height = options.pairHeight || 1703;
    n.scrollIntoView = settings => {
      const top = settings.block === 'center' ? n.docTop + n.height / 2 - window.innerHeight / 2 : n.docTop;
      window.scrollTo({ top, left: 0, ...settings });
    };
    function field(lang, text, offset) {
      const f = element('div', 'reader-segment segment-' + lang, n);
      const p = element('p', '', f); p.docTop = docTop + offset; p.left = options.left; p.lineWidth = options.lineWidth; p.laterRects = options.longLine;
      const t = { nodeType: 3, textContent: text, parentElement: p }; p.childNodes.push(t); return { f, p, t };
    }
    n.he = field('he', options.heText ?? 'א.\nמקור עברי שמור', 163.3);
    n.en = field('en', options.enText ?? 'Exact conserved English field', 1100);
    return n;
  }
  const target = pair('seg-10', 27929.737109375);
  if (options.displayContents) { target.css.display = 'contents'; target.getBoundingClientRect = () => rect(0, 0, 0, 0); target.scrollIntoView = () => {}; }
  // Calibrated opening: 28093.037109375 - modeled settled scroll 28325.599609375 = -232.5625.
  const second = pair('seg-2', 32018.337890625);
  if (options.emptyEnglish) target.en.f.classList.add('empty-translation');
  if (options.noOwner) target.id = 'seg-999';
  if (options.alignedOnly) { target.parentElement = aligned; original.children.splice(original.children.indexOf(target), 1); aligned.children.push(target); }
  if (options.duplicate) { const duplicate = element('div', 'reader-segment-pair', original); duplicate.id = 'seg-10'; }
  function applyMode(mode) { for (const n of [target, second]) { n.he.f.css.display = mode === 'english' ? 'none' : 'block'; n.en.f.css.display = mode === 'hebrew' ? 'none' : 'block'; } }
  applyMode(options.mode || 'both');
  const prefs = new Map([['ajew-reader-prefs', JSON.stringify({ mode: options.mode || 'both', align: true, nikud: true, fontSize: 22 })]]);
  const context = vm.createContext({ window, document, NodeFilter: { SHOW_TEXT: 4 }, URLSearchParams, Promise, console,
    Date: { now: () => now }, ...clock, requestAnimationFrame: fn => clock.setTimeout(fn, 16),
    localStorage: { getItem: k => prefs.get(k), setItem: () => { throw Error('helper must not write preferences'); } } });
  function load() { vm.runInContext(helper, context); }
  if (!options.disableHelper && !process.env.SH_ARRIVAL_DISABLE_HELPER) load();
  vm.runInContext(arrivalBody, context);
  context.target = target;
  const microtasks = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  async function advance(ms) {
    const to = now + ms; await microtasks(); let steps = 0;
    while (tasks.size) {
      const entry = [...tasks].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (entry[1].at > to) break;
      assert.ok(++steps < 1000, 'bounded fixture scheduler'); now = entry[1].at; tasks.delete(entry[0]); entry[1].fn(); await microtasks();
    }
    now = to; await microtasks();
  }
  return { context, window, document, target, second, container, original, aligned, toolbar, prefs, scrolls, tasks, listeners, load, advance, applyMode,
    event: (type, extra = {}) => dispatch(window, type, extra), domEvent: (type, extra = {}) => dispatch(document, type, extra),
    resolveFonts: () => resolveFonts?.(), line: (n = target, lang = 'he') => n[lang].p.docTop - window.scrollY,
    shared: prepare => vm.runInContext(`scrollToReaderArrival(target, ${!!prepare})`, context) };
}

function arrived(s, n = s.target, lang = 'he') { assert.ok(s.line(n, lang) >= 120.8 - 0.01 && s.line(n, lang) + 24.8 <= 772, `first source line ${s.line(n, lang)} must be in actual chrome-free reading band`); }
test('modeled long-pair regression: actual shared callback plus helper restores source opening', async () => {
  const s = fixture(); assert.equal(s.line(), -232.5625);
  s.shared(true); await s.advance(300); s.shared(false); await s.advance(1200);
  arrived(s); observations.push({ case: 'modeled-long-pair', modeledBeforeY: -232.5625, afterY: s.line(), sharedCallbackSHA256: sha(arrivalBody), geometry: 'fixture, not native' });
});
test('actual unchanged shared center callback alone retains offscreen opening (negative baseline)', async () => {
  const s = fixture({ disableHelper: true }); s.shared(true); s.shared(false); await s.advance(1000); assert.ok(s.line() < 0);
});
for (const mode of ['hebrew', 'english', 'both']) test(`initial ${mode} follows visible source and leaves all stored preferences unchanged`, async () => {
  const s = fixture({ mode }); const before = [...s.prefs]; const text = [s.target.he.t.textContent, s.target.en.t.textContent]; await s.advance(1000);
  arrived(s, s.target, mode === 'english' ? 'en' : 'he'); assert.deepEqual([...s.prefs], before); assert.deepEqual([s.target.he.t.textContent, s.target.en.t.textContent], text);
});
test('same-document Original hash change replaces exact target after prior expiry/user input', async () => {
  const s = fixture(); await s.advance(11000); s.event('wheel', { isTrusted: true }); s.window.location.hash = '#seg-2'; s.event('hashchange'); await s.advance(1200);
  arrived(s, s.second); assert.ok(s.line(s.target) < 0); s.event('wheel', { isTrusted: true }); const count = s.scrolls.length; s.window.scrollY += 500; await s.advance(11000); assert.equal(s.scrolls.length, count);
});
test('rapid hash changes invalidate older target and pending font promise', async () => {
  const s = fixture({ pendingFonts: true }); s.window.location.hash = '#seg-2'; s.event('hashchange'); s.resolveFonts(); await s.advance(1100); arrived(s, s.second);
});
test('blank HE opening falls back to first nonempty visible actual EN field', async () => {
  const s = fixture({ heText: ' \n\u00a0' }); await s.advance(1000); arrived(s, s.target, 'en');
});
test('blank/placeholder fields do not pretend to be source', async () => {
  const s = fixture({ heText: ' \n', emptyEnglish: true }); await s.advance(11000); assert.equal(s.scrolls.length, 0);
});
test('long paragraph Range uses first line fragments, not later lines or whole paragraph height', async () => {
  const s = fixture({ longLine: true }); await s.advance(1000); arrived(s); assert.ok(s.target.height > s.window.innerHeight); assert.ok(s.line() + 1000 > s.window.innerHeight);
});
test('short already-visible paragraph is not unnecessarily centered or moved', async () => {
  const s = fixture({ pairHeight: 100, scrollY: 27929.737109375 + 163.3 - 140 }); await s.advance(11000); assert.equal(s.scrolls.length, 0); assert.equal(s.line(), 140);
});
test('complete first line horizontal rect is brought inside viewport without source/style edits', async () => {
  const s = fixture({ left: 140, lineWidth: 300 }); await s.advance(1000); const left = s.target.he.p.left - s.window.scrollX; assert.ok(left >= 8); assert.ok(left + 300 <= s.window.innerWidth - 8); arrived(s); assert.deepEqual(s.target.he.p.style, {});
});
test('late mobile toolbar/font reflow within finite budget is corrected', async () => {
  const s = fixture({ pendingFonts: true }); await s.advance(600); s.toolbar.getBoundingClientRect = () => ({ top: 56, bottom: 200, height: 144, left: 0, right: 390, width: 390 }); s.target.he.p.docTop += 40;
  s.resolveFonts(); s.shared(false); await s.advance(1400); assert.ok(s.line() >= 208); assert.ok(s.line() + 24.8 < 780);
});
test('load and two actual shared frame callbacks do not win over owned bounded settling', async () => {
  const s = fixture({ readyState: 'interactive', pendingFonts: true }); s.shared(true); await s.advance(300); s.shared(false); s.document.readyState = 'complete'; s.event('load'); s.resolveFonts(); await s.advance(1800); arrived(s);
});
for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'input', 'click']) test(`trusted ${event} aborts timer/font continuation; later reading is never snapped back`, async () => {
  const s = fixture({ pendingFonts: true }); await s.advance(40); s.event(event, { isTrusted: true }); s.resolveFonts(); const y = s.window.scrollY; await s.advance(12000); assert.equal(s.scrolls.length, 0); assert.equal(s.window.scrollY, y); assert.equal(s.tasks.size, 0);
});
test('synthetic input does not impersonate user abort', async () => { const s = fixture(); s.event('wheel'); await s.advance(1100); arrived(s); });
for (const hash of ['#seg-010', '#seg-0', '#seg--10', '#seg-10x', '#seg-%31%30', '#seg-9007199254740992', '#aligned-152', '#seg-999999', '']) test(`invalid/unknown fragment ${JSON.stringify(hash)} fails closed`, async () => {
  const s = fixture({ hash }); await s.advance(11000); assert.equal(s.scrolls.length, 0); assert.equal(s.tasks.size, 0);
});
for (const path of ['/reader/another-book/1/1', '/reader/sefer-hamidos/2/4', '/reader/sefer-hamidos/1/04', '/reader/sefer-hamidos/1/1/extra']) test(`foreign/malformed route ${path} is untouched`, async () => {
  const s = fixture({ path }); await s.advance(11000); assert.equal(s.scrolls.length, 0); assert.equal(s.listeners.length, 0);
});
for (const options of [{ identity: 'another-book-1-4' }, { alignedOnly: true }, { duplicate: true }, { noOwner: true }, { originalHidden: true }]) test(`unqualified/hidden Original owner ${JSON.stringify(options)} stays untouched; no aligned guess`, async () => {
  const s = fixture(options); await s.advance(11000); assert.equal(s.scrolls.length, 0); assert.equal(s.aligned.style.display, undefined); assert.equal(s.original.style.display, undefined);
});
test('expiry bounds attempts and leaves no transient hooks, even with unresolved fonts and perpetual reflow', async () => {
  const s = fixture({ pendingFonts: true }); for (let i = 0; i < 60; i++) { s.target.he.p.docTop += 1000; await s.advance(200); }
  const count = s.scrolls.length; assert.ok(count <= 48); assert.equal(s.tasks.size, 0); assert.equal(s.listeners.some(r => ['wheel', 'load', 'scroll'].includes(r.type)), false);
  s.resolveFonts(); await s.advance(12000); assert.equal(s.scrolls.length, count); assert.equal(s.tasks.size, 0);
});
for (const lifecycle of ['pagehide', 'astro:before-swap']) test(`${lifecycle} cancels and removes all owned listeners and pending work`, async () => {
  const s = fixture({ pendingFonts: true }); if (lifecycle === 'pagehide') s.event(lifecycle); else s.domEvent(lifecycle); s.resolveFonts(); await s.advance(12000); assert.equal(s.listeners.length, 0); assert.equal(s.tasks.size, 0); assert.equal(s.scrolls.length, 0);
});
test('DOMContentLoaded initialization is deferred until actual markup/state readiness', async () => {
  const s = fixture({ readyState: 'loading' }); await s.advance(500); assert.equal(s.scrolls.length, 0); s.document.readyState = 'complete'; s.domEvent('DOMContentLoaded'); await s.advance(1300); arrived(s);
});
test('repeated helper initialization has one lifecycle binding and one arrival session', async () => {
  const s = fixture(); const before = s.listeners.length; s.load(); assert.equal(s.listeners.length, before); await s.advance(1200); arrived(s); assert.equal(s.listeners.filter(r => r.type === 'hashchange').length, 1);
});
test('detached owner or foreign route during settling stops immediately', async () => {
  for (const kind of ['detached', 'foreign']) { const s = fixture({ pendingFonts: true }); if (kind === 'detached') s.target.detached = true; else s.window.location.pathname = '/reader/another-book/1/1'; s.resolveFonts(); await s.advance(11000); assert.equal(s.scrolls.length, 0); assert.equal(s.tasks.size, 0); }
});
for (const options of [{ rangeError: true }, { noRects: true }]) test(`missing/throwing geometry ${JSON.stringify(options)} fails closed`, async () => {
  const s = fixture(options); await s.advance(12000); assert.equal(s.scrolls.length, 0); assert.equal(s.tasks.size, 0);
});
test('own versioned helper include is singular and shared includes unchanged', () => {
  const page = fs.readFileSync(process.env.SH_ARRIVAL_PAGE_PATH || new URL('../src/pages/reader/sefer-hamidos/[part]/[torah].astro', import.meta.url), 'utf8');
  assert.equal((page.match(/src="\/reader-sefer-hamidos-arrival\.js\?v=20261014-1" is:inline defer/g) || []).length, 1);
  assert.ok(page.includes('/reader-script.js?v=parsha-author-20261016-r2'));
});
test('pre-DOM trusted input prevents delayed startup from taking over reading', async () => {
  const s = fixture({ readyState: 'loading' }); s.event('pointerdown', { isTrusted: true }); s.document.readyState = 'interactive'; s.domEvent('DOMContentLoaded'); await s.advance(12000);
  assert.equal(s.scrolls.length, 0); assert.equal(s.tasks.size, 0); assert.equal(s.listeners.some(r => r.type === 'pointerdown'), false);
});
test('markup/bidi first-line fragments beyond the initial text node are all included', async () => {
  const s = fixture({ lineWidth: 100, bidiFragments: true }); await s.advance(1200); arrived(s); assert.equal(s.window.scrollX, 18); assert.ok(400 - s.window.scrollX <= s.window.innerWidth - 8);
});
test('real complete Truth10 body remains exact through source-line correction', async () => {
  const raw = fs.readFileSync(new URL('../public/reader/sefer-hamidos/topic-1.json', import.meta.url));
  const section = JSON.parse(raw); const row = section.segments.find(s => s.index === 10); assert.ok(row);
  const s = fixture({ heText: row.he, enText: row.en, longLine: true }); await s.advance(1200); arrived(s); assert.equal(s.target.he.t.textContent, row.he); assert.equal(s.target.en.t.textContent, row.en);
  assert.equal(sha(fs.readFileSync(new URL('../public/reader/sefer-hamidos/topic-1.json', import.meta.url))), sha(raw));
});
for (const mode of ['hebrew', 'english', 'both']) test(`actual v2 loadPrefs/applyMode ${mode} remains authoritative before helper arrival`, async () => {
  const raw = fs.readFileSync(new URL('../public/reader-v2.js', import.meta.url), 'utf8');
  const s = fixture({ mode, readyState: 'loading' });
  let bodies = '';
  for (const name of ['loadPrefs', 'applyMode']) { const start = raw.indexOf('  function ' + name + '('); const stop = raw.indexOf('\n  }', start) + 4; assert.ok(start >= 0); bodies += raw.slice(start, stop) + '\n'; }
  vm.runInContext("let state = {mode:'both'}; const PREFS_KEY = 'ajew-reader-prefs';" + bodies + 'loadPrefs(); applyMode();', s.context);
  const appliedMode = vm.runInContext('state.mode', s.context); assert.equal(appliedMode, mode); s.applyMode(appliedMode);
  s.document.readyState = 'complete'; s.domEvent('DOMContentLoaded'); await s.advance(1200); arrived(s, s.target, mode === 'english' ? 'en' : 'he');
  assert.equal(JSON.parse(s.prefs.get('ajew-reader-prefs')).align, true);
});
test('arrival does not invoke or replace Selection, clipboard, storage or prototype capabilities', async () => {
  const s = fixture(); const sentinel = () => { throw Error('forbidden selection/clipboard'); };
  s.window.getSelection = sentinel; s.context.navigator = { clipboard: { writeText: sentinel } }; const storage = s.context.localStorage;
  await s.advance(1200); arrived(s); assert.equal(s.window.getSelection, sentinel); assert.equal(s.context.navigator.clipboard.writeText, sentinel); assert.equal(s.context.localStorage, storage);
  assert.equal(/MutationObserver|ResizeObserver|\.prototype|addEventListener\(['"]scroll|clipboard|getSelection|localStorage/.test(helper), false);
});
// B1 lifecycle controls execute the selected actual helper, not a replacement model.
// Events/geometry are inert fixtures; these do NOT activate native BFCache.
function hashArrival(s, hash = '#seg-2', n = s.second) {
  s.event('click', { isTrusted: true });
  s.window.location.hash = hash;
  s.window.scrollY = n.docTop; // model UA pair-top alignment, not shared startup
  s.event('hashchange');
}
function tallOpening(s, n = s.second) {
  assert.ok(s.line(n) >= 208 && s.line(n) + 24.8 <= 772,
    `new Original opening ${s.line(n)} must clear measured sticky bottom 200`);
}
function bindingCount(s, type) { return s.listeners.filter(r => r.type === type).length; }
function noTransient(s) {
  assert.equal(s.tasks.size, 0);
  for (const type of ['wheel', 'touchstart', 'pointerdown', 'keydown', 'input', 'click', 'load', 'DOMContentLoaded']) {
    assert.equal(bindingCount(s, type), 0, `no old ${type} hook`);
  }
}
test('B1 fresh explicit Original hash clears tall chrome (positive control)', async () => {
  const s = fixture({ toolbarHeight: 144, pendingFonts: true });
  hashArrival(s); s.resolveFonts(); await s.advance(1200); tallOpening(s);
});
for (const readyState of ['complete', 'interactive', 'loading']) test(`B1 persisted ${readyState} departure cancels transient work and restoration preserves reading`, async () => {
  const s = fixture({ readyState, pendingFonts: true });
  s.event('pagehide', { persisted: true }); noTransient(s);
  const y = s.window.scrollY + 500; s.window.scrollY = y;
  s.document.readyState = 'complete';
  s.event('load'); s.domEvent('DOMContentLoaded');
  s.event('pageshow', { persisted: true }); s.resolveFonts(); await s.advance(12000);
  assert.equal(s.window.scrollY, y); assert.equal(s.scrolls.length, 0); noTransient(s);
});
test('B1 restored document corrects a future explicit Original hash', async () => {
  const s = fixture({ toolbarHeight: 144, pendingFonts: true });
  s.event('pagehide', { persisted: true }); s.event('pageshow', { persisted: true });
  hashArrival(s); s.resolveFonts(); await s.advance(1200); tallOpening(s);
});
test('B1 repeated persisted cycles retain exactly one future hash service and idempotence', async () => {
  const s = fixture({ toolbarHeight: 144, pendingFonts: true });
  for (let i = 0; i < 4; i++) {
    s.event('pagehide', { persisted: true }); noTransient(s);
    assert.equal(s.window.__ajewSeferHamidosArrival, true);
    s.load(); // duplicate execution while suspended must not restart or double-bind
    assert.equal(bindingCount(s, 'hashchange'), 1);
    assert.equal(bindingCount(s, 'pagehide'), 1);
    assert.equal(bindingCount(s, 'pageshow'), 1);
    assert.equal(bindingCount(s, 'astro:before-swap'), 1);
    const y = s.window.scrollY + 500; s.window.scrollY = y;
    const before = s.scrolls.length;
    s.event('pageshow', { persisted: true }); s.load(); s.resolveFonts(); await s.advance(500);
    assert.equal(s.window.scrollY, y); assert.equal(s.scrolls.length, before); noTransient(s);
    const n = i % 2 ? s.target : s.second;
    hashArrival(s, '#' + n.id, n); await s.advance(1200); tallOpening(s, n);
    assert.equal(bindingCount(s, 'hashchange'), 1);
  }
});
for (const prior of ['trusted cancellation', 'expiry']) test(`B1 valid hash after ${prior} and persisted return starts a fresh bounded session`, async () => {
  const s = fixture({ toolbarHeight: 144, pendingFonts: true });
  if (prior === 'trusted cancellation') s.event('wheel', { isTrusted: true });
  else await s.advance(11000);
  noTransient(s);
  s.event('pagehide', { persisted: true }); s.event('pageshow', { persisted: true });
  const priorScrolls = s.scrolls.length;
  hashArrival(s); s.resolveFonts(); await s.advance(1200); tallOpening(s);
  for (let i = 0; i < 60; i++) { s.second.he.p.docTop += 1000; await s.advance(200); }
  assert.ok(s.scrolls.length - priorScrolls <= 48); noTransient(s);
  const count = s.scrolls.length; s.window.scrollY += 500; await s.advance(12000);
  assert.equal(s.scrolls.length, count);
});
test('B1 old pending font continuation cannot reschedule a fresh restored session', async () => {
  const s = fixture({ toolbarHeight: 144, pendingFonts: true });
  s.event('pagehide', { persisted: true }); s.event('pageshow', { persisted: true });
  // A new fonts readiness source belongs to the new session; resolve only old later.
  s.document.fonts = { ready: Promise.resolve() };
  hashArrival(s); await s.advance(1200); tallOpening(s);
  const tasks = [...s.tasks].map(([id, task]) => [id, task.at]);
  const count = s.scrolls.length;
  s.resolveFonts(); await s.advance(0);
  assert.deepEqual([...s.tasks].map(([id, task]) => [id, task.at]), tasks);
  assert.equal(s.scrolls.length, count);
});
test('B1 hash while suspended and duplicate pageshow do not restart old anchor work', async () => {
  const s = fixture({ toolbarHeight: 144, pendingFonts: true });
  s.event('pagehide', { persisted: true });
  s.window.location.hash = '#seg-2'; s.event('hashchange'); s.resolveFonts(); await s.advance(1200);
  noTransient(s); assert.equal(s.scrolls.length, 0);
  const y = s.window.scrollY + 500; s.window.scrollY = y;
  s.event('pageshow', { persisted: true }); s.event('pageshow', { persisted: true }); await s.advance(1200);
  assert.equal(s.window.scrollY, y); noTransient(s); assert.equal(s.scrolls.length, 0);
  // Same valid current fragment explicitly dispatched later is still a new request.
  hashArrival(s); await s.advance(1200); tallOpening(s);
});
test('B1 canceled pre-DOM startup can handle later explicit hash after restoration', async () => {
  const s = fixture({ readyState: 'loading', toolbarHeight: 144, pendingFonts: true });
  s.event('pointerdown', { isTrusted: true });
  s.event('pagehide', { persisted: true }); s.document.readyState = 'complete';
  s.event('pageshow', { persisted: true }); s.domEvent('DOMContentLoaded');
  await s.advance(1200); noTransient(s); assert.equal(s.scrolls.length, 0);
  hashArrival(s); s.resolveFonts(); await s.advance(1200); tallOpening(s);
});
for (const final of ['nonpersisted pagehide', 'Astro swap after restoration', 'Astro swap while suspended']) test(`B1 ${final} permanently disposes all bindings/key and stale work`, async () => {
  const s = fixture({ pendingFonts: true });
  s.event('pagehide', { persisted: true });
  if (final !== 'Astro swap while suspended') {
    s.event('pageshow', { persisted: true }); hashArrival(s);
  }
  if (final === 'nonpersisted pagehide') s.event('pagehide', { persisted: false });
  else s.domEvent('astro:before-swap');
  assert.equal(s.listeners.length, 0); assert.equal(s.window.__ajewSeferHamidosArrival, undefined); noTransient(s);
  s.resolveFonts(); s.event('pageshow', { persisted: true }); s.event('hashchange');
  s.event('load'); s.domEvent('DOMContentLoaded'); await s.advance(12000);
  assert.equal(s.listeners.length, 0); assert.equal(s.scrolls.length, 0); noTransient(s);
});
test('B1 restored future service still rejects invalid hidden foreign and duplicate ownership', async () => {
  for (const options of [{ hash: '#seg-010' }, { originalHidden: true }, { identity: 'foreign' }, { duplicate: true }]) {
    const s = fixture(options); s.event('pagehide', { persisted: true }); s.event('pageshow', { persisted: true });
    s.event('hashchange'); await s.advance(12000); assert.equal(s.scrolls.length, 0); noTransient(s);
    assert.equal(bindingCount(s, 'hashchange'), 1);
  }
});

for (const mode of ['hebrew', 'english', 'both']) test(`display:contents zero-rect wrapper ${mode} arrives at visible source via complete helper`, async () => {
  const s = fixture({displayContents:true, mode, scrollY:0});
  s.shared(true); await s.advance(300); s.shared(false); await s.advance(1500);
  arrived(s, s.target, mode === 'english' ? 'en' : 'he');
  assert.equal(s.target.css.display, 'contents');
  assert.equal(s.target.getBoundingClientRect().height, 0);
});
test('slow complete-load arrival starts correction budget after readiness, not before late native startup', async () => {
  const s = fixture({readyState:'interactive'}); await s.advance(18000);
  assert.equal(s.scrolls.length,0);
  s.document.readyState='complete'; s.event('load'); s.shared(false);
  await s.advance(1500); arrived(s);
});
test('trusted input while waiting for slow load suppresses every later correction', async () => {
  const s = fixture({readyState:'interactive'}); await s.advance(12000);
  s.event('wheel',{isTrusted:true}); s.document.readyState='complete'; s.event('load');
  await s.advance(12000); assert.equal(s.scrolls.length,0); assert.equal(s.tasks.size,0);
});
test('load wait has a finite independent deadline', async () => {
  const s = fixture({readyState:'interactive'}); await s.advance(31000);
  assert.equal(s.scrolls.length,0); assert.equal(s.tasks.size,0);
  s.document.readyState='complete'; s.event('load'); await s.advance(12000); assert.equal(s.scrolls.length,0);
});
test('both-language grid resolves earliest visible source line, not child order or action bar', async () => {
  const s=fixture({mode:'both'}); s.target.en.p.docTop=s.target.he.p.docTop-42;
  await s.advance(1500); arrived(s,s.target,'en'); arrived(s,s.target,'he');
});
process.on('exit', () => {
  if (process.env.SH_ARRIVAL_EVIDENCE_PATH) fs.writeFileSync(process.env.SH_ARRIVAL_EVIDENCE_PATH, JSON.stringify({
    boundary: 'actual helper and byte-extracted actual shared scroll callback; modeled geometry/timers/events; NOT native/full initialization or publication',
    helperSHA256: sha(helper), sharedSHA256: sha(shared), sharedCallbackSHA256: sha(arrivalBody), observations,
    runtime: { execPath: process.execPath, version: process.version, execArgv: process.execArgv, maxRssKiB: process.resourceUsage().maxRSS }
  }, null, 2) + '\n');
});
