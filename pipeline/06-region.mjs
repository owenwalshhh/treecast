/**
 * Treecast pipeline, step 6: regional EJ layer for the Inner Core.
 *
 * Reads the re-fetched EJ block groups WITH geometry + GEOID
 * (data/raw/ej/ej-blockgroups.geojson) and writes two app-ready files under
 * public/data/region/ (greater-boston R4 / C3):
 *
 *   ej-block-groups.geojson  — the block-group polygons (lightly simplified so
 *     the file stays well under 5 MB), each carrying GEOID, tract (first 11
 *     GEOID digits, the LEAD join key), municipality, PCT_MINORITY,
 *     LIMENGHHPCT, BG_MHHI, EJ flag and EJ criteria.
 *   town-ej.json  — per-town summary for the "All of Inner Core" overview:
 *     the share of the town's block groups that are EJ-flagged, used to shade
 *     each town outline.
 *
 * NOTE ON LEAD: the tract key is written so DOE LEAD energy burden can be joined
 * later, but no LEAD file is present in the repo yet, so energy burden is left
 * absent (never fabricated). The EJ layer returns only EJ-flagged block groups,
 * so a candidate outside every flagged group honestly has no EJ block group.
 *
 * Run: node pipeline/06-region.mjs   (after data/raw/ej/fetch-geometry.mjs)
 * Requires: @turf/turf.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as turf from "@turf/turf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW = join(ROOT, "data", "raw", "ej", "ej-blockgroups.geojson");
const OUTDIR = join(ROOT, "public", "data", "region");
mkdirSync(OUTDIR, { recursive: true });

const raw = JSON.parse(readFileSync(RAW, "utf8"));

// Simplify each polygon a little (tolerance ~ 0.0001 deg ≈ 10 m). Keeps the
// file small; block-group edges stay recognizable.
const feats = [];
for (const f of raw.features) {
  if (!f.geometry) continue;
  const p = f.properties ?? {};
  const geoid = String(p.GEOID ?? "");
  let simplified;
  try {
    simplified = turf.simplify(f, { tolerance: 0.0001, highQuality: false, mutate: false });
  } catch {
    simplified = f;
  }
  feats.push({
    type: "Feature",
    geometry: simplified.geometry,
    properties: {
      geoid,
      tract: geoid.slice(0, 11), // LEAD join key (county+tract)
      municipality: p.MUNICIPALITY ?? null,
      minorityPct: p.PCT_MINORITY ?? null,
      limitedEnglishPct: p.LIMENGHHPCT ?? null,
      income: p.BG_MHHI ?? null,
      ej: p.EJ ?? null,
      ejCriteria: p.EJ_CRIT_DESC ?? null,
    },
  });
}

const out = { type: "FeatureCollection", features: feats };
const outPath = join(OUTDIR, "ej-block-groups.geojson");
writeFileSync(outPath, JSON.stringify(out, null, 0));

// Per-town EJ share for the overview shading. Every block group in this layer
// is EJ-flagged (the layer IS the EJ-populations layer), so "share" here is the
// count of flagged block groups per town — a density signal for the overview.
const byTown = new Map();
for (const f of feats) {
  const m = f.properties.municipality;
  if (!m) continue;
  byTown.set(m, (byTown.get(m) ?? 0) + 1);
}
const townEj = [...byTown.entries()]
  .map(([town, flagged]) => ({ town, ejBlockGroups: flagged }))
  .sort((a, b) => b.ejBlockGroups - a.ejBlockGroups);
writeFileSync(
  join(OUTDIR, "town-ej.json"),
  JSON.stringify({ note: "Count of EJ-flagged 2020 block groups per Inner Core town (MassGIS EJ2020).", towns: townEj }, null, 2),
);

const bytes = Buffer.byteLength(JSON.stringify(out));
console.log(
  `wrote ${feats.length} block groups (${(bytes / 1e6).toFixed(2)} MB) -> ${outPath}`,
);
console.log(`wrote town-ej.json (${townEj.length} towns)`);
