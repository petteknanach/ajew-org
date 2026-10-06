#!/usr/bin/env node
'use strict';
// Real source-bound helper and actual reading/study-column renderers. No Astro build.
// node scripts/test-tikkun-qatan-expansion.cjs REPORT_DIR [EVIDENCE_ROOT] [--legacy]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {build,hash}=require('./build-tikkun-qatan-expansion.cjs');
const root=path.resolve(__dirname,'..'),out=process.argv[2],evidence=process.argv[3]||'/mnt/c/Users/Pettek/Ajew-Qatan-Expansion-20261006';
assert(out,'report directory required');fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),copy=x=>JSON.parse(JSON.stringify(x)),load=(s,p)=>vm.runInNewContext(fs.readFileSync(p,'utf8'),s,{filename:p});
const ledger=read('scripts/data/tikkun-qatan-expansion-20261006.json'),legacy=read('scripts/data/tikkun-qatan-occurrences-20261004.json'),p=build();
const box={window:{}},old={window:{}};
load(box,path.join(root,'public/tikkun-boundaries.js'));load(old,path.join(root,'public/tikkun-boundaries.js'));
load(old,path.join(evidence,'parent-inventory/live/tikkun-qatan.js'));
load(box,process.argv.includes('--legacy')?path.join(evidence,'parent-inventory/live/tikkun-qatan.js'):path.join(root,'public/tikkun-qatan.js'));
const rendererBox={module:{exports:{}}};load(rendererBox,path.join(root,'public/tikkun-renderer.js'));
const Q=box.window.TikkunQatanOccurrences,R=rendererBox.module.exports;
const afters={},raws={};let beforeCount=0,afterCount=0,verses=0,painted=0,rejects=0,negativeReading=0;
const has=(v,ti,li)=>v.m.some(m=>m[0]===ti&&m[1]===li&&m[2]==='qk');
for(const slug of Object.keys(ledger.effectiveBookPins)){
 const raw=read('public/reader/medooyuk/'+slug+'.json'),prior=old.window.TikkunQatanOccurrences.applyBook(raw,slug),after=Q.applyBook(raw,slug);raws[slug]=raw;afters[slug]=after;
 const rawJSON=JSON.stringify(raw);assert.equal(hash(Q.applyBook(after,slug)),hash(after));assert.equal(hash(Q.applyBook(prior,slug)),hash(after));
 const selected=ledger.records.filter(r=>r.slug===slug),priorRules=legacy.records.filter(r=>r.slug===slug);
 for(const [c,ch] of Object.entries(raw.ch))for(const [v,b] of Object.entries(ch)){
  const a=after.ch[c][v],pr=prior.ch[c][v],entries=selected.filter(r=>r.chapter===+c&&r.verse===+v);
  assert.equal(JSON.stringify({...a,m:b.m}),JSON.stringify(b),'source fields changed');
  assert.equal(JSON.stringify(a.m),JSON.stringify(pr.m.concat(entries.map(r=>[r.token,r.letter,'qk',0]))),'non-qatan marks changed or occurrence missing');
  beforeCount+=pr.m.filter(m=>m[2]==='qk').length;afterCount+=a.m.filter(m=>m[2]==='qk').length;verses++;
  const html=R.readingVerse(a,{marked:true,mode:'full'});painted+=(html.match(/qk:/g)||[]).length;
  assert.equal(html.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'),R.readingVerse(pr,{marked:true,mode:'full'}).replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"'));
 }
 assert.equal(JSON.stringify(raw),rawJSON,'mutated input');
 const restored=copy(after);for(const [c,ch] of Object.entries(raw.ch))for(const [v,b] of Object.entries(ch))restored.ch[c][v].m=copy(b.m);
 assert.equal(JSON.stringify(restored),rawJSON,'not exact annotation-only inverse');
 const chosen=selected[0];
 for(const change of [b=>delete b.slug,b=>b.slug='unknown',b=>b.slug=Object.keys(ledger.effectiveBookPins).find(x=>x!==slug),b=>b.extra=true,b=>b.ch[chosen.chapter][chosen.verse].t[chosen.token]+='א',b=>b.ch[chosen.chapter][chosen.verse].k[chosen.token]=1,b=>b.ch[chosen.chapter][chosen.verse].m.push([chosen.token,chosen.letter,'qk',0])]){
  const b=copy(raw);change(b);assert.throws(()=>Q.applyBook(b,slug),/source mismatch/);rejects++;
 }
 for(const req of [undefined,'',null,'unknown']){assert.throws(()=>Q.applyBook(raw,req),/source mismatch/);rejects++;}
 for(const n of ledger.negativeControls.filter(r=>r.slug===slug)){
  const v=after.ch[n.chapter][n.verse];assert.equal(v.t[n.token],n.word);assert(!has(v,n.token,n.letter));
  const tokenHTML=R.token(v.t[n.token],v.m.filter(m=>m[0]===n.token),[],{marked:true,mode:'full'});
  const cluster=(v.t[n.token].match(/[א-ת][^א-ת]*/g)||[])[n.letter];
  assert(!new RegExp('data-tk-marks="[^"]*qk:[^"]*"[^>]*>'+cluster.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'<').test(tokenHTML),'gold-gadol painted');negativeReading++;
 }
}
assert.equal(beforeCount,401);assert.equal(afterCount,beforeCount+ledger.records.length);assert.equal(painted,afterCount);
assert(has(afters['tanach-vayikra'].ch[26][38],2,1),'Leviticus 26:38 gold lost');
const ps=read('public/reader/medooyuk/tanach-tehillim.json');assert.equal(Q.applyBook(ps,'tanach-tehillim'),ps);
const rawMarks=read('public/tikkun/column-marks.json'),priorMarks=old.window.TikkunQatanOccurrences.applyColumnMarks(rawMarks),marks=Q.applyColumnMarks(rawMarks),rawJSON=JSON.stringify(rawMarks);
assert.equal(hash(Q.applyColumnMarks(priorMarks)),hash(marks));assert.equal(hash(Q.applyColumnMarks(marks)),hash(marks));assert.equal(Object.keys(marks.rows).length,Q.afterRows);
for(const [k,row] of Object.entries(priorMarks.rows)){
 assert.equal(marks.rows[k][0],row[0]);assert.equal(marks.rows[k][2],row[2]);
 for(const m of row[1])assert(marks.rows[k][1].some(x=>JSON.stringify(x)===JSON.stringify(m)),'old sidecar mark lost');
}
assert.equal(JSON.stringify(rawMarks),rawJSON);
const expectedRows=copy(priorMarks.rows);
for(const r of ledger.records){const ref=`${r.slug}/${r.chapter}/${r.verse}`;const row=expectedRows[r.columnKey]||[r.columnWord,[],ref];row[1].push([r.letter,'qk']);expectedRows[r.columnKey]=row;}
const canonical=x=>Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]]));
assert.equal(JSON.stringify(marks.rows),JSON.stringify(canonical(expectedRows)),'out-of-scope sidecar annotations');
assert.equal(JSON.stringify({schema:marks.schema,sourceSha256:marks.sourceSha256,rows:rawMarks.rows}),rawJSON,'sidecar source metadata changed');
for(const change of [m=>m.extra=true,m=>m.sourceSha256['tanach-bereishit']='0'.repeat(64),m=>m.rows[Object.keys(m.rows)[0]][0]+='א']){const wrong=copy(rawMarks);change(wrong);assert.throws(()=>Q.applyColumnMarks(wrong),/source mismatch/);rejects++;}
// Read generated HTML using a small tag stack; inspect the real ss02 cluster's
// base-letter index rather than a whole-word paint-count approximation.
function words(html){
 const results=new Map();let w=null,depth=0,current=null;
 for(const t of html.match(/<[^>]+>|[^<]+/g)||[]){
  if(t.startsWith('<span')){
   if(t.includes('class="study-word')){w={key:t.match(/data-boundary-key="([^"]+)"/)?.[1],text:'',qk:[],letters:0};depth=1;}
   else if(w){depth++;if(t.includes('ss02'))current={li:w.letters,text:''};}
  }else if(t==='</span>'&&w){
   if(current){w.qk.push(current);current=null;}
   depth--;if(depth===0){results.set(w.key,w);w=null;}
  }else if(!t.startsWith('<')&&w){w.text+=t;const n=(t.match(/[א-ת]/g)||[]).length;w.letters+=n;if(current)current.text+=t;}
 }
 return results;
}
load(box,path.join(root,'public/tikkun-column-display.js'));
Object.assign(box.window.TikkunColumnPointing,read('public/tikkun/column-pointing.json'));
Object.assign(box.window.TikkunColumnNavigation,read('public/tikkun/selection-index.json'));
Object.assign(box.window.TikkunColumnMarks,marks);
const D=box.window.TikkunColumnDisplay,fixed=read('public/tikkun/fixed-columns.json'),allWords=new Map();let columns=0,columnPaint=0,sourceGeometry=0;
function boundaryKey(k){const [c,loc,i]=k.split('/'),[r,gi,si]=loc.split(':').map(Number);let g=si;for(let j=0;j<gi;j++)g+=fixed.pages[c][r-1].g[j].length;return `${c}/${r}/${g}/${i}`;}
for(const c of Object.keys(fixed.pages)){
 const original=R.fixedColumn(fixed.pages[c],+c),html=D.renderStudyColumn(+c,fixed.pages[c],28,true,true,[],true,true);
 assert(!html.includes('pointing-unavailable'),'column mapping rejected');const ws=words(html);for(const [k,w] of ws)allWords.set(k,w);
 columnPaint+=Array.from(ws.values()).reduce((n,w)=>n+w.qk.length,0);columns++;
 assert.equal((html.match(/class="tk-fixed-line/g)||[]).length,fixed.pages[c].length);sourceGeometry+=fixed.pages[c].length;
 Object.assign(box.window.TikkunColumnMarks,rawMarks);assert.equal(R.fixedColumn(fixed.pages[c],+c),original,'Original ink changed');Object.assign(box.window.TikkunColumnMarks,marks);
}
const proof=[];
for(const r of ledger.records.concat(legacy.records)){
 const k=boundaryKey(r.columnKey),w=allWords.get(k);assert(w,'column word absent');assert.equal(w.qk.filter(m=>m.li===r.letter&&m.text.includes('\u05B8')).length,1,'selected occurrence not painted exactly once');
 const v=afters[r.slug].ch[r.chapter][r.verse];assert(has(v,r.token,r.letter));
 const tokenHTML=R.token(v.t[r.token],v.m.filter(m=>m[0]===r.token),[],{marked:true,mode:'full'});let letter=0,readingPaintOnce=0;
 for(const m of tokenHTML.matchAll(/<span[^>]*data-tk-marks="([^"]*)"[^>]*>([^<]*)<\/span>|([^<]+)/g)){
  const text=m[2]||m[3]||'';if(m[1]?.includes('qk:')&&letter===r.letter)readingPaintOnce++;letter+=(text.match(/[א-ת]/g)||[]).length;
 }
 assert.equal(readingPaintOnce,1,'reading occurrence not painted at exact letter');
 proof.push({slug:r.slug,chapter:r.chapter,verse:r.verse,token:r.token,letter:r.letter,columnKey:r.columnKey,readingPaintOnce:true,columnPaintOnce:true});
}
let negativeColumns=0;
for(const n of ledger.negativeControls)if(n.columnKey){const w=allWords.get(boundaryKey(n.columnKey));assert(w);assert(!w.qk.some(m=>m.li===n.letter),'user-gadol fixed-column paint');negativeColumns++;}
// Exercise the builder's independent fail-closed authority controls.
for(const edit of [l=>l.sourcePins['public/tikkun/column-pointing.json']='0'.repeat(64),l=>l.records[0].word+='א',l=>l.records[0].letter=99,l=>l.records[0].columnWord+='א',l=>l.records[0].authority.sourceSha256='0'.repeat(64),l=>l.records[0].authority.sourcePath='wrong-book.json',l=>l.records[0].authority.projectionRef='Gen.1.1',l=>l.records[0].authority.letter=99,l=>l.records[0].authority.atom=l.records[0].authority.atom.replace('\u05C7','\u05B8'),l=>l.records[0].authority.atom+='\u05BD',l=>l.records.push(copy(l.records[0])),l=>l.records[0].slug='unknown',l=>l.negativeControls.push(copy(l.records[0]))]){const l=copy(ledger);edit(l);assert.throws(()=>build(root,l));rejects++;}
// Exact scan adjudication cannot become a generic accent exception.
const scanRecord=ledger.records.find(r=>r.authority.visualAdjudication);assert(scanRecord);
for(const edit of [a=>delete a.visualAdjudication,a=>a.visualAdjudication.imageSha256='0'.repeat(64),a=>a.visualAdjudication.pdfPage=159,a=>a.visualAdjudication.letterIndex=0,a=>a.visualAdjudication.scanSha256='0'.repeat(64)]){
 const l=copy(ledger),r=l.records.find(r=>r.authority.visualAdjudication);edit(r.authority);assert.throws(()=>build(root,l));rejects++;
}
const {spawnSync}=require('node:child_process'),beforeLegacyGuard=fs.readFileSync(path.join(root,'public/tikkun-qatan.js'));
const obsolete=spawnSync(process.execPath,[path.join(root,'scripts/build-tikkun-qatan-supplement.cjs')],{encoding:'utf8'});
assert.equal(obsolete.status,1);assert(obsolete.stderr.includes('Four-only builder superseded'));assert.deepEqual(fs.readFileSync(path.join(root,'public/tikkun-qatan.js')),beforeLegacyGuard);rejects++;
// Selected rows and holds are all occurrence-indexed; no held row is promoted.
const holds=fs.readFileSync(path.join(out,'current-implementation-holds.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
// The initial exclusion queue is immutable historical evidence; three exact
// occurrences were subsequently reviewed and scan-verified. Current holds below
// derive from the sealed independent review, not a silently relabelled old queue.
const parentHolds=[];
for(const held of holds.concat(parentHolds)){const r=held.row||held;assert(!has(afters[r.slug].ch[r.chapter][r.verse],r.tokenIndex,r.letterIndex),'held occurrence promoted');}
const noticeFooter={children:[],appendChild(x){this.children.push(x);}},noticeNode=()=>({children:[],appendChild(x){this.children.push(x);}});
const noticeSandbox={window:{},document:{readyState:'complete',getElementById:id=>noticeFooter.children.find(n=>n.id===id)||null,querySelector:sel=>{assert.equal(sel,'#tk-app .tk-foot');return noticeFooter;},createElement:noticeNode}};
load(noticeSandbox,path.join(root,'public/tikkun-qatan.js'));load(noticeSandbox,path.join(root,'public/tikkun-qatan.js'));
assert.equal(noticeFooter.children.length,1,'duplicate or absent source attribution');const notice=noticeFooter.children[0].children[0];assert.equal(notice.href,'/tikkun/qatan-sources.html');assert(notice.textContent.includes('Hebrew Wikisource')&&notice.textContent.includes('CC BY-SA 4.0'));
(async()=>{
 // Instrument only export visibility; execute the unchanged actual loader/error branch.
 const elems=new Map(),element=()=>({innerHTML:'',value:'',textContent:'',style:{},appendChild(){},setAttribute(){},addEventListener(){}});
 const get=id=>{if(!elems.has(id))elems.set(id,element());return elems.get(id);};let response;
 const app={window:{...box.window,TikkunRenderer:R},document:{readyState:'loading',addEventListener(){},getElementById:get,createElement:element,querySelectorAll:()=>[],querySelector:()=>null},localStorage:{setItem(){},getItem(){return null;}},fetch:async url=>url.includes('/targum/')?{ok:false}:{ok:true,json:async()=>copy(response)}};
 const source=fs.readFileSync(path.join(root,'public/tikkun.js'),'utf8');
 vm.runInNewContext(source.replace('  if (document.readyState', '  window.__qatanTest={loadBook,state,error:()=>readingError};\n  if (document.readyState'),app);
 const A=app.window.__qatanTest;A.state.view='study';let loaderPass=0,loaderRejected=0;
 for(const slug of Object.keys(raws)){
  response=raws[slug];A.state.slug=slug;A.loadBook(slug,1);await new Promise(setImmediate);assert(A.state.data);assert.equal(hash(A.state.data),hash(afters[slug]));assert.equal(A.error(),'');loaderPass++;
  response=copy(raws[slug]);delete response.slug;A.loadBook(slug,1);await new Promise(setImmediate);assert.equal(A.state.data,null);assert(A.error().includes('Could not load'));assert(get('tk-content').innerHTML.includes('Could not load'));loaderRejected++;
 }
 const report={pass:true,sourceBooks:Object.keys(raws).length,verses,existingQatan:beforeCount,addedQatan:ledger.records.length,finalQatan:afterCount,readingPaint:painted,legacyPreserved:legacy.records.length,selectedMappedOnce:proof.length,columns,sourceRows:sourceGeometry,rawColumnRows:Object.keys(rawMarks.rows).length,effectiveLegacyColumnRows:Object.keys(priorMarks.rows).length,expandedColumnRows:Object.keys(marks.rows).length,columnQatanPaint:columnPaint,explicitGadolReadingNegatives:negativeReading,explicitGadolColumnNegatives:negativeColumns,columnNegativeUnavailable:negativeReading-negativeColumns,rejectingControls:rejects,actualLoaderSuccess:loaderPass,actualLoaderFailClosed:loaderRejected,sourceNotice:'single accessible sources/license/change link in tk-foot, outside source ink',heldUnpromoted:holds.length+parentHolds.length,authoritySha256:Q.authoritySha256,sourceFields:'byte-pinned unchanged; annotations only; in-memory inputs immutable',psalms:'untouched',scope:'Semantic compatible occurrence coverage + real transport, not all-qatan completion; no pixel/publication claim'};
 fs.writeFileSync(path.join(out,'occurrence-transport-proof.jsonl'),proof.map(r=>JSON.stringify(r)).join('\n')+'\n');fs.writeFileSync(path.join(out,'test-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
