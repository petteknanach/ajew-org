// Progressive disclosure only: original Reader controls and listeners stay intact.
(function () {
  function init() {
    const container = document.querySelector('.reader-container');
    const toolbar = container && container.querySelector('.reader-toolbar');
    if (!toolbar || toolbar.dataset.mobileReady) return;
    const groups = Array.from(toolbar.children).filter(el => el.classList.contains('reader-toolbar-group'));
    const language = groups.find(el => el.querySelector('[data-mode]'));
    if (!language) return;
    toolbar.dataset.mobileReady = 'true';
    container.classList.add('reader-mobile-ready');
    language.classList.add('reader-mobile-language');
    const secondary = groups.filter(el => el !== language);
    secondary.forEach((el, index) => {
      el.classList.add('reader-mobile-secondary');
      if (!el.id) el.id = 'reader-mobile-tools-' + index;
    });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.id = 'reader-tools-toggle';
    toggle.className = 'reader-btn';
    toggle.textContent = 'Tools';
    toggle.setAttribute('aria-label', 'Reader tools');
    toggle.setAttribute('aria-controls', secondary.map(el => el.id).join(' '));
    language.after(toggle);
    const mobile = window.matchMedia('(max-width: 768px)');
    let expanded = false;
    function updateTools() {
      toggle.hidden = !mobile.matches;
      toggle.setAttribute('aria-expanded', String(!mobile.matches || expanded));
      toggle.textContent = expanded ? 'Close tools' : 'Tools';
      secondary.forEach(el => { el.hidden = mobile.matches && !expanded; });
    }
    toggle.addEventListener('click', () => { expanded = !expanded; updateTools(); });
    toolbar.addEventListener('keydown', event => {
      if (event.key === 'Escape' && mobile.matches && expanded) {
        expanded = false;
        updateTools();
        toggle.focus();
      }
    });
    const audio = container.querySelector('#audio-controls');
    let audioDetails = null;
    if (audio) {
      audioDetails = document.createElement('details');
      audioDetails.className = 'reader-audio-disclosure';
      const summary = document.createElement('summary');
      summary.textContent = 'Audio — Hebrew / English';
      audio.before(audioDetails);
      audioDetails.append(summary, audio);
    }
    const downloads = document.querySelector('details.ai-reader-access');
    function updateViewport() {
      updateTools();
      if (audioDetails) audioDetails.open = !mobile.matches;
      if (downloads) downloads.open = !mobile.matches;
    }
    mobile.addEventListener('change', updateViewport);
    updateViewport();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
