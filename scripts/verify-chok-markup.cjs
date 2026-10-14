#!/usr/bin/env node
'use strict';
// Safe presentation only: authenticated source payloads remain byte-exact.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || 'public/chok-source-reader.js', 'utf8');
const context = { window: {}, localStorage: { getItem: () => null }, document: { addEventListener() {} } };
vm.runInNewContext(source, context);
const s = context.window.ChokSources;
const word = 'וְנָקְבָּא';
const raw = 'דְּכַר <b>' + word + '</b>:';
const row = { id: 'test-targum', he: raw, en: 'Male and female.', displayMeaningNotes: [] };
const output = s.targum(row, true, true);
assert(output.includes('דְּכַר ' + word + ':'), 'Onkelos must render its actual characters without imported bold wrappers');
assert(!output.includes('&lt;b&gt;'), 'Formatting code must not become reading text');
assert(!output.includes('<b>'), 'Onkelos must not inherit editorial bold emphasis');
for (const input of ['<b/>' + word, '<b />' + word, '<B>' + word + '</B>', '<strong>' + word + '</strong>', '<b onclick="evil()">' + word + '</b>']) {
  assert.equal(s.targumText(input), word);
}
assert.equal(s.targumText(' אֲבַג & " < 2 > 1'), ' אֲבַג &amp; &quot; &lt; 2 &gt; 1');
assert.equal(s.richText('<b>Opening</b> <i>reading</i>'), '<b>Opening</b> <i>reading</i>');
const contextGloss = s.richText('Main <small>classical gloss</small>');
assert(contextGloss.includes('<span class="ck-classical-gloss" data-source-role="classical-context">classical gloss</span>'));
assert(!contextGloss.includes('&lt;small&gt;'));
for (const input of [
  '<i data-commentator="Mishnah Berurah" data-label="א"></i>',
  '<i data-label="א" data-commentator="Magen Avraham" data-order="1"> </i>'
]) assert.equal(s.richText('A' + input + 'B'), 'AB');
for (const input of ['<img src=x onerror=evil()>', '<script>evil()</script>', '<b onclick="evil()">test</b>']) {
  const safe = s.richText(input);
  assert(!/<(?:img|script|b\s)/i.test(safe), 'Unknown elements and attributes must remain inert');
}
assert(s.english('<i>English</i>', true).includes('<i>English</i>'));
assert.equal(s.english('English', false), '');
assert.equal(s.targum(row, false, true).includes('Male and female.'), false);
const main = fs.readFileSync('public/chok.js', 'utf8');
assert(main.includes("return window.ChokSources.richText(s || '');"), 'Classical consumers must share safe rich-text handling');
assert(main.includes('window.ChokSources.targumText(applyMode(tgOriginal))'), 'Unqualified-week fallback must not restore unwanted Targum bold');
assert.equal(row.he, raw, 'Presentation must not mutate the raw original');
const numeralContext = { esc: x => x };
vm.createContext(numeralContext);
vm.runInContext(main.slice(main.indexOf('  function heNum(n)'), main.indexOf('  var __fq')), numeralContext);
assert.equal(numeralContext.heNum(1), "א'");
assert.equal(numeralContext.heNum(28), "כח'");
assert.equal(numeralContext.refLabelHTML(numeralContext.plainHeNum(28) + ':' + numeralContext.plainHeNum(15)).replace(/<[^>]+>/g, ''), 'כח:טו');
const dayRenderer=main.slice(main.indexOf('  function renderDay()'),main.indexOf('  function renderDay()')+18000);
assert(dayRenderer.indexOf("if (d.gemara &&")<dayRenderer.indexOf("if (d.halacha &&"));
assert(dayRenderer.indexOf("if (want('kabbala'))")<dayRenderer.indexOf("if (d.halacha &&"));
assert(main.includes("en:'One sign in the printed text is unclear.'"));
const template=fs.readFileSync('src/pages/reader/chok.astro','utf8');
assert(template.includes('#ck-content > .ck-section > .ck-talmud > summary'));
assert(template.includes('font-size:clamp(1.2rem,2.2vw,1.65rem)'));
console.log('Chok markup and Hebrew numeral regression PASS: Targum, safe classical markup, English, metadata anchors, injection negatives, fallback wiring and immutable originals');
