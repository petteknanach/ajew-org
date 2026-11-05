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
test('held and unscheduled readings never acquire English; qualified existing English wins; modes conserve mandatory notes',async()=>{
 const e=env();try{const p=JSON.parse(read(files[0])),r=p.pairs.find(r=>r.qualifications.length),book=rawBook(r.slug),day=r.key.split('|')[1],kind=r.role==='onkelos'?'torah':r.role==='navi-targum'?'navi':'kesuvim',ctx=await e.api.prepare(p.week,day,kind,r.slug,Promise.resolve(book),loader),[c,v]=r.reference.split(':');
 assert.equal(e.api.render(ctx,'999:999','missing',{english:true,targum:true}),'');
 const existing=e.api.render(ctx,r.reference,book.ch[c][v],{english:true,targum:true,existingEnglish:true});assert(!existing.includes('ck-genesis-english-owner'));assert(!existing.includes('ck-source-qualification'));
 for(const mode of [{english:false,targum:true},{english:true,targum:false},{english:false,targum:false}]){const html=e.api.render(ctx,r.reference,book.ch[c][v],mode);assert(!html.includes('Targum English translation'));assert(html.includes(r.englishSHA256));const d=documentFor('<html><body>'+html+'</body></html>');assert.equal(d.querySelectorAll('.ck-source-qualification').length,r.qualifications.length);}
 assert.equal(await e.api.prepare(p.week,'יום שישי','kesuvim','tanach-mishlei',Promise.resolve(rawBook('tanach-mishlei')),loader),null);
 assert.equal(await e.api.prepare(p.week,'ליל שישי','navi','tanach-yeshayahu',Promise.resolve(rawBook('tanach-yeshayahu')),loader),null);
 assert.equal(await e.api.prepare('שמות',day,'torah','tanach-shemos',Promise.resolve({ch:{}}),loader),null);
 }finally{e.close();}
});
test('the actual 24 held complete readings remain absent, without freezing their selected neighbors',async()=>{
 const e=env();try{assert.equal(reviewed.heldOwnerScopeKeys.length,24);for(const id of reviewed.heldOwnerScopeKeys){const [week,day,role,slug,ref]=id.split('|'),kind=role==='onkelos'?'torah':role==='navi-targum'?'navi':'kesuvim',book=rawBook(slug),ctx=await e.api.prepare(week,day,kind,slug,Promise.resolve(book),loader),[c,v]=ref.split(':');assert(ctx,id);assert.equal(e.api.render(ctx,ref,book.ch[c][v],{english:true,targum:true}),'',id);}}
 finally{e.close();}
});

test('all 204 day introductions can precede the original without separating its full English or duplicating the introduction',async()=>{
 const e=env();let checked=0;try{for(const file of files){const p=JSON.parse(read(file)),groups=new Map();for(const r of p.pairs){const id=[r.key,r.role,r.slug].join('|');if(!groups.has(id))groups.set(id,r);}
 for(const r of groups.values()){const day=r.key.split('|')[1],kind=r.role==='onkelos'?'torah':r.role==='navi-targum'?'navi':'kesuvim',book=rawBook(r.slug),[c,v]=r.reference.split(':'),original=book.ch[c][v],ctx=await e.api.prepare(p.week,day,kind,r.slug,Promise.resolve(book),loader);
 const header=e.api.render(ctx,r.reference,original,{english:true,targum:true,existingEnglish:true});assert(header.includes('ck-genesis-targum-day'));assert(!header.includes('ck-genesis-english-owner'));
 const body=e.api.render(ctx,r.reference,original,{english:true,targum:true,existingEnglish:false});assert(!body.includes('ck-genesis-targum-day'));assert(body.includes(e.box.window.ChokSources.english(r.fullEnglish,true,'Targum English translation')));assert.equal(documentFor('<html><body>'+body+'</body></html>').querySelectorAll('.ck-source-qualification').length,r.qualifications.length);checked++;
 }}assert.equal(checked,204);}finally{e.close();}
});
test('owning page binds exact script bytes and each historical guard admits only the exact two owned successors',()=>{
 const admission=JSON.parse(read('scripts/chok-genesis-english-admission.json')),guard=require('./chok-reference-order-conservation.cjs'),page=read('src/pages/reader/chok.astro');
 for(const [relative,d] of Object.entries(admission.paths)){const actual=fs.readFileSync(path.join(root,relative)),restored=guard.restoreGenesis(relative,actual);assert.equal(crypto.createHash('sha256').update(restored).digest('hex'),d.beforeSHA256);const corrupt=Buffer.concat([actual,Buffer.from(' ')]);assert.equal(guard.restoreGenesis(relative,corrupt),corrupt);assert.throws(()=>guard.restoreReference(relative,corrupt));}
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
