import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Additive, hash-bound visual reviews. Existing folder metadata stays intact.
const document = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/images/gallery-labels.json'), 'utf8'));
const assets = document.assets || {};
const validated = new Map();
export function getGalleryMetadata(folder, filename) {
  const key = `${folder}/${filename}`;
  if (!assets[key]) return {};
  if (!validated.has(key)) {
    try {
      const bytes = fs.readFileSync(path.join(process.cwd(), 'public/images', folder, filename));
      const digest = createHash('sha256').update(bytes).digest('hex');
      validated.set(key, digest === assets[key].sha256 ? assets[key] : {});
    } catch (_) { validated.set(key, {}); }
  }
  return validated.get(key);
}
export const mediaLabels = {
  photograph: 'Reviewed photograph / צילום שנבדק',
  'document-facsimile': 'Document facsimile / צילום מסמך',
  'flat-texture': 'Flat texture / טקסטורה שטוחה',
  composite: 'Collage or text overlay / קולאז׳',
  illustration: 'Illustration / איור',
  'generated-artwork': 'Generated artwork / אמנות שנוצרה',
  unreviewed: 'Not visually reviewed / טרם נבדק חזותית'
};
export function galleryMediaKind(folder, filename) {
  return getGalleryMetadata(folder, filename).mediaKind || 'unreviewed';
}
export function galleryMediaLabel(folder, filename) {
  return mediaLabels[galleryMediaKind(folder, filename)] || mediaLabels.unreviewed;
}
export function gallerySearchText(folder, filename, legacy = {}) {
  const reviewed = getGalleryMetadata(folder, filename);
  // Review caveats are NOT search tags: "not a tallis" must not create a hit.
  return [filename, reviewed.title || legacy.title, reviewed.alt || legacy.alt,
    legacy.text, ...(legacy.categories || []), ...(reviewed.categories || []),
    ...(reviewed.aliases || []), ...(reviewed.subjects || [])].filter(Boolean).join(' ');
}
export function galleryExtraFiles(folder) {
  // Known extensionless document photos are exposed without renaming bytes.
  return Object.keys(assets).filter(key => key.startsWith(`${folder}/`))
    .map(key => key.slice(folder.length + 1))
    .filter(filename => !filename.includes('/') && !/\.(jpg|jpeg|png|gif|webp|svg|tiff)$/i.test(filename)
      && fs.existsSync(path.join(process.cwd(), 'public/images', folder, filename)));
}
