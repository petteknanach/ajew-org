// Targeted missing review regressions only. Synthetic DOM/media != native print/PDF acceptance.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,all)=>i%2?a:[...a,[v.replace(/^--/,''),all[i+1]]],[]));
for(const k of ['site','adapter','dom','result'])assert(args[k],`Missing --${k}`);
const {harness}=await import(pathToFileURL(path.resolve(args.adapter)));
const rows=[];
async function test(name,fn){try{await fn();rows.push({name,status:'PASS'});}catch(e){rows.push({name,status:'FAIL',error:e.stack});}fs.writeFileSync(args.result+'.progress',JSON.stringify({completed:rows.length,last:rows.at(-1)},null,2));}
const fresh=(opts={})=>harness({site:path.resolve(args.site),dom:path.resolve(args.dom),...opts});
const action=(m,a)=>m.querySelectorAll('button').find(b=>b.dataset.action===a);
const status=h=>h.c.querySelector('[data-integrity-status]').textContent;
const annotationKey='ajew-qualified-sichos-271280-annotations-v1';
await test('download-scope-exact',async()=>{const h=await fresh({external:false});assert(h.template.includes('The downloads include all forty-one paragraphs of teachings 271–280 with current English translations. Historical archives are comparison only, not replacement English or independent textual authority.'));assert(!h.template.includes('sixty-six selected paragraphs'));});
await test('distinct-range-boundaries',async()=>{const h=await fresh();const r=h.select(0),clone=r.cloneRange();assert.notEqual(r,clone);assert.equal(clone.startContainer,r.startContainer);const before=clone.toString();r.startOffset=1;assert.equal(clone.startOffset,0);assert.equal(clone.toString(),before);assert.notEqual(r.toString(),before);});
for(const move of ['clear','collapse','replace-B','outside','offset','multi-range'])for(const a of ['share','note','save']){
 await test(`obsolete-${move}-${a}`,async()=>{const h=await fresh();h.select(0);const m=h.open();assert(m);const old=h.selection.getRangeAt(0);const clone=old.cloneRange();
 if(move==='clear')h.setSelection(null);
 if(move==='collapse')h.selection.isCollapsed=true;
 if(move==='replace-B')h.select(3);
 if(move==='offset')old.startOffset=1;
 if(move==='multi-range')h.selection.rangeCount=2;
 if(move==='outside'){const n=h.c.querySelector('[data-integrity-status]').childNodes[0];const r=old.cloneRange();r.setStart(n,0);r.setEnd(n,2);h.setSelection({isCollapsed:false,rangeCount:1,anchorNode:n,focusNode:n,getRangeAt:()=>r});}
 assert.equal(clone.startOffset,0);await h.click(action(m,a));assert.equal(h.shared.length,0);assert.equal(h.store.has(annotationKey),false);assert.match(status(h),/blocked/i);
 });
}
for(const move of ['clear','replace-B'])await test(`selectionchange-removes-${move}-menu`,async()=>{const h=await fresh();h.select(0);h.open();if(move==='clear')h.setSelection(null);else h.select(3);await h.fire('selectionchange',h.c);assert(h.c.querySelector('#highlight-context-menu')===null,'obsolete menu must be removed');assert(h.c.querySelectorAll('.sel-btn').every(b=>move!=='clear'||b.disabled));});
for(const backward of [false,true])for(const a of ['share','save','note','pray'])await test(`fresh-${backward?'backward':'forward'}-${a}-actual-events`,async()=>{
 // Capture control is keyboard-activated; only the actual menu mousedown is selection-preserving.
 const h=await fresh();h.select(0,0,{backward});const capture=h.c.querySelector('[data-q-capture]');await h.click(capture);const m=h.c.querySelector('#highlight-context-menu');assert(m);await h.fire('selectionchange',h.c);assert(h.c.querySelector('#highlight-context-menu')===m,'unchanged live selection must retain the same menu');const button=action(m,a);assert((await h.mousedown(button)).defaultPrevented);await h.click(button);
 if(a==='share'){assert.equal(h.shared.length,1);const p=await h.core.authenticateEdition(fs.readFileSync(path.join(args.site,'public/reader/reviewed/sichos-271-280.json')),a=>fs.readFileSync(path.join(args.site,'public',new URL(a.url,'https://ajew.org').pathname)),b=>crypto.createHash('sha256').update(b).digest('hex'));const expected=h.core.fullBodyPayload(p,[p.units[0].owner]);assert.equal(h.shared[0].text,expected.content);}else{const saved=JSON.parse(h.store.get(annotationKey));assert.equal(saved.length,1);assert.equal(saved[0].type,{save:'highlight',note:'note',pray:'prayer'}[a]);assert.equal(saved[0].selection.text,h.fields[0].textContent.slice(0,2));}
 assert(h.c.querySelector('#highlight-context-menu')===null,'obsolete menu must be removed');
});
await test('search-to-capture-source-authority',async()=>{const h=await fresh();const input=h.c.querySelector('[data-reader-query]');input.value=h.fields[0].textContent.slice(0,8);input.events.input();assert(h.fields[0].querySelector('mark'));h.select(0);const m=h.open();assert(m);await h.click(action(m,'share'));assert.equal(h.shared.length,1);assert.match(status(h),/Shared/);});
for(const state of ['absent','delayed'])for(const marker of ['true','missing','unknown'])for(const note of ['local','global'])for(const trigger of ['beforeprint','media'])await test(`early-${state}-${marker}-${note}-${trigger}`,async()=>{
 const h=await fresh({external:state==='delayed',delayed:state==='delayed'});h.c.dataset.sourceExactReady='true';if(marker==='missing')delete h.c.dataset.printSafe;else h.c.dataset.printSafe=marker;
 if(state==='absent')h.context.window.QualifiedSichos271280IntegrityReady=()=>true;
 h.c.querySelector(note==='local'?'[data-qualification]':'[data-global-qualification]').remove();h.setPrinting(true);if(trigger==='media')await h.media(true);else await h.windowEvent('beforeprint');assert.equal(h.c.dataset.printSafe,'false');assert.match(status(h),/blocked/i);
 if(state==='delayed'){assert.equal(await h.finishLoading(),false);assert.equal(h.c.dataset.printSafe,'false');}
});
await test('early-rejects-mutable-fake-gate',async()=>{const h=await fresh({external:false});h.context.window.QualifiedSichos271280PrintGate=()=>true;h.c.dataset.printSafe='true';h.setPrinting(true);await h.windowEvent('beforeprint');assert.equal(h.c.dataset.printSafe,'false');});
for(const trigger of ['beforeprint','media'])await test(`loaded-genuine-${trigger}-afterprint`,async()=>{const h=await fresh();const d=Object.getOwnPropertyDescriptor(h.context.window,'QualifiedSichos271280PrintGate');assert.equal(d.writable,false);assert.equal(d.configurable,false);assert.throws(()=>{h.context.window.QualifiedSichos271280PrintGate=()=>true},TypeError);const history=h.c.querySelectorAll('[data-owner-history]'),before=history.map(n=>n.open);h.setPrinting(true);if(trigger==='media')await h.media(true);else await h.windowEvent('beforeprint');assert.equal(h.c.dataset.printSafe,'true');assert(history.every(n=>n.open));await h.windowEvent('afterprint');assert.equal(h.c.dataset.printSafe,'false');assert.deepEqual(history.map(n=>n.open),before);});
for(const mutation of ['source','local-note','global-note','history','invisible-ink'])await test(`prior-admission-then-${mutation}-direct-denied`,async()=>{const h=await fresh();h.setPrinting(true);await h.windowEvent('beforeprint');assert.equal(h.c.dataset.printSafe,'true');if(mutation==='source')h.fields[0].textContent+='X';if(mutation==='local-note')h.c.querySelector('[data-qualification]').remove();if(mutation==='global-note')h.c.querySelector('[data-global-qualification]').remove();if(mutation==='history')h.c.querySelector('[data-history-field]').textContent+='X';if(mutation==='invisible-ink')h.color.color='rgba(0, 0, 0, 0)';h.c.dataset.sourceExactReady='true';h.c.dataset.printSafe='true';await h.windowEvent('beforeprint');assert.equal(h.c.dataset.printSafe,'false');assert.match(status(h),/blocked/i);});
await test('loaded-screen-media-denied',async()=>{const h=await fresh();h.setPrinting(false);await h.windowEvent('beforeprint');assert.equal(h.c.dataset.printSafe,'false');});
await test('media-exit-resets-history',async()=>{const h=await fresh();const history=h.c.querySelectorAll('[data-owner-history]'),before=history.map(n=>n.open);await h.media(true);assert.equal(h.c.dataset.printSafe,'true');await h.media(false);assert.equal(h.c.dataset.printSafe,'false');assert.deepEqual(history.map(n=>n.open),before);});
await test('default-deny-css-absent-unknown-warning',async()=>{const h=await fresh({external:false});const css=h.template.match(/<style is:global>([\s\S]*?)<\/style>/)[1];const hidden=/\.qualified-sichos-271280:not\(\[data-print-safe=true\]\)\s*>\s*\*\s*\{\s*display:none!important;\s*\}/;const warning=/\.qualified-sichos-271280:not\(\[data-print-safe=true\]\)\s*>\s*\.qualified-print-warning\s*\{\s*display:block!important;\s*\}/;assert(hidden.test(css));assert(warning.test(css));for(const marker of [undefined,'unknown','false','true']){const deny=marker!=='true';assert.equal(deny,marker===undefined||marker==='unknown'||marker==='false');}assert(css.includes('white-space:break-spaces!important'));assert(css.includes('-webkit-text-fill-color:rgb(0,0,0)!important'));});
const report={schema:'sichos-three-review-targeted/v1',site:path.resolve(args.site),adapter:path.resolve(args.adapter),dom:path.resolve(args.dom),status:rows.every(r=>r.status==='PASS')?'PASS':'FAIL',counts:{total:rows.length,passed:rows.filter(r=>r.status==='PASS').length,failed:rows.filter(r=>r.status==='FAIL').length},cases:rows,nativePrintAcceptance:false,old32CoreControlsReplayed:false};
fs.writeFileSync(args.result,JSON.stringify(report,null,2)+'\n');if(report.status!=='PASS')process.exitCode=1;
