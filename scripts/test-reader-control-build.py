#!/usr/bin/env python3
"""Compile five actual full-Layout routes without copying/building the corpus.
Only getStaticPaths enumerations are bounded; template and text remain exact.
"""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('output',type=Path);p.add_argument('--modules',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];out=a.output.resolve();out.mkdir(parents=True,exist_ok=False)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
routes=['src/pages/reader/chok.astro','src/pages/torah-lens.astro','src/pages/reader/chayey-moharan/siman/[siman].astro','src/pages/reader/tikkun.astro','src/pages/reader/tanach-tehillim/[part]/[torah].astro']
files=[p for p in (root/'src').rglob('*') if p.is_file() and 'pages' not in p.relative_to(root/'src').parts]+[root/r for r in routes]+[root/'package.json',root/'astro.config.mjs']
before={str(p.relative_to(root)):sha(p) for p in files}
for f in files:
 dst=out/f.relative_to(root);dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,dst)
for route,old,new in [(routes[2],'.filter((file) => /^siman-\\d+\\.json$/.test(file))','.filter((file) => file === "siman-241.json")'),(routes[4],'for (let torah = 1; torah <= 150; torah++)','for (let torah = 16; torah <= 16; torah++)')]:
 f=out/route;s=f.read_text();assert s.count(old)==1;f.write_text(s.replace(old,new))
(out/'node_modules').symlink_to(a.modules.resolve(),target_is_directory=True);(out/'public').symlink_to(root/'public',target_is_directory=True);(out/'qa-empty-public').mkdir()
f=out/'astro.config.mjs';s=f.read_text();old="site: 'https://ajew.org',";assert s.count(old)==1;f.write_text(s.replace(old,old+"\n  publicDir: './qa-empty-public',"))
r=subprocess.run(['node',str(a.modules.resolve()/'astro/astro.js'),'build'],cwd=out,capture_output=True,text=True);(out/'build.log').write_text(r.stdout+r.stderr)
assert before=={str(p.relative_to(root)):sha(p) for p in files},'input changed during compilation'
outputs={str(p.relative_to(out/'dist')):sha(p) for p in (out/'dist').rglob('*') if p.is_file()};html=[p for p in outputs if p.endswith('.html')]
(out/'manifest.json').write_text(json.dumps({'inputs':before,'outputs':outputs,'routes':html,'exit':r.returncode,'fixtureOnlyChanges':['route enumerations bounded to Psalm16/Chayey241','empty publicDir, canonical public tree symlink for actual data and runtime']},indent=2));print(json.dumps({'exit':r.returncode,'routes':html}));assert r.returncode==0,r.stderr;assert len(html)==5,html
