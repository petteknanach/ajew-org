/* Exact parent-selected daily core and contracted Rashi; unchanged edition holds.
 * Only the caller's aggregate queued raw-text loader is used. */
(function(){'use strict';
var W='בראשית',D='יום ראשון',PIN='3c478f32b5efba35791ff99c594e22255725f57d25164e5d5182d5a7c58d9d42',pending;
function need(v){if(!v)throw Error('Sunday Gemara source binding failed');}
function sha(s){return window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return Array.from(new Uint8Array(b)).map(function(n){return n.toString(16).padStart(2,'0');}).join('');});}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function validate(p){
 need(p&&p.schema==='biraishis-sunday-gemara-selected/v1'&&p.week===W&&p.day===D&&p.pairs.length===3&&p.explanations.length===3&&p.notes.length===1);
 var jobs=[],roles=['gemara','trailing-rashi','trailing-rashi'];
 function bound(s,pin){need(typeof s==='string'&&s.length>0);jobs.push(function(){return sha(s).then(function(h){need(h===pin);});});}
 p.pairs.forEach(function(r,i){need(r.id===W+'|'+D+'|'+roles[i]+'|'+(i===2?2:1)&&r.ordinal===(i===2?2:1));bound(r.original,r.originalSHA256);bound(r.english,r.englishSHA256);
 var e=p.explanations[i];need(e.pairId===r.id&&e.role==='distinct-clear-explanation-not-full-translation'&&e.originalSHA256===r.originalSHA256&&e.englishSHA256===r.englishSHA256&&JSON.stringify(e.spanUnicodeCodepoints)===JSON.stringify([0,Array.from(r.original).length]));bound(e.he,e.heSHA256);bound(e.en,e.enSHA256);
 });
 var n=p.notes[0],anchor=p.pairs.slice(1).map(function(r){return r.original;}).join('\n');need(n.id==='yom-rishon-trailing-rashi-NOTE-1'&&n.ownerKey===W+'|'+D+'|trailing-rashi'&&n.anchor===anchor&&JSON.stringify(n.spanUnicodeCodepoints)===JSON.stringify([0,Array.from(anchor).length])&&n.locality==='owner-local-before-source-independent-of-language-and-disclosure');bound(anchor,n.originalSHA256);need(n.he.length>0&&n.en.length>0);
 return Promise.all(jobs.map(function(f){return f();})).then(function(){return p;});
}
function load(loader){if(pending)return pending;pending=Promise.resolve().then(function(){need(typeof loader==='function');return loader('/reader/chok/biraishis-sunday-gemara.json?v='+PIN);}).then(function(raw){return sha(raw).then(function(h){need(h===PIN);return validate(JSON.parse(raw));});}).catch(function(e){pending=null;throw e;});return pending;}
function render(p,language,commentary,mode,display){need(['he','en','both','original'].indexOf(language)>=0&&['full','nikud','taamim','letters'].indexOf(mode)>=0&&typeof display==='function');var english=language==='en'||language==='both';
 function pair(r,i){var e=p.explanations[i];return '<section data-gemara-owner="'+esc(r.id)+'"><article data-reading-unit="'+esc(r.id)+'"><div data-source-field="he" class="ck-untouched-original ck-he" lang="he" dir="rtl" style="white-space:pre-wrap">'+esc(language==='original'?r.original:display(r.original,mode))+'</div>'+(english?'<div data-source-field="en" class="ck-en-line" lang="en" dir="ltr" style="white-space:pre-wrap">'+esc(r.english)+'</div>':'')+'</article><details class="ck-layer ck-voice-layer" data-sunday-explanation'+(!commentary?' hidden':'')+'><summary>הסבר פשוט · Clear explanation</summary><div data-explanation-field="he" lang="he" dir="rtl">'+esc(e.he)+'</div>'+(english?'<div data-explanation-field="en" lang="en" dir="ltr">'+esc(e.en)+'</div>':'')+'</details></section>';}
 var n=p.notes[0];return '<div data-qualified-daily="biraishis-sunday-gemara" data-language="'+esc(language)+'"><h2>גמרא ורש״י — ברכות · Gemara and Rashi — Berachos</h2>'+pair(p.pairs[0],0)+'<aside class="ck-source-qualification" data-note-id="'+esc(n.id)+'" data-note-owner="'+esc(n.ownerKey)+'"><p lang="he" dir="rtl">'+esc(n.he)+'</p><p lang="en" dir="ltr">'+esc(n.en)+'</p></aside><details class="ck-layer ck-rashi" data-sunday-commentary'+(!commentary?' hidden':'')+'><summary>רש״י · Rashi</summary>'+pair(p.pairs[1],1)+pair(p.pairs[2],2)+'</details></div>';
}
function reading(wk,day,language,commentary,loader,scheduled,mode,display){if(wk!==W||day!==D)return Promise.resolve(null);need(scheduled&&scheduled.gemara&&scheduled.gemara.masechet==='ברכות'&&scheduled.gemara.daf===12&&scheduled.gemara.amud===2);return load(loader).then(function(p){return render(p,language,commentary,mode,display);});}
window.ChokBiraishisSundayGemara={reading:reading,load:load,validate:validate};
})();
