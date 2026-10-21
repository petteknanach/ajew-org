// Serial actual-module tests; no copied production functions or DOM/browser claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='3b663dec7f21be01f3045673e10912c234abd348';
const git=p=>execFileSync('git',['-C',root,'show',base+':'+p],{maxBuffer:8*1024*1024});
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>fs.readFileSync(path.join(root,'public',p));
const current=await import(pathToFileURL(path.join(root,'public/qualified-aitzoas362-core.mjs')));
const old=await import('data:text/javascript;base64,'+git('public/qualified-aitzoas362-core.js').toString('base64'));
const name=current.ASSET.slice(1),bytes=read(name),bank=JSON.parse(bytes);
const loaded=Object.fromEntries(Object.keys(current.ASSET_PINS).filter(n=>n!==name).map(n=>[n,JSON.parse(read(n))]));
const oldBytes=git('public/'+name),oldBank=JSON.parse(oldBytes);
let edition;
await test('genuine git-derived baseline362 positive through original complete module',async()=>{
 const d=await old.authenticateEdition(oldBytes,a=>git('public/'+a.name),sha);
 assert.equal(d.rows.filter(r=>r.en!==null).length,362);
 assert.equal(d.rows.flatMap(r=>r.requiredNotes).length,208);
});
await test('final4 complete module authentication, actual named-export ABI, cache-bound source URLs',async()=>{
 for(const n of ['authenticateEdition','validateBank','validateAnnotation','displayPlan','fullBodyPayload','requireEdition','appendLegacyCollection','ranges','historyEntries'])assert.equal(typeof current[n],'function');
 const urls=[];edition=await current.authenticateEdition(bytes,a=>{urls.push(a.url);assert.equal(a.url,'/'+a.name+'?v='+a.sha256);return read(a.name);},sha);
 assert.equal(urls.length,12);assert.equal(edition.rows.filter(r=>r.en!==null).length,366);
 assert.equal(edition.rows.flatMap(r=>r.requiredNotes).length,current.FINAL_NOTE_COUNT);
});
function project(b,l){
 for(const r of b.rows){const seg=l[current.sectionPath(r.section)].segments[r.arrayPosition];seg.he=r.he;seg.en=r.en;seg.englishReading={englishStatus:r.englishStatus,origin:r.origin,requiredNotes:r.requiredNotes,history:r.history};}
}
function renewWholeAnchors(r){for(const q of r.requiredNotes)for(const a of q.anchors){if(a.field==='currentEnglish'){a.token=r.en;a.codepointEndExclusive=Array.from(r.en).length;a.utf8EndExclusive=Buffer.byteLength(r.en);a.fullFieldSHA256=sha(r.en);a.tokenSHA256=sha(r.en);}}}
const ordinary=bank.rows.find(r=>!Object.hasOwn(current.FINAL4_PINS,r.stableIndex)&&r.requiredNotes.length===0);
const mutations=[
 ['old362 English',b=>{b.rows[ordinary.stableIndex-1].en+=' unauthorized';}],
 ['Hebrew coordinated with archive',(b,l)=>{const r=b.rows[ordinary.stableIndex-1];r.he+='!';l[current.archivePath(r.section)].segments[r.arrayPosition].he=r.he;}],
 ['history coordinated with archive',(b,l)=>{const r=b.rows[ordinary.stableIndex-1];r.history.en+=' unauthorized';l[current.archivePath(r.section)].segments[r.arrayPosition].en=r.history.en;}],
 ['old362 note loss',b=>{b.rows.find(r=>!Object.hasOwn(current.FINAL4_PINS,r.stableIndex)&&r.requiredNotes.length).requiredNotes=[];}],
 ['final4 note loss',b=>{b.rows[86].requiredNotes.pop();}],
 ['final4 anchor error',b=>{b.rows[0].requiredNotes[0].anchors[0].codepointStart=1;}],
 ['old362 anchor error',b=>{b.rows.find(r=>!Object.hasOwn(current.FINAL4_PINS,r.stableIndex)&&r.requiredNotes.length).requiredNotes[0].anchors[0].fullFieldSHA256='0'.repeat(64);}],
 ['unknown four English with valid renewed anchors',b=>{b.rows[86].en+=' unauthorized';renewWholeAnchors(b.rows[86]);}],
 ['displayRules',b=>{b.displayRules['208'].inlineNoteId='wrong';}],
 ['bad English count',b=>{b.rows[0].en=null;}],
 ['unselected origin scalar',b=>{b.rows[61].origin.notice+=' unauthorized';}],
 ['private nested anchor metadata',b=>{b.rows[0].requiredNotes[0].anchors[0].hidden_private='secret';}]
];
for(const [label,mutate]of mutations){
 await test('coordinated logical negative: '+label,async()=>{
  const b=structuredClone(bank),l=structuredClone(loaded);mutate(b,l);project(b,l);
  // Recalculate a valid current envelope. Only the immutable independent
  // baseline/four-row/scalar authority (or relational semantics) may reject.
  const envelope=sha(current.stable(b));let message='';
  try{await current.validateBank(b,l,x=>{const h=sha(x);return h===envelope?current.BANK_VALUE_PIN:h;});}catch(e){message=e.message;}
  assert.ok(message,'mutant was accepted');console.log('rejected '+label+': '+message);
  if(label==='old362 English'||label.startsWith('Hebrew coordinated')||label.startsWith('history coordinated'))assert.match(message,/Immutable baseline362 bank drift/);
  if(label.startsWith('unknown four'))assert.match(message,/Exact final-four row drift/);
 });
}
await test('fresh final4 positive after all logical negatives',async()=>{await current.validateBank(structuredClone(bank),structuredClone(loaded),sha);edition=await current.authenticateEdition(bytes,a=>read(a.name),sha);});
function annotation(r,editionSHA256,field='en'){
 const text=r[field];return {schema:'qualified-aitzoas362-annotation/v1',id:'fixture',type:'highlight',note:'',selection:{owner:r.owner,field,editionSHA256,start:0,end:Math.min(3,text.length),text:text.slice(0,Math.min(3,text.length)),fullField:text}};
}
await test('all original362 oldPIN annotations accepted unchanged, both fields, no data rewrite',()=>{
 let count=0;
 for(const r of edition.rows)if(!Object.hasOwn(current.FINAL4_PINS,r.stableIndex))for(const field of ['he','en']){
  assert.equal(r[field],oldBank.rows[r.stableIndex-1][field]);const a=annotation(r,current.PREVIOUS_EDITION_PIN,field),before=JSON.stringify(a);assert.equal(current.validateAnnotation(edition,a),r);assert.equal(JSON.stringify(a),before);count++;
 }assert.equal(count,724);
});
await test('oldPIN changed4 rejected even unchanged Hebrew; arbitrary edition and malformed selections rejected',()=>{
 for(const index of [1,62,87,179])for(const f of ['he','en'])assert.throws(()=>current.validateAnnotation(edition,annotation(edition.rows[index-1],current.PREVIOUS_EDITION_PIN,f)));
 assert.throws(()=>current.validateAnnotation(edition,annotation(ordinary,'f'.repeat(64))));
 for(const mut of [a=>a.selection.fullField+='!',a=>a.selection.text+='!',a=>a.selection.start=-1,a=>a.schema='wrong',a=>a.selection.owner='unknown',a=>a.selection.end=999999]){const a=annotation(ordinary,current.PREVIOUS_EDITION_PIN);mut(a);assert.throws(()=>current.validateAnnotation(edition,a));}
 for(const index of [1,62,87,179])for(const f of ['he','en'])current.validateAnnotation(edition,annotation(edition.rows[index-1],current.PIN,f));
});
await test('mixed annotation collection retains unchanged362 attachments despite changed4 or arbitrary editions; raw bytes untouched',()=>{
 const valid=edition.rows.filter(r=>!Object.hasOwn(current.FINAL4_PINS,r.stableIndex)).map((r,i)=>({...annotation(r,current.PREVIOUS_EDITION_PIN),id:'old-'+i}));
 const rejected=[{...annotation(edition.rows[0],current.PREVIOUS_EDITION_PIN,'he'),id:'changed4'},{...annotation(ordinary,'f'.repeat(64)),id:'wrong-edition'}];
 const raw=JSON.stringify([...valid,...rejected],null,2),result=current.annotationAttachments(edition,raw);
 assert.equal(result.attached.length,362);assert.equal(result.detached.length,2);
 assert.deepEqual(result.attached.map(x=>x.annotation),valid);assert.equal(raw,JSON.stringify([...valid,...rejected],null,2));
 assert.throws(()=>current.annotationAttachments({},raw));
 assert.throws(()=>current.annotationAttachments(edition,JSON.stringify([valid[0],valid[0]])));
 assert.throws(()=>current.annotationAttachments(edition,'{}'));
});
await test('all366 actual fullBodyPayload, exact fields/qualifications/history; 208/242 display policy unchanged',()=>{
 for(const r of edition.rows){
  const expected=structuredClone(r);let en=r.en,notes=r.requiredNotes;
  if(r.stableIndex===208)notes=notes.filter(q=>q.id!=='C-208-N01');
  if(r.stableIndex===242){const a=oldBank.displayRules['242'].overlappingInlineSpan;en=Array.from(en).slice(0,a.start).join('')+Array.from(en).slice(a.endExclusive).join('');}
  assert.deepEqual(current.displayPlan(r),{en,notes});
  const payload=current.fullBodyPayload(edition,[r.owner]);assert.equal(payload.editionSHA256,current.PIN);assert.equal(payload.sourceUnits[0].en,r.en);assert.deepEqual(payload.sourceUnits[0].history,r.history);
  assert.ok(payload.content.includes('\nSupplied Hebrew\n'+r.he));assert.ok(payload.content.includes('\nEnglish\n'+en));assert.ok(payload.content.includes(r.origin.notice));assert.ok(payload.content.includes(r.history.archiveUrl));assert.ok(payload.content.includes(r.history.en));
  for(const q of notes)assert.ok(payload.content.includes('Source note ['+q.id+']\n'+q.text));
  assert.deepEqual(payload.requiredNotes,r.requiredNotes.map(({id,owner,text})=>({id,owner,text})));assert.deepEqual(r,expected);
 }
});
await test('fresh final4 full authentication after annotation/outward tests',async()=>{assert.equal((await current.authenticateEdition(bytes,a=>read(a.name),sha)).rows.length,366);});
