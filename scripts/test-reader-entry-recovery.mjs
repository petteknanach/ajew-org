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
