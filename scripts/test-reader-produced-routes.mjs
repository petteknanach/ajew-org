import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { transform } from '@astrojs/compiler';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => {
  const file = path.join(root, name);
  // Sparse private worktrees may omit the unchanged image manifests.
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8')
    : execFileSync('git', ['show', `HEAD:${name}`], { cwd: root, encoding: 'utf8' });
};
const json = name => JSON.parse(read(name));
const otzarOwner = 'src/pages/reader/otzar-hayirah/[part]/[torah].astro';
const directoryOwner = 'src/pages/reader/[book]/[part]/index.astro';
const mediaOwner = 'src/pages/reader/sefer-hamidos/[part]/[torah].astro';
const clone = value => JSON.parse(JSON.stringify(value));
function otzarPaths(overrides = {}) {
  const text = read(otzarOwner);
  const code = text.slice(text.indexOf('export function getStaticPaths()'), text.indexOf('\nconst { part, torah }')).replace('export ', '');
  const context = vm.createContext({ path, process: { cwd: () => root }, fs: {
    readFileSync(file, encoding) {
      const name = path.relative(root, file);
      if (Object.hasOwn(overrides, name)) {
        if (overrides[name] === null) throw new Error('negative missing-file case');
        return JSON.stringify(overrides[name]);
      }
      return fs.readFileSync(file, encoding);
    },
  } });
  return JSON.parse(vm.runInContext(code + ';JSON.stringify(getStaticPaths())', context));
}
const otzarRoot = 'public/reader/otzar-hayirah';
test('Otzar routes equal all indexed, physically existing identities, not stale counts', () => {
  const expected = json(`${otzarRoot}/index.json`).parts.flatMap(({part}) =>
    json(`${otzarRoot}/part-${part}/index.json`).torahs.map(({number}) => {
      const source = json(`${otzarRoot}/part-${part}/torah-${number}.json`);
      assert.equal(source.book, 'otzar-hayirah'); assert.equal(source.part, part);
      assert.equal(source.torah, number); assert.equal(source.id, `ohy-${part}-${number}`);
      return { params: { part: String(part), torah: String(number) } };
    }));
  assert.deepEqual(otzarPaths(), expected);
  assert.equal(new Set(expected.map(p => `${p.params.part}/${p.params.torah}`)).size, expected.length);
  for (const [part, torah] of [[2,21],[2,23],[3,29]])
    assert.ok(expected.some(p => p.params.part === String(part) && p.params.torah === String(torah)));
  assert.ok(!expected.some(p => p.params.part === '1' && p.params.torah === '111'));
});
test('Otzar rejects missing/wrong-work/wrong-part/wrong-number/missing-id sources and nonmembers', () => {
  const name = `${otzarRoot}/part-2/torah-21.json`, original = json(name);
  for (const replacement of [null, {...original, book:'other'}, {...original, part:3},
    {...original, torah:22}, {...original, id:undefined}, {...original, segments:[]}]) {
    assert.ok(!otzarPaths({[name]:replacement}).some(p => p.params.part==='2' && p.params.torah==='21'));
  }
  const indexName = `${otzarRoot}/part-2/index.json`, index = json(indexName);
  assert.ok(!otzarPaths({[indexName]:{...index, torahs:index.torahs.filter(t=>t.number!==21)}})
    .some(p=>p.params.part==='2' && p.params.torah==='21'));
  assert.ok(!otzarPaths({[indexName]:{...index, part:3}}).some(p=>p.params.part==='2'));
  const duplicate = clone(index); duplicate.torahs.push(duplicate.torahs[0]);
  assert.deepEqual(otzarPaths({[indexName]:duplicate}), otzarPaths());
});

const haggadah = json('public/reader/haggadah-shel-pesach/index.json');
const haggadahTargets = new Map([[3,'karpas'],[5,'maggid'],[6,'rachtzah'],[7,'motzi-matzah'],[9,'korech'],[12,'barech']]);
function directoryItems({book = {id:'haggadah-shel-pesach'}, partNum='1', indexData=haggadah} = {}) {
  const text = read(directoryOwner);
  const code = text.slice(text.indexOf('const haggadahSections ='), text.indexOf('\nconst title ='));
  const ctx = vm.createContext({ book, partNum, indexData, rawItems:indexData.sections });
  return JSON.parse(vm.runInContext(code+';JSON.stringify(items)',ctx));
}
test('six Haggadah directory links use the same-work named-section owner; others unchanged', () => {
  const items = directoryItems(); assert.equal(items.length, haggadah.sections.length);
  for (const item of items) {
    const id = haggadahTargets.get(item.number);
    assert.equal(item.url, id ? `/haggadah/#section-${id}` : `/reader/haggadah-shel-pesach/1/${item.number}`);
    for (const [key,value] of Object.entries(haggadah.sections.find(s=>s.number===item.number))) assert.deepEqual(item[key],value);
    if (id) {
      const source = json(`public/reader/haggadah-shel-pesach/part-1/section-${item.number}.json`);
      assert.equal(source.sectionId,id); assert.equal(source.book,'haggadah-shel-pesach');
      assert.equal(source.part,1); assert.equal(source.torah,item.number);
    }
  }
});
test('Haggadah repair rejects other work/part and absent or wrong section identity', () => {
  for (const options of [{book:{id:'other'}},{partNum:'2'},{indexData:{...haggadah,book:'other'}},
    {indexData:{...haggadah,sections:haggadah.sections.map(s=>({...s,id:undefined}))}},
    {indexData:{...haggadah,sections:haggadah.sections.map(s=>({...s,number:undefined}))}},
    {indexData:{...haggadah,sections:haggadah.sections.map(s=>({...s,id:'wrong'}))}}])
    assert.ok(directoryItems(options).every(i=>!i.url.startsWith('/haggadah/')));
});

const collections = new Map([['sefer-hamidos-honor',48],['sefer-hamidos-success',26],['sefer-hamidos-novelties-of-torah-part-ii',40]]);
const fallbacks = new Set([
  'sh-honor-024-chatgpt-a-en','sh-honor-024-chatgpt-b-en',
  'sh-success-003-chatgpt-a-en','sh-success-003-chatgpt-b-en',
  'sh-success-004-chatgpt-a-en','sh-success-004-chatgpt-b-en',
  'sh-novelties-of-torah-part-ii-009-chatgpt-a-en','sh-novelties-of-torah-part-ii-009-chatgpt-b-en',
]);
function mediaApi(mediaCollection, torahNum, partNum=1) {
  const text=read(mediaOwner), code=text.slice(text.indexOf('function mediaSlug('),text.indexOf('function mediaDirectUrl('));
  const ctx=vm.createContext({path,mediaCollection,torahNum,partNum,Astro:{site:'https://ajew.org'},URL});
  return vm.runInContext(code+';({mediaSlug,mediaShareUrl})',ctx);
}
test('all genuine images in three manifests: only eight exact outputs recover to Reader anchors', () => {
  const seen=new Set(); let unchanged=0;
  for (const [collection,topic] of collections) {
    const api=mediaApi(collection,topic);
    for (const entry of json(`public/images/${collection}/manifest.json`).entries) for (const image of entry.images||[]) {
      const slug=api.mediaSlug(image), result=api.mediaShareUrl(image);
      if (fallbacks.has(slug)) {
        seen.add(slug); assert.equal(result,`https://ajew.org/reader/sefer-hamidos/1/${topic}/#media-${slug}`);
        for (const negative of [mediaApi(collection,topic,2),mediaApi(collection,999),mediaApi('other',topic)])
          assert.ok(negative.mediaShareUrl(image).includes('/share/'));
      } else {
        unchanged++; assert.equal(result,`https://ajew.org/share/${collection}/${slug}/?v=${slug}`);
      }
    }
  }
  assert.deepEqual([...seen].sort(),[...fallbacks].sort()); assert.ok(unchanged>0);
  assert.equal(mediaApi('sefer-hamidos-success',26).mediaShareUrl({}), 'https://ajew.org/share/sefer-hamidos-success//?v=');
});
test('/sources/ conserves original prose and is self-contained, not an unrelated bundle alias', () => {
  const html=read('public/sources/index.html');
  const original=execFileSync('git',['show','ca4846154da06516594c16941b5e29819f84933f:public/sources/index.html'],{cwd:root,encoding:'utf8'});
  for (const tag of ['title','h1','p']) for (const match of original.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`,'g'))) assert.ok(html.includes(match[0]),match[0]);
  assert.ok(!html.includes('_astro/')); assert.ok(!html.includes('<script')); assert.ok(html.includes('<style>'));
  for (const href of ['/reader/likutay-moharan/','/reader/rimzei-hamaasiyos/1/','/books/likutay-nanach/4/']) assert.ok(html.includes(`href="${href}"`));
});
test('complete changed Astro producer templates compile without compiler errors', async () => {
  for (const name of [otzarOwner,directoryOwner,mediaOwner]) {
    const result=await transform(read(name),{filename:name});
    assert.deepEqual(result.diagnostics.filter(d=>d.severity===1),[],name);
  }
});
