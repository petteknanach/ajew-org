// Source-only real Astro transforms. No full build, server output or browser claim.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{transform}=require('@astrojs/compiler');
const paths=['src/components/AitzoasQualifiedPage.astro','src/pages/reader/aitzoas-yeshuroas/[part]/[torah].astro','src/pages/reader/aitzoas-yeshuroas/[part]/index.astro','src/pages/reader/aitzoas-yeshuroas/topics/[slug].astro','src/pages/reader/aitzoas-yeshuroas/apparatus/[slug].astro'];
const results=[];
for(const p of paths){const result=await transform(fs.readFileSync(p,'utf8'),{filename:path.resolve(p),resultScopedSlot:true,resolvePath:async(specifier)=>specifier});assert.equal(result.diagnostics.filter(d=>d.severity===1).length,0,p);results.push({path:p,diagnostics:result.diagnostics,codeBytes:Buffer.byteLength(result.code),css:result.css.length});}
console.log(JSON.stringify({boundary:'real source-only Astro compiler transforms; not a route build or native rendering',compiler:require('@astrojs/compiler/package.json').version,results,maxRSSKiB:process.resourceUsage().maxRSS},null,2));
