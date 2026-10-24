# Requirements — Greater Boston Coverage & Map Upgrade

Feature that expands Treecast from one neighborhood (Chelsea) to the MAPC Inner
Core subregion, upgrades the basemap to a vector style with 3D buildings, adds a
town picker and a regional equity overview, and sources per-candidate equity
from the block group that contains each site.

Conforms to steering: static site / no runtime backend (tech.md), all data
precomputed in `/public/data` and reproducible by `/pipeline` (structure.md),
every dataset cited in `data/sources.json` and its agency shown in-UI
(data-rules.md), and every map view has a keyboard-operable, screen-reader
table equivalent with a colorblind-safe palette and `prefers-reduced-motion`
respected (accessibility.md).

EARS keywords: **WHEN** (event), **WHILE** (state), **IF/THEN** (condition),
**WHERE** (feature included), **THE SYSTEM SHALL** (requirement).

---

## 1. Basemap

**R1.1** WHEN the planner map initialises, THE SYSTEM SHALL load the OpenFreeMap
Positron vector style from `https://tiles.openfreemap.org/styles/positron`.

**R1.2** IF the OpenFreeMap style fails to load (network error or non-OK
response), THEN THE SYSTEM SHALL fall back to the CARTO Positron vector style at
`https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`.

**R1.3** WHEN a vector basemap is loaded, THE SYSTEM SHALL hide point-of-interest
icon layers and all symbol labels EXCEPT street names and neighborhood/place
names.

**R1.4** THE SYSTEM SHALL display map attribution crediting OpenFreeMap and
OpenStreetMap contributors (and CARTO when the fallback is active).

**R1.5** THE SYSTEM SHALL leave the existing shade raster overlay and its color
ramp unchanged.

## 2. Greater Boston coverage (MAPC Inner Core)

**R2.1** THE SYSTEM SHALL store the official MAPC Inner Core municipality list,
with its source URL, in `pipeline/towns.json`; the list SHALL be taken from
MAPC's published ICC page, not guessed.

**R2.2** WHEN the pipeline is run as `npm run pipeline -- --town "<Name>"`, THE
SYSTEM SHALL build data for only that town.

**R2.3** WHEN the pipeline is run with no `--town` argument, THE SYSTEM SHALL
build every town listed in `pipeline/towns.json`.

**R2.4** THE SYSTEM SHALL write each town's output to
`public/data/<town-slug>/` and SHALL write an index at `public/data/towns.json`
listing, per town: display name, slug, building count, candidate count, and
total byte size.

**R2.5** THE SYSTEM SHALL clip each town's buildings, candidate sites and roads
to that town's own MassGIS municipal boundary, so adjacent towns meet with no
gap and no overlap. This SHALL also re-clip Chelsea, whose current files cover a
box larger than the city.

**R2.6** IF a town's total output would exceed 8 MB, THEN THE SYSTEM SHALL
reduce it by one documented strategy (neighborhood split, or vector-tile
building fallback), and the chosen strategy and reason SHALL be reported to the
operator.

**R2.7** THE SYSTEM SHALL build Chelsea, Everett and Revere first, and the app
SHALL be verified working on those three before the remaining towns are built.

**R2.8** THE SYSTEM SHALL keep the total size of `public/data` under 60 MB.

## 3. Town picker

**R3.1** THE SYSTEM SHALL replace the current non-functional search bar with a
town picker that lists only towns present in `public/data/towns.json`.

**R3.2** WHEN the user selects a town in the picker, THE SYSTEM SHALL fly the map
to that town's bounds and load that town's data (buildings, candidates, roads,
shade, equity).

**R3.3** WHERE the regional overview is shown, THE SYSTEM SHALL draw every built
town's outline shaded by its share of residents in EJ block groups, with a
labeled legend.

**R3.4** WHEN the user clicks a town in the regional overview, THE SYSTEM SHALL
open that town (as in R3.2).

**R3.5** THE SYSTEM SHALL provide a keyboard-operable equivalent (accessible
list) for both the picker and the overview, per accessibility.md.

## 4. Regional equity data (precomputed, `public/data/region/`)

**R4.1** THE SYSTEM SHALL precompute MassGIS EJ 2020 block groups for all Inner
Core towns, each with geometry and GEOID, simplified so the file stays under
5 MB, into `public/data/region/`.

**R4.2** THE SYSTEM SHALL precompute DOE LEAD energy-burden values keyed by
census tract, where the tract is the first 11 digits of a block group GEOID.

**R4.3** THE SYSTEM SHALL precompute electric utility by town from the
Hackachusetts kit table.

**R4.4** THE SYSTEM SHALL assign every candidate site the equity values (EJ
criteria, limited-English %, energy burden) of the block group whose geometry
contains that site, replacing the current single town-wide value.

**R4.5** WHEN the user opens "Why here?" for a tree, THE SYSTEM SHALL show that
block group's EJ criteria and the town's electric utility.

**R4.6** THE SYSTEM SHALL cite MassGIS, DOE LEAD and the utility table in
`data/sources.json` and name each agency where its data appears (data-rules.md).

## 5. 3D buildings

**R5.1** WHILE the map zoom is 16 or greater, THE SYSTEM SHALL draw buildings
with a `fill-extrusion` layer using each building's `height`.

**R5.2** IF a building has no `height`, THEN THE SYSTEM SHALL extrude it at 8 m
and flag that building as height-estimated.

**R5.3** WHILE zoom is 16 or greater, THE SYSTEM SHALL set the map pitch to 45°;
WHILE zoom is below 16, THE SYSTEM SHALL keep the map flat (pitch 0°).

**R5.4** THE SYSTEM SHALL provide a keyboard-operable "2D / 3D" toggle in a map
corner.

**R5.5** WHERE `prefers-reduced-motion` is set, THE SYSTEM SHALL change between
2D and 3D without animating the camera.

## 6. Sources & limits panel

**R6.1** THE SYSTEM SHALL add to the sources list, each with a working link:
MAPC (Inner Core definition), MassGIS town boundaries, and
OpenStreetMap/OpenFreeMap.

**R6.2** THE SYSTEM SHALL add these limits to the panel: building heights are
partly estimated; shade-grid data exists only where the pipeline ran; any town
outside the Inner Core requires a pipeline run.

## 7. Correctness properties (fast-check)

**R7.1** For any candidate in any town, its equity values SHALL equal those of
the block group whose geometry contains it.

**R7.2** For any town's clipped data, every feature SHALL lie inside that town's
boundary.

**R7.3** For any two neighboring towns, no candidate site SHALL appear in both.

**R7.4** For any building with no height, the extrusion height SHALL be 8 and the
building SHALL be flagged estimated.

**R7.5** IF a vector-tile building fallback is used, THEN for any set of building
pieces split across tile edges, merging SHALL return exactly one footprint per
building id with no duplicates.
