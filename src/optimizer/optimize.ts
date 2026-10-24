/**
 * Treecast optimizer — choose where to plant.
 *
 * Pure, deterministic, no DOM, no network. Given candidate sites and a budget,
 * return a plan. Also provides a naive baseline so the UI can show
 * optimized-vs-naive at the same tree count.
 *
 * Determinism: ties are broken by site id (lexical), so the same input always
 * yields the same plan. This is what lets the optimizer be property-tested.
 */

import { MIN_TREE_SPACING_FT } from "./coefficients";
import { blendedScore, energyScore } from "./score";
import type {
  CandidateSite,
  OptimizeOptions,
  Plan,
  PlannedTree,
} from "./types";

/** Squared distance in feet — avoids a sqrt in the spacing check. */
function dist2(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** True if `site` is at least `minSpacingFt` from every already-chosen tree. */
function respectsSpacing(
  site: CandidateSite,
  chosen: PlannedTree[],
  minSpacingFt: number,
): boolean {
  const min2 = minSpacingFt * minSpacingFt;
  for (const t of chosen) {
    if (dist2(site.at, t.site.at) < min2) return false;
  }
  return true;
}

/**
 * Greedy optimizer. Rank every candidate by blended score (energy + equity per
 * the slider), then take them best-first, skipping any that fall within the
 * spacing of an already-chosen tree, until the budget is met or candidates run
 * out.
 *
 * Greedy, not globally optimal — but it is simple, fast, deterministic, and
 * explainable ("we took the best spots in order, skipping ones too close"),
 * which matters more than optimality for a demo and a "Why here?" popup.
 */
export function optimize(
  candidates: readonly CandidateSite[],
  options: OptimizeOptions,
): Plan {
  const minSpacingFt = options.minSpacingFt ?? MIN_TREE_SPACING_FT;
  const budget = Math.max(0, Math.floor(options.budget));

  // Pre-compute scores once, then sort. Deterministic tie-break by id.
  const ranked = candidates
    .map((site) => ({
      site,
      score: blendedScore(site, options.equityWeight),
      energyScore: energyScore(site),
    }))
    .sort((a, b) => b.score - a.score || cmpId(a.site.id, b.site.id));

  const trees: PlannedTree[] = [];
  for (const cand of ranked) {
    if (trees.length >= budget) break;
    if (!respectsSpacing(cand.site, trees, minSpacingFt)) continue;
    trees.push(cand);
  }

  return { trees, totalScore: sumScore(trees) };
}

/**
 * Naive baseline: same budget and same spacing rule, but ignores the science —
 * it just takes candidates in their given order (as a city might plant "first
 * come" down a list). This is the plan the optimized one is compared against.
 */
export function naivePlan(
  candidates: readonly CandidateSite[],
  options: OptimizeOptions,
): Plan {
  const minSpacingFt = options.minSpacingFt ?? MIN_TREE_SPACING_FT;
  const budget = Math.max(0, Math.floor(options.budget));

  const trees: PlannedTree[] = [];
  for (const site of candidates) {
    if (trees.length >= budget) break;
    if (!respectsSpacing(site, trees, minSpacingFt)) continue;
    trees.push({
      site,
      score: blendedScore(site, options.equityWeight),
      energyScore: energyScore(site),
    });
  }

  return { trees, totalScore: sumScore(trees) };
}

function sumScore(trees: readonly PlannedTree[]): number {
  return trees.reduce((acc, t) => acc + t.score, 0);
}

/** Stable lexical compare for ids. */
function cmpId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
