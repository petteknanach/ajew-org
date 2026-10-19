'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const findings=JSON.parse(fs.readFileSync(process.argv[2]||require('node:path').join(__dirname,'fixtures/chok-markup-reviewed-cases.json'),'utf8')).findings;
const adapter=fs.readFileSync(process.argv[3]||'public/chok-source-reader.js','utf8');
const context={window:{},localStorage:{getItem(){return null;}},document:{addEventListener(){}}};vm.runInNewContext(adapter,context);const api=context.window.ChokSources;
const rows=[];
for(const f of findings)for(const fixture of f.reproductions){const actual=(f.id==='F03'?api.targumText:api.richText)(fixture.input);rows.push({finding:f.id,input:fixture.input,actual,expected:fixture.expectedHTML,pass:actual===fixture.expectedHTML});}
console.log(JSON.stringify({cases:rows.length,passed:rows.filter(r=>r.pass).length,failed:rows.filter(r=>!r.pass).length,rows},null,2));
assert(rows.every(r=>r.pass));
