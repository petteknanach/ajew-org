#!/usr/bin/env python3
"""Install a reviewed, main-merged standalone writer bundle on the VPS.
Run as root: python3 install.py /absolute/staging/directory
No changes to legacy blog files, email credentials, corpus or site release.
"""
import fcntl
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

stage = Path(sys.argv[1]).resolve()
app = Path('/opt/ajew-blog-writer')
config = Path('/etc/nginx/sites-available/ajew.org')
include = Path('/etc/nginx/snippets/ajew-blog-writer.conf')
unit = Path('/etc/systemd/system/ajew-blog-writer.service')
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
manifest = json.loads((stage / 'SOURCE.json').read_text())
for name, expected in manifest['files'].items():
    path = stage / name
    if not path.is_relative_to(stage) or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise SystemExit('Source manifest mismatch: ' + name)
lock = open('/var/lock/ajew-deploy.lock', 'a')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
old_config = config.read_bytes()
anchor = '    location ^~ /blog {'
text = old_config.decode()
line = '    include /etc/nginx/snippets/ajew-blog-writer.conf;'
if line not in text and text.count(anchor) != 1:
    raise SystemExit('Unexpected nginx layout; no changes made.')

def run(*args):
    subprocess.run(args, check=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

legacy = Path('/opt/ajew-blog')
preserved = {str(p.relative_to(legacy)): digest(p) for p in legacy.rglob('*')
             if p.is_file() and p.suffix in ('.html', '.css', '.js', '.xml', '.py')}
app.mkdir(mode=0o755, exist_ok=True)
evidence = app / 'deployment-evidence'
evidence.mkdir(mode=0o700, exist_ok=True)
(evidence / ('legacy-before-' + stamp + '.json')).write_text(json.dumps(preserved, indent=2))
if subprocess.run(['id', '-u', 'ajew-blog-writer'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
    run('useradd', '--system', '--home-dir', '/var/lib/ajew-blog-writer', '--shell', '/usr/sbin/nologin', 'ajew-blog-writer')
for name in manifest['files']:
    destination = app / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(stage / name, destination)
    destination.chmod(0o644)
shutil.copy2(stage / 'SOURCE.json', app / 'SOURCE.json')
if not (app / 'venv/bin/python').exists():
    run('python3', '-m', 'venv', str(app / 'venv'))
run(str(app / 'venv/bin/python'), '-m', 'pip', 'install', '--disable-pip-version-check', '-r', str(app / 'requirements.txt'))
run(str(app / 'venv/bin/python'), '-m', 'unittest', 'discover', '-s', str(app), '-p', 'test_*.py', '-q')
shutil.copy2(app / 'ajew-blog-writer.service', unit)
run('systemctl', 'daemon-reload')
run('systemctl', 'enable', '--now', 'ajew-blog-writer')
run('systemctl', 'restart', 'ajew-blog-writer')
healthy = False
for attempt in range(10):
    try:
        with urllib.request.urlopen('http://127.0.0.1:8790/blog/write/health', timeout=2) as response:
            healthy = json.load(response).get('ok') is True
        if healthy:
            break
    except Exception:
        time.sleep(0.5)
if not healthy:
    raise SystemExit('Writer failed health check; nginx untouched.')
for route in ['/blog/write/', '/blog/', '/blog/rss.xml']:
    with urllib.request.urlopen('http://127.0.0.1:8790' + route, timeout=5) as response:
        assert response.status == 200
saved = config.with_name(config.name + '.before-blog-writer-' + stamp)
shutil.copy2(config, saved)
if include.exists():
    shutil.copy2(include, include.with_name(include.name + '.before-' + stamp))
shutil.copy2(app / 'nginx-writer.conf', include)
if line not in text:
    text = text.replace(anchor, line + '\n\n' + anchor, 1)
    config.write_text(text)
try:
    run('nginx', '-t')
    run('systemctl', 'reload', 'nginx')
except Exception:
    config.write_bytes(old_config)
    run('nginx', '-t')
    run('systemctl', 'reload', 'nginx')
    raise
changed = [name for name, expected in preserved.items() if digest(legacy / name) != expected]
if changed:
    raise SystemExit('Legacy files changed concurrently; investigate: ' + json.dumps(changed))
report = {'source_commit': manifest['commit'], 'legacy_files_unchanged': len(preserved),
          'nginx_backup': str(saved), 'health': healthy, 'verified_at': stamp}
(evidence / ('deploy-' + stamp + '.json')).write_text(json.dumps(report, indent=2))
print(json.dumps(report))
