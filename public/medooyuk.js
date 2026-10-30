/* Shared vowel-only paint for annotated Tanach/readers. No sheva inference.
 * COLR fonts retain Unicode/GPOS; only requested vowel contours are colored.
 * Public API: window.AjewMarkedHebrew.renderVerse({t,m,k,b}, {teamim,specialNikud})
 * plus .css (installed once), usable by Chok and any annotated reader. */
(function () {
  'use strict';
  var VERSION = 'capital-t-20261002-1';
  var CSS = ['day', 'sepia', 'night'].map(function (theme) {
    return '@font-face{font-family:AjewMarked-' + theme + ';src:url("/fonts/tikkun/TikunVowels-' + theme + '.ttf?v=' + VERSION + '") format("truetype");font-weight:400;font-style:normal;font-display:block}';
  }).join('') +
    '[data-theme="day"]{--ajew-marked-font:AjewMarked-day}' +
    '[data-theme="sepia"]{--ajew-marked-font:AjewMarked-sepia}' +
    '[data-theme="night"]{--ajew-marked-font:AjewMarked-night}' +
    '.marked-hebrew{font-family:var(--ajew-marked-font,AjewMarked-day),serif!important;font-weight:400!important;font-synthesis:none}' +
    '.marked-qere{text-decoration:underline;text-underline-offset:.12em}';
  CSS += '.marked-paragraph-boundary{display:inline-block;direction:rtl;unicode-bidi:isolate;margin-inline:.35em;font:inherit}';
  function esc(s) { return s.replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function renderToken(tok, marks, teamim, specialNikud) {
    var text = teamim === false ? tok.replace(/[\u0591-\u05AF\u05C0]/g, '') : tok;
    if (specialNikud === false) return esc(text);
    var li = -1, html = '', cluster = '', features = {};
    function flush() {
      var setting = Object.keys(features).map(function (tag) { return "'" + tag + "' 1"; }).join(', ');
      html += setting ? '<span class="vowel-cluster" style="font-feature-settings:' + setting + '">' + cluster + '</span>' : cluster;
      cluster = ''; features = {};
    }
    Array.from(text).forEach(function (ch) {
      if (/[\u05D0-\u05EA]/.test(ch)) { flush(); li++; }
      var kind;
      if (ch === '\u05B0' && marks.some(function (m) { return m[2] === 'na' && m[1] === li; })) kind = 'na';
      else if (ch === '\u05B8' || ch === '\u05C7') {
        // Explicit katan/positive qk outrank uncertainty; qb is NOT katan.
        if (ch === '\u05C7' || marks.some(function (m) { return m[2] === 'qk' && m[1] === li; })) kind = 'qk';
        else if (marks.some(function (m) { return m[3] && m[1] - 1 === li; })) kind = 'qb';
      } else if (ch === '\u05BD') kind = 'meteg';
      if (kind) features[{ na: 'ss01', qk: 'ss02', qb: 'ss03', meteg: 'ss04' }[kind]] = true;
      cluster += kind ? '<span class="mark ' + kind + '">' + ch + '</span>' : esc(ch);
    });
    flush(); return html;
  }
  // b indices count source tokens BEFORE the boundary; never insert source tokens.
  function paragraphMarkers(verse, index) {
    var seen = {};
    return (verse.b || []).filter(function (b) {
      if (!Array.isArray(b) || b[0] !== index || index < 0 || index > verse.t.length ||
          (b[1] !== 'p' && b[1] !== 's') || seen[b[1]]) return false;
      seen[b[1]] = true; return true;
    }).map(function (b) {
      return '<span class="marked-paragraph-boundary" data-source-role="paragraph-boundary" data-paragraph-kind="' + b[1] +
        '" data-word-boundary="' + index + '" dir="rtl" aria-label="' + (b[1] === 'p' ? 'פרשה פתוחה' : 'פרשה סתומה') + '">' +
        (b[1] === 'p' ? 'פ' : 'ס') + '</span>';
    }).join('');
  }
  // Selected reading, not a raw-edition rewrite. Authority: direct user proposal
  // SHA256 f8fe6491d87b97bd10ea83f0a4b533ec53dc1ce9974eb04af3739630ac4e80d6.
  // Edition SHA256 a2633f304364c9592f2f9637aeee4730a28c52303bc80a508c4af26faa7fba9b.
  var readingSources = new WeakMap();
  function readingVerse(verse, context) {
    var pin = verse && readingSources.get(verse);
    if (!pin || !context || context.book !== 'tanach-bereishit' ||
        +context.chapter !== 21 || +context.verse !== 33 ||
        window.TikkunBoundaries.boundaryHash(verse) !== pin || verse.t[1] !== 'אֶ֖שֶׁל') return verse;
    var selected = Object.assign({}, verse, {t: verse.t.slice()});
    selected.t[1] = 'אֵ֖שֶׁל';
    return selected;
  }
  function renderVerse(verse, options) {
    options = options || {};
    var byTok = {};
    (verse.m || []).forEach(function (m) { (byTok[m[0]] = byTok[m[0]] || []).push(m); });
    var html = (verse.t || []).map(function (tok, i, tokens) {
      var result = renderToken(tok, byTok[i] || [], options.teamim, options.specialNikud);
      if (verse.k && verse.k[i] === 1) result = '<span class="marked-qere">' + result + '</span>';
      return paragraphMarkers(verse, i) + result + (i < tokens.length - 1 && !/\u05BE[\u200e\u200f]*$/.test(tok) ? ' ' : '');
    }).join('') + paragraphMarkers(verse, (verse.t || []).length);
    return '<span class="marked-hebrew">' + html + '</span>';
  }
  // Authenticate the complete response BEFORE chapter/day/range selection.
  // The requested identifier is independently derived by the caller.
  var BOOK_SLUGS = ["tanach-amos", "tanach-bamidbar", "tanach-bereishit", "tanach-chaggai", "tanach-daniel", "tanach-devarim", "tanach-divrei-hayamim-a", "tanach-divrei-hayamim-b", "tanach-eicha", "tanach-esther", "tanach-ezra", "tanach-havakkuk", "tanach-hoshea", "tanach-iyov", "tanach-koheles", "tanach-malachi", "tanach-melachim-a", "tanach-melachim-b", "tanach-michah", "tanach-mishlei", "tanach-nachum", "tanach-nechemia", "tanach-ovadya", "tanach-rus", "tanach-shemos", "tanach-shir-hashirim", "tanach-shmuel-a", "tanach-shmuel-b", "tanach-shoftim", "tanach-tehillim", "tanach-tzefanya", "tanach-vayikra", "tanach-yechezkel", "tanach-yehoshua", "tanach-yeshayahu", "tanach-yirmiyahu", "tanach-yoel", "tanach-yonah", "tanach-zecharya"];
  function applyBook(book, requestedSlug) {
    if (BOOK_SLUGS.indexOf(requestedSlug) < 0 || !book || book.slug !== requestedSlug ||
        !book.ch || typeof book.ch !== 'object' || Array.isArray(book.ch)) {
      throw Error('Annotated book identity unavailable or mismatched');
    }
    if (!window.TikkunBoundaries || typeof window.TikkunBoundaries.boundaryHash !== 'function' ||
        !window.TikkunQatanOccurrences || typeof window.TikkunQatanOccurrences.applyBook !== 'function') {
      throw Error('Authenticated qatan helper unavailable');
    }
    var authenticated = window.TikkunQatanOccurrences.applyBook(book, requestedSlug);
    if (requestedSlug === 'tanach-bereishit') {
      // The unmodified qatan guard admits the complete edition and all marks.
      // Also pin its complete selected output: never admit a mere token match.
      if (window.TikkunBoundaries.boundaryHash(authenticated) !== '0c0ad1e69d4ee25860c2180477ef9dd0ccb598b216d4a10b7a70d8fe883d9608')
        throw Error('Selected reading edition mismatch');
      var original = authenticated.ch[21][33];
      if (original.t[1] !== 'אֶ֖שֶׁל') throw Error('Selected reading preimage mismatch');
      readingSources.set(original, window.TikkunBoundaries.boundaryHash(original));
    }
    return authenticated;
  }
  window.AjewMarkedHebrew = { applyBook: applyBook, readingVerse: readingVerse, renderVerse: renderVerse, renderToken: renderToken, css: CSS, version: VERSION };
  if (!document.getElementById('ajew-marked-hebrew-css')) {
    var style = document.createElement('style'); style.id = 'ajew-marked-hebrew-css'; style.textContent = CSS; document.head.appendChild(style);
  }

})();
