# ajew-ananach App — Improvement Backlog

## Search
- [ ] **Split search index by language** — build `search-index-he.json` + `search-index-en.json` (like ajew.org does with gzip). Detect `navigator.language`, load preferred half first, lazy-load other. Cuts download from ~full size to ~half for most users.
- [ ] **Expand from 4 books to full 245-book library** — current `deploy-mobile-api.js` deploys only 4 books. Build index from the full `public/reader/` corpus (same source as website).

## Content Coverage
- [ ] **Likutay Halachos — full 600 halachos with English** — the website just hit 600/600. App should reflect this.
- [ ] **Likutay Tefilos** — 422 prayers, all now with English.
- [ ] **Alim LiTrufa** — 513 letters with English + standalone HTML view.
- [ ] **Ebay HaNachal** — parts 1-3, Hebrew + English complete.
- [ ] **Yisroel Saba** — 93 chapters, fully realigned HE-EN.
- [ ] **LN Oral Torah (Vol 3)** — per-daf/mishna commentary on 82 tractates.
- [ ] **LN Tanach (Vol 1-2)** — verse-by-verse on 24+ books.

## Data Quality
- [ ] **Run safeguard checks in the app build pipeline** — validate HE-EN alignment, detect scrambled content, Psalm contamination. Mirror `.hermes/safeguard-check.py`.

## App Features
- [ ] **Full-text search tab** — currently only filters book titles. Add deep content search using the split index.
- [ ] **Offline search** — bundle the preferred-language index with the app for instant offline queries.
- [ ] **Daily wisdom from full corpus** — current `daily-wisdom.json` is a static placeholder. Cycle through real teachings from LM, LH, LT, Saba, etc.
- [ ] **Bookmarks sync** — sync bookmarks across devices via simple API.

## Build/Deploy
- [ ] **Update Expo SDK** — currently 55.0.x. Check latest.
- [ ] **CI/CD for index rebuild** — auto-rebuild `search-index.json` when website content updates.
- [ ] **App size optimization** — lazy-load audio assets, compress bundled JSON.

## P1 (do together)
- Split search index
- Expand to full library
- LH 600/600
