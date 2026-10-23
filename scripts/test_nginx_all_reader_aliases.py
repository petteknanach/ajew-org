#!/usr/bin/env python3
"""All exact aliases against real private nginx; synthetic routing files only."""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import build_opener, HTTPRedirectHandler

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    rows = json.loads((args.root/'ops/reader-legacy-redirects.json').read_text())
    assert len(rows) == 96 and len({r['from'] for r in rows}) == 96
    nginx = shutil.which('nginx')
    if not nginx: raise SystemExit('nginx required; no routing tests executed')
    with tempfile.TemporaryDirectory(prefix='ajew-exact-aliases-',dir=os.environ.get('TMPDIR')) as temporary:
        root = Path(temporary); root.chmod(0o755); www=root/'www'; www.mkdir()
        def target_file(row):
            target = row['to'].replace('/reader/','/reader-plain/',1) if row['kind']=='export' else row['to']+'index.html'
            return www/target.lstrip('/')
        for row in rows:
            f=target_file(row);f.parent.mkdir(parents=True,exist_ok=True);f.write_text('Synthetic routing fixture only.\n')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        conf=root/'nginx.conf';conf.write_text(f'pid {root}/nginx.pid;\nerror_log {root}/error.log;\nevents {{ worker_connections 64; }}\nhttp {{ access_log off; server {{ listen 127.0.0.1:{port}; root {www}; include {args.root.resolve()}/ops/nginx-reader-legacy-redirects.conf; location / {{ try_files $uri $uri/ =404; }} }} }}\n')
        check=subprocess.run([nginx,'-p',str(root),'-c',str(conf),'-t'],capture_output=True)
        assert check.returncode==0,check.stderr.decode()
        process=subprocess.Popen([nginx,'-p',str(root),'-c',str(conf),'-g','daemon off;'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        assert process.stderr is not None
        cases=[];opener=build_opener(NoRedirect())
        def request(uri,status,location):
            uri=quote(uri,safe='/%?=&')
            try:response=opener.open(f'http://127.0.0.1:{port}'+uri,timeout=4)
            except HTTPError as error:response=error
            actual=(response.code,response.headers.get('Location'));response.close()
            assert actual==(status,location),(uri,actual,status,location)
            cases.append({'uri':uri,'status':actual[0],'location':actual[1]})
        try:
            for attempt in range(100):
                if process.poll() is not None:raise RuntimeError(process.stderr.read().decode())
                try:
                    with socket.create_connection(('127.0.0.1',port),timeout=.1):break
                except OSError:time.sleep(.02)
            else:raise RuntimeError('Owned nginx did not become ready')
            for row in rows:
                target='https://ajew.org'+quote(row['to'],safe='/')
                request(row['from'],301,target)
                request(row['from']+'?edition=original&q=a%20b',301,target+'?edition=original&q=a%20b')
                f=target_file(row);body=f.read_bytes();f.unlink()
                try:request(row['from'],404,None)
                finally:f.write_bytes(body)
            for uri in ['/reader/likutay-moharan/part-2/torah-1038','/reader/withheld-book/part-1/torah-114','/reader/tanach-tehillim/part-0/torah-114','/reader/tanach-tehillim/part-1/torah-0','/reader/tanach-tehillim/part-01/torah-114','/reader/tanach-tehillim/part-1/torah-114.json','/reader/tanach-tehillim/part-1/torah-114/extra','/missing-book/full.txt','/reader-plain/1/999999','/reader-plain/likutay-nanach/4/999999','/reader-plain/sichos-haran/1/309','/pdfs/parsha/missing.pdf']:
                request(uri,404,None)
        finally:
            process.terminate()
            try:process.wait(timeout=5)
            except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
            process.stderr.close()
        assert process.poll() is not None
        print(json.dumps({'scope':'actual isolated nginx; synthetic routing targets; not source-body acceptance','aliases':len(rows),'passed':len(cases),'process_closed':True,'cases':cases},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
