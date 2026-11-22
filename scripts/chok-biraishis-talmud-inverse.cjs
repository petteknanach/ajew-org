'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(path.join(__dirname,'chok-biraishis-talmud-delta.json'));
assert.equal(sha(raw),'3b37fd9e954e311bf018704f7173490398e3ab206da37746bf56195b3f85669a');
const delta=JSON.parse(raw);
function restore(relative,bytes){
 const row=Object.hasOwn(delta,relative)&&delta[relative];
 if(!row||!Buffer.isBuffer(bytes)||sha(bytes)!==row.after)return bytes;
 let text=bytes.toString('utf8');
 for(const [after,before] of row.ops){assert.equal(text.split(after).length,2);text=text.replace(after,before);}
 const original=Buffer.from(text);assert.equal(sha(original),row.before);return original;
}
module.exports={restore};
