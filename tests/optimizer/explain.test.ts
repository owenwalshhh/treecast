import { describe, it, expect } from "vitest";
import { explain } from "../../src/optimizer/explain";
import type { CandidateSite } from "../../src/optimizer/types";

function site(p: Partial<CandidateSite>): CandidateSite {
  return {
    id: "cs-1",
    at: { x: 0, y: 0 },
    direction: "W",
    distanceToWallFt: 12,
    leafType: "deciduous",
    equityNeed: 0.5,
    ...p,
  };
}

describe("explain", () => {
  it("flags a west spot as the best", () => {
    const ex = explain(site({ direction: "W" }));
    expect(ex.reasons).toContain("westBest");
  });

  it("flags a south evergreen as a penalty", () => {
    const ex = explain(site({ direction: "S", leafType: "evergreen" }));
    expect(ex.reasons).toContain("southEvergreenPenalty");
    expect(ex.energyScore).toBeLessThan(0);
  });

  it("flags a south deciduous as acceptable", () => {
    const ex = explain(site({ direction: "S", leafType: "deciduous" }));
    expect(ex.reasons).toContain("southDeciduousOk");
  });

  it("flags an evergreen windbreak on the north", () => {
    const ex = explain(site({ direction: "N", leafType: "evergreen" }));
    expect(ex.reasons).toContain("evergreenWindbreakGood");
  });

  it("flags a close-to-wall spot and a far one differently", () => {
    const near = explain(site({ distanceToWallFt: 11 }));
    const far = explain(site({ distanceToWallFt: 55 }));
    expect(near.reasons).toContain("closeToWall");
    expect(far.reasons).toContain("farFromWall");
  });

  it("flags high-need and low-need neighborhoods", () => {
    expect(explain(site({ equityNeed: 0.9 })).reasons).toContain("highEquity");
    expect(explain(site({ equityNeed: 0.1 })).reasons).toContain("lowEquity");
  });

  it("always returns at least one reason for a normal site", () => {
    const ex = explain(site({ direction: "W", distanceToWallFt: 12, equityNeed: 0.9 }));
    expect(ex.reasons.length).toBeGreaterThan(0);
  });
});
