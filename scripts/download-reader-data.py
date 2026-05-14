#!/usr/bin/env python3
"""Download reader JSON data from GitHub raw CDN for Vercel builds."""
import urllib.request
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = "https://raw.githubusercontent.com/petteknanach/ajew-org/main/public/reader"
DEST = "public/reader"

def dl(filepath):
    url = BASE + "/" + filepath
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status != 200:
                return None
            data = resp.read()
            dest = os.path.join(DEST, filepath)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "wb") as f:
                f.write(data)
            return (filepath, len(data))
    except Exception as e:
        if "404" not in str(e):
            print(f"  ERR {filepath}: {e}", flush=True)
        return None

def get_index(book_part):
    idx_path = book_part + "/index.json"
    result = dl(idx_path)
    if not result:
        return None
    with open(os.path.join(DEST, idx_path)) as f:
        return json.load(f)

def download_book_part(book_part):
    index = get_index(book_part)
    if not index:
        return 0

    files_to_dl = []
    
    # Download intro sections
    for intro in index.get("introSections", []):
        slug = intro.get("slug", intro.get("file"))
        if slug:
            files_to_dl.append(book_part + "/" + slug + ".json")
    
    # Download preface sections
    for preface in index.get("prefaceSections", []):
        slug = preface.get("slug", preface.get("file"))
        if slug:
            files_to_dl.append(book_part + "/" + slug + ".json")
    
    # Determine file prefix from book name
    book_name = book_part.split("/")[0]
    if "tefilos" in book_name:
        prefix = "prayer"
    elif "halachos" in book_name:
        prefix = "halacha"
    elif "eitzos" in book_name:
        prefix = "eitzah"
    else:
        prefix = "torah"
    
    # Download torahs - construct filenames from number
    for torah in index.get("torahs", []):
        num = torah.get("number")
        if num:
            files_to_dl.append(book_part + "/" + f"{prefix}-{num}.json")

    count = 0
    with ThreadPoolExecutor(max_workers=50) as executor:
        futures = {executor.submit(dl, f): f for f in files_to_dl}
        for future in as_completed(futures):
            result = future.result()
            if result:
                count += 1
    return count

def main():
    print("=== Downloading reader data ===", flush=True)
    books = [
        "likutay-moharan/part-1",
        "likutay-moharan/part-2",
        "likutay-tefilos/part-1",
        "likutay-tefilos/part-2",
        "likutay-tefilos/part-3",
        "likutay-tefilos/part-4",
        "likutay-halachos/part-1",
        "likutay-halachos/part-2",
        "likutay-halachos/part-3",
        "likutay-halachos/part-4",
        "chumash-lh/part-1",
    ]
    total = 0
    for bp in books:
        print(f"  Downloading {bp}...", flush=True)
        t0 = time.time()
        n = download_book_part(bp)
        elapsed = time.time() - t0
        print(f"    {n} files in {elapsed:.1f}s", flush=True)
        total += n

    try:
        lm_files = os.listdir(os.path.join(DEST, "likutay-moharan/part-1"))
        print(f"  Verification: {len(lm_files)} files in LM part-1", flush=True)
    except:
        print("  Verification failed!", flush=True)

    print(f"Total: {total} files downloaded", flush=True)

if __name__ == "__main__":
    main()
