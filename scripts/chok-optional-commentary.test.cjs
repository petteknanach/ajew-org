'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {createHash, webcrypto} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p));
const sha = b => createHash('sha256').update(b).digest('hex');
const original = process.env.CHOK_OPTIONAL_SOURCE;
const code = original ? fs.readFileSync(original, 'utf8') : read('public/chok.js').toString();
const names = fs.readdirSync(path.join(root,'public/reader/chok/commentary')).filter(n=>n.endsWith('.json')).sort();
const absent = ['בא-yom-shlishi.json','חוקת-yom-revii.json','תזריע-yom-shishi.json','חוקת-yom-sheni.json','תזריע-yom-shlishi.json'];
const DAY = {'yom-rishon':'יום ראשון','yom-sheni':'יום שני','yom-shlishi':'יום שלישי','yom-revii':'יום רביעי','yom-chamishi':'יום חמישי','yom-shishi':'יום שישי','leil-shishi':'ליל שישי'};
const marker = "  if (document.readyState === 'loading') {";
function metadata() {return {schema:'chok-optional-commentary/v1',clientSHA256:sha(code),generatedAt:Date.now(),filesSHA256:sha(JSON.stringify(names)),files:names.slice()};}
function key(name) {const m=/^(.*)-(yom-[a-z]+|leil-shishi)\.json$/.exec(name); assert(m,name); return [m[1],DAY[m[2]]];}
function harness(meta=metadata(), options={}) {
  const requests=[],errors=[];let now=Date.now(),failed=!!options.fail;
  const d={readyState:'loading',addEventListener(){},querySelector(selector){
    if(selector==='#ck-content')return {getAttribute:()=>meta===null?null:typeof meta==='string'?meta:JSON.stringify(meta)};
    if(selector==='script[src^="/chok.js?v="]')return {getAttribute:()=>'/chok.js?v='+sha(code)};
    return null;
  },getElementById(){return null;}};
  const box={document:d,window:{crypto:webcrypto},TextEncoder,Promise,console,URLSearchParams,
    Date:class extends Date {static now(){return now;}},setTimeout:fn=>setTimeout(fn,0),clearTimeout,
    localStorage:{getItem(){return null;}},location:{search:''},fetch:async url=>{
      const name=decodeURIComponent(String(url).split('/').pop());requests.push(String(url));
      if(failed){errors.push(name);throw Error('transient commentary transport');}
      if(!names.includes(name)&&!options.newFile)return {ok:false,status:404};
      const raw=options.newFile||read('public/reader/chok/commentary/'+name).toString();
      return {ok:true,status:200,json:async()=>JSON.parse(raw),text:async()=>raw};
    }};
  vm.createContext(box);assert.equal(code.split(marker).length,2);
  vm.runInContext(code.replace(marker,'  globalThis.optionalQA={fetchCommentary:fetchCommentary,commentaryHTML:commentaryHTML};\n'+marker),box);
  return {requests,errors,box,load:name=>box.optionalQA.fetchCommentary(...key(name)),recover(){failed=false;},setNow(value){now=value;}};
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
 assert.equal(h.requests.length,count);console.log(JSON.stringify({availableDomain:count,filesSHA256:sha(JSON.stringify(names)),sourceSHA256:sha(code)}));
});
test('missing, malformed, mismatched and stale snapshots fail open, never false absence',async()=>{
 const base=metadata();const bad=[null,'not JSON',{}, {...base,schema:'foreign'}, {...base,clientSHA256:'0'.repeat(64)}, {...base,filesSHA256:'0'.repeat(64)}, {...base,files:[]}, {...base,files:[...names,names[0]]}, {...base,generatedAt:Date.now()-86400001}, {...base,generatedAt:Date.now()+60000}];
 for(const meta of bad){const h=harness(meta);assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,3,'old retries retained: '+JSON.stringify(meta)?.slice(0,90));}
});
test('returning document, later data-only publication, transport failure and recovery',async()=>{
 const meta=metadata(),h=harness(meta,{newFile:read('public/reader/chok/commentary/בראשית-yom-rishon.json').toString()});
 assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,0);
 h.setNow(meta.generatedAt+86400001);const added=await h.load(absent[0]);assert(added);assert.equal(h.requests.length,1,'lease expiry exposes data-only addition without page reload');
 const t=harness(metadata(),{fail:true}),available=names.find(n=>n!=='_template.json');assert.equal(await t.load(available),null);assert.equal(t.requests.length,3);t.recover();assert(await t.load(available));assert.equal(t.requests.length,4,'transport failures never permanently negative cached');
});
test('unavailable or rejecting digest verification fails open and recovers',async()=>{
 for(const crypto of [undefined,{subtle:{digest:async()=>{throw Error('transient metadata verification');}}}]){
  const h=harness();h.box.window.crypto=crypto;assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,3);h.box.window.crypto=webcrypto;assert.equal(await h.load(absent[0]),null);assert.equal(h.requests.length,3,'fresh verification recovers, no permanent negative/error cache');
 }
});
test('fresh producer observes a later file and refuses ambiguous publication inputs',async()=>{
 const {commentaryAvailability}=await import(pathToFileURL(path.join(root,'src/lib/chok-commentary-availability.mjs')));
 const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'chok-optional-producer-'));
 try{
  const target=path.join(dir,'public/reader/chok/commentary');fs.mkdirSync(target,{recursive:true});fs.copyFileSync(path.join(root,'public/chok.js'),path.join(dir,'public/chok.js'));
  const name=absent[0],raw=read('public/reader/chok/commentary/בראשית-yom-rishon.json');
  // Test-only future publication carrier. No repository data is created/changed.
  fs.writeFileSync(path.join(target,name),raw);const current=commentaryAvailability(dir);assert.deepEqual(current.files,[name]);
  const h=harness(current,{newFile:raw.toString()});assert.equal(JSON.stringify(await h.load(name)),JSON.stringify(JSON.parse(raw)));assert.equal(h.requests.length,1);
  fs.symlinkSync(path.join(target,name),path.join(target,'ambiguous.json'));assert.equal(commentaryAvailability(dir),null);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('exact new inverse preserves every current-main byte, rejects changed bodies and bank corruption',()=>{
 const helper=require('./chok-optional-commentary-inverse.cjs'),p=path.join(root,'scripts/chok-optional-commentary-admission.json'),raw=fs.readFileSync(p),bank=JSON.parse(raw);
 for(const [relative,row]of Object.entries(bank.paths)){
  const bytes=read(relative),pre=helper.restore(relative,bytes);assert.equal(sha(pre),row.beforeSHA256);assert.equal(pre.length,row.beforeBytes);assert.equal(helper.restore('foreign-owner',bytes),bytes);
  for(const pos of [0,Math.floor(bytes.length/2),bytes.length-1]){const bad=Buffer.from(bytes);bad[pos]^=1;assert.equal(helper.restore(relative,bad),bad);}
 }
 try{const bad=Buffer.from(raw);bad[Math.floor(bad.length/2)]^=1;fs.writeFileSync(p,bad);assert.throws(()=>helper.restore('public/chok.js',read('public/chok.js')),/CHOK_OPTIONAL_ADMISSION_PIN/);}
 finally{fs.writeFileSync(p,raw);}
 assert.equal(sha(helper.restore('public/chok.js',read('public/chok.js'))),bank.paths['public/chok.js'].beforeSHA256);
});
test('actual publication producer discovers exact current membership and fails open on missing input',async()=>{
 const {commentaryAvailability}=await import(pathToFileURL(path.join(root,'src/lib/chok-commentary-availability.mjs')));
 const data=commentaryAvailability(root);assert.deepEqual(data.files,names);assert.equal(data.clientSHA256,sha(read('public/chok.js')));assert.equal(data.filesSHA256,sha(JSON.stringify(names)));assert.equal(commentaryAvailability(path.join(root,'not-an-input')),null);
});
