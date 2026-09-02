#!/usr/bin/env python3
"""Verify the source-faithful bilingual Kaftor VaFerach Reader edition."""
import argparse, gzip, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
READER = ROOT / "public" / "reader" / "kaftor-vaferach-a"
SOURCES = ROOT / "sources" / "kaftor-vaferach-a"
EXPECTED_PDF_SHA256 = "f5261e608a6034cd07011e162823bd496f0fa7e8b188a8c467aa94072e50a2a0"
EXPECTED_CORPUS_SHA256 = {
    "he": "a814373ee53ff6c2ceb399a75d57f5bbae74dbd154d54781fef891628a94be50",
    "en": "ede80de564ee4a4b00895d936ca4ad0670338ca45a4ab777acbef6ac22993cd9",
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--require-search", action="store_true")
    args = ap.parse_args()

    pdf = READER / "source.pdf"
    assert pdf.is_file() and hashlib.sha256(pdf.read_bytes()).hexdigest() == EXPECTED_PDF_SHA256
    witness = json.loads((SOURCES / "reviewed-edition.json").read_text(encoding="utf-8"))
    assert witness["sourcePdfSha256"] == EXPECTED_PDF_SHA256
    assert [p["pdf_page"] for p in witness["pages"]] == list(range(1, 20))
    index = json.loads((READER / "index.json").read_text(encoding="utf-8"))
    assert index["hebrewTitle"] == "כפתור ופרח" and index["totalTorahs"] == 19 and len(index["torahs"]) == 19

    total = 0
    corpus = {key: hashlib.sha256() for key in ("he", "en")}
    for page, expected_page in enumerate(witness["pages"], 1):
        data = json.loads((READER / f"section-{page}.json").read_text(encoding="utf-8"))
        segments = data["segments"]
        aligned = data["aligned_segments"]
        assert data["book"] == "kaftor-vaferach-a" and data["pdfPage"] == page
        assert data["facsimileImage"] == f"/reader/kaftor-vaferach-a/scans/{page:02d}.jpg"
        assert (READER / "scans" / f"{page:02d}.jpg").is_file()
        assert [s["index"] for s in segments] == list(range(1, len(segments) + 1))
        expected_pairs = expected_page["segments"]
        assert [(s["he"], s["en"]) for s in segments] == [(s["he"].strip(), s["en"].strip()) for s in expected_pairs], f"review witness drift page {page}"
        assert aligned == [{"index": s["index"], "he": s["he"], "en": s["en"]} for s in segments]
        assert all(s["he"].strip() and s["en"].strip() and s["he_nikud"] == s["he"] for s in segments)
        snapshot = (SOURCES / f"hebrew-page-{page:02d}.txt").read_text(encoding="utf-8").rstrip("\n")
        assert snapshot == "\n\n".join(s["he"] for s in segments), f"Hebrew snapshot drift page {page}"
        for s in segments:
            for key in corpus:
                corpus[key].update(f'{page}\0{s["index"]}\0{s[key]}\n'.encode())
        total += len(segments)
    assert total == 54
    assert {key: value.hexdigest() for key, value in corpus.items()} == EXPECTED_CORPUS_SHA256

    catalog = json.loads((ROOT / "public/reader/catalog.json").read_text(encoding="utf-8"))
    books = [b for b in catalog["books"] if b.get("id") == "kaftor-vaferach-a"]
    assert len(books) == 1 and books[0]["parts"][0]["totalTorahs"] == 19
    route_root = ROOT / "src/pages/reader/kaftor-vaferach-a/[part]"
    assert (route_root / "index.astro").is_file() and (route_root / "[torah].astro").is_file()
    assert "source.pdf#page=" in (route_root / "[torah].astro").read_text(encoding="utf-8")

    if args.require_search:
        for lang in ("he", "en"):
            with gzip.open(ROOT / f"public/data/light-search-index-{lang}.json.gz", "rt", encoding="utf-8") as fh:
                docs = json.load(fh)
            hits = [d for d in docs if d.get("b") == "kaftor-vaferach-a"]
            assert len(hits) == 19, (lang, len(hits))
            assert all(d.get("l", "").startswith("/reader/kaftor-vaferach-a/1/") and d.get("x", "").strip() for d in hits)
        meta = json.loads((ROOT / "public/reader-search/meta.json").read_text(encoding="utf-8"))
        hits = [d for d in meta["items"] if d.get("c") == "kaftor-vaferach-a"]
        assert len(hits) == 19, len(hits)

    print(json.dumps({"pages": 19, "aligned_segments": total, "empty_hebrew": 0, "empty_english": 0, "source_verified": True, "search_verified": args.require_search, "hashes": EXPECTED_CORPUS_SHA256}))

if __name__ == "__main__":
    main()
