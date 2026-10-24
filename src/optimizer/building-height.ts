/**
 * Pure building-height resolution for the 3D extrusion (greater-boston R5).
 *
 * A building's `height` (meters) is used when it is a finite positive number.
 * Otherwise the extrusion falls back to a default of 8 m and the building is
 * flagged as estimated, so the UI can show the guess honestly.
 *
 * Kept pure (no map, no DOM) so the property test can check the invariant
 * directly: a missing height ALWAYS yields height 8 and estimated=true.
 */

export const DEFAULT_BUILDING_HEIGHT_M = 8;

export interface ResolvedHeight {
  /** Height in meters to extrude. */
  renderHeight: number;
  /** True when the real height was missing and the default was used. */
  estimated: boolean;
}

/** Resolve the extrusion height for one building's raw height value. */
export function resolveHeight(rawHeight: unknown): ResolvedHeight {
  const h = Number(rawHeight);
  const hasH = Number.isFinite(h) && h > 0;
  return hasH
    ? { renderHeight: h, estimated: false }
    : { renderHeight: DEFAULT_BUILDING_HEIGHT_M, estimated: true };
}
