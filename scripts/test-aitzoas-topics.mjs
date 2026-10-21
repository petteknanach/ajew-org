// Run directly with --max-old-space-size=256 (serial; no full corpus/build).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {loadEdition,escape,historyHTML,noteHTML} from '../src/lib/qualified-aitzoas362.mjs';
import {PIN,ASSET,ASSET_PINS,CORRECTION_PREDECESSOR_PIN,CORRECTION_OPERATIONS,fullBodyPayload,displayPlan,stable,validateAnnotation} from '../public/qualified-aitzoas362-core.mjs';
import {topicStructure,projectionForPath,assertProjection,ownerNavigation,printedNumber} from '../public/qualified-aitzoas-topics.mjs';
import {installAitzoas362} from '../public/reader-aitzoas-qualifications.js';
import {testDOM} from './aitzoas-topics-test-dom.mjs';
const read=n=>fs.readFileSync(new URL('../public/'+n,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const oracle=JSON.parse(fs.readFileSync(new URL('./fixtures/aitzoas-topics-oracle.json',import.meta.url)));
const originalAssets=Object.fromEntries(Object.keys(ASSET_PINS).map(n=>[n,sha(read(n))]));
let d=await loadEdition(),s=topicStructure(d);
const ids=rows=>rows.map(r=>r.stableIndex);
await test('independent mapped forty topics: exhaustive owners, bilingual labels and exact original numbers',()=>{
 assert.equal(s.topics.length,40);assert.equal(oracle.topics.length,40);
 for(const [i,t]of s.topics.entries()){
  const expected=oracle.topics[i];assert.equal(t.start,expected.heading);assert.equal(t.title,expected.en);assert.equal(t.hebrewTitle,expected.he);assert.deepEqual(ids(t.rows),expected.owners);
  assert.equal(t.teachingCount,expected.numbers.length);
  for(const [id,he,decimal]of expected.numbers){assert.deepEqual(ownerNavigation(d,id).number,{he,decimal});assert.deepEqual(printedNumber(d.rows[id-1].he),{he,decimal});}
 }
 const primary=s.topics.flatMap(t=>ids(t.rows)),apparatus=s.apparatus.flatMap(a=>ids(a.rows)),all=[...primary,...apparatus];
 assert.equal(primary.length,269);assert.equal(primary.filter(i=>ownerNavigation(d,i).kind==='teaching').length,229);
 assert.equal(all.length,366);assert.equal(new Set(all).size,366);assert.deepEqual(all.sort((a,b)=>a-b),Array.from({length:366},(_,i)=>i+1));
 assert.deepEqual(ids(s.apparatus[0].rows),oracle.partitions.find(g=>g.id==='front').owners);
 assert.deepEqual(ids(s.apparatus[1].rows),oracle.partitions.find(g=>g.id==='closing').owners);
 assert.deepEqual(ids(s.apparatus[2].rows),oracle.partitions.find(g=>g.id==='appendix-inline-apparatus').owners);
 assert.deepEqual(ids(s.apparatus[3].rows),oracle.partitions.find(g=>g.id==='appendix-repeated-opening').owners);
 assert.ok(primary.every(i=>i<280&&!([62,63,193].includes(i))));
 assert.equal(ownerNavigation(d,41).number.decimal,33);assert.equal(ownerNavigation(d,320).number.decimal,33);
});
await test('source conservation, separate apparatus and independent repeated witnesses, not aliases',()=>{
 assert.equal(CORRECTION_PREDECESSOR_PIN,oracle.selectedBankSHA256);
 assert.equal(sha(read(ASSET.slice(1))),oracle.sourceQuestions.selectedBankSHA256);assert.equal(PIN,oracle.sourceQuestions.selectedBankSHA256);assert.equal(sha(stable(CORRECTION_OPERATIONS)),oracle.sourceCorrection.operationsSHA256);
 const repeats=d.rows.slice(281);assert.equal(repeats.length,85);assert.equal(repeats.filter(r=>ownerNavigation(d,r.stableIndex).primaryIndex!==null).length,84);
 assert.equal(ownerNavigation(d,283).primaryIndex,null);
 for(const r of repeats){const m=ownerNavigation(d,r.stableIndex);if(m.primaryIndex!==null){const primary=d.rows[m.primaryIndex-1];assert.equal(r.he,primary.he);assert.notEqual(r.owner,primary.owner);assert.equal(m.primaryOwner,primary.owner);}}
 // Former apparatus-arrival assertion documented the defect. Keep the exact
 // source partition; change ONLY the explicitly authorized reading destinations.
 for(const [id,target]of [[1,11],[62,81],[63,82],[193,165],[283,223]]){assert.equal(ownerNavigation(d,id).number,null);assert.equal(ownerNavigation(d,id).readingUrl,ownerNavigation(d,target).readingUrl);assert.ok(s.apparatus[2].rows.includes(d.rows[id-1]));}
 for(let section=1;section<=6;section++){const v=projectionForPath(d,`/reader/aitzoas-yeshuroas/1/${section}`);assert.deepEqual(ids(v.rows),d.rows.filter(r=>r.section===section).map(r=>r.stableIndex));}
});
await test('immutable authenticated projections reject forged edition/view, wrong-route/wrong-topic and numbering changes',()=>{
 const v=projectionForPath(d,s.topics[0].url);assertProjection(d,v,s.topics[0].url,v.key);
 for(const p of [s.topics[1].url,'/reader/aitzoas-yeshuroas/1/2','/reader/aitzoas-yeshuroas/topics/nonexistent/','/reader/other/1/2','/reader/aitzoas-yeshuroas/2/2'])assert.throws(()=>assertProjection(d,v,p,v.key));
 assert.throws(()=>topicStructure({...d}));assert.throws(()=>assertProjection(d,{...v},v.url,v.key));assert.throws(()=>assertProjection(d,v,v.url,'topic-eating'));
 assert.throws(()=>v.rows.pop());assert.throws(()=>s.topics[0].title='Wrong');assert.throws(()=>s.byId[9].number.decimal=999);
 assertProjection(d,projectionForPath(d,s.topics[0].url),s.topics[0].url,v.key);
});
await test('primary sequence ends at closing and never automatically advances into repeated opening',()=>{
 for(const [i,t]of s.topics.entries()){const v=projectionForPath(d,t.url);assert.equal(v.previous.url,(s.topics[i-1]??s.apparatus[0]).url);assert.equal(v.next.url,(s.topics[i+1]??s.apparatus[1]).url);}
 assert.equal(projectionForPath(d,s.apparatus[1].url).next,null);assert.equal(projectionForPath(d,s.apparatus[0].url).next.url,s.topics[0].url);
});
export function modelHTML(v){return '<!doctype html><html><head></head><body><section data-aitzoas362 data-edition-sha="'+PIN+'" data-view="'+v.key+'"'+(v.section?' data-section="'+v.section+'"':'')+' data-mode="both"><h1 data-print-heading>'+escape(v.title)+'</h1><header><p data-view-hebrew>'+escape(v.hebrewTitle)+'</p><p data-view-context>'+escape(v.notice)+'</p></header>'+['hebrew','english','both'].map(m=>'<button data-mode-button="'+m+'">'+m+'</button>').join('')+['copy','share','save'].map(a=>'<button data-action="'+a+'">'+a+' page</button>').join('')+'<button data-selection-action="copy">Copy selection</button><button data-capture>Highlight or add a note</button><input data-query><input data-font><output data-search-status></output><p data-status></p><section data-source-root>'+v.rows.map(r=>'<article id="seg-'+r.stableIndex+'" data-index="'+r.stableIndex+'" data-unit="'+r.owner+'"><h2>'+escape(ownerNavigation(d,r.stableIndex).label)+'</h2><section data-he-wrap><h3>Hebrew</h3><p data-source-field="he">'+escape(r.he)+'</p></section><section data-en-wrap><h3>English</h3><p data-source-field="en">'+escape(displayPlan(r).en)+'</p></section><details data-text-notes><summary>Text notes</summary><section data-notes-root>'+noteHTML(r)+'</section><section data-origin-wrap><h3>About this translation</h3><p data-origin>'+escape(r.origin.notice)+'</p></section>'+historyHTML(r)+'</details><div class="q-unit-controls">'+['copy','share','save'].map(a=>'<button data-action="'+a+'">'+a+' paragraph</button>').join('')+'</div></article>').join('')+'</section><div data-annotations></div><div data-capture-host></div></section></body></html>';}
async function init(v){const x=testDOM(modelHTML(v),v.url,read);assert.equal(await installAitzoas362(x.window),true,x.document.querySelector('[data-status]').textContent);assert.equal(x.window.Aitzoas362IntegrityReady(),true);return x;}
await test('actual full client initializes all forty topic projections, four apparatus pages and six stable source routes (modeled DOM)',async()=>{
 for(const p of [...s.topics,...s.apparatus,...Array.from({length:6},(_,i)=>({url:`/reader/aitzoas-yeshuroas/1/${i+1}`}))]){const v=projectionForPath(d,p.url);const x=await init(v);assert.equal(x.document.querySelectorAll('[data-unit]').length,v.rows.length);}
});
await test('actual client rejects wrong topic/route/header/number/source/note/history mutations, then fresh positives (modeled DOM)',async()=>{
 const v=projectionForPath(d,s.topics.find(t=>t.slug==='prayer').url),x=await init(v),doc=x.document;
 const mutations=[
  [()=>{const before=x.window.location.pathname;x.window.location.pathname=s.topics[0].url;return()=>x.window.location.pathname=before;}],
  [()=>{const c=doc.querySelector('[data-aitzoas362]'),before=c.dataset.view;c.dataset.view='topic-eating';return()=>c.dataset.view=before;}],
  ...['[data-print-heading]','[data-view-hebrew]','[data-view-context]','[data-unit] h2','[data-source-field="he"]','[data-source-field="en"]','[data-note-id]','[data-origin]','[data-history-field="en"]'].map(sel=>[()=>{const n=doc.querySelector(sel);assert.ok(n,sel);const before=n.textContent;n.textContent+=' unauthorized';return()=>n.textContent=before;}]),
  [()=>{const header=doc.querySelector('header'),injected=doc.createElement('p');injected.textContent='Foreign header';header.append(injected);return()=>injected.remove();}],
  [()=>{const n=doc.querySelector('[data-unit]'),before=n.dataset.unit;n.dataset.unit=d.rows[0].owner;return()=>n.dataset.unit=before;}]
 ];
 for(const [mutate]of mutations){const restore=mutate();assert.equal(x.window.Aitzoas362IntegrityReady(),false);const before=x.clipboard.length;await x.click(doc.querySelector('[data-action="copy"]'));assert.equal(x.clipboard.length,before);restore();assert.equal(x.window.Aitzoas362IntegrityReady(),true);}
 await x.click(doc.querySelector('[data-action="copy"]'));assert.equal(x.clipboard.at(-1),fullBodyPayload(d,v.rows.map(r=>r.owner)).content);
});
await test('same owner payload, save identity inputs, qualifications and annotation identity across topic and source route',async()=>{
 const r=d.rows[241],v=projectionForPath(d,ownerNavigation(d,242).readingUrl.split('#')[0]);const x=await init(v);
 const button=x.document.querySelector('#seg-242 [data-action="copy"]');await x.click(button);assert.equal(x.clipboard.at(-1),fullBodyPayload(d,[r.owner]).content);
 for(const q of displayPlan(r).notes)assert.ok(x.clipboard.at(-1).includes(q.text));
 assert.ok(x.clipboard.at(-1).includes(r.history.en));assert.ok(x.clipboard.at(-1).includes(r.canonicalUrl));
 const selection={editionSHA256:PIN,owner:r.owner,field:'he',start:0,end:3,text:r.he.slice(0,3),fullField:r.he};
 assert.equal(validateAnnotation(d,{schema:'qualified-aitzoas362-annotation/v1',id:'modeled',type:'note',note:'Personal',selection}),r);
 const fromTopic=fullBodyPayload(d,[r.owner]),fromSource=fullBodyPayload(d,[projectionForPath(d,'/reader/aitzoas-yeshuroas/1/'+r.section).rows.find(u=>u.owner===r.owner).owner]);
 assert.equal(stable([PIN,fromTopic.owners,fromTopic.content]),stable([PIN,fromSource.owners,fromSource.content]));
 await x.click(x.document.querySelector('#seg-242 [data-action="save"]'));
 for(let i=0;i<100&&!x.local.has('ajew-my-sefer');i++)await new Promise(resolve=>setTimeout(resolve,10));
 const savedRaw=x.local.get('ajew-my-sefer');assert.ok(savedRaw,x.document.querySelector('[data-status]').textContent);
 const saved=JSON.parse(savedRaw).sections;assert.equal(saved.length,1);assert.equal(saved[0].source,'https://ajew.org'+r.canonicalUrl);assert.equal(saved[0].content,fromSource.content);
 const legacy=await init(projectionForPath(d,'/reader/aitzoas-yeshuroas/1/'+r.section));legacy.local.set('ajew-my-sefer',savedRaw);
 await legacy.click(legacy.document.querySelector('#seg-242 [data-action="save"]'));
 for(let i=0;i<100&&!legacy.document.querySelector('[data-status]').textContent.startsWith('Saved');i++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.match(legacy.document.querySelector('[data-status]').textContent,/^Saved/);assert.equal(legacy.local.get('ajew-my-sefer'),savedRaw);

});
await test('fresh complete authentication after controls, all source pins unchanged',async()=>{
 d=await loadEdition();s=topicStructure(d);assert.equal(s.topics.length,40);assert.equal(d.rows.length,366);
 for(const [name,pin]of Object.entries(originalAssets))assert.equal(sha(read(name)),pin,name);
});
