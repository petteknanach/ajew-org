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
assert(output.includes('<details class="ck-layer ck-onkelos-translation">'));
assert(!output.includes('<details class="ck-layer ck-onkelos-translation" open'));
assert(!s.targum(row, true, false).includes('ck-onkelos-translation'), 'Nach Targum behavior stays unchanged');
assert(!s.targum(row, false, true).includes('ck-onkelos-translation'), 'English-off mode stays unchanged');
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
for (const [input, expected] of [
  ['And Abram journeyed. <span class="wst-verse wst-verse-default"', 'And Abram journeyed. '],
  ['A <span class="wst-verse">source</span> B', 'A source B'],
  ['A &lt;span class=&quot;wst-verse&quot;&gt;source&lt;/span&gt; B', 'A source B'],
  ['<span onclick="evil()"><b class="carrier">Source</b></span>', '<b>Source</b>'],
  ['<script>evil()</script><style>body{display:none}</style>Source', 'Source'],
  ['Name & punctuation: 3 < 5; אֲבַג.', 'Name &amp; punctuation: 3 &lt; 5; אֲבַג.']
]) assert.equal(s.richText(input), expected, 'Provider markup must not become source text or executable attributes');
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
// Hebrew chapter then verse reads right-to-left; Latin/numeric controls stay left-to-right.
let referenceCases = 0;
for (let chapter = 1; chapter <= 150; chapter++) {
  for (let verse = 1; verse <= 176; verse++) {
    const label = numeralContext.plainHeNum(chapter) + ':' + numeralContext.plainHeNum(verse);
    const html = numeralContext.refLabelHTML(label);
    assert(html.startsWith('<bdi class="ck-generated-ref" dir="rtl">'));
    assert.equal(html.replace(/<[^>]+>/g, ''), label);
    referenceCases++;
  }
}
assert(numeralContext.refLabelHTML('יב:א–יג:ד').startsWith('<bdi class="ck-generated-ref" dir="rtl">'));
for (const label of ['12:1', '28:15', 'Genesis 12:1', '12:1–13:4']) {
  const html = numeralContext.refLabelHTML(label);
  assert(html.startsWith('<bdi class="ck-generated-ref" dir="ltr">'));
  assert.equal(html.replace(/<[^>]+>/g, ''), label);
}
console.log('Chapter:verse direction regression PASS:', referenceCases, 'Hebrew labels, range and English/numeric controls');
const dayRenderer=main.slice(main.indexOf('  function renderDay()'),main.indexOf('  function renderDay()')+18000);
const halachaGate="if ((qualifiedDailyHas(wk,dayE,'halacha') || d.halacha && d.halacha.work) && want('halacha'))";
const talmudGate="if ((qualifiedDailyHas(wk,dayE,'talmud') || isLechThursday(wk,dayE) || d.gemara && d.gemara.masechet) && want('talmud'))";
const gemaraAt=dayRenderer.indexOf(talmudGate),zoharAt=dayRenderer.indexOf("if (want('kabbala'))"),halachaAt=dayRenderer.indexOf(halachaGate);
assert(gemaraAt>=0&&zoharAt>=0&&halachaAt>=0,'All ordered section guards must exist');
assert(gemaraAt<halachaAt);
assert(zoharAt<halachaAt);
assert(main.includes("en:'One sign in the printed text is unclear.'"));
const template=fs.readFileSync('src/pages/reader/chok.astro','utf8');
assert(template.includes('#ck-content > .ck-section > .ck-talmud > summary'));
assert(template.includes('font-size:clamp(1.2rem,2.2vw,1.65rem)'));
console.log('Chok markup and Hebrew numeral regression PASS: Targum, safe classical markup, English, metadata anchors, injection negatives, fallback wiring and immutable originals');
