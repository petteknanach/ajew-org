// Targeted F1: genuine installed client append, modeled DOM/Range; not native-browser evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as q from '../public/qualified-aitzoas362-core.mjs';
const {PIN,displayPlan}=q;
import {loadEdition,escape,historyHTML,noteHTML} from '../src/lib/qualified-aitzoas362.mjs';
import {projectionForPath,ownerNavigation} from '../public/qualified-aitzoas-topics.mjs';
import {installAitzoas362,ANNOTATION_KEY} from '../public/reader-aitzoas-qualifications.js';
import {testDOM} from './aitzoas-topics-test-dom.mjs';
const read=n=>fs.readFileSync(new URL('../public/'+n,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const oldBytes=execFileSync('git',['show','f62101574a52ccc01782ac3a43ff07a35e3b22e3:public/reader/reviewed/aitzoas362-sources/selected-362.json'],{maxBuffer:4*1024*1024});
assert.equal(sha(oldBytes),'a9fd091f59d7be07cb261a31ba4f0a73bd5bc5827a727f0305c6de1199db2fc7');
const previous=JSON.parse(oldBytes),oldRow=previous.rows[86];
assert.equal(sha(oldRow.en),'d1553a2ce866fe13d3bd98d0b0405931a9af562cbb76a1e0b8f1c88b5886d680');
const d=await loadEdition();
assert.equal(sha(d.rows[86].en),'1c378906ae9acaa25f20df819744dff093f9d238b13f7c7158bb3e2436c1b9c6');
function record(row,pin=q.QUESTION_PREDECESSOR_PIN,field='en'){
 return {schema:'qualified-aitzoas362-annotation/v1',id:'retained-'+pin+'-'+row.owner+'-'+field,type:'note',note:'Personal historical note, unchanged',createdAt:'2026-10-20T12:00:00.000Z',selection:{editionSHA256:pin,owner:row.owner,field,start:0,end:3,text:row[field].slice(0,3),fullField:row[field]}};
}
const old=record(oldRow);
function modelHTML(v){return '<!doctype html><html><head></head><body><section data-aitzoas362 data-edition-sha="'+PIN+'" data-view="'+v.key+'"'+(v.section?' data-section="'+v.section+'"':'')+' data-mode="both"><h1 data-print-heading>'+escape(v.title)+'</h1><header><p data-view-hebrew>'+escape(v.hebrewTitle)+'</p><p data-view-context>'+escape(v.notice)+'</p></header>'+['hebrew','english','both'].map(m=>'<button data-mode-button="'+m+'">'+m+'</button>').join('')+['copy','share','save'].map(a=>'<button data-action="'+a+'">'+a+' page</button>').join('')+'<button data-selection-action="copy">Copy selection</button><button data-capture>Highlight or add a note</button><input data-query><input data-font><output data-search-status></output><p data-status></p><section data-source-root>'+v.rows.map(r=>'<article id="seg-'+r.stableIndex+'" data-index="'+r.stableIndex+'" data-unit="'+r.owner+'"><h2>'+escape(ownerNavigation(d,r.stableIndex).label)+'</h2><section data-he-wrap><h3>Hebrew</h3><p data-source-field="he">'+escape(r.he)+'</p></section><section data-en-wrap><h3>English</h3><p data-source-field="en">'+escape(displayPlan(r).en)+'</p></section><details data-text-notes><summary>Text notes</summary><section data-notes-root>'+noteHTML(r)+'</section><section data-origin-wrap><h3>About this translation</h3><p data-origin>'+escape(r.origin.notice)+'</p></section>'+historyHTML(r)+'</details><div class="q-unit-controls">'+['copy','share','save'].map(a=>'<button data-action="'+a+'">'+a+' paragraph</button>').join('')+'</div></article>').join('')+'</section><div data-annotations></div><div data-capture-host></div></section></body></html>';}
async function init(raw){
 const v=projectionForPath(d,'/reader/aitzoas-yeshuroas/1/3'),x=testDOM(modelHTML(v),v.url,read);
 if(raw!==null)x.local.set(ANNOTATION_KEY,raw);
 x.locks=[];x.writes=[];x.gets=0;
 x.window.navigator.locks.request=async(name,options,fn)=>{x.locks.push({name,options});return fn();};
 const get=x.window.localStorage.getItem,set=x.window.localStorage.setItem;
 x.window.localStorage.getItem=k=>{if(k===ANNOTATION_KEY)x.gets++;return get(k);};
 x.window.localStorage.setItem=(k,v)=>{x.writes.push({key:k,value:v});return set(k,v);};
 x.window.prompt=()=> 'New personal text';
 assert.equal(await installAitzoas362(x.window),true,x.document.querySelector('[data-status]').textContent);
 assert.equal(x.window.Aitzoas362IntegrityReady(),true);return x;
}
async function append(x,id,type){
 const field=x.document.querySelector('#seg-'+id+' [data-source-field="en"]'),node=field.childNodes[0],start=1,end=5;
 const range={startContainer:node,endContainer:node,startOffset:start,endOffset:end,toString:()=>node.textContent.slice(start,end),cloneRange(){return this;}};
 x.window.getSelection=()=>({isCollapsed:false,rangeCount:1,anchorNode:node,focusNode:node,getRangeAt:()=>range});
 x.document.createRange=()=>({selectNodeContents(){},setEnd(n,a){this.n=n;this.a=a;},toString(){return this.n.textContent.slice(0,this.a);}});
 await x.click(x.document.querySelector('[data-capture]'));
 const button=x.document.querySelector('[data-captured-action="'+type+'"]');assert.ok(button,'genuine client capture menu');
 await x.click(button);
 return x.document.querySelector('[data-status]').textContent;
}
function assertSaved(x,raw,id,type){
 assert.match(x.document.querySelector('[data-status]').textContent,new RegExp('^Saved your '+type+'\\.'));
 const saved=x.local.get(ANNOTATION_KEY),items=JSON.parse(saved);assert.equal(items.length,2);
 assert.deepEqual(items[0],JSON.parse(raw)[0]);assert.equal(JSON.stringify(items[0]),JSON.stringify(JSON.parse(raw)[0]));
 const a=items[1];assert.equal(a.selection.editionSHA256,q.PIN);assert.equal(a.selection.owner,d.rows[id-1].owner);assert.equal(a.selection.fullField,d.rows[id-1].en);
 assert.equal(a.selection.text,d.rows[id-1].en.slice(1,5));assert.equal(a.type,type);assert.equal(a.note,type==='highlight'?'':'New personal text');assert.equal(q.validateAnnotation(d,a),d.rows[id-1]);
 assert.deepEqual(x.locks.at(-1),{name:ANNOTATION_KEY,options:{mode:'exclusive'}});
 const classified=q.annotationAttachments(d,saved);assert.equal(classified.detached.length,1);assert.equal(classified.attached.length,1);assert.equal(classified.detached[0].id,old.id);assert.deepEqual(classified.attached[0].annotation,a);
 return saved;
}
for(const id of [88,87])for(const type of ['highlight','note','prayer'])await test('F1 actual append '+type+' on '+(id===87?'changed':'unchanged')+' owner retains authentic f621 detached record and reloads',async()=>{
 const raw=JSON.stringify([old],null,2),x=await init(raw);
 assert.match(x.document.querySelector('[data-annotations]').textContent,/1 existing local annotation\(s\) retained but not attached/);
 assert.throws(()=>q.validateAnnotation(d,old));assert.equal(x.local.get(ANNOTATION_KEY),raw);
 await append(x,id,type);const saved=assertSaved(x,raw,id,type);
 const reload=await init(saved);assert.equal(reload.local.get(ANNOTATION_KEY),saved);assert.match(reload.document.querySelector('[data-annotations]').textContent,/1 existing local annotation\(s\) retained but not attached/);
 assert.equal(reload.document.querySelector('[data-annotations]').querySelectorAll('article').length,1);
});
const edit=fn=>{const a=structuredClone(old);fn(a);return JSON.stringify([a]);};
const invalid=[
 ['malformed JSON','{'],['non-array','{}'],['null record','[null]'],['array record','[[]]'],['missing selection',edit(a=>delete a.selection)],
 ['duplicate IDs',JSON.stringify([old,old])],['bad schema',edit(a=>a.schema='forged')],['bad type',edit(a=>a.type='source')],['bad note',edit(a=>a.note={})],
 ['unknown edition',edit(a=>a.selection.editionSHA256='f'.repeat(64))],['forged historical full field',edit(a=>a.selection.fullField+=' forged')],
 ['self-consistent forged historic source',edit(a=>{a.selection.fullField='Invented historical text';a.selection.text='Inv';})],
 ['current text under historical pin',edit(a=>{a.selection.fullField=d.rows[86].en;a.selection.text=d.rows[86].en.slice(0,3);})],
 ['historic text under current pin',edit(a=>a.selection.editionSHA256=q.PIN)],['bad offsets',edit(a=>a.selection.start=-1)],['bad text',edit(a=>a.selection.text='forged')],
 ['wrong owner',edit(a=>a.selection.owner=d.rows[87].owner)],['bad field',edit(a=>a.selection.field='history')]
];
for(const [name,raw]of invalid)await test('actual append denies '+name+' without write; same-owner fresh positive after recovery',async()=>{
 const x=await init(raw);await append(x,87,'highlight');assert.doesNotMatch(x.document.querySelector('[data-status]').textContent,/^Saved/);assert.equal(x.local.get(ANNOTATION_KEY),raw);assert.equal(x.writes.length,0);
 // Recover only the test's malformed input; production never clears or drops records.
 const good=JSON.stringify([old]);x.local.set(ANNOTATION_KEY,good);await append(x,87,'highlight');assertSaved(x,good,87,'highlight');
});
await test('recognized earlier editions retain authentic detached fields, no arbitrary source/edition interchange',async()=>{
 const corrected=q.correctionPredecessor(d.bank),baseline=structuredClone(corrected);for(const [id,fields]of Object.entries(q.FINAL4_ORIGINALS))Object.assign(baseline.rows[Number(id)-1],fields);
 const cases=[[corrected.rows[61],q.CORRECTION_PREDECESSOR_PIN],[baseline.rows[62],q.PREVIOUS_EDITION_PIN]];
 for(const [row,pin]of cases){const a=record(row,pin),raw=JSON.stringify([a]),x=await init(raw);assert.throws(()=>q.validateAnnotation(d,a));await append(x,87,'note');assert.match(x.document.querySelector('[data-status]').textContent,/^Saved your note/);assert.deepEqual(JSON.parse(x.local.get(ANNOTATION_KEY))[0],a);const c=q.annotationAttachments(d,x.local.get(ANNOTATION_KEY));assert.equal(c.attached.length,1);assert.equal(c.detached.length,1);}
 // A previously attachable unchanged record is still accepted and stays attached.
 const unchanged=record(previous.rows[87]),x=await init(JSON.stringify([unchanged]));q.validateAnnotation(d,unchanged);await append(x,88,'prayer');assert.match(x.document.querySelector('[data-status]').textContent,/^Saved your prayer/);assert.equal(q.annotationAttachments(d,x.local.get(ANNOTATION_KEY)).attached.length,2);
});
await test('actual append preserves current-value conflict check and exact write readback, then recovery',async()=>{
 const good=JSON.stringify([old]);
 for(const fault of ['conflict','readback']){
  const x=await init(good),get=x.window.localStorage.getItem,set=x.window.localStorage.setItem;let reads=0;
  if(fault==='conflict')x.window.localStorage.getItem=k=>k===ANNOTATION_KEY&&++reads===2?good+' ':get(k);
  else x.window.localStorage.setItem=(k,v)=>{if(k!==ANNOTATION_KEY)set(k,v);};
  await append(x,87,'highlight');assert.doesNotMatch(x.document.querySelector('[data-status]').textContent,/^Saved/);assert.equal(x.local.get(ANNOTATION_KEY),good);assert.equal(x.writes.length,0);
  x.window.localStorage.getItem=get;x.window.localStorage.setItem=set;await append(x,87,'highlight');assertSaved(x,good,87,'highlight');
 }
});
await test('strict current and outward edition branding remain fail-closed',()=>{
 const current=record(d.rows[86],q.PIN);q.validateAnnotation(d,current);
 assert.throws(()=>q.validateAnnotation({...d},current));assert.throws(()=>q.fullBodyPayload({...d},[d.rows[86].owner]));
 for(const a of [old,...invalid.slice(6).map(([,raw])=>JSON.parse(raw)[0])])assert.throws(()=>q.validateAnnotation(d,a));
});
await test('module/client/template/Python core bindings and final complete authenticated edition',async()=>{
 for(const n of ['qualified-aitzoas-runtime.js','qualified-aitzoas-topics.js','reader-aitzoas-qualifications.js'])for(const m of read(n).toString().matchAll(/\.\/([\w-]+\.js)\?v=([a-f0-9]{64})/g))assert.equal(m[2],sha(read(m[1])));
 const template=fs.readFileSync(new URL('../src/components/AitzoasQualifiedPage.astro',import.meta.url),'utf8');assert.ok(template.includes('/reader-aitzoas-qualifications.js?v='+sha(read('reader-aitzoas-qualifications.js'))));
 const py=fs.readFileSync(new URL('./qualified_aitzoas362_exports.py',import.meta.url),'utf8');assert.ok(py.includes(sha(read('qualified-aitzoas362-core.js'))));
 const fresh=await loadEdition();assert.equal(fresh.rows.length,366);assert.equal(sha(read(q.ASSET.slice(1))),'5d92e0207a130d9a2dca1d9464b28159be963f0bd02729002b9a5b8ef0a2d0d3');
 console.log(JSON.stringify({authority:{commit:'f62101574a52ccc01782ac3a43ff07a35e3b22e3',oldBankSHA256:sha(oldBytes),oldOwner87EnglishSHA256:sha(oldRow.en),currentOwner87EnglishSHA256:sha(fresh.rows[86].en)},coreSHA256:sha(read('qualified-aitzoas362-core.js')),clientSHA256:sha(read('reader-aitzoas-qualifications.js'))}));
});
