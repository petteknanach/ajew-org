// Narrow retention-authority/ABI supplement; genuine Git publication inputs, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as q from '../public/qualified-aitzoas362-core.mjs';
import {loadEdition} from '../src/lib/qualified-aitzoas362.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const d=await loadEdition();
function annotation(r,pin,field='en'){
 return {schema:'qualified-aitzoas362-annotation/v1',id:'authority-control',type:'highlight',note:'',selection:{editionSHA256:pin,owner:r.owner,field,start:0,end:1,text:r[field].slice(0,1),fullField:r[field]}};
}
const editions=[
 ['f62101574a52ccc01782ac3a43ff07a35e3b22e3',q.QUESTION_PREDECESSOR_PIN,87],
 ['59add1f25cbf4d05e4a234a1e9a8ca6c824d04b0',q.CORRECTION_PREDECESSOR_PIN,62],
 ['3b663dec7f21be01f3045673e10912c234abd348',q.PREVIOUS_EDITION_PIN,63]
];
for(const [commit,pin,id]of editions)await test('retention authenticates exact published full fields, not self-claimed text: '+commit,()=>{
 const bytes=execFileSync('git',['show',commit+':public/reader/reviewed/aitzoas362-sources/selected-362.json'],{maxBuffer:4*1024*1024});assert.equal(sha(bytes),pin);
 const r=JSON.parse(bytes).rows[id-1],a=annotation(r,pin),raw=JSON.stringify(a);
 assert.equal(q.validateRetainedAnnotation(d,a).en,r.en);assert.equal(JSON.stringify(a),raw);assert.throws(()=>q.validateAnnotation(d,a));
 const forged=structuredClone(a);forged.selection.fullField='Forged full historical source';forged.selection.text='F';assert.throws(()=>q.validateRetainedAnnotation(d,forged));
 const currentClaim=structuredClone(a);currentClaim.selection.editionSHA256=q.PIN;assert.throws(()=>q.validateRetainedAnnotation(d,currentClaim));
 const blank=structuredClone(a);blank.selection.end=0;blank.selection.text='';assert.throws(()=>q.validateRetainedAnnotation(d,blank));
 console.log(JSON.stringify({commit,editionSHA256:pin,owner:r.owner,field:'en',publishedFieldSHA256:sha(r.en),retainedRecordSHA256:sha(raw),attached:false}));
});
await test('retention helper cannot brand forged editions, relax current validation or admit unknown history',()=>{
 const a=annotation(d.rows[86],q.PIN);assert.equal(q.validateRetainedAnnotation(d,a),d.rows[86]);
 for(const fake of [{...d},{bank:d.bank,rows:d.rows},null])assert.throws(()=>q.validateRetainedAnnotation(fake,a));
 for(const mutate of [x=>x.selection.editionSHA256='0'.repeat(64),x=>x.selection.fullField+='!',x=>x.note=null,x=>x.type='source']){const bad=structuredClone(a);mutate(bad);assert.throws(()=>q.validateRetainedAnnotation(d,bad));}
 q.validateAnnotation(d,a);q.requireEdition(d);
});
await test('complete current export/core byte-and-hash pins remain matched',()=>{
 const py=fs.readFileSync(new URL('./qualified_aitzoas362_exports.py',import.meta.url),'utf8'),bytes=fs.readFileSync(new URL('../public/qualified-aitzoas362-core.js',import.meta.url));
 assert.ok(py.includes("'qualified-aitzoas362-core.js': {'bytes': "+bytes.length+", 'sha256': '"+sha(bytes)+"'}"));
 assert.equal(typeof q.validateRetainedAnnotation,'function');
});
