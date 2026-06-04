#!/usr/bin/env python3
"""
Build comprehensive Torah GPS index — all 30K+ teachings across 252 books.
Matches teachings to 30 topics using Hebrew + English keyword matching.
"""

import json, gzip, re, os
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]

TOPICS = json.load(open(ROOT / 'public/data/torah-gps-topics.json'))

# Load all documents from the light search index
print("Loading search index...")
he_idx = json.load(gzip.open(ROOT / 'public/data/light-search-index-he.json.gz', 'rt'))
en_idx = json.load(gzip.open(ROOT / 'public/data/light-search-index-en.json.gz', 'rt'))
print(f"Loaded {len(he_idx)} documents")

# Build topic -> teachings mapping
topic_teachings = defaultdict(list)
topic_meta = {}

for tid, tdef in TOPICS.items():
    print(f"Processing: {tid} ({tdef['en']})...")
    
    he_kw = [kw.lower() for kw in tdef['keywords_he']]
    en_kw = [kw.lower() for kw in tdef['keywords_en']]
    
    matches = []
    seen_urls = set()
    
    for i, doc in enumerate(he_idx):
        # Get Hebrew content from HE index, English from EN index
        he_text = (doc.get('x', '') or '').lower()
        en_text = (en_idx[i].get('x', '') or '').lower() if i < len(en_idx) else ''
        
        # Score: count keyword matches in both languages
        he_score = sum(1 for kw in he_kw if kw in he_text)
        en_score = sum(1 for kw in en_kw if kw in en_text)
        total_score = he_score + (en_score * 1.5)  # English weighted slightly higher
        
        if total_score >= 1:
            url = doc.get('l', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                
                # Get snippet
                snippet_he = he_text[:250] if he_text else ''
                snippet_en = en_text[:300] if en_text else ''
                
                matches.append({
                    'book': doc.get('b', ''),
                    'title': doc.get('t', '') or doc.get('h', ''),
                    'hebrewTitle': doc.get('h', ''),
                    'url': url,
                    'he': snippet_he,
                    'en': snippet_en,
                    'score': total_score,
                })
    
    # Sort by score, take top 100 per topic
    matches.sort(key=lambda x: x['score'], reverse=True)
    top_matches = matches[:100]
    
    topic_teachings[tid] = top_matches
    topic_meta[tid] = {
        'en': tdef['en'],
        'he': tdef['he'],
        'total': len(matches),
        'shown': len(top_matches),
        'keywords_en': tdef['keywords_en'][:5],
        'keywords_he': tdef['keywords_he'][:5],
    }
    
    # Count unique books
    books = set(m['book'] for m in top_matches)
    print(f"  {len(matches)} total matches, showing top {len(top_matches)} from {len(books)} books")
    for b in sorted(books)[:5]:
        count = sum(1 for m in top_matches if m['book'] == b)
        print(f"    {b}: {count}")

# Build output
output = {
    'version': 2,
    'generated': '2026-06-03',
    'topicCount': len(TOPICS),
    'totalTeachings': sum(len(v) for v in topic_teachings.values()),
    'booksCovered': len(set(m['book'] for v in topic_teachings.values() for m in v)),
    'topics': dict(topic_teachings),
    'topicMeta': topic_meta,
}

# Save
out_path = ROOT / 'public/data/torah-gps-index-v2.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False)

size_mb = os.path.getsize(out_path) / (1024*1024)
print(f"\nSaved: {out_path} ({size_mb:.1f} MB)")
print(f"Topics: {len(TOPICS)}")
print(f"Total teachings: {output['totalTeachings']}")
print(f"Books covered: {output['booksCovered']}")
