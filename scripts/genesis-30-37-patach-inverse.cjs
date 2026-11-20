'use strict';
// Admit only the byte-exact Biraishis 30:37 projection and its script URL pins.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(path.join(__dirname,'genesis-30-37-patach-admission.json'));
assert.equal(sha(raw),'22f6255e3d8086458d0c7d28ed10026b38a7f6caa59e4ef4c7fa29357e1550a3');
const paths=JSON.parse(raw).paths;
const [oldVersion,newVersion]=paths['public/medooyuk.js'];
function restore(relative,bytes){
  const pin=paths[relative];
  if(!Array.isArray(pin)||bytes===null||sha(bytes)!==pin[1])return bytes;
  const ops=relative==='public/medooyuk.js'
    ? [["    {chapter: 30, verse: 20, token: 5, before: 'זֵ֣בֶד', after: 'זֶ֣בֶד'},\n    // User's exact occurrence ruling: patach under the ayin only.\n    {chapter: 30, verse: 37, token: 7, before: 'וְעֶרְמ֑וֹן', after: 'וְעַרְמ֑וֹן'}\n", "    {chapter: 30, verse: 20, token: 5, before: 'זֵ֣בֶד', after: 'זֶ֣בֶד'}\n"]]
    : relative==='public/reader-source-exact.js'
      ? [["    var reading = readingSources.get(candidate);\n    if (reading) {\n      var targetIndices = starts.map(function (start, i) {\n        var target = positions[start];\n        return target && target[1] === 0 && verse.t[target[0]] === candidate.t[i] ? target[0] : -1;\n      });\n      readingSources.set(verse, {source: reading.source, context: reading.context, targetIndices: targetIndices});\n    }", "    var reading = readingSources.get(candidate);\n    if (reading) {\n      var target = positions[starts[1]];\n      if (target && target[1] === 0 && verse.t[target[0]] === candidate.t[1])\n        readingSources.set(verse, {source: reading.source, context: reading.context, tokenIndex: target[0]});\n    }"], ["context: {book: book, chapter: ch, verse: +n}", "context: {book: book, chapter: ch, verse: +n}, tokenIndex: 1"], ["    var selected = renderer.readingVerse(bound.source, bound.context);\n    if (selected === bound.source || selected.t.length !== bound.source.t.length) return verse;\n    var tokens = null;\n    selected.t.forEach(function (token, i) {\n      var original = bound.source.t[i], at = bound.targetIndices ? bound.targetIndices[i] : i;\n      if (token === original || at < 0 || verse.t[at] !== original) return;\n      if (!tokens) tokens = verse.t.slice();\n      tokens[at] = token;\n    });\n    return tokens ? Object.assign({}, verse, {t: tokens}) : verse;", "    var selected = renderer.readingVerse(bound.source, bound.context), at = bound.tokenIndex;\n    if (selected === bound.source || verse.t[at] !== bound.source.t[1]) return verse;\n    var result = Object.assign({}, verse, {t: verse.t.slice()});\n    result.t[at] = selected.t[1];\n    return result;"]]
      : [['medooyuk.js?v='+newVersion,'medooyuk.js?v='+oldVersion],["reader-source-exact.js?v=9c90b9f1789a1403150e153bc3ba558ebe8f5710ad75a5a1013c1452e92d46f2", "reader-source-exact.js?v=bd8cb3bfafa671569205f58ca9bafa3f32c42b007f295695d2be6d300043917e"]];
  let text=bytes.toString('utf8');
  for(const [after,before] of ops){
    const n=text.split(after).length-1;
    if(!n&&after.startsWith('reader-source-exact.js?v='))continue;
    assert.equal(n,1);text=text.replace(after,before);
  }
  const restored=Buffer.from(text);
  assert.equal(sha(restored),pin[0]);
  return restored;
}
module.exports={restore};
