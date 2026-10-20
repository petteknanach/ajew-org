#!/usr/bin/env python3
"""Exercise the real nginx snippet against an isolated disposable fixture server."""
import argparse
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
from urllib.error import HTTPError
from urllib.request import build_opener, HTTPRedirectHandler


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snippet', type=Path, default=Path(__file__).resolve().parents[1] / 'ops/nginx-reader-legacy-redirects.conf')
    parser.add_argument('--nginx', default=shutil.which('nginx'))
    args = parser.parse_args()
    if not args.nginx:
        raise SystemExit('nginx executable required; no tests executed')
    snippet = args.snippet.resolve(strict=True)
    with tempfile.TemporaryDirectory(prefix='ajew-seo404-nginx-') as temporary:
        root = Path(temporary)
        root.chmod(0o755)  # Allow the fixture's unprivileged nginx worker to traverse.
        www = root / 'www'
        # Explicit synthetic fixtures: routing tests only, never source text.
        for relative in ['reader/tanach-tehillim/1/114/index.html',
                         'reader/likutay-moharan/2/62/index.html',
                         'reader/meshivas-nefesh/1/8/index.html',
                         'reader/sichos-haran/1/301/index.html',
                         'reader/sichos-haran/1/320/index.html',
                         'reader-plain/likutay-halachos/full.txt',
                         'reader-plain/likutay-halachos/full.md']:
            p = www / relative
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text('routing fixture only\n', encoding='utf-8')
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            port = s.getsockname()[1]
        config = root / 'nginx.conf'
        config.write_text('pid ' + str(root / 'nginx.pid') + ';\n'
            'error_log ' + str(root / 'error.log') + ';\n'
            'events { worker_connections 64; }\n'
            'http { access_log off; server { listen 127.0.0.1:' + str(port) + ';\n'
            'root ' + str(www) + ';\ninclude ' + str(snippet) + ';\n'
            'location / { try_files $uri $uri/ =404; }\n} }\n', encoding='utf-8')
        check = subprocess.run([args.nginx, '-p', str(root), '-c', str(config), '-t'], capture_output=True, text=True)
        if check.returncode:
            raise RuntimeError(check.stderr)
        proc = subprocess.Popen([args.nginx, '-p', str(root), '-c', str(config), '-g', 'daemon off;'], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        assert proc.stderr is not None
        results = []
        try:
            for _ in range(100):
                if proc.poll() is not None:
                    raise RuntimeError(proc.stderr.read().decode())
                try:
                    with socket.create_connection(('127.0.0.1', port), timeout=.1):
                        break
                except OSError:
                    time.sleep(.02)
            else:
                raise RuntimeError('Owned fixture nginx did not become ready')
            cases = [
                ('/reader/tanach-tehillim/part-1/torah-114', 301, '/reader/tanach-tehillim/1/114/'),
                ('/reader/tanach-tehillim/part-1/114/', 404, None),
                ('/reader/tanach-tehillim/part-1/torah-114?edition=original&q=a%20b', 301, '/reader/tanach-tehillim/1/114/?edition=original&q=a%20b'),
                ('/reader/likutay-moharan/part-2/torah-62', 301, '/reader/likutay-moharan/2/62/'),
                ('/reader/meshivas-nefesh/section-8', 301, '/reader/meshivas-nefesh/1/8/'),
                ('/reader/sichos-haran/sicha-301', 301, '/reader/sichos-haran/1/301/'),
                ('/likutay-halachos/full.txt', 301, '/reader/likutay-halachos/full.txt'),
                ('/likutay-halachos/full.md?download=1', 404, None),
                ('/reader/likutay-moharan/part-2/torah-1038', 404, None),
                ('/reader/withheld-book/part-1/torah-114', 404, None),
                ('/reader/tanach-tehillim/part-0/torah-114', 404, None),
                ('/reader/tanach-tehillim/part-1/torah-0', 404, None),
                ('/reader/tanach-tehillim/part-01/torah-114', 404, None),
                ('/reader/tanach-tehillim/part-1/torah-114.json', 404, None),
                ('/reader/tanach-tehillim/part-1/torah-114/extra', 404, None),
                ('/missing-book/full.txt', 404, None),
                ('/reader/meshivas-nefesh/section-310', 404, None),
                ('/reader/sichos-haran/sicha-99999', 404, None),
                ('/reader/sichos-haran/sicha-320', 404, None),
                ('/reader/tanach-tehillim/part-1/torah-39', 404, None),  # approved alias, absent target in this fixture
                ('/reader-plain/1/10', 404, None),
            ]
            opener = build_opener(NoRedirect())
            for url, expected_status, target in cases:
                try:
                    response = opener.open(f'http://127.0.0.1:{port}' + url, timeout=3)
                except HTTPError as e:
                    response = e
                actual_status = response.code
                location = response.headers.get('Location')
                response.close()
                expected_location = 'https://ajew.org' + target if target else None
                assert (actual_status, location) == (expected_status, expected_location), (url, actual_status, location)
                results.append({'path': url, 'status': actual_status, 'location': location, 'pass': True})
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=5)
            proc.stderr.close()
        assert proc.poll() is not None
        print(json.dumps({'fixture': 'isolated actual nginx; synthetic routing files only', 'tests': len(results), 'passed': len(results), 'process_closed': True, 'cases': results}, indent=2))


if __name__ == '__main__':
    main()
