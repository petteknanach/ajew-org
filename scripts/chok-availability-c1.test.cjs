// Narrow C1 regression, adapted after inspection of reviewer reproduction and
// qualified-earlier-parsha-test-dom.cjs. No build, ABI bridge or source writes.
// Run node --max-old-space-size=256 --test this file (see HANDOFF environment).
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const FIXTURE=process.env.C1_FIXTURE_ROOT||path.resolve(__dirname,'..');
const REPAIR=process.env.C1_REPAIR_ROOT||path.resolve(__dirname,'..');
const EXTRA=process.env.QUALIFIED_EXPORT_ROOT;
const {dependencies,documentFor,sandbox,until,visible}=require(path.join(FIXTURE,'scripts/qualified-earlier-parsha-test-dom.cjs'));
const baseCache=new Map();
function original(p){if(baseCache.has(p))return baseCache.get(p);let raw=null;
 for(const r of [EXTRA,FIXTURE].filter(Boolean))if(fs.existsSync(path.join(r,p))){raw=fs.readFileSync(path.join(r,p),'utf8');break;}
 if(raw===null)try{raw=cp.execFileSync('git',['show','513ab13d86abb63ae9f49ffbb2676f5715856463:'+p],{cwd:FIXTURE,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});}catch{}
 baseCache.set(p,raw);return raw;
}
const predecessorRoot=path.join(__dirname,'fixtures/chok-availability-c1-predecessor');
const predecessorPins=JSON.parse(fs.readFileSync(path.join(predecessorRoot,'manifest.json'),'utf8'));
function code(p,predecessor=false){
 if(predecessor&&Object.hasOwn(predecessorPins,p)){
  const raw=fs.readFileSync(path.join(predecessorRoot,p));
  assert.equal(raw.length,predecessorPins[p].bytes);
  assert.equal(require('node:crypto').createHash('sha256').update(raw).digest('hex'),predecessorPins[p].sha256,'historical predecessor fixture '+p);
  return raw.toString('utf8');
 }
 return !predecessor&&fs.existsSync(path.join(REPAIR,p))?fs.readFileSync(path.join(REPAIR,p),'utf8'):original(p);
}
// Historical code requires its actual authenticated predecessor policy inputs.
// Feeding today's author-revised policy to old fixed-pin code fails too early
// and cannot reproduce the newest-edition503 defect this fixture preserves.
const predecessorSourcePins={
 'public/reader/chumash-lh/part-1/torah-2.json':'829f0365b0e69674399da81b7bdc62bc53d91694d66e761b72510a6c08147ff5',
 'public/reader/chumash-lh/part-1/torah-3.json':'23045e573d6c66d971cc4c0e444b5a2526ad2abf540456225f48431a53812eaa',
 'public/reader/chok/noach-source-notes.json':'ad4e08beded1c460a9185377328969ee78371a0b8e78b46eb1533ba5fdfce2c5',
 'public/reader/chok/lech-lichuh-breslov-projections.json':'bc538f1cb338b813eb9a4f97e27bedf714ca3fbc55d851f5a483ad7da41af5c3',
 'public/reader/chok/breslov-reading-notes.json':'225902cfe308cb529a9c01d1aa98de972d336b4285fc83e47650b99932706080'
};
function transport(p,predecessor){
 if(!predecessor||!Object.hasOwn(predecessorSourcePins,p))return original(p);
 const raw=cp.execFileSync('git',['show','513ab13d86abb63ae9f49ffbb2676f5715856463:'+p],{cwd:FIXTURE,maxBuffer:32*1024*1024});
 const hash=require('node:crypto').createHash('sha256');for(let i=0;i<raw.length;i+=4096)hash.update(raw.subarray(i,i+4096));
 assert.equal(hash.digest('hex'),predecessorSourcePins[p],'historical source '+p);return raw.toString('utf8');
}
const ns=['qualified-1-109','qualified-110-171','qualified-172-269'];
const indexes=ns.map(n=>JSON.parse(original('public/data/breslov-parsha/'+n+'/index.json')));
const masters=indexes.map(i=>JSON.parse(original('public'+i.masterUrl)));
const newest='/data/breslov-parsha/qualified-172-269/';
function inject(url,raw,fault){if(!fault||url!==fault.url)return raw;
 if(fault.status)throw Error(String(fault.status));
 if(fault.mutate)return JSON.stringify(fault.mutate(JSON.parse(raw)));
 return fault.raw;
}
function helper(predecessor=false,fault){const h=sandbox(documentFor('<html><body></body></html>'),'/reader/chok/',()=>{});
 vm.runInContext(code('public/chok-verse-breslov.js',predecessor),h.box);
 const loader=async url=>{const u=url.split('?')[0],raw=transport('public'+u,predecessor);if(raw===null)throw Error('404');return inject(u,raw,fault);};
 return {h,api:h.box.window.ChokVerseBreslov,loader};
}
async function loaded(predecessor=false,fault){const run=helper(predecessor,fault);try{await run.api.load(run.loader,JSON.parse(original('public/reader/chumash-lh/part-1/torah-2.json')),JSON.parse(original('public/reader/chok/noach-source-notes.json')));return run;}catch(e){run.h.close();throw e;}}
async function boot(week,fault,predecessor=false,focused=false){
 const template=code('src/pages/reader/chok.astro',predecessor),inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const d=documentFor('<html><body>'+inner+'</body></html>');let active=0,peak=0,failed=0;const requests=[];
 const h=sandbox(d,'/reader/chok/',async url=>{const u=String(url).split('?')[0];requests.push(u);active++;peak=Math.max(peak,active);
  try{await new Promise(r=>setTimeout(r,1));let raw=transport('public'+u,predecessor);try{raw=inject(u,raw,fault);}catch(e){failed++;return {ok:false,status:Number(e.message),text:async()=>'',json:async()=>null};}
   return {ok:raw!==null,status:raw===null?404:200,text:async()=>raw,json:async()=>JSON.parse(raw),arrayBuffer:async()=>{const b=Buffer.from(raw||'','utf8');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};
  }finally{active--;}
 });
 // Test-local browser transport: resolve, authenticate and evaluate before load.
 const append=d.head.appendChild.bind(d.head);
 d.head.appendChild=function(n){append(n);if(n.tagName==='script')Promise.resolve().then(()=>{
  try{const u=String(n.src||n.getAttribute('src')).split('?')[0],raw=inject(u,transport('public'+u,predecessor),fault);assert.notEqual(raw,null,'dynamic script exists');const b=Buffer.from(raw,'utf8');
   assert.equal(n.integrity,'sha256-'+require('node:crypto').createHash('sha256').update(b).digest('base64'),'actual script SRI');vm.runInContext(b.toString('utf8'),h.box,{filename:u});if(n.onload)n.onload();
  }catch(e){if(n.onerror)n.onerror(e);}
 });return n;};
 h.box.location.search='?week='+encodeURIComponent(week)+'&day='+encodeURIComponent('יום ראשון')+(focused?'&sec=torah':'');
 try{for(const m of template.matchAll(/<script src="([^"?]+)[^"]*" defer><\/script>/g))vm.runInContext(code('public'+m[1],predecessor),h.box,{filename:m[1]});
  await until(()=>!!d.querySelector('#ck-content').innerHTML&&!d.querySelector('.ck-loading'),30000);
  return {d,h,api:h.box.window.ChokVerseBreslov,peak,failed,requests};
 }catch(e){h.close();throw e;}
}
function good(run){assert(run.d.querySelector('[data-sec="torah"]'),'ordinary Torah rendered');assert(!run.d.querySelector('#ck-content .ck-error'));assert(run.peak<=6,'shared request queue peak '+run.peak);}
function unavailable(run,week,edition){assert(run.api.has(week),'failed edition retains has() reservation');assert(run.api.parsha(week));assert.equal(run.api.verse(week,'tanach-bereishit',32,1),'');
 const notices=run.d.querySelectorAll('#ck-breslov-availability [data-breslov-unavailable]');assert(notices.some(n=>n.getAttribute('data-breslov-unavailable')===edition&&visible(n)),'notice visible without opening offering');
 assert.equal(run.d.querySelector('#ck-breslov-offering-body').querySelectorAll('[data-bop-unit]').length,0,'failed source bodies absent');
 assert(!run.d.querySelector('#ck-breslov-offering-body').textContent.includes('Daily Breslov study'),'not unselected weekly branch');
 assert.equal(run.d.querySelector('#ck-content').querySelectorAll('.ck-breslov').length,0,'legacy Breslov commentary suppressed');
}
function assertOwners(doc,units){const owners=doc.querySelectorAll('[data-bop-unit]');assert.equal(owners.length,units.length);
 for(const u of units){const el=owners.find(n=>n.getAttribute('data-bop-unit')===u.id);assert(el,u.id);assert.equal(el.getAttribute('data-owner-main-id'),String(u.owner_main_id??u.ownerMainId??'null'));
  const ps=el.querySelectorAll('.ck-source-pair');assert.equal(ps.length,u.pairs.length);u.pairs.forEach((p,i)=>{assert.equal(ps[i].getAttribute('data-pair-id'),p.id);assert.equal(ps[i].querySelector('.ck-he').textContent,p.he);assert.equal(ps[i].querySelector('.ck-en').textContent,p.en);});
  assert.equal(el.querySelectorAll('[data-note-id]').length,u.qualifications.length);u.qualifications.forEach((q,i)=>{const n=el.querySelectorAll('[data-note-id]')[i];assert.equal(n.querySelector('[data-note-text]').textContent,q.text);assert(!n.closest('.ck-qualified-disclosure'));});
  assert(!el.querySelector('.ck-qualified-disclosure').open);
 }
}
test('preserve reviewer observation: predecessor newest master503 aborts actual Noach init',async()=>{
 const r=await boot('נח',{url:newest+'master.json',status:503},true);try{assert(!r.d.querySelector('[data-sec="torah"]'));assert(r.d.querySelector('.ck-error').textContent.includes('Could not load schedule'));assert.equal(r.failed,3);console.log('PRESERVED_DEFECT_OBSERVATION '+JSON.stringify({failedRequests:r.failed,torahRendered:false,error:r.d.querySelector('.ck-error').textContent}));}finally{r.h.close();}
});
test('healthy exact parent-selected earlier239 and author-rebound Noach/Lech116 policy',async()=>{
 const a=await loaded();try{
  const selected=await a.api.loadQualified(a.loader),old=masters.slice(0,2).flatMap(m=>m.units);assert.equal(old.length,239);
  let selectedCount=0;for(const index of indexes.slice(0,2))for(const [slug,c] of Object.entries(index.parshas)){
   if(['noach','lech-lecha'].includes(slug))continue;
   const expected=[...c.mainIds,...c.apparatusIds].map(id=>old.find(u=>u.id===id));assert.deepEqual(JSON.parse(JSON.stringify(selected[c.titleHe].source.units)),expected);selectedCount+=expected.length;
  }
  const policy=JSON.parse(original('public/reader/chok/breslov-reading-notes.json'));assert.equal(policy.notes.length,116);
  assert(!policy.notes.some(n=>n.id==='C-P087-01::qualification::/qualifications/0'));
  assert.equal(policy.notes.find(n=>n.id==='C-P099-02::qualification::/currentQualifications/0').readerText,'The Yiddish designation אָן זֶעצִירְס is retained literally; no English expansion is supplied.');
  for(const week of ['בראשית','נח','לך לך','וירא','חיי שרה','תולדות','ויצא'])assert.equal(a.api.availability(week),'');
  // Earlier policy evidence predates the author's two decisions. Test exact current
  // selected sources and all current projected notes, not equality to stale prose.
  for(const [week,num,portion] of [['נח',2,'Noach'],['לך לך',3,'Lech']]){
   const src=JSON.parse(original('public/reader/chumash-lh/part-1/torah-'+num+'.json'));
   const expected=src.units.map(u=>({...u,qualifications:u.qualifications.map(q=>{const note=policy.notes.find(n=>n.portion===portion&&n.id===q.id&&n.owner===u.id);assert(note);assert(note.readerText===null||typeof note.readerText==='string');return {...q,text:note.readerText};}).filter(q=>q.text!==null)}));
   assertOwners(documentFor(a.api.weekly(week)),expected);
  }
  console.log('EARLIER239_AND_AUTHOR_POLICY116 '+JSON.stringify({sourceOwners:old.length,chokQualifiedOwnersExcludingPolicyIslands:selectedCount,selectedPolicyDispositions:policy.notes.length}));
 }finally{a.h.close();}
});
test('healthy complete118 in narrow real-template full init of each of five weeks',async()=>{
 let owners=0,pairs=0,notes=0,statuses=0,held=0;
 for(const [slug,c] of Object.entries(indexes[2].parshas)){const r=await boot(c.titleHe);try{good(r);assert.equal(r.api.availability(c.titleHe),'');const selected=[...c.mainIds,...c.apparatusIds].map(id=>masters[2].units.find(u=>u.id===id));const weekly=r.d.querySelector('#ck-breslov-offering-body');assertOwners(weekly,selected);assert(!weekly.querySelector('.ck-breslov').open);
  owners+=selected.length;pairs+=selected.reduce((n,u)=>n+u.pairs.length,0);notes+=selected.reduce((n,u)=>n+u.qualifications.length,0);
  const ss=weekly.querySelectorAll('[data-source-status]');statuses+=ss.length;held+=ss.filter(n=>n.getAttribute('data-source-status').startsWith('held')).length;
  for(const u of selected)for(const p of u.pairs)for(const lang of ['he','en']){const n=weekly.querySelectorAll('[data-source-status]').find(n=>n.getAttribute('data-note-owner')===u.id&&n.getAttribute('data-note-pair')===p.id&&n.getAttribute('data-field-language')===lang);assert(n);assert.equal(n.getAttribute('data-source-status'),p.sourceStatus[lang]);}
 }finally{r.h.close();}}
 // Only these three author-approved fields moved out of held status.
 for(const [owner,pair,lang]of [['NB-M019','NB-M019:P002','he'],['NB-M031','source-authoring-3--NB-M031--p013','he'],['NB-M031','source-authoring-3--NB-M031--p013','en']]){
  assert.equal(masters[2].units.find(u=>u.id===owner).pairs.find(p=>p.id===pair).sourceStatus[lang],'qualified',owner+' '+pair+' '+lang);
 }
 assert.deepEqual({owners,pairs,notes,statuses,held},{owners:118,pairs:732,notes:1738,statuses:1464,held:410});console.log('ACTUAL_TEMPLATE_HEALTHY118 '+JSON.stringify({owners,pairs,notes,statuses,held}));
});
const faults=[
 {name:'newest index503',url:newest+'index.json',status:503},
 {name:'newest master503',url:newest+'master.json',status:503},
 {name:'newest index404',url:newest+'index.json',status:404},
 {name:'newest index corrupt JSON',url:newest+'index.json',raw:'{broken'},
 {name:'newest index corrupt schema',url:newest+'index.json',raw:'{"schema":"corrupt"}'},
 {name:'newest master corrupt schema',url:newest+'master.json',raw:'{"schema":"corrupt"}'},
 {name:'newest master corrupt JSON',url:newest+'master.json',raw:'null'},
];
for(const fault of faults)test(fault.name+' isolates actual Noach init and actual affected new week',async()=>{
 for(const week of ['נח','וישלח']){const r=await boot(week,fault);try{good(r);assert(r.api.has('וירא'));assert(r.api.weekly('וירא').includes('data-bop-unit'));assert(!r.api.availability('וירא'));assert(r.api.weekly('נח').includes('data-bop-unit'));assert(!r.api.availability('נח'));assert.equal(r.api.availability('לך לך'),'');
  if(week==='וישלח')unavailable(r,week,'qualified-172-269');else assert.equal(r.d.querySelectorAll('#ck-breslov-availability [data-breslov-unavailable]').length,0);
 }finally{r.h.close();}}
});
for(const [url,week,edition,other] of [
 ['/reader/chumash-lh/part-1/torah-3.json','לך לך','reviewed-lech-lichuh','נח'],
 ['/reader/chok/lech-lichuh-breslov-projections.json','לך לך','reviewed-lech-lichuh','נח'],
 ['/reader/chumash-lh/part-1/torah-2.json','נח','reviewed-noach','לך לך'],
 ['/reader/chok/noach-source-notes.json','נח','reviewed-noach','לך לך'],
 ['/reader/chok/breslov-reading-notes.json','נח','reviewed-noach',null],
])for(const mode of ['503','pin-integrity'])test(url+' '+mode+' isolated from daily and unrelated qualified sources',async()=>{
 const fault=mode==='503'?{url,status:503}:{url,raw:original('public'+url)+' '};
 const r=await boot(week,fault);try{good(r);unavailable(r,week,edition);assert(r.api.weekly('וישלח').includes('data-bop-unit'));assert.equal(r.api.availability('וישלח'),'');if(other){assert.equal(r.api.availability(other),'');assert(r.api.weekly(other).includes('data-bop-unit'));}else{assert(r.api.availability('לך לך').includes('reviewed-lech-lichuh'));}if(mode==='pin-integrity')assert(r.api.availability(week).includes('changed'));
 }finally{r.h.close();}
});
for(const n of ns.slice(0,2))for(const suffix of ['index.json','master.json'])test(n+'/'+suffix+'503 isolates other valid editions in real init',async()=>{
 const r=await boot('וישלח',{url:'/data/breslov-parsha/'+n+'/'+suffix,status:503});try{good(r);assert(r.api.weekly('וישלח').includes('data-bop-unit'));assert.equal(r.api.availability('וישלח'),'');const affected=n===ns[0]?'בראשית':'וירא';assert(r.api.has(affected));assert(r.api.availability(affected).includes(n));assert(!r.api.weekly(affected).includes('data-bop-unit'));assert.equal(r.api.availability('נח'),'');assert.equal(r.api.availability('לך לך'),'');}finally{r.h.close();}
});
test('portion corruption fails closed locally; sibling portions remain authentic',async()=>{
 const r=await loaded(false,{url:newest+'master.json',mutate:m=>{m.units.find(u=>u.parsha==='vayishlach').pairs[0].he=null;return m;}});try{assert(r.api.has('וישלח'));assert(r.api.availability('וישלח'));assert(!r.api.weekly('וישלח').includes('data-bop-unit'));for(const c of Object.values(indexes[2].parshas).slice(1)){assert.equal(r.api.availability(c.titleHe),'');assert(r.api.weekly(c.titleHe).includes('data-bop-unit'));}}finally{r.h.close();}
});
test('ordinary/focused boundaries stay intact; mandatory daily integrity remains fail-closed',async()=>{
 const a=await boot('וישלח',{url:newest+'master.json',status:503},false,true);try{good(a);assert.equal(a.d.querySelector('#ck-breslov-offering-body').innerHTML,'');assert.equal(a.d.querySelector('#ck-breslov-availability').innerHTML,'');assert(a.api.has('וישלח'));assert.equal(a.d.querySelector('#ck-content').querySelectorAll('.ck-breslov').length,0);}finally{a.h.close();}
 const b=await boot('נח',{url:'/reader/chok/noach-week.json',raw:original('public/reader/chok/noach-week.json')+' '});try{assert(!b.d.querySelector('[data-sec="torah"]'));assert(b.d.querySelector('.ck-error').textContent.includes('Source changed'));}finally{b.h.close();}
});
test('synthetic transport overlap only: exact authenticated bodies dedupe; failed edition cannot displace valid selection',async()=>{
 // A controlled index/master overlap fixture, NOT an asserted source edition or
 // source-owner reassignment. Source objects are copied byte-for-value only.
 const slug='vayishlach',coverage=indexes[2].parshas[slug],ids=[...coverage.mainIds,...coverage.apparatusIds];
 const units=ids.map(id=>masters[2].units.find(u=>u.id===id));
 for(const mode of ['healthy','newest503','conflict']){const r=helper();try{
  const loader=async url=>{const u=url.split('?')[0];
   if(u==='/data/breslov-parsha/qualified-110-171/index.json'){const i=structuredClone(indexes[1]);i.parshas[slug]=coverage;return JSON.stringify(i);}
   if(u==='/data/breslov-parsha/qualified-110-171/master.json'){const m=structuredClone(masters[1]);m.units.push(...structuredClone(units));if(mode==='conflict')m.units.at(-1).pairs[0].he+=' [explicit synthetic conflict]';return JSON.stringify(m);}
   if(u===newest+'master.json'&&mode==='newest503')throw Error('503');
   return r.loader(url);
  };
  const selections=await r.api.loadQualified(loader),s=selections[coverage.titleHe];
  if(mode==='conflict'){assert.equal(s.source.units.length,0);assert(s.unavailable.some(f=>f.reason.includes('Conflicting')));assert(selections['וירא'].source.units.length);}
  else{assert.deepEqual(JSON.parse(JSON.stringify(s.source.units)),units);assert.equal(s.unavailable.length,mode==='newest503'?1:0);}
 }finally{r.h.close();}}
});
test('synchronous acquisition and validation errors are observed per edition',async()=>{
 const r=helper();try{const raw=r.loader;await r.api.load(url=>{if(url.startsWith('/reader/chok/breslov-reading-notes.json'))throw Error('synchronous transport failure');return raw(url);},JSON.parse(original('public/reader/chumash-lh/part-1/torah-2.json')),JSON.parse(original('public/reader/chok/noach-source-notes.json')));
  assert(r.api.has('נח'));assert(r.api.availability('נח').includes('synchronous transport failure'));assert(r.api.availability('לך לך'));assert(r.api.weekly('וישלח').includes('data-bop-unit'));assert.equal(r.api.availability('וישלח'),'');
 }finally{r.h.close();}
});
test('changed template compiles without ABI transformation; three script pins only',async()=>{
 const raw=code('src/pages/reader/chok.astro'),compiler=dependencies('@astrojs/compiler');const compiled=await compiler.transform(raw,{filename:'src/pages/reader/chok.astro'});assert(!compiled.diagnostics.some(x=>x.severity===1));
 const versions={'chok.js':'e540c2702d2e7af86f11fbe7305666f179fc0b867c09de227906d558b1c44da6','chok-verse-breslov.js':'parsha-author-20261020-reader-notes-r1','chok-source-reader.js':'chok-live-corrections-20261020-r1'};
 for(const [p,v]of Object.entries(versions)){new vm.Script(code('public/'+p));assert(raw.includes('/'+p+'?v='+v));assert.equal(raw.split('/'+p+'?v='+v).length-1,1);}
});
