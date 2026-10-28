/* Qualified daily presentation only. No source acquisition or automatic admission.
 * Registry entries are selected, owner-bound authority; payload schema is not authority.
 * No default entries: all existing daily adapters retain ownership until selected.
 */
(function (host) {
  'use strict';
  var LANGUAGES = ['he', 'en', 'both', 'original'];
  var MODES = ['full', 'nikud', 'taamim', 'letters'];
  var SECTIONS = ['torah', 'navi', 'kesuvim', 'mishna', 'talmud', 'zohar', 'halacha', 'mussar', 'prayers', 'kavanos', 'breslov'];
  var GATES = ['original', 'english', 'explanation', 'sourceUse', 'selection'];
  var HASH = /^[a-f0-9]{64}$/;
  function fail(reason) { throw Error('Qualified daily reading: ' + reason); }
  function object(o) { if (!o || typeof o !== 'object' || Array.isArray(o)) fail('object required'); }
  function fields(o, names) {
    object(o);
    if (Object.keys(o).sort().join('|') !== names.slice().sort().join('|')) fail('unexpected fields');
  }
  function text(s) { if (typeof s !== 'string' || !s.trim()) fail('complete text required'); }
  function hash(h) { if (typeof h !== 'string' || !HASH.test(h)) fail('digest required'); }
  function list(a) { if (!Array.isArray(a)) fail('array required'); }
  function canonical(x) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return JSON.stringify(x);
    if (typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x);
    if (Array.isArray(x)) return '[' + x.map(canonical).join(',') + ']';
    object(x);
    return '{' + Object.keys(x).sort().map(function (k) { return JSON.stringify(k) + ':' + canonical(x[k]); }).join(',') + '}';
  }
  function equal(a, b) { if (canonical(a) !== canonical(b)) fail('identity mismatch'); }
  function freeze(x) {
    if (x && typeof x === 'object') { Object.keys(x).forEach(function (k) { freeze(x[k]); }); Object.freeze(x); }
    return x;
  }
  function clone(x) { return JSON.parse(canonical(x)); }
  function digest(raw) {
    if (typeof raw !== 'string' || !host.crypto || !host.crypto.subtle) return Promise.reject(Error('Daily authentication unavailable'));
    return host.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (b) {
      return Array.from(new Uint8Array(b)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function checkDigest(value, expected) {
    hash(expected);
    return digest(value).then(function (actual) { if (actual !== expected) fail('digest mismatch'); });
  }
  function pair(p) { fields(p, ['he', 'en']); text(p.he); text(p.en); }
  function gates(g) {
    fields(g, GATES);
    GATES.forEach(function (name) {
      fields(g[name], ['decision', 'evidenceSHA256']);
      if (g[name].decision !== 'accepted') fail('unadmitted ' + name);
      hash(g[name].evidenceSHA256);
    });
  }
  function unitPlan(p) {
    fields(p, ['owner', 'ref', 'role', 'status', 'originalSHA256', 'englishSHA256', 'explanationSHA256', 'notesSHA256', 'edition', 'provenanceSHA256', 'admission']);
    text(p.owner); text(p.ref); text(p.role); text(p.edition); hash(p.provenanceSHA256); gates(p.admission);
    if (p.status !== 'complete' && p.status !== 'source-empty') fail('held unit');
    if (p.status === 'source-empty') {
      if (p.role !== 'bartenura' || p.originalSHA256 !== null || p.englishSHA256 !== null || p.explanationSHA256 !== null) fail('invalid empty obligation');
    } else [p.originalSHA256, p.englishSHA256, p.explanationSHA256].forEach(hash);
    hash(p.notesSHA256);
  }
  function sectionPlan(s, name) {
    fields(s, ['disposition', 'reference', 'extent', 'title', 'units', 'pairs', 'prescribedRashi', 'optionalRashi', 'admission']);
    pair(s.title); object(s.reference); object(s.extent); gates(s.admission);
    list(s.units); list(s.pairs); list(s.prescribedRashi); list(s.optionalRashi);
    if (s.disposition !== 'prescribed' && s.disposition !== 'not-prescribed') fail('held section');
    if (s.disposition === 'not-prescribed') {
      if (s.units.length || s.pairs.length || s.prescribedRashi.length || s.optionalRashi.length) fail('invented non-prescribed body');
      return;
    }
    if (!s.units.length) fail('missing prescribed body');
    var owners = new Set();
    s.units.forEach(function (u) { unitPlan(u); if (owners.has(u.owner)) fail('duplicate owner'); owners.add(u.owner); });
    var ordered = [];
    if (name === 'mishna') {
      if (!s.pairs.length || s.prescribedRashi.length || s.optionalRashi.length) fail('missing Mishna pairing');
      s.pairs.forEach(function (r) {
        fields(r, ['ref', 'mishna', 'bartenura']); text(r.ref);
        var m = s.units.find(function (u) { return u.owner === r.mishna; });
        var b = s.units.find(function (u) { return u.owner === r.bartenura; });
        if (!m || !b || m.role !== 'mishna' || b.role !== 'bartenura' || m.ref !== r.ref || b.ref !== r.ref) fail('wrong commentary owner');
        ordered.push(m.owner, b.owner);
      });
    } else if (name === 'talmud') {
      if (s.pairs.length) fail('unexpected pairing');
      s.units.forEach(function (u) {
        if (u.role === 'gemara') ordered.push(u.owner);
        else if (u.role !== 'prescribed-rashi' && u.role !== 'optional-rashi') fail('invalid talmud role');
      });
      if (!ordered.length) fail('missing Gemara');
      ['prescribedRashi', 'optionalRashi'].forEach(function (group) {
        s[group].forEach(function (owner) {
          var u = s.units.find(function (v) { return v.owner === owner; });
          if (!u || u.role !== (group === 'prescribedRashi' ? 'prescribed-rashi' : 'optional-rashi')) fail('wrong Rashi role');
          ordered.push(owner);
        });
      });
    } else {
      if (s.pairs.length || s.prescribedRashi.length || s.optionalRashi.length) fail('unexpected apparatus');
      ordered = s.units.map(function (u) { return u.owner; });
    }
    equal(ordered, s.units.map(function (u) { return u.owner; }));
  }
  function entry(e) {
    fields(e, ['week', 'day', 'key', 'url', 'payloadSHA256', 'schedule', 'scheduleSHA256', 'sections', 'admission']);
    text(e.week); text(e.day);
    if (e.week.indexOf('|') >= 0 || e.day.indexOf('|') >= 0 || e.key !== e.week + '|' + e.day) fail('wrong daily key');
    if (typeof e.url !== 'string' || !/^\/reader\/chok\/[a-z0-9][a-z0-9\/-]*\.json$/.test(e.url) || e.url.indexOf('..') >= 0) fail('local payload required');
    hash(e.payloadSHA256); hash(e.scheduleSHA256); object(e.schedule); object(e.sections); gates(e.admission);
    var names = Object.keys(e.sections); if (!names.length) fail('empty admission');
    names.forEach(function (name) {
      if (SECTIONS.indexOf(name) < 0) fail('unknown section');
      sectionPlan(e.sections[name], name);
      var field = name === 'talmud' ? 'gemara' : name;
      if (['torah', 'navi', 'kesuvim', 'mishna', 'gemara', 'zohar', 'halacha', 'mussar'].indexOf(field) >= 0) {
        var prescribed = Object.prototype.hasOwnProperty.call(e.schedule, field) && e.schedule[field] !== null;
        if (prescribed !== (e.sections[name].disposition === 'prescribed')) fail('prescription mismatch');
      }
    });
    var allOwners = new Set();
    names.forEach(function (name) { e.sections[name].units.forEach(function (u) { if (allOwners.has(u.owner)) fail('cross-section owner'); allOwners.add(u.owner); }); });
    return freeze(clone(e));
  }
  function note(n, u, seen, checks) {
    fields(n, ['id', 'owner', 'role', 'placement', 'he', 'en', 'sourceTextSHA256', 'span']);
    text(n.id); text(n.he); text(n.en);
    if (seen.has(n.id) || n.owner !== u.owner || ['meaning-qualification', 'source-qualification', 'printed-note', 'glyph-qualification'].indexOf(n.role) < 0 || n.placement !== 'outside-source-disclosure') fail('invalid mandatory note');
    seen.add(n.id);
    if (u.he === null) {
      if (n.sourceTextSHA256 !== null || n.span !== null || n.role !== 'source-qualification') fail('invalid empty-source note');
    } else {
      fields(n.span, ['start', 'end', 'endExclusive', 'unit']);
      if (!Number.isInteger(n.span.start) || !Number.isInteger(n.span.end) || n.span.start < 0 || n.span.end <= n.span.start || n.span.end > Array.from(u.he).length || n.span.endExclusive !== true || n.span.unit !== 'unicode-codepoint') fail('invalid note span');
      checks.push(checkDigest(u.he, n.sourceTextSHA256));
    }
  }
  function validate(p, expected) {
    fields(p, ['schema', 'key', 'week', 'day', 'scheduleSHA256', 'sections']);
    if (p.schema !== 'chok-qualified-daily-v1' || p.key !== expected.key || p.week !== expected.week || p.day !== expected.day || p.scheduleSHA256 !== expected.scheduleSHA256) fail('wrong payload owner');
    fields(p.sections, Object.keys(expected.sections));
    var checks = [], seen = new Set();
    Object.keys(expected.sections).forEach(function (name) {
      var plan = expected.sections[name], s = p.sections[name];
      fields(s, ['disposition', 'reference', 'extent', 'units']);
      equal(s.disposition, plan.disposition); equal(s.reference, plan.reference); equal(s.extent, plan.extent);
      list(s.units); if (s.units.length !== plan.units.length) fail('incomplete section');
      s.units.forEach(function (u, i) {
        var wanted = plan.units[i];
        fields(u, ['owner', 'ref', 'role', 'status', 'he', 'en', 'explanation', 'notes']);
        ['owner', 'ref', 'role', 'status'].forEach(function (key) { if (u[key] !== wanted[key]) fail('wrong unit identity'); });
        list(u.notes);
        if (u.status === 'source-empty') {
          if (u.he !== null || u.en !== null || u.explanation !== null || !u.notes.length) fail('empty obligation must retain its qualification');
        } else {
          text(u.he); text(u.en); fields(u.explanation, ['title', 'paragraphs']); pair(u.explanation.title);
          list(u.explanation.paragraphs); if (!u.explanation.paragraphs.length) fail('missing distinct explanation');
          u.explanation.paragraphs.forEach(pair);
          if (u.explanation.paragraphs.map(function (v) { return v.en; }).join('\n\n') === u.en || u.explanation.paragraphs.map(function (v) { return v.he; }).join('\n\n') === u.he) fail('explanation duplicates source');
          checks.push(checkDigest(u.he, wanted.originalSHA256), checkDigest(u.en, wanted.englishSHA256), checkDigest(canonical(u.explanation), wanted.explanationSHA256));
        }
        u.notes.forEach(function (n) { note(n, u, seen, checks); });
        checks.push(checkDigest(canonical(u.notes), wanted.notesSHA256));
      });
    });
    return Promise.all(checks).then(function () { return freeze(p); });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
  function shown(field, language) {
    if (field === 'original') return language !== 'original';
    if (field === 'untouched') return language === 'original';
    if (field === 'explanation') return language !== 'original';
    if (field === 'he') return language === 'he' || language === 'both';
    return language === 'en' || language === 'both';
  }
  function boldSource(value) {
    var parts = String(value).split(/(<\/?b>)/g), depth = 0;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '<b>') depth++;
      else if (parts[i] === '</b>') { if (!depth) return esc(value); depth--; }
      else if (/[<>]/.test(parts[i])) return esc(value);
    }
    if (depth) return esc(value);
    return parts.map(function (part) { return part === '<b>' || part === '</b>' ? part : esc(part); }).join('');
  }
  function field(value, kind, language, boldCarrier) {
    var he = kind === 'he' || kind === 'original' || kind === 'untouched';
    // Only exact, source-qualified <b> carriers are presentation markup.
    // Unknown, attribute-bearing or unbalanced carriers stay escaped text.
    var displayed = boldCarrier === true ? boldSource(value) : esc(value);
    return '<div class="ck-daily-' + kind + '" data-daily-field="' + kind + '" lang="' + (he ? 'he' : 'en') + '" dir="' + (he ? 'rtl' : 'ltr') + '" style="white-space:pre-wrap"' + (shown(kind, language) ? '' : ' hidden') + '>' + displayed + '</div>';
  }
  function licenseNote(n) {
    return n.role === 'source-qualification' && /https:\/\/creativecommons\.org\/licenses\//.test(n.en);
  }
  function creditText(value) {
    var out = '', end = 0;
    String(value).replace(/https:\/\/[^\s<>"']+/g, function (url, offset) {
      out += esc(value.slice(end, offset)) + '<a href="' + esc(url) + '">' + esc(url) + '</a>';
      end = offset + url.length;
      return url;
    });
    return out + esc(value.slice(end));
  }
  function mandatory(units, licenses) {
    return units.map(function (u) { return u.notes.filter(function (n) { return licenseNote(n) === !!licenses; }).map(function (n) {
      return '<aside class="ck-source-qualification" data-daily-note="' + esc(n.id) + '" data-note-owner="' + esc(u.owner) + '" data-field-role="' + esc(n.role) + '"><p lang="he" dir="rtl">' + (licenses ? creditText(n.he) : esc(n.he)) + '</p><p lang="en" dir="ltr">' + (licenses ? creditText(n.en) : esc(n.en)) + '</p></aside>';
    }).join(''); }).join('');
  }
  function sourceCredits(units) {
    var credit = mandatory(units, true);
    return credit ? '<details class="ck-source-credits"><summary>מקורות ורישיון · Sources and licence</summary>' + credit + '</details>' : '';
  }
  function body(u, language, mode, transform, commentary, boldCarrier) {
    if (u.status === 'source-empty') return '';
    var transformed = transform(u.he, mode); if (typeof transformed !== 'string') fail('invalid source transform');
    return '<article class="ck-daily-unit" data-reading-unit="' + esc(u.owner) + '" data-reading-ref="' + esc(u.ref) + '" data-field-role="' + esc(u.role) + '">' +
      field(transformed, 'original', language, boldCarrier) + field(u.he, 'untouched', language, boldCarrier) + field(u.en, 'en', language) +
      '<details class="ck-daily-explanation" data-daily-field="explanation" open' + (commentary && shown('explanation', language) ? '' : ' hidden') + '><summary>' + esc(u.explanation.title.he) + ' · ' + esc(u.explanation.title.en) + '</summary>' +
      u.explanation.paragraphs.map(function (p) { return field(p.he, 'he', language) + field(p.en, 'en', language); }).join('') + '</details></article>';
  }
  function render(packet, expected, section, options) {
    var s = packet.sections[section], plan = expected.sections[section];
    if (s.disposition === 'not-prescribed') return '';
    var lang = options.language, html = '', units = new Map(s.units.map(function (u) { return [u.owner, u]; }));
    function show(owner) {
      var u = units.get(owner);
      // Qualification comes from the selected section/role, never a day or owner list.
      var boldCarrier = section === 'mishna' && u.role === 'bartenura';
      return body(u, lang, options.mode, options.transform, options.commentary, boldCarrier);
    }
    if (section === 'mishna') {
      plan.pairs.forEach(function (r) {
        html += '<section data-mishna-owner="' + esc(r.mishna) + '"><h4>' + esc(r.ref) + '</h4>' + show(r.mishna) +
          mandatory([units.get(r.mishna)]) + '<section class="ck-daily-bartenura" data-commentary-owner="' + esc(r.mishna) + '"' + (options.commentary ? '' : ' hidden') + '><h5>ברטנורא · Bartenura</h5>' + show(r.bartenura) + '</section>' + mandatory([units.get(r.bartenura)]) + '</section>';
      });
    } else if (section === 'talmud') {
      s.units.filter(function (u) { return u.role === 'gemara'; }).forEach(function (u) { html += show(u.owner); });
      if (plan.prescribedRashi.length) html += '<section data-reading-role="prescribed-rashi"><h4>רש״י · Rashi</h4>' + plan.prescribedRashi.map(show).join('') + '</section>';
      if (options.commentary && options.optionalRashi && plan.optionalRashi.length) html += '<details data-reading-role="optional-rashi"><summary>רש״י נוסף · Additional Rashi</summary>' + plan.optionalRashi.map(show).join('') + '</details>';
    } else s.units.forEach(function (u) { html += show(u.owner); });
    var controls = LANGUAGES.map(function (l, i) {
      return '<button type="button" data-ck-daily-language="' + l + '" aria-pressed="' + (l === lang) + '">' + ['עברית', 'English + original', 'עברית + English', 'מקור ללא שינוי · Untouched original'][i] + '</button>';
    }).join('');
    // Deliberately not ck-source-island/ck-he/ck-en/ck-explanation: the existing
    // global applyLanguages consumer and original-mode CSS must not own this island.
    // Study notes remain outside optional source disclosures; legal credits have their own panel.
    return '<div class="ck-qualified-daily" data-qualified-daily="' + esc(expected.key) + '" data-daily-section="' + section + '" data-daily-language="' + lang + '" data-daily-commentary="' + (options.commentary ? 'on' : 'off') + '"><header><h3>' + esc(plan.title.he) + ' · ' + esc(plan.title.en) + '</h3><div role="group" aria-label="Source language">' + controls + '</div></header>' + html + (section === 'mishna' ? '' : mandatory(s.units)) + sourceCredits(s.units) + '</div>';
  }
  function setLanguage(island, language) {
    if (LANGUAGES.indexOf(language) < 0) fail('invalid language');
    island.setAttribute('data-daily-language', language);
    island.querySelectorAll('[data-daily-field]').forEach(function (node) { var field = node.getAttribute('data-daily-field'); node.hidden = !shown(field, language) || (field === 'explanation' && island.getAttribute('data-daily-commentary') === 'off'); });
    island.querySelectorAll('[data-ck-daily-language]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.getAttribute('data-ck-daily-language') === language)); });
  }
  function bind(root) {
    if (!root || typeof root.addEventListener !== 'function') fail('event root required');
    if (bound.has(root)) return; bound.add(root);
    root.addEventListener('click', function (event) {
      var button = event.target && event.target.closest && event.target.closest('[data-ck-daily-language]');
      var island = button && button.closest('.ck-qualified-daily');
      if (!island) return;
      setLanguage(island, button.getAttribute('data-ck-daily-language'));
    });
  }
  var bound = new WeakSet();
  function create(selectedEntries) {
    list(selectedEntries);
    var index = new Map(), pending = new Map();
    selectedEntries.forEach(function (candidate) { var e = entry(candidate); if (index.has(e.key)) fail('duplicate day'); index.set(e.key, e); });
    function find(week, day) { return index.get(week + '|' + day); }
    function has(week, day, section) { var e = find(week, day); return !!(e && Object.prototype.hasOwnProperty.call(e.sections, section)); }
    function load(week, day, scheduled, loader) {
      var e = find(week, day); if (!e) return Promise.resolve(null);
      return Promise.resolve().then(function () {
        equal(scheduled, e.schedule);
        return checkDigest(canonical(scheduled), e.scheduleSHA256);
      }).then(function () {
        if (!pending.has(e.key)) {
          var request = Promise.resolve().then(function () {
            if (typeof loader !== 'function') fail('queued raw loader required');
            return loader(e.url + '?v=' + e.payloadSHA256);
          }).then(function (raw) {
            return checkDigest(raw, e.payloadSHA256).then(function () { return validate(JSON.parse(raw), e); });
          });
          var guarded = request.catch(function (error) { if (pending.get(e.key) === guarded) pending.delete(e.key); throw error; });
          pending.set(e.key, guarded);
        }
        return pending.get(e.key);
      });
    }
    function reading(week, day, section, options, loader, scheduled) {
      if (!has(week, day, section)) return Promise.resolve(null);
      // Copy at invocation, before even the first promise continuation.
      var captured = options && Object.assign({}, options);
      return Promise.resolve().then(function () {
        fields(captured, ['language', 'mode', 'commentary', 'optionalRashi', 'transform']);
        if (LANGUAGES.indexOf(captured.language) < 0 || MODES.indexOf(captured.mode) < 0 || typeof captured.commentary !== 'boolean' || typeof captured.optionalRashi !== 'boolean' || typeof captured.transform !== 'function') fail('invalid display context');
        return load(week, day, scheduled, loader).then(function (p) { return render(p, find(week, day), section, captured); });
      });
    }
    return Object.freeze({has:has, load:load, reading:reading});
  }
  var api = Object.freeze({create:create, bind:bind, setLanguage:setLanguage, canonical:canonical});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.ChokQualifiedDaily = api;
})(typeof window !== 'undefined' ? window : globalThis);
