/**
 * DEMO candidate sites — a placeholder stand-in until the DuckDB pipeline writes
 * real /public/data GeoJSON. These are NOT real survey points; they are a small
 * synthetic grid near a sample location so the planner map runs end to end.
 *
 * Each site carries both the optimizer's local feet coordinates (`at`) and a
 * lng/lat for the map. The pipeline will later replace this with real data.
 */

import type { CandidateSite } from "../optimizer/types";
import type { Direction, LeafType } from "../optimizer/coefficients";

/** A candidate with the geographic position the map needs to draw it. */
export interface GeoCandidate extends CandidateSite {
  lng: number;
  lat: number;
  /** Coarse neighborhood-density tier, for honest UI descriptions. */
  needTier?: "very-dense" | "dense" | "moderate" | "low-density";
  /** Containing EJ block group (real MassGIS data), if the point falls in one. */
  geoid?: string;
  tract?: string;
  ejCriteria?: string | null;
  bgMinorityPct?: number | null;
  bgLimitedEnglishPct?: number | null;
  bgIncome?: number | null;
  /** Tract-level energy burden % from DOE LEAD. */
  energyBurdenPct?: number | null;
}

/** Sample center — a placeholder point (replace with the chosen demo area). */
export const DEMO_CENTER = { lng: -71.0331, lat: 42.3918 }; // ~Chelsea, MA area (placeholder)

const DIRECTIONS: Direction[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const LEAVES: LeafType[] = ["deciduous", "evergreen"];

/**
 * Build a deterministic synthetic set of candidate sites laid out on a grid.
 * Deterministic so the demo looks the same every load. Clearly synthetic.
 */
export function demoCandidates(): GeoCandidate[] {
  const out: GeoCandidate[] = [];
  const cols = 8;
  const rows = 6;
  // ~0.0012 deg ≈ 400 ft spacing between grid nodes, well over min spacing.
  const step = 0.0012;
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dir = DIRECTIONS[(r * cols + c) % DIRECTIONS.length];
      const leaf = LEAVES[(r + c) % LEAVES.length];
      // Equity need rises toward one corner, so the slider visibly changes picks.
      const equityNeed = Math.min(1, (r + c) / (rows + cols - 2));
      const distanceToWallFt = 12 + ((r * cols + c) % 5) * 10; // 12..52 ft
      out.push({
        id: `demo-${String(n).padStart(3, "0")}`,
        at: { x: c * 400, y: r * 400 },
        direction: dir,
        distanceToWallFt,
        leafType: leaf,
        equityNeed,
        lng: DEMO_CENTER.lng + (c - cols / 2) * step,
        lat: DEMO_CENTER.lat + (rows / 2 - r) * step,
      });
      n++;
    }
  }
  return out;
}
