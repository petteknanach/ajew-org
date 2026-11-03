# Exact-post Yom Kippur browser enrichment candidate

Executable scope: `ops/blog-writer/static/share.js` and the single-asset cache
exception in `public/sw.js`. The original 327-byte copy-link handler is retained
verbatim. No SQLite/English source changes or service restarts are required.
The writer script is installed statically after review and merge; publish the
service-worker correction through the unchanged canonical site deployer.

## Contract

- Only `/blog/p/6cf48f1f8a6644a18543a6e966082bd5` and its trailing-slash form
  initialize enrichment. Other paths do no enrichment DOM queries or fetches;
  the existing copy-link listener still installs normally.
- A single fixed same-origin JSON request uses `redirect: error`, no credentials,
  and no-store. Require successful HTTP, JSON MIME, full sidecar SHA256
  `eacf29734e2c5965c0704beaa45f791519745ce32ff1418d7860f88a9c097ef3`, strict
  schema, post/version/title/body-hash pins, all 43 original ordered paragraphs,
  all 43 Hebrew paragraphs, fixed heading indexes, and exact two SVG asset
  metadata records. SHA256 authenticates the exact Hebrew/title/caption bytes too.
- The pinned English list was separately checked against `source-post.json`'s
  published body using writer.py's blank-line splitting and newline normalization.
  Its SHA256 is
  `e5414cd078e760d81ec26429957f6d11976afd3df5178ebc6ba13b26cb6de3c5` (version 2).
- DOM matching compares text nodes and explicit BR newlines, not innerText. It
  rejects unexpected inline nodes. Recheck after asynchronous fetch/digest work.
- Construct detached nodes with createElement/textContent. Insert figures after
  original zero-based paragraph indexes 6 and 34, without replacing/moving any
  original paragraph. Images have intrinsic 900x820 dimensions and responsive
  100% width/max-width 900px/auto height.
- The separate section immediately after the English article has
  `id="yom-kippur-hebrew-translation"`, `lang="he"`, `dir="rtl"`, its title plus
  all 43 translated blocks (h2 at indexes 2,7,16,21,30; p otherwise), and inline
  24px paragraph/subheading presentation. Only newly owned nodes receive styles.
- A per-page state token prevents concurrent/repeated initialization and duplicate
  fetches; the section anchor is a second idempotency check. Failure does not
  mutate original English and emits a real console error; there is no success UI.
  A failed attempt is not retried automatically on that page.

## Reproduce local verification

Requires only existing Node 22; no packages or browsers are installed or shared.

```sh
node --check ops/blog-writer/static/share.js
node --test ops/blog-writer/tests/share-enrichment.test.cjs
git diff --check
```

37 native Node tests execute the actual complete share.js initializer in a VM,
using a minimal DOM adapter and native Response/WebCrypto. Tests cover both
positive paths, original node identity/bytes, image placement, all translated
text/headings/RTL/size, concurrent and repeated initialization, negative paths,
source mismatches, sidecar failures, live source mutation while awaiting fetch,
and the original copy handler's success/failure behavior. Additional explicitly
labelled digest-seam tests exercise defensive schema checks behind the full
cryptographic pin; ordinary positive/tamper tests use real SHA256.

Limits: these are initialization/DOM logic tests, not real SVG decoding or visual
layout tests. Public image MIME/body/hash and browser naturalWidth/naturalHeight,
mobile/desktop rendering, and public route behavior still require parent review
and verification. Source review **and merge to main must precede any executable
installation**. Static-only installation may use the existing per-request reader;
do not invoke the restart/reload installer. No-JS and RSS remain English-only.
The separate large-font Hebrew PDF is outside this source candidate.

## Returning-browser cache correction

The site service worker's generic cache-first JS branch can indefinitely retain
an old `/blog/write/share.js`, even though the writer sends `Cache-Control:
no-store`. Before that generic branch, the exact same-origin GET pathname now
uses network fetch with `cache: 'no-store'`, falling back to its existing cached
copy only on network failure. No cache name, core asset, cache deletion, reader
policy, or browser preference is changed. An uncached offline miss returns an
honest JavaScript 503; HTTP errors are not disguised as success.

```sh
node --test ops/blog-writer/tests/sw-writer-cache.test.cjs
```

The 17 native VM routing tests cover network precedence over an old cached
writer script, query-bearing requests, offline fallback/miss, real HTTP errors,
negative origins/paths/methods, and existing static/reader/calendar/HTML policies.
A whole-byte inverse authenticates every pre-existing service-worker byte.
Returning-reader acceptance additionally requires an ordinary reload in the
same genuinely warmed browser profile after normal service-worker activation,
with no storage clearing, response substitution, or worker/cache bypass.
