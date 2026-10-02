# Bounded Psalms qatan metadata follow-up

Only 29 already-approved form-scoped qamats decisions are applied. Twenty-four
paired records change from `uncertain`/`qb=1` to `nach`/`qb=0`; five retain their
existing `nach`. No text, rule, frozen fixture, qere, other annotation, boundary,
UI, cache revision or release version changes are authorized here.

`data/psalms-qatan-ledger.json` is a pinned, portable application ledger, not new
gold. It records full source fields, complete before/after metadata, whole-verse
hashes, raw token and zero-based letter/codepoint coordinates, unchanged fixture
records/file hashes, provenance, and attributed MAM corroboration. Source JSON
and Unicode are never normalized. The overlay accepts only exact complete
before/after states; reversal restores the original arrays and serialization.

The XML/JSONL builder applies this overlay to Psalms before opening output. Its
`--book Psalms` switch prevents a 39-book regeneration. The bundled-study
importer also applies it to old frozen inputs. Its metadata-only mode preserves
all non-m fields, English and translations, validates all 150 chapters before
writing, and refreshes only matching chapter manifest hashes. Use isolated
output roots first. Missing targets, source drift, unexpected/duplicate metadata,
qere-target changes and altered ledger/fixture/witness hashes fail closed.

## Gates

From either candidate repository:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test_psalms_qatan.py
```

From the app candidate (SITE and EVIDENCE must be explicit absolute paths):

```sh
npx --no-install tsc --noEmit
node scripts/test-psalms-qatan-consumers.cjs "$SITE"
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test-psalms-qatan-importers.py   --site "$SITE" --evidence "$EVIDENCE/new-importer-gates"   --xml-dir /root/sheva_v0/books --jsonl-dir /root/sheva_render
```

The importer gate requires a new evidence directory. It runs both actual
importer CLIs, including old/repaired inputs and rejected mutations, and verifies
failed imports leave existing output untouched. Consumer tests run the actual
app network/cache loader (native I/O doubled), bundled study loader, parse model,
Original source-exact attachment, alternative-edition adapter, shared app/site
font-feature renderers and site Tikun renderer. They are **not Android/browser
pixel evidence**. Original eligibility remains 8/2527, with zero attached qk;
these fixes serve the explicit annotated edition, not a source substitution.

## Isolated production-import commands

```sh
PYTHONDONTWRITEBYTECODE=1 python3 "$SITE/scripts/build_medooyuk_data.py"   --book Psalms --xml-dir /root/sheva_v0/books --jsonl-dir /root/sheva_render   --out-dir "$EVIDENCE/site-importer"
PYTHONDONTWRITEBYTECODE=1 python3 scripts/ingest-succos-study.py   --site "$SITE" --repo "$PWD" --psalms-metadata-only   --output "$EVIDENCE/app-importer"
```

For exact reversal, call `apply_book(data, reverse=True)` or
`repair_verse('Psalms', chapter, verse, row, reverse=True)` and retain the original
serializer. The corpus tests require byte-exact reversal against the frozen base.

## Delivery and later integration

No push/build/deployment/version bump is part of these candidates. App cache
revision remains `uxlc25-gold-qk-ketiv-20260928-v2`: network-first replaces the disk
book after site delivery, but offline old disk data remains old until refreshed.
Site SW `ajew-v2-capital-t-20261002-r1` uses stale-while-revalidate for reader JSON;
Reader/Tikun/Chok request the unversioned book and may retain a session copy.
A later parent-owned release can consider a Psalms-only data revision/URL key,
not a global font/UI or all-book cache bump. Bundled chapters need a new app
release; the already-reviewed 1.6.14/code27 artifact cannot be replaced.

The separate 83-label review includes another mark in Psalm 104:24. This ledger
intentionally pins its complete m array. Any later authorized overlapping repair
must explicitly reconcile the ledgers and tests; do not weaken the drift guard.
Held 21:2 and 94:1, parked forms, and all 11 extraction omissions remain untouched.
