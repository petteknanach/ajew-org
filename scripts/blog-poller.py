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
    
    # Format body: convert double newlines to paragraphs
    paragraphs = [p.strip() for p in body.split('\n\n') if p.strip()]
    body_html = '\n'.join(f'      <p>{p}</p>' for p in paragraphs)
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject} — Na Nach Blog</title>
<link rel="stylesheet" href="/blog/style.css">
</head>
<body>
  <div class="blog-container">
    <header class="blog-header">
      <a href="/blog" class="back-link">← All Posts</a>
      <h1>{subject}</h1>
      <time datetime="{date_str}">{date_str}</time>
    </header>
    <article class="blog-post">
{body_html}
    </article>
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
    return filename

def rebuild_index():
    """Rebuild blog index page from all post files."""
    posts = []
    for f in sorted(os.listdir(BLOG_DIR), reverse=True):
        if f.endswith('.html'):
            # Extract title from file
            filepath = os.path.join(BLOG_DIR, f)
            with open(filepath, 'r', encoding='utf-8') as fh:
                content = fh.read()
                title_m = re.search(r'<title>(.*?)</title>', content)
                date_m = re.search(r'<time datetime="(.*?)"', content)
                title = title_m.group(1) if title_m else f.replace('.html', '')
                date_str = date_m.group(1) if date_m else ''
            
            # Format date nicely
            try:
                date_obj = datetime.fromisoformat(date_str)
                display_date = date_obj.strftime('%B %d, %Y')
            except:
                display_date = date_str
            
            posts.append({
                'filename': f,
                'title': title.replace(' — Na Nach Blog', ''),
                'date': display_date,
                'date_iso': date_str,
                'url': f'{BLOG_URL_BASE}/{f}'
            })
    
    # Generate index
    post_items = []
    for p in posts:
        post_items.append(f"""    <article class="post-item">
      <time datetime="{p['date_iso']}">{p['date']}</time>
      <h2><a href="/blog/{p['filename']}">{p['title']}</a></h2>
    </article>""")
    
    index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Na Nach Blog — Thoughts & Teachings</title>
<link rel="stylesheet" href="/blog/style.css">
<link rel="alternate" type="application/rss+xml" title="Na Nach Blog RSS" href="/blog/rss.xml">
</head>
<body>
  <div class="blog-container">
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
    
    # Also generate RSS
    rss_items = []
    for p in posts[:20]:
        rss_items.append(f"""    <item>
      <title>{p['title']}</title>
      <link>{p['url']}</link>
      <pubDate>{p['date_iso']}</pubDate>
      <guid>{p['url']}</guid>
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
