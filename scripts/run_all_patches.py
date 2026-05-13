#!/usr/bin/env python3
"""
Execute generator scripts with path patching.
The problem: scripts use os.path.join(h, '.openclaw', 'workspace', 'ajew-org', ...)
but on this system h=/root and the correct path is /root/ajew-org/...
Fix: remove '.openclaw', 'workspace' from the path join.
"""
import os, sys, tempfile, json, re

scripts_dir = "/root/ajew-org/_source-archive/pettek-nanach-patches"

all_scripts = [
    "write_t2_34_40.py",
    "write_t61.py",
    "write_t62.py",
    "write_t63.py",
    "write_t64.py",
    "write_t65.py",
    "write_t66.py",
    "write_t67.py",
    "write_t68.py",
    "write_t69.py",
    "write_t70.py",
    "write_t71.py",
    "write_t72.py",
    "write_t73.py",
    "write_t74.py",
    "write_t75.py",
    "write_t76.py",
    "write_t77.py",
    "write_t78.py",
    "write_t79.py",
    "write_t80.py",
    "write_t81.py",
    "write_t82.py",
    "write_t83.py",
    "write_t84.py",
    "write_t85_86.py",
    "write_t87_96.py",
    "write_t97_111.py",
    "write_t112_126.py",
    "write_t127_141.py",
    "write_t142_156.py",
    "write_t157_171.py",
    "write_t172_185.py",
    "write_t186_200.py",
    "write_t201_215.py",
    "write_t216_230.py",
    "write_t231_245.py",
    "write_t246_260.py",
    "write_t261_275.py",
    "write_t276_286.py",
]

# Also handle the first batch that may have used a different path pattern
first_batch = [
    "convert_likutay_nanach.py",
    "write_t1.py",
    "write_t127_to_129.py",
    "write_t12_14.py",
    "write_t14_27.py",
    "write_t150.py",
    "write_t150_169.py",
    "write_t170_171.py",
    "write_t172_to_185.py",
    "write_t2_2.py",
    "write_t2_7.py",
    "write_t2_8_20.py",
    "write_t151_to_169.py",
    "write_t112_126.py",
    "write_t127_141.py",
    "write_t142_156.py",
    "write_t157_171.py",
]

all_scripts_unique = list(set(all_scripts + first_batch))

os.chdir("/root/ajew-org")

results = {"ok": [], "error": []}

for name in all_scripts_unique:
    script_path = os.path.join(scripts_dir, name)
    if not os.path.exists(script_path):
        print(f"SKIP: {name} (not found)")
        continue

    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix paths - remove '.openclaw', 'workspace' from path joins
    # Before: os.path.join(h, '.openclaw', 'workspace', 'ajew-org', ...)
    # After:  os.path.join(h, 'ajew-org', ...)
    fixed = re.sub(
        r"(\bos\.path\.join\([^)]*?)"
        r",\s*'\.openclaw'\s*,\s*'workspace'\s*,"
        r"(.*?'\.openclaw')?",
        lambda m: m.group(1) + ", '" + "ajew-org" + "', " + m.group(3) if m.group(2) and m.group(3) else m.group(1) + ", 'ajew-org'",
        content
    )

    # Simpler approach: just remove the two problematic components
    # Replace: , '.openclaw', 'workspace',
    # With: nothing

    def fix_path_join(match):
        before = match.group(1)
        has_dot_openclaw = ".openclaw" in match.group(0) if match.group(0) else False
        # Check if there's a '.openclaw' and 'workspace' pattern after current position
        full = match.group(0)
        if "'.openclaw'" in full and "'workspace'" in full:
            # Remove both components
            fixed_full = re.sub(r",\s*'\.openclaw'\s*,\s*'workspace'\s*,", ", ", full)
            fixed_full = re.sub(r",\s*'\.openclaw'\s*", "", fixed_full)
            fixed_full = re.sub(r",\s*'workspace'\s*,", ", ", fixed_full)
            return fixed_full
        return full

    # More targeted: just remove the literal components
    fixed2 = content
    # Remove , '.openclaw', 'workspace',  (when followed by 'ajew-org')
    fixed2 = re.sub(
        r",\s*'\.openclaw'\s*,\s*'workspace'\s*,",
        ", ",
        fixed2
    )
    # Also handle just , '.openclaw', if standalone
    fixed2 = re.sub(
        r",\s*'\.openclaw'\s*,",
        ", ",
        fixed2
    )

    # Write patched script to temp
    fd, temp_path = tempfile.mkstemp(suffix=".py")
    os.close(fd)

    orig_name = name
    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(fixed2)

        ns = {"__name__": "__main__", "__file__": temp_path}
        exec(compile(open(temp_path).read(), temp_path, 'exec'), ns)
        results["ok"].append(name)
        print(f"OK: {name}")
    except Exception as e:
        err_msg = str(e)[:300]
        results["error"].append((name, err_msg))
        print(f"ERROR: {name}: {err_msg}")
    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

# Final check
pnc_dir = "/root/ajew-org/public/reader/pettek-nanach-commentary"
empty = []
for f in sorted(os.listdir(pnc_dir)):
    if not f.endswith('.json'):
        continue
    if f == 'index.json':
        continue
    fp = os.path.join(pnc_dir, f)
    data = json.load(open(fp))
    if len(data.get('segments', [])) == 0:
        empty.append(f)

print(f"\n{'='*60}")
print(f"Results: {len(results['ok'])} OK, {len(results['error'])} errors")
if empty:
    print(f"Still empty: {empty}")
else:
    print("All PNC torah/ files have content!")

if results["error"]:
    print("\nFailed scripts:")
    for name, err in results["error"]:
        print(f"  {name}: {err[:200]}")