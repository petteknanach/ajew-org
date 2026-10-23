// Isolated real Layout compiler/runtime test. Navigation/Yahrzeit/CSS are inert
// import fixtures; this is not a canonical build or full-site rendering proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createReaderPlainAvailability, readerPlainAlternates } from '../src/lib/reader-plain-availability.mjs';

const requireDeps = createRequire(process.env.READER_PLAIN_TEST_DEPS || new URL('../package.json', import.meta.url));
const compiler = requireDeps('@astrojs/compiler');
const ts = requireDeps('typescript');
const runtime = requireDeps('astro/runtime/server/index.js');
const { experimental_AstroContainer: Container } = requireDeps('astro/container');
const { load } = requireDeps('cheerio');
const layoutSource = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
const origin = 'https://ajew.org';
const normal = '/reader/likutay-moharan/1/1';
const volume = '/reader/likutay-nanach/4/16';
const locked = '/reader/chayey-moharan/1/hashmata-162';
const missing = ['/reader/saba-tape-transcripts/1/23-b', '/reader/saba-tape-transcripts/1/9-b'];
let transformed;
try {
  transformed = await compiler.transform(layoutSource, { filename: 'src/layouts/Layout.astro', internalURL: 'astro/runtime/server/index.js', astroGlobalArgs: JSON.stringify(origin), resultScopedSlot: true });
} finally { compiler.teardown(); }
assert.equal(transformed.diagnostics.filter(d => d.severity === 1).length, 0);
const js = ts.transpileModule(transformed.code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const inertComponent = runtime.createComponent(() => runtime.render``);
function compileLayout(get) {
  const mod = { exports: {} };
  const imports = specifier => {
    if (specifier === 'astro/runtime/server/index.js') {
      // Installed compiler 2.13 emits legacy metadata; Astro 5.18 has removed
      // its constructor. This inert metadata-only adapter does not render links.
      return { ...runtime, createMetadata: (_name, metadata) => metadata };
    }
    if (specifier === '../components/Navigation.astro' || specifier === '../components/CompactYahrzeit.astro') return { default: inertComponent, __esModule: true };
    if (specifier === '../lib/reader-plain-availability.mjs') return { getReaderPlainAvailability: get, readerPlainAlternates };
    if (specifier.endsWith('.css')) return {};
    throw new Error('Unexpected Layout import: ' + specifier);
  };
  new Function('require', 'module', 'exports', js)(imports, mod, mod.exports);
  const Layout = mod.exports.default;
  // Container has no site option; supply only the declared production site in
  // a per-render context adapter. Do not modify the actual template or globals.
  return runtime.createComponent((result, props, slots) => {
    const context = Object.create(result);
    context.createAstro = (...args) => {
      const astro = result.createAstro(...args);
      Object.defineProperty(astro, 'site', { value: new URL(origin) });
      return astro;
    };
    return Layout(context, props, slots);
  });
}

test('genuine Layout SSR template: catalog destinations, unavailable AI/head omission, unchanged slot holds and YouTube', { timeout: 15000 }, async t => {
  const root = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'plain-layout-ssr-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = (path, bytes = 'Synthetic export fixture\n') => {
    const full = join(root, path); mkdirSync(join(full, '..'), { recursive: true }); writeFileSync(full, bytes);
  };
  const entries = [
    { sourceUrl: normal, url: '/reader-plain/likutay-moharan/1/1/' },
    { sourceUrl: volume, url: '/reader-plain/likutay-nanach/volume-4/16/' },
  ];
  file('reader-plain/index.json', JSON.stringify({ total: entries.length, entries }));
  for (const row of entries) for (const ext of ['html', 'txt', 'md', 'json']) file(row.url.slice(1) + 'index.' + ext);
  for (const book of ['likutay-moharan', 'likutay-nanach']) for (const name of ['index.html', 'full.txt', 'full.md']) file('reader-plain/' + book + '/' + name);
  // Individually absent full Markdown must not suppress a genuine section/TXT.
  rmSync(join(root, 'reader-plain/likutay-nanach/full.md'));
  const get = createReaderPlainAvailability({ publicDir: root });
  const Layout = compileLayout(get);
  const container = await Container.create();
  const slot = '<p id="exact-source">אין שינוי — EXACT SOURCE</p><p id="true-status">Source unavailable</p><button id="hold" disabled>Locked</button><script src="/reader-v2.js?v=UNCHANGED" defer></script>';
  for (const path of [normal, volume, locked, ...missing, '/reader/chayey-moharan/siman/14', '/reader/sichos-haran/reviewed/271-280/']) {
    const html = await container.renderToString(Layout, { request: new Request(origin + path), props: { title: 'Attribute " <test> & source' }, slots: { default: slot } });
    const $ = load(html);
    const access = get(path), available = access?.state === 'available';
    assert.equal($('meta[name="ajew-reader-plain-access"]').length, access ? 1 : 0, path);
    if (access) assert.equal($('meta[name="ajew-reader-plain-access"]').attr('data-state'), access.state, path);
    const alternates = $('head link[rel="alternate"]').filter((_i, el) => ($(el).attr('href') || '').includes('/reader-plain/'));
    assert.equal(alternates.length, readerPlainAlternates(access).length, path);
    assert.deepEqual(alternates.map((_i, el) => $(el).attr('href')).get(), readerPlainAlternates(access).map(([, , href]) => href), path);
    assert.equal($('.ai-reader-access').length, available ? 1 : 0, path);
    if (available) {
      assert.equal($('.ai-reader-access a').first().attr('href'), access.section.html);
      assert.equal($('meta[name="ajew-reader-plain-access"]').attr('data-section'), access.section.html);
    }
    assert.equal($('#exact-source').text(), 'אין שינוי — EXACT SOURCE');
    assert.equal($('#true-status').text(), 'Source unavailable'); assert.equal($('#hold').attr('disabled'), 'disabled');
    assert.ok(html.includes(slot), 'slot template/core/body/hold exact byte conservation');
    assert.equal($('script[src="/reader-v2.js?v=UNCHANGED"]').length, 1);
    const script = $('script[src="/reader-plain-access.js?v=20261023-1"]');
    assert.equal(script.length, access ? 1 : 0); if (access) { assert.ok(script.is('[defer]')); assert.equal(script.attr('type'), undefined); }
    assert.equal($('script[src^="/reader-youtube-links.js"]').length, path.includes('/reviewed/') ? 0 : 1, 'YouTube remains independent');
    assert.equal($('title').text(), 'Attribute " <test> & source | ajew.org', 'HTML attributes/text are escaped by actual runtime');
    assert.equal($('test').length, 0);
  }
});

test('optional noindexFollow emits noindex/follow only when selected; legacy noindex defaults remain exact', async () => {
  const Layout = compileLayout(createReaderPlainAvailability());
  const container = await Container.create();
  for (const [flags, expected] of [
    [{}, 'index, follow'],
    [{ noindex: true }, 'noindex, nofollow'],
    [{ noindexFollow: false, noindex: true }, 'noindex, nofollow'],
    [{ noindexFollow: true }, 'noindex, follow'],
    [{ noindexFollow: true, noindex: true }, 'noindex, follow'],
  ]) {
    const html = await container.renderToString(Layout, { request: new Request(origin + '/about'), props: { title: 'Robots fixture', ...flags } });
    const $ = load(html);
    assert.equal($('meta[name="robots"]').attr('content'), expected);
    assert.equal($('meta[name="googlebot"]').attr('content'), expected);
  }
});

// The missing generated catalog remains a hard SSR prerequisite failure.
test('real Layout numeric SSR propagates catalog prerequisite error instead of advertising guessed paths', async t => {
  const root = mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'plain-layout-missing-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const Layout = compileLayout(createReaderPlainAvailability({ publicDir: root }));
  const container = await Container.create();
  await assert.rejects(() => container.renderToString(Layout, { request: new Request(origin + normal), props: { title: 'No catalog fixture' } }), /Plain reader prerequisite/);
});
