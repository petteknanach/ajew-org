'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {documentFor}=require('./qualified-earlier-parsha-test-dom.cjs');
const code=fs.readFileSync('public/chok-source-reader.js','utf8');
let comparisons=0;
for(const nativeEntities of [false,true]){
 const context={window:{},localStorage:{getItem(){return null;}},document:nativeEntities?documentFor('<html><body></body></html>'):{addEventListener(){}}};vm.runInNewContext(code,context);const api=context.window.ChokSources;
 for(const quote of ['&quot;','&#34;','&#034;','&#x22;','&#X0022;','&apos;','&#39;','&#x27;'])for(const attribute of ['x &gt; y','&lt;script&gt;','&lt;!--'])for(const fn of [api.richText,api.targumText]){assert.equal(fn('&lt;span title='+quote+attribute+quote+'&gt;יהוה&lt;/span&gt;'),'יהוה');comparisons++;}
 for(const input of ['<span title="&quot; &gt; carrier">יהוה</span>','&lt;span title="&quot; &gt; carrier"&gt;יהוה&lt;/span&gt;']){assert.equal(api.richText(input),'יהוה');comparisons++;}
 for(const n of [...Array(256).keys(),0xd800,0xdfff,0x10ffff,0x110000])for(const literal of ['&#'+n+';','&#x'+n.toString(16)+';']){
  const raw='יהוה '+literal+' source',expected=documentFor('<html><body>'+raw+'</body></html>').querySelector('body').textContent,actual=documentFor('<html><body>'+api.richText(raw)+'</body></html>').querySelector('body').textContent;assert.equal(actual,expected);comparisons++;
 }
}
console.log(JSON.stringify({escapedQuoteAndNumericHTML5Comparisons:comparisons,browserEntityBranchAndNoDOMFallback:true,sourceNamesConserved:true}));
