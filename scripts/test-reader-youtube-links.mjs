import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/reader-youtube-links.js', import.meta.url), 'utf8');
// Bind fixture fetch/assets to the actual runtime key. Version advancement is
// checked separately, so identical behavior tests also exercise the old bytes.
const cacheKey = source.match(/fetch\('\/reader\/youtube-links\.json\?v=([0-9]{8}-[0-9]+)'\)/)?.[1];
assert.ok(cacheKey, 'runtime has one explicit versioned manifest fetch');
const native = readFileSync(new URL('../public/reader-script.js', import.meta.url), 'utf8');
const v2 = readFileSync(new URL('../public/reader-v2.js', import.meta.url), 'utf8');
const route = '/reader/sefer-hamidos/1/children';
// Labelled synthetic test fixtures ONLY. These are not production media claims.
function entry(overrides = {}) {
  const e = { book: 'sefer-hamidos', part: 1, torah: 'children', segment: 7,
    language: 'he', kind: 'song', videoId: 'FIXTURE0001',
    title: 'TEST FIXTURE title', channel: 'TEST FIXTURE channel', ...overrides };
  e.sourceUrl ??= `https://ajew.org/reader/${e.book}/${e.part}/${e.torah}${e.segment === null ? '' : '#seg-' + e.segment}`;
  return e;
}

// Minimal DOM with real parent ownership, mutation batching and text-only sinks.
// Full feature initialization runs unchanged; this is logic QA, not pixel QA.
function harness({ entries = [entry()], pathname = route, loading = false, manifest,
  failure, noContent = false, indices = [2, 7, 31] } = {}) {
  const observers = [];
  const events = new Map();
  let fetchCount = 0;
  function changed(target, type, attributeName) {
    for (const observer of observers) {
      if (!observer.targets.some(([root, o]) =>
        (target === root || (o.subtree && root.contains(target))) &&
        (type === 'childList' ? o.childList : o.attributes && (!o.attributeFilter || o.attributeFilter.includes(attributeName))))) continue;
      if (!observer.queued) {
        observer.queued = true;
        queueMicrotask(() => { observer.queued = false; observer.callback([{ target, type, attributeName }]); });
      }
    }
  }
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null;
      this._text = ''; this.attrs = new Map(); this.open = false;
      this.classList = {
        contains: c => this.className.split(/\s+/).includes(c),
        add: (...cs) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...cs])].join(' '); },
        remove: (...cs) => { this.className = this.className.split(/\s+/).filter(c => !cs.includes(c)).join(' '); },
        toggle: (c, force) => { const yes = force ?? !this.classList.contains(c); this.classList[yes ? 'add' : 'remove'](c); return yes; }
      };
      this.style = new Proxy({}, { set: (o, k, val) => {
        if (o[k] !== val) { o[k] = val; changed(this, 'attributes', 'style'); } return true;
      } });
    }
    get className() { return this.attrs.get('class') || ''; }
    set className(v) { this.setAttribute('class', v); }
    get id() { return this.attrs.get('id') || ''; }
    set id(v) { this.setAttribute('id', v); }
    get hidden() { return this.attrs.has('hidden'); }
    set hidden(v) {
      if (v) this.setAttribute('hidden', '');
      else if (this.attrs.delete('hidden')) changed(this, 'attributes', 'hidden');
    }
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
    set textContent(v) {
      for (const child of this.children) child.parentElement = null;
      this.children = []; this._text = String(v); changed(this, 'childList');
    }
    set innerHTML(_) { throw new Error('HTML sink forbidden'); }
    get nextSibling() {
      if (!this.parentElement) return null;
      const s = this.parentElement.children; return s[s.indexOf(this) + 1] || null;
    }
    setAttribute(k, v) {
      v = String(v);
      if (this.attrs.get(k) === v) return;
      this.attrs.set(k, v); changed(this, 'attributes', k);
    }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    contains(el) { return this === el || this.children.some(c => c.contains(el)); }
    append(...els) { for (const el of els) { el.remove(); el.parentElement = this; this.children.push(el); changed(this, 'childList'); } }
    insertBefore(el, before) {
      assert.equal(before.parentElement, this); el.remove();
      this.children.splice(this.children.indexOf(before), 0, el); el.parentElement = this; changed(this, 'childList');
    }
    remove() {
      if (!this.parentElement) return;
      const parent = this.parentElement; parent.children.splice(parent.children.indexOf(this), 1);
      this.parentElement = null; changed(parent, 'childList');
    }
    cloneNode(deep) {
      const clone = new Element(this.tagName);
      clone.attrs = new Map(this.attrs); clone._text = this._text;
      if (deep) for (const child of this.children) clone.append(child.cloneNode(true));
      return clone;
    }
    matches(selector) {
      if (selector.includes(',')) return selector.split(',').some(s => this.matches(s.trim()));
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      if (selector.startsWith('[')) return this.attrs.has(selector.slice(1, -1));
      return this.tagName.toLowerCase() === selector;
    }
    closest(selector) { for (let el = this; el; el = el.parentElement) if (el.matches(selector)) return el; return null; }
    querySelectorAll(selector) {
      const all = [];
      const walk = el => { for (const c of el.children) { if (c.matches(selector)) all.push(c); walk(c); } };
      walk(this); return all;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  const documentElement = new Element('html'), body = new Element('body'); documentElement.append(body);
  const container = new Element('div'); container.className = 'reader-container'; body.append(container);
  const header = new Element('header'); header.className = 'reader-header'; container.append(header);
  const content = new Element('div'); content.className = 'reader-content mode-hebrew';
  const original = new Element('div'); original.className = 'reader-content-original';
  const aligned = new Element('div'); aligned.className = 'reader-content-aligned'; aligned.style.display = 'none';
  const marker = new Element('div'); marker.id = 'aligned-segments-data'; aligned.append(marker);
  const pairs = new Map();
  for (const index of indices) {
    const pair = new Element('div'); pair.className = 'reader-segment-pair'; pair.id = 'seg-' + index;
    const text = new Element('p'); text.textContent = 'CANONICAL TEST FIXTURE ' + index; pair.append(text);
    original.append(pair); pairs.set(index, pair);
    const ap = new Element('div'); ap.className = 'reader-segment-pair'; ap.id = 'aligned-' + index; aligned.append(ap);
  }
  content.append(original, aligned); if (!noContent) container.append(content);
  const audio = new Element('audio'); audio.id = 'existing-audio'; container.append(audio);
  const document = {
    documentElement, body, readyState: loading ? 'loading' : 'complete',
    createElement: t => new Element(t),
    querySelector: s => documentElement.querySelector(s), querySelectorAll: s => documentElement.querySelectorAll(s),
    getElementById: id => documentElement.querySelector('#' + id),
    addEventListener: (name, cb) => { events.set(name, [...(events.get(name) || []), cb]); }
  };
  const window = {
    location: { pathname },
    getComputedStyle: el => ({ display: el.hidden ? 'none' : el.style.display || 'block', visibility: el.style.visibility || 'visible' }),
    addEventListener: (name, cb) => { events.set(name, [...(events.get(name) || []), cb]); }
  };
  const context = vm.createContext({ document, window, URL, queueMicrotask,
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
      observe(root, options) { this.targets.push([root, options]); }
    },
    fetch: async url => {
      assert.equal(url, '/reader/youtube-links.json?v=' + cacheKey); fetchCount++;
      if (failure === 'network') throw new Error('TEST FIXTURE network failure');
      return { ok: failure !== 'http', json: async () => {
        if (failure === 'json') throw new Error('TEST FIXTURE invalid JSON');
        return manifest ?? { version: 1, entries };
      } };
    }
  });
  const run = () => vm.runInContext(source, context, { filename: 'reader-youtube-links.js' });
  async function settle() {
    // Mutation-triggered follow-up refreshes must converge, not loop forever.
    for (let i = 0; i < 12; i++) await new Promise(resolve => setImmediate(resolve));
    assert.ok(observers.every(o => !o.queued), 'observer loop settled');
  }
  const fire = name => { for (const cb of events.get(name) || []) cb(); };
  function nativeMode(mode) {
    const start = native.indexOf('  function applyMode() {');
    const end = native.indexOf('\n  // --- Font Controls ---', start);
    assert.ok(start >= 0 && end > start);
    context.state = { mode };
    vm.runInContext(native.slice(start, end) + '\napplyMode();', context);
  }
  function nativeAlign() {
    const start = v2.indexOf('  let alignedView = false;');
    const end = v2.indexOf('\n  // ─── Immerse Mode', start);
    assert.ok(start >= 0 && end > start);
    vm.runInContext('(() => {' + v2.slice(start, end) + '\ntoggleAligned(); })();', context);
  }
  const details = () => body.querySelectorAll('.reader-youtube-links');
  const rows = () => body.querySelectorAll('.reader-youtube-row');
  const watches = () => body.querySelectorAll('a').filter(a => a.href.startsWith('https://www.youtube.com/watch?v='));
  run();
  return { document, window, body, container, content, original, aligned, pairs, context, audio,
    observers, run, settle, fire, nativeMode, nativeAlign, details, rows, watches, Element,
    fetchCount: () => fetchCount };
}

const mixed = () => [entry(), entry({ language: 'en', videoId: 'FIXTURE0002' }),
  entry({ segment: null, kind: 'story', language: 'he', videoId: 'FIXTURE0003' }),
  entry({ segment: null, kind: 'story', language: 'en', videoId: 'FIXTURE0004' })];

test('full init: exact original segment, whole-section films before content, closed safe details', async () => {
  const h = harness({ entries: mixed() }); await h.settle();
  assert.equal(h.details().length, 2); assert.equal(h.watches().length, 4);
  assert.equal(h.pairs.get(7).querySelector('.reader-youtube-links'), h.details().find(d => d.parentElement === h.pairs.get(7)));
  assert.equal(h.pairs.get(2).querySelector('.reader-youtube-links'), null);
  const page = h.body.querySelector('.reader-youtube-page'); assert.equal(page.nextSibling, h.content);
  assert.equal(page.parentElement, h.container);
  assert.equal(page.querySelectorAll('.reader-youtube-links').length, 1);
  for (const d of h.details()) { assert.equal(d.open, false); assert.equal(d.children[0].tagName, 'SUMMARY'); }
  for (const a of h.body.querySelectorAll('a')) { assert.equal(a.target, '_blank'); assert.equal(a.rel, 'noopener noreferrer'); }
  assert.equal(h.body.querySelectorAll('iframe').length, 0);
  assert.equal(h.body.querySelectorAll('video').length, 0);
  assert.equal(h.body.querySelectorAll('audio')[0], h.audio);
  assert.ok(h.pairs.get(7).textContent.startsWith('CANONICAL TEST FIXTURE 7'));
});

test('native reader applyMode: HE-only, EN-only, both, and reversible source-qualified aligned fallback', async () => {
  const h = harness({ entries: mixed() }); await h.settle();
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['he', 'he']);
  h.nativeMode('english'); await h.settle();
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['en', 'en']);
  const originalDetails = h.pairs.get(7).querySelector('.reader-youtube-links'); originalDetails.open = true;
  h.nativeMode('both'); await h.settle();
  assert.equal(h.rows().filter(r => !r.hidden).length, 4);
  assert.equal(originalDetails.parentElement.className, 'reader-youtube-page');
  assert.equal(originalDetails.open, true);
  assert.match(originalDetails.textContent, /Original source paragraph 7/);
  assert.match(originalDetails.textContent, /No aligned-paragraph mapping/);
  assert.equal(originalDetails.querySelectorAll('a')[1].href, entry().sourceUrl);
  assert.equal(h.aligned.querySelectorAll('.reader-youtube-links').length, 0);
  h.nativeMode('hebrew'); await h.settle();
  assert.equal(originalDetails.parentElement, h.pairs.get(7));
  assert.equal(originalDetails.querySelector('.reader-youtube-qualification').hidden, true);
  assert.equal(h.details().length, 2);
});

test('native v2 aligned toggle, including non-ordinal source 31, never attaches to aligned IDs', async () => {
  const h = harness({ entries: [entry({ segment: 31 })] }); await h.settle();
  h.nativeAlign(); await h.settle();
  const d = h.details()[0]; assert.equal(d.parentElement.className, 'reader-youtube-page');
  assert.match(d.textContent, /source paragraph 31/); assert.equal(h.aligned.querySelectorAll('.reader-youtube-links').length, 0);
  h.original.style.display = ''; h.aligned.style.display = 'none'; await h.settle();
  assert.equal(d.parentElement, h.pairs.get(31));
  assert.equal(h.body.querySelector('.reader-youtube-page'), null);
});

test('v2 container-only mode fallback and unknown mode fail closed', async () => {
  const h = harness({ entries: mixed() }); await h.settle();
  h.content.className = 'reader-content'; h.container.classList.add('mode-english'); await h.settle();
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['en', 'en']);
  h.container.classList.remove('mode-english'); await h.settle();
  assert.ok(h.details().every(d => d.hidden));
});

test('language mismatch hides entire details, not just its rows', async () => {
  const h = harness({ entries: [entry({ language: 'en' })] }); await h.settle();
  assert.equal(h.details()[0].hidden, true);
  h.nativeMode('english'); await h.settle(); assert.equal(h.details()[0].hidden, false);
});

test('native reader-hide-media, reader-teachings-only and media-hidden suppress all links and restore', async () => {
  const h = harness({ entries: mixed() }); await h.settle(); h.nativeMode('both'); await h.settle();
  for (const root of [h.body, h.container, h.content, h.document.documentElement]) {
    for (const flag of ['reader-hide-media', 'reader-teachings-only', 'reader-immersive', 'media-hidden']) {
      root.classList.add(flag); await h.settle();
      assert.ok(h.details().every(d => d.hidden)); assert.equal(h.body.querySelector('.reader-youtube-page').hidden, true);
      root.classList.remove(flag); await h.settle(); assert.ok(h.details().every(d => !d.hidden));
    }
  }
});

test('duplicates and repeated evaluation/init/pageshow do not duplicate nodes, fetches or observers', async () => {
  const h = harness({ entries: [entry(), entry(), entry({ title: 'TEST FIXTURE duplicate metadata' })] }); await h.settle();
  const d = h.details()[0]; h.run(); await h.window.AjewReaderYouTubeLinks.init(); h.fire('pageshow'); await h.settle();
  assert.equal(h.details().length, 1); assert.equal(h.watches().length, 1);
  assert.equal(h.details()[0], d); assert.equal(h.fetchCount(), 1); assert.equal(h.observers.length, 1);
});

test('DOMContentLoaded initializes once and preserves pre-existing text/audio', async () => {
  const h = harness({ loading: true }); assert.equal(h.fetchCount(), 0);
  h.run(); h.fire('DOMContentLoaded'); await h.settle();
  assert.equal(h.fetchCount(), 1); assert.equal(h.details().length, 1);
  assert.equal(h.pairs.get(7).children[0].textContent, 'CANONICAL TEST FIXTURE 7');
  assert.equal(h.audio.parentElement, h.container);
});

test('no mapping, wrong page/part/book/segment or aligned-only coordinate produces no UI', async () => {
  for (const entries of [[], [entry({ book: 'sichos-haran' })], [entry({ part: 2 })],
    [entry({ torah: 'faith' })], [entry({ segment: 8 })], [entry({ sourceUrl: route + '#aligned-7' })]]) {
    const h = harness({ entries }); await h.settle(); assert.equal(h.details().length, 0);
    assert.equal(h.body.querySelector('.reader-youtube-page'), null);
  }
  const h = harness(); h.pairs.get(7).remove(); await h.settle(); assert.equal(h.details().length, 0);
});

test('ambiguous original IDs are withheld; later source removal also removes available UI', async () => {
  const h = harness(); await h.settle();
  const duplicate = new h.Element('div'); duplicate.className = 'reader-segment-pair'; duplicate.id = 'seg-7'; h.original.append(duplicate);
  await h.settle(); assert.equal(h.details().length, 0);
  duplicate.remove(); await h.settle(); assert.equal(h.details().length, 1);
  h.pairs.get(7).remove(); await h.settle(); assert.equal(h.details().length, 0);
});

test('unsafe IDs, languages, kinds, numeric types and source URLs are rejected without normalization', async () => {
  const changes = [
    { videoId: 'bad' }, { videoId: 'abcdefghij/' }, { videoId: 'abcdefghij?' }, { videoId: '<scriptxxx>' },
    { videoId: ' FIXTURE0001' }, { videoId: 12345678901 }, { language: 'both' }, { language: 'HE' },
    { language: 'xx' }, { kind: 'video' }, { segment: '7' }, { segment: 0 }, { segment: -1 },
    { segment: 1.5 }, { segment: Number.MAX_SAFE_INTEGER + 1 }, { part: '1' }, { part: true },
    { title: '' }, { channel: null }, { title: 'x'.repeat(501) },
    { sourceUrl: 'javascript:alert(1)' }, { sourceUrl: 'https://evil.example' + route + '#seg-7' },
    { sourceUrl: '//ajew.org' + route + '#seg-7' }, { sourceUrl: 'http://ajew.org' + route + '#seg-7' },
    { sourceUrl: 'https://ajew.org.evil.example' + route + '#seg-7' },
    { sourceUrl: 'https://ajew.org:443' + route + '#seg-7' },
    { sourceUrl: 'https://ajew.org' + route + '?view=both#seg-7' },
    { sourceUrl: 'https://ajew.org/reader/sefer-hamidos/1/other/../children#seg-7' },
    { sourceUrl: route + '#seg-8' }, { sourceUrl: route + '#seg-%37' },
    { sourceUrl: '/reader/sefer-hamidos/01/children#seg-7' },
    { sourceUrl: route + '\\#seg-7' }, { sourceUrl: ' ' + route + '#seg-7' }
  ];
  for (const change of changes) {
    const h = harness({ entries: [entry(change)] }); await h.settle();
    assert.equal(h.details().length, 0, JSON.stringify(change));
  }
});

test('unknown, extra-depth, encoded, zero-part and malformed routes do not even fetch', async () => {
  for (const pathname of ['/reader', '/reader/sefer-hamidos/1', route + '/extra',
    '/reader/unknown-book/1/children', '/reader/sefer-hamidos/01/children',
    '/reader/sefer-hamidos/0/children', '/reader/sefer-hamidos/1/%63hildren',
    '/reader/sefer-hamidos/1/../children', '/reader/sefer-hamidos/1/<script>']) {
    const h = harness({ pathname }); await h.settle(); assert.equal(h.fetchCount(), 0, pathname); assert.equal(h.details().length, 0);
  }
  const h = harness({ noContent: true }); await h.settle(); assert.equal(h.fetchCount(), 0);
});

test('missing, non-OK, malformed, unsupported-version and non-array manifests fail closed', async () => {
  for (const failure of ['network', 'http', 'json']) {
    const h = harness({ failure }); await h.settle(); assert.equal(h.details().length, 0);
  }
  for (const manifest of [{}, { version: 2, entries: [entry()] }, { version: 1, entries: {} },
    { version: '1', entries: [entry()] }, { version: 1, entries: [null, {}, 'bad'] }]) {
    const h = harness({ manifest }); await h.settle(); assert.equal(h.details().length, 0);
  }
});

test('hostile title/channel text stays literal; watch URL is derived only from validated ID', async () => {
  const title = '<img src=x onerror=alert(1)> & " TEST FIXTURE';
  const channel = '<script>alert(1)</script> TEST FIXTURE';
  const h = harness({ entries: [entry({ title, channel, url: 'javascript:alert(1)' })] }); await h.settle();
  const a = h.watches()[0]; assert.equal(a.textContent, title);
  assert.equal(a.href, 'https://www.youtube.com/watch?v=FIXTURE0001');
  assert.ok(h.details()[0].textContent.includes(channel)); assert.equal(h.body.querySelectorAll('img').length, 0);
});

test('route change withdraws old source UI instead of carrying associations to a new page', async () => {
  const h = harness({ entries: mixed() }); await h.settle();
  h.window.location.pathname = '/reader/sefer-hamidos/1/faith'; h.fire('pageshow'); await h.settle();
  assert.equal(h.details().length, 0); assert.equal(h.body.querySelector('.reader-youtube-page'), null);
});

test('native copy/share/My Sefer source text excludes watch-link UI without suppressing teaching actions', async () => {
  const h = harness(); await h.settle();
  const pair = h.pairs.get(7);
  const start = v2.indexOf('  function segmentPlainText(seg) {');
  const end = v2.indexOf('\n  function shareOrCopy', start);
  assert.ok(start >= 0 && end > start);
  h.context.testPair = pair;
  const copied = vm.runInContext(v2.slice(start, end) + '\nsegmentPlainText(testPair);', h.context);
  assert.equal(copied, 'CANONICAL TEST FIXTURE 7');
  assert.ok(pair.children.every(child => !child.classList.contains('ajew-segment-actions')),
    'no direct-child native action marker to suppress existing toolbar initialization');
});

test('dedupe preserves distinct source owners/languages but collapses conflicting kind metadata', async () => {
  const h = harness({ entries: [entry(), entry({ kind: 'story' }), entry({ segment: 31 }), entry({ language: 'en' })] });
  await h.settle(); assert.equal(h.watches().length, 3); assert.equal(h.details().length, 2);
  h.nativeMode('english'); await h.settle();
  assert.equal(h.rows().filter(r => !r.hidden).length, 1);
});

test('Layout injects only versioned feature assets under the qualified Reader flag and does not inline an embed', () => {
  const layout = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
  assert.ok(layout.includes(`{hasYouTubeReader && <link rel="stylesheet" href="/reader-youtube-links.css?v=${cacheKey}" />}`));
  assert.ok(layout.includes(`{hasYouTubeReader && <script src="/reader-youtube-links.js?v=${cacheKey}" is:inline defer></script>}`));
  assert.equal((layout.match(/src="\/reader-youtube-links\.js/g) || []).length, 1);
  assert.equal((layout.match(/hasYouTubeReader/g) || []).length, 3, 'new flag only defines and guards the two feature assets');
  const start = layout.indexOf('const readerPlainMatch =');
  const end = layout.indexOf('\n---', start);
  for (const [pathname, expected] of [[route, true], ['/reader/likutay-moharan/2/omission', true],
    ['/reader/chayey-moharan/siman/260', true],
    ['/reader/chayey-moharan/siman/198/', true], ['/reader/chayay-moharan/siman/260', false],
    ['/reader/unknown-book/siman/260', false], ['/reader/chayey-moharan/siman/0', false],
    ['/reader/chayey-moharan/siman/0260', false], ['/reader/chayey-moharan/siman/story', false],
    ['/reader/chayey-moharan/siman/260/extra', false]]) {
    const flags = vm.runInNewContext(layout.slice(start, end) + '\n({hasYouTubeReader, readerPlainBase});',
      { Astro: { url: { pathname } } });
    assert.equal(flags.hasYouTubeReader, expected, pathname);
    if (pathname.includes('/siman/')) assert.equal(flags.readerPlainBase, null, 'no invented plain-text siman link');
  }
});

test('relative/trailing-slash exact sources and safe mixed-case/underscore video IDs work', async () => {
  const h = harness({ pathname: route + '/', entries: [entry({ videoId: 'Ab_-Cd01234', sourceUrl: route + '/#seg-7' })] });
  await h.settle(); assert.equal(h.watches().length, 1);
  assert.equal(h.watches()[0].href, 'https://www.youtube.com/watch?v=Ab_-Cd01234');
  assert.equal(h.details()[0].querySelectorAll('a')[1].href, route + '/#seg-7');
});

function simanEntry(torah = '260', overrides = {}) {
  return entry({ book: 'chayey-moharan', part: 1, torah, routeType: 'siman',
    segment: null, kind: 'story', sourceUrl: `https://ajew.org/reader/chayey-moharan/siman/${torah}`, ...overrides });
}

test('exact Chayey siman 260/198 sources preserve URLs and native HE/EN/Both/media modes', async () => {
  for (const torah of ['260', '198']) {
    const pathname = `/reader/chayey-moharan/siman/${torah}`;
    const entries = [simanEntry(torah, { annotation: 'Hebrew subtitles; TEST FIXTURE adaptation differs from the source.' }),
      simanEntry(torah, { language: 'en', videoId: 'FIXTURE0002', sourceUrl: pathname + '/' })];
    const h = harness({ pathname: pathname + '/', entries }); await h.settle();
    assert.equal(h.details().length, 1); assert.equal(h.watches().length, 2);
    assert.equal(h.details()[0].parentElement.nextSibling, h.content);
    assert.deepEqual(h.rows().map(r => r.querySelectorAll('a')[1].href), entries.map(e => e.sourceUrl));
    assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['he']);
    assert.match(h.rows()[0].textContent, /Story adaptation/);
    assert.match(h.rows()[0].querySelector('.reader-youtube-annotation').textContent, /^Hebrew subtitles;/);
    h.nativeMode('english'); await h.settle();
    assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['en']);
    h.nativeMode('both'); await h.settle(); assert.equal(h.rows().filter(r => !r.hidden).length, 2);
    h.body.classList.add('reader-hide-media'); await h.settle(); assert.equal(h.details()[0].hidden, true);
    h.body.classList.remove('reader-hide-media'); await h.settle(); assert.equal(h.details()[0].hidden, false);
  }
});

test('siman discriminator and exact numeric route validation cannot alias chapter maps', async () => {
  const pathname = '/reader/chayey-moharan/siman/260';
  for (const change of [{ routeType: undefined }, { routeType: 'section' }, { routeType: 'SIMAN' },
    { routeType: null }, { routeType: 1 }, { book: 'chayay-moharan' }, { part: 2 },
    { torah: 'story' }, { torah: '0' }, { torah: '0260' }, { torah: 260 },
    { sourceUrl: '/reader/chayey-moharan/1/260' }, { sourceUrl: pathname + '#aligned-7' },
    { sourceUrl: pathname + '#seg-7' }, { sourceUrl: pathname + '?view=both' },
    { sourceUrl: '/reader/chayey-moharan/siman/%32%36%30' }]) {
    const h = harness({ pathname, entries: [simanEntry('260', change)] }); await h.settle();
    assert.equal(h.details().length, 0, JSON.stringify(change));
  }
  for (const badPath of ['/reader/unknown-book/siman/260', '/reader/sefer-hamidos/siman/260',
    '/reader/chayay-moharan/siman/260', '/reader/chayey-moharan/siman/story',
    '/reader/chayey-moharan/siman/0', '/reader/chayey-moharan/siman/0260',
    '/reader/chayey-moharan/siman/260/extra']) {
    const h = harness({ pathname: badPath, entries: [simanEntry()] }); await h.settle();
    assert.equal(h.fetchCount(), 0, badPath); assert.equal(h.details().length, 0);
  }
  const chapter = '/reader/chayey-moharan/1/260';
  const e = entry({ book: 'chayey-moharan', torah: '260', segment: null, kind: 'story' });
  for (const routeType of [undefined, 'section']) {
    const h = harness({ pathname: chapter, entries: [{ ...e, routeType }, simanEntry()] }); await h.settle();
    assert.equal(h.watches().length, 1); assert.equal(h.rows()[0].querySelectorAll('a')[1].href, e.sourceUrl);
  }
  for (const bad of [{ ...e, routeType: 'siman' }, entry({ routeType: 'siman' }), entry({ routeType: 'unknown' })]) {
    const h = harness({ pathname: bad.book === 'chayey-moharan' ? chapter : route, entries: [bad] });
    await h.settle(); assert.equal(h.details().length, 0);
  }
  const fresh = harness({ pathname, entries: [simanEntry()] }); await fresh.settle(); assert.equal(fresh.watches().length, 1);
});

test('siman Original fragment follows alignment but departs on chapter route with identical coordinates', async () => {
  const pathname = '/reader/chayey-moharan/siman/260';
  const sourceUrl = pathname + '#seg-31';
  const h = harness({ pathname, entries: [simanEntry('260', { segment: 31, sourceUrl })] }); await h.settle();
  const d = h.details()[0]; assert.equal(d.parentElement, h.pairs.get(31)); d.open = true;
  h.nativeAlign(); await h.settle();
  assert.equal(d.parentElement.className, 'reader-youtube-page'); assert.equal(d.open, true);
  assert.match(d.textContent, /No aligned-paragraph mapping/);
  assert.equal(d.querySelectorAll('a')[1].href, sourceUrl);
  assert.equal(h.aligned.querySelectorAll('.reader-youtube-links').length, 0);
  h.original.style.display = ''; h.aligned.style.display = 'none'; await h.settle();
  assert.equal(d.parentElement, h.pairs.get(31));
  h.window.location.pathname = '/reader/chayey-moharan/1/260'; h.fire('pageshow'); await h.settle();
  assert.equal(h.details().length, 0); assert.equal(h.body.querySelector('.reader-youtube-page'), null);
  const reverse = harness({ pathname: '/reader/chayey-moharan/1/260', entries:
    [entry({ book: 'chayey-moharan', torah: '260' })] }); await reverse.settle(); assert.equal(reverse.details().length, 1);
  reverse.window.location.pathname = pathname; reverse.fire('pageshow'); await reverse.settle();
  assert.equal(reverse.details().length, 0);
});

test('optional annotation is bounded literal text, rejected when malformed and excluded from native source copy', async () => {
  const annotation = 'Hebrew subtitles; <img src=x onerror=alert(1)> <script>TEST FIXTURE adaptation difference</script>';
  const h = harness({ entries: [entry({ kind: 'story', annotation })] }); await h.settle();
  const note = h.rows()[0].querySelector('.reader-youtube-annotation');
  assert.equal(note.textContent, annotation); assert.equal(note.children.length, 0);
  assert.ok(note.closest('.ajew-segment-actions')); assert.equal(h.body.querySelectorAll('img').length, 0);
  assert.match(h.rows()[0].textContent, /Story adaptation/);
  const start = v2.indexOf('  function segmentPlainText(seg) {');
  const end = v2.indexOf('\n  function shareOrCopy', start);
  assert.ok(start >= 0 && end > start); h.context.testPair = h.pairs.get(7);
  assert.equal(vm.runInContext(v2.slice(start, end) + '\nsegmentPlainText(testPair);', h.context), 'CANONICAL TEST FIXTURE 7');
  assert.ok(h.pairs.get(7).children.every(child => !child.classList.contains('ajew-segment-actions')));
  for (const annotation of [null, 1, true, {}, [], 'x'.repeat(801)]) {
    const bad = harness({ entries: [entry({ annotation })] }); await bad.settle(); assert.equal(bad.details().length, 0);
  }
  const fresh = harness({ entries: [entry({ annotation: 'x'.repeat(800) })] }); await fresh.settle();
  assert.equal(fresh.rows()[0].querySelector('.reader-youtube-annotation').textContent.length, 800);
});

test('teaching videos attach to exact generic section and Original source with native language/media rules', async () => {
  const pathname = '/reader/likutay-moharan/1/25';
  const entries = [entry({ book: 'likutay-moharan', torah: '25', kind: 'teaching' }),
    entry({ book: 'likutay-moharan', torah: '25', kind: 'teaching', language: 'en', videoId: 'FIXTURE0002' }),
    entry({ book: 'likutay-moharan', torah: '25', kind: 'teaching', segment: null, videoId: 'FIXTURE0003' })];
  const h = harness({ pathname, entries }); await h.settle();
  assert.equal(h.details().length, 2); assert.equal(h.watches().length, 3);
  const d = h.pairs.get(7).querySelector('.reader-youtube-links'); assert.ok(d); assert.equal(d.open, false);
  assert.equal(h.pairs.get(2).querySelector('.reader-youtube-links'), null);
  assert.equal(h.body.querySelector('.reader-youtube-page').nextSibling, h.content);
  assert.deepEqual(h.rows().map(r => r.querySelectorAll('a')[1].href), [entries[2], entries[0], entries[1]].map(e => e.sourceUrl));
  for (const row of h.rows()) {
    assert.match(row.querySelector('.reader-youtube-meta').textContent, / · Teaching video · /);
    assert.match(row.textContent, /Lecture\/commentary on the linked source, not a literal reading\./);
    assert.doesNotMatch(row.textContent, /Story adaptation|Video-song/);
  }
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['he', 'he']);
  h.nativeMode('english'); await h.settle();
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['en']);
  h.nativeMode('both'); await h.settle(); assert.equal(h.rows().filter(r => !r.hidden).length, 3);
  assert.equal(d.parentElement.className, 'reader-youtube-page');
  assert.match(d.textContent, /No aligned-paragraph mapping/);
  assert.equal(h.aligned.querySelectorAll('.reader-youtube-links').length, 0);
  for (const root of [h.body, h.container, h.content, h.document.documentElement]) {
    for (const flag of ['reader-hide-media', 'reader-teachings-only', 'reader-immersive', 'media-hidden']) {
      root.classList.add(flag); await h.settle(); assert.ok(h.details().every(el => el.hidden));
      root.classList.remove(flag); await h.settle(); assert.ok(h.details().every(el => !el.hidden));
    }
  }
  h.nativeMode('hebrew'); await h.settle(); assert.equal(d.parentElement, h.pairs.get(7));
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['he', 'he']);
  assert.equal(h.body.querySelectorAll('iframe').length, 0); assert.equal(h.body.querySelectorAll('video').length, 0);
  assert.equal(h.body.querySelectorAll('audio')[0], h.audio);
});

test('teaching videos support exact siman section/Original URLs without chapter or aligned aliases', async () => {
  const pathname = '/reader/chayey-moharan/siman/260';
  const entries = [simanEntry('260', { kind: 'teaching', sourceUrl: pathname + '/' }),
    simanEntry('260', { kind: 'teaching', language: 'en', segment: 31, videoId: 'FIXTURE0002', sourceUrl: pathname + '#seg-31' })];
  const h = harness({ pathname: pathname + '/', entries }); await h.settle();
  assert.equal(h.watches().length, 2); assert.equal(h.details().length, 2);
  assert.deepEqual(h.rows().map(r => r.querySelectorAll('a')[1].href), entries.map(e => e.sourceUrl));
  const d = h.pairs.get(31).querySelector('.reader-youtube-links'); assert.ok(d); assert.equal(d.hidden, true);
  h.nativeMode('english'); await h.settle(); assert.equal(d.hidden, false);
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['en']);
  h.nativeMode('both'); await h.settle(); assert.equal(h.rows().filter(r => !r.hidden).length, 2);
  assert.equal(d.parentElement.className, 'reader-youtube-page');
  assert.match(d.textContent, /Original source paragraph 31/);
  assert.equal(d.querySelectorAll('a')[1].href, pathname + '#seg-31');
  assert.equal(h.aligned.querySelectorAll('.reader-youtube-links').length, 0);
  for (const row of h.rows()) assert.match(row.querySelector('.reader-youtube-meta').textContent, /Teaching video/);
  h.body.classList.add('reader-hide-media'); await h.settle(); assert.ok(h.details().every(el => el.hidden));
  h.body.classList.remove('reader-hide-media'); await h.settle(); assert.ok(h.details().every(el => !el.hidden));
  h.nativeMode('hebrew'); await h.settle(); assert.equal(d.parentElement, h.pairs.get(31)); assert.equal(d.hidden, true);
  h.window.location.pathname = '/reader/chayey-moharan/1/260'; h.fire('pageshow'); await h.settle();
  assert.equal(h.details().length, 0);
});

test('teaching lecture labels/annotations stay literal and are excluded from native copy/share/My Sefer text', async () => {
  const annotation = 'TEST FIXTURE lecture commentary; <img src=x onerror=alert(1)> is not source text.';
  const h = harness({ entries: [entry({ kind: 'teaching', annotation })] }); await h.settle();
  assert.equal(h.rows().length, 1);
  assert.equal(h.rows()[0].querySelectorAll('.reader-youtube-annotation').at(-1).textContent, annotation);
  assert.match(h.rows()[0].textContent, /Teaching video/);
  assert.match(h.rows()[0].textContent, /not a literal reading/);
  assert.equal(h.body.querySelectorAll('img').length, 0);
  const pair = h.pairs.get(7), start = v2.indexOf('  function segmentPlainText(seg) {');
  const end = v2.indexOf('\n  function shareOrCopy', start); assert.ok(start >= 0 && end > start);
  h.context.testPair = pair;
  assert.equal(vm.runInContext(v2.slice(start, end) + '\nsegmentPlainText(testPair);', h.context), 'CANONICAL TEST FIXTURE 7');
  assert.ok(pair.children.every(child => !child.classList.contains('ajew-segment-actions')));
  const clone = pair.cloneNode(true);
  clone.querySelectorAll('.ajew-segment-actions').forEach(el => el.remove());
  assert.equal(clone.textContent, 'CANONICAL TEST FIXTURE 7');
  assert.equal(pair.children[0].textContent, 'CANONICAL TEST FIXTURE 7');
});

test('kind enumeration accepts only exact song/story/teaching tokens and keeps existing labels', async () => {
  for (const kind of ['Teaching', 'TEACHING', ' teaching', 'teaching ', 'lecture', 'video', '', null, undefined, 1, true, {}, ['teaching']]) {
    const h = harness({ entries: [entry({ kind })] }); await h.settle();
    assert.equal(h.details().length, 0, JSON.stringify(kind)); assert.equal(h.watches().length, 0);
  }
  const h = harness({ entries: [entry(), entry({ kind: 'story', videoId: 'FIXTURE0002' }),
    entry({ kind: 'teaching', videoId: 'FIXTURE0003' })] }); await h.settle();
  assert.deepEqual(h.rows().map(r => r.querySelector('.reader-youtube-meta').textContent),
    ['Hebrew · Video-song · TEST FIXTURE channel', 'Hebrew · Story adaptation · TEST FIXTURE channel',
      'Hebrew · Teaching video · TEST FIXTURE channel']);
  assert.doesNotMatch(h.rows()[0].textContent, /Lecture\/commentary/);
  assert.doesNotMatch(h.rows()[1].textContent, /Lecture\/commentary/);
});

test('teaching kind does not relax exact source identity, language or Original owner validation', async () => {
  for (const change of [{ book: 'sichos-haran' }, { part: 2 }, { torah: 'faith' }, { segment: 8 },
    { sourceUrl: route + '#seg-31' }, { sourceUrl: route + '#aligned-7' }, { sourceUrl: route + '?view=both#seg-7' },
    { sourceUrl: 'https://evil.example' + route + '#seg-7' }, { sourceUrl: route + '#seg-%37' },
    { language: 'both' }, { language: 'HE' }, { routeType: 'siman' }]) {
    const h = harness({ entries: [entry({ kind: 'teaching', ...change })] }); await h.settle();
    assert.equal(h.details().length, 0, JSON.stringify(change));
  }
  const pathname = '/reader/chayey-moharan/siman/260';
  for (const change of [{ routeType: undefined }, { routeType: 'section' }, { torah: '198' },
    { sourceUrl: '/reader/chayey-moharan/1/260' }, { sourceUrl: pathname + '#aligned-31' }]) {
    const h = harness({ pathname, entries: [simanEntry('260', { kind: 'teaching', ...change })] }); await h.settle();
    assert.equal(h.details().length, 0, JSON.stringify(change));
  }
  const fresh = harness({ entries: [entry({ kind: 'teaching' })] }); await fresh.settle(); assert.equal(fresh.watches().length, 1);
});

test('existing alphabetic section contract admits omission with exact Original URLs and fallback', async () => {
  const pathname = '/reader/likutay-moharan/2/omission';
  const entries = [entry({ book: 'likutay-moharan', part: 2, torah: 'omission', segment: 2,
    language: 'en', routeType: 'section', sourceUrl: 'https://ajew.org' + pathname + '#seg-2' }),
    entry({ book: 'likutay-moharan', part: 2, torah: 'omission', segment: null,
      language: 'he', videoId: 'FIXTURE0002', sourceUrl: pathname + '/' })];
  const h = harness({ pathname: pathname + '/', entries }); await h.settle();
  assert.equal(h.fetchCount(), 1); assert.equal(h.watches().length, 2);
  const d = h.pairs.get(2).querySelector('.reader-youtube-links'); assert.ok(d);
  assert.equal(d.open, false); assert.equal(d.hidden, true);
  assert.equal(d.querySelectorAll('a')[1].href, entries[0].sourceUrl);
  assert.equal(h.pairs.get(7).querySelector('.reader-youtube-links'), null);
  h.nativeMode('english'); await h.settle(); assert.equal(d.hidden, false);
  assert.deepEqual(h.rows().filter(r => !r.hidden).map(r => r.lang), ['en']);
  h.nativeMode('both'); await h.settle();
  assert.equal(d.parentElement.className, 'reader-youtube-page');
  assert.match(d.textContent, /Original source paragraph 2/);
  assert.equal(d.querySelectorAll('a')[1].href, entries[0].sourceUrl);
  assert.equal(h.aligned.querySelectorAll('.reader-youtube-links').length, 0);
  h.nativeMode('hebrew'); await h.settle(); assert.equal(d.parentElement, h.pairs.get(2));
  assert.equal(d.hidden, true);
});

test('omission keeps exact source identity and section discriminator without encoded or siman aliases', async () => {
  const pathname = '/reader/likutay-moharan/2/omission';
  const e = entry({ book: 'likutay-moharan', part: 2, torah: 'omission', segment: 2 });
  for (const change of [{ routeType: 'siman' }, { routeType: 'SECTION' }, { routeType: null },
    { part: 1 }, { torah: 'Omission' }, { torah: 'omission ' }, { book: 'sichos-haran' },
    { sourceUrl: pathname + '#seg-7' }, { sourceUrl: pathname + '#aligned-2' },
    { sourceUrl: pathname + '?view=both#seg-2' }, { sourceUrl: pathname.replace('omission', '%6fmission') + '#seg-2' },
    { sourceUrl: '/reader/likutay-moharan/1/omission#seg-2' },
    { sourceUrl: '/reader/likutay-moharan/2/112#seg-2' },
    { sourceUrl: 'https://evil.example' + pathname + '#seg-2' }]) {
    const h = harness({ pathname, entries: [{ ...e, ...change }] }); await h.settle();
    assert.equal(h.watches().length, 0, JSON.stringify(change));
  }
  for (const badPath of [pathname.replace('omission', '%6fmission'), pathname.replace('omission', 'Omission'),
    pathname.replace('/2/', '/02/'), pathname + '/extra', '/reader/likutay-moharan/siman/omission']) {
    const h = harness({ pathname: badPath, entries: [e] }); await h.settle(); assert.equal(h.fetchCount(), 0, badPath);
  }
  for (const routeType of [undefined, 'section']) {
    const h = harness({ pathname, entries: [{ ...e, routeType }] }); await h.settle();
    assert.equal(h.watches().length, 1); assert.equal(h.rows()[0].querySelectorAll('a')[1].href, e.sourceUrl);
  }
});
