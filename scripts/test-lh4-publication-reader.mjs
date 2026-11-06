import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { snapshotFor, snapshotForIndices, persistSnapshot } from '../src/lib/lh-publication-reader.js';
import '../public/my-sefer-storage.js';
import { transform } from '@astrojs/compiler';
const root = new URL('../', import.meta.url);
const candidate = root;
const manifest = JSON.parse(fs.readFileSync(new URL('scripts/fixtures/lh4-reader/accepted-files.json', root)));
manifest.filePins = manifest.files;
const receipts = [];
for (const [path, expected] of Object.entries(manifest.files)) {
 const bytes = fs.readFileSync(new URL(path, root));
 assert.equal(bytes.length,expected.bytes,path);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256,path);
}
class Store {
  constructor() { this.values = new Map([['mySefer', JSON.stringify({name:'Explicit isolated source test',passages:[],createdAt:1,updatedAt:1})]]);this.writes=0; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes++;this.values.set(key,String(value)); }
}
const api = globalThis.AjewSeferStorage;
assert(api && typeof api.loadAndMigrate === 'function');
let fragmentCount=0, mixedPage=null, fragmentPage=null, negativeControls=0;
for (const route of manifest.readerRoutes) {
  const relative=`public/reader/likutay-halachos/part-1/halacha-${route}.json`;
  const bytes=fs.readFileSync(new URL(relative,candidate));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.filePins[relative].sha256);
  const data=JSON.parse(bytes),pathname=`/reader/likutay-halachos/1/${route}/`;
  const snapshot=snapshotFor(data,null,pathname);
  assert.deepEqual(snapshot.qualifiedFullBody.records,data.segments);
  assert.equal(snapshot.qualifiedFullBody.qualificationOccurrences.length,data.segments.length);
  for (let index=0;index<data.segments.length;index++) {
    const row=data.segments[index];
    if(row.en)assert(snapshot.savedText.includes(row.en));
    if(row.he_nikud)assert(snapshot.savedText.includes(row.he_nikud));
    for(const note of [...(row.translatorNotes||[]),...(row.sourceQualifications||[])])assert(snapshot.savedText.includes(note.text));
    assert.deepEqual(snapshot.qualifiedFullBody.qualificationOccurrences[index].orderedQualificationIds,[...(row.translatorNotes||[]),...(row.sourceQualifications||[])].map(note=>note.id));
    if(row.sourceRole==='supplied_english_source_paragraph') {
      fragmentCount++;fragmentPage=data;
      const single=snapshotFor(data,row.index,pathname);
      assert(single.savedText.includes(row.en)&&single.savedText.includes(row.sourceQualifications[0].text));
      assert.equal(single.qualifiedFullBody.records[0].he_nikud,'');
      assert.equal(single.qualifiedFullBody.records[0].exclusiveBilingualOwnerAsserted,false);
      assert.deepEqual(single.qualifiedFullBody.records[0].relatedReferences,row.relatedReferences);
    }
  }
  const publications=snapshot.qualifiedFullBody.publications;
  assert.deepEqual(new Set(publications.map(p=>p.edition)),new Set(data.segments.map(row=>row.sourceEdition)));
  if(publications.length>1) {mixedPage=data;assert.equal(snapshot.sourceEnglishSHA256,'');assert.equal(snapshot.sourceHebrewSHA256,'');assert(snapshot.savedText.includes('Volume 4.')&&snapshot.savedText.includes('Volume 5.'));
    const chunks=snapshot.savedText.split('\n\n────────\n\n');assert.equal(chunks.length,data.segments.length);
    for(let i=0;i<data.segments.length;i++){const owner=publications.find(p=>p.edition===data.segments[i].sourceEdition);assert(chunks[i].includes(`Volume ${owner.volume} · `));}
  }
  else {assert.equal(snapshot.sourceEnglishSHA256,publications[0].enSHA256);assert.equal(snapshot.sourceHebrewSHA256,publications[0].heSHA256);}
  const store=new Store();assert.equal(await persistSnapshot(store,api,snapshot,'https://ajew.org'),true);
  const saved=await api.loadAndMigrate(store,'https://ajew.org');assert.equal(saved.passages.length,1);
  assert.equal(saved.passages[0].savedText,snapshot.savedText);assert.deepEqual(saved.passages[0].qualifiedFullBody,snapshot.qualifiedFullBody);
  const writes=store.writes;assert.equal(await persistSnapshot(store,api,snapshot,'https://ajew.org'),false);assert.equal(store.writes,writes);
  const malformed={...data};delete malformed.readerTransportVersion;
  assert.throws(()=>snapshotFor(malformed,null,pathname),/Unsupported source edition transport/);negativeControls++;
  receipts.push({route,completeRows:data.segments.length,qualificationOccurrences:snapshot.qualifiedFullBody.qualificationOccurrences.length,wireBytes:Buffer.byteLength(store.getItem('mySefer')),fullRealServiceRoundTrip:true,dedupNoWrite:true});
}
assert.equal(receipts.length,18);assert.equal(fragmentCount,9);assert(mixedPage&&fragmentPage);
const selected=[mixedPage.segments.find(row=>row.sourceEdition.includes('volume-4')),mixedPage.segments.find(row=>row.sourceEdition.includes('volume-5'))];
assert(selected.every(Boolean));
const mixed=snapshotForIndices(mixedPage,selected.map(row=>row.index).reverse(),'/reader/likutay-halachos/1/43/');
assert.deepEqual(mixed.sourceSelectionIndices,selected.map(row=>row.index));assert(mixed._key.endsWith('@'+mixed.sourceEdition));
assert.equal(mixed.sourceEnglishSHA256,'');assert.equal(mixed.qualifiedFullBody.publications.length,2);
assert.throws(()=>snapshotForIndices(mixedPage,[], '/x'),/Source selection not found/);negativeControls++;
assert.throws(()=>snapshotForIndices(mixedPage,[99999999], '/x'),/Source selection not found/);negativeControls++;
const frag=fragmentPage.segments.find(row=>row.sourceRole==='supplied_english_source_paragraph');
for(const mutate of [row=>row.sourceEdition='not-issued',row=>row.sourceQualifications=[],row=>row.he_nikud='SYNTHETIC forbidden counterpart']) {
 const data={...fragmentPage,segments:[structuredClone(frag)]};mutate(data.segments[0]);assert.throws(()=>snapshotFor(data,null,'/x'));negativeControls++;
}
const filename=new URL('../src/components/LhPublication.astro',import.meta.url);
const component=fs.readFileSync(filename,'utf8');const compiled=await transform(component,{filename:filename.pathname});
assert(compiled.code.includes('createComponent'));
assert(!compiled.diagnostics?.some(d=>d.severity===1),JSON.stringify(compiled.diagnostics));
console.log(JSON.stringify({status:'PASS_ACTUAL_18_DATASETS_THROUGH_NEW_ADAPTER_REAL_STORAGE_AND_COMPONENT_COMPILER_NOT_NATIVE',routes:receipts,fragments:fragmentCount,mixedSourceSelectionKeyBoundToOwnEditions:true,negativeControls,componentCompiler:true,componentSourceSHA256:createHash('sha256').update(component).digest('hex'),componentCompiledBytes:Buffer.byteLength(compiled.code),notCovered:['owning full-page Astro SSR','browser language modes','native selection and image paint','plain/book exports','directory nav28','global source guard admission','publication']}));
