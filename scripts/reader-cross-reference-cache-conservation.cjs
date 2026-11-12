'use strict';
// Exact query-only outer inverse. No source body, old fixture or old pin is rebased.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const sha = b => createHash('sha256').update(b).digest('hex');
const raw = fs.readFileSync(path.join(__dirname, 'reader-cross-reference-cache-delta.json'));
assert.equal(sha(raw), 'f2fe87303dc58496d37f671b9316bd7c42a3caf7a186007d59ffa25ab731a89a', 'XREF_QUERY_AUTHORITY_PIN');
const delta = JSON.parse(raw);
assert.equal(Object.keys(delta.paths).length, 258, 'XREF_EXACT_QUERY_DOMAIN');
function restore(relative, bytes) {
  const d = delta.paths[relative];
  if (!d || !Buffer.isBuffer(bytes) || sha(bytes) !== d.afterSHA256) return bytes;
  assert.equal(bytes.length, d.afterBytes, 'XREF_QUERY_AFTER_BYTES:' + relative);
  const s = bytes.toString('utf8');
  assert.equal(s.split(delta.url).length, 2, 'XREF_QUERY_UNIQUE:' + relative);
  const before = Buffer.from(s.replace(delta.url, d.previousURL));
  assert.equal(before.length, d.beforeBytes);
  assert.equal(sha(before), d.beforeSHA256, 'XREF_QUERY_WHOLE_INVERSE:' + relative);
  return before;
}
function requireCurrent(relative, bytes) {
  const d = delta.paths[relative];
  assert(d, 'XREF_QUERY_SELECTED_PATH:' + relative);
  assert.equal(sha(bytes), d.afterSHA256, 'XREF_QUERY_REQUIRED_CURRENT:' + relative);
  return restore(relative, bytes);
}
module.exports = {restore, requireCurrent, delta};
if (require.main === module) (async () => {
  const root = path.resolve(__dirname, '..'), {execFileSync} = require('node:child_process');
  const paths = Object.keys(delta.paths);
  const predecessorCommit = '6a25210908f78164e4b570a9a80db46d49fd1d69', predecessorURL = '/reader-script.js?v=xref-membership-7630cd78fcb4';
  const actual = execFileSync('git', ['grep', '-l', '-z', '-F', 'reader-script.js?v=', 'HEAD', '--', 'src'], {cwd:root})
    .toString().split('\0').filter(Boolean).map(p=>p.slice(5)).filter(p=>p.endsWith('.astro')).sort();
  assert.equal(actual.length, 248);
  assert.equal(sha(actual.join('\n')), 'a04df1b755ef33557e632d32891c8adc9ada75a147fd8335b0f5d12234b0c6f7');
  assert.deepEqual(paths.filter(p=>p.endsWith('.astro')), actual);
  const scan = (needle, area) => execFileSync('git', ['grep', '-l', '-z', '-F', needle, 'HEAD', '--', area], {cwd:root})
    .toString().split('\0').filter(Boolean).map(p=>p.slice(5)).sort();
  const staticHTML = scan('reader-script.js?v=', 'public').filter(p=>p.endsWith('.html'));
  // Operative generator sources, not frozen JSON/HTML fixtures or test assertions.
  const producers = scan('<script src="' + '/reader-script.js?v=', 'scripts')
    .filter(p=>/\.(?:cjs|mjs|js|py)$/.test(p) && !/(?:^|\/)(?:test[-_]|.*\.test\.)/.test(p));
  assert.equal(staticHTML.length, 2);
  assert.equal(producers.length, 8);
  assert.deepEqual(paths.filter(p=>p.startsWith('public/')), staticHTML);
  assert.deepEqual(paths.filter(p=>p.startsWith('scripts/')), producers);
  let negativeControls = 0;
  for (const relative of paths) {
    const b = fs.readFileSync(path.join(root, relative)), d = delta.paths[relative];
    const old = requireCurrent(relative, b);
    const predecessor = execFileSync('git', ['show', predecessorCommit + ':' + relative], {cwd:root,maxBuffer:8*1024*1024});
    assert.equal(predecessor.toString().split(predecessorURL).length, 2);
    assert.deepEqual(Buffer.from(predecessor.toString().replace(predecessorURL, delta.url)), b, 'INDEPENDENT_CURRENT_PARENT_QUERY_ONLY:' + relative);
    assert.deepEqual(Buffer.from(b.toString().replace(delta.url, predecessorURL)), predecessor, 'CURRENT_PARENT_QUERY_INVERSE:' + relative);
    const gitOld = execFileSync('git', ['show', delta.sourceCommit + ':' + relative], {cwd:root,maxBuffer:8*1024*1024});
    assert.deepEqual(old, gitOld, 'INDEPENDENT_GIT_QUERY_PREIMAGE:' + relative);
    assert.equal(old.toString().split(d.previousURL).length, 2);
    assert.deepEqual(Buffer.from(old.toString().replace(d.previousURL, delta.url)), b, 'QUERY_FORWARD:' + relative);
    const corrupt = Buffer.from(b); corrupt[Math.floor(b.length/2)] ^= 1;
    for (const bad of [old, corrupt, Buffer.concat([b,Buffer.from(' ')]), Buffer.from(b.toString().replace(delta.url,delta.url+'-wrong')), Buffer.from(b.toString().replace(delta.url,delta.url+' '+delta.url))]) {
      assert.equal(restore(relative,bad), bad, 'UNADMITTED_QUERY_BYTES');
      assert.throws(()=>requireCurrent(relative,bad), assert.AssertionError); negativeControls++;
    }
    assert.equal(restore('unselected/source',b), b); negativeControls++;
    assert.deepEqual(requireCurrent(relative,b), old, 'FRESH_QUERY_POSITIVE');
  }
  const candidate = fs.readFileSync(path.join(root,'public/reader-script.js'));
  assert.equal(sha(candidate), delta.runtimeSHA256, 'XREF_RUNTIME_BYTE_BOUND_URL');
  // Actual frozen cache-first workers, warmed with every historical query key.
  // No installed worker, browser, cache policy or global cache name is changed.
  const vm = require('node:vm'), origin='https://ajew.org', warmed=[...new Set(paths.map(p=>delta.paths[p].previousURL)), '/reader-script.js', predecessorURL, '/reader-script.js?v=xref-recognition-947964bb91d9'];
  const workerResults=[];
  for (const worker of ['public/sw.js','public/sw-v2.js']) {
    const listeners={}, store=new Map(warmed.map(u=>[origin+u,new Response('HISTORICAL:'+u)])), network=[];
    const cache={match:async r=>store.get(typeof r==='string'?r:r.url),put:async(r,v)=>store.set(r.url,v),addAll:async()=>{}};
    const box={URL,Response,console,importScripts(){},self:{location:{origin},addEventListener:(k,f)=>listeners[k]=f},caches:{match:cache.match,open:async()=>cache},fetch:async r=>{network.push(r.url);return new Response(candidate);}};
    vm.runInNewContext(fs.readFileSync(path.join(root,worker),'utf8'),box,{filename:worker});
    async function get(u){let result;listeners.fetch({request:{url:origin+u,method:'GET',headers:{get:()=>null}},respondWith:p=>result=p});assert(result);return (await result).text();}
    for (const u of warmed) assert.equal(await get(u),'HISTORICAL:'+u);
    assert.equal(network.length,0,'OLD_KEYS_STAY_CACHED');
    assert.equal(await get(delta.url), candidate.toString());
    assert.deepEqual(network,[origin+delta.url],'FRESH_QUERY_FETCHES_EXACT_RUNTIME');
    await new Promise(r=>setImmediate(r));
    assert.equal(await get(delta.url),candidate.toString());assert.equal(network.length,1,'FRESH_QUERY_REUSED');
    workerResults.push({worker,warmedKeys:warmed.length,newNetworkRequests:network.length});
  }
  console.log(JSON.stringify({gate:'XREF_QUERY_ONLY_CONSERVATION',paths:paths.length,astro:actual.length,staticHTML:2,producers:8,negativeControls,freshPositives:paths.length,runtimeSHA256:sha(candidate),workerResults}));
})().catch(e=>{console.error(e);process.exitCode=1;});
