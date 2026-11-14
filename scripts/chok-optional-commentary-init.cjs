'use strict';
// Complete ordinary initializer, actual source/data and registered controls.
// DOM is modeled; this does not claim browser paint or public delivery.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {createHash,webcrypto}=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {documentFor,sandbox,until}=require('./qualified-parsha-test-dom.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.CHOK_OPTIONAL_EVIDENCE;
const sha=x=>createHash('sha256').update(x).digest('hex');
const baseline=process.env.CHOK_OPTIONAL_INITIAL;
const inverse=require('./chok-optional-commentary-inverse.cjs');
const inputPins=new Map(),bodyCache=new Map();
function actual(rel){
 if(bodyCache.has(rel))return bodyCache.get(rel);
 let b;
 try{b=fs.readFileSync(path.join(root,rel));}
 catch(e){
  if(e.code!=='ENOENT')throw e;
  if(cp.spawnSync('git',['cat-file','-e','HEAD:'+rel],{cwd:root}).status!==0)return null;
  b=cp.execFileSync('git',['show','HEAD:'+rel],{cwd:root,maxBuffer:16*1024*1024});
 }
 inputPins.set(rel,{bytes:b.length,sha256:sha(b)});bodyCache.set(rel,b);return b;
}
const marker="  if (document.readyState === 'loading') {";
function observe(main){
 assert.equal(main.split(marker).length,2);
 const at=main.indexOf('  function init() {'),prefix=main.slice(0,at),tail=main.slice(at);
 assert.equal(tail.split('    Promise.all([\n').length,2);assert.equal(main.split('    Promise.all(jobs).then(function (weekParts) {').length,2);
 return (prefix+tail.replace('    Promise.all([\n','    globalThis.optionalInit=Promise.all([\n')).replace('    Promise.all(jobs).then(function (weekParts) {','    globalThis.optionalRender=Promise.all(jobs).then(function (weekParts) {');
}
async function initialized(week,day,old=false,stale=false){
 const admitted=rel=>baseline?fs.readFileSync(path.join(baseline,rel)):inverse.restore(rel,actual(rel));
 const template=(old?admitted('src/pages/reader/chok.astro'):actual('src/pages/reader/chok.astro')).toString();
 const main=(old?admitted('public/chok.js'):actual('public/chok.js')).toString();
 const {commentaryAvailability}=await import(pathToFileURL(path.join(root,'src/lib/chok-commentary-availability.mjs')));
 const metadata=commentaryAvailability(root);metadata.clientSHA256=sha(main);if(stale)metadata.generatedAt-=86400001;
 let inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const attr=' data-ck-commentary={optionalCommentary ? JSON.stringify(optionalCommentary) : undefined}';
 if(!old){assert(inner.includes(attr));inner=inner.replace(attr,' data-ck-commentary="'+JSON.stringify(metadata).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'"');}
 const staticTags=[...template.matchAll(/<script[^>]*src="([^\"]+)"[^>]*><\/script>/g)];
 const d=documentFor('<html><head>'+staticTags.map(x=>x[0].replace(' is:inline','')).join('')+'</head><body>'+inner+'</body></html>');d.readyState='loading';
 // The borrowed minimal DOM supports equality selectors, not CSS prefix selectors.
 // Implement this one standard selector against actual parsed script attributes.
 const query=d.querySelector.bind(d);d.querySelector=function(selector){if(selector==='script[src^="/chok.js?v="]')return d.querySelectorAll('script').find(n=>(n.getAttribute('src')||'').startsWith('/chok.js?v='))||null;return query(selector);};
 const requests=[],faults=[],scripts=[];let active=0;
 const transport=async url=>{
  const u=String(url),rel='public'+decodeURIComponent(u.split('?')[0]);assert(!rel.includes('..'));
  requests.push(u);active++;
  try{const raw=actual(rel);if(raw===null)return {ok:false,status:404,json:async()=>{throw Error('genuine absent: '+rel);},text:async()=>''};
   return {ok:true,status:200,json:async()=>JSON.parse(raw),text:async()=>raw.toString(),arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};
  }finally{active--;}
 };
 const h=sandbox(d,'/reader/chok/',transport);h.box.TextEncoder=TextEncoder;h.box.window.crypto=webcrypto;
 h.box.location.search='?week='+encodeURIComponent(week)+'&day='+encodeURIComponent(day);
 const append=d.head.appendChild.bind(d.head);d.head.appendChild=function(n){const result=append(n);if(String(n.tagName).toLowerCase()==='script')Promise.resolve().then(async()=>{try{const src=n.src||n.getAttribute('src'),raw=Buffer.from(await(await transport(src)).arrayBuffer());assert.equal(n.integrity,'sha256-'+createHash('sha256').update(raw).digest('base64'));scripts.push({src,sha256:sha(raw)});vm.runInContext(raw.toString(),h.box,{filename:src});n.onload?.();}catch(e){faults.push(String(e));n.onerror?.(e);}});return result;};
 try{
  for(const m of staticTags){const src=m[1].replace(/&amp;/g,'&');let raw=actual('public'+src.split('?')[0]);if(src.startsWith('/chok.js?'))raw=Buffer.from(main);
   const integrity=/integrity="([^"]+)"/.exec(m[0]);if(integrity){const alg=integrity[1].split('-')[0];assert.equal(integrity[1],alg+'-'+createHash(alg).update(raw).digest('base64'));}
   vm.runInContext(src.startsWith('/chok.js?')?observe(raw.toString()):raw.toString(),h.box,{filename:src});
  }
  d.dispatchEvent({type:'DOMContentLoaded',bubbles:false});await until(()=>h.box.optionalInit&&h.box.optionalRender,20000);await h.box.optionalInit;await h.box.optionalRender;
  assert(!d.querySelector('.ck-loading'));assert(!d.querySelector('#ck-content .ck-error'));assert.deepEqual(faults,[]);assert.equal(active,0);
  const box=d.getElementById('ck-content'),sections=d.querySelectorAll('#ck-content [data-sec]').map(n=>n.getAttribute('data-sec'));
  const prescription=JSON.parse(actual('public/reader/chok/schedule.json')).weeks[week].days[day];
  const required=['torah','mishna','talmud','kabbala','mussar'];
  for(const sec of ['navi','kesuvim'])if(prescription[sec])required.push(sec);
  if(prescription.halacha&&prescription.halacha.work)required.push('halacha');
  for(const sec of required)assert(sections.includes(sec),'ordinary prescribed section '+sec);
  const onHTML=box.innerHTML;
  async function toggle(value){const prior=h.box.optionalRender,n=d.getElementById('ck-commentary');assert(n._listeners.change.length);n.checked=value;n.dispatchEvent({type:'change',target:n});assert.notEqual(h.box.optionalRender,prior);await h.box.optionalRender;assert(!d.querySelector('.ck-loading'));assert.deepEqual(faults,[]);}
  const onRequests=requests.slice();await toggle(false);const offHTML=box.innerHTML,offRequests=requests.slice(onRequests.length);assert(!offRequests.some(u=>u.includes('/chok/commentary/')),'commentary off makes zero optional requests');
  await toggle(true);assert.equal(box.innerHTML,onHTML,'registered off/on restores complete original reading');
  const result={week,day,old,stale,sourceSHA256:sha(main),onHTML,offHTML,requests,onRequests,offRequests,sections,scripts};
  return result;
 }finally{h.close();}
}
(async()=>{
 const cases=[['בא','יום שלישי'],['חוקת','יום רביעי'],['תזריע','יום שישי'],['חוקת','יום שני'],['תזריע','יום שלישי'],['בראשית','יום ראשון']];
 const results=[];
 for(const [week,day]of cases){const old=await initialized(week,day,true),now=await initialized(week,day);assert.equal(now.onHTML,old.onHTML,'whole outside-change ordinary HTML with commentary on');assert.equal(now.offHTML,old.offHTML,'whole ordinary HTML with commentary off');
  const optional=u=>u.includes('/chok/commentary/');const oldC=old.onRequests.filter(optional),newC=now.onRequests.filter(optional);
  const available=week==='בראשית';assert.equal(newC.length,available?1:0);assert.equal(oldC.length,available?1:3);
  assert.deepEqual(now.onRequests.filter(u=>!optional(u)),old.onRequests.filter(u=>!optional(u)),'every primary/other loader request unchanged');
  const label=week+'-'+day;if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,label+'.on.html'),now.onHTML);fs.writeFileSync(path.join(out,label+'.off.html'),now.offHTML);}
  results.push({week,day,available,sourceSHA256:now.sourceSHA256,onHTML:{bytes:Buffer.byteLength(now.onHTML),sha256:sha(now.onHTML)},offHTML:{bytes:Buffer.byteLength(now.offHTML),sha256:sha(now.offHTML)},oldOptionalRequests:oldC,newOptionalRequests:newC,sections:now.sections,allRequests:now.requests,completeOutsideChangeParity:true,registeredOffOn:true});
 }
 const recovered=await initialized('בא','יום שלישי',false,true);assert.equal(recovered.onRequests.filter(u=>u.includes('/chok/commentary/')).length,3,'stale actual initializer returns original fetch behavior');
 const evidence={cases:results,staleInitializer:true,inputPins:Object.fromEntries(inputPins),modeledDOM:true,native:false};if(out)fs.writeFileSync(path.join(out,'full-init.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
