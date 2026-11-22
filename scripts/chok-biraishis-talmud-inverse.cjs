'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(path.join(__dirname,'chok-biraishis-talmud-delta.json'));
assert.equal(sha(raw),'0d51bb224cca6688d865639bcde4601961be93b7460052be415830237c84d317');
const delta=JSON.parse(raw);
function restore(relative,bytes){
 const row=Object.hasOwn(delta,relative)&&delta[relative];
 if(!row||!Buffer.isBuffer(bytes)||sha(bytes)!==row.after)return bytes;
 let text=bytes.toString('utf8');
 for(const [after,before] of row.ops){assert.equal(text.split(after).length,2);text=text.replace(after,before);}
 const original=Buffer.from(text);assert.equal(sha(original),row.before);return original;
}
module.exports={restore};
