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
 new vm.Script(fs.readFileSync(path.join(root,'public/chok-qualified-daily-selected.js'),'utf8'),{filename:'chok-qualified-daily-selected.js'}).runInContext(sandbox);host.ChokQualifiedDaily=libraryAPI;assert(entries&&entries.length);
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
  assert(['mishna','talmud','zohar'].includes(name),'UNWIRED_SECTION');assert.deepEqual(section.reference,entry.schedule[name==='talmud'?'gemara':name]);
  assert.deepEqual(Object.keys(section.extent).sort(),['first','last'],'PUBLIC_EXTENT_KEYS');assert(Number.isInteger(section.extent.first)&&Number.isInteger(section.extent.last));
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
   for(const g of[plan.admission,entry.sections[name].admission,entry.admission])for(const decision of Object.values(g)){assert.equal(decision.decision,'accepted');assert.equal(decision.evidenceSHA256,a.authoritySHA256||oracle.authoritySHA256);}
   approved.delete(u.owner);checked++;notes+=u.notes.length;
  }
 }
 assert.equal(approved.size,0,'MISSING_REVIEWED_OWNER');rejectPaths(payload);rejectPaths(entry);return{checked,notes};
}
function sourceSRI(root){
 const astro=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8');let previous=-1;
 for(const name of['chok-qualified-daily.js','chok-qualified-daily-selected.js','chok.js']){
  const b=fs.readFileSync(path.join(root,'public',name)),url='/'+name+'?v='+sha(b),pos=astro.indexOf('src="'+url+'"');assert(pos>previous,'SCRIPT_ORDER_OR_VERSION:'+name);previous=pos;
  const begin=astro.lastIndexOf('<script',pos),end=astro.indexOf('</script>',pos),tag=astro.slice(begin,end);assert(tag.includes('integrity="sha256-'+createHash('sha256').update(b).digest('base64')+'"'),'SCRIPT_SRI:'+name);assert(tag.includes('defer'));new vm.Script(b.toString('utf8'),{filename:name});
 }
 assert(astro.includes('.ck-qualified-daily')&&astro.includes('--ck-size')&&astro.includes('--ck-font-he')&&astro.includes('--ck-font-en'));return true;
}
function htmlSourceFields(html, owner){
 const parse5=require('parse5');const root=parse5.parseFragment(html);
 function attr(n,k){return(n.attrs||[]).find(a=>a.name===k)?.value;}
 function walk(n,match,out=[]){if(match(n))out.push(n);for(const c of n.childNodes||[])walk(c,match,out);return out;}
 function text(n){return n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');}
 const units=walk(root,n=>attr(n,'data-reading-unit')===owner);assert.equal(units.length,1,'BOLD_OWNER');
 const fields={};for(const kind of ['original','untouched']){const a=walk(units[0],n=>attr(n,'data-daily-field')===kind);assert.equal(a.length,1);fields[kind]={text:text(a[0]),bold:walk(a[0],n=>n.tagName==='b').length,unsafe:walk(a[0],n=>['script','img','iframe','style','a'].includes(n.tagName)||Boolean((n.attrs||[]).some(a=>a.name.startsWith('on')))).length};}
 return fields;
}
function reviewedBoldFields(payload,html){
 if(payload.key!=='וירא|יום ראשון')return 0;
 const parse5=require('parse5');let count=0;
 function text(n){return n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');}
 for(const u of payload.sections.mishna.units.filter(u=>u.role==='bartenura')){
  const expected=text(parse5.parseFragment(u.he)),fields=htmlSourceFields(html,u.owner);assert.notEqual(expected,u.he,'QUALIFIED_BOLD_CARRIER_REQUIRED');
  for(const value of Object.values(fields)){assert.equal(value.text,expected,'BARTENURA_VISIBLE_HEBREW:'+u.owner);assert.equal(value.bold,(u.he.match(/<b>/g)||[]).length,'BARTENURA_BOLD_COUNT');assert.equal(value.unsafe,0);count++;}
 }
 assert.equal(count,14);return count;
}
async function boldPresentationControls(api,entry,payload,loader,scheduled){
 const b=payload.sections.mishna.units.find(u=>u.role==='bartenura'),m=payload.sections.mishna.units.find(u=>u.role==='mishna');let checks=0;
 const cases=[
  {input:'<b>כותרת</b>',visible:'כותרת',bold:1},
  {input:'<b>א<b>ב</b>ג</b>',visible:'אבג',bold:2},
  {input:'<b>לא סגור',visible:'<b>לא סגור',bold:0},
  {input:'סיום</b>',visible:'סיום</b>',bold:0},
  {input:'<b onclick="alert(1)">שלום</b>',visible:'<b onclick="alert(1)">שלום</b>',bold:0},
  {input:'<b>א</b><img src=x onerror=alert(1)><script>bad()</script>',visible:'<b>א</b><img src=x onerror=alert(1)><script>bad()</script>',bold:0},
  {input:'&lt;b&gt;מילולי&lt;/b&gt;',visible:'&lt;b&gt;מילולי&lt;/b&gt;',bold:0}
 ];
 for(const c of cases){const html=await api.reading(entry.week,entry.day,'mishna',{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:()=>c.input},loader,scheduled);const actual=htmlSourceFields(html,b.owner).original;assert.equal(actual.text,c.visible);assert.equal(actual.bold,c.bold);assert.equal(actual.unsafe,0);const defaultOwner=htmlSourceFields(html,m.owner).original;assert.equal(defaultOwner.text,c.input,'UNSCOPED_MISHNA_LITERAL_CONSERVATION');assert.equal(defaultOwner.bold,0);assert.equal(defaultOwner.unsafe,0);checks++;}
 const html=await api.reading(entry.week,entry.day,'mishna',{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:s=>s},loader,scheduled);assert.equal(reviewedBoldFields(payload,html),14);return checks;
}
async function verify(root){
 root=path.resolve(root);const oracle=JSON.parse(fs.readFileSync(path.join(root,'scripts/chok-qualified-daily-reviewed.json'),'utf8'));assert.equal(oracle.schema,'chok-qualified-reviewed-hashes-v1');sourceSRI(root);
 const{api,entries}=boot(root),schedule=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'),'utf8'));assert.deepEqual(entries.map(e=>e.key).sort(),oracle.readingKeys.slice().sort());
 let units=0,notes=0,requests=0,boldOriginalFields=0,boldControls=0;const seen=new Set();
 for(const e of entries){
  assert(!seen.has(e.key));seen.add(e.key);const scheduled=schedule.weeks[e.week].days[e.day];assert.deepEqual(e.schedule,scheduled);
  const loader=async url=>{requests++;assert.equal(url,e.url+'?v='+e.payloadSHA256,'UNVERSIONED_PAYLOAD');const filename=path.resolve(root,'public','.'+e.url);assert(filename.startsWith(path.join(root,'public')+path.sep));return fs.readFileSync(filename,'utf8');};
  const payload=await api.load(e.week,e.day,scheduled,loader),count=checkOracle(clone(payload),e,oracle);units+=count.checked;notes+=count.notes;
  for(const section of Object.keys(e.sections)){
   const html=await api.reading(e.week,e.day,section,{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:s=>s},loader,scheduled);assert(html&&html.includes('ck-qualified-daily'));
   if(e.key==='וירא|יום ראשון'&&section==='mishna'){boldOriginalFields+=reviewedBoldFields(payload,html);boldControls+=await boldPresentationControls(api,e,payload,loader,scheduled);}
  }
 }
 assert.equal(units,oracle.units.length);assert.equal(requests,entries.length);return{readings:entries.length,units,bilingualNotes:notes,versionedPayloadRequests:requests,sourceOracle:true,scriptSRI:true,boldOriginalFields,boldControls};
}
module.exports={boot,checkOracle,verify,sourceSRI};
if(require.main===module)verify(path.resolve(__dirname,'..')).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
