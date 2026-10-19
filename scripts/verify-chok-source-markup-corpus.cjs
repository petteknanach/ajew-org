'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.argv[2],report=process.argv[3];
const {documentFor}=require('./qualified-earlier-parsha-test-dom.cjs');
const context={window:{},localStorage:{getItem(){return null;}},document:documentFor('<html><body></body></html>')};
function independentText(html){const doc=documentFor('<html><body>'+html+'</body></html>');for(const n of doc.querySelectorAll('script,style'))n.remove();return doc.querySelector('body').textContent;}
vm.runInNewContext(fs.readFileSync('public/chok-source-reader.js','utf8'),context);const rich=context.window.ChokSources.richText;
let books=0,fields=0,providerTails=0,tagged=0,failures=[];
for(const file of fs.readdirSync(root).filter(x=>x.endsWith('.json'))){
 const original=fs.readFileSync(path.join(root,file));const book=JSON.parse(original);books++;
 for(const[chapter,rows]of Object.entries(book.ch||{}))for(const[verse,raw]of Object.entries(rows)){
  if(typeof raw!=='string')continue;fields++;const rendered=rich(raw);
  const originalText=independentText(raw),renderedText=independentText(rendered);if(originalText!==renderedText)failures.push({file,chapter,verse,kind:'independent-source-text-mismatch',originalText,renderedText});
  if(/<\/?[a-z]/i.test(raw))tagged++;
  const tail=raw.match(/\s*<span\s+class\s*=\s*["']wst-[^<>]*$/i);
  if(tail){providerTails++;const before=raw.slice(0,tail.index),gap=tail[0].match(/^\s*/)[0];assert.equal(rendered,rich(before+gap),'Only the independently identified carrier suffix may disappear');const escapedTail=rendered.includes('&lt;span')||rendered.includes('wst-verse');if(escapedTail)failures.push({file,chapter,verse,kind:'provider-tag-still-visible'});}
  if(/&lt;\/?(?:span|div|a|img|script|style|font)\b/i.test(rendered))failures.push({file,chapter,verse,kind:'visible-markup'});
  if(/<(?:script|img|iframe|style)\b|\son(?:click|error|load)\s*=/i.test(rendered))failures.push({file,chapter,verse,kind:'unsafe-output'});
 }
 assert.equal(fs.readFileSync(path.join(root,file)).compare(original),0);
}
fs.writeFileSync(report,JSON.stringify({books,fields,tagged,providerTails,failures,sourceFilesUnchanged:true},null,2)+'\n');assert.equal(failures.length,0);console.log(JSON.stringify({books,fields,tagged,providerTails,failures:failures.length,sourceFilesUnchanged:true}));
