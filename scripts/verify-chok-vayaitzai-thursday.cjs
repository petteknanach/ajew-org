/* One parent-selected Thursday reading: genuine selected loader/renderer + unchanged registered main helpers.
 * Accepted field values are independent received after-values, not renderer-derived goldens.
 * parse5 is the installed HTML5 parser. This is not whole-page/native/publication proof.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{boot,checkOracle,sourceSRI}=require('./verify-chok-qualified-daily.cjs');
const parse5=require(path.join(process.env.AJEW_TEST_DEPENDENCIES||root,'node_modules/parse5/dist/cjs/index.js'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),copy=x=>JSON.parse(JSON.stringify(x)),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const fixture=JSON.parse(read('scripts/fixtures/chok-vayaitzai-thursday-reviewed.json')),oracle=JSON.parse(read('scripts/chok-qualified-daily-reviewed.json'));
function attr(n,k){const a=(n.attrs||[]).find(a=>a.name===k);return a&&a.value;}
function nodes(n,p,out=[]){if(p(n))out.push(n);for(const c of n.childNodes||[])nodes(c,p,out);return out;}
function text(n){return n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');}
function one(n,p){const a=nodes(n,p);assert.equal(a.length,1);return a[0];}
function direct(n,k){return one(n,x=>x.parentNode===n&&attr(x,'data-daily-field')===k);}
function sourceFunction(code,name){const marker='  function '+name+'(';const a=code.indexOf(marker);assert(a>=0);const b=code.indexOf('\n  }',a);assert(b>a);return code.slice(a,b+4);}
function visiblePath(n){for(let p=n;p;p=p.parentNode){assert.equal(attr(p,'hidden'),undefined,'MANDATORY_NOTE_HIDDEN');assert.notEqual(p.tagName,'details','MANDATORY_NOTE_INSIDE_DISCLOSURE');assert(!/display\s*:\s*none|visibility\s*:\s*hidden/.test(attr(p,'style')||''));}}
function expectedMode(s,mode){if(mode==='full')return s;if(mode==='nikud')return s.replace(/[\u0591-\u05AF\u05BD\u05C0]/g,'');if(mode==='taamim')return s.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');return s.replace(/[\u0591-\u05AF\u05BD\u05C0\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');}
function fullPositive(p,e,libraryAPI){
 const f=fixture.readings[0];assert.equal(e.key,f.key);assert.deepEqual(checkOracle(p,e,oracle),{checked:12,notes:13});
 assert.deepEqual(p.sections.mishna.units.map(u=>u.owner),f.owners.map(a=>a.owner));
 for(const a of f.owners){const u=p.sections.mishna.units.find(u=>u.owner===a.owner),b=a.adoptedFieldBinding;assert(u);
  assert.equal(u.he,a.he);assert.equal(u.en,a.en);assert.equal(sha(u.he),b.originalSHA256);assert.equal(sha(u.en),b.EnglishSHA256);
  assert.deepEqual(u.explanation.title,a.explanationTitle);assert.equal(u.explanation.paragraphs.map(p=>p.he).join('\n\n'),a.explanationHe);assert.equal(u.explanation.paragraphs.map(p=>p.en).join('\n\n'),a.explanationEn);
  assert.equal(sha(a.explanationHe),b.explanationHE_SHA256);assert.equal(sha(a.explanationEn),b.explanationEN_SHA256);assert.equal(sha(libraryAPI.canonical(u.explanation)),a.explanationSHA256);assert.deepEqual(u.notes,a.notes);
  assert.deepEqual(u.notes.map(n=>({id:n.id,heSHA256:sha(n.he),enSHA256:sha(n.en)})),b.requiredNotes);
 }
}
const coordinatedEvidence=[];
(async()=>{
 assert.equal(fixture.schema,'chok-vayaitzai-thursday-reviewed-v1');assert.equal(fixture.readings.length,1);sourceSRI(root);
 const main=read('public/chok.js'),astro=read('src/pages/reader/chok.astro'),schedule=JSON.parse(read('public/reader/chok/schedule.json'));
 const {api,libraryAPI,entries}=boot(root),oldKeys=fixture.priorSelectedKeys,newKeys=fixture.readings.map(f=>f.key);
 assert.equal(oldKeys.length,10);assert.equal(entries.length,11);assert.deepEqual(entries.slice(0,10).map(e=>e.key),oldKeys);assert.deepEqual(entries.slice(10).map(e=>e.key),newKeys);assert.deepEqual(entries.map(e=>e.key).sort(),oracle.readingKeys.slice().sort());
 // The owning initializer really calls the extracted qualifiedDailyOr helper for Mishna.
 assert(main.includes("return qualifiedDailyOr(wk,dayE,'mishna',d,function()"));
 for(const id of ['ck-language','ck-mode']){
  const select=astro.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)</select>'));assert(select);
  const values=Array.from(select[1].matchAll(/<option value="([^"]+)"/g),m=>m[1]);assert.deepEqual(values.sort(),(id==='ck-mode'?['full','nikud','taamim','letters']:['he','en','both','original']).sort());
 }
 const raws=new Map(),plans=new Map(),requests=[];
 for(const f of fixture.readings){const e=entries.find(e=>e.key===f.key);assert(e);assert.equal(e.url,f.url);assert.equal(e.payloadSHA256,f.payloadSHA256);assert.deepEqual(e.schedule,f.schedule);assert.deepEqual(e.schedule,schedule.weeks[e.week].days[e.day]);assert.deepEqual(e.sections.mishna.pairs,f.pairs);raws.set(e.url+'?v='+e.payloadSHA256,read('public'+e.url));plans.set(e.key,e);}
 const box={window:{ChokQualifiedDailySelected:api,ChokQualifiedDaily:{bind:()=>{}}},document:{},state:{sched:schedule},fetchJSON:(url,rawMode)=>{assert.equal(rawMode,true);assert(raws.has(url),'WRONG_OR_UNVERSIONED_REQUEST');requests.push(url);return Promise.resolve(raws.get(url));}};
 for(const name of ['TAAMIM','NIKUD']){const m=main.match(new RegExp('var '+name+'\\s*=\\s*([^;]+);'));assert(m);vm.runInNewContext('var '+name+' = '+m[1]+';',box);}
 vm.runInNewContext(['applyWednesdayMode','qualifiedDailyHas','qualifiedDailyReading','qualifiedDailyOr'].map(n=>sourceFunction(main,n)).join('\n'),box);
 let renders=0,unitInstances=0,noteInstances=0,pairInstances=0,owners=0,notes=0,negativeCases=0,restoredPositives=0,adjacentLegacy=0;
 for(const f of fixture.readings){
  const e=plans.get(f.key),raw=raws.get(e.url+'?v='+e.payloadSHA256),packet=JSON.parse(raw),approved=new Map(f.owners.map(o=>[o.owner,o]));
  fullPositive(packet,e,libraryAPI);const checked=checkOracle(packet,e,oracle);assert.equal(checked.checked,f.owners.length);assert.equal(checked.notes,f.owners.reduce((n,o)=>n+o.notes.length,0));owners+=checked.checked;notes+=checked.notes;
  assert.deepEqual(packet.sections.mishna.units.map(u=>u.owner),f.owners.map(o=>o.owner));
  for(const u of packet.sections.mishna.units){const a=approved.get(u.owner);assert.equal(u.he,a.he);assert.equal(u.en,a.en);assert.equal(u.explanation.paragraphs.map(p=>p.he).join('\n\n'),a.explanationHe);assert.equal(u.explanation.paragraphs.map(p=>p.en).join('\n\n'),a.explanationEn);assert.deepEqual(u.explanation.title,a.explanationTitle);assert.equal(sha(libraryAPI.canonical(u.explanation)),a.explanationSHA256);assert.deepEqual(u.notes,a.notes);}
  for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters'])for(const commentary of [false,true])for(const rashi of [false,true]){
   Object.assign(box.state,{language,mode,commentary,rashi});
   const html=await box.qualifiedDailyOr(e.week,e.day,'mishna',e.schedule,()=>{throw Error('SELECTED_READING_USED_LEGACY');}),dom=parse5.parseFragment(html);
   const island=one(dom,n=>attr(n,'data-qualified-daily')===f.key);assert.equal(attr(island,'data-daily-language'),language);assert.equal(attr(island,'data-daily-commentary'),commentary?'on':'off');
   assert.deepEqual(nodes(dom,n=>attr(n,'data-reading-unit')!==undefined).map(n=>attr(n,'data-reading-unit')),f.owners.map(o=>o.owner),'COMPLETE_INTERLEAVED_DOM_ORDER');
   for(const a of f.owners){const article=one(dom,n=>attr(n,'data-reading-unit')===a.owner);assert.equal(attr(article,'data-field-role'),a.role);
    assert.equal(text(direct(article,'original')),expectedMode(a.he,mode));assert.equal(text(direct(article,'untouched')),a.he);assert.equal(text(direct(article,'en')),a.en);
    assert.equal(attr(direct(article,'original'),'hidden')!==undefined,language==='original');assert.equal(attr(direct(article,'untouched'),'hidden')!==undefined,language!=='original');assert.equal(attr(direct(article,'en'),'hidden')!==undefined,!['en','both'].includes(language));
    const exp=direct(article,'explanation');assert.equal(attr(exp,'hidden')!==undefined,!commentary||language==='original');assert.equal(text(one(exp,n=>n.tagName==='summary')),a.explanationTitle.he+' · '+a.explanationTitle.en);
    assert.equal(nodes(exp,n=>attr(n,'data-daily-field')==='he').map(text).join('\n\n'),a.explanationHe);assert.equal(nodes(exp,n=>attr(n,'data-daily-field')==='en').map(text).join('\n\n'),a.explanationEn);
    for(const p of nodes(exp,n=>['he','en'].includes(attr(n,'data-daily-field')))){const kind=attr(p,'data-daily-field');assert.equal(attr(p,'hidden')!==undefined,kind==='he'?!['he','both'].includes(language):!['en','both'].includes(language));}
    unitInstances++;
    for(const n of a.notes){const aside=one(dom,x=>attr(x,'data-daily-note')===n.id);assert.equal(attr(aside,'data-note-owner'),a.owner);assert.equal(attr(aside,'data-field-role'),n.role);assert.equal(text(one(aside,x=>x.tagName==='p'&&attr(x,'lang')==='he')),n.he);assert.equal(text(one(aside,x=>x.tagName==='p'&&attr(x,'lang')==='en')),n.en);visiblePath(aside);const pair=f.pairs.find(p=>p.mishna===a.owner||p.bartenura===a.owner);const parent=one(dom,x=>attr(x,'data-mishna-owner')===pair.mishna);assert.equal(aside.parentNode,parent);const barrier=a.role==='mishna'?article:one(parent,x=>attr(x,'data-commentary-owner')===pair.mishna);assert(parent.childNodes.indexOf(aside)>parent.childNodes.indexOf(barrier));noteInstances++;}
   }
   assert.equal(nodes(dom,n=>attr(n,'data-daily-note')!==undefined).length,checked.notes);
   for(const pair of f.pairs){const parent=one(dom,n=>attr(n,'data-mishna-owner')===pair.mishna),m=one(parent,n=>attr(n,'data-reading-unit')===pair.mishna),b=one(parent,n=>attr(n,'data-reading-unit')===pair.bartenura),bar=one(parent,n=>attr(n,'data-commentary-owner')===pair.mishna);assert.equal(m.parentNode,parent);assert.equal(b.parentNode,bar);assert.equal(bar.parentNode,parent);assert.equal(attr(bar,'hidden')!==undefined,!commentary);assert.deepEqual(nodes(parent,n=>attr(n,'data-reading-unit')!==undefined).map(n=>attr(n,'data-reading-unit')),[pair.mishna,pair.bartenura]);const children=parent.childNodes.filter(n=>n.tagName);assert(children.indexOf(bar)>children.indexOf(m));assert(children.slice(children.indexOf(m)+1,children.indexOf(bar)).every(n=>n.tagName==='aside'&&attr(n,'data-note-owner')===pair.mishna));pairInstances++;}
   renders++;
  }
  // A source-only extension must not seize this day's Gemara or its adjacent unselected namespace.
  assert.equal(api.has(e.week,e.day,'talmud'),false);assert.equal(await box.qualifiedDailyOr(e.week,e.day,'talmud',e.schedule,()=>{adjacentLegacy++;return Promise.resolve('unaltered-talmud');}),'unaltered-talmud');
  // Wednesday and Friday are already selected. Derive namespace controls from actual registry.
  const knownSections=Object.keys(e.schedule).filter(k=>k!=='source').map(k=>k==='gemara'?'talmud':k);
  for(const section of knownSections.filter(s=>!Object.hasOwn(e.sections,s))){assert.equal(api.has(e.week,e.day,section),false);assert.equal(await box.qualifiedDailyOr(e.week,e.day,section,e.schedule,()=>{adjacentLegacy++;return Promise.resolve('unaltered:'+section);}), 'unaltered:'+section);}
  const unselectedDay=Object.keys(schedule.weeks[e.week].days).find(day=>!entries.some(p=>p.week===e.week&&p.day===day));assert(unselectedDay);
  assert.equal(api.has(e.week,unselectedDay,'mishna'),false);assert.equal(await box.qualifiedDailyOr(e.week,unselectedDay,'mishna',schedule.weeks[e.week].days[unselectedDay],()=>{adjacentLegacy++;return Promise.resolve('unselected-day');}),'unselected-day');
  assert.equal(api.has('לך לך','יום חמישי','talmud'),false);assert.equal(await box.qualifiedDailyOr('לך לך','יום חמישי','talmud',schedule.weeks['לך לך'].days['יום חמישי'],()=>{adjacentLegacy++;return Promise.resolve('Lech-Thursday-direct-legacy');}),'Lech-Thursday-direct-legacy');
  const ni=packet.sections.mishna.units.findIndex(u=>u.notes.length);assert(ni>=0);
  const cases=[
   ['wrong-source',p=>{p.sections.mishna.units[0].he+='א';},/digest mismatch/],
   ['wrong-English',p=>{p.sections.mishna.units[0].en+=' altered';},/digest mismatch/],
   ['wrong-note-text',p=>{p.sections.mishna.units[ni].notes[0].en+=' altered';},/digest mismatch/],
   ['removed-note',p=>{p.sections.mishna.units[ni].notes.pop();},/digest mismatch/],
   ['wrong-order',p=>{[p.sections.mishna.units[0],p.sections.mishna.units[1]]=[p.sections.mishna.units[1],p.sections.mishna.units[0]];},/wrong unit identity/],
   ['private-nested-field',p=>{p.sections.mishna.units[0].explanation.title.privatePath='/root/private-test';},/unexpected fields/],
   ['wrong-schema',p=>{p.schema='chok-unapproved-v9';},/wrong payload owner/],
   ['wrong-explanation-title',p=>{p.sections.mishna.units[0].explanation.title.en+=' altered';},/digest mismatch/]
  ];
  for(const [name,mutate,reason]of cases){const bad=copy(packet);mutate(bad);const payload=JSON.stringify(bad),modified=copy(e);modified.payloadSHA256=sha(payload);const rejecting=libraryAPI.create([modified]);await assert.rejects(rejecting.load(e.week,e.day,e.schedule,async url=>{assert.equal(url,e.url+'?v='+modified.payloadSHA256);return payload;}),reason,name);negativeCases++;const fresh=libraryAPI.create([e]);const restored=copy(await fresh.load(e.week,e.day,e.schedule,async url=>{assert.equal(url,e.url+'?v='+e.payloadSHA256);return raw;}));assert.deepEqual(restored,packet,'FRESH_SAME_OWNER_POSITIVE:'+name);fullPositive(restored,e,libraryAPI);restoredPositives++;}
  // These mutants really pass the actual library with coordinated payload AND plan-field digests.
  // The independent reviewed oracle, not an arbitrary nonzero wrapper, then rejects each.
  for(const kind of ['he','en','explanation','note']){
   const bad=copy(packet),modified=copy(e),u=bad.sections.mishna.units[0],p=modified.sections.mishna.units[0];
   let reason;
   if(kind==='he'){u.he='א'+u.he;p.originalSHA256=sha(u.he);for(const n of u.notes){n.sourceTextSHA256=sha(u.he);n.span.start++;n.span.end++;}p.notesSHA256=sha(libraryAPI.canonical(u.notes));reason=/REVIEWED_ORIGINAL_MISMATCH/;}
   if(kind==='en'){u.en+=' altered';p.englishSHA256=sha(u.en);reason=/REVIEWED_ENGLISH_MISMATCH/;}
   if(kind==='explanation'){u.explanation.paragraphs[0].en+=' altered';p.explanationSHA256=sha(libraryAPI.canonical(u.explanation));reason=/REVIEWED_EN_EXPLANATION_MISMATCH/;}
   if(kind==='note'){u.notes[0].en+=' altered';p.notesSHA256=sha(libraryAPI.canonical(u.notes));reason=/REVIEWED_NOTE_MISMATCH/;}
   const payload=JSON.stringify(bad);modified.payloadSHA256=sha(payload);const real=libraryAPI.create([modified]);let calls=0;
   const loaded=copy(await real.load(e.week,e.day,e.schedule,async url=>{calls++;assert.equal(url,e.url+'?v='+modified.payloadSHA256);return payload;}));assert.equal(calls,1);assert.deepEqual(loaded,bad,'GENUINE_LIBRARY_ACCEPTED_COORDINATED_'+kind);
   assert.throws(()=>checkOracle(loaded,modified,oracle),reason,'INDEPENDENT_ORACLE_REJECTED_'+kind);
   coordinatedEvidence.push({kind,libraryAccepted:true,oracleRejected:reason.source,payloadSHA256:modified.payloadSHA256});
   const fresh=libraryAPI.create([e]);const restored=copy(await fresh.load(e.week,e.day,e.schedule,async url=>{assert.equal(url,e.url+'?v='+e.payloadSHA256);return raw;}));assert.deepEqual(restored,packet);fullPositive(restored,e,libraryAPI);restoredPositives++;
  }
 }
 assert.equal(owners,12);assert.equal(notes,13);assert.equal(requests.length,1);assert.equal(new Set(requests).size,1);
 // Actual selected Wednesday -> new Thursday -> selected Friday -> same new Thursday.
 const freshBoxAPI=boot(root).api;box.window.ChokQualifiedDailySelected=freshBoxAPI;
 const target=plans.get(newKeys[0]),neighbors=['יום רביעי','יום שישי'].map(day=>entries.find(e=>e.week===target.week&&e.day===day));assert(neighbors.every(Boolean));
 for(const e of neighbors){assert(freshBoxAPI.has(e.week,e.day,'mishna'));raws.set(e.url+'?v='+e.payloadSHA256,read('public'+e.url));}
 Object.assign(box.state,{language:'both',mode:'full',commentary:true,rashi:true});
 const sequence=[neighbors[0],target,neighbors[1],target];let sequenceRenders=0;const beforeSequence=requests.length;
 for(const e of sequence){const html=await box.qualifiedDailyOr(e.week,e.day,'mishna',e.schedule,()=>{throw Error('ADJACENT_SELECTED_FALLBACK');});const dom=parse5.parseFragment(html);assert.equal(nodes(dom,n=>attr(n,'data-qualified-daily')===e.key).length,1);const packet=JSON.parse(raws.get(e.url+'?v='+e.payloadSHA256));for(const u of packet.sections.mishna.units){const a=one(dom,n=>attr(n,'data-reading-unit')===u.owner);assert.equal(text(direct(a,'original')),u.he);assert.equal(text(direct(a,'en')),u.en);}sequenceRenders++;}
 assert.deepEqual(requests.slice(beforeSequence),[neighbors[0],target,neighbors[1]].map(e=>e.url+'?v='+e.payloadSHA256),'EXACT_NEIGHBOR_REQUEST_SEQUENCE');
 assert.equal(requests.length,4,'FRESH_NEIGHBOR_CACHE_ISOLATION');assert.equal(new Set(requests).size,3);
 assert.equal(renders,64);assert.equal(unitInstances,768);assert.equal(noteInstances,832);assert.equal(pairInstances,384);assert.equal(negativeCases,8);assert.equal(restoredPositives,12);assert.equal(coordinatedEvidence.length,4);
 const compiler=require(path.join(process.env.AJEW_TEST_DEPENDENCIES||root,'node_modules/@astrojs/compiler'));const transformed=await compiler.transform(astro,{filename:'src/pages/reader/chok.astro'});assert.equal(transformed.diagnostics.filter(d=>d.severity===1).length,0);
 console.log(JSON.stringify({pass:true,newReadings:1,independentOwners:owners,independentBilingualNotes:notes,realRegisteredCallerMatrixRenders:renders,completeUnitInstances:unitInstances,mandatoryVisibleNoteInstances:noteInstances,immediatePairInstances:pairInstances,initialVersionedPayloadRequests:1,checksumValidNegativeCases:negativeCases,freshSameOwnerPositives:restoredPositives,coordinatedOracleNegatives:coordinatedEvidence,unselectedLegacyCases:adjacentLegacy,WednesdayThursdayFridayThursdayCallerRenders:sequenceRenders,totalIsolatedVersionedRequests:requests.length,scriptSRI:true,actualAstroTransformErrors:0,nativeOrWholePageOrFullInitializerOrPublicationClaim:false}));
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
