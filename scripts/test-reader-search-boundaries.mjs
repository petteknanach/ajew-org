import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/reader-script.js',import.meta.url),'utf8');
const strip=source.slice(source.indexOf('function stripNikud('),source.indexOf('function applyNikud('));
const pattern=source.slice(source.indexOf('function readerSearchPattern('),source.indexOf('function performSearch('));
const ctx=vm.createContext({});
vm.runInContext(strip+'\n'+pattern,ctx);
test('Reader nikud toggle preserves every Hebrew boundary',()=>{
 assert.equal(ctx.stripNikud('כָּל־הָעוֹלָם׃שלום׀אמת׆'),'כל־העולם׃שלום׀אמת׆');
});
for (const [q,text,expected] of [
 ['כל העולם','כָּל־הָעוֹלָם',true],
 ['כָּל־הָעוֹלָם','כל העולם',true],
 ['כי הקדוש ברוך הוא נקרא','כי הקדוש־ברוך־הוא נקרא',true],
 ['כלהעולם','כָּל־הָעוֹלָם',false],
 ['שלום אמת','שלום׃אמת',true],
 ['שלום אמת','שלום׀אמת',true],
 ['שלום אמת','שלום׆אמת',true],
 ['prayer joy','prayer—joy',true],
]) test(`Reader phrase matching ${q} / ${text}`,()=>{
 assert.equal(typeof ctx.readerSearchPattern,'function');
 assert.equal(new RegExp(ctx.readerSearchPattern(q),'giu').test(text),expected);
});
