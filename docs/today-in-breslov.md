# Today in Breslov

The homepage links to `/today-in-breslov`. The calendar matches Hebrew day and
month across all registered years, with English, Hebrew and Both modes. Each
record carries a brief bilingual description and links to its dated source.

## Files

- `public/data/today-breslov-events.json`: published, committed register.
- `scripts/build-today-breslov.py`: deterministic source-bound extraction and
  reviewed narrative records. It never edits a source book.
- `src/data/today-breslov-reviewed.json`: explicit identity bindings, reviewed
  header exceptions, metadata corrections, complete-body duplicate joins, and
  contextual narrative dispositions. Change only after source review.
- `/today-in-breslov/sources/`: persistent human-readable copies of the six
  pre-existing calendar/database records without an owning Reader passage.
- `public/today-breslov-calendar.mjs`: offline Hebrew/Gregorian conversion via
  Intl and local sunset calculation. Jerusalem is the explicit default;
  geolocation is opt-in. Gregorian dates are proleptic Gregorian, daytime dates.
- `public/today-breslov.mjs`: date navigation, matching, source cards and filters.
- `scripts/test-today-breslov*.mjs` and `scripts/test-today-breslov-data.py`:
  calendar, full initialization, lifecycle, source/route and provenance tests.

## Updating the register

Run the builder from a complete current checkout:

    python3 scripts/build-today-breslov.py
    npm run verify:today-breslov

For a sparse checkout, pass `--source-root` explicitly. Compare any changed
source hashes and records before replacing an already reviewed register.
The normal verification chain checks that the committed register is exactly
reproducible, preventing a stale register from silently missing source updates.

Only source-owned exact dates qualify. Record the original Hebrew year as a
number or `null`, never a guessed year. A civil-only death year does not identify
the Hebrew year. Relative weekdays/parshas, uncertain dates, conflicting dates,
and unspecific multi-day holidays need source review, not automatic inference.
Keep ordinary Adar, Adar I and Adar II distinct. Generic Adar with no source year
remains explicitly unspecified when displayed during a leap year.

Every event requires `id`, `month`, `day`, `year`, `kind`, bilingual `title` and
`description`, nonempty `sources`, and provenance. Source links use actual
Original paragraph IDs from the owning route. Do not invent anchors or substitute
aligned-view numbering. Alim Litrufa currently has no paragraph IDs, so those
links open the owning letter, with the exact paragraph retained in provenance.

A date quoted inside a story is not automatically the date of the whole story.
Review the exact event sentence and necessary surrounding context. Existing
English manuscript translations are not metadata authority merely because a
field is nonempty. Newly authored descriptions must stay within Hebrew evidence.
The existing yahrzeit policy requires source-resolved Breslov dates through 1980;
later deaths require the owner's explicit approval. Never silently resolve a
conflict or make the new page certify an older calendar entry's historical truth.

## Verification and publication

Run source data checks, full client initialization, date/leap-year/sunset and
loading/navigation regressions. Transform the changed Astro templates and inspect
real mobile/desktop pixels. A two-route private Astro fixture qualifies only the
new routes; it does not replace the canonical full build. Publish only through
main and the canonical VPS publisher, then verify the exact served register,
module bytes, homepage entry, language controls and source navigation.

The page is a growing register, not a claim of exhaustive historical knowledge.
An empty date means no event is registered, not that nothing happened.
