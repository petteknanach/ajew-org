#!/usr/bin/env node
'use strict';
// Portable real-input/full-init HTML5 DOM qualification; NOT browser/paint proof.
// Usage: node --max-old-space-size=256 scripts/verify-chok-verse-breslov.cjs
// Optional --script-root <baseline> selects ALL historical scripts/template.
// Optional --evidence <dir> saves inventories and exact initialized HTML.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {documentFor,sandbox,until,visible}=require('./qualified-earlier-parsha-test-dom.cjs');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const option=k=>args.includes(k)?path.resolve(args[args.indexOf(k)+1]):null;
const scripts=option('--script-root')||root,evidence=option('--evidence');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const dataReads=new Map();
function read(relative){
 const p=path.join(root,relative);let raw,origin;
 if(fs.existsSync(p)){raw=fs.readFileSync(p,'utf8');origin='worktree';}
 else {try{raw=execFileSync('git',['show','HEAD:'+relative],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});origin='immutable HEAD blob';}catch{return null;}}
 dataReads.set(relative,{path:relative,origin,bytes:Buffer.byteLength(raw),sha256:sha(raw)});return raw;
}
const json=p=>JSON.parse(read(p));
const weeks=['נח','לך לך'],schedule=json('public/reader/chok/schedule.json'),book=json('public/reader/medooyuk/tanach-bereishit.json');
const sources=weeks.map((w,i)=>json('public/reader/chumash-lh/part-1/torah-'+(i+2)+'.json'));
const projection=fs.existsSync(path.join(root,'public/reader/chok/lech-lichuh-breslov-projections.json'))?json('public/reader/chok/lech-lichuh-breslov-projections.json'):null;
const noachNotes=json('public/reader/chok/noach-source-notes.json');
const displays=new Map(noachNotes.notes.map(q=>[q.id,q.displayText]));
if(projection)for(const q of projection.rows)displays.set(q.id,q.after);
const readingNotes=json('public/reader/chok/breslov-reading-notes.json');
for(const q of readingNotes.notes)displays.set(q.id,q.readerText);
function save(name,value){if(evidence){fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');}}
function refsFor(w,day){const t=schedule.weeks[w].days[day].torah;const out=[];for(let c=t.from.c;c<=t.to.c;c++)for(const v of Object.keys(book.ch[c]).map(Number).sort((a,b)=>a-b))if((c!==t.from.c||v>=t.from.v)&&(c!==t.to.c||v<=t.to.v))out.push(c+':'+v);return out;}
function ownersFor(source,ref){const [c,v]=ref.split(':').map(Number);const mains=source.units.filter(u=>u.sourceKind==='main'&&u.verseRef?.book==='bereishit'&&u.verseRef.chapter===c&&u.verseRef.verse===v);return mains.flatMap(m=>[m,...source.units.filter(u=>u.sourceKind!=='main'&&u.owner_main_id===m.id)]);}
function unitInventory(u){return {id:u.id,sourceKind:u.sourceKind,owner_main_id:u.owner_main_id,verseRef:u.verseRef,pairs:u.pairs.map((p,i)=>({id:p.id,ordinal:i,heSHA256:sha(p.he),enSHA256:sha(p.en)})),qualifications:u.qualifications.map(q=>({...q,displayDisposition:displays.get(q.id)===null?'private-production-note':'reader-note',displayText:displays.get(q.id)||null,displaySHA256:typeof displays.get(q.id)==='string'?sha(displays.get(q.id)):null}))};}
const inventory=sources.map((s,i)=>({week:weeks[i],sourceSHA256:sha(read('public/reader/chumash-lh/part-1/torah-'+(i+2)+'.json')),units:s.units.map(unitInventory)}));
const days=weeks.flatMap((w,i)=>Object.keys(schedule.weeks[w].days).map(day=>({week:w,day,refs:refsFor(w,day),verses:refsFor(w,day).map(ref=>({ref,owners:ownersFor(sources[i],ref).map(unitInventory)}))})));
assert.equal(days.length,14);
async function boot(w,day,focused){
 const template=fs.readFileSync(path.join(scripts,'src/pages/reader/chok.astro'),'utf8');
 // The authentic template's static inner Layout markup, without executing Layout.
 const inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const d=documentFor('<html><body>'+inner+'</body></html>');let active=0,peak=0;
 const env=sandbox(d,'/reader/chok/',async url=>{active++;peak=Math.max(peak,active);const rel='public'+decodeURIComponent(String(url).split('?')[0]);const raw=read(rel);await new Promise(r=>setTimeout(r,1));active--;return {ok:raw!==null,status:raw===null?404:200,text:async()=>raw,json:async()=>JSON.parse(raw),arrayBuffer:async()=>{const b=Buffer.from(raw,'utf8');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};});
 // Model the actual dynamic script transport, including SRI and load/error events.
 // Newly qualified weeks use this browser path; a plain head append cannot settle it.
 const appendHead=d.head.appendChild;
 d.head.appendChild=function(n){
  appendHead.call(this,n);
  if(String(n.tagName).toLowerCase()==='script'&&n.src){
   env.box.fetch(n.src).then(async response=>{
    assert(response.ok,'Dynamic script response must succeed');
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(n.integrity,'sha256-'+crypto.createHash('sha256').update(bytes).digest('base64'),'Dynamic script SRI');
    vm.runInContext(bytes.toString('utf8'),env.box,{filename:n.src});
    if(typeof n.onload==='function')n.onload();
   }).catch(error=>{if(typeof n.onerror==='function')n.onerror(error);});
  }
  return n;
 };
 env.box.location.search='?week='+encodeURIComponent(w)+'&day='+encodeURIComponent(day)+(focused?'&sec=torah':'');
 // Real annotation helpers, actual source adapter, full actual init and callbacks.
 // Parse each actual external deferred tag with the fixture's HTML5 parser.
 // Attribute order, Astro is:inline and browser SRI attributes must not hide it.
 const tags=Array.from(documentFor(template).querySelectorAll('script')).filter(n=>n.getAttribute('src')!==null&&n.getAttribute('defer')!==null);
 try{for(const tag of tags){const url=tag.getAttribute('src');assert(url.startsWith('/')&&!url.startsWith('//'),'Same-origin static script');const parsed=new URL(url,'https://ajew.org');assert.equal(parsed.origin,'https://ajew.org','Same-origin static script');const relative=parsed.pathname;const p=path.join(scripts,'public',relative);const code=fs.existsSync(p)?fs.readFileSync(p,'utf8'):read('public'+relative);assert(code,'Missing real script '+url);const integrity=tag.getAttribute('integrity');if(integrity!==null)assert.equal(integrity,'sha256-'+crypto.createHash('sha256').update(code).digest('base64'),'Static script SRI '+url);vm.runInContext(code,env.box,{filename:url});}
 await until(()=>!!d.querySelector('#ck-content').innerHTML&&!d.querySelector('.ck-loading'),20000);
 assert(!d.querySelector('#ck-content').textContent.includes('Could not load'),d.querySelector('#ck-content').textContent.slice(0,500));
 return {d,env,peak:()=>peak};}catch(e){env.close();throw e;}
}
function checkOwner(node,u){
 assert(node,'Missing owner '+u.id);assert.equal(node.getAttribute('data-owner-main-id'),u.owner_main_id===null?'null':u.owner_main_id);
 assert(!node.querySelector('.ck-qualified-disclosure').open,'Owner body initially closed '+u.id);
 const ps=node.querySelectorAll('[data-pair-id]');assert.equal(ps.length,u.pairs.length,u.id+' pair count');
 u.pairs.forEach((p,i)=>{assert.equal(ps[i].getAttribute('data-pair-id'),p.id);assert.equal(ps[i].querySelector('.ck-he').textContent,p.he);assert.equal(ps[i].querySelector('.ck-en').textContent,p.en);});
 const kept=u.qualifications.filter(q=>displays.get(q.id)!==null);
 const qs=node.querySelectorAll('[data-note-id]');assert.equal(qs.length,kept.length,u.id+' reader-note count');
 kept.forEach((q,i)=>{const n=qs[i];assert.equal(n.getAttribute('data-note-id'),q.id);assert.equal(n.getAttribute('data-note-owner'),u.id);assert.equal(n.getAttribute('data-note-pair'),q.pair_id===null?'null':q.pair_id);assert.equal(n.getAttribute('data-note-placement'),q.placement);assert.equal(n.querySelector('[data-note-text]').textContent,displays.get(q.id));if(q.placement==='after_pair')assert.equal(n.querySelector('small').textContent,'Paragraph '+(u.pairs.findIndex(p=>p.id===q.pair_id)+1)+':');assert(!n.closest('.ck-qualified-disclosure'),'Owner note hidden by own body '+q.id);assert(!n.closest('.ck-he')&&!n.closest('.ck-en'));assert(visible(n),'Owner note unreachable '+q.id);});
}
function contract(run,record,focus){const {d}=run,s=sources[weeks.indexOf(record.week)];
 const torah=d.querySelector('[data-sec="torah"]');assert(torah,'Torah section');
 const verses=torah.querySelectorAll('.ck-verse');assert.deepEqual(verses.map(v=>v.getAttribute('data-verse-ref')),record.refs);
 for(const v of verses){const ref=v.getAttribute('data-verse-ref'),expected=ownersFor(s,ref),panel=v.querySelector('.ck-verse-breslov');
 if(!expected.length){assert(!panel,'No teaching may be invented for '+ref);continue;}
 assert(panel,'Missing inline '+record.week+' '+ref);assert(!panel.open,'Initially closed '+ref);assert(!panel.closest('.ck-verse-access'),'Breslov must be full-width, outside link nav');
 assert(visible(panel.querySelector('summary')),'Default Breslov summary is unreachable');
 const access=v.querySelector('.ck-verse-access');assert(access);assert(v.children.indexOf(access)<v.children.indexOf(panel));
 for(const prev of v.querySelectorAll('.ck-rashi,.ck-super,.ck-comm'))assert(v.innerHTML.indexOf(prev.innerHTML)<v.innerHTML.indexOf(panel.innerHTML),'After Rashi/supercommentary');
 panel.open=true;
 assert(!panel.querySelector('[data-breslov-scope]'),'Selection/production correspondence must not enter the study product');
 const nodes=panel.querySelectorAll('[data-bop-unit]');assert.deepEqual(nodes.map(n=>n.getAttribute('data-bop-unit')),expected.map(u=>u.id));
 expected.forEach((u,i)=>checkOwner(nodes[i],u));
 for(const lang of ['he','en','both']){const b=panel.querySelector('[data-ck-source-lang="'+lang+'"]');assert(visible(b));b.click();assert.equal(panel.getAttribute('data-language'),lang);for(const n of panel.querySelectorAll('.ck-he,.ck-en'))assert.equal(n.hidden,lang!=='both'&&!n.classList.contains(lang==='he'?'ck-he':'ck-en'));expected.forEach((u,i)=>checkOwner(nodes[i],u));}
 panel.open=false;
 }
 assert(!d.querySelectorAll('.ck-onkelos-translation').some(n=>n.open),'Focus must not open Onkelos translations');
 const ids=d.querySelectorAll('[id]').map(n=>n.id);assert.equal(new Set(ids).size,ids.length,'Unique IDs across inline and weekly namespaces');
 if(!focus){const offer=d.getElementById('ck-breslov-offering');offer.open=true;const weekly=offer.querySelector('.ck-breslov');assert(weekly,'Weekly offering');weekly.open=true;assert(!weekly.querySelector('[data-breslov-scope]'),'No production scope in weekly study');
 weekly.querySelectorAll('.ck-weekly-unowned').forEach(n=>n.open=true);
 const ns=weekly.querySelectorAll('[data-bop-unit]');assert.deepEqual(ns.map(n=>n.getAttribute('data-bop-unit')),s.units.map(u=>u.id));s.units.forEach((u,i)=>checkOwner(ns[i],u));
 if(record.week==='נח'){
  const supplement=weekly.querySelector('.ck-breslov-supplement');assert(supplement,'Preserve Noach supplement');
  const segs=supplement.querySelectorAll('[data-supplement-segment]');assert.equal(segs.length,s.sourceSupplement.segments.length);
  s.sourceSupplement.segments.forEach((s,i)=>{assert.equal(segs[i].querySelector('a').href,s.sourceUrl);assert.equal(segs[i].querySelector('.ck-he').textContent,s.he);assert.equal(segs[i].querySelector('.ck-en').textContent,s.en);if(s.commentary){const c=segs[i].querySelector('.ck-supplement-gematria');assert.equal(c.querySelector('.ck-he').textContent,s.commentary.he);assert.equal(c.querySelector('.ck-en').textContent,s.commentary.en);}});
 }
 assert.equal(d.getElementById('ck-full-parsha').href,record.week==='נח'?'/parsha/noach/':'/parsha/lech-lecha/');
 }
 assert(run.peak()<=6,'Shared six-fetch concurrency bound');
}
async function lifecycle(){
 const r=await boot('לך לך','יום ראשון',false);
 try{
  contract(r,days.find(x=>x.week==='לך לך'&&x.day==='יום ראשון'),false);
  const d=r.d,inline=d.querySelector('.ck-verse-breslov'),weekly=d.querySelector('.ck-breslov');
  inline.open=true;inline.querySelector('[data-ck-source-lang="he"]').click();
  assert.equal(weekly.getAttribute('data-language'),'both','Inline/weekly preferences isolated');
  weekly.querySelector('[data-ck-source-lang="en"]').click();assert.equal(inline.getAttribute('data-language'),'he');
  const change=async(id,value)=>{const n=d.getElementById(id);n.value=value;n.dispatchEvent({type:'change'});await until(()=>!d.querySelector('.ck-loading'),20000);assert(!d.getElementById('ck-content').textContent.includes('Could not load'));};
  for(const language of ['he','en','original','both']){await change('ck-language',language);const p=d.querySelector('.ck-verse-breslov');assert(!p.open);assert.equal(p.getAttribute('data-language'),'he');p.open=true;assert(p.querySelectorAll('[data-note-id]').length>0);for(const q of p.querySelectorAll('[data-note-id]'))assert(visible(q));}
  // Reset independent source preferences before equality checks.
  d.querySelector('.ck-verse-breslov [data-ck-source-lang="both"]').click();
  for(const w of weeks){await change('ck-parsha',w);for(const day of Object.keys(schedule.weeks[w].days)){await change('ck-day',day);contract(r,days.find(x=>x.week===w&&x.day===day),false);assert.equal(d.querySelectorAll('.ck-breslov').length,1,'No stale weekly source panel');}}
  // Latest callback wins even when two actual redraws overlap.
  for(const day of ['יום ראשון','יום שישי']){const n=d.getElementById('ck-day');n.value=day;n.dispatchEvent({type:'change'});}
  await until(()=>!d.querySelector('.ck-loading'),20000);contract(r,days.find(x=>x.week==='לך לך'&&x.day==='יום שישי'),false);
 }finally{r.env.close();}
}
async function validatorControls(){
 const r=await boot('לך לך','יום ראשון',false);
 try{
  const api=r.env.box.window.ChokVerseBreslov;assert(api,'Candidate verse adapter available');
  const validate=(s,p,l)=>Promise.resolve().then(()=>api.validate(s,p,l));
  await validate(sources[1],projection,true);await validate(sources[0],noachNotes,false);
  const mutations={
   'missing note':(s,p)=>p.rows.pop(),
   'wrong note owner':(s,p)=>p.rows[0].owner='wrong',
   'wrong pair':(s,p)=>p.rows[1].pair_id='wrong',
   'wrong placement':(s,p)=>p.rows[1].placement='after_owner',
   'drifted original note':(s,p)=>s.units[0].qualifications[0].text+=' drift',
   'drifted displayed note':(s,p)=>p.rows[0].after+=' drift',
   'missing pair binding':(s,p)=>p.rows[0].pairs.pop(),
   'wrong pair binding':(s,p)=>p.rows[0].pairs[0].id='wrong',
   'drifted HE pair':s=>s.units[0].pairs[0].he+=' drift',
   'drifted EN pair':s=>s.units[0].pairs[0].en+=' drift',
   'scope drift':(s,p)=>p.scopeAfter+=' drift'
  };
  for(const [name,mutate] of Object.entries(mutations)){const s=structuredClone(sources[1]),p=structuredClone(projection);mutate(s,p);await assert.rejects(validate(s,p,true),undefined,name);await validate(sources[1],projection,true);}
  for(const field of ['owner','pair_id','placement','displayText']){const p=structuredClone(noachNotes);p.notes[0][field]='wrong';await assert.rejects(validate(sources[0],p,false));}
  // Explicitly synthetic null-main case: real sources have no null-ref mains.
  const nullMain=structuredClone(sources[1]);const m=nullMain.units.find(u=>u.id==='C-P077-02');m.verseRef=null;
  const mapped=api.mapped(nullMain,'tanach-bereishit',12,1);assert(!mapped.some(u=>u.id===m.id||u.owner_main_id===m.id));
  assert.equal(api.mapped(sources[1],'tanach-bereishit',12,1).filter(u=>u.sourceKind==='main').length,7);
  assert.equal(api.mapped(sources[1],'tanach-bereishit',12,2).length,0,'No inferred secondary-quotation assignment');
  assert(!api.mapped(sources[1],'tanach-bereishit',12,1).some(u=>u.sourceKind!=='main'&&u.owner_main_id===null));
  // Exercise the exact HTML equality/locality detector against damaged copies.
  const panel=r.d.querySelector('.ck-verse-breslov');panel.open=true;
  const u=sources[1].units.find(u=>u.id==='C-P077-01'),html=panel.querySelector('[data-bop-unit="'+u.id+'"]').innerHTML;
  for(const mutate of [n=>n.querySelector('[data-pair-id]').remove(),n=>n.querySelector('[data-note-id]').remove(),n=>n.querySelector('.ck-en').textContent+=' drift',n=>n.querySelector('[data-note-id]').setAttribute('data-note-owner','wrong'),n=>{const q=n.querySelector('[data-note-id]');q.remove();n.querySelector('.ck-qualified-disclosure').appendChild(q);}]){
   const d=documentFor('<article data-owner-main-id="null">'+html+'</article>'),n=d.querySelector('article');mutate(n);assert.throws(()=>checkOwner(n,u));
  }
  checkOwner(panel.querySelector('[data-bop-unit="'+u.id+'"]'),u);
  const before=panel.innerHTML,scope=r.d.createElement('aside');scope.setAttribute('data-breslov-scope','injected-production-note');scope.textContent=readingNotes.scopes.Lech;panel.appendChild(scope);panel.open=false;assert.throws(()=>contract(r,days.find(x=>x.week==='לך לך'&&x.day==='יום ראשון'),false),/Selection\/production correspondence must not enter the study product/);panel.innerHTML=before;
  return {validatorNegatives:Object.keys(mutations).length+4,domNegatives:6,nullMain:'explicit synthetic fixture; real null apparatus retained weekly'};
 }finally{r.env.close();}
}
function canonicalParity(){
 const master=json('public/data/breslov-parsha/qualified-1-109/master.json'),index=json('public/data/breslov-parsha/qualified-1-109/index.json');
 const byId=new Map(master.units.map(u=>[u.id,u]));
 sources.forEach((s,i)=>{const coverage=index.parshas[i?'lech-lecha':'noach'];assert.deepEqual([...s.units.map(u=>u.id)].sort(),[...coverage.mainIds,...coverage.apparatusIds].sort());
 for(const u of s.units)for(const field of ['sourceKind','owner_main_id','verseRef','pairs','qualifications'])assert.deepEqual(u[field],byId.get(u.id)[field],u.id+' master parity '+field);
 });
 return {canonicalParshaChumashEquality:true,owners:sources.reduce((n,s)=>n+s.units.length,0),pairs:sources.reduce((n,s)=>n+s.units.reduce((a,u)=>a+u.pairs.length,0),0)};
}
async function main(){let failures=0;const results=[];
 for(const focused of [false,true])for(const record of days){const name=record.week+'|'+record.day+'|'+(focused?'focused':'ordinary');let run;
 try{run=await boot(record.week,record.day,focused);save('html-'+weeks.indexOf(record.week)+'-'+Object.keys(schedule.weeks[record.week].days).indexOf(record.day)+'-'+(focused?'focus':'day')+'.html',run.d.innerHTML);contract(run,record,focused);results.push({name,status:'PASS',peakFetch:run.peak()});console.log('PASS '+name);}
 catch(e){failures++;results.push({name,status:'FAIL',error:e.message,stack:e.stack});console.log('FAIL '+name+' '+e.message);}
 finally{run?.env.close();if(typeof global.gc==='function')global.gc();}
 }
 for(const [name,fn] of [['canonical Parsha/Chumash complete source/owner/pair/qualification parity',canonicalParity],['registered lifecycle/redraw/four page languages/isolation',lifecycle],['candidate validator and exact DOM negative controls',validatorControls]]){try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS '+name);}catch(e){failures++;results.push({name,status:'FAIL',error:e.message,stack:e.stack});console.log('FAIL '+name+' '+e.message);}}
 save('SOURCE-OWNER-PAIR-QUALIFICATION-INVENTORY.json',inventory);save('ALL14-DAY-MAPPING-INVENTORY.json',days);save('DATA-READS.json',[...dataReads.values()]);save('FULL-INIT-RESULT.json',{scriptRoot:scripts,cases:results,failures,browser:false,layoutSSR:false});
 console.log(JSON.stringify({cases:results.length,passed:results.filter(r=>r.status==='PASS').length,failures,browser:false}));process.exitCode=failures?1:0;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={boot,contract,days,sources,checkOwner,documentFor,save};
