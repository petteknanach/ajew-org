#!/usr/bin/env python3
"""Build only three real routes, keeping their full Layout/components intact.
Usage: python scripts/test-shared-floating-build.py OUTPUT --modules NODE_MODULES
No npm pipeline, corpus writes, live requests, or full-site build. Output must be new.
"""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('output',type=Path);p.add_argument('--modules',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
files=[p for p in (root/'src').rglob('*') if p.is_file() and 'pages' not in p.relative_to(root/'src').parts]
routes=['src/pages/reader/chok.astro','src/pages/torah-lens.astro','src/pages/reader/chayey-moharan/siman/[siman].astro']
files += [root/r for r in routes]+[root/'package.json',root/'astro.config.mjs']
before={str(p.relative_to(root)):sha(p) for p in files}
for p in files:
 dst=out/p.relative_to(root);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dst)
route=out/routes[-1];text=route.read_text();old='.filter((file) => /^siman-\\d+\\.json$/.test(file))';assert text.count(old)==1
route.write_text(text.replace(old,'.filter((file) => file === "siman-241.json")'))
(out/'node_modules').symlink_to(a.modules.resolve(),target_is_directory=True)
(out/'public').symlink_to(root/'public',target_is_directory=True)
(out/'qa-empty-public').mkdir()
config=out/'astro.config.mjs';text=config.read_text();old="site: 'https://ajew.org',";assert text.count(old)==1
config.write_text(text.replace(old,old+"\n  publicDir: './qa-empty-public',"))
result=subprocess.run(['node',str(a.modules.resolve()/'astro/astro.js'),'build'],cwd=out,capture_output=True,text=True)
(out/'build.log').write_text(result.stdout+result.stderr)
assert before=={str(p.relative_to(root)):sha(p) for p in files},'source changed during build'
outputs={str(p.relative_to(out/'dist')):sha(p) for p in (out/'dist').rglob('*') if p.is_file()}
html=[p for p in outputs if p.endswith('.html')];assert len(html)==3,html
(out/'manifest.json').write_text(json.dumps({'source':str(root),'inputs':before,'outputs':outputs,'routes':html,'exit':result.returncode,'fixtureOnlyChanges':['getStaticPaths limited to siman-241','publicDir empty to avoid copying corpus']},indent=2)+'\n')
print(json.dumps({'exit':result.returncode,'pages':html,'manifest':str(out/'manifest.json')}))
assert result.returncode==0,result.stderr
