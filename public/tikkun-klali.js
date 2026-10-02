/* Standalone Psalms edition control. Never annotate or rewrite Original Hebrew.
 * All annotation objects are owned build-time imports; no runtime text fetch. */
(function () {
  'use strict';
  function init() {
    var source = document.getElementById('klali-source');
    if (!source || source.dataset.initialized) return;
    source.dataset.initialized = 'true';
    var key = 'ajew-klali-edition-v1', prefs = { annotated: false, specialNikud: true, teamim: false };
    try {
      var saved = JSON.parse(localStorage.getItem(key));
      if (saved) prefs = { annotated: saved.annotated === true, specialNikud: saved.specialNikud !== false, teamim: saved.teamim === true };
    } catch (_) {}
    var corpus;
    try { corpus = JSON.parse(source.textContent); } catch (_) { corpus = null; }
    var status = document.getElementById('klali-status');
    var original = document.getElementById('klali-original'), annotated = document.getElementById('klali-annotated');
    var special = document.getElementById('klali-special'), accents = document.getElementById('klali-accents');
    var epoch = 0;
    function show(selector, visible) { document.querySelectorAll(selector).forEach(function (el) { el.hidden = !visible; }); }
    function save() { try { localStorage.setItem(key, JSON.stringify(prefs)); } catch (_) {} }
    async function render() {
      var own = ++epoch;
      original.setAttribute('aria-pressed', String(!prefs.annotated));
      annotated.setAttribute('aria-pressed', String(prefs.annotated));
      special.hidden = accents.hidden = !prefs.annotated;
      special.setAttribute('aria-pressed', String(prefs.specialNikud));
      accents.setAttribute('aria-pressed', String(prefs.teamim));
      show('.klali-original, .klali-original-support', !prefs.annotated);
      show('.klali-annotated, .klali-companion', false);
      if (!prefs.annotated) {
        status.textContent = 'Original Hebrew · 164 complete verses. Special annotations unavailable for this edition and for unannotated prayers. The alternative has independent pointing; no classifications are borrowed.';
        return;
      }
      status.textContent = 'Loading the fully annotated alternative and its font…';
      try {
        if (!corpus || !window.AjewMarkedHebrew) throw Error('Source or renderer unavailable');
        var rows = document.querySelectorAll('[data-annotated-ref]');
        var seen = new Set();
        rows.forEach(function (el) {
          var ref = el.dataset.annotatedRef, verse = corpus[ref];
          if (seen.has(ref) || !verse || !Array.isArray(verse.t) || !verse.t.length || !Array.isArray(verse.m)) throw Error('Incomplete source identities');
          seen.add(ref);
          el.innerHTML = window.AjewMarkedHebrew.renderVerse(verse, prefs);
        });
        if (seen.size !== 167 || Object.keys(corpus).length !== 167) throw Error('Incomplete source corpus');
        // Fail honestly on font delivery errors; do not label fallback serif as marked.
        await Promise.all(['day', 'sepia', 'night'].map(function (theme) {
          return document.fonts.load('24px AjewMarked-' + theme).then(function (fonts) {
            if (!fonts.length) throw Error('Font unavailable');
          });
        }));
        if (own !== epoch) return;
        show('.klali-annotated, .klali-companion', true);
        status.textContent = 'Fully annotated alternative · owned UXLC Psalms. Pointing, divine names, punctuation and qere can differ from Original. Hebrew only: English and legacy pronunciation are available in Original, not silently transferred to this edition. The Psalm 95 prayer variant remains below its biblical companion.';
      } catch (_) {
        if (own !== epoch) return;
        status.textContent = 'Fully annotated source or font unavailable. Choose Original Hebrew to read the complete original text, or Retry alternative. No substitute is shown.';
        annotated.textContent = 'Retry alternative · fully annotated Hebrew';
      }
    }
    original.onclick = function () { prefs.annotated = false; save(); void render(); };
    annotated.onclick = function () { prefs.annotated = true; save(); void render(); };
    special.onclick = function () { prefs.specialNikud = !prefs.specialNikud; save(); void render(); };
    accents.onclick = function () { prefs.teamim = !prefs.teamim; save(); void render(); };
    void render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
