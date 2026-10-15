/* Qualified verse-local Breslov access. Canonical bodies are never edited.
 * Assign only a printed main verseRef and explicit apparatus owner_main_id.
 * Documentary after_pair locators are retained; necessary notes are displayed
 * as owner-local siblings OUTSIDE that owner's closed body, in source order. */
(function () {
  'use strict';
  var LECH='/reader/chumash-lh/part-1/torah-3.json';
  var PROJECTIONS='/reader/chok/lech-lichuh-breslov-projections.json';
  var PINS={};
  PINS[LECH]='23045e573d6c66d971cc4c0e444b5a2526ad2abf540456225f48431a53812eaa';
  PINS[PROJECTIONS]='bc538f1cb338b813eb9a4f97e27bedf714ca3fbc55d851f5a483ad7da41af5c3';
  var selections={}, pending;
  function esc(x) { return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function digest(raw) { return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0');}).join('');}); }
  function read(url,loader) { return loader(url+'?v='+PINS[url]).then(function(raw){return digest(raw).then(function(hash){if(hash!==PINS[url])throw Error('Breslov source changed');return JSON.parse(raw);});}); }
  // Validate every qualification, not just the first verse/day's visible notes.
  function validate(source, projection, lech) {
    var rows=lech?projection.rows:projection.notes, byId={}, checks=[], count=0;
    if(!Array.isArray(rows))throw Error('Missing Breslov qualifications');
    rows.forEach(function(q){if(byId[q.id])throw Error('Duplicate Breslov qualification');byId[q.id]=q;});
    var units={};
    source.units.forEach(function(u){
      if(units[u.id] || !Array.isArray(u.pairs) || !u.pairs.length || !Array.isArray(u.qualifications))throw Error('Incomplete Breslov owner');
      units[u.id]=u;
      var pairIds={};
      u.pairs.forEach(function(p){if(pairIds[p.id] || typeof p.he!=='string' || !p.he || typeof p.en!=='string' || !p.en)throw Error('Incomplete Breslov pair');pairIds[p.id]=true;});
      u.qualifications.forEach(function(q){
        var row=byId[q.id];count++;
        if(!row || row.owner!==u.id || q.owner!==u.id || row.pair_id!==q.pair_id || row.placement!==q.placement ||
           (q.placement==='after_pair'&&!pairIds[q.pair_id]) || (q.placement!=='after_pair'&&q.placement!=='after_owner') ||
           (lech?row.before:row.sourceText)!==q.text)throw Error('Breslov qualification owner/pair/placement changed');
        var text=lech?row.after:row.displayText;
        if(typeof text!=='string'||!text)throw Error('Missing Breslov qualification text');
        checks.push(Promise.all([digest(q.text),digest(text)]).then(function(h){if(h[0]!== (lech?row.beforeSHA256:row.sourceTextSHA256) || h[1]!== (lech?row.afterSHA256:row.displayTextSHA256))throw Error('Breslov qualification text changed');}));
        if(lech){
          if(!Array.isArray(row.pairs)||row.pairs.length!==u.pairs.length)throw Error('Missing Breslov pair bindings');
          u.pairs.forEach(function(p,i){var b=row.pairs[i];if(!b||b.id!==p.id)throw Error('Breslov pair order changed');checks.push(Promise.all([digest(p.he),digest(p.en)]).then(function(h){if(h[0]!==b.heSHA256||h[1]!==b.enSHA256)throw Error('Breslov pair body changed');}));});
        }
      });
    });
    source.units.forEach(function(u){if(u.sourceKind!=='main' && u.owner_main_id!==null && (!units[u.owner_main_id]||units[u.owner_main_id].sourceKind!=='main'))throw Error('Invalid Breslov apparatus owner');});
    if(count!==rows.length || (source.globalQualifications||[]).length)throw Error('Breslov qualification coverage changed');
    if(lech){
      if(projection.sourceSHA256!==PINS[LECH] || projection.sourceURL!==LECH || projection.scopeBefore!==source.scopeNotice || !projection.scopeAfter)throw Error('Breslov scope changed');
      checks.push(Promise.all([digest(source.scopeNotice),digest(projection.scopeAfter)]).then(function(h){if(h[0]!==projection.scopeBeforeSHA256||h[1]!==projection.scopeAfterSHA256)throw Error('Breslov scope binding changed');}));
    }
    return Promise.all(checks).then(function(){return {source:source,notes:byId,scope:lech?projection.scopeAfter:'Optional weekly teachings and printed notes. Some small letters and vowel points are uncertain; the alternatives appear beside their passages.',key:lech?'lech-lichuh':'noach'};});
  }
  function load(loader,noach,notes) {
    if(!pending)pending=Promise.all([validate(noach,notes,false),Promise.all([read(LECH,loader),read(PROJECTIONS,loader)]).then(function(r){return validate(r[0],r[1],true);})]).then(function(r){selections={'נח':r[0],'לך לך':r[1]};return true;}).catch(function(e){pending=null;selections={};throw e;});
    return pending;
  }
  function languages() { return '<nav class="ck-source-languages" aria-label="Source language">'+[['he','עברית'],['en','English'],['both','Both']].map(function(x){return '<button type="button" data-ck-source-lang="'+x[0]+'" aria-pressed="'+(x[0]==='both')+'">'+x[1]+'</button>';}).join('')+'</nav>'; }
  function scope(s) {return '<aside class="ck-source-qualification" data-breslov-scope="'+s.key+'" lang="en" dir="ltr">'+esc(s.scope)+'</aside>';}
  function owner(u,s,namespace) {
    var label=u.sourceKind==='main'?'Teaching':u.sourceKind==='note'?'Printed note':u.sourceKind==='title-metadata'?'Source title':'Compiler aside';
    if(u.printedNoteNumber!=null)label+=' '+u.printedNoteNumber;
    if(u.verseRef)label+=' — Genesis '+u.verseRef.chapter+':'+u.verseRef.verse;
    var body=u.pairs.map(function(p,i){return '<div class="ck-source-pair" data-pair-id="'+esc(p.id)+'" data-pair-ordinal="'+i+'"><small class="ck-reading-ref" dir="ltr">'+(i+1)+'</small><div class="ck-he" lang="he" dir="rtl">'+esc(p.he)+'</div><div class="ck-en" lang="en" dir="ltr">'+esc(p.en)+'</div></div>';}).join('');
    var q=u.qualifications.map(function(q){var row=s.notes[q.id],ordinal=u.pairs.findIndex(function(p){return p.id===q.pair_id;});
      return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" data-note-owner="'+esc(u.id)+'" data-note-pair="'+esc(q.pair_id===null?'null':q.pair_id)+'" data-note-placement="'+esc(q.placement)+'" data-note-display-placement="owner-local" lang="en" dir="ltr">'+(q.placement==='after_pair'?'<small>Passage '+(ordinal+1)+'</small> ':'')+'<span data-note-text>'+esc(row.after===undefined?row.displayText:row.after)+'</span></aside>';
    }).join('');
    return '<article class="ck-breslov-owner" data-bop-unit="'+esc(u.id)+'" data-source-kind="'+esc(u.sourceKind)+'" data-owner-main-id="'+esc(u.owner_main_id===null?'null':u.owner_main_id)+'" data-verse-ref="'+esc(JSON.stringify(u.verseRef))+'"><details class="ck-layer ck-qualified-disclosure" id="ck-bop-'+esc(s.key+'-'+namespace+'-'+u.id)+'"><summary>'+esc(label)+'</summary>'+body+'</details>'+q+'</article>';
  }
  function mapped(source,slug,chapter,verse) {
    var mains=source.units.filter(function(u){return u.sourceKind==='main' && u.verseRef && u.verseRef.book===slug.replace(/^tanach-/,'') && u.verseRef.chapter===chapter && u.verseRef.verse===verse;});
    return mains.reduce(function(out,m){return out.concat([m],source.units.filter(function(u){return u.sourceKind!=='main' && u.owner_main_id===m.id;}));},[]);
  }
  function verse(week,slug,chapter,verse) {
    var s=selections[week];if(!s)return '';
    var units=mapped(s.source,slug,chapter,verse);if(!units.length)return '';
    return '<details class="ck-layer ck-verse-breslov ck-source-island" data-language="both" data-language-key="breslov-'+s.key+'-inline-'+chapter+'-'+verse+'"><summary>ברסלב לפסוק זה · Breslov on this verse</summary>'+scope(s)+languages()+units.map(function(u){return owner(u,s,'inline-'+chapter+'-'+verse);}).join('')+'</details>';
  }
  function supplement(s) {
    var sup=s.source.sourceSupplement;if(!sup)return '';
    return '<details class="ck-layer ck-breslov-supplement"><summary>מקורות נוספים לשבוע נח · Separate weekly readings</summary><p dir="ltr">These readings are separate from the compiler’s anthology. Genesis 6:8 is the closing verse of Biraishis.</p>'+sup.segments.map(function(x,i){return '<article data-supplement-segment="'+i+'"><h4>'+esc(x.title)+'</h4><a href="'+esc(x.sourceUrl)+'">'+esc(x.sourceRef)+'</a><div class="ck-he" dir="rtl" lang="he">'+esc(x.he)+'</div><div class="ck-en" dir="ltr" lang="en">'+esc(x.en)+'</div>'+(x.commentary?'<aside class="ck-supplement-gematria"><h4>גימטריא · Supplemental gematria</h4><div class="ck-he" dir="rtl">'+esc(x.commentary.he)+'</div><div class="ck-en" dir="ltr">'+esc(x.commentary.en)+'</div></aside>':'')+'</article>';}).join('')+'</details>';
  }
  function weekly(week) {
    var s=selections[week||'נח'];if(!s)return '';
    // Individual context panels preserve canonical order even when unowned
    // metadata is interspersed among mapped mains. They never enter verse().
    var bodies=s.source.units.map(function(u){
      var main=u.sourceKind==='main'?u:s.source.units.find(function(m){return m.sourceKind==='main'&&m.id===u.owner_main_id;});
      var html=owner(u,s,'weekly');
      return main&&main.verseRef?html:'<details class="ck-layer ck-weekly-unowned"><summary>לימוד שבועי ללא פסוק מסוים · Weekly context without a verse assignment</summary>'+html+'</details>';
    }).join('');
    var pdf=s.source.pdfSource?'<details class="ck-layer ck-facsimile"><summary>תצלום המקור · Source PDF</summary><a href="'+esc(s.source.pdfSource)+'" target="_blank" rel="noopener">Read / open PDF</a> · <a href="'+esc(s.source.pdfSource)+'" download>Download PDF</a></details>':'';
    return '<section class="ck-section" data-sec="breslov" id="ck-breslov-week-'+s.key+'"><details class="ck-layer ck-breslov ck-source-island" data-language="both" data-language-key="breslov-'+s.key+'-weekly"><summary>ברסלב על הפרשה — '+esc(week||'נח')+' · Breslov on the Parsha</summary>'+scope(s)+languages()+bodies+supplement(s)+pdf+'</details></section>';
  }
  window.ChokVerseBreslov={load:load,verse:verse,weekly:weekly,validate:validate,mapped:mapped};
})();
