# Pe’er HaLikutim OCR investigation

Date: 2026-08-03

## What was actually done on 2026-08-02

ABBYY FineReader 16 was **not** used for the existing Torah 1 import.

The source was:

`C:\Users\Pettek\Downloads\Piair halikutim - likutay moharan 1 - 1-6 - Hebrewbooks_org_54911.pdf`

The importer is:

`/root/ajew-org/scripts/import-piair-torah1.py`

It did the following:

1. Opened the PDF with PyMuPDF.
2. Selected source PDF pages 45–64 (Torah 1).
3. Extracted the PDF’s existing text layer with `page.get_text("blocks", sort=True)`; this was extraction, not OCR.
4. Normalized whitespace, removed very short/duplicate blocks, and saved text plus bounding boxes.
5. Assigned five provisional region labels solely from horizontal coordinates.
6. Rendered each page at 1.8× and saved WebP images.
7. Wrote `manifest.json` and the 20-page excerpt PDF.

Evidence: the PDF contains embedded Unicode-mapped TrueType fonts, and PyMuPDF block coordinates/text reproduce the manifest. No ABBYY command/project/export was involved in that import.

## Important defect in the existing manifest

The five labels are only crude coordinate buckets, not the book’s actual section structure. The layout mirrors on odd/even pages, but the importer uses the same x-coordinate rule on every page. It therefore swaps the outside sections on even pages. Example: on source page 46, the visible heading `ערכים וכינויים` at x≈536 is currently labeled `translated-sources-prayer`.

It also collapses ten distinct sections into five labels and sometimes combines multiple headings in one block. The current region labels must not be treated as authoritative.

## Publisher-defined sections and their purpose

The book’s own `מדריך ללימוד הספר הנוכחי` defines the layout:

1. **ליקוטי מוהר״ן** — Rabbi Nachman’s canonical Torah, the central text to which all surrounding material is attached.
2. **סיפור התגלות המאמר** — the known story/background of how that Torah was revealed or delivered.
3. **נחל נובע** — explanation close to the plain meaning of the Torah, assembled from Rabbi Nachman and his disciples, chiefly Likutey Halakhot and related early Breslov works through Rabbi Shimshon Barski.
4. **מקור חכמה** — direct sources for phrases and ideas in the Torah: Tanakh, Chazal, Zohar, Kabbalah, and other works that illuminate the text.
5. **ילקוט הנחל** — supplement to Nahal Novea: explanations from later generations through contemporary Breslov teachers, plus earlier material considered too indirect for the basic Nahal Novea column.
6. **מילואי חכמה** — supplement to Mekor Chokhma: important source material that is more distant from the immediate phrase and therefore omitted from the main source column.
7. **ערכים וכינויים** — concise definitions and sourced meanings of important concepts, terms, and symbolic names used in the Torah.
8. **המתרגם** — Hebrew translations of Aramaic passages quoted in the page.
9. **עצה ותושיה** — practical advice distilled from the Torah, generally from the standard abridgements/practical collections.
10. **ואני תפלה** — a prayer corresponding to the Torah, generally from Likutey Tefilot.

Additional editorial rules from the guide:

- Ordinary quotations preserve the source’s wording; omissions are marked with ellipses.
- In the narrow `ערכים וכינויים` column, material may be shortened without an ellipsis.
- Smaller type often marks source references, editorial links, and secondary material.
- Section streams may continue independently across page boundaries.
- Odd and even pages mirror horizontally, so section identity must be determined from the printed heading and page parity, not x-coordinate alone.

## OCR comparison already run

Representative source page: PDF page 45, the first page of Torah 1.

### Existing PDF text layer / PyMuPDF

Strengths:

- Fast and already supplies word/block coordinates.
- Usually readable Hebrew.
- Best structural witness when extracted region by region.

Weaknesses:

- Some embedded font mappings are wrong, e.g. forms resembling `כפיב נפהליס` instead of `כתיב בתהלים`.
- Whole-page extraction can merge columns and produce bad reading order.
- It is not independent OCR, so it cannot correct mapping errors by itself.

### itspdf.com

Tests performed through its live `image-to-text` service:

- Source page 45 WebP: 0 recognized words.
- Source page 46 WebP: 0 recognized words.
- The 20-page PDF excerpt: 204,270 characters returned, but Hebrew words were reversed and the separate columns were interleaved/flattened. This appears to use the PDF’s embedded text layer rather than perform useful independent OCR on this file.

After mechanically reversing Hebrew runs, the first-page itspdf text overlaps the PyMuPDF witness by about 89% of tokens (unique-word Jaccard 0.799), confirming that it is largely the same underlying witness.

Conclusion: itspdf can remain a third witness, especially for clean single-region PNG/JPEG crops, but the whole Pe’er page/PDF output must not be accepted as structured text.

Saved raw itspdf result:

`/root/ajew-org/analysis/peer-halikutim-ocr/itspdf/full-pdf.txt`

### ABBYY FineReader 16

ABBYY 16 is installed on the Windows computer. It was tested now, not yesterday.

- Running ABBYY directly on the 20-page text-bearing PDF duplicated substantial content because it saw both the embedded layer and OCR/layout material.
- Running ABBYY Hebrew OCR on a fresh 300-dpi raster of page 45 produced a much cleaner independent witness, recognized the printed headings, and preserved region-sized paragraphs reasonably well.
- It corrected errors the PDF layer did not, including `עץ חיים`, `נתקבלים כל התפילות`, and `סיפור התגלות המאמר`.
- It still made errors such as `תהליס` for `תהלים`, `אשלי` for `אשרי`, and occasional confusion among final letters, punctuation, and abbreviations.

ABBYY’s raster witness has about 84% multiset token overlap with the embedded layer. The lower agreement is useful: it is genuinely independent enough to expose errors, but it cannot be treated as ground truth.

Outputs:

- `/mnt/c/Users/Pettek/Downloads/peer-page45-300dpi.png`
- `/mnt/c/Users/Pettek/Downloads/peer-page45-300dpi-abbyy16.docx`
- `/mnt/c/Users/Pettek/Downloads/peer-halikutim-torah1-abbyy16.docx`

### hebrewbooks.pages.dev

Tested live on 2026-08-03 against the exact volume, file ID `54911`, book ID `48008`.

The site does **not** provide a new OCR witness for this volume:

- Its public viewer downloads `54911.pdf` and obtains selectable/region text through PDF.js `pdfPage.getTextContent()` or existing `.textLayer` spans.
- The downloaded PDF has a different container hash and catalog metadata, but all 257 decoded page-content streams, extracted text strings, word coordinates, and page dimensions are identical to the local HebrewBooks PDF.
- Torah 1 pages 45–64 are exact at the text, word-coordinate, and decoded-content-stream levels.
- Raster comparisons of representative mirrored pages 45 and 46 are pixel-identical at 72 dpi.
- The in-book index preserves the known bad mapping `כפיב נפהליס` on page 45 (two hits) and returns no hit for the corrected `כתיב בתהלים`.
- `/api/text?id=54911&raw=true` refuses PDF entries and directs the caller to the PDF endpoint; there is no separate public OCR export for this book.

Therefore, its “Text (OCR)”/region-copy interface is a useful geometric selection tool, but its words are the same embedded-PDF witness already preserved in the manifest. Do not add it as an independent witness or use it to outvote ABBYY. Its region-selection implementation may still inform the importer: select PDF text items by their centers inside semantic rectangles, while retaining exact source coordinates and reading-order warnings.

Saved audit evidence:

- `/root/ajew-org/analysis/peer-halikutim-ocr/hebrewbooks-pages-dev/54911.pdf`
- `/root/ajew-org/analysis/peer-halikutim-ocr/hebrewbooks-pages-dev/comparison.json`
- raw page-45/page-46 text and representative raster comparisons in the same directory.

## Reader-design principle

Pe’er must empower the learner without turning each Torah into an information wall. Use progressive disclosure:

1. The Likutey Moharan text remains visually primary and readable by itself.
2. Show a short, plain-language orientation before detailed sources.
3. Reveal commentary by purpose—explanation, source, concept, practice, prayer—not as one combined stream.
4. Default to only the most relevant assistance for the phrase being studied; deeper material opens on demand.
5. Preserve the reader’s place and clearly show which exact words every note explains.
6. Offer a deliberate path from **understand → deepen → apply → pray**.
7. Never equate completeness with displaying everything simultaneously.

## Correct production workflow

1. Render every source page at 300–400 dpi.
2. Detect page parity and printed section headings.
3. Apply separate odd/even layout templates, then adjust boundaries from actual rules/ornaments.
4. Crop each logical section independently. Never OCR the full page as one stream.
5. Preserve at least these fields for every fragment:
   - source PDF page and printed folio;
   - section identity;
   - bounding box;
   - sequence within that section;
   - heading/subheading;
   - embedded-PDF witness;
   - ABBYY witness;
   - itspdf witness when available;
   - corrected text;
   - confidence/review state;
   - anchor phrase in the central Likutey Moharan text.
6. OCR each crop with ABBYY Hebrew from a raster image. Test the identical crop in itspdf as an additional witness rather than flattening the whole PDF.
7. Align witnesses token by token. Automatically accept exact agreement; flag disagreements involving final letters, similar glyphs, acronyms, punctuation, Aramaic, citations, or low-confidence words.
8. Check disputed central-text passages against a reliable Likutey Moharan edition and disputed quoted sources against the cited work.
9. Keep each section’s own reading order across pages. Link commentary fragments to the nearest quoted/marked anchor in the central Torah; do not append all side columns into one page-wide reading stream.
10. Retain the original page image beside the corrected structured text for audit and future correction.

The current importer now implements the ten-section model and parity-aware classification. Its fragments remain heuristic and unreviewed until region-level witness comparison and editorial correction are completed.