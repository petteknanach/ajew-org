'use strict';
// Missing successor gates only; historical reference/corpus render receipts remain
// bound to their unchanged render functions. No browser/native/served claim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),json=p=>JSON.parse(read(p));
const w={},ctx={window:w,document:{getElementById:()=>true},console};vm.createContext(ctx);
for(const p of ['public/reader-source-exact.js','public/tikkun-boundaries.js','public/tikkun-qatan.js','public/medooyuk.js'])vm.runInContext(read(p).toString(),ctx,{filename:p});
const a=w.AjewReaderSourceExact,r=w.AjewMarkedHebrew,tails=json('public/reader-source-tails.json'),same=(x,y)=>assert.equal(JSON.stringify(x),JSON.stringify(y));
const markers=html=>[...html.matchAll(/data-paragraph-kind="([ps])" data-word-boundary="(\d+)"/g)].map(m=>[+m[2],m[1]]);
let contexts=0,paints=0,other=0;let genesis,kings;
const oracle=json('scripts/chok-reference-order-marker-oracle.json');
assert.equal(sha(read('scripts/chok-reference-order-marker-oracle.json')),'1911a7e86b7cc4fde61206a2e96570a1d84988add7b5ba3c84cd5a24a44f3bb1');
for(const spec of oracle.books){
 const raw=read('public/reader/medooyuk/'+spec.slug+'.json');assert.equal(sha(raw),spec.sha256);
 const book=JSON.parse(raw);if(spec.slug==='tanach-bereishit')genesis=book;if(spec.slug==='tanach-melachim-b')kings=book;
 for(const [c,ch]of Object.entries(book.ch)){
  const selected=Object.fromEntries(Object.entries(ch).filter(([,v])=>(v.b||[]).length));if(!Object.keys(selected).length)continue;
  const prepared=a.prepare(selected,spec.slug,c,tails);
  for(const v of prepared){
   contexts++;const before=JSON.stringify(v),original=ch[v.index];same(v.b,original.b||[]);other+=(v.b||[]).filter(b=>b[1]!=='p'&&b[1]!=='s').length;
   // Genuine adapter path from unchanged full source, including maqaf joining.
   const attached=a.attach(a.text(v),v.index,v);assert.equal(attached.reason,(v.k||[]).includes(1)?'qere':'attached',spec.slug+':'+c+':'+v.index);
   if(attached.verse){
    assert.equal(a.text(attached.verse),a.text(v),'SOURCE_TEXT_EXACT');
    const want=(v.b||[]).filter(b=>b[1]==='p'||b[1]==='s').map(b=>b[1]);
    for(const specialNikud of [false,true])for(const nikud of [false,true]){
     const view=nikud?attached.verse:{...attached.verse,t:attached.verse.t.map(a.bare),m:[]};
     same(markers(r.renderVerse(view,{specialNikud})).map(b=>b[1]),want);paints++;
    }
   }
   assert.equal(JSON.stringify(v),before);
  }
 }
}
const rawBefore=JSON.stringify(genesis),authenticated=r.applyBook(genesis,'tanach-bereishit'),v=authenticated.ch[21][33],ctxTarget={book:'tanach-bereishit',chapter:21,verse:33},original=JSON.stringify(v);
const selected=r.readingVerse(v,ctxTarget);assert.notEqual(selected,v);assert.equal(selected.t[1],'אֵ֖שֶׁל');
const differences=[...v.t[1]].map((c,i)=>c!==[...selected.t[1]][i]?i:null).filter(i=>i!==null);same(differences,[1]);assert.equal(selected.t[1].codePointAt(1),0x5b5);
same({...selected,t:v.t},v);assert.equal(JSON.stringify(v),original);assert.equal(JSON.stringify(genesis),rawBefore);
for(const bad of [{...ctxTarget,book:'tanach-shemos'},{...ctxTarget,chapter:22},{...ctxTarget,verse:32},null])assert.equal(r.readingVerse(v,bad),v);
assert.equal(r.readingVerse(JSON.parse(original),ctxTarget).t[1],'אֶ֖שֶׁל','UNAUTHENTICATED_CLONE_UNCHANGED');
const corrupt=JSON.parse(rawBefore);corrupt.ch[1][1].t[0]+=' ';assert.throws(()=>r.applyBook(corrupt,'tanach-bereishit'),/source mismatch/);
const changed=JSON.parse(rawBefore);changed.ch[21][33].t[1]='אֵ֖שֶׁל';assert.throws(()=>r.applyBook(changed,'tanach-bereishit'),/source mismatch/);
const badPreimage=JSON.parse(rawBefore);badPreimage.ch[21][33].t[1]='שונה';assert.throws(()=>r.applyBook(badPreimage,'tanach-bereishit'),/source mismatch/);
const prepared=a.prepare({'33':v},ctxTarget.book,21,tails)[0],exact=a.attach(a.text(prepared),33,prepared);assert.equal(exact.reason,'attached');
for(const vv of [prepared,exact.verse])assert.equal(a.reading(vv,r).t[1],'אֵ֖שֶׁל');
const unrelated={t:['אֶ֖שֶׁל'],m:[],k:[],b:[]};assert.equal(r.readingVerse(unrelated,ctxTarget),unrelated);
// The second occurrence is admitted exclusively on its authenticated Genesis verse.
const zab=authenticated.ch[30][20],zabContext={book:'tanach-bereishit',chapter:30,verse:20};
const unselected=JSON.stringify(zab),zabSelected=r.readingVerse(zab,zabContext);
assert.equal(zab.t[5],'זֵ֣בֶד');assert.equal(zabSelected.t[5],'זֶ֣בֶד');
const invert={...zabSelected,t:zabSelected.t.slice()};invert.t[5]=invert.t[5].replace('ֶ','ֵ');
same(invert,zab);assert.equal(JSON.stringify(zab),unselected);assert.equal(JSON.stringify(genesis),rawBefore);
assert.deepEqual([...zabSelected.t[5]].map(x=>x.codePointAt(0)),[0x5d6,0x5b6,0x5a3,0x5d1,0x5b6,0x5d3]);
assert(r.renderVerse(zabSelected).includes('זֶ֣בֶד'));
assert.equal(r.readingVerse(zab,{...zabContext,verse:21}),zab);
assert.equal(r.readingVerse(zab,{...zabContext,book:'tanach-shemos'}),zab);
const copy=JSON.parse(unselected);assert.equal(r.readingVerse(copy,zabContext),copy);
assert.equal(r.readingVerse(authenticated.ch[30][19],zabContext),authenticated.ch[30][19]);
const armon=authenticated.ch[30][37],armonContext={book:'tanach-bereishit',chapter:30,verse:37};
const armonOriginal=JSON.stringify(armon),armonSelected=r.readingVerse(armon,armonContext);
assert.equal(armon.t[7],'וְעֶרְמ֑וֹן');assert.equal(armonSelected.t[7],'וְעַרְמ֑וֹן');
const armonRestored={...armonSelected,t:armonSelected.t.slice()};
armonRestored.t[7]=armonSelected.t[7].slice(0,3)+'ֶ'+armonSelected.t[7].slice(4);
same(armonRestored,armon);assert.equal(JSON.stringify(armon),armonOriginal);
assert.equal(JSON.stringify(genesis),rawBefore);
const armonCopy=JSON.parse(armonOriginal);assert.equal(r.readingVerse(armonCopy,armonContext),armonCopy);
for(const wrong of [{...armonContext,verse:20},{...armonContext,chapter:31},{...armonContext,book:'tanach-shemos'}])assert.equal(r.readingVerse(armon,wrong),armon);
const armonPrepared=a.prepare({'37':armon},armonContext.book,30,tails)[0],armonAttached=a.attach(a.text(armonPrepared),37,armonPrepared);
assert.equal(armonAttached.reason,'attached');
assert.equal(a.reading(armonPrepared,r).t[7],'וְעַרְמ֑וֹן');
assert.equal(a.reading(armonAttached.verse,r).t[6],'וְעַרְמ֑וֹן');
const shoorook=require('./genesis-32-18-shoorook-inverse.cjs');
const asked=authenticated.ch[32][18],askedContext={book:'tanach-bereishit',chapter:32,verse:18};
const askedRaw=JSON.stringify(asked),askedSelected=r.readingVerse(asked,askedContext);
const oldAsked='וִשְׁאֵֽלְךָ֙',newAsked='וּשְׁאֵֽלְךָ֙';
assert.equal(asked.t[8],oldAsked); assert.equal(askedSelected.t[8],newAsked);
const askedRestored={...askedSelected,t:askedSelected.t.slice()};
askedRestored.t[8]=newAsked.slice(0,1)+'\u05b4'+newAsked.slice(2);
same(askedRestored,asked); assert.equal(JSON.stringify(asked),askedRaw); assert.equal(JSON.stringify(genesis),rawBefore);
assert.equal(newAsked.codePointAt(1),0x05bc); assert.equal(asked.k[8],0);
same(asked.m.filter(n=>n[0]===8),[[8,1,'nach',0],[8,3,'na',0]]);
const askedCopy=JSON.parse(askedRaw); assert.equal(r.readingVerse(askedCopy,askedContext),askedCopy);
for(const context of [{...askedContext,verse:19},{...askedContext,chapter:31},{...askedContext,book:'tanach-shemos'}]) assert.equal(r.readingVerse(asked,context),asked);
const askedPrepared=a.prepare({'18':asked},askedContext.book,32,tails)[0],askedAttached=a.attach(a.text(askedPrepared),18,askedPrepared);
assert.equal(askedAttached.reason,'attached'); assert.equal(a.reading(askedPrepared,r).t[8],newAsked); assert.equal(a.reading(askedAttached.verse,r).t[7],newAsked);
for(const [relative,pin] of Object.entries(shoorook.paths)){
 const current=read(relative),bad=Buffer.concat([current,Buffer.from(' ')]);
 assert.equal(sha(current),pin.after); assert.equal(sha(shoorook.restore(relative,current)),pin.before); assert.equal(shoorook.restore(relative,bad),bad);
}
const patachInverse=require('./genesis-30-37-patach-inverse.cjs').restore;
const patachPins=json('scripts/genesis-30-37-patach-admission.json').paths;
assert.equal(sha(patachInverse('public/reader-source-exact.js',read('public/reader-source-exact.js'))),patachPins['public/reader-source-exact.js'][0]);
const segolInverse=require('./genesis-30-20-segoal-inverse.cjs').restore;
const fridayInverse=require('./chok-vayetzei-friday-talmud-inverse.cjs').restore;
for(const [relative,row] of Object.entries(json('scripts/genesis-30-20-segoal-admission.json').paths)){
  const current=fridayInverse(relative,shoorook.restore(relative,read(relative))),[priorPin,currentPin]=patachPins[relative];
  assert.equal(priorPin,row.after);assert.equal(sha(current),currentPin);
  assert.equal(sha(patachInverse(relative,current)),row.after);
  assert.equal(sha(segolInverse(relative,current)),row.before);
  const bad=Buffer.concat([current,Buffer.from(' ')]);assert.equal(segolInverse(relative,bad),bad);
}
console.log(JSON.stringify({stage:'API',contexts,paints,other,pass:true}));
const main=read('public/chok.js').toString();
function fn(name){const start=main.indexOf('  function '+name+'(');assert(start>=0);const end=main.indexOf('\n  }',start);return main.slice(start,end+4);}
const b={window:w,state:{mode:'full',medooyuk:true},document:ctx.document,esc:s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};vm.createContext(b);
vm.runInContext(main.slice(main.indexOf('  var TAAMIM ='),main.indexOf('  var state =')),b);
for(const name of ['stripTaamim','stripNikud','applyMode','joinTokens','paragraphMarkers','plainVerse','coloredVerse']){if(main.includes('  function '+name+'('))vm.runInContext(fn(name),b);}
// Execute the actual owning Main display projection, not a parallel formatter.
const start=main.indexOf('            var displayVerse ='),end=main.indexOf('\n            var sourceRef =',start);assert(start>=0&&end>start);
// Exercise the live Chok display call site for the reported Vayetzei occurrence.
Object.assign(b,{verse:zab,slug:'tanach-bereishit',c:30,x:20,kind:'torah',parsha:'ויצא',day:'יום שישי',capturedLanguage:'he',plainHeNum:n=>String(n),refLabelHTML:s=>s});
b.state.mode='full';b.state.medooyuk=true;vm.runInContext(main.slice(start,end),b);
assert(b.row.includes('זֶ֣בֶד'));assert(!b.row.includes('זֵ֣בֶד'));assert.equal(JSON.stringify(zab),unselected);
for(const mode of ['full','nikud','taamim','letters'])for(const capturedLanguage of ['he','original'])for(const special of [false,true]){
 Object.assign(b,{verse:armon,slug:'tanach-bereishit',c:30,x:37,kind:'torah',parsha:'ויצא',day:'יום שישי',capturedLanguage,plainHeNum:n=>String(n),refLabelHTML:s=>s});
 b.state.mode=mode;b.state.medooyuk=special;vm.runInContext(main.slice(start,end),b);
 const want=capturedLanguage==='original'||mode==='full'?'וְעַרְמ֑וֹן':mode==='nikud'?'וְעַרְמוֹן':mode==='taamim'?'וערמ֑ון':'וערמון';
 assert(b.row.replace(/<[^>]+>/g,'').includes(want),JSON.stringify({mode,capturedLanguage,special,want,row:b.row}));
 assert(!b.row.includes('עֶ'));assert.equal(JSON.stringify(armon),armonOriginal);
}
for(const mode of ['full','nikud','taamim','letters'])for(const capturedLanguage of ['he','original'])for(const special of [false,true]){
 Object.assign(b,{verse:asked,slug:'tanach-bereishit',c:32,x:18,kind:'torah',parsha:'וישלח',day:'יום שלישי',capturedLanguage,plainHeNum:n=>String(n),refLabelHTML:s=>s});
 b.state.mode=mode;b.state.medooyuk=special;vm.runInContext(main.slice(start,end),b);
 const want=capturedLanguage==='original'||mode==='full'?newAsked:mode==='nikud'?'וּשְׁאֵלְךָ':mode==='taamim'?'ושאֽלך֙':'ושאלך';
 assert(b.row.replace(/<[^>]+>/g,'').includes(want),JSON.stringify({mode,capturedLanguage,special,want,row:b.row}));
 assert(!b.row.includes('וִש'));assert.equal(JSON.stringify(asked),askedRaw);
}
let mainPaints=0;
for(const mode of ['full','nikud','letters'])for(const capturedLanguage of ['he','original'])for(const special of [false,true]){
 Object.assign(b,{verse:v,slug:'tanach-bereishit',c:21,x:33,kind:'torah',parsha:'וירא',day:'יום שישי',capturedLanguage,plainHeNum:n=>String(n),refLabelHTML:s=>s});b.state.mode=mode;b.state.medooyuk=special;
 vm.runInContext(main.slice(start,end),b);assert.equal(typeof b.row,'string');
 if(capturedLanguage==='original'||mode==='full')assert(b.row.includes('אֵ֖שֶׁל'));
 else if(mode==='nikud')assert(b.row.includes('אֵשֶׁל'));else assert(b.row.includes('אשל'));
 assert.equal(JSON.stringify(v),original);mainPaints++;
}
assert(main.includes("window.ChokSources.bound(sourceSection, sourceRef, verse.t.join(' '))"));assert(main.includes('ChokScheduledBible.render(selectedBible, sourceRef, verse, source, englishEnabled)'));
// Actual current-day schedule and actual Main Friday override; raw Bible only.
const scheduleBytes=read('public/reader/chok/schedule.json');
assert.equal(sha(scheduleBytes),'1849b9a7f4df8528f4571905d7be97b343e61fff1fe937932833324783e19b3c');
const torahPlan=JSON.parse(scheduleBytes).weeks['וירא'].days['יום שישי'].torah;
const fa=main.indexOf('  var CHOK_FRIDAY_HAFTARA = '),fz=main.indexOf(';',fa);
const haftara=JSON.parse(main.slice(fa,fz).split('=').slice(1).join('='))['וירא'];
const plans=[{...torahPlan,slug:'tanach-bereishit'},...haftara];
let currentDayMarkers=0,currentDayPaints=0,currentDayVerses=0;
for(const plan of plans){
 const rawBook=plan.slug==='tanach-bereishit'?genesis:kings,book=r.applyBook(rawBook,plan.slug);
 for(const [c,chapter]of Object.entries(book.ch))for(const [x,verse]of Object.entries(chapter)){
  const cv=+c,vv=+x;if(cv<plan.from.c||cv>plan.to.c||(cv===plan.from.c&&vv<plan.from.v)||(cv===plan.to.c&&vv>plan.to.v))continue;
  const expected=(verse.b||[]).filter(z=>z[1]==='p'||z[1]==='s').map(z=>[z[0],z[1]]),before=JSON.stringify(verse);currentDayMarkers+=expected.length;currentDayVerses++;
  for(const mode of ['full','nikud','taamim','letters'])for(const capturedLanguage of ['he','original'])for(const special of [false,true]){
   Object.assign(b,{verse,slug:plan.slug,c:cv,x:vv,kind:plan.slug==='tanach-bereishit'?'torah':'navi',parsha:'וירא',day:'יום שישי',capturedLanguage,plainHeNum:n=>String(n),refLabelHTML:s=>s});b.state.mode=mode;b.state.medooyuk=special;
   vm.runInContext(main.slice(start,end),b);same(markers(b.row),expected);assert.equal(JSON.stringify(verse),before);
   if(cv===21&&vv===33&&plan.slug==='tanach-bereishit'){
    if(capturedLanguage==='original'||mode==='full')assert(b.row.includes('אֵ֖שֶׁל'));
    else if(mode==='nikud')assert(b.row.includes('אֵשֶׁל'));
   }
   currentDayPaints++;
  }
 }
}
assert.equal(currentDayMarkers,8,'ACTUAL_CURRENT_DAY_EIGHT_MARKERS');
console.log(JSON.stringify({stage:'CURRENT_DAY_MAIN_DISPLAY',currentDayMarkers,currentDayVerses,currentDayPaints,pass:true}));
// Genuine reader edition controller. DOM is explicitly modeled, not native.
async function reader(rawBook=genesis,chapter=21,index=33){
 const dom=require('./qualified-earlier-parsha-test-dom.cjs'),{Element}=dom;
 if(!Element.prototype.insertAdjacentElement)Element.prototype.insertAdjacentElement=function(where,node){assert.equal(where,'afterend');const parent=this.parentNode,at=parent.childNodes.indexOf(this);parent.childNodes.splice(at+1,0,node);node.parentNode=parent;};
 const bookSlug=rawBook.slug,rawVerse=rawBook.ch[chapter][index],candidate=a.prepare({[index]:rawVerse},bookSlug,chapter,tails)[0],source=a.text(candidate),expected=(rawVerse.b||[]).filter(b=>b[1]==='p'||b[1]==='s').map(b=>b[1]);
 const safe=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 const document=dom.documentFor('<html><head></head><body><div class="reader-toolbar"><button id="btn-nikud"></button></div><div class="reader-content"><div class="segment-he" data-index="'+index+'"><p data-nikud="'+safe(source)+'">'+safe(source)+'</p></div></div></body></html>');
 const model=dom.sandbox(document,'/reader/'+bookSlug+'/1/'+chapter+'/',async url=>({ok:true,json:async()=>String(url).includes('reader-source-tails')?tails:rawBook}));
 try{
  Object.assign(model.box.window,{AjewMarkedHebrew:r,AjewReaderSourceExact:a});model.box.history={state:null,replaceState(){}};
  let state={nikud:true,mode:'hebrew'},query='';
  model.box.window.AjewReader={getState:()=>state,setupSegmentShareActions(){},refresh(){const edition=model.box.window.AjewReaderEdition;if(edition)edition.paint(state,query);}};
  vm.runInContext(read('public/reader-editions.js').toString(),model.box);
  document.dispatchEvent({type:'ajew-reader-ready'});await dom.until(()=>document.querySelector('#reader-edition-status').textContent.includes('Original Hebrew'));
  // load still occurs when special is off; wait for real admitted alternative.
  document.querySelector('[data-edition="uxlc"]').click();await dom.until(()=>!!document.querySelector('.segment-he[data-index="'+index+'"]')?.querySelector('p'));
  const target=()=>document.querySelector('.segment-he[data-index="'+index+'"]')?.querySelector('p');
  for(const special of [false,true])for(const nikud of [false,true])for(const q of ['', 'אשל']){
   if((document.querySelector('#btn-reader-special').getAttribute('aria-pressed')==='true')!==special)document.querySelector('#btn-reader-special').click();state.nikud=nikud;query=q;model.box.window.AjewReaderEdition.paint(state,query);
   if(chapter===21&&index===33)assert(target().textContent.includes(nikud?'אֵ֖שֶׁל':'אשל'));
   if(chapter===30&&index===37)assert(target().textContent.includes(nikud?'וְעַרְמ֑וֹן':'וערמון'));
   if(chapter===32&&index===18)assert(target().textContent.includes(nikud?newAsked:'ושאלך'));
   same(markers(target().innerHTML).map(b=>b[1]),expected);if(!special||!nikud||q)assert.equal(target().querySelectorAll('.marked-hebrew').length,0);
  }
  let count=8;
  document.querySelector('[data-edition="original"]').click();
  for(const special of [false,true])for(const nikud of [false,true])for(const q of ['', 'ישראל']){
   if((document.querySelector('#btn-reader-special').getAttribute('aria-pressed')==='true')!==special)document.querySelector('#btn-reader-special').click();state.nikud=nikud;query=q;model.box.window.AjewReaderEdition.paint(state,query);same(markers(target().innerHTML).map(b=>b[1]),expected);count++;
  }
  return count;
 }finally{model.close();}
}
async function vayetzeiFridayTalmud() {
 const gemara=read('public/reader/gemara/gemara-niddah.json');
 const rashi=read('public/reader/commentary/gemara-rashi/gemara-niddah.json');
 assert.equal(sha(gemara),'2472665e96fb6415e390960cc938942111373fa5cad608420b50b9ab5999df16');assert.equal(sha(rashi),'f1677d55fbc842d383754216ca519ba7bdaf19f23e2b6f5c9a29a264468ed2c6');
 const g=JSON.parse(gemara),r=JSON.parse(rashi),page=g.ch['13'].b,glosses=r.ch['13'].b;
 const day=JSON.parse(scheduleBytes).weeks['ויצא'].days['יום שישי'];
 const deps={GEMARA_SLUG:{'נדה':'niddah'},normGem:x=>x,fetchJSON:async url=>{assert.equal(url,'/reader/gemara/gemara-niddah.json');return g;},comm:async (source,slug)=>{assert.equal(source,'gemara-rashi');assert.equal(slug,'gemara-niddah');return r;},applyMode:x=>x,richText:x=>x,heNum:String,esc:x=>x,commDetails:(label,body)=>body};
 const context=vm.createContext(deps);
 const predicate=main.split('  function isVayetzeiFriday(')[1].split('\n')[0];
 vm.runInContext('function isVayetzeiFriday('+predicate+'\n'+fn('gemaraHTML'),context);
 assert(context.isVayetzeiFriday('ויצא','יום שישי'));assert(!context.isVayetzeiFriday('ויצא','יום חמישי'));assert(!context.isVayetzeiFriday('וישלח','יום שישי'));
 assert(main.includes('var vayetzeiFriday = isVayetzeiFriday(wk, dayE);'));
 assert(main.includes('gemaraHTML(d.gemara, vayetzeiFriday)'));
 const text=await context.gemaraHTML(day.gemara,true);
 const extract=(text,cls)=>Array.from(text.matchAll(new RegExp('<div class="'+cls+'">(.*?)</div>','g')),m=>m[1]);
 assert.deepEqual(extract(text,'ck-gemara-line'),[page[12].replace(/^<strong><big>[^<]+<\/big><\/strong> /,''),page[13]]);
 assert.deepEqual(extract(text,'ck-comm-body'),[glosses[11].slice(4),glosses[12]]);
 assert.deepEqual(extract(await context.gemaraHTML(day.gemara,false),'ck-gemara-line'),page);
 for(const bad of [{...day.gemara,daf:12},{...day.gemara,amud:1}])assert((await context.gemaraHTML(bad,true)).includes('ck-source-unavailable'));
 context.fetchJSON=async()=>({ch:{13:{b:page.slice(1)}}});
 assert((await context.gemaraHTML(day.gemara,true)).includes('ck-source-unavailable'));
 context.fetchJSON=async()=>g;context.comm=async()=>null;
 assert((await context.gemaraHTML(day.gemara,true)).includes('ck-source-unavailable'));
 const {restore}=require('./chok-vayetzei-friday-talmud-inverse.cjs');
 for(const [relative,pin] of Object.entries(json('scripts/chok-vayetzei-friday-talmud-delta.json'))){
  const current=require('./chok-biraishis-talmud-inverse.cjs').restore(relative,shoorook.restore(relative,read(relative))),bad=Buffer.concat([current,Buffer.from(' ')]);assert.equal(sha(current),pin.after);assert.equal(sha(restore(relative,current)),pin.before);assert.equal(restore(relative,bad),bad);
 }
 console.log(JSON.stringify({gate:'VAYETZEI_FRIDAY_NIDDAH_13B_13_14',paragraphs:2,rashiGlosses:3,pass:true}));
}
Promise.all([Promise.all([require('./verify-chok-biraishis-talmud.cjs').run(),vayetzeiFridayTalmud()]),reader(),reader(genesis,30,37),reader(genesis,32,18),reader(genesis,35,22),reader(kings,1,17)]).then(counts=>{const readerPaints=counts.slice(1).reduce((a,b)=>a+b,0);console.log(JSON.stringify({pass:true,books:oracle.books.length,sourceExactContexts:contexts,sourceExactModePaints:paints,otherBoundaryCodes:other,mainDisplayPaints:mainPaints,readerEditionPaints:readerPaints,currentDayMarkers,currentDayVerses,currentDayPaints,originalRawConserved:true,englishSourceOperandsUnchanged:true}));}).catch(e=>{console.error(e.stack);process.exitCode=1;});
