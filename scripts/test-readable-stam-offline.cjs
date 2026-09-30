#!/usr/bin/env node
// Execute each real service worker's fetch handlers with explicit cache/network adapters.
// This proves response and cache policies, not a browser installation or live delivery.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const assets=['/tikkun/study-geometry.json?v=readable-stam-20260930-r3',...['bare','nikud','taamim','full'].map(m=>`/fonts/tikkun/study-stam/AjewStudyStam-${m}.ttf?v=study-1`)];
async function run(file) {
 const handlers={},stored=new Map(),added=[],puts=[];let online=true;
 const key=r=>typeof r==='string'?r:r.url;
 const cache={match:async r=>stored.get(key(r)),put:async(r,response)=>{stored.set(key(r),response);puts.push(key(r));},addAll:async urls=>{added.push(...urls);}};
 const caches={open:async()=>cache,match:async r=>stored.get(key(r)),keys:async()=>[],delete:async()=>true};
 const fetch=async r=>{if(!online)throw Error('Explicit offline fixture');return new Response(JSON.stringify({actualUrl:key(r)}),{status:200,headers:{'Content-Type':'application/json'}});};
 vm.runInNewContext(fs.readFileSync(path.join(root,'public',file),'utf8'),{self:{addEventListener:(type,fn)=>handlers[type]=fn,skipWaiting:()=>{},clients:{claim:()=>{}}},caches,fetch,Response,Request,URL,console});
 const waits=[];handlers.install({waitUntil:p=>waits.push(p)});await Promise.all(waits);
 for(const a of assets){assert(added.includes(a),file+' must precache exact font/geometry URL');assert(fs.existsSync(path.join(root,'public',a.split('?')[0])),a);}
 const request=url=>new Request('https://ajew.org'+url);
 const respond=async url=>{let promise;handlers.fetch({request:request(url),respondWith:p=>promise=p});assert(promise,url+' needs a cache route');const result=await promise;assert(result instanceof Response,file+' must produce Response, not null/undefined');return result;};
 const geometry=assets[0];assert.equal((await respond(geometry)).status,200);
 assert(puts.includes('https://ajew.org'+geometry));online=false;
 assert.equal((await respond(geometry)).status,200,'warm geometry offline');
 for(const a of assets.slice(1)){stored.set('https://ajew.org'+a,new Response('actual cached font fixture'));assert.equal((await respond(a)).status,200);}
 for(const uri of ['/tikkun/uncached.json','/reader/uncached.json']){const r=await respond(uri);assert.equal(r.status,503);assert.equal((await r.json()).error,'Offline');}
 return {file,precacheAssetsVerified:assets.length,warmGeometry:true,warmFonts:4,coldJson503:2,scope:'Node real-script handlers; not browser/live proof'};
}
(async()=>{const results=[];for(const file of ['sw.js','sw-v2.js'])results.push(await run(file));console.log(JSON.stringify({pass:true,results},null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
