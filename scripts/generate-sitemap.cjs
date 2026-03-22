/**
 * Generate comprehensive sitemap.xml for ajew.org
 * Includes all reader pages, parsha, reference, and static pages
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://ajew.org';
const READER_DIR = path.join(__dirname, '..', 'public', 'reader');
const OUTPUT = path.join(__dirname, '..', 'public', 'sitemap.xml');

const today = new Date().toISOString().split('T')[0];

function url(loc, priority = 0.5, changefreq = 'monthly') {
  return `  <url>\n    <loc>${BASE_URL}${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority.toFixed(1)}</priority>\n  </url>`;
}

function main() {
  const urls = [];

  // Static pages
  urls.push(url('/', 1.0, 'daily'));
  urls.push(url('/reader', 0.9, 'weekly'));
  urls.push(url('/search', 0.8, 'weekly'));
  urls.push(url('/reference', 0.7, 'monthly'));
  urls.push(url('/parsha', 0.7, 'weekly'));
  urls.push(url('/torah-map', 0.6, 'monthly'));
  urls.push(url('/about', 0.5, 'monthly'));
  urls.push(url('/library', 0.6, 'monthly'));
  urls.push(url('/topics', 0.6, 'monthly'));

  // Reader pages - scan all book directories
  const catalog = JSON.parse(fs.readFileSync(path.join(READER_DIR, 'catalog.json'), 'utf8'));

  for (const book of catalog.books) {
    if (!book.parts || !Array.isArray(book.parts)) continue;

    for (const part of book.parts) {
      const indexUrl = part.indexUrl;
      if (!indexUrl) continue;

      const indexPath = path.join(__dirname, '..', 'public', indexUrl.replace(/^\//, ''));
      if (!fs.existsSync(indexPath)) continue;

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const items = index.torahs || index.items || [];

      for (const item of items) {
        const itemUrl = item.url || `/reader/${book.id}/${part.part}/${item.number}`;
        urls.push(url(itemUrl, 0.6, 'monthly'));
      }
    }
  }

  // Special LM pages
  for (const special of ['haskamos', 'intro', 'intro-shimon']) {
    urls.push(url(`/reader/likutay-moharan/1/${special}`, 0.5, 'monthly'));
  }
  for (const special of ['intro', 'omission']) {
    urls.push(url(`/reader/likutay-moharan/2/${special}`, 0.5, 'monthly'));
  }

  // Flat-structure books (no part-N subdirectory)
  const flatBooks = [
    { id: 'meshivas-nefesh', prefix: 'section-', max: 183 },
    { id: 'sichos-haran', prefix: 'sicha-', max: 310 },
    { id: 'yemei-hatlaos', prefix: 'section-', max: 36 },
  ];
  for (const fb of flatBooks) {
    const dir = path.join(READER_DIR, fb.id);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.startsWith(fb.prefix) && f.endsWith('.json'));
    for (const f of files) {
      const num = f.match(/\d+/)?.[0];
      if (num) urls.push(url(`/reader/${fb.id}/${num}`, 0.5, 'monthly'));
    }
  }

  // Parsha pages
  const parshas = ['bereishit','noach','lech-lecha','vayeira','chayei-sarah','toldos','vayeitzei',
    'vayishlach','vayeishev','mikeitz','vayigash','vayechi','shemos','vaeira','bo','beshalach',
    'yisro','mishpatim','terumah','tetzaveh','ki-tisa','vayakhel','pekudei','vayikra','tzav',
    'shemini','tazria','metzora','acharei-mos','kedoshim','emor','behar','bechukosai','bamidbar',
    'naso','behaaloscha','shelach','korach','chukas','balak','pinchas','matos','masei','devarim',
    'vaeschanan','eikev','reeh','shoftim','ki-seitzei','ki-savo','nitzavim-vayeilech','haazinu',
    'vezos-habracha'];
  for (const p of parshas) {
    urls.push(url(`/parsha/${p}`, 0.6, 'weekly'));
  }

  // Tzaddikim pages
  const tzaddikim = ['rebbe-nachman', 'reb-noson', 'saba', 'avraham-chazan', 'shlomo-carlebach',
    'meir-yimeeney', 'aaron-patz', 'rabbi-nosson-tiveria', 'raphael-moshe-bula'];
  for (const t of tzaddikim) {
    urls.push(url(`/tzaddikim/${t}`, 0.5, 'monthly'));
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

  fs.writeFileSync(OUTPUT, xml);
  console.log(`Sitemap generated: ${urls.length} URLs`);
  console.log(`Output: ${OUTPUT}`);
}

main();
