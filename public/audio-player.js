/*
 * Reader audio player.
 *
 * Detects the current reader book from the URL (/reader/{bookId}/...),
 * looks up Internet Archive audio editions from /audio-sources.json,
 * fetches the file list dynamically from https://archive.org/metadata/{identifier},
 * and renders a floating, collapsible player bar.
 *
 * No external deps. No hardcoded file URLs. Robust to items with 0 or many files.
 */
(function () {
  'use strict';

  // Only mount on /reader/<bookId>/... pages (not /reader index)
  var m = /^\/reader\/([^\/]+)(?:\/([^\/]+))?(?:\/([^\/]+))?/.exec(window.location.pathname);
  if (!m) return;
  var bookId = decodeURIComponent(m[1]);
  var part = m[2] ? decodeURIComponent(m[2]) : null;
  var torah = m[3] ? decodeURIComponent(m[3]) : null;
  if (bookId === 'index.html' || bookId === '') return;

  var AUDIO_SOURCES_URL = '/audio-sources.json';
  var IA_METADATA = 'https://archive.org/metadata/';
  var IA_DOWNLOAD = 'https://archive.org/download/';
  var SUNO_SONGS_URL = '/reader/suno-songs/' + encodeURIComponent(bookId) + '.json';

  var state = {
    editions: [],        // filtered editions for this bookId/part
    currentEdition: null,
    files: [],           // [{name, title, url}]
    currentIndex: -1,
    audio: null,
    collapsed: true,
  };

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'style' && typeof attrs[k] === 'object') {
        Object.assign(e.style, attrs[k]);
      } else if (k === 'onclick' || k === 'onchange') {
        e[k] = attrs[k];
      } else if (k === 'class') {
        e.className = attrs[k];
      } else {
        e.setAttribute(k, attrs[k]);
      }
    });
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function injectStyles() {
    if (document.getElementById('ajew-audio-player-styles')) return;
    var css = '' +
      '#ajew-audio-player{position:fixed;bottom:0;left:0;right:0;background:#1a1a1a;color:#eee;z-index:95;box-shadow:0 -2px 12px rgba(0,0,0,.4);font-family:system-ui,-apple-system,sans-serif;font-size:14px;}' +
      '#ajew-audio-player.collapsed .ajew-ap-body{display:none;}' +
      '#ajew-audio-player .ajew-ap-header{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;cursor:pointer;background:#222;}' +
      '#ajew-audio-player .ajew-ap-title{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '#ajew-audio-player .ajew-ap-toggle{background:none;border:none;color:#eee;font-size:1.2em;cursor:pointer;padding:0 .25rem;}' +
      '#ajew-audio-player .ajew-ap-body{padding:.5rem .75rem;display:flex;flex-direction:column;gap:.5rem;max-height:60vh;overflow:hidden;}' +
      '#ajew-audio-player select{background:#333;color:#eee;border:1px solid #555;padding:.3rem;border-radius:4px;width:100%;max-width:100%;}' +
      '#ajew-audio-player audio{width:100%;}' +
      '#ajew-audio-player .ajew-ap-list{overflow-y:auto;max-height:30vh;border:1px solid #333;border-radius:4px;background:#111;}' +
      '#ajew-audio-player .ajew-ap-list button{display:block;width:100%;text-align:left;background:none;border:none;color:#ccc;padding:.4rem .6rem;cursor:pointer;border-bottom:1px solid #222;font-size:.9em;}' +
      '#ajew-audio-player .ajew-ap-list button:hover{background:#222;color:#fff;}' +
      '#ajew-audio-player .ajew-ap-list button.active{background:#2a4a6a;color:#fff;font-weight:600;}' +
      '#ajew-audio-player .ajew-ap-controls{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;}' +
      '#ajew-audio-player .ajew-ap-controls button{background:#333;border:1px solid #555;color:#eee;padding:.3rem .6rem;border-radius:4px;cursor:pointer;}' +
      '#ajew-audio-player .ajew-ap-controls a{color:#9cf;text-decoration:none;font-size:.85em;}' +
      '#ajew-audio-player .ajew-ap-status{font-size:.85em;color:#999;}' +
      '.ajew-suno-segment-player{margin:.35rem 0;font-family:system-ui,-apple-system,sans-serif;}' +
      '.ajew-suno-segment-player summary{cursor:pointer;list-style:none;display:inline-flex;align-items:center;gap:.35rem;padding:.18rem .55rem;border:1px solid rgba(180,140,60,.45);border-radius:999px;background:rgba(180,140,60,.10);color:#8a5a00;font-size:.85em;font-weight:700;}' +
      '.ajew-suno-segment-player summary::-webkit-details-marker{display:none;}' +
      '.ajew-suno-segment-player summary:before{content:"▸";font-size:.8em;}' +
      '.ajew-suno-segment-player[open] summary:before{content:"▾";}' +
      '.ajew-suno-track{margin:.4rem 0;padding:.45rem;border-radius:8px;background:rgba(255,255,255,.55);max-width:600px;}' +
      '.ajew-suno-track-label{font-size:.85em;font-weight:600;margin-bottom:.2rem;}' +
      '.ajew-suno-track audio{width:100%;max-width:560px;display:block;height:32px;}' +
      '.ajew-suno-track a{font-size:.78em;color:#8a5a00;text-decoration:none;}' +
      'body.dark-mode .ajew-suno-segment-player{background:rgba(180,140,60,.12);border-color:rgba(220,180,90,.35);}' +
      'body.dark-mode .ajew-suno-track{background:rgba(255,255,255,.08);}' +
      '#ajew-audio-player .ajew-ap-launcher{position:fixed;bottom:72px;right:12px;background:#2a4a6a;color:#fff;border:none;border-radius:50%;width:48px;height:48px;font-size:1.3em;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);z-index:96;display:none;}' +
      '#ajew-audio-player-launcher.visible{display:block;}' +
      'body.dark-mode #ajew-audio-player{background:#0a0a0a;}' +
      '@media(max-width:600px){#ajew-audio-player .ajew-ap-list{max-height:25vh;}}';
    var s = document.createElement('style');
    s.id = 'ajew-audio-player-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function loadSources() {
    return fetch(AUDIO_SOURCES_URL).then(function (r) {
      if (!r.ok) throw new Error('Failed to load audio-sources.json');
      return r.json();
    });
  }

  function editionsForBook(data, bookId, part) {
    var book = data.books && data.books[bookId];
    if (!book || !book.editions) return [];
    return book.editions.filter(function (ed) {
      if (!ed.partMatch) return true;
      return part && String(ed.partMatch) === String(part);
    });
  }

  function fetchEditionFiles(identifier) {
    return fetch(IA_METADATA + encodeURIComponent(identifier)).then(function (r) {
      if (!r.ok) throw new Error('IA metadata fetch failed (' + r.status + ')');
      return r.json();
    }).then(function (meta) {
      var allFiles = meta.files || [];
      // Prefer original MP3s; if that's empty, fall back to any mp3 file.
      var originals = allFiles.filter(function (f) { return f.source === 'original' && /\.mp3$/i.test(f.name || ''); });
      var pool = originals.length ? originals : allFiles.filter(function (f) { return /\.mp3$/i.test(f.name || ''); });
      pool.sort(function (a, b) { return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }); });
      return pool.map(function (f) {
        return {
          name: f.name,
          title: (f.title && String(f.title).trim()) || f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
          url: IA_DOWNLOAD + encodeURIComponent(identifier) + '/' + encodeURIComponent(f.name),
          identifier: identifier,
        };
      });
    });
  }

  function render(container) {
    container.innerHTML = '';
    var header = el('div', { class: 'ajew-ap-header', onclick: function () { toggleCollapsed(); } }, [
      el('span', { class: 'ajew-ap-title' }, 'Audio: ' + (state.currentEdition ? state.currentEdition.name : '(select edition)')),
      el('button', {
        class: 'ajew-ap-toggle',
        'aria-label': 'Toggle audio player',
        onclick: function (e) { e.stopPropagation(); toggleCollapsed(); }
      }, state.collapsed ? '▲' : '▼'),
    ]);
    container.appendChild(header);

    var body = el('div', { class: 'ajew-ap-body' });

    // Edition selector
    var sel = el('select', {
      'aria-label': 'Select audio edition',
      onchange: function (e) { selectEdition(e.target.value); }
    });
    state.editions.forEach(function (ed, i) {
      var opt = el('option', { value: String(i) }, ed.name);
      if (state.currentEdition === ed) opt.selected = true;
      sel.appendChild(opt);
    });
    body.appendChild(sel);

    // Audio element
    var audio = el('audio', { controls: '', preload: 'none' });
    state.audio = audio;
    audio.addEventListener('ended', playNext);
    body.appendChild(audio);

    // Controls
    var status = el('span', { class: 'ajew-ap-status' }, 'Loading tracks…');
    var controls = el('div', { class: 'ajew-ap-controls' }, [
      el('button', { onclick: playPrev, 'aria-label': 'Previous track' }, '⏮ Prev'),
      el('button', { onclick: playNext, 'aria-label': 'Next track' }, 'Next ⏭'),
      status,
    ]);
    body.appendChild(controls);

    var list = el('div', { class: 'ajew-ap-list' });
    body.appendChild(list);

    container.appendChild(body);

    if (state.currentEdition) {
      loadAndRenderFiles(list, status);
    }
  }

  function toggleCollapsed() {
    state.collapsed = !state.collapsed;
    var wrap = document.getElementById('ajew-audio-player');
    if (wrap) wrap.classList.toggle('collapsed', state.collapsed);
    var toggleBtn = wrap && wrap.querySelector('.ajew-ap-toggle');
    if (toggleBtn) toggleBtn.textContent = state.collapsed ? '▲' : '▼';
  }

  function selectEdition(index) {
    var ed = state.editions[parseInt(index, 10)];
    if (!ed) return;
    state.currentEdition = ed;
    state.files = [];
    state.currentIndex = -1;
    try {
      localStorage.setItem('ajew:audio:edition:' + bookId, ed.identifier);
    } catch (e) { /* ignore */ }
    var wrap = document.getElementById('ajew-audio-player');
    render(wrap);
  }

  function loadAndRenderFiles(listEl, statusEl) {
    statusEl.textContent = 'Loading tracks…';
    fetchEditionFiles(state.currentEdition.identifier).then(function (files) {
      state.files = files;
      if (!files.length) {
        statusEl.textContent = 'No audio files available.';
        listEl.appendChild(el('div', { style: { padding: '.5rem', color: '#999' } }, 'This Internet Archive item has no MP3 files.'));
        var linkRow = el('div', { style: { padding: '.4rem' } }, [
          el('a', { href: 'https://archive.org/details/' + encodeURIComponent(state.currentEdition.identifier), target: '_blank', rel: 'noopener' }, 'View on archive.org ↗'),
        ]);
        listEl.appendChild(linkRow);
        return;
      }
      statusEl.textContent = files.length + ' track' + (files.length === 1 ? '' : 's');
      files.forEach(function (f, i) {
        var btn = el('button', { onclick: function () { playIndex(i); }, title: f.title }, (i + 1) + '. ' + f.title);
        listEl.appendChild(btn);
      });
      // add archive.org link
      listEl.appendChild(el('div', { style: { padding: '.4rem .6rem', borderTop: '1px solid #333' } }, [
        el('a', { href: 'https://archive.org/details/' + encodeURIComponent(state.currentEdition.identifier), target: '_blank', rel: 'noopener' }, 'View on archive.org ↗'),
      ]));
    }).catch(function (err) {
      statusEl.textContent = 'Error loading tracks';
      listEl.appendChild(el('div', { style: { padding: '.5rem', color: '#c77' } }, String(err.message || err)));
    });
  }

  function playIndex(i) {
    if (i < 0 || i >= state.files.length) return;
    state.currentIndex = i;
    var f = state.files[i];
    if (!state.audio) return;
    state.audio.src = f.url;
    state.audio.play().catch(function () { /* autoplay may be blocked; user can press play */ });
    // mark active
    var buttons = document.querySelectorAll('#ajew-audio-player .ajew-ap-list button');
    buttons.forEach(function (b, idx) { b.classList.toggle('active', idx === i); });
  }

  function playNext() {
    if (state.currentIndex < state.files.length - 1) playIndex(state.currentIndex + 1);
  }

  function playPrev() {
    if (state.currentIndex > 0) playIndex(state.currentIndex - 1);
  }

  function loadSegmentSongs() {
    return fetch(SUNO_SONGS_URL).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    });
  }

  function injectSegmentSongPlayers() {
    loadSegmentSongs().then(function (data) {
      if (!data || !Array.isArray(data.entries)) return;
      var matches = data.entries.filter(function (entry) {
        return (!entry.part || String(entry.part) === String(part)) &&
          (!entry.torah || String(entry.torah) === String(torah)) &&
          Array.isArray(entry.tracks) && entry.tracks.length;
      });
      function appendTrackDropdown(target, tracks, label) {
        if (!target || !tracks.length) return;
        var wrap = el('details', { class: 'ajew-suno-segment-player' });
        wrap.appendChild(el('summary', null, label + ' (' + tracks.length + ')'));
        tracks.forEach(function (track) {
          var row = el('div', { class: 'ajew-suno-track' });
          var trackLabel = (track.title || 'Suno song') + (track.source ? ' — ' + track.source : '');
          row.appendChild(el('div', { class: 'ajew-suno-track-label' }, trackLabel));
          row.appendChild(el('audio', { controls: '', preload: 'none', src: track.url }));
          row.appendChild(el('a', { href: track.url, target: '_blank', rel: 'noopener' }, 'Archive.org MP3 ↗'));
          wrap.appendChild(row);
        });
        target.appendChild(wrap);
      }

      matches.forEach(function (entry) {
        var seg = document.getElementById('seg-' + entry.segment) || document.getElementById('segment-' + entry.segment);
        if (!seg || seg.querySelector('.ajew-suno-segment-player')) return;
        var hebrewTracks = entry.tracks.filter(function (track) { return String(track.language || '').toLowerCase() === 'hebrew'; });
        var englishTracks = entry.tracks.filter(function (track) { return String(track.language || '').toLowerCase() === 'english'; });
        var otherTracks = entry.tracks.filter(function (track) {
          var lang = String(track.language || '').toLowerCase();
          return lang !== 'hebrew' && lang !== 'english';
        });
        var heTarget = seg.querySelector('.segment-he') || seg.querySelector('[dir="rtl"]') || seg;
        var enTarget = seg.querySelector('.segment-en') || seg.querySelector('[dir="ltr"]') || seg;
        appendTrackDropdown(heTarget, hebrewTracks, 'Hebrew songs for this teaching');
        appendTrackDropdown(enTarget, englishTracks, 'English songs for this teaching');
        appendTrackDropdown(enTarget, otherTracks, 'Songs for this teaching');
      });
    }).catch(function (err) {
      if (window.console && console.warn) console.warn('[suno-segment-player]', err);
    });
  }

  function init() {
    injectStyles();
    injectSegmentSongPlayers();
    loadSources().then(function (data) {
      var editions = editionsForBook(data, bookId, part);
      if (!editions.length) return; // nothing to mount
      state.editions = editions;
      // restore previously chosen edition
      var saved = null;
      try { saved = localStorage.getItem('ajew:audio:edition:' + bookId); } catch (e) {}
      state.currentEdition = editions.find(function (e) { return e.identifier === saved; }) || editions[0];

      var wrap = el('div', { id: 'ajew-audio-player', class: 'collapsed' });
      document.body.appendChild(wrap);
      render(wrap);
    }).catch(function (err) {
      // silent fail - don't break the reader page
      if (window.console && console.warn) console.warn('[audio-player]', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
