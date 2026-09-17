import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/pages/search.astro',import.meta.url),'utf8');
const script=source.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
function redirect(search,hash,withLink=true) {
 let target,href;
 vm.runInNewContext(script,{window:{location:{search,hash,replace(value){target=value;}}},document:{getElementById(){return withLink?{setAttribute(name,value){assert.equal(name,'href');href=value;}}:null;}}});
 return {target,href};
}
test('legacy entry preserves encoded Hebrew, filters, and fragment',()=>{
 const suffix='?q=%D7%94%D7%95%D7%90+%D7%91%D7%91%D7%97%D7%99%D7%A0%D7%AA+%D7%93%D7%91%D7%A8&searchType=exact&lang=he';
 assert.deepEqual(redirect(suffix,'#results'),{target:'/search-enhanced/'+suffix+'#results',href:'/search-enhanced/'+suffix+'#results'});
});
test('empty entry and missing fallback link still redirect',()=>{
 assert.equal(redirect('','',false).target,'/search-enhanced/');
});
test('encoded URL-like query stays on the local search route',()=>{
 const suffix='?q=https%3A%2F%2Fexample.com%2F%3Fa%3D1%26b%3D2';
 assert.equal(redirect(suffix,'').target,'/search-enhanced/'+suffix);
});
test('redirect contains no obsolete search engine or stylesheet',()=>{
 assert.equal((source.match(/<script\b/g)||[]).length,1);
 assert.doesNotMatch(source,/\/data\/search-index\.json|loadIndex\(|results\.slice\(0,\s*50\)|\.search-page\s*\{/);
 assert.match(source,/id="enhancedSearchLink" href="\/search-enhanced\/"/);
});
