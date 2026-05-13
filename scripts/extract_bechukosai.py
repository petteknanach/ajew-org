#!/usr/bin/env python3
"""Extract all Bechukosai teachings from LH sources with corrected Hebrew and English."""
import json, pathlib, re

LH_DIR = pathlib.Path("/root/ajew-org/public/reader/likutay-halachos")

def search_lh(search_phrase, part=None):
    """Search all LH files for a phrase."""
    parts = [part] if part else range(1, 9)
    for p in parts:
        pdir = LH_DIR / f"part-{p}"
        if not pdir.exists(): continue
        for tf in pdir.glob("torah-*.json"):
            data = json.loads(tf.read_text())
            for i, seg in enumerate(data.get('segments', [])):
                he = str(seg.get('he', ''))
                if search_phrase in he:
                    he_parts, en_parts = [he], [str(seg.get('en', ''))]
                    for j in range(i+1, len(data['segments'])):
                        next_he = str(data['segments'][j].get('he', ''))
                        next_en = str(data['segments'][j].get('en', ''))
                        if next_he.startswith('אות ') and next_he != he:
                            break
                        if next_he: he_parts.append(next_he)
                        if next_en: en_parts.append(next_en)
                    return '\n'.join(he_parts), '\n'.join(en_parts), p, int(tf.stem.split('-')[1])
    return None, None, None, None

# Parse teachings from docx
import docx as docx_mod
docx_path = pathlib.Path("/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/Parsha/3 VaYikra/10 Bichookoaseye.docx")
doc = docx_mod.Document(docx_path)

raw_teachings = []
current_verse = None
current_text = []
current_source = []

for p in doc.paragraphs:
    text = p.text.strip()
    if not text:
        continue
    
    verse_match = re.match(r'^\(ויקרא\s+כ"ו[,\s]+[^)]+\)$', text)
    if verse_match:
        if current_verse and current_text:
            raw_teachings.append({'verse': current_verse, 'text': '\n'.join(current_text), 'source': '\n'.join(current_source)})
        current_verse = text
        current_text = []
        current_source = []
        continue
    
    source_match = re.search(r'\(לקוטי (הלכות|מוהר"ן)[^)]+\)', text)
    if source_match:
        current_source.append(source_match.group(0))
        before = text[:source_match.start()].strip()
        if before:
            current_text.append(before)
        continue
    
    current_text.append(text)

if current_verse and current_text:
    raw_teachings.append({'verse': current_verse, 'text': '\n'.join(current_text), 'source': '\n'.join(current_source)})

print(f"Parsed {len(raw_teachings)} teachings from docx")

# Map each teaching to its LH source
results = []
for i, t in enumerate(raw_teachings):
    # Extract search phrase from the first line of text
    first_line = t['text'].split('\n')[0] if t['text'] else ''
    # Use first 30 chars as search phrase
    search = first_line[:40] if first_line else ''
    
    he, en, part, torah = search_lh(search)
    
    if he:
        results.append({
            'verse': t['verse'],
            'source': t['source'],
            'he': he,
            'en': en,
            'lh_part': part,
            'lh_torah': torah
        })
        print(f"✓ Teaching {i+1}: {t['verse']} - found in Part {part} Torah {torah}")
    else:
        # Try searching with shorter phrase
        search2 = first_line[:20] if len(first_line) > 20 else first_line
        he, en, part, torah = search_lh(search2)
        if he:
            results.append({
                'verse': t['verse'],
                'source': t['source'],
                'he': he,
                'en': en,
                'lh_part': part,
                'lh_torah': torah
            })
            print(f"✓ Teaching {i+1}: {t['verse']} - found (short search)")
        else:
            # Use docx text as-is
            results.append({
                'verse': t['verse'],
                'source': t['source'],
                'he': t['text'],
                'en': '',
                'lh_part': None,
                'lh_torah': None
            })
            print(f"✗ Teaching {i+1}: {t['verse']} - NOT FOUND in LH")

print(f"\nFound {sum(1 for r in results if r.get('lh_part'))}/{len(results)} in LH sources")

pathlib.Path('/root/ajew-org/public/data/bechukosai-teachings.json').write_text(
    json.dumps(results, ensure_ascii=False, indent=2)
)
print('Saved to public/data/bechukosai-teachings.json')
