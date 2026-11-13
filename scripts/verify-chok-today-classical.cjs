/* Genuine selected API and complete registered Main initializer, modeled DOM only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash,webcrypto}=require('node:crypto');
const {createRequire}=require('node:module');
const dep=createRequire(process.env.AJEW_TEST_DEPENDENCY_ANCHOR||path.join(__dirname,'../package.json'));
const parse5=dep('parse5');
const root=path.resolve(process.env.AJEW_PRIVATE_CANDIDATE||path.join(__dirname,'..'));
const selected=require('./verify-chok-qualified-daily.cjs');
const admission=require('./chok-today-classical-admission.cjs');
const sha=x=>createHash('sha256').update(x).digest('hex');
const clone=x=>JSON.parse(JSON.stringify(x));
function sri(raw,declared){assert(/^sha(?:256|384|512)-[A-Za-z0-9+/]+=*$/.test(declared),'SRI_ALGORITHM');const algorithm=declared.split('-')[0];return algorithm+'-'+createHash(algorithm).update(raw).digest('base64');}
const attr=(n,k)=>(n.attrs||[]).find(x=>x.name===k)?.value;
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
function walk(n,f,out=[]){if(f(n))out.push(n);for(const c of n.childNodes||[])walk(c,f,out);return out;}
function visible(n){for(let p=n;p;p=p.parentNode)if(attr(p,'hidden')!==undefined||p.tagName==='details'&&attr(p,'open')===undefined)return false;return true;}
function fields(html,section,plan){
 const doc=parse5.parseFragment(html),s=clone(section.units);
 for(const u of s){
  const owners=walk(doc,n=>attr(n,'data-reading-unit')===u.owner);assert.equal(owners.length,1,'REAL_OWNER:'+u.owner);const owner=owners[0];
  const original=walk(owner,n=>attr(n,'data-daily-field')==='original');assert.equal(original.length,1);assert.equal(text(original[0]),u.he,'COMPLETE_ORIGINAL:'+u.owner);
  const english=walk(owner,n=>attr(n,'data-daily-field')==='en'&&n.parentNode===owner);assert.equal(english.length,1);assert.equal(text(english[0]),u.en,'COMPLETE_ENGLISH:'+u.owner);
  const ex=walk(owner,n=>attr(n,'data-daily-field')==='explanation')[0];assert(ex);const summary=(ex.childNodes||[]).find(n=>n.tagName==='summary');assert.equal(text(summary),u.explanation.title.he+' · '+u.explanation.title.en);
  for(const lang of ['he','en']){const ps=walk(ex,n=>attr(n,'data-daily-field')===lang);assert.deepEqual(ps.map(text),u.explanation.paragraphs.map(p=>p[lang]),'COMPLETE_EXPLANATION:'+lang);}
  for(const note of u.notes){const ns=walk(doc,n=>attr(n,'data-daily-note')===note.id);assert.equal(ns.length,1);assert.equal(attr(ns[0],'data-note-owner'),u.owner);assert(visible(ns[0]),'MANDATORY_VISIBLE:'+note.id);for(const lang of ['he','en'])assert.equal(text(walk(ns[0],n=>attr(n,'lang')===lang)[0]),note[lang]);assert(!walk(owner,n=>attr(n,'data-daily-note')===note.id).length,'NOT_INSIDE_OPTIONAL_OWNER');}
 }
 return {units:s.length,notes:s.reduce((n,u)=>n+u.notes.length,0),owners:s.map(u=>u.owner)};
}
async function apiCase(){
 const a=admission.plan(root),{api,libraryAPI,entries}=selected.boot(root),e=entries.find(e=>e.key===a.key);assert(e);assert.deepEqual(e,a.newDescriptor);
 const schedule=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'),'utf8')),day=schedule.weeks[e.week].days[e.day];let requests=0;
 const loader=async url=>{requests++;assert.equal(url,e.url+'?v='+e.payloadSHA256);return fs.readFileSync(path.join(root,'public'+e.url),'utf8');};
 const payload=await api.load(e.week,e.day,day,loader),oracle={units:[]};admission.check(root,oracle);
 // Old Mishna/Gemara rows remain independently checked by their existing complete package caller.
 const ownPayload=clone(payload),ownEntry=clone(e);delete ownPayload.sections.mishna;delete ownPayload.sections.talmud;delete ownEntry.sections.mishna;delete ownEntry.sections.talmud;
 selected.checkOracle(ownPayload,ownEntry,oracle);
 let rendered=0;for(const name of ['halacha','mussar'])for(const language of ['both','he'])for(const commentary of [true,false]){
  assert(api.has(e.week,e.day,name));const html=await api.reading(e.week,e.day,name,{language,mode:'full',commentary,optionalRashi:false,transform:s=>s},loader,day);fields(html,payload.sections[name],e.sections[name]);rendered++;
 }
 // Source, schedule, descriptor and full-tail mutations are refused through the actual API.
 let rejected=0;
 for(const name of ['halacha','mussar']){
  const bad=clone(payload);bad.sections[name].units.at(-1).he+=' drift';const fresh=libraryAPI.create([e]);await assert.rejects(fresh.load(e.week,e.day,day,async()=>JSON.stringify(bad)));rejected++;
 }
 const wrong=clone(day);wrong.halacha={work:'not-prescribed'};await assert.rejects(libraryAPI.create([e]).load(e.week,e.day,wrong,loader));rejected++;
 const badEntry=clone(e);badEntry.sections.halacha.units.reverse();const altered=libraryAPI.create([badEntry]);await assert.rejects(altered.load(e.week,e.day,day,loader));rejected++;
 const restored=await api.reading(e.week,e.day,'mussar',{language:'he',mode:'full',commentary:false,optionalRashi:false,transform:s=>s},loader,day);fields(restored,payload.sections.mussar,e.sections.mussar);
 return{case:'actual-selected-api',rendered,rejected,requests,units:5,notes:8,completeSchedule:true,restored:true};
}
async function mainCase(focus,before=false){
 const {documentFor,sandbox,until}=require('./qualified-parsha-test-dom.cjs');
 const template=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8'),inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const d=documentFor('<html><head></head><body>'+inner+'</body></html>');const starts=[],completed=[],staticScripts=[],dynamicEvents=[],arrayBuffers=[];let active=0,peak=0;
 const response=async url=>{const pathname=decodeURIComponent(String(url).split('?')[0]);assert(pathname.startsWith('/')&&!pathname.includes('..'));starts.push(String(url));active++;peak=Math.max(peak,active);try{await new Promise(r=>setTimeout(r,1));const raw=fs.readFileSync(path.join(root,'public'+pathname),'utf8');completed.push({url:String(url),bytes:Buffer.byteLength(raw),sha256:sha(raw)});return{ok:true,status:200,text:async()=>raw,json:async()=>JSON.parse(raw),arrayBuffer:async()=>{arrayBuffers.push(String(url));const b=Buffer.from(raw);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};}finally{active--;}};
 const h=sandbox(d,'/reader/chok/',response);h.box.location.search='?week='+encodeURIComponent('וירא')+'&day='+encodeURIComponent('יום שישי')+(focus?'&sec='+focus:'');
 const append=d.head.appendChild.bind(d.head);d.head.appendChild=function(n){const result=append(n);if(String(n.tagName).toLowerCase()==='script')Promise.resolve().then(async()=>{try{const src=n.src||n.getAttribute('src'),r=await response(src),raw=Buffer.from(await r.arrayBuffer()).toString('utf8');assert.equal(n.integrity||n.getAttribute('integrity'),sri(raw,n.integrity||n.getAttribute('integrity')));vm.runInContext(raw,h.box,{filename:src});dynamicEvents.push({event:'load',src,integrity:n.integrity||n.getAttribute('integrity')});n.onload?.();}catch(e){dynamicEvents.push({event:'error',src:n.src||n.getAttribute('src'),error:String(e)});n.onerror?.(e);}});return result;};
 try{
  for(const m of template.matchAll(/<script[^>]*src="([^\"]+)"[^>]*><\/script>/g)){
   assert(/\sdefer(?:\s|>)/.test(m[0]),'ACTUAL_STATIC_DEFER');const src=m[1].replace(/&amp;/g,'&'),raw=fs.readFileSync(path.join(root,'public'+decodeURIComponent(src.split('?')[0])),'utf8'),integrity=/integrity="([^"]+)"/.exec(m[0]);if(integrity)assert.equal(integrity[1],sri(raw,integrity[1]));staticScripts.push({order:staticScripts.length,src,defer:true,integrity:integrity?.[1]||null,bytes:Buffer.byteLength(raw),sha256:sha(raw)});vm.runInContext(raw,h.box,{filename:src});
  }
  await until(()=>!!d.querySelector('#ck-content').innerHTML&&!d.querySelector('.ck-loading'),45000);
  assert(!d.querySelector('#ck-content .ck-error'),'NO_MAIN_ERROR');assert(peak<=6,'ONE_REAL_QUEUE');assert.equal(active,0,'TRANSPORTS_SETTLED');
  const a=before?null:admission.plan(root),payload=before?null:JSON.parse(fs.readFileSync(path.join(root,'public'+a.newDescriptor.url),'utf8'));
  const results={};for(const name of ['halacha','mussar'])if(!before&&(!focus||focus===name)){const section=d.querySelector('#ck-content [data-sec="'+name+'"]');assert(section,'OUTER_AVAILABILITY:'+name);results[name]=fields(section.innerHTML,payload.sections[name],a.newDescriptor.sections[name]);assert(!section.innerHTML.includes('temporarily unavailable'));}
  // Real registered independent language control; mandatory notes survive English off.
  const button=d.querySelector('[data-ck-daily-language="he"]');assert(button);button.click();
  for(const name of Object.keys(results)){const section=d.querySelector('#ck-content [data-sec="'+name+'"]');fields(section.innerHTML,payload.sections[name],a.newDescriptor.sections[name]);}
  const sections=d.querySelectorAll('#ck-content [data-sec]').map(n=>({section:n.getAttribute('data-sec'),html:{bytes:Buffer.byteLength(n.innerHTML),sha256:sha(n.innerHTML)},text:{bytes:Buffer.byteLength(n.textContent),sha256:sha(n.textContent)}}));
  assert(sections.every(s=>typeof s.html.sha256==='string'));if(!focus)for(const name of ['torah','navi','kesuvim','mishna','talmud','kabbala','halacha','mussar'])assert(sections.some(s=>s.section===name),'ORDINARY_COMPLETE_SECTION:'+name);
  return{case:focus?'focused-'+focus:'ordinary-complete-Friday',results,peak,starts,completed,staticScripts,dynamicEvents,arrayBuffers,sections,scheduleSHA256:sha(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'))),predecessor:before,modeledDOM:true,native:false};
 }catch(error){console.log(JSON.stringify({partial:true,case:focus||'ordinary',starts,completed,staticScripts,dynamicEvents,arrayBuffers,errors:d.querySelectorAll('#ck-content .ck-error').map(n=>n.textContent),sections:d.querySelectorAll('#ck-content [data-sec]').map(n=>({section:n.getAttribute('data-sec'),html:n.innerHTML,text:n.textContent}))}));throw error;}finally{h.close();}
}
async function saOptionalCase(){
 const {documentFor,sandbox,until}=require('./qualified-parsha-test-dom.cjs');
 const nativePath=path.join(root,'scripts/chok-sa-optional-native-availability.json'),nativeRaw=fs.readFileSync(nativePath);assert.equal(sha(nativeRaw),'4745d767ed6cd16b739bfd2ce563c44df8fb22bedfbd41b1c31936990429fd65','SA_OPTIONAL_NATIVE_AUTHORITY_PIN');
 const native=JSON.parse(nativeRaw),rows=native.assets;assert.equal(native.canonical,'964fc26dd00448e6c48ffb2e73a1e7bd531d0d5e');
 const main=fs.readFileSync(path.join(root,'public/chok.js'),'utf8'),literal=/  var SA_MA_AVAILABLE = (\{[^\n]+\});/.exec(main);assert(literal);
 const availability=JSON.parse(literal[1]);assert.deepEqual(Object.keys(availability).sort(),rows.map(r=>r.slug).sort(),'ALL_NATIVE_IDENTITIES_NOT_COUNT_ONLY');assert(Object.values(availability).every(v=>v===true));
 const directory=path.join(root,'public/reader/commentary/sa-magen-avraham');assert.deepEqual(fs.readdirSync(directory).map(n=>'public/reader/commentary/sa-magen-avraham/'+n).sort(),rows.map(r=>r.path).sort());
 for(const row of rows){const p=path.join(root,row.path),raw=fs.readFileSync(p);assert.equal(raw.length,row.bytes);assert.equal((fs.statSync(p).mode&0o777).toString(8),'644');assert.equal(row.mode,'100644');assert.equal(cryptoBlob(raw),row.gitBlob,'NATIVE_COMMENTARY_GIT_BLOB:'+row.slug);assert.equal(availability[row.slug],true,'EVERY_SUPPORTED_ASSET_REQUESTABLE');}
 assert.equal(Object.hasOwn(availability,'sa-yd-249'),false);assert.equal(availability['sa-yd-257'],true);
 const outer=require('./chok-sa-optional-inverse.cjs'),bankPath=path.join(root,'scripts/chok-sa-optional-admission.json'),bankRaw=fs.readFileSync(bankPath),bank=JSON.parse(bankRaw);
 for(const [rel,row] of Object.entries(bank.paths)){const b=fs.readFileSync(path.join(root,rel));assert.deepEqual(outer.restore(rel,b),Buffer.from(row.beforeUTF8));assert.equal(outer.restore('wrong-owner',b),b);for(const pos of [0,Math.floor(b.length/2),b.length-1]){const bad=Buffer.from(b);bad[pos]^=1;assert.equal(outer.restore(rel,bad),bad);}}
 assert.equal(sha(outer.restore('public/chok.js',Buffer.from(main))),'1d9e4563b3f8263d28978356f03e14756930286b270a6f01d7d289b7aa418e51');
 try{for(const pos of [0,Math.floor(bankRaw.length/2),bankRaw.length-1]){const bad=Buffer.from(bankRaw);bad[pos]^=1;fs.writeFileSync(bankPath,bad);assert.throws(()=>outer.restore('public/chok.js',Buffer.from(main)),/SA_OPTIONAL_BANK_PIN/);fs.writeFileSync(bankPath,bankRaw);assert.equal(sha(outer.restore('public/chok.js',Buffer.from(main))),'1d9e4563b3f8263d28978356f03e14756930286b270a6f01d7d289b7aa418e51');}}finally{fs.writeFileSync(bankPath,bankRaw);}
 function cryptoBlob(b){return createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');}
 const template=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8'),inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const schedule=JSON.parse(fs.readFileSync(path.join(root,'public/reader/chok/schedule.json'),'utf8'));
 async function initialized(week,day,failOptional=false,expectMissingBase=false){
  const d=documentFor('<html><head></head><body>'+inner+'</body></html>'),starts=[],transportErrors=[],dynamicErrors=[];let active=0;
  const optional='/reader/commentary/sa-magen-avraham/sa-yd-257.json';
  const response=async url=>{const pathname=decodeURIComponent(String(url).split('?')[0]);assert(pathname.startsWith('/')&&!pathname.includes('..'));starts.push(pathname);active++;try{await new Promise(r=>setTimeout(r,1));if(failOptional&&pathname===optional)throw Error('KNOWN_AVAILABLE_OPTIONAL_TRANSPORT_REJECTION');const raw=fs.readFileSync(path.join(root,'public'+pathname));return{ok:true,status:200,text:async()=>raw.toString('utf8'),json:async()=>JSON.parse(raw),arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};}catch(e){transportErrors.push({pathname,error:String(e)});throw e;}finally{active--;}};
  const h=sandbox(d,'/reader/chok/',response);h.box.location.search='?week='+encodeURIComponent(week)+'&day='+encodeURIComponent(day)+'&sec=halacha';
  const append=d.head.appendChild.bind(d.head);d.head.appendChild=function(n){const result=append(n);if(String(n.tagName).toLowerCase()==='script')Promise.resolve().then(async()=>{try{const src=n.src||n.getAttribute('src'),r=await response(src),raw=Buffer.from(await r.arrayBuffer());assert.equal(n.integrity||n.getAttribute('integrity'),sri(raw,n.integrity||n.getAttribute('integrity')));vm.runInContext(raw.toString('utf8'),h.box,{filename:src});n.onload?.();}catch(e){dynamicErrors.push(String(e));n.onerror?.(e);}});return result;};
  try{
   for(const m of template.matchAll(/<script[^>]*src="([^\"]+)"[^>]*><\/script>/g)){assert(/\sdefer(?:\s|>)/.test(m[0]));const src=m[1].replace(/&amp;/g,'&'),raw=fs.readFileSync(path.join(root,'public'+decodeURIComponent(src.split('?')[0]))),integrity=/integrity="([^"]+)"/.exec(m[0]);if(integrity)assert.equal(integrity[1],sri(raw,integrity[1]));vm.runInContext(raw.toString('utf8'),h.box,{filename:src});}
   async function settled(){await until(()=>!!d.querySelector('#ck-content').innerHTML&&!d.querySelector('#ck-content .ck-loading')&&active===0,45000);assert.equal(dynamicErrors.length,0);}
   await settled();for(const [id,value] of [['ck-language','both'],['ck-mode','full'],['ck-commentary',true]]){const n=d.getElementById(id);if(typeof value==='boolean')n.checked=value;else n.value=value;n.dispatchEvent({type:'change',target:n});await settled();}
   if(expectMissingBase){assert.throws(()=>assert.equal(transportErrors.length,0,'NO_MISSING_OR_FAKE_INPUT'),/NO_MISSING_OR_FAKE_INPUT/);assert(transportErrors.some(e=>e.pathname==='/reader/shulchan/YD.json'&&e.error.includes('ENOENT')));return{requiredMissingRejected:true};}
   if(failOptional){assert(transportErrors.length>0);assert(transportErrors.every(e=>e.pathname===optional&&e.error.includes('KNOWN_AVAILABLE_OPTIONAL_TRANSPORT_REJECTION')));}else assert.equal(transportErrors.length,0,'NO_MISSING_OR_FAKE_INPUT');
   const prescription=schedule.weeks[week].days[day].halacha;assert.equal(prescription.work,'SA');const base=JSON.parse(fs.readFileSync(path.join(root,'public/reader/shulchan/'+prescription.tur+'.json'),'utf8')).sim[String(prescription.from)];assert(base.length>0);
   const section=d.querySelector('#ck-content [data-sec="halacha"]');assert(section);const items=[...section.querySelectorAll('.ck-halacha-item')];assert.equal(items.length,base.length,'COMPLETE_BASE_SA');for(let i=0;i<base.length;i++){const prefix=items[i].querySelector('.ck-hnum');assert(prefix);const expected=documentFor('<div>'+h.box.window.ChokSources.richText(base[i])+'</div>').querySelector('div').textContent;assert.equal(items[i].textContent,prefix.textContent+expected,'UNCHANGED_BASE_SA:'+i);}
   const slug='sa-'+prescription.tur.toLowerCase()+'-'+prescription.from,url='/reader/commentary/sa-magen-avraham/'+slug+'.json',ma=[...section.querySelectorAll('.ck-comm-body')];
   if(slug==='sa-yd-249'){assert(!starts.includes(url),'ABSENT_OPTIONAL_NO_REQUEST');assert.equal(ma.length,0);}else{assert.equal(slug,'sa-yd-257');assert(starts.includes(url),'AVAILABLE_OPTIONAL_REAL_REQUEST');if(failOptional)assert.equal(ma.length,0);else{const ch=JSON.parse(fs.readFileSync(path.join(root,'public'+url),'utf8')).ch['257'].filter(Boolean);assert(ch.length>0);assert.deepEqual(ma.map(n=>n.textContent),ch.map(x=>documentFor('<div>'+h.box.window.ChokSources.richText(x)+'</div>').querySelector('div').textContent),'REAL_COMPLETE_AVAILABLE_COMMENTARY');}}
   return{slug,baseItems:items.length,commentaryItems:ma.length,requestMade:starts.includes(url),optionalTransportRejected:failOptional};
  }finally{h.close();}
 }
 const absent=await initialized('לך לך','יום רביעי'),available=await initialized('וירא','יום ראשון'),failedAvailable=await initialized('וירא','יום ראשון',true);
 const basePath=path.join(root,'public/reader/shulchan/YD.json'),held=basePath+'.sa-optional-required-negative';assert(!fs.existsSync(held));fs.renameSync(basePath,held);let missingRequired;
 try{missingRequired=await initialized('לך לך','יום רביעי',false,true);}finally{fs.renameSync(held,basePath);}
 const restored=await initialized('וירא','יום ראשון');
 return{nativeAssets:rows.length,exactIdentitySet:true,outerInversePaths:Object.keys(bank.paths).length,outerBankCorruptionControls:3,absent,available,failedAvailable,missingRequired,restored,modeledDOM:true,native:false};
}

async function run(){const mode=process.argv[2]||'api';const result=mode==='api'?await apiCase():await mainCase(mode==='ordinary'||mode==='baseline'?null:mode,mode==='baseline');if(mode==='ordinary')result.saOptional=await saOptionalCase();console.log(JSON.stringify(result));return result;}
module.exports={apiCase,mainCase,fields};if(require.main===module)run().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
