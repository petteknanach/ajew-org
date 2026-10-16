#!/usr/bin/env node
'use strict';
// Complete real-schedule/source audit + actual full-init Torah output.
// HTML5 DOM evidence only; native browser/paint and source-language approval separate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {boot}=require('./verify-chok-verse-breslov.cjs');
const root=path.resolve(__dirname,'..');
function raw(rel){const p=path.join(root,rel);return fs.existsSync(p)?fs.readFileSync(p,'utf8'):execFileSync('git',['show','HEAD:'+rel],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024});}
const json=rel=>JSON.parse(raw(rel));
const schedule=json('public/reader/chok/schedule.json');
const args=process.argv.slice(2),index=args.indexOf('--evidence'),evidence=index<0?null:path.resolve(args[index+1]);
if(evidence)fs.mkdirSync(evidence,{recursive:true});
function save(name,data){if(evidence)fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n');}
const alignment=json('public/reader/chok/onkelos-verse-alignment.json');
const effective=new Map();
function effectiveTargum(slug){
 if(effective.has(slug))return effective.get(slug);
 const rel='public/reader/medooyuk/targum/'+slug+'.json',original=json(rel),out=structuredClone(original),spec=alignment.books[slug];
 if(spec){assert.equal(crypto.createHash('sha256').update(raw(rel)).digest('hex'),spec.sourceSHA256);for(const row of spec.overrides){const [c,v]=row.target.split(':'),[sc,sv]=row.source.split(':');out.ch[c]||={};out.ch[c][v]=[...original.ch[sc][sv]].slice(...row.span).join('');}}
 effective.set(slug,out);return out;
}
const books=new Map(),targums=new Map(),slots=[];
for(const [week,w] of Object.entries(schedule.weeks)){
 if(!books.has(w.slug)){books.set(w.slug,json('public/reader/medooyuk/'+w.slug+'.json'));targums.set(w.slug,effectiveTargum(w.slug));}
 for(const [day,d] of Object.entries(w.days)){
  assert(d.torah&&d.torah.from&&d.torah.to,'Explicit Torah boundaries '+week+' '+day);
  const refs=[];for(let c=d.torah.from.c;c<=d.torah.to.c;c++)for(const v of Object.keys(books.get(w.slug).ch[c]).map(Number).sort((a,b)=>a-b))if((c!==d.torah.from.c||v>=d.torah.from.v)&&(c!==d.torah.to.c||v<=d.torah.to.v)){
   const body=targums.get(w.slug).ch[c]?.[v];assert(typeof body==='string'&&body.trim(),'Missing Onkelos '+week+' '+day+' '+c+':'+v);refs.push(c+':'+v);
  }
  assert(refs.length,'Empty assigned Torah '+week+' '+day);assert.equal(refs[0],d.torah.from.c+':'+d.torah.from.v);assert.equal(refs.at(-1),d.torah.to.c+':'+d.torah.to.v);
  slots.push({week,day,slug:w.slug,refs});
 }
}
assert.equal(Object.keys(schedule.weeks).length,54);assert.equal(slots.length,374);
save('ALL-SCHEDULE-ONKELOS-INVENTORY.json',{weeks:54,slots:slots.length,verseOccurrences:slots.reduce((n,s)=>n+s.refs.length,0),books:[...targums].map(([slug,data])=>({slug,sha256:crypto.createHash('sha256').update(raw('public/reader/medooyuk/targum/'+slug+'.json')).digest('hex')})),readings:slots});
async function main(){
 const selected=args.includes('--reported-day')?slots.filter(s=>s.week==='נח'&&s.day==='ליל שישי'):slots;
 const results=[];
 for(const focused of [false,true])for(const s of selected){let r;const key=[s.week,s.day,focused?'focused':'ordinary'].join('|');try{
  r=await boot(s.week,s.day,focused);const section=r.d.querySelector('[data-sec="torah"]');assert(section,'Missing Torah '+key);
  const vs=section.querySelectorAll('.ck-verse');assert.deepEqual(vs.map(v=>v.getAttribute('data-verse-ref')),s.refs,key+' exact ordered Torah selection');
  for(const v of vs){const ref=v.getAttribute('data-verse-ref'),[c,n]=ref.split(':').map(Number),lines=v.querySelectorAll('.ck-targum-line');assert.equal(lines.length,1,key+' '+ref+' exactly one own Onkelos');const expected=r.env.box.window.ChokSources.targumText(targums.get(s.slug).ch[c][n]);const d=require('./qualified-earlier-parsha-test-dom.cjs').documentFor(expected);assert.equal(lines[0].textContent,d.textContent,key+' '+ref+' complete own source');assert(v.querySelector('.ck-targum-reading h4').textContent.includes('Onkelos'),key+' '+ref+' labelled');}
  assert(!section.querySelectorAll('.ck-onkelos-translation').some(d=>d.open),key+' translations initially closed');assert(r.peak()<=6);
  results.push({key,status:'PASS',verses:vs.length});console.log('PASS '+key+' '+vs.length);
 }catch(e){results.push({key,status:'FAIL',error:e.message,stack:e.stack});console.error('FAIL '+key+' '+e.message);}finally{r?.env.close();save('FULL-INIT-ONKELOS-RESULTS.json',{cases:results,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,browser:false});}}
 // Reader-requested hiding is preserved and restores the actual original when re-enabled.
 let r=await boot('נח','ליל שישי',false);try{const toggle=r.d.getElementById('ck-targum');const until=require('./qualified-earlier-parsha-test-dom.cjs').until;toggle.checked=false;toggle.dispatchEvent({type:'change'});await until(()=>!r.d.querySelector('.ck-loading'));assert.equal(r.d.querySelector('[data-sec="torah"]').querySelectorAll('.ck-targum-line').length,0);toggle.checked=true;toggle.dispatchEvent({type:'change'});await until(()=>!r.d.querySelector('.ck-loading'));assert.equal(r.d.querySelector('[data-sec="torah"]').querySelectorAll('.ck-targum-line').length,26);console.log('PASS optional hide/restore Noach Thursday-night26');}finally{r.env.close();}
 const failed=results.filter(x=>x.status==='FAIL').length;console.log(JSON.stringify({weeks:54,scheduleSlots:slots.length,renderedCases:results.length,passed:results.length-failed,failed}));process.exitCode=failed?1:0;
}
main().catch(e=>{console.error(e);process.exitCode=1});
