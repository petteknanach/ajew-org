#!/usr/bin/env python3
"""
Execute the generator scripts by patching their paths at runtime.
We intercept os.path.join and os.path.expanduser to redirect paths.
"""
import os, sys, json, glob, re, tempfile, types

CORRECT_READER_DIR = "/root/ajew-org/public/reader"
SCRIPTS_DIR = "/root/ajew-org/_source-archive/pettek-nanach-patches"

# Original functions
_orig_join = os.path.join
_orig_expanduser = os.path.expanduser

# Old path that needs replacement
OLD_HOME = os.path.expanduser("~") + "/.openclaw/workspace/ajew-org"

def patched_join(*parts):
    result = _orig_join(*parts)
    if ".openclaw/workspace/ajew-org" in result:
        result = result.replace(".openclaw/workspace/ajew-org", "ajew-org")
    return result

def patched_expanduser(path):
    result = _orig_expanduser(path)
    if ".openclaw/workspace/ajew-org" in result:
        result = result.replace(".openclaw/workspace/ajew-org", "ajew-org")
    return result

# Patch os.path
os.path.join = patched_join
os.path.expanduser = patched_expanduser

# Also need to handle the os.path.expanduser('~') + '/...' patterns
# Monkey-patch for exec environments
_original_exec = exec

def safe_exec(code, globals=None, locals=None):
    """Wrapper to patch paths before exec."""
    if isinstance(code, str):
        code = code.replace(".openclaw/workspace/ajew-org", "ajew-org")
    return _original_exec(code, globals, locals)

wrote = 0
skipped = 0
errors = []

all_scripts = sorted(glob.glob(os.path.join(SCRIPTS_DIR, "write_t*.py")))
print(f"Running {len(all_scripts)} scripts with patched paths\n")

for i, script_path in enumerate(all_scripts, 1):
    name = os.path.basename(script_path)

    with open(script_path, "r") as f:
        content = f.read()

    # Replace path patterns in the source
    fixed = content.replace(".openclaw/workspace/ajew-org", "ajew-org")

    fd, temp_path = tempfile.mkstemp(suffix=".py")
    os.close(fd)
    with open(temp_path, "w") as f:
        f.write(fixed)

    try:
        exec(compile(open(temp_path).read(), temp_path, 'exec'), globals())
        wrote += 1
        print(f"[{i}/{len(all_scripts)}] {name}: OK")
    except Exception as e:
        errors.append(name)
        print(f"[{i}/{len(all_scripts)}] {name}: ERROR - {e}")
    finally:
        try:
            os.unlink(temp_path)
        except:
            pass

print(f"\n{'='*60}")
print(f"Completed: {wrote}, Errors: {len(errors)}")
if errors:
    print(f"Failed scripts: {errors}")

# Check results
total = glob.glob(os.path.join(CORRECT_READER_DIR, "pettek-nanach-commentary", "*.json"))
empty = [f for f in total if json.load(open(f)).get('segments', []) == []]
print(f"\nTotal JSON files: {len(total)}")
print(f"Empty segments: {len(empty)}")