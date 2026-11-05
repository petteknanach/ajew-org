import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const source=fs.readFileSync(new URL('../src/pages/reader/sefer-hamidos/[part]/[torah].astro',import.meta.url),'utf8');
const from=source.indexOf('// LN commentary entry');
const to=source.indexOf('const breadcrumbData',from);
assert(from>=0&&to>from);
const initializer=source.slice(from,to);
const guard=" && fs.existsSync(path.join(process.cwd(), 'public', lnUrl.slice(1)))";
assert.equal(initializer.split(guard).length,2,'exact local existence gate must remain in the actual owning initializer');
const predecessor=initializer.replace(guard,'');
function run(torahNum,body,code=initializer,cwd=root){
 const result=vm.runInNewContext(code+'\nJSON.stringify(commentaryEntry)',{fs,path,process:{cwd:()=>cwd},torahNum,torahData:body},{timeout:1000});
 return result;
}
const index=JSON.parse(fs.readFileSync(path.join(root,'public/reader/sefer-hamidos/index.json'),'utf8'));
const total=index.totalTorahs||index.torahs?.length||0;
const section=n=>n===1?'volume-4/sefer-hamidos-truth-focused':`volume-4/chapter-251-topic-${n}`;
const present=n=>fs.existsSync(path.join(root,'public/reader/likutay-nanach',section(n)+'.json'));
test('every real topic advertises optional commentary only when its exact published asset exists',t=>{
 const rows=[];
 for(let n=1;n<=total;n++){
  const body=JSON.parse(fs.readFileSync(path.join(root,`public/reader/sefer-hamidos/topic-${n}.json`),'utf8'));
  const actual=run(n,body),expected=present(n);
  assert.equal(actual!=='null',expected,'topic '+n);
  if(expected)assert.equal(actual,run(n,body,predecessor),'all prior metadata strings and links remain exact for topic '+n);
  rows.push({topic:n,present:expected,advertised:actual!=='null'});
 }
 assert.equal(rows.length,total);assert(total>0);
 t.diagnostic(JSON.stringify({scope:'complete current topic domain',total,available:rows.filter(r=>r.present).length,absent:rows.filter(r=>!r.present).length,rows}));
});
test('unpublished source is not invented, while existing metadata stays unchanged',()=>{
 const missingRoot=path.join(root,'scripts/fixtures/commentary-unpublished');
 assert.equal(fs.existsSync(path.join(missingRoot,'public/reader/likutay-nanach',section(108)+'.json')),false);
 assert.equal(run(108,{},initializer,missingRoot),'null');
 assert.notEqual(run(108,{},predecessor,missingRoot),'null','negative control reproduces the predecessor defect');
 for(const n of [1,107,108])assert.equal(run(n,{}),present(n)?run(n,{},predecessor):'null');
 if(present(1)){
  const truth=JSON.parse(run(1,{}));
  assert.equal(truth.related_commentaries[0].section,'volume-4/sefer-hamidos-truth-focused');
  assert.equal(truth.related_commentaries[0].readerUrl,'/reader/likutay-nanach/volume-4/33#seg-475');
 }
});
test('missing primary teaching never acquires a commentary entry',()=>{
 assert.equal(run(108,null),'null');assert.equal(run(107,null),'null');
});
