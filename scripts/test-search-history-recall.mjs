import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {setImmediate as immediate} from 'node:timers/promises';
import * as core from '../src/lib/search-mode-core.mjs';
import {displayBookLabel} from '../src/lib/search-book-labels.mjs';
import {qualifiedSearchAnchor} from '../src/lib/qualified-search-arrival.mjs';

// Dependencies resolve relative to this portable test; sparse private runs may
// explicitly supply NODE_PATH. Canonical unset-NODE_PATH is a separate gate.
const require = createRequire(import.meta.url);
const {parseFragment} = require('parse5');
const esbuild = require('esbuild');
const compiler = require('@astrojs/compiler');
const sourcePath = process.env.SEARCH_HISTORY_SOURCE || new URL('../src/pages/search-enhanced.astro', import.meta.url);
const componentPath = new URL('../src/components/EnhancedSearch.astro', import.meta.url);
const fixturePath = new URL('./test-search-extra-info-conservation.mjs', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');
const component = readFileSync(componentPath, 'utf8');
const extract = s => { const matches = [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)]; assert.equal(matches.length,1); return matches[0][1]; };
const pageScript = extract(source), componentScript = extract(component);
const imported = [];
const supplied = pageScript.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, s => {imported.push(s); return '';});
assert.equal(imported.length,3,'only actual unchanged library imports are supplied');
const observer = '\n      window.__recallState = () => ({activeSearchRequest, activeContinuation, lastSearchResults, jevPCount});\n';
const inject = s => {const end=s.lastIndexOf('    });'); assert.ok(end>0); const result=s.slice(0,end)+observer+s.slice(end); assert.equal(result.replace(observer,''),s); return result;};
const pageCode = esbuild.transformSync('(()=>{\n'+inject(supplied)+'\n})();',{loader:'ts',target:'es2022'}).code;
const componentCode = esbuild.transformSync('(()=>{\n'+componentScript+'\n})();',{loader:'ts',target:'es2022'}).code;
const normalizeBlock=pageScript.slice(pageScript.indexOf('      function normalizeForSearch'),pageScript.indexOf('      const EN_STOP_WORDS'));
const normalize = vm.runInNewContext(normalizeBlock+';normalizeForSearch');
// Exact previously authenticated corpus slices, not invented text or a copied
// whole corpus. Only bounded fixture transport/postings are synthetic.
const fixtureSource = readFileSync(fixturePath,'utf8');
const DOC1 = JSON.parse(fixtureSource.match(/const DOC1 = (\{[^\n]+\});/)[1]);
const LM = JSON.parse(fixtureSource.match(/const LM = (\{[^\n]+\});/)[1]);
const docs=[DOC1,LM].map(d=>({...d,n:normalize([d.t,d.h,d.en,d.he].join(' '))}));
const json = value => JSON.parse(JSON.stringify(value));
const digest = value => createHash('sha256').update(value).digest('hex');
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const kids=n=>n.childNodes || [];
const all=n=>[n,...kids(n).flatMap(all)];
const text=n=>n.nodeName==='#text'?n.value:kids(n).map(text).join('');
const cls=(n,c)=>(attr(n,'class') || '').split(/\s+/).includes(c);
class Element {
  constructor({hidden=false,node=null}={}) {
    this.node=node;this.handlers=new Map();this.children=[];this.style={};this.value='';this.disabled=false;this.checked=false;this._text='';this._html='';this.fragment=parseFragment('');this.wrappers=new WeakMap();
    const classes=new Set(hidden?['hidden']:[]);
    this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{if(on??!classes.has(c))classes.add(c);else classes.delete(c);}};
  }
  get dataset(){return Object.fromEntries((this.node?.attrs || []).filter(a=>a.name.startsWith('data-')).map(a=>[a.name.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),a.value]));}
  addEventListener(type,fn){const a=this.handlers.get(type)||[];a.push(fn);this.handlers.set(type,a);}
  fire(type,event={}){for(const fn of this.handlers.get(type)||[])fn.call(this,event);}
  set innerHTML(s){this._html=String(s);this.fragment=parseFragment(this._html);this.children=[];this.wrappers=new WeakMap();}
  get innerHTML(){return this._html;}
  get textContent(){return this.node?text(this.node):this._text;}
  set textContent(s){this._text=String(s);}
  appendChild(e){this.children.push(e);return e;}
  querySelectorAll(selector){assert.ok(['.sh-tag','.share-btn'].includes(selector));return all(this.fragment).filter(n=>n.tagName&&cls(n,selector.slice(1))).map(n=>{if(!this.wrappers.has(n))this.wrappers.set(n,new Element({node:n}));return this.wrappers.get(n);});}
  scrollIntoView(){}
}
const response=value=>({ok:true,status:200,json:async()=>value});
async function settle(){for(let i=0;i<12;i++){for(let j=0;j<80;j++)await Promise.resolve();await immediate();}}
let receiptId=0;
function saveReceipt(h,label,extra={}) {
  const row={label,topology:h.topology,sourceSHA256:digest(source),componentSHA256:digest(component),fixtureSHA256:digest(fixtureSource),fixture:'exact DOC1/LM first mapped source-bound slices; synthetic two-document metadata/postings only',calls:h.calls,dispatches:h.dispatched,errors:h.errors,state:json(h.window.enhancedSearch.getState()),page:json(h.state()),href:h.window.location.href,history:h.history(),...extra};
  if(process.env.TEST_EVIDENCE_DIR){const dir=process.env.TEST_EVIDENCE_DIR;mkdirSync(dir,{recursive:true});const id=String(++receiptId).padStart(2,'0');writeFileSync(dir+'/'+id+'-'+label+'.json',JSON.stringify(row,null,2)+'\n');writeFileSync(dir+'/'+id+'-'+label+'-history.html',h.els.searchHistoryBox.innerHTML);writeFileSync(dir+'/'+id+'-'+label+'-results.html',h.els.resultsList.innerHTML);}
  return row;
}
function harness({initial=[],selected=[true,true],options={},bundled=false,held=false,reverse=false}={}) {
  const els=Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels','searchForm'].map(id=>[id,new Element({hidden:['loading','resultsContainer','noResults'].includes(id)})]));
  els['search-book-labels'].textContent=JSON.stringify({[DOC1.c]:DOC1.c,[LM.c]:LM.c});
  const boxes=selected.map((checked,i)=>Object.assign(new Element(),{value:docs[i].c,checked}));
  const events=new Map(),calls=[],errors=[],timers=new Map(),dispatched=[],storage=new Map([['ajew-search-history',JSON.stringify(initial)]]);
  let timerId=0,release,holding=held;
  const waiting=new Promise(resolve=>release=resolve);
  const document={getElementById:id=>els[id]||null,createElement:()=>new Element(),querySelectorAll:selector=>{if(selector==='input[name="searchBook"]')return boxes;if(selector==='input[name="searchBook"]:checked')return boxes.filter(b=>b.checked);return [];},addEventListener:(type,fn)=>{const a=events.get(type)||[];a.push(fn);events.set(type,a);},dispatchEvent:event=>{dispatched.push({type:event.type,detail:event.detail?json(event.detail):null});for(const fn of events.get(event.type)||[])fn(event);return true;}};
  const window={location:{origin:'https://fixture.invalid',search:'?nojev=1&keep=original',href:'https://fixture.invalid/search-enhanced?nojev=1&keep=original'},history:{replaceState:(_,__,url)=>{window.location.href=String(url);window.location.search=new URL(window.location.href).search;}}};
  const shard={};docs.forEach((d,id)=>{for(const w of new Set(d.n.split(' ').filter(Boolean))) (shard[w]||=[]).push(id);});
  const fetch=async url=>{
    const path=String(url).split('?')[0];calls.push({url:String(url),path});
    if(path==='/reader-search/meta.json')return response({generatedAt:'bounded-authenticated-slice-fixture',items:docs.map(d=>({p:d.p}))});
    if(path.startsWith('/reader-search/shards/'))return response(shard);
    if(path.includes('/letters/')){const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setUint32(0,0,true);view.setUint32(4,1,true);return {ok:true,arrayBuffer:async()=>buffer};}
    const match=path.match(/^\/reader-search\/docs\/(\d+)\.json$/);if(match){if(holding)await waiting;return response(json(docs[Number(match[1])]));}
    throw new Error('forbidden/unexpected network or provider request: '+path);
  };
  const ctx=vm.createContext({...core,displayBookLabel,qualifiedSearchAnchor,document,window,fetch,URL,URLSearchParams,AbortController,TextEncoder,DataView,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail;}},queueMicrotask,localStorage:{getItem:key=>{assert.equal(key,'ajew-search-history');return storage.get(key)??null;},setItem:(key,value)=>{assert.equal(key,'ajew-search-history');storage.set(key,value);}},navigator:{},console:{warn(){},error:(...a)=>errors.push(a.map(String))},setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
  if(bundled)vm.runInContext(bundleCode,ctx,{filename:'actual-Astro-extracted-esbuild-client-modules.js',timeout:4000});
  else {for(const code of reverse?[componentCode,pageCode]:[pageCode,componentCode])vm.runInContext(code,ctx,{filename:code===pageCode?String(sourcePath):String(componentPath),timeout:4000});}
  assert.equal(events.get('DOMContentLoaded').length,2,'both complete initialized script paths');
  document.dispatchEvent({type:'DOMContentLoaded'});
  for(const [id,t]of timers)if(t.ms===0){timers.delete(id);t.fn();}
  document.dispatchEvent({type:'advanced-search-options',detail:options});
  assert.equal(window.searchState,undefined,'no global component-private searchState');
  return {els,window,calls,errors,dispatched,boxes,topology:bundled?'actual Astro extraction + esbuild distinct modules':'separate IIFEs per complete extracted script (never shared top-level bindings)',history:()=>JSON.parse(storage.get('ajew-search-history')),state:()=>window.__recallState(),submit:q=>{els.searchInput.value=q;els.searchForm.fire('submit',{preventDefault(){}});},clear:()=>els.clearResults.fire('click'),release:()=>{holding=false;release();},searchEvents:()=>dispatched.filter(e=>e.type==='enhanced-search'),visible:()=>!els.resultsContainer.classList.contains('hidden'),cards:()=>all(els.resultsList.fragment).filter(n=>cls(n,'result-item'))};
}

// Actual compiler extraction corroborates the full-init isolated model. No
// full-site build, browser, provider or network; output retained when requested.
const extracted=[];
for(const [name,bytes,path]of [['page',source,sourcePath],['component',component,componentPath]]){
  const transformed=await compiler.transform(bytes,{filename:String(path)});
  const scripts=transformed.scripts.filter(s=>s.type==='inline');assert.equal(scripts.length,1);assert.equal(scripts[0].code.trim(),extract(bytes).trim());extracted.push(scripts[0].code);
  if(process.env.TEST_EVIDENCE_DIR){mkdirSync(process.env.TEST_EVIDENCE_DIR,{recursive:true});writeFileSync(process.env.TEST_EVIDENCE_DIR+'/compiler-'+name+'.json',JSON.stringify(transformed,null,2)+'\n');}
}
const moduleResult=await esbuild.build({stdin:{contents:'import "page-client"; import "component-client";',resolveDir:new URL('../src/pages/',import.meta.url).pathname,sourcefile:'recall-isolated-modules.ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',treeShaking:false,metafile:true,plugins:[{name:'actual-compiler-extracted-modules',setup(build){build.onResolve({filter:/^(page|component)-client$/},a=>({path:a.path,namespace:'recall-client'}));build.onLoad({filter:/.*/,namespace:'recall-client'},a=>({contents:a.path==='page-client'?inject(extracted[0]):extracted[1],loader:'ts',resolveDir:new URL('../src/pages/',import.meta.url).pathname}));}}]});
const bundleCode=moduleResult.outputFiles[0].text;
if(process.env.TEST_EVIDENCE_DIR){writeFileSync(process.env.TEST_EVIDENCE_DIR+'/actual-module-bundle.js',bundleCode);writeFileSync(process.env.TEST_EVIDENCE_DIR+'/actual-module-metafile.json',JSON.stringify(moduleResult.metafile,null,2)+'\n');}

async function recall(h,query,label){
  await settle();const btn=h.els.searchHistoryBox.querySelectorAll('.sh-tag').find(b=>b.dataset.q===query);assert.ok(btn,'parser-decoded history node exists');assert.equal(btn.textContent,query);assert.equal((btn.handlers.get('click')||[]).length,1);
  // QuerySelector returns the identical wrapper on the identical parsed node.
  assert.ok(h.els.searchHistoryBox.querySelectorAll('.sh-tag').includes(btn));
  const before=h.state().activeSearchRequest,events=h.searchEvents().length;
  let error=null;try{btn.fire('click');}catch(e){error={name:e.name,message:e.message};}
  await settle();saveReceipt(h,label,{recallError:error,expectedQuery:query,beforeRequest:before,beforeEvents:events});
  assert.equal(error,null,'ordinary recall must not throw (original ReferenceError is RED)');
  assert.equal(h.els.searchInput.value,query,'unchanged exact data-q assignment');
  assert.equal(h.window.enhancedSearch.getState().query,query.trim(),'component state follows normal form trim');
  assert.equal(h.searchEvents().length,events+1,'exactly one public enhanced-search dispatch');
  assert.equal(h.state().activeSearchRequest,before+1,'exactly one ordinary page request generation');
  assert.equal(new URL(h.window.location.href).searchParams.get('q'),query.trim());
  assert.equal(h.errors.length,0);return h;
}
const configurations=[
  ['ordinary','obstacles',{},[true,true]],
  ['quoted','"obstacles"',{},[true,true]],
  ['pointed-source',DOC1.h,{},[true,true]],
  ['exact-narrowed','obstacles',{searchType:'exact'},[true,false]],
  ['any-minwords','obstacles Torah',{searchType:'any',minWords:2},[true,true]],
  ['proximity','obstacles Torah',{searchType:'proximity',proximity:7},[true,true]],
  ['acronym-any','om',{searchType:'acronym',acronymOrder:'any'},[true,true]],
  ['endletters-any','es',{searchType:'endletters',acronymOrder:'any'},[true,true]],
  ['no-books-selected','obstacles',{},[false,false]],
];
for(const [label,query,options,selected]of configurations)test('ISOLATED full-init recall equals current form: '+label,async()=>{
  const h=harness({initial:[query],options,selected});await settle();
  const filters=h.window.enhancedSearch.getState().filters;filters.language='he';filters.author='preserved-filter';filters.type.push('reader');
  await recall(h,query,label);
  const recalled={state:json(h.window.enhancedSearch.getState()),event:h.searchEvents().at(-1),url:h.window.location.href,results:json(h.state().lastSearchResults),visible:h.visible(),cards:h.cards().length,request:h.state().activeSearchRequest};
  assert.deepEqual(recalled.event.detail.filters,{type:['reader'],category:[],language:'he',author:'preserved-filter'});
  assert.deepEqual(recalled.state.advancedOptions.books,selected.every(Boolean)?[]:selected.flatMap((checked,i)=>checked?[docs[i].c]:[]));
  // Compare from identical fresh preconditions, not after Clear reordered q
  // or a previous search changed books before the unchanged URL serializer.
  const form=harness({initial:[query],options,selected});await settle();
  const formFilters=form.window.enhancedSearch.getState().filters;formFilters.language='he';formFilters.author='preserved-filter';formFilters.type.push('reader');
  form.submit(query);await settle();
  assert.deepEqual(json(form.window.enhancedSearch.getState()),recalled.state);assert.deepEqual(form.searchEvents().at(-1),recalled.event);assert.equal(form.window.location.href,recalled.url);assert.deepEqual(json(form.state().lastSearchResults),recalled.results);assert.equal(form.visible(),recalled.visible);assert.equal(form.cards().length,recalled.cards);
  assert.equal(new URL(recalled.url).searchParams.get('keep'),'original');assert.equal(new URL(recalled.url).searchParams.has('nojev'),true);
  if(label==='ordinary'||label==='quoted'||label==='pointed-source'||label==='exact-narrowed'){assert.ok(recalled.visible);assert.equal(recalled.cards,1,'real source slice renders via verification, not helper renderer');}
  if(label==='proximity')assert.equal(new URL(recalled.url).searchParams.get('proximity'),'7');
  if(label==='any-minwords')assert.equal(new URL(recalled.url).searchParams.get('minWords'),'2');
  if(options.acronymOrder)assert.equal(new URL(recalled.url).searchParams.get('acronymOrder'),'any');
  assert.equal(h.calls.some(c=>/jev|https?:/.test(c.path)),false);
  saveReceipt(h,label+'-form-equivalence',{equivalence:true});
});
for(const bundled of [false,true])test((bundled?'ASTRO/ESBUILD MODULE':'ISOLATED WRAPPER')+' full-init original negative/candidate positive Clear repeat and dedup caps',async()=>{
  const query='obstacles',initial=[...Array.from({length:21},(_,i)=>'older-'+i),query,query];
  const h=harness({initial,bundled});await settle();assert.equal(h.els.searchHistoryBox.querySelectorAll('.sh-tag').length,10);
  h.submit(query);await settle();assert.ok(h.visible());assert.equal(h.cards().length,1);const request=h.state().activeSearchRequest;
  h.clear();await settle();assert.equal(h.state().activeSearchRequest,request+1);assert.equal(h.state().activeContinuation,null);assert.equal(h.state().lastSearchResults.length,0);assert.equal(h.visible(),false);assert.equal(h.els.searchInput.value,'');assert.equal(new URL(h.window.location.href).searchParams.has('q'),false);
  assert.deepEqual(h.history(),[query,...initial.filter(x=>x!==query)].slice(0,20));assert.equal(h.els.searchHistoryBox.querySelectorAll('.sh-tag').length,10);
  await recall(h,query,bundled?'bundled-clear-recall':'isolated-clear-recall');assert.ok(h.visible());assert.equal(h.cards().length,1);h.clear();await settle();await recall(h,query,bundled?'bundled-repeat':'isolated-repeat');assert.ok(h.visible());assert.equal(h.history().filter(q=>q===query).length,1);
});
test('ISOLATED full-init component-first registration preserves recall contract',async()=>{
  const h=harness({initial:['obstacles'],reverse:true});await recall(h,'obstacles','component-first');assert.ok(h.visible());assert.equal(h.cards().length,1);
});
test('ASTRO/ESBUILD MODULE full-init preserves narrowed options and filters',async()=>{
  const h=harness({initial:['obstacles'],bundled:true,selected:[true,false],options:{searchType:'exact',proximity:9}});h.window.enhancedSearch.getState().filters.author='retained';await recall(h,'obstacles','bundled-narrowed');assert.equal(h.searchEvents().at(-1).detail.filters.author,'retained');assert.deepEqual(h.searchEvents().at(-1).detail.advancedOptions.books,[DOC1.c]);assert.equal(new URL(h.window.location.href).searchParams.get('searchType'),'exact');assert.ok(h.visible());
});
test('ISOLATED full-init recalled held document settles after Clear without redraw',async()=>{
  const h=harness({initial:['obstacles'],held:true});await recall(h,'obstacles','held-before-clear');assert.equal(h.els.loading.classList.contains('hidden'),false);assert.ok(h.calls.some(c=>c.path.includes('/docs/')));h.clear();const request=h.state().activeSearchRequest;h.release();await settle();assert.equal(h.state().activeSearchRequest,request);assert.equal(h.state().activeContinuation,null);assert.equal(h.state().lastSearchResults.length,0);assert.equal(h.visible(),false);assert.equal(h.els.loading.classList.contains('hidden'),true);saveReceipt(h,'held-after-clear');
});
test('KNOWN serialization limits unchanged: entities decode; raw JSON exact; no universal acceptance',async()=>{
  const query='&amp; "obstacles"',h=harness({initial:[query]});await settle();const btn=h.els.searchHistoryBox.querySelectorAll('.sh-tag')[0];assert.equal(h.history()[0],query);assert.equal(btn.dataset.q,'& "obstacles"');assert.equal(btn.textContent,'& "obstacles"');saveReceipt(h,'known-serialization-limit',{notSerializationAcceptance:true});
});
