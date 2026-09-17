import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizeSearchText, booleanMatch} from '../src/lib/search-mode-core.mjs';
const cases=[['כָּל־הָעוֹלָם','כל העולם'],['שלום׃אמת','שלום אמת'],['שלום׀אמת','שלום אמת'],['שלום׆אמת','שלום אמת'],['בְּרֵאשִׁ֖ית','בראשית'],['joy—prayer','joy prayer'],['רַבִּי נַחְמָן','רבי נחמן'],['רמב״ם','רמבם']];
for(const [input,expected] of cases) test(`boundary normalization ${input}`,()=>assert.equal(normalizeSearchText(input),expected));
test('word lookup through maqaf',()=>assert.equal(booleanMatch('כָּל־הָעוֹלָם','העולם'),true));
test('Python index and JavaScript query normalization agree',()=>{
 const code=`import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('builder','scripts/build-reader-search-shards.py')\nm=importlib.util.module_from_spec(s);s.loader.exec_module(m)\nprint(json.dumps([m.normalize(x) for x in json.loads(sys.stdin.read())]))`;
 const actual=JSON.parse(execFileSync('python3',['-B','-c',code],{cwd:new URL('../',import.meta.url),input:JSON.stringify(cases.map(c=>c[0])),encoding:'utf8'}));
 assert.deepEqual(actual,cases.map(c=>c[1]));
});
test('light-index stripping retains Hebrew boundaries upstream',()=>{
 const code=`import ast,re,json,sys\nfrom pathlib import Path\nt=ast.parse(Path('scripts/build-light-search-index.py').read_text())\nf=next(n for n in t.body if isinstance(n,ast.FunctionDef) and n.name=='strip_nikud')\nns={'re':re};exec(compile(ast.Module(body=[f],type_ignores=[]),'light-normalizer','exec'),ns)\nprint(json.dumps([ns['strip_nikud'](x) for x in json.loads(sys.stdin.read())]))`;
 const actual=JSON.parse(execFileSync('python3',['-B','-c',code],{cwd:new URL('../',import.meta.url),input:JSON.stringify(cases.map(c=>c[0])),encoding:'utf8'}));
 assert.deepEqual(actual.map(normalizeSearchText),cases.map(c=>c[1]));
 assert.equal(actual[0],'כל־העולם');
});
const page=readFileSync(new URL('../src/pages/search-enhanced.astro',import.meta.url),'utf8');
const extract=(name,next)=>page.slice(page.indexOf(`function ${name}(`),page.indexOf(`function ${next}(`));
// Explicitly bounded extraction, fail closed if the page structure changes.
const norm=page.match(/function normalizeForSearch\(text\) \{[\s\S]*?\n      \}/)?.[0];
assert.ok(norm);
const range=extract('normalizedRange','readerReference');
const ctx=vm.createContext({});
vm.runInContext(norm+'\n'+range,ctx);
test('actual client normalizer agrees with index fixtures',()=>{
 for(const [input,expected] of cases) assert.equal(ctx.normalizeForSearch(input),expected);
});
test('match-centered offsets cross maqaf without fusing words',()=>{
 const raw='לפני כָּל־הָעוֹלָם אחרי';
 const match=ctx.normalizedRange(raw,'כל העולם');
 assert.ok(match);
 assert.equal(normalizeSearchText(raw.slice(match.start,match.end)),'כל העולם');
 assert.equal(ctx.normalizedRange(raw,'כלהעולם'),null);
});
test('highlight mark class never consumes Hebrew punctuation',()=>{
 const literal=page.match(/const NIKUD_RANGE = ('[^']+');/)?.[1];
 assert.ok(literal);
 const mark=new RegExp(vm.runInNewContext(literal),'u');
 for(const c of '־׀׃׆') assert.equal(mark.test(c),false);
 for(const c of 'ְָּ֖') assert.equal(mark.test(c),true);
});
