const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'public/chok.js'),'utf8'),before=cp.execFileSync('git',['-c','core.packedGitWindowSize=1m','-c','core.packedGitLimit=4m','show','b80ca1375a562117acd8b2b08d428fdaaddc154d:public/chok.js'],{cwd:root,encoding:'utf8'});
const a=code.indexOf('  /* CHOK_FRIDAY_BEGIN'),b=code.indexOf('  /* CHOK_FRIDAY_END */')+'  /* CHOK_FRIDAY_END */\n'.length,block=code.slice(a,b);assert(a>=0&&b>a);
const c=code.indexOf('          var fridayPlans = fridayNachPlans('),d=code.indexOf('          var sec = d[pair[0]];',c),callback=code.slice(c,d);assert(c>=0&&d>c);
assert.equal(code.replace(block,'').replace(callback,''),before,'all unrelated code byte-exact');
const box={Promise};vm.createContext(box);vm.runInContext(block,box);assert.equal(Object.keys(box.CHOK_FRIDAY_HAFTARA).length,12);
assert.equal(box.fridayNachPlans('לך לך','יום שישי','navi')[0].from.c,40);assert.equal(box.fridayNachPlans('לך לך','יום שישי','navi')[0].from.v,27);assert.equal(box.fridayNachPlans('לך לך','יום שישי','navi')[0].to.c,41);assert.equal(box.fridayNachPlans('לך לך','יום שישי','navi')[0].to.v,16);
for(const wk of Object.keys(box.CHOK_FRIDAY_HAFTARA)){
 assert(box.fridayNachPlans(wk,'יום שישי','navi').length>0);const ps=box.fridayNachPlans(wk,'יום שישי','kesuvim')[0];assert.equal(ps.from.c,93);assert.equal(ps.from.v,1);assert.equal(ps.to.v,5);assert.equal(ps.optional,true);assert.equal(box.fridayNachPlans(wk,'יום חמישי','navi'),null);
}
(async()=>{
 let count=0;
 for(const wk of Object.keys(box.CHOK_FRIDAY_HAFTARA))for(const kind of ['navi','kesuvim']){
  const calls=[],out=[];Object.assign(box,{wk,dayE:'יום שישי',pair:[kind,kind],want:()=>true,out,versesHTML:(...args)=>{calls.push(args);return Promise.resolve('<article>unchanged source body</article>');},secHead:s=>'<h2>'+s+'</h2>',refStr:p=>p.from.c+':'+p.from.v+'-'+p.to.c+':'+p.to.v,popBtn:()=>''});
  const promise=vm.runInContext('(function(){'+callback+'})()',box);await promise;assert.equal(out.length,1);assert.equal(calls.length,box.fridayNachPlans(wk,'יום שישי',kind).length);assert(out[0].includes('unchanged source body'));
  if(kind==='kesuvim'){assert(out[0].includes('(רשות)'));assert(out[0].includes('<details class="ck-friday-psalm">'));assert(!out[0].includes('<details open'));}
  else assert(out[0].includes('הפטרה'));
  count++;
 }
 const compiler=require(path.join(process.env.AJEW_TEST_DEPENDENCIES||root,'node_modules/@astrojs/compiler'));const compiled=await compiler.transform(fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8'),{filename:'src/pages/reader/chok.astro'});assert.equal(compiled.diagnostics.filter(d=>d.severity===1).length,0);
 console.log(JSON.stringify({pass:true,actualFridayCallbacks:count,fullStandardHaftaraPlans:12,optionalPsalm93Plans:12,weekdayConserved:true,completeOwningCodeInverse:true,astroErrors:0,nativeOrFullReaderClaim:false}));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
