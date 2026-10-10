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

// Adapted from unchanged test-search-history-recall.mjs. Portable dependencies
// resolve with createRequire(import.meta.url), without NODE_PATH. Override ONLY
// the page under test with SEARCH_HISTORY_SOURCE; full scripts stay isolated.
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
  const row={label,topology:h.topology,sourceSHA256:digest(source),componentSHA256:digest(component),fixtureSHA256:digest(fixtureSource),fixture:'DOC1/LM source-bound slices from frozen inherited fixture; synthetic two-document transport/postings; NOT live or fabricated Torah',calls:h.calls,publicCalls:h.publicCalls,rawHistory:h.rawHistory(),parsedButtons:h.els.searchHistoryBox.querySelectorAll('.sh-tag').map(b=>({textContent:b.textContent,dataQ:b.dataset.q,descendants:all(b.node).filter(n=>n!==b.node&&n.tagName).map(n=>n.tagName),attributes:b.node.attrs})),dispatches:h.dispatched,errors:h.errors,state:json(h.window.enhancedSearch.getState()),page:json(h.state()),href:h.window.location.href,history:h.history(),...extra};
  if(process.env.TEST_EVIDENCE_DIR){const dir=process.env.TEST_EVIDENCE_DIR;mkdirSync(dir,{recursive:true});const id=String(++receiptId).padStart(2,'0');writeFileSync(dir+'/'+id+'-'+label+'.json',JSON.stringify(row,null,2)+'\n');writeFileSync(dir+'/'+id+'-'+label+'-history.html',h.els.searchHistoryBox.innerHTML);writeFileSync(dir+'/'+id+'-'+label+'-results.html',h.els.resultsList.innerHTML);}
  return row;
}
function harness({initial=[],selected=[true,true],options={},bundled=false,held=false,reverse=false,urlQuery=null}={}) {
  const els=Object.fromEntries(['welcomeMessage','loading','resultsContainer','resultsList','resultsCount','noResults','noResultsMessage','clearResults','copySearchLink','resultsSection','searchInput','searchHistoryBox','search-book-labels','searchForm'].map(id=>[id,new Element({hidden:['loading','resultsContainer','noResults'].includes(id)})]));
  els['search-book-labels'].textContent=JSON.stringify({[DOC1.c]:DOC1.c,[LM.c]:LM.c});
  const boxes=selected.map((checked,i)=>Object.assign(new Element(),{value:docs[i].c,checked}));
  const events=new Map(),calls=[],errors=[],timers=new Map(),dispatched=[],storage=new Map([['ajew-search-history',JSON.stringify(initial)]]);
  let timerId=0,release,holding=held;
  const waiting=new Promise(resolve=>release=resolve);
  const document={getElementById:id=>els[id]||null,createElement:()=>new Element(),querySelectorAll:selector=>{if(selector==='input[name="searchBook"]')return boxes;if(selector==='input[name="searchBook"]:checked')return boxes.filter(b=>b.checked);return [];},addEventListener:(type,fn)=>{const a=events.get(type)||[];a.push(fn);events.set(type,a);},dispatchEvent:event=>{dispatched.push({type:event.type,detail:event.detail?json(event.detail):null});for(const fn of events.get(event.type)||[])fn(event);return true;}};
  const publicCalls=[];
  const window={location:{origin:'https://fixture.invalid',search:'?nojev=1&keep=original',href:'https://fixture.invalid/search-enhanced?nojev=1&keep=original'},history:{replaceState:(_,__,url)=>{window.location.href=String(url);window.location.search=new URL(window.location.href).search;}}};
  if(urlQuery!==null){const u=new URL(window.location.href);u.searchParams.set('q',urlQuery);window.location.href=String(u);window.location.search=u.search;}
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
  // Empty synthetic options after URL readiness would resubmit through the
  // ordinary form producer and erase the raw URL-init checkpoint. Do not inject
  // that unrelated event into URL-init cases; actual checkUrlParameters runs.
  if(urlQuery===null || Object.keys(options).length)document.dispatchEvent({type:'advanced-search-options',detail:options});
  const publicSearch=window.enhancedSearch.search;
  window.enhancedSearch.search=function(...args){publicCalls.push({input:els.searchInput.value});return publicSearch.apply(this,args);};
  assert.equal(window.searchState,undefined,'no global component-private searchState');
  return {els,window,calls,errors,dispatched,boxes,publicCalls,rawHistory:()=>storage.get('ajew-search-history'),topology:bundled?'actual Astro extraction + esbuild distinct modules':'separate IIFEs per complete extracted script (never shared top-level bindings)',history:()=>JSON.parse(storage.get('ajew-search-history')),state:()=>window.__recallState(),submit:q=>{els.searchInput.value=q;els.searchForm.fire('submit',{preventDefault(){}});},clear:()=>els.clearResults.fire('click'),release:()=>{holding=false;release();},searchEvents:()=>dispatched.filter(e=>e.type==='enhanced-search'),visible:()=>!els.resultsContainer.classList.contains('hidden'),cards:()=>all(els.resultsList.fragment).filter(n=>cls(n,'result-item'))};
}

// Actual compiler extraction corroborates the full-init isolated model. No
// full-site build, browser, provider or network; output retained when requested.
const extracted=[];
for(const [name,bytes,path]of [['page',source,sourcePath],['component',component,componentPath]]){
  const transformed=await compiler.transform(bytes,{filename:String(path)});
  const scripts=transformed.scripts.filter(s=>s.type==='inline');assert.equal(scripts.length,1);assert.equal(scripts[0].code.trim(),extract(bytes).trim());extracted.push(scripts[0].code);
  if(process.env.TEST_EVIDENCE_DIR){mkdirSync(process.env.TEST_EVIDENCE_DIR,{recursive:true});writeFileSync(process.env.TEST_EVIDENCE_DIR+'/compiler-'+name+'.json',JSON.stringify(transformed,null,2)+'\n');}
}
const moduleResult=await esbuild.build({stdin:{contents:'import "page-client"; import "component-client";',resolveDir:new URL('../src/pages/',import.meta.url).pathname,sourcefile:'history-serialization-isolated-modules.ts'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',treeShaking:false,metafile:true,plugins:[{name:'actual-compiler-extracted-modules',setup(build){build.onResolve({filter:/^(page|component)-client$/},a=>({path:a.path,namespace:'recall-client'}));build.onLoad({filter:/.*/,namespace:'recall-client'},a=>({contents:a.path==='page-client'?inject(extracted[0]):extracted[1],loader:'ts',resolveDir:new URL('../src/pages/',import.meta.url).pathname}));}}]});
const bundleCode=moduleResult.outputFiles[0].text;
if(process.env.TEST_EVIDENCE_DIR){writeFileSync(process.env.TEST_EVIDENCE_DIR+'/actual-module-bundle.js',bundleCode);writeFileSync(process.env.TEST_EVIDENCE_DIR+'/actual-module-metafile.json',JSON.stringify(moduleResult.metafile,null,2)+'\n');}

// Apparatus-only observations are removed by exact string substitution; imports
// are supplied unchanged in the IIFE model and remain actual imports in the
// compiler-extracted esbuild bundle. No component lexical global is supplied.
assert.ok(!/window\.searchState\s*=/.test(bundleCode),'private component state not exported');
if(process.env.TEST_EVIDENCE_DIR){writeFileSync(process.env.TEST_EVIDENCE_DIR+'/apparatus.json',JSON.stringify({sourcePath:String(sourcePath),sourceSHA256:digest(source),componentSHA256:digest(component),fixtureSHA256:digest(fixtureSource),importSupply:imported,observer,inverseObserver:true,wrappers:'one complete script per IIFE; never shared lexical state',moduleBundle:'exact compiler script extraction with actual library imports, observer only',transport:'synthetic DOC1/LM slice meta/postings; rejects nonfixture/provider/network',storage:'fresh in-memory Map per init',clear:'stored fixture handlers only, not trusted/native/browser',unicode:'bounded executed inputs only, not CR/NUL/surrogate/universal proof'},null,2)+'\n');}
const cases=[
 ['ordinary','obstacles'],['quoted','"obstacles"'],['pointed-DOC1-slice',DOC1.h],
 ['harmless-markup','<b>obstacles</b>'],
 ['literal-named-entities','obstacles &amp; &quot; &lt;b&gt; &apos;'],
 ['literal-numeric-entities','obstacles &#34; &#x26; &#60;'],
 ['literal-ampersand-quotes',`obstacles & "quoted" 'single' > <`],
 ['raw-padding-entity','  obstacles &amp;  '],
];
function buttons(h){return h.els.searchHistoryBox.querySelectorAll('.sh-tag');}
function literalButton(btn,expected){
 assert.ok(btn,'actual parsed button exists');
 assert.equal(btn.textContent,expected,'HTML5 textContent preserves exact literal');
 assert.equal(btn.dataset.q,expected,'HTML5 data-q preserves exact literal');
 assert.equal(all(btn.node).filter(n=>n!==btn.node&&n.tagName).length,0,'no unexpected element descendants');
 assert.deepEqual(btn.node.attrs.map(a=>a.name).sort(),['class','data-q'],'no unexpected attributes');
 assert.equal((btn.handlers.get('click')||[]).length,1,'one listener on parsed node');
}
async function positive(h,label){
 h.submit('obstacles');await settle();assert.equal(h.errors.length,0);
 assert.ok(h.visible(),'genuine full-init ordinary form positive');assert.equal(h.cards().length,1);
 saveReceipt(h,label+'-positive',{ordinaryControl:true,notLive:true});
}
function clearVisibleFixture(h,label){
 assert.ok(h.visible(),'Clear only after positive, never hidden no-results');
 const retained=h.rawHistory();h.clear();assert.equal(h.rawHistory(),retained,'Clear retains exact JSON');
 assert.equal(h.els.searchInput.value,'');assert.equal(new URL(h.window.location.href).searchParams.has('q'),false);
 saveReceipt(h,label+'-fixture-clear',{clearInvocation:'synthetic stored event handler after positive; NOT trusted browser/physical device'});
}
async function clickAndObserve(h,btn,expected,label){
 const before=h.state().activeSearchRequest,events=h.searchEvents().length,calls=h.publicCalls.length;
 assert.ok(buttons(h).includes(btn),'same HTML5-parsed node wrapper');
 let error=null;try{btn.fire('click');}catch(e){error={name:e.name,message:e.message};}await settle();
 const producerQuery=expected.trim();
 const expectedHistory=[producerQuery,...h._beforeHistory.filter(q=>q!==producerQuery)].slice(0,20);
 saveReceipt(h,label,{expectedLiteral:expected,expectedProducerQuery:producerQuery,beforeRequest:before,beforeEvents:events,beforePublicCalls:calls,recallError:error,expectedHistory});
 // Drive original RED too before the literal oracle: its actual decoded input,
 // event, component state, URL, generation and raw JSON are durably observed.
 assert.equal(error,null);literalButton(btn,expected);
 assert.equal(h.els.searchInput.value,expected,'raw data-q assignment unchanged');
 assert.equal(h.publicCalls.length,calls+1,'one public component call');assert.equal(h.publicCalls.at(-1).input,expected);
 assert.equal(h.searchEvents().length,events+1,'one enhanced-search event');
 assert.equal(h.searchEvents().at(-1).detail.query,producerQuery,'only actual upstream producer trim');
 assert.equal(h.state().activeSearchRequest,before+1,'one page request generation');
 assert.equal(h.window.enhancedSearch.getState().query,producerQuery);
 assert.equal(new URL(h.window.location.href).searchParams.get('q'),producerQuery);
 assert.deepEqual(h.history(),expectedHistory,'exact JSON/dedup/order/cap');
 assert.equal(h.rawHistory(),JSON.stringify(expectedHistory),'JSON not encoded/entity-decoded');
 assert.equal(h.errors.length,0);assert.equal(h.calls.some(c=>/jev|https?:/.test(c.path)),false);
}
for(const bundled of [false,true]){
 const topology=bundled?'ASTRO/ESBUILD distinct modules':'ISOLATED full-script wrappers';
 for(const [label,raw]of cases){
  test(topology+' initial persisted literal + actual recall: '+label,async()=>{
   const control=harness({bundled});await positive(control,label+'-init-control');
   const h=harness({initial:[raw],bundled});await settle();
   assert.equal(h.rawHistory(),JSON.stringify([raw]));assert.equal(buttons(h).length,1);
   const btn=buttons(h)[0];h._beforeHistory=h.history();await clickAndObserve(h,btn,raw,label+'-init-recall');
  });
  test(topology+' normal form save + positive Clear render + recall: '+label,async()=>{
   const h=harness({bundled});await positive(h,label+'-save-control');clearVisibleFixture(h,label+'-save-control');
   h.submit(raw);await settle();const query=raw.trim();
   assert.equal(h.els.searchInput.value,raw);assert.equal(h.history()[0],query,'actual form trim');
   assert.equal(h.window.enhancedSearch.getState().query,query);assert.equal(h.searchEvents().at(-1).detail.query,query);
   assert.equal(new URL(h.window.location.href).searchParams.get('q'),query);
   // Use a real ordinary positive before invoking its Clear fixture, not a
   // hidden no-results button. Retained literals then render on welcome.
   await positive(h,label+'-render-control');clearVisibleFixture(h,label+'-render');await settle();
   const expected=[...new Set(['obstacles',query])];assert.deepEqual(h.history(),expected);
   assert.equal(buttons(h).length,expected.length);const btn=buttons(h)[h.history().indexOf(query)];
   h._beforeHistory=h.history();await clickAndObserve(h,btn,query,label+'-saved-recall');
  });
 }
 test(topology+' entity vs literal exact dedup remains distinct',async()=>{
  const h=harness({initial:['obstacles &','obstacles &amp;'],bundled});await settle();saveReceipt(h,'distinct-init');
  assert.equal(buttons(h).length,2);buttons(h).forEach((b,i)=>literalButton(b,h.history()[i]));
  for(const raw of ['obstacles &amp;','obstacles &']){
   const btn=buttons(h).find(b=>b.dataset.q===raw);h._beforeHistory=h.history();await clickAndObserve(h,btn,raw,'distinct-recall');
   await positive(h,'distinct-render');clearVisibleFixture(h,'distinct-render');await settle();
   assert.equal(h.history().filter(q=>q==='obstacles &amp;').length,1);assert.equal(h.history().filter(q=>q==='obstacles &').length,1);
  }
 });
 test(topology+' init raw23, save20/render10/order exact, Clear retained',async()=>{
  const initial=[...Array.from({length:21},(_,i)=>'older-'+i),'obstacles','obstacles'];
  const h=harness({initial,bundled});await settle();assert.deepEqual(h.history(),initial,'init has no save cap');
  assert.equal(buttons(h).length,10);buttons(h).forEach((b,i)=>literalButton(b,initial[i]));
  await positive(h,'cap-save');const expected=['obstacles',...initial.filter(q=>q!=='obstacles')].slice(0,20);
  assert.deepEqual(h.history(),expected);assert.equal(h.history().length,20);clearVisibleFixture(h,'cap-render');await settle();
  assert.equal(buttons(h).length,10);buttons(h).forEach((b,i)=>literalButton(b,expected[i]));
  h._beforeHistory=h.history();await clickAndObserve(h,buttons(h)[0],'obstacles','cap-recall');
 });
 test(topology+' genuine URL init raw whitespace vs form trim',async()=>{
  const raw='  obstacles &amp;  ',h=harness({bundled,urlQuery:raw});await settle();
  assert.equal(h.els.searchInput.value,raw);assert.equal(h.window.enhancedSearch.getState().query,raw);
  assert.equal(new URL(h.window.location.href).searchParams.get('q'),raw);assert.equal(h.history()[0],raw,'actual URL readiness stores raw');
  assert.equal(h.dispatched.filter(e=>e.type==='enhanced-search-ready').length,1);assert.equal(h.state().activeSearchRequest,1);
  saveReceipt(h,'raw-url-init',{producer:'actual checkUrlParameters + enhanced-search-ready, not injected event'});
  await positive(h,'url-render');clearVisibleFixture(h,'url-render');await settle();
  const btn=buttons(h)[h.history().indexOf(raw)];h._beforeHistory=h.history();await clickAndObserve(h,btn,raw,'raw-url-recall');
  assert.ok(h.history().includes(raw)&&h.history().includes(raw.trim()),'raw URL vs form-trimmed distinct');
 });
}
