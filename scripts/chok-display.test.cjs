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
test('chapter:item remains logical order with LTR outer and RTL Hebrew groups',()=>{
 assert.equal(api.referenceHTML('ז:א'),'<bdi class="ck-generated-ref" dir="ltr"><bdi dir="rtl">ז</bdi>:<bdi dir="rtl">א</bdi></bdi>');
 for(const s of ['ז:ב','יב:טו','12:15','יב:טו–יג:א'])assert.equal(api.referenceHTML(s).replace(/<[^>]*>/g,''),s);
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
