# Treecast — Tech

## Stack
- Vite + React + TypeScript — app shell and build.
- MapLibre GL — map rendering.
- Turf.js — geospatial math (distance, bearing, buffers).
- SunCalc — sun position for shade scoring.
- Vitest + fast-check — unit and property tests.
- DuckDB — the data pipeline only, not in the app.

## Shape
- Static site. No backend. No server at runtime.
- All data is precomputed and lives in `/public/data` as app-ready GeoJSON.
- The app only reads files; it never fetches from a live API.

## Deploy
- Netlify, static build from `vite build`.

## Data sources (all public, all cited)
- Overture Maps building footprints and roads (GeoParquet on AWS, queried with
  DuckDB for one bounding box).
- MassGIS 2020 environmental justice block groups (income, minority,
  limited-English flags).
- DOE LEAD Tool energy burden by census tract.
- MassGIS electric utility by town.
- i-Tree Design methods (USDA Forest Service) as the basis for placement
  scoring.

## Rules
- The optimizer is pure TypeScript: no DOM, no map, no React. It takes data in
  and returns a plan out, so it can be tested on its own.
- Geospatial units are explicit (meters, degrees); never mix them silently.
- Any scoring constant (shade value, heating penalty) is named and commented
  with its source.
- Property tests (fast-check) guard the invariant that no recommended tree
  raises a home's modeled heating use.

## Commands
- `npm run dev` — local dev server.
- `npm run build` — static build for Netlify.
- `npm test` — Vitest.
- Pipeline scripts in `/pipeline` are run by hand to refresh `/public/data`.
