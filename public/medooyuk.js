/* ajew.org medooyuk layer for Tanach reader pages.
 * On /reader/tanach-<slug>/<part>/<chapter> pages this adds:
 *   - a "Medooyuk" button: overlays the UXLC pointed text (nikud + taamim)
 *     with sheva na/nach coloring from /reader/medooyuk/<slug>.json
 *   - a "Tikun Korim" button linking to the full tikkun app for this chapter
 */
(function () {
  'use strict';
  var m = location.pathname.match(/^\/reader\/(tanach-[a-z0-9-]+)\/(\d+)\/(\d+)\/?$/);
  if (!m) return;
  var slug = m[1], chapter = m[3];
  var data = null, active = false, snapshots = [];

  var CSS = '.m-na{color:#0e9d8a;font-weight:900;font-size:1.12em;-webkit-text-stroke:.02em currentColor;text-shadow:.011em 0 0 currentColor,-.011em 0 0 currentColor,0 .011em 0 currentColor,0 -.011em 0 currentColor}' +
    '.m-qb{position:relative;text-decoration:none}' +
    '.m-qb::before{content:"";position:absolute;top:-0.3em;inset-inline-start:-0.3em;width:0.66em;height:0.15em;background:rgba(200,60,60,.9);border-radius:1px}' +
    '.m-qb::after{content:"";position:absolute;top:-0.15em;inset-inline-start:-0.015em;width:0.14em;height:0.44em;background:rgba(200,60,60,.9);border-radius:1px}' +
    '.m-qk{color:#c34a3a;font-weight:900;text-shadow:0 0 .6px currentColor}' +
    '.m-meteg{color:#8a6fd8}';

  function joinTokens(arr) {
    var out = '';
    for (var i = 0; i < arr.length; i++) {
      if (out && !/[\u05BE\u05C0\u200F]$/.test(out) && out.slice(-1) !== ' ') out += ' ';
      out += arr[i];
    }
    return out;
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function letterSegments(tok) {
    var segs = [], cur = '';
    for (var i = 0; i < tok.length; i++) {
      var cp = tok.charCodeAt(i);
      if (cp >= 0x5D0 && cp <= 0x5EA) {
        if (cur) segs.push(cur);
        cur = tok[i];
      } else {
        cur += tok[i];
      }
    }
    if (cur) segs.push(cur);
    return segs;
  }

  /* medooyuk marks on the NIKUD CHARACTERS themselves — letters stay regular:
     sheva na colored (m-na), meteg colored (m-meteg), qamats katan colored
     (m-qk; mk.li IS the qamats letter), qamats feeding an unresolved sheva
     dotted on the qamats itself (m-qb; mk.li is the sheva letter, the qamats
     sits on li-1). */
  function coloredVerse(verse) {
    var byTok = {};
    (verse.m || []).forEach(function (mk) {
      (byTok[mk[0]] = byTok[mk[0]] || []).push(mk);
    });
    return joinTokens(verse.t.map(function (tok, i) {
      var segs = letterSegments(tok);
      var na = {}, qbPrev = {}, qk = {};
      (byTok[i] || []).forEach(function (mk) {
        if (mk[1] >= 0 && mk[1] < segs.length) {
          if (mk[2] === 'na') na[mk[1]] = 1;
          if (mk[2] === 'qk') qk[mk[1]] = 1;
          if (mk[3]) { if (mk[1] > 0) qbPrev[mk[1] - 1] = 1; }
        }
      });
      var out = '';
      for (var j = 0; j < segs.length; j++) {
        var seg = segs[j];
        for (var k = 0; k < seg.length; k++) {
          var cp = seg.charCodeAt(k), cls = null;
          if (cp === 0x5BD) cls = 'm-meteg';
          else if (cp === 0x5B0 && na[j]) cls = 'm-na';
          else if ((cp === 0x5B8 || cp === 0x5C7) && qbPrev[j]) cls = 'm-qb';
          else if ((cp === 0x5B8 || cp === 0x5C7) && qk[j]) cls = 'm-qk';
          out += cls ? '<span class="' + cls + '">' + esc(seg[k]) + '</span>' : esc(seg[k]);
        }
      }
      return out;
    }));
  }

  function activate() {
    if (!data) {
      fetch('/reader/medooyuk/' + slug + '.json')
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (d) { data = d; activate(); })
        .catch(function () { alert('Medooyuk data not available for this book.'); });
      return;
    }
    var chData = data.ch[chapter] || {};
    document.querySelectorAll('.reader-segment').forEach(function (seg) {
      var vi = parseInt(seg.getAttribute('data-index'), 10);
      var p = seg.querySelector('p[data-nikud]');
      if (!p || !chData[vi]) return;
      snapshots.push({ el: p, html: p.innerHTML });
      p.innerHTML = coloredVerse(chData[vi]);
    });
    active = true;
    btn().classList.add('reader-btn-active');
  }

  function deactivate() {
    snapshots.forEach(function (s) { s.el.innerHTML = s.html; });
    snapshots = [];
    active = false;
    btn().classList.remove('reader-btn-active');
  }

  function btn() { return document.getElementById('btn-medooyuk'); }

  function injectButtons() {
    var anchor = document.getElementById('btn-nikud');
    if (!anchor || document.getElementById('btn-medooyuk')) return;
    var mk = document.createElement('button');
    mk.className = 'reader-btn'; mk.id = 'btn-medooyuk'; mk.textContent = 'Medooyuk';
    mk.title = 'Medooyuk layer: shva na + meteg marked on the nikud itself';
    mk.addEventListener('click', function () { active ? deactivate() : activate(); });
    anchor.insertAdjacentElement('afterend', mk);
    var tk = document.createElement('a');
    tk.className = 'reader-btn'; tk.textContent = 'Tikun Korim';
    tk.href = '/reader/tikkun?b=' + slug + '&c=' + chapter;
    tk.title = 'Open this chapter in the Tikun Korim';
    mk.insertAdjacentElement('afterend', tk);
    var style = document.createElement('style');
    style.textContent = CSS +
      '.reader-btn-active{outline:2px solid #1a9e8c;outline-offset:1px}' +
      'a.reader-btn{text-decoration:none;display:inline-flex;align-items:center}';
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButtons);
  } else {
    injectButtons();
  }
})();
