'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),box={};vm.runInNewContext(fs.readFileSync(path.join(root,'public/chok-display.js'),'utf8'),box);const api=box.ChokDisplay;
test('display-only missing cholam: ordinary and Elohim qere retain their distinct vowels and accents',()=>{
 const cases=[['יְהוָה','יְהֹוָה'],['יְ֭הוָה','יְ֭הֹוָה'],['לַיהוָ֖ה','לַיהֹוָ֖ה'],['וַיהוָה','וַיהֹוָה'],['יֱהוִה','יֱהֹוִה'],['יְהוִה','יְהֹוִה']];
 for(const [before,after]of cases){assert.equal(api.pointedName(before),after);assert.equal(api.pointedName(after),after);assert.equal(after.replace(/\u05b9/g,''),before);}
});
test('unpointed, already-pointed, arbitrary kavana pointing and unrelated words are conserved',()=>{
 for(const s of ['יהוה','יְהֹוָה','יֱהֹוִה','יֹהֹוֹהֹ','יְהֻוָה','יְהוּה','יְהוָהך','אליהוָה','אֱלֹהִים','יְהוָֹה'])assert.equal(api.pointedName(s),s,s);
});
test('Hebrew Mishna chapter:item is RTL (chapter RIGHT); Arabic digits retain LTR and logical values',()=>{
 assert.equal(api.referenceHTML('ז:א'),'<bdi class="ck-generated-ref" dir="rtl"><bdi dir="rtl">ז</bdi>:<bdi dir="rtl">א</bdi></bdi>');
 for(const s of ['ז:ב','יב:טו','כח:טו','יב:טו–יג:א','יב:טו-טז','12:15','7:1–8:2']){
  const html=api.referenceHTML(s);assert.equal(html.replace(/<[^>]*>/g,''),s);assert(html.startsWith('<bdi class="ck-generated-ref" dir="'+(/[א-ת]/.test(s)?'rtl':'ltr')+'">'));
 }
});
test('the complete display source differs only in generated-reference outer direction; Name and all other bytes conserved',()=>{
 const {createHash}=require('node:crypto'),s=fs.readFileSync(path.join(root,'public/chok-display.js'),'utf8');
 const after=`'<bdi class="ck-generated-ref" dir="' + (/[א-ת]/.test(ref) ? 'rtl' : 'ltr') + '">'`,before=`'<bdi class="ck-generated-ref" dir="ltr">'`;
 assert.equal(s.split(after).length,2);assert.equal(createHash('sha256').update(s.replace(after,before)).digest('hex'),'94587bad9b091f1b8df2251552702cd467a2e0262fe4aeae19706a3044a7339e');
});
test('all prescribed/bonus generated-owner grammars, isolates and ranges retain c:item, source and Bible labels stay untouched',()=>{
 const {documentFor}=require('./qualified-earlier-parsha-test-dom.cjs');
 for(const sec of ['mishna','bonus'])for(const parent of ['rtl','ltr'])for(const ref of ['ז:א','ז:ב','יב:טו','כח:טו','יב:טו–יג:א','יב:טו-טז','12:15','7:1–8:2'])for(const markup of [
  '<div data-mishna-owner="owner"><h3>משנה REF</h3><h4>ברטנורא REF</h4></div>',
  '<div data-reading-unit="owner"><h3>משנה REF</h3><h4>ברטנורא REF</h4></div>',
  '<span class="ck-mnum">REF</span><span class="ck-reading-ref">REF</span>'
 ]){
  const decorated='\u2066'+ref.replace(/[א-ת]+/g,n=>'\u2067'+n+'\u2069')+'\u2069';
  const d=documentFor('<div id="root" dir="'+parent+'"><section data-sec="'+sec+'">'+markup.replaceAll('REF',decorated)+'<p>מקור '+ref+'</p><h3>ציטוט '+ref+'</h3></section><section data-sec="torah"><span class="ck-mnum">'+ref+'</span></section></div>'),r=d.getElementById('root');
  const untouched=[...r.querySelectorAll('p,section[data-sec="torah"],section > h3')].map(x=>x.outerHTML);api.apply(r,'original');
  const labels=r.querySelectorAll('.ck-generated-ref');assert.equal(labels.length,2);
  for(const x of labels){assert.equal(x.textContent,ref);assert.equal(x.getAttribute('dir'),/[א-ת]/.test(ref)?'rtl':'ltr');assert.equal(x.children[0].textContent,ref.split(':')[0]);}
  assert.deepEqual([...r.querySelectorAll('p,section[data-sec="torah"],section > h3')].map(x=>x.outerHTML),untouched);
  const once=r.innerHTML;api.apply(r,'original');assert.equal(r.innerHTML,once);
 }
});
test('only Chok template loads projection before actual initializer, both content addressed and integrity bound',()=>{
 const {createHash}=require('node:crypto');const template=fs.readFileSync(path.join(root,'src/pages/reader/chok.astro'),'utf8');
 for(const name of ['chok-display','chok']){const b=fs.readFileSync(path.join(root,'public/'+name+'.js'));const sha=createHash('sha256').update(b).digest('hex'),sri=createHash('sha384').update(b).digest('base64');assert(template.includes('/'+name+'.js?v='+sha));assert(template.includes('integrity="sha384-'+sri+'"'));}
 assert(template.indexOf('/chok-display.js?')<template.indexOf('/chok.js?'));
 assert(fs.readFileSync(path.join(root,'public/chok.js'),'utf8').includes('window.ChokDisplay.apply(box, state.language);'));
});
test('exact display inverse conserves complete ancestors and rejects changed bodies, wrong owners and corrupt admission',()=>{
 const helper=require('./chok-display-inverse.cjs'),{createHash}=require('node:crypto'),sha=b=>createHash('sha256').update(b).digest('hex');
 const p=path.join(root,'scripts/chok-display-admission.json'),raw=fs.readFileSync(p),bank=JSON.parse(raw);
 for(const [relative,row]of Object.entries(bank.paths)){
  const bytes=fs.readFileSync(path.join(root,relative)),pre=helper.restore(relative,bytes);assert.equal(sha(pre),row.beforeSHA256);assert.equal(pre.length,row.beforeBytes);assert.equal(helper.restore('foreign-owner',bytes),bytes);
  for(const pos of [0,Math.floor(bytes.length/2),bytes.length-1]){const bad=Buffer.from(bytes);bad[pos]^=1;assert.equal(helper.restore(relative,bad),bad);}
 }
 try{const bad=Buffer.from(raw);bad[20]^=1;fs.writeFileSync(p,bad);assert.throws(()=>helper.restore('public/chok.js',fs.readFileSync(path.join(root,'public/chok.js'))),/CHOK_DISPLAY_ADMISSION_PIN/);}finally{fs.writeFileSync(p,raw);}
});
