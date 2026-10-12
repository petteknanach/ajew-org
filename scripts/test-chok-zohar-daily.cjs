const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto, createHash} = require('node:crypto');
const ROOT = path.resolve(__dirname, '../public');
const source = fs.readFileSync(path.join(ROOT, 'chok.js'), 'utf8');
const raw = fs.readFileSync(path.join(ROOT, 'reader/zohar/zohar-נח.json'), 'utf8');
const bounds = JSON.parse(fs.readFileSync(path.join(ROOT, 'reader/chok/zohar-ranges.json'), 'utf8'));
const ref = {vol:'נח', daf:61, amud:1};
function harness(change) {
 const data = structuredClone(bounds);
 let text = raw;
 if (change) text = change(data, text) || text;
 const fetched=[];
 const sandbox = {
  document:{readyState:'loading',addEventListener(){}},
  window:{crypto:webcrypto}, TextEncoder, Uint8Array, setTimeout, clearTimeout,
  fetch:async url=>{
   fetched.push(url);
   return {ok:true,json:async()=>url.includes('zohar-ranges')?data:JSON.parse(text),text:async()=>text};
  }
 };
 vm.createContext(sandbox);
 const marker="  if (document.readyState === 'loading') {";
 assert.equal(source.split(marker).length,2);
 vm.runInContext(source.replace(marker, '  globalThis.api = {zoharDayLines,zoharHTML};\n'+marker),sandbox);
 return {api:sandbox.api,fetched};
}
const select = h=>h.api.zoharDayLines(ref,'נח','יום שני','zohar-נח','a');
test('qualified daily passage uses exact owned spans and ends at daily endpoint',async()=>{
 const lines=Array.from(await select(harness()));
 const original=JSON.parse(raw).ch['61'].a;
 assert.deepEqual(lines,[original[2].slice(22,119),original[3],original[4].slice(0,99)]);
 assert.equal(createHash('sha256').update(lines.join('\n')).digest('hex'),bounds.days['נח|יום שני'].excerptSha256);
 assert.ok(lines[0].includes('וירא אלהי"ם את הארץ והנה נשחתה'));
 assert.ok(lines.at(-1).endsWith('המלאך הגואל אותי'));
 assert.equal(lines.some(x=>x.includes('דגרים חטאה')),false);
});
test('source drift rejected, including changes outside selected spans',async()=>{
 await assert.rejects(select(harness((d,t)=>t+' ')),/source changed/);
});
test('wrong schedule reference rejected',async()=>{
 const h=harness(d=>{d.days['נח|יום שני'].ref.daf=62;});
 await assert.rejects(select(h),/reference mismatch/);
});
test('invalid span rejected',async()=>{
 const h=harness(d=>{d.days['נח|יום שני'].segments[0].startOffset=-1;});
 await assert.rejects(select(h),/span unavailable/);
});
test('valid but shifted span rejected by excerpt authentication',async()=>{
 const h=harness(d=>{d.days['נח|יום שני'].segments[0].startOffset++;});
 await assert.rejects(select(h),/excerpt mismatch/);
});
test('missing daily bounds fails visibly instead of substituting full amud',async()=>{
 const h=harness(d=>{delete d.days['נח|יום שני'];});
 const rendered=await h.api.zoharHTML(ref,'נח','יום שני');
 assert.ok(rendered.includes('ck-error'));assert.equal(rendered.includes('ck-zohar-line'),false);
});
test('other day preserves prior full-amud behavior without new boundary fetch',async()=>{
 const h=harness();
 const lines=Array.from(await h.api.zoharDayLines(ref,'נח','יום שלישי','zohar-נח','a'));
 assert.deepEqual(lines,JSON.parse(raw).ch['61'].a);
 assert.equal(h.fetched.some(x=>x.includes('zohar-ranges')),false);
});
test('renderer decodes source quotation entities without altering source selection',async()=>{
 const rendered=await harness().api.zoharHTML(ref,'נח','יום שני');
 assert.equal((rendered.match(/class="ck-zohar-line"/g)||[]).length,3);
 assert.equal(rendered.includes('&amp;quot;'),false);
 assert.ok(rendered.includes('"וירא אלהי"ם'));
 assert.ok(rendered.includes('המלאך הגואל אותי</div>'));
});
