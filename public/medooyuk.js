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

  var CSS = '.m-na{color:#0e7a6d;font-weight:600;text-decoration:underline;text-decoration-color:#1a9e8c;text-decoration-thickness:2px;text-underline-offset:4px}' +
    '.m-nach{color:#b45309;font-weight:600;text-decoration:underline;text-decoration-color:#d07a2a;text-decoration-thickness:2px;text-decoration-style:double;text-underline-offset:4px}' +
    '.m-qb{outline:1.5px dotted rgba(200,60,60,.65);outline-offset:2px;border-radius:4px}';

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

  function coloredVerse(verse) {
    var byTok = {};
    (verse.m || []).forEach(function (mk) {
      (byTok[mk[0]] = byTok[mk[0]] || []).push(mk);
    });
    return joinTokens(verse.t.map(function (tok, i) {
      var mks = byTok[i];
      if (!mks) return esc(tok);
      var segs = letterSegments(tok);
      var cls = [], fallback = false;
      for (var s = 0; s < segs.length; s++) cls.push([]);
      mks.forEach(function (mk) {
        var li = mk[1];
        if (li >= 0 && li < segs.length) {
          if (mk[2] === 'na') cls[li].push('m-na');
          else if (mk[2] === 'nach') cls[li].push('m-nach');
          if (mk[3]) cls[li].push('m-qb');
        } else fallback = true;
      });
      if (fallback) { /* mark the whole token rather than misplacing a letter */
        var all = [];
        mks.forEach(function (mk) {
          if (mk[2] === 'na') all.push('m-na');
          else if (mk[2] === 'nach') all.push('m-nach');
          if (mk[3]) all.push('m-qb');
        });
        var c0 = all.join(' ').trim();
        return c0 ? '<span class="' + c0 + '">' + esc(tok) + '</span>' : esc(tok);
      }
      var out = '';
      for (var j = 0; j < segs.length; j++) {
        var cl = cls[j].join(' ').trim();
        out += cl ? '<span class="' + cl + '">' + esc(segs[j]) + '</span>' : esc(segs[j]);
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
    mk.title = 'Sheva na/nach layer (UXLC text with taamim)';
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
