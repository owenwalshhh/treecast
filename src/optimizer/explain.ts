/**
 * Treecast optimizer — explain WHY a site scored as it did.
 *
 * Pure and deterministic, no DOM. Returns a list of reason CODES plus the raw
 * parts of the score. The UI turns the codes into English/Spanish sentences via
 * i18n, so this file holds no user-facing text.
 *
 * This is what powers the "Why here?" popup.
 */

import {
  DIRECTION_WEIGHT,
  DISTANCE_MAX_FT,
  DISTANCE_MIN_FT,
  LEAF_TYPE_MULTIPLIER,
} from "./coefficients";
import { distanceFactor, energyScore } from "./score";
import type { CandidateSite } from "./types";

/** A single plain-language reason, as a code the UI localises. */
export type ReasonCode =
  | "westBest" // west/southwest: best for summer shade
  | "eastModest" // east: morning shade, modest
  | "northWindbreak" // north/nw: small, windbreak only
  | "southDeciduousOk" // south + deciduous: lets winter sun under
  | "southEvergreenPenalty" // south + evergreen: blocks winter sun (penalty)
  | "evergreenWindbreakGood" // evergreen on north/nw: good windbreak
  | "closeToWall" // near the wall: strong effect
  | "farFromWall" // far from the wall: weak effect
  | "highEquity" // high-need area: helps at-risk residents
  | "lowEquity"; // lower-need area

export interface Explanation {
  reasons: ReasonCode[];
  /** The energy component (unitless, can be negative). */
  energyScore: number;
  /** Distance falloff factor used, 0..1. */
  distanceFactor: number;
  /** The site's equity need, 0..1. */
  equityNeed: number;
  /** The direction, echoed for the UI. */
  direction: CandidateSite["direction"];
  /** The leaf type, echoed for the UI. */
  leafType: CandidateSite["leafType"];
}

const NORTHERLY = new Set(["N", "NW"]);
const WESTERLY = new Set(["W", "SW"]);

/** Build a localisable explanation for one candidate site. */
export function explain(site: CandidateSite): Explanation {
  const reasons: ReasonCode[] = [];
  const d = site.direction;

  // Direction story.
  if (WESTERLY.has(d) && DIRECTION_WEIGHT[d] >= DIRECTION_WEIGHT.SW) {
    reasons.push("westBest");
  } else if (d === "E" || d === "NE") {
    reasons.push("eastModest");
  } else if (NORTHERLY.has(d)) {
    reasons.push("northWindbreak");
  }

  // Leaf-type story on the sensitive sides.
  if (d === "S" || d === "SE" || d === "SW") {
    if (site.leafType === "evergreen" && LEAF_TYPE_MULTIPLIER[d].evergreen < 0) {
      reasons.push("southEvergreenPenalty");
    } else if (site.leafType === "deciduous") {
      reasons.push("southDeciduousOk");
    }
  }
  if (
    NORTHERLY.has(d) &&
    site.leafType === "evergreen" &&
    LEAF_TYPE_MULTIPLIER[d].evergreen > LEAF_TYPE_MULTIPLIER[d].deciduous
  ) {
    reasons.push("evergreenWindbreakGood");
  }

  // Distance story.
  const df = distanceFactor(site.distanceToWallFt);
  if (site.distanceToWallFt <= DISTANCE_MIN_FT + (DISTANCE_MAX_FT - DISTANCE_MIN_FT) * 0.33) {
    reasons.push("closeToWall");
  } else if (df <= 0.34) {
    reasons.push("farFromWall");
  }

  // Equity story.
  if (site.equityNeed >= 0.66) reasons.push("highEquity");
  else if (site.equityNeed <= 0.33) reasons.push("lowEquity");

  return {
    reasons,
    energyScore: energyScore(site),
    distanceFactor: df,
    equityNeed: site.equityNeed,
    direction: d,
    leafType: site.leafType,
  };
}
