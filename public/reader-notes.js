/**
 * AJEW.ORG - Reader Notes System
 * Lets authenticated users save personal notes on any text segment.
 * Uses Supabase auth + user_notes table.
 */
(function() {
  'use strict';

  const SUPABASE_URL = 'https://ekggvujbuusvgmrertgp.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo';

  let supabase = null;
  let currentUser = null;
  let notesCache = {};
  let notePublicCache = {};
  let publicNotesCache = {};
  let activeNoteSegment = null;

  // Lazy-load Supabase client
  async function getSupabase() {
    if (supabase) return supabase;
    // Use the global supabase if available, otherwise create inline
    if (window.__supabase) { supabase = window.__supabase; return supabase; }

    // Dynamic import of supabase from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    document.head.appendChild(script);
    await new Promise((resolve) => { script.onload = resolve; });
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.__supabase = supabase;
    return supabase;
  }

  // Check if user is logged in
  async function checkAuth() {
    const sb = await getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    currentUser = session?.user || null;
    updateAuthUI();
    loadNotes(); // Load public notes always, own notes if logged in
  }

  // Update the notes button and auth UI
  function updateAuthUI() {
    const notesBtn = document.getElementById('btn-notes');
    if (!notesBtn) return;

    if (currentUser) {
      notesBtn.textContent = 'Notes';
      notesBtn.classList.add('logged-in');
    } else {
      notesBtn.textContent = 'Notes (Sign in)';
      notesBtn.classList.remove('logged-in');
    }
  }

  // Load notes for the current page (own + public from others)
  async function loadNotes() {
    const sb = await getSupabase();
    const pageUrl = window.location.pathname;

    // Load own notes
    if (currentUser) {
      const { data } = await sb
        .from('user_notes')
        .select('segment_index, note_text, is_public')
        .eq('user_id', currentUser.id)
        .eq('page_url', pageUrl);

      notesCache = {};
      notePublicCache = {};
      (data || []).forEach(n => {
        notesCache[n.segment_index] = n.note_text;
        notePublicCache[n.segment_index] = n.is_public;
      });
    }

    // Load public notes from all users
    const { data: publicData } = await sb
      .from('user_notes')
      .select('segment_index, note_text, user_name, user_id')
      .eq('page_url', pageUrl)
      .eq('is_public', true);

    publicNotesCache = {};
    (publicData || []).forEach(n => {
      if (!publicNotesCache[n.segment_index]) publicNotesCache[n.segment_index] = [];
      publicNotesCache[n.segment_index].push(n);
    });

    // Add note indicators to segments that have notes (own or public)
    document.querySelectorAll('.reader-segment-pair').forEach(pair => {
      const seg = pair.querySelector('.segment-he');
      if (!seg) return;
      const idx = parseInt(seg.dataset.index);
      const existing = pair.querySelector('.note-indicator');
      if (existing) existing.remove();

      const hasOwnNote = notesCache[idx];
      const hasPublicNotes = (publicNotesCache[idx] || []).length > 0;

      if (hasOwnNote || hasPublicNotes) {
        const indicator = document.createElement('button');
        indicator.className = 'note-indicator' + (hasOwnNote ? ' has-note' : ' has-public');
        indicator.title = hasOwnNote ? 'View your note' : 'View shared notes';
        indicator.textContent = hasOwnNote ? '\u270E' : '\uD83D\uDCAC'; // pencil or speech bubble
        indicator.onclick = () => {
          if (currentUser) openNoteEditor(idx);
          else showLoginDialog();
        };
        pair.appendChild(indicator);
      }
    });
  }

  // Open the notes panel
  function toggleNotesPanel() {
    if (!currentUser) {
      showLoginDialog();
      return;
    }

    const panel = document.getElementById('notes-panel');
    if (panel) {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        renderNotesList();
      }
    }
  }

  // Show login dialog
  function showLoginDialog() {
    let dialog = document.getElementById('notes-login-dialog');
    if (dialog) { dialog.classList.add('open'); return; }

    dialog = document.createElement('div');
    dialog.id = 'notes-login-dialog';
    dialog.className = 'notes-login-dialog open';
    dialog.innerHTML = `
      <div class="notes-login-box">
        <button class="notes-login-close">&times;</button>
        <h3>Sign in to save notes</h3>
        <p>Your personal notes are saved to your account and visible only to you.</p>
        <form id="notes-login-form">
          <input type="email" id="notes-email" placeholder="Email" required />
          <input type="password" id="notes-password" placeholder="Password" required />
          <button type="submit">Sign In</button>
          <p id="notes-login-error" style="color:#dc2626;font-size:0.85em;display:none;"></p>
        </form>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('.notes-login-close').onclick = () => dialog.classList.remove('open');
    dialog.onclick = (e) => { if (e.target === dialog) dialog.classList.remove('open'); };

    dialog.querySelector('#notes-login-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = dialog.querySelector('#notes-email').value;
      const password = dialog.querySelector('#notes-password').value;
      const errEl = dialog.querySelector('#notes-login-error');
      errEl.style.display = 'none';

      const sb = await getSupabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        errEl.textContent = error.message;
        errEl.style.display = 'block';
      } else {
        dialog.classList.remove('open');
        await checkAuth();
      }
    };
  }

  // Open note editor for a specific segment
  function openNoteEditor(segmentIndex) {
    activeNoteSegment = segmentIndex;
    const existing = notesCache[segmentIndex] || '';
    const isPublic = notePublicCache[segmentIndex] || false;

    let editor = document.getElementById('note-editor-popup');
    if (editor) editor.remove();

    editor = document.createElement('div');
    editor.id = 'note-editor-popup';
    editor.className = 'note-editor-popup open';
    editor.innerHTML = `
      <div class="note-editor-box">
        <div class="note-editor-header">
          <h4>Note on segment ${segmentIndex}</h4>
          <button class="note-editor-close">&times;</button>
        </div>
        <textarea id="note-editor-text" placeholder="Write your note...">${existing}</textarea>
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
          <label style="display:flex;align-items:center;gap:6px;font-size:0.9em;cursor:pointer;">
            <input type="checkbox" id="note-public-toggle" ${isPublic ? 'checked' : ''} />
            Share publicly (visible to everyone)
          </label>
        </div>
        <div class="note-editor-actions">
          <button id="note-save-btn" class="note-btn-save">Save Private</button>
          ${existing ? '<button id="note-delete-btn" class="note-btn-delete">Delete</button>' : ''}
        </div>
        <p id="note-editor-status" style="font-size:0.85em;margin-top:8px;"></p>
        ${publicNotesHtml(segmentIndex)}
      </div>
    `;
    document.body.appendChild(editor);

    // Update save button text based on toggle
    const toggle = editor.querySelector('#note-public-toggle');
    const saveBtn = editor.querySelector('#note-save-btn');
    toggle.onchange = () => {
      saveBtn.textContent = toggle.checked ? 'Save & Share' : 'Save Private';
      saveBtn.className = toggle.checked ? 'note-btn-share' : 'note-btn-save';
    };
    if (isPublic) { saveBtn.textContent = 'Save & Share'; saveBtn.className = 'note-btn-share'; }

    editor.querySelector('.note-editor-close').onclick = () => editor.remove();
    editor.onclick = (e) => { if (e.target === editor) editor.remove(); };

    saveBtn.onclick = () => saveNote(segmentIndex);
    const delBtn = editor.querySelector('#note-delete-btn');
    if (delBtn) delBtn.onclick = () => deleteNote(segmentIndex);

    editor.querySelector('#note-editor-text').focus();
  }

  // Show public notes from other users on this segment
  function publicNotesHtml(segmentIndex) {
    const others = (publicNotesCache[segmentIndex] || []).filter(n => n.user_id !== currentUser?.id);
    if (others.length === 0) return '';
    return `
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e0d6c2;">
        <h5 style="color:#1a365d;font-size:0.9em;margin:0 0 8px;">Shared notes on this segment:</h5>
        ${others.map(n => `
          <div style="background:#f8f5ef;padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:0.9em;">
            <div style="color:#333;">${n.note_text}</div>
            <div style="color:#999;font-size:0.8em;margin-top:4px;">- ${n.user_name || 'Anonymous'}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Save a note
  async function saveNote(segmentIndex) {
    const text = document.getElementById('note-editor-text').value.trim();
    const isPublic = document.getElementById('note-public-toggle')?.checked || false;
    const status = document.getElementById('note-editor-status');
    if (!text) { status.textContent = 'Note is empty'; return; }

    const sb = await getSupabase();
    const pageUrl = window.location.pathname;
    const container = document.querySelector('.reader-container');
    const bookId = container?.dataset.torahId || '';
    const userName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Anonymous';

    const { error } = await sb
      .from('user_notes')
      .upsert({
        user_id: currentUser.id,
        user_name: userName,
        book_id: bookId,
        segment_index: segmentIndex,
        page_url: pageUrl,
        note_text: text,
        is_public: isPublic
      }, { onConflict: 'user_id,page_url,segment_index' });

    if (error) {
      status.textContent = 'Error: ' + error.message;
      status.style.color = '#dc2626';
    } else {
      notesCache[segmentIndex] = text;
      status.textContent = 'Saved!';
      status.style.color = '#059669';
      loadNotes(); // Refresh indicators
      setTimeout(() => {
        const popup = document.getElementById('note-editor-popup');
        if (popup) popup.remove();
      }, 800);
    }
  }

  // Delete a note
  async function deleteNote(segmentIndex) {
    const sb = await getSupabase();
    const pageUrl = window.location.pathname;

    const { error } = await sb
      .from('user_notes')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('page_url', pageUrl)
      .eq('segment_index', segmentIndex);

    if (!error) {
      delete notesCache[segmentIndex];
      loadNotes();
      const popup = document.getElementById('note-editor-popup');
      if (popup) popup.remove();
    }
  }

  // Render notes list in sidebar panel
  function renderNotesList() {
    const list = document.getElementById('notes-list');
    if (!list) return;

    const entries = Object.entries(notesCache);
    if (entries.length === 0) {
      list.innerHTML = '<p class="notes-empty">No notes on this page yet.<br/>Click any segment number to add a note.</p>';
      return;
    }

    list.innerHTML = entries
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([idx, text]) => `
        <div class="note-list-item" onclick="document.getElementById('seg-${idx}')?.scrollIntoView({behavior:'smooth',block:'center'})">
          <span class="note-seg-num">${idx}</span>
          <span class="note-preview">${text.substring(0, 80)}${text.length > 80 ? '...' : ''}</span>
          <button class="note-edit-btn" onclick="event.stopPropagation();" data-idx="${idx}">Edit</button>
        </div>
      `).join('');

    list.querySelectorAll('.note-edit-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openNoteEditor(parseInt(btn.dataset.idx));
      };
    });
  }

  // Add click-to-note on segment numbers
  function setupSegmentNoteClicks() {
    document.querySelectorAll('.segment-number').forEach(numEl => {
      numEl.style.cursor = 'pointer';
      numEl.title = 'Add note';
      numEl.addEventListener('click', () => {
        if (!currentUser) { showLoginDialog(); return; }
        const idx = parseInt(numEl.textContent);
        if (!isNaN(idx)) openNoteEditor(idx);
      });
    });
  }

  // Create the notes panel HTML
  function createNotesPanel() {
    const container = document.querySelector('.reader-container');
    if (!container) return;

    // Add notes panel
    const panel = document.createElement('div');
    panel.id = 'notes-panel';
    panel.className = 'notes-panel';
    panel.innerHTML = `
      <button class="notes-panel-close">&times;</button>
      <h3>My Notes</h3>
      <div id="notes-list"></div>
    `;
    container.appendChild(panel);

    panel.querySelector('.notes-panel-close').onclick = () => panel.classList.remove('open');
  }

  // Initialize
  function initNotes() {
    const container = document.querySelector('.reader-container');
    if (!container) return;

    createNotesPanel();
    setupSegmentNoteClicks();

    const notesBtn = document.getElementById('btn-notes');
    if (notesBtn) notesBtn.addEventListener('click', toggleNotesPanel);

    checkAuth();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotes);
  } else {
    initNotes();
  }
})();
