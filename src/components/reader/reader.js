/**
 * AJEW.ORG - Sefaria-Style Text Reader
 * Client-side interactive logic for the bilingual text reader.
 */

(function() {
  'use strict';

  // --- State ---
  const PREFS_KEY = 'ajew-reader-prefs';
  let state = {
    mode: 'hebrew',       // 'hebrew' | 'english' | 'both'
    nikud: false,         // Show nikud (vowel marks) - off by default
    fontSize: 18,
    fontFamily: "'Frank Ruhl Libre', serif",
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

    // Update buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });
  }

  // --- Font Controls ---
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
      timestamp: Date.now()
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
        case 'Escape':
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

  // --- Initialize ---
  function init() {
    loadPrefs();
    applyAll();
    restoreBookmark();
    setupCopyAttribution();
    setupKeyboard();
    setupScrollSpy();

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

    // Font size slider
    const slider = document.getElementById('font-size-slider');
    if (slider) {
      slider.addEventListener('input', () => setState('fontSize', parseInt(slider.value)));
    }

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

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
