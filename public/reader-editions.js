/* General Tanach Reader only. Edition selection and optional paint are independent.
 * The original DOM nodes stay owned by the generic Reader (notes/share/bookmarks).
 * No source/cache writes, source normalization or inferred classifications. */
(function () {
  'use strict';
  var route = location.pathname.match(/^\/reader\/(tanach-[a-z0-9-]+)\/1\/(\d+)\/?$/);
  if (!route) return;
  document.addEventListener('ajew-reader-ready', function () {
    var api = window.AjewReader, adapter = window.AjewReaderSourceExact, renderer = window.AjewMarkedHebrew;
    var content = document.querySelector('.reader-content'), anchor = document.getElementById('btn-nikud');
    if (!api || !adapter || !renderer || !content || !anchor) return;
    var KEY = 'ajew-reader-edition-v2', saved = {}, edition = 'original', special = false;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && saved.version === 2) { edition = saved.edition === 'uxlc' ? 'uxlc' : 'original'; special = saved.special === true; }
      // Legacy 1 meant paint AND an undisclosed edition swap. Migrate paint only.
      else special = localStorage.getItem('ajew-special-nikud') === '1';
    } catch (_) {}
    var requested = new URL(location.href).searchParams.get('edition');
    if (requested === 'uxlc' || requested === 'original') edition = requested;
    var originals = Array.from(content.childNodes), rows = Array.from(content.querySelectorAll('.segment-he[data-index]')).map(function (el) {
      var p = el.querySelector('p[data-nikud]');
      return { index: +el.dataset.index, p: p, text: p.getAttribute('data-nikud'), bare: p.getAttribute('data-bare') };
    });
    var toc = document.querySelector('.reader-toc-list'), originalToc = toc ? Array.from(toc.childNodes) : [];
    var loaded = null, pending = null, failed = false, mounted = 'original', alternative = [];
    var panel = document.createElement('section'); panel.className = 'reader-edition-controls'; panel.setAttribute('aria-label', 'Hebrew edition and special nikud');
    panel.innerHTML = '<div class="reader-edition-buttons"><button type="button" class="reader-btn" data-edition="original">Original Hebrew</button><button type="button" class="reader-btn" data-edition="uxlc">UXLC annotated alternative</button><button type="button" class="reader-btn" id="btn-reader-special">Special nikud: off</button><button type="button" class="reader-btn" id="reader-edition-retry" hidden>Retry metadata</button><a class="reader-btn" href="/reader/tikkun?b=' + route[1] + '&amp;c=' + route[2] + '">Tikun Korim</a></div><p id="reader-edition-status" role="status"></p><details><summary>Edition and mark details</summary><p>Original Hebrew keeps its exact source pointing and punctuation. Only whole source-matched verses can borrow recorded classifications; unmatched verses stay plain. Special marks use the dedicated Taamey Frank face while active; your chosen font is retained for plain text.</p><p>UXLC is a different Hebrew edition, not corrected Original text. Its pointing, punctuation and reading (qere, underlined) can differ. The internal maqaf in Psalms 67:2 (יָ֤אֵ֥־ר) is an editorial UXLC choice, not an inserted renderer hyphen. No aligned English is available for this alternative. Recorded annotations are not a claim that every mark has been classified.</p></details>';
    document.querySelector('.reader-toolbar').insertAdjacentElement('afterend', panel);
    var status = panel.querySelector('#reader-edition-status'), toggle = panel.querySelector('#btn-reader-special'), retry = panel.querySelector('#reader-edition-retry');
    function save() { try { localStorage.setItem(KEY, JSON.stringify({version: 2, edition: edition, special: special})); } catch (_) {} }
    function setEdition(next) {
      edition = next; save();
      var url = new URL(location.href); url.searchParams.set('edition', edition);
      history.replaceState(history.state, '', url);
      refresh();
    }
    panel.querySelectorAll('[data-edition]').forEach(function (b) { b.addEventListener('click', function () { setEdition(b.dataset.edition); }); });
    toggle.addEventListener('click', function () { special = !special; save(); refresh(); });
    retry.addEventListener('click', function () { failed = false; refresh(); });
    function fetchJson(url) { return fetch(url).then(function (r) { if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); }); }
    function load() {
      if (loaded || pending || failed || (edition === 'original' && !special)) return;
      pending = Promise.all([route[1] === 'tanach-tehillim' ? window.AjewPsalmsData.load() : fetchJson('/reader/medooyuk/' + route[1] + '.json'), fetchJson('/reader-source-tails.json?v=1')]).then(function (all) {
        loaded = adapter.prepare(all[0].ch[route[2]], route[1], route[2], all[1]);
        pending = null; refresh(); // Read CURRENT intent; never resurrect a stale edition.
      }).catch(function () { pending = null; failed = true; refresh(); });
    }
    function mount() {
      var target = edition === 'original' ? 'original' : loaded ? 'uxlc' : 'unavailable';
      if (target === mounted) return;
      content.replaceChildren();
      if (toc) toc.replaceChildren();
      alternative = [];
      if (target === 'original') {
        content.append.apply(content, originals);
        if (toc) toc.append.apply(toc, originalToc);
      } else if (target === 'uxlc') {
        loaded.forEach(function (v) {
          var pair = document.createElement('div'); pair.className = 'reader-segment-pair'; pair.id = 'seg-' + v.index;
          var seg = document.createElement('div'); seg.className = 'reader-segment segment-he'; seg.dataset.index = v.index; seg.lang = 'he'; seg.dir = 'rtl';
          var num = document.createElement('span'); num.className = 'segment-number'; num.textContent = v.index;
          var p = document.createElement('p'); p.dataset.nikud = adapter.text(v);
          seg.append(num, p); pair.append(seg); content.append(pair); alternative.push({p: p, verse: v});
          if (toc) { var li = document.createElement('li'), a = document.createElement('a'); a.href = '#seg-' + v.index; a.dataset.index = v.index; a.textContent = v.index; li.append(a); toc.append(li); }
        });
        api.setupSegmentShareActions();
      }
      mounted = target;
    }
    function paint(state, query) {
      mount();
      var searching = String(query || '').trim().length >= 2, effective = special && state.nikud && !searching;
      content.dataset.hebrewEdition = edition;
      if (edition === 'uxlc') {
        content.classList.remove('mode-english', 'mode-both'); content.classList.add('mode-hebrew');
        alternative.forEach(function (row) {
          if (!searching) row.p.innerHTML = renderer.renderVerse(state.nikud ? row.verse : {t: row.verse.t.map(adapter.bare), k: row.verse.k, m: []}, {specialNikud: effective});
          else row.p.textContent = state.nikud ? adapter.text(row.verse) : adapter.bare(adapter.text(row.verse));
          // No font override while emphasis is off; preserve the user's font choice.
          if (!effective) row.p.querySelectorAll('.marked-hebrew').forEach(function (s) { s.classList.remove('marked-hebrew'); });
        });
      }
      var attached = adapter.chapter(rows.map(function (r) { return {index: r.index, text: r.text}; }), loaded || []);
      if (edition === 'original') rows.forEach(function (r, i) {
        if (effective && attached[i].verse) r.p.innerHTML = renderer.renderVerse(attached[i].verse);
        else r.p.textContent = state.nikud ? r.text : r.bare === null ? adapter.bare(r.text) : r.bare;
      });
      panel.querySelectorAll('[data-edition]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.edition === edition)); });
      toggle.textContent = 'Special nikud: ' + (special ? 'on' : 'off'); toggle.setAttribute('aria-pressed', String(special));
      retry.hidden = !failed; retry.textContent = edition === 'uxlc' ? 'Retry edition' : 'Retry metadata';
      document.querySelectorAll('[data-mode]').forEach(function (b) {
        b.disabled = edition === 'uxlc'; b.classList.toggle('active', b.dataset.mode === (edition === 'uxlc' ? 'hebrew' : state.mode));
      });
      var message;
      if (edition === 'uxlc') message = loaded ? 'UXLC annotated alternative: ' + loaded.length + ' available verses. English unavailable; Original Hebrew retains bilingual text.' : failed ? 'UXLC alternative unavailable. No alternate text is displayed. Choose Original Hebrew or retry.' : 'Loading UXLC alternative… Original Hebrew remains available.';
      else message = !special ? 'Original Hebrew — unchanged source. Special nikud is optional; source matching is checked when enabled.' : failed ? 'Special nikud metadata unavailable. Original text is retained; retry is available.' : !loaded ? 'Checking source-exact special nikud; Original text is retained.' : 'Special nikud: ' + attached.filter(function (a) { return a.verse; }).length + '/' + rows.length + ' source-matched verses. Unmatched verses remain plain; no pointing is replaced.';
      if (special && !state.nikud) message += ' Emphasis is paused in bare mode; enable Nikud to see marks.';
      if (searching) message += ' Search uses the displayed edition’s plain text; special marks resume when cleared.';
      status.textContent = message;
    }
    function refresh() { load(); api.refresh(); }
    window.AjewReaderEdition = {
      paint: paint,
      edition: function () { return edition; },
      label: function () { return edition === 'uxlc' ? 'UXLC annotated alternative' : 'Original Hebrew'; },
      segmentText: function (seg) {
        var state = api.getState(), parts = [];
        if (edition === 'uxlc' || state.mode !== 'english') { var he = seg.querySelector('.segment-he p'); if (he) parts.push(he.textContent); }
        if (edition !== 'uxlc' && state.mode !== 'hebrew') { var en = seg.querySelector('.segment-en p'); if (en) parts.push(en.textContent); }
        return parts.join('\n\n');
      }
    };
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) {
        if (route[1] === 'tanach-tehillim' && !pending) { loaded = null; failed = false; mounted = ''; }
        refresh();
      }
    });
    setEdition(edition);
  }, {once: true});
})();
