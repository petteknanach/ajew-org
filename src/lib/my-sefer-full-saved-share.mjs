// Plain-text sharing only: no storage, DOM, network, source rewriting or truncation.
const nonemptyText = value => typeof value === 'string' && value.length > 0;

function block(label, value) {
  // Length is UTF-16 code units, not bytes. Wrapper newlines are not source text.
  return `--- BEGIN ${label} (${value.length} UTF-16 code units) ---\n${value}\n--- END ${label} ---`;
}

export function buildFullSavedShare(sefer) {
  if (!sefer.passages.some(p => nonemptyText(p.savedText))) return null;
  const title = nonemptyText(sefer.name) ? sefer.name : 'My Sefer';
  const parts = [block('SEFER TITLE (metadata, not source)', title)];
  sefer.passages.forEach((p, index) => {
    parts.push(`=== PASSAGE ${index + 1} ===`);
    for (const [key, label] of [
      ['ref', 'REFERENCE (metadata, not source)'],
      ['refHe', 'HEBREW REFERENCE (metadata, not source)'],
      ['readerUrl', 'READER LOCATION (metadata, not source)'],
      ['he', 'HEBREW SOURCE (verbatim)'],
      ['en', 'ENGLISH SOURCE (verbatim)'],
      ['savedText', 'SAVED SOURCE (verbatim)'],
      ['note', 'PERSONAL NOTE (not source)']
    ]) {
      if (nonemptyText(p[key])) parts.push(block(label, p[key]));
    }
    parts.push(`=== END PASSAGE ${index + 1} ===`);
  });
  return {title, text: parts.join('\n\n')};
}

// Injected capabilities keep transport decisions unit-testable without a browser.
// AbortError is cancellation: never fall through to clipboard or manual copy.
export async function deliverFullSavedShare(payload, {share, writeText, manualCopy}) {
  if (typeof share === 'function') {
    try {
      await share(payload);
      return 'shared';
    } catch (error) {
      if (error && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (typeof writeText === 'function') {
    try {
      await writeText(payload.text);
      return 'copied';
    } catch { /* Offer the identical text for explicit manual copying. */ }
  }
  await manualCopy(payload.text);
  return 'manual';
}
