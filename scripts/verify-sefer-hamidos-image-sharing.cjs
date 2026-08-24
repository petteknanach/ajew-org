#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(process.cwd(), 'src/pages/reader/sefer-hamidos/[part]/[torah].astro');
const source = fs.readFileSync(sourcePath, 'utf8');

const requiredPlatforms = ['X', 'Telegram', 'WhatsApp', 'Facebook', 'Instagram'];
for (const platform of requiredPlatforms) {
  if (!source.includes(`data-share-app="${platform}"`)) {
    throw new Error(`Missing actual-image share action for ${platform}`);
  }
}

const assertions = [
  [source.includes('async function shareActualImage(button)'), 'Actual-image sharing must receive the clicked button'],
  [source.includes("navigator.canShare({ files: [file] })"), 'Native share must capability-check a File payload'],
  [source.includes("navigator.share({ title: title, text: shareText, files: [file] })"), 'Native share must include the actual image File'],
  [source.includes('var actualImageBlobCache = new Map()'), 'Image blobs must be primed before native sharing'],
  [source.includes('data-share-url={mediaShareUrl(img)}'), 'Platform buttons must carry the image-specific preview-page URL'],
  [source.includes("shareCard.getAttribute('data-share-url')"), 'Legacy rendered cards must supply the image-specific preview-page URL'],
  [source.includes("twitter.com/intent/tweet?text="), 'Desktop X must receive the picture preview link'],
  [source.includes("t.me/share/url?url="), 'Desktop Telegram must receive the picture preview link'],
  [source.includes("wa.me/?text="), 'Desktop WhatsApp must receive the picture preview link'],
  [source.includes("facebook.com/sharer/sharer.php?u="), 'Desktop Facebook must receive the picture preview link'],
  [source.includes("navigator.clipboard.writeText(shareUrl)"), 'Instagram fallback must copy the picture preview link'],
  [source.includes("desktopShareTarget(app, shareUrl, shareText)"), 'Desktop platform buttons must build a real share intent'],
  [source.includes('window.__shGalleryCurrentItem = item'), 'Gallery app buttons must retain the exact current picture'],
  [source.includes("setActualImageStatus(button, 'Ready — tap again'"), 'Lost user activation must have a second-tap recovery'],
  [!source.includes("shareActualImage(fileShare.getAttribute('data-media-url')"), 'Legacy five-argument gallery call must not return'],
];
for (const [ok, message] of assertions) {
  if (!ok) throw new Error(message);
}

console.log('Sefer HaMidos actual-image sharing contract OK');
