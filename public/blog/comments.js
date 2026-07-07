(function(){
  const API = 'https://ekggvujbuusvgmrertgp.supabase.co/rest/v1/messages';
  const KEY = 'sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo';
  const box = document.querySelector('[data-blog-comments]');
  const counter = document.querySelector('[data-blog-view-counter]');
  if (!box && !counter) return;
  const postId = (box && box.getAttribute('data-post-id')) || (counter && counter.getAttribute('data-post-id')) || location.pathname;
  const cleanPostId = postId.replace(/^\/blog\//,'').replace(/\.html$/,'');
  const room = 'blog:' + cleanPostId;
  const viewRoom = 'blog-view:' + cleanPostId;
  const list = box && box.querySelector('.comments-list');
  const form = box && box.querySelector('form');
  const status = box && box.querySelector('.comments-status');
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function headers(extra){ return Object.assign({ apikey: KEY, authorization: 'Bearer ' + KEY, 'content-type': 'application/json' }, extra || {}); }
  async function load(){
    if (!box || !list) return;
    try {
      list.innerHTML = '<p class="comments-muted">Loading comments…</p>';
      const url = API + '?select=id,username,message,created_at&room=eq.' + encodeURIComponent(room) + '&order=created_at.desc&limit=50';
      const r = await fetch(url, { headers: headers() });
      let data = r.ok ? await r.json() : [];
      data = data.filter(c => !(c.username === 'Hermes verify' && c.message === 'temporary verification comment'));
      if (!data.length) { list.innerHTML = '<p class="comments-muted">No comments yet — be the first to add one.</p>'; return; }
      list.innerHTML = data.map(c => '<article class="comment-item"><div class="comment-meta"><strong>' + esc(c.username || 'Anonymous') + '</strong><time>' + new Date(c.created_at).toLocaleString() + '</time></div><p>' + esc(c.message).replace(/\n/g,'<br>') + '</p></article>').join('');
    } catch(e) { list.innerHTML = '<p class="comments-muted">Comments are temporarily unavailable.</p>'; }
  }
  form && form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    if (fd.get('website')) return;
    const username = String(fd.get('name') || 'Anonymous').slice(0, 60);
    const message = String(fd.get('comment') || '').trim().slice(0, 1500);
    if (!message) return;
    status.textContent = 'Posting…';
    try {
      const body = JSON.stringify({ room, username, message, email: null });
      const r = await fetch(API, { method: 'POST', headers: headers({ Prefer: 'return=representation' }), body });
      if (!r.ok) throw new Error('post failed');
      form.reset(); status.textContent = 'Comment posted.'; await load();
    } catch(e) { status.textContent = 'Could not post right now. Please try again.'; }
  });

  async function countViews(){
    if (!counter) return;
    try {
      const url = API + '?select=id&room=eq.' + encodeURIComponent(viewRoom) + '&limit=1';
      const r = await fetch(url, { headers: headers({ Prefer: 'count=exact' }) });
      const range = r.headers.get('content-range') || '';
      const total = (range.split('/')[1] || '').trim();
      const n = Number(total);
      counter.textContent = Number.isFinite(n) ? (n + ' view' + (n === 1 ? '' : 's')) : '';
    } catch(e) { counter.textContent = ''; }
  }

  async function recordView(){
    if (!counter) return;
    try {
      const key = 'ajew-blog-viewed:' + cleanPostId;
      const last = Number(localStorage.getItem(key) || 0);
      const now = Date.now();
      if (now - last > 6 * 60 * 60 * 1000) {
        localStorage.setItem(key, String(now));
        await fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify({ room: viewRoom, username: 'view', message: 'view', email: null }) });
      }
    } catch(e) {}
    countViews();
  }

  recordView();
  load();
})();
