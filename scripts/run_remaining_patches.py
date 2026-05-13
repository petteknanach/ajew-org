#!/usr/bin/env python3
"""
Direct execution of remaining failed generator scripts with path patching.
We patch the source code to replace the old path prefix before executing.
"""
import os, sys, tempfile, re, json

OLD_PREFIX = os.path.expanduser("~/.openclaw/workspace/ajew-org")
NEW_PREFIX = "/root/ajew-org"

scripts = [
    "_source-archive/pettek-nanach-patches/write_t2_34_40.py",
    "_source-archive/pettek-nanach-patches/write_t61.py",
    "_source-archive/pettek-nanach-patches/write_t62.py",
    "_source-archive/pettek-nanach-patches/write_t63.py",
    "_source-archive/pettek-nanach-patches/write_t64.py",
    "_source-archive/pettek-nanach-patches/write_t65.py",
    "_source-archive/pettek-nanach-patches/write_t66.py",
    "_source-archive/pettek-nanach-patches/write_t67.py",
    "_source-archive/pettek-nanach-patches/write_t68.py",
    "_source-archive/pettek-nanach-patches/write_t69.py",
    "_source-archive/pettek-nanach-patches/write_t70.py",
    "_source-archive/pettek-nanach-patches/write_t71.py",
    "_source-archive/pettek-nanach-patches/write_t72.py",
    "_source-archive/pettek-nanach-patches/write_t73.py",
    "_source-archive/pettek-nanach-patches/write_t74.py",
    "_source-archive/pettek-nanach-patches/write_t75.py",
    "_source-archive/pettek-nanach-patches/write_t76.py",
    "_source-archive/pettek-nanach-patches/write_t77.py",
    "_source-archive/pettek-nanach-patches/write_t78.py",
    "_source-archive/pettek-nanach-patches/write_t79.py",
    "_source-archive/pettek-nanach-patches/write_t80.py",
    "_source-archive/pettek-nanach-patches/write_t81.py",
    "_source-archive/pettek-nanach-patches/write_t82.py",
    "_source-archive/pettek-nanach-patches/write_t83.py",
    "_source-archive/pettek-nanach-patches/write_t84.py",
    "_source-archive/pettek-nanach-patches/write_t85_86.py",
    "_source-archive/pettek-nanach-patches/write_t87_96.py",
    "_source-archive/pettek-nanach-patches/write_t97_111.py",
    "_source-archive/pettek-nanach-patches/write_t112_126.py",
    "_source-archive/pettek-nanach-patches/write_t127_141.py",
    "_source-archive/pettek-nanach-patches/write_t142_156.py",
    "_source-archive/pettek-nanach-patches/write_t157_171.py",
    "_source-archive/pettek-nanach-patches/write_t172_185.py",
    "_source-archive/pettek-nanach-patches/write_t186_200.py",
    "_source-archive/pettek-nanach-patches/write_t201_215.py",
    "_source-archive/pettek-nanach-patches/write_t216_230.py",
    "_source-archive/pettek-nanach-patches/write_t231_245.py",
    "_source-archive/pettek-nanach-patches/write_t246_260.py",
    "_source-archive/pettek-nanach-patches/write_t261_275.py",
    "_source-archive/pettek-nanach-patches/write_t276_286.py",
]

os.chdir("/root/ajew-org")

results = {"ok": [], "error": [], "skipped": []}

for script_rel in scripts:
    script_path = os.path.join("/root/ajew-org", script_rel)
    name = os.path.basename(script_rel)

    with open(script_path, 'r') as f:
        content = f.read()

    # Patch paths
    fixed = content.replace(OLD_PREFIX, NEW_PREFIX)
    # Also handle mixed slashes
    fixed = fixed.replace(OLD_PREFIX.replace("/", "\\"), NEW_PREFIX)

    # Write to temp file
    fd, temp_path = tempfile.mkstemp(suffix=".py")
    os.close(fd)

    try:
        with open(temp_path, 'w') as f:
            f.write(fixed)

        # Execute in __main__ namespace
        ns = {"__name__": "__main__", "__file__": temp_path}
        exec(compile(open(temp_path).read(), temp_path, 'exec'), ns)
        results["ok"].append(name)
        print(f"OK: {name}")
    except Exception as e:
        results["error"].append((name, str(e)[:200]))
        print(f"ERROR: {name} - {e}")
    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

# Check results
pnc_dir = "/root/ajew-org/public/reader/pettek-nanach-commentary"
total = 0
empty = 0
for f in sorted(os.listdir(pnc_dir)):
    if not f.endswith('.json'):
        continue
    total += 1
    fp = os.path.join(pnc_dir, f)
    data = json.load(open(fp))
    if len(data.get('segments', [])) == 0 and f != 'index.json':
        empty += 1
        print(f"  STILL EMPTY: {f}")

print(f"\nResults: {len(results['ok'])} OK, {len(results['error'])} errors")
print(f"Total files: {total}, Empty (non-index): {empty}")

if results["error"]:
    print("\nFailed scripts:")
    for name, err in results["error"]:
        print(f"  {name}: {err}")