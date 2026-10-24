/* Real selected loader/renderer and actual owning-main call sites. Native browser proof is separate. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),{boot,checkOracle,sourceSRI}=require('./verify-chok-qualified-daily.cjs');
const parse5=require(path.join(process.env.AJEW_TEST_DEPENDENCIES||root,'node_modules/parse5/dist/cjs/index.js'));
const fixture=JSON.parse(fs.readFileSync(path.join(root,'scripts/fixtures/chok-lech-friday-reviewed.json'),'utf8')),oracle=JSON.parse(fs.readFileSync(path.join(root,'scripts/chok-qualified-daily-reviewed.json'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x)),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function attr(n,k){const a=(n.attrs||[]).find(a=>a.name===k);return a&&a.value;}
function nodes(n,p,out=[]){if(p(n))out.push(n);for(const c of n.childNodes||[])nodes(c,p,out);return out;}
function text(n){return n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');}
const one=(n,p)=>{const a=nodes(n,p);assert.equal(a.length,1);return a[0];};
function sourceFunction(code,name){const marker='  function '+name+'(';const a=code.indexOf(marker);assert(a>=0);const b=code.indexOf('\n  }',a);assert(b>a);return code.slice(a,b+4);}
(async()=>{
 sourceSRI(root);const main=read('public/chok.js');let rawRequests=0;const {api,libraryAPI,entries}=boot(root),entry=entries.find(e=>e.key===fixture.readingKey);assert(entry);assert.deepEqual(entry,fixture.selectedEntry);
 assert.deepEqual(entries.filter(e=>fixture.priorSelectedKeys.includes(e.key)).map(e=>e.key),fixture.priorSelectedKeys);
 assert.deepEqual(entries.map(e=>e.key).sort(),oracle.readingKeys.slice().sort(),'EXACT_REVIEWED_ENTRY_KEYSET');
 const raw=read('public'+entry.url),packet=JSON.parse(raw);assert.deepEqual(packet,fixture.expectedPacket);const checked=checkOracle(packet,entry,oracle);assert.equal(checked.checked,12);assert.equal(checked.notes,17);
 const sources=new Map(fixture.sourceOwners.map(s=>[s.id,s])),drafts=new Map(fixture.drafts.map(s=>[s.id,s]));
 for(const section of Object.values(packet.sections))for(const u of section.units){
  const a=drafts.get(u.owner);assert(a);assert.equal(u.en,a.englishParts.join('\n\n'));assert.equal(u.explanation.paragraphs.map(p=>p.he).join('\n\n'),a.explanation.he);assert.equal(u.explanation.paragraphs.map(p=>p.en).join('\n\n'),a.explanation.en);
  if(sources.has(u.owner))assert.equal(u.he,sources.get(u.owner).original);else if(u.role==='gemara')assert.equal(u.he,fixture.gemaraSource.gemara.body);else assert.equal(u.he,fixture.gemaraSource.rashi[Number(u.owner.slice(-1))-1].body);
  assert.equal(u.notes.filter(n=>n.role==='meaning-qualification').length,a.notes.length);
  for(let i=0;i<a.notes.length;i++){const n=u.notes[i];assert.equal(n.he,a.notes[i].he);assert.equal(n.en,a.notes[i].en);assert.equal(Array.from(u.he).slice(n.span.start,n.span.end).join(''),a.notes[i].sourceAnchor);}
 }
 const box={window:{ChokQualifiedDailySelected:api,ChokQualifiedDaily:{bind:()=>{}}},document:{},state:{sched:{weeks:{[entry.week]:{days:{[entry.day]:entry.schedule}}}}},fetchJSON:(url,rawMode)=>{assert.equal(rawMode,true);assert.equal(url,entry.url+'?v='+entry.payloadSHA256);rawRequests++;return Promise.resolve(raw);}};
 for(const name of ['TAAMIM','NIKUD']){const m=main.match(new RegExp('var '+name+'\\s*=\\s*([^;]+);'));assert(m);vm.runInNewContext('var '+name+' = '+m[1]+';',box);}
 vm.runInNewContext(['applyWednesdayMode','qualifiedDailyHas','qualifiedDailyReading','qualifiedDailyOr'].map(n=>sourceFunction(main,n)).join('\n'),box);
 let renders=0,unitInstances=0,noteInstances=0;
 for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters'])for(const commentary of [false,true])for(const rashi of [false,true]){
  Object.assign(box.state,{language,mode,commentary,rashi});
  for(const sectionName of ['mishna','talmud']){
   const html=await box.qualifiedDailyOr(entry.week,entry.day,sectionName,entry.schedule,()=>{throw Error('PRESCRIBED_READING_USED_LEGACY_FALLBACK');});const dom=parse5.parseFragment(html);const units=nodes(dom,n=>attr(n,'data-reading-unit')!==undefined);const expected=packet.sections[sectionName].units;assert.deepEqual(units.map(n=>attr(n,'data-reading-unit')),expected.map(u=>u.owner));
   for(const u of expected){const article=one(dom,n=>attr(n,'data-reading-unit')===u.owner);for(const[k,value]of[['original',box.applyWednesdayMode(u.he,mode)],['untouched',u.he],['en',u.en]])assert.equal(text(one(article,n=>n.parentNode===article&&attr(n,'data-daily-field')===k)),value);const exp=one(article,n=>attr(n,'data-daily-field')==='explanation');assert.equal(attr(exp,'hidden')!==undefined,!commentary||language==='original');assert.equal(text(one(exp,n=>attr(n,'data-daily-field')==='he')),u.explanation.paragraphs[0].he);assert.equal(text(one(exp,n=>attr(n,'data-daily-field')==='en')),u.explanation.paragraphs[0].en);unitInstances++;
    for(const note of u.notes){const aside=one(dom,n=>attr(n,'data-daily-note')===note.id);assert.equal(attr(aside,'data-note-owner'),u.owner);assert.equal(text(one(aside,n=>n.tagName==='p'&&attr(n,'lang')==='he')),note.he);assert.equal(text(one(aside,n=>n.tagName==='p'&&attr(n,'lang')==='en')),note.en);for(let p=aside.parentNode;p;p=p.parentNode)assert.notEqual(p.tagName,'details','MANDATORY_NOTE_INSIDE_DISCLOSURE');noteInstances++;}
   }
   if(sectionName==='mishna'){assert.equal(nodes(dom,n=>attr(n,'data-mishna-owner')!==undefined).length,4);for(const pair of entry.sections.mishna.pairs){const parent=one(dom,n=>attr(n,'data-mishna-owner')===pair.mishna);assert.deepEqual(nodes(parent,n=>attr(n,'data-reading-unit')!==undefined).map(n=>attr(n,'data-reading-unit')),[pair.mishna,pair.bartenura]);}}
   else{assert.equal(nodes(dom,n=>attr(n,'data-reading-role')==='prescribed-rashi').length,1);const lic=one(dom,n=>attr(n,'data-daily-note')==='lech-friday-gemara-9b-source-licence');assert(text(lic).includes('https://creativecommons.org/licenses/by-sa/4.0/'));assert(text(lic).includes('oldid=1065061'));assert.equal(expected[0].he,fixture.gemaraSource.gemara.body);assert(!expected[0].he.includes('תנוקת שלא הגיע זמנה לראות'));}
   renders++;
  }
 }
 assert.equal(rawRequests,1,'ONE_VERSIONED_PACKET_FOR_BOTH_SECTIONS');assert.equal(api.has(entry.week,'יום חמישי','talmud'),false);let legacyCalls=0;await box.qualifiedDailyOr(entry.week,'יום חמישי','talmud',{},()=>{legacyCalls++;return Promise.resolve('untouched-adjacent-day');});assert.equal(legacyCalls,1);
 const cases=[['source',p=>{p.sections.mishna.units[0].he+='א';}],['english',p=>{p.sections.mishna.units[0].en+=' altered';}],['explanation',p=>{p.sections.mishna.units[1].explanation.paragraphs[0].en+=' altered';}],['removed-note',p=>{p.sections.talmud.units[0].notes.shift();}],['wrong-commentary-owner',p=>{p.sections.mishna.units[1].owner='foreign-owner';}],['neighboring-gemara',p=>{p.sections.talmud.units[0].he+=' ת"ר תנוקת שלא הגיע זמנה לראות';}],['operator-field',p=>{p.operatorMessage='unapproved';}]];
 let negatives=0,restoredPositives=0;
 for(const [name,mutate]of cases){const bad=copy(packet);mutate(bad);const payload=JSON.stringify(bad),modified=copy(entry);modified.payloadSHA256=sha(payload);const rejected=libraryAPI.create([modified]);await assert.rejects(rejected.load(entry.week,entry.day,entry.schedule,async()=>payload),undefined,name);negatives++;const positive=libraryAPI.create([entry]);const restored=await positive.load(entry.week,entry.day,entry.schedule,async()=>raw);assert.deepEqual(copy(restored),packet);restoredPositives++;}
 const compiler=require(path.join(process.env.AJEW_TEST_DEPENDENCIES||root,'node_modules/@astrojs/compiler'));const transformed=await compiler.transform(read('src/pages/reader/chok.astro'),{filename:'src/pages/reader/chok.astro'});assert.equal(transformed.diagnostics.filter(d=>d.severity===1).length,0);
 console.log(JSON.stringify({pass:true,realRegisteredCallerRenders:renders,completeUnitInstances:unitInstances,mandatoryNoteInstances:noteInstances,versionedPayloadRequests:rawRequests,mishnaPairs:4,exactGemaraExcerpt:true,prescribedRashi:3,checksumValidNegativeCases:negatives,freshSameOwnerPositives:restoredPositives,adjacentDayLegacyConserved:true,actualAstroTransformErrors:0,nativeOrFullInitializerClaim:false}));
})().catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
