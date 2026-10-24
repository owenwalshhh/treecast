/**
 * Treecast pipeline, step 5: a SHADE GRID for the demo area.
 *
 * For a grid of points across the bbox, estimate what fraction of summer
 * daylight hours each point sits in building shadow. 0 = full sun (hot), 1 =
 * fully shaded (cool). The app colours this red->green and overlays it, toggle-
 * able. Buildings are ONLY backend guidance here: we cast their shadows but do
 * not draw the buildings as the shade layer (per the request).
 *
 * Method (honest, standard sun geometry):
 *   - SunCalc gives the sun altitude + azimuth at the demo lat/lng for several
 *     times across a representative summer day (heat season is what matters).
 *   - A grid cell is shadowed at a given time if, stepping from the cell toward
 *     the sun's azimuth, we hit a building whose height casts a shadow at least
 *     as far as that building: shadow length = height / tan(altitude).
 *   - Shade fraction = shaded samples / total daytime samples.
 *
 * Precomputed here (not in the browser) so the app just loads and recolours.
 *
 * Run: node pipeline/05-shade.mjs
 * Requires: @turf/turf, suncalc (project deps).
 *
 * LIMITS (written into the output + Sources panel): heights are Overture's
 * (missing for ~6% of Chelsea buildings -> treated as a default low height);
 * trees/terrain are ignored; it is a daytime-average, not a single moment.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as turf from "@turf/turf";
import SunCalc from "suncalc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const area = JSON.parse(readFileSync(join(ROOT, "pipeline", "area.json"), "utf8"));
const buildings = JSON.parse(
  readFileSync(join(ROOT, "public", "data", "buildings.geojson"), "utf8"),
);

const { west, south, east, north } = area.bbox;
const center = area.center;

// --- tunables (ASSUMPTION) ---
const GRID = 44; // cells per side (44x44 ≈ 1936 cells; snappy, visible)
const DEFAULT_HEIGHT_M = 6; // for buildings missing a height
const STEP_M = 4; // ray march step toward the sun
const MAX_SHADOW_M = 120; // don't march past this
const SAMPLE_HOURS = [8, 10, 12, 14, 16, 18]; // summer daytime samples
const SAMPLE_DATE = new Date("2026-07-15T12:00:00"); // representative heat day

// Precompute building shadow "reach" is per-time; first index buildings by a
// coarse cell for a fast local lookup.
const feetToDeg = {
  lat: 1 / 364000,
  lng: 1 / (364000 * Math.cos((center.lat * Math.PI) / 180)),
};
const mToDeg = {
  lat: 1 / (364000 * 0.3048),
  lng: 1 / (364000 * 0.3048 * Math.cos((center.lat * Math.PI) / 180)),
};

// Flatten buildings to {polygon, heightM} once.
const polys = buildings.features
  .filter((f) => f.geometry?.type === "Polygon")
  .map((f) => ({
    poly: f,
    h: typeof f.properties?.height === "number" ? f.properties.height : DEFAULT_HEIGHT_M,
  }));

// Sun samples for the representative day (skip night / very low sun).
const sun = [];
for (const h of SAMPLE_HOURS) {
  const d = new Date(SAMPLE_DATE);
  d.setHours(h, 0, 0, 0);
  const pos = SunCalc.getPosition(d, center.lat, center.lng);
  const altDeg = (pos.altitude * 180) / Math.PI;
  if (altDeg < 5) continue; // too low to matter
  // Azimuth from SunCalc: radians from south, + toward west. Convert to a
  // compass bearing (0=N, 90=E) for turf.destination.
  const azDeg = (pos.azimuth * 180) / Math.PI + 180; // 0 = north
  sun.push({ altDeg, azDeg, tanAlt: Math.tan(pos.altitude) });
}

function isPointInAnyBuilding(lng, lat) {
  const pt = turf.point([lng, lat]);
  for (const b of polys) {
    if (turf.booleanPointInPolygon(pt, b.poly)) return true;
  }
  return false;
}

/** Is [lng,lat] shaded for this sun sample? March toward the sun; if we cross a
 *  building whose shadow reaches back to us, it's shaded. */
function shadedAt(lng, lat, s) {
  // Shadow falls OPPOSITE the sun, so to find the building casting onto us we
  // march TOWARD the sun and check if a building there is tall enough.
  const bearing = s.azDeg > 180 ? s.azDeg - 360 : s.azDeg;
  for (let dM = STEP_M; dM <= MAX_SHADOW_M; dM += STEP_M) {
    const dest = turf.destination(turf.point([lng, lat]), dM / 1000, bearing, {
      units: "kilometers",
    });
    const [blng, blat] = dest.geometry.coordinates;
    for (const b of polys) {
      if (turf.booleanPointInPolygon(turf.point([blng, blat]), b.poly)) {
        // Shadow length this building casts = h / tan(altitude).
        const shadowLenM = b.h / s.tanAlt;
        if (shadowLenM >= dM) return true;
        break;
      }
    }
  }
  return false;
}

const features = [];
const cellW = (east - west) / GRID;
const cellH = (north - south) / GRID;

for (let i = 0; i < GRID; i++) {
  for (let j = 0; j < GRID; j++) {
    const lng = west + (i + 0.5) * cellW;
    const lat = south + (j + 0.5) * cellH;
    // Skip cells inside a building (we colour open ground, not rooftops).
    if (isPointInAnyBuilding(lng, lat)) continue;
    let shaded = 0;
    for (const s of sun) if (shadedAt(lng, lat, s)) shaded++;
    const frac = sun.length ? shaded / sun.length : 0;
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [west + i * cellW, south + j * cellH],
          [west + (i + 1) * cellW, south + j * cellH],
          [west + (i + 1) * cellW, south + (j + 1) * cellH],
          [west + i * cellW, south + (j + 1) * cellH],
          [west + i * cellW, south + j * cellH],
        ]],
      },
      properties: { shade: Math.round(frac * 100) / 100 },
    });
  }
}

const out = join(ROOT, "public", "data", "shade-grid.geojson");
writeFileSync(out, JSON.stringify({
  type: "FeatureCollection",
  properties: {
    note: "Shade fraction 0 (full sun) to 1 (full shade), averaged over summer daytime samples. Buildings cast shadows but are not drawn. Heights from Overture; ~6% default-filled. Trees/terrain ignored. Modeled estimate.",
    samples: sun.length,
  },
  features,
}, null, 0));
console.log(`wrote ${features.length} shade cells (${sun.length} sun samples) -> ${out}`);
