"""Authenticated selected-source search projection for Yimai HaTlaos only.

Whitespace and pointing removal belong solely to the lookup projection. Frozen
source fields and published reading/export bytes are never rewritten here.
"""
import json
import re
import subprocess
import os
from pathlib import Path

RELATIVE_SOURCE = "reviewed/yimai-hatlaos.json"
ROUTE = "/reader/reviewed/yimai-hatlaos"

def is_source(source, reader_dir):
    return Path(source).relative_to(reader_dir).as_posix() == RELATIVE_SOURCE

def search_document(source, supplied):
    source = Path(source).resolve()
    root = source.parents[3]
    program = """import {pathToFileURL} from 'node:url';
const root=process.argv[1];
const {loadEdition}=await import(pathToFileURL(root+'/src/lib/qualified-yimai-hatlaos.mjs'));
console.log(JSON.stringify(await loadEdition(root)));"""
    result = subprocess.run(["node", "--max-old-space-size=512", "--input-type=module", "-e", program, str(root)], check=True, capture_output=True, timeout=60, env={"PATH":os.environ.get("PATH", "/usr/bin:/bin"),"LANG":"C.UTF-8","TZ":"UTC"})
    edition = json.loads(result.stdout)
    stable = lambda value: json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    if stable(supplied) != stable(edition):
        raise ValueError("YimaiHaTlaos supplied search projection drift")
    norm = lambda text: re.sub(r"\s+", " ", text).strip()
    return {
        "title": edition["title"],
        "hebrewTitle": "ימי התלאות",
        "qualifiedReviewedProjection": True,
        "segments": [
            {"index": u["owner"], "siman": u["section"],
             "he": norm(u["he"]), "commentary_he": "",
             "en": norm(u["en"]), "commentary_en": ""}
            for u in edition["units"]
        ],
    }


def checked_catalog_artifacts(root, he_documents, en_documents):
    """Authenticate actual shard-main inputs before deleting any old output."""
    source = Path(root) / "public" / "reader" / RELATIVE_SOURCE
    he_matches = [doc for doc in he_documents if doc.get("l") == ROUTE]
    en_matches = [doc for doc in en_documents if doc.get("l") == ROUTE]
    if not source.exists() and not he_matches and not en_matches:
        return None  # Unrelated bounded fixtures stay unrelated.
    if len(he_matches) != 1 or len(en_matches) != 1:
        raise ValueError("YimaiHaTlaos requires one complete document in each language")
    if any(str(doc.get("l", "")).startswith("/reader/yemei-hatlaos/") for doc in [*he_documents, *en_documents]):
        raise ValueError("Earlier Yimai English must not appear as another current search pair")
    selected = search_document(source, json.loads(source.read_bytes()))
    norm = lambda text: re.sub(r"\s+", " ", text).strip()
    strip = lambda text: re.sub(r"[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]", "", text)
    he_parts, en_parts, locations = [], [], []
    he_cursor = en_cursor = 0
    for seg in selected["segments"]:
        he = strip(norm(seg["he"]))
        if seg["commentary_he"]:
            he += " " + strip(norm(seg["commentary_he"]))
        en = norm(seg["en"])
        locations.append([seg["index"], seg["siman"], he_cursor, he_cursor + len(he), en_cursor, en_cursor + len(en)])
        he_parts.append(he)
        en_parts.append(en)
        he_cursor += len(he) + 1
        en_cursor += len(en) + 1
    expected_he, expected_en = " ".join(he_parts), " ".join(en_parts)
    hd, ed = he_matches[0], en_matches[0]
    for doc in (hd, ed):
        expected = {"l": ROUTE, "b": "yemei-hatlaos", "t": selected["title"], "h": selected["hebrewTitle"]}
        if any(doc.get(key) != value for key, value in expected.items()):
            raise ValueError("YimaiHaTlaos catalog metadata drift")
    if not isinstance(hd.get("x"), str) or norm(hd["x"]) != expected_he:
        raise ValueError("YimaiHaTlaos Hebrew catalog text drift")
    if not isinstance(ed.get("x"), str) or norm(ed["x"]) != expected_en:
        raise ValueError("YimaiHaTlaos English catalog text drift")
    stable = lambda value: json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    if stable(hd.get("m")) != stable(locations):
        raise ValueError("YimaiHaTlaos catalog owner/location map drift")
    return expected_he, expected_en, locations
