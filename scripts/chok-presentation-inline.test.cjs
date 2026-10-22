'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.CHOK_SOURCE||'public/chok-source-reader.js','utf8');
const box={window:{},document:{addEventListener(){}},localStorage:{getItem:()=>null}};vm.runInNewContext(source,box);const api=box.window.ChokSources;
const original='<big>מתני׳</big> שְׁלֹשָׁה אַחִין';
for(const input of [original,'&lt;big&gt;מתני׳&lt;/big&gt; שְׁלֹשָׁה אַחִין','<BIG title="not executable" onclick="evil()">מתני׳</BIG> שְׁלֹשָׁה אַחִין']){
 const out=api.richText(input);assert(!out.includes('&lt;big')&&!out.includes('&lt;/big')&&!out.includes('onclick'),'Source size wrappers must render, not leak code');assert.equal(out,'<big>מתני׳</big> שְׁלֹשָׁה אַחִין');
}
assert.equal(api.richText('3 < 5; </not-a-real-source-tag>'), '3 &lt; 5; &lt;/not-a-real-source-tag&gt;','Do not erase arbitrary angle-bracket source text');
assert.equal(api.richText('<big><b>Source</b></big>'),'<big><b>Source</b></big>');
const onkelos='וַהֲוָה כַּד (<small>נ"י</small> אַרֵי) קְרֵיב';
assert.equal(api.targumText(onkelos),'וַהֲוָה כַּד (<span class="ck-classical-gloss" data-source-role="classical-context">נ&quot;י</span> אַרֵי) קְרֵיב');
const template=fs.readFileSync(process.env.CHOK_TEMPLATE||'src/pages/reader/chok.astro','utf8');
assert(template.includes('.ck-targum-line .ck-classical-gloss { display:inline; border:0; padding:0; margin:0; }'));
assert(template.includes('.ck-generated-ref { display:inline-flex; unicode-bidi:isolate; white-space:nowrap; }'));
assert(template.includes('/chok-source-reader.js?v=chok-live-corrections-20261020-r1'));
assert(template.includes('/chok.js?v=e540c2702d2e7af86f11fbe7305666f179fc0b867c09de227906d558b1c44da6'));
console.log(JSON.stringify({bigActualAndEncodedAndAttributedWrappers:true,nestedFormatting:true,literalAngleBracketNegative:true,inlineOnkelosAbbreviationCharactersConserved:true,HebrewChapterPhysicallyRightContract:true,cacheBumps:true,scope:'private initialized source adapter plus exact CSS/template contracts; native pixels pending'}));
