/**
 * Treecast pipeline, step 4: candidate tree sites ACROSS THE WHOLE CITY.
 *
 * Instead of a few predetermined spots around sampled buildings, we lay a fine
 * grid over the city and keep every grid point that is a valid place to plant:
 *   - inside the city boundary (never Boston / the margin),
 *   - not over water,
 *   - not inside a building footprint,
 *   - not within the road setback of a road.
 * For each kept point we find the NEAREST building wall and record its compass
 * direction and distance, so the optimizer's placement science still applies.
 *
 * This makes any open ground in the city plantable — the planner is no longer
 * limited to a sparse set of dots, and a drawn select-area almost always
 * contains candidates.
 *
 * Done ONCE here so the app just loads the result and the optimizer stays pure.
 *
 * Run: node pipeline/04-candidates.mjs
 * Requires: @turf/turf.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as turf from "@turf/turf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Per-town folder (set by run.sh); falls back to the legacy flat layout.
const TOWN_DIR = process.env.TREECAST_TOWN_DIR || join(ROOT, "public", "data");
const AREA_FILE = process.env.TREECAST_TOWN_DIR
  ? join(TOWN_DIR, "area.json")
  : join(ROOT, "pipeline", "area.json");
const OUT = join(TOWN_DIR, "candidate-sites.geojson");

// --- tunables (ASSUMPTION; see coefficients.ts for the optimizer side) ---
const GRID_SPACING_FT = 90; // grid step across the city (≈ planting granularity)
const ROAD_SETBACK_FT = 5; // keep off roads
const MIN_WALL_FT = 8; // must be at least this far from a building
const MAX_WALL_FT = 70; // and no use beyond this from any building

const area = JSON.parse(readFileSync(AREA_FILE, "utf8"));
const buildings = JSON.parse(
  readFileSync(join(TOWN_DIR, "buildings.geojson"), "utf8"),
);
let water = null;
try {
  water = JSON.parse(readFileSync(join(TOWN_DIR, "water.geojson"), "utf8"));
} catch {}
let boundary = null;
try {
  boundary = JSON.parse(readFileSync(join(TOWN_DIR, "city-boundary.geojson"), "utf8"));
} catch {}
let roads = null;
try {
  roads = JSON.parse(readFileSync(join(TOWN_DIR, "roads.geojson"), "utf8"));
} catch {}

// --- polygon helpers (rings + point-in-polygon), no heavy deps ---
function rings(gj) {
  const out = [];
  for (const f of gj?.features ?? []) {
    const g = f.geometry;
    if (g?.type === "Polygon") out.push(g.coordinates[0]);
    else if (g?.type === "MultiPolygon") for (const p of g.coordinates) out.push(p[0]);
  }
  return out;
}
function inRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}
const cityRings = boundary ? rings(boundary) : [];
const waterRings = water ? rings(water) : [];
const inCity = (lng, lat) =>
  cityRings.length === 0 || cityRings.some((r) => inRing(lng, lat, r));
const inWater = (lng, lat) => waterRings.some((r) => inRing(lng, lat, r));

// Building polygons + a coarse spatial index for fast nearest-wall lookup.
const bPolys = buildings.features.filter((f) => f.geometry?.type === "Polygon");
// Precompute each building centroid for a quick pre-filter.
const bCentroids = bPolys.map((b) => {
  try {
    return turf.centroid(b).geometry.coordinates;
  } catch {
    return null;
  }
});

const roadLines =
  roads?.features
    ?.filter((f) => f.geometry?.type === "LineString")
    .map((f) => turf.lineString(f.geometry.coordinates)) ?? [];

const feetToKm = (ft) => (ft * 0.3048) / 1000;
const kmToFeet = (km) => (km * 1000) / 0.3048;

const center = area.center;
const degPerFtLat = 1 / 364000;
const degPerFtLng = 1 / (364000 * Math.cos((center.lat * Math.PI) / 180));
const stepLat = GRID_SPACING_FT * degPerFtLat;
const stepLng = GRID_SPACING_FT * degPerFtLng;

const { west, south, east, north } = area.bbox;

/** Compass direction (8-way) from a building wall point to the candidate. */
function dirFromWall(wallPt, candPt) {
  const brg = turf.bearing(wallPt, candPt); // -180..180, 0 = north
  const a = (brg + 360) % 360;
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return names[Math.round(a / 45) % 8];
}

const features = [];
const densities = [];
let n = 0;

for (let lat = south; lat <= north; lat += stepLat) {
  for (let lng = west; lng <= east; lng += stepLng) {
    // 1) inside city, not water.
    if (!inCity(lng, lat) || inWater(lng, lat)) continue;

    const pt = turf.point([lng, lat]);

    // 2) not inside a building; find nearest building + distance to its wall.
    //    Pre-filter by centroid distance (deg^2) to avoid testing every polygon.
    let nearest = null;
    let nearestD2 = Infinity;
    for (let k = 0; k < bPolys.length; k++) {
      const c = bCentroids[k];
      if (!c) continue;
      const dx = c[0] - lng, dy = c[1] - lat;
      const d2 = dx * dx + dy * dy;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearest = k;
      }
    }
    if (nearest == null) continue;

    const bldg = bPolys[nearest];
    if (turf.booleanPointInPolygon(pt, bldg)) continue; // inside a footprint

    // Distance + direction to the nearest wall.
    let distFt = MAX_WALL_FT + 1;
    let wallDir = "W";
    try {
      const line = turf.polygonToLine(bldg);
      const np = turf.nearestPointOnLine(line, pt, { units: "kilometers" });
      distFt = kmToFeet(np.properties.dist);
      wallDir = dirFromWall(turf.point(np.geometry.coordinates), pt);
    } catch {
      continue;
    }

    // 3) usable distance band from the wall.
    if (distFt < MIN_WALL_FT || distFt > MAX_WALL_FT) continue;

    // 4) road setback.
    if (roadLines.length) {
      let tooClose = false;
      for (const l of roadLines) {
        const np = turf.nearestPointOnLine(l, pt, { units: "kilometers" });
        if (kmToFeet(np.properties.dist) < ROAD_SETBACK_FT) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
    }

    // Leaf type alternates deterministically so both appear; the optimizer
    // scores the direction/leaf combo.
    const leafType = n % 3 === 0 ? "evergreen" : "deciduous";

    // Per-site "neighborhood need" — a MODELED PROXY, not a measured value.
    // Signal: local building density (count of building centroids within
    // ~350 ft). Denser blocks pack more residents into less open ground, so
    // heat exposure and the benefit of new shade are higher there. Normalized
    // to 0..1 against the densest block in the city. Honest label: this is a
    // density proxy derived from Overture footprints, NOT census population.
    const RAD_DEG = 350 * degPerFtLat;
    const rad2 = RAD_DEG * RAD_DEG;
    let dens = 0;
    for (const c of bCentroids) {
      if (!c) continue;
      const dx = c[0] - lng, dy = c[1] - lat;
      if (dx * dx + dy * dy <= rad2) dens++;
    }
    densities.push(dens);
    const equityNeed = dens; // raw now; normalized after the loop

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: `cs-${String(n).padStart(5, "0")}`,
        direction: wallDir,
        distanceToWallFt: Math.round(distFt * 10) / 10,
        leafType,
        buildingDensity: equityNeed, // raw count; normalized below
        equityNeed, // overwritten below
      },
    });
    n++;
  }
}

// Normalize equity need 0..1 across all sites (percentile-ish: clamp to the
// 95th percentile so a few very dense outliers don't flatten the rest).
const sorted = [...densities].sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
const minD = sorted[0] ?? 0;
for (const f of features) {
  const raw = f.properties.buildingDensity;
  const norm = Math.max(0, Math.min(1, (raw - minD) / (p95 - minD || 1)));
  f.properties.equityNeed = Math.round(norm * 1000) / 1000;
  // A coarse tier label for the UI to describe honestly.
  f.properties.needTier =
    norm >= 0.75 ? "very-dense" : norm >= 0.5 ? "dense" : norm >= 0.25 ? "moderate" : "low-density";
}

// --- per-candidate block-group equity join (greater-boston R4) ---------------
// Stamp each candidate with the EJ block group that CONTAINS it (real GEOID +
// per-block-group minority / limited-English / income / EJ criteria), replacing
// the single town-wide value. A point in no flagged block group is left without
// one — honest, since the MassGIS EJ layer carries only flagged groups.
let blockGroups = null;
try {
  blockGroups = JSON.parse(
    readFileSync(join(ROOT, "public", "data", "region", "ej-block-groups.geojson"), "utf8"),
  ).features;
} catch {}

// LEAD energy burden by census tract (first 11 digits of GEOID), if present.
let leadByTract = null;
try {
  leadByTract = JSON.parse(
    readFileSync(join(ROOT, "public", "data", "region", "lead-by-tract.json"), "utf8"),
  ).tracts;
} catch {}

if (blockGroups?.length) {
  // Ray-cast point-in-polygon (mirrors src/optimizer/block-group.ts, which the
  // property test guards).
  const inRing2 = (lng, lat, ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  };
  const inGeom = (lng, lat, geom) => {
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) {
      if (!inRing2(lng, lat, poly[0])) continue;
      let hole = false;
      for (let h = 1; h < poly.length; h++)
        if (inRing2(lng, lat, poly[h])) { hole = true; break; }
      if (!hole) return true;
    }
    return false;
  };
  let matched = 0;
  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    const bg = blockGroups.find((b) => b.geometry && inGeom(lng, lat, b.geometry));
    if (bg) {
      const p = bg.properties;
      f.properties.geoid = p.geoid;
      f.properties.tract = p.tract;
      f.properties.ejCriteria = p.ejCriteria ?? null;
      f.properties.bgMinorityPct = p.minorityPct ?? null;
      f.properties.bgLimitedEnglishPct = p.limitedEnglishPct ?? null;
      f.properties.bgIncome = p.income ?? null;
      // Tract-level energy burden from LEAD (join on the 11-digit tract).
      const lead = leadByTract?.[p.tract];
      if (lead) f.properties.energyBurdenPct = lead.energyBurdenPct;
      matched++;
    }
  }
  const withBurden = features.filter((f) => f.properties.energyBurdenPct != null).length;
  console.log(`  joined ${matched}/${features.length} candidates to an EJ block group; ${withBurden} also have LEAD energy burden`);
}

writeFileSync(
  OUT,
  JSON.stringify({ type: "FeatureCollection", features }, null, 0),
);
console.log(`wrote ${features.length} city-wide candidate sites -> ${OUT}`);
