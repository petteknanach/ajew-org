import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const sha = value => createHash('sha256').update(value).digest('hex');

// A publication snapshot, not an eternal negative cache. Old HTML must fail open
// after one day, including when only public data was copied in a later release.
export function commentaryAvailability(root = process.cwd(), now = Date.now()) {
  try {
    const directory = path.join(root, 'public/reader/chok/commentary');
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    // An unreadable/ambiguous publication input cannot establish any absence.
    if (entries.some(entry => entry.name.endsWith('.json') && !entry.isFile())) return null;
    const files = entries.filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(entry => entry.name).sort();
    return {
      schema: 'chok-optional-commentary/v1',
      clientSHA256: sha(fs.readFileSync(path.join(root, 'public/chok.js'))),
      generatedAt: now,
      filesSHA256: sha(JSON.stringify(files)),
      files,
    };
  } catch {
    return null;
  }
}
