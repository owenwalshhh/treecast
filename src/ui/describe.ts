/**
 * describe — turn a planned tree's real data into accurate, human phrases for
 * the table and the "Why here?" popup. No invented facts: every phrase is built
 * only from values the pipeline actually computed (direction, distance, block
 * density tier). Honesty first.
 */

import { t, type Lang } from "../i18n/strings";
import type { Direction } from "../optimizer/coefficients";
import type { PlannedTree } from "../optimizer/types";
import type { GeoCandidate } from "./demo-data";

/** Full compass name, localised: "W" -> "West". */
export function directionName(dir: Direction, lang: Lang): string {
  return t(`dir_${dir}` as any, lang);
}

/** Need-tier phrase from the real density tier, localised. */
export function tierPhrase(tier: string | undefined, lang: Lang): string {
  switch (tier) {
    case "very-dense":
      return t("tier_very_dense", lang);
    case "dense":
      return t("tier_dense", lang);
    case "moderate":
      return t("tier_moderate", lang);
    default:
      return t("tier_low_density", lang);
  }
}

/**
 * A short location description, hard-capped to `max` characters. Built from the
 * tree's real nearest-wall direction and distance, e.g.
 * "West side, 18 ft from the wall". Accurate — these come straight from the
 * candidate's own fields.
 */
export function locationDescription(
  tree: PlannedTree,
  lang: Lang,
  max = 42,
): string {
  const dir = directionName(tree.site.direction, lang);
  const ft = Math.round(tree.site.distanceToWallFt);
  const s = `${dir} side, ${ft} ft from the wall`;
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

/** The density tier for a planned tree, if the candidate carried one. */
export function needTierOf(tree: PlannedTree): string | undefined {
  return (tree.site as GeoCandidate).needTier;
}

/**
 * A readable name for a tree, used instead of the raw candidate id (which is
 * random letters/numbers). Trees are numbered in plan order — "Tree 1" is the
 * highest-scoring placement. Honest: it is just an index, not a street name
 * we do not have.
 */
export function treeName(index: number, lang: Lang): string {
  return `${t("treeWord", lang)} ${index + 1}`;
}
