/* Source-bound own English for the Genesis Chok readings.
 * Ancient originals remain in their existing source carriers, unchanged.
 * This carrier adds only selected translations, explanations and qualifications.
 */
(function () {
  'use strict';
  var WEEKS = {"בראשית":["portion-01.json","b5e65f4e367ce5395ac21be2d930ffee9ccaca11007a4ff20f79b501063e9a05",148799,198],"נח":["portion-02.json","3a59a0f0f21dbaa2f46b5192bcd29ae909bb04a722ade03294412c3d1f1b965d",133426,205],"לך לך":["portion-03.json","f8535a0d641212d21e14717f6eaeb7cee407d710d292fec0cc60ae30f0d9c92c",148853,178],"וירא":["portion-04.json","52a1429ed144f1d5db92d24cf124c4df6efad2304600166e764f8dd0bde607c4",156028,199],"חיי שרה":["portion-05.json","5336f7aba7d3ea964cbad75dc494e47cda40f538f4303bf34d85aadc7d36a70e",109214,157],"תולדות":["portion-06.json","d6002f14e665c298a9083fe8cdd58c50c82701eb8217d8adcc386df27fe6609b",134118,158],"ויצא":["portion-07.json","136d079734df30b9233c944b5a4863e8fdd8ea9e35190819798f5b021a4f2a24",140172,200],"וישלח":["portion-08.json","4c3268f72b7f211f467f711307610c7a8968ce12bccd7e63059c27eb08412354",141809,205],"וישב":["portion-09.json","937aecb549c5847e7eaec24a6b9a989c122225b7d5ca218157fdcbc8015a96d3",137466,164],"מקץ":["portion-10.json","2b64a8d9382b20acddb82502b98153b9234b0144a944ffe78003de17ff7b3471",131549,198],"ויגש":["portion-11.json","2eb57a68214e33b960ac0a0b45e5f8fd9a17cbab95fc30406399e5db047605f8",108643,158],"ויחי":["portion-12.json","ea8873a71eec2e9b99bd3f6cbaf9848c775297bd7d6a5c12c8c83649ad1119dd",107063,137]};
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
  function selectedSource(original, reading) {
    if (!reading) return Promise.resolve(original);
    need(reading && Array.isArray(reading.edits) && typeof reading.suffix==='string' && /^[a-f0-9]{64}$/.test(reading.sha256));
    var points=Array.from(original), priorEnd=0;
    reading.edits.forEach(function(e){
      need(e && Number.isInteger(e.start)&&Number.isInteger(e.end)&&e.start>=priorEnd&&e.end>=e.start&&e.end<=points.length&&typeof e.before==='string'&&typeof e.after==='string'&&points.slice(e.start,e.end).join('')===e.before);
      priorEnd=e.end;
    });
    for(var i=reading.edits.length-1;i>=0;i--){var e=reading.edits[i];points.splice.apply(points,[e.start,e.end-e.start].concat(Array.from(e.after)));}
    var result=points.join('')+reading.suffix;
    return hash(result).then(function(h){need(h===reading.sha256);return result;});
  }
  function selected(context,reference,original) {
    if(!context||!own(context.rows,reference))return null;
    var b=context.rows[reference];
    return b.original===original&&b.row.sourceReading?b.displayOriginal:null;
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
        return hash(original).then(function(h){if(h!==x.originalSHA256)return null;return selectedSource(original,x.sourceReading).then(function(display){rows[x.reference]={row:x,original:original,displayOriginal:display};});});
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
  window.ChokGenesisEnglish=Object.freeze({prepare:prepare,render:render,selected:selected});
})();
