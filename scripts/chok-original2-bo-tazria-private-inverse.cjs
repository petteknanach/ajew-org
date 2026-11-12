'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex');let pinned;
exports.restore=function(relative,bytes){if(bytes===null)return bytes;if(!pinned){const b=fs.readFileSync(path.join(__dirname,'chok-original2-bo-tazria-private-inverse.json'));assert.equal(sha(b),'e8683d82244f142c96f38621a2f4fba76280e8f6803f8eb17996780a7b60ae59');pinned=JSON.parse(b);}const d=pinned.paths[relative];if(!d||bytes.length!==d.afterBytes||sha(bytes)!==d.afterSHA256)return bytes;const before=Buffer.from(d.beforeBase64,'base64');assert.equal(before.length,d.beforeBytes);assert.equal(sha(before),d.beforeSHA256);return before;};
