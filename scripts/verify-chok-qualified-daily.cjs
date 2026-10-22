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
  const ordinals=section.units.filter(u=>u.role==='mishna').map(u=>{const m=/-(\d+)-(\d+)$/.exec(u.owner);assert(m);assert.equal(Number(m[1]),section.reference.perek);return Number(m[2]);});assert.deepEqual(ordinals,Array.from({length:section.extent.last-section.extent.first+1},(_,i)=>section.extent.first+i),'REVIEWED_EXTENT_ORDINALS');
  for(const u of section.units){
   const a=approved.get(u.owner);assert(a,'UNREVIEWED_OWNER');assert.equal(u.role,a.role);assert.equal(u.status,'complete');
   assert.equal(sha(u.he),a.originalSHA256,'REVIEWED_ORIGINAL_MISMATCH:'+u.owner);assert.equal(sha(u.en),a.englishSHA256,'REVIEWED_ENGLISH_MISMATCH:'+u.owner);
   assert.equal(sha(u.explanation.paragraphs.map(p=>p.he).join('\n\n')),a.explanationHeSHA256,'REVIEWED_HE_EXPLANATION_MISMATCH:'+u.owner);
   assert.equal(sha(u.explanation.paragraphs.map(p=>p.en).join('\n\n')),a.explanationEnSHA256,'REVIEWED_EN_EXPLANATION_MISMATCH:'+u.owner);
   assert.deepEqual(u.notes.map(n=>({id:n.id,owner:n.owner,role:n.role,placement:n.placement,heSHA256:sha(n.he),enSHA256:sha(n.en),sourceTextSHA256:n.sourceTextSHA256,span:n.span})),a.notes,'REVIEWED_NOTE_MISMATCH:'+u.owner);
   const plan=entry.sections[name].units.find(x=>x.owner===u.owner);assert(plan);assert.equal(plan.edition,a.edition);assert.equal(plan.provenanceSHA256,a.provenanceSHA256);
   for(const g of[plan.admission,entry.sections[name].admission,entry.admission])for(const decision of Object.values(g)){assert.equal(decision.decision,'accepted');assert.equal(decision.evidenceSHA256,oracle.authoritySHA256);}
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
async function verify(root){
 root=path.resolve(root);const oracle=JSON.parse(fs.readFileSync(path.join(root,'scripts/chok-qualified-daily-reviewed.json'),'utf8'));assert.equal(oracle.schema,'chok-qualified-reviewed-hashes-v1');sourceSRI(root);
 const{api,entries}=boot(root),schedule=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'),'utf8'));assert.deepEqual(entries.map(e=>e.key).sort(),oracle.readingKeys.slice().sort());
 let units=0,notes=0,requests=0;const seen=new Set();
 for(const e of entries){
  assert(!seen.has(e.key));seen.add(e.key);const scheduled=schedule.weeks[e.week].days[e.day];assert.deepEqual(e.schedule,scheduled);
  const loader=async url=>{requests++;assert.equal(url,e.url+'?v='+e.payloadSHA256,'UNVERSIONED_PAYLOAD');const filename=path.resolve(root,'public','.'+e.url);assert(filename.startsWith(path.join(root,'public')+path.sep));return fs.readFileSync(filename,'utf8');};
  const payload=await api.load(e.week,e.day,scheduled,loader),count=checkOracle(clone(payload),e,oracle);units+=count.checked;notes+=count.notes;
  assert.deepEqual(Object.keys(e.sections),['mishna']);
  const html=await api.reading(e.week,e.day,'mishna',{language:'both',mode:'full',commentary:true,optionalRashi:false,transform:s=>s},loader,scheduled);assert(html&&html.includes('ck-qualified-daily'));
 }
 assert.equal(units,oracle.units.length);assert.equal(requests,entries.length);return{readings:entries.length,units,bilingualNotes:notes,versionedPayloadRequests:requests,sourceOracle:true,scriptSRI:true};
}
module.exports={boot,checkOracle,verify,sourceSRI};
if(require.main===module)verify(path.resolve(__dirname,'..')).then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.stack||String(error));process.exitCode=1;});
