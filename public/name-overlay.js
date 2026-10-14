/* Optional, local-only SVG devotional overlay. No fonts, telemetry or third-party requests. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    if (root.AjewNameOverlay) {
      root.AjewNameOverlay.initialize({ window: root, document: root.document });
      return;
    }
    root.AjewNameOverlay = api;
    const start = () => api.initialize({ window: root, document: root.document });
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
    root.document.addEventListener('astro:page-load', start);
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const STORAGE_KEY = 'ajew.name-overlay.v1';
  const ASSET_URL = '/name-overlay/glyphs-footer-small-v3.json?v=20261014-3';
  // Exact supplied codepoints. In particular, the final word stays UNPOINTED.
  const FOOTER_TEXT = '\u05e0\u05b7 \u05e0\u05b7\u05d7\u05b0 \u05e0\u05b7\u05d7\u05b0\u05de\u05b8 \u05e0\u05b7\u05d7\u05b0\u05de\u05b8\u05df \u05de\u05d0\u05d5\u05de\u05df';
  // Admitted HarfBuzz RTL ink sequence: 15 letters and 9 separate vowel marks.
  const FOOTER_SHAPE = [[172,50],[171,48],[162,46],[157,44],[171,42],[172,39],[141,35],[171,35],[133,31],[164,31],[140,27],[173,27],[141,22],[171,22],[133,18],[164,18],[140,14],[173,14],[133,9],[164,9],[140,5],[173,5],[140,0],[173,0]];
  // Preserve the predecessor's Name-only effect stage, not the taller footer box.
  const NAME_EFFECT_HEIGHT = 1740;
  const NS = 'http://www.w3.org/2000/svg';
  const DEFAULTS = Object.freeze({ version: 1, enabled: false, remember: false, method: 'interleaved',
    primary: '#87CEEB', secondary: '#000000', footer: '#000000', opacity: 55, width: 48, height: 24,
    anchor: 'center', x: 50, y: 50, effect: 'none', intensity: 40, motion: true });
  const ANCHORS = Object.freeze({ 'top-left': [0, 0], top: [50, 0], 'top-right': [100, 0],
    left: [0, 50], center: [50, 50], right: [100, 50],
    'bottom-left': [0, 100], bottom: [50, 100], 'bottom-right': [100, 100] });
  const PRESETS = Object.freeze({ sky: ['#87CEEB', '#000000'], ink: ['#172033', '#000000'],
    pearl: ['#F5F1E8', '#87CEEB'], gold: ['#D6AD55', '#172033'] });
  const instances = new WeakMap();
  let serial = 0;
  function number(value, fallback, min = 0, max = 100) {
    if ((typeof value !== 'number' && typeof value !== 'string') || value === '' || (typeof value === 'string' && !value.trim())) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }
  function color(value, fallback) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;
  }
  function normalize(input) {
    const a = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const s = { ...DEFAULTS };
    ['enabled', 'remember', 'motion'].forEach(k => { if (typeof a[k] === 'boolean') s[k] = a[k]; });
    s.method = ['interleaved', 'nested'].includes(a.method) ? a.method : s.method;
    s.effect = ['none', 'fire', 'glow', 'shimmer'].includes(a.effect) ? a.effect : s.effect;
    s.anchor = Object.hasOwn(ANCHORS, a.anchor) || a.anchor === 'custom' ? a.anchor : s.anchor;
    s.primary = color(a.primary, s.primary); s.secondary = color(a.secondary, s.secondary); s.footer = color(a.footer, s.footer);
    ['opacity', 'intensity', 'x', 'y'].forEach(k => { s[k] = number(a[k], s[k]); });
    ['width', 'height'].forEach(k => { s[k] = number(a[k], s[k], 1, 100); });
    if (s.anchor !== 'custom') [s.x, s.y] = ANCHORS[s.anchor];
    return s;
  }
  function readSettings(storage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw || raw.length > 4096) return { ...DEFAULTS };
      const a = JSON.parse(raw);
      if (!a || a.version !== 1 || a.remember !== true) return { ...DEFAULTS };
      return normalize(a);
    } catch (_) { return { ...DEFAULTS }; }
  }
  // X/Y locate the fitted artwork along the available space, never its offscreen center.
  function fit(viewBox, viewport, settings) {
    const s = normalize(settings);
    const vw = number(viewport.width, 1, 1, 100000), vh = number(viewport.height, 1, 1, 100000);
    const scale = Math.min(vw * s.width / 100 / viewBox[2], vh * s.height / 100 / viewBox[3]);
    const width = viewBox[2] * scale, height = viewBox[3] * scale;
    return { width, height, left: (vw - width) * s.x / 100, top: (vh - height) * s.y / 100 };
  }
  function validGlyphs(data) {
    const validPath = p => typeof p === 'string' && p.length > 20 && p.length < 100000 && /^[MmLlHhVvCcSsQqTtAaZz0-9.,+\-\s]+$/.test(p) && /[Mm]/.test(p);
    const validBounds = b => Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[2] > b[0] && b[3] > b[1];
    const placedBounds = (g, b) => [g.x + g.scale*b[0], -g.y - g.scale*b[3], g.x + g.scale*b[2], -g.y - g.scale*b[1]];
    const union = bs => [Math.min(...bs.map(b=>b[0])), Math.min(...bs.map(b=>b[1])), Math.max(...bs.map(b=>b[2])), Math.max(...bs.map(b=>b[3]))];
    const same = (a,b) => Math.abs(a-b) < 1e-7;
    const orders = { interleaved: ['יאהדונהי', ['primary', 'secondary', 'primary', 'secondary', 'primary', 'secondary', 'primary', 'secondary']],
      nested: ['יהוהאדני', ['primary', 'primary', 'primary', 'primary', 'secondary', 'secondary', 'secondary', 'secondary']] };
    if (!data || !data.layouts || !data.glyphs) throw new Error('Glyph asset unavailable');
    const f = data.footer;
    if (!f || f.text !== FOOTER_TEXT || f.font !== 'Keter YG' || f.unitsPerEm !== 2048 || !Array.isArray(f.glyphs) || f.glyphs.length !== FOOTER_SHAPE.length) throw new Error('Invalid exact footer source');
    f.glyphs.forEach((g,i) => {
      if (!g || g.role !== 'footer' || g.glyphId !== FOOTER_SHAPE[i][0] || g.clusterUtf8 !== FOOTER_SHAPE[i][1] || ![g.x,g.y,g.scale].every(Number.isFinite) || g.scale !== 1 || !validPath(g.path) || !validBounds(g.bounds)) throw new Error('Invalid pointed footer outline');
    });
    for (const [method, [letters, roles]] of Object.entries(orders)) {
      const l = data.layouts[method];
      if (!l || !Array.isArray(l.viewBox) || l.viewBox.length !== 4 || !l.viewBox.every(Number.isFinite) || l.viewBox[2] <= 0 || l.viewBox[3] <= 0 || !Array.isArray(l.glyphs) || l.glyphs.length !== 8) throw new Error('Invalid glyph layout');
      l.glyphs.forEach((g, i) => {
        const outline = data.glyphs[g.letter];
        if (g.letter !== letters[i] || g.role !== roles[i] || ![g.x, g.y, g.scale].every(Number.isFinite) || g.scale <= 0 || !outline || !validPath(outline.path) || !validBounds(outline.bounds)) throw new Error('Invalid STAM outline');
      });
      if (!Array.isArray(l.footerGlyphs) || l.footerGlyphs.length !== FOOTER_SHAPE.length || !validBounds(l.footerInkBounds)) throw new Error('Invalid footer placement');
      const first = l.footerGlyphs[0], sourceFirst = f.glyphs[0];
      const scale = first.scale, dx = first.x-sourceFirst.x*scale, dy = first.y-sourceFirst.y*scale;
      l.footerGlyphs.forEach((g,i) => {
        const original = f.glyphs[i];
        if (!g || g.role !== 'footer' || g.path !== original.path || g.glyphId !== original.glyphId || g.clusterUtf8 !== original.clusterUtf8 || ![g.x,g.y,g.scale].every(Number.isFinite) || g.scale <= 0 || !validBounds(g.bounds) || g.bounds.some((v,j)=>v!==original.bounds[j]) || !same(g.scale,scale) || !same(g.x,original.x*scale+dx) || !same(g.y,original.y*scale+dy)) throw new Error('Invalid shaped footer placement');
      });
      const nameBounds = l.glyphs.map(g => placedBounds(g,data.glyphs[g.letter].bounds));
      const footerBounds = l.footerGlyphs.map(g => placedBounds(g,g.bounds)), ink = union(footerBounds);
      const primaryInk = union(l.glyphs.filter(g=>g.role==='primary').map(g=>placedBounds(g,data.glyphs[g.letter].bounds)));
      const [x,y,w,h] = l.viewBox;
      // Size the complete footer ink INCLUDING niqqud, never just letter tops.
      if (l.footerSizeRatio !== .20 || !same(ink[3]-ink[1],(primaryInk[3]-primaryInk[1])*.20) || ink[2]-ink[0]>w*.90) throw new Error('Footer must remain much smaller than the Name');
      if (ink.some((v,i)=>!same(v,l.footerInkBounds[i])) || ink[1] <= union(nameBounds)[3] || !same((ink[0]+ink[2])/2,x+w/2) || nameBounds.concat(footerBounds).some(b => b[0]<x || b[1]<y || b[2]>x+w || b[3]>y+h)) throw new Error('Incomplete artwork geometry');
    }
    return data;
  }
  function initialize(options = {}) {
    const win = options.window, doc = options.document;
    if (!doc || !win) throw new Error('A window and document are required');
    if (instances.has(doc)) { instances.get(doc).bindPanel(); return instances.get(doc).controller; }
    let storage = options.storage;
    if (!storage) { try { storage = win.localStorage; } catch (_) { /* private mode */ } }
    const request = options.fetch || win.fetch.bind(win);
    let state = readSettings(storage), data = null, pending = null, destroyed = false, error = '', storageError = false;
    let pageActive = true, geometry = null;
    const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
    const listeners = [];
    let panel = null, boundPanel = null;
    const el = (name, attrs = {}, parent, svg = false) => {
      const node = svg ? doc.createElementNS(NS, name) : doc.createElement(name);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
      if (parent) parent.appendChild(node);
      return node;
    };
    const on = (target, event, handler) => { target.addEventListener(event, handler); listeners.push(() => target.removeEventListener(event, handler)); };
    const overlay = el('div', { id: 'ajew-name-overlay', 'aria-hidden': 'true', hidden: '' }, doc.body);
    overlay.hidden = true; overlay.style.pointerEvents = 'none';
    const tools = el('div', { id: 'ajew-name-overlay-tools', 'aria-label': 'Name overlay controls', hidden: '' }, doc.body);
    tools.hidden = true;
    const hideButton = el('button', { type: 'button' }, tools); hideButton.textContent = 'Hide Name';
    const settingsLink = el('a', { href: '/name-overlay/#name-overlay-settings' }, tools); settingsLink.textContent = 'Settings';
    on(hideButton, 'click', () => update({ enabled: false }));
    function persist() {
      storageError = false;
      try {
        if (state.remember) storage.setItem(STORAGE_KEY, JSON.stringify(state));
        else storage.removeItem(STORAGE_KEY);
      } catch (_) { storageError = true; }
    }
    function syncPanel() {
      if (!panel) return;
      panel.querySelectorAll('[data-no-field]').forEach(control => {
        const key = control.getAttribute('data-no-field');
        if (control.type === 'checkbox') control.checked = state[key];
        else control.value = String(state[key]);
        control.removeAttribute('aria-invalid');
      });
      const status = panel.querySelector('[data-no-status]');
      if (status) status.textContent = error || (state.enabled ? (data ? 'Overlay on. Hide it at any time.' : 'Loading exact Name and pointed footer outlines…') : 'Overlay off.') +
        (storageError ? ' This browser cannot save preferences; changes apply only here.' : state.remember ? ' Preferences saved on this browser.' : ' Changes apply only on this page; remembering is off.');
      const hint = panel.querySelector('[data-no-motion-status]');
      if (hint) hint.textContent = reduced.matches ? 'Reduced motion is active: effects remain still.' : 'Motion stops when this page is hidden.';
    }
    function path(parent, g, extra = {}) {
      return el('path', { d: g.role === 'footer' ? g.path : data.glyphs[g.letter].path,
        transform: `translate(${g.x},${-g.y}) scale(${g.scale},${-g.scale})`, ...extra }, parent, true);
    }
    function render(target = overlay) {
      target.replaceChildren();
      target.setAttribute('data-effect', state.effect);
      target.style.setProperty('--no-intensity', String(state.intensity / 100));
      target.style.setProperty('--no-primary', state.primary);
      const layout = data.layouts[state.method], [x, y, w] = layout.viewBox, h = NAME_EFFECT_HEIGHT;
      const prefix = `ajew-name-${++serial}`;
      const svg = el('svg', { viewBox: layout.viewBox.join(' '), preserveAspectRatio: 'xMidYMid meet', 'aria-hidden': 'true', focusable: 'false', class: 'no-art' }, target, true);
      el('metadata', { 'data-source': 'user-supplied-exact-footer' }, svg, true).textContent = FOOTER_TEXT;
      const defs = el('defs', {}, svg, true);
      const clip = el('clipPath', { id: `${prefix}-primary`, clipPathUnits: 'userSpaceOnUse' }, defs, true);
      layout.glyphs.filter(g => g.role === 'primary').forEach(g => path(clip, g));
      const gradient = (id, stops, attrs) => {
        const gr = el('linearGradient', { id: `${prefix}-${id}`, ...attrs }, defs, true);
        stops.forEach(([offset, c, opacity]) => el('stop', { offset, 'stop-color': c, 'stop-opacity': opacity }, gr, true));
      };
      gradient('fire', [['0%', '#FFF0A6', 1], ['38%', '#FFB52E', .95], ['72%', '#DB481A', .8], ['100%', state.primary, .3]], { x1: '0%', y1: '100%', x2: '0%', y2: '0%' });
      gradient('shimmer', [['0%', '#FFFFFF', 0], ['42%', '#FFFFFF', 0], ['50%', '#FFFFFF', .55], ['58%', '#FFFFFF', 0], ['100%', '#FFFFFF', 0]], { x1: '0%', x2: '100%' });
      const base = el('g', { class: 'no-base' }, svg, true);
      layout.glyphs.forEach(g => path(base, g, { fill: g.role === 'primary' ? state.primary : state.secondary, 'data-letter': g.letter, 'data-role': g.role, class: `no-glyph no-${g.role}` }));
      // Effect paint is clipped to exact primary outlines; secondary paths are never recolored.
      const effect = el('g', { 'clip-path': `url(#${prefix}-primary)`, class: 'no-effect' }, svg, true);
      if (state.effect === 'fire') {
        el('rect', { x, y, width: w, height: h, fill: `url(#${prefix}-fire)`, opacity: .5 }, effect, true);
        for (let i = 0; i < 16; i++) {
          const cx = x + w * (i + .5) / 16, b = y + h * 1.2, fh = h * (.68 + (i % 4) * .1), r = w / 22;
          const d = `M${cx-r},${b} Q${cx-r*1.1},${b-fh*.5} ${cx+r*.2},${b-fh} Q${cx+r*.15},${b-fh*.45} ${cx+r},${b} Z`;
          const tongue = el('path', { d, fill: `url(#${prefix}-fire)`, class: 'no-flame' }, effect, true);
          tongue.style.animationDelay = `${-(i % 7) * .47}s`;
          tongue.style.animationDuration = `${3.2 + (i % 5) * .38}s`;
        }
      } else if (state.effect === 'shimmer') {
        el('rect', { x: x - w, y, width: w * 3, height: h, fill: `url(#${prefix}-shimmer)`, class: 'no-sweep' }, effect, true);
      } else if (state.effect === 'glow') {
        effect.removeAttribute('clip-path');
        const halo = el('filter', { id: `${prefix}-glow`, filterUnits: 'userSpaceOnUse', x: x - w * .03, y: y - h * .12, width: w * 1.06, height: h * 1.24 }, defs, true);
        el('feGaussianBlur', { stdDeviation: w * .005 }, halo, true);
        effect.setAttribute('filter', `url(#${prefix}-glow)`);
        layout.glyphs.filter(g => g.role === 'primary').forEach(g => path(effect, g, { fill: state.primary, class: 'no-halo' }));
      }
      // Independent shaped ink, after effect paint. Never a STAM text fallback:
      // STAM's vowel entries have empty outlines and would silently lose marks.
      const footer = el('g', { class: 'no-footer', 'data-source-text': FOOTER_TEXT, 'data-font': data.footer.font, 'data-size-ratio': layout.footerSizeRatio }, svg, true);
      layout.footerGlyphs.forEach(g => path(footer, g, { fill: state.footer, class: 'no-footer-glyph', 'data-role': 'footer', 'data-glyph-id': g.glyphId, 'data-cluster-utf8': g.clusterUtf8 }));
    }
    function visibility() {
      const visible = state.enabled && !!data && !destroyed;
      overlay.hidden = !visible; tools.hidden = !state.enabled || destroyed;
      overlay.style.opacity = String(state.opacity / 100);
      overlay.setAttribute('data-effect', state.effect);
      overlay.style.setProperty('--no-intensity', String(state.intensity / 100));
      overlay.style.setProperty('--no-primary', state.primary);
      const animated = visible && state.opacity > 0 && state.intensity > 0 && state.effect !== 'none' && state.motion && !reduced.matches && !doc.hidden && pageActive;
      overlay.setAttribute('data-animate', String(animated));
      if (visible) {
        geometry = fit(data.layouts[state.method].viewBox, { width: win.innerWidth, height: win.innerHeight }, state);
        for (const k of ['width', 'height', 'left', 'top']) overlay.style[k] = `${geometry[k]}px`;
      }
      syncPanel();
    }
    async function ensureGlyphs() {
      if (data || pending || (!state.enabled && !panel) || destroyed) return pending;
      error = '';
      pending = (async () => {
        try {
          const response = await request(ASSET_URL, { credentials: 'omit', cache: 'force-cache' });
          if (!response.ok) throw new Error('Glyph asset request failed');
          const loaded = validGlyphs(await response.json());
          if (destroyed) return;
          data = loaded;
          if (state.enabled) render();
          const preview = panel && panel.querySelector('[data-no-preview]');
          if (preview) render(preview);
        } catch (_) {
          if (!destroyed) error = 'Exact Name and pointed footer outlines could not load. The overlay stays hidden; disable and enable to retry.';
        } finally { pending = null; if (!destroyed) visibility(); }
      })();
      return pending;
    }
    function update(changes) {
      if (destroyed) return;
      const merged = { ...state, ...changes };
      if (Object.hasOwn(changes, 'x') || Object.hasOwn(changes, 'y')) merged.anchor = 'custom';
      state = normalize(merged);
      error = ''; persist();
      if (data && state.enabled) render();
      const preview = panel && panel.querySelector('[data-no-preview]');
      if (data && preview) render(preview);
      visibility();
      if (state.enabled && !data) ensureGlyphs();
    }
    function clear() {
      if (destroyed) return;
      state = { ...DEFAULTS }; error = ''; persist(); overlay.replaceChildren(); geometry = null;
      const preview = panel && panel.querySelector('[data-no-preview]');
      if (data && preview) render(preview);
      visibility();
    }
    function bindPanel() {
      const next = doc.querySelector('[data-name-overlay-panel]');
      if (!next || next === boundPanel) return;
      panel = next; boundPanel = next;
      on(panel, 'submit', event => event.preventDefault());
      panel.querySelectorAll('[data-no-field]').forEach(control => {
        const key = control.getAttribute('data-no-field');
        const event = control.type === 'range' || control.type === 'number' || control.type === 'color' ? 'input' : 'change';
        on(control, event, () => {
          const value = control.type === 'checkbox' ? control.checked : control.value;
          if (['primary', 'secondary', 'footer'].includes(key) && !/^#[0-9a-f]{6}$/i.test(value)) {
            control.setAttribute('aria-invalid', 'true');
            const status = panel.querySelector('[data-no-status]');
            if (status) status.textContent = 'Enter a six-digit hex color, such as #87CEEB.';
            return;
          }
          control.removeAttribute('aria-invalid'); update({ [key]: value });
        });
      });
      panel.querySelectorAll('[data-no-action]').forEach(button => on(button, 'click', () => {
        const action = button.getAttribute('data-no-action');
        if (action === 'hide') update({ enabled: false });
        else if (action === 'clear') clear();
      }));
      panel.querySelectorAll('[data-no-preset]').forEach(button => on(button, 'click', () => {
        const colors = PRESETS[button.getAttribute('data-no-preset')];
        if (colors) update({ primary: colors[0], secondary: colors[1] });
      }));
      syncPanel();
      const preview = panel.querySelector('[data-no-preview]');
      if (data && preview) render(preview);
      else ensureGlyphs();
    }
    on(win, 'resize', visibility);
    on(doc, 'visibilitychange', visibility);
    on(win, 'pagehide', () => { pageActive = false; visibility(); });
    on(win, 'pageshow', () => { pageActive = true; visibility(); });
    on(win, 'storage', event => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      state = readSettings(storage); error = '';
      if (data && state.enabled) render();
      const preview = panel && panel.querySelector('[data-no-preview]');
      if (data && preview) render(preview);
      visibility(); if (state.enabled && !data) ensureGlyphs();
    });
    if (reduced.addEventListener) on(reduced, 'change', visibility);
    else if (reduced.addListener) { reduced.addListener(visibility); listeners.push(() => reduced.removeListener(visibility)); }
    const controller = Object.freeze({ update, hide: () => update({ enabled: false }), clear,
      getSettings: () => ({ ...state }), getGeometry: () => geometry ? { ...geometry } : null,
      ready: () => pending || Promise.resolve(),
      destroy: () => { destroyed = true; listeners.splice(0).forEach(remove => remove()); overlay.remove(); tools.remove(); instances.delete(doc); } });
    instances.set(doc, { controller, bindPanel });
    bindPanel(); visibility(); if (state.enabled) ensureGlyphs();
    return controller;
  }
  return Object.freeze({ initialize, normalize, color, fit, validGlyphs, readSettings, DEFAULTS, STORAGE_KEY, ASSET_URL, FOOTER_TEXT,
    ANCHORS: Object.freeze(Object.fromEntries(Object.entries(ANCHORS).map(([k, v]) => [k, Object.freeze([...v])]))),
    PRESETS: Object.freeze(Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, Object.freeze([...v])]))) });
});
