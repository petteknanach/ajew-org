'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {createHash}=require('node:crypto');
const vm=require('node:vm');
const source=readFileSync(resolve(__dirname,'../../../public/sw.js'),'utf8');
const origin='https://ajew.org';
function harness(options={}) {
  const handlers={}, calls={fetch:[],match:[],put:[],deleted:[]};
  const cached=()=>options.cached===null?undefined:new Response(options.cached??'OLD');
  const cache={match:async req=>{calls.match.push(req.url);return cached();},put:async (req,value)=>{calls.put.push(req.url);}};
  const caches={match:cache.match,open:async()=>cache,keys:async()=>['ajew-v9-aitzoas-confirmed-literals-20261022'],delete:async n=>{calls.deleted.push(n);return true;}};
  vm.runInNewContext(source,{URL,Response,caches,self:{location:{origin},addEventListener:(type,fn)=>{handlers[type]=fn;},skipWaiting(){},clients:{claim(){}}},fetch:async(req,init)=>{calls.fetch.push({url:req.url,init});if(options.offline)throw Error('offline');return new Response('NETWORK',{status:options.status??200});}});
  return {calls,async request(url='/blog/write/share.js',method='GET',accept='*/*') {let result;handlers.fetch({request:new Request(new URL(url,origin),{method,headers:{accept}}),respondWith(p){assert.equal(result,undefined);result=Promise.resolve(p);}});return result?await result:undefined;}};
}
test('single additive block has an exact whole-byte inverse; cache name and all old code retained',()=>{
 const pattern=/^  \/\/ The dynamic writer[\s\S]*?(?=  \/\/ Calendar metadata)/gm;
 assert.equal([...source.matchAll(pattern)].length,1);
 assert.equal(createHash('sha256').update(source.replace(pattern,'')).digest('hex'),'78b03037e7b45c6bacc691d89cbba98a5f063a74bc6bbc4ca55d952a34b806dd');
});
for(const url of ['/blog/write/share.js','/blog/write/share.js?v=next']) test('writer script consumes genuine network, not old cached script: '+url,async()=>{
 const h=harness();const response=await h.request(url);assert.equal(await response.text(),'NETWORK');assert.equal(h.calls.fetch.length,1);assert.equal(h.calls.fetch[0].init.cache,'no-store');assert.equal(h.calls.match.length,0);assert.equal(h.calls.put.length,0);assert.deepEqual(h.calls.deleted,[]);
});
test('offline writer uses unchanged existing cached copy',async()=>{const h=harness({offline:true});const r=await h.request();assert.equal(await r.text(),'OLD');assert.equal(h.calls.fetch.length,1);assert.equal(h.calls.match.length,1);assert.equal(h.calls.put.length,0);assert.deepEqual(h.calls.deleted,[]);});
test('offline and uncached writer fails honestly with JS503',async()=>{const h=harness({offline:true,cached:null});const r=await h.request();assert.equal(r.status,503);assert.equal(r.headers.get('content-type'),'application/javascript');assert.equal(await r.text(),'');});
test('real HTTP503 is not disguised as successful stale script',async()=>{const h=harness({status:503});const r=await h.request();assert.equal(r.status,503);assert.equal(h.calls.match.length,0);});
for(const url of ['/other.js','/reader-script.js','/blog/write/share-extra.js','/blog/write/sub/share.js','https://other.example/blog/write/share.js','/image.svg']) test('unrelated static cache-first contract preserved: '+url,async()=>{const h=harness();const r=await h.request(url);assert.equal(await r.text(),'OLD');assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.match.length,1);assert.deepEqual(h.calls.deleted,[]);});
for(const [url,method] of [['/blog/write/share.js','POST'],['/api/data.js','GET']]) test('existing network-pass-through preserved: '+url+' '+method,async()=>{const h=harness();assert.equal(await h.request(url,method),undefined);assert.equal(h.calls.fetch.length,0);assert.equal(h.calls.match.length,0);});
test('existing reader JSON SWR stays unchanged',async()=>{const h=harness();const r=await h.request('/reader/example/data.json');assert.equal(await r.text(),'OLD');assert.equal(h.calls.fetch.length,1);});
test('calendar network-first branch stays unchanged',async()=>{const h=harness();const r=await h.request('/data/tzaddikim-database.json');assert.equal(await r.text(),'NETWORK');assert.equal(h.calls.fetch[0].init.cache,'no-cache');});
test('HTML network-first branch stays unchanged',async()=>{const h=harness();const r=await h.request('/blog/p/example/','GET','text/html');assert.equal(await r.text(),'NETWORK');assert.equal(h.calls.fetch.length,1);});
