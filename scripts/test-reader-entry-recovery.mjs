import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { transform } from '@astrojs/compiler';
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const entries = JSON.parse(read('src/data/reader-entry-recovery.json'));
const runtime = read('public/reader-entry-recovery.js');
function enhance(entry, search, pathname = entry.directory) {
  const output = {textContent: ''};
  const marker = {dataset: {entryRecoveryKey: entry.key, entryRecoveryDirectory: entry.directory, entryRecoverySource: entry.path}};
  const notice = {hidden: true, querySelectorAll: () => [marker], querySelector: () => output};
  const location = {pathname, search, hash: '#seg-5'};
  const original = JSON.stringify(location);
  vm.runInNewContext(runtime, {URLSearchParams, window: {location}, document: {querySelectorAll: () => [notice]}});
  assert.equal(JSON.stringify(location), original, 'original query and fragment never modified');
  return {notice, output};
}
test('exact finite admission: 19 LM II unavailable addresses and one story, no inferred content', () => {
  assert.equal(entries.length, 20);
  assert.equal(new Set(entries.map(e => e.path)).size, 20);
  const lm = entries.filter(e => e.book === 'likutay-moharan');
  assert.deepEqual(lm.map(e => Number(e.path.split('-').at(-1))).sort((a,b)=>a-b), [296,306,345,389,408,409,429,461,464,481,483,511,514,535,553,561,598,660,678]);
  for (const e of entries) {
    const lm = e.book === 'likutay-moharan';
    assert.equal(e.directory, lm ? '/reader/likutay-moharan/2/' : '/reader/sipurey-maasiyos/1/');
    assert.equal(fs.existsSync(new URL(lm ? `public${e.path}.json` : 'public/reader/sipurey-maasiyos/story-20.json', root)), false);
  }
  const index = JSON.parse(read('public/reader/likutay-moharan/part-2/index.json'));
  assert.deepEqual(index.torahs.map(t=>Number(t.number)).sort((a,b)=>a-b), Array.from({length:125},(_,i)=>i+1));
  assert.ok(!JSON.parse(read('public/reader/sipurey-maasiyos/index.json')).torahs.some(t=>Number(t.number)===20));
});
test('every admitted entry shows its exact static address, on its owning directory only', () => {
  for (const e of entries) {
    const {notice, output} = enhance(e, '?ajew_unavailable='+e.key+'&q=%3Cimg%20src=x%20onerror=alert(1)%3E&q=&q=two');
    assert.equal(notice.hidden, false);
    assert.equal(output.textContent, e.path);
    assert.equal(enhance(e, '?ajew_unavailable='+e.key, '/reader/other/1/').notice.hidden, true);
  }
});
test('ordinary directories, malformed keys and reflected HTML cannot create a notice', () => {
  for (const query of ['', '?q=one', '?ajew_unavailable=', '?ajew_unavailable=lm2-126', '?ajew_unavailable=%3Cscript%3E', '?ajew_unavailable=stories1-20/../', '?ajew_unavailable=lm2-514%00']) {
    const {notice, output}=enhance(entries[0],query);assert.equal(notice.hidden,true);assert.equal(output.textContent,'');
  }
});
test('prefixed server key wins without discarding any original repeated parameters', () => {
  for (const e of entries) assert.equal(enhance(e, '?ajew_unavailable='+e.key+'&ajew_unavailable=other&x=&x=2').notice.hidden,false);
});
test('current real linkifier continues to reject all 20 nonexistent identities', () => {
  const source=read('public/reader-script.js'),start=source.indexOf('  const _hebrewNums ='),end=source.indexOf('  // --- Add permalink buttons',start);
  assert.ok(start>0&&end>start);const c=vm.createContext({});vm.runInContext(source.slice(start,end)+';globalThis.api={linkifyEnglish,linkifyHebrew};',c);
  for (const e of entries) {
    const input=e.book==='likutay-moharan'?'LM II: '+e.path.split('-').at(-1):"Rabbi Nachman's Stories 20";
    const output=c.api.linkifyEnglish(input)||input;
    assert.equal(output,input);
  }
  assert.match(c.api.linkifyEnglish('LM II: 125'),/href="\/reader\/likutay-moharan\/2\/125\/"/);
  assert.match(c.api.linkifyEnglish("Rabbi Nachman's Stories 13"),/href="\/reader\/sipurey-maasiyos\/1\/13\/"/);
});
test('complete changed Astro templates and new notice compile with no compiler errors', async () => {
  for (const path of ['src/components/ReaderEntryRecoveryNotice.astro','src/pages/reader/likutay-moharan/[part]/index.astro','src/pages/reader/sipurey-maasiyos/[part]/index.astro']) {
    const result=await transform(read(path),{filename:path});assert.deepEqual(result.diagnostics.filter(d=>d.severity===1),[],path);
  }
});
test('both actual directory owners opt in once and escaped path output is isolated', () => {
  for (const book of ['likutay-moharan','sipurey-maasiyos']) {
    const source=read(`src/pages/reader/${book}/[part]/index.astro`);
    assert.equal(source.split('<ReaderEntryRecoveryNotice directory=').length-1,1);
    assert.ok(source.includes('`/reader/'+book+'/${partNum}/`'));
  }
  assert.ok(runtime.includes('output.textContent = entry.dataset.entryRecoverySource;'));
  assert.ok(!runtime.includes('innerHTML')&&!runtime.includes('location.href =')&&!runtime.includes('location.replace'));
  const component=read('src/components/ReaderEntryRecoveryNotice.astro');
  assert.match(component,/not a replacement teaching/);
  assert.match(component,/data-entry-recovery hidden role="status"/);
});

// Separate successor: the seven GA20 tests above remain byte-for-byte intact.
const finiteEntries = JSON.parse(read('src/data/reader-finite-entry-recovery.json'));
const finiteRuntime = new vm.Script(read('public/reader-finite-entry-recovery.js'));
function finiteEnhance(search, options = {}) {
  const nodes = Object.fromEntries(['known','unknown','address','title','hebrew-title','part','reviewed','directory'].map(id => [id, {hidden: ['known','reviewed'].includes(id), textContent:'', attrs:{}, setAttribute(k,v){this.attrs[k]=v;}}]));
  const registry = {textContent: JSON.stringify(options.entries || finiteEntries)};
  const location = Object.freeze({pathname: options.pathname || '/reader/entry-recovery/', search, hash: options.hash || '#seg-999?ajew_entry=foreign'});
  const original = JSON.stringify(location);
  const forbidden = () => {throw Error('privacy side effect');};
  const window = {location, get localStorage(){return forbidden();}, get sessionStorage(){return forbidden();}, history:{pushState:forbidden,replaceState:forbidden}};
  const document = {getElementById(id){if(id==='finite-recovery-registry') return registry; return nodes[id.replace('finite-recovery-','')];},get cookie(){return forbidden();},set cookie(_){forbidden();}};
  finiteRuntime.runInNewContext({window,document,fetch:forbidden,XMLHttpRequest:forbidden,URLSearchParams,navigator:{sendBeacon:forbidden}});
  assert.equal(JSON.stringify(location),original);
  return nodes;
}
test('finite successor: 1997 literal HTML bindings; raw and three actual source producers excluded', () => {
  assert.equal(finiteEntries.length,1997);
  assert.equal(new Set(finiteEntries.map(e=>e.key)).size,1997);
  assert.equal(new Set(finiteEntries.map(e=>e.originalURL)).size,1997);
  assert.equal(new Set(finiteEntries.map(e=>e.directory)).size,74);
  assert.equal(finiteEntries.filter(e=>e.englishBook).length,59);
  for(const e of finiteEntries){
    assert.match(e.key,/^entry-[a-f0-9]{20}$/);
    assert.ok(!/\.(?:txt|md|json|js)(?:$|\/)/i.test(e.originalURL));
    assert.ok(!entries.some(old=>old.path===e.originalURL));
    assert.ok(!['/reader/otzar-hayirah/2/21','/reader/otzar-hayirah/2/23','/reader/otzar-hayirah/3/29'].includes(e.originalURL));
    if(e.englishBook){assert.match(e.originalURL,/^\/books\/blossoms-of-the-spring\/letter[0-9]+$/);assert.equal(e.directory,'/books/blossoms-of-the-spring/');assert.equal(e.title,'Blossoms of the Spring');}
    if(e.reviewedEdition) assert.match(e.directory,/^\/reader\/reviewed\/(?:yimai-hatlaos|yereach-haeitanim)\/$/);
  }
});
test('actual finite runtime binds every literal original address and its book only; collisions cannot win', () => {
  for(const e of finiteEntries){
    const n=finiteEnhance('?ajew_entry='+e.key+'&ajew_entry=foreign&q=%3Cimg%20onerror=alert(1)%3E&q=&q=two');
    assert.equal(n.known.hidden,false,e.originalURL);assert.equal(n.unknown.hidden,true);
    assert.equal(n.address.textContent,e.originalURL);assert.equal(n.title.textContent,e.title);assert.equal(n['hebrew-title'].textContent,e.hebrewTitle);
    assert.equal(n.directory.attrs.href,e.directory);assert.equal(n.reviewed.hidden,!e.reviewedEdition);
  }
});
test('first literal field only: unknown, empty, encoded, malformed, later and fragment keys never misidentify a book', () => {
  const key=finiteEntries[0].key;
  for(const q of ['', '?','?q=one','?ajew_entry=','?ajew_entry=foreign','?ajew_entry=entry-00000000000000000000','?ajew_entry='+key+'%00','?ajew_entry='+key+'%20','?ajew_entry='+key.toUpperCase(),'?%61jew_entry='+key,'?ajew_entry=%65'+key.slice(1),'?ajew_entry=+'+key,'?q=&ajew_entry='+key,'?&ajew_entry='+key,'?ajew_entry=&ajew_entry='+key,'?ajew_entry=foreign&ajew_entry='+key,'?ajew_entry='+key+';ajew_entry=other','?ajew_entry=%3C/script%3E','?ajew_entry=__proto__','?ajew_entry=constructor']){
    const n=finiteEnhance(q,{hash:'#ajew_entry='+key});assert.equal(n.known.hidden,true,q);assert.equal(n.address.textContent,'',q);assert.equal(n.directory.attrs.href,undefined,q);
  }
  assert.equal(finiteEnhance('?ajew_entry='+key,{pathname:'/reader/other/1/'}).known.hidden,true);
  assert.equal(finiteEnhance('?ajew_entry='+key,{entries:[finiteEntries[0],finiteEntries[0]]}).known.hidden,true,'duplicate registry keys fail closed');
});
test('finite page is isolated: no Layout, external assets, runtime side effects, reflected HTML or 2000 hidden articles', async () => {
  const source=read('src/pages/reader/entry-recovery.astro');
  const result=await transform(source,{filename:'src/pages/reader/entry-recovery.astro'});assert.deepEqual(result.diagnostics.filter(d=>d.severity===1),[]);
  assert.ok(!source.includes('Layout'));assert.match(source,/<meta name="referrer" content="no-referrer"/);assert.match(source,/<meta name="robots" content="noindex, nofollow"/);
  assert.match(source,/set:html=\{registry\}/);assert.equal((source.match(/type="application\/json"/g)||[]).length,1);
  assert.ok(!source.includes('.map('));assert.match(source,/not a replacement teaching/);assert.match(source,/no equivalence to another letter, teaching or language/);
  assert.ok(!/innerHTML|insertAdjacentHTML|fetch\(|localStorage|sessionStorage|pushState|replaceState|location\.(?:href|replace|assign)|https?:\/\//.test(read('public/reader-finite-entry-recovery.js')));
});
test('registry raw-text serialization survives closing-script, HTML entities and Unicode separators', async () => {
  const {recoveryRegistryJSON}=await import('../src/lib/reader-finite-entry-recovery.mjs');
  const canary=[{...finiteEntries[0],title:'</script><img src=x onerror=alert(1)>&"\u2028\u2029'}];
  const serialized=recoveryRegistryJSON(canary);assert.deepEqual(JSON.parse(serialized),canary);
  assert.ok(!/[<>&\u2028\u2029]/.test(serialized));assert.match(serialized,/\\u003c\/script\\u003e/);
  const n=finiteEnhance('?ajew_entry='+canary[0].key,{entries:JSON.parse(serialized)});assert.equal(n.title.textContent,canary[0].title);
});
