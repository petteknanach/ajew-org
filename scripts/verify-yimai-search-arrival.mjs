import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {loadEdition} from '../src/lib/qualified-yimai-hatlaos.mjs';
import {qualifiedSearchAnchor,qualifiedSearchLocation} from '../src/lib/qualified-search-arrival.mjs';
export async function verifyArrival(root=process.cwd()){
 const d=await loadEdition(root);let owners=0;
 for(const u of d.units){const row=[u.owner,u.section];assert.equal(qualifiedSearchAnchor('/reader/reviewed/yimai-hatlaos',row),'#'+u.anchor);assert.equal(qualifiedSearchAnchor('/reader/reviewed/yimai-hatlaos/',row),'#'+u.anchor);const label=u.record_kind==='book-title'?'Book title':u.record_kind==='source-attribution-note'?'Source attribution':'paragraph '+(u.array_position+1);assert.equal(qualifiedSearchLocation('/reader/reviewed/yimai-hatlaos',row),'Yimai HaTlaos — '+u.human_title+', '+label);assert.equal(qualifiedSearchAnchor('/reader/reviewed/yimai-hatlaos',[u.owner,999]),'');assert.equal(qualifiedSearchAnchor('/reader/reviewed/yimai-hatlaos',row),'#'+u.anchor);owners++;}
 for(const owner of ['unknown','yt-1:01','yt-37:1','toString','constructor','__proto__']){assert.equal(qualifiedSearchAnchor('/reader/reviewed/yimai-hatlaos',[owner,1]),'');assert.equal(qualifiedSearchAnchor('/reader/reviewed/yimai-hatlaos',[owner,undefined]),'');assert.equal(qualifiedSearchLocation('/reader/reviewed/yimai-hatlaos',[owner,1]),'');}
 assert.equal(qualifiedSearchAnchor('/reader/example/1/1',[7,1]),'#seg-7');assert.equal(qualifiedSearchLocation('/reader/example/1/1',[7,1]),'');assert.equal(qualifiedSearchAnchor('/reader/alim-litrufa/reviewed/part-2-17-62-63',['17-p0',17]),'#letter-17-segment-0');assert.equal(qualifiedSearchAnchor('/reader/reviewed/wrapup-18-19-92-209',['92:3',92]),'#unit-92-3');
 return {status:'PASS',owners,unknownAndPrototypeOwnersRejected:true,otherRouteAnchorBehaviorConserved:true,scope:'Actual shared search-arrival and human-reference functions; not browser search-result click acceptance'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await verifyArrival()));
