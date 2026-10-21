#!/usr/bin/env node
'use strict';
// Portable local regression. No network/build/browser; HTML5 DOM is modeled.
// node --max-old-space-size=128 scripts/chok-lech-sunday.test.cjs
// Sparse checkouts: repeat --data-root DIR for authentic local dependencies.
// --evidence DIR writes compact receipts; --preimage FILE executes a genuine old
// main through the SAME initializer (expected RED, not an expected-failure pass).
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {documentFor,sandbox,until,visible}=require('./qualified-earlier-parsha-test-dom.cjs');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const opt=k=>args.includes(k)?path.resolve(args[args.indexOf(k)+1]):null;
const evidence=opt('--evidence'),preimage=opt('--preimage');
const roots=[root,...args.flatMap((x,i)=>x==='--data-root'?[path.resolve(args[i+1])]:[])];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const pins={
 'public/chok-lech-sunday.js':'7ce17fdd4c55ce81ed197ff027dafc2df923384e690ab741f8aa8fbc5259943a',
 'public/chok.js':'652e0b8c5fb3373cb224fd26cac0b46be26e6200482eb49dd8a691bba1e6b061',
 'public/chok-source-reader.js':'edab4f903dec95cb4d62662827b002b6c6f50dd77cf49539c0d368b6939e4a2f',
 'public/reader/chok/lech-sunday-talmud-zohar.json':'0f6739147c793ccf167c22fee2bed3d27ed7f2546e021441dbf60c9d94242a93'
};
const inputs=new Map();
function read(rel){for(const base of roots){const p=path.join(base,rel);if(fs.existsSync(p)){const raw=fs.readFileSync(p,'utf8');inputs.set(p,{path:p,sha256:sha(raw),bytes:Buffer.byteLength(raw)});return raw;}}throw Error('Authentic local dependency missing: '+rel+' (use --data-root)');}
const code=read('public/chok-lech-sunday.js'),sources=read('public/chok-source-reader.js'),current=read('public/chok.js');
const raw=read('public/reader/chok/lech-sunday-talmud-zohar.json'),packet=JSON.parse(raw),PIN=pins['public/reader/chok/lech-sunday-talmud-zohar.json'];
const main=preimage?fs.readFileSync(preimage,'utf8'):current;
if(preimage)assert.equal(sha(main),'ccbaaf655029345f55e656132c6b6f553e5df9ae3a4b1d87c7e1784bf8f39770','genuine 4efbf495af4393a4d2ee2bc8941bac947332df9e old-main blob');
for(const [p,pin] of Object.entries(pins))assert.equal(sha(read(p)),pin,'frozen '+p);
const t=packet.sections.talmud,z=packet.sections.zohar,rows=[...t.units,...z.units,...t.rashiFullSupplement.units];
const clone=()=>JSON.parse(raw),results=[];
function save(name,value){if(evidence){fs.mkdirSync(evidence,{recursive:true});fs.writeFileSync(path.join(evidence,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');}}
function envFor(html='<html><body></body></html>',fetcher=async()=>{throw Error('Unexpected fetch');}){const d=documentFor(html),env=sandbox(d,'/reader/chok/',fetcher);return {d,env};}
function adapter(gateRaw){const r=envFor();
 // Only semantic-negative tests bypass the OUTER raw-file digest. All source,
 // translation and note hashes still use real WebCrypto; production runs do not.
 if(gateRaw!==undefined)r.env.box.window.crypto={subtle:{digest:async(alg,bytes)=>Buffer.from(new TextDecoder().decode(bytes)===gateRaw?PIN:sha(Buffer.from(bytes)),'hex')}};
 vm.runInContext(sources,r.env.box,{filename:'chok-source-reader.js'});
 vm.runInContext(code,r.env.box,{filename:'chok-lech-sunday.js'});
 r.api=r.env.box.window.ChokLechSunday;
 return r;
}
const request=(r,section='talmud',en=true,loader=async()=>raw,w='לך לך',day='יום ראשון')=>r.api.reading(w,day,section,en,loader);
function checkBodies(d,en=true){
 const nodes=d.querySelectorAll('[data-reading-unit]');assert.equal(nodes.length,22,'22 distinct genuine source/English owners');
 assert.deepEqual(nodes.map(n=>n.getAttribute('data-reading-unit')),[...t.units,...t.rashiFullSupplement.units,...z.units].map(u=>u.id));
 for(const u of rows){const n=d.querySelector('[data-reading-unit="'+u.id+'"]');const he=n.querySelector('[data-source-field="he"]').cloneNode(true);for(const m of he.querySelectorAll('[data-zohar-folio]'))m.remove();assert.equal(he.textContent,u.he,u.id+' entire HE');assert.equal(n.getAttribute('data-source-sha256'),u.sourceTextSHA256);const english=n.querySelector('[data-source-field="en"]');if(en){assert(english,u.id+' EN node');assert.equal(english.textContent,u.en,u.id+' entire EN');assert.equal(english.getAttribute('dir'),'ltr');assert(!english.hidden);}else assert.equal(english,null,u.id+' no EN source in HE/Original');}
 const qs=d.querySelectorAll('[data-note-id]');assert.equal(qs.length,2,'both meaning notes');
 for(const u of rows)for(const q of u.displayMeaningNotes){const n=d.querySelector('[data-note-id="'+q.id+'"]');assert(n);assert.equal(n.getAttribute('data-note-owner'),u.id);assert.equal(n.getAttribute('data-source-span'),JSON.stringify(q.sourceSpanCodepoints));assert.equal(n.querySelector('[lang="he"]').textContent,q.he);assert.equal(n.querySelector('[lang="en"]').textContent,q.en);assert(!n.closest('details'),'meaning note outside source disclosures');assert(visible(n));}
 const core=d.querySelector('[data-reading-role="compiled-rashi"]'),extra=d.querySelector('[data-reading-role="optional-complete-rashi"]');assert(core&&extra);assert.equal(core.querySelectorAll('[data-reading-unit]').length,10);assert.equal(extra.querySelectorAll('[data-reading-unit]').length,10);
 const zd=d.querySelector('[data-daily-section="zohar"]');assert.equal(zd.querySelectorAll('[data-source-field="he"]').length,1,'Zohar one continuous source');assert.equal(zd.querySelectorAll('[data-source-field="en"]').length,en?1:0);
 const markers=zd.querySelectorAll('[data-zohar-folio]');assert.deepEqual(markers.map(n=>n.textContent),['I 76b','I 77a']);
 const source=zd.querySelector('[data-source-field="he"]');for(let i=0;i<markers.length;i++){let offset=0;for(const n of source.childNodes){if(n===markers[i])break;if(n.tagName!=='small')offset+=Array.from(n.textContent).length;}assert.equal(offset,z.units[0].naturalFolios[i].offsetCodepoints,'natural folio insertion conserves codepoints');}
}
async function rendered(r,en=true){return documentFor('<html><body>'+await request(r,'talmud',en)+await request(r,'zohar',en)+'</body></html>');}
async function run(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS '+name);}catch(e){results.push({name,status:'FAIL',error:e.message,stack:e.stack});console.log('FAIL '+name+' '+e.message);console.error(e.stack);}}
const corruptions={
 'wrong schema':p=>p.schema='wrong', 'wrong packet key':p=>p.key='נח|יום ראשון', 'wrong selection':p=>p.sourceSelectionSHA256='0'.repeat(64),
 'wrong section set':p=>p.sections.other={}, 'changed HE body':p=>p.sections.talmud.units[0].he=p.sections.talmud.units[0].he.slice(1),
 'changed EN body':p=>p.sections.zohar.units[0].en=p.sections.zohar.units[0].en.slice(1),
 'changed note HE':p=>p.sections.talmud.units[0].displayMeaningNotes[0].he=p.sections.talmud.units[0].displayMeaningNotes[0].he.slice(1),
 'changed note EN':p=>p.sections.zohar.units[0].displayMeaningNotes[0].en=p.sections.zohar.units[0].displayMeaningNotes[0].en.slice(1),
 'wrong note owner':p=>p.sections.talmud.units[0].displayMeaningNotes[0].owner='foreign',
 'wrong note source hash':p=>p.sections.zohar.units[0].displayMeaningNotes[0].sourceBodySHA256='0'.repeat(64),
 'shifted note span':p=>p.sections.talmud.units[0].displayMeaningNotes[0].sourceSpanCodepoints[0]++,
 'wrong note anchor':p=>p.sections.zohar.units[0].displayMeaningNotes[0].anchor=p.sections.zohar.units[0].displayMeaningNotes[0].anchor.slice(1),
 'noninteger span':p=>p.sections.talmud.units[0].displayMeaningNotes[0].sourceSpanCodepoints[0]=0.5,
 'wrong primary role':p=>p.sections.talmud.units[0].role='rashi', 'wrong compiled role':p=>p.sections.talmud.units[1].role='gemara',
 'wrong Zohar role':p=>p.sections.zohar.units[0].role='gemara', 'wrong optional role':p=>p.sections.talmud.rashiFullSupplement.units[0].role='gemara',
 'missing compiled Rashi':p=>p.sections.talmud.units.pop(), 'missing optional Rashi':p=>p.sections.talmud.rashiFullSupplement.units.pop(),
 'duplicate owner':p=>p.sections.talmud.units[2].id=p.sections.talmud.units[1].id,
 'missing continuous flag':p=>p.sections.zohar.continuousDailyBody=false,
 'not optional':p=>p.sections.talmud.rashiFullSupplement.optional=false,
 'not initially closed':p=>p.sections.talmud.rashiFullSupplement.initiallyClosed=false,
 'out of bounds folio':p=>p.sections.zohar.units[0].naturalFolios[1].offsetCodepoints=999999,
 'unordered folio':p=>p.sections.zohar.units[0].naturalFolios[1].offsetCodepoints=0
};
// Narrow authentic schedule projection: no invented source bodies. Unchanged
// Torah/Nach/Mishna/Halacha/Mussar/bonus/prayer/Breslov are explicitly out of scope.
const schedule=JSON.parse(read('public/reader/chok/schedule.json')),mapRaw=read('public/reader/chok/shabbos-map.json');
const scheduleProjection={weeks:{}};
for(const week of ['לך לך','נח']){const w=schedule.weeks[week];scheduleProjection.weeks[week]={slug:w.slug,days:{}};for(const day of ['יום ראשון','יום שני']){const d=w.days[day];scheduleProjection.weeks[week].days[day]={gemara:d.gemara,zohar:d.zohar};}}
const template=read('src/pages/reader/chok.astro'),markup=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
const facadeJSON=new Set(['/reader/chok/mishna-bonus.json','/reader/chok/mussar.json','/reader/chok/day-comm.json','/reader/chok/kavanos-chok.json','/reader/chok/kavanos-actual.json','/reader/chok/miluy-kavana.json','/reader/chok/hk-verses.json','/reader/chok/kavanos-torah.json','/reader/kavanos/index.json']);
async function boot({mainCode=main,missing=false,week='לך לך',day='יום ראשון',packetBytes=raw,hold=false}={}){
 const requests=[],facades=[],legacy=[],r=envFor('<html><body>'+markup+'</body></html>',async url=>{
  const key=String(url).split('?')[0];requests.push(String(url));let value;
  if(key==='/reader/chok/schedule.json')value=JSON.stringify(scheduleProjection);
  else if(key==='/reader/chok/shabbos-map.json')value=mapRaw;
  else if(key==='/reader/chok/lech-sunday-talmud-zohar.json'){if(r.hold)await new Promise(resolve=>r.release=resolve);value=r.packetBytes;}
  else if(facadeJSON.has(key)||key.startsWith('/reader/chok/commentary/')){facades.push(key);return {ok:true,json:async()=>null};}
  else {legacy.push(key);value=read('public'+key);}
  return {ok:true,status:200,text:async()=>value,json:async()=>JSON.parse(value),arrayBuffer:async()=>{const b=Buffer.from(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};
 });
 Object.assign(r,{requests,facades,legacy,packetBytes,hold});
 r.env.box.location.search='?week='+encodeURIComponent(week)+'&day='+encodeURIComponent(day);
 r.env.box.Date=class extends Date{constructor(...a){super(...(a.length?a:['2026-10-18T09:00:00+03:00']));}static now(){return Date.parse('2026-10-18T09:00:00+03:00');}};
 vm.runInContext(sources,r.env.box,{filename:'chok-source-reader.js'});
 // Explicit source-free facades for unchanged dependencies; never a fake body.
 r.env.box.window.ChokSources.load=async()=>{};
 r.env.box.window.ChokVerseBreslov={has:()=>false,availability:()=>'',parsha:()=>null,weekly:()=>''};
 if(!missing)vm.runInContext(code,r.env.box,{filename:'chok-lech-sunday.js'});
 else if(missing==='malformed')r.env.box.window.ChokLechSunday={};
 vm.runInContext(mainCode,r.env.box,{filename:preimage?'genuine-old-chok.js':'chok.js'});
 r.settled=async()=>{await until(()=>!!r.d.getElementById('ck-content').innerHTML&&!r.d.querySelector('.ck-loading'),10000);assert(!r.d.getElementById('ck-content').textContent.includes('Could not load'),r.d.getElementById('ck-content').textContent.slice(0,400));};
 r.change=async(id,value)=>{const n=r.d.getElementById(id);n.value=value;n.dispatchEvent({type:'change'});await r.settled();};
 return r;
}
function targetRequests(r){return r.requests.filter(x=>x.startsWith('/reader/chok/lech-sunday-talmud-zohar.json'));}
function checkZoharUnavailable(d){const z=d.querySelector('[data-sec="kabbala"]');assert(z.querySelector('.ck-zohar-pending'),'Zohar has its actual named fallback');const ref=z.querySelector('[data-field-role="original-reference"]');assert(ref,'source reference survives failure');assert(ref.textContent.includes('לך')&&ref.textContent.includes('עו'),'actual scheduled original reference');assert(z.querySelector('[lang="he"]').textContent.includes('זוהר'));assert(z.querySelector('[lang="en"]').textContent.includes('Zohar'));assert(!z.textContent.includes('undefined'));assert.equal(z.querySelectorAll('[data-source-field]').length,0,'never substitute legacy source');}
async function suite(){
 await run('frozen packet: all 22 complete pairs, 2 bound notes, exact endpoints and folios',()=>{
  assert.equal(rows.length,22);assert.equal(new Set(rows.map(u=>u.id)).size,22);assert.equal(rows.reduce((n,u)=>n+u.displayMeaningNotes.length,0),2);
  for(const u of rows){assert.equal(sha(u.he),u.sourceTextSHA256);assert.equal(sha(u.en),u.englishTextSHA256);for(const q of u.displayMeaningNotes){assert.equal(sha(q.he),q.heSHA256);assert.equal(sha(q.en),q.enSHA256);assert.equal(Array.from(u.he).slice(...q.sourceSpanCodepoints).join(''),q.anchor);}}
  assert(t.units[0].he.startsWith('אמר רחבה אמר רב יהודה כל הרואה המת ואינו מלוהו עובר משום לועג לרש חרף עושהו ואם הלוהו'));
  assert(t.units[0].he.endsWith('איכא דאמרי דתבר גזיזי דברדא ונחת וטבל איכא דאמרי דתנא סיפרא דבי רב ביומא דסיתוא.'));
  assert(z.units[0].he.startsWith('"לך לך מארצך וגו\'" -- רבי אבא פתח ואמר,'));
  assert(z.units[0].he.endsWith('דכתיב (דה"א טז לג) אז ירננו עצי היער מלפני יהו"ה כי בא וגו\''));
  assert.deepEqual(z.units[0].naturalFolios,[{offsetCodepoints:0,label:'I 76b'},{offsetCodepoints:769,label:'I 77a'}]);
  assert(Array.from(z.units[0].he).slice(769).join('').startsWith('ליה אברהם מכל בני דריה'));
  return {pairs:22,primary:12,optionalFullRashi:10,meaningNotes:2,authority:'exact hash-bound previously approved packet; no new philological approval'};
 });
 await run('actual uninstrumented renderer: whole source/EN equality, continuity, notes, closed optional Rashi',async()=>{const r=adapter();try{for(const en of [true,false]){const d=await rendered(r,en);checkBodies(d,en);assert(!d.querySelector('[data-reading-role="compiled-rashi"]').open);assert(!d.querySelector('[data-reading-role="optional-complete-rashi"]').open);for(const det of d.querySelectorAll('details'))det.open=true;for(const n of d.querySelectorAll('[data-source-field="en"]'))assert(visible(n));}}finally{r.env.close();}});
 await run('single lazy pending request reused by concurrent Talmud/Zohar; wrong keys never load',async()=>{const r=adapter();try{let calls=0,release;const loader=()=>{calls++;return new Promise(resolve=>release=resolve);};for(const [w,d,s] of [['נח','יום ראשון','talmud'],['לך לך','יום שני','zohar'],['לך לך','יום ראשון','halacha']])assert.equal(await request(r,s,true,loader,w,d),null);assert.equal(calls,0);const a=request(r,'talmud',true,loader),b=request(r,'zohar',true,loader);await Promise.resolve();assert.equal(calls,1);release(raw);const html=await Promise.all([a,b]);checkBodies(documentFor('<html><body>'+html.join('')+'</body></html>'));await request(r,'talmud',true,loader);assert.equal(calls,1);}finally{r.env.close();}});
 await run('fixed raw SHA: packet/body/note/span/role/count corruption rejection and original-byte retry',async()=>{const mutations={...corruptions,'missing meaning note':p=>p.sections.talmud.units[0].displayMeaningNotes.pop(),'changed folio label':p=>p.sections.zohar.units[0].naturalFolios[1].label='wrong'};for(const [name,mutate] of Object.entries(mutations)){const p=clone();mutate(p);const r=adapter();try{let calls=0;await assert.rejects(request(r,'talmud',true,async()=>{calls++;return JSON.stringify(p);}),/Daily packet changed/,name);assert(await request(r,'talmud',true,async()=>{calls++;return raw;}));assert.equal(calls,2,name+' actual cleared rejected promise');checkBodies(await rendered(r));}finally{r.env.close();}}return {rejections:Object.keys(mutations).length,allRecovered:true};});
 await run('semantic validators behind labelled outer-digest-only facade; actual rejection/recovery',async()=>{for(const [name,mutate] of Object.entries(corruptions)){const p=clone();mutate(p);const changed=JSON.stringify(p),r=adapter(changed);try{await assert.rejects(request(r,'talmud',true,async()=>changed),undefined,name);checkBodies(await rendered(r));}finally{r.env.close();}}return {rejections:Object.keys(corruptions).length,facade:'only corrupted complete raw packet digest is admitted; all inner digests genuine'};});
 await run('loader type/network failure recovery and safely escaped genuine sources/metadata',async()=>{for(const bad of [()=>Promise.reject(Error('offline fixture')),()=>Promise.resolve(packet),undefined]){const r=adapter();try{await assert.rejects(Promise.resolve().then(()=>r.api.reading('לך לך','יום ראשון','talmud',true,bad)));checkBodies(await rendered(r));}finally{r.env.close();}}
  const r=adapter();try{const d=await rendered(r);assert.equal(d.querySelectorAll('script,img,iframe').length,0);const u=JSON.parse(JSON.stringify(t.units[0])),probe='\"\'><img src=x onerror=alert(1)>&';
  // Isolated PURE-HELPER instrumentation only, not the real main/adapter runs.
  // The XSS probe is non-source test data, never a fabricated sacred-text body.
  const helperCode=code.replace('window.ChokLechSunday = { reading: reading };','window.__escapeProbe = esc;');assert.notEqual(helperCode,code);vm.runInContext(helperCode,r.env.box,{filename:'labelled-escape-helper-probe.js'});
  assert.equal(r.env.box.window.__escapeProbe(probe),'&quot;&#39;&gt;&lt;img src=x onerror=alert(1)&gt;&amp;');
  const escaped=documentFor('<html><body><p>'+r.env.box.window.__escapeProbe(probe)+'</p></body></html>');assert.equal(escaped.querySelectorAll('img,script').length,0);assert.equal(escaped.querySelector('p').textContent,probe);
  u.id=probe;u.displayMeaningNotes[0].owner=probe;const markup=r.env.box.window.ChokSources.meaningNotes(u),out=documentFor('<html><body>'+markup+'</body></html>');assert.equal(out.querySelectorAll('img,script').length,0);assert.equal(out.querySelector('aside').getAttribute('data-note-owner'),probe);assert(markup.includes('&lt;img'));assert(markup.includes('&amp;'));assert(markup.includes('&quot;'));assert(markup.includes('&#39;'));assert.equal(out.querySelector('[lang="he"]').textContent,u.displayMeaningNotes[0].he);}finally{r.env.close();}});
 await run('REAL MAIN INIT + registered four-language controls, actual Talmud/Zohar dispatch before fallbacks',async()=>{const r=await boot();try{await r.settled();checkBodies(r.d);assert.equal(r.d.getElementById('ck-parsha').value,'לך לך');assert.equal(r.d.getElementById('ck-day').value,'יום ראשון');assert.equal(targetRequests(r).length,1);assert.equal(r.legacy.length,0,'no legacy Gemara/Zohar calls for repaired key');
  assert.deepEqual(r.d.querySelectorAll('#ck-content .ck-section[data-sec]').map(n=>n.getAttribute('data-sec')),['talmud','kabbala']);
  for(const lang of ['en','he','original','both']){await r.change('ck-language',lang);checkBodies(r.d,lang==='en'||lang==='both');assert.equal(r.d.getElementById('ck-content').getAttribute('data-language'),lang);const gemara=r.d.querySelector('[data-reading-unit="sunday-gemara"] [data-source-field="en"]'),zohar=r.d.querySelector('[data-reading-unit="sunday-zohar"] [data-source-field="en"]');if(lang==='en'||lang==='both'){assert(visible(gemara));assert(visible(zohar));}assert.equal(targetRequests(r).length,1,'control redraw uses authenticated cached packet');}
  save('main-initialized.html',r.d.getElementById('ck-content').innerHTML);return {execution:'entire real main initializer and registered events; authentic two-section schedule projection',queuedRequests:targetRequests(r),facadeRequests:[...new Set(r.facades)]};
 }finally{r.env.close();}});
 await run('real main missing/malformed-script guard with named Zohar reference and no legacy fallback',async()=>{for(const missing of [true,'malformed']){const r=await boot({missing});try{await r.settled();assert.equal(r.d.querySelectorAll('[data-qualified-daily]').length,0);assert(r.d.querySelector('[data-sec="talmud"] [data-unavailable-body="talmud"]'));checkZoharUnavailable(r.d);assert.equal(targetRequests(r).length,0);assert.equal(r.legacy.length,0);}finally{r.env.close();}}});
 await run('real queued loader rejected bytes -> actual language redraw -> restored original bytes',async()=>{const r=await boot({packetBytes:raw+' '});try{await r.settled();assert.equal(r.d.querySelectorAll('[data-unavailable-body="talmud"]').length,1);checkZoharUnavailable(r.d);assert.equal(targetRequests(r).length,2,'each sequential caller rejects and clears');r.packetBytes=raw;await r.change('ck-language','en');checkBodies(r.d);assert.equal(targetRequests(r).length,3,'one new queued request recovers both sections');assert.equal(r.legacy.length,0);}finally{r.env.close();}});
 await run('real caller stale-response guard and wrong-day/week noninterference',async()=>{const old=preimage?main:opt('--old-main')?fs.readFileSync(opt('--old-main'),'utf8'):null;const r=await boot({hold:true});try{await until(()=>!!r.release,5000);const control=r.d.getElementById('ck-day');control.value='יום שני';control.dispatchEvent({type:'change'});await r.settled();assert.equal(r.d.querySelector('[data-qualified-daily]'),null);const before=r.d.getElementById('ck-content').innerHTML;r.hold=false;r.release();await new Promise(resolve=>setTimeout(resolve,40));assert.equal(r.d.getElementById('ck-content').innerHTML,before,'late Sunday response cannot replace Monday');assert.equal(targetRequests(r).length,1);await r.change('ck-parsha','נח');await r.change('ck-day','יום ראשון');assert.equal(r.d.querySelector('[data-qualified-daily]'),null);assert.equal(targetRequests(r).length,1,'unrelated controls never request Sunday packet');
  if(old){assert.equal(sha(old),'ccbaaf655029345f55e656132c6b6f553e5df9ae3a4b1d87c7e1784bf8f39770');for(const [week,day] of [['לך לך','יום שני'],['נח','יום ראשון']]){const a=await boot({mainCode:current,week,day}),b=await boot({mainCode:old,week,day});try{await a.settled();await b.settled();assert.equal(a.d.getElementById('ck-content').innerHTML,b.d.getElementById('ck-content').innerHTML,'unchanged actual old/new caller output '+week+'|'+day);}finally{a.env.close();b.env.close();}}}
  return {oldNewByteParity:!!old,scope:'same authentic local legacy data and explicitly source-free unchanged-dependency facades'};
 }finally{r.env.close();}});
 for(const [p,pin] of Object.entries(pins))assert.equal(sha(read(p)),pin,'source remained frozen '+p);
 const summary={mode:preimage?'RED genuine old main':'GREEN candidate main',mainSHA256:sha(main),frozenSourceHashes:pins,results,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,scope:{browser:false,network:false,build:false,fullUnfacadedApp:false,dom:'existing parse5 HTML5 modeled DOM',main:'actual unmodified entire main initializer/registered controls, genuine target schedule fields only',facades:['ChokSources.load no-op for unrelated Noach/Breslov master loading','ChokVerseBreslov source-free navigation/availability facade','unchanged optional JSON dependencies return null','two-section schedule projection; no invented source bodies'],semanticNegatives:'explicit outer raw-digest-only crypto facade; no production code edits or inner digest bypass'},inputs:[...inputs.values()]};save('results.json',summary);console.log(JSON.stringify({mode:summary.mode,groups:results.length,passed:summary.passed,failed:summary.failed,mainSHA256:summary.mainSHA256}));process.exitCode=summary.failed?1:0;
}
suite().catch(e=>{console.error(e.stack);process.exitCode=1;});
