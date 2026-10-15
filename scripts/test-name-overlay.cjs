#!/usr/bin/env node
'use strict';
// Dependency-free full initialization harness. Uses the real page controls and real glyph JSON.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
// Optional historical-source/asset overrides for paired RED/GREEN; expected pins stay fixed.
const implementationRoot = process.env.NAME_OVERLAY_ORIGINAL_DIR || root;
const source = fs.readFileSync(path.join(implementationRoot, 'public/name-overlay.js'), 'utf8');
const css = fs.readFileSync(path.join(implementationRoot, 'public/name-overlay.css'), 'utf8');
const page = fs.readFileSync(path.join(implementationRoot, 'src/pages/name-overlay.astro'), 'utf8');
const layoutSource = fs.readFileSync(path.join(implementationRoot, 'src/layouts/Layout.astro'), 'utf8');
const crypto = require('node:crypto');
const assetBytes = fs.readFileSync(process.env.NAME_OVERLAY_ASSET_FILE || path.join(root, 'public/name-overlay/glyphs-footer-v4.json'));
const glyphs = JSON.parse(assetBytes.toString('utf8'));
const priorAssetBytes = fs.readFileSync(path.join(root, 'public/name-overlay/glyphs-footer-small-v3.json'));
const priorFooterGlyphs = JSON.parse(priorAssetBytes.toString('utf8'));
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
function actualBounds(p, outline) {
  const values = p.getAttribute('transform').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
  assert.equal(values.length, 4, 'only translate + uniform scale; no outline rewriting');
  const [x, negativeY, scale, negativeScale] = values;
  assert.equal(negativeScale, -scale);
  return transformedBounds({ x, y: -negativeY, scale }, outline);
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
  paths.forEach((p, i) => { const g = layout.glyphs[i]; assert.equal(p.getAttribute('data-letter'), g.letter); assert.equal(p.getAttribute('data-role'), g.role); assert.equal(p.getAttribute('d'), glyphs.glyphs[g.letter].path); if (g.role === 'primary') assert.equal(p.getAttribute('transform'), `translate(${g.x},${-g.y}) scale(${g.scale},${-g.scale})`); else assert.ok(actualBounds(p, glyphs.glyphs[g.letter]).every(Number.isFinite)); assert.equal(p.getAttribute('fill'), e.controller.getSettings()[g.role]); });
}
test('off-by-default ordinary page has no visible overlay/control and makes no request', () => {
  const e = setup({ panel: false }); assert.deepEqual(e.controller.getSettings(), { ...api.DEFAULTS }); assert.ok(live(e).hidden); assert.ok(e.doc.getElementById('ajew-name-overlay-tools').hidden); assert.equal(e.calls.length, 0); close(e);
});
test('settings page loads exact static preview without enabling or persisting', async () => {
  const e = setup(); await e.controller.ready(); assert.equal(e.calls.length, 1); assert.equal(e.calls[0][0], api.ASSET_URL); assert.deepEqual(e.calls[0][1], { credentials: 'omit', cache: 'force-cache' }); assert.ok(e.doc.querySelector('[data-no-preview]').querySelector('svg')); assert.ok(live(e).hidden); assert.equal(e.store.values.size, 0); assert.equal(e.doc.querySelector('[data-no-preview]').getAttribute('data-animate'), 'false'); close(e);
});
test('interleaved full-init uses exact logical order, alternating roles, paths, colors and transforms', async () => { const e = await enabled(); checkLayout(e, 'interleaved'); assert.equal(base(e).children.map(n => n.getAttribute('data-letter')).join(''), glyphs.interleaved); close(e); });
test('nested full-init preserves exact inset in the final leftmost primary letter', async () => {
  const e = await enabled(); change(e, 'method', 'nested'); checkLayout(e, 'nested'); const l = glyphs.layouts.nested; assert.equal(l.glyphs[3].x, Math.min(...l.glyphs.filter(g => g.role === 'primary').map(g => g.x))); assert.ok(l.glyphs.slice(4).every(g => g.scale === l.secondary_inset_in_final_he.scale)); close(e);
});
test('pure normalization rejects invalid colors/storage types and clamps all numeric fields', () => {
  const s = api.normalize({ primary: 'red', secondary: '#ab12EF', enabled: 'true', remember: 1, motion: 'yes', method: 'bad', effect: 'strobe', width: -20, height: 500, opacity: Infinity, intensity: -1, anchor: 'custom', x: 120, y: -10 });
  assert.equal(s.primary, '#87CEEB'); assert.equal(s.secondary, '#AB12EF'); assert.equal(s.enabled, false); assert.equal(s.remember, true); assert.equal(s.motion, true); assert.equal(s.width, 1); assert.equal(s.height, 100); assert.equal(s.opacity, 55); assert.equal(s.intensity, 0); assert.equal(s.x, 100); assert.equal(s.y, 0); assert.equal(s.method, 'interleaved'); assert.equal(s.effect, 'none');
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
test('explicit enable automatically persists across navigation and reload with exact settings', async () => {
  const e = await enabled(); assert.equal(e.store.values.size, 1); const nextPage = setup({ storage: e.store, panel: false }); await nextPage.controller.ready(); assert.equal(nextPage.controller.getSettings().enabled, true); close(nextPage);
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
  const e = await enabled(); change(e, 'effect', 'glow'); assert.equal(live(e).querySelectorAll('.no-halo').length, 4); assert.equal(live(e).querySelector('.no-effect').getAttribute('clip-path'), null); assert.equal(Number(live(e).querySelector('feGaussianBlur').getAttribute('stdDeviation')), glyphs.layouts.interleaved.viewBox[2] * .008); assert.ok(live(e).querySelector('.no-effect').getAttribute('filter')); change(e, 'effect', 'shimmer'); assert.equal(live(e).querySelectorAll('.no-sweep').length, 1); assert.ok(live(e).querySelector('.no-effect').getAttribute('clip-path')); assert.match(css, /no-shimmer 3.2s/); change(e, 'effect', 'none'); assert.equal(live(e).querySelector('.no-effect').children.length, 0); assert.equal(live(e).getAttribute('data-animate'), 'false'); close(e);
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
  assert.equal(crypto.createHash('sha256').update(assetBytes).digest('hex'), '2c7f5408765aa6671784d85fc5eb83715f7710f8804091fffef9ef58ad6d16af');
  assert.equal(glyphs.footer.text, EXACT_FOOTER); assert.equal(api.FOOTER_TEXT, EXACT_FOOTER);
  assert.equal(api.ASSET_URL, '/name-overlay/glyphs-footer-v4.json?v=20261015-2');
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
test('much-smaller footer including all niqqud is exactly 25% of primary Name ink height without width stretch', async () => {
  const oldFooter = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/name-overlay-footer-pre-small.json'), 'utf8'));
  assert.deepEqual(glyphs.footer, oldFooter.footer, 'all source paths, marks and exact text conserved');
  const e=await enabled();
  for (const method of ['interleaved','nested']) {
    change(e,'method',method); const l=glyphs.layouts[method]; assert.equal(l.footerSizeRatio,.25);
    const primary=unionBounds(l.glyphs.filter(g=>g.role==='primary').map(g=>transformedBounds(g,glyphs.glyphs[g.letter])));
    const footer=unionBounds(l.footerGlyphs.map(g=>transformedBounds(g)));
    assert.ok(Math.abs((footer[3]-footer[1])/(primary[3]-primary[1])-.25)<1e-10);
    assert.ok(footer[2]-footer[0]<=l.viewBox[2]*.90, 'width capped, never scaled up to fill Name width');
    for (const target of [live(e),e.doc.querySelector('[data-no-preview]')]) {
      checkFooter(target,method,e.controller.getSettings());
      // Derive bounds from the ACTUAL rendered transform, not just the JSON rectangle.
      const actual=target.querySelector('.no-footer').children.map((p,i)=>{
        const values=p.getAttribute('transform').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
        const [x,negativeY,scale,negativeScale]=values; assert.equal(negativeScale,-scale,'uniform aspect-preserving scale');
        return transformedBounds({x,y:-negativeY,scale},l.footerGlyphs[i]);
      });
      const ink=unionBounds(actual); assert.ok(Math.abs((ink[3]-ink[1])/(primary[3]-primary[1])-.25)<1e-10);
    }
    for (const [vw,vh] of [[1280,800],[390,844]]) for (const size of [10,48,100]) {
      e.win.innerWidth=vw; e.win.innerHeight=vh; change(e,'width',size); change(e,'height',size); const g=e.controller.getGeometry(),s=g.width/l.viewBox[2];
      assert.ok(Math.abs(((footer[3]-footer[1])*s)/((primary[3]-primary[1])*s)-.25)<1e-10,'responsive size does not enlarge footer independently');
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
  const mutations=[d=>{d.footer.text+=' ';},d=>{d.footer.text=d.footer.text.replace('\u05de\u05d0\u05d5\u05de\u05df','\u05de\u05b5\u05d0\u05d5\u05de\u05df');},d=>{delete d.footer;},d=>{d.footer.glyphs.pop();},d=>{d.footer.glyphs[6].path='';},d=>{d.footer.glyphs[6].path='<script>';},d=>{d.footer.glyphs[0].glyphId=0;},d=>{d.footer.glyphs[0].clusterUtf8=51;},d=>{d.footer.glyphs[0].bounds=[0,0,0,0];},d=>{d.layouts.nested.footerGlyphs.reverse();},d=>{d.layouts.nested.footerGlyphs.pop();},d=>{d.layouts.interleaved.footerGlyphs[6].path='';},d=>{d.layouts.nested.footerGlyphs[0].scale=-1;},d=>{d.layouts.nested.footerGlyphs[0].x=Infinity;},d=>{d.layouts.nested.footerGlyphs[0].y=5000;},d=>{d.layouts.interleaved.viewBox[3]=1740;},d=>{d.layouts.interleaved.footerSizeRatio=.30;},d=>{d.layouts.nested=structuredClone(JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/name-overlay-footer-pre-small.json'),'utf8')).layouts.nested); d.layouts.nested.footerSizeRatio=.25;}];
  for (const mutate of mutations) {
    const bad=structuredClone(glyphs); mutate(bad); assert.throws(()=>api.validGlyphs(bad));
    const e=await enabled({fetch:async()=>({ok:true,json:async()=>bad})}); assert.ok(live(e).hidden); assert.equal(live(e).children.length,0); assert.equal(e.doc.querySelector('[data-no-preview]').children.length,0); assert.match(e.doc.querySelector('[data-no-status]').textContent,/could not load/); close(e);
  }
  assert.equal(api.validGlyphs(glyphs),glyphs,'fresh positive after negatives');
});
test('footer request late after Hide cannot expose artwork and still gives a complete static preview', async () => {
  let resolve; const e=setup({fetch:()=>new Promise(r=>{resolve=r;})}); change(e,'enabled',true); e.controller.hide(); resolve({ok:true,json:async()=>glyphs}); await e.controller.ready(); assert.ok(live(e).hidden); assert.equal(live(e).children.length,0); checkFooter(e.doc.querySelector('[data-no-preview]'),'interleaved',e.controller.getSettings()); close(e);
});
test('independent secondary size uses actual labeled range/number inputs and clamps 10–50%', async () => {
  const e = await enabled();
  assert.equal(e.controller.getSettings().secondarySize, 25);
  change(e, 'secondarySize', 10, 'range'); assert.equal(control(e, 'secondarySize', 'number').value, '10');
  change(e, 'secondarySize', 50, 'number'); assert.equal(control(e, 'secondarySize', 'range').value, '50');
  change(e, 'secondarySize', -1, 'number'); assert.equal(e.controller.getSettings().secondarySize, 10);
  change(e, 'secondarySize', 999, 'number'); assert.equal(e.controller.getSettings().secondarySize, 50);
  for (const invalid of [null, '', ' ', [], Infinity, 'NaN']) assert.equal(api.normalize({ secondarySize: invalid }).secondarySize, 25);
  for (const type of ['range', 'number']) { const c = control(e, 'secondarySize', type); assert.equal(c.getAttribute('min'), '10'); assert.equal(c.getAttribute('max'), '50'); assert.ok(e.doc.querySelectorAll('label').some(l => l.getAttribute('for') === c.getAttribute('id'))); }
  close(e);
});
test('actual secondary ink fits centered original slots/inset at every size while primary/footer and source stay fixed', async () => {
  const before = JSON.stringify(glyphs), e = await enabled();
  for (const method of ['interleaved', 'nested']) {
    change(e, 'method', method); const l = glyphs.layouts[method];
    const originalSecondary = l.glyphs.filter(g => g.role === 'secondary').map(g => transformedBounds(g, glyphs.glyphs[g.letter]));
    const inset = unionBounds(originalSecondary);
    const primary = unionBounds(l.glyphs.filter(g => g.role === 'primary').map(g => transformedBounds(g, glyphs.glyphs[g.letter])));
    for (const size of [10, 25, 50]) {
      change(e, 'secondarySize', size, 'range'); checkLayout(e, method);
      for (const target of [live(e), e.doc.querySelector('[data-no-preview]')]) {
        const paths = target.querySelector('.no-base').children;
        const secondary = paths.filter(p => p.getAttribute('data-role') === 'secondary').map(p => actualBounds(p, glyphs.glyphs[p.getAttribute('data-letter')]));
        const pairs = method === 'nested' ? [[unionBounds(secondary), inset]] : secondary.map((b, i) => [b, originalSecondary[i]]);
        for (const [b, slot] of pairs) {
          assert.ok(b[0] >= slot[0]-1e-7 && b[1] >= slot[1]-1e-7 && b[2] <= slot[2]+1e-7 && b[3] <= slot[3]+1e-7, 'conserved slot/inset bounds');
          for (const axis of [0, 1]) assert.ok(Math.abs(b[axis]+b[axis+2]-slot[axis]-slot[axis+2]) < 1e-7, 'ink centered');
          assert.ok(Math.abs((b[3]-b[1])-Math.min((primary[3]-primary[1])*size/100,slot[3]-slot[1])) < 1e-7, 'primary-relative height, capped only by original inset');
        }
        checkFooter(target, method, e.controller.getSettings());
        for (const b of paths.map(p => actualBounds(p, glyphs.glyphs[p.getAttribute('data-letter')])).concat(l.footerGlyphs.map(g => transformedBounds(g)))) {
          const [x,y,w,h] = l.viewBox; assert.ok(b[0]>=x && b[1]>=y && b[2]<=x+w && b[3]<=y+h);
          for (const [vw,vh] of [[320,568],[390,844],[1280,800]]) for (const anchor of Object.keys(api.ANCHORS)) {
            const fit=api.fit(l.viewBox,{width:vw,height:vh},{...e.controller.getSettings(),anchor}), s=fit.width/w;
            assert.ok(fit.left+(b[0]-x)*s>=-1e-7 && fit.top+(b[1]-y)*s>=-1e-7 && fit.left+(b[2]-x)*s<=vw+1e-7 && fit.top+(b[3]-y)*s<=vh+1e-7, 'all actual ink fits viewport');
          }
        }
      }
    }
  }
  assert.equal(JSON.stringify(glyphs), before, 'runtime never mutates admitted asset');
  assert.match(page, /primary ink height/); assert.match(page, /nested.*capped.*original inset/i); close(e);
});
test('fresh browser remains off; enabling automatically survives mobile navigation, reload, and settings return', async () => {
  const e = setup({ width:390, height:844 }); await e.controller.ready(); assert.equal(e.controller.getSettings().enabled, false); assert.equal(e.controller.getSettings().remember, true); assert.equal(e.store.values.size, 0);
  change(e,'enabled',true); await e.controller.ready(); change(e,'secondarySize',12,'number'); change(e,'method','nested'); change(e,'effect','fire'); change(e,'intensity',100,'range');
  for (const panel of [false, true]) {
    const next=setup({storage:e.store,panel,width:390,height:844}); await next.controller.ready(); assert.deepEqual(next.controller.getSettings(),e.controller.getSettings()); assert.ok(visible(live(next))); checkLayout(next,'nested'); close(next);
  }
  e.win.dispatch('pagehide',{persisted:true}); e.win.dispatch('pageshow',{persisted:true}); assert.equal(live(e).getAttribute('data-animate'),'true');
  e.controller.hide(); const hidden=setup({storage:e.store,panel:false}); assert.ok(live(hidden).hidden); assert.equal(hidden.calls.length,0); close(hidden);
  e.controller.clear(); assert.equal(e.store.getItem(api.STORAGE_KEY),null); assert.equal(e.controller.getSettings().enabled,false); assert.equal(e.controller.getSettings().secondarySize,25); close(e);
});
test('explicit remembering rejection, missing consent, old preferences and unsavable storage fail safely', async () => {
  for (const saved of [{...api.DEFAULTS,remember:false,enabled:true}, {version:1,enabled:true}]) {
    const e=setup({storage:storage(JSON.stringify(saved)),panel:false}); assert.equal(e.controller.getSettings().enabled,false); assert.ok(live(e).hidden); assert.equal(e.calls.length,0); close(e);
  }
  const e=await enabled(); change(e,'remember',false); assert.equal(e.store.getItem(api.STORAGE_KEY),null); const next=setup({storage:e.store,panel:false}); assert.equal(next.controller.getSettings().enabled,false); close(next); close(e);
  const old=setup({storage:storage(JSON.stringify({version:1,remember:true,enabled:true,method:'nested',secondary:'#123456'}))}); await old.controller.ready(); assert.equal(old.controller.getSettings().secondarySize,25); checkLayout(old,'nested'); close(old);
});
test('preview reflects chosen effect/intensity even disabled; live-only motion is explicitly labeled', async () => {
  const e=setup(); await e.controller.ready(); const preview=e.doc.querySelector('[data-no-preview]');
  for (const effect of ['fire','glow','shimmer']) for (const intensity of [0,40,100]) {
    change(e,'effect',effect); change(e,'intensity',intensity,'number'); assert.equal(preview.getAttribute('data-effect'),effect); assert.equal(preview.style['--no-intensity'],String(intensity/100)); assert.equal(preview.querySelector('.no-effect').getAttribute('opacity'),String(intensity/100)); assert.equal(preview.getAttribute('data-animate'),'false'); assert.equal(e.controller.getSettings().enabled,false); assert.ok(live(e).hidden);
  }
  assert.match(page,/preview.*effect.*intensity/i); assert.match(page,/motion.*live overlay/i); close(e);
});
test('high intensity gives real golden fire, halo and immediately visible luminous shimmer; zero removes paint', async () => {
  const e=await enabled(); change(e,'intensity',100,'number');
  for (const effect of ['fire','glow','shimmer']) {
    change(e,'effect',effect); const fx=live(e).querySelector('.no-effect'); assert.equal(fx.getAttribute('opacity'),'1');
    if(effect==='fire') { assert.equal(fx.querySelector('rect').getAttribute('opacity'),'1'); const fire=live(e).querySelectorAll('linearGradient').find(n=>n.getAttribute('id').endsWith('-fire')); assert.ok(fire.children.every(n=>n.getAttribute('stop-color')!==e.controller.getSettings().primary)); assert.ok(fire.children.every(n=>Number(n.getAttribute('stop-opacity'))>=.8)); }
    if(effect==='glow') { assert.equal(live(e).querySelectorAll('.no-halo').length,4); assert.ok(live(e).querySelector('.no-halo').getAttribute('stroke')); assert.ok(Number(live(e).querySelector('.no-halo').getAttribute('stroke-width'))>20); assert.ok(live(e).querySelector('svg').children.indexOf(fx)<live(e).querySelector('svg').children.indexOf(base(e)),'halo behind unmodified base ink'); }
    if(effect==='shimmer') { const band=live(e).querySelectorAll('linearGradient').find(n=>n.getAttribute('id').endsWith('-shimmer')); assert.equal(band.getAttribute('gradientUnits'),'userSpaceOnUse'); assert.equal(band.getAttribute('spreadMethod'),'reflect'); assert.ok(band.children.some(n=>n.getAttribute('stop-color')==='#FFFFFF' && Number(n.getAttribute('stop-opacity'))===1)); assert.match(css, /@keyframes no-shimmer\s*\{\s*0%,\s*100%\s*\{\s*transform: translateX\(0\)/); }
    change(e,'intensity',0,'range'); assert.equal(live(e).querySelector('.no-effect').getAttribute('opacity'),'0'); assert.equal(live(e).getAttribute('data-animate'),'false'); change(e,'intensity',100,'number');
  }
  assert.ok(!css.includes('var(--no-intensity, .4) * .75')); close(e);
});
test('reduced motion preserves meaningful static effect paint and untouched secondary/footer', async () => {
  const e=await enabled({reduced:true}); change(e,'intensity',100,'number'); change(e,'secondary','#123456','text'); change(e,'footer','#345678','text');
  for(const method of ['interleaved','nested']) for(const effect of ['fire','glow','shimmer']) {
    change(e,'method',method); change(e,'effect',effect); assert.equal(live(e).getAttribute('data-animate'),'false'); assert.equal(live(e).querySelector('.no-effect').getAttribute('opacity'),'1'); assert.ok(live(e).querySelector('.no-effect').children.length>0); checkLayout(e,method); checkFooter(live(e),method,e.controller.getSettings());
    change(e,'motion',false); assert.equal(live(e).querySelector('.no-effect').getAttribute('opacity'),'1');
  }
  assert.match(css,/prefers-reduced-motion: reduce[^}]+animation: none !important/); close(e);
});
test('Astro body replacement reattaches exactly one overlay/tools and rebinds returned settings', async () => {
  const e=setup({auto:true,width:390,height:844}); const context=vm.createContext({window:e.win}); vm.runInContext(source,context);
  e.controller=e.win.AjewNameOverlay.initialize({document:e.doc,window:e.win}); await e.controller.ready(); change(e,'enabled',true); change(e,'secondarySize',12,'number'); change(e,'effect','fire');
  const expected=e.controller.getSettings(); e.win.dispatch('pagehide'); e.doc.body=new Element('body'); e.doc.dispatch('astro:page-load');
  assert.equal(e.doc.querySelectorAll('#ajew-name-overlay').length,1); assert.equal(e.doc.querySelectorAll('#ajew-name-overlay-tools').length,1); assert.ok(visible(live(e))); assert.equal(live(e).getAttribute('data-animate'),'true');
  e.doc.body=new Element('body'); parsePanel(e.doc); vm.runInContext(source,context); e.doc.dispatch('astro:page-load');
  assert.deepEqual(e.controller.getSettings(),expected); assert.equal(control(e,'secondarySize','range').value,'12'); assert.equal(control(e,'enabled').events.get('change').length,1); assert.equal(e.calls.length,1);
  e.doc.getElementById('ajew-name-overlay-tools').querySelector('button').dispatch('click'); assert.ok(live(e).hidden); assert.equal(JSON.parse(e.store.getItem(api.STORAGE_KEY)).enabled,false);
  change(e,'enabled',true); change(e,'remember',false); e.doc.body=new Element('body'); e.doc.dispatch('astro:page-load'); assert.ok(live(e).hidden,'page-only choice does not survive body navigation'); close(e);
});
test('Layout refreshes both overlay runtime cache URLs and loads the immutable footer successor', () => {
  assert.match(layoutSource,/href="\/name-overlay\.css\?v=20261015-2"/); assert.match(layoutSource,/src="\/name-overlay\.js\?v=20261015-2"/); assert.equal(api.ASSET_URL,'/name-overlay/glyphs-footer-v4.json?v=20261015-2');
});
test('page retains exact download route, scope/privacy notes, source distinction and no full Name quote', () => {
  assert.match(page, /import Layout from '\.\.\/layouts\/Layout\.astro'/); assert.ok(page.includes('/downloads/name-overlay/Ajew-Name-Overlay-Windows.zip')); assert.ok(page.includes('/reader/shivchay-haran/1/2/')); assert.match(page, /not a source claim for either combined arrangement/); assert.match(page, /website overlay stays inside ajew\.org in your browser/); assert.match(page, /No analytics, account or uploads/); assert.ok(!page.includes(glyphs.primary)); assert.ok(!page.includes(glyphs.interleaved)); assert.ok(!/name-overlay\.(?:js|css)\?/.test(page), 'Layout owns the assets without duplicate page loads');
});
test('v4 actual JSON body is only a centered top-anchored 1.25 footer scale and complete viewBox extension from immutable v3', () => {
  assert.equal(crypto.createHash('sha256').update(priorAssetBytes).digest('hex'), 'dda32fd38db6eff5967b370b2ed4b3460f782d83d26480a661d202d7d6e6cee5');
  const expected = structuredClone(priorFooterGlyphs);
  for (const method of ['interleaved', 'nested']) {
    const old = priorFooterGlyphs.layouts[method], next = expected.layouts[method], actual = glyphs.layouts[method];
    const cx = old.viewBox[0]+old.viewBox[2]/2, top = old.footerInkBounds[1];
    assert.equal(top, 340); assert.equal(old.footerSizeRatio, .20);
    for (const g of next.footerGlyphs) { g.x=cx+(g.x-cx)*1.25; g.y=-top+(g.y+top)*1.25; g.scale*=1.25; }
    next.footerSizeRatio=.25;
    next.footerInkBounds=unionBounds(next.footerGlyphs.map(g=>transformedBounds(g)));
    next.viewBox[3]=next.footerInkBounds[3]+100-next.viewBox[1];
    assert.deepEqual(actual.viewBox, [-60,-1510,method==='nested'?3853:7797,2308.25]);
    assert.deepEqual(actual.glyphs, old.glyphs, 'all primary and ADN source placements conserved');
    assert.deepEqual(actual.viewBox.slice(0,3), old.viewBox.slice(0,3), 'top, left and width conserved');
    const before=unionBounds(old.footerGlyphs.map(g=>transformedBounds(g))), after=unionBounds(actual.footerGlyphs.map(g=>transformedBounds(g)));
    for (const axis of [0,1]) assert.ok(Math.abs((after[axis+2]-after[axis])/(before[axis+2]-before[axis])-1.25)<1e-10, 'whole ink is uniformly 1.25, including every mark');
    assert.ok(Math.abs(after[1]-top)<1e-7); assert.ok(Math.abs((after[0]+after[2])/2-cx)<1e-7);
    assert.ok(Math.abs(actual.viewBox[1]+actual.viewBox[3]-after[3]-100)<1e-7, '100-unit complete-ink bottom margin');
  }
  assert.deepEqual(glyphs,expected,'whole actual body: no other Name/source text, paths, marks, bounds, order, metadata or placement changed');
});
test('v4 actual live and preview footer ink enlarges exactly 1.25 from v3 at unchanged center/top for both layouts', async () => {
  const e=await enabled();
  for (const method of ['interleaved','nested']) {
    change(e,'method',method); const old=priorFooterGlyphs.layouts[method], cx=old.viewBox[0]+old.viewBox[2]/2, top=340;
    const before=unionBounds(old.footerGlyphs.map(g=>transformedBounds(g)));
    for (const target of [live(e),e.doc.querySelector('[data-no-preview]')]) {
      const footer=target.querySelector('.no-footer'); assert.equal(footer.getAttribute('data-size-ratio'),'0.25');
      const actual=footer.children.map((p,i)=>actualBounds(p,old.footerGlyphs[i]));
      actual.forEach((b,i)=>transformedBounds(old.footerGlyphs[i]).forEach((v,j)=>assert.ok(Math.abs(b[j]-(j%2===0?cx+(v-cx)*1.25:top+(v-top)*1.25))<1e-7,'every rendered glyph/mark bound preserves the exact similarity transform')));
      const after=unionBounds(actual); assert.ok(Math.abs((after[3]-after[1])/(before[3]-before[1])-1.25)<1e-10);
      assert.ok(Math.abs(after[1]-top)<1e-7); assert.ok(Math.abs((after[0]+after[2])/2-cx)<1e-7);
      for(const b of actual) { const [x,y,w,h]=glyphs.layouts[method].viewBox; assert.ok(b[0]>=x&&b[1]>=y&&b[2]<=x+w&&b[3]<=y+h); }
      checkLayout(e,method); checkFooter(target,method,e.controller.getSettings());
    }
  } close(e);
});
test('footer successor provenance, hint and fresh URLs agree with exact body digest while CSS bytes stay unchanged', () => {
  const provenance=JSON.parse(fs.readFileSync(path.join(implementationRoot,'public/name-overlay/FONT-PROVENANCE.json'),'utf8'));
  assert.equal(provenance.pointed_footer.glyph_asset,'glyphs-footer-v4.json');
  assert.equal(provenance.pointed_footer.glyph_sha256,'2c7f5408765aa6671784d85fc5eb83715f7710f8804091fffef9ef58ad6d16af');
  assert.equal(provenance.pointed_footer.size_ratio_to_primary_name_ink,.25);
  assert.equal(provenance.pointed_footer.text,EXACT_FOOTER);
  assert.match(page,/complete height, including vowel marks, is only 25% of the primary Name/);
  assert.equal(crypto.createHash('sha256').update(css).digest('hex'),'f8bae0edad2e9571842ebadafaffccfe6563bb6d0ef90992b4412adb81cc3f18');
});
test('strict successor validation rejects original 20% body and forged 25% label through actual initialization', async () => {
  for(const method of ['interleaved','nested']) for(const forged of [false,true]) {
    const bad=structuredClone(glyphs); bad.layouts[method]=structuredClone(priorFooterGlyphs.layouts[method]);
    if(forged) bad.layouts[method].footerSizeRatio=.25;
    assert.throws(()=>api.validGlyphs(bad),/Footer must remain much smaller/);
    const e=await enabled({fetch:async()=>({ok:true,json:async()=>bad})});
    assert.ok(live(e).hidden); assert.equal(live(e).children.length,0); assert.equal(e.doc.querySelector('[data-no-preview]').children.length,0); close(e);
  }
  assert.equal(api.validGlyphs(glyphs),glyphs,'fresh positive after historical-size negatives');
});
test('repeated settings to ordinary to settings replacement removes all old panel handlers and keeps exactly one current handler', async () => {
  const e=await enabled(), allNodes=new Set([e.doc,e.win,e.media]);
  const descendants=node=>[node,...node.children.flatMap(descendants)];
  const count=targets=>[...targets].reduce((n,t)=>n+[...t.events.values()].reduce((s,entries)=>s+entries.length,0),0);
  const register=()=>descendants(e.doc.body).forEach(n=>allNodes.add(n));
  const retired=[], observations=[];
  register(); const initial=count(allNodes), persistent=count([e.doc,e.win,e.media,e.doc.getElementById('ajew-name-overlay-tools').querySelector('button')]);
  for(let round=0;round<5;round++) {
    const oldPanel=e.doc.querySelector('[data-name-overlay-panel]'); retired.push(...descendants(oldPanel));
    e.doc.body=new Element('body'); api.initialize({window:e.win,document:e.doc}); register();
    observations.push({phase:'ordinary',round,total:count(allNodes),retired:count(new Set(retired))});
    e.doc.body=new Element('body'); parsePanel(e.doc); api.initialize({window:e.win,document:e.doc}); await e.controller.ready(); register();
    // Reinitializing the same form must not remove or duplicate its current bindings.
    api.initialize({window:e.win,document:e.doc});
    observations.push({phase:'settings',round,total:count(allNodes),retired:count(new Set(retired))});
  }
  // Also replace a settings form directly, without an intervening ordinary page.
  retired.push(...descendants(e.doc.querySelector('[data-name-overlay-panel]')));
  e.doc.body=new Element('body'); parsePanel(e.doc); api.initialize({window:e.win,document:e.doc}); await e.controller.ready(); register();
  observations.push({phase:'settings-direct',total:count(allNodes),retired:count(new Set(retired))});
  const current=e.doc.querySelector('[data-name-overlay-panel]');
  const currentBindings=descendants(current).flatMap(n=>[...n.events.values()].map(entries=>entries.length));
  const before=e.controller.getSettings();
  for(const n of new Set(retired)) for(const event of ['input','change','click','submit']) n.dispatch(event);
  const after=e.controller.getSettings(); close(e);
  console.log('panel lifecycle listener observations '+JSON.stringify({initial,persistent,observations,afterDestroy:count(allNodes)}));
  for(const o of observations) { assert.equal(o.retired,0,'discarded forms and previews must have zero handlers: '+o.phase); assert.equal(o.total,o.phase==='ordinary'?persistent:initial,'registered listener population is bounded'); }
  assert.ok(currentBindings.length>0); assert.ok(currentBindings.every(n=>n===1),'exactly one handler for each current control/event');
  assert.deepEqual(after,before,'discarded controls cannot change active state');
  assert.equal(count(allNodes),0,'destroy cleans both document and panel lifetimes');
});
