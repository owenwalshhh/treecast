/**
 * Treecast optimizer — shared types.
 *
 * Pure data shapes. No DOM, no map, no React. The UI builds these from GeoJSON
 * and reads the plan back; the optimizer never imports anything from the UI.
 */

import type { Direction, LeafType } from "./coefficients";

/** A simple planar point in FEET, in a local projection the pipeline sets up. */
export interface PointFt {
  x: number;
  y: number;
}

/**
 * A candidate planting spot the pipeline proposes (near a building wall, off
 * roads, outside footprints). The optimizer chooses a subset of these.
 */
export interface CandidateSite {
  /** Stable id from the pipeline (e.g. "cs-00421"). */
  id: string;
  /** Location, feet, local projection. */
  at: PointFt;
  /** Direction of this spot FROM the nearest building wall. */
  direction: Direction;
  /** Distance to that wall, feet. */
  distanceToWallFt: number;
  /** Leaf type of the tree proposed here. */
  leafType: LeafType;
  /**
   * Equity need for the people this spot would help, 0..1 (higher = more
   * burdened). Derived by the pipeline from EJ block-group + LEAD energy-burden
   * data. The optimizer treats it as a given input, not something it computes.
   */
  equityNeed: number;
}

/** One tree in a finished plan. */
export interface PlannedTree {
  site: CandidateSite;
  /** Final blended score used to rank it (energy + equity). Unitless. */
  score: number;
  /** The energy component of the score, before equity blending. Unitless. */
  energyScore: number;
}

/** A complete plan: the chosen trees, in the order they were picked. */
export interface Plan {
  trees: PlannedTree[];
  /** Sum of blended scores. Unitless — a relative measure, not kWh. */
  totalScore: number;
}

/** Knobs that steer a run. */
export interface OptimizeOptions {
  /** How many trees to place (the forester's budget). */
  budget: number;
  /**
   * Energy-vs-equity slider, 0..1.
   *   0 = pure energy (rank only by placement science)
   *   1 = pure equity (rank only by who needs cooling most)
   * 0.5 = equal blend.
   */
  equityWeight: number;
  /** Minimum spacing between chosen trees, feet. Defaults to coefficient. */
  minSpacingFt?: number;
}
