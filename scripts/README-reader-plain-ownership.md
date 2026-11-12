# Plain-export physical ownership

`npm run verify:reader-plain-ownership` is the complete bounded regression caller
and is included in `verify:base`. It runs the real producer main, its original
117 navigation seeds with real source witnesses, the complete navigation suite,
availability/client and Layout SSR suites, and plain-canonical tests. No site
build or external text import is required.

## Producer graph and defect

- `package.json` build → `scripts/build-reader-plain-text.py::main` → ordinary
  `infer_ids` / `write_teaching` → section TXT/MD/JSON/HTML → generated catalog
  → `by_book` → book HTML and full TXT/MD → sitemaps/navigation.
- Primary membership: `public/reader/catalog.json` → exact part `indexUrl` →
  chapter index items → `tanach-*/part-N/torah-N.json`. Malachi's human template
  `src/pages/reader/tanach-malachi/[part]/[torah].astro` independently emits
  chapters 1–3 and loads those exact three physical sources.
- Commentary membership: `public/reader/likutay-nanach/tanach/index.json` →
  exact file members. A source's `book: tanach-malachi` is its **subject**, not
  its author/namespace. The Malachi template's commentary entry explicitly names
  `book: likutay-nanach` and loads these physical JSON files.
- The old generic `book`/`chapter` inference collided with the primary chapter
  identities. The generated Malachi catalog had seven rows but four unique URLs.
  In pinned base `6a25210908f78164e4b570a9a80db46d49fd1d69`, primary files
  actually won the section writes (lexical traversal); the aggregate then reused
  those bodies under duplicate/commentary headings and mixed in the commentary
  aggregate. Do not describe the live primary section bodies as overwritten by
  commentary: read-only release evidence shows their correct titles and 14/17/24
  verses. The catalog/aggregate ownership was wrong.
- A second loss occurred when `first_text` chose `commentary_he` instead of a
  separately populated `verse`. Both fields are consecutive source material,
  not alternate readings. Preserve both only in the physical commentary owner;
  keep default segment projection unchanged for unrelated books.

## Repair contract

The general resolver replaces the former Genesis-only special case. Every
selected Tanach primary part requires its complete, unambiguous source-index
membership. Every selected commentary subject requires all its indexed files.
Catalogs, titles, metadata identities and counts are checked before output reset;
malformed/missing/ambiguous/symlink inputs fail closed. Distinct physical owners
cannot overwrite the protected destinations, and catalog membership is checked
again before any catalog/full-book publication.

Commentary destinations are `/reader-plain/likutay-nanach/tanach/<physical-stem>/`.
No subject-slug spelling alias is inferred. All original source JSON, fields,
chapter/aggregate witnesses and human-route holds remain intact. The human
commentary `sourceUrl` remains null; no Reader route or runtime JavaScript changes.

The complete affected-domain audit found one stale source-index cardinality:
`tanach-shemos-34.json` already has nine source segments, but its index said eight.
Only that integer is corrected; the existing source teaching is unchanged. This
keeps the complete count guard, rather than exempting that source or silently
omitting its ninth segment.

## Qualification scope

At the above pinned base, a private real-main run consumed exactly 1,982 source
and index inputs (31,364,257 bytes), including all 929 primary chapters of 39
books, all 895 indexed commentary sources, and the 117 genuine navigation-source
witnesses. It emitted 1,941 unique catalog owners and all 117 noindex navigation
pages. Every complete primary body/header and all 15,575 commentary segments were
checked; 5,235 commentary segments carry both verse and commentary fields. No
whole-site checkout/build was performed. Existing lexical aggregate order is
unchanged by this ownership repair.

The historical private `test-sichos-271280-plain.py` caller also copies the new
import closure and all 117 real navigation witnesses. Its expected catalog is
119 (two original qualified/legacy entries plus 117 witnesses), not two. All
131 historical qualification joins and the original 41-owner/57-local/4-global
note assertions remain enforced; no private history or held edition is promoted.

Parent integration still owns independent review, current-main integration,
canonical full verify/build, postbuild and served acceptance. No legacy alias,
nginx configuration, 404 template, publication hold or deployment is changed.
The partial control-book aggregates emitted in private fixtures are test output,
not publication candidates or a substitute for the canonical aggregate build.
