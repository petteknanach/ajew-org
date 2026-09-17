import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/reader-script.js',import.meta.url),'utf8');
const start=source.indexOf('function scrollToReaderArrival(');
const end=source.indexOf('// --- Segment Permalink Buttons ---',start);
assert.ok(start>=0 && end>start);
for(const [name,search,hasMatch,expected] of [
 ['search arrival chooses exact highlight','?q=joy',true,'match'],
 ['plain fragment keeps segment target','',true,'segment'],
 ['unmatched search falls back to segment','?q=absent',false,'segment'],
 ['empty query keeps segment target','?q=',true,'segment'],
]) test(name,()=>{
 const calls=[];
 const match={scrollIntoView:options=>calls.push(['match',options.block])};
 const target={querySelector:selector=>{assert.equal(selector,'.search-highlight');return hasMatch?match:null;},scrollIntoView:options=>calls.push(['segment',options.block])};
 const ctx=vm.createContext({URLSearchParams,window:{location:{search}}});
 vm.runInContext(source.slice(start,end),ctx);
 ctx.scrollToReaderArrival(target);
 assert.deepEqual(calls,[[expected,'center']]);
});
test('both startup fragment paths use the same arrival policy',()=>{
 assert.equal((source.match(/scrollToReaderArrival\(target\);/g)||[]).length,2);
});
