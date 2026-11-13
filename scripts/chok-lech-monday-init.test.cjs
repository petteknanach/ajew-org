'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {documentFor,sandbox,until}=require('./qualified-earlier-parsha-test-dom.cjs');
const read=p=>fs.readFileSync(p,'utf8'),source=read('public/chok-source-reader.js'),main=read('public/chok.js'),monday=read('public/chok-lech-monday.js'),sunday=read('public/chok-lech-sunday.js'),raw=read('public/reader/chok/lech-monday-talmud.json'),sunRaw=read('public/reader/chok/lech-sunday-talmud-zohar.json'),packet=JSON.parse(raw);
const fullSchedule=JSON.parse(read('public/reader/chok/schedule.json')),schedule={weeks:{}};
for(const w of ['לך לך','נח']){schedule.weeks[w]={slug:fullSchedule.weeks[w].slug,days:{}};for(const d of ['יום ראשון','יום שני'])schedule.weeks[w].days[d]={gemara:fullSchedule.weeks[w].days[d].gemara};}
const template=read('src/pages/reader/chok.astro'),markup=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
// This declared partial fixture does not qualify a full page or Nach reading.
// Compare every error node: no filtering, blanket allowance or hidden error.
function assertProjectedNachBoundary(d,projection,fields){
 for(const week of Object.values(projection.weeks))for(const day of Object.values(week.days))assert.deepEqual(Object.keys(day).sort(),fields,'unchanged declared schedule projection');
 const tail="Nach book data error: Error: Nach facts: missing original schedule qualifier. No fallback verses are displayed.",lead=" — : נתוני הספר או טווח המקור אינם מאומתים; לא מוצגים פסוקים חלופיים. ";
 const actual=d.querySelectorAll('#ck-content .ck-error').map(n=>({class:n.getAttribute('class'),nach:n.getAttribute('data-nach-error'),role:n.getAttribute('role'),text:n.textContent,html:n.innerHTML,owned:!!(n.closest('[data-sec="talmud"]')||n.closest('[data-sec="kabbala"]'))}));
 const expected=["נביא", "כתובים"].map(label=>({class:'ck-error ck-nach-boundary',nach:'book-data',role:'status',text:label+lead+tail,html:label+lead+'<span dir="ltr">'+tail+'</span>',owned:false}));
 assert.deepEqual(actual,expected,'only complete exact protected missing-qualifier statuses from the declared omitted Nach fields; every other error fails');
}
// Test-local browser script transport: never preload or replace the renderer.
function qualifiedTransport(d,env,mainCode){
 const requests=[],errors=[],append=d.head.appendChild.bind(d.head);
 const owners={d89f12181e90034b08d036cf96fe7493ed984776db5a5574a515e0c095346a08:'418514feb99ec895017ddef2b6746f99f2e6c64613a549d5354213c4cf637a06',e263e015614e8328fddbd9fd9ea5e78431e6b58e571632a842755da982f96289:'9252e0ad3af22de43601fb4805736ee9d2aef7733e69253eb41888ad7621dae0',c9f930afecfea0afcb6472b08a2b46ac51c6380621ad4e1a9123452dc0a048d8:'0fa752655b0c54a5d5947d1ebd92b6d30b2a87c858d0f811b5685aeceb834e22'};
 const digest=(bytes,encoding='hex')=>crypto.createHash('sha256').update(bytes).digest(encoding);
 d.head.appendChild=function(node){
  const result=append(node);
  if(String(node.tagName).toLowerCase()==='script'){
   const job=Promise.resolve().then(()=>{
    try{
     const src=String(node.src||node.getAttribute('src')),url=new URL(src,'https://fixture.invalid/reader/chok/');requests.push(src);
     assert.equal(url.origin,'https://fixture.invalid');assert.equal(src,url.pathname+url.search);assert.equal(url.hash,'');
     const match=/^\/chok-qualified-zohar\.js\?v=([a-f0-9]{64})$/.exec(src);assert(match,'exact qualified-module URL/query required');
     if(match[1]==="0bc54ea8f9db892a4c12fe3da366a66770f6b874d7c42fd0b8d3a7774de07365"){assert.equal(digest(require('./chok-sa-optional-inverse.cjs').restore('public/chok.js',Buffer.from(mainCode))),"1d9e4563b3f8263d28978356f03e14756930286b270a6f01d7d289b7aa418e51",'exact all-adopted final Main owns this module');}else{assert(Object.hasOwn(owners,match[1]),'accepted29/current37 module only');assert.equal(digest(require('./chok-reference-order-conservation.cjs').restoreTodayZohar('public/chok.js',Buffer.from(mainCode))),owners[match[1]],'module belongs to actual selected Main');}
     const bytes=Buffer.from(read('public'+url.pathname),'utf8');assert.equal(digest(bytes),match[1],'complete versioned module bytes');
     assert.equal(node.integrity,'sha256-'+digest(bytes,'base64'),'actual declared SRI');assert.equal(node.crossOrigin,'anonymous');
     vm.runInContext(bytes.toString('utf8'),env.box,{filename:src});
     if(typeof node.onload==='function')node.onload.call(node,{type:'load',target:node});
    }catch(error){errors.push(error);if(typeof node.onerror==='function')node.onerror.call(node,{type:'error',target:node,error});else throw error;}
   });
   job.catch(error=>{if(!errors.includes(error))errors.push(error);});
  }
  return result;
 };
 return {requests,errors};
}
function checkQualifiedMonday(d,english=true){
 const bytes=read('public/reader/chok/qualified-zohar/lech-yom-sheni-reuse.json');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'014110425174f202c79952060f46fdcf47d530d5e097c55cbfaa588db6cc4cd2','unchanged actual Monday packet');
 const p=JSON.parse(bytes),a=d.querySelector('[data-qualified-zohar="לך לך|יום שני"]');assert(a,'actual newly approved Monday owner');
 assert.equal(a.getAttribute('data-original-sha256'),p.originalSHA256);assert.equal(a.getAttribute('data-english-sha256'),p.englishSHA256);
 assert.deepEqual(a.querySelectorAll('[data-zohar-unit]').map(n=>n.getAttribute('data-zohar-unit')),p.units.map(u=>u.owner));
 for(const u of p.units){const n=a.querySelector('[data-zohar-unit="'+u.owner+'"]');assert.equal(n.querySelector('[data-field-role="original-source"]').textContent,u.original);const en=n.querySelector('[data-field-role="english-translation"]');assert.equal(!!en,english);if(en)assert.equal(en.textContent,u.english);}
}
async function boot({hold=false,missing=false,bytes=raw}={}){
 const requests=[],d=documentFor('<html><body>'+markup+'</body></html>');let r;
 const env=sandbox(d,'/reader/chok/',async url=>{requests.push(String(url));const key=String(url).split('?')[0];let value=null;if(key==='/reader/chok/schedule.json')value=JSON.stringify(schedule);else if(key==='/reader/chok/shabbos-map.json')value=read('public/reader/chok/shabbos-map.json');else if(key==='/reader/chok/lech-monday-talmud.json'){if(r.hold)await new Promise(resolve=>r.release=resolve);value=r.bytes;}else if(key==='/reader/chok/lech-sunday-talmud-zohar.json')value=sunRaw;else if(key==='/reader/chok/qualified-zohar/lech-yom-sheni-reuse.json')value=read('public'+key);else assert(!key.startsWith('/reader/gemara/'),'repaired day must not call whole-amud fallback');return{ok:true,status:200,text:async()=>value,json:async()=>value===null?null:JSON.parse(value)};});
 r={d,env,requests,hold,bytes};r.transport=qualifiedTransport(d,env,main);env.box.location.search='?week='+encodeURIComponent('לך לך')+'&day='+encodeURIComponent('יום שני');env.box.Date=class extends Date{constructor(...a){super(...(a.length?a:['2026-10-19T09:00:00+03:00']));}static now(){return Date.parse('2026-10-19T09:00:00+03:00');}};
 vm.runInContext(source,env.box);env.box.window.ChokSources.load=async()=>{};env.box.window.ChokVerseBreslov={has:()=>false,availability:()=>'',parsha:()=>null,weekly:()=>''};vm.runInContext(sunday,env.box);if(!missing)vm.runInContext(monday,env.box);vm.runInContext(main,env.box);
 r.settled=async()=>{await until(()=>!d.querySelector('.ck-loading')&&!!d.getElementById('ck-content').innerHTML,10000);assertProjectedNachBoundary(d,schedule,['gemara']);assert(!d.getElementById('ck-content').textContent.includes('Could not load'));assert.deepEqual(r.transport.errors,[],'genuine dynamic script transport');};
 r.change=async(id,value)=>{const n=d.getElementById(id);n.value=value;n.dispatchEvent({type:'change'});await r.settled();};return r;
}
function check(r,english){checkQualifiedMonday(r.d,english);assert.equal(r.d.querySelector('[data-sec="talmud"]').children.filter(n=>n.classList.contains('ck-popout')).length,1,'ordinary Monday must expose its registered focused-study button');assert.equal(r.d.querySelectorAll('[data-qualified-daily="lech-monday"]').length,1);const rows=packet.sections.talmud.units.concat(packet.sections.talmud.rashiFullSupplement.units);assert.equal(r.d.querySelectorAll('[data-reading-unit]').length,30);for(const u of rows){const n=r.d.querySelector('[data-reading-unit="'+u.id+'"]');assert.equal(n.querySelector('[data-source-field="he"]').textContent,u.he);const en=n.querySelector('[data-source-field="en"]');assert.equal(!!en,english);if(en)assert.equal(en.textContent,u.en);}assert(r.d.querySelector('[data-note-id="monday-gemara-meaning-1"]'));assert(!r.d.getElementById('ck-content').textContent.includes('מוליאר'));}
(async()=>{let registeredModes=0;let r=await boot();try{await r.settled();check(r,true);for(const lang of ['he','en','original','both']){await r.change('ck-language',lang);check(r,['en','both'].includes(lang));registeredModes++;}assert.equal(r.requests.filter(u=>u.startsWith('/reader/chok/lech-monday-talmud.json')).length,1);}finally{r.env.close();}
r=await boot({missing:true});try{await r.settled();assert(!r.d.querySelector('[data-qualified-daily="lech-monday"]'));assert(r.d.getElementById('ck-content').textContent.includes('41a'));}finally{r.env.close();}
r=await boot({bytes:raw+' '});try{await r.settled();assert(!r.d.querySelector('[data-qualified-daily="lech-monday"]'));r.bytes=raw;await r.change('ck-language','en');check(r,true);}finally{r.env.close();}
r=await boot({hold:true});try{await until(()=>!!r.release,5000);await r.change('ck-day','יום ראשון');assert(r.d.querySelector('[data-qualified-daily="lech-sunday"]'));const before=r.d.getElementById('ck-content').innerHTML;r.hold=false;r.release();await new Promise(resolve=>setTimeout(resolve,50));assert.equal(r.d.getElementById('ck-content').innerHTML,before);await r.change('ck-day','יום שני');check(r,true);}finally{r.env.close();}
console.log(JSON.stringify({actualMainInitializer:true,registeredLanguageModes:registeredModes,completeMondayPairs:30,missingModuleFailClosed:true,rejectedPacketControlRecovery:true,lateMondayCannotReplaceSunday:true,scheduleProjection:'authentic Talmud keys only; unchanged optional data explicitly null, not a whole-page/browser claim'}));})().catch(e=>{console.error(e.stack);process.exitCode=1;});
