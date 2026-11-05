/* Source-bound own English for the Genesis Chok readings.
 * Ancient originals remain in their existing source carriers, unchanged.
 * This carrier adds only selected translations, explanations and qualifications.
 */
(function () {
  'use strict';
  var WEEKS = {"בראשית":["portion-01.json","b5e65f4e367ce5395ac21be2d930ffee9ccaca11007a4ff20f79b501063e9a05",148799,198],"נח":["portion-02.json","5a21c579d0ef4457c2a048412ff5588e6bad1d219d96126d7297633f0af62dbf",151041,204],"לך לך":["portion-03.json","f8535a0d641212d21e14717f6eaeb7cee407d710d292fec0cc60ae30f0d9c92c",148853,178],"וירא":["portion-04.json","8f3d773cb77922cd9aaa0444eb574f498416aad7d268186557cc86f2c33d8160",152951,197],"חיי שרה":["portion-05.json","5188cd82b65a8f9f7d30aa711c05c52e33403bcdc1af56f7cd36e2f1917176ff",104449,154],"תולדות":["portion-06.json","53a4d58948e8ebd8674e2efd493bcfdad73c7b188dd5cd9f8517e19917ebf0b3",151054,157],"ויצא":["portion-07.json","a7ae70496ed16da53a743dc05ffd9ab0ec00d9fec3c30050b6b2d31033c5cfc4",158863,199],"וישלח":["portion-08.json","847286517623cb9e80222a0998b26afd76efa699cc2b552b4a3073a459aa6c65",138019,202],"וישב":["portion-09.json","c6af02e3ea798b4497c926c069a15ce968f8cdea0a7d5525ec98ba8dbe116d6f",126160,157],"מקץ":["portion-10.json","b34a596c980da228314d8b9bcbb3ae4011f619abc92880312cc3051b6c879fd8",130119,197],"ויגש":["portion-11.json","82de0480f11afcf9d5dfd7d183743a31bc03fe317be7e3249834d077f13dd47b",105252,156],"ויחי":["portion-12.json","c5b02cfe210ba10fa8d12b6c540d2358dd5a07db1d473c86b7eb24484f01dd06",102289,134]};
  var DAYS = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];
  var pending = Object.create(null);
  function own(o,k) { return Object.prototype.hasOwnProperty.call(o,k); }
  function text(s) { return typeof s === 'string' && s.trim().length > 0; }
  function need(x) { if (!x) throw Error('Targum English source binding unavailable'); }
  function hash(s) {
    return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b) {
      return Array.prototype.map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2);}).join('');
    });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function role(kind) { return kind==='torah'?'onkelos':kind==='navi'?'navi-targum':kind==='kesuvim'?'kesuvim-targum':null; }
  function slot(week,day,r,slug) {
    return own(WEEKS,week) && DAYS.indexOf(day)>=0 &&
      (r==='onkelos' ? slug==='tanach-bereishit' : DAYS.indexOf(day)<5 &&
       (r==='kesuvim-targum' ? slug==='tanach-mishlei' : r==='navi-targum' && /^tanach-[a-z-]+$/.test(slug) && slug!=='tanach-bereishit' && slug!=='tanach-mishlei'));
  }
  function validate(p,week,spec) {
    need(p && p.schema==='ajew.chok.genesis-own-english.week.v1' && p.week===week && Array.isArray(p.pairs) && p.pairs.length===spec[3] && Array.isArray(p.dayFields));
    var seen=Object.create(null),days=Object.create(null);
    p.pairs.forEach(function(r){
      need(r && typeof r.key==='string' && r.key.split('|').length===2);
      var k=r.key.split('|'), id=[r.key,r.role,r.slug,r.reference].join('|');
      need(k[0]===week && slot(week,k[1],r.role,r.slug) && /^[1-9][0-9]*:[1-9][0-9]*$/.test(r.reference) && id===r.ownerScopeKey && !own(seen,id) &&
        text(r.fullEnglish) && /^[a-f0-9]{64}$/.test(r.originalSHA256) && /^[a-f0-9]{64}$/.test(r.englishSHA256) && !own(r,'original') && Array.isArray(r.qualifications));
      r.qualifications.forEach(function(n,i){need(n && n.ownerScopeKey===id && n.projectionIndex===i && n.sourceEnglishSHA256===r.englishSHA256 && text(n.he) && text(n.en));});
      seen[id]=true;Object.freeze(r.qualifications);Object.freeze(r);
    });
    p.dayFields.forEach(function(d){
      need(d && typeof d.key==='string' && d.key.split('|')[0]===week && DAYS.indexOf(d.key.split('|')[1])>=0 &&
        (d.role==='onkelos'||((d.role==='navi-targum'||d.role==='kesuvim-targum')&&DAYS.indexOf(d.key.split('|')[1])<5)) &&
        d.dayTitle && text(d.dayTitle.he)&&text(d.dayTitle.en)&&d.explanation&&text(d.explanation.he)&&text(d.explanation.en) && !own(days,d.key+'|'+d.role));
      days[d.key+'|'+d.role]=d;
    });
    return {pairs:p.pairs,days:days};
  }
  function packet(week,load) {
    if (!own(pending,week)) {
      var s=WEEKS[week];
      pending[week]=load('/reader/chok/genesis-english/'+s[0]+'?v='+s[1]).then(function(raw){
        need(typeof raw==='string' && new TextEncoder().encode(raw).length===s[2]);
        return hash(raw).then(function(h){need(h===s[1]);return validate(JSON.parse(raw),week,s);});
      }).catch(function(e){delete pending[week];throw e;});
    }
    return pending[week];
  }
  function prepare(week,day,kind,slug,rawPromise,load) {
    var r=role(kind);
    if (!slot(week,day,r,slug)) return Promise.resolve(null);
    return Promise.all([rawPromise,packet(week,load)]).then(function(v){
      var raw=v[0],p=v[1],rows=Object.create(null);
      if (!raw || !raw.ch || typeof raw.ch!=='object') return null;
      return Promise.all(p.pairs.filter(function(x){return x.key===week+'|'+day && x.role===r && x.slug===slug;}).map(function(x){
        var ref=x.reference.split(':'),original=raw.ch[ref[0]]&&raw.ch[ref[0]][ref[1]];
        if (!text(original)) return null;
        return hash(original).then(function(h){if(h===x.originalSHA256) rows[x.reference]={row:x,original:original};});
      })).then(function(){return {week:week,day:day,role:r,slug:slug,rows:rows,introduction:p.days[week+'|'+day+'|'+r],introductionRendered:false};});
    }).catch(function(){return null;});
  }
  function render(context,reference,original,options) {
    if (!context || !own(context.rows,reference)) return '';
    var bound=context.rows[reference],r=bound.row;
    if (bound.original!==original) return '';
    var en=options.english===true,visible=options.targum===true,intro='';
    if (!context.introductionRendered && context.introduction && visible && options.introduction!==false) {
      var d=context.introduction;
      intro='<header class="ck-voice-layer ck-genesis-targum-day" data-targum-role="'+context.role+'">'+
        '<h4 lang="he" dir="rtl">'+esc(d.dayTitle.he)+'</h4>'+(en?'<h4 lang="en" dir="ltr">'+esc(d.dayTitle.en)+'</h4>':'')+
        '<p lang="he" dir="rtl">'+esc(d.explanation.he)+'</p>'+(en?'<p lang="en" dir="ltr">'+esc(d.explanation.en)+'</p>':'')+'</header>';
      context.introductionRendered=true;
    }
    // Existing qualified translations and their own notes remain the winner.
    if (options.existingEnglish===true) return intro;
    var body=visible&&en?window.ChokSources.english(r.fullEnglish,true,'Targum English translation'):'';
    var notes=r.qualifications.map(function(n){return '<aside class="ck-source-qualification" data-note-owner="'+esc(r.ownerScopeKey)+'" data-source-english-sha256="'+r.englishSHA256+'" style="display:block!important">'+
      '<p lang="he" dir="rtl" style="display:block!important;white-space:pre-wrap">'+esc(n.he)+'</p><p lang="en" dir="ltr" style="display:block!important;white-space:pre-wrap">'+esc(n.en)+'</p></aside>';}).join('');
    return intro+'<section class="ck-genesis-english-owner" data-owner-scope-key="'+esc(r.ownerScopeKey)+'" data-original-sha256="'+r.originalSHA256+'" data-english-sha256="'+r.englishSHA256+'">'+body+notes+'</section>';
  }
  window.ChokGenesisEnglish=Object.freeze({prepare:prepare,render:render});
})();
