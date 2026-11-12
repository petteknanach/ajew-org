import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const paths=JSON.parse(readFileSync(new URL('./fixtures/not-found-recovery-paths.json',import.meta.url)));
for (const worker of ['sw.js','sw-v2.js']) {
  test(`${worker}: genuine fetch listener preserves 404, cached valid pages, and offline failure status`, async()=>{
    const origin='https://ajew.org', listeners={}, puts=[], network=[];
    let offline=false;
    const store=new Map([[origin+'/',new Response('HOME',{status:200})],['/',new Response('HOME',{status:200})],['/offline.html',new Response('<main>Genuine offline fixture</main>',{status:200})]]);
    const cache={match:async r=>store.get(typeof r==='string'?r:r.url)?.clone(),put:async(r,v)=>{puts.push(r.url);store.set(r.url,v)},addAll:async()=>{}};
    const box={URL,Response,console,importScripts(){},self:{location:{origin},addEventListener:(k,f)=>listeners[k]=f},caches:{match:cache.match,open:async()=>cache},fetch:async r=>{network.push(r.url);if(offline)throw Error('Offline control');return new Response('ACTUAL NOT FOUND RESPONSE',{status:404,headers:{'Content-Type':'text/html'}})}};
    vm.runInNewContext(readFileSync(new URL('../public/'+worker,import.meta.url),'utf8'),box,{filename:worker});
    async function get(path) {let result;listeners.fetch({request:{url:origin+path,method:'GET',headers:{get:name=>name==='accept'?'text/html':null}},respondWith:p=>result=p});assert(result);return await result;}
    for(const path of paths) {
      // A historical cached 200 must not override an online genuine 404.
      store.set(origin+path,new Response('STALE SUCCESS',{status:200}));
      const r=await get(path);assert.equal(r.status,404);assert.equal(await r.text(),'ACTUAL NOT FOUND RESPONSE');
      store.delete(origin+path);
    }
    assert.equal(puts.length,0,'404s must never enter the success cache');
    offline=true;
    for(const path of [...paths,'/unknown-book/']) {const r=await get(path);assert.equal(r.status,503);assert.notEqual(await r.text(),'HOME');}
    const valid='/reader/likutay-moharan/2/1/';store.set(origin+valid,new Response('EXISTING VALID CACHE',{status:200}));
    const r=await get(valid);assert.equal(r.status,200);assert.equal(await r.text(),'EXISTING VALID CACHE');
    assert.equal(puts.length,0);
  });
}
