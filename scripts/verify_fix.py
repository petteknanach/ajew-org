#!/usr/bin/env python3
"""Quick verification of fix results."""
import json, os, re

READER_DIR = '/root/ajew-org/public/reader/likutay-halachos'

def is_garbage(text):
    """Check if EN text looks like raw transliteration/garbage."""
    t = text.strip().lower()
    # Garbage patterns
    garbage = ['.my', 'aye-ay', 'saaroag', 'taaroag', 'muyeem', 'afeekay',
               'eloaheem', 'nafshee', 'ellechu', 'aillo', 'eevohr', 'basuch']
    for g in garbage:
        if g in t:
            return True
    return False

# Count issues
total_issues = 0
total_content = 0

print("=== Checking for remaining issues ===\n")
for part_dir in sorted(os.listdir(READER_DIR)):
    if not part_dir.startswith('part-'): continue
    part_path = os.path.join(READER_DIR, part_dir)

    part_issues = 0
    part_total = 0

    for f in sorted(os.listdir(part_path)):
        if not f.endswith('.json') or f == 'index.json': continue
        data = json.load(open(os.path.join(part_path, f)))

        for seg in data['segments']:
            he = seg.get('he','').strip()
            en = seg.get('en','').strip()
            if not he or not en: continue
            if len(he) < 30: continue  # Skip headers

            part_total += 1
            total_content += 1

            if is_garbage(en):
                part_issues += 1
                total_issues += 1
                if part_issues <= 3:
                    print(f"  Issue in {part_dir}/{f}:")
                    print(f"    HE: {he[:60]}...")
                    print(f"    EN: {en[:60]}...")

    print(f"  {part_dir}: {part_issues} issues out of {part_total} content segs")

print(f"\nTotal issues: {total_issues} out of {total_content} content segments")
if total_issues == 0:
    print("SUCCESS! All content segments have proper EN translations!")

# Verify a few specific files
print("\n=== Checking specific files ===")
test_files = [
    ('part-1', 'halacha-1.json'),
    ('part-1', 'halacha-10.json'),
    ('part-2', 'halacha-1.json'),
]

for part, fname in test_files:
    path = os.path.join(READER_DIR, part, fname)
    if not os.path.exists(path): continue
    data = json.load(open(path))
    print(f"\n{part}/{fname}: {len(data['segments'])} segments")
    for i, seg in enumerate(data['segments'][:5]):
        he = seg.get('he','').strip()[:80]
        en = seg.get('en','').strip()[:80]
        is_garb = is_garbage(seg.get('en','') or '')
        print(f"  [{i+1}] HE: {he}")
        print(f"       EN: {en} {'[GARBAGE]' if is_garb else ''}")