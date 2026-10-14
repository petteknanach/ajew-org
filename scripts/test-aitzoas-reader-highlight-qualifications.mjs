// Actual v2 callback regression supplement; imports/runs all 16 original cases.
// Qualified actual SSR + HTML5/event/Range fixture, NOT native/full initialization.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {setup, functions, v2Raw, output, sha} from './test-aitzoas-reader-qualifications.mjs';
const bodies=functions(v2Raw,['setupHighlighting','showHighlightContext','handleHighlightAction','saveHighlight','shareHighlight','getTorahSource','showToast']);
const actions=['save','note','pray','share'];
const kinds=['warning-only','mixed-forward','mixed-reverse','spanning','multi-range'];
const observations=[];
function init(options){const s=setup(options);for(const body of Object.values(bodies))vm.runInContext(body,s.context);vm.runInContext("const HIGHLIGHTS_KEY='ajew-highlights'; setupHighlighting();",s.context);s.context.prompt=()=> 'fixture note';return s;}
const source=s=>s.document.querySelector('#seg-152 .segment-he p');
function unsafe(s,kind,{notify=true}={}){const p=source(s),w=s.warning.querySelector('p');if(kind==='warning-only')s.select(w,w,{notify});else if(kind==='mixed-forward')s.select(w,p,{notify});else if(kind==='mixed-reverse')s.select(w,p,{reverse:true,notify});else if(kind==='spanning')s.select(s.document.querySelector('.reader-header h1'),p,{reverse:true,notify});else s.select(p,p,{ranges:[s.range(p,p),s.range(w,w)],notify});}
function state(s,key){const stored=JSON.parse(s.localStorage.getItem('ajew-highlights')||'[]');const row={key,stored,shares:[...s.shares],clipboard:[...s.clipboard]};observations.push(row);return row;}
function assertNoExport(s,key){const row=state(s,key);assert.equal(row.stored.length,0,'unsafe highlight must not store source-attributed text');assert.equal(row.shares.length,0,'unsafe highlight must not native-share');assert.equal(row.clipboard.length,0,'unsafe highlight must not attributed clipboard-share');}
function invoke(s,gesture){s.dispatch(gesture,source(s));if(gesture==='touchstart')s.flush();return s.document.getElementById('highlight-context-menu');}
function actIfPresent(menu,action){if(menu)menu.querySelector(`[data-action="${action}"]`).click();}
for(const kind of kinds)for(const gesture of ['dblclick','touchstart'])test(`${kind}: actual v2 ${gesture} Save/Note/Prayer/Share exclude qualification`,()=>{
 for(const action of actions){const s=init();unsafe(s,kind);actIfPresent(invoke(s,gesture),action);assertNoExport(s,`${kind}-${gesture}-${action}`);}
});
for(const kind of kinds)test(`delayed 800ms safe touch -> ${kind} before callback, all actual highlight actions blocked`,()=>{
 for(const action of actions){const s=init();s.select(source(s));s.dispatch('touchstart',source(s));unsafe(s,kind,{notify:false});s.flush();actIfPresent(s.document.getElementById('highlight-context-menu'),action);assertNoExport(s,`pending-${kind}-${action}`);}
});
// Exercise exact menu producer directly to retain the unsafe cached-text closure,
// even where capture prevents the normal invocation. This is an adversarial
// queued-producer fixture, not a claimed second public API or trusted event.
for(const later of ['safe','empty'])for(const kind of kinds)test(`cached ${kind} menu -> current ${later} cannot legitimize cached warning`,()=>{
 for(const action of actions){const s=init();unsafe(s,kind,{notify:false});s.context.cachedSelection=s.getSelection();vm.runInContext('showHighlightContext(cachedSelection.toString().trim(),cachedSelection)',s.context);const menu=s.document.getElementById('highlight-context-menu');assert.ok(menu,'exact producer insertion observed');if(later==='safe')s.select(source(s),source(s),{notify:false});else s.clearSelection();menu.querySelector(`[data-action="${action}"]`).click();assertNoExport(s,`cached-${kind}-${later}-${action}`);}
});
test('cached unsafe menu with safe selection on same synchronous stack before microtasks remains rejected',()=>{
 const s=init();unsafe(s,'mixed-reverse',{notify:false});s.context.cachedSelection=s.getSelection();vm.runInContext('showHighlightContext(cachedSelection.toString().trim(),cachedSelection)',s.context);const menu=s.document.getElementById('highlight-context-menu');s.select(source(s),source(s),{notify:false});menu.querySelector('[data-action="share"]').click();assertNoExport(s,'same-stack-no-mutation-delivery');
});
test('mixed highlight native-share clipboard fallback excluded by exact cached producer',()=>{
 const s=init();delete s.context.navigator.share;unsafe(s,'mixed-reverse',{notify:false});s.context.cachedSelection=s.getSelection();vm.runInContext('showHighlightContext(cachedSelection.toString().trim(),cachedSelection)',s.context);s.document.getElementById('highlight-context-menu').querySelector('[data-action="share"]').click();assertNoExport(s,'clipboard-fallback');
});
test('fresh canonical 152/154 both gestures all actions keep exact body/source/URL/note/prayer/share',()=>{
 for(const id of [152,154])for(const gesture of ['dblclick','touchstart'])for(const action of actions){const s=init(),p=s.document.querySelector(`#seg-${id} .segment-he p`),text=s.select(p).toString().trim(),label=vm.runInContext('getTorahSource()',s.context);s.dispatch(gesture,p);if(gesture==='touchstart')s.flush();const menu=s.document.getElementById('highlight-context-menu');assert.ok(menu);assert.notEqual(menu.style.display,'none');menu.querySelector(`[data-action="${action}"]`).click();const row=state(s,`canonical-${id}-${gesture}-${action}`);if(action==='share'){assert.equal(row.shares.length,1);assert.equal(row.shares[0].title,'Torah Quote');assert.equal(row.shares[0].text,`"${text}"\n\n— ${label}\najew.org`);}else{assert.equal(row.stored.length,1);assert.equal(row.stored[0].text,text);assert.equal(row.stored[0].source,label);assert.equal(row.stored[0].url,s.window.location.pathname);assert.equal(row.stored[0].note,action==='note'?'fixture note':'');assert.equal(row.stored[0].type,action==='pray'?'prayer':'highlight');}}
});
test('safe cached source is not re-bound to newer safe/empty selection; clipboard fallback preserved',()=>{
 for(const later of ['safe','empty'])for(const action of actions){const s=init();delete s.context.navigator.share;const text=s.select(source(s)).toString().trim(),label=vm.runInContext('getTorahSource()',s.context),menu=invoke(s,'dblclick');if(later==='safe')s.select(s.document.querySelector('#seg-154 .segment-he p'));else s.clearSelection();menu.querySelector(`[data-action="${action}"]`).click();const row=state(s,`safe-cache-${later}-${action}`);if(action==='share')assert.equal(row.clipboard[0],`"${text}"\n\n— ${label}\najew.org`);else assert.equal(row.stored[0].text,text);}
});
for(const kind of ['missing-boundaries','different-root','detached','getRangeAt-error','intersectsNode-error','zero-ranges'])test(`${kind}: both generic and actual highlight actions fail closed then fresh canonical recovers`,()=>{
 for(const gesture of ['mouseup','dblclick','touchstart']){const s=init(),p=source(s);s.select(p);const sel=s.getSelection(),r=sel.getRangeAt(0);if(kind==='missing-boundaries')sel.getRangeAt=()=>({intersectsNode:()=>false,getBoundingClientRect:r.getBoundingClientRect});else if(kind==='different-root'){const detached=s.document.createElement('p');sel.getRangeAt=()=>({...r,startContainer:detached,endContainer:detached,intersectsNode:()=>false});}else if(kind==='detached')p.remove();else if(kind==='getRangeAt-error')sel.getRangeAt=()=>{throw Error('range fixture');};else if(kind==='intersectsNode-error')sel.getRangeAt=()=>({...r,intersectsNode(){throw Error('intersection fixture');}});else sel.rangeCount=0;s.dispatch(gesture,p);s.flush();s.popup.querySelector('[data-action="mysefer"]').click();actIfPresent(s.document.getElementById('highlight-context-menu'),'save');assert.equal(s.local.size,0);const fresh=s.document.querySelector('#seg-154 .segment-he p');s.select(fresh);s.dispatch('dblclick',fresh);const menu=s.document.getElementById('highlight-context-menu');assert.ok(menu);menu.querySelector('[data-action="save"]').click();assert.equal(JSON.parse(s.localStorage.getItem('ajew-highlights'))[0].text,fresh.textContent.trim());}
});
test('cached canonical range becomes detached after insertion: menu must fail closed',()=>{
 const s=init(),p=source(s);s.select(p);const menu=invoke(s,'dblclick');p.remove();s.select(s.document.querySelector('#seg-154 .segment-he p'),undefined,{notify:false});menu.querySelector('[data-action="save"]').click();assertNoExport(s,'cached-detached-range');
});
test('unknown highlight menu provenance cannot be approved from current safe selection',()=>{
 const s=init();s.select(source(s));const menu=s.document.createElement('div');menu.id='highlight-context-menu';menu.className='highlight-context-menu';menu.innerHTML='<button data-action="save">Save</button>';let calls=0;menu.querySelector('button').addEventListener('click',()=>calls++);s.document.body.insertBefore(menu,null);menu.querySelector('button').click();assert.equal(calls,0);
});
test('helper idempotence preserves body method identity, safe menus and unrelated append behavior',()=>{
 const s=init(),append=s.document.body.appendChild;s.loadHelper();assert.equal(s.document.body.appendChild,append);const el=s.document.createElement('span');assert.equal(s.document.body.appendChild(el),el);assert.equal(el.parentElement,s.document.body);s.select(source(s));const menu=invoke(s,'dblclick');menu.querySelector('[data-action="save"]').click();assert.equal(JSON.parse(s.localStorage.getItem('ajew-highlights')).length,1);
});
test('safe long press touchend/touchmove still cancels actual timer; safe changed selection before timeout allowed',()=>{
 for(const end of ['touchend','touchmove']){const s=init();s.select(source(s));s.dispatch('touchstart',source(s));s.dispatch(end,source(s));s.flush();assert.equal(s.document.getElementById('highlight-context-menu'),null);}
 const s=init();s.select(source(s));s.dispatch('touchstart',source(s));const p=s.document.querySelector('#seg-154 .segment-he p'),text=s.select(p).toString().trim();s.flush();s.document.getElementById('highlight-context-menu').querySelector('[data-action="save"]').click();assert.equal(JSON.parse(s.localStorage.getItem('ajew-highlights'))[0].text,text);
});
test('remaining script segment-ID highlight stores only ID and preserves empty-selection toggle',()=>{
 const raw=fs.readFileSync(new URL('../public/reader-script.js',import.meta.url),'utf8'),body=functions(raw,['setupSegmentHighlight']).setupSegmentHighlight;
 for(const id of [152,154]){const s=init(),pair=s.document.querySelector(`#seg-${id}`);vm.runInContext(body,s.context);vm.runInContext('setupSegmentHighlight()',s.context);s.clearSelection();s.dispatch('dblclick',pair);assert.equal(pair.classList.contains('user-highlighted'),true);const key='ajew-highlights-'+s.document.querySelector('.reader-container').dataset.torahId;assert.deepEqual(JSON.parse(s.localStorage.getItem(key)),[`seg-${id}`]);s.dispatch('dblclick',pair);assert.deepEqual(JSON.parse(s.localStorage.getItem(key)),[]);unsafe(s,'mixed-reverse');s.dispatch('dblclick',pair);assert.deepEqual(JSON.parse(s.localStorage.getItem(key)),[]);}
});
test('canonical all-safe multirange and text-node endpoints remain admitted by every-range validation',()=>{
 for(const textNodes of [false,true]){const s=init(),a=source(s),b=s.document.querySelector('#seg-154 .segment-he p'),p=textNodes?a.firstChild:a,q=textNodes?b.firstChild:b;const text=s.select(p,p,{ranges:[s.range(p,p),s.range(q,q)]}).toString().trim();const menu=invoke(s,'dblclick');assert.ok(menu);menu.querySelector('[data-action="save"]').click();assert.equal(JSON.parse(s.localStorage.getItem('ajew-highlights'))[0].text,text);}
});
test('Selection/root/clone errors are blocked on actual capture paths, plain copy and safe recovery',()=>{
 for(const kind of ['selection-error','root-error','clone-error']){const s=init();s.select(source(s));const original=s.window.getSelection,r=s.getSelection().getRangeAt(0);if(kind==='selection-error')s.window.getSelection=()=>{throw Error('selection fixture');};else if(kind==='root-error')r.startContainer.getRootNode=()=>{throw Error('root fixture');};else r.cloneRange=()=>{throw Error('clone fixture');};s.dispatch('dblclick',source(s));s.dispatch('touchstart',source(s));s.flush();assert.equal(s.document.getElementById('highlight-context-menu'),null);s.popup.querySelector('[data-action="mysefer"]').click();assert.equal(s.local.size,0);s.copy();s.window.getSelection=original;const p=s.document.querySelector('#seg-154 .segment-he p');s.select(p);s.dispatch('dblclick',p);s.document.getElementById('highlight-context-menu').querySelector('[data-action="save"]').click();assert.equal(JSON.parse(s.localStorage.getItem('ajew-highlights'))[0].text,p.textContent.trim());}
});
test('no-warning and foreign-route helper does not wrap body or impede actual canonical highlighting',()=>{
 for(const options of [{withoutWarning:true},{foreignRoute:true}]){const s=init(options);assert.equal(Object.hasOwn(s.document.body,'appendChild'),false);s.select(source(s));const menu=invoke(s,'dblclick');assert.ok(menu);menu.querySelector('[data-action="save"]').click();assert.equal(JSON.parse(s.localStorage.getItem('ajew-highlights')).length,1);}
});
test('retained detached unsafe cached-menu buttons are blocked on their own capture path',()=>{
 for(const action of actions){const s=init();unsafe(s,'mixed-reverse',{notify:false});s.context.cachedSelection=s.getSelection();vm.runInContext('showHighlightContext(cachedSelection.toString().trim(),cachedSelection)',s.context);const menu=s.document.getElementById('highlight-context-menu');menu.remove();s.select(source(s),source(s),{notify:false});menu.querySelector(`[data-action="${action}"]`).click();assertNoExport(s,`detached-menu-${action}`);}
});
test('foreign pathname departure leaves inherited highlight callbacks unguarded',()=>{
 const s=init();s.window.location.pathname='/reader/another-book/1/4';unsafe(s,'mixed-reverse');const menu=invoke(s,'dblclick');assert.ok(menu);assert.notEqual(menu.style.display,'none');menu.querySelector('[data-action="save"]').click();assert.equal(JSON.parse(s.localStorage.getItem('ajew-highlights')).length,1);
});
process.on('exit',()=>fs.writeFileSync(path.join(output,'highlight-summary.json'),JSON.stringify({assembly:'qualified actual SSR + inherited HTML5/event fixture; exact AST-selected real v2 callbacks; timer scheduling and same-stack adversarial fixtures, NOT native/full init',functionPins:Object.fromEntries(Object.entries(bodies).map(([k,v])=>[k,sha(v)])),observations,runtime:{version:process.version,execArgv:process.execArgv,maxRssKiB:process.resourceUsage().maxRSS}},null,2)));
