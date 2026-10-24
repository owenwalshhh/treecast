/**
 * Treecast optimizer — tree growth over time.
 *
 * Pure, deterministic, no DOM. Given years since planting, return the crown
 * diameter in feet. Drives the year 0-30 growth slider on the map.
 *
 * The SHAPE (a saturating curve approaching the mature crown) and the endpoints
 * are ASSUMPTION, flagged in coefficients.ts. The METHOD — step a tree's size
 * year by year toward maturity — follows the i-Tree Design forecasting approach
 * [ITREE]; the exact i-Tree/McPherson growth equation is not yet in hand, so
 * this is a stand-in curve, ready to swap when those coefficients arrive.
 */

import { GROWTH } from "./coefficients";
import { clamp01 } from "./score";

/**
 * Crown diameter in feet at `year` since planting.
 *
 * Saturating growth: starts at initialCrownFt, approaches matureCrownFt, and is
 * ~95% of the way there at yearsToMature. Monotonic and bounded for any year.
 */
export function crownDiameterFt(year: number): number {
  const y = Math.max(0, year);
  const { initialCrownFt, matureCrownFt, yearsToMature } = GROWTH;
  // Exponential approach: 1 - e^(-k*y), with k set so y = yearsToMature -> ~0.95.
  const k = 3 / yearsToMature; // e^-3 ≈ 0.05 remaining at maturity
  const progress = clamp01(1 - Math.exp(-k * y));
  return initialCrownFt + (matureCrownFt - initialCrownFt) * progress;
}

/**
 * Growth progress 0..1 at `year` (0 = just planted, ~1 = mature). Handy for the
 * UI to scale a marker or fade a color.
 */
export function growthProgress(year: number): number {
  const { initialCrownFt, matureCrownFt } = GROWTH;
  const span = matureCrownFt - initialCrownFt;
  if (span <= 0) return 1;
  return clamp01((crownDiameterFt(year) - initialCrownFt) / span);
}
