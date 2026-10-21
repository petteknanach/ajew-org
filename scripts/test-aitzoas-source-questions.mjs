// Actual all-30 modules, independent frozen parent operands, modeled client actions.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {execFileSync} from 'node:child_process';import {createHash,webcrypto} from 'node:crypto';
import {buildFullSavedShare,deliverFullSavedShare} from '../src/lib/my-sefer-full-saved-share.mjs';
import * as q from '../public/qualified-aitzoas362-core.mjs';
import {loadEdition} from '../src/lib/qualified-aitzoas362.mjs';
import {topicStructure,ownerNavigation,projectionForPath,INLINE_ARRIVALS} from '../public/qualified-aitzoas-topics.mjs';
import {installAitzoas362} from '../public/reader-aitzoas-qualifications.js';
import {testDOM} from './aitzoas-topics-test-dom.mjs';
const read=n=>fs.readFileSync(new URL('../public/'+n,import.meta.url));const sha=b=>createHash('sha256').update(b).digest('hex');
const git=n=>execFileSync('git',['show','f62101574a52ccc01782ac3a43ff07a35e3b22e3:'+n],{maxBuffer:8*1024*1024});
const fixture=fs.readFileSync(new URL('./fixtures/aitzoas-source-questions-selection.json',import.meta.url));assert.equal(sha(fixture),'6cf959c1418beb62912f289a18219261c052d28512cac0838f34ad8d2beab879');
const selected=JSON.parse(fixture),bank=JSON.parse(read(q.ASSET.slice(1))),previous=JSON.parse(git('public/'+q.ASSET.slice(1)));
const loaded=Object.fromEntries(Object.keys(q.ASSET_PINS).filter(n=>n!==q.ASSET.slice(1)).map(n=>[n,JSON.parse(read(n))]));
const project=(b,l)=>{for(const r of b.rows)Object.assign(l[q.sectionPath(r.section)].segments[r.arrayPosition],{he:r.he,en:r.en,englishReading:Object.fromEntries(['englishStatus','origin','requiredNotes','history'].map(k=>[k,r[k]]))});};
const d=await loadEdition(),s=topicStructure(d);
await test('exact 52 identity operations, 29 owners / EN11 unchanged355 / all366 HE+history',()=>{
 assert.equal(q.QUESTION_SELECTION_PIN,selected.authoritySHA256);assert.equal(selected.operations.length,52);assert.equal(sha(q.stable(selected.operations)),'6ee098048fad1d03b01762ac548561287c13e5a4ab32bc2e29b6e5f22931fee8');
 const expected=structuredClone(previous),seen=new Set();
 for(const op of selected.operations){const key=q.stable([op.stableIndex,op.field,op.noteId]);assert.ok(!seen.has(key));seen.add(key);const r=expected.rows[op.stableIndex-1];
  if(op.field==='requiredNote'){const n=r.requiredNotes.find(n=>n.id===op.noteId);assert.equal(n.text,op.before);if(op.after===null)r.requiredNotes.splice(r.requiredNotes.indexOf(n),1);else n.text=op.after;}
  else{const x=op.field==='en'?r:r.origin,k=op.field==='en'?'en':'notice';assert.equal(x[k],op.before);x[k]=op.after;}
 }
 const changed=[],english=[];
 for(const [i,r]of bank.rows.entries()){
  const p=previous.rows[i],e=expected.rows[i];assert.equal(r.he,p.he);assert.deepEqual(r.history,p.history);
  if(q.stable(r)!==q.stable(p))changed.push(i+1);if(r.en!==p.en)english.push(i+1);
  assert.deepEqual(r.requiredNotes.map(n=>n.id),e.requiredNotes.map(n=>n.id));
  for(const [n,x]of r.requiredNotes.map((n,j)=>[n,e.requiredNotes[j]])){
   assert.deepEqual(Object.fromEntries(Object.entries(n).filter(([k])=>k!=='anchors')),Object.fromEntries(Object.entries(x).filter(([k])=>k!=='anchors')));
   assert.deepEqual(n.anchors.filter(z=>z.field==='governingHebrew'),x.anchors.filter(z=>z.field==='governingHebrew'));
   if(r.en===p.en)assert.deepEqual(n.anchors,x.anchors);x.anchors=structuredClone(n.anchors);
  }assert.equal(sha(q.stable(r)),sha(q.stable(e)));
 }
 assert.deepEqual(changed,selected.conservation.changedOwners);assert.deepEqual(english,selected.conservation.englishChangedOwners);assert.equal(366-english.length,355);assert.equal(bank.rows.flatMap(r=>r.requiredNotes).length,214);assert.deepEqual(bank.displayRules,{});
});
await test('closed immediate inverse, complete immutable archive, historical correction chain and genuine predecessor authentication',async()=>{
 assert.equal(sha(q.stable(q.questionPredecessor(bank))),sha(q.stable(previous)));assert.equal(sha(q.stable(previous)),q.QUESTION_PREDECESSOR_VALUE_PIN);
 const old=await import('data:text/javascript;base64,'+git('public/qualified-aitzoas362-core.js').toString('base64'));assert.equal((await old.authenticateEdition(git('public/'+q.ASSET.slice(1)),a=>git('public/'+a.name),sha)).rows.flatMap(r=>r.requiredNotes).length,218);
 assert.equal(sha(read(q.QUESTION_ARCHIVE)),q.QUESTION_ARCHIVE_PIN.sha256);const archive=JSON.parse(read(q.QUESTION_ARCHIVE));assert.deepEqual(archive.selectedOperations,selected.operations);assert.deepEqual(archive.rows,selected.conservation.changedOwners.map(i=>previous.rows[i-1]));
 const mutated=structuredClone(bank);mutated.rows[0].origin.notice+='!';assert.throws(()=>q.questionPredecessor(mutated),/successor row drift/);
 for(let n=1;n<=6;n++)assert.deepEqual(read(q.archivePath(n)),git('public/'+q.archivePath(n)));assert.deepEqual(read(q.CORRECTION_ARCHIVE),git('public/'+q.CORRECTION_ARCHIVE));
});
for(const [index,op]of selected.operations.entries())await test(`selected operation ${index+1}: renewed envelope negative then fresh complete positive`,async()=>{
 const b=structuredClone(bank),l=structuredClone(loaded),r=b.rows[op.stableIndex-1];
 if(op.field==='en'){r.en+=' unauthorized';for(const n of r.requiredNotes)for(const a of n.anchors)if(a.field==='currentEnglish'&&a.fullFieldSHA256)a.fullFieldSHA256=sha(r.en);}
 else if(op.field==='origin.notice')r.origin.notice+=' unauthorized';
 else if(op.after===null){const n=structuredClone(previous.rows[op.stableIndex-1].requiredNotes.find(n=>n.id===op.noteId));n.anchors=[{field:'governingHebrew',text:r.he,codepointStart:0,codepointEndExclusive:Array.from(r.he).length}];r.requiredNotes.push(n);}
 else r.requiredNotes.find(n=>n.id===op.noteId).text+=' unauthorized';
 project(b,l);const envelope=sha(q.stable(b));await assert.rejects(q.validateBank(b,l,x=>sha(x)===envelope?q.BANK_VALUE_PIN:sha(x)));await q.validateBank(structuredClone(bank),structuredClone(loaded),sha);
});
await test('composed notes179/250; unchanged optional Q7 openings; disclosed gaze and retained250N06/N07',()=>{
 for(const i of [20,299])assert.equal(bank.rows[i-1].en,previous.rows[i-1].en);
 for(const i of [179,250])for(const op of selected.operations.filter(o=>o.stableIndex===i&&o.field==='requiredNote'))assert.equal(bank.rows[i-1].requiredNotes.find(n=>n.id===op.noteId)?.text??null,op.after);
 for(const nid of ['C-250-N06','C-250-N07'])assert.equal(bank.rows[249].requiredNotes.find(n=>n.id===nid).text,previous.rows[249].requiredNotes.find(n=>n.id===nid).text);
 assert.ok(bank.rows[220].en.includes('his gaze'));assert.ok(!bank.rows[220].en.includes('his withdrawal'));
});
await test('new1→11 and283→223 reading-only aliases; all366 identities and40topics229teachings',()=>{
 assert.deepEqual(INLINE_ARRIVALS,{1:11,62:81,63:82,193:165,283:223});assert.equal(s.topics.length,40);assert.equal(s.topics.reduce((n,t)=>n+t.teachingCount,0),229);
 for(const [id,target]of [[1,11],[283,223]]){const m=ownerNavigation(d,id),t=ownerNavigation(d,target);assert.equal(m.readingUrl,t.readingUrl);assert.equal(m.owner,previous.rows[id-1].owner);assert.equal(m.sourceUrl,previous.rows[id-1].canonicalUrl);assert.equal(m.kind,'page-header-artifact');assert.ok(!s.apparatus[0].rows.some(r=>r.stableIndex===id));assert.ok(!s.apparatus[3].rows.some(r=>r.stableIndex===id));assert.ok(s.apparatus[2].rows.some(r=>r.stableIndex===id));}
 assert.equal(new Set([...s.topics,...s.apparatus].flatMap(t=>t.rows.map(r=>r.owner))).size,366);
 const route=fs.readFileSync(new URL('../src/pages/reader/aitzoas-yeshuroas/apparatus/[slug].astro',import.meta.url),'utf8');assert.ok(route.includes('ids={[1,62,63,193,283]}'));
});
const annotation=(r,field,pin)=>({schema:'qualified-aitzoas362-annotation/v1',id:r.owner+'-'+field,type:'highlight',note:'retained',selection:{owner:r.owner,field,editionSHA256:pin,start:0,end:1,text:r[field].slice(0,1),fullField:r[field]}});
await test('all732 immediate-predecessor annotations: unchanged721 attach, changed11 detach, raw saved bytes unchanged',()=>{
 const items=previous.rows.flatMap(r=>['he','en'].map(f=>annotation(r,f,q.QUESTION_PREDECESSOR_PIN))),raw=JSON.stringify(items,null,2),snapshot=raw,result=q.annotationAttachments(d,raw);assert.equal(result.attached.length,721);assert.equal(result.detached.length,11);assert.equal(raw,snapshot);
 for(const r of d.rows)for(const field of ['he','en'])q.validateAnnotation(d,annotation(r,field,q.PIN));
});
await test('archive rejection, exact module/template cache hashes, version and fresh healthy authentication',async()=>{
 await assert.rejects(q.authenticateEdition(read(q.ASSET.slice(1)),a=>a.name===q.QUESTION_ARCHIVE?Buffer.concat([read(a.name),Buffer.from(' ')]):read(a.name),sha),/Question history authentication/);
 for(const n of ['qualified-aitzoas-runtime.js','qualified-aitzoas-topics.js','reader-aitzoas-qualifications.js'])for(const m of read(n).toString().matchAll(/\.\/([\w-]+\.js)\?v=([a-f0-9]{64})/g))assert.equal(m[2],sha(read(m[1])));
 const template=fs.readFileSync(new URL('../src/components/AitzoasQualifiedPage.astro',import.meta.url),'utf8');assert.ok(template.includes('/reader-aitzoas-qualifications.js?v='+sha(read('reader-aitzoas-qualifications.js'))));
 assert.ok(read('sw.js').toString().includes('ajew-v8-aitzoas-annotation-repair-20261021'));assert.ok(read('version.txt').toString().includes('aitzoas-all30-20261021-annotation-repair'));assert.equal((await loadEdition()).rows.length,366);
});
// Importing the existing complete modeled-DOM suite executes all fifty projections
// and genuine Copy/Save, integrity-negative/fresh-positive controls on this edition.
const {modelHTML}=await import('./test-aitzoas-topics.mjs');
await test('actual installed242 English selection annotates new citation without obsolete contraction offsets (modeled Range)',async()=>{
 const v=projectionForPath(d,ownerNavigation(d,242).readingUrl.split('#')[0]),x=testDOM(modelHTML(v),v.url,read);assert.equal(await installAitzoas362(x.window),true);
 const field=x.document.querySelector('#seg-242 [data-source-field="en"]'),node=field.childNodes[0],start=node.textContent.indexOf('Hilchos Bircas'),end=node.textContent.length-1;
 const range={startContainer:node,endContainer:node,startOffset:start,endOffset:end,toString:()=>node.textContent.slice(start,end),cloneRange(){return this;}};
 x.window.getSelection=()=>({isCollapsed:false,rangeCount:1,anchorNode:node,focusNode:node,getRangeAt:()=>range});
 x.document.createRange=()=>({selectNodeContents(){},setEnd(n,a){this.n=n;this.a=a;},toString(){return this.n.textContent.slice(0,this.a);}});
 await x.click(x.document.querySelector('[data-capture]'));const button=x.document.querySelector('[data-captured-action="highlight"]');assert.ok(button);await x.click(button);
 const raw=x.local.get('ajew-aitzoas362-source-annotations-v1');assert.ok(raw,x.document.querySelector('[data-status]').textContent);const annotation=JSON.parse(raw)[0];assert.equal(annotation.selection.start,start);assert.equal(annotation.selection.end,end);assert.equal(annotation.selection.text,range.toString());q.validateAnnotation(d,annotation);
});
await test('actual installed client copies and saves all29 affected owners on real six source projections (modeled DOM)',async()=>{
 let observed=0;
 for(let section=1;section<=6;section++){
  const v=projectionForPath(d,`/reader/aitzoas-yeshuroas/1/${section}`),x=testDOM(modelHTML(v),v.url,read);assert.equal(await installAitzoas362(x.window),true);
  for(const r of v.rows.filter(r=>selected.conservation.changedOwners.includes(r.stableIndex))){
   const payload=q.fullBodyPayload(d,[r.owner]);await x.click(x.document.querySelector(`#seg-${r.stableIndex} [data-action="copy"]`));assert.equal(x.clipboard.at(-1),payload.content);
   await x.click(x.document.querySelector(`#seg-${r.stableIndex} [data-action="save"]`));
   for(let n=0;n<200;n++){const saved=x.local.get('ajew-my-sefer');if(saved&&JSON.parse(saved).sections.some(z=>z.source==='https://ajew.org'+r.canonicalUrl))break;await new Promise(ok=>setTimeout(ok,5));}
   const saved=JSON.parse(x.local.get('ajew-my-sefer')).sections.find(z=>z.source==='https://ajew.org'+r.canonicalUrl);assert.equal(saved.content,payload.content);assert.equal(saved.qualifiedFullBody.editionSHA256,q.PIN);
   for(const n of r.requiredNotes)assert.ok(saved.content.includes(n.text));
   const ctx={crypto:webcrypto,TextEncoder,URL};vm.runInNewContext(read('my-sefer-storage.js').toString(),ctx);const snapshot=x.local.get('ajew-my-sefer');const collection=await ctx.AjewSeferStorage.loadAndMigrate(x.window.localStorage,'https://ajew.org');assert.equal(x.local.get('ajew-my-sefer'),snapshot);
   const consumer=collection.passages.find(p=>p.savedText===payload.content);assert.ok(consumer);const share=buildFullSavedShare({name:'Owned modeled test',passages:[consumer]});assert.ok(share.text.includes(payload.content));const copies=[];assert.equal(await deliverFullSavedShare(share,{writeText:async text=>copies.push(text),manualCopy:()=>assert.fail('unexpected fallback')}),'copied');assert.equal(copies[0],share.text);observed++;
  }
 }assert.equal(observed,29);
});
