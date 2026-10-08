import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(process.env.READER_ARRIVAL_SOURCE || new URL('../public/reader-script.js',import.meta.url),'utf8');
const start=source.indexOf('function scrollToReaderArrival(');
const end=source.indexOf('// --- Segment Permalink Buttons ---',start);
assert.ok(start>=0 && end>start);
function rig({ready='loading',search='?q=joy',matched=true,fonts=true}={}) {
  const calls=[],frames=[],timers=[],listeners=new Map();
  let resolveFonts,rejectFonts;
  const fontPromise=new Promise((resolve,reject)=>{resolveFonts=resolve;rejectFonts=reject;});
  const match={scrollIntoView:options=>calls.push({target:'match',...options})};
  const target={id:'seg-10',style:{},querySelector:()=>matched?match:null,scrollIntoView:options=>calls.push({target:'segment',...options})};
  const window={location:{search,hash:'#seg-10'},addEventListener(type,fn,options){const entries=listeners.get(type)||[];entries.push({fn,options});listeners.set(type,entries);},removeEventListener(type,fn){listeners.set(type,(listeners.get(type)||[]).filter(e=>e.fn!==fn));}};
  const document={readyState:ready,getElementById:()=>target,querySelector:()=>target,...(fonts?{fonts:{ready:fontPromise}}:{})};
  const ctx=vm.createContext({window,document,URLSearchParams,Promise,setTimeout:(fn,delay)=>timers.push({fn,delay}),requestAnimationFrame:fn=>frames.push(fn)});
  vm.runInContext(source.slice(start,end),ctx);
  const emit=type=>{for(const e of [...listeners.get(type)||[]]){if(e.options?.once)window.removeEventListener(type,e.fn);e.fn();}};
  const flush=async()=>{await Promise.resolve();await Promise.resolve();while(frames.length)frames.shift()();};
  const clean=()=>assert.equal(['wheel','touchstart','pointerdown','keydown','pagehide','load'].reduce((n,k)=>n+(listeners.get(k)||[]).length,0),0);
  const schedule=kind=>{
    const marker=kind==='init'?'// Scroll to segment from URL hash':'// Scroll to fragment on load';
    const from=source.indexOf(marker),to=kind==='init'?source.indexOf('    setupSourceRefs();',from):source.indexOf('\n  }\n\n  // --- Font Notification',from);
    assert.ok(from>=0&&to>from);vm.runInContext(source.slice(from,to),ctx);
  };
  const runStartup=()=>{for(const t of timers.filter(t=>t.delay===300))t.fn();};
  return {calls,window,target,emit,flush,clean,resolveFonts,rejectFonts,schedule,runStartup,arrive:()=>ctx.scrollToReaderArrival(target)};
}
test('startup waits for load AND fonts then corrects native fragment restoration',async()=>{
  const r=rig();r.arrive();assert.equal(r.calls.length,1);await r.flush();assert.equal(r.calls.length,1);
  r.emit('load');await r.flush();assert.equal(r.calls.length,1);r.resolveFonts();await r.flush();
  assert.deepEqual(r.calls.at(-1),{target:'match',behavior:'instant',block:'center'});assert.equal(r.calls.length,2);r.clean();
});
test('already-loaded startup still waits for font geometry',async()=>{
  const r=rig({ready:'complete'});r.arrive();await r.flush();assert.equal(r.calls.length,1);r.resolveFonts();await r.flush();assert.equal(r.calls.length,2);r.clean();
});
for(const event of ['wheel','touchstart','pointerdown','keydown','pagehide']) test(`${event} cancels the late correction`,async()=>{
  const r=rig();r.arrive();r.emit(event);r.emit('load');r.resolveFonts();await r.flush();assert.equal(r.calls.length,1);r.clean();
});
test('changed fragment is never dragged back',async()=>{
  const r=rig();r.arrive();r.window.location.hash='#seg-11';r.emit('load');r.resolveFonts();await r.flush();assert.equal(r.calls.length,1);r.clean();
});
test('repeated startup call schedules only one correction',async()=>{
  const r=rig();r.arrive();r.arrive();r.emit('load');r.resolveFonts();await r.flush();assert.equal(r.calls.filter(c=>c.behavior==='instant').length,1);r.clean();
});
for(const options of [{search:''},{matched:false},{search:'?q='}]) test(`fallback remains segment ${JSON.stringify(options)}`,async()=>{
  const r=rig({...options,ready:'complete',fonts:false});r.arrive();await r.flush();assert.equal(r.calls.at(-1).target,'segment');assert.equal(r.calls.at(-1).behavior,'instant');r.clean();
});
test('failed font promise does not leak interaction listeners',async()=>{
  const r=rig({ready:'complete'});r.arrive();r.rejectFonts(new Error('font unavailable'));await r.flush();assert.equal(r.calls.length,1);r.clean();
});
for(const caller of ['init','segment-links']){
  for(const event of ['wheel','touchstart','pointerdown','keydown','pagehide'])test(`${caller}: input BEFORE 300ms timer cancels all arrival scrolling (${event})`,async()=>{
    const r=rig();r.schedule(caller);assert.equal(r.calls.length,0);r.emit(event);r.runStartup();r.emit('load');r.resolveFonts();await r.flush();assert.equal(r.calls.length,0);r.clean();
  });
  test(`${caller}: actual startup timer still settles without interaction`,async()=>{
    const r=rig();r.schedule(caller);assert.equal(r.calls.length,0);r.runStartup();assert.equal(r.calls.length,1);r.emit('load');r.resolveFonts();await r.flush();assert.equal(r.calls.length,2);assert.equal(r.calls.at(-1).behavior,'instant');r.clean();
  });
}
test('every referencing Astro page closes the immutable script cache',()=>{
  // The integration receipt is not a fixture: inspect all current tracked templates.
  const {stdout,status}=spawnSync('git',['ls-files','src'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
  assert.equal(status,0);let references=0;
  for(const name of stdout.trim().split('\n').filter(n=>n.endsWith('.astro'))){
    const bytes=readFileSync(new URL('../'+name,import.meta.url));if(!bytes.includes(Buffer.from('/reader-script.js')))continue;
    const urls=bytes.toString().match(/\/reader-script\.js(?:\?v=[^"\s<>]+)?/g)||[];
    for(const url of urls){assert.equal(url,'/reader-script.js?v=reader-arrival-20261008-r1',name);references++;}
  }
  assert.ok(references>0);
});
import {spawnSync} from 'node:child_process';
