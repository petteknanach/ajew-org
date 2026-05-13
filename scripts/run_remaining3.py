#!/usr/bin/env python3
"""
Re-run the 3 remaining failed scripts (now fixed) to populate missing PNC files.
"""
import os, sys, tempfile

os.chdir("/root/ajew-org")

scripts = [
    "_source-archive/pettek-nanach-patches/write_t2_7.py",
    "_source-archive/pettek-nanach-patches/write_t2_8_20.py",
    "_source-archive/pettek-nanach-patches/write_t62.py",
]

for script_rel in scripts:
    script_path = os.path.join("/root/ajew-org", script_rel)
    name = os.path.basename(script_path)
    print(f"Running: {name}")
    try:
        with open(script_path, 'r') as f:
            code = f.read()
        fd, temp_path = tempfile.mkstemp(suffix=".py")
        os.close(fd)
        with open(temp_path, 'w') as f:
            f.write(code)
        ns = {"__name__": "__main__", "__file__": temp_path}
        exec(compile(open(temp_path).read(), temp_path, 'exec'), ns)
        print(f"  OK: {name}")
        os.unlink(temp_path)
    except Exception as e:
        print(f"  ERROR: {name}: {e}")
        try:
            os.unlink(temp_path)
        except:
            pass

# Check remaining empty files
import json, glob
pnc_dir = "/root/ajew-org/public/reader/pettek-nanach-commentary"
empty = [f for f in sorted(glob.glob(pnc_dir + "/torah-*.json"))
         if json.load(open(f)).get('segments', []) == []]
print(f"\nEmpty PNC torah files: {empty if empty else 'NONE - all populated!'}")