#!/usr/bin/env python3
"""Finite real-nginx fixture: retain directories but return proper Reader 404s.

Requires an owned --scratch, a real nginx binary, and the reviewed --snippet.
Only the foreground nginx subprocess created here is stopped by this script.
"""
import argparse
import hashlib
import http.client
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time

from reader_soft404_artifacts import prune_reader_errors


def get(port, path):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
    try:
        connection.request('GET', path)
        response = connection.getresponse()
        body = response.read()
        return {'status': response.status, 'location': response.getheader('Location'),
                'bytes': len(body), 'sha256': hashlib.sha256(body).hexdigest()}
    finally:
        connection.close()


def run_server(root, snippet, paths):
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0))
        port = probe.getsockname()[1]
    configuration = root / 'nginx.conf'
    inclusion = ('include ' + str(snippet) + ';') if snippet else ''
    configuration.write_text('user root;\nworker_processes 1;\ndaemon off;\n'
        'pid ' + str(root / 'nginx.pid') + ';\nerror_log ' + str(root / 'nginx-error.log') + ';\n'
        'events { worker_connections 32; }\nhttp { access_log off; server { listen 127.0.0.1:' + str(port) + ';\n'
        'root ' + str(root / 'dist') + '; index index.html;\n'
        + inclusion + '\nlocation / { try_files $uri $uri.html $uri/ =404; }\n} }\n')
    checked = subprocess.run([NGINX, '-t', '-p', str(root), '-c', str(configuration)],
                             capture_output=True, text=True)
    assert checked.returncode == 0, checked.stderr
    process = subprocess.Popen([NGINX, '-p', str(root), '-c', str(configuration)],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline = time.monotonic() + 8
        while True:
            assert process.poll() is None, 'Owned nginx exited before readiness'
            try:
                sentinel = get(port, '/sentinel.txt')
                assert sentinel['sha256'] == hashlib.sha256(b'owned-seo-status-fixture\n').hexdigest()
                break
            except (ConnectionError, OSError):
                if time.monotonic() >= deadline:
                    raise
                time.sleep(0.05)
        return {path: get(port, path) for path in paths}
    finally:
        process.terminate()
        process.wait(timeout=8)
        # Verify the owned listener disappeared; never signal another process.
        with socket.socket() as probe:
            assert probe.connect_ex(('127.0.0.1', port)) != 0, 'Fixture listener survived closure'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--scratch', required=True)
    parser.add_argument('--snippet', required=True)
    parser.add_argument('--nginx', default=shutil.which('nginx') or '/usr/sbin/nginx')
    args = parser.parse_args()
    global NGINX
    NGINX = args.nginx
    scratch = Path(args.scratch).resolve(strict=True)
    snippet = Path(args.snippet).resolve(strict=True)
    assert snippet.is_file() and Path(NGINX).is_file()
    with tempfile.TemporaryDirectory(prefix='nginx-reader-status-', dir=scratch) as temp:
        root = Path(temp)
        dist = root / 'dist'
        def put(relative, data):
            target = dist / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            return target
        good = put('reader/book/1/8/index.html', b'Actual fixture reading body\n')
        bad = put('reader/book/1/9/index.html', b'<!DOCTYPE html><html><head><title>Torah Not Found | ajew.org</title>'
            b'</head><body><main id="main-content"><div><h1>Torah 9 not found</h1>'
            b'<p><a href="/reader">Back to Reader</a></p></div></main></body></html>')
        protected = [good, put('reader/book/1/9/raw.txt', b'raw source stays\n'),
                     put('reader/book/1/torah-9.json', b'{"keep":true}\n'),
                     put('outside.txt', b'outside reader unchanged\n'),
                     put('sentinel.txt', b'owned-seo-status-fixture\n')]
        (dist / 'reader/book/1/7').mkdir()
        pins = {p: p.read_bytes() for p in protected}
        paths = ['/reader/book/1/7/', '/reader/book/1/8/', '/reader/book/1/8',
                 '/reader/book/1/9/', '/reader/book/1/9/raw.txt',
                 '/reader/book/1/torah-9.json', '/reader/book/1/999/', '/outside.txt']
        before = run_server(root, None, paths)
        assert before['/reader/book/1/7/']['status'] == 403, before
        assert before['/reader/book/1/9/']['status'] == 200, before
        removal = prune_reader_errors(dist)
        assert removal['removed_count'] == 1 and not bad.exists() and bad.parent.is_dir()
        after = run_server(root, snippet, paths)
        assert after['/reader/book/1/7/']['status'] == 404, after
        assert after['/reader/book/1/9/']['status'] == 404, after
        assert after['/reader/book/1/999/']['status'] == 404, after
        assert before['/reader/book/1/8']['status'] == after['/reader/book/1/8']['status'] == 301
        for path in ['/reader/book/1/8/', '/reader/book/1/9/raw.txt', '/reader/book/1/torah-9.json', '/outside.txt']:
            assert before[path]['status'] == after[path]['status'] == 200
            assert before[path]['sha256'] == after[path]['sha256'], path
        for path, expected in pins.items():
            assert path.read_bytes() == expected
        print(json.dumps({'baseline': before, 'candidate': after, 'paths_per_phase': len(paths),
                          'actual_empty_directory_baseline': 403, 'candidate_empty_directory': 404,
                          'pruned_error_status': 404, 'valid_reading_raw_json_outside_body_conservation': True,
                          'owned_nginx_processes_closed': True, 'removed_fixture_errors': removal['removed_count']}, indent=2))


if __name__ == '__main__':
    main()
