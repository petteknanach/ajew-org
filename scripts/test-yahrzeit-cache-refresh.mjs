import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const names = ['tzaddikim-database.json','tzaddikim-database-complete.json','tzaddikim-database-filtered.json'];
async function dispatch(path, {cached = 'OLD', network = 'NEW', status = 200, offline = false, method = 'GET', origin = 'https://ajew.org', quota = false} = {}) {
  const events = {}, calls = [], writes = [];
  const cache = {match: async () => cached === null ? undefined : new Response(cached), put: async (request, response) => {if (quota) throw Error('quota'); writes.push(await response.text());}};
  const context = {
    URL, Response, self: {location:{origin:'https://ajew.org'},addEventListener:(name, fn)=>events[name]=fn},
    caches: {open:async()=>cache,match:cache.match},
    fetch: async (request, options) => {calls.push({url:request.url,cache:options?.cache});if(offline)throw Error('offline');return new Response(network,{status});},
  };
  vm.runInNewContext(source, context);
  let pending;
  events.fetch({request:{url:origin+path,method,headers:{get:()=>null}},respondWith:p=>pending=p});
  const response = pending ? await pending : null;
  return {response,body:response?await response.text():null,calls,writes};
}
for (const name of names) {
  test(name+': network revalidation wins over stale cached calendar',async()=>{
    const r=await dispatch('/data/'+name);assert.equal(r.body,'NEW');assert.equal(r.calls[0].cache,'no-cache');assert.deepEqual(r.writes,['NEW']);
  });
  test(name+': offline fallback is retained',async()=>{
    const r=await dispatch('/data/'+name,{offline:true});assert.equal(r.body,'OLD');assert.deepEqual(r.writes,[]);
  });
}
test('server error does not poison the last successful calendar',async()=>{
  const r=await dispatch('/data/'+names[0],{status:500,network:'ERROR'});assert.equal(r.body,'OLD');assert.deepEqual(r.writes,[]);
});
test('offline without cached data returns an explicit 503',async()=>{
  const r=await dispatch('/data/'+names[0],{offline:true,cached:null});assert.equal(r.response.status,503);assert.equal(JSON.parse(r.body).error,'Offline');
});
test('storage quota failure does not discard a fresh online response',async()=>{
  const r=await dispatch('/data/'+names[0],{quota:true});assert.equal(r.body,'NEW');
});
test('query variants retain revalidation',async()=>{
  const r=await dispatch('/data/'+names[0]+'?v=one');assert.equal(r.body,'NEW');assert.equal(r.calls[0].cache,'no-cache');
});
test('other JSON, non-GET and foreign-origin calendar URLs are untouched',async()=>{
  for(const [path,options] of [['/data/other.json',{}],['/data/'+names[0],{method:'POST'}],['/data/'+names[0],{origin:'https://example.org'}]]) {
    const r=await dispatch(path,options);assert.equal(r.response,null);assert.deepEqual(r.calls,[]);
  }
});
test('existing reader stale-while-revalidate and static cache-first remain intact',async()=>{
  const reader=await dispatch('/reader/book/one.json');assert.equal(reader.body,'OLD');assert.equal(reader.calls[0].cache,undefined);
  const script=await dispatch('/reader-script.js');assert.equal(script.body,'OLD');assert.deepEqual(script.calls,[]);
});
