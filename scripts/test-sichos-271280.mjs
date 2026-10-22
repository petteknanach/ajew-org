import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import crypto from 'node:crypto';import zlib from 'node:zlib';
import * as core from '../public/qualified-sichos-271280-core.mjs';
import {loadEdition,plainExport} from '../src/lib/qualified-sichos-271280.mjs';
import {verifyAgainstParent,sha,PARENT_CONTRACT} from './verify-sichos-271280.mjs';
const root=process.cwd(),out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});const clone=v=>JSON.parse(JSON.stringify(v));
const d=await loadEdition(),assets=Object.fromEntries(d.assets.map(a=>[a.name,JSON.parse(fs.readFileSync(path.join(root,'public',a.url)))])),bank=assets['selected-41.json'];
const cases=[];function positive(name){assert.equal(core.validateProjection(d,assets),d);assert(verifyAgainstParent(d,bank,assets));cases.push({name,expected:'accept',actual:'accept',process:'one Node controls process'});}
positive('initial-pristine');
const change=(v,a,key,value,i=1)=>{v.units[i][key]=value;if(['he','he_nikud','en'].includes(key))a['selected-41.json'].rows[i].fields[key]=value;};
const mutations=[
 ['missing-tail',(v,a)=>change(v,a,'en',v.units[1].en.slice(0,-35))],
 ['wrong-neighbor',(v,a)=>change(v,a,'en',v.units[2].en)],
 ['missing-owner',(v,a)=>{v.units.pop();a['selected-41.json'].rows.pop();}],
 ['extra-owner',(v,a)=>{v.units.push(clone(v.units[1]));a['selected-41.json'].rows.push(clone(a['selected-41.json'].rows[1]));}],
 ['wrong-group',(v,a)=>{v.units[1].group='sichos272';}],
 ['changed-he',(v,a)=>change(v,a,'he',v.units[1].he+'x')],
 ['changed-he-nikud',(v,a)=>change(v,a,'he_nikud',v.units[1].he_nikud+'x')],
 ['historical-fallback',(v,a)=>change(v,a,'en',v.units[0].history.earlier_supplied_English,0)],
 ['adopted-empty',(v,a)=>change(v,a,'en','',0)],
 ['adopted-missing',(v,a)=>{delete v.units[0].en;delete a['selected-41.json'].rows[0].fields.en;}],
 ['retired-owner0-null',(v,a)=>change(v,a,'en',null,0)],
 ['extra-null',(v,a)=>change(v,a,'en',null)],
 ['wrong-owner-null',(v,a)=>{change(v,a,'en',v.units[1].en,0);change(v,a,'en',null,1);}],
 ['nonnull-empty',(v,a)=>change(v,a,'en','')],
 ['nonnull-missing',(v,a)=>{delete v.units[1].en;delete a['selected-41.json'].rows[1].fields.en;}],
 ['history-loss',(v,a)=>{v.units[1].history.earlier_supplied_English='';a['selected-41.json'].rows[1].history.earlier_supplied_English='';}],
 ['history-pointer',(v,a)=>{v.units[1].history.original_owner_pointer='/segments/0';a['selected-41.json'].rows[1].history=clone(v.units[1].history);}],
 ['notes-loss',(v,a)=>{v.units[0].qualifications.pop();a['selected-41.json'].rows[0].required_qualifications=clone(v.units[0].qualifications);}],
 ['notes-order',(v,a)=>{v.units[0].qualifications.reverse();a['selected-41.json'].rows[0].required_qualifications=clone(v.units[0].qualifications);}],
 ['notes-id',(v,a)=>{v.units[1].qualifications[0].id+='x';a['selected-41.json'].rows[1].required_qualifications=clone(v.units[1].qualifications);}],
 ['notes-owner',(v,a)=>{v.units[1].qualifications[0].owner=v.units[2].owner;a['selected-41.json'].rows[1].required_qualifications=clone(v.units[1].qualifications);}],
 ['notes-placement',(v,a)=>{v.units[1].qualifications[0].placement='elsewhere';a['selected-41.json'].rows[1].required_qualifications=clone(v.units[1].qualifications);}],
 ['notes-role',(v,a)=>{v.units[1].qualifications[0].role='historical-audit';a['selected-41.json'].rows[1].required_qualifications=clone(v.units[1].qualifications);}],
 ['global-notes-loss',(v,a)=>{v.globalQualifications.pop();a['selected-41.json'].globalQualifications.pop();}],
 ['global-notes-order',(v,a)=>{v.globalQualifications.reverse();a['selected-41.json'].globalQualifications.reverse();}],
 ['origin-kind',(v,a)=>{v.units[1].currentOrigin.kind='inherited_witness_verbatim';a['selected-41.json'].rows[1].currentOrigin=clone(v.units[1].currentOrigin);}],
 ['origin-hash',(v,a)=>{v.units[1].currentOrigin.englishUTF8SHA256='0'.repeat(64);a['selected-41.json'].rows[1].currentOrigin=clone(v.units[1].currentOrigin);}],
 ['origin-notice',(v,a)=>{v.units[1].currentOrigin.noticeID=v.units[2].currentOrigin.noticeID;a['selected-41.json'].rows[1].currentOrigin=clone(v.units[1].currentOrigin);}],
 ['owner-index',(v,a)=>{v.units[1].source_index=99;a['selected-41.json'].rows[1].source_index=99;}],
 ['owner-position',(v,a)=>{v.units[1].array_position=99;a['selected-41.json'].rows[1].position=99;}],
 ['wrapper-section',(v,a)=>{v.groups[0].section=272;}],
 ['group-owner-list',(v,a)=>{v.groups[0].unit_ids.pop();}],
 ['source-binding',(v,a)=>{a['sicha-271-original.json'].segments[0].index=9;}]
];
for(const [name,mutate] of mutations){
 const v=clone(d),a=clone(assets);mutate(v,a);
 // Recalculate all candidate envelopes. The independent relationships must still reject.
 for(const u of v.units)for(const f of ['he','he_nikud','en'])if(Object.hasOwn(u,f))u.field_sha256[f]=u[f]===null?null:sha(Buffer.from(u[f]));
 for(const asset of v.assets){const raw=Buffer.from(JSON.stringify(a[asset.name],null,2)+'\n');asset.bytes=raw.length;asset.sha256=sha(raw);}
 const raw=Buffer.from(JSON.stringify(v,null,2)+'\n'),fixture={projection:v,assets:a,envelope:{bytes:raw.length,sha256:sha(raw)}};
 assert.notEqual(sha(Buffer.from(JSON.stringify(v))),sha(Buffer.from(JSON.stringify(d))));
 let coreRejected=false,parentRejected=false,coreReason='',parentReason='';try{core.validateProjection(v,a);}catch(e){coreRejected=true;coreReason=e.message;}try{verifyAgainstParent(v,a['selected-41.json'],a);}catch(e){parentRejected=true;parentReason=e.message.split('\n')[0];}
 assert(coreRejected,name+' core');assert(parentRejected,name+' parent');
 const bytes=zlib.gzipSync(Buffer.from(JSON.stringify(fixture)));fs.writeFileSync(path.join(out,name+'.json.gz'),bytes);
 cases.push({name,expected:'reject',actual:'reject',coreRejected,parentRejected,coreReason,parentReason,validCandidateEnvelope:fixture.envelope,fixture:{bytes:bytes.length,sha256:sha(bytes)},process:'logical case within one Node process'});
 positive('fresh-pristine-after-'+name);
}
// Actual full-body source/save code and unchanged actual migration consumer, with existing data.
const payload=core.fullBodyPayload(d,[d.units[0].owner,d.units[1].owner]);assert.equal(payload.sourceUnits[0].en,PARENT_CONTRACT[0].fields.en);
const entry={id:'private-fixture',title:d.title,content:payload.content,source:'https://ajew.org'+core.ROUTE+'/',addedAt:'fixture'};
const old={sections:[{id:'existing',title:'Existing',content:'Leave unchanged',source:'https://ajew.org/reader/example/',addedAt:'old'}]};
const appended=core.appendLegacyCollection(JSON.stringify(old),entry);assert.deepEqual(JSON.parse(appended).sections[0],old.sections[0]);assert.equal(core.appendLegacyCollection(appended,entry),appended);
assert.throws(()=>core.appendLegacyCollection(appended,{...entry,content:'wrong'}));assert.throws(()=>core.fullBodyPayload(clone(d),[d.units[0].owner]));assert.throws(()=>core.fullBodyPayload(d,[d.units[1].owner,d.units[0].owner]));
const backing=new Map([['ajew-my-sefer',appended],['mySefer',JSON.stringify({passages:[{ref:'Existing user passage',note:'Keep'}]})]]);const storage={getItem:k=>backing.get(k)??null,setItem:(k,v)=>backing.set(k,v)};
const context={crypto:crypto.webcrypto,TextEncoder,Uint8Array,URL,Date};vm.runInNewContext(fs.readFileSync('public/my-sefer-storage.js','utf8'),context);
const migrated=await context.AjewSeferStorage.loadAndMigrate(storage,'https://ajew.org');assert.equal(migrated.passages[0].note,'Keep');assert.equal(migrated.passages.at(-1).savedText,payload.content);assert.equal(backing.get('ajew-my-sefer'),appended);
const again=await context.AjewSeferStorage.loadAndMigrate(storage,'https://ajew.org');assert.equal(again.passages.length,3);
for(const q of [...d.globalQualifications,...d.units[0].qualifications,...d.units[1].qualifications])assert(migrated.passages.at(-1).savedText.includes(q.text));
for(const u of d.units){assert.equal(JSON.parse(plainExport(d,'json')).sourceUnits.find(x=>x.owner===u.owner).en,u.en);}
const result={status:'PASS',negativeLogicalCases:mutations.length,freshPristinePositiveCases:cases.filter(c=>c.actual==='accept').length,cases,migration:{actualConsumer:'public/my-sefer-storage.js',existingPreserved:true,sectionsContentExact:true,repeatNoDuplicate:true,sourceNotesAttached:true},currentEnglish:41,wholeNULL:[]};fs.writeFileSync(path.join(out,'RESULTS.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,negativeLogicalCases:result.negativeLogicalCases,freshPristinePositiveCases:result.freshPristinePositiveCases,migration:result.migration}));
