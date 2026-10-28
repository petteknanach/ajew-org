import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||process.cwd());
const results=[];
const record=(name,value=true)=>results.push({name,value});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceFiles=['public/qualified-yereach-haeitanim-core.js','public/qualified-yereach-haeitanim-reader.js','public/qualified-yereach-haeitanim-controls.js','src/lib/qualified-yereach-haeitanim.mjs'];
for(const file of sourceFiles){
 const p=spawnSync(process.execPath,['--max-old-space-size=128','--check',path.join(root,file)],{encoding:'utf8',timeout:15000});
 record('module-grammar:'+file,{status:p.status,stdout:p.stdout,stderr:p.stderr});
 assert.equal(p.status,0);
}
const core=await import(pathToFileURL(path.join(root,sourceFiles[0])));
const server=await import(pathToFileURL(path.join(root,sourceFiles[3])));
const raw=await fs.readFile(path.join(root,'public',core.ASSET));
const asset=a=>fs.readFile(path.join(root,'public',core.SOURCE_PREFIX,a.name));
let d=await server.loadEdition(root);
assert.equal(d.units.length,260);assert.equal(d.groups.length,24);
assert.equal(d.units.flatMap(u=>u.qualifications.filter(q=>q.role==='source-note')).length,532);
assert.equal(d.units.flatMap(u=>u.qualifications).length,792);
assert(Object.isFrozen(d)&&Object.isFrozen(d.units[0])&&Object.isFrozen(d.units[0].qualifications));
const readableNotes=d.units.flatMap(u=>u.qualifications.filter(q=>q.role==='source-note'));
assert(readableNotes.every(q=>typeof q.text==='string'));
assert.equal(readableNotes.filter(q=>Object.hasOwn(q,'sourceNoteType')).length,520);
assert.equal(readableNotes.filter(q=>!Object.hasOwn(q,'sourceNoteType')).length,12);
assert.deepEqual(core.projectSourceNote('control',0,{type:'source-reading',text:'Typed control fixture'}),{id:'control-source-1',owner:'control',role:'source-note',placement:'after-owning-paragraph',text:'Typed control fixture',sourceNoteType:'source-reading'});
assert.throws(()=>core.projectSourceNote('control',0,{type:'source-reading',text:42}),/Unsupported/);
assert.throws(()=>server.escape({text:'Not a rendered string'}),/Non-text/);
record('all-532-readable-source-notes-with-520-lossless-source-types-no-object-coercion');
record('whole-bank-source-history-and-ordered-notes');
const orig=new Map();
for(const a of d.assets)orig.set(a.name,JSON.parse(await asset(a)));
for(const u of d.units){
 const s=orig.get('section-'+u.section+'-original.json').segments[u.array_position];
 assert.equal(s.index,u.source_index);assert.equal(u.history.earlier_supplied_English,s.en);
 let he=s.he;
 if(u.section===2&&u.source_index===14)he=he.replace("אשר עין לא בעין נראה אתה ה' ועננך עומד עליהם","אשר עין בעין נראה אתה ה' ועננך עומד עליהם");
 assert.equal(u.he,he);
 assert.equal(sha(Buffer.from(u.en)),u.field_sha256.en);
}
record('complete-original-array-identity-and-only-authorized-Hebrew-change');
const mutations={
 'missing-owner':x=>x.units.pop(),
 'duplicate-owner':x=>{x.units[259]=x.units[0];},
 'reordered-owner':x=>{[x.units[0],x.units[1]]=[x.units[1],x.units[0]];},
 'coordinated-English-and-field-hash':x=>{x.units[0].en+='x';x.units[0].field_sha256.en=sha(Buffer.from(x.units[0].en));},
 'changed-Hebrew':x=>{x.units[0].he+='א';},
 'lost-note':x=>{x.units[0].qualifications.shift();},
 'reordered-notes':x=>{const q=x.units[0].qualifications;[q[0],q[1]]=[q[1],q[0]];},
 'history-cleared-to-null':x=>{x.units[0].history.earlier_supplied_English=null;},
 'foreign-source-asset':x=>{x.assets[0].url='https://invalid.example/control-fixture.json';}
};
for(const [name,mutate] of Object.entries(mutations)){
 const bad=JSON.parse(raw);mutate(bad);let reads=0;
 await assert.rejects(core.authenticateEdition(Buffer.from(JSON.stringify(bad)),async a=>{reads++;return asset(a);},sha),/projection authentication/);
 assert.equal(reads,0);record('reject:'+name);
}
await assert.rejects(core.authenticateEdition(raw,async a=>{const b=Buffer.from(await asset(a));if(a.name==='section-1-original.json')b[0]^=1;return b;},sha),/Missing\/changed bound source/);
record('reject:changed-original-source-bytes');
assert.throws(()=>core.fullBodyPayload(JSON.parse(raw),[d.units[0].owner]),/Unauthenticated/);
assert.throws(()=>core.fullBodyPayload(d,[d.units[1].owner,d.units[0].owner]),/reordered/);
assert.throws(()=>core.fullBodyPayload(d,[d.units[0].owner,d.units[0].owner]),/Ambiguous/);
record('reject:unauthenticated-reordered-and-duplicate-outward-payloads');
const all=core.fullBodyPayload(d,d.units.map(u=>u.owner));
assert.equal(all.sourceUnits.length,260);assert.equal(all.requiredQualifications.length,792);
for(const u of d.units){const p=core.fullBodyPayload(d,[u.owner]);assert.equal(p.sourceUnits[0],u);assert(p.content.includes(u.he)&&p.content.includes(u.en));for(const q of u.qualifications)assert(p.content.includes(q.text));assert(p.content.includes(u.history.earlier_supplied_English));}
record('all-260-real-single-owner-and-whole-book-payloads');
const heading=d.units.find(u=>u.record_kind==='discourse-heading');
assert.equal(core.recordLabel(heading),'Discourse heading');
assert(!core.fullBodyPayload(d,[heading.owner]).content.includes(heading.human_title+', Paragraph '));
const copyist=d.units.find(u=>u.record_kind==='source-copyist-note');assert.equal(core.recordLabel(copyist),"Copyist's note");
record('structural-source-records-not-numbered-as-prose');
for(const format of ['txt','md','json']){
 const text=server.plainExport(d,format);
 if(format==='json'){const parsed=JSON.parse(text);assert.deepEqual(parsed.sourceUnits,d.units);assert.equal(parsed.content,all.content);}
 else assert(text.includes(d.units[0].he)&&text.includes(d.units[259].en));
 for(const u of d.units)for(const q of u.qualifications)assert(text.includes(q.text)||format==='json'&&text.includes(JSON.stringify(q.text).slice(1,-1)));
 record('real-format-return:'+format,{bytes:Buffer.byteLength(text),sha256:sha(Buffer.from(text))});
}
const {htmlExport}=await import(pathToFileURL(path.join(root,'src/lib/qualified-yereach-haeitanim-formats.mjs')));
const html=htmlExport(d);for(const u of d.units)for(const q of u.qualifications)assert(html.includes(server.escape(q.text)));
record('real-format-return:html',{bytes:Buffer.byteLength(html),sha256:sha(Buffer.from(html))});
const {qualifiedSearchAnchor,qualifiedSearchLocation}=await import(pathToFileURL(path.join(root,'src/lib/qualified-search-arrival.mjs')));
for(const u of d.units){const row=[u.owner,u.section,0,0,0,0];assert.equal(qualifiedSearchAnchor(d.route,row),'#'+u.owner);assert.equal(qualifiedSearchLocation(d.route,row),d.title+' — '+d.groups[u.section-1].title+', '+core.recordLabel(u));assert.equal(qualifiedSearchAnchor(d.route,[u.owner,u.section+1]),'');}
assert.equal(qualifiedSearchAnchor(d.route,['ye-19:11',19]),'');assert.equal(qualifiedSearchLocation(d.route,['ye-19:11',19]),'');
record('all-260-actual-search-owner-arrivals-labels-and-invalid-owner-section-rejection');
const foreign={id:'unrelated-control-fixture',title:'Unrelated control fixture',content:'Preserved control fixture'};
const entry={id:'current-edition-control-fixture',title:d.title,content:all.content,qualifiedFullBody:all};
const before=JSON.stringify({sections:[foreign],extra:'retained-control'}),after=core.appendLegacyCollection(before,entry);
assert.deepEqual(JSON.parse(after).sections[0],foreign);assert.equal(JSON.parse(after).extra,'retained-control');assert.equal(core.appendLegacyCollection(after,entry),after);
record('modeled-collection-preservation-and-idempotency-not-browser-save');
d=await server.loadEdition(root);assert.equal(core.fullBodyPayload(d,[d.units[259].owner]).sourceUnits[0].en,d.units[259].en);
record('fresh-unchanged-positive-after-all-negative-controls');
console.log(JSON.stringify({status:'PASS_BOOK_SOURCE_CORE_AND_FORMAT_GATES_NOT_NATIVE_UI',node:process.version,executable:process.execPath,results,browser:false,astroPageBuild:false,canonicalWrites:0}));
