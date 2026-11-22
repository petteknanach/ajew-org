'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const keys=o=>Object.keys(o).sort();
function visible(raw){
  return raw.replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|nbsp|quot|#39);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',nbsp:'\u00a0',quot:'"','#39':"'"})[key]);
}
async function run(){
  const proof=JSON.parse(read('scripts/chok-biraishis-talmud-provenance.json'));
  const raw=read('public/reader/chok/biraishis-talmud-selections.json');
  assert.equal(sha(raw),proof.bankSHA256);
  const bank=JSON.parse(raw), main=read('public/chok.js').toString(), tpl=read('src/pages/reader/chok.astro').toString();
  assert(tpl.includes('chok.js?v='+sha(main)+'" integrity="sha384-'+crypto.createHash('sha384').update(main).digest('base64')));
  const schedule=JSON.parse(read('public/reader/chok/schedule.json')).weeks;
  const cache={};
  for(const [source,pin] of Object.entries(proof.sources)){
    assert.match(source,/^scripts\/chok-biraishis-talmud-source\/[a-z0-9-]+\.json$/);
    const b=read(source); assert.equal(sha(b),pin,source); cache[source]=JSON.parse(b);
  }
  assert.equal(bank.schema,'chok-biraishis-talmud/v1');
  assert.deepEqual(keys(bank.days),keys(proof.days));
  for(const [key,x] of Object.entries(proof.days)){
    const [week,day]=key.split('|'); assert(schedule[week].days[day].gemara);
    assert(/^[a-f0-9]{64}$/.test(x.dailyLocatorSHA256));
    assert(Number.isSafeInteger(x.gemaraCount)&&x.gemaraCount>0&&x.gemaraCount<x.sourceRanges.length);
    const extracts=x.sourceRanges.map(y=>{
      const whole=y.pointer.reduce((value,i)=>{assert(Object.hasOwn(value,i));return value[i];},cache[y.path]);
      assert.equal(typeof whole,'string'); assert(['textContent','literal'].includes(y.extraction));
      const t=Array.from(y.extraction==='textContent'?visible(whole):whole);
      assert(Number.isSafeInteger(y.start)&&Number.isSafeInteger(y.end)&&y.start>=0&&y.start<y.end&&y.end<=t.length);
      const selected=t.slice(y.start,y.end).join('');
      return y.extraction==='textContent'?selected.trim():selected;
    });
    assert.deepEqual(extracts.slice(0,x.gemaraCount),bank.days[key].gemara);
    assert.deepEqual(extracts.slice(x.gemaraCount),bank.days[key].rashi);
  }
  const delta=JSON.parse(read('scripts/chok-biraishis-talmud-delta.json'));
  const {restore}=require('./chok-biraishis-talmud-inverse.cjs');
  for(const [name,pin] of Object.entries(delta)){
    const current=read(name), wrong=Buffer.concat([current,Buffer.from(' ')]);
    assert.equal(sha(current),pin.after); assert.equal(sha(restore(name,current)),pin.before); assert.equal(restore(name,wrong),wrong);
  }
  const code=main.slice(main.indexOf('  var BIRAISHIS_TALMUD_KEYS'),main.indexOf('  function isVayetzeiFriday'));
  assert(code.includes('function biraishisTalmudHTML'));
  assert(main.includes('biraishisTalmud ? biraishisTalmudHTML(biraishisTalmud, d) : gemaraHTML(d.gemara, vayetzeiFriday)'));
  const tuesdayKey='בראשית|יום שלישי';
  const six=['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','יום שישי'];
  const affected=['בראשית|יום רביעי','ויצא|יום רביעי','ויצא|יום חמישי',...['וישלח','וישב','מקץ','ויגש','ויחי'].flatMap(w=>six.map(d=>w+'|'+d))];
  assert.deepEqual(keys(bank.days),affected.sort());
  assert(bank.tuesday,'the independently reviewed Tuesday bilingual selection is required');
  {
    assert.equal(bank.tuesday.key,tuesdayKey);
    assert.equal(bank.tuesday.payloadSHA256,'ef848687893ebcecae70e2d38ef60cf8d29599229230fc105b290c92dfac36db');
    const t=read('public'+bank.tuesday.url);
    assert.equal(sha(t),bank.tuesday.payloadSHA256);
    const section=JSON.parse(t).sections.talmud;
    assert.equal(section.units.length,7);
    assert.equal(section.units.filter(u=>u.role==='gemara').length,1);
    assert.equal(section.units.filter(u=>u.role==='prescribed-rashi').length,6);
    assert(section.units.every(u=>u.he&&u.en&&u.explanation));
  }
  let requests=0, expected=raw.toString();
  const context=vm.createContext({
    fetchJSON:async (url,isRaw)=>{requests++;assert(isRaw);assert.equal(url,'/reader/chok/biraishis-talmud-selections.json?v='+proof.bankSHA256);return expected;},
    state:{language:'both',commentary:true},applyWednesdayMode:x=>x,
    onkelosHash:async s=>sha(s),richText:x=>x,applyMode:x=>x,esc:x=>x,commDetails:(label,s)=>s
  });
  vm.runInContext(code,context);
  for(const [week,record] of Object.entries(schedule)) for(const day of Object.keys(record.days)){
    const key=week+'|'+day;
    assert.equal(context.biraishisTalmudKey(week,day),Object.hasOwn(bank.days,key)||(bank.tuesday&&key===tuesdayKey)?key:null);
  }
  const extract=(html,cls)=>Array.from(html.matchAll(new RegExp('<div class="'+cls+'">([\\s\\S]*?)</div>','g')),m=>m[1]);
  for(const key of keys(bank.days)){
    const html=await context.biraishisTalmudHTML(key);
    assert.deepEqual(extract(html,'ck-gemara-line'),bank.days[key].gemara);
    assert.deepEqual(extract(html,'ck-comm-body'),bank.days[key].rashi);
  }
  assert.equal(requests,1);
  assert((await context.biraishisTalmudHTML('not a daily key')).includes('ck-source-unavailable'));
  context.biraishisTalmudPromise=null; expected=raw.toString()+' ';
  const key=keys(bank.days)[0]; assert((await context.biraishisTalmudHTML(key)).includes('ck-source-unavailable'));
  expected=raw.toString(); assert.deepEqual(extract(await context.biraishisTalmudHTML(key),'ck-gemara-line'),bank.days[key].gemara);
  console.log(JSON.stringify({gate:'BIRAISHIS_TALMUD_EXACT_DAILY_RANGES',selected:keys(bank.days).length+1,verifiedSourceFiles:keys(cache).length,bilingualQualified:1,pass:true}));
}
module.exports={run};
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
