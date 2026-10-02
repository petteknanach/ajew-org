/* Pure presentation functions. No fetch, DOM, inferred linguistic rules, or source mutation.
 * Corpus strings/mark indexes and written-side overrides remain separate.
 * Shared test/port contract: public/tikkun/PROVENANCE.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TikkunRenderer = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var accents = /[\u0591-\u05AF\u05BD\u05C0]/g;
  var vowels = /[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function mode(s, m) {
    if (m === 'nikud') return s.replace(accents, '');
    if (m === 'taamim') return s.replace(vowels, '');
    if (m === 'letters') return s.replace(accents, '').replace(vowels, '');
    return s;
  }
  function bare(s) {
    // Maqaf is a WORD separator, NOT scroll ink. Puncta extraordinaria are
    // scribal dots, not vowels. Inverted nun is also a scribal sign.
    return s.replace(/\u05BE/g, ' ').replace(/[^\u05D0-\u05EA\u05C4\u05C5\u05C6\s]/g, '');
  }
  function segments(tok) {
    var out = [], current = '';
    Array.from(tok).forEach(function (ch) {
      if (/[\u05D0-\u05EA]/.test(ch) && current) { out.push(current); current = ''; }
      current += ch;
    });
    if (current) out.push(current);
    return out;
  }
  function token(tok, marks, letters, opts) {
    opts = opts || {}; var segs = segments(tok), na = {}, qk = {}, qb = {}, size = {};
    (opts.marked ? marks || [] : []).forEach(function (m) {
      if (m[1] < 0 || m[1] >= segs.length) return;
      if (m[2] === 'na') na[m[1]] = true;
      if (m[2] === 'qk') qk[m[1]] = true;
      if (m[3] && m[1] > 0) qb[m[1] - 1] = true;
    });
    (letters || []).forEach(function (l) { if (/^(lg|sm|sus|split)$/.test(l[2])) size[l[1]] = l[2]; });
    if (!opts.written) {
      // COLR glyph alternates keep the full base+marks cluster intact. Only
      // vowel outlines have a palette color; consonants use currentColor.
      var feature = {na:'ss01',qk:'ss02',qb:'ss03',meteg:'ss04'};
      return segs.map(function (seg,li) {
        var vis = mode(seg,opts.mode), tags = [], records = [];
        if (opts.marked) Array.from(vis).forEach(function (ch) {
          var type = ch === '\u05B0' && na[li] ? 'na' : ch === '\u05BD' ? 'meteg' : (ch === '\u05C7' || ch === '\u05B8' && qk[li]) ? 'qk' : /[\u05B8\u05C7]/.test(ch) && qb[li] ? 'qb' : '';
          if (type) { tags.push("'"+feature[type]+"' 1"); records.push(type+':'+ch); }
        });
        return tags.length ? '<span class="tk-cluster" data-tk-marks="' + records.join(' ') + '" style="font-feature-settings:' + Array.from(new Set(tags)).join(',') + '">' + esc(vis) + '</span>' : esc(vis);
      }).join('');
    }
    return segs.map(function (seg, li) {
      return Array.from(seg).map(function (ch, i) {
        var vis = opts.written ? bare(ch) : mode(ch, opts.mode), cls = '';
        if (!vis) return '';
        if (opts.marked && !opts.written) {
          if (ch === '\u05B0' && na[li]) cls = 'm-na';
          else if (ch === '\u05BD') cls = 'm-meteg';
          else if (/[\u05B8\u05C7]/.test(ch) && qk[li]) cls = 'm-qk';
          else if (/[\u05B8\u05C7]/.test(ch) && qb[li]) cls = 'm-qb';
        }
        // Letter sizes are scribal metadata, never medooyuk coloring.
        if (i === 0 && size[li] && /[א-ת]/.test(ch)) cls = 'tk-l-' + size[li];
        if (ch === '\u05C6') return '<span class="tk-nun8" aria-label="נ הפוכה">׆</span>';
        return cls ? '<span class="' + cls + '">' + esc(vis) + '</span>' : esc(vis);
      }).join('');
    }).join('');
  }
  function boundary(kind, written) {
    if (kind === 'n8') return '<span class="tk-nun8" aria-label="נ הפוכה">׆</span>';
    if (written) return kind === 'p' ? '<br class="tk-gap-p" />' : '<span class="tk-gap-s" aria-label="סתומה"> </span>';
    return '<span class="tk-brk tk-brk-' + (kind === 'p' ? 'pe' : 'se') + '">' + (kind === 'p' ? 'פ' : 'ס') + '</span>';
  }
  function readingVerse(v, opts) { return verse(v, opts || {}); }
  function writtenVerse(v, override) {
    // Never silently show a reading variant as written text when metadata
    // failed to load. UI must display the fetch error, not a fake scroll.
    if ((v.k || []).some(Boolean) && !override) throw new Error('Written spelling unavailable');
    return verse(override || v, {written:true});
  }
  function verse(v, opts) {
    var byMark = {}, byLetter = {}, breaks = {};
    (v.m || []).forEach(function (m) { (byMark[m[0]] = byMark[m[0]] || []).push(m); });
    (v.L || []).forEach(function (l) { (byLetter[l[0]] = byLetter[l[0]] || []).push(l); });
    (v.b || []).forEach(function (b) { (breaks[b[0]] = breaks[b[0]] || []).push(b[1]); });
    var html = '';
    for (var i = 0; i <= v.t.length; i++) {
      (breaks[i] || []).forEach(function (kind) { html += boundary(kind, opts.written); });
      if (i === v.t.length) break;
      if (i && (opts.written || !/\u05BE$/.test(v.t[i-1]))) html += ' ';
      html += token(v.t[i], byMark[i], byLetter[i], opts);
    }
    return html;
  }
  function repaired(v, overlay, key) {
    var t = overlay && overlay.readingRepairs && overlay.readingRepairs[key];
    return t ? Object.assign({}, v, {t:t}) : v;
  }
  function continuous(chapters, chapter, overlay, opts) {
    var ch = chapters[chapter];
    return Object.keys(ch).sort(function (a,b) { return +a - +b; }).map(function (v) {
      var key = chapter + ':' + v, original = ch[v];
      var html = opts.written ? writtenVerse(original, overlay && overlay.verses[key]) : readingVerse(repaired(original, overlay, key), opts);
      return '<span data-verse="' + key + '">' + html + '</span>';
    }).join(' '); // essential: verse boundaries are NOT word concatenation
  }
  function fixedFragment(s, specials) {
    var ls = (specials || []).map(function (x) { return [0, x[0], x[1]]; });
    return token(s, [], ls, {written:true});
  }
  function fixedColumn(lines, n) {
    return '<section class="tk-fixed-page" data-column="' + n + '"><h2 class="tk-column-label" dir="ltr">Column ' + n + '</h2><div class="tk-fixed-ink" dir="rtl" lang="he">' + lines.map(function (l, i) {
      return '<div class="tk-fixed-line' + (l.p ? ' tk-fixed-open' : '') + (l.g.length > 1 ? ' tk-fixed-song' : '') + '" data-line="' + (i+1) + '">' + l.g.map(function (g, gi) {
        return '<div class="tk-fixed-group' + (g.length > 1 ? ' tk-fixed-gapped' : '') + '">' + g.map(function (s, si) {
          return '<span class="tk-fixed-fragment">' + fixedFragment(s, l.L && l.L[gi + ':' + si]) + '</span>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }).join('') + '</div></section>';
  }
  return {esc:esc, mode:mode, bare:bare, segments:segments, token:token, readingVerse:readingVerse, writtenVerse:writtenVerse, repaired:repaired, continuous:continuous, fixedColumn:fixedColumn};
});
