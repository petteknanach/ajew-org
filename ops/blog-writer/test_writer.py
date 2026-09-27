import io
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from typing import Any
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs
import writer


class WriterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.state = self.root / 'state'
        self.legacy = self.root / 'legacy'
        self.legacy.mkdir()
        self.legacy_html = '<!doctype html><html><head><title>Old blog</title></head><body><nav class="blog-nav">Old nav</nav><main class="blog-posts"><article>EXACT old prose נ נח נחמ נחמן מאומן</article></main></body></html>'
        (self.legacy / 'index.html').write_text(self.legacy_html)
        (self.legacy / 'rss.xml').write_text('<rss version="2.0"><channel><title>Old blog</title><item><title>Old post</title><link>https://ajew.org/blog/old.html</link></item></channel></rss>')
        self.patch = patch.multiple(writer, STATE=self.state, LEGACY=self.legacy)
        self.patch.start()
        writer.initialize()
        self.device_id, link = writer.create_device('TEST device')
        self.key = parse_qs(urlsplit(link).fragment)['key'][0]
        status, result, headers = self.call('/blog/write/api/login', 'POST', {'key': self.key})
        self.assertEqual(status, 200)
        self.cookie = headers['Set-Cookie'].split(';')[0]
        self.identifier = 'a' * 32

    def tearDown(self):
        self.patch.stop()
        self.temp.cleanup()

    def call(self, path, method='GET', payload=None, auth=False, origin: str | None = writer.ORIGIN, cookie=None, extra=None) -> tuple[int, Any, dict[str, str]]:
        raw = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else b''
        env = {'REQUEST_METHOD': method, 'PATH_INFO': path, 'HTTP_ORIGIN': origin,
               'CONTENT_TYPE': 'application/json', 'CONTENT_LENGTH': str(len(raw)),
               'wsgi.input': io.BytesIO(raw), 'REMOTE_ADDR': '127.0.0.1'}
        if auth:
            env['HTTP_COOKIE'] = self.cookie
        if cookie:
            env['HTTP_COOKIE'] = cookie
        if extra:
            env.update(extra)
        response = {}
        def start(status, headers):
            response.update(status=int(status.split()[0]), headers=dict(headers))
        body = b''.join(writer.application(env, start))
        try:
            body = json.loads(body)
        except ValueError:
            body = body.decode()
        return response['status'], body, response['headers']

    def save(self, title='Test draft', body='A private paragraph.\n\nנ נח נחמ נחמן מאומן', version=0):
        status, result, _ = self.call('/blog/write/api/posts', 'POST',
            {'id': self.identifier, 'title': title, 'body': body, 'version': version}, auth=True)
        self.assertEqual(status, 200, result)
        return result['post']

    def publish(self, version):
        return self.call('/blog/write/api/posts/' + self.identifier + '/publish', 'POST', {'version': version}, auth=True)

    def test_unauthenticated_cannot_read_or_write(self):
        for route, method, data in [('/blog/write/api/posts','GET',None),('/blog/write/api/posts','POST',{}),('/blog/write/api/session','GET',None)]:
            self.assertEqual(self.call(route,method,data)[0], 401)

    def test_cookie_security_and_only_hashes_stored(self):
        status, _, headers = self.call('/blog/write/api/login','POST',{'key':self.key})
        self.assertEqual(status, 200)
        for flag in ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/blog/write/']:
            self.assertIn(flag,headers['Set-Cookie'])
        with writer.connect() as c:
            self.assertEqual(c.execute('SELECT key_hash FROM devices').fetchone()[0],writer.digest(self.key))
            self.assertNotIn(self.key,str(c.execute('SELECT * FROM devices').fetchall()))

    def test_wrong_origin_cannot_login_or_write(self):
        self.assertEqual(self.call('/blog/write/api/login','POST',{'key':self.key},origin='https://evil.invalid')[0],403)
        self.assertEqual(self.call('/blog/write/api/posts','POST',{},auth=True,origin='null')[0],403)
        self.assertEqual(self.call('/blog/write/api/posts','POST',{},auth=True,origin=None)[0],403)

    def test_invalid_login_rate_limit(self):
        for _ in range(15):
            self.assertEqual(self.call('/blog/write/api/login','POST',{'key':'wrong'})[0],401)
        self.assertEqual(self.call('/blog/write/api/login','POST',{'key':'wrong'})[0],429)

    def test_revoked_device_cannot_reuse_cookie_or_key(self):
        with writer.connect() as c:
            c.execute('UPDATE devices SET revoked=1 WHERE id=?',(self.device_id,))
        self.assertEqual(self.call('/blog/write/api/session',auth=True)[0],401)
        self.assertEqual(self.call('/blog/write/api/login','POST',{'key':self.key})[0],401)

    def test_expired_session(self):
        with writer.connect() as c:
            c.execute('UPDATE sessions SET expires=0')
        self.assertEqual(self.call('/blog/write/api/posts',auth=True)[0],401)

    def test_logout_invalidates_cookie(self):
        self.assertEqual(self.call('/blog/write/api/logout','POST',{},auth=True)[0],200)
        self.assertEqual(self.call('/blog/write/api/posts',auth=True)[0],401)

    def test_draft_roundtrip_is_exact_and_private(self):
        original='  Exact line one\nA second line.\n\nשָׁלוֹם — <b>literal</b> & "quotes"  '
        post=self.save(body=original)
        self.assertEqual(post['body'], original)
        self.assertIsNone(post['url'])
        status, result, _=self.call('/blog/write/api/posts/'+self.identifier,auth=True)
        self.assertEqual((status,result['post']['body']),(200,original))
        for public in ['/blog/','/blog/rss.xml']:
            status,body,_=self.call(public)
            self.assertEqual(status,200)
            self.assertNotIn('Exact line one',body)
        self.assertEqual(self.call('/blog/p/'+self.identifier+'/')[0],404)

    def test_published_post_appears_in_page_index_and_rss(self):
        post=self.save(title='Unit-test publication', body='Local fixture only.\n\nנ נח נחמ נחמן מאומן')
        status, result, _=self.publish(post['version'])
        self.assertEqual(status,200)
        self.assertEqual(result['url'],'/blog/p/'+self.identifier+'/')
        for path in [result['url'],'/blog/','/blog/rss.xml']:
            status,body,_=self.call(path)
            self.assertEqual(status,200)
            self.assertIn('Unit-test publication',body)
        self.assertEqual((self.legacy/'index.html').read_text(),self.legacy_html)
        self.assertTrue(list((self.state/'backups').glob('*.sqlite3')))

    def test_editing_published_post_keeps_live_copy_until_publish(self):
        post=self.save(body='LIVE ORIGINAL')
        self.publish(post['version'])
        edit=self.save(body='PRIVATE EDIT',version=post['version'])
        status,live,_=self.call('/blog/p/'+self.identifier+'/')
        self.assertIn('LIVE ORIGINAL',live)
        self.assertNotIn('PRIVATE EDIT',live)
        self.assertEqual(edit['published_version'],1)
        self.assertEqual(self.publish(edit['version'])[0],200)
        self.assertIn('PRIVATE EDIT',self.call('/blog/p/'+self.identifier+'/')[1])

    def test_html_escaped_not_executed(self):
        post=self.save(title='<img src=x onerror=alert(1)>',body='<script>alert(2)</script>\n\n& exact')
        self.publish(post['version'])
        for path in ['/blog/','/blog/p/'+self.identifier+'/']:
            body=self.call(path)[1]
            self.assertNotIn('<script>alert(2)</script>',body)
            self.assertIn('&lt;script&gt;alert(2)&lt;/script&gt;',body)
            self.assertNotIn('<img src=x',body)

    def test_version_conflict_does_not_overwrite_or_publish(self):
        post=self.save()
        self.save(body='second version',version=post['version'])
        payload={'id':self.identifier,'title':'Test draft','body':'bad stale overwrite','version':1}
        self.assertEqual(self.call('/blog/write/api/posts','POST',payload,auth=True)[0],409)
        self.assertEqual(self.publish(1)[0],409)
        self.assertEqual(self.call('/blog/p/'+self.identifier+'/')[0],404)

    def test_save_and_publish_retries_do_not_duplicate(self):
        post=self.save()
        again=self.save()
        self.assertEqual(post,again)
        for _ in range(2):
            self.assertEqual(self.publish(1)[0],200)
        with writer.connect() as c:
            self.assertEqual(c.execute('SELECT count(*) FROM posts').fetchone()[0],1)
        self.assertEqual(self.call('/blog/')[1].count('data-writer-post="'+self.identifier+'"'),1)

    def test_delete_only_private_draft(self):
        self.save()
        route='/blog/write/api/posts/'+self.identifier
        self.assertEqual(self.call(route,'DELETE',{'version':0},auth=True)[0],409)
        self.assertEqual(self.call(route,'DELETE',{'version':1},auth=True)[0],200)
        self.assertEqual(self.call(route,auth=True)[0],404)
        self.save(); self.publish(1)
        self.assertEqual(self.call(route,'DELETE',{'version':1},auth=True)[0],409)

    def test_validation_and_traversal(self):
        for change in [{'id':'../../file'},{'title':''},{'body':''},{'version':True},{'title':'x'*301},{'body':'bad\x00text'}]:
            payload={'id':self.identifier,'title':'Valid','body':'Valid','version':0,**change}
            self.assertEqual(self.call('/blog/write/api/posts','POST',payload,auth=True)[0],400)
        self.assertEqual(self.call('/blog/write/../../writer.sqlite3')[0],404)
        self.assertEqual(self.call('/blog/write/api/posts','POST',[],auth=True)[0],400)
        self.assertEqual(self.call('/blog/write/api/posts','POST',{},auth=True,extra={'CONTENT_LENGTH':'1250001'})[0],413)
        self.assertEqual(self.call('/blog/write/api/posts','POST',{},auth=True,extra={'CONTENT_TYPE':'text/plain'})[0],415)

    def test_backup_failure_prevents_publish(self):
        self.save()
        with patch.object(writer,'backup',side_effect=OSError('test backup failure')):
            self.assertEqual(self.publish(1)[0],503)
        self.assertEqual(self.call('/blog/p/'+self.identifier+'/')[0],404)

    def test_simultaneous_edits_use_version_lock(self):
        from concurrent.futures import ThreadPoolExecutor
        self.save()
        def edit(body):
            return self.call('/blog/write/api/posts', 'POST',
                {'id': self.identifier, 'title': 'Test draft', 'body': body, 'version': 1}, auth=True)[0]
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(edit, ['First concurrent change', 'Second concurrent change']))
        self.assertEqual(sorted(results), [200, 409])

    def test_wrong_legacy_structure_fails_without_replacing_archive(self):
        (self.legacy/'index.html').write_text('Legacy layout changed')
        self.assertEqual(self.call('/blog/')[0],503)
        self.assertEqual((self.legacy/'index.html').read_text(),'Legacy layout changed')

    def test_security_headers_and_no_cache(self):
        _,_,headers=self.call('/blog/write/api/session',auth=True)
        self.assertEqual(headers['Cache-Control'],'no-store')
        self.assertEqual(headers['Referrer-Policy'],'no-referrer')
        self.assertIn("frame-ancestors 'none'",headers['Content-Security-Policy'])

    def test_backup_is_integral(self):
        self.save(body='Durable draft')
        path=writer.backup(self.root/'saved.sqlite3')
        with sqlite3.connect(path) as c:
            self.assertEqual(c.execute('PRAGMA integrity_check').fetchone()[0],'ok')
            self.assertEqual(c.execute('SELECT body FROM posts').fetchone()[0],'Durable draft')


if __name__=='__main__':
    unittest.main(verbosity=2)
