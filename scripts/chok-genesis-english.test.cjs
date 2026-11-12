'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {sandbox,documentFor}=require('./qualified-earlier-parsha-test-dom.cjs');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const reviewed=JSON.parse(read('scripts/chok-genesis-english-reviewed.json'));
const files=Object.values(reviewed.weeks).map(s=>'public/reader/chok/genesis-english/'+s[0]);
function env(transport){
 const d=documentFor('<html><body></body></html>');d.readyState='loading';const e=sandbox(d,'/reader/chok/',transport||(async()=>({ok:false,status:404,text:async()=>''})));
 e.box.TextEncoder=TextEncoder;e.box.window.crypto=crypto.webcrypto;
 vm.runInContext(read('public/chok-source-reader.js'),e.box);vm.runInContext(read('public/chok-genesis-english.js'),e.box);
 return {...e,d,api:e.box.window.ChokGenesisEnglish};
}
const rawBook=slug=>JSON.parse(read('public/reader/medooyuk/targum/'+slug+'.json'));
const loader=url=>Promise.resolve(read('public'+String(url).split('?')[0]));
test('every selected source-bound pair, all full bilingual notes and all role-day introductions render through actual API',async()=>{
 const e=env();let pairs=0,notes=0,dayFields=0,contexts=0;
 try{for(const file of files){const p=JSON.parse(read(file)),groups=new Map();
  assert.equal(crypto.createHash('sha256').update(read(file)).digest('hex'),reviewed.weeks[p.week][1]);
  for(const r of p.pairs){assert(!Object.hasOwn(r,'original'));const k=[r.key,r.role,r.slug].join('|');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  for(const rows of groups.values()){
   const first=rows[0],day=first.key.split('|')[1],kind=first.role==='onkelos'?'torah':first.role==='navi-targum'?'navi':'kesuvim',book=rawBook(first.slug);
   const ctx=await e.api.prepare(p.week,day,kind,first.slug,Promise.resolve(book),loader);assert(ctx);contexts++;
   const intro=p.dayFields.find(d=>d.key===first.key&&d.role===first.role);
   for(const r of rows){const [c,v]=r.reference.split(':'),original=book.ch[c][v];assert.equal(crypto.createHash('sha256').update(original).digest('hex'),r.originalSHA256);
    const html=e.api.render(ctx,r.reference,original,{english:true,targum:true,existingEnglish:false});const d=documentFor('<html><body>'+html+'</body></html>');
    const owner=d.querySelector('.ck-genesis-english-owner');assert(owner,r.ownerScopeKey);assert.equal(owner.getAttribute('data-owner-scope-key'),r.ownerScopeKey);assert(html.includes(e.box.window.ChokSources.english(r.fullEnglish,true,'Targum English translation')));
    const ns=owner.querySelectorAll('.ck-source-qualification');assert.equal(ns.length,r.qualifications.length);ns.forEach((n,i)=>{assert.equal(n.querySelector('[lang="he"]').textContent,r.qualifications[i].he);assert.equal(n.querySelector('[lang="en"]').textContent,r.qualifications[i].en);notes++;});pairs++;
    if(d.querySelector('.ck-genesis-targum-day')){const h=d.querySelector('.ck-genesis-targum-day');assert(intro);assert.equal(h.querySelector('h4[lang="he"]').textContent,intro.dayTitle.he);assert.equal(h.querySelector('h4[lang="en"]').textContent,intro.dayTitle.en);assert.equal(h.querySelector('p[lang="he"]').textContent,intro.explanation.he);assert.equal(h.querySelector('p[lang="en"]').textContent,intro.explanation.en);dayFields++;}
    assert.equal(e.api.render(ctx,r.reference,original+' ',{english:true,targum:true}),'','different original cannot borrow selected English');
   }
  }
 }
 assert.equal(pairs,reviewed.selectedPairs);assert.equal(notes,reviewed.orderedQualifications);assert.equal(dayFields,reviewed.selectedRoleDayIntroductions);console.log(JSON.stringify({completePairs:pairs,completeBilingualQualifications:notes,completeRoleDayIntroductions:dayFields,actualSourceContexts:contexts}));
 }finally{e.close();}
});
test('unscheduled readings never acquire English; qualified existing English wins; modes conserve mandatory notes',async()=>{
 const e=env();try{const p=JSON.parse(read(files[0])),r=p.pairs.find(r=>r.qualifications.length),book=rawBook(r.slug),day=r.key.split('|')[1],kind=r.role==='onkelos'?'torah':r.role==='navi-targum'?'navi':'kesuvim',ctx=await e.api.prepare(p.week,day,kind,r.slug,Promise.resolve(book),loader),[c,v]=r.reference.split(':');
 assert.equal(e.api.render(ctx,'999:999','missing',{english:true,targum:true}),'');
 const existing=e.api.render(ctx,r.reference,book.ch[c][v],{english:true,targum:true,existingEnglish:true});assert(!existing.includes('ck-genesis-english-owner'));assert(!existing.includes('ck-source-qualification'));
 for(const mode of [{english:false,targum:true},{english:true,targum:false},{english:false,targum:false}]){const html=e.api.render(ctx,r.reference,book.ch[c][v],mode);assert(!html.includes('Targum English translation'));assert(html.includes(r.englishSHA256));const d=documentFor('<html><body>'+html+'</body></html>');assert.equal(d.querySelectorAll('.ck-source-qualification').length,r.qualifications.length);}
 assert.equal(await e.api.prepare(p.week,'יום שישי','kesuvim','tanach-mishlei',Promise.resolve(rawBook('tanach-mishlei')),loader),null);
 assert.equal(await e.api.prepare(p.week,'ליל שישי','navi','tanach-yeshayahu',Promise.resolve(rawBook('tanach-yeshayahu')),loader),null);
 assert.equal(await e.api.prepare('שמות',day,'torah','tanach-shemos',Promise.resolve({ch:{}}),loader),null);
 }finally{e.close();}
});
test('all24 exact author-selected formerly-held owners expose their coupled source, English and ordered qualifications; changed sources cannot borrow them',async()=>{
 const e=env();try{
 assert.deepEqual(reviewed.heldOwnerScopeKeys,[]);assert.equal(reviewed.authorSelectedOwnerScopeKeys.length,24);
 assert.deepEqual([...reviewed.authorSelectedOwnerScopeKeys].sort(),[...reviewed.historicalHeldOwnerScopeKeys].sort());
 assert.equal(reviewed.authorRulingsCompleteFieldSuccessorSHA256,'ecd218bdcf2d6bd7c4c270a0bae994f24bf5c5f8e7196884d0e62dac9cb99a7d');
 for(const id of reviewed.authorSelectedOwnerScopeKeys){
  const [week,day,role,slug,ref]=id.split('|'),kind=role==='onkelos'?'torah':role==='navi-targum'?'navi':'kesuvim',book=rawBook(slug),ctx=await e.api.prepare(week,day,kind,slug,Promise.resolve(book),loader),[c,v]=ref.split(':'),original=book.ch[c][v],pin=reviewed.authorMeaningPins[id];assert(ctx,id);
  const selected=e.api.selected(ctx,ref,original);assert.equal(typeof selected,'string');assert.equal(crypto.createHash('sha256').update(selected).digest('hex'),pin.selectedOriginalSHA256,id);assert.equal(e.api.selected(ctx,ref,original+' '),null);assert.equal(e.api.selected(ctx,'999:999',original),null);
  const html=e.api.render(ctx,ref,original,{english:true,targum:true}),d=documentFor('<html><body>'+html+'</body></html>'),owner=d.querySelector('.ck-genesis-english-owner');assert(owner,id);assert.equal(owner.getAttribute('data-owner-scope-key'),id);assert.equal(ctx.rows[ref].row.englishSHA256,pin.fullEnglishSHA256);assert.equal(crypto.createHash('sha256').update(ctx.rows[ref].row.fullEnglish).digest('hex'),pin.fullEnglishSHA256);
  const ns=owner.querySelectorAll('.ck-source-qualification');assert.equal(ns.length,pin.orderedReaderNoteSHA256.length);ns.forEach((n,i)=>assert.equal(crypto.createHash('sha256').update(n.querySelector('[lang="he"]').textContent+'\u0000'+n.querySelector('[lang="en"]').textContent).digest('hex'),pin.orderedReaderNoteSHA256[i]));
  const off=documentFor('<html><body>'+e.api.render(ctx,ref,original,{english:false,targum:true})+'</body></html>');assert.equal(off.querySelectorAll('.ck-source-qualification').length,ns.length);assert(!off.querySelector('.ck-en-line'));
  const changed=structuredClone(book);changed.ch[c][v]+=' ';const rejected=await e.api.prepare(week,day,kind,slug,Promise.resolve(changed),loader);assert(rejected);assert.equal(e.api.selected(rejected,ref,original),null);assert.equal(e.api.render(rejected,ref,changed.ch[c][v],{english:true,targum:true}),'');
 }
 }finally{e.close();}
});

test('all 204 day introductions can precede the original without separating its full English or duplicating the introduction',async()=>{
 const e=env();let checked=0;try{for(const file of files){const p=JSON.parse(read(file)),groups=new Map();for(const r of p.pairs){const id=[r.key,r.role,r.slug].join('|');if(!groups.has(id))groups.set(id,r);}
 for(const r of groups.values()){const day=r.key.split('|')[1],kind=r.role==='onkelos'?'torah':r.role==='navi-targum'?'navi':'kesuvim',book=rawBook(r.slug),[c,v]=r.reference.split(':'),original=book.ch[c][v],ctx=await e.api.prepare(p.week,day,kind,r.slug,Promise.resolve(book),loader);
 const header=e.api.render(ctx,r.reference,original,{english:true,targum:true,existingEnglish:true});assert(header.includes('ck-genesis-targum-day'));assert(!header.includes('ck-genesis-english-owner'));
 const body=e.api.render(ctx,r.reference,original,{english:true,targum:true,existingEnglish:false});assert(!body.includes('ck-genesis-targum-day'));assert(body.includes(e.box.window.ChokSources.english(r.fullEnglish,true,'Targum English translation')));assert.equal(documentFor('<html><body>'+body+'</body></html>').querySelectorAll('.ck-source-qualification').length,r.qualifications.length);checked++;
 }}assert.equal(checked,204);}finally{e.close();}
});
test('owning page binds exact script bytes and each historical guard admits only the exact owned successors',()=>{
 const admission=JSON.parse(read('scripts/chok-genesis-english-admission.json')),guard=require('./chok-reference-order-conservation.cjs'),page=read('src/pages/reader/chok.astro');
 for(const [relative,d] of Object.entries(admission.paths)){const actual=fs.readFileSync(path.join(root,relative)),restored=guard.restoreGenesis(relative,actual);assert.equal(crypto.createHash('sha256').update(restored).digest('hex'),d.beforeSHA256);const corrupt=Buffer.concat([actual,Buffer.from(' ')]);assert.equal(guard.restoreGenesis(relative,corrupt),corrupt);if(Object.hasOwn(guard.DELTA,relative))assert.throws(()=>guard.restoreReference(relative,corrupt));else assert.notEqual(crypto.createHash('sha256').update(guard.restoreReference(relative,corrupt)).digest('hex'),d.beforeSHA256);}
 for(const [asset,algorithm] of [['chok.js','sha384'],['chok-genesis-english.js','sha256']]){const b=fs.readFileSync(path.join(root,'public',asset)),h=crypto.createHash('sha256').update(b).digest('hex'),sri=algorithm+'-'+crypto.createHash(algorithm).update(b).digest('base64');assert(page.includes('src="/'+asset+'?v='+h+'" integrity="'+sri+'"'));}
 const main=read('public/chok.js'),pre=main.indexOf('existingEnglish:true});');assert(pre>=0&&pre<main.indexOf('var targumRow =',pre));assert(main.indexOf('existingEnglish:existingTargumEnglish')>main.indexOf('var targumRow =',pre));
});
test('three explicit reader-facing note projections retain their complete old-note fingerprints and exact bilingual meaning-bearing after-values',()=>{
 const p=JSON.parse(read('scripts/chok-genesis-english-reader-projection.json'));assert.equal(p.selectedBodyOrIntroductionChanges,0);assert.equal(p.sourceReadingOrRightsClearances,0);assert.equal(p.records.length,3);
 const canon=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canon).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')+'}';
 for(const op of p.records){const packet=files.map(f=>JSON.parse(read(f))).find(q=>q.pairs.some(r=>r.ownerScopeKey===op.owner)),r=packet.pairs.find(r=>r.ownerScopeKey===op.owner),n=r.qualifications[op.projectionIndex];assert.equal(r.englishSHA256,op.englishSHA256);assert.equal(crypto.createHash('sha256').update(canon(op.before)).digest('hex'),op.sourceQualificationSHA256);assert.equal(n.sourceQualificationSHA256,op.sourceQualificationSHA256);assert.deepEqual(n,op.after);assert(!/supplied wording and pointing|penalty is not invented/.test(n.en));assert(n.he.trim()&&n.en.trim());}
});
test('corrupt transport is rejected; exact same source recovers without accepting the corrupted packet',async()=>{
 const e=env();try{const p=JSON.parse(read(files[0])),r=p.pairs[0],day=r.key.split('|')[1],book=rawBook(r.slug),kind=r.role==='onkelos'?'torah':r.role==='navi-targum'?'navi':'kesuvim';
 assert.equal(await e.api.prepare(p.week,day,kind,r.slug,Promise.resolve(book),url=>loader(url).then(x=>x+' ')),null);
 const ok=await e.api.prepare(p.week,day,kind,r.slug,Promise.resolve(book),loader);assert(ok);assert(Object.keys(ok.rows).length>0);
 const changed=structuredClone(book),[c,v]=r.reference.split(':');changed.ch[c][v]+=' ';const partial=await e.api.prepare(p.week,day,kind,r.slug,Promise.resolve(changed),loader);assert(!Object.hasOwn(partial.rows,r.reference));assert(Object.keys(partial.rows).length<Object.keys(ok.rows).length);
 }finally{e.close();}
});
test('new Toldos Sunday complete Zohar remains source-bound with all8 mandatory bilingual notes and English-off conservation',async()=>{
 const e=env();try{
  const expected=reviewed.toldosSundayZohar;assert(expected);const key='תולדות|יום ראשון',currentScript=read('public/chok-qualified-zohar.js'),script=require('./chok-reference-order-conservation.cjs').restoreCleared('public/chok-qualified-zohar.js',Buffer.from(currentScript)).toString('utf8'),m=script.match(/  var INDEX = (\{[^\n]+\});/);assert(m);const index=JSON.parse(m[1]);delete index['תולדות|יום שלישי'];delete index['תולדות|יום שני'];assert.equal(Object.keys(index).length,17);assert.deepEqual(index[key],expected.payload);delete index[key];assert.equal(crypto.createHash('sha256').update(JSON.stringify(index)).digest('hex'),expected.predecessorIndexSHA256);
  const historical=require('./chok-reference-order-conservation.cjs').restoreToday('public/chok-qualified-zohar.js',require('./chok-reference-order-conservation.cjs').restoreTomorrow('public/chok-qualified-zohar.js',Buffer.from(script))).toString('utf8'),hm=historical.match(/  var INDEX = (\{[^\n]+\});/);assert(hm);
  assert.equal(crypto.createHash('sha256').update(historical.slice(0,hm.index+hm[0].indexOf(hm[1]))+'<INDEX>'+historical.slice(hm.index+hm[0].indexOf(hm[1])+hm[1].length)).digest('hex'),expected.outsideIndexLogicSHA256);
  vm.runInContext(currentScript,e.box);const api=e.box.window.ChokQualifiedZohar;assert(api.has(key));const wednesdayKey='תולדות|יום רביעי',wednesdayAuthority=nativeEightReviewed.rows.find(r=>r.key===wednesdayKey);assert(wednesdayAuthority);assert(api.has(wednesdayKey));nativeAuthority(JSON.parse(JSON.stringify(await api.load(wednesdayKey,loader))),wednesdayAuthority);const deniedKey='שמות|יום שני';assert(!api.has(deniedKey));await assert.rejects(api.load(deniedKey,loader),/not admitted/);
  const raw=read('public'+expected.payload.url);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),expected.payload.sha256);const p=await api.load(key,loader);assert.equal(p.originalSHA256,expected.payload.originalSHA256);assert.equal(p.englishSHA256,expected.payload.englishSHA256);assert.equal(p.sourceOwnerSHA256,expected.parentAdoptionSHA256);assert.equal(p.original.split('⟦').length-1,4);assert(p.original.startsWith('ואלה תולדות יצחק'));assert(p.original.endsWith('ישמיע כל תהלתו:'));
  for(const english of [true,false]){const html=await api.reading(key,english,loader),d=documentFor('<html><body>'+html+'</body></html>');assert.equal(d.querySelector('[data-field-role="original-source"]').textContent,p.original);const en=d.querySelector('[data-field-role="english-translation"]');if(english)assert.equal(en.textContent,p.english);else assert(!en);const ns=d.querySelectorAll('[data-zohar-note-owner]');assert.equal(ns.length,8);ns.forEach((n,i)=>{assert.equal(n.getAttribute('data-note-id'),p.notes[i].id);assert.equal(n.querySelector('[lang="he"]').textContent,p.notes[i].he);assert.equal(n.querySelector('[lang="en"]').textContent,p.notes[i].en);assert(!n.closest('details'));});}
 }finally{e.close();}
});
test('actual Main selects Toldos Sunday before the old missing inventory; dynamic module SRI failure stays closed and recovers',async()=>{
 const expected=reviewed.toldosSundayZohar,wire=read('public'+expected.payload.url);let requests=[];const e=env(async url=>{requests.push(String(url));const ok=String(url)===expected.payload.url+'?v='+expected.payload.sha256;return {ok,status:ok?200:404,text:async()=>ok?wire:'',json:async()=>ok?JSON.parse(wire):{}};});
 try{let corrupt=true,events=[],originalAppend=e.d.head.appendChild.bind(e.d.head);e.d.head.appendChild=function(n){const out=originalAppend(n);if(String(n.tagName).toLowerCase()==='script'&&String(n.src).startsWith('/chok-qualified-zohar.js?'))queueMicrotask(()=>{const bytes=read('public/chok-qualified-zohar.js')+(corrupt?' ':'');const sri='sha256-'+crypto.createHash('sha256').update(bytes).digest('base64');if(sri!==n.integrity){events.push('integrity-error');n.onerror();return;}events.push('verified-load');vm.runInContext(bytes,e.box);n.onload();});return out;};
  const main=read('public/chok.js'),marker="  if (document.readyState === 'loading') {";assert.equal(main.split(marker).length,2);vm.runInContext(main.replace(marker,"  globalThis.actualToldosZohar=function(english){state.sched={weeks:{}};state.tanachen=english;return zoharHTML({vol:'תולדות',daf:134,amud:1},'תולדות','יום ראשון');};\n"+marker),e.box);
  const denied=await e.box.actualToldosZohar(true);assert(!denied.includes('data-qualified-zohar="תולדות|יום ראשון"'));assert.equal(requests.length,0);corrupt=false;
  const html=await e.box.actualToldosZohar(true),d=documentFor('<html><body>'+html+'</body></html>'),p=JSON.parse(wire);assert(d.querySelector('[data-qualified-zohar="תולדות|יום ראשון"]'));assert.equal(d.querySelector('[data-field-role="original-source"]').textContent,p.original);assert.equal(d.querySelector('[data-field-role="english-translation"]').textContent,p.english);assert.equal(d.querySelectorAll('[data-zohar-note-owner]').length,8);assert.deepEqual(events,['integrity-error','verified-load']);assert.deepEqual(requests,[expected.payload.url+'?v='+expected.payload.sha256]);
 }finally{e.close();}
});

test('actual Main Toldos Monday uses the existing queued loader, full bilingual fields and seven notes; SRI and late-context controls remain closed',async()=>{
 const admission=JSON.parse(read('scripts/chok-today-toldos-monday-admission.json')),key='תולדות|יום שני',pin=admission.descriptor,wire=read('public'+pin.url),packet=JSON.parse(wire),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 const guard=require('./chok-reference-order-conservation.cjs');
 assert.equal(admission.baseRevision,'07de568809eb179d6aff63ae6fabf3aeed1d3d7c');assert.equal(hash(wire),pin.sha256);assert.equal(packet.notes.length,7);assert.equal(packet.explanation.paragraphs.length,5);
 for(const [relative,d]of Object.entries(admission.paths)){const actual=guard.restoreTomorrow(relative,fs.readFileSync(path.join(root,relative)));assert.equal(hash(actual),d.afterSHA256);assert.equal(hash(guard.restoreToday(relative,actual)),d.beforeSHA256);const bad=Buffer.concat([actual,Buffer.from(' ')]);assert.equal(guard.restoreToday(relative,bad),bad);const middle=Buffer.from(actual);middle[Math.floor(middle.length/2)]^=1;assert.equal(guard.restoreToday(relative,middle),middle);}
 for(const [pointer,pin]of Object.entries(admission.selectedPointers)){const value=pointer.split('/').slice(1).reduce((v,k)=>v[k],packet);assert.equal(typeof value,'string');assert.equal(hash(value),pin,pointer);}
 const current=read('public/chok-qualified-zohar.js'),snapshot=guard.restoreCleared('public/chok-qualified-zohar.js',Buffer.from(current)).toString('utf8'),index=JSON.parse(snapshot.match(/  var INDEX = (\{[^\n]+\});/)[1]);delete index['תולדות|יום שלישי'];assert.equal(Object.keys(index).length,18);assert.deepEqual(index[key],pin);
 const sundayPin=reviewed.toldosSundayZohar.payload,sundayWire=read('public'+sundayPin.url);let requests=[],events=[],release,started;
 const held=new Promise(r=>release=r),entered=new Promise(r=>started=r);let delay=true;
 const e=env(async url=>{url=String(url);requests.push(url);if(url===pin.url+'?v='+pin.sha256){if(delay){started();await held;}return {ok:true,status:200,text:async()=>wire,json:async()=>packet};}if(url===sundayPin.url+'?v='+sundayPin.sha256)return {ok:true,status:200,text:async()=>sundayWire,json:async()=>JSON.parse(sundayWire)};return {ok:false,status:404,text:async()=>'',json:async()=>({})};});
 function complete(html,p,english){
  const d=documentFor('<html><body>'+html+'</body></html>'),article=d.querySelector('[data-qualified-zohar="'+p.key+'"]');assert(article,p.key);assert.equal(article.querySelector('[data-field-role="original-source"]').textContent,p.original);
  const en=article.querySelector('[data-field-role="english-translation"]');if(english)assert.equal(en.textContent,p.english);else assert(!en);
  const ns=article.querySelectorAll('[data-zohar-note-owner]');assert.equal(ns.length,p.notes.length);ns.forEach((n,i)=>{assert.equal(n.getAttribute('data-zohar-note-owner'),p.key);assert.equal(n.getAttribute('data-note-id'),p.notes[i].id);assert.equal(n.querySelector('[lang="he"]').textContent,p.notes[i].he);assert.equal(n.querySelector('[lang="en"]').textContent,p.notes[i].en);assert(!n.closest('details'));});
  if(p.key===key){const ex=article.querySelector('[data-other-group="'+key+'"]');assert(ex);assert.deepEqual(ex.querySelectorAll('p[lang="he"]').map(n=>n.textContent),p.explanation.paragraphs.map(q=>q.he));assert.deepEqual(ex.querySelectorAll('p[lang="en"]').map(n=>n.textContent),english?p.explanation.paragraphs.map(q=>q.en):[]);assert(!html.includes('undefined'));assert(!article.querySelector('.ck-source-credits'));}
 }
 try{
  let corrupt=true;const append=e.d.head.appendChild.bind(e.d.head);e.d.head.appendChild=function(n){const out=append(n);if(String(n.tagName).toLowerCase()==='script'&&String(n.src).startsWith('/chok-qualified-zohar.js?'))queueMicrotask(()=>{const bytes=current+(corrupt?' ':'');assert.equal(n.src,'/chok-qualified-zohar.js?v='+hash(current));const sri='sha256-'+crypto.createHash('sha256').update(bytes).digest('base64');if(sri!==n.integrity){events.push('integrity-error');n.onerror();return;}events.push('verified-load');vm.runInContext(bytes,e.box);n.onload();});return out;};
  const main=read('public/chok.js'),marker="  if (document.readyState === 'loading') {";assert.equal(main.split(marker).length,2);assert(main.includes('if (revision !== state.renderRevision) return;'));
  vm.runInContext(main.replace(marker,"  globalThis.actualToldosMonday=function(day,english,commentary){state.sched={weeks:{}};state.focus=null;state.tanachen=english;state.commentary=commentary;state.rashi=commentary;return zoharHTML({vol:'תולדות',daf:139,amud:2},'תולדות',day);};\n"+marker),e.box);
  const denied=await e.box.actualToldosMonday('יום שני',true,true);assert(!denied.includes('data-qualified-zohar="'+key+'"'));assert.equal(requests.length,0);corrupt=false;
  const older=e.box.actualToldosMonday('יום שני',true,true);await entered;
  const newer=await e.box.actualToldosMonday('יום ראשון',false,false);complete(newer,JSON.parse(sundayWire),false);release();delay=false;
  const late=await older;complete(late,packet,true);complete(newer,JSON.parse(sundayWire),false);
  for(const [english,commentary]of [[true,true],[true,false],[false,true],[false,false]])complete(await e.box.actualToldosMonday('יום שני',english,commentary),packet,english);
  assert.deepEqual(events,['integrity-error','verified-load']);assert.deepEqual(requests,[pin.url+'?v='+pin.sha256,sundayPin.url+'?v='+sundayPin.sha256]);
 }finally{release();e.close();}
});

test('actual Main Toldos Tuesday keeps all six complete bilingual qualifications and explanations through queued loading, SRI recovery and old-new-old contexts',async()=>{
 const a=JSON.parse(read('scripts/chok-tomorrow-toldos-tuesday-admission.json')),key='תולדות|יום שלישי',pin=a.descriptor,wire=read('public'+pin.url),packet=JSON.parse(wire),hash=s=>crypto.createHash('sha256').update(s).digest('hex'),guard=require('./chok-reference-order-conservation.cjs');
 assert.equal(a.baseRevision,'fc0dbd086981b612591c792d0b43edd9b8dc8437');assert.equal(hash(wire),pin.sha256);assert.equal(packet.notes.length,6);assert.deepEqual(packet.noteIDs,pin.noteIDs);
 for(const [pointer,p]of Object.entries(a.selectedPointers)){const value=pointer.split('/').slice(1).reduce((v,k)=>v[k],packet);assert.equal(typeof value,'string');assert.equal(Buffer.byteLength(value),p.bytes);assert.equal(hash(value),p.sha256,pointer);}
 const canon=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canon).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canon(x[k])).join(',')+'}';
 packet.notes.forEach((n,i)=>{assert.equal(hash(canon(n)),a.completeOrderedQualifications[i].wholeAudienceObjectSHA256);assert.equal(n.sourceQualificationSHA256,a.completeOrderedQualifications[i].wholeSourceQualificationSHA256);assert.equal(n.owner,key);assert.equal(n.mandatoryForTranslation,true);assert.equal(n.sourceOriginalSHA256,pin.originalSHA256);assert.equal(n.englishOwnerSHA256,pin.englishSHA256);assert.equal(Array.from(packet.original).slice(...n.sourceSpan).join(''),n.sourceAnchor);assert.equal(hash(n.sourceAnchor),n.sourceAnchorSHA256);});
 for(const [relative,d]of Object.entries(a.paths)){const actual=guard.restoreCleared(relative,fs.readFileSync(path.join(root,relative)));assert.equal(hash(actual),d.afterSHA256);assert.equal(hash(guard.restoreTomorrow(relative,actual)),d.beforeSHA256);const bad=Buffer.concat([actual,Buffer.from(' ')]);assert.equal(guard.restoreTomorrow(relative,bad),bad);const mid=Buffer.from(actual);mid[Math.floor(mid.length/2)]^=1;assert.equal(guard.restoreTomorrow(relative,mid),mid);assert.deepEqual(guard.restoreTomorrow(relative,guard.restoreTomorrow(relative,actual)),guard.restoreTomorrow(relative,actual));}
 const current=read('public/chok-qualified-zohar.js'),snapshot=guard.restoreCleared('public/chok-qualified-zohar.js',Buffer.from(current)).toString('utf8'),index=JSON.parse(snapshot.match(/  var INDEX = (\{[^\n]+\});/)[1]);assert.deepEqual(Object.keys(index),a.expectedKeys);assert.equal(Object.keys(index).length,19);assert.deepEqual(index[key],pin);delete index[key];assert.equal(hash(JSON.stringify(index)),a.predecessorIndexSHA256);
 const oldPin=reviewed.toldosSundayZohar.payload,oldWire=read('public'+oldPin.url),oldPacket=JSON.parse(oldWire);let requests=[],events=[],release,started;const held=new Promise(r=>release=r),entered=new Promise(r=>started=r);let delay=true;
 const e=env(async url=>{url=String(url);requests.push(url);if(url===pin.url+'?v='+pin.sha256){if(delay){started();await held;}return {ok:true,status:200,text:async()=>wire,json:async()=>packet};}if(url===oldPin.url+'?v='+oldPin.sha256)return {ok:true,status:200,text:async()=>oldWire,json:async()=>oldPacket};return {ok:false,status:404,text:async()=>'',json:async()=>({})};});
 function complete(html,p,english){const d=documentFor('<html><body>'+html+'</body></html>'),article=d.querySelector('[data-qualified-zohar="'+p.key+'"]');assert(article,p.key);assert.equal(article.querySelector('[data-field-role="original-source"]').textContent,p.original);const en=article.querySelector('[data-field-role="english-translation"]');if(english)assert.equal(en.textContent,p.english);else assert(!en);const ns=article.querySelectorAll('[data-zohar-note-owner]');assert.equal(ns.length,p.notes.length);ns.forEach((n,i)=>{assert.equal(n.getAttribute('data-zohar-note-owner'),p.key);assert.equal(n.getAttribute('data-note-id'),p.notes[i].id);assert.equal(n.getAttribute('data-source-sha256'),p.notes[i].sourceOriginalSHA256);assert.equal(n.getAttribute('data-source-anchor-sha256'),p.notes[i].sourceAnchorSHA256);assert.equal(n.querySelector('[lang="he"]').textContent,p.notes[i].he);assert.equal(n.querySelector('[lang="en"]').textContent,p.notes[i].en);assert(!n.closest('details'));});if(p.key===key){const ex=article.querySelector('[data-other-group="'+key+'"]');assert(ex);assert.deepEqual(ex.querySelectorAll('p[lang="he"]').map(n=>n.textContent),[p.explanation.he]);assert.deepEqual(ex.querySelectorAll('p[lang="en"]').map(n=>n.textContent),english?[p.explanation.en]:[]);assert(!article.querySelector('.ck-source-credits'));assert(!html.includes('undefined'));}}
 try{let corrupt=true;const append=e.d.head.appendChild.bind(e.d.head);e.d.head.appendChild=function(n){const out=append(n);if(String(n.tagName).toLowerCase()==='script'&&String(n.src).startsWith('/chok-qualified-zohar.js?'))queueMicrotask(()=>{const bytes=current+(corrupt?' ':'');assert.equal(n.src,'/chok-qualified-zohar.js?v='+hash(current));const sri='sha256-'+crypto.createHash('sha256').update(bytes).digest('base64');if(sri!==n.integrity){events.push('integrity-error');n.onerror();return;}events.push('verified-load');vm.runInContext(bytes,e.box);n.onload();});return out;};
 const main=read('public/chok.js'),marker="  if (document.readyState === 'loading') {";assert.equal(main.split(marker).length,2);assert(main.includes('if (revision !== state.renderRevision) return;'));vm.runInContext(main.replace(marker,"  globalThis.actualToldosTuesday=function(day,english,commentary){state.sched={weeks:{}};state.focus=null;state.tanachen=english;state.commentary=commentary;state.rashi=commentary;return zoharHTML({vol:'תולדות',daf:141,amud:1},'תולדות',day);};\n"+marker),e.box);
 const denied=await e.box.actualToldosTuesday('יום שלישי',true,true);assert(!denied.includes('data-qualified-zohar="'+key+'"'));assert.equal(requests.length,0);corrupt=false;
 complete(await e.box.actualToldosTuesday('יום ראשון',true,true),oldPacket,true);const pending=e.box.actualToldosTuesday('יום שלישי',true,true);await entered;const newer=await e.box.actualToldosTuesday('יום ראשון',false,false);complete(newer,oldPacket,false);release();delay=false;complete(await pending,packet,true);complete(newer,oldPacket,false);complete(await e.box.actualToldosTuesday('יום ראשון',true,false),oldPacket,true);
 for(const [english,commentary]of [[true,true],[true,false],[false,true],[false,false]])complete(await e.box.actualToldosTuesday('יום שלישי',english,commentary),packet,english);
 assert.deepEqual(events,['integrity-error','verified-load']);assert.deepEqual(requests,[oldPin.url+'?v='+oldPin.sha256,pin.url+'?v='+pin.sha256]);
 }finally{release();e.close();}
});

// Exact already-adopted reuse cohort. These are additions to this registered owning suite.
const clearedAdmission=JSON.parse(read('scripts/chok-all-cleared-zohar-admission.json')),reuseRawReviewed=JSON.parse(read('scripts/chok-zohar-reuse-reviewed.json'));
const reuseReviewed={...reuseRawReviewed,keys:reuseRawReviewed.keys.filter(k=>clearedAdmission.groups.reuse.includes(k)),entries:reuseRawReviewed.entries.filter(r=>clearedAdmission.groups.reuse.includes(r.key)),index:{...clearedAdmission.baselineIndex,...Object.fromEntries(Object.entries(reuseRawReviewed.index).filter(([k])=>clearedAdmission.groups.reuse.includes(k)))}};
const nativeEightRaw=read('scripts/chok-native-eight-reviewed.json'),nativeEightReviewed=JSON.parse(nativeEightRaw),nativeEightAdmission=clearedAdmission.current37;
assert.equal(crypto.createHash('sha256').update(nativeEightRaw).digest('hex'),nativeEightAdmission.oracleSHA256);
const tuesdayAdmission=JSON.parse(read('scripts/chok-lech-tuesday38-admission.json')),tuesdayRaw=read('scripts/chok-lech-tuesday38-reviewed.json'),tuesdayReviewed=JSON.parse(tuesdayRaw);
assert.equal(crypto.createHash('sha256').update(tuesdayRaw).digest('hex'),tuesdayAdmission.oracleSHA256);
function fullZoharIndex(){return {...reuseReviewed.index,...new8Reviewed.index,...nativeEightReviewed.index,[tuesdayReviewed.key]:tuesdayReviewed.payload};}
const reuseSha=x=>crypto.createHash('sha256').update(x).digest('hex');
const reuseCanonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(reuseCanonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+reuseCanonical(x[k])).join(',')+'}';
function reuseModule(e){
 const code=read('public/chok-qualified-zohar.js'),marker='  root.ChokQualifiedZohar=';
 assert.equal(code.split(marker).length,2);
 vm.runInContext(code.replace(marker,'  root.reuseValidate=validate;\n'+marker),e.box);
 return e.box.window.ChokQualifiedZohar;
}
function reuseFields(d,p,english,expectedOriginal){
 const original=d.querySelectorAll('[data-field-role="original-source"]');
 const units=p.units||[{original:p.original,english:p.english}];assert.equal(original.length,units.length);
 original.forEach((n,i)=>assert.equal(n.textContent,expectedOriginal?expectedOriginal(units[i].original):units[i].original));
 const ens=d.querySelectorAll('[data-field-role="english-translation"]');assert.equal(ens.length,english?units.length:0);
 ens.forEach((n,i)=>assert.equal(n.textContent,units[i].english));
 const notes=d.querySelectorAll('[data-zohar-note-owner]');assert.equal(notes.length,p.notes.length);
 notes.forEach((n,i)=>{const q=p.notes[i];assert.equal(n.getAttribute('data-note-id'),q.id);assert.equal(n.querySelector('[lang="he"]').textContent,q.he);assert.equal(n.querySelector('[lang="en"]').textContent,q.en);assert(!n.closest('details'));if(q.unitOwner){assert.equal(n.closest('[data-zohar-unit]').getAttribute('data-zohar-unit'),q.unitOwner);assert.equal(n.getAttribute('data-source-anchor-sha256'),q.sourceAnchorSHA256);}});
 const quals=d.querySelectorAll('[data-zohar-section-qualification]');assert.equal(quals.length,(p.sectionQualifications||[]).length);
 quals.forEach((n,i)=>{const q=p.sectionQualifications[i];assert.equal(n.getAttribute('data-zohar-section-qualification'),q.id);assert.equal(n.querySelector('[lang="he"]').textContent,q.he);assert.equal(n.querySelector('[lang="en"]').textContent,q.en);assert(!n.closest('details'));assert(!n.closest('[hidden]'));const html=d.body?d.body.innerHTML:d.innerHTML;assert.equal(typeof html,'string');assert(html.indexOf(q.id)<html.indexOf('data-zohar-unit='));});
 if(p.explanation){const e=p.explanation,x=d.querySelector('[data-other-group]');assert(x,'complete explanation must render');const ps=x.querySelectorAll('p');assert.equal(ps.length,english?2:1);const he=e.paragraphs?e.paragraphs.map(v=>v.he).join('\n\n'):e.he,en=e.paragraphs?e.paragraphs.map(v=>v.en).join('\n\n'):e.en;assert.equal(ps[0].textContent,he,'all ordered Hebrew explanation paragraphs');if(english)assert.equal(ps[1].textContent,en,'all ordered English explanation paragraphs');assert.equal(x.querySelector('summary').textContent,e.title?e.title.he+' · '+e.title.en:'הסבר הקטע · Passage explanation');}
}
test('reuse attachments API: complete exact fields, full independent registry equality, owner/source/foreign negatives and recovery',async()=>{
 const e=env();try{
  const code=read('public/chok-qualified-zohar.js'),index=JSON.parse(code.match(/var INDEX = (\{[^\n]+\});/)[1]);
  assert.deepEqual(index,fullZoharIndex());assert.deepEqual(Object.keys(index),Object.keys({...clearedAdmission.index,...nativeEightReviewed.index,[tuesdayReviewed.key]:tuesdayReviewed.payload}));
  const nativeStart=Object.keys(clearedAdmission.index).length;assert.deepEqual(Object.keys(index).slice(nativeStart,nativeStart+nativeEightReviewed.rows.length),Object.keys(nativeEightReviewed.index),'fixed eight is bounded, not the growing registry suffix');
  for(const[k,pin]of Object.entries(clearedAdmission.baselineIndex)){assert.deepEqual(index[k],pin,'complete current19 descriptor conservation');}
  const api=reuseModule(e);for(const key of ['לך לך|יום רביעי','נח|יום רביעי','שמות|יום שני']){assert(!api.has(key));await assert.rejects(api.load(key,loader),/not admitted/);}
  for(const row of reuseReviewed.entries){
   const raw=read('public'+row.payload.url),p=JSON.parse(raw);assert.equal(reuseSha(raw),row.payload.sha256);assert.equal(reuseSha(p.original),row.originalSHA256);assert.equal(reuseSha(p.english),row.englishSHA256);assert.equal(reuseSha(reuseCanonical(p.notes)),row.orderedNotesSHA256);assert.deepEqual(p.notes,row.notes);assert.deepEqual(p.units||[],row.units);assert.deepEqual(p.sectionQualifications||[],row.sectionQualifications);assert.deepEqual(p.explanation||null,row.explanation||null);
   await assert.rejects(api.load(row.key,async()=>raw+' '),/packet changed/);const loaded=await api.load(row.key,loader);assert.equal(loaded.key,row.key);
   const corruptions=[q=>q.original+=' ',q=>q.english+=' ',q=>q.sourceOwnerSHA256='0'.repeat(64),q=>q.key='foreign|owner',q=>q.notes[0].owner='foreign|owner',q=>q.notes[0].sourceAnchor+=' ',q=>q.notes[0].sourceSpan[0]++];
   if(p.units)corruptions.push(q=>q.units[0].owner='foreign',q=>q.notes[0].unitOwner=q.units.at(-1).owner+'-foreign',q=>q.notes[0].he+=' ',q=>q.units.length>1?q.units.reverse():q.units.push(q.units[0]));
   if(p.sectionQualifications?.length)corruptions.push(q=>q.sectionQualifications.reverse(),q=>q.sectionQualifications.pop(),q=>q.sectionQualifications.push(q.sectionQualifications[1]),q=>q.sectionQualifications[1].anchors[0].sourceAnchor+=' ');
   for(const corrupt of corruptions){const q=structuredClone(p);corrupt(q);assert.notDeepEqual(q,p,"negative control must actually alter the valid packet: "+row.key);await assert.rejects(Promise.resolve().then(()=>e.box.window.reuseValidate(q,row.key)));}
   await e.box.window.reuseValidate(p,row.key);
   for(const english of [true,false])reuseFields(documentFor('<html><body>'+await api.reading(row.key,english,loader)+'</body></html>'),p,english);
  }
 }finally{e.close();}
});
function reuseMain(e){
 const main=read('public/chok.js'),marker="  if (document.readyState === 'loading') {";assert.equal(main.split(marker).length,2);
 const inject=`  globalThis.reuseMain={reading:function(row,language,mode){state.sched={weeks:{}};state.language=language;state.tanachen=language==='en'||language==='both';state.mode=mode;state.commentary=false;return zoharHTML(row.reference,row.week,row.day);},render:function(row,schedule,language,mode){state.sched=schedule;state.weeks=[row.week];state.day=row.day;state.focus=null;state.language=language;state.tanachen=language==='en'||language==='both';state.mode=mode;state.commentary=false;renderDay();return globalThis.reuseRenderPromise;},project:function(s,mode){return applyWednesdayMode(zoharPresentation(s),mode);}};\n`;
 const observed=main.replace('    Promise.all(jobs).then(function (weekParts) {','    globalThis.reuseRenderPromise=Promise.all(jobs).then(function (weekParts) {');assert.notEqual(observed,main);vm.runInContext(observed.replace(marker,inject+marker),e.box);return e.box.reuseMain;
}
test('reuse attachments actual Main callback: registered language/display meanings, selected queued loader, note locality and once-only qualifications',async()=>{
 const requests=[];const e=env(async url=>{const u=String(url),row=reuseReviewed.entries.find(r=>u===r.payload.url+'?v='+r.payload.sha256);assert(row,'only exact selected packet transport: '+u);requests.push(u);const raw=read('public'+row.payload.url);return{ok:true,status:200,text:async()=>raw,json:async()=>JSON.parse(raw)};});try{reuseModule(e);const main=reuseMain(e);
  for(const row of reuseReviewed.entries){const p=JSON.parse(read('public'+row.payload.url));
   for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters']){
    const html=await main.reading(row,language,mode),d=documentFor('<html><body>'+html+'</body></html>');reuseFields(d,p,['en','both'].includes(language),p.units?s=>main.project(s,language==='original'?'full':mode):s=>language==='original'||mode==='full'?s:main.project(s,mode));
    if(row.key==='בראשית|יום חמישי'){const x=d.querySelector('[data-other-group]');assert(x);assert.equal(x.querySelector('summary').textContent,p.explanation.title.he+' · '+p.explanation.title.en);const ps=x.querySelectorAll('p');assert.equal(ps[0].textContent,p.explanation.paragraphs[0].he);if(['en','both'].includes(language))assert.equal(ps[1].textContent,p.explanation.paragraphs[0].en);assert(!d.querySelector('.ck-source-credits'));}
   }
  }
  assert.deepEqual(requests,reuseReviewed.entries.map(r=>r.payload.url+'?v='+r.payload.sha256),'one genuine queued raw load per selected key across all language/mode projections');
 }finally{e.close();}
});
async function r3OwningReader(nativeFocus=false){
 const {until}=require('./qualified-earlier-parsha-test-dom.cjs'),template=read('src/pages/reader/chok.astro'),markup=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 // Exact caller URLs, including queries, join complete immutable donor bytes.
 // This models transport, script integrity/load/error and registered DOM controls;
 // it is not native browser event, network, paint or CSP enforcement evidence.
 const resources={
 "/tikkun-boundaries.js?v=visible-nikud-20261004-r2": [
  "public/tikkun-boundaries.js",
  "dd7f8e8cbe771f831666b55d3e0ae0a5e07858ae9edb0122cbf4d9eb91e78257",
  17205
 ],
 "/tikkun-qatan.js?v=03678ee00f7b58a15f48e387edfa3060f3257cd297586bdcfba14b24931cddf1": [
  "public/tikkun-qatan.js",
  "03678ee00f7b58a15f48e387edfa3060f3257cd297586bdcfba14b24931cddf1",
  171570
 ],
 "/medooyuk.js?v=f06e1fc21f812fcdd3a9b8f9a9d59daa887f2b57baa028fbb2fd237e864345ea": [
  "public/medooyuk.js",
  "f06e1fc21f812fcdd3a9b8f9a9d59daa887f2b57baa028fbb2fd237e864345ea",
  7508
 ],
 "/psalms-data.js?v=psalms-annotations-20261002-r1&integrity=sha256-20261003": [
  "public/psalms-data.js",
  "b8fb98d96f066f43eb196490afecdeed3dace3ff6c75ed82d6b7a1cc7322c2c7",
  6295
 ],
 "/chok-verse-breslov.js?v=parsha-author-20261020-reader-notes-r1": [
  "public/chok-verse-breslov.js",
  "472731b2c3746b285f1a002c84d401d3d3a78a1652cb4148b0ca239bfbb69d2d",
  36091
 ],
 "/chok-source-reader.js?v=chok-live-corrections-20261020-r1": [
  "public/chok-source-reader.js",
  "edab4f903dec95cb4d62662827b002b6c6f50dd77cf49539c0d368b6939e4a2f",
  33515
 ],
 "/chok-lech-sunday.js?v=chok-live-corrections-20261018-r2": [
  "public/chok-lech-sunday.js",
  "7ce17fdd4c55ce81ed197ff027dafc2df923384e690ab741f8aa8fbc5259943a",
  7304
 ],
 "/chok-lech-monday.js?v=chok-live-corrections-20261019-r1": [
  "public/chok-lech-monday.js",
  "3aac7c5968f875a9765b5ad6abc05619c3163a67a37abb6d7a4739a12fb7a31c",
  6555
 ],
 "/chok-lech-tuesday.js?v=6105a3ee4cb5216795cf74684ffbd59d08f8be3bd2a363b1234394041f3edefd": [
  "public/chok-lech-tuesday.js",
  "6105a3ee4cb5216795cf74684ffbd59d08f8be3bd2a363b1234394041f3edefd",
  5624
 ],
 "/chok-qualified-daily.js?v=9d3039077c36ec66f8e71d65c42ae903f4f5d94b8c7db129cb7b90e6ae580a25": [
  "public/chok-qualified-daily.js",
  "9d3039077c36ec66f8e71d65c42ae903f4f5d94b8c7db129cb7b90e6ae580a25",
  24267
 ],
 "/chok-qualified-daily-classical-selected-v1.js?v=91c4fbea65117b3c507151eb90ed57b466f019c550d9bd1499a4ac82ba6d61f7": [
  "public/chok-qualified-daily-classical-selected-v1.js",
  "91c4fbea65117b3c507151eb90ed57b466f019c550d9bd1499a4ac82ba6d61f7",
  965788
 ],
 "/chok-firstweek-zhm-private-v1.js?v=9bef640c233ec32e0cc8d9fe5945df7bac143d13b22700b5b4199923d21b8acd": [
  "public/chok-firstweek-zhm-private-v1.js",
  "9bef640c233ec32e0cc8d9fe5945df7bac143d13b22700b5b4199923d21b8acd",
  148677
 ],
 "/chok-other-layers.js?v=08cadff0fdba47823afa318720f053bbd1f70e0f2a6943ad632963e3de4febe6": [
  "public/chok-other-layers.js",
  "08cadff0fdba47823afa318720f053bbd1f70e0f2a6943ad632963e3de4febe6",
  8831
 ],
 "/chok-noach-english.js?v=2e4862f7114ff71f6683e689ecce6e6f6b741fc77b920c232da794b03836068f": [
  "public/chok-noach-english.js",
  "2e4862f7114ff71f6683e689ecce6e6f6b741fc77b920c232da794b03836068f",
  16598
 ],
 "/chok-genesis-english.js?v=c6a049d5caa607ed679c912ccae5b7de086b59e1ea173b907eef82cb0df75c12": [
  "public/chok-genesis-english.js",
  "c6a049d5caa607ed679c912ccae5b7de086b59e1ea173b907eef82cb0df75c12",
  8830
 ],
 "/chok.js?v=418514feb99ec895017ddef2b6746f99f2e6c64613a549d5354213c4cf637a06": [
  "public/chok.js",
  "418514feb99ec895017ddef2b6746f99f2e6c64613a549d5354213c4cf637a06",
  135430
 ],
 "/reader/chok/schedule.json?v=1849b9a7f4df8528f4571905d7be97b343e61fff1fe937932833324783e19b3c": [
  "public/reader/chok/schedule.json",
  "1849b9a7f4df8528f4571905d7be97b343e61fff1fe937932833324783e19b3c",
  334583
 ],
 "/reader/chok/shabbos-map.json": [
  "public/reader/chok/shabbos-map.json",
  "77b9555afc38ad9c100e66f42970e16f276653771f8a6188dd6c2d3fb7da7fa8",
  66860
 ],
 "/reader/chok/mishna-bonus.json": [
  "public/reader/chok/mishna-bonus.json",
  "2b0f58b17ad8b3cc6dd3b0eb05269feff31973879180808e31265e5b055b12fe",
  24175
 ],
 "/reader/chok/mussar.json": [
  "public/reader/chok/mussar.json",
  "1df0d88153b80cfa7a73f0751bd66d46d10f16fac8c6329cba4ec2a951b17ce7",
  73777
 ],
 "/reader/chok/day-comm.json": [
  "public/reader/chok/day-comm.json",
  "b8224b3fd01c01451c8d1f2d0aab7c03e9ee198a040740e63b7ab8a3bb8e713e",
  30621
 ],
 "/reader/chok/kavanos-chok.json": [
  "public/reader/chok/kavanos-chok.json",
  "55b278824cedaed939b3ddfa16f1e475ad5097552bd860179d7b9f4d6c6d6022",
  14743
 ],
 "/reader/chok/kavanos-actual.json": [
  "public/reader/chok/kavanos-actual.json",
  "0d47ec27c74f6372ff2ee12b6f23cba25a378f67adf347b130cc753916738d5e",
  20555
 ],
 "/reader/chok/miluy-kavana.json": [
  "public/reader/chok/miluy-kavana.json",
  "0c8c6b9e9077c169db3ba936507e086eb1e3655b392dd453191ca3bf8090a771",
  2767
 ],
 "/reader/chok/hk-verses.json?v=2": [
  "public/reader/chok/hk-verses.json",
  "d603406f13f1842f801aa38a695c4b111297e4a205f64daec355ec0733576c73",
  334772
 ],
 "/reader/chok/kavanos-torah.json": [
  "public/reader/chok/kavanos-torah.json",
  "89afa1d0ca0f9d312627ecda2f27aa96f2a9921c459502f423933aa95d109d09",
  7747
 ],
 "/reader/chok/noach-tuesday.json?v=cc1a3f8ae3dc25215bc655cad65ba90374a106e3a5780983f562dd00c5f04cd2": [
  "public/reader/chok/noach-tuesday.json",
  "cc1a3f8ae3dc25215bc655cad65ba90374a106e3a5780983f562dd00c5f04cd2",
  1209319
 ],
 "/reader/chok/noach-source-notes.json?v=3c55e03dbdbbb935786debe80d6b3e17af27be56fb154381a1d515fd5514f56b": [
  "public/reader/chok/noach-source-notes.json",
  "3c55e03dbdbbb935786debe80d6b3e17af27be56fb154381a1d515fd5514f56b",
  45757
 ],
 "/reader/chumash-lh/part-1/torah-2.json?v=948c86e763be5c270d46206a36d0d4d7ab459264ac7b930bd36499c85a92894b": [
  "public/reader/chumash-lh/part-1/torah-2.json",
  "948c86e763be5c270d46206a36d0d4d7ab459264ac7b930bd36499c85a92894b",
  523246
 ],
 "/reader/chok/noach-week.json?v=736b386986536586f0a79af1080d95a73467e5824cf3bfad5fefd03d5d0559d6": [
  "public/reader/chok/noach-week.json",
  "736b386986536586f0a79af1080d95a73467e5824cf3bfad5fefd03d5d0559d6",
  846750
 ],
 "/reader/chumash-lh/part-1/torah-3.json?v=5c9878ffbc5d8afaf7794569b0772710c82d5e4846b3b8e9734f72b08ed6c765": [
  "public/reader/chumash-lh/part-1/torah-3.json",
  "5c9878ffbc5d8afaf7794569b0772710c82d5e4846b3b8e9734f72b08ed6c765",
  1178849
 ],
 "/reader/chok/lech-lichuh-breslov-projections.json?v=884a4b47c50f3db030f36733c04b10ade7ffe190f30b708a81906f8df867e8ee": [
  "public/reader/chok/lech-lichuh-breslov-projections.json",
  "884a4b47c50f3db030f36733c04b10ade7ffe190f30b708a81906f8df867e8ee",
  184023
 ],
 "/reader/chok/breslov-reading-notes.json?v=a1df2e7e0ff4dbcabacce67bd05e8ad976078d0edba742f84bc6a9f4a35309a5": [
  "public/reader/chok/breslov-reading-notes.json",
  "a1df2e7e0ff4dbcabacce67bd05e8ad976078d0edba742f84bc6a9f4a35309a5",
  69881
 ],
 "/data/breslov-parsha/qualified-1-109/index.json?v=parsha-author-20261018-r1": [
  "public/data/breslov-parsha/qualified-1-109/index.json",
  "a8475632c1c5ac323308023b41997484fc168c14c4f3c19d8015e5d1842f6a50",
  28137
 ],
 "/data/breslov-parsha/qualified-1-109/master.json?v=parsha-author-20261016-r2-qualified-1-109": [
  "public/data/breslov-parsha/qualified-1-109/master.json",
  "5ad0dafb08c2ba0fe1ed15b2775f379c2f668757253c3a7e907d1aeb0aa5433a",
  1909127
 ],
 "/data/breslov-parsha/qualified-110-171/index.json?v=parsha-author-20261018-r1": [
  "public/data/breslov-parsha/qualified-110-171/index.json",
  "bef8fc090fa2df1a5ffdc3a326becd3a17debf81424f65ab9db7ca730fabb4fb",
  12918
 ],
 "/data/breslov-parsha/qualified-110-171/master.json?v=parsha-author-20261018-r1-qualified-110-171": [
  "public/data/breslov-parsha/qualified-110-171/master.json",
  "3845155190249229dcd795f6114ebd7710e9704caf26af94bc8ee320c560105e",
  1415589
 ],
 "/data/breslov-parsha/qualified-172-269/index.json?v=parsha-author-20261018-r1": [
  "public/data/breslov-parsha/qualified-172-269/index.json",
  "dcf3536a602d910f3b6b5dc91aac38b35ccfe9adf82a58ff86691fe111ee4c37",
  19410
 ],
 "/data/breslov-parsha/qualified-172-269/master.json?v=parsha-author-20261018-r1-qualified-172-269": [
  "public/data/breslov-parsha/qualified-172-269/master.json",
  "57662889a08daf3272c2ab5572a84059c44f7fe5b84b65f301c583443c276143",
  2689086
 ],
 "/reader/medooyuk/tanach-bereishit.json?v=a2633f304364c9592f2f9637aeee4730a28c52303bc80a508c4af26faa7fba9b": [
  "public/reader/medooyuk/tanach-bereishit.json",
  "a2633f304364c9592f2f9637aeee4730a28c52303bc80a508c4af26faa7fba9b",
  602727
 ],
 "/reader/medooyuk/targum/tanach-bereishit.json": [
  "public/reader/medooyuk/targum/tanach-bereishit.json",
  "771f4285b18b9a58771d19b31b85d9f3c1b671306819fef8f7f6c3c6183d5b53",
  351927
 ],
 "/reader/tanachen/tanach-bereishit.json": [
  "public/reader/tanachen/tanach-bereishit.json",
  "48bd5089b894460735da8270d70d300ee5d41bc23a79296dab6238200e489399",
  272692
 ],
 "/reader/rashi/tanach-bereishit.json": [
  "public/reader/rashi/tanach-bereishit.json",
  "6d4c07df6325be05ea5dd744b0e184c8f35471cc61debccb9f9e1a87be160fc4",
  629660
 ],
 "/reader/rashi/en/tanach-bereishit.json": [
  "public/reader/rashi/en/tanach-bereishit.json",
  "677e6f729774d0912f7684d7c3c133f89b56c3a9b16c0dad783431ee9b2035a9",
  635429
 ],
 "/reader/medooyuk/tanach-yeshayahu.json": [
  "public/reader/medooyuk/tanach-yeshayahu.json",
  "55af3c185febf9001de261cc93e5ed92ab1290513fbd04f3df65976d1b6e1695",
  528809
 ],
 "/reader/medooyuk/targum/tanach-yeshayahu.json": [
  "public/reader/medooyuk/targum/tanach-yeshayahu.json",
  "8cc3f3ff775da9b912362d1711784cdb04af334b58f7b7f984a11f1eec04a454",
  366935
 ],
 "/reader/tanachen/tanach-yeshayahu.json": [
  "public/reader/tanachen/tanach-yeshayahu.json",
  "3e1f41a55fa21936d0e19a2ad865b5fd8d6cc52b09bb70ddb8cad4c7c0a8e401",
  253201
 ],
 "/reader/rashi/tanach-yeshayahu.json": [
  "public/reader/rashi/tanach-yeshayahu.json",
  "f39c918bf7384952413a5ac3c955a0f2fd670c9b692e9c5a9c57aec2d213bfd3",
  728770
 ],
 "/reader/rashi/en/tanach-yeshayahu.json": [
  "public/reader/rashi/en/tanach-yeshayahu.json",
  "10230eb8101a12aa41d9d7cf5b5aea21fd2209f1f70a6a4054126c81373e7cac",
  531019
 ],
 "/reader/commentary/navi-metzudas/tanach-yeshayahu.json": [
  "public/reader/commentary/navi-metzudas/tanach-yeshayahu.json",
  "36641dc623a7fcd2eabec3b2039231161e03d4f438cbf4880380a816799d5a3d",
  164810
 ],
 "/reader/medooyuk/tanach-mishlei.json": [
  "public/reader/medooyuk/tanach-mishlei.json",
  "12104a7a343fdf75a0bee0bb502f5c818c9a04cf53b8c32b62eb98e5df9fb2b6",
  220887
 ],
 "/reader/medooyuk/targum/tanach-mishlei.json": [
  "public/reader/medooyuk/targum/tanach-mishlei.json",
  "ec74e06be0c271889eb5640e962b8edb0344d5cdcda2b8867e51698ac801445e",
  140951
 ],
 "/reader/tanachen/tanach-mishlei.json": [
  "public/reader/tanachen/tanach-mishlei.json",
  "c76d9dd0d88ba0bd3a5e46fe0572ecb7bd27357ac8ce7a4acccb7fe90458e4aa",
  122389
 ],
 "/reader/rashi/tanach-mishlei.json": [
  "public/reader/rashi/tanach-mishlei.json",
  "3eb17b606076608f52523225f15a7f0babaa0bb8d80482425e565e7670d017cb",
  274408
 ],
 "/reader/rashi/en/tanach-mishlei.json": [
  "public/reader/rashi/en/tanach-mishlei.json",
  "03d530aa6ac5744fddd97fd693dc755a5dd90edf2101f3a8fbe3f686977fa989",
  190774
 ],
 "/reader/commentary/navi-metzudas/tanach-mishlei.json": [
  "public/reader/commentary/navi-metzudas/tanach-mishlei.json",
  "357d4765f57edbbe940f819a233339e3ac7ee7e743ab6ad3f7cfe0644e5da600",
  213099
 ],
 "/reader/medooyuk/tanach-malachi.json": [
  "public/reader/medooyuk/tanach-malachi.json",
  "002fe83ae3b50a7cd777418041d9a8bc31c404695b87ed831fac2ea466ded2bc",
  26964
 ],
 "/reader/medooyuk/targum/tanach-malachi.json": [
  "public/reader/medooyuk/targum/tanach-malachi.json",
  "eabcfeac753137d077c23344a2d8f96f59c4cdce93dfd642e946356cdb1c0bba",
  16875
 ],
 "/reader/tanachen/tanach-malachi.json": [
  "public/reader/tanachen/tanach-malachi.json",
  "e86e98c53e7fc534740fe2e403a4e7a0826cf089706846c55298e3c9e3f8828b",
  11860
 ],
 "/reader/rashi/tanach-malachi.json": [
  "public/reader/rashi/tanach-malachi.json",
  "b24f2ae00d189bf7ea9d01de188cfd5dc045c6008fd2d6a285ff8a724cfdaf8b",
  27938
 ],
 "/reader/rashi/en/tanach-malachi.json": [
  "public/reader/rashi/en/tanach-malachi.json",
  "b416a82506622093be138ac8b590efc829a18f84c384aa54693ad02a09cd54ec",
  18328
 ],
 "/reader/commentary/navi-metzudas/tanach-malachi.json": [
  "public/reader/commentary/navi-metzudas/tanach-malachi.json",
  "702714e66d1202795a58968440ea4152ae6bc31bbc382a59ed0814437708bdaa",
  15736
 ],
 "/reader/medooyuk/tanach-tehillim.json?v=psalms-annotations-20261002-r1": [
  "public/reader/medooyuk/tanach-tehillim.json",
  "2720255084dc1c822d31c126cbbff9da71fa96d75e03bfed989c6defd927f881",
  650786
 ],
 "/reader/medooyuk/targum/tanach-tehillim.json": [
  "public/reader/medooyuk/targum/tanach-tehillim.json",
  "454d00040669eec07cb3f208a682d02d48c2fe9b555d040032990fa727bc2b73",
  431037
 ],
 "/reader/tanachen/tanach-tehillim.json": [
  "public/reader/tanachen/tanach-tehillim.json",
  "aa7e53bd684f5756e2d21b353a06efe4a3c4884884fd77b708771b0ca955b94c",
  344518
 ],
 "/reader/rashi/tanach-tehillim.json": [
  "public/reader/rashi/tanach-tehillim.json",
  "9a019217df4b5adc3cf6bd7d499b4e67e5f780bee0b46af8f4cd83eec1bb0d0b",
  665269
 ],
 "/reader/rashi/en/tanach-tehillim.json": [
  "public/reader/rashi/en/tanach-tehillim.json",
  "ec46aa1b28f6c8d0331e6f4af64baf955581c39bd2532dd469fc7648ff9a1dc9",
  462020
 ],
 "/reader/commentary/navi-metzudas/tanach-tehillim.json": [
  "public/reader/commentary/navi-metzudas/tanach-tehillim.json",
  "a3edd0f98693a994e276afe38ceadd6027b6254890c1001fa4075b402c2c6ec9",
  89578
 ],
 "/reader/commentary/mishna-bartenura/mishna-mikvaot.json": [
  "public/reader/commentary/mishna-bartenura/mishna-mikvaot.json",
  "bd19d1d095cd4fce82f3c24f5fae4fded8ad9e395060364e1a25fcac0b880615",
  126441
 ],
 "/reader/commentary/mishna-bartenura/mishna-shabbat.json": [
  "public/reader/commentary/mishna-bartenura/mishna-shabbat.json",
  "65f914c7e3a9aad39466853b33c64a7c7d9a7ccb8c43f135052061e202d93f79",
  309232
 ],
 "/reader/commentary/mishna-bartenura/mishna-yevamot.json": [
  "public/reader/commentary/mishna-bartenura/mishna-yevamot.json",
  "3dc90de350ac69e73a5ff9e3ae8da885ecb78c391affbac39d6e87a8702b69b1",
  180510
 ],
 "/reader/commentary/rashi-super/tanach-bereishit.json": [
  "public/reader/commentary/rashi-super/tanach-bereishit.json",
  "09526e3648d859189ff4ee37225961b3bc37053981fd18faad9c6c13797d51ba",
  8856701
 ],
 "/reader/commentary/sa-magen-avraham/sa-yd-246.json": [
  "public/reader/commentary/sa-magen-avraham/sa-yd-246.json",
  "cb20ff139d269dc9d540e0bef4e772e55bb1927c66c878baf85f8e8aea69398c",
  2897883
 ],
 "/reader/commentary/torah-ramban/tanach-bereishit.json": [
  "public/reader/commentary/torah-ramban/tanach-bereishit.json",
  "ba180cf684b8baf8adc88eef9685777cc1fd9ecaef048f408282ecec97730981",
  1453554
 ],
 "/reader/mishna/mishna-challah.json": [
  "public/reader/mishna/mishna-challah.json",
  "b584a7497d0aff1ca75c669663195a86f85190e5279440912f0665728e5bf503",
  20698
 ],
 "/reader/mishna/mishna-maaser-sheni.json": [
  "public/reader/mishna/mishna-maaser-sheni.json",
  "22272f8cacedf998488ea7669423a140558d6aa691e578ac0ec33f486c83c6cf",
  36244
 ],
 "/reader/mishna/mishna-mikvaot.json": [
  "public/reader/mishna/mishna-mikvaot.json",
  "f31cb5cb69bca6d82507f8ffdbe689992fc130edb6639d74975df5cbce75d12d",
  50313
 ],
 "/reader/mishna/mishna-shabbat.json": [
  "public/reader/mishna/mishna-shabbat.json",
  "2b3f9ccfbd650e6c08cb56f7280aa2706493b876e1f3e1fa065ebe1875d73ea5",
  86822
 ],
 "/reader/rambam/rambam-yesodey-hatorah.json": [
  "public/reader/rambam/rambam-yesodey-hatorah.json",
  "b0f82ecb82fdd300582006e7729a0c941aa604fe75ee86fe6cb223f03d786fef",
  23652
 ],
 "/reader/shulchan/OC.json": [
  "public/reader/shulchan/OC.json",
  "f83dee65b16357bb174a87cb3402cc2ed8399aee9c6c23c6fdd6f54d88438533",
  205350
 ],
 "/reader/shulchan/YD.json": [
  "public/reader/shulchan/YD.json",
  "29a95e51dbfc940d993c6dfde9f5e98e6408879307a8b0911ccbac629c0076bb",
  188827
 ],
 "/reader/chok/commentary/%D7%9C%D7%9A%20%D7%9C%D7%9A-yom-sheni.json": ["public/reader/chok/commentary/לך לך-yom-sheni.json", "9c58999c950b5f6b32d0b31c4859732b796de8b8864a4bfabef185fb63eebc0e", 223462],
 "/reader/chok/commentary/%D7%9C%D7%9A%20%D7%9C%D7%9A-yom-shishi.json": ["public/reader/chok/commentary/לך לך-yom-shishi.json", "30dab992f2705d0025f137a7b76344cb1ee702152ca5cf9784dd4f28461581f8", 266383],
 "/reader/chok/commentary/%D7%A0%D7%97-yom-sheni.json": ["public/reader/chok/commentary/נח-yom-sheni.json", "908059c75a53ee2d3054226c6d98a5a8960567a9c7f52c8746465e327aa6b185", 67658],
 "/reader/chok/commentary/%D7%A0%D7%97-yom-shishi.json": ["public/reader/chok/commentary/נח-yom-shishi.json", "f140f382ed8dab280232e13072dbf10352a1f8f9ed8d117fc02d8af9b8506472", 229446],
 "/reader/chok/commentary/%D7%A0%D7%97-yom-shlishi.json": ["public/reader/chok/commentary/נח-yom-shlishi.json", "f418174d164d492d4f63f6a42f6c0df4877c4513e814ce1e678a5d75296fea0b", 112128],
 "/reader/chok/commentary/%D7%AA%D7%95%D7%9C%D7%93%D7%95%D7%AA-yom-sheni.json": ["public/reader/chok/commentary/תולדות-yom-sheni.json", "b4c1891d86ee927cf3a1eeeb2d1325efd64f3c4f883cd63305e5bcf05bc811a2", 91013],
 "/reader/commentary/sa-magen-avraham/sa-oc-251.json": null,
 "/reader/chok/qualified/p10-lech-friday-mishna-talmud.json?v=5fdfabd5d5a70e8d03720117542e9746127a07bbe765897cc7218cdf65ccd8de": [
  "public/reader/chok/qualified/p10-lech-friday-mishna-talmud.json",
  "5fdfabd5d5a70e8d03720117542e9746127a07bbe765897cc7218cdf65ccd8de",
  80488
 ],
 "/reader/chok/qualified/p06-toldos-monday-mishna-bartenura-gemara-rashi.json?v=cb53a3471f61d6cbb6181e496bb981ac016d894b37eb40304220ee40cccd591f": [
  "public/reader/chok/qualified/p06-toldos-monday-mishna-bartenura-gemara-rashi.json",
  "cb53a3471f61d6cbb6181e496bb981ac016d894b37eb40304220ee40cccd591f",
  112944
 ],
 "/reader/chok/qualified-zohar/lech-yom-sheni-reuse.json?v=014110425174f202c79952060f46fdcf47d530d5e097c55cbfaa588db6cc4cd2": [
  "public/reader/chok/qualified-zohar/lech-yom-sheni-reuse.json",
  "014110425174f202c79952060f46fdcf47d530d5e097c55cbfaa588db6cc4cd2",
  11129
 ],
 "/reader/chok/qualified-zohar/lech-yom-shishi-reuse.json?v=ee79b67cdd12b4e8c12edcd2de924287b9cd4eb23099f6146f3d98125ea7c48b": [
  "public/reader/chok/qualified-zohar/lech-yom-shishi-reuse.json",
  "ee79b67cdd12b4e8c12edcd2de924287b9cd4eb23099f6146f3d98125ea7c48b",
  6980
 ],
 "/reader/chok/qualified-zohar/noach-yom-shlishi-reuse.json?v=e121b5dc143ec9c0c584e819f3b3263a58ed3843e19431e65b47260e04c1d68c": [
  "public/reader/chok/qualified-zohar/noach-yom-shlishi-reuse.json",
  "e121b5dc143ec9c0c584e819f3b3263a58ed3843e19431e65b47260e04c1d68c",
  17029
 ],
 "/reader/chok/qualified-zohar/toldos-yom-sheni-reuse.json?v=9342eebc5d08f977db933e616fd5be38fead4bd128d0cdc7ce0bc2c3815dc769": [
  "public/reader/chok/qualified-zohar/toldos-yom-sheni-reuse.json",
  "9342eebc5d08f977db933e616fd5be38fead4bd128d0cdc7ce0bc2c3815dc769",
  36486
 ],
 "/reader/chok/nach-ranges.json?v=explicit-nach-ranges-20261006-r1": [
  "public/reader/chok/nach-ranges.json",
  "796618d27c862a96e194e4c2faf635717f5702e0e4e9f6d501aab6706e2cc30f",
  418722
 ],
 "/reader/kavanos/index.json": [
  "public/reader/kavanos/index.json",
  "a083e9d385bdbb8d4fdf00064b98540933f22482fe0ea1c742a11784aad23842",
  3024
 ],
 "/reader/chok/lech-monday-talmud.json?v=9ba77fcf71a9cbc61b5926426b7c455a58f9796968e188b7ad941bdeba9abde1": [
  "public/reader/chok/lech-monday-talmud.json",
  "9ba77fcf71a9cbc61b5926426b7c455a58f9796968e188b7ad941bdeba9abde1",
  92885
 ],
 "/reader/chok/noach-bartenura-english.json?v=9e301739920c3f6de7e7a68726323c2e809d8e2f2b022ec9663a623bd8d3eed8": [
  "public/reader/chok/noach-bartenura-english.json",
  "9e301739920c3f6de7e7a68726323c2e809d8e2f2b022ec9663a623bd8d3eed8",
  266228
 ],
 "/reader/chok/zohar-day-passages.json?v=2bb410d428ad16e96b95ef59e150367589a174db56312b6b698243514fb3bf2a": [
  "public/reader/chok/zohar-day-passages.json",
  "2bb410d428ad16e96b95ef59e150367589a174db56312b6b698243514fb3bf2a",
  1001311
 ],
 "/chok-scheduled-bible.js?v=93056aac35b093cdbb7ebc7efa9bf3daa858ad8e0882ca77bb6535a4ac3395af": [
  "public/chok-scheduled-bible.js",
  "93056aac35b093cdbb7ebc7efa9bf3daa858ad8e0882ca77bb6535a4ac3395af",
  6754
 ],
 "/chok-qualified-zohar.js?v=d89f12181e90034b08d036cf96fe7493ed984776db5a5574a515e0c095346a08": [
  "public/chok-qualified-zohar.js",
  "d89f12181e90034b08d036cf96fe7493ed984776db5a5574a515e0c095346a08",
  31918
 ],
 "/reader/chok/scheduled-bible-english.json?v=dccecf062d41d2bd0eebe34cd7ceacc5a040dbbad296da427a1c722fef77fcc3": [
  "public/reader/chok/scheduled-bible-english.json",
  "dccecf062d41d2bd0eebe34cd7ceacc5a040dbbad296da427a1c722fef77fcc3",
  790996
 ],
 "/reader/chok/genesis-english/portion-03.json?v=f8535a0d641212d21e14717f6eaeb7cee407d710d292fec0cc60ae30f0d9c92c": [
  "public/reader/chok/genesis-english/portion-03.json",
  "f8535a0d641212d21e14717f6eaeb7cee407d710d292fec0cc60ae30f0d9c92c",
  148853
 ],
 "/reader/chok/genesis-english/portion-02.json?v=3a59a0f0f21dbaa2f46b5192bcd29ae909bb04a722ade03294412c3d1f1b965d": [
  "public/reader/chok/genesis-english/portion-02.json",
  "3a59a0f0f21dbaa2f46b5192bcd29ae909bb04a722ade03294412c3d1f1b965d",
  133426
 ],
 "/reader/chok/genesis-english/portion-06.json?v=d6002f14e665c298a9083fe8cdd58c50c82701eb8217d8adcc386df27fe6609b": [
  "public/reader/chok/genesis-english/portion-06.json",
  "d6002f14e665c298a9083fe8cdd58c50c82701eb8217d8adcc386df27fe6609b",
  134118
 ]
};
 const scriptIntegrity={
 "/tikkun-boundaries.js?v=visible-nikud-20261004-r2": null,
 "/tikkun-qatan.js?v=03678ee00f7b58a15f48e387edfa3060f3257cd297586bdcfba14b24931cddf1": null,
 "/medooyuk.js?v=f06e1fc21f812fcdd3a9b8f9a9d59daa887f2b57baa028fbb2fd237e864345ea": null,
 "/psalms-data.js?v=psalms-annotations-20261002-r1&integrity=sha256-20261003": null,
 "/chok-verse-breslov.js?v=parsha-author-20261020-reader-notes-r1": null,
 "/chok-source-reader.js?v=chok-live-corrections-20261020-r1": null,
 "/chok-lech-sunday.js?v=chok-live-corrections-20261018-r2": null,
 "/chok-lech-monday.js?v=chok-live-corrections-20261019-r1": null,
 "/chok-lech-tuesday.js?v=6105a3ee4cb5216795cf74684ffbd59d08f8be3bd2a363b1234394041f3edefd": null,
 "/chok-qualified-daily.js?v=9d3039077c36ec66f8e71d65c42ae903f4f5d94b8c7db129cb7b90e6ae580a25": "sha256-nTA5B3w27Gb45x1lxCrpA/T12UuMfbEpy3uQ5q5YCiU=",
 "/chok-qualified-daily-classical-selected-v1.js?v=91c4fbea65117b3c507151eb90ed57b466f019c550d9bd1499a4ac82ba6d61f7": "sha256-kcT76mURezxQcVHrkO1XtGbwGcVQ2b0UmaSsgrptYfc=",
 "/chok-firstweek-zhm-private-v1.js?v=9bef640c233ec32e0cc8d9fe5945df7bac143d13b22700b5b4199923d21b8acd": "sha256-m+9kDCM+wy4MyNn+WUXfe6wUPROyJwC1tBmZI9Ibis0=",
 "/chok-other-layers.js?v=08cadff0fdba47823afa318720f053bbd1f70e0f2a6943ad632963e3de4febe6": "sha256-CMrf8P26R4I6+jGHIPBTu9H3Dg8qaUOtYylj495P6+Y=",
 "/chok-noach-english.js?v=2e4862f7114ff71f6683e689ecce6e6f6b741fc77b920c232da794b03836068f": "sha256-Lkhi9xFP9x9mg+aJ7M5ub2t0H8d7kgwjLaeUsDg2Bo8=",
 "/chok-genesis-english.js?v=c6a049d5caa607ed679c912ccae5b7de086b59e1ea173b907eef82cb0df75c12": "sha256-xqBJ1cqmB+1nnJEsyuW33ghrWeHqFzuQfu+Cyw33XBI=",
 "/chok.js?v=418514feb99ec895017ddef2b6746f99f2e6c64613a549d5354213c4cf637a06": "sha384-88MFnYdCx8k9jZ0lwm0dkjoLjm5S2AhsZ4VNCzow95TvPjivJP/s/yNOyAur54pd",
 "/chok-scheduled-bible.js?v=93056aac35b093cdbb7ebc7efa9bf3daa858ad8e0882ca77bb6535a4ac3395af": "sha256-kwVqrDWwk827frx++pvz2qhYrY4Igsp3u2U1pKwzla8=",
 "/chok-qualified-zohar.js?v=d89f12181e90034b08d036cf96fe7493ed984776db5a5574a515e0c095346a08": "sha256-2J8SGB6QA0sI0DbPlv50k+2YR3bbWlV0pRXgwJU0agg="
};
 const declaredOrder=[
 "/tikkun-boundaries.js?v=visible-nikud-20261004-r2",
 "/tikkun-qatan.js?v=03678ee00f7b58a15f48e387edfa3060f3257cd297586bdcfba14b24931cddf1",
 "/medooyuk.js?v=f06e1fc21f812fcdd3a9b8f9a9d59daa887f2b57baa028fbb2fd237e864345ea",
 "/psalms-data.js?v=psalms-annotations-20261002-r1&integrity=sha256-20261003",
 "/chok-verse-breslov.js?v=parsha-author-20261020-reader-notes-r1",
 "/chok-source-reader.js?v=chok-live-corrections-20261020-r1",
 "/chok-lech-sunday.js?v=chok-live-corrections-20261018-r2",
 "/chok-lech-monday.js?v=chok-live-corrections-20261019-r1",
 "/chok-lech-tuesday.js?v=6105a3ee4cb5216795cf74684ffbd59d08f8be3bd2a363b1234394041f3edefd",
 "/chok-qualified-daily.js?v=9d3039077c36ec66f8e71d65c42ae903f4f5d94b8c7db129cb7b90e6ae580a25",
 "/chok-qualified-daily-classical-selected-v1.js?v=91c4fbea65117b3c507151eb90ed57b466f019c550d9bd1499a4ac82ba6d61f7",
 "/chok-firstweek-zhm-private-v1.js?v=9bef640c233ec32e0cc8d9fe5945df7bac143d13b22700b5b4199923d21b8acd",
 "/chok-other-layers.js?v=08cadff0fdba47823afa318720f053bbd1f70e0f2a6943ad632963e3de4febe6",
 "/chok-noach-english.js?v=2e4862f7114ff71f6683e689ecce6e6f6b741fc77b920c232da794b03836068f",
 "/chok-genesis-english.js?v=c6a049d5caa607ed679c912ccae5b7de086b59e1ea173b907eef82cb0df75c12",
 "/chok.js?v=418514feb99ec895017ddef2b6746f99f2e6c64613a549d5354213c4cf637a06"
];
 const originalResourceCount=Object.keys(resources).length;assert.equal(originalResourceCount,105);assert.equal(Object.values(resources).filter(v=>v===null).length,1);
 const todayZoharAssets=[{"path":"public/chok.js","beforeURL":"/chok.js?v=0fa752655b0c54a5d5947d1ebd92b6d30b2a87c858d0f811b5685aeceb834e22","url":"/chok.js?v=a4dca5305bbec0b248a163db9f0a88a08e40c44a5a88fbd67091bf7cf2cac950","sha256":"a4dca5305bbec0b248a163db9f0a88a08e40c44a5a88fbd67091bf7cf2cac950","bytes":136908,"integrity":"sha384-9InPeCaiy/TRVcgnpaHNNx1vfRzpiy5ZQp1XCNkrf8FCDVkG8/Ut5bn5/93XrFBD"},{"path":"public/reader/chok/zohar-day-passages.json","beforeURL":"/reader/chok/zohar-day-passages.json?v=2bb410d428ad16e96b95ef59e150367589a174db56312b6b698243514fb3bf2a","url":"/reader/chok/zohar-day-passages.json?v=0bbd695d0b8d4398793a73ba6cea30e3512c9e30079dbece7c5e34301d5eb8d3","sha256":"0bbd695d0b8d4398793a73ba6cea30e3512c9e30079dbece7c5e34301d5eb8d3","bytes":1010102,"integrity":null}];
 for(const a of todayZoharAssets){const bytes=require('./chok-original52-private-inverse.cjs').restore(a.path,require('./chok-original43-private-inverse.cjs').restore(a.path,require('./chok-original2-bo-tazria-private-inverse.cjs').restore(a.path,fs.readFileSync(path.join(root,a.path)))));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);const prior=require('./chok-reference-order-conservation.cjs').restoreTodayZohar(a.path,bytes);assert.notDeepEqual(prior,bytes);assert.equal(crypto.createHash('sha256').update(prior).digest('hex'),a.beforeURL.split('?v=')[1]);assert(!Object.hasOwn(resources,a.url));resources[a.url]=[a.path,a.sha256,a.bytes];if(a.integrity)scriptIntegrity[a.url]=a.integrity;}
 const original51Assets=[{"path":"public/chok.js","beforeURL":"/chok.js?v=a4dca5305bbec0b248a163db9f0a88a08e40c44a5a88fbd67091bf7cf2cac950","url":"/chok.js?v=fd0d203218c2d69df5e9954388a51f102b8a2629cd85b26ee07d17fa113cfa75","sha256":"fd0d203218c2d69df5e9954388a51f102b8a2629cd85b26ee07d17fa113cfa75","bytes":136908,"integrity":"sha384-Bo+RmXHxG3O80M97/AFrLQVM9kPwePyKuQplSDcGvwt3c21tus7Q65nclrOOiDQT"},{"path":"public/reader/chok/zohar-day-passages.json","beforeURL":"/reader/chok/zohar-day-passages.json?v=0bbd695d0b8d4398793a73ba6cea30e3512c9e30079dbece7c5e34301d5eb8d3","url":"/reader/chok/zohar-day-passages.json?v=ce8ce498c9f97991c1d71208b48ce9c7b9fe5edc3cf5c48552273e7b30c0350e","sha256":"ce8ce498c9f97991c1d71208b48ce9c7b9fe5edc3cf5c48552273e7b30c0350e","bytes":1409813,"integrity":null}];
 for(const a of original51Assets){const bytes=require('./chok-original43-private-inverse.cjs').restore(a.path,require('./chok-original2-bo-tazria-private-inverse.cjs').restore(a.path,fs.readFileSync(path.join(root,a.path))));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256);assert.equal(bytes.length,a.bytes);const prior=require('./chok-original52-private-inverse.cjs').restore(a.path,bytes);assert.equal(crypto.createHash('sha256').update(prior).digest('hex'),a.beforeURL.split('?v=')[1]);assert(!Object.hasOwn(resources,a.url));resources[a.url]=[a.path,a.sha256,a.bytes];if(a.integrity)scriptIntegrity[a.url]=a.integrity;}
 const original43Assets=[{"path":"public/chok.js","beforeURL":"/chok.js?v=fd0d203218c2d69df5e9954388a51f102b8a2629cd85b26ee07d17fa113cfa75","url":"/chok.js?v=7483baeb3a58adbe8c858b5bb2d9bfd6e58ab6c14b541266da3edb7fb69d06d7","sha256":"7483baeb3a58adbe8c858b5bb2d9bfd6e58ab6c14b541266da3edb7fb69d06d7","bytes":140957,"integrity":"sha384-UfCDtO6N9tlZYd1Ba2V8t7yoXhykRI2zlrYyEkcwcTaONu0z7zwovmgnBhnAcVZQ"},{"path":"public/reader/chok/zohar-day-passages.json","beforeURL":"/reader/chok/zohar-day-passages.json?v=ce8ce498c9f97991c1d71208b48ce9c7b9fe5edc3cf5c48552273e7b30c0350e","url":"/reader/chok/zohar-day-passages.json?v=3f2dcb34379bad0850f43bce60b5c4b7b1958de93b8f516815a70e9b9822c812","sha256":"3f2dcb34379bad0850f43bce60b5c4b7b1958de93b8f516815a70e9b9822c812","bytes":2125900,"integrity":null}];
 for(const a of original43Assets){const bytes=require('./chok-original2-bo-tazria-private-inverse.cjs').restore(a.path,fs.readFileSync(path.join(root,a.path)));assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),a.sha256);resources[a.url]=[a.path,a.sha256,a.bytes];if(a.integrity)scriptIntegrity[a.url]=a.integrity;}
 const original2BoTazriaAssets=[{"path":"public/chok.js","beforeURL":"/chok.js?v=7483baeb3a58adbe8c858b5bb2d9bfd6e58ab6c14b541266da3edb7fb69d06d7","url":"/chok.js?v=77fb56e4fbd4f47aba573e24821d5d2ff9ecb6cbb0fba88cbba45296288b5c84","sha256":"77fb56e4fbd4f47aba573e24821d5d2ff9ecb6cbb0fba88cbba45296288b5c84","bytes":140957,"integrity":"sha384-ct8fm2KEwSo2tAZOQRMntLHeRY8F8RswDpAaUrl2nU1rMim6OogOC5JeEOXcaEkx"},{"path":"public/reader/chok/zohar-day-passages.json","beforeURL":"/reader/chok/zohar-day-passages.json?v=3f2dcb34379bad0850f43bce60b5c4b7b1958de93b8f516815a70e9b9822c812","url":"/reader/chok/zohar-day-passages.json?v=25fc97128a539cfc601d7713530a3bf3d684c43b03893bd38aa7db01f6817e8c","sha256":"25fc97128a539cfc601d7713530a3bf3d684c43b03893bd38aa7db01f6817e8c","bytes":2162951,"integrity":null}];
 for(const a of original2BoTazriaAssets){const bytes=fs.readFileSync(path.join(root,a.path));assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),a.sha256);assert.equal(bytes.length,a.bytes);resources[a.url]=[a.path,a.sha256,a.bytes];if(a.integrity)scriptIntegrity[a.url]=a.integrity;}
 const current37URL=u=>{const asset=nativeEightAdmission.assets.find(a=>a.beforeURL===u),v=asset?asset.url:u,next=tuesdayAdmission.assets.find(a=>a.beforeURL===v),w=next?next.url:v,today=todayZoharAssets.find(a=>a.beforeURL===w);const x=today?today.url:w,original=original51Assets.find(a=>a.beforeURL===x);const y=original?original.url:x,current41=original43Assets.find(a=>a.beforeURL===y);const z=current41?current41.url:y,current2=original2BoTazriaAssets.find(a=>a.beforeURL===z);return current2?current2.url:z;};
 for(const a of nativeEightAdmission.assets){assert(!Object.hasOwn(resources,a.url));resources[a.url]=[a.path,a.sha256,a.bytes];scriptIntegrity[a.url]=a.integrity;}
 for(const a of tuesdayAdmission.assets){assert(!Object.hasOwn(resources,a.url));resources[a.url]=[a.path,a.sha256,a.bytes];scriptIntegrity[a.url]=a.integrity;}
 for(const r of nativeEightReviewed.rows){const a=r.payload;resources[a.url+'?v='+a.sha256]=['public'+a.url,a.sha256,nativeEightAdmission.packetBytes[r.key]];}
 const commentaryPin=nativeEightAdmission.commentaryFixtures,commentaryRaw=fs.readFileSync(path.join(root,commentaryPin.path));assert.equal(commentaryRaw.length,commentaryPin.bytes);assert.equal(crypto.createHash('sha256').update(commentaryRaw).digest('hex'),commentaryPin.sha256);
 const commentaryFixtures=JSON.parse(commentaryRaw);assert.equal(commentaryFixtures.schema,'native-eight-finite-authentic-commentary-fixtures-v1');assert.equal(commentaryFixtures.rows.length,commentaryPin.count);
 for(const r of commentaryFixtures.rows){assert.equal(r.status,200);assert(!Object.hasOwn(resources,r.wireURL),'distinct exact commentary transport');resources[r.wireURL]=[r.canonicalPath,r.sha256,r.bytes];}
 const d=documentFor('<html><body>'+markup+'</body></html>');d.readyState='loading';let held=null,release=null;
 const requests=[],scriptRequests=[],faults=[],bodyCache=new Map(),startupKey='תולדות|יום שני';
 const selectedURLs=reuseReviewed.entries.map(r=>r.payload.url+'?v='+r.payload.sha256);
 function source(u){
  assert(Object.hasOwn(resources,u),'unregistered exact transport URL: '+u);
  const spec=resources[u];if(spec===null)return null;
  if(!bodyCache.has(spec[0])){
   let bytes=fs.readFileSync(path.join(root,spec[0]));const historical=nativeEightAdmission.paths[spec[0]];if(historical&&spec[1]===historical.beforeSHA256)bytes=Buffer.from(historical.beforeBase64,'base64');assert.equal(bytes.length,spec[2],u);
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),spec[1],u);
   assert.deepEqual(Buffer.from(bytes.toString('utf8')),bytes,'lossless UTF-8 donor: '+u);bodyCache.set(spec[0],bytes);
  }
  return bodyCache.get(spec[0]);
 }
 const e=sandbox(d,'/reader/chok/',async url=>{
  const u=String(url);requests.push(u);
  try{
   const bytes=source(u);if(bytes===null)return{ok:false,status:404,text:async()=>'',json:async()=>{throw Error('Exact immutable Git-tree absence: '+u);}};
   const row=reuseReviewed.entries.find(r=>u===r.payload.url+'?v='+r.payload.sha256);
   if(row&&held===row.key){assert.equal(release,null,'only one real uncached old-key request held');await new Promise(resolve=>release=resolve);}
   return{ok:true,status:200,text:async()=>bytes.toString('utf8'),json:async()=>JSON.parse(bytes.toString('utf8')),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  }catch(error){faults.push(error);throw error;}
 });
 try{
  e.box.TextEncoder=TextEncoder;e.box.window.crypto=crypto.webcrypto;
  e.box.location.search=nativeFocus?'?sec=kabbala&week='+encodeURIComponent(nativeEightReviewed.rows[0].week)+'&day='+encodeURIComponent(nativeEightReviewed.rows[0].day):'?week='+encodeURIComponent('תולדות')+'&day='+encodeURIComponent('יום שני');
  e.box.location.href='https://fixture.invalid/reader/chok/'+e.box.location.search;
  function observedMain(raw){
   // Observation only: retain every real initializer, state assignment and handler.
   const marker="  if (document.readyState === 'loading') {",render='    Promise.all(jobs).then(function (weekParts) {',init='    Promise.all([\n';
   assert.equal(raw.split(marker).length,2);assert.equal(raw.split(render).length,2);
   const at=raw.indexOf('  function init() {');assert(at>=0);const prefix=raw.slice(0,at),tail=raw.slice(at);assert.equal(tail.split(init).length,2);
   return (prefix+tail.replace(init,'    globalThis.r3InitPromise=Promise.all([\n')).replace(render,'    globalThis.r3RenderPromise=Promise.all(jobs).then(function (weekParts) {').replace(marker,'  globalThis.r3Project=function(s,mode){return applyWednesdayMode(zoharPresentation(s),mode);};\n'+marker);
  }
  async function scriptLoad(node){
   const u=String(node.src||node.getAttribute('src'));scriptRequests.push(u);
   try{
    assert(Object.hasOwn(scriptIntegrity,u),'exact script declaration required: '+u);
    assert.equal(node.integrity||null,scriptIntegrity[u],u);
    const bytes=source(u);assert(bytes,'script cannot be Git-absent: '+u);
    if(node.integrity){
     assert.equal(node.crossOrigin,'anonymous',u);
     const match=/^(sha256|sha384)-([A-Za-z0-9+/=]+)$/.exec(node.integrity);assert(match,u);
     assert.equal(crypto.createHash(match[1]).update(bytes).digest('base64'),match[2],u);
    }
    const raw=bytes.toString('utf8');vm.runInContext(u.startsWith('/chok.js?')?observedMain(raw):raw,e.box,{filename:u});
    if(typeof node.onload==='function')node.onload.call(node,{type:'load',target:node});
   }catch(error){faults.push(error);if(typeof node.onerror==='function')node.onerror.call(node,{type:'error',target:node,error});else throw error;}
  }
  const append=d.head.appendChild.bind(d.head),scriptJobs=[];
  d.head.appendChild=function(node){const result=append(node);if(node.tagName==='script'){const job=Promise.resolve().then(()=>scriptLoad(node));scriptJobs.push(job);job.catch(error=>{faults.push(error);});}return result;};
  const tags=[...template.matchAll(/<script\b([^>]*)>\s*<\/script>/g)];
  const declarations=tags.map(m=>{const a=m[1],src=/\bsrc="([^"]+)"/.exec(a);assert(src);return{src:src[1].replace(/&amp;/g,'&'),integrity:(/\bintegrity="([^"]+)"/.exec(a)||[])[1]||null,crossOrigin:(/\bcrossorigin="([^"]+)"/.exec(a)||[])[1]||null,defer:/\bdefer\b/.test(a)};});
  assert.deepEqual(declarations.map(x=>x.src),declaredOrder.map(current37URL),'actual complete Astro defer graph and declared order');
  for(const declaration of declarations){assert(declaration.defer);const node=d.createElement('script');Object.assign(node,declaration);d.head.appendChild(node);await scriptJobs.at(-1);}
  assert.equal(d._listeners.DOMContentLoaded.filter(fn=>fn.name==='init').length,1,'actual Main initializer registered');
  d.dispatchEvent({type:'DOMContentLoaded',bubbles:false});
  await until(()=>!!e.box.r3InitPromise&&!!e.box.r3RenderPromise,20000);await e.box.r3InitPromise;await e.box.r3RenderPromise;

   if(nativeFocus){
    let week=nativeEightReviewed.rows[0].week,day=nativeEightReviewed.rows[0].day,combinations=0;
    async function control(id,value){const n=d.getElementById(id);assert(n&&n._listeners.change?.length,'real registered focus control');if(n.value!==value){const prior=e.box.r3RenderPromise;n.value=value;n.dispatchEvent({type:'change',bubbles:true});assert(e.box.r3RenderPromise!==prior);await e.box.r3RenderPromise;}assert(!d.querySelector('.ck-error'));assert(!d.querySelector('.ck-loading'));assert.deepEqual(faults.map(error=>String(error)),[]);}
    for(const r of nativeEightReviewed.rows){if(week!==r.week){await control('ck-parsha',r.week);week=r.week;}if(day!==r.day){await control('ck-day',r.day);day=r.day;}for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters']){await control('ck-language',language);await control('ck-mode',mode);assert(d.querySelector('.ck-focusbar'));assert(!d.querySelector('[data-sec="torah"]'));const sec=d.querySelector('[data-sec="kabbala"]');assert(sec);assert.equal(sec.querySelectorAll('.ck-popout').length,0);nativeFields(sec,r,language,mode);combinations++;}}
    assert.equal(combinations,128);for(const r of nativeEightReviewed.rows)assert.equal(requests.filter(u=>u===r.payload.url+'?v='+r.payload.sha256).length,1);assert.equal(faults.length,0);await Promise.all(scriptJobs);return;
   }
  assert(!d.querySelector('.ck-error'));assert(!d.querySelector('.ck-loading'));assert(d.querySelector('[data-qualified-zohar="'+startupKey+'"]'),'authentic nonselected startup reading completed');
  assert.equal(d.getElementById('ck-language').value,'both');assert.equal(d.getElementById('ck-mode').value,'full');
  assert.equal(e.box.location.search.includes('sec='),false,'unfocused actual route');
  const startupRequests=requests.slice(),startupRow=clearedAdmission.index[startupKey],startupURL=startupRow.url+'?v='+startupRow.sha256;
  assert.equal(startupRequests.filter(u=>u===startupURL).length,1,'explicit authentic startup packet coverage');
  for(const u of selectedURLs)assert.equal(startupRequests.filter(x=>x===u).length,0,'selected keys remain genuinely uncached after completed initialization');
  let shownWeek='תולדות',shownDay='יום שני';
  function change(id,value){
   const control=d.getElementById(id);assert(control);assert(control._listeners.change&&control._listeners.change.length,'registered production modeled change: '+id);
   const prior=e.box.r3RenderPromise;control.value=value;control.dispatchEvent({type:'change',bubbles:true});
   const current=e.box.r3RenderPromise;assert(current&&current!==prior,'fresh causal render root: '+id);return current;
  }
  async function settle(p){await p;assert(!d.querySelector('.ck-error'));assert(!d.querySelector('.ck-loading'));assert.equal(faults.length,0,'no caught missing donors or script/transport faults');}
  async function navigate(row){
   // Both controls invoke their genuine handlers. No state setter, focus or record
   // projection is injected; intermediate Noach Friday/Monday are real full days.
   if(shownWeek==='נח'&&shownDay!==row.day){shownDay=row.day;await settle(change('ck-day',row.day));}
   if(shownWeek!==row.week){shownWeek=row.week;await settle(change('ck-parsha',row.week));}
   if(shownDay!==row.day){shownDay=row.day;await settle(change('ck-day',row.day));}
  }
  async function select(row,language='both'){
   await navigate(row);if(d.getElementById('ck-language').value!==language)await settle(change('ck-language',language));
   await until(()=>!!d.querySelector('[data-qualified-zohar="'+row.key+'"]'),10000);assert(!d.querySelector('.ck-error'));
   for(const key of ['torah','navi','kesuvim','mishna','talmud','halacha'])assert(d.querySelector('[data-sec="'+key+'"]'),'complete unfocused section: '+row.key+' '+key);
   const sec=d.querySelector('[data-sec="zohar"]')||d.querySelector('[data-sec="kabbala"]');assert(sec);assert.equal(sec.querySelectorAll('.ck-popout').length,1);
   reuseFields(sec,JSON.parse(read('public'+row.payload.url)),['en','both'].includes(language),s=>e.box.r3Project(s,'full'));
   if(row.key==='לך לך|יום שישי'){
    const navi=d.querySelector('[data-sec="navi"]').querySelectorAll('[data-verse-ref]'),psalm=d.querySelector('[data-sec="kesuvim"]').querySelectorAll('[data-verse-ref]');
    assert.equal(navi[0].getAttribute('data-verse-ref'),'40:27');assert.equal(navi.at(-1).getAttribute('data-verse-ref'),'41:16');
    assert.deepEqual(psalm.map(x=>x.getAttribute('data-verse-ref')),['93:1','93:2','93:3','93:4','93:5']);
   }
   return sec.innerHTML;
  }
  const old=reuseReviewed.entries[0],newer=reuseReviewed.entries[1];
  assert.equal(shownDay,old.day);held=old.key;shownWeek=old.week;const stale=change('ck-parsha',old.week);
  await until(()=>!!release,10000);assert.equal(requests.filter(u=>u===selectedURLs[0]).length,1,'real queued uncached request held after initialization finished');
  await select(newer,'en');const before=d.getElementById('ck-content').innerHTML;assert.equal(typeof before,'string');
  held=null;release();await stale;assert.equal(d.getElementById('ck-content').innerHTML,before);
  let oldHTML=null;for(const row of reuseReviewed.entries){const html=await select(row);if(row.key===old.key)oldHTML=html;}
  assert.equal(await select(old,'both'),oldHTML,'old/new/old complete Zohar DOM conservation across authentic full schedules');
  await select(old,'he');
  assert.equal(requests.filter(u=>selectedURLs.includes(u)).length,reuseReviewed.entries.length,'one queued authenticated packet per selected key, excluding independently covered authentic startup');
  for(const u of selectedURLs)assert.equal(requests.filter(x=>x===u).length,1,'one queued authenticated packet for exact selected URL: '+u);
  assert(requests.includes('/reader/kavanos/index.json'));
  for(const u of Object.keys(scriptIntegrity).filter(u=>u.startsWith('/chok-scheduled-bible.js?')||u.startsWith('/chok-qualified-zohar.js?')).map(current37URL))assert.equal(scriptRequests.filter(x=>x===u).length,1,'real dynamic insertion / SRI / evaluation / load: '+u);
  assert.equal(faults.length,0);await Promise.all(scriptJobs);
 }finally{held=null;if(release)release();e.close();}
}
test('reuse attachments ordinary unfocused Main: complete authentic schedules, registered modeled controls and delayed uncached old-key isolation',async()=>r3OwningReader());
test('native eight actual focused Reader bootstrap, registered controls, complete study aids and mandatory bilingual notes in all128 display combinations',async()=>r3OwningReader(true));

// New8: already-adopted complete own fields, not a new translation or meaning review.
const new8RawReviewed=JSON.parse(read('scripts/chok-zohar-new8-reviewed.json'));
const new8Reviewed={...new8RawReviewed,keys:new8RawReviewed.keys.filter(k=>clearedAdmission.groups.new8.includes(k)),entries:new8RawReviewed.entries.filter(r=>clearedAdmission.groups.new8.includes(r.key)),index:Object.fromEntries(Object.entries(new8RawReviewed.index).filter(([k])=>clearedAdmission.groups.new8.includes(k)))};
test('new8 exact adopted fields: complete API, seven held exclusions, genuine corruptions and fresh same-owner recovery',async()=>{
 const e=env(),events=[];const unhandled=x=>events.push(['unhandledRejection',String(x)]),handled=()=>events.push(['rejectionHandled']);process.on('unhandledRejection',unhandled);process.on('rejectionHandled',handled);
 try{const api=reuseModule(e),index=JSON.parse(read('public/chok-qualified-zohar.js').match(/var INDEX = (\{[^\n]+\});/)[1]);assert.deepEqual(index,fullZoharIndex());assert.equal(Object.keys(index).length,new8Reviewed.expectedRegistryCount+nativeEightReviewed.rows.length+1);assert.equal(new8Reviewed.entries.length,clearedAdmission.groups.new8.length);assert.equal(new8Reviewed.heldKeys.length,7);
  for(const key of new8Reviewed.heldKeys){assert(!api.has(key));await assert.rejects(api.load(key,loader),/not admitted/);}
  for(const row of new8Reviewed.entries){const raw=read('public'+row.payload.url),p=JSON.parse(raw);assert.equal(reuseSha(raw),row.payload.sha256);assert.deepEqual(index[row.key],row.payload);assert.equal(reuseSha(p.original),row.originalSHA256);assert.equal(reuseSha(p.english),row.englishSHA256);assert.equal(reuseSha(reuseCanonical(p.notes)),row.notesSHA256);assert.equal(reuseSha(reuseCanonical(p.explanation)),row.explanationSHA256);assert.deepEqual(p.noteIDs,row.notes.map(q=>q.id));
   p.notes.forEach((q,i)=>{const expected=row.notes[i];assert.equal(reuseSha(q.he),expected.heSHA256);assert.equal(reuseSha(q.en),expected.enSHA256);assert.equal(q.sourceQualificationSHA256,expected.sourceQualificationSHA256);assert.equal(q.placement,expected.placement);assert.equal(q.role,expected.role);assert.deepEqual(q.sourceSpan,expected.sourceSpan);assert.equal(Array.from(p.original).slice(...q.sourceSpan).join(''),q.sourceAnchor);assert.equal(reuseSha(q.sourceAnchor),expected.sourceAnchorSHA256);assert.equal(q.englishOwnerSHA256,p.englishSHA256);assert.equal(q.sourceOwnerRawSHA256,p.originalSHA256);});
   await assert.rejects(api.load(row.key,async()=>raw+' '),/packet changed/);assert.equal((await api.load(row.key,loader)).key,row.key);
   const mutations=[q=>q.original+=' ',q=>q.english+=' ',q=>q.key='foreign|owner',q=>q.sourceOwnerSHA256='0'.repeat(64),q=>q.notes[0].owner='foreign|owner',q=>q.notes[0].he+=' ',q=>q.notes[0].en+=' ',q=>q.notes[0].sourceAnchor+=' ',q=>q.notes[0].sourceSpan[0]++,q=>q.notes[0].englishOwnerSHA256='0'.repeat(64),q=>q.notes[0].anchors[0].sourceSpan[0]++,q=>q.notes[0].meaningHold=true,q=>q.notes.length>1?q.notes.reverse():q.notes.push(q.notes[0]),q=>q.explanation.en+=' ',q=>q.explanation.he+=' ',q=>{q.original+=' ';q.notes.at(-1).anchors[0].sourceAnchorSHA256='malformed';}];
   for(const mutate of mutations){const q=structuredClone(p);mutate(q);assert.notDeepEqual(q,p,'genuine checksum-valid JSON corruption: '+row.key);await assert.rejects(Promise.resolve().then(()=>e.box.window.reuseValidate(q,row.key)));await e.box.window.reuseValidate(p,row.key);}
   for(const english of [true,false]){const d=documentFor('<html><body>'+await api.reading(row.key,english,loader)+'</body></html>');reuseFields(d,p,english);const ns=d.querySelectorAll('[data-zohar-note-owner]');ns.forEach(n=>{assert(!n.closest('[hidden]'));assert(!n.closest('details'));});const html=d.body.innerHTML;assert.equal(typeof html,'string');assert(html.indexOf('ck-qualified-zohar-body')<html.indexOf('data-zohar-note-owner'),'owner-local after-pair placement');}
  }
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(events,[],'no stranded digest rejection events');
 }finally{process.off('unhandledRejection',unhandled);process.off('rejectionHandled',handled);e.close();}
});
test('new8 actual registered Main callback: all language/display combinations, complete fields and queued per-key isolation',async()=>{
 const requests=[];const e=env(async url=>{const row=new8Reviewed.entries.find(r=>String(url)===r.payload.url+'?v='+r.payload.sha256);assert(row,'exact selected new8 queued request: '+url);requests.push(String(url));const raw=read('public'+row.payload.url);return {ok:true,status:200,text:async()=>raw,json:async()=>JSON.parse(raw)};});
 try{reuseModule(e);const main=reuseMain(e);let combinations=0;for(const row of new8Reviewed.entries){const p=JSON.parse(read('public'+row.payload.url));for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters']){const html=await main.reading(row,language,mode),d=documentFor('<html><body>'+html+'</body></html>');reuseFields(d,p,['en','both'].includes(language),s=>main.project(s,language==='original'?'full':mode));d.querySelectorAll('[data-zohar-note-owner]').forEach(n=>{assert(!n.closest('details'));assert(!n.closest('[hidden]'));});combinations++;}}
  assert.equal(combinations,new8Reviewed.entries.length*4*4);assert.deepEqual(requests,new8Reviewed.entries.map(r=>r.payload.url+'?v='+r.payload.sha256));const first=new8Reviewed.entries[0];await main.reading(first,'en','letters');assert.equal(requests.length,new8Reviewed.entries.length,'old/new/old per-key pending isolation');
 }finally{e.close();}
});
test('cleared cohort exact source inverses and dependent SHA256 module / SHA384 Main bindings conserve current19',()=>{
 const guard=require('./chok-reference-order-conservation.cjs'),admission=clearedAdmission,page=read('src/pages/reader/chok.astro'),main=read('public/chok.js'),module=read('public/chok-qualified-zohar.js');
 for(const [relative,d]of Object.entries(admission.paths)){const current=Buffer.from(read(relative)),after=guard.restoreCurrent37(relative,current),before=guard.restoreCleared(relative,after);assert.equal(reuseSha(after),d.afterSHA256);assert.equal(reuseSha(before),d.beforeSHA256);assert.deepEqual(before,Buffer.from(d.beforeBase64,'base64'),'complete exact current19 preimage');assert.equal(reuseSha(after),d.afterSHA256,'complete forward target');for(const corrupt of [Buffer.concat([after,Buffer.from(' ')]),Buffer.from(after)]){if(corrupt.length===after.length)corrupt[Math.floor(corrupt.length/2)]^=1;assert.equal(guard.restoreCleared(relative,corrupt),corrupt);}}
 assert(main.includes("script.src='/chok-qualified-zohar.js?v="+reuseSha(module)+"'"));assert(main.includes("script.integrity='sha256-"+crypto.createHash('sha256').update(module).digest('base64')+"'"));assert(page.includes('src="/chok.js?v='+reuseSha(main)+'" integrity="sha384-'+crypto.createHash('sha384').update(main).digest('base64')+'"'));
 const keys=JSON.parse(main.match(/var QUALIFIED_ZOHAR_KEYS = (\[[^\n]+\]);/)[1]);assert.deepEqual(keys,Object.keys(fullZoharIndex()));for(const key of new8Reviewed.heldKeys)assert(!keys.includes(key));
});

function nativeSafe(p){
 const exact=(x,keys)=>{assert(x&&typeof x==='object'&&!Array.isArray(x),'public object');assert.deepEqual(Object.keys(x).sort(),keys.split(' ').sort(),'public schema keys');};
 exact(p,'schema key original english originalSHA256 englishSHA256 citationLiteral sourceOwnerSHA256 notes noteIDs entityPolicy units sectionQualifications introduction explanation studyAidLayout');
 for(const x of [p.introduction,p.explanation])exact(x,'he en');
 p.units.forEach(x=>exact(x,'owner sourceOwner original english originalSHA256 englishSHA256 noteIDs'));
 p.notes.forEach(x=>exact(x,'id owner unitOwner sourceOwner he en sourceOriginalSHA256 sourceUnitSHA256 sourceSpan unitSourceSpan sourceAnchor sourceAnchorSHA256 sourceScope'));
 function walk(x){if(typeof x==='string')assert(!/(?:[A-Za-z]:[\\/]|\/(?:mnt|home|root)\/|file:\/\/|credential|parent-intake|SOURCE-SCOPE)/i.test(x),'public recursive value');else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){assert(!/(?:private|provenance|custody|adoption|proposal|machine|gate|status|history|acceptance)/i.test(k),'public recursive key');walk(v);}}
 walk(p);
}
function nativeAuthority(p,r){
 nativeSafe(p);assert.equal(p.key,r.key,'authority owner');assert.equal(p.sourceOwnerSHA256,r.sourceOwnerSHA256);assert.equal(p.citationLiteral,r.citationLiteral);
 for(const k of ['original','english','introduction','explanation'])assert.deepEqual(p[k],r.fields[k],'authority complete '+k);
 assert.deepEqual(p.notes.map(n=>({he:n.he,en:n.en})),r.notes,'authority complete ordered notes');assert.equal(p.notes.length,3);assert.equal(p.units.length,1);assert.equal(p.sectionQualifications.length,0);
 assert.equal(p.studyAidLayout,'native-eight-v1');assert.equal(p.entityPolicy,'literal-native-text');
 assert.deepEqual(p.noteIDs,r.payload.noteIDs);const u=p.units[0];assert.equal(u.owner,r.key);assert.equal(u.sourceOwner,r.key);assert.equal(u.original,r.fields.original);assert.equal(u.english,r.fields.english);assert.deepEqual(u.noteIDs,p.noteIDs);
 for(const n of p.notes){assert.equal(n.owner,r.key);assert.equal(n.sourceOwner,r.key);assert.equal(n.unitOwner,r.key);assert.equal(n.sourceScope,'whole-reading');assert.equal(n.sourceAnchor,r.fields.original);assert.deepEqual(n.sourceSpan,[0,Array.from(r.fields.original).length]);assert.deepEqual(n.unitSourceSpan,n.sourceSpan);}
}
function nativeFields(d,r,language,mode='full'){
 const en=['en','both'].includes(language),a=d.querySelectorAll('[data-qualified-zohar="'+r.key+'"]');assert.equal(a.length,1);const island=a[0];
 const original=island.querySelectorAll('[data-field-role="original-source"]'),english=island.querySelectorAll('[data-field-role="english-translation"]');assert.equal(original.length,1);assert.equal(english.length,en?1:0);
 let expected=r.fields.original;if(language!=='original'&&mode!=='full'){if(mode==='nikud'||mode==='letters')expected=expected.replace(/[\u0591-\u05AF\u05BD\u05C0]/g,'');if(mode==='taamim'||mode==='letters')expected=expected.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');}
 assert.equal(original[0].textContent,expected);if(en)assert.equal(english[0].textContent,r.fields.english);
 const aids=island.querySelectorAll('[data-other-group]');assert.equal(aids.length,2);for(const[k,i]of [['introduction',0],['explanation',1]]){const ps=aids[i].querySelectorAll('p');assert.equal(ps.length,en?2:1);assert.equal(ps[0].textContent,r.fields[k].he);if(en)assert.equal(ps[1].textContent,r.fields[k].en);}
 assert.equal(aids[0].getAttribute('data-study-aid'),'introduction');assert.equal(aids[0].querySelector('summary').textContent,'הקדמה · Introduction');assert.equal(aids[1].querySelector('summary').textContent,'הסבר הקטע · Passage explanation');
 const ns=island.querySelectorAll('[data-zohar-note-owner]');assert.equal(ns.length,3);ns.forEach((n,i)=>{assert.equal(n.getAttribute('data-note-id'),r.payload.noteIDs[i]);assert.equal(n.getAttribute('data-zohar-note-owner'),r.key);assert.equal(n.getAttribute('data-zohar-unit-owner'),r.key);assert.equal(n.getAttribute('data-source-anchor-sha256'),reuseSha(r.fields.original));assert.equal(n.querySelector('[lang="he"]').textContent,r.notes[i].he);assert.equal(n.querySelector('[lang="en"]').textContent,r.notes[i].en);assert(!n.closest('details'));assert(!n.closest('[hidden]'));assert(!n.hasAttribute('hidden'));assert(!/display\s*:\s*none|visibility\s*:\s*hidden/i.test(n.getAttribute('style')||''));});
 assert(island.innerHTML.indexOf('data-study-aid="introduction"')<island.innerHTML.indexOf('ck-qualified-zohar-body'));assert(island.innerHTML.indexOf('data-zohar-note-owner')<island.innerHTML.lastIndexOf('data-other-group'));
}
test('native eight complete independent authority, recursive public safety, real API and 96 coordinated scalar/digest rejections with fresh positives',async()=>{
 assert.equal(nativeEightReviewed.rows.length,8);let scalars=0,notes=0;
 for(const r of nativeEightReviewed.rows){const raw=read('public'+r.payload.url),p=JSON.parse(raw);assert.equal(reuseSha(raw),r.payload.sha256);nativeAuthority(p,r);notes+=r.notes.length;
  for(const english of [true,false]){const e=env();try{const api=reuseModule(e);nativeFields(documentFor('<html><body>'+await api.reading(r.key,english,loader)+'</body></html>'),r,english?'both':'he');}finally{e.close();}}
  const paths=[['original'],['english'],['introduction','he'],['introduction','en'],['explanation','he'],['explanation','en'],...p.notes.flatMap((_,i)=>[['notes',i,'he'],['notes',i,'en']])];
  for(const parts of paths){const q=structuredClone(p);let at=q;for(const k of parts.slice(0,-1))at=at[k];at[parts.at(-1)]+=' ';q.originalSHA256=reuseSha(q.original);q.englishSHA256=reuseSha(q.english);const u=q.units[0];Object.assign(u,{original:q.original,english:q.english,originalSHA256:q.originalSHA256,englishSHA256:q.englishSHA256});q.notes.forEach(n=>Object.assign(n,{sourceOriginalSHA256:q.originalSHA256,sourceUnitSHA256:q.originalSHA256,sourceSpan:[0,Array.from(q.original).length],unitSourceSpan:[0,Array.from(q.original).length],sourceAnchor:q.original,sourceAnchorSHA256:q.originalSHA256}));
   const changed=JSON.stringify(q),pin={...r.payload,sha256:reuseSha(changed),originalSHA256:q.originalSHA256,englishSHA256:q.englishSHA256,notesSHA256:reuseSha(reuseCanonical(q.notes)),unitsSHA256:reuseSha(reuseCanonical(q.units)),studyAidsSHA256:reuseSha(reuseCanonical({introduction:q.introduction,explanation:q.explanation,studyAidLayout:q.studyAidLayout,entityPolicy:q.entityPolicy}))};
   const e=env();try{const code=read('public/chok-qualified-zohar.js'),m=code.match(/var INDEX = (\{[^\n]+\});/),idx=JSON.parse(m[1]);idx[r.key]=pin;vm.runInContext(code.replace(m[0],'var INDEX = '+JSON.stringify(idx)+';'),e.box);const loaded=await e.box.window.ChokQualifiedZohar.load(r.key,async url=>{assert.equal(url,pin.url+'?v='+pin.sha256);return changed;});assert.throws(()=>nativeAuthority(JSON.parse(JSON.stringify(loaded)),r),/authority/);}finally{e.close();}
   const fresh=env();try{const api=reuseModule(fresh),loaded=await api.load(r.key,loader);nativeAuthority(JSON.parse(JSON.stringify(loaded)),r);}finally{fresh.close();}scalars++;
  }
  for(const mutate of [q=>q.introduction.privateProvenance={receipt:'/home/owner'},q=>q.notes[0].custody={nested:'safe-looking'},q=>q.units[0].proposalPointer='opaque']){const q=structuredClone(p);mutate(q);assert.throws(()=>nativeSafe(q),/public/);nativeSafe(p);}
 }
 assert.equal(scalars,96);assert.equal(notes,24);
});
test('current37 exact outer inverses precede old29 and old19 ABI without admitting modified bytes',()=>{
 const g=require('./chok-reference-order-conservation.cjs');for(const[relative,d]of Object.entries(nativeEightAdmission.paths)){const actual=fs.readFileSync(path.join(root,relative)),b=g.restoreCurrent38(relative,actual),old=g.restoreCurrent37(relative,b);assert.equal(reuseSha(b),d.afterSHA256);assert.equal(reuseSha(old),d.beforeSHA256);assert.deepEqual(old,Buffer.from(d.beforeBase64,'base64'));assert.equal(reuseSha(g.restoreCleared(relative,b)),clearedAdmission.paths[relative].beforeSHA256);for(const q of [Buffer.concat([b,Buffer.from(' ')]),Buffer.from(b)]){if(q.length===b.length)q[Math.floor(q.length/2)]^=1;assert.equal(g.restoreCurrent37(relative,q),q);assert.equal(g.restoreCleared(relative,q),q);}}
 const m=g.restoreCurrent38('public/chok-qualified-zohar.js',Buffer.from(read('public/chok-qualified-zohar.js'))).toString('utf8');assert.equal(reuseSha(m),nativeEightAdmission.renderer.rawSHA256);assert.equal(reuseSha(m.replace(/var INDEX = \{[^\n]+\};/,'var INDEX = {};')),nativeEightAdmission.renderer.indexBlankSHA256);assert.notEqual(nativeEightAdmission.renderer.rawSHA256,nativeEightAdmission.renderer.indexBlankSHA256);
});

// Exact Tuesday case is independent of the fixed native eight (3 notes each).
function tuesdaySafe(p){
 const walk=(x,m)=>{
  assert.equal(typeof x,typeof m,'Tuesday public recursive type');
  if(typeof x==='string'){assert(!/(?:[A-Za-z]:[\\/]|\/(?:mnt|home|root)\/|file:\/\/|projectionProof|workflow|approval|private|custody|proposal|parent-intake|credential)/i.test(x),'Tuesday public recursive string');return;}
  if(Array.isArray(m)){assert(Array.isArray(x),'Tuesday public array');assert.equal(x.length,m.length,'Tuesday public array membership');x.forEach((v,i)=>walk(v,m[i]));return;}
  if(m&&typeof m==='object'){assert(x&&!Array.isArray(x),'Tuesday public object');assert.deepEqual(Object.keys(x).sort(),Object.keys(m).sort(),'Tuesday public recursive schema');for(const k of Object.keys(x))walk(x[k],m[k]);}
 };
 walk(p,tuesdayReviewed.expected);
}
function tuesdayAuthority(p){
 tuesdaySafe(p);assert.deepEqual(p,tuesdayReviewed.expected,'Tuesday authority complete body, twelve scalars and both complete notes');
 assert.equal(p.notes.length,2,'Tuesday is not the three-note native cohort');
 const values=[p.original,p.english,...p.notes.flatMap(n=>[n.he,n.en]),p.explanation.title.he,p.explanation.title.en,p.explanation.paragraphs[0].he,p.explanation.paragraphs[0].en,...['he','en'].map(lang=>p.explanation.paragraphs.slice(1).map(x=>x[lang]).join('\n\n'))];
 assert.equal(values.length,12);assert.deepEqual(values.map(reuseSha),tuesdayReviewed.scalarSHA256,'Tuesday twelve parent-selected scalar authority pins');
 assert.deepEqual(p.notes,tuesdayReviewed.expected.notes,'Tuesday complete ordered qualification records');
}
test('Tuesday38 exact independent twelve scalars and two complete notes, recursive audience safety, actual API/Main and exact outer inverse',async()=>{
 const r=tuesdayReviewed,p=JSON.parse(read('public'+r.payload.url));assert.equal(reuseSha(read('public'+r.payload.url)),r.payload.sha256);tuesdayAuthority(p);
 const g=require('./chok-reference-order-conservation.cjs');
 for(const[relative,d]of Object.entries(tuesdayAdmission.paths)){
  const b=g.restoreVayaitzaiFridayNote(relative,fs.readFileSync(path.join(root,relative)));assert.equal(reuseSha(b),d.afterSHA256,'Tuesday current38 exact target');
  const old=g.restoreCurrent38(relative,b);assert.equal(reuseSha(old),d.beforeSHA256);let forward=old.toString('utf8');for(const op of d.inverse.slice().reverse()){assert.equal(forward.split(op.before).length,2);forward=forward.replace(op.before,op.after);}assert.deepEqual(Buffer.from(forward),b,'Tuesday complete inverse/forward bytes');
  for(const bad of [Buffer.concat([b,Buffer.from(' ')]),Buffer.from(b)]){if(bad.length===b.length)bad[Math.floor(bad.length/2)]^=1;assert.equal(g.restoreCurrent38(relative,bad),bad);assert.equal(g.restoreCurrent37(relative,bad),bad);}
  assert.equal(g.restoreCurrent38('unselected/source',b),b,'wrong-path cannot borrow inverse');assert.deepEqual(g.restoreCurrent38(relative,b),old,'fresh exact inverse');
 }
 const paths=[['original'],['english'],['notes',0,'he'],['notes',0,'en'],['notes',1,'he'],['notes',1,'en'],['explanation','title','he'],['explanation','title','en'],['explanation','paragraphs',0,'he'],['explanation','paragraphs',0,'en'],['explanation','paragraphs',1,'he'],['explanation','paragraphs',1,'en']];
 assert.equal(paths.length,12);
 for(const parts of paths){const q=structuredClone(p);let x=q;for(const k of parts.slice(0,-1))x=x[k];x[parts.at(-1)]+=' ';assert.throws(()=>tuesdayAuthority(q),/Tuesday authority/);tuesdayAuthority(p);}
 for(const mutate of [q=>q.notes[0].localAnchor.projectionProof='opaque',q=>q.notes[1].anchors[0].workflow='approved',q=>q.explanation.paragraphs[0].privateReceipt='/home/owner',q=>q.sourceSelection.extent='publication approval complete']){const q=structuredClone(p);mutate(q);assert.throws(()=>tuesdaySafe(q),/Tuesday public/);tuesdaySafe(p);}
 const e=env();try{
  const api=reuseModule(e);assert(api.has(r.key));await assert.rejects(api.load(r.key,async()=>JSON.stringify({...p,key:'foreign'})));
  const recovered=JSON.parse(JSON.stringify(await api.load(r.key,loader)));tuesdayAuthority(recovered);
  for(const english of [true,false]){const d=documentFor('<html><body>'+await api.reading(r.key,english,loader)+'</body></html>');reuseFields(d,r.expected,english);d.querySelectorAll('[data-zohar-note-owner]').forEach(n=>{assert(!n.closest('details'));assert(!n.closest('[hidden]'));assert(!n.hasAttribute('hidden'));});}
 }finally{e.close();}
 const requests=[],mainEnv=env(async url=>{assert.equal(String(url),r.payload.url+'?v='+r.payload.sha256);requests.push(String(url));const raw=read('public'+r.payload.url);return{ok:true,status:200,text:async()=>raw,json:async()=>JSON.parse(raw)};});
 try{reuseModule(mainEnv);const main=reuseMain(mainEnv);let combinations=0;
  for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters']){const d=documentFor('<html><body>'+await main.reading(r,language,mode)+'</body></html>');reuseFields(d,r.expected,['en','both'].includes(language),s=>main.project(s,language==='original'?'full':mode));assert.equal(d.querySelectorAll('[data-qualified-zohar="'+r.key+'"]').length,1);assert.equal(d.querySelectorAll('[data-zohar-note-owner]').length,2);d.querySelectorAll('[data-zohar-note-owner]').forEach(n=>{assert.equal(n.getAttribute('data-zohar-note-owner'),r.key);assert(!n.closest('details'));assert(!n.closest('[hidden]'));});combinations++;}
  assert.equal(combinations,16);assert.deepEqual(requests,[r.payload.url+'?v='+r.payload.sha256],'Tuesday exact queued load coalesces independently');
 }finally{mainEnv.close();}
});
