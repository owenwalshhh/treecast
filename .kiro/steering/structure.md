# Treecast — Structure

## Layout
```
/pipeline        DuckDB scripts that build app data from raw sources.
/data/raw        Source files as downloaded. Never edited by hand.
/public/data     App-ready GeoJSON. The only data the app reads.
/src/optimizer   Pure TypeScript placement scoring. No DOM, no map, no React.
/src/ui          React components, map, sliders, popups.
/src/i18n        English and Spanish strings.
/tests           Vitest and fast-check tests.
/scripts         Hook helpers.
/docs/kiro       Screenshots for the write-up.
```

## Flow of data
1. Raw sources land in `/data/raw` (never edited).
2. `/pipeline` scripts read `/data/raw`, query Overture with DuckDB, join the
   MassGIS, LEAD, and utility layers, and write GeoJSON to `/public/data`.
3. The app reads only `/public/data`. It never touches `/data/raw` or the
   pipeline.

## Boundaries
- `/src/optimizer` depends on nothing from `/src/ui`. Data in, plan out.
- `/src/ui` imports the optimizer, never the reverse.
- `/src/i18n` holds every user-facing string. No hard-coded English in `/src/ui`.

## Naming
- Files: kebab-case (`tree-score.ts`).
- React components: PascalCase (`PlannerMap.tsx`).
- GeoJSON in `/public/data`: one file per layer (`buildings.geojson`,
  `ej-block-groups.geojson`, `candidate-sites.geojson`).

## Rules
- `/data/raw` is read-only input. If a source changes, re-run the pipeline; do
  not patch files in place.
- Everything in `/public/data` must be reproducible by running `/pipeline`.
- Tests live in `/tests` and import from `/src`.
