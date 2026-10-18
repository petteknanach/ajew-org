/* Exact independently ratified daily sources. No runtime acquisition.
 * Only Lech Sunday Talmud/Zohar are registered; all other readings stay separate. */
(function () {
  'use strict';
  var URL = '/reader/chok/lech-sunday-talmud-zohar.json';
  var PIN = '0f6739147c793ccf167c22fee2bed3d27ed7f2546e021441dbf60c9d94242a93';
  var SELECTION = 'ed55cefd58a37b8b358bca5c3890ad723b5845f988d2f03bd0e6fdc8aa8e2eaf';
  var pending;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function digest(s) {
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.from(new Uint8Array(b)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function validatePair(u) {
    if (!u || !u.id || !u.ref || !u.role || typeof u.he !== 'string' || !u.he || typeof u.en !== 'string' || !u.en || !Array.isArray(u.displayMeaningNotes)) throw Error('Incomplete daily pair');
    var chars = Array.from(u.he), previous = -1;
    (u.naturalFolios || []).forEach(function (m) {
      if (!Number.isInteger(m.offsetCodepoints) || m.offsetCodepoints < 0 || m.offsetCodepoints >= chars.length || m.offsetCodepoints <= previous || typeof m.label !== 'string' || !m.label) throw Error('Invalid daily folio');
      previous = m.offsetCodepoints;
    });
    return Promise.all([digest(u.he), digest(u.en)].concat(u.displayMeaningNotes.map(function (q) {
      var span = q && q.sourceSpanCodepoints;
      if (!q || !q.id || q.owner !== u.id || q.sourceBodySHA256 !== u.sourceTextSHA256 || typeof q.he !== 'string' || !q.he || typeof q.en !== 'string' || !q.en || !Array.isArray(span) || span.length !== 2 || !Number.isInteger(span[0]) || !Number.isInteger(span[1]) || span[0] < 0 || span[1] <= span[0] || span[1] > chars.length || chars.slice(span[0], span[1]).join('') !== q.anchor) throw Error('Daily meaning note changed');
      return Promise.all([digest(q.he), digest(q.en)]).then(function (h) {
        if (h[0] !== q.heSHA256 || h[1] !== q.enSHA256) throw Error('Daily meaning note body changed');
      });
    }))).then(function (h) {
      if (h[0] !== u.sourceTextSHA256 || h[1] !== u.englishTextSHA256) throw Error('Daily source/translation changed');
    });
  }
  function load(loader) {
    if (pending) return pending;
    pending = Promise.resolve().then(function () {
      if (typeof loader !== 'function') throw Error('Daily loader unavailable');
      return loader(URL + '?v=' + PIN);
    }).then(function (raw) {
      if (typeof raw !== 'string') throw Error('Daily raw source required');
      return digest(raw).then(function (hash) {
        if (hash !== PIN) throw Error('Daily packet changed');
        return JSON.parse(raw);
      });
    }).then(function (p) {
      if (!p || p.schema !== 'chok-lech-sunday-talmud-zohar/v1' || p.key !== 'לך לך|יום ראשון' || p.sourceSelectionSHA256 !== SELECTION || !p.sections || Object.keys(p.sections).sort().join(',') !== 'talmud,zohar') throw Error('Daily selection changed');
      var t = p.sections.talmud, z = p.sections.zohar, extra = t.rashiFullSupplement;
      if (t.completeOriginal !== true || z.completeOriginal !== true || z.continuousDailyBody !== true || !Array.isArray(t.units) || t.units.length !== 11 || !Array.isArray(z.units) || z.units.length !== 1 || t.units[0].id !== 'sunday-gemara' || t.units[0].role !== 'gemara' || z.units[0].id !== 'sunday-zohar' || z.units[0].role !== 'zohar' || t.units.slice(1).some(function (u) { return u.role !== 'rashi'; }) || !extra || extra.completeOriginal !== true || extra.optional !== true || extra.initiallyClosed !== true || !Array.isArray(extra.units) || extra.units.length !== 10 || extra.units.some(function (u) { return u.role !== 'rashi'; })) throw Error('Daily source extent changed');
      var rows = t.units.concat(z.units, extra.units);
      if (new Set(rows.map(function (u) { return u.id; })).size !== rows.length) throw Error('Duplicate daily owner');
      return Promise.all(rows.map(validatePair)).then(function () { return p; });
    }).catch(function (error) {
      pending = null;
      throw error;
    });
    return pending;
  }
  function original(u, folios) {
    if (!folios || !u.naturalFolios || !u.naturalFolios.length) return esc(u.he);
    var chars = Array.from(u.he), at = 0;
    return u.naturalFolios.map(function (m) {
      var text = esc(chars.slice(at, m.offsetCodepoints).join(''));
      at = m.offsetCodepoints;
      return text + '<small class="ck-reading-ref" data-zohar-folio="' + esc(m.label) + '" dir="ltr">' + esc(m.label) + '</small>';
    }).join('') + esc(chars.slice(at).join(''));
  }
  function pair(u, english, folios) {
    return '<article class="ck-complete-pair" data-reading-unit="' + esc(u.id) + '" data-source-sha256="' + esc(u.sourceTextSHA256) + '"><div class="ck-he ck-original" data-source-field="he" lang="he" dir="rtl" style="white-space:pre-wrap">' + original(u, folios) + '</div>' + (english ? '<div class="ck-en ck-en-line" data-source-field="en" lang="en" dir="ltr" style="white-space:pre-wrap">' + esc(u.en) + '</div>' : '') + '</article>';
  }
  function notes(rows) { return rows.map(function (u) { return window.ChokSources.meaningNotes(u); }).join(''); }
  function render(p, section, english) {
    var s = p.sections[section], content;
    if (section === 'zohar') {
      content = '<details class="ck-layer ck-zohar" data-field-role="original-source" open><summary>זוהר · Zohar — <bdi dir="ltr">I 76b–77a</bdi></summary>' + s.units.map(function (u) { return pair(u, english, true); }).join('') + '</details>';
      return '<div data-qualified-daily="lech-sunday" data-daily-section="zohar">' + notes(s.units) + content + '</div>';
    }
    var core = s.units.filter(function (u) { return u.role === 'gemara'; });
    var rashi = s.units.filter(function (u) { return u.role === 'rashi'; });
    content = '<details class="ck-layer ck-talmud" open><summary>גמרא · Gemara — ברכות <bdi dir="ltr">18a–18b</bdi></summary>' + core.map(function (u) { return pair(u, english); }).join('') + '</details>';
    content += '<details class="ck-layer ck-gemara-rashi" data-reading-role="compiled-rashi"><summary>רש״י — נוסח החק · Rashi in the daily compilation</summary>' + rashi.map(function (u) { return pair(u, english); }).join('') + '</details>';
    content += notes(s.rashiFullSupplement.units) + '<details class="ck-layer ck-rashi-full-supplement" data-reading-role="optional-complete-rashi"><summary>רש״י — פירוש מלא, לימוד רשות · Complete Rashi, optional study</summary>' + s.rashiFullSupplement.units.map(function (u) { return pair(u, english); }).join('') + '</details>';
    return '<div data-qualified-daily="lech-sunday" data-daily-section="talmud">' + notes(s.units) + content + '</div>';
  }
  function reading(week, day, section, english, loader) {
    if (week !== 'לך לך' || day !== 'יום ראשון' || ['talmud', 'zohar'].indexOf(section) < 0) return Promise.resolve(null);
    return load(loader).then(function (p) { return render(p, section, english); });
  }
  window.ChokLechSunday = { reading: reading };
})();
