/* Portable release check: real selected loader + independent reviewed-field oracle.
 * No private paths, developer cache, network, DOM stubs or publication side effects.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createHash,webcrypto}=require('node:crypto');const {TextEncoder}=require('node:util');
const sha=x=>createHash('sha256').update(x).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
function boot(root){
 const host={crypto:webcrypto},sandbox={window:host,TextEncoder,Uint8Array};vm.createContext(sandbox);
 const library=fs.readFileSync(path.join(root,'public/chok-qualified-daily.js'),'utf8');new vm.Script(library,{filename:'chok-qualified-daily.js'}).runInContext(sandbox);const libraryAPI=host.ChokQualifiedDaily;assert(libraryAPI);
 let entries;host.ChokQualifiedDaily=Object.assign({},libraryAPI,{create(input){assert.equal(entries,undefined);entries=clone(input);return libraryAPI.create(input);}});
 new vm.Script(fs.readFileSync(path.join(root,'public/chok-qualified-daily-classical-selected-v1.js'),'utf8'),{filename:'chok-qualified-daily-classical-selected-v1.js'}).runInContext(sandbox);host.ChokQualifiedDaily=libraryAPI;assert(entries&&entries.length);
 return{api:host.ChokQualifiedDailySelected,libraryAPI,entries};
}
function rejectPaths(value){
 if(typeof value==='string')assert(!/(?:\/root\/|\/mnt\/[a-z]\/|[A-Za-z]:\\|\.local\/share\/)/.test(value),'PRIVATE_PATH_IN_PUBLIC_DATA');
 else if(Array.isArray(value))value.forEach(rejectPaths);
 else if(value&&typeof value==='object')Object.values(value).forEach(rejectPaths);
}
function adoptedNoteAuthority(){return require('./chok-reference-order-conservation.cjs').vayaitzaiFridayNoteAuthority();}
function adoptedOwnerCheck(payload,e){
 const rows=adoptedNoteAuthority().adoptedOwners.filter(r=>r.key===e.key);
 for(const r of rows){const u=payload.sections.mishna.units.find(u=>u.owner===r.owner);assert(u,'ADOPTED_OWNER_MISSING');assert.equal(sha(u.he),r.originalSHA256,'REVIEWED_ORIGINAL_MISMATCH');assert.equal(sha(u.en),r.englishSHA256,'REVIEWED_ENGLISH_MISMATCH');assert.equal(sha(require('./chok-today-classical-admission.cjs').canonical(u.notes)),r.afterNotesSHA256,'REVIEWED_NOTE_MISMATCH:ADOPTED_NOTE_AUTHORITY');assert.deepEqual(u.notes.slice(-r.notes.length),r.notes,'ADOPTED_COMPLETE_NOTES');}
}
function adoptNoteFixture(fixture){
 const out=clone(fixture),a=adoptedNoteAuthority();
 for(const f of out.readings){const bound=a.payloads.find(p=>p.key===f.key);if(!bound)continue;assert.equal(f.payloadSHA256,bound.beforeSHA256,'HISTORICAL_FIXTURE_PAYLOAD');f.payloadSHA256=bound.afterSHA256;
  for(const u of f.owners){const r=a.adoptedOwners.find(r=>r.key===f.key&&r.owner===u.owner);if(!r)continue;assert.equal(sha(require('./chok-today-classical-admission.cjs').canonical(u.notes)),r.beforeNotesSHA256,'HISTORICAL_FIXTURE_NOTES');u.notes.push(...clone(r.notes));if(u.adoptedFieldBinding){const b=u.adoptedFieldBinding;b.requiredNotes.push(...r.notes.map(n=>({id:n.id,heSHA256:sha(n.he),enSHA256:sha(n.en)})));}}
 }
 return out;
}
function checkOracle(payload,entry,oracle){
 adoptedOwnerCheck(payload,entry);
 const approved=new Map(oracle.units.filter(u=>u.readingId===entry.key).map(u=>[u.owner,u]));assert(approved.size);
 assert.deepEqual(Object.keys(payload.sections).sort(),Object.keys(entry.sections).sort());let checked=0,notes=0;
 for(const[name,section]of Object.entries(payload.sections)){
  const chapterApproved=oracle.sectionSupplements&&oracle.sectionSupplements[entry.key]&&oracle.sectionSupplements[entry.key][name];
  for(const k of ['introduction','notes']){
   const approvedPresent=!!chapterApproved&&Object.prototype.hasOwnProperty.call(chapterApproved,k),descriptorPresent=Object.prototype.hasOwnProperty.call(entry.sections[name],k+'SHA256'),payloadPresent=Object.prototype.hasOwnProperty.call(section,k);
   assert.equal(descriptorPresent,approvedPresent,'REVIEWED_CHAPTER_PRESENCE:descriptor:'+k);assert.equal(payloadPresent,approvedPresent,'REVIEWED_CHAPTER_PRESENCE:payload:'+k);
   if(approvedPresent){assert.deepEqual(section[k],chapterApproved[k],'REVIEWED_CHAPTER_FULL_FIELD:'+k);assert.equal(entry.sections[name][k+'SHA256'],chapterApproved[k+'SHA256'],'REVIEWED_CHAPTER_DESCRIPTOR:'+k);assert.equal(sha(require('./chok-today-classical-admission.cjs').canonical(section[k])),chapterApproved[k+'SHA256'],'REVIEWED_CHAPTER_DIGEST:'+k);}
  }
  const seven=oracle.sevenSourceSelected&&oracle.sevenSourceSelected[entry.key]&&oracle.sevenSourceSelected[entry.key][name];
  if(seven){
   assert(['halacha','mussar'].includes(name),'SEVEN_SECTION_ROLE');
   if(seven.title)assert.deepEqual(entry.sections[name].title,seven.title,'SELECTED_SECTION_TITLE');
   assert.deepEqual(section.units.map(u=>u.owner),seven.owners,'SEVEN_COMPLETE_OWNER_ORDER');
   assert.deepEqual(section.reference,seven.reference,'SEVEN_SELECTED_REFERENCE');assert.deepEqual(section.extent,seven.extent,'SEVEN_SELECTED_EXTENT');
   for(const unit of entry.sections[name].units)assert.equal(unit.admission.sourceUse.evidenceSHA256,seven.sourceUseEvidenceSHA256[unit.owner],'SEVEN_SELECTED_SOURCE_USE');
  }else if((name==='halacha'||name==='mussar')&&oracle.todayClassical&&entry.key===oracle.todayClassical.key){ const selected=oracle.todayClassical.sections[name];assert(selected);assert.deepEqual(section.reference,selected.reference);assert.deepEqual(section.extent,selected.extent);assert.deepEqual(section.units.map(u=>u.owner),selected.owners);
  }else if((name==='halacha'||name==='mussar')&&oracle.classicalSelected&&oracle.classicalSelected[entry.key]){
   const native=oracle.classicalSelected[entry.key][name];assert(native);assert.equal(section.units.length,1);assert.equal(section.units[0].owner,native.owner);assert.deepEqual(section.reference,native.reference);assert.deepEqual(section.extent,native.extent);assert.equal(entry.sections[name].units[0].admission.sourceUse.evidenceSHA256,native.sourceUseEvidenceSHA256);
  }else if(name==='mussar'){
   const owners={'וירא|יום רביעי':'וירא|יום רביעי|mussar|Charedim67b-selected','וירא|יום חמישי':'וירא|יום חמישי|mussar|Charedim70a-selected','תולדות|יום רביעי':'תולדות|יום רביעי|mussar'};
   const native=oracle.nativeMussar&&oracle.nativeMussar[entry.key];assert(native&&native.owner===owners[entry.key],'UNQUALIFIED_NATIVE_MUSSAR');assert.equal(section.units.length,1);assert.equal(section.units[0].owner,native.owner);assert.deepEqual(section.reference,native.reference);assert.deepEqual(section.extent,native.extent);assert.equal(entry.sections.mussar.units[0].admission.sourceUse.evidenceSHA256,native.sourceUseEvidenceSHA256);
  }else if(name==='halacha'){
   const exactOwners={'וירא|יום רביעי':'וירא|יום רביעי|halacha|CM227-selected','וירא|יום חמישי':'וירא|יום חמישי|halacha|CM348-selected','תולדות|יום רביעי':'תולדות|יום רביעי|halacha|RambamDeot-selected'};
   const native=oracle.nativeHalacha&&oracle.nativeHalacha[entry.key];assert(native&&native.owner===exactOwners[entry.key],'UNQUALIFIED_NATIVE_HALACHA');assert.equal(section.units.length,1);assert.equal(section.units[0].owner,native.owner);assert.deepEqual(section.reference,native.reference);assert.deepEqual(section.extent,native.extent);assert.equal(entry.sections.halacha.units[0].admission.sourceUse.evidenceSHA256,native.sourceUseEvidenceSHA256);
  }else{
   assert(['mishna','talmud','zohar'].includes(name),'UNWIRED_SECTION');assert.deepEqual(section.reference,entry.schedule[name==='talmud'?'gemara':name]);
   assert.deepEqual(Object.keys(section.extent).sort(),['first','last'],'PUBLIC_EXTENT_KEYS');assert(Number.isInteger(section.extent.first)&&Number.isInteger(section.extent.last));
  }
  if(name==='mishna'){
   const ordinals=section.units.filter(u=>u.role==='mishna').map(u=>{const m=/-(\d+)-(\d+)$/.exec(u.owner);assert(m);assert.equal(Number(m[1]),section.reference.perek);return Number(m[2]);});assert.deepEqual(ordinals,Array.from({length:section.extent.last-section.extent.first+1},(_,i)=>section.extent.first+i),'REVIEWED_EXTENT_ORDINALS');
  }else if(name==='talmud'){
   assert.equal(section.extent.first,1);assert.equal(section.extent.last,section.units.filter(u=>u.role==='gemara').length,'REVIEWED_GEMARA_EXTENT');
   assert.deepEqual(section.units.filter(u=>u.role==='prescribed-rashi').map(u=>u.owner),entry.sections[name].prescribedRashi,'REVIEWED_RASHI_ORDER');
  }
  for(const u of section.units){
   const a=approved.get(u.owner);assert(a,'UNREVIEWED_OWNER');assert.equal(u.role,a.role);assert.equal(u.status,'complete');
   if(a.currentAttachments){
    assert.deepEqual(u.notes.map(n=>n.id),a.currentAttachments.map(n=>n.id),'CURRENT_ATTACHMENT_ORDER');
    for(const n of a.currentAttachments){
     const he=Array.from(u.he).slice(...n.sourceCodepointSpan).join(''),en=Array.from(u.en).slice(...n.englishCodepointSpan).join('');
     assert.equal(he,n.sourceAnchor,'CURRENT_SOURCE_ANCHOR');assert.equal(sha(he),n.sourceAnchorUTF8SHA256,'CURRENT_SOURCE_ANCHOR_HASH');
     assert.equal(en,n.englishAnchor,'CURRENT_ENGLISH_ANCHOR');assert.equal(sha(en),n.englishAnchorUTF8SHA256,'CURRENT_ENGLISH_ANCHOR_HASH');assert.equal(sha(u.en),n.englishOwnerSHA256,'CURRENT_ENGLISH_OWNER');
     const note=u.notes.find(x=>x.id===n.id);assert.deepEqual([note.span.start,note.span.end],n.sourceCodepointSpan,'CURRENT_NOTE_SOURCE_ATTACHMENT');
    }
   }
   const plan=entry.sections[name].units.find(x=>x.owner===u.owner);assert(plan);
   for(const k of ['introduction','learningAid','segments']){
    const approvedPresent=Object.prototype.hasOwnProperty.call(a,k+'SHA256'),descriptorPresent=Object.prototype.hasOwnProperty.call(plan,k+'SHA256'),payloadPresent=Object.prototype.hasOwnProperty.call(u,k);
    assert.equal(descriptorPresent,approvedPresent,'REVIEWED_SUPPLEMENT_PRESENCE:descriptor:'+u.owner+':'+k);assert.equal(payloadPresent,approvedPresent,'REVIEWED_SUPPLEMENT_PRESENCE:payload:'+u.owner+':'+k);
    if(approvedPresent){assert.equal(plan[k+'SHA256'],a[k+'SHA256'],'REVIEWED_SUPPLEMENT_DESCRIPTOR_MISMATCH:'+u.owner+':'+k);assert.equal(sha(require('./chok-today-classical-admission.cjs').canonical(u[k])),a[k+'SHA256'],'REVIEWED_SUPPLEMENT_MISMATCH:'+u.owner+':'+k);}
   }
   assert.equal(sha(u.he),a.originalSHA256,'REVIEWED_ORIGINAL_MISMATCH:'+u.owner);assert.equal(sha(u.en),a.englishSHA256,'REVIEWED_ENGLISH_MISMATCH:'+u.owner);
   if(a.explanationSHA256)assert.equal(sha(require('./chok-today-classical-admission.cjs').canonical(u.explanation)),a.explanationSHA256,'REVIEWED_WHOLE_EXPLANATION_MISMATCH:'+u.owner);
   assert.equal(sha(u.explanation.paragraphs.map(p=>p.he).join('\n\n')),a.explanationHeSHA256,'REVIEWED_HE_EXPLANATION_MISMATCH:'+u.owner);
   assert.equal(sha(u.explanation.paragraphs.map(p=>p.en).join('\n\n')),a.explanationEnSHA256,'REVIEWED_EN_EXPLANATION_MISMATCH:'+u.owner);
   assert.deepEqual(u.notes.map(n=>({id:n.id,owner:n.owner,role:n.role,placement:n.placement,heSHA256:sha(n.he),enSHA256:sha(n.en),sourceTextSHA256:n.sourceTextSHA256,span:n.span})),a.notes,'REVIEWED_NOTE_MISMATCH:'+u.owner);
   assert.equal(plan.edition,a.edition);assert.equal(plan.provenanceSHA256,a.provenanceSHA256);
   if(name==='halacha'||name==='mussar'){
    assert(a.nativeAdmission,'NATIVE_FIELD_AUTHORITY_REQUIRED');assert.deepEqual(plan.admission,a.nativeAdmission.unit);assert.deepEqual(entry.sections[name].admission,a.nativeAdmission.section);assert.deepEqual(entry.admission,a.nativeAdmission.entry);
    for(const g of[plan.admission,entry.sections[name].admission,entry.admission])for(const decision of Object.values(g)){assert.equal(decision.decision,'accepted');assert(/^[a-f0-9]{64}$/.test(decision.evidenceSHA256));}
   }else for(const g of[plan.admission,entry.sections[name].admission,entry.admission])for(const decision of Object.values(g)){assert.equal(decision.decision,'accepted');assert.equal(decision.evidenceSHA256,a.authoritySHA256||oracle.authoritySHA256);}
   approved.delete(u.owner);checked++;notes+=u.notes.length;
  }
 }
 assert.equal(approved.size,0,'MISSING_REVIEWED_OWNER');rejectPaths(payload);rejectPaths(entry);return{checked,notes};
}
function sourceSRI(root){
 const astro=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8');let previous=-1;
 for(const name of['chok-qualified-daily.js','chok-qualified-daily-classical-selected-v1.js','chok.js']){
  const b=fs.readFileSync(path.join(root,'public',name)),url='/'+name+'?v='+sha(b),pos=astro.indexOf('src="'+url+'"');assert(pos>previous,'SCRIPT_ORDER_OR_VERSION:'+name);previous=pos;
  const begin=astro.lastIndexOf('<script',pos),end=astro.indexOf('</script>',pos),tag=astro.slice(begin,end);const algorithm=name==='chok.js'?'sha384':'sha256';assert(tag.includes('integrity="'+algorithm+'-'+createHash(algorithm).update(b).digest('base64')+'"'),'SCRIPT_SRI:'+name);assert(tag.includes('defer'));new vm.Script(b.toString('utf8'),{filename:name});
 }
 assert(astro.includes('.ck-qualified-daily')&&astro.includes('--ck-size')&&astro.includes('--ck-font-he')&&astro.includes('--ck-font-en'));return true;
}
// Independent QA parser only; the browser renderer has no HTML-parser dependency.
const parse5=require('parse5');
function attr(n,k){return(n.attrs||[]).find(a=>a.name===k)?.value;}
function walk(n,match,out=[]){if(match(n))out.push(n);for(const c of n.childNodes||[])walk(c,match,out);return out;}
function nodeText(n){return n.nodeName==='#text'?n.value:(n.childNodes||[]).map(nodeText).join('');}
function expectedSource(value,qualified){
 const literal={text:value,bold:0};
 if(!qualified||!value.includes('<b>'))return literal;
 // Preserve literal entities exactly once, as the renderer's text escaping does.
 // Parser locations must account for EVERY exact source wrapper. This rejects
 // parser-repaired, unknown, attribute-bearing and unbalanced markup independently
 // of the production renderer's token/depth scanner.
 if(/[<>]/.test(value.replace(/<\/?b>/g,'')))return literal;
 const encoded=value.replace(/&/g,'&amp;'),root=parse5.parseFragment(encoded,{sourceCodeLocationInfo:true});
 const nodes=walk(root,n=>n!==root&&n.nodeName!=='#text');
 for(const n of nodes){
  const loc=n.sourceCodeLocation;
  if(n.tagName!=='b'||(n.attrs||[]).length||!loc?.startTag||!loc.endTag)return literal;
  if(encoded.slice(loc.startTag.startOffset,loc.startTag.endOffset)!=='<b>'||encoded.slice(loc.endTag.startOffset,loc.endTag.endOffset)!=='</b>')return literal;
 }
 if(nodes.length!==(value.match(/<b>/g)||[]).length||nodes.length!==(value.match(/<\/b>/g)||[]).length)return literal;
 return{text:nodeText(root),bold:nodes.length};
}
function htmlSourceFields(html){
 const root=parse5.parseFragment(html),units=walk(root,n=>attr(n,'data-reading-unit')!==undefined),result=new Map();
 for(const unit of units){
  const owner=attr(unit,'data-reading-unit');assert(!result.has(owner),'DUPLICATE_VISIBLE_OWNER:'+owner);const fields={};
  for(const kind of ['original','untouched','en']){
   // Direct children exclude explanation translations and prevent alias matches.
   const a=(unit.childNodes||[]).filter(n=>attr(n,'data-daily-field')===kind);assert.equal(a.length,1,'SOURCE_FIELD:'+owner+':'+kind);
   const elements=walk(a[0],n=>n!==a[0]&&n.nodeName!=='#text');
   fields[kind]={text:nodeText(a[0]),bold:elements.filter(n=>n.tagName==='b').length,unsafe:elements.filter(n=>n.tagName!=='b'||(n.attrs||[]).length!==0).length,hidden:attr(a[0],'hidden')!==undefined};
  }
  result.set(owner,fields);
 }
 return result;
}
function assertSourceField(actual,expected,label,hidden){
 assert.equal(actual.text,expected.text,'VISIBLE_TEXT:'+label);assert.equal(actual.bold,expected.bold,'BOLD_COUNT:'+label);assert.equal(actual.unsafe,0,'UNSAFE_ELEMENT_OR_ATTRIBUTE:'+label);assert.equal(actual.hidden,hidden,'FIELD_LANGUAGE:'+label);
}
function reviewedSourceFields(payload,section,html){
 const fields=htmlSourceFields(html),units=Array.from(payload.sections[section].units);
 assert.deepEqual([...fields.keys()],units.filter(u=>u.status!=='source-empty').map(u=>u.owner),'VISIBLE_OWNER_ORDER');
 let sourceVisibleFields=0,bartenuraOriginalFields=0,boldOriginalFields=0,plainBartenuraOriginalFields=0;
 for(const u of units){
  if(u.status==='source-empty'){assert(!fields.has(u.owner));continue;}
  const qualified=section==='mishna'&&u.role==='bartenura',expected=expectedSource(u.he,qualified),actual=fields.get(u.owner);assert(actual,'MISSING_VISIBLE_OWNER:'+u.owner);
  for(const kind of ['original','untouched']){
   assertSourceField(actual[kind],expected,u.owner+':'+kind,kind==='untouched');sourceVisibleFields++;
   if(qualified){bartenuraOriginalFields++;if(expected.bold)boldOriginalFields++;else plainBartenuraOriginalFields++;}
  }
  assertSourceField(actual.en,{text:u.en,bold:0},u.owner+':en',false);sourceVisibleFields++;
  if(Object.prototype.hasOwnProperty.call(u,'introduction')||Object.prototype.hasOwnProperty.call(u,'learningAid')){
   const root=parse5.parseFragment(html),articles=walk(root,n=>attr(n,'data-reading-unit')===u.owner);assert.equal(articles.length,1,'RICH_VISIBLE_OWNER');const article=articles[0];
   for(const[k,role]of[['introduction','introduction'],['learningAid','learning-aid']]){
    if(!Object.prototype.hasOwnProperty.call(u,k))continue;
    const wrappers=(article.childNodes||[]).filter(n=>attr(n,'data-daily-role')===role);assert.equal(wrappers.length,1,'DISTINCT_PRESENTATION_ROLE:'+role);
    for(const lang of ['he','en']){const a=(wrappers[0].childNodes||[]).filter(n=>attr(n,'data-daily-field')===lang);assert.equal(a.length,1);assert.equal(nodeText(a[0]),u[k][lang],'FULL_RICH_SCALAR:'+k+':'+lang);}
   }
   const explanation=(article.childNodes||[]).filter(n=>attr(n,'data-daily-field')==='explanation');assert.equal(explanation.length,1);
   const summary=(explanation[0].childNodes||[]).filter(n=>n.tagName==='summary');assert.equal(summary.length,1);assert.equal(nodeText(summary[0]),u.explanation.title.he+' · '+u.explanation.title.en,'WHOLE_EXPLANATION_TITLE');
   for(const lang of ['he','en'])assert.deepEqual((explanation[0].childNodes||[]).filter(n=>attr(n,'data-daily-field')===lang).map(nodeText),Array.from(u.explanation.paragraphs,p=>p[lang]),'WHOLE_EXPLANATION_PARAGRAPHS');
   for(const note of u.notes){const asides=walk(root,n=>attr(n,'data-daily-note')===note.id);assert.equal(asides.length,1);assert.equal(attr(asides[0],'data-note-owner'),u.owner);for(let n=asides[0];n;n=n.parentNode){assert.notEqual(n.tagName,'details','REQUIRED_NOTE_DISCLOSURE');assert.equal(attr(n,'hidden'),undefined,'REQUIRED_NOTE_HIDDEN');}for(const lang of ['he','en']){const p=walk(asides[0],n=>n.tagName==='p'&&attr(n,'lang')===lang);assert.equal(p.length,1);assert.equal(nodeText(p[0]),note[lang]);}}
  }

 }
 return{sourceVisibleFields,bartenuraOriginalFields,boldOriginalFields,plainBartenuraOriginalFields};
}
async function boldPresentationControls(api,entry,payload,loader,scheduled){
 assert(payload.sections.mishna.units.some(u=>u.role==='bartenura'&&u.status==='complete'));
 assert(payload.sections.mishna.units.some(u=>u.role==='mishna'&&u.status==='complete'));
 const cases=[
  {input:'טקסט רגיל',visible:'טקסט רגיל',bold:0},
  {input:'<b>כותרת</b>',visible:'כותרת',bold:1},
  {input:'<b>א<b>ב</b>ג</b>',visible:'אבג',bold:2},
  {input:'פתיחה\n<b>כותרת</b> זנב\n<b>סוף</b>',visible:'פתיחה\nכותרת זנב\nסוף',bold:2},
  {input:'<b></b>זנב',visible:'זנב',bold:1},
  {input:'<b>לא סגור',visible:'<b>לא סגור',bold:0},
  {input:'סיום</b>',visible:'סיום</b>',bold:0},
  {input:'</b><b>א</b>',visible:'</b><b>א</b>',bold:0},
  {input:'<b><b>א</b>',visible:'<b><b>א</b>',bold:0},
  {input:'<b onclick="alert(1)">שלום</b>',visible:'<b onclick="alert(1)">שלום</b>',bold:0},
  {input:'<b>א</b><img src=x onerror=alert(1)><script>bad()</script>',visible:'<b>א</b><img src=x onerror=alert(1)><script>bad()</script>',bold:0},
  {input:'<b>א</b><i>ב</i>',visible:'<b>א</b><i>ב</i>',bold:0},
  {input:'<B>א</B>',visible:'<B>א</B>',bold:0},
  {input:'<b >א</b>',visible:'<b >א</b>',bold:0},
  {input:'<b/>א',visible:'<b/>א',bold:0},
  {input:'<b>א</b><!--הערה-->',visible:'<b>א</b><!--הערה-->',bold:0},
  {input:'<b>א</b><',visible:'<b>א</b><',bold:0},
  {input:'א < ב > ג',visible:'א < ב > ג',bold:0},
  {input:'&lt;b&gt;מילולי&lt;/b&gt;',visible:'&lt;b&gt;מילולי&lt;/b&gt;',bold:0},
  {input:'<b>&amp; &#1488; &lt;b&gt;</b> &amp;amp;',visible:'&amp; &#1488; &lt;b&gt; &amp;amp;',bold:1}
 ];
 const languages=['he','en','both','original'],modes=['full','nikud','taamim','letters'];let checks=0;
 for(const [i,c]of cases.entries()){
  assert.deepEqual(expectedSource(c.input,true),{text:c.visible,bold:c.bold},'INDEPENDENT_ORACLE_CONTROL');
  const language=languages[i%languages.length],mode=modes[Math.floor(i/languages.length)%modes.length];let transformed=0;
  const html=await api.reading(entry.week,entry.day,'mishna',{language,mode,commentary:i%2===0,optionalRashi:false,transform:(s,actualMode)=>{assert.equal(actualMode,mode,'MODE_FORWARDING');transformed++;return c.input;}},loader,scheduled);
  const fields=htmlSourceFields(html),units=Array.from(payload.sections.mishna.units).filter(u=>u.status!=='source-empty');
  assert.equal(transformed,units.length);assert.deepEqual([...fields.keys()],units.map(u=>u.owner),'CONTROL_OWNER_ORDER');
  for(const u of units){
   const qualified=u.role==='bartenura',actual=fields.get(u.owner),label=entry.key+':'+u.owner;
   assertSourceField(actual.original,qualified?{text:c.visible,bold:c.bold}:{text:c.input,bold:0},label+':transformed',language==='original');
   assertSourceField(actual.untouched,expectedSource(u.he,qualified),label+':untouched',language!=='original');
   assertSourceField(actual.en,{text:u.en,bold:0},label+':en',language!=='en'&&language!=='both');
  }
  checks++;
 }
 // Positive restoration follows every negative batch through the real selected API.
 const html=await api.reading(entry.week,entry.day,'mishna',{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:s=>s},loader,scheduled);
 reviewedSourceFields(payload,'mishna',html);return checks;
}
async function adoptedNoteControls(api,libraryAPI,e,payload,oracle,loader,scheduled){
 const rows=adoptedNoteAuthority().adoptedOwners.filter(r=>r.key===e.key);if(!rows.length)return 0;let cases=0;
 for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters'])for(const commentary of [false,true]){
  const html=await api.reading(e.week,e.day,'mishna',{language,mode,commentary,optionalRashi:false,transform:s=>s},loader,scheduled),root=parse5.parseFragment(html);
  for(const r of rows)for(const n of r.notes){const all=walk(root,x=>attr(x,'data-daily-note')===n.id);assert.equal(all.length,1,'ADOPTED_EXACT_CARDINALITY');const node=all[0];assert.equal(attr(node,'data-note-owner'),r.owner);assert.equal(attr(node,'data-field-role'),n.role);for(const lang of ['he','en']){const p=(node.childNodes||[]).filter(x=>attr(x,'lang')===lang);assert.equal(p.length,1);assert.equal(nodeText(p[0]),n[lang],'ADOPTED_COMPLETE_LANGUAGE');}for(let p=node;p;p=p.parentNode){assert.equal(attr(p,'hidden'),undefined);assert.notEqual(p.tagName,'details');assert(!/display\s*:\s*none|visibility\s*:\s*hidden/.test(attr(p,'style')||''));}}
  cases++;
 }
 for(const r of rows){const index=payload.sections.mishna.units.findIndex(u=>u.owner===r.owner);assert(index>=0);
  for(const kind of ['missing','extra','he','en','reorder']){
   if(kind==='reorder'&&r.notes.length<2)continue;
   const p=clone(payload),desc=clone(e),u=p.sections.mishna.units[index];
   if(kind==='missing')u.notes.pop();if(kind==='extra')u.notes.push(clone(r.notes[0]));if(kind==='he')u.notes[u.notes.length-1].he+='א';if(kind==='en')u.notes[u.notes.length-1].en+='x';if(kind==='reorder')u.notes.reverse();
   desc.sections.mishna.units[index].notesSHA256=sha(libraryAPI.canonical(u.notes));desc.payloadSHA256=sha(JSON.stringify(p));assert.throws(()=>adoptedOwnerCheck(p,desc),/REVIEWED_NOTE_MISMATCH/);
   // Even a coordinated mutation of runtime, descriptor AND mutable oracle fails.
   const fake=clone(oracle),o=fake.units.find(o=>o.readingId===e.key&&o.owner===r.owner);o.notes=u.notes.map(n=>({id:n.id,owner:n.owner,role:n.role,placement:n.placement,heSHA256:sha(n.he),enSHA256:sha(n.en),sourceTextSHA256:n.sourceTextSHA256,span:n.span}));assert.throws(()=>checkOracle(p,desc,fake),/REVIEWED_NOTE_MISMATCH/);
   if(kind==='he'||kind==='en'||kind==='missing'){const raw=JSON.stringify(p),accepted=await libraryAPI.create([desc]).load(e.week,e.day,scheduled,async()=>raw);assert.deepEqual(clone(accepted),p,'GENUINE_COORDINATED_RUNTIME_ACCEPTANCE');}
   cases++;
  }
  for(const mutate of [n=>n.owner='foreign-owner',n=>n.span.end=0,n=>n.sourceTextSHA256='0'.repeat(64),n=>n.projectionProof='private-workflow']){
   const p=clone(payload),desc=clone(e);mutate(p.sections.mishna.units[index].notes.slice(-1)[0]);desc.sections.mishna.units[index].notesSHA256=sha(libraryAPI.canonical(p.sections.mishna.units[index].notes));const raw=JSON.stringify(p);desc.payloadSHA256=sha(raw);await assert.rejects(libraryAPI.create([desc]).load(e.week,e.day,scheduled,async()=>raw));cases++;
  }
  adoptedOwnerCheck(clone(payload),e);checkOracle(clone(payload),e,oracle);
 }
 return cases;
}
async function selectedFridayNoteControls(api,libraryAPI,e,payload,oracle,loader,scheduled){
 if(e.key!=='ויצא|יום שישי')return 0;
 const owner='mishna-mikvaot-7-1',u=payload.sections.mishna.units.find(x=>x.owner===owner);assert(u);assert.equal(u.notes.length,1);
 let count=0;
 for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters'])for(const commentary of [false,true]){
  const html=await api.reading(e.week,e.day,'mishna',{language,mode,commentary,optionalRashi:false,transform:s=>s},loader,scheduled),root=parse5.parseFragment(html);
  const notes=walk(root,n=>attr(n,'data-daily-note')===u.notes[0].id);assert.equal(notes.length,1,'FRIDAY_NOTE_EXACT_CARDINALITY');const node=notes[0];
  assert.equal(attr(node,'data-note-owner'),owner);assert.equal(attr(node,'data-field-role'),'meaning-qualification');
  for(const lang of ['he','en']){const p=(node.childNodes||[]).filter(n=>attr(n,'lang')===lang);assert.equal(p.length,1);assert.equal(nodeText(p[0]),u.notes[0][lang],'FRIDAY_COMPLETE_'+lang);}
  for(let p=node;p;p=p.parentNode){assert.equal(attr(p,'hidden'),undefined,'FRIDAY_MANDATORY_HIDDEN_ANCESTOR');assert.notEqual(p.tagName,'details','FRIDAY_MANDATORY_OPTIONAL_ANCESTOR');}
  count++;
 }
 // Coordinated payload/descriptor changes cannot update the independent adopted oracle.
 const canonical=x=>x===null||typeof x!=='object'?JSON.stringify(x):Array.isArray(x)?'['+x.map(canonical).join(',')+']':'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
 for(const mutation of [p=>p.sections.mishna.units[0].notes=[],p=>p.sections.mishna.units[0].notes[0].he+='א',p=>p.sections.mishna.units[0].notes[0].en+='x']){
  const p=clone(payload),d=clone(e);mutation(p);d.sections.mishna.units[0].notesSHA256=sha(canonical(p.sections.mishna.units[0].notes));d.payloadSHA256=sha(JSON.stringify(p));assert.throws(()=>checkOracle(p,d,oracle),/REVIEWED_NOTE_MISMATCH/);
 }
 for(const mutation of [n=>n.owner='foreign-owner',n=>n.span.end=0,n=>n.sourceTextSHA256='0'.repeat(64),n=>n.projectionProof='private-workflow']){
  const p=clone(payload),d=clone(e);mutation(p.sections.mishna.units[0].notes[0]);d.sections.mishna.units[0].notesSHA256=sha(canonical(p.sections.mishna.units[0].notes));const raw=JSON.stringify(p);d.payloadSHA256=sha(raw);await assert.rejects(libraryAPI.create([d]).load(e.week,e.day,scheduled,async()=>raw));
 }
 checkOracle(clone(payload),e,oracle);return count;
}
async function supplementOracleControls(root,libraryAPI,e,payload,oracle,scheduled,selectedSection='mussar'){
 const rich=e.key==='תולדות|יום רביעי',old=e.key==='ויצא|יום שני';if(!rich&&!old)return[];
 const section=rich?selectedSection:'mishna',owner=rich?(section==='halacha'?'תולדות|יום רביעי|halacha|RambamDeot-selected':'תולדות|יום רביעי|mussar'):'mishna-shabbat-7-1';
 const index=payload.sections[section].units.findIndex(u=>u.owner===owner);assert(index>=0,'SUPPLEMENT_CONTROL_REAL_OWNER');
 const approved=oracle.units.find(u=>u.readingId===e.key&&u.owner===owner);assert(approved,'SUPPLEMENT_CONTROL_INDEPENDENT_OWNER');
 const originalRaw=fs.readFileSync(path.join(root,'public','.'+e.url),'utf8');assert.equal(sha(originalRaw),e.payloadSHA256,'SUPPLEMENT_RESTORED_ORIGINAL_PACKET_PIN');assert.deepEqual(JSON.parse(originalRaw),clone(payload));
 const records=[];
 async function restored(label){
  const raw=originalRaw,d=clone(e);
  const accepted=await libraryAPI.create([d]).load(e.week,e.day,scheduled,async url=>{assert.equal(url,d.url+'?v='+d.payloadSHA256);return raw;});
  assert.deepEqual(clone(accepted),clone(payload),'SUPPLEMENT_RESTORED_LIBRARY:'+label);checkOracle(clone(accepted),e,oracle);
 }
 async function control(label,mutate,libraryAccepts,oraclePattern){
  const p=clone(payload),d=clone(e),u=p.sections[section].units[index],plan=d.sections[section].units[index];mutate(u,plan);
  assert(JSON.stringify(p)!==JSON.stringify(payload)||JSON.stringify(d)!==JSON.stringify(e),'SUPPLEMENT_GENUINE_MUTATION:'+label);
  const raw=JSON.stringify(p);d.payloadSHA256=sha(raw);assert.equal(sha(raw),d.payloadSHA256,'SUPPLEMENT_CHECKSUM_VALID');
  const load=async()=>libraryAPI.create([d]).load(e.week,e.day,scheduled,async url=>{assert.equal(url,d.url+'?v='+d.payloadSHA256);return raw;});
  if(libraryAccepts)assert.deepEqual(clone(await load()),p,'SUPPLEMENT_COORDINATED_LIBRARY_ACCEPTANCE:'+label);else await assert.rejects(load,'SUPPLEMENT_LIBRARY_REJECTION:'+label);
  if(oraclePattern)assert.throws(()=>checkOracle(p,d,oracle),oraclePattern,'SUPPLEMENT_INDEPENDENT_ORACLE_REJECTION:'+label);
  records.push({key:e.key,owner,label,checksumValid:true,library:libraryAccepts?'ACCEPTED':'REJECTED',independentOracle:oraclePattern?'REJECTED':'NOT_ASSERTED_LIBRARY_SCHEMA_CONTROL'});
  await restored(label);
 }
 for(const k of ['introduction','learningAid']){
  assert.equal(Object.prototype.hasOwnProperty.call(approved,k+'SHA256'),rich,'SUPPLEMENT_CONTROL_APPROVAL_PRESENCE');
  if(rich){
   await control(k+':missing-required-pair',u=>{delete u[k];},false,/REVIEWED_SUPPLEMENT_PRESENCE/);
   await control(k+':coordinated-required-removal',(u,p)=>{delete u[k];delete p[k+'SHA256'];},true,/REVIEWED_SUPPLEMENT_PRESENCE/);
   await control(k+':changed-pair-unchanged-digest',u=>{u[k].en+='x';},false,/REVIEWED_SUPPLEMENT_MISMATCH/);
   await control(k+':wrong-descriptor-digest',(u,p)=>{p[k+'SHA256']='0'.repeat(64);},false,/REVIEWED_SUPPLEMENT_DESCRIPTOR_MISMATCH/);
   await control(k+':unknown-pair-key',u=>{u[k].unexpected='extra';},false,/REVIEWED_SUPPLEMENT_MISMATCH/);
  }else{
   await control(k+':unapproved-payload-only',u=>{u[k]={he:u.he,en:u.en};},false,/REVIEWED_SUPPLEMENT_PRESENCE/);
   await control(k+':coordinated-unapproved-real-old-owner',(u,p)=>{u[k]={he:u.he,en:u.en};p[k+'SHA256']=sha(libraryAPI.canonical(u[k]));},true,/REVIEWED_SUPPLEMENT_PRESENCE/);
  }
 }
 if(rich)await control('unknown-supplement-key',u=>{u.unexpectedSupplement=clone(u.introduction);},false,null);
 await restored('final');return records;
}
// Registered source-caller matrix, NOT initialized Main, whole-page or browser proof.
async function toldosWednesdayMussarCallerMatrix(root,libraryAPI,entries,e,payload,oracle){
 if(e.key!=='תולדות|יום רביעי')return 0;
 const originalMain=fs.readFileSync(path.join(root,'public/chok.js'),'utf8'),astro=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8');
 assert(originalMain.includes("return qualifiedDailyOr(wk,dayE,'mussar',d,function()"),'REGISTERED_MUSSAR_CALLER');sourceSRI(root);
 function originalFunction(name){const marker='  function '+name+'(',a=originalMain.indexOf(marker);assert(a>=0);assert.equal(originalMain.indexOf(marker,a+1),-1);const b=originalMain.indexOf('\n  }',a);assert(b>a);return originalMain.slice(a,b+4);}
 function choices(id){const select=astro.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)</select>'));assert(select);return Array.from(select[1].matchAll(/<option value="([^"]+)"/g),m=>m[1]);}
 const languages=choices('ck-language'),modes=choices('ck-mode');assert.deepEqual(languages.slice().sort(),['both','en','he','original']);assert.deepEqual(modes.slice().sort(),['full','letters','nikud','taamim']);
 const {sandbox,documentFor}=require('./qualified-earlier-parsha-test-dom.cjs'),document=documentFor('<html><body></body></html>'),requests=[];
 const raw=fs.readFileSync(path.join(root,'public','.'+e.url),'utf8');assert.equal(sha(raw),e.payloadSHA256,'REGISTERED_CALLER_PACKET_PIN');assert.deepEqual(JSON.parse(raw),clone(payload));checkOracle(JSON.parse(raw),e,oracle);
 const expectedURL=e.url+'?v='+e.payloadSHA256;
 const env=sandbox(document,'/reader/chok/',async url=>{assert.equal(url,expectedURL,'REGISTERED_CALLER_EXACT_VERSIONED_REQUEST');requests.push(url);return{ok:true,status:200,text:async()=>raw};});
 try{
  const box=env.box;box.window.ChokQualifiedDaily=libraryAPI;box.window.ChokQualifiedDailySelected=libraryAPI.create(entries);box.state={};
  const declarations=['TAAMIM','NIKUD'].map(name=>{const m=originalMain.match(new RegExp('var '+name+'\\s*=\\s*([^;]+);'));assert(m);return'var '+name+' = '+m[1]+';';});
  const queue=originalMain.match(/  var __fq = \[\], __frunning = 0;/);assert(queue);
  vm.runInContext(declarations.concat([queue[0]],['__fnext','rawJSON','fetchJSON','applyWednesdayMode','qualifiedDailyHas','qualifiedDailyReading','qualifiedDailyOr'].map(originalFunction)).join('\n'),box,{filename:'registered-chok-main-callers.js'});
  const unit=clone(payload).sections.mussar.units[0];assert.equal(unit.owner,'תולדות|יום רביעי|mussar');assert.equal(payload.sections.mussar.units.length,1);assert.equal(unit.notes.length,2);
  const a=oracle.units.find(x=>x.readingId===e.key&&x.owner===unit.owner);assert(a);
  const authority=JSON.parse(fs.readFileSync(path.join(root,'scripts/chok-toldos-wednesday-mussar-admission.json'),'utf8'));assert.equal(authority.selectedOwner,unit.owner);assert.deepEqual(authority.sourceOwner,{key:e.key,role:unit.role});assert.equal(authority.sourceOwnerToRuntimeAlias.runtimeOwner,unit.owner);assert.deepEqual(authority.sourceOwnerToRuntimeAlias.sourceOwner,authority.sourceOwner);assert.deepEqual(authority.sourceOwnerToRuntimeAlias.noteIDs,unit.notes.map(n=>n.id));
  function one(n,p,label){const found=walk(n,p);assert.equal(found.length,1,label);return found[0];}
  function direct(n,k){return one(n,x=>x.parentNode===n&&attr(x,'data-daily-field')===k,'REGISTERED_DIRECT_FIELD:'+k);}
  function visible(n){for(let p=n;p;p=p.parentNode){assert.equal(attr(p,'hidden'),undefined,'REGISTERED_REQUIRED_NOTE_HIDDEN');assert.notEqual(p.tagName,'details','REGISTERED_REQUIRED_NOTE_DISCLOSURE');assert(!/display\s*:\s*none|visibility\s*:\s*hidden/.test(attr(p,'style')||''));}}
  function expectedMode(s,mode){if(mode==='full')return s;if(mode==='nikud')return s.replace(/[\u0591-\u05AF\u05BD\u05C0]/g,'');if(mode==='taamim')return s.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');return s.replace(/[\u0591-\u05AF\u05BD\u05C0\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');}
  let cases=0;
  for(const language of languages)for(const mode of modes)for(const commentary of [false,true]){
   Object.assign(box.state,{language,mode,commentary,rashi:false});
   const html=await box.qualifiedDailyOr(e.week,e.day,'mussar',e.schedule,()=>{throw Error('REGISTERED_MUSSAR_USED_LEGACY');});assert.equal(typeof html,'string');
   const dom=parse5.parseFragment(html),island=one(dom,n=>attr(n,'data-qualified-daily')===e.key,'REGISTERED_ISLAND');assert.equal(attr(island,'data-daily-language'),language);assert.equal(attr(island,'data-daily-commentary'),commentary?'on':'off');assert.equal(attr(island,'data-daily-section'),'mussar');
   assert.equal(nodeText(one(island,n=>n.tagName==='h3','REGISTERED_SECTION_HEADER')),e.sections.mussar.title.he+' · '+e.sections.mussar.title.en);
   const buttons=walk(island,n=>attr(n,'data-ck-daily-language')!==undefined);assert.deepEqual(buttons.map(n=>attr(n,'data-ck-daily-language')).sort(),languages.slice().sort());for(const button of buttons)assert.equal(attr(button,'aria-pressed'),String(attr(button,'data-ck-daily-language')===language));
   assert.deepEqual(walk(dom,n=>attr(n,'data-reading-unit')!==undefined).map(n=>attr(n,'data-reading-unit')),[unit.owner],'REGISTERED_SOURCE_OWNER');
   const article=one(dom,n=>attr(n,'data-reading-unit')===unit.owner,'REGISTERED_OWNER');assert.equal(attr(article,'data-field-role'),unit.role);
   assert.equal(nodeText(direct(article,'original')),expectedMode(unit.he,mode),'REGISTERED_COMPLETE_TRANSFORMED_ORIGINAL');assert.equal(nodeText(direct(article,'untouched')),unit.he,'REGISTERED_COMPLETE_UNTOUCHED_ORIGINAL');assert.equal(nodeText(direct(article,'en')),unit.en,'REGISTERED_COMPLETE_ENGLISH');
   for(const kind of ['original','untouched','en'])assert.equal(attr(direct(article,kind),'hidden')!==undefined,kind==='original'?language==='original':kind==='untouched'?language!=='original':!['en','both'].includes(language),'REGISTERED_LANGUAGE_VISIBILITY:'+kind);
   for(const[k,role,tag,header]of[['introduction','introduction','section','הקדמה · Introduction'],['learningAid','learning-aid','details','עזר לימוד · Learning aid']]){
    const wrapper=direct(article,role);assert.equal(wrapper.tagName,tag);assert.equal(attr(wrapper,'data-daily-role'),role);assert.equal(attr(wrapper,'hidden')!==undefined,language==='original');
    assert.equal(nodeText(one(wrapper,n=>n.parentNode===wrapper&&n.tagName===(tag==='details'?'summary':'h4'),'REGISTERED_ROLE_HEADER')),header);
    for(const lang of ['he','en']){const field=direct(wrapper,lang);assert.equal(nodeText(field),unit[k][lang],'REGISTERED_COMPLETE_SUPPLEMENT:'+k+':'+lang);assert.equal(attr(field,'hidden')!==undefined,lang==='he'?!['he','both'].includes(language):!['en','both'].includes(language));}
   }
   const explanation=direct(article,'explanation');assert.equal(attr(explanation,'hidden')!==undefined,!commentary||language==='original');assert.equal(nodeText(one(explanation,n=>n.tagName==='summary','REGISTERED_EXPLANATION_TITLE')),unit.explanation.title.he+' · '+unit.explanation.title.en);
   for(const lang of ['he','en']){const fields=(explanation.childNodes||[]).filter(n=>attr(n,'data-daily-field')===lang);assert.deepEqual(fields.map(nodeText),unit.explanation.paragraphs.map(p=>p[lang]),'REGISTERED_COMPLETE_EXPLANATION:'+lang);for(const field of fields)assert.equal(attr(field,'hidden')!==undefined,lang==='he'?!['he','both'].includes(language):!['en','both'].includes(language));}
   assert.deepEqual(walk(dom,n=>attr(n,'data-daily-note')!==undefined).map(n=>attr(n,'data-daily-note')),unit.notes.map(n=>n.id),'REGISTERED_ORDERED_TWO_NOTES');
   for(const note of unit.notes){const aside=one(dom,n=>attr(n,'data-daily-note')===note.id,'REGISTERED_NOTE');assert.equal(attr(aside,'data-note-owner'),unit.owner);assert.equal(attr(aside,'data-field-role'),note.role);visible(aside);for(const lang of ['he','en'])assert.equal(nodeText(one(aside,n=>n.tagName==='p'&&attr(n,'lang')===lang,'REGISTERED_NOTE_LANGUAGE')),note[lang],'REGISTERED_WHOLE_BILINGUAL_NOTE');}
   cases++;
  }
  assert.equal(cases,32,'REGISTERED_CALLER_MATRIX');assert.deepEqual(requests,[expectedURL],'REGISTERED_REAL_QUEUE_AND_SELECTED_CACHE');assert.equal(box.__fq.length,0);assert.equal(box.__frunning,0);return cases;
 }finally{env.close();}
}

async function toldosWednesdayHalachaCallerMatrix(root,libraryAPI,entries,e,payload,oracle){
 if(e.key!=='תולדות|יום רביעי')return 0;
 const originalMain=fs.readFileSync(path.join(root,'public/chok.js'),'utf8'),astro=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8');
 assert(originalMain.includes("return qualifiedDailyOr(wk,dayE,'halacha',d,function()"),'REGISTERED_HALACHA_CALLER');sourceSRI(root);
 function originalFunction(name){const marker='  function '+name+'(',a=originalMain.indexOf(marker);assert(a>=0);assert.equal(originalMain.indexOf(marker,a+1),-1);const b=originalMain.indexOf('\n  }',a);assert(b>a);return originalMain.slice(a,b+4);}
 function choices(id){const select=astro.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)</select>'));assert(select);return Array.from(select[1].matchAll(/<option value="([^"]+)"/g),m=>m[1]);}
 const languages=choices('ck-language'),modes=choices('ck-mode');assert.deepEqual(languages.slice().sort(),['both','en','he','original']);assert.deepEqual(modes.slice().sort(),['full','letters','nikud','taamim']);
 const {sandbox,documentFor}=require('./qualified-earlier-parsha-test-dom.cjs'),document=documentFor('<html><body></body></html>'),requests=[];
 const raw=fs.readFileSync(path.join(root,'public','.'+e.url),'utf8');assert.equal(sha(raw),e.payloadSHA256,'REGISTERED_CALLER_PACKET_PIN');assert.deepEqual(JSON.parse(raw),clone(payload));checkOracle(JSON.parse(raw),e,oracle);
 const expectedURL=e.url+'?v='+e.payloadSHA256;
 const env=sandbox(document,'/reader/chok/',async url=>{assert.equal(url,expectedURL,'REGISTERED_CALLER_EXACT_VERSIONED_REQUEST');requests.push(url);return{ok:true,status:200,text:async()=>raw};});
 try{
  const box=env.box;box.window.ChokQualifiedDaily=libraryAPI;box.window.ChokQualifiedDailySelected=libraryAPI.create(entries);box.state={};
  const declarations=['TAAMIM','NIKUD'].map(name=>{const m=originalMain.match(new RegExp('var '+name+'\\s*=\\s*([^;]+);'));assert(m);return'var '+name+' = '+m[1]+';';});
  const queue=originalMain.match(/  var __fq = \[\], __frunning = 0;/);assert(queue);
  vm.runInContext(declarations.concat([queue[0]],['__fnext','rawJSON','fetchJSON','applyWednesdayMode','qualifiedDailyHas','qualifiedDailyReading','qualifiedDailyOr'].map(originalFunction)).join('\n'),box,{filename:'registered-chok-main-callers.js'});
  const unit=clone(payload).sections.halacha.units[0];assert.equal(unit.owner,"תולדות|יום רביעי|halacha|RambamDeot-selected");assert.equal(payload.sections.halacha.units.length,1);assert.equal(unit.notes.length,7);
  const a=oracle.units.find(x=>x.readingId===e.key&&x.owner===unit.owner);assert(a);
  const authorityRaw=fs.readFileSync(path.join(root,'scripts/chok-toldos-wednesday-halacha-admission.json'));assert.equal(sha(authorityRaw),'8691851fb48045fee5b79def3713e0d03d921d1f7f9848824c8380fabea2e793','TOLDOS_WEDNESDAY_HALACHA_ADMISSION_PIN');const authority=JSON.parse(authorityRaw);
  assert.equal(authority.selectedKey,e.key);assert.equal(authority.selectedOwner,unit.owner);assert.equal(authority.selectedRole,unit.role);assert.deepEqual(authority.orderedNoteIDs,unit.notes.map(n=>n.id));
  assert.deepEqual(clone(payload.sections.halacha.reference),authority.nativeReference.reference);assert.deepEqual(clone(payload.sections.halacha.extent),authority.nativeReference.extent);assert.equal(authority.nativeReference.sourceUseEvidenceSHA256,authority.parentSelection.sha256);
  assert.deepEqual(e.sections.halacha.admission,authority.selectedGates);assert.deepEqual(e.sections.halacha.units[0].admission,authority.selectedGates);assert.deepEqual(a.nativeAdmission.entry,e.admission,'HALACHA_AGGREGATE_ENTRY_ADMISSION_CONSERVED');

  function one(n,p,label){const found=walk(n,p);assert.equal(found.length,1,label);return found[0];}
  function direct(n,k){return one(n,x=>x.parentNode===n&&attr(x,'data-daily-field')===k,'REGISTERED_DIRECT_FIELD:'+k);}
  function visible(n){for(let p=n;p;p=p.parentNode){assert.equal(attr(p,'hidden'),undefined,'REGISTERED_REQUIRED_NOTE_HIDDEN');assert.notEqual(p.tagName,'details','REGISTERED_REQUIRED_NOTE_DISCLOSURE');assert(!/display\s*:\s*none|visibility\s*:\s*hidden/.test(attr(p,'style')||''));}}
  function expectedMode(s,mode){if(mode==='full')return s;if(mode==='nikud')return s.replace(/[\u0591-\u05AF\u05BD\u05C0]/g,'');if(mode==='taamim')return s.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');return s.replace(/[\u0591-\u05AF\u05BD\u05C0\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');}
  let cases=0;
  for(const language of languages)for(const mode of modes)for(const commentary of [false,true]){
   Object.assign(box.state,{language,mode,commentary,rashi:false});
   const html=await box.qualifiedDailyOr(e.week,e.day,'halacha',e.schedule,()=>{throw Error('REGISTERED_HALACHA_USED_LEGACY');});assert.equal(typeof html,'string');
   const dom=parse5.parseFragment(html),island=one(dom,n=>attr(n,'data-qualified-daily')===e.key,'REGISTERED_ISLAND');assert.equal(attr(island,'data-daily-language'),language);assert.equal(attr(island,'data-daily-commentary'),commentary?'on':'off');assert.equal(attr(island,'data-daily-section'),'halacha');
   assert.equal(nodeText(one(island,n=>n.tagName==='h3','REGISTERED_SECTION_HEADER')),e.sections.halacha.title.he+' · '+e.sections.halacha.title.en);
   const buttons=walk(island,n=>attr(n,'data-ck-daily-language')!==undefined);assert.deepEqual(buttons.map(n=>attr(n,'data-ck-daily-language')).sort(),languages.slice().sort());for(const button of buttons)assert.equal(attr(button,'aria-pressed'),String(attr(button,'data-ck-daily-language')===language));
   assert.deepEqual(walk(dom,n=>attr(n,'data-reading-unit')!==undefined).map(n=>attr(n,'data-reading-unit')),[unit.owner],'REGISTERED_SOURCE_OWNER');
   const article=one(dom,n=>attr(n,'data-reading-unit')===unit.owner,'REGISTERED_OWNER');assert.equal(attr(article,'data-field-role'),unit.role);
   assert.equal(nodeText(direct(article,'original')),expectedMode(unit.he,mode),'REGISTERED_COMPLETE_TRANSFORMED_ORIGINAL');assert.equal(nodeText(direct(article,'untouched')),unit.he,'REGISTERED_COMPLETE_UNTOUCHED_ORIGINAL');assert.equal(nodeText(direct(article,'en')),unit.en,'REGISTERED_COMPLETE_ENGLISH');
   for(const kind of ['original','untouched','en'])assert.equal(attr(direct(article,kind),'hidden')!==undefined,kind==='original'?language==='original':kind==='untouched'?language!=='original':!['en','both'].includes(language),'REGISTERED_LANGUAGE_VISIBILITY:'+kind);
   for(const[k,role,tag,header]of[['introduction','introduction','section','הקדמה · Introduction'],['learningAid','learning-aid','details','עזר לימוד · Learning aid']]){
    const wrapper=direct(article,role);assert.equal(wrapper.tagName,tag);assert.equal(attr(wrapper,'data-daily-role'),role);assert.equal(attr(wrapper,'hidden')!==undefined,language==='original');
    assert.equal(nodeText(one(wrapper,n=>n.parentNode===wrapper&&n.tagName===(tag==='details'?'summary':'h4'),'REGISTERED_ROLE_HEADER')),header);
    for(const lang of ['he','en']){const field=direct(wrapper,lang);assert.equal(nodeText(field),unit[k][lang],'REGISTERED_COMPLETE_SUPPLEMENT:'+k+':'+lang);assert.equal(attr(field,'hidden')!==undefined,lang==='he'?!['he','both'].includes(language):!['en','both'].includes(language));}
   }
   const explanation=direct(article,'explanation');assert.equal(attr(explanation,'hidden')!==undefined,!commentary||language==='original');assert.equal(nodeText(one(explanation,n=>n.tagName==='summary','REGISTERED_EXPLANATION_TITLE')),unit.explanation.title.he+' · '+unit.explanation.title.en);
   for(const lang of ['he','en']){const fields=(explanation.childNodes||[]).filter(n=>attr(n,'data-daily-field')===lang);assert.deepEqual(fields.map(nodeText),unit.explanation.paragraphs.map(p=>p[lang]),'REGISTERED_COMPLETE_EXPLANATION:'+lang);for(const field of fields)assert.equal(attr(field,'hidden')!==undefined,lang==='he'?!['he','both'].includes(language):!['en','both'].includes(language));}
   assert.deepEqual(walk(dom,n=>attr(n,'data-daily-note')!==undefined).map(n=>attr(n,'data-daily-note')),unit.notes.map(n=>n.id),'REGISTERED_ORDERED_SEVEN_NOTES');
   for(const note of unit.notes){const aside=one(dom,n=>attr(n,'data-daily-note')===note.id,'REGISTERED_NOTE');assert.equal(attr(aside,'data-note-owner'),unit.owner);assert.equal(attr(aside,'data-field-role'),note.role);visible(aside);for(const lang of ['he','en'])assert.equal(nodeText(one(aside,n=>n.tagName==='p'&&attr(n,'lang')===lang,'REGISTERED_NOTE_LANGUAGE')),note[lang],'REGISTERED_WHOLE_BILINGUAL_NOTE');}
   cases++;
  }
  assert.equal(cases,32,'REGISTERED_CALLER_MATRIX');assert.deepEqual(requests,[expectedURL],'REGISTERED_REAL_QUEUE_AND_SELECTED_CACHE');assert.equal(box.__fq.length,0);assert.equal(box.__frunning,0);return cases;
 }finally{env.close();}
}


// Exact parent-selected Peah successor controls. Registered callbacks only; no native/runtime claim from source preparation.
async function miketzPeahControls(root,libraryAPI,entries,e,payload,oracle){
 if(e.key!=='מקץ|יום ראשון')return null;
 const canonical=require('./chok-today-classical-admission.cjs').canonical;
 const raw=fs.readFileSync(path.join(root,'public','.'+e.url),'utf8');assert.equal(sha(raw),e.payloadSHA256);assert.deepEqual(JSON.parse(raw),clone(payload));
 const wanted=oracle.sectionSupplements[e.key].mishna;assert(wanted);assert.equal(payload.sections.mishna.units.length,12);assert.deepEqual(clone(payload.sections.mishna.units.filter(u=>u.role==='bartenura').map(u=>u.segments.length)),[7,4,4,7,1,7]);
 assert.equal(payload.sections.mishna.units.reduce((n,u)=>n+u.notes.length,0),25);assert.equal(payload.sections.mishna.notes.length,1);
 const records=[];
 async function positive(label){const a=libraryAPI.create([e]);const p=clone(await a.load(e.week,e.day,e.schedule,async url=>{assert.equal(url,e.url+'?v='+e.payloadSHA256);return raw;}));assert.deepEqual(p,clone(payload));checkOracle(p,e,oracle);records.push({label,positive:true});}
 async function control(label,mutate,libraryAccepts){
  const p=clone(payload),d=clone(e);mutate(p,d);assert(JSON.stringify(p)!==JSON.stringify(payload)||JSON.stringify(d)!==JSON.stringify(e),'PEAH_GENUINE_MUTATION:'+label);const wire=JSON.stringify(p);d.payloadSHA256=sha(wire);
  const load=async()=>libraryAPI.create([d]).load(d.week,d.day,d.schedule,async url=>{assert.equal(url,d.url+'?v='+d.payloadSHA256);return wire;});
  if(libraryAccepts){assert.deepEqual(clone(await load()),p);assert.throws(()=>checkOracle(p,d,oracle),undefined,'PEAH_INDEPENDENT_ORACLE_REJECTS:'+label);}else await assert.rejects(load,undefined,'PEAH_SCHEMA_OR_DIGEST_REJECTS:'+label);
  records.push({label,checksumValid:true,libraryAccepted:libraryAccepts,independentOracleRejected:libraryAccepts});await positive('restored:'+label);
 }
 await positive('initial');
 for(const key of ['introduction','notes']){
  await control('chapter:'+key+':missing',p=>{delete p.sections.mishna[key];},false);
  await control('chapter:'+key+':coordinated-removal',(p,d)=>{delete p.sections.mishna[key];delete d.sections.mishna[key+'SHA256'];},true);
  await control('chapter:'+key+':changed',(p,d)=>{if(key==='notes')p.sections.mishna.notes[0].en+=' changed';else p.sections.mishna.introduction.en+=' changed';},false);
  await control('chapter:'+key+':coordinated-change',(p,d)=>{if(key==='notes')p.sections.mishna.notes[0].en+=' changed';else p.sections.mishna.introduction.en+=' changed';d.sections.mishna[key+'SHA256']=sha(canonical(p.sections.mishna[key]));},true);
 }
 for(let i=0;i<12;i++){
  for(const key of ['introduction','segments']){
   await control('owner:'+i+':'+key+':missing',p=>{delete p.sections.mishna.units[i][key];},false);
   await control('owner:'+i+':'+key+':coordinated-removal',(p,d)=>{delete p.sections.mishna.units[i][key];delete d.sections.mishna.units[i][key+'SHA256'];},true);
  }
 }
 await control('wrong-interleave',p=>{[p.sections.mishna.units[0],p.sections.mishna.units[1]]=[p.sections.mishna.units[1],p.sections.mishna.units[0]];},false);
 await control('duplicate-owner',p=>{p.sections.mishna.units[1]=clone(p.sections.mishna.units[0]);},false);
 await control('missing-note',p=>{p.sections.mishna.units[1].notes.pop();},false);
 await control('note-in-wrong-owner',p=>{p.sections.mishna.units[1].notes[0].owner=p.sections.mishna.units[0].owner;},false);
 await control('segment-order',p=>{p.sections.mishna.units[1].segments.reverse();},false);
 await control('segment-heading-tail',p=>{p.sections.mishna.units[1].segments[0].he+=' changed';},false);
 await control('segment-english-alias',p=>{p.sections.mishna.units[1].segments[0].en+=' changed';},false);
 await control('coordinated-segment-english',(p,d)=>{const u=p.sections.mishna.units[1],v=d.sections.mishna.units[1];u.segments[0].en+=' changed';u.en=u.segments.map(s=>s.en).join('\n\n');v.englishSHA256=sha(u.en);v.segmentsSHA256=sha(canonical(u.segments));},true);
 await control('private-field',p=>{p.sections.mishna.units[0].sourceBinding={path:'/root/private-test'};},false);
 await control('raw-html-in-literal-field',p=>{p.sections.mishna.units[1].he='<b>'+p.sections.mishna.units[1].he+'</b>';},false);
 // Descriptor-coordinated additions on an actual old owner must still fail independent optional-presence authority.
 const old=entries.find(x=>x.key==='ויצא|יום שני');assert(old);const oldRaw=fs.readFileSync(path.join(root,'public','.'+old.url),'utf8');assert.equal(sha(oldRaw),old.payloadSHA256);
 for(const key of ['introduction','notes']){const p=JSON.parse(oldRaw),d=clone(old);p.sections.mishna[key]=clone(wanted[key]);d.sections.mishna[key+'SHA256']=sha(canonical(p.sections.mishna[key]));const wire=JSON.stringify(p);d.payloadSHA256=sha(wire);assert.deepEqual(clone(await libraryAPI.create([d]).load(d.week,d.day,d.schedule,async()=>wire)),p);assert.throws(()=>checkOracle(p,d,oracle),/REVIEWED_CHAPTER_PRESENCE/);await positive('restored:old-unapproved-chapter-'+key);records.push({label:'old-unapproved-chapter-'+key,checksumValid:true,libraryAccepted:true,independentOracleRejected:true});}
 const originalMain=fs.readFileSync(path.join(root,'public/chok.js'),'utf8'),astro=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8');sourceSRI(root);
 assert(originalMain.includes("if ((qualifiedDailyHas(wk,dayE,'mishna') || isLechThursday(wk,dayE) || d.mishna && d.mishna.masechet) && want('mishna'))"),'PEAH_ACTUAL_NORMAL_FOCUSED_ELIGIBILITY');
 assert(originalMain.includes("return qualifiedDailyOr(wk,dayE,'mishna',d,function()"),'PEAH_REGISTERED_MISHNA_CALLER');
 function originalFunction(name){const marker='  function '+name+'(',a=originalMain.indexOf(marker);assert(a>=0);assert.equal(originalMain.indexOf(marker,a+1),-1);const b=originalMain.indexOf('\n  }',a);assert(b>a);return originalMain.slice(a,b+4);}
 function choices(id){const select=astro.match(new RegExp('<select id="'+id+'"[^>]*>([\\s\\S]*?)</select>'));assert(select);return Array.from(select[1].matchAll(/<option value="([^"]+)"/g),m=>m[1]);}
 const languages=choices('ck-language'),modes=choices('ck-mode');assert.deepEqual(languages.slice().sort(),['both','en','he','original']);assert.deepEqual(modes.slice().sort(),['full','letters','nikud','taamim']);
 const {sandbox,documentFor}=require('./qualified-earlier-parsha-test-dom.cjs'),document=documentFor('<html><body></body></html>'),requests=[],raws=new Map([[e.url+'?v='+e.payloadSHA256,raw],[old.url+'?v='+old.payloadSHA256,oldRaw]]);
 const env=sandbox(document,'/reader/chok/',async url=>{assert(raws.has(url),'PEAH_REAL_QUEUE_EXACT_REQUEST');requests.push(url);return{ok:true,status:200,text:async()=>raws.get(url)};});
 try{
  const box=env.box;box.window.ChokQualifiedDaily=libraryAPI;box.window.ChokQualifiedDailySelected=libraryAPI.create(entries);box.state={};
  const declarations=['TAAMIM','NIKUD'].map(name=>{const m=originalMain.match(new RegExp('var '+name+'\\s*=\\s*([^;]+);'));assert(m);return'var '+name+' = '+m[1]+';';});
  const queue=originalMain.match(/  var __fq = \[\], __frunning = 0;/);assert(queue);
  const want=originalMain.match(/  function want\(key\) \{[^\n]+\}/);assert(want);
  vm.runInContext(declarations.concat([queue[0],want[0]],['__fnext','rawJSON','fetchJSON','applyWednesdayMode','qualifiedDailyHas','qualifiedDailyReading','qualifiedDailyOr'].map(originalFunction)).join('\n'),box,{filename:'registered-miketz-peah-main-callers.js'});
  function one(n,p,label){const found=walk(n,p);assert.equal(found.length,1,label);return found[0];}
  function direct(n,k){return one(n,x=>x.parentNode===n&&attr(x,'data-daily-field')===k,'PEAH_DIRECT_FIELD:'+k);}
  function visible(n){for(let p=n;p;p=p.parentNode){assert.equal(attr(p,'hidden'),undefined,'PEAH_REQUIRED_NOTE_HIDDEN');assert.notEqual(p.tagName,'details','PEAH_REQUIRED_NOTE_DISCLOSURE');assert(!/display\s*:\s*none|visibility\s*:\s*hidden/.test(attr(p,'style')||''));}}
  function expectedMode(s,mode){if(mode==='full')return s;if(mode==='nikud')return s.replace(/[\u0591-\u05AF\u05BD\u05C0]/g,'');if(mode==='taamim')return s.replace(/[\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');return s.replace(/[\u0591-\u05AF\u05BD\u05C0\u05B0-\u05BC\u05C1\u05C2\u05C7]/g,'');}
  let cases=0;
  for(const focus of [null,'mishna'])for(const language of languages)for(const mode of modes)for(const commentary of [false,true]){
   Object.assign(box.state,{focus,language,mode,commentary,rashi:false});assert(box.want('mishna'));assert(box.qualifiedDailyHas(e.week,e.day,'mishna'));
   const html=await box.qualifiedDailyOr(e.week,e.day,'mishna',e.schedule,()=>{throw Error('PEAH_QUALIFIED_USED_LEGACY');});assert.equal(typeof html,'string');const dom=parse5.parseFragment(html),island=one(dom,n=>attr(n,'data-qualified-daily')===e.key,'PEAH_ONE_ISLAND');
   assert.deepEqual(walk(island,n=>attr(n,'data-reading-unit')!==undefined).map(n=>attr(n,'data-reading-unit')),clone(payload.sections.mishna.units.map(u=>u.owner)),'PEAH_INTERLEAVE');
   const chapter=one(island,n=>attr(n,'data-daily-role')==='chapter-introduction','PEAH_DISTINCT_CHAPTER_INTRO');assert.equal(attr(chapter,'hidden')!==undefined,language==='original');for(const l of ['he','en'])assert.equal(nodeText(direct(chapter,l)),wanted.introduction[l]);
   const section=payload.sections.mishna;
   for(const u of section.units){const article=one(island,n=>attr(n,'data-reading-unit')===u.owner,'PEAH_OWNER');const source=direct(article,'original'),untouched=direct(article,'untouched'),english=direct(article,'en');assert.equal(nodeText(source),expectedMode(u.he,mode));assert.equal(nodeText(untouched),u.he);assert.equal(nodeText(english),u.en);assert.equal(attr(source,'hidden')!==undefined,language==='original');assert.equal(attr(untouched,'hidden')!==undefined,language!=='original');assert.equal(attr(english,'hidden')!==undefined,!['en','both'].includes(language));
    const intro=one(article,n=>attr(n,'data-daily-role')==='introduction','PEAH_OWNER_INTRO');for(const l of ['he','en'])assert.equal(nodeText(direct(intro,l)),u.introduction[l]);const explanation=direct(article,'explanation');assert.equal(attr(explanation,'hidden')!==undefined,!commentary||language==='original');assert.equal(nodeText(one(explanation,n=>n.tagName==='summary','PEAH_EXPLANATION_TITLE')),u.explanation.title.he+' · '+u.explanation.title.en);for(const l of ['he','en'])assert.deepEqual((explanation.childNodes||[]).filter(n=>attr(n,'data-daily-field')===l).map(nodeText),clone(u.explanation.paragraphs.map(p=>p[l])));
    for(const n of u.notes){const aside=one(island,x=>attr(x,'data-daily-note')===n.id,'PEAH_NOTE');assert.equal(attr(aside,'data-note-owner'),u.owner);visible(aside);for(const l of ['he','en'])assert.equal(nodeText(one(aside,x=>x.tagName==='p'&&attr(x,'lang')===l,'PEAH_FULL_NOTE')),n[l]);}
   }
   for(const n of section.notes){const aside=one(island,x=>attr(x,'data-daily-note')===n.id,'PEAH_CHAPTER_CAUTION');visible(aside);assert.equal(attr(aside,'data-note-section'),'mishna');for(const l of ['he','en'])assert.equal(nodeText(one(aside,x=>x.tagName==='p'&&attr(x,'lang')===l,'PEAH_FULL_CAUTION')),n[l]);}
   assert.equal(walk(island,n=>attr(n,'data-daily-note')!==undefined).length,26);cases++;
  }
  assert.equal(cases,64);Object.assign(box.state,{focus:'talmud'});assert.equal(box.want('mishna'),false);
  for(const section of ['talmud','halacha','mussar','zohar'])assert.equal(box.qualifiedDailyHas(e.week,e.day,section),false,'PEAH_NO_CROSS_SECTION_WIDENING');
  const actualMondaySchedule=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'),'utf8')).weeks[e.week].days['יום שני'];
  const selectedMonday=entries.find(x=>x.key===e.week+'|יום שני');assert(selectedMonday);assert.deepEqual(actualMondaySchedule,clone(selectedMonday.schedule));assert.deepEqual(Object.keys(selectedMonday.sections),['mussar']);
  assert.equal(box.qualifiedDailyHas(e.week,'יום שני','mishna'),false);assert.equal(box.window.ChokQualifiedDailySelected.has(e.week,'יום שני','mishna'),false);
  assert.equal(await box.window.ChokQualifiedDailySelected.reading(e.week,'יום שני','mishna',{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:x=>x},()=>{throw Error('ABSENT_SECTION_LOADER');},actualMondaySchedule),null);
  const unselectedNight='ליל שישי';assert(!entries.some(x=>x.key===e.week+'|'+unselectedNight));assert.equal(await box.window.ChokQualifiedDailySelected.load(e.week,unselectedNight,{},()=>{throw Error('UNSELECTED_LOADER');}),null);
  Object.assign(box.state,{focus:null,language:'both',mode:'full',commentary:true,rashi:false});
  for(const entry of [old,e,old]){const html=await box.qualifiedDailyOr(entry.week,entry.day,'mishna',entry.schedule,()=>{throw Error('PEAH_CACHE_SEQUENCE_FALLBACK');});const dom=parse5.parseFragment(html),actual=walk(dom,n=>attr(n,'data-qualified-daily')!==undefined);assert.equal(actual.length,1);assert.equal(attr(actual[0],'data-qualified-daily'),entry.key);const expected=JSON.parse(raws.get(entry.url+'?v='+entry.payloadSHA256));for(const u of expected.sections.mishna.units){const article=one(dom,n=>attr(n,'data-reading-unit')===u.owner,'CACHE_EXACT_OWNER');assert.equal(nodeText(direct(article,'original')),expectedSource(u.he,u.role==='bartenura').text);assert.equal(nodeText(direct(article,'en')),u.en);}}
  assert.deepEqual(requests,[e.url+'?v='+e.payloadSHA256,old.url+'?v='+old.payloadSHA256]);assert.equal(box.__fq.length,0);assert.equal(box.__frunning,0);
  await positive('final');return{cases,negativeControls:records.filter(r=>r.checksumValid).length,restoredPositives:records.filter(r=>r.positive).length,records,scope:'Existing registered Main Mishna callback, exact queued raw loader and actual focus predicate only; not whole initializer, native browser, public or cache-migration acceptance'};
 }finally{env.close();}
}

async function verify(root){
 root=path.resolve(root);const oracle=JSON.parse(fs.readFileSync(path.join(root,'scripts/chok-qualified-daily-reviewed.json'),'utf8'));assert.equal(oracle.schema,'chok-qualified-reviewed-hashes-v1');require('./verify-chok-next-readings-source-admission.cjs').check(root,oracle);require('./verify-chok-classical-public-source-admission.cjs').check(root,oracle);require('./chok-today-classical-admission.cjs').check(root,oracle);sourceSRI(root);
 const{api,libraryAPI,entries}=boot(root),schedule=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'),'utf8'));assert.deepEqual(entries.map(e=>e.key).sort(),oracle.readingKeys.slice().sort());
 let units=0,notes=0,requests=0,boldOriginalFields=0,boldControls=0,sourceVisibleFields=0,bartenuraOriginalFields=0,plainBartenuraOriginalFields=0,selectedFridayNoteCases=0,registeredCallerMatrix=0,registeredHalachaCallerMatrix=0;const supplementControlRecords=[];let miketzPeah=null;const seen=new Set();
 for(const e of entries){
  assert(!seen.has(e.key));seen.add(e.key);const scheduled=schedule.weeks[e.week].days[e.day];assert.deepEqual(e.schedule,scheduled);
  const loader=async url=>{requests++;assert.equal(url,e.url+'?v='+e.payloadSHA256,'UNVERSIONED_PAYLOAD');const filename=path.resolve(root,'public','.'+e.url);assert(filename.startsWith(path.join(root,'public')+path.sep));return fs.readFileSync(filename,'utf8');};
  const payload=await api.load(e.week,e.day,scheduled,loader),count=checkOracle(clone(payload),e,oracle);units+=count.checked;notes+=count.notes;
  if(e.key==='מקץ|יום ראשון')miketzPeah=await miketzPeahControls(root,libraryAPI,entries,e,payload,oracle);
  selectedFridayNoteCases+=await selectedFridayNoteControls(api,libraryAPI,e,payload,oracle,loader,scheduled);
  selectedFridayNoteCases+=await adoptedNoteControls(api,libraryAPI,e,payload,oracle,loader,scheduled);
  supplementControlRecords.push(...await supplementOracleControls(root,libraryAPI,e,payload,oracle,scheduled));
  if(e.key==='תולדות|יום רביעי')supplementControlRecords.push(...await supplementOracleControls(root,libraryAPI,e,payload,oracle,scheduled,'halacha'));
  registeredCallerMatrix+=await toldosWednesdayMussarCallerMatrix(root,libraryAPI,entries,e,payload,oracle);
  registeredHalachaCallerMatrix+=await toldosWednesdayHalachaCallerMatrix(root,libraryAPI,entries,e,payload,oracle);
  for(const section of Object.keys(e.sections)){
   const html=await api.reading(e.week,e.day,section,{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:s=>s},loader,scheduled);assert(html&&html.includes('ck-qualified-daily'));
   const visible=reviewedSourceFields(payload,section,html);sourceVisibleFields+=visible.sourceVisibleFields;bartenuraOriginalFields+=visible.bartenuraOriginalFields;boldOriginalFields+=visible.boldOriginalFields;plainBartenuraOriginalFields+=visible.plainBartenuraOriginalFields;
   if(section==='mishna')boldControls+=await boldPresentationControls(api,e,payload,loader,scheduled);
  }
 }
 assert.equal(supplementControlRecords.length,26,'SUPPLEMENT_CONTROL_CARDINALITY');assert.equal(registeredCallerMatrix,32,'REGISTERED_CALLER_MATRIX');
 assert.equal(registeredHalachaCallerMatrix,32,'REGISTERED_HALACHA_CALLER_MATRIX');
 assert.equal(units,oracle.units.length);assert.equal(requests,entries.length);assert(miketzPeah&&miketzPeah.cases===64,'PEAH_REGISTERED_MATRIX');return{miketzPeah,readings:entries.length,units,bilingualNotes:notes,versionedPayloadRequests:requests,sourceOracle:true,scriptSRI:true,boldOriginalFields,boldControls,sourceVisibleFields,bartenuraOriginalFields,plainBartenuraOriginalFields,selectedFridayNoteCases,supplementControls:supplementControlRecords,REGISTERED_HALACHA_CALLER_MATRIX:{cases:registeredHalachaCallerMatrix,scope:'registered Halacha Main callback and genuine queued loader only; not initialized Main/browser'},REGISTERED_CALLER_MATRIX:{cases:registeredCallerMatrix,scope:'registered Main callbacks and genuine queued loader only; not initialized Main/browser'}};
}
module.exports={boot,checkOracle,verify,sourceSRI,adoptNoteFixture};
if(require.main===module)verify(path.resolve(__dirname,'..')).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
