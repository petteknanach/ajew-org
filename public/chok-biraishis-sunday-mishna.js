/* Own English/explanations selected by parent; existing original editions remain unpromoted.
 * No original text is carried here. Only the existing aggregate queued loader is used. */
(function(){'use strict';
 var W='בראשית',D='יום ראשון',PIN='1ddaec008caec8480f870f653cd2e958c2aac6b6f8b817f545be004208b1d071',pending;
 var PATHS=['/reader/chok/biraishis-sunday-mishna-english.json','/reader/mishna/mishna-berakhot.json','/reader/commentary/mishna-bartenura/mishna-berakhot.json'];
 var PINS=[PIN,'35958e37c92571d933e915e379596c45c26e7bdff7aeee889a4f6541c5ad6d29','92272320a8cd2f3d9f2a3319829b78d7d903d67864f018010fedd6358a934fa7'];
 function sha(s){return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return Array.from(new Uint8Array(b)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');});}
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function requireIt(v){if(!v)throw Error('Sunday Mishna source binding failed');}
 function nonempty(s){return typeof s==='string'&&s.length>0;}
 function anchor(a,s,hash){var n=Array.from(s).length;requireIt(a&&a.sha256===hash&&a.codepoints===n&&JSON.stringify(a.span)===JSON.stringify([0,n])&&a.encoding==='UTF-8'&&a.offsetUnit==='Unicode-codepoint');}
 function validate(p,md,bd){
  requireIt(p&&p.schema==='ChokQualifiedMishnaEnglish/v1'&&p.week===W&&p.day===D&&p.chapter==='mishna-berakhot:1'&&Array.isArray(p.items)&&p.items.length===5);
  var ms=md&&md.ch&&md.ch['1'],bs=bd&&bd.ch&&bd.ch['1'];requireIt(Array.isArray(ms)&&ms.length===5&&Array.isArray(bs)&&bs.length===5);
  var seen={},notes=0,jobs=[];
  p.items.forEach(function(u,i){var ref='mishna-berakhot:1:'+(i+1);requireIt(u.reference===ref&&u.explanation&&nonempty(u.explanation.he)&&nonempty(u.explanation.en));
   ['mishna','bartenura'].forEach(function(role){var r=u[role],s=(role==='mishna'?ms:bs)[i],id=D+'|'+(role==='mishna'?'mishna':'mishna-commentary')+'|'+ref;
    requireIt(r&&r.id===id&&nonempty(s)&&nonempty(r.en)&&Array.isArray(r.notes));jobs.push(function(){return sha(s).then(function(h){requireIt(h===r.sourceSHA256);});});
    r.notes.forEach(function(n){notes++;requireIt(n&&nonempty(n.id)&&!seen[n.id]&&n.owner===id&&nonempty(n.he)&&nonempty(n.en)&&n.placement==='owner-local-outside-language-and-body-disclosures'&&n.kind==='meaning-or-documentary-variant');seen[n.id]=true;anchor(n.originalAnchor,s,r.sourceSHA256);
     jobs.push(function(){return sha(n.he).then(function(h){anchor(n.heBinding,n.he,h);});});jobs.push(function(){return sha(n.en).then(function(h){anchor(n.enBinding,n.en,h);});});
    });
   });
  });requireIt(notes===6);return Promise.all(jobs.map(function(f){return f();})).then(function(){return {wire:p,mishna:ms,bartenura:bs};});
 }
 function load(loader){if(pending)return pending;pending=Promise.resolve().then(function(){requireIt(typeof loader==='function');return Promise.all(PATHS.map(function(path,i){return loader(path+'?v='+PINS[i]).then(function(raw){return sha(raw).then(function(h){requireIt(h===PINS[i]);return JSON.parse(raw);});});}));}).then(function(r){return validate(r[0],r[1],r[2]);}).catch(function(e){pending=null;throw e;});return pending;}
 function render(p,language,commentary,mode,display,presenter){
  requireIt(['he','en','both','original'].indexOf(language)>=0&&['full','nikud','taamim','letters'].indexOf(mode)>=0&&typeof display==='function'&&typeof presenter==='function');
  var english=language==='en'||language==='both';
  function pair(r,s){return '<article data-reading-unit="'+esc(r.id)+'"><div data-source-field="he" class="ck-untouched-original ck-he" lang="he" dir="rtl" style="white-space:pre-wrap">'+presenter(language==='original'?s:display(s,mode))+'</div>'+(english?'<div data-source-field="en" class="ck-en-line" lang="en" dir="ltr" style="white-space:pre-wrap">'+esc(r.en)+'</div>':'')+'</article>';}
  function notes(r){return r.notes.map(function(n){return '<aside class="ck-source-qualification" data-note-id="'+esc(n.id)+'" data-note-owner="'+esc(r.id)+'"><p lang="he" dir="rtl">'+esc(n.he)+'</p><p lang="en" dir="ltr">'+esc(n.en)+'</p></aside>';}).join('');}
  return '<div data-qualified-daily="biraishis-sunday-mishna" data-language="'+esc(language)+'"><h2>משנה וברטנורא — ברכות א · Mishna and Bartenura — Berachos 1</h2>'+p.wire.items.map(function(u,i){return '<section data-mishna-owner="'+esc(u.mishna.id)+'"><h3>משנה '+esc(['א','ב','ג','ד','ה'][i])+'</h3>'+notes(u.mishna)+pair(u.mishna,p.mishna[i])+notes(u.bartenura)+'<details class="ck-layer ck-bartenura" data-sunday-commentary'+(!commentary?' hidden':'')+'><summary>ברטנורא · Bartenura</summary>'+pair(u.bartenura,p.bartenura[i])+'</details><details class="ck-layer ck-voice-layer" data-sunday-explanation'+(!commentary?' hidden':'')+'><summary>הסבר פשוט · Clear explanation</summary><div data-explanation-field="he" lang="he" dir="rtl" style="white-space:pre-wrap">'+esc(u.explanation.he)+'</div>'+(english?'<div data-explanation-field="en" lang="en" dir="ltr" style="white-space:pre-wrap">'+esc(u.explanation.en)+'</div>':'')+'</details></section>';}).join('')+'</div>';
 }
 function reading(wk,day,language,commentary,loader,scheduled,mode,display,presenter){if(wk!==W||day!==D)return Promise.resolve(null);requireIt(scheduled&&scheduled.mishna&&scheduled.mishna.masechet==='ברכות'&&scheduled.mishna.perek===1);return load(loader).then(function(p){return render(p,language,commentary,mode,display,presenter);});}
 window.ChokBiraishisSundayMishna={reading:reading,load:load,validate:validate};
})();
