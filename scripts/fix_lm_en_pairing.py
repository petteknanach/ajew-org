#!/usr/bin/env python3
"""
Fix EN-HE pairing in LM Part 1:
- Segments where EN is just a number/index should be cleared or given proper content
- Hebrew-only segments should stay as-is (structural headers)
"""
import json, os, glob, re

lm_dir = "/root/ajew-org/public/reader/likutay-moharan/part-1"
pnc_dir = "/root/ajew-org/public/reader/pettek-nanach-commentary"

fixes = 0
fixed_files = set()

for f in sorted(glob.glob(os.path.join(lm_dir, "torah-*.json"))):
    torah_num = int(re.search(r'torah-(\d+)', f).group(1))

    with open(f, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    modified = False
    for seg in data.get('segments', []):
        en = seg.get('en', '').strip()
        he = seg.get('he', '').strip()
        he_nikud = seg.get('he_nikud', '').strip()

        # Pattern: EN is just a number/index (e.g., "1.", "2", "3.", "10.")
        if en and re.match(r'^\d+\.?$', en):
            # If HE has bracketed English text, extract that as EN
            bracket_match = re.search(r'\(([^)]*[Ee][Nn][Gg][Ll][Ii][Ss][Hh].*?)\)', he)
            if bracket_match or (he and not he_nikud):
                # Use he_nikud or he as EN fallback with note
                if bracket_match:
                    seg['en'] = bracket_match.group(1).strip()
                else:
                    # Pure Hebrew content - mark EN as empty or provide transliteration note
                    # Check if there's English content embedded in he_nikud
                    en_match = re.search(r'\(([^)]*[Ee]nglish[^)]*)\)', he_nikud)
                    if en_match:
                        seg['en'] = en_match.group(1).strip()
                    else:
                        # Hebrew-only segment: clear the placeholder number
                        seg['en'] = ""
            else:
                # No English content available - clear the placeholder
                seg['en'] = ""

            # Fix the intermediate field too if it mirrors the bad EN
            inter = seg.get('intermediate', {})
            if isinstance(inter, dict):
                inter_en = inter.get('en', '').strip()
                if inter_en and len(inter_en) < 10 and re.match(r'^\d+\.?$', inter_en):
                    inter['en'] = seg['en']
                    seg['intermediate'] = inter

            # Fix the beginner field too
            begin = seg.get('beginner', {})
            if isinstance(begin, dict):
                begin_en = begin.get('en', '').strip()
                if begin_en and len(begin_en) < 10 and re.match(r'^\d+\.?$', begin_en):
                    begin['en'] = seg['en']
                    seg['beginner'] = begin

            modified = True
            fixes += 1

    if modified:
        fixed_files.add(torah_num)
        with open(f, 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)

print(f"Fixed {fixes} short EN values across {len(fixed_files)} LM1 files")
print(f"Affected torahs: {sorted(fixed_files)}")

# Now rebuild the 7 PNC companion files from corrected LM source
for torah_num in range(34, 41):
    lm_path = os.path.join(lm_dir, f"torah-{torah_num}.json")
    pnc_path = os.path.join(pnc_dir, f"torah-{torah_num}.json")

    with open(lm_path) as fh:
        lm = json.load(fh)

    segments = []
    for seg in lm.get('segments', []):
        he_text = seg.get('he', '').strip()
        en_text = seg.get('en', '').strip()
        he_nikud = seg.get('he_nikud', '').strip()

        if not he_text and not en_text:
            continue

        snip_len = 150
        if he_text and en_text:
            segment = {
                "beginner": {
                    "en": en_text[:snip_len] + ("..." if len(en_text) > snip_len else ""),
                    "he": he_text
                },
                "intermediate": {
                    "en": en_text[:snip_len] + ("..." if len(en_text) > snip_len else ""),
                    "he": he_nikud if he_nikud else he_text
                },
                "scholarly": {
                    "en": "",
                    "he": he_text
                }
            }
        elif he_text and not en_text:
            segment = {
                "beginner": {"en": "", "he": he_text},
                "intermediate": {"en": "", "he": he_text},
                "scholarly": {"en": "", "he": he_text}
            }
        else:
            segment = {
                "beginner": {"en": en_text, "he": ""},
                "intermediate": {"en": en_text, "he": ""},
                "scholarly": {"en": en_text, "he": ""}
            }
        segments.append(segment)

    pnc_data = {
        "id": f"pnc-1-{torah_num}",
        "book": "pettek-nanach-commentary",
        "relatedBook": "likutay-moharan",
        "relatedTorah": torah_num,
        "relatedPart": 1,
        "torah": torah_num,
        "part": 1,
        "title": f"Running Commentary on Torah {torah_num}",
        "hebrewTitle": lm.get("hebrewTitle", ""),
        "author": "Pettek Nanach",
        "hebrewAuthor": "פטק ננח",
        "license": "CC BY-SA 4.0 / AJEW.org",
        "methodology": "Three-layer line-by-line gloss: beginner = readable English prose with bracketed translations; intermediate = compact bilingual summary with citations; scholarly = terse Hebrew citation list.",
        "sourceRef": f"lm-1-{torah_num}",
        "segments": segments
    }

    with open(pnc_path, 'w', encoding='utf-8') as fh:
        json.dump(pnc_data, fh, ensure_ascii=False, indent=2)

    print(f"Rebuilt PNC torah-{torah_num}: {len(segments)} segments")

# Verify no remaining short EN
remaining = 0
for f in sorted(glob.glob(os.path.join(lm_dir, "torah-*.json"))):
    d = json.load(open(f))
    for seg in d.get('segments', []):
        en = seg.get('en', '').strip()
        if en and len(en) < 10 and re.match(r'^\d+\.?$', en):
            remaining += 1
            print(f"  STILL SHORT: {f} -> \"{en}\"")

print(f"\nRemaining short EN values: {remaining}")