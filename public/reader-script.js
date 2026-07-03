/**
 * AJEW.ORG - Sefaria-Style Text Reader
 * Client-side interactive logic for the bilingual text reader.
 */

(function() {
  'use strict';

  // --- Accessibility: ensure Hebrew elements have lang attribute ---
  document.querySelectorAll('.segment-he:not([lang]), .hebrew-title:not([lang])').forEach(function(el) {
    el.setAttribute('lang', 'he');
    if (!el.getAttribute('dir')) el.setAttribute('dir', 'rtl');
  });

  // --- English-friendly numbering ---
  // Some older reader JSON titles are only Hebrew siman letters (e.g. לו). Keep
  // the Hebrew in .hebrew-title, but make the visible English title readable for
  // English users by showing the regular URL number.
  function isHebrewOnlyNumber(text) {
    const t = (text || '').trim().replace(/[\s.\-–—:()\[\]״"׳'›‹>]+/g, '');
    return !!t && /^[\u05D0-\u05EA]+$/.test(t) && t.length <= 6;
  }

  function getReaderUrlNumber() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    return /^\d+$/.test(last) ? last : '';
  }

  function fixEnglishReaderNumbers() {
    const n = getReaderUrlNumber();
    if (!n) return;
    const h1 = document.querySelector('.reader-header h1');
    if (h1 && isHebrewOnlyNumber(h1.textContent)) h1.textContent = 'Section ' + n;

    const container = document.querySelector('.reader-container');
    if (container) {
      const title = container.getAttribute('data-torah-title') || '';
      if (isHebrewOnlyNumber(title.split(' - ')[0])) {
        container.setAttribute('data-torah-title', title.replace(/^\s*[^-]+/, 'Section ' + n));
      }
    }

    const crumb = document.querySelector('.reader-breadcrumb');
    if (crumb) {
      const walker = document.createTreeWalker(crumb, NodeFilter.SHOW_TEXT);
      let node, lastText = null;
      while ((node = walker.nextNode())) lastText = node;
      if (lastText && isHebrewOnlyNumber(lastText.textContent)) lastText.textContent = ' Section ' + n;
    }

    if (document.title && isHebrewOnlyNumber(document.title.split(' - ')[0])) {
      document.title = document.title.replace(/^\s*[^-]+/, 'Section ' + n);
    }
  }
  fixEnglishReaderNumbers();

  // --- State ---
  const PREFS_KEY = 'ajew-reader-prefs';
  let state = {
    mode: 'hebrew',       // 'hebrew' | 'english' | 'both'
    nikud: false,         // Show nikud (vowel marks) - off by default
    fontSize: 18,
    fontFamily: "frank",
    theme: 'day',         // 'day' | 'sepia' | 'night'
    fullscreen: false,
    tocOpen: false,
    searchOpen: false,
    bookmarks: {}
  };

  // Load saved preferences
  function loadPrefs() {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) { /* ignore */ }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  // --- Nikud Toggle ---
  function stripNikud(text) {
    return text.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
  }

  function applyNikud() {
    document.querySelectorAll('.segment-he [data-nikud]').forEach(el => {
      const original = el.getAttribute('data-nikud');
      el.textContent = state.nikud ? original : stripNikud(original);
    });
    // Update button state
    const btn = document.getElementById('btn-nikud');
    if (btn) btn.classList.toggle('active', state.nikud);
  }

  // --- Language Mode ---
  function applyMode() {
    const content = document.querySelector('.reader-content');
    if (!content) return;
    content.classList.remove('mode-hebrew', 'mode-english', 'mode-both');
    content.classList.add('mode-' + state.mode);

    // Three-view system: swap content for "both" mode if aligned_segments available
    var alignedEl = document.getElementById('aligned-segments-data');
    var originalContent = document.querySelector('.reader-content-original');
    var alignedContent = document.querySelector('.reader-content-aligned');

    if (alignedEl && alignedContent) {
      if (state.mode === 'both') {
        // Show aligned version, hide original
        if (originalContent) originalContent.style.display = 'none';
        alignedContent.style.display = 'block';
        content.classList.add('mode-both');
      } else {
        // Show original, hide aligned
        if (originalContent) originalContent.style.display = 'block';
        alignedContent.style.display = 'none';
      }
    }

    // Update buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });
  }

  // --- Font Controls ---
  var FONT_OPTIONS = {
    'frank': { label: 'Frank Ruhl', family: "'Frank Ruhl Libre', serif" },
    'taamey': { label: 'Taamey Frank', family: "'Taamey Frank CLM', serif" },
    'keter': { label: 'Keter YG', family: "'Keter YG', serif" },
    'david': { label: 'David Libre', family: "'David Libre', serif" },
    'noto': { label: 'Noto Serif', family: "'Noto Serif Hebrew', serif" },
    'suez': { label: 'Suez One', family: "'Suez One', serif" },
    'drugulin': { label: 'Drugulin', family: "'Drugulin CLM', serif" },
    'stam': { label: 'Shlomo Stam', family: "'Shlomo Stam', serif" },
    'heebo': { label: 'Heebo', family: "'Heebo', sans-serif" },
    'assistant': { label: 'Assistant', family: "'Assistant', sans-serif" },
    'rubik': { label: 'Rubik', family: "'Rubik', sans-serif" },
  };

  function applyFontFamily() {
    var container = document.querySelector('.reader-container');
    if (!container) return;
    var opt = FONT_OPTIONS[state.fontFamily] || FONT_OPTIONS['frank'];
    container.style.setProperty('--reader-font-family', opt.family);
    // Update selector if exists
    var sel = document.getElementById('font-family-select');
    if (sel) sel.value = state.fontFamily;
  }

  function applyFontSize() {
    const container = document.querySelector('.reader-container');
    if (container) {
      container.style.setProperty('--reader-font-size', state.fontSize + 'px');
    }
    const slider = document.getElementById('font-size-slider');
    if (slider) slider.value = state.fontSize;
  }

  // --- Theme ---
  function applyTheme() {
    const container = document.querySelector('.reader-container');
    if (!container) return;
    container.removeAttribute('data-theme');
    if (state.theme === 'sepia') container.setAttribute('data-theme', 'sepia');
    if (state.theme === 'night') container.setAttribute('data-theme', 'night');

    document.querySelectorAll('[data-theme-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeBtn === state.theme);
    });
  }

  // --- Fullscreen ---
  function toggleFullscreen() {
    state.fullscreen = !state.fullscreen;
    const container = document.querySelector('.reader-container');
    const navbar = document.querySelector('.navbar');
    const footer = document.querySelector('footer');

    if (container) container.classList.toggle('fullscreen', state.fullscreen);
    if (navbar) navbar.style.display = state.fullscreen ? 'none' : '';
    if (footer) footer.style.display = state.fullscreen ? 'none' : '';

    const btn = document.getElementById('btn-fullscreen');
    if (btn) btn.textContent = state.fullscreen ? 'Exit Fullscreen' : 'Fullscreen';
  }

  // --- Progress Bar ---
  function updateProgress() {
    const bar = document.querySelector('.reader-progress');
    if (!bar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = progress + '%';
  }

  // --- TOC ---
  function toggleToc() {
    state.tocOpen = !state.tocOpen;
    const toc = document.querySelector('.reader-toc');
    if (toc) toc.classList.toggle('open', state.tocOpen);
  }

  // --- In-text Search ---
  function toggleSearch() {
    state.searchOpen = !state.searchOpen;
    const bar = document.querySelector('.reader-search-bar');
    if (bar) {
      bar.classList.toggle('open', state.searchOpen);
      if (state.searchOpen) {
        const input = bar.querySelector('input');
        if (input) input.focus();
      } else {
        clearSearchHighlights();
      }
    }
  }

  function clearSearchHighlights() {
    document.querySelectorAll('.search-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
  }

  function performSearch(query) {
    clearSearchHighlights();
    if (!query || query.length < 2) {
      updateSearchInfo('');
      return;
    }

    let count = 0;
    const segments = document.querySelectorAll('.reader-segment p');
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedQuery, 'gi');

    segments.forEach(p => {
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;
      while (node = walker.nextNode()) textNodes.push(node);

      textNodes.forEach(textNode => {
        const text = textNode.textContent;
        if (!regex.test(text)) return;
        regex.lastIndex = 0;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        let match;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
          }
          const mark = document.createElement('span');
          mark.className = 'search-highlight';
          mark.textContent = match[0];
          frag.appendChild(mark);
          count++;
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }
        textNode.parentNode.replaceChild(frag, textNode);
      });
    });

    updateSearchInfo(count > 0 ? `${count} found` : 'No results');

    // Scroll to first match
    const first = document.querySelector('.search-highlight');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function updateSearchInfo(text) {
    const info = document.querySelector('.search-info');
    if (info) info.textContent = text;
  }

  // --- Bookmark ---
  function saveBookmark() {
    const torahId = document.querySelector('.reader-container')?.dataset.torahId;
    if (!torahId) return;

    state.bookmarks[torahId] = {
      scrollY: window.scrollY,
      timestamp: Date.now(),
      url: window.location.pathname,
      title: document.title.replace(' | A Jew', '')
    };
    savePrefs();

    const btn = document.getElementById('btn-bookmark');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Saved!';
      btn.classList.add('active');
      setTimeout(() => {
        btn.textContent = orig;
        btn.classList.remove('active');
      }, 1500);
    }
  }

  function restoreBookmark() {
    const torahId = document.querySelector('.reader-container')?.dataset.torahId;
    if (!torahId || !state.bookmarks[torahId]) return;
    window.scrollTo({ top: state.bookmarks[torahId].scrollY, behavior: 'smooth' });
  }

  // --- Copy with Attribution ---
  function setupCopyAttribution() {
    document.addEventListener('copy', (e) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const container = document.querySelector('.reader-container');
      if (!container || !container.contains(selection.anchorNode)) return;

      const torahTitle = container.dataset.torahTitle || '';
      const torahId = container.dataset.torahId || '';
      const attribution = `\n\n--- ${torahTitle} (${torahId}) - ajew.org/reader ---`;

      const text = selection.toString() + attribution;
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
    });
  }

  // --- Keyboard Shortcuts ---
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case '?':
          toggleShortcuts();
          break;
        case 'h':
          setState('mode', 'hebrew');
          break;
        case 'e':
          setState('mode', 'english');
          break;
        case 'b':
          setState('mode', 'both');
          break;
        case 'n':
          setState('nikud', !state.nikud);
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleSearch();
          } else {
            toggleFullscreen();
          }
          break;
        case 't':
          toggleToc();
          break;
        case 's':
          saveBookmark();
          break;
        case 'ArrowLeft': {
          const prev = document.querySelector('.reader-nav a[data-dir="prev"]');
          if (prev && !prev.classList.contains('disabled')) window.location.href = prev.href;
          break;
        }
        case 'ArrowRight': {
          const next = document.querySelector('.reader-nav a[data-dir="next"]');
          if (next && !next.classList.contains('disabled')) window.location.href = next.href;
          break;
        }
        case '+':
        case '=':
          setState('fontSize', Math.min(state.fontSize + 2, 32));
          break;
        case '-':
          setState('fontSize', Math.max(state.fontSize - 2, 12));
          break;
        case 'l':
          toggleSpeaking();
          break;
        case 'p':
          window.print();
          break;
        case 'g': {
          const favBtn = document.getElementById('btn-fav');
          if (favBtn) favBtn.click();
          break;
        }
        case 'j':
        case 'ArrowDown': {
          if (e.key === 'ArrowDown' && (e.ctrlKey || e.metaKey)) break; // Don't hijack ctrl+down
          const segs = document.querySelectorAll('.reader-segment-pair');
          const current = Array.from(segs).findIndex(s => {
            const rect = s.getBoundingClientRect();
            return rect.top >= 0 && rect.top < window.innerHeight / 2;
          });
          const next = current >= 0 && current < segs.length - 1 ? segs[current + 1] : segs[0];
          if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
        case 'k':
        case 'ArrowUp': {
          if (e.key === 'ArrowUp' && (e.ctrlKey || e.metaKey)) break;
          const segsUp = document.querySelectorAll('.reader-segment-pair');
          const curUp = Array.from(segsUp).findIndex(s => {
            const rect = s.getBoundingClientRect();
            return rect.top >= 0 && rect.top < window.innerHeight / 2;
          });
          const prev = curUp > 0 ? segsUp[curUp - 1] : segsUp[segsUp.length - 1];
          if (prev) prev.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
        case 'Escape':
          if (ttsState.speaking) stopSpeaking();
          if (state.searchOpen) toggleSearch();
          if (state.tocOpen) toggleToc();
          if (state.fullscreen) toggleFullscreen();
          closeShortcuts();
          break;
      }
    });
  }

  function toggleShortcuts() {
    const overlay = document.querySelector('.reader-shortcuts-overlay');
    if (overlay) overlay.classList.toggle('open');
  }

  function closeShortcuts() {
    const overlay = document.querySelector('.reader-shortcuts-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  // --- State Management ---
  function setState(key, value) {
    state[key] = value;
    savePrefs();
    applyAll();
  }

  function applyAll() {
    applyMode();
    applyNikud();
    applyFontSize();
    applyFontFamily();
    applyTheme();
  }

  // --- Scroll Spy for TOC ---
  function setupScrollSpy() {
    const segments = document.querySelectorAll('.reader-segment[data-index]');
    const tocLinks = document.querySelectorAll('.reader-toc-list a');
    if (!segments.length || !tocLinks.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = entry.target.dataset.index;
          tocLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.index === idx);
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    segments.forEach(seg => observer.observe(seg));
  }

  // --- Auto-advance prompt at end of page ---
  function setupAutoAdvance() {
    const nextLink = document.querySelector('.reader-nav a[data-dir="next"]:not(.disabled)');
    if (!nextLink) return;

    let shown = false;
    const banner = document.createElement('div');
    banner.className = 'auto-advance-banner';
    banner.innerHTML = `<span>Finished? </span><a href="${nextLink.href}" class="advance-link">Continue to next →</a>`;
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--reader-accent,#c4a265);color:white;text-align:center;padding:12px;font-weight:600;transform:translateY(100%);transition:transform 0.3s;z-index:50;font-size:0.95em;';
    banner.querySelector('.advance-link').style.cssText = 'color:white;text-decoration:underline;margin-left:8px;';
    document.body.appendChild(banner);

    window.addEventListener('scroll', () => {
      const scrolledToBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 200);
      if (scrolledToBottom && !shown) {
        banner.style.transform = 'translateY(0)';
        shown = true;
      } else if (!scrolledToBottom && shown) {
        banner.style.transform = 'translateY(100%)';
        shown = false;
      }
    }, { passive: true });
  }

  // --- Reading Time Estimate ---
  function addReadingTime() {
    const header = document.querySelector('.reader-header');
    if (!header) return;
    const segments = document.querySelectorAll('.reader-segment-pair');
    const totalChars = Array.from(segments).reduce((sum, seg) => {
      const he = seg.querySelector('.segment-he p')?.textContent?.length || 0;
      const en = seg.querySelector('.segment-en p')?.textContent?.length || 0;
      return sum + he + en;
    }, 0);
    // Hebrew: ~150 words/min, ~5 chars/word = ~750 chars/min
    // English: ~200 words/min, ~5 chars/word = ~1000 chars/min
    // Estimate average
    const minutes = Math.max(1, Math.round(totalChars / 850));
    const badge = document.createElement('div');
    badge.className = 'reading-time-badge';
    badge.textContent = minutes + ' min read · ' + segments.length + ' segments';
    badge.style.cssText = 'font-size:0.8em;color:var(--reader-text-secondary,#888);margin-top:8px;';
    header.appendChild(badge);
  }

  // --- Scroll Position Memory ---
  function restoreScrollPosition() {
    const key = 'ajew-scroll-' + window.location.pathname;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved && !window.location.hash) {
        const pos = parseInt(saved);
        if (pos > 100) {
          setTimeout(() => window.scrollTo(0, pos), 100);
        }
      }
    } catch(e) {}
  }

  function saveScrollPosition() {
    const key = 'ajew-scroll-' + window.location.pathname;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          try { sessionStorage.setItem(key, String(window.scrollY)); } catch(e) {}
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // --- Reading Streak ---
  function updateStreak() {
    const STREAK_KEY = 'ajew-reading-streak';
    try {
      const data = JSON.parse(localStorage.getItem(STREAK_KEY) || '{}');
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (data.lastDate === today) return; // Already counted today

      if (data.lastDate === yesterday) {
        data.streak = (data.streak || 0) + 1;
      } else if (data.lastDate !== today) {
        data.streak = 1; // Reset streak
      }
      data.lastDate = today;
      data.totalDays = (data.totalDays || 0) + 1;
      data.longestStreak = Math.max(data.longestStreak || 0, data.streak);
      localStorage.setItem(STREAK_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  // --- Reading History ---
  function saveToHistory() {
    const HISTORY_KEY = 'ajew-reading-history';
    const MAX_HISTORY = 30;
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const entry = {
        url: window.location.pathname,
        title: document.title.replace(' | A Jew', ''),
        timestamp: Date.now(),
        progress: 0
      };
      // Remove duplicate
      const filtered = history.filter(h => h.url !== entry.url);
      filtered.unshift(entry);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
    } catch (e) { /* ignore */ }

    // Update progress on scroll
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.round((window.scrollY / docHeight) * 100) : 100;
      try {
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const idx = history.findIndex(h => h.url === window.location.pathname);
        if (idx !== -1 && progress > (history[idx].progress || 0)) {
          history[idx].progress = progress;
          localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        }
      } catch(e) {}
    }, { passive: true });
  }

  // --- Initialize ---
  function init() {
    loadPrefs();
    applyAll();
    restoreBookmark();
    setupCopyAttribution();
    setupKeyboard();
    setupScrollSpy();
    setupNotes();
    saveToHistory();
    updateStreak();
    restoreScrollPosition();
    saveScrollPosition();
    addReadingTime();
    setupAutoAdvance();
    setupRelatedTeachings();

    // Add "Report Typo" link at bottom
    const lastNav = document.querySelectorAll('.reader-nav');
    const bottomNav = lastNav[lastNav.length - 1];
    if (bottomNav) {
      const reportLink = document.createElement('div');
      reportLink.style.cssText = 'text-align:center;margin-top:8px;';
      const pageTitle = document.title.replace(' | A Jew', '');
      const mailto = 'mailto:naanaach@gmail.com?subject=Typo Report: ' + encodeURIComponent(pageTitle) + '&body=' + encodeURIComponent('Page: ' + window.location.href + '\n\nDescription of issue:\n');
      reportLink.innerHTML = '<a href="' + mailto + '" style="color:var(--reader-text-secondary,#888);font-size:0.8em;text-decoration:none;">Found a typo? Report it →</a>';
      bottomNav.parentNode.insertBefore(reportLink, bottomNav.nextSibling);
    }
    setupSelectionPopup();
    setupSegmentShareActions();
    setupSegmentHighlight();
    setupCopyButtons();
    setupFavorites();

    // Scroll to segment from URL hash (e.g. #seg-5)
    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.substring(1));
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.style.outline = '2px solid var(--reader-accent)';
          setTimeout(() => target.style.outline = '', 3000);
        }, 300);
      }
    }
    setupSourceRefs();

    // Bind toolbar buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => setState('mode', btn.dataset.mode));
    });

    const nikudBtn = document.getElementById('btn-nikud');
    if (nikudBtn) {
      // Check if data-nikud actually contains nikud marks (vowels in Unicode range)
      const firstNikud = document.querySelector('.segment-he [data-nikud]');
      const nikudText = firstNikud ? firstNikud.getAttribute('data-nikud') : '';
      const hasRealNikud = /[\u05B0-\u05BD\u05BF-\u05C7]/.test(nikudText);
      if (hasRealNikud) {
        nikudBtn.addEventListener('click', () => setState('nikud', !state.nikud));
      } else {
        nikudBtn.style.opacity = '0.3';
        nikudBtn.title = 'Nikud not available for this text';
      }
    }

    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);

    const tocToggle = document.querySelector('.reader-toc-toggle');
    if (tocToggle) tocToggle.addEventListener('click', toggleToc);

    const tocClose = document.querySelector('.reader-toc-close');
    if (tocClose) tocClose.addEventListener('click', toggleToc);

    const bookmarkBtn = document.getElementById('btn-bookmark');
    if (bookmarkBtn) bookmarkBtn.addEventListener('click', saveBookmark);

    const searchBtn = document.getElementById('btn-search');
    if (searchBtn) searchBtn.addEventListener('click', toggleSearch);

    const listenBtn = document.getElementById('btn-listen');
    if (listenBtn) {
      listenBtn.removeAttribute('onclick');
      listenBtn.addEventListener('click', toggleSpeaking);

      // TTS speed control
      const speedWrap = document.createElement('span');
      speedWrap.className = 'tts-speed-ctrl';
      speedWrap.style.cssText = 'display:inline-flex;gap:1px;margin-left:2px;';
      const speeds = [{label:'½×', val:'0.6'}, {label:'1×', val:'1'}, {label:'1.5×', val:'1.5'}];
      const currentSpeed = localStorage.getItem('ajew-tts-speed') || '1';
      speeds.forEach(s => {
        const btn = document.createElement('button');
        btn.className = 'reader-btn reader-btn-icon' + (s.val === currentSpeed ? ' active' : '');
        btn.textContent = s.label;
        btn.title = 'TTS speed ' + s.label;
        btn.style.cssText = 'padding:2px 5px;font-size:0.6em;min-width:auto;';
        btn.addEventListener('click', () => {
          localStorage.setItem('ajew-tts-speed', s.val);
          speedWrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          // Restart if currently speaking
          if (ttsState.speaking) { stopSpeaking(); toggleSpeaking(); }
        });
        speedWrap.appendChild(btn);
      });
      listenBtn.parentNode.insertBefore(speedWrap, listenBtn.nextSibling);
    }

    // Share button - add to toolbar if not present
    const toolbarGroups = document.querySelectorAll('.reader-toolbar-group');
    const lastToolGroup = toolbarGroups[toolbarGroups.length - 1];
    if (lastToolGroup && !document.getElementById('btn-share')) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'reader-btn reader-btn-icon';
      shareBtn.id = 'btn-share';
      shareBtn.textContent = 'Share';
      shareBtn.title = 'Share this page';
      shareBtn.addEventListener('click', shareCurrentPage);
      lastToolGroup.insertBefore(shareBtn, lastToolGroup.querySelector('#btn-fullscreen'));

      const printBtn = document.createElement('button');
      printBtn.className = 'reader-btn reader-btn-icon';
      printBtn.id = 'btn-print';
      printBtn.textContent = 'Print';
      printBtn.title = 'Print this page (P)';
      printBtn.addEventListener('click', () => window.print());
      lastToolGroup.insertBefore(printBtn, lastToolGroup.querySelector('#btn-fullscreen'));
    }

    const searchInput = document.querySelector('.reader-search-bar input');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => performSearch(searchInput.value), 300);
      });
    }

    const searchClose = document.querySelector('.reader-search-bar .search-close');
    if (searchClose) searchClose.addEventListener('click', toggleSearch);

    // Font size slider + presets
    const slider = document.getElementById('font-size-slider');
    if (slider) {
      slider.addEventListener('input', () => setState('fontSize', parseInt(slider.value)));
      // Add preset buttons next to slider
      const group = slider.closest('.reader-toolbar-group');
      if (group) {
        const presets = [
          { label: 'S', size: 14, title: 'Small' },
          { label: 'M', size: 18, title: 'Medium' },
          { label: 'L', size: 24, title: 'Large' },
        ];
        const presetWrap = document.createElement('span');
        presetWrap.className = 'font-presets';
        presetWrap.style.cssText = 'display:inline-flex;gap:2px;margin-left:4px;';
        presets.forEach(p => {
          const btn = document.createElement('button');
          btn.className = 'reader-btn reader-btn-icon font-preset-btn';
          btn.textContent = p.label;
          btn.title = p.title + ' font';
          btn.style.cssText = 'padding:2px 6px;font-size:0.65em;min-width:auto;';
          btn.addEventListener('click', () => {
            setState('fontSize', p.size);
            slider.value = String(p.size);
          });
          presetWrap.appendChild(btn);
        });
        group.appendChild(presetWrap);
      }
    }

    // Font family selector - inject dynamically
    var fontGroup = slider ? slider.closest('.reader-toolbar-group') : document.querySelector('.reader-toolbar-group');
    if (fontGroup) {
      var fontSelect = document.createElement('select');
      fontSelect.id = 'font-family-select';
      fontSelect.style.cssText = 'font-size:0.75em; padding:2px 4px; border-radius:4px; border:1px solid var(--reader-border,#ccc); background:var(--reader-bg,#fff); color:var(--reader-text,#333); cursor:pointer; margin-left:8px;';
      fontSelect.title = 'Hebrew Font / גופן עברי';
      Object.keys(FONT_OPTIONS).forEach(function(key) {
        var opt = document.createElement('option');
        opt.value = key;
        opt.textContent = FONT_OPTIONS[key].label;
        fontSelect.appendChild(opt);
      });
      fontSelect.value = state.fontFamily || 'frank';
      fontSelect.addEventListener('change', function() { setState('fontFamily', fontSelect.value); });
      fontGroup.appendChild(fontSelect);
    }
    applyFontFamily();

    // Theme buttons
    document.querySelectorAll('[data-theme-btn]').forEach(btn => {
      btn.addEventListener('click', () => setState('theme', btn.dataset.themeBtn));
    });

    // Progress bar on scroll
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    // Shortcuts overlay close on click outside
    const shortcutsOverlay = document.querySelector('.reader-shortcuts-overlay');
    if (shortcutsOverlay) {
      shortcutsOverlay.addEventListener('click', (e) => {
        if (e.target === shortcutsOverlay) closeShortcuts();
      });
    }
  }

  // --- Notes / Annotations ---
  const NOTES_KEY = 'ajew-reader-notes';

  function loadNotes() {
    try {
      return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}');
    } catch (e) { return {}; }
  }

  function saveNotes(notes) {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (e) { /* ignore */ }
  }

  function getTorahId() {
    return document.querySelector('.reader-container')?.dataset.torahId || '';
  }

  function getNoteKey(segIndex) {
    return getTorahId() + ':' + segIndex;
  }

  function setupNotes() {
    const torahId = getTorahId();
    if (!torahId) return;

    const notes = loadNotes();
    const pairs = document.querySelectorAll('.reader-segment-pair');

    pairs.forEach(pair => {
      const segId = pair.id; // e.g. "seg-5"
      const segIndex = segId.replace('seg-', '');
      const noteKey = getNoteKey(segIndex);

      // Add note indicator button
      const indicator = document.createElement('button');
      indicator.className = 'note-indicator ' + (notes[noteKey] ? 'has-note' : 'empty');
      indicator.textContent = notes[noteKey] ? '\u270E' : '+';
      indicator.title = notes[noteKey] ? 'Edit note' : 'Add note';
      indicator.addEventListener('click', () => toggleNoteEditor(pair, segIndex));
      pair.appendChild(indicator);

      // Add note editor (hidden by default)
      const editor = document.createElement('div');
      editor.className = 'note-editor';
      editor.dataset.segIndex = segIndex;
      editor.innerHTML = `
        <textarea placeholder="Write your note here..." dir="auto">${notes[noteKey] || ''}</textarea>
        <div class="note-editor-actions">
          <button class="delete-note" style="${notes[noteKey] ? '' : 'display:none'}">Delete</button>
          <button class="cancel-note">Cancel</button>
          <button class="save-note">Save</button>
        </div>
      `;
      pair.appendChild(editor);

      // Save button
      editor.querySelector('.save-note').addEventListener('click', () => {
        const text = editor.querySelector('textarea').value.trim();
        const allNotes = loadNotes();
        if (text) {
          allNotes[noteKey] = text;
          indicator.className = 'note-indicator has-note';
          indicator.textContent = '\u270E';
          indicator.title = 'Edit note';
          editor.querySelector('.delete-note').style.display = '';
        } else {
          delete allNotes[noteKey];
          indicator.className = 'note-indicator empty';
          indicator.textContent = '+';
          indicator.title = 'Add note';
        }
        saveNotes(allNotes);
        editor.classList.remove('open');
      });

      // Delete button
      editor.querySelector('.delete-note').addEventListener('click', () => {
        const allNotes = loadNotes();
        delete allNotes[noteKey];
        saveNotes(allNotes);
        editor.querySelector('textarea').value = '';
        editor.querySelector('.delete-note').style.display = 'none';
        indicator.className = 'note-indicator empty';
        indicator.textContent = '+';
        indicator.title = 'Add note';
        editor.classList.remove('open');
      });

      // Cancel button
      editor.querySelector('.cancel-note').addEventListener('click', () => {
        editor.querySelector('textarea').value = notes[noteKey] || loadNotes()[noteKey] || '';
        editor.classList.remove('open');
      });
    });

    // Add Notes button to toolbar
    const toolbarGroups = document.querySelectorAll('.reader-toolbar-group');
    const lastGroup = toolbarGroups[toolbarGroups.length - 1];
    if (lastGroup) {
      const notesBtn = document.createElement('button');
      notesBtn.className = 'reader-btn reader-btn-icon';
      notesBtn.id = 'btn-notes';
      notesBtn.textContent = 'Notes';
      notesBtn.addEventListener('click', toggleNotesPanel);
      lastGroup.insertBefore(notesBtn, lastGroup.querySelector('#btn-fullscreen'));
    }

    // Create notes panel
    const panel = document.createElement('div');
    panel.className = 'notes-panel';
    panel.id = 'notes-panel';
    panel.innerHTML = `
      <div class="notes-panel-header">
        <h3>My Notes</h3>
        <button class="notes-panel-close">&times;</button>
      </div>
      <div class="notes-panel-content"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('.notes-panel-close').addEventListener('click', toggleNotesPanel);
  }

  function toggleNoteEditor(pair, segIndex) {
    const editor = pair.querySelector('.note-editor');
    if (!editor) return;

    // Close any other open editors
    document.querySelectorAll('.note-editor.open').forEach(e => {
      if (e !== editor) e.classList.remove('open');
    });

    editor.classList.toggle('open');
    if (editor.classList.contains('open')) {
      const textarea = editor.querySelector('textarea');
      textarea.focus();
    }
  }

  function toggleNotesPanel() {
    const panel = document.getElementById('notes-panel');
    if (!panel) return;
    panel.classList.toggle('open');

    if (panel.classList.contains('open')) {
      renderNotesPanel();
    }
  }

  function renderNotesPanel() {
    const panel = document.getElementById('notes-panel');
    if (!panel) return;
    const content = panel.querySelector('.notes-panel-content');
    const torahId = getTorahId();
    const notes = loadNotes();

    // Get notes for current page
    const pageNotes = Object.entries(notes)
      .filter(([key]) => key.startsWith(torahId + ':'))
      .sort(([a], [b]) => {
        const numA = parseInt(a.split(':')[1]);
        const numB = parseInt(b.split(':')[1]);
        return numA - numB;
      });

    if (pageNotes.length === 0) {
      content.innerHTML = '<div class="notes-panel-empty">No notes yet.<br>Click the + icon next to any verse to add a note.</div>';
      return;
    }

    content.innerHTML = pageNotes.map(([key, text]) => {
      const segIndex = key.split(':')[1];
      return `<div class="notes-panel-item" data-seg="${segIndex}">
        <div class="note-seg-ref">Segment ${segIndex}</div>
        <div class="note-text">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>`;
    }).join('');

    // Click to scroll to segment
    content.querySelectorAll('.notes-panel-item').forEach(item => {
      item.addEventListener('click', () => {
        const seg = document.getElementById('seg-' + item.dataset.seg);
        if (seg) {
          seg.scrollIntoView({ behavior: 'smooth', block: 'center' });
          seg.style.outline = '2px solid var(--reader-accent)';
          setTimeout(() => seg.style.outline = '', 2000);
        }
        panel.classList.remove('open');
      });
    });
  }

  // --- Text-to-Speech ---
  let ttsState = { speaking: false, paused: false, currentSeg: 0 };
  let ttsVoices = [];          // cached voice list
  let ttsVoicesReady = false;  // voices loaded
  let ttsEnglishVoice = null;  // best English voice found
  let ttsErrorCount = 0;

  // Load voices eagerly on page load (not just on first speak)
  function preloadVoices() {
    const voices = speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      ttsVoices = voices;
      ttsVoicesReady = true;
      pickEnglishVoice();
    }
  }
  preloadVoices();
  // Chrome loads voices asynchronously — wait for the event
  speechSynthesis.addEventListener('voiceschanged', () => {
    ttsVoices = speechSynthesis.getVoices();
    ttsVoicesReady = true;
    pickEnglishVoice();
  });

  function pickEnglishVoice() {
    // Prefer high-quality English voices in order
    const preferred = [
      'Google US English', 'Microsoft David', 'Samantha', 'Alex',
      'Daniel', 'Karen', 'Google UK English Female', 'Google UK English Male'
    ];
    for (const name of preferred) {
      const v = ttsVoices.find(v => v.lang.startsWith('en') && v.name.includes(name));
      if (v) { ttsEnglishVoice = v; return; }
    }
    // Fallback: any English voice
    ttsEnglishVoice = ttsVoices.find(v => v.lang.startsWith('en')) || null;
  }

  // Split long text into sentence-sized chunks (fixes Chrome Android 200-char silent-fail bug)
  function chunkText(text) {
    if (text.length <= 200) return [text];
    // Split on sentence boundaries
    const parts = text.match(/[^.!?;]+[.!?;]*\s*/g);
    if (!parts || parts.length <= 1) return [text];
    const chunks = [];
    let current = '';
    for (const part of parts) {
      if ((current + part).length > 200 && current.length > 0) {
        chunks.push(current.trim());
        current = part;
      } else {
        current += part;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }

  // Show a non-intrusive toast notification
  function showTtsToast(message, duration) {
    duration = duration || 4000;
    let toast = document.getElementById('tts-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tts-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
        + 'background:#2d3748;color:#fff;padding:10px 20px;border-radius:8px;font-size:0.9em;'
        + 'z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;'
        + 'font-family:"Open Sans",sans-serif;max-width:90vw;text-align:center;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, duration);
  }

  function getTextSegments() {
    const mode = state.mode;
    const segments = [];
    document.querySelectorAll('.reader-segment-pair').forEach(pair => {
      const he = pair.querySelector('.segment-he p')?.textContent?.trim();
      const en = pair.querySelector('.segment-en p')?.textContent?.trim();
      if (mode === 'english' && en && en !== 'Translation not yet available') {
        segments.push({ text: en, lang: 'en-US' });
      } else if (mode === 'both') {
        if (he) segments.push({ text: he, lang: 'he-IL' });
        if (en && en !== 'Translation not yet available') segments.push({ text: en, lang: 'en-US' });
      } else {
        if (he) segments.push({ text: he, lang: 'he-IL' });
      }
    });
    return segments;
  }

  function highlightSegment(index) {
    document.querySelectorAll('.reader-segment-pair').forEach((pair, i) => {
      pair.classList.toggle('tts-active', i === index);
    });
  }

  function speakChunks(segments, segIndex, chunkIdx, chunks) {
    // Called after each chunk completes — move to next chunk or next segment
    if (!chunks) {
      // First call for this segment — chunk the text
      const seg = segments[segIndex];
      const needsChunking = seg.lang === 'en-US' && seg.text.length > 200;
      chunks = needsChunking ? chunkText(seg.text) : [seg.text];
      chunkIdx = 0;
    }

    if (chunkIdx >= chunks.length) {
      // All chunks for this segment done
      if (ttsState.speaking && !ttsState.paused) {
        speakSegments(segIndex + 1);
      }
      return;
    }

    const seg = segments[segIndex];
    const text = chunks[chunkIdx];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = seg.lang;

    // Use picked English voice if available
    if (seg.lang === 'en-US' && ttsEnglishVoice) {
      utterance.voice = ttsEnglishVoice;
    }

    const speedPref = parseFloat(localStorage.getItem('ajew-tts-speed') || '1');
    utterance.rate = (seg.lang === 'he-IL' ? 0.85 : 0.9) * speedPref;

    utterance.onend = () => {
      if (ttsState.speaking && !ttsState.paused) {
        speakChunks(segments, segIndex, chunkIdx + 1, chunks);
      }
    };

    utterance.onerror = (event) => {
      if (event.error === 'canceled' || event.error === 'interrupted') return; // user action, not a bug
      ttsErrorCount++;
      console.warn('TTS error:', event.error, event.utterance?.text?.substring(0, 60));
      if (ttsErrorCount === 1) {
        showTtsToast('⚠ Speech may not be available on this device. Trying to continue...', 5000);
      }
      if (ttsState.speaking) {
        speakChunks(segments, segIndex, chunkIdx + 1, chunks);
      }
    };

    speechSynthesis.speak(utterance);
  }

  function speakSegments(startFrom) {
    const segments = getTextSegments();
    if (startFrom >= segments.length) {
      stopSpeaking();
      return;
    }

    ttsState.currentSeg = startFrom;
    ttsErrorCount = 0; // reset per run
    const seg = segments[startFrom];

    // Highlight the current segment pair
    const pairIndex = Math.floor(startFrom / (state.mode === 'both' ? 2 : 1));
    highlightSegment(pairIndex);

    // Scroll into view
    const pairs = document.querySelectorAll('.reader-segment-pair');
    if (pairs[pairIndex]) {
      pairs[pairIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    speakChunks(segments, startFrom, 0, null);
  }

  function toggleSpeaking() {
    const btn = document.getElementById('btn-listen');
    if (!btn) return;

    if (ttsState.speaking && !ttsState.paused) {
      // Pause
      speechSynthesis.pause();
      ttsState.paused = true;
      btn.textContent = 'Resume';
      btn.classList.add('active');
    } else if (ttsState.paused) {
      // Resume
      speechSynthesis.resume();
      ttsState.paused = false;
      btn.textContent = 'Pause';
      btn.classList.add('active');
    } else {
      // Start — check if English voice is available first
      if (!ttsVoicesReady) {
        // Voices haven't loaded yet — trigger load and retry
        ttsVoices = speechSynthesis.getVoices();
        if (ttsVoices.length > 0) {
          ttsVoicesReady = true;
          pickEnglishVoice();
        } else {
          // Schedule a retry after voices load
          showTtsToast('Loading speech voices...', 2000);
          const onReady = () => {
            speechSynthesis.removeEventListener('voiceschanged', onReady);
            ttsVoices = speechSynthesis.getVoices();
            ttsVoicesReady = true;
            pickEnglishVoice();
            toggleSpeaking(); // retry
          };
          speechSynthesis.addEventListener('voiceschanged', onReady);
          return;
        }
      }

      ttsState.speaking = true;
      ttsState.paused = false;
      btn.textContent = 'Pause';
      btn.classList.add('active');
      speakSegments(0);
    }
  }

  function stopSpeaking() {
    speechSynthesis.cancel();
    ttsState.speaking = false;
    ttsState.paused = false;
    ttsState.currentSeg = 0;
    ttsErrorCount = 0;
    highlightSegment(-1);
    const btn = document.getElementById('btn-listen');
    if (btn) {
      btn.textContent = 'Listen';
      btn.classList.remove('active');
    }
  }

  // --- Related Teachings ---
  function setupRelatedTeachings() {
    const container = document.querySelector('.reader-container');
    if (!container) return;
    const nav = document.querySelectorAll('.reader-nav');
    const lastNav = nav[nav.length - 1];
    if (!lastNav) return;

    // Get all Hebrew text to find concepts
    const heTexts = Array.from(document.querySelectorAll('.segment-he p'))
      .map(p => p.textContent || '').join(' ');
    const stripped = heTexts.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');

    // Key concepts to detect
    const concepts = [
      { he: 'תשובה', en: 'Repentance' }, { he: 'שמחה', en: 'Joy' },
      { he: 'אמונה', en: 'Faith' }, { he: 'תפילה', en: 'Prayer' },
      { he: 'צדיק', en: 'Righteous One' }, { he: 'התבודדות', en: 'Meditation' },
      { he: 'תיקון', en: 'Repair' }, { he: 'נשמה', en: 'Soul' },
      { he: 'גאולה', en: 'Redemption' }, { he: 'צדקה', en: 'Charity' },
      { he: 'ענווה', en: 'Humility' }, { he: 'דביקות', en: 'Attachment' },
    ];

    const found = concepts.filter(c => stripped.includes(c.he));
    if (found.length === 0) return;

    // Show concept tags
    const section = document.createElement('div');
    section.className = 'related-teachings';
    section.innerHTML = `
      <h3 style="font-size:0.95em;color:var(--reader-text-secondary,#666);margin:16px 0 8px;">
        Concepts in this teaching:
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${found.map(c => `<a href="/search-enhanced?q=${encodeURIComponent(c.he)}"
          style="padding:3px 10px;background:var(--reader-surface,#f0ebe0);border-radius:12px;
          color:var(--reader-text,#1a365d);text-decoration:none;font-size:0.85em;
          font-family:'Frank Ruhl Libre',serif;border:1px solid var(--reader-border,#e0d6c2);"
          title="Search for ${c.en}">${c.he} (${c.en})</a>`).join('')}
      </div>
    `;
    lastNav.parentNode.insertBefore(section, lastNav);
  }

  // --- Favorites ---
  function setupFavorites() {
    const FAV_KEY = 'ajew-favorites';
    const container = document.querySelector('.reader-container');
    if (!container) return;
    const url = window.location.pathname;
    const title = document.title.replace(' | A Jew', '');

    // Load favorites
    let favorites = [];
    try { favorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) {}
    const isFav = favorites.some(f => f.url === url);

    // Add favorite button to toolbar
    const toolbarGroups = document.querySelectorAll('.reader-toolbar-group');
    const lastGroup = toolbarGroups[toolbarGroups.length - 1];
    if (!lastGroup) return;

    const favBtn = document.createElement('button');
    favBtn.className = 'reader-btn reader-btn-icon' + (isFav ? ' active' : '');
    favBtn.id = 'btn-fav';
    favBtn.textContent = isFav ? '★' : '☆';
    favBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
    favBtn.addEventListener('click', () => {
      let favs = [];
      try { favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch(e) {}
      const idx = favs.findIndex(f => f.url === url);
      if (idx !== -1) {
        favs.splice(idx, 1);
        favBtn.textContent = '☆';
        favBtn.classList.remove('active');
        favBtn.title = 'Add to favorites';
      } else {
        favs.unshift({ url, title, timestamp: Date.now() });
        favBtn.textContent = '★';
        favBtn.classList.add('active');
        favBtn.title = 'Remove from favorites';
      }
      try { localStorage.setItem(FAV_KEY, JSON.stringify(favs.slice(0, 50))); } catch(e) {}
    });
    lastGroup.insertBefore(favBtn, lastGroup.querySelector('#btn-fullscreen'));
  }

  // --- Copy Segment Button ---
  function setupCopyButtons() {
    document.querySelectorAll('.reader-segment-pair').forEach(pair => {
      const btn = document.createElement('button');
      btn.className = 'seg-copy-btn';
      btn.textContent = 'Copy';
      btn.title = 'Copy this segment';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const he = pair.querySelector('.segment-he p')?.textContent?.trim() || '';
        const en = pair.querySelector('.segment-en p')?.textContent?.trim() || '';
        let text = he;
        if (en && en !== 'Translation not yet available') text += '\n\n' + en;
        text += '\n\n— ' + document.title.replace(' | A Jew', '') + ' (ajew.org)';
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        }).catch(() => {});
      });
      pair.appendChild(btn);
    });
  }

  // --- Double-click to Highlight Segment ---
  function setupSegmentHighlight() {
    const container = document.querySelector('.reader-container');
    if (!container) return;
    const HIGHLIGHTS_KEY = 'ajew-highlights-' + (container.dataset.torahId || window.location.pathname);

    // Load saved highlights
    let highlights = new Set();
    try {
      const saved = JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '[]');
      highlights = new Set(saved);
      // Apply saved highlights
      highlights.forEach(id => {
        const seg = document.getElementById(id);
        if (seg) seg.classList.add('user-highlighted');
      });
    } catch(e) {}

    container.addEventListener('dblclick', (e) => {
      const seg = e.target.closest('.reader-segment-pair');
      if (!seg || !seg.id) return;
      // Don't highlight if user is selecting text
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return;

      seg.classList.toggle('user-highlighted');
      if (seg.classList.contains('user-highlighted')) {
        highlights.add(seg.id);
      } else {
        highlights.delete(seg.id);
      }
      try {
        localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify([...highlights]));
      } catch(e) {}
    });
  }

  // --- Text Selection Popup ---
  function setupSelectionPopup() {
    const container = document.querySelector('.reader-container');
    if (!container) return;

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'selection-popup';
    popup.style.cssText = 'display:none;position:absolute;z-index:100;background:var(--reader-bg,#fffdf7);border:1px solid #d1c8b0;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px;';
    popup.innerHTML = `
      <button class="sel-btn" data-action="copy" title="Copy">Copy</button>
      <button class="sel-btn" data-action="share" title="Share">Share</button>
      <button class="sel-btn" data-action="mysefer" title="Add to My Sefer">+ My Sefer</button>
    `;
    document.body.appendChild(popup);

    // Style buttons
    popup.querySelectorAll('.sel-btn').forEach(btn => {
      btn.style.cssText = 'background:none;border:none;padding:6px 12px;cursor:pointer;font-size:0.85em;color:var(--reader-text,#333);border-radius:4px;';
      btn.addEventListener('mouseenter', () => btn.style.background = 'var(--reader-surface,#f0ebe0)');
      btn.addEventListener('mouseleave', () => btn.style.background = 'none');
    });

    document.addEventListener('mouseup', (e) => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !container.contains(sel.anchorNode)) {
          popup.style.display = 'none';
          return;
        }
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        popup.style.display = 'flex';
        popup.style.top = (rect.top + window.scrollY - 40) + 'px';
        popup.style.left = (rect.left + rect.width / 2 - 60) + 'px';
      }, 10);
    });

    popup.querySelector('[data-action="copy"]').addEventListener('click', () => {
      const text = window.getSelection().toString();
      navigator.clipboard.writeText(text).catch(() => {});
      popup.style.display = 'none';
    });

    popup.querySelector('[data-action="share"]').addEventListener('click', () => {
      const text = window.getSelection().toString();
      const title = document.title.replace(' | A Jew', '');
      if (navigator.share) {
        navigator.share({ title, text, url: window.location.href }).catch(() => {});
      } else {
        const full = text + '\n\n— ' + title + '\n' + window.location.href;
        navigator.clipboard.writeText(full).catch(() => {});
      }
      popup.style.display = 'none';
    });

    // Add to My Sefer
    popup.querySelector('[data-action="mysefer"]').addEventListener('click', () => {
      const text = window.getSelection().toString();
      const title = document.title.replace(' | A Jew', '');
      const source = title + ' (' + window.location.pathname.split('/').pop() + ')';
      // Save to My Sefer localStorage
      try {
        const SEFER_KEY = 'ajew-my-sefer';
        const saved = JSON.parse(localStorage.getItem(SEFER_KEY) || '{"sections":[]}');
        saved.sections.push({
          id: 'sel-' + Date.now(),
          title: source,
          content: text,
          source: window.location.href,
          addedAt: new Date().toISOString()
        });
        localStorage.setItem(SEFER_KEY, JSON.stringify(saved));
        const btn = popup.querySelector('[data-action="mysefer"]');
        btn.textContent = 'Added!';
        setTimeout(() => { btn.textContent = '+ My Sefer'; }, 2000);
      } catch(e) {}
      popup.style.display = 'none';
    });

    document.addEventListener('mousedown', (e) => {
      if (!popup.contains(e.target)) popup.style.display = 'none';
    });
  }

  // --- Segment Share / My Sefer Actions ---
  function absoluteShareUrl(hash, extra) {
    var url = new URL(window.location.href);
    url.searchParams.delete('t');
    if (extra) Object.keys(extra).forEach(function (k) { if (extra[k] != null) url.searchParams.set(k, extra[k]); });
    if (hash) url.hash = hash.charAt(0) === '#' ? hash : '#' + hash;
    return url.toString();
  }

  function segmentTitle(seg) {
    var title = document.title.replace(' | A Jew', '');
    var n = (seg.id || '').replace(/^seg-/, '').replace(/^segment-/, '').replace(/^aligned-/, '');
    return title + (n ? ' — Teaching ' + n : '');
  }

  function segmentPlainText(seg) {
    var clone = seg.cloneNode(true);
    clone.querySelectorAll('.ajew-segment-actions,.ajew-suno-segment-player,audio,button,select').forEach(function (el) { el.remove(); });
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function saveSegmentToMySefer(seg) {
    var text = segmentPlainText(seg);
    var title = segmentTitle(seg);
    var url = absoluteShareUrl(seg.id);
    try {
      var SEFER_KEY = 'ajew-my-sefer';
      var saved = JSON.parse(localStorage.getItem(SEFER_KEY) || '{"sections":[]}');
      if (!Array.isArray(saved.sections)) saved.sections = [];
      saved.sections.push({ id: 'seg-' + Date.now(), title: title, content: text, source: url, addedAt: new Date().toISOString() });
      localStorage.setItem(SEFER_KEY, JSON.stringify(saved));
      return true;
    } catch(e) { return false; }
  }

  function shareOrCopy(title, text, url, btn) {
    var payload = (text ? text + '\n\n— ' : '') + title + '\n' + url;
    if (navigator.share) {
      navigator.share({ title: title, text: text || title, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(function () {
        if (btn) { var old = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function () { btn.textContent = old; }, 1500); }
      }).catch(function () { window.prompt('Copy link:', payload); });
    } else {
      window.prompt('Copy link:', payload);
    }
  }

  function setupSegmentShareActions() {
    document.querySelectorAll('.reader-segment-pair').forEach(function (seg) {
      if (!seg.id || seg.querySelector(':scope > .ajew-segment-actions')) return;
      var bar = document.createElement('div');
      bar.className = 'ajew-segment-actions';
      bar.style.cssText = 'display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;margin:.35rem 0 .15rem;font-family:system-ui,-apple-system,sans-serif;';
      function makeBtn(label, title) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'ajew-segment-action-btn';
        b.textContent = label;
        b.title = title || label;
        b.style.cssText = 'background:#2a4a6a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:.18rem .55rem;cursor:pointer;font-size:.78em;font-weight:700;';
        return b;
      }
      var share = makeBtn('↗ Share teaching', 'Share this teaching');
      share.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); shareOrCopy(segmentTitle(seg), segmentPlainText(seg), absoluteShareUrl(seg.id), share); });
      var add = makeBtn('+ My Sefer', 'Add this whole teaching to My Sefer');
      add.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (saveSegmentToMySefer(seg)) { add.textContent = 'Added!'; setTimeout(function () { add.textContent = '+ My Sefer'; }, 1500); } });
      var copy = makeBtn('Copy teaching', 'Copy this teaching');
      copy.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var text = segmentPlainText(seg); if (navigator.clipboard) navigator.clipboard.writeText(text + '\n\n— ' + segmentTitle(seg) + '\n' + absoluteShareUrl(seg.id)); copy.textContent = 'Copied!'; setTimeout(function () { copy.textContent = 'Copy teaching'; }, 1500); });
      bar.appendChild(share); bar.appendChild(add); bar.appendChild(copy);
      seg.insertBefore(bar, seg.firstChild);
    });
  }

  // --- Share ---
  function shareCurrentPage() {
    var title = document.title.replace(' | A Jew', '');
    var url = window.location.href;
    var text = title + ' - ' + url;

    // Check if share dropdown already exists
    var existing = document.querySelector('.share-dropdown');
    if (existing) { existing.remove(); return; }

    var dropdown = document.createElement('div');
    dropdown.className = 'share-dropdown';
    dropdown.innerHTML =
      '<a href="https://wa.me/?text=' + encodeURIComponent(text + '\n\nNa Nach Nachma Nachman Meuman') + '" target="_blank" rel="noopener" class="share-option share-whatsapp">WhatsApp</a>' +
      '<a href="https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title) + '" target="_blank" rel="noopener" class="share-option share-telegram">Telegram</a>' +
      '<a href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url) + '" target="_blank" rel="noopener" class="share-option share-twitter">X / Twitter</a>' +
      '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener" class="share-option share-facebook">Facebook</a>' +
      '<button class="share-option share-copy">Copy Link</button>' +
      (navigator.share ? '<button class="share-option share-native">More...</button>' : '');

    var btn = document.getElementById('btn-share');
    if (btn) {
      btn.parentNode.style.position = 'relative';
      btn.parentNode.appendChild(dropdown);
    }

    // Copy link
    dropdown.querySelector('.share-copy').addEventListener('click', function() {
      navigator.clipboard.writeText(url).then(function() {
        dropdown.querySelector('.share-copy').textContent = 'Copied!';
        setTimeout(function() { dropdown.remove(); }, 1500);
      });
    });

    // Native share
    var nativeBtn = dropdown.querySelector('.share-native');
    if (nativeBtn) {
      nativeBtn.addEventListener('click', function() {
        navigator.share({ title: title, url: url }).catch(function() {});
        dropdown.remove();
      });
    }

    // Close on click outside
    setTimeout(function() {
      document.addEventListener('click', function closeShare(e) {
        if (!dropdown.contains(e.target) && e.target !== btn) {
          dropdown.remove();
          document.removeEventListener('click', closeShare);
        }
      });
    }, 100);
  }

  // --- Source Reference Popups ---
  // Detect Hebrew source citations in parentheses and make them clickable
  const SOURCE_PATTERNS = [
    // Tanach books
    { re: /בראשית/g, book: 'Genesis' },
    { re: /שמות/g, book: 'Exodus' },
    { re: /ויקרא/g, book: 'Leviticus' },
    { re: /במדבר/g, book: 'Numbers' },
    { re: /דברים/g, book: 'Deuteronomy' },
    { re: /תהלים|תהילים/g, book: 'Psalms' },
    { re: /משלי/g, book: 'Proverbs' },
    { re: /ישעיהו|ישעיה/g, book: 'Isaiah' },
    { re: /ירמיהו|ירמיה/g, book: 'Jeremiah' },
    { re: /יחזקאל/g, book: 'Ezekiel' },
    { re: /איוב/g, book: 'Job' },
    { re: /שיר השירים/g, book: 'Song of Songs' },
    { re: /קהלת/g, book: 'Ecclesiastes' },
    { re: /דניאל/g, book: 'Daniel' },
    { re: /שופטים/g, book: 'Judges' },
    { re: /שמואל/g, book: 'I Samuel' },
    { re: /מלכים/g, book: 'I Kings' },
    { re: /יהושע/g, book: 'Joshua' },
    { re: /רות/g, book: 'Ruth' },
    { re: /איכה/g, book: 'Lamentations' },
    { re: /אסתר/g, book: 'Esther' },
    // Talmud
    { re: /ברכות/g, book: 'Berakhot' },
    { re: /שבת/g, book: 'Shabbat' },
    { re: /סנהדרין/g, book: 'Sanhedrin' },
    { re: /בבא בתרא/g, book: 'Bava Batra' },
    { re: /בבא קמא/g, book: 'Bava Kamma' },
    { re: /בבא מציעא/g, book: 'Bava Metzia' },
  ];

  function setupSourceRefs() {
    // Create popup element
    const popup = document.createElement('div');
    popup.id = 'source-popup';
    popup.className = 'source-ref-popup';
    popup.innerHTML = '<div class="source-popup-header"><span class="source-popup-title"></span><button class="source-popup-close">&times;</button></div><div class="source-popup-body"></div><a class="source-popup-link" href="#">Read full chapter &rarr;</a>';
    popup.style.display = 'none';
    document.body.appendChild(popup);

    popup.querySelector('.source-popup-close').addEventListener('click', () => {
      popup.style.display = 'none';
    });
    document.addEventListener('click', (e) => {
      if (!popup.contains(e.target) && !e.target.classList.contains('source-ref-link')) {
        popup.style.display = 'none';
      }
    });

    // Find all parenthesized references in Hebrew text
    document.querySelectorAll('.segment-he p').forEach(p => {
      const html = p.innerHTML;
      // Match references in parentheses: (תהלים קי"ט) or (בראשית כ"ה, י')
      const refRegex = /\(([^)]*?(?:בראשית|שמות|ויקרא|במדבר|דברים|תהלים|תהילים|משלי|ישעיהו|ישעיה|ירמיהו|ירמיה|יחזקאל|איוב|שיר השירים|קהלת|דניאל|שופטים|שמואל|מלכים|יהושע|רות|איכה|אסתר|ברכות|שבת|סנהדרין|בבא בתרא|בבא קמא|בבא מציעא)[^)]*?)\)/g;

      const newHtml = html.replace(refRegex, (match, inner) => {
        return `(<span class="source-ref-link" data-ref="${inner}">${inner}</span>)`;
      });

      if (newHtml !== html) {
        p.innerHTML = newHtml;
      }
    });

    // Handle clicks on source refs
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.source-ref-link');
      if (!link) return;

      const ref = link.dataset.ref;
      showSourcePopup(ref, link, popup);
    });
  }

  function showSourcePopup(heRef, anchor, popup) {
    const title = popup.querySelector('.source-popup-title');
    const body = popup.querySelector('.source-popup-body');
    const linkEl = popup.querySelector('.source-popup-link');

    title.textContent = heRef;
    body.innerHTML = '<span style="color:#888;">Loading...</span>';
    linkEl.style.display = 'none';

    // Position popup near the clicked reference
    const rect = anchor.getBoundingClientRect();
    popup.style.display = 'block';
    popup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    popup.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - 340)) + 'px';

    // Fetch the verse from our API
    fetch('/api/verse-lookup?ref=' + encodeURIComponent(heRef))
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          body.innerHTML = '<span style="color:#888;">' + heRef + '</span>';
          return;
        }
        let html = '';
        if (data.heRef) html += '<div style="font-family:\'Frank Ruhl Libre\',serif;direction:rtl;font-size:1.1em;line-height:1.8;margin-bottom:8px;">' + data.he + '</div>';
        if (data.en) html += '<div style="font-size:0.9em;color:#555;line-height:1.6;">' + data.en + '</div>';
        body.innerHTML = html || heRef;

        if (data.localUrl) {
          linkEl.href = data.localUrl;
          linkEl.style.display = 'block';
        } else if (data.sefariaUrl) {
          linkEl.href = data.sefariaUrl;
          linkEl.target = '_blank';
          linkEl.style.display = 'block';
        }
      })
      .catch(() => {
        body.innerHTML = '<span style="color:#888;">' + heRef + '</span>';
      });
  }

  // --- Cross-Reference Links ---
  // Scan English and Hebrew text for references to other books and make them clickable

  // Hebrew number conversion (shared between English and Hebrew patterns)
  const _hebrewNums = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,
    'יא':11,'יב':12,'יג':13,'יד':14,'טו':15,'טז':16,'יז':17,'יח':18,'יט':19,'כ':20,
    'כא':21,'כב':22,'כג':23,'כד':24,'כה':25,'כו':26,'כז':27,'כח':28,'כט':29,'ל':30,
    'לא':31,'לב':32,'לג':33,'לד':34,'לה':35,'לו':36,'לז':37,'לח':38,'לט':39,'מ':40,
    'מא':41,'מב':42,'מג':43,'מד':44,'מה':45,'מו':46,'מז':47,'מח':48,'מט':49,'נ':50,
    'נא':51,'נב':52,'נג':53,'נד':54,'נה':55,'נו':56,'נז':57,'נח':58,'נט':59,'ס':60,
    'סא':61,'סב':62,'סג':63,'סד':64,'סה':65,'סו':66,'סז':67,'סח':68,'סט':69,'ע':70,
    'עא':71,'עב':72,'עג':73,'עד':74,'עה':75,'עו':76,'עז':77,'עח':78,'עט':79,'פ':80,
    'פא':81,'פב':82,'פג':83,'פד':84,'פה':85,'פו':86,'פז':87,'פח':88,'פט':89,'צ':90,
    'צא':91,'צב':92,'צג':93,'צד':94,'צה':95,'צו':96,'צז':97,'צח':98,'צט':99,
    'ק':100,'קא':101,'קב':102,'קג':103,'קד':104,'קה':105,'קו':106,'קז':107,'קח':108,'קט':109,
    'קי':110,'קיא':111,'קיב':112,'קיג':113,'קיד':114,'קטו':115,'קטז':116,'קיז':117,'קיח':118,'קיט':119,
    'קכ':120,'קל':130,'קמ':140,'קנ':150,'ר':200,'רא':201,'רב':202,'רג':203,'רד':204,'רה':205,
    'רו':206,'רז':207,'רח':208,'רט':209,'רי':210,'רכ':220,'רל':230,'רמ':240,'רנ':250,
    'רס':260,'רע':270,'רפ':280,'רצ':290,'ש':300,'ת':400};

  function _parseHebrewNum(s) {
    if (!s) return 0;
    s = s.replace(/['"״׳"]/g, '').trim();
    if (_hebrewNums[s]) return _hebrewNums[s];
    // Try compound: decompose letter by letter from highest to lowest
    let total = 0;
    let remaining = s;
    // Sort keys by value descending, longest key first for same value
    const sorted = Object.entries(_hebrewNums).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
    for (const [k, v] of sorted) {
      while (remaining.startsWith(k)) { total += v; remaining = remaining.substring(k.length); }
    }
    return total || parseInt(s) || 0;
  }

  // Determine LM part from torah number
  function _lmUrl(num) {
    num = parseInt(num);
    if (!num || num < 1) return null;
    if (num <= 286) return '/reader/likutay-moharan/part-1/torah-' + num;
    return '/reader/likutay-moharan/part-2/torah-' + num;
  }

  // Linkify English text references
  function linkifyEnglish(html) {
    // Guard: skip if already contains cross-ref links
    if (html.indexOf('cross-ref') !== -1) return html;

    var changed = false;
    var LINK_CLS = 'cross-ref';

    function makeLink(url, text, title) {
      changed = true;
      return '<a href="' + url + '" class="' + LINK_CLS + '" target="_blank" title="' + (title || 'Open in reader') + '">' + text + '</a>';
    }

    // ORDER MATTERS: more specific patterns must come before general ones

    // --- LM Part 2 (must come before general LM) ---
    // "Likutay Moharan II, 5" / "LM II:5" / "LM II, 5" / "Likutey Moharan Part Two, 5" / "Tinyana 5"
    html = html.replace(/(?:Likut[ae]y?\s*Moharan\s*(?:Part\s*)?(?:Two|2|II)\s*[,:;]\s*(?:Torah\s*)?|LM\s*(?:Part\s*)?II\s*[,:;]\s*|Tinyana\s+(?:Torah\s*)?)(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/likutay-moharan/part-2/torah-' + n, match);
    });

    // --- LM Part 1 explicit ---
    // "LM I:5" / "LM I, 5" / "Likutay Moharan Part One, 5"
    html = html.replace(/(?:LM\s*(?:Part\s*)?I\s*[,:;]\s*|Likut[ae]y?\s*Moharan\s*(?:Part\s*)?(?:One|1|I)\s*[,:;]\s*)(?:Torah\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/likutay-moharan/part-1/torah-' + n, match);
    });

    // --- General LM references ---
    // "Likutay Moharan 22" / "Likutey Moharan, Torah 22" / "LM 22"
    html = html.replace(/(?:Likut[ae]y?\s*Moharan\s*[,:;]?\s*(?:Torah\s*)?|LM\s+)(\d+)(?!\s*[,:;]\s*\d)/gi, function(match, num) {
      // Skip if already linked
      if (match.indexOf('cross-ref') !== -1) return match;
      var url = _lmUrl(num);
      if (!url) return match;
      return makeLink(url, match);
    });

    // --- "Torah 5" / "Lesson 5" (contextual - default to LM) ---
    // Only match when preceded by certain contexts or standalone
    html = html.replace(/\b(?:Torah|Lesson)\s+(\d+)\b/gi, function(match, num) {
      if (match.indexOf('cross-ref') !== -1) return match;
      var url = _lmUrl(num);
      if (!url) return match;
      return makeLink(url, match, 'Likutay Moharan ' + num);
    });

    // --- "Siman 5" (default to LM) ---
    html = html.replace(/\bSiman\s+(\d+)\b/gi, function(match, num) {
      var url = _lmUrl(num);
      if (!url) return match;
      return makeLink(url, match, 'Likutay Moharan ' + num);
    });

    // --- Kitzur Likutay Moharan ---
    // "Kitzur 5" / "Kitzur LM 5" / "Kitzur Likutay Moharan 5"
    html = html.replace(/\bKitzur\s*(?:Likut[ae]y?\s*Moharan\s*|LM\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/kitzur-likutay-moharan/part-1/torah-' + n, match);
    });

    // --- Likutay Tefilos ---
    // "Prayer 5" / "Tefila 5" / "Likutay Tefilos 5" / "Likutey Tefilot 5"
    html = html.replace(/\b(?:Likut[ae]y?\s*Tefil[lo][st]\s*|Prayer\s+|Tefil[la]h?\s+)(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/likutay-tefilos/part-1/prayer-' + n, match);
    });

    // --- Tehillim / Psalms ---
    // "Tehillim 23" / "Psalm 23" / "Psalms 23"
    html = html.replace(/\b(?:Tehill?im|Psalms?)\s+(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1 || n > 150) return match;
      return makeLink('/reader/tanach-tehillim/part-1/torah-' + n, match);
    });

    // --- Sichos HaRan ---
    // "Sichos HaRan 44" / "Sicha 44" / "Sichot HaRan 44"
    html = html.replace(/\b(?:Sichos?\s*(?:Ha)?Ran|Sich[oa]h?)\s*[#]?\s*(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/sichos-haran/sicha-' + n, match);
    });

    // --- Sefer HaMidos ---
    // "Sefer HaMidos" / "Sefer HaMiddos" / "Book of Traits"
    html = html.replace(/\bSefer\s*Ha\s*Mi?d[do]s\b/gi, function(match) {
      return makeLink('/reader/sefer-hamidos/topic-1', match);
    });

    // --- Meshivas Nefesh ---
    // "Meshivas Nefesh 5" / "Meshivat Nefesh, Section 5" / "Restore the Soul 5"
    html = html.replace(/\b(?:Meshivas?\s*Nefesh|Restore\s*the\s*Soul)\s*[,:;]?\s*(?:Section\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/meshivas-nefesh/section-' + n, match);
    });

    // --- Hashtatfchus HaNefesh / Outpouring of the Soul ---
    html = html.replace(/\b(?:Hashtatf?chus\s*(?:Ha)?Nefesh|Outpouring\s*(?:of\s*(?:the\s*)?)?Soul)\s*[,:;]?\s*(?:Section\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/hashtatfchus-hanefesh/section-' + n, match);
    });

    // --- Sipurey Maasiyos / Stories ---
    // "Sipurey Maasiyos, Story 5" / "Rabbi Nachman's Stories 5"
    html = html.replace(/\b(?:Sipure[iy]\s*Ma?asiy?os|Rabbi\s*Nachman'?s?\s*Stories?)\s*[,:;]?\s*(?:Story\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/sipurey-maasiyos/story-' + n, match);
    });

    // --- Likutay Eitzos ---
    // "Likutay Eitzos" / "Likutey Etzot"
    html = html.replace(/\bLikut[ae]y?\s*(?:Eitz[oa][st]|Etz[oa]t)\s*[,:;]?\s*(?:Topic\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/likutay-eitzos/topic-' + n, match);
    });

    // --- Shivchay HaRan ---
    html = html.replace(/\bShivch[ae]y?\s*(?:Ha)?Ran\s*[,:;]?\s*(?:Section\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/shivchay-haran/section-' + n, match);
    });

    // --- Chayey Moharan ---
    html = html.replace(/\bCha[iy]e[iy]\s*Moharan\s*[,:;]?\s*(?:Section\s*)?(\d+)/gi, function(match, num) {
      var n = parseInt(num);
      if (!n || n < 1) return match;
      return makeLink('/reader/chayey-moharan/section-' + n, match);
    });

    // --- Likutay Halachos (general reference, no specific halacha number easy to link) ---
    // "Likutay Halachos" without a specific number - link to index
    html = html.replace(/\bLikut[ae]y?\s*Hal[ao]ch[oa]s?\b(?!\s*\d)/gi, function(match) {
      if (match.indexOf('cross-ref') !== -1) return match;
      return makeLink('/reader/likutay-halachos/part-1/halacha-1', match, 'Likutay Halachos');
    });

    return changed ? html : null;
  }

  // Linkify Hebrew text references
  function linkifyHebrew(html) {
    if (html.indexOf('cross-ref') !== -1) return html;

    var changed = false;
    var LINK_CLS = 'cross-ref';

    function makeLink(url, text, title) {
      changed = true;
      return '<a href="' + url + '" class="' + LINK_CLS + '" target="_blank" title="' + (title || 'Open in reader') + '">' + text + '</a>';
    }

    // --- ליקוטי מוהר"ן תנינא (Part 2 - must come before Part 1) ---
    html = html.replace(/לי?קוטי\s*מוהר[""״]?ן\s*תנינא\s*(?:סי(?:מן|[׳'])?\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      return makeLink('/reader/likutay-moharan/part-2/torah-' + n, match, 'LM II:' + n);
    });

    // --- ליקוטי מוהר"ן (Part 1) ---
    html = html.replace(/לי?קוטי\s*מוהר[""״]?ן\s*(?:סי(?:מן|[׳'])?\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      var url = _lmUrl(n);
      if (!url) return match;
      return makeLink(url, match, 'LM ' + n);
    });

    // --- סימן with a number (default to LM in context) ---
    html = html.replace(/סימן\s+([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      if (match.indexOf('cross-ref') !== -1) return match;
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      var url = _lmUrl(n);
      if (!url) return match;
      return makeLink(url, match, 'LM ' + n);
    });

    // --- תהלים / תהילים ---
    html = html.replace(/תהי?לים\s+(?:פרק\s+)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1 || n > 150) return match;
      return makeLink('/reader/tanach-tehillim/part-1/torah-' + n, match, 'Tehillim ' + n);
    });

    // --- ליקוטי תפילות ---
    html = html.replace(/לי?קוטי\s*תפי?לות\s*(?:תפילה\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      return makeLink('/reader/likutay-tefilos/part-1/prayer-' + n, match, 'Prayer ' + n);
    });

    // --- שיחות הר"ן ---
    html = html.replace(/שיחות\s*הר[""״]?ן\s*(?:סי(?:מן|[׳'])?\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      return makeLink('/reader/sichos-haran/sicha-' + n, match, 'Sichos HaRan ' + n);
    });

    // --- קיצור ליקוטי מוהר"ן ---
    html = html.replace(/קי?צור\s*(?:לי?קוטי\s*)?מוהר[""״]?ן?\s*(?:סי(?:מן|[׳'])?\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      return makeLink('/reader/kitzur-likutay-moharan/part-1/torah-' + n, match, 'Kitzur LM ' + n);
    });

    // --- ספר המידות ---
    html = html.replace(/ספר\s*המי?דות/g, function(match) {
      return makeLink('/reader/sefer-hamidos/topic-1', match, 'Sefer HaMidos');
    });

    // --- השתפכות הנפש ---
    html = html.replace(/השתפכות\s*הנפש\s*(?:סי(?:מן|[׳'])?\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      return makeLink('/reader/hashtatfchus-hanefesh/section-' + n, match);
    });

    // --- משיבת נפש ---
    html = html.replace(/משיבת?\s*נפש\s*(?:סי(?:מן|[׳'])?\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      return makeLink('/reader/meshivas-nefesh/section-' + n, match);
    });

    // --- סיפורי מעשיות ---
    html = html.replace(/סיפורי\s*מעשי?ות\s*(?:מעשה\s*)?([א-ת][א-ת""״׳']*)/g, function(match, numStr) {
      var n = _parseHebrewNum(numStr);
      if (!n || n < 1) return match;
      return makeLink('/reader/sipurey-maasiyos/story-' + n, match);
    });

    return changed ? html : null;
  }

  function addCrossReferenceLinks() {
    // Process English segments
    document.querySelectorAll('.segment-en p').forEach(function(p) {
      // Skip if already processed
      if (p.dataset.xrefDone) return;
      var result = linkifyEnglish(p.innerHTML);
      if (result) {
        p.innerHTML = result;
        p.dataset.xrefDone = '1';
      }
    });

    // Process Hebrew segments
    document.querySelectorAll('.segment-he p').forEach(function(p) {
      if (p.dataset.xrefDone) return;
      var result = linkifyHebrew(p.innerHTML);
      if (result) {
        p.innerHTML = result;
        p.dataset.xrefDone = '1';
      }
    });
  }

  // --- Add permalink buttons to segments with share IDs ---
  function addShareAnchors() {
    var pairs = document.querySelectorAll('.reader-segment-pair');
    pairs.forEach(function(pair) {
      var segNum = pair.querySelector('.segment-number');
      if (!segNum) return;
      var idx = segNum.textContent.trim();
      if (!idx) return;
        
      // Check if there's embedded share data
      var shareData = window.__readerShareData__;
      if (shareData && shareData[idx]) {
        var shareId = shareData[idx];
        pair.setAttribute('data-share-id', shareId);
          
        // Add link button
        var btn = document.createElement('button');
        btn.className = 'seg-permalink-btn';
        btn.title = 'Copy link to this siman';
        btn.innerHTML = '🔗';
        btn.style.cssText = 'position:absolute;right:4px;top:2px;background:none;border:none;cursor:pointer;font-size:0.8em;opacity:0;transition:opacity 0.2s;padding:2px 6px;';
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var url = window.location.href.split('#')[0] + '#' + shareId;
          navigator.clipboard.writeText(url).then(function() {
            btn.innerHTML = '✓';
            setTimeout(function() { btn.innerHTML = '🔗'; }, 1500);
          }).catch(function() {});
        });
        pair.style.position = 'relative';
        pair.appendChild(btn);
          
        pair.addEventListener('mouseenter', function() { btn.style.opacity = '0.6'; });
        pair.addEventListener('mouseleave', function() { btn.style.opacity = '0'; });
      }
    });
      
    // Handle hash navigation to share ID
    var hash = window.location.hash.slice(1);
    if (hash) {
      var target = document.querySelector('[data-share-id=\"' + hash + '\"]');
      if (target) {
        setTimeout(function() {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.style.background = 'rgba(212, 165, 116, 0.2)';
          setTimeout(function() { target.style.background = ''; }, 2000);
        }, 500);
      }
    }
  }

  // Load share data from window.__readerShareData__ if set by template
  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(addShareAnchors, 300);
  });
  // Also run when aligned view is toggled
  var origToggleAligned = window.toggleAligned;
  window.toggleAligned = function() {
    if (origToggleAligned) origToggleAligned();
    setTimeout(addShareAnchors, 100);
  };

  // --- Add to My Sefer ---
  function setupMySefer() {
    var container = document.querySelector('.reader-container');
    if (!container) return;

    var torahId = container.dataset.torahId || '';
    var torahTitle = container.dataset.torahTitle || document.title.replace(' | A Jew', '');
    var url = window.location.pathname;

    function loadSefer() {
      try {
        var raw = localStorage.getItem(SEFER_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return { name: '', passages: [], createdAt: Date.now(), updatedAt: Date.now() };
    }

    function saveSefer(sefer) {
      sefer.updatedAt = Date.now();
      try { localStorage.setItem(SEFER_KEY, JSON.stringify(sefer)); } catch(e) {}
    }

    function showToast(msg, duration) {
      var existing = document.getElementById('sefer-toast');
      if (existing) existing.remove();
      var toast = document.createElement('div');
      toast.id = 'sefer-toast';
      toast.textContent = msg;
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a365d;color:white;padding:10px 20px;border-radius:8px;font-size:0.95em;z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,0.25);font-family:"Open Sans",sans-serif;transition:opacity 0.3s;';
      document.body.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() { toast.remove(); }, 300);
      }, duration || 2000);
    }

    function getSegmentData(segPair) {
      var hePara = segPair.querySelector('.segment-he p');
      var enPara = segPair.querySelector('.segment-en p');
      var nikudAttr = hePara ? hePara.getAttribute('data-nikud') : '';
      var he = hePara ? hePara.textContent.trim() : '';
      var en = enPara ? enPara.textContent.trim() : '';
      if (en === 'Translation not yet available') en = '';
      var idx = segPair.id ? segPair.id.replace('seg-', '') : '';
      return { he: he, en: en, he_nikud: nikudAttr || he, segmentIndex: idx };
    }

    function addPassageToSefer(data) {
      var sefer = loadSefer();
      // Check if already added (by URL + segment)
      var key = url + '#' + (data.segmentIndex || 'all');
      var exists = sefer.passages.some(function(p) { return p._key === key; });
      if (exists) {
        showToast('Already in your Sefer');
        return false;
      }

      // Determine Hebrew reference from breadcrumb or title
      var breadcrumb = container.querySelector('.reader-breadcrumb');
      var refEn = torahTitle;
      var refHe = '';
      var heTitle = container.querySelector('.hebrew-title');
      if (heTitle) refHe = heTitle.textContent.trim();
      if (data.segmentIndex && data.segmentIndex !== 'all') {
        refEn += ', Paragraph ' + data.segmentIndex;
        if (refHe) refHe += ' \u05D0\u05D5\u05EA ' + data.segmentIndex;
      }

      sefer.passages.push({
        _key: key,
        ref: refEn,
        refHe: refHe,
        book: torahId,
        he: data.he,
        en: data.en,
        he_nikud: data.he_nikud || data.he,
        segmentIndex: data.segmentIndex || '',
        readerUrl: data.segmentIndex ? url + '#seg-' + data.segmentIndex : url,
        addedAt: Date.now(),
        note: '',
        tag: ''
      });
      saveSefer(sefer);
      return true;
    }

    // Add toolbar button
    var toolbarGroups = document.querySelectorAll('.reader-toolbar-group');
    var lastGroup = toolbarGroups[toolbarGroups.length - 1];
    if (!lastGroup) return;

    var seferBtn = document.createElement('button');
    seferBtn.className = 'reader-btn reader-btn-icon';
    seferBtn.id = 'btn-add-sefer';
    seferBtn.textContent = 'My Sefer';
    seferBtn.title = 'Add this teaching to your personal Sefer';
    seferBtn.addEventListener('click', function() {
      // Collect all segments as one passage (the entire teaching)
      var segments = container.querySelectorAll('.reader-segment-pair');
      var allHe = [];
      var allEn = [];
      var allNikud = [];
      segments.forEach(function(seg) {
        var d = getSegmentData(seg);
        if (d.he) allHe.push(d.he);
        if (d.en) allEn.push(d.en);
        if (d.he_nikud) allNikud.push(d.he_nikud);
      });

      var added = addPassageToSefer({
        he: allHe.join('\n'),
        en: allEn.join('\n'),
        he_nikud: allNikud.join('\n'),
        segmentIndex: 'all'
      });
      if (added) {
        showToast('Added to your Sefer!');
        seferBtn.textContent = 'Added!';
        setTimeout(function() { seferBtn.textContent = 'My Sefer'; }, 2000);
      }
    });
    lastGroup.insertBefore(seferBtn, lastGroup.querySelector('#btn-fullscreen'));

    // Add per-segment "Add to Sefer" buttons via the copy button area
    container.querySelectorAll('.reader-segment-pair').forEach(function(pair) {
      var addBtn = document.createElement('button');
      addBtn.className = 'seg-copy-btn seg-add-sefer-btn';
      addBtn.textContent = '+Sefer';
      addBtn.title = 'Add this paragraph to your Sefer';
      addBtn.style.cssText = 'margin-left:4px;';
      addBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var d = getSegmentData(pair);
        var added = addPassageToSefer(d);
        if (added) {
          showToast('Paragraph added to your Sefer!');
          addBtn.textContent = 'Added!';
          setTimeout(function() { addBtn.textContent = '+Sefer'; }, 1500);
        }
      });
      pair.appendChild(addBtn);
    });
  }

  // --- Commentary Panel for Likutay Moharan ---
  // Shows related commentaries: Parparos, Biur, Kitzur, Chochma UTvuna, LH, Tefilos
  var commentaryState = { open: false, loaded: {}, activeTab: null, chainData: null };

  function isLmPage() {
    var p = window.location.pathname;
    return /^\/reader\/likutay-moharan\/\d+\/\d+/.test(p);
  }

  function getLmParts() {
    var m = window.location.pathname.match(/^\/reader\/likutay-moharan\/(\d+)\/(\d+)/);
    if (!m) return null;
    return { part: parseInt(m[1]), torah: parseInt(m[2]) };
  }

  // Get the current book/part/torah from URL
  function getReaderContext() {
    var path = window.location.pathname.replace(/^\/reader\//, '').replace(/\/$/, '');
    var parts = path.split('/');
    if (parts.length < 3) return null;
    return { bookId: parts[0], part: parseInt(parts[1]) || 1, torah: parseInt(parts[2]) || 1 };
  }

  function getCommentarySources(bookId, part, torah) {
    var sources = [];

    if (bookId === 'likutay-moharan') {
      // Kitzur LM (same numbering as LM)
      sources.push({
        id: 'kitzur',
        label: 'Kitzur',
        labelHe: 'קיצור ליקו"מ',
        url: '/reader/kitzur-likutay-moharan/part-' + part + '/torah-' + torah + '.json',
        readerUrl: '/reader/kitzur-likutay-moharan/' + part + '/' + torah,
        type: 'summary'
      });

      // Parparos LeChochma (section = torah, Part 1 only, sections 1-135)
      if (part === 1 && torah <= 135) {
        sources.push({
          id: 'parparos',
          label: 'Parparos',
          labelHe: 'פרפראות לחכמה',
          url: '/reader/parparos-lechochma/section-' + torah + '.json',
          readerUrl: '/reader/parparos-lechochma/1/' + torah,
          type: 'commentary'
        });
      }

      // Biur HaLikutim (section = torah, Part 1 only, sections 1-77)
      if (part === 1 && torah <= 77) {
        sources.push({
          id: 'biur',
          label: 'Biur',
          labelHe: 'ביאור הליקוטים',
          url: '/reader/biur-halikutim/section-' + torah + '.json',
          readerUrl: '/reader/biur-halikutim/1/' + torah,
          type: 'explanation'
        });
      }

      // Chochma UTvuna (section = torah, Part 1 only, sections 1-25)
      if (part === 1 && torah <= 25) {
        sources.push({
          id: 'chochma',
          label: 'Chochma',
          labelHe: 'חכמה ותבונה',
          url: '/reader/chochma-utvuna/section-' + torah + '.json',
          readerUrl: '/reader/chochma-utvuna/1/' + torah,
          type: 'explanation'
        });
      }

      // Likutay Nanach Vol 4 — automatic per-torah commentary lookup
      var ln4sources = getLN4Commentary(bookId, torah);
      for (var li = 0; li < ln4sources.length; li++) {
        sources.push(ln4sources[li]);
      }
    }

    // Sipurey Maasiyos gets Rimzei HaMaasiyos + Likutay Nanach
    if (bookId === 'sipurey-maasiyos' && torah <= 13) {
      sources.push({
        id: 'rimzei',
        label: 'Rimzei',
        labelHe: 'רמזי המעשיות',
        url: '/reader/rimzei-hamaasiyos/story-' + torah + '.json',
        readerUrl: '/reader/rimzei-hamaasiyos/1/' + torah,
        type: 'commentary'
      });
      // LN commentary on story 9
      if (torah === 9) {
        sources.push({
          id: 'likutay-nanach',
          label: 'Na Nach',
          labelHe: 'ליקוטי נ נח',
          url: '/reader/likutay-nanach/volume-4/chapter-25.json',
          readerUrl: '/reader/likutay-nanach/4/25',
          type: 'commentary'
        });
      }
    }

    // Sichos HaRan gets per-siman Likutay Nanach commentary
    if (bookId === 'sichos-haran') {
      var lnSichosMap = {1:"\u05d0",2:"\u05d1",3:"\u05d2",4:"\u05d3",5:"\u05d4",6:"\u05d5",7:"\u05d6",8:"\u05d7",9:"\u05d8",10:"\u05d9",11:"11",16:"16",20:"\u05db",23:"23",24:"\u05db\u05d3",26:"26",30:"\u05dc",32:"\u05dc\u05d1",35:"\u05dc\u05d4",36:"\u05dc\u05d5",40:"\u05de",44:"\u05de\u05d3",47:"47",48:"48",49:"\u05de\u05d8",50:"\u05e0",51:"\u05e0\u05d0",54:"\u05e0\u05d3",56:"\u05e0\u05d5",58:"58",59:"\u05e0\u05d8",60:"60",62:"\u05e1\u05d1",64:"\u05e1\u05d3",73:"73",75:"75",76:"76",77:"\u05e2\u05d6",79:"\u05e2\u05d8",93:"\u05e6\u05d2",95:"95",96:"\u05e6\u05d5",101:"101",103:"103",104:"\u05e7\u05d3",109:"\u05e7\u05d8",112:"112",116:"116",118:"118",126:"126",137:"137",139:"139",140:"140",141:"\u05e7\u05de\u05d0",143:"143",145:"\u05e7\u05de\u05d4",146:"\u05e7\u05de\u05d5",152:"\u05e7\u05e0\u05d1",153:"153",154:"154",155:"\u05e7\u05e0\u05d4",158:"158",160:"160",161:"161",165:"165",166:"166",167:"167",172:"172",175:"175",176:"176",179:"179",181:"\u05e7\u05e4\u05d0",184:"184",185:"\u05e7\u05e4\u05d4",192:"\u05e7\u05e6\u05d1",198:"198",199:"199",219:"219",220:"220",228:"228",233:"233",235:"235",237:"237",241:"241",243:"243",247:"\u05e8\u05de\u05d6",248:"248",249:"249",255:"\u05e8\u05e0\u05d4",258:"258",259:"\u05e8\u05e0\u05d8",265:"265",268:"268",269:"269",273:"273",279:"279",280:"280",284:"\u05e8\u05e4\u05d3",293:"293",296:"\u05e8\u05e6\u05d5",301:"\u05e9\u05d0",308:"\u05e9\u05d7"};
      var sichosFile = lnSichosMap[torah];
      if (sichosFile) {
        sources.push({
          id: 'ln-sichos',
          label: 'Na Nach',
          labelHe: '\u05dc\u05d9\u05e7\u05d5\u05d8\u05d9 \u05e0 \u05e0\u05d7',
          url: '/reader/likutay-nanach/volume-4/sichos-' + sichosFile + '.json',
          type: 'commentary'
        });
      }
    }

    // Chayey Moharan gets Likutay Nanach
    if (bookId === 'chayey-moharan') {
      var lnChayey = { 5: 8, 7: 9, 10: 18, 11: 19, 2: 7 };
      if (lnChayey[torah]) {
        sources.push({
          id: 'likutay-nanach',
          label: 'Na Nach',
          labelHe: 'ליקוטי נ נח',
          url: '/reader/likutay-nanach/volume-4/chapter-' + lnChayey[torah] + '.json',
          readerUrl: '/reader/likutay-nanach/4/' + lnChayey[torah],
          type: 'commentary'
        });
      }
      // Blog commentary on Chayey Moharan (all chapters)
      sources.push({
        id: 'blog-chayey',
        label: 'פתק',
        labelHe: 'הקפדת רבינו',
        url: '/reader/blog-commentary/chayey-moharan-travelers.json',
        type: 'commentary'
      });
    }

    // Shivchey HaRan gets Likutay Nanach
    if (bookId === 'shivchey-haran' && torah === 50) {
      sources.push({
        id: 'likutay-nanach',
        label: 'Na Nach',
        labelHe: 'ליקוטי נ נח',
        url: '/reader/likutay-nanach/volume-4/chapter-34.json',
        readerUrl: '/reader/likutay-nanach/4/34',
        type: 'commentary'
      });
    }

    // Likutay Halachos gets Likutay Nanach
    if (bookId === 'likutay-halachos' && torah === 11) {
      sources.push({
        id: 'likutay-nanach',
        label: 'Na Nach',
        labelHe: 'ליקוטי נ נח',
        url: '/reader/likutay-nanach/volume-4/chapter-26.json',
        readerUrl: '/reader/likutay-nanach/4/26',
        type: 'commentary'
      });
    }

    // Kitzur LM gets the full LM it summarizes
    if (bookId === 'kitzur-likutay-moharan') {
      sources.push({
        id: 'lm-full',
        label: 'Full LM',
        labelHe: 'ליקו"מ המלא',
        url: '/reader/likutay-moharan/part-' + part + '/torah-' + torah + '.json',
        readerUrl: '/reader/likutay-moharan/' + part + '/' + torah,
        type: 'source'
      });
    }

    // Likutay Eitzos gets the full LM source for each eitza
    if (bookId === 'likutay-eitzos') {
      sources.push({
        id: 'lm-source',
        label: 'Full LM',
        labelHe: 'ליקו"מ המלא',
        url: '/reader/likutay-moharan/part-1/torah-' + torah + '.json',
        readerUrl: '/reader/likutay-moharan/1/' + torah,
        type: 'source'
      });
    }


        // === Likutay Nanach Vol 4 — LM & Tinyana per-torah commentary ===
    var ln4Lookup={"likutay-moharan-tinyana_1":{v:4,c:180},"likutay-moharan-tinyana_10":{v:4,c:187},"likutay-moharan-tinyana_100":{v:4,c:234},"likutay-moharan-tinyana_101":{v:4,c:235},"likutay-moharan-tinyana_108":{v:4,c:236},"likutay-moharan-tinyana_109":{v:4,c:237},"likutay-moharan-tinyana_11":{v:4,c:188},"likutay-moharan-tinyana_110":{v:4,c:238},"likutay-moharan-tinyana_12":{v:4,c:189},"likutay-moharan-tinyana_15":{v:4,c:190},"likutay-moharan-tinyana_17":{v:4,c:191},"likutay-moharan-tinyana_18":{v:4,c:192},"likutay-moharan-tinyana_19":{v:4,c:193},"likutay-moharan-tinyana_2":{v:4,c:181},"likutay-moharan-tinyana_23":{v:4,c:194},"likutay-moharan-tinyana_24":{v:4,c:195},"likutay-moharan-tinyana_25":{v:4,c:196},"likutay-moharan-tinyana_29":{v:4,c:197},"likutay-moharan-tinyana_3":{v:4,c:182},"likutay-moharan-tinyana_32":{v:4,c:198},"likutay-moharan-tinyana_33":{v:4,c:199},"likutay-moharan-tinyana_34":{v:4,c:201},"likutay-moharan-tinyana_36":{v:4,c:200},"likutay-moharan-tinyana_37":{v:4,c:202},"likutay-moharan-tinyana_39":{v:4,c:203},"likutay-moharan-tinyana_4":{v:4,c:183},"likutay-moharan-tinyana_5":{v:4,c:184},"likutay-moharan-tinyana_7":{v:4,c:185},"likutay-moharan-tinyana_8":{v:4,c:186},"likutay-moharan-tinyana_93":{v:4,c:232},"likutay-moharan-tinyana_95":{v:4,c:233},"likutay-moharan_1":{v:4,c:5},"likutay-moharan_10":{v:4,c:14},"likutay-moharan_101":{v:4,c:91},"likutay-moharan_107":{v:4,c:92},"likutay-moharan_108":{v:4,c:93},"likutay-moharan_109":{v:4,c:94},"likutay-moharan_11":{v:4,c:15},"likutay-moharan_12":{v:4,c:16},"likutay-moharan_13":{v:4,c:17},"likutay-moharan_14":{v:4,c:18},"likutay-moharan_15":{v:4,c:19},"likutay-moharan_16":{v:4,c:20},"likutay-moharan_17":{v:4,c:21},"likutay-moharan_18":{v:4,c:22},"likutay-moharan_19":{v:4,c:23},"likutay-moharan_193":{v:4,c:130},"likutay-moharan_194":{v:4,c:131},"likutay-moharan_195":{v:4,c:132},"likutay-moharan_196":{v:4,c:133},"likutay-moharan_2":{v:4,c:6},"likutay-moharan_20":{v:4,c:24},"likutay-moharan_21":{v:4,c:25},"likutay-moharan_22":{v:4,c:26},"likutay-moharan_23":{v:4,c:27},"likutay-moharan_24":{v:4,c:28},"likutay-moharan_25":{v:4,c:29},"likutay-moharan_26":{v:4,c:30},"likutay-moharan_27":{v:4,c:31},"likutay-moharan_28":{v:4,c:32},"likutay-moharan_29":{v:4,c:33},"likutay-moharan_3":{v:4,c:7},"likutay-moharan_30":{v:4,c:34},"likutay-moharan_31":{v:4,c:35},"likutay-moharan_32":{v:4,c:36},"likutay-moharan_33":{v:4,c:37},"likutay-moharan_34":{v:4,c:38},"likutay-moharan_35":{v:4,c:39},"likutay-moharan_36":{v:4,c:40},"likutay-moharan_37":{v:4,c:41},"likutay-moharan_38":{v:4,c:42},"likutay-moharan_39":{v:4,c:43},"likutay-moharan_4":{v:4,c:8},"likutay-moharan_40":{v:4,c:44},"likutay-moharan_5":{v:4,c:9},"likutay-moharan_6":{v:4,c:10},"likutay-moharan_7":{v:4,c:11},"likutay-moharan_8":{v:4,c:12},"likutay-moharan_9":{v:4,c:13},"likutay-moharan_92":{v:4,c:85},"likutay-moharan_93":{v:4,c:86},"likutay-moharan_94":{v:4,c:87},"likutay-moharan_95":{v:4,c:88},"likutay-moharan_98":{v:4,c:89},"likutay-moharan_99":{v:4,c:90}};

    (function(){ var ln4Map = {"k":"likutay-moharan_1","v":4,"c":5},{"k":"likutay-moharan_2","v":4,"c":6},{"k":"likutay-moharan_3","v":4,"c":7},{"k":"likutay-moharan_4","v":4,"c":8},{"k":"likutay-moharan_5","v":4,"c":9},{"k":"likutay-moharan_6","v":4,"c":10},{"k":"likutay-moharan_7","v":4,"c":11},{"k":"likutay-moharan_8","v":4,"c":12},{"k":"likutay-moharan_9","v":4,"c":13},{"k":"likutay-moharan_10","v":4,"c":14},{"k":"likutay-moharan_11","v":4,"c":15},{"k":"likutay-moharan_12","v":4,"c":16},{"k":"likutay-moharan_13","v":4,"c":17},{"k":"likutay-moharan_14","v":4,"c":18},{"k":"likutay-moharan_15","v":4,"c":19},{"k":"likutay-moharan_16","v":4,"c":20},{"k":"likutay-moharan_17","v":4,"c":21},{"k":"likutay-moharan_18","v":4,"c":22},{"k":"likutay-moharan_19","v":4,"c":23},{"k":"likutay-moharan_20","v":4,"c":24},{"k":"likutay-moharan_21","v":4,"c":25},{"k":"likutay-moharan_22","v":4,"c":26},{"k":"likutay-moharan_23","v":4,"c":27},{"k":"likutay-moharan_24","v":4,"c":28},{"k":"likutay-moharan_25","v":4,"c":29},{"k":"likutay-moharan_26","v":4,"c":30},{"k":"likutay-moharan_27","v":4,"c":31},{"k":"likutay-moharan_28","v":4,"c":32},{"k":"likutay-moharan_29","v":4,"c":33},{"k":"likutay-moharan_30","v":4,"c":34},{"k":"likutay-moharan_31","v":4,"c":35},{"k":"likutay-moharan_32","v":4,"c":36},{"k":"likutay-moharan_33","v":4,"c":37},{"k":"likutay-moharan_34","v":4,"c":38},{"k":"likutay-moharan_35","v":4,"c":39},{"k":"likutay-moharan_36","v":4,"c":40},{"k":"likutay-moharan_37","v":4,"c":41},{"k":"likutay-moharan_38","v":4,"c":42},{"k":"likutay-moharan_39","v":4,"c":43},{"k":"likutay-moharan_40","v":4,"c":44},{"k":"likutay-moharan_41","v":4,"c":45},{"k":"likutay-moharan_42","v":4,"c":46},{"k":"likutay-moharan_43","v":4,"c":47},{"k":"likutay-moharan_44","v":4,"c":48},{"k":"likutay-moharan_47","v":4,"c":49},{"k":"likutay-moharan_48","v":4,"c":50},{"k":"likutay-moharan_49","v":4,"c":51},{"k":"likutay-moharan_50","v":4,"c":52},{"k":"likutay-moharan_51","v":4,"c":53},{"k":"likutay-moharan_52","v":4,"c":54},{"k":"likutay-moharan_53","v":4,"c":55},{"k":"likutay-moharan_54","v":4,"c":56},{"k":"likutay-moharan_55","v":4,"c":57},{"k":"likutay-moharan_56","v":4,"c":58},{"k":"likutay-moharan_57","v":4,"c":59},{"k":"likutay-moharan_58","v":4,"c":60},{"k":"likutay-moharan_59","v":4,"c":61},{"k":"likutay-moharan_60","v":4,"c":62},{"k":"likutay-moharan_61","v":4,"c":63},{"k":"likutay-moharan_92","v":4,"c":85},{"k":"likutay-moharan_93","v":4,"c":86},{"k":"likutay-moharan_94","v":4,"c":87},{"k":"likutay-moharan_95","v":4,"c":88},{"k":"likutay-moharan_98","v":4,"c":89},{"k":"likutay-moharan_99","v":4,"c":90},{"k":"likutay-moharan_101","v":4,"c":91},{"k":"likutay-moharan_107","v":4,"c":92},{"k":"likutay-moharan_108","v":4,"c":93},{"k":"likutay-moharan_109","v":4,"c":94},{"k":"likutay-moharan_111","v":4,"c":95},{"k":"likutay-moharan_112","v":4,"c":96},{"k":"likutay-moharan_115","v":4,"c":97},{"k":"likutay-moharan_117","v":4,"c":98},{"k":"likutay-moharan_118","v":4,"c":99},{"k":"likutay-moharan_119","v":4,"c":100},{"k":"likutay-moharan_121","v":4,"c":101},{"k":"likutay-moharan_125","v":4,"c":102},{"k":"likutay-moharan_129","v":4,"c":103},{"k":"likutay-moharan_136","v":4,"c":104},{"k":"likutay-moharan_246","v":4,"c":156},{"k":"likutay-moharan_247","v":4,"c":157},{"k":"likutay-moharan_250","v":4,"c":158},{"k":"likutay-moharan_251","v":4,"c":159},{"k":"likutay-moharan_252","v":4,"c":160},{"k":"likutay-moharan_256","v":4,"c":161},{"k":"likutay-moharan_259","v":4,"c":162},{"k":"likutay-moharan_260","v":4,"c":163},{"k":"likutay-moharan_262","v":4,"c":164},{"k":"likutay-moharan_265","v":4,"c":165},{"k":"likutay-moharan_266","v":4,"c":166},{"k":"likutay-moharan_269","v":4,"c":167},{"k":"likutay-moharan_271","v":4,"c":168},{"k":"likutay-moharan_272","v":4,"c":169},{"k":"likutay-moharan_273","v":4,"c":170},{"k":"likutay-moharan_274","v":4,"c":171},{"k":"likutay-moharan_270","v":4,"c":172},{"k":"likutay-moharan_280","v":4,"c":173},{"k":"likutay-moharan_281","v":4,"c":174},{"k":"likutay-moharan_282","v":4,"c":175},{"k":"likutay-moharan_283","v":4,"c":177},{"k":"likutay-moharan_284","v":4,"c":178},{"k":"likutay-moharan-tinyana_1","v":4,"c":180},{"k":"likutay-moharan-tinyana_2","v":4,"c":181},{"k":"likutay-moharan-tinyana_3","v":4,"c":182},{"k":"likutay-moharan-tinyana_4","v":4,"c":183},{"k":"likutay-moharan-tinyana_5","v":4,"c":184},{"k":"likutay-moharan-tinyana_7","v":4,"c":185},{"k":"likutay-moharan-tinyana_8","v":4,"c":186},{"k":"likutay-moharan-tinyana_10","v":4,"c":187},{"k":"likutay-moharan-tinyana_11","v":4,"c":188},{"k":"likutay-moharan-tinyana_12","v":4,"c":189},{"k":"likutay-moharan-tinyana_15","v":4,"c":190},{"k":"likutay-moharan-tinyana_17","v":4,"c":191},{"k":"likutay-moharan-tinyana_18","v":4,"c":192},{"k":"likutay-moharan-tinyana_19","v":4,"c":193},{"k":"likutay-moharan-tinyana_23","v":4,"c":194},{"k":"likutay-moharan-tinyana_24","v":4,"c":195},{"k":"likutay-moharan-tinyana_25","v":4,"c":196},{"k":"likutay-moharan-tinyana_29","v":4,"c":197},{"k":"likutay-moharan-tinyana_32","v":4,"c":198},{"k":"likutay-moharan-tinyana_33","v":4,"c":199},{"k":"likutay-moharan-tinyana_36","v":4,"c":200},{"k":"likutay-moharan-tinyana_34","v":4,"c":201},{"k":"likutay-moharan-tinyana_37","v":4,"c":202},{"k":"likutay-moharan-tinyana_39","v":4,"c":203},{"k":"likutay-moharan-tinyana_44","v":4,"c":204},{"k":"likutay-moharan-tinyana_46","v":4,"c":205},{"k":"likutay-moharan-tinyana_48","v":4,"c":206},{"k":"likutay-moharan-tinyana_49","v":4,"c":207},{"k":"likutay-moharan-tinyana_50","v":4,"c":208},{"k":"likutay-moharan-tinyana_52","v":4,"c":209},{"k":"likutay-moharan-tinyana_54","v":4,"c":210},{"k":"likutay-moharan-tinyana_57","v":4,"c":212},{"k":"likutay-moharan-tinyana_58","v":4,"c":213},{"k":"likutay-moharan-tinyana_59","v":4,"c":214},{"k":"likutay-moharan-tinyana_61","v":4,"c":215},{"k":"likutay-moharan-tinyana_93","v":4,"c":232},{"k":"likutay-moharan-tinyana_95","v":4,"c":233},{"k":"likutay-moharan-tinyana_100","v":4,"c":234},{"k":"likutay-moharan-tinyana_101","v":4,"c":235},{"k":"likutay-moharan-tinyana_108","v":4,"c":236},{"k":"likutay-moharan-tinyana_109","v":4,"c":237},{"k":"likutay-moharan-tinyana_110","v":4,"c":238},{"k":"likutay-moharan-tinyana_111","v":4,"c":239},{"k":"likutay-moharan-tinyana_112","v":4,"c":240},{"k":"likutay-moharan-tinyana_116","v":4,"c":241},{"k":"likutay-moharan-tinyana_117","v":4,"c":242},{"k":"likutay-moharan-tinyana_118","v":4,"c":243},{"k":"likutay-moharan-tinyana_119","v":4,"c":244},{"k":"likutay-moharan-tinyana_120","v":4,"c":245},{"k":"likutay-moharan-tinyana_121","v":4,"c":246},{"k":"likutay-moharan-tinyana_122","v":4,"c":247},{"k":"likutay-moharan-tinyana_123","v":4,"c":248},{"k":"likutay-moharan-tinyana_124","v":4,"c":249},{"k":"likutay-moharan-tinyana_125","v":4,"c":250},{"k":"sipurey-maasiyos_0","v":4,"c":254},{"k":"sipurey-maasiyos_0","v":4,"c":255},{"k":"sipurey-maasiyos_0","v":4,"c":256},{"k":"sipurey-maasiyos_0","v":4,"c":257},{"k":"sipurey-maasiyos_0","v":4,"c":258},{"k":"sipurey-maasiyos_0","v":4,"c":259},{"k":"sipurey-maasiyos_0","v":4,"c":260},{"k":"sipurey-maasiyos_0","v":4,"c":261},{"k":"sipurey-maasiyos_0","v":4,"c":262},{"k":"sipurey-maasiyos_0","v":4,"c":263},{"k":"sipurey-maasiyos_0","v":4,"c":264},{"k":"sipurey-maasiyos_0","v":4,"c":265},{"k":"sipurey-maasiyos_0","v":4,"c":266},{"k":"chayey-moharan_0","v":4,"c":268},{"k":"sichos-haran_0","v":4,"c":272}};; for (var k in d) ln4Lookup[k] = d[k]; })();
    function getLN4Commentary(bookId, torah) {
      var key = bookId + '_' + torah;
      var ch = ln4Lookup[key];
      if (!ch) return [];
      return [{id:'ln',label:'Na Nach',labelHe:'ליקוטי נ נח',
        url:'/reader/likutay-nanach/volume-'+ch.v+'/chapter-'+ch.c+'.json',
        readerUrl:'/reader/likutay-nanach/'+ch.v+'/'+ch.c,type:'commentary'}];
    }

    // === Likutay Nanach Vol 1-3 — Chumash/Neviim/Mishna commentary lookup ===
    var lnVolMap = {"mishna-arachin":{3:[51]},"mishna-avodah-zarah":{3:[41,42,74]},"mishna-avot":{3:[44,45,82]},"mishna-bava-batra":{3:[36]},"mishna-bava-kamma":{3:[34]},"mishna-bava-metzia":{3:[59]},"mishna-brachot":{3:[4,65]},"mishna-chagigah":{3:[26]},"mishna-chullin":{3:[49]},"mishna-demai":{3:[6,11]},"mishna-eduyot":{3:[43]},"mishna-eruvin":{3:[16]},"mishna-gittin":{3:[32,35]},"mishna-keilim":{3:[54]},"mishna-ketubot":{3:[28]},"mishna-kiddushin":{3:[33]},"mishna-makkot":{3:[39]},"mishna-megillah":{3:[24]},"mishna-menachot":{3:[48]},"mishna-middot":{3:[57]},"mishna-mikvaot":{3:[61]},"mishna-moed-katan":{3:[25]},"mishna-nedarim":{3:[29]},"mishna-peah":{3:[5]},"mishna-pesachim":{3:[17,18]},"mishna-rosh-hashanah":{3:[22]},"mishna-sanhedrin":{3:[38]},"mishna-shabbat":{3:[15,19,20,21,27,40,60,62,69,78,81]},"mishna-shekalim":{3:[30]},"mishna-sotah":{3:[31]},"mishna-taanit":{3:[23,58]},"mishna-tamid":{3:[56]},"mishna-temurah":{3:[52]},"mishna-yoma":{3:[77]},"mishna-zevachim":{3:[46]},"talmud-bavli-brachot":{3:[3,37]},"tanach-bamidbar":{1:[38,39,41,42,43,44,46,47]},"tanach-bereishit":{1:[6,7,8,9,10,11,12,13,14,15,16,45]},"tanach-daniel":{2:[31]},"tanach-devarim":{1:[48,49,50,51,53,54,55,56,57,58]},"tanach-divrei-hayamim":{2:[34]},"tanach-eicha":{2:[28]},"tanach-esther":{2:[30]},"tanach-ezra":{2:[32]},"tanach-iyov":{2:[25]},"tanach-kohelet":{2:[29]},"tanach-melachim":{2:[7,26]},"tanach-mishlei":{2:[23]},"tanach-nechemya":{2:[33]},"tanach-rut":{2:[17,19,27]},"tanach-shemos":{1:[17,18,19,20,21,22,23,24,25,26,27]},"tanach-shmuel":{2:[5,6,12]},"tanach-shofetim":{2:[4]},"tanach-tehillim":{2:[24]},"tanach-trei-asar":{2:[11,13]},"tanach-vayikra":{1:[28,29,30,31,32,33,35,36,37]},"tanach-yechezkel":{2:[10]},"tanach-yehoshua":{2:[3]},"tanach-yeshayahu":{2:[8]},"tanach-yirmiyahu":{2:[9]},"zohar-bereishit":{3:[63]}};
    function getLNVolumeCommentary(bookId) {
      var volMap = lnVolMap[bookId];
      if (!volMap) return [];
      var sources = [];
      for (var volNum in volMap) {
        var chapters = volMap[volNum];
        if (chapters && chapters.length > 0) {
          sources.push({
            id: 'ln-vol-' + volNum, label: 'Na Nach', labelHe: 'ליקוטי נ נח',
            readerUrl: '/reader/likutay-nanach/' + volNum,
            type: 'reference', isVolumeIndex: true, volumeNum: parseInt(volNum),
            chapterCount: chapters.length
          });
        }
      }
      return sources;
    }

    // === Likutay Nanach Vol 1-3 — volume-level commentary for all books ===
    var lnVolSources = getLNVolumeCommentary(bookId);
    for (var vi = 0; vi < lnVolSources.length; vi++) {
      var vs = lnVolSources[vi];
      if (vs.chapterCount > 0) {
        sources.push({
          id: vs.id, label: vs.label + " V" + vs.volumeNum,
          labelHe: vs.labelHe + " \u05db\u05e8\u05da " + vs.volumeNum,
          readerUrl: vs.readerUrl, url: vs.readerUrl + "/index.json",
          type: vs.type
        });
      }
    }
    }  // close getLNVolumeCommentary

// === Likutay Nanach Vol 2 — Tehillim chapter-by-chapter (10 chapters) ===
    if (bookId === 'tanach-tehillim') {
      var tehillimMap = {12:2, 16:3, 32:4, 41:5, 42:6, 59:7, 77:8, 90:9, 105:10, 137:11};
      if (tehillimMap[torah]) {
        sources.push({id:'ln-tehillim',label:'Na Nach',labelHe:'ליקוטי נ נח',
          url:'/reader/likutay-nanach/volume-2/chapter-'+tehillimMap[torah]+'.json',
          readerUrl:'/reader/likutay-nanach/2/'+tehillimMap[torah],type:'commentary'});
      }
    }

    // === Blog Commentary — per-torah verses ===
    if (bookId === 'tanach-bereishit' && torah === 37) {
      sources.push({id:'blog-vayeshev',label:'פתק',labelHe:'קמה אלמתי',
        url:'/reader/blog-commentary/vayeshev-sheaf.json',
        type:'commentary'});
    }
    if (bookId === 'tanach-bamidbar' && torah === 13) {
      sources.push({id:'blog-shelach',label:'פתק',labelHe:'יוסף במרגלים',
        url:'/reader/blog-commentary/shelach-spies.json',
        type:'commentary'});
    }
    if (bookId === 'talmud-bavli-chulin' || bookId === 'mishna-chulin' || bookId === 'mishna-chullin') {
      sources.push({id:'blog-chulin',label:'פתק',labelHe:'חולין נ נח',
        url:'/reader/blog-commentary/chulin-nanach.json',
        type:'commentary'});
    }

    // === Likutay Nanach Vol 1-3 — volume-level commentary for all books ===
    var lnVolSources = getLNVolumeCommentary(bookId);
    for (var vi = 0; vi < lnVolSources.length; vi++) {
      var vs = lnVolSources[vi];
      if (vs.chapterCount > 0) {
        sources.push({
          id: vs.id, label: vs.label + " V" + vs.volumeNum,
          labelHe: vs.labelHe + " \u05db\u05e8\u05da " + vs.volumeNum,
          readerUrl: vs.readerUrl, url: vs.readerUrl + "/index.json",
          type: vs.type
        });
      }
    }
    return sources;
  }

  function setupCommentaryPanel() {
    var ctx = getReaderContext();
    var sources = [];
    var partNum, torahNum;

    // LM pages use the existing isLmPage logic
    if (isLmPage()) {
      var lm = getLmParts();
      if (!lm) return;
      partNum = lm.part;
      torahNum = lm.torah;
      sources = getCommentarySources('likutay-moharan', partNum, torahNum);
    } else if (ctx) {
      // All other books
      partNum = ctx.part;
      torahNum = ctx.torah;
      sources = getCommentarySources(ctx.bookId, partNum, torahNum);
    }

    if (sources.length === 0) return;

    // Add Commentary button to toolbar
    var toolbarGroups = document.querySelectorAll('.reader-toolbar-group');
    var lastGroup = toolbarGroups[toolbarGroups.length - 1];
    if (!lastGroup) return;

    var commentaryBtn = document.createElement('button');
    commentaryBtn.className = 'reader-btn reader-btn-icon';
    commentaryBtn.id = 'btn-commentary';
    commentaryBtn.textContent = 'Commentary';
    commentaryBtn.title = 'Show related commentaries';
    commentaryBtn.addEventListener('click', toggleCommentaryPanel);
    lastGroup.insertBefore(commentaryBtn, lastGroup.querySelector('#btn-fullscreen'));

    // Create the commentary panel
    var panel = document.createElement('div');
    panel.className = 'commentary-panel';
    panel.id = 'commentary-panel';

    panel.innerHTML =
      '<div class="commentary-header">' +
        '<h3>Commentary</h3>' +
        '<button class="commentary-close">&times;</button>' +
      '</div>' +
      '<div class="commentary-tabs" id="commentary-tabs"></div>' +
      '<div class="commentary-body" id="commentary-body">' +
        '<div class="commentary-placeholder">Select a commentary above to view</div>' +
      '</div>';

    document.body.appendChild(panel);

    panel.querySelector('.commentary-close').addEventListener('click', toggleCommentaryPanel);

    // Build tabs from available sources + chain-of-light data
    buildCommentaryTabs(partNum, torahNum, sources);
  }

  function buildCommentaryTabs(part, torah, sources) {
    var tabsEl = document.getElementById('commentary-tabs');
    if (!tabsEl) return;

    // First add the static sources (try fetching headers to see if they exist)
    var pendingSources = sources.slice();
    var validSources = [];
    var checked = 0;

    function addTab(source) {
      var tab = document.createElement('button');
      tab.className = 'commentary-tab';
      tab.dataset.sourceId = source.id;
      tab.innerHTML = '<span class="tab-he">' + source.labelHe + '</span><span class="tab-en">' + source.label + '</span>';
      tab.title = source.label;
      tab.addEventListener('click', function() {
        loadCommentary(source);
        document.querySelectorAll('.commentary-tab').forEach(function(t) { t.classList.remove('active'); });
        tab.classList.add('active');
      });
      tabsEl.appendChild(tab);
    }

    // Check each source exists by attempting fetch (HEAD or small fetch)
    pendingSources.forEach(function(source) {
      fetch(source.url, { method: 'GET' })
        .then(function(r) {
          if (r.ok) {
            return r.json().then(function(data) {
              // Cache the data
              commentaryState.loaded[source.id] = data;
              // Check if it has actual content (segments with text)
              if (data && data.segments && data.segments.length > 0) {
                validSources.push(source);
              }
              checked++;
              if (checked === pendingSources.length) finalize();
            });
          } else {
            checked++;
            if (checked === pendingSources.length) finalize();
          }
        })
        .catch(function() {
          checked++;
          if (checked === pendingSources.length) finalize();
        });
    });

    // Also load chain-of-light for LH and Tefilos connections
    fetch('/chain-of-light.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        commentaryState.chainData = data;
        var partKey = 'part-' + part;
        var torahKey = String(torah);
        if (data.connections && data.connections[partKey] && data.connections[partKey][torahKey]) {
          var conns = data.connections[partKey][torahKey].connections || [];
          // Group LH connections
          var lhConns = conns.filter(function(c) { return c.book === 'likutay-halachos'; });
          var ltConns = conns.filter(function(c) { return c.book === 'likutay-tefilos'; });

          if (lhConns.length > 0) {
            validSources.push({
              id: 'lh-chain',
              label: 'Lik. Halachos',
              labelHe: 'ליקוטי הלכות',
              type: 'chain',
              connections: lhConns
            });
          }
          if (ltConns.length > 0) {
            validSources.push({
              id: 'lt-chain',
              label: 'Lik. Tefilos',
              labelHe: 'ליקוטי תפילות',
              type: 'chain',
              connections: ltConns
            });
          }
        }
      })
      .catch(function() {})
      .finally(function() {
        // Re-check finalization - chain data loaded
        if (checked === pendingSources.length) finalize();
      });

    function finalize() {
      // Sort: kitzur, parparos, biur, chochma, lh, lt
      var order = ['kitzur', 'parparos', 'biur', 'chochma', 'lh-chain', 'lt-chain'];
      validSources.sort(function(a, b) {
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
      tabsEl.innerHTML = '';
      if (validSources.length === 0) {
        tabsEl.innerHTML = '<div style="padding:8px;color:var(--reader-text-secondary);font-size:0.85em;">No commentaries available for this torah</div>';
        // Hide the button or dim it
        var btn = document.getElementById('btn-commentary');
        if (btn) {
          btn.style.opacity = '0.4';
          btn.title = 'No commentaries available for this torah';
        }
        return;
      }
      validSources.forEach(addTab);

      // Auto-open first tab
      var firstTab = tabsEl.querySelector('.commentary-tab');
      if (firstTab) firstTab.click();
    }
  }

  function loadCommentary(source) {
    var body = document.getElementById('commentary-body');
    if (!body) return;

    commentaryState.activeTab = source.id;

    // Chain-of-light connections (LH, Tefilos)
    if (source.type === 'chain') {
      var html = '<div class="commentary-connections">';
      source.connections.forEach(function(conn) {
        html += '<a href="' + conn.url + '" class="commentary-connection-item" target="_blank">' +
          '<div class="conn-book">' + (conn.bookHebrew || conn.bookTitle) + '</div>' +
          '<div class="conn-snippet">' + (conn.snippet || '').substring(0, 120) + (conn.snippet && conn.snippet.length > 120 ? '...' : '') + '</div>' +
          '<div class="conn-type">' + (conn.typeHebrew || conn.typeLabel || '') + '</div>' +
        '</a>';
      });
      html += '</div>';
      body.innerHTML = html;
      return;
    }

    // Cached JSON data
    if (commentaryState.loaded[source.id]) {
      renderCommentaryContent(body, commentaryState.loaded[source.id], source);
      return;
    }

    body.innerHTML = '<div class="commentary-loading">Loading...</div>';

    fetch(source.url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        commentaryState.loaded[source.id] = data;
        if (commentaryState.activeTab === source.id) {
          renderCommentaryContent(body, data, source);
        }
      })
      .catch(function() {
        if (commentaryState.activeTab === source.id) {
          body.innerHTML = '<div class="commentary-placeholder">Failed to load commentary</div>';
        }
      });
  }

  function renderCommentaryContent(body, data, source) {
    if (!data || !data.segments || data.segments.length === 0) {
      body.innerHTML = '<div class="commentary-placeholder">No content available</div>';
      return;
    }

    var html = '<div class="commentary-content">';

    // Header with link to full page
    if (source.readerUrl) {
      html += '<a href="' + source.readerUrl + '" class="commentary-full-link" target="_blank">' +
        'Open full text in reader &rarr;</a>';
    }

    // Show segments (Hebrew only for commentary, compact)
    data.segments.forEach(function(seg, i) {
      if (!seg.he && !seg.en) return;
      var heText = seg.he_nikud || seg.he || '';
      var enText = seg.en || '';
      html += '<div class="commentary-segment" data-index="' + seg.index + '">';
      if (heText) {
        html += '<p class="commentary-he" dir="rtl">' + heText + '</p>';
      }
      if (enText && enText !== 'Translation not yet available') {
        html += '<p class="commentary-en">' + enText + '</p>';
      }
      html += '</div>';
    });

    html += '</div>';
    body.innerHTML = html;
  }

  function toggleCommentaryPanel() {
    commentaryState.open = !commentaryState.open;
    var panel = document.getElementById('commentary-panel');
    if (panel) {
      panel.classList.toggle('open', commentaryState.open);
    }
    var btn = document.getElementById('btn-commentary');
    if (btn) btn.classList.toggle('active', commentaryState.open);
  }

  // --- Kol HaTzadik Audio Player ---
  var KHT_AUDIO_MAP = {
    'likutay-moharan':       { ia: 'kol-hatzadik-likutay-moharan-1', parts: { 1: 'kol-hatzadik-likutay-moharan-1', 2: 'kol-hatzadik-likutay-moharan-2' } },
    'kitzur-likutay-moharan': { ia: 'kol-hatzadik-kitzur-likutay-moharan' },
    'sichos-haran':          { ia: 'kol-hatzadik-sichos-haran' },
    'sefer-hamidos':         { ia: 'kol-hatzadik-sefer-hamidos' },
    'sipurey-maasiyos':      { ia: 'kol-hatzadik-sipuray-maaseyos' },
    'shivchay-haran':        { ia: 'kol-hatzadik-shivchay-haran' },
    'chayey-moharan':        { ia: 'kol-hatzadik-chayay-moharan' },
    'likutay-tefilos':       { ia: 'kol-hatzadik-likutay-tefilos' },
    'alim-litrufa':          { ia: 'kol-hatzadik-ulim-litrufa' },
    'meshivas-nefesh':       { ia: 'kol-hatzadik-meshivas-nefesh' },
    'hashtatfchus-hanefesh': { ia: 'kol-hatzadik-hishtafchus-hanefesh' },
    'kokhvei-or':            { ia: 'kol-hatzadik-koachvay-or' },
    'likutay-halachos':      { ia: 'kol-hatzadik-likutay-halachos' },
    'likutay-eitzos':        { ia: 'kol-hatzadik-melody-likutay-aitzos' },
    'yemei-moharnat':        { ia: 'kol-hatzadik-yimay-moharnat' },
    'yemei-hatlaos':         { ia: 'kol-hatzadik-yimay-hatlaos' },
    'shemos-hatzadikim':     { ia: 'kol-hatzadik-shaimos-hatzadikim' },
  };

  function setupAudioPlayer() {
    var container = document.querySelector('.reader-container');
    if (!container) return;

    // Extract book ID from URL: /reader/BOOK-ID/part/torah
    var pathParts = window.location.pathname.replace(/^\/reader\//, '').split('/');
    var bookId = pathParts[0];
    var partNum = parseInt(pathParts[1]) || 1;
    var torahNum = parseInt(pathParts[2]) || 1;

    var audioConfig = KHT_AUDIO_MAP[bookId];
    if (!audioConfig) return; // No audio for this book

    // Determine the IA item ID
    var iaItem = audioConfig.ia;
    if (audioConfig.parts && audioConfig.parts[partNum]) {
      iaItem = audioConfig.parts[partNum];
    }

    // Track filename: track-NNNN.mp3
    var trackNum = String(torahNum).padStart(4, '0');
    var audioUrl = 'https://archive.org/download/' + iaItem + '/track-' + trackNum + '.mp3';

    // Create player bar
    var playerBar = document.createElement('div');
    playerBar.className = 'kht-audio-player';
    playerBar.innerHTML =
      '<div class="kht-player-inner">' +
        '<button class="kht-play-btn" title="Play Kol HaTzadik">&#9654;</button>' +
        '<div class="kht-info">' +
          '<span class="kht-label">&#127911; Kol HaTzadik</span>' +
          '<span class="kht-time">0:00 / 0:00</span>' +
        '</div>' +
        '<input type="range" class="kht-progress" min="0" max="100" value="0" />' +
        '<button class="kht-speed-btn" title="Playback speed">1x</button>' +
      '</div>';

    // Insert after the toolbar
    var toolbar = document.querySelector('.reader-toolbar');
    if (toolbar) {
      toolbar.parentNode.insertBefore(playerBar, toolbar.nextSibling);
    } else {
      container.insertBefore(playerBar, container.firstChild);
    }

    // Audio element
    var audio = new Audio();
    audio.preload = 'metadata';
    audio.src = audioUrl;

    var playBtn = playerBar.querySelector('.kht-play-btn');
    var progress = playerBar.querySelector('.kht-progress');
    var timeDisplay = playerBar.querySelector('.kht-time');
    var speedBtn = playerBar.querySelector('.kht-speed-btn');
    var speeds = [1, 1.25, 1.5, 0.75];
    var speedIdx = 0;

    function formatTime(s) {
      if (isNaN(s)) return '0:00';
      var m = Math.floor(s / 60);
      var sec = Math.floor(s % 60);
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    // Check if audio exists (404 = no recording for this page)
    audio.addEventListener('error', function() {
      playerBar.style.display = 'none';
    });

    audio.addEventListener('loadedmetadata', function() {
      progress.max = Math.floor(audio.duration);
      timeDisplay.textContent = '0:00 / ' + formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', function() {
      progress.value = Math.floor(audio.currentTime);
      timeDisplay.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    });

    audio.addEventListener('ended', function() {
      playBtn.textContent = '\u25B6';
      playBtn.classList.remove('playing');
    });

    playBtn.addEventListener('click', function() {
      if (audio.paused) {
        audio.play();
        playBtn.textContent = '\u275A\u275A';
        playBtn.classList.add('playing');
      } else {
        audio.pause();
        playBtn.textContent = '\u25B6';
        playBtn.classList.remove('playing');
      }
    });

    progress.addEventListener('input', function() {
      audio.currentTime = progress.value;
    });

    speedBtn.addEventListener('click', function() {
      speedIdx = (speedIdx + 1) % speeds.length;
      audio.playbackRate = speeds[speedIdx];
      speedBtn.textContent = speeds[speedIdx] + 'x';
    });
  }

  // --- Segment Permalink Buttons ---
  function setupSegmentLinks() {
    document.querySelectorAll('.reader-segment-pair[id]').forEach(function(pair) {
      var btn = document.createElement('button');
      btn.className = 'seg-link-btn';
      btn.textContent = '\u{1F517}';
      btn.title = 'Copy link to this section';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var url = window.location.origin + window.location.pathname + '#' + pair.id;
        navigator.clipboard.writeText(url).then(function() {
          btn.textContent = '\u2713';
          btn.classList.add('copied');
          setTimeout(function() { btn.textContent = '\u{1F517}'; btn.classList.remove('copied'); }, 2000);
        });
      });
      pair.appendChild(btn);
    });
    // Scroll to fragment on load
    if (window.location.hash) {
      var target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(function() { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
        target.style.outline = '2px solid #ffd54f';
        setTimeout(function() { target.style.outline = ''; }, 3000);
      }
    }
  }

  // --- Font Notification (show once) ---
  function showFontNotification() {
    var NOTIF_KEY = 'ajew-font-notif-shown';
    if (localStorage.getItem(NOTIF_KEY)) return;
    // Only show after 3rd visit
    var visits = parseInt(localStorage.getItem('ajew-reader-visits') || '0') + 1;
    localStorage.setItem('ajew-reader-visits', String(visits));
    if (visits < 3) return;

    var notif = document.createElement('div');
    notif.className = 'font-notification';
    notif.innerHTML =
      '<strong>Did you know?</strong> You can choose from 11 different Hebrew fonts ' +
      'for reading. Look for the font selector in the toolbar above. ' +
      'Try <em>Taamey Frank</em> for a classic feel or <em>Keter YG</em> for elegance.' +
      '<button class="dismiss-notif">Got it</button>';
    document.body.appendChild(notif);

    notif.querySelector('.dismiss-notif').addEventListener('click', function() {
      notif.remove();
      localStorage.setItem(NOTIF_KEY, '1');
    });

    // Auto-dismiss after 15 seconds
    setTimeout(function() {
      if (notif.parentNode) {
        notif.remove();
        localStorage.setItem(NOTIF_KEY, '1');
      }
    }, 15000);
  }

  // --- Auto-highlight search terms from URL param ?q= ---
  function autoHighlightFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q || q.length < 2) return;
    // Content loads asynchronously — poll for segments, then highlight
    let attempts = 0;
    const maxAttempts = 30; // ~3 seconds max
    function tryHighlight() {
      const segments = document.querySelectorAll('.reader-segment p');
      if (segments.length > 0) {
        performSearch(q);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryHighlight, 100);
      }
    }
    setTimeout(tryHighlight, 300); // slight delay for initial page render
  }

  function setupReaderFocusMode() {
    document.addEventListener('click', function(e) {
      var btn = e.target && e.target.closest && e.target.closest('#btn-immse');
      var exit = e.target && e.target.closest && e.target.closest('#reader-focus-exit');
      if (!btn && !exit) return;
      e.preventDefault();
      var on = btn ? !document.body.classList.contains('reader-immersive') : false;
      document.body.classList.toggle('reader-immersive', on);
      var container = document.querySelector('.reader-container');
      if (container) container.classList.toggle('immerse-mode', on);
      var focusBtn = document.getElementById('btn-immse');
      if (focusBtn) {
        focusBtn.classList.toggle('active', on);
        focusBtn.textContent = on ? 'Show controls' : 'Focus';
      }
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); setupMySefer(); setupCommentaryPanel(); setupAudioPlayer(); setupSegmentLinks(); setupReaderFocusMode(); showFontNotification(); setTimeout(addCrossReferenceLinks, 500); autoHighlightFromQuery(); });
  } else {
    init();
    setupMySefer();
    setupCommentaryPanel();
    setupAudioPlayer();
    setupSegmentLinks();
    setupReaderFocusMode();
    showFontNotification();
    setTimeout(addCrossReferenceLinks, 500);
    autoHighlightFromQuery();
  }
})();
