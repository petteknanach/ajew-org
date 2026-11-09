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
  const expected=reviewed.toldosSundayZohar;assert(expected);const key='תולדות|יום ראשון',script=read('public/chok-qualified-zohar.js'),m=script.match(/  var INDEX = (\{[^\n]+\});/);assert(m);const index=JSON.parse(m[1]);delete index['תולדות|יום שלישי'];delete index['תולדות|יום שני'];assert.equal(Object.keys(index).length,17);assert.deepEqual(index[key],expected.payload);delete index[key];assert.equal(crypto.createHash('sha256').update(JSON.stringify(index)).digest('hex'),expected.predecessorIndexSHA256);
  const historical=require('./chok-reference-order-conservation.cjs').restoreToday('public/chok-qualified-zohar.js',require('./chok-reference-order-conservation.cjs').restoreTomorrow('public/chok-qualified-zohar.js',Buffer.from(script))).toString('utf8'),hm=historical.match(/  var INDEX = (\{[^\n]+\});/);assert(hm);
  assert.equal(crypto.createHash('sha256').update(historical.slice(0,hm.index+hm[0].indexOf(hm[1]))+'<INDEX>'+historical.slice(hm.index+hm[0].indexOf(hm[1])+hm[1].length)).digest('hex'),expected.outsideIndexLogicSHA256);
  vm.runInContext(script,e.box);const api=e.box.window.ChokQualifiedZohar;assert(api.has(key));assert(!api.has('תולדות|יום רביעי'));await assert.rejects(api.load('תולדות|יום רביעי',loader),/not admitted/);
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
 const current=read('public/chok-qualified-zohar.js'),index=JSON.parse(current.match(/  var INDEX = (\{[^\n]+\});/)[1]);delete index['תולדות|יום שלישי'];assert.equal(Object.keys(index).length,18);assert.deepEqual(index[key],pin);
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
 for(const [relative,d]of Object.entries(a.paths)){const actual=fs.readFileSync(path.join(root,relative));assert.equal(hash(actual),d.afterSHA256);assert.equal(hash(guard.restoreTomorrow(relative,actual)),d.beforeSHA256);const bad=Buffer.concat([actual,Buffer.from(' ')]);assert.equal(guard.restoreTomorrow(relative,bad),bad);const mid=Buffer.from(actual);mid[Math.floor(mid.length/2)]^=1;assert.equal(guard.restoreTomorrow(relative,mid),mid);assert.deepEqual(guard.restoreTomorrow(relative,guard.restoreTomorrow(relative,actual)),guard.restoreTomorrow(relative,actual));}
 const current=read('public/chok-qualified-zohar.js'),index=JSON.parse(current.match(/  var INDEX = (\{[^\n]+\});/)[1]);assert.deepEqual(Object.keys(index),a.expectedKeys);assert.equal(Object.keys(index).length,19);assert.deepEqual(index[key],pin);delete index[key];assert.equal(hash(JSON.stringify(index)),a.predecessorIndexSHA256);
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
