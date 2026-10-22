/* Own English/explanations selected by parent; existing original editions remain unpromoted.
 * No original text is carried here. Only the existing aggregate queued loader is used. */
(function(){'use strict';
 var D='יום ראשון',DESCRIPTORS={"בראשית|יום ראשון":{"week":"בראשית","chapter":1,"notes":6,"items":5,"pin":"1ddaec008caec8480f870f653cd2e958c2aac6b6f8b817f545be004208b1d071","path":"/reader/chok/biraishis-sunday-mishna-english.json","marker":"biraishis-sunday-mishna"},"ויצא|יום ראשון":{"week":"ויצא","chapter":7,"notes":24,"items":5,"pin":"8007ec30d7a1e558cb2c5b2497ff7478750f39cfcb0abbf1c4f8584108af3040","path":"/reader/chok/vayaitzai-sunday-mishna-english.json","marker":"vayaitzai-sunday-mishna","itemPins":["5f782a70ec84ce55e132981bce2a105aadb9965b44c46897088a8360c15076f8","7f302fdfa539c1663446780068b449cbf6bcd56176b971362a336ec7ab47e185","fd9dd3a49dc528439945745ef1429fc1d8dbb4f7e974df6ac92a2a05fee699ef","6327f8434cf16bedaa3384f0f6bf9f44b6fe4fe76b202720c4f98e1a656696ca","3e065ce7faa93fbe6c428f86f9d1b96af0d8a3e9b3441abab9a0e8a00a6e164f"]}},pending=Object.create(null);
 var BOOKS=['/reader/mishna/mishna-berakhot.json','/reader/commentary/mishna-bartenura/mishna-berakhot.json'];
 var BOOKPINS=['35958e37c92571d933e915e379596c45c26e7bdff7aeee889a4f6541c5ad6d29','92272320a8cd2f3d9f2a3319829b78d7d903d67864f018010fedd6358a934fa7'];
 function descriptor(wk,day){var key=wk+'|'+day;return Object.prototype.hasOwnProperty.call(DESCRIPTORS,key)?DESCRIPTORS[key]:null;}
 function sha(s){return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return Array.from(new Uint8Array(b)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');});}
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function requireIt(v){if(!v)throw Error('Sunday Mishna source binding failed');}
 function nonempty(s){return typeof s==='string'&&s.length>0;}
 function anchor(a,s,hash){var n=Array.from(s).length;requireIt(a&&a.sha256===hash&&a.codepoints===n&&JSON.stringify(a.span)===JSON.stringify([0,n])&&a.encoding==='UTF-8'&&a.offsetUnit==='Unicode-codepoint');}
 function validate(p,md,bd,wk,day){
  var spec=descriptor(wk===undefined?'בראשית':wk,day===undefined?D:day);requireIt(spec);
  requireIt(p&&p.schema==='ChokQualifiedMishnaEnglish/v1'&&p.week===spec.week&&p.day===D&&p.chapter==='mishna-berakhot:'+spec.chapter&&Array.isArray(p.items)&&p.items.length===5);
  var ms=md&&md.ch&&md.ch[String(spec.chapter)],bs=bd&&bd.ch&&bd.ch[String(spec.chapter)];requireIt(Array.isArray(ms)&&ms.length===5&&Array.isArray(bs)&&bs.length===5);
  var seen={},notes=0,jobs=[];
  p.items.forEach(function(u,i){var ref='mishna-berakhot:'+spec.chapter+':'+(i+1);if(spec.itemPins)jobs.push(function(){return sha(JSON.stringify(u)).then(function(h){requireIt(h===spec.itemPins[i]);});});requireIt(u.reference===ref&&u.explanation&&nonempty(u.explanation.he)&&nonempty(u.explanation.en));
   ['mishna','bartenura'].forEach(function(role){var r=u[role],s=(role==='mishna'?ms:bs)[i],id=D+'|'+(role==='mishna'?'mishna':'mishna-commentary')+'|'+ref;
    requireIt(r&&r.id===id&&nonempty(s)&&nonempty(r.en)&&Array.isArray(r.notes));jobs.push(function(){return sha(s).then(function(h){requireIt(h===r.sourceSHA256);});});
    r.notes.forEach(function(n){notes++;requireIt(n&&nonempty(n.id)&&!seen[n.id]&&n.owner===id&&nonempty(n.he)&&nonempty(n.en)&&n.placement==='owner-local-outside-language-and-body-disclosures'&&n.kind==='meaning-or-documentary-variant');seen[n.id]=true;anchor(n.originalAnchor,s,r.sourceSHA256);
     if(spec.chapter===7){var span=n.originalSpan;requireIt(n.sourceOwner===r.sourceOwner&&n.originalHash===r.sourceSHA256&&n.mandatory===true&&Array.isArray(span)&&span.length===2&&span.every(Number.isInteger)&&span[0]>=0&&span[0]<span[1]&&span[1]<=Array.from(s).length&&Array.isArray(n.segmentIds)&&n.segmentIds.length>0);}

     jobs.push(function(){return sha(n.he).then(function(h){anchor(n.heBinding,n.he,h);});});jobs.push(function(){return sha(n.en).then(function(h){anchor(n.enBinding,n.en,h);});});
    });
   });
  });requireIt(notes===spec.notes);return Promise.all(jobs.map(function(f){return f();})).then(function(){return {wire:p,mishna:ms,bartenura:bs};});
 }
 function load(loader,wk,day){
  var spec=descriptor(wk===undefined?'בראשית':wk,day===undefined?D:day);requireIt(spec);
  var key=spec.week+'|'+D;if(pending[key])return pending[key];
  var paths=[spec.path].concat(BOOKS),pins=[spec.pin].concat(BOOKPINS);
  pending[key]=Promise.resolve().then(function(){requireIt(typeof loader==='function');return Promise.all(paths.map(function(path,i){return loader(path+'?v='+pins[i]).then(function(raw){return sha(raw).then(function(h){requireIt(h===pins[i]);return JSON.parse(raw);});});}));}).then(function(r){return validate(r[0],r[1],r[2],spec.week,D);}).catch(function(e){delete pending[key];throw e;});return pending[key];
 }
 function render(p,language,commentary,mode,display,presenter){
  requireIt(['he','en','both','original'].indexOf(language)>=0&&['full','nikud','taamim','letters'].indexOf(mode)>=0&&typeof display==='function'&&typeof presenter==='function');
  var english=language==='en'||language==='both',spec=descriptor(p.wire.week,p.wire.day);requireIt(spec);
  function pair(r,s){return '<article data-reading-unit="'+esc(r.id)+'"><div data-source-field="he" class="ck-untouched-original ck-he" lang="he" dir="rtl" style="white-space:pre-wrap">'+presenter(language==='original'?s:display(s,mode))+'</div>'+(english?'<div data-source-field="en" class="ck-en-line" lang="en" dir="ltr" style="white-space:pre-wrap">'+esc(r.en)+'</div>':'')+'</article>';}
  function notes(r){return r.notes.map(function(n){return '<aside class="ck-source-qualification" data-note-id="'+esc(n.id)+'" data-note-owner="'+esc(r.id)+'"><p lang="he" dir="rtl">'+esc(n.he)+'</p><p lang="en" dir="ltr">'+esc(n.en)+'</p></aside>';}).join('');}
  function explanation(u){if(spec.chapter===7)return u.explanation.paragraphs.map(function(p,i){return '<div data-explanation-pair="'+(i+1)+'"><div data-explanation-field="he" lang="he" dir="rtl" style="white-space:pre-wrap">'+esc(p.he)+'</div>'+(english?'<div data-explanation-field="en" lang="en" dir="ltr" style="white-space:pre-wrap">'+esc(p.en)+'</div>':'')+'</div>';}).join('');return '<div data-explanation-field="he" lang="he" dir="rtl" style="white-space:pre-wrap">'+esc(u.explanation.he)+'</div>'+(english?'<div data-explanation-field="en" lang="en" dir="ltr" style="white-space:pre-wrap">'+esc(u.explanation.en)+'</div>':'');}
  return '<div data-qualified-daily="'+spec.marker+'" data-language="'+esc(language)+'"><h2>משנה וברטנורא — ברכות '+(spec.chapter===7?'ז':'א')+' · Mishna and Bartenura — Berachos '+spec.chapter+'</h2>'+p.wire.items.map(function(u,i){return '<section data-mishna-owner="'+esc(u.mishna.id)+'"><h3>משנה '+esc(['א','ב','ג','ד','ה'][i])+'</h3>'+notes(u.mishna)+pair(u.mishna,p.mishna[i])+notes(u.bartenura)+'<details class="ck-layer ck-bartenura" data-sunday-commentary'+(!commentary?' hidden':'')+'><summary>ברטנורא · Bartenura</summary>'+pair(u.bartenura,p.bartenura[i])+'</details><details class="ck-layer ck-voice-layer" data-sunday-explanation'+(!commentary?' hidden':'')+'><summary>הסבר פשוט · Clear explanation</summary>'+explanation(u)+'</details></section>';}).join('')+'</div>';
 }
 function reading(wk,day,language,commentary,loader,scheduled,mode,display,presenter){var spec=descriptor(wk,day);if(!spec)return Promise.resolve(null);requireIt(scheduled&&scheduled.mishna&&scheduled.mishna.masechet==='ברכות'&&scheduled.mishna.perek===spec.chapter);return load(loader,wk,day).then(function(p){return render(p,language,commentary,mode,display,presenter);});}
 window.ChokBiraishisSundayMishna={reading:reading,load:load,validate:validate};
})();
