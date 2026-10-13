'use strict';

// Portable, dependency-free full-init logic test; NOT browser/paint or media QA.
// Chayay metadata and reader DOM are explicitly labelled synthetic fixtures.
// Sefer HaMidos uses the existing repository manifest unchanged. No network I/O.
// Run: node --test --test-reporter=tap --test-concurrency=1 scripts/test-chayay-ace-audio.cjs
// Optional RED: AUDIO_PLAYER_BASELINE_REV=<git revision> with the same command.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = process.env.AUDIO_PLAYER_BASELINE_REV
  ? execFileSync('git', ['show', `${process.env.AUDIO_PLAYER_BASELINE_REV}:public/audio-player.js`], { cwd: root, encoding: 'utf8' })
  : fs.readFileSync(path.join(root, 'public/audio-player.js'), 'utf8');
const oldManifestPath = 'public/reader/suno-songs/sefer-hamidos.json';
// Sparse worktrees can omit this unchanged tracked file; read its Git blob
// without materializing a corpus/fixture tree or requiring private paths.
const oldManifest = JSON.parse(fs.existsSync(path.join(root, oldManifestPath))
  ? fs.readFileSync(path.join(root, oldManifestPath), 'utf8')
  : execFileSync('git', ['show', `HEAD:${oldManifestPath}`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
const archive = 'ajew-chayay-moharan-308-ace-step15-20261013-r3';
const tracks = ['hebrew', 'english'].map(language => {
  const filename = `CM-308-opening-${language}-ace-step15-r3.mp3`;
  return {
    title: `A Small Wood — ${language === 'hebrew' ? 'Hebrew' : 'English'} (fixture title)`,
    language, source: 'Chayay Moharan 308 — opening sentence only',
    archive_identifier: archive, archive_filename: filename,
    url: `https://archive.org/download/${archive}/${filename}`,
    share_url: `/reader/chayey-moharan/1/9/?song=${filename}#seg-184`,
    duration: 240, provider: 'ACE-Step', model: 'ACE-Step 1.5 Turbo', ace_step_run_id: '358041125'
  };
});
const chayayFixture = { book: 'chayey-moharan', entries: [{
  part: '1', torah: '9', segment: 184, source: tracks[0].source,
  reader_url: '/reader/chayey-moharan/1/9/#seg-184',
  // Deliberately reverse languages to exercise existing sorting.
  tracks: tracks.slice().reverse()
}] };

// A small DOM adapter for the APIs actually used by the complete IIFE.
// Unsupported selectors/HTML fail as apparatus errors, never application RED.
function matches(node, selector) {
  const parsed = /^(\w+)?(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[([\w-]+)(\*=|=)"([^"]*)"\])?$/.exec(selector);
  assert.ok(parsed && parsed[0], `Unsupported fixture selector: ${selector}`);
  const [, tag, id, cls, attr, op, value] = parsed;
  return node.nodeType === 1 && (!tag || node.tagName === tag.toUpperCase()) &&
    (!id || node.id === id) && (!cls || node.className.split(/\s+/).includes(cls)) &&
    (!attr || (op === '*=' ? (node.getAttribute(attr) || '').includes(value) : node.getAttribute(attr) === value));
}
function selectorMatches(node, selector) {
  const parts = selector.trim().split(/\s+/);
  if (!matches(node, parts.pop())) return false;
  let ancestor = node.parentNode;
  while (parts.length) {
    const part = parts.pop();
    while (ancestor && !matches(ancestor, part)) ancestor = ancestor.parentNode;
    if (!ancestor) return false;
    ancestor = ancestor.parentNode;
  }
  return true;
}
class Element {
  constructor(tag, base, text) {
    this.nodeType = tag === '#text' ? 3 : 1;
    this.tagName = tag.toUpperCase(); this.base = base;
    this.children = []; this.parentNode = null; this.attrs = {}; this.listeners = {};
    this.style = {}; this.hidden = false; this.open = false; this.plays = 0;
    this._text = text || ''; this._value = undefined;
    this.classList = {
      add: cls => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), cls])].join(' '); },
      remove: cls => { this.className = this.className.split(/\s+/).filter(c => c !== cls).join(' '); },
      toggle: (cls, on) => { const add = on === undefined ? !this.className.split(/\s+/).includes(cls) : on; this.classList[add ? 'add' : 'remove'](cls); }
    };
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return Object.hasOwn(this.attrs, k) ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  get id() { return this.attrs.id || ''; } set id(v) { this.setAttribute('id', v); }
  get className() { return this.attrs.class || ''; } set className(v) { this.setAttribute('class', v); }
  get href() { return new URL(this.attrs.href || '', this.base).href; } set href(v) { this.setAttribute('href', v); }
  get src() { return this.attrs.src ? new URL(this.attrs.src, this.base).href : ''; } set src(v) { this.setAttribute('src', v); }
  get value() { return this._value ?? (this.tagName === 'SELECT' ? (this.children.find(c => c.selected) || this.children[0])?.value || '' : this.attrs.value || ''); }
  set value(v) { this._value = String(v); }
  get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this.clear(); this._text = String(v); }
  set innerHTML(v) { assert.equal(v, '', 'Unsupported fixture HTML parsing'); this.clear(); }
  clear() { this.children.forEach(c => { c.parentNode = null; }); this.children = []; this._text = ''; }
  appendChild(child) { return this.insertBefore(child, null); }
  insertBefore(child, before) {
    if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1);
    const index = before ? this.children.indexOf(before) : this.children.length;
    assert.ok(index >= 0, 'Fixture insertBefore requires an existing child');
    this.children.splice(index, 0, child); child.parentNode = this; return child;
  }
  get nextSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] || null; }
  querySelectorAll(selector) {
    const result = []; const alternatives = selector.split(',').map(s => s.trim());
    const walk = node => { for (const child of node.children) { if (alternatives.some(s => selectorMatches(child, s))) result.push(child); walk(child); } };
    walk(this); return result;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { for (let n = this; n; n = n.parentNode) if (selectorMatches(n, selector)) return n; return null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  fire(type) {
    const event = { target: this, preventDefault() {}, stopPropagation() {} };
    this[`on${type}`]?.call(this, event);
    (this.listeners[type] || []).forEach(fn => fn.call(this, event));
  }
  play() { this.plays++; return Promise.resolve(); }
  focus() { this.focused = true; }
  scrollIntoView(options) { this.scrolled = options; }
}
async function boot({ book = 'chayey-moharan', part = '1', torah = '9', song = '', ids = [183, 184, 185], prefix = 'seg-', readyState = 'complete', manifest = chayayFixture, edition = false } = {}) {
  const anchor = ids.includes(184) ? 184 : ids[0];
  const location = new URL(`https://ajew.org/reader/${book}/${part}/${torah}/${song ? `?song=${encodeURIComponent(song)}` : ''}#${prefix}${anchor}`);
  const document = new Element('document', location.href);
  document.readyState = readyState; document.title = 'Synthetic Reader fixture';
  document.createElement = tag => new Element(tag, location.href);
  document.createTextNode = text => new Element('#text', location.href, text);
  document.getElementById = id => document.querySelector(`#${id}`);
  document.head = document.appendChild(document.createElement('head'));
  document.body = document.appendChild(document.createElement('body'));
  const main = document.body.appendChild(document.createElement('main'));
  ids.forEach(id => {
    const seg = main.appendChild(document.createElement('section')); seg.id = `${prefix}${id}`;
    for (const language of ['he', 'en']) {
      const text = seg.appendChild(document.createElement('div')); text.className = `segment-${language}`;
      text.textContent = `Synthetic ${language} text, not manuscript content.`;
    }
  });
  const fetches = [], shares = [], warnings = [], timers = [], observations = [];
  const storage = new Map();
  const fetch = async url => {
    fetches.push(url);
    let data;
    if (url === '/audio-sources.json') data = { books: edition ? { [book]: { editions: [{ name: 'Fixture Archive edition', identifier: 'ajew-suno-sefer-hamidos-001' }] } } : {} };
    else if (url === '/reader/suno-songs/chayey-moharan.json') data = manifest;
    else if (url === '/reader/suno-songs/sefer-hamidos.json') data = oldManifest;
    else if (url === 'https://archive.org/metadata/ajew-suno-sefer-hamidos-001') data = { files: [
      { name: 'SH-Emes-001-hebrew-variant-A.mp3', source: 'original', title: 'Fixture retained variant' },
      { name: 'retracted-range.mp3', source: 'original' }
    ] };
    else throw new Error(`Unsupported fixture fetch: ${url}`);
    return { ok: true, json: async () => structuredClone(data) };
  };
  const context = vm.createContext({
    document, window: { location, console: { warn: (...args) => warnings.push(args) }, matchMedia: () => ({ matches: false }) },
    navigator: { share: async payload => { shares.push(payload); } },
    console: { warn: (...args) => warnings.push(args) }, fetch, URL, URLSearchParams,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    // Observe registration is checked; this adapter does not simulate browser mutation delivery.
    MutationObserver: class { observe(...args) { observations.push(args); } },
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); return timers.length; }
  });
  vm.runInContext(source, context, { filename: 'public/audio-player.js', timeout: 1000 });
  if (readyState === 'loading') {
    assert.deepEqual(fetches, [], 'deferred init must not fetch before DOMContentLoaded');
    document.readyState = 'complete'; document.fire('DOMContentLoaded');
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(warnings, [], 'Full-init warnings are apparatus/application errors, not desired-contract RED');
  assert.equal(observations.length, 1, 'full init registers the generic media observer');
  assert.ok(document.getElementById('ajew-audio-player-styles'));
  return { document, main, fetches, shares, timers };
}
function songUI(result, id = 184, prefix = 'seg-') {
  const seg = result.document.getElementById(`${prefix}${id}`);
  const dropdown = seg.querySelector('.ajew-suno-segment-player');
  assert.ok(dropdown, `Expected song dropdown at ${prefix}${id}`);
  return { seg, dropdown, rows: dropdown.querySelectorAll('.ajew-suno-track'), playlist: result.document.querySelector('.ajew-suno-playlist') };
}
function button(node, text) {
  const found = node.querySelectorAll('button').find(b => b.textContent === text);
  assert.ok(found, `Expected button ${text}`); return found;
}

test('Chayay full init fetches only its manifest and places two sorted songs at seg-184', async () => {
  const r = await boot();
  assert.deepEqual(r.fetches.sort(), ['/audio-sources.json', '/reader/suno-songs/chayey-moharan.json']);
  const { seg, dropdown, rows, playlist } = songUI(r);
  assert.equal(rows.length, 2); assert.equal(dropdown.parentNode, seg);
  assert.equal(dropdown.closest('.segment-he'), null); assert.equal(dropdown.closest('.segment-en'), null);
  assert.equal(dropdown.open, false); assert.match(dropdown.querySelector('summary').textContent, /\(2\)/);
  assert.equal(playlist.nextSibling, seg);
  assert.deepEqual(rows.map(row => row.querySelector('audio').src), tracks.map(track => track.url));
  assert.deepEqual(rows.map(row => row.querySelector('.ajew-suno-track-label').textContent), tracks.map(track => `${track.title} — ${track.source}`));
  for (const id of [183, 185]) assert.equal(r.document.getElementById(`seg-${id}`).querySelector('.ajew-suno-segment-player'), null);
  // DOM ancestry stays independent of whichever text language is hidden.
  for (const lang of ['he', 'en']) { seg.querySelector(`.segment-${lang}`).hidden = true; assert.equal(dropdown.hidden, false); }
});

test('Chayay playlist plays, filters both languages, advances, and shares the selected song', async () => {
  const r = await boot({ readyState: 'loading' });
  const { playlist } = songUI(r); const audio = playlist.querySelector('audio');
  const select = playlist.querySelector('select');
  assert.deepEqual(select.children.map(o => o.value), ['all', 'hebrew', 'english']);
  button(playlist, '▶ Play all songs').fire('click');
  assert.equal(audio.src, tracks[1].url); // manifest order; dropdown sorting does not rewrite it
  audio.fire('ended'); assert.equal(audio.src, tracks[0].url);
  for (const track of tracks) {
    select.value = track.language; select.fire('change'); assert.equal(audio.src, '');
    button(playlist, '▶ Play all songs').fire('click'); assert.equal(audio.src, track.url);
    button(playlist, 'Next ⏭').fire('click'); assert.equal(audio.src, track.url);
    button(playlist, '↗ Share song').fire('click'); assert.equal(r.shares.at(-1).url, `https://ajew.org${track.share_url}`);
    assert.match(playlist.querySelector('.ajew-suno-playlist-status').textContent, /^1\/1:/);
  }
  select.value = 'all'; select.fire('change');
  assert.equal(playlist.querySelector('.ajew-suno-playlist-status').textContent, '2 songs');
  assert.ok(audio.plays > 0);
});

test('Chayay individual MP3 download/play/share/Telegram controls preserve each Reader link', async () => {
  const r = await boot(); const { rows } = songUI(r);
  rows.forEach((row, i) => {
    const track = tracks[i]; const audio = row.querySelector('audio');
    assert.equal(audio.getAttribute('controls'), ''); assert.equal(audio.getAttribute('preload'), 'none');
    audio.play(); assert.equal(audio.plays, 1);
    const download = row.querySelector('a'); assert.equal(download.href, track.url); assert.equal(download.getAttribute('download'), '');
    button(row, '↗ Share song').fire('click'); assert.equal(r.shares.at(-1).url, `https://ajew.org${track.share_url}`);
    const telegram = row.querySelector('.ajew-telegram-share-btn'); telegram.fire('click');
    assert.equal(new URL(telegram.href).searchParams.get('url'), `https://ajew.org${track.share_url}`);
  });
});

for (const track of tracks) test(`Chayay ?song auto-opens ${track.language} without autoplay`, async () => {
  const r = await boot({ song: track.archive_filename }); const { dropdown, rows } = songUI(r);
  assert.equal(dropdown.open, true); assert.ok(rows.every(row => row.querySelector('audio').plays === 0));
  const arrival = r.timers.find(timer => timer.delay === 250); assert.ok(arrival); arrival.fn();
  const row = rows.find(row => row.querySelector('audio').src === track.url);
  assert.equal(row.scrolled.block, 'center'); assert.equal(row.style.outline, '2px solid #f0b429');
  r.timers.find(timer => timer.delay === 3500).fn(); assert.equal(row.style.outline, '');
});

test('Chayay unknown ?song does not open a different song', async () => {
  const r = await boot({ song: 'not-approved.mp3' }); assert.equal(songUI(r).dropdown.open, false);
  assert.equal(r.timers.length, 0);
});

test('Adjacent segment alone never receives the seg-184 songs or a playlist', async () => {
  const r = await boot({ ids: [185] });
  assert.equal(r.document.querySelector('.ajew-suno-segment-player'), null);
  assert.equal(r.document.querySelector('.ajew-suno-playlist'), null);
});
for (const route of [{ part: '2', torah: '9' }, { part: '1', torah: '10' }]) test(`Chayay wrong part/section ${route.part}/${route.torah} has no injected songs`, async () => {
  const r = await boot(route); assert.equal(r.document.querySelector('.ajew-suno-segment-player'), null);
  assert.equal(r.document.querySelector('.ajew-suno-playlist'), null);
});

test('Existing Sefer HaMidos manifest, legacy segment- IDs, shared-song open and Archive filter are preserved', async () => {
  const entry = oldManifest.entries.find(e => String(e.part) === '1' && String(e.torah) === '1');
  assert.ok(entry); const track = entry.tracks[0];
  const r = await boot({ book: 'sefer-hamidos', torah: '1', ids: [entry.segment], prefix: 'segment-', song: track.archive_filename, edition: true });
  const { dropdown, rows, playlist } = songUI(r, entry.segment, 'segment-');
  assert.equal(rows.length, entry.tracks.length); assert.equal(dropdown.open, true); assert.ok(playlist);
  assert.deepEqual(rows.map(row => row.querySelector('audio').src).sort(), entry.tracks.map(t => t.url).sort());
  const row = rows.find(row => row.querySelector('audio').src === track.url);
  button(row, '↗ Share song').fire('click'); assert.equal(r.shares.at(-1).url, new URL(track.share_url, 'https://ajew.org').href);
  assert.ok(r.fetches.includes('/reader/suno-songs/sefer-hamidos.json'));
  assert.ok(!r.fetches.includes('/reader/suno-songs/chayey-moharan.json'));
  const player = r.document.getElementById('ajew-audio-player'); assert.ok(player);
  const files = player.querySelectorAll('.ajew-ap-list button'); assert.equal(files.length, 1);
  files[0].fire('click'); assert.match(player.querySelector('audio').src, /SH-Emes-001-hebrew-variant-A\.mp3$/);
  assert.equal(player.querySelectorAll('a').length, 0, 'old Sefer HaMidos keeps whole-item links suppressed');
});

test('Unrelated book gets no new song fetch; its ordinary Archive audio still initializes', async () => {
  const r = await boot({ book: 'likutay-moharan', edition: true });
  assert.deepEqual(r.fetches.sort(), ['/audio-sources.json', 'https://archive.org/metadata/ajew-suno-sefer-hamidos-001']);
  assert.equal(r.document.querySelector('.ajew-suno-segment-player'), null);
  assert.equal(r.document.querySelector('.ajew-suno-playlist'), null);
  assert.ok(r.document.getElementById('ajew-audio-player'));
  assert.ok(r.document.getElementById('ajew-audio-player').querySelector('a'));
});
