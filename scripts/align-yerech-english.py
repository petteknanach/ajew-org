#!/usr/bin/env python3
"""Align Yerech HaAisunim English from Finished HTML to JSON segments.
The HTML is one big file with 163 paragraphs across 24 sections.
Matches by finding section markers (Siman N) in HTML and mapping to JSON."""

import os, re, json

HTML_PATH = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Yerech HaAisunim/Yerech_HaAisonim_COMPLETE.html'
JSON_DIR = '/root/ajew-org/public/reader/yereach-haeitanim/'

# Load HTML and extract paragraphs grouped by section
with open(HTML_PATH, 'r', encoding='utf-8', errors='replace') as f:
    html = f.read()

# Strategy: use the H2/H3 headers to find section boundaries
# Each section: Siman N — Title ... followed by paragraphs until next Siman

# Find all header positions
header_matches = list(re.finditer(r'<h[23][^>]*>(?:Siman\s+(\d+)|The Introduction \(Hakdoma\)|The Book.s Preface).*?</h[23]>', html))

section_paragraphs = {}
current_section = 0  # 0 = preface, 1 = intro, 2+ = simanim

# Get all paragraph text
all_paras = re.findall(r'<p[^>]*>(.*?)</p>', html, re.DOTALL)
all_paras = [re.sub(r'<[^>]+>', '', p).strip() for p in all_paras]
all_paras = [p for p in all_paras if len(p) > 20]

# Map sections: the HTML has 24 simanim + intro = 25 sections
# JSON: section-1 = intro, section-2 = siman 1, ..., section-24 = siman 23
# Count simanim: 23 simanim + intro + preface = 25 sections, but JSON has 24

# Simpler approach: try sequential matching
# For each JSON section, take sequential chunks of HTML paragraphs
# and match by first English occurrence

print("=== Loading JSON sections ===")
sections = {}
for f in sorted(os.listdir(JSON_DIR)):
    if not f.startswith('section-') or not f.endswith('.json'):
        continue
    num = int(re.match(r'section-(\d+)', f).group(1))
    with open(os.path.join(JSON_DIR, f), 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    sections[num] = data

# Build English mapping: find the English text for each section's first segment
# Then find that text in the HTML paragraphs
print(f"\n=== Matching {len(all_paras)} HTML paragraphs to {len(sections)} sections ===")

# Strategy: sequential assignment
# Each section's segments should match consecutive HTML paragraphs
# Use the section boundaries from the HTML to split

# Find section boundaries by looking for h2/h3 headers
body_start = html.find('<body')
body = html[body_start:] if body_start >= 0 else html

# Split by h2/h3 headers that contain Siman or Introduction/Preface
chunks = re.split(r'(<h[23][^>]*>(?:Siman\s+\d+|The Introduction|The Book.s Preface)[^<]*</h[23]>)', body)
# chunks[0] = before first header, then alternating header/content

section_chunks = []
current_header = None
for chunk in chunks:
    if re.match(r'<h[23]', chunk):
        current_header = re.sub(r'<[^>]+>', '', chunk).strip()
    elif current_header:
        # Extract paragraphs from this chunk
        paras = re.findall(r'<p[^>]*>(.*?)</p>', chunk, re.DOTALL)
        paras = [re.sub(r'<[^>]+>', '', p).strip() for p in paras]
        paras = [p for p in paras if len(p) > 20]
        if paras:
            section_chunks.append((current_header, paras))

print(f"Found {len(section_chunks)} section chunks in HTML")

# Map HTML chunks to JSON sections
# JSON section-1 = Introduction/Hakdoma
# JSON section-2+ = Siman 1+
# But HTML might have different count — chapters might be grouped

# Fallback: direct sequential matching
# Take all paragraphs from HTML, assign sequentially to JSON segments
all_english = []
for header, paras in section_chunks:
    for p in paras:
        all_english.append(p)

print(f"Total English paragraphs: {len(all_english)}")

# Now match sequentially to JSON segments that have Hebrew but no English
updated = 0
en_added = 0

for section_num in sorted(sections.keys()):
    data = sections[section_num]
    segs = data.get('segments', [])
    segs_updated = 0
    
    for seg in segs:
        if not (seg.get('he', '') or '').strip():
            continue
        if (seg.get('en', '') or '').strip():
            continue  # already has English
        
        idx = seg.get('index', 0) - 1  # 0-based
        if idx < len(all_english):
            seg['en'] = all_english[idx]
            segs_updated += 1
            en_added += 1
    
    if segs_updated > 0:
        data['hasEnglish'] = True
        fp = os.path.join(JSON_DIR, f'section-{section_num}.json')
        with open(fp, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        updated += 1
        title_preview = data.get("title", "")[:40]
        print(f'  FIXED section-{section_num}: {segs_updated} EN ({title_preview})')

print(f'\nDone: {updated} sections, {en_added} English segments added')
