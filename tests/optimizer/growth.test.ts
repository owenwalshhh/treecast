import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { crownDiameterFt, growthProgress } from "../../src/optimizer/growth";
import { GROWTH } from "../../src/optimizer/coefficients";

describe("crownDiameterFt", () => {
  it("starts at the initial crown size at year 0", () => {
    expect(crownDiameterFt(0)).toBeCloseTo(GROWTH.initialCrownFt, 6);
  });

  it("is near the mature crown size by yearsToMature", () => {
    const d = crownDiameterFt(GROWTH.yearsToMature);
    expect(d).toBeGreaterThan(GROWTH.initialCrownFt);
    expect(d).toBeLessThanOrEqual(GROWTH.matureCrownFt);
    // Within ~10% of mature by the mature year.
    expect(d).toBeGreaterThan(GROWTH.matureCrownFt * 0.9);
  });

  it("never exceeds the mature crown size (property)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 200, noNaN: true }), (y) => {
        expect(crownDiameterFt(y)).toBeLessThanOrEqual(GROWTH.matureCrownFt + 1e-9);
      }),
    );
  });

  it("grows monotonically with year (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 60, noNaN: true }),
        fc.double({ min: 0, max: 60, noNaN: true }),
        (a, b) => {
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          expect(crownDiameterFt(hi)).toBeGreaterThanOrEqual(crownDiameterFt(lo));
        },
      ),
    );
  });

  it("treats negative years as year 0", () => {
    expect(crownDiameterFt(-5)).toBeCloseTo(crownDiameterFt(0), 6);
  });
});

describe("growthProgress", () => {
  it("is ~0 at planting and climbs toward 1", () => {
    expect(growthProgress(0)).toBeCloseTo(0, 6);
    expect(growthProgress(30)).toBeGreaterThan(0.9);
  });

  it("stays within [0,1] (property)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (y) => {
        const p = growthProgress(y);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }),
    );
  });
});
