/**
 * Reader v2 — ajew.org Phase 1 Renovation
 * ========================================
 * Replaces src/components/reader/reader.js
 * Features: bilingual sync, Immerse Mode, highlights, notes, TTS
 */

(function() {
  'use strict';

  // ─── State ───
  const PREFS_KEY = 'ajew-reader-prefs';
  const HIGHLIGHTS_KEY = 'ajew-highlights';
  const NOTES_KEY = 'ajew-notes';
  const HISTORY_KEY = 'ajew-reading-history';

  let state = {
    mode: 'both',         // 'hebrew' | 'english' | 'both'
    nikud: false,
    fontSize: 18,
    theme: 'day',         // 'day' | 'sepia' | 'night'
    immerse: false,       // immersive/full-screen reading mode
    scrollSync: true,     // sync English to Hebrew scroll position
    bookmarks: {},
  };

  // ─── Load/Save ───
  function loadPrefs() {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) state = { ...state, ...JSON.parse(saved) };
    } catch (e) {}
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  // ─── Reading History ───
  function recordVisit() {
    try {
      const container = document.querySelector('.reader-container');
      if (!container) return;

      const url = window.location.pathname;
      const title = container.dataset.torahTitle || document.title;
      const book = container.dataset.book || '';
      const progress = getScrollProgress();

      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      // Remove existing entry for this URL
      const filtered = history.filter(h => h.url !== url);
      // Prepend new entry
      filtered.unshift({ url, title, book, progress, timestamp: Date.now(), date: new Date().toISOString() });
      // Keep last 100
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 100)));
    } catch (e) {}
  }

  function getScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
  }

  // ─── Theme ───
  function applyTheme() {
    const container = document.querySelector('.reader-container');
    if (!container) return;

    container.removeAttribute('data-theme');
    document.body.classList.remove('dark-mode');

    if (state.theme === 'night') {
      container.setAttribute('data-theme', 'night');
      document.body.classList.add('dark-mode');
    } else if (state.theme === 'sepia') {
      container.setAttribute('data-theme', 'sepia');
    }

    // Update toolbar
    document.querySelectorAll('[data-theme-btn]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeBtn === state.theme);
    });
  }

  function setTheme(theme) {
    state.theme = theme;
    savePrefs();
    applyTheme();
  }

  // ─── Language Mode ───
  function applyMode() {
    const content = document.querySelector('.reader-content');
    if (!content) return;

    content.classList.remove('mode-hebrew', 'mode-english', 'mode-both');
    content.classList.add('mode-' + state.mode);

    const container = document.querySelector('.reader-container');
    if (container) {
      container.classList.toggle('mode-hebrew', state.mode === 'hebrew');
      container.classList.toggle('mode-english', state.mode === 'english');
      container.classList.toggle('mode-both', state.mode === 'both');
    }

    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.mode);
    });
  }

  function setMode(mode) {
    state.mode = mode;
    savePrefs();
    applyMode();

    // Auto-close commentary sidebar in 'both' mode for full-width bilingual view
    if (mode === 'both') {
      const body = document.body;
      if (body.classList.contains('has-commentary-sidebar-open')) {
        body.classList.remove('has-commentary-sidebar-open');
        const sidebar = document.querySelector('.commentary-sidebar');
        if (sidebar) sidebar.classList.remove('is-open');
        const toggle = document.querySelector('.commentary-sidebar-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    }
  }

  // ─── Font Size ───
  function applyFontSize() {
    const container = document.querySelector('.reader-container');
    if (container) {
      container.style.setProperty('--reader-font-size', state.fontSize + 'px');
    }
    const slider = document.getElementById('font-size-slider');
    if (slider) slider.value = state.fontSize;

    // Update font size display
    const display = document.getElementById('font-size-display');
    if (display) display.textContent = state.fontSize + 'px';
  }

  function setFontSize(size) {
    state.fontSize = Math.max(12, Math.min(32, size));
    savePrefs();
    applyFontSize();
  }

  // ─── Aligned View Toggle ───
  let alignedView = false;

  function toggleAligned() {
    const original = document.querySelector('.reader-content-original');
    const aligned = document.querySelector('.reader-content-aligned');
    const tocList = document.querySelector('.reader-toc-list');
    const tocHeading = document.querySelector('.reader-toc h3');
    const btn = document.getElementById('btn-align');
    if (!original || !aligned) return;

    alignedView = !alignedView;

    if (alignedView) {
      original.style.display = 'none';
      aligned.style.display = '';
      if (btn) btn.classList.add('active');
      // Update TOC to show aligned segment links
      if (tocList) {
        const alignedSegs = document.querySelectorAll('.reader-content-aligned .reader-segment-pair');
        if (alignedSegs.length > 0) {
          tocHeading.textContent = 'SEGMENTS';
          tocList.innerHTML = Array.from(alignedSegs).map(seg => {
            const idx = seg.querySelector('.segment-number')?.textContent || '';
            return `<li><a href="#${seg.id}" data-index="${idx}">${idx}</a></li>`;
          }).join('');
        }
      }
    } else {
      original.style.display = '';
      aligned.style.display = 'none';
      if (btn) btn.classList.remove('active');
      // Restore TOC to paragraph links
      if (tocHeading) tocHeading.textContent = 'PARAGRAPHS';
      // Restore original TOC from page
      const container = document.querySelector('.reader-container');
      if (container) {
        const origSegs = document.querySelectorAll('.reader-content-original .reader-segment-pair');
        if (origSegs.length > 0 && tocList) {
          tocList.innerHTML = Array.from(origSegs).map(seg => {
            const idx = seg.querySelector('.segment-number')?.textContent || '';
            return `<li><a href="#${seg.id}" data-index="${idx}">Paragraph ${idx}</a></li>`;
          }).join('');
        }
      }
    }
  }

  // ─── Immerse Mode ───
  function toggleImmerse() {
    state.immerse = !state.immerse;
    savePrefs();

    const navbar = document.querySelector('.navbar, .desktop-sidebar, .mobile-header');
    const footer = document.querySelector('footer');
    const container = document.querySelector('.reader-container');

    if (state.immerse) {
      if (navbar) navbar.style.display = 'none';
      if (footer) footer.style.display = 'none';
      if (container) container.classList.add('immerse-mode');
      document.body.classList.add('reader-immersive');
    } else {
      if (navbar) navbar.style.display = '';
      if (footer) footer.style.display = '';
      if (container) container.classList.remove('immerse-mode');
      document.body.classList.remove('reader-immersive');
    }

    const btn = document.getElementById('btn-immse');
    if (btn) {
      btn.classList.toggle('active', state.immerse);
      btn.textContent = state.immerse ? '✕ Immerse' : '☾ Immerse';
    }
  }

  // ─── Scroll Sync ───
  function setupScrollSync() {
    if (!state.scrollSync) return;

    const hePanel = document.querySelector('.segment-he, [dir="rtl"].reader-segment');
    const enPanel = document.querySelector('.segment-en, [dir="ltr"].reader-segment');
    if (!hePanel || !enPanel) return;

    // Sync English scroll to match Hebrew scroll percentage
    let isScrolling = false;
    hePanel.addEventListener('scroll', () => {
      if (isScrolling) return;
      isScrolling = true;
      const pct = hePanel.scrollTop / (hePanel.scrollHeight - hePanel.clientHeight);
      if (enPanel) {
        enPanel.scrollTop = pct * (enPanel.scrollHeight - enPanel.clientHeight);
      }
      requestAnimationFrame(() => { isScrolling = false; });
    }, { passive: true });
  }

  // ─── Highlight System ───
  function setupHighlighting() {
    const container = document.querySelector('.reader-content');
    if (!container) return;

    // Double-click to highlight
    container.addEventListener('dblclick', function(e) {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const text = selection.toString().trim();
      if (text.length < 5) return;

      showHighlightContext(text, selection);
    });

    // Long-press for mobile
    let pressTimer = null;
    container.addEventListener('touchstart', function(e) {
      pressTimer = setTimeout(function() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        const text = selection.toString().trim();
        if (text.length < 5) return;
        showHighlightContext(text, selection);
      }, 800);
    }, { passive: true });
    container.addEventListener('touchend', () => clearTimeout(pressTimer), { passive: true });
    container.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });
  }

  function showHighlightContext(text, selection) {
    // Remove existing context menu
    const existing = document.getElementById('highlight-context-menu');
    if (existing) existing.remove();

    // Create highlight context menu
    const menu = document.createElement('div');
    menu.id = 'highlight-context-menu';
    menu.className = 'highlight-context-menu';
    menu.innerHTML = `
      <button class="hl-action" data-action="save">💾 Save</button>
      <button class="hl-action" data-action="note">📝 Note</button>
      <button class="hl-action" data-action="pray">🙏 Prayer</button>
      <button class="hl-action" data-action="share">📤 Share</button>
    `;

    // Position menu near selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    menu.style.top = (rect.top + window.scrollY - 50) + 'px';
    menu.style.left = Math.max(10, rect.left - 80) + 'px';

    document.body.appendChild(menu);

    // Bind actions
    menu.querySelectorAll('.hl-action').forEach(btn => {
      btn.addEventListener('click', function() {
        const action = this.dataset.action;
        handleHighlightAction(action, text);
        menu.remove();
        // Clear selection after action
        selection.removeAllRanges();
      });
    });

    // Dismiss on click outside
    setTimeout(() => {
      document.addEventListener('click', function dismiss(e) {
        if (menu.contains(e.target)) return;
        menu.remove();
        document.removeEventListener('click', dismiss);
      });
    }, 100);
  }

  function handleHighlightAction(action, text) {
    const url = window.location.pathname;
    const source = getTorahSource();

    switch (action) {
      case 'save':
        saveHighlight(text, url, source);
        break;
      case 'note':
        const note = prompt('Add a note to this highlight:', '');
        if (note !== null) {
          saveHighlight(text, url, source, note);
        }
        break;
      case 'pray':
        saveHighlight(text, url, source, '', 'prayer');
        break;
      case 'share':
        shareHighlight(text, source);
        break;
    }
  }

  function saveHighlight(text, url, source, note, type) {
    const highlights = JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '[]');
    highlights.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text, url, source, note: note || '',
      type: type || 'highlight',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));

    showToast('Highlight saved 💾');
  }

  function shareHighlight(text, source) {
    const shareText = `"${text}"\n\n— ${source}\najew.org`;

    if (navigator.share) {
      navigator.share({ title: 'Torah Quote', text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('Copied to clipboard 📋');
      }).catch(() => {});
    }
  }

  // ─── Teaching Share / My Sefer Buttons ───
  function absoluteSegmentUrl(id, extra) {
    const url = new URL(window.location.href);
    url.searchParams.delete('t');
    if (extra) Object.keys(extra).forEach(k => { if (extra[k] != null) url.searchParams.set(k, extra[k]); });
    if (id) url.hash = id.startsWith('#') ? id : '#' + id;
    return url.toString();
  }

  function segmentTitle(seg) {
    const source = getTorahSource();
    const n = (seg.id || '').replace(/^seg-/, '').replace(/^segment-/, '').replace(/^aligned-/, '');
    return source + (n ? ' — Teaching ' + n : '');
  }

  function segmentPlainText(seg) {
    const clone = seg.cloneNode(true);
    clone.querySelectorAll('.ajew-segment-actions,.ajew-suno-segment-player,audio,button,select').forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function shareOrCopy(title, text, url, btn) {
    if (navigator.share) {
      navigator.share({ title, text: text || title, url }).catch(() => {});
      return;
    }
    const payload = (text ? text + '\n\n— ' : '') + title + '\n' + url;
    navigator.clipboard.writeText(payload).then(() => {
      showToast('Copied share link 📋');
      if (btn) { const old = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = old; }, 1500); }
    }).catch(() => window.prompt('Copy link:', payload));
  }

  function saveSegmentToMySefer(seg, btn) {
    const entry = {
      id: 'seg-' + Date.now(),
      title: segmentTitle(seg),
      content: segmentPlainText(seg),
      source: absoluteSegmentUrl(seg.id),
      addedAt: new Date().toISOString()
    };
    try {
      const key = 'ajew-my-sefer';
      const saved = JSON.parse(localStorage.getItem(key) || '{"sections":[]}');
      if (!Array.isArray(saved.sections)) saved.sections = [];
      saved.sections.push(entry);
      localStorage.setItem(key, JSON.stringify(saved));
      showToast('Added to My Sefer');
      if (btn) { btn.textContent = 'Added!'; setTimeout(() => { btn.textContent = '+ My Sefer'; }, 1500); }
    } catch(e) {}
  }

  function setupSegmentShareActions() {
    document.querySelectorAll('.reader-segment-pair').forEach(seg => {
      if (!seg.id || seg.querySelector(':scope > .ajew-segment-actions')) return;
      const bar = document.createElement('div');
      bar.className = 'ajew-segment-actions';
      bar.style.cssText = 'display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;margin:.35rem 0 .15rem;font-family:system-ui,-apple-system,sans-serif;';
      function button(label, title) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ajew-segment-action-btn';
        b.textContent = label;
        b.title = title || label;
        b.style.cssText = 'background:#2a4a6a;color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:.18rem .55rem;cursor:pointer;font-size:.78em;font-weight:700;';
        return b;
      }
      const share = button('↗ Share teaching', 'Share this teaching');
      share.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); shareOrCopy(segmentTitle(seg), segmentPlainText(seg), absoluteSegmentUrl(seg.id), share); });
      const add = button('+ My Sefer', 'Add this whole teaching to My Sefer');
      add.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); saveSegmentToMySefer(seg, add); });
      const copy = button('Copy teaching', 'Copy this teaching');
      copy.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const text = segmentPlainText(seg) + '\n\n— ' + segmentTitle(seg) + '\n' + absoluteSegmentUrl(seg.id); navigator.clipboard.writeText(text).then(() => { copy.textContent = 'Copied!'; setTimeout(() => { copy.textContent = 'Copy teaching'; }, 1500); }); });
      bar.append(share, add, copy);
      seg.insertBefore(bar, seg.firstChild);
    });
  }

  function getTorahSource() {
    const container = document.querySelector('.reader-container');
    if (!container) return '';
    const title = container.dataset.torahTitle || '';
    const book = container.dataset.book || '';
    return title ? `${title} (${book})` : book;
  }

  function showToast(message) {
    let toast = document.getElementById('reader-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'reader-toast';
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--ds-navy-700,#1a365d);color:white;padding:10px 24px;border-radius:24px;font-size:14px;z-index:10000;opacity:0;transition:opacity 0.2s;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2000);
  }

  // ─── Highlight Rendering ───
  function renderSavedHighlights() {
    const highlights = JSON.parse(localStorage.getItem(HIGHLIGHTS_KEY) || '[]');
    const url = window.location.pathname;
    const urlHighlights = highlights.filter(h => h.url === url);

    urlHighlights.forEach(h => {
      findAndHighlightText(h.text, h.id, h.type);
    });
  }

  function findAndHighlightText(text, id, type) {
    const container = document.querySelector('.reader-content');
    if (!container) return;

    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.parentElement.closest('#highlight-context-menu, #reader-toast')) continue;
      if (regex.test(node.textContent)) {
        textNodes.push({ node, match: regex });
        regex.lastIndex = 0;
      }
    }

    textNodes.forEach(({ node, match }) => {
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let m;
      while ((m = match.exec(node.textContent)) !== null) {
        if (m.index > lastIndex) {
          frag.appendChild(document.createTextNode(node.textContent.slice(lastIndex, m.index)));
        }
        const span = document.createElement('span');
        span.className = 'reader-highlight' + (type === 'prayer' ? ' highlight-prayer' : '');
        span.dataset.highlightId = id;
        span.textContent = m[0];
        frag.appendChild(span);
        lastIndex = match.lastIndex;
      }
      if (lastIndex < node.textContent.length) {
        frag.appendChild(document.createTextNode(node.textContent.slice(lastIndex)));
      }
      node.parentNode.replaceChild(frag, node);
    });
  }

  // ─── TTS (Text-to-Speech) ───
  let ttsPlaying = false;
  let ttsCurrentNode = null;
  let ttsHighlightEl = null;

  function initTTS() {
    if (!('speechSynthesis' in window)) {
      const btn = document.getElementById('btn-tts');
      if (btn) {
        btn.style.opacity = '0.3';
        btn.title = 'TTS not supported in this browser';
      }
      return;
    }

    const btn = document.getElementById('btn-tts');
    if (btn) {
      btn.addEventListener('click', function() {
        if (ttsPlaying) {
          stopTTS();
        } else {
          startTTS();
        }
      });
    }
  }

  function startTTS() {
    const sentences = getTTSsentences();
    if (sentences.length === 0) return;

    ttsPlaying = true;
    const btn = document.getElementById('btn-tts');
    if (btn) btn.classList.add('active');

    let idx = 0;
    const container = document.querySelector('.reader-content');

    function readNext() {
      if (!ttsPlaying || idx >= sentences.length) {
        stopTTS();
        return;
      }

      const s = sentences[idx];
      if (ttsHighlightEl) ttsHighlightEl.classList.remove('tts-active');

      // Find the element containing this text
      const el = findTextElement(s.text, container);
      if (el) {
        el.classList.add('tts-active');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ttsHighlightEl = el;
      }

      const utterance = new SpeechSynthesisUtterance(s.text);
      utterance.lang = s.lang || 'he-IL';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Try to find a Hebrew voice
      const voices = speechSynthesis.getVoices();
      const heVoice = voices.find(v => v.lang.startsWith('he'));
      if (heVoice) utterance.voice = heVoice;

      utterance.onend = () => {
        idx++;
        setTimeout(readNext, 300);
      };

      speechSynthesis.speak(utterance);
    }

    // Voices load async
    if (speechSynthesis.getVoices().length === 0) {
      speechSynthesis.onvoiceschanged = readNext;
    } else {
      readNext();
    }
  }

  function stopTTS() {
    ttsPlaying = false;
    speechSynthesis.cancel();
    const btn = document.getElementById('btn-tts');
    if (btn) btn.classList.remove('active');
    if (ttsHighlightEl) ttsHighlightEl.classList.remove('tts-active');
    ttsHighlightEl = null;
  }

  function getTTSsentences() {
    // Extract readable segments based on current mode
    const segments = document.querySelectorAll('.reader-segment');
    const sentences = [];

    segments.forEach(seg => {
      const he = seg.querySelector('.segment-he p, [dir="rtl"] p');
      const en = seg.querySelector('.segment-en p, [dir="ltr"] p');

      if (he && (state.mode === 'hebrew' || state.mode === 'both')) {
        sentences.push({ text: he.textContent.trim(), lang: 'he-IL' });
      }
      if (en && (state.mode === 'english' || state.mode === 'both')) {
        sentences.push({ text: en.textContent.trim(), lang: 'en-US' });
      }
    });

    return sentences;
  }

  function findTextElement(text, container) {
    if (!container) return null;
    // Find element that contains the text
    const els = container.querySelectorAll('p, span');
    for (const el of els) {
      if (el.textContent.trim() === text) return el;
    }
    return null;
  }

  // ─── Keyboard Shortcuts ───
  function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'h': setMode('hebrew'); break;
        case 'e': setMode('english'); break;
        case 'b': setMode('both'); break;
        case 'a': toggleAligned(); break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Browser search
          } else {
            toggleImmerse();
          }
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            recordVisit();
            showToast('Bookmark saved 🔖');
          }
          break;
        case '+':
        case '=': setFontSize(state.fontSize + 2); break;
        case '-': setFontSize(state.fontSize - 2); break;
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
        case 'Escape':
          if (state.immerse) toggleImmerse();
          break;
      }
    });
  }

  // ─── Progress Bar ───
  function updateProgress() {
    const bar = document.querySelector('.reader-progress');
    if (!bar) return;
    const progress = getScrollProgress();
    bar.style.width = progress + '%';

    // Update progress display
    const display = document.getElementById('progress-display');
    if (display) display.textContent = progress + '%';
  }

  // ─── Copy with Attribution ───
  function setupCopyAttribution() {
    document.addEventListener('copy', (e) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const container = document.querySelector('.reader-container');
      if (!container || !container.contains(selection.anchorNode)) return;

      const source = getTorahSource();
      const attribution = `\n\n— ${source}\najew.org`;

      e.clipboardData.setData('text/plain', selection.toString() + attribution);
      e.preventDefault();
    });
  }

  // ─── Initialize ───
  function init() {
    loadPrefs();
    applyMode();
    applyTheme();
    applyFontSize();
    setupHighlighting();
    setupSegmentShareActions();
    setupKeyboard();
    setupCopyAttribution();
    initTTS();
    recordVisit();

    // Bind toolbar
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    const alignBtn = document.getElementById('btn-align');
    if (alignBtn) alignBtn.addEventListener('click', toggleAligned);

    const immerseBtn = document.getElementById('btn-immserate');
    if (immerseBtn) immerseBtn.addEventListener('click', toggleImmerse);

    const fontPlus = document.getElementById('font-plus');
    if (fontPlus) fontPlus.addEventListener('click', () => setFontSize(state.fontSize + 2));
    const fontMinus = document.getElementById('font-minus');
    if (fontMinus) fontMinus.addEventListener('click', () => setFontSize(state.fontSize - 2));

    const slider = document.getElementById('font-size-slider');
    if (slider) {
      slider.addEventListener('input', () => setFontSize(parseInt(slider.value)));
    }

    document.querySelectorAll('[data-theme-btn]').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.themeBtn));
    });

    // Progress on scroll
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    // Restore immerse if it was on
    if (state.immerse) { state.immerse = false; toggleImmerse(); }

    // Render any saved highlights for this page
    renderSavedHighlights();

    console.log('[Reader v2] Initialized');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
