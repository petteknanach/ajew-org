/* Conservative annotation adapter. Keep this contract in parity with the app's
 * services/readerMarkedHebrew.ts; corpus parity is tested, not assumed.
 * Comparison-only punctuation allowances NEVER change the displayed string. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AjewReaderSourceExact = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  var readingSources = new WeakMap();
  function text(v) {
    return v.t.map(function (t, i, a) { return t + (i < a.length - 1 && !/\u05BE[\u200e\u200f]*$/.test(t) ? ' ' : ''); }).join('');
  }
  function bare(s) { return s.replace(/[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/g, ''); }
  function compare(s) {
    return s.replace(/\u05BE/g, ' ').replace(/\u05C3/g, ':').replace(/\s+\([פס]\)\s*$/, '').replace(/\s+/g, ' ').trim();
  }
  function attach(source, index, candidate) {
    function result(reason, verse) { return { index: index, sourceText: source, reason: reason, verse: verse || null }; }
    if (!candidate || candidate.index !== index || !candidate.t.length) return result('missing');
    if ((candidate.k || []).some(function (k) { return k === 1; })) return result('qere');
    var plain = text(candidate);
    if (!/[\u0591-\u05AF\u05C0]/.test(source)) plain = plain.replace(/[\u0591-\u05AF\u05C0]/g, '');
    if (!source || compare(source) !== compare(plain)) return result('source-mismatch');
    var verse = { index: index, t: source.split(' '), m: [], b: [] }, positions = [], starts = [], total = 0;
    if (text(verse) !== source) return result('unsupported-spacing');
    verse.t.forEach(function (tok, ti) {
      var li = 0;
      Array.from(tok).forEach(function (ch) { if (/[\u05D0-\u05EA]/.test(ch)) positions.push([ti, li++]); });
    });
    candidate.t.forEach(function (tok) { starts.push(total); total += (tok.match(/[\u05D0-\u05EA]/g) || []).length; });
    (candidate.m || []).forEach(function (m) {
      var count = (candidate.t[m[0]] || '').match(/[\u05D0-\u05EA]/g) || [];
      if (!Number.isInteger(m[0]) || !Number.isInteger(m[1]) || m[1] < 0 || m[1] >= count.length) return;
      var p = positions[starts[m[0]] + m[1]];
      if (p) verse.m.push([p[0], p[1], m[2], m[3]]);
    });
    var unsupported = false;
    (candidate.b || []).forEach(function (b) {
      if (!Array.isArray(b) || !Number.isInteger(b[0]) || b[0] < 0 || b[0] > candidate.t.length) return;
      var at = b[0] === candidate.t.length ? [verse.t.length, 0] : positions[starts[b[0]]];
      // Never manufacture a token split or move a boundary through a maqaf.
      if (!at || (at[1] !== 0 && (b[1] === 'p' || b[1] === 's'))) { unsupported = true; return; }
      verse.b.push([at[0]].concat(b.slice(1)));
    });
    if (unsupported) return result('unsupported-boundary-spacing');
    var reading = readingSources.get(candidate);
    if (reading) {
      var target = positions[starts[1]];
      if (target && target[1] === 0 && verse.t[target[0]] === candidate.t[1])
        readingSources.set(verse, {source: reading.source, context: reading.context, tokenIndex: target[0]});
    }
    return result('attached', verse);
  }
  function chapter(sources, candidates) {
    var byIndex = new Map(), duplicates = new Set(), counts = new Map();
    candidates.forEach(function (v) { if (byIndex.has(v.index)) duplicates.add(v.index); byIndex.set(v.index, v); });
    sources.forEach(function (s) { counts.set(s.index, (counts.get(s.index) || 0) + 1); });
    return sources.map(function (s) {
      return duplicates.has(s.index) || counts.get(s.index) > 1
        ? { index: s.index, sourceText: s.text, reason: 'duplicate-index', verse: null }
        : attach(s.text, s.index, byIndex.get(s.index));
    });
  }
  // Source-bound parse-model corrections only, copied from the owned app model.
  // A stale correction fails the entire alternative instead of showing a cut tail.
  function prepare(raw, book, ch, tails) {
    if (!raw || typeof raw !== 'object' || !Object.keys(raw).length) throw Error('Chapter unavailable');
    return Object.keys(raw).sort(function (a, b) { return +a - +b; }).map(function (n) {
      var v = raw[n];
      if (!/^[1-9]\d*$/.test(n) || !v || !Array.isArray(v.t) || !v.t.length || !v.t.every(function (t) { return typeof t === 'string'; })) throw Error('Invalid verse');
      var tail = tails[book + '/' + ch + '/' + n], tokens = v.t;
      if (tail) {
        var key = tokens.join('\u001f');
        if (key !== tail.readingKey && key !== tail.readingTokens.join('\u001f')) throw Error('Source tail mismatch');
        tokens = tail.readingTokens;
      }
      var prepared = { index: +n, t: tokens.slice(), k: (v.k || []).slice(), m: (v.m || []).map(function (m) { return m.slice(); }),
        b: (v.b || []).map(function (b) { return b.slice(); }) };
      readingSources.set(prepared, {source: v, context: {book: book, chapter: ch, verse: +n}, tokenIndex: 1});
      return prepared;
    });
  }
  function reading(verse, renderer) {
    var bound = readingSources.get(verse);
    if (!bound || !renderer || typeof renderer.readingVerse !== 'function') return verse;
    var selected = renderer.readingVerse(bound.source, bound.context), at = bound.tokenIndex;
    if (selected === bound.source || verse.t[at] !== bound.source.t[1]) return verse;
    var result = Object.assign({}, verse, {t: verse.t.slice()});
    result.t[at] = selected.t[1];
    return result;
  }
  return { text: text, bare: bare, reading: reading, attach: attach, chapter: chapter, prepare: prepare };
});
