// Hebrew-only behavior on the shared Reader DOM. Never rewrites source paragraphs.
const root = document.querySelector('[data-kb-reader]');
if (root) enableReader(root);

function enableReader(root) {
  const $ = selector => root.querySelector(selector);
  const source = $('[data-kb-source]');
  const paragraphs = Array.from(source.querySelectorAll('.segment-he p'), text => ({
    text, pair: text.closest('.reader-segment-pair'),
  }));
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  };
  const status = $('[data-kb-status]');
  const announce = text => { status.hidden = false; status.textContent = text; };
  const utility = $('[data-kb-utility]');
  const slider = $('#font-size-slider');
  const theme = $('#kb-reader-theme');
  const fontKey = 'ajew-kabala-font-size';
  const themeKey = 'ajew-kabala-theme';
  const savedSize = Number(read(fontKey));
  if (savedSize >= 16 && savedSize <= 36) slider.value = String(savedSize);
  const savedTheme = read(themeKey);
  if (['day', 'sepia', 'night'].includes(savedTheme)) theme.value = savedTheme;
  else if (read('ajew-dark-mode') === 'true') theme.value = 'night';
  const applyFont = () => root.style.setProperty('--reader-font-size', `${slider.value}px`);
  applyFont();
  root.dataset.theme = theme.value;
  slider.addEventListener('input', () => { applyFont(); write(fontKey, slider.value); });
  theme.addEventListener('change', () => { root.dataset.theme = theme.value; write(themeKey, theme.value); });

  const search = $('#kb-reader-search');
  const searchToggle = $('#btn-search');
  const input = $('#kb-find');
  const previous = $('[data-kb-find-prev]');
  const next = $('[data-kb-find-next]');
  const findStatus = $('[data-kb-find-status]');
  const normalize = text => text.normalize('NFC').replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7]/g, '').toLocaleLowerCase('he');
  let found = [];
  let needle = -1;
  let corpus;
  function position(index) {
    found[needle]?.classList.remove('kb-current');
    needle = (index + found.length) % found.length;
    found[needle].classList.add('kb-current');
    findStatus.textContent = `תוצאה ${needle + 1} מתוך ${found.length} פסקאות מתאימות`;
    const pair = found[needle].getBoundingClientRect();
    window.scrollBy(0, pair.top - Math.max(utility.getBoundingClientRect().bottom + 12, innerHeight * .32));
  }
  function find() {
    for (const pair of found) pair.classList.remove('kb-found', 'kb-current');
    const query = normalize(input.value.trim());
    if (query && !corpus) corpus = paragraphs.map(({ text }) => normalize(text.textContent));
    found = query ? paragraphs.filter((_, i) => corpus[i].includes(query)).map(({ pair }) => pair) : [];
    needle = -1;
    previous.disabled = next.disabled = found.length === 0;
    for (const pair of found) pair.classList.add('kb-found');
    findStatus.textContent = !query ? '' : found.length === 0 ? 'לא נמצאו תוצאות' : `${found.length} פסקאות מתאימות`;
  }
  function showSearch(on) {
    search.hidden = !on;
    searchToggle.setAttribute('aria-expanded', String(on));
    if (on) input.focus();
    else { input.value = ''; find(); searchToggle.focus(); }
  }
  searchToggle.addEventListener('click', () => showSearch(search.hidden));
  $('[data-kb-find-close]').addEventListener('click', () => showSearch(false));
  input.addEventListener('input', find);
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') showSearch(false);
    if (event.key === 'Enter' && event.target === input && found.length) {
      event.preventDefault();
      position(needle < 0 ? (event.shiftKey ? found.length - 1 : 0) : needle + (event.shiftKey ? -1 : 1));
    }
  });
  previous.addEventListener('click', () => position(needle < 0 ? found.length - 1 : needle - 1));
  next.addEventListener('click', () => position(needle + 1));

  const bookmarkKey = `ajew-kabala-bookmark-${root.dataset.torahId}`;
  const restore = $('[data-kb-restore]');
  const bookmarkStatus = $('[data-kb-bookmark-status]');
  const bookmarked = () => {
    try {
      const saved = JSON.parse(read(bookmarkKey));
      const pair = document.getElementById(saved?.id);
      return pair && source.contains(pair) && Number.isFinite(saved.offset) ? { pair, offset: saved.offset } : null;
    } catch { return null; }
  };
  restore.hidden = !bookmarked();
  $('#btn-bookmark').addEventListener('click', () => {
    const readingTop = utility.getBoundingClientRect().bottom;
    const { pair } = paragraphs.find(({ pair }) => pair.getBoundingClientRect().bottom > readingTop) || paragraphs[paragraphs.length - 1];
    const offset = Math.min(0, pair.getBoundingClientRect().top - readingTop);
    bookmarkStatus.hidden = false;
    if (write(bookmarkKey, JSON.stringify({ id: pair.id, offset }))) {
      restore.hidden = false;
      bookmarkStatus.textContent = 'מקום הקריאה נשמר בדפדפן.';
    } else bookmarkStatus.textContent = 'לא ניתן לשמור מקום בדפדפן זה.';
  });
  restore.addEventListener('click', () => {
    const saved = bookmarked();
    if (!saved) return;
    const pinnedBottom = parseFloat(getComputedStyle(utility).top) + utility.offsetHeight;
    const rect = saved.pair.getBoundingClientRect();
    window.scrollBy(0, rect.top - pinnedBottom - Math.max(saved.offset, -rect.height + 10));
  });

  const progress = $('[data-kb-progress]');
  function updateProgress() {
    const rect = source.getBoundingClientRect();
    const length = Math.max(1, rect.height);
    progress.style.width = `${Math.max(0, Math.min(1, (innerHeight - rect.top) / length)) * 100}%`;
  }
  let frame = 0;
  function scheduleProgress() {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; updateProgress(); });
  }
  slider.addEventListener('input', scheduleProgress);
  window.addEventListener('scroll', scheduleProgress, { passive: true });
  window.addEventListener('resize', scheduleProgress, { passive: true });
  scheduleProgress();

  $('#btn-print').addEventListener('click', () => window.print());
  const copy = $('[data-kb-copy]');
  const share = $('#btn-share');
  const canCopy = typeof navigator.clipboard?.writeText === 'function';
  copy.hidden = !canCopy;
  share.hidden = !navigator.share && !canCopy;
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(paragraphs.map(({ text }) => text.textContent).join('\n\n'));
      announce('טקסט הקטע הועתק.');
    } catch { announce('לא ניתן להעתיק אוטומטית. אפשר לסמן ולהעתיק את הטקסט.'); }
  });
  share.addEventListener('click', async () => {
    const url = location.href;
    if (navigator.share) {
      try { await navigator.share({ title: root.dataset.torahTitle, url }); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); announce('הקישור הועתק.'); }
    catch { announce('לא ניתן לשתף אוטומטית. אפשר להעתיק את הכתובת משורת הכתובת.'); }
  });

  const listen = $('#btn-listen');
  const synth = window.speechSynthesis;
  if (synth && typeof SpeechSynthesisUtterance === 'function') {
    listen.hidden = false;
    // Chunk only the utterances; the source DOM and downloads remain untouched.
    function* speechChunks() {
      for (const { text, pair } of paragraphs) {
        let remaining = text.textContent.trim();
        while (remaining) {
          let end = remaining.length;
          if (end > 220) {
            const first = remaining.slice(0, 220);
            const space = Math.max(first.lastIndexOf(' '), first.lastIndexOf('\n'));
            end = space > 0 ? space : Array.from(first).slice(0, -1).join('').length;
          }
          yield { phrase: remaining.slice(0, end), pair };
          remaining = remaining.slice(end).trimStart();
        }
      }
    }
    let utterance, speaking, timer;
    const stop = cancel => {
      clearTimeout(timer);
      const owned = Boolean(utterance);
      utterance = null;
      if (cancel && owned) synth.cancel();
      speaking?.classList.remove('kb-spoken');
      speaking = null;
      listen.textContent = 'הקראה בעברית';
    };
    listen.addEventListener('click', () => {
      if (utterance) { stop(true); return; }
      const voice = synth.getVoices().find(item => /^(he|iw)([-_]|$)/i.test(item.lang));
      if (!voice) { announce('לא נמצא קול בעברית בדפדפן או במכשיר.'); return; }
      const queue = speechChunks();
      const failed = () => { stop(true); announce('ההקראה לא הצליחה במכשיר זה.'); };
      function speak() {
        const { value, done } = queue.next();
        if (done) { stop(false); return; }
        speaking?.classList.remove('kb-spoken');
        speaking = value.pair;
        speaking.classList.add('kb-spoken');
        const current = new SpeechSynthesisUtterance(value.phrase);
        utterance = current;
        current.lang = voice.lang;
        current.voice = voice;
        current.onstart = () => { if (utterance === current) clearTimeout(timer); };
        current.onend = () => { if (utterance === current) { clearTimeout(timer); speak(); } };
        current.onerror = () => { if (utterance === current) failed(); };
        timer = setTimeout(() => { if (utterance === current) failed(); }, 6000);
        try { synth.speak(current); } catch { failed(); }
      }
      listen.textContent = 'עצירת ההקראה';
      speak();
    });
    window.addEventListener('pagehide', () => stop(true));
  }
  $('[data-kb-toolbar]').hidden = false;
  utility.hidden = false;
}
