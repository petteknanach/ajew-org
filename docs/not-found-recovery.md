# Source-safe 404 recovery and text sitemap

## Scope and ownership

Based on `6a25210908f78164e4b570a9a80db46d49fd1d69`. Local-only change; no push, deployment, nginx, package, Reader citation/runtime, primary/commentary export-producer, source-text or catalog edits.

`src/pages/404.astro` is the real page producer. `public/404.html` is an empty historical file, not the deployed page's owner. The real live 404 at the pinned release was generated from Astro with the shared Layout, which also loaded analytics. The replacement is a small standalone bilingual page: it preserves the original quotation and attribution verbatim, but does not load analytics or Reader code under an untrusted incoming URL. It retains `noindex,nofollow`, deliberately emits no canonical for an unknown URL, and sends no Referer. The incoming address/query/fragment is neither reflected nor searched, persisted, redirected or rewritten.

The three qualified books use exact catalog IDs and existing catalog English/Hebrew titles. Recovery points to actual numeric-part directories, not the broken legacy `part-N/torah-N` spelling. Only the requested book and a catalog-member part can be preferred; an unknown book is never assigned an owner. No teaching number is inferred. Other books remain available through the library. The search GET form forwards only user-entered words and the selected catalog book to the existing search control's `book`/`q` contract. Static directory links remain usable with scripting disabled or the initializer blocked; the no-script notice states that text search itself needs JavaScript.

The current nginx `error_page 404 /404.html` plus `internal` location preserves status. Its normal `try_files` and Reader numeric-directory rule are unchanged, as are all existing aliases. Both existing service workers already return online HTTP failures unchanged. Their cold offline HTML fallbacks now return 503 rather than a homepage/offline document with a fabricated 200. Warm valid offline pages remain supported; cache names, precaches and source JSON strategies are unchanged.

## `/sitemap.txt`

`robots.txt` correctly advertises `sitemap-index.xml`; no robots changes are needed. There was no root text-sitemap producer. The existing `reader-plain/sitemap.txt` belongs to the raw-text export producer and is not a root canonical HTML sitemap.

The existing `npm build` already ends in `python3 scripts/postbuild-seo-sitemaps.py`. That producer prunes empty Reader error wrappers, repairs qualified plain metadata, admits only real self-canonical indexable HTML, and emits the canonical numbered XML graph. It now also emits `dist/sitemap.txt` from precisely the same ordered, deduplicated admitted URL list. The XML index and raw manifests keep their existing roles. No XML redirect or raw-export promotion is introduced. Text has one absolute URL per UTF-8 line, a final newline, and explicit 50,000-URL/50-MB limits; malformed, query-bearing and control/backslash-encoded locations fail validation. All preparation is validated before sitemap writes. Existing nginx `txt` MIME supplies `text/plain` without configuration changes.

## Tests exercised

- `python3 scripts/test-search-sitemaps.py`: 19 tests passed, including the actual postbuild `main()` entry, XML/text parity, holds/noindex/noncanonical/missing exclusions, duplicates, limits, malformed input and artifact preservation.
- `node --test scripts/test-not-found-service-workers.mjs`: both actual worker fetch-listener tests passed, including all 17 paths, online 404 over historical cached 200, cold offline 503 and valid warm cache preservation. These are real-script Node handler tests, not installed-browser-worker certification.
- `scripts/build-not-found-recovery-fixture.mjs`: an actual isolated Astro build of the unchanged candidate 404 source and actual search components, without a substitute renderer or initializer.
- `scripts/test-not-found-recovery-browser.py`: real private nginx with the unchanged routing snippets and Chrome. All listed 17 paths passed GET/HEAD and initialized correctly at HTTP 404; 10 unknown/traversal/encoded-injection cases stayed 404 without an owner; all 8 downloaded genuine directory/JSON controls stayed byte-exact HTTP 200; no original-query/referrer/analytics leakage; 3 native form handoffs reached the unchanged search controls with the right book/query. Native keyboard/focus, 44px targets, 320/390/1280 widths, light/dark, enlarged text, no-script and blocked-script fallback were exercised.
- The actual final live `sitemap-0.xml` graph replay produced 30,087 unique URL lines with text SHA-256 `e33e6198f2ec68eac03b02702f38056c791138271b46e2ee2d441c50071b1125`; private nginx GET/HEAD returned `200 text/plain`, exact bytes and no Location header. This is genuine graph replay, not fresh admission against every production HTML body.

The isolated search-control fixture consumes a genuine pre-existing generated light index copied read-only from the shared checkout; it proves the three book-filter handoffs, not current search-result quality or a full production search-page build. No screen-reader certification or aggregate production build is claimed.

An optional pre-existing `test-readable-stam-offline.cjs` fails on both base and candidate because its VM omits `self.location` while the base worker already accesses `self.location.origin`. Initial sparse-fixture execution also lacked its font/geometry files; supplying their exact base bytes reached the identical base/candidate VM defect. This unrelated harness was not weakened or altered, and is not reported as passed.

## Parent integration

Cherry-pick the scoped commit onto the parent's current integration base; do not use or reset the older shared `main` checkout. Keep the citation-runtime and Malachi-export lanes separate. Do not alter the 53 existing nginx aliases.

Run the normal aggregate production build on the integration successor: it already invokes both the sitemap regression suite and the modified postbuild producer. Also run the new worker regression above and the native fixture below. Use the integration checkout's genuine generated catalog and light index, not made-up fixture books.

Example private native qualification (paths are arguments, not permission to overwrite an existing fixture):

```sh
AJEW_TEST_DEPENDENCIES=/path/to/dependencies node scripts/build-not-found-recovery-fixture.mjs /new/private/fixture
python-with-playwright scripts/test-not-found-recovery-browser.py --dist /new/private/fixture/dist --nginx /path/to/nginx --controls /path/to/genuine-release-positive-controls --sitemap /path/to/final/sitemap-0.xml --output /new/private/receipts
```

Controls used here are the pinned release's five directory `index.html` files for Likutay Moharan parts 1/2, Likutay Tefilos parts 1/2, and Sipurey Maasiyos part 1, plus `reader/catalog.json`, `reader/likutay-moharan/part-2/torah-1.json`, and `reader/likutay-tefilos/part-1/prayer-1.json`. The 17 invalid paths are committed in `scripts/fixtures/not-found-recovery-paths.json` and exactly match the parent's source summary.

Before authorized publication, compare the integration `dist/sitemap.txt` line list to every canonical numbered XML child after admission, preserving holds/exclusions; confirm a nonempty generated `dist/404.html` and local CSS/JS assets. After publication, separately verify all 17 real HTTP 404s, `/sitemap.txt` HTTP 200 with `text/plain` and complete graph parity, unchanged valid Reader/source paths, ordinary warmed-browser behavior and existing aliases. Deployment/public acceptance belongs to the parent.
