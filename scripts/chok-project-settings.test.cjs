'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {documentFor,sandbox,until}=require('./qualified-earlier-parsha-test-dom.cjs');
const read=p=>fs.readFileSync(p,'utf8'),sha=b=>createHash('sha256').update(b).digest('hex');
const main=read('public/chok.js'),template=read('src/pages/reader/chok.astro'),bank=JSON.parse(read('src/data/chok-project-credits.json'));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/>/g,'&gt;');
// Deliberately constrained static Astro projection, not a build/paint claim.
// Bind every projected production expression, so this cannot silently diverge.
const mapExpression=`{projectCredits.entries.map(entry => <article class="ck-project-credit" data-project-credit={entry.id}>
          <Fragment set:html={entry.html} />
          <details><summary>Applicability · תחולה</summary><ul>
            {entry.bindings.map(binding => <li dir="ltr">{binding.kind === 'qualified' ? \`\${binding.payload.split('/').pop()} · \${binding.section} · \${binding.owner} · \${binding.note}\` : \`\${binding.owner} · credit \${binding.creditIndex + 1}\`}</li>)}
          </ul></details>
        </article>)}`;
assert.equal(template.split(mapExpression).length,2,'exact production bank binding');
assert(template.includes("import projectCredits from '../../data/chok-project-credits.json';"));
function markup(){return template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>')).replace('{projectCredits.scope}',esc(bank.scope)).replace(mapExpression,bank.entries.map(e=>'<article class="ck-project-credit" data-project-credit="'+e.id+'">'+e.html+'<details><summary>Applicability · תחולה</summary><ul>'+e.bindings.map(b=>'<li dir="ltr">'+esc(b.kind==='qualified'?`${b.payload.split('/').pop()} · ${b.section} · ${b.owner} · ${b.note}`:`${b.owner} · credit ${b.creditIndex+1}`)+'</li>').join('')+'</ul></details></article>').join(''));}
function checkSettings(d){
 const settings=d.getElementById('ck-general-settings'),section=d.getElementById('ck-sources-and-credits');
 assert(settings&&section);assert.equal(settings.tagName,'details');assert.equal(settings.children[0].tagName,'summary');assert(settings.children[0].textContent.includes('General settings'));
 assert.equal(section.closest('#ck-general-settings'),settings);assert.equal(section.getAttribute('tabindex'),'0');assert.equal(section.getAttribute('aria-labelledby'),'ck-sources-heading');assert.equal(section.getAttribute('role'),'region');
 assert.equal(d.querySelectorAll('#ck-sources-and-credits').length,1);assert(!d.getElementById('ck-reading-credits'));assert(!d.querySelector('footer .ck-project-credits'));
 assert.equal(d.querySelectorAll('[data-project-credit]').length,bank.entries.length);
 assert([...section.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/tikkun/qatan-sources.html'));assert(section.querySelector('#ck-noach-legal'));assert(section.querySelector('.ck-noach-print-conditions').textContent.includes('Creative Commons 2.5'));
 const before=section.innerHTML;settings.children[0].click();assert(settings.open,'native disclosure activation opens general settings');assert.equal(section.innerHTML,before);settings.children[0].click();assert(!settings.open);return before;
}
function inventory(){
 require('./verify-chok-qualified-daily.cjs').sourceSRI(process.cwd());
 for(const [p,h] of Object.entries(bank.inputs))assert.equal(sha(fs.readFileSync(p)),h,'authentic metadata input '+p);
 assert.equal(new Set(bank.entries.map(e=>e.html)).size,bank.entries.length,'exact rendered-notice deduplication');
 const bindings=bank.entries.flatMap(e=>e.bindings),daily=bindings.filter(b=>b.kind==='qualified'),other=bindings.filter(b=>b.kind==='other-layer');
 assert.equal(daily.length,38);assert.equal(other.length,133);assert.equal(new Set(other.map(b=>b.owner)).size,128);
 // Check notice paragraphs/links themselves, not just bank counts.
 const d=documentFor(markup());checkSettings(d);
 const semantic=require('./chok-project-credit-semantics.test.cjs').verify(bank,d.getElementById('ck-project-credit-bank')); 
 for(const e of bank.entries){const n=d.querySelector('[data-project-credit="'+e.id+'"]'),probe=documentFor('<main>'+e.html+'</main>');for(const a of probe.querySelectorAll('a'))assert(n.querySelectorAll('a').some(v=>v.getAttribute('href')===a.getAttribute('href')));assert(n.textContent.includes(probe.querySelector('main').textContent));}
 const start=main.indexOf('  function suppressSourceCredits(root) {'),end=main.indexOf('  function secHead(',start);assert(start>=0&&end>start);
 const context={};vm.runInNewContext(main.slice(start,end)+';this.run=suppressSourceCredits',context);
 const sample=documentFor('<main><p>Source body</p><aside class="ck-source-qualification" data-daily-note="meaning">Meaning, reading, safety and uncertainty stay local.</aside><details class="ck-source-credits"><summary>Legal</summary>'+bank.entries[0].html+'</details><details class="ck-source-credits" data-other-credit-owner="owner">'+bank.entries[bank.entries.length-1].html+'</details></main>');
 const root=sample.querySelector('main'),clone=root.cloneNode(true);clone.querySelectorAll('.ck-source-credits').forEach(n=>n.remove());const expected=clone.innerHTML;context.run(root);assert.equal(root.innerHTML,expected);context.run(root);assert.equal(root.innerHTML,expected);
 return {projectNotices:bank.entries.length,qualifiedNotices:bank.entries.filter(e=>e.bindings[0].kind==='qualified').length,otherNotices:bank.entries.filter(e=>e.bindings[0].kind==='other-layer').length,qualifiedBindings:daily.length,otherBindings:other.length,otherOwners:128,inputPins:Object.keys(bank.inputs).length,semantic,nonCreditDOMExact:true};
}
async function initializer(unavailable=false){
 const full=JSON.parse(read('public/reader/chok/schedule.json')),schedule={weeks:{'וירא':{slug:full.weeks['וירא'].slug,days:{'יום שלישי':full.weeks['וירא'].days['יום שלישי'],'יום שני':full.weeks['וירא'].days['יום שני'],'יום רביעי':full.weeks['וירא'].days['יום רביעי']}}}};
 if(unavailable==='day')schedule.weeks['וירא'].days={};
 const d=documentFor('<html><body>'+markup()+'</body></html>'),requests=[],initial=checkSettings(d);
 const env=sandbox(d,'/reader/chok/',async u=>{const key=String(u).split('?')[0];requests.push(key);let text=null;if(key==='/reader/chok/schedule.json')text=unavailable===true?null:JSON.stringify(schedule);else try{text=read('public'+key);}catch(e){if(e.code!=='ENOENT'&&!String(e).includes('does not exist'))throw e;}return{ok:true,status:200,text:async()=>text,json:async()=>text===null?null:JSON.parse(text)};});
 const append=d.head.appendChild.bind(d.head);d.head.appendChild=function(n){const result=append(n);if(n.tagName.toLowerCase()==='script')queueMicrotask(()=>{try{vm.runInContext(read('public'+n.src.split('?')[0]),env.box);if(n.onload)n.onload();}catch(e){if(n.onerror)n.onerror(e);else throw e;}});return result;};
 env.box.location.search='?week='+encodeURIComponent('וירא')+'&day='+encodeURIComponent('יום שלישי');
 for(const f of ['tikkun-boundaries.js','tikkun-qatan.js','medooyuk.js','chok-source-reader.js'])vm.runInContext(read('public/'+f),env.box);
 env.box.window.ChokSources.load=async()=>{};env.box.window.ChokVerseBreslov={has:()=>false,availability:()=>'',parsha:()=>null,weekly:()=>'',verse:()=>''};
 for(const f of ['chok-other-layers.js','chok-qualified-daily.js','chok-qualified-daily-classical-selected-v1.js'])vm.runInContext(read('public/'+f),env.box);
 vm.runInContext(main,env.box);
 try{
  if(unavailable){await until(()=>unavailable===true?!!d.querySelector('.ck-error'):!d.querySelector('.ck-loading')&&!!d.getElementById('ck-content').textContent.trim(),10000);if(unavailable==='day')assert.equal(d.querySelectorAll('[data-daily-section]').length,0);assert.equal(d.getElementById('ck-sources-and-credits').innerHTML,initial);checkSettings(d);return{unavailableSchedule:unavailable===true,unavailableDay:unavailable==='day',settingsStillComplete:true};}
  const settle=()=>until(()=>!d.querySelector('.ck-loading')&&!!d.querySelector('[data-daily-section="talmud"]'),10000);await settle();
  let languages=0;for(const value of ['both','he','en','original','both']){const n=d.getElementById('ck-language');n.value=value;n.dispatchEvent({type:'change'});await settle();assert.equal(d.getElementById('ck-sources-and-credits').innerHTML,initial);assert.equal(d.getElementById('ck-content').querySelectorAll('.ck-source-credits').length,0);assert(d.getElementById('ck-content').querySelector('[data-daily-note]'));languages++;}
  let changes=0;for(const day of ['יום שני','יום רביעי','יום שלישי']){const n=d.getElementById('ck-day');n.value=day;n.dispatchEvent({type:'change'});await settle();assert.equal(d.getElementById('ck-sources-and-credits').innerHTML,initial);assert.equal(d.getElementById('ck-content').querySelectorAll('.ck-source-credits').length,0);changes++;}
  assert(d.getElementById('ck-content').querySelector('[data-reading-unit]'));assert(!requests.some(u=>u.includes('project-credits')),'no runtime credit-bank fetch');checkSettings(d);
  return{ordinaryInitializer:true,languageTransitions:languages,dayChanges:changes,projectBankStable:true,noRuntimeCreditFetch:true,noRepeatedReadingCredits:true};
 }finally{env.close();}
}
(async()=>console.log(JSON.stringify({inventory:inventory(),ordinary:await initializer(),unavailable:await initializer(true),unavailableDay:await initializer('day'),limits:'File-backed parse5 DOM with native disclosure activation modeled. Exact constrained Astro projection, no build/browser/paint or real keyboard dispatch. Source-loader load and optional Breslov offering stubbed as in accepted caller fixtures.'})))().catch(e=>{console.error(e.stack);process.exitCode=1;});
