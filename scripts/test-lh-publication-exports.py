"""Regression for mixed-edition outward ownership and retained prior-volume aid joins."""
import html
import importlib.util
import itertools
import json
import tempfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("lh_exports", ROOT / "scripts/lh_publication_exports.py")
assert spec is not None and spec.loader is not None
exports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exports)
data = json.loads((ROOT / "public/reader/likutay-halachos/part-1/halacha-43.json").read_text(encoding="utf8"))
publications = {p["edition"]: p for p in [data["sourcePublication"], *data["sourcePublications"]]}
groups = [(edition, list(rows)) for edition, rows in itertools.groupby(data["segments"], key=lambda row: row["sourceEdition"])]
assert [publications[e]["volume"] for e, rows in groups] == [4, 5]

class Ownership(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.edition = None
        self.records = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "section" and a.get("class") == "source-edition-boundary":
            self.edition = a["data-source-edition"]
        if tag == "section" and a.get("class") == "source-record":
            self.records.append((a["id"], self.edition))

with tempfile.TemporaryDirectory(prefix=".lh-export-test-", dir=ROOT / ".hermes") as directory:
    exports.write_publication(directory, data, "likutay-halachos", "1", "43", "/reader/likutay-halachos/1/43")
    folder = Path(directory) / "likutay-halachos/1/43"
    for extension, prefix in [("txt", ""), ("md", "## ")]:
        text = (folder / ("index." + extension)).read_text(encoding="utf8")
        labels = [prefix + f"Source edition: Likutay Halachos, Volume {publications[e]['volume']} ({e})" for e, rows in groups]
        offsets = [text.index(label) for label in labels]
        assert offsets == sorted(offsets)
        assert all(text.count(label) == 1 for label in labels)
        for i, (edition, rows) in enumerate(groups):
            body = text[offsets[i]:offsets[i + 1] if i + 1 < len(offsets) else len(text)]
            for row in rows:
                for value in [row["he_nikud"], row["en"], *[n["text"] for n in row.get("translatorNotes", [])], *[n["text"] for n in row.get("sourceQualifications", [])]]:
                    if value:
                        assert value in body, (extension, row["index"], edition)
    page = (folder / "index.html").read_text(encoding="utf8")
    parser = Ownership()
    parser.feed(page)
    assert parser.records == [(row.get("canonicalAnchor") or f"segment-{row['index']}", row["sourceEdition"]) for row in data["segments"]]
    for edition, rows in groups:
        assert html.escape(f"Source edition: Likutay Halachos, Volume {publications[edition]['volume']} ({edition})") in page
    raw = json.loads((folder / "index.json").read_text(encoding="utf8"))
    assert raw["segments"] == data["segments"]
    assert raw["sourcePublication"] == data["sourcePublication"]
    assert raw["sourcePublications"] == data["sourcePublications"]

# Source/title associations authenticated by the independent prior-volume audit.
repairs = {"lh-summary-1-7": 6, "lh-summary-1-8": 7, "lh-summary-1-9": 8,
           "lh-summary-1-10": 9, "lh-summary-1-11": 10, "lh-summary-1-12": 11,
           "lh-summary-1-13": 12, "lh-summary-1-14": 13, "lh-summary-1-15": 14,
           "lh-summary-1-16": 15}
items = json.loads((ROOT / "public/reader/likutay-halachos/summaries/index.json").read_text(encoding="utf8"))["items"]
for identity, target in repairs.items():
    item = next(row for row in items if row["id"] == identity)
    target_data = json.loads((ROOT / f"public/reader/likutay-halachos/part-1/halacha-{target}.json").read_text(encoding="utf8"))
    assert item["torah"] == target
    assert item["readerUrl"] == f"/reader/likutay-halachos/1/{target}"
    assert item["hebrewTitle"] == target_data["hebrewTitle"]
    assert item["summaryUrl"].endswith("#summary-" + identity.rsplit("-", 1)[1])
print("PASS mixed43 TXT/MD/HTML explicit ordered source ownership, complete bodies/qualifications and raw JSON; ten authorized stable-anchor aid joins")
