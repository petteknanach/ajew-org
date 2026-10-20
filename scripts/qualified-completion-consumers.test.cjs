// Portable actual-consumer regressions. No install/build/browser/data writes.
// Optional QUALIFIED_EXPORT_ROOT: read-only sibling payload repository root.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {dependencies,documentFor,sandbox,until}=require('./qualified-earlier-parsha-test-dom.cjs');
const ROOT=path.resolve(__dirname,'..'),EXTRA=process.env.QUALIFIED_EXPORT_ROOT;
const VERSION='parsha-author-20261018-r1';
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8'),json=p=>JSON.parse(read(p));
const lib=import(pathToFileURL(path.join(ROOT,'src/lib/qualified-parsha.mjs')).href);
const namespaces=['qualified-1-109','qualified-110-171'];
const masters=namespaces.map(n=>json('public/data/breslov-parsha/'+n+'/master.json'));
const oldUnits=masters.flatMap(m=>m.units);
const baselineBlobs=new Map();
function blob(p){if(EXTRA&&fs.existsSync(path.join(EXTRA,p)))return fs.readFileSync(path.join(EXTRA,p),'utf8');if(fs.existsSync(path.join(ROOT,p)))return read(p);if(baselineBlobs.has(p))return baselineBlobs.get(p);let raw=null;try{raw=execFileSync('git',['show','HEAD:'+p],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});}catch{}baselineBlobs.set(p,raw);return raw;}
async function bootActual(w,day,focused){
 const template=read('src/pages/reader/chok.astro'),inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const d=documentFor('<html><body>'+inner+'</body></html>'),requests=[];let active=0,peak=0;
 const env=sandbox(d,'/reader/chok/',async url=>{active++;peak=Math.max(peak,active);const p='public'+decodeURIComponent(String(url).split('?')[0]);requests.push(p);const raw=blob(p);await new Promise(r=>setTimeout(r,1));active--;return {ok:raw!==null,status:raw===null?404:200,text:async()=>raw,json:async()=>JSON.parse(raw)};});
 env.box.location.search='?week='+encodeURIComponent(w)+'&day='+encodeURIComponent(day)+(focused?'&sec=torah':'');
 try{for(const m of template.matchAll(/<script src="([^"?]+)[^"]*" defer><\/script>/g)){const code=blob('public'+m[1]);assert(code);vm.runInContext(code,env.box,{filename:m[1]});}await until(()=>!!d.querySelector('#ck-content').innerHTML&&!d.querySelector('.ck-loading'),20000);assert(!d.querySelector('#ck-content').textContent.includes('Could not load'));return {d,env,requests,peak:()=>peak};}catch(e){env.close();e.message=w+'|'+day+'|'+focused+': '+e.message+'; requested '+requests.slice(-8).join(', ');throw e;}
}
function expose(code,expr){const i=code.lastIndexOf('})();');assert(i>0);return code.slice(0,i)+'\nglobalThis.qa={'+expr+'};\n'+code.slice(i);}
function helper(){const d=documentFor('<html><body></body></html>'),env=sandbox(d,'/reader/chok/',()=>{});vm.runInContext(read('public/chok-verse-breslov.js'),env.box);return {env,api:env.box.window.ChokVerseBreslov};}
async function selections(){const h=helper();try{return await h.api.loadQualified(async u=>{const raw=blob('public'+decodeURIComponent(u.split('?')[0]));if(raw===null)throw Error('404');return raw;});}finally{h.env.close();}}
const qualifiedAPI=require(path.join(ROOT,'src/lib/qualified-parsha.mjs'));
function exactField(field,p,lang,annotated,target){
 assert(field);const spans=field.querySelectorAll('[data-source-field]'),refs=field.querySelectorAll('[data-note89-ref]');
 assert.equal(spans.length,annotated?1:0);assert.equal(refs.length,annotated?1:0);
 assert.equal((spans[0]||field).textContent,p[lang],'Complete untouched source '+p.id+' '+lang);
 if(!annotated)return;
 const span=spans[0],ref=refs[0],sup=ref.parentNode;
 assert.equal(span.getAttribute('data-source-field'),lang);assert.equal(span.parentNode,field);
 assert.equal(sup.tagName.toLowerCase(),'sup');assert(sup.hasAttribute('data-note89-marker'));
 assert.equal(span.nextSibling,sup,'Reference follows the COMPLETE paragraph');
 assert.equal(sup.parentNode,field);assert.equal(field.children.length,2);
 assert.equal(ref.textContent,'89');assert.equal(ref.getAttribute('role'),'doc-noteref');
 assert.equal(ref.getAttribute('href'),'#'+target.id);assert.equal(field.textContent,p[lang]+'89','No unbound text outside source span');
}
function noteText(q){
 const text=qualifiedAPI.note89QualificationText(q);
 if(text!==q.text){assert.equal(q.owner,'b-p146-n01');assert(['note89-current-qualification','note89-source-locator'].includes(q.id));assert.equal(text,'Printed note 89 follows the paragraph ending “He would not need you, etc.” Its citation is Chayay Moharan, item 330.');}
 return text;
}
function exactPairs(doc,units,ownerAttr,pairSel,heSel,enSel){
 const owners=doc.querySelectorAll('['+ownerAttr+']');assert.equal(owners.length,units.length);
 const binding=qualifiedAPI.note89Binding(units),targets=doc.querySelectorAll('[data-note89-target]');
 assert.equal(targets.length,binding?1:0);assert.equal(doc.querySelectorAll('[data-note89-ref]').length,binding?2:0);
 if(binding){assert.equal(binding.mainId,'b-p146-m01');assert.equal(binding.noteId,'b-p146-n01');assert.equal(binding.pairId,'146-body');assert.equal(binding.number,'89');assert.equal(targets[0].getAttribute(ownerAttr),binding.noteId);}
 for(const u of units){const el=owners.find(n=>n.getAttribute(ownerAttr)===u.id);assert(el,u.id);const ps=el.querySelectorAll(pairSel);assert.equal(ps.length,u.pairs.length,u.id);u.pairs.forEach((p,i)=>{assert.equal(ps[i].getAttribute('data-pair-id'),p.id);const annotated=!!binding&&u.id===binding.mainId&&p.id===binding.pairId;exactField(ps[i].querySelector(heSel),p,'he',annotated,targets[0]);exactField(ps[i].querySelector(enSel),p,'en',annotated,targets[0]);});}
}
let component;
async function compileComponent(){
 if(component)return component;
 const compiler=dependencies('@astrojs/compiler'),esbuild=dependencies('esbuild');
 const raw=await compiler.transform(read('src/components/QualifiedParsha.astro'),{filename:'QualifiedParsha.astro'});
 const runtime=await import(pathToFileURL(dependencies.resolve('astro/runtime/server/index.js')).href);
 // Same disclosed ABI-only bridge as predecessor: no source/markup changes.
 let bridge=raw.code.replace(/,?\s*createMetadata as \$\$createMetadata\n/,'\n').replace(/^import "[^"\n]+\?astro&type=style[^"\n]*";\n/gm,'').replace(/export const \$\$metadata = \$\$createMetadata\([\s\S]*?\n\nconst \$\$Astro/,()=> 'const $$Astro').replace('"astro/runtime/server/index.js"',JSON.stringify(pathToFileURL(dependencies.resolve('astro/runtime/server/index.js')).href)).replace("'../lib/qualified-parsha.mjs'",JSON.stringify(pathToFileURL(path.join(ROOT,'src/lib/qualified-parsha.mjs')).href)).replace('"../lib/qualified-parsha.mjs"',JSON.stringify(pathToFileURL(path.join(ROOT,'src/lib/qualified-parsha.mjs')).href));
 bridge=(await esbuild.transform(bridge,{loader:'ts',format:'esm'})).code;
 const module=await import('data:text/javascript;base64,'+Buffer.from(bridge).toString('base64'));
 const script=(await esbuild.transform(raw.scripts[0].code,{loader:'ts'})).code;
 component={script,render:props=>runtime.renderToString({_metadata:{renderedHead:true,hasRenderedHead:true,extraHead:[],propagators:new Set()},styles:new Set(),scripts:new Set(),links:new Set(),createAstro:(_,p)=>({props:p})},module.default,props,{})};return component;
}
test('route IDs are the real standalone map AND full Reader directory, not transliteration guesses',async()=>{
 const {PARSHA_READER}=await lib;
 const route=read('src/pages/parsha/[slug].astro'),directory=json('public/reader/chumash-lh/part-1/index.json');
 for(const [slug,id] of Object.entries(PARSHA_READER)){assert(route.includes("'"+slug+"': '"+id+"'"));assert(directory.torahs.some(t=>t.url==='/reader/chumash-lh/'+id));}
 assert.deepEqual(Object.keys(PARSHA_READER).slice(7),['vayishlach','vayeishev','mikeitz','vayigash','vayechi']);
});
test('authentic 169+70 server selection, exact units/pairs/qualifications and chapter membership',async()=>{
 const {qualifiedIndexes,qualifiedParsha,qualifiedChapter}=await lib,indexes=qualifiedIndexes(ROOT).filter(i=>namespaces.includes(i.namespace));assert.equal(oldUnits.length,239);
 let count=0;for(const {index} of indexes)for(const slug of Object.keys(index.parshas)){const {selection}=qualifiedParsha(slug,indexes,ROOT);const c=index.parshas[slug],byId=new Map(oldUnits.map(u=>[u.id,u])),expected=[...c.mainIds,...c.apparatusIds].map(id=>byId.get(id));assert.deepEqual(selection.units,expected);count+=selection.units.length;}
 assert.equal(count,239);
 for(let c=1;c<=50;c++){const result=qualifiedChapter(c,indexes,ROOT),expected=indexes.filter(x=>x.index.chapters[String(c)]);assert.equal(result.matches.length,expected.length);if(result.selection){const originals=expected.flatMap(x=>{const d=json('public'+x.index.chapters[String(c)].url);return [...d.units,...(d.apparatus||[])];});assert.deepEqual(result.selection.units,originals);}}
});
test('real Chok namespace discovery conserves older source units; Noach/Lech use their author-selected 116-note policy',async()=>{
 const found=await selections();
 for(const {index} of (await lib).qualifiedIndexes(ROOT).filter(i=>namespaces.includes(i.namespace)))for(const [slug,c] of Object.entries(index.parshas)){if(['noach','lech-lecha'].includes(slug))continue;assert.deepEqual(JSON.parse(JSON.stringify(found[c.titleHe].source.units)),[...c.mainIds,...c.apparatusIds].map(id=>oldUnits.find(u=>u.id===id)));}
 assert.equal(json('public/reader/chok/breslov-reading-notes.json').notes.length,116);
});
test('actual component SSR bridge and language script conserve every authentic older pair/qualification',async()=>{
 const comp=await compileComponent();
 for(const master of masters){const html=await comp.render({dataset:master}),d=documentFor(html);exactPairs(d,master.units,'data-source-id','.qp-pair','.qp-he','.qp-en');
 const notes=master.units.flatMap(u=>u.qualifications).concat(master.globalQualifications||[]),actual=d.querySelectorAll('[data-note-id]');assert.equal(actual.length,notes.length);for(const q of notes)assert(actual.some(n=>n.getAttribute('data-note-id')===q.id&&n.querySelector('p').textContent===noteText(q)));
 const env=sandbox(d,'/parsha/vayeira/',()=>{});try{vm.runInContext(comp.script,env.box);for(const lang of ['he','en','both']){d.querySelector('[data-qualified-lang="'+lang+'"]').click();for(const p of d.querySelectorAll('[data-qualified-text]'))assert.equal(p.hidden,lang!=='both'&&p.dataset.qualifiedText!==lang);for(const n of actual)assert(!n.hidden&&!n.closest('[data-qualified-text]'));}}finally{env.close();}}
});
// Explicit synthetic contract only; not a source export or new textual authority.
function synthetic(){return ['vayishlach','vayeishev','mikeitz','vayigash','vayechi'].map((slug,i)=>({id:'synthetic-'+i,parsha:slug,kind:'main',sourceKind:'main',owner_main_id:null,verseRef:{book:'bereishit',chapter:32+i,verse:1},pairs:[{id:'p',he:'Synthetic Hebrew fixture',en:'Synthetic English fixture',sourceStatus:{he:'held',en:'qualified'}}],qualifications:[{id:'synthetic-q-'+i,owner:'synthetic-'+i,pair_id:'p',placement:'after_pair',text:'Synthetic lexical alternative: reading A or reading B.'}]}));}
test('prospective new namespace reaches all five real routes; overlap deduplicates, conflicting owner fails closed',async()=>{
 const api=await lib,base=synthetic(),master={schema:'qualified-parsha-public-master/v1',units:base,globalQualifications:[],scopeNotice:'Synthetic source scope',revision:'synthetic'},index={schema:'qualified-parsha-three-consumer-index/v1',masterUrl:'/data/breslov-parsha/qualified-172-269/master.json',revision:'synthetic',parshas:{},chapters:{}};
 base.forEach((u,i)=>{index.parshas[u.parsha]={titleHe:['וישלח','וישב','מקץ','ויגש','ויחי'][i],titleEn:u.parsha,mainIds:[u.id],apparatusIds:[]};index.chapters[u.verseRef.chapter]={url:'/reader/breslov-parsha/qualified-172-269/bereishit-'+u.verseRef.chapter+'.json'};});
 const fake='/virtual-qualified-consumer-fixture',oldRead=fs.readFileSync,oldDirs=fs.readdirSync;
 fs.readdirSync=(p,o)=>String(p)===fake+'/public/data/breslov-parsha'?[{name:'qualified-172-269',isDirectory:()=>true}]:oldDirs(p,o);
 fs.readFileSync=(p,...args)=>{if(String(p).startsWith(fake)){if(String(p).endsWith('/index.json'))return JSON.stringify(index);if(String(p).endsWith('/master.json'))return JSON.stringify(master);return JSON.stringify({...master,schema:'qualified-parsha-chapter-commentary/v1',units:base.filter(u=>String(p).endsWith('-'+u.verseRef.chapter+'.json'))});}return oldRead(p,...args);};
 try{const indexes=api.qualifiedIndexes(fake);for(const u of base){assert.deepEqual(api.qualifiedParsha(u.parsha,indexes,fake).selection.units,[u]);assert.equal(api.qualifiedChapter(u.verseRef.chapter,indexes,fake).selection.units[0].id,u.id);}}finally{fs.readFileSync=oldRead;fs.readdirSync=oldDirs;}
 assert.equal(api.mergeQualified([master,master]).units.length,5);const conflict=structuredClone(master);conflict.units[0].pairs[0].en+=' conflict';assert.throws(()=>api.mergeQualified([master,conflict]),/Conflicting/);
 const h=helper();try{const result=await h.api.loadQualified(async u=>u.includes('qualified-172-269')?JSON.stringify(u.includes('index.json')?index:master):Promise.reject(Error('404')));
  const good=['וישלח','וישב','מקץ','ויגש','ויחי'],reserved=['בראשית','וירא','חיי שרה','תולדות','ויצא'];
  assert.deepEqual(Object.keys(result).sort(),[...good,...reserved].sort());
  good.forEach((week,i)=>assert.deepEqual(JSON.parse(JSON.stringify(result[week].source.units)),[base[i]]));
  // Failed older editions retain their real week reservations to forbid legacy
  // fallback, but must neither contribute bodies nor displace healthy sources.
  reserved.forEach(week=>{assert.equal(result[week].source.units.length,0);assert.equal(result[week].unavailable.length,1);assert.equal(result[week].unavailable[0].reason,'404');});
 }finally{h.env.close();}
});
test('held field status and exact lexical note remain outside both language controls and native owner disclosure',async()=>{
 const master={units:synthetic(),globalQualifications:[],scopeNotice:'Synthetic source scope'},comp=await compileComponent(),html=await comp.render({dataset:master}),d=documentFor(html);assert.equal(d.querySelectorAll('[data-source-status="held"]').length,5);
 const run=helper();try{const code=expose(read('public/chok-verse-breslov.js'),'owner'),box=run.env.box;vm.runInContext(code,box);const u=master.units[0],s={key:u.parsha,readerNotes:{[u.qualifications[0].id]:u.qualifications[0].text}};const doc=documentFor(box.qa.owner(u,s,'inline-32-1'));for(const n of doc.querySelectorAll('.ck-source-qualification')){assert(!n.closest('details'));assert(!n.closest('.ck-he'));assert(!n.closest('.ck-en'));}assert(doc.textContent.includes('unresolved source reading'));assert(doc.textContent.includes(u.qualifications[0].text));}finally{run.env.close();}
});
function readerHarness(chapter,withSidebar=false,overrides={}){
 const d=documentFor('<html><body><div class="reader-container"><div class="reader-toolbar"><div class="reader-toolbar-group"></div></div></div>'+(withSidebar?'<script id="commentary-sidebar-data" type="application/json">null</script>':'')+'</body></html>'),requests=[];
 const env=sandbox(d,'/reader/tanach-bereishit/1/'+chapter,async url=>{const u=String(url).split('?')[0];requests.push(u);const raw=Object.hasOwn(overrides,u)?JSON.stringify(overrides[u]):blob('public'+decodeURIComponent(u));return {ok:raw!==null,status:raw===null?404:200,json:async()=>JSON.parse(raw),text:async()=>raw};});
 vm.runInContext(expose(read('public/reader-script.js'),'getCommentarySources,qualifiedSourceHTML,fetchCommentarySource'),env.box);return {d,env,requests};
}
test('actual reader-script fallback init loads all indexes and exact chapter content; authoritative server sidebar prevents duplicate fetch',async()=>{
 for(const c of [1,18,31,50]){const run=readerHarness(c);try{await until(()=>run.requests.includes('/data/breslov-parsha/qualified-172-269/index.json'));await new Promise(r=>setTimeout(r,60));const sources=run.env.box.qa.getCommentarySources('tanach-bereishit',1,c),q=sources.find(s=>s.qualifiedUrls);const api=await lib,expected=api.mergeQualified([api.qualifiedChapter(c,undefined,ROOT).selection,EXTRA?api.qualifiedChapter(c,api.qualifiedIndexes(EXTRA),EXTRA).selection:null].filter(Boolean));if(expected){assert(q);const data=await(await run.env.box.qa.fetchCommentarySource(q)).json();const doc=documentFor(run.env.box.qa.qualifiedSourceHTML(data));exactPairs(doc,expected.units,'data-source-id','[data-pair-id]','.commentary-he','.commentary-en');}else assert(!q);}finally{run.env.close();}}
 const run=readerHarness(18,true);try{await new Promise(r=>setTimeout(r,40));assert(!run.requests.some(u=>u.includes('/qualified-')));}finally{run.env.close();}
});
test('fallback overlap combines actual namespace sources without duplicate owners and rejects conflicting repeated IDs',async()=>{
 const run=readerHarness(32,true),data={schema:'qualified-parsha-chapter-commentary/v1',units:synthetic(),globalQualifications:[],scopeNotice:'Synthetic source scope'};
 try{const code=read('public/reader-script.js'),start=code.indexOf('  function fetchCommentarySource('),end=code.indexOf('\n  function loadCommentary(',start);const box={fetch:async()=>({ok:true,json:async()=>data})};vm.createContext(box);vm.runInContext(code.slice(start,end)+';globalThis.load=fetchCommentarySource;',box);let merged=await(await box.load({qualifiedUrls:['old','new']})).json();assert.equal(merged.units.length,5);
 let calls=0;box.fetch=async()=>({ok:true,json:async()=>{const c=structuredClone(data);if(calls++)c.units[0].pairs[0].he+=' conflict';return c;}});await assert.rejects(box.load({qualifiedUrls:['old','new']}),/Conflicting/);
 }finally{run.env.close();}
});
test('changed Astro templates compile with installed read-only compiler; every live script URL pin is current, no other assets bumped',async()=>{
 const compiler=dependencies('@astrojs/compiler'),esbuild=dependencies('esbuild');
 for(const p of ['src/components/QualifiedParsha.astro','src/pages/parsha/[slug].astro','src/pages/reader/chumash-lh/[part]/[torah].astro','src/pages/reader/tanach-bereishit/[part]/[torah].astro','src/pages/reader/chok.astro']){const result=await compiler.transform(read(p),{filename:p});assert(!result.diagnostics.some(d=>d.severity===1));await esbuild.transform(result.code,{loader:'ts'});for(const s of result.scripts||[])await esbuild.transform(s.code,{loader:'ts'});}
 const refs=execFileSync('git',['grep','-l','-z','-F','reader-script.js?v=','HEAD','--','src'],{cwd:ROOT}).toString().split('\0').filter(Boolean).map(p=>p.slice(5)).filter(p=>p.endsWith('.astro'));assert.equal(refs.length,248);for(const p of refs)assert(read(p).includes('/reader-script.js?v='+VERSION),p);
 for(const [asset,version]of Object.entries({'chok.js':'5fa0918d87511220fe550579336d55c73b78e81e77bdc284dd0c3be99a8f7b4e','chok-source-reader.js':'chok-live-corrections-20261020-r1','chok-verse-breslov.js':'parsha-author-20261020-reader-notes-r1'})){new vm.Script(read('public/'+asset));assert(read('src/pages/reader/chok.astro').includes('/'+asset+'?v='+version));}
});
test('actual server Sidebar init and route bridge retain complete chapter pairs, notes, language controls and tab lifecycle',async()=>{
 const {qualifiedChapter}=await lib,data=qualifiedChapter(18,undefined,ROOT).selection,comp=await compileComponent(),rendered=await comp.render({dataset:data});
 const entry={related_commentaries:[{book:'breslov-parsha-qualified-110-171',section:'bereishit-18',label:'Qualified',sectionTitle:'Qualified supplied source selections',url:'/reader/breslov-parsha/qualified-110-171/bereishit-18.json'}]};
 const sidebar=read('src/components/CommentarySidebar.astro').match(/<script is:inline>([\s\S]*?)<\/script>/)[1],bridge=read('src/pages/reader/tanach-bereishit/[part]/[torah].astro').match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
 const d=documentFor('<html><body><div id="commentary-sidebar"></div><button id="commentary-sidebar-toggle"></button><button id="commentary-sidebar-handle"></button><button id="commentary-sidebar-close"></button><div id="commentary-sidebar-tabs"></div><div id="commentary-sidebar-body"></div><script id="commentary-sidebar-data" type="application/json">'+JSON.stringify(entry)+'</script><template id="qualified-chapter-template" data-tab-id="c-0-breslov-parsha-qualified-110-171">'+rendered+'</template></body></html>');
 const env=sandbox(d,'/reader/tanach-bereishit/1/18',async()=>({ok:true,json:async()=>data}));try{vm.runInContext(comp.script,env.box);vm.runInContext(sidebar,env.box);vm.runInContext(bridge,env.box);const body=d.getElementById('commentary-sidebar-body');await until(()=>body.querySelector('[data-qualified-parsha]'));exactPairs(body,data.units,'data-source-id','.qp-pair','.qp-he','.qp-en');body.querySelector('[data-qualified-lang="en"]').click();assert.equal(body.querySelector('[data-qualified-parsha]').dataset.language,'en');d.getElementById('commentary-sidebar-tabs').querySelector('button').click();await until(()=>body.querySelector('[data-qualified-parsha]')?.dataset.language==='both');exactPairs(body,data.units,'data-source-id','.qp-pair','.qp-he','.qp-en');env.box.window.dispatchEvent({type:'pagehide'});}finally{env.close();}
});
test('actual full Chok init: every day of remaining five older portions, ordinary AND focused verse-local order/closure/complete pairs',async()=>{
 const schedule=json('public/reader/chok/schedule.json'),single=process.env.QUALIFIED_CHOK_SINGLE_KEY;let cases=0;
 const selected=single?await selections():null;
 const weeks=process.env.QUALIFIED_CHOK_COHORT==='new'?['וישלח','וישב','מקץ','ויגש','ויחי']:['בראשית','וירא','חיי שרה','תולדות','ויצא'];
 for(const week of weeks)for(const day of Object.keys(schedule.weeks[week].days))for(const focus of [false,true]){
  const key=[week,day,String(focus)].join('|');if(single&&single!==key)continue;
  if(!single){
   const childEnv={...process.env,QUALIFIED_CHOK_SINGLE_KEY:key};delete childEnv.NODE_TEST_CONTEXT;
   console.log('CHOK-CASE START '+key);
   const evidence=process.env.QUALIFIED_CHOK_EVIDENCE_DIR,tag=require('node:crypto').createHash('sha256').update(key).digest('hex');
   function capture(suffix,body){if(!evidence)return;fs.mkdirSync(evidence,{recursive:true});const dest=path.join(evidence,tag+suffix);assert(!fs.existsSync(dest),'refuse overwrite of completed case evidence');fs.writeFileSync(dest,body||'');}
   let output;try{output=execFileSync(process.execPath,['--max-old-space-size=256','--test','--test-concurrency=1','--test-force-exit','--test-name-pattern=actual full Chok init',__filename],{env:childEnv,encoding:'utf8',maxBuffer:1024*1024,timeout:90000});capture('.pass.tap',output);}
   catch(e){capture('.failed.stdout',e.stdout);capture('.failed.stderr',e.stderr);e.message=key+': '+e.message+'; child stdout: '+String(e.stdout||'').slice(-5000)+'; child stderr: '+String(e.stderr||'').slice(-3000);throw e;}
   assert(output.includes('# fail 0'),output);console.log('CHOK-CASE PASS '+key);cases++;continue;
  }
  const run=await bootActual(week,day,focus);try{const source=selected[week].source;assert(run.d.querySelector('[data-sec="torah"]'),week+' '+day);for(const verse of run.d.querySelector('[data-sec="torah"]').querySelectorAll('.ck-verse')){const [c,v]=verse.getAttribute('data-verse-ref').split(':').map(Number),expected=run.env.box.window.ChokVerseBreslov.mapped(source,'tanach-bereishit',c,v),panel=verse.querySelector('.ck-verse-breslov');if(!expected.length){assert(!panel);continue;}assert(panel);assert(!panel.open);assert(!panel.closest('.ck-verse-access'));const access=verse.querySelector('.ck-verse-access');assert(access);assert(verse.children.indexOf(access)<verse.children.indexOf(panel));for(const prev of verse.querySelectorAll('.ck-rashi,.ck-super,.ck-comm'))assert(verse.innerHTML.indexOf(prev.innerHTML)<verse.innerHTML.indexOf(panel.innerHTML));exactPairs(panel,expected,'data-bop-unit','.ck-source-pair','.ck-he','.ck-en');for(const owner of panel.querySelectorAll('.ck-breslov-owner')){assert(!owner.querySelector('.ck-qualified-disclosure').open);for(const q of owner.querySelectorAll('[data-note-id]'))assert(!q.closest('.ck-qualified-disclosure'));}}
  if(!focus){const weekly=run.d.getElementById('ck-breslov-offering-body').querySelector('.ck-breslov');assert(weekly);assert(!weekly.open);exactPairs(weekly,source.units,'data-bop-unit','.ck-source-pair','.ck-he','.ck-en');for(const u of source.units){const owner=weekly.querySelectorAll('[data-bop-unit]').find(n=>n.getAttribute('data-bop-unit')===u.id),notes=owner.querySelectorAll('[data-note-id]');assert.equal(notes.length,u.qualifications.length);u.qualifications.forEach((q,i)=>{assert.equal(notes[i].getAttribute('data-note-id'),q.id);assert.equal(notes[i].querySelector('[data-note-text]').textContent,noteText(q));});}}
  const ids=run.d.querySelectorAll('[id]').map(n=>n.id);assert.equal(new Set(ids).size,ids.length);assert(run.peak()<=6);cases++;console.log('CHOK-CASE PASS '+week+'|'+day+'|'+(focus?'focused':'ordinary'));
  }finally{run.env.close();}
 }
 assert.equal(cases,single?1:70);
});
test('optional authentic final118 exported source: exact five-parsha selection, pair/field counts, statuses and actual chapter joins',{skip:!EXTRA},async()=>{
 const api=await lib,indexes=api.qualifiedIndexes(EXTRA),i=indexes.find(i=>i.namespace==='qualified-172-269');assert(i,'new source-export namespace');const master=api.publicJSON(i.index.masterUrl,EXTRA);assert.equal(master.units.length,118);assert.equal(master.units.reduce((n,u)=>n+u.pairs.length,0),732);let fields=0,held=0,qualified=0;
 for(const u of master.units)for(const p of u.pairs)for(const lang of ['he','en']){const s=api.fieldStatus(p,lang);assert(s,u.id+' '+p.id+' '+lang);fields++;if(s==='held'||s.startsWith('held-'))held++;else qualified++;}
 assert.equal(fields,1464);assert.equal(held,410);assert.equal(qualified,1054);
 assert.deepEqual(Object.keys(i.index.parshas).sort(),['vayishlach','vayeishev','mikeitz','vayigash','vayechi'].sort());
 for(const slug of Object.keys(i.index.parshas)){const s=api.qualifiedParsha(slug,[i],EXTRA).selection;assert(s.units.length);const merged=api.mergeQualified([api.qualifiedParsha(slug,api.qualifiedIndexes(ROOT),ROOT).selection,s].filter(Boolean));assert.equal(new Set(merged.units.map(u=>u.id)).size,merged.units.length);}
 for(const c of Object.keys(i.index.chapters)){const s=api.qualifiedChapter(c,[i],EXTRA).selection;assert(s.units.length);}
 const found=await selections();for(const [slug,c] of Object.entries(i.index.parshas)){const expected=api.mergeQualified([api.qualifiedParsha(slug,api.qualifiedIndexes(ROOT),ROOT).selection,api.qualifiedParsha(slug,[i],EXTRA).selection].filter(Boolean));assert.deepEqual(JSON.parse(JSON.stringify(found[c.titleHe].source.units)),expected.units);}
 const comp=await compileComponent(),d=documentFor(await comp.render({dataset:master}));exactPairs(d,master.units,'data-source-id','.qp-pair','.qp-he','.qp-en');const notes=master.units.flatMap(u=>u.qualifications).concat(master.globalQualifications||[]);assert.equal(d.querySelectorAll('[data-note-id]').length,notes.length);for(const q of notes)assert(d.querySelectorAll('[data-note-id]').some(n=>n.getAttribute('data-note-id')===q.id&&n.querySelector('p').textContent===noteText(q)));
 const childEnv={...process.env,QUALIFIED_CHOK_COHORT:'new'};delete childEnv.NODE_TEST_CONTEXT;delete childEnv.QUALIFIED_CHOK_SINGLE_KEY;const output=execFileSync(process.execPath,['--max-old-space-size=256','--test','--test-concurrency=1','--test-name-pattern=actual full Chok init',__filename],{env:childEnv,encoding:'utf8',maxBuffer:1024*1024,timeout:550000});assert(output.includes('# fail 0'),output);console.log(output);
});
