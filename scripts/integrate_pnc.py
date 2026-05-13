#!/usr/bin/env python3
"""
Direct extraction of torahs data from generator scripts.
Parses the Python source to find and extract torahs[n] = {...} definitions.
"""
import os, sys, json, glob, re, ast

SCRIPTS_DIR = "/root/ajew-org/_source-archive/pettek-nanach-patches"
TARGET_DIR = "/root/ajew-org/public/reader/pettek-nanach-commentary"

# Mapping script files to their output JSON file patterns:
# - write_t<num>.py -> torah-<num>.json (if single torah)
# - write_t<start>_<end>.py -> torah-<start>.json through torah-<end>.json
# - write_lm*.py -> also writes LM commentary but we only need PNC

def extract_torahs_from_script(script_path):
    """Extract all torah data dicts from a generator script."""
    with open(script_path, 'r') as f:
        content = f.read()

    # Remove the path/boilerplate lines at top - find where torahs = {} starts
    # Strategy: find the torahs dict literal and parse it safely
    # We'll look for patterns like:
    #   torahs = { N: { "title_en": ..., "title_he": ..., "segs": [...] } }
    # or single var like t112 = { id, book, part, torah, title, hebrewTitle, segments }

    results = {}

    # Pattern 1: torahs[N] = {...} style (write_t2_7.py, write_t61.py, etc.)
    # Find `torahs = { ... }` using a balanced brace approach
    torahs_match = re.search(r'torahs\s*=\s*\{', content)
    if torahs_match:
        start = torahs_match.end() - 1  # at the opening {
        depth = 0
        end = start
        for i, c in enumerate(content[start:]):
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    end = start + i + 1
                    break
        dict_str = content[start:end]
        try:
            d = ast.literal_eval(dict_str)
            for k, v in d.items():
                results[k] = v
        except:
            pass

    # Pattern 2: torahs[N] = {...} assignments where N is numeric
    if not results:
        for m in re.finditer(r'torahs\[(\d+)\]\s*=\s*\{', content):
            torah_num = int(m.group(1))
            # Find the matching closing brace
            start = m.end() - 1
            depth = 0
            end = start
            for i, c in enumerate(content[start:]):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        end = start + i + 1
                        break
            dict_str = content[start:end]
            # Handle escaped quotes - ast.literal_eval should handle them
            try:
                results[torah_num] = ast.literal_eval(dict_str)
            except:
                # Try with added safety
                try:
                    # Fix common escaping issues
                    fixed = dict_str.replace('\\\\"', '\\"')
                    results[torah_num] = ast.literal_eval(fixed)
                except:
                    pass

    # Pattern 3: single var like t112 = { ... } style (write_t112_126.py, etc.)
    if not results:
        for m in re.finditer(r'^(torahs\[(\d+)\]\s*=|(\w+)\s*=\s*\{)', content, re.MULTILINE):
            if m.group(2):  # torahs[N]
                torah_num = int(m.group(2))
            elif m.group(3) and m.group(3) == 't' + re.search(r'(\d+)', m.group(3)).group(1) if m.group(3) and re.match(r'^t\d+$', m.group(3)) else None:
                pass  # skip for now
            else:
                continue
            start = m.end() - 1
            depth = 0
            end = start
            for i, c in enumerate(content[start:]):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        end = start + i + 1
                        break
            dict_str = content[start:end]
            try:
                results[torah_num] = ast.literal_eval(dict_str)
            except:
                pass

    # Pattern 4: direct variable assignments (write_t112_126.py style)
    if not results:
        for m in re.finditer(r'torahs\[(\d+)\]\s*=\s*\{', content):
            n = int(m.group(1))
            start = m.end() - 1
            depth = 0
            end = start
            for i, c in enumerate(content[start:]):
                if c == '{': depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        end = start + i + 1
                        break
            try:
                d = ast.literal_eval(content[start:end])
                results[n] = d
            except:
                pass

    return results


def get_output_filename(num, script_content):
    """Determine output filename from script content."""
    # Check for outfile pattern
    m = re.search(r"outfile.*['\"].*torah-(\d+)\.json['\"]", script_content)
    if m:
        return f"torah-{m.group(1)}.json"

    m = re.search(r"out_path.*['\"].*torah-(\d+)\.json['\"]", script_content)
    if m:
        return f"torah-{m.group(1)}.json"

    return f"torah-{num}.json"


def get_id_from_data(data):
    """Extract PNC id from data dict."""
    return data.get('id', '')


all_scripts = sorted(glob.glob(os.path.join(SCRIPTS_DIR, "write_t*.py")))
print(f"Found {len(all_scripts)} scripts\n")

wrote = 0
skipped = 0
errored = []

for i, script_path in enumerate(all_scripts, 1):
    name = os.path.basename(script_path)
    with open(script_path, 'r') as f:
        script_content = f.read()

    try:
        results = extract_torahs_from_script(script_path)
    except Exception as e:
        results = {}
        errored.append((name, str(e)))

    if results:
        for num, data in sorted(results.items()):
            # Check if data has segs
            segs = data.get('segs', data.get('segments', []))
            if not segs:
                # Try to find segs in the literal
                if 'segs' in data:
                    segs = data['segs']

            # Build output JSON with proper schema matching existing files
            outfile_name = get_output_filename(num, script_content)
            existing_path = os.path.join(TARGET_DIR, outfile_name)

            # Check existing file to match schema
            existing_schema = None
            if os.path.exists(existing_path):
                with open(existing_path) as f:
                    try:
                        existing_schema = json.load(f)
                    except:
                        pass

            if existing_schema and existing_schema.get('segments') and len(existing_schema.get('segments', [])) > 0:
                print(f"[{i}/{len(all_scripts)}] {name}: torah {num} -> {outfile_name} ALREADY HAS {len(existing_schema['segments'])} segs, SKIP")
                skipped += 1
                continue

            # Build the JSON object
            if existing_schema:
                # Use existing file's structure, fill in segments
                output = dict(existing_schema)
                output['segments'] = segs
            else:
                # Build from scratch based on data dict structure
                # The data dict may be either:
                # - {title_en, title_he, segs} (torahs style)
                # - full dict with id, book, part, etc.
                output = {
                    "id": data.get('id', f'pnc-1-{num}'),
                    "book": data.get('book', 'pettek-nanach-commentary'),
                    "part": data.get('part', 1),
                    "torah": num,
                    "title": data.get('title', f"T{num}"),
                    "hebrewTitle": data.get('hebrewTitle', ''),
                    "sourceRef": data.get('sourceRef', f'lm-1-{num}'),
                    "segments": segs
                }

            outpath = os.path.join(TARGET_DIR, outfile_name)
            with open(outpath, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            wrote += 1
            print(f"[{i}/{len(all_scripts)}] {name}: torah {num} -> {outfile_name} ({len(segs)} segs)")
    else:
        print(f"[{i}/{len(all_scripts)}] {name}: NO DATA EXTRACTED")
        errored.append((name, "no data"))

print(f"\n{'='*60}")
print(f"Wrote: {wrote}, Skipped (already has data): {skipped}, Errors: {len(errored)}")
if errored:
    for n, e in errored[:10]:
        print(f"  Error: {n} - {e[:80]}")

# Verify remaining empties
total_files = glob.glob(os.path.join(TARGET_DIR, "*.json"))
empty = [f for f in total_files if json.load(open(f)).get('segments', []) == []]
print(f"\nTotal JSON files: {len(total_files)}")
print(f"Empty segments files: {len(empty)}")