# Standalone Tikun Haklali: source-conserving repair

## Delivered candidate

`src/pages/tikkun-klali.astro` now renders all **164** verses from the owned app Original corpus; previously it contained 149 independently edited Hebrew rows. The page explicitly discloses this replacement of its incomplete legacy corpus, including Original divine-name spelling/pointing. Original is the fresh-install default. Both explicit editions are reversible without changing the Original DOM text.

- Restored: 16:5; 41:10; 42:4,9; 59:6,14; 77:9; 90:7; 105:10,12,14,16,23; 137:4,7.
- Preserved all **149 existing English entries** by reviewed chapter/verse identity, not by shifted position. **17** were trapped at the end of transliteration cells; their existing text was separated at the reviewed original boundary, not translated or corrected. The 15 formerly absent verses honestly say existing English is unavailable.
- Legacy transliteration is not asserted to represent the new Original pointing or the alternative edition. It and its former Hebrew variant remain accessible in each matching verse's labelled disclosure. The archived full page is `legacy-tikkun-klali.astro.txt`, hash-bound in the importer, so every displaced character is recoverable.
- Preserved every chapter heading and both separate Psalm 59/90 ritual subtitles. Psalm 95:1–3's prayer variant and its English/transliteration are untouched. The optional biblical companion uses an independent source and does not replace that prayer.
- The fully annotated alternative uses **167 authentic owned source objects**: the 164 main verses plus Psalm 95:1–3. The shared `AjewMarkedHebrew` API is reused; `public/medooyuk.js`, general Reader templates and frozen annotations/fonts were not modified. Source objects are exact to both the existing app bundle and site Psalter. No runtime text network call is added.
- Alternate English is not supplied. Pointing/divine-name/punctuation/qere differences are disclosed. Special-nikud and accents controls operate only on this named alternative. Persisted settings, incomplete-source/renderer and font-delivery failure are tested; failures do not silently show Original under the alternate label.

`src/data/tikkun-klali.json` carries the exact Original/legacy/annotation provenance, full per-verse records, restored-reference ledger, split-cell ledger and annotated source hashes. The independently owned corpus is UXLC 2.5 with its existing ajew annotations; this task does not adjudicate its editorial readings or classify any new word. In these 167 objects the frozen source has 356 `na`, 293 `nach`, 21 `uncertain` records, 21 independent `qb` flags, and no positive `qk` or explicit U+05C7. Controls do not invent qatan decisions to increase coverage.

## Gates

```sh
python3 scripts/import-klali-sources.py ../app-klali-followup --check
python3 scripts/test-klali-sources.py ../app-klali-followup
npx astro dev --host 127.0.0.1 --port <free-port>
# Use actual URL reported by Astro; it advances if that port is occupied.
# Then run companion app tests/prayer-psalm-browser.py and prayer-psalm-pixels.py.
```

The source gate checks all 164 identities and exact Original strings, all 149 retained English records, all 167 annotated objects, and rejects omissions, duplicate identity, shifted English, pointing changes, annotation deletion/reclassification, qere changes, ritual-heading loss and drift of either pinned source input. Browser gates execute the actual Astro route at 390px/1100px, three real theme selections, all four mark/accent modes, exact 167 rendered source strings, retained headings/prayer, complete Original restoration, English identity, persistence and unavailable-source/font states. Paint smoke confirms actual loaded glyph changes with identical source and geometry on app and site.

Final evidence: `C:/Users/Pettek/Ajew-Nikud-Repair-20261002/klali-followup/evidence`. The original attribute-only theme screenshots were not valid night-mode proof; they are retained separately. Final tests exercise the actual theme buttons and final screenshots were inspected.

## Remaining boundaries

This is a candidate, not a published change. No site deploy, Reader rewrite, frozen rule/gold/font change, APK, emulator or Play action. Existing English semantics and pronunciation remain inherited, not independently certified; missing English remains missing by design. Incidental Psalms phrases in authored prose are not classified. App Chatzos retains non-Psalms biblical/liturgical sections unmarked with an explicit limitation; its exact prayer corpus is unchanged. The separately approved Original 103:5 correction does not intersect these displayed direct-consumer ranges.
