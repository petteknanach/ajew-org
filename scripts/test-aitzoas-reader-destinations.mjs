// Bounded actual-template SSR: real Astro compiler, container, dependencies and JSON.
// No full-site build, dependency install, mock Layout or renderer reimplementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const require = createRequire(import.meta.url);
const { transform } = require('@astrojs/compiler');
const { build } = require('esbuild');
const { experimental_AstroContainer } = await import('astro/container');
const { createComponent } = await import('astro/runtime/server/index.js');
// Container 5.x omits config.site from its internal manifest. Supply the real site
// as rendering context, not by editing Layout or inventing application output.
function withSite(component) {
  return createComponent((result, props, slots) => {
    const original = result.createAstro;
    result.createAstro = (...args) => {
      const context = original(...args);
      context.site = new URL('https://ajew.org');
      return context;
    };
    return component(result, props, slots);
  });
}
const repo = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = path.resolve(process.env.AITZOAS_READER_SOURCE_ROOT || repo);
const evidence = process.env.AITZOAS_READER_EVIDENCE_DIR;
const output = evidence || fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'aitzoas-ssr-'));
fs.mkdirSync(output, { recursive: true });
const bookPath = 'public/reader/aitzoas-yeshuroas';
const pagePath = 'src/pages/reader/aitzoas-yeshuroas/[part]/[torah].astro';
const directoryPath = 'src/pages/reader/aitzoas-yeshuroas/[part]/index.astro';
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const data = (p) => JSON.parse(read(p));
const sha = (s) => createHash('sha256').update(s).digest('hex');
const index = data(`${bookPath}/index.json`);
const sections = index.torahs.map((entry) => data(`${bookPath}/section-${entry.torah}.json`));
const diagnostics = [];
const inputs = new Map();
const missingNativeWitnesses = [];
const witnessPaths = [fileURLToPath(import.meta.url), path.join(root, `${bookPath}/index.json`), ...index.torahs.map((e) => path.join(root, `${bookPath}/section-${e.torah}.json`))];
for (const p of ['reader-script.js','reader-v2.js','unified-audio.js','reader-notes.js'].map((p) => path.join(repo, 'public', p))) {
  if (fs.existsSync(p)) witnessPaths.push(p); else missingNativeWitnesses.push(p);
}
for (const n of index.torahs.map((e) => e.torah)) {
  const p = path.join(root, `public/reader/biur-halikutim/section-${n}.json`);
  if (fs.existsSync(p)) witnessPaths.push(p); // Actual original wrong-book producer inputs in RED.
}
for (const p of witnessPaths) {
  const raw = fs.readFileSync(p);
  inputs.set(p, { path: p, bytes: raw.length, sha256: sha(raw), role: 'test-data-or-native-contract-witness' });
}
fs.writeFileSync(path.join(output, 'executed-test-source.mjs'), fs.readFileSync(fileURLToPath(import.meta.url)));
async function compile(relative, name) {
  const result = await build({
    entryPoints: [path.join(root, relative)], bundle: true, write: false,
    format: 'esm', platform: 'node', target: 'node18', logLevel: 'silent',
    plugins: [{ name: 'bounded-actual-astro', setup(b) {
      b.onResolve({ filter: /^astro\// }, (a) => ({ path: require.resolve(a.path), external: true }));
      b.onResolve({ filter: /\.astro\?astro&type=style/ }, (a) => ({ path: a.path, namespace: 'server-style' }));
      b.onLoad({ filter: /.*/, namespace: 'server-style' }, () => ({ contents: '', loader: 'js' }));
      b.onResolve({ filter: /\.(astro|css)$/ }, (a) => {
        let p = path.resolve(a.resolveDir || root, a.path);
        // A baseline contains scoped original pages; unchanged dependencies come from this repo.
        if (!fs.existsSync(p) && p.startsWith(root + path.sep)) p = path.join(repo, path.relative(root, p));
        return { path: p };
      });
      b.onLoad({ filter: /\.astro$/ }, async (a) => {
        const source = fs.readFileSync(a.path, 'utf8');
        inputs.set(a.path, { path: a.path, bytes: Buffer.byteLength(source), sha256: sha(source) });
        const compiled = await transform(source, {
          filename: a.path, internalURL: 'astro/compiler-runtime',
          astroGlobalArgs: JSON.stringify('https://ajew.org'),
          // Match Astro's server compiler ABI; no hydration/client bundling in this SSR gate.
          resultScopedSlot: true,
        });
        diagnostics.push({ path: a.path, diagnostics: compiled.diagnostics, cssCount: compiled.css.length });
        assert.equal(compiled.diagnostics.filter((d) => d.severity === 1).length, 0, `compiler: ${a.path}`);
        const tag = path.basename(a.path).replace(/[^a-z0-9]/gi, '-');
        fs.writeFileSync(path.join(output, `${name}-${tag}.compiled.js`), compiled.code);
        compiled.css.forEach((css, i) => fs.writeFileSync(path.join(output, `${name}-${tag}-${i}.css`), css));
        // Installed compiler 2.x emits metadata that Astro 5.x no longer exports.
        // Preserve raw compiler output above. Elide ONLY unused non-hydrated bookkeeping.
        let serverCode = compiled.code;
        const elisions = [];
        if (serverCode.includes('createMetadata as $$createMetadata')) {
          assert.equal((serverCode.match(/\$\$metadata/g) || []).length, 1, 'metadata must be unconsumed');
          assert.ok(/hydratedComponents: \[\], clientOnlyComponents: \[\]/.test(serverCode), 'non-hydrated only');
          serverCode = serverCode.replace(/  createMetadata as \$\$createMetadata\n/, '');
          serverCode = serverCode.replace(/^export const \$\$metadata = [\s\S]*?(?=\nconst \$\$Astro =)/m, (line) => { elisions.push(line); return ''; });
          serverCode = serverCode.replace(/^import \* as (\$\$module\d+) from .*;\n/gm, (line, binding) => {
            assert.equal((serverCode.match(/\$\$module\d+\b/g) || []).filter((v) => v === binding).length, 1, `${a.path}: ${binding} must be unconsumed`);
            elisions.push(line); return '';
          });
          assert.equal(serverCode.includes('$$createMetadata'), false);
        }
        diagnostics[diagnostics.length - 1].metadataElisions = elisions;
        return { contents: serverCode, loader: 'ts', resolveDir: path.dirname(a.path) };
      });
      // CSS imports are authenticated and retained, not executed by a server JS loader.
      b.onLoad({ filter: /\.css$/ }, (a) => {
        const raw = fs.readFileSync(a.path);
        inputs.set(a.path, { path: a.path, bytes: raw.length, sha256: sha(raw), serverCssImport: true });
        return { contents: '', loader: 'js' };
      });
    } }],
  });
  const out = path.join(output, `${name}.bundle.mjs`);
  fs.writeFileSync(out, result.outputFiles[0].contents);
  return import(pathToFileURL(out).href);
}
let page, directory, container;
const rendered = new Map();
const renderErrors = [];
try {
  page = await compile(pagePath, 'section');
  directory = await compile(directoryPath, 'directory');
  container = await experimental_AstroContainer.create();
} finally {
  fs.writeFileSync(path.join(output, 'compiler.json'), JSON.stringify({ diagnostics, inputs: [...inputs.values()] }, null, 2));
}
async function renderSection(n) {
  if (!rendered.has(n)) {
    const cwd = process.cwd();
    try {
      process.chdir(root);
      const html = await container.renderToString(withSite(page.default), {
        params: { part: '1', torah: String(n) },
        request: new Request(`https://ajew.org/reader/aitzoas-yeshuroas/1/${n}`),
      });
      fs.writeFileSync(path.join(output, `section-${n}.html`), html);
      rendered.set(n, html);
    } catch (e) {
      renderErrors.push({ section: n, error: String(e), stack: e.stack });
      throw e;
    } finally { process.chdir(cwd); }
  }
  return rendered.get(n);
}
const { parse } = require('parse5');
function nodes(html) {
  const found = [];
  function walk(n, parent) { n.parent = parent; found.push(n); for (const c of n.childNodes || []) walk(c, n); }
  walk(parse(html), null); return found;
}
const attr = (n, k) => n.attrs?.find((a) => a.name === k)?.value;
const hasClass = (n, c) => (attr(n, 'class') || '').split(/\s+/).includes(c);
const text = (n) => n.nodeName === '#text' ? n.value : (n.childNodes || []).map(text).join('');
const descendants = (n) => [n, ...(n.childNodes || []).flatMap(descendants)];
const originalPairs = (ns) => ns.filter((n) => hasClass(n, 'reader-content-original')).flatMap((n) => descendants(n).filter((p) => hasClass(p, 'reader-segment-pair')));
const expectedRoutes = index.torahs.map((e) => ({ params: { part: '1', torah: String(e.torah) } }));
test('actual getStaticPaths enumerates exactly the six own-index destinations (not 82)', async () => {
  const cwd = process.cwd();
  try { process.chdir(root); assert.deepEqual(await page.getStaticPaths(), expectedRoutes); }
  finally { process.chdir(cwd); }
  assert.equal(expectedRoutes.length, 6);
});
test('actual directory SSR links every own section without undefined destinations', async () => {
  const cwd = process.cwd(); let html;
  try { process.chdir(root); html = await container.renderToString(withSite(directory.default), { params: { part: '1' }, request: new Request('https://ajew.org/reader/aitzoas-yeshuroas/1/') }); }
  finally { process.chdir(cwd); }
  fs.writeFileSync(path.join(output, 'directory.html'), html);
  const cards = nodes(html).filter((n) => hasClass(n, 'rd-card'));
  assert.deepEqual(cards.map((n) => attr(n, 'href')), index.torahs.map((e) => `/reader/aitzoas-yeshuroas/1/${e.torah}`));
  assert.equal(html.includes('undefined'), false);
});
for (const [pos, section] of sections.entries()) {
  test(`actual section ${section.torah} SSR: own identity, metadata, exact source, stable anchors, navigation, warning and controls`, async () => {
    const html = await renderSection(section.torah); const ns = nodes(html);
    const reader = ns.find((n) => hasClass(n, 'reader-container'));
    assert.ok(reader, 'actual own content must load');
    assert.equal(attr(reader, 'data-torah-id'), `aitzoas-yeshuroas-1-${section.torah}`);
    assert.equal(html.includes('Biur HaLikutim') || html.includes('/reader/biur-halikutim/'), false);
    assert.equal(html.includes('seg-undefined') || html.includes('data-index="undefined"'), false);
    const article = ns.filter((n) => n.tagName === 'script' && attr(n, 'type') === 'application/ld+json').map((n) => JSON.parse(text(n))).find((j) => j['@type'] === 'Article');
    assert.equal(article.isPartOf.name, 'Aitzoas Yesharoas');
    assert.equal(article.author.name, index.author);
    assert.equal(article.url, `https://ajew.org/reader/aitzoas-yeshuroas/1/${section.torah}`);
    const desc = ns.find((n) => n.tagName === 'meta' && attr(n, 'name') === 'description');
    assert.match(attr(desc, 'content'), /known mismatches.*not approved/i);
    const pairs = originalPairs(ns);
    assert.equal(pairs.length, section.segments.length);
    const ids = pairs.map((n) => attr(n, 'id'));
    assert.equal(new Set(ids).size, ids.length);
    for (const [i, seg] of section.segments.entries()) {
      assert.ok(Number.isSafeInteger(seg.index) && seg.index > 0, 'persisted explicit engineering index required');
      assert.equal(ids[i], `seg-${seg.index}`);
      const he = descendants(pairs[i]).find((n) => hasClass(n, 'segment-he'));
      const en = descendants(pairs[i]).find((n) => hasClass(n, 'segment-en'));
      const hep = descendants(he).find((n) => n.tagName === 'p');
      const enp = descendants(en).find((n) => n.tagName === 'p');
      assert.equal(text(hep), seg.he);
      assert.equal(attr(hep, 'data-nikud'), seg.he_nikud || seg.he);
      assert.equal(text(enp), seg.en || 'Translation not yet available');
      assert.equal(attr(he, 'data-index'), String(seg.index));
      assert.equal(attr(en, 'data-index'), String(seg.index));
      assert.equal(text(descendants(he).find((n) => hasClass(n, 'segment-number'))), String(seg.index));
      assert.equal(attr(descendants(he).find((n) => hasClass(n, 'segment-number')), 'title'), 'Reader paragraph anchor — not a printed teaching number');
    }
    const toc = ns.find((n) => hasClass(n, 'reader-toc-list'));
    assert.deepEqual(descendants(toc).filter((n) => n.tagName === 'a').map((n) => attr(n, 'href')), ids.map((id) => `#${id}`));
    for (const dir of ['prev', 'next']) {
      const links = ns.filter((n) => attr(n, 'data-dir') === dir);
      const target = index.torahs[pos + (dir === 'prev' ? -1 : 1)];
      assert.deepEqual(links.map((n) => attr(n, 'href')), target ? Array(2).fill(`/reader/aitzoas-yeshuroas/1/${target.torah}`) : []);
    }
    const warnings = ns.filter((n) => attr(n, 'id') === 'translation-review-warning');
    assert.equal(warnings.length, 1);
    assert.match(text(warnings[0]), /known to be mismatched.*not approved/s);
    assert.match(text(warnings[0]), /אינו תואם/);
    for (let n = warnings[0].parent; n; n = n.parent) assert.equal(hasClass(n, 'reader-content') || hasClass(n, 'reader-segment-pair'), false, 'warning stays outside canonical copy/MySefer');
    for (const id of ['audio-controls','audio-btn-he','audio-btn-en','en-tts-player','kol-hatzadik-audio','btn-nikud','font-size-slider','btn-align','btn-listen','btn-search','btn-bookmark','btn-notes','btn-fullscreen']) assert.ok(ns.some((n) => attr(n, 'id') === id), id);
    for (const mode of ['hebrew','english','both']) assert.ok(ns.some((n) => attr(n, 'data-mode') === mode));
    const audio = ns.find((n) => attr(n, 'id') === 'en-tts-player');
    assert.equal(attr(audio, 'data-book'), 'aitzoas-yeshuroas');
    assert.equal(attr(audio, 'data-torah'), String(section.torah));
    assert.ok(ns.some((n) => attr(n, 'src')?.startsWith('/reader-script.js?')));
    assert.equal(ns.some((n) => n.tagName === 'iframe' && attr(n, 'src')?.includes('youtube')), false);
  });
}
test('all persisted Original indices are book-wide unique; headings/printed numbers remain canonical text', () => {
  const ids = sections.flatMap((s) => s.segments.map((seg) => seg.index));
  assert.equal(ids.length, 366); assert.equal(new Set(ids).size, 366);
  assert.ok(ids.every((i) => Number.isSafeInteger(i) && i > 0));
});
test('two independently held Thoughts owners have exact persisted rendered anchors, not EN approval', async () => {
  const s = sections.find((s) => s.torah === 4); const ns = nodes(await renderSection(4));
  for (const i of [22,24]) {
    const seg = s.segments[i];
    assert.ok(Number.isSafeInteger(seg.index));
    const pair = originalPairs(ns).find((n) => attr(n, 'id') === `seg-${seg.index}`);
    assert.ok(pair);
    assert.equal(text(descendants(pair).find((n) => n.tagName === 'p')), seg.he);
  }
});
test('native audio/toolbar/script contract is conserved apart from own-book identity and explicit paragraph labels', () => {
  // Optional complete baseline preimage qualification; portable tests need no private path.
  if (!process.env.AITZOAS_READER_BASELINE_ROOT) return;
  const before = fs.readFileSync(path.join(process.env.AITZOAS_READER_BASELINE_ROOT, pagePath), 'utf8');
  const after = read(pagePath);
  for (const [start,end] of [['<!-- Unified Audio Player -->','      <div class="reader-search-bar">'], ['      <div class="reader-shortcuts-overlay">','      {torahData && ('], ['      <script src="/reader-script.js?', '    </div>']]) {
    const extract = (s) => s.slice(s.indexOf(start), s.indexOf(end, s.indexOf(start)));
    assert.notEqual(before.indexOf(start), -1); assert.equal(extract(after), extract(before));
  }
});
test('persisted indices, not renderer ordinals, survive a metadata-only reorder and explicit index change; invalid anchors reject', async () => {
  const scratch = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'aitzoas-index-controls-'));
  const target = path.join(scratch, bookPath); fs.mkdirSync(target, { recursive: true });
  for (const entry of index.torahs) fs.copyFileSync(path.join(root, `${bookPath}/section-${entry.torah}.json`), path.join(target, `section-${entry.torah}.json`));
  fs.copyFileSync(path.join(root, `${bookPath}/index.json`), path.join(target, 'index.json'));
  const section = structuredClone(sections.find((s) => s.torah === 4));
  const cwd = process.cwd();
  const save = () => fs.writeFileSync(path.join(target, 'section-4.json'), JSON.stringify(section));
  const render = () => container.renderToString(withSite(page.default), { params: { part: '1', torah: '4' }, request: new Request('https://ajew.org/reader/aitzoas-yeshuroas/1/4') });
  try {
    section.segments.reverse();
    const owner = section.segments.find((s) => s.index === 152);
    assert.ok(owner, 'minted Thoughts Alef owner');
    const before = owner.he;
    owner.index = 10000; // Explicit synthetic metadata-only control, never an adopted source/anchor.
    save(); process.chdir(scratch);
    const pairs = originalPairs(nodes(await render()));
    assert.deepEqual(pairs.map((n) => attr(n, 'id')), section.segments.map((s) => `seg-${s.index}`));
    assert.equal(text(descendants(pairs.find((n) => attr(n, 'id') === 'seg-10000')).find((n) => n.tagName === 'p')), before);
    section.segments[0].index = section.segments[1].index; save();
    await assert.rejects(render, /Invalid persisted.*paragraph anchors/);
    delete section.segments[0].index; save();
    await assert.rejects(render, /Invalid persisted.*paragraph anchors/);
  } finally { process.chdir(cwd); fs.rmSync(scratch, { recursive: true, force: true }); }
});
test('actual producer rejects fictitious sections and foreign part without loading another book', async () => {
  const cwd = process.cwd();
  try {
    process.chdir(root);
    for (const params of [{ part: '1', torah: '7' }, { part: '1', torah: '82' }, { part: '2', torah: '1' }]) {
      const html = await container.renderToString(withSite(page.default), { params, request: new Request(`https://ajew.org/reader/aitzoas-yeshuroas/${params.part}/${params.torah}`) });
      assert.ok(nodes(html).some((n) => n.tagName === 'h1' && text(n).includes('Section not found')));
      assert.equal(nodes(html).some((n) => hasClass(n, 'reader-container')), false);
    }
  } finally { process.chdir(cwd); }
});
test('exhaustive original-object, field-order and byte-inverse conservation (when baseline supplied)', () => {
  if (!process.env.AITZOAS_READER_BASELINE_ROOT) return;
  for (const entry of index.torahs) {
    const rel = `${bookPath}/section-${entry.torah}.json`;
    const oldRaw = fs.readFileSync(path.join(process.env.AITZOAS_READER_BASELINE_ROOT, rel), 'utf8');
    const old = JSON.parse(oldRaw); const current = data(rel);
    const conserved = structuredClone(current);
    for (const seg of conserved.segments) delete seg.index;
    assert.deepEqual(conserved, old, `all original fields/objects/array order: ${rel}`);
    assert.deepEqual(conserved.segments.map(Object.keys), old.segments.map(Object.keys), `all original key order: ${rel}`);
    // Minting inserted metadata before each existing he field; inverse restores original UTF-8 exactly.
    const inverse = read(rel).replace(/(?:^[ \t]+)?"index":\d+,\n?/gm, '');
    assert.equal(inverse, oldRaw, `every original character, escape and whitespace: ${rel}`);
  }
  const oldIndex = JSON.parse(fs.readFileSync(path.join(process.env.AITZOAS_READER_BASELINE_ROOT, `${bookPath}/index.json`), 'utf8'));
  for (const [key,value] of Object.entries(oldIndex)) assert.deepEqual(index[key], value, `existing index field ${key}`);
});
process.on('exit', () => {
  fs.writeFileSync(path.join(output, 'ssr-summary.json'), JSON.stringify({
    assembly: 'qualified non-hydrated SSR derivative: actual Astro producers/templates and unchanged real Layout/Comments/ReaderDirectory; unused compiler metadata elided for installed ABI mismatch; CSS imports server-elided; real site supplied to container context; no hydration/browser/full-site build',
    sourceRoot: root, renderedSections: [...rendered.keys()], renderErrors,
    heapLimitMiB: Math.round((require('node:v8').getHeapStatistics().heap_size_limit) / 1024 / 1024),
    maxRssKiB: process.resourceUsage().maxRSS,
    runtime: { node: process.version, execPath: process.execPath, execArgv: process.execArgv,
      compiler: { entry: require.resolve('@astrojs/compiler'), version: require('@astrojs/compiler/package.json').version },
      astro: { entry: require.resolve('astro/runtime/server/index.js'), version: require('astro/package.json').version },
      nodeOptions: process.env.NODE_OPTIONS ?? null, nodePath: process.env.NODE_PATH ?? null },
    missingNativeWitnesses,
    consumedInputsConservedAfterRun: [...inputs.values()].every((row) => sha(fs.readFileSync(row.path)) === row.sha256),
    inputs: [...inputs.values()],
  }, null, 2));
  if (!evidence) fs.rmSync(output, { recursive: true, force: true });
});
