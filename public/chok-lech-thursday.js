/* Exact daily reading; authenticated complete text, translation and explanation. */
(function () {
  'use strict';
  var URL = '/reader/chok/lech-thursday.json';
  var PIN = '1daa33c7d214d8635cccb1065532c97f5254d966caacdf2baf6e79788a2bbb8a';
  var WEEK = 'לך לך', DAY = 'יום חמישי', KEY = WEEK + '|' + DAY, pending;
  function fail() { throw Error('Thursday reading unavailable'); }
  function fields(o, keys) {
    if (!o || typeof o !== 'object' || Array.isArray(o) || Object.keys(o).sort().join('|') !== keys.slice().sort().join('|')) fail();
  }
  function equal(a, b) { fields(a, Object.keys(b)); Object.keys(b).forEach(function (k) { if (a[k] !== b[k]) fail(); }); }
  function text(s) { if (typeof s !== 'string' || !s.trim()) fail(); }
  function pair(p) { fields(p, ['he', 'en']); text(p.he); text(p.en); }
  function list(a, n) { if (!Array.isArray(a) || (n !== undefined && a.length !== n)) fail(); }
  function digest(raw) {
    if (!window.crypto || !window.crypto.subtle) return Promise.reject(Error('Thursday authentication unavailable'));
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (b) {
      return Array.from(new Uint8Array(b)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function explanation(p, paragraphs) {
    if (!paragraphs) return pair(p);
    fields(p, ['paragraphs', 'titleEn', 'titleHe']); text(p.titleEn); text(p.titleHe);
    list(p.paragraphs); if (!p.paragraphs.length) fail(); p.paragraphs.forEach(pair);
  }
  function notes(a, role) {
    list(a); a.forEach(function (n) {
      fields(n, role ? ['he', 'en', 'role'] : ['he', 'en']); text(n.he); text(n.en);
      if (role && n.role !== 'meaning-qualification') fail();
    });
  }
  function qualifications(u, checks) {
    list(u.qualifications); list(u.displayQualifications, u.qualifications.length);
    u.qualifications.forEach(function (n, i) {
      fields(n, ['anchorTextSHA256','en','he','id','noteSHA256','owner','placement','role','sourceTextSHA256','span']);
      text(n.he); text(n.en);
      if (JSON.stringify(n) !== JSON.stringify(u.displayQualifications[i]) || n.owner !== u.ownerId ||
          n.id !== u.ownerId + '-meaning-' + (i + 1) || n.placement !== 'outside-source-disclosure' || n.role !== 'meaning-qualification') fail();
      equal(n.span, {start:0, end:Array.from(u.he).length, endExclusive:true, unit:'unicode-codepoint'});
      [n.anchorTextSHA256,n.sourceTextSHA256,n.noteSHA256].forEach(function (h) { if (!/^[a-f0-9]{64}$/.test(h)) fail(); });
      checks.push(digest(u.he).then(function (h) { if (h !== n.sourceTextSHA256 || h !== n.anchorTextSHA256) fail(); }));
    });
  }
  function unit(u, id, paragraphs, extra) {
    fields(u, ['he','en','id','explanation'].concat(extra || []));
    if (u.id !== id) fail(); text(u.he); text(u.en); explanation(u.explanation, paragraphs);
  }
  function validate(p) {
    fields(p, ['schema','key','mishna','talmud','kabbala']);
    if (p.schema !== 'chok-lech-thursday-v1' || p.key !== KEY) fail();
    var m = p.mishna, t = p.talmud, z = p.kabbala, checks = [];
    fields(m, ['day','presentationOrder','reference','rows','week']);
    if (m.day !== DAY || m.week !== WEEK || JSON.stringify(m.presentationOrder) !== '["mishna","bartenura"]') fail();
    equal(m.reference, {chapter:3, firstMishna:1, lastMishna:6, slug:'mishna-zevachim'}); list(m.rows, 6);
    m.rows.forEach(function (r, i) {
      fields(r, ['bartenura','mishna','ownerId','ref','sequence']);
      var owner = 'yom-chamishi-mishna-mishna-zevachim-3-' + (i + 1);
      if (r.sequence !== i + 1 || r.ref !== 'mishna-zevachim:3:' + (i + 1) || r.ownerId !== owner) fail();
      ['mishna','bartenura'].forEach(function (kind) {
        var u = r[kind]; fields(u, ['displayQualifications','en','explanation','he','ownerId','qualifications']);
        if (u.ownerId !== (kind === 'mishna' ? owner : 'yom-chamishi-bartenura-mishna-zevachim-3-' + (i + 1))) fail();
        text(u.he); text(u.en); explanation(u.explanation, false); qualifications(u, checks);
      });
    });
    fields(t, ['completeRashiSupplement','day','gemara','key','prescribedRashi','reference','titleEn','titleHe','tractateHe']);
    if (t.day !== DAY || t.key !== KEY || t.reference !== 'Zevachim 32a–32b' || t.tractateHe !== 'זבחים') fail();
    text(t.titleHe); text(t.titleEn); unit(t.gemara, 'thursday-gemara', true, ['notes']); notes(t.gemara.notes, false);
    list(t.gemara.explanation.paragraphs, 6);
    fields(t.prescribedRashi, ['titleEn','titleHe','units']); text(t.prescribedRashi.titleEn); text(t.prescribedRashi.titleHe);
    list(t.prescribedRashi.units, 8); t.prescribedRashi.units.forEach(function (u, i) { unit(u, 'thursday-rashi-core-' + (i + 1), true); });
    var s = t.completeRashiSupplement;
    fields(s, ['initiallyClosed','optional','titleEn','titleHe','units']);
    if (s.initiallyClosed !== true || s.optional !== true) fail(); text(s.titleHe); text(s.titleEn); list(s.units, 9);
    s.units.forEach(function (u, i) { unit(u, 'thursday-rashi-full-' + (i + 1), true); });
    fields(z, ['key','week','day','sectionKey','title','reference','continuousDailyBody','units']);
    if (z.key !== KEY || z.week !== WEEK || z.day !== DAY || z.sectionKey !== 'kabbala' || z.continuousDailyBody !== true) fail();
    pair(z.title); equal(z.reference, {work:'Zohar',volume:1,daf:85,amud:1}); list(z.units, 1);
    unit(z.units[0], 'thursday-zohar', false, ['role','notes']);
    if (z.units[0].role !== 'zohar') fail(); notes(z.units[0].notes, true);
    return Promise.all(checks).then(function () { return p; });
  }
  function freeze(o) {
    if (o && typeof o === 'object') { Object.keys(o).forEach(function (k) { freeze(o[k]); }); Object.freeze(o); }
    return o;
  }
  function load(loader) {
    if (!pending) pending = Promise.resolve().then(function () {
      if (typeof loader !== 'function') fail(); return loader(URL + '?v=' + PIN);
    }).then(function (raw) {
      if (typeof raw !== 'string') fail();
      return digest(raw).then(function (h) { if (h !== PIN) fail(); return validate(JSON.parse(raw)).then(freeze); });
    }).catch(function (e) { pending = null; throw e; });
    return pending;
  }
  function schedule(s) {
    if (!s) fail();
    equal(s.mishna, {masechet:'זבחים',perek:3});
    equal(s.gemara, {masechet:'זבחים',daf:32,amud:1});
    equal(s.zohar, {vol:'לך',daf:85,amud:1});
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function bilingual(p, language, role, mode, transform) {
    var out = '', original = role === 'original-source';
    if (original || language !== 'en') {
      var he = original && language !== 'original' ? transform(p.he, mode) : p.he;
      if (typeof he !== 'string') fail();
      out += '<div class="' + (original ? 'ck-original ck-source-original' + (language === 'original' ? ' ck-untouched-original' : '') : 'ck-he') + '" data-source-field="he" lang="he" dir="rtl" style="white-space:pre-wrap">' + esc(he) + '</div>';
    }
    if (language !== 'he' && language !== 'original') out += '<div class="ck-en" data-source-field="en" lang="en" dir="ltr" style="white-space:pre-wrap">' + esc(p.en) + '</div>';
    return out;
  }
  function mandatory(a, owner) {
    return (a || []).map(function (n) {
      // Deliberately outside language filtering and every optional commentary disclosure.
      return '<aside class="ck-source-qualification" data-note-owner="' + esc(owner) + '" data-field-role="meaning-qualification"><p lang="he" dir="rtl">' + esc(n.he) + '</p><p lang="en" dir="ltr">' + esc(n.en) + '</p></aside>';
    }).join('');
  }
  function explain(e, language, mode, transform) {
    if (language === 'original') return '';
    return '<details class="ck-explanation" data-field-role="explanation" open><summary>ביאור · Explanation</summary>' +
      (e.paragraphs || [e]).map(function (p) { return '<div class="ck-source-pair">' + bilingual(p, language, 'explanation', mode, transform) + '</div>'; }).join('') + '</details>';
  }
  function body(u, id, language, mode, transform) {
    return '<article class="ck-source-pair" data-reading-unit="' + esc(id) + '" data-field-role="original-source">' +
      bilingual(u, language, 'original-source', mode, transform) + explain(u.explanation, language, mode, transform) + '</article>';
  }
  function render(p, section, language, commentary, mode, transform) {
    var html = '';
    if (section === 'mishna') {
      html = '<details class="ck-layer ck-mishna" open><summary>משנה — זבחים פרק ג · Mishna</summary>';
      p.mishna.rows.forEach(function (r) {
        html += '<section data-mishna-owner="' + esc(r.ownerId) + '"><h4>משנה <bdi class="ck-generated-ref">' + r.sequence + '</bdi></h4>' + body(r.mishna, r.mishna.ownerId, language, mode, transform);
        html += mandatory(r.mishna.displayQualifications, r.mishna.ownerId) + mandatory(r.bartenura.displayQualifications, r.bartenura.ownerId);
        if (commentary) html += '<details class="ck-bartenura" data-commentary-owner="' + esc(r.ownerId) + '" open><summary>ברטנורא · Bartenura</summary>' + body(r.bartenura, r.bartenura.ownerId, language, mode, transform) + '</details>';
        html += '</section>';
      }); html += '</details>';
    } else if (section === 'talmud') {
      var t = p.talmud;
      html = '<details class="ck-layer ck-talmud" open><summary>גמרא — זבחים לב ע״א–ע״ב · Gemara</summary>' + body(t.gemara, t.gemara.id, language, mode, transform) + '</details>' + mandatory(t.gemara.notes, t.gemara.id);
      html += '<details class="ck-layer ck-gemara-rashi" data-reading-role="prescribed-rashi" open><summary>רש״י · Rashi</summary>' + t.prescribedRashi.units.map(function (u) { return body(u, u.id, language, mode, transform); }).join('') + '</details>';
      if (commentary) html += '<details class="ck-layer ck-rashi-supplement" data-reading-role="optional-rashi"><summary>' + esc(t.completeRashiSupplement.titleHe) + ' · ' + esc(t.completeRashiSupplement.titleEn) + '</summary>' + t.completeRashiSupplement.units.map(function (u) { return body(u, u.id, language, mode, transform); }).join('') + '</details>';
    } else {
      var z = p.kabbala, u = z.units[0];
      html = '<details class="ck-layer ck-zohar" open><summary>זוהר חלק א — פה ע״א · Zohar</summary>' + body(u, u.id, language, mode, transform) + '</details>' + mandatory(u.notes, u.id);
    }
    return '<div class="ck-thursday-reading" data-qualified-daily="lech-thursday" data-daily-section="' + esc(section) + '" data-language="' + language + '">' + html + '</div>';
  }
  function reading(week, day, section, language, commentary, loader, scheduled, mode, transform) {
    if (week !== WEEK || day !== DAY || ['mishna','talmud','zohar'].indexOf(section) < 0) return Promise.resolve(null);
    return Promise.resolve().then(function () {
      if (['he','en','both','original'].indexOf(language) < 0 || typeof commentary !== 'boolean' || ['full','nikud','taamim','letters'].indexOf(mode) < 0 || typeof transform !== 'function') fail();
      schedule(scheduled); return load(loader);
    }).then(function (p) { return render(p, section, language, commentary, mode, transform); });
  }
  window.ChokLechThursday = {reading:reading, load:load};
})();
