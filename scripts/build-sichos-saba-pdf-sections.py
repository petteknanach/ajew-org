#!/usr/bin/env python3
"""Publish the complete Sichos Saba PDF/OCR and 234 exact tape-side extracts."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "public/reader/saba-tape-transcripts"
TAPES = BOOK / "tapes"
DOWNLOADS = ROOT / "public/downloads/sichos-saba"
DEFAULT_PDF = Path("/mnt/c/Users/Pettek/Downloads/שיחות סבא.pdf")
DEFAULT_TXT = Path("/mnt/c/Users/Pettek/Downloads/Sichos_Saba_FULL_2072_pages_ABBYY16_OCR.txt")
DEFAULT_DOCX = Path("/mnt/c/Users/Pettek/Downloads/Sichos_Saba_FULL_2072_pages_ABBYY16_OCR.docx")
SIDE_SLUG = {"א": "a", "ב": "b"}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def locate_ranges(doc: pymupdf.Document) -> list[dict]:
    compact_pages = [re.sub(r"[\s\u200e\u200f]+", "", str(page.get_text("text"))) for page in doc]
    expected = [(number, side) for number in range(1, 118) for side in "אב"]
    starts: dict[tuple[int, str], int | None] = {}
    ends: dict[tuple[int, str], int | None] = {}

    for number, side in expected:
        # ABBYY's RTL text layer occasionally places a parenthesis between the
        # tape number and side letter (for example קלטת92)א). Accept that exact
        # layout variation while excluding סוף קלטת markers.
        patterns = (
            rf"(?<!סוף)קלטת{number}{side}",
            rf"(?<!סוף)קלטת{number}\){side}",
            rf"(?<!סוף)קלטת{number}\({side}",
        )
        start_hits = [
            page_number
            for page_number, text in enumerate(compact_pages, 1)
            if any(re.search(pattern, text) for pattern in patterns)
        ]
        end_token = f"סוףקלטת{number}{side}"
        end_hits = [
            page_number
            for page_number, text in enumerate(compact_pages, 1)
            if end_token in text
        ]
        starts[(number, side)] = start_hits[0] if start_hits else None
        ends[(number, side)] = end_hits[-1] if end_hits else None

    # Printed "missing" sides and a handful of RTL labels lack a machine-
    # readable start or end token. Their ranges are still unambiguous because
    # every neighboring side is ordered and the corpus is page-contiguous.
    for i, key in enumerate(expected):
        if starts[key] is None:
            previous = expected[i - 1]
            anchor = ends[previous] or starts[previous]
            if anchor is None:
                raise RuntimeError(f"Cannot infer start page for {key}")
            starts[key] = anchor + 1
    for i in range(len(expected) - 1, -1, -1):
        key = expected[i]
        if ends[key] is None:
            if i + 1 == len(expected):
                ends[key] = len(doc)
            else:
                next_start = starts[expected[i + 1]]
                if next_start is None:
                    raise RuntimeError(f"Cannot infer end page for {key}")
                ends[key] = next_start - 1

    ranges = []
    for i, (number, side) in enumerate(expected):
        start, end = starts[(number, side)], ends[(number, side)]
        assert start is not None and end is not None and start <= end
        if i and start != ranges[-1]["pageEnd"] + 1:
            raise RuntimeError(f"Non-contiguous ranges before tape {number}{side}: {start}")
        ranges.append({
            "tape": number,
            "side": SIDE_SLUG[side],
            "hebrewSide": side,
            "pageStart": start,
            "pageEnd": end,
            "pageCount": end - start + 1,
        })

    if ranges[0]["pageStart"] != 3 or ranges[-1]["pageEnd"] != 2071:
        raise RuntimeError("Expected tape sections to cover PDF pages 3–2071 exactly")
    return ranges


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--ocr-txt", type=Path, default=DEFAULT_TXT)
    parser.add_argument("--ocr-docx", type=Path, default=DEFAULT_DOCX)
    args = parser.parse_args()
    for source in (args.pdf, args.ocr_txt, args.ocr_docx):
        if not source.is_file():
            raise SystemExit(f"Missing source: {source}")

    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    sections = DOWNLOADS / "sections"
    sections.mkdir(parents=True, exist_ok=True)
    complete_pdf = DOWNLOADS / "sichos-saba-complete-2072-pages.pdf"
    complete_txt = DOWNLOADS / "sichos-saba-complete-hebrew-ocr.txt"
    complete_docx = DOWNLOADS / "sichos-saba-complete-hebrew-ocr.docx"
    shutil.copyfile(args.pdf, complete_pdf)
    shutil.copyfile(args.ocr_txt, complete_txt)
    shutil.copyfile(args.ocr_docx, complete_docx)

    # Keep the older stable OCR URL working too.
    shutil.copyfile(args.ocr_txt, ROOT / "public/downloads/sichos-saba-complete-hebrew-ocr.txt")

    doc = pymupdf.open(args.pdf)
    if len(doc) != 2072:
        raise SystemExit(f"Expected 2,072 PDF pages, got {len(doc)}")
    ranges = locate_ranges(doc)

    index_path = BOOK / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    index_by_slug = {str(item["number"]): item for item in index["torahs"]}
    grouped_index_by_slug = {
        str(side["number"]): side
        for tape in index.get("tapes", [])
        for side in tape.get("sides", [])
    }
    manifest_path = BOOK / "translation-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest_by_key = {(item["tape"], item["side"]): item for item in manifest["sides"]}

    for entry in ranges:
        tape, side = entry["tape"], entry["side"]
        slug = f"{tape}-{side}"
        stem = f"tape-{tape:03d}-{side}"
        tape_path = TAPES / f"{stem}.json"
        data = json.loads(tape_path.read_text(encoding="utf-8"))
        pdf_path = sections / f"{stem}.pdf"
        txt_path = sections / f"{stem}.txt"

        section_doc = pymupdf.open()
        section_doc.insert_pdf(doc, from_page=entry["pageStart"] - 1, to_page=entry["pageEnd"] - 1)
        section_doc.set_metadata({
            "title": f"Sichos Saba — Tape {tape}, Side {side.upper()}",
            "author": "Rabbi Yisroel Dov Odesser",
            "subject": f"Original PDF pages {entry['pageStart']}–{entry['pageEnd']}",
        })
        section_doc.save(pdf_path, garbage=4, deflate=True)
        section_doc.close()
        txt_path.write_text(data["sourceSlice"], encoding="utf-8")

        resources = {
            **entry,
            "pdfUrl": f"/downloads/sichos-saba/sections/{stem}.pdf",
            "textUrl": f"/downloads/sichos-saba/sections/{stem}.txt",
            "completePdfUrl": "/downloads/sichos-saba/sichos-saba-complete-2072-pages.pdf",
            "completeTextUrl": "/downloads/sichos-saba/sichos-saba-complete-hebrew-ocr.txt",
            "pdfSha256": sha256_file(pdf_path),
            "textSha256": sha256_file(txt_path),
        }
        data["sourceResources"] = resources
        tape_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        index_by_slug[slug]["sourceResources"] = resources
        grouped_index_by_slug[slug]["sourceResources"] = resources
        manifest_by_key[(tape, side)]["sourceResources"] = resources

    index.update({
        "completePdfUrl": "/downloads/sichos-saba/sichos-saba-complete-2072-pages.pdf",
        "downloadUrl": "/downloads/sichos-saba/sichos-saba-complete-hebrew-ocr.txt",
        "completeOcrDocxUrl": "/downloads/sichos-saba/sichos-saba-complete-hebrew-ocr.docx",
        "pdfPageCount": 2072,
        "sectionPdfCount": 234,
    })
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest["pdfSource"] = {
        "file": complete_pdf.name,
        "sha256": sha256_file(complete_pdf),
        "pages": len(doc),
        "sectionCoverage": "pages 3–2071, contiguous",
        "sectionPdfs": len(ranges),
        "ranges": ranges,
    }
    manifest["ocrDocx"] = {"file": complete_docx.name, "sha256": sha256_file(complete_docx)}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    doc.close()

    audio_map_path = BOOK / "audio-map.json"
    prior = json.loads(audio_map_path.read_text(encoding="utf-8")) if audio_map_path.exists() else {"entries": []}
    legacy = [entry for entry in prior.get("entries", []) if "chapter" in entry]
    canonical = [{
        "tape": entry["tape"],
        "side": entry["side"],
        "verified": False,
        "url": None,
        "recordingId": None,
        "status": "unmatched",
        "notes": "No Cloudflare source filename exactly identifies this tape side; do not infer from topic or sequence number.",
    } for entry in ranges]
    audio_map = {
        "schemaVersion": 2,
        "description": "Audio appears only after an exact tape-side recording match is independently verified.",
        "correlationAudit": "The existing 58-file Cloudflare collection uses topic-based source names and generic R2 object numbers, not tape-side labels 1A–117B; no canonical side was auto-matched.",
        "entries": legacy + canonical,
    }
    audio_map_path.write_text(json.dumps(audio_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({
        "status": "PASS",
        "completePdfPages": 2072,
        "tapes": 117,
        "sectionPdfs": len(ranges),
        "sectionTextFiles": len(ranges),
        "coverage": [ranges[0]["pageStart"], ranges[-1]["pageEnd"]],
        "completePdfSha256": sha256_file(complete_pdf),
        "ocrTxtSha256": sha256_file(complete_txt),
        "ocrDocxSha256": sha256_file(complete_docx),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
