/* Full init of changed website loaders in jsdom, with authentic local JSON.
 * DOM/observers/fonts/fetch are doubles; not a pixel or deployed-site claim.
 * Usage: JSDOM_PATH=/path/to/jsdom node scripts/test-psalms-loader-init.cjs OUT
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_PATH||'/root/OpenCLI/node_modules/jsdom');
const root=path.resolve(__dirname,'..'),out=process.argv[2];assert.ok(out);fs.mkdirSync(out,{recursive:true});
const read=f=>fs.readFileSync(path.join(root,f),'utf8'), json=f=>JSON.parse(read(f));
const psalms=json('public/reader/medooyuk/tanach-tehillim.json');let results=[];
function shell(file){let s=read(file);s=s.slice(s.indexOf('<Layout')).replace(/^<Layout[\s\S]*?>/,'').replace('</Layout>','');return '<!doctype html><meta charset="utf-8">'+s;}
function setup(body,url){
 const errors=[],requests=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
 const dom=new JSDOM(body,{url:'https://ajew.org'+url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}); const w=dom.window;
 w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.document.fonts={load:async()=>[{status:'loaded'}],ready:Promise.resolve(),check:()=>true};
 w.fetch=async u=>{const url=new URL(u,w.location.href);requests.push(url.pathname+url.search);const f=path.join(root,'public',url.pathname);if(url.hostname!=='ajew.org'||!fs.existsSync(f)||!fs.statSync(f).isFile())return{ok:false,status:404,json:async()=>{throw Error('Missing '+u)}};return{ok:true,status:200,json:async()=>JSON.parse(fs.readFileSync(f,'utf8'))};};
 function script(file){w.eval(read('public/'+file));}
 return {dom,w,errors,requests,script};
}
async function until(fn){const end=Date.now()+12000;while(!fn()){if(Date.now()>end)throw Error('Timeout waiting for actual loader render');await new Promise(r=>setTimeout(r,25));}}
(async()=>{
 for(const file of ['src/pages/reader/tikkun.astro','src/pages/reader/chok.astro','src/pages/reader/tanach-tehillim/[part]/[torah].astro']){
  const r=await require('@astrojs/compiler').transform(read(file),{filename:file});assert.ok(!r.diagnostics.some(d=>d.severity===1),JSON.stringify(r.diagnostics));
 }
 // Tikun full init: actual authored controls and actual helper dependency order.
 {
  const t=setup(shell('src/pages/reader/tikkun.astro'),'/reader/tikkun?b=tanach-tehillim&c=104');
  t.w.localStorage.setItem('tk-settings',JSON.stringify({view:'verses',mode:'full',marked:true}));
  for(const s of ['tikkun-renderer.js','tikkun-column-display.js','tikkun-boundaries.js','psalms-data.js','tikkun.js'])t.script(s);
  await until(()=>t.w.document.querySelector('#tk-content').textContent.includes(psalms.ch[104][24].t[7]));
  assert.ok(t.requests.includes('/reader/medooyuk/tanach-tehillim.json?v=psalms-annotations-20261002-r1'));
  const html=t.w.document.querySelector('#tk-content').innerHTML;assert.ok(html.includes('qk:'));assert.ok(html.includes('na:'));
  assert.equal(t.w.document.querySelector('#tk-chapter').value,'104');assert.deepEqual(t.errors,[]);
  results.push({surface:'Tikun',fullInit:true,revisionFetch:true,source104_24:true});t.dom.window.close();
 }
 // Chok full init: derive a real scheduled Psalms range from owned schedule.
 {
  const sched=json('public/reader/chok/schedule.json');let found;
  for(const [week,w]of Object.entries(sched.weeks))for(const [day,d]of Object.entries(w.days))if(!found&&JSON.stringify(d.kesuvim||d.ketuvim||{}).includes('תה'))found={week,day,d};
  assert.ok(found,'real Psalms schedule');
  const t=setup(shell('src/pages/reader/chok.astro'),'/reader/chok?'+new URLSearchParams({week:found.week,day:found.day}));
  t.w.localStorage.setItem('chok-settings',JSON.stringify({targum:false,rashi:false,commentary:false,tanachen:false}));
  for(const s of ['medooyuk.js','psalms-data.js','chok.js'])t.script(s);
  await until(()=>t.requests.includes('/reader/medooyuk/tanach-tehillim.json?v=psalms-annotations-20261002-r1')&&t.w.document.querySelector('#ck-content .marked-hebrew'));
  assert.ok(t.w.document.querySelector('#ck-content').textContent.length>100);assert.deepEqual(t.errors,[]);
  // Changing a control invokes a new in-flight-only Psalms fetch, not stale bookCache.
  const before=t.requests.filter(u=>u.includes('/medooyuk/tanach-tehillim')).length;
  const toggle=t.w.document.querySelector('#ck-medooyuk');toggle.checked=false;toggle.dispatchEvent(new t.w.Event('change'));
  await until(()=>t.requests.filter(u=>u.includes('/medooyuk/tanach-tehillim')).length>before);
  results.push({surface:'Chok',fullInit:true,week:found.week,day:found.day,revisionFetch:true,reopenedSectionRefetch:true});t.dom.window.close();
 }
 // Reader edition full-init owner, actual source adapter/renderer; generic Reader
 // API is a DOM-event double, as its unrelated notes/theme/search are unchanged.
 {
  const original=json('public/reader/tanach-tehillim/part-1/torah-104.json');
  const body='<div class="reader-toolbar"><button id="btn-nikud"></button></div><ul class="reader-toc-list"></ul><div class="reader-content">'+original.segments.map(s=>'<div class="segment-he" data-index="'+s.index+'"><p></p></div>').join('')+'</div>';
  const t=setup(body,'/reader/tanach-tehillim/1/104/?edition=uxlc');
  t.w.document.querySelectorAll('.segment-he p').forEach((p,i)=>{p.setAttribute('data-nikud',original.segments[i].he_nikud);p.setAttribute('data-bare',original.segments[i].he);p.textContent=original.segments[i].he_nikud;});
  t.w.AjewReader={refresh:()=>t.w.AjewReaderEdition?.paint({nikud:true,mode:'hebrew'},''),setupSegmentShareActions:()=>{},getState:()=>({nikud:true,mode:'hebrew'})};
  for(const s of ['medooyuk.js','reader-source-exact.js','psalms-data.js','reader-editions.js'])t.script(s);
  t.w.document.dispatchEvent(new t.w.Event('ajew-reader-ready'));
  await until(()=>t.w.document.querySelector('#reader-edition-status')?.textContent.includes('available verses.'));
  assert.equal(t.w.document.querySelector('#seg-24 p').textContent,t.w.AjewReaderSourceExact.text({...psalms.ch[104][24],index:24}));
  const count=t.requests.length;t.w.dispatchEvent(new t.w.PageTransitionEvent('pageshow',{persisted:true}));
  await until(()=>t.requests.length>count&&t.w.document.querySelector('#reader-edition-status').textContent.includes('available verses.'));
  assert.deepEqual(t.errors,[]);results.push({surface:'Reader editions',fullInit:true,revisionFetch:true,persistedPageReopenRefetch:true});t.dom.window.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({PASS:results.length,astroPages:3,results,scope:'Full loader init in jsdom; actual JSON and renderers; no visual/native claim'},null,2));console.log(JSON.stringify({PASS:results.length,astroPages:3,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>setTimeout(()=>process.exit(process.exitCode||0),10));
