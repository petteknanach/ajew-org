# Psalms annotation delivery contract

This is metadata-only delivery of 79 parent-approved existing rule/form-scoped decisions on top of the separately reviewed 29 qatan targets. It introduces no gold, rules, source corrections, normalization, qere substitution, or changes to Original Reader eligibility.

## Exact portable ledger

`psalms-annotation-ledger.json` carries the approved rows with authority/provenance, codepoint/token/letter coordinates, all 15 held rows (diagnostic proposals **not applied**), complete non-m fields and original/qatan-only/final m arrays for 104 distinct affected verses. Canonical SHA-256 is pinned by `../psalms_annotation_overlay.py`. The original qatan ledger/overlay remains frozen and intentionally rejects the final combined corpus.

`apply_book(data)` accepts ONLY an entire exact original, exact qatan-only or exact final corpus and returns final metadata. `target='qatan'` restores the exact qatan candidate; `reverse=True` (or `target='before'`) restores the original. Every state has a pinned whole-corpus hash. No mixture/partial repair, duplicate or source/metadata drift is accepted. The input object is never mutated. Unknown descriptive book-level fields are preserved; all verse fields are pinned. The helper `repair_verse` checks the full affected verse, not just the target tuple. Both actual importers use the full-book gate before output writes.

### Psalm 104:24 (zero-based tuple coordinates)

The prior qatan packet changes `[5,2,'uncertain',1]` to `[5,2,'nach',0]` and adds `[5,1,'qk',0]`. The approved sheva packet independently changes `[7,1,'uncertain',1]` to `[7,1,'na',0]`. Final metadata retains **both** decisions. The ledger explicitly stores all three complete arrays/hashes; an old whole-array proposal must not overwrite the qatan change. Tests reject that overwrite, partial states, and duplicate tuples.

## Conservation and counts

All 150 chapters / 2527 verses are gated. All source tokens, qere flags/tails, break/letter metadata, Original Hebrew, English, other fields and books remain unchanged. The 50 qere shevas, all 15 holds, 21:2, 94:1 and parked exact forms remain untouched. The 79 rows occupy 76 verses across 49 chapters; only those app chapter hashes change relative to the qatan candidate. There are 52 na refreshes, 22 nach refreshes and 5 appended inline-tail nach marks.

Final raw census: na 5294, nach 4789, uncertain 352, qk 29, qb 340, marks 10464. `qb` is still not a qatan label. Byte-inverse tests reconstruct all original and qatan-candidate chapter/site bytes; the manifest differs only in affected chapter hashes.

## Import and test

Run from the applicable repository, with Python bytecode disabled. Site:

```sh
python3 -B scripts/build_medooyuk_data.py --book Psalms --xml-dir /root/sheva_v0/books --jsonl-dir /root/sheva_render --out-dir /path/to/isolated-output
```

App (metadata-only, offline; no full import needed):

```sh
python3 -B scripts/ingest-succos-study.py --site /path/to/site --repo /path/to/app --psalms-metadata-only --output /path/to/isolated-output
python3 -B scripts/test-psalms-annotation-importers.py --site /path/to/site --evidence /path/to/new-evidence --xml-dir /root/sheva_v0/books --jsonl-dir /root/sheva_render
```

Both actual importers validate before writing. The app metadata-only mode **refuses in-place, ancestor/descendant, or symlink output overlapping its repo/site**. Use a new/empty isolated root; all 150 chapters and the manifest are written and file-fsynced into a sibling staging tree before a single directory rename makes that completed output visible. Staging failures leave absent/empty output unchanged and clean the staging tree. A nonempty differing prior output is refused without writes; an exact existing 151-file output is a no-op. This deliberately gives up automatic replacement/in-place convenience: use a new root for a different generation, review it, and let the parent integrate separately. Neither this isolated publication nor per-file replacement is a multi-file repository transaction or a power-loss durability guarantee. The old full-import mode is outside this bounded repair and has no new transactional guarantee.

Site output uses a sibling exclusive temporary file, flush/file fsync, then `os.replace` with cleanup on failure. Existing permission bits are preserved; new files use the process umask. Symlink outputs are refused. It does not preserve inode/hardlink identity, ownership, ACLs/xattrs or promise an all-books transaction; parent integration must handle those separately if relevant. The exact original review's missing Psalm 1:1, missing 1:1 wi=1 JSONL record, and earlier conflicting duplicate 2:6 XML cases are rejected by the existing combined corpus/parser guards before output changes; no linguistic/data guard was loosened.

Run `python3 -B scripts/test-psalms-importer-safety.py --site /path/to/site --evidence /path/to/new-evidence --xml-dir /root/sheva_v0/books --jsonl-dir /root/sheva_render` for real RLIMIT_FSIZE first/mid/final staged write failures, injected fsync/create/promotion faults, cleanup, retry, idempotence, mode preservation and the exact hostile-input replays.

Both repositories: `python3 -B scripts/test_psalms_annotations.py` and `python3 -B scripts/test_psalms_qatan.py`. The importer test actually runs both CLIs with original/qatan/final inputs, all nine app source/bundle combinations, repeat runs and failure cases; failures must leave prior output bytes untouched. Historical qatan tests project the combined final corpus back to the exact qatan state. Combined tests independently apply approved rows and gate the shipped final corpus.

## Psalms-only cache freshness

The data revision is `psalms-annotations-20261002-r1`, not an app/build/global-cache version. Other books retain their old URL/key. The generated contract authenticates the complete reviewed book using canonical sorted-key JSON and SHA-256, including every source, qere, held metadata and descriptive field. Only the exact final book is accepted at the current key; legacy reads accept only the three exact reviewed original/qatan-only/final states. The helper's additional `integrity=sha256-20261003` code query bypasses cached weak helper bytes without changing the corpus or global cache revision. An old worker may still make weak background writes until updated, but the new page refuses unauthorized data. See `psalms-cache-integrity.md` for the bounded integrity/staging contract and native-I/O qualifications. App network-first delivery writes a separate Psalms disk key; a failed fetch or invalid replacement falls back to existing validated data. It never deletes the old key. Website SW uses network-first only for Psalms, preserves the existing global namespace, validates replacements before cache.put, and retains legacy fallback copies. The shared loader also reads old CacheStorage copies when an older installed worker cannot service the new URL offline. Reader/Tikun/Chok use the shared revision; Psalms no longer remains in Chok's session-long book cache. Persisted Reader page reopens refetch.

Offline-before-refresh may legitimately show **old metadata**; it is not represented as updated. Online recovery then serves/saves final data, including after reopening. Entirely stale offline HTML/JS cannot execute new code until it reconnects; preserved old content remains readable. No fonts or unrelated offline books are evicted.

Cache verification: `node scripts/test-psalms-cache.cjs /path/to/site` (app native I/O doubled, not Android); site `scripts/test-psalms-cache-browser.py --site /path/to/site --evidence /path/to/new-evidence` (Playwright + owned real Chrome, no CDP9334); `node scripts/test-psalms-loader-init.cjs /path/to/evidence` (jsdom full init, not visual/native proof). Set `JSDOM_PATH` when jsdom is not resolvable in the environment.

No push, deployment, Android/native build, app/versionCode bump or Play action is part of this delivery. Website boundary helpers and app first-ink/picker behavior are retained. Parent-only app boundary commit 8264168 is not included.
