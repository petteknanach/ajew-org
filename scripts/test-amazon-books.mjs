import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { amazonBooks, booksForReaderPath, amazonBookUrl } from '../src/lib/amazon-books.mjs';
import * as bookLibrary from '../src/lib/amazon-books.mjs';
import { createRequire } from 'node:module';

const requireDeps = createRequire(process.env.READER_PLAIN_TEST_DEPS || new URL('../package.json', import.meta.url));
const compiler = requireDeps('@astrojs/compiler');
const ts = requireDeps('typescript');
const runtime = requireDeps('astro/runtime/server/index.js');
const { experimental_AstroContainer: Container } = requireDeps('astro/container');
const { load } = requireDeps('cheerio');
let compiled;
try {
  compiled = await compiler.transform(readFileSync(new URL('../src/components/ReaderAmazonBooks.astro', import.meta.url), 'utf8'), {
    filename: 'src/components/ReaderAmazonBooks.astro', internalURL: 'astro/runtime/server/index.js',
  });
} finally { compiler.teardown(); }
assert.equal(compiled.diagnostics.filter(d => d.severity === 1).length, 0);
const componentModule = { exports: {} };
const compiledJs = ts.transpileModule(compiled.code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
new Function('require', 'module', 'exports', compiledJs)(specifier => {
  if (specifier === 'astro/runtime/server/index.js') return { ...runtime, createMetadata: (_name, metadata) => metadata };
  if (specifier === '../lib/amazon-books.mjs') return bookLibrary;
  if (specifier.endsWith('.css')) return {}; // SSR markup only; paint is checked in Chrome.
  throw new Error('Unexpected purchase component import: ' + specifier);
}, componentModule, componentModule.exports);
export const PurchaseComponent = componentModule.exports.default;

test('actual Astro purchase component renders every mapped listing, catalog and no unrelated ads', async () => {
  const container = await Container.create();
  const paths = new Set(['/reader/', '/about/', '/reader/tanach-bereishit/1/1/', '/reader/likutay-moharan/1/281/']);
  for (const book of amazonBooks) for (const route of book.readerRoutes) paths.add(route.rootOnly ? `/reader/${route.book}/` : `/reader/${route.book}/${route.part || '1'}/${route.section || '1'}/`);
  for (const pathname of paths) {
    const html = await container.renderToString(PurchaseComponent, { props: { pathname } });
    const $ = load(html);
    const expected = booksForReaderPath(pathname);
    assert.equal($('.reader-amazon-buy').length, expected.length, pathname);
    assert.deepEqual($('.reader-amazon-buy').map((_i, el) => $(el).attr('href')).get(), expected.map(amazonBookUrl), pathname);
    for (const anchor of $('.reader-amazon-buy').toArray()) {
      assert.equal($(anchor).attr('target'), '_blank');
      assert.equal($(anchor).attr('rel'), 'noopener noreferrer');
      assert.match($(anchor).text(), /Buy .+ on Amazon/);
    }
    assert.equal($('.reader-amazon-catalog').length, expected.length || bookLibrary.readerBookCatalogLink(pathname) ? 1 : 0, pathname);
    assert.equal($('script, img, iframe').length, 0);
  }
});

// Fixed product identities prevent a title-similar third-party edition being
// substituted for the publisher's own books.
test('named books use their own direct Amazon listings', () => {
  const ids = new Map(amazonBooks.map(book => [book.id, book]));
  assert.equal(ids.get('character').asin, '1523981644');
  assert.equal(ids.get('outpouring-of-the-soul').asin, '1534848010');
  for (const id of ['character', 'live-up-the-good-points', 'outpouring-of-the-soul', 'revival-of-the-soul']) assert.ok(ids.has(id), id);
  assert.equal(booksForReaderPath('/reader/sefer-hamidos/1/')[0].id, 'character');
  assert.equal(booksForReaderPath('/reader/likutay-moharan/1/282/')[0].id, 'live-up-the-good-points');
  assert.equal(booksForReaderPath('/reader/hashtatfchus-hanefesh/1/1/')[0].id, 'outpouring-of-the-soul');
  assert.equal(booksForReaderPath('/reader/meshivas-nefesh/1/1/')[0].id, 'revival-of-the-soul');
});

test('exact teaching/volume matching and route boundaries', () => {
  for (const path of ['/reader/likutay-moharan/1/281/', '/reader/likutay-moharan/2/282/', '/reader/likutay-moharan/1/', '/reader/likutay-moharan/', '/reader/sefer-hamidos-other/1/', '/reader-plain/sefer-hamidos/1/1/', '/blog/', '/reader//sefer-hamidos/', '/reader/sefer-hamidos/1/1/extra']) assert.deepEqual(booksForReaderPath(path), [], path);
  assert.deepEqual(booksForReaderPath('/reader/likutay-moharan/1/282'), booksForReaderPath('/reader/likutay-moharan/1/282/'));
  assert.equal(booksForReaderPath('/reader/sefer-hamidos/')[0].id, 'character');
  assert.equal(booksForReaderPath('/reader/sefer-hamidos/1/108/')[0].id, 'character');
  assert.equal(booksForReaderPath('/reader/likutay-nanach/4/16/')[0].asin, 'B0H67NGPTG');
  assert.equal(booksForReaderPath('/reader/likutay-nanach/5/8/')[0].asin, 'B093CHKYDL');
  assert.deepEqual(booksForReaderPath('/reader/likutay-halachos/1/18/').map(b => b.id), ['likutay-halachos-2']);
  assert.deepEqual(booksForReaderPath('/reader/likutay-halachos/1/43/').map(b => b.id), ['likutay-halachos-4', 'likutay-halachos-5']);
  assert.deepEqual(booksForReaderPath('/reader/likutay-halachos/2/18/'), []);
  assert.equal(booksForReaderPath('/reader/precious-stones/english/')[0].asin, 'B0HMFG815D');
  assert.equal(booksForReaderPath('/reader/precious-stones/')[0].asin, 'B0HM9MSZXL');
});

test('recovered editions have independent literal route/product and catalog-link witnesses', () => {
  const witnesses = [
    ['/reader/likutay-nanach/1/24/', 'B08N5LDWDS'],
    ['/reader/likutay-nanach/2/11/', 'B08NDRB8Z5'],
    ['/reader/precious-stones', 'B0HM9MSZXL'],
    ['/reader/precious-stones/', 'B0HM9MSZXL'],
    ['/reader/precious-stones/english/', 'B0HMFG815D'],
    ['/reader/geedoolay-hanachal/1/2/', 'B0HG1XWXCG'],
  ];
  for (const [path, asin] of witnesses) assert.deepEqual(booksForReaderPath(path).map(b => b.asin), [asin], path);
  for (const path of ['/reader/precious-stones/1/', '/reader/geedoolay-hanachal/1/1/', '/reader/geedoolay-hanachal/1/', '/reader/geedoolay-hanachal/2/2/']) assert.deepEqual(booksForReaderPath(path), [], path);
  for (const path of ['/reader/precious-stones/english/', '/reader/precious-stones/english/1/', '/reader/precious-stones/1/1/']) assert.ok(!booksForReaderPath(path).some(b => b.asin === 'B0HM9MSZXL'), path);
  const ids = new Map(amazonBooks.map(b => [b.id, b]));
  for (const [id, url] of [
    ['precious-stones-hebrew', '/reader/precious-stones/'],
    ['precious-stones', '/reader/precious-stones/english/'],
    ['nurtured-by-the-stream', '/reader/geedoolay-hanachal/1/2/'],
    ['likutay-nanach-1', '/reader/likutay-nanach/1/'],
    ['likutay-nanach-2', '/reader/likutay-nanach/2/'],
  ]) assert.equal(bookLibrary.readerBookUrl(ids.get(id)), url);
  assert.ok(amazonBooks.every(b => b.asin !== 'B08MX7BPQ2' && b.asin !== 'B0FVTWMTTB'));
});

test('catalog identities, direct URLs and matching are consistent for every entry', () => {
  assert.equal(new Set(amazonBooks.map(book => book.id)).size, amazonBooks.length);
  assert.equal(new Set(amazonBooks.map(book => book.asin)).size, amazonBooks.length);
  for (const book of amazonBooks) {
    assert.match(book.asin, /^[A-Z0-9]{10}$/);
    assert.ok(book.title.trim());
    assert.equal(amazonBookUrl(book), `https://www.amazon.com/dp/${book.asin}`);
    for (const route of book.readerRoutes) {
      assert.match(route.book, /^[a-z0-9-]+$/);
      const path = route.rootOnly ? `/reader/${route.book}/` : `/reader/${route.book}/${route.part || '1'}/${route.section || '1'}/`;
      assert.ok(booksForReaderPath(path).some(row => row.id === book.id), `${book.id}: ${path}`);
    }
  }
});

test('top placement is static, unostentatious, keyboard-accessible and absent in print', () => {
  const layout = readFileSync(new URL('../src/layouts/Layout.astro', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../src/components/ReaderAmazonBooks.astro', import.meta.url), 'utf8');
  assert.match(layout, /<main id="main-content">\s*<ReaderAmazonBooks pathname=\{Astro\.url\.pathname\} \/>\s*<slot \/>/);
  assert.match(component, /rel="noopener noreferrer"/);
  assert.match(component, /:focus-visible/);
  assert.match(component, /@media print/);
  assert.match(component, /min-height: 44px/);
  assert.match(component, /:global\(body\.dark-mode\) \.reader-amazon-books/);
  assert.match(component, /--amazon-fg: #d0d0e0/);
  assert.match(component, /outline: 2px solid currentColor/);
  assert.doesNotMatch(component, /<script|position:\s*fixed|animation:|linear-gradient|amazon-logo/i);
});
