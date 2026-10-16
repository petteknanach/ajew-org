/* Qualified verse-local Breslov access. Canonical bodies are never edited.
 * Assign only a printed main verseRef and explicit apparatus owner_main_id.
 * Documentary after_pair locators are retained; necessary notes are displayed
 * as owner-local siblings OUTSIDE that owner's closed body, in source order. */
(function () {
  'use strict';
  var LECH='/reader/chumash-lh/part-1/torah-3.json';
  var PROJECTIONS='/reader/chok/lech-lichuh-breslov-projections.json';
  var PINS={};
  PINS[LECH]='5c9878ffbc5d8afaf7794569b0772710c82d5e4846b3b8e9734f72b08ed6c765';
  PINS[PROJECTIONS]='884a4b47c50f3db030f36733c04b10ade7ffe190f30b708a81906f8df867e8ee';
  var READING_NOTES='/reader/chok/breslov-reading-notes.json';
  PINS[READING_NOTES]='37022dd53e4d005478850ee0b928ba1b1e84d0664982932453f740b2019eb8ef';
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
  // Reader-facing projections are separate from immutable source/provenance.
  // Every note has an explicit, source-bound disposition; no keyword filtering.
  function present(s, policy) {
    var portion=s.key==='noach'?'Noach':'Lech', rows=policy.notes.filter(function(q){return q.portion===portion;}), projected={}, checks=[];
    if(policy.schema!=='chok-breslov-reading-notes/v1' || !policy.scopes[portion] ||
       policy.sources.Noach!=='3c55e03dbdbbb935786debe80d6b3e17af27be56fb154381a1d515fd5514f56b' || policy.sources.Lech!==PINS[PROJECTIONS] ||
       policy.notes.length!==116 || rows.length!==Object.keys(s.notes).length)throw Error('Incomplete Breslov reading-note policy');
    rows.forEach(function(q){
      var original=s.notes[q.id], text=original && (original.after===undefined?original.displayText:original.after);
      if(!original || Object.prototype.hasOwnProperty.call(projected,q.id) || q.owner!==original.owner || q.pair_id!==original.pair_id || q.placement!==original.placement ||
         q.sourceTextSHA256!==(original.beforeSHA256===undefined?original.sourceTextSHA256:original.beforeSHA256) ||
         q.projectionSHA256!==(original.afterSHA256===undefined?original.displayTextSHA256:original.afterSHA256) ||
         (q.readerText!==null && (typeof q.readerText!=='string'||!q.readerText)) || (q.readerText===null && q.readerTextSHA256!==null))throw Error('Breslov reading-note binding changed');
      projected[q.id]=q.readerText;
      checks.push(digest(text).then(function(h){if(h!==q.projectionSHA256)throw Error('Breslov original projection changed');}));
      if(q.readerText!==null)checks.push(digest(q.readerText).then(function(h){if(h!==q.readerTextSHA256)throw Error('Breslov reader note changed');}));
    });
    return Promise.all(checks).then(function(){s.readerNotes=projected;s.scope=policy.scopes[portion];return s;});
  }
  // Routing reservations copied from the authenticated delivered indexes. They
  // identify editions, NOT source owners. Keep the reservation when an index is
  // unreadable: .has() must still suppress the displaced legacy OCR branch.
  // Noach/Lech always use their separate 117-disposition policy, never this path.
  var EDITIONS={
    'qualified-1-109':{'bereishit':'בראשית'},
    'qualified-110-171':{'vayeira':'וירא','chayei-sarah':'חיי שרה','toldot':'תולדות','vayeitzei':'ויצא'},
    'qualified-172-269':{'vayishlach':'וישלח','vayeishev':'וישב','mikeitz':'מקץ','vayigash':'ויגש','vayechi':'ויחי'}
  };
  function emptySelection(key) {return {publicNotes:true,key:key,source:{units:[],globalQualifications:[]},scope:'',readerNotes:{},unavailable:[]};}
  function failed(s,edition,error) {
    s.unavailable=s.unavailable||[];
    s.unavailable.push({edition:edition,reason:String(error&&error.message||error)});
    return s;
  }
  function attempt(fn) {return Promise.resolve().then(fn);}
  function guarded(fn,onError) {return attempt(fn).catch(onError);}
  function sourceUnit(u,slug) {
    if(!u||typeof u.id!=='string'||!u.id||u.parsha!==slug||!Array.isArray(u.pairs)||!u.pairs.length||!Array.isArray(u.qualifications))throw Error('Invalid Breslov source owner');
    var pairs=new Set();
    u.pairs.forEach(function(p){if(!p||typeof p.id!=='string'||!p.id||pairs.has(p.id)||typeof p.he!=='string'||!p.he||typeof p.en!=='string'||!p.en)throw Error('Incomplete Breslov pair');pairs.add(p.id);});
    u.qualifications.forEach(function(q){if(!q||typeof q.id!=='string'||!q.id||typeof q.text!=='string'||!q.text||q.owner!==u.id||
      (q.placement!=='after_owner'&&q.placement!=='after_pair')||(q.placement==='after_pair'&&!pairs.has(q.pair_id)))throw Error('Invalid Breslov qualification');});
  }
  function loadQualified(loader) {
    // All I/O stays on the application's existing shared six-request queue.
    return Promise.all(Object.keys(EDITIONS).map(function(namespace){
      var routes=EDITIONS[namespace], result={};
      Object.keys(routes).forEach(function(slug){result[routes[slug]]=emptySelection(slug);});
      return guarded(function(){
        return loader('/data/breslov-parsha/'+namespace+'/index.json?v=parsha-author-20261016-r2').then(function(raw){
          var index=JSON.parse(raw);
          if(!index||index.schema!=='qualified-parsha-three-consumer-index/v1'||!index.parshas||Array.isArray(index.parshas)||
            index.masterUrl!=='/data/breslov-parsha/'+namespace+'/master.json'||typeof index.revision!=='string'||!index.revision)throw Error('Invalid Breslov index');
          // Discover healthy index membership as before. Reservations are only
          // the authenticated fallback when membership itself cannot be read.
          Object.keys(index.parshas).forEach(function(slug){
            if(slug==='noach'||slug==='lech-lecha')return;
            var c=index.parshas[slug];
            if(c&&typeof c.titleHe==='string'&&c.titleHe&&!Object.prototype.hasOwnProperty.call(routes,slug)){
              routes=Object.assign({},routes);routes[slug]=c.titleHe;result[c.titleHe]=emptySelection(slug);
            }
          });
          return loader(index.masterUrl+'?v='+encodeURIComponent(index.revision)).then(function(raw){
            var master=JSON.parse(raw);
            if(!master||master.schema!=='qualified-parsha-public-master/v1'||!Array.isArray(master.units)||
              (master.apparatus!==undefined&&!Array.isArray(master.apparatus))||typeof master.scopeNotice!=='string'||!master.scopeNotice||
              (master.globalQualifications!==undefined&&!Array.isArray(master.globalQualifications)))throw Error('Invalid Breslov master');
            var byId=new Map();
            master.units.concat(master.apparatus||[]).forEach(function(u){if(!u||!u.id||byId.has(u.id))throw Error('Duplicate Breslov source owner');byId.set(u.id,u);});
            (master.globalQualifications||[]).forEach(function(q){if(!q||typeof q.id!=='string'||typeof q.text!=='string'||!q.text)throw Error('Invalid Breslov global qualification');});
            Object.keys(routes).forEach(function(slug){
              var week=routes[slug];
              try {
                var coverage=index.parshas[slug];
                if(!coverage||coverage.titleHe!==week||!Array.isArray(coverage.mainIds)||!Array.isArray(coverage.apparatusIds))throw Error('Invalid Breslov portion coverage');
                var ids=coverage.mainIds.concat(coverage.apparatusIds);
                if(!ids.length||new Set(ids).size!==ids.length)throw Error('Invalid Breslov portion owner set');
                var selected=ids.map(function(id){var u=byId.get(id);sourceUnit(u,slug);return u;});
                selected.forEach(function(u){var owner=mainOwner(u);if(role(u)!=='main'&&owner!=null&&!selected.some(function(m){return m.id===owner&&role(m)==='main';}))throw Error('Invalid Breslov apparatus owner');});
                // Commit only a fully validated portion, never a partial body.
                var s=result[week];s.source.units=selected;s.source.globalQualifications=master.globalQualifications||[];s.scope=master.scopeNotice;
                selected.forEach(function(u){u.qualifications.forEach(function(q){s.readerNotes[q.id]=q.text;});});
              } catch(e) {failed(result[week],namespace,e);}
            });
          });
        });
      },function(e){Object.keys(result).forEach(function(week){failed(result[week],namespace,e);});}).then(function(){return result;});
    })).then(function(rows){
      var result={};
      rows.forEach(function(row,i){Object.keys(row).forEach(function(week){
        var incoming=row[week],prior=result[week];
        if(!prior){result[week]=incoming;return;}
        if(prior.conflict)return;
        try {
          if(prior.key!==incoming.key)throw Error('Conflicting Breslov portion identity');
          var units=new Map(prior.source.units.map(function(u){return [u.id,u];}));
          incoming.source.units.forEach(function(u){if(units.has(u.id)&&JSON.stringify(units.get(u.id))!==JSON.stringify(u))throw Error('Conflicting Breslov source owner');units.set(u.id,u);});
          var globals=new Map(prior.source.globalQualifications.map(function(q){return [q.id,q];}));
          incoming.source.globalQualifications.forEach(function(q){if(globals.has(q.id)&&JSON.stringify(globals.get(q.id))!==JSON.stringify(q))throw Error('Conflicting Breslov qualification');globals.set(q.id,q);});
          prior.source.units=Array.from(units.values());prior.source.globalQualifications=Array.from(globals.values());
          prior.scope=Array.from(new Set([prior.scope,incoming.scope].filter(Boolean))).join('\n\n');
          prior.readerNotes=Object.assign({},prior.readerNotes,incoming.readerNotes);
          prior.unavailable=prior.unavailable.concat(incoming.unavailable);
        } catch(e) {
          // A contradictory identity has no chosen source authority. Block this
          // portion, not unrelated weeks; do not pick the last response to win.
          result[week]=failed(emptySelection(prior.key),Object.keys(EDITIONS)[i],e);
          result[week].conflict=true;
        }
      });});
      return result;
    });
  }
  function load(loader,noach,notes,noachError) {
    if(!pending)pending=attempt(function(){
      // A policy failure invalidates its two editions, not the qualified ones.
      // Observe each promise immediately, including synchronous validation errors.
      var policy=attempt(function(){return read(READING_NOTES,loader);}).then(function(value){return {value:value};},function(error){return {error:error};});
      function old(key,fn) {
        return guarded(function(){return Promise.all([attempt(fn),policy]).then(function(r){if(r[1].error)throw r[1].error;return present(r[0],r[1].value);});},function(e){return failed(emptySelection(key),'reviewed-'+key,e);});
      }
      return Promise.all([
        old('noach',function(){if(noachError)throw noachError;return validate(noach,notes,false);}),
        old('lech-lichuh',function(){return Promise.all([read(LECH,loader),read(PROJECTIONS,loader)]).then(function(r){return validate(r[0],r[1],true);});}),
        loadQualified(loader)
      ]).then(function(r){selections=Object.assign({},r[2],{'נח':r[0],'לך לך':r[1]});return true;});
    });
    return pending;
  }
  function role(u) {return u.sourceKind||u.source_kind||(u.kind==='apparatus'?'note':u.kind);}
  function mainOwner(u) {return u.owner_main_id==null?u.ownerMainId:u.owner_main_id;}
  function has(week) {return !!selections[week];}
  function parsha(week) {return selections[week]&&selections[week].key==='lech-lichuh'?'lech-lecha':selections[week]&&selections[week].key;}
  function languages() { return '<nav class="ck-source-languages" aria-label="Source language">'+[['he','עברית'],['en','English'],['both','Both']].map(function(x){return '<button type="button" data-ck-source-lang="'+x[0]+'" aria-pressed="'+(x[0]==='both')+'">'+x[1]+'</button>';}).join('')+'</nav>'; }
  function scope(s) {return '<aside class="ck-source-qualification" data-breslov-scope="'+esc(s.key)+'" lang="en" dir="ltr">'+esc(s.scope)+'</aside>'+(s.source.globalQualifications||[]).map(function(q){return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" dir="ltr" lang="en">'+esc(q.text)+'</aside>';}).join('');}
  function owner(u,s,namespace) {
    var label=role(u)==='main'?'Teaching':role(u)==='note'?'Printed note':['title','title-metadata'].indexOf(role(u))>=0?'Source title':['aside','compiler-aside','compiler_aside'].indexOf(role(u))>=0?'Compiler aside':'Printed apparatus';
    if(u.printedNoteNumber!=null)label+=' '+u.printedNoteNumber;
    if(u.verseRef)label+=' — Genesis '+u.verseRef.chapter+':'+u.verseRef.verse;
    var body=u.pairs.map(function(p,i){return '<div class="ck-source-pair" data-pair-id="'+esc(p.id)+'" data-pair-ordinal="'+i+'"><small class="ck-reading-ref" dir="ltr">'+(i+1)+'</small><div class="ck-he" lang="he" dir="rtl">'+esc(p.he)+'</div><div class="ck-en" lang="en" dir="ltr">'+esc(p.en)+'</div></div>';}).join('');
    var q=u.qualifications.map(function(q){var text=s.publicNotes?q.text:s.readerNotes[q.id];if(text===null)return '';
      var ordinal=u.pairs.findIndex(function(p){return p.id===q.pair_id;});
      return '<aside class="ck-source-qualification" data-note-id="'+esc(q.id)+'" data-note-owner="'+esc(u.id)+'" data-note-pair="'+esc(q.pair_id===null?'null':q.pair_id)+'" data-note-placement="'+esc(q.placement)+'" data-note-display-placement="owner-local" lang="en" dir="ltr">'+(q.placement==='after_pair'?'<small>Paragraph '+(ordinal+1)+':</small> ':'')+'<span data-note-text>'+esc(text)+'</span></aside>';
    }).join('');
    var statuses=u.pairs.map(function(p,i){return ['he','en'].map(function(language){
      var value=p.sourceStatus&&p.sourceStatus[language],status=typeof value==='string'?value:value&&value.status;
      if(!status)return '';
      return '<aside class="ck-source-qualification" data-field-language="'+language+'" data-source-status="'+esc(status)+'" data-note-owner="'+esc(u.id)+'" data-note-pair="'+esc(p.id)+'" dir="ltr">Paragraph '+(i+1)+' · '+(language==='he'?'Hebrew':'English')+' — '+esc(status==='held'||status.indexOf('held-')===0?'unresolved source reading; see qualifications':status.replace(/-/g,' '))+'</aside>';
    }).join('');}).join('');
    return '<article class="ck-breslov-owner" data-bop-unit="'+esc(u.id)+'" data-source-kind="'+esc(role(u))+'" data-owner-main-id="'+esc(mainOwner(u)==null?'null':mainOwner(u))+'" data-verse-ref="'+esc(JSON.stringify(u.verseRef))+'"><details class="ck-layer ck-qualified-disclosure" id="ck-bop-'+esc(s.key+'-'+namespace+'-'+u.id)+'"><summary>'+esc(label)+'</summary>'+body+'</details>'+statuses+q+'</article>';
  }
  function mapped(source,slug,chapter,verse) {
    var mains=source.units.filter(function(u){return role(u)==='main' && u.verseRef && u.verseRef.book===slug.replace(/^tanach-/,'') && u.verseRef.chapter===chapter && u.verseRef.verse===verse;});
    return mains.reduce(function(out,m){return out.concat([m],source.units.filter(function(u){return role(u)!=='main' && mainOwner(u)===m.id;}));},[]);
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
  function availability(week) {
    var s=selections[week];
    return (s&&s.unavailable||[]).map(function(f){return '<aside class="ck-source-qualification" data-breslov-unavailable="'+esc(f.edition)+'" data-source-error="'+esc(f.reason)+'" role="status" lang="en" dir="ltr">Supplementary Breslov source unavailable or could not be verified ('+esc(f.edition)+'). No alternate source text has been substituted.</aside>';}).join('');
  }
  function weekly(week) {
    var s=selections[week||'נח'];if(!s)return '';
    // Individual context panels preserve canonical order even when unowned
    // metadata is interspersed among mapped mains. They never enter verse().
    var bodies=s.source.units.map(function(u){
      var main=role(u)==='main'?u:s.source.units.find(function(m){return role(m)==='main'&&m.id===mainOwner(u);});
      var html=owner(u,s,'weekly');
      return main&&main.verseRef?html:'<details class="ck-layer ck-weekly-unowned"><summary>לימוד שבועי ללא פסוק מסוים · Weekly context without a verse assignment</summary>'+html+'</details>';
    }).join('');
    var pdf=s.source.pdfSource?'<details class="ck-layer ck-facsimile"><summary>תצלום המקור · Source PDF</summary><a href="'+esc(s.source.pdfSource)+'" target="_blank" rel="noopener">Read / open PDF</a> · <a href="'+esc(s.source.pdfSource)+'" download>Download PDF</a></details>':'';
    // Keep failure visible outside the closed source disclosure and independent
    // of language controls. It is a failed edition, never valid source absence.
    var unavailable=availability(week||'נח');
    return '<section class="ck-section" data-sec="breslov" id="ck-breslov-week-'+esc(s.key)+'">'+unavailable+(s.source.units.length?'<details class="ck-layer ck-breslov ck-source-island" data-language="both" data-language-key="breslov-'+esc(s.key)+'-weekly"><summary>ברסלב על הפרשה — '+esc(week||'נח')+' · Breslov on the Parsha</summary>'+scope(s)+languages()+bodies+supplement(s)+pdf+'</details>':'')+'</section>';
  }
  window.ChokVerseBreslov={load:load,verse:verse,weekly:weekly,availability:availability,validate:validate,present:present,mapped:mapped,has:has,parsha:parsha,loadQualified:loadQualified};
})();
