/* Owned source adapter for Chok. Raw sources and qualifications are immutable.
 * Only hash-bound reader-normal note projections are displayed. No acquisition.
 * Tuesday enhancements remain confined to their qualified key; typed Noach is
 * an optional weekly offering, never an invented daily prescription. */
(function () {
  'use strict';
  var PINS = {
    '/reader/chok/noach-tuesday.json': 'cc1a3f8ae3dc25215bc655cad65ba90374a106e3a5780983f562dd00c5f04cd2',
    '/reader/chok/noach-source-notes.json': 'ad4e08beded1c460a9185377328969ee78371a0b8e78b46eb1533ba5fdfce2c5',
    '/reader/chumash-lh/part-1/torah-2.json': '829f0365b0e69674399da81b7bdc62bc53d91694d66e761b72510a6c08147ff5',
    '/reader/chok/noach-week.json': '9eff7e09efa1a24b69da770d269d776a5252949a55b71c6cd12577e81db2978b'
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
  function digest(raw) { return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2,'0'); }).join(''); }); }
  function read(url, rawLoader) { return rawLoader(url + '?v=' + PINS[url]).then(function (raw) { return digest(raw).then(function (hash) { if (hash !== PINS[url]) throw Error('Source changed'); return JSON.parse(raw); }); }); }
  function load(rawLoader) {
    if (typeof rawLoader!=='function') return Promise.reject(Error('Shared source loader unavailable'));
    if (!pending) pending = Promise.all(Object.keys(PINS).map(function (url) { return read(url,rawLoader); })).then(function (rows) {
      packet=rows[0];notes=rows[1];noach=rows[2];weekPacket=rows[3];
      if (packet.schema !== 'chok-source-bound-tuesday/v1' || packet.key !== 'נח|יום שלישי' || packet.masters.length !== 51 ||
          noach.units.length !== 18 || notes.notes.length !== 49 || notes.sourceSHA256 !== PINS['/reader/chumash-lh/part-1/torah-2.json'] || weekPacket.schema!=='chok-noach-week/v1' || Object.keys(weekPacket.days).length!==7) throw Error('Source identity mismatch');
      return Promise.all(Object.keys(weekPacket.days).map(function (key) {
        var sections=weekPacket.days[key].sections;
        return Promise.all(['talmud','halacha','mussar'].map(function (section) {
          var s=sections[section];if (!s) return;
          if (s.completeOriginal!==true || !s.units.length) throw Error('Incomplete daily source');
          return Promise.all(s.units.map(function (u) {
            if (!u.he || !u.en || !Array.isArray(u.displayMeaningNotes)) throw Error('Incomplete daily translation or qualification');
            return Promise.all([digest(u.he),digest(u.en)]).then(function (hashes) {
              if (hashes[0]!==u.sourceTextSHA256 || hashes[1]!==u.englishTextSHA256) throw Error('Daily pair binding changed');
            });
          }));
        }));
      })).then(function () { return true; });
    }).catch(function (e) { pending=null; throw e; });
    return pending;
  }
  function isTuesday(week, day) { return packet && week + '|' + day === packet.key; }
  function weekSection(week, day, section) { var d=weekPacket && weekPacket.days[week+'|'+day]; return d && d.sections[section]; }
  function weekUnit(week, day, section, ref, original) {
    var s=weekSection(week,day,section), u=s && s.units.find(function (u) { return u.ref===ref; });
    if (u && original!==undefined && u.he!==original) throw Error('Week source binding changed');
    return u;
  }
  function meaningNotes(row) {
    return (row && row.displayMeaningNotes || []).map(function (q,i) {
      var attributes=' data-note-owner="'+esc(row.id)+'" data-meaning-note="'+i+'"';
      // Existing string projections keep their exact historical markup.
      if (typeof q==='string') return '<aside class="ck-source-qualification"'+attributes+' lang="en" dir="ltr">'+esc(q)+'</aside>';
      var span=q && q.sourceSpanCodepoints;
      if (!q || typeof q.id!=='string' || !q.id || typeof q.he!=='string' || !q.he || typeof q.en!=='string' || !q.en ||
          q.sourceBodySHA256!==row.sourceTextSHA256 || !Array.isArray(span) || span.length!==2 ||
          !Number.isInteger(span[0]) || !Number.isInteger(span[1]) || span[0]<0 || span[1]<=span[0] ||
          span[1]>Array.from(row.he).length || Array.from(row.he).slice(span[0],span[1]).join('')!==q.anchor) throw Error('Meaning note source binding changed');
      return '<aside class="ck-source-qualification"'+attributes+' data-note-id="'+esc(q.id)+'" data-source-sha256="'+esc(q.sourceBodySHA256)+'" data-source-span="'+esc(JSON.stringify(span))+'"><p lang="he" dir="rtl">'+esc(q.he)+'</p><p lang="en" dir="ltr">'+esc(q.en)+'</p></aside>';
    }).join('');
  }
  function weekReading(week,day,section,enabled) {
    var s=weekSection(week,day,section);if (!s) return '';
    var labels={bonus:'משנה נוספת — לימוד רשות · Optional bonus Mishna',mishna:'משנה · Mishna',talmud:'גמרא · Gemara',halacha:'הלכה · Halacha',mussar:'מוסר · Mussar',zohar:'זוהר · Zohar'};
    if (!labels[section]) throw Error('Unknown reading section');
    var classical=['talmud','halacha','mussar','zohar'].indexOf(section)!==-1;
    if (classical && (s.completeOriginal!==true || !s.units.length || s.units.some(function (u) { return !u.he || !u.en || !u.sourceTextSHA256 || !u.englishTextSHA256 || !Array.isArray(u.displayMeaningNotes); }))) throw Error('Incomplete bilingual source reading');
    function body(rows,kind,label) { return '<details class="ck-layer ck-'+kind+'"'+(kind==='mishna'||kind==='halacha'?' open':'')+'><summary>'+label+'</summary>'+rows.map(function (u) { return '<div class="ck-reading-unit" data-reading-unit="'+esc(u.id)+'"><h4 dir="ltr">'+esc(u.ref)+'</h4>'+(u.sourceExtent==='full-classical-seif-with-gloss'?'<p class="ck-reading-ref" data-source-role="classical-context" dir="ltr">Complete classical paragraph with gloss</p>':'')+pair(u,enabled)+(classical?'':meaningNotes(u))+'</div>'; }).join('')+'</details>'; }
    var base=s.units.filter(function (u) { return u.role!=='rashi'; }), commentary=s.units.filter(function (u) { return u.role==='rashi'; });
    var q=classical?s.units.map(meaningNotes).join(''):'';
    if (s.displaySelectionQualification) q+='<aside class="ck-source-qualification" dir="ltr">'+esc(s.displaySelectionQualification)+'</aside>';
    var reference=typeof s.reference==='string'?s.reference:Array.isArray(s.reference)?s.reference.join('; '):'';
    var h=q+body(base,section,labels[section]+(classical&&reference?' — '+esc(reference):''));
    if (commentary.length) h+=body(commentary,'gemara-rashi','רש״י על הגמרא · Rashi on Gemara');
    if (section==='talmud' && s.trailingRashiAvailable===false) h+=unavailable('gemara-rashi');
    return h;
  }
  function unavailable(section) {
    var labels={talmud:'גמרא · Gemara',halacha:'הלכה · Halacha',mussar:'מוסר · Mussar','gemara-rashi':'רש״י על הגמרא · Rashi on Gemara'};
    return '<aside class="ck-source-qualification ck-body-unavailable" data-unavailable-body="'+esc(section)+'"><p dir="rtl" lang="he">'+labels[section]+' — נוסח המקור לקריאת היום אינו זמין כאן.</p><p dir="ltr" lang="en">'+labels[section]+' — The source text for this day’s reading is unavailable here.</p></aside>';
  }
  function unit(section, ref) { return packet && packet.sections[section] && packet.sections[section].sourceUnits.find(function (u) { return u.ref === ref; }); }
  function bound(section, ref, original) {
    var row=unit(section,ref); if (row && row.he !== original) throw Error('Daily source binding changed'); return row;
  }
  function english(text, enabled, label) { return enabled && text ? '<div class="ck-en-line" dir="ltr" lang="en">' + (label ? '<small>'+esc(label)+'</small> ' : '') + esc(text) + '</div>' : ''; }
  function pair(row, enabled, cls) { return '<article class="ck-complete-pair '+(cls||'')+'" data-source-unit="'+esc(row.id)+'" data-source-sha256="'+esc(row.sourceTextSHA256)+'"><div class="ck-original" lang="he" dir="rtl">'+rich(row.he)+'</div>'+english(row.en,enabled,'English translation')+'</article>'; }
  function rashi(ref, originals, enabled) {
    var rows=packet.sections.rashi.sourceUnits.filter(function (u) { return u.ref===ref; });
    if (!rows.length) return '';
    if (!originals || rows.length!==originals.length || rows.some(function (u,i) { return u.he!==originals[i]; })) throw Error('Rashi binding changed');
    return '<details class="ck-layer ck-rashi"><summary>רש״י · Rashi</summary>'+rows.map(function (u) { return pair(u,enabled); }).join('')+'</details>';
  }
  function targum(row, enabled, torah) {
    if (!row) return '';
    return '<div class="ck-targum-reading" data-source-unit="'+esc(row.id)+'"><h4>'+ (torah ? 'אונקלוס — המקור הארמי · Onkelos' : 'תרגום — המקור הארמי · Targum')+'</h4><div class="ck-targum-line" lang="he" dir="rtl">'+esc(row.he)+'</div>'+ (row.heTranslation ? '<details class="ck-layer"><summary>אונקלוס — תרגום לעברית</summary><div class="ck-he-translation" dir="rtl">'+esc(row.heTranslation)+'</div></details>' : '') + english(row.en,enabled,'Targum English translation')+'</div>'+meaningNotes(row)+(row.displayNotes||[]).map(function (q) { return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" dir="ltr" lang="en">'+esc(q.displayText)+'</aside>'; }).join('');
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
  function sourceNoteHTML(q) { var row=notes.notes.find(function (x) { return x.id===q.id; }); if (!row || row.sourceText!==q.text || row.pair_id!==q.pair_id || row.placement!==q.placement) throw Error('Breslov qualification binding changed'); return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" data-note-pair="'+esc(q.pair_id)+'" dir="ltr" lang="en">'+esc(row.displayText)+'</aside>'; }
  function ownerHTML(u, namespace) {
    var ref=u.verseRef, label=u.sourceKind==='main'?'Teaching':u.sourceKind==='note'?'Printed note':u.sourceKind==='title-metadata'?'Source title':'Compiler aside';
    if (u.printedNoteNumber!=null) label+=' '+u.printedNoteNumber;
    if (ref) label+=' — Genesis '+ref.chapter+':'+ref.verse;
    var done={};
    var content=u.pairs.map(function (p,i) {
      return '<div class="ck-source-pair" data-pair-id="'+esc(p.id)+'" data-pair-ordinal="'+i+'"><div class="ck-he" lang="he" dir="rtl">'+esc(p.he)+'</div><div class="ck-en" lang="en" dir="ltr">'+esc(p.en)+'</div></div>'+u.qualifications.filter(function (q) { return q.pair_id===p.id && q.placement==='after_pair'; }).map(function (q) { done[q.id]=true;return sourceNoteHTML(q); }).join('');
    }).join('')+u.qualifications.filter(function (q) { return !done[q.id]; }).map(sourceNoteHTML).join('');
    return '<details class="ck-layer ck-qualified-disclosure" id="ck-bop-'+esc(namespace)+'-'+esc(u.id)+'" data-bop-unit="'+esc(u.id)+'" data-source-kind="'+esc(u.sourceKind)+'" data-owner-main-id="'+esc(u.owner_main_id==null?'null':u.owner_main_id)+'" data-verse-ref="'+esc(JSON.stringify(ref))+'"><summary>'+esc(label)+'</summary>'+content+'</details>';
  }
  function weekly() {
    function hasVerse(u) { return u.sourceKind==='main' ? !!u.verseRef : !!noach.units.find(function (m) { return m.id===u.owner_main_id && m.sourceKind==='main' && m.verseRef; }); }
    var mapped=noach.units.filter(hasVerse);
    var unowned=noach.units.filter(function (u) { return !hasVerse(u); });
    var supplement=noach.sourceSupplement;
    var sup=supplement?'<details class="ck-layer ck-breslov-supplement"><summary>מקורות נוספים לשבוע נח · Separate weekly readings</summary><p dir="ltr">These readings are separate from the compiler’s anthology. Genesis 6:8 is the closing verse of Biraishis.</p>'+supplement.segments.map(function (s,i) { return '<article data-supplement-segment="'+i+'"><h4>'+esc(s.title)+'</h4><a href="'+esc(s.sourceUrl)+'">'+esc(s.sourceRef)+'</a><div class="ck-he" dir="rtl" lang="he">'+esc(s.he)+'</div><div class="ck-en" dir="ltr" lang="en">'+esc(s.en)+'</div>'+(s.commentary?'<aside class="ck-supplement-gematria"><h4>גימטריא · Supplemental gematria</h4><div class="ck-he" dir="rtl">'+esc(s.commentary.he)+'</div><div class="ck-en" dir="ltr">'+esc(s.commentary.en)+'</div></aside>':'')+'</article>'; }).join('')+'</details>':'';
    return '<section class="ck-section" data-sec="breslov" id="ck-breslov-week"><details class="ck-layer ck-breslov ck-source-island" data-language="both" data-language-key="breslov-noach"><summary>ברסלב על הפרשה — נח · Breslov on the Parsha</summary><p class="ck-source-qualification" dir="ltr">Optional weekly teachings and printed notes. Some small letters and vowel points are uncertain; the alternatives appear beside their passages.</p>'+languages()+mapped.map(function (u) { return ownerHTML(u,'weekly'); }).join('')+(unowned.length?'<details class="ck-layer ck-weekly-unowned"><summary>לימוד שבועי ללא פסוק מסוים · Weekly context without a verse assignment</summary>'+unowned.map(function (u) { return ownerHTML(u,'weekly'); }).join('')+'</details>':'')+sup+'<details class="ck-layer ck-facsimile"><summary>תצלום המקור · Source PDF</summary><a href="'+esc(noach.pdfSource)+'" target="_blank" rel="noopener">Read / open PDF</a> · <a href="'+esc(noach.pdfSource)+'" download>Download PDF</a></details></details></section>';
  }
  function verseAccess(slug, chapter, verse, week) {
    var h='<nav class="ck-verse-access" aria-label="Verse and Parsha"><a href="/reader/'+esc(slug)+'/1/'+chapter+'/#seg-'+verse+'">הפסוק בפרק · Verse in chapter</a>';
    if (week==='נח') h+=' · <a href="/parsha/noach/">הפרשה · Full Parsha</a>';
    h+=' · <a href="/reader/tikkun/?b='+esc(slug)+'&amp;c='+chapter+'&amp;view=verses">שנים מקרא · Shnayim Mikra</a>';
    // Links follow actual printed main references; notes follow their explicit owner.
    if (week==='נח' && noach) {
      var owners=noach.units.filter(function (u) { return u.sourceKind==='main' && u.verseRef && u.verseRef.book===slug.replace(/^tanach-/,'') && u.verseRef.chapter===chapter && u.verseRef.verse===verse; });
      if (owners.length) h+='<details class="ck-layer ck-verse-breslov ck-source-island" data-language-key="breslov-noach-'+esc(slug)+'-'+chapter+'-'+verse+'"><summary>ברסלב לפסוק זה · Breslov on this verse</summary>'+languages()+owners.map(function (u) { return ownerHTML(u,'inline-'+chapter+'-'+verse)+noach.units.filter(function (n) { return n.owner_main_id===u.id; }).map(function (n) { return ownerHTML(n,'inline-'+chapter+'-'+verse); }).join(''); }).join('')+'</details>';
    }
    return h+'</nav>';
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
  window.ChokSources={load:load,isTuesday:isTuesday,unit:unit,bound:bound,english:english,rashi:rashi,targum:targum,nachTargum:nachTargum,reading:reading,native:native,overview:overview,weekly:weekly,verseAccess:verseAccess,applyLanguages:applyLanguages,weekUnit:weekUnit,weekSection:weekSection,weekReading:weekReading,meaningNotes:meaningNotes,unavailable:unavailable,globalQualification:globalQualification};
})();
