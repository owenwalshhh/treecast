/**
 * Re-fetch MassGIS 2020 Environmental Justice block groups WITH geometry and
 * GEOID, for the MAPC Inner Core towns, and save as GeoJSON.
 *
 * The earlier extract (data.csv) was fetched with returnGeometry=false and
 * carried municipality names only — no polygons, no GEOID — so a candidate
 * could not be mapped to its containing block group. This pulls the real layer
 * (polygons + GEOID + per-block-group minority / limited-English / income / EJ
 * criteria) so the pipeline can do the point-in-block-group join (R4).
 *
 * Saves:  data/raw/ej/ej-blockgroups.geojson   (raw, EPSG:4326)
 *
 * Only the Inner Core towns are pulled (pipeline/towns.json) — the slice we
 * need, never the whole state (data-rules.md).
 *
 * Run: node data/raw/ej/fetch-geometry.mjs
 *
 * Source: MassGIS, Environmental Justice Populations 2020.
 *   https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/EJ2020/MapServer/0
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const OUT = join(__dirname, "ej-blockgroups.geojson");

const BASE =
  "https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/EJ2020/MapServer/0/query";
const FIELDS = "GEOID,MUNICIPALITY,PCT_MINORITY,LIMENGHHPCT,BG_MHHI,EJ,EJ_CRIT_DESC";

const towns = JSON.parse(
  readFileSync(join(ROOT, "pipeline", "towns.json"), "utf8"),
).towns.map((t) => t.name);

async function fetchTown(name) {
  // Pull every block group whose MUNICIPALITY matches; geometry in WGS84.
  const where = encodeURIComponent(`MUNICIPALITY='${name}'`);
  const url =
    `${BASE}?where=${where}&outFields=${encodeURIComponent(FIELDS)}` +
    `&returnGeometry=true&outSR=4326&f=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  const j = await r.json();
  return j.features ?? [];
}

const all = [];
for (const name of towns) {
  try {
    const feats = await fetchTown(name);
    all.push(...feats);
    console.log(`  ${name}: ${feats.length} block groups`);
  } catch (e) {
    console.error(`  !! ${name}: ${e.message}`);
  }
}

writeFileSync(
  OUT,
  JSON.stringify({ type: "FeatureCollection", features: all }, null, 0),
);
console.log(
  `wrote ${all.length} block groups across ${towns.length} towns -> ${OUT}`,
);
