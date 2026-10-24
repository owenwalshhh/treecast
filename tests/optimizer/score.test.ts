import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  blendedScore,
  clamp01,
  distanceFactor,
  energyScore,
} from "../../src/optimizer/score";
import {
  DISTANCE_MIN_FT,
  DISTANCE_MAX_FT,
} from "../../src/optimizer/coefficients";
import type { CandidateSite } from "../../src/optimizer/types";

function site(partial: Partial<CandidateSite>): CandidateSite {
  return {
    id: "cs-0001",
    at: { x: 0, y: 0 },
    direction: "W",
    distanceToWallFt: DISTANCE_MIN_FT,
    leafType: "deciduous",
    equityNeed: 0.5,
    ...partial,
  };
}

describe("distanceFactor", () => {
  it("is 1.0 at or inside the minimum distance", () => {
    expect(distanceFactor(DISTANCE_MIN_FT)).toBe(1);
    expect(distanceFactor(DISTANCE_MIN_FT - 5)).toBe(1);
  });

  it("is 0.0 at or past the maximum distance", () => {
    expect(distanceFactor(DISTANCE_MAX_FT)).toBe(0);
    expect(distanceFactor(DISTANCE_MAX_FT + 10)).toBe(0);
  });

  it("decreases monotonically with distance (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (a, b) => {
          const [near, far] = a <= b ? [a, b] : [b, a];
          expect(distanceFactor(near)).toBeGreaterThanOrEqual(
            distanceFactor(far),
          );
        },
      ),
    );
  });

  it("stays within [0, 1] for any distance (property)", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 500, noNaN: true }), (d) => {
        const f = distanceFactor(d);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }),
    );
  });
});

describe("energyScore", () => {
  it("scores a west deciduous tree above a north deciduous tree", () => {
    const west = energyScore(site({ direction: "W" }));
    const north = energyScore(site({ direction: "N" }));
    expect(west).toBeGreaterThan(north);
  });

  it("makes an evergreen on the south side negative", () => {
    const s = energyScore(site({ direction: "S", leafType: "evergreen" }));
    expect(s).toBeLessThan(0);
  });

  it("keeps a deciduous tree on the south side non-negative", () => {
    const s = energyScore(site({ direction: "S", leafType: "deciduous" }));
    expect(s).toBeGreaterThanOrEqual(0);
  });
});

describe("blendedScore (equity slider)", () => {
  it("equals the energy score when equityWeight is 0", () => {
    const s = site({ direction: "W", equityNeed: 0.1 });
    expect(blendedScore(s, 0)).toBeCloseTo(energyScore(s), 10);
  });

  it("equals the (clamped) equity need when equityWeight is 1", () => {
    const s = site({ direction: "W", equityNeed: 0.73 });
    expect(blendedScore(s, 1)).toBeCloseTo(0.73, 10);
  });

  it("lets a high-equity spot overtake a high-energy spot as the slider rises", () => {
    const energySpot = site({
      id: "energy",
      direction: "W",
      leafType: "deciduous",
      equityNeed: 0,
    });
    const equitySpot = site({
      id: "equity",
      direction: "N",
      leafType: "deciduous",
      equityNeed: 1,
    });
    // Pure energy: the west spot wins.
    expect(energyScore(energySpot)).toBeGreaterThan(energyScore(equitySpot));
    // Pure equity: the high-need spot wins.
    expect(blendedScore(equitySpot, 1)).toBeGreaterThan(
      blendedScore(energySpot, 1),
    );
  });
});

describe("clamp01", () => {
  it("clamps into [0,1] for any input (property)", () => {
    fc.assert(
      fc.property(fc.double({ min: -100, max: 100, noNaN: true }), (v) => {
        const c = clamp01(v);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }),
    );
  });
});
