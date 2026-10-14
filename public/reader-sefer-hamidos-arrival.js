// Sefer Hamidos Original fragment arrival only. Never change text, preferences or selection.
(function () {
  'use strict';
  const key = '__ajewSeferHamidosArrival';
  if (window[key]) return;
  const route = /^\/reader\/sefer-hamidos\/1\/([1-9]\d{0,15})\/?$/;
  const fragment = /^#seg-([1-9]\d{0,15})$/;
  const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'input', 'click'];
  const budgetMs = 10000;
  const maxChecks = 48;
  let active = null;
  let disposed = false;
  let suspended = false;
  let waitingCancelled = false;
  function stopWaiting() {
    inputEvents.forEach(type => window.removeEventListener(type, waitingInput, true));
  }
  function waitingInput(event) {
    if (!event.isTrusted) return;
    waitingCancelled = true;
    stopWaiting();
  }
  function ready() {
    stopWaiting();
    if (!waitingCancelled) start();
  }

  function canonicalNumber(value) {
    return Number.isSafeInteger(Number(value)) && String(Number(value)) === value;
  }

  function owner() {
    const path = window.location.pathname.match(route);
    const hash = window.location.hash.match(fragment);
    if (!path || !hash || !canonicalNumber(path[1]) || !canonicalNumber(hash[1])) return null;
    const containers = document.querySelectorAll('.reader-container');
    if (containers.length !== 1) return null;
    const container = containers[0];
    if (container.dataset.torahId !== 'sh-' + path[1]) return null;
    const original = container.querySelector('.reader-content-original');
    const pair = document.getElementById('seg-' + hash[1]);
    if (!original || !pair || !pair.isConnected || pair.parentElement !== original ||
        !pair.classList.contains('reader-segment-pair') ||
        document.querySelectorAll('[id="' + pair.id + '"]').length !== 1) return null;
    return { container, original, pair, hash: window.location.hash, path: window.location.pathname };
  }

  function visible(element) {
    for (let el = element; el; el = el.parentElement) {
      const css = window.getComputedStyle(el);
      if (el.hidden || css.display === 'none' || css.visibility === 'hidden' ||
          css.visibility === 'collapse' || css.opacity === '0') return false;
    }
    return true;
  }

  // Text Range fragments, not the multi-screen pair's bounding box. display:contents
  // wrappers intentionally have no rectangle. DOM order is HE then EN in this book;
  // the winning language CSS, including stored prefs, decides what is visible.
  function firstSourceLine(pair) {
    let firstLine = null;
    for (const field of pair.children) {
      if (!field.classList.contains('reader-segment') ||
          !(field.classList.contains('segment-he') || field.classList.contains('segment-en')) ||
          field.classList.contains('empty-translation') || !visible(field)) continue;
      const p = field.querySelector('p');
      if (!p || !visible(p)) continue;
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const offset = node.textContent.search(/\S/);
        const parent = node.parentElement;
        if (offset < 0 || !parent || parent.closest('.ajew-segment-actions') || !visible(parent)) continue;
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(p, p.childNodes.length);
        const rects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0);
        if (!rects.length) continue;
        const first = rects[0];
        // Bidi fragments on the same first line must all be horizontally reachable.
        const line = rects.filter(r => Math.abs(r.top - first.top) < 1);
        const candidate = { top: first.top, bottom: Math.max(...line.map(r => r.bottom)),
          left: Math.min(...line.map(r => r.left)), right: Math.max(...line.map(r => r.right)) };
        if (!firstLine || candidate.top < firstLine.top) firstLine = candidate;
        break;
      }
    }
    return firstLine;
  }

  function readingBand(container) {
    let top = 0;
    let bottom = window.innerHeight;
    const chrome = [document.querySelector('.mobile-header'), document.querySelector('.navbar'),
      container.querySelector('.reader-toolbar'), container.querySelector('.reader-search-bar')];
    for (const el of chrome) {
      if (!el || !visible(el)) continue;
      const css = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (!rect.height || !(css.position === 'fixed' || css.position === 'sticky')) continue;
      if (css.position === 'fixed') {
        if (rect.top <= top + 1 && rect.bottom > top) top = rect.bottom;
      } else {
        const inset = parseFloat(css.top);
        // A not-yet-stuck toolbar will stick after a distant fragment jump.
        if (Number.isFinite(inset)) top = Math.max(top, inset + rect.height);
      }
    }
    const tabbar = document.querySelector('.mobile-tabbar');
    if (tabbar && visible(tabbar) && window.getComputedStyle(tabbar).position === 'fixed') {
      const rect = tabbar.getBoundingClientRect();
      if (rect.top > top && rect.bottom >= bottom - 1) bottom = rect.top;
    }
    return { top, bottom };
  }

  function stop() {
    if (!active) return;
    const session = active;
    active = null;
    clearTimeout(session.timer);
    clearTimeout(session.deadlineTimer);
    inputEvents.forEach(type => window.removeEventListener(type, session.onInput, true));
    window.removeEventListener('load', session.onLoad);
    // No observers or scroll listeners: expiry leaves ordinary reading untouched.
  }

  function start() {
    stop();
    if (disposed || suspended) return;
    const target = owner();
    if (!target) return;
    // Load can outlast the correction budget (media/fonts). Keep cancellation
    // armed while waiting, then spend the bounded correction budget after load.
    const session = { ...target, checks: 0, timer: null, deadline: Date.now() + 30000 };
    active = session;
    const current = () => {
      const fresh = owner();
      return active === session && !disposed && Date.now() < session.deadline &&
        fresh && fresh.pair === session.pair && fresh.container === session.container &&
        fresh.hash === session.hash && fresh.path === session.path;
    };
    function schedule(delay) {
      if (!current()) { if (active === session) stop(); return; }
      clearTimeout(session.timer);
      session.timer = setTimeout(check, delay);
    }
    function check() {
      if (!current()) { if (active === session) stop(); return; }
      if (document.readyState !== 'complete') { schedule(200); return; }
      if (++session.checks > maxChecks) { stop(); return; }
      try {
        const line = firstSourceLine(session.pair);
        const band = readingBand(session.container);
        if (line && band.bottom - band.top > line.bottom - line.top + 24) {
          const dy = line.top < band.top + 8 || line.bottom > band.bottom - 8
            ? line.top - (band.top + 12) : 0;
          const width = window.innerWidth;
          let dx = 0;
          if (line.right - line.left <= width - 16) {
            if (line.left < 8) dx = line.left - 8;
            else if (line.right > width - 8) dx = line.right - (width - 8);
          }
          if (Math.abs(dy) > 1 || Math.abs(dx) > 1) {
            window.scrollTo({ top: Math.max(0, window.scrollY + dy),
              left: window.scrollX + dx, behavior: 'instant' });
          }
        }
      } catch (_) { stop(); return; } // Unsupported/missing geometry fails closed.
      if (session.checks >= maxChecks) stop();
      else schedule(200);
    }
    session.onInput = event => { if (event.isTrusted) stop(); };
    inputEvents.forEach(type => window.addEventListener(type, session.onInput, { capture: true, passive: true }));
    session.deadlineTimer = setTimeout(() => { if (active === session) stop(); }, 30000);
    // Shared startup scrolls at 300ms, then after load/fonts and two frames. An
    // owned delayed check follows them without modifying/cancelling shared code.
    session.onLoad = () => {
      const ready = document.fonts ? document.fonts.ready : Promise.resolve();
      Promise.resolve(ready).then(() => {
        if (!current()) return;
        session.deadline = Date.now() + budgetMs;
        clearTimeout(session.deadlineTimer);
        session.deadlineTimer = setTimeout(() => { if (active === session) stop(); }, budgetMs);
        schedule(100);
      }, () => {});
    };
    if (document.readyState === 'complete') session.onLoad();
    else window.addEventListener('load', session.onLoad, { once: true });
    schedule(350);
  }

  function pagehide(event) {
    if (!event.persisted) { dispose(); return; }
    // BFCache preserves this document and script. End old startup/session work,
    // but keep one future hash service and its idempotence marker.
    suspended = true;
    waitingCancelled = true;
    stop();
    stopWaiting();
    document.removeEventListener('DOMContentLoaded', ready);
  }

  function pageshow() {
    // Resume service only: never correct the old anchor or restored reading.
    suspended = false;
  }

  function dispose() {
    disposed = true;
    stop();
    stopWaiting();
    document.removeEventListener('DOMContentLoaded', ready);
    document.removeEventListener('astro:before-swap', dispose);
    window.removeEventListener('hashchange', start);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', pageshow);
    delete window[key];
  }

  // Bind only a genuine book document, not other Readers with similar markup.
  if (!route.test(window.location.pathname)) return;
  window[key] = true;
  window.addEventListener('hashchange', start);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', pageshow);
  document.addEventListener('astro:before-swap', dispose, { once: true });
  if (document.readyState === 'loading') {
    inputEvents.forEach(type => window.addEventListener(type, waitingInput, { capture: true, passive: true }));
    document.addEventListener('DOMContentLoaded', ready, { once: true });
  } else start();
})();
