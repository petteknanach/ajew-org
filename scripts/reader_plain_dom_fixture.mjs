// Synthetic DOM apparatus; runtime under test is the complete unchanged core.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const core = readFileSync(new URL('../public/reader-v2.js', import.meta.url), 'utf8');
const access = readFileSync(new URL('../public/reader-plain-access.js', import.meta.url), 'utf8');

export function harness({ pathname = '/reader/book/1/2', declaration, loading = false, edition = false, search = '' } = {}) {
  const events = new Map(), observers = [];
  let mutations = 0, callbacks = 0, coreInits = 0;
  function changed(target, type, attributeName) {
    mutations++;
    for (const observer of observers) {
      if (!observer.targets.some(([root, options]) => (root === target || options.subtree && root.contains(target)) &&
        (type === 'childList' ? options.childList : options.attributes && options.attributeFilter.includes(attributeName)))) continue;
      if (observer.queued) continue;
      observer.queued = true;
      queueMicrotask(() => {
        observer.queued = false;
        // A broken observer must fail promptly, not starve the test deadline.
        assert.ok(++callbacks <= 60, 'bounded mutation convergence');
        observer.callback([{ target, type, attributeName }]);
      });
    }
  }
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null;
      this.attrs = new Map(); this._text = ''; this.dataset = {};
      this.style = { setProperty() {} };
      this.classList = {
        contains: c => this.className.split(/\s+/).includes(c),
        add: (...cs) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...cs])].join(' '); },
        remove: (...cs) => { this.className = this.className.split(/\s+/).filter(c => !cs.includes(c)).join(' '); },
        toggle: (c, force) => { const yes = force ?? !this.classList.contains(c); this.classList[yes ? 'add' : 'remove'](c); return yes; },
      };
    }
    get id() { return this.getAttribute('id') || ''; } set id(v) { this.setAttribute('id', v); }
    get className() { return this.getAttribute('class') || ''; } set className(v) { this.setAttribute('class', v); }
    get href() { const v = this.getAttribute('href'); return v ? new URL(v, 'https://ajew.org').href : ''; } set href(v) { this.setAttribute('href', v); }
    get rel() { return this.getAttribute('rel'); } set rel(v) { this.setAttribute('rel', v); }
    get type() { return this.getAttribute('type'); } set type(v) { this.setAttribute('type', v); }
    get title() { return this.getAttribute('title'); } set title(v) { this.setAttribute('title', v); }
    get firstChild() { return this.children[0] || null; }
    get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
    set textContent(v) { this._text = String(v); this.children = []; changed(this, 'childList'); }
    set innerHTML(_) { throw new Error('HTML sink forbidden'); }
    setAttribute(k, v) { this.attrs.set(k, String(v)); changed(this, 'attributes', k); }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    removeAttribute(k) { if (this.attrs.delete(k)) changed(this, 'attributes', k); }
    contains(el) { return this === el || this.children.some(c => c.contains(el)); }
    appendChild(el) { el.remove(); el.parentElement = this; this.children.push(el); changed(this, 'childList'); return el; }
    append(...els) { for (const el of els) this.appendChild(el); }
    insertBefore(el, before) {
      if (!before) return this.appendChild(el);
      assert.equal(before.parentElement, this); el.remove(); el.parentElement = this;
      this.children.splice(this.children.indexOf(before), 0, el); changed(this, 'childList'); return el;
    }
    remove() {
      if (!this.parentElement) return;
      const parent = this.parentElement;
      parent.children.splice(parent.children.indexOf(this), 1); this.parentElement = null; changed(parent, 'childList');
    }
    addEventListener() {}
    matches(selector) {
      if (selector.includes(',')) return selector.split(',').some(s => this.matches(s.trim()));
      if (selector === ':scope > .ajew-segment-actions') return this.classList.contains('ajew-segment-actions');
      if (selector.includes(' ')) {
        const parts = selector.split(/\s+/); const last = parts.pop();
        return this.matches(last) && !!this.parentElement?.closest(parts.join(' '));
      }
      let last = false;
      if (selector.endsWith(':last-child')) { selector = selector.slice(0, -11); last = true; }
      if (last && this.parentElement?.children.at(-1) !== this) return false;
      const attr = selector.match(/^(\w+)?\[([^\]~=]+)(~=|=)?(?:"([^"]*)")?\]$/);
      if (attr) {
        const [, tag, name, op, value] = attr;
        return (!tag || tag.toUpperCase() === this.tagName) && (op === '=' ? this.getAttribute(name) === value : op === '~=' ? (this.getAttribute(name) || '').split(/\s+/).includes(value) : this.attrs.has(name));
      }
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
      return this.tagName.toLowerCase() === selector;
    }
    closest(selector) { for (let p = this; p; p = p.parentElement) if (p.matches(selector)) return p; return null; }
    querySelectorAll(selector) {
      const found = [];
      const walk = e => { for (const c of e.children) { if (c.matches(selector)) found.push(c); walk(c); } };
      walk(this); return found;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  const html = new Element('html'), head = new Element('head'), body = new Element('body'); html.append(head, body);
  const container = new Element('main'); container.className = 'reader-container'; body.append(container);
  const toolbar = new Element('div'); toolbar.className = 'reader-toolbar'; container.append(toolbar);
  const group = new Element('div'); group.className = 'reader-toolbar-group'; toolbar.append(group);
  const content = new Element('div'); content.className = 'reader-content'; container.append(content);
  const paragraph = new Element('p'); paragraph.textContent = 'EXACT SOURCE BODY — אין שינוי'; content.append(paragraph);
  const hold = new Element('p'); hold.id = 'source-status'; hold.textContent = 'Source unavailable; access remains locked.'; container.append(hold);
  const youtube = new Element('a'); youtube.href = 'https://www.youtube.com/watch?v=FIXTURE0001'; youtube.textContent = 'Existing video'; group.append(youtube);
  const audio = new Element('audio'); container.append(audio);
  const control = new Element('button'); control.id = 'held-control'; control.setAttribute('disabled', ''); group.append(control);
  if (declaration) {
    const meta = new Element('meta'); meta.setAttribute('name', 'ajew-reader-plain-access');
    for (const [k, v] of Object.entries(declaration)) if (v !== null) meta.setAttribute('data-' + k, v);
    head.append(meta);
  }
  const addEvent = (name, callback) => events.set(name, [...events.get(name) || [], callback]);
  const document = {
    documentElement: html, head, body, title: 'Synthetic source fixture', readyState: loading ? 'loading' : 'interactive',
    querySelectorAll: s => html.querySelectorAll(s), querySelector: s => html.querySelector(s),
    getElementById: id => html.querySelector('#' + id), createElement: t => new Element(t), addEventListener: addEvent,
  };
  const redirects = [];
  const location = { pathname, origin: 'https://ajew.org', href: 'https://ajew.org' + pathname + search, search, replace: url => redirects.push(url) };
  const window = { location, addEventListener: addEvent, innerHeight: 800, scrollY: 0 };
  if (edition) {
    window.AjewReaderEdition = { edition: () => 'fixture' };
    window.AjewReader = { getState: () => ({ mode: 'both', fontSize: 18, theme: 'day' }), refresh() {} };
  }
  const storage = new Map();
  const context = vm.createContext({ document, window, URL, URLSearchParams, queueMicrotask,
    console: { log: s => { if (s === '[Reader v2] Initialized') coreInits++; } },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v) },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; this.targets = []; observers.push(this); }
      observe(root, options) { this.targets.push([root, options]); }
    },
    fetch() { throw new Error('no fetch permitted'); },
  });
  const runCore = () => vm.runInContext(core, context, { filename: 'EXACT-original-reader-v2.js', timeout: 1000 });
  const runAccess = () => vm.runInContext(access, context, { filename: 'reader-plain-access.js', timeout: 1000 });
  const fireReady = () => { document.readyState = 'interactive'; for (const callback of events.get('DOMContentLoaded') || []) callback(); document.readyState = 'complete'; };
  async function settle() {
    for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve));
    assert.ok(observers.every(o => !o.queued), 'mutation queues settled');
    const before = mutations, priorCallbacks = callbacks;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(mutations, before); assert.equal(callbacks, priorCallbacks, 'no idle observer loop');
  }
  return { document, window, content, paragraph, hold, youtube, audio, control, toolbar, group, head, Element, runCore, runAccess, fireReady, settle, redirects,
    coreInits: () => coreInits, counts: () => ({ mutations, callbacks }),
  };
}
