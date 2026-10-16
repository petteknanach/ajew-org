/* Owned source adapter for Chok. Raw sources and qualifications are immutable.
 * Only hash-bound reader-normal note projections are displayed. No acquisition.
 * Tuesday enhancements remain confined to their qualified key; typed Noach is
 * an optional weekly offering, never an invented daily prescription. */
(function () {
  'use strict';
  var PINS = {
    '/reader/chok/noach-tuesday.json': 'cc1a3f8ae3dc25215bc655cad65ba90374a106e3a5780983f562dd00c5f04cd2',
    '/reader/chok/noach-source-notes.json': '3c55e03dbdbbb935786debe80d6b3e17af27be56fb154381a1d515fd5514f56b',
    '/reader/chumash-lh/part-1/torah-2.json': '948c86e763be5c270d46206a36d0d4d7ab459264ac7b930bd36499c85a92894b',
    '/reader/chok/noach-week.json': '736b386986536586f0a79af1080d95a73467e5824cf3bfad5fefd03d5d0559d6'
  };
  var packet, noach, notes, pending, weekPacket;
  var languagePreferences = {};
  try { languagePreferences=JSON.parse(localStorage.getItem('chok-source-languages')||'{}'); } catch (_) {}
  function preference(key) { var x=languagePreferences[key];return ['he','en','both'].indexOf(x)<0?'both':x; }
  function applyLanguages(root) {
    root.querySelectorAll('.ck-source-island').forEach(function (island) {
      var key=island.getAttribute('data-language-key'), language=preference(key);
      island.setAttribute('data-language',language);
      island.querySelectorAll('.ck-he,.ck-en').forEach(function (t) { t.hidden=language!=='both'&&!t.classList.contains(language==='he'?'ck-he':'ck-en'); });
      island.querySelectorAll('[data-ck-source-lang]').forEach(function (b) { b.setAttribute('aria-pressed',String(b.getAttribute('data-ck-source-lang')===language)); });
    });
  }
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function rich(x) {
    // Empty provider commentary anchors are markup, not recited characters.
    var source=String(x).replace(/<i\b(?=[^>]*\bdata-commentator\s*=)[^>]*>\s*<\/i\s*>/gi,'');
    return esc(source).replace(/&lt;(\/?)(b|i)&gt;/g, '<$1$2>').replace(/&lt;small&gt;/g, '<span class="ck-classical-gloss" data-source-role="classical-context">').replace(/&lt;\/small&gt;/g, '</span>');
  }
  function targumText(x) {
    // Imported bold emphasis is not part of the recited Aramaic.
    return rich(String(x == null ? '' : x).replace(/<\/?(?:b|strong)\b[^<>]*>/gi, ''));
  }
  function digest(raw) { return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2,'0'); }).join(''); }); }
  function read(url, rawLoader) { return rawLoader(url + '?v=' + PINS[url]).then(function (raw) { return digest(raw).then(function (hash) { if (hash !== PINS[url]) throw Error('Source changed'); return JSON.parse(raw); }); }); }
  function validateMeaningNote(row, q) {
    var span=q && q.sourceSpanCodepoints;
    if (!q || typeof q.id!=='string' || !q.id || typeof q.he!=='string' || !q.he || typeof q.en!=='string' || !q.en ||
        (q.owner!==undefined && q.owner!==row.id) || q.sourceBodySHA256!==row.sourceTextSHA256 || !Array.isArray(span) || span.length!==2 ||
        !Number.isInteger(span[0]) || !Number.isInteger(span[1]) || span[0]<0 || span[1]<=span[0] ||
        span[1]>Array.from(row.he).length || Array.from(row.he).slice(span[0],span[1]).join('')!==q.anchor) throw Error('Meaning note source binding changed');
  }
  function validatePair(u, newlyQualified) {
    if (!u || typeof u.id!=='string' || !u.id || typeof u.ref!=='string' || !u.ref || typeof u.he!=='string' || !u.he || typeof u.en!=='string' || !u.en || !Array.isArray(u.displayMeaningNotes)) throw Error('Incomplete daily translation or qualification');
    if (newlyQualified) {
      var originalNotes=u.notes || u.meaningNotes;
      if (!Array.isArray(originalNotes) || originalNotes.length!==u.displayMeaningNotes.length || originalNotes.some(function (n,i) {
        var q=u.displayMeaningNotes[i];return !n || !q || n.id!==q.id || n.anchor!==q.anchor || n.he!==q.he || n.en!==q.en ||
          (n.owner!==undefined && n.owner!==q.owner) || (n.sourceSHA256!==undefined && n.sourceSHA256!==q.sourceBodySHA256) ||
          (n.startCodepoint!==undefined && n.startCodepoint!==q.sourceSpanCodepoints[0]) || (n.endCodepoint!==undefined && n.endCodepoint!==q.sourceSpanCodepoints[1]);
      }) || (u.source && u.source.currentOriginalSHA256!==u.sourceTextSHA256)) throw Error('Source qualification alias changed');
    }
    return Promise.all([digest(u.he),digest(u.en)].concat(u.displayMeaningNotes.map(function (q) {
      if (typeof q==='string') { if (newlyQualified) throw Error('Missing bilingual meaning note'); return; }
      validateMeaningNote(u,q);
      if (newlyQualified && (q.owner!==u.id || !q.heSHA256 || !q.enSHA256)) throw Error('Missing meaning note owner or digest');
      return Promise.all([digest(q.he),digest(q.en)]).then(function (hashes) {
        if ((q.heSHA256 && hashes[0]!==q.heSHA256) || (q.enSHA256 && hashes[1]!==q.enSHA256)) throw Error('Meaning note body changed');
      });
    }))).then(function (hashes) {
      if (hashes[0]!==u.sourceTextSHA256 || hashes[1]!==u.englishTextSHA256) throw Error('Daily pair binding changed');
      if (newlyQualified && ((u.original!==undefined && (u.original!==u.he || u.originalSHA256!==hashes[0])) ||
          (u.english!==undefined && (u.english!==u.en || u.englishSHA256!==hashes[1])))) throw Error('Source alias binding changed');
    });
  }
  function sundaySuccessor(week,day) {
    var s=weekSection(week,day,'zohar');
    if (!s || !s.readingBasis) return null;
    if (week!=='נח' || day!=='יום ראשון' || s.readingBasis!=='complete-classical-daily-successor' || s.completeOriginal!==true ||
        s.reference!=='Zohar I 59b; I 60a' || s.sourceJoinSeparator!==' ' || !Array.isArray(s.units) || s.units.length!==3 ||
        !s.parentPublicQualification || s.parentPublicQualification.sourceAndFullEnglishRatified!==true ||
        s.units.some(function (u,i) { return u.id!=='noach-sunday-zohar-'+(i+1) || u.folio!==(i===0?'59b':'60a'); })) throw Error('Unqualified Sunday source');
    return s;
  }
  function load(rawLoader) {
    if (typeof rawLoader!=='function') return Promise.reject(Error('Shared source loader unavailable'));
    if (!pending) pending = Promise.all(Object.keys(PINS).map(function (url) {
      var optional=url==='/reader/chok/noach-source-notes.json'||url==='/reader/chumash-lh/part-1/torah-2.json';
      // Only the supplementary anthology is optional. Daily source validation
      // below remains mandatory and is not converted to an empty valid reading.
      var request=Promise.resolve().then(function(){return read(url,rawLoader);});
      return optional?request.then(function(value){return {value:value};},function(error){return {error:error};}):request;
    })).then(function (rows) {
      packet=rows[0];notes=rows[1].value;noach=rows[2].value;weekPacket=rows[3];
      var noachError=rows[1].error||rows[2].error;
      if (!noachError && (!noach || !Array.isArray(noach.units) || noach.units.length!==18 || !notes || !Array.isArray(notes.notes) || notes.notes.length!==49 || notes.sourceSHA256!==PINS['/reader/chumash-lh/part-1/torah-2.json'])) noachError=Error('Supplementary Noach source identity mismatch');
      if (packet.schema !== 'chok-source-bound-tuesday/v1' || packet.key !== 'נח|יום שלישי' || packet.masters.length !== 51 ||
          weekPacket.schema!=='chok-noach-week/v1' || Object.keys(weekPacket.days).length!==7) throw Error('Source identity mismatch');
      if (!sundaySuccessor('נח','יום ראשון')) throw Error('Missing complete Sunday source');
      var rashiCounts={'נח|יום שני':8,'נח|יום רביעי':9,'נח|יום שישי':6};
      return Promise.all(Object.keys(weekPacket.days).map(function (key) {
        var sections=weekPacket.days[key].sections;
        return Promise.all(['talmud','halacha','mussar','zohar'].map(function (section) {
          var s=sections[section];if (!s || (section==='zohar' && !s.readingBasis)) return;
          if (s.completeOriginal!==true || !Array.isArray(s.units) || !s.units.length) throw Error('Incomplete daily source');
          var newlyQualified=!!s.parentPublicQualification;
          if (newlyQualified && s.parentPublicQualification.sourceAndFullEnglishRatified!==true) throw Error('Unqualified complete source');
          if (section==='talmud' && rashiCounts[key] && (!newlyQualified || s.trailingRashiAvailable!==true || s.units.filter(function (u) { return u.role==='rashi'; }).length!==rashiCounts[key])) throw Error('Incomplete trailing Rashi');
          if (s.rashiReadingQualification && (typeof s.rashiReadingQualification.he!=='string' || !s.rashiReadingQualification.he || typeof s.rashiReadingQualification.en!=='string' || !s.rashiReadingQualification.en)) throw Error('Incomplete Rashi reading qualification');
          var extra=s.rashiFullSupplement;
          if (extra && (key!=='נח|יום שני' || section!=='talmud' || extra.completeOriginal!==true || extra.optional!==true || extra.initiallyClosed!==true ||
              extra.title!=='רש״י — פירוש מלא · Complete Rashi commentary' || !Array.isArray(extra.units) || extra.units.length!==9 || extra.units.some(function (u) { return u.role!=='rashi'; }))) throw Error('Incomplete supplementary Rashi');
          if (key==='נח|יום שני' && section==='talmud' && !extra) throw Error('Missing supplementary Rashi');
          return Promise.all(s.units.concat(extra?extra.units:[]).map(function (u) { return validatePair(u,newlyQualified && (section==='zohar' || u.role==='rashi')); }));
        }));
      })).then(function () { return window.ChokVerseBreslov.load(rawLoader,noach,notes,noachError); });
    }).catch(function (e) { pending=null;packet=noach=notes=weekPacket=null;throw e; });
    return pending;
  }
  function isTuesday(week, day) { return packet && week + '|' + day === packet.key; }
  function weekSection(week, day, section) { var d=weekPacket && weekPacket.days[week+'|'+day]; return d && d.sections[section]; }
  function weekUnit(week, day, section, ref, original) {
    var s=weekSection(week,day,section), u=s && s.units.find(function (u) { return u.ref===ref; });
    if (u && original!==undefined && u.he!==original) throw Error('Week source binding changed');
    return u;
  }
  function meaningNotes(row, projectString) {
    return (row && row.displayMeaningNotes || []).map(function (q,i) {
      var attributes=' data-note-owner="'+esc(row.id)+'" data-meaning-note="'+i+'"';
      // Existing string projections keep their exact historical markup.
      if (typeof q==='string') {
        var text=typeof projectString==='function'?projectString(q):q;
        return text?'<aside class="ck-source-qualification"'+attributes+' lang="en" dir="ltr">'+esc(text)+'</aside>':'';
      }
      validateMeaningNote(row,q);var span=q.sourceSpanCodepoints;
      return '<aside class="ck-source-qualification"'+attributes+' data-note-id="'+esc(q.id)+'" data-source-sha256="'+esc(q.sourceBodySHA256)+'" data-source-span="'+esc(JSON.stringify(span))+'"><p lang="he" dir="rtl">'+esc(q.he)+'</p><p lang="en" dir="ltr">'+esc(q.en)+'</p></aside>';
    }).join('');
  }
  function weekReading(week,day,section,enabled) {
    var s=weekSection(week,day,section);if (!s) return '';
    var labels={bonus:'משנה נוספת לסיום כל המשנה — לימוד רשות · To finish the entire Mishna — optional study',mishna:'משנה · Mishna',talmud:'גמרא · Gemara',halacha:'הלכה · Halacha',mussar:'מוסר · Mussar',zohar:'זוהר · Zohar'};
    if (!labels[section]) throw Error('Unknown reading section');
    var classical=['talmud','halacha','mussar','zohar'].indexOf(section)!==-1;
    if (classical && (s.completeOriginal!==true || !s.units.length || s.units.some(function (u) { return !u.he || !u.en || !u.sourceTextSHA256 || !u.englishTextSHA256 || !Array.isArray(u.displayMeaningNotes); }))) throw Error('Incomplete bilingual source reading');
    function body(rows,kind,label) { return '<details class="ck-layer ck-'+kind+'"'+(kind==='mishna'||kind==='halacha'?' open':'')+'><summary>'+label+'</summary>'+rows.map(function (u) { return '<div class="ck-reading-unit" data-reading-unit="'+esc(u.id)+'"><h4 dir="ltr">'+esc(u.ref)+'</h4>'+(u.sourceExtent==='full-classical-seif-with-gloss'?'<p class="ck-reading-ref" data-source-role="classical-context" dir="ltr">Complete classical paragraph with gloss</p>':'')+pair(u,enabled)+(classical?'':meaningNotes(u))+'</div>'; }).join('')+'</details>'; }
    var base=s.units.filter(function (u) { return u.role!=='rashi'; }), commentary=s.units.filter(function (u) { return u.role==='rashi'; });
    var extra=s.rashiFullSupplement;
    var legalNotice='This daily excerpt is not the complete legal subsection or all Rema glosses, and is not a personal practical ruling.';
    var legalNoticeSeen=false;
    function sectionNotes(u) {
      return meaningNotes(u,section==='halacha'?function (text) {
        if (text.indexOf(legalNotice)!==0) return text;
        var display=legalNoticeSeen?text.slice(legalNotice.length).replace(/^ /,''):text;
        legalNoticeSeen=true;return display;
      }:null);
    }
    var q=classical?s.units.filter(function (u) { return !s.parentPublicQualification || u.role!=='rashi'; }).map(sectionNotes).join(''):'';
    if (s.rashiReadingQualification) q+='<aside class="ck-source-qualification" data-rashi-reading-qualification><p lang="he" dir="rtl">'+esc(s.rashiReadingQualification.he)+'</p><p lang="en" dir="ltr">'+esc(s.rashiReadingQualification.en)+'</p></aside>';
    if (s.displaySelectionQualification) q+='<aside class="ck-source-qualification" dir="ltr">'+esc(s.displaySelectionQualification)+'</aside>';
    var reference=typeof s.reference==='string'?s.reference:Array.isArray(s.reference)?s.reference.join('; '):'';
    var h=q+body(base,section,labels[section]+(classical&&reference?' — '+esc(reference):''));
    if (commentary.length) h+=body(commentary,'gemara-rashi','רש״י על הגמרא · Rashi on Gemara')+(s.parentPublicQualification?commentary.map(meaningNotes).join(''):'');
    if (extra) h+='<details class="ck-layer ck-rashi-full-supplement" data-reading-role="optional-complete-rashi"><summary>'+esc(extra.title)+'</summary><p class="ck-reading-ref" lang="he" dir="rtl">לימוד רשות</p><p class="ck-reading-ref" lang="en" dir="ltr">Optional study</p>'+extra.units.map(function (u) { return '<div class="ck-reading-unit" data-reading-unit="'+esc(u.id)+'"><h4 dir="rtl">'+esc(u.ref)+'</h4>'+pair(u,enabled)+'</div>'; }).join('')+'</details>'+extra.units.map(meaningNotes).join('');
    if (section==='talmud' && s.trailingRashiAvailable===false) h+=unavailable('gemara-rashi');
    return h;
  }
  function sundayZohar(week,day,enabled) {
    var s=sundaySuccessor(week,day);if (!s) return null;
    var lastFolio='';
    var source=s.units.map(function (u) {
      var marker=u.folio!==lastFolio?'<small class="ck-reading-ref" data-zohar-folio="'+esc(u.folio)+'" dir="ltr">I '+esc(u.folio)+'</small> ':'';
      lastFolio=u.folio;
      return marker+'<span data-zohar-source-fragment data-source-unit="'+esc(u.id)+'" data-source-sha256="'+esc(u.sourceTextSHA256)+'">'+esc(u.he)+'</span>';
    }).join(s.sourceJoinSeparator);
    // One daily reading, not numbered extraction parts. Notes cannot collapse
    // with its original or disappear when the reader changes languages.
    return s.units.map(meaningNotes).join('')+'<details class="ck-layer ck-zohar ck-ratified-zohar" data-field-role="original-source"><summary>זוהר — נוסח המקור · Original source — '+esc(s.reference)+'</summary><div class="ck-zohar-line ck-original" lang="he" dir="rtl" style="white-space:pre-wrap">'+source+'</div></details>'+english(s.units.map(function (u) { return u.en; }).join(' '),enabled,'Zohar English translation');
  }
  function unavailable(section) {
    var labels={talmud:'גמרא · Gemara',halacha:'הלכה · Halacha',mussar:'מוסר · Mussar','gemara-rashi':'רש״י על הגמרא · Rashi on Gemara'};
    return '<aside class="ck-source-qualification ck-body-unavailable" data-unavailable-body="'+esc(section)+'"><p dir="rtl" lang="he">'+labels[section]+' — נוסח המקור לקריאת היום אינו זמין כאן.</p><p dir="ltr" lang="en">'+labels[section]+' — The source text for this day’s reading is unavailable here.</p></aside>';
  }
  function unit(section, ref) { return packet && packet.sections[section] && packet.sections[section].sourceUnits.find(function (u) { return u.ref === ref; }); }
  function bound(section, ref, original) {
    var row=unit(section,ref); if (row && row.he !== original) throw Error('Daily source binding changed'); return row;
  }
  function english(text, enabled, label) { return enabled && text ? '<div class="ck-en-line" dir="ltr" lang="en">' + (label ? '<small>'+esc(label)+'</small> ' : '') + rich(text) + '</div>' : ''; }
  function pair(row, enabled, cls) { return '<article class="ck-complete-pair '+(cls||'')+'" data-source-unit="'+esc(row.id)+'" data-source-sha256="'+esc(row.sourceTextSHA256)+'"><div class="ck-original" lang="he" dir="rtl">'+rich(row.he)+'</div>'+english(row.en,enabled,'English translation')+'</article>'; }
  function rashi(ref, originals, enabled) {
    var rows=packet.sections.rashi.sourceUnits.filter(function (u) { return u.ref===ref; });
    if (!rows.length) return '';
    if (!originals || rows.length!==originals.length || rows.some(function (u,i) { return u.he!==originals[i]; })) throw Error('Rashi binding changed');
    return '<details class="ck-layer ck-rashi"><summary>רש״י · Rashi</summary>'+rows.map(function (u) { return pair(u,enabled); }).join('')+'</details>';
  }
  function targum(row, enabled, torah) {
    if (!row) return '';
    var translation=english(row.en,enabled,'Targum English translation');
    if (torah && translation) translation='<details class="ck-layer ck-onkelos-translation"><summary>אונקלוס — תרגום לאנגלית · English translation</summary>'+translation+'</details>';
    return '<div class="ck-targum-reading" data-source-unit="'+esc(row.id)+'"><h4>'+ (torah ? 'אונקלוס — המקור הארמי · Onkelos' : 'תרגום — המקור הארמי · Targum')+'</h4><div class="ck-targum-line" lang="he" dir="rtl">'+targumText(row.he)+'</div>'+ (row.heTranslation ? '<details class="ck-layer ck-onkelos-translation"><summary>אונקלוס — תרגום לעברית</summary><div class="ck-he-translation" dir="rtl">'+esc(row.heTranslation)+'</div></details>' : '') + translation+'</div>'+meaningNotes(row)+(row.displayNotes||[]).map(function (q) { return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" dir="ltr" lang="en">'+esc(q.displayText)+'</aside>'; }).join('');
  }
  function nachTargum(section, ref) { return packet.nachTargum.find(function (u) { return u.sectionId===section && u.ref===ref; }); }
  function mishnaHelp(s, u, enabled) {
    var h=(s.notes||[]).filter(function (n) { return n.sourceUnitIds.indexOf(u.id)!==-1; }).map(function (n) {
      var he=n.explanation.he, en=n.explanation.en;
      // Exact display-only projection of the method-oriented final clause.
      if (n.id==='m2') { he=he.replace('זו הצגת המחלוקת; אין כאן הכרעה מעשית מטעמנו.','אלו דעות שונות במחלוקת.'); en=en.replace('This explains the disagreement; it is not our practical ruling.','These are differing legal opinions.'); }
      return '<details class="ck-layer ck-mishna-explanation" data-note-owner="'+esc(u.id)+'"><summary>'+esc(n.title.he)+' · '+esc(n.title.en)+'</summary><div dir="rtl" lang="he">'+esc(he)+'</div>'+english(en,enabled)+'</details>';
    }).join('');
    var questions=(s.questions||[]).filter(function (q) { return q.sourceUnitIds.indexOf(u.id)!==-1; });
    if (questions.length) h+='<details class="ck-layer ck-mishna-questions" data-question-owner="'+esc(u.id)+'"><summary>שאלות ותשובות · Questions and answers</summary>'+questions.map(function (q) { return '<h4 dir="rtl">'+esc(q.question.he)+'</h4>'+english(q.question.en,enabled)+'<div dir="rtl">'+esc(q.answer.he)+'</div>'+english(q.answer.en,enabled); }).join('')+'</details>';
    return h;
  }
  function reading(section, enabled) {
    var s=packet.sections[section];if (!s) return '';
    var qualification='';
    if (section==='talmud') qualification='<aside class="ck-source-qualification" dir="ltr">Two excerpts: Yevamos 20a:12–15, then 21a:12–13. The intervening discussion is not part of this reading.</aside>';
    if (section==='halacha') qualification='<aside class="ck-source-qualification" dir="ltr">The seven compilation clauses correspond to Yoreh De’ah 160:1–4, 160:8 and 170:1–2. The smaller glosses are complete classical context alongside the compiler’s abbreviated daily quotation. This is financial-law study, not personal advice or approval of a transaction.</aside>';
    if (section==='mishna') { var family=s.qualifications[1]; qualification='<aside class="ck-source-qualification" data-qualification-role="family-law"><p lang="he" dir="rtl">'+esc(family.he)+'</p><p lang="en" dir="ltr">'+esc(family.en)+'</p></aside>'; }
    var base=s.sourceUnits.filter(function (u) { return u.role!=='rashi'; });
    var commentary=s.sourceUnits.filter(function (u) { return u.role==='rashi'; });
    return qualification+'<details class="ck-layer ck-'+section+'"'+(section==='mishna'||section==='halacha'?' open':'')+'><summary>'+esc(s.title.he)+' · '+esc(s.sourceRef && s.sourceRef.en || s.title.en)+'</summary><p class="ck-reading-ref" dir="rtl">'+esc(s.sourceRef && s.sourceRef.he || '')+'</p>'+base.map(function (u) {
      var h='<div class="ck-reading-unit" data-reading-unit="'+esc(u.id)+'"><h4 class="ck-reading-ref" dir="ltr">'+esc(u.ref)+'</h4>'+pair(u,enabled);
      if (section==='mishna') {
        var q=u.translationProvenance && u.translationProvenance.evidence.readerVisibleQualification;
        if (q) {
          var he=q.he,en=q.en;
          if (u.id==='m-9') { he=he.replace('אלו הסברי העזר, לא מילים שנוספו למקור.','זהו ביאור ברטנורא, לא לשון המשנה.'); en=en.replace('These are editorial explanations, not words added to the original.',"Bartenura's explanation, not the Mishna's wording."); }
          h+='<aside class="ck-source-qualification" data-qualification-role="classical-commentary-condition" data-qualification-owner="'+esc(u.id)+'" data-source-sha256="'+esc(u.sourceTextSHA256)+'"><p lang="he" dir="rtl">'+esc(he)+'</p><p lang="en" dir="ltr">'+esc(en)+'</p></aside>';
        }
        h+=mishnaHelp(s,u,enabled);
      }
      if (u.explanation) h+='<details class="ck-layer ck-explanation"><summary>הסבר · Explanation</summary><div dir="rtl">'+esc(u.explanation.he)+'</div>'+english(u.explanation.en,enabled)+'</details>';
      return h+'</div>';
    }).join('')+(section==='mishna'?'<details class="ck-layer ck-mishna-terms"><summary>מונחי המשנה · Mishna terms</summary>'+(s.glossary||[]).map(function (g) { return '<h4 dir="rtl">'+esc(g.term)+'</h4><div dir="rtl">'+esc(g.definition.he)+'</div>'+english(g.definition.en,enabled); }).join('')+'</details>':'')+(commentary.length?'<details class="ck-layer ck-gemara-rashi"><summary>רש״י על הגמרא · Rashi on Gemara</summary>'+commentary.map(function (u) { return '<h4 dir="ltr">'+esc(u.ref)+'</h4>'+pair(u,enabled); }).join('')+'</details>':'')+'</details>';
  }
  function languages() { return '<nav class="ck-source-languages" aria-label="Source language">'+[['he','עברית'],['en','English'],['both','Both']].map(function (x) { return '<button type="button" data-ck-source-lang="'+x[0]+'" aria-pressed="'+(x[0]==='both')+'">'+x[1]+'</button>'; }).join('')+'</nav>'; }
  function native(level, section, always) {
    var rows=packet.masters.filter(function (u) { return u.level===level && u.sectionId===section; });
    if (!rows.length) return '';
    var label=level==='general'?'תפלות וכוונות כלליות · General learning':level==='weekly'?'כוונות חק — סדר השבוע · Weekly intentions':'תפלות וכוונות לחלק זה · Prayers and intentions';
    return '<details class="ck-layer ck-native-group ck-source-island" data-language="both" data-language-key="native-'+esc(level+'-'+section)+'"'+(always?' open':'')+'><summary>'+label+'</summary>'+languages()+rows.map(function (u) {
      var role=u.kind==='prayer'?'תפלה · Prayer':u.kind==='instruction'?'הוראת לימוד · Learning instruction':u.kind==='overview'?'סקירה · Overview':'כוונה · Intention';
      return '<details class="ck-layer ck-native-owner" data-native-owner="'+esc(u.id)+'" data-native-kind="'+esc(u.kind)+'"'+(always?' open':'')+'><summary>'+role+' — '+esc(u.title.he)+' · '+esc(u.title.en)+'</summary><article class="ck-native-pair"><div class="ck-he ck-original" dir="rtl" lang="he">'+esc(u.he)+'</div><div class="ck-en ck-en-line" dir="ltr" lang="en">'+esc(u.en)+'</div></article></details>'+u.displayNotes.map(function (q) { return '<aside class="ck-source-qualification" data-native-note-owner="'+esc(u.id)+'" data-note-id="'+esc(q.id)+'" dir="ltr" lang="en">'+esc(q.displayText)+'</aside>'; }).join('');
    }).join('')+'</details>';
  }
  function globalQualification() { var q=packet.globalQualificationProjection; return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" data-note-owner="'+esc(q.owner)+'" data-note-placement="'+esc(q.placement)+'" data-source-sha256="'+esc(q.sourceTextSHA256)+'" dir="ltr">'+esc(q.displayText)+'</aside>'; }
  function overview(always) { return '<section class="ck-section ck-native-overview" data-sec="learning">'+globalQualification()+native('general','general',always)+native('weekly','weekly',always)+'<p><a href="/reader/chok/tefillos/">תפלות לפני הלימוד · Prayers</a> · <a href="/reader/chok/kavanos/">כוונות הלימוד · Learning intentions</a></p></section>'; }
  function weekly(week) { return window.ChokVerseBreslov.weekly(week); }
  function verseAccess(slug, chapter, verse, week) {
    var h='<nav class="ck-verse-access" aria-label="Verse and Parsha"><a href="/reader/'+esc(slug)+'/1/'+chapter+'/#seg-'+verse+'">הפסוק בפרק · Verse in chapter</a>';
    var parsha=window.ChokVerseBreslov.parsha(week);
    if (parsha) h+=' · <a href="/parsha/'+esc(parsha)+'/">הפרשה · Full Parsha</a>';
    h+=' · <a href="/reader/tikkun/?b='+esc(slug)+'&amp;c='+chapter+'&amp;view=verses">שנים מקרא · Shnayim Mikra</a>';
    // Source bodies are full-width siblings of this compact navigation rail.
    return h+'</nav>'+window.ChokVerseBreslov.verse(week,slug,chapter,verse);
  }
  document.addEventListener('click', function (event) {
    var b=event.target && event.target.closest('[data-ck-source-lang]'), island=b && b.closest('.ck-source-island');
    if (island) {
      var language=b.getAttribute('data-ck-source-lang');if (['he','en','both'].indexOf(language)<0) return;
      languagePreferences[island.getAttribute('data-language-key')]=language;
      try { localStorage.setItem('chok-source-languages',JSON.stringify(languagePreferences)); } catch (_) {}
      island.setAttribute('data-language',language);
      island.querySelectorAll('.ck-he,.ck-en').forEach(function (t) { t.hidden=language!=='both' && !t.classList.contains(language==='he'?'ck-he':'ck-en'); });
      island.querySelectorAll('[data-ck-source-lang]').forEach(function (t) { t.setAttribute('aria-pressed',String(t===b)); });
    }
    var link=event.target && event.target.closest('[data-ck-open-source]');
    if (!link) return;
    var target=document.getElementById(link.getAttribute('data-ck-open-source'));
    if (!target) return;
    for (var el=target;el;el=el.parentElement) if (el.tagName==='DETAILS') el.open=true;
  });
  window.ChokSources={load:load,richText:rich,targumText:targumText,isTuesday:isTuesday,unit:unit,bound:bound,english:english,rashi:rashi,targum:targum,nachTargum:nachTargum,reading:reading,native:native,overview:overview,weekly:weekly,verseAccess:verseAccess,applyLanguages:applyLanguages,weekUnit:weekUnit,weekSection:weekSection,weekReading:weekReading,sundayZohar:sundayZohar,meaningNotes:meaningNotes,unavailable:unavailable,globalQualification:globalQualification};
})();
