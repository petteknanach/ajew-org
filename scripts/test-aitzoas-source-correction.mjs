// Actual production modules, independently Git-derived predecessor, no browser claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as q from '../public/qualified-aitzoas362-core.mjs';
const base='59add1f25cbf4d05e4a234a1e9a8ca6c824d04b0';
const git=p=>execFileSync('git',['show',base+':'+p],{maxBuffer:8*1024*1024});
const read=n=>fs.readFileSync(new URL('../public/'+n,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const old=await import('data:text/javascript;base64,'+git('public/qualified-aitzoas362-core.js').toString('base64'));
const bank=JSON.parse(read(q.ASSET.slice(1))),previous=JSON.parse(git('public/'+q.ASSET.slice(1)));
const loaded=Object.fromEntries(Object.keys(q.ASSET_PINS).filter(n=>n!==q.ASSET.slice(1)).map(n=>[n,JSON.parse(read(n))]));
const cell=(b,p)=>{const keys=p.slice(1).split('/');return [keys.slice(0,-1).reduce((x,k)=>x[k],b),keys.at(-1)];};
const project=(b,l)=>{for(const r of b.rows){const item=l[q.sectionPath(r.section)].segments[r.arrayPosition];Object.assign(item,{he:r.he,en:r.en,englishReading:Object.fromEntries(['englishStatus','origin','requiredNotes','history'].map(k=>[k,r[k]]))});}};
await test('genuine admitted predecessor authenticates through its original code and all thirteen original assets',async()=>{
 const d=await old.authenticateEdition(git('public/'+q.ASSET.slice(1)),a=>git('public/'+a.name),sha);
 assert.equal(d.rows.length,366);assert.equal(old.BANK_VALUE_PIN,q.CORRECTION_PREDECESSOR_VALUE_PIN);
 assert.deepEqual(q.FINAL4_PINS,old.FINAL4_PINS);assert.deepEqual(q.FINAL4_ORIGINALS,old.FINAL4_ORIGINALS);assert.equal(q.BASELINE_BANK_VALUE_PIN,old.BASELINE_BANK_VALUE_PIN);
});
await test('ten exact allowed text operations plus three necessary anchor bindings reproduce current bank; inverse restores complete predecessor',async()=>{
 const allowed=[...[61,62,192].flatMap(i=>['en','origin/notice','requiredNotes/0/text'].map(k=>`/rows/${i}/${k}`)),'/rows/357/requiredNotes/0/text'];
 assert.deepEqual(q.CORRECTION_OPERATIONS.slice(0,10).map(o=>o.pointer).sort(),allowed.sort());
 assert.equal(q.CORRECTION_OPERATIONS.length,13);assert.equal(sha(q.stable(q.CORRECTION_OPERATIONS)),'26ee02a2abca774512eacc414f6e0c2187070a3549790a1affb4c0c6b32c59bd');
 const forward=structuredClone(previous);
 for(const o of q.CORRECTION_OPERATIONS){const [x,k]=cell(forward,o.pointer);assert.deepEqual(x[k],o.before);x[k]=structuredClone(o.after);}
 assert.deepEqual(forward,q.questionPredecessor(bank));await q.validateBank(bank,structuredClone(loaded),sha);
 assert.deepEqual(q.correctionPredecessor(bank),previous);assert.equal(sha(q.stable(previous)),old.BANK_VALUE_PIN);
});
for(const operation of q.CORRECTION_OPERATIONS.slice(0,10))await test('exact selected operation cannot be omitted or changed: '+operation.pointer,async()=>{
 for(const value of [operation.before,operation.after+' unauthorized']){
  const b=structuredClone(bank),l=structuredClone(loaded),[x,k]=cell(b,operation.pointer);x[k]=value;project(b,l);
  await assert.rejects(q.validateBank(b,l,sha));
 }
});
await test('all other rows, HE, original history, note identities and HE anchors remain exact',()=>{
 let untouched=0;
 const historical=q.questionPredecessor(bank);
 for(const [i,r]of historical.rows.entries()){
  const p=previous.rows[i];assert.equal(r.he,p.he);assert.deepEqual(r.history,p.history);
  assert.equal(r.owner,p.owner);assert.deepEqual(r.requiredNotes.map(n=>n.id),p.requiredNotes.map(n=>n.id));
  assert.deepEqual(r.requiredNotes.flatMap(n=>n.anchors.filter(a=>a.field==='governingHebrew')),p.requiredNotes.flatMap(n=>n.anchors.filter(a=>a.field==='governingHebrew')));
  if(![62,63,193,358].includes(r.stableIndex)){assert.deepEqual(r,p);untouched++;}
 }
 assert.equal(untouched,362);assert.equal(historical.rows.flatMap(r=>r.requiredNotes).length,218);
 for(let s=1;s<=6;s++)assert.deepEqual(read(q.archivePath(s)),git('public/'+q.archivePath(s)));
 const projection=structuredClone(loaded);project(historical,projection);
 for(const s of [1,3,4])assert.deepEqual(projection[q.sectionPath(s)],JSON.parse(git('public/'+q.sectionPath(s))));
});
const mutations=[
 ['neighbor English',b=>b.rows[63].en+='!'],
 ['neighbor HE',(b,l)=>{const r=b.rows[63];r.he+='!';l[q.archivePath(r.section)].segments[r.arrayPosition].he=r.he;}],
 ['neighbor note',b=>b.rows[63].requiredNotes[0].text+='!'],
 ['history',(b,l)=>{const r=b.rows[63];r.history.en+='!';l[q.archivePath(r.section)].segments[r.arrayPosition].en=r.history.en;}],
 ['source claim',b=>b.rows[62].origin.kind='supplied_english_based'],
 ['new unselected row field',b=>b.rows[63].claim='unselected'],
];
for(const [name,mutate]of mutations)await test('coordinated unauthorized '+name+' rejects even a renewed current envelope',async()=>{
 const b=structuredClone(bank),l=structuredClone(loaded);mutate(b,l);for(const r of b.rows)for(const n of r.requiredNotes)for(const a of n.anchors)if(a.fullFieldSHA256)a.fullFieldSHA256=sha(a.field==='currentEnglish'?r.en:r.he);project(b,l);const envelope=sha(q.stable(b));
 await assert.rejects(q.validateBank(b,l,x=>sha(x)===envelope?q.BANK_VALUE_PIN:sha(x)),/baseline362|predecessor|final-four/);
});
await test('wrong inverses cannot pass unchanged predecessor and original final4/baseline authority',async()=>{
 for(const [pointer,error]of [['/rows/61/en',/Exact final-four row drift/],['/rows/62/en',/Immutable baseline362 bank drift/]]){
  const text=read('qualified-aitzoas362-core.js').toString().replace('target[key]=JSON.parse(stable(op.before));',`target[key]=op.pointer==='${pointer}'?'wrong inverse':JSON.parse(stable(op.before));`);
  assert.notEqual(text,read('qualified-aitzoas362-core.js').toString());const wrong=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
  await assert.rejects(wrong.validateBank(structuredClone(bank),structuredClone(loaded),sha),error);
 }
});
await test('section 2/5/6 projection drift and predecessor substitution fail closed',async()=>{
 for(const s of [2,5,6]){const l=structuredClone(loaded);l[q.sectionPath(s)].segments.at(-1).en+='!';await assert.rejects(q.validateBank(bank,l,sha),/projection drift/);}
 await assert.rejects(q.validateBank(previous,loaded,sha));
});
await test('historical archive is byte-bound and complete prior rows/claims survive without replacing existing history',async()=>{
 const history=JSON.parse(read(q.CORRECTION_ARCHIVE));assert.deepEqual(history.rows,[62,63,193,358].map(i=>previous.rows[i-1]));assert.equal(sha(read(q.CORRECTION_ARCHIVE)),q.CORRECTION_ARCHIVE_PIN.sha256);
 await assert.rejects(q.authenticateEdition(read(q.ASSET.slice(1)),a=>a.name===q.CORRECTION_ARCHIVE?Buffer.from(read(a.name).toString().replace('unknown','altered')):read(a.name),sha),/history authentication/);
});
const annotation=(r,pin,f,id)=>({schema:'qualified-aitzoas362-annotation/v1',id,type:'highlight',note:'',selection:{owner:r.owner,field:f,editionSHA256:pin,start:0,end:1,text:r[f].slice(0,1),fullField:r[f]}});
await test('preceding edition annotations retain every unchanged field and detach only three changed English fields, with raw saved bytes untouched',async()=>{
 const d=await q.authenticateEdition(read(q.ASSET.slice(1)),a=>read(a.name),sha),items=[];let expected=0;
 for(const r of previous.rows)for(const f of ['he','en']){items.push(annotation(r,q.CORRECTION_PREDECESSOR_PIN,f,r.owner+'-'+f));if(f==='he'||r.en===bank.rows[r.stableIndex-1].en)expected++;}
 const raw=JSON.stringify(items,null,2),snapshot=raw,result=q.annotationAttachments(d,raw);
 assert.equal(result.attached.length,expected);assert.equal(result.detached.length,items.length-expected);assert.equal(raw,snapshot);
 for(const r of d.rows)for(const f of ['he','en'])q.validateAnnotation(d,annotation(r,q.PIN,f,r.owner+f));
 // Matching even a literal substring does not rescue an old complete field.
 for(const i of [62,63,193]){const a=annotation(previous.rows[i-1],q.CORRECTION_PREDECESSOR_PIN,'en','old');a.selection.text='';a.selection.end=0;assert.throws(()=>q.validateAnnotation(d,a));}
});
await test('browser cache chain is pinned through leaf, runtime, topic and browser consumers, and Astro template',()=>{
 const names=['qualified-aitzoas-runtime.js','qualified-aitzoas-topics.js','reader-aitzoas-qualifications.js'];
 for(const n of names){for(const m of read(n).toString().matchAll(/\.\/([\w-]+\.js)\?v=([a-f0-9]{64})/g))assert.equal(m[2],sha(read(m[1])));}
 const template=fs.readFileSync(new URL('../src/components/AitzoasQualifiedPage.astro',import.meta.url),'utf8');assert.ok(template.includes('/reader-aitzoas-qualifications.js?v='+sha(read('reader-aitzoas-qualifications.js'))));
});
