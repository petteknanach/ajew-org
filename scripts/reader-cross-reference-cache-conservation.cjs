'use strict';
// Exact query-only outer inverse. No source body, old fixture or old pin is rebased.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto');
const sha = b => createHash('sha256').update(b).digest('hex');
function sourceInverse(method, relative, bytes) {
  // Historical definitions-only fixtures for disjoint owners need no new donor.
  // For either changed owner a missing/altered helper always fails closed.
  if (!['src/pages/reader/otzar-hayirah/[part]/[torah].astro', 'src/pages/reader/sefer-hamidos/[part]/[torah].astro'].includes(relative)) return bytes;
  const sourceHelper = path.join(__dirname, 'reader-source-successor-inverse.cjs');
  assert.equal(sha(fs.readFileSync(sourceHelper)), 'd8cfc5b3bce55d8341a7f0b577039d1db0c75cbdae3451c482bb1814dd0d29e6', 'SOURCE_SUCCESSOR_HELPER_PIN');
  return require(sourceHelper)[method](relative, bytes);
}
const guardHelper = path.join(__dirname, 'reader-optional-commentary-guard-conservation.cjs');
assert.equal(sha(fs.readFileSync(guardHelper)), '1cedf0cbf99372fc985ffcf0d4174f7857820d1d4acff35a64d9c805763074f5', 'OPTIONAL_GUARD_HELPER_PIN');
const optionalGuard = require(guardHelper);
const raw = fs.readFileSync(path.join(__dirname, 'reader-cross-reference-cache-delta.json'));
assert.equal(sha(raw), 'f2fe87303dc58496d37f671b9316bd7c42a3caf7a186007d59ffa25ab731a89a', 'XREF_QUERY_AUTHORITY_PIN');
const delta = JSON.parse(raw);
assert.equal(Object.keys(delta.paths).length, 258, 'XREF_EXACT_QUERY_DOMAIN');
// Independently scoped inverse of the two additive Story 1 film insertions in b0a552831.
function restoreLostPrincessFilm(relative, bytes) {
  if (relative !== "src/pages/reader/sipurey-maasiyos/[part]/[torah].astro" || !Buffer.isBuffer(bytes) || sha(bytes) !== "ef0db297bbaff31e0e915a37329a5fef2ebcd564e5d60155bb8e835fed6b264c") return bytes;
  assert.equal(bytes.length, 17890, "STORY_FILM_AFTER_BYTES");
  const storyFilmBlock1 = Buffer.from("\n<style>\n  .story-film-link {\n    margin: 0 auto 1rem;\n    padding: .75rem 1rem;\n    max-width: 700px;\n    border: 1px solid var(--reader-border, #d8d9df);\n    border-radius: .6rem;\n    background: var(--reader-bg-secondary, #f8f5f0);\n    color: var(--reader-text, #222);\n    font: .9rem/1.5 'Open Sans', sans-serif;\n  }\n  .story-film-link p { margin: 0 0 .25rem; }\n  .story-film-link a {\n    display: inline-flex;\n    align-items: center;\n    flex-wrap: wrap;\n    gap: .45em;\n    min-height: 44px;\n    color: inherit;\n    text-decoration: underline;\n    text-underline-offset: .18em;\n    font-weight: 700;\n  }\n  .story-film-link [lang='he'] { margin-inline-start: .35em; }\n  .story-film-link a:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }\n</style>\n");
  assert.deepEqual(bytes.subarray(17114, 17890), storyFilmBlock1, "STORY_FILM_EXACT_INSERTION");
  bytes = Buffer.concat([bytes.subarray(0, 17114), bytes.subarray(17890)]);
  const storyFilmBlock2 = Buffer.from("      {part === '1' && torah === '1' && (\n        <aside id=\"lost-princess-film\" class=\"story-film-link\" aria-labelledby=\"lost-princess-film-heading\">\n          <p id=\"lost-princess-film-heading\"><strong>The Lost Princess</strong> <span lang=\"he\" dir=\"rtl\">מאבדת בת מלך</span></p>\n          <p>Film adaptation by <bdi>liner-design</bdi> · 7:12 · Higgsfield</p>\n          <a href=\"https://higgsfield.ai/@liner-design/projects/the-lost-princess-contest\" target=\"_blank\" rel=\"noopener noreferrer\">\n            <span aria-hidden=\"true\">▶</span> Watch on Higgsfield <span lang=\"he\" dir=\"rtl\">לצפייה בסרט</span>\n          </a>\n        </aside>\n      )}\n\n");
  assert.deepEqual(bytes.subarray(12027, 12699), storyFilmBlock2, "STORY_FILM_EXACT_INSERTION");
  bytes = Buffer.concat([bytes.subarray(0, 12027), bytes.subarray(12699)]);
  assert.equal(sha(bytes), "1d2d9fc7540e39ce3e66eafcab2c8c0c2513aa8d45fb0b52e903cdbbbabdbda4", "STORY_FILM_WHOLE_INVERSE");
  return bytes;
}
function restore(relative, bytes) {
  bytes = restoreLostPrincessFilm(relative, bytes);
  bytes = sourceInverse('restore', relative, bytes);
  bytes = optionalGuard.restore(relative, bytes);
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
  bytes = restoreLostPrincessFilm(relative, bytes);
  bytes = sourceInverse('requireCurrent', relative, bytes);
  bytes = optionalGuard.requireCurrent(relative, bytes);
  const d = delta.paths[relative];
  assert(d, 'XREF_QUERY_SELECTED_PATH:' + relative);
  assert.equal(sha(bytes), d.afterSHA256, 'XREF_QUERY_REQUIRED_CURRENT:' + relative);
  // The outer admission has already run; restore the authenticated inner body.
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
  // Scan the same recursive .html domain directly, without loading discarded media blobs.
  const staticHTML = scan('reader-script.js?v=', ':(glob)public/**/*.html').filter(p=>p.endsWith('.html'));
  // Operative generator sources, not frozen JSON/HTML fixtures or test assertions.
  const producers = scan('<script src="' + '/reader-script.js?v=', 'scripts')
    .filter(p=>/\.(?:cjs|mjs|js|py)$/.test(p) && !/(?:^|\/)(?:test[-_]|.*\.test\.)/.test(p));
  assert.equal(staticHTML.length, 2);
  assert.equal(producers.length, 8);
  assert.deepEqual(paths.filter(p=>p.startsWith('public/')), staticHTML);
  assert.deepEqual(paths.filter(p=>p.startsWith('scripts/')), producers);
  // Check the current pointing-version pins before replaying this historical,
  // query-only proof on the exact pre-pointing templates.
  const pointing = require('./genesis-30-20-segoal-inverse.cjs');
  const pointingPins = require('./genesis-30-37-patach-admission.json').paths;
  const shoorook = require('./genesis-32-18-shoorook-inverse.cjs');
  let negativeControls = 0;
  for (const relative of paths) {
    let b = fs.readFileSync(path.join(root, relative));
    if (pointingPins[relative]) {
      const current = b;
      assert.equal(sha(current), shoorook.paths[relative].after, 'SHOOROOK_REQUIRED_CURRENT:' + relative);
      assert.equal(sha(shoorook.restore(relative,current)), pointingPins[relative][1], 'POINTING_REQUIRED_PREDECESSOR:' + relative);
      b = pointing.restore(relative, current);
      assert.notEqual(b, current, 'POINTING_INVERSE_REQUIRED:' + relative);
      const changed = Buffer.concat([current, Buffer.from(' ')]);
      assert.equal(pointing.restore(relative, changed), changed, 'UNADMITTED_POINTING_BYTES');
      negativeControls++;
    }
    const d = delta.paths[relative];
    const queryCurrent = optionalGuard.requireCurrent(relative, sourceInverse('requireCurrent', relative, restoreLostPrincessFilm(relative, b)));
    const old = requireCurrent(relative, b);
    const predecessor = execFileSync('git', ['show', predecessorCommit + ':' + relative], {cwd:root,maxBuffer:8*1024*1024});
    assert.equal(predecessor.toString().split(predecessorURL).length, 2);
    assert.deepEqual(Buffer.from(predecessor.toString().replace(predecessorURL, delta.url)), queryCurrent, 'INDEPENDENT_CURRENT_PARENT_QUERY_ONLY:' + relative);
    assert.deepEqual(Buffer.from(queryCurrent.toString().replace(delta.url, predecessorURL)), predecessor, 'CURRENT_PARENT_QUERY_INVERSE:' + relative);
    if (optionalGuard.delta.paths[relative]) {
      const gitGuardOld = execFileSync('git', ['show', optionalGuard.delta.sourceCommit + ':' + relative], {cwd:root});
      assert.deepEqual(queryCurrent, gitGuardOld, 'INDEPENDENT_GIT_GUARD_PREIMAGE:' + relative);
      assert.throws(()=>requireCurrent(relative, queryCurrent), assert.AssertionError, 'MISSING_CURRENT_GUARD'); negativeControls++;
    }
    const gitOld = execFileSync('git', ['show', delta.sourceCommit + ':' + relative], {cwd:root,maxBuffer:8*1024*1024});
    assert.deepEqual(old, gitOld, 'INDEPENDENT_GIT_QUERY_PREIMAGE:' + relative);
    assert.equal(old.toString().split(d.previousURL).length, 2);
    assert.deepEqual(Buffer.from(old.toString().replace(d.previousURL, delta.url)), queryCurrent, 'QUERY_FORWARD:' + relative);
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
