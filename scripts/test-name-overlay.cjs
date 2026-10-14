#!/usr/bin/env node
'use strict';
// Dependency-free full initialization harness. Uses the real page controls and real glyph JSON.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/name-overlay.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/name-overlay.css'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/pages/name-overlay.astro'), 'utf8');
const crypto = require('node:crypto');
const assetBytes = fs.readFileSync(path.join(root, 'public/name-overlay/glyphs-footer-small-v3.json'));
const glyphs = JSON.parse(assetBytes.toString('utf8'));
const originalGlyphs = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/name-overlay-baseline.json'), 'utf8'));
// Literal user codepoints, not a normalized/repointed projection or a self-derived oracle.
const EXACT_FOOTER = '\u05e0\u05b7 \u05e0\u05b7\u05d7\u05b0 \u05e0\u05b7\u05d7\u05b0\u05de\u05b8 \u05e0\u05b7\u05d7\u05b0\u05de\u05b8\u05df \u05de\u05d0\u05d5\u05de\u05df';
const EXPECTED_SHAPE = [[172,50],[171,48],[162,46],[157,44],[171,42],[172,39],[141,35],[171,35],[133,31],[164,31],[140,27],[173,27],[141,22],[171,22],[133,18],[164,18],[140,14],[173,14],[133,9],[164,9],[140,5],[173,5],[140,0],[173,0]];
const commonJS = { exports: {} };
vm.runInThisContext(`(function (module) { ${source}\n})`)(commonJS);
const api = commonJS.exports;
class Target {
  constructor() { this.events = new Map(); }
  addEventListener(type, fn, options) { if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push({ fn, once: !!options?.once }); }
  removeEventListener(type, fn) { this.events.set(type, (this.events.get(type) || []).filter(e => e.fn !== fn)); }
  dispatch(type, details = {}) { const e = { type, target: this, preventDefault() { this.defaultPrevented = true; }, ...details }; for (const entry of [...(this.events.get(type) || [])]) { entry.fn.call(this, e); if (entry.once) this.removeEventListener(type, entry.fn); } return e; }
}
class Element extends Target {
  constructor(tag) { super(); this.tagName = tag.toLowerCase(); this.children = []; this.attributes = {}; this.parentNode = null; this.value = ''; this.checked = false; this.textContent = ''; this.style = { setProperty(k, v) { this[k] = v; } }; }
  get type() { return this.attributes.type || ''; }
  get hidden() { return Object.hasOwn(this.attributes, 'hidden'); }
  set hidden(value) { if (value) this.attributes.hidden = ''; else delete this.attributes.hidden; }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'value') this.value = String(v); if (k === 'checked') this.checked = true; }
  getAttribute(k) { return this.attributes[k] ?? null; }
  removeAttribute(k) { delete this.attributes[k]; }
  appendChild(node) { node.remove(); this.children.push(node); node.parentNode = this; return node; }
  replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; nodes.forEach(n => this.appendChild(n)); }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter(n => n !== this); this.parentNode = null; } }
  matches(selector) {
    if (selector.startsWith('#')) return this.getAttribute('id') === selector.slice(1);
    if (selector.startsWith('.')) return (this.getAttribute('class') || '').split(/\s+/).includes(selector.slice(1));
    const attr = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attr) return Object.hasOwn(this.attributes, attr[1]) && (attr[2] === undefined || this.attributes[attr[1]] === attr[2]);
    return this.tagName === selector.toLowerCase();
  }
  querySelectorAll(selector) { const out = []; for (const c of this.children) { if (c.matches(selector)) out.push(c); out.push(...c.querySelectorAll(selector)); } return out; }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
class Document extends Target {
  constructor() { super(); this.body = new Element('body'); this.hidden = false; this.readyState = 'complete'; }
  createElement(tag) { return new Element(tag); }
  createElementNS(ns, tag) { const el = new Element(tag); el.namespace = ns; return el; }
  querySelector(s) { return this.body.querySelector(s); }
  querySelectorAll(s) { return this.body.querySelectorAll(s); }
  getElementById(id) { return this.querySelector('#' + id); }
}
// Static-markup tree parser for this intentionally expression-free settings form.
// Not a browser paint/HTML5 parser claim. It preserves the real controls and their ancestors.
function parsePanel(doc) {
  const markup = page.match(/<form\b[\s\S]*?<\/form>/)[0];
  const stack = [doc.body];
  const voids = new Set(['input', 'link', 'br']);
  for (const token of markup.matchAll(/<\/?[\w-]+\b[^>]*>|[^<]+/g)) {
    const s = token[0];
    if (!s.startsWith('<')) { stack.at(-1).textContent += s; continue; }
    if (s.startsWith('</')) { stack.pop(); continue; }
    const tag = s.match(/^<([\w-]+)/)[1];
    const node = doc.createElement(tag);
    const attrText = s.slice(tag.length + 1).replace(/\/?\s*>$/, '');
    for (const a of attrText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) node.setAttribute(a[1], a[2] || '');
    stack.at(-1).appendChild(node);
    if (!voids.has(tag) && !s.endsWith('/>')) stack.push(node);
  }
  doc.querySelectorAll('select').forEach(select => { const choices = select.querySelectorAll('option'); const chosen = choices.find(o => o.getAttribute('selected') !== null) || choices[0]; select.value = chosen?.getAttribute('value') || ''; });
}
function storage(initial) {
  const values = new Map(initial ? [[api.STORAGE_KEY, initial]] : []);
  return { values, getItem(k) { return values.get(k) ?? null; }, setItem(k, v) { values.set(k, v); }, removeItem(k) { values.delete(k); } };
}
function setup(options = {}) {
  const doc = new Document(); if (options.panel !== false) parsePanel(doc);
  const win = new Target(), media = new Target(); media.matches = !!options.reduced;
  win.innerWidth = options.width || 1280; win.innerHeight = options.height || 800;
  win.localStorage = options.storage || storage(); win.matchMedia = () => media; win.document = doc;
  const calls = []; win.fetch = async (...args) => { calls.push(args); return options.fetch ? options.fetch(...args) : { ok: true, json: async () => glyphs }; };
  const controller = options.auto ? null : api.initialize({ document: doc, window: win });
  return { doc, win, media, calls, controller, store: win.localStorage };
}
function control(e, field, type) { return e.doc.querySelectorAll('[data-no-field]').find(n => n.getAttribute('data-no-field') === field && (!type || n.type === type)); }
function change(e, field, value, type) { const n = control(e, field, type); assert.ok(n, 'real control exists: ' + field); if (n.type === 'checkbox') n.checked = value; else n.value = String(value); n.dispatch(['range', 'number', 'color'].includes(n.type) ? 'input' : 'change'); }
function live(e) { return e.doc.getElementById('ajew-name-overlay'); }
function base(e) { return live(e).querySelector('.no-base'); }
function transformedBounds(g, outline = g) {
  const [x0, y0, x1, y1] = outline.bounds;
  return [g.x + g.scale * x0, -g.y - g.scale * y1, g.x + g.scale * x1, -g.y - g.scale * y0];
}
function unionBounds(bounds) { return [Math.min(...bounds.map(b => b[0])), Math.min(...bounds.map(b => b[1])), Math.max(...bounds.map(b => b[2])), Math.max(...bounds.map(b => b[3]))]; }
function checkFooter(target, method, settings) {
  const svg = target.querySelector('svg'), footer = svg.querySelector('.no-footer');
  assert.ok(footer, 'footer rendered through full initialization');
  assert.equal(footer.getAttribute('data-source-text'), EXACT_FOOTER);
  assert.equal(footer.getAttribute('data-font'), 'Keter YG');
  assert.equal(svg.querySelector('metadata').textContent, EXACT_FOOTER);
  assert.equal(svg.querySelectorAll('text').length, 0, 'no raw font fallback');
  assert.equal(footer.children.length, 24, '15 letters plus all 9 ink marks');
  footer.children.forEach((p, i) => {
    const g = glyphs.layouts[method].footerGlyphs[i];
    assert.equal(p.tagName, 'path'); assert.ok(p.getAttribute('d').length > 20);
    assert.equal(p.getAttribute('d'), g.path);
    assert.equal(p.getAttribute('transform'), `translate(${g.x},${-g.y}) scale(${g.scale},${-g.scale})`);
    assert.equal(p.getAttribute('data-glyph-id'), String(EXPECTED_SHAPE[i][0]));
    assert.equal(p.getAttribute('data-cluster-utf8'), String(EXPECTED_SHAPE[i][1]));
    assert.equal(p.getAttribute('data-role'), 'footer'); assert.equal(p.getAttribute('fill'), settings.footer);
  });
  assert.ok(!footer.getAttribute('clip-path')); assert.ok(!footer.getAttribute('filter'));
  assert.ok(svg.children.indexOf(footer) > svg.children.indexOf(svg.querySelector('.no-effect')));
}
async function enabled(options) { const e = setup(options); change(e, 'enabled', true); await e.controller.ready(); return e; }
function close(e) { e.controller?.destroy(); }
function visible(node) { for (let n = node; n; n = n.parentNode) if (n.hidden) return false; return true; }
function checkLayout(e, method) {
  const layout = glyphs.layouts[method], paths = base(e).children;
  assert.equal(paths.length, 8);
  assert.equal(live(e).querySelector('svg').getAttribute('viewBox'), layout.viewBox.join(' '));
  assert.equal(live(e).querySelector('svg').getAttribute('preserveAspectRatio'), 'xMidYMid meet');
  checkFooter(live(e), method, e.controller.getSettings());
  paths.forEach((p, i) => { const g = layout.glyphs[i]; assert.equal(p.getAttribute('data-letter'), g.letter); assert.equal(p.getAttribute('data-role'), g.role); assert.equal(p.getAttribute('d'), glyphs.glyphs[g.letter].path); assert.equal(p.getAttribute('transform'), `translate(${g.x},${-g.y}) scale(${g.scale},${-g.scale})`); assert.equal(p.getAttribute('fill'), e.controller.getSettings()[g.role]); });
}
test('off-by-default ordinary page has no visible overlay/control and makes no request', () => {
  const e = setup({ panel: false }); assert.deepEqual(e.controller.getSettings(), { ...api.DEFAULTS }); assert.ok(live(e).hidden); assert.ok(e.doc.getElementById('ajew-name-overlay-tools').hidden); assert.equal(e.calls.length, 0); close(e);
});
test('settings page loads exact static preview without enabling or persisting', async () => {
  const e = setup(); await e.controller.ready(); assert.equal(e.calls.length, 1); assert.equal(e.calls[0][0], api.ASSET_URL); assert.deepEqual(e.calls[0][1], { credentials: 'omit', cache: 'force-cache' }); assert.ok(e.doc.querySelector('[data-no-preview]').querySelector('svg')); assert.ok(live(e).hidden); assert.equal(e.store.values.size, 0); assert.equal(e.doc.querySelector('[data-no-preview]').getAttribute('data-animate'), null); close(e);
});
test('interleaved full-init uses exact logical order, alternating roles, paths, colors and transforms', async () => { const e = await enabled(); checkLayout(e, 'interleaved'); assert.equal(base(e).children.map(n => n.getAttribute('data-letter')).join(''), glyphs.interleaved); close(e); });
test('nested full-init preserves exact inset in the final leftmost primary letter', async () => {
  const e = await enabled(); change(e, 'method', 'nested'); checkLayout(e, 'nested'); const l = glyphs.layouts.nested; assert.equal(l.glyphs[3].x, Math.min(...l.glyphs.filter(g => g.role === 'primary').map(g => g.x))); assert.ok(l.glyphs.slice(4).every(g => g.scale === l.secondary_inset_in_final_he.scale)); close(e);
});
test('pure normalization rejects invalid colors/storage types and clamps all numeric fields', () => {
  const s = api.normalize({ primary: 'red', secondary: '#ab12EF', enabled: 'true', remember: 1, motion: 'yes', method: 'bad', effect: 'strobe', width: -20, height: 500, opacity: Infinity, intensity: -1, anchor: 'custom', x: 120, y: -10 });
  assert.equal(s.primary, '#87CEEB'); assert.equal(s.secondary, '#AB12EF'); assert.equal(s.enabled, false); assert.equal(s.remember, false); assert.equal(s.motion, true); assert.equal(s.width, 1); assert.equal(s.height, 100); assert.equal(s.opacity, 55); assert.equal(s.intensity, 0); assert.equal(s.x, 100); assert.equal(s.y, 0); assert.equal(s.method, 'interleaved'); assert.equal(s.effect, 'none');
  for (const bad of [null, false, [], 'NaN', '', ' ', 'Infinity']) assert.equal(api.normalize({ opacity: bad }).opacity, 55);
  for (const bad of ['{', 'null', '[]', '{"version":2,"remember":true,"enabled":true}', '{"enabled":true}', 'x'.repeat(4097)]) assert.deepEqual(api.readSettings(storage(bad)), { ...api.DEFAULTS });
});
test('invalid stored opted-in colors and numeric values are sanitized before rendering', async () => {
  const e = setup({ storage: storage(JSON.stringify({ version: 1, remember: true, enabled: true, primary: 'url(evil)', secondary: '#102030', opacity: -1, width: 1000, height: 'x' })) }); await e.controller.ready(); checkLayout(e, 'interleaved'); assert.equal(live(e).style.opacity, '0'); assert.equal(e.controller.getSettings().width, 100); assert.equal(e.controller.getSettings().height, 24); close(e);
});
test('picker/hex fields synchronize independently; invalid hex is accessible and non-mutating', async () => {
  const e = await enabled(); change(e, 'primary', '#abc123', 'text'); assert.equal(control(e, 'primary', 'color').value, '#ABC123'); change(e, 'secondary', '#123456', 'color'); assert.equal(control(e, 'secondary', 'text').value, '#123456');
  change(e, 'primary', '#bad', 'text'); assert.equal(control(e, 'primary', 'text').getAttribute('aria-invalid'), 'true'); assert.match(e.doc.querySelector('[data-no-status]').textContent, /six-digit/); assert.equal(e.controller.getSettings().primary, '#ABC123'); change(e, 'primary', '#D6AD55', 'text'); assert.equal(control(e, 'primary', 'text').getAttribute('aria-invalid'), null); assert.equal(e.controller.getSettings().secondary, '#123456'); close(e);
});
test('all four real preset buttons change both chosen colors, not opt-in state', async () => {
  const e = setup(); await e.controller.ready(); for (const n of e.doc.querySelectorAll('[data-no-preset]')) { n.dispatch('click'); const expected = api.PRESETS[n.getAttribute('data-no-preset')]; assert.equal(e.controller.getSettings().primary, expected[0]); assert.equal(e.controller.getSettings().secondary, expected[1]); assert.equal(e.controller.getSettings().enabled, false); } close(e);
});
test('0 and 100 opacity controls produce true transparency and opacity with usable Hide', async () => {
  const e = await enabled(); change(e, 'effect', 'fire'); change(e, 'opacity', 0, 'range'); assert.equal(live(e).style.opacity, '0'); assert.equal(control(e, 'opacity', 'number').value, '0'); assert.equal(live(e).getAttribute('data-animate'), 'false'); assert.ok(visible(e.doc.getElementById('ajew-name-overlay-tools')));
  change(e, 'opacity', 100, 'number'); assert.equal(live(e).style.opacity, '1'); assert.equal(control(e, 'opacity', 'range').value, '100'); change(e, 'opacity', -99, 'number'); assert.equal(live(e).style.opacity, '0'); change(e, 'opacity', 999, 'number'); assert.equal(live(e).style.opacity, '1'); close(e);
});
test('screen percentage controls fit both bounds without stretch/crop at desktop/mobile and both methods', async () => {
  const e = await enabled(); for (const method of ['interleaved', 'nested']) for (const [vw, vh] of [[1280, 800], [390, 844], [320, 568]]) { change(e, 'method', method); e.win.innerWidth = vw; e.win.innerHeight = vh; change(e, 'width', 80); change(e, 'height', 30); e.win.dispatch('resize'); const g = e.controller.getGeometry(); assert.ok(g.width <= vw * .8 + 1e-8); assert.ok(g.height <= vh * .3 + 1e-8); assert.ok(Math.abs(g.width / g.height - glyphs.layouts[method].viewBox[2] / glyphs.layouts[method].viewBox[3]) < 1e-8); assert.equal(live(e).style.width, g.width + 'px'); } close(e);
});
test('all nine real anchors place the complete fitted artwork within viewport', async () => {
  const e = await enabled(); for (const [anchor, [x, y]] of Object.entries(api.ANCHORS)) { change(e, 'anchor', anchor); const g = e.controller.getGeometry(); assert.equal(g.left, (e.win.innerWidth - g.width) * x / 100); assert.equal(g.top, (e.win.innerHeight - g.height) * y / 100); assert.equal(control(e, 'x').value, String(x)); assert.equal(control(e, 'y').value, String(y)); } close(e);
});
test('explicit X/Y and width/height numeric controls clamp and select Custom', async () => {
  const e = await enabled(); change(e, 'x', 20); change(e, 'y', 75); assert.equal(control(e, 'anchor').value, 'custom'); let g = e.controller.getGeometry(); assert.equal(g.left, (e.win.innerWidth - g.width) * .2); assert.equal(g.top, (e.win.innerHeight - g.height) * .75); change(e, 'x', -1); change(e, 'y', 101); change(e, 'width', 0); change(e, 'height', 1000); assert.equal(e.controller.getSettings().x, 0); assert.equal(e.controller.getSettings().y, 100); assert.equal(e.controller.getSettings().width, 1); assert.equal(e.controller.getSettings().height, 100); close(e);
});
test('enable is page-local unless Remember is opted in, with persisted reload and exact settings', async () => {
  const e = await enabled(); assert.equal(e.store.values.size, 0); const noMemory = setup({ storage: e.store, panel: false }); assert.equal(noMemory.controller.getSettings().enabled, false); close(noMemory);
  change(e, 'method', 'nested'); change(e, 'secondary', '#556677', 'text'); change(e, 'remember', true); const saved = JSON.parse(e.store.getItem(api.STORAGE_KEY)); assert.equal(saved.enabled, true); assert.equal(saved.remember, true); const reload = setup({ storage: e.store, panel: false }); await reload.controller.ready(); assert.deepEqual(reload.controller.getSettings(), e.controller.getSettings()); checkLayout(reload, 'nested'); close(e); close(reload);
});
test('small live Hide and panel disable both persist off immediately; clear removes preferences', async () => {
  const e = await enabled(); change(e, 'remember', true); e.doc.getElementById('ajew-name-overlay-tools').querySelector('button').dispatch('click'); assert.ok(live(e).hidden); assert.equal(JSON.parse(e.store.getItem(api.STORAGE_KEY)).enabled, false); const reload = setup({ storage: e.store, panel: false }); assert.ok(live(reload).hidden); assert.equal(reload.calls.length, 0); close(reload);
  change(e, 'enabled', true); e.doc.querySelector('[data-no-action="hide"]').dispatch('click'); assert.ok(live(e).hidden); change(e, 'enabled', true); e.doc.querySelector('[data-no-action="clear"]').dispatch('click'); assert.equal(e.store.getItem(api.STORAGE_KEY), null); assert.deepEqual(e.controller.getSettings(), { ...api.DEFAULTS }); assert.ok(live(e).hidden); close(e);
});
test('unchecking Remember deletes saved state without changing the current enabled overlay', async () => {
  const e = await enabled(); change(e, 'remember', true); change(e, 'remember', false); assert.equal(e.store.getItem(api.STORAGE_KEY), null); assert.equal(e.controller.getSettings().enabled, true); close(e);
});
test('unavailable/throwing storage cannot prevent full initialization, Hide or Clear', async () => {
  const e = await enabled({ storage: { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); }, removeItem() { throw Error('denied'); } } }); change(e, 'remember', true); assert.match(e.doc.querySelector('[data-no-status]').textContent, /cannot save/); e.controller.hide(); assert.ok(live(e).hidden); e.controller.clear(); assert.equal(e.controller.getSettings().enabled, false); close(e);
});
test('click-through and accessibility: decorative SVG, no focusable art, reachable labeled controls', async () => {
  const e = await enabled(); assert.equal(live(e).style.pointerEvents, 'none'); assert.equal(live(e).getAttribute('aria-hidden'), 'true'); assert.equal(live(e).querySelector('svg').getAttribute('focusable'), 'false'); assert.equal(live(e).querySelectorAll('button').length, 0); assert.match(css, /#ajew-name-overlay \*[^}]+pointer-events: none !important/);
  const labels = e.doc.querySelectorAll('label'); for (const n of e.doc.querySelectorAll('[data-no-field]')) { assert.ok(visible(n)); const id = n.getAttribute('id'); assert.ok(labels.some(l => id && l.getAttribute('for') === id || l.children.includes(n)), 'label for ' + n.getAttribute('data-no-field')); } assert.equal(e.doc.querySelector('form').dispatch('submit').defaultPrevented, true); close(e);
});
test('fire is animated glyph-clipped flame geometry, secondary colors remain independently intact', async () => {
  const e = await enabled(); change(e, 'secondary', '#315579', 'text'); change(e, 'effect', 'fire'); const effect = live(e).querySelector('.no-effect'); assert.match(effect.getAttribute('clip-path'), /^url\(#ajew-name-\d+-primary\)$/); assert.equal(effect.querySelectorAll('.no-flame').length, 16); const cp = live(e).querySelector('clipPath'); assert.equal(cp.children.length, 4); cp.children.forEach((p, i) => assert.equal(p.getAttribute('d'), glyphs.glyphs[glyphs.layouts.interleaved.glyphs.filter(g => g.role === 'primary')[i].letter].path)); assert.equal(live(e).getAttribute('data-animate'), 'true'); assert.match(css, /@keyframes no-burn[\s\S]+translateY\(-30%\)/); assert.ok(new Set(effect.querySelectorAll('.no-flame').map(n => n.style.animationDelay)).size > 1); base(e).children.filter(n => n.getAttribute('data-role') === 'secondary').forEach(n => assert.equal(n.getAttribute('fill'), '#315579')); close(e);
});
test('glow and shimmer use gentle bounded primary-only paint; none removes effect geometry', async () => {
  const e = await enabled(); change(e, 'effect', 'glow'); assert.equal(live(e).querySelectorAll('.no-halo').length, 4); assert.equal(live(e).querySelector('.no-effect').getAttribute('clip-path'), null); assert.equal(Number(live(e).querySelector('feGaussianBlur').getAttribute('stdDeviation')), glyphs.layouts.interleaved.viewBox[2] * .005); assert.ok(live(e).querySelector('.no-effect').getAttribute('filter')); change(e, 'effect', 'shimmer'); assert.equal(live(e).querySelectorAll('.no-sweep').length, 1); assert.ok(live(e).querySelector('.no-effect').getAttribute('clip-path')); assert.match(css, /no-shimmer 9s/); change(e, 'effect', 'none'); assert.equal(live(e).querySelector('.no-effect').children.length, 0); assert.equal(live(e).getAttribute('data-animate'), 'false'); close(e);
});
test('intensity zero and motion off pause; hidden, pagehide, disabled and reduced-motion never animate', async () => {
  const e = await enabled(); change(e, 'effect', 'fire'); change(e, 'intensity', 0, 'range'); assert.equal(live(e).getAttribute('data-animate'), 'false'); assert.equal(live(e).style['--no-intensity'], '0'); change(e, 'intensity', 100, 'number'); assert.equal(control(e, 'intensity', 'range').value, '100'); change(e, 'motion', false); assert.equal(live(e).getAttribute('data-animate'), 'false'); change(e, 'motion', true); assert.equal(live(e).getAttribute('data-animate'), 'true'); e.doc.hidden = true; e.doc.dispatch('visibilitychange'); assert.equal(live(e).getAttribute('data-animate'), 'false'); e.doc.hidden = false; e.doc.dispatch('visibilitychange'); assert.equal(live(e).getAttribute('data-animate'), 'true'); e.win.dispatch('pagehide'); assert.equal(live(e).getAttribute('data-animate'), 'false'); e.win.dispatch('pageshow'); assert.equal(live(e).getAttribute('data-animate'), 'true'); e.media.matches = true; e.media.dispatch('change'); assert.equal(live(e).getAttribute('data-animate'), 'false'); assert.match(e.doc.querySelector('[data-no-motion-status]').textContent, /remain still/); assert.equal(e.controller.getSettings().motion, true); e.controller.hide(); assert.equal(live(e).getAttribute('data-animate'), 'false'); assert.match(css, /prefers-reduced-motion: reduce[^}]+animation: none !important/); close(e);
});
test('reduced-motion from first init renders intact static glyphs for both layouts and all effects', async () => {
  const e = await enabled({ reduced: true }); for (const method of ['interleaved', 'nested']) for (const effect of ['none', 'fire', 'glow', 'shimmer']) { change(e, 'method', method); change(e, 'effect', effect); checkLayout(e, method); assert.equal(live(e).getAttribute('data-animate'), 'false'); assert.ok(!live(e).hidden); } close(e);
});
test('preview and live SVG have zero duplicate IDs and every paint/clip reference belongs to its root', async () => {
  const e = await enabled(); for (const method of ['interleaved', 'nested']) for (const effect of ['none', 'fire', 'glow', 'shimmer']) { change(e, 'method', method); change(e, 'effect', effect); const ids = e.doc.querySelectorAll('[id]').map(n => n.getAttribute('id')); assert.equal(ids.length, new Set(ids).size); for (const svg of e.doc.querySelectorAll('svg')) { const owned = new Set(svg.querySelectorAll('[id]').map(n => n.getAttribute('id'))); for (const n of svg.querySelectorAll('path').concat(svg.querySelectorAll('rect'), svg.querySelectorAll('g'))) for (const value of Object.values(n.attributes)) { const ref = value.match(/^url\(#(.+)\)$/); if (ref) assert.ok(owned.has(ref[1])); } } } close(e);
});
test('late glyph response cannot re-enable after Hide/Clear, and failed asset stays hidden with recovery', async () => {
  let resolve; const e = setup({ panel: false, fetch: () => new Promise(r => { resolve = r; }) }); e.controller.update({ enabled: true, remember: true }); e.controller.clear(); resolve({ ok: true, json: async () => glyphs }); await e.controller.ready(); assert.ok(live(e).hidden); assert.equal(e.store.getItem(api.STORAGE_KEY), null); close(e);
  let attempts = 0; const failed = setup({ fetch: async () => { attempts++; return attempts === 1 ? { ok: false } : { ok: true, json: async () => glyphs }; } }); await failed.controller.ready(); assert.match(failed.doc.querySelector('[data-no-status]').textContent, /could not load/); assert.ok(live(failed).hidden); change(failed, 'enabled', true); await failed.controller.ready(); assert.ok(!live(failed).hidden); checkLayout(failed, 'interleaved'); close(failed);
});
test('malformed glyph asset fails closed and never falls back to font text', async () => {
  const bad = JSON.parse(JSON.stringify(glyphs)); bad.layouts.interleaved.glyphs[0].role = 'secondary'; const e = await enabled({ fetch: async () => ({ ok: true, json: async () => bad }) }); assert.ok(live(e).hidden); assert.equal(live(e).children.length, 0); assert.equal(live(e).querySelector('text'), null); assert.match(e.doc.querySelector('[data-no-status]').textContent, /could not load/); close(e);
});
test('storage events synchronize enable, cross-page Hide and clear; detached snapshot cannot mutate state', async () => {
  const store = storage(JSON.stringify({ ...api.DEFAULTS, remember: true, enabled: true })); const e = setup({ storage: store }); await e.controller.ready(); const s = e.controller.getSettings(); s.primary = '#FFFFFF'; assert.equal(e.controller.getSettings().primary, '#87CEEB'); store.setItem(api.STORAGE_KEY, JSON.stringify({ ...api.DEFAULTS, remember: true, enabled: false })); e.win.dispatch('storage', { key: api.STORAGE_KEY }); assert.ok(live(e).hidden); store.removeItem(api.STORAGE_KEY); e.win.dispatch('storage', { key: null }); assert.deepEqual(e.controller.getSettings(), { ...api.DEFAULTS }); close(e);
});
test('auto-start path, repeated script injection, initializer and Astro page event do not duplicate roots/listeners', async () => {
  const e = setup({ auto: true }); const context = vm.createContext({ window: e.win, globalThis: e.win }); vm.runInContext(source, context); const autoApi = e.win.AjewNameOverlay; e.controller = autoApi.initialize({ document: e.doc, window: e.win }); await e.controller.ready(); vm.runInContext(source, context); e.doc.dispatch('astro:page-load'); assert.equal(e.doc.querySelectorAll('#ajew-name-overlay').length, 1); assert.equal(e.doc.querySelectorAll('#ajew-name-overlay-tools').length, 1); assert.equal(control(e, 'enabled').events.get('change').length, 1); assert.equal(e.calls.length, 1); close(e); assert.equal(e.doc.querySelectorAll('#ajew-name-overlay').length, 0); assert.equal((e.win.events.get('resize') || []).length, 0);
});
test('loading-document auto start waits for DOMContentLoaded; destruction cancels late DOM writes', async () => {
  const e = setup({ auto: true, panel: false }); e.doc.readyState = 'loading'; const context = vm.createContext({ window: e.win }); vm.runInContext(source, context); assert.equal(e.doc.querySelectorAll('#ajew-name-overlay').length, 0); e.doc.dispatch('DOMContentLoaded'); e.controller = e.win.AjewNameOverlay.initialize({ document: e.doc, window: e.win }); assert.equal(e.doc.querySelectorAll('#ajew-name-overlay').length, 1); close(e);
  let resolve; const late = setup({ panel: false, fetch: () => new Promise(r => { resolve = r; }) }); late.controller.update({ enabled: true }); const pending = late.controller.ready(); close(late); resolve({ ok: true, json: async () => glyphs }); await pending; assert.equal(late.doc.querySelectorAll('#ajew-name-overlay').length, 0);
});
test('clear restores valid default hex controls after a rejected edit', async () => {
  const e = await enabled(); change(e, 'primary', '#x', 'text'); assert.equal(control(e, 'primary', 'text').getAttribute('aria-invalid'), 'true'); e.controller.clear(); assert.equal(control(e, 'primary', 'text').getAttribute('aria-invalid'), null); assert.equal(control(e, 'primary', 'text').value, '#87CEEB'); assert.equal(control(e, 'secondary', 'text').value, '#000000'); close(e);
});
test('external persisted method/color changes update static preview even while disabled', async () => {
  const e = setup(); await e.controller.ready(); e.store.setItem(api.STORAGE_KEY, JSON.stringify({ ...api.DEFAULTS, method: 'nested', primary: '#123456', remember: true, enabled: false })); e.win.dispatch('storage', { key: api.STORAGE_KEY }); const preview = e.doc.querySelector('[data-no-preview]'); assert.equal(preview.querySelector('svg').getAttribute('viewBox'), glyphs.layouts.nested.viewBox.join(' ')); assert.equal(preview.querySelector('.no-base').children[0].getAttribute('fill'), '#123456'); assert.ok(live(e).hidden); close(e);
});
test('pinned real pointed-footer asset preserves source codepoints, shaping ink and unchanged STAM Name', () => {
  assert.equal(crypto.createHash('sha256').update(assetBytes).digest('hex'), 'dda32fd38db6eff5967b370b2ed4b3460f782d83d26480a661d202d7d6e6cee5');
  assert.equal(glyphs.footer.text, EXACT_FOOTER); assert.equal(api.FOOTER_TEXT, EXACT_FOOTER);
  assert.equal(api.ASSET_URL, '/name-overlay/glyphs-footer-small-v3.json?v=20261014-3');
  assert.equal(glyphs.footer.text.split(' ').at(-1), '\u05de\u05d0\u05d5\u05de\u05df');
  assert.equal([...EXACT_FOOTER].filter(c => /[\u05b0-\u05bc]/.test(c)).length, 9);
  assert.deepEqual(glyphs.glyphs, originalGlyphs.glyphs);
  assert.deepEqual(glyphs.footer.glyphs.map(g => [g.glyphId, g.clusterUtf8]), EXPECTED_SHAPE);
  assert.equal(glyphs.footer.glyphs.filter(g => g.bounds[3] < 0).length, 9, 'all marks have actual below-baseline ink');
  for (const method of ['interleaved', 'nested']) assert.deepEqual(glyphs.layouts[method].glyphs, originalGlyphs.layouts[method].glyphs);
});
test('both layouts render all exact footer ink in the preview and enabled artwork', async () => {
  const e = await enabled();
  for (const method of ['interleaved', 'nested']) { change(e, 'method', method); checkLayout(e, method); checkFooter(e.doc.querySelector('[data-no-preview]'), method, e.controller.getSettings()); }
  assert.ok(page.includes(EXACT_FOOTER)); assert.match(page, /Keter YG/); assert.match(page, /primary Name.*Stam Ashkenaz CLM/); assert.match(page, /footer.*GPLv2.*embedding exception/);
  close(e);
});
test('footer fits centered below the entire Name, including all marks, within both complete viewBoxes', async () => {
  const e = await enabled();
  for (const method of ['interleaved', 'nested']) {
    change(e, 'method', method); const l = glyphs.layouts[method], [x,y,w,h] = l.viewBox;
    const nameInk = unionBounds(l.glyphs.map(g => transformedBounds(g, glyphs.glyphs[g.letter])));
    const footerInk = unionBounds(l.footerGlyphs.map(g => transformedBounds(g)));
    footerInk.forEach((v,i) => assert.ok(Math.abs(v - l.footerInkBounds[i]) < 1e-7));
    assert.ok(footerInk[1] > nameInk[3], 'all footer ink below all Name ink');
    assert.ok(Math.abs((footerInk[0] + footerInk[2]) / 2 - (x+w/2)) < 1e-7);
    for (const b of l.glyphs.map(g => transformedBounds(g, glyphs.glyphs[g.letter])).concat(l.footerGlyphs.map(g => transformedBounds(g)))) {
      assert.ok(b[0]>=x && b[1]>=y && b[2]<=x+w && b[3]<=y+h, 'complete ink enclosed');
    }
    for (const [vw,vh] of [[1280,800],[390,844],[320,568]]) for (const anchor of Object.keys(api.ANCHORS)) {
      e.win.innerWidth=vw; e.win.innerHeight=vh; change(e, 'anchor', anchor); const fit=e.controller.getGeometry(), scale=fit.width/w;
      for (const g of l.footerGlyphs) { const b=transformedBounds(g); assert.ok(fit.left+(b[0]-x)*scale>=-1e-7); assert.ok(fit.top+(b[1]-y)*scale>=-1e-7); assert.ok(fit.left+(b[2]-x)*scale<=vw+1e-7); assert.ok(fit.top+(b[3]-y)*scale<=vh+1e-7); }
    }
  } close(e);
});
test('much-smaller footer including all niqqud is exactly 20% of primary Name ink height without width stretch', async () => {
  const oldFooter = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/name-overlay-footer-pre-small.json'), 'utf8'));
  assert.deepEqual(glyphs.footer, oldFooter.footer, 'all source paths, marks and exact text conserved');
  const e=await enabled();
  for (const method of ['interleaved','nested']) {
    change(e,'method',method); const l=glyphs.layouts[method]; assert.equal(l.footerSizeRatio,.20);
    const primary=unionBounds(l.glyphs.filter(g=>g.role==='primary').map(g=>transformedBounds(g,glyphs.glyphs[g.letter])));
    const footer=unionBounds(l.footerGlyphs.map(g=>transformedBounds(g)));
    assert.ok(Math.abs((footer[3]-footer[1])/(primary[3]-primary[1])-.20)<1e-10);
    assert.ok(footer[2]-footer[0]<=l.viewBox[2]*.90, 'width capped, never scaled up to fill Name width');
    for (const target of [live(e),e.doc.querySelector('[data-no-preview]')]) {
      checkFooter(target,method,e.controller.getSettings());
      // Derive bounds from the ACTUAL rendered transform, not just the JSON rectangle.
      const actual=target.querySelector('.no-footer').children.map((p,i)=>{
        const values=p.getAttribute('transform').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
        const [x,negativeY,scale,negativeScale]=values; assert.equal(negativeScale,-scale,'uniform aspect-preserving scale');
        return transformedBounds({x,y:-negativeY,scale},l.footerGlyphs[i]);
      });
      const ink=unionBounds(actual); assert.ok(Math.abs((ink[3]-ink[1])/(primary[3]-primary[1])-.20)<1e-10);
    }
    for (const [vw,vh] of [[1280,800],[390,844]]) for (const size of [10,48,100]) {
      e.win.innerWidth=vw; e.win.innerHeight=vh; change(e,'width',size); change(e,'height',size); const g=e.controller.getGeometry(),s=g.width/l.viewBox[2];
      assert.ok(Math.abs(((footer[3]-footer[1])*s)/((primary[3]-primary[1])*s)-.20)<1e-10,'responsive size does not enlarge footer independently');
    }
  } close(e);
});
test('footer picker and validated hex are independent from both Name colors and presets', async () => {
  const e=await enabled(); assert.equal(e.controller.getSettings().footer, '#000000');
  change(e,'footer','#a1b2c3','text'); assert.equal(control(e,'footer','color').value,'#A1B2C3');
  assert.equal(e.controller.getSettings().primary,'#87CEEB'); assert.equal(e.controller.getSettings().secondary,'#000000');
  change(e,'footer','#123','text'); assert.equal(control(e,'footer','text').getAttribute('aria-invalid'),'true'); assert.equal(e.controller.getSettings().footer,'#A1B2C3');
  change(e,'footer','#102030','color'); assert.equal(control(e,'footer','text').value,'#102030');
  for (const p of e.doc.querySelectorAll('[data-no-preset]')) { p.dispatch('click'); assert.equal(e.controller.getSettings().footer,'#102030'); }
  checkFooter(live(e),'interleaved',e.controller.getSettings()); checkFooter(e.doc.querySelector('[data-no-preview]'),'interleaved',e.controller.getSettings());
  assert.equal(api.normalize({footer:'url(evil)'}).footer,'#000000'); assert.equal(api.normalize({footer:'#abcdef'}).footer,'#ABCDEF');
  close(e);
});
test('primary-only effects retain original Name effect bounds and never paint footer or secondary', async () => {
  const e=await enabled(); change(e,'footer','#345678','text'); change(e,'secondary','#123456','text');
  for (const method of ['interleaved','nested']) for (const effect of ['none','fire','glow','shimmer']) {
    change(e,'method',method); change(e,'effect',effect); checkLayout(e,method);
    const fx=live(e).querySelector('.no-effect'), [x,y,w,h]=originalGlyphs.layouts[method].viewBox;
    assert.equal(fx.querySelectorAll('[data-role="footer"]').length,0);
    assert.equal(live(e).querySelector('clipPath').children.length,4);
    base(e).children.filter(n=>n.getAttribute('data-role')==='secondary').forEach(n=>assert.equal(n.getAttribute('fill'),'#123456'));
    if (effect==='fire') { const rect=fx.querySelector('rect'); assert.equal(Number(rect.getAttribute('height')),h); assert.equal(Number(rect.getAttribute('y')),y); }
    if (effect==='shimmer') assert.equal(Number(fx.querySelector('rect').getAttribute('height')),h);
    if (effect==='glow') assert.equal(Number(live(e).querySelector('filter').getAttribute('height')),h*1.24);
    assert.equal(live(e).querySelector('.no-footer').style.opacity,undefined,'opacity inherited with all artwork');
  } close(e);
});
test('footer color reloads and synchronizes across pages; Hide and Clear affect the entire artwork', async () => {
  const e=await enabled(); change(e,'footer','#456789','text'); change(e,'method','nested'); change(e,'remember',true);
  const reload=setup({storage:e.store,panel:false}); await reload.controller.ready(); checkLayout(reload,'nested'); assert.equal(reload.controller.getSettings().footer,'#456789');
  e.controller.hide(); reload.win.dispatch('storage',{key:api.STORAGE_KEY}); assert.ok(live(reload).hidden); assert.equal(live(reload).getAttribute('data-animate'),'false');
  e.controller.clear(); assert.equal(control(e,'footer','text').value,'#000000'); checkFooter(e.doc.querySelector('[data-no-preview]'),'interleaved',e.controller.getSettings()); assert.ok(live(e).hidden); assert.equal(live(e).children.length,0);
  close(e); close(reload);
});
test('old saved settings acquire black footer without losing prior preferences', async () => {
  const s={...api.DEFAULTS,remember:true,enabled:true,secondary:'#123456',effect:'fire'}; delete s.footer;
  const e=setup({storage:storage(JSON.stringify(s))}); await e.controller.ready(); assert.equal(e.controller.getSettings().footer,'#000000'); assert.equal(e.controller.getSettings().secondary,'#123456'); assert.equal(e.controller.getSettings().effect,'fire'); checkLayout(e,'interleaved'); close(e);
});
test('source validation rejects altered/repointed footer, missing ink, unsafe paths and malformed metadata', async () => {
  const mutations=[d=>{d.footer.text+=' ';},d=>{d.footer.text=d.footer.text.replace('\u05de\u05d0\u05d5\u05de\u05df','\u05de\u05b5\u05d0\u05d5\u05de\u05df');},d=>{delete d.footer;},d=>{d.footer.glyphs.pop();},d=>{d.footer.glyphs[6].path='';},d=>{d.footer.glyphs[6].path='<script>';},d=>{d.footer.glyphs[0].glyphId=0;},d=>{d.footer.glyphs[0].clusterUtf8=51;},d=>{d.footer.glyphs[0].bounds=[0,0,0,0];},d=>{d.layouts.nested.footerGlyphs.reverse();},d=>{d.layouts.nested.footerGlyphs.pop();},d=>{d.layouts.interleaved.footerGlyphs[6].path='';},d=>{d.layouts.nested.footerGlyphs[0].scale=-1;},d=>{d.layouts.nested.footerGlyphs[0].x=Infinity;},d=>{d.layouts.nested.footerGlyphs[0].y=5000;},d=>{d.layouts.interleaved.viewBox[3]=1740;},d=>{d.layouts.interleaved.footerSizeRatio=.30;},d=>{d.layouts.nested=structuredClone(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/name-overlay-footer-pre-small.json'),'utf8')).layouts.nested); d.layouts.nested.footerSizeRatio=.20;}];
  for (const mutate of mutations) {
    const bad=structuredClone(glyphs); mutate(bad); assert.throws(()=>api.validGlyphs(bad));
    const e=await enabled({fetch:async()=>({ok:true,json:async()=>bad})}); assert.ok(live(e).hidden); assert.equal(live(e).children.length,0); assert.equal(e.doc.querySelector('[data-no-preview]').children.length,0); assert.match(e.doc.querySelector('[data-no-status]').textContent,/could not load/); close(e);
  }
  assert.equal(api.validGlyphs(glyphs),glyphs,'fresh positive after negatives');
});
test('footer request late after Hide cannot expose artwork and still gives a complete static preview', async () => {
  let resolve; const e=setup({fetch:()=>new Promise(r=>{resolve=r;})}); change(e,'enabled',true); e.controller.hide(); resolve({ok:true,json:async()=>glyphs}); await e.controller.ready(); assert.ok(live(e).hidden); assert.equal(live(e).children.length,0); checkFooter(e.doc.querySelector('[data-no-preview]'),'interleaved',e.controller.getSettings()); close(e);
});
test('page retains exact download route, scope/privacy notes, source distinction and no full Name quote', () => {
  assert.match(page, /import Layout from '\.\.\/layouts\/Layout\.astro'/); assert.ok(page.includes('/downloads/name-overlay/Ajew-Name-Overlay-Windows.zip')); assert.ok(page.includes('/reader/shivchay-haran/1/2/')); assert.match(page, /not a source claim for either combined arrangement/); assert.match(page, /website overlay stays inside ajew\.org in your browser/); assert.match(page, /No analytics, account or uploads/); assert.ok(!page.includes(glyphs.primary)); assert.ok(!page.includes(glyphs.interleaved)); assert.ok(!/name-overlay\.(?:js|css)\?/.test(page), 'Layout owns the assets without duplicate page loads');
});
