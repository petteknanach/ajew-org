import fs from 'node:fs';
import path from 'node:path';

// Existing numbered domain only. In particular, never renumber section 22
// into the absent section 21 or bridge that gap in Previous/Next navigation.
export function hasRamchalSection(contentDir, section) {
  if (!Number.isSafeInteger(section) || section < 1 || section > 22) return false;
  try {
    return fs.lstatSync(path.join(contentDir, `section-${section}.json`)).isFile();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error; // Unexpected I/O must fail the build, not hide a source.
  }
}

export function ramchalSectionPaths(contentDir) {
  const paths = [];
  for (let section = 1; section <= 22; section++) {
    if (hasRamchalSection(contentDir, section)) {
      paths.push({ params: { part: '1', torah: String(section) } });
    }
  }
  return paths;
}
