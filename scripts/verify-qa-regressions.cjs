#!/usr/bin/env node
const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = (path) => fs.readFileSync(path, 'utf8');
const gematria = read('src/pages/gematria.astro');
const audio = read('public/unified-audio.js');
const player = read('public/audio-player.js');
const comments = read('src/components/Comments.astro');
const layout = read('src/layouts/Layout.astro');
const readerCss = read('src/styles/reader.css');
const readerScript = read('public/reader-script.js');
const nginx404 = read('ops/nginx-static-404.conf');
const commentary = read('src/components/CommentarySidebar.astro');
const yahrzeit = read('src/components/CompactYahrzeit.astro');

assert(!gematria.includes('id="main-content"'), 'Gematria must use Layout’s single #main-content landmark');
assert(!audio.includes('r2.dev/kol-hatzadik'), 'Unified audio must not probe retired R2 per-teaching URLs');
assert(!audio.includes("method: 'HEAD'"), 'Unified audio must not use cross-origin HEAD probes');
assert(audio.includes('window.openAjewAudioPlayer'), 'Hebrew audio button must open the Archive.org player');
assert(player.includes('window.openAjewAudioPlayer = function'), 'Archive.org player must expose its opener');
assert(player.includes('bottom:calc(64px + env(safe-area-inset-bottom))'), 'Mobile audio must clear the bottom tab bar');
assert(player.includes('body.has-commentary-sidebar-open #ajew-audio-player'), 'Desktop audio must clear the commentary sidebar');
assert(player.includes("bookId === 'sefer-hamidos'"), 'Suno manifest requests must be limited to books with a shipped manifest');
assert(player.includes('if (!SUNO_SONGS_URL) return Promise.resolve(null)'), 'Missing Suno manifests must not be requested');
assert(layout.includes('/audio-player.js?v=20260821-final-overlap'), 'Audio player asset must use the final overlap cache version');
assert(readerCss.includes('width: calc(100% - clamp(340px, 40vw, 560px))'), 'Reader content must clear the open commentary sidebar');
assert(readerScript.includes("let notesBtn = document.getElementById('btn-notes')"), 'Notes setup must reuse the existing button');
assert(readerScript.includes("notesBtn.dataset.readerNotesBound !== '1'"), 'Notes setup must bind once');
assert(nginx404.includes('try_files $uri $uri.html $uri/ =404;'), 'Unknown static routes must return 404');
assert(nginx404.includes('error_page 404 /404.html;'), 'Custom 404 page must preserve HTTP 404');
assert(commentary.includes('bottom: calc(140px + env(safe-area-inset-bottom))'), 'Mobile commentary toggle must clear audio and navigation');
assert(yahrzeit.includes('max-height: 260px'), 'Desktop yahrzeit box must not cover the reader toolbar');
assert(yahrzeit.includes('@media (min-width: 769px)'), 'Desktop yahrzeit must support its compact state');
assert(yahrzeit.includes('.compact-yahrzeit.collapsed'), 'Desktop yahrzeit must render collapsed by default');
assert(yahrzeit.includes('top: 64px'), 'Mobile yahrzeit box must clear bottom controls');
assert(!comments.includes('/api/comments'), 'Static comments must not call a nonexistent API route');
assert(!comments.includes('/src/lib/supabaseClient.ts'), 'Built comments must not import an unserved source module');
assert(comments.includes(".from('messages')"), 'Comments must read from Supabase directly');
assert(!comments.includes(".insert("), 'Read-only comments must not write through the public client');
assert(comments.includes('Comments are currently read-only.'), 'Read-only state must be explicit to users');

console.log('QA regressions verified: comments, audio, and Gematria landmark');
