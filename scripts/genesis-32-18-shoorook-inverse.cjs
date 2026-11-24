'use strict';
// Only the exact Genesis 32:18 display projection and its consuming URL pins.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(path.join(__dirname,'genesis-32-18-shoorook-admission.json'));
assert.equal(sha(bytes),'6176bafc6a16ebe2d46f2d357ec52936cfb84192bf2ed4d7cdbcb5d335c9e6ed');
const {paths}=JSON.parse(bytes);
function restore(relative,body){
  if(!Object.hasOwn(paths,relative)||body===null||sha(body)!==paths[relative].after)return body;
  const row=paths[relative]; let text=body.toString('utf8');
  for(const [after,before] of row.inverse){assert.equal(text.split(after).length,2);text=text.replace(after,before);}
  const restored=Buffer.from(text); assert.equal(sha(restored),row.before); return restored;
}
module.exports={restore,paths};
