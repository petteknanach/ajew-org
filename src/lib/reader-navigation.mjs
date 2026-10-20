import fs from 'node:fs';
import path from 'node:path';

/**
 * Adapt navigation for the fixed-bound, numeric, single-part Reader templates.
 * Source JSON and its numbering stay unchanged. Never synthesize a missing
 * neighbor or infer an offset: only the exact adjacent source file is eligible.
 * Slug, cross-part and source-qualified editions must keep their own navigation.
 */
export function normalizeReaderNavigation(navigation, {
  book, part, torah, minTorah, maxTorah, contentDir,
}) {
  const empty = { prevUrl: null, nextUrl: null };
  if (typeof book !== 'string' || !book || /[\\/?#%\s]/u.test(book)
      || !Number.isSafeInteger(part) || part < 1
      || !Number.isSafeInteger(minTorah) || minTorah < 0
      || !Number.isSafeInteger(maxTorah) || maxTorah < minTorah
      || !Number.isSafeInteger(torah) || torah < minTorah || torah > maxTorah
      || typeof contentDir !== 'string' || !contentDir) return empty;

  const prefix = `/reader/${book}/`;
  function neighbor(raw, step) {
    if (typeof raw !== 'string' || !raw.startsWith(prefix)) return null;
    const suffix = raw.slice(prefix.length);
    const numeric = suffix.match(/^([1-9]\d*)\/(0|[1-9]\d*)\/?$/);
    const legacy = suffix.match(/^part-([1-9]\d*)\/(?:torah-)?(0|[1-9]\d*)(?:\.json)?\/?$/);
    const match = numeric || legacy;
    if (!match || Number(match[1]) !== part) return null;
    const target = Number(match[2]);
    if (!Number.isSafeInteger(target) || target !== torah + step
        || target < minTorah || target > maxTorah) return null;
    try {
      if (!fs.statSync(path.join(contentDir, `torah-${target}.json`)).isFile()) return null;
    } catch {
      return null;
    }
    // Already-public routes are stable under repeated normalization.
    return numeric ? raw : `${prefix}${part}/${target}`;
  }
  return {
    prevUrl: neighbor(navigation?.prevUrl, -1),
    nextUrl: neighbor(navigation?.nextUrl, 1),
  };
}
