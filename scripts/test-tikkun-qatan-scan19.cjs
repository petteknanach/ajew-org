#!/usr/bin/env node
'use strict';
// Successor acceptance against the unchanged1841 predecessor, not just401.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {build,generate,hash,uniqueAlignment}=require('./build-tikkun-qatan-expansion.cjs');
const root=path.resolve(__dirname,'..'),out=process.argv[2];assert(out);fs.mkdirSync(out,{recursive:true});
const E='/mnt/c/Users/Pettek/Ajew-Qatan-Expansion-20261006',baseline=path.join(E,'next19-implementation/baseline');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),copy=x=>JSON.parse(JSON.stringify(x));
const ledger=read('scripts/data/tikkun-qatan-expansion-20261006.json');
const oldLedger=JSON.parse(fs.readFileSync(path.join(baseline,'scripts/data/tikkun-qatan-expansion-20261006.json')));
const decisions=fs.readFileSync(path.join(root,'scripts/data/tikkun-qatan-scan19-decisions-20261006.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const k=r=>[r.slug,r.chapter,r.verse,r.token,r.letter].join('/'),dk=d=>[d.slug,d.chapter,d.verse,d.tokenIndex,d.letterIndex].join('/');
const selected=ledger.records.filter(r=>r.authority.scan19Decision),approved=decisions.filter(d=>d.parentDecision==='approve-exact-occurrence-for-next-candidate');
assert.equal(selected.length,19);assert.equal(hash(ledger.records.filter(r=>!r.authority.scan19Decision)),hash(oldLedger.records));
const oldCore=copy(oldLedger),newCore=copy(ledger);delete oldCore.records;delete newCore.records;delete newCore.scan19Seal;assert.equal(hash(oldCore),hash(newCore));
assert.deepEqual(selected.map(k).sort(),approved.map(dk).sort());
function loadHelper(file){const s={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'public/tikkun-boundaries.js'),'utf8'),s);vm.runInNewContext(fs.readFileSync(file,'utf8'),s);return s.window.TikkunQatanOccurrences;}
const old=loadHelper(path.join(baseline,'public/tikkun-qatan.js')),Q=loadHelper(path.join(root,'public/tikkun-qatan.js'));
const rbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(root,'public/tikkun-renderer.js'),'utf8'),rbox);const R=rbox.module.exports;
const beforeKeys=new Set(),afterKeys=new Set(),books={},beforeBooks={};let verses=0,modeCases=0,immutablePaths=0;
for(const slug of Object.keys(ledger.effectiveBookPins)){
 const raw=read('public/reader/medooyuk/'+slug+'.json'),before=old.applyBook(raw,slug),after=Q.applyBook(raw,slug),snap=JSON.stringify(before);books[slug]=after;beforeBooks[slug]=before;
 assert.equal(hash(Q.applyBook(before,slug)),hash(after));assert.equal(JSON.stringify(before),snap);immutablePaths++;
 assert.equal(Q.applyBook(after,slug),after);
 for(const [c,ch] of Object.entries(before.ch))for(const [v,b] of Object.entries(ch)){
  const a=after.ch[c][v],delta=selected.filter(r=>r.slug===slug&&r.chapter===+c&&r.verse===+v);
  assert.equal(hash({...a,m:b.m}),hash(b));assert.equal(hash(a.m),hash(b.m.concat(delta.map(r=>[r.token,r.letter,'qk',0]))));verses++;
  for(const m of b.m)if(m[2]==='qk')beforeKeys.add([slug,c,v,m[0],m[1]].join('/'));
  for(const m of a.m)if(m[2]==='qk')afterKeys.add([slug,c,v,m[0],m[1]].join('/'));
 }
 for(const r of selected.filter(r=>r.slug===slug))for(const mode of ['full','nikud','taamim','letters'])for(const marked of [true,false]){
  const v=after.ch[r.chapter][r.verse],m=v.m.filter(x=>x[0]===r.token),html=R.token(r.word,m,[],{mode,marked});
  let li=0,count=0;for(const p of html.matchAll(/<span[^>]*data-tk-marks="([^"]*)"[^>]*>([^<]*)<\/span>|([^<]+)/g)){const text=p[2]||p[3]||'';if(li===r.letter&&p[1]?.includes('qk:'))count++;li+=(text.match(/[א-ת]/g)||[]).length;}
  assert.equal(count,marked&&['full','nikud'].includes(mode)?1:0,k(r)+' '+mode+' '+marked);modeCases++;
 }
}
const added=Array.from(afterKeys).filter(k=>!beforeKeys.has(k)).sort(),lost=Array.from(beforeKeys).filter(k=>!afterKeys.has(k));
assert.equal(beforeKeys.size,1841);assert.equal(afterKeys.size,1860);assert.deepEqual(added,selected.map(k).sort());assert.deepEqual(lost,[]);
const rawColumns=read('public/tikkun/column-marks.json'),priorColumns=old.applyColumnMarks(rawColumns),afterColumns=Q.applyColumnMarks(rawColumns),snap=JSON.stringify(priorColumns);
assert.equal(hash(Q.applyColumnMarks(priorColumns)),hash(afterColumns));assert.equal(JSON.stringify(priorColumns),snap);immutablePaths++;
const colAdded=[],oldRows=Object.keys(priorColumns.rows),newRows=Object.keys(afterColumns.rows);let colBefore=0,colAfter=0;
for(const [ck,row] of Object.entries(afterColumns.rows)){
 const prev=priorColumns.rows[ck];if(prev){assert.equal(row[0],prev[0]);assert.equal(row[2],prev[2]);for(const m of prev[1])assert(row[1].some(x=>hash(x)===hash(m)));}
 for(const m of row[1])if(m[1]==='qk'){colAfter++;if(!prev?.[1].some(x=>hash(x)===hash(m)))colAdded.push(ck+'/'+m[0]);}
}
for(const row of Object.values(priorColumns.rows))colBefore+=row[1].filter(m=>m[1]==='qk').length;
assert.equal(colBefore,1841);assert.equal(colAfter,1860);assert.deepEqual(colAdded.sort(),selected.map(r=>r.columnKey+'/'+r.letter).sort());
const alternates=fs.readFileSync(path.join(E,'scan-completion/all-82-tradition-evidence-index.jsonl'),'utf8').trim().split('\n').map(JSON.parse),slugByBook={Genesis:'tanach-bereishit',Exodus:'tanach-shemos',Leviticus:'tanach-vayikra',Numbers:'tanach-bamidbar',Deuteronomy:'tanach-devarim'};
assert.equal(alternates.length,82);const unimported=[];
for(const d of alternates){const slug=slugByBook[d.book],v=books[slug].ch[d.chapter][d.verse],b=d.binding;assert.equal(v.t[b.tokenIndex],b.originalToken);assert(!v.m.some(m=>m[0]===b.tokenIndex&&m[1]===b.letterIndex&&m[2]==='qk'));unimported.push([slug,d.chapter,d.verse,b.tokenIndex,b.letterIndex].join('/'));}
assert.equal(new Set(unimported).size,82);const held=books['tanach-shemos'].ch[38][20];assert(!held.m.some(m=>m[0]===0&&m[1]===1&&m[2]==='qk'));
const controls=[];
function rejection(label,mutate){const l=copy(ledger);mutate(l);let error;try{build(root,l);}catch(e){error=e.message;}assert(error,'did not reject '+label);controls.push({label,rejected:true,error});}
const edits={
 'decision-missing':r=>delete r.authority.scan19Decision,
 'decision-hold':r=>r.authority.scan19Decision.parentDecision='retain-unit-transfer-hold',
 'book-identity':r=>r.slug='tanach-shemos',
 'token-index':r=>r.token++,
 'letter-index':r=>r.letter++,
 'original-word':r=>r.word+='א',
 'vowel-offset':r=>r.authority.scan19Decision.codepointOffset++,
 'binding-offset':r=>r.authority.scan19Decision.binding.codepointOffset++,
 'original-file-hash':r=>r.authority.scan19Decision.binding.originalFileSha256='0'.repeat(64),
 'original-token-hash':r=>r.authority.scan19Decision.binding.originalTokenSha256='0'.repeat(64),
 'scan-hash':r=>r.authority.scan19Decision.scanSha256='0'.repeat(64),
 'page':r=>r.authority.scan19Decision.pdfPage++,
 'crop-bounds':r=>r.authority.scan19Decision.pdfClipPoints[0]++,
 'crop-hash':r=>r.authority.scan19Decision.imageSha256='0'.repeat(64),
 'legend-hash':r=>r.authority.scan19Decision.legend.imageSha256='0'.repeat(64),
 'page-binding-missing':r=>delete r.authority.pageBinding,
 'original-page-hash':r=>r.authority.pageBinding.extractedPageSha256='0'.repeat(64),
 'original-page-index':r=>r.authority.pageBinding.pdfPage++,
 'page-crop-hash':r=>r.authority.pageBinding.cropSha256='0'.repeat(64),
 'page-scan-hash':r=>r.authority.pageBinding.scanSha256='0'.repeat(64),
 'vowel-quality':r=>r.authority.scan19Decision.observedQuality='gadol',
 'compatibility-scope':r=>r.authority.scan19Decision.lexicalInheritance=true,
 'MAM-offset':r=>r.authority.textOffset++,
 'MAM-atom-index':r=>r.authority.atomIndex++,
 'MAM-letter':r=>r.authority.letter++,
 'MAM-atom':r=>r.authority.atom=r.authority.atom.replace('\u05C7','\u05B8'),
 'MAM-samekh':r=>r.authority.samekhAtom+='\u05BD',
 'MAM-projection':r=>r.authority.projectionRef='Gen.1.1',
 'MAM-source-hash':r=>r.authority.sourceSha256='0'.repeat(64),
 'MAM-reading-choices':r=>r.authority.readingChoices=['unapproved'],
 'generic-compatibility':r=>r.authority.localCompatibility='ignore accents everywhere',
 'extra-record-metadata':r=>r.newApproval=true,
 'column-word':r=>r.columnWord+='א',
 'column-key':r=>r.columnKey='1/1:0:0/0'
};
for(const r of selected)for(const [name,edit] of Object.entries(edits)){
 // A same-slug no-op is not a control; choose a genuinely different book.
 rejection(k(r)+'/'+name,l=>{const target=l.records.find(x=>k(x)===k(r));if(name==='book-identity')target.slug=r.slug==='tanach-shemos'?'tanach-bereishit':'tanach-shemos';else edit(target);});
}
rejection('missing-approved-occurrence',l=>l.records.splice(l.records.findIndex(r=>r.authority.scan19Decision),1));
rejection('duplicate-approved-occurrence',l=>l.records.push(copy(selected[0])));
rejection('Exodus38:20-smuggled-as-20th',l=>{const r=copy(selected[0]);Object.assign(r,{slug:'tanach-shemos',chapter:38,verse:20,token:0,letter:1});r.authority.scan19Decision=decisions.find(d=>d.parentDecision==='retain-unit-transfer-hold');l.records.push(r);});
rejection('approved-set-seal',l=>l.scan19Seal.approvedKeys[0]='unknown/1/1/1/1');
rejection('scan-manifest-seal',l=>l.scan19Seal.scanManifestSha256='0'.repeat(64));
rejection('page-manifest-seal',l=>l.scan19Seal.pageManifestSha256='0'.repeat(64));
rejection('predecessor-seal',l=>l.scan19Seal.predecessorSha256='0'.repeat(64));
rejection('remove-user-G-control',l=>l.negativeControls.pop());
rejection('remove-source-pin',l=>delete l.sourcePins['public/tikkun/column-pointing.json']);
for(const [a,b,i,expected] of [[['kol'],['kol','kol'],0,null],[['kol','kol'],['kol'],0,null],[['kol','kol'],['kol'],1,null],[['one','qere','kol'],['one',null,'kol'],2,2]])assert.equal(uniqueAlignment(a,b,i),expected);
assert.equal(generate(build()),fs.readFileSync(path.join(root,'public/tikkun-qatan.js'),'utf8'));
const route=fs.readFileSync(path.join(root,'src/pages/reader/tikkun.astro'),'utf8');assert(route.includes('/tikkun-qatan.js?v=qatan-expansion-20261006-parent-final-r1'));
const report={pass:true,oldRecordsByteEquivalent:oldLedger.records.length,oldLedgerCoreConserved:true,predecessorQatan:beforeKeys.size,successorQatan:afterKeys.size,exactReadingDelta:added.length,readingLost:lost.length,exactColumnDelta:colAdded.length,columnQatanBefore:colBefore,columnQatanAfter:colAfter,columnRowsBefore:oldRows.length,columnRowsAfter:newRows.length,sourceVersesConserved:verses,rawLegacyPredecessorFinalPaths:true,predecessorInputsImmutable:immutablePaths,markedModeTargetChecks:modeCases,traditionAlternatesUnimported:unimported.length,Exodus38_20:'held',newOccurrenceMutationControls:controls.length,deterministicHelper:true,cacheToken:'qatan-expansion-20261006-parent-final-r1',scope:'offline annotation/transport; no pixel, browser, four-surface or publication claim'};
fs.writeFileSync(path.join(out,'next19-mutation-controls.jsonl'),controls.map(x=>JSON.stringify(x)).join('\n')+'\n');
fs.writeFileSync(path.join(out,'next19-reading-column-delta.json'),JSON.stringify({readingAdded:added,readingLost:lost,columnAdded:colAdded,traditionAlternatesUnimported:unimported},null,2)+'\n');
fs.writeFileSync(path.join(out,'next19-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
