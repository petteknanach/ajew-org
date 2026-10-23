#!/usr/bin/env python3
"""Real nginx baseline/candidate query-indexing fixture; no production changes."""
import contextlib
import http.client
import json
import os
from pathlib import Path
import pwd
import shutil
import socket
import subprocess
import tempfile
import time

REPO = Path(__file__).resolve().parents[1]
POLICY = REPO / 'ops/nginx-search-query-robots.conf'
CASES = [
    ('/search-enhanced/', 200, False),
    ('/search-enhanced/?q=source', 200, True),
    ('/search-enhanced?q=source', 301, True),
    ('/search-enhanced/index.html?q=source', 200, True),
    ('/search-enhanced/?q=', 200, False),
    ('/search-enhanced/?lang=he&q=%D7%A7%D7%93%D7%95%D7%A9%D7%94&v=1', 200, True),
    ('/search-enhanced/?Q=source', 200, True),
    ('/search-enhanced/?query=source', 200, False),
    ('/search-enhanced/extra?q=source', 404, False),
    ('/reader/ramchal-adir-bamuroam/1/20/?q=x', 200, False),
    ('/reader-source.json?q=x', 200, False),
    ('/asset.js?q=x', 200, False),
    ('/search-enhanced/?q=%0D%0AX-Bad%3A1', 200, True),
    ('/search-enhanced/?q=source&q=', 200, True),
    ('/search-enhanced/?q=&q=source', 200, False),
    ('/search-enhanced/?q=%20', 200, True),
    ('/search-enhanced/?q=0', 200, True),
]

def request(port, target, method='GET', headers=None):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=5)
    try:
        connection.request(method, target, headers=headers or {})
        reply = connection.getresponse()
        return reply.status, {k.lower(): v for k, v in reply.getheaders()}, reply.read()
    finally:
        connection.close()

@contextlib.contextmanager
def server(root, candidate):
    with socket.socket() as reserve:
        reserve.bind(('127.0.0.1', 0))
        port = reserve.getsockname()[1]
    prefix = root / ('candidate' if candidate else 'baseline')
    prefix.mkdir()
    files = prefix / 'dist'
    (files / 'search-enhanced').mkdir(parents=True)
    (files / 'reader/ramchal-adir-bamuroam/1/20').mkdir(parents=True)
    shell = b'<!doctype html><meta name="robots" content="index, follow"><main>Search shell</main>'
    (files / 'search-enhanced/index.html').write_bytes(shell)
    (files / 'reader/ramchal-adir-bamuroam/1/20/index.html').write_bytes(b'<main>Reader fixture source</main>')
    (files / 'reader-source.json').write_bytes(b'{"hebrew":"source","english":""}')
    (files / 'asset.js').write_bytes(b'/* unchanged asset fixture */')
    (files / '404.html').write_bytes(b'<main>Missing fixture</main>')
    user = f'user {pwd.getpwuid(os.geteuid()).pw_name};' if os.geteuid() == 0 else ''
    include = f'include "{POLICY}";' if candidate else ''
    config = prefix / 'nginx.conf'
    config.write_text(f'''{user}
worker_processes 1;
pid "{prefix}/nginx.pid";
error_log "{prefix}/error.log";
events {{ worker_connections 32; }}
http {{
    access_log off;
    default_type text/html;
    server {{
        listen 127.0.0.1:{port};
        root "{files}";
        index index.html;
        add_header X-Fixture-Server preserved always;
        {include}
        error_page 404 /404.html;
        location = /404.html {{ internal; }}
        location / {{ try_files $uri $uri.html $uri/ =404; }}
        location ~* \\.js$ {{ add_header Cache-Control "public, immutable"; }}
    }}
}}
''')
    command = [shutil.which('nginx'), '-p', str(prefix), '-c', str(config)]
    subprocess.run(command + ['-t'], check=True, capture_output=True)
    process = subprocess.Popen(command + ['-g', 'daemon off;'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        ready = False
        for _ in range(50):
            if process.poll() is not None:
                raise RuntimeError((prefix / 'error.log').read_text())
            try:
                ready = request(port, '/search-enhanced/')[0] == 200
            except OSError:
                pass
            if ready:
                break
            time.sleep(.05)
        assert ready, 'Private nginx did not become ready'
        yield port, shell
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)


def main():
    assert shutil.which('nginx'), 'Actual nginx required; do not credit a skipped fixture'
    scratch = Path(os.environ.get('TMPDIR', Path.home() / '.hermes/cache/scratch'))
    scratch.mkdir(parents=True, exist_ok=True)
    rows = []
    with tempfile.TemporaryDirectory(prefix='search-query-robots-', dir=scratch) as temporary:
        for candidate in [False, True]:
            with server(Path(temporary), candidate) as (port, shell):
                for target, expected_status, tagged in CASES:
                    status, headers, body = request(port, target)
                    assert status == expected_status, (target, status, candidate)
                    expected = 'noindex, follow' if candidate and tagged else None
                    assert headers.get('x-robots-tag') == expected, (target, headers, candidate)
                    assert 'x-bad' not in headers
                    if status == 200 and target.startswith('/search-enhanced'):
                        assert body == shell, (target, 'Search HTML changed')
                    if status == 301:
                        assert headers['location'].endswith('/search-enhanced/?q=source'), headers
                    if target.startswith('/asset.js'):
                        assert headers.get('cache-control') == 'public, immutable'
                    else:
                        assert headers.get('x-fixture-server') == 'preserved', headers
                    rows.append({'candidate': candidate, 'target': target, 'status': status, 'robots': expected})
                status, headers, body = request(port, '/search-enhanced/?q=source', method='HEAD')
                assert status == 200 and body == b''
                assert headers.get('x-robots-tag') == ('noindex, follow' if candidate else None)
                status, headers, body = request(port, '/search-enhanced/?q=source', headers={'If-None-Match': headers['etag']})
                assert status == 304 and body == b''
                assert headers.get('x-robots-tag') == ('noindex, follow' if candidate else None)
                rows.extend([{'candidate': candidate, 'method': 'HEAD', 'status': 200},
                             {'candidate': candidate, 'conditional': True, 'status': 304}])
    print(json.dumps({'passed': len(rows), 'phases': 2, 'checks': rows}))

if __name__ == '__main__':
    main()
