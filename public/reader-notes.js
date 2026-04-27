/**
 * AJEW.ORG - Reader Notes System (localStorage)
 * Lets anyone save personal notes on any text segment.
 * No auth required - all data stored in localStorage.
 *
 * Storage key format: ajew-notes-{pathname}
 * Value: JSON object mapping segment_index -> { text, created, updated, color }
 * Colors: yellow (default), green, blue, pink
 */
(function() {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const NOTES_PREFIX = 'ajew-notes-';
  const NOTE_COLORS = {
    yellow: { label: 'General note',       hex: '#f6e05e', dark: '#6b5e1e', tint: 'rgba(246,224,94,0.12)', tintNight: 'rgba(246,224,94,0.06)' },
    green:  { label: 'Personal insight',    hex: '#48bb78', dark: '#1e5e34', tint: 'rgba(72,187,120,0.12)', tintNight: 'rgba(72,187,120,0.06)' },
    blue:   { label: 'Question / study',    hex: '#4299e1', dark: '#1e3a5e', tint: 'rgba(66,153,225,0.12)', tintNight: 'rgba(66,153,225,0.06)' },
    pink:   { label: 'Important / key',     hex: '#ed64a6', dark: '#5e1e3a', tint: 'rgba(237,100,166,0.12)', tintNight: 'rgba(237,100,166,0.06)' }
  };

  let notesCache = {};  // segment_index -> { text, created, updated, color }
  let panelOpen = false;

  // ── Styles (injected via JS) ──────────────────────────────
  function injectStyles() {
    const existing = document.getElementById('reader-notes-styles');
    if (existing) existing.remove();

    const style = document.createElement('style');
    style.id = 'reader-notes-styles';
    style.textContent = `
      /* ── Note indicator dots on segments ── */
      .reader-segment-pair { position: relative; }
      .note-indicator {
        position: absolute;
        top: 6px;
        left: 6px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.7);
        cursor: pointer;
        z-index: 2;
        opacity: 0.85;
        transition: opacity 0.2s, transform 0.2s;
        padding: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      .note-indicator:hover {
        opacity: 1;
        transform: scale(1.3);
      }

      /* ── Segment highlight tint when note exists ── */
      .reader-segment-pair.has-note-yellow { background: ${NOTE_COLORS.yellow.tint}; }
      .reader-segment-pair.has-note-green  { background: ${NOTE_COLORS.green.tint}; }
      .reader-segment-pair.has-note-blue   { background: ${NOTE_COLORS.blue.tint}; }
      .reader-segment-pair.has-note-pink   { background: ${NOTE_COLORS.pink.tint}; }
      [data-theme="night"] .reader-segment-pair.has-note-yellow { background: ${NOTE_COLORS.yellow.tintNight}; }
      [data-theme="night"] .reader-segment-pair.has-note-green  { background: ${NOTE_COLORS.green.tintNight}; }
      [data-theme="night"] .reader-segment-pair.has-note-blue   { background: ${NOTE_COLORS.blue.tintNight}; }
      [data-theme="night"] .reader-segment-pair.has-note-pink   { background: ${NOTE_COLORS.pink.tintNight}; }

      /* ── Notes count badge on toolbar button ── */
      #btn-notes {
        position: relative;
      }
      .notes-badge {
        position: absolute;
        top: -4px;
        right: -6px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 8px;
        background: #ed64a6;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        line-height: 16px;
        text-align: center;
        pointer-events: none;
      }

      /* ── Note editor popup (modal) ── */
      .note-editor-popup {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.45);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: notesFadeIn 0.15s ease;
      }
      @keyframes notesFadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      .note-editor-box {
        background: var(--reader-bg, #fff);
        color: var(--reader-text, #1a1a1a);
        padding: 24px;
        border-radius: 16px;
        width: 90%;
        max-width: 480px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.2);
        max-height: 85vh;
        overflow-y: auto;
      }
      .note-editor-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      .note-editor-header h4 {
        font-family: 'Frank Ruhl Libre', serif;
        color: var(--reader-accent, #1a365d);
        margin: 0;
        font-size: 1.15em;
      }
      .note-editor-close {
        background: none;
        border: none;
        font-size: 1.5em;
        cursor: pointer;
        color: var(--reader-text-secondary, #999);
        line-height: 1;
        padding: 0 4px;
      }
      .note-editor-close:hover { color: var(--reader-text, #333); }

      /* Textarea */
      .note-editor-textarea {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 2px solid var(--reader-border, #e0d6c2);
        border-radius: 8px;
        font-size: 1em;
        line-height: 1.6;
        resize: vertical;
        box-sizing: border-box;
        font-family: 'Open Sans', sans-serif;
        background: var(--reader-bg, #fff);
        color: var(--reader-text, #1a1a1a);
      }
      .note-editor-textarea:focus {
        outline: none;
        border-color: var(--reader-accent, #1a365d);
      }

      /* Color picker row */
      .note-color-picker {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
      }
      .note-color-picker-label {
        font-size: 0.85em;
        color: var(--reader-text-secondary, #666);
      }
      .note-color-dot {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid transparent;
        cursor: pointer;
        transition: border-color 0.15s, transform 0.15s;
        padding: 0;
      }
      .note-color-dot:hover { transform: scale(1.15); }
      .note-color-dot.selected {
        border-color: var(--reader-text, #333);
        transform: scale(1.1);
      }

      /* Action buttons */
      .note-editor-actions {
        display: flex;
        gap: 8px;
        margin-top: 14px;
      }
      .note-btn-save {
        padding: 8px 22px;
        background: var(--reader-accent, #1a365d);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95em;
      }
      .note-btn-save:hover { opacity: 0.9; }
      .note-btn-delete {
        padding: 8px 18px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95em;
      }
      .note-btn-delete:hover { opacity: 0.9; }
      .note-btn-share {
        padding: 8px 18px;
        background: #059669;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.95em;
      }
      .note-btn-share:hover { background: #047857; }
      .note-editor-status {
        font-size: 0.85em;
        margin-top: 8px;
        min-height: 1.2em;
      }

      /* ── Notes panel (sidebar) ── */
      .notes-panel {
        position: fixed;
        top: 0;
        right: -380px;
        width: 360px;
        height: 100vh;
        background: var(--reader-bg, #fff);
        border-left: 2px solid var(--reader-border, #e0d6c2);
        box-shadow: -4px 0 24px rgba(0,0,0,0.12);
        z-index: 1000;
        transition: right 0.3s ease;
        overflow-y: auto;
        padding: 20px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      .notes-panel.open { right: 0; }
      .notes-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        flex-shrink: 0;
      }
      .notes-panel-header h3 {
        font-family: 'Frank Ruhl Libre', serif;
        color: var(--reader-accent, #1a365d);
        margin: 0;
        font-size: 1.3em;
      }
      .notes-panel-close {
        background: none;
        border: none;
        font-size: 1.5em;
        cursor: pointer;
        color: var(--reader-text-secondary, #999);
        line-height: 1;
        padding: 0 4px;
      }
      .notes-panel-close:hover { color: var(--reader-text, #333); }
      .notes-panel-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-shrink: 0;
      }
      .notes-panel-btn {
        padding: 6px 14px;
        border: 1px solid var(--reader-border, #e0d6c2);
        border-radius: 6px;
        background: var(--reader-control-bg, #f0ebe0);
        color: var(--reader-text, #333);
        font-size: 0.85em;
        cursor: pointer;
        font-weight: 500;
      }
      .notes-panel-btn:hover {
        background: var(--reader-control-hover, #e5ddd0);
      }

      /* Notes list */
      .notes-list {
        flex: 1;
        overflow-y: auto;
      }
      .notes-empty {
        color: var(--reader-text-secondary, #999);
        text-align: center;
        padding: 24px 12px;
        line-height: 1.7;
        font-size: 0.95em;
      }
      .note-list-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid var(--reader-border, #e0d6c2);
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background 0.15s;
      }
      .note-list-item:hover {
        background: var(--reader-control-bg, #f8f5ef);
      }
      .note-list-color-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        margin-top: 5px;
      }
      .note-list-seg-num {
        background: var(--reader-accent, #1a365d);
        color: #fff;
        min-width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.78em;
        font-weight: 700;
        flex-shrink: 0;
      }
      .note-list-body {
        flex: 1;
        min-width: 0;
      }
      .note-list-preview {
        font-size: 0.85em;
        color: var(--reader-text, #333);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .note-list-edit {
        padding: 3px 10px;
        background: var(--reader-control-bg, #f0ebe0);
        border: 1px solid var(--reader-border, #e0d6c2);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.78em;
        flex-shrink: 0;
        align-self: center;
        color: var(--reader-text, #333);
      }
      .note-list-edit:hover {
        background: var(--reader-control-hover, #e5ddd0);
      }

      /* ── Segment number clickable hint ── */
      .segment-number.notes-clickable {
        cursor: pointer;
      }
      .segment-number.notes-clickable:hover {
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }

  // ── localStorage helpers ──────────────────────────────────
  function storageKey() {
    return NOTES_PREFIX + window.location.pathname;
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(storageKey());
      notesCache = raw ? JSON.parse(raw) : {};
    } catch (e) {
      notesCache = {};
    }
  }

  function saveNotes() {
    try {
      const count = Object.keys(notesCache).length;
      if (count === 0) {
        localStorage.removeItem(storageKey());
      } else {
        localStorage.setItem(storageKey(), JSON.stringify(notesCache));
      }
    } catch (e) {
      console.warn('Notes: failed to save to localStorage', e);
    }
  }

  // ── UI: Note indicators on segments ───────────────────────
  function refreshIndicators() {
    // Remove old indicators and highlight classes
    document.querySelectorAll('.note-indicator').forEach(el => el.remove());
    document.querySelectorAll('.reader-segment-pair').forEach(pair => {
      pair.classList.remove('has-note-yellow', 'has-note-green', 'has-note-blue', 'has-note-pink');
    });

    // Add indicators and tints for segments with notes
    Object.entries(notesCache).forEach(([idx, note]) => {
      const pair = document.getElementById('seg-' + idx);
      if (!pair) return;

      const color = note.color || 'yellow';
      const colorData = NOTE_COLORS[color] || NOTE_COLORS.yellow;

      // Add subtle background tint
      pair.classList.add('has-note-' + color);

      // Add indicator dot
      const dot = document.createElement('button');
      dot.className = 'note-indicator';
      dot.style.background = isNightTheme() ? colorData.dark : colorData.hex;
      dot.title = 'View note (' + colorData.label + ')';
      dot.setAttribute('aria-label', 'View note on segment ' + idx);
      dot.addEventListener('click', function(e) {
        e.stopPropagation();
        openNoteEditor(parseInt(idx));
      });
      pair.appendChild(dot);
    });

    // Update badge count
    updateBadge();
  }

  function isNightTheme() {
    const container = document.querySelector('.reader-container');
    return container && container.getAttribute('data-theme') === 'night';
  }

  // ── UI: Badge on toolbar button ───────────────────────────
  function updateBadge() {
    const btn = document.getElementById('btn-notes');
    if (!btn) return;

    let badge = btn.querySelector('.notes-badge');
    const count = Object.keys(notesCache).length;

    if (count === 0) {
      if (badge) badge.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notes-badge';
      btn.appendChild(badge);
    }
    badge.textContent = count;
  }

  // ── UI: Note editor popup ─────────────────────────────────
  function openNoteEditor(segmentIndex) {
    // Remove any existing editor
    closeNoteEditor();

    const existing = notesCache[segmentIndex];
    const text = existing ? existing.text : '';
    const color = existing ? (existing.color || 'yellow') : 'yellow';

    const overlay = document.createElement('div');
    overlay.className = 'note-editor-popup';
    overlay.id = 'note-editor-popup';

    const box = document.createElement('div');
    box.className = 'note-editor-box';

    // Header
    const header = document.createElement('div');
    header.className = 'note-editor-header';
    const title = document.createElement('h4');
    title.textContent = 'Note on segment ' + segmentIndex;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'note-editor-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', closeNoteEditor);
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'note-editor-textarea';
    textarea.id = 'note-editor-text';
    textarea.placeholder = 'Write your note...';
    textarea.value = text;

    // Color picker
    const colorRow = document.createElement('div');
    colorRow.className = 'note-color-picker';
    const colorLabel = document.createElement('span');
    colorLabel.className = 'note-color-picker-label';
    colorLabel.textContent = 'Color:';
    colorRow.appendChild(colorLabel);

    let selectedColor = color;

    Object.entries(NOTE_COLORS).forEach(([key, data]) => {
      const dot = document.createElement('button');
      dot.className = 'note-color-dot' + (key === color ? ' selected' : '');
      dot.style.background = data.hex;
      dot.title = data.label;
      dot.setAttribute('aria-label', data.label);
      dot.dataset.color = key;
      dot.addEventListener('click', function() {
        colorRow.querySelectorAll('.note-color-dot').forEach(d => d.classList.remove('selected'));
        dot.classList.add('selected');
        selectedColor = key;
      });
      colorRow.appendChild(dot);
    });

    // Actions
    const actions = document.createElement('div');
    actions.className = 'note-editor-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'note-btn-save';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', function() {
      const noteText = textarea.value.trim();
      if (!noteText) {
        statusEl.textContent = 'Note is empty.';
        statusEl.style.color = '#dc2626';
        return;
      }
      const now = new Date().toISOString();
      notesCache[segmentIndex] = {
        text: noteText,
        created: existing ? existing.created : now,
        updated: now,
        color: selectedColor
      };
      saveNotes();
      refreshIndicators();
      renderNotesList();
      statusEl.textContent = 'Saved!';
      statusEl.style.color = '#059669';
      setTimeout(closeNoteEditor, 600);
    });
    actions.appendChild(saveBtn);

    // Share to Chat button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'note-btn-share';
    shareBtn.textContent = '💬 Share to Chat';
    shareBtn.addEventListener('click', function() {
      const noteText = textarea.value.trim();
      if (!noteText) {
        statusEl.textContent = 'Write a note first before sharing.';
        statusEl.style.color = '#dc2626';
        return;
      }
      // Save the note first
      const now = new Date().toISOString();
      notesCache[segmentIndex] = {
        text: noteText,
        created: existing ? existing.created : now,
        updated: now,
        color: selectedColor
      };
      saveNotes();
      refreshIndicators();
      renderNotesList();

      // Build the shared message with context
      const container = document.querySelector('.reader-container');
      const bookTitle = container?.dataset.torahTitle || 'Unknown';
      const pageUrl = window.location.pathname;

      // Get a snippet of the Hebrew text from this segment
      const segPair = document.getElementById('seg-' + segmentIndex);
      const heText = segPair?.querySelector('.segment-he p')?.textContent?.trim() || '';
      const heSnippet = heText.length > 80 ? heText.substring(0, 80) + '...' : heText;

      // Format: [📝 NOTE] Book - Seg #N | "Hebrew snippet..." | Note text | Link
      const sharedMsg = '[📝 NOTE] ' + bookTitle + ' - Segment ' + segmentIndex
        + '\n📖 ' + heSnippet
        + '\n✏️ ' + noteText
        + '\n🔗 https://ajew.org' + pageUrl + '#seg-' + segmentIndex;

      // Navigate to chat with pre-filled message
      const encoded = encodeURIComponent(sharedMsg);
      closeNoteEditor();
      window.open('/chat?room=shared-notes&msg=' + encoded, '_blank');
    });
    actions.appendChild(shareBtn);

    if (existing) {
      const delBtn = document.createElement('button');
      delBtn.className = 'note-btn-delete';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', function() {
        delete notesCache[segmentIndex];
        saveNotes();
        refreshIndicators();
        renderNotesList();
        closeNoteEditor();
      });
      actions.appendChild(delBtn);
    }

    // Status message
    const statusEl = document.createElement('p');
    statusEl.className = 'note-editor-status';

    // Assemble
    box.appendChild(header);
    box.appendChild(textarea);
    box.appendChild(colorRow);
    box.appendChild(actions);
    box.appendChild(statusEl);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeNoteEditor();
    });

    // Close on Escape
    overlay._escHandler = function(e) {
      if (e.key === 'Escape') closeNoteEditor();
    };
    document.addEventListener('keydown', overlay._escHandler);

    // Focus textarea
    setTimeout(function() { textarea.focus(); }, 50);
  }

  function closeNoteEditor() {
    const overlay = document.getElementById('note-editor-popup');
    if (overlay) {
      if (overlay._escHandler) {
        document.removeEventListener('keydown', overlay._escHandler);
      }
      overlay.remove();
    }
  }

  // ── UI: Notes panel (sidebar) ─────────────────────────────
  function createNotesPanel() {
    // Remove any existing panel from old code
    const old = document.getElementById('notes-panel');
    if (old) old.remove();

    const container = document.querySelector('.reader-container');
    if (!container) return;

    const panel = document.createElement('div');
    panel.id = 'notes-panel';
    panel.className = 'notes-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'notes-panel-header';
    const h3 = document.createElement('h3');
    h3.textContent = 'My Notes';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notes-panel-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close notes panel');
    closeBtn.addEventListener('click', function() { toggleNotesPanel(); });
    header.appendChild(h3);
    header.appendChild(closeBtn);

    // Action buttons
    const actionsRow = document.createElement('div');
    actionsRow.className = 'notes-panel-actions';
    const exportBtn = document.createElement('button');
    exportBtn.className = 'notes-panel-btn';
    exportBtn.textContent = 'Export Notes';
    exportBtn.addEventListener('click', exportNotes);
    actionsRow.appendChild(exportBtn);

    // Notes list container
    const list = document.createElement('div');
    list.id = 'notes-list';
    list.className = 'notes-list';

    panel.appendChild(header);
    panel.appendChild(actionsRow);
    panel.appendChild(list);
    container.appendChild(panel);
  }

  function toggleNotesPanel() {
    const panel = document.getElementById('notes-panel');
    if (!panel) return;
    panelOpen = !panelOpen;
    panel.classList.toggle('open', panelOpen);
    if (panelOpen) renderNotesList();
  }

  function renderNotesList() {
    const list = document.getElementById('notes-list');
    if (!list) return;

    const entries = Object.entries(notesCache);
    if (entries.length === 0) {
      list.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'notes-empty';
      empty.textContent = 'No notes on this page yet. Click any segment number to add a note.';
      list.appendChild(empty);
      return;
    }

    // Sort by segment index
    entries.sort(function(a, b) { return parseInt(a[0]) - parseInt(b[0]); });

    list.innerHTML = '';
    entries.forEach(function(entry) {
      var idx = entry[0];
      var note = entry[1];
      var color = note.color || 'yellow';
      var colorData = NOTE_COLORS[color] || NOTE_COLORS.yellow;

      var item = document.createElement('div');
      item.className = 'note-list-item';

      // Color dot
      var dot = document.createElement('span');
      dot.className = 'note-list-color-dot';
      dot.style.background = colorData.hex;

      // Segment number
      var num = document.createElement('span');
      num.className = 'note-list-seg-num';
      num.textContent = idx;

      // Preview text
      var body = document.createElement('div');
      body.className = 'note-list-body';
      var preview = document.createElement('span');
      preview.className = 'note-list-preview';
      var displayText = note.text.length > 80 ? note.text.substring(0, 80) + '...' : note.text;
      preview.textContent = displayText;
      body.appendChild(preview);

      // Edit button
      var editBtn = document.createElement('button');
      editBtn.className = 'note-list-edit';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        openNoteEditor(parseInt(idx));
      });

      item.appendChild(dot);
      item.appendChild(num);
      item.appendChild(body);
      item.appendChild(editBtn);

      // Click item to scroll to segment
      item.addEventListener('click', function() {
        var seg = document.getElementById('seg-' + idx);
        if (seg) seg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      list.appendChild(item);
    });
  }

  // ── Export notes to clipboard ──────────────────────────────
  function exportNotes() {
    var entries = Object.entries(notesCache);
    if (entries.length === 0) return;

    entries.sort(function(a, b) { return parseInt(a[0]) - parseInt(b[0]); });

    var pageTitle = document.title || window.location.pathname;
    var lines = ['Notes for: ' + pageTitle, ''];

    entries.forEach(function(entry) {
      var idx = entry[0];
      var note = entry[1];
      var colorLabel = (NOTE_COLORS[note.color] || NOTE_COLORS.yellow).label;
      lines.push('[Segment ' + idx + '] (' + colorLabel + ')');
      lines.push(note.text);
      lines.push('');
    });

    var text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        showExportFeedback('Copied to clipboard!');
      }).catch(function() {
        showExportFeedback('Failed to copy.');
      });
    } else {
      // Fallback for older browsers
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showExportFeedback('Copied to clipboard!');
      } catch (e) {
        showExportFeedback('Failed to copy.');
      }
      document.body.removeChild(ta);
    }
  }

  function showExportFeedback(msg) {
    var panel = document.getElementById('notes-panel');
    if (!panel) return;
    var fb = panel.querySelector('.notes-export-feedback');
    if (fb) fb.remove();

    fb = document.createElement('div');
    fb.className = 'notes-export-feedback';
    fb.textContent = msg;
    fb.style.cssText = 'text-align:center;padding:8px;font-size:0.85em;color:#059669;font-weight:600;';
    var actionsRow = panel.querySelector('.notes-panel-actions');
    if (actionsRow) actionsRow.after(fb);
    setTimeout(function() { fb.remove(); }, 2000);
  }

  // ── Segment number click-to-add-note ──────────────────────
  function setupSegmentClicks() {
    document.querySelectorAll('.segment-number').forEach(function(numEl) {
      numEl.classList.add('notes-clickable');
      numEl.title = 'Add / edit note';
      numEl.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(numEl.textContent);
        if (!isNaN(idx)) openNoteEditor(idx);
      });
    });
  }

  // ── Keyboard shortcut: 'a' to open note for visible segment ──
  function setupKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Don't trigger when typing in inputs/textareas, or if editor is open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (document.getElementById('note-editor-popup')) return;

      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var idx = getMostVisibleSegmentIndex();
        if (idx !== null) openNoteEditor(idx);
      }
    });
  }

  function getMostVisibleSegmentIndex() {
    var pairs = document.querySelectorAll('.reader-segment-pair');
    var bestIdx = null;
    var bestVisible = 0;
    var viewTop = window.scrollY || document.documentElement.scrollTop;
    var viewBottom = viewTop + window.innerHeight;

    pairs.forEach(function(pair) {
      var rect = pair.getBoundingClientRect();
      var top = rect.top + viewTop;
      var bottom = rect.bottom + viewTop;
      var visibleTop = Math.max(top, viewTop);
      var visibleBottom = Math.min(bottom, viewBottom);
      var visible = Math.max(0, visibleBottom - visibleTop);

      if (visible > bestVisible) {
        bestVisible = visible;
        var id = pair.id; // "seg-{index}"
        if (id && id.startsWith('seg-')) {
          bestIdx = parseInt(id.replace('seg-', ''));
        }
      }
    });

    return bestIdx;
  }

  // ── Theme observer: refresh indicator dot colors on theme change ──
  function observeThemeChanges() {
    var container = document.querySelector('.reader-container');
    if (!container) return;

    var observer = new MutationObserver(function() {
      refreshIndicators();
    });
    observer.observe(container, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ── Initialize ─────────────────────────────────────────────
  function initNotes() {
    var container = document.querySelector('.reader-container');
    if (!container) return;

    // Clean up any leftover elements from the old notes system
    var oldPanel = document.getElementById('notes-panel');
    if (oldPanel) oldPanel.remove();
    var oldEditor = document.getElementById('note-editor-popup');
    if (oldEditor) oldEditor.remove();
    var oldLogin = document.getElementById('notes-login-dialog');
    if (oldLogin) oldLogin.remove();

    injectStyles();
    loadNotes();
    createNotesPanel();
    setupSegmentClicks();
    setupKeyboard();
    refreshIndicators();
    observeThemeChanges();

    // Wire up the toolbar Notes button
    var notesBtn = document.getElementById('btn-notes');
    if (notesBtn) {
      notesBtn.addEventListener('click', toggleNotesPanel);
    }
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotes);
  } else {
    initNotes();
  }
})();
