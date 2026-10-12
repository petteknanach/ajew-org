/* One TikunHaklaliReader per document; sources are build-time imports.
 * Original Hebrew and frozen published pronunciation are never rewritten. */
(function () {
  'use strict';
  function init() {
    var root = document.getElementById('tikun-haklali');
    var source = document.getElementById('klali-source');
    if (!root || !source || source.dataset.initialized) return;
    source.dataset.initialized = 'true';
    var key = 'ajew-klali-reader-v2';
    var prefs = { language: 'both', englishMode: 'translation', annotated: true, specialNikud: true, teamim: false };
    try {
      var saved = JSON.parse(localStorage.getItem(key));
      if (saved && typeof saved === 'object') {
        if (['he', 'en', 'both'].indexOf(saved.language) >= 0) prefs.language = saved.language;
        if (['translation', 'transliteration', 'both'].indexOf(saved.englishMode) >= 0) prefs.englishMode = saved.englishMode;
        prefs.annotated = saved.annotated !== false;
        prefs.specialNikud = saved.specialNikud !== false;
        prefs.teamim = saved.teamim === true;
      }
    } catch (_) {}
    var corpus;
    try { corpus = JSON.parse(source.textContent); } catch (_) { corpus = null; }
    var status = document.getElementById('klali-status');
    var original = document.getElementById('klali-original'), annotated = document.getElementById('klali-annotated');
    var special = document.getElementById('klali-special'), accents = document.getElementById('klali-accents');
    var language = document.getElementById('klali-language'), englishMode = document.getElementById('klali-english-mode');
    var hebrewControls = document.getElementById('klali-hebrew-controls');
    var epoch = 0, fontPromise;
    function show(selector, visible) { root.querySelectorAll(selector).forEach(function (el) { el.hidden = !visible; }); }
    function save() { try { localStorage.setItem(key, JSON.stringify(prefs)); } catch (_) {} }
    function englishView() {
      var english = prefs.language !== 'he';
      var pronunciation = english && prefs.englishMode !== 'translation';
      language.value = prefs.language;
      englishMode.value = prefs.englishMode;
      englishMode.disabled = !english;
      hebrewControls.hidden = prefs.language === 'en';
      show('[data-klali-text="translation"]', english && prefs.englishMode !== 'transliteration');
      show('[data-klali-text="transliteration"], .klali-published-variant', pronunciation);
    }
    function loadFonts() {
      if (!fontPromise) {
        fontPromise = new Promise(function (resolve, reject) {
          var timer = setTimeout(function () { reject(Error('Marked font deadline')); }, 12000);
          Promise.all(['day', 'sepia', 'night'].map(function (theme) {
            return document.fonts.load('24px AjewMarked-' + theme).then(function (fonts) {
              if (!fonts.length) throw Error('Marked font unavailable');
            });
          })).then(function () { clearTimeout(timer); resolve(); }, function (err) { clearTimeout(timer); reject(err); });
        }).catch(function (err) { fontPromise = null; throw err; });
      }
      return fontPromise;
    }
    async function render() {
      var own = ++epoch, hebrew = prefs.language !== 'en';
      englishView();
      original.setAttribute('aria-pressed', String(!prefs.annotated));
      annotated.setAttribute('aria-pressed', String(prefs.annotated));
      special.hidden = accents.hidden = !prefs.annotated;
      special.setAttribute('aria-pressed', String(prefs.specialNikud));
      accents.setAttribute('aria-pressed', String(prefs.teamim));
      show('.klali-annotated, .klali-companion', false);
      show('.klali-original, .klali-prelude-original', hebrew);
      if (!hebrew) {
        status.textContent = 'Complete published English · 164 verses. Translation and frozen pronunciation follow the book, not the independent Hebrew editions.';
        return;
      }
      if (!prefs.annotated) {
        status.textContent = 'Original app Hebrew · 164 verses, unchanged. Special annotations are unavailable for this edition. English remains a separately sourced book companion.';
        return;
      }
      status.textContent = 'Loading Medooyuk and its marked font; Original app Hebrew remains visible until ready.';
      try {
        if (!corpus || !window.AjewMarkedHebrew) throw Error('Source or renderer unavailable');
        var rows = root.querySelectorAll('[data-annotated-ref]');
        var seen = new Set();
        rows.forEach(function (el) {
          var ref = el.dataset.annotatedRef, verse = corpus[ref];
          if (seen.has(ref) || !verse || !Array.isArray(verse.t) || !verse.t.length || !Array.isArray(verse.m)) throw Error('Incomplete source identities');
          seen.add(ref);
          el.innerHTML = window.AjewMarkedHebrew.renderVerse(verse, prefs);
        });
        if (seen.size !== 167 || Object.keys(corpus).length !== 167) throw Error('Incomplete source corpus');
        await loadFonts();
        if (own !== epoch) return;
        show('.klali-original, .klali-prelude-original', false);
        show('.klali-annotated, .klali-companion', true);
        annotated.textContent = 'Medooyuk · independent Hebrew edition';
        status.textContent = 'Medooyuk · independent UXLC Hebrew with approved annotations. English translation and frozen pronunciation follow the published book by verse identity, not a Medooyuk pronunciation overlay. The Psalm 95 companion is independent of the prayer variant.';
      } catch (_) {
        if (own !== epoch) return;
        status.textContent = 'Medooyuk source or marked font unavailable. Original app Hebrew remains visible, unchanged and unannotated. Retry Medooyuk or choose Original app Hebrew; published English remains available.';
        annotated.textContent = 'Retry Medooyuk';
      }
    }
    original.onclick = function () { prefs.annotated = false; save(); void render(); };
    annotated.onclick = function () { prefs.annotated = true; save(); void render(); };
    special.onclick = function () { prefs.specialNikud = !prefs.specialNikud; save(); void render(); };
    accents.onclick = function () { prefs.teamim = !prefs.teamim; save(); void render(); };
    language.onchange = function () { if (['he', 'en', 'both'].indexOf(language.value) < 0) return; prefs.language = language.value; save(); void render(); };
    englishMode.onchange = function () { if (['translation', 'transliteration', 'both'].indexOf(englishMode.value) < 0) return; prefs.englishMode = englishMode.value; save(); void render(); };
    void render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
