# Private contextual internal-link suggestions

This is a read-only, standard-library Python CLI, not a publisher. It produces
JSON proposals on stdout and errors on stderr (exit 2); it never edits HTML,
CSV, source text, translations or prayers. No HTTP, analytics API, crawling,
packages, build or browser is involved. Run it on the VPS, not the Windows host.

```sh
python3 -B scripts/suggest-contextual-links.py \
  --gsc /absolute/path/paired-page-query.csv \
  --site-root /absolute/path/immutable-built-html
python3 -B scripts/test-contextual-links.py
```

`--gsc` must be a genuinely paired Page/Query export, not separate aggregate
Pages and Queries tables joined by guesswork. Exact UTF-8/BOM-compatible header:
`Page,Query,Clicks,Impressions,Position`. Empty header-only data returns `[]`.
The 8 MiB input limit applies before decoding. Clicks and impressions must be
nonnegative decimal integers, clicks cannot exceed impressions, and position
must be finite and at least 1. Identical repeated page/query observations are
deduplicated; conflicting metrics cause refusal, never inferred aggregation.
Invalid rows fail the entire run without partial JSON. Target URLs must be
literal `https://ajew.org` URLs, without credentials, port, query, fragment,
whitespace, malformed escapes or traversal. A trailing slash is normalized
only for target/self/duplicate comparisons; every returned target URL preserves
its literal input. Search-operator queries such as `site:` and `inurl:` are
excluded from ordinary-demand suggestions. No keyword variants are invented.

Only these editorial source paths are opened, each at `<route>/index.html`:
`/about`, `/start`, `/help`, `/reference`, `/one-library-many-doorways`.
There is no recursive traversal, corpus access or destination-body reading.
Each source is bounded to 1 MiB; absent sources are skipped. Existing root,
route and HTML symlinks are refused, as are nonregular input files. The site
root must be an immutable already-built directory layout; flat `.html` output
is not supported. The CLI trusts the caller's immutability claim and does not
create a snapshot or build. Runtime flags prevent Python bytecode writes.

Candidates are literal case-insensitive whole-word query mentions in paragraph
text. Inline markup/entities are decoded, preserving the natural anchor's case.
No fuzzy matching, stemming or fabricated phrases. Text under existing links,
headings, navigation, script/style, blockquote/q, header/footer/aside,
template/code/pre is excluded, with a separator preventing cross-exclusion
matches. Conservative class/id protection covers source, teaching, translation,
prayer, Hebrew, Torah, sacred, quote, reader, pasuk and verse names;
`data-source*`, `data-teaching*`, `data-translation*`, `data-prayer*`, and
`lang="he..."` are also excluded. Full Na Nach formula paragraphs in common
Latin spelling or Hebrew (including pointed Hebrew) are excluded, even when
the formula is inside an otherwise excluded inline element. These are explicit
conservative rules, not a universal detector of every sacred spelling or
source quotation. Do not run against unreviewed editorial pages containing
unmarked source text; manual source-owner review remains required.

Defaults: target average position 4–20 inclusive, at least 10 impressions,
at most 3 new links per source, target once per source, one proposal per
paragraph. `--min-impressions`, `--min-position`, `--max-position` and
`--max-links` tune the heuristics; the latter accepts 1–3. Candidates are
ordered by impressions descending, position ascending, then URL and query.
An existing target link anywhere in the page (including query/fragment links)
and self-links prevent a new proposal. These are prioritization heuristics,
not promises of rankings, traffic or semantic relevance.

JSON records include `sourceURL`, `naturalanchor`, `targetURL`, `targetquery`,
`impressions`, `clicks`, `position`, `paragraphcontext`, and `requiredReview`.
Text is JSON data, never ready-to-insert HTML; escape it appropriately in any
future renderer. Every suggestion requires a human semantic/context check,
actual destination verification and independent approval before any separate
editorial change. Target validity does not establish target existence.

## Qualification and limits

The 23 focused unittest cases use explicitly **synthetic, not production GSC**
CSV/HTML byte streams in Linux anonymous memory descriptors. They exercise real
bounded reads, parser, scoring/selection and CLI argument/main/stdout/refusal
paths. File opens are constrained and checked for read-only flags and the
explicit editorial allowlist; corpus traversal and unexpected Python opens
are rejected. Tests create no on-disk fixtures. The CLI-positive test invokes
`main(argv)` with the same parser and implementation, not a separate OS process;
this permits positive tests without writing fake production files. This is
not proof of production GSC availability or semantic correctness. Genuine paired GSC intake, immutable-HTML runs and semantic review are separate
from fixture tests. A zero-proposal result is valid; page-only metrics must
never be promoted to invented query/page pairs. No links are automatically
applied or published.
