/* Shared vowel-only paint for annotated Tanach/readers. No sheva inference.
 * COLR fonts retain Unicode/GPOS; only requested vowel contours are colored.
 * Public API: window.AjewMarkedHebrew.renderVerse({t,m,k}, {teamim,specialNikud})
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
  function renderVerse(verse, options) {
    options = options || {};
    var byTok = {};
    (verse.m || []).forEach(function (m) { (byTok[m[0]] = byTok[m[0]] || []).push(m); });
    var html = (verse.t || []).map(function (tok, i, tokens) {
      var result = renderToken(tok, byTok[i] || [], options.teamim, options.specialNikud);
      if (verse.k && verse.k[i] === 1) result = '<span class="marked-qere">' + result + '</span>';
      return result + (i < tokens.length - 1 && !/\u05BE[\u200e\u200f]*$/.test(tok) ? ' ' : '');
    }).join('');
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
    return window.TikkunQatanOccurrences.applyBook(book, requestedSlug);
  }
  window.AjewMarkedHebrew = { applyBook: applyBook, renderVerse: renderVerse, renderToken: renderToken, css: CSS, version: VERSION };
  if (!document.getElementById('ajew-marked-hebrew-css')) {
    var style = document.createElement('style'); style.id = 'ajew-marked-hebrew-css'; style.textContent = CSS; document.head.appendChild(style);
  }

})();
