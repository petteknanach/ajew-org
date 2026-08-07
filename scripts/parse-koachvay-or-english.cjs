#!/usr/bin/env node

// Intentionally disabled. The former importer distributed English blocks by
// proportional position whenever source/canonical segment counts differed.
// That method silently paired unrelated English and Hebrew throughout Kokhvei
// Or. Reviewed bilingual pairs are now locked by alignment-manifest.json and
// scripts/verify-kokhvei-or-alignment.cjs.

console.error(
  'REFUSED: parse-koachvay-or-english.cjs used proportional block distribution and corrupted bilingual alignment. ' +
  'Extract source text for manual semantic realignment instead; reviewed pairs are locked by alignment-manifest.json.'
);
process.exit(1);
