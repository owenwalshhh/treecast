/**
 * Treecast optimizer — scoring one candidate site.
 *
 * Pure functions. Given a site and the slider, return a unitless score. Every
 * number comes from coefficients.ts (which tags each with a source or
 * ASSUMPTION); this file adds no magic numbers of its own.
 */

import {
  DIRECTION_WEIGHT,
  DISTANCE_MAX_FT,
  DISTANCE_MIN_FT,
  LEAF_TYPE_MULTIPLIER,
} from "./coefficients";
import type { CandidateSite } from "./types";

/**
 * Distance falloff factor, 1.0 at the minimum distance down to 0.0 at the
 * maximum (linear — shape is ASSUMPTION, see coefficients.ts). Clamped so a
 * spot at or inside the min reads 1.0 and one past the max reads 0.0.
 */
export function distanceFactor(distanceToWallFt: number): number {
  if (distanceToWallFt <= DISTANCE_MIN_FT) return 1;
  if (distanceToWallFt >= DISTANCE_MAX_FT) return 0;
  const span = DISTANCE_MAX_FT - DISTANCE_MIN_FT;
  return 1 - (distanceToWallFt - DISTANCE_MIN_FT) / span;
}

/**
 * Energy score for one site: direction weight, adjusted for leaf type, scaled
 * by distance falloff. Can be negative (e.g. an evergreen on the south side).
 * Unitless — a relative placement-science measure, NOT predicted kWh.
 */
export function energyScore(site: CandidateSite): number {
  const base = DIRECTION_WEIGHT[site.direction];
  const leaf = LEAF_TYPE_MULTIPLIER[site.direction][site.leafType];
  return base * leaf * distanceFactor(site.distanceToWallFt);
}

/**
 * Blended score: mix the energy score with the site's equity need, per the
 * slider. equityWeight 0 = pure energy, 1 = pure equity.
 *
 * Energy scores are already roughly in a -1.5..1 range; equityNeed is 0..1. We
 * keep the blend simple and linear so it is easy to reason about and test. The
 * blend formula itself is a design choice (ASSUMPTION), not a sourced number.
 */
export function blendedScore(
  site: CandidateSite,
  equityWeight: number,
): number {
  const w = clamp01(equityWeight);
  return (1 - w) * energyScore(site) + w * clamp01(site.equityNeed);
}

/** Clamp a value into [0, 1]. */
export function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
