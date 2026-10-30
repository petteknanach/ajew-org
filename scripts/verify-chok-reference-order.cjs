'use strict';
// Source/caller + incremental corpus regression. This is NOT native geometry proof.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=process.cwd(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const main=fs.readFileSync(process.env.CHOK_REFERENCE_MAIN||'public/chok.js','utf8');
const marked=fs.readFileSync(process.env.CHOK_REFERENCE_MARKED||'public/medooyuk.js','utf8');
function sourceFunction(source,name){
 const start=source.indexOf('  function '+name+'(');assert(start>=0,'Missing actual function '+name);
 // Each admitted function ends at the next top-level function/var/comment boundary.
 const rest=source.slice(start),end=rest.indexOf('\n  }');assert(end>=0);return rest.slice(0,end+4);
}
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function plain(html){return html.replace(/<[^>]+>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');}
let referenceCases=0,markerCases=0;
function references(){
 const box={esc};vm.createContext(box);
 vm.runInContext(main.slice(main.indexOf('  function heNum(n)'),main.indexOf('  var __fq')),box);
 vm.runInContext(sourceFunction(main,'secHead')+'\n'+sourceFunction(main,'refStr'),box);
 const labels=['א:ב','יב:ט','יט:כט','כח:טו','א:א','יט:יט','יב:א–יג:ד','19:29','28:15','12:1–13:4','Genesis 19:29'];
 for(const parent of ['rtl','ltr'])for(const language of ['he','en'])for(const label of labels){
  const html=box.refLabelHTML(label,language),dir=language==='he'?'rtl':'ltr';
  assert(html.startsWith('<bdi class="ck-generated-ref" dir="'+dir+'">'),'WRITING_LANGUAGE_DIRECTION:'+language+':'+label+':parent='+parent);
  assert.equal(plain(html),label,'LOGICAL_REFERENCE_CONSERVATION');
  const groups=[...html.matchAll(/<bdi dir="(rtl|ltr)">([^<]+)<\/bdi>/g)];
  assert.deepEqual(groups.map(m=>m[2]),label.match(/[א-ת]+|[0-9]+/g)||[]);
  for(const [,inner,word]of groups)assert.equal(inner,/[א-ת]/.test(word)?'rtl':'ltr','NUMERAL_INTERNAL_DIRECTION');
  referenceCases++;
 }
 // Exact actual callers, not a new disconnected helper.
 assert(main.includes("refLabelHTML(plainHeNum(c) + ':' + plainHeNum(x), 'he')"),'ACTUAL_VERSE_CALLER_CONTEXT');
 assert(main.includes('referenceLanguage ? refLabelHTML(ref, referenceLanguage) : esc(ref)'),'ACTUAL_SECTION_CALLER_CONTEXT');
 const calls=main.split('\n').filter(l=>l.includes('secHead(')&&l.includes('refStr'));
 assert.equal(calls.length,3,'ALL_GENERATED_RANGE_CALLERS');for(const call of calls)assert(call.includes(", 'he')"));
 const range={from:{c:19,v:29},to:{c:20,v:15}},before=JSON.stringify(range);
 assert.equal(box.refStr(range),'יט:כט–כ:טו');assert.equal(JSON.stringify(range),before);
 assert(box.secHead('תורה',box.refStr(range),'he').includes('dir="rtl"'));
 assert(box.secHead('English','19:29','en').includes('dir="ltr"'));
 assert.equal(box.secHead('literal','רש״י (יט:כט)'),'<h2 class="ck-sec-head">literal <span class="ck-ref">רש״י (יט:כט)</span></h2>');
 assert.equal(plain(box.refLabelHTML('<א&ב:1>','he')),'<א&ב:1>');
}
function renderer(source){
 const box={window:{},document:{getElementById:()=>({}),createElement:()=>({}),head:{appendChild(){}}}};
 vm.runInNewContext(source,box);return box.window.AjewMarkedHebrew;
}
const markRE=/<span class="marked-paragraph-boundary" data-source-role="paragraph-boundary" data-paragraph-kind="([ps])" data-word-boundary="(\d+)" dir="rtl" aria-label="[^"]+">([פס])<\/span>/g;
function marks(html){return [...html.matchAll(markRE)].map(m=>[Number(m[2]),m[1],m[3]]);}
function markers(){
 const api=renderer(marked),oracleBytes=fs.readFileSync(path.join(__dirname,'chok-reference-order-marker-oracle.json'));
 assert.equal(sha(oracleBytes),'1911a7e86b7cc4fde61206a2e96570a1d84988add7b5ba3c84cd5a24a44f3bb1','INDEPENDENT_ORACLE_PIN');
 const oracle=JSON.parse(oracleBytes);assert.equal(oracle.books.length,39);
 let books=0,verses=0,p=0,s=0,interior=0,rawBytes=0,other=0;
 for(const spec of oracle.books){
  const raw=fs.readFileSync('public/reader/medooyuk/'+spec.slug+'.json');rawBytes+=raw.length;
  assert.equal(raw.length,spec.bytes,'RAW_BOOK_BYTES:'+spec.slug);assert.equal(sha(raw),spec.sha256,'RAW_BOOK_AUTHORITY:'+spec.slug);
  const book=JSON.parse(raw),bookBefore=JSON.stringify(book),expected=new Map();
  for(const [c,v,index,kind,n]of spec.markers){const key=c+':'+v;if(!expected.has(key))expected.set(key,[]);expected.get(key).push([index,kind,kind==='p'?'פ':'ס']);assert(index>=0&&index<=n);if(index<n)interior++;kind==='p'?p++:s++;}
  for(const [c,chapter]of Object.entries(book.ch))for(const [v,verse]of Object.entries(chapter)){
   verses++;const before=JSON.stringify(verse),want=expected.get(c+':'+v)||[];
   for(const specialNikud of [false,true]){
    const html=api.renderVerse(verse,{specialNikud});assert.deepEqual(marks(html),want,'ALL_P_S_BOUNDARIES:'+spec.slug+':'+c+':'+v);
    const noMarkers=api.renderVerse({...verse,b:[]},{specialNikud});
    assert.equal(html.replace(markRE,''),noMarkers,'SOURCE_BODY_RENDER_CONSERVATION:'+spec.slug+':'+c+':'+v);
    for(const [i,kind]of want){
     const at=html.indexOf('data-paragraph-kind="'+kind+'" data-word-boundary="'+i+'"');assert(at>=0);
     const beforeAnnotation=html.slice(0,html.lastIndexOf('<span',at)).replace(markRE,'');
     const prefix=api.renderVerse({...verse,t:verse.t.slice(0,i),k:(verse.k||[]).slice(0,i),b:[]},{specialNikud});
     // Prefix words and combining marks are identical; renderer token separator is outside words.
     assert.equal(plain(beforeAnnotation).trim(),plain(prefix).trim(),'EXACT_SOURCE_BOUNDARY_POSITION:'+spec.slug+':'+c+':'+v+':'+i);
    }
    markerCases++;
   }
   other+=(verse.b||[]).filter(b=>b[1]!=='p'&&b[1]!=='s').length;
   assert.equal(JSON.stringify(verse),before,'UNCHANGED_T_M_K_B_QERE');
  }
  assert.equal(JSON.stringify(book),bookBefore,'UNCHANGED_COMPLETE_BOOK');books++;
 }
 assert.deepEqual({books,verses,p,s,interior,other},{books:39,verses:23213,p:1181,s:1981,interior:90,other:9});
 const literal={t:['פ','ס','רש״י','אֶ֖שֶׁל'],m:[],k:[],b:[[1,'n8'],[2,'s']]};
 const literalOut=api.renderVerse(literal,{specialNikud:false});assert.equal(marks(literalOut).length,1);assert(plain(literalOut.replace(markRE,'')).includes('פ ס רש״י אֶ֖שֶׁל'));
 // Actual Chok normal, fallback, UntouchedOriginal and display-mode projection.
 const box={esc,state:{mode:'full',medooyuk:false},window:{AjewMarkedHebrew:api}};vm.createContext(box);
 vm.runInContext('var TAAMIM=/[\\u0591-\\u05AF]/g,NIKUD=/[\\u05B0-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7]/g;'+['applyMode','joinTokens','paragraphMarkers','plainVerse','coloredVerse'].map(n=>sourceFunction(main,n)).join('\n'),box);
 const genuine={t:['אֶ֖שֶׁל','בְּאֵר'],m:[],k:[0,0],b:[[1,'p'],[2,'s'],[2,'n8']]},saved=JSON.stringify(genuine);
 for(const mode of ['full','nikud','taamim','letters'])for(const shared of [true,false]){
  box.state.mode=mode;box.window.AjewMarkedHebrew=shared?api:null;
  assert.deepEqual(marks(box.coloredVerse(genuine,false)),[[1,'p','פ'],[2,'s','ס']]);
  assert.deepEqual(marks(box.plainVerse(genuine,true)),[[1,'p','פ'],[2,'s','ס']]);
 }
 assert.equal(JSON.stringify(genuine),saved);
 console.log(JSON.stringify({gate:'ALL_39_BIBLE_P_S',books,verses,p,s,interior,other,rawBytes,markerCases,oracleSHA256:sha(oracleBytes)}));
}
const mode=process.env.CHOK_REFERENCE_TEST_MODE||'all';
if(mode==='all'||mode==='references')references();
if(mode==='all'||mode==='markers')markers();
assert(['all','references','markers'].includes(mode));
console.log(JSON.stringify({gate:'CHOK_REFERENCE_ORDER_AND_PARAGRAPHS',referenceCases,markerCases,mode,nativeGeometry:false,version:process.version}));
