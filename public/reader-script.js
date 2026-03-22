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
    setupRelatedTeachings();
    setupSelectionPopup();
    setupSegmentHighlight();
    setupCopyButtons();

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

  function speakSegments(startFrom) {
    const segments = getTextSegments();
    if (startFrom >= segments.length) {
      stopSpeaking();
      return;
    }

    ttsState.currentSeg = startFrom;
    const seg = segments[startFrom];

    // Highlight the current segment pair
    const pairIndex = Math.floor(startFrom / (state.mode === 'both' ? 2 : 1));
    highlightSegment(pairIndex);

    // Scroll into view
    const pairs = document.querySelectorAll('.reader-segment-pair');
    if (pairs[pairIndex]) {
      pairs[pairIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const utterance = new SpeechSynthesisUtterance(seg.text);
    utterance.lang = seg.lang;
    const speedPref = parseFloat(localStorage.getItem('ajew-tts-speed') || '1');
    utterance.rate = (seg.lang === 'he-IL' ? 0.85 : 0.9) * speedPref;

    utterance.onend = () => {
      if (ttsState.speaking && !ttsState.paused) {
        speakSegments(startFrom + 1);
      }
    };

    utterance.onerror = () => {
      if (ttsState.speaking) speakSegments(startFrom + 1);
    };

    speechSynthesis.speak(utterance);
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
      // Start
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

    document.addEventListener('mousedown', (e) => {
      if (!popup.contains(e.target)) popup.style.display = 'none';
    });
  }

  // --- Share ---
  function shareCurrentPage() {
    const title = document.title.replace(' | A Jew', '');
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('btn-share');
        if (btn) {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Share'; }, 2000);
        }
      }).catch(() => {
        // Fallback
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        const btn = document.getElementById('btn-share');
        if (btn) {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Share'; }, 2000);
        }
      });
    }
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

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
