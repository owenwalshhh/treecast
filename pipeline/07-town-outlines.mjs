/**
 * Treecast pipeline, step 7: town outlines for the "All of Inner Core"
 * overview (greater-boston C3 / R3.3).
 *
 * Builds one outline polygon per Inner Core town by DISSOLVING that town's EJ
 * block groups (public/data/region/ej-block-groups.geojson) — no new network
 * call, and the outline exactly matches the equity data it will be shaded by.
 *
 * HONEST METRIC: the EJ layer carries only EJ-FLAGGED block groups, so the
 * outline covers the flagged part of a town, and `ejBlockGroups` is the count
 * of flagged groups — a need/density signal, not a share of the whole town
 * (we don't have the non-flagged denominator). The legend says so.
 *
 * Writes public/data/region/town-outlines.geojson, each feature carrying:
 *   town, slug, ejBlockGroups, avgMinorityPct (mean over the town's flagged
 *   groups), built (true if the pipeline has baked that town's data).
 *
 * Run: node pipeline/07-town-outlines.mjs   (after 06-region.mjs)
 * Requires: @turf/turf.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as turf from "@turf/turf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const REGION = join(ROOT, "public", "data", "region");
const DATA = join(ROOT, "public", "data");

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const bg = JSON.parse(
  readFileSync(join(REGION, "ej-block-groups.geojson"), "utf8"),
);

// Group block groups by municipality.
const byTown = new Map();
for (const f of bg.features) {
  const m = f.properties?.municipality;
  if (!m || !f.geometry) continue;
  if (!byTown.has(m)) byTown.set(m, []);
  byTown.get(m).push(f);
}

const features = [];
for (const [town, feats] of byTown) {
  // Dissolve this town's block groups into one (multi)polygon.
  let outline = feats[0];
  for (let i = 1; i < feats.length; i++) {
    try {
      outline = turf.union(outline, feats[i]) ?? outline;
    } catch {
      /* keep what we have on a union hiccup */
    }
  }
  // A little simplify to keep the file small.
  try {
    outline = turf.simplify(outline, { tolerance: 0.0002, highQuality: false, mutate: false });
  } catch {}

  const minorities = feats
    .map((f) => Number(f.properties?.minorityPct))
    .filter((n) => Number.isFinite(n));
  const avgMinority =
    minorities.length > 0
      ? Math.round(minorities.reduce((s, n) => s + n, 0) / minorities.length)
      : null;

  const slug = slugify(town);
  const built =
    (slug === "chelsea" && existsSync(join(DATA, "candidate-sites.geojson"))) ||
    existsSync(join(DATA, slug, "candidate-sites.geojson"));

  features.push({
    type: "Feature",
    geometry: outline.geometry,
    properties: {
      town,
      slug,
      ejBlockGroups: feats.length,
      avgMinorityPct: avgMinority,
      built,
    },
  });
}

const out = { type: "FeatureCollection", features };
const outPath = join(REGION, "town-outlines.geojson");
writeFileSync(outPath, JSON.stringify(out, null, 0));
const bytes = Buffer.byteLength(JSON.stringify(out));
console.log(
  `wrote ${features.length} town outlines (${(bytes / 1e6).toFixed(2)} MB) -> ${outPath}`,
);
