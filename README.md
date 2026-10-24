<p align="center">
  <img src="public/logo.png" alt="Treecast logo" width="96" />
</p>

<h1 align="center">Treecast</h1>

<p align="center">
  <em>Where to plant trees to cool homes and save energy — without raising anyone's heating bill.</em>
</p>

---

## What it is

Treecast is a web app that recommends **exactly where to plant street and yard
trees** across Greater Boston so they cool the residents most at risk from
extreme heat, cut building energy use, and never raise a home's heating bill.

It is built for two users:

- **City foresters / utility tree-program managers** (desktop): set a tree
  budget and an energy-vs-equity slider, run the optimizer, compare it against a
  naive plan, and read the "why here?" reason for every recommended tree.
- **Residents** (phone): tap your home and see which **side** of your house a
  tree would help most — in English, Spanish, and several more languages.

## Why

The 2022 Massachusetts Climate Change Assessment ranks the health effects of
**extreme heat** as the most urgent climate impact on people, and names tree
canopy as a favored response. But a tree's energy effect depends on **where it
stands relative to a building**: west-side shade cuts summer cooling, while in a
heating-dominated climate a tree on the south side can *raise* winter heating.
Treecast encodes that physics so it never recommends a tree that would increase
a home's modeled heating use.

Built for **Hackachusetts 2026**, Climate Tech track (resilient communities;
cleaner, more affordable buildings).

## Features

- **Planner map** with a tree budget, an energy-vs-equity slider, and an
  animated *Optimize*.
- **Naive vs. optimized** plan comparison at the same tree count.
- **"Why here?"** popup for every recommended tree (side of building, shade
  value, heating check, energy burden).
- **Growth slider**, year 0 to 30.
- **Resident phone view** — tap your home, get the best *direction* for a tree
  near it, with an honest property caveat (multi-language).
- **All of Inner Core** overview — every MAPC Inner Core town shaded by its
  count of environmental-justice block groups.
- **3D buildings**, satellite basemap toggle, and a sources & limits panel.

## How it works

- The **optimizer is pure TypeScript** — data in, plan out, no DOM or map — so
  it is unit- and property-tested on its own. A fast-check property test guards
  the invariant that **no recommended tree raises a home's modeled heating use**.
- Placement scoring follows **i-Tree Design** methods (USDA Forest Service):
  sun position (via SunCalc), the tree's bearing and distance to each building
  wall, leaf type (deciduous vs. evergreen), and growth over time.
- Equity weighting blends in each area's environmental-justice profile and
  energy burden, so the plan favors the most heat-exposed, lowest-income
  residents.

## Tech

- **Vite + React + TypeScript** app shell, **MapLibre GL** for the map,
  **Turf.js** for geospatial math, **SunCalc** for sun position.
- **Vitest + fast-check** for unit and property tests.
- **Static site, no backend** — all data is precomputed to app-ready GeoJSON in
  `public/data/` and the app only reads files; nothing is fetched live at
  runtime.
- The data pipeline (`/pipeline`) uses **DuckDB** to query public sources for
  one region and write the per-town GeoJSON. It is run offline to refresh the
  data; it is not part of the running app.

## Data sources (all public, all cited)

- **Overture Maps** — building footprints, roads, and municipal boundaries
  (public GeoParquet on AWS).
- **MassGIS 2020 Environmental Justice** block groups (income, minority,
  limited-English flags).
- **DOE LEAD Tool** — energy burden by census tract.
- **MassGIS** electric utility by town.
- **i-Tree Design** (USDA Forest Service) — the basis for placement scoring.

Every number shown to a user is a **modeled estimate**, labeled as such, and
traces back to one of these sources. No personal data is shipped — building IDs
only, never owner names.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # static build (deploys to Netlify)
npm test         # Vitest unit + property tests
```

### Refresh the data (optional, offline)

The app ships with its data precomputed. To rebuild it for the Greater Boston
towns from the public sources:

```bash
# one-time download of Overture data for the whole region (buildings, roads,
# divisions) into a local cache, so each town then builds from local files:
node pipeline/bake.mjs --prefetch-only

# build every town smallest-first (fast data: buildings, roads, equity):
node pipeline/bake.mjs --small-first --fast-only

# add the full tree planner + shade for specific demo towns:
node pipeline/bake.mjs --town Chelsea --town Everett --town Somerville
```

Requires the DuckDB CLI on `PATH` (or `DUCKDB=/path/to/duckdb`). See
`WINDOWS-BAKE.md` for the Windows walkthrough.

## Principles

- Every number traces to a public, cited source.
- Never recommend a tree that raises a home's heating bill.
- Equity first: weight the most heat-exposed, lowest-income residents.
