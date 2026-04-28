"""Generate section-N.json files for all chumash-lh parshas (mobile app bandaid fix)."""
import json, shutil, os

BASE = "/mnt/c/Users/Pettek/.openclaw/workspace/ajew-org/public/reader/chumash-lh"

# Build absolute parsha index (sequential across all chumashim)
# Parsha order: Bereishis=1 ... Haazinu=53
PARSHA_ORDER = [
    ("bereishit", 1, 1), ("noach", 1, 2), ("lech-lecha", 1, 3), ("vayeira", 1, 4),
    ("chayei-sarah", 1, 5), ("toldot", 1, 6), ("vayeitzei", 1, 7), ("vayishlach", 1, 8),
    ("vayeishev", 1, 9), ("mikeitz", 1, 10), ("vayigash", 1, 11), ("vayechi", 1, 12),
    ("shemot", 2, 1), ("vaeira", 2, 2), ("bo", 2, 3), ("beshalach", 2, 4),
    ("yitro", 2, 5), ("mishpatim", 2, 6), ("terumah", 2, 7), ("tetzaveh", 2, 8),
    ("ki-tisa", 2, 9), ("vayakhel", 2, 10), ("pekudei", 2, 11),
    ("vayikra", 3, 1), ("tzav", 3, 2), ("shemini", 3, 3), ("tazria", 3, 4),
    ("metzora", 3, 5), ("acharei-mot", 3, 6), ("kedoshim", 3, 7), ("emor", 3, 8),
    ("behar", 3, 9), ("bechukotai", 3, 10),
    ("bamidbar", 4, 1), ("naso", 4, 2), ("behaalotcha", 4, 3), ("shelach", 4, 4),
    ("korach", 4, 5), ("chukat", 4, 6), ("balak", 4, 7), ("pinchas", 4, 8),
    ("matot", 4, 9), ("masei", 4, 10),
    ("devarim", 5, 1), ("vaetchanan", 5, 2), ("eikev", 5, 3), ("reeh", 5, 4),
    ("shoftim", 5, 5), ("ki-teitzei", 5, 6), ("ki-tavo", 5, 7),
    ("nitzavim", 5, 8), ("vayeilech", 5, 8), ("haazinu", 5, 9),
]

# Also handle v'zos haberacha, shemini atzeres, simchas torah if present
for part in range(1, 7):
    idx_path = f"{BASE}/part-{part}/index.json"
    if not os.path.exists(idx_path):
        continue
    idx = json.load(open(idx_path))
    for t in idx.get("torahs", []):
        tnum = t["number"]
        tpath = f"{BASE}/part-{part}/torah-{tnum}.json"
        if not os.path.exists(tpath):
            print(f"MISSING: {tpath}")
            continue
        torah_data = json.load(open(tpath))
        print(f"  part-{part}/torah-{tnum}: {torah_data.get('title', '?')} ({torah_data.get('hebrewTitle', '?')})")

# Create section files using absolute sequential numbering
created = 0
for abs_num, (slug, part, torah) in enumerate(PARSHA_ORDER, 1):
    src = f"{BASE}/part-{part}/torah-{torah}.json"
    dst = f"{BASE}/section-{abs_num}.json"
    
    if not os.path.exists(src):
        print(f"SKIP section-{abs_num}: source missing {src}")
        continue
    
    # Copy the torah JSON as the section file
    shutil.copy2(src, dst)
    created += 1
    print(f"OK section-{abs_num}.json = part-{part}/torah-{torah} = {slug}")

# Also create part-torah naming as fallback
for (slug, part, torah) in PARSHA_ORDER:
    src = f"{BASE}/part-{part}/torah-{torah}.json"
    dst = f"{BASE}/section-p{part}-t{torah}.json"
    
    if not os.path.exists(src):
        continue
    
    shutil.copy2(src, dst)
    created += 1
    print(f"OK section-p{part}-t{torah}.json")

print(f"\nCreated {created} section files total")
print(f"Files in chumash-lh/: {len([f for f in os.listdir(BASE) if f.startswith('section-')])}")
