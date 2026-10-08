import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { transform } from '@astrojs/compiler';
import { transform as transpile } from 'esbuild';
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const packet = json('public/reader/parsha-packets/noach.json');
const source = json('public/reader/chayey-moharan/simanim/siman-463.json');
assert.equal(packet.segments.length, 1);
assert.equal(packet.verseRef, 'Genesis 6:8');
const seg = packet.segments[0];
assert.equal(seg.he, source.segments[0].he);
assert.equal(seg.en, source.segments[0].en);
assert.deepEqual(source.aligned_segments.map(s => ({he:s.he,en:s.en})),source.segments.map(s => ({he:s.he,en:s.en})));
assert.equal(seg.sourceUrl, '/reader/chayey-moharan/siman/463/');
assert.match(seg.he, /עבדו מביח"ו/);
assert.match(seg.he, /כי התורה כלה היא שמות/);
assert.match(seg.en, /entire Torah consists of names/);
assert.match(seg.en, /name according to its mission/);
assert.ok(seg.en.endsWith('(ונח מצא חן בעיני ה׳; Genesis 6:8).'));
assert.ok(!/recite|times daily|say this verse/i.test(seg.en),'Do not invent a recitation instruction');
const files=['src/components/ParshaSourceSupplement.astro','src/pages/parsha/[slug].astro','src/pages/reader/chumash-lh/[part]/[torah].astro','src/pages/reader/tanach-bereishit/[part]/[torah].astro','src/pages/reader/parsha-packets/noach.astro'];
let component;
for(const filename of files) {
  const r = await transform(fs.readFileSync(filename,'utf8'),{filename});
  assert.equal(r.diagnostics.filter(d=>d.severity===1).length,0,filename);
  if(filename===files[0])component=r;
}
const code = (await transpile(component.scripts[0].code,{loader:'ts',format:'iife'})).code;
const buttons=['en','he','both'].map(view=>({dataset:{supplementView:view},attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this[k]=fn}}));
const section={dataset:{view:'en'},querySelectorAll(){return buttons}};
vm.runInNewContext(code,{document:{querySelectorAll(){return [section]}}});
for(const button of buttons) {
  button.click();
  assert.equal(section.dataset.view,button.dataset.supplementView);
  assert.equal(button.attrs['aria-pressed'],'true');
  assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,1);
}
assert.ok(fs.readFileSync(files[1],'utf8').includes('<ParshaSourceSupplement packet={sourceSupplement} />'));
const reader=fs.readFileSync(files[2],'utf8');
assert.match(reader,/reviewedSlug \? \([\s\S]*?<ParshaSourceSupplement packet=\{sourceSupplement\}/);
const tanach=fs.readFileSync(files[3],'utf8');
assert.match(tanach,/torahNum === 6/);
assert.ok(tanach.includes('...(noachEntry ? [noachEntry] : [])'));
console.log('PASS: complete source/translation, separate verse boundary, all five Astro compiles, full-init English/Hebrew/Both controls, actual reviewed-reader branch, Genesis commentary wiring; no invented recitation claim.');
