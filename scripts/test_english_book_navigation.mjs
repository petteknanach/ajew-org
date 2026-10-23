import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { englishBookNavigation } from '../src/lib/english-book-navigation.mjs';

function fixture(run) {
  const scratch = process.env.TMPDIR || '/root/.hermes/cache/scratch';
  fs.mkdirSync(scratch, { recursive: true });
  const root = fs.mkdtempSync(path.join(scratch, 'english-nav-'));
  const url = '/reader-plain/test-book/1/1/';
  const dir = path.join(root, 'reader-plain/test-book/1/1');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ segments: [{ he: 'מקור', en: 'A complete English sentence.' }] }));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><p>A complete English sentence.</p>');
  fs.writeFileSync(path.join(root, 'reader-plain/test-book/index.html'), '<!doctype html><h1>Test Book</h1>');
  const row = { bookId: 'test-book', url, title: 'Section One' };
  const catalog = { total: 1, entries: [row] };
  const master = { books: [{ id: 'test-book', title: 'Test Book', hebrewTitle: 'ספר' }] };
  try { return run({ root, dir, row, catalog, master }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('real exported English produces explicit existing book/section links', () => fixture(({ root, catalog, master }) => {
  const result = englishBookNavigation(root, catalog, master);
  assert.deepEqual(result, [{ id: 'test-book', title: 'Test Book', hebrewTitle: 'ספר', directoryUrl: '/reader-plain/test-book/', firstEnglishUrl: '/reader-plain/test-book/1/1/', firstEnglishTitle: 'Section One', englishSections: 1 }]);
}));
test('duplicate catalog URLs count one physical section', () => fixture(({ root, row, master }) => {
  const result = englishBookNavigation(root, { total: 2, entries: [row, { ...row }] }, master);
  assert.equal(result[0].englishSections, 1);
}));
test('Hebrew-only and empty English do not claim English availability', () => fixture(({ root, dir, catalog, master }) => {
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ segments: [{ he: 'מקור', en: '<b> </b>' }, { he: 'מקור', en: null }] }));
  assert.deepEqual(englishBookNavigation(root, catalog, master), []);
}));
test('catalog totals are reconciled, not trusted as a coverage claim', () => fixture(({ root, catalog, master }) => {
  assert.throws(() => englishBookNavigation(root, { ...catalog, total: 2 }, master), /complete generated plain catalog/);
  assert.equal(englishBookNavigation(root, catalog, master).length, 1);
}));
test('cross-book label substitution is rejected', () => fixture(({ root, catalog, row, master }) => {
  assert.throws(() => englishBookNavigation(root, { total: 1, entries: [{ ...row, bookId: 'other-book' }] }, master), /identity mismatch/);
  assert.equal(englishBookNavigation(root, catalog, master).length, 1);
}));
test('foreign, query and fragment URL forms are rejected', () => fixture(({ root, row, catalog, master }) => {
  for (const url of ['https://foreign.example/reader-plain/test-book/1/1/', row.url + '?x=1', row.url + '#fragment']) {
    assert.throws(() => englishBookNavigation(root, { total: 1, entries: [{ ...row, url }] }, master));
  }
  assert.equal(englishBookNavigation(root, catalog, master).length, 1);
}));
test('literal and encoded traversal/separators are rejected before URL normalization', () => fixture(({ root, row, catalog, master }) => {
  for (const url of ['/reader-plain/test-book/1/../1/1/', '/reader-plain/test-book/1/%2e%2e/1/1/', '/reader-plain/test-book/1%2F1/', '/reader-plain/test-book/1/%ZZ/']) {
    assert.throws(() => englishBookNavigation(root, { total: 1, entries: [{ ...row, url }] }, master));
  }
  assert.equal(englishBookNavigation(root, catalog, master).length, 1);
}));
test('missing substantive section HTML aborts instead of adding a broken link', () => fixture(({ root, dir, catalog, master }) => {
  fs.unlinkSync(path.join(dir, 'index.html'));
  assert.throws(() => englishBookNavigation(root, catalog, master), /ENOENT/);
}));
test('symlink JSON is not admitted as a generated plain artifact', () => fixture(({ root, dir, catalog, master }) => {
  const original = path.join(dir, 'index.json');
  const body = fs.readFileSync(original);
  const outside = path.join(root, 'outside.json');
  fs.writeFileSync(outside, body); fs.unlinkSync(original); fs.symlinkSync(outside, original);
  assert.throws(() => englishBookNavigation(root, catalog, master), /symlink/);
  fs.unlinkSync(original); fs.writeFileSync(original, body);
  assert.equal(englishBookNavigation(root, catalog, master).length, 1);
}));
test('malformed generated JSON is not silently omitted', () => fixture(({ root, dir, catalog, master }) => {
  fs.writeFileSync(path.join(dir, 'index.json'), '{broken');
  assert.throws(() => englishBookNavigation(root, catalog, master), SyntaxError);
}));


test('entity spellings do not masquerade as English; ordinary and mixed literal text remain eligible', () => fixture(({root,dir,catalog,master}) => {
  for (const en of ['&nbsp;', '&#160;', '&#x20;', '&#x05D0;', '&#x41;', '&#72;&#101;&#108;&#108;&#111;', '<b> </b>', '&copy;']) {
    fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({segments:[{en}]}));
    assert.deepEqual(englishBookNavigation(root,catalog,master),[],en);
  }
  for (const en of ['Ordinary English.', '&#x05D0; and English', 'עברית and English', 'English &amp; Hebrew']) {
    fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({segments:[{en:null},{en}]}));
    assert.equal(englishBookNavigation(root,catalog,master)[0].englishSections,1,en);
  }
}));
test('differently encoded aliases count the same validated artifact once', () => fixture(({root,row,master}) => {
  const alias={...row,url:'/reader-plain/test-book/1/%31/'};
  const result=englishBookNavigation(root,{total:2,entries:[row,alias]},master);
  assert.equal(result[0].englishSections,1);
  assert.equal(result[0].firstEnglishUrl,row.url);
}));
test('doubled separators and bare query/fragment forms are rejected without normalizing them', () => fixture(({root,row,catalog,master}) => {
  for (const url of ['/reader-plain/test-book/1//1/',row.url+'?',row.url+'#']) {
    assert.throws(()=>englishBookNavigation(root,{total:1,entries:[{...row,url}]},master));
  }
  assert.equal(englishBookNavigation(root,catalog,master).length,1);
}));
function addWork(root,id,section='1',title='Current exported section') {
  const dir=path.join(root,'reader-plain',id,'1',section);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({title,segments:[{en:'Published English fixture.'}]}));
  fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><p>Published English fixture.</p>');
  fs.writeFileSync(path.join(root,'reader-plain',id,'index.html'),'<!doctype html><h1>Existing collection</h1>');
  return {bookId:id,url:`/reader-plain/${id}/1/${section}/`,title:'Stale catalog title'};
}
test('six source-bound display overlays retain their separate IDs and exact destinations', () => fixture(({root}) => {
  const ids=['bereishit','chayey','parsha-lm','shimshon-עצות-המבוארות','shivchey','sichos'];
  const entries=ids.map(id=>addWork(root,id));
  const result=englishBookNavigation(root,{total:entries.length,entries},{books:[]});
  assert.deepEqual(result.map(r=>r.id).sort(),ids.sort());
  for(const row of result) {
    assert.notEqual(row.title,row.id);
    assert.equal(row.firstEnglishUrl,entries.find(e=>e.bookId===row.id).url);
  }
  assert.match(result.find(r=>r.id==='chayey').title,/Likutay Nanach.*commentary/);
}));
test('commentary and primary Chayay owners never merge by their subject label', () => fixture(({root}) => {
  const entries=['chayey','chayey-moharan'].map(id=>addWork(root,id));
  const master={books:[{id:'chayey-moharan',title:'Chayey Moharan'}]};
  const result=englishBookNavigation(root,{total:2,entries},master);
  assert.equal(result.length,2);
  assert.equal(result.find(r=>r.id==='chayey-moharan').title,'Chayay Moharan');
  assert.match(result.find(r=>r.id==='chayey').title,/commentary/);
  assert.notEqual(result[0].directoryUrl,result[1].directoryUrl);
}));
test('unknown missing work labels stop instead of publishing another internal-ID heading', () => fixture(({root,catalog,master}) => {
  assert.throws(()=>englishBookNavigation(root,catalog,{books:[]}),/source-bound work label/);
  assert.equal(englishBookNavigation(root,catalog,master).length,1);
}));
test('section labels come from the actual generated artifact rather than a stale duplicate catalog row', () => fixture(({root,dir,catalog,master}) => {
  fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify({title:'Actual current exported title',segments:[{en:'English.'}]}));
  assert.equal(englishBookNavigation(root,catalog,master)[0].firstEnglishTitle,'Actual current exported title');
}));

test('generic identifier fallback is a readable section number without altering its raw title', () => fixture(({root,dir,catalog,row,master}) => {
  row.part='1';row.torah='1';
  const data={title:'test-book 1/1',segments:[{en:'English.'}]};
  fs.writeFileSync(path.join(dir,'index.json'),JSON.stringify(data));
  assert.equal(englishBookNavigation(root,catalog,master)[0].firstEnglishTitle,'Section 1/1');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8')),data);
}));
test('combined commentary uses a readable section description, not its raw internal subject token', () => fixture(({root}) => {
  const row={...addWork(root,'chayey','combined','Likutay Nanach on chayey'),part:'1',torah:'combined'};
  assert.equal(englishBookNavigation(root,{total:1,entries:[row]},{books:[]})[0].firstEnglishTitle,'Collected commentary');
}));
