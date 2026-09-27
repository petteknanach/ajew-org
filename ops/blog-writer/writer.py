#!/usr/bin/env python3
"""Private ajew blog writer. Legacy posts are strictly read-only.

WSGI: writer:application. Operator-only CLI: create-link LABEL, revoke ID,
backup PATH. Private keys are printed ONLY by create-link; capture privately.
"""
import argparse
import hashlib
import html
import json
import os
import re
import secrets
import sqlite3
import sys
import time
import traceback
import uuid
import xml.etree.ElementTree as ET
from contextlib import closing
from datetime import datetime, timezone
from email.utils import format_datetime
from http import HTTPStatus
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import quote

ORIGIN = os.environ.get('WRITER_ORIGIN', 'https://ajew.org').rstrip('/')
STATE = Path(os.environ.get('WRITER_STATE', '/var/lib/ajew-blog-writer'))
LEGACY = Path(os.environ.get('WRITER_LEGACY', '/opt/ajew-blog'))
STATIC = Path(__file__).resolve().parent / 'static'
COOKIE = '__Secure-ajew_blog_writer'
SESSION_SECONDS = 90 * 86400
MAX_REQUEST = 1250000
POST_ID = re.compile(r'[a-f0-9]{32}')


class Problem(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def digest(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def connect():
    connection = sqlite3.connect(STATE / 'writer.sqlite3', timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    return connection


def initialize():
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with closing(connect()) as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript('''
        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY, label TEXT NOT NULL, key_hash TEXT UNIQUE NOT NULL,
          created_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES devices(id),
          expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS attempts (ip TEXT NOT NULL, at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS attempts_ip ON attempts(ip,at);
        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
          version INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          published_title TEXT, published_body TEXT, published_version INTEGER,
          published_at TEXT);
        ''')
    os.chmod(STATE / 'writer.sqlite3', 0o600)


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def post_dict(row):
    if row is None:
        raise Problem(404, 'Post not found.')
    data = {k: row[k] for k in ('id', 'title', 'body', 'version', 'created_at',
            'updated_at', 'published_version', 'published_at')}
    data['url'] = '/blog/p/' + row['id'] + '/' if row['published_at'] else None
    return data


def backup(destination=None):
    if destination is None:
        folder = STATE / 'backups'
        folder.mkdir(mode=0o700, exist_ok=True)
        destination = folder / (datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
                                + '-' + secrets.token_hex(4) + '.sqlite3')
    destination = Path(destination)
    with closing(connect()) as source, closing(sqlite3.connect(destination)) as target:
        source.backup(target)
        if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise RuntimeError('Backup integrity check failed')
    os.chmod(destination, 0o600)
    return destination


def create_device(label):
    key = secrets.token_urlsafe(32)
    identifier = uuid.uuid4().hex
    with closing(connect()) as c, c:
        c.execute('INSERT INTO devices(id,label,key_hash,created_at) VALUES(?,?,?,?)',
                  (identifier, label[:100], digest(key), int(time.time())))
    return identifier, ORIGIN + '/blog/write/#key=' + key


def session(environ):
    cookies = SimpleCookie()
    try:
        cookies.load(environ.get('HTTP_COOKIE', ''))
        raw = cookies[COOKIE].value if COOKIE in cookies else ''
    except Exception:
        raw = ''
    if not re.fullmatch(r'[A-Za-z0-9_-]{43}', raw):
        raise Problem(401, 'Open your private Ajew Blog Writer shortcut to sign in.')
    with closing(connect()) as c:
        row = c.execute('''SELECT s.token_hash,s.device_id FROM sessions s
            JOIN devices d ON d.id=s.device_id
            WHERE s.token_hash=? AND s.expires>? AND d.revoked=0''',
            (digest(raw), int(time.time()))).fetchone()
    if not row:
        raise Problem(401, 'Open your private Ajew Blog Writer shortcut to sign in.')
    return row


def cookie_header(token, clear=False):
    return ('Set-Cookie', f'{COOKIE}={token}; Path=/blog/write/; '
            f'Max-Age={0 if clear else SESSION_SECONDS}; Secure; HttpOnly; SameSite=Strict')


def read_payload(environ):
    if environ.get('HTTP_ORIGIN') != ORIGIN:
        raise Problem(403, 'This action must come from the blog writer.')
    if environ.get('CONTENT_TYPE', '').split(';')[0].strip() != 'application/json':
        raise Problem(415, 'JSON required.')
    try:
        length = int(environ.get('CONTENT_LENGTH') or 0)
    except ValueError:
        raise Problem(400, 'Invalid request length.')
    if not 0 < length <= MAX_REQUEST:
        raise Problem(413, 'The post is too large.')
    try:
        data = json.loads(environ['wsgi.input'].read(length))
    except (ValueError, UnicodeError):
        raise Problem(400, 'Invalid JSON.')
    if not isinstance(data, dict):
        raise Problem(400, 'A JSON object is required.')
    return data


def login(environ, data):
    key = data.get('key')
    if not isinstance(key, str) or not re.fullmatch(r'[A-Za-z0-9_-]{43}', key):
        key = ''
    ip = environ.get('HTTP_X_REAL_IP', environ.get('REMOTE_ADDR', 'unknown'))[:100]
    now = int(time.time())
    with closing(connect()) as c, c:
        c.execute('BEGIN IMMEDIATE')
        c.execute('DELETE FROM attempts WHERE at<?', (now - 3600,))
        c.execute('DELETE FROM sessions WHERE expires<=?', (now,))
        count = c.execute('SELECT count(*) FROM attempts WHERE ip=? AND at>?',
                          (ip, now - 600)).fetchone()[0]
        if count >= 15:
            raise Problem(429, 'Too many sign-in attempts. Wait ten minutes.')
        device = c.execute('SELECT id FROM devices WHERE key_hash=? AND revoked=0',
                           (digest(key),)).fetchone()
        if not device:
            c.execute('INSERT INTO attempts(ip,at) VALUES(?,?)', (ip, now))
            c.commit()
            raise Problem(401, 'That private shortcut is invalid or has been revoked.')
        token = secrets.token_urlsafe(32)
        c.execute('INSERT INTO sessions(token_hash,device_id,expires) VALUES(?,?,?)',
                  (digest(token), device['id'], now + SESSION_SECONDS))
        c.execute('DELETE FROM attempts WHERE ip=?', (ip,))
    return {'ok': True}, [cookie_header(token)]


def valid_version(data):
    value = data.get('version')
    if type(value) is not int or value < 0:
        raise Problem(400, 'A valid saved version is required.')
    return value


def save_post(data):
    identifier, title, body = data.get('id'), data.get('title'), data.get('body')
    version = valid_version(data)
    if not isinstance(identifier, str) or not POST_ID.fullmatch(identifier):
        raise Problem(400, 'Invalid post ID.')
    if not isinstance(title, str) or not title.strip() or len(title) > 300:
        raise Problem(400, 'Enter a title of up to 300 characters.')
    if not isinstance(body, str) or not body.strip() or len(body) > 200000:
        raise Problem(400, 'Enter a post of up to 200,000 characters.')
    if any(ord(char) < 32 and char not in '\n\r\t' for char in title + body):
        raise Problem(400, 'Unsupported control character.')
    stamp = now_iso()
    with closing(connect()) as c, c:
        c.execute('BEGIN IMMEDIATE')
        old = c.execute('SELECT * FROM posts WHERE id=?', (identifier,)).fetchone()
        if old:
            # Idempotent retry: do not create revisions on identical input.
            if old['title'] == title and old['body'] == body and version <= old['version']:
                return post_dict(old)
            if old['version'] != version:
                raise Problem(409, 'This post changed in another tab. Your text is still here; reopen the saved post before replacing it.')
            c.execute('UPDATE posts SET title=?,body=?,version=version+1,updated_at=? WHERE id=?',
                      (title, body, stamp, identifier))
        else:
            if version != 0:
                raise Problem(409, 'This draft no longer exists. Save it as a new post.')
            c.execute('''INSERT INTO posts(id,title,body,version,created_at,updated_at)
                         VALUES(?,?,?,1,?,?)''', (identifier, title, body, stamp, stamp))
        return post_dict(c.execute('SELECT * FROM posts WHERE id=?', (identifier,)).fetchone())


def publish_post(identifier, data):
    version = valid_version(data)
    backup()  # Fail closed if a durable pre-publication snapshot cannot be made.
    with closing(connect()) as c, c:
        c.execute('BEGIN IMMEDIATE')
        old = c.execute('SELECT * FROM posts WHERE id=?', (identifier,)).fetchone()
        if not old:
            raise Problem(404, 'Post not found.')
        if old['version'] != version:
            raise Problem(409, 'The saved draft changed. Review it before publishing.')
        if old['published_version'] != version:
            c.execute('''UPDATE posts SET published_title=title,published_body=body,
                published_version=version,published_at=coalesce(published_at,?) WHERE id=?''',
                (now_iso(), identifier))
        return post_dict(c.execute('SELECT * FROM posts WHERE id=?', (identifier,)).fetchone())


def published_posts():
    with closing(connect()) as c:
        return c.execute('SELECT * FROM posts WHERE published_at IS NOT NULL ORDER BY published_at DESC,id DESC').fetchall()


def body_html(body):
    parts = re.split(r'\n\s*\n', body.replace('\r\n', '\n').replace('\r', '\n'))
    return '\n'.join('<p dir="auto" class="' + ('hebrew-section' if re.search(r'[\u0590-\u05ff]', p) else 'english-section')
                     + '">' + html.escape(p).replace('\n', '<br>') + '</p>' for p in parts if p.strip())


def share(row):
    url = ORIGIN + '/blog/p/' + row['id'] + '/'
    title = row['published_title']
    return ('<div class="share-row" aria-label="Share post"><span>Share:</span> '
            '<a target="_blank" rel="noopener" href="https://wa.me/?text=' + quote(title + ' ' + url) + '">WhatsApp</a> '
            '<a target="_blank" rel="noopener" href="https://t.me/share/url?url=' + quote(url, safe='')
            + '&amp;text=' + quote(title) + '">Telegram</a> '
            '<button type="button" data-copy-link="' + html.escape(url, quote=True) + '">Copy link</button></div>')


def published_date(row):
    return datetime.fromisoformat(row['published_at']).strftime('%B %d, %Y')


def post_card(row):
    return ('<article class="post-item full-post-card" data-writer-post="' + row['id'] + '">'
            '<header class="post-list-header"><time datetime="' + row['published_at'] + '">' + published_date(row)
            + '</time><h2 dir="auto"><a href="/blog/p/' + row['id'] + '/">' + html.escape(row['published_title'])
            + '</a></h2></header><div class="post-body-preview">' + body_html(row['published_body'])
            + '</div>' + share(row) + '</article>')


def blog_index():
    # Preserve the complete legacy page, including all full post bodies.
    old = (LEGACY / 'index.html').read_text(encoding='utf-8')
    marker = '<main class="blog-posts">'
    if old.count(marker) != 1:
        raise Problem(503, 'Blog index layout changed. Please use the archive.')
    rendered = old.replace(marker, marker + '\n' + '\n'.join(post_card(p) for p in published_posts()), 1)
    rendered = rendered.replace('<nav class="blog-nav">', '<nav class="blog-nav"><a href="/blog/write/">Write a post</a>', 1)
    return rendered.replace('</body>', '<script defer src="/blog/write/share.js"></script></body>', 1)


def public_post(identifier):
    with closing(connect()) as c:
        row = c.execute('SELECT * FROM posts WHERE id=? AND published_at IS NOT NULL', (identifier,)).fetchone()
    if not row:
        raise Problem(404, 'Post not found.')
    title = html.escape(row['published_title'])
    url = ORIGIN + '/blog/p/' + identifier + '/'
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>' + title + ' — Na Nach Blog</title><link rel="canonical" href="' + url + '">'
            '<link rel="icon" href="/favicon.png"><link rel="stylesheet" href="/blog/style.css?v=20260823e">'
            '<script defer src="/blog/write/share.js"></script></head><body><div class="blog-container">'
            '<header class="blog-header post-page-header"><a href="/blog/" class="back-link">← All Posts</a>'
            '<h1 dir="auto">' + title + '</h1><time datetime="' + row['published_at'] + '">' + published_date(row)
            + '</time>' + share(row) + '</header><article class="blog-post post-card">'
            + body_html(row['published_body']) + '</article><footer class="blog-footer">'
            '<p dir="rtl">נ נח נחמ נחמן מאומן</p><a href="/">ajew.org</a></footer></div></body></html>')


def rss():
    root = ET.fromstring((LEGACY / 'rss.xml').read_text(encoding='utf-8'))
    channel = root.find('channel')
    if channel is None:
        raise Problem(503, 'Legacy feed unavailable.')
    old = list(channel.findall('item'))
    for item in old:
        channel.remove(item)
    new = []
    for row in published_posts():
        item = ET.Element('item')
        values = {'title': row['published_title'], 'link': ORIGIN + '/blog/p/' + row['id'] + '/',
                  'guid': ORIGIN + '/blog/p/' + row['id'] + '/',
                  'pubDate': format_datetime(datetime.fromisoformat(row['published_at'])),
                  'description': row['published_body'][:420]}
        for key, value in values.items():
            ET.SubElement(item, key).text = value
        new.append(item)
    for item in (new + old)[:20]:
        channel.append(item)
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)


def dispatch(environ):
    method, path = environ.get('REQUEST_METHOD', 'GET'), environ.get('PATH_INFO', '/')
    if method in ('GET', 'HEAD'):
        if path == '/blog/write/health':
            with closing(connect()) as c:
                c.execute('SELECT 1 FROM posts LIMIT 1').fetchone()
            return 200, {'ok': True}, 'application/json', []
        assets = {'/blog/write/': ('index.html', 'text/html'),
                  '/blog/write/writer.js': ('writer.js', 'application/javascript'),
                  '/blog/write/writer.css': ('writer.css', 'text/css'),
                  '/blog/write/share.js': ('share.js', 'application/javascript')}
        if path in assets:
            filename, kind = assets[path]
            return 200, (STATIC / filename).read_bytes(), kind, []
        if path in ('/blog', '/blog/'):
            return 200, blog_index(), 'text/html', []
        if path == '/blog/rss.xml':
            return 200, rss(), 'application/rss+xml', []
        match = re.fullmatch(r'/blog/p/([a-f0-9]{32})/?', path)
        if match:
            return 200, public_post(match[1]), 'text/html', []
    if not path.startswith('/blog/write/api/'):
        raise Problem(404, 'Not found.')
    if path == '/blog/write/api/login' and method == 'POST':
        result, headers = login(environ, read_payload(environ))
        return 200, result, 'application/json', headers
    identity = session(environ)
    if path == '/blog/write/api/session' and method == 'GET':
        return 200, {'authenticated': True}, 'application/json', []
    if path == '/blog/write/api/posts' and method == 'GET':
        with closing(connect()) as c:
            result = [post_dict(r) for r in c.execute('SELECT * FROM posts ORDER BY updated_at DESC,id DESC')]
        return 200, {'posts': result}, 'application/json', []
    match = re.fullmatch(r'/blog/write/api/posts/([a-f0-9]{32})(/publish)?', path)
    if match and not match[2] and method == 'GET':
        with closing(connect()) as c:
            post = post_dict(c.execute('SELECT * FROM posts WHERE id=?', (match[1],)).fetchone())
        return 200, {'post': post}, 'application/json', []
    if method not in ('POST', 'DELETE'):
        raise Problem(405, 'Method not allowed.')
    data = read_payload(environ)
    if path == '/blog/write/api/logout' and method == 'POST':
        with closing(connect()) as c, c:
            c.execute('DELETE FROM sessions WHERE token_hash=?', (identity['token_hash'],))
        return 200, {'ok': True}, 'application/json', [cookie_header('', clear=True)]
    if path == '/blog/write/api/posts' and method == 'POST':
        return 200, {'post': save_post(data)}, 'application/json', []
    if match and match[2] and method == 'POST':
        post = publish_post(match[1], data)
        return 200, {'post': post, 'url': post['url']}, 'application/json', []
    if match and not match[2] and method == 'DELETE':
        version = valid_version(data)
        with closing(connect()) as c, c:
            c.execute('BEGIN IMMEDIATE')
            row = c.execute('SELECT * FROM posts WHERE id=?', (match[1],)).fetchone()
            if not row:
                raise Problem(404, 'Post not found.')
            if row['published_at']:
                raise Problem(409, 'Published posts cannot be deleted here.')
            if row['version'] != version:
                raise Problem(409, 'The draft changed. Reopen it before deleting.')
            c.execute('DELETE FROM posts WHERE id=?', (match[1],))
        return 200, {'ok': True}, 'application/json', []
    raise Problem(404, 'Not found.')


def application(environ, start_response):
    try:
        status, value, kind, extras = dispatch(environ)
    except Problem as error:
        status, value, kind, extras = error.status, {'error': error.message}, 'application/json', []
    except Exception:
        traceback.print_exc()  # Never logs request bodies, cookies or private links.
        status, value, kind, extras = 503, {'error': 'The writer could not complete this action. Your saved drafts are safe; try again.'}, 'application/json', []
    if isinstance(value, dict):
        value = json.dumps(value, ensure_ascii=False)
    body = value.encode('utf-8') if isinstance(value, str) else value
    headers = [('Content-Type', kind + '; charset=utf-8'), ('Content-Length', str(len(body))),
               ('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'),
               ('Referrer-Policy', 'no-referrer'), ('X-Frame-Options', 'DENY')]
    if environ.get('PATH_INFO', '').startswith('/blog/write/'):
        headers += [('X-Robots-Tag', 'noindex, nofollow'), ('Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
            "connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")]
    start_response(str(status) + ' ' + HTTPStatus(status).phrase, headers + extras)
    return [b'' if environ.get('REQUEST_METHOD') == 'HEAD' else body]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    create = sub.add_parser('create-link'); create.add_argument('label')
    revoke = sub.add_parser('revoke'); revoke.add_argument('id')
    copy = sub.add_parser('backup'); copy.add_argument('path')
    sub.add_parser('init')
    args = parser.parse_args()
    initialize()
    if args.command == 'create-link':
        identifier, url = create_device(args.label)
        print(json.dumps({'device_id': identifier, 'private_url': url}))
    elif args.command == 'revoke':
        with closing(connect()) as c, c:
            c.execute('UPDATE devices SET revoked=1 WHERE id=?', (args.id,))
            c.execute('DELETE FROM sessions WHERE device_id=?', (args.id,))
        print('Device revoked.')
    elif args.command == 'backup':
        backup(args.path)
        print('Backup integrity verified.')
