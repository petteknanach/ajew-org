#!/usr/bin/env node
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ev=path.join(root,'audit/psalms-text'),holam=require(path.join(ev,'holam-repairs.json')),patah=require(path.join(ev,'patah-repair.json'));
const ledger={sources:{...holam.sources,...patah.sources},repairs:[...holam.repairs,...patah.repairs],files:[...holam.files,...patah.files]};
const {repairPsalmsHolam:repair}=require('./lib/psalms-holam-repairs.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');let checks=0,mutations=0;const eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m)};
for(const [name,expected] of Object.entries(ledger.sources))eq(sha(fs.readFileSync(path.join(ev,name))),expected,`source lock ${name}`);
for(const r of ledger.repairs){eq(repair('psalms',r.chapter,r.verse,r.before),r.after);eq(repair('tanach-tehillim',r.chapter,r.verse,r.after),r.after);eq(repair('tanach-devarim',r.chapter,r.verse,r.before),r.before);assert.throws(()=>repair('psalms',r.chapter,r.verse,r.before+' '));mutations++;assert.throws(()=>repair('psalms',r.chapter,r.verse,r.before.replace(/\u05B0/,'')));mutations++;}
for(const f of ledger.files){let b=fs.readFileSync(path.join(root,f.path));eq(sha(b),f.after_sha256);for(const op of [...f.operations].reverse()){const old=Buffer.from(op.before),after=Buffer.from(op.after);eq(b.subarray(op.offset,op.offset+after.length),after);b=Buffer.concat([b.subarray(0,op.offset),old,b.subarray(op.offset+after.length)]);}eq(sha(b),f.before_sha256);eq(b,fs.readFileSync(path.join(ev,'original-files',f.path)));}
const chapters=[];
for(let c=1;c<=150;c++){
 const rel=`public/reader/tanach-tehillim/part-1/torah-${c}.json`,base=JSON.parse(cp.execFileSync('git',['show',`abac4560d:${rel}`],{cwd:root}));
 const current=JSON.parse(fs.readFileSync(path.join(root,rel)));const expected=structuredClone(base);
 expected.segments.forEach(s=>s.he_nikud=repair('psalms',c,s.index,s.he_nikud));eq(current,expected,`all fields ${c}`);
 chapters.push({verses:base.segments.map(s=>({num:s.index,text:s.he_nikud}))});
}
// Exercise actual reader generator, replacing only filesystem I/O with capture.
let writes={};const fakeFS={mkdirSync(){},writeFileSync(p,s){writes[p]=s}};
const source=fs.readFileSync(path.join(__dirname,'parse-tanach.cjs'),'utf8');
const context={require:id=>id==='fs'?fakeFS:id==='./lib/psalms-holam-repairs.cjs'?{repairPsalmsHolam:repair}:require(id),__dirname,console:{log(){}},chapters};
vm.runInNewContext(source.slice(0,source.indexOf('// Main'))+'\ngenerateJson(BOOKS.find(b=>b.slug==="tanach-tehillim"),chapters);',context);
for(let c=1;c<=150;c++){const written=Object.entries(writes).find(([p])=>p.endsWith(`/torah-${c}.json`));assert.ok(written);const data=JSON.parse(written[1]);for(const s of data.segments)eq(s.he_nikud,repair('psalms',c,s.index,chapters[c-1].verses[s.index-1].text));}
// Exercise the actual local-verse converter on a clearly synthetic markup
// fixture built from frozen baseline verses; I/O and CP1255 decoding are doubled.
const heb=n=>{const h=['','ק','ר','ש','ת'],t=['','י','כ','ל','מ','נ','ס','ע','פ','צ'],o=['','א','ב','ג','ד','ה','ו','ז','ח','ט'];return h[Math.floor(n/100)]+t[Math.floor(n%100/10)]+o[n%10]};
const rawFixture=chapters.map((c,i)=>`~ תהלים פרק-${heb(i+1)}\n`+c.verses.map(v=>`! {${heb(v.num)}}\n${v.text}`).join('\n')).join('\n');
writes={};const converterFS={mkdirSync(){},existsSync:p=>p.endsWith('a27_Psalms.txt'),readFileSync:()=>rawFixture,writeFileSync(p,s){writes[p]=s}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'convert-tanach-local.cjs'),'utf8'),{require:id=>id==='fs'?converterFS:id==='iconv-lite'?{decode:b=>b}:id==='./lib/psalms-holam-repairs.cjs'?{repairPsalmsHolam:repair}:require(id),__dirname,console:{log(){}}});
for(let c=1;c<=150;c++){const written=Object.entries(writes).find(([p])=>p.endsWith(`/psalms/${c}.json`));assert.ok(written);const data=JSON.parse(written[1]);eq(data.verses.length,chapters[c-1].verses.length);for(const v of data.verses)eq(v.he,repair('psalms',c,v.num,chapters[c-1].verses[v.num-1].text));}
// Control: broad vowel changes / maqaf deletion are not in the repair contract.
for(const s of ['יְרוּשָׁלִָם','יָ֤אֵ֥־ר','בַּל־אֻמִּֽים׃','בָּרֲכוּ'])eq(repair('psalms',67,2,s),s);
const report={checks,mutationsRejected:mutations,chapters:150,verses:chapters.reduce((n,c)=>n+c.verses.length,0),exactRepairs:ledger.repairs.length,changedFiles:ledger.files.length,byteInverse:true,EnglishAndBareAndAllOtherFieldsConserved:true,actualReaderGeneratorExercised:true};
console.log(JSON.stringify(report,null,2));
