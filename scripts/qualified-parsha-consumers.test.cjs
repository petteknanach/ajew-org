// Private qualification harness. Bodies/notes are read from digest-pinned real
// source carriers. In-memory projections test consumers, NOT the other worker's
// export, schedule/parsha allocation, a full Astro build, or native browser paint.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const zlib = require('node:zlib'), crypto = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {dependencies, documentFor, sandbox, tick, until} = require('./qualified-parsha-test-dom.cjs');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.QUALIFIED_TEST_EVIDENCE;
assert(OUT && process.env.QUALIFIED_SOURCE_AUTHORITY, 'Explicit private evidence/authority paths required');
const authorityBytes = fs.readFileSync(process.env.QUALIFIED_SOURCE_AUTHORITY);
const authority = JSON.parse(authorityBytes);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const pins = [];
function pinned(key) {const pin=authority[key],b=fs.readFileSync(pin.path);assert.equal(b.length,pin.bytes);assert.equal(sha(b),pin.sha256);pins.push(pin);return JSON.parse(key === 'parent_verified_proof' ? b : zlib.gunzipSync(b));}
const primary=pinned('source_primary'), noteCarrier=pinned('source_notes');
pinned('current_parent_qualified_selection');pinned('parent_verified_proof');
const notes=noteCarrier.notes;
assert(primary.units.every(u=>['main','apparatus','note','apparatus_note'].includes(u.kind)));
// Only the public contract's main/apparatus classification changes; no body does.
const projectedUnits=primary.units.map(u=>({id:u.id,kind:u.kind==='main'?'main':'apparatus',owner_main_id:u.owner_main_id,
  pairs:u.pairs.map(p=>({id:p.id,kind:p.kind,he:p.he,en:p.en})),qualifications:notes.filter(n=>n.owner===u.id)}));
const dataset={schema:'qualified-parsha-chapter-commentary/v1',revision:authority.source_primary.sha256,
  scopeNotice:primary.scope, units:projectedUnits, globalQualifications:notes.filter(n=>n.owner===null)};
function size(dir) {if(!fs.existsSync(dir))return 0;return fs.readdirSync(dir,{withFileTypes:true}).reduce((a,e)=>a+(e.isDirectory()?size(path.join(dir,e.name)):fs.statSync(path.join(dir,e.name)).size),0);}
function save(name,bytes) {bytes=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);const f=path.join(OUT,name);assert(!fs.existsSync(f),'Evidence never overwrites a prior receipt');const budgetRoot=path.dirname(OUT);assert(size(budgetRoot)+bytes.length+262144<=8388608,'Evidence cap/reserve admission');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,bytes);return sha(bytes);}
function source(name) {return fs.readFileSync(path.join(ROOT,name),'utf8');}
function withExport(code,expressions) {const end=code.lastIndexOf('})();');assert(end>0);return code.slice(0,end)+'\nglobalThis.__qa = {'+expressions+'};\n'+code.slice(end);}
function oneFunction(code,name) {const start=code.indexOf('  function '+name+'(');assert(start>=0);const end=code.indexOf('\n  }',start)+4;assert(end>start);return code.slice(start,end);}
function verifyExact(html,{unitSelector,pairSelector,heSelector,enSelector,noteSelector,scope=projectedUnits,expectedNotes=notes}) {
  const doc=documentFor(html), actual=doc.querySelectorAll(unitSelector);assert.equal(actual.length,scope.length);
  assert.deepEqual(actual.map(u=>u.getAttribute('data-source-id')),scope.map(u=>u.id));
  for(let i=0;i<scope.length;i++) {
    const pairs=actual[i].querySelectorAll(pairSelector);assert.equal(pairs.length,scope[i].pairs.length);
    for(let j=0;j<pairs.length;j++){assert.equal(pairs[j].getAttribute('data-pair-id'),scope[i].pairs[j].id);assert.equal(pairs[j].querySelector(heSelector).textContent,scope[i].pairs[j].he);assert.equal(pairs[j].querySelector(enSelector).textContent,scope[i].pairs[j].en);assert.equal(pairs[j].querySelector(enSelector).getAttribute('dir'),'ltr');}
    if(scope[i].kind==='apparatus')assert.equal(actual[i].getAttribute('data-owner-main-id'),'null');
  }
  const found=doc.querySelectorAll(noteSelector);assert.equal(found.length,expectedNotes.length);
  const signatures=a=>a.map(n=>n.id+'\0'+n.text).sort();
  assert.deepEqual(found.map(n=>n.getAttribute('data-note-id')+'\0'+n.querySelector('p').textContent).sort(),signatures(expectedNotes));
  for(const n of found){assert(!n.closest(heSelector));assert(!n.closest(enSelector));assert.equal(n.getAttribute('dir'),'ltr');}
  for(const note of expectedNotes)for(const alias of note.aliases || [])assert(found.some(n=>n.getAttribute('data-note-id')===note.id && n.textContent.includes(alias.id || alias.origin || '')));
  return doc;
}
let compiled, rendered, componentScript;
async function compileComponent() {
  if(compiled)return;
  const compiler=dependencies('@astrojs/compiler'), esbuild=dependencies('esbuild');
  const raw=await compiler.transform(source('src/components/QualifiedParsha.astro'),{filename:'QualifiedParsha.astro'});
  save('QualifiedParsha.raw.mjs',raw.code);
  const runtime=await import(pathToFileURL(dependencies.resolve('astro/runtime/server/index.js')).href);
  assert.equal(runtime.createMetadata,undefined,'Record the installed compiler/runtime ABI gap');
  // Disclosed SSR-only bridge: remove unused metadata and virtual CSS import.
  // No body, selection, pair, note, or markup logic is changed.
  let bridge=raw.code.replace(/,?\s*createMetadata as \$\$createMetadata\n/,'\n')
    .replace(/^import "[^"\n]+\?astro&type=style[^"\n]*";\n/gm,'')
    .replace(/export const \$\$metadata = \$\$createMetadata\([\s\S]*?\n\nconst \$\$Astro/,()=> 'const $$Astro')
    .replace('"astro/runtime/server/index.js"',JSON.stringify(pathToFileURL(dependencies.resolve('astro/runtime/server/index.js')).href));
  assert(!bridge.includes('$$metadata'));assert(!bridge.includes('$$createMetadata'));
  const transformed=await esbuild.transform(bridge,{loader:'ts',format:'esm'});save('QualifiedParsha.ssr-bridge.mjs',transformed.code);
  const mod=await import(pathToFileURL(path.join(OUT,'QualifiedParsha.ssr-bridge.mjs')).href);
  const result={_metadata:{renderedHead:true,hasRenderedHead:true,extraHead:[],propagators:new Set()},styles:new Set(),scripts:new Set(),links:new Set(),createAstro:(_,props)=>({props})};
  rendered=await runtime.renderToString(result,mod.default,{dataset},{});save('QualifiedParsha.aggregate-source-projection.html',rendered);
  componentScript=(await esbuild.transform(raw.scripts[0].code,{loader:'ts'})).code;
  compiled=raw;
}
const qpOptions={unitSelector:'.qp-unit',pairSelector:'.qp-pair',heSelector:'.qp-he',enSelector:'.qp-en',noteSelector:'.qp-qualification'};
const ckOptions={unitSelector:'.ck-qualified-unit',pairSelector:'.ck-source-pair',heSelector:'.ck-he',enSelector:'.ck-en',noteSelector:'.ck-source-qualification'};
function ckProjection(units=projectedUnits) {return {breslov:units.filter(u=>u.kind==='main').map(u=>({sourceId:u.id,pairs:u.pairs,qualifications:u.qualifications})),breslovApparatus:units.filter(u=>u.kind==='apparatus').map(u=>({sourceId:u.id,pairs:u.pairs,qualifications:u.qualifications,owner_main_id:null})),breslovGlobalQualifications:dataset.globalQualifications,breslovScopeNotice:primary.scope};}
function evaluateChokHelper(code) {const doc=documentFor('<html><body></body></html>');doc.readyState='loading';const env=sandbox(doc,'/reader/chok/',()=>Promise.reject(new Error('Not used in helper controls')));vm.runInContext(withExport(code,'commentaryHTML'),env.box);return {env,render:c=>env.box.__qa.commentaryHTML(c)};}
function realFetcher(overrides={}) {const requests=[],consumed=new Map();const fetcher=async url=>{const u=String(url).split('?')[0];requests.push(u);if(Object.hasOwn(overrides,u))return {ok:true,status:200,json:async()=>overrides[u]};let f=path.join(ROOT,'public',decodeURIComponent(u));if(!fs.existsSync(f))f=path.join(path.dirname(process.env.AJEW_TEST_DEPENDENCY_ANCHOR),'public',decodeURIComponent(u));if(fs.existsSync(f)&&fs.statSync(f).isFile()){const bytes=fs.readFileSync(f);consumed.set(f,{path:f,bytes:bytes.length,sha256:sha(bytes)});return {ok:true,status:200,json:async()=>JSON.parse(bytes),text:async()=>bytes.toString()};}return {ok:false,status:404,json:async()=>{throw new Error('Fixture missing '+u);}};};fetcher.requests=requests;fetcher.pins=()=>[...consumed.values()].map(p=>{assert.equal(sha(fs.readFileSync(p.path)),p.sha256,'Consumed data drift');return p;});return fetcher;}
async function fullChok(overrides={}) {
  const controls=['ck-date','ck-week','ck-content','ck-parsha','ck-mode','ck-medooyuk','ck-targum','ck-rashi','ck-commentary','ck-tanachen','ck-carrymode','ck-kavanamode','ck-size','ck-legend','ck-days'];
  const d=documentFor('<html><body>'+controls.map(id=>'<div id="'+id+'"></div>').join('')+'</body></html>');
  const f=realFetcher(overrides), env=sandbox(d,'/reader/chok/',f);
  env.box.location.search='?week='+encodeURIComponent('וירא')+'&day='+encodeURIComponent('יום ראשון');
  env.box.XMLHttpRequest=function(){this.open=(_,url)=>{this.url=url;};this.send=()=>{f(this.url).then(async r=>{this.status=r.status;this.responseText=r.ok?JSON.stringify(await r.json()):'';this.onload?.();});};};
  for(const script of ['tikkun-boundaries.js','tikkun-qatan.js','medooyuk.js','psalms-data.js']) vm.runInContext(source('public/'+script),env.box);
  vm.runInContext(source('public/chok.js'),env.box);
  try { await until(()=>d.getElementById('ck-content').innerHTML.length>1000 && !d.getElementById('ck-content').textContent.includes('Loading'),10000); }
  catch(e) { save('chok-init-failure.json',JSON.stringify({output:d.getElementById('ck-content').innerHTML,requests:f.requests}));env.close();throw e; }
  return {d,env,f};
}
test('five owned Astro compiler + esbuild transforms; two JS syntax; exact input pins',async()=>{
  assert.equal(projectedUnits.length,70);assert.equal(projectedUnits.reduce((n,u)=>n+u.pairs.length,0),505);assert.equal(notes.length,202);
  const compiler=dependencies('@astrojs/compiler'), esbuild=dependencies('esbuild'), results=[];
  for(const file of ['src/components/QualifiedParsha.astro','src/pages/parsha/[slug].astro','src/pages/reader/chumash-lh/[part]/[torah].astro','src/pages/reader/tanach-bereishit/[part]/[torah].astro','src/pages/reader/chok.astro']) {
    const output=await compiler.transform(source(file),{filename:file});await esbuild.transform(output.code,{loader:'ts'});for(const script of output.scripts || [])await esbuild.transform(script.code,{loader:'ts'});assert(!output.diagnostics.some(x=>x.severity===1),JSON.stringify(output.diagnostics));results.push({file,sha256:sha(source(file)),compiledSha256:sha(output.code),scripts:output.scripts.length});
  }
  for(const file of ['public/chok.js','public/reader-script.js'])new vm.Script(source(file),{filename:file});
  save('compiler-and-input-pins.json',JSON.stringify({pins,authoritySha256:sha(authorityBytes),results,node:process.version,nodeExec:process.execPath,dependencyEntries:['@astrojs/compiler','astro','esbuild','parse5'].map(p=>({name:p,path:dependencies.resolve(p),sha256:sha(fs.readFileSync(dependencies.resolve(p)))}))},null,2));
});
test('bounded SSR bridge conserves all70 owners/505 pairs/202 qualifications and null apparatus',async()=>{await compileComponent();verifyExact(rendered,qpOptions);});
test('actual compiled QualifiedParsha client controls never hide qualifications; Both recovery',async()=>{
  await compileComponent();const d=verifyExact(rendered,qpOptions),env=sandbox(d,'/parsha/vayeira',async()=>{throw new Error('No client fetch');});
  try{vm.runInContext(componentScript,env.box);for(const lang of ['he','en','both']){d.querySelector('[data-qualified-lang="'+lang+'"]').click();assert.equal(d.querySelector('[data-qualified-parsha]').dataset.language,lang);for(const p of d.querySelectorAll('[data-qualified-text]'))assert.equal(p.hidden,lang!=='both'&&p.dataset.qualifiedText!==lang);for(const n of d.querySelectorAll('.qp-qualification'))assert(!n.hidden&&!n.parentNode.hidden);assert.equal(d.querySelectorAll('[aria-pressed="true"]').length,1);}}finally{env.close();}
});
test('Chok aggregate source-derived projection: full pairs/notes; independent/global groups initially closed; original RED',()=>{
  const c=ckProjection(),s=evaluateChokHelper(source('public/chok.js'));try{const h=s.render(c).layers;const d=verifyExact(h,ckOptions);assert.equal(d.querySelectorAll('details').length,2);for(const dt of d.querySelectorAll('details'))assert(!dt.open);assert(d.querySelector('.ck-independent-apparatus'));assert(d.querySelector('.ck-global-qualifications'));save('chok-renderer-aggregate.sha256',sha(h)+'\n');}finally{s.env.close();}
  const old=evaluateChokHelper(fs.readFileSync(path.join(process.env.QUALIFIED_PREIMAGES,'public/chok.js'),'utf8'));try{assert.throws(()=>verifyExact(old.render(c)?.layers || '',ckOptions));}finally{old.env.close();}
});
test('Chok real schedule FULL init with labeled first18:1 owner projection, lifecycle/layers/English/Commentary controls',async()=>{
  const main=projectedUnits.find(u=>u.id==='bp-p110-m01'),apparatus=projectedUnits.find(u=>u.id==='bp-p110-n01');
  // Reference from the actual source pair and actual schedule, not invented body.
  assert(primary.units[0].pairs.some(p=>p.kind==='verse reference'&&p.en==='(18:1)'));
  const sched=JSON.parse(source('public/reader/chok/schedule.json'));assert.deepEqual(sched.weeks['וירא'].days['יום ראשון'].torah.from,{c:18,v:1});
  const fixture=ckProjection([main,apparatus]);fixture.breslov[0].ref='18:1';
  const run=await fullChok({['/reader/chok/commentary/'+encodeURIComponent('וירא')+'-yom-rishon.json']:fixture});
  try{const box=run.d.getElementById('ck-content');assert(box.querySelector('.ck-breslov'),'Exact day commentary fetched');assert(!box.querySelector('.ck-breslov').open);verifyExact(box.innerHTML,{...ckOptions,scope:[main,apparatus],expectedNotes:notes.filter(n=>n.owner===null||n.owner===main.id||n.owner===apparatus.id)});assert(box.querySelector('[data-sec="torah"]'));assert(box.querySelector('[data-sec="talmud"]'));const en=run.d.getElementById('ck-tanachen');en.checked=false;en.dispatchEvent({type:'change'});await until(()=>box.querySelector('.ck-breslov') && !box.querySelector('.ck-en-line'));assert(box.querySelectorAll('.ck-source-qualification').length>0);const comm=run.d.getElementById('ck-commentary');comm.checked=false;comm.dispatchEvent({type:'change'});await until(()=>!box.querySelector('.ck-breslov')&&!box.textContent.includes('Loading'));assert(box.querySelector('[data-sec="torah"]'));comm.checked=true;comm.dispatchEvent({type:'change'});await until(()=>box.querySelector('.ck-breslov'));assert(!box.querySelector('.ck-breslov').open);save('chok-full-init.json',JSON.stringify({label:'Source-derived first18:1 renderer projection on real schedule, not actual exported Chok assets',requests:run.f.requests,dataPins:run.f.pins(),outputSha256:sha(box.innerHTML),unitIds:[main.id,apparatus.id]},null,2));}finally{run.env.close();}
});
test('unchanged legacy Chok he/en and non-breslov layers remain byte-identical to original',()=>{
  const legacy=JSON.parse(source('public/reader/chok/commentary/בראשית-yom-rishon.json'));
  const now=evaluateChokHelper(source('public/chok.js')),old=evaluateChokHelper(fs.readFileSync(path.join(process.env.QUALIFIED_PREIMAGES,'public/chok.js'),'utf8'));
  try{const a=now.render(legacy),b=old.render(legacy);assert.equal(a?.carry,b?.carry);assert.equal(a?.layers,b?.layers);}finally{now.env.close();old.env.close();}
});
async function readerRun(chapter,withSidebar=false){
  const main=projectedUnits.find(u=>u.id==='bp-p110-m01');const ref={book:'bereishit',chapter:18,verse:1};
  const index={schema:'qualified-parsha-three-consumer-index/v1',chapters:{18:{url:'/reader/breslov-parsha/qualified-110-171/bereishit-18.json',unitIds:[main.id],verses:[1]}}};
  const projection={...dataset,units:[{...main,verseRef:ref}],segments:[{index:1,he:main.pairs.map(p=>p.he).join('\n\n'),en:main.pairs.map(p=>p.en).join('\n\n')} ]};
  const f=realFetcher({'/data/breslov-parsha/qualified-110-171/index.json':index,[index.chapters[18].url]:projection});
  const d=documentFor('<html><body><div class="reader-container"><div class="reader-toolbar"><div class="reader-toolbar-group"></div></div></div>'+(withSidebar?'<script id="commentary-sidebar-data" type="application/json">null</script>':'')+'</body></html>');
  const env=sandbox(d,'/reader/tanach-bereishit/1/'+chapter,f);vm.runInContext(withExport(source('public/reader-script.js'),'getCommentarySources,renderCommentaryContent'),env.box);await tick(100);return {d,env,f,projection};
}
test('Reader FULL init actual-index fallback; distinct qualified source; old1/2/8 preserved; absent chapter and sidebar controls',async()=>{
  for(const chapter of [18,19]){const run=await readerRun(chapter);try{const sources=run.env.box.__qa.getCommentarySources('tanach-bereishit',1,chapter);assert.equal(sources.some(s=>s.id==='breslov-parsha-qualified-110-171'),chapter===18);assert.equal(run.f.requests.filter(u=>u==='/data/breslov-parsha/qualified-110-171/index.json').length,1);if(chapter===18){const tab=run.d.querySelector('[data-source-id="breslov-parsha-qualified-110-171"]');assert(tab);tab.click();await tick();const body=run.d.getElementById('commentary-body');verifyExact(body.innerHTML,{unitSelector:'article',pairSelector:'[data-pair-id]',heSelector:'.commentary-he',enSelector:'.commentary-en',noteSelector:'.qualified-source-qualification',scope:run.projection.units,expectedNotes:notes.filter(n=>n.owner===null||n.owner==='bp-p110-m01')});}for(const old of [1,2,8])assert(run.env.box.__qa.getCommentarySources('tanach-bereishit',1,old).some(s=>s.id==='breslov-parsha' && s.url==='/reader/breslov-parsha/bereishit-'+old+'.json'));}finally{run.env.close();}}
  const no=await readerRun(18,true);try{assert(!no.d.getElementById('commentary-panel'));assert(!no.f.requests.some(u=>u.includes('qualified-110-171')));}finally{no.env.close();}
});
test('Reader aggregate safe exact renderer with all505 pairs/202 notes and hostile-HTML text control',()=>{
  const code=oneFunction(source('public/reader-script.js'),'qualifiedSourceHTML');const box={};vm.createContext(box);vm.runInContext(code+';globalThis.render=qualifiedSourceHTML',box);const html=box.render(dataset);verifyExact(html,{unitSelector:'article',pairSelector:'[data-pair-id]',heSelector:'.commentary-he',enSelector:'.commentary-en',noteSelector:'.qualified-source-qualification'});
  const mutation=structuredClone(dataset);mutation.units[0].pairs[0].he='<script>&" hostile control';const d=documentFor(box.render(mutation));assert.equal(d.querySelectorAll('script').length,0);assert.equal(d.querySelector('.commentary-he').textContent,mutation.units[0].pairs[0].he);save('reader-renderer-aggregate.sha256',sha(html)+'\n');
});
test('server chapter bridge with actual unchanged Sidebar FULL init, source-derived SSR template, qualified-tab lifecycle',async()=>{
  await compileComponent();const qualified={book:'breslov-parsha-qualified-110-171',section:'bereishit-18',label:'Qualified',sectionTitle:'Qualified supplied source selections',url:'/reader/breslov-parsha/qualified-110-171/bereishit-18.json'};
  const entry={related_commentaries:[qualified]};const oldSidebar=source('src/components/CommentarySidebar.astro');
  const sidebarScript=oldSidebar.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
  const bridge=source('src/pages/reader/tanach-bereishit/[part]/[torah].astro').match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
  const d=documentFor('<html><body><div id="commentary-sidebar"></div><button id="commentary-sidebar-toggle"></button><button id="commentary-sidebar-handle"></button><button id="commentary-sidebar-close"></button><div id="commentary-sidebar-tabs"></div><div id="commentary-sidebar-body"></div><script id="commentary-sidebar-data" type="application/json">'+JSON.stringify(entry)+'</script><template id="qualified-chapter-template" data-tab-id="c-0-breslov-parsha-qualified-110-171">'+rendered+'</template></body></html>');
  const f=realFetcher({[qualified.url]:{...dataset,segments:[{index:1,he:projectedUnits[0].pairs[0].he,en:projectedUnits[0].pairs[0].en}]}});const env=sandbox(d,'/reader/tanach-bereishit/1/18',f);
  try{vm.runInContext(componentScript,env.box);vm.runInContext(sidebarScript,env.box);vm.runInContext(bridge,env.box);await until(()=>d.getElementById('commentary-sidebar-body').querySelector('[data-qualified-parsha]'));const body=d.getElementById('commentary-sidebar-body');verifyExact(body.innerHTML,qpOptions);body.querySelector('[data-qualified-lang="en"]').click();assert.equal(body.querySelector('[data-qualified-parsha]').dataset.language,'en');assert.equal(body.querySelectorAll('.qp-qualification').length,202);d.getElementById('commentary-sidebar-tabs').querySelector('button').click();await until(()=>body.querySelector('[data-qualified-parsha]') && body.querySelector('[data-qualified-parsha]').dataset.language==='both');verifyExact(body.innerHTML,qpOptions);assert.equal(f.requests.filter(x=>x===qualified.url).length,1);env.box.window.dispatchEvent({type:'pagehide'});save('server-sidebar-bridge.json',JSON.stringify({label:'Unchanged Sidebar full-init with source-derived aggregate SSR template; not native page/browser',fetches:f.requests,sidebarSha256:sha(oldSidebar),bridgeSha256:sha(bridge),outputSha256:sha(body.innerHTML)},null,2));}finally{env.close();}
});
test('four independent/actual Chumash branches share QualifiedParsha; legacy fallback denied; reviewed/source-supplement controls conserved',()=>{
  const parsha=source('src/pages/parsha/[slug].astro'),chumash=source('src/pages/reader/chumash-lh/[part]/[torah].astro'),tanach=source('src/pages/reader/tanach-bereishit/[part]/[torah].astro');
  assert(parsha.includes("['vayeira', 'chayei-sarah', 'toldot', 'vayeitzei']"));assert(parsha.includes('hasQualifiedParsha && <QualifiedParsha slug={slug} />'));assert(parsha.includes('CHUMASH_LH_READER[slug] && !hasQualifiedParsha'));assert(parsha.includes("!hasReviewedParsha && !hasQualifiedParsha"));
  assert(chumash.includes("{4: 'vayeira', 5: 'chayei-sarah', 6: 'toldot', 7: 'vayeitzei'}"));assert(chumash.indexOf(': qualifiedSlug ? (')<chumash.indexOf('class="reader-container"'));assert(chumash.includes('<QualifiedParsha slug={qualifiedSlug} />'));
  for(const file of ['src/pages/parsha/[slug].astro','src/pages/reader/chumash-lh/[part]/[torah].astro']){const before=fs.readFileSync(path.join(process.env.QUALIFIED_PREIMAGES,file),'utf8');for(const line of before.split(/\r?\n/).filter(l=>/ReviewedParsha slug|ParshaSourceSupplement packet/.test(l)))assert(source(file).includes(line));}
  assert(tanach.includes('const bpChapters = [1, 2, 8]'));assert(tanach.includes('qualifiedIndex.chapters[String(torahNum)]'));assert(tanach.includes('...(qualifiedBreslovEntry ? [qualifiedBreslovEntry] : [])'));
});

test('actual QualifiedParsha selection frontmatter consumes exact indexed IDs; missing/wrong-parsha fail closed',()=>{
  // A labeled one-owner selection projection, grounded by the primary Vayeira
  // heading. This is not an asserted full four-parsha publication index.
  const unit={...projectedUnits[0],parsha:'vayeira'};
  assert.equal(primary.units[0].pairs[0].he,'פרשת וירא');
  const coverage={mainIds:[unit.id],apparatusIds:[],titleHe:primary.units[0].pairs[0].he,titleEn:primary.units[0].pairs[0].en,notice:primary.scope};
  const frontmatter=source('src/components/QualifiedParsha.astro').split('---')[1].replace(/^import .*;\n/gm,'');
  const execute=(id=unit.id,parsha='vayeira')=>{
    const reads=[],box={Astro:{props:{slug:'vayeira'}},process:{cwd:()=>ROOT},path,fs:{readFileSync(file){reads.push(file);if(file.endsWith('index.json'))return JSON.stringify({parshas:{vayeira:{...coverage,mainIds:[id]}}});if(file.endsWith('master.json'))return JSON.stringify({...dataset,units:[{...unit,parsha}]});throw Error('Unexpected source read '+file);}}};
    vm.createContext(box);vm.runInContext(frontmatter+'\nglobalThis.selectionResult=selection;',box);return {value:box.selectionResult,reads};
  };
  const positive=execute();assert.deepEqual(JSON.parse(JSON.stringify(positive.value.units)),[unit]);assert(positive.reads.every(file=>file.includes('/qualified-110-171/')));
  assert.throws(()=>execute('missing-source-owner'),/Missing qualified source owner/);assert.throws(()=>execute(unit.id,'unrelated-control'),/Missing qualified source owner/);
  assert.equal(execute().value.units[0].pairs[0].he,unit.pairs[0].he);save('selection-loader-controls.json',JSON.stringify({label:'Actual component frontmatter, in-memory source-derived one-owner index projection',reads:positive.reads,missingIdRejected:true,wrongParshaRejected:true,freshPositive:true},null,2));
});

test('exact-render detector rejects lost qualification and changed pair; original Reader RED; fresh positive controls',async()=>{
  await compileComponent();const d=verifyExact(rendered,qpOptions),held=d.querySelector('.qp-qualification');held.remove();assert.throws(()=>verifyExact(d.innerHTML,qpOptions));
  const changed=documentFor(rendered);changed.querySelector('.qp-he').textContent+=' [diagnostic mutation]';assert.throws(()=>verifyExact(changed.innerHTML,qpOptions));
  verifyExact(rendered,qpOptions);
  const old=fs.readFileSync(path.join(process.env.QUALIFIED_PREIMAGES,'public/reader-script.js'),'utf8'),box={};vm.createContext(box);vm.runInContext(oneFunction(old,'renderCommentaryContent')+';globalThis.render=renderCommentaryContent;',box);const body={innerHTML:''};box.render(body,dataset,{});assert.throws(()=>verifyExact(body.innerHTML,{unitSelector:'article',pairSelector:'[data-pair-id]',heSelector:'.commentary-he',enSelector:'.commentary-en',noteSelector:'.qualified-source-qualification'}));
  save('negative-controls.json',JSON.stringify({lostQualificationRejected:true,changedPairRejected:true,originalReaderNewContractRED:true,originalChokNewContractRED:true,freshExactPositive:true},null,2));
});
