'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('public/chok-noach-english.js','utf8'),box={module:{exports:{}}};vm.runInNewContext(code,box);const api=box.module.exports;
const conditions=JSON.parse(code.match(/var CONDITIONS_TEXT = ("(?:\\.|[^"\\])*");/)[1]);
const handlers={},selected='A selected source-dependent study passage',doc={addEventListener:(type,fn)=>handlers[type]=fn,getSelection:()=>({isCollapsed:false,rangeCount:1,getRangeAt:()=>({intersectsNode:()=>true}),toString:()=>selected}),querySelectorAll:()=>[{}]};api.installCopyConditions(doc);
for(const type of ['copy','cut']){const values={};let prevented=false;handlers[type]({preventDefault(){prevented=true;},clipboardData:{setData:(mime,text)=>values[mime]=text}});assert(prevented);assert.equal(values['text/plain'],selected+'\n\n'+conditions);assert(values['text/html'].includes('Noncommercial')||values['text/html'].includes('noncommercial'));assert(values['text/html'].includes('Creative Commons 2.5'));}
let prevented=false;handlers.copy({preventDefault(){prevented=true;}});assert(prevented,'licensed selection with no clipboard delivery remains fail-closed');
doc.querySelectorAll=()=>[];prevented=false;handlers.copy({preventDefault(){prevented=true;}});assert(!prevented,'unrelated copy remains unaffected');
for(const format of ['text','json','html'])assert.throws(()=>api.exportSelection({}, {format,use:'noncommercial-free-educational-reader'}),'invented export results rejected');
const template=fs.readFileSync('src/pages/reader/chok.astro','utf8');assert(template.includes('ck-noach-print-conditions'));assert(template.includes('Complete applicable retained conditions and permission evidence'));console.log(JSON.stringify({actualNoachCopyAndCutConditionsExact:true,missingClipboardFailClosed:true,unrelatedCopyUnaffected:true,unadmittedExportsRejected:3,staticPrintConditionsRetained:true}));
