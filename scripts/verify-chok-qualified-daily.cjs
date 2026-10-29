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
function checkOracle(payload,entry,oracle){
 const approved=new Map(oracle.units.filter(u=>u.readingId===entry.key).map(u=>[u.owner,u]));assert(approved.size);
 assert.deepEqual(Object.keys(payload.sections).sort(),Object.keys(entry.sections).sort());let checked=0,notes=0;
 for(const[name,section]of Object.entries(payload.sections)){
  if((name==='halacha'||name==='mussar')&&oracle.classicalSelected&&oracle.classicalSelected[entry.key]){
   const native=oracle.classicalSelected[entry.key][name];assert(native);assert.equal(section.units.length,1);assert.equal(section.units[0].owner,native.owner);assert.deepEqual(section.reference,native.reference);assert.deepEqual(section.extent,native.extent);assert.equal(entry.sections[name].units[0].admission.sourceUse.evidenceSHA256,native.sourceUseEvidenceSHA256);
  }else if(name==='mussar'){
   const owners={'וירא|יום רביעי':'וירא|יום רביעי|mussar|Charedim67b-selected','וירא|יום חמישי':'וירא|יום חמישי|mussar|Charedim70a-selected'};
   const native=oracle.nativeMussar&&oracle.nativeMussar[entry.key];assert(native&&native.owner===owners[entry.key],'UNQUALIFIED_NATIVE_MUSSAR');assert.equal(section.units.length,1);assert.equal(section.units[0].owner,native.owner);assert.deepEqual(section.reference,native.reference);assert.deepEqual(section.extent,native.extent);assert.equal(entry.sections.mussar.units[0].admission.sourceUse.evidenceSHA256,native.sourceUseEvidenceSHA256);
  }else if(name==='halacha'){
   const exactOwners={'וירא|יום רביעי':'וירא|יום רביעי|halacha|CM227-selected','וירא|יום חמישי':'וירא|יום חמישי|halacha|CM348-selected'};
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
   assert.equal(sha(u.he),a.originalSHA256,'REVIEWED_ORIGINAL_MISMATCH:'+u.owner);assert.equal(sha(u.en),a.englishSHA256,'REVIEWED_ENGLISH_MISMATCH:'+u.owner);
   assert.equal(sha(u.explanation.paragraphs.map(p=>p.he).join('\n\n')),a.explanationHeSHA256,'REVIEWED_HE_EXPLANATION_MISMATCH:'+u.owner);
   assert.equal(sha(u.explanation.paragraphs.map(p=>p.en).join('\n\n')),a.explanationEnSHA256,'REVIEWED_EN_EXPLANATION_MISMATCH:'+u.owner);
   assert.deepEqual(u.notes.map(n=>({id:n.id,owner:n.owner,role:n.role,placement:n.placement,heSHA256:sha(n.he),enSHA256:sha(n.en),sourceTextSHA256:n.sourceTextSHA256,span:n.span})),a.notes,'REVIEWED_NOTE_MISMATCH:'+u.owner);
   const plan=entry.sections[name].units.find(x=>x.owner===u.owner);assert(plan);assert.equal(plan.edition,a.edition);assert.equal(plan.provenanceSHA256,a.provenanceSHA256);
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
  const begin=astro.lastIndexOf('<script',pos),end=astro.indexOf('</script>',pos),tag=astro.slice(begin,end);assert(tag.includes('integrity="sha256-'+createHash('sha256').update(b).digest('base64')+'"'),'SCRIPT_SRI:'+name);assert(tag.includes('defer'));new vm.Script(b.toString('utf8'),{filename:name});
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
async function verify(root){
 root=path.resolve(root);const oracle=JSON.parse(fs.readFileSync(path.join(root,'scripts/chok-qualified-daily-reviewed.json'),'utf8'));assert.equal(oracle.schema,'chok-qualified-reviewed-hashes-v1');require('./verify-chok-next-readings-source-admission.cjs').check(root,oracle);require('./verify-chok-classical-public-source-admission.cjs').check(root,oracle);sourceSRI(root);
 const{api,entries}=boot(root),schedule=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'),'utf8'));assert.deepEqual(entries.map(e=>e.key).sort(),oracle.readingKeys.slice().sort());
 let units=0,notes=0,requests=0,boldOriginalFields=0,boldControls=0,sourceVisibleFields=0,bartenuraOriginalFields=0,plainBartenuraOriginalFields=0;const seen=new Set();
 for(const e of entries){
  assert(!seen.has(e.key));seen.add(e.key);const scheduled=schedule.weeks[e.week].days[e.day];assert.deepEqual(e.schedule,scheduled);
  const loader=async url=>{requests++;assert.equal(url,e.url+'?v='+e.payloadSHA256,'UNVERSIONED_PAYLOAD');const filename=path.resolve(root,'public','.'+e.url);assert(filename.startsWith(path.join(root,'public')+path.sep));return fs.readFileSync(filename,'utf8');};
  const payload=await api.load(e.week,e.day,scheduled,loader),count=checkOracle(clone(payload),e,oracle);units+=count.checked;notes+=count.notes;
  for(const section of Object.keys(e.sections)){
   const html=await api.reading(e.week,e.day,section,{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:s=>s},loader,scheduled);assert(html&&html.includes('ck-qualified-daily'));
   const visible=reviewedSourceFields(payload,section,html);sourceVisibleFields+=visible.sourceVisibleFields;bartenuraOriginalFields+=visible.bartenuraOriginalFields;boldOriginalFields+=visible.boldOriginalFields;plainBartenuraOriginalFields+=visible.plainBartenuraOriginalFields;
   if(section==='mishna')boldControls+=await boldPresentationControls(api,e,payload,loader,scheduled);
  }
 }
 assert.equal(units,oracle.units.length);assert.equal(requests,entries.length);return{readings:entries.length,units,bilingualNotes:notes,versionedPayloadRequests:requests,sourceOracle:true,scriptSRI:true,boldOriginalFields,boldControls,sourceVisibleFields,bartenuraOriginalFields,plainBartenuraOriginalFields};
}
module.exports={boot,checkOracle,verify,sourceSRI};
if(require.main===module)verify(path.resolve(__dirname,'..')).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
