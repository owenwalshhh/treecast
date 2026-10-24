/**
 * Pure point-in-block-group assignment (greater-boston R4 / R7.1).
 *
 * Given a candidate point and the EJ block-group polygons, find the block group
 * that CONTAINS the point and return its equity attributes (GEOID, tract,
 * minority %, limited-English %, income, EJ flag + criteria). A point inside no
 * flagged block group returns null — honest: the MassGIS EJ layer carries only
 * flagged groups, so "no block group" means "not in a flagged EJ area."
 *
 * Pure (no map, no DOM, no fetch) so the property test can assert the invariant
 * directly: a candidate's equity values come from the block group that contains
 * it, every time.
 */

export interface BlockGroupEquity {
  geoid: string;
  /** First 11 GEOID digits — the census tract, the LEAD energy-burden key. */
  tract: string;
  municipality: string | null;
  minorityPct: number | null;
  limitedEnglishPct: number | null;
  income: number | null;
  ej: string | null;
  ejCriteria: string | null;
}

type Ring = [number, number][];

interface BGFeature {
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: BlockGroupEquity;
}

/** Ray-casting point-in-ring. */
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

/** True if the point is inside a Polygon/MultiPolygon (outer ring minus holes). */
function pointInGeometry(lng: number, lat: number, geom: BGFeature["geometry"]): boolean {
  const polys: number[][][][] =
    geom.type === "Polygon"
      ? [geom.coordinates as number[][][]]
      : (geom.coordinates as number[][][][]);
  for (const poly of polys) {
    const outer = poly[0] as Ring;
    if (!pointInRing(lng, lat, outer)) continue;
    // Inside the outer ring — reject if inside any hole.
    let inHole = false;
    for (let h = 1; h < poly.length; h++) {
      if (pointInRing(lng, lat, poly[h] as Ring)) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

/**
 * Return the equity attributes of the block group containing [lng, lat], or
 * null if the point lies in no flagged block group.
 */
export function equityForPoint(
  lng: number,
  lat: number,
  blockGroups: BGFeature[],
): BlockGroupEquity | null {
  for (const bg of blockGroups) {
    if (bg.geometry && pointInGeometry(lng, lat, bg.geometry)) {
      return bg.properties;
    }
  }
  return null;
}
