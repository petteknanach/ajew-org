#!/usr/bin/env python3
"""
Email-to-Blog poller for ajew.org
Polls naanaach@gmail.com inbox for blog posts.
Usage: python3 blog-poller.py
Runs on VPS via cron every 10 minutes.
"""

import imaplib
import email
import email.utils
import json
import os
import re
import time
import html as html_escape
from datetime import datetime
from email.header import decode_header
from pathlib import Path

# === CONFIGURATION ===
GMAIL_USER = "naanaach@gmail.com"
# App password loaded from file (not stored in script)
CRED_FILE = "/opt/ajew-blog/.gmail_app_password"
BLOG_DIR = "/opt/ajew-blog/posts"
INDEX_FILE = "/opt/ajew-blog/index.html"
STATE_FILE = "/opt/ajew-blog/.last_uid"
BLOG_URL_BASE = "https://ajew.org/blog"

os.makedirs(BLOG_DIR, exist_ok=True)

def get_password():
    with open(CRED_FILE) as f:
        return f.read().strip()

def decode_header_safe(h):
    if h is None:
        return ""
    parts = decode_header(h)
    result = []
    for text, charset in parts:
        if isinstance(text, bytes):
            try:
                result.append(text.decode(charset or 'utf-8', errors='replace'))
            except:
                result.append(text.decode('utf-8', errors='replace'))
        else:
            result.append(str(text))
    return ' '.join(result)

def extract_body(msg):
    """Extract plain text body from email message."""
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or 'utf-8'
                    return payload.decode(charset, errors='replace')
        # Fallback: try HTML
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or 'utf-8'
                    html = payload.decode(charset, errors='replace')
                    # Strip HTML tags
                    return re.sub(r'<[^>]+>', '', html)
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or 'utf-8'
            return payload.decode(charset, errors='replace')
    return ""

def clean_title_for_display(title):
    return title.replace(' — Na Nach Blog', '').strip()

def split_paragraphs(text):
    text = (text or '').replace('\r\n', '\n').replace('\r', '\n').strip()
    return [p.strip() for p in re.split(r'\n\s*\n+', text) if p.strip()]

def format_body_html(body, indent='      '):
    """Convert plain text to safe, readable HTML paragraphs."""
    parts = []
    for p in split_paragraphs(body):
        escaped = html_escape.escape(p)
        escaped = escaped.replace('\n', '<br>')
        direction = 'rtl' if re.search(r'[\u0590-\u05ff]', p) else 'ltr'
        cls = 'hebrew-section' if direction == 'rtl' else 'english-section'
        parts.append(f'{indent}<p class="{cls}" dir="{direction}">{escaped}</p>')
    return '\n'.join(parts)

def extract_article_body(content):
    # Match <article class="blog-post ...">, not only exactly class="blog-post".
    # Older index builds accidentally embedded whole pages because post pages use
    # class="blog-post post-card".
    m = re.search(r'<article[^>]*class="[^"]*\bblog-post\b[^"]*"[^>]*>(.*?)</article>', content, re.S | re.I)
    return m.group(1).strip() if m else ''

def plain_summary(article_html, limit=420):
    text = re.sub(r'<br\s*/?>', ' ', article_html, flags=re.I)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html_escape.unescape(re.sub(r'\s+', ' ', text)).strip()
    if len(text) > limit:
        text = text[:limit].rsplit(' ', 1)[0].rstrip() + '…'
    return text

def share_block(url, title):
    encoded_url = html_escape.escape(url, quote=True)
    encoded_title = html_escape.escape(title, quote=True)
    return f'''<div class="share-row" aria-label="Share post">
        <span>Share:</span>
        <a href="https://wa.me/?text={encoded_title}%20{encoded_url}" target="_blank" rel="noopener">WhatsApp</a>
        <a href="https://t.me/share/url?url={encoded_url}&text={encoded_title}" target="_blank" rel="noopener">Telegram</a>
        <button type="button" onclick="navigator.clipboard&&navigator.clipboard.writeText('{encoded_url}')">Copy link</button>
      </div>'''

def favicon_links():
    return '''<link rel="icon" type="image/png" sizes="512x512" href="/favicon.png?v=nanach-petek-20260707">
<link rel="icon" type="image/x-icon" href="/favicon.ico?v=nanach-petek-20260707">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=nanach-petek-20260707">'''

def comments_block(post_id):
    post_id_html = html_escape.escape(post_id, quote=True)
    return f'''    <section class="comments-card" data-blog-comments data-post-id="{post_id_html}">
      <h2>Comments</h2>
      <p class="comments-muted">Add a comment on this teaching. Comments appear publicly after posting.</p>
      <form class="comment-form">
        <input name="name" maxlength="60" placeholder="Your name" autocomplete="name">
        <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <textarea name="comment" maxlength="1500" required placeholder="Write a comment…"></textarea>
        <button type="submit">Post comment</button>
        <div class="comments-status" role="status" aria-live="polite"></div>
      </form>
      <div class="comments-list"></div>
    </section>'''

def slugify(title):
    """Create URL-friendly slug from title."""
    slug = re.sub(r'[^\w\s-]', '', title.lower())
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug[:80].strip('-')

def create_blog_post(subject, body, date_str):
    """Create a static HTML blog post file."""
    slug = slugify(subject)
    timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    filename = f"{timestamp}-{slug}.html"
    
    # Format body: convert paragraphs safely and preserve line breaks
    body_html = format_body_html(body)
    subject_html = html_escape.escape(subject)
    post_url = f"{BLOG_URL_BASE}/{filename}"
    share_html = share_block(post_url, subject)
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject_html} — Na Nach Blog</title>
{favicon_links()}
<link rel="stylesheet" href="/blog/style.css?v=20260707">
<script defer src="/blog/comments.js?v=20260707b"></script>
</head>
<body>
  <div class="blog-container">
    <header class="blog-header post-page-header">
      <a href="/blog" class="back-link">← All Posts</a>
      <h1>{subject_html}</h1>
      <time datetime="{date_str}">{date_str}</time>
      {share_html}
    </header>
    <article class="blog-post post-card">
{body_html}
    </article>
{comments_block(filename.replace('.html',''))}
    <footer class="blog-footer">
      <p>נ נח נחמ נחמן מאומן</p>
      <p><a href="/blog">Na Nach Blog</a> · <a href="/">ajew.org</a></p>
    </footer>
  </div>
</body>
</html>"""
    
    filepath = os.path.join(BLOG_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html)

    # nginx serves /blog/<filename> from /opt/ajew-blog/<filename>, while
    # rebuild_index() scans BLOG_DIR (/opt/ajew-blog/posts). Keep both copies
    # so new email-generated posts are reachable from the links the index emits.
    public_path = os.path.join(os.path.dirname(BLOG_DIR), filename)
    if public_path != filepath:
        with open(public_path, 'w', encoding='utf-8') as f:
            f.write(html)
    return filename

def rebuild_index():
    """Rebuild blog index page from all post files, showing full posts with share links."""
    posts = []
    for f in sorted(os.listdir(BLOG_DIR), reverse=True):
        if f.endswith('.html') and f != 'index.html':
            filepath = os.path.join(BLOG_DIR, f)
            with open(filepath, 'r', encoding='utf-8') as fh:
                content = fh.read()
                title_m = re.search(r'<title>(.*?)</title>', content)
                date_m = re.search(r'<time datetime="(.*?)"', content)
                title = clean_title_for_display(html_escape.unescape(title_m.group(1))) if title_m else f.replace('.html', '')
                date_str = date_m.group(1) if date_m else ''
                article_html = extract_article_body(content)
                if not article_html:
                    body_m = re.search(r'<body[^>]*>(.*?)</body>', content, re.S | re.I)
                    article_html = body_m.group(1).strip() if body_m else ''
            try:
                date_obj = email.utils.parsedate_to_datetime(date_str)
                display_date = date_obj.strftime('%B %d, %Y')
            except Exception:
                try:
                    date_obj = datetime.fromisoformat(date_str)
                    display_date = date_obj.strftime('%B %d, %Y')
                except Exception:
                    display_date = date_str
            url = f'{BLOG_URL_BASE}/{f}'
            posts.append({
                'filename': f,
                'title': title,
                'title_html': html_escape.escape(title),
                'date': display_date,
                'date_iso': html_escape.escape(date_str, quote=True),
                'url': url,
                'article_html': article_html,
                'summary': plain_summary(article_html)
            })

    post_items = []
    for p in posts:
        post_items.append(f"""    <article class="post-item full-post-card">
      <header class="post-list-header">
        <time datetime="{p['date_iso']}">{p['date']}</time>
        <h2><a href="/blog/{p['filename']}">{p['title_html']}</a></h2>
      </header>
      <div class="post-body-preview">
{p['article_html']}
      </div>
      {share_block(p['url'], p['title'])}
    </article>""")

    index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Na Nach Blog — Thoughts & Teachings</title>
{favicon_links()}
<link rel="stylesheet" href="/blog/style.css?v=20260707">
<link rel="alternate" type="application/rss+xml" title="Na Nach Blog RSS" href="/blog/rss.xml">
</head>
<body>
  <div class="blog-container blog-index-container">
    <header class="blog-header">
      <div class="blog-banner">
        <h1>Na Nach Blog</h1>
        <p class="blog-subtitle">Thoughts, Teachings & Insights</p>
        <p class="nanach">נ נח נחמ נחמן מאומן</p>
      </div>
      <nav class="blog-nav">
        <a href="/">← ajew.org</a>
        <a href="https://naanaach.blogspot.com" target="_blank" rel="noopener">Blogger Archives ↗</a>
        <a href="/blog/rss.xml" class="rss-link">RSS</a>
      </nav>
    </header>
    <main class="blog-posts">
{chr(10).join(post_items)}
    </main>
    <footer class="blog-footer">
      <p>נ נח נחמ נחמן מאומן</p>
      <p><a href="/">ajew.org</a> · <a href="https://naanaach.blogspot.com" target="_blank" rel="noopener">Blogger Archives</a></p>
    </footer>
  </div>
</body>
</html>"""

    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(index_html)

    rss_items = []
    for p in posts[:20]:
        rss_items.append(f"""    <item>
      <title>{html_escape.escape(p['title'])}</title>
      <link>{p['url']}</link>
      <pubDate>{p['date_iso']}</pubDate>
      <guid>{p['url']}</guid>
      <description>{html_escape.escape(p['summary'])}</description>
    </item>""")

    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Na Nach Blog</title>
  <link>https://ajew.org/blog</link>
  <description>Thoughts, Teachings &amp; Insights — נ נח נחמ נחמן מאומן</description>
  <language>en</language>
{chr(10).join(rss_items)}
</channel>
</rss>"""

    with open(os.path.join(os.path.dirname(INDEX_FILE), 'rss.xml'), 'w', encoding='utf-8') as f:
        f.write(rss)

    print(f"  Index rebuilt: {len(posts)} posts")

def main():
    password = get_password()
    
    # Connect to Gmail IMAP
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(GMAIL_USER, password)
    mail.select("INBOX")
    
    # Search for unread emails FROM naanaach@gmail.com
    # User sends blog posts TO themselves
    status, messages = mail.search(None, 
        '(UNSEEN FROM "naanaach@gmail.com" TO "naanaach@gmail.com")')
    
    if status != "OK":
        print("No matching emails found")
        mail.logout()
        return
    
    msg_ids = messages[0].split()
    if not msg_ids:
        print("No new blog emails")
        mail.logout()
        return
    
    print(f"Found {len(msg_ids)} new blog email(s)")
    
    new_posts = 0
    for msg_id in msg_ids:
        status, msg_data = mail.fetch(msg_id, "(RFC822)")
        if status != "OK":
            continue
        
        raw_email = msg_data[0][1]
        msg = email.message_from_bytes(raw_email)
        
        subject = decode_header_safe(msg["Subject"])
        date_str = msg.get("Date", "")
        
        # Skip if no subject
        if not subject.strip():
            continue
        
        body = extract_body(msg)
        
        # Remove quoted reply text (everything after common quote markers)
        body = re.split(r'\n>|\nOn .* wrote:', body)[0].strip()
        
        if not body.strip():
            continue
        
        filename = create_blog_post(subject, body, date_str)
        new_posts += 1
        print(f"  Created: {filename}")
        print(f"    Title: {subject[:80]}")
        
        # Mark as read
        mail.store(msg_id, '+FLAGS', '\\Seen')
    
    if new_posts > 0:
        rebuild_index()
    
    mail.logout()
    print(f"Done: {new_posts} new posts")

if __name__ == '__main__':
    main()
