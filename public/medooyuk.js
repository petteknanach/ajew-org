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
    '.marked-hebrew .marked-qere{text-decoration:underline;text-underline-offset:.12em}';
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
  window.AjewMarkedHebrew = { renderVerse: renderVerse, renderToken: renderToken, css: CSS, version: VERSION };
  if (!document.getElementById('ajew-marked-hebrew-css')) {
    var style = document.createElement('style'); style.id = 'ajew-marked-hebrew-css'; style.textContent = CSS; document.head.appendChild(style);
  }

  var match = location.pathname.match(/^\/reader\/(tanach-[a-z0-9-]+)\/(\d+)\/(\d+)\/?$/);
  if (!match) return;
  var slug = match[1], chapter = match[3], data = null, active = false, wanted = false, pending = null, snapshots = [];
  var PREF = 'ajew-special-nikud';
  function save(value) { try { localStorage.setItem(PREF, value ? '1' : '0'); } catch (_) {} }
  function btn() { return document.getElementById('btn-medooyuk'); }
  function updateButton() { var el = btn(); if (el) { el.classList.toggle('reader-btn-active', active); el.setAttribute('aria-pressed', String(wanted)); } }
  function activate() {
    if (!wanted || active) return;
    if (!data) {
      if (!pending) pending = fetch('/reader/medooyuk/' + slug + '.json').then(function (r) {
        if (!r.ok) throw new Error(r.status); return r.json();
      }).then(function (d) { data = d; pending = null; activate(); }).catch(function () {
        pending = null; wanted = false; save(false); updateButton(); alert('Medooyuk data not available for this book.');
      });
      return;
    }
    var ch = data.ch[chapter] || {};
    document.querySelectorAll('.reader-segment').forEach(function (seg) {
      var vi = parseInt(seg.getAttribute('data-index'), 10), p = seg.querySelector('p[data-nikud]');
      if (!p || !ch[vi]) return;
      snapshots.push({ el: p, html: p.innerHTML }); p.innerHTML = renderVerse(ch[vi]);
    });
    active = true; updateButton();
  }
  function deactivate() {
    snapshots.forEach(function (s) { s.el.innerHTML = s.html; }); snapshots = []; active = false; updateButton();
  }
  function injectButtons() {
    var anchor = document.getElementById('btn-nikud');
    if (!anchor || btn()) return;
    var mk = document.createElement('button');
    mk.className = 'reader-btn'; mk.id = 'btn-medooyuk'; mk.textContent = 'Medooyuk';
    mk.title = 'סימון ניקוד בלבד: שווא נע מודגש, קמץ קטן, מתג וקמץ לבירור';
    mk.setAttribute('aria-pressed', 'false');
    mk.addEventListener('click', function () { wanted = !wanted; save(wanted); wanted ? activate() : deactivate(); updateButton(); });
    anchor.insertAdjacentElement('afterend', mk);
    var tk = document.createElement('a'); tk.className = 'reader-btn'; tk.textContent = 'Tikun Korim';
    tk.href = '/reader/tikkun?b=' + slug + '&c=' + chapter; tk.title = 'Open this chapter in the Tikun Korim';
    mk.insertAdjacentElement('afterend', tk);
    var style = document.createElement('style');
    style.textContent = '.reader-btn-active{outline:2px solid #1a9e8c;outline-offset:1px}a.reader-btn{text-decoration:none;display:inline-flex;align-items:center}';
    document.head.appendChild(style);
    try { wanted = localStorage.getItem(PREF) === '1'; } catch (_) {}
    if (wanted) { updateButton(); activate(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButtons); else injectButtons();
})();
