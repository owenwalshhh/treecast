/**
 * Treecast — placement-scoring coefficients.
 *
 * Every number in this file carries a comment naming its source, or the word
 * ASSUMPTION. This is the ONLY place raw coefficients live (per tree-science.md
 * and data-rules.md). The optimizer imports from here; it never hard-codes a
 * number of its own.
 *
 * Sources referenced:
 *   [HWANG]  Hwang, Wiseman & Thomas 2016, "Simulation of Shade Tree Effects on
 *            Residential Energy Consumption in Four U.S. Cities", Cities and the
 *            Environment 9(1), Article 2. DOI 10.15365/1932-7048.1202.
 *   [ITREE]  i-Tree Design Methods, USDA Forest Service (Sept 23, 2014).
 *   [MACCA]  2022 Massachusetts Climate Change Assessment (human sector).
 *
 * Massachusetts is heating-dominated, so the scoring below rewards summer
 * cooling shade while penalising winter solar blocking. Minneapolis is the
 * closest-latitude northern city Hwang simulated and is used as the MA analogue.
 *
 * IMPORTANT: these weights are a RELATIVE scoring scheme (unitless, 0-centred),
 * not predicted kWh. We never show a kWh/$/CO2 number to a user from these
 * weights. The real per-tree kWh magnitudes Hwang reports are recorded in
 * HWANG_NET_ENERGY_KWH below for reference and future calibration only.
 */

/** Compass direction of a candidate spot measured FROM the building wall. */
export type Direction =
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW";

/** Leaf type of the tree proposed for a spot. */
export type LeafType = "deciduous" | "evergreen";

/**
 * Direction weights — relative desirability of planting on each side of a
 * building, in a heating-dominated climate. Higher = better. Negative = the
 * side tends to cost energy on net.
 *
 * Ranking and signs are from [HWANG]:
 *  - "planting a large deciduous tree on the west aspect ... most consistently
 *    reliable approach" and west "almost always reduced annual energy
 *    consumption" -> West highest.                                      [HWANG]
 *  - East ranked second for cooling ("followed by trees on the east aspect"),
 *    but in northern cities "some tree models on the east ... caused additional
 *    energy consumption up to 18 kWh" by blocking morning winter sun -> small
 *    positive base, can go negative for evergreen (see penalties).      [HWANG]
 *  - North/NW: single-tree savings "minimal because windbreaks are most
 *    effective with a dense multi-tree planting" -> small.              [HWANG]
 *  - South: deciduous "increasingly effective at net energy savings" (lets low
 *    winter sun under the canopy); evergreen on south "caused the most notable
 *    additional energy consumption" -> handled via leaf-type penalty.   [HWANG]
 *
 * The exact decimal magnitudes are ASSUMPTION (a smooth ranking consistent with
 * Hwang's ordering); only the order and the signs are sourced.
 */
export const DIRECTION_WEIGHT: Record<Direction, number> = {
  W: 1.0, // highest — west afternoon shade [HWANG]; magnitude ASSUMPTION
  SW: 0.9, // west-family, strong [HWANG]; magnitude ASSUMPTION
  S: 0.5, // deciduous-only positive [HWANG]; magnitude ASSUMPTION
  E: 0.4, // second for cooling, morning shade [HWANG]; magnitude ASSUMPTION
  SE: 0.4, // east/south blend [HWANG]; magnitude ASSUMPTION
  NW: 0.2, // small windbreak effect [HWANG]; magnitude ASSUMPTION
  N: 0.15, // small windbreak effect [HWANG]; magnitude ASSUMPTION
  NE: 0.2, // small [HWANG]; magnitude ASSUMPTION
};

/**
 * Leaf-type adjustment by direction.
 *
 * The single hard rule from [HWANG] / [ITREE]: an EVERGREEN on the south side
 * blocks low winter sun and is a net penalty in a heating climate
 * ("south-positioned coniferous tree caused the most notable additional energy
 * consumption: as much as 134 kWh" [HWANG]; "an evergreen species is going to
 * have a greater shading effect in the winter than a deciduous species"
 * [ITREE]). On north/NW a dense evergreen is the better windbreak [HWANG].
 *
 * Multipliers applied to DIRECTION_WEIGHT. 1.0 = no change. Magnitudes are
 * ASSUMPTION; the south-evergreen penalty sign is sourced.
 */
export const LEAF_TYPE_MULTIPLIER: Record<
  Direction,
  Record<LeafType, number>
> = {
  S: { deciduous: 1.0, evergreen: -1.5 }, // evergreen south = penalty [HWANG]
  SE: { deciduous: 1.0, evergreen: -0.5 }, // southerly evergreen leans penalty [HWANG]
  SW: { deciduous: 1.0, evergreen: -0.5 }, // southerly evergreen leans penalty [HWANG]
  W: { deciduous: 1.0, evergreen: 0.9 }, // deciduous preferred on west [HWANG]; ASSUMPTION
  E: { deciduous: 1.0, evergreen: 0.9 }, // ASSUMPTION
  N: { deciduous: 1.0, evergreen: 1.2 }, // evergreen windbreak better on north [HWANG]
  NW: { deciduous: 1.0, evergreen: 1.2 }, // evergreen windbreak better on NW [HWANG]
  NE: { deciduous: 1.0, evergreen: 1.1 }, // ASSUMPTION
};

/**
 * Distance band from the nearest building wall, in FEET.
 *
 * [HWANG] modelled 5, 10, 15 m (≈16, 33, 49 ft) and found the effect generally
 * fades as the tree moves away ("diminishing energy impacts moving further away
 * from the structure"). The 10 ft minimum and 60 ft maximum are our own bounds,
 * not Hwang's tested range.
 */
export const DISTANCE_MIN_FT = 10; // ASSUMPTION: keep roots off foundations
export const DISTANCE_MAX_FT = 60; // ASSUMPTION: beyond this, negligible effect

/**
 * Distance falloff. Score is multiplied by a factor that decays from 1.0 at the
 * minimum distance toward ~0 at the maximum. "Effect fades with distance" is
 * sourced [HWANG]; the LINEAR shape and the exact endpoints are ASSUMPTION.
 * (A future calibration could fit Hwang's 5/10/15 m points instead.)
 */
export const DISTANCE_FALLOFF_SHAPE = "linear" as const; // ASSUMPTION

/**
 * Minimum spacing between two chosen trees, in FEET. No source in the three
 * cited papers gives a spacing figure.
 */
export const MIN_TREE_SPACING_FT = 25; // ASSUMPTION

/** No tree within this many feet of a road centre/edge. */
export const ROAD_SETBACK_FT = 5; // ASSUMPTION

/**
 * Growth curve — crown size vs. years since planting.
 *
 * [ITREE] describes a forecasting model that steps tree height year by year
 * using growth rates ("calculates tree height for each consecutive year ... uses
 * growth rates to estimate the changing size of the tree"). i-Tree's methods PDF
 * documents the METHOD but points to McPherson & Simpson (1999) for the actual
 * growth equations, which we do not yet hold. So the curve below is a simple
 * bounded-growth stand-in, flagged ASSUMPTION, to be replaced once the i-Tree /
 * McPherson growth coefficients are in hand.
 */
export const GROWTH = {
  /** Crown diameter at planting, ft. ASSUMPTION (nursery stock). */
  initialCrownFt: 8,
  /** Mature crown diameter, ft. ASSUMPTION (typical urban shade tree). */
  matureCrownFt: 35,
  /** Years to approach mature crown. ASSUMPTION. */
  yearsToMature: 30,
  /** Curve shape; i-Tree steps year-by-year [ITREE], saturating shape ASSUMPTION. */
  shape: "saturating" as const,
} as const;

/**
 * REFERENCE ONLY — Hwang's reported per-tree NET annual energy magnitudes, for
 * the single prototypical ~200 m^2 house across his four cities. NOT used by the
 * scorer and NEVER shown to a user as a Treecast prediction (data-rules.md:
 * "Savings are modeled estimates"). Kept so a later calibration step has the
 * real numbers to fit against.                                          [HWANG]
 */
export const HWANG_NET_ENERGY_KWH = {
  /** Best case, Orlando (southern): net SAVING. [HWANG] */
  bestNetSavingKwh: 160, // "net energy savings of 160 kWh (valued at $18) in Orlando"
  /** Worst case, Minneapolis (northern): net COST, south evergreen. [HWANG] */
  worstNetCostKwh: -134, // "net energy cost of 134 kWh (−$15) in Minneapolis"
  /** Max modelled heating penalty, single tree. [HWANG] */
  maxHeatingPenaltyKwh: -171, // "heating penalties ... as much as 171 kWh"
  note:
    "Magnitudes are for Hwang's prototypical house in four specific cities; " +
    "Minneapolis is used as the MA (heating-dominated) analogue. Do not surface " +
    "these as Treecast estimates without calibration to the demo neighbourhood.",
} as const;

/**
 * The 2022 MA Climate Assessment is the WHY, not a coefficient source: extreme
 * heat is the most urgent human-sector impact and "increasing tree canopy cover
 * is a favored solution" [MACCA]. Equity weighting (energy-vs-equity slider)
 * draws on EJ block-group data, not on the numbers above.
 */
