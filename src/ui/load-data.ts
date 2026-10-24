/**
 * Load real app data from /public/data (written by the pipeline). Falls back to
 * the synthetic demo grid if the files are missing, so the app always runs.
 *
 * Vite serves /public at the site root, so these fetch from "/data/...".
 */

import type { CandidateSite } from "../optimizer/types";
import type { Direction, LeafType } from "../optimizer/coefficients";
import { demoCandidates, type GeoCandidate } from "./demo-data";

export interface AppData {
  /** Candidate sites in the optimizer shape, each with lng/lat for the map. */
  candidates: GeoCandidate[];
  /** Raw building footprints GeoJSON, or null if unavailable. */
  buildings: unknown | null;
  /** Shade-grid GeoJSON, or null if unavailable. */
  shadeGrid: unknown | null;
  /** City boundary polygon GeoJSON, or null. */
  cityBoundary: unknown | null;
  /** Water polygons GeoJSON, or null. */
  water: unknown | null;
  /** Town equity + utility summary (03-equity-summary.sql), or null. */
  equity: EquitySummary | null;
  /** True if the real pipeline data loaded; false if we fell back to demo. */
  real: boolean;
  /** Map center. */
  center: { lng: number; lat: number };
}

/**
 * Town-level equity + utility summary written by 03-equity-summary.sql.
 *
 * HONEST SCOPE: the saved MassGIS EJ extract has NO block-group geometry and NO
 * GEOID (it was fetched with returnGeometry=false and only carries municipality
 * names). So Treecast cannot assign a candidate to its CONTAINING block group,
 * nor join LEAD energy burden by tract. These are TOWN-WIDE figures, shown as
 * such. The per-block-group join (greater-boston R4) needs a geometry+GEOID EJ
 * source that this extract does not provide.
 */
export interface EquitySummary {
  town: string;
  electric_utility: string | null;
  ej_block_groups: number;
  avg_minority_pct: number;
  avg_limited_english_pct: number;
  avg_block_group_income: number;
  min_block_group_income: number;
  max_block_group_income: number;
  /** EJ criteria present in the town's flagged block groups, if derivable. */
  criteria?: string[];
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** One built town, from public/data/towns.json. */
export interface TownInfo {
  name: string;
  slug: string;
  /** Data folder base, e.g. "/data" (Chelsea legacy) or "/data/everett". */
  base: string;
  buildings?: number;
  candidates?: number;
  /** True when the town has candidate-sites + shade (the full planner/shade). */
  hasPlanner?: boolean;
  bytes?: number;
}

/**
 * Load the index of built towns. Returns [] if the index is missing (the app
 * then falls back to the single legacy Chelsea dataset).
 */
export async function loadTowns(): Promise<TownInfo[]> {
  const idx = await fetchJson("/data/towns.json");
  const towns = idx?.towns;
  if (!Array.isArray(towns)) return [];
  return towns.map((t: any) => ({
    name: String(t.name),
    slug: String(t.slug),
    base: String(t.base ?? `/data/${t.slug}`),
    buildings: t.buildings,
    candidates: t.candidates,
    hasPlanner: t.hasPlanner !== false && (t.hasPlanner === true || (t.candidates ?? 0) > 0),
    bytes: t.bytes,
  }));
}

/**
 * Load the "All of Inner Core" town outlines (region/town-outlines.geojson),
 * each feature carrying town, slug, ejBlockGroups, avgMinorityPct and a `built`
 * flag. Returns null when the region file is absent.
 */
export async function loadRegionOutlines(): Promise<any | null> {
  return fetchJson("/data/region/town-outlines.geojson");
}

type Ring = [number, number][];

/** Outer rings of every Polygon/MultiPolygon in a GeoJSON. */
function ringsOf(gj: any): Ring[] {
  const out: Ring[] = [];
  const feats = gj?.features ?? (gj ? [gj] : []);
  for (const f of feats) {
    const g = f.geometry ?? f;
    if (!g) continue;
    if (g.type === "Polygon") out.push(g.coordinates[0]);
    else if (g.type === "MultiPolygon") for (const p of g.coordinates) out.push(p[0]);
  }
  return out;
}

/** Ray-casting point-in-polygon. */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const hit = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

/** Turn a candidate-sites GeoJSON feature into a GeoCandidate. */
export async function loadAppData(base = "/data"): Promise<AppData> {
  const b = base.replace(/\/$/, "");
  const [sitesGj, buildingsGj] = await Promise.all([
    fetchJson(`${b}/candidate-sites.geojson`),
    fetchJson(`${b}/buildings.geojson`),
  ]);
  const shadeGj = await fetchJson(`${b}/shade-grid.geojson`);
  const boundaryGj = await fetchJson(`${b}/city-boundary.geojson`);
  const waterGj = await fetchJson(`${b}/water.geojson`);
  const equityGj = (await fetchJson(`${b}/equity-summary.json`)) as EquitySummary | null;

  if (sitesGj?.features?.length) {
    // Project lng/lat to local feet around the data's center so the optimizer's
    // spacing check (in feet) works. Equirectangular is fine at city scale.
    let feats = sitesGj.features.filter(
      (f: any) => Array.isArray(f?.geometry?.coordinates),
    );

    // Clip candidates to the city boundary so trees never land outside Chelsea.
    const cityRings = boundaryGj ? ringsOf(boundaryGj) : [];
    if (cityRings.length) {
      feats = feats.filter((f: any) => {
        const [lng, lat] = f.geometry.coordinates;
        return cityRings.some((r) => pointInRing(lng, lat, r));
      });
    }
    const lng0 =
      feats.reduce((s: number, f: any) => s + f.geometry.coordinates[0], 0) /
      feats.length;
    const lat0 =
      feats.reduce((s: number, f: any) => s + f.geometry.coordinates[1], 0) /
      feats.length;
    const FT_PER_DEG_LAT = 364000; // ~ feet per degree latitude
    const ftPerDegLng = FT_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);

    const candidates: GeoCandidate[] = feats
      .map((f: any): GeoCandidate | null => {
        const p = f.properties ?? {};
        const [lng, lat] = f.geometry.coordinates;
        const site: CandidateSite = {
          id: String(p.id),
          at: {
            x: (lng - lng0) * ftPerDegLng,
            y: (lat - lat0) * FT_PER_DEG_LAT,
          },
          direction: p.direction as Direction,
          distanceToWallFt: Number(p.distanceToWallFt),
          leafType: p.leafType as LeafType,
          equityNeed: Number(p.equityNeed),
        };
        return { ...site, lng, lat, needTier: p.needTier,
          geoid: p.geoid, tract: p.tract, ejCriteria: p.ejCriteria,
          bgMinorityPct: p.bgMinorityPct, bgLimitedEnglishPct: p.bgLimitedEnglishPct,
          bgIncome: p.bgIncome, energyBurdenPct: p.energyBurdenPct };
      })
      .filter((c: GeoCandidate | null): c is GeoCandidate => c !== null);

    if (candidates.length) {
      return {
        candidates,
        buildings: buildingsGj ?? null,
        shadeGrid: shadeGj ?? null,
        cityBoundary: boundaryGj ?? null,
        water: waterGj ?? null,
        equity: equityGj ?? null,
        real: true,
        center: { lng: lng0, lat: lat0 },
      };
    }
  }

  // Fallback: synthetic demo grid.
  const demo = demoCandidates();
  const n = demo.length;
  return {
    candidates: demo,
    buildings: buildingsGj ?? null,
    shadeGrid: shadeGj ?? null,
    cityBoundary: boundaryGj ?? null,
    water: waterGj ?? null,
    equity: equityGj ?? null,
    real: false,
    center: {
      lng: demo.reduce((s: number, c: GeoCandidate) => s + c.lng, 0) / n,
      lat: demo.reduce((s: number, c: GeoCandidate) => s + c.lat, 0) / n,
    },
  };
}
