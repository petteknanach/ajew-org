// Actual-source regression for the author-confirmed printed note89 reference.
// HTML5/stub-DOM tests; native served acceptance is recorded separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const {documentFor,sandbox}=require('./qualified-parsha-test-dom.cjs');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
const textOnly=n=>(n.querySelector('[data-source-field]')||n).textContent;
function instrument(src,names){const i=src.lastIndexOf('})();');assert(i>0);return src.slice(0,i)+'\nglobalThis.note89Test={'+names+'};\n'+src.slice(i);}
const source=JSON.parse(read('public/data/breslov-parsha/qualified-110-171/master.json'));
const main=source.units.find(u=>u.id==='b-p146-m01');
const note=source.units.find(u=>u.id==='b-p146-n01');
const paragraph=main.pairs.find(p=>p.id==='146-body');
assert.equal(note.owner_main_id,main.id);
assert.equal(note.pairs.length,4);
assert.match(note.pairs[0].he,/סימן ש"ל/);
assert.match(note.pairs[0].en,/item 330/);
const fixture={...source,units:[main,note],apparatus:[]};
let groups=0;
function done(s){groups++;console.log('PASS note89 '+s);}
function check(html,units,kind,markers=true){
 const d=documentFor(html),key=kind==='chok'?'data-bop-unit':'data-source-id';
 for(const u of units){
  const a=d.querySelectorAll('article['+key+']').find(n=>n.getAttribute(key)===u.id);assert(a,'complete owner '+u.id);
  const ps=a.querySelectorAll('[data-pair-id]');assert.equal(ps.length,u.pairs.length);
  for(let i=0;i<ps.length;i++){
   assert.equal(ps[i].getAttribute('data-pair-id'),u.pairs[i].id);
   for(const [lang,sel]of [['he',kind==='chok'?'.ck-he':'.commentary-he'],['en',kind==='chok'?'.ck-en':'.commentary-en']])assert.equal(textOnly(ps[i].querySelector(sel)),u.pairs[i][lang]);
  }
 }
 const refs=d.querySelectorAll('[data-note89-ref]');assert.equal(refs.length,markers?2:0);
 const targets=d.querySelectorAll('[data-note89-target]');assert.equal(targets.length,markers?1:0);
 if(markers){
  assert.equal(targets[0].getAttribute(key),note.id);
  for(const r of refs){
   assert.equal(r.textContent,'89');assert.equal(r.getAttribute('role'),'doc-noteref');
   assert.equal(r.getAttribute('href'),'#'+targets[0].id);
   assert.equal(r.closest('[data-pair-id]').getAttribute('data-pair-id'),paragraph.id);
   const field=r.closest('[lang]'),span=field.querySelector('[data-source-field]');assert(span);assert.equal(span.nextSibling,r.parentNode);assert.equal(textOnly(field),paragraph[field.getAttribute('lang')]);
  }
 }
 return d;
}
function environment(file,names){const d=documentFor('<body></body>'),e=sandbox(d,'/reader/chok/',async()=>({ok:false}));vm.runInContext(instrument(read(file),names),e.box);return e;}
(async()=>{
 const lib=await import(pathToFileURL(path.join(ROOT,'src/lib/qualified-parsha.mjs')).href);
 assert(lib.note89Binding(fixture.units));
 const chapter=lib.qualifiedChapter(28,lib.qualifiedIndexes(ROOT),ROOT).selection;
 assert(lib.note89Binding(chapter.units));
 assert.deepEqual(chapter.units.find(u=>u.id===note.id),note);
 assert(lib.note89Binding(lib.qualifiedParsha('vayeitzei',lib.qualifiedIndexes(ROOT),ROOT).selection.units));
 done('real master, chapter and standalone adapters');
 const r=environment('public/reader-script.js','qualifiedSourceHTML,note89Binding');
 const c=environment('public/chok-verse-breslov.js','owner,note89Binding');
 try{
  const renderC=data=>'<section class="ck-source-island">'+data.units.map(u=>c.box.note89Test.owner(u,{key:'vayeitzei',source:data,publicNotes:true,readerNotes:{}},'weekly')).join('')+'</section>';
  check(r.box.note89Test.qualifiedSourceHTML(fixture),fixture.units,'reader');
  check(renderC(fixture),fixture.units,'chok');done('both runtime renderers preserve full fields and paragraph-END references');
  const muts=[
   ['missing note',x=>x.units.pop()],['missing main',x=>x.units.shift()],
   ['changed main Hebrew',x=>x.units[0].pairs.find(p=>p.id==='146-body').he+=' '],
   ['changed main English',x=>x.units[0].pairs.find(p=>p.id==='146-body').en+=' '],
   ['wrong main verse',x=>x.units[0].verseRef.verse++],['wrong note role',x=>x.units[1].sourceKind='compiler-aside'],
   ['unassigned note',x=>x.units[1].owner_main_id=null],['wrong note owner',x=>x.units[1].owner_main_id='other'],
   ['incomplete note',x=>x.units[1].pairs.pop()],['reordered note',x=>x.units[1].pairs.reverse()],
   ['changed note Hebrew',x=>x.units[1].pairs[0].he+=' '],['changed note English',x=>x.units[1].pairs[0].en+=' ']
  ];
  for(const[name,mutate]of muts){const bad=clone(fixture);mutate(bad);assert.equal(lib.note89Binding(bad.units),null,name);check(r.box.note89Test.qualifiedSourceHTML(bad),bad.units,'reader',false);check(renderC(bad),bad.units,'chok',false);assert(lib.note89Binding(fixture.units));check(renderC(fixture),fixture.units,'chok');}
  done('12 source mutations suppress only annotations, each with a fresh positive');
  // Genuine application acquisition: no private-source or test-fixture overlay.
  const loader=async u=>read('public'+u.split('?')[0]);
  const noach=JSON.parse(await loader('/reader/chumash-lh/part-1/torah-2.json'));
  const noachNotes=JSON.parse(await loader('/reader/chok/noach-source-notes.json'));
  await c.box.window.ChokVerseBreslov.load(loader,noach,noachNotes);
  const weekly=c.box.window.ChokVerseBreslov.weekly('ויצא');
  const inline=c.box.window.ChokVerseBreslov.verse('ויצא','bereishit',28,12);
  const wd=check(weekly,lib.qualifiedParsha('vayeitzei',lib.qualifiedIndexes(ROOT),ROOT).selection.units,'chok');
  const mapped=c.box.window.ChokVerseBreslov.mapped(fixture,'bereishit',28,12);
  const id=check(inline,mapped,'chok');
  assert.equal(wd.querySelector('details.ck-source-island').open,false);assert.equal(id.querySelector('details.ck-source-island').open,false);
  const combined=documentFor(weekly+inline),ids=combined.querySelectorAll('[id]').map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
  for(const html of[weekly,inline]){c.box.document.body.innerHTML=html;const island=c.box.document.body.querySelector('details.ck-source-island');assert.equal(island.open,false);island.open=true;/* A reader opens the source before its reference is reachable. */const link=c.box.document.body.querySelector('[data-note89-ref]');link.click();const target=c.box.document.body.querySelector('[data-note89-target]');assert.equal(target.querySelector('details').open,true);assert.equal(target.closest('.ck-source-island').open,true);}
  done('real loader, weekly and inline independently closed; unique IDs; reference activation');
  const later=JSON.parse(read('public/data/breslov-parsha/qualified-172-269/master.json'));
  const attributes=later.units.find(u=>u.id==='NB-M019').pairs.find(p=>p.id==='NB-M019:P002');
  const garments=later.units.find(u=>u.id==='NB-M031').pairs.find(p=>p.id==='source-authoring-3--NB-M031--p013');
  const plain=s=>s.normalize('NFD').replace(/[\u0591-\u05c7]/g,'');
  assert.match(plain(attributes.he),/בכל המדות ובכל העולמות כלם/);assert.match(attributes.en,/Divine attributes/);
  assert.match(plain(garments.he),/יוסף מדלה נטל/);assert.match(plain(garments.he),/שמרמז שהיה לו כח/);assert.match(garments.en,/took from his own/);assert.match(garments.en,/This alludes/);
  assert.doesNotMatch(garments.en,/scroll|unresolved source syntax|took milah/);done('author-confirmed meanings and consonants in actual master');
  // Retain the index revision in actual outgoing chapter requests. A warm
  // service worker can otherwise return the previous unversioned body once.
  const outgoing=[];const cd=documentFor('<body></body>');
  const cacheEnv=sandbox(cd,'/reader/tanach-bereishit/1/28/',async url=>{
   outgoing.push(url);const u=new URL(url,'https://fixture.invalid');
   const ns=u.pathname.split('/')[3],index=JSON.parse(read('public/data/breslov-parsha/'+ns+'/index.json'));
   if(u.pathname.startsWith('/data/breslov-parsha/')){assert.equal(u.searchParams.get('v'),'parsha-author-20261018-r1');return {ok:true,json:async()=>index};}
   assert.equal(u.searchParams.get('v'),index.revision,'raw qualified request must carry its own index revision');
   return {ok:true,json:async()=>JSON.parse(read('public'+u.pathname))};
  });
  try{
   vm.runInContext(instrument(read('public/reader-script.js'),'qualifiedParshaIndexes,getCommentarySources,fetchCommentarySource'),cacheEnv.box);
   for(const ns of['qualified-1-109','qualified-110-171','qualified-172-269'])cacheEnv.box.note89Test.qualifiedParshaIndexes[ns]=JSON.parse(read('public/data/breslov-parsha/'+ns+'/index.json'));
   for(const chapter of[1,28,32,37]){
    const s=cacheEnv.box.note89Test.getCommentarySources('tanach-bereishit',1,chapter).find(s=>s.qualifiedUrls);assert(s);
    const response=await cacheEnv.box.note89Test.fetchCommentarySource(s);assert(response.ok);const data=await response.json();assert(data.units.length);
    if(chapter===28){assert(lib.note89Binding(data.units));assert.match(data.units.find(u=>u.id===note.id).pairs[0].en,/item 330/);}
   }
   assert.equal(outgoing.filter(url=>url.startsWith('/reader/breslov-parsha/')).length,4);
   assert.equal(outgoing.filter(url=>url.startsWith('/data/breslov-parsha/')).length,3);
   const qindex=cacheEnv.box.note89Test.qualifiedParshaIndexes['qualified-110-171'],saved=qindex.revision;qindex.revision='revision /?& value';
   const encoded=cacheEnv.box.note89Test.getCommentarySources('tanach-bereishit',1,28).find(s=>s.qualifiedUrls).url;
   assert(encoded.endsWith('v='+encodeURIComponent(qindex.revision)));qindex.revision=saved;
   done('actual chapter fetch carries per-index revision; encoded cache key and current note330');
  }finally{cacheEnv.close();}
 }finally{r.close();c.close();}
 console.log('ALL PASS: '+groups+' note89/source groups');
})().catch(e=>{console.error(e);process.exitCode=1;});
