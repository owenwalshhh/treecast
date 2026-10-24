# Design — Greater Boston Coverage & Map Upgrade

Design for the requirements in `requirements.md`. It keeps Treecast a static,
no-backend site (tech.md): everything heavy is precomputed in `/pipeline` and
written to `/public/data`; the app only reads files.

---

## Overview

Three independent tracks, orderable so the demo-critical path lands first:

1. **App/basemap** — swap raster OSM for a vector Positron style, filter labels,
   add 3D extrusion + a 2D/3D toggle, and a town picker + regional overview.
2. **Per-town pipeline** — parameterize the existing scripts by town, clip to
   MassGIS boundaries, emit `public/data/<slug>/` + an index.
3. **Regional equity** — EJ block groups, LEAD by tract, utility by town, with
   per-candidate block-group join.

Tracks 1 and 2 are wired for Chelsea/Everett/Revere first; the rest of the
towns and the 3D polish follow.

## MAPC Inner Core list (resolved, not guessed)

Source: MAPC Inner Core Committee page, https://www.mapc.org/get-involved/subregions/icc/
(cross-checked against MAPC ICC Work Plan PDFs). 21 municipalities:

Arlington, Belmont, Boston, Brookline, Cambridge, Chelsea, Everett, Lynn,
Malden, Medford, Melrose, Milton, Needham, Newton, Quincy, Revere, Saugus,
Somerville, Waltham, Watertown, Winthrop.

`pipeline/towns.json` shape:
```json
{
  "source": "https://www.mapc.org/get-involved/subregions/icc/",
  "subregion": "MAPC Inner Core (ICC)",
  "accessed": "2026-10-24",
  "towns": [{ "name": "Chelsea", "slug": "chelsea" }, ...]
}
```

## 1. Basemap (src/ui/PlannerMap.tsx)

- Replace the inline raster `BASEMAP` object with a `style` URL:
  `https://tiles.openfreemap.org/styles/positron`. On the map's `error` event
  (or a failed style fetch probed before init), re-create the map with the CARTO
  Positron URL. A `basemapStyle` resolver returns the working URL; one retry.
- **Label/POI filtering:** after `style.load`, iterate `map.getStyle().layers`;
  for every `symbol` layer whose id/source-layer is a POI or non-street label,
  set `visibility: none`. Keep layers whose source-layer is `transportation_name`
  (streets) and `place` entries of type neighborhood/suburb/quarter. Positron is
  already label-light; this is a deterministic allowlist, not per-label tuning.
- **Attribution:** `attributionControl: true` (or a custom control) crediting
  OpenFreeMap + OpenStreetMap, and CARTO when fallback active.
- Shade raster, candidates, draw-area, dim layers unchanged; they re-add on the
  new style's `load` exactly as today.

## 2. 3D buildings (src/ui/PlannerMap.tsx)

- Add a `fill-extrusion` layer `buildings-3d` from the current town's
  `buildings` GeoJSON source. Paint:
  - `fill-extrusion-height`: `["coalesce", ["get", "height"], 8]`
  - `fill-extrusion-color`: a flat theme token; `fill-extrusion-opacity` ~0.9
  - `minzoom: 16`
- Height-estimated flag: the pipeline sets `height_estimated: true` where height
  was absent and filled with 8; the app can tint estimated buildings slightly
  and "Why here?" can note it. (Extrusion height itself is 8 — R5.2/R7.4.)
- **Pitch coupling:** on `zoom` events, if zoom ≥ 16 and view=3D, ease pitch to
  45°; below 16, ease to 0°. With `prefers-reduced-motion`, set pitch with
  `jumpTo` (no animation) — R5.5.
- **2D/3D toggle:** a rail/corner button (reuse the icon-button style). 3D only
  takes effect at zoom ≥ 16; below that the toggle is a no-op visual state. Fully
  keyboard operable with `aria-pressed`.

## 3. Town picker + regional overview (src/ui/)

- New `TownPicker.tsx`: reads `public/data/towns.json`, renders a styled
  dropdown/list (glass style, keyboard list). Selecting sets `activeTown` in
  App; App loads `public/data/<slug>/*` via the existing `load-data` path, now
  parameterized by slug, and calls `map.fitBounds(townBounds)`.
- New `RegionOverview.tsx`: a `fill` layer of all built towns' outlines from
  `public/data/region/town-outlines.geojson`, shaded by each town's EJ-resident
  share (choropleth, colorblind-safe sequential ramp) with a labeled legend
  (reuse legend styling). Click a town → `activeTown` (R3.4). An accessible
  parallel list gives the same choices (R3.5).
- App state gains `view: "town" | "region"` and `activeTown: slug`.

## 4. Data loading (src/ui/load-data.ts)

- `loadAppData(slug)` fetches `public/data/<slug>/{buildings,candidate-sites,
  roads,shade-grid,city-boundary,water}.geojson` and the town's equity rows.
- Region data loads once from `public/data/region/`.
- Fallback demo data only if a town's files are missing (unchanged behavior).

## 5. Per-town pipeline (/pipeline)

- Add `pipeline/run.mjs` entry: parse `--town`; resolve slug(s) from
  `towns.json`; for each, run the existing stages (boundary → buildings → roads
  → equity → candidates → shade) with the town name as the boundary lookup key.
- **Boundary source:** MassGIS municipal boundaries (authoritative town lines),
  replacing the Overture divisions box, so clipping is exact (R2.5, R7.2).
- **Clipping:** every building/road/candidate is kept only if it lies inside the
  town polygon (point-in-polygon for candidates; polygon intersect/clip for
  buildings and roads at the shared border). Neighboring towns share the border
  line, so a candidate falls in exactly one town (R7.3).
- **Index:** after each town, append `{name, slug, buildings, candidates, bytes}`
  to `public/data/towns.json`.
- **Size guard (R2.6):** measure each town's bytes. Boston will exceed 8 MB.
  **Decision (stated per R2.6):** for Boston, use the **neighborhood split** —
  write `public/data/boston/<neighborhood>/` using the city's official
  neighborhood boundaries, and load one neighborhood at a time. Rationale: the
  vector-tile building fallback loses the real `height` attribute we rely on for
  3D and shade, and re-stitching tile-split footprints is error-prone; a
  neighborhood split keeps real Overture heights and bounded file sizes, and the
  resident view is already neighborhood-scale. The tile fallback remains the
  documented Plan B (and R7.5 covers its merge invariant if used).
- **Total-size guard (R2.8):** simplify geometries (building footprints to ~0.5 m
  tolerance, boundaries more) and drop unused properties; the index's byte
  totals make overage visible before commit.

## 6. Regional equity join (/pipeline + app)

- Pipeline writes `public/data/region/ej-block-groups.geojson` (geometry +
  GEOID + EJ criteria + limited-English %), simplified < 5 MB (R4.1).
- `lead-by-tract.json`: `{ "<11-digit tract>": { energy_burden_pct, ... } }`
  (R4.2). Utility: `utility-by-town.json` from the Hackachusetts kit (R4.3).
- **Per-candidate join (R4.4):** in the candidate stage, for each site find the
  block group polygon that contains it, attach its GEOID + EJ criteria +
  limited-English %, and attach the energy burden for that GEOID's tract. This
  replaces the single town-wide equity value. The optimizer keeps consuming an
  `equityNeed` 0–1 but it is now derived per block group.
- "Why here?" (R4.5): show the block group's EJ criteria flags and the town
  utility, both labeled with their agency (data-rules.md).

## 7. Sources & limits (src/ui/SourcesPanel.tsx + data/sources.json)

- Add entries: MAPC (Inner Core definition + URL), MassGIS town boundaries,
  OpenStreetMap/OpenFreeMap. Add the three limits in R6.2.

## 8. Testing (fast-check, /tests)

Property tests mapping 1:1 to R7:
- `equity-join.property.test.ts` — candidate equity == containing block group
  (R7.1).
- `clip.property.test.ts` — every clipped feature inside the boundary (R7.2);
  no candidate in two neighboring towns (R7.3).
- `extrusion.property.test.ts` — missing height ⇒ height 8 + estimated flag
  (R7.4).
- `tile-merge.property.test.ts` — only if the tile fallback ships: split pieces
  merge to one footprint per id, no dupes (R7.5).

Generators build synthetic towns/block groups/candidates so tests are pure and
need no network or real data (tech.md: optimizer/logic is pure, testable).

## Risks

- **Memory/time:** each town bake is minutes and memory-heavy; host is currently
  memory-critical. Build Chelsea/Everett/Revere, verify, then the rest in small
  batches — never all 21 at once.
- **Positron label schema:** OpenFreeMap vs CARTO source-layer names differ
  slightly; the label allowlist is applied per active style after `style.load`.
- **Boston size:** handled by neighborhood split (above).
