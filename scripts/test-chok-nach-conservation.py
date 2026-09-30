#!/usr/bin/env python3
"""Verify frozen source files and scope outside the bounded Nach renderer.
Usage: python3 scripts/test-chok-nach-conservation.py ROOT BASE_SHA MANIFEST OUTPUT
"""
import hashlib, json, pathlib, subprocess, sys
root = pathlib.Path(sys.argv[1]).resolve()
base = sys.argv[2]
manifest = pathlib.Path(sys.argv[3])
rows = json.loads(manifest.read_text())
results = []
def check(name, passed, extra=None):
    results.append({'name':name,'pass':bool(passed),'extra':extra})
    print(('PASS ' if passed else 'FAIL ') + name + (' | ' + json.dumps(extra,ensure_ascii=False) if extra is not None else ''))
def baseline(rel):
    return subprocess.check_output(['git','show',base+':'+rel],cwd=root).decode()
def current(rel):
    return (root/rel).read_text()
mismatched = []
for row in rows:
    p = pathlib.Path(row['path'])
    if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest() != row['sha256']: mismatched.append(row['path'])
check('all frozen owned JSON and shared marked renderer unchanged', not mismatched, {'total':len(rows),'matched':len(rows)-len(mismatched),'mismatches':mismatched})
old = baseline('public/chok.js')
new = current('public/chok.js')
start = "      [['navi','נביא'],['kesuvim','כתובים']].forEach(function (pair) {"
end = "      p = p.then(function () {\n        if (!want('extras')) return;"
old_prefix, old_suffix = old.split(start)[0], old.split(end)[1]
new_prefix, new_suffix = new.split(start)[0], new.split(end)[1]
new_prefix = new_prefix.replace("'תהילים':'tanach-tehillim',",'')
check('all JS outside Nach block and plene alias byte-exact', old_prefix==new_prefix and old_suffix==new_suffix)
check('Astro only pin13-to14 changed', current('src/pages/reader/chok.astro').replace('/chok.js?v=14','/chok.js?v=13')==baseline('src/pages/reader/chok.astro'))
tracked = subprocess.check_output(['git','diff','--name-only',base],cwd=root).decode().splitlines()
allowed = {'public/chok.js','src/pages/reader/chok.astro','scripts/test-chok-nach-regimen.cjs','scripts/test-chok-nach-browser.py','scripts/test-chok-nach-conservation.py','docs/chok-nach-regimen.md'}
check('tracked changes within authorized scope',set(tracked)<=allowed,tracked)
report={'passed':all(r['pass'] for r in results),'baseline':base,'manifestSHA256':hashlib.sha256(manifest.read_bytes()).hexdigest(),'results':results}
pathlib.Path(sys.argv[4]).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
sys.exit(0 if report['passed'] else 1)
