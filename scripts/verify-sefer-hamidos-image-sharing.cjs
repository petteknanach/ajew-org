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
  [source.includes("navigator.canShare({ files: [file] })"), 'Actual-image sharing must capability-check a File payload'],
  [source.includes("navigator.share({ title: title, text: shareText, files: [file] })"), 'Native share must include the actual image File'],
  [source.includes('var actualImageBlobCache = new Map()'), 'Image blobs must be primed before the click when possible'],
  [source.includes('window.__shGalleryCurrentItem = item'), 'Gallery app buttons must retain the exact current picture'],
  [source.includes("setActualImageStatus(button, 'Ready — tap again'"), 'Lost user activation must have a second-tap recovery'],
  [!source.includes("shareActualImage(fileShare.getAttribute('data-media-url')"), 'Legacy five-argument gallery call must not return'],
  [!source.includes('https://x.com/intent/post?url='), 'Reader picture buttons must not silently fall back to link-only X sharing'],
  [!source.includes('https://t.me/share/url?url='), 'Reader picture buttons must not silently fall back to link-only Telegram sharing'],
  [!source.includes('https://wa.me/?text='), 'Reader picture buttons must not silently fall back to link-only WhatsApp sharing'],
];
for (const [ok, message] of assertions) {
  if (!ok) throw new Error(message);
}

console.log('Sefer HaMidos actual-image sharing contract OK');
