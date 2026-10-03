# Psalms importer safety (bounded repair, publication HOLD)

`build_medooyuk_data.py --book Psalms` validates the exact combined corpus before publication. The original review's missing 1:1 XML verse, missing 1:1/wi=1 JSONL record and conflicting earlier duplicate 2:6 XML verse are rejected without changing output. These guards predate this I/O repair; no source/metadata/authority guard is relaxed.

The output writer uses an exclusive sibling temporary file, serialization, flush and file fsync before `os.replace`, then cleans temporary files on failure. Existing POSIX permission bits are retained, new-file permissions follow the process umask, and symlink outputs are refused. This is **one-file replacement**, not a transaction across all books, and does not guarantee power-loss durability, inode/hardlink identity, owner, ACL or xattr retention. Integration remains parent-owned.

The app metadata-only importer refuses in-place/overlapping repo/site output. It stages all 150 Psalms chapters plus manifest in an isolated sibling tree, file-fsyncs them, then renames the completed directory to a new/empty output root. Exact prior output is an idempotent no-op; a differing nonempty prior output is preserved and refused. Use a new root for a new generation. This trades away convenient in-place replacement to avoid chapter/manifest split and unrecoverable retry. The legacy full-import mode is outside this bounded repair.

From the paired app tree, run:

```sh
python3 -B scripts/test-psalms-importer-safety.py --site /path/to/site --evidence /path/to/new-evidence --xml-dir /root/sheva_v0/books --jsonl-dir /root/sheva_render
```

Tests exercise real OS RLIMIT_FSIZE failures before/mid/final staging and site writes, separately labelled injected tempfile/fsync/replace faults, cleanup, preserved prior outputs/permission bits, retries, byte-idempotence, exact original hostile-input cases and recovery. Approved 29 qatan + 79 existing-rule decisions, all 15 holds and byte inverses remain governed by the unchanged combined ledgers/tests. No commit, release, cache-policy, source, rules, gold or corpus edit is part of this repair.
