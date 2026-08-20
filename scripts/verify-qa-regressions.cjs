#!/usr/bin/env node
const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = (path) => fs.readFileSync(path, 'utf8');
const gematria = read('src/pages/gematria.astro');
const audio = read('public/unified-audio.js');
const player = read('public/audio-player.js');
const comments = read('src/components/Comments.astro');

assert(!gematria.includes('id="main-content"'), 'Gematria must use Layout’s single #main-content landmark');
assert(!audio.includes('r2.dev/kol-hatzadik'), 'Unified audio must not probe retired R2 per-teaching URLs');
assert(!audio.includes("method: 'HEAD'"), 'Unified audio must not use cross-origin HEAD probes');
assert(audio.includes('window.openAjewAudioPlayer'), 'Hebrew audio button must open the Archive.org player');
assert(player.includes('window.openAjewAudioPlayer = function'), 'Archive.org player must expose its opener');
assert(!comments.includes('/api/comments'), 'Static comments must not call a nonexistent API route');
assert(!comments.includes('/src/lib/supabaseClient.ts'), 'Built comments must not import an unserved source module');
assert(comments.includes(".from('messages')"), 'Comments must read from Supabase directly');
assert(!comments.includes(".insert("), 'Read-only comments must not write through the public client');
assert(comments.includes('Comments are currently read-only.'), 'Read-only state must be explicit to users');

console.log('QA regressions verified: comments, audio, and Gematria landmark');
