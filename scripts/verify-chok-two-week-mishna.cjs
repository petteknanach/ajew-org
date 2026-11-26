'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const box=vm.createContext({window:{crypto:crypto.webcrypto},TextEncoder,console});
vm.runInContext(read('public/chok-qualified-daily.js'),box);
const lib=box.window.ChokQualifiedDaily, f='public/reader/chok/selected-two-week-mishna-romm-v1.json';
const {proof,restore}=require('./chok-two-week-mishna-inverse.cjs');
const bold=/<\/?b>/g;
async function main(){
 const raw=read(f),bank=JSON.parse(raw); assert.equal(sha(raw),proof.bankSHA256);
 assert.equal(bank.schema,'chok-mishna-two-weeks-v1');assert(bank.entries.length>0);
 const api=lib.create(bank.entries), sched=JSON.parse(read('public/reader/chok/schedule.json')).weeks;
 const previous=box.window.ChokQualifiedDaily;
 vm.runInContext(read('public/chok-qualified-daily-classical-selected-v1.js'),box);
 const older=box.window.ChokQualifiedDailySelected;
 assert.equal(previous,lib);
 let paints=0, units=0, notes=0;
 for(const p of Object.keys(proof.paths)){
  const b=Buffer.from(read(p)), bad=Buffer.concat([b,Buffer.from(' ')]), row=proof.paths[p];
  assert.equal(sha(b),row.after); assert.equal(sha(restore(p,b)),row.before); assert.equal(restore(p,bad),bad);
 }
 assert(!fs.existsSync(path.join(root,'public/reader/chok/selected-two-week-mishna-v1.json')),'withheld bank must not ship');
 for(const e of bank.entries){
  assert(e.url.endsWith('-mishna-bartenura-romm-v1.json')); assert(e.sections.mishna.units.every(u=>u.edition===(u.role==='mishna'?'Mishnah, ed. Romm, Vilna 1913':'On Your Way')));
  assert(['וישלח','וישב'].includes(e.week)); assert(sched[e.week].days[e.day].mishna); assert(!older.has(e.week,e.day,'mishna'));
  assert(api.has(e.week,e.day,'mishna')&&!api.has(e.week,e.day,'talmud'));
  const packet=read('public'+e.url), expected=JSON.parse(packet).sections.mishna.units;
  assert.equal(sha(packet),e.payloadSHA256); assert.equal(expected.length,2*e.sections.mishna.extent.lastMishna); assert(expected.every((u,i)=>u.role===(i%2?'bartenura':'mishna')));
  assert.deepEqual(e.schedule,sched[e.week].days[e.day]);
  let req=0; const loader=async u=>{req++;assert.equal(u,e.url+'?v='+e.payloadSHA256);return packet};
  await assert.rejects(api.load(e.week,e.day,{...e.schedule,mishna:{...e.schedule.mishna,perek:1}},loader),/identity mismatch/);assert.equal(req,0);
  const fresh=lib.create([e]); await assert.rejects(fresh.load(e.week,e.day,e.schedule,async()=>packet+' '),/digest mismatch/);
  const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(const language of ['he','en','both','original'])for(const mode of ['full','nikud','taamim','letters'])for(const commentary of [false,true]){
   const result=await api.reading(e.week,e.day,'mishna',{language,mode,commentary,optionalRashi:false,transform:x=>x},loader,e.schedule);
   assert(result.includes('data-daily-language="'+language+'"'));assert(result.includes('data-daily-commentary="'+(commentary?'on':'off')+'"'));
   assert.equal((result.match(/data-reading-unit=/g)||[]).length,expected.filter(u=>u.status==='complete').length);
   for(const u of expected){
    for(const n of u.notes)assert(result.includes(escape(n.he))&&result.includes(escape(n.en)));
    if(u.status==='source-empty'){assert(!result.includes('data-reading-unit="'+u.owner+'"'));continue;}
    assert(result.includes(escape(u.en)),u.owner+' English');
    for(const ex of u.explanation.paragraphs){assert(result.includes(escape(ex.he))&&result.includes(escape(ex.en)),u.owner+' explanation');}
   }
   assert.equal((result.match(/data-reading-role="optional-rashi"/g)||[]).length,0);paints++;
  }
  assert.equal(req,1); units+=expected.length;notes+=expected.reduce((a,b)=>a+b.notes.length,0);
 }
 for(const w of ['וישלח','וישב'])assert(!api.has(w,'ליל שישי','mishna'));
 console.log(JSON.stringify({days:bank.entries.length,units,notes,paints,pass:true}));
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
