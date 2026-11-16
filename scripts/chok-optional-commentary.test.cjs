'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createHash, webcrypto} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p));
const sha = b => createHash('sha256').update(b).digest('hex');
// Compose only the two exact Reader test registrations before the unchanged
// historical Chok inverse. Production code, banks and old pins remain intact.
function restoreReaderTestRegistration(relative, bytes) {
 if(relative!=='package.json'||!Buffer.isBuffer(bytes)||sha(bytes)!=='d501d058381ed4473b4229fb97341c7a7a08f5367382ff6da142d51f35767930')return bytes;
 const marker=' scripts/test-reader-optional-commentary-guards.mjs scripts/test-reader-entry-recovery.mjs';
 const text=bytes.toString('utf8');assert.equal(text.split(marker).length,2,'READER_TEST_REGISTRATION_UNIQUE');
 const before=Buffer.from(text.replace(marker,''));
 assert.equal(sha(before),'85c865e4086cd2ba5087f6c47a4b4579c374322a0cbb033a3a6d4056f0976dd5','READER_TEST_REGISTRATION_WHOLE_INVERSE');
 return before;
}
const original = process.env.CHOK_OPTIONAL_SOURCE;
const code = original ? fs.readFileSync(original, 'utf8') : read('public/chok.js').toString();
const names = fs.readdirSync(path.join(root,'public/reader/chok/commentary')).filter(n=>n.endsWith('.json')).sort();
const absent = ['בא-yom-shlishi.json','חוקת-yom-revii.json','תזריע-yom-shishi.json','חוקת-yom-sheni.json','תזריע-yom-shlishi.json'];
const DAY = {'yom-rishon':'יום ראשון','yom-sheni':'יום שני','yom-shlishi':'יום שלישי','yom-revii':'יום רביעי','yom-chamishi':'יום חמישי','yom-shishi':'יום שישי','leil-shishi':'ליל שישי'};
const marker = "  if (document.readyState === 'loading') {";
function metadata() {return {schema:'chok-optional-commentary/v2',freshness:'current-release-response/v1',clientSHA256:sha(code),generatedAt:Date.now(),filesSHA256:sha(JSON.stringify(names)),files:names.slice()};}
function key(name) {const m=/^(.*)-(yom-[a-z]+|leil-shishi)\.json$/.exec(name); assert(m,name); return [m[1],DAY[m[2]]];}
function harness(meta=metadata(), options={}) {
  const requests=[],errors=[],metadataRequests=[];let now=Date.now(),failed=!!options.fail;
  const d={readyState:'loading',addEventListener(){},querySelector(selector){
    if(selector==='#ck-content')return {getAttribute:()=>options.inlineMeta?JSON.stringify(options.inlineMeta):meta===null?null:typeof meta==='string'?meta:JSON.stringify(meta)};
    if(selector==='script[src^="/chok.js?v="]')return {getAttribute:()=>'/chok.js?v='+sha(code)};
    return null;
  },getElementById(){return null;}};
  const box={document:d,window:{crypto:webcrypto},TextEncoder,AbortController,Promise,console,URLSearchParams,
    Date:class extends Date {static now(){return now;}},setTimeout:(fn,ms)=>setTimeout(fn,ms===1500?ms:0),clearTimeout,
    localStorage:{getItem(){return null;}},location:{search:''},fetch:async (url,init)=>{
      if(url==='/chok-commentary-availability.json'){
        metadataRequests.push({url,init});
        if(options.metadataFetch)return options.metadataFetch(init);
        return {ok:true,status:200,text:async()=>typeof meta==='string'?meta:JSON.stringify(meta)};
      }
      const name=decodeURIComponent(String(url).split('/').pop());requests.push(String(url));
      if(failed){errors.push(name);throw Error('transient commentary transport');}
      if(!names.includes(name)&&!options.newFile)return {ok:false,status:404};
      const raw=options.newFile||read('public/reader/chok/commentary/'+name).toString();
      return {ok:true,status:200,json:async()=>JSON.parse(raw),text:async()=>raw};
    }};
  vm.createContext(box);assert.equal(code.split(marker).length,2);
  vm.runInContext(code.replace(marker,'  globalThis.optionalQA={fetchCommentary:fetchCommentary,commentaryHTML:commentaryHTML};\n'+marker),box);
  return {requests,errors,metadataRequests,box,load:name=>box.optionalQA.fetchCommentary(...key(name)),recover(){failed=false;},setMeta(value){meta=value;},setNow(value){now=value;}};
}

test('desired contract: all five genuine absences make zero commentary requests',async()=>{
 const h=harness();for(const name of absent){assert(!names.includes(name));assert.equal(await h.load(name),null);}
 assert.equal(h.requests.length,0,'known absent commentary must not be requested');
});
test('complete available domain: original payload and complete commentary renderer are identical',async()=>{
 const prior=process.env.CHOK_OPTIONAL_BASELINE?fs.readFileSync(process.env.CHOK_OPTIONAL_BASELINE,'utf8'):require('./chok-optional-commentary-inverse.cjs').restore('public/chok.js',read('public/chok.js')).toString();
 const h=harness(),oldCode=prior.replace(marker,'  globalThis.oldRender=commentaryHTML;\n'+marker);
 const old={document:{readyState:'loading',addEventListener(){},getElementById(){return null;}},window:{},localStorage:{getItem(){return null;}},location:{search:''},URLSearchParams};vm.createContext(old);vm.runInContext(oldCode,old);
 let count=0;const domain=[];for(const name of names.filter(n=>n!=='_template.json')){
   const expected=JSON.parse(read('public/reader/chok/commentary/'+name));const payload=await h.load(name);
   assert.equal(JSON.stringify(payload),JSON.stringify(expected),'complete genuine payload: '+name);
   const rendered=JSON.stringify(h.box.optionalQA.commentaryHTML(payload));assert.equal(rendered,JSON.stringify(old.oldRender(expected)),'complete renderer: '+name);count++;
   const raw=read('public/reader/chok/commentary/'+name);domain.push({name,bytes:raw.length,sha256:sha(raw),renderSHA256:sha(rendered),payloadEqual:true,completeRenderEqual:true});
 }
 if(process.env.CHOK_OPTIONAL_EVIDENCE){fs.mkdirSync(process.env.CHOK_OPTIONAL_EVIDENCE,{recursive:true});fs.writeFileSync(path.join(process.env.CHOK_OPTIONAL_EVIDENCE,'available-domain.json'),JSON.stringify({files:names,domain,sourceSHA256:sha(code)},null,2));}
 assert.equal(h.requests.length,count);assert.equal(h.metadataRequests.length,count);console.log(JSON.stringify({availableDomain:count,filesSHA256:sha(JSON.stringify(names)),sourceSHA256:sha(code)}));
});
test('missing, malformed, wrong contract and mismatched responses fail open and recover',async()=>{
 const base=metadata();const bad=[null,'not JSON',{}, {...base,schema:'foreign'}, {...base,freshness:'inline'}, {...base,clientSHA256:'0'.repeat(64)}, {...base,filesSHA256:'0'.repeat(64)}, {...base,files:[]}, {...base,files:[...names,names[0]]}];
 for(const meta of bad){const h=harness(meta);assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,3,'old retries retained: '+JSON.stringify(meta)?.slice(0,90));h.setMeta(base);await h.load(absent[0]);assert.equal(h.requests.length,3);assert.equal(h.metadataRequests.length,2);}
});
test('returning document, later data-only publication, transport failure and recovery',async()=>{
 const meta=metadata(),h=harness(meta,{newFile:read('public/reader/chok/commentary/בראשית-yom-rishon.json').toString()});
 assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,0);
 h.setNow(meta.generatedAt+86400001);await h.load(absent[0]);assert.equal(h.requests.length,0,'unchanged current release still prevents absence after 24h');
 const files=[...names,absent[0]].sort();h.setMeta({...meta,files,filesSHA256:sha(JSON.stringify(files))});const added=await h.load(absent[0]);assert(added);assert.equal(h.requests.length,1,'fresh current artifact exposes data-only addition without page reload');assert.equal(h.metadataRequests.length,3);
 const t=harness(metadata(),{fail:true}),available=names.find(n=>n!=='_template.json');assert.equal(await t.load(available),null);assert.equal(t.requests.length,3);t.recover();assert(await t.load(available));assert.equal(t.requests.length,4,'transport failures never permanently negative cached');
});
test('unavailable or rejecting digest verification fails open and recovers',async()=>{
 for(const crypto of [undefined,{subtle:{digest:async()=>{throw Error('transient metadata verification');}}}]){
  const h=harness();h.box.window.crypto=crypto;assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,3);h.box.window.crypto=webcrypto;assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,3,'fresh verification recovers, no permanent negative/error cache');
 }
});
test('fresh producer observes a later file and refuses ambiguous publication inputs',async()=>{
 const {commentaryAvailability}=await import(pathToFileURL(path.join(root,'src/lib/chok-commentary-availability.mjs')));
 const dir=fs.mkdtempSync(path.join(process.env.TMPDIR||'/root/.hermes/cache/scratch','chok-optional-producer-'));
 try{
  const target=path.join(dir,'public/reader/chok/commentary');fs.mkdirSync(target,{recursive:true});fs.copyFileSync(path.join(root,'public/chok.js'),path.join(dir,'public/chok.js'));
  const name=absent[0],raw=read('public/reader/chok/commentary/בראשית-yom-rishon.json');
  // Test-only future publication carrier. No repository data is created/changed.
  fs.writeFileSync(path.join(target,name),raw);const current=commentaryAvailability(dir);assert.deepEqual(current.files,[name]);
  const h=harness(current,{newFile:raw.toString()});assert.equal(JSON.stringify(await h.load(name)),JSON.stringify(JSON.parse(raw)));assert.equal(h.requests.length,1);
  fs.symlinkSync(path.join(target,name),path.join(target,'ambiguous.json'));assert.equal(commentaryAvailability(dir),null);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Reader test-registration composition is exact, owner-bound and rejects altered package bytes',()=>{
 const current=read('package.json');assert.equal(sha(current),'d501d058381ed4473b4229fb97341c7a7a08f5367382ff6da142d51f35767930');
 const before=restoreReaderTestRegistration('package.json',current);assert.equal(sha(before),'85c865e4086cd2ba5087f6c47a4b4579c374322a0cbb033a3a6d4056f0976dd5');
 assert.equal(restoreReaderTestRegistration('foreign-owner',current),current);
 const corrupt=Buffer.from(current);corrupt[0]^=1;
 for(const bad of [corrupt,Buffer.concat([current,Buffer.from(' ')]),Buffer.from(current.toString().replace(' scripts/test-reader-entry-recovery.mjs','')),Buffer.from(current.toString().replace('scripts/test-reader-optional-commentary-guards.mjs','scripts/test-reader-optional-commentary-guards.mjs changed')),Buffer.from(current.toString().replace(' scripts/test-reader-entry-recovery.mjs',' scripts/test-reader-entry-recovery.mjs scripts/test-reader-entry-recovery.mjs'))]){
  assert.notDeepEqual(bad,current);assert.equal(restoreReaderTestRegistration('package.json',bad),bad);
 }
 assert.deepEqual(restoreReaderTestRegistration('package.json',current),before);
});
test('exact new inverse preserves every current-main byte, rejects changed bodies and bank corruption',()=>{
 const historical=require('./chok-optional-commentary-inverse.cjs'),helper={restore:(relative,bytes)=>historical.restore(relative,restoreReaderTestRegistration(relative,bytes))},p=path.join(root,'scripts/chok-optional-commentary-admission.json'),raw=fs.readFileSync(p),bank=JSON.parse(raw);
 for(const [relative,row]of Object.entries(bank.paths)){
  const bytes=read(relative),pre=helper.restore(relative,bytes);assert.equal(sha(pre),row.beforeSHA256);assert.equal(pre.length,row.beforeBytes);assert.equal(helper.restore('foreign-owner',bytes),bytes);
  for(const pos of [0,Math.floor(bytes.length/2),bytes.length-1]){const bad=Buffer.from(bytes);bad[pos]^=1;assert.equal(helper.restore(relative,bad),bad);}
 }
 try{const bad=Buffer.from(raw);bad[Math.floor(bad.length/2)]^=1;fs.writeFileSync(p,bad);assert.throws(()=>helper.restore('public/chok.js',read('public/chok.js')),/CHOK_OPTIONAL_ADMISSION_PIN/);}
 finally{fs.writeFileSync(p,raw);}
 assert.equal(sha(helper.restore('public/chok.js',read('public/chok.js'))),bank.paths['public/chok.js'].beforeSHA256);
});
test('fresh outer inverse restores exact predecessor bytes and refuses wrong owner, changed body and corrupt bank',()=>{
 const helper=require('./chok-commentary-fresh-inverse.cjs'),p=path.join(root,'scripts/chok-commentary-fresh-admission.json'),raw=fs.readFileSync(p),bank=JSON.parse(raw);
 for(const [relative,row]of Object.entries(bank.paths)){
  const bytes=read(relative),pre=helper.restore(relative,bytes);assert.equal(sha(pre),row.beforeSHA256);assert.equal(pre.length,row.beforeBytes);assert.equal(helper.restore('foreign-owner',bytes),bytes);
  for(const pos of [0,Math.floor(bytes.length/2),bytes.length-1]){const bad=Buffer.from(bytes);bad[pos]^=1;assert.equal(helper.restore(relative,bad),bad);}
 }
 try{const bad=Buffer.from(raw);bad[Math.floor(bad.length/2)]^=1;fs.writeFileSync(p,bad);assert.throws(()=>helper.restore('public/chok.js',read('public/chok.js')),/CHOK_FRESH_ADMISSION_PIN/);}finally{fs.writeFileSync(p,raw);}
 assert.equal(sha(helper.restore('public/chok.js',read('public/chok.js'))),bank.paths['public/chok.js'].beforeSHA256);
});
test('fresh per-lookup transport coalesces only concurrent work and uses explicit network policy',async()=>{
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const h=harness(metadata(),{metadataFetch:async()=>{await gate;return {ok:true,text:async()=>JSON.stringify(metadata())};}});
 const a=h.load(absent[0]),b=h.load(absent[1]);await new Promise(resolve=>setImmediate(resolve));assert.equal(h.metadataRequests.length,1);release();await Promise.all([a,b]);
 await h.load(absent[0]);await h.load(absent[0]);assert.equal(h.metadataRequests.length,3);assert.equal(h.requests.length,0);
 for(const {url,init}of h.metadataRequests){assert.equal(url,'/chok-commentary-availability.json');assert.equal(init.cache,'no-store');assert.equal(init.headers.Accept,'application/json');assert.equal(init.method,'GET');assert.equal(init.mode,'same-origin');assert.equal(init.credentials,'same-origin');assert.equal(init.redirect,'error');assert(init.signal);}
});
test('headers, body and digest stalls have a complete real deadline, no retries, and recover',async()=>{
 for(const phase of ['headers','body','digest']){
  let stuck=true;const never=()=>new Promise(()=>{});
  const h=harness(metadata(),{metadataFetch:async()=>{if(stuck&&phase==='headers')return never();return {ok:true,text:()=>stuck&&phase==='body'?never():Promise.resolve(JSON.stringify(metadata()))};}});
  if(phase==='digest')h.box.window.crypto={subtle:{digest:never}};
  const start=performance.now();await h.load(absent[0]);const elapsed=performance.now()-start;
  assert(elapsed>=1400&&elapsed<2300,phase+' deadline: '+elapsed);assert.equal(h.metadataRequests.length,1);assert.equal(h.requests.length,3);assert(h.metadataRequests[0].init.signal.aborted);
  stuck=false;h.box.window.crypto=webcrypto;await h.load(absent[0]);assert.equal(h.requests.length,3);assert.equal(h.metadataRequests.length,2);
 }
 for(const metadataFetch of [async()=>{throw Error('offline');},async()=>({ok:false,status:503}),async()=>({ok:true,text:async()=>{throw Error('broken body');}}),async()=>({ok:true,text:async()=>' '.repeat(65537)})]){
  const h=harness(metadata(),{metadataFetch});await h.load(absent[0]);assert.equal(h.requests.length,3);assert.equal(h.metadataRequests.length,1);
 }
});
test('unchanged release older than 24h still prevents every diagnosed absence',async()=>{
 const meta={...metadata(),generatedAt:Date.now()-7*86400000},h=harness(meta,{inlineMeta:{...meta,schema:'chok-optional-commentary/v1'}});h.setNow(Date.now()+30*86400000);
 for(const name of absent)assert.equal(await h.load(name),null);assert.equal(h.requests.length,0);assert.equal(h.metadataRequests.length,5);
});
test('old inline snapshot cannot hide a valid file when fresh metadata is unavailable',async()=>{
 const raw=read('public/reader/chok/commentary/בראשית-yom-rishon.json').toString();
 const h=harness(metadata(),{newFile:raw,inlineMeta:{...metadata(),schema:'chok-optional-commentary/v1'},metadataFetch:async()=>({ok:false,status:503})});
 assert.equal(JSON.stringify(await h.load(absent[0])),JSON.stringify(JSON.parse(raw)));assert.equal(h.requests.length,1);assert.equal(h.metadataRequests.length,1);
});
test('real static endpoint serializes current membership; same returning document sees a later data-only build',async()=>{
 const endpoint=await import(pathToFileURL(path.join(root,'src/pages/chok-commentary-availability.json.js')));assert.equal(endpoint.prerender,true);
 const response=endpoint.GET();assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);const originalData=await response.json();assert.deepEqual(originalData.files,names);assert.equal(originalData.clientSHA256,sha(read('public/chok.js')));
 const dir=fs.mkdtempSync(path.join(process.env.TMPDIR||'/root/.hermes/cache/scratch','chok-static-release-')),cwd=process.cwd();
 try{
  const target=path.join(dir,'public/reader/chok/commentary');fs.mkdirSync(target,{recursive:true});fs.copyFileSync(path.join(root,'public/chok.js'),path.join(dir,'public/chok.js'));process.chdir(dir);
  let artifact=await endpoint.GET().text();const raw=read('public/reader/chok/commentary/בראשית-yom-rishon.json');
  const h=harness(null,{newFile:raw.toString(),metadataFetch:async()=>({ok:true,text:async()=>artifact})});
  await h.load(absent[0]);assert.equal(h.requests.length,0);
  fs.writeFileSync(path.join(target,absent[0]),raw);artifact=await endpoint.GET().text();const current=JSON.parse(artifact);assert.equal(current.clientSHA256,originalData.clientSHA256);assert.deepEqual(current.files,[absent[0]]);
  assert.equal(JSON.stringify(await h.load(absent[0])),JSON.stringify(JSON.parse(raw)));assert.equal(h.requests.length,1);assert.equal(h.metadataRequests.length,2);
 }finally{process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true});}
});
test('actual service worker passes root JSON through without responding or touching caches',()=>{
 const cp=require('node:child_process');const sw=cp.execFileSync('git',['show','HEAD:public/sw.js'],{cwd:root}).toString();
 const events={},box={URL,self:{location:{origin:'https://ajew.org'},addEventListener:(type,fn)=>{events[type]=fn;}},caches:{open(){throw Error('unexpected SW cache');},match(){throw Error('unexpected SW cache');}},fetch(){throw Error('unexpected SW fetch');}};vm.createContext(box);vm.runInContext(sw,box);
 let responds=0;events.fetch({request:{url:'https://ajew.org/chok-commentary-availability.json',method:'GET',headers:new Headers({Accept:'application/json'})},respondWith(){responds++;}});assert.equal(responds,0);
 assert.equal(cp.execFileSync('git',['diff','HEAD','--','public/sw.js'],{cwd:root}).length,0);
 if(process.env.CHOK_OPTIONAL_EVIDENCE)fs.writeFileSync(path.join(process.env.CHOK_OPTIONAL_EVIDENCE,'service-worker.json'),JSON.stringify({sha256:sha(sw),source:'HEAD:public/sw.js',responds,unchanged:true},null,2));
});
test('actual publication producer discovers exact current membership and fails open on missing input',async()=>{
 const {commentaryAvailability}=await import(pathToFileURL(path.join(root,'src/lib/chok-commentary-availability.mjs')));
 const data=commentaryAvailability(root);assert.deepEqual(data.files,names);assert.equal(data.clientSHA256,sha(read('public/chok.js')));assert.equal(data.filesSHA256,sha(JSON.stringify(names)));assert.equal(commentaryAvailability(path.join(root,'not-an-input')),null);
});

require('./chok-display.test.cjs');
