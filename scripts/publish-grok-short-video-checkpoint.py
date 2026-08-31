#!/usr/bin/env python3
"""Link QA-approved Grok clips from a checkpoint into Reader manifests.

The script refuses to update the Reader until every selected canonical Archive.org
file matches the local final by exact size and MD5.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen


def md5(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("checkpoint", type=Path)
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    args = parser.parse_args()

    checkpoint = json.loads(args.checkpoint.read_text(encoding="utf-8"))
    selected = [
        row for row in checkpoint["rows"]
        if args.start <= int(row.get("batch_index", 0)) <= args.end
    ]
    expected = args.end - args.start + 1
    if len(selected) != expected:
        raise SystemExit(f"Expected {expected} rows, found {len(selected)}")

    remote_by_identifier: dict[str, dict[str, dict]] = {}
    for identifier in sorted({row["archive_identifier"] for row in selected}):
        with urlopen(f"https://archive.org/metadata/{identifier}", timeout=120) as response:
            metadata = json.load(response)
        remote_by_identifier[identifier] = {
            item["name"]: item for item in metadata.get("files", [])
        }

    manifest_cache: dict[Path, dict] = {}
    linked = 0
    for row in selected:
        if row.get("status") != "final_qa_passed_archive_pending":
            raise SystemExit(f"Row {row['batch_index']} is not QA-approved: {row.get('status')}")
        local = Path(row["final_local_video"])
        remote = remote_by_identifier[row["archive_identifier"]].get(row["archive_filename"])
        if not remote:
            raise SystemExit(f"Archive file missing for row {row['batch_index']}: {row['archive_filename']}")
        if int(remote.get("size", -1)) != local.stat().st_size:
            raise SystemExit(f"Archive size mismatch for row {row['batch_index']}")
        if remote.get("md5") != md5(local):
            raise SystemExit(f"Archive MD5 mismatch for row {row['batch_index']}")

        manifest_path = args.repo / "public" / "images" / row["media_collection"] / "manifest.json"
        manifest = manifest_cache.setdefault(
            manifest_path, json.loads(manifest_path.read_text(encoding="utf-8"))
        )
        entries = [entry for entry in manifest["entries"] if int(entry["segment"]) == int(row["segment"])]
        if len(entries) != 1:
            raise SystemExit(f"Expected one Reader entry for row {row['batch_index']}, found {len(entries)}")
        images = entries[0].get("images", [])
        if not images:
            raise SystemExit(f"No Reader images for row {row['batch_index']}")
        for image in images:
            image["video_path"] = row["archive_url"]
            image["video_filename"] = row["archive_filename"]
            image["video_source"] = "Grok/xAI motion; exact published teaching panels restored deterministically; silent final archived by ajew.org"
        linked += 1

    for path, manifest in manifest_cache.items():
        path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"linked_teachings": linked, "manifests": [str(p) for p in manifest_cache]}, indent=2))


if __name__ == "__main__":
    main()
