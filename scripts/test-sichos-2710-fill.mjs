// Bounded private pure-Node qualification. No browser, compiler, Python builder or publication.
// Usage: node --experimental-vm-modules scripts/test-sichos-2710-fill.mjs --authority ROOT --output OWNED_OUTPUT
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,all)=>i%2?a:[...a,[v.replace(/^--/,''),all[i+1]]],[]));
assert(args.authority&&args.output,'Explicit authority and owned output required');
const authority=path.resolve(args.authority),output=path.resolve(args.output),site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
assert(!fs.existsSync(output),'Qualification output must be absent');fs.mkdirSync(output,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),norm=v=>JSON.parse(JSON.stringify(v));
const rows=[],artifacts=[],callbacks=[];
function artifact(name,body){const b=Buffer.isBuffer(body)?body:Buffer.from(body);fs.writeFileSync(path.join(output,name),b);artifacts.push({path:name,bytes:b.length,sha256:hash(b)});}
async function test(name,fn){try{await fn();rows.push({name,status:'PASS'});}catch(e){rows.push({name,status:'FAIL',error:e.stack});}fs.writeFileSync(path.join(output,'progress.json'),JSON.stringify({completed:rows.length,last:rows.at(-1)},null,2)+'\n');}
const scope=JSON.parse(fs.readFileSync(path.join(authority,'PRIVATE-IMPLEMENTATION-SCOPE.json'))),frozenPath=path.join(authority,'integration-discovery/REMOTE-READBACK.json'),frozenBytes=fs.readFileSync(frozenPath),frozen=JSON.parse(frozenBytes);
const selection=JSON.parse(fs.readFileSync(path.join(authority,'PARENT-SELECTED-TRANSLATION.json')));
for(const row of Object.values(frozen.files)){assert.equal(Buffer.byteLength(row.text),row.bytes);assert.equal(hash(Buffer.from(row.text)),row.sha256);}
const parent={};for(const [name,pin] of Object.entries(scope.parentAuthorityPins)){const b=fs.readFileSync(pin.path);assert.equal(b.length,pin.bytes);assert.equal(hash(b),pin.sha256);parent[name]=JSON.parse(b);}
const oracle=parent['PARENT-SUCCESSOR-OWNER-ORACLE.json'],expected=parent['PARENT-EXPECTED-PROJECTION.json'],expectedBank=parent['PARENT-EXPECTED-SELECTED41.json'],allow=parent['PARENT-EXACT-PREDECESSOR-ANNOTATION-ALLOWLIST.json'];
assert.equal(hash(fs.readFileSync(path.join(authority,'PARENT-SELECTED-TRANSLATION.json'))),oracle.successorAuthority.parentSelectionSHA256);
const masterRaw=fs.readFileSync(oracle.privateCompleteHistoryMaster.path),master=JSON.parse(masterRaw);assert.equal(masterRaw.length,oracle.privateCompleteHistoryMaster.bytes);assert.equal(hash(masterRaw),oracle.privateCompleteHistoryMaster.sha256);
const predecessorRaw=fs.readFileSync(oracle.successorAuthority.predecessorOracle),predecessor=JSON.parse(predecessorRaw);assert.equal(hash(predecessorRaw),oracle.successorAuthority.predecessorOracleSHA256);
// The candidate has exactly 14 paths. Unchanged production imports/assets are read-only
// virtual dependencies sourced verbatim from the authenticated actual-main readback.
// Nothing is copied into a foreign checkout or added to candidate outside its allowlist.
function tree(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);}
assert.deepEqual(tree(site).sort(),[...scope.allowlist].sort());
const consumed=new Set(),candidateBefore=Object.fromEntries(tree(site).map(p=>[p,hash(fs.readFileSync(path.join(site,p)))]));
function readActual(file,encoding){let p=String(file);if(file instanceof URL)p=fileURLToPath(file);p=path.isAbsolute(p)?path.relative(site,p):p;p=p.split(path.sep).join('/');assert(!p.startsWith('../')&&!path.isAbsolute(p),'Virtual read escaped site');let b;if(scope.allowlist.includes(p))b=fs.readFileSync(path.join(site,p));else {assert(Object.hasOwn(frozen.files,p),'Uncaptured dependency: '+p);b=Buffer.from(frozen.files[p].text);}consumed.add(p);return encoding?b.toString(encoding):b;}
const context=vm.createContext({Buffer,Uint8Array,TextEncoder,TextDecoder,URL,Response,console,process:{cwd:()=>site,argv:[process.execPath,fileURLToPath(import.meta.url)]}});
const cache=new Map();
const fsView={...fs,readFileSync:readActual};
const builtin={
 'node:assert/strict':{default:assert},'node:fs':{default:fsView},'node:fs/promises':{default:{readFile:async(p,encoding)=>readActual(p,encoding)}},
 'node:path':{default:path},'node:crypto':{default:crypto},'node:url':{pathToFileURL:(await import('node:url')).pathToFileURL}
};
async function moduleFor(id){
 if(cache.has(id))return cache.get(id);
 let m;if(Object.hasOwn(builtin,id)){const values=builtin[id];m=new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);},{context,identifier:id});}
 else m=new vm.SourceTextModule(readActual(id,'utf8'),{context,identifier:id});cache.set(id,m);return m;
}
async function link(spec,ref){const id=spec.startsWith('node:')?spec:path.posix.normalize(path.posix.join(path.posix.dirname(ref.identifier),spec));return moduleFor(id);}
const verifier=await moduleFor('scripts/verify-sichos-271280.mjs');await verifier.link(link);await verifier.evaluate();
const core=cache.get('public/qualified-sichos-271280-core.js').namespace,lib=cache.get('src/lib/qualified-sichos-271280.mjs').namespace,verify=verifier.namespace;
const d=await lib.loadEdition(site),bank=vm.runInContext('JSON.parse',context)(readActual('public/reader/reviewed/sichos-271280-sources/selected-41.json','utf8'));
const parse=vm.runInContext('JSON.parse',context),clone=v=>parse(JSON.stringify(v));
const assets=vm.runInContext('({})',context);for(const a of d.assets)assets[a.name]=parse(readActual('public'+a.url,'utf8'));
await test('independent-two-JSON-exact-bytes-and-ratified-contract',()=>{
 for(const [p,name] of [['public/reader/reviewed/sichos-271-280.json','PARENT-EXPECTED-PROJECTION.json'],['public/reader/reviewed/sichos-271280-sources/selected-41.json','PARENT-EXPECTED-SELECTED41.json']])assert.deepEqual(readActual(p),fs.readFileSync(scope.parentAuthorityPins[name].path));
 assert.equal(d.units[0].en,selection.newEnglish);assert.equal(Buffer.byteLength(d.units[0].en),526);assert.equal(hash(Buffer.from(d.units[0].en)),selection.newEnglishSHA256);
 assert.equal(verify.PARENT_ORACLE_SHA,scope.parentAuthorityPins['PARENT-SUCCESSOR-OWNER-ORACLE.json'].sha256);
 assert.deepEqual(norm(verify.PARENT_CONTRACT),expectedBank.rows);assert.deepEqual(norm(d),expected);assert.equal(core.PIN,scope.parentAuthorityPins['PARENT-EXPECTED-PROJECTION.json'].sha256);
 assert.equal(lib.EXPECTED_SELECTED_SHA256,scope.parentAuthorityPins['PARENT-EXPECTED-SELECTED41.json'].sha256);assert.equal(lib.EXPECTED_SELECTED_BYTES,92200);
 assert.equal(d.units.filter(u=>typeof u.en==='string').length,41);assert.equal(d.units.filter(u=>u.en===null).length,0);assert.equal(d.units.reduce((n,u)=>n+u.qualifications.length,0),57);
 assert.deepEqual(norm(d.units[0].currentOrigin),oracle.owners[0].currentOrigin);assert.deepEqual(norm(d.units[0].qualifications),oracle.owners[0].activeQualifications);
});
await test('all-protected-40-English-82-Hebrew-41-history-source-identities-and-private131',()=>{
 const old=JSON.parse(frozen.files['public/reader/reviewed/sichos-271-280.json'].text);
 assert.deepEqual(oracle.owners.slice(1),predecessor.owners.slice(1));
 for(const [i,u] of d.units.entries()){
  for(const f of ['he','he_nikud'])assert.equal(u[f],old.units[i][f]);if(i)assert.equal(u.en,old.units[i].en);
  for(const k of ['owner','section','array_position','source_index','event_position','group','anchor','history'])assert.deepEqual(norm(u[k]),old.units[i][k]);
  if(i){assert.deepEqual(norm(u.currentOrigin),old.units[i].currentOrigin);assert.deepEqual(norm(u.qualifications),old.units[i].qualifications);}
 }
 for(const a of d.assets.filter(a=>a.name!=='selected-41.json'))assert.equal(hash(readActual('public'+a.url)),frozen.files['public'+a.url].sha256);
 assert.equal(d.assets.filter(a=>a.name!=='selected-41.json').length,10);
 assert.equal(master.paragraphs.length,41);assert.equal(master.paragraphs.reduce((n,m)=>n+m.qualifications.length,0)+master.global_qualifications.length,131);
 for(const [i,r] of oracle.owners.entries()){
  const m=master.paragraphs[i],originalFields={...r.fields,...(i===0?{en:null}:{})};assert.equal(r.owner,m.owner);assert.deepEqual(originalFields,m.fields);assert.equal(r.historicalEnglish,m.historical_English);assert.deepEqual(r.privateOriginalOrigin,m.origin);assert.deepEqual(r.originalOrderedQualificationIDs,m.qualifications.map(q=>q.id));
 }
 assert.equal(master.paragraphs[0].fields.en,null);assert(master.paragraphs[0].qualifications.some(q=>q.id==='author271-271-0-whole-English-hold'));
});
await test('actual-changed-verifier-load-parent-4exports-3GET-cache-caller',async()=>{
 const r=await verify.verify(site);assert.deepEqual(norm(r),{status:'PASS',owners:41,currentEnglish:41,wholeNULL:[],localNotes:57,globalNotes:4,plainFormats:4,actualGET:3});artifact('actual-verifier-result.json',JSON.stringify(r,null,2)+'\n');
});
// Independently compose outward expected bodies from parent authority, not actual exporter output.
const htext=u=>'Earlier English — textual history\nEarlier supplied English — historical wording, not the current translation\n'+u.history.earlier_supplied_English+'\n\nOriginal teaching source\n'+u.history.original_source_url;
const expectedContent=expected.notice+'\n\n'+expected.globalQualifications.map(q=>'Source note\n'+q.text).join('\n\n')+'\n\n'+expected.units.map(u=>'Teaching '+u.section+', paragraph '+u.source_index+'\n\nSupplied Hebrew\n'+u.he+'\n\nSupplied pointed Hebrew\n'+u.he_nikud+'\n\nEnglish\n'+u.en+'\n\n'+u.qualifications.map(q=>'Source note\n'+q.text).join('\n\n')+'\n\n'+htext(u)).join('\n\n')+'\n\nSource: https://ajew.org/reader/reviewed/sichos-271-280/';
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\r/g,'&#13;');
for(const format of ['txt','md','json','html'])await test('actual-export-'+format+'-independent-body-qualification-owner-history',()=>{
 const out=lib.plainExport(d,format);artifact('export.'+format,out);
 if(format==='txt')assert.equal(out,expected.title+'\n\n'+expectedContent+'\n');
 if(format==='md')assert.equal(out,'# '+expected.title+'\n\n'+expectedContent+'\n');
 if(format==='json'){
  const p=JSON.parse(out);assert.deepEqual(p.sourceUnits,expected.units);assert.deepEqual(p.globalQualifications,expected.globalQualifications);assert.deepEqual(p.requiredQualifications,expected.units.flatMap(u=>u.qualifications));assert.equal(p.content,expectedContent);assert.deepEqual(p.owners,expected.units.map(u=>u.owner));
 }
 if(format==='html'){
  const fields=[...out.matchAll(/<p(?: lang="he" dir="rtl")? data-source-field="(he|he_nikud|en)">([\s\S]*?)<\/p>/g)];assert.deepEqual(fields.map(m=>[m[1],m[2]]),expected.units.flatMap(u=>['he','he_nikud','en'].map(f=>[f,escape(u[f])])));
  const notes=[...out.matchAll(/<p data-qualification="([^"]+)" data-owner="([^"]+)">([\s\S]*?)<\/p>/g)];assert.deepEqual(notes.map(m=>m.slice(1)),expected.units.flatMap(u=>u.qualifications.map(q=>[q.id,u.owner,escape(q.text)])));
  for(const u of expected.units)assert(out.includes(escape(u.history.earlier_supplied_English)));
  const global=[...out.matchAll(/<p data-global-qualification="([^"]+)">([\s\S]*?)<\/p>/g)];assert.deepEqual(global.map(m=>m.slice(1)),expected.globalQualifications.map(q=>[q.id,escape(q.text)]));
 }
 const en=format==='html'?escape(selection.newEnglish):format==='json'?JSON.stringify(selection.newEnglish).slice(1,-1):selection.newEnglish;
 assert(out.includes(en));assert(!out.includes('No current English translation is supplied for this paragraph.'));
});
// Select only affected inherited callbacks; keep their exact source and digest as provenance.
const oldTests=readActual('scripts/test-sichos-271280.mjs','utf8'),mutationSource=oldTests.slice(oldTests.indexOf('const mutations=['),oldTests.indexOf('\n];',oldTests.indexOf('const mutations=['))+3);
const mutationContext=vm.createContext({clone,change:(v,a,k,value,i=1)=>{v.units[i][k]=value;if(['he','he_nikud','en'].includes(k))a['selected-41.json'].rows[i].fields[k]=value;}});vm.runInContext(mutationSource+'\nglobalThis.selected=mutations.filter(([name])=>["historical-fallback","adopted-empty","adopted-missing","retired-owner0-null"].includes(name));',mutationContext);
assert.equal(mutationContext.selected.length,4);
for(const [name,mutate] of mutationContext.selected)await test('selected-existing-callback-'+name,()=>{
 callbacks.push({caller:'scripts/test-sichos-271280.mjs',name,callbackSHA256:hash(Buffer.from(String(mutate))),sourceSHA256:hash(Buffer.from(oldTests))});const v=clone(d),a=clone(assets);mutate(v,a);
 for(const u of v.units)for(const f of ['he','he_nikud','en'])if(Object.hasOwn(u,f))u.field_sha256[f]=u[f]===null?null:hash(Buffer.from(u[f]));
 for(const item of v.assets){const b=Buffer.from(JSON.stringify(a[item.name],null,2)+'\n');item.bytes=b.length;item.sha256=hash(b);}
 assert.throws(()=>core.validateProjection(v,a));assert.throws(()=>verify.verifyAgainstParent(v,a['selected-41.json'],a));
});
for(const [name,mutate] of [
 ['ending-note-missing',(v,a)=>{v.units[0].qualifications.pop();a['selected-41.json'].rows[0].required_qualifications.pop();}],
 ['ending-note-duplicate',(v,a)=>{v.units[0].qualifications.push(clone(v.units[0].qualifications[1]));a['selected-41.json'].rows[0].required_qualifications=clone(v.units[0].qualifications);}],
 ['draft-ellipsis-note',(v,a)=>{v.units[0].qualifications[1].text='The main reading is syntactically elliptical.';a['selected-41.json'].rows[0].required_qualifications=clone(v.units[0].qualifications);}],
 ['origin-unavailable',(v,a)=>{v.units[0].currentOrigin.kind='english_unavailable';a['selected-41.json'].rows[0].currentOrigin=clone(v.units[0].currentOrigin);}]
])await test('successor-negative-'+name,()=>{const v=clone(d),a=clone(assets);mutate(v,a);assert.throws(()=>core.validateProjection(v,a));assert.throws(()=>verify.verifyAgainstParent(v,a['selected-41.json'],a));});
await test('projection-and-selected-independent-authentication-negatives',async()=>{
 const projection=readActual('public/reader/reviewed/sichos-271-280.json');await assert.rejects(()=>core.authenticateEdition(Buffer.concat([projection,Buffer.from(' ')]),a=>readActual('public'+a.url),hash));
 await assert.rejects(()=>core.authenticateEdition(projection,a=>a.name==='selected-41.json'?Buffer.from(frozen.files['public/reader/reviewed/sichos-271280-sources/selected-41.json'].text):readActual('public'+a.url),hash));
});
const reader=readActual('public/qualified-sichos-271280-reader.js','utf8');
const sourceFunctions=['descriptor','checkAnnotation','readAnnotations','annotate'].map(name=>{const lines=reader.split('\n').filter(s=>s.startsWith('function '+name+'('));assert.equal(lines.length,1);callbacks.push({caller:'public/qualified-sichos-271280-reader.js',name,callbackSHA256:hash(Buffer.from(lines[0])),sourceSHA256:hash(Buffer.from(reader))});return lines[0];}).join('\n');
const storage=new Map(),KEY='ajew-qualified-sichos-271280-annotations-v1';let captureStart=0,rendered=0;
Object.assign(context,{PIN:core.PIN,validateAnnotation:core.validateAnnotation,parseAnnotations:core.parseAnnotations,data:d,rows:[],KEY,crypto:crypto.webcrypto,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},guard:()=>assert.equal(core.validateProjection(d,assets),d),renderAnnotations:()=>{rendered++;},say:()=>{},document:{createRange:()=>({selectNodeContents(){},setEnd(){},toString:()=>d.units[0].en.slice(0,captureStart)})}});
vm.runInContext(sourceFunctions,context);
const record=(r,i=0,pin=allow.predecessorProjectionSHA256)=>{const u=d.units.find(u=>u.owner===r.owner),text=u[r.field];return {schema:'qualified-local-annotation/v1',id:'old-field-'+i,type:'highlight',note:'Retain user note',selection:{projection_sha256:pin,owner:r.owner,field:r.field,field_sha256:r.sourceSHA256,start:0,end:Math.min(8,text.length),text:text.slice(0,8)},createdAt:'2026-10-21T00:00:00.000Z'};};
const oldRecords=allow.unchangedOwnerFieldHashIdentities.map((r,i)=>record(r,i));
await test('exact-parent122-allowlist-unchanged-current-hashes-all-old-read-raw-preserved',()=>{
 assert.equal(oldRecords.length,122);assert.equal(new Set(oldRecords.map(a=>a.selection.owner+'|'+a.selection.field)).size,122);assert(!oldRecords.some(a=>a.selection.owner===d.units[0].owner&&a.selection.field==='en'));
 for(const r of allow.unchangedOwnerFieldHashIdentities){const u=d.units.find(u=>u.owner===r.owner);assert.equal(hash(Buffer.from(u[r.field])),r.sourceSHA256);}
 assert.deepEqual(norm(context.readAnnotations(null)),[]);
 const raw=JSON.stringify(oldRecords,null,3);storage.set(KEY,raw);const before=storage.get(KEY);const parsed=context.readAnnotations(before);assert.deepEqual(norm(parsed),oldRecords);assert.equal(storage.get(KEY),before);
 for(const a of oldRecords)assert.equal(context.checkAnnotation(clone(a)).owner,a.selection.owner);
});
const englishOld=oldRecords.find(a=>a.selection.field==='en');
for(const [name,modify] of [
 ['unknown-projection',a=>a.selection.projection_sha256='0'.repeat(64)],
 ['foreign-owner',a=>a.selection.owner='sichos-261-position-0'],
 ['foreign-field-hash',a=>a.selection.field_sha256='1'.repeat(64)],
 ['wrong-field',a=>a.selection.field='historicalEnglish'],
 ['wrong-owner-same-offset',a=>a.selection.owner=d.units[2].owner],
 ['stale-quote',a=>a.selection.text+='x'],
 ['fractional-start',a=>a.selection.start=0.5],
 ['negative-start',a=>a.selection.start=-1],
 ['empty-range',a=>a.selection.end=0],
 ['out-of-field-end',a=>a.selection.end=999999],
 ['wrong-schema',a=>a.schema='qualified-local-annotation/v0'],
 ['wrong-type',a=>a.type='other'],
 ['nonstring-note',a=>a.note=7],
 ['nonstring-id',a=>a.id=7],
 ['old-NULL-owner0-EN-even-with-new-exact-fieldhash',a=>{const u=d.units[0];a.selection={projection_sha256:allow.predecessorProjectionSHA256,owner:u.owner,field:'en',field_sha256:u.field_sha256.en,start:0,end:8,text:u.en.slice(0,8)};}],
 ['old-NULL-owner0-EN-original-null-fieldhash',a=>{const u=d.units[0];a.selection={projection_sha256:allow.predecessorProjectionSHA256,owner:u.owner,field:'en',field_sha256:null,start:0,end:8,text:u.en.slice(0,8)};}]
])await test('annotation-reject-'+name,()=>{
 const a=clone(englishOld);modify(a);const raw=JSON.stringify([oldRecords[0],norm(a)]);storage.set(KEY,raw);assert.throws(()=>context.readAnnotations(raw));assert.throws(()=>context.checkAnnotation(a));assert.equal(storage.get(KEY),raw);
});
await test('annotation-schema-duplicate-ID-json-and-entire-collection-fail-closed',()=>{
 assert.throws(()=>context.readAnnotations(JSON.stringify([oldRecords[0],oldRecords[0]])));for(const raw of ['{}','null','[null]','invalid'])assert.throws(()=>context.readAnnotations(raw));
 const cloneData=clone(d);cloneData.units[1].en+='x';assert.throws(()=>core.validateAnnotation(cloneData,clone(englishOld)));
});
await test('annotation-current-PIN-all123-including-new-English',()=>{
 const current=d.units.flatMap(u=>['he','he_nikud','en'].map((field,i)=>record({owner:u.owner,field,sourceSHA256:u.field_sha256[field]},u.event_position*3+i,core.PIN)));assert.equal(current.length,123);assert.equal(core.parseAnnotations(d,JSON.stringify(current)).length,123);
});
await test('actual-reader-descriptor-new-write-currentPIN-old-records-retained',()=>{
 const raw=JSON.stringify(oldRecords);storage.set(KEY,raw);const u=d.units[0],node={},field={dataset:{sourceField:'en'},contains:n=>n===node};context.rows=[{u,fields:[field]}];captureStart=0;const capture={start:node,end:node,a:0,b:8,text:u.en.slice(0,8)};
 const desc=context.descriptor(capture);assert.equal(desc.projection_sha256,core.PIN);assert.equal(desc.field_sha256,selection.newEnglishSHA256);context.annotate('note',capture,'New user note');
 const saved=JSON.parse(storage.get(KEY));assert.equal(saved.length,123);assert.deepEqual(saved.slice(0,122),oldRecords);assert.equal(saved.at(-1).selection.projection_sha256,core.PIN);assert.equal(saved.at(-1).selection.owner,u.owner);assert.equal(saved.at(-1).selection.field,'en');assert.equal(saved.at(-1).selection.text,u.en.slice(0,8));assert.equal(core.parseAnnotations(d,storage.get(KEY)).length,123);assert.equal(rendered,1);
 artifact('annotation-before-raw.json',raw);artifact('annotation-after-raw.json',storage.get(KEY));
});
await test('MySefer-existing-snapshot-readonly-newSave-distinct-identity-no-bridge-changes',()=>{
 const old=JSON.parse(frozen.files['public/reader/reviewed/sichos-271-280.json'].text),u=d.units[0];const current=core.fullBodyPayload(d,[u.owner]);
 const oldContent=old.notice+'\n\n'+old.globalQualifications.map(q=>'Source note\n'+q.text).join('\n\n')+'\n\n'+(()=>{const x=old.units[0];return 'Teaching '+x.section+', paragraph '+x.source_index+'\n\nSupplied Hebrew\n'+x.he+'\n\nSupplied pointed Hebrew\n'+x.he_nikud+'\n\nEnglish\nEnglish translation not available.\n\n'+x.qualifications.map(q=>'Source note\n'+q.text).join('\n\n')+'\n\n'+htext(x);})()+'\n\nSource: https://ajew.org/reader/reviewed/sichos-271-280/';
 const oldId='qualified-sichos-271280-'+hash(Buffer.from(core.stable([allow.predecessorProjectionSHA256,[u.owner],oldContent]))),newId='qualified-sichos-271280-'+hash(Buffer.from(core.stable([core.PIN,[u.owner],current.content])));assert.notEqual(oldId,newId);
 const historical={id:oldId,title:'Earlier saved snapshot',content:oldContent,source:'https://ajew.org/reader/reviewed/sichos-271-280/',addedAt:'2026-10-21T00:00:00Z'};const raw=JSON.stringify({sections:[historical]});const next=core.appendLegacyCollection(raw,{id:newId,title:d.title,content:current.content,source:historical.source,addedAt:'new'});assert.deepEqual(JSON.parse(next).sections[0],historical);assert.equal(JSON.parse(next).sections[1].content,current.content);
 assert(reader.includes("stable([PIN,p.owners,p.content])"));
});
await test('selected-changed-download-scope-original-callback',async()=>{
 const src=readActual('scripts/test-sichos-271280-review-fixes.mjs','utf8'),line=src.split('\n').find(s=>s.startsWith("await test('download-scope-exact'"));assert(line);callbacks.push({caller:'scripts/test-sichos-271280-review-fixes.mjs',name:'download-scope-exact',callbackSHA256:hash(Buffer.from(line)),sourceSHA256:hash(Buffer.from(src))});
 const ctx=vm.createContext({assert,fresh:async()=>({template:readActual('src/pages/reader/reviewed/sichos-271-280.astro','utf8')}),test:async(name,fn)=>fn()});await new vm.Script('(async()=>{'+line+'})()').runInContext(ctx);
});
await test('historical-master-versus-new-current-Python-companion-static-bindings-not-Python-execution',()=>{
 const src=readActual('scripts/test-sichos-271280-plain.py','utf8');assert(src.includes("assert historical_fields==m['fields']"));assert(src.includes("historical_fields['en']=None"));assert(src.includes("assert m['fields']['en'] is None"));assert(src.includes("assert_historical_owner(r,m)"));assert(src.includes(scope.parentAuthorityPins['PARENT-SUCCESSOR-OWNER-ORACLE.json'].sha256));assert(src.includes(selection.newEnglishSHA256));assert(!src.includes("assert parsed['sourceUnits'][0]['en'] is None"));
});
await test('final-pristine-authenticated-after-negatives-and-input-conservation',async()=>{
 assert.equal(core.validateProjection(d,assets),d);assert.equal(verify.verifyAgainstParent(d,bank,assets),true);assert.equal((await lib.loadEdition(site)).units[0].en,selection.newEnglish);
 for(const [p,pin] of Object.entries(candidateBefore))assert.equal(hash(fs.readFileSync(path.join(site,p))),pin);assert.equal(hash(fs.readFileSync(frozenPath)),hash(frozenBytes));assert.equal(hash(fs.readFileSync(oracle.privateCompleteHistoryMaster.path)),oracle.privateCompleteHistoryMaster.sha256);assert.equal(hash(fs.readFileSync(oracle.successorAuthority.predecessorOracle)),oracle.successorAuthority.predecessorOracleSHA256);
 for(const pin of Object.values(scope.parentAuthorityPins))assert.equal(hash(fs.readFileSync(pin.path)),pin.sha256);
});
const report={schema:'single-owner-fill-bounded-pure-node/v1',status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',runtime:{node:process.version,executable:process.execPath,versions:process.versions,productionParityClaimed:false,knownProductionNode:'20.20.2',knownProductionAstro:'5.18.1'},counts:{total:rows.length,passed:rows.filter(r=>r.status==='PASS').length,failed:rows.filter(r=>r.status==='FAIL').length},cases:rows,selectedSourceCallbacks:callbacks,consumedActualSources:[...consumed].sort(),artifacts,limitations:{pureNodeVM:true,minimalAnnotationRangeOperands:true,syntheticDOMOrNativeBrowserClaimed:false,pythonBuilderExecuted:false,pythonHelperExecuted:false,SSRCompileExecuted:false,VPSExecuted:false,publication:false,old32or66or37WholeSuitesReplayed:false},inputPins:{scopeSHA256:hash(fs.readFileSync(path.join(authority,'PRIVATE-IMPLEMENTATION-SCOPE.json'))),frozenReadbackSHA256:hash(frozenBytes),masterSHA256:hash(masterRaw),parentAuthorityPins:scope.parentAuthorityPins},candidateSHA256:candidateBefore};
fs.writeFileSync(path.join(output,'RESULTS.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,node:process.version,counts:report.counts,failures:rows.filter(r=>r.status==='FAIL').map(r=>({name:r.name,error:r.error})),output}));if(report.status!=='PASS')process.exitCode=1;
