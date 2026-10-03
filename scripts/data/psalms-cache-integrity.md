# Psalms cache integrity and restrictive staging

Candidate-only repair; parent integration, independent review, physical Android,
full rendered Astro/live endpoint and publication gates remain HOLD. No release
version, text/cache revision, corpus, ledger, manifest, classifier or source edit.

## Reviewed-source authentication

`prepare-psalms-cache-integrity.py` plus `psalms-cache-contract.js` are identical
portable generator sources in the app/site trees. Supply explicit `--app` and
`--site`; `--check` verifies deterministic output without writing. The old
annotation-delivery evidence generator and its outputs are not rewritten.

Before generating either output, authenticate the frozen combined ledger, its
qatan authority and the final **whole book**, then reconstruct original/qatan/
final metadata states and compare all three corpus and full-book SHA-256 hashes.
Expected hashes are frozen reviewed authority, not a hash/revision claimed by
incoming JSON. Descriptive top-level fields are authenticated too.

Runtime authentication is synchronous sorted-object-key JSON + standard SHA-256.
The helper has no dependency on WebCrypto/Expo crypto, no async API migration,
no weaker fallback predicate and no mutation-unsafe object-identity memoization.
Unknown field insertion/deletion/change, all source/token/qere/b/L fields, every
held and unrelated tuple, verse/array order and exact Unicode are covered. No
NFC/NFD/CGJ stripping or corpus copy is embedded. Benign object-key order changes
are accepted; arrays and strings retain exact order. Only the three reviewed
whole objects are accepted for legacy reads. Only final is accepted as current.

The actual app loader requires final before current-key writes. Failed/invalid
network responses preserve current and prior copies; an invalid prior current
copy is skipped (not deleted or relabelled), followed by authenticated legacy.
Valid network recovery replaces only current. The actual page authenticates
direct responses and old-worker responses with the three-state predicate, and
requires final for a cached current-key fallback. This allows an old installed
worker to return a genuine legacy object without calling its marks current.
The new worker requires final before return/current-cache put; fallback likewise
checks exact current/legacy objects. Its explicit cache-download message paths
also use the authenticated route instead of bypassing it with `cache.addAll`.

The three page script URLs and worker import include the code-only query
`integrity=sha256-20261003`. This avoids an old worker's cache-first copy of the
previous weak helper **without changing the corpus revision or globally evicting
valid caches/fonts/UI**. Previously cached HTML/old application binaries do not
retroactively gain the new code; native/live upgrade gates remain parent-owned.
An old worker itself still has weak write behavior until updated. The new page
rejects its unauthorized returned/cache objects, but does not claim to rewrite
or prevent the old worker's private background puts.

## Tests

- `node scripts/test-psalms-cache-integrity.cjs SITE OUTPUT_JSON [BEFORE_APP]`:
  actual transpiled loader + explicitly doubled native filesystem/network;
  shared operations cover all 15 holds and unrelated source/qere/k/b/L/unknown
  fields. Rejected current/legacy data produces zero app writes, exact valid
  fallback byte preservation, invalid-current skipping, valid recovery and
  offline reopening. SHA helper matches independent Node crypto vectors,
  million-byte and full-book Unicode payloads; key-order and mutable-object
  revalidation controls are included.
- Site `scripts/test-psalms-cache-integrity-browser.py --app APP --site SITE
  --evidence NEW_ROOT [--before ARCHIVED_SITE]`, with the existing Playwright
  environment: one disposable Chrome with real page/new/old SW/CacheStorage.
  Actual put instrumentation counts zero replacement writes for rejected cases.
  All 35 mutation operations cross direct/new-worker/offline paths. The old
  worker is unedited Git HEAD; an authentic preserved weak-helper cache entry
  is bypassed by the new actual page/helper import URL when available under the
  evidence parent's `before/` snapshot. Message tests dispatch the actual worker
  listener with captured waitUntil promises (not a native/runtime claim).
- `python -B scripts/test-psalms-staging-permissions.py --evidence NEW_ROOT
  [--writer ARCHIVED_BEFORE_WRITER]`: requires root only for setup/chroot, then
  **writer child uid/gid 65534, empty supplementary groups**. ENOSPC is explicitly
  injected at fsync after a genuine 8434-byte first-chapter write. Failure keeps
  empty output unchanged, preserves errno 28 and removes unpublished staging;
  retry matches all 151 chapter/manifest files and preserves final mode 0300.
  A genuine concurrent-population ENOTEMPTY after final chmod also cleans stage
  without masking errno; readonly parent 0555 fails before any publication.

## Bounded C2 contract

Keep the private staging root mode 0700 throughout writes/flush/fsync, then apply
final root mode immediately before directory rename. If rename fails after a
restrictive chmod, restore owner read/write/search before cleanup. This closes
0300 root inheritance/cleanup masking, not an all-filesystem transaction claim.
Inputs/parents and staging descendants must remain stable and owner-accessible;
ordinary umask behavior for descendant directories/files is assumed. Traversal,
ACLs, owner changes or permission revocation by another writer, uncatchable
termination, power loss, directory-fsync durability and adversarial races are
not promised. An already nonempty unreadable output is not a supported readable
idempotence/no-op target; rename must fail closed without replacing its contents.
No incomplete tree is ever intentionally published by the bounded metadata mode.
Historical full-import sequential output remains outside this repair.
