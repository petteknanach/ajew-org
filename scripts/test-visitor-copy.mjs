import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
import {transform} from '@astrojs/compiler';

const load = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const hash = s => createHash('sha256').update(s).digest('hex');
const reader = load('src/components/TikunHaklaliReader.astro');
const navigation = load('src/components/Navigation.astro');

test('visitor descriptions contain no authoring or repair-status language', () => {
  assert.doesNotMatch(reader,/frozen|user-saved|pagination-repaired|current approved|transports approved|recovered ten-Psalm/i);
  assert.match(reader,/English translation and transliteration\./);
  assert.doesNotMatch(navigation,/<!-- Content wrapper styles applied to <main>/);
  assert.doesNotMatch(navigation,/<!-- Empty content-wrapper div removed/);
});

test('complete Psalm/source corpus and all 164 verse identities are unchanged', () => {
  const raw = load('src/data/tikkun-klali.json');
  assert.equal(hash(raw),'c6c01b47dba33f658b07f5f8cd4aa50ef19fb83a8966b7c1f8bcd1857edbe73f');
  const data = JSON.parse(raw);
  assert.equal(data.chapters.length,10);
  assert.equal(data.chapters.reduce((n,c)=>n+c.verses.length,0),164);
});

test('reading controls, literal prayers and stylesheet retain complete byte pins', () => {
  const controls = reader.match(/<div class="klali-controls"[\s\S]*?(?=  <nav class="klali-chapters")/)[0];
  const prayers = [...reader.matchAll(/<p\b[^>]*(?:data-klali-text|class="klali-hebrew)[^>]*>[\s\S]*?<\/p>/g)].map(m=>m[0]).join('\n');
  assert.equal(hash(controls),'99c1b6eb82ab62e45108ee93cff15640988c93d190db8e0cff6d416333467527');
  assert.equal(hash(prayers),'9ce33e53b62f2bd4249ea4da65ae6c4c6f3108408b84ff6857d3f3a5691af489');
  assert.equal(hash(reader.slice(reader.indexOf('<style is:global>'))),'7660656e9fa26083cefc23fc2146273f06a513b8c187fd60998fa18d3e4eabbf');
});

test('source attribution, edition distinctions, licenses and pronunciation guide remain', () => {
  for (const literal of ['Revival of the Soul (Misheevas Nefesh)','https://tanach.us/','UXLC 2.5 Hebrew text (CC BY)','/tikkun/qatan-sources.html','CC BY-SA 4.0','pointing, divine-name spelling and qere','not to Original app Hebrew or the prayers','complete coverage of every linguistic distinction','ch = kh','ALL vowels are soft','iy = eye','{verse.publishedHebrew}']) assert.ok(reader.includes(literal),literal);
  for (const url of ['/medooyuk.js?v=capital-t-20261002-1','/tikkun-klali.js?v=20261027-copy-1']) assert.ok(reader.includes(url));
});

test('runtime messages are visitor-facing and all non-copy runtime bytes are unchanged', () => {
  let js = load('public/tikkun-klali.js');
  assert.doesNotMatch(js,/frozen pronunciation|approved annotations/);
  const replacements = [
    ['Complete published English · 164 verses. Translation and transliteration follow the book’s prayer text, rather than the independent Hebrew editions.','Complete published English · 164 verses. Translation and frozen pronunciation follow the book, not the independent Hebrew editions.'],
    ['Medooyuk · independent UXLC Hebrew with reading marks. English translation and transliteration follow the published prayer text, which may differ from this edition. The Psalm 95 companion is separate from the prayer text.','Medooyuk · independent UXLC Hebrew with approved annotations. English translation and frozen pronunciation follow the published book by verse identity, not a Medooyuk pronunciation overlay. The Psalm 95 companion is independent of the prayer variant.']
  ];
  for (const [current,previous] of replacements) {
    assert.equal(js.split(current).length-1,1);
    js = js.replace(current,previous);
  }
  assert.equal(hash(js),'519a6355c97c2ae6da82fa7d4d65d361aeb75ceeb04f60cd9adf4185d533a4bc');
});

for (const [name,source] of [['Navigation',navigation],['TikunHaklaliReader',reader]]) {
  test(name+' passes the real Astro compiler',async () => {
    const result = await transform(source,{filename:name+'.astro'});
    assert.ok(result.code.length>0);
    assert.equal((result.diagnostics||[]).filter(d=>d.severity===1).length,0);
  });
}
