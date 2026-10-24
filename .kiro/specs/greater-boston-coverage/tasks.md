# Tasks — Greater Boston Coverage & Map Upgrade

Ordered so basemap, town picker and the first three towns (Chelsea, Everett,
Revere) come before the remaining towns and the 3D work. Each task cites the
requirements it satisfies. `[ ]` = open, `[x]` = done.

---

## Phase A — Foundations (unblocks the demo path)

- [ ] **A1. Resolve + save the Inner Core list.** Write `pipeline/towns.json`
  with the 21 MAPC ICC municipalities and the source URL. (R2.1)

- [ ] **A2. Parameterize the pipeline by town.** Add `pipeline/run.mjs` taking
  `--town "<Name>"`; no arg = all towns in `towns.json`. Wire `npm run pipeline`.
  (R2.2, R2.3)

- [ ] **A3. MassGIS boundary clipping.** Switch the boundary source to MassGIS
  municipal boundaries; clip buildings, roads, candidates to the town polygon;
  re-clip Chelsea. Output to `public/data/<slug>/`; append to the
  `public/data/towns.json` index (name, slug, counts, bytes). (R2.4, R2.5)

- [ ] **A4. Build Chelsea, Everett, Revere.** Run A2 for the three; verify each
  under 8 MB and the three together keep `public/data` well under 60 MB. (R2.7,
  R2.8, R2.6)

## Phase B — Basemap upgrade

- [ ] **B1. Vector Positron basemap + fallback.** Replace raster OSM with
  OpenFreeMap Positron; fall back to CARTO Positron on load failure. Re-add
  shade/candidates/draw/dim layers on the new style's load. (R1.1, R1.2, R1.5)

- [ ] **B2. Label/POI filtering.** After `style.load`, hide POI icons and all
  labels except street and neighborhood/place names (allowlist by source-layer).
  (R1.3)

- [ ] **B3. Attribution on.** Credit OpenFreeMap + OpenStreetMap (and CARTO on
  fallback). (R1.4)

## Phase C — Town picker + regional overview

- [ ] **C1. Town picker.** Replace the search bar with `TownPicker.tsx` listing
  towns from `public/data/towns.json`; selecting flies the map and loads that
  town via `loadAppData(slug)`. (R3.1, R3.2)

- [ ] **C2. `load-data` by slug.** Parameterize loading by town slug; region
  data loads once. (supports R3.2, R4.*)

- [ ] **C3. Regional overview.** `RegionOverview.tsx`: town outlines shaded by
  EJ-resident share, labeled legend, click-to-open, accessible parallel list.
  (R3.3, R3.4, R3.5)

## Phase D — Regional equity data + per-candidate join

- [ ] **D1. EJ block groups region file.** Precompute MassGIS EJ 2020 block
  groups for all Inner Core towns (geometry + GEOID + EJ criteria + limited-
  English %), simplified < 5 MB, to `public/data/region/`. (R4.1)

- [ ] **D2. LEAD by tract + utility by town.** `lead-by-tract.json` keyed by the
  11-digit tract; `utility-by-town.json` from the Hackachusetts kit. (R4.2, R4.3)

- [ ] **D3. Per-candidate block-group join.** In the candidate stage, attach
  each site's containing block group's EJ criteria, limited-English %, and that
  tract's energy burden; replace the town-wide equity value. (R4.4)

- [ ] **D4. "Why here?" equity + utility.** Show the block group's EJ criteria
  and the town utility, each labeled with its agency. (R4.5, R4.6)

- [ ] **D5. Property tests — equity join.** fast-check: candidate equity == its
  containing block group. (R7.1)

## Phase E — 3D buildings

- [ ] **E1. Extrusion layer.** `buildings-3d` fill-extrusion at minzoom 16,
  height = `coalesce(height, 8)`; pipeline flags `height_estimated` where filled.
  (R5.1, R5.2)

- [ ] **E2. Pitch coupling.** Pitch 45° at zoom ≥ 16 in 3D view, flat below 16;
  `jumpTo` (no animation) under `prefers-reduced-motion`. (R5.3, R5.5)

- [ ] **E3. 2D/3D toggle.** Keyboard-operable corner button with `aria-pressed`.
  (R5.4)

- [ ] **E4. Property test — extrusion.** Missing height ⇒ height 8 + estimated
  flag. (R7.4)

## Phase F — Remaining towns + clipping guarantees

- [ ] **F1. Build the remaining 18 towns** in small batches (memory-aware; may
  fan out to subagents when host memory allows). Boston via **neighborhood
  split** (see design §5); report the choice. (R2.3, R2.6, R2.8)

- [ ] **F2. Property tests — clipping.** Every clipped feature inside its
  boundary; no candidate shared by two neighboring towns. (R7.2, R7.3)

- [ ] **F3. (Conditional) tile-merge test.** Only if the vector-tile building
  fallback is used for any town. (R7.5)

## Phase G — Sources & limits

- [ ] **G1. Sources entries.** Add MAPC, MassGIS town boundaries, and
  OpenStreetMap/OpenFreeMap with links; update `data/sources.json`. (R6.1)

- [ ] **G2. Limits.** Add: heights partly estimated; shade only where the
  pipeline ran; non-Inner-Core towns need a pipeline run. (R6.2)

---

### Suggested build order for the live demo
A1 → A2 → A3 → A4 (Chelsea/Everett/Revere) → B1–B3 → C1–C2 → verify app on three
towns → C3 → D1–D5 → E1–E4 → F1–F3 → G1–G2.
