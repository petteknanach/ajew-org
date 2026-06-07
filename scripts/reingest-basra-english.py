#!/usr/bin/env python3
"""Re-ingest Likutay Eitzos Basra English from Finished HTML source files.
Handles multi-chapter HTML files. Matches English to Hebrew by siman number.
Adds data-share-id anchors for permalink sharing."""

import os, re, json

FOLDER = '/mnt/c/Users/Pettek/Documents/Claude Desktop projects/Finished/Likutay Aitzos Mahadura Basra/'
JSON_DIR = '/root/ajew-org/public/reader/likutay-eitzos-basra/'

HEB_MAP = {'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
           'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,
           'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400}

def heb_to_int(s):
    total = 0
    for ch in s:
        total += HEB_MAP.get(ch, 0)
    return total

def extract_all_teachings(html):
    """Extract {hebrew_chapter_title: {teaching_num: english_text}}"""
    result = {}
    
    positions = [m.start() for m in re.finditer(r'<div class="chapter-title-block"', html)]
    body_end = html.find('</body>')
    if body_end < 0: body_end = len(html)
    positions.append(body_end)
    
    for i in range(len(positions) - 1):
        chunk = html[positions[i]:positions[i+1]]
        heb_m = re.search(r'<div class="heb-chapter">(.*?)</div>', chunk)
        if not heb_m:
            continue
        
        heb_title = heb_m.group(1).strip()
        teachings = {}
        for m in re.finditer(
            r'<div class="teaching">\s*<span class="teaching-num">(\d+)\.</span>\s*<div class="teaching-body">(.*?)</div>\s*</div>',
            chunk, re.DOTALL
        ):
            num = int(m.group(1))
            body = m.group(2)
            clean = re.sub(r'<br\s*/?>', '\n', body)
            clean = re.sub(r'<[^>]+>', '', clean)
            clean = re.sub(r'\s+', ' ', clean).strip()
            teachings[num] = clean
        
        if teachings:
            if heb_title in result:
                result[heb_title].update(teachings)
            else:
                result[heb_title] = teachings
    
    return result

# Load all HTML
print("=== Loading HTML sources ===")
all_html = {}
for f in sorted(os.listdir(FOLDER)):
    if not f.endswith('.html'): continue
    with open(os.path.join(FOLDER, f), 'r', encoding='utf-8', errors='replace') as fh:
        html = fh.read()
    teachings = extract_all_teachings(html)
    for ht, t in teachings.items():
        if ht in all_html:
            all_html[ht].update(t)
        else:
            all_html[ht] = t
        print(f'  {ht}: {len(t)} teachings')

print(f'\nTotal chapters: {len(all_html)}')

# Process JSON files
print("\n=== Re-ingesting ===")
updated = 0
skipped = 0
share_ids = 0
en_fixes = 0

for topic_f in sorted(os.listdir(JSON_DIR)):
    if not topic_f.startswith('topic-') or not topic_f.endswith('.json'):
        continue
    
    fp = os.path.join(JSON_DIR, topic_f)
    with open(fp, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    heb_title = data.get('hebrewTitle', '') or data.get('title', '')
    topic_num = int(re.match(r'topic-(\d+)', topic_f).group(1))
    segs = data.get('segments', [])
    
    # Match by stripping all diacritics and punctuation
    matching = None
    ht_clean = re.sub(r'[\s\u0591-\u05C7\-–—,\.;:!?\(\)\[\]\"\'/]+', '', heb_title)
    for ht, teachings in all_html.items():
        ht_c = re.sub(r'[\s\u0591-\u05C7\-–—,\.;:!?\(\)\[\]\"\'/]+', '', ht)
        if ht_clean == ht_c:
            matching = teachings
            break
        # Partial match for titles with extra text
        if len(ht_clean) >= 3 and (ht_clean.startswith(ht_c) or ht_c.startswith(ht_clean)):
            matching = teachings
            break
    
    if not matching:
        skipped += 1
        print(f'  SKIP topic-{topic_num}: no HTML for "{heb_title[:50]}"')
        continue
    
    segs_updated = 0
    for seg in segs:
        he = (seg.get('he', '') or '').strip()
        if not he:
            continue
        
        siman_m = re.match(r'([\u0590-\u05FF]{1,3})[\.\)]', he)
        if not siman_m:
            continue
        
        siman = siman_m.group(1)
        siman_num = heb_to_int(siman)
        
        # Share ID
        sid = f'le-basra-t{topic_num}-s{siman_num}'
        if seg.get('shareId') != sid:
            seg['shareId'] = sid
            share_ids += 1
        
        # English
        if siman_num in matching:
            new_en = matching[siman_num]
            old_en = seg.get('en', '') or ''
            if new_en != old_en:
                seg['en'] = new_en
                segs_updated += 1
                en_fixes += 1
    
    if segs_updated > 0:
        data['hasEnglish'] = True
        data['hasShareIds'] = True
        with open(fp, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        updated += 1
    
    tag = 'FIXED' if segs_updated > 5 else ('OK' if matching else 'SKIP')
    print(f'  {tag:5s} topic-{topic_num:2d}: {segs_updated:3d} EN, {heb_title[:40]}')

print(f'\n=== Done ===')
print(f'Updated: {updated}, Skipped: {skipped}')
print(f'EN fixes: {en_fixes}, Share IDs: {share_ids}')
