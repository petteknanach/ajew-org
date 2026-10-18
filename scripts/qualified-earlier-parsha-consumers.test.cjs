// Portable consumer regressions: synthetic fixtures remain explicitly labeled.
// Real public exports are exercised separately; no private source authority or
// whole-book/source acceptance is required or claimed. Native DOM is modeled.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {documentFor, sandbox, until, tick, visible, dependencies} = require('./qualified-earlier-parsha-test-dom.cjs');
const ROOT = process.env.EARLIER_CONSUMER_ROOT || path.resolve(__dirname, '..');
const source = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Import the real module, including its fs-backed discovery/selection logic.
const qualifiedAPI = require(path.join(ROOT, 'src/lib/qualified-parsha.mjs'));
const json = f => JSON.parse(source(f));
const indexes = () => qualifiedAPI.qualifiedIndexes(ROOT);
const plain = value => JSON.parse(JSON.stringify(value));
const declaredQualified = {
 ...qualifiedAPI,
 qualifiedIndexes: () => indexes(),
 qualifiedParsha: slug => qualifiedAPI.qualifiedParsha(slug, indexes(), ROOT),
 qualifiedChapter: ch => qualifiedAPI.qualifiedChapter(ch, indexes(), ROOT),
};
const ROUTES = {bereishit:'1/1',noach:'1/2','lech-lecha':'1/3',vayeira:'1/4','chayei-sarah':'1/5',toldot:'1/6',vayeitzei:'1/7',vayishlach:'1/8',vayeishev:'1/9',mikeitz:'1/10',vayigash:'1/11',vayechi:'1/12'};
function emittedChokScripts() {
 const scripts=[...source('src/pages/reader/chok.astro').matchAll(/<script src="([^"?]+)[^"]*" defer><\/script>/g)].map(m=>'public'+m[1]);
 assert.deepEqual(scripts.slice(-3),['public/chok-verse-breslov.js','public/chok-source-reader.js','public/chok.js']);
 return scripts;
}
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
function oneFunction(code,name) {const match=code.match(new RegExp('^( *)function '+name+'\\(', 'm'));assert(match,name);const start=match.index,close='\n'+match[1]+'}',at=code.indexOf(close,start);assert(at>start);return code.slice(start,at+close.length);}
function readerHTML(data=chapter) {
 const code=source('public/reader-script.js'),box={document:{addEventListener(){}}};
 // Execute the real dependency closure, never a synthetic null-binding stub.
 const start=code.indexOf('// BEGIN source-bound note89/v1'),end=code.indexOf('// END source-bound note89/v1',start);
 assert(start>=0&&end>start);vm.createContext(box);
 vm.runInContext(code.slice(start,end)+oneFunction(code,'note89QualificationText')+'\n'+oneFunction(code,'qualifiedSourceHTML')+';globalThis.render=qualifiedSourceHTML;',box);
 return box.render(data);
}
function chokHTML(data=carrier) {const d=documentFor('<html><body></body></html>');d.readyState='loading';const env=sandbox(d,'/reader/chok/',async()=>{throw Error('No helper fetch');});vm.runInContext(withExport(source('public/chok.js'),'commentaryHTML'),env.box);return {env,d,html:env.box.__qa.commentaryHTML(data)?.layers || ''};}
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
function verify(html, scope=all, chok=false) {
  const d=documentFor(html), nodes=d.querySelectorAll(chok?'.ck-qualified-unit':'article[data-source-id]');
  assert.equal(nodes.length,scope.length,'Each source owner exactly once');
  const binding=qualifiedAPI.note89Binding(scope),targets=d.querySelectorAll('[data-note89-target]');
  assert.equal(targets.length,binding?1:0);assert.equal(d.querySelectorAll('[data-note89-ref]').length,binding?2:0);
  if(binding){assert.equal(binding.mainId,'b-p146-m01');assert.equal(binding.noteId,'b-p146-n01');assert.equal(binding.pairId,'146-body');assert.equal(binding.number,'89');assert.equal(targets[0].getAttribute('data-source-id'),binding.noteId);}
  for(const u of scope) {
    const matches=nodes.filter(n=>n.getAttribute('data-source-id')===u.id);assert.equal(matches.length,1,u.id);const n=matches[0];
    const pairs=n.querySelectorAll('[data-pair-id]');assert.equal(pairs.length,u.pairs.length);
    u.pairs.forEach((pair,i)=>{assert.equal(pairs[i].getAttribute('data-pair-id'),pair.id);const annotated=!!binding&&u.id===binding.mainId&&pair.id===binding.pairId;exactField(pairs[i].querySelector(chok?'.ck-he':'.commentary-he'),pair,'he',annotated,targets[0]);exactField(pairs[i].querySelector(chok?'.ck-en':'.commentary-en'),pair,'en',annotated,targets[0]);});
    const notes=n.querySelectorAll('[data-note-id]');assert.equal(notes.length,u.qualifications.length,'No lost or extra qualification occurrences');
    // A documentary ID can have multiple distinct notices even at one pair.
    // Preserve their exact scoped multiplicity and source order, not ID uniqueness.
    for(const [index,q] of u.qualifications.entries()) {
      const pair=q.placement==='after_pair'&&u.pairs.some(p=>p.id===q.pair_id)?q.pair_id:null;
      const same=other=>other.id===q.id&&other.placement===q.placement&&(other.placement==='after_pair'&&u.pairs.some(p=>p.id===other.pair_id)?other.pair_id:null)===pair;
      const ns=notes.filter(e=>e.getAttribute('data-note-id')===q.id&&e.getAttribute('data-note-placement')===q.placement&&(e.closest('[data-pair-id]')?.getAttribute('data-pair-id')||null)===pair);
      assert.equal(ns.length,u.qualifications.filter(same).length,'Exact ID/placement/pair multiplicity '+u.id+' '+q.id);
      const found=ns[u.qualifications.slice(0,index).filter(same).length];assert(found);assert.equal(found.querySelector('p').textContent,noteText(q));
      assert.equal(found.closest('[data-source-id]').getAttribute('data-source-id'),u.id,'Qualification occurrence owner');assert(!found.closest(chok?'.ck-he':'.commentary-he'));assert(!found.closest(chok?'.ck-en':'.commentary-en'));
    }
  }
  return d;
}
function select(slug='bereishit', data=null, override={}) {
 const reads=[], realRead=fs.readFileSync;
 const box={Astro:{props:{slug,dataset:data}},...declaredQualified,
  qualifiedParsha(value) {
   const current=indexes().map(row=>({...row,index:{...row.index,parshas:{...row.index.parshas}}}));
   for(const row of current)if(row.index.parshas[value])row.index.parshas[value]={...row.index.parshas[value],...override};
   return qualifiedAPI.qualifiedParsha(value,current,ROOT);
  }};
 const code=source('src/components/QualifiedParsha.astro').split('---')[1].replace(/^import .*;\r?\n/gm,'');
 vm.createContext(box);
 // Transparent I/O witness only: no synthetic success values or fs mutation on disk.
 fs.readFileSync=function(f,...args){reads.push(String(f));return realRead.call(this,f,...args);};
 try{vm.runInContext(code+'\nglobalThis.value={selection,units,mains,apparatus,readerPath,afterPair,afterOwner};',box);}finally{fs.readFileSync=realRead;}
 return {value:box.value,reads};
}
test('component original namespace RED: earlier three loaders and actual Reader paths; later namespace compatible',()=>{
 assert.deepEqual(plain(qualifiedAPI.PARSHA_READER),ROUTES);
 for(const [slug,url] of Object.entries(ROUTES)) {
  const selected=select(slug), rows=indexes().filter(r=>r.index.parshas[slug]);
  const expected=rows.flatMap(r=>{const c=r.index.parshas[slug],m=json('public'+r.index.masterUrl);return [...c.mainIds,...c.apparatusIds].map(id=>[...(m.units||[]),...(m.apparatus||[])].find(u=>u.id===id));});
  assert.equal(selected.value.readerPath,url);assert.deepEqual(plain(selected.value.units),expected);
  for(const row of rows)assert(selected.reads.includes(path.join(ROOT,'public',row.index.masterUrl)),'Actual namespaced master read');
 }
 assert.throws(()=>select('bereishit',null,{mainIds:['missing']}),/Missing qualified source owner/);
 assert.deepEqual(plain(select().value.units),plain(declaredQualified.qualifiedParsha('bereishit').selection.units));
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
 const r=chokHTML();try{const d=verify(r.html,all,true);const ctx=d.querySelector('.ck-breslov-context');assert(ctx && !ctx.open);assert.equal(ctx.querySelectorAll('[data-pair-id]').length,context.reduce((n,u)=>n+u.pairs.length,0));assert(!ctx.closest('.ck-verse'));for(const n of ctx.querySelectorAll('[data-source-id]'))assert.equal(n.getAttribute('data-allocation-scope'),'weekly-context');assert.equal(ctx.querySelectorAll('.ck-qualified-unit').length,4);for(const u of context){assert.equal(u.ref,undefined);assert.equal(u.verseRef,null);assert.equal(d.querySelector('[data-source-id="'+u.id+'"]').getAttribute('data-source-kind'),'main');}}finally{r.env.close();}
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
 // The real bound paragraph must remain complete; annotations are not source text.
 const selected=declaredQualified.qualifiedParsha('vayeitzei').selection,positive=readerHTML(selected);verify(positive,selected.units);
 const mutations=[
  ['changed source span',d=>{d.querySelector('[data-source-field]').textContent+=' changed';}],
  ['missing reference',d=>d.querySelector('[data-note89-marker]').remove()],
  ['wrong reference number',d=>{d.querySelector('[data-note89-ref]').textContent='90';}],
  ['wrong target',d=>d.querySelector('[data-note89-ref]').setAttribute('href','#wrong')],
  ['reference before source',d=>{const s=d.querySelector('[data-source-field]');s.parentNode.insertBefore(s.nextSibling,s);}],
  ['unbound suffix',d=>{d.querySelector('[data-source-field]').parentNode.appendChild(d.createTextNode(' extra'));}],
 ];
 for(const [name,mutate]of mutations){const d=documentFor(positive);mutate(d);assert.throws(()=>verify(d.innerHTML,selected.units),name);verify(positive,selected.units);}
 console.log('NOTE89_HARNESS_MUTATIONS '+JSON.stringify({rejected:mutations.map(([name])=>name),freshPositives:mutations.length}));
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
function projectedWeekly(slug) {
 const runtime=json('public/reader/chumash-lh/part-1/torah-'+(slug==='noach'?2:3)+'.json');
 const policy=json('public/reader/chok/breslov-reading-notes.json'), portion=slug==='noach'?'Noach':'Lech';
 const rows=policy.notes.filter(q=>q.portion===portion);
 const units=runtime.units.map(u=>({...u,qualifications:u.qualifications.flatMap(q=>{
  const matches=rows.filter(r=>r.id===q.id&&r.owner===u.id&&r.pair_id===q.pair_id&&r.placement===q.placement);
  assert.equal(matches.length,1,'Exact declared projection disposition '+q.id);
  return matches[0].readerText===null?[]:[{...q,text:matches[0].readerText}];
 })}));
 assert.equal(rows.length,runtime.units.reduce((n,u)=>n+u.qualifications.length,0));
 return {runtime,units,scope:policy.scopes[portion]};
}
function verifyWeekly(html, expected) {
 const d=documentFor(html),nodes=d.querySelectorAll('[data-bop-unit]');assert.equal(nodes.length,expected.units.length,'Every current weekly owner once');
 for(const u of expected.units) {
  const matches=nodes.filter(n=>n.getAttribute('data-bop-unit')===u.id);assert.equal(matches.length,1,u.id);const n=matches[0];
  assert.equal(n.getAttribute('data-source-kind'),u.sourceKind||u.source_kind||(u.kind==='apparatus'?'note':u.kind));
  assert.equal(n.getAttribute('data-owner-main-id'),String(u.owner_main_id??u.ownerMainId??'null'));
  assert.equal(n.getAttribute('data-verse-ref'),JSON.stringify(u.verseRef));
  const ps=n.querySelectorAll('[data-pair-id]');assert.equal(ps.length,u.pairs.length);
  u.pairs.forEach((p,i)=>{assert.equal(ps[i].getAttribute('data-pair-id'),p.id);for(const lang of ['he','en'])assert.equal(ps[i].querySelector('.ck-'+lang).textContent,p[lang]);});
  const qs=n.querySelectorAll('[data-note-id]');assert.equal(qs.length,u.qualifications.length);
  u.qualifications.forEach((q,i)=>{const el=qs[i];assert.equal(el.getAttribute('data-note-id'),q.id);assert.equal(el.querySelector('[data-note-text]').textContent,q.text);assert.equal(el.getAttribute('data-note-owner'),u.id);assert.equal(el.getAttribute('data-note-pair'),q.pair_id===null?'null':q.pair_id);assert.equal(el.getAttribute('data-note-placement'),q.placement);assert.equal(el.getAttribute('data-note-display-placement'),'owner-local');assert(!el.closest('.ck-qualified-disclosure'));assert(!el.closest('.ck-he'));assert(!el.closest('.ck-en'));});
 }
 const scope=d.querySelector('[data-breslov-scope]');assert(scope);assert.equal(scope.textContent,expected.scope);
 return d;
}
async function fullChok() {
 const template=source('src/pages/reader/chok.astro'),inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const requests=[], f=async url=>{const key=String(url).split('?')[0];requests.push(key);const file=path.join(ROOT,'public',key);const ok=fs.existsSync(file);const raw=ok?fs.readFileSync(file,'utf8'):'';return {ok,status:ok?200:404,text:async()=>raw,json:async()=>JSON.parse(raw)};};f.requests=requests;
 const d=documentFor('<html><body>'+inner+'</body></html>'),env=sandbox(d,'/reader/chok/',f);
 env.box.location.search='?week='+encodeURIComponent('נח')+'&day='+encodeURIComponent(DAY_NAMES[0]);
 try{for(const file of emittedChokScripts())vm.runInContext(file==='public/chok.js'?withExport(source(file),'state'):source(file),env.box,{filename:file});await until(()=>d.querySelector('#ck-breslov-offering-body .ck-breslov')&&!d.querySelector('.ck-loading'),30000);assert(!d.querySelector('.ck-error'));return {d,env,f,state:env.box.__qa.state};}catch(e){env.close();throw e;}
}
test('Chok FULL init/lifecycle gate RED: weekly sources on7Noach days, native-model closed/visible, HE/EN qualifiers, week change',async()=>{
 const r=await fullChok();try{
 const body=r.d.getElementById('ck-content'),offering=r.d.getElementById('ck-breslov-offering'),weeklyBody=r.d.getElementById('ck-breslov-offering-body'),expected=projectedWeekly('noach');
 verifyWeekly(weeklyBody.innerHTML,expected);
 const positive=weeklyBody.innerHTML,mutations=[
  ['lost owner',d=>d.querySelector('[data-bop-unit]').remove()],
  ['lost pair',d=>d.querySelector('[data-pair-id]').remove()],
  ['lost qualification',d=>d.querySelector('[data-note-id]').remove()],
  ['changed Hebrew',d=>{d.querySelector('.ck-he').textContent+=' changed';}],
  ['changed English',d=>{d.querySelector('.ck-en').textContent+=' changed';}],
  ['changed qualifier',d=>{d.querySelector('[data-note-text]').textContent+=' changed';}],
  ['wrong owner',d=>d.querySelector('[data-bop-unit]').setAttribute('data-owner-main-id','wrong')],
  ['wrong qualifier pair',d=>d.querySelector('[data-note-id]').setAttribute('data-note-pair','wrong')],
  ['wrong qualifier placement',d=>d.querySelector('[data-note-id]').setAttribute('data-note-placement','wrong')],
 ];
 for(const [name,mutate] of mutations){const d=documentFor(positive);mutate(d);assert.throws(()=>verifyWeekly(d.innerHTML,expected),name);verifyWeekly(positive,expected);}
 console.log('REAL_WEEKLY_MUTATIONS '+JSON.stringify({rejected:mutations.map(([name])=>name),freshPositives:mutations.length}));
 assert(!offering.open);let root=weeklyBody.querySelector('.ck-breslov');for(const det of root.querySelectorAll('details'))assert(!det.open);assert(!root.open);
 const en=root.querySelector('[data-ck-source-lang="en"]');assert(en&&!visible(en));offering.querySelector('summary').click();root.querySelector('summary').click();assert(visible(en));
 const mainDisclosure=root.querySelector('.ck-qualified-disclosure');assert(mainDisclosure&&!mainDisclosure.open);assert(!visible(mainDisclosure.querySelector('.ck-he')));mainDisclosure.querySelector('summary').click();assert(visible(mainDisclosure.querySelector('.ck-he')));
 const prescribedBefore=body.innerHTML;
 for(const lang of ['en','he','both']){root.querySelector('[data-ck-source-lang="'+lang+'"]').click();assert.equal(root.dataset.language,lang);for(const text of root.querySelectorAll('.ck-he,.ck-en'))assert.equal(text.hidden,lang!=='both'&&!text.classList.contains('ck-'+lang));for(const q of root.querySelectorAll('.ck-source-qualification'))assert(!q.hidden);assert.equal(body.innerHTML,prescribedBefore,'Weekly language cannot alter prescribed study');}
 const supplement=root.querySelector('.ck-breslov-supplement');assert(supplement&&!supplement.open);assert(!visible(supplement.querySelector('.ck-he')));supplement.querySelector('summary').click();assert(visible(supplement.querySelector('.ck-he')));supplement.querySelector('summary').click();assert(!visible(supplement.querySelector('.ck-he')));
 const segs=expected.runtime.sourceSupplement.segments, rendered=supplement.querySelectorAll('[data-supplement-segment]');assert.equal(rendered.length,segs.length);
 segs.forEach((seg,i)=>{const n=rendered[i];assert.equal(n.querySelector('a').href,seg.sourceUrl);for(const lang of ['he','en'])assert.equal(n.querySelector('.ck-'+lang).textContent,seg[lang]);if(seg.commentary)for(const lang of ['he','en'])assert.equal(n.querySelector('.ck-supplement-gematria .ck-'+lang).textContent,seg.commentary[lang]);});
 for(let i=0;i<7;i++){r.d.getElementById('ck-days').children[i].click();try{await until(()=>!body.querySelector('.ck-loading'),30000);}catch(e){throw Error('Noach day '+DAY_NAMES[i]+': '+e.message+'; error='+(body.querySelector('.ck-error')?.textContent||'none')+'; recent requests='+JSON.stringify(r.f.requests.slice(-12)));}assert(weeklyBody.querySelector('.ck-breslov-supplement'),'Noach day '+i);assert(!weeklyBody.querySelector('.ck-breslov').open);verifyWeekly(weeklyBody.innerHTML,expected);}
 // Commentary now governs daily commentary, not the independently offered weekly edition.
 const options=r.d.getElementById('ck-commentary').closest('details');assert(options&&!options.open);options.querySelector('summary').click();const toggle=r.d.getElementById('ck-commentary');assert(visible(toggle));assert.equal(r.state.commentary,true);const beforeToggle=r.f.requests.filter(u=>u.includes('/chok/commentary/')).length;toggle.checked=false;toggle.dispatchEvent({type:'change'});assert.equal(r.state.commentary,false);await until(()=>!body.querySelector('.ck-loading'),30000);assert.equal(r.f.requests.filter(u=>u.includes('/chok/commentary/')).length,beforeToggle,'Commentary off must not acquire day commentary');verifyWeekly(weeklyBody.innerHTML,expected);toggle.checked=true;toggle.dispatchEvent({type:'change'});assert.equal(r.state.commentary,true);await until(()=>!body.querySelector('.ck-loading'),30000);verifyWeekly(weeklyBody.innerHTML,expected);assert(!weeklyBody.querySelector('.ck-breslov').open);
 const actualEarlier=declaredQualified.qualifiedParsha('bereishit').selection,api=r.env.box.window.ChokVerseBreslov;
 const earlierDoc=verifyWeekly(api.weekly('בראשית'),{units:actualEarlier.units,scope:actualEarlier.scopeNotice});
 const earlierContext=actualEarlier.units.filter(u=>(u.sourceKind||u.source_kind||u.kind)==='main'&&!u.verseRef);assert.equal(earlierContext.length,4,'All original four real null-ref mains');
 const verseDoc=documentFor(api.verse('בראשית','tanach-bereishit',3,1));
 for(const u of earlierContext){const n=earlierDoc.querySelector('[data-bop-unit="'+u.id+'"]'),group=n.closest('.ck-weekly-unowned');assert(group&&!group.open);assert(group.querySelector('summary').textContent.includes('without a verse assignment'));assert.equal(n.getAttribute('data-verse-ref'),'null');assert(!verseDoc.querySelector('[data-bop-unit="'+u.id+'"]'),'Weekly context cannot become Genesis 3:1');}
 console.log('REAL_EARLIER_CONTEXT '+JSON.stringify({owners:actualEarlier.units.length,nullRefMains:earlierContext.length,assignedToGenesis3v1:0}));
 const week=r.d.getElementById('ck-parsha');week.value='לך לך';week.dispatchEvent({type:'change'});await until(()=>!body.querySelector('.ck-loading'),30000);assert(!weeklyBody.querySelector('.ck-breslov-supplement'));assert(weeklyBody.querySelector('.ck-weekly-unowned'));verifyWeekly(weeklyBody.innerHTML,projectedWeekly('lech-lecha'));
 }finally{r.env.close();}
});
test('later110171 source arrays and unchanged legacy nonqualified Chok retained; notices verbatim',()=>{
 verify(readerHTML(older),[...older.units,...older.apparatus]);const r=chokHTML({breslov:[{ref:'SYNTHETIC legacy',he:'סינתטי ישן',en:'SYNTHETIC old English'}],verses:[{he:'סינתטי ביאור',en:'SYNTHETIC other commentary'}]});try{assert(r.html.includes('SYNTHETIC old English'));assert(r.html.includes('SYNTHETIC other commentary'));assert(!r.html.includes('ck-breslov-context'));assert(!r.html.includes('ck-breslov-weekly-sources'));}finally{r.env.close();}
 const oldCarrier={breslov:older.units.map(u=>({...u,sourceId:u.id})),breslovApparatus:older.apparatus.map(u=>({...u,sourceId:u.id}))};const q=chokHTML(oldCarrier);try{const d=verify(q.html,[...older.units,...older.apparatus],true),group=d.querySelector('.ck-independent-apparatus');assert(group&&!group.open);for(const u of older.apparatus){const n=group.querySelector('[data-source-id="'+u.id+'"]');assert(n);assert.equal(n.getAttribute('data-owner-main-id'),'null');assert(!n.closest('.ck-verse'));}assert(!d.textContent.includes('main ownership remains unassigned'),'No obsolete workflow sentence in public prose');}finally{q.env.close();}
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

test('actual standalone/full Chumash branches RED: prefer169, use runtime JSON/masterURL, preserve supplements/PDF/legacy edition',async()=>{
 const parsha=source('src/pages/parsha/[slug].astro'),chumash=source('src/pages/reader/chumash-lh/[part]/[torah].astro'),genesis=source('src/pages/reader/tanach-bereishit/[part]/[torah].astro');
 assert.deepEqual(plain(qualifiedAPI.PARSHA_READER),ROUTES);
 for(const [slug,route] of Object.entries(ROUTES)) {
  const r=await routeFrontmatter('src/pages/parsha/[slug].astro',{slug},{},'hasQualifiedParsha,hasReviewedParsha,chumashLhData,chumashLhReaderUrl,hasPdf,sourceSupplement');
  assert.equal(r.value.hasQualifiedParsha,true);assert.equal(r.value.hasReviewedParsha,false);assert.equal(r.value.chumashLhData,null,'No displaced OCR fallback');assert.equal(r.value.chumashLhReaderUrl,'/reader/chumash-lh/'+route);assert.equal(r.value.hasPdf,true);
  assert.equal(!!r.value.sourceSupplement,slug==='noach');
  const [part,torah]=route.split('/'),full=await routeFrontmatter('src/pages/reader/chumash-lh/[part]/[torah].astro',{part,torah},{},'qualifiedSlug,error');assert.equal(full.value.qualifiedSlug,slug);assert.equal(full.value.error,null);
 }
 assert(parsha.includes('!hasQualifiedParsha &&'));assert(parsha.includes('distinct legacy selections'));assert(parsha.includes('<ParshaSourceSupplement packet={sourceSupplement} />'));assert(parsha.includes('Download PDF'));
 assert(chumash.includes('<QualifiedParsha slug={qualifiedSlug}'));assert(chumash.includes('dataset={earlierQualified ? torahData : null}'));assert(chumash.includes("qualifiedMasterUrl !== '/data/breslov-parsha/qualified-1-109/master.json'"));assert(chumash.indexOf(': qualifiedSlug ? (')<chumash.indexOf('class="reader-container"'));assert(chumash.includes('<ParshaSourceSupplement packet={sourceSupplement} />'));assert(chumash.includes('View Original PDF'));
 assert(genesis.includes('qualifiedChapter(torahNum)'));assert(genesis.includes('<CommentarySidebar part={partNum} torah={torahNum} entry={commentaryEntry} />'));assert(genesis.includes('<QualifiedParsha dataset={qualifiedChapterData} />'));
});
test('owned Astro asset pins use exact new version; JS syntax, portable tests carry no private source prerequisites',()=>{
 for(const f of ['src/pages/reader/chumash-lh/[part]/[torah].astro','src/pages/reader/tanach-bereishit/[part]/[torah].astro'])assert(source(f).includes('?v=parsha-author-20261018-r1'));
 assert(source('src/pages/reader/chok.astro').includes('/chok.js?v=chok-live-corrections-20261018-r2'));
 for(const f of ['public/chok.js','public/reader-script.js'])new vm.Script(source(f),{filename:f});
});

async function routeFrontmatter(file, params, fixtures, names) {
 const reads=[], box={Astro:{params,props:{},redirect:x=>x},process:{cwd:()=>ROOT},path,hkIndex:json('src/data/hk-citations-index.json'),console,...declaredQualified,
   fs:{existsSync:f=>fs.existsSync(f),readFileSync(f){reads.push(f);const key=path.relative(ROOT,f);return Object.hasOwn(fixtures,key)?JSON.stringify(fixtures[key]):fs.readFileSync(f,'utf8');}}};
 let code=source(file).split('---')[1].replace(/^import .*;\r?\n/gm,'').replace(/export function /g,'function ');
 code=(await dependencies('esbuild').transform(code,{loader:'ts',format:'cjs'})).code;
 const realRead=fs.readFileSync;vm.createContext(box);
 fs.readFileSync=function(f,...args){reads.push(String(f));return realRead.call(this,f,...args);};
 try{vm.runInContext('(function(){\n'+code+'\nglobalThis.route={'+names+'};\n})();',box);}finally{fs.readFileSync=realRead;}
 return {value:box.route,reads};
}
test('actual Genesis SSR frontmatter discovers all31 exported chapter URLs, preserves unrelated sidebar entries',async()=>{
 const earlierIndexes=indexes().slice(0,2);assert.equal(new Set(earlierIndexes.flatMap(r=>Object.keys(r.index.chapters))).size,31);
 for(let ch=1;ch<=31;ch++) {
  const namespace=ch<=17?'qualified-1-109':'qualified-110-171',url='/reader/breslov-parsha/'+namespace+'/bereishit-'+ch+'.json';
  const r=await routeFrontmatter('src/pages/reader/tanach-bereishit/[part]/[torah].astro',{part:'1',torah:String(ch)},{
   ['public/reader/tanach-bereishit/part-1/torah-'+ch+'.json']:{id:'synthetic-chapter',title:'SYNTHETIC chapter',segments:[]},
   },'qualifiedChapterData,qualifiedBreslovEntry,commentaryEntry');
  assert.equal(r.value.qualifiedBreslovEntry.url,url);const exported=json('public'+url);
  const expected={...exported,revision:[exported.revision].join('+'),scopeNotice:exported.scopeNotice||'',apparatusScopeNotice:exported.apparatusScopeNotice||'',units:[...new Map([...(exported.units||[]),...(exported.apparatus||[])].map(u=>[u.id,u])).values()],apparatus:[],globalQualifications:exported.globalQualifications||[],sourceComplete:false};
  assert.deepEqual(plain(r.value.qualifiedChapterData),expected,'Complete merged chapter data, not only body presence');assert(r.reads.includes(path.join(ROOT,'public',url)),'Actual exported chapter read');
  assert(r.value.commentaryEntry.related_commentaries.some(c=>c.book==='likutay-nanach'));assert.equal(r.value.qualifiedBreslovEntry.book,'breslov-parsha-'+namespace);
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

test('earlier239 source owners and all31 chapter exports remain separate from new118; complete HEEN, qualifiers and witness roles',()=>{
 const rows=indexes();assert.deepEqual(rows.map(r=>r.namespace),['qualified-1-109','qualified-110-171','qualified-172-269']);
 const counts=[],chapterOwners=new Map();
 for(const row of rows.slice(0,2)) {
  const master=json('public'+row.index.masterUrl),units=[...(master.units||[]),...(master.apparatus||[])];
  counts.push({namespace:row.namespace,owners:units.length,pairs:units.reduce((n,u)=>n+u.pairs.length,0),qualifications:units.reduce((n,u)=>n+u.qualifications.length,0),chapters:Object.keys(row.index.chapters).length});
  const selected=[];
  for(const slug of Object.keys(row.index.parshas)) {
   const component=select(slug).value;selected.push(...plain(component.units));
   const d=verify(readerHTML(component.selection),plain(component.units));
   for(const u of component.units){const n=d.querySelector('[data-source-id="'+u.id+'"]'),role=u.sourceKind||u.source_kind||u.kind;assert.equal(n.getAttribute('data-source-kind'),role);assert.equal(n.getAttribute('data-owner-main-id'),String(u.owner_main_id??u.ownerMainId??'null'));assert.equal(component.mains.some(m=>m.id===u.id),role==='main');if(['apparatus','compiler-aside','title-metadata'].includes(role))assert(n.closest('[data-qualified-group="apparatus"]'));}
  }
  assert.deepEqual(new Map(selected.map(u=>[u.id,u])),new Map(units.map(u=>[u.id,u])),'All old owners unchanged, no new118 masquerading as earlier coverage');
  for(const [ch,entry] of Object.entries(row.index.chapters)) {
   const data=json('public'+entry.url),exported=[...(data.units||[]),...(data.apparatus||[])];verify(readerHTML(data),exported);
   for(const u of exported){assert.deepEqual(u,units.find(v=>v.id===u.id),'Complete chapter owner equality '+ch+' '+u.id);if(chapterOwners.has(u.id))assert.deepEqual(u,chapterOwners.get(u.id));chapterOwners.set(u.id,u);}
  }
 }
 assert.deepEqual(counts,[{namespace:'qualified-1-109',owners:169,pairs:833,qualifications:283,chapters:17},{namespace:'qualified-110-171',owners:70,pairs:505,qualifications:191,chapters:14}]);assert.equal(chapterOwners.size,239);
 const newest=json('public'+rows[2].index.masterUrl);assert.equal(newest.units.length,118);for(const u of newest.units)assert(!chapterOwners.has(u.id));
 console.log('EARLIER_FINITE_COUNTS '+JSON.stringify({cohorts:counts,uniqueEarlierOwners:chapterOwners.size,earlierChapters:31,newOwnersSeparate:newest.units.length}));
});
