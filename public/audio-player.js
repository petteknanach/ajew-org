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


  function shareUrlFor(url) {
    return url || window.location.href;
  }

  function shareMedia(title, url) {
    var shareUrl = shareUrlFor(url);
    var shareTitle = title || document.title || 'A Jew media';
    var text = shareTitle + ' — ajew.org';
    if (navigator.share) {
      navigator.share({ title: shareTitle, text: text, url: shareUrl }).catch(function () {});
      return;
    }
    var msg = text + '\n' + shareUrl;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).catch(function () { window.prompt('Copy link:', msg); });
    } else {
      window.prompt('Copy link:', msg);
    }
  }

  function shareButton(title, url, label) {
    return el('button', { class: 'ajew-media-share-btn', title: 'Share this media', onclick: function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      shareMedia(typeof title === 'function' ? title() : title, typeof url === 'function' ? url() : url);
    } }, label || '↗ Share');
  }

  function archiveDetailsUrl(identifier) {
    return identifier ? 'https://archive.org/details/' + encodeURIComponent(identifier) : window.location.href;
  }

  function currentMediaSrc(media) {
    return media.currentSrc || media.getAttribute('src') || media.src || '';
  }

  function addGenericMediaShareButtons(root) {
    (root || document).querySelectorAll('audio, video').forEach(function (media) {
      if (media.closest('#ajew-audio-player') || media.closest('.ajew-suno-track') || media.closest('.ajew-suno-playlist')) return;
      if (media.getAttribute('data-ajew-share-ready') === '1') return;
      media.setAttribute('data-ajew-share-ready', '1');
      var title = media.getAttribute('title') || media.closest('details')?.querySelector('summary')?.textContent || document.title;
      var btn = shareButton(title, function () { return currentMediaSrc(media) || window.location.href; }, '↗ Share media');
      var row = el('div', { class: 'ajew-generic-media-share' }, [btn]);
      if (media.nextSibling) media.parentNode.insertBefore(row, media.nextSibling);
      else media.parentNode.appendChild(row);
    });
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
      '.ajew-media-share-btn{background:#2a4a6a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:.22rem .62rem;cursor:pointer;font-size:.82em;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:.25rem;}' +
      '.ajew-media-share-btn:hover{background:#386895;color:#fff;}' +
      '#ajew-audio-player .ajew-media-share-btn{background:#333;border:1px solid #555;color:#eee;border-radius:4px;padding:.3rem .6rem;}' +
      '#ajew-audio-player .ajew-ap-status{font-size:.85em;color:#999;}' +
      '.ajew-suno-segment-player{margin:.35rem 0;font-family:system-ui,-apple-system,sans-serif;}' +
      '.ajew-suno-segment-player summary{cursor:pointer;list-style:none;display:inline-flex;align-items:center;gap:.35rem;padding:.18rem .55rem;border:1px solid rgba(180,140,60,.45);border-radius:999px;background:rgba(180,140,60,.10);color:#8a5a00;font-size:.85em;font-weight:700;}' +
      '.ajew-suno-segment-player summary:after{content:"  Play / share / rate";font-size:.78em;color:#2a4a6a;font-weight:600;}' +
      '.ajew-suno-segment-player summary::-webkit-details-marker{display:none;}' +
      '.ajew-suno-segment-player summary:before{content:"▸";font-size:.8em;}' +
      '.ajew-suno-segment-player[open] summary:before{content:"▾";}' +
      '.ajew-suno-playlist{margin:.5rem 0;padding:.45rem .6rem;border:1px solid rgba(42,74,106,.35);border-radius:10px;background:rgba(42,74,106,.08);font-family:system-ui,-apple-system,sans-serif;display:flex;gap:.45rem;align-items:center;flex-wrap:wrap;}' +
      '.ajew-suno-playlist button{background:#2a4a6a;color:#fff;border:none;border-radius:999px;padding:.22rem .65rem;cursor:pointer;font-size:.85em;font-weight:700;}' +
      '.ajew-suno-playlist select{max-width:180px;border:1px solid rgba(42,74,106,.35);border-radius:999px;padding:.18rem .45rem;background:rgba(255,255,255,.75);}' +
      '.ajew-suno-playlist-status{font-size:.82em;color:#2a4a6a;}' +
      '.ajew-suno-track{margin:.4rem 0;padding:.45rem;border-radius:8px;background:rgba(255,255,255,.55);max-width:600px;}' +
      '.ajew-suno-track-label{font-size:.85em;font-weight:600;margin-bottom:.2rem;}' +
      '.ajew-suno-rating{display:flex;align-items:center;gap:.25rem;margin:.25rem 0;flex-wrap:wrap;font-size:.85em;}' +
      '.ajew-suno-rating button{border:1px solid rgba(180,140,60,.45);background:rgba(255,255,255,.7);color:#8a5a00;border-radius:999px;padding:.12rem .38rem;cursor:pointer;font-weight:700;}' +
      '.ajew-suno-rating button.active{background:#f0b429;color:#fff;border-color:#d99900;}' +
      '.ajew-suno-rating .ajew-suno-star{font-size:1.05em;padding:.08rem .28rem;}' +
      '.ajew-suno-rating .ajew-suno-rating-status{color:#6c5a20;font-size:.9em;}' +
      '.ajew-suno-charts{width:100%;margin:.15rem 0;padding:.35rem .45rem;border-top:1px solid rgba(42,74,106,.18);}' +
      '.ajew-suno-chart-tabs{display:flex;gap:.25rem;flex-wrap:wrap;margin:.15rem 0 .35rem;}' +
      '.ajew-suno-chart-tabs button{background:rgba(42,74,106,.12);color:#2a4a6a;border:1px solid rgba(42,74,106,.25);padding:.14rem .45rem;font-size:.78em;}' +
      '.ajew-suno-chart-tabs button.active{background:#2a4a6a;color:#fff;}' +
      '.ajew-suno-chart-list{display:grid;gap:.18rem;font-size:.82em;}' +
      '.ajew-suno-chart-item{display:flex;justify-content:space-between;gap:.5rem;border-bottom:1px dashed rgba(42,74,106,.16);padding:.12rem 0;}' +
      '.ajew-suno-chart-item a{color:#8a5a00;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.ajew-suno-chart-score{white-space:nowrap;color:#2a4a6a;font-weight:700;}' +
      '.ajew-suno-track audio{width:100%;max-width:560px;display:block;height:32px;}' +
      '.ajew-suno-track a{font-size:.78em;color:#8a5a00;text-decoration:none;}' +
      '.ajew-suno-track-links{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-top:.25rem;}' +
      '.ajew-generic-media-share{margin:.35rem 0;}' +
      'body.dark-mode .ajew-suno-segment-player{background:rgba(180,140,60,.12);border-color:rgba(220,180,90,.35);}' +
      'body.dark-mode .ajew-suno-track{background:rgba(255,255,255,.08);}' +
      '#ajew-audio-player .ajew-ap-launcher{position:fixed;bottom:72px;right:12px;background:#2a4a6a;color:#fff;border:none;border-radius:50%;width:48px;height:48px;font-size:1.3em;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);z-index:96;display:none;}' +
      '#ajew-audio-player-launcher.visible{display:block;}' +
      'body.dark-mode #ajew-audio-player{background:#0a0a0a;}' +
      '@media(max-width:700px){' +
        'body:has(#ajew-audio-player){padding-bottom:86px;}' +
        '#ajew-audio-player{font-size:13px;}' +
        '#ajew-audio-player .ajew-ap-header{padding:.45rem .55rem;}' +
        '#ajew-audio-player .ajew-ap-body{padding:.45rem .55rem;max-height:58vh;}' +
        '#ajew-audio-player .ajew-ap-list{max-height:22vh;}' +
        '.ajew-suno-playlist{display:grid;grid-template-columns:1fr 1fr;align-items:stretch;gap:.35rem;padding:.45rem;margin:.45rem 0;border-radius:14px;}' +
        '.ajew-suno-playlist button,.ajew-suno-playlist select{width:100%;min-height:42px;max-width:none;font-size:.84em;}' +
        '.ajew-suno-playlist audio,.ajew-suno-playlist .ajew-suno-charts,.ajew-suno-playlist-status{grid-column:1/-1;width:100%;}' +
        '.ajew-suno-segment-player{width:100%;max-width:100%;margin:.55rem 0;}' +
        '.ajew-suno-segment-player summary{display:flex;width:100%;box-sizing:border-box;justify-content:space-between;align-items:center;border-radius:14px;padding:.58rem .68rem;font-size:.92em;line-height:1.25;box-shadow:0 4px 14px rgba(42,74,106,.10);}' +
        '.ajew-suno-segment-player summary:after{content:"Tap to open";font-size:.74em;}' +
        '.ajew-suno-track{max-width:100%;box-sizing:border-box;padding:.58rem;margin:.42rem 0;border-radius:12px;overflow:hidden;}' +
        '.ajew-suno-track-label{font-size:.9em;line-height:1.3;overflow-wrap:anywhere;}' +
        '.ajew-suno-track audio{max-width:100%;height:38px;}' +
        '.ajew-suno-track-links{display:grid;grid-template-columns:1fr 1fr;gap:.35rem;}' +
        '.ajew-suno-track-links a,.ajew-suno-track-links .ajew-media-share-btn{min-height:36px;justify-content:center;text-align:center;box-sizing:border-box;}' +
        '.ajew-suno-rating{gap:.2rem;}' +
        '.ajew-suno-rating button{min-height:34px;min-width:34px;padding:.1rem .32rem;}' +
        '.ajew-suno-chart-item{display:grid;grid-template-columns:1fr auto;align-items:center;}' +
      '}';
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
      if (identifier === 'ajew-suno-sefer-hamidos-001') {
        // Only expose the corrected one-teaching-per-song variants; hide the retracted range/spliced batch even if IA metadata lags deletion.
        pool = pool.filter(function (f) { return /-variant-[A-Z]\.mp3$/i.test(f.name || ''); });
      }
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
      shareButton(function () {
        var f = state.files[state.currentIndex];
        return f ? f.title : (state.currentEdition ? state.currentEdition.name : 'Audio');
      }, function () {
        var f = state.files[state.currentIndex];
        return f ? f.url : archiveDetailsUrl(state.currentEdition && state.currentEdition.identifier);
      }),
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
        var linkRow = el('div', { style: { padding: '.4rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' } }, [
          el('a', { href: 'https://archive.org/details/' + encodeURIComponent(state.currentEdition.identifier), target: '_blank', rel: 'noopener' }, 'View on archive.org ↗'),
          shareButton(state.currentEdition.name, archiveDetailsUrl(state.currentEdition.identifier), '↗ Share edition'),
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
      listEl.appendChild(el('div', { style: { padding: '.4rem .6rem', borderTop: '1px solid #333', display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' } }, [
        el('a', { href: 'https://archive.org/details/' + encodeURIComponent(state.currentEdition.identifier), target: '_blank', rel: 'noopener' }, 'View on archive.org ↗'),
        shareButton(state.currentEdition.name, archiveDetailsUrl(state.currentEdition.identifier), '↗ Share edition'),
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
      function buildTrackLabel(track) {
        return (track.title || 'Suno song') + (track.source ? ' — ' + track.source : '');
      }

      function trackKey(track) {
        return String(track.url || track.archive_filename || track.title || '');
      }

      function loadRatings() {
        try { return JSON.parse(localStorage.getItem('ajew:suno:ratings') || '{}') || {}; }
        catch (e) { return {}; }
      }

      function saveRatings(ratings) {
        try { localStorage.setItem('ajew:suno:ratings', JSON.stringify(ratings)); }
        catch (e) { /* ignore */ }
      }

      function getTrackRating(track) {
        return loadRatings()[trackKey(track)] || { liked: false, rating: 0 };
      }

      function setTrackRating(track, patch) {
        var ratings = loadRatings();
        var key = trackKey(track);
        ratings[key] = Object.assign({ liked: false, rating: 0, title: track.title || '', url: track.url || '', updated: '' }, ratings[key] || {}, patch, { title: track.title || '', url: track.url || '', updated: new Date().toISOString() });
        saveRatings(ratings);
        updateAllChartPanels();
      }

      function ratingTimestampMs(item) {
        var t = Date.parse(item && item.updated || '');
        return isNaN(t) ? 0 : t;
      }

      function chartCutoff(period) {
        var now = Date.now();
        if (period === 'day') return now - 24 * 60 * 60 * 1000;
        if (period === 'week') return now - 7 * 24 * 60 * 60 * 1000;
        if (period === 'month') return now - 30 * 24 * 60 * 60 * 1000;
        return 0;
      }

      function topRatedSongs(period) {
        var cutoff = chartCutoff(period);
        return Object.keys(loadRatings()).map(function (key) {
          var item = loadRatings()[key] || {};
          item.key = key;
          item.score = (Number(item.rating) || 0) + (item.liked ? 0.75 : 0);
          item.time = ratingTimestampMs(item);
          return item;
        }).filter(function (item) {
          return item.score > 0 && (!cutoff || item.time >= cutoff);
        }).sort(function (a, b) {
          return (b.score - a.score) || (b.time - a.time);
        }).slice(0, 10);
      }

      function renderChartList(box, period) {
        var songs = topRatedSongs(period);
        box.innerHTML = '';
        if (!songs.length) {
          box.appendChild(el('div', { class: 'ajew-suno-chart-item' }, 'No rated songs yet.'));
          return;
        }
        songs.forEach(function (song, i) {
          var title = song.title || song.key || 'Suno song';
          box.appendChild(el('div', { class: 'ajew-suno-chart-item' }, [
            el('a', { href: song.url || song.key, target: '_blank', rel: 'noopener', title: title }, (i + 1) + '. ' + title),
            el('span', { class: 'ajew-suno-chart-score' }, (song.liked ? '♥ ' : '') + (song.rating ? song.rating + '/5' : 'Like'))
          ]));
        });
      }

      function updateAllChartPanels() {
        document.querySelectorAll('.ajew-suno-charts').forEach(function (panel) {
          renderChartList(panel.querySelector('.ajew-suno-chart-list'), panel.getAttribute('data-period') || 'all');
        });
      }

      function renderChartsPanel() {
        var panel = el('div', { class: 'ajew-suno-charts', 'data-period': 'all' });
        var list = el('div', { class: 'ajew-suno-chart-list' });
        var periods = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['all', 'All-time']];
        var tabs = el('div', { class: 'ajew-suno-chart-tabs' });
        periods.forEach(function (p) {
          tabs.appendChild(el('button', { class: p[0] === 'all' ? 'active' : '', onclick: function () {
            panel.setAttribute('data-period', p[0]);
            tabs.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
            this.classList.add('active');
            renderChartList(list, p[0]);
          } }, p[1]));
        });
        panel.appendChild(el('strong', null, 'Best songs'));
        panel.appendChild(tabs);
        panel.appendChild(list);
        renderChartList(list, 'all');
        return panel;
      }

      function renderRatingControls(track) {
        var wrap = el('div', { class: 'ajew-suno-rating', 'data-suno-rating': trackKey(track) });
        function refresh() {
          var pref = getTrackRating(track);
          wrap.innerHTML = '';
          var like = el('button', { class: pref.liked ? 'active' : '', title: 'Like this song', onclick: function () { setTrackRating(track, { liked: !getTrackRating(track).liked }); refresh(); } }, pref.liked ? '♥ Liked' : '♡ Like');
          wrap.appendChild(like);
          for (var n = 1; n <= 5; n++) {
            (function (rating) {
              wrap.appendChild(el('button', { class: 'ajew-suno-star' + (pref.rating >= rating ? ' active' : ''), title: 'Rate ' + rating + ' stars', onclick: function () { setTrackRating(track, { rating: rating }); refresh(); } }, '★'));
            })(n);
          }
          wrap.appendChild(el('span', { class: 'ajew-suno-rating-status' }, pref.rating ? pref.rating + '/5' : 'Rate'));
        }
        refresh();
        return wrap;
      }

      function makePlaylistLabel(track, i, total) {
        return (i + 1) + '/' + total + ': ' + (track.title || 'Suno song');
      }

      function insertPlaylistControl(matches) {
        if (document.querySelector('.ajew-suno-playlist')) return;
        var playlist = [];
        matches.forEach(function (entry) {
          entry.tracks.forEach(function (track) {
            playlist.push(Object.assign({ segment: entry.segment }, track));
          });
        });
        if (!playlist.length) return;
        var playlistIndex = 0;
        var audio = el('audio', { controls: '', preload: 'none' });
        var status = el('span', { class: 'ajew-suno-playlist-status' }, playlist.length + ' songs');
        var playlistRating = el('span');
        var langSelect = el('select', { 'aria-label': 'Playlist language' }, [
          el('option', { value: 'all' }, 'All songs'),
          el('option', { value: 'hebrew' }, 'Hebrew only'),
          el('option', { value: 'english' }, 'English only')
        ]);

        function activeList() {
          var lang = langSelect.value;
          if (lang === 'all') return playlist;
          return playlist.filter(function (track) { return String(track.language || '').toLowerCase() === lang; });
        }

        function updateStatus(trackList) {
          var list = trackList || activeList();
          if (!list.length) {
            status.textContent = 'No songs in this selection';
            return;
          }
          if (audio.src) status.textContent = makePlaylistLabel(list[playlistIndex] || list[0], playlistIndex, list.length);
          else status.textContent = list.length + ' songs';
        }

        function playPlaylistIndex(i) {
          var list = activeList();
          if (!list.length) return;
          playlistIndex = (i + list.length) % list.length;
          var track = list[playlistIndex];
          audio.src = track.url;
          playlistRating.innerHTML = '';
          playlistRating.appendChild(renderRatingControls(track));
          updateStatus(list);
          audio.play().catch(function () { /* user can press Play All again */ });
        }

        function playNextPlaylist() {
          var list = activeList();
          if (!list.length) return;
          playPlaylistIndex(playlistIndex + 1);
        }

        audio.addEventListener('ended', playNextPlaylist);
        langSelect.onchange = function () {
          playlistIndex = 0;
          audio.removeAttribute('src');
          updateStatus();
        };

        var wrap = el('div', { class: 'ajew-suno-playlist' }, [
          el('button', { onclick: function () { playPlaylistIndex(playlistIndex); } }, '▶ Play all songs'),
          el('button', { onclick: playNextPlaylist }, 'Next ⏭'),
          shareButton(function () {
            var list = activeList();
            var track = list[playlistIndex] || list[0];
            return track ? (track.title || 'Suno song') : 'Suno songs';
          }, function () {
            var list = activeList();
            var track = list[playlistIndex] || list[0];
            return track ? (track.share_url || track.url) : window.location.href;
          }, '↗ Share song'),
          langSelect,
          status,
          playlistRating,
          audio,
          renderChartsPanel()
        ]);
        var firstSeg = document.getElementById('seg-' + matches[0].segment) || document.getElementById('segment-' + matches[0].segment);
        if (firstSeg && firstSeg.parentNode) firstSeg.parentNode.insertBefore(wrap, firstSeg);
      }

      function appendTrackDropdown(target, tracks, label) {
        if (!target || !tracks.length) return;
        var wrap = el('details', { class: 'ajew-suno-segment-player' });
        wrap.appendChild(el('summary', null, label + ' (' + tracks.length + ')'));
        tracks.forEach(function (track) {
          var row = el('div', { class: 'ajew-suno-track' });
          row.appendChild(el('div', { class: 'ajew-suno-track-label' }, buildTrackLabel(track)));
          row.appendChild(renderRatingControls(track));
          row.appendChild(el('audio', { controls: '', preload: 'none', src: track.url, title: buildTrackLabel(track) }));
          row.appendChild(el('div', { class: 'ajew-suno-track-links' }, [
            el('a', { href: track.url, target: '_blank', rel: 'noopener' }, 'Archive.org MP3 ↗'),
            shareButton(buildTrackLabel(track), track.share_url || track.url, '↗ Share song')
          ]));
          wrap.appendChild(row);
        });
        target.appendChild(wrap);
      }

      insertPlaylistControl(matches);

      matches.forEach(function (entry) {
        var seg = document.getElementById('seg-' + entry.segment) || document.getElementById('segment-' + entry.segment);
        if (!seg || seg.querySelector('.ajew-suno-segment-player')) return;
        var allTracks = entry.tracks.slice().sort(function (a, b) {
          var order = { hebrew: 1, english: 2, bilingual: 3 };
          return (order[String(a.language || '').toLowerCase()] || 9) - (order[String(b.language || '').toLowerCase()] || 9) ||
            String(a.title || '').localeCompare(String(b.title || ''), undefined, { numeric: true, sensitivity: 'base' });
        });
        var target = seg.querySelector('.segment-en') || seg.querySelector('[dir="ltr"]') || seg.querySelector('.segment-he') || seg.querySelector('[dir="rtl"]') || seg;
        appendTrackDropdown(target, allTracks, 'Songs for this teaching / שירים ללימוד זה');
      });

      (function autoOpenSharedSong() {
        var wanted = '';
        try { wanted = new URLSearchParams(window.location.search).get('song') || ''; } catch (e) {}
        if (!wanted) return;
        wanted = decodeURIComponent(wanted).toLowerCase();
        var track = Array.prototype.find.call(document.querySelectorAll('.ajew-suno-track'), function (row) {
          var href = row.querySelector('a[href*="archive.org/download"]');
          return href && decodeURIComponent(href.href.split('/').pop()).toLowerCase() === wanted;
        });
        if (!track) return;
        var details = track.closest('.ajew-suno-segment-player');
        if (details) details.open = true;
        setTimeout(function () {
          track.scrollIntoView({ behavior: 'smooth', block: 'center' });
          track.style.outline = '2px solid #f0b429';
          setTimeout(function () { track.style.outline = ''; }, 3500);
        }, 250);
      })();
    }).catch(function (err) {
      if (window.console && console.warn) console.warn('[suno-segment-player]', err);
    });
  }

  function init() {
    injectStyles();
    addGenericMediaShareButtons(document);
    var shareObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) { m.addedNodes && m.addedNodes.forEach(function (n) { if (n.nodeType === 1) addGenericMediaShareButtons(n); }); });
    });
    shareObserver.observe(document.body, { childList: true, subtree: true });
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
