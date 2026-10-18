// Canonical scoped source/Q/history/export/discovery check; not native or semantic review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {PIN,ASSET,ORDER,validateProjection,authenticateEdition,fullBodyPayload,historyEntries,stable} from '../public/qualified-sichos-231240-core.mjs';
import {loadEdition,plainExport} from '../src/lib/qualified-sichos-231240.mjs';
import {GET,getStaticPaths} from '../src/pages/reader-plain/reviewed/sichos-231-240/[format].js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const EXPECTED=[
  {
    "owner": "sichos-231-position-0",
    "sha256": "e7ed8442ffd394bf961da0299b87ec9e72dddff8a64997db415b3740bd02db21"
  },
  {
    "owner": "sichos-231-position-1",
    "sha256": "067ae5340918c0d4149be6bf92e7a1b6e1584db809ae78582dbc2025283d9f1d"
  },
  {
    "owner": "sichos-232-position-0",
    "sha256": "7f396fd4c7b9e244a562cd9b31fef818f21ace48192c65bfb526cff2fca4d5b3"
  },
  {
    "owner": "sichos-232-position-1",
    "sha256": "9faff36300d5e6828c44a1659af33cd5c20a011dddf401cf2eec1a5a9e87c862"
  },
  {
    "owner": "sichos-232-position-2",
    "sha256": "719ba1197dd56be28c987c6c0bd4f317831a1cac9db5f0d96e1cd9a8ebe0f68e"
  },
  {
    "owner": "sichos-232-position-3",
    "sha256": "ba56e3c51b8010bf0e74ca035926fbc17d28c675bf94851ed70a2c62e7353dc6"
  },
  {
    "owner": "sichos-232-position-4",
    "sha256": "1ffa5f5e8c0d468f431298fae541f3d49a619c86dfea98266072e0cf8b4709e0"
  },
  {
    "owner": "sichos-232-position-5",
    "sha256": "38df35899dee605e7312857baa52a00c667e282bc7ef4fa1e9240b0e1aa65c3b"
  },
  {
    "owner": "sichos-232-position-6",
    "sha256": "8b3c752288e92ba5925dc4a37d4530c82adf10a6f71b4d788926332bc2e5ae15"
  },
  {
    "owner": "sichos-232-position-7",
    "sha256": "fda17717dbe54ec585a9ffe38ce5dd1f13ed7998f26a25ceb5d283fae6693851"
  },
  {
    "owner": "sichos-233-position-0",
    "sha256": "6206328c96faa197780da3c11f3bedc5ad5338c35ef8e3f6618c53757ae9b592"
  },
  {
    "owner": "sichos-233-position-1",
    "sha256": "8012197272a9082fe35a17901140de2e2128b4cd8746b03e908faecfb04da26f"
  },
  {
    "owner": "sichos-233-position-2",
    "sha256": "574b3019c0a26610dcd84a10c5e7951d793c4d761060cfe13a3ed8097043e23a"
  },
  {
    "owner": "sichos-233-position-3",
    "sha256": "9d2b1767c14ef9953b7a1f3b7818911e51626ebf544b2dfde3e5d9f711ecff55"
  },
  {
    "owner": "sichos-233-position-4",
    "sha256": "efd09857d4983a6f859a0ca2a80d7c905098594870dc9131dd5d1f78c59b07a8"
  },
  {
    "owner": "sichos-233-position-5",
    "sha256": "ad37d5dc83039e0621a7820e0da6dbbacbe4528cccbbb6c7f6ae33dd169bb641"
  },
  {
    "owner": "sichos-233-position-6",
    "sha256": "4eccf73b5e60d803b8fd37ca20e6f44c0019fa5b012259bcc11dd7d4c4f27561"
  },
  {
    "owner": "sichos-234-position-0",
    "sha256": "d81619bcf9d6bf6866cd2942460a155866d2acf2201f6f01c261c7f4a3831d27"
  },
  {
    "owner": "sichos-234-position-1",
    "sha256": "2a8c6b53c794b87dffb79fd3aaca0104643eacf02f99220c034691ef1c23965d"
  },
  {
    "owner": "sichos-234-position-2",
    "sha256": "4dee679309103b80f95a0037b43111f2c0c293530efb602534db2898f25ad168"
  },
  {
    "owner": "sichos-234-position-3",
    "sha256": "a6dfa2b1839817e087d2030af160eb7ecd2376d586fcdc3e4260370b1830c896"
  },
  {
    "owner": "sichos-234-position-4",
    "sha256": "b3d021680dddc068c4e774637333b26dc6ed7b228d5622c2e4869cdeb8b5f41e"
  },
  {
    "owner": "sichos-235-position-0",
    "sha256": "bf4914e79400b6975d087eeedf613f584fe7504a38f410cea1f0a8508d526a61"
  },
  {
    "owner": "sichos-235-position-1",
    "sha256": "2a3ef9028c2641cb81a9a4e5da6b93e9ad954a1cd318c9bc827e7b86d37b57f2"
  },
  {
    "owner": "sichos-235-position-2",
    "sha256": "8ed8503d4dc79f444694bdc014f9adddf77f3eeb262ebae396a607ef7bcde03d"
  },
  {
    "owner": "sichos-235-position-3",
    "sha256": "a2f677b3501c369d2cee0964897ed8691082c2de1ca893e73cc9235af6f677be"
  },
  {
    "owner": "sichos-235-position-4",
    "sha256": "025b5b26cc5af8b41946fab13da314164336fba87abc2a87e20064b52ca438be"
  },
  {
    "owner": "sichos-235-position-5",
    "sha256": "89d87a091456aa0189d785945e5ba697e21b85d70e09d8f54ca1b9ed57a6a84d"
  },
  {
    "owner": "sichos-235-position-6",
    "sha256": "f1b719ddf4f1cf84e0c957594f6c0c0a4d817706b36fdb26a7b0705271258138"
  },
  {
    "owner": "sichos-235-position-7",
    "sha256": "a1d22e4ce8a9d03d2530021b7af55ab6a6a591c35f58dbb984c0613d9ad66b71"
  },
  {
    "owner": "sichos-235-position-8",
    "sha256": "f3ed9f28062b820c82ef2f6bcae528a89b885230a2ce337f67b4cdecfe674670"
  },
  {
    "owner": "sichos-235-position-9",
    "sha256": "dbfd588fccc34f2efb759042276ea15b233a2cc500f0477cbda0c587f323680c"
  },
  {
    "owner": "sichos-235-position-10",
    "sha256": "def1368962232c66d757b377e6f872211f4e0288d72f3409a60588ff1ab5b5e8"
  },
  {
    "owner": "sichos-235-position-11",
    "sha256": "2c2e0dabeaccac2e1fc6ccd598e31ef8455bb9796df9ab72f260a38b17a4e7d9"
  },
  {
    "owner": "sichos-236-position-0",
    "sha256": "c1444257a86ce6a9ce24f0df076dc3604dd5aa0396b2ea41dced096a5a56f722"
  },
  {
    "owner": "sichos-236-position-1",
    "sha256": "55e455f8867e1e22426be0e898267959a6e961cce1ca7c382b1f7fd2caa19cfb"
  },
  {
    "owner": "sichos-237-position-0",
    "sha256": "841f58ccd3d0a1941fbc6f95b02d5848e05dcae088b366125e0ff8a7c15918d9"
  },
  {
    "owner": "sichos-237-position-1",
    "sha256": "17320fb78edfa389734c9065a61aa55e1907ad07b304228914387bf61d99ab84"
  },
  {
    "owner": "sichos-237-position-2",
    "sha256": "752166bdae38f4951c8c5d20071ef1fc52efead2f003534f8756d31746e3ab2a"
  },
  {
    "owner": "sichos-238-position-0",
    "sha256": "84b6d80e51287d83dc8e044e0df27546471101c0e47fbaff28c86ff24ae9cf4c"
  },
  {
    "owner": "sichos-238-position-1",
    "sha256": "aad5b70209ce11a40cee154f6633b3d9fd9059d446bf986ed4a29b295aca3a90"
  },
  {
    "owner": "sichos-238-position-2",
    "sha256": "01790c786d9d1861b064e875bebd313969ff346496f86ebd6007ea2df12a7a7a"
  },
  {
    "owner": "sichos-238-position-3",
    "sha256": "93658d03745f5603db3090edfd57d47ce244f5e02b1fd756b69d8231d8d9a4ea"
  },
  {
    "owner": "sichos-239-position-0",
    "sha256": "657dca100d06e30bcbb768ee30825a81887bbe92f7cc386c5207992f431ff09b"
  },
  {
    "owner": "sichos-239-position-1",
    "sha256": "658bf74d12d588d014ee668ded7ccfcfd3895b532a8112b465843201ef1d7907"
  },
  {
    "owner": "sichos-239-position-2",
    "sha256": "f24a146c65a6d0848ee09e2a1b82a04e838b2311561cc72f415e11f98132d855"
  },
  {
    "owner": "sichos-240-position-0",
    "sha256": "57ec08f878e53073ebbb2eb0fb1218b3fe043513e6e67fc9985e6d35bb4c0c33"
  },
  {
    "owner": "sichos-240-position-1",
    "sha256": "42e9c96c7f76064198c05dfee0e22c4da0354a1ae7929e1652c611a7082253c2"
  },
  {
    "owner": "sichos-240-position-2",
    "sha256": "f41d7cae44ca86e1a11aeb3156c5520017ac06055cfc92c509460de4fa48765a"
  },
  {
    "owner": "sichos-240-position-3",
    "sha256": "0d369e944ff745dcdb574e7edf303b9f7e930aac8289ba99c77898271f8f0fc5"
  },
  {
    "owner": "sichos-240-position-4",
    "sha256": "299d090727e6123262e7672118e16bf9618ae47afe654ba91b5772f4a1950872"
  },
  {
    "owner": "sichos-240-position-5",
    "sha256": "6a46a7a7b8cd91f46bb7fb6884e78715c9e45c3af3db3141713b985dc55e0bd5"
  }
];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const data=await loadEdition(ROOT),ids=data.units.map(u=>u.owner),raw=fs.readFileSync(path.join(ROOT,'public',ASSET));
const loaded=Object.fromEntries(data.assets.map(a=>{const b=fs.readFileSync(path.join(ROOT,'public',a.url));return [a.name,a.name.endsWith('.json')?JSON.parse(b):b.toString('utf8')];}));
function exact(d,assets=loaded){
 validateProjection(d,assets);
 assert.deepEqual(d.units.map(u=>u.owner),EXPECTED.map(x=>x.owner),'OWNER-ORACLE');
 for(const [i,u] of d.units.entries())assert.equal(sha(Buffer.from(stable(u))),EXPECTED[i].sha256,'SOURCE-Q-HISTORY-ORACLE');
 assert.equal(d.units.flatMap(u=>u.qualifications).length,135);
 return true;
}
assert.equal(sha(raw),PIN);assert.equal(data.units.length,52);exact(data);
assert.deepEqual(ORDER,data.units.map(u=>[u.section,u.array_position,u.source_index]));
for(const u of data.units){
 const canonical=JSON.parse(fs.readFileSync(path.join(ROOT,'public/reader/sichos-haran/sicha-'+u.section+'.json'))).segments[u.array_position];
 assert.equal(canonical.index,u.source_index);for(const f of ['he','he_nikud'])assert.equal(canonical[f],u[f]);
 const p=fullBodyPayload(data,[u.owner]);assert.deepEqual(p.requiredQualifications,u.qualifications);assert.deepEqual(p.sourceUnits,[u]);
 for(const f of ['he','he_nikud','en'])assert(p.content.includes(u[f]));for(const q of u.qualifications)assert(p.content.includes(q.text));for(const h of historyEntries(u))assert(p.content.includes(h.text));
}
const whole=fullBodyPayload(data,ids);assert.equal(whole.requiredQualifications.length,135);
const mutations=[
 ['missing-owner',d=>d.units.pop()],['wrong-order',d=>d.units.reverse()],
 ['changed-English',d=>d.units[0].en+='x'],['changed-Hebrew',d=>d.units[0].he+='x'],['changed-pointing',d=>d.units[0].he_nikud+='x'],
 ['lost-Q',d=>d.units[0].qualifications.pop()],['wrong-Q-order',d=>d.units[0].qualifications.reverse()],['wrong-Q-owner',d=>d.units[0].qualifications[0].owner=ids[1]],
 ['lost-history',d=>delete d.units[0].history],['changed-earlier-English',d=>d.units[0].history.earlier_supplied_English+='x'],
 ['lost-comparison',d=>d.units[0].history.comparison_witnesses.pop()],['wrong-comparison-link',d=>d.units[0].history.comparison_witnesses[0].full_witness_text_url='/wrong'],
 ['lost-asset',d=>d.assets.pop()],['wrong-source-index',d=>d.units[0].source_index=999]
];
for(const [name,mutate] of mutations){const d=structuredClone(data);mutate(d);assert.throws(()=>exact(d),undefined,name);exact(data);}
// Valid consistent in-memory changes still fail independent parent source oracle.
for(const kind of ['English','Q','history']){
 const d=structuredClone(data),a=structuredClone(loaded),u=d.units[0],r=a['selected-52.json'].rows[0];
 if(kind==='English'){u.en+='x';u.field_sha256.en=sha(Buffer.from(u.en));r.fields.en=u.en;if(Object.hasOwn(r,'field_sha256'))r.field_sha256.en=u.field_sha256.en;}
 else if(kind==='Q'){u.qualifications[0].text+='x';r.required_qualifications=structuredClone(u.qualifications);}
 else {u.history.role+='x';r.history=structuredClone(u.history);}
 assert.throws(()=>exact(d,a),/SOURCE-Q-HISTORY-ORACLE/,kind);exact(data);
}
for(const invalid of [[],[ids[0],ids[0]],['unknown'],[ids.at(-1),ids[0]]])assert.throws(()=>fullBodyPayload(data,invalid));
assert.throws(()=>fullBodyPayload(structuredClone(data),[ids[0]]));
await assert.rejects(authenticateEdition(Buffer.concat([raw,Buffer.from(' ')]),()=>{},sha));
for(const asset of data.assets)await assert.rejects(authenticateEdition(raw,a=>a.name===asset.name?Buffer.from('{}'):fs.readFileSync(path.join(ROOT,'public',a.url)),sha));
assert.deepEqual(getStaticPaths().map(x=>x.params.format),['index.txt','index.md','index.json']);
for(const f of ['txt','md','json']){const res=await GET({params:{format:'index.'+f}});assert.equal(res.status,200);assert.equal(res.headers.get('X-Robots-Tag'),'noindex, nofollow');const text=await res.text();if(f==='json'){const p=JSON.parse(text);assert.deepEqual(p.requiredQualifications,whole.requiredQualifications);assert.deepEqual(p.sourceUnits,data.units);assert.equal(p.content,whole.content);}else assert(text.includes(whole.content));}
assert.equal((await GET({params:{format:'english-only.txt'}})).status,404);
const html=plainExport(data,'html');assert.equal((html.match(/data-source-field=/g)||[]).length,156);assert.equal((html.match(/data-qualification=/g)||[]).length,135);assert.equal((html.match(/data-owner-history=/g)||[]).length,52);assert(!html.includes('<details'));
for(const rel of ['src/pages/reader/reviewed/index.astro','src/pages/reader/sichos-haran/[part]/index.astro','src/pages/reader/sichos-haran/[part]/[torah].astro']){const t=fs.readFileSync(path.join(ROOT,rel),'utf8');assert(t.includes('data-sichos-231240-entry'));assert(t.includes('/reader/reviewed/sichos-231-240/'));assert(t.includes('/reader/reviewed/sichos-221-230/'));}
const teaching=fs.readFileSync(path.join(ROOT,'src/pages/reader/sichos-haran/[part]/[torah].astro'),'utf8');assert(teaching.includes('torahNum >= 231 && torahNum <= 240'));assert(teaching.includes('/reader/reviewed/sichos-231-240/#group-sichos${torahNum}'));
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json')));assert.equal(pkg.scripts['verify:sichos-231240'],'node --max-old-space-size=128 scripts/verify-sichos-231240.mjs');assert(pkg.scripts.verify.includes(' && npm run verify:sichos-231240 && npm run verify:sichos-221230'));assert(pkg.scripts.verify.endsWith(' && npm run verify:sichos-221230'));
console.log(JSON.stringify({status:'PASS',paragraphs:52,source_fields:156,qualifications:135,owner_history:52,authenticated_bound_assets:data.assets.length,logical_rejection_fresh_positive_pairs:mutations.length+3,scope:'new canonical source/Q/history/export/discovery gate; no closed semantic/unit suite replay or native verification'}));
