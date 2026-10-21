'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {sandbox,documentFor,until,tick}=require('./qualified-earlier-parsha-test-dom.cjs');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),manifest=JSON.parse(read('public/reader/chok/onkelos-verse-alignment.json'));
function env(rawManifest=read('public/reader/chok/onkelos-verse-alignment.json'),fetcher){
 const d=documentFor('<html><body></body></html>');d.readyState='loading';const e=sandbox(d,'/reader/chok/',fetcher||(async()=>({ok:true,status:200,text:async()=>rawManifest})));
 const src=read('public/chok.js'),end=src.lastIndexOf('})();');vm.runInContext(src.slice(0,end)+'globalThis.onkelosQA={alignedOnkelos,onkelosAlignment,targ};'+src.slice(end),e.box);return e;
}
const raw=slug=>read('public/reader/medooyuk/targum/'+slug+'.json');
test('33 source-bound Onkelos overrides preserve original grouped bodies exactly and all other units unchanged',async()=>{
 const e=env();try{assert.equal(Object.values(manifest.books).reduce((n,b)=>n+b.overrides.length,0),33);
 for(const [slug,s]of Object.entries(manifest.books)){
  assert.equal(crypto.createHash('sha256').update(raw(slug)).digest('hex'),s.sourceSHA256);
  const b=JSON.parse(raw(slug)),out=await e.box.onkelosQA.alignedOnkelos(raw(slug),slug,manifest),groups=new Map(),targets=new Set(s.overrides.map(r=>r.target));
  for(const row of s.overrides){const [c,v]=row.target.split(':'),[sc,sv]=row.source.split(':');assert.equal(out.ch[c][v],[...b.ch[sc][sv]].slice(...row.span).join(''));const g=groups.get(row.source)||[];g.push(row);groups.set(row.source,g);}
  for(const [ref,rows]of groups){const [c,v]=ref.split(':'),original=b.ch[c][v];rows.sort((a,b)=>a.span[0]-b.span[0]);let pos=0;for(const row of rows){assert(row.span[0]>=pos);assert.equal([...original].slice(pos,row.span[0]).join('').trim(),'');pos=row.span[1];}assert.equal([...original].slice(pos).join('').trim(),'');}
  for(const[c,ch]of Object.entries(b.ch))for(const[v,text]of Object.entries(ch))if(!targets.has(c+':'+v))assert.equal(out.ch[c][v],text);
  assert.equal(JSON.stringify(JSON.parse(raw(slug))),JSON.stringify(b),'Disk corpus untouched');
 }
 }finally{e.close();}
});
test('explicit Ten Commandments and adjoining source-reference schedule is independent of runtime slicing',()=>{
 for(const[slug,c,start,last]of[['tanach-shemos',20,13,26],['tanach-devarim',5,17,33]]){
  const rows=manifest.books[slug].overrides;assert.deepEqual(rows.map(r=>r.target),Array.from({length:last-start+1},(_,i)=>c+':'+(start+i)));
  assert.deepEqual(rows.map(r=>r.source),Array.from({length:last-start+1},(_,i)=>c+':'+(i<4?start:start+i-3)));
 }
 assert.deepEqual(manifest.books['tanach-bamidbar'].overrides.map(r=>[r.target,r.source]),[['25:19','26:1'],['26:1','26:1']]);
});
test('complete source drift is rejected in each affected book; exact positives restore',async()=>{
 const e=env();try{for(const slug of Object.keys(manifest.books)){await assert.rejects(e.box.onkelosQA.alignedOnkelos(raw(slug)+' ',slug,manifest),/source binding changed/);await e.box.onkelosQA.alignedOnkelos(raw(slug),slug,manifest);}}finally{e.close();}
});
test('wrong or shifted manifest body is rejected before its source spans can be used',async()=>{
 const changed=structuredClone(manifest);changed.books['tanach-shemos'].overrides[0].span[1]--;
 const e=env(JSON.stringify(changed));try{await assert.rejects(e.box.onkelosQA.onkelosAlignment(),/verse alignment changed/);}finally{e.close();}
 const p=env();try{assert.equal((await p.box.onkelosQA.onkelosAlignment()).schema,manifest.schema);}finally{p.close();}
});
test('invalid or duplicate source spans fail closed without changing accepted originals',async()=>{
 const e=env();try{for(const mutate of [m=>m.books['tanach-shemos'].overrides.push(m.books['tanach-shemos'].overrides[0]),m=>m.books['tanach-shemos'].overrides[0].span[0]=-1,m=>m.books['tanach-shemos'].overrides[0].span[1]=100000]){const bad=structuredClone(manifest);mutate(bad);await assert.rejects(e.box.onkelosQA.alignedOnkelos(raw('tanach-shemos'),'tanach-shemos',bad),/Invalid Onkelos source span/);}await e.box.onkelosQA.alignedOnkelos(raw('tanach-shemos'),'tanach-shemos',manifest);}finally{e.close();}
});

test('all five effective Onkelos books cover every owned Bible key, including unscheduled Exodus20:24-26',async()=>{
 const e=env();try{let total=0;
 for(const[slug,count]of[['tanach-bereishit',1533],['tanach-shemos',1213],['tanach-vayikra',859],['tanach-bamidbar',1289],['tanach-devarim',959]]){
  const bible=JSON.parse(read('public/reader/medooyuk/'+slug+'.json')),source=JSON.parse(raw(slug));
  const effective=manifest.books[slug]?await e.box.onkelosQA.alignedOnkelos(raw(slug),slug,manifest):source;
  const keys=b=>Object.entries(b.ch).flatMap(([c,ch])=>Object.keys(ch).map(v=>c+':'+v));
  assert.deepEqual(keys(effective),keys(bible));assert.equal(keys(effective).length,count);total+=count;
  for(const ch of Object.values(effective.ch))for(const body of Object.values(ch))assert(body.trim());
  const stream=b=>Object.values(b.ch).flatMap(ch=>Object.values(ch)).join('').replace(/ /g,'');assert.equal(stream(effective),stream(source),'Complete inverse source conservation '+slug);
 }
 assert.equal(total,5853);
 const o=await e.box.onkelosQA.alignedOnkelos(raw('tanach-shemos'),'tanach-shemos',manifest),s=JSON.parse(raw('tanach-shemos'));
 for(const[target,src]of[[24,21],[25,22],[26,23]])assert.equal(o.ch[20][target],s.ch[20][src]);
 }finally{e.close();}
});
for(const failure of ['manifest','book','transport'])test('actual queued loader recovers from '+failure+' rejection without bypassing authentication',async()=>{
 let bad=true;const loads=[];
 const fetcher=async url=>{const p=String(url).split('?')[0];loads.push(p);if(bad&&failure==='transport'&&p.includes('onkelos-verse-alignment'))throw Error('network unavailable');let body=read('public'+p);if(bad&&((failure==='manifest'&&p.includes('onkelos-verse-alignment'))||(failure==='book'&&p.endsWith('tanach-shemos.json'))))body+=' ';return{ok:true,status:200,text:async()=>body};};
 const e=env(undefined,fetcher);try{
  const failed=e.box.onkelosQA.targ('tanach-shemos');await assert.rejects(failed);bad=false;
  if(failure!=='book')assert((await e.box.onkelosQA.targ('tanach-devarim')).ch[5][33]);
  const restored=e.box.onkelosQA.targ('tanach-shemos');assert.notEqual(restored,failed,'Retry must use a fresh request');assert((await restored).ch[20][26]);
  assert.equal(loads.filter(p=>p.endsWith('tanach-shemos.json')).length,2);
  assert.equal(loads.filter(p=>p.includes('onkelos-verse-alignment')).length,failure==='transport'?4:failure==='manifest'?2:1);
 }finally{e.close();}
});

// Actual template, source adapters and complete initializer; no helper substitution.
function fullFixture(week,day,mutate){
 const template=read('src/pages/reader/chok.astro'),inner=template.slice(template.indexOf('  <div class="ck-wrap"'),template.indexOf('</Layout>'));
 const d=documentFor('<html><body>'+inner+'</body></html>');let active=0,peak=0;
 const disk=p=>{try{return read(p);}catch{try{return require('node:child_process').execFileSync('git',['show','HEAD:'+p],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});}catch{return null;}}};
 const e=sandbox(d,'/reader/chok/',async url=>{active++;peak=Math.max(peak,active);try{const rel='public'+decodeURIComponent(String(url).split('?')[0]);let body=disk(rel);body=await mutate(rel,body);await tick(1);return{ok:body!==null,status:body===null?404:200,text:async()=>body,json:async()=>JSON.parse(body),arrayBuffer:async()=>{const b=Buffer.from(body||'','utf8');return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}};}finally{active--;}});
 // Test-local browser transport: use this fixture's resolver, never preload modules.
 const append=d.head.appendChild.bind(d.head);
 d.head.appendChild=function(n){append(n);if(n.tagName==='script')Promise.resolve().then(()=>{
  try{const u=String(n.src||n.getAttribute('src')).split('?')[0],raw=disk('public'+u);assert.notEqual(raw,null,'dynamic script exists');const b=Buffer.from(raw,'utf8');
   assert.equal(n.integrity,'sha256-'+crypto.createHash('sha256').update(b).digest('base64'),'actual script SRI');vm.runInContext(b.toString('utf8'),e.box,{filename:u});if(n.onload)n.onload();
  }catch(error){if(n.onerror)n.onerror(error);}
 });return n;};
 e.box.location.search='?week='+encodeURIComponent(week)+'&day='+encodeURIComponent(day);
 for(const m of template.matchAll(/<script src="([^"?]+)[^"]*" defer><\/script>/g))vm.runInContext(disk('public'+m[1]),e.box,{filename:m[1]});
 const settled=()=>until(()=>!!d.getElementById('ck-content').innerHTML&&!d.querySelector('.ck-loading'),20000);
 const change=async(id,value)=>{const n=d.getElementById(id);n.value=value;n.dispatchEvent({type:'change'});await settled();};
 return{d,e,settled,change,peak:()=>peak};
}
for(const failure of ['manifest','book'])test('full initializer shows '+failure+' fault, then real user redraw recovers complete sources',async()=>{
 let bad=true;
 const r=fullFixture('יתרו','יום שישי',(p,body)=>body!==null&&bad&&p===(failure==='manifest'?'public/reader/chok/onkelos-verse-alignment.json':'public/reader/medooyuk/targum/tanach-shemos.json')?body+' ':body);
 try{
  await r.settled();assert(r.d.getElementById('ck-content').textContent.includes(failure==='manifest'?'Onkelos verse alignment changed':'Onkelos source binding changed'));assert.equal(r.d.querySelectorAll('[data-sec="torah"] .ck-verse').length,0);
  bad=false;await r.change('ck-language','he');const vs=r.d.querySelectorAll('[data-sec="torah"] .ck-verse');assert.equal(vs.length,23);assert.equal(r.d.querySelectorAll('[data-sec="torah"] .ck-targum-line').length,23);
  for(const v of vs){const[c,n]=v.getAttribute('data-verse-ref').split(':');const spec=manifest.books['tanach-shemos'].overrides.find(row=>row.target===c+':'+n),src=JSON.parse(raw('tanach-shemos'));let body=src.ch[c][n];if(spec){const[sc,sv]=spec.source.split(':');body=[...src.ch[sc][sv]].slice(...spec.span).join('');}assert.equal(v.querySelector('.ck-targum-line').textContent,documentFor(r.e.box.window.ChokSources.targumText(body)).textContent);}
  await r.change('ck-parsha','ואתחנן');assert(r.d.querySelectorAll('[data-sec="torah"] .ck-targum-line').length>0);assert(r.peak()<=6);
 }finally{r.e.close();}
});
test('stale delayed corrupt-source rejection cannot replace the newer valid Noach day',async()=>{
 let release,entered=false;const gate=new Promise(resolve=>release=resolve);
 const r=fullFixture('יתרו','יום שישי',async(p,body)=>{if(p==='public/reader/medooyuk/targum/tanach-shemos.json'){entered=true;await gate;return body+' ';}return body;});
 try{await until(()=>entered,20000);await r.change('ck-parsha','נח');assert(r.d.querySelector('[data-sec="torah"]'));const before=r.d.getElementById('ck-content').innerHTML;release();await tick(50);assert.equal(r.d.getElementById('ck-content').innerHTML,before);assert(r.peak()<=6);}finally{release();r.e.close();}
});
