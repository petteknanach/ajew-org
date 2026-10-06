#!/usr/bin/env node
/* Offline, deterministic supplement builder. It consumes the reviewed occurrence
 * ledger, never the tagger, network, or whole-source MAM text at build/runtime. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const hash=x=>sha(JSON.stringify(x)),copy=x=>JSON.parse(JSON.stringify(x));
const read=(root,p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const key=r=>[r.slug,r.chapter,r.verse,r.token,r.letter].join('/');
const norm=t=>t.replace(/[\s\u034f\u05BE\u05C0\u05C3-\u05C6\u200e\u200f]/g,'').normalize('NFC');
const signature=t=>norm(t).replace(/[\u0591-\u05AF\u05BD]/g,'').replace(/\u05C7/g,'\u05B8');
const clusters=t=>t.match(/[א-ת][^א-ת]*/g)||[];
const local=(t,re)=>clusters(t).map(c=>(c.match(re)||[]).join('')).join('|');
function check(condition,message){if(!condition)throw Error(message);}
const scan19Path='scripts/data/tikkun-qatan-scan19-decisions-20261006.jsonl';
const scan19Sha='1106a394c3f37bcc16e4d13bb76bd16da92f9b926737f2369496db9f7a21608a';
const predecessorPath='scripts/data/tikkun-qatan-predecessor-20261006.json';
const predecessorSha='aac83481d850a6221b7782857d2158126a31487a2b6a5a4f77b8779600cf5299';
const pagesPath='scripts/data/tikkun-qatan-scan19-pages-20261006.json',pagesSha='b91309f655e784c75338be157ecd1390f3e11ec1ec69446b7785e1e644c0d706';
function uniqueAlignment(a,b,i){
 const n=a.length,m=b.length,pre=Array.from({length:n+1},()=>Array(m+1).fill(0)),suf=Array.from({length:n+1},()=>Array(m+1).fill(0));
 for(let x=0;x<n;x++)for(let y=0;y<m;y++)pre[x+1][y+1]=Math.max(pre[x][y+1],pre[x+1][y],pre[x][y]+(a[x]===b[y]));
 for(let x=n-1;x>=0;x--)for(let y=m-1;y>=0;y--)suf[x][y]=Math.max(suf[x+1][y],suf[x][y+1],suf[x+1][y+1]+(a[x]===b[y]));
 const total=pre[n][m],possible=[];
 for(let j=0;j<m;j++)if(a[i]===b[j]&&pre[i][j]+1+suf[i+1][j+1]===total)possible.push(j);
 const skip=Array.from({length:m+1},(_,j)=>j).some(j=>pre[i][j]+suf[i+1][j]===total);
 return possible.length===1&&!skip?possible[0]:null;
}
function build(root=ROOT,ledger=read(root,'scripts/data/tikkun-qatan-expansion-20261006.json')){
 check(ledger.schema===2,'Expansion ledger schema');
 check(sha(fs.readFileSync(path.join(root,scan19Path)))===scan19Sha,'Sealed exact19 parent decisions drift');
 check(sha(fs.readFileSync(path.join(root,predecessorPath)))===predecessorSha,'Sealed predecessor drift');
 check(sha(fs.readFileSync(path.join(root,pagesPath)))===pagesSha,'Sealed original-page evidence drift');
 const pageBindings=read(root,pagesPath).bindings;
 const predecessor=read(root,predecessorPath),decisions=fs.readFileSync(path.join(root,scan19Path),'utf8').trim().split('\n').map(JSON.parse);
 const approvalKey=d=>[d.slug,d.chapter,d.verse,d.tokenIndex,d.letterIndex].join('/');
 const approvals=new Map(decisions.filter(d=>d.parentDecision==='approve-exact-occurrence-for-next-candidate').map(d=>[approvalKey(d),d]));
 const oldRecords=ledger.records.filter(r=>!r.authority.scan19Decision),newRecords=ledger.records.filter(r=>r.authority.scan19Decision);
 const {records:unusedRecords,scan19Seal:unusedSeal,...core}=ledger;
 check(hash(core)==='9ea7ee56d6e2d3016e67fe7d6716263559b9024a91534a7e258c86c98a8e9af8','Frozen ledger inputs/negative-controls/evidence conservation mismatch');
 check(approvals.size===19&&newRecords.length===19&&hash(oldRecords)===predecessor.recordsHash,'Exact19 delta or frozen predecessor records mismatch');
 // Exact transport records, derived by authenticated preparation from these
 // sealed approvals; pins every metadata field as well as all19 vowel keys.
 check(hash(newRecords)==='485fe7f1c72f6e841433d4944695514e04cd3d3d37a9fd1ac03025c284571628','Sealed scan19 transport/evidence records mismatch');
 check(new Set(newRecords.map(key)).size===19,'Duplicate scan19 occurrence');
 for(const r of newRecords)check(hash(r.authority.pageBinding)===hash(pageBindings[key(r)]),'Exact original scan/page/crop binding mismatch');
 for(const r of newRecords){const d=approvals.get(key(r)),a=r.authority;check(d&&hash(d)===hash(a.scan19Decision)&&r.word===d.sourceToken&&a.atom===d.mamAtom&&a.samekhAtom===d.sourceEvidence.samekhAtom&&a.atomIndex===d.mamAtomIndex&&a.textOffset===d.mamTextOffset&&a.letter===d.mamAtomLetterIndex&&a.sourceSha256===d.sourceEvidence.upstreamFileSha256,'Unsealed scan19 exact per-vowel evidence binding');}
 check(ledger.scan19Seal?.decisionsSha256===scan19Sha&&ledger.scan19Seal.predecessorSha256===predecessorSha&&ledger.scan19Seal.pageManifestSha256===pagesSha&&ledger.scan19Seal.scanManifestSha256==='41812ee9a65dc2b0561c0e4f3688e53a051d5cefd27b52e7f43de957bd76b749','Successor evidence seal mismatch');
 check(hash(ledger.scan19Seal.approvedKeys)===hash(Array.from(approvals.keys()).sort((a,b)=>{const aa=a.split('/'),bb=b.split('/');return aa[0].localeCompare(bb[0])||+aa[1]-bb[1]||+aa[2]-bb[2]||+aa[3]-bb[3]||+aa[4]-bb[4];}))&&hash(ledger.scan19Seal.heldKeys)===hash(['tanach-shemos/38/20/0/1']),'Successor approved/held key mismatch');
 for(const [p,pin] of Object.entries(ledger.sourcePins))check(sha(fs.readFileSync(path.join(root,p)))===pin,'Pinned source mismatch: '+p);
 const legacy=read(root,'scripts/data/tikkun-qatan-occurrences-20261004.json');
 check(sha(fs.readFileSync(path.join(root,'scripts/data/tikkun-qatan-occurrences-20261004.json')))===ledger.legacyLedgerSha256&&legacy.records.length===4,'Legacy authority mismatch');
 const pointing=read(root,'public/tikkun/column-pointing.json'), sidecar=read(root,'public/tikkun/column-marks.json');
 const packet={schema:2,authoritySha256:hash(ledger),legacyAuthoritySha256:hash(legacy),sourceNotice:'/tikkun/qatan-sources.html',books:{},column:{beforeHash:hash(sidecar),rows:{},beforeRows:Object.keys(sidecar.rows).length}};
 const afterColumns=copy(sidecar),legacyColumns=copy(sidecar),predecessorColumns=copy(sidecar), negatives=new Set(ledger.negativeControls.map(key));
 const seen=new Set(),columnSeen=new Set();
 // Preserve predecessor annotation order, then append the separately sealed19.
 const sourceRecords=oldRecords.concat(newRecords);
 const byref=new Map();
 for(const col of Object.keys(pointing.columns).sort((a,b)=>a-b))for(const loc of Object.keys(pointing.columns[col]).sort((a,b)=>{const aa=a.split(':').map(Number),bb=b.split(':').map(Number);return aa[0]-bb[0]||aa[1]-bb[1]||aa[2]-bb[2];}))pointing.columns[col][loc].forEach((p,i)=>{if(p.length>=3){const ref=pointing.refs[p[1]];if(!byref.has(ref))byref.set(ref,[]);byref.get(ref).push({key:`${col}/${loc}/${i}`,word:p[2]});}});
 function addColumn(r,source){
  const [col,loc,ti]=r.columnKey.split('/'),p=pointing.columns[col]?.[loc]?.[+ti],ref=`${r.slug}/${r.chapter}/${r.verse}`;
  check(p&&p.length===3&&pointing.refs[p[1]]===ref&&norm(p[2])===norm(r.word),'Fixed-column exact word/ref mismatch');
  if(source)check(p[2]===r.columnWord,'Fixed-column ledger word mismatch');
  const ck=r.columnKey+'/'+r.letter;check(!columnSeen.has(ck),'Duplicate column occurrence');columnSeen.add(ck);
  const old=afterColumns.rows[r.columnKey];
  if(old)check(old[0]===p[2]&&old[2]===ref&&!old[1].some(m=>m[0]===r.letter&&m[1]==='qk'),'Column duplicate/association mismatch');
  const row=old?copy(old):[p[2],[],ref];row[1].push([r.letter,'qk']);afterColumns.rows[r.columnKey]=row;
  if(!source)legacyColumns.rows[r.columnKey]=copy(row);
  if(!source||!r.authority.scan19Decision)predecessorColumns.rows[r.columnKey]=copy(row);
  packet.column.rows[r.columnKey]=row;
 }
 for(const slug of Object.keys(ledger.effectiveBookPins).sort()){
  const raw=read(root,'public/reader/medooyuk/'+slug+'.json'),prior=copy(raw),expanded=copy(raw),predecessorBook=copy(raw),legacyEntries=[],entries=[],predecessorEntries=[];
  check(raw.slug===slug,'Book slug mismatch');
  for(const r0 of legacy.records.filter(r=>r.slug===slug)){
   const v=raw.ch[r0.chapter]?.[r0.verse],word=v?.t[r0.token];
   check(word&&word.replace(/[^א-ת]/g,'')==='כל'&&r0.letter===0&&clusters(word)[0].includes('\u05B8')&&!v.k[r0.token],'Legacy occurrence mismatch');
   const r={...r0,word};const tuple=[r.token,r.letter,'qk',0];
   check(!v.m.some(m=>m[0]===r.token&&m[1]===r.letter&&m[2]==='qk'),'Legacy duplicate');
   prior.ch[r.chapter][r.verse].m.push(tuple);expanded.ch[r.chapter][r.verse].m.push(tuple);
   predecessorBook.ch[r.chapter][r.verse].m.push(tuple);
   legacyEntries.push({chapter:r.chapter,verse:r.verse,tuple});addColumn(r,false);
  }
  check(hash(prior)===ledger.effectiveBookPins[slug],'Effective parent input mismatch: '+slug);
  for(const r of sourceRecords.filter(r=>r.slug===slug)){
   const v=raw.ch[r.chapter]?.[r.verse],a=r.authority,word=v?.t[r.token];
   check(!seen.has(key(r))&&!negatives.has(key(r)),'Duplicate or user-gadol occurrence');seen.add(key(r));
   check(word===r.word&&!v.k[r.token]&&Number.isInteger(r.letter)&&r.letter>=0&&clusters(word)[r.letter]?.includes('\u05B8'),'Exact word/letter/qere mismatch');
   check(!prior.ch[r.chapter][r.verse].m.some(m=>m[0]===r.token&&m[1]===r.letter&&m[2]==='qk'),'Existing qatan duplicate');
   const authorityPin=ledger.sourceAuthorityPins[slug];
   check(a.edition==='Miqra according to the Masorah'&&a.revision===ledger.revision&&/^[a-f0-9]{64}$/.test(a.sourceSha256)&&a.sourceSha256===authorityPin.sourceSha256&&a.sourcePath===authorityPin.sourcePath&&a.projectionRef===`${authorityPin.osisBook}.${r.chapter}.${r.verse}`,'Source authority identity mismatch');
   check(a.letter===r.letter&&clusters(a.atom)[a.letter]?.includes('\u05C7')&&clusters(a.samekhAtom)[a.letter]?.includes('\u05C7'),'Explicit source letter qatan missing');
   check(signature(word)===signature(a.atom)&&signature(a.atom)===signature(a.samekhAtom),'Pointed source identity mismatch');
   const accent=/[\u0591-\u05AF]/g, meteg=/\u05BD/g;
   const decision=approvals.get(key(r));
   if(a.scan19Decision){
    check(decision&&hash(decision)===hash(a.scan19Decision),'Unsealed scan19 per-vowel compatibility decision');
    check(decision.sourceToken===word&&decision.letterIndex===r.letter&&decision.binding.originalTokenSha256===sha(word)&&decision.binding.originalFileSha256===ledger.effectiveBookPins[slug]&&word[decision.codepointOffset]==='\u05B8','Scan19 exact original token/file/vowel offset mismatch');
    check(clusters(word).slice(0,r.letter).join('').length+clusters(word)[r.letter].indexOf('\u05B8')===decision.codepointOffset,'Scan19 original vowel offset mismatch');
    check(a.atom===decision.mamAtom&&a.samekhAtom===decision.sourceEvidence.samekhAtom&&a.atomIndex===decision.mamAtomIndex&&a.textOffset===decision.mamTextOffset&&a.letter===decision.mamAtomLetterIndex&&a.sourceSha256===decision.sourceEvidence.upstreamFileSha256,'Scan19 MAM evidence binding mismatch');
    check(a.localCompatibility==='parent-inspected per-vowel Eesh compatibility; exact occurrence only; no generic accent/meteg rule','Scan19 compatibility scope mismatch');
   }else check(!decision,'Approved19 missing exact adjudication');
   check(a.scan19Decision||(local(word,meteg)===local(a.atom,meteg)&&local(a.atom,meteg)===local(a.samekhAtom,meteg)),'Local meteg source incompatibility');
   check(local(a.atom,accent)===local(a.samekhAtom,accent),'Source tradition accent mismatch');
   if(local(word,accent)!==local(a.atom,accent)&&!a.scan19Decision){
    const v=a.visualAdjudication;
    check(key(r)==='tanach-shemos/21/11/1/1'&&v&&v.reference==='Exodus 21:11'&&v.pdfPage===158&&v.letterIndex===1&&v.observedQuality==='qatan'&&v.scanSha256==='17fe402444a6a358d3db04c867c1d8c264ef6d30dff1f61782c2ffc03bf17208'&&v.imageSha256==='79395ce071281973070a63721abb5842a20f52d0f099f7ea7d08a2ea9fc03900'&&local(word,accent)==='|\u05A8|'&&local(a.atom,accent)==='||','Local accent mismatch without exact independently inspected scan adjudication');
   }
   const pts=byref.get(`${slug}/${r.chapter}/${r.verse}`)||[],idx=uniqueAlignment(v.t.map(norm),pts.map(p=>p.word===null?null:norm(p.word)),r.token);
   check(idx!==null&&pts[idx].key===r.columnKey,'Fixed-column occurrence not unique in every optimal monotonic alignment');
   const tuple=[r.token,r.letter,'qk',0];expanded.ch[r.chapter][r.verse].m.push(tuple);entries.push({chapter:r.chapter,verse:r.verse,tuple});addColumn(r,true);
   if(a.scan19Decision)predecessorEntries.push({chapter:r.chapter,verse:r.verse,tuple});else predecessorBook.ch[r.chapter][r.verse].m.push(tuple);
  }
  packet.books[slug]={sourceSha256:ledger.sourcePins['public/reader/medooyuk/'+slug+'.json'],beforeHash:hash(raw),effectiveHash:hash(prior),afterHash:hash(expanded),legacyEntries,entries};
  check(hash(predecessorBook)===predecessor.bookAfterHashes[slug],'Frozen predecessor book conservation mismatch');
  Object.assign(packet.books[slug],{predecessorHash:hash(predecessorBook),predecessorEntries});
  for(const n of ledger.negativeControls.filter(n=>n.slug===slug)){
   const v=expanded.ch[n.chapter]?.[n.verse];check(v?.t[n.token]===n.word&&!v.m.some(m=>m[0]===n.token&&m[1]===n.letter&&m[2]==='qk'),'Explicit user-gadol negative violated');
  }
 }
 check(seen.size===ledger.records.length,'Unknown book in occurrence ledger');
 legacyColumns.independentQatan={authoritySha256:hash(legacy),occurrences:4};
 predecessorColumns.independentQatan={authoritySha256:predecessor.authoritySha256,occurrences:legacy.records.length+oldRecords.length,sourceNotice:packet.sourceNotice};
 predecessorColumns.rows=Object.fromEntries(Object.keys(predecessorColumns.rows).sort().map(k=>[k,predecessorColumns.rows[k]]));
 check(hash(predecessorColumns)===predecessor.columnAfterHash,'Frozen predecessor column conservation mismatch');
 packet.column.predecessorHash=hash(predecessorColumns);
 afterColumns.independentQatan={authoritySha256:packet.authoritySha256,occurrences:legacy.records.length+sourceRecords.length,sourceNotice:packet.sourceNotice};
 afterColumns.rows=Object.fromEntries(Object.keys(afterColumns.rows).sort().map(k=>[k,afterColumns.rows[k]]));
 packet.column.effectiveHash=hash(legacyColumns);packet.column.afterHash=hash(afterColumns);packet.column.afterRows=Object.keys(afterColumns.rows).length;packet.column.metadata=afterColumns.independentQatan;
 return packet;
}
function generate(p){return `/* Generated by scripts/build-tikkun-qatan-expansion.cjs.
 * Exact in-memory occurrence annotations only. Source words/ink never changed.
 * MAM-derived decisions: Hebrew Wikisource, CC BY-SA 4.0; see ${p.sourceNotice}.
 * Semantic completeness is not claimed. User gold and previous marks preserved. */
(function(root){'use strict';
const packet=${JSON.stringify(p)};
const copy=x=>JSON.parse(JSON.stringify(x));
const hash=x=>root.TikkunBoundaries.boundaryHash(x);
function applyBook(book,requestedSlug){
 if(typeof requestedSlug!=='string'||!requestedSlug||!book||book.slug!==requestedSlug)throw Error('Qatan occurrence source mismatch: requested book identifier');
 const p=packet.books[requestedSlug];if(!p)return book;
 const h=hash(book);if(h===p.afterHash)return book;
 if(h!==p.beforeHash&&h!==p.effectiveHash&&h!==p.predecessorHash)throw Error('Qatan occurrence source mismatch');
 const result=copy(book),entries=h===p.beforeHash?p.legacyEntries.concat(p.entries):h===p.predecessorHash?p.predecessorEntries:p.entries;
 entries.forEach(e=>result.ch[e.chapter][e.verse].m.push(e.tuple.slice()));
 if(hash(result)!==p.afterHash)throw Error('Qatan occurrence output mismatch');return result;
}
function applyColumnMarks(marks){
 const p=packet.column,h=hash(marks);if(h===p.afterHash)return marks;
 if(h!==p.beforeHash&&h!==p.effectiveHash&&h!==p.predecessorHash)throw Error('Qatan column source mismatch');
 const result=copy(marks);Object.assign(result.rows,copy(p.rows));result.rows=Object.fromEntries(Object.keys(result.rows).sort().map(k=>[k,result.rows[k]]));result.independentQatan=copy(p.metadata);
 if(hash(result)!==p.afterHash)throw Error('Qatan column output mismatch');return result;
}
root.TikkunQatanOccurrences={applyBook,applyColumnMarks,afterRows:packet.column.afterRows,authoritySha256:packet.authoritySha256,sourceNotice:packet.sourceNotice};
// Accessible license notice OUTSIDE fixed ink; never alter its rows/geometry.
function sourceNotice(){
 if(typeof document==='undefined'||document.getElementById('tk-qatan-source-notice'))return;
 const footer=document.querySelector('#tk-app .tk-foot');if(!footer)return;
 const p=document.createElement('p'),a=document.createElement('a');p.id='tk-qatan-source-notice';a.href=packet.sourceNotice;
 a.textContent='MAM qatan supplement — Hebrew Wikisource · CC BY-SA 4.0 · sources and changes';p.appendChild(a);footer.appendChild(p);
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sourceNotice,{once:true});else sourceNotice();}
})(window);
`;}
module.exports={build,generate,hash,norm,uniqueAlignment};
if(require.main===module){
 const packet=build(),content=generate(packet),target=path.join(ROOT,'public/tikkun-qatan.js');
 if(process.argv.includes('--check'))check(fs.readFileSync(target,'utf8')===content,'Generated expansion helper stale');
 else fs.writeFileSync(target,content);
 console.log(JSON.stringify({pass:true,mode:process.argv.includes('--check')?'check':'write',additionalOccurrences:Object.values(packet.books).reduce((n,b)=>n+b.entries.length,0),legacyOccurrences:4,columnBeforeRows:packet.column.beforeRows,columnAfterRows:packet.column.afterRows,authoritySha256:packet.authoritySha256}));
}
