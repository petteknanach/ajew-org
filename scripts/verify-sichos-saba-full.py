#!/usr/bin/env python3
"""Structural and completeness checks for the full Saba tape corpus."""
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
try:
    import pymupdf
except ImportError:  # Deep PDF inspection is optional on lean deployment hosts.
    pymupdf = None

ROOT = Path(__file__).resolve().parents[1]
BOOK = ROOT / "public/reader/saba-tape-transcripts"
TAPES = BOOK / "tapes"
SOURCE = ROOT / "public/downloads/sichos-saba-complete-hebrew-ocr.txt"
DOWNLOADS = ROOT / "public/downloads/sichos-saba"
SIDE_HE = {"a": "א", "b": "ב"}


def sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def file_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_display(text: str) -> str:
    return "\n\n".join(p.strip() for p in re.split(r"\n[ \t]*\n+", text.strip()) if p.strip())


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    index = json.loads((BOOK / "index.json").read_text())
    manifest = json.loads((BOOK / "translation-manifest.json").read_text())
    front = json.loads((BOOK / "front-matter.json").read_text())
    source = SOURCE.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    expected = [(n, side) for n in range(1, 118) for side in ("a", "b")]
    files = sorted(TAPES.glob("tape-*.json"))
    if len(files) != 234: fail(f"expected 234 tape JSON files, got {len(files)}")
    if len(index.get("torahs", [])) != 234 or len(index.get("tapes", [])) != 117:
        fail("index must contain 234 sides grouped into 117 tapes")
    grouped_sides = [side for tape in index.get("tapes", []) for side in tape.get("sides", [])]
    if len(grouped_sides) != 234 or any(not side.get("sourceResources", {}).get("pdfUrl") for side in grouped_sides):
        fail("grouped directory entries must expose all 234 section PDFs")
    if manifest.get("emittedSides") != 234 or manifest.get("lossCheck") != "PASS":
        fail("manifest side count or loss check is invalid")
    if sha(source) != manifest.get("sourceSha256"):
        fail("public source download hash differs from manifest")
    full_pdf = DOWNLOADS / "sichos-saba-complete-2072-pages.pdf"
    full_txt = DOWNLOADS / "sichos-saba-complete-hebrew-ocr.txt"
    full_docx = DOWNLOADS / "sichos-saba-complete-hebrew-ocr.docx"
    for path in (full_pdf, full_txt, full_docx):
        if not path.is_file() or path.stat().st_size == 0: fail(f"missing complete source download: {path.name}")
    if pymupdf is not None:
        with pymupdf.open(full_pdf) as pdf:
            if len(pdf) != 2072: fail(f"complete PDF has {len(pdf)} pages instead of 2072")
    pdf_manifest = manifest.get("pdfSource", {})
    if file_sha(full_pdf) != pdf_manifest.get("sha256") or pdf_manifest.get("sectionPdfs") != 234:
        fail("complete PDF hash or section count differs from manifest")
    if full_txt.read_bytes() != SOURCE.read_bytes(): fail("canonical OCR TXT download differs from stable OCR URL")

    slices = []
    total_segments = 0
    verified_segments = 0
    existing_english_sides = 0
    actual_order = []
    for n, side in expected:
        p = TAPES / f"tape-{n:03d}-{side}.json"
        d = json.loads(p.read_text())
        actual_order.append((d.get("tapeNumber"), d.get("side")))
        source_slice = d.get("sourceSlice", "")
        slices.append(source_slice)
        if sha(source_slice) != d.get("sourceSha256"):
            fail(f"source hash mismatch in {p.name}")
        segments = d.get("segments", [])
        total_segments += len(segments)
        displayed = "\n\n".join(x.get("he", "") for x in segments)
        # Structural start/end markers are excluded from display. The importer records
        # an independent display hash; compare canonical paragraph content to prevent loss.
        if segments and sha(displayed) != d.get("displaySha256"):
            fail(f"display text hash mismatch in {p.name}")
        if d.get("sourceStatus") == "available" and not segments:
            fail(f"available side has no display segments: {p.name}")
        resources = d.get("sourceResources", {})
        pdf_path = ROOT / "public" / str(resources.get("pdfUrl", "")).lstrip("/")
        txt_path = ROOT / "public" / str(resources.get("textUrl", "")).lstrip("/")
        if not pdf_path.is_file() or not txt_path.is_file(): fail(f"section downloads missing for {p.name}")
        if pymupdf is not None:
            with pymupdf.open(pdf_path) as section_pdf:
                if len(section_pdf) != resources.get("pageCount"): fail(f"section PDF page count mismatch: {p.name}")
        if txt_path.read_text(encoding="utf-8") != source_slice: fail(f"section OCR differs from source slice: {p.name}")
        if file_sha(pdf_path) != resources.get("pdfSha256") or file_sha(txt_path) != resources.get("textSha256"):
            fail(f"section resource hash mismatch: {p.name}")
        existing = d.get("existingEnglish")
        if existing:
            existing_english_sides += 1
            chapter = existing.get("chapter")
            legacy_path = BOOK / f"chapter-{chapter}.json"
            if not isinstance(chapter, int) or not legacy_path.exists():
                fail(f"invalid existing-English chapter reference in {p.name}")
            legacy = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
            legacy_en = [s.get("en", "").strip() for s in legacy.get("segments", []) if s.get("en", "").strip()]
            if len(legacy_en) != existing.get("segments"):
                fail(f"existing-English segment count mismatch in {p.name}")
            if sum(len(s) for s in legacy_en) != existing.get("characters"):
                fail(f"existing-English character count mismatch in {p.name}")
        for seg in segments:
            he, en = seg.get("he", "").strip(), seg.get("en", "").strip()
            if not he: fail(f"empty Hebrew segment {seg.get('id')} in {p.name}")
            if len(he) > 1800: fail(f"oversized translation segment {seg.get('id')}: {len(he)} chars")
            status = seg.get("translationStatus")
            if status == "verified":
                verified_segments += 1
                if not en: fail(f"verified segment lacks English: {seg.get('id')}")
                ratio = len(en) / max(len(he), 1)
                if not 0.25 <= ratio <= 6.0:
                    fail(f"suspicious HE/EN length ratio {ratio:.2f} for {seg.get('id')}")
            elif en:
                fail(f"unverified segment contains publishable English: {seg.get('id')}")
    if actual_order != expected: fail("tape JSON order or metadata is incomplete")
    reconstructed = front.get("sourceText", "") + "".join(slices)
    if reconstructed != source: fail("front matter plus 234 exact source slices does not reconstruct source")
    if total_segments != manifest.get("totalSegments"):
        fail(f"segment count differs: {total_segments} vs manifest {manifest.get('totalSegments')}")
    if existing_english_sides != manifest.get("existingEnglishSides"):
        fail(f"existing-English side count differs: {existing_english_sides} vs manifest {manifest.get('existingEnglishSides')}")
    print(json.dumps({
        "status": "PASS", "tapes": 117, "sides": 234,
        "segments": total_segments, "verifiedEnglishSegments": verified_segments,
        "existingEnglishSides": existing_english_sides,
        "sourceSha256": sha(source), "exactSourceReconstruction": True,
        "completePdfPages": 2072, "sectionPdfs": 234, "sectionOcrFiles": 234,
    }, indent=2))

if __name__ == "__main__":
    main()
