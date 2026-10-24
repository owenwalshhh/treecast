import { describe, it, expect } from "vitest";
import {
  DIRECTION_WEIGHT,
  DISTANCE_MIN_FT,
  DISTANCE_MAX_FT,
  LEAF_TYPE_MULTIPLIER,
  MIN_TREE_SPACING_FT,
} from "../../src/optimizer/coefficients";

describe("coefficients: direction weights", () => {
  it("ranks west highest of all directions", () => {
    const max = Math.max(...Object.values(DIRECTION_WEIGHT));
    expect(DIRECTION_WEIGHT.W).toBe(max);
  });

  it("ranks west above north (Hwang ordering)", () => {
    expect(DIRECTION_WEIGHT.W).toBeGreaterThan(DIRECTION_WEIGHT.N);
  });

  it("ranks the west family (W, SW) above the north family (N, NW)", () => {
    expect(DIRECTION_WEIGHT.W).toBeGreaterThan(DIRECTION_WEIGHT.NW);
    expect(DIRECTION_WEIGHT.SW).toBeGreaterThan(DIRECTION_WEIGHT.N);
  });

  it("keeps every base weight non-negative (penalties come from leaf type)", () => {
    for (const w of Object.values(DIRECTION_WEIGHT)) {
      expect(w).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("coefficients: leaf-type multipliers", () => {
  it("makes an evergreen on the south side a penalty (negative)", () => {
    expect(LEAF_TYPE_MULTIPLIER.S.evergreen).toBeLessThan(0);
  });

  it("does not penalise a deciduous tree on the south side", () => {
    expect(LEAF_TYPE_MULTIPLIER.S.deciduous).toBeGreaterThan(0);
  });

  it("favours an evergreen windbreak on the north and northwest", () => {
    expect(LEAF_TYPE_MULTIPLIER.N.evergreen).toBeGreaterThan(
      LEAF_TYPE_MULTIPLIER.N.deciduous,
    );
    expect(LEAF_TYPE_MULTIPLIER.NW.evergreen).toBeGreaterThan(
      LEAF_TYPE_MULTIPLIER.NW.deciduous,
    );
  });
});

describe("coefficients: distance + spacing bounds", () => {
  it("has a sane distance band (min below max, both positive)", () => {
    expect(DISTANCE_MIN_FT).toBeGreaterThan(0);
    expect(DISTANCE_MAX_FT).toBeGreaterThan(DISTANCE_MIN_FT);
  });

  it("has a positive minimum tree spacing", () => {
    expect(MIN_TREE_SPACING_FT).toBeGreaterThan(0);
  });
});
