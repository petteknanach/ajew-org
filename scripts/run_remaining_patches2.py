#!/usr/bin/env python3
"""
Direct execution of remaining generator scripts with path patching.
The scripts use os.path.join(h, '.openclaw', 'workspace', 'ajew-org', ...)
We need to remove the '.openclaw', 'workspace' components.
"""
import os, sys, tempfile, json

scripts_dir = "/root/ajew-org/_source-archive/pettek-nanach-patches"

scripts = [
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

os.chdir("/root/ajew-org")

results = {"ok": [], "error": []}

for name in scripts:
    script_path = os.path.join(scripts_dir, name)

    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Key transformation: os.path.join(h, '.openclaw', 'workspace', 'ajew-org', ...)
    # → os.path.join(h, 'ajew-org', ...)
    # This handles all the intermediate path components

    # Method 1: Replace the full os.path.join pattern
    # The original: os.path.join(HOME, '.openclaw', 'workspace', 'ajew-org', ...)
    # Becomes:      os.path.join(HOME, 'ajew-org', ...)
    import re

    # Replace path join patterns
    # Match: os.path.join(VAR, '.openclaw', 'workspace', 'ajew-org'
    fixed = re.sub(
        r"([Oo][Ss]\.[Pp]ath\.[Jj]oin\([^,]+,\s*)'\.openclaw',\s*'workspace',\s*'",
        r"\1'",
        content
    )

    # Also handle the HOME variable patterns
    # e.g., os.path.join(h, '.openclaw' ...)
    fixed2 = re.sub(
        r"([Oo][Ss]\.[Pp]ath\.[Jj]oin\([^)]*?),\s*'\.openclaw',\s*'workspace',\s*'",
        r"\1, '",
        fixed
    )

    # Write patched script to temp
    fd, temp_path = tempfile.mkstemp(suffix=".py")
    os.close(fd)

    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            f.write(fixed2)

        # Verify the patch by checking for the old paths
        with open(temp_path) as vf:
            vcontent = vf.read()
        if '.openclaw' in vcontent and "'openclaw'" in vcontent:
            print(f"WARN: {name} may still have .openclaw in os.path.join")

        ns = {"__name__": "__main__", "__file__": temp_path}
        exec(compile(open(temp_path).read(), temp_path, 'exec'), ns)
        results["ok"].append(name)
        print(f"OK: {name}")
    except Exception as e:
        results["error"].append((name, str(e)[:300]))
        print(f"ERROR: {name}: {e}")
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
    print("All PNC JSON files have content!")

if results["error"]:
    print("\nFailed scripts:")
    for name, err in results["error"]:
        print(f"  {name}: {err[:200]}")