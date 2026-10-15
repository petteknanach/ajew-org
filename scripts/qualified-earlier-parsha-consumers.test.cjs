// Ordinary portable consumer regressions. ALL bodies below are plainly synthetic.
// No private source authority, source paths, or source acceptance is required/claimed.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {documentFor, sandbox, until, tick, visible, dependencies} = require('./qualified-earlier-parsha-test-dom.cjs');
const ROOT = process.env.EARLIER_CONSUMER_ROOT || path.resolve(__dirname, '..');
const source = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
/** @typedef {{id:string, he:string, en:string}} Pair */
/** @typedef {{id:string,text:string,placement:string,pair_id:string|null,aliases:Array<{id:string}>}} Qualification */
/** @typedef {{id:string,kind:string,sourceKind?:string,parsha:string,owner_main_id:string|null,verseRef:object|null,pairs:Pair[],qualifications:Qualification[]}} Unit */
/** @returns {Unit} A deliberately synthetic source carrier, not real Torah text. */
function unit(id, role='main', owner=null, ref={book:'bereishit',chapter:1,verse:1}) {
  return {id, kind:role==='main'?'main':'apparatus', sourceKind:role, parsha:'bereishit', owner_main_id:owner, verseRef:ref,
    pairs:[{id:id+'-p1',he:'סינתטי <'+id+'> א',en:'SYNTHETIC '+id+' first <text>'},{id:id+'-p2',he:'סינתטי '+id+' ב',en:'SYNTHETIC '+id+' complete ending'}],
    qualifications:[{id:id+'-q1',text:'SYNTHETIC after-pair qualification '+id,placement:'after_pair',pair_id:id+'-p1',aliases:[{id:id+'-alias'}]},
      {id:id+'-q2',text:'SYNTHETIC owner qualification '+id,placement:'after_owner',pair_id:null,aliases:[]}]};
}
const main=unit('synthetic-main'), note=unit('synthetic-note','note',main.id), nullNote=unit('synthetic-null-note','note',null,null);
const title=unit('synthetic-title','title',null,null), aside=unit('synthetic-aside','aside',null,null);
const context=Array.from({length:4},(_,i)=>({...unit('synthetic-context-'+i,'main',null,null),allocationScope:'weekly-context'}));
const all=[main,...context,note,nullNote,title,aside];
// Exported chapter shape: apparatus in units AND a distinct separate apparatus array.
const chapter={schema:'qualified-parsha-chapter-commentary/v1',namespace:'qualified-1-109',scopeNotice:'SYNTHETIC scope, not a complete source claim',units:all.slice(0,-1),apparatus:[aside],globalQualifications:[]};
const older={schema:chapter.schema,units:[{...unit('synthetic-later-main'),sourceKind:undefined}],apparatus:[{...unit('synthetic-later-apparatus','note'),sourceKind:undefined}],globalQualifications:[],scopeNotice:'SYNTHETIC later scope'};
const packet={id:'synthetic-noach-packet',description:'SYNTHETIC complete weekly packet description',segments:[
  {index:2,title:'SYNTHETIC whole-Noach recitation',sourceBook:'sefer-hamidos',sourceRef:'Sefer HaMidos — Klipah, Part I, item 10',sourceUrl:'/reader/sefer-hamidos/1/89/#seg-10',he:'סינתטי מקור שבועי א',en:'SYNTHETIC entire weekly recitation body'},
  {index:1,title:'SYNTHETIC closing Biraishis study',sourceBook:'chayey-moharan',sourceRef:'Chayay Moharan, item 463 (The Service of G-d, item 20)',sourceUrl:'/reader/chayey-moharan/siman/463/',verse:'Genesis 6:8',he:'סינתטי מקור שבועי ב',en:'SYNTHETIC complete closing verse source',commentary:{he:'סינתטי הערת גימטריא',en:'SYNTHETIC attached user gematria note'}}]};
const carrier={breslov:[{...main,sourceId:main.id,ref:'1:1'}],breslovApparatus:[note,nullNote,title,aside].map(u=>({...u,sourceId:u.id})),breslovContext:context.map(u=>({...u,sourceId:u.id,ref:null})),breslovWeeklySources:packet,breslovScopeNotice:'SYNTHETIC qualified selection',breslovGlobalQualifications:[]};
const DAY_NAMES=['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','ליל שישי','יום שישי'];
const DAY_SLUGS=['yom-rishon','yom-sheni','yom-shlishi','yom-revii','yom-chamishi','leil-shishi','yom-shishi'];
const WEEKS=['בראשית','נח','לך לך'];
function withExport(code, names) {const end=code.lastIndexOf('})();');assert(end>0);return code.slice(0,end)+'\nglobalThis.__qa={'+names+'};\n'+code.slice(end);}
function oneFunction(code,name) {const start=code.indexOf('  function '+name+'(');assert(start>=0);const end=code.indexOf('\n  }',start)+4;assert(end>start);return code.slice(start,end);}
function readerHTML(data=chapter) {const box={document:{addEventListener(){}}};vm.createContext(box);vm.runInContext(oneFunction(source('public/reader-script.js'),'qualifiedSourceHTML')+';globalThis.render=qualifiedSourceHTML;',box);return box.render(data);}
function chokHTML(data=carrier) {const d=documentFor('<html><body></body></html>');d.readyState='loading';const env=sandbox(d,'/reader/chok/',async()=>{throw Error('No helper fetch');});vm.runInContext(withExport(source('public/chok.js'),'commentaryHTML'),env.box);return {env,d,html:env.box.__qa.commentaryHTML(data)?.layers || ''};}
function verify(html, scope=all, chok=false) {
  const d=documentFor(html), nodes=d.querySelectorAll(chok?'.ck-qualified-unit':'article[data-source-id]');
  assert.equal(nodes.length,scope.length,'Each source owner exactly once');
  for(const u of scope) {
    const matches=nodes.filter(n=>n.getAttribute('data-source-id')===u.id);assert.equal(matches.length,1,u.id);const n=matches[0];
    const pairs=n.querySelectorAll('[data-pair-id]');assert.equal(pairs.length,u.pairs.length);
    u.pairs.forEach((pair,i)=>{assert.equal(pairs[i].getAttribute('data-pair-id'),pair.id);assert.equal(pairs[i].querySelector(chok?'.ck-he':'.commentary-he').textContent,pair.he);assert.equal(pairs[i].querySelector(chok?'.ck-en':'.commentary-en').textContent,pair.en);});
    for(const q of u.qualifications) {const ns=n.querySelectorAll('[data-note-id]').filter(e=>e.getAttribute('data-note-id')===q.id);assert.equal(ns.length,1);const found=ns[0];assert.equal(found.querySelector('p').textContent,q.text);assert.equal(found.getAttribute('data-note-placement'),q.placement);assert.equal(found.closest('[data-pair-id]')?.getAttribute('data-pair-id') || null,q.placement==='after_pair'?q.pair_id:null);for(const alias of q.aliases)assert(found.textContent.includes(alias.id));assert(!found.closest(chok?'.ck-he':'.commentary-he'));assert(!found.closest(chok?'.ck-en':'.commentary-en'));}
  }
  return d;
}
function select(slug='bereishit', data=null, override={}) {
 const reads=[], units=all.map(u=>({...u,parsha:slug}));
 const index={parshas:{[slug]:{mainIds:units.filter(u=>u.kind==='main').map(u=>u.id),apparatusIds:units.filter(u=>u.kind==='apparatus').map(u=>u.id)}}};
 Object.assign(index.parshas[slug],override);
 const box={Astro:{props:{slug,dataset:data}},process:{cwd:()=>'/synthetic-project'},path,fs:{readFileSync(f){reads.push(f);if(f.endsWith('index.json'))return JSON.stringify(index);if(f.endsWith('master.json'))return JSON.stringify({...chapter,apparatus:[],units});throw Error('Unexpected file');}}};
 const code=source('src/components/QualifiedParsha.astro').split('---')[1].replace(/^import .*;\r?\n/gm,'');
 vm.createContext(box);vm.runInContext(code+'\nglobalThis.value={selection,units,mains,apparatus,readerPath,afterPair,afterOwner};',box);return {value:box.value,reads};
}
test('component original namespace RED: earlier three loaders and actual Reader paths; later namespace compatible',()=>{
 for(const [slug,url] of [['bereishit','1/1'],['noach','1/2'],['lech-lecha','1/3'],['vayeira','1/4']]) {const s=select(slug);assert(s.reads.every(p=>p.includes(slug==='vayeira'?'/qualified-110-171/':'/qualified-1-109/')));assert.equal(s.value.readerPath,url);assert.equal(s.value.units.length,all.length);}
 assert.throws(()=>select('bereishit',null,{mainIds:['missing']}),/Missing qualified source owner/);assert.equal(select().value.units.length,all.length);
});
test('component roles RED: normalized sourceKind and raw kind; all source arrays; context intact',()=>{
 const v=select('bereishit',chapter).value;assert.equal(v.mains.length,5);assert.equal(v.apparatus.length,4);const normalized=structuredClone(chapter);normalized.units.find(u=>u.id===title.id).kind='main';normalized.apparatus[0].kind='main';assert.equal(select('bereishit',normalized).value.mains.length,5);
 const raw=structuredClone(chapter);for(const u of [...raw.units,...raw.apparatus]){u.kind=u.sourceKind;delete u.sourceKind;}
 assert.equal(select('bereishit',raw).value.apparatus.length,4);
 const duplicate={...chapter,apparatus:[aside,main]};assert.equal(select('bereishit',duplicate).value.units.length,all.length);
 const conflicting={...chapter,apparatus:[{...main,pairs:[]}]};assert.throws(()=>select('bereishit',conflicting),/Conflicting/);assert.equal(select('bereishit',chapter).value.units.length,all.length);
 const code=source('src/components/QualifiedParsha.astro');assert(code.includes('data-source-kind={sourceRole(unit)}'));assert(code.includes('Independent weekly source context'));assert(code.includes("!earlier && <p"));
 assert.equal(v.afterPair(main,main.pairs[0]).length,1);assert.equal(v.afterOwner(main).length,1);
});
test('Reader original roles/context RED: complete separate arrays and exact qualification placements',()=>{
 const d=verify(readerHTML());for(const u of all){const n=d.querySelector('[data-source-id="'+u.id+'"]');assert.equal(n.getAttribute('data-source-kind'),u.sourceKind);assert.equal(n.getAttribute('data-owner-main-id'),u.owner_main_id || 'null');}
 for(const u of context)assert(d.querySelector('[data-source-id="'+u.id+'"]').textContent.includes('no verse or daily assignment'));
 assert(!d.querySelectorAll('[data-qualified-group="main"] article').some(n=>[title.id,aside.id].includes(n.getAttribute('data-source-id'))));
 const raw=structuredClone(chapter);raw.units.forEach(u=>{u.kind=u.sourceKind;delete u.sourceKind;});verify(readerHTML(raw));
});
test('Chok original context gate RED: all four null-ref mains conserved, closed weekly group',()=>{
 const r=chokHTML();try{const d=verify(r.html,all,true);const ctx=d.querySelector('.ck-breslov-context');assert(ctx && !ctx.open);assert(ctx.textContent.includes('no verse or daily assignment'));assert.equal(ctx.querySelectorAll('.ck-qualified-unit').length,4);for(const u of context){assert.equal(u.ref,undefined);assert.equal(u.verseRef,null);assert.equal(d.querySelector('[data-source-id="'+u.id+'"]').getAttribute('data-source-kind'),'main');}}finally{r.env.close();}
});
test('Chok original note-owner/role gate RED: note owner retained, null stays null, title/aside not mains',()=>{
 const raw=structuredClone(carrier);for(const u of [...raw.breslov,...raw.breslovApparatus,...raw.breslovContext]){u.kind=u.sourceKind;delete u.sourceKind;}const rawRun=chokHTML(raw);try{assert(documentFor(rawRun.html).querySelector('[data-source-kind="title"]'));}finally{rawRun.env.close();}
 const r=chokHTML();try{const d=documentFor(r.html);for(const u of [note,nullNote,title,aside]){const n=d.querySelector('[data-source-id="'+u.id+'"]');assert.equal(n.getAttribute('data-owner-main-id'),u.owner_main_id || 'null');assert.equal(n.getAttribute('data-source-kind'),u.sourceKind);}assert(d.querySelector('[data-source-id="'+title.id+'"]').textContent.includes('Source title'));assert(d.querySelector('[data-source-id="'+aside.id+'"]').textContent.includes('Compiler aside'));assert(!d.textContent.includes('main ownership remains unassigned'));}finally{r.env.close();}
});
test('Chok original full Noach packet gate RED: description, complete HEEN, URLs and separate commentary',()=>{
 const r=chokHTML();try{const d=documentFor(r.html), weekly=d.querySelector('.ck-breslov-weekly-sources');assert(weekly);assert(weekly.textContent.includes(packet.description));assert(weekly.textContent.includes('no daily verse ownership'));assert(weekly.textContent.includes('Genesis 6:8 closes Biraishis'));for(const seg of packet.segments){const n=weekly.querySelector('[data-source-id="'+seg.sourceBook+':'+seg.index+'"]');assert(n && !n.open);assert.equal(n.querySelector('a').href,seg.sourceUrl);assert.equal(n.querySelector('.ck-source-pair .ck-he').textContent,seg.he);assert.equal(n.querySelector('.ck-source-pair .ck-en').textContent,seg.en);if(seg.commentary){assert.equal(n.querySelector('.ck-weekly-source-commentary .ck-he').textContent,seg.commentary.he);assert.equal(n.querySelector('.ck-weekly-source-commentary .ck-en').textContent,seg.commentary.en);assert(!n.querySelector('.ck-source-pair').textContent.includes(seg.commentary.en));}}for(const n of d.querySelectorAll('details'))assert(!n.open);}finally{r.env.close();}
});
test('portable exact detector rejects lost pair/qualifier/owner and changed language bytes; fresh positives',()=>{
 const html=readerHTML();verify(html);for(const selector of ['[data-note-id]','[data-pair-id]','article']){const d=documentFor(html);d.querySelector(selector).remove();assert.throws(()=>verify(d.innerHTML));}const d=documentFor(html);d.querySelector('.commentary-en').textContent+=' changed';assert.throws(()=>verify(d.innerHTML));verify(html);
 const r=chokHTML();try{verify(r.html,all,true);const d=documentFor(r.html);d.querySelector('.ck-source-qualification').remove();assert.throws(()=>verify(d.innerHTML,all,true));verify(r.html,all,true);}finally{r.env.close();}
});
function fixtureFetcher(overrides={}) {const requests=[];const fn=async url=>{const key=String(url).split('?')[0];requests.push(key);if(Object.hasOwn(overrides,key))return {ok:true,status:200,json:async()=>structuredClone(overrides[key]),text:async()=>JSON.stringify(overrides[key])};return {ok:false,status:404,json:async()=>{throw Error('Synthetic fixture unavailable '+key);}};};fn.requests=requests;return fn;}
async function readerRun(ch, sidebar=false) {
 const earlierIndex={schema:'qualified-parsha-three-consumer-index/v1',chapters:Object.fromEntries(Array.from({length:17},(_,i)=>[i+1,{url:'/reader/breslov-parsha/qualified-1-109/bereishit-'+(i+1)+'.json'}]))};
 const laterIndex={schema:earlierIndex.schema,chapters:Object.fromEntries(Array.from({length:14},(_,i)=>[i+18,{url:'/reader/breslov-parsha/qualified-110-171/bereishit-'+(i+18)+'.json'}]))};
 const f=fixtureFetcher({'/data/breslov-parsha/qualified-1-109/index.json':earlierIndex,'/data/breslov-parsha/qualified-110-171/index.json':laterIndex,[earlierIndex.chapters[3].url]:{...chapter,segments:[{index:1,he:'SYNTHETIC projection',en:'SYNTHETIC projection'}]}});
 const d=documentFor('<html><body><div class="reader-container"><div class="reader-toolbar"><div class="reader-toolbar-group"></div></div></div>'+(sidebar?'<script id="commentary-sidebar-data" type="application/json">null</script>':'')+'</body></html>');
 const env=sandbox(d,'/reader/tanach-bereishit/1/'+ch,f);vm.runInContext(withExport(source('public/reader-script.js'),'getCommentarySources,renderCommentaryContent'),env.box);
 await until(()=>sidebar || f.requests.includes('/data/breslov-parsha/qualified-110-171/index.json'));await tick(40);return {d,env,f};
}
test('Reader FULL init namespace gate RED: Genesis1..17 current, 18..31 old, server sidebar duplicate denied',async()=>{
 const r=await readerRun(3);try{for(let ch=1;ch<=31;ch++){const entries=r.env.box.__qa.getCommentarySources('tanach-bereishit',1,ch);const ns=ch<=17?'qualified-1-109':'qualified-110-171';assert(entries.some(e=>e.id==='breslov-parsha-'+ns && e.url.includes('/'+ns+'/')),'chapter '+ch);if(ch<=17)assert(!entries.some(e=>e.id==='breslov-parsha'));assert(entries.some(e=>e.id.includes('ln') || e.id.includes('likutay') || e.id.includes('nanach')),'unrelated commentary retained');}assert.equal(r.f.requests.filter(x=>x.includes('qualified-1-109/index')).length,1);
 const tab=r.d.querySelector('[data-source-id="breslov-parsha-qualified-1-109"]');assert(tab);tab.click();await until(()=>r.d.querySelector('.qualified-source-content'));const body=r.d.getElementById('commentary-body');verify(body.innerHTML);const b=body.querySelector('[data-qualified-lang="en"]');assert(visible(b));b.click();for(const p of body.querySelectorAll('.commentary-he'))assert(p.hidden);for(const q of body.querySelectorAll('[data-note-id]'))assert(visible(q));body.querySelector('[data-qualified-lang="both"]').click();assert(body.querySelectorAll('[data-qualified-text]').every(p=>!p.hidden));
 }finally{r.env.close();}
 const s=await readerRun(3,true);try{assert(!s.d.getElementById('commentary-panel'));assert(!s.f.requests.some(x=>x.includes('qualified-')));}finally{s.env.close();}
});
async function fullChok() {
 const schedule={weeks:Object.fromEntries(WEEKS.map(w=>[w,{slug:'tanach-bereishit',days:Object.fromEntries(DAY_NAMES.map(d=>[d,{torah:{from:{c:1,v:1},to:{c:1,v:1}}}]))}]))};
 const responses={'/reader/chok/schedule.json':schedule,'/reader/chok/shabbos-map.json':[], '/reader/medooyuk/tanach-bereishit.json':{ch:{1:{1:{t:['סינתטי','פסוק'],m:[],k:[]}}}},'/reader/tanachen/tanach-bereishit.json':{ch:{1:['SYNTHETIC verse English']}}};
 for(const w of WEEKS)for(const slug of DAY_SLUGS)responses['/reader/chok/commentary/'+encodeURIComponent(w)+'-'+slug+'.json']=w==='נח'?carrier:{...carrier,breslovWeeklySources:null};
 for(const url of ['/reader/chok/mishna-bonus.json','/reader/chok/mussar.json','/reader/chok/day-comm.json','/reader/chok/kavanos-chok.json','/reader/chok/kavanos-actual.json','/reader/chok/miluy-kavana.json','/reader/chok/hk-verses.json','/reader/chok/kavanos-torah.json','/reader/medooyuk/targum/tanach-bereishit.json','/reader/rashi/tanach-bereishit.json','/reader/rashi/en/tanach-bereishit.json'])responses[url]={weeks:{},days:{},ch:{}};
 const f=fixtureFetcher(responses);const ids=['ck-date','ck-week','ck-content','ck-parsha','ck-mode','ck-medooyuk','ck-targum','ck-rashi','ck-commentary','ck-tanachen','ck-carrymode','ck-kavanamode','ck-size','ck-legend','ck-days'];
 const d=documentFor('<html><body>'+ids.map(id=>'<'+(id==='ck-parsha'?'select':id==='ck-content'||id==='ck-days'?'div':'input')+' id="'+id+'"></'+(id==='ck-parsha'?'select':id==='ck-content'||id==='ck-days'?'div':'input')+'>').join('')+'</body></html>');
 const env=sandbox(d,'/reader/chok/',f);env.box.location.search='?week='+encodeURIComponent('נח')+'&day='+encodeURIComponent(DAY_NAMES[0]);
 // Synthetic annotation dependency only; actual annotation acceptance remains a parent gate.
 env.box.window.AjewMarkedHebrew={applyBook:d=>d,renderVerse:v=>v.t.join(' ')};
 vm.runInContext(source('public/chok.js'),env.box);try{await until(()=>d.querySelector('.ck-breslov') && !d.querySelector('.ck-loading'));}catch(e){env.close();throw e;}return {d,env,f};
}
test('Chok FULL init/lifecycle gate RED: weekly sources on7Noach days, native-model closed/visible, HE/EN qualifiers, week change',async()=>{
 const r=await fullChok();try{const body=r.d.getElementById('ck-content');verify(body.innerHTML,all,true);let root=body.querySelector('.ck-breslov');for(const det of root.querySelectorAll('details'))assert(!det.open);assert(!root.open);
 const en=root.querySelector('[data-ck-source-lang="en"]');assert(en && !visible(en));root.querySelector('summary').click();assert(visible(en));const mainDisclosure=root.querySelector('.ck-qualified-disclosure');assert(mainDisclosure && !mainDisclosure.open);assert(!visible(mainDisclosure.querySelector('.ck-he')));mainDisclosure.querySelector('summary').click();assert(visible(mainDisclosure.querySelector('.ck-he')));en.click();assert(root.querySelectorAll('.ck-he').every(p=>p.hidden));assert(root.querySelectorAll('.ck-en').every(p=>!p.hidden));for(const q of root.querySelectorAll('.ck-source-qualification'))assert(!q.hidden);root.querySelector('[data-ck-source-lang="he"]').click();assert(root.querySelectorAll('.ck-en').every(p=>p.hidden));root.querySelector('[data-ck-source-lang="both"]').click();assert(root.querySelectorAll('.ck-he,.ck-en').every(p=>!p.hidden));
 const weekly=root.querySelector('.ck-breslov-weekly-sources');assert(weekly);weekly.querySelector('summary').click();assert(visible(weekly.querySelector('.ck-weekly-source summary')));const detail=weekly.querySelector('.ck-weekly-source');assert(!visible(detail.querySelector('.ck-he')));detail.querySelector('summary').click();assert(visible(detail.querySelector('.ck-he')));detail.querySelector('summary').click();assert(!visible(detail.querySelector('.ck-he')));
 for(let i=0;i<7;i++){r.d.getElementById('ck-days').children[i].click();await until(()=>!body.querySelector('.ck-loading'));assert(body.querySelector('.ck-breslov-weekly-sources'),'Noach day '+i);assert(!body.querySelector('.ck-breslov').open);verify(body.innerHTML,all,true);}
 const toggle=r.d.getElementById('ck-commentary');assert(visible(toggle));toggle.checked=false;toggle.dispatchEvent({type:'change'});await until(()=>!body.querySelector('.ck-loading'));assert(!body.querySelector('.ck-breslov'));toggle.checked=true;toggle.dispatchEvent({type:'change'});await until(()=>body.querySelector('.ck-breslov'));assert(!body.querySelector('.ck-breslov').open);
 const week=r.d.getElementById('ck-parsha');week.value='לך לך';week.dispatchEvent({type:'change'});await until(()=>!body.querySelector('.ck-loading'));assert(!body.querySelector('.ck-breslov-weekly-sources'));assert(body.querySelector('.ck-breslov-context'));assert(!body.textContent.includes(packet.description));
 }finally{r.env.close();}
});
test('later110171 source arrays and unchanged legacy nonqualified Chok retained; notices verbatim',()=>{
 verify(readerHTML(older),[...older.units,...older.apparatus]);const r=chokHTML({breslov:[{ref:'SYNTHETIC legacy',he:'סינתטי ישן',en:'SYNTHETIC old English'}],verses:[{he:'סינתטי ביאור',en:'SYNTHETIC other commentary'}]});try{assert(r.html.includes('SYNTHETIC old English'));assert(r.html.includes('SYNTHETIC other commentary'));assert(!r.html.includes('ck-breslov-context'));assert(!r.html.includes('ck-breslov-weekly-sources'));}finally{r.env.close();}
 const oldCarrier={breslov:older.units.map(u=>({...u,sourceId:u.id})),breslovApparatus:older.apparatus.map(u=>({...u,sourceId:u.id}))};const q=chokHTML(oldCarrier);try{assert(q.html.includes('Standalone source bodies; main ownership remains unassigned.'));}finally{q.env.close();}
 assert(source('src/components/QualifiedParsha.astro').includes('Independent apparatus is not assigned to a main teaching.'));
});
test('qualified later Chok language controls RED: actual absent role hints do not disable HE/EN/Both',()=>{
 const oldCarrier={breslov:older.units.map(u=>({...u,sourceId:u.id})),breslovApparatus:older.apparatus.map(u=>({...u,sourceId:u.id})),breslovScopeNotice:'SYNTHETIC later qualified scope'};
 const r=chokHTML(oldCarrier);
 try {
  verify(r.html,[...older.units,...older.apparatus],true);
  r.d.body.innerHTML=r.html;
  const root=r.d.querySelector('details.ck-breslov');assert(root && !root.open);
  const buttons=root.querySelectorAll('[data-ck-source-lang]');assert.equal(buttons.length,3,'Qualified later sources need their own three language controls');
  root.querySelector('summary').click();for(const detail of root.querySelectorAll('details'))detail.querySelector('summary').click();
  for(const lang of ['he','en','both']) {
   const button=root.querySelector('[data-ck-source-lang="'+lang+'"]');assert(visible(button));button.click();assert.equal(root.dataset.language,lang);
   for(const he of root.querySelectorAll('.ck-he'))assert.equal(he.hidden,lang==='en');
   for(const en of root.querySelectorAll('.ck-en'))assert.equal(en.hidden,lang==='he');
   for(const q of root.querySelectorAll('.ck-source-qualification'))assert(visible(q));
  }
 } finally {r.env.close();}
});

test('actual standalone/full Chumash branches RED: prefer169, use runtime JSON/masterURL, preserve supplements/PDF/legacy edition',()=>{
 const parsha=source('src/pages/parsha/[slug].astro'),chumash=source('src/pages/reader/chumash-lh/[part]/[torah].astro'),genesis=source('src/pages/reader/tanach-bereishit/[part]/[torah].astro');
 for(const slug of ['bereishit','noach','lech-lecha'])assert(parsha.match(/const hasQualifiedParsha = [^;]+/)[0].includes("'"+slug+"'"));
 assert(parsha.includes('!hasQualifiedParsha &&'));assert(parsha.includes('distinct legacy selections'));assert(parsha.includes('<ParshaSourceSupplement packet={sourceSupplement} />'));assert(parsha.includes('Download PDF'));
 assert(chumash.includes("1: 'bereishit', 2: 'noach', 3: 'lech-lecha'"));assert(chumash.includes('dataset={earlierQualified ? torahData : null}'));assert(chumash.includes("qualifiedMasterUrl !== '/data/breslov-parsha/qualified-1-109/master.json'"));assert(chumash.indexOf(': qualifiedSlug ? (')<chumash.indexOf('class="reader-container"'));assert(chumash.includes('<ParshaSourceSupplement packet={sourceSupplement} />'));assert(chumash.includes('View Original PDF'));
 assert(genesis.includes("? 'qualified-1-109' : 'qualified-110-171'"));assert(genesis.includes('<CommentarySidebar part={partNum} torah={torahNum} entry={commentaryEntry} />'));assert(genesis.includes('<QualifiedParsha dataset={qualifiedChapterData} />'));
});
test('owned Astro asset pins use exact new version; JS syntax, portable tests carry no private source prerequisites',()=>{
 for(const f of ['src/pages/reader/chumash-lh/[part]/[torah].astro','src/pages/reader/tanach-bereishit/[part]/[torah].astro'])assert(source(f).includes('?v=parsha-all-processed-20261012-r1'));
 assert(source('src/pages/reader/chok.astro').includes('/chok.js?v=reader-notes-20261015-r3'));
 for(const f of ['public/chok.js','public/reader-script.js'])new vm.Script(source(f),{filename:f});
});

async function routeFrontmatter(file, params, fixtures, names) {
 const reads=[], box={Astro:{params,props:{},redirect:x=>x},process:{cwd:()=>'/synthetic-project'},path,hkIndex:{},console,
   fs:{existsSync:()=>false,readFileSync(f){reads.push(f);const key=f.replace('/synthetic-project/','');assert(Object.hasOwn(fixtures,key),'Undeclared synthetic read '+key);return JSON.stringify(fixtures[key]);}}};
 let code=source(file).split('---')[1].replace(/^import .*;\r?\n/gm,'').replace(/export function /g,'function ');
 code=(await dependencies('esbuild').transform(code,{loader:'ts',format:'cjs'})).code;
 vm.createContext(box);vm.runInContext(code+'\nglobalThis.route={'+names+'};',box);return {value:box.route,reads};
}
test('actual Genesis SSR frontmatter discovers all31 exported chapter URLs, preserves unrelated sidebar entries',async()=>{
 const earlierIndex={chapters:Object.fromEntries(Array.from({length:17},(_,i)=>[i+1,{url:'/reader/breslov-parsha/qualified-1-109/bereishit-'+(i+1)+'.json'}]))};
 const laterIndex={chapters:Object.fromEntries(Array.from({length:14},(_,i)=>[i+18,{url:'/reader/breslov-parsha/qualified-110-171/bereishit-'+(i+18)+'.json'}]))};
 for(let ch=1;ch<=31;ch++) {
  const namespace=ch<=17?'qualified-1-109':'qualified-110-171',url='/reader/breslov-parsha/'+namespace+'/bereishit-'+ch+'.json';
  const r=await routeFrontmatter('src/pages/reader/tanach-bereishit/[part]/[torah].astro',{part:'1',torah:String(ch)},{
   ['public/reader/tanach-bereishit/part-1/torah-'+ch+'.json']:{id:'synthetic-chapter',title:'SYNTHETIC chapter',segments:[]},
   'public/data/breslov-parsha/qualified-1-109/index.json':earlierIndex,'public/data/breslov-parsha/qualified-110-171/index.json':laterIndex,
   ['public'+url]:chapter},'qualifiedChapterData,qualifiedBreslovEntry,commentaryEntry');
  assert.equal(r.value.qualifiedBreslovEntry.url,url);assert.deepEqual(JSON.parse(JSON.stringify(r.value.qualifiedChapterData)),chapter);
  assert(r.value.commentaryEntry.related_commentaries.some(c=>c.book==='likutay-nanach'));assert(r.reads.includes('/synthetic-project/public'+url));
  if(ch<=17)assert(!r.value.commentaryEntry.related_commentaries.some(c=>c.book==='breslov-parsha'));
 }
});
test('actual full Chumash SSR frontmatter reads earlier runtime units/masterURL, rejects stale schema without junk fallback',async()=>{
 for(let n=1;n<=3;n++){
  const file='public/reader/chumash-lh/part-1/torah-'+n+'.json';
  const runtime={...chapter,schema:'qualified-parsha-runtime-selection/v1',qualifiedMasterUrl:'/data/breslov-parsha/qualified-1-109/master.json',title:'SYNTHETIC full runtime',navigation:{},units:all,segments:[]};
  const r=await routeFrontmatter('src/pages/reader/chumash-lh/[part]/[torah].astro',{part:'1',torah:String(n)},{[file]:runtime},'torahData,qualifiedSlug,earlierQualified,error');
  assert.equal(r.value.earlierQualified,true);assert.equal(r.value.error,null);assert.deepEqual(JSON.parse(JSON.stringify(r.value.torahData.units)),all);
  const bad=await routeFrontmatter('src/pages/reader/chumash-lh/[part]/[torah].astro',{part:'1',torah:String(n)},{[file]:{...runtime,schema:'legacy'}},'error');assert.equal(bad.value.error,'Current qualified source selection unavailable');
 }
});
test('actual unchanged Sidebar FULL init and route bridge; synthetic template, real QP client language, ancestor controls',async()=>{
 // Template is produced by the actual Reader helper on SYNTHETIC units, NOT claimed Astro SSR.
 const shared=fs.readFileSync(path.resolve(__dirname,'../src/components/CommentarySidebar.astro'),'utf8');
 const sidebarScript=shared.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
 const bridge=source('src/pages/reader/tanach-bereishit/[part]/[torah].astro').match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
 const qualified={book:'breslov-parsha-qualified-1-109',section:'bereishit-3',label:'SYNTHETIC qualified',sectionTitle:'Qualified supplied source selections',url:'/reader/breslov-parsha/qualified-1-109/bereishit-3.json'};
 const other={book:'synthetic-other-source',section:'other',label:'SYNTHETIC unrelated',sectionTitle:'Other source',url:'/reader/synthetic-other.json'};
 const entry={related_commentaries:[qualified,other]},tabId='c-0-'+qualified.book;
 const d=documentFor('<html><body><button id="commentary-sidebar-toggle"></button><button id="commentary-sidebar-handle"></button><div id="commentary-sidebar"><button id="commentary-sidebar-close"></button><div id="commentary-sidebar-tabs"></div><div id="commentary-sidebar-body"></div></div><script id="commentary-sidebar-data" type="application/json">'+JSON.stringify(entry)+'</script><template id="qualified-chapter-template" data-tab-id="'+tabId+'">'+readerHTML()+'</template></body></html>');
 const f=fixtureFetcher({[qualified.url]:{segments:[{index:1,he:'SYNTHETIC projection only',en:'SYNTHETIC projection only'}]},[other.url]:{segments:[{index:1,he:'סינתטי אחר',en:'SYNTHETIC unrelated body'}]}});
 const env=sandbox(d,'/reader/tanach-bereishit/1/3',f);
 const qpClient=source('src/components/QualifiedParsha.astro').match(/<script>([\s\S]*?)<\/script>/)[1];
 try{
  vm.runInContext((await dependencies('esbuild').transform(qpClient,{loader:'ts'})).code,env.box);
  vm.runInContext(sidebarScript,env.box);vm.runInContext(bridge,env.box);
  const body=d.getElementById('commentary-sidebar-body');await until(()=>body.querySelector('[data-qualified-parsha]'));verify(body.innerHTML);
  const toggle=d.getElementById('commentary-sidebar-toggle');assert(visible(toggle));if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');assert(d.getElementById('commentary-sidebar').classList.contains('is-open'));
  for(const lang of ['he','en','both']){const b=body.querySelector('[data-qualified-lang="'+lang+'"]');assert(visible(b));b.click();for(const text of body.querySelectorAll('[data-qualified-text]'))assert.equal(text.hidden,lang!=='both' && text.getAttribute('data-qualified-text')!==lang);for(const q of body.querySelectorAll('[data-note-id]'))assert(visible(q));}
  d.getElementById('commentary-sidebar-tabs').children[1].click();await until(()=>body.textContent.includes('SYNTHETIC unrelated body') || body.textContent.includes('סינתטי אחר'));assert(!body.querySelector('[data-qualified-parsha]'));
  d.getElementById('commentary-sidebar-tabs').children[0].click();await until(()=>body.querySelector('[data-qualified-parsha]'));verify(body.innerHTML);assert.equal(body.querySelector('[data-qualified-parsha]').dataset.language,'both');
  d.getElementById('commentary-sidebar-close').click();assert.equal(toggle.getAttribute('aria-expanded'),'false');d.getElementById('commentary-sidebar-handle').click();assert.equal(toggle.getAttribute('aria-expanded'),'true');env.box.window.dispatchEvent({type:'pagehide'});
 }finally{env.close();}
});

module.exports.payloadFixtures={chapter,older,carrier,packet};
