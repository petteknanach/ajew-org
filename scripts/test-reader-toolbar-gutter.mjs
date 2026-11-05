import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const css=fs.readFileSync(new URL('../public/reader-mobile.css',import.meta.url),'utf8');
const layout=fs.readFileSync(new URL('../src/layouts/Layout.astro',import.meta.url),'utf8');
test('initialized mobile Reader reserves the existing calendar gutter without changing desktop controls',()=>{
 const mobile=css.indexOf('@media (max-width: 768px)');
 const rule=css.indexOf('.reader-mobile-ready .reader-toolbar {',mobile);
 assert(mobile>=0&&rule>mobile);
 const declarations=css.slice(rule,css.indexOf('}',rule));
 assert.match(declarations,/padding:\s*6px 6px 6px 56px;/);
 assert.match(declarations,/flex-wrap:\s*wrap;/);
 assert.match(declarations,/overflow-y:\s*auto;/);
 assert(!css.slice(0,mobile).includes('56px'));
});
test('Layout versions the exact mobile stylesheet bytes for returning Readers',()=>{
 const token=crypto.createHash('sha256').update(css).digest('hex').slice(0,12);
 assert.equal(layout.split('/reader-mobile.css?v='+token).length,2);
 assert(!layout.includes('/reader-mobile.css?v=3531cfb47def'));
});
