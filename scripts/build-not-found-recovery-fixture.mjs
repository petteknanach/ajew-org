// Build the genuine 404 with Astro; no substituted renderer or initializer.
// Also build the unchanged search controls in a labelled fixture shell, to test
// GET form handoff without claiming a complete production search-page build.
import { copyFileSync, mkdirSync, writeFileSync, existsSync, symlinkSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(process.argv[2] || '');
if (!process.argv[2] || existsSync(root)) throw Error('Provide a new isolated fixture directory');
const deps = resolve(process.env.AJEW_TEST_DEPENDENCIES || repo);
const copy = (from, to = from) => { mkdirSync(dirname(join(root,to)), { recursive:true }); copyFileSync(join(repo,from),join(root,to)); };
mkdirSync(root, {recursive:true});
symlinkSync(join(deps,'node_modules'), join(root,'node_modules'), 'dir');
writeFileSync(join(root,'package.json'), '{"type":"module"}\n');
writeFileSync(join(root,'astro.config.mjs'), 'export default {site:"https://ajew.org", vite:{logLevel:"error"}};\n');
for (const path of ['src/pages/404.astro','public/reader/catalog.json','public/not-found-recovery.js','public/not-found-recovery.css','src/components/EnhancedSearch.astro','src/components/AdvancedSearchOptions.astro','public/data/light-search-index-he.json.gz']) copy(path);
writeFileSync(join(root,'src/pages/search-enhanced.astro'), `---
import EnhancedSearch from '../components/EnhancedSearch.astro';
---
<!doctype html><html lang="en"><head><meta charset="UTF-8"/><title>Unchanged search controls — isolated QA shell</title></head><body><EnhancedSearch showAdvancedOptions={true}/></body></html>`);
const result = spawnSync(process.execPath, [join(deps,'node_modules/astro/astro.js'),'build','--root',root], {cwd:root, encoding:'utf8'});
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
if (result.status !== 0) process.exit(result.status || 1);
if (!readFileSync(join(root,'dist/404.html'),'utf8').includes('recovery-context')) throw Error('Actual 404 was not built');
console.log('Genuine Astro 404 and unchanged search-control fixture emitted in '+join(root,'dist'));
